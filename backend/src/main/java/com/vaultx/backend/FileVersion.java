package com.vaultx.backend;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "file_versions")
@Getter
@Setter
public class FileVersion {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "file_id", nullable = false)
    private UUID fileId;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "storage_path", nullable = false)
    private String storagePath;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();
}