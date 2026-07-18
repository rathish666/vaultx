CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id),
    parent_folder_id UUID REFERENCES folders(id),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id),
    folder_id UUID REFERENCES folders(id),
    filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(150),
    size_bytes BIGINT NOT NULL,
    storage_path VARCHAR(1000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'complete',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_folders_owner ON folders(owner_id);
CREATE INDEX idx_folders_parent ON folders(parent_folder_id);
CREATE INDEX idx_files_owner ON files(owner_id);
CREATE INDEX idx_files_folder ON files(folder_id);