package com.nextu.fileshare.gateway.common;

/**
 * Shared constants for Keycloak realm role names used across the BFF gateway.
 * Centralised here to avoid magic-string duplication across multiple classes.
 */
public final class AppRoles {

    public static final String USER = "USER";
    public static final String ADMIN = "ADMIN";

    private AppRoles() {}
}
