package com.nextu.fileshare.storage.repository;

import com.nextu.fileshare.storage.model.entity.FileShareEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data repository for file share records linking files to recipient users.
 */
public interface FileShareRepository extends JpaRepository<FileShareEntity, UUID> {

    /** Finds the share row for a file and recipient user, if it exists. */
    Optional<FileShareEntity> findByFileIdAndSharedWithUserId(UUID fileId, UUID sharedWithUserId);

    /** Returns whether a file is already shared with the given recipient. */
    boolean existsByFileIdAndSharedWithUserId(UUID fileId, UUID sharedWithUserId);
}
