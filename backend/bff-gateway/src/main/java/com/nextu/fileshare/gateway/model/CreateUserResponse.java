package com.nextu.fileshare.gateway.model;

public record CreateUserResponse(
    String id,
    String username,
    String email,
    java.util.List<String> roles,
    String createdAt,
    String temporaryPassword
) {}
