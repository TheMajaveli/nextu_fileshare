package com.nextu.fileshare.gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds CORS settings from {@code app.cors.*} configuration properties.
 */
@Configuration
@ConfigurationProperties(prefix = "app.cors")
public class CorsProperties {

    private String allowedOrigins = "http://localhost:5173";

    public String getAllowedOrigins() {
        return allowedOrigins;
    }

    public void setAllowedOrigins(String allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }
}
