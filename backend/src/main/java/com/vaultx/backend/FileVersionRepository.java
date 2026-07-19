package com.vaultx.backend;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FileVersionRepository extends JpaRepository<FileVersion, UUID> {
    List<FileVersion> findByFileIdOrderByVersionNumberDesc(UUID fileId);
    long countByFileId(UUID fileId);
}