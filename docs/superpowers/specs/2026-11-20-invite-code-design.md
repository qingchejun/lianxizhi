# 邀请码注册制 + 管理后台设计

日期：2026-11-20 · 状态：待站长审阅

## 1. 背景与目标

站点要开放给身边几位家长朋友一起用（小范围迭代阶段）。注册从敞开改为
**邀请制**：只有拿邀请码的人才能注册。站长在自己的账号里生成码、发给人、
看激活情况、必要时作废。

已拍板的决定（2026-11-20，AskUserQuestion）：

- **一码一人**：每张码只能注册一个邮箱
- **注册时占用**：提交注册那一刻码就被占用，邮箱验证完成算「激活」；
  被占用的码别的邮箱再用一律拒绝
- **码格式**：8 位两组带横线（如 `K7M2-QF9W`），字母表去掉易混的
  0/O/1/I/L；输入时大小写、空格、横线一律忽略
- **永久有效**，不想给了在后台手动作废
- **专门的管理员面板**（2026-11-20 站长定）：管理功能不塞在账号小弹窗里，
  单独一个 `admin.html` 页面，登录管理员账号才能用
- 老账号不受任何影响；登录、找回密码、改密码、数据同步都不需要码

## 2. 状态机

```
未用 ──注册──▶ 已占用 ──邮箱验证──▶ 已激活
  │                │
  └──────作废──────┘ （作废后不能再注册；已激活的行不再给作废按钮）
```

- 「已占用未激活」= 有人提交了注册但没验证邮箱（可能填错邮箱占住了码）：
  后台能看到这个状态，站长作废后重新生成一张发给本人即可
- 同一邮箱未验证时重复提交 / 重发验证码，走现有的「换密码重发码」逻辑，
  **不会**再吃一张新码（码已绑在这个邮箱的 user 行上）

## 3. 数据库（D1，纯新增不动旧数据）

```sql
CREATE TABLE IF NOT EXISTS invites(
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,   -- 8 位大写无横线（横线只用于展示）
  note TEXT NOT NULL DEFAULT '',  -- 备注：发给谁
  created_at INTEGER NOT NULL,
  revoked_at INTEGER,          -- 非空 = 已作废
  claimed_by TEXT,             -- 占用者 users.id
  claimed_at INTEGER,
  activated_at INTEGER         -- 激活时刻（邮箱验证完成）
);
CREATE INDEX IF NOT EXISTS idx_invites_claimed ON invites(claimed_by);

ALTER TABLE users ADD COLUMN admin INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN invite_id TEXT;   -- 老账号为 NULL，不受影响
```

- 码**明文入库**：站长要能随时复制转发，管理接口有登录+管理员门槛，
  D1 本身只有站长能查；不引入 hash 码的复杂度（小范围阶段的取舍）
- 迁移注意：SQLite 的 `ADD COLUMN` 没有 `IF NOT EXISTS`，重复执行会报错
  ——迁移只跑一次，执行前先 `PRAGMA table_info(users)` 确认列不存在
- 站长账号打标：`UPDATE users SET admin=1 WHERE email='<站长邮箱>'`
  （执行时向站长要邮箱）

## 4. 注册流程改动（server/auth-core.js）

现有顺序不变，只在「新用户」分支前插一步验码：

1. 邮箱、密码格式校验（现有）
2. 邮箱已注册且已验证 → 409（现有）
3. 邮箱存在但未验证 → **不要求码**（码已在该 user 行上），走现有
   「换密码 + 重发验证码」（现有逻辑，重发按钮也复用它）
4. 新用户：
   - `invite` 必填，规范化（去横线/空格、转大写）
   - 查码：不存在 / `revoked_at` 非空 / `claimed_by` 非空 → 422，
     提示「邀请码不对」；**先验码再发邮件**，不浪费 Resend 额度
   - 错码限流：复用 limits 表，按邮箱计数（kind=`invitefail`），
     错 5 次锁 15 分钟——防拿脚本扫码
   - 占码（原子）：`UPDATE invites SET claimed_by=?, claimed_at=?
     WHERE id=? AND claimed_by IS NULL AND revoked_at IS NULL`
     （作废条件也进原子判断：查码与占码之间刚好被作废的竞态窗口一并堵死），
     changes=0 说明被抢/被作废 → 422
   - insertUser 带上 `invite_id`
5. 发验证码（现有 issueCode）

## 5. 激活（verify 改动）

`verify()` 成功后：user 有 `invite_id` 且该码 `activated_at` 为空 →
写入 `activated_at = now`。老账号 `invite_id` 为 NULL，什么都不发生。
**作废不影响已注册**：占码发生在注册时，作废只拦「还没注册的人」。

## 6. 管理后台

### 接口（server/admin-core.js 纯逻辑 + functions/api/admin/ 翻译）

| 接口 | 作用 | 门槛 |
|------|------|------|
| `GET /api/admin/invites` | 全量列表（码、备注、状态、时间、占用/激活邮箱） | 登录 + admin |
| `POST /api/admin/invites` | 生成：`{note, count?}`，count 1–20 默认 1 | 登录 + admin |
| `POST /api/admin/invites/revoke` | 作废：`{id}` | 登录 + admin |

- 门槛实现在 requireSession 之后查 `users.admin`，非管理员 403
- 码生成：`crypto.getRandomValues`，字母表 31 字符（A–Z 去 I/L/O + 2–9），
  UNIQUE 冲突就重生成（8 位空间 ≈ 31⁸ ≈ 8.5×10¹¹，实际撞不上，防御性重试）
- 列表的「占用/激活邮箱」按 `claimed_by` 关联 users 带出

### 界面（专门的管理员面板 admin.html，2026-11-20 站长定）

- **独立页面 `admin.html`**，不进侧栏导航、不加任何公开链接；
  `<meta name="robots" content="noindex">`（私人页面只 noindex，不动 robots.txt）
- 进门门槛：页面加载先调 `/api/auth/me`——没登录跳回首页（弹登录窗），
  登录了但不是管理员显示「无权访问」；真正的门在服务端接口
  （requireSession + admin），页面挡的是体验，接口挡的是安全
- 入口：管理员登录后，账号弹层主页多一个「管理员面板」按钮跳
  `admin.html`（直接输网址也能进）；非管理员看不到这个按钮
- 面板内容（一张桌面宽版表格 + 顶部生成区，样式沿用站的现有设计语言）：
  - 生成区：备注（发给谁）+ 张数（1–20），生成后新码带复制按钮直接可用
  - 列表：码（点击复制）、备注、状态徽章（未用/已占用/已激活/已作废）、
    生成时间、占用/激活的邮箱与时间；倒序（新的在上）
  - 每行作废按钮（已激活的行不显示），作废要确认一下
  - 管理端以桌面为准（站长自己用，不做移动端适配）
- `/api/auth/me` 返回体加 `admin` 标记，`js/account.js` 存进 state；
  账号弹层只在管理员登录时多渲染一个入口按钮，其余不动

## 7. 注册界面改动

- 注册表单加「邀请码」输入框：必填、`autocomplete="off"`、
  placeholder `K7M2-QF9W`，输入自动转大写
- 其他视图（登录/找回/重设/改密码）不动

## 8. 测试

- **tools/check-invite-core.js**（照 check-auth-core.js 的内存桩套路）：
  1. 无码注册 → 422 要邀请码
  2. 错码 / 已占用 / 已作废 → 422
  3. 好码注册 → 占码成功；同邮箱未验证重发 → 不再吃码
  4. verify → `activated_at` 落库；老账号（invite_id NULL）verify 不炸
  5. 第二个邮箱用同一张码 → 拒（含「占用后作废再试」→ 拒）
  6. 错码 5 次锁 15 分钟
  7. 管理接口：未登录 401、非 admin 403、admin 生成/列表/作废闭环、
     并发抢码（第二次 UPDATE changes=0）→ 422
- **浏览器冒烟**（上线前）：生成码 → 无痕窗口注册 → 收码验证 →
  后台看到「已激活」+ 邮箱；老账号登录同步一切照旧

## 9. 上线步骤（动正式库前先向站长确认）

1. schema.sql 增补（新表 + 两列），提交
2. `wrangler d1 execute <db> --remote`：建表 + 加列（先 PRAGMA 确认没加过）
   + 站长邮箱打 admin 标：`UPDATE users SET admin=1 WHERE email='25800712@qq.com'`
   （站长报的管理员账号；执行前先查库确认该邮箱存在且已验证）
3. 部署（现有 push 流程）
4. 浏览器冒烟走一遍
5. 生成首批 2–3 张码（P2 小范围开放用）

## 10. 明确不做（本期边界）

- 不做码的删除（只作废，保留全记录）
- 不做批量导入/导出、统计图表（列表本身就是监控）
- 不做注册开关配置（注册门槛=有码即开，无码即关，不需要开关）
- 不动登录 / 找回 / 同步的任何现有逻辑
