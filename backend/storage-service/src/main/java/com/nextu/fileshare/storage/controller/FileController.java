package com.nextu.fileshare.storage.controller;

import com.nextu.fileshare.storage.exception.ApiException;
import com.nextu.fileshare.storage.model.dto.FileItemDto;
import com.nextu.fileshare.storage.model.dto.ShareFileRequest;
import com.nextu.fileshare.storage.security.AuthUtils;
import com.nextu.fileshare.storage.service.FileService;
import com.nextu.fileshare.storage.service.KeycloakUserDirectoryClient;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/files")
public class FileController {

    private final FileService fileService;
    private final KeycloakUserDirectoryClient userDirectoryClient;

    public FileController(FileService fileService, KeycloakUserDirectoryClient userDirectoryClient) {
        this.fileService = fileService;
        this.userDirectoryClient = userDirectoryClient;
    }

    @GetMapping
    public List<FileItemDto> listMyFiles(Authentication authentication) {
        UUID ownerId = AuthUtils.currentUserId(authentication);
        return fileService.listMyFiles(ownerId);
    }

    @GetMapping("/shared")
    public List<FileItemDto> listSharedWithMe(Authentication authentication) {
        UUID userId = AuthUtils.currentUserId(authentication);
        return fileService.listSharedWithMe(userId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FileItemDto uploadFile(
        @RequestParam("file") MultipartFile file,
        Authentication authentication
    ) {
        UUID ownerId = AuthUtils.currentUserId(authentication);
        String ownerUsername = AuthUtils.currentUsername(authentication);
        return fileService.uploadFile(file, ownerId, ownerUsername);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadFile(
        @PathVariable UUID id,
        Authentication authentication
    ) {
        UUID requesterId = AuthUtils.currentUserId(authentication);
        FileService.DownloadResult download = fileService.downloadFile(id, requesterId);

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(download.filename()).build().toString())
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .body(download.resource());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFile(
        @PathVariable UUID id,
        Authentication authentication
    ) {
        UUID ownerId = AuthUtils.currentUserId(authentication);
        fileService.deleteFile(id, ownerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/share")
    public FileItemDto shareFile(
        @PathVariable UUID id,
        @Valid @RequestBody ShareFileRequest request,
        Authentication authentication
    ) {
        UUID ownerId = AuthUtils.currentUserId(authentication);
        UUID targetUserId = parseUserId(request.targetUserId());
        String targetUsername = userDirectoryClient.resolveUsername(targetUserId);
        return fileService.shareFile(id, ownerId, targetUserId, targetUsername);
    }

    private UUID parseUserId(String rawUserId) {
        try {
            return UUID.fromString(rawUserId);
        } catch (IllegalArgumentException ex) {
            throw new ApiException("VALIDATION_ERROR", "Identifiant utilisateur invalide.", HttpStatus.BAD_REQUEST.value());
        }
    }

    @DeleteMapping("/{id}/share/{userId}")
    public FileItemDto revokeShare(
        @PathVariable UUID id,
        @PathVariable UUID userId,
        Authentication authentication
    ) {
        UUID ownerId = AuthUtils.currentUserId(authentication);
        return fileService.revokeShare(id, ownerId, userId);
    }
}
