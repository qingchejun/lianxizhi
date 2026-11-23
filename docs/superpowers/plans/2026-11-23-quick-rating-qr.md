# 三档快打分 + 纸角二维码 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 每张题目纸角印二维码，家长手机扫码一次就能给当天所有纸打分（三档 / 点错题 / 识字点字），口算、奥数、五个游戏第一次接上「错哪练哪」。

**Architecture:** 新增无 DOM 的 `js/sheets-core.js`（纸号、记录、定档、各板块调整规则，node 可测）和带 DOM 的 `js/sheets.js`（打印时写记录、页眉二维码）。每张纸一个同步键 `sumsum:sheet:v1:<id>`，走现有 store + sync（按键 LWW 合并）。新页面 `mark.html`（手机优先，电脑也能用）读记录、打分、当场把作用写进各板块存储；口算在出下一张时读最近一次打分。服务器 pull 时顺手删 60 天前的纸记录，本机 sync.init 拉之前也按同一规则删。

**Tech Stack:** 纯浏览器 JS（IIFE 挂 `root.SumSum`）、Cloudflare Pages Functions + D1、node 校验脚本 `tools/check-*.js`、playwright（python3.10）浏览器脚本。二维码库：qrcode-generator（Kazuhiko Arase，MIT），vendor 进 `js/vendor/`。

**Spec:** `docs/superpowers/specs/2026-11-23-quick-rating-qr-design.md`

## Global Constraints

- 存储一律走 `root.SumSum.store`（`set/get/remove/stampNow`），键以 `sumsum:` 开头；纸记录键 `sumsum:sheet:v1:<id>`。
- store.set 首次写入的 mtime 记为 1（播种）。纸记录写入后**必须** `store.stampNow([key])`，否则 60 天清理会立刻删掉它。
- 同步不支持删除传播：清理必须服务器（pull 时）与本机（sync.init 拉之前）按同一规则各删一次，规则：记录 `printedAt` 与 `rating.*.at` 中最大者早于 `now - 60 天`。服务器侧用行的 `updated_at`。
- 二维码网址：`location.origin + '/mark?id=' + id`；id 为 6 位、字符集 `23456789abcdefghjkmnpqrstuvwxyz`。
- 只在题目页（每张纸第一页）页眉放二维码，约 11mm 见方 + 「扫码登记」小字；答案页、解析页、讲解页不放。不得挤掉现有分页（打印导出 PDF 核对）。
- 孩子不扫码；未登录不能登记（网关已有 `/?next=`）；不用 AI。
- 手机端只要不塌、能用（记忆 sumsum-desktop-first），登记页例外：它是手机优先。
- 界面和回复不用无序圆点列表（记忆 no-bullet-lists）；不用渐变、emoji 装饰、左侧彩色边框卡片。
- 改完 js/css 跑 `node tools/stamp-assets.js`（提交钩子会拦）；上线有家长可见变化要在 `js/changelog.js` 顶部加一条。
- 对家长可见的文字里不出现 qingchejun。

## Review Focus

1. 电脑刚点打印、手机立刻扫码（2 秒防抖还没推）→ 登记页提示「电脑那边还没同步好」并有刷新按钮，不报错、不空白（Task 9 测）。
2. 同一张纸当天改档（会了 → 不会）→ 游戏关卡、奥数已学/待复习按最后一次结果，不会叠加两次（Task 3、9 测 revert+apply）。
3. 播种 mtime=1 的纸记录被 60 天清理误删 → 写记录后 stampNow（Task 4 测）。
4. 别的账号或已清理的纸号被扫 → 提示「找不到这张纸」，不崩（Task 9 测）。
5. 加了二维码后页眉变高，口算 15 行、奥数探针分页溢出到第二页 → 打印 PDF 核对每个板块（Task 13）。

---

### Task 1: sheets-core 基础：纸号、记录、清理、定档、待登记列表

**Files:**
- Create: `js/sheets-core.js`
- Create: `tools/check-sheets.js`

**Interfaces:**
- Produces（挂在 `root.SumSum.sheetsCore`）:
  - `PREFIX = 'sumsum:sheet:v1:'`、`KEEP_DAYS = 60`
  - `makeId(parts: string): string` 6 位，确定性（FNV-1a 32 位再转字符集，不足补位）
  - `keyOf(id): string`
  - `newRecord({id, module, title, date, units, items, ref}, now): Record`（rating:null, wrong:null, applied:null, printedAt:now）
  - `lastTouched(rec): number` printedAt 与各 rating.at 的最大值
  - `staleKeys(entries: Array<{key, value}>, now): string[]` 早于 60 天的纸键
  - `levelFromWrong(total, wrongCount): 'good'|'ok'|'bad'` 错 0–1 → good；≥ 一半（wrong*2 >= total）→ bad；其余 ok（total≤2 时错 1 题按 ok）
  - `pending(records, today: 'YYYY-MM-DD'): Record[]` 今天和昨天打印、rating 为空（识字/拼音看 ref.settled 由调用方填 rec.done）、按 printedAt 倒序
  - `MODULE_KIND = { kousuan:'three', aoshu:'three', shudu:'game', huochai:'game', mima:'game', migong:'game', zhizhi:'game', shizi:'chars', pinyin:'link' }`

- [ ] **Step 1: 写失败测试** `tools/check-sheets.js`（沿用 check-today.js 的 `check(cond,msg)` + 结尾打印、有问题 `process.exit(1)` 风格）：

```js
'use strict'
require('../js/sheets-core.js')
var C = globalThis.SumSum.sheetsCore
var problems = []
function check(c, m) { if (!c) problems.push(m) }
var DAY = 86400000, NOW = Date.UTC(2026, 10, 23, 12)

/* 纸号：确定、6 位、字符集内、不同输入大概率不同 */
var a = C.makeId('kousuan|seed=1|2026-11-23'), b = C.makeId('kousuan|seed=2|2026-11-23')
check(a === C.makeId('kousuan|seed=1|2026-11-23'), 'makeId 不稳定')
check(/^[23456789abcdefghjkmnpqrstuvwxyz]{6}$/.test(a), 'makeId 格式 ' + a)
check(a !== b, 'makeId 撞了')
check(C.keyOf(a) === 'sumsum:sheet:v1:' + a, 'keyOf')

/* 定档 */
check(C.levelFromWrong(20, 0) === 'good', '全对=会了')
check(C.levelFromWrong(20, 1) === 'good', '错1=会了')
check(C.levelFromWrong(20, 2) === 'ok', '错2=一般')
check(C.levelFromWrong(20, 10) === 'bad', '错一半=不会')
check(C.levelFromWrong(2, 1) === 'ok', '两题错一题=一般')

/* 清理：按 printedAt 与 rating.at 最大值 */
var old = C.newRecord({ id: 'aaaaaa', module: 'kousuan', title: 't', date: '2026-09-01', units: [], items: [] }, NOW - 70 * DAY)
var oldRated = C.newRecord({ id: 'bbbbbb', module: 'kousuan', title: 't', date: '2026-09-01', units: [], items: [] }, NOW - 70 * DAY)
oldRated.rating = { all: { level: 'ok', auto: false, at: NOW - 5 * DAY } }
var fresh = C.newRecord({ id: 'cccccc', module: 'kousuan', title: 't', date: '2026-11-23', units: [], items: [] }, NOW)
var st = C.staleKeys([
  { key: C.keyOf('aaaaaa'), value: JSON.stringify(old) },
  { key: C.keyOf('bbbbbb'), value: JSON.stringify(oldRated) },
  { key: C.keyOf('cccccc'), value: JSON.stringify(fresh) },
  { key: C.keyOf('dddddd'), value: '坏了' },
  { key: 'sumsum:shizi:v1', value: '{}' }
], NOW)
check(st.length === 2 && st.indexOf(C.keyOf('aaaaaa')) >= 0 && st.indexOf(C.keyOf('dddddd')) >= 0, '清理键不对 ' + st)

/* 待登记：今天+昨天、未打分 */
var y = C.newRecord({ id: 'y00000', module: 'huochai', title: 'y', date: '2026-11-22', units: [{ key: 'all', label: '整张' }], items: [] }, NOW - DAY)
var d2 = C.newRecord({ id: 'z00000', module: 'huochai', title: 'z', date: '2026-11-21', units: [], items: [] }, NOW - 2 * DAY)
var rated = C.newRecord({ id: 'r00000', module: 'kousuan', title: 'r', date: '2026-11-23', units: [], items: [] }, NOW)
rated.rating = { all: { level: 'good', auto: false, at: NOW } }
var p = C.pending([y, d2, rated, fresh], '2026-11-23')
check(p.length === 2 && p[0].id === 'cccccc' && p[1].id === 'y00000', '待登记列表不对 ' + p.map(function (r) { return r.id }))

if (problems.length) { console.log('✗ ' + problems.length + ' 处不对：\n' + problems.join('\n')); process.exit(1) }
console.log('✓ sheets 校验通过')
```

- [ ] **Step 2:** `node tools/check-sheets.js` → 失败（找不到模块）。
- [ ] **Step 3: 实现** `js/sheets-core.js`（IIFE，`root.SumSum.sheetsCore = {...}`，无 DOM）。makeId：FNV-1a → 无符号 32 位 → 依次 `% 31` 取 6 位（不足时再混一轮 `Math.imul(h, 16777619)`）。pending：`rec.date` 等于 today 或 today 前一天，且 `!rec.rating && !rec.done`。
- [ ] **Step 4:** `node tools/check-sheets.js` → ✓。
- [ ] **Step 5: 提交** `feat: 纸记录核心（纸号、清理、定档、待登记）`

### Task 2: 口算规则：分类、必含错题、临时进位、升档提示；generator 支持新参数

**Files:**
- Modify: `js/sheets-core.js`（加口算函数）
- Modify: `js/generator.js`（`generate(s)` 读 `s.mustInclude`、`s.carryOverride`，不传时输出与原来逐字相同）
- Test: `tools/check-sheets.js`

**Interfaces:**
- Produces:
  - `kousuanCat(q: {tokens}): 'carry'|'borrow'|'plain'|'mul'|'div'|'mixed'` 两数加且个位相加≥10 → carry；两数减且被减数个位 < 减数个位 → borrow；多于一个运算符 → mixed
  - `kousuanItems(questions): Array<{key, label, cat}>` key=`q.key`，label=`tokens.join(' ') + ' ='`
  - `kousuanNext(lastRec, settings): { mustInclude: string[] /* q.key */, carryOverride: 'carrymore'|null }` lastRec 为最近一张已打分口算记录（无则 `{[],null}`）；错题最多 5 道；错题里 carry+borrow ≥ 一半或 rating.all.level==='bad' 且 settings.carryMode ∈ {random, nocarry} → 'carrymore'
  - `kousuanUpgrade(recentRecs, presets, presetOf): string|null` 最近两张已打分口算同一预设且都 good → 返回 PRESETS 里下一个预设的 label；否则 null
  - generator：`mustInclude` 里的 key 解析回 tokens（`key.split(' ')`，数字转 Number），满足当前范围（min/max、模式运算符）才放进开头；`carryOverride` 只替换本次的 carryMode

- [ ] **Step 1: 测试**（追加到 check-sheets.js，require `../js/settings.js`、`../js/generator.js`）：

```js
var G = globalThis.SumSum.generator
check(C.kousuanCat({ tokens: [8, '+', 5] }) === 'carry', '8+5 进位')
check(C.kousuanCat({ tokens: [13, '-', 5] }) === 'borrow', '13-5 退位')
check(C.kousuanCat({ tokens: [12, '+', 3] }) === 'plain', '12+3 不进位')
check(C.kousuanCat({ tokens: [3, '×', 4] }) === 'mul', '乘')
check(C.kousuanCat({ tokens: [3, '+', 4, '-', 2] }) === 'mixed', '混合')

var base = { mode: 'addsub', min: 0, max: 20, count: 20, columns: 3, allowNegative: false, exactDivision: true, carryMode: 'random', mulMin: 1, mulMax: 9, noDuplicates: true, skipTrivial: true, blankMode: 'end', parens: false, seed: 42 }
var plain = G.generate(base).questions.map(function (q) { return q.key })
check(JSON.stringify(plain) === JSON.stringify(G.generate(Object.assign({}, base, { mustInclude: [], carryOverride: null })).questions.map(function (q) { return q.key })), '不传新参数出题变了')
var withMust = G.generate(Object.assign({}, base, { mustInclude: ['8 + 5', '99 + 99'] })).questions.map(function (q) { return q.key })
check(withMust.indexOf('8 + 5') >= 0, '必含错题没出现')
check(withMust.indexOf('99 + 99') < 0, '超范围的必含题不该出现')
check(withMust.length === 20, '必含后题量不对')

var last = C.newRecord({ id: 'k00001', module: 'kousuan', title: 'k', date: '2026-11-23', units: [{ key: 'all', label: '整张' }], items: [] }, NOW)
last.wrong = ['8 + 5', '13 - 5', '2 + 3']
last.items = C.kousuanItems([{ key: '8 + 5', tokens: [8, '+', 5] }, { key: '13 - 5', tokens: [13, '-', 5] }, { key: '2 + 3', tokens: [2, '+', 3] }])
last.rating = { all: { level: 'ok', auto: true, at: NOW } }
var nx = C.kousuanNext(last, base)
check(nx.mustInclude.length === 3 && nx.carryOverride === 'carrymore', '口算下一张规则 ' + JSON.stringify(nx))
check(C.kousuanNext(null, base).mustInclude.length === 0, '没打过分就不调整')
check(C.kousuanNext(last, Object.assign({}, base, { carryMode: 'carryonly' })).carryOverride === null, 'carryonly 不再覆盖')

var S = globalThis.SumSum.settings
var r1 = Object.assign({}, last, { ref: { preset: '10以内加减' }, rating: { all: { level: 'good', at: NOW - 1000 } } })
var r2 = Object.assign({}, last, { ref: { preset: '10以内加减' }, rating: { all: { level: 'good', at: NOW } } })
check(C.kousuanUpgrade([r2, r1], S.PRESETS) === '20以内进退位', '升档提示')
check(C.kousuanUpgrade([r2], S.PRESETS) === null, '一张会了不提示')
```

（若 `settings.js` 未导出 `PRESETS`，在本任务里加导出。记录的 `ref.preset` 由 Task 6 写入 `presetOf(settings)` 的 label。）

- [ ] **Step 2:** 跑 → 失败。
- [ ] **Step 3:** 实现 sheets-core 口算函数；generator.js 在 `generate(s)` 开头：`var carry = s.carryOverride || s.carryMode`，出题循环前先尝试放入合法的必含题（同一套合法性判断函数，去重计入 noDuplicates）。
- [ ] **Step 4:** 跑 check-sheets + 全部 `node tools/check-*.js` → 全绿。
- [ ] **Step 5: 提交** `feat: 口算按错题调整下一张（必含错题、临时多出进退位、升档提示）`

### Task 3: 奥数与游戏规则：apply / revert

**Files:**
- Modify: `js/sheets-core.js`
- Test: `tools/check-sheets.js`

**Interfaces:**
- Produces:
  - `aoshuApply(state: {learned: string[], due: string[]}, unitRatings: {topicId: level}, wrongTopics: string[]): {learned, due}` good → 加 learned、移出 due；ok → 加 learned + 加 due；bad → 不动 learned（不删已有）、不加 due；wrongTopics 全加 due。返回新数组，不改入参
  - `aoshuRevert(state, applied: {learnedAdded: string[], dueAdded: string[], dueRemoved: string[]})`、`aoshuDiff(before, after)` → applied
  - `GAME_LEVELS = ['L1','L2','L3','L4']`
  - `gameStep(module, settings, level: 'good'|'ok'|'bad', clueRange?): { next: settings, changed: bool, prev: settings }` 'good'=太简单 → 升（L+1；数独 clues -= step）；'bad'=太难 → 降；到顶到底不变。数独 step = `Math.max(1, Math.ceil((max-min)/6))`，clueRange 由调用方传 `shudu-core` 的范围
  - 打分值复用 good/ok/bad；游戏界面文字为「太简单/刚好/太难」

- [ ] **Step 1: 测试**：

```js
var s0 = { learned: ['a'], due: ['b'] }
var s1 = C.aoshuApply(s0, { a: 'good', b: 'good', c: 'ok', d: 'bad' }, ['e'])
check(s1.learned.sort().join() === 'a,b,c', '奥数已学 ' + s1.learned)
check(s1.due.sort().join() === 'c,e', '奥数待复习 ' + s1.due)
check(s0.due.join() === 'b', '不能改入参')
var ap = C.aoshuDiff(s0, s1)
var back = C.aoshuRevert(s1, ap)
check(back.learned.sort().join() === 'a' && back.due.sort().join() === 'b', '奥数撤回不对')

var h = C.gameStep('huochai', { level: 'L2' }, 'good')
check(h.next.level === 'L3' && h.changed && h.prev.level === 'L2', '火柴升关')
check(C.gameStep('huochai', { level: 'L4' }, 'good').changed === false, '到顶不动')
check(C.gameStep('mima', { level: 'L1' }, 'bad').changed === false, '到底不动')
check(C.gameStep('migong', { level: 'L3' }, 'bad').next.level === 'L2', '迷宫降关')
check(C.gameStep('zhizhi', { level: 'L2' }, 'ok').changed === false, '刚好不变')
var sd = C.gameStep('shudu', { shape: 's9', clues: 35 }, 'good', { min: 27, max: 50 })
check(sd.next.clues === 31 && sd.next.shape === 's9', '数独太简单少给提示 ' + sd.next.clues)
check(C.gameStep('shudu', { shape: 's4', clues: 12 }, 'bad', { min: 5, max: 12 }).changed === false, '数独到顶不动')
```

- [ ] **Step 2:** 跑 → 失败。 **Step 3:** 实现。 **Step 4:** 跑 → ✓。
- [ ] **Step 5: 提交** `feat: 奥数三档作用到已学/待复习、游戏升降关（可撤回）`

### Task 4: 清理：服务器 pull 时删、本机 sync 拉之前删

**Files:**
- Modify: `server/repo-d1.js`（加 `dataDeletePrefixBefore(uid, prefix, before)`：`DELETE FROM data WHERE user_id=? AND key LIKE ? AND updated_at<?`，prefix 绑定为 `prefix + '%'`）
- Modify: `server/auth-core.js` `dataPull(repo, userId, now)`：先 `await repo.dataDeletePrefixBefore(userId, 'sumsum:sheet:v1:', now - 60*DAY)` 再读；`functions/api/data/index.js` 传 `Date.now()`
- Modify: `js/sync.js` init：拉之前 `pruneSheets(store, Date.now())`（用 sheetsCore.staleKeys；sheets-core 未加载时跳过）；删除用 `store.remove`
- Modify: `js/sheets.js` 的写记录（Task 5）里 `stampNow`——本任务先在 check 里覆盖
- Test: `tools/check-auth-core.js` 或 `check-auth-server.js`（看哪个有 fake repo 的 dataPull 测试，追加）、`tools/check-sync.js`

- [ ] **Step 1: 测试**：fake repo 记录被调用的删除参数，断言 dataPull 用 `'sumsum:sheet:v1:'` 与 `now - 60*86400000`；check-sync 里预置一条 70 天前的纸键 + 一条新纸键，跑 init（假 api pull 返回空），断言旧键被删、新键还在且被推送。
- [ ] **Step 2:** 跑 → 失败。 **Step 3:** 实现（每个页面都要先加载 sheets-core 才能清理：Task 5 把 `js/sheets-core.js` 加到所有页面 sync 之前）。 **Step 4:** 跑 → ✓，`node tools/check-*.js` 全绿。
- [ ] **Step 5: 提交** `feat: 纸记录 60 天清理（服务器拉取时 + 本机同步前）`

### Task 5: 二维码库 + sheets.js（写记录、页眉二维码、登记按钮）

**Files:**
- Create: `js/vendor/qrcode.js` + `js/vendor/LICENSE-qrcode-generator.txt`（从 npm 包 `qrcode-generator` 的 `qrcode.js` 原样拷贝：`npm pack qrcode-generator` 到 /tmp 独立目录解包后复制，不在仓库装依赖）
- Create: `js/sheets.js`
- Modify: `css/sheet.css`（`.sheet-qr` 样式 + 打印规则）
- Modify: 所有板块页 html（kousuan/aoshu/shizi/pinyin/shudu/huochai/mima/migong/zhizhi/index/today 所在页）在 `store.js` 之后、`sync.js` 之前加 `js/sheets-core.js`；板块页再加 `js/vendor/qrcode.js`、`js/sheets.js`
- Modify: `server/gate.js` 不改；核对 `mark.html` 与 `/js/vendor/*.js` 不被 DENY_EXT 拦（`.js` 不在列表里）；`tools/check-gate.js` 加一条 `/mark?id=abc` 登录后 pass、未登录跳 `/?next=%2Fmark%3Fid%3Dabc`

**Interfaces:**
- Consumes: sheetsCore.makeId/newRecord/keyOf
- Produces（`root.SumSum.sheets`）:
  - `use(info: {module, title, idParts: string, units, items, ref}): string` 板块每次渲染完调用：算 id、记住「当前纸」（内存），在 `#preview` 里第一张非答案 `.sheet` 的 `.sheet-head` 末尾插入/替换 `.sheet-qr`（SVG + 「扫码登记」），返回 id。`idParts` 由板块给出（板块+设置+种子+日期的稳定串）
  - `qrSvg(text): string`（qrcode-generator，type 0 自动、纠错 'M'，`createSvgTag({cellSize:2, margin:0, scalable:true})`）
  - beforeprint 监听：若有当前纸 → 记录不存在则 `store.set(keyOf(id), newRecord(...))` 再 `store.stampNow([key])`；已存在则不动（重复打印不覆盖打分）
  - `markUrl(id) = location.origin + '/mark?id=' + id`
  - 工作区顶栏加按钮「登记这张」（`#btn-mark`，点了先确保记录已写入再 `location.href = markUrl(id)`）
- CSS：`.sheet-qr{display:flex;align-items:flex-end;gap:1.5mm;flex:none}` `.sheet-qr svg{width:11mm;height:11mm}` `.sheet-qr small{font-size:8px;line-height:1.2;writing-mode:horizontal-tb;color:#000}`；页眉 `align-items:flex-end` 已有

- [ ] **Step 1:** 在 check-sheets.js 加 `qrSvg` 的 node 测试（sheets.js 的 qrSvg 无 DOM 依赖，可 require qrcode.js 后调用）：输出以 `<svg` 开头、包含 `path` 或 `rect`；同文本输出相同。
- [ ] **Step 2:** 跑 → 失败。 **Step 3:** 拷库、实现 sheets.js、CSS、各页面引入。 **Step 4:** 跑 check-sheets、check-gate → ✓。
- [ ] **Step 5: 提交** `feat: 纸角二维码与打印时登记纸记录`

### Task 6: 口算接入

**Files:**
- Modify: `js/main.js`（generate 前读最近已打分口算记录：遍历 `store.keys()` 前缀纸键、module==='kousuan'、有 rating、按 rating 时间倒序；`Object.assign({}, settings, C.kousuanNext(last, settings))` 只用于本次生成，不保存）
- Modify: `js/main.js` 渲染后 `SumSum.sheets.use({module:'kousuan', title, idParts: 'kousuan|' + JSON.stringify(settingsUsed) + '|' + date, units:[{key:'all',label:'整张'}], items: C.kousuanItems(questions), ref:{ preset: S.settings.presetOf(settings) || '' }})`
- 「必含题」用过即止：一张纸只消费上一张的错题；若最新口算记录已被 `ref.consumedBy` 标记（下一张纸打印时写入）则不再重复必含
- Test: 浏览器手测 + check-sheets 已覆盖规则

- [ ] Step 1: 改 main.js。 Step 2: 本机预览（`npx wrangler pages dev . --port 8999 --binding SESSION_SECRET=dev-secret --binding DEV_SHOW_CODE=1`，账号 preview@local.test / preview123）打开口算：页眉右侧有二维码、分页不变。 Step 3: `node tools/check-*.js` 全绿。 Step 4: 提交 `feat: 口算纸角二维码，按上次错题出下一张`

### Task 7: 五个游戏 + 奥数接入（只注册纸；作用在登记页做）

**Files:**
- Modify: `js/shudu-main.js`、`js/huochai-main.js`、`js/mima-main.js`、`js/migong-main.js`、`js/zhizhi-main.js`：渲染后 `sheets.use({module, title, idParts: module + '|' + JSON.stringify(settings) + '|' + date, units:[{key:'all',label:'整张'}], items:[], ref:{ settings: settings }})`
- Modify: `js/aoshu-main.js`：单课 → `units:[{key: topicId, label: 课名}]`、`items`: 练习题每题 `{key: topicId + '#' + i, label: '第 i 题', unit: topicId}`；复习卷 → 每课一个 unit、题按所属课；讲解/解析页不放二维码（`use` 只找第一张非答案页：奥数用 `data-kind` 标出练习页，渲染时给练习页 `<section class="sheet" data-kind="practice">`；sheets.use 优先找 `[data-kind=practice]`，没有就找第一张不带 `-ans` 类的 `.sheet`）
- Test: 预览各打开一次截图看二维码位置

- [ ] Step 1–3 同上模式；提交 `feat: 奥数与五个游戏注册纸记录、印二维码`

### Task 8: 识字、拼音接入

**Files:**
- Modify: `js/shizi-main.js`：当前卷（每日/周/错字/检查）渲染后 `sheets.use({module:'shizi', ..., items: chars.map(ch => ({key: ch, label: ch})), ref:{ kind, paperD: paper.d /* 每日卷 */ }})`
- Modify: `js/pinyin-main.js`：今日卷/历史卷渲染后 `sheets.use({module:'pinyin', ..., ref:{ sheetId: 卷号 }})`；拼音页支持 `pinyin.html?sheet=<卷号>` 打开到该卷的登记区（若已有按卷号查找功能，复用）
- Modify: `css/pinyin.css`：`@media (max-width: 600px)` 下登记区单列、按钮够大、不横向滚动
- 识字「已登记」判断给登记页用：`SumSum.shiziMark` 暴露 `isSettled(ref)`（每日卷看 papers 里对应 d 的 settled；其他卷看当天 log）

- [ ] 实现、预览、`check-shizi-mark.js`/`check-pinyin.js` 全绿；提交 `feat: 识字、拼音纸角二维码`

### Task 9: 登记页 mark.html

**Files:**
- Create: `mark.html`、`js/mark-main.js`、`css/mark.css`
- 页面加载：store、sheets-core、账号、sync（`sync.init` 完成后再渲染；拉下来有应用会自动刷新一次，已有逻辑）、识字所需脚本（shizi-data/core/mark）、口算 settings、奥数 topics、shudu-core（取 CLUE_RANGE）、各游戏 settings
- 渲染：
  1. 顶部：这张纸（标题、日期、板块）。找不到 → 「电脑那边还没同步好，过几秒点刷新」+ 刷新按钮；若 `id` 不合法或刷新两次仍无 → 「找不到这张纸。可能是别的账号打印的，或者已经超过 60 天。」
  2. 按 `MODULE_KIND`：three → 三个大按钮 + 标准说明 +「展开点错题」（题目网格，点 = 错，点过即自动定档并高亮对应按钮，可手动改）；奥数多课 → 每课一行三档；game → 太简单/刚好/太难；chars → 字格点没认出 + 「登记」按钮调用 shiziMark 的 togglePick/settle（与识字页同一语义）；link → 「去拼音页登记」跳 `pinyin.html?sheet=…`
  3. 保存即生效：写 `rating`/`wrong`；奥数：先 `aoshuRevert` 旧 applied 再 `aoshuApply`，写 `sumsum:aoshu:learned:v1`、`sumsum:aoshu:review-due:v1`，存新 applied；游戏：旧 applied 有 prev 先还原，再 `gameStep` 写对应设置键（`sumsum:<module>:v1`，数独 `sumsum:shudu:v1`），applied 存 `{prev, next}`
  4. 下半部「今天还没登记的纸」：`pending()`（识字/拼音按 ref 填 done），逐张同样的控件；全部完成显示「今天的纸都登记好了」
- 电脑访问同样可用（宽屏居中 480px 卡片列）
- Test: `tools/e2e-mark-browser.py`（见 Task 13）

- [ ] 实现；预览手机尺寸（375×812）手测：未登录跳登录再回、同步未到提示、三档、展开点错自动定档、改档不叠加（看奥数已学与火柴关卡）、识字点字后识字页错字集变化；提交 `feat: 手机登记页（扫码一次登记当天所有纸）`

### Task 10: 「今天」页

**Files:**
- Modify: `js/today-core.js`（无 DOM，可测）+ `js/today.js` + `tools/check-today.js`
- 加：`pendingCount`（顶部一行「还有 N 张纸没登记」，链接到最近一张的 `/mark?id=`）；口算卡 `kousuanUpgrade` 提示 + 「换到 XX」按钮（写口算设置为该预设 patch）；奥数卡：最近一课打 bad → 「这一课再练一张」（调 `aoshu.batch.roll` 后去 `aoshu.html?topic=…#print`）、`review-due` ≥ 3 → 「打印复习卷（待复习 N 课）」（设 reviewTopics=due、review=true）；游戏卡：最近一次 applied.changed → 「按上次反馈升到第 3 关 · 撤销」（撤销写回 prev，并把该纸 applied 标为 undone）
- 测试：check-today 增加以上判断的纯函数用例（构造 storage）
- [ ] 实现、测、提交 `feat: 今天页显示待登记、升档、再练、复习卷与升降关撤销`

### Task 11: 管理后台每周登记统计

**Files:**
- Modify: `server/repo-d1.js`（`sheetRatingsSince(since)`：`SELECT user_id, value FROM data WHERE key LIKE 'sumsum:sheet:v1:%' AND updated_at>=?`）、`server/admin-core.js`（按用户数 rating 非空且 rating.at ≥ 本周一 0 点的纸数）、`functions/api/admin/*`（已有 admin 列表接口里带上 `marked7d`）、`js/admin-main.js` 表格加一列「近 7 天登记」
- Test: `tools/check-invite-core.js` 或 admin 相关检查里加 fake repo 用例
- [ ] 实现、测、提交 `feat: 后台显示每个家庭近 7 天登记了几张纸`

### Task 12: 帮助、更新记录、介绍页

**Files:** `js/help.js`（加「扫码登记」一节）、`js/changelog.js` 顶部一条（家长看得懂：纸角二维码、三档、自动升降关）、`welcome.html` 核对「家长回来点一下」说法（现在全板块成立，可加一句「手机扫纸角二维码就能登记」）、`node tools/check-changelog.js`
- [ ] 改、跑 stamp-assets、提交 `docs: 扫码登记的使用说明与更新记录`

### Task 13: 全流程验证

**Files:** Create `tools/e2e-mark-browser.py`（照 `tools/e2e-account-browser.py` 写法，playwright 用 `/opt/homebrew/opt/python@3.10/bin/python3.10`）

- [ ] 桌面：登录 → 口算、奥数、识字、火柴各出一张 → 触发 `window.dispatchEvent(new Event('beforeprint'))` → 读页眉二维码地址
- [ ] 手机上下文（新 context，375×812，未登录）：打开 `/mark?id=` → 跳登录 → 登录后回到该纸 → 打分 / 点错题 / 列表里连续登记 → 断言存储变化（奥数已学、火柴关卡、识字错字）
- [ ] 回桌面刷新：口算下一张含错题；今天页出现提示
- [ ] 每个板块 `page.pdf()` 导出，转图检查二维码不压题、页数与改前相同；用 `pyzbar`/`zxing`（若可用）解码 PDF 栅格图里的二维码，不可用则肉眼核对
- [ ] `node tools/check-*.js` 全绿、`stamp-assets` 最新
- [ ] 提交 `test: 扫码登记浏览器全流程`；推送与部署按项目惯例由站长确认后进行；请站长用微信扫一次实测
