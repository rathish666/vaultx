package com.vaultx.backend;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FileRepository extends JpaRepository<FileEntity, UUID> {
    List<FileEntity> findByOwnerIdAndFolderIdAndIsDeletedFalse(UUID ownerId, UUID folderId);
    List<FileEntity> findByOwnerIdAndFolderIdIsNullAndIsDeletedFalse(UUID ownerId);
    List<FileEntity> findByOwnerIdAndIsDeletedTrue(UUID ownerId);
}