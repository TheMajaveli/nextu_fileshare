package com.nextu.fileshare.gateway.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nextu.fileshare.gateway.config.KeycloakAdminProperties;
import com.nextu.fileshare.gateway.exception.ApiException;
import com.nextu.fileshare.gateway.model.AppUserDto;
import com.nextu.fileshare.gateway.model.CreateUserRequest;
import com.nextu.fileshare.gateway.model.CreateUserResponse;
import com.nextu.fileshare.gateway.model.UserSummaryDto;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * Unit tests for admin user management operations in KeycloakAdminService.
 * Uses a mocked WebClient to isolate logic from Keycloak connectivity.
 */
@ExtendWith(MockitoExtension.class)
class KeycloakAdminServiceTest {

    private static final String REALM = "nextu-files";

    private KeycloakAdminService keycloakAdminService;

    @BeforeEach
    void setUp() {
        KeycloakAdminProperties properties = new KeycloakAdminProperties();
        properties.setServerUrl("http://localhost:8180");
        properties.setRealm(REALM);
        properties.setClientId("admin-cli-service");
        properties.setClientSecret("admin-cli-service-secret");

        keycloakAdminService = new KeycloakAdminService(properties, new ObjectMapper());
        ReflectionTestUtils.setField(keycloakAdminService, "webClient", mockKeycloakWebClient());
        ReflectionTestUtils.setField(keycloakAdminService, "cachedToken", "test-token");
        ReflectionTestUtils.setField(keycloakAdminService, "tokenExpiresAt", Instant.now().plusSeconds(3600));
    }

    @Test
    void deleteUserWithOwnUserIdThrowsCannotDeleteSelf() {
        String userId = "11111111-1111-1111-1111-111111111111";

        ApiException ex = assertThrows(ApiException.class, () ->
            keycloakAdminService.deleteUser(userId, userId)
        );

        assertEquals("CANNOT_DELETE_SELF", ex.getErrorCode());
        assertEquals(HttpStatus.BAD_REQUEST.value(), ex.getStatus());
    }

    @Test
    void deleteUserWithDifferentIdsSucceeds() {
        assertDoesNotThrow(() ->
            keycloakAdminService.deleteUser(
                "22222222-2222-2222-2222-222222222222",
                "11111111-1111-1111-1111-111111111111"
            )
        );
    }

    @Test
    void createUserReturnsTemporaryPassword() {
        CreateUserRequest request = new CreateUserRequest("chloe.martin", "chloe@nextu.fr", "USER");

        CreateUserResponse response = keycloakAdminService.createUser(request);

        assertEquals("chloe.martin", response.username());
        assertEquals("chloe@nextu.fr", response.email());
        assertNotNull(response.temporaryPassword());
        assertTrue(response.temporaryPassword().length() >= 8);
        assertTrue(response.roles().contains("USER"));
    }

    @Test
    void listUsersExcludingRemovesExcludedUser() {
        KeycloakAdminService spy = org.mockito.Mockito.spy(keycloakAdminService);
        org.mockito.Mockito.doReturn(List.of(
            new AppUserDto("1", "alice", "alice@nextu.fr", List.of("USER"), "2026-01-01T00:00:00Z"),
            new AppUserDto("2", "bob", "bob@nextu.fr", List.of("USER"), "2026-01-01T00:00:00Z")
        )).when(spy).listUsers();

        List<UserSummaryDto> result = spy.listUsersExcluding("1");

        assertEquals(1, result.size());
        assertEquals("bob", result.get(0).username());
        assertTrue(result.stream().noneMatch(u -> u.id().equals("1")));
    }

    private static void assertDoesNotThrow(Runnable runnable) {
        runnable.run();
    }

    private static WebClient mockKeycloakWebClient() {
        // Tracks whether POST /users has fired, so the GET-by-username mock can distinguish
        // ensureUniqueUser's pre-creation check (must return no matches) from fetchCreatedUser's
        // post-creation lookup (must return the newly created user) — both query the same username.
        java.util.concurrent.atomic.AtomicBoolean userCreated = new java.util.concurrent.atomic.AtomicBoolean(false);

        ExchangeFunction exchangeFunction = request -> {
            String path = request.url().getPath();
            String method = request.method().name();
            String query = request.url().getQuery() == null ? "" : request.url().getQuery();

            if (path.contains("/protocol/openid-connect/token")) {
                return jsonResponse(HttpStatus.OK, "{\"access_token\":\"test-token\",\"expires_in\":300}");
            }
            if (HttpMethod.GET.name().equals(method) && path.contains("/users") && query.contains("username=")) {
                if (query.contains("chloe.martin") && userCreated.get()) {
                    return jsonResponse(HttpStatus.OK, """
                        [{"id":"new-user-id","username":"chloe.martin","email":"chloe@nextu.fr","createdTimestamp":1710000000000}]
                        """);
                }
                return jsonResponse(HttpStatus.OK, "[]");
            }
            if (HttpMethod.GET.name().equals(method) && path.contains("/users") && query.contains("email=")) {
                return jsonResponse(HttpStatus.OK, "[]");
            }
            if (HttpMethod.POST.name().equals(method) && path.endsWith("/users")) {
                userCreated.set(true);
                return Mono.just(ClientResponse.create(HttpStatus.CREATED)
                    .header("Location", "http://localhost:8180/admin/realms/" + REALM + "/users/new-user-id")
                    .build());
            }
            if (HttpMethod.PUT.name().equals(method) && path.contains("reset-password")) {
                return emptyResponse(HttpStatus.NO_CONTENT);
            }
            if (HttpMethod.GET.name().equals(method) && path.contains("/roles/USER")) {
                return jsonResponse(HttpStatus.OK, "{\"id\":\"role-user\",\"name\":\"USER\"}");
            }
            if (HttpMethod.POST.name().equals(method) && path.contains("role-mappings/realm")) {
                return emptyResponse(HttpStatus.NO_CONTENT);
            }
            if (HttpMethod.GET.name().equals(method) && path.contains("role-mappings/realm")) {
                return jsonResponse(HttpStatus.OK, "[{\"name\":\"USER\"}]");
            }
            if (HttpMethod.DELETE.name().equals(method) && path.contains("/users/")) {
                return emptyResponse(HttpStatus.NO_CONTENT);
            }
            return jsonResponse(HttpStatus.NOT_FOUND, "{}");
        };

        return WebClient.builder()
            .baseUrl("http://localhost:8180")
            .exchangeFunction(exchangeFunction)
            .build();
    }

    private static Mono<ClientResponse> jsonResponse(HttpStatus status, String body) {
        return Mono.just(ClientResponse.create(status)
            .header("Content-Type", "application/json")
            .body(body)
            .build());
    }

    private static Mono<ClientResponse> emptyResponse(HttpStatus status) {
        return Mono.just(ClientResponse.create(status).build());
    }
}
