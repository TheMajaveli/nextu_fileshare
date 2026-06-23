package com.nextu.fileshare.storage.repository;

import com.nextu.fileshare.storage.model.entity.FileEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Spring Data repository for file metadata with owner and share-aware queries.
 */
public interface FileRepository extends JpaRepository<FileEntity, UUID> {

    /** Lists files owned by a user, newest first. */
    List<FileEntity> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);

    /** Loads owned files with their share relationships eagerly fetched. */
    @Query("""
        SELECT DISTINCT f FROM FileEntity f
        LEFT JOIN FETCH f.shares
        WHERE f.ownerId = :ownerId
        ORDER BY f.createdAt DESC
        """)
    List<FileEntity> findOwnedWithShares(@Param("ownerId") UUID ownerId);

    /** Loads files shared with the given user, including share details. */
    @Query("""
        SELECT DISTINCT f FROM FileEntity f
        JOIN f.shares s
        LEFT JOIN FETCH f.shares
        WHERE s.sharedWithUserId = :userId
        ORDER BY f.createdAt DESC
        """)
    List<FileEntity> findSharedWithUser(@Param("userId") UUID userId);
}
