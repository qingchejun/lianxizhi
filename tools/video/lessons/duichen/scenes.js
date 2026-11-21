/* B05 轴对称图形 · 讲解视频分镜 v1（L1 补充第五课，新结构）
 * 开场直接进题（不提上一课、结尾不预告）。
 * 引入：方格蝴蝶沿虚线对折 → 每格都叠在一起 → 轴对称图形、对称轴。
 * 知识地图：一个图形 / 两个图形 / 只画了一半 → 对折看重合、翻过去看重合、数格子补另一半。
 * 第一招：三个方格图对折（① 差一格 ② 重合 ③ 怎么折都不行）→ ②；对称轴不止一条（正方形 4、长方形 2、圆无数条）；小心风车。你来试：等边三角形 3 条。
 * 第二招：一样的两个图形只挪过去 → 折过去对不上；面对面的 → 重合。你来试：① 没翻面 ② 上下翻 ③ 面对面 → ③。
 * 第三招：只画一半 → 虚线左边第 2 格 → 右边第 2 格 → 一行一行补完 → 对折检查。你来试：左边 7 格 → 一共 14 格。
 * 挑战：心形有几条对称轴？（第一招）→ 1 条。口诀 → 知识地图 → 拓展：照镜子时镜子里的你和你成轴对称吗？→ 去练习纸。
 * 新增引擎：任意元素 fold:[[锚点,'x'|'y',原点x,原点y,秒?],…] 绕元素内一条线翻折（再来一次翻回来）。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420'
  var CELLA = '#8fbbe3'               /* 留在原地的一半：蓝 */
  var CELLB = 'rgba(236,150,60,0.78)' /* 折过去的一半：半透明橙，叠上去看得出对没对上 */

  function lbl(x, y, s, color, at, o) {
    o = o || {}
    return { t: 'txt', id: o.id, x: x, y: y, s: s, size: o.size || 40, font: o.font || 'kl', color: color || GREY, at: at, out: o.out, anim: o.anim, glow: o.glow, glow2: o.glow2, overlapOk: o.overlapOk }
  }
  function fill(id, at, val) { return { t: 'fill', id: id, at: at, val: val } }
  function svg(x0, y0, w, h, html, at, o) {
    o = o || {}
    return { t: 'svg', id: o.id, x: x0 + w / 2, y: y0 + h / 2, w: w, h: h, html: html, at: at, out: o.out, draw: o.draw, dur: o.dur, glow: o.glow, glow2: o.glow2, anim: o.anim, fold: o.fold, dim: o.dim, overlapOk: o.overlapOk }
  }
  function node(cx, cy, w, text, color, at, o) {
    o = o || {}
    var fs = o.size || 42
    var h = fs + 34
    var html = '<rect x="3" y="3" width="' + (w - 6) + '" height="' + (h - 6) + '" rx="14" fill="#fffaf0" stroke="' + color + '" stroke-width="4"/>' +
      '<text x="' + w / 2 + '" y="' + (h / 2 + fs * 0.36) + '" font-family="KL" font-size="' + fs + '" text-anchor="middle" fill="' + INK + '">' + text + '</text>'
    return svg(cx - w / 2, cy - h / 2, w, h, html, at, { out: o.out, glow: o.glow, anim: 'pop', dim: o.dim })
  }
  function flowArrow(x, y1, y2, at, o) {
    return { t: 'varrow', x: x, y1: y1, y2: y2, color: GREY, at: at, out: (o || {}).out }
  }
  function line2(x1, y1, x2, y2, at, o) {
    return { t: 'seg', x1: x1, y1: y1, x2: x2, y2: y2, color: GREY, sw: 5, at: at, out: (o || {}).out }
  }
  function cross(x, y, at, o) {
    var html = '<path class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M14 14 L126 126 M126 14 L14 126" fill="none" stroke="' + RED + '" stroke-width="12" stroke-linecap="round"/>'
    return svg(x - 70, y - 70, 140, 140, html, at, { draw: true, dur: 0.5, out: (o || {}).out })
  }
  function circ(i) { return ['①', '②', '③', '④'][i] }

  /* ---------- 方格图 ---------- */
  function rows2g(rows) { return rows.map(function (r) { return r.split('').map(Number) }) }
  /* 背景方格：左上 (x0,y0)，w×h 格，每格 c */
  function board(x0, y0, w, h, c, at, o) {
    var p = []
    for (var k = 0; k <= w; k++) p.push('<line x1="' + (4 + k * c) + '" y1="4" x2="' + (4 + k * c) + '" y2="' + (4 + h * c) + '" stroke="#b9ad9c" stroke-width="2"/>')
    for (var r = 0; r <= h; r++) p.push('<line x1="4" y1="' + (4 + r * c) + '" x2="' + (4 + w * c) + '" y2="' + (4 + r * c) + '" stroke="#b9ad9c" stroke-width="2"/>')
    return svg(x0 - 4, y0 - 4, w * c + 8, h * c + 8, p.join(''), at, o)
  }
  /* 一块格子：只画 g 里 [k0,k1) 列、[r0,r1) 行的涂色格；元素左上角就是 (x0 + k0*c, y0 + r0*c) */
  function cellsEl(g, x0, y0, c, color, at, o) {
    o = o || {}
    var k0 = o.k0 || 0, k1 = o.k1 === undefined ? g[0].length : o.k1
    var r0 = o.r0 || 0, r1 = o.r1 === undefined ? g.length : o.r1
    var p = []
    for (var r = r0; r < r1; r++) for (var k = k0; k < k1; k++) if (g[r][k]) {
      p.push('<rect x="' + (4 + (k - k0) * c) + '" y="' + (4 + (r - r0) * c) + '" width="' + c + '" height="' + c + '" fill="' + color + '" stroke="' + INK + '" stroke-width="3"/>')
    }
    return svg(x0 + k0 * c - 4, y0 + r0 * c - 4, (k1 - k0) * c + 8, (r1 - r0) * c + 8, p.join(''), at, o)
  }
  function dashV(x, y1, y2, at, o) {
    var html = '<line x1="6" y1="0" x2="6" y2="' + (y2 - y1) + '" stroke="' + RED + '" stroke-width="6" stroke-dasharray="18 12"/>'
    return svg(x - 6, y1, 12, y2 - y1, html, at, o)
  }
  function dashH(y, x1, x2, at, o) {
    var html = '<line x1="0" y1="6" x2="' + (x2 - x1) + '" y2="6" stroke="' + RED + '" stroke-width="6" stroke-dasharray="18 12"/>'
    return svg(x1, y - 6, x2 - x1, 12, html, at, o)
  }
  /* 一个方格图：背景 + 左半（蓝）+ 右半（橙，可对折到左边）+ 竖虚线；返回元素数组 */
  function foldFig(g, cx, cy, c, at, o) {
    o = o || {}
    var w = g[0].length, h = g.length, half = w / 2
    var x0 = cx - w * c / 2, y0 = cy - h * c / 2
    var out = [board(x0, y0, w, h, c, at, { out: o.out })]
    out.push(cellsEl(g, x0, y0, c, CELLA, at, { k1: half, out: o.out, glow: o.glowL }))
    out.push(cellsEl(g, x0, y0, c, o.whole ? CELLA : CELLB, o.rightAt || at, { k0: half, out: o.out, fold: o.fold ? o.fold.map(function (f) { return [f, 'x', 4, (h * c + 8) / 2, 1.3] }) : undefined }))
    if (o.axisAt !== null) out.push(dashV(cx, y0 - 30, y0 + h * c + 30, o.axisAt || at, { out: o.out }))
    return out
  }

  var S = []

  /* ---------- 0 开场 ---------- */
  var BUT = rows2g(['110011', '111111', '011110', '001100', '011110', '110011'])
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '今天，我们来认识轴对称图形！', say: '今天，我们来认识轴对称图形！' }
    ],
    els: [
      { t: 'txt', x: 960, y: 200, s: '奥数 · L1 补充 · B05', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
      { t: 'tape', x: 960, y: 330, s: '轴对称图形', size: 110, at: [0, 0.2] }
    ].concat(foldFig(BUT, 960, 670, 48, [1, '认识'], { axisAt: [1, '轴对称'], whole: true }))
  })

  /* ---------- 1 引入：蝴蝶对折 ---------- */
  S.push({
    tag: '轴对称图形',
    beats: [
      { sub: '这只方格蝴蝶，沿中间的虚线对折，会怎么样？', say: '这只方格蝴蝶，沿着中间的虚线对折，会怎么样？', rate: '-6%' },
      { sub: '我们折一折！', say: '我们折一折！' },
      { sub: '每一格都正好叠在一起！', say: '每一格，都正好叠在一起！', pitch: '+5Hz' },
      { sub: '这样的图形叫轴对称图形，虚线叫对称轴。', say: '这样的图形，叫轴对称图形；中间的虚线，叫对称轴。', pause: 0.4 }
    ],
    els: foldFig(BUT, 700, 500, 64, [0, 0.2], { axisAt: [0, '虚线'], fold: [[1, '折一折', 0.2], [3, 0.2]], glowL: [2, '每一格'] }).concat([
      lbl(1400, 380, '对折', ORANGE, [1, '折一折'], { size: 60 }),
      lbl(1400, 500, '完全重合', GREEN, [2, '叠在一起'], { size: 60 }),
      lbl(1400, 650, '轴对称图形', BLUE, [3, '轴对称图形'], { size: 56 }),
      lbl(1400, 760, '虚线：对称轴', RED, [3, '对称轴'], { size: 50 })
    ])
  })

  /* ---------- 2 知识地图 ---------- */
  var MX = [400, 960, 1520]
  function mapEls(at, lit) {
    return [
      node(960, 210, 360, '轴对称', INK, at, { size: 50 }),
      line2(960, 252, MX[0], 360, lit ? at : [0, '一个图形']),
      line2(960, 252, MX[1], 360, lit ? at : [0, '两个图形']),
      line2(960, 252, MX[2], 360, lit ? at : [0, '一半']),
      node(MX[0], 405, 400, '一个图形', BLUE, lit ? at : [0, '一个图形'], { size: 44 }),
      node(MX[1], 405, 400, '两个图形', RED, lit ? at : [0, '两个图形'], { size: 44 }),
      node(MX[2], 405, 400, '只画了一半', GREEN, lit ? at : [0, '一半'], { size: 44 }),
      flowArrow(MX[0], 452, 540, lit ? at : [1, 0.3]),
      flowArrow(MX[1], 452, 540, lit ? at : [1, 0.7]),
      flowArrow(MX[2], 452, 540, lit ? at : [1, 1.1]),
      node(MX[0], 595, 400, '① 对折看重合', BLUE, lit ? at : [1, 0.3], { size: 42, glow: lit ? [0, '对折'] : undefined }),
      node(MX[1], 595, 400, '② 翻过去看重合', RED, lit ? at : [1, 0.7], { size: 42, glow: lit ? [0, '翻过去'] : undefined }),
      node(MX[2], 595, 400, '③ 数格子补另一半', GREEN, lit ? at : [1, 1.1], { size: 42, glow: lit ? [0, '补另一半'] : undefined })
    ]
  }
  S.push({
    tag: '轴对称 | 三种题',
    beats: [
      { sub: '轴对称的题有三种：一个图形、两个图形、只画一半。', say: '轴对称的题，有三种：一个图形，两个图形，只画了一半。' },
      { sub: '每种一招，我们一招一招来学！', say: '每种一招，我们一招一招来学！' }
    ],
    els: mapEls(0, false)
  })

  /* ---------- 3 第一招：对折看重合（三个方格图） ---------- */
  var F1 = rows2g(['0110', '1111', '0110', '0100'])   /* 竖着折差一格 */
  var F2 = rows2g(['1001', '1111', '0110', '1111'])   /* 竖轴对称 */
  var F3 = rows2g(['0100', '0111', '1110', '0010'])   /* 转着对称，没有轴 */
  var FX = [300, 640, 980]
  var e3 = [
    lbl(500, 165, '第一招：对折看重合', BLUE, [0, '第一招'], { size: 46 }),
    lbl(FX[0] - 120, 330, '①', INK, [0, '三个'], { font: 'kai', size: 44 }),
    lbl(FX[1] - 120, 330, '②', INK, [0, '三个', 0.15], { font: 'kai', size: 44 }),
    lbl(FX[2] - 120, 330, '③', INK, [0, '三个', 0.3], { font: 'kai', size: 44 })
  ]
  e3 = e3.concat(foldFig(F1, FX[0], 480, 48, [0, '三个'], { axisAt: [1, '竖着'], fold: [[1, '折一折']] }))
  e3 = e3.concat(foldFig(F2, FX[1], 480, 48, [0, '三个', 0.15], { axisAt: [2, '试一试'], fold: [[2, '试一试']] }))
  e3 = e3.concat(foldFig(F3, FX[2], 480, 48, [0, '三个', 0.3], { axisAt: null, whole: true }))
  e3 = e3.concat([
    cross(FX[0], 480, [1, '对不上']),
    { t: 'check', x: FX[1] + 120, y: 340, at: [2, '对上了'] },
    cross(FX[2], 480, [3, '都对不上']),
    { t: 'stamp', x: 640, y: 760, s: '答：②', color: RED, size: 60, rot: -6, at: [4, '答案'] },
    node(1520, 280, 420, '沿一条直线对折', INK, [0, '第一招'], { size: 40 }),
    flowArrow(1520, 318, 378, [1, '折一折']),
    node(1520, 420, 420, '两边完全重合吗？', INK, [1, '折一折'], { size: 40 }),
    line2(1460, 458, 1360, 520, [2, '对上了']),
    line2(1580, 458, 1680, 520, [1, '对不上']),
    node(1340, 565, 260, '重合：是', GREEN, [2, '对上了'], { size: 38 }),
    node(1700, 565, 280, '对不上：不是', RED, [1, '对不上'], { size: 38 }),
    lbl(1520, 680, '竖着、横着、斜着都试', GREY, [3, '横着'], { size: 38 })
  ])
  S.push({
    tag: '第一招 | 对折看重合',
    beats: [
      { sub: '第一招：对折看重合。这三个图形，哪个是轴对称图形？', say: '第一招：对折看重合。这三个图形，哪个是轴对称图形？', rate: '-4%' },
      { sub: '① 竖着折一折：差了一格，对不上！', say: '一号，竖着折一折：差了一格，对不上！' },
      { sub: '② 也试一试：每一格都对上了！', say: '二号也试一试：每一格都对上了！', pitch: '+5Hz' },
      { sub: '③ 竖着、横着、斜着折，都对不上。', say: '三号，竖着、横着、斜着折，都对不上。' },
      { sub: '答案是 **②**！', say: '答案是二号！', pause: 1 }
    ],
    els: e3
  })

  /* ---------- 4 对称轴不止一条 ---------- */
  function shapeEl(cx, cy, size, inner, at, o) {
    var html = '<g transform="scale(' + size / 100 + ')" fill="#fffaf0" stroke="' + INK + '" stroke-width="' + 400 / size + '" stroke-linejoin="round">' + inner + '</g>'
    return svg(cx - size / 2, cy - size / 2, size, size, html, at, o)
  }
  /* 一条对称轴：过中心、角度 deg（0 竖） */
  function axisEl(cx, cy, len, deg, at, o) {
    var a = deg * Math.PI / 180, dx = Math.sin(a) * len / 2, dy = -Math.cos(a) * len / 2
    var W = Math.abs(dx) * 2 + 12, H = Math.abs(dy) * 2 + 12
    var html = '<line x1="' + (W / 2 - dx) + '" y1="' + (H / 2 - dy) + '" x2="' + (W / 2 + dx) + '" y2="' + (H / 2 + dy) + '" stroke="' + RED + '" stroke-width="5" stroke-dasharray="16 10"/>'
    return svg(cx - W / 2, cy - H / 2, W, H, html, at, { overlapOk: true, out: (o || {}).out })
  }
  var SQ = '<rect x="12" y="12" width="76" height="76"/>'
  var RC = '<rect x="4" y="24" width="92" height="52"/>'
  var CI = '<circle cx="50" cy="50" r="42"/>'
  var e4 = [
    shapeEl(380, 470, 280, SQ, [0, 0.2]),
    shapeEl(940, 470, 330, RC, [2, '长方形']),
    shapeEl(1500, 470, 290, CI, [3, '圆']),
    axisEl(380, 470, 330, 0, [1, '竖着']), axisEl(380, 470, 330, 90, [1, '横着']),
    axisEl(380, 470, 400, 45, [1, '斜着']), axisEl(380, 470, 400, -45, [1, '斜着', 0.3]),
    lbl(380, 700, '4 条', RED, [1, '四条'], { size: 64, font: 'kl' }),
    axisEl(940, 470, 300, 0, [2, '长方形', 0.2]), axisEl(940, 470, 380, 90, [2, '长方形', 0.4]),
    { t: 'stamp', x: 940, y: 300, s: '斜着折不行', color: ORANGE, size: 40, rot: -5, at: [2, '斜着'] },
    lbl(940, 700, '2 条', RED, [2, '两条'], { size: 64, font: 'kl' }),
    lbl(1500, 700, '无数条', RED, [3, '无数条'], { size: 64, font: 'kl' })
  ]
  for (var ci = 0; ci < 6; ci++) e4.push(axisEl(1500, 470, 330, ci * 30, [3, '怎么折', ci * 0.25]))
  S.push({
    tag: '第一招 | 几条对称轴',
    beats: [
      { sub: '对称轴可不一定只有一条。', say: '对称轴，可不一定只有一条。' },
      { sub: '正方形：竖着、横着、斜着折都重合，4 条！', say: '正方形：竖着、横着、斜着折，都重合，一共四条！' },
      { sub: '长方形斜着折对不上，只有 2 条。', say: '长方形，斜着折对不上，只有两条。' },
      { sub: '圆呢？怎么折都重合，有无数条！', say: '圆呢？怎么折都重合，有无数条！', pitch: '+5Hz', pause: 0.5 }
    ],
    els: e4
  })

  /* ---------- 5 小心：风车 ---------- */
  var WIND = '<g transform="translate(50 50)">' + [0, 90, 180, 270].map(function (d) {
    return '<path transform="rotate(' + d + ')" d="M0 0 L0 -44 L22 -22 Z" fill="' + CELLA + '"/>'
  }).join('') + '<circle r="4" fill="' + INK + '"/></g>'
  S.push({
    tag: '第一招 | 小心',
    beats: [
      { sub: '小心！这个风车旋转一下，和自己一样，', say: '小心！这个风车，旋转一下，和原来一样，' },
      { sub: '可是怎么对折都对不上，不是轴对称图形！', say: '可是怎么对折，都对不上，它不是轴对称图形！', pause: 1 }
    ],
    els: [
      shapeEl(700, 480, 380, WIND, [0, 0.2]),
      lbl(1300, 380, '旋转一样 ≠ 对折重合', ORANGE, [0, '旋转'], { size: 50 }),
      { t: 'stamp', x: 1300, y: 560, s: '不是轴对称图形！', color: RED, size: 56, rot: -6, at: [1, '不是'] }
    ]
  })

  /* ---------- 6 你来试 1：等边三角形 3 条 ---------- */
  var TRI = '<polygon points="50,10 92.4,83.5 7.6,83.5"/>'
  S.push({
    tag: '第一招 | 你来试',
    beats: [
      { sub: '你来试：这个三条边一样长的三角形，有几条对称轴？', say: '你来试：这个三条边一样长的三角形，有几条对称轴？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '每个尖角对着的边，从中间折，都重合。', say: '每个尖角，对着的那条边，从中间折，都重合。' },
      { sub: '一共 **3** 条！', say: '一共三条！', pause: 1 }
    ],
    els: [
      lbl(960, 165, '你来试：有几条对称轴？', GREY, [0, 0.2], { size: 46 }),
      shapeEl(600, 470, 380, TRI, [0, 0.3]),
      axisEl(600, 470 + 34, 400, 0, [2, '尖角', 0]),
      axisEl(600, 470 + 34, 400, 60, [2, '尖角', 0.5]),
      axisEl(600, 470 + 34, 400, -60, [2, '尖角', 1.0]),
      { t: 'slot', id: 'q6', x: 1400, y: 470, size: 230, at: [0, 0.6] },
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q6' },
      fill('q6', [3, '三条'], '<span style="font-size:58%">3 条</span>'),
      { t: 'stamp', x: 1500, y: 790, s: '答：3 条', color: RED, size: 54, rot: -6, at: [3, '三条', 0.3] }
    ]
  })

  /* ---------- 7 第二招：翻过去看重合 ---------- */
  var A = rows2g(['110', '011', '010'])
  function mirrorRows(g) { return g.map(function (r) { return r.slice().reverse() }) }
  function flipRows(g) { return g.slice().reverse().map(function (r) { return r.slice() }) }
  /* 一组：左图 l、右图 r，中间空两列、竖虚线在正中；右图可以绕虚线折过去 */
  function pairEls(l, r, cx, cy, c, at, o) {
    o = o || {}
    var w = 8, h = 3
    var x0 = cx - w * c / 2, y0 = cy - h * c / 2
    var out = [board(x0, y0, w, h, c, at)]
    out.push(cellsEl(l, x0, y0, c, CELLA, at))
    out.push(cellsEl(r, x0 + 5 * c, y0, c, CELLB, at, { fold: o.fold ? o.fold.map(function (f) { return [f, 'x', 4 - c, (h * c + 8) / 2, 1.3] }) : undefined }))
    out.push(dashV(cx, y0 - 26, y0 + h * c + 26, at))
    return out
  }
  var e7 = [lbl(500, 165, '第二招：翻过去看重合', RED, [1, '第二招'], { size: 46 })]
  e7 = e7.concat(pairEls(A, A, 380, 430, 50, [0, 0.2], { fold: [[2, '折过去']] }))
  e7 = e7.concat(pairEls(A, mirrorRows(A), 980, 430, 50, [3, '这一组'], { fold: [[4, '折过去']] }))
  e7 = e7.concat([
    lbl(380, 300, '①', INK, [0, 0.2], { font: 'kai', size: 44 }),
    lbl(980, 300, '②', INK, [3, '这一组'], { font: 'kai', size: 44 }),
    cross(380, 430, [2, '对不上']),
    { t: 'check', x: 1200, y: 320, at: [4, '对上了'] },
    lbl(980, 620, '成轴对称', GREEN, [4, '成轴对称'], { size: 50 }),
    node(1600, 280, 400, '一模一样吗？', INK, [2, '一模一样'], { size: 40 }),
    flowArrow(1600, 318, 378, [3, '面对面']),
    node(1600, 420, 400, '翻过来、面对面？', INK, [3, '面对面'], { size: 40 }),
    flowArrow(1600, 458, 518, [4, '对上了']),
    node(1600, 560, 400, '折过去重合', GREEN, [4, '对上了'], { size: 40 }),
    { t: 'stamp', x: 640, y: 760, s: '只挪过去不算！', color: RED, size: 52, rot: -5, at: [5, '还不够'] }
  ])
  S.push({
    tag: '第二招 | 翻过去看重合',
    beats: [
      { sub: '这回是两个图形，它们成轴对称吗？', say: '这回是两个图形，它们成轴对称吗？', rate: '-6%' },
      { sub: '第二招：翻过去看重合。', say: '第二招：翻过去看重合。' },
      { sub: '① 两个一模一样，可是没翻面：折过去，对不上！', say: '一号，两个一模一样，可是没翻面：折过去，对不上！' },
      { sub: '② 这一组，两个图形面对面站着，', say: '再看二号这一组：两个图形，面对面站着，' },
      { sub: '折过去，每一格都对上了，成轴对称！', say: '折过去，每一格都对上了，成轴对称！', pitch: '+5Hz' },
      { sub: '小心！一模一样还不够，要翻过来、面对面才算。', say: '小心！一模一样还不够，要翻过来，面对面才算。', pause: 1 }
    ],
    els: e7
  })

  /* ---------- 8 你来试 2：① 没翻面 ② 上下翻 ③ 面对面 → ③ ---------- */
  var B = rows2g(['100', '111', '010'])
  var PX = [380, 960, 1540]
  var e8 = [
    lbl(960, 165, '你来试：哪一组成轴对称？', GREY, [0, 0.2], { size: 46 }),
    { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5 },
    cross(PX[0], 430, [2, '没翻面']),
    cross(PX[1], 430, [2, '上下翻']),
    { t: 'check', x: PX[2] + 200, y: 320, at: [3, '全对上'] },
    { t: 'stamp', x: 1500, y: 790, s: '答：③', color: RED, size: 56, rot: -6, at: [3, '三号', 0.3] }
  ]
  ;[[B, B], [B, flipRows(B)], [B, mirrorRows(B)]].forEach(function (pr, i) {
    e8 = e8.concat(pairEls(pr[0], pr[1], PX[i], 430, 40, [0, 0.3 + i * 0.15], { fold: i === 2 ? [[3, '折过去']] : undefined }))
    e8.push(lbl(PX[i] - 120, 330, circ(i), INK, [0, 0.3 + i * 0.15], { font: 'kai', size: 40 }))
  })
  S.push({
    tag: '第二招 | 你来试',
    beats: [
      { sub: '你来试：哪一组成轴对称？', say: '你来试：哪一组，成轴对称？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '① 没翻面；② 是上下翻的，也不行。', say: '一号没翻面；二号是上下翻的，也不行。' },
      { sub: '③ 面对面，折过去全对上：答 **③**！', say: '三号面对面，折过去全对上：答案是三号！', pause: 1 }
    ],
    els: e8
  })

  /* ---------- 9 第三招：数格子补另一半 ---------- */
  var G = rows2g(['00111100', '01111110', '11111111', '00111100', '00100100', '01100110'])
  var GC = 60, GX = 600, GY = 480
  var gx0 = GX - 8 * GC / 2, gy0 = GY - 6 * GC / 2
  var e9 = [
    lbl(500, 165, '第三招：数格子补另一半', GREEN, [1, '第三招'], { size: 46 }),
    board(gx0, gy0, 8, 6, GC, [0, 0.2]),
    cellsEl(G, gx0, gy0, GC, CELLA, [0, 0.2], { k1: 4 }),
    dashV(GX, gy0 - 30, gy0 + 6 * GC + 30, [0, 0.2]),
    /* 第 5 行（r=4）左边那格在 c=2：虚线左边第 2 格 → 右边第 2 格 c=5 */
    svg(gx0 + 2 * GC - 4, gy0 + 4 * GC - 4, GC + 8, GC + 8, '<rect x="4" y="4" width="' + GC + '" height="' + GC + '" fill="none" stroke="' + RED + '" stroke-width="7"/>', [2, '这一格'], { glow: [2, '这一格'] }),
    lbl(gx0 + 2.5 * GC, gy0 + 6 * GC + 45, '第 2 格', RED, [2, '第二格'], { size: 36, overlapOk: true }),
    cellsEl(rows2g(['00000000', '00000000', '00000000', '00000000', '00000100', '00000000']), gx0, gy0, GC, CELLB, [3, '涂上'], { k0: 4, glow: [3, '涂上'], fold: [[5, '对折'], [5, '重合', 1.2]] }),
    lbl(gx0 + 5.5 * GC, gy0 + 6 * GC + 45, '第 2 格', RED, [3, '第二格'], { size: 36, overlapOk: true }),
    cellsEl(rows2g(['00111100', '01111110', '11111111', '00111100', '00100000', '01100110']), gx0, gy0, GC, CELLB, [4, '一行一行'], { k0: 4, fold: [[5, '对折'], [5, '重合', 1.2]] }),
    node(1450, 280, 460, '这格离虚线第几格？', INK, [2, '这一格'], { size: 40 }),
    flowArrow(1450, 318, 378, [3, '那边']),
    node(1450, 420, 460, '那边同样第几格涂上', INK, [3, '那边'], { size: 40 }),
    flowArrow(1450, 458, 518, [5, '对折']),
    node(1450, 560, 460, '对折检查：重合', GREEN, [5, '对折'], { size: 40 }),
    { t: 'check', x: 1000, y: 260, at: [5, '重合'] }
  ]
  S.push({
    tag: '第三招 | 数格子补另一半',
    beats: [
      { sub: '这回只画了一半！另一半怎么补？', say: '这回，只画了一半！另一半，怎么补？', pitch: '+5Hz' },
      { sub: '第三招：数格子补另一半。', say: '第三招：数格子，补另一半。' },
      { sub: '看这一格：它是虚线左边第 2 格，', say: '看这一格：它是虚线左边的第二格，' },
      { sub: '那边也数到第 2 格，涂上。', say: '那边，也数到第二格，涂上。' },
      { sub: '一行一行这样补，就画好了！', say: '一行一行这样补，就画好了！' },
      { sub: '最后对折检查：完全重合！', say: '最后对折检查：完全重合！', pause: 0.6 }
    ],
    els: e9
  })

  /* ---------- 10 你来试 3：左边 7 格 → 14 格 ---------- */
  var H = rows2g(['010010', '111111', '001100', '011110'])
  var hx0 = 600 - 3 * 60, hy0 = 470 - 2 * 60
  S.push({
    tag: '第三招 | 你来试',
    beats: [
      { sub: '你来试：补好另一半，一共涂几格？', say: '你来试：补好另一半，一共涂几格？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '左边 7 格，补的另一半也是 7 格：', say: '左边七格，补上的另一半，也是七格：' },
      { sub: '7 + 7 = **14** 格！', say: '七加七，一共十四格！', pause: 1 }
    ],
    els: [
      lbl(960, 165, '你来试：一共涂几格？', GREY, [0, 0.2], { size: 46 }),
      board(hx0, hy0, 6, 4, 60, [0, 0.3]),
      cellsEl(H, hx0, hy0, 60, CELLA, [0, 0.3], { k1: 3 }),
      cellsEl(H, hx0, hy0, 60, CELLB, [2, '另一半'], { k0: 3 }),
      dashV(600, hy0 - 30, hy0 + 4 * 60 + 30, [0, 0.3]),
      lbl(500, 680, '7 格', BLUE, [2, '左边'], { size: 46 }),
      lbl(700, 680, '7 格', ORANGE, [2, '也是'], { size: 46 }),
      { t: 'slot', id: 'q10', x: 1400, y: 470, size: 230, at: [0, 0.6] },
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q10' },
      fill('q10', [3, '十四'], '14'),
      { t: 'stamp', x: 1500, y: 790, s: '答：14 格', color: RED, size: 54, rot: -6, at: [3, '十四', 0.3] }
    ]
  })

  /* ---------- 11 挑战：心形几条对称轴 ---------- */
  var HEART = '<path d="M50 88 C20 66 6 48 10 32 C14 16 36 12 50 30 C64 12 86 16 90 32 C94 48 80 66 50 88 Z"/>'
  S.push({
    tag: '挑战 | 这次用哪一招？',
    beats: [
      { sub: '挑战题：这个心形有几条对称轴？', say: '挑战题：这个心形，有几条对称轴？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', rate: '-6%', pause: 5 },
      { sub: '一个图形，用第一招：对折看重合。', say: '一个图形，就用第一招：对折看重合。' },
      { sub: '竖着折重合；横着、斜着都不行。', say: '竖着折，重合；横着、斜着，都不行。' },
      { sub: '只有 **1** 条！', say: '只有一条！', pause: 1 }
    ],
    els: [
      lbl(960, 165, '挑战：有几条对称轴？', GREY, [0, 0.2], { size: 46 }),
      shapeEl(600, 470, 380, HEART, [0, 0.3]),
      { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5 },
      lbl(1400, 330, '第一招：对折看重合', BLUE, [2, '第一招'], { size: 44 }),
      axisEl(600, 470, 420, 0, [3, '竖着']),
      axisEl(600, 470, 420, 90, [3, '横着'], { out: [3, '横着', 0.8] }),
      lbl(1400, 600, '横着、斜着：都不行', ORANGE, [3, '都不行'], { size: 42 }),
      lbl(1400, 460, '1 条', RED, [4, '一条'], { size: 90 }),
      { t: 'stamp', x: 1500, y: 790, s: '答：1 条', color: RED, size: 54, rot: -6, at: [4, '一条', 0.3] }
    ]
  })

  /* ---------- 12 口诀（讲解页原文） ---------- */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '对折两边能重合，中间直线叫对称轴；', say: '对折两边能重合，中间直线叫对称轴；', rate: '-15%' },
      { sub: '一个图形找身上，两个图形找中间；', say: '一个图形找身上，两个图形找中间；', rate: '-15%' },
      { sub: '补画一半数格子，离轴一样远。', say: '补画一半数格子，离轴一样远。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 470, w: 1500, h: 480, at: 0 },
      { t: 'chant', x: 960, y: 330, s: '对折两边能重合，中间直线叫对称轴；', color: RED, size: 58, at: 1 },
      { t: 'chant', x: 960, y: 470, s: '一个图形找身上，两个图形找中间；', color: BLUE, size: 58, at: 2 },
      { t: 'chant', x: 960, y: 610, s: '补画一半数格子，离轴一样远。', color: GREEN, size: 58, at: 3 }
    ]
  })

  /* ---------- 13 结尾：知识地图 + 拓展想一想 ---------- */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天学会了三招：对折、翻过去、补另一半。', say: '今天学会了三招：对折，翻过去，补另一半。' },
      { sub: '想一想：照镜子时，镜子里的你和你，成轴对称吗？', say: '想一想：照镜子的时候，镜子里的你和你，成轴对称吗？', rate: '-6%', pause: 1 },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: mapEls(0, true).concat([
      lbl(960, 790, '镜子里的你和你，成轴对称吗？', RED, [1, '镜子'], { size: 50, out: [2, 0] }),
      { t: 'tape', x: 960, y: 790, s: '去练习纸上试试吧！', size: 50, at: [2, '练习纸'] }
    ])
  })

  /* 讲完一招点亮知识地图的一枝 */
  function mapScene(n) {
    var e = mapEls(0, true)
    var moves = e.slice(-3)
    var sits = e.slice(4, 7)
    moves.forEach(function (m, k) {
      m.glow = undefined
      if (k === n - 1) { m.at = [0, '学会']; m.glow = [0, '学会', 0.3] }
      if (k >= n) { m.dim = 0; sits[k].dim = 0 }
    })
    for (var k = 0; k < n; k++) e.push({ t: 'check', x: MX[k] + 200 + 30, y: 590, at: k === n - 1 ? [0, '学会', 0.3] : 0, sfx: k === n - 1 ? undefined : false })
    var say = ['第一招学会了！还有两招。', '第二招也学会了！还剩最后一招。', '三招都学会了！来个挑战！'][n - 1]
    return { tag: '轴对称 | 学到哪了', beats: [{ sub: say, say: say, pitch: '+5Hz', pause: 0.4 }], els: e }
  }
  /* 场景顺序：0 开场 1 引入 2 地图 3 第一招 4 几条轴 5 小心 6 你来试1 | 7 第二招 8 你来试2 | 9 第三招 10 你来试3 | 11 挑战 12 口诀 13 结尾 */
  S.splice(11, 0, mapScene(3))
  S.splice(9, 0, mapScene(2))
  S.splice(7, 0, mapScene(1))

  /* 封面 */
  S.cover = {
    tag: null,
    els: [
      { t: 'txt', x: 960, y: 130, s: '奥数 · L1 补充 · B05 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
      { t: 'tape', x: 960, y: 270, s: '轴对称图形', size: 120, at: 0 },
      { t: 'txt', x: 960, y: 410, s: '对折两边能重合', size: 58, color: RED, font: 'kl', at: 0 }
    ].concat(foldFig(BUT, 960, 670, 46, 0, { axisAt: 0, whole: true })).concat([
      { t: 'txt', x: 960, y: 930, s: '对折看重合 · 翻过去看重合 · 数格子补另一半', size: 46, color: GREEN, font: 'kl', at: 0 }
    ])
  }

  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
