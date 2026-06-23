package com.nextu.fileshare.gateway.model;

/** Standard API error payload with a machine-readable code and human-readable message. */
public record ErrorResponse(
    String error,
    String message
) {}
