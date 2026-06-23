package com.nextu.fileshare.storage.model.dto;

import java.util.List;

/** File metadata and share list returned by the storage API. */
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
