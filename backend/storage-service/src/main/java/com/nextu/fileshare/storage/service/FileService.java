package com.nextu.fileshare.storage.service;

import com.nextu.fileshare.storage.config.StorageProperties;
import com.nextu.fileshare.storage.exception.ApiException;
import com.nextu.fileshare.storage.model.dto.FileItemDto;
import com.nextu.fileshare.storage.model.dto.FileShareEntryDto;
import com.nextu.fileshare.storage.model.entity.FileEntity;
import com.nextu.fileshare.storage.model.entity.FileShareEntity;
import com.nextu.fileshare.storage.repository.FileRepository;
import com.nextu.fileshare.storage.repository.FileShareRepository;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class FileService {

    private static final long MAX_SIZE_BYTES = 25L * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
        "pdf", "xlsx", "xls", "doc", "docx", "mp3", "mp4"
    );

    private final FileRepository fileRepository;
    private final FileShareRepository fileShareRepository;
    private final Path storageRoot;

    public FileService(
        FileRepository fileRepository,
        FileShareRepository fileShareRepository,
        StorageProperties storageProperties
    ) throws IOException {
        this.fileRepository = fileRepository;
        this.fileShareRepository = fileShareRepository;
        this.storageRoot = Path.of(storageProperties.getBasePath()).toAbsolutePath().normalize();
        Files.createDirectories(storageRoot);
    }

    @Transactional(readOnly = true)
    public List<FileItemDto> listMyFiles(UUID ownerId) {
        return fileRepository.findOwnedWithShares(ownerId).stream()
            .map(this::toDto)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<FileItemDto> listSharedWithMe(UUID userId) {
        return fileRepository.findSharedWithUser(userId).stream()
            .map(this::toDtoForRecipient)
            .toList();
    }

    public FileItemDto uploadFile(MultipartFile file, UUID ownerId, String ownerUsername) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("INVALID_FILE", "Aucun fichier fourni.", HttpStatus.BAD_REQUEST.value());
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new ApiException("INVALID_FILE", "Nom de fichier invalide.", HttpStatus.BAD_REQUEST.value());
        }

        String extension = extractExtension(originalFilename);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ApiException(
                "INVALID_FILE_TYPE",
                "Le type de fichier ." + extension + " n'est pas autorisé.",
                HttpStatus.BAD_REQUEST.value()
            );
        }

        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new ApiException(
                "FILE_TOO_LARGE",
                "Le fichier dépasse la taille maximale autorisée de 25 Mo.",
                HttpStatus.BAD_REQUEST.value()
            );
        }

        UUID fileId = UUID.randomUUID();
        String storageFilename = fileId + "." + extension;
        Path destination = storageRoot.resolve(storageFilename);

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new ApiException("STORAGE_ERROR", "Impossible d'enregistrer le fichier.", HttpStatus.INTERNAL_SERVER_ERROR.value());
        }

        FileEntity entity = new FileEntity();
        entity.setId(fileId);
        entity.setOwnerId(ownerId);
        entity.setOwnerUsername(ownerUsername);
        entity.setFilename(originalFilename);
        entity.setExtension(extension);
        entity.setStoragePath(destination.toString());
        entity.setSizeBytes(file.getSize());
        entity.setContentType(file.getContentType());

        return toDto(fileRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public DownloadResult downloadFile(UUID fileId, UUID requesterId) {
        FileEntity entity = requireAccessibleFile(fileId, requesterId);
        Resource resource = loadResource(entity);
        return new DownloadResult(resource, entity.getFilename());
    }

    public void deleteFile(UUID fileId, UUID ownerId) {
        FileEntity entity = requireFile(fileId);
        if (!entity.getOwnerId().equals(ownerId)) {
            throw new ApiException("FORBIDDEN", "Action non autorisée : vous n'êtes pas le propriétaire de ce fichier.", HttpStatus.FORBIDDEN.value());
        }

        deletePhysicalFile(entity);
        fileRepository.delete(entity);
    }

    public FileItemDto shareFile(UUID fileId, UUID ownerId, UUID targetUserId, String targetUsername) {
        FileEntity entity = requireFile(fileId);
        if (!entity.getOwnerId().equals(ownerId)) {
            throw new ApiException("FORBIDDEN", "Action non autorisée : seul le propriétaire peut partager ce fichier.", HttpStatus.FORBIDDEN.value());
        }

        if (targetUserId.equals(ownerId)) {
            throw new ApiException("SELF_SHARE", "Action inutile : vous ne pouvez pas partager le fichier avec vous-même.", HttpStatus.BAD_REQUEST.value());
        }

        if (fileShareRepository.existsByFileIdAndSharedWithUserId(fileId, targetUserId)) {
            throw new ApiException(
                "DUPLICATE_SHARE",
                "Ce fichier est déjà partagé avec l'utilisateur " + targetUsername + ".",
                HttpStatus.CONFLICT.value()
            );
        }

        FileShareEntity share = new FileShareEntity();
        share.setFile(entity);
        share.setSharedWithUserId(targetUserId);
        share.setSharedWithUsername(targetUsername);
        share.setSharedByUserId(ownerId);
        entity.getShares().add(share);
        fileShareRepository.save(share);

        return toDto(fileRepository.findOwnedWithShares(ownerId).stream()
            .filter(f -> f.getId().equals(fileId))
            .findFirst()
            .orElse(entity));
    }

    public FileItemDto revokeShare(UUID fileId, UUID ownerId, UUID sharedUserId) {
        FileEntity entity = requireFile(fileId);
        if (!entity.getOwnerId().equals(ownerId)) {
            throw new ApiException("FORBIDDEN", "Action non autorisée : seul le propriétaire peut révoquer les accès de partage.", HttpStatus.FORBIDDEN.value());
        }

        FileShareEntity share = fileShareRepository.findByFileIdAndSharedWithUserId(fileId, sharedUserId)
            .orElseThrow(() -> new ApiException("NOT_FOUND", "Partage introuvable.", HttpStatus.NOT_FOUND.value()));

        entity.getShares().remove(share);
        fileShareRepository.delete(share);

        return toDto(fileRepository.findOwnedWithShares(ownerId).stream()
            .filter(f -> f.getId().equals(fileId))
            .findFirst()
            .orElse(entity));
    }

    private FileEntity requireFile(UUID fileId) {
        return fileRepository.findById(fileId)
            .orElseThrow(() -> new ApiException("NOT_FOUND", "Fichier introuvable.", HttpStatus.NOT_FOUND.value()));
    }

    private boolean canAccess(FileEntity entity, UUID userId) {
        if (entity.getOwnerId().equals(userId)) {
            return true;
        }
        return fileShareRepository.existsByFileIdAndSharedWithUserId(entity.getId(), userId);
    }

    private void deletePhysicalFile(FileEntity entity) {
        try {
            Files.deleteIfExists(Path.of(entity.getStoragePath()));
        } catch (IOException ex) {
            throw new ApiException("STORAGE_ERROR", "Impossible de supprimer le fichier.", HttpStatus.INTERNAL_SERVER_ERROR.value());
        }
    }

    private String extractExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex == -1 || dotIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(dotIndex + 1).toLowerCase();
    }

    private FileEntity requireAccessibleFile(UUID fileId, UUID requesterId) {
        FileEntity entity = requireFile(fileId);
        if (!canAccess(entity, requesterId)) {
            throw new ApiException("FORBIDDEN", "Action non autorisée.", HttpStatus.FORBIDDEN.value());
        }
        return entity;
    }

    private Resource loadResource(FileEntity entity) {
        try {
            Path path = Path.of(entity.getStoragePath()).normalize();
            if (!path.startsWith(storageRoot)) {
                throw new ApiException("FORBIDDEN", "Action non autorisée.", HttpStatus.FORBIDDEN.value());
            }
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ApiException("NOT_FOUND", "Fichier introuvable.", HttpStatus.NOT_FOUND.value());
            }
            return resource;
        } catch (IOException ex) {
            throw new ApiException("STORAGE_ERROR", "Impossible de lire le fichier.", HttpStatus.INTERNAL_SERVER_ERROR.value());
        }
    }

    private FileItemDto toDto(FileEntity entity) {
        return toDto(entity, true);
    }

    private FileItemDto toDtoForRecipient(FileEntity entity) {
        return toDto(entity, false);
    }

    private FileItemDto toDto(FileEntity entity, boolean includeShares) {
        List<FileShareEntryDto> shares = includeShares
            ? entity.getShares().stream()
                .map(share -> new FileShareEntryDto(
                    share.getSharedWithUserId().toString(),
                    share.getSharedWithUsername(),
                    share.getCreatedAt().toString()
                ))
                .toList()
            : List.of();

        return new FileItemDto(
            entity.getId().toString(),
            entity.getFilename(),
            entity.getExtension(),
            entity.getSizeBytes(),
            entity.getOwnerId().toString(),
            entity.getOwnerUsername(),
            entity.getCreatedAt().toString(),
            shares
        );
    }

    public record DownloadResult(Resource resource, String filename) {}
}
