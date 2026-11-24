-- 一次性迁移：登录设备上限 3 台（2026-11-24）。只加表，重复跑也没事。
-- 上线后旧 cookie（没有 sid）一律要重新登录一次（站长定：老设备不用照顾）。
CREATE TABLE IF NOT EXISTS sessions(
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  ended_at INTEGER,
  ended_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_uid ON sessions(uid, ended_at);
