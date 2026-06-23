package com.nextu.fileshare.storage.model.dto;

/** Describes one user a file has been shared with, including when the share was created. */
public record FileShareEntryDto(
    String userId,
    String username,
    String sharedAt
) {}
