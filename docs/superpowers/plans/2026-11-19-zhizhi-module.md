# 数织板块实施计划

> 执行方式：单会话原生执行（同密码板块）。Spec：docs/superpowers/specs/2026-11-19-zhizhi-module-design.md。
> 全程不 push，完成后交站长决定。

## Global Constraints

- ES5 `var` + IIFE，挂 `root.SumSum.*`，尾部 `(typeof window !== 'undefined' ? window : globalThis)`。
- 无 npm 依赖、无构建；校验用独立第二实现的 `node tools/check-zhizhi.js`，自检失败 exit 2。
- 设置三层加载（defaults ← localStorage ← URL，URL 存在则无视 localStorage）照 mima-settings。
- 版心 180×222mm，A4 纵向 15mm 边距；css 不动 body 字体。
- 提交信息 `<type>: <description>`，结尾 Co-Authored-By: Claude Code <noreply@anthropic.com>。

## Review Focus（spec 隐含但测试未必覆盖、最容易咬人的六类）

1. 对称图案多解（镜像也满足线索）→ solve 可解门拦；校验器用 solve2 独立复核全图库。
2. 图库点阵行宽不齐 / 非法字符 → 图库静态校验（行宽==size、仅 X/.）。
3. 空行线索（0）渲染缺失导致孩子读不懂 → 渲染断言「0」出现于 L1 卷。
4. 线索数字堆叠区在列高不同时错位 → 渲染固定线索区行数 = 该关最大段数，版式常量对证。
5. 题量 > 图库量时 shortfall 未提示 / 死循环 → 生成 50 次抽样断言 shortfall 语义。
6. L4 一页 1 题与 copies=2 叠加时页数算错 → perPageOf 断言 + PDF 页数实测。

---

### Task 1：校验器骨架（独立第二实现 + 自检先行）

- Create: `tools/check-zhizhi.js`
- 第二实现：clues2（点阵→线索）、placements2（单行合法放置枚举）、solve2（传播不动点）、
  flood2（连通块计数）。手工样例：5×5 心形点阵 + 手算线索/解，逐条断言。
- selfTest() 失败 exit 2 并打印「先别动生成器」。

### Task 2：图案库 + 核心算法

- Create: `tools/import-icons/fetch.sh`（curl Bootstrap Icons release zip，vendor/ 不入 git）、
  `tools/import-icons/rasterize.html`（内联全部 SVG → canvas 8/10/12 栅格化 → JSON 输出进 DOM）、
  `tools/import-icons/filter.js`（node：读 JSON → 连通/比例/solve2 可解过滤 → 候选 + contact sheet HTML）。
  人眼从 contact sheet 挑图、命名归类。
- Create: `js/zhizhi-art.js`（`SumSum.zhizhiArt = { ARTS: [...] }`，手绘 5×5 字母数字 + 挑选的转译图）。
- Create: `js/zhizhi-core.js`（`SumSum.zhizhi`：makeRandom/cluesOf/propagate/solve/validate/
  LEVELS/levelOf/generate/titleFor，接口签名见 spec §5）。
- check-zhizhi 扩展：图库全量生成门 + 每关 50 次生成抽样。

### Task 3：设置管理

- Create: `js/zhizhi-settings.js`（照 mima-settings 换 KEY/默认值/count 上限 8）。
- check 扩展：钳位断言（level 伪值→L1、count 0/99→4/8、copies 3→2、seed 负→钳位）。

### Task 4：渲染 + 样式

- Create: `js/zhizhi-render.js`（MM 常量、perPageOf、clueHTML、gridHTML、ruleText、
  puzzleSheetHTML、answerSheetHTML、buildHTML、render），buildHTML 纯字符串可 node 测。
- Create: `css/zhizhi.css`（.zhizhi-grid table、格宽按关卡 CSS 变量或内联 mm、
  粗辅助线每 5 格、答案页 .zhizhi-ans-* 黑格实心 3mm）。
- check 扩展：渲染字符串断言（图例/0/答案页分页/copies/perPageOf）+ 版式独立常量对证。

### Task 5：页面 + 导航分组 + 交互

- Modify: `tools/rail.py`（LINKS → GROUPS=[('练习',4 项),('游戏',3 项)]，模板加组标签，重跑七页）。
- Modify: `css/app.css`（.rail-label 样式）。
- Create: `zhizhi.html`（标准骨架，favicon ✏️，脚本序照 spec §9）。
- Create: `js/zhizhi-main.js`（表单↔设置、LEVEL_HINTS、pagesHint、refresh、
  换关换种子、regen/print/resize/beforeprint、data-sumsum-ready）。
- 验证：node --check ×4、check-zhizhi/check-shudu/check-mima/check-today 全绿、
  本地服务器 17+ 资源 200、截图目检、PDF 页数（默认 4 / 带答案 5 / L4×2份=2 页题）、
  固定 seed PDF↔node 复现。

### Task 6：收尾

- 清理临时服务器；七页导航一致性 grep；中文汇报（做了什么/验证证据/未 push）。
