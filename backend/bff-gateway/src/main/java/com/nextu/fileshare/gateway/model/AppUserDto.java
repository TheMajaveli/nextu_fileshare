package com.nextu.fileshare.gateway.model;

import java.util.List;

/** Application user profile returned to the frontend. */
public record AppUserDto(
    String id,
    String username,
    String email,
    List<String> roles,
    String createdAt
) {}
