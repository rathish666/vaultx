package com.vaultx.backend;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class CreateFolderRequest {

    @NotBlank
    private String name;

    private UUID parentFolderId;
}