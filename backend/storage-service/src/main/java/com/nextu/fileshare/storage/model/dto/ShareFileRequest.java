package com.nextu.fileshare.storage.model.dto;

import jakarta.validation.constraints.NotBlank;

public record ShareFileRequest(
    @NotBlank String targetUserId
) {}
