# 奥数讲解视频 · 渲染引擎

练习纸奥数课的讲解视频都用这套工具做：网页动画逐帧截图成画面，edge-tts 配音，ffmpeg 合成。
标杆是 08 数列找规律；第 10 课等量代换 v4 是第一期完整用上这套流水线的。

## 文件

| 文件 | 作用 |
|---|---|
| `render.html` | 渲染引擎：方格纸背景、手绘图形和物品、天平、圈一圈、箭头、便签、印章、08 同款倒计时、念到即高亮、场景淡入淡出；`sfxList()` 导出音效时间表，`layoutReport()` 做版面自检 |
| `lessons/<id>/scenes.js` | （12 meiju 新增元素：`dcard` 数字卡片、`coin` 硬币 `v` 面值、`seg` 连线；文字里可写 `<span class="mk" style="background:色">1</span>` 实心编号）（13 fendui 新增物品 `item` 的 `candy` 糖果）（14 kongping 新增物品 `bottle` 满瓶汽水、`empty` 空瓶）（15 huochai 新增元素 `match` 火柴棒：x1,y1 → x2,y2，火柴头在 (x2,y2)）（16 jiange 新增元素 `log` 木头：x0、w、h、`ring` 右端年轮；`cut` 锯口：红色锯齿线，x、h；`steps` 一段楼梯：(x1,y1)→(x2,y2)、k 级台阶；物品 `flower` 一盆花；分镜里的 `logCut()` 帮手：整根木头 → 锯口 → 锯开分段）（18 xianjing 新增物品 `candle` 点着的蜡烛、`candleOut` 吹灭冒烟、`candleGone` 烧光剩一摊蜡、`orange` 橘子、`plate` 盘子）（B01 bichang 新增通用元素 `svg`：`{t:'svg', x, y, w, h, html}`，html 用 w×h 坐标；`draw:true` 时 class="ap"、pathLength=1 的线按 `dur` 秒一笔画出。分镜里有 `pencil()` 铅笔、`wraps()` 缠绳、`gridSVG()`+`bar()` 方格里的铅笔、`route()` 方格路线（斜线红、横竖线蓝分开高亮）、`node()`+`flowArrow()` 判断小流程、`mapEls()` 知识地图）（B03 zhongbiao 新增元素 `clock` 钟面：`size` 直径、`time:[时,分]`（null 只有钟面）、`turn:[[锚点,时,分,秒?],…]` 指针顺时针转过去（分针转一圈、时针跟着走）、`mAt`/`hAt` 分针 / 时针到锚点才从中心长出来（画钟）、`glowNums:[[锚点,数,秒?],…]` 钟面上的数亮起来；时针红粗短、分针蓝细长，数字用 Num 字体画在指针上面；分镜里的 `digi()` 电子钟、`phone()` 手机、`cross()` 红叉划掉）（B04 zhongbiao2 给 `clock` 加：`sweep:[[锚点,分,秒?],…]` 从 12 起把分针走过的小格涂成黄色扇形（一段一段往前长）、`outer:[[锚点,k],…]` 在数 k 外圈写 5k（5 个 5 个数）、`ticks:[[锚点,从,到,每格秒],…]` 小格刻度一格一格变红；分镜里的 `outerSeq()` 按间隔连写外圈数）（B02 bizhong 新增物品 `pear` 梨、`peach` 桃、`ballR/ballB/ballY/ballG` 四色彩球；天平可用通用 `scale` 缩小，托盘上下位移跟着缩，盘里物品照样跟随；分镜里的 `bal()` + `pan()` 帮手按缩放算托盘位置，`seesaw()` 跷跷板、`springs()` 弹簧挂球）<br> 每课的分镜：每个场景 `{ tag, beats: [{sub, say, pause?, rate?, pitch?, tts?}], els: [...] }`；`SCENES.cover` 是封面 |
| `tts.py` | 逐句配音（晓晓）+ 逐字时间戳；POLY 表修多音字；每句可单独设 `rate` / `pitch`；云端走代理时 `SSL_CERT_FILE=/root/.ccr/ca-bundle.crt python3 tts.py` |
| `timing.py` | 由配音生成 `timing.json`；`est` 参数按字数估算，没配音也能先出预览 |
| `check.py` | 版面自检：压字幕区、出画、重叠、关键词没对上 |
| `shoot.py` | `video <i> out.mp4` 渲染一个场景；`still <i> <秒> out.png` 出预览帧；`cover out.jpg` 出封面 |
| `sfx.py` / `sfx_events.py` | 合成音效（滴答、叮、啪、揭晓）/ 导出整片音效时间表 |
| `assemble.py` | 拼画面 + 配音 + BGM（按旁白自动压低）+ 音效 + 字幕（`**数字**` 标红）→ `final.mp4`（-16 LUFS，faststart） |
| `build_draft.py` | 可选：生成剪映草稿 |

## 做一期

```sh
# 0. 工作文件夹：复制引擎 + 这一课的分镜；字体、背景音乐 bgm_full.wav 放进来
mkdir work && cp tools/video/*.py tools/video/render.html work/ && cp tools/video/lessons/<id>/scenes.js work/
cd work && sh ../tools/video/get-fonts.sh   # 或把 fonts/ 拷过来

# 1. 写好 scenes.js 后导出 beats.json、估算时长、自检、出预览
node -e "const S=require('./scenes.js');require('fs').writeFileSync('beats.json',JSON.stringify(S.map(s=>s.beats)))"
python3 timing.py est && python3 check.py timing_est.json
python3 shoot.py timing_est.json still 1 5 a.png

# 2. 配音（要能访问 PyPI 和微软 TTS）→ 真实时长 → 自检
python3 tts.py && python3 timing.py && python3 check.py timing.json

# 3. 渲染（2 核机器每次最多并行 2 个）→ 音效 → 合成 → 封面
python3 shoot.py timing.json video 0 clips/scene0.mp4   # 每个场景一次
python3 sfx.py && python3 sfx_events.py
SEL=1,6 python3 assemble.py   # 先挑一两个场景出样片 sample.mp4 给人看
python3 assemble.py           # 确认后出全片 final.mp4
python3 shoot.py timing.json cover cover.jpg
```

上线（一键）：推送 `publish/<id>` 分支，`.github/workflows/publish-aoshu-video.yml` 会把视频和封面传到 R2，确认线上能取到后再把登记提交推到 main。

```sh
git checkout -B publish/<id> origin/main
# 登记：js/aoshu-videos.js 的 LIST（和 POSTER）加一行，tools/check-today.js 补一条自检，提交
mkdir -p _publish && cp final.mp4 _publish/<id>.mp4 && cp cover.jpg _publish/<id>.jpg
git add -f _publish && git commit -m "publish: <id> 视频素材（不进 main）"   # .gitignore 忽略了 *.mp4，必须 -f
git push origin publish/<id>
```

需要仓库里设好 `CLOUDFLARE_API_TOKEN`（只给 R2 编辑权限）和 `CLOUDFLARE_ACCOUNT_ID` 两个 Actions secret。
手动备用：`npx wrangler r2 object put lianxizhi-video/aoshu/<id>.mp4 --file=… --content-type=video/mp4 --remote`，再登记推 main。

## 读音核对（19 课起）

- `ttstest.py 名=句子 …`：把几句测试句配音到 `ttstest/`（云端加 `SSL_CERT_FILE=/root/.ccr/ca-bundle.crt`）。
- `cmp.py 句A 句B 句C`：同一句框架只换一个字，比整句 MFCC 的 DTW 距离，看某个多音字更像哪种读法。例：「一个圆圈 / 一个圆娟 / 一个圆悛」里圆悛与圆圈距离 2.6、与圆娟 33，说明「悛」稳定读 quān。
- `tone.py 字`：量配音里某个字的基频走势（平 = 一声，降 = 四声，升 = 二声）；只能分声调，分不了 j/q 这类声母。
- 「圈」晓晓常读成 juān，POLY 表最后一条把所有「圈」换成「悛」（只影响读音）。
