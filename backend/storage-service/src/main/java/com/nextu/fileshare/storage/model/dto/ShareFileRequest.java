package com.nextu.fileshare.storage.model.dto;

import jakarta.validation.constraints.NotBlank;

/** Request payload specifying the user id to share a file with. */
public record ShareFileRequest(
    @NotBlank String targetUserId
) {}
