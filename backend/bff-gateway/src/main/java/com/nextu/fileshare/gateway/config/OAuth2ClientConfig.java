package com.nextu.fileshare.gateway.config;

import com.nextu.fileshare.gateway.security.KeycloakOidcUserService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.userinfo.ReactiveOAuth2UserService;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

/**
 * Registers OAuth2/OIDC client beans for Keycloak user info loading.
 */
@Configuration
public class OAuth2ClientConfig {

    @Bean
    ReactiveOAuth2UserService<OidcUserRequest, OidcUser> oidcUserService() {
        return new KeycloakOidcUserService();
    }
}
