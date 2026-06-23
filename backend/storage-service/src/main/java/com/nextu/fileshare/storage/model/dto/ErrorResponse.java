package com.nextu.fileshare.storage.model.dto;

/** Standard API error payload with a machine-readable code and human-readable message. */
public record ErrorResponse(
    String error,
    String message
) {}
