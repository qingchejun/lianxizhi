-- 一次性迁移：「开通时通知我」（2026-11-25）。只新建一张表，不动已有数据；带 IF NOT EXISTS，重复跑也没事。
-- 完整版说明页（识字、拼音）上的按钮：付费开通 2027-01 上线前，先记下想买的账号，到时发邮件通知。
CREATE TABLE IF NOT EXISTS wants(
  uid TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);
