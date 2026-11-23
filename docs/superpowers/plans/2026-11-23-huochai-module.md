# 火柴棒算式板块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增「火柴」游戏板块（huochai.html）：四关火柴棒算式练习纸，每题唯一答案，接入侧栏、今天页、使用说明、更新记录。

**Architecture:** 照 migong 板块套路：core（无 DOM，穷举出题池 + 种子抽题）/ settings（localStorage + URL）/ render（buildHTML 纯字符串，SVG 画火柴）/ main（表单交互）/ css / html；独立校验器 tools/check-huochai.js 另写一套七段表与改动枚举对证。

**Tech Stack:** 纯静态 HTML/JS（ES5 风格 IIFE，挂 `root.SumSum`），node 跑校验脚本，python3 tools/rail.py 生成侧栏。

**Spec:** docs/superpowers/specs/2026-11-23-huochai-module-design.md

## Global Constraints

- 七段：0=abcdef 1=bc 2=abdeg 3=abcdg 4=bcfg 5=acdfg 6=acdefg 7=abc 8=abcdefg 9=abcdfg；`+`=hv，`−`=h，`=` 不参与改动
- 关卡：L1 拿走一根 0–9 · L2 添上一根 0–9 · L3 挪一挪（移动一根）0–9 · L4 两位数挑战（移动一根）0–20 且原式或答案至少一个 ≥10
- 唯一性按「所有改对的结果（不论是否在范围内）」计数，必须恰好 1 个，且该结果在范围内
- 原式和答案里值为 0 的数各最多一个；不出前导 0；原式必须是错的
- 设置：level 默认 L1、count 1–10 默认 5、copies 1–2 默认 2、answerPage 默认 false、title ≤30 字；存储键 `sumsum:huochai:v1`
- 卷面 A4 纵向，每页 5 题；答案页每页 10 题，只印一份
- 游戏组顺序：数独 → 火柴 → 密码 → 迷宫 → 数织
- 界面文案不用圆点列表；body 字体不能改

## Review Focus

1. 网址里带乱填的参数（level=L9、count=abc）→ 钳回默认，不白屏（settings 钳位测试）
2. 题池少于题量（不会发生，但 count=10 时每关都要出满 10 道）→ 校验器对四关各抽 300 个种子出 10 题，shortfall 必须为 0
3. 同一个种子两次出卷必须完全相同（网址分享复现）→ 校验器测
4. 「移动」把火柴放回原处不算答案、跨符号移动合法 → 校验器手工样例（6+3=8 → 不在答案里出现「原式本身」；0+1=7 等）
5. 今天页老用户本地没有火柴设置 → 卡片显示第 1 关默认值（check-today 测）

---

### Task 1: 独立校验器 + core 出题引擎

**Files:**
- Create: `tools/check-huochai.js`
- Create: `js/huochai-core.js`

**Interfaces（Produces）:** `SumSum.huochai = { SEG, LEVELS, LEVEL_ORDER, levelOf(key), symbolsOf(eq), parseSymbols(syms), solutions(eq, kind) -> [{to, edit}], poolOf(levelKey) -> [puzzle], makeRandom(seed), generate(s) -> {puzzles, shortfall}, titleFor(s), eqText(eq) }`
- `eq = {a, op, b, c}`（op 为 '+' 或 '-'）
- `syms = [{t:'d', segs:'abc'} | {t:'op', segs:'h'|'hv'} | {t:'eq'}]`
- `edit = { removed: {i, seg} | null, added: {i, seg} | null }`（i 为 symbolsOf(from) 下标）
- `puzzle = { level, kind, from, to, edit, key }`，key = eqText(from)

- [ ] Step 1: 写校验器：自带独立七段表与改动枚举（集合运算写法，与 core 不同），自检手工样例（`9+1=8` 拿一根 → 只有 `3+...`？以穷举为准；`5+3=6` 添一根 → `5+3=8`；`6-3=5`… 以自检手算三例为准），然后对四关题池逐题复核红线 1–5、题池数量 ≥60、四关各 300 种子出 10 题无 shortfall/无重复、同种子复现、render buildHTML 冒烟
- [ ] Step 2: `node tools/check-huochai.js` → 失败（core 不存在）
- [ ] Step 3: 写 core：穷举 `A op B = C` → 跳过成立式 → solutions 收集改对结果（按 eqText 去重）→ 恰好 1 个且满足范围/0/两位数规则进池；generate 用 makeRandom（同 migong 的搅动版）洗牌抽 count 道
- [ ] Step 4: 校验器（除 render 部分）全绿

### Task 2: 设置 + 渲染 + 页面

**Files:**
- Create: `js/huochai-settings.js`（套路同 migong-settings，无 noDuplicates，count 1–10 默认 5）
- Create: `js/huochai-render.js`（`SumSum.huochaiRender = { render, buildHTML, figureSVG(eq, opts), PER_PAGE: 5, ANS_PER_PAGE: 10 }`）
- Create: `css/huochai.css`、`huochai.html`（骨架同 migong.html）、`js/huochai-main.js`

- [ ] Step 1: 校验器补 render 断言：卷面页数 = ceil(n/5)×copies、答案页 = ceil(n/10)、每题 SVG 里实线火柴数 = 原式火柴总数、L1 无虚线槽、L2–L4 有；答案页含正确算式文本
- [ ] Step 2: 跑校验器 → render 部分失败
- [ ] Step 3: 实现 settings / render / css / html / main
- [ ] Step 4: 校验器全绿；本地 `python3 -m http.server` 打开 huochai.html 看四关卷面、答案页、打印预览

### Task 3: 接入全站

**Files:**
- Modify: `tools/rail.py`（游戏组数独后插「火柴」+ 图标，PAGES 映射加 huochai.html，重跑）
- Modify: `js/today-core.js`（GAME_LEVELS / GAME_RULES 加 huochai，默认题量走 GAME_RULES.def；games 顺序 `['huochai','mima','migong','zhizhi']`）
- Modify: `js/today.js`（GAME_FACE / GAME_TEXT 加 huochai）
- Modify: `tools/check-today.js`（顺序与默认值断言，先改测试再改实现）
- Modify: `js/help.js`（MODULES 加「火柴」、SLUG、ORDER 数独后）
- Modify: `js/changelog.js`（2026-11-23 加一条）

- [ ] Step 1: 改 check-today 期望 → 跑 → 失败
- [ ] Step 2: 改 today-core / today.js → check-today 绿
- [ ] Step 3: rail.py 加项并重跑；help.js；changelog → `node tools/check-changelog.js` 绿
- [ ] Step 4: 全部 check-*.js 跑一遍；浏览器看今天页、侧栏、说明页
