package com.nextu.fileshare.gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.ReactiveOAuth2AuthorizedClientManager;
import org.springframework.security.oauth2.client.web.reactive.function.client.ServerOAuth2AuthorizedClientExchangeFilterFunction;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * WebClient used to call the storage service with the current user's OAuth2 access token.
 */
@Configuration
public class StorageWebClientConfig {

    /**
     * Builds a WebClient that relays the BFF session token to the storage API.
     */
    @Bean
    WebClient storageWebClient(
        ReactiveOAuth2AuthorizedClientManager authorizedClientManager,
        @Value("${STORAGE_SERVICE_URL:http://localhost:8081}") String storageServiceUrl
    ) {
        ServerOAuth2AuthorizedClientExchangeFilterFunction oauth2 =
            new ServerOAuth2AuthorizedClientExchangeFilterFunction(authorizedClientManager);
        oauth2.setDefaultClientRegistrationId("keycloak");

        return WebClient.builder()
            .baseUrl(storageServiceUrl)
            .filter(oauth2)
            .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(30 * 1024 * 1024))
            .build();
    }
}
