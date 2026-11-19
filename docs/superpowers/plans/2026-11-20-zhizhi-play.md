# 数织在线玩（最小版）实施计划

> **For agentic workers:** 本计划在主会话内直接执行（native），按任务逐步提交。
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 数织页卷面上加「试玩」入口，弹层里用左/右键涂格子玩一盘，涂对揭晓图案名。

**Architecture:** 纯逻辑（状态数组 → 线索/判赢）与 DOM 弹层同住 `js/zhizhi-play.js`，
加载期不碰 DOM（node 可测）；渲染层只加一个 `data-zp-idx` 把题卡和题目数据接上；
打印链路用 `@media print` 全量隔离。

**Spec:** `docs/superpowers/specs/2026-11-20-zhizhi-play-design.md`

## Global Constraints

- ES5（var / IIFE），`root.SumSum.*` 命名空间，加载期零 DOM 依赖（node --check 可过、
  校验器可 load）。
- 卷面与弹层都不提前出现图案名（名字 = 谜底）。
- 打印输出不许出现「试玩」按钮与弹层。
- 提交信息 `<type>: <描述>`，结尾 Co-Authored-By: Claude Code。

---

### Task 1: 在线玩纯逻辑 + 校验器测试（TDD）

**Files:**
- Modify: `tools/check-zhizhi.js`（新增「在线玩」段）
- Create: `js/zhizhi-play.js`（先只有纯函数）

- [ ] **Step 1: 写失败测试**（渲染段之后追加）

```js
/* ---------- 在线玩：纯逻辑（js/zhizhi-play.js，加载期不碰 DOM） ---------- */
load('js/zhizhi-play.js')
var PL = globalThis.SumSum.zhizhiPlay
var plProblems = []
function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b) }
// lineClue：黑格段序列，无黑记 [0]，叉不算黑
if (!eq(PL.lineClue([1,1,0,1,0]), [2,1])) plProblems.push('lineClue 2-1 算错')
if (!eq(PL.lineClue([0,0,0,0,0]), [0])) plProblems.push('lineClue 全空没记 [0]')
if (!eq(PL.lineClue([2,2,0,2,0]), [0])) plProblems.push('叉不该算黑格')
if (!eq(PL.lineClue([1,2,1,0,1]), [1,1,1])) plProblems.push('叉不切断黑段？应 [1,1,1]')
if (!eq(PL.lineClue([1,0,1,1,0]), [1,2])) plProblems.push('lineClue 1-2 算错')
// wonBoard：黑格集合与答案一致即赢，叉/空不影响
var artT = { rows: ['X.X..', '.XX..', 'X...X', '..XX.', '.X...'] }
if (!PL.wonBoard([[1,0,1,0,0],[0,1,1,0,0],[1,0,0,0,1],[0,0,1,1,0],[0,1,0,0,0]], artT)) plProblems.push('全对应判赢')
if (PL.wonBoard([[1,0,1,0,0],[0,1,1,0,0],[1,0,0,0,1],[0,0,1,1,0],[0,1,0,0,1]], artT)) plProblems.push('多涂一黑不该赢')
if (!PL.wonBoard([[1,2,1,0,2],[0,1,1,0,0],[1,0,2,0,1],[0,0,1,1,0],[2,1,0,0,0]], artT)) plProblems.push('叉不影响判赢')
// fullBoard / wrongCount
if (!PL.fullBoard([[1,2],[2,1]])) plProblems.push('全非空应 true')
if (PL.fullBoard([[1,0],[2,1]])) plProblems.push('有空格应 false')
if (PL.wrongCount([[1,0],[0,1]], { rows: ['XX','..'] }) !== 2) plProblems.push('wrongCount 应 2（该黑没黑 1 + 不该黑涂黑 1）')
// 图库每关 ≥ 2 幅（「再来一幅」换图的前提）
;[5, 8, 10, 12].forEach(function (n) {
  var c = ARTS.filter(function (a) { return a.size === n }).length
  if (c < 2) plProblems.push(n + '×' + n + ' 图库只有 ' + c + ' 幅，「再来一幅」没法保证换图')
})
if (plProblems.length) { plProblems.forEach(function (p) { console.error('  ✗ ' + p) }); process.exit(1) }
console.log('✓ 在线玩：段序列 / 判赢 / 满盘 / 错格数 / 每关图库 ≥2')
```

- [ ] **Step 2: 跑 `node tools/check-zhizhi.js`** —— 预期：require zhizhi-play.js 报错（红）。
- [ ] **Step 3: 实现 `js/zhizhi-play.js` 纯函数**（文件头注释写明模块职责与 DOM 约定）：

```js
/*
 * 数织在线玩（最小版）：卷面题卡上的「试玩」按钮 → 弹层棋盘。
 * 本文件加载期不碰 DOM（校验器在 node 里 load 后只测纯函数）；
 * 弹层与打印隔离规则见 css/zhizhi.css 末段。
 */
;(function (root) {
  'use strict'

  /* 格子状态：0 空 / 1 黑 / 2 叉（打叉 = 标记这格一定是空的） */

  /* 一行/列状态 -> 黑格段序列，无黑记 [0]（与 zhizhi-core 的 cluesOf 同口径，叉不算黑） */
  function lineClue(cells) {
    var seg = [], run = 0
    for (var i = 0; i <= cells.length; i++) {
      if (i < cells.length && cells[i] === 1) run++
      else if (run) { seg.push(run); run = 0 }
    }
    return seg.length ? seg : [0]
  }

  /* 黑格集合与答案完全一致即赢（叉/空不影响） */
  function wonBoard(states, art) {
    for (var r = 0; r < art.rows.length; r++) {
      for (var c = 0; c < art.size; c++) {
        if ((states[r][c] === 1) !== (art.rows[r].charAt(c) === 'X')) return false
      }
    }
    return true
  }

  /* 每格都做过决定（黑或叉） */
  function fullBoard(states) {
    for (var r = 0; r < states.length; r++) {
      for (var c = 0; c < states[r].length; c++) if (states[r][c] === 0) return false
    }
    return true
  }

  /* 黑格与答案不一致的格数（判错提示用，不指位置） */
  function wrongCount(states, art) {
    var n = 0
    for (var r = 0; r < art.rows.length; r++) {
      for (var c = 0; c < art.size; c++) {
        if ((states[r][c] === 1) !== (art.rows[r].charAt(c) === 'X')) n++
      }
    }
    return n
  }

  ...（命名空间导出，见 Step 4）
})(typeof window !== 'undefined' ? window : globalThis)
```

- [ ] **Step 4: 跑校验器** —— 全绿。
- [ ] **Step 5: Commit** `feat: 数织在线玩纯逻辑——段序列/判赢/满盘/错格数`

### Task 2: 弹层 UI + 页面集成

**Files:**
- Modify: `js/zhizhi-render.js`（itemHTML 加 `data-zp-idx`）
- Modify: `tools/check-zhizhi.js`（data-zp-idx 断言：题卷 = 题数×份数、答案页无、不泄名）
- Modify: `js/zhizhi-play.js`（attach / open / 弹层 DOM / 事件 / 判卷 / 再来一幅）
- Modify: `css/zhizhi.css`（追加屏幕态：试玩按钮 + 弹层全套 + 打印隔离）
- Modify: `zhizhi.html`（script：zhizhi-render → zhizhi-play → zhizhi-main）
- Modify: `js/zhizhi-main.js`（refresh 里 render 后 `S.zhizhiPlay.attach($('preview'), result.puzzles)`）
- Modify: `js/help.js`（数织页加一句：卷面题卡右上「试玩」可在线玩一把）

- [ ] **Step 1: 渲染层与校验器**——itemHTML 的 div 加 `data-zp-idx="' + (entry.idx - 1) + '"`；
  校验器补三断言后跑（红→改→绿）。
- [ ] **Step 2: 弹层实现**，结构：

```
div.zhizhi-play[hidden]
  div.zhizhi-play-mask          （点击关闭）
  div.zhizhi-play-panel
    header: span.zp-title「第 N 关 · 在线试玩」+ button.zp-close ×
    div.zp-status               （提示行）
    div.zp-board > table        （colclue 行 + rowclue 列 + td.zp-cell，类 zp-l{N}）
    footer: button 擦掉全部 / 再来一幅(zp-primary) / 关闭
```

  事件：cell mousedown（button 0/2 定涂黑/打叉模式）+ board mouseover（拖动连涂）+
  document mouseup 收尾 + board contextmenu preventDefault + Esc + 遮罩点击关闭。
  每次改动后 refresh：更新格子 class（zp-on/zp-mark）、行/列线索 `zp-done` 变灰
  （`lineClue` join 与线索 join 比对）、判赢（锁定 + 标题揭晓名字 + 叉淡化）、
  满盘判错（状态行「有 N 格不对——再看看还没变灰的数字」，再改动即清）。
- [ ] **Step 3: 样式**——`.zhizhi-item{position:relative}`；试玩按钮绝对定位右上；弹层
  fixed 全屏遮罩 + 白卡；格子 L1 44 / L2 36 / L3 30 / L4 30 px，L3/L4 保留 5 格粗线；
  `@media print` 把 `.zhizhi-play, .zhizhi-play-btn` 全部隐藏。
- [ ] **Step 4: `node --check` 全部改动文件 + `node tools/check-zhizhi.js` 全绿。**
- [ ] **Step 5: Commit** `feat: 数织在线玩弹层——试玩按钮、涂格子、线索变灰、判卷揭晓`

### Task 3: 验证与上线

- [ ] **Step 1: 本地起服务（8766），无头浏览器实测四关**——左/右键、拖动连涂、线索变灰、
  判错报 N 格、判赢揭晓名字、再来一幅不重名、Esc/遮罩/按钮三种关闭、关闭重开正常。
  交互用 /tmp 里的临时页面（同源加载真实脚本 + synthetic MouseEvent 驱动 + 断言写进
  DOM + --dump-dom 读结果），测完即删，不进仓库。
- [ ] **Step 2: 打印隔离**——弹层开着 print-to-pdf：pdftotext 无「试玩」字样、页数与
  不开弹层一致（对照此前基线：L1 默认 4 页）。
- [ ] **Step 3: push 部署，线上 curl 验证 zhizhi-play.js 200、页面含试玩标记。**
- [ ] **Step 4: 中文汇报**（结论先行：怎么进、怎么玩、去试一把）。

## Review Focus

1. **叉不切断黑段**（把叉当空格处理）——lineClue 已有正反用例。
2. **黑格够数但位置错**：wonBoard 逐格比对，不数数。
3. **弹层开着打印**：@media print 隔离是硬承诺，Task 3 用 PDF 实测。
4. **copies=2 双按钮同题**：各自独立 states，attach 按 data-zp-idx 取题，不共享盘面。
5. **再来一幅图库枯竭**：noDuplicates + count 2 保证拿到不同名；图库每关 ≥2 由校验器断言兜底。
