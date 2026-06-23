package com.nextu.fileshare.gateway.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nextu.fileshare.gateway.common.AppRoles;
import com.nextu.fileshare.gateway.config.KeycloakAdminProperties;
import com.nextu.fileshare.gateway.exception.ApiException;
import com.nextu.fileshare.gateway.exception.KeycloakServiceException;
import com.nextu.fileshare.gateway.model.AppUserDto;
import com.nextu.fileshare.gateway.model.CreateUserRequest;
import com.nextu.fileshare.gateway.model.CreateUserResponse;
import com.nextu.fileshare.gateway.model.UserSummaryDto;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * Service integrating with the Keycloak Admin REST API for user management and lookups.
 */
@Service
public class KeycloakAdminService {

    private static final List<String> APP_ROLES = List.of(AppRoles.USER, AppRoles.ADMIN);

    private final WebClient webClient;
    private final KeycloakAdminProperties properties;
    private final ObjectMapper objectMapper;
    private volatile String cachedToken;
    private volatile Instant tokenExpiresAt = Instant.EPOCH;

    /** Creates the service with Keycloak admin properties and JSON mapping support. */
    public KeycloakAdminService(KeycloakAdminProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder().baseUrl(properties.getServerUrl()).build();
    }

    /** Returns the ISO-8601 creation timestamp for the given Keycloak user id. */
    public String getUserCreatedAt(String userId) {
        String token = serviceAccountToken();
        try {
            JsonNode user = webClient.get()
                .uri("/admin/realms/{realm}/users/{id}", properties.getRealm(), userId)
                .headers(headers -> headers.setBearerAuth(token))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();
            if (user == null || user.isMissingNode()) {
                throw new ApiException("NOT_FOUND", "Utilisateur introuvable.", HttpStatus.NOT_FOUND.value());
            }
            long createdTimestamp = user.path("createdTimestamp").asLong(0);
            if (createdTimestamp <= 0) {
                throw new ApiException("KEYCLOAK_ERROR", "Date de création utilisateur indisponible.", HttpStatus.BAD_GATEWAY.value());
            }
            return Instant.ofEpochMilli(createdTimestamp).toString();
        } catch (WebClientResponseException.NotFound ex) {
            throw new ApiException("NOT_FOUND", "Utilisateur introuvable.", HttpStatus.NOT_FOUND.value());
        } catch (WebClientResponseException ex) {
            throw keycloakUnavailable(ex);
        }
    }

    private KeycloakServiceException keycloakUnavailable(WebClientResponseException ex) {
        return new KeycloakServiceException("Keycloak Admin API error", ex);
    }

    /** Fetches a single realm user mapped to an application user DTO. */
    public AppUserDto getUserById(String userId) {
        String token = serviceAccountToken();
        try {
            JsonNode user = webClient.get()
                .uri("/admin/realms/{realm}/users/{id}", properties.getRealm(), userId)
                .headers(headers -> headers.setBearerAuth(token))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();
            if (user == null || user.isMissingNode()) {
                throw new ApiException("NOT_FOUND", "Utilisateur introuvable.", HttpStatus.NOT_FOUND.value());
            }
            return mapUser(user, token);
        } catch (WebClientResponseException.NotFound ex) {
            throw new ApiException("NOT_FOUND", "Utilisateur introuvable.", HttpStatus.NOT_FOUND.value());
        }
    }

    /**
     * Returns all realm users except the given user id, for the share-picker directory.
     */
    public List<UserSummaryDto> listUsersExcluding(String excludeUserId) {
        return listUsers().stream()
            .filter(user -> !user.id().equals(excludeUserId))
            .map(user -> new UserSummaryDto(user.id(), user.username()))
            .toList();
    }

    /** Lists all non-service-account realm users sorted by username. */
    public List<AppUserDto> listUsers() {
        String token = serviceAccountToken();
        JsonNode users;
        try {
            users = webClient.get()
                .uri("/admin/realms/{realm}/users", properties.getRealm())
                .headers(headers -> headers.setBearerAuth(token))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();
        } catch (WebClientResponseException ex) {
            throw keycloakUnavailable(ex);
        }

        if (users == null || !users.isArray()) {
            return List.of();
        }

        List<AppUserDto> result = new ArrayList<>();
        for (JsonNode user : users) {
            if (user.path("serviceAccountClientId").isTextual()) {
                continue;
            }
            result.add(mapUser(user, token));
        }

        result.sort(Comparator.comparing(AppUserDto::username));
        return result;
    }

    /** Creates a realm user with a temporary password and assigns the requested role. */
    public CreateUserResponse createUser(CreateUserRequest request) {
        String token = serviceAccountToken();
        ensureUniqueUser(request, token);

        ObjectNode createPayload = objectMapper.createObjectNode()
            .put("username", request.username())
            .put("email", request.email())
            .put("enabled", true)
            .put("emailVerified", true);
        createPayload.putArray("requiredActions").add("UPDATE_PASSWORD");

        JsonNode created = webClient.post()
            .uri("/admin/realms/{realm}/users", properties.getRealm())
            .headers(headers -> headers.setBearerAuth(token))
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(createPayload)
            .retrieve()
            .toBodilessEntity()
            .then(fetchCreatedUser(request.username(), token))
            .block();

        if (created == null) {
            throw new ApiException("KEYCLOAK_ERROR", "Impossible de créer l'utilisateur.", HttpStatus.BAD_GATEWAY.value());
        }

        String userId = created.get("id").asText();
        String temporaryPassword = generateTemporaryPassword();

        resetTemporaryPassword(userId, temporaryPassword, token);
        assignRealmRole(userId, request.role(), token);

        AppUserDto mapped = mapUser(created, token);
        return new CreateUserResponse(
            mapped.id(),
            mapped.username(),
            mapped.email(),
            mapped.roles(),
            mapped.createdAt(),
            temporaryPassword
        );
    }

    /** Deletes a realm user unless the target is the currently authenticated admin. */
    public void deleteUser(String userId, String currentUserId) {
        if (userId.equals(currentUserId)) {
            throw new ApiException(
                "CANNOT_DELETE_SELF",
                "Vous ne pouvez pas supprimer votre propre compte.",
                HttpStatus.BAD_REQUEST.value()
            );
        }

        String token = serviceAccountToken();
        try {
            webClient.delete()
                .uri("/admin/realms/{realm}/users/{id}", properties.getRealm(), userId)
                .headers(headers -> headers.setBearerAuth(token))
                .retrieve()
                .toBodilessEntity()
                .block();
        } catch (WebClientResponseException.NotFound ex) {
            throw new ApiException("NOT_FOUND", "Utilisateur introuvable.", HttpStatus.NOT_FOUND.value());
        }
    }

    private void ensureUniqueUser(CreateUserRequest request, String token) {
        JsonNode users = webClient.get()
            .uri(uriBuilder -> uriBuilder
                .path("/admin/realms/{realm}/users")
                .queryParam("username", request.username())
                .build(properties.getRealm()))
            .headers(headers -> headers.setBearerAuth(token))
            .retrieve()
            .bodyToMono(JsonNode.class)
            .block();

        if (users != null && users.isArray() && !users.isEmpty()) {
            throw new ApiException(
                "USER_EXISTS",
                "Un utilisateur avec ce nom d'utilisateur ou cet email existe déjà.",
                HttpStatus.CONFLICT.value()
            );
        }

        JsonNode byEmail = webClient.get()
            .uri(uriBuilder -> uriBuilder
                .path("/admin/realms/{realm}/users")
                .queryParam("email", request.email())
                .build(properties.getRealm()))
            .headers(headers -> headers.setBearerAuth(token))
            .retrieve()
            .bodyToMono(JsonNode.class)
            .block();

        if (byEmail != null && byEmail.isArray() && !byEmail.isEmpty()) {
            throw new ApiException(
                "USER_EXISTS",
                "Un utilisateur avec ce nom d'utilisateur ou cet email existe déjà.",
                HttpStatus.CONFLICT.value()
            );
        }
    }

    private reactor.core.publisher.Mono<JsonNode> fetchCreatedUser(String username, String token) {
        return webClient.get()
            .uri(uriBuilder -> uriBuilder
                .path("/admin/realms/{realm}/users")
                .queryParam("username", username)
                .build(properties.getRealm()))
            .headers(headers -> headers.setBearerAuth(token))
            .retrieve()
            .bodyToMono(JsonNode.class)
            .flatMap(users -> {
                if (users.isArray() && !users.isEmpty()) {
                    return reactor.core.publisher.Mono.just(users.get(0));
                }
                return reactor.core.publisher.Mono.empty();
            });
    }

    private void resetTemporaryPassword(String userId, String password, String token) {
        ObjectNode payload = objectMapper.createObjectNode()
            .put("type", "password")
            .put("value", password)
            .put("temporary", true);

        webClient.put()
            .uri("/admin/realms/{realm}/users/{id}/reset-password", properties.getRealm(), userId)
            .headers(headers -> headers.setBearerAuth(token))
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(payload)
            .retrieve()
            .toBodilessEntity()
            .block();
    }

    private void assignRealmRole(String userId, String roleName, String token) {
        JsonNode role = webClient.get()
            .uri("/admin/realms/{realm}/roles/{role}", properties.getRealm(), roleName)
            .headers(headers -> headers.setBearerAuth(token))
            .retrieve()
            .bodyToMono(JsonNode.class)
            .block();

        if (role == null) {
            throw new ApiException("KEYCLOAK_ERROR", "Rôle introuvable : " + roleName, HttpStatus.BAD_GATEWAY.value());
        }

        webClient.post()
            .uri("/admin/realms/{realm}/users/{id}/role-mappings/realm", properties.getRealm(), userId)
            .headers(headers -> headers.setBearerAuth(token))
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(List.of(role))
            .retrieve()
            .toBodilessEntity()
            .block();
    }

    private AppUserDto mapUser(JsonNode user, String token) {
        String userId = user.get("id").asText();
        List<String> roles = fetchRealmRoles(userId, token);
        long createdTimestamp = user.path("createdTimestamp").asLong(System.currentTimeMillis());
        return new AppUserDto(
            userId,
            user.path("username").asText(),
            user.path("email").asText(""),
            roles,
            Instant.ofEpochMilli(createdTimestamp).toString()
        );
    }

    private List<String> fetchRealmRoles(String userId, String token) {
        JsonNode mappings = webClient.get()
            .uri("/admin/realms/{realm}/users/{id}/role-mappings/realm", properties.getRealm(), userId)
            .headers(headers -> headers.setBearerAuth(token))
            .retrieve()
            .bodyToMono(JsonNode.class)
            .block();

        List<String> roles = new ArrayList<>();
        if (mappings != null && mappings.isArray()) {
            for (JsonNode role : mappings) {
                String name = role.path("name").asText();
                if (APP_ROLES.contains(name)) {
                    roles.add(name);
                }
            }
        }
        if (roles.isEmpty()) {
            roles.add(AppRoles.USER);
        }
        return roles;
    }

    private synchronized String serviceAccountToken() {
        if (cachedToken != null && Instant.now().isBefore(tokenExpiresAt.minusSeconds(30))) {
            return cachedToken;
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "client_credentials");
        form.add("client_id", properties.getClientId());
        form.add("client_secret", properties.getClientSecret());

        JsonNode response = webClient.post()
            .uri("/realms/{realm}/protocol/openid-connect/token", properties.getRealm())
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(BodyInserters.fromFormData(form))
            .retrieve()
            .bodyToMono(JsonNode.class)
            .block();

        if (response == null || response.path("access_token").isMissingNode()) {
            throw new ApiException("KEYCLOAK_ERROR", "Impossible de contacter Keycloak.", HttpStatus.BAD_GATEWAY.value());
        }

        cachedToken = response.get("access_token").asText();
        int expiresIn = response.path("expires_in").asInt(300);
        tokenExpiresAt = Instant.now().plusSeconds(expiresIn);
        return cachedToken;
    }

    private String generateTemporaryPassword() {
        byte[] bytes = new byte[18];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
