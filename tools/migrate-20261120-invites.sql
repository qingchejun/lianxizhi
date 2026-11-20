-- 一次性迁移：邀请码注册制（2026-11-20）。只跑一次；ADD COLUMN 无 IF NOT EXISTS，重复跑会报错。
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
ALTER TABLE users ADD COLUMN admin INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN invite_id TEXT;
UPDATE users SET admin=1 WHERE email='25800712@qq.com';
