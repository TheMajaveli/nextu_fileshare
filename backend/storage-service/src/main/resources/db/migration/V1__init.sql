CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE files (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id         UUID NOT NULL,
    owner_username   VARCHAR(255) NOT NULL,
    filename         VARCHAR(255) NOT NULL,
    extension        VARCHAR(10)  NOT NULL,
    storage_path     VARCHAR(512) NOT NULL,
    size_bytes       BIGINT       NOT NULL,
    content_type     VARCHAR(255),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE file_shares (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id               UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    shared_with_user_id   UUID NOT NULL,
    shared_with_username  VARCHAR(255) NOT NULL,
    shared_by_user_id     UUID NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (file_id, shared_with_user_id)
);

CREATE INDEX idx_files_owner_id ON files(owner_id);
CREATE INDEX idx_file_shares_shared_with ON file_shares(shared_with_user_id);
