/* 15 火柴棒游戏 · 讲解视频分镜 v1（对标 08；关键动作用 [beat, '关键词'] 对齐配音）
 * 两招：第一招「头一个整摆，后面靠着添」（3 + 2 + 2 + …）；第二招「挨着一处，省下一根」（分开摆多用 = 挨着的处数 = 个数 − 1）。
 * 例题：4 个连排三角形 → 3 + 2 + 2 + 2 = 9 根；数一数正好 9 根。
 *       4 个三角形，分开摆 3+3+3+3 = 12 根，连排有 3 处挨着 → 12 − 3 = 9，分开摆多用 3 根。
 * 小挑战：5 个连排正方形 → 4 + 3 + 3 + 3 + 3 = 16；验：分开 20 根 − 4 处 = 16。
 *         6 个三角形，分开摆比连排多用几根 → 5 处挨着，多用 5 根；验：18 − 13 = 5。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420'

  function stagger(at, d) {
    if (!Array.isArray(at)) return [at, d]
    if (typeof at[1] === 'string') return [at[0], at[1], (at[2] || 0) + d]
    return [at[0], (at[1] || 0) + d]
  }
  function lbl(x, y, s, color, at, o) {
    o = o || {}
    return { t: 'txt', id: o.id, x: x, y: y, s: s, size: o.size || 40, font: o.font || 'kai', color: color || GREY, at: at, out: o.out, anim: o.anim, glow: o.glow, glow2: o.glow2, rot: o.rot, overlapOk: o.overlapOk }
  }
  function fill(id, at, val) { return { t: 'fill', id: id, at: at, val: val } }

  /* ---------- 火柴 ---------- */
  /* 火柴头朝向：横的朝右，斜的、竖的朝上 */
  function orient(a, b) {
    if (Math.abs(a[1] - b[1]) < 1) return a[0] < b[0] ? [a, b] : [b, a]
    return a[1] > b[1] ? [a, b] : [b, a]
  }
  /* 连排三角形：顶点交替在下、上两排；edges 按摆的顺序：第 1 个 3 根，后面每个 2 根。sh = 第几处挨着（共用的那根） */
  function triPts(n, x0, B, L) {
    var h = L * 0.866, p = []
    for (var i = 0; i <= n + 1; i++) p.push(i % 2 === 0 ? [x0 + (i / 2) * L, B] : [x0 + ((i - 1) / 2) * L + L / 2, B - h])
    return p
  }
  function triEdges(n, x0, B, L) {
    var p = triPts(n, x0, B, L), E = []
    E.push({ a: p[0], b: p[2], k: 0 }, { a: p[0], b: p[1], k: 0 }, { a: p[1], b: p[2], k: 0, sh: n > 1 ? 1 : 0 })
    for (var i = 1; i < n; i++) E.push({ a: p[i + 1], b: p[i + 2], k: i, sh: i < n - 1 ? i + 1 : 0 }, { a: p[i], b: p[i + 2], k: i })
    return { p: p, E: E }
  }
  /* 第 k 个三角形的中心；朝上的在底边下面写字，朝下的在顶上写字 */
  function triLabelPos(p, k, B, L) {
    var cx = (p[k][0] + p[k + 1][0] + p[k + 2][0]) / 3
    return k % 2 === 0 ? [cx, B + 58] : [cx, B - L * 0.866 - 58]
  }
  /* 连排正方形：第 1 个 4 根，后面每个添上、下、右 3 根 */
  function sqEdges(n, x0, T, S) {
    var E = []
    for (var k = 0; k < n; k++) {
      var xl = x0 + k * S, xr = xl + S
      if (k === 0) E.push({ a: [xl, T + S], b: [xl, T], k: 0 })
      E.push({ a: [xl, T], b: [xr, T], k: k }, { a: [xl, T + S], b: [xr, T + S], k: k }, { a: [xr, T + S], b: [xr, T], k: k, sh: k < n - 1 ? k + 1 : 0 })
    }
    return E
  }
  /* 摆火柴：o.at(k, j) 给第 k 个图形第 j 根的出现时刻；o.glowSh(sh) 共用那根亮的时刻；o.seq = [锚点, 间隔] 逐根点数 */
  function sticks(arr, E, o) {
    var cnt = {}
    E.forEach(function (e, idx) {
      var j = cnt[e.k] = (cnt[e.k] === undefined ? 0 : cnt[e.k] + 1)
      var ab = orient(e.a, e.b)
      var m = { t: 'match', x1: ab[0][0], y1: ab[0][1], x2: ab[1][0], y2: ab[1][1], at: o.at(e.k, j), out: o.out, overlapOk: true }
      if (o.glowK) m.glow = o.glowK(e.k)
      if (o.seq) m.glow = stagger(o.seq[0], idx * o.seq[1])
      if (e.sh && o.glowSh) { m.glow2 = m.glow; m.glow = o.glowSh(e.sh) }
      arr.push(m)
    })
  }
  /* 挨着的地方标号 1、2、3……：写在共用那根的下方（底边下面） */
  function shNums(arr, p, n, B, at, o) {
    o = o || {}
    for (var j = 1; j < n; j++) {
      var mx = (p[j][0] + p[j + 1][0]) / 2
      arr.push(lbl(mx, B + (o.dy || 52), String(j), RED, stagger(at, (j - 1) * (o.d === undefined ? 0.25 : o.d)), { font: 'num', size: o.size || 40, out: o.out }))
    }
  }

  var S = []

  /* 0 开场 */
  var e0 = [
    { t: 'txt', x: 960, y: 230, s: '奥数 · 第 15 课', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
    { t: 'tape', x: 960, y: 360, s: '火柴棒游戏', size: 130, at: [0, 0.2] },
    lbl(960, 640, '上一课：一轮一轮换 · 买的先喝掉', BLUE, [1, '一轮一轮'], { font: 'kl', size: 50, out: [2, 0] })
  ]
  sticks(e0, triEdges(1, 880, 730, 160).E, { at: function (k, j) { return [2, '火柴棒', j * 0.25] } })
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '上一课，我们学了空瓶换水：一轮一轮换，买的先喝掉。', say: '上一课，我们学了空瓶换水：一轮一轮换，买的先喝掉。' },
      { sub: '今天，用火柴棒摆图形，算一算要几根！', say: '今天，我们用火柴棒摆图形，算一算要几根！' }
    ],
    els: e0
  })

  /* 1 引入：小明摆第二个三角形又拿了 3 根 —— 等等，共用一根，只添 2 根！ */
  var T1 = triEdges(2, 640, 560, 180), OUT1 = [3, '两招']
  var e1 = [
    item0('kid0', 300, 480, 170, [0, '小明'], OUT1),
    lbl(300, 610, '小明', BLUE, [0, '小明'], { font: 'kl', size: 40, out: OUT1 })
  ]
  sticks(e1, T1.E, {
    at: function (k, j) { return k === 0 ? [0, '三角形', j * 0.25] : [2, '添两根', j * 0.3] },
    glowSh: function () { return [2, '共用'] }, out: OUT1
  })
  var L10 = triLabelPos(T1.p, 0, 560, 180), L11 = triLabelPos(T1.p, 1, 560, 180)
  e1.push(lbl(L10[0], L10[1], '3 根', GREEN, [0, '三根'], { font: 'kl', size: 46, out: OUT1 }))
  e1.push(lbl(L11[0], L11[1], '+2 根', BLUE, [2, '添两根', 0.4], { font: 'kl', size: 46, out: OUT1 }))
  for (var i1 = 0; i1 < 3; i1++) e1.push({ t: 'match', x1: 1290, y1: 400 + i1 * 46, x2: 1460, y2: 400 + i1 * 46, at: [1, '又拿了', i1 * 0.2], out: [2, '添两根'], overlapOk: true })
  e1.push(lbl(1375, 330, '又拿 3 根？', GREY, [1, '又拿了'], { font: 'kl', size: 46, out: [2, '添两根'] }))
  e1.push({ t: 'stamp', x: 1380, y: 470, s: '只添 2 根！', color: ORANGE, size: 64, rot: -5, at: [2, '添两根', 0.6], out: OUT1 })
  e1.push({ t: 'card', x: 760, y: 470, title: '第一招', sub: '后面靠着添', color: BLUE, at: [3, '两招', 0.3] })
  e1.push({ t: 'card', x: 1160, y: 470, title: '第二招', sub: '挨着省一根', color: RED, at: [3, '两招', 0.6] })
  S.push({
    tag: '火柴棒游戏',
    beats: [
      { sub: '小明用火柴棒摆三角形，一个三角形用 3 根。', say: '小明用火柴棒摆三角形，一个三角形，用三根。' },
      { sub: '摆第二个，他又拿了 3 根。', say: '摆第二个，他又拿了三根。' },
      { sub: '等等！第二个靠着第一个，共用一根，只要添 2 根！', say: '等等！第二个靠着第一个，共用一根，只要添两根！', pitch: '+8Hz' },
      { sub: '摆一排，要几根？今天教你两招。', say: '摆一排，要几根？今天，教你两招。' }
    ],
    els: e1
  })

  /* 2 第一招：头一个整摆，后面靠着添（4 个连排三角形 → 9 根） */
  var X2 = 420, B2 = 520, L2 = 170, T2 = triEdges(4, X2, B2, L2)
  var e2 = [
    { t: 'big', x: 960, y: 470, title: '第一招', sub: '头一个整摆，后面靠着添', color: BLUE, at: 0, out: [1, 0] },
    lbl(960, 165, '摆 4 个连排的三角形，要几根？', GREY, [1, 0], { font: 'kl', size: 40 }),
    { t: 'slot', id: 'q2', x: 1720, y: 450, size: 104, at: [1, 0.3] },
    lbl(1720, 550, '根', GREY, [1, 0.5], { font: 'kl', size: 44 })
  ]
  var KW2 = [[1, '三根'], [2, '添两根'], [2, '第三个'], [2, '第四个']]
  sticks(e2, T2.E, { at: function (k, j) { return stagger(KW2[k], j * 0.22) }, seq: [4, '一根一根', 0.16] })
  ;['3', '+2', '+2', '+2'].forEach(function (s, k) {
    var lp = triLabelPos(T2.p, k, B2, L2)
    e2.push(lbl(lp[0], lp[1], s, k ? BLUE : GREEN, stagger(KW2[k], 0.5), { font: 'num', size: 52, glow: [3, k === 0 ? '三加' : k === 1 ? '二加' : k === 2 ? '二加#2' : '加二#3'] }))
  })
  e2 = e2.concat([
    lbl(1250, 450, '3 + 2 + 2 + 2 = 9', GREEN, [3, '三加'], { font: 'num', size: 60 }),
    fill('q2', [3, '九根'], '9'),
    lbl(1250, 600, '数一数：正好 9 根', BLUE, [4, '正好'], { font: 'kl', size: 46 }),
    { t: 'check', x: 1830, y: 445, at: [4, '九根', 0.2] },
    { t: 'stamp', x: 1640, y: 810, s: '答：9 根', color: RED, size: 50, rot: -6, at: [4, '九根', 0.8] }
  ])
  S.push({
    tag: '第一招 | 头一个整摆',
    beats: [
      { sub: '第一招：头一个整个摆，后面每个靠着添。', say: '第一招：头一个整个摆，后面每个，靠着添。' },
      { sub: '摆 4 个连排三角形：第一个，3 根。', say: '摆四个连排三角形：第一个，三根。' },
      { sub: '第二个靠着它，添 2 根；第三个、第四个，也添 2 根。', say: '第二个靠着它，添两根；第三个，第四个，也都添两根。' },
      { sub: '列式：3 + 2 + 2 + 2 = **9** 根。', say: '列式：三加二加二加二，九根。' },
      { sub: '验一验：一根一根数，正好 9 根！', say: '验一验：一根一根数，正好九根！', pause: 1 }
    ],
    els: e2
  })

  /* 3 冲突：分开摆 4 个三角形，比连排多用几根？一根一根对，对不过来了！ */
  var e3 = [
    lbl(960, 165, '4 个三角形：分开摆，比连排多用几根？', GREY, [0, 0.2], { font: 'kl', size: 40 }),
    lbl(190, 320, '分开摆', BLUE, [0, '分开摆'], { font: 'kl', size: 44 }),
    lbl(190, 600, '连排', GREEN, [1, '连排'], { font: 'kl', size: 44 }),
    { t: 'slot', id: 'q3', x: 1560, y: 460, size: 104, at: [1, '几根'] },
    lbl(1660, 460, '根', GREY, [1, '几根', 0.2], { font: 'kl', size: 44 }),
    { t: 'mess', x: 1150, y: 470, at: [2, '对不过来'] },
    { t: 'stamp', x: 1150, y: 640, s: '对不过来！', color: ORANGE, size: 64, rot: -5, at: [2, '对不过来', 0.3] }
  ]
  for (var k3 = 0; k3 < 4; k3++) sticks(e3, triEdges(1, 330 + k3 * 175, 380, 130).E, { at: function (k, j) { return [0, '一个一个', k3 * 0.35 + j * 0.1] }, glowK: function () { return [2, '一根一根', k3 * 0.2] } })
  sticks(e3, triEdges(4, 330, 660, 130).E, { at: function (k, j) { return [1, '连排', k * 0.2 + j * 0.08] }, glowK: function (k) { return [2, '一根一根', 0.1 + k * 0.2] } })
  S.push({
    tag: '第一招 | 头一个整摆',
    beats: [
      { sub: '要是 4 个三角形，一个一个分开摆呢？', say: '要是四个三角形，一个一个，分开摆呢？', rate: '-6%' },
      { sub: '分开摆，比连排多用几根？', say: '分开摆，比连排，多用几根？', rate: '-6%' },
      { sub: '一根一根对，对不过来了！', say: '一根一根对，对不过来了！', pitch: '+8Hz' }
    ],
    els: e3
  })

  /* 4 第二招：挨着一处，省下一根（4 个三角形：3 处挨着 → 分开摆多用 3 根） */
  var X4 = 330, B4 = 480, L4 = 170, T4 = triEdges(4, X4, B4, L4)
  var e4 = [
    { t: 'big', x: 960, y: 470, title: '第二招', sub: '挨着一处，省下一根', color: RED, at: 0, out: [1, 0] },
    lbl(960, 165, '4 个三角形：分开摆，比连排多用几根？', GREY, [1, 0], { font: 'kl', size: 40 }),
    lbl(1060, 640, '分开摆多用', GREY, [1, 0.3], { font: 'kl', size: 46 }),
    { t: 'slot', id: 'q4', x: 1270, y: 640, size: 104, at: [1, 0.3] },
    lbl(1370, 640, '根', GREY, [1, 0.5], { font: 'kl', size: 46 })
  ]
  sticks(e4, T4.E, { at: function (k, j) { return [1, 0.1 + k * 0.15 + j * 0.06] }, glowSh: function (sh) { return [1, '三处', 0.3 + (sh - 1) * 0.3] } })
  shNums(e4, T4.p, 4, B4, [1, '三处', 0.3], { d: 0.3 })
  e4 = e4.concat([
    lbl(1310, 330, '分开摆：3 + 3 + 3 + 3 = 12', BLUE, [2, '十二根'], { font: 'kl', size: 46 }),
    lbl(1310, 440, '连排：12 − 3 = 9 ✓', GREEN, [3, '十二减三'], { font: 'kl', size: 46 }),
    fill('q4', [4, '三根'], '3'),
    { t: 'check', x: 1450, y: 635, at: [4, '三根', 0.3] },
    { t: 'stamp', x: 1640, y: 810, s: '答：多用 3 根', color: RED, size: 50, rot: -6, at: [4, '三根', 0.9] }
  ])
  S.push({
    tag: '第二招 | 挨着省一根',
    beats: [
      { sub: '第二招：看挨着的地方。两个挨着，就共用一根。', say: '第二招：看挨着的地方。两个挨着，就共用一根。' },
      { sub: '4 个三角形连成一排，有 3 处挨着。', say: '四个三角形连成一排，有三处挨着。' },
      { sub: '分开摆，每个都要 3 根，一共 12 根。', say: '分开摆，每个都要三根，一共十二根。' },
      { sub: '连排每处省一根：12 − 3 = 9，和第一招一样！', say: '连排每处省一根：十二减三，九根，和第一招一样！' },
      { sub: '所以分开摆多用的，就是那 3 处：多用 **3** 根！', say: '所以，分开摆多用的，就是那三处：多用三根！', pause: 1 }
    ],
    els: e4
  })

  /* 5 口诀（讲解页原文） */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '头一个整个摆，后面靠着添；', say: '头一个整个摆，后面靠着添；', rate: '-15%' },
      { sub: '共用那一根，就是省下的。', say: '共用那一根，就是省下的。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 480, w: 1360, h: 400, at: 0 },
      { t: 'chant', x: 960, y: 420, s: '头一个整个摆，后面靠着添；', color: BLUE, at: 1 },
      { t: 'chant', x: 960, y: 570, s: '共用那一根，就是省下的。', color: RED, at: 2 }
    ]
  })

  /* 6 小挑战 1：5 个连排正方形 → 4 + 3 + 3 + 3 + 3 = 16 */
  var X6 = 635, T6 = 280, S6 = 130
  var e6 = [
    lbl(960, 165, '摆 5 个连排的正方形，一共要几根？', GREY, [0, '正方形'], { font: 'kl', size: 40 }),
    { t: 'slot', id: 'q6', x: 1700, y: 345, size: 104, at: [1, '几根'] },
    lbl(1700, 445, '根', GREY, [1, '几根', 0.2], { font: 'kl', size: 44 }),
    { t: 'think', x: 960, y: 790, at: [2, '想一想', 0.7], from: 5, pulse: 'q6' }
  ]
  sticks(e6, sqEdges(5, X6, T6, S6), {
    at: function (k, j) { return [0, '五个', k * 0.25 + j * 0.06] },
    glowK: function (k) { return k === 0 ? [3, '四根'] : [3, '添三根', (k - 1) * 0.3] }
  })
  ;['4', '+3', '+3', '+3', '+3'].forEach(function (s, k) {
    e6.push(lbl(X6 + S6 / 2 + k * S6, T6 + S6 + 60, s, k ? BLUE : GREEN, k ? [3, '添三根', (k - 1) * 0.3] : [3, '四根'], { font: 'num', size: 50 }))
  })
  e6 = e6.concat([
    lbl(960, 600, '4 + 3 + 3 + 3 + 3 = 16', GREEN, [4, '四加'], { font: 'num', size: 58 }),
    fill('q6', [4, '十六根'], '16'),
    lbl(960, 700, '验一验：分开 20 根 − 4 处 = 16 ✓', BLUE, [5, '二十减四'], { font: 'kl', size: 44 }),
    { t: 'check', x: 1810, y: 340, at: [5, '十六', 0.2] },
    { t: 'stamp', x: 1640, y: 810, s: '答：16 根', color: RED, size: 50, rot: -6, at: [5, '十六', 0.8] }
  ])
  S.push({
    tag: '小挑战 | 第 1 题',
    beats: [
      { sub: '小挑战，第一题：摆 5 个连排的正方形，', say: '小挑战，第一题：摆五个连排的正方形，' },
      { sub: '一共要几根火柴？', say: '一共，要几根火柴？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '第一个正方形 4 根；后面 4 个，每个添 3 根。', say: '第一个正方形，四根；后面四个，每个添三根。' },
      { sub: '4 + 3 + 3 + 3 + 3，一共 **16** 根。', say: '四加三加三加三加三，一共十六根。' },
      { sub: '验一验：分开摆 20 根，挨着 4 处，20 − 4 = 16！', say: '验一验：分开摆二十根，挨着四处，二十减四，十六！', pause: 1 }
    ],
    els: e6
  })

  /* 7 小挑战 2：6 个三角形，分开摆比连排多用几根 → 5 处挨着 → 5 根 */
  var X7 = 715, B7 = 470, L7 = 140, T7 = triEdges(6, X7, B7, L7)
  var e7 = [
    lbl(960, 165, '6 个三角形：分开摆，比连排多用几根？', GREY, [0, '六个'], { font: 'kl', size: 40 }),
    { t: 'slot', id: 'q7', x: 1700, y: 420, size: 104, at: [0, '几根'] },
    lbl(1700, 520, '根', GREY, [0, '几根', 0.2], { font: 'kl', size: 44 }),
    { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q7' }
  ]
  sticks(e7, T7.E, { at: function (k, j) { return [0, '六个', k * 0.15 + j * 0.06] }, glowSh: function (sh) { return [2, '五处', (sh - 1) * 0.25] } })
  shNums(e7, T7.p, 6, B7, [2, '五处'], { d: 0.25, size: 36, dy: 48 })
  e7 = e7.concat([
    lbl(960, 620, '5 处挨着 → 多用 5 根', RED, [3, '多用五根'], { font: 'kl', size: 50 }),
    fill('q7', [3, '多用五根'], '5'),
    lbl(960, 710, '验一验：18 − 13 = 5 ✓', BLUE, [4, '十八减十三'], { font: 'kl', size: 46 }),
    { t: 'check', x: 1810, y: 415, at: [4, '正好'] },
    { t: 'stamp', x: 1640, y: 810, s: '答：多用 5 根', color: RED, size: 50, rot: -6, at: [4, '正好', 0.8] }
  ])
  S.push({
    tag: '小挑战 | 第 2 题',
    beats: [
      { sub: '第二题：摆 6 个三角形，分开摆比连排多用几根？', say: '第二题：摆六个三角形，分开摆，比连排多用几根？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', pause: 5 },
      { sub: '第二招！6 个连成一排，有 5 处挨着。', say: '第二招！六个连成一排，有五处挨着。' },
      { sub: '每处省一根，分开摆就多用 **5** 根。', say: '每处省一根，分开摆，就多用五根。' },
      { sub: '验一验：分开 18 根，连排 13 根，18 − 13 = 5！', say: '验一验：分开摆十八根，连排十三根，十八减十三，正好五根！', pause: 1 }
    ],
    els: e7
  })

  /* 8 结尾 + 下一课预告 */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天，我们学会了两招：', say: '今天，我们学会了两招：' },
      { sub: '头一个整摆，后面靠着添；挨着一处，就省一根。', say: '头一个整个摆，后面靠着添；挨着一处，就省下一根。' },
      { sub: '下一课，我们来认识「间隔问题」！', say: '下一课，我们来认识，间隔问题！', pitch: '+4Hz' },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: [
      { t: 'card', x: 760, y: 420, title: '第一招', sub: '后面靠着添', color: BLUE, at: 0, glow: [1, '头一个'] },
      { t: 'card', x: 1160, y: 420, title: '第二招', sub: '挨着省一根', color: RED, at: [0, 0.3], glow: [1, '挨着'] },
      { t: 'card', x: 960, y: 690, title: '下一课 · 第 16 课', sub: '间隔问题', color: ORANGE, at: [2, '下一课'], glow: [2, '间隔'], out: 3 },
      { t: 'tape', x: 960, y: 690, s: '去练习纸上试试吧！', size: 50, at: [3, '练习纸'] }
    ]
  })

  /* 封面 */
  var cv = [
    { t: 'txt', x: 960, y: 140, s: '奥数 · 第 15 课 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
    { t: 'tape', x: 960, y: 290, s: '火柴棒游戏', size: 150, at: 0 },
    { t: 'txt', x: 960, y: 440, s: '头一个整摆 · 后面靠着添', size: 54, color: RED, font: 'kl', at: 0 }
  ]
  var TC = triEdges(4, 745, 720, 170)
  sticks(cv, TC.E, { at: function () { return 0 } })
  ;['3', '+2', '+2', '+2'].forEach(function (s, k) {
    var lp = triLabelPos(TC.p, k, 720, 170)
    if (k % 2 === 0) cv.push(lbl(lp[0], lp[1] - 4, s, k ? BLUE : GREEN, 0, { font: 'num', size: 50 }))
    else cv.push(lbl(lp[0], 720 + 54, s, BLUE, 0, { font: 'num', size: 50 }))
  })
  cv.push({ t: 'txt', x: 960, y: 860, s: '3 + 2 + 2 + 2 = 9 根', size: 54, color: GREEN, font: 'kl', at: 0 })
  S.cover = { tag: null, els: cv }

  function item0(k, x, y, size, at, out) { return { t: 'item', k: k, x: x, y: y, size: size, at: at, out: out, overlapOk: true } }
  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
