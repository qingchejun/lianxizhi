/* B01 推理比较：比长短 · 讲解视频分镜 v1（L1 补充第一课）
 * 新结构（2026-11-10 用户同意，借鉴学而思）：
 *   引入（箭头错觉）→ 知识地图（三种情况 → 三招）→ 每招：判断小流程 + 例题 + 「你来试」短倒计时 + 「小心」反例
 *   → 挑战「这次用哪一招？」→ 口诀 → 回到知识地图收尾 + 拓展想一想（引出 B02 比轻重）。
 * 第一招：一样粗数圈数（4 圈 vs 6 圈 → ②长）；圈数一样看粗细（4 圈细 vs 4 圈粗 → 粗的长）。你来试：①细 4 圈 / ②粗 6 圈，哪根短 → ①。
 * 第二招：方格 4 支：1 号 6 格、2 号 3 格、3 号 4 格半（竖、画得粗）、4 号 5 格 → 从短到长 2、3、4、1。你来试：1 号 5 格（粗）、2 号 7 格、3 号 4 格 → 2 号最长。
 * 第三招：牛牛 斜 3 + 横竖 4，丁丁 斜 3 + 横竖 6 → 牛牛先到。你来试：小明 横 8 竖 4、小红 横 8 竖 2 → 小红先到。
 * 挑战：两棵树都缠 5 圈，①粗 ②细，哪根长 → ①（这次用第一招）。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420'
  var ROPE = '#9a5b2a', PENCIL = '#f3d27a'

  function lbl(x, y, s, color, at, o) {
    o = o || {}
    return { t: 'txt', id: o.id, x: x, y: y, s: s, size: o.size || 40, font: o.font || 'kl', color: color || GREY, at: at, out: o.out, anim: o.anim, glow: o.glow, glow2: o.glow2, overlapOk: o.overlapOk }
  }
  function fill(id, at, val) { return { t: 'fill', id: id, at: at, val: val } }
  function svg(x0, y0, w, h, html, at, o) {
    o = o || {}
    return { t: 'svg', x: x0 + w / 2, y: y0 + h / 2, w: w, h: h, html: html, at: at, out: o.out, draw: o.draw, dur: o.dur, glow: o.glow, anim: o.anim }
  }
  function seg(x1, y1, x2, y2, color, sw, at, o) {
    o = o || {}
    return { t: 'seg', x1: x1, y1: y1, x2: x2, y2: y2, color: color, sw: sw, at: at, out: o.out, glow: o.glow, glow2: o.glow2 }
  }
  /* 判断小流程的一格：圆角框 + 字（svg，字体用霞鹜文楷） */
  function node(cx, cy, w, text, color, at, o) {
    o = o || {}
    var fs = o.size || 38
    var h = fs + 34
    var html = '<rect x="3" y="3" width="' + (w - 6) + '" height="' + (h - 6) + '" rx="14" fill="#fffaf0" stroke="' + color + '" stroke-width="4"/>' +
      '<text x="' + w / 2 + '" y="' + (h / 2 + fs * 0.36) + '" font-family="KL" font-size="' + fs + '" text-anchor="middle" fill="' + INK + '">' + text + '</text>'
    return svg(cx - w / 2, cy - h / 2, w, h, html, at, { out: o.out, glow: o.glow, anim: 'pop' })
  }
  function flowArrow(x, y1, y2, at, o) {
    return { t: 'varrow', x: x, y1: y1, y2: y2, color: GREY, at: at, out: (o || {}).out }
  }

  /* 横放的铅笔：左端 x0、中线 y、长 L、粗细（thick），出现时刻 at */
  function pencil(x0, y, L, thick, at, o) {
    var h = thick ? 64 : 30
    var html = '<rect x="4" y="4" width="' + L + '" height="' + h + '" rx="4" fill="' + PENCIL + '" stroke="' + INK + '" stroke-width="4"/>' +
      '<path d="M' + (L + 4) + ' 4 L' + (L + 4 + h * 0.9) + ' ' + (4 + h / 2) + ' L' + (L + 4) + ' ' + (4 + h) + ' Z" fill="#f7e8c8" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<circle cx="' + (L + 4 + h * 0.82) + '" cy="' + (4 + h / 2) + '" r="' + (thick ? 6 : 4) + '" fill="' + INK + '"/>'
    return svg(x0 - 4, y - h / 2 - 4, L + h + 12, h + 8, html, at, o)
  }
  /* 缠在铅笔中段的绳子：n 道斜线，每道一个 seg，念到时逐道亮 */
  function wraps(arr, x0, y, L, thick, n, at, o) {
    o = o || {}
    var h = thick ? 64 : 30
    var gap = 40
    var start = x0 + L / 2 - ((n - 1) * gap) / 2
    for (var i = 0; i < n; i++) {
      var x = start + i * gap
      arr.push(seg(x - 12, y + h / 2 + 10, x + 12, y - h / 2 - 10, ROPE, 9, Array.isArray(at) ? [at[0], at[1] || 0, i * 0.08] : at,
        { out: o.out, glow: o.glow ? (Array.isArray(o.glow) ? [o.glow[0], o.glow[1], (o.glow[2] || 0) + i * 0.18] : o.glow) : undefined }))
    }
  }
  /* 方格：左上角 (gx, gy)，cols × rows，每格 cell */
  function gridSVG(gx, gy, cols, rows, cell, at, o) {
    var w = cols * cell
    var h = rows * cell
    var p = []
    for (var c = 0; c <= cols; c++) p.push('<line x1="' + (4 + c * cell) + '" y1="4" x2="' + (4 + c * cell) + '" y2="' + (4 + h) + '" stroke="#b9ad9c" stroke-width="2"/>')
    for (var r = 0; r <= rows; r++) p.push('<line x1="4" y1="' + (4 + r * cell) + '" x2="' + (4 + w) + '" y2="' + (4 + r * cell) + '" stroke="#b9ad9c" stroke-width="2"/>')
    return svg(gx - 4, gy - 4, w + 8, h + 8, p.join(''), at, o)
  }
  /* 方格里的铅笔（粗线段）：dir h/v，从格 (cx, cy) 起，len 格 */
  function bar(arr, gx, gy, cell, b, at, o) {
    o = o || {}
    var x1, y1, x2, y2
    if (b.dir === 'h') { x1 = gx + b.cx * cell; x2 = x1 + b.len * cell; y1 = y2 = gy + (b.cy + 0.5) * cell }
    else { y1 = gy + b.cy * cell; y2 = y1 + b.len * cell; x1 = x2 = gx + (b.cx + 0.5) * cell }
    arr.push(seg(x1, y1, x2, y2, INK, b.thick ? 24 : 11, at, { glow: o.glow, glow2: o.glow2, out: o.out }))
    var lx = b.dir === 'h' ? x1 + 4 : x1 - 30
    var ly = b.dir === 'h' ? y1 - 26 : y1 + 10
    arr.push(lbl(lx, ly, b.no + '', INK, at, { font: 'num', size: 32, out: o.out, overlapOk: true }))
    return { x1: x1, y1: y1, x2: x2, y2: y2 }
  }
  /* 方格里走路：起点 (gx, gy + y0*cell)，moves 串（E 横、U/D 竖、R 右上斜、F 右下斜），每步一个 seg 依次画出。
     返回各步的端点，供叠加红（斜线）/蓝（横竖线）高亮 */
  function walkPts(gx, gy, cell, y0, moves) {
    var x = 0, y = y0, out = []
    moves.split('').forEach(function (m) {
      var nx = x + (m === 'E' || m === 'R' || m === 'F' ? 1 : 0)
      var ny = y + (m === 'U' || m === 'R' ? -1 : m === 'D' || m === 'F' ? 1 : 0)
      out.push({ m: m, x1: gx + x * cell, y1: gy + y * cell, x2: gx + nx * cell, y2: gy + ny * cell })
      x = nx; y = ny
    })
    return out
  }
  function route(arr, gx, gy, cell, y0, moves, at, o) {
    o = o || {}
    var pts = walkPts(gx, gy, cell, y0, moves)
    pts.forEach(function (p, i) {
      arr.push(seg(p.x1, p.y1, p.x2, p.y2, INK, 9, [at[0], at[1] || 0, (at[2] || 0) + i * 0.12], { out: o.out }))
    })
    var dg = pts.filter(function (p) { return p.m === 'R' || p.m === 'F' })
    var st = pts.filter(function (p) { return !(p.m === 'R' || p.m === 'F') })
    if (o.diagAt) dg.forEach(function (p, i) { arr.push(seg(p.x1, p.y1, p.x2, p.y2, RED, 13, [o.diagAt[0], o.diagAt[1], (o.diagAt[2] || 0) + i * 0.25], { glow: [o.diagAt[0], o.diagAt[1], (o.diagAt[2] || 0) + i * 0.25], out: o.out })) })
    if (o.stAt) st.forEach(function (p, i) { arr.push(seg(p.x1, p.y1, p.x2, p.y2, BLUE, 13, [o.stAt[0], o.stAt[1], (o.stAt[2] || 0) + i * 0.2], { glow: [o.stAt[0], o.stAt[1], (o.stAt[2] || 0) + i * 0.2], out: o.out })) })
    var last = pts[pts.length - 1]
    arr.push(svg(last.x2 - 4, last.y2 - 50, 50, 54,
      '<line x1="4" y1="50" x2="4" y2="4" stroke="' + INK + '" stroke-width="4"/><path d="M4 4 L42 14 L4 26 Z" fill="' + RED + '" stroke="' + INK + '" stroke-width="3"/>',
      [at[0], at[1] || 0, (at[2] || 0) + pts.length * 0.12], { out: o.out, anim: 'pop' }))
    arr.push({ t: 'shp', k: 'dot', x: pts[0].x1, y: pts[0].y1, size: 22, color: INK, at: at, out: o.out })
    return pts
  }
  /* 箭头错觉：两条一样长的线 */
  function arrowLine(x1, x2, y, out, at, o) {
    var w = x2 - x1 + 120
    var dx = out ? -34 : 34
    var a = 60 // 线在 svg 里的左端
    var b = a + (x2 - x1)
    var html = '<line x1="' + a + '" y1="40" x2="' + b + '" y2="40" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M' + (a - dx) + ' 8 L' + a + ' 40 L' + (a - dx) + ' 72" fill="none" stroke="' + INK + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M' + (b + dx) + ' 8 L' + b + ' 40 L' + (b + dx) + ' 72" fill="none" stroke="' + INK + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
    return svg(x1 - a, y - 40, w, 80, html, at, o)
  }
  function tree(cx, baseY, trunkW, at, o) {
    var w = trunkW + 160, h = 420
    var tx = w / 2 - trunkW / 2
    var html = '<circle cx="' + w / 2 + '" cy="90" r="' + (70 + trunkW * 0.4) + '" fill="#8cc47a" stroke="' + INK + '" stroke-width="5"/>' +
      '<circle cx="' + (w / 2 - 50) + '" cy="130" r="55" fill="#8cc47a" stroke="' + INK + '" stroke-width="5"/>' +
      '<circle cx="' + (w / 2 + 50) + '" cy="130" r="55" fill="#8cc47a" stroke="' + INK + '" stroke-width="5"/>' +
      '<rect x="' + tx + '" y="160" width="' + trunkW + '" height="' + (h - 166) + '" fill="#b98552" stroke="' + INK + '" stroke-width="5"/>'
    return svg(cx - w / 2, baseY - h, w, h, html, at, o)
  }
  function treeWraps(arr, cx, baseY, trunkW, n, at, o) {
    o = o || {}
    for (var i = 0; i < n; i++) {
      var y = baseY - 70 - i * 34
      arr.push(seg(cx - trunkW / 2 - 8, y + 10, cx + trunkW / 2 + 8, y - 10, ROPE, 9, [at[0], at[1] || 0, i * 0.08],
        { glow: o.glow ? [o.glow[0], o.glow[1], (o.glow[2] || 0) + i * 0.15] : undefined }))
    }
  }

  var NTH = ['一', '二', '三', '四', '五', '六']
  var S = []

  /* 0 开场 */
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '上一课，我们学了和不变与差不变。', say: '上一课，我们学了和不变与差不变。' },
      { sub: '今天学补充课第一课：推理比较，比长短！', say: '今天，我们学补充课的第一课：推理比较，比长短！' }
    ],
    els: [
      { t: 'txt', x: 960, y: 230, s: '奥数 · L1 补充 · B01', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
      { t: 'tape', x: 960, y: 370, s: '推理比较：比长短', size: 110, at: [0, 0.2] },
      lbl(960, 560, '上一课：和不变与差不变', BLUE, [1, '上一课'], { size: 48, out: [2, 0] }),
      arrowLine(760, 1160, 640, false, [2, '比长短'], { anim: 'pop' })
    ]
  })

  /* 1 引入：箭头错觉 */
  var OUT1 = [4, '三招']
  S.push({
    tag: '比长短',
    beats: [
      { sub: '先考考你：这两条线，哪条长？', say: '先考考你：这两条线，哪条长？', rate: '-6%' },
      { sub: '看上去，上面那条长一些，对不对？', say: '看上去，上面那条长一些，对不对？' },
      { sub: '我们画两条竖线，量一量。', say: '我们画两条竖线，量一量。' },
      { sub: '一样长！眼睛被骗了！', say: '一样长！眼睛被骗了！', pitch: '+8Hz', pause: 0.5 },
      { sub: '比长短不能只靠看。今天教你三招。', say: '比长短不能只靠看。今天，教你三招。' }
    ],
    els: [
      lbl(560, 300, '①', INK, [0, '两条线'], { font: 'kai', size: 56, out: OUT1 }),
      lbl(560, 520, '②', INK, [0, '两条线'], { font: 'kai', size: 56, out: OUT1 }),
      arrowLine(760, 1160, 300, true, [0, '两条线'], { out: OUT1, glow: [1, '上面'] }),
      arrowLine(760, 1160, 520, false, [0, '两条线', 0.2], { out: OUT1 }),
      { t: 'seg', x1: 760, y1: 220, x2: 760, y2: 600, color: RED, sw: 5, dashed: true, at: [2, '竖线'], out: OUT1 },
      { t: 'seg', x1: 1160, y1: 220, x2: 1160, y2: 600, color: RED, sw: 5, dashed: true, at: [2, '竖线', 0.3], out: OUT1 },
      { t: 'stamp', x: 1500, y: 420, s: '一样长！', color: ORANGE, size: 64, rot: -6, at: [3, '一样长'], out: OUT1 },
      { t: 'card', x: 560, y: 470, title: '第一招', sub: '数圈数', color: BLUE, at: [4, '三招', 0.3] },
      { t: 'card', x: 960, y: 470, title: '第二招', sub: '数格子', color: RED, at: [4, '三招', 0.6] },
      { t: 'card', x: 1360, y: 470, title: '第三招', sub: '分开数', color: GREEN, at: [4, '三招', 0.9] }
    ]
  })

  /* 2 知识地图：三种情况 → 三招（结尾还会回到这张图） */
  function mapEls(at, lit) {
    var e = [
      node(960, 210, 300, '比长短', INK, at, { size: 50 }),
      { t: 'seg', x1: 960, y1: 252, x2: 420, y2: 360, color: GREY, sw: 5, at: lit ? at : [0, '缠起来'] },
      { t: 'seg', x1: 960, y1: 252, x2: 960, y2: 360, color: GREY, sw: 5, at: lit ? at : [0, '方格里'] },
      { t: 'seg', x1: 960, y1: 252, x2: 1500, y2: 360, color: GREY, sw: 5, at: lit ? at : [0, '走路'] },
      node(420, 405, 420, '绳子缠起来', BLUE, lit ? at : [0, '缠起来'], { size: 46 }),
      node(960, 405, 420, '摆在方格里', RED, lit ? at : [0, '方格里'], { size: 46 }),
      node(1500, 405, 460, '在方格里走路', GREEN, lit ? at : [0, '走路'], { size: 46 }),
      flowArrow(420, 452, 540, lit ? at : [1, '第一招']),
      flowArrow(960, 452, 540, lit ? at : [1, '第二招']),
      flowArrow(1500, 452, 540, lit ? at : [1, '第三招']),
      node(420, 595, 480, '① 数圈数，看粗细', BLUE, lit ? at : [1, '第一招'], { size: 46, glow: lit ? [1, '绳子'] : undefined }),
      node(960, 595, 360, '② 数格子', RED, lit ? at : [1, '第二招'], { size: 46, glow: lit ? [1, '方格'] : undefined }),
      node(1500, 595, 460, '③ 路线分开数', GREEN, lit ? at : [1, '第三招'], { size: 46, glow: lit ? [1, '路线'] : undefined })
    ]
    return e
  }
  S.push({
    tag: '比长短 | 三种情况',
    beats: [
      { sub: '比长短，先看东西是什么样子：', say: '比长短，先看东西是什么样子：绳子缠起来的，摆在方格里的，在方格里走路的。' },
      { sub: '每种样子，有一招：第一招、第二招、第三招。', say: '每种样子，都有一招：第一招、第二招、第三招。' },
      { sub: '我们一招一招来学！', say: '我们一招一招来学！' }
    ],
    els: mapEls(0, false)
  })

  /* 3 第一招：数圈数，看粗细（含「小心」反例） */
  var P1 = 160, L1 = 620
  var OUTA = [3, 0]
  var e3 = [
    lbl(470, 165, '第一招：数圈数，看粗细', BLUE, [0, 0], { size: 46 }),
    lbl(120, 330, '①', INK, [1, '两支'], { font: 'kai', size: 50, out: OUTA }),
    lbl(120, 500, '②', INK, [1, '两支'], { font: 'kai', size: 50, out: OUTA }),
    pencil(P1, 330, L1, false, [1, '两支'], { out: OUTA }),
    pencil(P1, 500, L1, false, [1, '两支', 0.15], { out: OUTA }),
    lbl(930, 330, '4 圈', GREY, [1, '四圈'], { out: OUTA }),
    lbl(930, 500, '6 圈', GREY, [1, '六圈'], { out: OUTA }),
    { t: 'check', x: 1010, y: 495, at: [2, '第二根长', 0.2], out: OUTA },
    /* 反例：圈数一样，一细一粗 */
    lbl(120, 330, '①', INK, [3, '圈数一样'], { font: 'kai', size: 50 }),
    lbl(120, 520, '②', INK, [3, '圈数一样'], { font: 'kai', size: 50 }),
    pencil(P1, 330, L1, false, [3, '圈数一样']),
    pencil(P1, 520, L1, true, [3, '一支粗']),
    lbl(930, 330, '4 圈', GREY, [3, '圈数一样', 0.3]),
    lbl(930, 520, '4 圈', GREY, [3, '圈数一样', 0.3]),
    svg(140, 640, 520, 220,
      '<circle cx="110" cy="100" r="42" fill="none" stroke="' + ROPE + '" stroke-width="9"/><circle cx="360" cy="100" r="88" fill="none" stroke="' + ROPE + '" stroke-width="9"/>' +
      '<text x="110" y="210" font-family="KL" font-size="30" text-anchor="middle" fill="' + INK + '">细的绕一圈</text><text x="360" y="210" font-family="KL" font-size="30" text-anchor="middle" fill="' + INK + '">粗的绕一圈</text>',
      [4, '绕一圈'], { anim: 'pop' }),
    { t: 'check', x: 1010, y: 515, at: [5, '粗铅笔上的长', 0.2] },
    /* 判断小流程（右侧） */
    node(1500, 260, 300, '先看粗细', INK, [1, 0.3]),
    flowArrow(1420, 296, 380, [2, '一样粗']),
    node(1380, 420, 330, '一样粗：数圈数', BLUE, [2, '一样粗'], { glow: [2, '数圈数'] }),
    flowArrow(1640, 296, 600, [3, '圈数一样']),
    node(1580, 640, 400, '圈数一样：粗的长', RED, [5, '所以'], { glow: [5, '粗铅笔'] }),
    lbl(1380, 500, '圈多的长', BLUE, [2, '圈多'], { size: 36 })
  ]
  wraps(e3, P1, 330, L1, false, 4, [1, '两支'], { out: OUTA, glow: [1, '四圈', -0.6] })
  wraps(e3, P1, 500, L1, false, 6, [1, '两支', 0.15], { out: OUTA, glow: [1, '六圈', -0.8] })
  wraps(e3, P1, 330, L1, false, 4, [3, '圈数一样'])
  wraps(e3, P1, 520, L1, true, 4, [3, '一支粗'])
  S.push({
    tag: '第一招 | 数圈数，看粗细',
    beats: [
      { sub: '第一招：绳子缠起来，就数圈数、看粗细。', say: '第一招：绳子缠起来，就数圈数、看粗细。' },
      { sub: '两支一样粗的铅笔：第一根缠了四圈，第二根六圈。', say: '两支一样粗的铅笔：第一根缠了四圈，第二根缠了六圈。' },
      { sub: '一样粗，就数圈数：圈多的长，第 **2** 根长！', say: '一样粗，就数圈数：圈多的长，第二根长！' },
      { sub: '小心！要是圈数一样，一支细、一支粗呢？', say: '小心！要是圈数一样，一支细、一支粗呢？', rate: '-6%' },
      { sub: '粗的铅笔绕一圈，要用更多绳子。', say: '粗的铅笔，绕一圈要用更多绳子。' },
      { sub: '所以，缠在粗铅笔上的长！', say: '所以，缠在粗铅笔上的长！', pause: 1 }
    ],
    els: e3
  })

  /* 4 你来试 1：①细 4 圈 / ②粗 6 圈，哪根短 */
  var e4 = [
    lbl(960, 165, '你来试：哪根绳子短一些？', GREY, [0, 0.2], { size: 46 }),
    lbl(160, 380, '①', INK, [0, 0.2], { font: 'kai', size: 50 }),
    lbl(160, 580, '②', INK, [0, 0.2], { font: 'kai', size: 50 }),
    pencil(220, 380, 620, false, [0, 0.3]),
    pencil(220, 580, 620, true, [0, 0.45]),
    { t: 'slot', id: 'q4', x: 1560, y: 470, size: 120, at: [0, 0.6] },
    lbl(1560, 590, '第几根短？', GREY, [0, 0.7], { size: 36 }),
    { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 3, pulse: 'q4' },
    lbl(1010, 380, '细、4 圈', BLUE, [2, '又细'], { size: 38 }),
    lbl(1010, 580, '粗、6 圈', RED, [2, '又细'], { size: 38 }),
    fill('q4', [2, '第一根'], '1'),
    { t: 'stamp', x: 1500, y: 790, s: '答：第 1 根短', color: RED, size: 50, rot: -6, at: [2, '第一根', 0.5] }
  ]
  wraps(e4, 220, 380, 620, false, 4, [0, 0.3])
  wraps(e4, 220, 580, 620, true, 6, [0, 0.45])
  S.push({
    tag: '第一招 | 你来试',
    beats: [
      { sub: '你来试：哪根绳子短一些？', say: '你来试：哪根绳子短一些？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 3 },
      { sub: '第一根又细、圈又少：第 **1** 根短！', say: '第一根，又细、圈又少：第一根短！', pause: 1 }
    ],
    els: e4
  })

  /* 5 冲突 + 第二招：数格子 */
  var GX = 160, GY = 230, C = 60
  var OUT5 = [2, '第二招']
  var e5 = [
    gridSVG(GX, GY, 12, 8, C, [0, 0.3]),
    { t: 'stamp', x: 1520, y: 420, s: '没有圈可数！', color: ORANGE, size: 60, rot: -5, at: [1, '没有圈'], out: OUT5 },
    lbl(1450, 165, '第二招：数格子', RED, [2, '第二招'], { size: 46 }),
    node(1500, 290, 420, '每格一样大', INK, [2, '每一格']),
    flowArrow(1500, 326, 384, [3, '一号']),
    node(1500, 420, 420, '数占了几格', RED, [3, '一号']),
    flowArrow(1500, 456, 514, [4, '半格']),
    node(1500, 550, 420, '半格也要算', RED, [4, '半格']),
    flowArrow(1500, 586, 644, [5, '只看格数']),
    node(1480, 680, 440, '只看格数，不看粗细', RED, [5, '只看格数'], { glow: [5, '粗没有用'] }),
    lbl(GX + 6 * C + 70, GY + 1.5 * C, '6 格', GREY, [3, '六格'], { size: 36 }),
    lbl(GX + 5 * C + 70, GY + 3.5 * C, '3 格', GREY, [3, '三格'], { size: 36 }),
    lbl(GX + 9.5 * C + 10, GY + 7.2 * C, '4 格半', GREY, [4, '四格半'], { size: 36 }),
    lbl(GX + 6 * C + 70, GY + 5.5 * C, '5 格', GREY, [4, '五格'], { size: 36 }),
    lbl(560, 790, '2 号 → 3 号 → 4 号 → 1 号', GREEN, [6, '从短到长'], { font: 'kl', size: 50 }),
    { t: 'stamp', x: 1150, y: 790, s: '从短到长', color: RED, size: 40, rot: -6, at: [6, '一号', 0.4] }
  ]
  bar(e5, GX, GY, C, { no: 1, dir: 'h', cx: 0, cy: 1, len: 6 }, [0, 0.5], { glow: [3, '一号'] })
  bar(e5, GX, GY, C, { no: 2, dir: 'h', cx: 2, cy: 3, len: 3 }, [0, 0.6], { glow: [3, '二号'] })
  bar(e5, GX, GY, C, { no: 3, dir: 'v', cx: 9, cy: 2, len: 4.5, thick: true }, [0, 0.7], { glow: [4, '三号'], glow2: [5, '画得粗'] })
  bar(e5, GX, GY, C, { no: 4, dir: 'h', cx: 1, cy: 5, len: 5 }, [0, 0.8], { glow: [4, '四号'] })
  S.push({
    tag: '第二招 | 数格子',
    beats: [
      { sub: '铅笔要是摆在方格里，没缠绳子呢？', say: '铅笔要是摆在方格里，没缠绳子呢？', rate: '-6%' },
      { sub: '没有圈可数了！', say: '没有圈可数了！', pitch: '+8Hz' },
      { sub: '第二招：数格子。每一格一样大，格子就是尺子。', say: '第二招：数格子。每一格一样大，格子就是尺子。' },
      { sub: '一号六格，二号三格。', say: '一号占六格，二号占三格。' },
      { sub: '三号四格半，半格也要算；四号五格。', say: '三号占四格半，半格也要算上；四号占五格。' },
      { sub: '三号画得粗，粗没有用，只看格数！', say: '三号画得粗，可是粗没有用，只看格数！' },
      { sub: '从短到长：二号、三号、四号、一号。', say: '从短到长：二号、三号、四号、一号。', pause: 1 }
    ],
    els: e5
  })

  /* 6 你来试 2：哪支最长 */
  var e6 = [
    lbl(960, 165, '你来试：哪支铅笔最长？', GREY, [0, 0.2], { size: 46 }),
    gridSVG(GX, GY, 10, 7, C, [0, 0.3]),
    { t: 'slot', id: 'q6', x: 1560, y: 430, size: 120, at: [0, 0.6] },
    lbl(1560, 550, '几号最长？', GREY, [0, 0.7], { size: 36 }),
    { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 3, pulse: 'q6' },
    lbl(GX + 5 * C + 70, GY + 1.5 * C, '5 格', GREY, [2, '一号'], { size: 36 }),
    lbl(GX + 8 * C + 70, GY + 3.5 * C, '7 格', GREY, [2, '二号'], { size: 36 }),
    lbl(GX + 6 * C + 70, GY + 5.5 * C, '4 格', GREY, [2, '三号'], { size: 36 }),
    fill('q6', [2, '最长'], '2'),
    { t: 'stamp', x: 1500, y: 790, s: '答：2 号最长', color: RED, size: 50, rot: -6, at: [2, '最长', 0.5] }
  ]
  bar(e6, GX, GY, C, { no: 1, dir: 'h', cx: 0, cy: 1, len: 5, thick: true }, [0, 0.4], { glow: [2, '一号'] })
  bar(e6, GX, GY, C, { no: 2, dir: 'h', cx: 1, cy: 3, len: 7 }, [0, 0.5], { glow: [2, '二号'] })
  bar(e6, GX, GY, C, { no: 3, dir: 'h', cx: 2, cy: 5, len: 4 }, [0, 0.6], { glow: [2, '三号'] })
  S.push({
    tag: '第二招 | 你来试',
    beats: [
      { sub: '你来试：哪支铅笔最长？', say: '你来试：哪支铅笔最长？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 3 },
      { sub: '一号五格，二号七格，三号四格：**2** 号最长！', say: '一号五格，二号七格，三号四格：二号最长！', pause: 1 }
    ],
    els: e6
  })

  /* 7 冲突 + 第三招：路线分开数（牛牛 斜 3 + 横竖 4；丁丁 斜 3 + 横竖 6） */
  var RX = 300, RC = 72, RY1 = 230, RY2 = 520
  var e7 = [
    { t: 'item', k: 'kid0', x: 190, y: RY1 + 2 * RC - 10, size: 100, at: [0, '牛牛'] },
    lbl(190, RY1 + 2 * RC + 62, '牛牛', BLUE, [0, '牛牛'], { size: 32 }),
    { t: 'item', k: 'kid2', x: 190, y: RY2 + 2 * RC - 10, size: 100, at: [0, '丁丁'] },
    lbl(190, RY2 + 2 * RC + 62, '丁丁', RED, [0, '丁丁'], { size: 32 }),
    gridSVG(RX, RY1, 7, 2, RC, [0, '牛牛']),
    gridSVG(RX, RY2, 7, 2, RC, [0, '丁丁']),
    /* 斜线比边长：一格放大 */
    svg(1170, 230, 300, 210,
      '<rect x="20" y="20" width="150" height="150" fill="#fffaf0" stroke="#b9ad9c" stroke-width="3"/>' +
      '<line x1="20" y1="170" x2="170" y2="170" stroke="' + BLUE + '" stroke-width="10"/>' +
      '<line x1="20" y1="170" x2="170" y2="20" stroke="' + RED + '" stroke-width="10"/>' +
      '<text x="235" y="105" font-family="KL" font-size="32" text-anchor="middle" fill="' + RED + '">斜线</text>' +
      '<text x="235" y="145" font-family="KL" font-size="32" text-anchor="middle" fill="' + RED + '">更长</text>',
      [1, '斜着'], { anim: 'pop', out: [3, '第三招'] }),
    { t: 'stamp', x: 1320, y: 560, s: '数不清了！', color: ORANGE, size: 60, rot: -5, at: [2, '数不清'], out: [3, '第三招'] },
    lbl(1500, 165, '第三招：路线分开数', GREEN, [3, '第三招'], { size: 46 }),
    node(1500, 290, 360, '斜线数一数', RED, [4, '斜线']),
    flowArrow(1500, 326, 384, [5, '横线竖线']),
    node(1500, 420, 360, '横竖线数一数', BLUE, [5, '横线竖线']),
    flowArrow(1500, 456, 514, [6, '一样多']),
    node(1500, 550, 360, '同一种比多少', GREEN, [6, '一样多']),
    lbl(1100, RY1 + RC, '斜 3 · 横竖 4', INK, [5, '牛牛四段'], { size: 36 }),
    lbl(1100, RY2 + RC, '斜 3 · 横竖 6', INK, [5, '丁丁六段'], { size: 36 }),
    { t: 'stamp', x: 1440, y: 760, s: '答：牛牛先到', color: RED, size: 52, rot: -6, at: [7, '先到'] }
  ]
  route(e7, RX, RY1, RC, 2, 'ERREFEE', [0, '牛牛', 0.2], { diagAt: [4, '牛牛三条'], stAt: [5, '牛牛四段', -0.4] })
  route(e7, RX, RY2, RC, 2, 'EUREFDERE', [0, '丁丁', 0.2], { diagAt: [4, '丁丁也是'], stAt: [5, '丁丁六段', -0.4] })
  S.push({
    tag: '第三招 | 路线分开数',
    beats: [
      { sub: '牛牛和丁丁走得一样快，谁先到小旗？', say: '牛牛和丁丁走得一样快，谁先到小旗那里？', rate: '-6%' },
      { sub: '路上有斜着走的，斜线比一格的边长。', say: '路上有斜着走的，斜线比一格的边要长。' },
      { sub: '斜线不能当一格算，数不清了！', say: '斜线不能当一格算，格子数不清了！', pitch: '+8Hz' },
      { sub: '第三招：路线分开数。', say: '第三招：路线分开数。' },
      { sub: '斜线：牛牛三条，丁丁也是三条。', say: '先数斜线：牛牛三条，丁丁也是三条。' },
      { sub: '横线竖线：牛牛四段，丁丁六段。', say: '再数横线竖线：牛牛四段，丁丁六段。' },
      { sub: '斜线一样多，就比横竖线：牛牛少两段。', say: '斜线一样多，就比横竖线：牛牛少两段。' },
      { sub: '牛牛的路短，牛牛先到！', say: '牛牛的路短，牛牛先到！', pause: 1 }
    ],
    els: e7
  })

  /* 8 你来试 3：只有横竖线，拐上拐下（小明 竖 4、小红 竖 2） */
  var e8 = [
    lbl(960, 165, '你来试：小明和小红，谁先到？', GREY, [0, 0.2], { size: 46 }),
    lbl(250, RY1 + 2 * RC, '小明', BLUE, [0, 0.3], { size: 36 }),
    lbl(250, RY2 + 2 * RC, '小红', RED, [0, 0.3], { size: 36 }),
    gridSVG(RX, RY1, 8, 2, RC, [0, 0.3]),
    gridSVG(RX, RY2, 8, 2, RC, [0, 0.3]),
    { t: 'slot', id: 'q8', x: 1600, y: 430, size: 170, at: [0, 0.6] },
    lbl(1600, 570, '谁先到？', GREY, [0, 0.7], { size: 36 }),
    { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 3, pulse: 'q8' },
    fill('q8', [3, '先到'], '<span style="font-size:58%">小红</span>'),
    { t: 'stamp', x: 1500, y: 790, s: '答：小红先到', color: RED, size: 50, rot: -6, at: [3, '先到', 0.4] }
  ]
  route(e8, RX, RY1, RC, 2, 'EEEUUEDDEEEE', [0, 0.4], { stAt: [2, '小明四段'] })
  route(e8, RX, RY2, RC, 2, 'EEUEEDEEEE', [0, 0.5], { stAt: [2, '小红两段'] })
  S.push({
    tag: '第三招 | 你来试',
    beats: [
      { sub: '你来试：小明和小红，谁先到？', say: '你来试：小明和小红，谁先到？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 3 },
      { sub: '横线都是八段；竖线小明四段，小红两段。', say: '横线都是八段；竖线，小明四段，小红两段。' },
      { sub: '小红的路短，小红先到！', say: '小红的路短，小红先到！', pause: 1 }
    ],
    els: e8
  })

  /* 9 挑战：这次用哪一招？两棵树都缠 5 圈，①粗 ②细，哪根长 */
  var e9 = [
    lbl(960, 165, '挑战：两棵树上缠着绳子，哪根长？', GREY, [0, 0.2], { size: 46 }),
    tree(400, 760, 150, [0, 0.3]),
    tree(700, 760, 60, [0, 0.4]),
    lbl(400, 810, '①', INK, [0, 0.3], { font: 'kai', size: 50 }),
    lbl(700, 810, '②', INK, [0, 0.4], { font: 'kai', size: 50 }),
    { t: 'slot', id: 'q9', x: 1580, y: 430, size: 120, at: [0, 0.6] },
    lbl(1580, 550, '第几棵？', GREY, [0, 0.7], { size: 36 }),
    { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q9' },
    lbl(1100, 330, '都是 5 圈', BLUE, [2, '五圈'], { size: 44 }),
    fill('q9', [3, '粗树'], '1'),
    { t: 'stamp', x: 1500, y: 790, s: '答：第 1 棵的绳子长', color: RED, size: 46, rot: -6, at: [3, '长', 0.4] }
  ]
  treeWraps(e9, 400, 760, 150, 5, [0, 0.3], { glow: [2, '五圈', -0.5] })
  treeWraps(e9, 700, 760, 60, 5, [0, 0.4], { glow: [2, '五圈', -0.3] })
  S.push({
    tag: '挑战 | 这次用哪一招？',
    beats: [
      { sub: '挑战题：两棵树上缠着绳子，哪根长？', say: '挑战题：两棵树上缠着绳子，哪根长？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', rate: '-6%', pause: 5 },
      { sub: '绳子缠起来，用第一招：都是五圈。', say: '绳子缠起来，用第一招：都是五圈。' },
      { sub: '圈数一样，看粗细：粗树上的长！', say: '圈数一样，就看粗细：粗树上的长！', pause: 1 }
    ],
    els: e9
  })

  /* 10 口诀（讲解页原文） */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '眼睛会骗人，比长短靠办法；', say: '眼睛会骗人，比长短靠办法；', rate: '-15%' },
      { sub: '先看粗细再数圈，方格里面数格子；', say: '先看粗细再数圈，方格里面数格子；', rate: '-15%' },
      { sub: '路线横竖斜线分开数。', say: '路线横竖斜线分开数。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 470, w: 1500, h: 480, at: 0 },
      { t: 'chant', x: 960, y: 340, s: '眼睛会骗人，比长短靠办法；', color: INK, size: 64, at: 1 },
      { t: 'chant', x: 960, y: 480, s: '先看粗细再数圈，方格里面数格子；', color: BLUE, size: 64, at: 2 },
      { t: 'chant', x: 960, y: 620, s: '路线横竖斜线分开数。', color: GREEN, size: 64, at: 3 }
    ]
  })

  /* 11 结尾：回到知识地图 + 拓展想一想 + 下一课 */
  var e11 = mapEls(0, true).concat([
    { t: 'item', k: 'apple', x: 760, y: 780, size: 110, at: [2, '两样东西'], out: [3, '天平'] },
    { t: 'item', k: 'melon', x: 1160, y: 780, size: 130, at: [2, '两样东西', 0.2], out: [3, '天平'] },
    lbl(960, 780, '谁重？', RED, [2, '谁重'], { size: 56, out: [3, '天平'] }),
    { t: 'card', x: 960, y: 790, title: '下一课 · B02', sub: '用天平比轻重', color: ORANGE, at: [3, '天平'], out: 4 },
    { t: 'tape', x: 960, y: 790, s: '去练习纸上试试吧！', size: 50, at: [4, '练习纸'] }
  ])
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天学会了三招：', say: '今天，我们学会了三招：' },
      { sub: '绳子数圈看粗细，方格数格子，路线分开数。', say: '绳子缠起来，数圈看粗细；方格里，数格子；路线，分开数。' },
      { sub: '想一想：两样东西拿不到一起，怎么比谁重？', say: '想一想：两样东西拿不到一起，怎么比谁重？', rate: '-6%', pause: 1 },
      { sub: '下一课，我们用天平来比轻重！', say: '下一课，我们用天平来比轻重！', pitch: '+4Hz' },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: e11
  })

  /* 封面 */
  var cv = [
    { t: 'txt', x: 960, y: 130, s: '奥数 · L1 补充 · B01 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
    { t: 'tape', x: 960, y: 270, s: '推理比较：比长短', size: 120, at: 0 },
    { t: 'txt', x: 960, y: 420, s: '眼睛会骗人，比长短靠办法', size: 58, color: RED, font: 'kl', at: 0 },
    arrowLine(600, 960, 560, true, 0),
    arrowLine(600, 960, 720, false, 0),
    { t: 'seg', x1: 600, y1: 490, x2: 600, y2: 790, color: RED, sw: 5, dashed: true, at: 0 },
    { t: 'seg', x1: 960, y1: 490, x2: 960, y2: 790, color: RED, sw: 5, dashed: true, at: 0 },
    { t: 'stamp', x: 1380, y: 640, s: '一样长！', color: ORANGE, size: 72, rot: -6, at: 0, sfx: false },
    { t: 'txt', x: 960, y: 880, s: '数圈数 · 数格子 · 路线分开数', size: 50, color: GREEN, font: 'kl', at: 0 }
  ]
  S.cover = { tag: null, els: cv }

  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
