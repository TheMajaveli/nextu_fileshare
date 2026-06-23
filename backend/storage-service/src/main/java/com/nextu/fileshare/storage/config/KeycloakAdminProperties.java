package com.nextu.fileshare.storage.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds Keycloak Admin API client settings from {@code keycloak.admin.*} properties.
 */
@Configuration
@ConfigurationProperties(prefix = "keycloak.admin")
public class KeycloakAdminProperties {

    private String serverUrl = "http://localhost:8180";
    private String realm = "nextu-files";
    private String clientId = "admin-cli-service";
    private String clientSecret = "admin-cli-service-secret";

    public String getServerUrl() {
        return serverUrl;
    }

    public void setServerUrl(String serverUrl) {
        this.serverUrl = serverUrl;
    }

    public String getRealm() {
        return realm;
    }

    public void setRealm(String realm) {
        this.realm = realm;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }
}
