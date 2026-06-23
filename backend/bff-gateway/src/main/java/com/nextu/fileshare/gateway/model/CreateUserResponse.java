package com.nextu.fileshare.gateway.model;

/** Response payload returned after an admin creates a user, including the temporary password. */
public record CreateUserResponse(
    String id,
    String username,
    String email,
    java.util.List<String> roles,
    String createdAt,
    String temporaryPassword
) {}
