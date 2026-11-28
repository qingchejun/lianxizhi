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
  plan TEXT NOT NULL DEFAULT 'free', /* free = 免费版；full = 完整版（邀请码，永久）。见 tools/migrate-20261124-plan.sql */
  full_until INTEGER NOT NULL DEFAULT 0 /* 免费账号的完整版到期时间（毫秒）：注册送 7 天体验，以后年卡也写这里。见 tools/migrate-20261127-full-until.sql */
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
CREATE TABLE IF NOT EXISTS wants( -- 「开通时通知我」：付费开通上线前想买完整版的账号（tools/migrate-20261125-wants.sql）
  uid TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders( -- 完整版年卡订单（Waffo 收款，2026-11-28，tools/migrate-20261128-orders.sql；server/pay-core.js）
  id TEXT PRIMARY KEY,            -- 我们的订单号，也是 Waffo 的 orderMerchantExternalId
  uid TEXT NOT NULL,              -- 账号（删账号不删订单，留作账目）
  email TEXT NOT NULL,            -- 下单时的邮箱
  amount INTEGER NOT NULL,        -- 分
  currency TEXT NOT NULL,
  days INTEGER NOT NULL,          -- 这单加几天完整版
  status TEXT NOT NULL,           -- pending 待付 / paid 已付 / refunded 已退 / mismatch 金额对不上（没开通，人工看）
  waffo_session TEXT,
  waffo_payment_id TEXT,          -- 付款号：同一笔只开通一次
  refund_ticket TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER,
  granted_at INTEGER,             -- 加过天数的时间（和记已付同一事务，只加一次）
  refunded_at INTEGER,
  revoked_at INTEGER              -- 退款后扣回天数的时间（只扣一次）
);
CREATE INDEX IF NOT EXISTS idx_orders_uid ON orders(uid, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment ON orders(waffo_payment_id) WHERE waffo_payment_id IS NOT NULL;
