package com.nextu.fileshare.storage.repository;

import com.nextu.fileshare.storage.model.entity.FileShareEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FileShareRepository extends JpaRepository<FileShareEntity, UUID> {

    Optional<FileShareEntity> findByFileIdAndSharedWithUserId(UUID fileId, UUID sharedWithUserId);

    boolean existsByFileIdAndSharedWithUserId(UUID fileId, UUID sharedWithUserId);
}
