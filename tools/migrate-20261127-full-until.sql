-- 2026-11-27：免费账号送 7 天完整版体验（server/auth-core.js TRIAL_DAYS、planOf）。只跑一次。
-- 1. 加列：完整版到期时间（毫秒），0 = 没有。
ALTER TABLE users ADD COLUMN full_until INTEGER NOT NULL DEFAULT 0;
-- 2. 现有的免费账号，从上线这一刻起各送 7 天（站长 11-27 定）。
UPDATE users SET full_until = (CAST(strftime('%s','now') AS INTEGER) + 7 * 86400) * 1000 WHERE plan = 'free' AND full_until = 0; -- 误跑第二次不会再延长
-- 注意：先跑这个迁移，再部署代码（新代码会读写 full_until 列，列不在会整站登录失败）。
