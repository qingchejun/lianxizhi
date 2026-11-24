-- 已存在库的增量迁移见 tools/migrate-*.sql（各只跑一次）
CREATE TABLE IF NOT EXISTS users(
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  pwver INTEGER NOT NULL DEFAULT 1,
  verified INTEGER NOT NULL DEFAULT 0,
  admin INTEGER NOT NULL DEFAULT 0,
  banned INTEGER NOT NULL DEFAULT 0,
  invite_id TEXT,
  created_at INTEGER NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' /* free = 免费版（口算、数独）；full = 完整版。见 tools/migrate-20261124-plan.sql */
);
CREATE TABLE IF NOT EXISTS data(
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, key)
);
CREATE TABLE IF NOT EXISTS tokens(
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens(user_id, kind);
CREATE TABLE IF NOT EXISTS limits(
  scope TEXT NOT NULL,
  kind TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  ts INTEGER NOT NULL DEFAULT 0,
  until INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, kind)
);
CREATE TABLE IF NOT EXISTS invites(
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  revoked_at INTEGER,
  claimed_by TEXT,
  claimed_at INTEGER,
  activated_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_invites_claimed ON invites(claimed_by);
CREATE INDEX IF NOT EXISTS idx_users_unverified ON users(verified, created_at); -- 清理 48 小时没验证的账号用
CREATE TABLE IF NOT EXISTS sessions( -- 登录设备：一个账号最多 3 台同时登录（见 auth-core openSession、tools/migrate-20261124-sessions.sql）
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  ended_at INTEGER,
  ended_reason TEXT -- kicked = 被第 4 台挤掉；logout = 自己退出；pw = 改 / 重设密码
);
CREATE INDEX IF NOT EXISTS idx_sessions_uid ON sessions(uid, ended_at);
