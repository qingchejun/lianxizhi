-- 一次性迁移：账号停用功能（2026-11-20，冒烟后追加）。只跑一次；ADD COLUMN 无 IF NOT EXISTS，重复跑会报错。
ALTER TABLE users ADD COLUMN banned INTEGER NOT NULL DEFAULT 0;
