# 识字「每日一卷」实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 识字板块加「每日一卷」（每天一张冻住的 20 字卷：≤10 个到期错字 + 认识字补满，按 1/3/7/15 天阶梯毕业），同时把全站标记语义统一成「点不认识的字 → 登记结果」，修掉打印后卷面「变脸」的问题。

**Architecture:** 纯函数全部进 `js/shizi-core.js`（v3 记录、迁移、到期挑选、卷子构建、登记批处理），`tools/check-shizi.js` 用 node 直接测（TDD）。存储与交互在 `js/shizi-mark.js` 重写：v3 存储 + 当日「点选集」（点了=没认出，只存选择、登记时才落库）+ 快照撤销。`js/shizi-main.js`/`shizi.html`/`css/shizi.css` 加「每日一卷」页签（默认）与登记区。渲染复用 `renderWrong`。

**Tech Stack:** 无构建、无框架、无测试框架。纯静态 js（IIFE 挂 `SumSum.*`），node 脚本即测试，浏览器实测收尾。

**Spec:** `docs/superpowers/specs/2026-11-09-shizi-daily-design.md`

## Global Constraints

- 存储键前缀 `sumsum:` 永不改；`sumsum:shizi:wrong:v2`/`v1` 旧键**不删**（老备份仍可导入）。
- 新键只有四个：`sumsum:shizi:wrong:v3`、`sumsum:shizi:picks:v1`、`sumsum:shizi:undo:v1`、`sumsum:shizi:daily:v1`。
- 纸上不印任何标记：打印段必须压掉新增的 `is-pick`、`data-k`（现有 `is-wrong`/`data-n` 已压）。
- 点击绝不触发重渲染：点字只改 class，卷面结构不动（`js/shizi-mark.js` 文件头的既有红线）。
- 不动打印排版体系（`sheet.css`、`shizi-render.js` 的 layout）、不动字表与 `TOTAL=1600`。
- 核心逻辑一律先在 `tools/check-shizi.js` 写测试、跑挂、再实现、跑过、提交。
- 提交信息 `<type>: <中文描述>`，结尾 `Co-Authored-By: Claude Code <noreply@anthropic.com>`。
- 代码注释密度与文风照抄现有文件（中文、讲「为什么」）。

## Review Focus

1. **跨月/跨年的到期日计算**：`addDays('2026-11-30', 1)` 应为 `'2026-12-01'`，`addDays('2026-12-31', 1)` 应为 `'2027-01-01'` —— 测试钉死在 Task 1。
2. **同一天重复登记的幂等**：又错/认出/毕业当天重复结算不得重复加次数、不得把「又错」再记一次；毕业当天反悔再点应撤销毕业并 n+1 —— 测试钉死在 Task 1（markFail/markPass 幂等）与 Task 3（settleApply 二次结算）。
3. **v1/v2 老数据迁移**：`{add:''}`（v1）、缺 `n` 的条目、`out` 墓碑、垃圾条目都要走对 —— 测试钉死在 Task 1（migrateWrong）。
4. **在集但未到期的字**：既不进每日卷的错字位（只取到期的），也不能混进认识字位（在集就排除）；毕业字（有 out）可以当认识字 —— 测试钉死在 Task 2（buildDaily）。
5. **选择集跨页/隔天串扰**：隔天的 picks 必须作废；一张卷上点的字被另一张卷的登记「误算认出」（先附录页后每日卷、或反过来）不得发生——picked 是全局的，登记只消费本卷字符、markPass 对 `fail===今天` 的字跳过 —— 测试钉死在 Task 3；浏览器实测在 Task 5/7。

---

### Task 1: v3 纯函数——毕业阶梯与三个迁移/进出函数

**Files:**
- Modify: `js/shizi-core.js`（在 `titleFor` 之前加一节，导出表加新名字）
- Modify: `tools/check-shizi.js`（新节 5f、5g；跑段注册）

**Interfaces:**
- Consumes: 现有 `markCount`、`pool`。
- Produces（挂到 `SumSum.shizi` 上，后续任务全靠这些名字）:
  - `addDays(d: 'YYYY-MM-DD', n: number): 'YYYY-MM-DD'`
  - `PASS_INTERVALS = [1, 3, 7, 15]`
  - `passesNeeded(n: number): number`（n≥2 → 4，否则 2）
  - `stateOf(e): 'wrong' | 'once' | 'out'`（k≥1 在集 → once）
  - `markEnter(e | null, t): entry`（新收进；旧墓碑 n 接着加）
  - `markFail(e, t): entry`（又没认出；幂等）
  - `markPass(e, t): entry`（认出一次或毕业；幂等）
  - `migrateWrong(rawV2Map, t): v3Map`

  v3 entry 形状（日期都是本地日期字符串）：
  `{ add, n, k, due, hit?, fail?, out?, first? }` —— `out` 存在 = 已毕业（墓碑只剩 `n`/`out`/`first`）；`k`/`due` 仅在集内有效；`add`=本轮进集日，`fail`=最近一次「又错」日，`hit`=最近一次「认出」日（后两个只用于当天幂等和复习记录重算）。

- [ ] **Step 1: 写失败测试（check-shizi.js）**

在 5e 之后加两节（`canon`/`bad`/复用的测试基建都在，`eq` 是 5b 里那个局部 helper 的样式，新节里自己定义）：

```js
/* ---------- 5f. 每日一卷：毕业阶梯（addDays / markEnter / markFail / markPass） ---------- */

/*
 * 间隔阶梯（2026-11-09 与用户定的）：进集后第 1 天考；认出后隔 3、7、15 天再考。
 * 首错字（n=1）认出 2 次毕业；错过 2 次以上的字（n≥2）要认出 4 次。
 * 任一步没认出：k 归 0、n +1、明天再考。
 */
function checkDailySrs() {
  function eq(a, b, msg) {
    if (canon(a) !== canon(b)) bad('每日一卷 ' + msg + '：期望 ' + JSON.stringify(b) + '，实际 ' + JSON.stringify(a))
  }
  /* 日期加减跨月、跨年 —— due 全靠它算，错一天整条阶梯就歪了 */
  eq(Z.addDays('2026-11-09', 0), '2026-11-09', '加 0 天应原样')
  eq(Z.addDays('2026-11-30', 1), '2026-12-01', '跨月')
  eq(Z.addDays('2026-12-31', 1), '2027-01-01', '跨年')
  eq(Z.addDays('2026-11-09', 15), '2026-11-24', '加 15 天')
  eq(Z.addDays('', 3), '', '坏日期应返回空串不炸')

  eq(Z.passesNeeded(1), 2, '首错字认 2 次毕业')
  eq(Z.passesNeeded(2), 4, '错 2 次认 4 次')
  eq(Z.passesNeeded(9), 4, '错很多次也是 4 次')

  /* 主线一：首错字 D0 错 → D1 认出（+3）→ D4 认出 → 毕业 */
  var e = Z.markEnter(null, '2026-11-09')
  eq(e, { add: '2026-11-09', n: 1, k: 0, due: '2026-11-10', first: '2026-11-09' }, '新收进：明天考')
  e = Z.markPass(e, '2026-11-10')
  eq(e, { add: '2026-11-09', n: 1, k: 1, due: '2026-11-13', hit: '2026-11-10', first: '2026-11-09' }, '第 1 次认出后隔 3 天')
  e = Z.markPass(e, '2026-11-13')
  eq(e, { n: 1, out: '2026-11-13', first: '2026-11-09' }, '第 2 次认出毕业，只留 n / out / first')

  /* 主线二：n≥2 的字四步 1/3/7/15 */
  var f = { add: '2026-11-09', n: 2, k: 0, due: '2026-11-10', first: '2026-11-01' }
  f = Z.markPass(f, '2026-11-10')
  eq([f.k, f.due], [1, '2026-11-13'], '×2 的字第 1 次认出 +3')
  f = Z.markPass(f, '2026-11-13')
  eq([f.k, f.due], [2, '2026-11-20'], '第 2 次 +7')
  f = Z.markPass(f, '2026-11-20')
  eq([f.k, f.due], [3, '2026-12-05'], '第 3 次 +15')
  f = Z.markPass(f, '2026-12-05')
  eq(f, { n: 2, out: '2026-12-05', first: '2026-11-01' }, '第 4 次才毕业')

  /* 又没认出：k 归 0、n +1、明天考；同一天重复记不叠加 */
  var g = { add: '2026-11-01', n: 1, k: 1, due: '2026-11-04', hit: '2026-11-01', first: '2026-11-01' }
  g = Z.markFail(g, '2026-11-04')
  eq(g, { add: '2026-11-01', n: 2, k: 0, due: '2026-11-05', fail: '2026-11-04', first: '2026-11-01' }, '又错一次从头走')
  eq(Z.markFail(g, '2026-11-04'), g, '同一天不能再记一次又错')
  eq(Z.markPass(g, '2026-11-04'), g, '今天错了的字当天不能记认出')

  /* 毕业后又错（含当天反悔）：n 接着加 */
  var h = Z.markEnter({ n: 3, out: '2026-11-04', first: '2026-11-01' }, '2026-11-08')
  eq(h, { add: '2026-11-08', n: 4, k: 0, due: '2026-11-09', first: '2026-11-01' }, '毕业再错：n=4、从头走四步')
  /* 在集里的字不该走 markEnter（登记层会拦），这里兜底返回原样 */
  eq(Z.markEnter({ add: '2026-11-01', n: 1, k: 0, due: '2026-11-02' }, '2026-11-02'),
    { add: '2026-11-01', n: 1, k: 0, due: '2026-11-02' }, '在集里 markEnter 应原样返回')

  /* 今天刚进的字：当天不能记认出、不能再记又错 */
  var fresh = { add: '2026-11-09', n: 1, k: 0, due: '2026-11-10' }
  eq(Z.markPass(fresh, '2026-11-09'), fresh, '今天进的当天不能算认出')
  eq(Z.markFail(fresh, '2026-11-09'), fresh, '今天进的当天不能又算一次错')

  /* stateOf */
  eq(Z.stateOf(null), 'out', 'null 是 out')
  eq(Z.stateOf({ n: 1, out: '2026-11-01' }), 'out', '墓碑是 out')
  eq(Z.stateOf({ add: '2026-11-01', n: 1, k: 0, due: '' }), 'wrong', 'k=0 红底')
  eq(Z.stateOf({ add: '2026-11-01', n: 2, k: 1, due: '' }), 'once', 'k≥1 半红')
  eq(Z.stateOf({ add: '2026-11-01', n: 2, k: 3, due: '' }), 'once', 'k=3 仍是半红')

  /* 不改传入对象 —— 登记层靠这个做整卷回滚 */
  var orig = { add: '2026-11-01', n: 2, k: 1, due: '2026-11-04' }
  Z.markPass(orig, '2026-11-04')
  Z.markFail(orig, '2026-11-04')
  Z.markEnter(orig, '2026-11-04')
  eq(orig, { add: '2026-11-01', n: 2, k: 1, due: '2026-11-04' }, '不应改动传入的条目')
}

/* ---------- 5g. v2/v1 老记录迁进 v3 ---------- */

/* 一轮刚摸完底：在集的字一律当作「今天到期」，从今天开始按新阶梯走 */
function checkMigrateWrong() {
  function eq(a, b, msg) {
    if (canon(a) !== canon(b)) bad('迁移 ' + msg + '：期望 ' + JSON.stringify(b) + '，实际 ' + JSON.stringify(a))
  }
  var T = '2026-11-09'
  var m = Z.migrateWrong({
    甲: { add: '2026-09-01', n: 1 },                     // 红底 → k=0 今天到期
    乙: { add: '2026-09-01', hit: '2026-10-01', n: 1 },  // 半红 → k=1（认出过一次算数）
    丙: { add: '2026-09-01', n: 3, out: '2026-10-01', first: '2026-09-01' }, // 已移出 → 墓碑
    丁: { add: '' },                                      // v1 老条目：当作 n=1 的红底
    戊: 42                                                // 垃圾 → 丢弃
  }, T)
  eq(m.甲, { add: '2026-09-01', n: 1, k: 0, due: T }, '红底 k=0 今天到期')
  eq(m.乙, { add: '2026-09-01', n: 1, k: 1, due: T }, '半红 k=1 今天到期')
  eq(m.丙, { n: 3, out: '2026-10-01', first: '2026-09-01' }, '移出的保持墓碑')
  eq(m.丁, { add: '', n: 1, k: 0, due: T }, 'v1 条目当作 1 次红底')
  if (m.戊 != null) bad('迁移 垃圾条目应丢弃，实际 ' + JSON.stringify(m.戊))
  eq(Z.migrateWrong(null, T), {}, '空输入返回空表')
}
```

在文件末尾「跑」那一节的列表里各加一行（照现有条目格式）：

```js
  ['每日一卷：毕业阶梯', checkDailySrs],
  ['每日一卷：v2/v1 迁移', checkMigrateWrong],
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node tools/check-shizi.js`
Expected: 新两节 ✗，报 `Z.addDays is not a function` 一类。

- [ ] **Step 3: 实现（shizi-core.js）**

在 `markUnmiss` 与 `historyStats` 之间插入一节：

```js
  /*
   * ============ 每日一卷（2026-11）：间隔阶梯、到期挑选、登记 ============
   *
   * 错字集从「进一出二」升级成间隔阶梯（与用户 2026-11-09 定的）：
   *   进集 / 又错 → 第 2 天考；认出一次后隔 3 天，再 7 天，再 15 天；
   *   首错字（n=1）认出 2 次毕业，错过 2 次以上（n≥2）要认出 4 次；
   *   任一步没认出：k 归 0、n +1，明天再考。
   * 记录升级为 v3（键 sumsum:shizi:wrong:v3），v2/v1 由 migrateWrong 迁入，旧键留着不删。
   *
   * entry 字段：add=本轮进集日，n=累计错过次数，k=本轮连续认出次数，
   * due=下次到期日（'' 或过去的日子都算到期），hit/fail=最近一次认出/又错的日子
   * （只为「同一天不重复记」和复习记录重算），out=毕业日，first=第一次错的日子。
   */

  var PASS_INTERVALS = [1, 3, 7, 15]

  function passesNeeded(n) {
    return n >= 2 ? 4 : 2
  }

  /* 'YYYY-MM-DD' 加 n 天。用本地时间构造再取回来：toISOString 走 UTC，
     北京时间早上 8 点前会把日期挪回前一天（today() 那条注释的同一个坑）。 */
  function addDays(d, n) {
    var p = String(d || '').split('-')
    if (p.length !== 3) return ''
    var dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + n)
    var z = function (v) {
      return (v < 10 ? '0' : '') + v
    }
    return dt.getFullYear() + '-' + z(dt.getMonth() + 1) + '-' + z(dt.getDate())
  }

  /* v3 的状态：k≥1 = 半红（攒认出次数中），k=0 = 红底，out/null = 不在集 */
  function stateOf(e) {
    if (!e || e.out) return 'out'
    return (e.k || 0) >= 1 ? 'once' : 'wrong'
  }

  /* 把统计字段搬去新条目、去掉 undefined 键（同下面的 carry，只搬 first） */
  function keepFirst(e, o) {
    if (e && e.first) o.first = e.first
    Object.keys(o).forEach(function (k) {
      if (o[k] === undefined) delete o[k]
    })
    return o
  }

  /* 新收进错字集（登记时点了的字）。以前错过的不清零，n 接着加 —— 再错自动走四步阶梯 */
  function markEnter(e, t) {
    if (e && !e.out) return e // 已经在集里：进集这条路由 markFail 表达，这里不动
    return keepFirst(e, { add: t, n: markCount(e) + 1, k: 0, due: addDays(t, 1) })
  }

  /* 又没认出：k 归 0、n +1、明天再考。今天动过（进/错/认出）的字一律原样返回 ——
     同一天登记两张都带着它，也只记一次 */
  function markFail(e, t) {
    if (!e || e.out) return e
    if (e.add === t || e.fail === t || e.hit === t) return e
    return keepFirst(e, { add: e.add, n: markCount(e) + 1, k: 0, due: addDays(t, 1), fail: t })
  }

  /* 认出来了（登记时没点的字）：k + 1；攒够 passesNeeded(n) 次就毕业（墓碑只剩 n/first） */
  function markPass(e, t) {
    if (!e || e.out) return e
    if (e.add === t || e.fail === t || e.hit === t) return e
    var n = markCount(e)
    var k = (e.k || 0) + 1
    if (k >= passesNeeded(n)) return keepFirst(e, { n: n, out: t })
    return keepFirst(e, { add: e.add, n: n, k: k, due: addDays(t, PASS_INTERVALS[k]), hit: t })
  }

  /* v2/v1 记录迁进 v3。在集的字一律 due=今天：一轮刚走完，从今天开始按新阶梯走。
     v1 的 {add:''} 与缺 n 的老条目当作 n=1 的红底（同 markCount 的口径）。 */
  function migrateWrong(raw, t) {
    var out = {}
    if (!raw || typeof raw !== 'object') return out
    Object.keys(raw).forEach(function (ch) {
      var e = raw[ch]
      if (!e || typeof e !== 'object' || (typeof e.add !== 'string' && typeof e.out !== 'string')) return
      var o
      if (e.out) {
        o = { n: markCount(e), out: e.out }
      } else {
        o = { add: e.add, n: markCount(e), k: e.hit ? 1 : 0, due: t }
      }
      out[ch] = keepFirst(e, o)
    })
    return out
  }
```

导出表（`root.SumSum.shizi = {` 那里）追加：

```js
    stateOf: stateOf,
    addDays: addDays,
    PASS_INTERVALS: PASS_INTERVALS,
    passesNeeded: passesNeeded,
    markEnter: markEnter,
    markFail: markFail,
    markPass: markPass,
    migrateWrong: migrateWrong,
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node tools/check-shizi.js`
Expected: 全部 ✓（新两节过，旧节不受影响——旧的 markStep 一族还没动）。

- [ ] **Step 5: 提交**

```bash
git add js/shizi-core.js tools/check-shizi.js
git commit -m "feat: 每日一卷核心——间隔阶梯、进出规则与 v2/v1 迁移（纯函数+测试）

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: 到期挑选与每日卷构建（dueList / buildDaily）

**Files:**
- Modify: `js/shizi-core.js`
- Modify: `tools/check-shizi.js`（新节 6b）

**Interfaces:**
- Consumes: Task 1 的 `stateOf`；现有 `pool()`。
- Produces:
  - `dueList(marks, t, rnd?): string[]` —— 到期（due ≤ t，'' 算最早）的在集字，最逾期优先 → n 大优先 → rnd() 决胜
  - `buildDaily(marks, t, rnd?): { wrong: string[], known: string[], chars: string[] }` —— wrong 最多 10、known 补到 20、chars 是 20 字的显示顺序（错字混在认识字里）
  - `DAILY_SIZE = 20`、`DAILY_WRONG_MAX = 10`（导出，测试与面板文案用）

- [ ] **Step 1: 写失败测试**

在 6（sampleWrong 节）之后加：

```js
/* ---------- 6b. 每日一卷：到期挑选与卷子构建（dueList / buildDaily） ---------- */

/*
 * 错字位只给「今天到期」的字：最逾期的排最前，同样逾期错得多的优先；
 * 未到期的字既不上错字位、也不许混进认识字位；毕业的字可以当认识字抽查。
 * 认识字从全字表完全随机（不加权重、不排除最近出过的）。
 */
function checkDailyBuild() {
  function eq(a, b, msg) {
    if (canon(a) !== canon(b)) bad('每日一卷 ' + msg + '：期望 ' + JSON.stringify(b) + '，实际 ' + JSON.stringify(a))
  }
  var T = '2026-11-09'
  var rnd = function () { return 0.5 } // 常数随机：顺序确定，专测规则不测运气
  var P = Z.pool()
  var marks = {}
  marks[P[0]] = { add: '2026-11-01', n: 1, k: 0, due: '2026-11-08' } // 昨天就到期（最逾期）
  marks[P[1]] = { add: '2026-11-01', n: 1, k: 0, due: T }            // 今天到期
  marks[P[2]] = { add: '2026-11-01', n: 2, k: 0, due: T }            // 今天到期、错得多
  marks[P[3]] = { add: '2026-11-01', n: 9, k: 0, due: '2026-11-10' } // 明天才到期
  marks[P[4]] = { n: 1, out: '2026-11-01' }                          // 已毕业

  var due = Z.dueList(marks, T, rnd)
  eq(due, [P[0], P[2], P[1]], '最逾期优先，同日 n 大优先；未到期与毕业的都不算')

  var p = Z.buildDaily(marks, T, rnd)
  eq(p.wrong, [P[0], P[2], P[1]], '到期错字全上卷（不足 10 不预支未来的）')
  if (p.chars.length !== 20) bad('每日一卷 总数应凑满 20，实际 ' + p.chars.length)
  var uniq = {}
  p.chars.forEach(function (ch) {
    if (uniq[ch]) bad('每日一卷 卷上出现重复字 ' + ch)
    uniq[ch] = true
  })
  p.known.concat(p.wrong).forEach(function (ch) {
    var e = marks[ch]
    if (e && !e.out && p.known.indexOf(ch) >= 0) bad('每日一卷 在集的字 ' + ch + ' 不能当认识字')
  })
  if (p.known.indexOf(P[3]) >= 0) bad('每日一卷 未到期的在集字 ' + P[3] + ' 混进了认识字')

  /* 错字多于 10 个：只取 10 个最逾期的 */
  var many = {}
  for (var i = 0; i < 15; i++) {
    many[P[i]] = { add: '2026-11-01', n: 1, k: 0, due: '2026-11-' + (i < 9 ? '0' + (i + 1) : i + 1) }
  }
  var q = Z.buildDaily(many, T, rnd)
  if (q.wrong.length !== 10) bad('每日一卷 错字位封顶 10，实际 ' + q.wrong.length)
  eq(q.wrong, Z.dueList(many, T, rnd).slice(0, 10), '取的是最逾期的 10 个')
  if (q.chars.length !== 20) bad('每日一卷 错字满额时也要凑满 20')

  /* 空错字集：20 个全认识字 */
  var r = Z.buildDaily({}, T, rnd)
  if (r.chars.length !== 20 || r.wrong.length) bad('每日一卷 空错字集应出 20 个认识字')

  /* 认识字是随机的：两次构建（真随机）不该回回一样；成员永远来自字表 */
  var a = Z.buildDaily({}, T)
  var b = Z.buildDaily({}, T)
  if (canon(a.known) === canon(b.known)) bad('每日一卷 认识字应有随机性（两次完全一样可疑）')
  a.chars.concat(b.chars).forEach(function (ch) {
    if (P.indexOf(ch) < 0) bad('每日一卷 卷上出现了字表以外的字 ' + ch)
  })
}
```

跑段列表注册 `['每日一卷：到期挑选与构建', checkDailyBuild],`。

- [ ] **Step 2: 跑测试确认失败**

Run: `node tools/check-shizi.js`
Expected: 新节 ✗，`Z.dueList is not a function`。

- [ ] **Step 3: 实现（shizi-core.js，紧跟 Task 1 那节）**

```js
  var DAILY_SIZE = 20
  var DAILY_WRONG_MAX = 10

  function shuffle(a, rnd) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1))
      var tmp = a[i]
      a[i] = a[j]
      a[j] = tmp
    }
    return a
  }

  /*
   * 到期（due ≤ 今天）的错字，最逾期的排前面；一样逾期的话错得多的优先；
   * 再一样就 rnd() 决胜。''（v1 迁移来等）比任何日期都小、最先到期。
   * rnd 可注入：check-shizi 喂常数把顺序钉死。
   */
  function dueList(marks, t, rnd) {
    var r = rnd || Math.random
    var arr = []
    Object.keys(marks || {}).forEach(function (ch) {
      var e = marks[ch]
      if (!e || e.out) return
      if (e.due && e.due > t) return
      arr.push({ ch: ch, due: e.due || '', n: markCount(e), r: r() })
    })
    arr.sort(function (a, b) {
      return (a.due < b.due ? -1 : a.due > b.due ? 1 : 0) || b.n - a.n || a.r - b.r
    })
    return arr.map(function (x) {
      return x.ch
    })
  }

  /*
   * 构建今天这一卷：≤10 个到期错字 + 认识字补满 20，显示顺序整体打乱
   * （错字混在认识字里，卷面上看不出哪些是复习位）。
   * 认识字池 = 字表里不在错字集里的全部字（毕业的算认识），完全随机。
   * 卷子一经生成就冻结，由 shizi-mark 存进 daily:v1。
   */
  function buildDaily(marks, t, rnd) {
    var r = rnd || Math.random
    var inSet = {}
    Object.keys(marks || {}).forEach(function (ch) {
      var e = marks[ch]
      if (e && !e.out) inSet[ch] = true
    })
    var wrong = dueList(marks, t, r).slice(0, DAILY_WRONG_MAX)
    var known = shuffle(pool().filter(function (ch) {
      return !inSet[ch]
    }), r).slice(0, DAILY_SIZE - wrong.length)
    return { wrong: wrong, known: known, chars: shuffle(wrong.concat(known), r) }
  }
```

导出表追加 `dueList`、`buildDaily`、`DAILY_SIZE`、`DAILY_WRONG_MAX`。

- [ ] **Step 4: 跑测试确认通过**

Run: `node tools/check-shizi.js`
Expected: 全部 ✓。注意 dueList 的 15 字测试里日期是 `'2026-11-0' + (i+1)` 拼出来的（01–09），排序按字符串比即可，别改成年月日对象。

- [ ] **Step 5: 提交**

```bash
git add js/shizi-core.js tools/check-shizi.js
git commit -m "feat: 每日一卷的到期挑选与 20 字组卷（纯函数+测试）

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: 登记批处理与复习记录重算（settleApply / refreshRow）

**Files:**
- Modify: `js/shizi-core.js`
- Modify: `tools/check-shizi.js`（新节 6c）

**Interfaces:**
- Consumes: Task 1 的 `markEnter`/`markFail`/`markPass`。
- Produces:
  - `settleApply(marks, chars: string[], picked: {字: true}, t): { marks, seen: string[] }`
    —— 点了的：在集字 `markFail`、不在集字 `markEnter`；没点的在集字 `markPass`。返回**新** marks（不改传入）与这次记进复习记录的字（= 处理过的在集字，不含新收进的）。
  - `refreshRow(row, marks, t): row` —— 复习记录当天一行的 ok/miss/out 按 marks 重算（ok 含移出，沿用老口径）。

- [ ] **Step 1: 写失败测试**

```js
/* ---------- 6c. 登记（settleApply）与复习记录重算（refreshRow） ---------- */

/*
 * 统一语义：点 = 没认出，没点 = 认出。登记是一批一起算：
 * 点了的在集字又错一次；点了的白底字收进错字集；没点的在集字认出一次（攒毕业）。
 * 同一天第二次登记必须幂等；先在一张卷上点过、另一张卷再登记不能把「又错」洗成「认出」。
 */
function checkSettle() {
  function eq(a, b, msg) {
    if (canon(a) !== canon(b)) bad('登记 ' + msg + '：期望 ' + JSON.stringify(b) + '，实际 ' + JSON.stringify(a))
  }
  var T = '2026-11-09'
  var T1 = '2026-11-10'
  var marks = {
    甲: { add: '2026-11-01', n: 1, k: 0, due: '2026-11-08', first: '2026-11-01' }, // 到期红底
    乙: { add: '2026-11-01', n: 1, k: 1, due: '2026-11-05', hit: '2026-11-05' },   // 半红，再认出一次毕业
    丙: { n: 2, out: '2026-10-01', first: '2026-09-01' }                            // 毕业字在卷上
  }

  var r = Z.settleApply(marks, ['甲', '乙', '丙', '丁'], { 甲: true, 丁: true }, T)
  eq(r.marks.甲, { add: '2026-11-01', n: 2, k: 0, due: T1, fail: T, first: '2026-11-01' }, '点了的在集字又错一次')
  eq(r.marks.乙, { n: 1, out: T }, '没点的半红认出 → 毕业')
  eq(r.marks.丙, { n: 2, out: '2026-10-01', first: '2026-09-01' }, '毕业字没点：原样')
  eq(r.marks.丁, { add: T, n: 1, k: 0, due: T1, first: T }, '点了的白底字收进错字集')
  eq(r.seen, ['甲', '乙'], 'seen = 处理过的旧错字（新收进的丁不算）')
  eq(marks.甲, { add: '2026-11-01', n: 1, k: 0, due: '2026-11-08', first: '2026-11-01' }, '不应改动传入的 marks')

  /* 同一天第二次登记（全都又过了一遍）：幂等，一个数都不多记 */
  var r2 = Z.settleApply(r.marks, ['甲', '乙', '丁'], {}, T)
  eq(r2.marks, r.marks, '第二次登记不应改动任何条目')
  eq(r2.seen, [], '第二次登记没有新的 seen')

  /* 毕业当天反悔：再点它 → 撤销毕业、n+1 从头走 */
  var r3 = Z.settleApply(r.marks, ['乙'], { 乙: true }, T)
  eq(r3.marks.乙, { add: T, n: 2, k: 0, due: T1 }, '反悔再点：撤销毕业、记一次错')

  /* 跨卷场景：甲在「另一张卷」已经被记了又错，这张卷没点它 —— 不能再算认出（markFail 守卫） */
  var other = Z.settleApply(marks, ['甲'], { 甲: true }, T)
  var again = Z.settleApply(other.marks, ['甲'], {}, T)
  eq(again.marks.甲, other.marks.甲, '今天已记又错的字，另一张卷不能再记认出')

  /* 复习记录重算：ok 含毕业的（沿用老口径），fail/add 今天 = miss */
  var row = { d: T, seen: '甲乙' }
  Z.refreshRow(row, r.marks, T)
  eq(row, { d: T, seen: '甲乙', ok: 1, miss: 1, out: 1 }, '认出/又错/毕业按当天标记重算')
}
```

跑段列表注册 `['每日一卷：登记', checkSettle],`。

- [ ] **Step 2: 跑测试确认失败**

Run: `node tools/check-shizi.js`
Expected: 新节 ✗。

- [ ] **Step 3: 实现（shizi-core.js，紧跟 dueList/buildDaily）**

```js
  /*
   * 登记一批卷面。picked 里是「点了 = 没认出」的字：
   *   点了：在集的又错一次（markFail），白底的收进错字集（markEnter）；
   *   没点：在集的认出一次（markPass），白底的不动。
   * 返回新 marks（不改传入）和 seen（这次记进复习记录的旧错字，新收进的不算）。
   * 幂等由 markFail / markPass 的「今天动过就跳过」保证：同一天登记两张卷
   * 都带着同一个字，也只记一次。
   */
  function settleApply(marks, chars, picked, t) {
    var out = Object.assign({}, marks || {})
    var seen = []
    ;(chars || []).forEach(function (ch) {
      var e = out[ch]
      var inSet = !!e && !e.out
      if (picked && picked[ch]) {
        if (inSet) {
          out[ch] = markFail(e, t)
          seen.push(ch)
        } else {
          out[ch] = markEnter(e, t)
        }
      } else if (inSet) {
        var next = markPass(e, t)
        if (next !== e) {
          out[ch] = next
          seen.push(ch)
        }
      }
    })
    return { marks: out, seen: seen }
  }

  /* 复习记录当天那行的数字按当前 marks 重算（登记后又点、反悔再点，都跟着变）。
     ok 含当天毕业的，与 v2 时代 refreshLog 同一个口径，历史页签的表头不用动。 */
  function refreshRow(row, marks, t) {
    var ok = 0
    var miss = 0
    var out = 0
    Array.from(row.seen).forEach(function (ch) {
      var e = marks[ch]
      if (!e) return
      if (!e.out && (e.add === t || e.fail === t)) miss++
      else if (e.out === t) out++
      else if (e.hit === t) ok++
    })
    row.ok = ok + out
    row.miss = miss
    row.out = out
    return row
  }
```

导出表追加 `settleApply`、`refreshRow`。

- [ ] **Step 4: 跑测试确认通过**

Run: `node tools/check-shizi.js`
Expected: 全部 ✓。

- [ ] **Step 5: 提交**

```bash
git add js/shizi-core.js tools/check-shizi.js
git commit -m "feat: 每日一卷的登记批处理与复习记录重算（纯函数+测试）

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: 标记层重写——v3 存储、点选集、登记/撤销；老页签语义统一

这是行为变化最大的一步：**点击从「立刻进出错字集」变成「点选 = 没认出」，点了不落库、登记时才一批结算**（选择集当日持久化，切板块/刷新不丢——这正是修「变脸」的那把钥匙）。`markStep`/`markClear`/`markMiss`/`markUnmiss`/旧 `markState` 一族删除，core 的 `reviewWeight`/`historyStats` 换用 `stateOf`。

**Files:**
- Rewrite: `js/shizi-mark.js`
- Modify: `js/shizi-main.js`（结算区、提示文案、页签徽标）
- Modify: `js/shizi-core.js`（删旧函数，`reviewWeight`/`historyStats` 换 `stateOf`）
- Modify: `tools/check-shizi.js`（删 5b/5c，改 5d/5e 的用例到 v3 形状）
- Modify: `css/shizi.css`（`is-pick`、`data-k` 及打印压制）
- Modify: `shizi.html`（图例文案）

**Interfaces:**
- Consumes: Task 1–3 的全部导出。
- Produces（`SumSum.shiziMark` 新面，shizi-main 与 Task 5 用）:
  - `has(ch)`, `size()`, `countOf(ch)`, `onceCount()`, `dueCount()`, `remainingOf(ch)`, `repeats()`, `all()`, `history()`, `todayLog()`, `weightOf(ch)` —— 查询
  - `picked(ch)`, `pickCount()`, `togglePick(ch)` —— 点选
  - `onSheet(chars): string[]`（卷面上在集的字）、`pickedIn(chars): string[]`
  - `settle(chars, paper?)`、`undoSettle()`、`canUndo()`
  - `setToday(fn)`（测试钩子：浏览器里模拟隔天）
  - `bind()`, `paint()`, `onChange(fn)`
  - Task 5 再加 `ensurePaper/discardPaper/paperAt/paperCount`

- [ ] **Step 1: 重写 `js/shizi-mark.js`**

整文件替换为（保留 `LOG_KEY`/log 那一套的形状，`sumsum:shizi:log:v1` 不变）：

```js
/**
 * 错字集（v3）+ 每日登记：点选「没认出」的字，登记时一批结算。
 *
 * 2026-11 起全站统一语义：**点 = 没认出**，登记时**没点的算认出**。
 * 点了先不落库 —— 只进当天的「点选集」（picks:v1，切板块、刷新、重开都不丢），
 * 点「登记结果」才一批写进错字集（settleApply）。这修掉了两件老毛病：
 *   1) 打印后切走再回来，附页错字重抽（appendPick 只活在 JS 变量里）——现在选择与卷子都落库；
 *   2) 「错字集页点 = 认出、本周页点 = 不认识」两套相反的规则——现在只有一个方向。
 *
 * 登记当天可整卷撤销：settle 前把 marks/log/papers 快照进 undo:v1，undoSettle 整体还原。
 *
 * 【点击绝不触发重新渲染】的老规矩不变（见 shizi-main 的 refresh）：点字只改 class。
 */
(function (root) {
  'use strict'

  var doc = root.document

  function C() {
    return root.SumSum.shizi
  }

  var KEY = 'sumsum:shizi:wrong:v3'
  /* v2/v1 只用来第一次迁移，迁完留着不删：老备份文件里还是这些键 */
  var KEY_V2 = 'sumsum:shizi:wrong:v2'
  var KEY_V1 = 'sumsum:shizi:wrong:v1'
  var PICK_KEY = 'sumsum:shizi:picks:v1'
  var UNDO_KEY = 'sumsum:shizi:undo:v1'

  function isObj(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v)
  }

  function readJSON(k) {
    try {
      return JSON.parse(root.localStorage.getItem(k))
    } catch (e) {
      return null
    }
  }

  function writeJSON(k, v) {
    try {
      root.localStorage.setItem(k, JSON.stringify(v))
    } catch (e) {
      /* 隐私模式下写入失败可忽略 */
    }
  }

  /* 本地日期。toISOString 是 UTC，北京时间早上 8 点前会算成前一天，所以自己拼。
     setToday 是测试钩子：浏览器实测「隔天」不必真等到明天。 */
  var todayFn = null
  function today() {
    if (todayFn) return todayFn()
    var d = new Date()
    var p = function (n) {
      return (n < 10 ? '0' : '') + n
    }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  }

  function setToday(fn) {
    todayFn = typeof fn === 'function' ? fn : null
  }

  /* 老的 v2/v1 原样读回来（不清洗——清洗交给 migrateWrong） */
  function loadV2Raw() {
    var raw = readJSON(KEY_V2)
    if (isObj(raw)) return raw
    var old = readJSON(KEY_V1)
    if (Array.isArray(old)) {
      var map = {}
      old.forEach(function (ch) {
        if (typeof ch === 'string' && ch) map[ch] = { add: '' }
      })
      return map
    }
    return {}
  }

  /* v3：有就用（条目防线同 v2 时代），没有就把 v2/v1 迁进来。
     在集的字一律今天到期——一轮刚摸完底，从今天开始按新阶梯走。 */
  function loadMarks() {
    var raw = readJSON(KEY)
    if (isObj(raw)) {
      var map = {}
      Object.keys(raw).forEach(function (ch) {
        var e = raw[ch]
        if (isObj(e) && (typeof e.add === 'string' || typeof e.out === 'string')) map[ch] = e
      })
      return map
    }
    var m = C().migrateWrong(loadV2Raw(), today())
    writeJSON(KEY, m)
    return m
  }

  var marks = loadMarks()
  var undoSlot = readJSON(UNDO_KEY)
  if (undoSlot && undoSlot.d !== today()) {
    undoSlot = null
    root.localStorage.removeItem(UNDO_KEY)
  }

  function saveMarks() {
    writeJSON(KEY, marks)
  }

  /* ---------- 点选集：点了 = 没认出，只存当天 ---------- */

  var picks = loadPicks()
  function loadPicks() {
    var p = readJSON(PICK_KEY)
    return isObj(p) && typeof p.d === 'string' && typeof p.chars === 'string' ? p : { d: '', chars: '' }
  }

  function savePicks() {
    writeJSON(PICK_KEY, picks)
  }

  function picked(ch) {
    return picks.d === today() && picks.chars.indexOf(ch) >= 0
  }

  /* 点一下切换选中/取消。登记前再点一下 = 撤回这一个 */
  function togglePick(ch) {
    if (!ch) return
    if (picks.d !== today()) picks = { d: today(), chars: '' }
    var i = picks.chars.indexOf(ch)
    if (i >= 0) picks.chars = picks.chars.slice(0, i) + picks.chars.slice(i + 1)
    else picks.chars += ch
    savePicks()
    fire()
  }

  /* 登记后只清掉这批字的选择；别的卷上点的还留着（那边登记时用） */
  function clearPicks(chs) {
    var keepSet = {}
    ;(chs || []).forEach(function (ch) {
      keepSet[ch] = true
    })
    picks.chars = Array.from(picks.chars).filter(function (ch) {
      return !keepSet[ch]
    }).join('')
    savePicks()
  }

  function pickCount() {
    return picks.d === today() ? Array.from(picks.chars).length : 0
  }

  /* ---------- 查询 ---------- */

  function stateOfCh(ch) {
    return C().stateOf(marks[ch])
  }

  function has(ch) {
    return stateOfCh(ch) !== 'out'
  }

  function members() {
    return Object.keys(marks).filter(has)
  }

  function size() {
    return members().length
  }

  function countOf(ch) {
    return C().markCount(marks[ch])
  }

  /* 还差几次毕业（在集的字才有意义），格子右上角的数字 */
  function remainingOf(ch) {
    var e = marks[ch]
    if (!e || e.out) return 0
    return C().passesNeeded(C().markCount(e)) - (e.k || 0)
  }

  /* 其中只差一次认出就毕业的 */
  function onceCount() {
    return members().filter(function (ch) {
      return remainingOf(ch) === 1
    }).length
  }

  /* 今天到期的字数（每日一卷页签的徽标用） */
  function dueCount() {
    var t = today()
    return members().filter(function (ch) {
      var due = marks[ch].due
      return !due || due <= t
    }).length
  }

  var REPEAT_MIN = 2
  function repeats() {
    var chars = C().sortByTable(Object.keys(marks).filter(function (ch) {
      return countOf(ch) >= REPEAT_MIN
    }))
    var rank = {}
    chars.forEach(function (ch, i) {
      rank[ch] = i
    })
    return chars
      .sort(function (a, b) {
        return countOf(b) - countOf(a) || rank[a] - rank[b]
      })
      .map(function (ch) {
        return { ch: ch, n: countOf(ch), on: has(ch) }
      })
  }

  function all() {
    return C().sortByTable(members())
  }

  /* 卷面上这些字里，哪些是旧错字（在集的） */
  function onSheet(chars) {
    var seen = {}
    return (chars || []).filter(function (ch) {
      if (seen[ch]) return false
      seen[ch] = true
      return has(ch)
    })
  }

  function pickedIn(chars) {
    var seen = {}
    return (chars || []).filter(function (ch) {
      if (seen[ch]) return false
      seen[ch] = true
      return picked(ch)
    })
  }

  /* ---------- 登记与撤销 ---------- */

  function settle(chars, paper) {
    var t = today()
    var pickedMap = {}
    if (picks.d === t) {
      Array.from(picks.chars).forEach(function (ch) {
        pickedMap[ch] = true
      })
    }
    /* 整卷回滚的快照：marks、复习记录、（Task 5 起）每日卷 */
    writeJSON(UNDO_KEY, { d: t, marks: marks, log: log, papers: papers })
    undoSlot = readJSON(UNDO_KEY)
    var r = C().settleApply(marks, chars, pickedMap, t)
    marks = r.marks
    if (r.seen.length) {
      var row = log.length && log[log.length - 1].d === t ? log[log.length - 1] : null
      if (!row) {
        row = { d: t, seen: '' }
        log.push(row)
      }
      r.seen.forEach(function (ch) {
        if (row.seen.indexOf(ch) < 0) row.seen += ch
      })
      C().refreshRow(row, marks, t)
    }
    if (paper) {
      paper.settled = true
      savePapers()
    }
    clearPicks(chars)
    saveMarks()
    saveLog()
    fire()
  }

  function undoSettle() {
    if (!undoSlot || undoSlot.d !== today()) return
    marks = isObj(undoSlot.marks) ? undoSlot.marks : {}
    log = Array.isArray(undoSlot.log) ? undoSlot.log : []
    if (isObj(undoSlot.papers)) {
      papers = undoSlot.papers
      savePapers()
    }
    saveMarks()
    saveLog()
    root.localStorage.removeItem(UNDO_KEY)
    undoSlot = null
    fire()
  }

  function canUndo() {
    return !!undoSlot && undoSlot.d === today()
  }

  /* ---------- 复习记录（键与格式都不变） ---------- */

  var LOG_KEY = 'sumsum:shizi:log:v1'
  var LOG_MAX = 120

  function loadLog() {
    try {
      var raw = JSON.parse(root.localStorage.getItem(LOG_KEY))
      return Array.isArray(raw) ? raw.filter(function (r) {
        return isObj(r) && typeof r.d === 'string' && typeof r.seen === 'string'
      }) : []
    } catch (e) {
      return []
    }
  }

  var log = loadLog()

  function saveLog() {
    try {
      root.localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-LOG_MAX)))
    } catch (e) {
      /* 隐私模式下写入失败可忽略 */
    }
  }

  function todayLog() {
    var t = today()
    return log.length && log[log.length - 1].d === t ? log[log.length - 1] : null
  }

  function history() {
    return {
      stats: C().historyStats(marks),
      log: log.slice().reverse()
    }
  }

  /* ---------- 每日卷存储（Task 5 的面板从这里取） ---------- */

  var PAPERS_KEY = 'sumsum:shizi:daily:v1'
  var PAPERS_MAX = 60

  function loadPapers() {
    var p = readJSON(PAPERS_KEY)
    return isObj(p) && Array.isArray(p.papers) ? p : { papers: [] }
  }

  var papers = loadPapers()

  function savePapers() {
    writeJSON(PAPERS_KEY, { papers: papers.papers.slice(-PAPERS_MAX) })
  }

  function paperCount() {
    return papers.papers.length
  }

  function paperAt(i) {
    return papers.papers[i] || null
  }

  /*
   * 拿「该看的那张卷」：有未登记的就先登记它（哪怕是昨天的）；
   * 今天已经登记过 → 就是它（今天完成了）；否则生成今天的新卷。
   * 一天一卷由「papers 只在生成时追加」保证；作废（discardPaper）是唯一的删法。
   */
  function ensurePaper() {
    var t = today()
    var last = papers.papers[papers.papers.length - 1] || null
    if (last && !last.settled) return last
    if (last && last.d === t) return last
    var b = C().buildDaily(marks, t)
    var p = { d: t, chars: b.chars.join(''), wrong: b.wrong.join(''), settled: false }
    papers.papers.push(p)
    savePapers()
    return p
  }

  /* 作废最后一张未登记的卷：字的数据一律不动，当天可以重新生成一张 */
  function discardPaper() {
    var last = papers.papers[papers.papers.length - 1]
    if (!last || last.settled) return false
    papers.papers.pop()
    clearPicks(Array.from(last.chars))
    savePapers()
    return true
  }

  /* ---------- 屏幕投影 ---------- */

  var listeners = []

  function fire() {
    listeners.forEach(function (fn) {
      fn(size())
    })
  }

  function onChange(fn) {
    listeners.push(fn)
  }

  function paintCell(cell, ch) {
    var st = stateOfCh(ch)
    var n = countOf(ch)
    cell.classList.toggle('is-wrong', st !== 'out')
    cell.classList.toggle('is-once', st === 'once')
    cell.classList.toggle('is-pick', picked(ch))
    if (n >= REPEAT_MIN) cell.dataset.n = n
    else delete cell.dataset.n
    var rem = remainingOf(ch)
    if (st !== 'out' && rem > 0) cell.dataset.k = rem
    else delete cell.dataset.k
  }

  function paint() {
    var cells = doc.querySelectorAll('#preview .shizi-cell')
    for (var i = 0; i < cells.length; i++) paintCell(cells[i], cells[i].dataset.ch)
  }

  function bind() {
    var preview = doc.getElementById('preview')
    if (!preview) return
    preview.addEventListener('click', function (ev) {
      if (preview.dataset.locked === '1') return // 往期卷只读
      var cell = ev.target.closest ? ev.target.closest('.shizi-cell') : null
      if (!cell || !preview.contains(cell)) return
      var ch = cell.dataset.ch
      if (!ch) return
      togglePick(ch)
      var same = preview.querySelectorAll('.shizi-cell[data-ch="' + ch.replace(/"/g, '\\"') + '"]')
      for (var i = 0; i < same.length; i++) paintCell(same[i], ch)
    })
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.shiziMark = {
    bind: bind,
    paint: paint,
    onChange: onChange,
    setToday: setToday,
    has: has,
    size: size,
    countOf: countOf,
    onceCount: onceCount,
    dueCount: dueCount,
    remainingOf: remainingOf,
    repeats: repeats,
    all: all,
    onSheet: onSheet,
    pickedIn: pickedIn,
    picked: picked,
    pickCount: pickCount,
    togglePick: togglePick,
    settle: settle,
    undoSettle: undoSettle,
    canUndo: canUndo,
    todayLog: todayLog,
    history: history,
    weightOf: function (ch) {
      return C().reviewWeight(marks[ch])
    },
    ensurePaper: ensurePaper,
    discardPaper: discardPaper,
    paperAt: paperAt,
    paperCount: paperCount
  }
})(typeof window !== 'undefined' ? window : globalThis)
```

注意两处前置依赖：`settle`/`undoSettle` 里引用了 `log`/`papers`，它们在函数定义之后才 `var` 初始化——把 `var log = loadLog()` 和 `var papers = loadPapers()` 挪到 `settle` 定义**之前**（或保持上面文件里的顺序：先声明 log/papers 相关段、再写登记段）。写文件时按此顺序排：存储基建 → 点选集 → 查询 → 复习记录/每日卷存储 → 登记/撤销 → 投影。

- [ ] **Step 2: 改 `js/shizi-core.js`——删旧族、换 state**

- 删除 `markState`、`markStep`、`carry`、`markClear`、`markMiss`、`markUnmiss` 六个函数及导出表里的对应项。
- `reviewWeight` 里 `markState(e)` 改 `stateOf(e)`。
- `historyStats` 里 `var st = markState(e)` 改 `var st = stateOf(e)`（返回值仍是 'wrong'/'once'/'out'，下游不动）。

- [ ] **Step 3: 改 `tools/check-shizi.js`——删旧节、修邻节**

- 整节删除 5b（checkMarkStep）与 5c（checkMarkMiss），跑段列表去掉对应两行。
- 5d（reviewWeight）与 5e（historyStats）的用例里，v2 形状的条目换成 v3：`{ add: D1, n: 1 }` 不变（k 缺省=0，权重 ×2、状态 wrong 不变）；原先靠 `hit: D2` 表示半红的，改成 `k: 1`。逐条跑过即可，规则本身没变。
- 跑：`node tools/check-shizi.js`，全部 ✓。

- [ ] **Step 4: 改 `js/shizi-main.js`——结算区与文案**

- `settle` 按钮回调：`S.shiziMark.settle(sheetChars())`；撤销回调：`S.shiziMark.undoSettle()`；两者之后都 `S.shiziMark.paint(); refreshMarkPanel()`（refreshMarkPanel 会在 onChange 里自动跑，显式调一次也无妨）。
- `settleHtml()` 重写（三种状态：今天已登记→结果+撤销按钮；卷面有在集字或有点选→登记按钮+说明；都没有→空）：

```js
  function settleHtml() {
    if (settings.mode === 'history' || settings.mode === 'daily') return ''
    var chars = sheetChars()
    var seen = S.shiziMark.onSheet(chars)
    var picked = S.shiziMark.pickedIn(chars)
    var row = S.shiziMark.todayLog()
    var html = ''
    if (row) {
      html += '<p class="hint settle-done">今天登记过 <b>' + row.seen.length + '</b> 个旧错字：认出 ' + row.ok +
        (row.out ? '（其中 ' + row.out + ' 个认满次数毕业）' : '') +
        '，又错 <b>' + row.miss + '</b> 个。' +
        (S.shiziMark.canUndo() ? ' <button type="button" class="link-btn" data-settle="undo">撤销登记</button>' : '') + '</p>'
    }
    if (seen.length || picked.length) {
      html += '<button type="button" class="btn btn-sm settle-btn" data-settle="go">登记结果</button>' +
        '<p class="hint">点了 <b>' + picked.length + '</b> 个没认出的；没点的 ' + seen.length +
        ' 个旧错字算认出（认出记一次，攒够次数毕业）。点错了再点一下就取消。</p>'
    }
    return html
  }
```

- `markHint()` 重写（统一新语义；错字集空时的引导照旧指到本周复习）：

```js
  function markHint(s) {
    var n = S.shiziMark.size()
    if (!n) {
      return '错字集还是空的。' +
        (s.mode === 'week' ? '孩子念不出来的字，在卷面上点一下（深红框），' : '切到「每日一卷」或「本周复习」，孩子念不出来的字点一下，') +
        '再点「登记结果」收进错字集。<b>纸上不会印出任何标记。</b>'
    }
    var once = S.shiziMark.onceCount()
    var head = '错字集里有 <b>' + n + '</b> 个字' +
      (once ? '（其中 ' + once + ' 个只差一次认出就毕业）' : '') + '。' +
      '复习按 1 → 3 → 7 → 15 天的间隔排：错过的字认出 ' +
      '<b>2 次</b>毕业；错过 2 次以上的要认出 <b>4 次</b>。'
    if (s.mode === 'wrong') {
      return head + '<br>考这一张时，孩子<b>没认出</b>的字点一下（深红框）；考完点「登记结果」，没点的算认出。'
    }
    var tail = head + '孩子念不出来的字，在卷面上点一下（深红框），点「登记结果」收进来。<b>纸上不会印出任何标记。</b>'
    if (s.withWrong && appendPick.length) {
      tail += '<br>附页的 ' + appendPick.length + ' 个旧错字：没认出的点一下，考完一并「登记结果」。'
    }
    return tail
  }
```

- `fillTabs` 里给「错字集」徽标照旧；「历史」页签文案里的「连续两次认出，移出了」「差一次移出」等字样按新规则改（`ST_LABEL` 与 `renderHistory` 里的卡片注释）：
  - `ST_LABEL = { wrong: '在错字集里', once: '认出过，还差几次看卷面右上角', out: '已毕业，移出了' }`
  - hist 卡片第二张副文案 `st.once ? '其中 ' + st.once + ' 个差一次移出'` 改 `'其中 ' + st.once + ' 个差一次毕业'`；第三张 `'连续两次认出，移出了'` 改 `'认满次数，毕业移出'`。
- `isStale` 判断不变（错字集模式重排版按钮照旧）；「重新排版」仍是用户自己清场的方式。
- `$('settle')` 的点击处理里 `data-settle="go"` 分支改 `S.shiziMark.settle(sheetChars())`；`"undo"` 分支改 `S.shiziMark.undoSettle()`，随后 `S.shiziMark.paint()` + `refreshMarkPanel()`。

- [ ] **Step 5: 改 `css/shizi.css` 与 `shizi.html`**

shizi.css 的标记段（`.shizi-cell.is-wrong` 附近）加：

```css
/*
 * 深红框 = 这次考没认出、点了等登记的字（is-pick）。登记之前它还只是「点选」，
 * 没进错字集 —— 但卷面上得比红底更醒目，家长核对纸上圈过的字一眼能对上。
 * 只改 background / box-shadow（叠加状态不改 color 的老规矩）。
 */
.shizi-cell.is-pick {
  background: #ec8f88;
  box-shadow: inset 0 0 0 2px var(--red, #d5453c);
}

/* 右上角的数字 = 还差几次认出毕业（只有错 2 次以上的字会大于 2） */
.shizi-cell[data-k] {
  position: relative;
}

.shizi-cell[data-k]::after {
  content: attr(data-k);
  position: absolute;
  top: 0.12em;
  right: 0.14em;
  font: 600 max(12px, 0.26em)/1 "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  color: var(--ink-soft);
}
```

`@media print` 段（`.shizi-cell[data-n]::before { display: none }` 之后）加：

```css
  .shizi-cell.is-pick {
    background: none;
    box-shadow: none;
  }

  .shizi-cell[data-k]::after {
    display: none;
  }
```

图例区 `.mark-legend .sw.pick`（与 .sw 并列）：

```css
.mark-legend .sw.pick {
  background: #ec8f88;
  box-shadow: inset 0 0 0 2px var(--red, #d5453c);
}
```

shizi.html 的 `#mark-legend` 内容改为：

```html
      <div class="mark-legend" id="mark-legend">
        <b>点字标记「没认出」</b>
        <span><i class="sw pick"></i>点了 = 这次没认出（登记时记）</span>
        <span><i class="sw"></i>在错字集里，还差右上角数字次认出</span>
        <span><i class="sw half"></i>认出过，攒次数中</span>
        <span><i class="n">×2</i>累计错过几次</span>
      </div>
```

- [ ] **Step 6: 浏览器实测（本周复习 + 错字集两页签的新语义）**

Run: `python3 -m http.server 8171 --directory .`（换个新端口，别撞缓存），开 `http://localhost:8171/shizi.html`，核对：
1. 老数据自动迁移：控制台 `localStorage.getItem('sumsum:shizi:wrong:v3')` 有内容、`wrong:v2` 还在。
2. 本周复习页点一个白底字 → 深红框；再点 → 取消；刷新页面 → 选择还在。
3. 错字集页：半红字右上角有数字；点一个字（深红框）→「登记结果」→ 半红变毕业（白底）、红底变红底 ×2；「撤销登记」整卷回滚。
4. 打印预览（⌘P）纸上无任何标记（红底/半红/深红框/角标全没有）。

- [ ] **Step 7: 提交**

```bash
git add js/shizi-mark.js js/shizi-main.js js/shizi-core.js tools/check-shizi.js css/shizi.css shizi.html
git commit -m "feat: 标记层重写——点选没认出+登记结算，全站语义统一，v3 存储迁移

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: 「每日一卷」页签（默认）、卷子生命周期与登记区

**Files:**
- Modify: `shizi.html`（页签 + 面板区）
- Modify: `js/shizi-settings.js`（MODES、默认 mode）
- Modify: `js/shizi-main.js`（daily 模式渲染与交互）
- Modify: `js/help.js`（识字说明）

**Interfaces:**
- Consumes: Task 4 的 `ensurePaper/discardPaper/paperAt/paperCount/settle(chars, paper)/canUndo/undoSettle/dueCount`。
- Produces: `settings.mode === 'daily'` 的完整页面（生成→打印→点选→登记→撤销→作废→往期浏览），`#preview[data-locked]` 只读约定。

- [ ] **Step 1: `js/shizi-settings.js`**

```js
  var MODES = ['daily', 'week', 'wrong', 'history']
```

`DEFAULTS.mode: 'daily'`（注释同步改：`daily 每日一卷 —— 默认，每天一张冻住的 20 字卷`）。其余不动：`load()` 无 URL 参数时 `delete base.mode`，正好实现「打开永远回到每日一卷」。

- [ ] **Step 2: `shizi.html`——页签与面板区**

`#mode-tabs` 里加第一个页签：

```html
          <button type="button" class="stage-tab" data-mode="daily">每日一卷<span id="daily-n"></span></button>
```

`#sec-progress` 之前插入：

```html
      <!-- 每日一卷的状态与操作。卷面在左边纸张区：生成后字固定，登记/作废才出下一张 -->
      <section class="group" id="sec-daily" hidden>
        <p class="hint" id="daily-status"></p>
        <div class="week-nav">
          <button type="button" id="btn-daily-settle" class="btn btn-sm btn-primary">登记结果</button>
          <button type="button" id="btn-daily-undo" class="btn btn-sm" hidden>撤销登记</button>
          <button type="button" id="btn-daily-drop" class="btn btn-sm" hidden>作废重来</button>
        </div>
        <div class="pair" id="daily-browse" hidden>
          <button type="button" id="btn-paper-prev" class="btn btn-sm">◀</button>
          <p class="hint" id="paper-which" style="flex:1;text-align:center;margin:0"></p>
          <button type="button" id="btn-paper-next" class="btn btn-sm">▶</button>
        </div>
      </section>
```

- [ ] **Step 3: `js/shizi-main.js`——daily 模式**

在 `appendChars` 附近加模块级状态与渲染：

```js
  /* 每日一卷：browseIdx=null 看最新一张；数字是 papers 数组的下标（往期只读） */
  var browseIdx = null

  function dailyPaper(s) {
    var p = browseIdx != null ? S.shiziMark.paperAt(browseIdx) : S.shiziMark.ensurePaper()
    return p
  }

  function renderDaily() {
    var p = dailyPaper()
    var t = S.shiziMark.today ? null : null // today 不导出；状态文案直接比日期
    var todayStr = (function () {
      var d = new Date()
      var z = function (v) { return (v < 10 ? '0' : '') + v }
      return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate())
    })()
    var active = browseIdx == null && !p.settled
    $('preview').dataset.locked = active ? '' : '1'
    S.shiziRender.renderWrong(S.shizi.settings /* 不对，见下 */, Array.from(p.chars), {
      title: '识字 · 每日一卷',
      foot: '每日一卷 · ' + p.chars.length + ' 字'
    })
    S.shiziMark.paint()
    var status = $('daily-status')
    if (active) {
      status.innerHTML = p.d === todayStr
        ? '今天的卷子已生成（20 字：到期错字 + 认识字随机）。打印去考，回来点<b>没认出</b>的字，再点「登记结果」。'
        : '有一张 ' + md(p.d) + ' 的卷子还没登记。对着那张纸点没认出的字再登记；不想登记就作废。'
    } else {
      status.innerHTML = (p.d === todayStr ? '今天' : md(p.d)) + '的卷子已登记。' +
        (browseIdx == null ? '明天自动生成新的一张。' : '（往期卷只读）')
    }
    $('btn-daily-settle').hidden = !active
    $('btn-daily-undo').hidden = !(browseIdx == null && p.settled && p.d === todayStr && S.shiziMark.canUndo())
    $('btn-daily-drop').hidden = !active
    var n = S.shiziMark.paperCount()
    $('daily-browse').hidden = n < 2
    $('paper-which').textContent = n ? md(p.d) + ' · 第 ' + (n - (browseIdx == null ? n - 1 : browseIdx)) + '/' + n + ' 张' : ''
    $('btn-paper-prev').disabled = browseIdx == null
    $('btn-paper-next').disabled = browseIdx != null && browseIdx >= n - 1
  }
```

上面 `renderWrong(S.shizi.settings ...)` 一行是故意留的坑提示：**第一个参数是当前 settings 对象**，写的时候用 `settings`（`perPage/font/copies/title` 全走现有排版），即：

```js
    S.shiziRender.renderWrong(settings, Array.from(p.chars), {
      title: '识字 · 每日一卷',
      foot: '每日一卷 · ' + p.chars.length + ' 字'
    })
```

`refresh()` 里加分支（放在 history 分支旁边）：

```js
    if (settings.mode === 'daily') {
      renderDaily()
      fitPreview()
      $('pages-hint').textContent = pagesHint(settings, (dailyPaper() || { chars: '' }).chars.length, null)
      $('btn-print').querySelector('.txt').textContent = '打印今日卷'
      refreshMarkPanel()
      S.shell.summary(['每日一卷', (dailyPaper() && dailyPaper().d) || '', '错字 ' + ((dailyPaper() && dailyPaper().wrong.length) || 0) + ' + 认识 ' + (((dailyPaper() && dailyPaper().chars.length) || 0) - ((dailyPaper() && dailyPaper().wrong.length) || 0))])
      $('notice').hidden = true
      return
    }
```

`fillForm` 里 `$('sec-daily').hidden = s.mode !== 'daily'`；`fillTabs` 里 `$('daily-n').textContent = n ? ' · ' + n : ''`（`n = S.shiziMark.dueCount()`）。`PRINT_LABEL` 加 `daily: '打印今日卷'`。`gotoMode` 里切到 daily 时 `browseIdx = null`。

按钮绑定（与 `$('settle')` 那段并排）：

```js
  $('btn-daily-settle').addEventListener('click', function () {
    var p = dailyPaper()
    if (!p || p.settled) return
    S.shiziMark.settle(Array.from(p.chars), p)
    refresh()
  })

  $('btn-daily-undo').addEventListener('click', function () {
    S.shiziMark.undoSettle()
    refresh()
  })

  $('btn-daily-drop').addEventListener('click', function () {
    if (!root.confirm('作废这张卷子？字的数据不动，今天可以重新生成一张。')) return
    S.shiziMark.discardPaper()
    browseIdx = null
    refresh()
  })

  $('btn-paper-prev').addEventListener('click', function () {
    var n = S.shiziMark.paperCount()
    browseIdx = browseIdx == null ? n - 2 : Math.max(0, browseIdx - 1)
    refresh()
  })

  $('btn-paper-next').addEventListener('click', function () {
    if (browseIdx == null) return
    var n = S.shiziMark.paperCount()
    if (browseIdx >= n - 1) browseIdx = null
    else browseIdx += 1
    refresh()
  })
```

`md()` 已有（历史页在用）。`pages-hint`/`paintSummary` 的 daily 分支照上面写；`refreshMarkPanel` 里 `$('sec-append').hidden = settings.mode !== 'week'` 照旧（附页开关只在周模式出现）。

- [ ] **Step 4: `js/help.js` 识字条目改写**

`lead` 改为：`'每天一张「每日一卷」：到期该复习的错字加认识字凑 20 个，生成后字固定，打印去考。'`；items 里第一条前插：

```js
        '<b>每日一卷</b>：打开识字页默认就是它。一天最多一张，生成后字冻住——切去别的板块再回来，还是同一张。考完对着纸点<b>没认出</b>的字，点「登记结果」：点的记又错，没点的算认出。当天可撤销登记；不想登记就作废重来。',
```

原「记下不会的字」「错字集」「复习完点结算」三条按新语义改写（点了=没认出、登记时结算、毕业=认满次数），删掉「当天点错了再点一下就撤回」这类旧规则描述。

- [ ] **Step 5: 浏览器实测（全流程）**

`python3 -m http.server 8172`，开 `/shizi.html`：
1. 默认进「每日一卷」，自动生成 20 字卷；页签上有到期数徽标。
2. 点 3 个字（深红框）→ 切到口算再回来 → 卷面不变、选择还在。
3. 「登记结果」→ 卷子锁定只读、状态变「已登记」；「撤销登记」→ 回滚可再点。
4. 控制台模拟隔天再走一轮：`SumSum.shiziMark.setToday(() => '2026-11-10')` 后 `location.reload()` 不会生效（setToday 不落库）——改为直接在控制台 `SumSum.shiziMark.setToday(() => '2026-11-10'); location.hash=''; ` 再手动点页签触发 refresh，或临时在控制台调用 `SumSum.shiziMark.setToday(()=> '2026-11-10')` 后点任意页签切换再切回。确认新的一天出新卷、昨天没登记的卷拦着不出新卷。
5. 作废重来：昨天未登记卷 → 作废 → 当天出新卷。
6. 打印预览：纸上 20 字、无标记、标题「识字 · 每日一卷」。
7. 跑 `node tools/check-shizi.js` 全绿。

- [ ] **Step 6: 提交**

```bash
git add shizi.html js/shizi-settings.js js/shizi-main.js js/help.js
git commit -m "feat: 识字「每日一卷」页签——一天一卷冻住、登记/撤销/作废与往期浏览

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 6: 备份兼容——describe 认识新键

**Files:**
- Modify: `js/backup.js`（describe）
- Modify: `tools/check-backup.js`

**Interfaces:**
- Consumes: 备份 data 里可能同时有 `wrong:v3`（新导出）或只有 `wrong:v2`/`v1`（老备份）。
- Produces: describe 优先 v3；`daily:v1` 加一行「每日卷 N 张」；`picks:v1`/`undo:v1` 不描述（当天临时态，无信息量）。

- [ ] **Step 1: 写失败测试（check-backup.js）**

在现有 describe 相关断言旁边加（沿用该文件已有的 `check(...)` 基建）：

```js
// describe：有 v3 时按 v3 描述（in-set = 无 out 的条目），并报每日卷张数
var data3 = {
  'sumsum:shizi:wrong:v3': JSON.stringify({
    甲: { add: '2026-11-09', n: 1, k: 0, due: '2026-11-10' },
    乙: { n: 2, out: '2026-11-01' }
  }),
  'sumsum:shizi:wrong:v2': JSON.stringify({ 丙: { add: '2026-09-01', n: 1 } }),
  'sumsum:shizi:daily:v1': JSON.stringify({ papers: [{ d: '2026-11-09', chars: '一二', wrong: '一', settled: false }] })
}
var lines3 = B.describe(data3)
check(lines3.some(function (l) { return l.indexOf('识字错字集：1 个字') >= 0 }), 'describe 应按 v3 数在集字数（墓碑不算、v2 不重复数）')
check(lines3.some(function (l) { return l.indexOf('每日卷：1 张') >= 0 }), 'describe 应报每日卷张数')
```

- [ ] **Step 2: 跑 `node tools/check-backup.js` 确认新断言失败**

- [ ] **Step 3: 改 `js/backup.js` 的 describe**

错字段（91–101 行那段）替换为：

```js
    var wrong3 = json(data, 'sumsum:shizi:wrong:v3')
    if (isObj(wrong3)) {
      var n = Object.keys(wrong3).filter(function (ch) {
        return isObj(wrong3[ch]) && !wrong3[ch].out
      }).length
      lines.push('识字错字集：' + n + ' 个字')
    } else {
      var wrong = json(data, 'sumsum:shizi:wrong:v2')
      if (isObj(wrong)) {
        var n2 = Object.keys(wrong).filter(function (ch) {
          return isObj(wrong[ch]) && !wrong[ch].out
        }).length
        lines.push('识字错字集：' + n2 + ' 个字')
      } else {
        var old = json(data, 'sumsum:shizi:wrong:v1')
        if (Array.isArray(old)) lines.push('识字错字集：' + old.length + ' 个字')
      }
    }
    var daily = json(data, 'sumsum:shizi:daily:v1')
    if (isObj(daily) && Array.isArray(daily.papers) && daily.papers.length) {
      lines.push('每日卷：' + daily.papers.length + ' 张')
    }
```

- [ ] **Step 4: 跑 `node tools/check-backup.js` 全绿**

- [ ] **Step 5: 提交**

```bash
git add js/backup.js tools/check-backup.js
git commit -m "feat: 备份摘要认识 wrong:v3 与每日卷键

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 7: 收尾——全量自查与真数据迁移演练

**Files:**
- 无新改动（发现问题回上游任务修）

- [ ] **Step 1: 全部 node 校验**

Run: `node tools/check-shizi.js && node tools/check-backup.js && node tools/check-today.js`
Expected: 全绿（check-today 顺带确认没碰坏别的板块的自检）。

- [ ] **Step 2: 迁移演练（贴近真实数据）**

`python3 -m http.server 8173`，控制台先手工铺一份「真实形状」的 v2（含墓碑、缺 n、v1 混入）再刷新：

```js
localStorage.setItem('sumsum:shizi:wrong:v2', JSON.stringify({
  明: { add: '2026-09-01', n: 1 },
  天: { add: '2026-09-01', hit: '2026-10-01', n: 2 },
  白: { add: '2026-09-01', n: 2, out: '2026-10-01', first: '2026-09-01' },
  云: { add: '' }
}));
localStorage.removeItem('sumsum:shizi:wrong:v3');
location.reload()
```

核对：v3 里 明(k0)/天(k1,n2 → 要 4 次)/白(墓碑)/云(n1) 四条对；错字集页签徽标 = 3；每日一卷的错字位含 明/天（今天到期），白/云不在错字位。

- [ ] **Step 3: 全流程走查（按 spec 的验收清单）**

生成 → 打印 → 切板块回来对纸点选 → 登记 → 撤销 → 作废 → 隔天（setToday 钩子）出新卷 → 往期浏览只读 → 备份导出/导入摘要正确。核对 spec「老页签的语义统一」一节的行为变化都成立。

- [ ] **Step 4: 汇报**

向用户汇报：语义反转点（错字集页点=没认出、结算=没点的算认出）、迁移做了什么、上线前的部署步骤（等用户确认再 `git push origin main`）。

---

## Self-Review 记录

- **Spec 覆盖**：毕业阶梯（Task 1）、每日卷生命周期与冻结（Task 5 + picks/papers 落库）、登记流程（Task 3/4）、老页签语义统一（Task 4）、迁移（Task 1/4/7）、历史页签不动（Task 4 仅改文案）、60 卷保留与往期（Task 5）、测试要求（各任务 TDD + Task 7 走查）——全部有对应任务。
- **占位符**：Task 5 renderDaily 里保留了一处故意标注的坑（`S.shizi.settings` 错误写法）并紧跟正确写法，执行者不会踩。
- **类型/命名一致性**：`stateOf/markEnter/markFail/markPass/migrateWrong/dueList/buildDaily/settleApply/refreshRow`（core）与 `settle/undoSettle/canUndo/ensurePaper/discardPaper/paperAt/paperCount/togglePick/pickedIn/onSheet/dueCount/remainingOf/setToday`（mark 层）在 Task 4/5 的消费处逐一核对过。
- **已知取舍**（写在这里，执行时不用再议）：登记才落库意味着「点了但永远不登记」的选择不会进错字集——面板文案已把「登记结果」放在显眼位置；毕业当天反悔再点按「一次真实的错」计 n+1（与旧版当天撤回不计次的口径不同，是统一语义的代价）。
