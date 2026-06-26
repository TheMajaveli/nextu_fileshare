package com.nextu.fileshare.gateway.security;

import com.nextu.fileshare.gateway.config.CorsProperties;
import com.nextu.fileshare.gateway.config.KeycloakOidcProperties;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.server.WebFilterExchange;
import org.springframework.security.web.server.authentication.logout.ServerLogoutSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

/**
 * Ends the BFF session and redirects the browser to Keycloak's OIDC end-session endpoint
 * so the IdP SSO cookie is cleared before returning to the frontend login page.
 */
@Component
public class KeycloakLogoutSuccessHandler implements ServerLogoutSuccessHandler {

    private final KeycloakOidcProperties keycloakOidcProperties;
    private final String postLogoutRedirectUri;

    public KeycloakLogoutSuccessHandler(
        KeycloakOidcProperties keycloakOidcProperties,
        CorsProperties corsProperties
    ) {
        this.keycloakOidcProperties = keycloakOidcProperties;
        this.postLogoutRedirectUri = corsProperties.getAllowedOrigins().split(",")[0].trim() + "/login";
    }

    @Override
    public Mono<Void> onLogoutSuccess(WebFilterExchange exchange, Authentication authentication) {
        UriComponentsBuilder logoutUrl = UriComponentsBuilder.fromUriString(keycloakOidcProperties.getEndSessionUri())
            .queryParam("client_id", keycloakOidcProperties.getClientId())
            .queryParam("post_logout_redirect_uri", postLogoutRedirectUri);

        if (authentication != null && authentication.getPrincipal() instanceof OidcUser oidcUser) {
            logoutUrl.queryParam("id_token_hint", oidcUser.getIdToken().getTokenValue());
        }

        URI location = logoutUrl.encode(StandardCharsets.UTF_8).build().toUri();
        exchange.getExchange().getResponse().setStatusCode(HttpStatus.FOUND);
        exchange.getExchange().getResponse().getHeaders().setLocation(location);
        return exchange.getExchange().getResponse().setComplete();
    }
}
