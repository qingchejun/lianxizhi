/* B13 平面图形：认识三角形 · 讲解视频分镜 v1（L1 补充第十三课，新结构，三招）
 * 开场直接进题（不提上一课、结尾不预告）。
 * 引入：三根小棒头尾相接围成三角形 —— 三条边、三个角、三个顶点；三根一样长、两根一样长、都不一样，围出来一样吗？
 * 知识地图：按边分 → ① 数一样长的边；按角分 → ② 看最大的角；两样一起 → ③ 边和角一起看。
 * 第一招：不等边 / 等腰 / 等边；流程（有一样的数吗）+ 小心「等边也是等腰」；例题；你来试（只能看数）。
 * 第二招：冲突「边上没有数了」→ 看角（B12 学过）；只看最大的角；小心「有一个锐角不算」；钉子板例题；你来试（斜着的直角）。
 * 第三招：等腰直角；判断对错（巅峰题）；你来试：选点连直角三角形。
 * 挑战：钉子板上的等腰钝角三角形。口诀 → 知识地图 → 拓展：等边三角形会是直角三角形吗？→ 去练习纸。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420', WOOD = '#b9783f'
  var CIRC = ['①', '②', '③', '④', '⑤', '⑥']

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
  function line2(x1, y1, x2, y2, at) { return { t: 'seg', x1: x1, y1: y1, x2: x2, y2: y2, color: GREY, sw: 5, at: at } }
  function cross(x, y, at, o) {
    var html = '<path class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M14 14 L106 106 M106 14 L14 106" fill="none" stroke="' + RED + '" stroke-width="11" stroke-linecap="round"/>'
    return svg(x - 60, y - 60, 120, 120, html, at, { draw: true, dur: 0.5, out: (o || {}).out })
  }

  /* ---------- 三角形的零件（局部坐标） ---------- */
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]] }
  function unit(v) { var l = Math.hypot(v[0], v[1]); return [v[0] / l, v[1] / l] }
  function f(x) { return Math.round(x * 10) / 10 }
  function polyHTML(P, o) {
    o = o || {}
    var h = ''
    if (o.fill) h += '<path d="M' + P.map(function (p) { return f(p[0]) + ' ' + f(p[1]) }).join(' L') + ' Z" fill="' + o.fill + '" fill-opacity="0.35"/>'
    for (var i = 0; i < 3; i++) {
      var a = P[i], b = P[(i + 1) % 3]
      var c = (o.sideCol && o.sideCol[i]) || INK
      h += '<path ' + (o.draw ? 'class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" ' : '') + 'd="M' + f(a[0]) + ' ' + f(a[1]) + ' L' + f(b[0]) + ' ' + f(b[1]) + '" stroke="' + c + '" stroke-width="' + (o.sw || 10) + '" stroke-linecap="round" fill="none"/>'
    }
    return h
  }
  /* 顶点 i 的直角小板凳 */
  function mkHTML(P, i, k) {
    k = k || 26
    var V = P[i], u = unit(sub(P[(i + 1) % 3], V)), v = unit(sub(P[(i + 2) % 3], V))
    var p1 = [V[0] + u[0] * k, V[1] + u[1] * k], p2 = [p1[0] + v[0] * k, p1[1] + v[1] * k], p3 = [V[0] + v[0] * k, V[1] + v[1] * k]
    return '<path d="M' + f(p1[0]) + ' ' + f(p1[1]) + ' L' + f(p2[0]) + ' ' + f(p2[1]) + ' L' + f(p3[0]) + ' ' + f(p3[1]) + '" stroke="' + RED + '" stroke-width="6" fill="none"/>'
  }
  /* 顶点 i 的角弧线 */
  function arcHTML(P, i, color, r) {
    r = r || 40
    var V = P[i], u = unit(sub(P[(i + 1) % 3], V)), v = unit(sub(P[(i + 2) % 3], V))
    var p1 = [V[0] + u[0] * r, V[1] + u[1] * r], p2 = [V[0] + v[0] * r, V[1] + v[1] * r]
    var z = u[0] * v[1] - u[1] * v[0]
    return '<path d="M' + f(p1[0]) + ' ' + f(p1[1]) + ' A' + r + ' ' + r + ' 0 0 ' + (z > 0 ? 1 : 0) + ' ' + f(p2[0]) + ' ' + f(p2[1]) + '" stroke="' + color + '" stroke-width="8" fill="none" stroke-linecap="round"/>'
  }
  /* 按三条边长画：lens = [AB, BC, CA]，AB 横放在下面，k 像素/单位 */
  function bySides(lens, k) {
    var c = lens[0], a = lens[1], b = lens[2]
    var x = (b * b + c * c - a * a) / (2 * c), y = -Math.sqrt(Math.max(0, b * b - x * x))
    return [[0, 0], [c * k, 0], [x * k, y * k]]
  }
  /* 一个三角形元素：P 是任意坐标的三个点，外留 pad；o.lens 在边外写数 */
  function tri(cx, cy, P, at, o) {
    o = o || {}
    var pad = o.pad || 60
    var xs = P.map(function (p) { return p[0] }), ys = P.map(function (p) { return p[1] })
    var x0 = Math.min.apply(null, xs) - pad, y0 = Math.min.apply(null, ys) - pad
    var w = Math.max.apply(null, xs) - x0 + pad, h = Math.max.apply(null, ys) - y0 + pad
    var Q = P.map(function (p) { return [p[0] - x0, p[1] - y0] })
    var html = polyHTML(Q, o)
    if (o.mark !== undefined) html += mkHTML(Q, o.mark)
    ;(o.arcs || []).forEach(function (a) { html += arcHTML(Q, a[0], a[1], a[2]) })
    if (o.lens) {
      var gx = (Q[0][0] + Q[1][0] + Q[2][0]) / 3, gy = (Q[0][1] + Q[1][1] + Q[2][1]) / 3
      for (var i = 0; i < 3; i++) {
        var a = Q[i], b = Q[(i + 1) % 3], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
        var n = unit([b[1] - a[1], -(b[0] - a[0])])
        if (n[0] * (mx - gx) + n[1] * (my - gy) < 0) n = [-n[0], -n[1]]
        var col = (o.lenCol && o.lenCol[i]) || INK
        html += '<text x="' + f(mx + n[0] * 34) + '" y="' + f(my + n[1] * 34 + 16) + '" font-family="Num" font-size="46" text-anchor="middle" fill="' + col + '">' + o.lens[i] + '</text>'
      }
    }
    if (o.dots) Q.forEach(function (p) { html += '<circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="11" fill="' + RED + '"/>' })
    var ox = o.anchor === 'base' ? cx - (Q[0][0] + Q[1][0]) / 2 : cx - w / 2
    var oy = o.anchor === 'base' ? cy - Q[0][1] : cy - h / 2
    return svg(ox, oy, w, h, html, at, { anim: o.draw ? undefined : 'pop', draw: o.draw, dur: 0.8, glow: o.glow, glow2: o.glow2, dim: o.dim, out: o.out })
  }
  /* 标了边长的三角形，以 (cx, cy) 为中心 */
  function sideTri(cx, cy, lens, k, at, o) {
    o = o || {}
    o.lens = lens
    return tri(cx, cy, bySides(lens, k), at, o)
  }
  /* 钉子板：cols×rows 个钉子，间距 sp；T 是格点三角形；o.mark/arcs/sideCol 同上；o.extra(格点→像素) 追加 html */
  function board(cx, cy, cols, rows, sp, T, at, o) {
    o = o || {}
    var pad = 40, w = (cols - 1) * sp + pad * 2, h = (rows - 1) * sp + pad * 2
    function px(q) { return [pad + q[0] * sp, pad + q[1] * sp] }
    var html = ''
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) html += '<circle cx="' + (pad + x * sp) + '" cy="' + (pad + y * sp) + '" r="6" fill="' + GREY + '"/>'
    if (o.extra) html += o.extra(px)
    if (T) {
      var P = T.map(px)
      html += polyHTML(P, o)
      if (o.mark !== undefined) html += mkHTML(P, o.mark, 22)
      ;(o.arcs || []).forEach(function (a) { html += arcHTML(P, a[0], a[1], a[2] || 30) })
    }
    if (o.after) html += o.after(px)
    return svg(cx - w / 2, cy - h / 2, w, h, html, at, { anim: 'pop', glow: o.glow, glow2: o.glow2, dim: o.dim, out: o.out })
  }
  function num(cx, y, i, at) { return lbl(cx, y, CIRC[i], INK, at, { size: 50, font: 'num' }) }
  /* 本子的角（直角），直角顶点放在 (vx, vy)，两条边方向 u、v（屏幕向量） */
  function book(vx, vy, u, v, at, o) {
    o = o || {}
    var s = 200, pad = 10
    u = unit(u); v = unit(v)
    var V = [0, 0], p1 = [u[0] * s, u[1] * s], p3 = [v[0] * s, v[1] * s], p2 = [p1[0] + p3[0], p1[1] + p3[1]]
    var pts = [V, p1, p2, p3]
    var x0 = Math.min.apply(null, pts.map(function (p) { return p[0] })) - pad, y0 = Math.min.apply(null, pts.map(function (p) { return p[1] })) - pad
    var w = Math.max.apply(null, pts.map(function (p) { return p[0] })) - x0 + pad, h = Math.max.apply(null, pts.map(function (p) { return p[1] })) - y0 + pad
    var html = '<path d="M' + pts.map(function (p) { return f(p[0] - x0) + ' ' + f(p[1] - y0) }).join(' L') + ' Z" fill="#f7e08a" fill-opacity="0.55" stroke="' + ORANGE + '" stroke-width="4" stroke-dasharray="10 8"/>'
    return svg(vx + x0, vy + y0, w, h, html, at, { anim: 'fade', out: o.out })
  }

  var S = []

  /* ---------- 0 开场 ---------- */
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '今天，我们来认识三角形！', say: '今天，我们来认识三角形！' }
    ],
    els: [
      { t: 'txt', x: 960, y: 200, s: '奥数 · L1 补充 · B13', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
      { t: 'tape', x: 960, y: 330, s: '平面图形：认识三角形', size: 96, at: [0, 0.2] },
      lbl(960, 560, '等腰 · 等边 · 锐角 · 直角 · 钝角三角形', GREY, [1, '三角形'], { size: 52 })
    ]
  })

  /* ---------- 1 引入：三根小棒 ---------- */
  function stick(p, q, color) {
    return '<path class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M' + p[0] + ' ' + p[1] + ' L' + q[0] + ' ' + q[1] + '" stroke="' + (color || WOOD) + '" stroke-width="18" stroke-linecap="round" fill="none"/>'
  }
  function sticksTri(P, cols) { return stick(P[0], P[1], cols && cols[0]) + stick(P[1], P[2], cols && cols[1]) + stick(P[2], P[0], cols && cols[2]) }
  var BIG = [[60, 400], [560, 400], [210, 60]]
  var bigHTML = sticksTri(BIG)
  var corner = BIG.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="15" fill="' + RED + '"/>' }).join('')
  var angArcs = arcHTML(BIG, 0, ORANGE, 56) + arcHTML(BIG, 1, ORANGE, 56) + arcHTML(BIG, 2, ORANGE, 56)
  function smallTri(cx, lens, cols, at) {
    var P = bySides(lens, 46)
    var minx = Math.min(0, P[2][0]), maxx = Math.max(P[1][0], P[2][0]), offx = 160 - (minx + maxx) / 2
    var Q = P.map(function (p) { return [f(p[0] + offx), f(p[1] + 260)] })
    return svg(cx - 160, 330, 320, 300, sticksTri(Q, cols), at, { draw: true, dur: 0.8 })
  }
  S.push({
    tag: '先想一想',
    beats: [
      { sub: '拿三根小棒，头尾相接，就围成一个三角形。', say: '拿三根小棒，头尾相接，就围成一个三角形。' },
      { sub: '它有三条边、三个角、三个顶点。', say: '它有三条边、三个角、三个顶点。' },
      { sub: '小棒长短不一样，围出来的三角形一样吗？', say: '小棒长短不一样，围出来的三角形，一样吗？', rate: '-6%', pitch: '+5Hz', pause: 0.6 }
    ],
    els: [
      svg(160, 260, 620, 460, bigHTML, [0, '三根小棒'], { draw: true, dur: 1.4 }),
      lbl(470, 790, '三角形', INK, [0, '三角形'], { size: 56 }),
      lbl(220, 400, '边', BLUE, [1, '三条边'], { size: 50 }),
      lbl(640, 400, '边', BLUE, [1, '三条边', 0.2], { size: 50 }),
      lbl(470, 705, '边', BLUE, [1, '三条边', 0.4], { size: 50 }),
      svg(160, 260, 620, 460, angArcs, [1, '三个角'], { anim: 'fade', glow: [1, '三个角'] }),
      svg(160, 260, 620, 460, corner, [1, '顶点'], { anim: 'pop', glow: [1, '顶点'] }),
      smallTri(1080, [5, 5, 5], [RED, RED, RED], [2, '长短']),
      smallTri(1400, [5, 6, 6], [INK, RED, RED], [2, '长短', 0.4]),
      smallTri(1720, [6, 4, 5], [INK, BLUE, GREEN], [2, '长短', 0.8]),
      lbl(1400, 280, '一样吗？', ORANGE, [2, '一样吗'], { size: 60 })
    ]
  })

  /* ---------- 2 知识地图 ---------- */
  var MX = [420, 960, 1500]
  function mapEls(at, lit) {
    return [
      node(960, 210, 340, '认识三角形', INK, at, { size: 50 }),
      line2(960, 252, MX[0], 360, lit ? at : [0, '按边分']),
      line2(960, 252, MX[1], 360, lit ? at : [0, '按角分']),
      line2(960, 252, MX[2], 360, lit ? at : [0, '一起看']),
      node(MX[0], 405, 420, '按边分', BLUE, lit ? at : [0, '按边分'], { size: 44 }),
      node(MX[1], 405, 420, '按角分', RED, lit ? at : [0, '按角分'], { size: 44 }),
      node(MX[2], 405, 420, '边和角一起问', GREEN, lit ? at : [0, '一起看'], { size: 44 }),
      flowArrow(MX[0], 452, 540, lit ? at : [1, '每种', 0.2]),
      flowArrow(MX[1], 452, 540, lit ? at : [1, '每种', 0.6]),
      flowArrow(MX[2], 452, 540, lit ? at : [1, '每种', 1.0]),
      node(MX[0], 595, 400, '① 数一样长的边', BLUE, lit ? at : [1, '每种', 0.2], { size: 40, glow: lit ? [0, '三招', 0.4] : undefined }),
      node(MX[1], 595, 400, '② 看最大的角', RED, lit ? at : [1, '每种', 0.6], { size: 40, glow: lit ? [0, '三招', 0.8] : undefined }),
      node(MX[2], 595, 400, '③ 先看边再看角', GREEN, lit ? at : [1, '每种', 1.0], { size: 40, glow: lit ? [0, '三招', 1.2] : undefined })
    ]
  }
  S.push({
    tag: '认识三角形 | 三种题',
    beats: [
      { sub: '三角形可以按边分，按角分，还能两样一起看。', say: '三角形可以按边分，按角分，还能两样一起看。' },
      { sub: '每种一招，一招一招来学！', say: '每种一招，一招一招来学！' }
    ],
    els: mapEls(0, false)
  })

  /* ---------- 3 第一招：不等边 / 等腰 / 等边 ---------- */
  var TX3 = [400, 960, 1520], TY3 = 640
  S.push({
    tag: '第一招 | 数一样长的边',
    beats: [
      { sub: '第一招：数一样长的边。', say: '第一招：数一样长的边。' },
      { sub: '三条边都不一样长，叫不等边三角形；', say: '三条边都不一样长，叫不等边三角形；' },
      { sub: '两条边一样长，叫等腰三角形；', say: '两条边一样长，叫等腰三角形；' },
      { sub: '三条边都一样长，叫等边三角形。', say: '三条边都一样长，叫等边三角形。', pause: 0.6 }
    ],
    els: [
      sideTri(TX3[0], TY3 - 120, [6, 4, 5], 52, [1, '都不一样'], { anchor: 'base' }),
      lbl(TX3[0], TY3 + 100, '不等边三角形', INK, [1, '叫不等边'], { size: 50 }),
      sideTri(TX3[1], TY3 - 120, [4, 5, 5], 52, [2, '两条边'], { anchor: 'base', lenCol: [INK, RED, RED], sideCol: [INK, RED, RED], glow: [2, '一样长'] }),
      lbl(TX3[1], TY3 + 100, '等腰三角形', RED, [2, '叫等腰'], { size: 50 }),
      sideTri(TX3[2], TY3 - 120, [5, 5, 5], 52, [3, '三条边'], { anchor: 'base', lenCol: [BLUE, BLUE, BLUE], sideCol: [BLUE, BLUE, BLUE], glow: [3, '一样长'] }),
      lbl(TX3[2], TY3 + 100, '等边三角形', BLUE, [3, '叫等边'], { size: 50 })
    ]
  })

  /* ---------- 4 第一招：判断流程 + 小心 ---------- */
  S.push({
    tag: '第一招 | 怎么分',
    beats: [
      { sub: '看三个数，有一样的吗？没有，是不等边。', say: '看三个数，有一样的吗？没有，是不等边。' },
      { sub: '两个一样，是等腰；三个都一样，是等边。', say: '两个一样，是等腰；三个都一样，是等边。' },
      { sub: '小心：等边三角形三条边都相等，也是等腰！', say: '小心：等边三角形，三条边都相等，也是等腰！', pitch: '+5Hz', pause: 0.8 }
    ],
    els: [
      node(960, 170, 420, '有一样的数吗？', INK, [0, '有一样'], { size: 44 }),
      line2(860, 212, 420, 340, [0, '没有']),
      line2(960, 212, 960, 340, [1, '两个一样']),
      line2(1060, 212, 1500, 340, [1, '三个都一样']),
      node(420, 385, 340, '没有：不等边', GREY, [0, '没有'], { size: 42 }),
      node(960, 385, 340, '两个：等腰', RED, [1, '两个一样'], { size: 42, glow: [2, '也是等腰'] }),
      node(1500, 385, 340, '三个：等边', BLUE, [1, '三个都一样'], { size: 42, glow: [2, '等边三角形'] }),
      svg(1080, 330, 320, 110, '<path class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M300 70 Q160 -20 20 70" fill="none" stroke="' + ORANGE + '" stroke-width="8" stroke-linecap="round"/><path d="M20 70 L52 66 M20 70 L36 42" stroke="' + ORANGE + '" stroke-width="8" stroke-linecap="round"/>', [2, '也是'], { draw: true, dur: 0.6 }),
      lbl(1240, 300, '也是', ORANGE, [2, '也是'], { size: 44 }),
      sideTri(960, 760, [5, 5, 5], 46, [2, '三条边'], { anchor: 'base', lenCol: [BLUE, RED, RED], sideCol: [BLUE, RED, RED], glow: [2, '相等'] })
    ]
  })

  /* ---------- 5 第一招 · 例题 ---------- */
  var CX5 = [330, 750, 1170, 1590], BY5 = 520
  var L5 = [[3, 5, 5], [6, 7, 4], [6, 6, 6], [8, 7, 7]]
  var els5 = []
  L5.forEach(function (L, i) {
    els5.push(sideTri(CX5[i], BY5, L, 40, [0, 0.3 + 0.15 * i], { anchor: 'base', glow: [[1, '一号'], undefined, [2, '三号'], [1, '四号']][i], dim: i === 1 ? [2, '算等腰'] : undefined }))
    els5.push(num(CX5[i], BY5 + 90, i, [0, 0.3 + 0.15 * i]))
  })
  S.push({
    tag: '第一招 | 例题',
    beats: [
      { sub: '哪些是等腰三角形？', say: '哪些是等腰三角形？', rate: '-6%' },
      { sub: '① 3、5、5，④ 8、7、7，都有两条一样长。', say: '一号三、五、五，四号八、七、七，都有两条一样长。' },
      { sub: '③ 6、6、6，三条都一样，也算等腰！', say: '三号六、六、六，三条都一样，也算等腰！', pitch: '+5Hz', pause: 1.2 }
    ],
    els: els5.concat([
      cross(CX5[1], BY5 - 100, [2, '算等腰', 0.2]),
      { t: 'stamp', x: 960, y: 790, s: '等腰：①③④', color: RED, size: 64, rot: -3, at: [2, '算等腰', 0.5] }
    ])
  })

  /* ---------- 6 你来试 1：只能看数 ---------- */
  var CX6 = [330, 700, 1070], BY6 = 520
  var L6 = [[7, 6, 6], [7, 7, 7], [6, 7, 7]]
  var els6 = []
  L6.forEach(function (L, i) {
    els6.push(sideTri(CX6[i], BY6, L, 36, [0, 0.3 + 0.15 * i], { anchor: 'base', glow: i === 1 ? [2, '二号'] : undefined }))
    els6.push(num(CX6[i], BY6 + 90, i, [0, 0.3 + 0.15 * i]))
  })
  S.push({
    tag: '第一招 | 你来试',
    beats: [
      { sub: '你来试：哪个是等边三角形？', say: '你来试：哪个是等边三角形？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '②！7、7、7，三条都一样。只能看数，别看样子。', say: '二号！七、七、七，三条都一样。只能看数，别看样子。', pause: 1 }
    ],
    els: els6.concat([
      { t: 'slot', id: 'q6', x: 1560, y: 420, size: 200, at: [0, '哪个'] },
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q6' },
      fill('q6', [2, '二号'], '②')
    ])
  })

  /* ---------- 8 第二招：冲突 → 看角 ---------- */
  var T8 = [[[0, 3], [4, 3], [2, 0]], [[0, 3], [3, 3], [0, 0]], [[0, 3], [4, 3], [1, 2]]]
  var BX8 = [400, 960, 1520], BY8 = 420
  S.push({
    tag: '第二招 | 看角',
    beats: [
      { sub: '这些三角形，边上没有数了，怎么分？', say: '这些三角形，边上没有数了，怎么分？', pitch: '+5Hz' },
      { sub: '看角！锐角、直角、钝角，B12 学过。', say: '看角！锐角、直角、钝角，我们学过。' },
      { sub: '有直角叫直角三角形，有钝角叫钝角三角形；', say: '有直角，叫直角三角形；有钝角，叫钝角三角形；' },
      { sub: '三个角都是锐角，才叫锐角三角形。', say: '三个角都是锐角，才叫锐角三角形。', pause: 0.6 }
    ],
    els: [
      board(BX8[1], BY8, 5, 4, 70, T8[1], [0, 0.2], { mark: 0, glow: [2, '有直角'] }),
      board(BX8[2], BY8, 5, 4, 70, T8[2], [0, 0.4], { arcs: [[2, ORANGE, 34]], glow: [2, '有钝角'] }),
      board(BX8[0], BY8, 5, 4, 70, T8[0], [0, 0.6], { arcs: [[0, BLUE], [1, BLUE], [2, BLUE]], glow: [3, '锐角'] }),
      lbl(BX8[1], 690, '直角三角形', RED, [2, '叫直角'], { size: 50 }),
      lbl(BX8[2], 690, '钝角三角形', ORANGE, [2, '叫钝角'], { size: 50 }),
      lbl(BX8[0], 690, '锐角三角形', BLUE, [3, '才叫'], { size: 50 })
    ]
  })

  /* ---------- 9 第二招：看最大的角 ---------- */
  var P9 = [[0, 330], [760, 330], [210, 70]]
  S.push({
    tag: '第二招 | 看最大的角',
    beats: [
      { sub: '第二招：看最大的角。三角形都有锐角，', say: '第二招：看最大的角。三角形都有锐角，' },
      { sub: '只看最大的那个角，和直角比一比：', say: '只看最大的那个角，和直角比一比：' },
      { sub: '一样大是直角三角形，大是钝角，小是锐角三角形。', say: '一样大，是直角三角形；大，是钝角；小，是锐角三角形。', pause: 0.8 }
    ],
    els: [
      tri(500, 600, P9, [0, 0.2], { arcs: [[0, BLUE, 70], [1, BLUE, 90]], glow: [0, '都有锐角'] }),
      tri(500, 600, P9, [1, '最大'], { arcs: [[2, ORANGE, 46]], glow: [1, '最大的'], anim: 'fade' }),
      lbl(230, 790, '锐角', BLUE, [0, '都有锐角'], { size: 42 }),
      lbl(760, 790, '锐角', BLUE, [0, '都有锐角'], { size: 42 }),
      lbl(360, 400, '最大的角', ORANGE, [1, '最大的'], { size: 42 }),
      node(1390, 220, 380, '最大的角和直角比', INK, [1, '比一比'], { size: 40 }),
      line2(1300, 262, 1040, 380, [2, '一样大']), line2(1390, 262, 1390, 380, [2, '大，']), line2(1480, 262, 1740, 380, [2, '小，']),
      node(1040, 425, 300, '一样：直角', RED, [2, '一样大'], { size: 40 }),
      node(1390, 425, 300, '大：钝角', ORANGE, [2, '大，'], { size: 40, glow: [2, '大，'] }),
      node(1740, 425, 260, '小：锐角', BLUE, [2, '小，'], { size: 40 }),
      lbl(1390, 640, '有一个锐角 ≠ 锐角三角形', RED, [2, '小，', 0.8], { size: 48 })
    ]
  })

  /* ---------- 10 第二招 · 例题（钉子板） ---------- */
  var T10 = [[[0, 0], [0, 3], [3, 3]], [[0, 3], [4, 3], [3, 2]], [[0, 3], [3, 3], [1, 0]], [[0, 1], [2, 3], [4, 1]]]
  var CX10 = [300, 740, 1180, 1620], CY10 = 400
  var els10 = []
  T10.forEach(function (T, i) {
    els10.push(board(CX10[i], CY10, 5, 4, 56, T, [0, 0.3 + 0.15 * i], { glow: [[1, '一号'], [2, '二号'], [2, '三号'], [1, '四号']][i] }))
    els10.push(num(CX10[i], CY10 + 150, i, [0, 0.3 + 0.15 * i]))
  })
  S.push({
    tag: '第二招 | 例题',
    beats: [
      { sub: '哪些是锐角、直角、钝角三角形？', say: '哪些是锐角、直角、钝角三角形？', rate: '-6%' },
      { sub: '①④ 最大的角是直角：直角三角形；', say: '一号、四号，最大的角是直角：直角三角形；' },
      { sub: '② 最大的角比直角大：钝角；③ 也比直角小：锐角。', say: '二号最大的角比直角大，是钝角；三号也比直角小，是锐角。', pause: 1 }
    ],
    els: els10.concat([
      lbl(CX10[0], 650, '直角', RED, [1, '直角三角形'], { size: 46 }), lbl(CX10[3], 650, '直角', RED, [1, '直角三角形'], { size: 46 }),
      lbl(CX10[1], 650, '钝角', ORANGE, [2, '是钝角'], { size: 46 }), lbl(CX10[2], 650, '锐角', BLUE, [2, '是锐角'], { size: 46 }),
      { t: 'stamp', x: 960, y: 790, s: '锐角 ③　直角 ①④　钝角 ②', color: RED, size: 54, rot: -3, at: [2, '是锐角', 0.4] }
    ])
  })

  /* ---------- 11 你来试 2：斜着的直角 ---------- */
  var T11 = [[0, 2], [2, 0], [4, 2]]
  S.push({
    tag: '第二招 | 你来试',
    beats: [
      { sub: '你来试：这是什么三角形？', say: '你来试：这是什么三角形？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '本子角斜过来一比，最大的角正好是直角：直角三角形！', say: '本子角斜过来一比，最大的角正好是直角：直角三角形！', pause: 1 }
    ],
    els: [
      board(560, 440, 5, 4, 90, T11, [0, '什么三角形'], {}),
      book(560, 305, [-1, 1], [1, 1], [2, '本子角']),
      board(560, 440, 5, 4, 90, T11, [2, '正好'], { mark: 1, glow: [2, '直角三角形'] }),
      { t: 'slot', id: 'q11', x: 1500, y: 420, size: 200, at: [0, '什么三角形'] },
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q11' },
      fill('q11', [2, '直角三角形'], '<span style="font-size:58%">直角</span>')
    ]
  })

  /* ---------- 13 第三招：边和角一起看 ---------- */
  var T13b = [[0, 3], [3, 0], [3, 3]]
  S.push({
    tag: '第三招 | 边和角一起看',
    beats: [
      { sub: '这个三角形，两条边一样长，还有一个直角。叫什么？', say: '这个三角形，两条边一样长，还有一个直角。叫什么？', pitch: '+5Hz' },
      { sub: '第三招：边和角一起看。先看边：等腰；', say: '第三招：边和角一起看。先看边：等腰；' },
      { sub: '再看角：直角。合起来，叫等腰直角三角形！', say: '再看角：直角。合起来，叫等腰直角三角形！', pause: 0.8 }
    ],
    els: [
      board(480, 450, 5, 4, 90, T13b, [0, 0.2], { sideCol: [INK, BLUE, BLUE], mark: 2, glow: [0, '两条边'], glow2: [0, '直角'] }),
      node(1350, 200, 300, '先看边', BLUE, [1, '先看边'], { size: 44 }),
      lbl(1350, 300, '两条一样长 → 等腰', BLUE, [1, '等腰'], { size: 44 }),
      flowArrow(1350, 340, 400, [2, '再看角']),
      node(1350, 450, 300, '再看角', RED, [2, '再看角'], { size: 44 }),
      lbl(1350, 550, '有一个直角 → 直角', RED, [2, '直角。'], { size: 44 }),
      flowArrow(1350, 590, 650, [2, '合起来']),
      lbl(1350, 710, '等腰直角三角形', GREEN, [2, '叫等腰'], { size: 60, glow: [2, '叫等腰'] })
    ]
  })

  /* ---------- 14 第三招 · 判断对错 ---------- */
  S.push({
    tag: '第三招 | 判断对错',
    beats: [
      { sub: '判断：有一个锐角，就是锐角三角形？', say: '判断：有一个锐角，就是锐角三角形？', rate: '-6%' },
      { sub: '它有锐角，可最大的角是钝角。错！', say: '它有锐角，可最大的角是钝角。错！', pitch: '+5Hz' },
      { sub: '再判断：等边是等腰吗？对！三条边都相等。', say: '再判断：等边是等腰吗？对！三条边都相等。', pause: 0.8 }
    ],
    els: [
      lbl(480, 200, '有一个锐角 → 锐角三角形？', INK, [0, '判断'], { size: 44 }),
      tri(480, 470, [[0, 200], [520, 200], [120, 40]], [0, '有一个锐角'], { arcs: [[1, BLUE, 80]], glow: [1, '有锐角'] }),
      tri(480, 470, [[0, 200], [520, 200], [120, 40]], [1, '最大的角'], { arcs: [[2, ORANGE, 40]], glow: [1, '钝角'], anim: 'fade' }),
      { t: 'stamp', x: 480, y: 690, s: '错', color: RED, size: 90, rot: -6, at: [1, '错'] },
      lbl(1440, 200, '等边 → 等腰？', INK, [2, '再判断'], { size: 44 }),
      sideTri(1440, 560, [5, 5, 5], 46, [2, '等边'], { anchor: 'base', lenCol: [BLUE, RED, RED], sideCol: [BLUE, RED, RED], glow: [2, '都相等'] }),
      { t: 'stamp', x: 1440, y: 690, s: '对', color: GREEN, size: 90, rot: -6, at: [2, '对'] }
    ]
  })

  /* ---------- 15 你来试 3：选点连直角三角形 ---------- */
  var A15 = [1, 3], B15 = [4, 3], C15 = [[2, 1], [4, 1], [6, 1]]
  function cand(px, i, col) {
    var p = px(C15[i])
    return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="15" fill="#fffaf0" stroke="' + (col || INK) + '" stroke-width="5"/>' +
      '<text x="' + (p[0] + 34) + '" y="' + (p[1] - 18) + '" font-family="Num" font-size="44" text-anchor="middle" fill="' + INK + '">' + CIRC[i] + '</text>'
  }
  function abHTML(px) {
    var a = px(A15), b = px(B15)
    return '<path d="M' + a[0] + ' ' + a[1] + ' L' + b[0] + ' ' + b[1] + '" stroke="' + INK + '" stroke-width="10" stroke-linecap="round"/>' +
      '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="13" fill="' + INK + '"/><circle cx="' + b[0] + '" cy="' + b[1] + '" r="13" fill="' + INK + '"/>' +
      '<text x="' + (a[0] - 36) + '" y="' + (a[1] + 16) + '" font-family="Num" font-size="48" text-anchor="middle" fill="' + INK + '">A</text>' +
      '<text x="' + (b[0] + 36) + '" y="' + (b[1] + 50) + '" font-family="Num" font-size="48" text-anchor="middle" fill="' + INK + '">B</text>'
  }
  function legs(i, color, dash) {
    return function (px) {
      var a = px(A15), b = px(B15), c = px(C15[i])
      return '<path d="M' + a[0] + ' ' + a[1] + ' L' + c[0] + ' ' + c[1] + ' L' + b[0] + ' ' + b[1] + '" stroke="' + color + '" stroke-width="7" fill="none" stroke-linecap="round"' + (dash ? ' stroke-dasharray="14 12"' : '') + '/>'
    }
  }
  var SP15 = 100
  function board15(at, extra, o) {
    o = o || {}
    return board(560, 430, 7, 5, SP15, null, at, {
      extra: extra,
      after: function (px) { return abHTML(px) + cand(px, 0) + cand(px, 1, o.hit ? RED : null) + cand(px, 2) },
      glow: o.glow
    })
  }
  S.push({
    tag: '第三招 | 你来试',
    beats: [
      { sub: '你来试：哪个点和 A、B 连成直角三角形？', say: '你来试：哪个点和 A、B 连起来，是直角三角形？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '连一连：① 都是锐角，③ 有钝角，② 有直角！', say: '连一连：一号都是锐角，三号有钝角，二号有直角！', pause: 1 }
    ],
    els: [
      board15([0, '你来试']),
      board15([2, '连一连'], function (px) { return legs(0, BLUE, true)(px) + legs(2, ORANGE, true)(px) }),
      board15([2, '二号'], function (px) {
        var b = px(B15), c = px(C15[1]), a = px(A15)
        return legs(0, BLUE, true)(px) + legs(2, ORANGE, true)(px) + legs(1, RED)(px) +
          mkHTML([b, a, c], 0, 24)
      }, { hit: true, glow: [2, '有直角'] }),
      { t: 'slot', id: 'q15', x: 1560, y: 420, size: 200, at: [0, '哪个点'] },
      { t: 'think', x: 1250, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q15' },
      fill('q15', [2, '有直角'], '②')
    ]
  })

  /* ---------- 17 挑战：等腰钝角三角形 ---------- */
  var T17 = [[0, 3], [4, 3], [2, 2]]
  S.push({
    tag: '挑战 | 这次用哪一招？',
    beats: [
      { sub: '挑战：这是什么三角形？', say: '挑战：这是什么三角形？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', rate: '-6%', pause: 5 },
      { sub: '边和角一起看：两条边一样长，最大的角比直角大。', say: '边和角一起看：两条边一样长，最大的角比直角大。' },
      { sub: '它是等腰钝角三角形！', say: '它是，等腰钝角三角形！', pitch: '+5Hz', pause: 1 }
    ],
    els: [
      board(560, 440, 5, 4, 100, T17, [0, 0.2], {}),
      board(560, 440, 5, 4, 100, T17, [2, '两条边'], { sideCol: [INK, BLUE, BLUE], arcs: [[2, ORANGE, 34]], glow: [2, '两条边'], glow2: [2, '最大的角'] }),
      { t: 'slot', id: 'q17', x: 1500, y: 400, size: 220, at: [0, '什么三角形'] },
      { t: 'think', x: 1250, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q17' },
      fill('q17', [3, '等腰钝角'], '<span style="font-size:40%;line-height:1.1">等腰<br>钝角</span>')
    ]
  })

  /* ---------- 18 口诀 ---------- */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住口诀：三条边，三个角，围成一个三角形；', say: '记住口诀：三条边，三个角，围成一个三角形；', rate: '-10%' },
      { sub: '两边相等是等腰，三边相等是等边，等边也算是等腰；', say: '两边相等是等腰，三边相等是等边，等边也算是等腰；', rate: '-10%' },
      { sub: '看角先找最大的：直角就是直角的，钝角就是钝角的，', say: '看角先找最大的：直角就是直角的，钝角就是钝角的，', rate: '-10%' },
      { sub: '最大也是锐角，才是锐角的。', say: '最大也是锐角，才是锐角的。', rate: '-10%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 470, w: 1700, h: 560, at: 0 },
      { t: 'chant', x: 960, y: 290, s: '三条边，三个角，围成一个三角形；', color: INK, size: 50, at: [0, '三条边'] },
      { t: 'chant', x: 960, y: 410, s: '两边相等是等腰，三边相等是等边，等边也算是等腰；', color: BLUE, size: 46, at: 1 },
      { t: 'chant', x: 960, y: 530, s: '看角先找最大的：直角就是直角的，钝角就是钝角的，', color: RED, size: 46, at: 2 },
      { t: 'chant', x: 960, y: 650, s: '最大也是锐角，才是锐角的。', color: RED, size: 46, at: 3 }
    ]
  })

  /* ---------- 19 结尾 ---------- */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天学会了三招！', say: '今天学会了三招！' },
      { sub: '想一想：等边三角形，会是直角三角形吗？', say: '想一想：等边三角形，会是直角三角形吗？', rate: '-6%', pause: 1.5 },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: mapEls(0, true).concat([
      { t: 'check', x: MX[0] + 236, y: 590, at: 0, sfx: false },
      { t: 'check', x: MX[1] + 236, y: 590, at: 0, sfx: false },
      { t: 'check', x: MX[2] + 236, y: 590, at: 0, sfx: false },
      lbl(960, 760, '等边三角形，会是直角三角形吗？', RED, [1, '想一想'], { size: 50, out: [2, 0] }),
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
    for (var k = 0; k < n; k++) e.push({ t: 'check', x: MX[k] + 236, y: 590, at: k === n - 1 ? [0, '学会', 0.3] : 0, sfx: k === n - 1 ? undefined : false })
    var say = ['第一招学会了！还有两招。', '第二招也学会了！还剩最后一招。', '三招都学会了！来个挑战！'][n - 1]
    return { tag: '认识三角形 | 学到哪了', beats: [{ sub: say, say: say, pitch: '+5Hz', pause: 0.4 }], els: e }
  }
  /* 0 开场 1 引入 2 地图 3 第一招 4 流程 5 例题 6 你来试1 | 7 看角 8 最大的角 9 例题 10 你来试2 | 11 一起看 12 判断 13 你来试3 | 14 挑战 15 口诀 16 结尾 */
  S.splice(14, 0, mapScene(3))
  S.splice(11, 0, mapScene(2))
  S.splice(7, 0, mapScene(1))

  S.cover = {
    tag: null,
    els: [
      { t: 'txt', x: 960, y: 130, s: '奥数 · L1 补充 · B13 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
      { t: 'tape', x: 960, y: 270, s: '平面图形：认识三角形', size: 104, at: 0 },
      { t: 'txt', x: 960, y: 410, s: '两边相等是等腰，看角先找最大的', size: 54, color: RED, font: 'kl', at: 0 },
      sideTri(330, 770, [5, 5, 5], 44, 0, { anchor: 'base', lenCol: [BLUE, BLUE, BLUE], sideCol: [BLUE, BLUE, BLUE] }),
      lbl(330, 900, '等边', BLUE, 0, { size: 50 }),
      sideTri(760, 770, [4, 5, 5], 44, 0, { anchor: 'base', lenCol: [INK, RED, RED], sideCol: [INK, RED, RED] }),
      lbl(760, 900, '等腰', RED, 0, { size: 50 }),
      tri(1200, 700, [[0, 230], [230, 230], [0, 0]], 0, { mark: 0 }),
      lbl(1200, 900, '直角', RED, 0, { size: 50 }),
      tri(1610, 750, [[0, 150], [330, 150], [80, 40]], 0, {}),
      lbl(1610, 900, '钝角', ORANGE, 0, { size: 50 })
    ]
  }
  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
