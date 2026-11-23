/* B11 线角初步：认识线 · 讲解视频分镜 v1（L1 补充第十一课，新结构，三招）
 * 开场直接进题（不提上一课、结尾不预告）。
 * 引入：手电筒的光一直往前，没有尽头；尺子的边两头到头。
 * 知识地图：是什么线 → ① 看端点；两条线的位置 → ② 看位置；几组平行线 → ③ 编号数。
 * 第一招：认识直线、射线、线段 → 判断流程（直不直 → 数端点）→ 例题（短直线、带点的折线陷阱）→ 你来试：哪条是射线。
 * 第二招：认识平行、相交、垂直 → 判断流程（碰到了吗 → 小板凳 / 延长看看）→ 例题（越来越近的不平行）→ 能相交吗（射线延长 / 线段不能延长）→ 你来试：哪一组能相交。
 * 第三招：3 条平行线编号、打枪法 3 组 → 4 条 6 组（斜线不算）→ 你来试：三角形里 3 组。
 * 挑战：横 3 竖 2 → 3 + 1 = 4 组。口诀 → 知识地图 → 拓展：5 条平行线几组？→ 去练习纸。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420'
  var CIRC = ['①', '②', '③', '④', '⑤', '⑥']
  var NUM = ['一', '二', '三', '四', '五', '六']

  function lbl(x, y, s, color, at, o) {
    o = o || {}
    return { t: 'txt', id: o.id, x: x, y: y, s: s, size: o.size || 40, font: o.font || 'kl', color: color || GREY, at: at, out: o.out, anim: o.anim, glow: o.glow, glow2: o.glow2, overlapOk: o.overlapOk }
  }
  function fill(id, at, val) { return { t: 'fill', id: id, at: at, val: val } }
  function svg(x0, y0, w, h, html, at, o) {
    o = o || {}
    return { t: 'svg', id: o.id, x: x0 + w / 2, y: y0 + h / 2, w: w, h: h, html: html, at: at, out: o.out, glow: o.glow, glow2: o.glow2, anim: o.anim, dim: o.dim, draw: o.draw, dur: o.dur, move: o.move, overlapOk: o.overlapOk !== undefined ? o.overlapOk : true }
  }
  function node(cx, cy, w, text, color, at, o) {
    o = o || {}
    var fs = o.size || 42, h = fs + 34
    var html = '<rect x="3" y="3" width="' + (w - 6) + '" height="' + (h - 6) + '" rx="14" fill="#fffaf0" stroke="' + color + '" stroke-width="4"/>' +
      '<text x="' + w / 2 + '" y="' + (h / 2 + fs * 0.36) + '" font-family="KL" font-size="' + fs + '" text-anchor="middle" fill="' + INK + '">' + text + '</text>'
    var e = svg(cx - w / 2, cy - h / 2, w, h, html, at, { out: o.out, glow: o.glow, anim: 'pop', dim: o.dim })
    e.overlapOk = false
    return e
  }
  function flowArrow(x, y1, y2, at) { return { t: 'varrow', x: x, y1: y1, y2: y2, color: GREY, at: at } }
  function line2(x1, y1, x2, y2, at, o) { return { t: 'seg', x1: x1, y1: y1, x2: x2, y2: y2, color: (o && o.color) || GREY, sw: 5, at: at, out: o && o.out } }
  function cross(x, y, at, o) {
    var html = '<path class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M14 14 L106 106 M106 14 L14 106" fill="none" stroke="' + RED + '" stroke-width="11" stroke-linecap="round"/>'
    return svg(x - 60, y - 60, 120, 120, html, at, { draw: true, dur: 0.5, out: (o || {}).out })
  }

  /* ---------- 线的小零件（局部坐标） ---------- */
  function L(x1, y1, x2, y2, o) {
    o = o || {}
    return '<path ' + (o.draw ? 'class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" ' : '') + 'd="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" stroke="' + (o.color || INK) + '" stroke-width="' + (o.sw || 10) + '" stroke-linecap="round" fill="none"/>'
  }
  function D(x, y, c) { return '<circle cx="' + x + '" cy="' + y + '" r="13" fill="' + (c || INK) + '"/>' }
  /* 延长出去的部分：一串小圆点 */
  function E(x1, y1, x2, y2, c) {
    return '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" stroke="' + (c || GREY) + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="0.1 20" fill="none"/>'
  }
  function O(x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="16" fill="none" stroke="' + RED + '" stroke-width="6"/>' }
  /* 小板凳（直角记号）：交点 (x,y)，沿 u、v 两个方向 */
  function MK(x, y, u, v, k) {
    k = k || 22
    var a = [x + u[0] * k, y + u[1] * k], b = [x + u[0] * k + v[0] * k, y + u[1] * k + v[1] * k], c = [x + v[0] * k, y + v[1] * k]
    return '<path d="M' + a.join(' ') + ' L' + b.join(' ') + ' L' + c.join(' ') + '" stroke="' + RED + '" stroke-width="6" fill="none"/>'
  }
  function zigPath(pts, o) {
    o = o || {}
    return '<path d="M' + pts.map(function (p) { return p.join(' ') }).join(' L') + '" stroke="' + INK + '" stroke-width="10" stroke-linejoin="round" stroke-linecap="round" fill="none"/>'
  }
  function curvePath(x0, y0, w, amp) {
    var d = 'M' + x0 + ' ' + y0
    for (var k = 1; k <= 30; k++) {
      var x = x0 + (w * k) / 30
      d += ' L' + x.toFixed(1) + ' ' + (y0 + amp * Math.sin((k / 30) * 3 * Math.PI)).toFixed(1)
    }
    return '<path d="' + d + '" stroke="' + INK + '" stroke-width="10" stroke-linecap="round" fill="none"/>'
  }

  /* 一个编号格子里的一条线：格子 220×170，中心 (cx, cy) */
  function cell(cx, cy, inner, at, o) {
    o = o || {}
    return svg(cx - 110, cy - 85, 220, 170, inner, at, { anim: 'pop', glow: o.glow, glow2: o.glow2, out: o.out, dim: o.dim })
  }
  function num(cx, y, i, at, o) { return lbl(cx, y, CIRC[i], INK, at, { size: 50, font: 'num', glow: (o || {}).glow, glow2: (o || {}).glow2 }) }

  var S = []

  /* ---------- 0 开场 ---------- */
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '今天，我们来认识各种各样的线！', say: '今天，我们来认识各种各样的线！' }
    ],
    els: [
      { t: 'txt', x: 960, y: 200, s: '奥数 · L1 补充 · B11', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
      { t: 'tape', x: 960, y: 330, s: '线角初步：认识线', size: 100, at: [0, 0.2] },
      lbl(960, 560, '直线 · 射线 · 线段 · 平行 · 垂直', GREY, [1, '线'], { size: 54 })
    ]
  })

  /* ---------- 1 引入：手电筒的光、尺子 ---------- */
  var torch = '<rect x="6" y="40" width="150" height="70" rx="14" fill="#9fd3f0" stroke="' + INK + '" stroke-width="6"/>' +
    '<path d="M156 30 L196 14 L196 136 L156 120 Z" fill="#f7e08a" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>' +
    '<rect x="40" y="56" width="34" height="18" rx="5" fill="' + RED + '"/>'
  var ticks = ''
  for (var t = 0; t <= 30; t++) ticks += '<path d="M' + (20 + t * 30) + ' 6 V' + (t % 5 ? 30 : 46) + '" stroke="' + INK + '" stroke-width="4"/>'
  S.push({
    tag: '先想一想',
    beats: [
      { sub: '打开手电筒，光能照多远？', say: '打开手电筒，光能照多远？', rate: '-6%' },
      { sub: '一直往前，没有尽头！', say: '一直往前，没有尽头！', pitch: '+5Hz' },
      { sub: '尺子的边呢？两头都到头了。', say: '尺子的边呢？两头都到头了。', pause: 0.5 }
    ],
    els: [
      svg(140, 245, 200, 150, torch, [0, '手电筒'], { anim: 'pop' }),
      svg(340, 270, 1200, 100, '<path d="M10 0 L1190 -60 L1190 160 L10 100 Z" fill="#f7e08a" opacity="0.35"/>' + L(10, 50, 1190, 50, { draw: true, color: ORANGE, sw: 12 }), [0, '光', 0.3], { draw: true, dur: 1.4 }),
      svg(1540, 300, 330, 40, E(10, 20, 320, 20, ORANGE), [1, '一直往前']),
      lbl(1700, 400, '没有尽头', ORANGE, [1, '没有尽头'], { size: 50 }),
      svg(440, 600, 940, 70, '<rect x="4" y="4" width="932" height="62" rx="6" fill="#fffaf0" stroke="' + INK + '" stroke-width="5"/>' + ticks, [2, '尺子'], { anim: 'pop' }),
      svg(415, 575, 50, 50, D(25, 25, RED), [2, '两头'], { anim: 'pop' }),
      svg(1355, 575, 50, 50, D(25, 25, RED), [2, '两头', 0.2], { anim: 'pop' }),
      lbl(910, 740, '两头都到头了', RED, [2, '到头'], { size: 50 })
    ]
  })

  /* ---------- 2 知识地图 ---------- */
  var MX = [420, 960, 1500]
  function mapEls(at, lit) {
    return [
      node(960, 210, 300, '认识线', INK, at, { size: 50 }),
      line2(960, 252, MX[0], 360, lit ? at : [0, '什么线']),
      line2(960, 252, MX[1], 360, lit ? at : [0, '什么位置']),
      line2(960, 252, MX[2], 360, lit ? at : [0, '平行线']),
      node(MX[0], 405, 420, '是什么线？', BLUE, lit ? at : [0, '什么线'], { size: 44 }),
      node(MX[1], 405, 420, '两条线的位置', RED, lit ? at : [0, '什么位置'], { size: 44 }),
      node(MX[2], 405, 420, '几组平行线？', GREEN, lit ? at : [0, '平行线'], { size: 44 }),
      flowArrow(MX[0], 452, 540, lit ? at : [1, '每种', 0.2]),
      flowArrow(MX[1], 452, 540, lit ? at : [1, '每种', 0.6]),
      flowArrow(MX[2], 452, 540, lit ? at : [1, '每种', 1.0]),
      node(MX[0], 595, 300, '① 看端点', BLUE, lit ? at : [1, '每种', 0.2], { size: 48, glow: lit ? [0, '三招', 0.4] : undefined }),
      node(MX[1], 595, 300, '② 看位置', RED, lit ? at : [1, '每种', 0.6], { size: 48, glow: lit ? [0, '三招', 0.8] : undefined }),
      node(MX[2], 595, 300, '③ 编号数', GREEN, lit ? at : [1, '每种', 1.0], { size: 48, glow: lit ? [0, '三招', 1.2] : undefined })
    ]
  }
  S.push({
    tag: '认识线 | 三种题',
    beats: [
      { sub: '线的题有三种：', say: '线的题有三种：什么线？什么位置？几组平行线？' },
      { sub: '每种一招，一招一招来学！', say: '每种一招，一招一招来学！' }
    ],
    els: mapEls(0, false)
  })

  /* ---------- 3 第一招：直线、射线、线段 ---------- */
  var LX0 = 420, LX1 = 1080
  S.push({
    tag: '第一招 | 看端点',
    beats: [
      { sub: '第一招：看端点。直线没有端点，两头都能延长。', say: '第一招：看端点。直线没有端点，两头都能延长。' },
      { sub: '射线，一个端点，往没点的那头一直延长。', say: '射线，一个端点，往没点的那头，一直延长。' },
      { sub: '线段，两个端点，两头到头，不能延长。', say: '线段，两个端点，两头到头，不能延长。', pause: 0.6 }
    ],
    els: [
      svg(LX0 - 20, 230, LX1 - LX0 + 40, 40, L(20, 20, LX1 - LX0 + 20, 20, { draw: true }), [0, '直线'], { draw: true, dur: 0.6 }),
      svg(LX0 - 300, 230, 270, 40, E(250, 20, 10, 20), [0, '延长']),
      svg(LX1 + 30, 230, 270, 40, E(20, 20, 260, 20), [0, '延长']),
      lbl(1600, 250, '直线：0 个端点', BLUE, [0, '没有端点'], { size: 48 }),
      svg(LX0 - 20, 410, LX1 - LX0 + 40, 40, L(20, 20, LX1 - LX0 + 20, 20, { draw: true }) + D(20, 20), [1, '射线'], { draw: true, dur: 0.6 }),
      svg(LX1 + 30, 410, 270, 40, E(20, 20, 260, 20), [1, '一直延长']),
      lbl(1600, 430, '射线：1 个端点', BLUE, [1, '一个端点'], { size: 48 }),
      svg(LX0 - 20, 590, LX1 - LX0 + 40, 40, L(20, 20, LX1 - LX0 + 20, 20, { draw: true }) + D(20, 20) + D(LX1 - LX0 + 20, 20), [2, '线段'], { draw: true, dur: 0.6 }),
      lbl(1600, 610, '线段：2 个端点', BLUE, [2, '两个端点'], { size: 48 }),
      lbl(LX1 + 160, 690, '不能延长', RED, [2, '不能延长'], { size: 42 })
    ]
  })

  /* ---------- 4 第一招：判断流程 ---------- */
  S.push({
    tag: '第一招 | 怎么认',
    beats: [
      { sub: '先看直不直：弯的是曲线，拐弯的是折线，都不算。', say: '遇到一条线，先看直不直：弯弯的是曲线，拐弯的是折线，都不算。' },
      { sub: '直的，再数端点：0 个、1 个、2 个。', say: '直的，再数端点：没有、一个、两个。', pause: 0.6 }
    ],
    els: [
      node(960, 170, 300, '直不直？', INK, [0, '直不直'], { size: 46 }),
      line2(860, 212, 480, 330, [0, '弯弯的']),
      lbl(600, 250, '不直', GREY, [0, '弯弯的'], { size: 38 }),
      node(480, 375, 380, '曲线、折线：不算', ORANGE, [0, '弯弯的'], { size: 40 }),
      svg(300, 470, 160, 90, curvePath(10, 45, 140, 26), [0, '曲线']),
      svg(500, 460, 170, 110, zigPath([[10, 90], [55, 15], [100, 90], [155, 15]]), [0, '折线']),
      cross(480, 515, [0, '都不算']),
      line2(1060, 212, 1380, 330, [1, '直的']),
      lbl(1290, 250, '直的', GREY, [1, '直的'], { size: 38 }),
      node(1380, 375, 280, '数端点', BLUE, [1, '数端点'], { size: 44 }),
      line2(1380, 418, 1060, 540, [1, '没有']),
      line2(1380, 418, 1380, 540, [1, '一个']),
      line2(1380, 418, 1700, 540, [1, '两个']),
      node(1060, 585, 280, '0 个：直线', BLUE, [1, '没有'], { size: 40 }),
      node(1380, 585, 280, '1 个：射线', BLUE, [1, '一个'], { size: 40 }),
      node(1700, 585, 280, '2 个：线段', BLUE, [1, '两个'], { size: 40 }),
      svg(950, 660, 220, 40, L(20, 20, 200, 20), [1, '没有']),
      svg(1270, 660, 220, 40, L(20, 20, 200, 20) + D(20, 20), [1, '一个']),
      svg(1590, 660, 220, 40, L(20, 20, 200, 20) + D(20, 20) + D(200, 20), [1, '两个'])
    ]
  })

  /* ---------- 5 第一招 · 例题 ---------- */
  var CX5 = [310, 570, 830, 1090, 1350, 1610], CY5 = 380
  var items5 = [
    L(75, 85, 145, 85),                                                 /* ① 短直线 */
    L(30, 120, 190, 50) + D(30, 120) + D(190, 50),                      /* ② 线段 */
    curvePath(20, 85, 180, 30),                                         /* ③ 曲线 */
    L(30, 50, 190, 120) + D(30, 50),                                    /* ④ 射线 */
    L(14, 85, 206, 85) + D(14, 85) + D(206, 85),                        /* ⑤ 长线段 */
    zigPath([[25, 125], [80, 40], [135, 125], [195, 40]]) + D(25, 125) + D(195, 40) /* ⑥ 带点的折线 */
  ]
  var glow5 = [[2, '一号'], [2, '二号'], undefined, [2, '四号'], [2, '五号'], [1, '六号']]
  var els5 = []
  items5.forEach(function (h, i) {
    els5.push(cell(CX5[i], CY5, h, [0, 0.3 + 0.15 * i], { glow: glow5[i], glow2: i === 0 ? [3, '一号'] : undefined, dim: i === 2 || i === 5 ? [1, '划掉', 0.4] : undefined }))
    els5.push(num(CX5[i], CY5 + 130, i, [0, 0.3 + 0.15 * i]))
  })
  S.push({
    tag: '第一招 | 例题',
    beats: [
      { sub: '哪些是直线、射线、线段？', say: '下面哪些是直线、射线、线段？', rate: '-6%' },
      { sub: '③ 弯弯的，⑥ 拐了弯，两头有点也不算，划掉。', say: '三号弯弯的，六号拐了弯，两头有点也不算，划掉。' },
      { sub: '① 没有端点是直线；④ 一个是射线；② ⑤ 两个是线段。', say: '一号没有端点，是直线；四号一个，是射线；二号、五号两个，是线段。', pause: 0.5 },
      { sub: '小心：① 画得短，也是直线！', say: '小心：一号画得短，也是直线！', pause: 1 }
    ],
    els: els5.concat([
      cross(CX5[2], CY5, [1, '三号', 0.4]),
      cross(CX5[5], CY5, [1, '六号', 0.4]),
      lbl(CX5[0], 650, '直线', BLUE, [2, '是直线'], { size: 50 }),
      lbl(CX5[3], 650, '射线', BLUE, [2, '是射线'], { size: 50 }),
      lbl(CX5[1], 650, '线段', BLUE, [2, '是线段'], { size: 50 }),
      lbl(CX5[4], 650, '线段', BLUE, [2, '是线段'], { size: 50 }),
      { t: 'stamp', x: 960, y: 800, s: '直线 ①　射线 ④　线段 ②⑤', color: RED, size: 56, rot: -3, at: [2, '是线段', 0.6] }
    ])
  })

  /* ---------- 6 你来试 1：哪一条是射线 ---------- */
  var CX6 = [300, 560, 820, 1080]
  var items6 = [
    L(30, 110, 190, 60) + D(30, 110) + D(190, 60),
    L(30, 85, 190, 85),
    L(40, 50, 190, 120) + D(190, 120),
    zigPath([[25, 120], [100, 45], [195, 120]]) + D(25, 120)
  ]
  var els6 = []
  items6.forEach(function (h, i) {
    els6.push(cell(CX6[i], 400, h, [0, 0.3 + 0.15 * i], { glow: i === 2 ? [2, '三号'] : undefined }))
    els6.push(num(CX6[i], 530, i, [0, 0.3 + 0.15 * i]))
  })
  S.push({
    tag: '第一招 | 你来试',
    beats: [
      { sub: '你来试：哪一条是射线？', say: '你来试：哪一条是射线？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '③ 直直的，一个端点，是射线！', say: '三号，直直的，一个端点，是射线！', pause: 1 }
    ],
    els: els6.concat([
      { t: 'slot', id: 'q6', x: 1550, y: 420, size: 200, at: [0, '射线'] },
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q6' },
      lbl(1550, 600, '④ 拐了弯，是折线', GREY, [2, '是射线', 0.3], { size: 40 }),
      fill('q6', [2, '三号'], '③')
    ])
  })

  /* ---------- 7 第二招：平行、相交、垂直 ---------- */
  var mkU = [1, 0], mkV = [0, -1]
  S.push({
    tag: '第二招 | 看位置',
    beats: [
      { sub: '两条线放在一起，会碰到吗？', say: '两条线放在一起，会碰到吗？', rate: '-6%' },
      { sub: '像铁轨：方向一样，延长多远也碰不到，叫平行。', say: '像铁轨：方向一样，延长多远也碰不到，这叫平行。' },
      { sub: '交在一个点上，叫相交。', say: '交在一个点上，叫相交。' },
      { sub: '交出一个小板凳（直角），叫垂直，垂直也是相交！', say: '交出小板凳，叫垂直，也是相交！', pause: 0.6 }
    ],
    els: [
      svg(160, 250, 480, 220, L(80, 60, 400, 60) + L(80, 160, 400, 160), [0, '两条线'], { anim: 'pop', glow: [1, '铁轨'] }),
      svg(100, 250, 140, 220, E(120, 60, 10, 60) + E(120, 160, 10, 160), [1, '延长']),
      svg(560, 250, 140, 220, E(20, 60, 130, 60) + E(20, 160, 130, 160), [1, '延长']),
      lbl(400, 560, '平行', BLUE, [1, '叫平行'], { size: 60 }),
      svg(820, 250, 280, 220, L(30, 30, 250, 190) + L(30, 190, 250, 30) + D(140, 110, RED), [2, '交在'], { anim: 'pop', glow: [2, '一个点'] }),
      lbl(960, 560, '相交', ORANGE, [2, '叫相交'], { size: 60 }),
      svg(1380, 250, 280, 220, L(20, 110, 260, 110) + L(140, 10, 140, 210) + MK(140, 110, mkU, mkV, 30), [3, '小板凳'], { anim: 'pop', glow: [3, '叫垂直'] }),
      lbl(1520, 560, '垂直', RED, [3, '叫垂直'], { size: 60 }),
      lbl(1520, 640, '（也是相交）', RED, [3, '也是相交'], { size: 42 })
    ]
  })

  /* ---------- 8 第二招：判断流程 ---------- */
  S.push({
    tag: '第二招 | 怎么看',
    beats: [
      { sub: '第二招：看位置。先看碰到了没有。', say: '第二招：看位置。先看碰到了没有。' },
      { sub: '碰到了：有小板凳是垂直，没有就是相交。', say: '碰到了：有小板凳是垂直，没有就是相交。' },
      { sub: '没碰到，延长看看：碰不到是平行，碰得到能相交。', say: '没碰到，延长看看：碰不到是平行，碰得到能相交。', pause: 0.6 }
    ],
    els: [
      node(960, 170, 340, '碰到了吗？', INK, [0, '碰到了没有'], { size: 46 }),
      line2(860, 212, 520, 330, [1, '碰到了']),
      lbl(620, 250, '碰到了', GREY, [1, '碰到了'], { size: 38 }),
      node(520, 375, 340, '有小板凳吗？', ORANGE, [1, '碰到了'], { size: 42 }),
      line2(520, 418, 330, 540, [1, '是垂直']),
      line2(520, 418, 710, 540, [1, '相交']),
      node(330, 585, 300, '有：垂直', RED, [1, '是垂直'], { size: 42 }),
      node(710, 585, 300, '没有：相交', ORANGE, [1, '相交'], { size: 42 }),
      line2(1060, 212, 1400, 330, [2, '没碰到']),
      lbl(1300, 250, '没碰到', GREY, [2, '没碰到'], { size: 38 }),
      node(1400, 375, 300, '延长看看', BLUE, [2, '延长'], { size: 42 }),
      line2(1400, 418, 1210, 540, [2, '平行']),
      line2(1400, 418, 1590, 540, [2, '碰得到']),
      node(1210, 585, 330, '碰不到：平行', BLUE, [2, '平行'], { size: 40 }),
      node(1590, 585, 330, '碰得到：能相交', ORANGE, [2, '碰得到'], { size: 40 })
    ]
  })

  /* ---------- 9 第二招 · 例题：平行和垂直 ---------- */
  var CX9 = [330, 645, 960, 1275, 1590], CY9 = 380
  var s45 = Math.SQRT1_2
  var items9 = [
    L(25, 55, 195, 55) + L(25, 115, 195, 115),                                     /* ① 平行 */
    L(40, 30, 180, 140) + L(40, 140, 180, 30),                                     /* ② 斜着交叉 */
    L(20, 95, 200, 95) + L(110, 10, 110, 160) + MK(110, 95, [1, 0], [0, -1], 22),  /* ③ 垂直 */
    L(20, 40, 180, 72) + L(20, 140, 180, 100),                                     /* ④ 越来越近 */
    L(40, 140, 120, 20) + L(100, 150, 180, 30)                                     /* ⑤ 斜着的平行 */
  ]
  var glow9 = [[1, '一号'], [2, '二号'], [2, '三号'], [3, '四号'], [1, '五号']]
  var els9 = []
  items9.forEach(function (h, i) {
    els9.push(cell(CX9[i], CY9, h, [0, 0.3 + 0.15 * i], { glow: glow9[i] }))
    els9.push(num(CX9[i], CY9 + 130, i, [0, 0.3 + 0.15 * i]))
  })
  S.push({
    tag: '第二招 | 例题',
    beats: [
      { sub: '哪些是平行的？哪些是垂直的？', say: '哪些是平行的？哪些是垂直的？', rate: '-6%' },
      { sub: '① 和 ⑤ 方向一样，碰不到，是平行。', say: '一号和五号，方向一样，碰不到，是平行。' },
      { sub: '③ 有小板凳，是垂直；② 只是相交。', say: '三号有小板凳，是垂直；二号只是相交。' },
      { sub: '小心 ④：没碰到，可越来越近，延长会碰上，不平行！', say: '小心四号：没碰到，可越来越近，延长会碰上，不是平行！', pause: 1 }
    ],
    els: els9.concat([
      lbl(CX9[0], 650, '平行', BLUE, [1, '是平行'], { size: 48 }),
      lbl(CX9[4], 650, '平行', BLUE, [1, '是平行'], { size: 48 }),
      lbl(CX9[2], 650, '垂直', RED, [2, '是垂直'], { size: 48 }),
      lbl(CX9[1], 650, '相交', ORANGE, [2, '只是相交'], { size: 48 }),
      /* ④ 延长：(20,40)→(180,72) 和 (20,140)→(180,100)，在 x = 270 碰上（y = 90） */
      svg(CX9[3] - 110 + 180, CY9 - 85 + 60, 120, 60, E(0, 12, 62, 24) + E(0, 40, 62, 24) + O(62, 24), [3, '延长会']),
      lbl(CX9[3], 650, '不平行', GREY, [3, '不是平行'], { size: 48 }),
      { t: 'stamp', x: 960, y: 800, s: '平行 ①⑤　垂直 ③', color: RED, size: 60, rot: -3, at: [3, '不是平行', 0.6] }
    ])
  })

  /* ---------- 11 你来试 2：哪一组能相交 ---------- */
  S.push({
    tag: '第二招 | 你来试',
    beats: [
      { sub: '你来试：哪一组能相交？', say: '你来试：哪一组能相交？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: 'B！直线能延长，碰到了线段；A、C 都碰不到。', say: 'B！直线能延长，碰到了线段；A和C都碰不到。', pause: 1 }
    ],
    els: [
      /* A：两条线段错开 */
      lbl(300, 200, 'A', INK, [0, 0.2], { size: 52, font: 'num' }),
      svg(170, 260, 260, 300, L(30, 60, 150, 140) + D(30, 60) + D(150, 140) + L(230, 120, 230, 280) + D(230, 120) + D(230, 280), [0, 0.2], { anim: 'pop' }),
      cross(300, 640, [2, 'A和C']),
      cross(1100, 640, [2, '碰不到']),
      /* B：直线 + 线段，直线往右下延长碰到竖线段 */
      lbl(700, 200, 'B', INK, [0, 0.4], { size: 52, font: 'num' }),
      svg(530, 260, 340, 300, L(0, 27, 160, 130) + L(280, 100, 280, 280) + D(280, 100) + D(280, 280), [0, 0.4], { anim: 'pop', glow: [2, 'B'] }),
      svg(530, 260, 340, 300, E(160, 130, 280, 207) + O(280, 207), [2, '延长']),
      /* C：射线背对线段（有点那头朝着线段） */
      lbl(1100, 200, 'C', INK, [0, 0.6], { size: 52, font: 'num' }),
      svg(930, 260, 340, 300, L(40, 60, 170, 150) + D(170, 150) + L(260, 140, 260, 290) + D(260, 140) + D(260, 290), [0, 0.6], { anim: 'pop' }),
      { t: 'slot', id: 'q11', x: 1580, y: 380, size: 200, at: [0, '哪一组'] },
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q11' },
      fill('q11', [2, 'B'], 'B')
    ]
  })

  /* ---------- 12 第三招：3 条平行线 ---------- */
  var HY = [300, 420, 540]
  function pairArc(x, y1, y2, at, color) {
    var h = y2 - y1, w = 40 + h * 0.35
    return svg(x, y1 - 6, w + 20, h + 12, '<path class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M4 6 Q' + (w * 2) + ' ' + (h / 2 + 6) + ' 4 ' + (h + 6) + '" fill="none" stroke="' + (color || RED) + '" stroke-width="6" stroke-linecap="round"/>', at, { draw: true, dur: 0.5 })
  }
  S.push({
    tag: '第三招 | 编号数',
    beats: [
      { sub: '两条平行线算一组。3 条有几组？1 组？2 组？', say: '两条平行线算一组。三条有几组？一组？两组？', pitch: '+5Hz' },
      { sub: '第三招：编号数。先标上 1、2、3。', say: '第三招：编号数。先标上一、二、三。' },
      { sub: '打枪法：1 和 2、1 和 3，再 2 和 3。', say: '打枪法：一和二、一和三，再二和三。' },
      { sub: '2 + 1 = **3** 组！隔开的 1 和 3 也算。', say: '二加一，等于三组！隔开的一和三也算。', pause: 1 }
    ],
    els: [
      svg(420, HY[0] - 20, 700, 40, L(20, 20, 680, 20, { draw: true }), [0, '三条', 0], { draw: true, dur: 0.5 }),
      svg(420, HY[1] - 20, 700, 40, L(20, 20, 680, 20, { draw: true }), [0, '三条', 0.2], { draw: true, dur: 0.5 }),
      svg(420, HY[2] - 20, 700, 40, L(20, 20, 680, 20, { draw: true }), [0, '三条', 0.4], { draw: true, dur: 0.5 }),
      lbl(1380, 420, '1 组？2 组？', ORANGE, [0, '一组'], { size: 54, out: [1, 0] }),
      lbl(370, HY[0], '1', RED, [1, '一、'], { size: 56, font: 'num', glow: [2, '一和二'] }),
      lbl(370, HY[1], '2', RED, [1, '二、'], { size: 56, font: 'num', glow: [2, '再二'] }),
      lbl(370, HY[2], '3', RED, [1, '三。'], { size: 56, font: 'num', glow: [2, '一和三'] }),
      pairArc(1140, HY[0], HY[1], [2, '一和二'], RED),
      pairArc(1140, HY[1], HY[2], [2, '再二'], BLUE),
      pairArc(1140, HY[0], HY[2], [2, '一和三'], ORANGE),
      lbl(1520, 300, '1 和 2', RED, [2, '一和二'], { size: 48 }),
      lbl(1520, 380, '1 和 3', ORANGE, [2, '一和三'], { size: 48 }),
      lbl(1520, 460, '2 和 3', BLUE, [2, '再二'], { size: 48 }),
      { t: 'stamp', x: 960, y: 720, s: '2 + 1 = 3 组', color: RED, size: 64, rot: -4, at: [3, '三组'] }
    ]
  })

  /* ---------- 13 第三招：4 条 + 一条斜线 ---------- */
  var HY4 = [240, 360, 480, 600]
  var els13 = []
  HY4.forEach(function (y, i) {
    els13.push(svg(380, y - 20, 640, 40, L(20, 20, 620, 20), [0, 0.15 * i], { anim: 'pop' }))
    els13.push(lbl(340, y, String(i + 1), RED, [0, 0.15 * i], { size: 52, font: 'num' }))
  })
  S.push({
    tag: '第三招 | 4 条呢',
    beats: [
      { sub: '4 条：1 和 2、3、4；2 和 3、4；3 和 4。', say: '四条：一和二、三、四；二和三、四；三和四。' },
      { sub: '3 + 2 + 1 = **6** 组！', say: '三加二加一，等于六组！', pause: 0.6 },
      { sub: '小心：斜着的线和横线不平行，别配进去。', say: '小心：斜着的线和横线不平行，别配进去。', pause: 0.6 }
    ],
    els: els13.concat([
      svg(560, 160, 300, 540, L(40, 520, 260, 20), [0, 0.6], { anim: 'pop', glow: [2, '斜着'] }),
      lbl(1450, 260, '1 和 2、1 和 3、1 和 4', RED, [0, '一和二'], { size: 46 }),
      lbl(1450, 350, '2 和 3、2 和 4', BLUE, [0, '二和三'], { size: 46 }),
      lbl(1450, 440, '3 和 4', ORANGE, [0, '三和四'], { size: 46 }),
      lbl(1450, 530, '3 + 2 + 1 = 6', INK, [1, '三加二'], { size: 52, font: 'num' }),
      { t: 'stamp', x: 1450, y: 640, s: '6 组', color: RED, size: 64, rot: -4, at: [1, '六组'] },
      cross(860, 180, [2, '不平行'])
    ])
  })

  /* ---------- 14 你来试 3：三角形里 3 组 ---------- */
  /* 顶点 (700,170)，底边 y = 640，从 420 到 980；横线 y = 340、490、640 */
  function triX(y) { return 280 * (y - 170) / 470 }
  var triH = ''
  ;[340, 490, 640].forEach(function (y) { triH += L(700 - triX(y) - 400, y - 150, 700 + triX(y) - 400, y - 150) })
  S.push({
    tag: '第三招 | 你来试',
    beats: [
      { sub: '你来试：三角形里，有几组平行线？', say: '你来试：三角形里，有几组平行线？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '横着 3 条：2 + 1 = **3** 组；斜边不平行。', say: '横着三条：二加一，等于三组；斜边不平行。', pause: 1 }
    ],
    els: [
      svg(400, 150, 600, 520, L(300, 20, 20, 490) + L(300, 20, 580, 490) + triH, [0, '三角形'], { anim: 'pop' }),
      lbl(560, 340, '1', RED, [2, '横着'], { size: 50, font: 'num' }),
      lbl(470, 490, '2', RED, [2, '横着', 0.2], { size: 50, font: 'num' }),
      lbl(380, 640, '3', RED, [2, '横着', 0.4], { size: 50, font: 'num' }),
      { t: 'slot', id: 'q14', x: 1500, y: 380, size: 200, at: [0, '几组'] },
      lbl(1500, 525, '组', GREY, [0, '几组'], { size: 48 }),
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q14' },
      fill('q14', [2, '三组'], '3')
    ]
  })

  /* ---------- 15 挑战：横 3 竖 2 ---------- */
  var GY = [280, 400, 520], GX = [560, 860]
  var g = []
  GY.forEach(function (y, i) {
    g.push(svg(330, y - 20, 760, 40, L(20, 20, 740, 20), [0, '横的', 0.15 * i], { anim: 'pop' }))
    g.push(lbl(300, y, String(i + 1), RED, [2, '横的'], { size: 50, font: 'num' }))
  })
  GX.forEach(function (x, i) {
    g.push(svg(x - 20, 180, 40, 440, L(20, 20, 20, 420), [0, '竖的', 0.15 * i], { anim: 'pop' }))
    g.push(lbl(x, 150, String(i + 4), BLUE, [2, '竖的'], { size: 50, font: 'num' }))
  })
  S.push({
    tag: '挑战 | 这次用哪一招？',
    beats: [
      { sub: '挑战：横的 3 条，竖的 2 条，一共有几组平行线？', say: '挑战：横的三条，竖的两条，一共有几组平行线？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', rate: '-6%', pause: 5 },
      { sub: '第三招！横的 3 组，竖的 1 组：3 + 1 = **4** 组！', say: '第三招！横的三组，竖的一组，三加一，等于四组！', pause: 1 }
    ],
    els: g.concat([
      { t: 'slot', id: 'q15', x: 1560, y: 380, size: 200, at: [0, '几组'] },
      lbl(1560, 525, '组', GREY, [0, '几组'], { size: 48 }),
      { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q15' },
      lbl(700, 660, '横：2 + 1 = 3　竖：1', INK, [2, '横的三组'], { size: 46 }),
      fill('q15', [2, '四组'], '4')
    ])
  })

  /* ---------- 16 口诀 ---------- */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住口诀：', say: '记住口诀：' },
      { sub: '没有端点是直线，一个端点是射线，两个端点是线段；', say: '没有端点是直线，一个端点是射线，两个端点是线段；', rate: '-10%' },
      { sub: '永远碰不到是平行，交成小板凳是垂直；', say: '永远碰不到是平行，交成小板凳是垂直；', rate: '-10%' },
      { sub: '直线射线能延长，线段到头不能长；', say: '直线射线能延长，线段到头不能长；', rate: '-10%' },
      { sub: '数平行线先编号，两条一组按顺序。', say: '数平行线先编号，两条一组按顺序。', rate: '-10%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 470, w: 1640, h: 600, at: 0 },
      { t: 'chant', x: 960, y: 290, s: '没有端点是直线，一个端点是射线，两个端点是线段；', color: BLUE, size: 46, at: 1 },
      { t: 'chant', x: 960, y: 410, s: '永远碰不到是平行，交成小板凳是垂直；', color: RED, size: 50, at: 2 },
      { t: 'chant', x: 960, y: 530, s: '直线射线能延长，线段到头不能长；', color: ORANGE, size: 50, at: 3 },
      { t: 'chant', x: 960, y: 650, s: '数平行线先编号，两条一组按顺序。', color: GREEN, size: 50, at: 4 }
    ]
  })

  /* ---------- 17 结尾 ---------- */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天学会了三招：看端点、看位置、编号数。', say: '今天学会了三招！' },
      { sub: '想一想：5 条平行线，有几组？', say: '想一想：五条平行线，有几组？', rate: '-6%', pause: 1.5 },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: mapEls(0, true).concat([
      { t: 'check', x: MX[0] + 196, y: 590, at: 0, sfx: false },
      { t: 'check', x: MX[1] + 196, y: 590, at: 0, sfx: false },
      { t: 'check', x: MX[2] + 196, y: 590, at: 0, sfx: false },
      lbl(960, 760, '5 条平行线：几组？', RED, [1, '想一想'], { size: 52, out: [2, 0] }),
      { t: 'tape', x: 960, y: 790, s: '去练习纸上试试吧！', size: 50, at: [2, '练习纸'] }
    ])
  })

  function mapScene(n) {
    var e = mapEls(0, true)
    var moves = e.slice(-3)
    var sits = e.slice(4, 7)
    moves.forEach(function (m, k) {
      m.glow = undefined
      if (k === n - 1) { m.at = [0, '学会']; m.glow = [0, '学会', 0.3] }
      if (k >= n) { m.dim = 0; sits[k].dim = 0 }
    })
    for (var k = 0; k < n; k++) e.push({ t: 'check', x: MX[k] + 196, y: 590, at: k === n - 1 ? [0, '学会', 0.3] : 0, sfx: k === n - 1 ? undefined : false })
    var say = ['第一招学会了！还有两招。', '第二招也学会了！还剩最后一招。', '三招都学会了！来个挑战！'][n - 1]
    return { tag: '认识线 | 学到哪了', beats: [{ sub: say, say: say, pitch: '+5Hz', pause: 0.4 }], els: e }
  }
  /* 0 开场 1 引入 2 地图 3 三种线 4 流程 5 例题 6 你来试1 | 7 位置 8 流程 9 例题 10 你来试2 | 11 三条 12 四条 13 你来试3 | 14 挑战 15 口诀 16 结尾 */
  S.splice(14, 0, mapScene(3))
  S.splice(11, 0, mapScene(2))
  S.splice(7, 0, mapScene(1))

  /* 封面 */
  S.cover = {
    tag: null,
    els: [
      { t: 'txt', x: 960, y: 130, s: '奥数 · L1 补充 · B11 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
      { t: 'tape', x: 960, y: 270, s: '线角初步：认识线', size: 110, at: 0 },
      { t: 'txt', x: 960, y: 410, s: '没有端点是直线，一个端点是射线', size: 54, color: RED, font: 'kl', at: 0 },
      svg(360, 520, 1200, 40, E(10, 20, 150, 20) + L(170, 20, 1030, 20) + E(1050, 20, 1190, 20), 0),
      svg(360, 620, 1200, 40, L(30, 20, 1030, 20) + D(30, 20) + E(1050, 20, 1190, 20), 0),
      svg(360, 720, 1200, 40, L(30, 20, 1170, 20) + D(30, 20) + D(1170, 20), 0),
      { t: 'txt', x: 960, y: 900, s: '看端点 · 看位置 · 编号数', size: 50, color: GREEN, font: 'kl', at: 0 }
    ]
  }
  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
