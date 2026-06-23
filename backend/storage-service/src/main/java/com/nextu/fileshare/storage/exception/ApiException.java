package com.nextu.fileshare.storage.exception;

public class ApiException extends RuntimeException {

    private final String errorCode;
    private final int status;

    public ApiException(String errorCode, String message, int status) {
        super(message);
        this.errorCode = errorCode;
        this.status = status;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public int getStatus() {
        return status;
    }
}
