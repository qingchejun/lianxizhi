# 密码板块实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给练习纸站加第 6 个板块「密码」（密码推理打印练习纸，四关循序渐进）。

**Architecture:** 完全照数独板块的路子：`mima.html` + 无 DOM 依赖的 `js/mima-core.js`（生成/求解/验收）+ `js/mima-settings.js` + `js/mima-render.js` + `js/mima-main.js` + `css/mima.css` + 独立第二实现的校验脚本 `tools/check-mima.js`。求解器只会"孩子跟得上的排除动作"（划数字/定位/行内名额），同时是出题验收标准和答案页分步解析的来源。核心算法已在一次性原型（2026-11-19，800 局）验证过，本计划里的代码是它的定稿移植。

**Tech Stack:** 原生 ES5 风格 JS（IIFE 挂 `SumSum.*`，`var` + 2 空格缩进，与现有文件一致）、无框架无构建、node 直接跑的校验脚本、A4 纵向打印 CSS。

**Spec:** `docs/superpowers/specs/2026-11-19-mima-module-design.md`

## Global Constraints

- 现有文件只许改 `tools/rail.py`（加一个链接 + PAGES 一行），其余现有 js/css/html 一行不动。
- mulberry32 随机源在 `mima-core.js` 里**自抄一份**，不引共享依赖（数独先例）。
- 代码风格照 `js/shudu-core.js`：IIFE + `'use strict'` + `var`、中文注释讲"为什么"、尾部挂 `root.SumSum.xxx`、`(typeof window !== 'undefined' ? window : globalThis)` 收尾。
- `body` 的 font/line-height 不能动（卷面继承它）。
- 页面固定 A4 纵向：`<style>@page { size: A4 portrait; margin: 15mm; }</style>`。
- 所有内联 mm 向下取到 0.1mm；版心按 180×225mm（宽×可用高）算，排版常量留余量。
- 项目没有测试框架；校验是 `node tools/check-XXX.js` 独立脚本，**独立第二实现互为对证、自检先行**。
- 提交信息 `<type>: <description>`，结尾加 `Co-Authored-By: Claude Code <noreply@anthropic.com>`。
- 部署走 git push（不要主动 push，站长自己控制上线时机）。

## Review Focus

1. **版心溢出**（内联 mm 累计超出 225mm 多挤空白页）→ Task 4 的 checkLayout 独立重算 + Task 6 的 PDF 页数核对。
2. **线索说谎**（行反馈与密码对不上）→ Task 2 校验里用独立 `score2` 逐行重算。
3. **非唯一解/推不动的题混入** → Task 2 校验里用独立 `enumerate2` 数解（必须恰 1 个）+ `solve()` 必须推到底且等于密码。
4. **皮肤串关**（L1/L2 出现文字线索或 ○、L3/L4 出现点子/划掉表）→ Task 4 的 buildHTML 字符串断言。
5. **畸形参数**（`?level=L9`、`count=abc`、`copies=7`）→ Task 3 的 sanitize 钳位断言。
6. **对战双份把答案页也印两份**（泄题 + 浪费纸）→ Task 4 断言 copies=2 时答案页仍只 1 份。

---

### Task 1: 校验器骨架——独立实现与自检先行

**Files:**
- Create: `tools/check-mima.js`

**Interfaces:**
- Consumes: 无（本任务不依赖任何新 js）。
- Produces: `score2(guess, code) → [a, b]`、`enumerate2(pool, N, rows, cap) → [[digit,...],...]`（cap 满即停）、`selfTest() → string[]`、`main()`。后续任务往同文件**追加**各 check 段，不改动本任务的函数。

- [ ] **Step 1: 写入校验器骨架（独立实现 + 自检 fixture）**

```js
/**
 * 密码推理生成器校验脚本。用法：node tools/check-mima.js
 *
 * 套路照抄 check-shudu.js：① 求解/计数在这里【独立另写一遍】，故意不复用
 * mima-core 的实现，两套互为对证；② 脚本先跑「自检」——手工验证过的样例
 * （含那道经典的 5827 四位密码题）不通过就 exit，明说"是校验器坏了"。
 */
'use strict'

require('../js/mima-core.js')
require('../js/store.js') // 写入收口：mima-settings 的 save 走它（node 下无害）
require('../js/mima-settings.js')
require('../js/mima-render.js')
require('../js/render.js') // 只为 mima-render 的 P().esc 等零件；加载期不碰 DOM，node 可直接 require
var MI = globalThis.SumSum.mima

/* 关卡参数在这里【重新写一遍】，不从 mima-core 取——那边写错了这里才能发现。
   poolMin/poolMax 描述数字池（含两端）。 */
var LEVELS = {
  L1: { N: 3, poolMin: 1, poolMax: 6, rowMin: 4, rowMax: 5, bZero: true, dots: true, strip: true },
  L2: { N: 3, poolMin: 1, poolMax: 9, rowMin: 4, rowMax: 4, bZero: false, dots: true, strip: true },
  L3: { N: 3, poolMin: 0, poolMax: 9, rowMin: 4, rowMax: 4, bZero: false, dots: false, strip: false },
  L4: { N: 4, poolMin: 0, poolMax: 9, rowMin: 3, rowMax: 4, bZero: false, dots: false, strip: false }
}

/* 独立实现 ①：反馈计算。与 core 的 score 写法不同——先数两串共有的数字，
   再从中减去对位的，得到 (a, b)。 */
function score2(guess, code) {
  var share = 0
  for (var i = 0; i < guess.length; i++) {
    if (code.indexOf(guess[i]) >= 0) share++
  }
  var exact = 0
  for (var j = 0; j < guess.length; j++) {
    if (guess[j] === code[j]) exact++
  }
  return [exact, share - exact]
}

/* 独立实现 ②：解计数。与 core 的 enumerate 遍历方式不同——按位递归、位掩码
   记已用下标（密码各位顺序有意义，必须枚举全部排列而不是组合——自检就抓到过
   这个错：只枚举升序组合时 5827 永远找不到；数到 cap 个就停）。 */
function enumerate2(pool, N, rows, cap) {
  var found = []
  function step(pos, usedMask, cur) {
    if (found.length >= cap) return
    if (pos === N) {
      for (var r = 0; r < rows.length; r++) {
        var fb = score2(rows[r].g, cur)
        if (fb[0] !== rows[r].a || fb[1] !== rows[r].b) return
      }
      found.push(cur.slice())
      return
    }
    for (var i = 0; i < pool.length; i++) {
      if (usedMask & (1 << i)) continue
      cur.push(pool[i])
      step(pos + 1, usedMask | (1 << i), cur)
      cur.pop()
    }
  }
  step(0, 0, [])
  return found
}

/* ---------- 校验器自检：手工样例，先确认校验器本身是对的 ---------- */

/*
 * 样例 A：2026-11-19 站长发来的经典题（人工推过，密码 5827）。
 *   9341 —— 没有一个号码正确        (0,0)
 *   2697 —— 两个对，一个位置对      (1,1)
 *   4803 —— 一个对，位置对          (1,0)
 *   2598 —— 三个对，位置都不对      (0,3)
 */
var FIXTURE_5827 = {
  code: [5, 8, 2, 7],
  rows: [
    { g: [9, 3, 4, 1], a: 0, b: 0 },
    { g: [2, 6, 9, 7], a: 1, b: 1 },
    { g: [4, 8, 0, 3], a: 1, b: 0 },
    { g: [2, 5, 9, 8], a: 0, b: 3 }
  ]
}

/* 样例 B：L1 风格的 b=0 题（原型输出的手验样本，密码 613）。 */
var FIXTURE_L1 = {
  code: [6, 1, 3],
  rows: [
    { g: [2, 4, 3], a: 1, b: 0 },
    { g: [2, 1, 5], a: 1, b: 0 },
    { g: [4, 2, 5], a: 0, b: 0 },
    { g: [2, 5, 4], a: 0, b: 0 },
    { g: [5, 2, 4], a: 0, b: 0 }
  ]
}

function selfTest() {
  var fails = []

  /* score2 的四类反馈都得算对（拿 5827 的四行当已知答案） */
  FIXTURE_5827.rows.forEach(function (r) {
    var fb = score2(r.g, FIXTURE_5827.code)
    if (fb[0] !== r.a || fb[1] !== r.b) {
      fails.push('score2 对 ' + r.g.join('') + ' 算出 (' + fb + ')，应为 (' + r.a + ',' + r.b + ')')
    }
  })

  /* 5827 这组线索必须恰好一个解，且就是 5827 */
  var sols = enumerate2([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4, FIXTURE_5827.rows, 2)
  if (sols.length !== 1 || sols[0].join('') !== '5827') {
    fails.push('enumerate2 在 5827 样例上数出 ' + sols.length + ' 个解（应为 1 个且等于 5827）')
  }

  /* L1 样例：唯一解 613 */
  var l1 = enumerate2([1, 2, 3, 4, 5, 6], 3, FIXTURE_L1.rows, 2)
  if (l1.length !== 1 || l1[0].join('') !== '613') {
    fails.push('enumerate2 在 L1 样例上数出 ' + l1.length + ' 个解（应为 1 个且等于 613）')
  }

  /* 只有一行"全错"必然多解（cap=3 至少数到 2 个才说明计数器在工作） */
  var many = enumerate2([0, 1, 2, 3], 2, [{ g: [0, 1], a: 0, b: 0 }], 3)
  if (many.length < 2) fails.push('enumerate2 在明显多解的题上没数到 ≥2 个解')

  /* cap 生效：cap=1 就只找 1 个 */
  var one = enumerate2([0, 1, 2, 3], 2, [{ g: [0, 1], a: 0, b: 0 }], 1)
  if (one.length !== 1) fails.push('enumerate2 没有遵守 cap=1 的停止条件')

  return fails
}

function main() {
  var problems = []
  function report(msg) { problems.push(msg) }

  var selfFails = selfTest()
  if (selfFails.length) {
    console.log('✗ 校验器自检没通过——问题在校验脚本本身，先别动生成器：')
    selfFails.forEach(function (m) { console.log('   · ' + m) })
    process.exit(2)
  }
  console.log('✓ 校验器自检通过')

  if (problems.length) process.exit(1)
}

main()
```

注意：此时 `require('../js/mima-core.js')` 等四个文件还不存在，脚本会抛 `Cannot find module`——这是预期行为（红），Step 3 之前跑不通整脚本；本任务先只验证"文件齐了以后自检能绿"。为了让红绿循环干净，Step 2 先建四个**空壳文件**（只有 IIFE 骨架，挂空对象），让自检部分先跑起来。

- [ ] **Step 2: 建四个空壳 js（让校验器能加载，红转绿的中间态）**

```bash
cd /Users/qingche/coding/zhihebi
for f in mima-core mima-settings mima-render; do
  cat > "js/${f}.js" <<'EOF'
/**
 * 密码推理（占位骨架，随后续任务填充）。
 */
(function (root) {
  'use strict'
  root.SumSum = root.SumSum || {}
  root.SumSum.mima = root.SumSum.mima || {}
})(typeof window !== 'undefined' ? window : globalThis)
EOF
done
```

（三个壳都先挂到 `SumSum.mima` 上没关系，后续任务各自改名自己的命名空间。）

- [ ] **Step 3: 跑校验器，确认自检绿**

Run: `node tools/check-mima.js`
Expected: `✓ 校验器自检通过`（exit 0）

- [ ] **Step 4: Commit**

```bash
git add tools/check-mima.js js/mima-core.js js/mima-settings.js js/mima-render.js
git commit -m "test: 密码校验器骨架——独立 score/enumerate 实现与手工样例自检

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: 核心生成器 mima-core.js

**Files:**
- Modify: `js/mima-core.js`（整文件替换 Task 1 的壳）
- Modify: `tools/check-mima.js`（追加生成扫描段）

**Interfaces:**
- Consumes: 无。
- Produces（挂 `SumSum.mima`，后续任务全靠这些名字）:
  - `LEVELS`：`{ L1: {key,no,name,N,pool,rowMin,rowMax,bZero,dots,strip}, … }`，`pool` 是数字数组
  - `LEVEL_ORDER = ['L1','L2','L3','L4']`；`levelOf(key) → lv`（不认识的一律回 L1）
  - `score(guess, code) → [a, b]`
  - `clueText(a, b) → '这些号码都不在密码里' 之类的句子`
  - `enumerate(pool, N, rows, cap) → [[digit,...],...]`
  - `solve(pool, N, rows) → { solved:boolean, placed:[digit|null], trace:[string] }`
  - `makeRandom(seed)`；`makeOne(levelKey, rnd) → q | null`
  - `generate(s) → { puzzles:[q], shortfall:number }`，`s = { level, count, seed, noDuplicates }`
  - 题目对象 `q = { level, code:[digit], rows:[{g:[digit], a, b}], trace:[string], key:string }`
  - `titleFor(s) → '密码推理 · 第 1 关 点点入门'`

- [ ] **Step 1: 往校验器追加生成扫描段（先红）**

在 `tools/check-mima.js` 的 `selfTest()` 之后、`main()` 之前插入：

```js
/* ---------- 主校验：每关扫一批生成题 ---------- */

var ROUNDS = 300

function poolOf(lv) {
  var p = []
  for (var d = lv.poolMin; d <= lv.poolMax; d++) p.push(d)
  return p
}

function checkLevel(levelKey, report) {
  var lv = LEVELS[levelKey]
  var pool = poolOf(lv)

  for (var r = 1; r <= ROUNDS; r++) {
    var seed = r * 7919 + levelKey.charCodeAt(1) * 131
    var res = MI.generate({ level: levelKey, count: 1, seed: seed, noDuplicates: false })
    var q = res.puzzles[0]
    var where = levelKey + ' seed=' + seed
    if (!q) { report(where + '：generate 没产出题目'); continue }

    /* ① 密码本身：位数、不重复、都在池里 */
    if (q.code.length !== lv.N) report(where + '：密码位数 ' + q.code.length + ' ≠ ' + lv.N)
    if (new Set(q.code).size !== lv.N) report(where + '：密码数字重复 ' + q.code.join(''))
    q.code.forEach(function (d) {
      if (d < lv.poolMin || d > lv.poolMax) report(where + '：密码数字 ' + d + ' 不在池里')
    })

    /* ② 线索行：条数在关卡区间、行内数字合规、行不重复、行 ≠ 密码、反馈真算 */
    if (q.rows.length < lv.rowMin || q.rows.length > lv.rowMax) {
      report(where + '：线索 ' + q.rows.length + ' 行，超出 [' + lv.rowMin + ',' + lv.rowMax + ']')
    }
    var seenRow = {}
    q.rows.forEach(function (row) {
      var k = row.g.join('')
      if (k === q.code.join('')) report(where + '：有线索行等于密码本身')
      if (seenRow[k]) report(where + '：线索行重复 ' + k)
      seenRow[k] = 1
      if (row.g.length !== lv.N) report(where + '：行 ' + k + ' 位数不对')
      if (new Set(row.g).size !== lv.N) report(where + '：行 ' + k + ' 数字重复')
      row.g.forEach(function (d) {
        if (d < lv.poolMin || d > lv.poolMax) report(where + '：行 ' + k + ' 数字 ' + d + ' 不在池里')
      })
      var fb = score2(row.g, q.code)
      if (fb[0] !== row.a || fb[1] !== row.b) {
        report(where + '：行 ' + k + ' 反馈 (' + row.a + ',' + row.b + ') 与真算 (' + fb + ') 不符——线索说谎')
      }
      if (lv.bZero && row.b !== 0) report(where + '：L1 出现了 ○（b=' + row.b + '）')
    })

    /* ③ 唯一解（独立计数器）且就是那个密码 */
    var sols = enumerate2(pool, lv.N, q.rows, 2)
    if (sols.length !== 1) { report(where + '：【红线】解的个数是 ' + sols.length + '，不唯一'); continue }
    if (sols[0].join('') !== q.code.join('')) report(where + '：唯一解与 code 字段不一致')

    /* ④ 排除可解：solve 必须推到底、推出的就是密码、步骤是孩子跟得上的句式 */
    var sol = MI.solve(pool, lv.N, q.rows)
    if (!sol.solved) { report(where + '：【红线】只靠排除推不到底'); continue }
    if (sol.placed.join('') !== q.code.join('')) report(where + '：【红线】推出的密码与 code 不一致')
    if (!q.trace || !q.trace.length) report(where + '：trace 为空')
    q.trace.forEach(function (line) {
      if (!/^(第|定位|剩下|密码是)/.test(line)) report(where + '：解析步骤句式不对：' + line)
    })
    var last = q.trace[q.trace.length - 1]
    if (last !== '密码是 ' + q.code.join(' ')) report(where + '：解析末条应为密码本身，实际是 ' + last)

    /* ⑤ key 与题目对得上（去重靠它） */
    if (q.key !== levelKey + '|' + q.code.join('') + '|' + q.rows.map(function (x) { return x.g.join('') }).join('.')) {
      report(where + '：key 字段与题目内容不一致')
    }
  }
}

function checkReproducible(report) {
  ['L1', 'L4'].forEach(function (lk) {
    var s = { level: lk, count: 6, seed: 20261119, noDuplicates: true }
    var a = JSON.stringify(MI.generate(s).puzzles)
    var b = JSON.stringify(MI.generate(s).puzzles)
    if (a !== b) report(lk + '：同一种子两次生成不同（不可复现）')
    var other = JSON.stringify(MI.generate({ level: lk, count: 6, seed: 20261120, noDuplicates: true }).puzzles)
    if (a === other) report(lk + '：换种子题目没变（种子没生效）')
  })
}

function checkNoDuplicates(report) {
  var res = MI.generate({ level: 'L1', count: 12, seed: 424242, noDuplicates: true })
  var seen = {}
  res.puzzles.forEach(function (q) {
    if (seen[q.key]) report('L1：开了「题目不重复」仍出现重复题')
    seen[q.key] = 1
  })
  if (res.puzzles.length !== 12) report('L1：要 12 题只出了 ' + res.puzzles.length + ' 题')
}

function checkClueText(report) {
  var T = MI.clueText
  if (T(0, 0) !== '这些号码都不在密码里') report('clueText(0,0) 文案不对：' + T(0, 0))
  if (T(1, 0) !== '只有 1 个号码正确，位置也对') report('clueText(1,0) 文案不对')
  if (T(0, 3) !== '有 3 个号码正确，位置都不对') report('clueText(0,3) 文案不对')
  if (T(1, 1) !== '有 2 个号码正确，只有 1 个位置正确') report('clueText(1,1) 文案不对')
}
```

并把 `main()` 里自检之后追加：

```js
  var t0 = Date.now()
  var total = 0
  Object.keys(LEVELS).forEach(function (lk) {
    var before = problems.length
    var st = Date.now()
    checkLevel(lk, report)
    total += ROUNDS
    console.log(
      (problems.length > before ? '✗' : '✓') + ' ' + lk + '  ' + ROUNDS + ' 局  (' + (Date.now() - st) + 'ms)'
    )
  })
  ;[
    ['文字句式', checkClueText],
    ['种子可复现', checkReproducible],
    ['题目不重复', checkNoDuplicates]
  ].forEach(function (pair) {
    var before = problems.length
    pair[1](report)
    console.log((problems.length > before ? '✗' : '✓') + ' ' + pair[0])
  })

  console.log('')
  if (problems.length) {
    console.log('✗ ' + total + ' 局里发现 ' + problems.length + ' 处问题（最多列前 20 条）：')
    problems.slice(0, 20).forEach(function (m) { console.log('   · ' + m) })
    process.exit(1)
  }
  console.log('✓ 全部通过：' + total + ' 局，耗时 ' + (Date.now() - t0) + 'ms')
```

- [ ] **Step 2: 跑校验器确认红**

Run: `node tools/check-mima.js`
Expected: FAIL——`MI.generate is not a function`（壳还没有实现）

- [ ] **Step 3: 整文件替换 `js/mima-core.js`**

```js
/**
 * 密码推理题目生成（无 DOM 依赖，可在 node 中直接测试）。
 *
 * 题面：一个 N 位、数字不重复的密码，配若干行"猜测"，每行带反馈——
 *   a = 数字对且位置也对的个数（卷面印 ●）
 *   b = 数字对但位置不对的个数（卷面印 ○）
 * 低关卡把 (a,b) 印成点子（不要求读句子），高关卡印成文字，信息完全一样；
 * 难度差在"线索的样子"和位数/数字池，推理方法不变。
 *
 * 质量红线（与数独的「只用唯一候选数」同构）：
 *   ① 每题必须唯一解——全枚举验证（最坏 P(9,4)=3024 个排列，瞬时）；
 *   ② 必须只靠「孩子跟得上的排除动作」推到底——solve() 只会划数字、定位、
 *      行内数名额这几招，绝无"假设试试"。它既是出题的验收标准（makeOne 里
 *      调它，推不动就换题），也是答案页分步解析的来源（推理轨迹原样记下来
 *      就是人话步骤）。
 *
 * 题目对象：{ level, code, rows, trace, key }
 *   rows: [{ g:[…], a, b }]；trace: ['第 1 行全错 → 划掉 9、3、4、1', …]
 */
(function (root) {
  'use strict'

  /* 可复现随机源（mulberry32）。与 js/shudu-core.js、js/generator.js 里的同名
     函数是同一个算法，这里有意再抄一份而不是共享：种子语义各模块独立，
     共享就得给已经正常工作的页面插加载顺序依赖——为 8 行代码不值得。 */
  function makeRandom(seed) {
    var t = seed >>> 0
    return function () {
      t = (t + 0x6d2b79f5) >>> 0
      var r = Math.imul(t ^ (t >>> 15), t | 1)
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
  }

  function shuffle(arr, rnd) {
    for (var k = arr.length - 1; k > 0; k--) {
      var j = Math.floor(rnd() * (k + 1))
      var t = arr[k]; arr[k] = arr[j]; arr[j] = t
    }
    return arr
  }

  /* ---------- 关卡 ---------- */

  /*
   * 循序渐进的"序"落在三处：线索的呈现（点子 → 文字）、数字池大小、位数。
   * 参数是常量但都好调——给儿子试做之后觉得哪关太陡，改一行就行。
   *   bZero：L1 每行反馈必须 b=0（只有 ● 和"全错"），先不引入 ○ 的心智负担
   *   dots：卷面用点子还是文字（mima-render 据此选皮肤）
   *   strip：卷面附不附"划掉数字带"（训练轮）
   */
  var LEVELS = {
    L1: { key: 'L1', no: 1, name: '点点入门', N: 3, pool: [1, 2, 3, 4, 5, 6], rowMin: 4, rowMax: 5, bZero: true, dots: true, strip: true },
    L2: { key: 'L2', no: 2, name: '双色点', N: 3, pool: [1, 2, 3, 4, 5, 6, 7, 8, 9], rowMin: 4, rowMax: 4, bZero: false, dots: true, strip: true },
    L3: { key: 'L3', no: 3, name: '读题破译', N: 3, pool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], rowMin: 4, rowMax: 4, bZero: false, dots: false, strip: false },
    L4: { key: 'L4', no: 4, name: '大侦探', N: 4, pool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], rowMin: 3, rowMax: 4, bZero: false, dots: false, strip: false }
  }

  var LEVEL_ORDER = ['L1', 'L2', 'L3', 'L4']

  function levelOf(key) {
    return LEVELS[key] || LEVELS.L1
  }

  /* ---------- 题目模型 ---------- */

  /* 反馈 (a,b)。密码与猜测的数字都不重复，b = 共有数字数 - a。 */
  function score(guess, code) {
    var a = 0, b = 0
    for (var i = 0; i < guess.length; i++) {
      if (guess[i] === code[i]) a++
      else if (code.indexOf(guess[i]) >= 0) b++
    }
    return [a, b]
  }

  /* 文字皮肤：同一份 (a,b) 的句子化。数字用阿拉伯数字——一年级读数字没问题，
     难的是句子结构。 */
  function clueText(a, b) {
    if (a === 0 && b === 0) return '这些号码都不在密码里'
    if (b === 0) return '只有 ' + a + ' 个号码正确，位置也对'
    if (a === 0) return '有 ' + b + ' 个号码正确，位置都不对'
    return '有 ' + (a + b) + ' 个号码正确，只有 ' + a + ' 个位置正确'
  }

  /* 全枚举：数出与所有线索一致的密码，数到 cap 个就停（唯一性验证用 cap=2）。
     逐位压栈、按池顺序取数，天然保证数字不重复。 */
  function enumerate(pool, N, rows, cap) {
    var found = []
    var used = {}
    var cur = []
    function step() {
      if (found.length >= cap) return
      if (cur.length === N) {
        for (var r = 0; r < rows.length; r++) {
          var fb = score(rows[r].g, cur)
          if (fb[0] !== rows[r].a || fb[1] !== rows[r].b) return
        }
        found.push(cur.slice())
        return
      }
      for (var i = 0; i < pool.length; i++) {
        var d = pool[i]
        if (used[d]) continue
        used[d] = 1
        cur.push(d)
        step()
        cur.pop()
        used[d] = 0
      }
    }
    step()
    return found
  }

  /*
   * 逐步排除求解器——本模块的心脏。
   *
   * 状态：每位一个候选集 cand[pos]（初始全池），placed[pos] 记已定位的数字，
   * inCode 记"确认在密码里"的数字。数字"存活" = 已定位或还在某位候选里。
   * 规则迭代到不动点，全部定位即解出：
   *
   *   R1 划数字：全错行 (0,0) → 行内数字从所有位划掉
   *   R2 行收编：行内存活数字数 == a+b → 这些数全在密码里
   *   R3 单一定位：确认在密码里的数只剩一个可能位置 → 定位
   *   R4 行位置名额：行内【还可能落在自己行位置】的存活数字集合 T
   *      （注意不限于"已确认在密码里"——位置对的数未必先被确认，5827 那道
   *      原题就是靠这步推出 7 在第 4 位）：
   *      |T| == a → T 全部定位；a == 0 → T 从自己的行位置划掉
   *   R5 池收紧：存活数字数 == 未定位位数 → 存活的全在密码里；
   *      某位候选只剩 1 个 → 定位
   *
   * 这里【绝对不能】加假设/回溯分支——它是出题的验收标准（见 makeOne），
   * 一旦能猜，出的题就可能要孩子试错，红线就破了。每次规则触发记一条
   * 人话步骤，答案页按序号印出来就是分步解析。
   */
  function solve(pool, N, rows) {
    var cand = []
    for (var z = 0; z < N; z++) cand.push(new Set(pool))
    var placed = new Array(N).fill(null)
    var inCode = new Set()
    var trace = []

    function aliveSet() {
      var s = new Set(placed.filter(Boolean))
      for (var i = 0; i < N; i++) {
        if (placed[i] == null) cand[i].forEach(function (d) { s.add(d) })
      }
      return s
    }
    function isAlive(d) {
      if (placed.indexOf(d) >= 0) return true
      for (var i = 0; i < N; i++) {
        if (cand[i].has(d)) return true
      }
      return false
    }
    function place(i, d, why) {
      placed[i] = d
      inCode.add(d)
      cand[i] = new Set([d])
      for (var j = 0; j < N; j++) {
        if (j !== i) cand[j].delete(d)
      }
      trace.push('定位：第 ' + (i + 1) + ' 位是 ' + d + '（' + why + '）')
    }

    var changed = true
    while (changed) {
      changed = false

      /* R1 */
      rows.forEach(function (row, ri) {
        if (row.a !== 0 || row.b !== 0) return
        var gone = []
        row.g.forEach(function (d) {
          var hit = false
          for (var i = 0; i < N; i++) {
            if (placed[i] == null && cand[i].delete(d)) hit = true
          }
          if (hit) gone.push(d)
        })
        if (gone.length) {
          trace.push('第 ' + (ri + 1) + ' 行全错 → 划掉 ' + gone.join('、'))
          changed = true
        }
      })

      /* R2 */
      rows.forEach(function (row, ri) {
        var aliveRow = row.g.filter(isAlive)
        if (aliveRow.length !== row.a + row.b) return
        var fresh = aliveRow.filter(function (d) { return !inCode.has(d) })
        if (fresh.length) {
          fresh.forEach(function (d) { inCode.add(d) })
          trace.push('第 ' + (ri + 1) + ' 行名额已满 → ' + fresh.join('、') + ' 在密码里')
          changed = true
        }
      })

      /* R5 前半：存活数字刚好等于空位数 → 全在密码里 */
      var unplaced = placed.filter(function (p) { return p == null }).length
      var alive = aliveSet()
      if (alive.size === unplaced) {
        var freshAll = []
        alive.forEach(function (d) {
          if (!inCode.has(d)) { inCode.add(d); freshAll.push(d) }
        })
        if (freshAll.length) {
          trace.push('剩下的数刚好够 → ' + freshAll.join('、') + ' 在密码里')
          changed = true
        }
      }

      /* R3 */
      inCode.forEach(function (d) {
        if (placed.indexOf(d) >= 0) return
        var ps = []
        for (var i = 0; i < N; i++) {
          if (placed[i] == null && cand[i].has(d)) ps.push(i)
        }
        if (ps.length === 1) {
          place(ps[0], d, '只剩这一个位置')
          changed = true
        }
      })

      /* R5 后半：某位候选只剩 1 个 */
      for (var i2 = 0; i2 < N; i2++) {
        if (placed[i2] == null && cand[i2].size === 1) {
          var only = null
          cand[i2].forEach(function (d) { only = d })
          place(i2, only, '这位只剩这个数')
          changed = true
        }
      }

      /* R4 */
      rows.forEach(function (row, ri) {
        var T = row.g.filter(function (d, i) {
          return (placed[i] == null && cand[i].has(d)) || placed[i] === d
        })
        if (row.a > 0 && T.length === row.a) {
          for (var i = 0; i < row.g.length; i++) {
            if (T.indexOf(row.g[i]) >= 0 && placed[i] == null) {
              place(i, row.g[i], '第 ' + (ri + 1) + ' 行位置对的名额落在它身上')
              changed = true
            }
          }
        } else if (row.a === 0) {
          var gone = []
          for (var j = 0; j < row.g.length; j++) {
            if (placed[j] == null && cand[j].delete(row.g[j])) {
              gone.push(row.g[j] + ' 不在第 ' + (j + 1) + ' 位')
            }
          }
          if (gone.length) {
            trace.push('第 ' + (ri + 1) + ' 行位置都不对 → ' + gone.join('，'))
            changed = true
          }
        }
      })
    }

    return { solved: placed.every(function (p) { return p != null }), placed: placed, trace: trace }
  }

  /* ---------- 生成 ---------- */

  /*
   * 重试上限：同一密码换 20 批行仍不过关就换密码（原型实测 L1 平均 1.6 次、
   * L4 平均 10.4 次换密码，50 次上限内 98% 出题成功；算力上都是瞬时）。
   * 换行是"整批重撒"而不是累加——线索越堆越啰嗦，宁可重来。
   */
  var MAX_ROW_TRIES = 20
  var MAX_CODE_TRIES = 50

  function pickDigits(lv, rnd) {
    return shuffle(lv.pool.slice(), rnd).slice(0, lv.N)
  }

  function makeRows(lv, code, target, rnd) {
    var rows = []
    var seen = {}
    var guard = 0
    var codeKey = code.join('')
    while (rows.length < target && guard++ < 200) {
      var g = pickDigits(lv, rnd)
      var k = g.join('')
      if (k === codeKey || seen[k]) continue
      var fb = score(g, code)
      if (lv.bZero && fb[1] !== 0) continue
      seen[k] = 1
      rows.push({ g: g, a: fb[0], b: fb[1] })
    }
    return rows.length === target ? rows : null
  }

  function makeOne(levelKey, rnd) {
    var lv = levelOf(levelKey)
    for (var ct = 0; ct < MAX_CODE_TRIES; ct++) {
      var code = pickDigits(lv, rnd)
      var target = lv.rowMin + Math.floor(rnd() * (lv.rowMax - lv.rowMin + 1))
      for (var rt = 0; rt < MAX_ROW_TRIES; rt++) {
        var rows = makeRows(lv, code, target, rnd)
        if (!rows) continue
        if (enumerate(lv.pool, lv.N, rows, 2).length !== 1) continue
        var sol = solve(lv.pool, lv.N, rows)
        if (!sol.solved) continue
        if (sol.placed.join('') !== code.join('')) continue /* 理论上不可能，防御 */
        /* 末条补上密码本身（规格第 7 节：答案页最后一步就是结论） */
        return {
          level: levelKey,
          code: code,
          rows: rows,
          trace: sol.trace.concat(['密码是 ' + code.join(' ')]),
          key: levelKey + '|' + code.join('') + '|' + rows.map(function (r) { return r.g.join('') }).join('.')
        }
      }
    }
    return null
  }

  /* 主入口：按设置生成一批题。去重按 key；尝试上限 count×50 防死循环。 */
  function generate(s) {
    var rnd = s.seed ? makeRandom(s.seed) : Math.random
    var seen = {}
    var puzzles = []
    var maxAttempts = s.count * 50
    for (var i = 0; i < maxAttempts && puzzles.length < s.count; i++) {
      var q = makeOne(s.level, rnd)
      if (!q) continue /* L4 偶尔 50 次重试全败（约 2%），接着再试，不是放弃整批 */
      if (s.noDuplicates && seen[q.key]) continue
      seen[q.key] = 1
      puzzles.push(q)
    }
    return { puzzles: puzzles, shortfall: s.count - puzzles.length }
  }

  function titleFor(s) {
    var lv = levelOf(s.level)
    return '密码推理 · 第 ' + lv.no + ' 关 ' + lv.name
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.mima = {
    LEVELS: LEVELS,
    LEVEL_ORDER: LEVEL_ORDER,
    levelOf: levelOf,
    score: score,
    clueText: clueText,
    enumerate: enumerate,
    solve: solve,
    makeRandom: makeRandom,
    makeOne: makeOne,
    generate: generate,
    titleFor: titleFor,
    MAX_ROW_TRIES: MAX_ROW_TRIES,
    MAX_CODE_TRIES: MAX_CODE_TRIES
  }
})(typeof window !== 'undefined' ? window : globalThis)
```

- [ ] **Step 4: 跑校验器确认全绿**

Run: `node tools/check-mima.js`
Expected: 4 关各 `✓ Lx 300 局`，`✓ 文字句式`、`✓ 种子可复现`、`✓ 题目不重复`，末行 `✓ 全部通过：1200 局`（几秒内）

- [ ] **Step 5: Commit**

```bash
git add js/mima-core.js tools/check-mima.js
git commit -m "feat: 密码推理核心——关卡/反馈/唯一解枚举/排除求解器/生成器

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: 设置管理 mima-settings.js

**Files:**
- Modify: `js/mima-settings.js`（整文件替换壳；命名空间改为 `SumSum.mimaSettings`）
- Modify: `tools/check-mima.js`（追加设置段）

**Interfaces:**
- Consumes: `SumSum.mima.LEVEL_ORDER`（sanitize 校验 level 合法性）。
- Produces: `DEFAULTS`、`sanitize(raw) → s`、`newSeed()`、`load()`、`save(s)`；设置对象字段 `{ level, count, copies, noDuplicates, answerPage, seed, title }`（Task 4/5 的 render 与 main 按这些字段名取值）。

- [ ] **Step 1: 往校验器追加设置段（先红）**

在 `tools/check-mima.js` 的 `checkClueText` 之后插入：

```js
function checkSettings(report) {
  var ST = globalThis.SumSum.mimaSettings
  if (!ST) { report('mima-settings.js 没加载上'); return }

  /* 越界/畸形值必须被钳住或回退，而不是透传给生成器 */
  if (ST.sanitize({ level: 'L9' }).level !== 'L1') report('level=L9 没回退到 L1')
  if (ST.sanitize({ level: 'l1' }).level !== 'L1') report('level 大小写敏感地拒绝了 l1（应回退 L1）')
  if (ST.sanitize({ count: 0 }).count !== 1) report('count=0 没钳到 1')
  if (ST.sanitize({ count: 99 }).count !== 12) report('count=99 没钳到 12')
  if (ST.sanitize({ count: 'abc' }).count !== 4) report('count=abc 没回退默认 4')
  if (ST.sanitize({ copies: 5 }).copies !== 2) report('copies=5 没钳到 2')
  if (ST.sanitize({ copies: '1' }).copies !== 1) report("copies='1' 没按数字处理")
  if (ST.sanitize({ noDuplicates: 'false' }).noDuplicates !== false) report("noDuplicates='false' 没转成布尔假")
  if (ST.sanitize({ answerPage: '1' }).answerPage !== true) report("answerPage='1' 没转成布尔真")
  if (ST.sanitize({ title: 'x'.repeat(50) }).title.length > 30) report('title 没截到 30 字')
  if (ST.sanitize({ seed: -5 }).seed !== 0) report('seed=-5 没钳到 0')
  /* 默认值本身 */
  var d = ST.DEFAULTS
  if (d.level !== 'L1' || d.count !== 4 || d.copies !== 2 || d.noDuplicates !== true || d.answerPage !== false) {
    report('DEFAULTS 与规格不符：' + JSON.stringify(d))
  }
}
```

并把 main() 的检查列表扩成：

```js
  ;[
    ['文字句式', checkClueText],
    ['种子可复现', checkReproducible],
    ['题目不重复', checkNoDuplicates],
    ['设置钳位', checkSettings]
  ].forEach(function (pair) {
```

- [ ] **Step 2: 跑校验器确认红**

Run: `node tools/check-mima.js`
Expected: `✗ 设置钳位`——`mima-settings.js 没加载上`（壳挂的名字还是 SumSum.mima）

- [ ] **Step 3: 整文件替换 `js/mima-settings.js`**

```js
/**
 * 密码页设置管理：默认值、输入校验（钳位）、localStorage 持久化、URL 参数编解码。
 * 加载优先级：默认值 ← localStorage ← URL 参数。套路与 js/shudu-settings.js 一致。
 */
(function (root) {
  'use strict'

  var KEY = 'sumsum:mima:v1'

  var DEFAULTS = Object.freeze({
    level: 'L1', // 一年级从点点入门开始
    /* 一张卷 4 道：一关一页的量，做完正好休息 */
    count: 4,
    /* 默认印两份：这个板块的主场景同样是父子同题对战 */
    copies: 2,
    noDuplicates: true,
    answerPage: false,
    seed: 0, // 0 = 未指定；load() 会补一个随机种子
    title: ''
  })

  function clampInt(v, min, max, fallback) {
    if (v === '' || v == null) return fallback // Number('') === 0，需单独处理空输入
    var n = Number(v)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, Math.round(n)))
  }

  function toBool(v, fallback) {
    if (v === true || v === 'true' || v === '1') return true
    if (v === false || v === 'false' || v === '0') return false
    return fallback
  }

  function sanitize(raw) {
    var s = Object.assign({}, DEFAULTS, raw)
    var order = root.SumSum.mima.LEVEL_ORDER
    var level = order.indexOf(s.level) >= 0 ? s.level : DEFAULTS.level
    return {
      level: level,
      count: clampInt(s.count, 1, 12, DEFAULTS.count),
      copies: clampInt(s.copies, 1, 2, DEFAULTS.copies),
      noDuplicates: toBool(s.noDuplicates, DEFAULTS.noDuplicates),
      answerPage: toBool(s.answerPage, DEFAULTS.answerPage),
      seed: clampInt(s.seed, 0, 999999999, DEFAULTS.seed),
      title: String(s.title == null ? '' : s.title).slice(0, 30)
    }
  }

  function newSeed() {
    return Math.floor(Math.random() * 999999998) + 1
  }

  /* 网址带参数时完全忽略 localStorage——save() 会把非默认项全写进网址，
     「默认值 + 网址参数」正好复原分享者当时的设置（与数独同一条规矩）。 */
  function load() {
    var fromUrl = {}
    var hasUrl = false
    try {
      new URLSearchParams(root.location.search).forEach(function (v, k) {
        if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) {
          fromUrl[k] = v
          hasUrl = true
        }
      })
    } catch (e) {
      fromUrl = {}
    }
    var base = {}
    if (!hasUrl) {
      try {
        base = JSON.parse(root.localStorage.getItem(KEY)) || {}
      } catch (e) {
        base = {}
      }
      delete base.seed // 从书签进来应当是新的一批题
    }
    var out = sanitize(Object.assign({}, base, fromUrl))
    if (!out.seed) out.seed = newSeed()
    return out
  }

  function save(s) {
    try {
      root.SumSum.store.set(KEY, s)
    } catch (e) {
      /* 隐私模式下写入失败可忽略 */
    }
    try {
      var params = new URLSearchParams()
      Object.keys(DEFAULTS).forEach(function (k) {
        if (s[k] !== DEFAULTS[k]) params.set(k, String(s[k]))
      })
      var qs = params.toString()
      root.history.replaceState(null, '', qs ? '?' + qs : root.location.pathname)
    } catch (e) {
      /* file:// 协议下 replaceState 可能受限，忽略 */
    }
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.mimaSettings = {
    DEFAULTS: DEFAULTS,
    sanitize: sanitize,
    newSeed: newSeed,
    load: load,
    save: save
  }
})(typeof window !== 'undefined' ? window : globalThis)
```

- [ ] **Step 4: 跑校验器确认绿**

Run: `node tools/check-mima.js`
Expected: `✓ 设置钳位`，整体仍全绿

- [ ] **Step 5: Commit**

```bash
git add js/mima-settings.js tools/check-mima.js
git commit -m "feat: 密码页设置管理——关卡/题量/份数/答案页，带钳位与网址种子

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: 渲染层 mima-render.js

**Files:**
- Modify: `js/mima-render.js`（整文件替换壳；命名空间改为 `SumSum.mimaRender`）
- Modify: `tools/check-mima.js`（追加渲染字符串段与排版段）

**Interfaces:**
- Consumes: `SumSum.mima.{levelOf, clueText, titleFor}`、`SumSum.render.parts.{esc, numLabel, metaHTML}`。
- Produces: `render(container, s, puzzles)`、`buildHTML(s, puzzles) → string`、`MM`（常量）、`perPageOf(s, count) → 2|1`。Task 5 的 main 调 `render` 与 `perPageOf`。

- [ ] **Step 1: 往校验器追加渲染段与排版段（先红）**

在 `checkSettings` 之后插入：

```js
/* ---------- 渲染：字符串级断言（buildHTML 在 node 里可直接跑） ---------- */

function genOne(levelKey, seed) {
  return MI.generate({ level: levelKey, count: 2, seed: seed, noDuplicates: false }).puzzles
}

function checkRenderStrings(report) {
  var R = globalThis.SumSum.mimaRender
  if (!R) { report('mima-render.js 没加载上'); return }

  /* 皮肤不许串关 */
  var l1 = R.buildHTML({ level: 'L1', copies: 1, answerPage: false, title: '' }, genOne('L1', 11))
  if (l1.indexOf('mima-strip') < 0) report('L1 卷面没有划掉数字带')
  if (l1.indexOf('号码正确') >= 0) report('L1 卷面出现了文字线索（应是点子）')
  var l2 = R.buildHTML({ level: 'L2', copies: 1, answerPage: false, title: '' }, genOne('L2', 12))
  if (l2.indexOf('mima-strip') < 0) report('L2 卷面没有划掉数字带')
  var l3 = R.buildHTML({ level: 'L3', copies: 1, answerPage: false, title: '' }, genOne('L3', 13))
  if (l3.indexOf('号码正确') < 0) report('L3 卷面没有文字线索')
  if (l3.indexOf('mima-strip') >= 0) report('L3 卷面不该有划掉数字带')
  var l4 = R.buildHTML({ level: 'L4', copies: 1, answerPage: false, title: '' }, genOne('L4', 14))
  if (l4.indexOf('mima-strip') >= 0) report('L4 卷面不该有划掉数字带')

  /* 对战双份：题页 ×2，答案页仍只 1 份 */
  var two = R.buildHTML({ level: 'L1', copies: 2, answerPage: true, title: '' }, genOne('L1', 15))
  var sheetCount = (two.match(/sheet sheet-mima"/g) || []).length
  var ansCount = (two.match(/sheet-mima-ans"/g) || []).length
  /* L1 每页 2 道、2 道题 = 1 页 × 2 份 = 2 张题页 + 1 张答案页 */
  if (sheetCount !== 2) report('copies=2 时题页应为 2 张，实际 ' + sheetCount)
  if (ansCount !== 1) report('copies=2 时答案页应仍为 1 张，实际 ' + ansCount)

  /* 答案页带密码与分步解析 */
  if (two.indexOf('mima-steps') < 0) report('答案页没有分步解析')
  if (two.indexOf('mima-ans-code') < 0) report('答案页没有密码行')

  /* 题目比每页容量少时按实际题数排 */
  if (R.perPageOf({ level: 'L1' }, 1) !== 1) report('只出 1 道时没有按 1 道排')
  if (R.perPageOf({ level: 'L3' }, 9) !== 2) report('L3 每页应固定 2 道')
}

/* ---------- 排版：按 A4 实际尺寸独立重算（不共用渲染层的 MM 常量） ---------- */

function checkLayout(report) {
  var R = globalThis.SumSum.mimaRender
  if (!R) { report('mima-render.js 没加载上'); return }
  var W = 180 // A4 纵向内容区宽
  var H = 225 // 扣掉页眉页脚后的可用高
  var GAP = 8
  var RULE = 9, NO = 6, ROWH = 11, ANSH = 12, STRIPH = 9, PADH = 8

  Object.keys(LEVELS).forEach(function (lk) {
    var lv = LEVELS[lk]
    var per = R.MM.PER_PAGE[lk]
    var h = RULE + per * (NO + lv.rowMax * ROWH + ANSH + (lv.strip ? STRIPH : 0) + PADH) + (per - 1) * GAP
    if (h > 222) report(lk + ' 每页 ' + per + ' 道高 ' + h.toFixed(0) + 'mm，超出 222mm 版心')
    /* 宽：一行 = N 个数字格 + 反馈（点子 18mm / 文字最长约 62mm） */
    var fbW = lv.dots ? 18 : 62
    var w = lv.N * 9 + 3 + fbW + 8 /* 卡片左右 padding */
    if (w > W) report(lk + ' 线索行宽 ' + w + 'mm 超出 ' + W + 'mm')
  })

  /* 答案页 2×2：步骤按最长 12 条估 */
  var ansH = 2 * (NO + 8 + 12 * 5.2 + PADH) + GAP
  if (ansH > 218) report('答案页高 ' + ansH.toFixed(0) + 'mm 超出版心')
}
```

并把 main() 的检查列表再扩两项：

```js
  ;[
    ['文字句式', checkClueText],
    ['种子可复现', checkReproducible],
    ['题目不重复', checkNoDuplicates],
    ['设置钳位', checkSettings],
    ['渲染皮肤', checkRenderStrings],
    ['排版放得下', checkLayout]
  ].forEach(function (pair) {
```

- [ ] **Step 2: 跑校验器确认红**

Run: `node tools/check-mima.js`
Expected: `✗ 渲染皮肤` + `✗ 排版放得下`——`mima-render.js 没加载上`

- [ ] **Step 3: 整文件替换 `js/mima-render.js`**

```js
/**
 * 密码推理练习纸渲染。
 *
 * 每页固定 2 道题（L3 试过 3 道：4 行线索卡 ≈ 70mm，3 张 + 间隔 + 页顶规则
 * = 235mm 超出 222mm 版心，被排版校验拦下）。对战双份（copies===2）在这一层
 * 做：同页连印两份，答案页只印一份（不随份数翻倍——泄题又费纸），与数独一致。
 *
 * buildHTML 是纯字符串函数（node 里可测），render 只做挂 DOM + 收尾。
 */
(function (root) {
  'use strict'

  function P() {
    return root.SumSum.render.parts
  }

  /*
   * 排版尺寸（mm）。版心按 180×225（A4 纵向 210×297、页边距 15、扣页眉页脚），
   * fitW/fitH 故意再收一点余量——本项目在口算/奥数上都栽过内联 mm 累计溢出、
   * 多挤空白页的坑。校验脚本另写一套独立常量对证（见 tools/check-mima.js）。
   */
  var MM = {
    fitW: 178,
    fitH: 222,
    gap: 8, // 题卡间距
    PER_PAGE: { L1: 2, L2: 2, L3: 2, L4: 2 },
    ansCols: 2,
    ansRows: 2
  }
  var ANS_PER_PAGE = MM.ansCols * MM.ansRows

  function perPageOf(s, count) {
    var want = MM.PER_PAGE[s.level] || 2
    return Math.max(1, Math.min(want, count || 1))
  }

  /* 反馈区：点子皮肤印 ●○（先 ● 后 ○，顺序固定——打乱会泄露对应关系；
     一个点都没有的行印「—」，图例里说明它代表全错）；文字皮肤印句子 */
  function fbHTML(row, lv) {
    if (!lv.dots) {
      return '<span class="mima-fb mima-fb-text">' + P().esc(root.SumSum.mima.clueText(row.a, row.b)) + '</span>'
    }
    var t = ''
    for (var i = 0; i < row.a; i++) t += '●'
    for (var j = 0; j < row.b; j++) t += '○'
    return '<span class="mima-fb">' + (t || '—') + '</span>'
  }

  /* 页顶那行：关卡名 + 该关的读题说明（点子关附图例） */
  function ruleText(lv) {
    if (lv.dots) {
      return '第 ' + lv.no + ' 关 · ' + lv.name + ' —— 密码是 ' + lv.N +
        ' 个不重复的数字。● 数字对、位置也对；○ 数字对、位置不对；没有点 = 这行里没有密码的数字。'
    }
    return '第 ' + lv.no + ' 关 · ' + lv.name + ' —— 密码是 ' + lv.N +
      ' 个不重复的数字，照每行的线索把密码推出来。'
  }

  function itemHTML(entry, lv) {
    var rows = entry.q.rows.map(function (r) {
      var cells = ''
      r.g.forEach(function (d) {
        cells += '<span class="mima-cell">' + d + '</span>'
      })
      return '<div class="mima-clue">' + cells + fbHTML(r, lv) + '</div>'
    }).join('')

    var boxes = ''
    for (var i = 0; i < lv.N; i++) boxes += '<span class="mima-box"></span>'

    var strip = ''
    if (lv.strip) {
      var cells2 = ''
      lv.pool.forEach(function (d) {
        cells2 += '<span class="mima-cell">' + d + '</span>'
      })
      strip = '<div class="mima-strip"><span class="mima-strip-l">划掉不在密码里的数字：</span>' + cells2 + '</div>'
    }

    return (
      '<div class="mima-item">' +
      '<p class="mima-no">' + P().numLabel(entry.idx) + '</p>' +
      '<div class="mima-clues">' + rows + '</div>' +
      '<div class="mima-ans"><span class="mima-ans-l">密码</span>' + boxes + '</div>' +
      strip +
      '</div>'
    )
  }

  function headHTML(title) {
    return (
      '<header class="sheet-head">' +
      '<h2 class="sheet-title">' + P().esc(title) + '</h2>' +
      P().metaHTML() +
      '</header>'
    )
  }

  function puzzleSheetHTML(list, opts) {
    var lv = root.SumSum.mima.levelOf(opts.level)
    var items = list.map(function (entry) {
      return itemHTML(entry, lv)
    }).join('')
    var span = list.length > 1
      ? '第 ' + list[0].idx + '~' + list[list.length - 1].idx + ' 题'
      : '第 ' + list[0].idx + ' 题'
    return (
      '<section class="sheet sheet-mima">' +
      headHTML(opts.title) +
      '<p class="mima-rule">' + P().esc(ruleText(lv)) + '</p>' +
      '<div class="mima-grid">' + items + '</div>' +
      '<footer class="sheet-foot">' + span + ' / 共 ' + opts.total + ' 题' +
      (opts.copyNo ? '　·　第 ' + opts.copyNo + ' 份' : '') +
      '</footer>' +
      '</section>'
    )
  }

  /* 答案页：每题密码 + 分步解析（trace 就是求解器的人话轨迹） */
  function answerSheetHTML(list, opts) {
    var items = list.map(function (entry) {
      var steps = entry.q.trace.map(function (line) {
        return '<li>' + P().esc(line) + '</li>'
      }).join('')
      return (
        '<div class="mima-ans-item">' +
        '<p class="mima-ans-head"><span class="ans-no">' + P().numLabel(entry.idx) + '</span>' +
        '<span class="mima-ans-code">密码 <b>' + entry.q.code.join(' ') + '</b></span></p>' +
        '<ol class="mima-steps">' + steps + '</ol>' +
        '</div>'
      )
    }).join('')
    return (
      '<section class="sheet sheet-mima-ans">' +
      headHTML(opts.title + '（答案）') +
      '<div class="mima-ans-grid">' + items + '</div>' +
      '<footer class="sheet-foot">答案 · 第 ' + opts.pageNo + ' 页 / 共 ' + opts.pageTotal + ' 页</footer>' +
      '</section>'
    )
  }

  function buildHTML(s, puzzles) {
    var M = root.SumSum.mima
    var title = s.title || M.titleFor(s)
    var per = perPageOf(s, puzzles.length)
    var html = []

    for (var start = 0; start < puzzles.length; start += per) {
      var list = []
      for (var k = start; k < Math.min(start + per, puzzles.length); k++) {
        list.push({ q: puzzles[k], idx: k + 1 })
      }
      /* 对战：同一页原样再印一份紧跟其后，只有页脚「第 N 份」不同 */
      for (var c = 1; c <= s.copies; c++) {
        html.push(puzzleSheetHTML(list, {
          level: s.level,
          title: title,
          total: puzzles.length,
          copyNo: s.copies > 1 ? c : 0
        }))
      }
    }

    if (s.answerPage && puzzles.length) {
      var entries = puzzles.map(function (q, i) { return { q: q, idx: i + 1 } })
      var pageTotal = Math.ceil(entries.length / ANS_PER_PAGE)
      for (var p = 0; p < pageTotal; p++) {
        html.push(answerSheetHTML(entries.slice(p * ANS_PER_PAGE, (p + 1) * ANS_PER_PAGE), {
          title: title,
          pageNo: p + 1,
          pageTotal: pageTotal
        }))
      }
    }
    return html.join('')
  }

  function render(container, s, puzzles) {
    container.innerHTML = buildHTML(s, puzzles)
    /* 密码页固定 A4 纵向 */
    root.document.body.classList.remove('landscape')
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.mimaRender = {
    render: render,
    buildHTML: buildHTML,
    MM: MM,
    perPageOf: perPageOf
  }
})(typeof window !== 'undefined' ? window : globalThis)
```

- [ ] **Step 4: 跑校验器确认绿**

Run: `node tools/check-mima.js`
Expected: `✓ 渲染皮肤`、`✓ 排版放得下`，整体全绿

- [ ] **Step 5: Commit**

```bash
git add js/mima-render.js tools/check-mima.js
git commit -m "feat: 密码练习纸渲染——题卡/点子与文字皮肤/划掉表/分步解析答案页

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: 页面与导航

**Files:**
- Create: `mima.html`
- Create: `css/mima.css`
- Modify: `tools/rail.py:17-18`（LINKS 数组加一项）与 `tools/rail.py:33`（PAGES 加一行）

**Interfaces:**
- Consumes: Task 2/3/4 的全部导出；`js/shell.js` 的 summary/fit；站点公共 css（app.css/sheet.css）。
- Produces: 可打开的 `/mima` 页面（本任务结束时还没有交互，Task 6 接上）；六个页面导航里都有「密码」。

- [ ] **Step 1: 写 `mima.html`**

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>密码 · 练习纸</title>
  <meta name="description" content="给孩子打印 A4 练习纸 · 密码推理：看点子、读线索，一步步排除出密码，四关循序渐进，每题附分步解析。" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔐</text></svg>" />
  <link rel="stylesheet" href="css/app.css" />
  <link rel="stylesheet" href="css/sheet.css" />
  <link rel="stylesheet" href="css/mima.css" />
  <!-- 密码页固定 A4 纵向 -->
  <style>@page { size: A4 portrait; margin: 15mm; }</style>
</head>
<body>

<div class="app">
<!-- rail:密码 -->
<!-- /rail -->

<div class="work">
  <header class="work-head">
    <h1 class="work-title">密码</h1>
    <span class="work-sum" id="work-sum"></span>
    <span class="work-grow"></span>
    <button type="button" id="btn-regen" class="btn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/></svg>重新生成</button>
    <button type="button" id="btn-print" class="btn btn-primary btn-lg"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 14h10v6H7z"/></svg>打印</button>
  </header>

  <div class="work-body">

    <!-- ======== 练习纸预览（所见即所得） ======== -->
    <main class="preview" id="preview-wrap">
      <div class="notice" id="notice" hidden></div>
      <div id="preview"></div>
    </main>

    <!-- ======== 设置 ======== -->
    <aside class="panel" id="panel" aria-label="设置">

      <section class="group">
        <h2 class="group-title">关卡</h2>
        <select id="f-level" class="input" data-seg aria-label="关卡">
          <option value="L1" data-short="第 1 关">第 1 关 · 点点入门 · 看点子排除</option>
          <option value="L2" data-short="第 2 关">第 2 关 · 双色点 · ●○ 一起用</option>
          <option value="L3" data-short="第 3 关">第 3 关 · 读题破译 · 文字线索</option>
          <option value="L4" data-short="第 4 关">第 4 关 · 大侦探 · 四位密码</option>
        </select>
        <p class="hint" id="level-hint"></p>
      </section>

      <section class="group">
        <h2 class="group-title">题量与排版</h2>
        <div class="row-between">
          <label class="lbl" for="f-count">题目数量</label>
          <input type="number" id="f-count" class="input" min="1" max="12" step="1" data-stepper />
        </div>
        <div class="field"><span>打印份数</span>
          <select id="f-copies" class="input" data-seg aria-label="打印份数">
            <option value="1">1 份</option>
            <option value="2">2 份（同题对战）</option>
          </select>
        </div>
        <p class="hint" id="pages-hint"></p>
      </section>

      <section class="group">
        <label class="check">
          <input type="checkbox" id="f-nodup" /><span>题目不重复</span>
        </label>
        <label class="check">
          <input type="checkbox" id="f-anspage" /><span>打印时附答案页（密码 + 分步推理）</span>
        </label>
      </section>

      <section class="group">
        <label class="field"><span>练习纸标题（选填）</span>
          <input type="text" id="f-title" class="input" maxlength="30" placeholder="留空则自动生成，如：密码推理 · 第 1 关 点点入门" />
        </label>
        <p class="hint">设置和这批题目都写进了网址：收藏或分享这个链接，打开后就是一模一样的一张卷子。</p>
      </section>

    </aside>
  </div>
</div>
</div>

<!-- render.js 只为取 parts 零件与 refreshDates，不会渲染口算内容 -->
<script src="js/store.js"></script>
<script src="js/shell.js"></script>
<script src="js/render.js"></script>
<script src="js/mima-core.js"></script>
<script src="js/mima-settings.js"></script>
<script src="js/mima-render.js"></script>
<script src="js/mima-main.js"></script>
<script src="js/backup.js"></script>
<script src="js/help.js"></script>
<script src="js/account.js"></script>
<script src="js/account-ui.js"></script>
<script src="js/sync-core.js"></script>
<script src="js/sync.js"></script>
<script>
/* 防护：主脚本没跑完（加载失败或新旧文件混跑）时自动刷新一次，仍不行就在顶部提示，避免页面静默空白 */
(function () {
  var KEY = 'sumsum:jsretried:' + location.pathname
  function ready() {
    return document.documentElement.getAttribute('data-sumsum-ready') === '1'
  }
  function fail() {
    var retried = ''
    try { retried = sessionStorage.getItem(KEY) || '' } catch (e) {}
    if (!retried) {
      try { sessionStorage.setItem(KEY, '1') } catch (e) {}
      location.reload()
      return
    }
    var bar = document.createElement('div')
    bar.id = 'js-load-guard'
    var mac = navigator.platform && navigator.platform.indexOf('Mac') >= 0
    bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;padding:10px 16px;background:#b42318;color:#fff;font-size:14px;line-height:1.6;text-align:center'
    bar.textContent = '页面没加载全，练习纸出不来。请按 ' + (mac ? 'Cmd+Shift+R' : 'Ctrl+Shift+R') + ' 强制刷新一次；还不行就过几分钟再打开。'
    document.body.appendChild(bar)
  }
  function check() {
    if (ready()) return
    if (document.readyState === 'complete') {
      fail()
      return
    }
    window.addEventListener('load', function () {
      setTimeout(function () {
        if (!ready()) fail()
      }, 300)
    })
  }
  check()
})()
</script>
</body>
</html>
```

（`js/mima-main.js` 此时尚未创建，页面会触发防护脚本的自动刷新——Task 6 Step 1 立即补上，属预期中间态。）

- [ ] **Step 2: 写 `css/mima.css`**

```css
/*
 * 密码推理练习纸。卷面件（.mima-*）同时用于屏幕预览与打印。
 * 首版没有在线玩、没有任何作答态，卷面只用黑字与边框，
 * 因此打印段无需做屏幕态还原（数独那三个特异性坑在这里没有土壤）。
 * 注意：body 的 font/line-height 是卷面继承的，不许在本文件改动。
 */

.sheet-mima .mima-rule {
  font-size: 12px;
  color: #444;
  margin: 0 0 4mm;
}

.sheet-mima .mima-grid {
  display: flex;
  flex-direction: column;
  gap: 8mm;
}

.mima-item {
  border: 0.3mm solid #999;
  border-radius: 2mm;
  padding: 4mm;
}

.mima-no {
  font-weight: 600;
  font-size: 14px;
  margin: 0 0 2mm;
}

.mima-clue {
  display: flex;
  align-items: center;
  margin-bottom: 2mm;
}

/* 数字格：线索行与划掉带共用 */
.mima-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 9mm;
  height: 9mm;
  margin-right: 2mm;
  border: 0.3mm solid #666;
  border-radius: 1mm;
  font-size: 16px;
}

.mima-fb {
  font-size: 15px;
  letter-spacing: 1mm;
}

.mima-fb-text {
  letter-spacing: 0;
  font-size: 13px;
}

.mima-ans {
  display: flex;
  align-items: center;
  gap: 3mm;
  margin-top: 3mm;
  font-size: 13px;
}

.mima-box {
  display: inline-block;
  width: 10mm;
  height: 10mm;
  margin-right: 2mm;
  border: 0.3mm solid #555;
  border-bottom: 0.7mm solid #555;
  border-radius: 1mm;
}

/* 划掉数字带：训练轮，只在第 1、2 关出现 */
.mima-strip {
  display: flex;
  align-items: center;
  gap: 1mm;
  margin-top: 3mm;
  font-size: 11px;
  color: #555;
}

.mima-strip .mima-cell {
  width: 7mm;
  height: 7mm;
  margin-right: 1mm;
  font-size: 13px;
  border-color: #aaa;
}

.mima-strip-l {
  margin-right: 1mm;
}

/* ---------- 答案页 ---------- */

.mima-ans-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8mm;
}

.mima-ans-item {
  border: 0.3mm solid #bbb;
  border-radius: 2mm;
  padding: 4mm;
}

.mima-ans-head {
  display: flex;
  align-items: baseline;
  gap: 3mm;
  margin: 0 0 2mm;
  font-size: 14px;
}

.mima-ans-code b {
  letter-spacing: 2mm;
}

.mima-steps {
  margin: 0;
  padding-left: 5mm;
  font-size: 12px;
  line-height: 1.7;
  color: #222;
}
```

- [ ] **Step 3: 改 `tools/rail.py`（LINKS 在数独后加一行 + PAGES 加一项）**

LINKS 数组，插在 `('数独', …)` 那行之后：

```python
    ('密码', 'mima.html', '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
```

PAGES 改成：

```python
PAGES = {'index.html': '今天', 'kousuan.html': '口算', 'aoshu.html': '奥数', 'shudu.html': '数独', 'mima.html': '密码', 'shizi.html': '识字'}
```

- [ ] **Step 4: 跑 rail.py，确认六个页面都更新**

Run: `python3 tools/rail.py && grep -c 'mima.html' index.html kousuan.html aoshu.html shudu.html mima.html shizi.html`
Expected: 六行输出（mima.html 里自身导航 + 五个旧页面各 1 处），`git status` 显示六个 html 都被改动

- [ ] **Step 5: Commit**

```bash
git add mima.html css/mima.css tools/rail.py index.html kousuan.html aoshu.html shudu.html shizi.html
git commit -m "feat: 密码页面与导航——mima.html + 卷面样式 + 六页板块栏加「密码」

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 6: 交互接线、回归与人工验收

**Files:**
- Modify: `js/mima-main.js`（整文件替换壳；命名空间不挂——它是页尾入口脚本）

**Interfaces:**
- Consumes: `SumSum.mima.generate/levelOf`、`SumSum.mimaSettings.*`、`SumSum.mimaRender.render/perPageOf`、`SumSum.shell.summary/fit`、`SumSum.render.refreshDates`；DOM id 与 Task 5 的 html 一致（`f-level/f-count/f-copies/f-nodup/f-anspage/f-title/level-hint/pages-hint/notice/preview/btn-regen/btn-print/work-sum`）。

- [ ] **Step 1: 整文件替换 `js/mima-main.js`**

```js
/**
 * 密码页交互：表单 ↔ 设置对象双向同步、重新生成 / 打印。
 * 与口算/数独一致——任何参数变化都会自动重新生成并渲染（所见即所得），
 * 没有单独的「生成」按钮。最贵的一关（L4）一批 12 题实测在几十毫秒级。
 */
(function (root) {
  'use strict'

  var doc = root.document
  var S = root.SumSum

  function $(id) {
    return doc.getElementById(id)
  }

  var els = {
    level: $('f-level'),
    count: $('f-count'),
    copies: $('f-copies'),
    nodup: $('f-nodup'),
    anspage: $('f-anspage'),
    title: $('f-title')
  }

  var settings = S.mimaSettings.load()

  var LEVEL_HINTS = {
    L1: '只有 ●（数字对、位置也对）和「全错」两种线索，卷上印着可以划掉的数字带——目标是第一次就做得出来。',
    L2: '加入 ○（数字对但位置不对），要学会「这个数在密码里、但不在这个位置」。',
    L3: '线索换成句子，和书上见到的题一个样子，开始练读题。',
    L4: '四位密码 +「两个号码正确，位置都不对」这类复合线索，信息最密，适合家长陪着一起推。'
  }

  function fillForm(s) {
    els.level.value = s.level
    els.count.value = s.count
    els.copies.value = String(s.copies)
    els.nodup.checked = s.noDuplicates
    els.anspage.checked = s.answerPage
    els.title.value = s.title
  }

  function readForm() {
    return S.mimaSettings.sanitize({
      level: els.level.value,
      count: els.count.value,
      copies: els.copies.value,
      noDuplicates: els.nodup.checked,
      answerPage: els.anspage.checked,
      seed: settings.seed, // 种子不是表单项，改参数时沿用，只有「重新生成」才换
      title: els.title.value.trim()
    })
  }

  function pagesHint(s, count) {
    var per = S.mimaRender.perPageOf(s, count)
    var sheets = Math.ceil(count / per)
    var pages = sheets * s.copies
    var ansPages = s.answerPage ? Math.ceil(count / 4) : 0
    var text = '一共 ' + (pages + ansPages) + ' 张纸：' + count + ' 道题 · 每页 ' + per + ' 道 = ' + sheets + ' 页'
    if (s.copies > 1) text += ' × 2 份 = ' + pages + ' 张'
    if (ansPages) text += '，另加 ' + ansPages + ' 张答案页'
    return text + '。'
  }

  function refresh() {
    S.mimaSettings.save(settings)
    fillForm(settings)

    var result = S.mima.generate(settings)
    S.mimaRender.render($('preview'), settings, result.puzzles)
    S.shell.fit()

    $('level-hint').textContent = LEVEL_HINTS[settings.level] || ''
    $('pages-hint').textContent = pagesHint(settings, result.puzzles.length)
    S.shell.summary([
      S.mima.levelOf(settings.level).name,
      result.puzzles.length + ' 题',
      settings.copies > 1 ? '2 份' : ''
    ])

    var notice = $('notice')
    if (result.shortfall > 0) {
      notice.textContent =
        '当前设置下不重复的题目只有 ' + result.puzzles.length +
        ' 道（少于设定的 ' + settings.count +
        ' 道）。可以减少题量，或关闭「题目不重复」。'
      notice.hidden = false
    } else {
      notice.hidden = true
    }
  }

  function onFormChange() {
    settings = readForm()
    refresh()
  }

  Object.keys(els).forEach(function (k) {
    if (k === 'level') return
    els[k].addEventListener('change', onFormChange)
  })

  /* 换关卡等于换一整批题（也是换一种玩法），顺手换个种子，与数独换盘型同一条规矩 */
  els.level.addEventListener('change', function () {
    settings = S.mimaSettings.sanitize(Object.assign({}, settings, {
      level: els.level.value,
      seed: S.mimaSettings.newSeed()
    }))
    refresh()
  })

  /* 重新生成：参数不变，换一批随机题——换种子即可（种子已写进网址，可复现） */
  $('btn-regen').addEventListener('click', function () {
    settings = Object.assign({}, settings, { seed: S.mimaSettings.newSeed() })
    refresh()
  })

  $('btn-print').addEventListener('click', function () {
    root.print()
  })

  root.addEventListener('resize', S.shell.fit)

  /* 页面隔天未刷新直接打印（含浏览器菜单打印）时，日期仍保证是当天 */
  root.addEventListener('beforeprint', S.render.refreshDates)

  refresh()

  /* 完工标记：上面任何一步抛错都到不了这里；HTML 里的防护脚本据此判断并提示 */
  document.documentElement.setAttribute('data-sumsum-ready', '1')
})(window)
```

- [ ] **Step 2: 语法检查 + 全量校验**

Run:
```bash
node --check js/mima-core.js && node --check js/mima-settings.js && node --check js/mima-render.js && node --check js/mima-main.js
node tools/check-mima.js
node tools/check-shudu.js
node tools/check-today.js
```
Expected: 全部通过（导航改动不碰逻辑，但数独/今天两套照跑防回归）

- [ ] **Step 3: 浏览器目检**

Run: `cd /Users/qingche/coding/zhihebi && python3 -m http.server 8123`（后台）
逐项检查 `http://localhost:8123/mima.html`（有头less浏览器就截图自查，没有就 curl 核对资源全 200 + 请站长开页面过目）：
- 默认（L1、4 题、2 份）：纸上有 2 页题卡、每卡 3 位数字行 + ●/— + 划掉带 + 图例；顶栏摘要在；
- 切到 L3：线索变句子、划掉带消失；
- 切到 L4：4 位密码、3~4 行线索；
- 勾答案页：末尾多出答案页，密码 + 编号步骤；
- 改题量/份数：`pages-hint` 的张数随之变化；
- 六个页面的导航都有「密码」，当前页高亮正确。

- [ ] **Step 4: 打印验收（PDF 页数 + 转图目检）**

默认设置（L1、4 题、2 份、无答案页）打印导出 PDF：应为 **4 页**（2 页题 × 2 份），无空白页；再勾答案页导出：5 页，末页是答案。把首页与答案页转 PNG（`sips -s format png`）目检：数字格对齐、点子清晰、页脚「第 1 份/第 2 份」正确。

- [ ] **Step 5: Dogfood——人工做一道 L1**

拿默认卷第 1 题，照线索人工推一遍，再对答案页的分步解析核对顺序与结论一致（这一步发现的是"步骤讲法孩子跟不跟得上"，机器测不出来）。

- [ ] **Step 6: Commit**

```bash
git add js/mima-main.js
git commit -m "feat: 密码页交互——表单同步/重新生成/打印/提示，接上六页导航

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## 执行方式

单会话原生执行（native）：任务间接口都在同一份计划里锁定，主会话连续做、每任务一次提交；收尾跑全量校验 + PDF + 人工做题验收。**不 push，等站长自己决定上线时机。**
