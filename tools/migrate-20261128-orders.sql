-- 2026-11-28：完整版年卡订单表（Waffo 收款，server/pay-core.js）。只新增表，不动旧表；重复跑无害。
-- 正式库：先 wrangler d1 export lianxizhi --remote 备份，站长同意后再跑：
--   wrangler d1 execute lianxizhi --remote --file tools/migrate-20261128-orders.sql
CREATE TABLE IF NOT EXISTS orders(
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  email TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  days INTEGER NOT NULL,
  status TEXT NOT NULL,
  waffo_session TEXT,
  waffo_payment_id TEXT,
  refund_ticket TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER,
  granted_at INTEGER,
  refunded_at INTEGER,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_orders_uid ON orders(uid, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment ON orders(waffo_payment_id) WHERE waffo_payment_id IS NOT NULL;
