package com.nextu.fileshare.gateway.exception;

/**
 * Thrown when the Keycloak Admin API is unreachable or returns an unexpected error.
 */
public class KeycloakServiceException extends RuntimeException {

    public KeycloakServiceException(String message) {
        super(message);
    }

    public KeycloakServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
