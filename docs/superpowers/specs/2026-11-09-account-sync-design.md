# 账号登录与云同步设计

日期：2026-11-09 · 状态：已上线（2026-11-10 部署：Resend 域名 mail.qingchejun.com、Pages 密钥 RESEND_API_KEY/SESSION_SECRET、远程 D1 建表完成；实施记录见 ../plans/2026-11-09-account-sync.md）

## 背景

数据存在浏览器 localStorage，按网址和设备隔离，换终端不同步。现居多终端使用，
需要账号 + 云端同步，且要把本机已有数据无损带入账号。

**微信登录不可行**（已核实）：微信开放平台「网站应用」需企业主体 + 300 元认证 +
ICP 备案的回调域名，本站域名在 Cloudflare 境外、个人无企业资质，走不通。
采用**邮箱 + 密码**，并按用户要求第一版就带**邮箱验证**和**密码找回**。

## 架构

- **Cloudflare Pages Functions**（仓库 `/functions` 目录，随现有 git 部署自动上线，
  不新增部署流程）+ **D1** SQLite（免费档）
- **邮件发送：Resend 免费档**（$0：3000 封/月、100 封/天、3 个自定义域名，2026-11-09
  查自 resend.com/pricing）。发件域用子域 `mail.qingchejun.com`，不碰博客主域信誉；
  发件人 `练习纸 <no-reply@mail.qingchejun.com>`
- 不登录完全照常可用；登录只影响同步

## 数据模型（D1）

- `users(id, email UNIQUE 小写, pw_hash, pw_salt, pwver, verified, created_at)`
  （pwver = 密码版本号，改密/重置后 +1，旧登录态随之失效）
- `data(user_id, key, value, updated_at)`，主键 `(user_id, key)`，key = `sumsum:*` 键名
- `tokens(token_hash, user_id, kind 'verify'|'reset', expires_at, used_at)`
  （验证码 6 位数字同样 hash 后存这张表）
- 无 session 表：登录态 = HMAC-SHA256 签名 Cookie
  （httpOnly、Secure、SameSite=Lax、90 天），密钥为环境变量 `SESSION_SECRET`

## API（同源 `/api`，无 CORS 需求）

- `POST /api/auth/register {email, password}` → 建号（未验证）+ 发验证码
- `POST /api/auth/verify {email, code}` → 验证通过 + 登录
- `POST /api/auth/login {email, password}` → 未验证则补发验证码并要求先验证
- `POST /api/auth/forgot {email}` → 发重设邮件（无论邮箱是否存在都返回 200，不泄露注册情况）
- `POST /api/auth/reset {token, password}` → 重设 + 登录
- `POST /api/auth/logout`、`GET /api/auth/me`
- `POST /api/auth/password {old, new}`（2026-11-10 加）→ 登录态 + 当前密码对得上才改；
  当前密码试错与登录共用 10 次锁 15 分钟；改完 pwver+1，其他设备登录态失效、
  当前浏览器拿新 cookie 继续用，且作废所有未用的重设链接与验证码
  （`reset` 成功后同样作废其余重设链接——泄漏的旧链接不能反杀）
- `GET /api/data` → 本人全部 key
- `POST /api/data/push {items:[{key, value, updated_at}]}` → 逐条 LWW；
  只接受 `sumsum:` 前缀、排除 `sumsum:help:seen`，服务端按 updated_at 新者胜

## 验证与找回

- 验证码 6 位数字，10 分钟有效，5 次填错作废；重发间隔 60 秒，每邮箱每小时最多 3 封
- 验证码输入体验（用户 2026-11-09 定）：6 个格子逐位输入，**填满第 6 位自动校验**，
  不需要再点「验证」按钮——对了自动进入下一步，错了当场提示并清空重输
- 重设 token 32 字节随机、库存 hash、一次性、30 分钟有效
- 重置密码后该账号所有旧登录态失效（会话校验 pwver）
- 登录失败按邮箱计数：10 次锁 15 分钟
- 邮件为中文纯文本，只说事，不带营销话术

## 同步策略

- **每键 LWW**（last-write-wins）：本机每次写 `sumsum:*` 记 mtime。
  新文件 `js/store.js` 统一收口 localStorage 写入，替换各模块直接 `setItem` 的调用点
  （约 8 处，机械替换，有 check 脚本兜底）；mtime 表存 `sumsum:sync:meta`
- 登录时：拉云端 → 逐键与本地 mtime 比，新者胜 → 写回本地并把结果回推云端
- 首次登录特例：
  - 云端为空且本地有数据 → 直接全部上传（这就是「导入本机已有数据」）
  - 两边都有且本机无 mtime（老数据）→ 弹确认，复用 `backup.describe` 列出两边摘要，用户选方向
- 推送：本地任意写入后防抖 2 秒批量推；拉取：每次打开页面时（已登录）
- 同步范围 = backup 的范围：`sumsum:*` 除 `help:seen`

## 安全

- 密码哈希两层（自审修正：Workers 免费档每次请求 CPU 约 10ms 上限，
  服务端跑 10 万次 PBKDF2 会超限，故慢哈希移到客户端）：
  浏览器 PBKDF2-SHA256 **60 万次迭代**（盐 = 邮箱小写 + 站点固定串，约半秒）
  → 服务端只做 **SHA-256**（每用户随机盐 + 客户端派生值）入库，微秒级
- 密码最小 8 位
- 除 `auth/*` 外所有接口校验会话；data 严格按 user_id 隔离
- CSRF 靠 SameSite=Lax + 改动仅 POST
- 登录鉴权类代码完成后过 security-reviewer（用户规则要求）

## 上线需用户配合的一次性操作（约 10 分钟，不花钱）

1. 注册 https://resend.com （免费）
2. 在 Resend 后台添加发件域名，拿到 DNS 记录（TXT/CNAME）
3. 把记录加到 Cloudflare 的 qingchejun.com DNS（与当年加 lianxizhi CNAME 同一后台；
   wrangler OAuth 无 DNS 写权限，必须手动）
4. 在 Resend 建 API 密钥交给开发 → 配成 Pages 环境变量 `RESEND_API_KEY`
   （不进代码、不进 Git）
- 另需环境变量 `SESSION_SECRET`（开发生成随机值）；D1 数据库与绑定由开发用 wrangler 配

## 测试

- 合并/LWW、token 生命周期、验证码限流等纯逻辑进 `tools/` 的 node 校验脚本（TDD）
- `wrangler pages dev` + 本地 D1 跑通注册 → 验证 → 登录 → 同步 → 找回全流程
- 上线后：无痕窗口实测注册与找回；iPad 实测两端同步

## 非目标

- 微信登录（不可行，见背景）
- 换邮箱（后续需要再加；改密码已于 2026-11-10 上线）
- 多孩子档案（一个账号 = 一个家庭）
