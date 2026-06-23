package com.nextu.fileshare.gateway.security;

import com.nextu.fileshare.gateway.common.AppRoles;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcReactiveOAuth2UserService;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import reactor.core.publisher.Mono;

/**
 * Loads OIDC users from Keycloak and maps realm roles to Spring Security authorities.
 */
public class KeycloakOidcUserService extends OidcReactiveOAuth2UserService {

    private static final List<String> APP_ROLES = List.of(AppRoles.USER, AppRoles.ADMIN);

    /** Loads the user and enriches authorities with Keycloak realm roles. */
    @Override
    public Mono<OidcUser> loadUser(OidcUserRequest userRequest) {
        return super.loadUser(userRequest).map(this::withRealmRoles);
    }

    private OidcUser withRealmRoles(OidcUser user) {
        Set<GrantedAuthority> authorities = new HashSet<>(user.getAuthorities());
        for (String role : extractRealmRoles(user)) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
        }
        return new DefaultOidcUser(authorities, user.getIdToken(), user.getUserInfo(), "sub");
    }

    @SuppressWarnings("unchecked")
    private List<String> extractRealmRoles(OidcUser user) {
        List<String> roles = new ArrayList<>();
        Map<String, Object> realmAccess = user.getClaim("realm_access");
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
