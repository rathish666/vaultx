package com.vaultx.backend;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${app.storage.local-path}")
    private String basePath;

    public String store(MultipartFile file) throws IOException {
        Path dir = Paths.get(basePath);
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
        }

        String storedName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path target = dir.resolve(storedName);
        file.transferTo(target);

        return target.toString();
    }

    public byte[] read(String storagePath) throws IOException {
        return Files.readAllBytes(Paths.get(storagePath));
    }

    public void delete(String storagePath) throws IOException {
        Files.deleteIfExists(Paths.get(storagePath));
    }
}