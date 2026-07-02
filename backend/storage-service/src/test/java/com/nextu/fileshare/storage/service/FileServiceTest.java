package com.nextu.fileshare.storage.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nextu.fileshare.storage.config.StorageProperties;
import com.nextu.fileshare.storage.exception.ApiException;
import com.nextu.fileshare.storage.model.entity.FileEntity;
import com.nextu.fileshare.storage.model.entity.FileShareEntity;
import com.nextu.fileshare.storage.repository.FileRepository;
import com.nextu.fileshare.storage.repository.FileShareRepository;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

/**
 * Unit tests for file upload validation rules in FileService.
 * Verifies extension filtering and size enforcement without touching the filesystem.
 */
@ExtendWith(MockitoExtension.class)
class FileServiceTest {

    @Mock
    private FileRepository fileRepository;

    @Mock
    private FileShareRepository fileShareRepository;

    @Mock
    private StorageProperties storageProperties;

    @TempDir
    Path tempDir;

    private FileService fileService;

    @BeforeEach
    void setUp() throws IOException {
        when(storageProperties.getBasePath()).thenReturn(tempDir.toString());
        when(storageProperties.getMaxSizeBytes()).thenReturn(26_214_400L);
        when(storageProperties.getAllowedExtensions()).thenReturn(List.of(
            "pdf", "xlsx", "xls", "doc", "docx", "mp3", "mp4"
        ));
        fileService = new FileService(fileRepository, fileShareRepository, storageProperties);
    }

    @ParameterizedTest
    @ValueSource(strings = {"exe", "txt", "zip"})
    void uploadWithDisallowedExtensionThrowsInvalidFileType(String extension) {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getOriginalFilename()).thenReturn("file." + extension);

        ApiException ex = assertThrows(ApiException.class, () ->
            fileService.uploadFile(file, UUID.randomUUID(), "alice")
        );
        assertEquals("INVALID_FILE_TYPE", ex.getErrorCode());
    }

    @Test
    void uploadWithNoExtensionThrowsInvalidFileType() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getOriginalFilename()).thenReturn("noextension");

        ApiException ex = assertThrows(ApiException.class, () ->
            fileService.uploadFile(file, UUID.randomUUID(), "alice")
        );
        assertEquals("INVALID_FILE_TYPE", ex.getErrorCode());
    }

    @ParameterizedTest
    @CsvSource({
        "rapport.pdf, pdf",
        "budget.xlsx, xlsx",
        "legacy.xls, xls",
        "memo.doc, doc",
        "report.docx, docx",
        "audio.mp3, mp3",
        "clip.mp4, mp4"
    })
    void uploadWithAllowedExtensionPassesValidation(String filename, String extension) throws Exception {
        MultipartFile file = mockMultipartFile(filename, 1024L);

        when(fileRepository.save(any())).thenAnswer(invocation -> {
            FileEntity entity = invocation.getArgument(0);
            if (entity.getCreatedAt() == null) {
                entity.setCreatedAt(Instant.now());
            }
            return entity;
        });

        fileService.uploadFile(file, UUID.randomUUID(), "alice");

        verify(fileRepository).save(any());
        assertEquals(extension, filename.substring(filename.lastIndexOf('.') + 1));
    }

    @Test
    void uploadMultipleFilesForSameOwnerSavesTwice() throws Exception {
        UUID ownerId = UUID.randomUUID();
        when(fileRepository.save(any())).thenAnswer(invocation -> {
            FileEntity entity = invocation.getArgument(0);
            if (entity.getCreatedAt() == null) {
                entity.setCreatedAt(Instant.now());
            }
            return entity;
        });

        fileService.uploadFile(mockMultipartFile("a.pdf", 512L), ownerId, "alice");
        fileService.uploadFile(mockMultipartFile("b.pdf", 512L), ownerId, "alice");

        verify(fileRepository, times(2)).save(any());
    }

    @Test
    void uploadExceedingMaxSizeThrowsFileTooLarge() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getOriginalFilename()).thenReturn("large.pdf");
        when(file.getSize()).thenReturn(30L * 1024 * 1024);

        ApiException ex = assertThrows(ApiException.class, () ->
            fileService.uploadFile(file, UUID.randomUUID(), "alice")
        );
        assertEquals("FILE_TOO_LARGE", ex.getErrorCode());
    }

    @Test
    void shareFileByOwnerGrantsAccess() throws Exception {
        UUID ownerId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        UUID fileId = UUID.randomUUID();
        FileEntity entity = ownedFile(fileId, ownerId, "rapport.pdf");

        when(fileRepository.findById(fileId)).thenReturn(Optional.of(entity));
        when(fileShareRepository.existsByFileIdAndSharedWithUserId(fileId, targetId)).thenReturn(false);
        when(fileShareRepository.save(any())).thenAnswer(invocation -> {
            FileShareEntity share = invocation.getArgument(0);
            if (share.getCreatedAt() == null) {
                share.setCreatedAt(Instant.now());
            }
            return share;
        });
        when(fileRepository.findOwnedWithShares(ownerId)).thenReturn(List.of(entity));

        fileService.shareFile(fileId, ownerId, targetId, "bob");

        verify(fileShareRepository).save(any(FileShareEntity.class));
    }

    @Test
    void shareFileWithSelfThrowsSelfShare() {
        UUID ownerId = UUID.randomUUID();
        UUID fileId = UUID.randomUUID();
        FileEntity entity = ownedFile(fileId, ownerId, "rapport.pdf");

        when(fileRepository.findById(fileId)).thenReturn(Optional.of(entity));

        ApiException ex = assertThrows(ApiException.class, () ->
            fileService.shareFile(fileId, ownerId, ownerId, "alice")
        );
        assertEquals("SELF_SHARE", ex.getErrorCode());
    }

    @Test
    void shareFileByNonOwnerThrowsForbidden() {
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        UUID fileId = UUID.randomUUID();
        FileEntity entity = ownedFile(fileId, ownerId, "rapport.pdf");

        when(fileRepository.findById(fileId)).thenReturn(Optional.of(entity));

        ApiException ex = assertThrows(ApiException.class, () ->
            fileService.shareFile(fileId, otherId, UUID.randomUUID(), "bob")
        );
        assertEquals("FORBIDDEN", ex.getErrorCode());
    }

    @Test
    void revokeShareByOwnerRemovesAccess() throws Exception {
        UUID ownerId = UUID.randomUUID();
        UUID sharedUserId = UUID.randomUUID();
        UUID fileId = UUID.randomUUID();
        FileEntity entity = ownedFile(fileId, ownerId, "rapport.pdf");
        FileShareEntity share = new FileShareEntity();
        share.setSharedWithUserId(sharedUserId);
        share.setSharedWithUsername("bob");
        share.setCreatedAt(Instant.now());
        share.setFile(entity);
        entity.getShares().add(share);

        when(fileRepository.findById(fileId)).thenReturn(Optional.of(entity));
        when(fileShareRepository.findByFileIdAndSharedWithUserId(fileId, sharedUserId))
            .thenReturn(Optional.of(share));
        when(fileRepository.findOwnedWithShares(ownerId)).thenReturn(List.of(entity));

        fileService.revokeShare(fileId, ownerId, sharedUserId);

        verify(fileShareRepository).delete(share);
    }

    @Test
    void deleteFileByOwnerRemovesFile() throws Exception {
        UUID ownerId = UUID.randomUUID();
        UUID fileId = UUID.randomUUID();
        Path stored = tempDir.resolve(fileId + ".pdf");
        Files.writeString(stored, "content");
        FileEntity entity = ownedFile(fileId, ownerId, "rapport.pdf");
        entity.setStoragePath(stored.toString());

        when(fileRepository.findById(fileId)).thenReturn(Optional.of(entity));

        fileService.deleteFile(fileId, ownerId);

        verify(fileRepository).delete(entity);
    }

    @Test
    void deleteFileByNonOwnerThrowsForbidden() {
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        UUID fileId = UUID.randomUUID();
        FileEntity entity = ownedFile(fileId, ownerId, "rapport.pdf");

        when(fileRepository.findById(fileId)).thenReturn(Optional.of(entity));

        ApiException ex = assertThrows(ApiException.class, () ->
            fileService.deleteFile(fileId, otherId)
        );
        assertEquals("FORBIDDEN", ex.getErrorCode());
    }

    private static MultipartFile mockMultipartFile(String filename, long size) throws IOException {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getOriginalFilename()).thenReturn(filename);
        when(file.getSize()).thenReturn(size);
        when(file.getInputStream()).thenReturn(new ByteArrayInputStream(new byte[] {1, 2, 3}));
        when(file.getContentType()).thenReturn("application/octet-stream");
        return file;
    }

    private static FileEntity ownedFile(UUID fileId, UUID ownerId, String filename) {
        FileEntity entity = new FileEntity();
        entity.setId(fileId);
        entity.setOwnerId(ownerId);
        entity.setOwnerUsername("alice");
        entity.setFilename(filename);
        entity.setExtension(filename.substring(filename.lastIndexOf('.') + 1));
        entity.setStoragePath("/tmp/" + filename);
        entity.setSizeBytes(1024L);
        entity.setCreatedAt(Instant.now());
        return entity;
    }
}
