package com.nextu.fileshare.storage.security;

import com.nextu.fileshare.storage.common.AppRoles;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Converts Keycloak realm roles from a JWT into Spring Security granted authorities.
 */
public class KeycloakRealmRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    private static final List<String> APP_ROLES = List.of(AppRoles.USER, AppRoles.ADMIN);

    /** Extracts USER/ADMIN realm roles from the JWT and maps them to ROLE_* authorities. */
    @Override
    @SuppressWarnings("unchecked")
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess == null || !(realmAccess.get("roles") instanceof List<?> roles)) {
            return List.of(new SimpleGrantedAuthority("ROLE_" + AppRoles.USER));
        }
        List<GrantedAuthority> authorities = roles.stream()
            .map(Object::toString)
            .filter(APP_ROLES::contains)
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
            .collect(Collectors.toList());
        if (authorities.isEmpty()) {
            return List.of(new SimpleGrantedAuthority("ROLE_" + AppRoles.USER));
        }
        return authorities;
    }
}
