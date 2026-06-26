package com.nextu.fileshare.gateway.security;

import com.nextu.fileshare.gateway.common.AppRoles;
import com.nextu.fileshare.gateway.service.KeycloakAdminService;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcReactiveOAuth2UserService;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

/**
 * Loads OIDC users from Keycloak and maps realm roles to Spring Security authorities.
 * Roles are resolved via the Admin API because imported realm users may omit roles in OIDC claims.
 */
public class KeycloakOidcUserService extends OidcReactiveOAuth2UserService {

    private final KeycloakAdminService keycloakAdminService;

    public KeycloakOidcUserService(KeycloakAdminService keycloakAdminService) {
        this.keycloakAdminService = keycloakAdminService;
    }

    /** Loads the user and enriches authorities with Keycloak realm roles. */
    @Override
    public Mono<OidcUser> loadUser(OidcUserRequest userRequest) {
        return super.loadUser(userRequest)
            .flatMap(user -> Mono.fromCallable(() -> resolveAppRoles(user))
                .subscribeOn(Schedulers.boundedElastic())
                .map(roles -> withRealmRoles(user, roles)));
    }

    private List<String> resolveAppRoles(OidcUser user) {
        try {
            return keycloakAdminService.getUserAppRoles(user.getSubject());
        } catch (RuntimeException ex) {
            return extractRolesFromClaims(user);
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> extractRolesFromClaims(OidcUser user) {
        Object realmAccess = user.getClaim("realm_access");
        if (!(realmAccess instanceof java.util.Map<?, ?> map) || !(map.get("roles") instanceof java.util.Collection<?> roles)) {
            return List.of(AppRoles.USER);
        }
        return roles.stream()
            .map(Object::toString)
            .filter(role -> AppRoles.USER.equals(role) || AppRoles.ADMIN.equals(role))
            .distinct()
            .toList();
    }

    private OidcUser withRealmRoles(OidcUser user, List<String> roles) {
        Set<GrantedAuthority> authorities = new HashSet<>();
        for (String role : roles) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
        }
        if (roles.isEmpty()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + AppRoles.USER));
        }
        return new DefaultOidcUser(authorities, user.getIdToken(), user.getUserInfo(), "sub");
    }
}
