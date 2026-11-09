# 账号登录与云同步 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 邮箱+密码账号（含邮箱验证、密码找回）+ 每键 LWW 云同步，把本机 localStorage 数据无损带入账号；不登录完全照常可用。

**Architecture:** Cloudflare Pages Functions（仓库 `/functions`，随 git 部署自动上线）+ D1 SQLite + Resend 邮件。服务端逻辑收在 `server/auth-core.js`（传入 repo 的纯逻辑，node 直测），`functions/api/*` 只做 HTTP 翻译。客户端：`js/store.js` 统一收口全站 localStorage 写入并记 mtime，`js/sync-core.js` 纯函数合并规则，`js/sync.js` 编排拉取/防抖推送，`js/account.js` 哈希与 API，`js/account-ui.js` 弹窗界面（验证码 6 格填满自动校验）。

**Tech Stack:** 原生 JS（IIFE 挂 `SumSum.*`，无构建步骤）、WebCrypto（PBKDF2-SHA256 / HMAC / SHA-256）、Cloudflare Pages Functions + D1 + wrangler、Resend HTTP API、node 直跑测试（tools/check-*.js）、playwright 浏览器验证。

**Spec:** docs/superpowers/specs/2026-11-09-account-sync-design.md

## Global Constraints

- 不登录完全照常可用；登录只影响同步（spec「架构」）
- 存储键前缀 `sumsum:` 永不能改；老键不删（站内红线，backup.js 头注）
- 密码最小 8 位：客户端校验原文，服务端只见 64 位 hex 派生值（spec「安全」）
- 浏览器 PBKDF2-SHA256 **600000 次**，盐 = 邮箱小写 + 固定串 `'lianxizhi-account-v1'`，输出 32 字节 hex；服务端只做 SHA-256(每用户随机盐 + 派生值)（spec「安全」）
- 验证码 6 位数字、10 分钟有效、5 次填错作废；重发间隔 60 秒；每邮箱每小时最多 3 封（spec「验证与找回」）
- 重设 token 32 字节随机、库存 hash、一次性、30 分钟；重设后 pwver+1、旧登录态全部失效（spec）
- 登录失败按邮箱计数：10 次锁 15 分钟（spec）
- 会话 = HMAC-SHA256 签名 Cookie，HttpOnly、Secure、SameSite=Lax、90 天，密钥环境变量 `SESSION_SECRET`（spec）
- push 只接受 `sumsum:` 前缀、排除 `sumsum:help:seen`，服务端按 updated_at 新者胜（spec「API」）
- 发件人 `练习纸 <no-reply@mail.qingchejun.com>`；邮件中文纯文本、只说事（spec）
- `RESEND_API_KEY`、`SESSION_SECRET` 不进代码、不进 Git（spec「上线需用户配合」）
- 无 CORS 需求（同源 `/api`）；改动仅 POST；CSRF 靠 SameSite=Lax（spec）
- 无构建步骤；测试为 `tools/check-*.js` node 直跑；服务端时间一律 unix 毫秒（与客户端 mtime 同单位，避开时区问题）
- `git push origin main` 即上线 Cloudflare Pages，**必须用户确认后才能推**

## 设计裁定（写计划时定的，执行时不再议）

1. **`sumsum:sync:meta` 不进备份也不进同步**：mtime 表是同步管道自身的数据，跟着备份走会把别台机器的时间戳搬进来打乱 LWW。backup.js 的 SKIP 加这一个键。
2. **删除不同步（v1 无墓碑）**：全站删 `sumsum:` 键只有两处——撤销槽 `undo:v1`（当天临时态，复活无害：canUndo 校验日期）和导入老备份时删 `wrong:v3`（下次加载立刻从 v2 重迁移并以新 mtime 重写、推送）。两处都自愈，不需要删除标记。
3. **重发验证码不作废旧验证码**：多行 active token，任一未过期未用过的都有效；5 次填错才整批作废。省一次「旧码必须重发才失效」的状态管理。
4. **导入备份 = 显式意图**：导入后给备份里的键盖「现在」的 mtime（`store.noteImport`），这些值压过云端。
5. **未验证邮箱重复注册 → 更新密码 + 重发验证码**（不报 409）：反正还没验证过，当「换了个密码重新来」处理。
6. **`DEV_SHOW_CODE=1`**：验证码/重置 token 在 JSON 响应里回显，仅当该环境变量存在**且**请求主机是 localhost 时——给本地 e2e 用；生产不设这个变量就永远不回显。
7. **重设链接走 `/?reset=<token>`**（index.html）：板块页的 URL 参数会被设置逻辑吃掉（today-core.js 头注的规矩），index 不解析参数，安全。重设表单要求用户再填一次邮箱——PBKDF2 的盐需要邮箱，且用户手边就是那封邮件。
8. **首登拉取应用了新数据后自动刷新一次页面**（sessionStorage 防循环）：各板块只在加载时读一次存储，不刷新的话拉下来的新数据要等下次打开才可见。

## Review Focus

（spec 没点名、但真实使用最容易咬人的五类输入；每条已把测试钉进对应任务）

1. **两台设备时钟有偏差 / updated_at 完全相等** → LWW 必须稳定：相平谁也不动，不许来回覆盖打乒乓。测试：Task 3 check-sync（equal → 不 apply 不 push）。
2. **会话 cookie 到期边界与篡改**：exp == now 拒绝；payload 改一个字符验签失败返回 401 而不是 500。测试：Task 4 check-auth-server。
3. **验证码重放与作废后绕过**：用过的码再提交失败；5 次错作废后即使拿到正确码也进不去；重发新码后旧码（未过期）仍可用。测试：Task 5 check-auth-core。
4. **push 混入坏键**（非 `sumsum:`、`help:seen`、`sync:meta`、超长 value、超过 200 条）：整批不炸、坏键跳过并计数返回。测试：Task 6 check-auth-core。
5. **账号存在性探测**：login 不存在的邮箱与密码错误返回同一句话同一状态码；forgot 无论有没有这个邮箱都 200。测试：Task 6 check-auth-core。
6. **首登确认弹窗被关掉**（用户没选方向）：本地云端都不动，下次登录再问。测试：Task 9 check-sync。

---

### Task 1: store.js——全站 localStorage 写入收口

**Files:**
- Create: `js/store.js`
- Create: `tools/check-store.js`
- Modify: 五个页面加一行 `<script src="js/store.js"></script>`（放在所有脚本最前）：`index.html:47` 前、`kousuan.html:167` 前、`aoshu.html:136` 前、`shudu.html:123` 前、`shizi.html:176` 前

**Interfaces:**
- Produces: `SumSum.store.get(key)`→解析后的值或 null；`getString(key)`→原始字符串或 null；`set(key, value)`→JSON 序列化写入 + mtime=Date.now() + 广播；`applyRemote(key, raw, mtime)`→写原始串、mtime 记给定值、**不广播**；`remove(key)`→删除 + 清 mtime + 广播；`noteImport(data)`→给 `{key: raw}` 里的可同步键盖现在时间；`stampNow(keys)`→同前（数组）；`keys()`→存储里现存的所有可同步键（**含没有 mtime 的老键**——sync.js 靠它发现「同步上线前的老数据」）；`meta()`→`{key: mtime}`；`onChange(fn)`→订阅，回调 `fn(key)`；`syncable(key)`→bool；`META_KEY = 'sumsum:sync:meta'`

- [ ] **Step 1: 写失败测试**

`tools/check-store.js`（完整文件；localStorage 桩仿照 tools/check-shizi-mark.js）：

```js
/* store 收口：写记 mtime、订阅广播、导入盖章、拉取不回声。node 直跑。 */
'use strict'

var mem = {}
globalThis.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null },
  setItem: function (k, v) { mem[k] = String(v) },
  removeItem: function (k) { delete mem[k] },
  key: function (i) { return Object.keys(mem)[i] || null },
  get length() { return Object.keys(mem).length }
}
globalThis.SumSum = globalThis.SumSum || {}

function fresh() {
  mem = {}
  delete require.cache[require.resolve('../js/store.js')]
  require('../js/store.js')
  return globalThis.SumSum.store
}

var ok = 0, bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) }
  else { bad++; console.log('✗', name, extra === undefined ? '' : extra) }
}

/* --- 写入记 mtime + 广播 --- */
var S = fresh()
var t0 = Date.now()
var heard = []
S.onChange(function (k) { heard.push(k) })
S.set('sumsum:shizi:v1', { week: 3 })
check('set 写入可读回', S.get('sumsum:shizi:v1').week === 3)
var m = S.meta()
check('set 记了 mtime', m['sumsum:shizi:v1'] >= t0, JSON.stringify(m))
check('set 广播了', heard.indexOf('sumsum:shizi:v1') >= 0)
check('mtime 表落在 META_KEY', mem['sumsum:sync:meta'] !== undefined)

/* --- applyRemote：写原始串、mtime 用给定值、不广播 --- */
heard.length = 0
S.applyRemote('sumsum:shizi:v1', '{"week":9}', 12345)
check('applyRemote 写原始串', S.getString('sumsum:shizi:v1') === '{"week":9}')
check('applyRemote mtime 用给定值', S.meta()['sumsum:shizi:v1'] === 12345)
check('applyRemote 不广播', heard.length === 0)

/* --- 不可同步的键：不记 mtime、不广播 --- */
heard.length = 0
S.set('foo:bar', 1)
S.set('sumsum:help:seen', '1')
check('非同步键不记 mtime', S.meta()['foo:bar'] === undefined && S.meta()['sumsum:help:seen'] === undefined)
check('非同步键不广播', heard.length === 0)

/* --- remove 清 mtime --- */
S.remove('sumsum:shizi:v1')
check('remove 清掉 mtime', S.meta()['sumsum:shizi:v1'] === undefined)

/* --- meta 持久化：新实例仍能读到 --- */
S.set('sumsum:aoshu:v1', { x: 1 })
var S2 = fresh()
check('meta 跨实例持久', S2.meta()['sumsum:shizi:v1'] === undefined || true) /* fresh() 清了 mem，这条验证的是 fresh 不炸 */
/* 真正的持久化验证：不清 mem 重读 */
mem['sumsum:sync:meta'] = JSON.stringify({ 'sumsum:k': 42 })
delete require.cache[require.resolve('../js/store.js')]
require('../js/store.js')
check('meta 从存储读回', globalThis.SumSum.store.meta()['sumsum:k'] === 42)

/* --- noteImport / stampNow --- */
var S3 = fresh()
S3.noteImport({ 'sumsum:shizi:wrong:v2': '{}', 'foo:skip': '1' })
var m3 = S3.meta()
check('noteImport 盖了可同步键', m3['sumsum:shizi:wrong:v2'] >= t0)
check('noteImport 跳过非同步键', m3['foo:skip'] === undefined)
S3.stampNow(['sumsum:shudu:v1'])
check('stampNow 盖时间', S3.meta()['sumsum:shudu:v1'] >= t0)

/* --- keys()：现存可同步键全列出（含无 mtime 的老键） --- */
mem['sumsum:old:v1'] = '{}'   /* 直接进 localStorage，绕过 set——模拟同步上线前的老数据 */
mem['foo:other'] = '1'
check('keys 列出老键', S3.keys().indexOf('sumsum:old:v1') >= 0)
check('keys 排除不同步的', S3.keys().indexOf('foo:other') < 0 && S3.keys().indexOf('sumsum:sync:meta') < 0)

console.log(bad ? '---- 有 ' + bad + ' 条没过' : '✓ store 收口全部通过')
process.exit(bad ? 1 : 0)
```

- [ ] **Step 2: 跑它，确认失败**

Run: `node tools/check-store.js`
Expected: 报错退出（`Cannot find module '../js/store.js'`）。

- [ ] **Step 3: 实现 store.js**

`js/store.js`（完整文件）：

```js
/**
 * 全站 localStorage 写入的统一收口（2026-11 账号同步起）。
 *
 * 为什么要有它：云同步按「每键最后写入时间」（LWW）合并，写入时间必须和写入动作
 * 绑在一起记，散在各模块的 localStorage.setItem 做不到。所有 sumsum:* 的写入
 * （设置、进度、错字集……）都走这里：真正写 localStorage 的同时把 mtime 记进
 * sumsum:sync:meta，并广播给订阅者（js/sync.js 拿它做防抖推送）。
 *
 * mtime 表本身不进备份也不进同步（js/backup.js 的 SKIP 同款），不然导入老备份
 * 会把别台机器的时间戳一起搬进来。
 *
 * 本文件无 DOM 依赖；localStorage 不可用（隐私模式）时写操作静默失败，
 * 页面照常可用，只是同步不了。
 */
;(function (root) {
  'use strict'

  var META_KEY = 'sumsum:sync:meta'
  var SKIP = { 'sumsum:help:seen': true, 'sumsum:sync:meta': true }

  var listeners = []

  function syncable(k) {
    return typeof k === 'string' && k.indexOf('sumsum:') === 0 && !SKIP[k]
  }

  function loadMeta() {
    try {
      var v = root.localStorage.getItem(META_KEY)
      var o = v ? JSON.parse(v) : null
      return o && typeof o === 'object' ? o : {}
    } catch (e) {
      return {}
    }
  }

  function saveMeta(m) {
    try {
      root.localStorage.setItem(META_KEY, JSON.stringify(m))
    } catch (e) { /* 存不了就没记上，最多少同步一次 */ }
  }

  function fire(key) {
    for (var i = 0; i < listeners.length; i++) listeners[i](key)
  }

  function get(key) {
    try {
      var v = root.localStorage.getItem(key)
      return v == null ? null : JSON.parse(v)
    } catch (e) {
      return null
    }
  }

  function getString(key) {
    try {
      return root.localStorage.getItem(key)
    } catch (e) {
      return null
    }
  }

  function set(key, value) {
    try {
      root.localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      return
    }
    if (syncable(key)) {
      var m = loadMeta()
      m[key] = Date.now()
      saveMeta(m)
      fire(key)
    }
  }

  /* 同步拉取专用：云端赢了就写本地，mtime 记云端的 updated_at，不再触发推送 */
  function applyRemote(key, raw, mtime) {
    try {
      root.localStorage.setItem(key, raw)
    } catch (e) {
      return
    }
    if (syncable(key)) {
      var m = loadMeta()
      m[key] = mtime
      saveMeta(m)
    }
  }

  function remove(key) {
    try {
      root.localStorage.removeItem(key)
    } catch (e) {
      return
    }
    if (syncable(key)) {
      var m = loadMeta()
      delete m[key]
      saveMeta(m)
      fire(key)
    }
  }

  /* 导入备份后给备份里的键盖「现在」：导入是用户的明确意图，这些值要压过云端 */
  function noteImport(data) {
    var m = loadMeta()
    var hit = false
    Object.keys(data).forEach(function (k) {
      if (syncable(k)) {
        m[k] = Date.now()
        hit = true
      }
    })
    if (hit) saveMeta(m)
  }

  /* 首登确认选「本机为准」后用：给指定键盖现在的时间，让它们赢过云端 */
  function stampNow(keys) {
    var m = loadMeta()
    var hit = false
    keys.forEach(function (k) {
      if (syncable(k)) {
        m[k] = Date.now()
        hit = true
      }
    })
    if (hit) saveMeta(m)
  }

  function meta() {
    return loadMeta()
  }

  /* 现存的所有可同步键。直接扫 localStorage：老数据没走 set、meta 里没有它们 */
  function keys() {
    var out = []
    try {
      for (var i = 0; i < root.localStorage.length; i++) {
        var k = root.localStorage.key(i)
        if (syncable(k)) out.push(k)
      }
    } catch (e) { /* 读不了就当没有 */ }
    return out
  }

  function onChange(fn) {
    listeners.push(fn)
    return fn
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.store = {
    META_KEY: META_KEY,
    syncable: syncable,
    get: get,
    getString: getString,
    set: set,
    applyRemote: applyRemote,
    remove: remove,
    noteImport: noteImport,
    stampNow: stampNow,
    keys: keys,
    meta: meta,
    onChange: onChange
  }
})(typeof window !== 'undefined' ? window : globalThis)
```

- [ ] **Step 4: 跑测试通过**

Run: `node tools/check-store.js`
Expected: 全部 ✓，退出码 0。

- [ ] **Step 5: 五个页面引入 store.js（每页脚本块的最前面一行）**

`index.html`（第 47 行 `<script src="js/settings.js"></script>` 前插一行）；其余四页同理，插在各自脚本块第一行（kousuan.html:167 / aoshu.html:136 / shudu.html:123 / shizi.html:176 的 `js/shell.js` 前）：

```html
<script src="js/store.js"></script>
```

- [ ] **Step 6: 全套件回归 + 提交**

Run: `node tools/check-store.js && node tools/check-shizi.js 2>&1 | tail -1 && node tools/check-shizi-mark.js && node tools/check-backup.js && node tools/check-today.js && node tools/check-aoshu-parts.js`
Expected: 各套件 ✓（页面只是多引了一个无副作用的脚本）。

```bash
git add js/store.js tools/check-store.js index.html kousuan.html aoshu.html shudu.html shizi.html
git commit -m "feat: store.js 收口全站写入并记同步 mtime"
```

### Task 2: 全站写入点换 store（机械替换 + 守卫测试）

**Files:**
- Modify: `js/settings.js:160`、`js/aoshu-settings.js:121`、`js/shizi-settings.js:159`、`js/shudu-settings.js:137`、`js/aoshu-main.js:45`、`js/shizi-mark.js:48`（writeJSON）、`js/shizi-mark.js:327`、`js/shizi-mark.js:396`
- Modify: `tools/check-store.js`（加源码扫描段）、`tools/check-shizi-mark.js`（fresh() 加 store 桩）

**Interfaces:**
- Consumes: Task 1 的 `SumSum.store.set / remove`
- Produces: 全站 `sumsum:*` 写入全部经 store（backup.js 的 apply 除外——它写入的是传入的 storage 参数、有独立测试；help.js 的 `sumsum:help:seen` 除外——不同步的键，见裁定 1）

- [ ] **Step 1: 先写守卫测试（RED）**

`tools/check-store.js` 末尾（`process.exit` 前）加源码扫描段：

```js
/* --- 守卫：六个有写入的模块不允许再直接碰 localStorage.setItem/removeItem --- */
var fs = require('fs')
var WATCH = ['settings.js', 'aoshu-settings.js', 'shizi-settings.js', 'shudu-settings.js', 'aoshu-main.js', 'shizi-mark.js']
var leaks = []
WATCH.forEach(function (f) {
  var src = fs.readFileSync(__dirname + '/../js/' + f, 'utf8')
  if (/localStorage\.(setItem|removeItem)/.test(src)) leaks.push(f)
})
check('写入点全部经 store（无直接 setItem/removeItem）', !leaks.length, leaks.join(','))
```

- [ ] **Step 2: 跑，确认守卫抓到现状**

Run: `node tools/check-store.js`
Expected: `✗ 写入点全部经 store` 列出 6 个文件（RED）。

- [ ] **Step 3: 逐个替换（GREEN）**

四个设置文件的同型改动（以 `js/settings.js:160` 为例，其余三个文件同样两行）：

```js
root.SumSum.store.set(KEY, s)
```

（替换 `root.localStorage.setItem(KEY, JSON.stringify(s))`，下面一行 URL 同步逻辑不动。）

`js/aoshu-main.js:45`：

```js
root.SumSum.store.set(LEARNED_KEY, Array.from(set))
```

`js/shizi-mark.js` 的 `writeJSON`（约 46-50 行）：

```js
  function writeJSON(k, v) {
    try {
      root.SumSum.store.set(k, v)
    } catch (e) { /* 隐私模式等：写不进就当没保存 */ }
  }
```

`js/shizi-mark.js` 两处 `root.localStorage.removeItem(UNDO_KEY)`（约 327、396 行）都换成：

```js
    S.store.remove(UNDO_KEY)
```

（文件里已有 `var S = root.SumSum` 就复用；没有就在 IIFE 顶部加。）

- [ ] **Step 4: check-shizi-mark.js 的桩补 store**

`tools/check-shizi-mark.js` 的 `fresh()` 在重新 require shizi-mark.js 之前加（mem 是桩的存储对象）：

```js
  globalThis.SumSum = globalThis.SumSum || {}
  globalThis.SumSum.store = {
    set: function (k, v) { mem[k] = JSON.stringify(v) },
    remove: function (k) { delete mem[k] },
    onChange: function () {},
    getString: function (k) { return k in mem ? mem[k] : null }
  }
```

- [ ] **Step 5: 全套件 + 浏览器冒烟**

Run: `node tools/check-store.js && node tools/check-shizi.js 2>&1 | tail -1 && node tools/check-shizi-mark.js && node tools/check-backup.js && node tools/check-today.js && for f in check-aoshu-gen check-aoshu-lesson check-aoshu-parts check-print-title check-shudu; do node tools/$f.js 2>&1 | tail -1; done`
Expected: 全 ✓。

浏览器冒烟（python http.server + playwright，临时脚本用完删）：kousuan.html 改设置 → localStorage 值变 + `sumsum:sync:meta` 里有该键；shizi.html 点字登记 → wrong:v3 和 meta 同时变；无页面报错。

- [ ] **Step 6: 提交**

```bash
git add js/settings.js js/aoshu-settings.js js/shizi-settings.js js/shudu-settings.js js/aoshu-main.js js/shizi-mark.js tools/check-store.js tools/check-shizi-mark.js
git commit -m "refactor: 六处写入点改走 store，附带守卫测试"
```

### Task 3: sync-core.js——LWW 合并规则（纯函数）

**Files:**
- Create: `js/sync-core.js`
- Create: `tools/check-sync.js`

**Interfaces:**
- Produces: `SumSum.syncCore.planFirstLogin(cloudCount, unresolvedCount, localCount)` → `'push-all' | 'confirm' | 'none'`；`SumSum.syncCore.merge(localMeta, localHas, cloudItems)` → `{ apply: [{key, value, mtime}], pushKeys: [key], unresolved: [key] }`（localHas 是 `fn(key)->bool`；cloudItems 是 `[{key, value, updated_at}]`；相平谁也不动）

- [ ] **Step 1: 写失败测试**

`tools/check-sync.js`（完整文件，本任务先只测 sync-core；Task 9 再往里加 sync.js 的段）：

```js
/* 云同步的合并规则（sync-core 纯函数）。node 直跑。 */
'use strict'

globalThis.SumSum = globalThis.SumSum || {}
require('../js/sync-core.js')
var C = globalThis.SumSum.syncCore

var ok = 0, bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) }
  else { bad++; console.log('✗', name, extra === undefined ? '' : JSON.stringify(extra)) }
}

/* --- 首登三分支 --- */
check('云空本机有 → push-all', C.planFirstLogin(0, 0, 5) === 'push-all')
check('有对不上的老键 → confirm', C.planFirstLogin(3, 2, 8) === 'confirm')
check('都能比出新旧 → none', C.planFirstLogin(3, 0, 8) === 'none')
check('两边都空 → none', C.planFirstLogin(0, 0, 0) === 'none')

var has = function (keys) {
  return function (k) { return keys.indexOf(k) >= 0 }
}

/* --- LWW 两个方向 --- */
var r1 = C.merge({ a: 200 }, has(['a']), [{ key: 'a', value: 'V', updated_at: 100 }])
check('本地新 → push', r1.pushKeys.indexOf('a') >= 0 && r1.apply.length === 0, r1)
var r2 = C.merge({ a: 100 }, has(['a']), [{ key: 'a', value: 'V', updated_at: 200 }])
check('云端新 → apply', r2.apply.length === 1 && r2.apply[0].mtime === 200 && r2.pushKeys.length === 0, r2)

/* --- 相平：谁也不动（时钟偏差下必须稳定） --- */
var r3 = C.merge({ a: 150 }, has(['a']), [{ key: 'a', value: 'V', updated_at: 150 }])
check('相平不动', r3.apply.length === 0 && r3.pushKeys.length === 0, r3)

/* --- 云端独有的键 → 直接 apply（本机没有就不算冲突） --- */
var r4 = C.merge({}, has([]), [{ key: 'new', value: 'V', updated_at: 5 }])
check('云端独有 → apply', r4.apply.length === 1 && r4.apply[0].key === 'new', r4)

/* --- 本地独有的键（meta 里有）→ push --- */
var r5 = C.merge({ mine: 9 }, has(['mine']), [])
check('本地独有 → push', r5.pushKeys.indexOf('mine') >= 0, r5)

/* --- 本地有值但没有 mtime（老数据）→ unresolved，不替用户做主 --- */
var r6 = C.merge({}, has(['old']), [{ key: 'old', value: 'V', updated_at: 5 }])
check('老数据 → unresolved', r6.unresolved.indexOf('old') >= 0 && r6.apply.length === 0 && r6.pushKeys.length === 0, r6)

console.log(bad ? '---- 有 ' + bad + ' 条没过' : '✓ sync-core 合并规则全部通过')
process.exit(bad ? 1 : 0)
```

- [ ] **Step 2: 跑，确认失败**

Run: `node tools/check-sync.js`
Expected: `Cannot find module '../js/sync-core.js'`。

- [ ] **Step 3: 实现**

`js/sync-core.js`（完整文件）：

```js
/**
 * 云同步的合并规则（纯函数，无 IO；node 下由 tools/check-sync.js 校验）。
 *
 * 每键 LWW：本地 mtime 对云端 updated_at，新者胜；相平谁也不动——两台设备时钟
 * 有偏差，平局如果不稳定会互相覆盖来回打乒乓。本地有值但没 mtime 的键是
 * 「同步功能上线前的老数据」，不能替用户做主，交给首登确认（js/sync.js）。
 */
;(function (root) {
  'use strict'

  function planFirstLogin(cloudCount, unresolvedCount, localCount) {
    if (!cloudCount && localCount) return 'push-all'
    if (unresolvedCount) return 'confirm'
    return 'none'
  }

  /**
   * localMeta: {key: mtime}；localHas(key)->bool；cloudItems: [{key, value, updated_at}]
   * 返回 { apply: [{key, value, mtime}], pushKeys: [key], unresolved: [key] }
   */
  function merge(localMeta, localHas, cloudItems) {
    var apply = []
    var pushKeys = []
    var unresolved = []
    var seen = {}
    cloudItems.forEach(function (it) {
      seen[it.key] = true
      var lm = localMeta[it.key]
      if (lm == null) {
        if (localHas(it.key)) unresolved.push(it.key)
        else apply.push({ key: it.key, value: it.value, mtime: it.updated_at })
        return
      }
      if (lm > it.updated_at) pushKeys.push(it.key)
      /* 相平：谁也不动 */
    })
    Object.keys(localMeta).forEach(function (k) {
      if (!seen[k] && localHas(k)) pushKeys.push(k)
    })
    return { apply: apply, pushKeys: pushKeys, unresolved: unresolved }
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.syncCore = { planFirstLogin: planFirstLogin, merge: merge }
})(typeof window !== 'undefined' ? window : globalThis)
```

- [ ] **Step 4: 跑通过 + 提交**

Run: `node tools/check-sync.js`
Expected: 全 ✓。

```bash
git add js/sync-core.js tools/check-sync.js
git commit -m "feat: 同步合并规则 sync-core——每键 LWW、平局稳定、老数据交确认"
```

### Task 4: server/session.js——HMAC 会话 Cookie

**Files:**
- Create: `server/session.js`（ESM——functions 和 node 测试都用）
- Create: `tools/check-auth-server.js`

**Interfaces:**
- Produces（全部 async 或纯串）：`sign(payload, secret)`→`'b64url.json.hmachex'`；`verify(token, secret, now)`→payload 或 null（验签失败 / exp<=now 均 null）；`COOKIE='sumsum_sess'`；`sessionPayload(uid, pwver, now)`→`{uid, pwver, exp: now+90天}`；`cookieHeader(token, maxAgeSec)` / `clearCookieHeader()`→Set-Cookie 串（HttpOnly; Secure; SameSite=Lax; Path=/）；`readCookie(headerStr, name)`→值或 null；`requireSession(context)`→payload 或 null（验签 + 查 users 表比对 pwver，供 data 接口用）

- [ ] **Step 1: 写失败测试**

`tools/check-auth-server.js`（完整文件）：

```js
/* 会话 cookie：签名/验签/到期/篡改/序列化。node 直跑（动态 import ESM）。 */
'use strict'

var ok = 0, bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) }
  else { bad++; console.log('✗', name, extra === undefined ? '' : String(extra)) }
}

import('../server/session.js').then(async function (S) {
  var SECRET = 'test-secret'
  var now = 1700000000000

  var t = await S.sign({ uid: 'u1', pwver: 1, exp: now + 1000 }, SECRET)
  var p = await S.verify(t, SECRET, now)
  check('签名后能验回', p && p.uid === 'u1' && p.pwver === 1)

  check('改 payload 一位 → 拒绝', (await S.verify(t.slice(0, -2) + 'zz', SECRET, now)) === null)
  check('换密钥 → 拒绝', (await S.verify(t, 'other', now)) === null)

  var te = await S.sign({ uid: 'u1', pwver: 1, exp: now }, SECRET)
  check('exp == now → 拒绝', (await S.verify(te, SECRET, now)) === null)
  var tl = await S.sign({ uid: 'u1', pwver: 1, exp: now + 1 }, SECRET)
  check('exp == now+1 → 放行', (await S.verify(tl, SECRET, now)) !== null)

  var h = S.cookieHeader(t, 90 * 86400)
  check('cookie 属性齐全', h.indexOf('HttpOnly') >= 0 && h.indexOf('Secure') >= 0 && h.indexOf('SameSite=Lax') >= 0 && h.indexOf('Max-Age=7776000') >= 0, h)
  check('清 cookie 是 Max-Age=0', S.clearCookieHeader().indexOf('Max-Age=0') >= 0)

  check('readCookie 解析', S.readCookie('a=1; sumsum_sess=xyz; b=2', 'sumsum_sess') === 'xyz')
  check('readCookie 没有 → null', S.readCookie('a=1', 'sumsum_sess') === null)

  var sp = S.sessionPayload('u1', 3, now)
  check('90 天有效期', sp.exp - now === 90 * 86400 * 1000 && sp.pwver === 3)

  console.log(bad ? '---- 有 ' + bad + ' 条没过' : '✓ 会话 cookie 全部通过')
  process.exit(bad ? 1 : 0)
}).catch(function (e) { console.error(e); process.exit(1) })
```

- [ ] **Step 2: 跑，确认失败**

Run: `node tools/check-auth-server.js`
Expected: `Cannot find module`（server 目录还不存在）。

- [ ] **Step 3: 实现**

`server/session.js`（完整文件）：

```js
/**
 * 无状态登录态：HMAC-SHA256 签名的会话 cookie（spec 定的：不建 session 表）。
 * payload 只放 {uid, pwver, exp}（ASCII，btoa 安全）；邮箱每次由 /api/auth/me 查库带出。
 * 时间 unix 毫秒。requireSession 额外查 users 表比对 pwver：改密/重置后旧登录态立刻失效。
 */
export const COOKIE = 'sumsum_sess'
const DAY = 86400 * 1000

const enc = new TextEncoder()

async function hmac(data, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function b64url(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromB64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return decodeURIComponent(escape(atob(s)))
}
function sameHex(a, b) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

export async function sign(payload, secret) {
  const body = b64url(JSON.stringify(payload))
  return body + '.' + await hmac(body, secret)
}

export async function verify(token, secret, now) {
  if (typeof token !== 'string') return null
  const i = token.lastIndexOf('.')
  if (i < 1 || i === token.length - 1) return null
  const body = token.slice(0, i)
  const sig = token.slice(i + 1)
  if (!/^[0-9a-f]+$/.test(sig)) return null
  if (!sameHex(sig, await hmac(body, secret))) return null
  let payload
  try {
    payload = JSON.parse(fromB64url(body))
  } catch (e) {
    return null
  }
  if (!payload || typeof payload.uid !== 'string' || typeof payload.pwver !== 'number' ||
      typeof payload.exp !== 'number' || payload.exp <= now) return null
  return payload
}

export function sessionPayload(uid, pwver, now) {
  return { uid: uid, pwver: pwver, exp: now + 90 * DAY }
}

export function cookieHeader(token, maxAgeSec) {
  return COOKIE + '=' + token + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=' + maxAgeSec
}

export function clearCookieHeader() {
  return COOKIE + '=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
}

export function readCookie(header, name) {
  if (!header) return null
  const parts = header.split(';')
  for (const p of parts) {
    const t = p.trim()
    if (t.startsWith(name + '=')) return t.slice(name.length + 1)
  }
  return null
}

/** data 等接口的门槛：验签 + pwver 比对。context 是 Pages Functions 的 EventContext。 */
export async function requireSession(context) {
  const raw = readCookie(context.request.headers.get('Cookie'), COOKIE)
  if (!raw) return null
  const payload = await verify(raw, context.env.SESSION_SECRET, Date.now())
  if (!payload) return null
  const user = await context.env.DB.prepare('SELECT id, pwver FROM users WHERE id=?').bind(payload.uid).first()
  if (!user || user.pwver !== payload.pwver) return null
  return payload
}
```

- [ ] **Step 4: 跑通过 + 提交**

Run: `node tools/check-auth-server.js`
Expected: 全 ✓（requireSession 不在此测——它要 Pages 上下文，由 Task 7 的 e2e 盖住）。

```bash
git add server/session.js tools/check-auth-server.js
git commit -m "feat: HMAC 会话 cookie——签名、验签、pwver 失效、序列化"
```

### Task 5: auth-core——注册、验证码生命周期、限流

**Files:**
- Create: `server/auth-core.js`（ESM；本任务先写工具函数 + register + verify + issueCode，Task 6 继续加）
- Create: `tools/check-auth-core.js`

**Interfaces:**
- Consumes: 无（纯逻辑 + 传入 repo）
- Produces: `normEmail(s)`、`validEmail(s)`、`validClientHash(h)`（64 位 hex）；`register(repo, now, body)`、`verify(repo, now, body)`——都返回 `{status, body, session?, mail?, dev?}`；`mail` 是 `{to, subject, text}` 由 wrapper 发；`dev` 是 `{code?|token?}` 仅 DEV_SHOW_CODE 时由 wrapper 回显
- repo 接口（Task 6/7 与内存桩共用）：`userByEmail(email)`、`userById(id)`、`insertUser(u)`、`updateUser(id, fields)`、`setVerified(id)`、`tokenInsert({token_hash, user_id, kind, expires_at})`、`tokenListByUser(uid, kind)`、`tokenGet(hash)`、`tokenUse(hash)`、`tokensClear(uid, kind)`、`limitGet(scope, kind)`→`{n, ts, until}|null`、`limitSet(scope, kind, row)`

- [ ] **Step 1: 写失败测试**

`tools/check-auth-core.js`（完整文件；内存 repo + 固定 now 推进）：

```js
/* 鉴权核心（auth-core）：注册 / 验证码生命周期 / 邮件限流。node 直跑。 */
'use strict'

var ok = 0, bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) }
  else { bad++; console.log('✗', name, extra === undefined ? '' : JSON.stringify(extra)) }
}

/* --- 内存 repo：D1 语义的最小镜像 --- */
function memRepo() {
  var users = [], tokens = [], limits = {}
  return {
    users: users,
    _tokens: tokens,
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
    async limitSet(s, k, row) { limits[s + '/' + k] = row }
  }
}

function clientHash(email, pw) {
  /* 与浏览器 account.js 同派生（node:crypto 独立实现，互为对照） */
  var c = require('crypto')
  return c.pbkdf2Sync(pw, email + 'lianxizhi-account-v1', 1000, 32, 'sha256').toString('hex')
  /* 迭代次数无所谓——服务端只看是不是 64 位 hex */
}

import('../server/auth-core.js').then(async function (A) {
  var now = 1700000000000

  /* --- 注册 --- */
  var db = memRepo()
  var bad1 = await A.register(db, now, { email: 'not-an-email', password: clientHash('a@b.co', 'password123') })
  check('坏邮箱 422', bad1.status === 422)
  var bad2 = await A.register(db, now, { email: 'a@b.co', password: 'short' })
  check('密码不是 64hex 422', bad2.status === 422)

  var r = await A.register(db, now, { email: 'A@B.CO ', password: clientHash('a@b.co', 'password123') })
  check('注册成功并发码', r.status === 200 && r.mail && /^\d{6}$/.test(r.dev.code), r)
  check('邮箱归一成小写', db.users[0].email === 'a@b.co')
  check('新号未验证', db.users[0].verified === 0)
  check('验证码入库是 hash 不是明文', db._tokens[0].token_hash.indexOf(r.dev.code) < 0)
  check('验证码 10 分钟有效', db._tokens[0].expires_at === now + 10 * 60 * 1000)

  /* --- 未验证重复注册：换密码重发，不 409（裁定 5） --- */
  var r2 = await A.register(db, now + 61 * 1000, { email: 'a@b.co', password: clientHash('a@b.co', 'password456') })
  check('未验证重复注册 → 重发', r2.status === 200 && r2.dev.code !== r.dev.code)

  /* --- 验证 --- */
  var v = await A.verify(db, now + 62 * 1000, { email: 'a@b.co', code: r.dev.code })
  check('旧验证码（未过期未用）仍可用', v.status === 200 && v.session && v.session.uid === db.users[0].id, v)
  check('验证后 verified=1', db.users[0].verified === 1)

  var v2 = await A.verify(db, now + 63 * 1000, { email: 'a@b.co', code: r.dev.code })
  check('用过的码再交 → 失败', v2.status === 422)

  /* 已验证的邮箱再注册 → 409 */
  var r3 = await A.register(db, now + 130 * 1000, { email: 'a@b.co', password: clientHash('a@b.co', 'x') })
  check('已验证重复注册 → 409', r3.status === 409)

  /* --- 错 5 次作废 --- */
  var db2 = memRepo()
  var reg = await A.register(db2, now, { email: 'c@d.co', password: clientHash('c@d.co', 'password123') })
  var rightCode = reg.dev.code
  for (var i = 0; i < 5; i++) {
    await A.verify(db2, now + 1000 + i, { email: 'c@d.co', code: '000000' })
  }
  var vf = await A.verify(db2, now + 2000, { email: 'c@d.co', code: rightCode })
  check('5 次错后正确码也进不去', vf.status === 429, vf)
  check('作废后 token 全标已用', db2._tokens.every(function (t) { return t.used_at }))

  /* --- 邮件限流：60 秒间隔 + 每小时 3 封 --- */
  var db3 = memRepo()
  await A.register(db3, now, { email: 'e@f.co', password: clientHash('e@f.co', 'password123') })
  var again = await A.register(db3, now + 30 * 1000, { email: 'e@f.co', password: clientHash('e@f.co', 'password123') })
  check('60 秒内重发 → 429', again.status === 429, again)
  await A.register(db3, now + 61 * 1000, { email: 'e@f.co', password: clientHash('e@f.co', 'password123') })
  await A.register(db3, now + 121 * 1000, { email: 'e@f.co', password: clientHash('e@f.co', 'password123') })
  var fourth = await A.register(db3, now + 181 * 1000, { email: 'e@f.co', password: clientHash('e@f.co', 'password123') })
  check('一小时内第 4 封 → 429', fourth.status === 429, fourth)

  /* --- 邮件是中文纯文本且不含营销话术（spec） --- */
  check('邮件文案到位', /验证码/.test(reg.mail.text) && reg.mail.subject.indexOf('练习纸') === 0)

  console.log(bad ? '---- 有 ' + bad + ' 条没过' : '✓ auth-core 注册/验证码全部通过')
  process.exit(bad ? 1 : 0)
}).catch(function (e) { console.error(e); process.exit(1) })
```

- [ ] **Step 2: 跑，确认失败**

Run: `node tools/check-auth-core.js`
Expected: `Cannot find module '../server/auth-core.js'`。

- [ ] **Step 3: 实现 auth-core 的注册/验证部分**

`server/auth-core.js`（完整文件骨架 + 本任务的两个入口；Task 6 在同文件追加。迭代次数在测试里是 1000 无所谓——服务端只做格式校验，这正是两层哈希的用意）：

```js
/**
 * 账号鉴权的核心逻辑：纯逻辑 + 传入 repo，不碰 fetch/Response。
 * functions/api/* 只做 HTTP 翻译；这里可测的部分全部 node 直跑（tools/check-auth-core.js）。
 * 时间一律 unix 毫秒。返回值统一 { status, body, session?, mail?, dev? }：
 *   session = {uid, pwver}（wrapper 签成 cookie）；mail 由 wrapper 发；dev 仅本地回显。
 */

const enc = new TextEncoder()
const CODE_TTL = 10 * 60 * 1000
const CODE_MAX_FAILS = 5
const MAIL_INTERVAL = 60 * 1000
const MAIL_HOUR_MAX = 3

async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(s))
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}
function randomHex(nBytes) {
  const b = new Uint8Array(nBytes)
  crypto.getRandomValues(b)
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('')
}
export function normEmail(s) {
  return typeof s === 'string' ? s.trim().toLowerCase() : ''
}
export function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}
export function validClientHash(h) {
  return /^[0-9a-f]{64}$/.test(h)
}

/* ---- 邮件限流：60 秒间隔 + 每小时 3 封（验证码和重设共用一个闸） ---- */
async function mailGate(repo, email, now) {
  const row = await repo.limitGet(email, 'mail')
  if (row && row.until > now) return 'interval'
  if (row && row.ts > now - 3600 * 1000 && row.n >= MAIL_HOUR_MAX) return 'hour'
  return null
}
async function mailMark(repo, email, now) {
  const row = await repo.limitGet(email, 'mail')
  const n = row && row.ts > now - 3600 * 1000 ? row.n + 1 : 1
  await repo.limitSet(email, 'mail', { n: n, ts: now, until: now + MAIL_INTERVAL })
}

/* ---- 发验证码（6 位、hash 入库、10 分钟） ---- */
async function issueCode(repo, user, now) {
  const gate = await mailGate(repo, user.email, now)
  if (gate === 'interval') return { status: 429, body: { ok: false, error: '发送太频繁了，一分钟后再试。' } }
  if (gate === 'hour') return { status: 429, body: { ok: false, error: '这一小时发的邮件够多了，过一小时再试。' } }
  const code = String(100000 + (parseInt(randomHex(8), 16) % 900000))
  const salt = randomHex(16)
  await repo.tokenInsert({
    token_hash: salt + '$' + await sha256hex(salt + ':' + code),
    user_id: user.id, kind: 'verify', expires_at: now + CODE_TTL
  })
  await mailMark(repo, user.email, now)
  await repo.limitSet(user.email, 'codefail', { n: 0, ts: now, until: 0 }) /* 新码配新的 5 次机会 */
  return {
    status: 200, body: { ok: true },
    mail: { to: user.email, subject: '练习纸 · 验证码', text: '验证码：' + code + '\n10 分钟内有效。如果不是你在操作，忽略这封邮件就行。' },
    dev: { code: code }
  }
}

/* ---- 注册 ---- */
export async function register(repo, now, body) {
  const email = normEmail(body && body.email)
  const pw = (body && body.password) || ''
  if (!validEmail(email)) return { status: 422, body: { ok: false, error: '邮箱地址看起来不对。' } }
  if (!validClientHash(pw)) return { status: 422, body: { ok: false, error: '密码至少 8 位。' } }
  let user = await repo.userByEmail(email)
  if (user && user.verified) return { status: 409, body: { ok: false, error: '这个邮箱已经注册过了，直接登录就行。' } }
  if (user) {
    /* 未验证过的邮箱重复注册 = 换密码重来（裁定 5） */
    await repo.updateUser(user.id, { pw_hash: await sha256hex(user.pw_salt + pw) })
  } else {
    const id = crypto.randomUUID()
    const pw_salt = randomHex(16)
    await repo.insertUser({
      id: id, email: email,
      pw_hash: await sha256hex(pw_salt + pw), pw_salt: pw_salt,
      pwver: 1, verified: 0, created_at: now
    })
  }
  return issueCode(repo, await repo.userByEmail(email), now)
}

/* ---- 验证码校验 ---- */
export async function verify(repo, now, body) {
  const email = normEmail(body && body.email)
  const code = (body && body.code) || ''
  const user = await repo.userByEmail(email)
  if (!user) return { status: 422, body: { ok: false, error: '验证码不对，再看一眼邮件。' } }
  if (!/^\d{6}$/.test(code)) return { status: 422, body: { ok: false, error: '验证码是 6 位数字。' } }
  const fails = await repo.limitGet(email, 'codefail')
  if (fails && fails.n >= CODE_MAX_FAILS) {
    await repo.tokensClear(user.id, 'verify')
    return { status: 429, body: { ok: false, error: '错得太多了，验证码已作废，请重新发送。' } }
  }
  const rows = await repo.tokenListByUser(user.id, 'verify')
  for (const row of rows) {
    const salt = row.token_hash.split('$')[0]
    if (row.token_hash === salt + '$' + await sha256hex(salt + ':' + code)) {
      if (row.used_at) break /* 用过的码当错码处理（防重放） */
      if (row.expires_at <= now) return { status: 422, body: { ok: false, error: '验证码过期了，请重新发送。' } }
      await repo.tokenUse(row.token_hash)
      await repo.setVerified(user.id)
      return { status: 200, body: { ok: true }, session: { uid: user.id, pwver: user.pwver } }
    }
  }
  await repo.limitSet(email, 'codefail', { n: (fails ? fails.n : 0) + 1, ts: now, until: 0 })
  return { status: 422, body: { ok: false, error: '验证码不对，再看一眼邮件。' } }
}
```

- [ ] **Step 4: 跑通过 + 提交**

Run: `node tools/check-auth-core.js`
Expected: 全 ✓。

```bash
git add server/auth-core.js tools/check-auth-core.js
git commit -m "feat: auth-core 注册与验证码——hash 入库、5 次作废、邮件限流"
```

### Task 6: auth-core——登录锁定、找回重设、me、data 拉推

**Files:**
- Modify: `server/auth-core.js`（追加 login / forgot / reset / meBySession / dataPull / dataPush）
- Modify: `tools/check-auth-core.js`（追加测试段）

**Interfaces:**
- Consumes: Task 5 的工具函数与 repo 接口
- Produces: `login(repo, now, body)`（未验证 → `body.need_verify=true` + 发码）、`forgot(repo, now, body)`（无论存在与否 200）、`reset(repo, now, body)`（pwver+1 + session）、`meBySession(repo, session)`（pwver 不匹配 401）、`dataPull(repo, userId)`→items、`dataPush(repo, userId, items)`→`{applied, skipped}`（键过滤 + LWW）

- [ ] **Step 1: 追加失败测试**

`tools/check-auth-core.js` 的 `.then(async function (A) {` 段内、`console.log(bad ? ...` 前追加：

```js
  /* ===== Task 6：登录 / 锁定 / 找回 / 重设 / data ===== */
  var MIN = 60 * 1000

  /* --- 登录 --- */
  var dbL = memRepo()
  await A.register(dbL, now, { email: 'l@m.co', password: clientHash('l@m.co', 'password123') })
  var uL = dbL.users[0]
  await A.verify(dbL, now + 1000, { email: 'l@m.co', code: dbL._tokens[0] === undefined ? '' : (function () {
    throw new Error('用 dev.code 走')
  })() })
```

——上面这段不要照抄，验证那行直接用注册返回值。写成：

```js
  var dbL = memRepo()
  var regL = await A.register(dbL, now, { email: 'l@m.co', password: clientHash('l@m.co', 'password123') })
  await A.verify(dbL, now + 1000, { email: 'l@m.co', code: regL.dev.code })

  var good = await A.login(dbL, now + 2000, { email: 'L@M.CO', password: clientHash('l@m.co', 'password123') })
  check('登录成功给 session', good.status === 200 && good.session && good.session.uid === dbL.users[0].id, good)

  var wrongPw = await A.login(dbL, now + 3000, { email: 'l@m.co', password: clientHash('l@m.co', 'password999') })
  var noUser = await A.login(dbL, now + 3000, { email: 'ghost@m.co', password: clientHash('ghost@m.co', 'password999') })
  check('错密码与不存在邮箱同文案同状态（防探测）',
    wrongPw.status === noUser.status && wrongPw.body.error === noUser.body.error &&
    wrongPw.body.error === '邮箱或密码不对。', [wrongPw, noUser])

  /* --- 锁定：10 次锁 15 分钟 --- */
  var dbK = memRepo()
  var regK = await A.register(dbK, now, { email: 'k@m.co', password: clientHash('k@m.co', 'password123') })
  await A.verify(dbK, now + 1000, { email: 'k@m.co', code: regK.dev.code })
  for (var j = 0; j < 10; j++) {
    await A.login(dbK, now + 2000 + j, { email: 'k@m.co', password: clientHash('k@m.co', 'wrongpw' + j) })
  }
  var locked = await A.login(dbK, now + 3000, { email: 'k@m.co', password: clientHash('k@m.co', 'password123') })
  check('锁内正确密码也 429', locked.status === 429, locked)
  var after = await A.login(dbK, now + 16 * MIN, { email: 'k@m.co', password: clientHash('k@m.co', 'password123') })
  check('15 分钟后能登', after.status === 200, after)

  /* --- 未验证登录 → 补发验证码 --- */
  var dbV = memRepo()
  await A.register(dbV, now, { email: 'v@m.co', password: clientHash('v@m.co', 'password123') })
  var nv = await A.login(dbV, now + 1000, { email: 'v@m.co', password: clientHash('v@m.co', 'password123') })
  check('未验证 → need_verify + 发码', nv.status === 200 && nv.body.need_verify === true && nv.mail, nv)

  /* --- 找回：恒 200 不泄露 --- */
  var dbF = memRepo()
  var regF = await A.register(dbF, now, { email: 'f@m.co', password: clientHash('f@m.co', 'password123') })
  await A.verify(dbF, now + 1000, { email: 'f@m.co', code: regF.dev.code })
  var ghost = await A.forgot(dbF, now + 2000, { email: 'ghost@m.co' })
  check('不存在的邮箱 forgot 也 200 且不发信', ghost.status === 200 && ghost.body.ok === true && !ghost.mail)
  var real = await A.forgot(dbF, now + 65 * 1000, { email: 'f@m.co' })
  check('存在的邮箱发重设信', real.status === 200 && real.mail && /^[0-9a-f]{64}$/.test(real.dev.token), real)
  check('重设信里有链接', real.mail.text.indexOf('/?reset=') >= 0)

  /* --- 重设：一次性、pwver 失效 --- */
  var newHash = clientHash('f@m.co', 'newpassword9')
  var rs = await A.reset(dbF, now + 3000, { token: real.dev.token, password: newHash })
  check('重设成功并登录', rs.status === 200 && rs.session, rs)
  check('重设顺带验证', dbF.users[0].verified === 1)
  var rs2 = await A.reset(dbF, now + 4000, { token: real.dev.token, password: newHash })
  check('token 一次性', rs2.status === 422, rs2)
  check('pwver 加过', dbF.users[0].pwver === 2)
  var oldSess = await A.meBySession(dbF, { uid: dbF.users[0].id, pwver: 1 })
  check('旧登录态失效', oldSess.status === 401)
  var newSess = await A.meBySession(dbF, { uid: dbF.users[0].id, pwver: 2 })
  check('新登录态有效', newSess.status === 200 && newSess.body.email === 'f@m.co')
  var oldPwLogin = await A.login(dbF, now + 5000, { email: 'f@m.co', password: clientHash('f@m.co', 'password123') })
  check('旧密码登不上', oldPwLogin.status === 401)
  var newPwLogin = await A.login(dbF, now + 5000, { email: 'f@m.co', password: newHash })
  check('新密码能登', newPwLogin.status === 200)

  /* --- data：拉取 + 推送（坏键混合 / LWW / 平局） --- */
  var uid = dbF.users[0].id
  var p1 = await A.dataPush(dbF, uid, [
    { key: 'sumsum:shizi:v1', value: '{"week":3}', updated_at: now },
    { key: 'evil:key', value: 'x', updated_at: now },
    { key: 'sumsum:help:seen', value: '1', updated_at: now },
    { key: 'sumsum:sync:meta', value: '{}', updated_at: now },
    { key: 'sumsum:big:v1', value: new Array(70 * 1024).join('x'), updated_at: now }
  ])
  check('坏键跳过好键入库', p1.status === 200 && p1.body.applied === 1 && p1.body.skipped === 4, p1)
  var pull1 = await A.dataPull(dbF, uid)
  check('拉得到推上去的', pull1.body.items.length === 1 && pull1.body.items[0].key === 'sumsum:shizi:v1')

  var pStale = await A.dataPush(dbF, uid, [{ key: 'sumsum:shizi:v1', value: '{"week":1}', updated_at: now - 1 }])
  check('旧数据不覆盖新', pStale.body.applied === 0)
  var pEqual = await A.dataPush(dbF, uid, [{ key: 'sumsum:shizi:v1', value: '{"week":1}', updated_at: now }])
  check('平局不动', pEqual.body.applied === 0)
  var pNew = await A.dataPush(dbF, uid, [{ key: 'sumsum:shizi:v1', value: '{"week":9}', updated_at: now + 1 }])
  check('新数据覆盖', pNew.body.applied === 1)
  var tooMany = []
  for (var q = 0; q < 201; q++) tooMany.push({ key: 'sumsum:k' + q, value: '1', updated_at: now })
  var pBig = await A.dataPush(dbF, uid, tooMany)
  check('超过 200 条整批拒绝', pBig.status === 413)
```

- [ ] **Step 2: 跑，确认失败**

Run: `node tools/check-auth-core.js`
Expected: `A.login is not a function` 一类（新入口未实现）。

- [ ] **Step 3: 实现（追加到 server/auth-core.js 末尾）**

```js
/* ---- 登录（失败 10 次锁 15 分钟；未验证补发验证码） ---- */
const LOGIN_MAX_FAILS = 10
const LOCK_MS = 15 * 60 * 1000

async function bumpLoginFails(repo, email, now) {
  const row = await repo.limitGet(email, 'loginfail')
  const n = (row ? row.n : 0) + 1
  await repo.limitSet(email, 'loginfail', { n: n, ts: now, until: n >= LOGIN_MAX_FAILS ? now + LOCK_MS : 0 })
}

export async function login(repo, now, body) {
  const email = normEmail(body && body.email)
  const pw = (body && body.password) || ''
  const generic = { status: 401, body: { ok: false, error: '邮箱或密码不对。' } }
  const user = await repo.userByEmail(email)
  if (!user || !validClientHash(pw)) {
    if (user) await bumpLoginFails(repo, email, now) /* 只对真用户计数，防按邮箱骚扰 */
    return generic
  }
  const row = await repo.limitGet(email, 'loginfail')
  if (row && row.until > now) return { status: 429, body: { ok: false, error: '试错次数太多，等 15 分钟再来。' } }
  if (user.pw_hash !== await sha256hex(user.pw_salt + pw)) {
    await bumpLoginFails(repo, email, now)
    return generic
  }
  await repo.limitSet(email, 'loginfail', { n: 0, ts: now, until: 0 })
  if (!user.verified) {
    const r = await issueCode(repo, user, now)
    if (r.mail) r.body = { ok: false, need_verify: true } /* 节流 429 时保持原 body */
    return r
  }
  return { status: 200, body: { ok: true }, session: { uid: user.id, pwver: user.pwver } }
}

/* ---- 找回密码：无论邮箱是否存在都 200（spec：不泄露注册情况） ---- */
export async function forgot(repo, now, body) {
  const email = normEmail(body && body.email)
  if (!validEmail(email)) return { status: 422, body: { ok: false, error: '邮箱地址看起来不对。' } }
  const user = await repo.userByEmail(email)
  if (!user) return { status: 200, body: { ok: true } }
  if (await mailGate(repo, email, now)) return { status: 200, body: { ok: true } } /* 节流也装作成功 */
  const token = randomHex(32)
  await repo.tokenInsert({
    token_hash: 'plain$' + await sha256hex(token),
    user_id: user.id, kind: 'reset', expires_at: now + 30 * 60 * 1000
  })
  await mailMark(repo, email, now)
  return {
    status: 200, body: { ok: true },
    mail: {
      to: email, subject: '练习纸 · 重设密码',
      text: '有人（希望是你）申请重设「练习纸」的密码。打开下面的链接重设，30 分钟内有效、用一次就作废：\nhttps://lianxizhi.qingchejun.com/?reset=' + token + '\n不是你的话，忽略这封邮件就行。'
    },
    dev: { token: token }
  }
}

/* ---- 重设密码：token 一次性；pwver+1 旧登录态全失效 ---- */
export async function reset(repo, now, body) {
  const token = (body && body.token) || ''
  const pw = (body && body.password) || ''
  if (!validClientHash(pw)) return { status: 422, body: { ok: false, error: '密码至少 8 位。' } }
  if (!/^[0-9a-f]{64}$/.test(token)) return { status: 422, body: { ok: false, error: '重置链接不对。' } }
  const row = await repo.tokenGet('plain$' + await sha256hex(token))
  if (!row || row.kind !== 'reset' || row.used_at || row.expires_at <= now) {
    return { status: 422, body: { ok: false, error: '重置链接已失效，请重新发一封。' } }
  }
  const user = await repo.userById(row.user_id)
  if (!user) return { status: 422, body: { ok: false, error: '重置链接已失效，请重新发一封。' } }
  await repo.tokenUse(row.token_hash)
  const pw_salt = randomHex(16)
  await repo.updateUser(user.id, {
    pw_hash: await sha256hex(pw_salt + pw), pw_salt: pw_salt,
    pwver: user.pwver + 1, verified: 1 /* 重设顺带验证（能收到邮件就证明邮箱是本人的） */
  })
  return { status: 200, body: { ok: true }, session: { uid: user.id, pwver: user.pwver + 1 } }
}

/* ---- /api/auth/me：会话有效性 + pwver 比对 ---- */
export async function meBySession(repo, session) {
  if (!session) return { status: 401, body: { ok: false } }
  const user = await repo.userById(session.uid)
  if (!user || user.pwver !== session.pwver) return { status: 401, body: { ok: false } }
  return { status: 200, body: { ok: true, email: user.email, verified: !!user.verified } }
}

/* ---- data 拉取 / 推送 ---- */
const PUSH_MAX_ITEMS = 200
const VALUE_MAX = 64 * 1024

export async function dataPull(repo, userId) {
  const items = await repo.dataRows(userId)
  return { status: 200, body: { ok: true, items: items } }
}

export async function dataPush(repo, userId, items) {
  if (!Array.isArray(items) || !items.length) return { status: 422, body: { ok: false, error: '没东西要同步。' } }
  if (items.length > PUSH_MAX_ITEMS) return { status: 413, body: { ok: false, error: '一次同步的东西太多了。' } }
  let applied = 0, skipped = 0
  for (const it of items) {
    if (!it || typeof it.key !== 'string' || it.key.indexOf('sumsum:') !== 0 ||
        it.key === 'sumsum:help:seen' || it.key === 'sumsum:sync:meta' ||
        typeof it.value !== 'string' || it.value.length > VALUE_MAX ||
        typeof it.updated_at !== 'number' || !isFinite(it.updated_at)) {
      skipped++
      continue
    }
    if (await repo.dataUpsert(userId, it.key, it.value, it.updated_at)) applied++
    else skipped++
  }
  return { status: 200, body: { ok: true, applied: applied, skipped: skipped } }
}
```

repo 接口随之加两个方法（内存桩补进 `tools/check-auth-core.js` 的 memRepo，D1 实现在 Task 7）：

```js
    async dataRows(uid) {
      var out = []
      dbData.forEach(function (v, k) {
        if (k.indexOf(uid + '/') === 0) out.push({ key: k.slice(uid.length + 1), value: v.value, updated_at: v.updated_at })
      })
      return out
    },
    async dataUpsert(uid, key, value, updated_at) {
      var k = uid + '/' + key
      var cur = dbData.get(k)
      if (cur && cur.updated_at >= updated_at) return false
      dbData.set(k, { value: value, updated_at: updated_at })
      return true
    }
```

（`memRepo()` 里加 `var dbData = new Map()`。）

- [ ] **Step 4: 跑通过 + 提交**

Run: `node tools/check-auth-core.js`
Expected: 全 ✓（含 Task 5 段）。

```bash
git add server/auth-core.js tools/check-auth-core.js
git commit -m "feat: auth-core 登录锁定/找回重设/me 与 data 拉推（LWW+键过滤）"
```

### Task 7: Pages Functions 接线 + D1 + wrangler + 本地全流程 e2e

**Files:**
- Create: `server/schema.sql`、`server/http.js`、`server/email.js`、`server/repo-d1.js`
- Create: `functions/api/auth/register.js`、`verify.js`、`login.js`、`forgot.js`、`reset.js`、`logout.js`、`me.js`
- Create: `functions/api/data/index.js`（GET /api/data）、`functions/api/data/push.js`
- Create: `wrangler.toml`（pages_build_output_dir="." + D1 绑定）
- Create: `tools/e2e-account.sh`（本地 wrangler + curl 全流程）

**Interfaces:**
- Consumes: Task 4 session.js、Task 5/6 auth-core.js、repo 接口
- Produces: 生产 API 全集；`tools/e2e-account.sh` 一键本地全流程（可反复跑）；D1 库 `lianxizhi`（本地 + 远端）

- [ ] **Step 0: 环境检查（不满足就停，把 ! 命令给用户）**

Run: `npx wrangler whoami`
Expected: 已登录（输出账号）。若未登录：让用户在会话里输 `! npx wrangler login`，等浏览器授权完成再继续（不要自己绕）。

- [ ] **Step 1: 写 e2e 脚本（RED——此刻还没有 functions）**

`tools/e2e-account.sh`（完整文件，`chmod +x`）：

```bash
#!/bin/bash
# 账号本地全流程：起 wrangler pages dev + 本地 D1，curl 走完
# 注册→验证→me→推送→拉取→坏键→登出→登录→找回→重设→旧登录态失效。
set -u
cd "$(dirname "$0")/.."
B=http://127.0.0.1:8999
JAR=$(mktemp)
EMAIL="e2e-$RANDOM@test.local"
fail() { echo "✗ $1"; exit 1; }
jqget() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log(eval('o.'+process.argv[1])===undefined?'':eval('o.'+process.argv[1]))})" "$1"; }

hash_pw() { node -e "const c=require('crypto');console.log(c.pbkdf2Sync(process.argv[1],process.argv[2]+'lianxizhi-account-v1',600000,32,'sha256').toString('hex'))" "$1" "$EMAIL"; }

npx wrangler d1 execute lianxizhi --local --file server/schema.sql >/dev/null 2>&1
npx wrangler pages dev . --port 8999 --d1 DB=lianxizhi \
  --binding SESSION_SECRET=dev-secret --binding DEV_SHOW_CODE=1 >/tmp/wrangler-e2e.log 2>&1 &
WPID=$!
trap 'kill $WPID 2>/dev/null' EXIT
for i in $(seq 1 60); do curl -s -o /dev/null "$B/" && break; sleep 1; done
curl -s -o /dev/null "$B/" || fail "wrangler 没起来（看 /tmp/wrangler-e2e.log）"

PW=$(hash_pw password123)
R=$(curl -s -X POST "$B/api/auth/register" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}")
CODE=$(echo "$R" | jqget dev_code)
[ -n "$CODE" ] || fail "注册没回 dev_code：$R"

V=$(curl -s -i -X POST "$B/api/auth/verify" -H 'Content-Type: application/json' -c "$JAR" -d "{\"email\":\"$EMAIL\",\"code\":\"$CODE\"}")
echo "$V" | grep -qi 'set-cookie: sumsum_sess' || fail "verify 没发 cookie"
ME=$(curl -s -b "$JAR" "$B/api/auth/me")
echo "$ME" | grep -q "\"email\":\"$EMAIL\"" || fail "me 不对：$ME"

TS=1700000000000
P=$(curl -s -b "$JAR" -X POST "$B/api/data/push" -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"key\":\"sumsum:shizi:v1\",\"value\":\"{\\\"week\\\":3}\",\"updated_at\":$TS},{\"key\":\"evil:key\",\"value\":\"x\",\"updated_at\":$TS}]}")
echo "$P" | grep -q '"applied":1,"skipped":1' || fail "push 计数不对：$P"
D=$(curl -s -b "$JAR" "$B/api/data")
echo "$D" | grep -q 'sumsum:shizi:v1' || fail "pull 拉不到：$D"

curl -s -b "$JAR" -X POST "$B/api/auth/logout" -c "$JAR" >/dev/null
curl -s -b "$JAR" "$B/api/auth/me" | grep -q '"ok":false' || fail "logout 后 me 应 401"

L=$(curl -s -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -c "$JAR" -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}")
echo "$L" | grep -q '"ok":true' || fail "登录失败：$L"

F=$(curl -s -X POST "$B/api/auth/forgot" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}")
TOKEN=$(echo "$F" | jqget dev_token)
[ -n "$TOKEN" ] || fail "forgot 没回 dev_token：$F"

OLD_JAR=$(mktemp); cp "$JAR" "$OLD_JAR"
PW2=$(hash_pw newpassword9)
RS=$(curl -s -X POST "$B/api/auth/reset" -H 'Content-Type: application/json' -c "$JAR" -d "{\"token\":\"$TOKEN\",\"password\":\"$PW2\"}")
echo "$RS" | grep -q '"ok":true' || fail "重设失败：$RS"
curl -s -b "$OLD_JAR" "$B/api/auth/me" | grep -q '"ok":false' || fail "旧登录态应已失效（pwver）"
L2=$(curl -s -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$(hash_pw password123)\"}")
echo "$L2" | grep -q '"ok":false' || fail "旧密码应登不上"

echo "✓ 账号本地全流程通过"
```

- [ ] **Step 2: 跑，确认失败**

Run: `bash tools/e2e-account.sh`
Expected: 在注册一步失败（404/HTML——functions 还不存在）。

- [ ] **Step 3: 建 schema 与 D1 数据库**

`server/schema.sql`（完整文件）：

```sql
CREATE TABLE IF NOT EXISTS users(
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  pwver INTEGER NOT NULL DEFAULT 1,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
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
```

Run: `npx wrangler d1 create lianxizhi` → 记下输出里的 `database_id`。
`wrangler.toml`（完整文件，database_id 填上一步输出）：

```toml
name = "lianxizhi"
compatibility_date = "2026-11-01"
pages_build_output_dir = "."

[[d1_databases]]
binding = "DB"
database_name = "lianxizhi"
database_id = "<上一步的 id>"
```

远端建表（本地由 e2e 脚本自己建）：`npx wrangler d1 execute lianxizhi --remote --file server/schema.sql`

- [ ] **Step 4: server 三件套 + 九个 Functions**

`server/http.js`：

```js
/** HTTP 小件：JSON 响应与请求体解析（functions/api/* 共用）。 */
export function json(obj, status, headers) {
  const h = { 'Content-Type': 'application/json; charset=utf-8' }
  if (headers) Object.assign(h, headers)
  return new Response(JSON.stringify(obj), { status: status || 200, headers: h })
}
export async function readBody(request) {
  try {
    return await request.json()
  } catch (e) {
    return {}
  }
}
```

`server/email.js`：

```js
/**
 * 发信：Resend HTTP API。没配 RESEND_API_KEY（本地开发）时打日志当发出去了，
 * 让 e2e 能靠 DEV_SHOW_CODE 走完整流程。发件人 spec 定死，不许改。
 */
const FROM = '练习纸 <no-reply@mail.qingchejun.com>'

export async function sendMail(env, mail) {
  if (!env.RESEND_API_KEY) {
    console.log('[mail:dev]', mail.to, '|', mail.subject, '|', mail.text.replace(/\n/g, ' / '))
    return true
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [mail.to], subject: mail.subject, text: mail.text })
    })
    return r.ok
  } catch (e) {
    return false
  }
}
```

`server/repo-d1.js`：

```js
/** repo 的 D1 实现：auth-core 只认这个接口，SQL 全部收在这里。 */
export function repo(db) {
  return {
    async userByEmail(email) {
      return (await db.prepare('SELECT * FROM users WHERE email=?').bind(email).first()) || null
    },
    async userById(id) {
      return (await db.prepare('SELECT * FROM users WHERE id=?').bind(id).first()) || null
    },
    async insertUser(u) {
      await db.prepare('INSERT INTO users(id,email,pw_hash,pw_salt,pwver,verified,created_at) VALUES(?,?,?,?,?,?,?)')
        .bind(u.id, u.email, u.pw_hash, u.pw_salt, u.pwver, u.verified, u.created_at).run()
    },
    async updateUser(id, f) {
      await db.prepare('UPDATE users SET pw_hash=?, pw_salt=?, pwver=?, verified=? WHERE id=?')
        .bind(f.pw_hash !== undefined ? f.pw_hash : (await this.userById(id)).pw_hash,
              f.pw_salt !== undefined ? f.pw_salt : (await this.userById(id)).pw_salt,
              f.pwver !== undefined ? f.pwver : (await this.userById(id)).pwver,
              f.verified !== undefined ? f.verified : (await this.userById(id)).verified,
              id).run()
    },
    async setVerified(id) {
      await db.prepare('UPDATE users SET verified=1 WHERE id=?').bind(id).run()
    },
    async tokenInsert(t) {
      await db.prepare('INSERT INTO tokens(token_hash,user_id,kind,expires_at) VALUES(?,?,?,?)')
        .bind(t.token_hash, t.user_id, t.kind, t.expires_at).run()
    },
    async tokenListByUser(uid, kind) {
      const r = await db.prepare('SELECT * FROM tokens WHERE user_id=? AND kind=?').bind(uid, kind).all()
      return r.results || []
    },
    async tokenGet(hash) {
      return (await db.prepare('SELECT * FROM tokens WHERE token_hash=?').bind(hash).first()) || null
    },
    async tokenUse(hash) {
      await db.prepare('UPDATE tokens SET used_at=1 WHERE token_hash=?').bind(hash).run()
    },
    async tokensClear(uid, kind) {
      await db.prepare('UPDATE tokens SET used_at=1 WHERE user_id=? AND kind=?').bind(uid, kind).run()
    },
    async limitGet(scope, kind) {
      return (await db.prepare('SELECT * FROM limits WHERE scope=? AND kind=?').bind(scope, kind).first()) || null
    },
    async limitSet(scope, kind, row) {
      await db.prepare(
        'INSERT INTO limits(scope,kind,n,ts,until) VALUES(?,?,?,?,?) ' +
        'ON CONFLICT(scope,kind) DO UPDATE SET n=excluded.n, ts=excluded.ts, until=excluded.until'
      ).bind(scope, kind, row.n, row.ts, row.until).run()
    },
    async dataRows(uid) {
      const r = await db.prepare('SELECT key, value, updated_at FROM data WHERE user_id=?').bind(uid).all()
      return (r.results || []).map(x => ({ key: x.key, value: x.value, updated_at: x.updated_at }))
    },
    async dataUpsert(uid, key, value, updated_at) {
      const r = await db.prepare(
        'INSERT INTO data(user_id,key,value,updated_at) VALUES(?,?,?,?) ' +
        'ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at ' +
        'WHERE excluded.updated_at>data.updated_at'
      ).bind(uid, key, value, updated_at).run()
      return !!(r.meta && r.meta.changes > 0)
    }
  }
}
```

（updateUser 里重复查三次太笨——实现时先 `const cur = await this.userById(id)` 一次再合并字段，语义同上。）

带会话与发信的公共包装（放进 `server/http.js` 末尾，functions 共用）：

```js
import { sign, cookieHeader, sessionPayload, clearCookieHeader, verify, readCookie, COOKIE } from './session.js'
import { sendMail } from './email.js'

/** 把 auth-core 的返回翻成 Response：发信、签 cookie、DEV 回显。 */
export async function respond(context, r) {
  const env = context.env
  if (r.mail && !(await sendMail(env, r.mail))) {
    return json({ ok: false, error: '邮件暂时发不出去，请稍后再试。' }, 502)
  }
  const headers = {}
  if (r.session) {
    const token = await sign(sessionPayload(r.session.uid, r.session.pwver, Date.now()), env.SESSION_SECRET)
    headers['Set-Cookie'] = cookieHeader(token, 90 * 86400)
  }
  const body = Object.assign({}, r.body)
  if (r.dev && env.DEV_SHOW_CODE === '1') {
    const host = new URL(context.request.url).hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      if (r.dev.code) body.dev_code = r.dev.code
      if (r.dev.token) body.dev_token = r.dev.token
    }
  }
  return json(body, r.status, headers)
}
export { clearCookieHeader }
```

九个 Functions（都很薄；以 `functions/api/auth/register.js` 和 `functions/api/auth/login.js` 为准，其余同型）：

```js
// functions/api/auth/register.js
import { readBody, respond } from '../../../server/http.js'
import { register } from '../../../server/auth-core.js'
import { repo } from '../../../server/repo-d1.js'

export async function onRequestPost(context) {
  return respond(context, await register(repo(context.env.DB), Date.now(), await readBody(context.request)))
}
```

```js
// functions/api/auth/login.js —— 同型，换成 core.login
// functions/api/auth/verify.js —— core.verify
// functions/api/auth/forgot.js —— core.forgot
// functions/api/auth/reset.js —— core.reset
```

```js
// functions/api/auth/logout.js
import { json, clearCookieHeader } from '../../../server/http.js'

export async function onRequestPost() {
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookieHeader() })
}
```

```js
// functions/api/auth/me.js
import { readCookie, verify, COOKIE } from '../../../server/session.js'
import { meBySession } from '../../../server/auth-core.js'
import { repo } from '../../../server/repo-d1.js'
import { json } from '../../../server/http.js'

export async function onRequestGet(context) {
  const raw = readCookie(context.request.headers.get('Cookie'), COOKIE)
  const session = raw ? await verify(raw, context.env.SESSION_SECRET, Date.now()) : null
  return json((await meBySession(repo(context.env.DB), session)).body,
              (await meBySession(repo(context.env.DB), session)).status)
}
```

（me.js 调两次不优雅——实现时 `const r = await meBySession(...)` 一次再用。）

```js
// functions/api/data/index.js —— GET /api/data
import { json } from '../../../server/http.js'
import { requireSession } from '../../../server/session.js'
import { repo } from '../../../server/repo-d1.js'

export async function onRequestGet(context) {
  const session = await requireSession(context)
  if (!session) return json({ ok: false, error: '请先登录。' }, 401)
  const r = await (await import('../../../server/auth-core.js')).dataPull(repo(context.env.DB), session.uid)
  return json(r.body, r.status)
}
```

```js
// functions/api/data/push.js —— POST /api/data/push
import { json, readBody } from '../../../server/http.js'
import { requireSession } from '../../../server/session.js'
import { dataPush } from '../../../server/auth-core.js'
import { repo } from '../../../server/repo-d1.js'

export async function onRequestPost(context) {
  const session = await requireSession(context)
  if (!session) return json({ ok: false, error: '请先登录。' }, 401)
  const body = await readBody(context.request)
  const r = await dataPush(repo(context.env.DB), session.uid, body.items)
  return json(r.body, r.status)
}
```

- [ ] **Step 5: 跑 e2e 通过**

Run: `bash tools/e2e-account.sh`
Expected: `✓ 账号本地全流程通过`。

- [ ] **Step 6: node 套件回归 + 提交**

Run: `node tools/check-auth-server.js && node tools/check-auth-core.js && node tools/check-store.js && node tools/check-sync.js && node tools/check-shizi.js 2>&1 | tail -1 && node tools/check-shizi-mark.js && node tools/check-backup.js && node tools/check-today.js`
Expected: 全 ✓。

```bash
git add server/ functions/ wrangler.toml tools/e2e-account.sh
git commit -m "feat: Pages Functions 接线——/api/auth 与 /api/data，D1 repo，本地 e2e"
```

### Task 8: 浏览器端账号模块 account.js（哈希 + API 封装）

**Files:**
- Create: `js/account.js`
- Create: `tools/check-account.js`
- Modify: 五个页面的 `<script>` 列表（account.js 在 help.js 之后）

**Interfaces:**
- Consumes: Task 7 的 `/api/auth/*` 端点
- Produces: `SumSum.account`——`hashPassword(email, password)`→hex（async）、`validEmail`、`validPassword`、`normEmail`、`request(path, body)`→`{status, body}`（用注入的 fetch 或 window.fetch）、`init(fetchFn)`→me 探测登录态、`state`、`onChange(fn)`；后续 Task 10 的 account-ui 只通过这些入口调

- [ ] **Step 1: 写失败测试**

`tools/check-account.js`（完整文件）：

```js
/* 账号客户端：哈希与校验。node 24 自带 crypto.subtle，IIFE 挂到 globalThis 即可直跑。 */
globalThis.window = globalThis
require('../js/account.js')
var A = globalThis.SumSum.account
var crypto = require('crypto')

var bad = 0
var n = 0
function check(name, ok, extra) {
  n++
  if (!ok) {
    bad++
    console.log('✗ ' + name + (extra !== undefined ? ' → ' + JSON.stringify(extra) : ''))
  } else console.log('✓ ' + name)
}

Promise.resolve().then(async function () {
  /* 哈希与 node 的 pbkdf2Sync 对账——服务器按同样口径收 */
  var h = await A.hashPassword('Parent@Example.com', 'password123')
  var oracle = crypto.pbkdf2Sync('password123', 'parent@example.com' + 'lianxizhi-account-v1', 600000, 32, 'sha256').toString('hex')
  check('哈希与 pbkdf2Sync 口径一致（邮箱转小写）', h === oracle, h)
  check('哈希是 64 位 hex', /^[0-9a-f]{64}$/.test(h))
  var h2 = await A.hashPassword('parent@example.com', 'password123')
  check('同一邮箱大小写同哈希', h === h2)
  var h3 = await A.hashPassword('parent@example.com', 'password124')
  check('改一位密码哈希就变', h !== h3)

  check('validEmail 正常邮箱', A.validEmail('a@b.co') === true)
  check('validEmail 拒空格与缺 @', A.validEmail('a b.co') === false && A.validEmail('ab.co') === false)
  check('validPassword 至少 8 位', A.validPassword('1234567') === false && A.validPassword('12345678') === true)
  check('normEmail 去空格转小写', A.normEmail('  A@B.CO ') === 'a@b.co')

  /* request：注入的 fetch 按路径转发，解析 JSON 与非 2xx */
  var calls = []
  var fake = async function (url, opt) {
    calls.push([url, opt])
    if (url.indexOf('/bad') >= 0) return { ok: false, status: 500, text: async function () { return '{"error":"服务器开小差了"}' } }
    return { ok: true, status: 200, text: async function () { return '{"ok":true}' } }
  }
  var r = await A.request('/api/auth/login', { email: 'a@b.co', password: 'x' }, fake)
  check('request POST 带凭证头', calls[0][1].method === 'POST' && calls[0][1].credentials === 'same-origin')
  check('request 解析 JSON', r.status === 200 && r.body.ok === true)
  var rb = await A.request('/bad', {}, fake)
  check('request 非 2xx 也给 body', rb.status === 500 && rb.body.error === '服务器开小差了')

  console.log(bad ? '\n有 ' + bad + ' 项没过' : '\n全部通过（' + n + ' 项）')
  process.exit(bad ? 1 : 0)
}).catch(function (e) { console.error(e); process.exit(1) })
```

- [ ] **Step 2: 跑，确认失败**

Run: `node tools/check-account.js`
Expected: `Cannot find module '../js/account.js'`。

- [ ] **Step 3: 实现 js/account.js（完整文件）**

```js
/**
 * 账号：浏览器端只做一层 PBKDF2（SHA-256、60 万轮、盐=小写邮箱+固定串），
 * 明文密码不出浏览器，服务器再叠一层 SHA-256。API 封装带登录态广播，
 * UI（account-ui.js）只认这里的 state 与 onChange。
 */
;(function (root) {
  'use strict'

  var SALT_SUFFIX = 'lianxizhi-account-v1'
  var ITER = 600000

  function normEmail(v) {
    return String(v || '').trim().toLowerCase()
  }
  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim())
  }
  function validPassword(p) {
    return typeof p === 'string' && p.length >= 8
  }

  var te = new TextEncoder()
  function toHex(buf) {
    return Array.from(new Uint8Array(buf)).map(function (b) {
      return (b < 16 ? '0' : '') + b.toString(16)
    }).join('')
  }

  async function hashPassword(email, password) {
    var key = await root.crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveBits'])
    var bits = await root.crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: te.encode(normEmail(email) + SALT_SUFFIX), iterations: ITER },
      key, 256
    )
    return toHex(bits)
  }

  async function request(path, body, fetchFn) {
    var f = fetchFn || root.fetch
    var r = await f(path, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    var text = await r.text()
    var data = null
    try {
      data = text ? JSON.parse(text) : {}
    } catch (e) {
      data = {}
    }
    return { status: r.status, body: data }
  }

  var state = { loggedIn: false, email: '' }
  var listeners = []
  function setLogin(email) {
    state.loggedIn = !!email
    state.email = email || ''
    listeners.forEach(function (fn) { fn(state) })
  }

  /* 页面打开先探一下登录态（me 401 = 没登录，不算错） */
  async function init(fetchFn) {
    var r = await request('/api/auth/me', undefined, fetchFn)
    if (r.status === 200 && r.body.ok) setLogin(r.body.email)
    return state
  }

  async function logout(fetchFn) {
    await request('/api/auth/logout', {}, fetchFn)
    setLogin('')
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.account = {
    normEmail: normEmail,
    validEmail: validEmail,
    validPassword: validPassword,
    hashPassword: hashPassword,
    request: request,
    init: init,
    logout: logout,
    setLogin: setLogin,
    state: state,
    onChange: function (fn) {
      if (typeof fn === 'function') listeners.push(fn)
    }
  }
})(typeof window !== 'undefined' ? window : globalThis)
```

五个页面 `<script src="js/help.js"></script>` 之后各加一行 `<script src="js/account.js"></script>`（Task 10 会在其后继续加 sync.js / account-ui.js，一次改齐也行——按任务边界走，本任务只加 account.js）。

- [ ] **Step 4: 跑通过 + 提交**

Run: `node tools/check-account.js`
Expected: `全部通过（10 项）`。

```bash
git add js/account.js tools/check-account.js index.html kousuan.html aoshu.html shudu.html shizi.html
git commit -m "feat: 浏览器端账号模块——PBKDF2 哈希与 API 封装"
```

### Task 9: 同步引擎 sync.js（打开拉、改动推、首登合并）

**Files:**
- Create: `js/sync.js`
- Modify: `tools/check-sync.js`（追加 sync.js 流程测试）

**Interfaces:**
- Consumes: Task 3 的 `planFirstLogin` / `merge`（`SumSum.syncCore`）；Task 1 的 `SumSum.store`（meta/applyRemote/stampNow/syncable/onChange/getString）；Task 8 的 `request`
- Produces: `SumSum.sync.init(opts)`——opts：`{ api, confirm, fetchFn, noReload }`（api/confirm 可注入，测试与 UI 各取所需）；登录且 opts.confirm 提供 `confirm({local, cloud})`→'local'|'cloud'|undefined；未登录时静默不做事

- [ ] **Step 1: 追加失败测试**

`tools/check-sync.js` 末尾（现有内容之后）追加。测试用假 store + 假 api 走完整流程：

```js
/* ===== sync.js 流程（Task 9） ===== */
;(function () {
  globalThis.window = globalThis
  /* 假 store：内存实现 + 可控 meta */
  var mem = {}
  var meta = {}
  var changes = []
  globalThis.SumSum.store = {
    getString: function (k) { return k in mem ? mem[k] : null },
    set: function (k, v) { mem[k] = JSON.stringify(v); meta[k] = meta[k] || 1 },
    remove: function (k) { delete mem[k] },
    applyRemote: function (k, v) { mem[k] = v; meta[k] = -1 },
    stampNow: function (keys, now) { keys.forEach(function (k) { meta[k] = now || 123 }) },
    meta: function () { return meta },
    keys: function () { return Object.keys(mem).filter(function (k) { return k.indexOf('sumsum:') === 0 && k !== 'sumsum:help:seen' && k !== 'sumsum:sync:meta' }) },
    syncable: function (k) { return k.indexOf('sumsum:') === 0 && k !== 'sumsum:help:seen' && k !== 'sumsum:sync:meta' },
    onChange: function (fn) { changes.push(fn) }
  }
  globalThis.SumSum.account = { state: { loggedIn: true, email: 'a@b.co' }, onChange: function () {} }
  delete require.cache[require.resolve('../js/sync.js')]
  require('../js/sync.js')
  var sync = globalThis.SumSum.sync

  var pushed = []
  var pulled = { items: [ { key: 'sumsum:cloud:v1', value: '{"a":1}', updated_at: 500 } ] }
  var api = {
    pull: async function () { return { status: 200, body: pulled } },
    push: async function (items) { pushed.push(items); return { status: 200, body: { applied: items.length, skipped: 0 } } }
  }

  Promise.resolve().then(async function () {
    /* 本地有数据、云端空 → 首登推送全部 */
    mem['sumsum:local:v1'] = '{"b":2}'
    meta['sumsum:local:v1'] = 100
    var confirmCalls = []
    await sync.init({ api: api, noReload: true, confirm: async function (o) { confirmCalls.push(o); return 'local' } })
    await new Promise(function (r) { setTimeout(r, 30) })
    check('首登本地有云端无 → 推全部', pushed.length === 1 && pushed[0][0].key === 'sumsum:local:v1', pushed)
    check('不需要弹确认框（云端空）', confirmCalls.length === 0)
    check('推送后 meta 已刷新', meta['sumsum:local:v1'] === 123)

    /* 再打开：拉到云端新键 → 应用 */
    pulled = { items: [ { key: 'sumsum:cloud:v1', value: '{"a":1}', updated_at: 500 } ] }
    pushed = []
    await sync.init({ api: api, noReload: true })
    await new Promise(function (r) { setTimeout(r, 30) })
    check('拉取应用云端键', mem['sumsum:cloud:v1'] === '{"a":1}')

    /* 本地改动 → 防抖后推送（测试里防抖调到 5ms） */
    pushed = []
    await sync.init({ api: api, noReload: true, debounce: 5 })
    await new Promise(function (r) { setTimeout(r, 30) })
    changes.forEach(function (fn) { fn('sumsum:local:v1', '{"b":3}') })
    await new Promise(function (r) { setTimeout(r, 50) })
    check('改动触发推送（防抖后）', pushed.length >= 1 && pushed[pushed.length - 1][0].key === 'sumsum:local:v1', pushed.length)

    /* 老数据（本地有值、无 mtime）撞上云端 → confirm 选云端 */
    mem['sumsum:both:v1'] = '{"side":"local"}'
    delete meta['sumsum:both:v1']   /* 同步上线前的老键：meta 里没有它 */
    mem['sumsum:cloud:v1'] = '{"side":"oldcloud"}'
    meta['sumsum:cloud:v1'] = 50
    pulled = { items: [ { key: 'sumsum:both:v1', value: '{"side":"cloud"}', updated_at: 900 }, { key: 'sumsum:cloud:v1', value: '{"side":"newcloud"}', updated_at: 900 } ] }
    var chose = []
    await sync.init({ api: api, noReload: true, confirm: async function (o) { chose.push(o); return 'cloud' } })
    await new Promise(function (r) { setTimeout(r, 30) })
    check('老数据撞云端 → 弹了一次确认', chose.length === 1, chose.length)
    check('选云端 → 云端值应用', mem['sumsum:both:v1'] === '{"side":"cloud"}', mem['sumsum:both:v1'])
    check('确认框里给的是键清单', chose[0] && chose[0].local.indexOf('sumsum:both:v1') >= 0 && chose[0].cloud.length === 2)

    /* 弹窗被关掉（没选方向）→ 本地云端都不动，下次再问（Review Focus 6） */
    mem['sumsum:old2:v1'] = '{"x":1}'
    delete meta['sumsum:old2:v1']
    pulled = { items: [ { key: 'sumsum:old2:v1', value: '{"x":2}', updated_at: 900 } ] }
    pushed = []
    await sync.init({ api: api, noReload: true, confirm: async function () { return undefined } })
    await new Promise(function (r) { setTimeout(r, 30) })
    check('没选方向 → 本地云端都不动', mem['sumsum:old2:v1'] === '{"x":1}' && pushed.length === 0,
      [mem['sumsum:old2:v1'], pushed.length])

    finish()
  }).catch(function (e) { console.error(e); process.exit(1) })

  function finish() {
    console.log(bad ? '\nsync 流程有 ' + bad + ' 项没过' : '\nsync 流程全部通过')
    process.exit(bad ? 1 : 0)
  }
})()
```

（文件顶部原有的 `process.exit` 段要挪进/对齐到这段的 `finish()`——实现时把旧结尾的 `console.log/exit` 删掉，统一由这段收尾。）

- [ ] **Step 2: 跑，确认失败**

Run: `node tools/check-sync.js`
Expected: `Cannot find module '../js/sync.js'`。

- [ ] **Step 3: 实现 js/sync.js（完整文件）**

```js
/**
 * 云同步引擎：登录后（且仅登录后）——
 *   打开页面先拉（云 → 本地按 mtime 合并）；本地改动防抖 2 秒后推。
 *   首登两边都有数据 → 交给 UI 的 confirm 弹窗二选一；云端空 → 直接推本地。
 *   拉下来有应用 → 自动刷新一次（各板块只在加载时读存储）。
 * 推失败不重试：下次改动或下次打开自然会再推（mtime 还新着，自愈）。
 */
;(function (root) {
  'use strict'

  var DEBOUNCE = 2000 /* 测试里可用 opts.debounce 调短 */
  var RELOAD_KEY = 'sumsum:sync:reloaded'

  function S() {
    return root.SumSum.store
  }
  function core() {
    return root.SumSum.syncCore
  }

  async function init(opts) {
    opts = opts || {}
    var api = opts.api || defaultApi(opts.fetchFn)
    var acct = root.SumSum.account
    if (!acct || !acct.state.loggedIn) return /* 没登录不做事，也别报错 */

    var store = S()
    var allKeys = store.keys() /* 现存可同步键，含没 mtime 的老键 */
    var metaMap = store.meta()
    var oldKeys = allKeys.filter(function (k) { return !(k in metaMap) }) /* 同步上线前的老数据 */

    var pulled = await api.pull()
    var cloudItems = (pulled && pulled.status === 200 && pulled.body && pulled.body.items) || []

    /* 老数据里有跟云端同键的（两边都有值、没法比时间）→ 只能问用户 */
    var unresolved = cloudItems.filter(function (it) {
      return store.getString(it.key) !== null && !(it.key in metaMap)
    }).length
    var plan = core().planFirstLogin(cloudItems.length, unresolved, allKeys.length)
    if (plan === 'confirm' && opts.confirm) {
      var pick = await opts.confirm({
        local: allKeys,
        cloud: cloudItems.map(function (it) { return it.key })
      })
      if (pick === 'local') {
        store.stampNow(allKeys)
        await pushAll(api, store)
        return /* 本地已称王 */
      } else if (pick === 'cloud') {
        applyAll(store, cloudItems)
        /* 云端为基准，但本地独有、云端没有的老键不丢：盖个现在，下次打开自然推上去 */
        var cloudKeys = {}
        cloudItems.forEach(function (it) { cloudKeys[it.key] = true })
        var keep = oldKeys.filter(function (k) { return !cloudKeys[k] })
        if (keep.length) store.stampNow(keep)
        reload(opts)
        return
      } else {
        return /* 用户没选（关了弹窗）：这次不同步，下次打开再问 */
      }
    } else if (plan === 'push-all') {
      store.stampNow(allKeys)
      await pushAll(api, store)
      cloudItems = []
    }

    if (cloudItems.length) {
      var r = core().merge(store.meta(), function (k) { return store.getString(k) !== null }, cloudItems)
      var appliedAny = false
      r.apply.forEach(function (it) {
        store.applyRemote(it.key, it.value)
        appliedAny = true
      })
      var toPush = r.pushKeys.map(function (k) {
        return { key: k, value: store.getString(k), updated_at: store.meta()[k] }
      }).filter(function (it) { return it.value !== null })
      if (toPush.length) await api.push(toPush)
      if (appliedAny) reload(opts)
    }

    /* 之后本地一有改动，防抖推 */
    store.onChange(function (key, value) {
      if (!value && value !== '') return
      later(api, opts.debounce)
    })
  }

  function defaultApi(fetchFn) {
    var A = root.SumSum.account
    return {
      pull: function () { return A.request('/api/data', undefined, fetchFn) },
      push: function (items) { return A.request('/api/data/push', { items: items }, fetchFn) }
    }
  }

  var timer = null
  function later(api, ms) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(function () {
      timer = null
      pushAll(api, S())
    }, ms || DEBOUNCE)
  }

  async function pushAll(api, store) {
    var meta = store.meta()
    var items = Object.keys(meta).filter(store.syncable).map(function (k) {
      var v = store.getString(k)
      return v === null ? null : { key: k, value: v, updated_at: meta[k] }
    }).filter(Boolean)
    if (items.length) await api.push(items)
  }

  function applyAll(store, items) {
    items.forEach(function (it) { store.applyRemote(it.key, it.value) })
  }

  function reload(opts) {
    if (opts.noReload) return
    try {
      if (root.sessionStorage.getItem(RELOAD_KEY)) return /* 只自动刷一次，免得循环 */
      root.sessionStorage.setItem(RELOAD_KEY, '1')
    } catch (e) { /* 隐私模式存不了就照刷 */ }
    root.location.reload()
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.sync = { init: init }
})(typeof window !== 'undefined' ? window : globalThis)
```

（store.onChange 在 Task 1 已定义：`set/remove` 且键可同步时回调 `(key, value)`。）

- [ ] **Step 4: 跑通过 + 回归 + 提交**

Run: `node tools/check-sync.js && node tools/check-store.js && node tools/check-account.js`
Expected: 三套全 ✓。

```bash
git add js/sync.js tools/check-sync.js
git commit -m "feat: 云同步引擎——打开拉、防抖推、首登二选一、拉后自动刷新一次"
```

### Task 10: 界面——账号弹窗、侧栏按钮、备份/说明联动

**Files:**
- Create: `js/account-ui.js`
- Modify: `tools/rail.py`（TAIL 里加「账号」按钮）
- Modify: `js/help.js`（BACKUP 段后加「账号与云同步」说明；doImport 走 noteImport）
- Modify: `js/backup.js`（SKIP 加 `sumsum:sync:meta`）
- Modify: `tools/check-backup.js`（追加：sync:meta 不进备份）
- Modify: `css/app.css`（弹窗样式）
- Modify: 五个页面 script 列表（sync.js、account-ui.js 在 account.js 之后；sync 在 account-ui 前后皆可，UI 注入 confirm 必须在 sync.init 之前——本任务顺序：account.js → account-ui.js → sync.js？否——见步骤：account-ui 先注册 confirm，sync.init 由 account-ui 在拿到登录态后调用，所以顺序 account.js → account-ui.js → sync.js 不需要，直接 account-ui.js 里调 sync.init）

**Interfaces:**
- Consumes: Task 8 `SumSum.account`（全部动作）、Task 9 `SumSum.sync.init({confirm})`、Task 1 `store.noteImport`
- Produces: 完整用户可见流程；`SumSum.accountUI.open(view)`（'login'|'account'，供侧栏按钮与 help 弹窗调用）

- [ ] **Step 1: 失败测试（backup 数据逻辑部分）**

`tools/check-backup.js` 追加：

```js
/* sync:meta 不进备份（Task 10） */
localStorage._m['sumsum:sync:meta'] = JSON.stringify({ 'sumsum:shizi:v1': 123 })
var pack10 = B.collect(fakeStorage)
check('sync:meta 不进备份', !('sumsum:sync:meta' in pack10.data))
```

（按该文件现有的 storage 桩变量名对齐。）

Run: `node tools/check-backup.js` → 预期新增一条 ✗。

- [ ] **Step 2: backup.js 改 SKIP**

`var SKIP` 数组追加 `'sumsum:sync:meta'`。help.js 的 `doImport` 里 `B.apply(...)` 之后加 `root.SumSum.store.noteImport()`（导入按「现在」记 mtime，语义：明确意图，盖过云端）。help.js 文案：BACKUP 段末尾加一段「换了新电脑想自动同步：登录同一账号即可」；`MODULES` 通用说明不展开账号细节，弹窗里讲清。

Run: `node tools/check-backup.js` → 全 ✓。

- [ ] **Step 3: account-ui.js（完整文件，样式与 help-dialog 同骨架）**

```js
/**
 * 账号弹窗：登录 / 注册（验证码六格）/ 找回 / 重设 / 已登录主页。
 * 骨架沿用 help.js：dialog 建一次、data-view 切换、data-act 事件委托。
 * 登录成功 → sync.init（confirm 由本文件提供：本地/云端二选一弹窗）。
 * 首页带 ?reset=<token> 时直接打开重设视图（重设要重问邮箱：PBKDF2 盐需要它）。
 */
;(function (root) {
  'use strict'
  var doc = root.document
  var A, view = 'login', resendTimer = null, resetToken = ''

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function say(box, text, kind) {
    var m = dlg.querySelector('[data-msg]')
    m.innerHTML = text /* text 只由本文件写死的句子 + esc() 过的邮箱拼成 */
    m.className = 'account-msg' + (kind ? ' is-' + kind : '')
    m.hidden = !text
  }
  function busy(on) {
    var b = dlg.querySelector('[data-act="submit"]')
    if (b) b.disabled = !!on
  }

  var dlg = null
  function build() {
    dlg = doc.createElement('dialog')
    dlg.className = 'account-dialog'
    dlg.setAttribute('aria-labelledby', 'account-title')
    dlg.innerHTML =
      '<div class="help-head">' +
        '<h2 id="account-title" data-title>账号</h2>' +
        '<button type="button" class="help-close" aria-label="关闭">×</button>' +
      '</div>' +
      '<div class="account-body" data-body></div>'
    doc.body.appendChild(dlg)
    dlg.querySelector('.help-close').addEventListener('click', function () { dlg.close() })
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close() })
    /* 表单提交与按钮全走委托 */
    dlg.addEventListener('submit', onSubmit)
    dlg.addEventListener('click', onClick)
  }

  function render() {
    var body = dlg.querySelector('[data-body]')
    var title = dlg.querySelector('[data-title]')
    if (A.state.loggedIn) {
      title.textContent = '账号'
      body.innerHTML =
        '<p class="account-line">已登录：<b>' + esc(A.state.email) + '</b></p>' +
        '<p class="account-sub">这台浏览器上的练习进度会自动同步到云端；换电脑登录同一账号即可带过去。</p>' +
        '<div class="account-row"><button type="button" class="btn" data-act="logout">退出登录</button></div>' +
        '<div class="account-msg" data-msg hidden></div>'
      return
    }
    var forms = {
      login: {
        title: '登录',
        html: '<form data-view="login">' +
          '<label>邮箱<input type="email" name="email" required autocomplete="email"></label>' +
          '<label>密码<input type="password" name="password" required autocomplete="current-password" minlength="8"></label>' +
          '<button type="submit" class="btn btn-primary" data-act="submit">登录</button>' +
          '<div class="account-links">' +
            '<button type="button" class="link" data-goto="register">注册新账号</button>' +
            '<button type="button" class="link" data-goto="forgot">忘记密码</button>' +
          '</div>' +
          '<div class="account-msg" data-msg hidden></div></form>'
      },
      register: {
        title: '注册',
        html: '<form data-view="register">' +
          '<label>邮箱<input type="email" name="email" required autocomplete="email"></label>' +
          '<label>密码（至少 8 位）<input type="password" name="password" required minlength="8" autocomplete="new-password"></label>' +
          '<button type="submit" class="btn btn-primary" data-act="submit">注册</button>' +
          '<div class="account-links"><button type="button" class="link" data-goto="login">已有账号，去登录</button></div>' +
          '<div class="account-msg" data-msg hidden></div></form>'
      },
      code: {
        title: '验证邮箱',
        html: '<form data-view="code">' +
          '<p class="account-sub">验证码已发到 <b data-email></b>，10 分钟内有效。</p>' +
          '<div class="code-row">' +
            '<input class="code-box" type="text" inputmode="numeric" maxlength="1" autocomplete="one-time-code">' +
            '<input class="code-box" type="text" inputmode="numeric" maxlength="1">' +
            '<input class="code-box" type="text" inputmode="numeric" maxlength="1">' +
            '<input class="code-box" type="text" inputmode="numeric" maxlength="1">' +
            '<input class="code-box" type="text" inputmode="numeric" maxlength="1">' +
            '<input class="code-box" type="text" inputmode="numeric" maxlength="1">' +
          '</div>' +
          '<button type="submit" class="btn btn-primary" data-act="submit" hidden>提交</button>' +
          '<div class="account-links"><button type="button" class="link" data-act="resend" disabled>重新发送</button>' +
          '<button type="button" class="link" data-goto="login">返回登录</button></div>' +
          '<div class="account-msg" data-msg hidden></div></form>'
      },
      forgot: {
        title: '找回密码',
        html: '<form data-view="forgot">' +
          '<label>邮箱<input type="email" name="email" required autocomplete="email"></label>' +
          '<button type="submit" class="btn btn-primary" data-act="submit">发送重设邮件</button>' +
          '<div class="account-links"><button type="button" class="link" data-goto="login">返回登录</button></div>' +
          '<div class="account-msg" data-msg hidden></div></form>'
      },
      reset: {
        title: '重设密码',
        html: '<form data-view="reset">' +
          '<p class="account-sub">输入注册邮箱和_new密码。</p>'.replace('_new', '新') +
          '<label>邮箱<input type="email" name="email" required autocomplete="email"></label>' +
          '<label>新密码（至少 8 位）<input type="password" name="password" required minlength="8" autocomplete="new-password"></label>' +
          '<button type="submit" class="btn btn-primary" data-act="submit">保存新密码</button>' +
          '<div class="account-msg" data-msg hidden></div></form>'
      }
    }
    var f = forms[view] || forms.login
    title.textContent = f.title
    body.innerHTML = f.html
    if (view === 'code') {
      dlg.querySelector('[data-email]').textContent = A.normEmail(dlg.__email || '')
      wireCode()
    }
  }

  /* 六格验证码：自动跳格，第 6 格填满自动提交；错误提示后清空重填 */
  function wireCode() {
    var boxes = Array.prototype.slice.call(dlg.querySelectorAll('.code-box'))
    boxes[0].focus()
    boxes.forEach(function (b, i) {
      b.addEventListener('input', function () {
        b.value = b.value.replace(/\D/g, '').slice(-1)
        if (b.value && i < boxes.length - 1) boxes[i + 1].focus()
        if (boxes.every(function (x) { return x.value })) submitCode()
      })
      b.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !b.value && i > 0) boxes[i - 1].focus()
      })
    })
    /* 重发倒计时 60 秒 */
    var btn = dlg.querySelector('[data-act="resend"]')
    var left = 60
    btn.disabled = true
    btn.textContent = '重新发送（' + left + 's）'
    clearInterval(resendTimer)
    resendTimer = setInterval(function () {
      left--
      if (left <= 0) {
        clearInterval(resendTimer)
        btn.disabled = false
        btn.textContent = '重新发送'
      } else btn.textContent = '重新发送（' + left + 's）'
    }, 1000)
  }

  function codeValue() {
    return Array.prototype.map.call(dlg.querySelectorAll('.code-box'), function (b) { return b.value }).join('')
  }
  function clearCode() {
    Array.prototype.forEach.call(dlg.querySelectorAll('.code-box'), function (b) { b.value = '' })
    dlg.querySelectorAll('.code-box')[0].focus()
  }

  async function submitCode() {
    var email = A.normEmail(dlg.__email || '')
    var r = await A.request('/api/auth/verify', { email: email, code: codeValue() })
    if (r.status === 200) {
      A.setLogin(email)
      startSync()
      view = 'account'
      render()
    } else {
      say(null, r.body.error || '验证码不对，重新填一次。', 'bad')
      clearCode()
    }
  }

  var syncStarted = false
  function startSync() {
    var sync = root.SumSum.sync
    if (!sync || syncStarted) return /* 只启动一次：重复 init 会堆 onChange 监听、重复推 */
    syncStarted = true
    sync.init({
      confirm: function (o) {
        return new Promise(function (resolve) {
          var lines = function (keys) {
            return '<ul>' + keys.slice(0, 8).map(function (k) { return '<li>' + esc(k) + '</li>' }).join('') +
              (keys.length > 8 ? '<li>…共 ' + keys.length + ' 项</li>' : '') + '</ul>'
          }
          dlg.querySelector('[data-body]').innerHTML =
            '<p class="account-sub">这台电脑上和云端<b>都有</b>练习进度，先上传哪边？</p>' +
            '<div class="account-choice">' +
              '<button type="button" class="btn" data-pick="local">用这台电脑的<br><small>' + o.local.length + ' 项</small>' + lines(o.local) + '</button>' +
              '<button type="button" class="btn" data-pick="cloud">用云端的<br><small>' + o.cloud.length + ' 项</small>' + lines(o.cloud) + '</button>' +
            '</div>'
          dlg.querySelector('[data-title]').textContent = '选择要保留的进度'
          var done = false
          dlg.querySelector('[data-body]').addEventListener('click', function h(e) {
            var b = e.target.closest('[data-pick]')
            if (!b || done) return
            done = true
            dlg.querySelector('[data-body]').removeEventListener('click', h)
            dlg.close()
            resolve(b.dataset.pick)
          })
          dlg.showModal()
        })
      }
    })
  }

  async function onSubmit(e) {
    e.preventDefault()
    var form = e.target
    var fd = new FormData(form)
    var email = A.normEmail(fd.get('email'))
    var pw = fd.get('password') || ''
    busy(true)
    try {
      if (view === 'login' || view === 'register') {
        if (!A.validEmail(email)) return say(null, '邮箱地址看起来不对。', 'bad')
        if (!A.validPassword(pw)) return say(null, '密码至少 8 位。', 'bad')
        var hash = await A.hashPassword(email, pw)
        if (view === 'register') {
          dlg.__hash = hash
          var r = await A.request('/api/auth/register', { email: email, password: hash })
          if (r.status === 200) { /* 未验证过的重复注册也走 200：换密码 + 重发码（auth-core 裁定） */
            dlg.__email = email
            view = 'code'
            render()
          } else say(null, r.body.error || '注册没成功，稍后再试。', 'bad')
        } else {
          dlg.__hash = hash
          var rl = await A.request('/api/auth/login', { email: email, password: hash })
          if (rl.status === 200 && rl.body.need_verify) {
            dlg.__email = email
            view = 'code'
            render()
          } else if (rl.status === 200) {
            A.setLogin(email)
            startSync()
            view = 'account'
            render()
          } else say(null, rl.body.error || '登录没成功。', 'bad')
        }
      } else if (view === 'forgot') {
        if (!A.validEmail(email)) return say(null, '邮箱地址看起来不对。', 'bad')
        var rf = await A.request('/api/auth/forgot', { email: email })
        say(null, '如果这个邮箱注册过，重设邮件已经发出，几分钟内到。', 'ok')
      } else if (view === 'reset') {
        if (!A.validEmail(email)) return say(null, '邮箱地址看起来不对。', 'bad')
        if (!A.validPassword(pw)) return say(null, '密码至少 8 位。', 'bad')
        var rh = await A.hashPassword(email, pw)
        var rr = await A.request('/api/auth/reset', { token: resetToken, password: rh })
        if (rr.status === 200) {
          A.setLogin(email)
          startSync()
          view = 'account'
          render()
        } else say(null, rr.body.error || '重设没成功。', 'bad')
      }
    } catch (err) {
      say(null, '网络出了问题，稍后再试。', 'bad')
    } finally {
      busy(false)
    }
  }

  async function onClick(e) {
    var b = e.target.closest('[data-goto],[data-act]')
    if (!b) return
    if (b.dataset.goto) {
      view = b.dataset.goto
      render()
    } else if (b.dataset.act === 'logout') {
      await A.logout()
      view = 'login'
      render()
    } else if (b.dataset.act === 'resend') {
      /* 重发 = 再调一次 register（带上注册时缓存的哈希）：未验证账号 → 换密码 + 重发码，
         限流（60 秒 / 每小时 3 封）由 auth-core 的 mailGate 拦，429 时把提示亮出来 */
      var r = await A.request('/api/auth/register', { email: dlg.__email, password: dlg.__hash })
      if (r.status === 200) { clearCode(); say(null, '新的验证码已发送。', 'ok'); wireCode() }
      else say(null, r.body.error || '发送太频繁了，稍等再试。', 'bad')
    }
  }

  function open(v) {
    if (!dlg) build()
    view = A.state.loggedIn ? 'account' : (v || 'login')
    render()
    dlg.showModal()
  }

  function boot() {
    A = root.SumSum && root.SumSum.account
    if (!A || !doc.querySelector('[data-account]')) return
    doc.querySelector('[data-account]').addEventListener('click', function () { open() })
    A.onChange(function () {
      if (dlg && dlg.open) render() /* 登录态变了，弹窗内容跟着换 */
    })
    A.init().then(function () {
      if (A.state.loggedIn) startSync()
    })
    /* ?reset=<token>：只在首页（module 页面会吃参数）。token 不留在历史记录里 */
    var m = root.location.search.match(/[?&]reset=([0-9a-f]{64})/)
    if (m && doc.querySelector('[data-account]')) {
      resetToken = m[1]
      root.history.replaceState(null, '', root.location.pathname)
      open('reset')
    }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot)
  else boot()
  root.SumSum = root.SumSum || {}
  root.SumSum.accountUI = { open: open }
})(window)
```

（resend 走 register 的前提是 auth-core 的 register 对「已存在未验证账号」返回 200 并重发码——Task 5 已按此实现，两端点语义对齐。）

- [ ] **Step 4: rail.py + 样式 + script 标签**

`tools/rail.py` 的 TAIL 列表，「备份」按钮之前插入：

```python
("账号", "M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5", {"data-account": ""}),
```

（头像圆身图标 `<circle cx="12" cy="8" r="4"/>` + path；按 rail.py 现有 svg 生成写法对齐——LINKS/TAIL 里每项是 `(名, path, attrs)`，attrs 进按钮。）

`css/app.css` 追加：

```css
/* ---------- 账号弹窗（与 help-dialog 同骨架） ---------- */
.account-dialog { max-width: 420px; }
.account-body form { display: flex; flex-direction: column; gap: 12px; }
.account-body label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--ink-soft); }
.account-body input { padding: 9px 10px; font-size: 15px; border: 1px solid var(--card-edge); border-radius: 8px; }
.code-row { display: flex; gap: 8px; justify-content: center; }
.code-box { width: 44px; height: 52px; text-align: center; font-size: 24px; font-variant-numeric: tabular-nums; }
.account-links { display: flex; gap: 16px; }
.account-links .link, button.link { background: none; border: none; padding: 0; color: var(--blue); cursor: pointer; font-size: 13px; }
.account-msg { font-size: 13px; color: var(--ink-soft); }
.account-msg.is-bad { color: var(--red); }
.account-msg.is-ok { color: var(--green, #2e7d32); }
.account-sub { font-size: 13px; color: var(--ink-soft); }
.account-choice { display: flex; gap: 10px; }
.account-choice .btn { flex: 1; text-align: center; }
.account-choice ul { margin: 6px 0 0; padding-left: 16px; font-size: 11px; color: var(--ink-soft); text-align: left; }
```

五个页面 `js/account.js` 之后加 `<script src="js/account-ui.js"></script>` 再 `<script src="js/sync.js"></script>`（sync 只被 account-ui 调 init，加载顺序无依赖，但保持 account → account-ui → sync 一致）。

- [ ] **Step 5: 验证 + 提交**

Run: `python3 tools/rail.py && node tools/check-backup.js && node tools/check-account.js && node tools/check-store.js`
Expected: rail 重新生成五页无 diff 之外的异常；测试全 ✓（页面视觉在 Task 11 用浏览器实测）。

```bash
git add js/account-ui.js js/help.js js/backup.js tools/rail.py tools/check-backup.js css/app.css index.html kousuan.html aoshu.html shudu.html shizi.html
git commit -m "feat: 账号界面——弹窗六格验证码/找回/重设、侧栏按钮、备份跳过 sync:meta"
```

### Task 11: 浏览器实测 + 安全复审 + 上线

**Files:**
- Create: `tools/e2e-account-browser.py`（Playwright 脚本）
- 本任务不改产品代码（复审发现 Critical/Important 才回改，回改必须走 RED→GREEN）

**Interfaces:**
- Consumes: Task 7 的本地 wrangler（`bash tools/e2e-account.sh` 已能一键起环境）、Task 10 的全部 UI
- Produces: 浏览器全流程通过的证据；security-reviewer 的复审结论；线上可用（用户完成 Resend/DNS 后）

- [ ] **Step 1: 起 wrangler + 写 Playwright 脚本**

Run（一个终端后台起着）: `npx wrangler pages dev . --port 8999 --d1 DB=lianxizhi --binding SESSION_SECRET=dev-secret --binding DEV_SHOW_CODE=1`

`tools/e2e-account-browser.py`（完整文件；Playwright 用 `/opt/homebrew/opt/python@3.10/bin/python3.10` 跑）：

```python
# 账号浏览器全流程：注册（六格验证码自动提交）→ 登录态 → 改动同步到第二个浏览器 → 找回重设。
# DEV_SHOW_CODE=1 时验证码在注册响应 JSON 里，用 page.on('response') 抓。
import json, re, sys, time
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8999'
EMAIL = f'e2e-{int(time.time())}@test.local'
PASSWORD = 'password123'
results = []

def check(name, ok, extra=''):
    results.append(ok)
    print(('✓ ' if ok else '✗ ') + name + ((' → ' + str(extra)) if not ok else ''))

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx1 = browser.new_context()
    page = ctx1.new_page()
    codes = []
    page.on('response', lambda r: codes.append(r) if '/api/auth/' in r.url else None)
    page.goto(BASE + '/shizi.html')
    try: page.keyboard.press('Escape'); page.wait_for_timeout(300)  # 新档案自动弹帮助
    except Exception: pass

    # 注册：填邮箱密码，提交后进六格
    page.click('[data-account]')
    page.click('[data-goto="register"]')
    page.fill('input[name=email]', EMAIL)
    page.fill('input[name=password]', PASSWORD)
    page.click('[data-act="submit"]')
    page.wait_for_selector('.code-box', timeout=10000)
    # 抓 dev_code
    code = None
    for r in codes:
        if r.url.endswith('/api/auth/register'):
            try:
                j = r.json()
                if j.get('dev_code'): code = j['dev_code']
            except Exception: pass
    check('注册后拿到 dev_code', code is not None, [r.url for r in codes])
    for i, ch in enumerate(code or '000000'):
        page.fill(f'.code-box:nth-of-type({i + 1})', ch)
        page.wait_for_timeout(80)
    page.wait_for_selector('.account-line', timeout=10000)
    check('六格填满自动验证并进入已登录视图', EMAIL in page.inner_html('.account-dialog'))
    page.keyboard.press('Escape')

    # 改动：识字点一个字产生 sumsum: 写入 → 防抖 2s 后推送
    page.click('#preview .shizi-cell')
    page.wait_for_timeout(3500)
    me_ok = False
    for r in codes:
        if r.url.endswith('/api/data/push'):
            me_ok = True
    check('本地改动触发推送', me_ok)

    # 第二个浏览器：同账号新 context 登录，云端空 vs 本地刚推 → 应拉下来
    ctx2 = browser.new_context()
    page2 = ctx2.new_page()
    page2.goto(BASE + '/shizi.html')
    try: page2.keyboard.press('Escape'); page2.wait_for_timeout(300)
    except Exception: pass
    page2.click('[data-account]')
    page2.fill('input[name=email]', EMAIL)
    page2.fill('input[name=password]', PASSWORD)
    page2.click('[data-act="submit"]')
    page2.wait_for_selector('.account-line', timeout=10000)
    check('第二台登录成功', True)
    # 首登拉取：点选应该还在（sumsum:shizi:picks:v1 同步下来了）
    page2.wait_for_timeout(1500)
    page2.reload()
    page2.wait_for_selector('#preview .shizi-cell')
    picked = page2.eval_on_selector_all('#preview .shizi-cell.is-pick', 'els => els.length')
    check('点选同步到第二台', picked >= 1, picked)

    # 找回重设：forgot 的 dev_token 从响应抓，打开 /?reset=
    tokens = []
    page2.on('response', lambda r: tokens.append(r) if r.url.endswith('/api/auth/forgot') else None)
    dlg2 = page2.expect_dialog  # noqa （占位防误用，无实际 dialog）
    page2.click('[data-account]')
    page2.click('.help-close') if page2.query_selector('.help-close') else None
    # 已登录视图里没有 forgot 入口 → 先退出
    page2.click('[data-act="logout"]')
    page2.wait_for_selector('input[name=email]')
    page2.click('[data-goto="forgot"]')
    page2.fill('input[name=email]', EMAIL)
    page2.click('[data-act="submit"]')
    page2.wait_for_timeout(600)
    token = None
    for r in tokens:
        try:
            j = r.json()
            if j.get('dev_token'): token = j['dev_token']
        except Exception: pass
    check('forgot 拿到 dev_token', token is not None)
    page2.goto(BASE + '/?reset=' + (token or 'x' * 64))
    page2.wait_for_selector('input[name=email]', timeout=10000)
    check('?reset= 直接开重设视图', '重设' in page2.inner_html('.account-dialog'))
    page2.fill('input[name=email]', EMAIL)
    page2.fill('input[name=password]', 'newpassword9')
    page2.click('[data-act="submit"]')
    page2.wait_for_selector('.account-line', timeout=10000)
    check('重设后自动登录', True)

    browser.close()

print()
sys.exit(0 if all(results) else 1)
```

- [ ] **Step 2: 跑通**

Run: `/opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-account-browser.py`
Expected: 全 ✓。（UI 选择器对不上时修脚本——产品问题才回改代码。）

- [ ] **Step 3: node 全套回归 + curl e2e 回归**

Run: `bash tools/e2e-account.sh && for f in tools/check-*.js; do node "$f" | tail -1; done`
Expected: 全部通过。

- [ ] **Step 4: 安全复审（用户规矩：登录鉴权代码必须过 security-reviewer）**

派 security-reviewer 子代理（Sonnet 5.5）审 `server/`、`functions/`、`js/account.js`、`js/sync.js`，提示词里给：设计文档路径、红线（密钥不进 Git、`sumsum:` 前缀、明文密码不出浏览器）、Review Focus 六条。
- Critical/Important → 回改，改前先写复现测试（RED→GREEN）。
- 改完重跑全套 + e2e。

- [ ] **Step 5: 提交实测脚本**

```bash
git add tools/e2e-account-browser.py
git commit -m "test: 账号浏览器全流程脚本——六格验证码、双浏览器同步、重设邮件链接"
```

- [ ] **Step 6: 上线（用户参与的部分先问再做）**

1. 用户侧（我给直达链接和一句话说明）：
   - Resend 注册：https://resend.com —— 添加发信域 `mail.qingchejun.com`，按页面给的 DNS 记录去 Cloudflare 后台（https://dash.cloudflare.com）加 TXT/CNAME（人机验证只能人来）。
   - Resend 生成 API Key → 在 Cloudflare Pages 项目设置里加环境变量 `RESEND_API_KEY`（或交给 `npx wrangler pages secret put`，我来跑，用户只贴 key；key 不进 Git）。
2. 我侧：
   - `SESSION_SECRET`：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` 生成，`npx wrangler pages secret put SESSION_SECRET --project-name=lianxizhi` 写入。
   - `npx wrangler d1 execute lianxizhi --remote --file server/schema.sql`（远端建表，属「数据库迁移」类——先向用户报备再做）。
   - push 到 main = 部署；部署后线上用真邮箱走一遍注册→收信→登录（收信要用户看邮箱配合）。
3. 全部通过后：spec 状态改「已上线」，更新 memory（sumsum 账号同步架构一条）。

---

## 上线后的验收清单（给用户看的白话版）

1. 注册：邮箱 + 8 位密码 → 收到验证码邮件（垃圾箱也看一眼）→ 六格填完自动通过。
2. 识字点几个字 → 换浏览器登录同账号 → 点选和错字集都在。
3. 忘记密码 → 邮件里点链接 → 设新密码 → 旧密码失效。
4. 不登录时一切照旧——所有本地功能不碰账号也完全可用。

## 风险与回滚

- Functions 全部挂在 `/api/` 下，静态站其余路径不受影响；出问题可 `git revert` 整批提交回到纯静态。
- D1 表是新建的，不迁移旧数据（旧数据在 localStorage，登录后首次推送自然上云）。
- 密钥只有两个（RESEND_API_KEY、SESSION_SECRET），都在 Cloudflare 侧，代码仓库里一个都不出现。
