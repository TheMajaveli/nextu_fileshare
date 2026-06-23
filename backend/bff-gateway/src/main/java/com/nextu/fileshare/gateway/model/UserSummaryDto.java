package com.nextu.fileshare.gateway.model;

/**
 * Minimal user projection returned by the user directory endpoint.
 * Contains only the information needed by the frontend share picker.
 */
public record UserSummaryDto(String id, String username) {}
