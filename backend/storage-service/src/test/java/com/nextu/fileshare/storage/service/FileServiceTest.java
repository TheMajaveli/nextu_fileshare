package com.nextu.fileshare.storage.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.nextu.fileshare.storage.config.StorageProperties;
import com.nextu.fileshare.storage.exception.ApiException;
import com.nextu.fileshare.storage.repository.FileRepository;
import com.nextu.fileshare.storage.repository.FileShareRepository;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
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

    @Test
    void uploadWithDisallowedExtensionThrowsInvalidFileType() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getOriginalFilename()).thenReturn("malware.exe");
        when(file.getSize()).thenReturn(1024L);

        ApiException ex = assertThrows(ApiException.class, () ->
            fileService.uploadFile(file, UUID.randomUUID(), "alice")
        );
        assertEquals("INVALID_FILE_TYPE", ex.getErrorCode());
    }

    @Test
    void uploadWithAllowedExtensionPassesValidation() throws Exception {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getOriginalFilename()).thenReturn("rapport.pdf");
        when(file.getSize()).thenReturn(1024L);
        when(file.getInputStream()).thenReturn(new ByteArrayInputStream(new byte[]{1, 2, 3}));
        when(file.getContentType()).thenReturn("application/pdf");
        when(fileRepository.save(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> invocation.getArgument(0));

        fileService.uploadFile(file, UUID.randomUUID(), "alice");
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
}
