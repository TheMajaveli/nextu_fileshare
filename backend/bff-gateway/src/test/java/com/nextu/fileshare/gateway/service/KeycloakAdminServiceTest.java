package com.nextu.fileshare.gateway.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.spy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nextu.fileshare.gateway.config.KeycloakAdminProperties;
import com.nextu.fileshare.gateway.exception.ApiException;
import com.nextu.fileshare.gateway.model.AppUserDto;
import com.nextu.fileshare.gateway.model.UserSummaryDto;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

/**
 * Unit tests for admin user management operations in KeycloakAdminService.
 * Uses a mocked/spied service to isolate logic from Keycloak connectivity.
 */
@ExtendWith(MockitoExtension.class)
class KeycloakAdminServiceTest {

    private KeycloakAdminService keycloakAdminService;

    @BeforeEach
    void setUp() {
        KeycloakAdminProperties properties = new KeycloakAdminProperties();
        properties.setServerUrl("http://localhost:8180");
        keycloakAdminService = spy(new KeycloakAdminService(properties, new ObjectMapper()));
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
    void listUsersExcludingRemovesExcludedUser() {
        doReturn(List.of(
            new AppUserDto("1", "alice", "alice@nextu.fr", List.of("USER"), "2026-01-01T00:00:00Z"),
            new AppUserDto("2", "bob", "bob@nextu.fr", List.of("USER"), "2026-01-01T00:00:00Z")
        )).when(keycloakAdminService).listUsers();

        List<UserSummaryDto> result = keycloakAdminService.listUsersExcluding("1");

        assertEquals(1, result.size());
        assertEquals("bob", result.get(0).username());
        assertTrue(result.stream().noneMatch(u -> u.id().equals("1")));
    }
}
