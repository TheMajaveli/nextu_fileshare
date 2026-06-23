package com.nextu.fileshare.gateway.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Request payload for creating a new realm user via the admin API. */
public record CreateUserRequest(
    @NotBlank String username,
    @NotBlank @Email String email,
    @NotBlank @Pattern(regexp = "USER|ADMIN") String role
) {}
