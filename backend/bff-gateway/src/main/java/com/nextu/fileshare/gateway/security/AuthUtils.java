package com.nextu.fileshare.gateway.security;

import com.nextu.fileshare.gateway.common.AppRoles;
import com.nextu.fileshare.gateway.model.AppUserDto;
import java.util.List;
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
            extractRolesFromAuthorities(oidcUser),
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

    private static List<String> extractRolesFromAuthorities(OidcUser oidcUser) {
        List<String> roles = oidcUser.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .filter(auth -> auth.startsWith("ROLE_"))
            .map(auth -> auth.substring("ROLE_".length()))
            .filter(APP_ROLES::contains)
            .distinct()
            .toList();
        if (roles.isEmpty()) {
            return List.of(AppRoles.USER);
        }
        return roles;
    }
}
