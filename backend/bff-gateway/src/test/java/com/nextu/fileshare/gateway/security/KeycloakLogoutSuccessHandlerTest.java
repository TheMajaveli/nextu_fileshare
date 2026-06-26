package com.nextu.fileshare.gateway.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.nextu.fileshare.gateway.config.CorsProperties;
import com.nextu.fileshare.gateway.config.KeycloakOidcProperties;
import java.net.URI;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.web.server.WebFilterExchange;
import org.springframework.security.authentication.TestingAuthenticationToken;

class KeycloakLogoutSuccessHandlerTest {

    private KeycloakLogoutSuccessHandler handler;

    @BeforeEach
    void setUp() {
        KeycloakOidcProperties oidcProperties = new KeycloakOidcProperties();
        oidcProperties.setEndSessionUri("http://localhost:8180/realms/nextu-files/protocol/openid-connect/logout");
        oidcProperties.setClientId("gateway-client");

        CorsProperties corsProperties = new CorsProperties();
        corsProperties.setAllowedOrigins("http://localhost:5173");

        handler = new KeycloakLogoutSuccessHandler(oidcProperties, corsProperties);
    }

    @Test
    void redirectsToKeycloakEndSessionWithPostLogoutUri() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/logout").build());
        WebFilterExchange webFilterExchange = new WebFilterExchange(exchange, (ignored) -> null);

        Instant now = Instant.now();
        OidcIdToken idToken = new OidcIdToken(
            "id-token-value",
            now,
            now.plusSeconds(3600),
            Map.of("sub", "user-1")
        );
        Authentication authentication = new TestingAuthenticationToken(
            new DefaultOidcUser(null, idToken),
            null
        );

        handler.onLogoutSuccess(webFilterExchange, authentication).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.FOUND);
        URI location = exchange.getResponse().getHeaders().getLocation();
        assertThat(location).isNotNull();
        assertThat(location.toString()).contains("protocol/openid-connect/logout");
        assertThat(location.getQuery()).contains("client_id=gateway-client");
        assertThat(location.getQuery()).contains("post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Flogin");
        assertThat(location.getQuery()).contains("id_token_hint=id-token-value");
    }
}
