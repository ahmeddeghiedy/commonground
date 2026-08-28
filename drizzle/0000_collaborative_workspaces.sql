CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  nights INTEGER NOT NULL CHECK (nights BETWEEN 1 AND 30),
  state_json TEXT NOT NULL,
  owner_token_hash TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  traveler_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('traveler')),
  status TEXT NOT NULL CHECK (status IN ('invited', 'active')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id
ON workspace_members(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_status
ON workspace_members(workspace_id, status);

PRAGMA optimize;
