package com.nextu.fileshare.gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Browser-facing Keycloak OIDC endpoints used for login and logout redirects.
 */
@ConfigurationProperties(prefix = "keycloak.oidc")
public class KeycloakOidcProperties {

    private String endSessionUri = "http://localhost:8180/realms/nextu-files/protocol/openid-connect/logout";
    private String clientId = "gateway-client";

    public String getEndSessionUri() {
        return endSessionUri;
    }

    public void setEndSessionUri(String endSessionUri) {
        this.endSessionUri = endSessionUri;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }
}
