# 邀请码注册制 + 管理后台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 注册改为邀请码门槛（一码一人，注册时占用、验证激活），站长经独立管理面板 `admin.html` 生成/监控/作废邀请码。

**Architecture:** 纯逻辑收在 server/（auth-core 加注册门槛与激活，新增 admin-core），functions/ 只做 HTTP 翻译，D1 新增 invites 表 + users 两列（admin/invite_id）。前端 account-ui 注册框加码，管理面板是独立 noindex 页面。校验器 tools/check-invite-core.js 用内存桩 node 直跑，延续 check-auth-core.js 套路。

**Tech Stack:** Cloudflare Pages Functions + D1（ESM），前端原生 JS（ES5 风格 IIFE），无构建。

**Spec:** docs/superpowers/specs/2026-11-20-invite-code-design.md

## Global Constraints

- `js/` 前端一律 ES5 风格：`var`、IIFE、事件委托，无模块语法（对照 account-ui.js）
- `server/`、`functions/` 一律 ESM（`import`/`export`）
- 校验器 node 直跑、内存桩镜像 D1 语义、`check(name, cond)` 计数收尾；先红后绿
- 错误文案用 spec 原句（见各任务代码），中文标点
- admin.html 不进侧栏导航（rail.py 不动）、`<meta name="robots" content="noindex">`，不动任何现有页面 URL/title
- 提交信息 `<type>: <描述>`，结尾 `Co-Authored-By: Claude Code <noreply@anthropic.com>`
- **上线顺序：先迁移 D1、后部署代码**——旧代码容忍新列，新代码缺列会让注册 500
- 本会话 bash 可能被安全检查挡住：node/git/npx 命令请用户用 `!` 前缀代跑，Read/Edit/Write 工具正常用

---

### Task 1: 服务端注册门槛 + 激活

**Files:**
- Modify: `server/schema.sql`（invites 表 + users 新列内联；迁移语句见 Task 5）
- Modify: `server/repo-d1.js`（invites 七个方法 + insertUser 带 invite_id）
- Modify: `server/auth-core.js`（normInvite 导出、register 门槛、verify 激活）
- Test: `tools/check-invite-core.js`（新建）
- Test: `tools/check-auth-core.js`（适配：register 门槛上线后所有"新邮箱注册"用例要带码——行为按 spec 变更，测试跟随）

**Interfaces:**
- Consumes: 现有 `repo` 接口（auth-core 只认它）
- Produces: repo 新方法 `inviteInsert(v)` / `inviteGetByCode(code)` / `inviteGetById(id)` / `inviteClaim(id, uid, now)→bool` / `inviteActivate(id, now)` / `inviteRevoke(id, now)` / `invitesList()→[{*,claimed_email}]`；`A.normInvite(s)`；register body 多收 `invite`；verify 成功路径写 `activated_at`

- [ ] **Step 1: 写失败测试 tools/check-invite-core.js（注册侧）**

```js
/* 邀请码：注册门槛 / 占用激活。node 直跑。管理端用例在文件后半（Task 2 会扩）。 */
'use strict'

var ok = 0, bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) }
  else { bad++; console.log('✗', name, extra === undefined ? '' : JSON.stringify(extra)) }
}

/* --- 内存 repo：D1 语义的最小镜像（对照 repo-d1.js 手写，不 import 它） --- */
function memRepo() {
  var users = [], invites = [], tokens = [], limits = {}
  return {
    users: users, _invites: invites, _tokens: tokens,
    async userByEmail(e) { return users.find(function (u) { return u.email === e }) || null },
    async userById(id) { return users.find(function (u) { return u.id === id }) || null },
    async insertUser(u) { users.push(u) },
    async updateUser(id, f) { Object.assign(users.find(function (u) { return u.id === id }), f) },
    async setVerified(id) { users.find(function (u) { return u.id === id }).verified = 1 },
    async tokenInsert(t) { tokens.push(t) },
    async tokenListByUser(uid, kind) { return tokens.filter(function (t) { return t.user_id === uid && t.kind === kind }) },
    async tokenGet(h) { return tokens.find(function (t) { return t.token_hash === h }) || null },
    async tokenUse(h) { tokens.find(function (t) { return t.token_hash === h }).used_at = 1 },
    async tokensClear(uid, kind) { tokens.forEach(function (t) { if (t.user_id === uid && t.kind === kind) t.used_at = 1 }) },
    async limitGet(s, k) { return limits[s + '/' + k] || null },
    async limitSet(s, k, row) { limits[s + '/' + k] = row },
    async inviteInsert(v) { invites.push(v) },
    async inviteGetByCode(code) { return invites.find(function (v) { return v.code === code }) || null },
    async inviteGetById(id) { return invites.find(function (v) { return v.id === id }) || null },
    async inviteClaim(id, uid, now) {
      var v = invites.find(function (x) { return x.id === id })
      if (!v || v.claimed_by || v.revoked_at) return false
      v.claimed_by = uid; v.claimed_at = now
      return true
    },
    async inviteActivate(id, now) {
      var v = invites.find(function (x) { return x.id === id })
      if (v && !v.activated_at) v.activated_at = now
    },
    async inviteRevoke(id, now) {
      var v = invites.find(function (x) { return x.id === id })
      if (v && !v.revoked_at) v.revoked_at = now
    },
    async invitesList() {
      return invites.map(function (v) {
        var u = users.find(function (x) { return x.id === v.claimed_by })
        var c = {}
        for (var k in v) c[k] = v[k]
        c.claimed_email = u ? u.email : null
        return c
      }).sort(function (a, b) { return b.created_at - a.created_at })
    }
  }
}

function seedInvite(db, code) {
  var v = { id: 'inv-' + code, code: code, note: '', created_at: 1, revoked_at: null, claimed_by: null, claimed_at: null, activated_at: null }
  db._invites.push(v)
  return v
}
var clientHash = function (email, pw) {
  return require('crypto').pbkdf2Sync(pw, email + 'lianxizhi-account-v1', 1000, 32, 'sha256').toString('hex')
}

Promise.all([import('../server/auth-core.js')]).then(async function (mods) {
  var A = mods[0]
  var now = 1700000000000

  /* --- 注册门槛 --- */
  var db = memRepo()
  seedInvite(db, 'GOODCODE')
  check('无邀请码 422', (await A.register(db, now, { email: 'a@b.co', password: clientHash('a@b.co', 'password123') })).status === 422)
  var wrong = await A.register(db, now, { email: 'a@b.co', password: clientHash('a@b.co', 'password123'), invite: 'NOPE1234' })
  check('错码 422 且不发邮件', wrong.status === 422 && !wrong.mail, wrong)
  var good = await A.register(db, now, { email: 'a@b.co', password: clientHash('a@b.co', 'password123'), invite: 'good-code ' })
  check('好码注册成功（小写/横线/空格规范化）', good.status === 200 && good.mail, good)
  check('码被占用 + 用户绑码', db._invites[0].claimed_by === db.users[0].id && db.users[0].invite_id === 'inv-GOODCODE')
  var again = await A.register(db, now + 61 * 1000, { email: 'a@b.co', password: clientHash('a@b.co', 'password123') })
  check('未验证重发不再要码不换码', again.status === 200 && db._invites.length === 1 && db._invites[0].claimed_by === db.users[0].id, again)
  check('一码第二邮箱 422', (await A.register(db, now + 62 * 1000, { email: 'x@y.co', password: clientHash('x@y.co', 'password123'), invite: 'GOODCODE' })).status === 422)

  /* --- 验证即激活 --- */
  await A.verify(db, now + 63 * 1000, { email: 'a@b.co', code: good.dev.code })
  check('验证即激活', db._invites[0].activated_at === now + 63 * 1000)

  /* --- 老账号（invite_id 为 null）verify 不炸 --- */
  var db2 = memRepo()
  seedInvite(db2, 'OLDTEST1')
  var reg2 = await A.register(db2, now, { email: 'old@m.co', password: clientHash('old@m.co', 'password123'), invite: 'OLDTEST1' })
  db2.users[0].invite_id = null /* 改造成老账号形态 */
  var lg = await A.login(db2, now + 61 * 1000, { email: 'old@m.co', password: clientHash('old@m.co', 'password123') })
  check('老账号未验证登录补码', lg.status === 200 && lg.body.need_verify, lg)
  check('老账号 verify 正常', (await A.verify(db2, now + 62 * 1000, { email: 'old@m.co', code: lg.dev.code })).status === 200)

  /* --- 作废 --- */
  var dbR = memRepo()
  var rv = seedInvite(dbR, 'REVOKED1')
  rv.revoked_at = 1
  check('已作废 422', (await A.register(dbR, now, { email: 'a@b.co', password: clientHash('a@b.co', 'password123'), invite: 'REVOKED1' })).status === 422)

  /* --- 错码 5 次锁 15 分钟 --- */
  var dbF = memRepo()
  seedInvite(dbF, 'FRESHONE')
  for (var i = 0; i < 5; i++) {
    await A.register(dbF, now + i, { email: 'f@m.co', password: clientHash('f@m.co', 'password123'), invite: 'WRONG00' + i })
  }
  check('错 5 次后好码也锁', (await A.register(dbF, now + 10, { email: 'f@m.co', password: clientHash('f@m.co', 'password123'), invite: 'FRESHONE' })).status === 429)
  check('15 分钟后好码能用', (await A.register(dbF, now + 15 * 60 * 1000 + 20, { email: 'f@m.co', password: clientHash('f@m.co', 'password123'), invite: 'FRESHONE' })).status === 200)

  /* --- 原子占码：第二个 claim 必须失败 --- */
  var dbC = memRepo()
  seedInvite(dbC, 'RACETEST')
  check('原子占码第二个失败', (await dbC.inviteClaim('inv-RACETEST', 'u-a', 1)) === true && (await dbC.inviteClaim('inv-RACETEST', 'u-b', 2)) === false)

  console.log(bad ? '---- 有 ' + bad + ' 条没过' : '✓ invite 注册侧全部通过')
  process.exit(bad ? 1 : 0)
}).catch(function (e) { console.error(e); process.exit(1) })
```

- [ ] **Step 2: 跑红**

Run: `node tools/check-invite-core.js`
Expected: FAIL——`register` 不认 invite（无码也 200），大量 ✗，exit 1

- [ ] **Step 3: schema.sql 增补**

在 `server/schema.sql` 末尾追加（users 的 CREATE TABLE 同步加两列，作为新库安装定义；已存在库的迁移 SQL 在 Task 5）：

```sql
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
```

users 的 CREATE TABLE 改为（列加在 created_at 前）：

```sql
CREATE TABLE IF NOT EXISTS users(
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  pwver INTEGER NOT NULL DEFAULT 1,
  verified INTEGER NOT NULL DEFAULT 0,
  admin INTEGER NOT NULL DEFAULT 0,
  invite_id TEXT,
  created_at INTEGER NOT NULL
);
```

文件头加注释：`-- 已存在库的增量迁移见 tools/migrate-20261120-invites.sql（Task 5，只跑一次）`

- [ ] **Step 4: repo-d1.js 加方法**

`insertUser` 改为（invite_id 可空）：

```js
    async insertUser(u) {
      await db.prepare('INSERT INTO users(id,email,pw_hash,pw_salt,pwver,verified,admin,invite_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)')
        .bind(u.id, u.email, u.pw_hash, u.pw_salt, u.pwver, u.verified || 0, u.admin || 0, u.invite_id || null, u.created_at).run()
    },
```

在 `dataUpsert` 之前（tokens/limits 方法之后）插入：

```js
    async inviteInsert(v) {
      await db.prepare('INSERT INTO invites(id,code,note,created_at) VALUES(?,?,?,?)')
        .bind(v.id, v.code, v.note, v.created_at).run()
    },
    async inviteGetByCode(code) {
      return (await db.prepare('SELECT * FROM invites WHERE code=?').bind(code).first()) || null
    },
    async inviteGetById(id) {
      return (await db.prepare('SELECT * FROM invites WHERE id=?').bind(id).first()) || null
    },
    async inviteClaim(id, uid, now) {
      const r = await db.prepare(
        'UPDATE invites SET claimed_by=?, claimed_at=? WHERE id=? AND claimed_by IS NULL AND revoked_at IS NULL'
      ).bind(uid, now, id).run()
      return !!(r.meta && r.meta.changes > 0)
    },
    async inviteActivate(id, now) {
      await db.prepare('UPDATE invites SET activated_at=? WHERE id=? AND activated_at IS NULL').bind(now, id).run()
    },
    async inviteRevoke(id, now) {
      await db.prepare('UPDATE invites SET revoked_at=? WHERE id=? AND revoked_at IS NULL').bind(now, id).run()
    },
    async invitesList() {
      const r = await db.prepare(
        'SELECT i.*, u.email AS claimed_email FROM invites i LEFT JOIN users u ON u.id=i.claimed_by ORDER BY i.created_at DESC'
      ).all()
      return r.results || []
    },
```

- [ ] **Step 5: auth-core.js 改 register + verify**

文件头常量区后加（`normEmail` 旁边）：

```js
export function normInvite(s) {
  return typeof s === 'string' ? s.toUpperCase().replace(/[^A-Z0-9]/g, '') : ''
}
```

`register` 整体替换为：

```js
/* ---- 注册（邀请码门槛：先验码再发邮件，不浪费 Resend 额度） ---- */
const INVITE_MAX_FAILS = 5
const INVITE_LOCK_MS = 15 * 60 * 1000

export async function register(repo, now, body) {
  const email = normEmail(body && body.email)
  const pw = (body && body.password) || ''
  if (!validEmail(email)) return { status: 422, body: { ok: false, error: '邮箱地址看起来不对。' } }
  if (!validClientHash(pw)) return { status: 422, body: { ok: false, error: '密码至少 8 位。' } }
  let user = await repo.userByEmail(email)
  if (user && user.verified) return { status: 409, body: { ok: false, error: '这个邮箱已经注册过了，直接登录就行。' } }
  if (user) {
    /* 未验证过的邮箱重复注册 = 换密码重来（裁定 5）；码已绑在这个邮箱上，不再要 */
    await repo.updateUser(user.id, { pw_hash: await sha256hex(user.pw_salt + pw) })
  } else {
    const code = normInvite(body && body.invite)
    if (!code) return { status: 422, body: { ok: false, error: '现在需要邀请码才能注册。' } }
    const fails = await repo.limitGet(email, 'invitefail')
    if (fails && fails.until > now) return { status: 429, body: { ok: false, error: '邀请码错得太多，等 15 分钟再试。' } }
    const inv = await repo.inviteGetByCode(code)
    if (!inv || inv.revoked_at || inv.claimed_by) {
      const n = (fails ? fails.n : 0) + 1
      await repo.limitSet(email, 'invitefail', { n: n, ts: now, until: n >= INVITE_MAX_FAILS ? now + INVITE_LOCK_MS : 0 })
      return { status: 422, body: { ok: false, error: '邀请码不对，找邀请你的人核对一下。' } }
    }
    const id = crypto.randomUUID()
    /* 占码在插用户之前：宁可"码占住没用户"（站长作废即可），不可"两个用户抢一张码" */
    if (!(await repo.inviteClaim(inv.id, id, now))) {
      return { status: 422, body: { ok: false, error: '邀请码不对，找邀请你的人核对一下。' } }
    }
    const pw_salt = randomHex(16)
    await repo.insertUser({
      id: id, email: email,
      pw_hash: await sha256hex(pw_salt + pw), pw_salt: pw_salt,
      pwver: 1, verified: 0, created_at: now, invite_id: inv.id
    })
  }
  return issueCode(repo, await repo.userByEmail(email), now)
}
```

`verify` 里 `await repo.setVerified(user.id)` 之后加一行：

```js
      if (user.invite_id) await repo.inviteActivate(user.invite_id, now) /* 老账号 invite_id 为 null，不动 */
```

- [ ] **Step 6: 跑绿**

Run: `node tools/check-invite-core.js`
Expected: `✓ invite 注册侧全部通过`，exit 0

- [ ] **Step 7: 适配 check-auth-core.js**

1. memRepo 的 `insertUser` 后补 invites 支持（把 Task 1 Step 1 里 memRepo 的 `inviteInsert`/`inviteGetByCode`/`inviteGetById`/`inviteClaim`/`inviteActivate`/`inviteRevoke`/`invitesList` 和 `var invites = []`、`_invites: invites` 抄进去——两份桩各自独立维护，互为对照）
2. 文件加 `seedInvite` 辅助（同 Step 1）
3. 九处"新邮箱首次 register"调用加码。例（其余同理，各自换不同的码字符串）：

```js
seedInvite(db, 'TAAAAA1')
var r = await A.register(db, now, { email: 'A@B.CO ', password: clientHash('a@b.co', 'password123'), invite: 'TAAAAA1' })
```

涉及：`db`(a@b.co)、`db2`(c@d.co)、`db3`(e@f.co)、`dbL`(l@m.co)、`dbK`(k@m.co)、`dbV`(v@m.co)、`dbF`(f@m.co)、`dbC`(c@m.co)、`dbC2`(c2@m.co) 九个桩；直接 `dbQ.users.push`/`dbR.users.push` 的两处不经 register，不用动

- [ ] **Step 8: 双校验器全绿**

Run: `node tools/check-invite-core.js && node tools/check-auth-core.js`
Expected: 两个文件各自「✓ …全部通过」，exit 0

- [ ] **Step 9: Commit**

```bash
git add server/schema.sql server/repo-d1.js server/auth-core.js tools/check-invite-core.js tools/check-auth-core.js
git commit -m "feat: 注册加邀请码门槛——一码一人、注册时占用、验证即激活" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: 管理端核心 + HTTP 接口

**Files:**
- Create: `server/admin-core.js`
- Create: `functions/api/admin/invites/index.js`（GET 列表 / POST 生成）
- Create: `functions/api/admin/invites/revoke.js`（POST 作废）
- Test: `tools/check-invite-core.js`（文件末尾追加管理端用例）

**Interfaces:**
- Consumes: Task 1 的 repo 七方法；`requireSession`（server/session.js）
- Produces: `createInvites(repo, session, now, body)` / `listInvites(repo, session)` / `revokeInvite(repo, session, now, body)`，返回 `{status, body}`；HTTP 路由 `GET|POST /api/admin/invites`、`POST /api/admin/invites/revoke`

- [ ] **Step 1: 追加失败测试（check-invite-core.js 的 import 行与收尾之间插一段）**

import 行改为同时加载 admin-core：

```js
Promise.all([import('../server/auth-core.js'), import('../server/admin-core.js')]).then(async function (mods) {
  var A = mods[0], AD = mods[1]
```

`console.log` 收尾行之前插入：

```js
  /* ===== 管理端 ===== */
  var dbA = memRepo()
  dbA.users.push({ id: 'boss', email: 'boss@m.co', pw_hash: 'x', pw_salt: 's', pwver: 1, verified: 1, admin: 1 })
  dbA.users.push({ id: 'pleb', email: 'pleb@m.co', pw_hash: 'x', pw_salt: 's', pwver: 1, verified: 1, admin: 0 })
  check('管理端未登录 401', (await AD.listInvites(dbA, null)).status === 401)
  check('管理端非管理员 403', (await AD.listInvites(dbA, { uid: 'pleb' })).status === 403)

  var mk = await AD.createInvites(dbA, { uid: 'boss' }, now, { note: '张三家长', count: 3 })
  check('批量生成 3 张', mk.status === 200 && mk.body.invites.length === 3, mk)
  check('码格式 8 位限定字母表（无 I/L/O/0/1）', mk.body.invites.every(function (v) { return /^[A-HJKMNP-Z2-9]{8}$/.test(v.code) }), mk.body.invites)
  check('备注落库', dbA._invites.slice(-3).every(function (v) { return v.note === '张三家长' }))
  check('count 钳到 20', (await AD.createInvites(dbA, { uid: 'boss' }, now, { note: 'x', count: 99 })).body.invites.length === 20)

  var regA = await A.register(dbA, now, { email: 'z@san.co', password: clientHash('z@san.co', 'password123'), invite: dbA._invites[0].code })
  await A.verify(dbA, now + 1, { email: 'z@san.co', code: regA.dev.code })
  var ls2 = await AD.listInvites(dbA, { uid: 'boss' })
  var used = ls2.body.invites.find(function (v) { return v.claimed_email === 'z@san.co' })
  check('激活后状态+邮箱带出', used && used.state === 'activated', ls2.body.invites)

  /* 桩行是原始字段（无 state——state 由 admin-core 的 fmt 算），挑没用过的码用原始字段判 */
  var otherId = dbA._invites.find(function (v) { return !v.revoked_at && !v.activated_at && !v.claimed_by }).id
  check('作废成功', (await AD.revokeInvite(dbA, { uid: 'boss' }, now + 2, { id: otherId })).status === 200)
  check('作废后该码注册被拒', (await A.register(dbA, now + 3, { email: 'w@u.co', password: clientHash('w@u.co', 'password123'), invite: dbA._invites.find(function (v) { return v.id === otherId }).code })).status === 422)
  check('作废不存在的码 404', (await AD.revokeInvite(dbA, { uid: 'boss' }, now + 4, { id: 'ghost' })).status === 404)
```

- [ ] **Step 2: 跑红**

Run: `node tools/check-invite-core.js`
Expected: FAIL——admin-core 模块不存在，import 报错 exit 1

- [ ] **Step 3: 写 server/admin-core.js（整文件）**

```js
/**
 * 邀请码管理端：纯逻辑 + 传入 repo，不碰 fetch/Response。
 * functions/api/admin/* 只做 HTTP 翻译；可测部分 node 直跑（tools/check-invite-core.js）。
 * 门槛 = requireSession 之后再查 users.admin（页面挡体验，这里挡安全）。
 */

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' /* 31 字符：去 I/L/O/0/1 */

function genCode() {
  const b = new Uint8Array(8)
  crypto.getRandomValues(b)
  return [...b].map(x => CODE_ALPHABET[x % CODE_ALPHABET.length]).join('')
}

async function requireAdmin(repo, session) {
  if (!session) return { status: 401, body: { ok: false, error: '先登录。' } }
  const user = await repo.userById(session.uid)
  if (!user || !user.admin) return { status: 403, body: { ok: false, error: '无权访问。' } }
  return null
}

function fmt(v) {
  return {
    id: v.id, code: v.code, note: v.note,
    state: v.revoked_at ? 'revoked' : v.activated_at ? 'activated' : v.claimed_by ? 'claimed' : 'unused',
    created_at: v.created_at, revoked_at: v.revoked_at || null,
    claimed_at: v.claimed_at || null, claimed_email: v.claimed_email || null,
    activated_at: v.activated_at || null
  }
}

export async function listInvites(repo, session) {
  const gate = await requireAdmin(repo, session)
  if (gate) return gate
  return { status: 200, body: { ok: true, invites: (await repo.invitesList()).map(fmt) } }
}

export async function createInvites(repo, session, now, body) {
  const gate = await requireAdmin(repo, session)
  if (gate) return gate
  const note = String((body && body.note) || '').slice(0, 100)
  const count = Math.max(1, Math.min(20, parseInt(body && body.count, 10) || 1))
  const made = []
  for (let i = 0; i < count; i++) {
    for (let t = 0; t < 10; t++) { /* UNIQUE 撞了就重生成（31^8 空间，防御性） */
      const code = genCode()
      if (await repo.inviteGetByCode(code)) continue
      const v = { id: crypto.randomUUID(), code: code, note: note, created_at: now }
      await repo.inviteInsert(v)
      made.push(v)
      break
    }
  }
  return { status: 200, body: { ok: true, invites: made.map(fmt) } }
}

export async function revokeInvite(repo, session, now, body) {
  const gate = await requireAdmin(repo, session)
  if (gate) return gate
  const id = (body && body.id) || ''
  if (!id) return { status: 422, body: { ok: false, error: '缺少邀请码 id。' } }
  const inv = await repo.inviteGetById(id)
  if (!inv) return { status: 404, body: { ok: false, error: '没有这张码。' } }
  await repo.inviteRevoke(id, now)
  return { status: 200, body: { ok: true } }
}
```

- [ ] **Step 4: 写两个 HTTP wrapper**

`functions/api/admin/invites/index.js`：

```js
import { readBody, respond } from '../../../../server/http.js'
import { repo } from '../../../../server/repo-d1.js'
import { listInvites, createInvites } from '../../../../server/admin-core.js'
import { requireSession } from '../../../../server/session.js'

export async function onRequestGet(context) {
  return respond(context, await listInvites(repo(context.env.DB), await requireSession(context)))
}

export async function onRequestPost(context) {
  return respond(context, await createInvites(repo(context.env.DB), await requireSession(context), Date.now(), await readBody(context.request)))
}
```

`functions/api/admin/invites/revoke.js`：

```js
import { readBody, respond } from '../../../../server/http.js'
import { repo } from '../../../../server/repo-d1.js'
import { revokeInvite } from '../../../../server/admin-core.js'
import { requireSession } from '../../../../server/session.js'

export async function onRequestPost(context) {
  return respond(context, await revokeInvite(repo(context.env.DB), await requireSession(context), Date.now(), await readBody(context.request)))
}
```

（写完对照 `functions/api/auth/register.js` 与 `functions/api/data/index.js` 确认相对层级：admin/invites/index.js 比 auth/register.js 深两层，`../../../../`）

- [ ] **Step 5: 跑绿**

Run: `node tools/check-invite-core.js && node tools/check-auth-core.js`
Expected: 全部通过，exit 0

- [ ] **Step 6: Commit**

```bash
git add server/admin-core.js functions/api/admin/ tools/check-invite-core.js
git commit -m "feat: 邀请码管理端——生成/列表/作废 + 管理员接口门槛" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: admin 身份贯通 + 前端注册框

**Files:**
- Modify: `server/auth-core.js`（meBySession/login/verify/reset/changePassword 的 200 body 带 `admin`）
- Modify: `js/account.js`（state.admin、setLogin 带 admin）
- Modify: `js/account-ui.js`（注册表单加邀请码框、请求带 invite、成功登录处传 admin、管理员入口按钮）

**Interfaces:**
- Consumes: Task 1/2 的服务端；`/api/auth/me` body.admin
- Produces: `A.state.admin`（bool）；`A.setLogin(email, admin?)`；登录成功响应 body 均含 `admin: 0|1`

- [ ] **Step 1: auth-core 五处 200 body 加 admin**

```js
/* meBySession 末行改为 */
  return { status: 200, body: { ok: true, email: user.email, verified: !!user.verified, admin: !!user.admin } }
```

`login` 验证通过的 return、`verify` 成功的 return、`reset` 成功的 return、`changePassword` 成功的 return，body 里各加一项 `admin: !!user.admin`（changePassword 的 user 变量已在手；login/verify/reset 同理，注意 reset 里 user 是 token 查出来的原行——够用）。

- [ ] **Step 2: js/account.js**

```js
var state = { loggedIn: false, email: '', admin: false }
function setLogin(email, admin) {
  state.loggedIn = !!email
  state.email = email || ''
  state.admin = !!email && !!admin
  listeners.forEach(function (fn) { fn(state) })
}
```

`init` 里：`if (r.status === 200 && r.body.ok) setLogin(r.body.email, r.body.admin)`

- [ ] **Step 3: js/account-ui.js**

注册表单（forms.register.html）密码 label 之后加：

```js
'<label>邀请码<input type="text" name="invite" required autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="K7M2-QF9W"></label>' +
```

onSubmit 的 register 分支，请求体带上码（服务端规范化大小写/横线/空格）：

```js
var r = await A.request('/api/auth/register', { email: email, password: hash, invite: fd.get('invite') || '' })
```

三处登录成功改传 admin：`submitCode` 里 `A.setLogin(email)` → `A.setLogin(email, r.body.admin)`；login 分支 `A.setLogin(email)` → `A.setLogin(email, rl.body.admin)`；reset 分支 → `A.setLogin(email, rr.body.admin)`。

已登录主页（render 的 loggedIn 分支）按钮行前面加：

```js
(A.state.admin ? '<div class="account-row"><a class="btn" href="admin.html">管理员面板</a></div>' : '') +
```

- [ ] **Step 4: 回归**

Run: `node tools/check-invite-core.js && node tools/check-auth-core.js`
Expected: 全部通过（服务端只加字段，不破坏断言）

手动（用户开无痕窗口）：注册表单出现「邀请码」框；不填码提交 → 「现在需要邀请码才能注册。」

- [ ] **Step 5: Commit**

```bash
git add server/auth-core.js js/account.js js/account-ui.js
git commit -m "feat: 登录响应带 admin 标记，注册表单加邀请码框" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: 管理面板页 admin.html

**Files:**
- Create: `admin.html`（noindex，不进侧栏；rail.py 不动）
- Create: `js/admin-main.js`（ES5 IIFE，风格对照 account-ui.js）
- Create: `css/admin.css`（桌面版，无渐变无 emoji）

**Interfaces:**
- Consumes: `/api/auth/me`（admin 标记）、Task 2 三个管理接口
- Produces: 独立页面；复制到剪贴板的码格式 `XXXX-XXXX`

- [ ] **Step 1: admin.html（整文件）**

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>练习纸 · 邀请码管理</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✏️</text></svg>" />
  <link rel="stylesheet" href="css/app.css" />
  <link rel="stylesheet" href="css/admin.css" />
</head>
<body>
  <main class="admin">
    <header class="admin-head">
      <h1>邀请码管理</h1>
      <a class="admin-back" href="index.html">← 回练习纸</a>
    </header>
    <div id="admin-root"><p class="admin-note">正在检查权限…</p></div>
  </main>
  <script src="js/admin-main.js"></script>
</body>
</html>
```

- [ ] **Step 2: js/admin-main.js（整文件）**

```js
/**
 * 管理员面板（admin.html）：进门 /api/auth/me——未登录提示回首页登录，
 * 非管理员显示无权访问。真门闩在服务端（requireSession + users.admin），
 * 页面挡的是体验。生成 / 列表 / 作废 / 一键复制。仅站长用，桌面版。
 */
;(function (root) {
  'use strict'
  var doc = root.document
  var invites = []

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function fmtTime(ms) {
    if (!ms) return '—'
    var d = new Date(ms)
    var p = function (n) { return (n < 10 ? '0' : '') + n }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
  }
  function displayCode(c) { return c.slice(0, 4) + '-' + c.slice(4) }
  var STATE_LABEL = { unused: '未用', claimed: '已占用', activated: '已激活', revoked: '已作废' }

  async function api(path, body) {
    var r = await root.fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    var data = {}
    try { data = await r.json() } catch (e) {}
    return { status: r.status, body: data }
  }

  function rowHTML(v) {
    return '<tr>' +
      '<td><button type="button" class="admin-code" data-copy="' + esc(v.code) + '" title="点击复制">' + esc(displayCode(v.code)) + '</button></td>' +
      '<td>' + esc(v.note || '') + '</td>' +
      '<td><span class="badge badge-' + esc(v.state) + '">' + (STATE_LABEL[v.state] || v.state) + '</span></td>' +
      '<td>' + fmtTime(v.created_at) + '</td>' +
      '<td>' + (v.claimed_email ? esc(v.claimed_email) + '<br><small>' + fmtTime(v.claimed_at) + '</small>' : '—') + '</td>' +
      '<td>' + (v.activated_at ? fmtTime(v.activated_at) : '—') + '</td>' +
      '<td>' + ((v.state === 'activated' || v.state === 'revoked') ? '' :
        '<button type="button" class="admin-btn admin-btn-danger" data-revoke="' + esc(v.id) + '">作废</button>') + '</td>' +
      '</tr>'
  }

  function render() {
    var el = doc.getElementById('admin-root')
    el.innerHTML =
      '<form class="admin-form" id="admin-create">' +
        '<input type="text" name="note" placeholder="备注：发给谁（如 张三妈妈）" maxlength="100">' +
        '<select name="count"><option value="1">1 张</option><option value="2">2 张</option><option value="3">3 张</option><option value="5">5 张</option><option value="10">10 张</option><option value="20">20 张</option></select>' +
        '<button type="submit" class="admin-btn admin-btn-primary">生成</button>' +
      '</form>' +
      '<table class="admin-table"><thead><tr>' +
        '<th>邀请码</th><th>备注</th><th>状态</th><th>生成时间</th><th>占用（邮箱/时间）</th><th>激活时间</th><th></th>' +
      '</tr></thead><tbody>' +
      (invites.length ? invites.map(rowHTML).join('') : '<tr><td colspan="7" class="admin-note">还没有邀请码，先生成几张。</td></tr>') +
      '</tbody></table>'
    doc.getElementById('admin-create').addEventListener('submit', onCreate)
  }

  async function load() {
    var r = await api('/api/admin/invites')
    if (r.status !== 200) {
      doc.getElementById('admin-root').innerHTML = '<p class="admin-note">' + esc(r.body.error || '列表没拉到，刷新试试。') + '</p>'
      return
    }
    invites = r.body.invites || []
    render()
  }

  async function onCreate(e) {
    e.preventDefault()
    var f = e.target
    var r = await api('/api/admin/invites', { note: f.note.value.trim(), count: parseInt(f.count.value, 10) || 1 })
    if (r.status !== 200) { root.alert(r.body.error || '没生成成功，稍后再试。'); return }
    await load()
  }

  async function doRevoke(id) {
    var r = await api('/api/admin/invites/revoke', { id: id })
    if (r.status !== 200) { root.alert(r.body.error || '没作废成功，稍后再试。'); return }
    await load()
  }

  function onRootClick(e) {
    var cp = e.target.closest('[data-copy]')
    if (cp) {
      root.navigator.clipboard.writeText(displayCode(cp.dataset.copy))
      var old = cp.textContent
      cp.textContent = '已复制 ✓'
      setTimeout(function () { cp.textContent = old }, 1200)
      return
    }
    var rv = e.target.closest('[data-revoke]')
    if (rv && root.confirm('作废后这张码就再也没人能用了，确定？')) doRevoke(rv.dataset.revoke)
  }

  async function boot() {
    var r = await api('/api/auth/me')
    var el = doc.getElementById('admin-root')
    if (r.status !== 200 || !r.body.ok) {
      el.innerHTML = '<p class="admin-note">请先回<a href="index.html">首页</a>登录站长账号，再打开这个页面。</p>'
      return
    }
    if (!r.body.admin) {
      el.innerHTML = '<p class="admin-note">这个页面只有管理员能看。</p>'
      return
    }
    el.addEventListener('click', onRootClick)
    await load()
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot)
  else boot()
})(window)
```

- [ ] **Step 3: css/admin.css（整文件）**

```css
/* 管理员面板（admin.html）：仅站长使用，桌面版；不依赖 app.css 布局类，只借它的基础字体。 */
.admin { max-width: 900px; margin: 0 auto; padding: 36px 20px 60px; }
.admin-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 24px; }
.admin-head h1 { font-size: 22px; margin: 0; }
.admin-back { color: #666; text-decoration: none; font-size: 14px; }
.admin-back:hover { color: #111; }
.admin-note { color: #666; font-size: 14px; line-height: 1.8; }
.admin-note a { color: inherit; }
.admin-form { display: flex; gap: 10px; align-items: center; margin-bottom: 22px; flex-wrap: wrap; }
.admin-form input[type="text"] { width: 260px; padding: 7px 10px; border: 1px solid #cfd3d8; border-radius: 6px; font-size: 14px; }
.admin-form select { padding: 7px 8px; border: 1px solid #cfd3d8; border-radius: 6px; font-size: 14px; background: #fff; }
.admin-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.admin-table th, .admin-table td { border-bottom: 1px solid #e3e5e8; padding: 9px 10px; text-align: left; vertical-align: top; }
.admin-table th { color: #666; font-weight: 500; font-size: 13px; white-space: nowrap; }
.admin-table td small { color: #888; }
.admin-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 15px; letter-spacing: .5px; background: none; border: none; padding: 0; cursor: pointer; color: inherit; }
.admin-code:hover { text-decoration: underline; }
.badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 12px; white-space: nowrap; }
.badge-unused { background: #eef0f2; color: #555; }
.badge-claimed { background: #fdf3e0; color: #9a6b00; }
.badge-activated { background: #e8f3e8; color: #2f7d32; }
.badge-revoked { background: #f6e8e8; color: #a04343; }
.admin-btn { border: 1px solid #cfd3d8; background: #fff; border-radius: 6px; padding: 6px 14px; font-size: 13px; cursor: pointer; }
.admin-btn:hover { background: #f5f6f7; }
.admin-btn-primary { border-color: #2b6cb0; color: #2b6cb0; }
.admin-btn-primary:hover { background: #f0f6fc; }
.admin-btn-danger:hover { background: #fbf0f0; border-color: #d8b0b0; }
```

- [ ] **Step 4: 手动验证（用户浏览器）**

部署前的本地没法跑 Functions——本任务验证顺延到 Task 5 冒烟一起做（面板依赖线上接口）。本地只检查：admin.html 打开显示「正在检查权限…」随后 me 401 →「请先回首页登录」文案（用 `python3 -m http.server` 或直接 file:// 会因 fetch 相对路径受限——直接线上验证即可，file:// 可跳过）。

- [ ] **Step 5: Commit**

```bash
git add admin.html js/admin-main.js css/admin.css
git commit -m "feat: 管理员面板页面——生成/列表/作废/一键复制邀请码" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: 迁移 + 部署 + 冒烟（用户门：动正式库、上线都要先确认）

**Files:**
- Create: `tools/migrate-20261120-invites.sql`（一次性迁移，跑完保留作案记录）
- 无代码改动

**Interfaces:**
- Consumes: Task 1–4 全部成果
- Produces: 线上邀请码注册制生效

- [ ] **Step 1: 写迁移文件 tools/migrate-20261120-invites.sql**

```sql
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
```

- [ ] **Step 2: 向站长确认后执行迁移（顺序：先迁移后部署）**

先查列确认没加过：`wrangler d1 execute lianxizhi --remote --command "PRAGMA table_info(users)" --json`
（应只有 7 列：id/email/pw_hash/pw_salt/pwver/verified/created_at）

执行（用户跑或已授权后执行）：

```bash
wrangler d1 execute lianxizhi --remote --file=tools/migrate-20261120-invites.sql
```

验证：`wrangler d1 execute lianxizhi --remote --command "SELECT email, admin FROM users" --json` → 25800712@qq.com 的 admin=1

- [ ] **Step 3: 部署**

`git push`（Cloudflare Pages 自动部署）——push 前向站长确认。

- [ ] **Step 4: 冒烟（浏览器，无痕窗口）**

1. 站长登录 → 账号弹窗出现「管理员面板」按钮 → 进面板生成 1 张码（备注「冒烟测试」）
2. 无痕窗口：注册新邮箱 + 刚生成的码 → 收验证邮件 → 验证 → 登录成功
3. 回面板刷新：该码状态「已激活」、邮箱正确
4. 无码注册 → 「现在需要邀请码才能注册。」；老账号（站长）登录一切照旧
5. 冒烟用的测试码在面板作废掉

- [ ] **Step 5: Commit 迁移文件**

```bash
git add tools/migrate-20261120-invites.sql
git commit -m "chore: 邀请码 D1 一次性迁移脚本（已执行记录）" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Self-Review 记录

- **Spec 覆盖**：§2 状态机→Task 1/2；§3 数据库→Task 1 Step 3/4 + Task 5；§4 注册门槛→Task 1；§5 激活→Task 1；§6 接口→Task 2、界面→Task 4、入口按钮→Task 3；§7 注册框→Task 3；§8 测试→Task 1/2 校验器 + Task 5 冒烟；§9 上线→Task 5。无缺口
- **占位符**：无 TBD/TODO；所有代码块完整
- **类型一致**：repo 方法名在 Task 1（定义）与 Task 2（消费）一致；`fmt().state` 四值与 admin-main.js 的 STATE_LABEL 键一致；`setLogin(email, admin)` 签名前后一致
- 已知取舍（spec §3 已记）：码明文入库；占码先于插用户
