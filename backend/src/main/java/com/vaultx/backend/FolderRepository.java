package com.vaultx.backend;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FolderRepository extends JpaRepository<Folder, UUID> {
    List<Folder> findByOwnerIdAndParentFolderId(UUID ownerId, UUID parentFolderId);
    List<Folder> findByOwnerIdAndParentFolderIdIsNull(UUID ownerId);
}