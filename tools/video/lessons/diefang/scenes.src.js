/* B07 叠加覆盖：叠放顺序 · 讲解视频分镜 v1（L1 补充第七课，新结构，两招）
 * 开场直接进题（不提上一课、结尾不预告）。
 * 引入：三张纸片叠在一起，哪张在最上面？完整的三角形在最上面，被挡住两块的圆在最下面。
 * 知识地图：排从上到下 · 取铅笔游戏 → ① 一层层揭；摆一摆 · 拿几张 → ② 倒着想。
 * 第一招：4 个图形排从上到下（③②①④），找完整的 → 拿走 → 再找；小心：最大的六边形在最上面。
 *        你来试：3 个图形（②③①）。取铅笔游戏：D、E、F 被迫取走，A、B、C 压成一圈，轮到天天，小明赢。
 * 第二招：摆成图 1 先摆哪个（先排从上到下 ②④③①，倒过来 ①③④②）；至少拿几张拿到 ★ 纸（往上推：1、2 压着 ★，3 压着 2 → 3 + 1 = 4）。
 *        小心：上面那张没压着，不用拿；别忘了 ★ 纸自己。你来试：拿几张（3）。
 * 挑战：3 个图形摆的顺序（倒着想，③①②）。口诀 → 知识地图 → 拓展：两张没叠住的纸，看得出先摆哪张吗？→ 去练习纸。
 * 图形、纸堆、铅笔的位置都取自练习纸出题器（tools/video/lessons/diefang/extract.js 导出 DATA）。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420'
  var DATA = /*DATA*/null

  function lbl(x, y, s, color, at, o) {
    o = o || {}
    return { t: 'txt', id: o.id, x: x, y: y, s: s, size: o.size || 40, font: o.font || 'kl', color: color || GREY, at: at, out: o.out, anim: o.anim, glow: o.glow, glow2: o.glow2, overlapOk: o.overlapOk }
  }
  function fill(id, at, val) { return { t: 'fill', id: id, at: at, val: val } }
  function svg(x0, y0, w, h, html, at, o) {
    o = o || {}
    return { t: 'svg', id: o.id, x: x0 + w / 2, y: y0 + h / 2, w: w, h: h, html: html, at: at, out: o.out, draw: o.draw, dur: o.dur, glow: o.glow, glow2: o.glow2, anim: o.anim, dim: o.dim, move: o.move, overlapOk: o.overlapOk !== undefined ? o.overlapOk : true }
  }
  function node(cx, cy, w, text, color, at, o) {
    o = o || {}
    var fs = o.size || 42
    var h = fs + 34
    var html = '<rect x="3" y="3" width="' + (w - 6) + '" height="' + (h - 6) + '" rx="14" fill="#fffaf0" stroke="' + color + '" stroke-width="4"/>' +
      '<text x="' + w / 2 + '" y="' + (h / 2 + fs * 0.36) + '" font-family="KL" font-size="' + fs + '" text-anchor="middle" fill="' + INK + '">' + text + '</text>'
    var e = svg(cx - w / 2, cy - h / 2, w, h, html, at, { out: o.out, glow: o.glow, anim: 'pop', dim: o.dim })
    e.overlapOk = false
    return e
  }
  function flowArrow(x, y1, y2, at, o) { return { t: 'varrow', x: x, y1: y1, y2: y2, color: GREY, at: at, out: (o || {}).out } }
  function harrow(x1, x2, y, at, o) { return { t: 'harrow', x1: x1, x2: x2, y: y, color: GREY, at: at, out: (o || {}).out } }
  function line2(x1, y1, x2, y2, at, o) { return { t: 'seg', x1: x1, y1: y1, x2: x2, y2: y2, color: GREY, sw: 5, at: at, out: (o || {}).out } }

  /* ---------- 图形 ---------- */
  var TC = { circle: '#f4a259', square: '#7cb7e8', tri: '#f6d365', rect: '#6cc4b8', star: '#e58fb1', diamond: '#b49ae0', hex: '#8fd19e', trap: '#f08a7e' }
  function bb(sh) {
    if (sh.t === 'circle') return [sh.x - sh.s / 2, sh.y - sh.s / 2, sh.x + sh.s / 2, sh.y + sh.s / 2]
    var xs = sh.v.map(function (p) { return p[0] }), ys = sh.v.map(function (p) { return p[1] })
    return [Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs), Math.max.apply(null, ys)]
  }
  /* 一个图形：形状坐标 × Z，再平移 (ox, oy) */
  function shape(sh, Z, ox, oy, at, o) {
    o = o || {}
    var b = bb(sh), pad = 8
    var X0 = ox + b[0] * Z - pad, Y0 = oy + b[1] * Z - pad, W = (b[2] - b[0]) * Z + pad * 2, H = (b[3] - b[1]) * Z + pad * 2
    var lx = function (x) { return (ox + x * Z - X0).toFixed(1) }, ly = function (y) { return (oy + y * Z - Y0).toFixed(1) }
    var st = ' fill="' + (o.color || TC[sh.t]) + '" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"'
    var html = sh.t === 'circle'
      ? '<circle cx="' + lx(sh.x) + '" cy="' + ly(sh.y) + '" r="' + (sh.s / 2 * Z).toFixed(1) + '"' + st + '/>'
      : '<polygon points="' + sh.v.map(function (p) { return lx(p[0]) + ',' + ly(p[1]) }).join(' ') + '"' + st + '/>'
    return svg(X0, Y0, W, H, html, at, o)
  }
  /* 把一组图形（或纸）放大塞进框 (x0, y0, w, h)，返回 [Z, ox, oy] */
  function F(list, x0, y0, w, h) {
    var bs = list.map(function (q) { return bb(q.t ? q : { t: 'paper', v: q.v }) })
    var a = Math.min.apply(null, bs.map(function (b) { return b[0] })), c = Math.min.apply(null, bs.map(function (b) { return b[1] }))
    var bw = Math.max.apply(null, bs.map(function (b) { return b[2] })) - a, bh = Math.max.apply(null, bs.map(function (b) { return b[3] })) - c
    var Z = Math.min(w / bw, h / bh)
    return [Z, x0 + (w - bw * Z) / 2 - a * Z, y0 + (h - bh * Z) / 2 - c * Z]
  }
  /* 叠好的图 1：数组里 0 = 最上面，所以倒着画 */
  function stack(shapes, Z, ox, oy, at, o) {
    o = o || {}
    var out = []
    for (var i = shapes.length - 1; i >= 0; i--) {
      out.push(shape(shapes[i], Z, ox, oy, o.at ? o.at[i] : at, { out: o.out ? o.out[i] : undefined, glow: o.glow ? o.glow[i] : undefined, glow2: o.glow2 ? o.glow2[i] : undefined, move: o.move ? o.move[i] : undefined }))
    }
    return out
  }
  /* 图 2 的单个图形：按编号摆在 pos 里，下面写编号 */
  function pieces(shapes, Z, pos, at, o) {
    o = o || {}
    var out = []
    shapes.forEach(function (sh, i) {
      var k = '①②③④⑤'.indexOf(sh.lab), p = pos[k], b = bb(sh)
      var ox = p[0] - (b[0] + b[2]) / 2 * Z, oy = p[1] - (b[1] + b[3]) / 2 * Z
      out.push(shape(sh, Z, ox, oy, at, { glow: o.glow ? o.glow[i] : undefined, glow2: o.glow2 ? o.glow2[i] : undefined, dim: o.dim ? o.dim[i] : undefined, out: o.out ? o.out[i] : undefined }))
      out.push(lbl(p[0], p[1] + (o.ly || 100), sh.lab, INK, at, { font: 'kai', size: 44, out: o.out ? o.out[i] : undefined }))
    })
    return out
  }

  /* ---------- 纸堆 ---------- */
  var PC = ['#9fd3f0', '#f9c97c', '#a8dba8', '#f5a6b8', '#c9b6ef', '#f7e08a', '#b8e0d2']
  function papers(T, Z, ox, oy, at, o) {
    o = o || {}
    var out = []
    for (var i = T.papers.length - 1; i >= 0; i--) {
      var q = T.papers[i]
      var sh = { t: 'paper', x: q.x, y: q.y, v: q.v }
      out.push(shape(sh, Z, ox, oy, at, { color: i === T.ti ? '#ef7c6e' : PC[i], out: o.out ? o.out[i] : undefined, glow: o.glow ? o.glow[i] : undefined, glow2: o.glow2 ? o.glow2[i] : undefined }))
      if (i === T.ti) {
        var lp = T.lp[i]
        out.push(lbl(ox + lp[0] * Z, oy + lp[1] * Z + 4, '★', '#fffaf0', at, { size: 60, overlapOk: true }))
      }
    }
    return out
  }
  function badge(T, Z, ox, oy, i, s, at, o) {
    o = o || {}
    var lp = T.lp[i], cx = ox + lp[0] * Z, cy = oy + lp[1] * Z
    var html = '<circle cx="30" cy="30" r="26" fill="#fffaf0" stroke="' + RED + '" stroke-width="5"/><text x="30" y="42" font-family="Num" font-weight="600" font-size="34" text-anchor="middle" fill="' + RED + '">' + s + '</text>'
    return svg(cx - 30, cy - 30, 60, 60, html, at, { anim: 'pop', out: o.out, glow: o.glow })
  }

  /* ---------- 铅笔 ---------- */
  var GAME = (function () {
    var p = DATA.game.key.split('|'), segs = {}, L = []
    p.slice(1, -1).forEach(function (it) { var f = it.split(':'); segs[f[0]] = f[1].split(',').map(Number); L.push(f[0]) })
    return { segs: segs, letters: L, over: p[p.length - 1].split(',') }
  })()
  var PCOL = { A: '#f08a7e', B: '#7cb7e8', C: '#8fd19e', D: '#f6d365', E: '#c9b6ef', F: '#f9c97c' }
  var PW = 7
  function pencilPoly(sg, grow) {
    grow = grow || 0
    var Ln = Math.hypot(sg[2] - sg[0], sg[3] - sg[1]), ux = (sg[2] - sg[0]) / Ln, uy = (sg[3] - sg[1]) / Ln, nx = -uy, ny = ux, h = PW / 2 + grow
    var tx = sg[0] - ux * grow, ty = sg[1] - uy * grow, bx = sg[2] - ux * 11, by = sg[3] - uy * 11, ex = sg[2] + ux * grow, ey = sg[3] + uy * grow
    return [[tx + nx * h, ty + ny * h], [bx + nx * h, by + ny * h], [ex, ey], [bx - nx * h, by - ny * h], [tx - nx * h, ty - ny * h]]
  }
  var GZ = 4.2, GX = 40, GY = 110, GW = 210 * GZ, GH = 170 * GZ
  function gp(x, y) { return (GX + x * GZ - GX).toFixed(1) + ',' + (GY + y * GZ - GY).toFixed(1) }
  function pencilHTML(L, clip) {
    var sg = GAME.segs[L], Ln = Math.hypot(sg[2] - sg[0], sg[3] - sg[1]), ux = (sg[2] - sg[0]) / Ln, uy = (sg[3] - sg[1]) / Ln, nx = -uy, ny = ux, h = PW / 2
    var body = pencilPoly(sg).map(function (q) { return gp(q[0], q[1]) }).join(' ')
    var s = '<polygon points="' + body + '" fill="' + PCOL[L] + '" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>'
    /* 削开的木头 + 笔芯 */
    var bx = sg[2] - ux * 11, by = sg[3] - uy * 11
    s += '<polygon points="' + [[bx + nx * h, by + ny * h], [sg[2], sg[3]], [bx - nx * h, by - ny * h]].map(function (q) { return gp(q[0], q[1]) }).join(' ') + '" fill="#f3dcb4" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>'
    var lx = sg[2] - ux * 4, ly = sg[3] - uy * 4
    s += '<polygon points="' + [[lx + nx * 1.4, ly + ny * 1.4], [sg[2], sg[3]], [lx - nx * 1.4, ly - ny * 1.4]].map(function (q) { return gp(q[0], q[1]) }).join(' ') + '" fill="' + INK + '"/>'
    /* 橡皮 */
    var ex = sg[0] + ux * 7, ey = sg[1] + uy * 7
    s += '<polygon points="' + [[sg[0] + nx * h, sg[1] + ny * h], [ex + nx * h, ey + ny * h], [ex - nx * h, ey - ny * h], [sg[0] - nx * h, sg[1] - ny * h]].map(function (q) { return gp(q[0], q[1]) }).join(' ') + '" fill="#f5a6b8" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>'
    if (clip) s = '<defs><clipPath id="' + clip.id + '"><polygon points="' + pencilPoly(GAME.segs[clip.under], 1.2).map(function (q) { return gp(q[0], q[1]) }).join(' ') + '"/></clipPath></defs><g clip-path="url(#' + clip.id + ')">' + s + '</g>'
    return s
  }
  function pencilLabel(L, at, o) {
    var sg = GAME.segs[L], Ln = Math.hypot(sg[2] - sg[0], sg[3] - sg[1]), ux = (sg[2] - sg[0]) / Ln, uy = (sg[3] - sg[1]) / Ln
    return lbl(GX + (sg[0] - ux * 11) * GZ, GY + (sg[1] - uy * 11) * GZ + 16, L, INK, at, Object.assign({ font: 'num', size: 46, overlapOk: true }, o || {}))
  }
  /* 画的顺序：卡住的三支先画（A、B、C），再画被迫取走的 F、E、D（最上面的最后画） */
  function pencils(at, o) {
    o = o || {}
    var order = o.order, out = []
    order.forEach(function (L) {
      out.push(svg(GX, GY, GW, GH, pencilHTML(L), at, { out: (o.out || {})[L], glow: (o.glow || {})[L], glow2: (o.glow2 || {})[L] }))
    })
    /* 本该在上、却先画了的交叉：裁一块重画 */
    var rank = {}
    order.forEach(function (L, i) { rank[L] = i })
    GAME.over.forEach(function (pr, k) {
      var hi = pr[0], lo = pr[1]
      if (rank[hi] < rank[lo]) out.push(svg(GX, GY, GW, GH, pencilHTML(hi, { id: 'pc' + (o.uid || 0) + '_' + k, under: lo }), at, { out: (o.out || {})[hi] }))
    })
    order.forEach(function (L) { out.push(pencilLabel(L, at, { out: (o.out || {})[L] })) })
    return out
  }

  var S = []

  /* ---------- 0 开场 ---------- */
  var HOOK = [
    { t: 'tri', x: 64, y: 40, s: 44, v: [[64, 40 - 44 * 0.55], [64 + 44 * 0.58, 40 + 44 * 0.45], [64 - 44 * 0.58, 40 + 44 * 0.45]] },
    { t: 'square', x: 80, y: 70, s: 46, v: [[57, 47], [103, 47], [103, 93], [57, 93]] },
    { t: 'circle', x: 44, y: 62, s: 50 }
  ]
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '今天，我们来学叠放顺序！', say: '今天，我们来学叠放顺序！' }
    ],
    els: [
      { t: 'txt', x: 960, y: 200, s: '奥数 · L1 补充 · B07', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
      { t: 'tape', x: 960, y: 330, s: '叠加覆盖：叠放顺序', size: 100, at: [0, 0.2] }
    ].concat(stack(HOOK, 3, 820, 430, [1, '叠放']))
  })

  /* ---------- 1 引入：哪张在最上面 ---------- */
  var FH = F(HOOK, 300, 150, 640, 600)
  S.push({
    tag: '叠放顺序',
    beats: [
      { sub: '三张纸片叠在一起，哪张在最上面？', say: '三张纸片叠在一起，哪张在最上面？', rate: '-6%' },
      { sub: '三角形一点没被挡住，是完整的：它在最上面！', say: '三角形一点都没被挡住，是完整的：它在最上面！' },
      { sub: '圆被挡住了两块，它在最下面。', say: '圆被挡住了两块，它在最下面。' },
      { sub: '叠住的地方露出谁，谁就在上面。', say: '叠住的地方露出来的是谁，谁就在上面。', pause: 0.6 }
    ],
    els: stack(HOOK, FH[0], FH[1], FH[2], [0, 0.2], { glow: [[1, '三角形'], [3, '叠住'], [2, '圆']] }).concat([
      lbl(1360, 300, '完整的 → 最上面', GREEN, [1, '最上面'], { size: 54 }),
      lbl(1360, 440, '缺两块 → 最下面', RED, [2, '最下面'], { size: 54 }),
      lbl(1360, 620, '露出谁，谁在上', BLUE, [3, '露出'], { size: 54 })
    ])
  })

  /* ---------- 2 知识地图（两枝） ---------- */
  var MX = [600, 1320]
  function mapEls(at, lit) {
    return [
      node(960, 210, 330, '叠放顺序', INK, at, { size: 46 }),
      line2(960, 252, MX[0], 360, lit ? at : [0, '排顺序']),
      line2(960, 252, MX[1], 360, lit ? at : [0, '摆一摆']),
      node(MX[0], 405, 560, '排顺序 · 取铅笔', BLUE, lit ? at : [0, '排顺序'], { size: 44 }),
      node(MX[1], 405, 560, '摆一摆 · 拿几张', RED, lit ? at : [0, '摆一摆'], { size: 44 }),
      flowArrow(MX[0], 452, 540, lit ? at : [1, '一层层揭']),
      flowArrow(MX[1], 452, 540, lit ? at : [1, '倒着想']),
      node(MX[0], 595, 400, '① 一层层揭', BLUE, lit ? at : [1, '一层层揭'], { size: 44 }),
      node(MX[1], 595, 400, '② 倒着想', RED, lit ? at : [1, '倒着想'], { size: 44 })
    ]
  }
  S.push({
    tag: '叠放顺序 | 两招',
    beats: [
      { sub: '叠放的题，有排顺序、取铅笔，还有摆一摆、拿几张。', say: '叠放的题，有排顺序、取铅笔，还有摆一摆、拿几张。' },
      { sub: '两招就够：一层层揭，倒着想！', say: '两招就够：一层层揭，倒着想！' }
    ],
    els: mapEls(0, false)
  })

  /* ---------- 3 第一招：一层层揭（4 个图形，③②①④） ---------- */
  var EX = DATA.ex1.shapes   // 0 = 最上面：③ 六边形、② 圆、① 梯形、④ 三角形
  var F1 = F(EX, 90, 150, 600, 520), Z1 = F1[0], O1 = [F1[1], F1[2]]
  var P4 = [[870, 280], [1130, 280], [870, 550], [1130, 550]]
  var FX = 1640
  S.push({
    tag: '第一招 | 一层层揭',
    beats: [
      { sub: '第一招：一层层揭。图 1 是四个图形叠起来的，', say: '第一招：一层层揭。图一是四个图形叠起来的，' },
      { sub: '从上到下怎么排？', say: '从上到下，怎么排？', rate: '-6%' },
      { sub: '先找完整的：③ 一点没被挡住，它在最上面。', say: '先找完整的：三号一点都没被挡住，它在最上面。' },
      { sub: '想象把它拿走，② 就露出完整的样子了。', say: '想象把它拿走，二号就露出完整的样子了。' },
      { sub: '再拿走 ②，① 完整了；最后剩下 ④。', say: '再拿走二号，一号完整了；最后剩下四号。' },
      { sub: '从上到下：③、②、①、④！', say: '从上到下：三、二、一、四！', pause: 1 }
    ],
    els: stack(EX, Z1, O1[0], O1[1], [0, '叠起来'], {
      out: [[3, '拿走'], [4, '再拿走'], [4, '最后'], undefined],
      glow: [[2, '完整的'], [3, '露出'], [4, '一号'], [4, '四号']]
    }).concat(pieces(EX, 2.6, P4, [0, '叠起来', 0.4], { ly: 112,  glow: [[2, '三号'], [3, '二号'], [4, '一号'], [4, '四号']] })).concat([
      lbl(390, 700, '图 1', GREY, [0, '图一'], { font: 'kai', size: 40 }),
      lbl(1000, 708, '图 2', GREY, [0, '图一'], { font: 'kai', size: 40 }),
      lbl(300, 800, '从上到下：', GREY, [1, '从上到下'], { size: 48 }),
      lbl(510, 800, '③', RED, [2, '最上面'], { font: 'kai', size: 60 }),
      lbl(600, 800, '②', RED, [3, '完整的样子'], { font: 'kai', size: 60 }),
      lbl(690, 800, '①', RED, [4, '一号完整'], { font: 'kai', size: 60 }),
      lbl(780, 800, '④', RED, [4, '四号'], { font: 'kai', size: 60 }),
      node(FX, 230, 380, '找完整的', BLUE, [2, '完整的'], { size: 42 }),
      flowArrow(FX, 268, 330, [2, '最上面']),
      node(FX, 370, 380, '它在最上面', BLUE, [2, '最上面'], { size: 42 }),
      flowArrow(FX, 408, 470, [3, '拿走']),
      node(FX, 510, 380, '想象拿走它', BLUE, [3, '拿走'], { size: 42 }),
      flowArrow(FX, 548, 610, [3, '露出']),
      node(FX, 650, 380, '再找下一个', BLUE, [3, '露出'], { size: 42 }),
      { t: 'stamp', x: 1450, y: 800, s: '答：③ ② ① ④', color: RED, size: 54, rot: -5, at: [5, '从上到下'] }
    ])
  })

  /* ---------- 4 小心：大的不一定在下面 ---------- */
  var F4 = F(EX, 200, 150, 700, 620)
  S.push({
    tag: '第一招 | 小心',
    beats: [
      { sub: '小心！六边形最大，可它在最上面。', say: '小心！六边形最大，可是它在最上面。' },
      { sub: '大的不一定在下面，要看叠住的地方露出谁。', say: '大的不一定在下面，要看叠住的地方，露出来的是谁。', pause: 1 }
    ],
    els: stack(EX, F4[0], F4[1], F4[2], [0, 0.2], { glow: [[0, '六边形'], undefined, undefined, undefined], glow2: [[0, '最上面'], undefined, undefined, undefined] }).concat([
      lbl(1300, 360, '最大的 ≠ 最下面', RED, [1, '不一定'], { size: 62 }),
      lbl(1300, 520, '看叠住处露出谁', BLUE, [1, '露出'], { size: 54 })
    ])
  })

  /* ---------- 5 你来试 1：3 个图形（②③①） ---------- */
  var T1 = DATA.try1.shapes
  var P3 = [[880, 320], [1110, 320], [1340, 320]]
  var F5 = F(T1, 90, 160, 600, 560)
  S.push({
    tag: '第一招 | 你来试',
    beats: [
      { sub: '你来试：图 1 从上到下怎么排？', say: '你来试：图一从上到下，怎么排？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '② 完整，在最上面；拿走它，③ 完整了；最后是 ①。', say: '二号完整，在最上面；拿走它，三号完整了；最后是一号。' },
      { sub: '从上到下：**②、③、①**！', say: '从上到下：二、三、一！', pause: 1 }
    ],
    els: stack(T1, F5[0], F5[1], F5[2], [0, 0.3], { out: [[2, '拿走'], [2, '最后'], undefined], glow: [[2, '二号'], [2, '三号'], [2, '一号']] })
      .concat(pieces(T1, 2.6, P3, [0, 0.5], { ly: 112 }))
      .concat([
        lbl(1260, 590, '从上到下：', GREY, [0, 0.6], { size: 48 }),
        { t: 'slot', id: 'q5', x: 1580, y: 590, size: 230, at: [0, 0.7] },
        { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q5' },
        fill('q5', [3, '从上到下'], '<span style="font-size:30%">②③①</span>'),
        { t: 'stamp', x: 1560, y: 800, s: '答：② ③ ①', color: RED, size: 52, rot: -6, at: [3, '二、三、一'] }
      ])
  })

  /* ---------- 6 取铅笔游戏：D、E、F 被迫取走，A、B、C 压成一圈 ---------- */
  var TX = 1380
  S.push({
    tag: '第一招 | 取铅笔游戏',
    beats: [
      { sub: '一层层揭，还能玩取铅笔游戏！', say: '一层层揭，还能玩取铅笔游戏！', pitch: '+5Hz' },
      { sub: '两人轮流取，一次一支，碰动别的铅笔就输。', say: '两人轮流取，一次取一支，碰动了别的铅笔就算输。' },
      { sub: '小明先取，谁会赢？', say: '小明先取，谁会赢？', rate: '-6%' },
      { sub: '只能取完整的：小明取 D，天天取 E，小明取 F。', say: '只能取完整的那支：小明取D，天天取E，小明取F。' },
      { sub: '剩下三支：A 压着 C，C 压着 B，B 又压着 A！', say: '剩下三支：A压着C，C压着B，B又压着A！', pitch: '+5Hz' },
      { sub: '谁也取不出来！轮到天天，天天输，小明赢！', say: '谁也取不出来！轮到天天，天天输了，小明赢！', pause: 1 },
      { sub: '小心：先取的人不一定赢，要数一数能取走几支。', say: '小心：先取的人不一定赢，要数一数，能顺利取走几支。', pause: 0.6 }
    ],
    els: pencils([0, 0.3], { order: ['A', 'B', 'C', 'F', 'E', 'D'], uid: 6, out: { D: [3, '天天取'], E: [3, '小明取F'], F: [4, '剩下'] }, glow: { D: [3, '小明取D'], E: [3, '天天取E'], F: [3, '小明取F'], A: [4, 'A压着'], C: [4, 'C压着'], B: [4, 'B又'] } }).concat([
      lbl(TX + 150, 200, '小明先取', BLUE, [2, '小明先取'], { size: 46 }),
      lbl(TX, 310, '小明 取 D', BLUE, [3, '小明取D'], { size: 46 }),
      lbl(TX + 300, 310, '①', GREY, [3, '小明取D'], { font: 'kai', size: 40 }),
      lbl(TX, 400, '天天 取 E', ORANGE, [3, '天天取E'], { size: 46 }),
      lbl(TX + 300, 400, '②', GREY, [3, '天天取E'], { font: 'kai', size: 40 }),
      lbl(TX, 490, '小明 取 F', BLUE, [3, '小明取F'], { size: 46 }),
      lbl(TX + 300, 490, '③', GREY, [3, '小明取F'], { font: 'kai', size: 40 }),
      lbl(TX + 100, 590, 'A、B、C 卡住了', RED, [4, '剩下'], { size: 46 }),
      lbl(TX + 100, 680, '轮到天天：输', ORANGE, [5, '轮到天天'], { size: 46 }),
      { t: 'stamp', x: 1500, y: 790, s: '小明赢', color: RED, size: 60, rot: -6, at: [5, '小明赢'] }
    ])
  })

  /* ---------- 8 第二招：倒着想 · 摆一摆（先排 ②④③①，倒过来 ①③④②） ---------- */
  var BU = DATA.build.shapes  // 0 = 最上面：② 菱形、④ 星、③ 梯形、① 圆
  var PB = [[1330, 300], [1560, 300], [1330, 560], [1560, 560]]
  var FT = F(BU, 80, 200, 330, 300), FA = F(BU, 480, 140, 620, 450)
  /* 摆的顺序：从最下面的开始，一个一个滑进来（第 3、4 句关键词） */
  var buildAt = [[4, '二号'], [4, '四号'], [4, '三号'], [4, '一号']]
  S.push({
    tag: '第二招 | 倒着想',
    beats: [
      { sub: '这回反过来：用图 2 摆成图 1，先摆哪个？', say: '这回反过来：用图二的四个图形，摆成图一的样子，先摆哪个？', rate: '-6%' },
      { sub: '第二招：倒着想！先一层层揭，排出从上到下：', say: '第二招：倒着想！先一层层揭，排出从上到下：' },
      { sub: '②、④、③、①。', say: '二、四、三、一。' },
      { sub: '摆的时候，最下面的要先摆，所以倒过来：', say: '摆的时候，最下面的要先摆，所以倒过来：' },
      { sub: '先摆 ①，再摆 ③、④，最后摆 ②！', say: '先摆一号，再摆三号、四号，最后摆二号！' },
      { sub: '小心：别把从上到下，直接当成摆的顺序。', say: '小心：别把从上到下的顺序，直接当成摆的顺序。', pause: 1 }
    ],
    els: stack(BU, FT[0], FT[1], FT[2], [0, '图一'])
      .concat(pieces(BU, 2.3, PB, [0, '图二'], { ly: 100 }))
      .concat(stack(BU, FA[0], FA[1], FA[2], 0, {
        at: [[4, '二号'], [4, '四号'], [4, '三号'], [4, '一号']],
        move: [[[4, '二号'], 240, 0], [[4, '四号'], 240, 0], [[4, '三号'], 240, 0], [[4, '一号'], 240, 0]]
      }).map(function (e) { return e }))
      .concat([
        lbl(245, 540, '图 1', GREY, [0, '图一'], { font: 'kai', size: 40 }),
        lbl(1445, 700, '图 2', GREY, [0, '图二'], { font: 'kai', size: 40 }),
        lbl(250, 650, '从上到下', BLUE, [1, '从上到下'], { size: 40 }),
        lbl(250, 730, '② ④ ③ ①', BLUE, [2, 0.2], { font: 'kai', size: 52 }),
        harrow(420, 560, 730, [3, '倒过来']),
        lbl(700, 650, '摆的顺序', RED, [3, '倒过来'], { size: 40 }),
        lbl(700, 730, '① ③ ④ ②', RED, [3, '倒过来', 0.3], { font: 'kai', size: 52 }),
        { t: 'stamp', x: 1200, y: 800, s: '答：① ③ ④ ②', color: RED, size: 52, rot: -5, at: [4, '最后摆'] }
      ])
  })
  /* 摆进来的图形：at = 滑进来的锚点（stack 的 at 数组按 0 = 最上面给） */

  /* ---------- 9 第二招：倒着想 · 拿几张（往上推：1、2 压着 ★，3 压着 2 → 4 张） ---------- */
  var TK = DATA.take, FK = F(TK.papers, 80, 130, 900, 700), ZT = FK[0], OT = [FK[1], FK[2]]
  /* 下标：1 → 1 号，3 → 2 号，2 → 3 号；0 在上面但没压着；4 是 ★ */
  S.push({
    tag: '第二招 | 拿几张',
    beats: [
      { sub: '再来：每次只能拿没被压着的一张。', say: '再来：一堆彩纸，每次只能拿，没被压着的一张。' },
      { sub: '至少拿几张，才能拿到 ★ 纸？', say: '至少拿几张，才能拿到星星纸？', rate: '-6%' },
      { sub: '倒着想，从 ★ 往上推：压着它的有 1 号、2 号；', say: '倒着想，从星星纸往上推：压着它的，有一号、二号；' },
      { sub: '压着 2 号的，还有 3 号。', say: '压着二号的，还有三号。' },
      { sub: '把 1、3、2 依次拿走，第四张就是 ★ 纸。', say: '把一号、三号、二号依次拿走，第四张就是星星纸。' },
      { sub: '3 + 1 = 4，至少拿 **4** 张！', say: '三加一等于四，至少拿四张！', pause: 1 },
      { sub: '小心：最上面这张没压着它们，不用拿；', say: '小心：最上面这张，没压着它们，不用拿；' },
      { sub: '数完别忘了加上 ★ 纸自己。', say: '数完，别忘了加上星星纸自己。', pause: 0.6 }
    ],
    els: papers(TK, ZT, OT[0], OT[1], [0, 0.2], {
      out: [undefined, [4, '一号、'], [4, '三号、'], [4, '二号依次'], undefined],
      glow: [[6, '最上面'], [2, '一号'], [3, '三号'], [2, '二号'], [1, '星星纸']],
      glow2: [undefined, undefined, undefined, [3, '压着二号'], undefined]
    }).concat([
      badge(TK, ZT, OT[0], OT[1], 1, '1', [2, '一号'], { out: [4, '一号、'] }),
      badge(TK, ZT, OT[0], OT[1], 3, '2', [2, '二号'], { out: [4, '二号依次'] }),
      badge(TK, ZT, OT[0], OT[1], 2, '3', [3, '三号'], { out: [4, '三号、'] }),
      node(1540, 220, 440, '要拿 ★ 纸', RED, [2, '往上推'], { size: 42 }),
      flowArrow(1540, 258, 318, [2, '压着它的']),
      node(1540, 360, 440, '谁压着它？1、2', RED, [2, '压着它的'], { size: 42 }),
      flowArrow(1540, 398, 458, [3, '压着二号']),
      node(1540, 500, 440, '谁压着 2？3', RED, [3, '压着二号'], { size: 42 }),
      flowArrow(1540, 538, 598, [5, '三加一']),
      node(1540, 640, 440, '3 + 1 = 4 张', GREEN, [5, '三加一'], { size: 42 }),
      { t: 'stamp', x: 1540, y: 800, s: '答：4 张', color: RED, size: 56, rot: -6, at: [5, '至少'] },
      lbl(1150, 780, '没压着：不用拿', ORANGE, [6, '不用拿'], { size: 42 })
    ])
  })

  /* ---------- 10 你来试 2：拿几张（★ 被 1 压，1 被 2 压 → 3 张） ---------- */
  var T2 = DATA.try2, F10 = F(T2.papers, 100, 140, 820, 660), ZT2 = F10[0], OT2 = [F10[1], F10[2]]
  S.push({
    tag: '第二招 | 你来试',
    beats: [
      { sub: '你来试：至少拿几张，才能拿到 ★ 纸？', say: '你来试：至少拿几张，才能拿到星星纸？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '往上推：1 号压着 ★，2 号又压着 1 号。', say: '往上推：一号压着星星纸，二号又压着一号。' },
      { sub: '2 + 1 = 3，至少拿 **3** 张！', say: '二加一等于三，至少拿三张！', pause: 1 }
    ],
    els: papers(T2, ZT2, OT2[0], OT2[1], [0, 0.3], { out: [[3, '二加一'], [3, '至少'], undefined, undefined, undefined], glow: [undefined, [2, '一号'], undefined, [0, '星星纸'], undefined] }).concat([
      badge(T2, ZT2, OT2[0], OT2[1], 1, '1', [2, '一号'], { out: [3, '至少'] }),
      badge(T2, ZT2, OT2[0], OT2[1], 0, '2', [2, '二号'], { out: [3, '二加一'] }),
      { t: 'slot', id: 'q10', x: 1500, y: 430, size: 230, at: [0, 0.6] },
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q10' },
      fill('q10', [3, '至少'], '3'),
      lbl(1500, 600, '张', GREY, [0, 0.6], { size: 50 }),
      { t: 'stamp', x: 1500, y: 760, s: '答：3 张', color: RED, size: 54, rot: -6, at: [3, '三张'] }
    ])
  })

  /* ---------- 12 挑战：3 个图形摆的顺序（倒着想：从上到下 ②①③，摆 ③①②） ---------- */
  var CH = DATA.chal.shapes  // 0 = 最上面：② 长方形、① 星、③ 圆
  var F12 = F(CH, 90, 160, 600, 560)
  S.push({
    tag: '挑战 | 这次用哪一招？',
    beats: [
      { sub: '挑战题：用图 2 摆成图 1，按摆的顺序写出来。', say: '挑战题：用图二摆成图一的样子，按摆的顺序写出来。', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', rate: '-6%', pause: 5 },
      { sub: '问摆的顺序，用第二招：倒着想。', say: '问的是摆的顺序，用第二招：倒着想。' },
      { sub: '从上到下是 ②、①、③，倒过来：', say: '从上到下是二、一、三，倒过来：' },
      { sub: '先摆 ③，再摆 ①，最后摆 ②！', say: '先摆三号，再摆一号，最后摆二号！', pause: 1 }
    ],
    els: stack(CH, F12[0], F12[1], F12[2], [0, 0.3], { glow: [[3, '是二'], [3, '一、'], [3, '三，']] })
      .concat(pieces(CH, 2.6, P3, [0, 0.5], { ly: 112 }))
      .concat([
        { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5 },
        lbl(1110, 540, '第二招：倒着想', RED, [2, '第二招'], { size: 50 }),
        lbl(1110, 630, '从上到下：② ① ③', BLUE, [3, '从上到下'], { size: 44 }),
        { t: 'stamp', x: 1500, y: 760, s: '摆：③ ① ②', color: RED, size: 54, rot: -6, at: [4, '先摆'] }
      ])
  })

  /* ---------- 13 口诀 ---------- */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '完整的在最上面，一层一层往下揭；', say: '完整的在最上面，一层一层往下揭；', rate: '-15%' },
      { sub: '摆的顺序倒过来，要拿哪张往上推。', say: '摆的顺序倒过来，要拿哪张往上推。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 470, w: 1500, h: 420, at: 0 },
      { t: 'chant', x: 960, y: 390, s: '完整的在最上面，一层一层往下揭；', color: BLUE, size: 60, at: 1 },
      { t: 'chant', x: 960, y: 560, s: '摆的顺序倒过来，要拿哪张往上推。', color: RED, size: 60, at: 2 }
    ]
  })

  /* ---------- 14 结尾：知识地图 + 拓展想一想 ---------- */
  var FAR = [
    { t: 'square', x: 20, y: 20, s: 36, v: [[2, 2], [38, 2], [38, 38], [2, 38]] },
    { t: 'circle', x: 90, y: 22, s: 38 }
  ]
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天学会了两招：一层层揭，倒着想。', say: '今天学会了两招：一层层揭，倒着想。' },
      { sub: '想一想：两张纸离得远远的，没叠在一起，', say: '想一想：两张纸离得远远的，没叠在一起，', rate: '-6%' },
      { sub: '看得出先摆的是哪一张吗？', say: '看得出先摆的是哪一张吗？', rate: '-6%', pause: 1 },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: mapEls(0, true).concat([
      { t: 'check', x: MX[0] + 230, y: 590, at: 0, sfx: false },
      { t: 'check', x: MX[1] + 230, y: 590, at: 0, sfx: false },
      shape(FAR[0], 2.6, 760, 700, [1, '两张纸'], { out: [3, 0] }),
      shape(FAR[1], 2.6, 760, 700, [1, '两张纸', 0.3], { out: [3, 0] }),
      lbl(1250, 760, '谁先摆？', RED, [2, '看得出'], { size: 56, out: [3, 0] }),
      { t: 'tape', x: 960, y: 790, s: '去练习纸上试试吧！', size: 50, at: [3, '练习纸'] }
    ])
  })

  /* 讲完一招点亮知识地图的一枝 */
  function mapScene(n) {
    var e = mapEls(0, true)
    var moves = e.slice(-2)
    var sits = e.slice(3, 5)
    moves.forEach(function (m, k) {
      if (k === n - 1) { m.at = [0, '学会']; m.glow = [0, '学会', 0.3] }
      if (k >= n) { m.dim = 0; sits[k].dim = 0 }
    })
    for (var k = 0; k < n; k++) e.push({ t: 'check', x: MX[k] + 230, y: 590, at: k === n - 1 ? [0, '学会', 0.3] : 0, sfx: k === n - 1 ? undefined : false })
    var say = ['第一招学会了！还有一招。', '两招都学会了！来个挑战！'][n - 1]
    return { tag: '叠放顺序 | 学到哪了', beats: [{ sub: say, say: say, pitch: '+5Hz', pause: 0.4 }], els: e }
  }
  /* 顺序：0 开场 1 引入 2 地图 3 第一招 4 小心 5 你来试1 6 取铅笔 | 7 第二招摆 8 拿几张 9 你来试2 | 10 挑战 11 口诀 12 结尾 */
  S.splice(10, 0, mapScene(2))
  S.splice(7, 0, mapScene(1))

  var FC1 = F(HOOK, 220, 470, 600, 420), FC2 = F(DATA.try2.papers, 1100, 470, 600, 420)
  S.cover = {
    tag: null,
    els: [
      { t: 'txt', x: 960, y: 130, s: '奥数 · L1 补充 · B07 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
      { t: 'tape', x: 960, y: 270, s: '叠加覆盖：叠放顺序', size: 110, at: 0 },
      { t: 'txt', x: 960, y: 410, s: '完整的在最上面', size: 58, color: RED, font: 'kl', at: 0 }
    ].concat(stack(HOOK, FC1[0], FC1[1], FC1[2], 0)).concat(papers(DATA.try2, FC2[0], FC2[1], FC2[2], 0)).concat([
      { t: 'txt', x: 960, y: 960, s: '一层层揭 · 倒着想', size: 50, color: GREEN, font: 'kl', at: 0 }
    ])
  }

  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
