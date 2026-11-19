# 数织在线玩（最小版）设计

## 1. 背景与目标

打印版上线后，家长（站长）看文字说明仍然没弄懂数织怎么玩。做「能玩的最小版」：
在数织页上直接开一盘玩，玩几把自然就懂。不给孩子的完整版（提示、庆祝、连玩、进度）
先不做，等玩过之后再按需加。

打印卷的定位不变：在线玩是附加的试玩入口，不碰打印链路。

## 2. 用户看到的（已在对话里确认）

- 卷面预览里每幅图案右上角浮一个「试玩」小按钮，只在屏幕显示，打印不出现。
- 点开：屏幕中央弹大棋盘（就是这幅题），遮罩挡住背后页面。
- 左键涂黑（再点擦掉）、右键打叉（再点取消）；按住拖动可连涂。
- 涂对的行/列，边上的数字线索自动变灰——看懂「数字 ↔ 黑格」对应关系的关键。
- 全部涂对：揭晓图案名（卷面和弹层都不提前显示名字，名字就是谜底）。
- 全盘每格都涂/叉过但不对：状态行提示「有 N 格不对」，不指位置；再改动即清除。
- 底部按钮：「擦掉全部」「再来一幅」（同关换一幅、不重名）「关闭」；Esc / 点遮罩空白处也关闭。

## 3. 技术设计

新增 `js/zhizhi-play.js`（命名空间 `SumSum.zhizhiPlay`），改 `zhizhi-render.js`（题卡加
索引）、`zhizhi-main.js`（每次渲染后 attach）、`zhizhi.html`（script 顺序
render → play → main）、`css/zhizhi.css`（追加屏幕态样式）、`js/help.js`（数织页加一句
试玩入口）、`tools/check-zhizhi.js`（在线玩逻辑测试）。

### 纯逻辑（node 可测，加载期不碰 DOM）

- 格子状态 `0 空 / 1 黑 / 2 叉`，二维数组 `states[r][c]`。
- `lineClue(cells)`：一行/列状态 → 黑格段序列，无黑格记 `[0]`，与 `cluesOf` 同口径
  （叉不算黑格）。行/列线索变灰 = `lineClue(当前) join` 等于线索 join。
- `wonBoard(states, art)`：黑格集合与 `art.rows` 的 X 完全一致（叉/空不影响判赢）。
- `fullBoard(states)`：每格都非空。
- `wrongCount(states, art)`：黑格与答案不一致的格数。
- 判卷时机：每次改动后——`wonBoard` 成立即赢；否则 `fullBoard` 成立时状态行报
  `wrongCount`。

### 交互规则

- 左键：空/叉 → 黑，黑 → 空。右键：空/黑 → 叉，叉 → 空。
- 拖动：mousedown 定模式（左=涂黑、右=打叉），mouseover 连续应用，document mouseup 结束；
  棋盘上 contextmenu 一律 preventDefault。
- 赢：棋盘锁定（一切点击无效）、标题揭晓 `art.name`、状态行庆祝、「再来一幅」为主动作；
  CSS 把叉淡化让图案突出。
- 「再来一幅」：`S.zhizhi.generate({ level, count: 2, noDuplicates: true, seed:
  S.zhizhiSettings.newSeed() })`，取名字与当前不同的一幅（图库每关 ≥ 2 幅，校验器断言）。

### 与打印链路的隔离

- 弹层与「试玩」按钮全部 `@media print { display: none !important }`；弹层开着直接
  Ctrl+P 也只印卷子。
- `.zhizhi-item` 加 `position: relative`（按钮的定位锚，布局无变化）。
- `zhizhi-render.js` 的 `itemHTML` 给题卡加 `data-zp-idx`（题号-1）；答案页题卡不加。
  `attach(container, puzzles)` 只扫 `.sheet-zhizhi .zhizhi-item[data-zp-idx]`
  （`sheet-zhizhi-ans` 是另一个 class token，天然排除），每次 render 后由 main 重挂。
- copies=2 时同一幅有两个按钮，各自独立一盘。

### 屏幕样式（px，弹层棋盘）

L1 44px / L2 36px / L3 30px / L4 30px 见方；L3/L4 保留每 5 格粗辅助线（与卷面一致）。

## 4. 不做（本版）

卡住给提示、完成庆祝动画、保存进度、「今天」页入口、手机专门优化（可点但不专门调）、
在线玩的网址状态。

## 5. 验收

1. check-zhizhi 全绿：新增在线玩段（lineClue / wonBoard / wrongCount / fullBoard 手工
   样例、图库每关 ≥2 幅、题卷 data-zp-idx 数量 = 题数×份数、答案页无 data-zp-idx、
   不泄图案名）。
2. 浏览器实测：四关各开一盘——左/右键、拖动、线索变灰、判错提示、判赢揭晓名字、
   再来一幅不重名、Esc/遮罩关闭、关闭后再开正常。
3. 打印隔离：弹层开着导出 PDF——无弹层、无「试玩」字样、页数与无弹层时一致。
