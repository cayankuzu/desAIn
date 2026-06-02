CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_image_data_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_opened_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_scenes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  room_shape TEXT NOT NULL,
  room_purpose TEXT NOT NULL,
  room_width REAL NOT NULL,
  room_depth REAL NOT NULL,
  room_height REAL NOT NULL,
  room_data_json TEXT NOT NULL,
  notes_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_items (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL,
  source_object_id TEXT NOT NULL,
  label TEXT NOT NULL,
  label_key TEXT NOT NULL,
  category TEXT NOT NULL,
  generator TEXT NOT NULL,
  position_x REAL NOT NULL,
  position_z REAL NOT NULL,
  rotation REAL NOT NULL,
  dimension_width REAL NOT NULL,
  dimension_depth REAL NOT NULL,
  dimension_height REAL NOT NULL,
  color TEXT NOT NULL,
  movable INTEGER NOT NULL,
  locked INTEGER NOT NULL,
  params_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (scene_id) REFERENCES project_scenes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_groups (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL,
  source_group_id TEXT NOT NULL,
  label TEXT NOT NULL,
  object_ids_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (scene_id) REFERENCES project_scenes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_project_items_scene_id ON project_items(scene_id);
CREATE INDEX IF NOT EXISTS idx_project_groups_scene_id ON project_groups(scene_id);
