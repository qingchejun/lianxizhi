-- 一次性迁移：放开注册，账号分免费版 / 完整版（2026-11-24）。只跑一次；ADD COLUMN 无 IF NOT EXISTS，重复跑会报错。
-- 加列时已有的账号全部设成完整版（站长定：现有用户都算完整版），之后新注册的默认免费版。
ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
UPDATE users SET plan='full';
