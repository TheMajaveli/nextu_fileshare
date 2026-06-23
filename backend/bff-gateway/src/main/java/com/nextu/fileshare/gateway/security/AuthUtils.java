package com.nextu.fileshare.gateway.security;

import com.nextu.fileshare.gateway.common.AppRoles;
import com.nextu.fileshare.gateway.model.AppUserDto;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

/**
 * Utility methods for extracting application user identity from Spring Security principals.
 */
public final class AuthUtils {

    private static final List<String> APP_ROLES = List.of(AppRoles.USER, AppRoles.ADMIN);

    private AuthUtils() {}

    /** Maps an OIDC user principal to the application user DTO. */
    public static AppUserDto toAppUser(OidcUser oidcUser) {
        return new AppUserDto(
            oidcUser.getSubject(),
            oidcUser.getPreferredUsername(),
            oidcUser.getEmail() != null ? oidcUser.getEmail() : "",
            extractRoles(oidcUser),
            oidcUser.getIdToken().getIssuedAt().toString()
        );
    }

    /** Maps any authenticated principal to the application user DTO. */
    public static AppUserDto toAppUser(Authentication authentication) {
        if (authentication.getPrincipal() instanceof OidcUser oidcUser) {
            return toAppUser(oidcUser);
        }
        throw new IllegalStateException("Authenticated principal is not an OIDC user.");
    }

    /** Returns true when the authentication carries the admin realm role. */
    public static boolean hasAdminRole(Authentication authentication) {
        return authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch("ROLE_ADMIN"::equals);
    }

    @SuppressWarnings("unchecked")
    private static List<String> extractRoles(OidcUser oidcUser) {
        List<String> roles = new ArrayList<>();
        Map<String, Object> realmAccess = oidcUser.getClaim("realm_access");
        if (realmAccess != null && realmAccess.get("roles") instanceof Collection<?> realmRoles) {
            for (Object role : realmRoles) {
                String value = role.toString();
                if (APP_ROLES.contains(value)) {
                    roles.add(value);
                }
            }
        }
        if (roles.isEmpty()) {
            roles.add(AppRoles.USER);
        }
        return roles;
    }
}
