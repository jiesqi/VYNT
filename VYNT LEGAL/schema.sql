CREATE TABLE IF NOT EXISTS tiktok_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  open_id TEXT NOT NULL UNIQUE,

  display_name TEXT,

  avatar_url TEXT,

  profile_url TEXT,

  access_token TEXT NOT NULL,

  refresh_token TEXT NOT NULL,

  access_token_expires_at INTEGER NOT NULL,

  refresh_token_expires_at INTEGER NOT NULL,

  scopes TEXT,

  created_at INTEGER NOT NULL,

  updated_at INTEGER NOT NULL
);


CREATE INDEX IF NOT EXISTS
idx_tiktok_accounts_open_id
ON tiktok_accounts(open_id);


CREATE INDEX IF NOT EXISTS
idx_tiktok_accounts_updated_at
ON tiktok_accounts(updated_at);
