/* 17 排队问题 · 讲解视频分镜 v1（对标 08；关键动作用 [beat, '关键词'] 对齐配音）
 * 核心：自己只能算一次 —— 忘了数要「+1」，两头都数了要「−1」。
 * 第一招「画圈圈，数一数」：别人画 ○，自己画 ●。
 * 第二招「自己算一次」：前面加后面，自己别忘算（+1）；两头都数了，重复减一遍（−1）。
 * 引入：小明前面 3 人、后面 4 人，算成 3 + 4 = 7 —— 一个一个数是 8 个，忘了自己。
 * 冲突：前面 25 人、后面 30 人，画不下 → 25 + 30 + 1 = 56。
 * 两头数：小红从前数第 4、从后数第 3 → 4 + 3 − 1 = 6。
 * 小挑战：一队 10 人，小明从前数第 4 → 后面 10 − 4 = 6 人；小华从前第 7、从后第 9 → 7 + 9 − 1 = 15 人。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420'
  var BAND_B = 'rgba(63,127,196,0.16)', BAND_R = 'rgba(217,68,58,0.16)'

  function lbl(x, y, s, color, at, o) {
    o = o || {}
    return { t: 'txt', id: o.id, x: x, y: y, s: s, size: o.size || 40, font: o.font || 'kai', color: color || GREY, at: at, out: o.out, anim: o.anim, glow: o.glow, glow2: o.glow2, overlapOk: o.overlapOk }
  }
  function fill(id, at, val) { return { t: 'fill', id: id, at: at, val: val } }
  function kid(k, x, y, size, at, o) {
    o = o || {}
    return { t: 'item', k: 'kid' + k, x: x, y: y, size: size, at: at, out: o.out, glow: o.glow, glow2: o.glow2, overlapOk: true }
  }
  function circ(self, x, y, size, at, o) {
    o = o || {}
    return { t: 'shp', k: self ? 'dot' : 'ci', x: x, y: y, size: size, at: at, out: o.out, glow: o.glow, glow2: o.glow2, overlapOk: true }
  }
  /* 前 ◀ / 后 ▶ 方向提示 */
  function ends(arr, xl, xr, y, at, out) {
    arr.push(lbl(xl, y, '前', GREY, at, { font: 'kl', size: 40, out: out }))
    arr.push(lbl(xr, y, '后', GREY, at, { font: 'kl', size: 40, out: out }))
  }
  var KIDS = [2, 4, 3, 0, 5, 1, 2, 4] // 小朋友轮着用（kid0 是小明，kid1 是小红）

  var S = []

  /* 0 开场 */
  var e0 = [
    { t: 'txt', x: 960, y: 230, s: '奥数 · 第 17 课', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
    { t: 'tape', x: 960, y: 360, s: '排队问题', size: 130, at: [0, 0.2] },
    lbl(960, 560, '上一课：段数次数差个一', BLUE, [1, '上一课'], { font: 'kl', size: 50, out: [2, 0] })
  ]
  for (var i0 = 0; i0 < 6; i0++) e0.push(kid(KIDS[i0], 610 + i0 * 140, 640, 110, [2, '排队', i0 * 0.12]))
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '上一课，我们学了间隔问题：段数次数差个一。', say: '上一课，我们学了间隔问题：段数次数差个一。' },
      { sub: '今天，我们来认识排队问题！', say: '今天，我们来认识排队问题！' }
    ],
    els: e0
  })

  /* 1 引入：前 3 后 4，小明算成 7 —— 一个一个数是 8，忘了自己 */
  var OUT1 = [4, '两招']
  var e1 = []
  ends(e1, 220, 1700, 430, [0, '排队'], OUT1)
  for (var i1 = 0; i1 < 8; i1++) {
    var me1 = i1 === 3
    e1.push(kid(me1 ? 0 : KIDS[i1], 365 + i1 * 170, 430, 120,
      me1 ? [0, '小明'] : i1 < 3 ? [0, '前面', 0.2 + i1 * 0.15] : [0, '后面', 0.2 + (i1 - 4) * 0.15],
      { out: OUT1, glow: [2, '一个一个', 0.15 + i1 * 0.28], glow2: me1 ? [3, '自己'] : undefined }))
    e1.push(lbl(365 + i1 * 170, 560, String(i1 + 1), RED, [2, '一个一个', 0.15 + i1 * 0.28], { font: 'num', size: 44, out: OUT1 }))
  }
  e1 = e1.concat([
    { t: 'band', x: 365 + 3 * 170, y: 400, w: 150, h: 260, at: [0, '小明'], out: OUT1 },
    lbl(365 + 3 * 170, 320, '小明', BLUE, [0, '小明'], { font: 'kl', size: 40, out: OUT1 }),
    lbl(960, 690, '3 + 4 = 7 ？', GREY, [1, '一共'], { font: 'num', size: 56, out: [3, 0] }),
    { t: 'stamp', x: 960, y: 690, s: '忘了自己！', color: ORANGE, size: 64, rot: -5, at: [3, '自己', 0.2], out: OUT1 },
    { t: 'card', x: 760, y: 470, title: '第一招', sub: '画圈圈', color: BLUE, at: [4, '两招', 0.3] },
    { t: 'card', x: 1160, y: 470, title: '第二招', sub: '自己算一次', color: RED, at: [4, '两招', 0.6] }
  ])
  S.push({
    tag: '排队问题',
    beats: [
      { sub: '小明排队买冰淇淋，前面有 3 人，后面有 4 人。', say: '小明排队买冰淇淋，前面有三个人，后面有四个人。' },
      { sub: '小明算：3 加 4，一共 7 个人！', say: '小明算：三加四，一共七个人！' },
      { sub: '咦？一个一个数，明明是 8 个！', say: '咦？一个一个数，明明是八个！', pitch: '+8Hz' },
      { sub: '少了谁？忘了小明自己！', say: '少了谁？忘了小明自己！' },
      { sub: '排队数人数，今天教你两招。', say: '排队数人数，今天，教你两招。' }
    ],
    els: e1
  })

  /* 2 第一招：画圈圈（别人 ○，自己 ●） */
  var e2 = [
    { t: 'big', x: 960, y: 470, title: '第一招', sub: '画圈圈，数一数', color: BLUE, at: 0, out: [1, 0] },
    { t: 'slot', id: 'q2', x: 1770, y: 530, size: 104, at: [1, 0.2] },
    lbl(1770, 630, '人', GREY, [1, 0.4], { font: 'kl', size: 44 })
  ]
  ends(e2, 200, 1660, 330, [1, 0])
  for (var i2 = 0; i2 < 8; i2++) {
    var me2 = i2 === 3, x2 = 365 + i2 * 170
    e2.push(kid(me2 ? 0 : KIDS[i2], x2, 330, 104, [1, 0, i2 * 0.08]))
    e2.push(circ(me2, x2, 530, 80, me2 ? [1, '实心圈'] : [1, '空心圈', i2 * 0.08], { glow: [3, '点着', 0.2 + i2 * 0.3] }))
    e2.push(lbl(x2, 445, String(i2 + 1), RED, [3, '点着', 0.2 + i2 * 0.3], { font: 'num', size: 38 }))
  }
  e2 = e2.concat([
    { t: 'band', x: 365 + 3 * 170, y: 380, w: 140, h: 330, at: [1, 0.3] },
    lbl(365 + 3 * 170, 240, '小明', BLUE, [1, 0.3], { font: 'kl', size: 38 }),
    { t: 'brace', x: 365 + 170, y: 630, w: 420, label: '前面 3 个', color: BLUE, at: [2, '前面'] },
    { t: 'brace', x: 365 + 3 * 170, y: 630, w: 110, label: '小明', color: INK, at: [2, '小明'] },
    { t: 'brace', x: 365 + 5.5 * 170, y: 630, w: 590, label: '后面 4 个', color: RED, at: [2, '后面'] },
    fill('q2', [3, '八个圈'], '8'),
    lbl(860, 800, '3 + 1 + 4 = 8', GREEN, [4, '三加一'], { font: 'num', size: 56 }),
    { t: 'check', x: 1880, y: 525, at: [4, '正好', 0.2] },
    { t: 'stamp', x: 1580, y: 810, s: '答：一共 8 人', color: RED, size: 50, rot: -6, at: [4, '八人', 0.8] }
  ])
  S.push({
    tag: '第一招 | 画圈圈',
    beats: [
      { sub: '第一招：画圈圈，数一数。', say: '第一招：画圈圈，数一数。' },
      { sub: '别人画空心圈，自己画实心圈。', say: '别人画空心圈，自己画实心圈。' },
      { sub: '前面 3 个，小明 1 个，后面 4 个。', say: '前面三个，小明一个，后面四个。' },
      { sub: '一个一个点着数：一共 **8** 个圈！', say: '一个一个点着数：一共八个圈！' },
      { sub: '验一验：3 加 1 加 4，正好 8 人！', say: '验一验：三加一加四，正好八人！', pause: 1 }
    ],
    els: e2
  })

  /* 3 冲突：前 25 后 30，画不下 */
  var e3 = [
    lbl(960, 165, '前面 25 人，后面 30 人呢？', GREY, [0, 0.2], { font: 'kl', size: 46 }),
    { t: 'mess', x: 1380, y: 640, at: [2, '画不下'] },
    { t: 'stamp', x: 880, y: 650, s: '画不下了！', color: ORANGE, size: 64, rot: -5, at: [2, '画不下', 0.3] }
  ]
  for (var i3 = 0; i3 < 34; i3++) {
    e3.push(circ(i3 === 25, 190 + i3 * 45, 400, 38, [1, '画呀画', i3 * 0.07], { glow: [1, '一个一个', i3 * 0.06] }))
  }
  S.push({
    tag: '第一招 | 画圈圈',
    beats: [
      { sub: '要是前面有 25 人，后面有 30 人呢？', say: '要是，前面有二十五人，后面有三十人呢？', rate: '-6%' },
      { sub: '画呀画，圈圈一个一个数……', say: '画呀画，圈圈一个一个数……' },
      { sub: '画不下，也数不清了！', say: '画不下，也数不清了！', pitch: '+8Hz' }
    ],
    els: e3
  })

  /* 4 第二招（上）：前面加后面，自己别忘算 → 25 + 30 + 1 = 56 */
  var e4 = [
    { t: 'big', x: 960, y: 470, title: '第二招', sub: '自己算一次', color: RED, at: 0, out: [1, 0] },
    { t: 'note', x: 1500, y: 200, s: '自己别忘算：+ 1', color: RED, at: [1, 0] },
    { t: 'strip', x0: 230, w: 560, h: 96, y: 430, fill: '#cfe0f2', s: '前面 25 人', at: [1, '前面'] },
    circ(true, 870, 430, 96, [2, '自己'], { glow: [2, '自己', 0.1] }),
    lbl(870, 545, '自己', INK, [2, '自己'], { font: 'kl', size: 40 }),
    { t: 'strip', x0: 950, w: 620, h: 96, y: 430, fill: '#f6d3cf', s: '后面 30 人', at: [1, '后面'] },
    { t: 'slot', id: 'q4', x: 1760, y: 430, size: 104, at: [1, 0.3] },
    lbl(1760, 530, '人', GREY, [1, 0.5], { font: 'kl', size: 44 }),
    lbl(900, 680, '25 + 30 + 1 = 56', GREEN, [2, '二十五加三十'], { font: 'num', size: 62 }),
    fill('q4', [3, '五十六'], '56'),
    { t: 'check', x: 1880, y: 425, at: [3, '五十六', 0.3] },
    { t: 'stamp', x: 1580, y: 810, s: '答：一共 56 人', color: RED, size: 50, rot: -6, at: [3, '五十六', 0.8] }
  ]
  S.push({
    tag: '第二招 | 自己算一次',
    beats: [
      { sub: '第二招：自己，只能算一次！', say: '第二招：自己，只能算一次！' },
      { sub: '前面 25 人，后面 30 人，都是别人。', say: '前面二十五人，后面三十人，都是别人。' },
      { sub: '25 加 30，再加上自己 1 个，', say: '二十五加三十，再加上自己一个，' },
      { sub: '一共 **56** 人！', say: '一共五十六人！', pitch: '+5Hz', pause: 1 }
    ],
    els: e4
  })

  /* 5 第二招（下）：两头都数了，重复减一遍 → 4 + 3 − 1 = 6 */
  var KX5 = function (i) { return 460 + i * 200 }
  var e5 = [
    { t: 'note', x: 1500, y: 200, s: '两头都数了：− 1', color: RED, at: [3, '两次', 0.3] },
    { t: 'band', x: (KX5(0) + KX5(3)) / 2, y: 380, w: KX5(3) - KX5(0) + 170, h: 190, color: BAND_B, at: [1, '从前往后'] },
    { t: 'band', x: (KX5(3) + KX5(5)) / 2, y: 400, w: KX5(5) - KX5(3) + 170, h: 190, color: BAND_R, at: [2, '从后往前'] },
    lbl(KX5(3), 240, '小红', BLUE, [0, '小红'], { font: 'kl', size: 40 })
  ]
  ends(e5, 260, 1660, 390, [0, '排队'])
  for (var i5 = 0; i5 < 6; i5++) {
    var me5 = i5 === 3
    e5.push(kid(me5 ? 1 : KIDS[i5 + 1], KX5(i5), 390, 116, me5 ? [0, '小红'] : [0, '排队', i5 * 0.1],
      { glow: me5 ? [1, '第四个'] : undefined, glow2: me5 ? [2, '第三个'] : undefined }))
    if (i5 <= 3) e5.push(lbl(KX5(i5), 300, String(i5 + 1), BLUE, [1, '从前往后', 0.3 + i5 * 0.25], { font: 'num', size: 42 }))
    if (i5 >= 3) e5.push(lbl(KX5(i5), 505, String(6 - i5), RED, [2, '从后往前', 0.3 + (5 - i5) * 0.25], { font: 'num', size: 42 }))
  }
  e5 = e5.concat([
    lbl(960, 640, '4 + 3 = 7 ？', GREY, [3, '四加三'], { font: 'num', size: 54 }),
    lbl(960, 740, '4 + 3 − 1 = 6', GREEN, [4, '四加三减一'], { font: 'num', size: 60 }),
    { t: 'stamp', x: 1580, y: 810, s: '答：一共 6 人', color: RED, size: 50, rot: -6, at: [4, '六人', 0.8] }
  ])
  S.push({
    tag: '第二招 | 自己算一次',
    beats: [
      { sub: '还有一种：小红排队做操，', say: '还有一种：小红排队做操，' },
      { sub: '从前往后数，她是第 4 个；', say: '从前往后数，她是第四个；' },
      { sub: '从后往前数，她是第 3 个。', say: '从后往前数，她是第三个。' },
      { sub: '4 加 3 等于 7？小红被数了两次！', say: '四加三等于七？小红被数了两次！', pitch: '+6Hz' },
      { sub: '重复的减一遍：4 + 3 − 1，**6** 人！', say: '重复的减一遍：四加三减一，一共六人！', pause: 1 }
    ],
    els: e5
  })

  /* 6 口诀（讲解页原文） */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '前面加后面，自己别忘算；', say: '前面加后面，自己别忘算；', rate: '-15%' },
      { sub: '两头都数了，重复减一遍。', say: '两头都数了，重复减一遍。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 480, w: 1360, h: 400, at: 0 },
      { t: 'chant', x: 960, y: 420, s: '前面加后面，自己别忘算；', color: RED, at: 1 },
      { t: 'chant', x: 960, y: 570, s: '两头都数了，重复减一遍。', color: BLUE, at: 2 }
    ]
  })

  /* 7 小挑战 1：一队 10 人，小明从前数第 4 → 后面 6 人 */
  var CX7 = function (i) { return 400 + i * 120 }
  var e7 = [
    lbl(960, 165, '一队 10 人，小明从前数第 4 个，他后面还有几人？', GREY, [0, 0.2], { font: 'kl', size: 40 }),
    { t: 'slot', id: 'q7', x: 1760, y: 420, size: 104, at: [1, '几个人'] },
    lbl(1760, 520, '人', GREY, [1, '几个人', 0.2], { font: 'kl', size: 44 }),
    { t: 'think', x: 960, y: 790, at: [2, '想一想', 0.7], from: 5, pulse: 'q7' }
  ]
  ends(e7, 270, 1600, 420, [3, '画圈圈'])
  for (var i7 = 0; i7 < 10; i7++) {
    e7.push(circ(i7 === 3, CX7(i7), 420, 76, [3, '画圈圈', i7 * 0.1], { glow: i7 < 4 ? [3, '一共四个', i7 * 0.15] : [5, '六', (i7 - 4) * 0.12] }))
    if (i7 < 4) e7.push(lbl(CX7(i7), 330, String(i7 + 1), BLUE, [3, '一共四个', i7 * 0.15], { font: 'num', size: 40 }))
  }
  e7 = e7.concat([
    lbl(CX7(3), 250, '小明', BLUE, [3, '小明'], { font: 'kl', size: 38 }),
    { t: 'brace', x: (CX7(0) + CX7(3)) / 2, y: 520, w: 440, label: '4 个（有小明）', color: BLUE, at: [3, '一共四个'] },
    { t: 'brace', x: (CX7(4) + CX7(9)) / 2, y: 520, w: 680, label: '后面 6 人', color: RED, at: [4, '后面还有'] },
    lbl(960, 660, '10 − 4 = 6', GREEN, [4, '十减四'], { font: 'num', size: 58 }),
    fill('q7', [4, '六个人'], '6'),
    { t: 'check', x: 1880, y: 415, at: [5, '正好', 0.2] },
    { t: 'stamp', x: 1580, y: 810, s: '答：后面 6 人', color: RED, size: 50, rot: -6, at: [5, '十人', 0.8] }
  ])
  S.push({
    tag: '小挑战 | 第 1 题',
    beats: [
      { sub: '小挑战，第一题：一队一共 10 人，', say: '小挑战，第一题：一队一共十人，' },
      { sub: '小明从前数是第 4 个，他后面还有几人？', say: '小明从前往后数，是第四个。他后面，还有几个人？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '画圈圈：第 4 个，就是小明和前面的，一共 4 个。', say: '画圈圈：第四个，就是小明和前面的人，一共四个。' },
      { sub: '10 减 4，后面还有 **6** 个人！', say: '十减四，后面还有六个人！' },
      { sub: '验一验：4 加 6，正好 10 人！', say: '验一验：四加六，正好十人！', pause: 1 }
    ],
    els: e7
  })

  /* 8 小挑战 2：小华从前第 7、从后第 9 → 7 + 9 − 1 = 15 */
  var CX8 = function (i) { return 330 + i * 90 }
  var e8 = [
    lbl(960, 165, '小华从前数第 7 个，从后数第 9 个，这一排有几人？', GREY, [0, 0.2], { font: 'kl', size: 40 }),
    { t: 'slot', id: 'q8', x: 1760, y: 420, size: 104, at: [1, '几人'] },
    lbl(1760, 520, '人', GREY, [1, '几人', 0.2], { font: 'kl', size: 44 }),
    { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q8' },
    { t: 'band', x: (CX8(0) + CX8(6)) / 2, y: 410, w: CX8(6) - CX8(0) + 100, h: 130, color: BAND_B, at: [2, '两头'] },
    { t: 'band', x: (CX8(6) + CX8(14)) / 2, y: 430, w: CX8(14) - CX8(6) + 100, h: 130, color: BAND_R, at: [2, '两头', 0.3] },
    lbl(CX8(6), 250, '小华', BLUE, [2, '小华'], { font: 'kl', size: 38 }),
    lbl((CX8(0) + CX8(6)) / 2, 315, '从前数：第 7 个', BLUE, [2, '两头'], { font: 'kl', size: 36 }),
    lbl((CX8(6) + CX8(14)) / 2, 530, '从后数：第 9 个', RED, [2, '两头', 0.3], { font: 'kl', size: 36 })
  ]
  for (var i8 = 0; i8 < 15; i8++) {
    e8.push(circ(i8 === 6, CX8(i8), 420, 62, [2, '画圈圈', i8 * 0.06], { glow: i8 === 6 ? [2, '两次'] : undefined }))
  }
  e8 = e8.concat([
    lbl(960, 660, '7 + 9 − 1 = 15', GREEN, [3, '七加九减一'], { font: 'num', size: 60 }),
    fill('q8', [3, '十五'], '15'),
    { t: 'check', x: 1870, y: 415, at: [3, '十五', 0.3] },
    { t: 'stamp', x: 1580, y: 810, s: '答：一共 15 人', color: RED, size: 50, rot: -6, at: [3, '十五', 0.9] }
  ])
  S.push({
    tag: '小挑战 | 第 2 题',
    beats: [
      { sub: '第二题：小华从前数第 7，从后数第 9，', say: '第二题：小华从前往后数是第七个，从后往前数是第九个，', rate: '-6%' },
      { sub: '这一排有几人？这次，用哪一招？', say: '这一排有几人？这次，用哪一招？', pause: 5 },
      { sub: '画圈圈：两头都数了，小华被数了两次。', say: '画圈圈：两头都数了，小华被数了两次。' },
      { sub: '重复减一遍：7 + 9 − 1，**15** 人！', say: '重复减一遍：七加九减一，一共十五人！', pause: 1 }
    ],
    els: e8
  })

  /* 9 结尾 + 下一课预告 */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天，我们学会了两招：', say: '今天，我们学会了两招：' },
      { sub: '画圈圈数一数；自己只能算一次。', say: '画圈圈，数一数；自己，只能算一次。' },
      { sub: '下一课，我们来认识「趣味陷阱题」！', say: '下一课，我们来认识，趣味陷阱题！', pitch: '+4Hz' },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: [
      { t: 'card', x: 760, y: 420, title: '第一招', sub: '画圈圈', color: BLUE, at: 0, glow: [1, '画圈圈'] },
      { t: 'card', x: 1160, y: 420, title: '第二招', sub: '自己算一次', color: RED, at: [0, 0.3], glow: [1, '自己'] },
      { t: 'card', x: 960, y: 690, title: '下一课 · 第 18 课', sub: '趣味陷阱题', color: ORANGE, at: [2, '下一课'], glow: [2, '陷阱'], out: 3 },
      { t: 'tape', x: 960, y: 690, s: '去练习纸上试试吧！', size: 50, at: [3, '练习纸'] }
    ]
  })

  /* 封面 */
  var cv = [
    { t: 'txt', x: 960, y: 140, s: '奥数 · 第 17 课 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
    { t: 'tape', x: 960, y: 290, s: '排队问题', size: 150, at: 0 },
    { t: 'txt', x: 960, y: 440, s: '自己别忘算，重复减一遍', size: 58, color: RED, font: 'kl', at: 0 }
  ]
  for (var c = 0; c < 8; c++) {
    cv.push(kid(c === 3 ? 0 : KIDS[c], 445 + c * 147, 620, 110, 0))
    cv.push(circ(c === 3, 445 + c * 147, 745, 56, 0))
  }
  cv.push({ t: 'txt', x: 960, y: 850, s: '3 + 4 + 1 = 8 人', size: 56, color: GREEN, font: 'num', at: 0 })
  S.cover = { tag: null, els: cv }

  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
