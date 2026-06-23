package com.nextu.fileshare.storage.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Storage service configuration bound from {@code storage.*} properties in application.yml.
 */
@Configuration
@ConfigurationProperties(prefix = "storage")
public class StorageProperties {

    /** Absolute path where uploaded files are persisted on disk. */
    private String basePath = "/data/storage";

    /** Maximum allowed upload size in bytes (default 25 MB). */
    private long maxSizeBytes = 26_214_400L;

    /** File extensions permitted for upload (without leading dot). */
    private List<String> allowedExtensions = List.of(
        "pdf", "xlsx", "xls", "doc", "docx", "mp3", "mp4"
    );

    public String getBasePath() {
        return basePath;
    }

    public void setBasePath(String basePath) {
        this.basePath = basePath;
    }

    public long getMaxSizeBytes() {
        return maxSizeBytes;
    }

    public void setMaxSizeBytes(long maxSizeBytes) {
        this.maxSizeBytes = maxSizeBytes;
    }

    public List<String> getAllowedExtensions() {
        return allowedExtensions;
    }

    public void setAllowedExtensions(List<String> allowedExtensions) {
        this.allowedExtensions = allowedExtensions;
    }
}
