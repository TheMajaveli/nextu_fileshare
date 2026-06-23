package com.nextu.fileshare.gateway.model;

import java.util.List;

public record AppUserDto(
    String id,
    String username,
    String email,
    List<String> roles,
    String createdAt
) {}
