package com.nextu.fileshare.gateway.exception;

/**
 * Runtime exception carrying an API error code and HTTP status for client responses.
 */
public class ApiException extends RuntimeException {

    private final String errorCode;
    private final int status;

    /** Creates an API exception with the given error code, message, and HTTP status. */
    public ApiException(String errorCode, String message, int status) {
        super(message);
        this.errorCode = errorCode;
        this.status = status;
    }

    /** Returns the machine-readable error code. */
    public String getErrorCode() {
        return errorCode;
    }

    /** Returns the HTTP status code associated with this error. */
    public int getStatus() {
        return status;
    }
}
