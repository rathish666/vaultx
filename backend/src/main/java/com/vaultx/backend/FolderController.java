package com.vaultx.backend;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/folders")
public class FolderController {

    private final FolderRepository folderRepository;

    public FolderController(FolderRepository folderRepository) {
        this.folderRepository = folderRepository;
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateFolderRequest request, Authentication authentication) {
        UUID ownerId = UUID.fromString(authentication.getName());

        Folder folder = new Folder();
        folder.setOwnerId(ownerId);
        folder.setName(request.getName());
        folder.setParentFolderId(request.getParentFolderId());

        folderRepository.save(folder);

        return ResponseEntity.status(201).body(folder);
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) UUID parentFolderId, Authentication authentication) {
        UUID ownerId = UUID.fromString(authentication.getName());

        List<Folder> folders = (parentFolderId == null)
                ? folderRepository.findByOwnerIdAndParentFolderIdIsNull(ownerId)
                : folderRepository.findByOwnerIdAndParentFolderId(ownerId, parentFolderId);

        return ResponseEntity.ok(folders);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id, Authentication authentication) {
        UUID ownerId = UUID.fromString(authentication.getName());

        return folderRepository.findById(id)
                .filter(f -> f.getOwnerId().equals(ownerId))
                .map(f -> {
                    folderRepository.delete(f);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.status(404).body(Map.of("error", "Folder not found")));
    }
}