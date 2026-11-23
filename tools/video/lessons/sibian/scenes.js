/* B14 平面图形：认识四边形 · 讲解视频分镜 v1（L1 补充第十四课，新结构，三招）
 * 开场直接进题（不提上一课、结尾不预告）。
 * 引入：茶叶罐的底面是圆 → 压扁、切一块变成什么？四条边围成的又叫什么？
 * 知识地图：弯弯的图形 → ① 和圆比一比；四边形 → ② 找对边平行；平移 → ③ 比方向。
 * 第一招：圆、椭圆、扇形；例题；你来试（缺一小块的扇形）。
 * 第二招：冲突「四边形长得都不一样」→ 对边平行（B11 学过）；梯形 / 平行四边形；小心：长方形、正方形、菱形也是平行四边形；钉子板例题；你来试：选点连平行四边形。
 * 第三招：平移只挪位置，不转不翻不变大；例题；你来试。
 * 挑战：直角梯形是平行四边形吗？口诀 → 知识地图 → 拓展：正方形是梯形吗？→ 去练习纸。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420'
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
  function f(x) { return Math.round(x * 10) / 10 }
  function num(cx, y, i, at) { return lbl(cx, y, CIRC[i], INK, at, { size: 50, font: 'num' }) }

  /* ---------- 弯弯的图形（局部 w×h 格子里居中） ---------- */
  function circleH(cx, cy, r) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + INK + '" stroke-width="10"/>' }
  function ellipseH(cx, cy, rx, ry, rot) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + (rot || 0) + ' ' + cx + ' ' + cy + ')" fill="none" stroke="' + INK + '" stroke-width="10"/>' }
  function sectorH(cx, cy, r, a0, span, col) {
    var a = a0 * Math.PI / 180, b = (a0 + span) * Math.PI / 180
    var p0 = [cx + r * Math.cos(a), cy - r * Math.sin(a)], p1 = [cx + r * Math.cos(b), cy - r * Math.sin(b)]
    return '<path d="M' + cx + ' ' + cy + ' L' + f(p0[0]) + ' ' + f(p0[1]) + ' A' + r + ' ' + r + ' 0 ' + (span > 180 ? 1 : 0) + ' 0 ' + f(p1[0]) + ' ' + f(p1[1]) + ' Z" fill="none" stroke="' + (col || INK) + '" stroke-width="10" stroke-linejoin="round"/>'
  }
  function cell(cx, cy, inner, at, o) {
    o = o || {}
    return svg(cx - 110, cy - 95, 220, 190, inner, at, { anim: 'pop', glow: o.glow, glow2: o.glow2, dim: o.dim, out: o.out })
  }

  /* ---------- 钉子板上的多边形 ---------- */
  function polyH(P, o) {
    o = o || {}
    var h = ''
    for (var i = 0; i < P.length; i++) {
      var a = P[i], b = P[(i + 1) % P.length]
      var c = (o.sideCol && o.sideCol[i]) || o.color || INK
      h += '<path d="M' + f(a[0]) + ' ' + f(a[1]) + ' L' + f(b[0]) + ' ' + f(b[1]) + '" stroke="' + c + '" stroke-width="' + (o.sw || 10) + '" stroke-linecap="round" fill="none"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + '/>'
    }
    return h
  }
  function board(cx, cy, cols, rows, sp, T, at, o) {
    o = o || {}
    var pad = 40, w = (cols - 1) * sp + pad * 2, h = (rows - 1) * sp + pad * 2
    function px(q) { return [pad + q[0] * sp, pad + q[1] * sp] }
    var html = ''
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) html += '<circle cx="' + (pad + x * sp) + '" cy="' + (pad + y * sp) + '" r="6" fill="' + GREY + '"/>'
    if (o.extra) html += o.extra(px)
    if (T) html += polyH(T.map(px), o)
    if (o.after) html += o.after(px)
    return svg(cx - w / 2, cy - h / 2, w, h, html, at, { anim: o.anim || 'pop', glow: o.glow, glow2: o.glow2, dim: o.dim, out: o.out })
  }

  var S = []

  /* ---------- 0 开场 ---------- */
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '今天，我们来认识四边形！', say: '今天，我们来认识四边形！' }
    ],
    els: [
      { t: 'txt', x: 960, y: 200, s: '奥数 · L1 补充 · B14', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
      { t: 'tape', x: 960, y: 330, s: '平面图形：认识四边形', size: 96, at: [0, 0.2] },
      lbl(960, 560, '圆 · 椭圆 · 扇形 · 梯形 · 平行四边形 · 平移', GREY, [1, '四边形'], { size: 50 })
    ]
  })

  /* ---------- 1 引入：茶叶罐 ---------- */
  var can = '<ellipse cx="150" cy="60" rx="110" ry="34" fill="#fffaf0" stroke="' + INK + '" stroke-width="9"/>' +
    '<path d="M40 60 L40 330 A110 34 0 0 0 260 330 L260 60" fill="none" stroke="' + INK + '" stroke-width="9"/>' +
    '<path d="M40 130 L260 130" stroke="' + GREEN + '" stroke-width="7"/><path d="M40 260 L260 260" stroke="' + GREEN + '" stroke-width="7"/>'
  S.push({
    tag: '先想一想',
    beats: [
      { sub: '茶叶罐是立体的，可它的底面，是一个平平的圆。', say: '茶叶罐是立体的，可它的底面，是一个平平的圆。' },
      { sub: '把圆压扁一点、切掉一块，会变成什么？', say: '把圆压扁一点、切掉一块，会变成什么？', rate: '-6%' },
      { sub: '四条边围成的图形，又叫什么呢？', say: '四条边围成的图形，又叫什么呢？', rate: '-6%', pitch: '+5Hz', pause: 0.6 }
    ],
    els: [
      svg(160, 220, 300, 400, can, [0, '茶叶罐'], { anim: 'pop' }),
      svg(560, 330, 220, 220, circleH(110, 110, 90), [0, '平平的圆'], { anim: 'pop', glow: [0, '圆'] }),
      { t: 'harrow', x1: 470, x2: 550, y: 440, color: GREY, at: [0, '底面'] },
      svg(860, 330, 220, 220, ellipseH(110, 110, 100, 60), [1, '压扁'], { anim: 'pop' }),
      svg(1110, 330, 220, 220, sectorH(110, 110, 95, 30, 290), [1, '切掉'], { anim: 'pop' }),
      lbl(1010, 280, '？', ORANGE, [1, '变成什么'], { size: 80 }),
      svg(1390, 330, 260, 220, polyH([[20, 190], [240, 190], [190, 40], [70, 40]]), [2, '四条边'], { anim: 'pop' }),
      svg(1640, 330, 260, 220, polyH([[20, 190], [180, 190], [240, 40], [80, 40]]), [2, '四条边', 0.3], { anim: 'pop' }),
      lbl(1650, 280, '？', ORANGE, [2, '叫什么'], { size: 80 })
    ]
  })

  /* ---------- 2 知识地图 ---------- */
  var MX = [420, 960, 1500]
  function mapEls(at, lit) {
    return [
      node(960, 210, 340, '认识四边形', INK, at, { size: 50 }),
      line2(960, 252, MX[0], 360, lit ? at : [0, '弯弯的']),
      line2(960, 252, MX[1], 360, lit ? at : [0, '四边形']),
      line2(960, 252, MX[2], 360, lit ? at : [0, '平移']),
      node(MX[0], 405, 420, '圆、椭圆、扇形', BLUE, lit ? at : [0, '弯弯的'], { size: 42 }),
      node(MX[1], 405, 420, '梯形、平行四边形', RED, lit ? at : [0, '四边形'], { size: 42 }),
      node(MX[2], 405, 420, '能平移重合吗', GREEN, lit ? at : [0, '平移'], { size: 42 }),
      flowArrow(MX[0], 452, 540, lit ? at : [1, '每种', 0.2]),
      flowArrow(MX[1], 452, 540, lit ? at : [1, '每种', 0.6]),
      flowArrow(MX[2], 452, 540, lit ? at : [1, '每种', 1.0]),
      node(MX[0], 595, 380, '① 和圆比一比', BLUE, lit ? at : [1, '每种', 0.2], { size: 40, glow: lit ? [0, '三招', 0.4] : undefined }),
      node(MX[1], 595, 380, '② 找对边平行', RED, lit ? at : [1, '每种', 0.6], { size: 40, glow: lit ? [0, '三招', 0.8] : undefined }),
      node(MX[2], 595, 380, '③ 平移比方向', GREEN, lit ? at : [1, '每种', 1.0], { size: 40, glow: lit ? [0, '三招', 1.2] : undefined })
    ]
  }
  S.push({
    tag: '认识四边形 | 三种题',
    beats: [
      { sub: '今天三种题：弯弯的图形、四边形，还有平移。', say: '今天三种题：弯弯的图形、四边形，还有平移。' },
      { sub: '每种一招，一招一招来学！', say: '每种一招，一招一招来学！' }
    ],
    els: mapEls(0, false)
  })

  /* ---------- 3 第一招：圆、椭圆、扇形 ---------- */
  var CX3 = [400, 960, 1520]
  S.push({
    tag: '第一招 | 和圆比一比',
    beats: [
      { sub: '第一招：和圆比一比。圆圆的，是圆；', say: '第一招：和圆比一比。圆圆的，是圆；' },
      { sub: '像圆被压扁了，一边宽一边窄，是椭圆；', say: '像圆被压扁了，一边宽一边窄，是椭圆；' },
      { sub: '缺了一块，两条直边、一条弯边，是扇形。', say: '缺了一块，两条直边、一条弯边，是扇形。', pause: 0.6 }
    ],
    els: [
      svg(CX3[0] - 130, 300, 260, 260, circleH(130, 130, 110), [0, '是圆'], { anim: 'pop', glow: [0, '圆圆的'] }),
      lbl(CX3[0], 640, '圆', INK, [0, '是圆'], { size: 56 }),
      svg(CX3[1] - 160, 300, 320, 260, ellipseH(160, 130, 150, 85), [1, '压扁'], { anim: 'pop', glow: [1, '一边宽'] }),
      lbl(CX3[1], 640, '椭圆', BLUE, [1, '是椭圆'], { size: 56 }),
      svg(CX3[2] - 130, 300, 260, 260, sectorH(60, 200, 170, 0, 70, ORANGE), [2, '缺了一块'], { anim: 'pop', glow: [2, '两条直边'] }),
      lbl(CX3[2], 640, '扇形', ORANGE, [2, '是扇形'], { size: 56 })
    ]
  })

  /* ---------- 4 第一招 · 例题 ---------- */
  var CX4 = [300, 630, 960, 1290, 1620], CY4 = 400
  var it4 = [ellipseH(110, 95, 85, 50, 30), circleH(110, 95, 70), sectorH(70, 135, 115, 10, 70), ellipseH(110, 95, 50, 85, 0), sectorH(110, 95, 70, 30, 290)]
  var g4 = [[2, '一号'], [1, '二号'], [3, '三号'], [2, '四号'], [3, '五号']]
  var els4 = []
  it4.forEach(function (h, i) {
    els4.push(cell(CX4[i], CY4, h, [0, 0.3 + 0.15 * i], { glow: g4[i] }))
    els4.push(num(CX4[i], CY4 + 140, i, [0, 0.3 + 0.15 * i]))
  })
  S.push({
    tag: '第一招 | 例题',
    beats: [
      { sub: '哪些是圆、椭圆、扇形？', say: '哪些是圆、椭圆、扇形？', rate: '-6%' },
      { sub: '② 圆圆的，是圆；', say: '二号圆圆的，是圆；' },
      { sub: '① 和 ④ 被压扁了，转个方向也是椭圆；', say: '一号和四号被压扁了，转个方向，也是椭圆；' },
      { sub: '③ 和 ⑤ 缺了一块，是扇形。缺一小块也算！', say: '三号和五号缺了一块，是扇形。缺一小块，也算！', pause: 1 }
    ],
    els: els4.concat([
      { t: 'stamp', x: 960, y: 790, s: '圆 ②　椭圆 ①④　扇形 ③⑤', color: RED, size: 56, rot: -3, at: [3, '也算'] }
    ])
  })

  /* ---------- 5 你来试 1 ---------- */
  S.push({
    tag: '第一招 | 你来试',
    beats: [
      { sub: '你来试：这个像吃豆人的图形，是什么？', say: '你来试：这个像吃豆人的图形，是什么？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '两条直边、一条弯边，缺了一小块：扇形！', say: '两条直边、一条弯边，缺了一小块：扇形！', pause: 1 }
    ],
    els: [
      svg(410, 260, 300, 300, sectorH(150, 150, 130, 35, 290), [0, '吃豆人'], { anim: 'pop', glow: [2, '两条直边'] }),
      { t: 'slot', id: 'q5', x: 1500, y: 420, size: 200, at: [0, '是什么'] },
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q5' },
      fill('q5', [2, '扇形'], '<span style="font-size:58%">扇形</span>')
    ]
  })

  /* ---------- 7 第二招：对边平行 ---------- */
  var Q7a = [[0, 3], [4, 3], [3, 1], [1, 1]], Q7b = [[0, 3], [3, 3], [4, 1], [1, 1]]
  S.push({
    tag: '第二招 | 找对边平行',
    beats: [
      { sub: '四边形样子都不一样，怎么分？', say: '四边形样子都不一样，怎么分？', pitch: '+5Hz' },
      { sub: '第二招：找对边平行！平行就是永远碰不到。', say: '第二招：找对边平行！平行，就是永远碰不到。' },
      { sub: '只有一组对边平行，叫梯形；', say: '只有一组对边平行，叫梯形；' },
      { sub: '两组对边都平行，叫平行四边形。', say: '两组对边都平行，叫平行四边形。', pause: 0.6 }
    ],
    els: [
      board(560, 420, 5, 4, 100, Q7a, [0, 0.2], {}),
      board(1360, 420, 5, 4, 100, Q7b, [0, 0.4], {}),
      lbl(960, 200, '平行（B11 学过）', GREY, [1, '平行'], { size: 44 }),
      board(560, 420, 5, 4, 100, Q7a, [2, '一组'], { anim: 'fade', sideCol: [RED, null, RED, null], glow: [2, '一组'] }),
      lbl(560, 700, '梯形', RED, [2, '叫梯形'], { size: 60 }),
      board(1360, 420, 5, 4, 100, Q7b, [3, '两组'], { anim: 'fade', sideCol: [RED, BLUE, RED, BLUE], glow: [3, '两组'] }),
      lbl(1360, 700, '平行四边形', BLUE, [3, '叫平行'], { size: 60 })
    ]
  })

  /* ---------- 8 第二招：流程 + 小心 ---------- */
  function famH() {
    return '<rect x="6" y="6" width="988" height="268" rx="30" fill="none" stroke="' + BLUE + '" stroke-width="5" stroke-dasharray="16 10"/>' +
      polyH([[60, 220], [220, 220], [270, 80], [110, 80]]) +
      '<rect x="320" y="90" width="200" height="130" fill="none" stroke="' + INK + '" stroke-width="10"/>' +
      '<rect x="580" y="90" width="130" height="130" fill="none" stroke="' + INK + '" stroke-width="10"/>' +
      polyH([[850, 70], [930, 155], [850, 240], [770, 155]])
  }
  S.push({
    tag: '第二招 | 怎么分',
    beats: [
      { sub: '数一数：平行的对边有几组？', say: '数一数：平行的对边有几组？' },
      { sub: '一组是梯形，两组是平行四边形。', say: '一组是梯形，两组是平行四边形。' },
      { sub: '小心：长方形、正方形、菱形，两组对边都平行，', say: '小心：长方形、正方形、菱形，两组对边都平行，' },
      { sub: '它们都是平行四边形！', say: '它们都是平行四边形！', pitch: '+5Hz', pause: 0.8 }
    ],
    els: [
      node(960, 160, 420, '平行的对边有几组？', INK, [0, '几组'], { size: 42 }),
      line2(860, 202, 560, 300, [1, '一组']), line2(1060, 202, 1360, 300, [1, '两组']),
      node(560, 345, 300, '一组：梯形', RED, [1, '一组'], { size: 42 }),
      node(1360, 345, 380, '两组：平行四边形', BLUE, [1, '两组'], { size: 42, glow: [3, '它们'] }),
      svg(460, 450, 1000, 280, famH(), [2, '小心'], { anim: 'pop', glow: [3, '都是'] }),
      lbl(625, 770, '平行四边形', INK, [2, '小心'], { size: 36 }),
      lbl(880, 770, '长方形', INK, [2, '长方形'], { size: 40 }),
      lbl(1105, 770, '正方形', INK, [2, '正方形'], { size: 40 }),
      lbl(1310, 770, '菱形', INK, [2, '菱形'], { size: 40 })
    ]
  })

  /* ---------- 9 第二招 · 例题（钉子板） ---------- */
  var Q9 = [[[0, 3], [4, 3], [3, 1], [1, 1]], [[0, 0], [3, 0], [3, 2], [0, 2]], [[0, 3], [3, 3], [3, 1], [1, 1]], [[0, 2], [3, 2], [4, 0], [1, 0]]]
  var CX9 = [300, 740, 1180, 1620], CY9 = 400
  var els9 = []
  Q9.forEach(function (Q, i) {
    els9.push(board(CX9[i], CY9, 5, 4, 56, Q, [0, 0.3 + 0.15 * i], { glow: [[1, '一号'], [2, '二号'], [1, '三号'], [2, '四号']][i] }))
    els9.push(num(CX9[i], CY9 + 150, i, [0, 0.3 + 0.15 * i]))
  })
  S.push({
    tag: '第二招 | 例题',
    beats: [
      { sub: '哪些是梯形、平行四边形？', say: '哪些是梯形、平行四边形？', rate: '-6%' },
      { sub: '① 和 ③ 只有上下一组平行：梯形；', say: '一号和三号，只有上下一组平行：梯形；' },
      { sub: '② 和 ④ 两组都平行，长方形 ② 也算：平行四边形！', say: '二号和四号两组都平行，长方形二号也算：平行四边形！', pause: 1 }
    ],
    els: els9.concat([
      lbl(CX9[0], 650, '梯形', RED, [1, '梯形'], { size: 46 }), lbl(CX9[2], 650, '梯形', RED, [1, '梯形'], { size: 46 }),
      lbl(CX9[1], 650, '平行四边形', BLUE, [2, '平行四边形'], { size: 42 }), lbl(CX9[3], 650, '平行四边形', BLUE, [2, '平行四边形'], { size: 42 }),
      { t: 'stamp', x: 960, y: 790, s: '梯形 ①③　平行四边形 ②④', color: RED, size: 54, rot: -3, at: [2, '平行四边形', 0.6] }
    ])
  })

  /* ---------- 10 你来试 2：选点围平行四边形 ---------- */
  var A10 = [1, 1], B10 = [1, 3], C10 = [4, 3], D10 = [[4, 1], [6, 0], [3, 0]]
  function abcH(px) {
    var a = px(A10), b = px(B10), c = px(C10)
    return '<path d="M' + a.join(' ') + ' L' + b.join(' ') + ' L' + c.join(' ') + '" stroke="' + INK + '" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      [a, b, c].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="13" fill="' + INK + '"/>' }).join('') +
      '<text x="' + (a[0] - 38) + '" y="' + (a[1] + 16) + '" font-family="Num" font-size="48" text-anchor="middle" fill="' + INK + '">A</text>' +
      '<text x="' + (b[0] - 38) + '" y="' + (b[1] + 16) + '" font-family="Num" font-size="48" text-anchor="middle" fill="' + INK + '">B</text>' +
      '<text x="' + (c[0] + 10) + '" y="' + (c[1] + 54) + '" font-family="Num" font-size="48" text-anchor="middle" fill="' + INK + '">C</text>'
  }
  function candH(px, hit) {
    return D10.map(function (q, i) {
      var p = px(q)
      return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="15" fill="#fffaf0" stroke="' + (hit === i ? RED : INK) + '" stroke-width="5"/>' +
        '<text x="' + (p[0] + 36) + '" y="' + (p[1] + 52) + '" font-family="Num" font-size="44" text-anchor="middle" fill="' + INK + '">' + CIRC[i] + '</text>'
    }).join('')
  }
  function link(i, color, dash) {
    return function (px) {
      var a = px(A10), c = px(C10), d = px(D10[i])
      return '<path d="M' + a.join(' ') + ' L' + d.join(' ') + ' L' + c.join(' ') + '" stroke="' + color + '" stroke-width="7" fill="none" stroke-linecap="round"' + (dash ? ' stroke-dasharray="14 12"' : '') + '/>'
    }
  }
  S.push({
    tag: '第二招 | 你来试',
    beats: [
      { sub: '你来试：哪个点和 A、C 连成平行四边形？', say: '你来试：哪个点和 A、C 连起来，是平行四边形？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '连一连：① 连出来，两组对边都平行！', say: '连一连：一号连出来，两组对边都平行！', pause: 1 }
    ],
    els: [
      board(560, 440, 7, 5, 100, null, [0, '你来试'], { after: function (px) { return abcH(px) + candH(px) } }),
      board(560, 440, 7, 5, 100, null, [2, '连一连'], {
        anim: 'fade',
        extra: function (px) { return link(1, GREY, true)(px) + link(2, GREY, true)(px) + link(0, RED)(px) },
        after: function (px) { return abcH(px) + candH(px, 0) },
        glow: [2, '都平行']
      }),
      { t: 'slot', id: 'q10', x: 1560, y: 420, size: 200, at: [0, '哪个点'] },
      { t: 'think', x: 1250, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q10' },
      fill('q10', [2, '一号'], '①')
    ]
  })

  /* ---------- 12 第三招：平移 ---------- */
  var T12 = [[0, 2], [2, 2], [0, 0]]
  S.push({
    tag: '第三招 | 平移比方向',
    beats: [
      { sub: '这两个三角形，形状一样，挪过去能重合吗？', say: '这两个三角形，形状一样，挪过去能重合吗？', rate: '-6%' },
      { sub: '第三招：平移只挪位置，不转、不翻、不变大。', say: '第三招：平移只挪位置，不转、不翻、不变大。' },
      { sub: '这个转了方向，平移不过去！', say: '这个转了方向，平移不过去！', pitch: '+5Hz' },
      { sub: '方向一样的，才能平移重合。', say: '方向一样的，才能平移重合。', pause: 0.6 }
    ],
    els: [
      board(960, 420, 12, 4, 100, null, [0, 0.2], {
        after: function (px) {
          return polyH(T12.map(px), { color: BLUE }) + polyH([px([4, 0]), px([6, 0]), px([6, 2])], { color: ORANGE })
        }
      }),
      lbl(510, 200, '原来', BLUE, [0, 0.4], { size: 44 }),
      cross(960, 420, [2, '转了方向']),
      board(960, 420, 12, 4, 100, null, [3, '方向一样'], {
        anim: 'fade',
        after: function (px) { return polyH([px([9, 2]), px([11, 2]), px([9, 0])], { color: GREEN, dash: '20 12' }) },
        glow: [3, '平移重合']
      }),
      { t: 'harrow', x1: 520, x2: 1320, y: 690, color: GREEN, at: [3, '方向一样'] },
      lbl(920, 650, '平移', GREEN, [3, '平移'], { size: 46 })
    ]
  })

  /* ---------- 13 第三招 · 例题 ---------- */
  var P13 = [[0, 2], [3, 2], [1, 0]]
  function rotP(P) { var m = Math.max.apply(null, P.map(function (p) { return p[1] })); return P.map(function (p) { return [m - p[1], p[0]] }) }
  function flipP(P) { var m = Math.max.apply(null, P.map(function (p) { return p[0] })); return P.map(function (p) { return [m - p[0], p[1]] }) }
  function shift(P, dx, dy) { return P.map(function (p) { return [p[0] + dx, p[1] + dy] }) }
  var V13 = [shift(P13, 0, 1), shift(rotP(P13), 1, 0), shift(P13, 1, 0), shift(flipP(P13), 0, 1), shift(P13, 1, 1)]
  var CX13 = [300, 630, 960, 1290, 1620], CY13 = 400
  var els13 = []
  V13.forEach(function (Q, i) {
    els13.push(board(CX13[i], CY13, 5, 4, 56, Q, [0, 0.3 + 0.15 * i], { color: i === 0 ? BLUE : INK, glow: [undefined, [1, '二号'], [2, '三号'], [1, '四号'], [2, '五号']][i] }))
    els13.push(num(CX13[i], CY13 + 150, i, [0, 0.3 + 0.15 * i]))
  })
  S.push({
    tag: '第三招 | 例题',
    beats: [
      { sub: '哪些和 ① 平移后能完全重合？', say: '哪些和一号，平移后能完全重合？', rate: '-6%' },
      { sub: '② 转了方向，④ 翻过来了，都不行；', say: '二号转了方向，四号翻过来了，都不行；' },
      { sub: '③ 和 ⑤ 只是位置变了：能重合！', say: '三号和五号，只是位置变了：能重合！', pause: 1 }
    ],
    els: els13.concat([
      cross(CX13[1], CY13, [1, '转了方向', 0.3]), cross(CX13[3], CY13, [1, '翻过来', 0.3]),
      { t: 'stamp', x: 960, y: 790, s: '能重合：③⑤', color: RED, size: 64, rot: -3, at: [2, '能重合'] }
    ])
  })

  /* ---------- 14 你来试 3 ---------- */
  var P14 = [[0, 1], [2, 2], [3, 0], [1, 0]]
  var V14 = [shift(P14, 0, 1), shift(flipP(P14), 1, 1), shift(P14, 1, 0), shift(rotP(P14), 1, 0)]
  var CX14 = [300, 640, 980, 1320], els14 = []
  V14.forEach(function (Q, i) {
    els14.push(board(CX14[i], 400, 5, 4, 56, Q, [0, 0.3 + 0.15 * i], { color: i === 0 ? BLUE : INK, glow: i === 2 ? [2, '三号'] : undefined }))
    els14.push(num(CX14[i], 550, i, [0, 0.3 + 0.15 * i]))
  })
  S.push({
    tag: '第三招 | 你来试',
    beats: [
      { sub: '你来试：哪个和 ① 平移后能重合？', say: '你来试：哪个和一号，平移后能重合？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '③！形状、大小、方向都一样。', say: '三号！形状、大小、方向都一样。', pause: 1 }
    ],
    els: els14.concat([
      { t: 'slot', id: 'q14', x: 1700, y: 420, size: 200, at: [0, '哪个'] },
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q14' },
      fill('q14', [2, '三号'], '③')
    ])
  })

  /* ---------- 16 挑战：直角梯形 ---------- */
  var Q16 = [[0, 3], [4, 3], [2, 1], [0, 1]]
  S.push({
    tag: '挑战 | 这次用哪一招？',
    beats: [
      { sub: '挑战：这个图形，是平行四边形吗？', say: '挑战：这个图形，是平行四边形吗？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', rate: '-6%', pause: 5 },
      { sub: '找对边平行：上下平行，左右不平行。', say: '找对边平行：上下平行，左右不平行。' },
      { sub: '只有一组：它是梯形，不是平行四边形！', say: '只有一组：它是梯形，不是平行四边形！', pitch: '+5Hz', pause: 1 }
    ],
    els: [
      board(560, 440, 5, 4, 100, Q16, [0, 0.2], {}),
      board(560, 440, 5, 4, 100, Q16, [2, '上下'], { anim: 'fade', sideCol: [RED, ORANGE, RED, ORANGE], glow: [2, '上下平行'], glow2: [2, '不平行'] }),
      { t: 'slot', id: 'q16', x: 1500, y: 400, size: 220, at: [0, '是平行四边形吗'] },
      { t: 'think', x: 1250, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q16' },
      fill('q16', [3, '它是梯形'], '<span style="font-size:58%">梯形</span>')
    ]
  })

  /* ---------- 17 口诀 ---------- */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住口诀：圆被压扁是椭圆，缺了一块是扇形；', say: '记住口诀：圆被压扁是椭圆，缺了一块是扇形；', rate: '-10%' },
      { sub: '一组对边平行是梯形，两组对边平行是平行四边形；', say: '一组对边平行是梯形，两组对边平行是平行四边形；', rate: '-10%' },
      { sub: '长方形、正方形、菱形，都是平行四边形；', say: '长方形、正方形、菱形，都是平行四边形；', rate: '-10%' },
      { sub: '平移只挪位置，不转不翻不变大。', say: '平移只挪位置，不转不翻不变大。', rate: '-10%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 470, w: 1700, h: 560, at: 0 },
      { t: 'chant', x: 960, y: 290, s: '圆被压扁是椭圆，缺了一块是扇形；', color: BLUE, size: 50, at: [0, '圆被'] },
      { t: 'chant', x: 960, y: 410, s: '一组对边平行是梯形，两组对边平行是平行四边形；', color: RED, size: 46, at: 1 },
      { t: 'chant', x: 960, y: 530, s: '长方形、正方形、菱形，都是平行四边形；', color: RED, size: 48, at: 2 },
      { t: 'chant', x: 960, y: 650, s: '平移只挪位置，不转不翻不变大。', color: GREEN, size: 50, at: 3 }
    ]
  })

  /* ---------- 18 结尾 ---------- */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天学会了三招！', say: '今天学会了三招！' },
      { sub: '想一想：正方形，是不是梯形？', say: '想一想：正方形，是不是梯形？', rate: '-6%', pause: 1.5 },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: mapEls(0, true).concat([
      { t: 'check', x: MX[0] + 226, y: 590, at: 0, sfx: false },
      { t: 'check', x: MX[1] + 226, y: 590, at: 0, sfx: false },
      { t: 'check', x: MX[2] + 226, y: 590, at: 0, sfx: false },
      lbl(960, 760, '正方形，是不是梯形？', RED, [1, '想一想'], { size: 52, out: [2, 0] }),
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
    for (var k = 0; k < n; k++) e.push({ t: 'check', x: MX[k] + 226, y: 590, at: k === n - 1 ? [0, '学会', 0.3] : 0, sfx: k === n - 1 ? undefined : false })
    var say = ['第一招学会了！还有两招。', '第二招也学会了！还剩最后一招。', '三招都学会了！来个挑战！'][n - 1]
    return { tag: '认识四边形 | 学到哪了', beats: [{ sub: say, say: say, pitch: '+5Hz', pause: 0.4 }], els: e }
  }
  /* 0 开场 1 引入 2 地图 3 第一招 4 例题 5 你来试1 | 6 对边平行 7 流程 8 例题 9 你来试2 | 10 平移 11 例题 12 你来试3 | 13 挑战 14 口诀 15 结尾 */
  S.splice(13, 0, mapScene(3))
  S.splice(10, 0, mapScene(2))
  S.splice(6, 0, mapScene(1))

  S.cover = {
    tag: null,
    els: [
      { t: 'txt', x: 960, y: 130, s: '奥数 · L1 补充 · B14 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
      { t: 'tape', x: 960, y: 270, s: '平面图形：认识四边形', size: 104, at: 0 },
      { t: 'txt', x: 960, y: 410, s: '一组对边平行是梯形，两组是平行四边形', size: 54, color: RED, font: 'kl', at: 0 },
      svg(160, 560, 280, 280, ellipseH(140, 140, 120, 75, 0), 0, {}),
      lbl(300, 880, '椭圆', BLUE, 0, { size: 50 }),
      svg(500, 560, 280, 280, sectorH(70, 230, 200, 10, 65, INK), 0, {}),
      lbl(640, 880, '扇形', ORANGE, 0, { size: 50 }),
      svg(860, 600, 400, 240, polyH([[20, 210], [380, 210], [290, 40], [110, 40]], { sideCol: [RED, null, RED, null] }), 0, {}),
      lbl(1060, 880, '梯形', RED, 0, { size: 50 }),
      svg(1340, 600, 420, 240, polyH([[20, 210], [300, 210], [400, 40], [120, 40]], { sideCol: [RED, BLUE, RED, BLUE] }), 0, {}),
      lbl(1550, 880, '平行四边形', BLUE, 0, { size: 50 })
    ]
  }
  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
