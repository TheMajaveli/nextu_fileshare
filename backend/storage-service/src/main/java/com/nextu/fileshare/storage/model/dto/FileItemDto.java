package com.nextu.fileshare.storage.model.dto;

import java.util.List;

public record FileItemDto(
    String id,
    String filename,
    String extension,
    long sizeBytes,
    String ownerId,
    String ownerUsername,
    String createdAt,
    List<FileShareEntryDto> sharedWith
) {}
