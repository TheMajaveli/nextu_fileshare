package com.nextu.fileshare.storage.security;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Utility methods for reading user identity and roles from JWT authentication.
 */
public final class AuthUtils {

    private AuthUtils() {}

    /** Returns the current user's UUID parsed from the JWT subject claim. */
    public static UUID currentUserId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    /** Returns the preferred username from the JWT, falling back to the subject. */
    public static String currentUsername(Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken token) {
            Jwt jwt = token.getToken();
            String preferred = jwt.getClaimAsString("preferred_username");
            if (preferred != null && !preferred.isBlank()) {
                return preferred;
            }
        }
        return authentication.getName();
    }

    @SuppressWarnings("unchecked")
    /** Returns realm role names from the JWT, or an empty list when absent. */
    public static List<String> currentRoles(Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken token) {
            Jwt jwt = token.getToken();
            Map<String, Object> realmAccess = jwt.getClaim("realm_access");
            if (realmAccess != null && realmAccess.get("roles") instanceof List<?> roles) {
                return roles.stream().map(Object::toString).toList();
            }
        }
        return List.of();
    }
}
