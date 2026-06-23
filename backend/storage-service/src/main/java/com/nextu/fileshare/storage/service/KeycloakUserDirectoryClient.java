package com.nextu.fileshare.storage.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.nextu.fileshare.storage.config.KeycloakAdminProperties;
import com.nextu.fileshare.storage.exception.ApiException;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * Client for resolving usernames from Keycloak via the Admin REST API.
 */
@Service
public class KeycloakUserDirectoryClient {

    private static final Logger log = LoggerFactory.getLogger(KeycloakUserDirectoryClient.class);
    private static final String UNKNOWN_USERNAME = "Utilisateur inconnu";

    private final WebClient webClient;
    private final KeycloakAdminProperties properties;
    private volatile String cachedToken;
    private volatile Instant tokenExpiresAt = Instant.EPOCH;

    /** Creates the client using Keycloak admin connection properties. */
    public KeycloakUserDirectoryClient(KeycloakAdminProperties properties) {
        this.properties = properties;
        this.webClient = WebClient.builder().baseUrl(properties.getServerUrl()).build();
    }

    /** Looks up the Keycloak username for the given user id. */
    public String resolveUsername(UUID userId) {
        String token = serviceAccountToken();
        try {
            JsonNode user = webClient.get()
                .uri("/admin/realms/{realm}/users/{id}", properties.getRealm(), userId)
                .headers(headers -> headers.setBearerAuth(token))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

            if (user == null || user.path("username").isMissingNode()) {
                throw new ApiException("USER_NOT_FOUND", "Utilisateur destinataire introuvable.", HttpStatus.NOT_FOUND.value());
            }
            return user.get("username").asText();
        } catch (WebClientResponseException ex) {
            log.warn("Failed to resolve username for {}: {}", userId, ex.getMessage());
            return UNKNOWN_USERNAME;
        }
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
            throw new ApiException("KEYCLOAK_ERROR", "Impossible de contacter l'annuaire utilisateurs.", HttpStatus.BAD_GATEWAY.value());
        }

        cachedToken = response.get("access_token").asText();
        int expiresIn = response.path("expires_in").asInt(300);
        tokenExpiresAt = Instant.now().plusSeconds(expiresIn);
        return cachedToken;
    }
}
