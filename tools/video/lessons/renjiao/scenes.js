/* B12 线角初步：认识角 · 讲解视频分镜 v1（L1 补充第十二课，新结构，三招）
 * 开场直接进题（不提上一课、结尾不预告）。
 * 引入：剪刀张开、钟面 3 时 —— 从一个点张出的口子就是角。
 * 知识地图：是不是角 → ① 看顶点和边；什么角 → ② 和直角比；有几个角 → ③ 打枪法。
 * 第一招：顶点 + 两条直边；判断流程（交在一点吗 → 边直吗）；例题（没碰到、平行、弯边）；你来试。
 * 第二招：拿本子角比 —— 直角（小板凳）、锐角、钝角；流程 + 「看张口不看边长」；例题；你来试（斜放的钝角）。
 * 第三招：3 条边编号打枪 3 个角 → 4 条 6 个 → 你来试 5 条 10 个。
 * 挑战：3 条边数角并分类（锐、直、钝各 1）。口诀 → 知识地图 → 拓展：6 条边几个角？→ 去练习纸。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420'
  var CIRC = ['①', '②', '③', '④', '⑤', '⑥']
  var ARC = [RED, BLUE, ORANGE, GREEN, '#9b59b6', '#16a085']

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

  /* ---------- 角的零件 ---------- */
  function rad(a) { return a * Math.PI / 180 }
  function dir(a) { return [Math.cos(rad(a)), -Math.sin(rad(a))] }
  function P(V, a, L) { var d = dir(a); return [V[0] + d[0] * L, V[1] + d[1] * L] }
  function L(p, q, o) {
    o = o || {}
    return '<path ' + (o.draw ? 'class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" ' : '') + 'd="M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' L' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + '" stroke="' + (o.color || INK) + '" stroke-width="' + (o.sw || 10) + '" stroke-linecap="round" fill="none"/>'
  }
  function MK(V, a, b, k) {
    k = k || 26
    var p1 = P(V, a, k), p2 = P(p1, b, k), p3 = P(V, b, k)
    return '<path d="M' + p1.join(' ') + ' L' + p2.join(' ') + ' L' + p3.join(' ') + '" stroke="' + RED + '" stroke-width="6" fill="none"/>'
  }
  /* 一个角：屏幕上顶点 (vx, vy)，两边方向 a、a+deg，边长 l1、l2；外包一层 svg */
  function angle(vx, vy, a, deg, l1, l2, at, o) {
    o = o || {}
    var pad = 30, V = [0, 0], A = P(V, a, l1), B = P(V, a + deg, l2)
    var xs = [0, A[0], B[0]], ys = [0, A[1], B[1]]
    var x0 = Math.min.apply(null, xs) - pad, y0 = Math.min.apply(null, ys) - pad
    var w = Math.max.apply(null, xs) - x0 + pad, h = Math.max.apply(null, ys) - y0 + pad
    var Vl = [-x0, -y0], Al = [A[0] - x0, A[1] - y0], Bl = [B[0] - x0, B[1] - y0]
    var html = L(Vl, Al, { draw: o.draw }) + L(Vl, Bl, { draw: o.draw }) + (o.mark ? MK(Vl, a, a + deg) : '') + (o.dot ? '<circle cx="' + Vl[0] + '" cy="' + Vl[1] + '" r="12" fill="' + RED + '"/>' : '')
    return svg(vx + x0, vy + y0, w, h, html, at, { anim: o.draw ? undefined : 'pop', draw: o.draw, dur: 0.6, glow: o.glow, glow2: o.glow2, dim: o.dim, out: o.out })
  }
  /* 本子的角（直角）：浅黄色的纸角，直角顶点放在 (vx, vy)，一条边沿 a 方向 */
  function book(vx, vy, a, at, o) {
    o = o || {}
    var s = 230
    var V = [s * 0.15, s * 1.15]
    var p1 = P(V, a, s), p3 = P(V, a + 90, s), p2 = P(p1, a + 90, s)
    var html = '<path d="M' + V.join(' ') + ' L' + p1.join(' ') + ' L' + p2.join(' ') + ' L' + p3.join(' ') + ' Z" fill="#f7e08a" fill-opacity="0.55" stroke="' + ORANGE + '" stroke-width="4" stroke-dasharray="10 8"/>'
    return svg(vx - V[0], vy - V[1], s * 1.3, s * 1.3, html, at, { anim: 'fade', out: o.out })
  }
  /* 一个顶点引出好几条边 */
  function fan(vx, vy, angs, Lr, at, o) {
    o = o || {}
    var W = 2 * Lr + 80, H = Lr + 80, V = [Lr + 40, Lr + 40], h = ''
    angs.forEach(function (a, i) { h += L(V, P(V, a, Lr)) })
    if (o.marks) o.marks.forEach(function (i) { h += MK(V, angs[i], angs[i + 1], 30) })
    return svg(vx - V[0], vy - V[1], W, H, h, at, { anim: 'pop', glow: o.glow })
  }
  function rayNum(vx, vy, a, Lr, n, at, o) {
    var p = P([vx, vy], a, Lr + 38)
    return lbl(p[0], p[1], String(n), RED, at, { size: 50, font: 'num', glow: (o || {}).glow })
  }
  /* 两条边之间的小弧线（打枪法配对） */
  function arc(vx, vy, a1, a2, r, color, at) {
    var W = 2 * r + 20, H = r + 20, V = [r + 10, r + 10], p1 = P(V, a1, r), p2 = P(V, a2, r)
    var large = a2 - a1 > 180 ? 1 : 0
    var html = '<path class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + large + ' 0 ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) + '" fill="none" stroke="' + color + '" stroke-width="7" stroke-linecap="round"/>'
    return svg(vx - V[0], vy - V[1], W, H, html, at, { draw: true, dur: 0.5 })
  }
  function curveSide(V, a, Lr) {
    var u = dir(a), n = dir(a + 90), d = 'M' + V[0] + ' ' + V[1]
    for (var k = 1; k <= 20; k++) {
      var t = k / 20
      d += ' L' + (V[0] + u[0] * Lr * t + n[0] * 16 * Math.sin(t * 2 * Math.PI)).toFixed(1) + ' ' + (V[1] + u[1] * Lr * t + n[1] * 16 * Math.sin(t * 2 * Math.PI)).toFixed(1)
    }
    return '<path d="' + d + '" stroke="' + INK + '" stroke-width="10" stroke-linecap="round" fill="none"/>'
  }
  /* 编号格子 220×190，里面一个图（局部坐标） */
  function cell(cx, cy, inner, at, o) {
    o = o || {}
    return svg(cx - 110, cy - 95, 220, 190, inner, at, { anim: 'pop', glow: o.glow, glow2: o.glow2, dim: o.dim })
  }
  function num(cx, y, i, at) { return lbl(cx, y, CIRC[i], INK, at, { size: 50, font: 'num' }) }
  /* 格子里的图样 */
  function cAngle(a, deg, l1, l2, mark) {
    var V = [110 - 0.5 * (Math.cos(rad(a)) * l1 + Math.cos(rad(a + deg)) * l2), 95 + 0.5 * (Math.sin(rad(a)) * l1 + Math.sin(rad(a + deg)) * l2)]
    return L(V, P(V, a, l1)) + L(V, P(V, a + deg, l2)) + (mark ? MK(V, a, a + deg, 22) : '')
  }
  function cGap() { var V = [50, 150]; return L(V, [190, 150]) + L([92, 112], [165, 30]) }
  function cCurve() { var V = [40, 150]; return L(V, [190, 150]) + curveSide(V, 55, 150) }
  function cPar() { return L([30, 70], [190, 70]) + L([30, 130], [190, 130]) }

  var S = []

  /* ---------- 0 开场 ---------- */
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '今天，我们来认识角！', say: '今天，我们来认识角！' }
    ],
    els: [
      { t: 'txt', x: 960, y: 200, s: '奥数 · L1 补充 · B12', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
      { t: 'tape', x: 960, y: 330, s: '线角初步：认识角', size: 100, at: [0, 0.2] },
      lbl(960, 560, '顶点 · 边 · 锐角 · 直角 · 钝角', GREY, [1, '角'], { size: 54 })
    ]
  })

  /* ---------- 1 引入：剪刀、钟面 ---------- */
  var scis = '<circle cx="50" cy="90" r="34" fill="#fffaf0" stroke="' + RED + '" stroke-width="10"/><circle cx="50" cy="210" r="34" fill="#fffaf0" stroke="' + RED + '" stroke-width="10"/>' +
    '<path d="M78 108 L380 280" stroke="' + INK + '" stroke-width="16" stroke-linecap="round"/><path d="M78 192 L380 20" stroke="' + INK + '" stroke-width="16" stroke-linecap="round"/>' +
    '<circle cx="152" cy="150" r="11" fill="' + RED + '"/>'
  S.push({
    tag: '先想一想',
    beats: [
      { sub: '剪刀张开，两片刀刃从一个点出发，张出一个口子。', say: '剪刀张开，两片刀刃从一个点出发，张出一个口子。' },
      { sub: '钟面 3 时，两根针也从中间张出一个口子。', say: '钟面三时，两根针也从中间，张出一个口子。' },
      { sub: '这样的口子，就是角！', say: '这样的口子，就是角！', pitch: '+5Hz', pause: 0.5 }
    ],
    els: [
      svg(220, 260, 400, 300, scis, [0, '剪刀'], { anim: 'pop', glow: [0, '一个点'] }),
      svg(320, 290, 340, 240, '<path class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M115 80 Q150 120 115 160" fill="none" stroke="' + ORANGE + '" stroke-width="8"/>', [0, '口子'], { draw: true, dur: 0.5 }),
      { t: 'clock', x: 1350, y: 410, size: 360, time: [3, 0], at: [1, '钟面'] },
      svg(1350, 230, 200, 200, '<path class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M0 100 A80 80 0 0 1 80 180" fill="none" stroke="' + ORANGE + '" stroke-width="8"/>', [1, '口子'], { draw: true, dur: 0.5 }),
      lbl(960, 720, '角', RED, [2, '就是角'], { size: 90 })
    ]
  })

  /* ---------- 2 知识地图 ---------- */
  var MX = [420, 960, 1500]
  function mapEls(at, lit) {
    return [
      node(960, 210, 300, '认识角', INK, at, { size: 50 }),
      line2(960, 252, MX[0], 360, lit ? at : [0, '是不是角']),
      line2(960, 252, MX[1], 360, lit ? at : [0, '什么角']),
      line2(960, 252, MX[2], 360, lit ? at : [0, '几个角']),
      node(MX[0], 405, 420, '是不是角？', BLUE, lit ? at : [0, '是不是角'], { size: 44 }),
      node(MX[1], 405, 420, '是什么角？', RED, lit ? at : [0, '什么角'], { size: 44 }),
      node(MX[2], 405, 420, '有几个角？', GREEN, lit ? at : [0, '几个角'], { size: 44 }),
      flowArrow(MX[0], 452, 540, lit ? at : [1, '每种', 0.2]),
      flowArrow(MX[1], 452, 540, lit ? at : [1, '每种', 0.6]),
      flowArrow(MX[2], 452, 540, lit ? at : [1, '每种', 1.0]),
      node(MX[0], 595, 340, '① 看顶点和边', BLUE, lit ? at : [1, '每种', 0.2], { size: 42, glow: lit ? [0, '三招', 0.4] : undefined }),
      node(MX[1], 595, 340, '② 和直角比', RED, lit ? at : [1, '每种', 0.6], { size: 42, glow: lit ? [0, '三招', 0.8] : undefined }),
      node(MX[2], 595, 340, '③ 打枪法', GREEN, lit ? at : [1, '每种', 1.0], { size: 42, glow: lit ? [0, '三招', 1.2] : undefined })
    ]
  }
  S.push({
    tag: '认识角 | 三种题',
    beats: [
      { sub: '角的题有三种：是不是角？什么角？有几个角？', say: '角的题有三种：是不是角？是什么角？有几个角？' },
      { sub: '每种一招，一招一招来学！', say: '每种一招，一招一招来学！' }
    ],
    els: mapEls(0, false)
  })

  /* ---------- 3 第一招：顶点和边 ---------- */
  S.push({
    tag: '第一招 | 看顶点和边',
    beats: [
      { sub: '第一招：看顶点和边。角有一个顶点，', say: '第一招：看顶点和边。角有一个顶点，' },
      { sub: '从顶点引出两条直直的边。', say: '从顶点，引出两条直直的边。' },
      { sub: '朝哪边开口都行，倒着、斜着也是角。', say: '朝哪边开口都行，倒着、斜着，也是角。', pause: 0.5 }
    ],
    els: [
      svg(410, 560, 40, 40, '<circle cx="20" cy="20" r="14" fill="' + RED + '"/>', [0, '顶点'], { anim: 'pop', glow: [0, '一个顶点'] }),
      lbl(400, 640, '顶点', RED, [0, '一个顶点'], { size: 46 }),
      angle(430, 580, 0, 50, 380, 340, [1, '引出'], { draw: true }),
      lbl(720, 620, '边', BLUE, [1, '两条'], { size: 46 }),
      lbl(560, 320, '边', BLUE, [1, '两条', 0.3], { size: 46 }),
      angle(1150, 320, 200, 70, 170, 170, [2, '朝哪边'], {}),
      angle(1450, 560, 60, 90, 170, 170, [2, '倒着'], {}),
      angle(1650, 300, 250, 60, 170, 170, [2, '斜着'], {})
    ]
  })

  /* ---------- 4 第一招：判断流程 ---------- */
  S.push({
    tag: '第一招 | 怎么认',
    beats: [
      { sub: '先看：两条边交在一个点上吗？没碰到，不是角。', say: '先看：两条边交在一个点上吗？没碰到，不是角。' },
      { sub: '交上了，再看边：弯的不是角，直的才是角。', say: '交上了，再看边：弯的不是角，直的才是角。', pause: 0.6 }
    ],
    els: [
      node(960, 170, 380, '交在一个点上吗？', INK, [0, '交在'], { size: 44 }),
      line2(860, 212, 520, 330, [0, '没碰到']),
      lbl(620, 250, '没碰到', GREY, [0, '没碰到'], { size: 38 }),
      node(520, 375, 280, '不是角', ORANGE, [0, '不是角'], { size: 42 }),
      svg(420, 450, 220, 190, cGap(), [0, '没碰到'], { anim: 'pop' }),
      line2(1060, 212, 1400, 330, [1, '交上了']),
      lbl(1300, 250, '交上了', GREY, [1, '交上了'], { size: 38 }),
      node(1400, 375, 300, '边直不直？', BLUE, [1, '再看边'], { size: 42 }),
      line2(1400, 418, 1210, 540, [1, '弯的']),
      line2(1400, 418, 1590, 540, [1, '直的']),
      node(1210, 585, 260, '弯：不是角', ORANGE, [1, '弯的'], { size: 40 }),
      node(1590, 585, 260, '直：是角', GREEN, [1, '直的'], { size: 40 }),
      svg(1100, 640, 220, 190, cCurve(), [1, '弯的'], { anim: 'pop' }),
      svg(1480, 640, 220, 190, cAngle(0, 55, 160, 150), [1, '直的'], { anim: 'pop' })
    ]
  })

  /* ---------- 5 第一招 · 例题 ---------- */
  var CX5 = [310, 570, 830, 1090, 1350, 1610], CY5 = 390
  var it5 = [cAngle(0, 60, 150, 140), cGap(), cAngle(150, 70, 140, 140), cCurve(), cPar(), cAngle(200, 110, 120, 120)]
  var g5 = [[3, '一号'], [1, '二号'], [3, '三号'], [2, '四号'], [1, '五号'], [3, '六号']]
  var els5 = []
  it5.forEach(function (h, i) {
    els5.push(cell(CX5[i], CY5, h, [0, 0.3 + 0.15 * i], { glow: g5[i], dim: (i === 1 || i === 3 || i === 4) ? [2, '也不是', 0.5] : undefined }))
    els5.push(num(CX5[i], CY5 + 140, i, [0, 0.3 + 0.15 * i]))
  })
  S.push({
    tag: '第一招 | 例题',
    beats: [
      { sub: '哪些是角？', say: '下面哪些是角？', rate: '-6%' },
      { sub: '② 没碰到，⑤ 是平行线，没有顶点，不是角。', say: '二号没碰到，五号是平行线，没有顶点，不是角。' },
      { sub: '④ 有一条边是弯的，也不是。', say: '四号有一条边是弯的，也不是。' },
      { sub: '①、③、⑥：一个顶点、两条直边，是角！', say: '一号、三号、六号：一个顶点，两条直边，是角！', pause: 1 }
    ],
    els: els5.concat([
      cross(CX5[1], CY5, [1, '二号', 0.4]), cross(CX5[4], CY5, [1, '五号', 0.4]), cross(CX5[3], CY5, [2, '四号', 0.4]),
      { t: 'stamp', x: 960, y: 790, s: '是角：①③⑥', color: RED, size: 64, rot: -3, at: [3, '是角'] }
    ])
  })

  /* ---------- 6 你来试 1 ---------- */
  var CX6 = [300, 560, 820, 1080]
  var it6 = [cGap(), cCurve(), cAngle(110, 80, 140, 150), cPar()]
  var els6 = []
  it6.forEach(function (h, i) {
    els6.push(cell(CX6[i], 400, h, [0, 0.3 + 0.15 * i], { glow: i === 2 ? [2, '三号'] : undefined }))
    els6.push(num(CX6[i], 540, i, [0, 0.3 + 0.15 * i]))
  })
  S.push({
    tag: '第一招 | 你来试',
    beats: [
      { sub: '你来试：哪一个是角？', say: '你来试：哪一个是角？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '③！一个顶点，两条直直的边。', say: '三号！一个顶点，两条直直的边。', pause: 1 }
    ],
    els: els6.concat([
      { t: 'slot', id: 'q6', x: 1550, y: 420, size: 200, at: [0, '哪一个'] },
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q6' },
      fill('q6', [2, '三号'], '③')
    ])
  })

  /* ---------- 8 第二招：和直角比 ---------- */
  var AX = [380, 960, 1540], AY = 640
  S.push({
    tag: '第二招 | 和直角比',
    beats: [
      { sub: '角有大有小，怎么比呢？', say: '角有大有小，怎么比呢？', rate: '-6%' },
      { sub: '第二招：拿本子角来比。一样大叫直角，画小板凳。', say: '第二招：拿本子的角来比。一样大的，叫直角，画个小板凳。' },
      { sub: '比直角小的，叫锐角；', say: '比直角小的，叫锐角；' },
      { sub: '比直角大的，叫钝角。', say: '比直角大的，叫钝角。', pause: 0.6 }
    ],
    els: [
      angle(AX[0], AY, 0, 45, 300, 300, [0, '有大有小'], {}),
      angle(AX[1], AY, 0, 90, 300, 280, [0, '有大有小', 0.2], { mark: false }),
      angle(AX[2], AY, 0, 135, 280, 280, [0, '有大有小', 0.4], {}),
      book(AX[1], AY, 0, [1, '本子'], { out: [2, 0] }),
      svg(AX[1] - 10, AY - 50, 60, 60, MK([10, 50], 0, 90, 30), [1, '小板凳'], { anim: 'pop' }),
      lbl(AX[1] + 150, AY + 70, '直角', RED, [1, '叫直角'], { size: 56 }),
      book(AX[0], AY, 0, [2, '比直角小'], { out: [3, 0] }),
      lbl(AX[0] + 150, AY + 70, '锐角', BLUE, [2, '叫锐角'], { size: 56 }),
      book(AX[2], AY, 0, [3, '比直角大']),
      lbl(AX[2] + 60, AY + 70, '钝角', ORANGE, [3, '叫钝角'], { size: 56 })
    ]
  })

  /* ---------- 9 第二招：流程 + 看张口 ---------- */
  S.push({
    tag: '第二招 | 怎么比',
    beats: [
      { sub: '和直角比一比：一样是直角，小是锐角，大是钝角。', say: '和直角比一比：一样是直角，小是锐角，大是钝角。' },
      { sub: '小心：角的大小看张口，不看边画得长短！', say: '小心：角的大小看张口，不看边画得长短！', pause: 0.8 }
    ],
    els: [
      node(960, 170, 340, '和直角比', INK, [0, '比一比'], { size: 46 }),
      line2(960, 212, 500, 330, [0, '一样']), line2(960, 212, 960, 330, [0, '小是']), line2(960, 212, 1420, 330, [0, '大是']),
      node(500, 375, 300, '一样：直角', RED, [0, '一样'], { size: 42 }),
      node(960, 375, 300, '小：锐角', BLUE, [0, '小是'], { size: 42 }),
      node(1420, 375, 300, '大：钝角', ORANGE, [0, '大是'], { size: 42 }),
      angle(560, 780, 0, 40, 120, 110, [1, '大小'], { glow: [1, '张口'] }),
      angle(1100, 780, 0, 40, 420, 400, [1, '大小', 0.2], { glow: [1, '张口'] }),
      lbl(960, 560, '一样大！', GREEN, [1, '不看'], { size: 56 })
    ]
  })

  /* ---------- 10 第二招 · 例题 ---------- */
  var CX10 = [330, 645, 960, 1275, 1590], CY10 = 390
  var it10 = [cAngle(0, 45, 150, 140), cAngle(0, 130, 120, 130), cAngle(90, 90, 140, 140), cAngle(20, 35, 170, 170), cAngle(0, 90, 140, 140)]
  var g10 = [[2, '一号'], [2, '二号'], [1, '三号'], [2, '四号'], [1, '五号']]
  var els10 = []
  it10.forEach(function (h, i) {
    els10.push(cell(CX10[i], CY10, h, [0, 0.3 + 0.15 * i], { glow: g10[i] }))
    els10.push(num(CX10[i], CY10 + 140, i, [0, 0.3 + 0.15 * i]))
  })
  S.push({
    tag: '第二招 | 例题',
    beats: [
      { sub: '哪些是锐角、直角、钝角？', say: '哪些是锐角、直角、钝角？', rate: '-6%' },
      { sub: '③ 和 ⑤ 和本子角一样大，是直角；', say: '三号和五号，和本子角一样大，是直角；' },
      { sub: '① 和 ④ 比直角小，是锐角；② 比直角大，是钝角。', say: '一号和四号比直角小，是锐角；二号比直角大，是钝角。', pause: 1 }
    ],
    els: els10.concat([
      lbl(CX10[2], 680, '直角', RED, [1, '是直角'], { size: 48 }), lbl(CX10[4], 680, '直角', RED, [1, '是直角'], { size: 48 }),
      lbl(CX10[0], 680, '锐角', BLUE, [2, '是锐角'], { size: 48 }), lbl(CX10[3], 680, '锐角', BLUE, [2, '是锐角'], { size: 48 }),
      lbl(CX10[1], 680, '钝角', ORANGE, [2, '是钝角'], { size: 48 }),
      { t: 'stamp', x: 960, y: 810, s: '锐角 ①④　直角 ③⑤　钝角 ②', color: RED, size: 54, rot: -3, at: [2, '是钝角', 0.6] }
    ])
  })

  /* ---------- 11 你来试 2：斜放的钝角 ---------- */
  S.push({
    tag: '第二招 | 你来试',
    beats: [
      { sub: '你来试：这是什么角？', say: '你来试：这是什么角？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '拿本子角一比，它比直角大，是钝角！', say: '拿本子角一比，它比直角大，是钝角！', pause: 1 }
    ],
    els: [
      angle(560, 560, 30, 120, 300, 260, [0, '什么角'], {}),
      book(560, 560, 30, [2, '本子角']),
      { t: 'slot', id: 'q11', x: 1500, y: 420, size: 200, at: [0, '什么角'] },
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q11' },
      fill('q11', [2, '钝角'], '<span style="font-size:58%">钝角</span>')
    ]
  })

  /* ---------- 12 第三招：3 条边 ---------- */
  var FV = [560, 700], FL = 420
  var A3 = [0, 45, 100]
  S.push({
    tag: '第三招 | 打枪法',
    beats: [
      { sub: '一个点引出好几条边，有几个角？2 个？', say: '一个点引出好几条边，有几个角？两个？', pitch: '+5Hz' },
      { sub: '第三招：打枪法。先给边标上 1、2、3。', say: '第三招：打枪法。先给边标上一、二、三。' },
      { sub: '1 和 2、1 和 3，再 2 和 3。', say: '一和二、一和三，再二和三。' },
      { sub: '2 + 1 = **3** 个角！1 和 3 这个大角最容易漏。', say: '二加一，等于三个角！一和三这个大角，最容易漏。', pause: 1 }
    ],
    els: [
      fan(FV[0], FV[1], A3, FL, [0, 0.2]),
      lbl(1400, 400, '2 个？', ORANGE, [0, '两个'], { size: 60, out: [1, 0] }),
      rayNum(FV[0], FV[1], A3[0], FL, 1, [1, '一、']),
      rayNum(FV[0], FV[1], A3[1], FL, 2, [1, '二、']),
      rayNum(FV[0], FV[1], A3[2], FL, 3, [1, '三。']),
      arc(FV[0], FV[1], A3[0], A3[1], 140, RED, [2, '一和二']),
      arc(FV[0], FV[1], A3[0], A3[2], 240, ORANGE, [2, '一和三']),
      arc(FV[0], FV[1], A3[1], A3[2], 190, BLUE, [2, '再二']),
      lbl(1450, 330, '1 和 2', RED, [2, '一和二'], { size: 50 }),
      lbl(1450, 420, '1 和 3', ORANGE, [2, '一和三'], { size: 50, glow: [3, '大角'] }),
      lbl(1450, 510, '2 和 3', BLUE, [2, '再二'], { size: 50 }),
      { t: 'stamp', x: 1450, y: 660, s: '2 + 1 = 3 个', color: RED, size: 60, rot: -4, at: [3, '三个角'] }
    ]
  })

  /* ---------- 13 第三招：4 条边 ---------- */
  var A4 = [0, 35, 75, 120]
  S.push({
    tag: '第三招 | 4 条边呢',
    beats: [
      { sub: '4 条边：1 和 2、3、4；2 和 3、4；3 和 4。', say: '四条边：一和二、三、四；二和三、四；三和四。' },
      { sub: '3 + 2 + 1 = **6** 个角！', say: '三加二加一，等于六个角！', pause: 1 }
    ],
    els: [
      fan(FV[0], FV[1], A4, FL, [0, 0]),
      rayNum(FV[0], FV[1], A4[0], FL, 1, [0, 0]), rayNum(FV[0], FV[1], A4[1], FL, 2, [0, 0]),
      rayNum(FV[0], FV[1], A4[2], FL, 3, [0, 0]), rayNum(FV[0], FV[1], A4[3], FL, 4, [0, 0]),
      lbl(1450, 300, '1 和 2、1 和 3、1 和 4', RED, [0, '一和二'], { size: 46 }),
      lbl(1450, 390, '2 和 3、2 和 4', BLUE, [0, '二和三'], { size: 46 }),
      lbl(1450, 480, '3 和 4', ORANGE, [0, '三和四'], { size: 46 }),
      lbl(1450, 580, '3 + 2 + 1 = 6', INK, [1, '三加二'], { size: 54, font: 'num' }),
      { t: 'stamp', x: 1450, y: 690, s: '6 个角', color: RED, size: 60, rot: -4, at: [1, '六个角'] }
    ]
  })

  /* ---------- 14 你来试 3：5 条边 ---------- */
  var A5 = [0, 30, 60, 95, 130]
  S.push({
    tag: '第三招 | 你来试',
    beats: [
      { sub: '你来试：5 条边，一共有几个角？', say: '你来试：五条边，一共有几个角？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '4 + 3 + 2 + 1 = **10** 个角！', say: '四加三加二加一，等于十个角！', pause: 1 }
    ],
    els: [
      fan(FV[0], FV[1], A5, FL, [0, '五条边']),
      rayNum(FV[0], FV[1], A5[0], FL, 1, [2, '四加']), rayNum(FV[0], FV[1], A5[1], FL, 2, [2, '四加', 0.1]),
      rayNum(FV[0], FV[1], A5[2], FL, 3, [2, '四加', 0.2]), rayNum(FV[0], FV[1], A5[3], FL, 4, [2, '四加', 0.3]),
      rayNum(FV[0], FV[1], A5[4], FL, 5, [2, '四加', 0.4]),
      { t: 'slot', id: 'q14', x: 1500, y: 420, size: 200, at: [0, '几个角'] },
      lbl(1500, 565, '个', GREY, [0, '几个角'], { size: 48 }),
      { t: 'think', x: 1250, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q14' },
      fill('q14', [2, '十个角'], '10')
    ]
  })

  /* ---------- 16 挑战：数角并分类 ---------- */
  var AC = [0, 40, 130]
  S.push({
    tag: '挑战 | 这次用哪一招？',
    beats: [
      { sub: '挑战：一共几个角？各是什么角？', say: '挑战：一共几个角？各是什么角？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', rate: '-6%', pause: 5 },
      { sub: '打枪法：1 和 2 锐角，2 和 3 直角，1 和 3 钝角。', say: '打枪法：一和二是锐角，二和三是直角，一和三是钝角。' },
      { sub: '一共 **3** 个角：锐角、直角、钝角各 1 个！', say: '一共三个角：锐角、直角、钝角，各一个！', pause: 1 }
    ],
    els: [
      fan(FV[0], FV[1], AC, FL, [0, 0.2], { marks: [1] }),
      rayNum(FV[0], FV[1], AC[0], FL, 1, [2, '打枪法']), rayNum(FV[0], FV[1], AC[1], FL, 2, [2, '打枪法', 0.1]), rayNum(FV[0], FV[1], AC[2], FL, 3, [2, '打枪法', 0.2]),
      arc(FV[0], FV[1], AC[0], AC[1], 120, BLUE, [2, '一和二']),
      arc(FV[0], FV[1], AC[1], AC[2], 200, RED, [2, '二和三']),
      arc(FV[0], FV[1], AC[0], AC[2], 280, ORANGE, [2, '一和三']),
      { t: 'slot', id: 'q16', x: 1550, y: 380, size: 200, at: [0, '几个角'] },
      lbl(1550, 525, '个', GREY, [0, '几个角'], { size: 48 }),
      { t: 'think', x: 1250, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q16' },
      lbl(1550, 640, '锐 1　直 1　钝 1', INK, [3, '各一个'], { size: 48 }),
      fill('q16', [3, '三个角'], '3')
    ]
  })

  /* ---------- 17 口诀 ---------- */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住口诀：', say: '记住口诀：' },
      { sub: '一个顶点两条边，直直的边才是角；', say: '一个顶点两条边，直直的边才是角；', rate: '-10%' },
      { sub: '小板凳是直角，比它小的是锐角，比它大的是钝角；', say: '小板凳是直角，比它小的是锐角，比它大的是钝角；', rate: '-10%' },
      { sub: '数角先给边编号，打枪配对不重不漏。', say: '数角先给边编号，打枪配对不重不漏。', rate: '-10%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 470, w: 1640, h: 520, at: 0 },
      { t: 'chant', x: 960, y: 330, s: '一个顶点两条边，直直的边才是角；', color: BLUE, size: 52, at: 1 },
      { t: 'chant', x: 960, y: 470, s: '小板凳是直角，比它小的是锐角，比它大的是钝角；', color: RED, size: 48, at: 2 },
      { t: 'chant', x: 960, y: 610, s: '数角先给边编号，打枪配对不重不漏。', color: GREEN, size: 52, at: 3 }
    ]
  })

  /* ---------- 18 结尾 ---------- */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天学会了三招：看顶点和边、和直角比、打枪法。', say: '今天学会了三招！' },
      { sub: '想一想：一个点引出 6 条边，有几个角？', say: '想一想：一个点引出六条边，有几个角？', rate: '-6%', pause: 1.5 },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: mapEls(0, true).concat([
      { t: 'check', x: MX[0] + 216, y: 590, at: 0, sfx: false },
      { t: 'check', x: MX[1] + 216, y: 590, at: 0, sfx: false },
      { t: 'check', x: MX[2] + 216, y: 590, at: 0, sfx: false },
      lbl(960, 760, '6 条边：几个角？', RED, [1, '想一想'], { size: 52, out: [2, 0] }),
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
    for (var k = 0; k < n; k++) e.push({ t: 'check', x: MX[k] + 216, y: 590, at: k === n - 1 ? [0, '学会', 0.3] : 0, sfx: k === n - 1 ? undefined : false })
    var say = ['第一招学会了！还有两招。', '第二招也学会了！还剩最后一招。', '三招都学会了！来个挑战！'][n - 1]
    return { tag: '认识角 | 学到哪了', beats: [{ sub: say, say: say, pitch: '+5Hz', pause: 0.4 }], els: e }
  }
  /* 0 开场 1 引入 2 地图 3 顶点和边 4 流程 5 例题 6 你来试1 | 7 和直角比 8 流程 9 例题 10 你来试2 | 11 三条 12 四条 13 你来试3 | 14 挑战 15 口诀 16 结尾 */
  S.splice(14, 0, mapScene(3))
  S.splice(11, 0, mapScene(2))
  S.splice(7, 0, mapScene(1))

  S.cover = {
    tag: null,
    els: [
      { t: 'txt', x: 960, y: 130, s: '奥数 · L1 补充 · B12 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
      { t: 'tape', x: 960, y: 270, s: '线角初步：认识角', size: 110, at: 0 },
      { t: 'txt', x: 960, y: 410, s: '一个顶点两条边，直直的边才是角', size: 54, color: RED, font: 'kl', at: 0 },
      angle(380, 800, 0, 45, 300, 300, 0, {}), lbl(560, 870, '锐角', BLUE, 0, { size: 52 }),
      angle(860, 800, 0, 90, 300, 280, 0, { mark: true }), lbl(1040, 870, '直角', RED, 0, { size: 52 }),
      angle(1460, 800, 0, 135, 280, 280, 0, {}), lbl(1560, 870, '钝角', ORANGE, 0, { size: 52 })
    ]
  }
  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
