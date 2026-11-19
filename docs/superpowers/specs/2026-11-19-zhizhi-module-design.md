# 数织板块设计定稿

日期：2026-11-19。状态：已与站长对齐玩法、关卡、答案页、图库来源、导航分组，可实施。

## 1. 目标与边界

给 SumSum 增加第 7 个板块「数织」（Nonogram，绘图数独）：按行列线索涂格子，
涂完浮现一幅像素画。与数独、密码同为「游戏」组打印板块。

首版只做打印卷（无在线作答、无彩色），架构、设置、网址种子、校验红线全部沿用
密码板块（docs/superpowers/specs/2026-11-19-mima-module-design.md）的规矩。

## 2. 玩法与术语

- N×N 网格，每格最终是黑或白。
- 行线索：第 i 行黑格从左到右的「连续段长度」序列；空行印 0。列线索同理（从上到下）。
- 规则孩子话（印在卷面图例行）：数字 = 这一行的黑格分组，按顺序、每组至少隔 1 格空；
  0 = 这行全空。涂完黑格连成一幅画。
- 孩子可用推理（红线依据）：
  - R1 满行：线索之和 + 间隔数 == 行长 → 整行排满，全涂。
  - R2 全空：线索是 0 → 整行留白。
  - R3 挤一挤：把所有黑块往左挤、再往右挤，两次都黑的格子必黑（单行重叠推理）。
  - R4 交叉：某行推出的黑/白，作为该列的已知条件继续推（反之亦然）。
  - 红线：每题只用 R1–R4 的循环就能推完全盘，不许出现需要假设试错的题。

## 3. 关卡

| 关 | key | 名称 | 盘面 | 每页题数 | 格宽 mm | 图案类型 |
|---|---|---|---|---|---|---|
| 1 | L1 | 迷你涂画 | 5×5 | 2 | 10 | 字母、数字、极简图形（手绘） |
| 2 | L2 | 小小图案 | 8×8 | 2 | 9 | 剪影图标转译（动物/物件） |
| 3 | L3 | 大发现 | 10×10 | 2 | 7 | 剪影图标转译（细节更多） |
| 4 | L4 | 像素大师 | 12×12 | 1 | 9 | 剪影图标转译 + 手绘 |

每关题量 1~8 题；同一卷内图案不重复（题量超过图库时 shortfall 提示，照密码规矩）。
5×5 若唯一解率过低，允许实施时调整为 6×6（在 plan 里记录最终值）。

## 4. 图案库

- 数据：`js/zhizhi-art.js`，每幅 `{ name, theme, size, rows }`，rows 为等宽字符串点阵
  （'X' 黑、'.' 白），人可读可改，站长以后可自行补充。
- 来源与许可：
  - 手绘（本仓库原创）：字母数字 5×5 与保底图案。
  - Bootstrap Icons（MIT）离线栅格化转译：工具 `tools/import-icons/` 产出候选，
    自动过滤 + 人眼验收后写入图库。许可记录在本节，页面无需署名。
  - v2 备选扩充：Kenney 像素素材（CC0）、Material Symbols filled（Apache 2.0）。首版不做。
- 转译管线（零 npm 依赖）：
  1. 下载 Bootstrap Icons release zip 到 tools/import-icons/vendor/（不入 git）。
  2. 生成的 HTML 把全部 SVG 内联，用 canvas 按 8/10/12 目标尺寸栅格化
     （覆盖率 ≥50% 判黑），--dump-dom 导出 JSON。
  3. node 过滤脚本：连通（黑格 4-连通恰 1 块）、黑格比例 35%~60%、
     line-solver 可解、size 匹配。
  4. 生成 contact sheet（HTML），人眼挑「认得出是什么」的，命名归类入 art 库。
- 每幅入库图必须过生成门（§5），三关全过才算数：认得出、连成一整块、线索唯一解。

## 5. 核心算法与生成门

文件 `js/zhizhi-core.js`（挂 `SumSum.zhizhi`）：

- `cluesOf(rows)`：由点阵算行/列线索（空 → [0]）。
- `propagate(n, clueArr, known)`：枚举单行全部合法放置（与 known 不冲突），
  取公共确定格；无放置即矛盾。n ≤ 12，候选数小。
- `solve(N, rowClues, colClues)` → `{ solved, grid, trace }`：全盘未知起步，
  行/列交替 propagate 到不动点；每轮变化记入 trace
  `{ line:'r3'|'c5', kind:'zero'|'full'|'overlap'|'cross', found:[...] }`。
  solved=真 ⟺ 推理可完全盘（⟹ 唯一解，因为每步都是必然推理）。
- 生成门 `validate(art)`：solve 可解 + 连通 1 块 + 比例 35%~60% + size∈{5,8,10,12}。
- `LEVELS`/`generate(settings)`：按关卡抽图（mulberry32(seed) 洗牌图库），
  `noDuplicates` 同卷去重；返回 `{ puzzles, shortfall }`，每题
  `{ level, art, rowClues, colClues, hints, key }`，key 格式 `level|name|N`。

## 6. 起步提示（答案页用）

从 solve 轨迹取前 3 步翻译成孩子话，尾句「涂完就是〈图案名〉！」：

- zero：`第 X 行印着 0——这行全空，一个都不涂。`
- full：`第 X 行印着 Y，正好排满整行——全涂黑！`
- overlap：`第 X 行的「线索」：挨着挤一挤，第 a~b 格必黑。`
- cross：`第 X 列结合涂好的格子，第 a 格能定了。`

## 7. 卷面与版式

- `js/zhizhi-render.js`：纯字符串 buildHTML + render 挂 DOM（照 mima-render）。
- 题卡：题号 + 网格（table：首行列线索堆叠、首列行线索右对齐）+ 答案不需要涂写框
  （直接在网格上涂）。L3/L4 每 5 格加粗辅助线。
- 图例行：`第 X 关 · 名称 —— 数字 = 这一行的黑格分组：按顺序、至少隔 1 格空；0 = 全空。`
- 答案页：2×2 四题，每题 = 完成图（黑格实心小格 3mm）+ 图案名 + 3 条起步提示；
  题卷 copies=2 时答案页仍只印 1 份。
- 版心 180×222（A4 纵向 15mm 边距），排版校验用独立常量对证：
  题宽 = cellMM×N + 12（线索列）+ 8（边距）≤ 178；两题纵排 ≤ 222。
- css/zhizhi.css 黑白灰 only，不动 body 字体。

## 8. 设置与网址

`js/zhizhi-settings.js` 照 mima-settings：KEY `sumsum:zhizhi:v1`，
DEFAULTS `{ level:'L1', count:4, copies:2, noDuplicates:true, answerPage:false, seed:0, title:'' }`，
count 钳位 1..8，URL 参数优先级与 localStorage 语义、newSeed、history.replaceState 全同密码。

## 9. 页面与导航

- `zhizhi.html`：标准骨架（work-head 重新生成/打印、preview+notice、panel），
  脚本次序 store/shell/render/zhizhi-art/zhizhi-core/zhizhi-settings/zhizhi-render/zhizhi-main
  + backup/help/account/sync，js-load-guard 内联，favicon ✏️。
- 导航分组：rail.py 改为两组——
  练习（今天、口算、奥数、识字）/ 游戏（数独、密码、数织），
  组标题为 rail 内小标签，七个页面统一生成；现有六项的相对顺序不变。

## 10. 校验器（tools/check-zhizhi.js）

独立第二实现（clues2/propagate2/solve2/连通2），exit 2 自检先行（手工 5×5 样例）：

1. 图库全量：每幅过生成门（solve2 可解、连通2==1、比例、尺寸匹配关卡、name 非空、
   点阵行宽==size、字符仅 X/.）。
2. 生成：每关 50 次选题——seed 复现、同卷不重复、key 格式、rowClues 与 clues2 一致。
3. 设置：钳位断言。
4. 渲染字符串：L1 卷含图例与 0；answerPage 分页（count=4 → 4 题卡 1 张答案页）；
   copies=2 → 题卷 2 份、答案 1 份；perPageOf 钳位。
5. 版式：独立常量对证题宽/题高/页高。

## 11. 不做（首版）

在线玩、彩色数织、图案指定选题、「今天」页接入、Kenney/Material 来源、
提示格（预涂）辅助。上线后按儿子反馈排。

## 12. 验收

- check-zhizhi 全绿（图库全量 + 每关 50 次生成）。
- 默认设置（L1、4 题、2 份、无答案）PDF 恰 4 页；勾答案页 5 页；L4 一页 1 题。
- 固定 seed 浏览器 PDF 与 node 同 seed 产出一致（网址复现承诺）。
- 七个页面导航一致、「游戏」分组正确、无死链；本地资源 17+ 项全 200。
