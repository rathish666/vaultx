package com.vaultx.backend;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/files")
public class FileController {

    private final FileRepository fileRepository;
    private final FileStorageService storageService;

    public FileController(FileRepository fileRepository, FileStorageService storageService) {
        this.fileRepository = fileRepository;
        this.storageService = storageService;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                     @RequestParam(required = false) UUID folderId,
                                     Authentication authentication) throws IOException {
        UUID ownerId = UUID.fromString(authentication.getName());

        String storagePath = storageService.store(file);

        FileEntity entity = new FileEntity();
        entity.setOwnerId(ownerId);
        entity.setFolderId(folderId);
        entity.setFilename(file.getOriginalFilename());
        entity.setMimeType(file.getContentType());
        entity.setSizeBytes(file.getSize());
        entity.setStoragePath(storagePath);

        fileRepository.save(entity);

        return ResponseEntity.status(201).body(entity);
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) UUID folderId, Authentication authentication) {
        UUID ownerId = UUID.fromString(authentication.getName());

        List<FileEntity> files = (folderId == null)
                ? fileRepository.findByOwnerIdAndFolderIdIsNullAndIsDeletedFalse(ownerId)
                : fileRepository.findByOwnerIdAndFolderIdAndIsDeletedFalse(ownerId, folderId);

        return ResponseEntity.ok(files);
    }

    @GetMapping("/trash")
    public ResponseEntity<?> listTrash(Authentication authentication) {
        UUID ownerId = UUID.fromString(authentication.getName());
        List<FileEntity> deleted = fileRepository.findByOwnerIdAndIsDeletedTrue(ownerId);
        return ResponseEntity.ok(deleted);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> download(@PathVariable UUID id, Authentication authentication) throws IOException {
        UUID ownerId = UUID.fromString(authentication.getName());

        return fileRepository.findById(id)
                .filter(f -> f.getOwnerId().equals(ownerId))
                .<ResponseEntity<?>>map(f -> {
                    try {
                        byte[] data = storageService.read(f.getStoragePath());
                        return ResponseEntity.ok()
                                .contentType(MediaType.parseMediaType(
                                        f.getMimeType() != null ? f.getMimeType() : "application/octet-stream"))
                                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + f.getFilename() + "\"")
                                .body(new ByteArrayResource(data));
                    } catch (IOException e) {
                        return ResponseEntity.status(500).body(Map.of("error", "Failed to read file"));
                    }
                })
                .orElse(ResponseEntity.status(404).body(Map.of("error", "File not found")));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> softDelete(@PathVariable UUID id, Authentication authentication) {
        UUID ownerId = UUID.fromString(authentication.getName());

        return fileRepository.findById(id)
                .filter(f -> f.getOwnerId().equals(ownerId))
                .map(f -> {
                    f.setDeleted(true);
                    f.setDeletedAt(OffsetDateTime.now());
                    fileRepository.save(f);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.status(404).body(Map.of("error", "File not found")));
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<?> restore(@PathVariable UUID id, Authentication authentication) {
        UUID ownerId = UUID.fromString(authentication.getName());

        return fileRepository.findById(id)
                .filter(f -> f.getOwnerId().equals(ownerId))
                .<ResponseEntity<?>>map(f -> {
                    f.setDeleted(false);
                    f.setDeletedAt(null);
                    fileRepository.save(f);
                    return ResponseEntity.ok(f);
                })
                .orElse(ResponseEntity.status(404).body(Map.of("error", "File not found")));
    }
    @GetMapping("/search")
public ResponseEntity<?> search(@RequestParam String q, Authentication authentication) {
    UUID ownerId = UUID.fromString(authentication.getName());
    List<FileEntity> results = fileRepository.findByOwnerIdAndIsDeletedFalseAndFilenameContainingIgnoreCase(ownerId, q);
    return ResponseEntity.ok(results);
}
}