package com.nextu.fileshare.storage;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spring Boot entry point for the JWT-protected file storage API.
 */
@SpringBootApplication
public class StorageServiceApplication {

    /** Starts the storage service application. */
    public static void main(String[] args) {
        SpringApplication.run(StorageServiceApplication.class, args);
    }
}
