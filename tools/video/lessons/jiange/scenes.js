/* 16 间隔问题 · 讲解视频分镜 v1（对标 08；关键动作用 [beat, '关键词'] 对齐配音）
 * 两招：第一招「画个小图，数一数」；第二招「段数次数差个一」（次数 = 段数 − 1，段数 = 次数 + 1）。
 * 引入：锯成 3 段，小明以为锯 3 次 —— 其实锯 2 下就 3 段。
 * 例题：锯成 5 段 → 画图数锯口 1、2、3、4 → 4 次；验：锯开正好 5 段。
 * 冲突：锯成 30 段？画不下、数不清了！ → 第二招：30 − 1 = 29 次；反过来锯 9 次 → 9 + 1 = 10 段。
 * 小挑战：7 个小朋友站一排，相邻两人中间放 1 盆花 → 7 − 1 = 6 盆。
 *         小红从 3 楼走到 8 楼 → 画图 5 层；不是 8 − 1，是 8 − 3 = 5。 */
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
  function item0(k, x, y, size, at, out, o) {
    o = o || {}
    return { t: 'item', k: k, x: x, y: y, size: size, at: at, out: out, glow: o.glow, glow2: o.glow2, overlapOk: true }
  }

  /* ---------- 木头 + 锯口 ----------
   * o: x0, y, w, h, n（段数）, at, out, ring
   *    cutAt(j) 第 j 个锯口出现时刻（j = 1..n-1；返回 null 就不画）, cutGlow(j)
   *    split 锯开的时刻（整根换成 n 段并左右分开 gap）, pieceGlow(k)（k = 0..n-1）
   *    cutNum: { dy, at(j) } 锯口上方标号 */
  function logCut(arr, o) {
    var sw = o.w / o.n, h = o.h || 90
    arr.push({ t: 'log', x0: o.x0, y: o.y, w: o.w, h: h, ring: o.ring, at: o.at, out: o.split || o.out })
    for (var j = 1; j < o.n; j++) {
      var ca = o.cutAt(j)
      if (ca === null) continue
      arr.push({ t: 'cut', x: o.x0 + j * sw, y: o.y, h: h + 50, at: ca, out: o.split || o.out, glow: o.cutGlow ? o.cutGlow(j) : undefined })
      if (o.cutNum) arr.push(lbl(o.x0 + j * sw, o.y - h / 2 - 62, String(j), RED, o.cutNum.at(j), { font: 'num', size: o.cutNum.size || 44, out: o.cutNum.out || o.out }))
    }
    if (!o.split) return
    var gap = o.gap || 30
    for (var k = 0; k < o.n; k++) {
      var dx = (k - (o.n - 1) / 2) * gap
      arr.push({ t: 'log', x0: o.x0 + k * sw + dx, y: o.y, w: sw, h: h, ring: o.ring && k === o.n - 1, at: o.split, anim: 'none', move: [o.split, -dx, 0], out: o.out, glow: o.pieceGlow ? o.pieceGlow(k) : undefined })
      if (o.pieceNum) arr.push(lbl(o.x0 + (k + 0.5) * sw + dx, o.y + h / 2 + 50, String(k + 1), BLUE, o.pieceNum.at(k), { font: 'num', size: 44, out: o.out }))
    }
  }

  var S = []

  /* 0 开场 */
  var e0 = [
    { t: 'txt', x: 960, y: 230, s: '奥数 · 第 16 课', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
    { t: 'tape', x: 960, y: 360, s: '间隔问题', size: 130, at: [0, 0.2] },
    lbl(960, 560, '上一课：挨着一处，省下一根', BLUE, [1, '挨着'], { font: 'kl', size: 50, out: [2, 0] })
  ]
  logCut(e0, { x0: 660, y: 640, w: 600, h: 90, n: 4, ring: true, at: [2, '认识'], cutAt: function (j) { return [2, '间隔', j * 0.25] } })
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '上一课，我们学了火柴棒：挨着一处，省下一根。', say: '上一课，我们学了火柴棒：挨着一处，省下一根。' },
      { sub: '今天，我们来认识间隔问题！', say: '今天，我们来认识间隔问题！' }
    ],
    els: e0
  })

  /* 1 引入：锯成 3 段，小明以为要锯 3 次 —— 锯两下就 3 段了！ */
  var OUT1 = [3, '两招']
  var e1 = [
    item0('kid0', 250, 470, 170, [0, '小明'], OUT1),
    lbl(250, 600, '小明', BLUE, [0, '小明'], { font: 'kl', size: 40, out: OUT1 }),
    lbl(1600, 380, '锯 3 次？', GREY, [1, '三次'], { font: 'kl', size: 50, out: [2, '锯两下'] }),
    { t: 'stamp', x: 1600, y: 470, s: '只锯 2 次！', color: ORANGE, size: 60, rot: -5, at: [2, '三段', 0.5], out: OUT1 },
    { t: 'card', x: 760, y: 470, title: '第一招', sub: '画个小图', color: BLUE, at: [3, '两招', 0.3] },
    { t: 'card', x: 1160, y: 470, title: '第二招', sub: '差个一', color: RED, at: [3, '两招', 0.6] }
  ]
  logCut(e1, {
    x0: 450, y: 470, w: 780, h: 100, n: 3, ring: true, at: [0, '木头'], out: OUT1, gap: 44,
    cutAt: function (j) { return [2, '锯两下', (j - 1) * 0.4] }, split: [2, '三段'],
    pieceNum: { at: function (k) { return [2, '三段', 0.3 + k * 0.2] } }
  })
  S.push({
    tag: '间隔问题',
    beats: [
      { sub: '小明帮爸爸锯木头，要把木头锯成 3 段。', say: '小明帮爸爸锯木头，要把这根木头，锯成三段。' },
      { sub: '小明说：3 段，就要锯 3 次！', say: '小明说：三段，就要锯三次！' },
      { sub: '咦？锯两下，就变成 3 段了！', say: '咦？锯两下，就变成三段了！', pitch: '+8Hz' },
      { sub: '锯几次，有几段？今天教你两招。', say: '锯几次，有几段？今天，教你两招。' }
    ],
    els: e1
  })

  /* 2 第一招：画个小图，数一数（锯成 5 段 → 4 次） */
  var e2 = [
    { t: 'big', x: 960, y: 470, title: '第一招', sub: '画个小图，数一数', color: BLUE, at: 0, out: [1, 0] },
    lbl(960, 165, '一根木头锯成 5 段，要锯几次？', GREY, [1, 0], { font: 'kl', size: 42 }),
    { t: 'slot', id: 'q2', x: 1730, y: 420, size: 104, at: [1, 0.3] },
    lbl(1730, 520, '次', GREY, [1, 0.5], { font: 'kl', size: 44 })
  ]
  var KW2 = [null, '一二', '二', '三', '四']
  logCut(e2, {
    x0: 300, y: 420, w: 1120, h: 100, n: 5, ring: true, at: [1, '木头'], gap: 30,
    cutAt: function (j) { return [2, KW2[j]] }, cutGlow: function (j) { return [2, KW2[j]] },
    cutNum: { at: function (j) { return [2, KW2[j]] } },
    split: [4, '锯开'], pieceGlow: function (k) { return [4, '一段一段', 0.2 + k * 0.32] },
    pieceNum: { at: function (k) { return [4, '一段一段', 0.2 + k * 0.32] } }
  })
  e2 = e2.concat([
    fill('q2', [3, '锯四次'], '4'),
    lbl(860, 650, '锯 4 次 → 变成 5 段', GREEN, [3, '锯四次'], { font: 'kl', size: 50 }),
    { t: 'check', x: 1840, y: 415, at: [4, '正好', 0.2] },
    { t: 'stamp', x: 1640, y: 810, s: '答：锯 4 次', color: RED, size: 50, rot: -6, at: [4, '五段', 0.8] }
  ])
  S.push({
    tag: '第一招 | 画个小图',
    beats: [
      { sub: '第一招：画个小图，数一数。', say: '第一招：画个小图，数一数。' },
      { sub: '一根木头，锯成 5 段，要锯几次？', say: '一根木头，锯成五段，要锯几次？', rate: '-6%' },
      { sub: '画出 5 段，数一数锯口：1、2、3、4。', say: '画出五段，数一数锯口：一、二、三、四。' },
      { sub: '锯 **4** 次，木头就变成 5 段。', say: '锯四次，木头就变成五段。' },
      { sub: '验一验：锯开来，一段一段数，正好 5 段！', say: '验一验：锯开来，一段一段数，正好五段！', pause: 1 }
    ],
    els: e2
  })

  /* 3 冲突：锯成 30 段？画不下、数不清了！ */
  var e3 = [
    lbl(960, 165, '要是锯成 30 段呢？', GREY, [0, 0.2], { font: 'kl', size: 46 }),
    { t: 'mess', x: 1380, y: 640, at: [2, '画不下'] },
    { t: 'stamp', x: 880, y: 650, s: '画不下了！', color: ORANGE, size: 64, rot: -5, at: [2, '画不下', 0.3] }
  ]
  logCut(e3, {
    x0: 210, y: 400, w: 1500, h: 90, n: 30, at: [0, '三十段'],
    cutAt: function (j) { return j <= 19 ? [1, '画呀画', j * 0.11] : null },
    cutGlow: function (j) { return [1, '一个一个', j * 0.09] }
  })
  S.push({
    tag: '第一招 | 画个小图',
    beats: [
      { sub: '要是锯成 30 段呢？', say: '要是，锯成三十段呢？', rate: '-6%' },
      { sub: '画呀画，锯口一个一个数……', say: '画呀画，锯口一个一个数……' },
      { sub: '画不下，也数不清了！', say: '画不下，也数不清了！', pitch: '+8Hz' }
    ],
    els: e3
  })

  /* 4 第二招：段数次数差个一（30 段 → 29 次；反过来 9 次 → 10 段） */
  var e4 = [
    { t: 'big', x: 960, y: 470, title: '第二招', sub: '段数次数差个一', color: RED, at: 0, out: [1, 0] }
  ]
  var KW4 = ['锯一次', '锯两次', '锯三次']
  ;[0, 1, 2].forEach(function (r) {
    var y = 300 + r * 150, n = r + 2
    logCut(e4, { x0: 200, y: y, w: 360, h: 64, n: n, at: [1, KW4[r]], cutAt: function (j) { return [1, KW4[r], 0.15 + j * 0.12] } })
    e4.push(lbl(800, y, '锯 ' + (r + 1) + ' 次 → ' + n + ' 段', INK, [1, KW4[r], 0.3], { font: 'kl', size: 46, glow: [2, '总比'] }))
  })
  e4 = e4.concat([
    { t: 'note', x: 1420, y: 300, s: '段数 = 次数 + 1', color: RED, at: [2, '多一'] },
    lbl(1300, 165, '锯成 30 段，要锯几次？', GREY, [3, 0], { font: 'kl', size: 42 }),
    lbl(1330, 470, '30 − 1 = 29', GREEN, [3, '三十减一'], { font: 'num', size: 60 }),
    { t: 'slot', id: 'q4', x: 1710, y: 470, size: 104, at: [3, 0.2] },
    lbl(1710, 570, '次', GREY, [3, 0.4], { font: 'kl', size: 44 }),
    fill('q4', [3, '二十九次'], '29'),
    { t: 'check', x: 1840, y: 465, at: [3, '二十九次', 0.3] },
    { t: 'stamp', x: 1640, y: 810, s: '答：29 次', color: RED, size: 50, rot: -6, at: [3, '二十九次', 0.8] },
    lbl(1300, 660, '反过来：锯 9 次 → 9 + 1 = 10 段', BLUE, [4, '九加一'], { font: 'kl', size: 44 })
  ])
  S.push({
    tag: '第二招 | 差个一',
    beats: [
      { sub: '第二招：段数和次数，差个一。', say: '第二招：段数和次数，差个一。' },
      { sub: '锯一次，两段；锯两次，三段；锯三次，四段。', say: '锯一次，两段；锯两次，三段；锯三次，四段。' },
      { sub: '段数，总比锯的次数多 1！', say: '段数，总比锯的次数多一！', pitch: '+5Hz' },
      { sub: '锯成 30 段：30 − 1，锯 **29** 次！', say: '锯成三十段，就是三十减一，二十九次！', pause: 1 },
      { sub: '反过来，锯了 9 次：9 + 1，就是 10 段。', say: '反过来，锯了九次，就是九加一，十段。' }
    ],
    els: e4
  })

  /* 5 口诀（讲解页原文） */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '段数次数差个一，', say: '段数次数差个一，', rate: '-15%' },
      { sub: '画个小图就清晰。', say: '画个小图就清晰。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 480, w: 1360, h: 400, at: 0 },
      { t: 'chant', x: 960, y: 420, s: '段数次数差个一，', color: RED, at: 1 },
      { t: 'chant', x: 960, y: 570, s: '画个小图就清晰。', color: BLUE, at: 2 }
    ]
  })

  /* 6 小挑战 1：7 个小朋友站一排，相邻两人中间放 1 盆花 → 6 盆 */
  var e6 = [
    lbl(960, 165, '7 个小朋友站一排，相邻两人中间放 1 盆花，共几盆？', GREY, [0, 0.2], { font: 'kl', size: 40 }),
    { t: 'slot', id: 'q6', x: 1770, y: 400, size: 104, at: [1, '几盆'] },
    lbl(1770, 500, '盆', GREY, [1, '几盆', 0.2], { font: 'kl', size: 44 }),
    { t: 'think', x: 960, y: 790, at: [2, '想一想', 0.7], from: 5, pulse: 'q6' }
  ]
  for (var i6 = 0; i6 < 7; i6++) {
    e6.push(item0('kid' + (i6 % 6), 320 + i6 * 210, 400, 130, [0, '七个', i6 * 0.12], undefined, { glow: i6 === 0 || i6 === 6 ? [3, '两头'] : undefined }))
  }
  for (var k6 = 0; k6 < 6; k6++) {
    e6.push(item0('flower', 425 + k6 * 210, 430, 90, [3, '中间', k6 * 0.15], undefined, { glow: [5, '小花', 0.2 + k6 * 0.3] }))
    e6.push(lbl(425 + k6 * 210, 520, String(k6 + 1), RED, [5, '小花', 0.2 + k6 * 0.3], { font: 'num', size: 44 }))
  }
  e6 = e6.concat([
    lbl(960, 640, '人比花多 1：7 − 1 = 6', GREEN, [4, '七减一'], { font: 'kl', size: 54 }),
    fill('q6', [4, '六盆'], '6'),
    { t: 'check', x: 1880, y: 395, at: [5, '正好', 0.2] },
    { t: 'stamp', x: 1640, y: 810, s: '答：6 盆', color: RED, size: 50, rot: -6, at: [5, '六盆', 0.8] }
  ])
  S.push({
    tag: '小挑战 | 第 1 题',
    beats: [
      { sub: '小挑战，第一题：7 个小朋友站成一排，', say: '小挑战，第一题：七个小朋友，站成一排，' },
      { sub: '相邻两人中间放 1 盆花，一共放几盆？', say: '每相邻两人中间，放一盆花，一共放几盆？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '画个小图：花都在两人中间，两头站的是人。', say: '画个小图：花都在两人中间，两头站的，是人。' },
      { sub: '人比花多 1 个：7 − 1，**6** 盆！', say: '人比花多一个：七减一，六盆！' },
      { sub: '验一验：数一数小花，正好 6 盆！', say: '验一验：数一数小花，正好六盆！', pause: 1 }
    ],
    els: e6
  })

  /* 7 小挑战 2：小红从 3 楼走到 8 楼 → 5 层（不是 8 − 1，是 8 − 3） */
  var FY = function (f) { return 725 - (f - 3) * 90 }
  var e7 = [
    lbl(960, 165, '小红从 3 楼走到 8 楼，要走几层楼梯？', GREY, [0, 0.2], { font: 'kl', size: 42 }),
    { t: 'slot', id: 'q7', x: 1700, y: 420, size: 104, at: [0, '几层'] },
    lbl(1700, 520, '层', GREY, [0, '几层', 0.2], { font: 'kl', size: 44 }),
    { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q7' }
  ]
  for (var f = 3; f <= 8; f++) {
    e7.push({ t: 'strip', x0: 340, w: 420, h: 18, y: FY(f), fill: '#d8c3a0', at: [0, '三楼', (f - 3) * 0.12] })
    e7.push(lbl(265, FY(f), f + ' 楼', f === 3 || f === 8 ? RED : INK, [0, '三楼', (f - 3) * 0.12], { font: 'kl', size: 40, glow: f === 3 ? [4, '八减三'] : f === 8 ? [4, '八减三', 0.25] : undefined }))
  }
  for (var s7 = 0; s7 < 5; s7++) {
    var y1 = FY(3 + s7) - 13, y2 = FY(4 + s7) + 13, xa = s7 % 2 ? 690 : 410, xb = s7 % 2 ? 410 : 690
    var at7 = [2, '一层', s7 * 0.55]
    e7.push({ t: 'steps', x1: xa, y1: y1, x2: xb, y2: y2, k: 5, color: BLUE, sw: 7, at: at7 })
    e7.push(lbl(800, (FY(3 + s7) + FY(4 + s7)) / 2, String(s7 + 1), BLUE, at7, { font: 'num', size: 44 }))
  }
  e7 = e7.concat([
    fill('q7', [3, '五层'], '5'),
    lbl(1300, 610, '不是 8 − 1', GREY, [4, '八减一'], { font: 'kl', size: 48 }),
    lbl(1300, 700, '8 − 3 = 5', GREEN, [4, '八减三'], { font: 'num', size: 58 }),
    { t: 'check', x: 1810, y: 415, at: [4, '五层', 0.2] },
    { t: 'stamp', x: 1640, y: 810, s: '答：5 层', color: RED, size: 50, rot: -6, at: [4, '五层', 0.8] }
  ])
  S.push({
    tag: '小挑战 | 第 2 题',
    beats: [
      { sub: '第二题：小红从 3 楼走到 8 楼，要走几层楼梯？', say: '第二题：小红从三楼走到八楼，要走几层楼梯？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', pause: 5 },
      { sub: '画个小图！从 3 楼往上：一层、两层、三层……', say: '画个小图！从三楼往上走：一层、两层、三层……' },
      { sub: '到 8 楼，正好走 **5** 层！', say: '到八楼，正好走五层！' },
      { sub: '小心！不是 8 − 1，是 8 − 3，5 层！', say: '小心！不是八减一，是八减三，五层！', pause: 1 }
    ],
    els: e7
  })

  /* 8 结尾 + 下一课预告 */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天，我们学会了两招：', say: '今天，我们学会了两招：' },
      { sub: '画个小图数一数；段数次数差个一。', say: '画个小图，数一数；段数次数，差个一。' },
      { sub: '下一课，我们来认识「排队问题」！', say: '下一课，我们来认识，排队问题！', pitch: '+4Hz' },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: [
      { t: 'card', x: 760, y: 420, title: '第一招', sub: '画个小图', color: BLUE, at: 0, glow: [1, '画个'] },
      { t: 'card', x: 1160, y: 420, title: '第二招', sub: '差个一', color: RED, at: [0, 0.3], glow: [1, '次数'] },
      { t: 'card', x: 960, y: 690, title: '下一课 · 第 17 课', sub: '排队问题', color: ORANGE, at: [2, '下一课'], glow: [2, '排队'], out: 3 },
      { t: 'tape', x: 960, y: 690, s: '去练习纸上试试吧！', size: 50, at: [3, '练习纸'] }
    ]
  })

  /* 封面 */
  var cv = [
    { t: 'txt', x: 960, y: 140, s: '奥数 · 第 16 课 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
    { t: 'tape', x: 960, y: 290, s: '间隔问题', size: 150, at: 0 },
    { t: 'txt', x: 960, y: 440, s: '段数次数差个一', size: 58, color: RED, font: 'kl', at: 0 }
  ]
  logCut(cv, { x0: 460, y: 660, w: 1000, h: 110, n: 5, ring: true, at: 0, cutAt: function () { return 0 }, cutNum: { at: function () { return 0 }, size: 48 } })
  cv.push({ t: 'txt', x: 960, y: 830, s: '锯成 5 段 → 锯 4 次', size: 56, color: GREEN, font: 'kl', at: 0 })
  S.cover = { tag: null, els: cv }

  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
