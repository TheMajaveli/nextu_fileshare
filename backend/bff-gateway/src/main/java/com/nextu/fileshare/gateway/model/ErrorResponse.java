package com.nextu.fileshare.gateway.model;

public record ErrorResponse(
    String error,
    String message
) {}
