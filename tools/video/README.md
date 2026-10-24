# 奥数讲解视频 · 渲染引擎

练习纸奥数课的讲解视频都用这套工具做：网页动画逐帧截图成画面，edge-tts 配音，ffmpeg 合成。
标杆是 08 数列找规律；第 10 课等量代换 v4 是第一期完整用上这套流水线的。

## 文件

| 文件 | 作用 |
|---|---|
| `render.html` | 渲染引擎：方格纸背景、手绘图形和物品、天平、圈一圈、箭头、便签、印章、08 同款倒计时、念到即高亮、场景淡入淡出；`sfxList()` 导出音效时间表，`layoutReport()` 做版面自检 |
| `lessons/<id>/scenes.js` | 每课的分镜：每个场景 `{ tag, beats: [{sub, say, pause?, rate?, pitch?, tts?}], els: [...] }`；`SCENES.cover` 是封面 |
| `tts.py` | 逐句配音（晓晓）+ 逐字时间戳；POLY 表修多音字；每句可单独设 `rate` / `pitch` |
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
python3 sfx.py && python3 sfx_events.py && python3 assemble.py
python3 shoot.py timing.json cover cover.jpg
```

上线：`final.mp4` 传到 R2 的 `aoshu/<id>.mp4`，`cover.jpg` 传到 `aoshu/<id>.jpg`，然后在 `js/aoshu-videos.js` 的 `LIST`（和 `POSTER`）里登记。

背景音乐 `bgm_full.wav`（约 4:49）不进仓库，在本机 `~/Movies/练习纸视频/素材-shuzimi2-重做版/`。
