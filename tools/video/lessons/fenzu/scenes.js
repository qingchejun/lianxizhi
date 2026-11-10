/* 19 合理分组问题 · 讲解视频分镜 v1（对标 08；关键动作用 [beat, '关键词'] 对齐配音）
 * 第一招「圈一圈」：几个一份圈一圈，圈到不够就算完（正好分组 / 分组有剩余）。
 * 第二招「配一配」：一对一连线，少的那样先用完 —— 能配几组看少的（配对分组）。
 * 引入：12 个橘子，每 3 个装一袋，一个一个数，数乱了。
 * 第一招：12 个 3 个一圈 → 4 袋（3 + 3 + 3 + 3 = 12）；14 个 → 圈 4 圈剩 2 个，最多装满 4 袋。
 * 冲突：6 个男生、4 个女生，一男一女一组 —— 不是几个一份，圈不了了！
 * 第二招：连线配对，女生用完，剩 2 个男生 → 4 组。
 * 小挑战：17 个饺子每 5 个一盘 → 3 盘剩 2 个；7 男 9 女一男一女 → 7 组。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420'
  var BOYS = [0, 2, 4], GIRLS = [1, 3, 5]
  var NTH = ['一', '两', '三', '四', '五', '六', '七']

  function lbl(x, y, s, color, at, o) {
    o = o || {}
    return { t: 'txt', id: o.id, x: x, y: y, s: s, size: o.size || 40, font: o.font || 'kai', color: color || GREY, at: at, out: o.out, anim: o.anim, glow: o.glow, glow2: o.glow2, overlapOk: o.overlapOk }
  }
  function fill(id, at, val) { return { t: 'fill', id: id, at: at, val: val } }
  function item(k, x, y, size, at, o) {
    o = o || {}
    return { t: 'item', k: k, x: x, y: y, size: size, at: at, out: o.out, glow: o.glow, glow2: o.glow2, anim: o.anim, overlapOk: true }
  }
  /* 一排东西几个一圈：xs(i) 第 i 个的 x；k 每份；g 圈几圈；at(j) 第 j 圈出现时刻 */
  function circles(arr, xs, y, k, g, h, at, o) {
    o = o || {}
    var step = xs(1) - xs(0)
    for (var j = 0; j < g; j++) {
      arr.push({ t: 'loop', x: (xs(j * k) + xs(j * k + k - 1)) / 2, y: y, w: step * k - 14, h: h, color: j % 2 ? RED : BLUE, at: at(j), out: o.out })
      if (o.num) arr.push(lbl((xs(j * k) + xs(j * k + k - 1)) / 2, y + h / 2 + 36, String(j + 1), j % 2 ? RED : BLUE, at(j), { font: 'num', size: 40, out: o.out }))
    }
  }
  /* 男生一排、女生一排 */
  function kidsRows(arr, nb, ng, xs, yb, yg, size, at, o) {
    o = o || {}
    for (var i = 0; i < nb; i++) arr.push(item('kid' + BOYS[i % 3], xs(i), yb, size, at ? (Array.isArray(at) ? [at[0], at[1] || 0, i * 0.06] : at) : 0, { glow: o.boyGlow ? o.boyGlow(i) : undefined }))
    for (var j = 0; j < ng; j++) arr.push(item('kid' + GIRLS[j % 3], xs(j), yg, size, at ? (Array.isArray(at) ? [at[0], at[1] || 0, 0.3 + j * 0.06] : at) : 0, { glow: o.girlGlow ? o.girlGlow(j) : undefined }))
  }

  var S = []

  /* 0 开场 */
  var e0 = [
    { t: 'txt', x: 960, y: 230, s: '奥数 · 第 19 课', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
    { t: 'tape', x: 960, y: 360, s: '合理分组问题', size: 120, at: [0, 0.2] },
    lbl(960, 560, '上一课：问啥就答啥', BLUE, [1, '上一课'], { font: 'kl', size: 50, out: [2, 0] })
  ]
  for (var i0 = 0; i0 < 6; i0++) e0.push(item('orange', 700 + i0 * 104, 650, 84, [2, '分组', i0 * 0.08]))
  circles(e0, function (i) { return 700 + i * 104 }, 650, 3, 2, 120, function (j) { return [2, '分组', 0.6 + j * 0.3] })
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '上一课，我们学了趣味陷阱题：问啥就答啥。', say: '上一课，我们学了趣味陷阱题：问啥就答啥。' },
      { sub: '今天，我们来认识合理分组问题！', say: '今天，我们来认识合理分组问题！' }
    ],
    els: e0
  })

  /* 1 引入：12 个橘子乱放，一个一个数，数乱了 */
  var OUT1 = [3, '两招']
  var SC = [[560, 360], [720, 300], [880, 380], [1050, 310], [1220, 370], [1380, 300],
    [620, 520], [790, 470], [960, 540], [1130, 480], [1300, 540], [1450, 460]]
  var ORD = [4, 0, 9, 2, 7, 11, 1, 5] // 东一个西一个地数
  var e1 = [
    lbl(960, 165, '12 个橘子，每 3 个装一袋，能装几袋？', GREY, [1, 0], { font: 'kl', size: 44, out: OUT1 }),
    { t: 'stamp', x: 960, y: 720, s: '数乱了！', color: ORANGE, size: 64, rot: -5, at: [2, '乱了'], out: OUT1 },
    { t: 'card', x: 760, y: 470, title: '第一招', sub: '圈一圈', color: BLUE, at: [3, '两招', 0.3] },
    { t: 'card', x: 1160, y: 470, title: '第二招', sub: '配一配', color: RED, at: [3, '两招', 0.6] }
  ]
  for (var i1 = 0; i1 < 12; i1++) {
    var gi = ORD.indexOf(i1)
    e1.push(item('orange', SC[i1][0], SC[i1][1], 96, [0, '橘子', i1 * 0.08], { out: OUT1, glow: gi >= 0 ? [2, '一个一个', gi * 0.3] : undefined }))
  }
  S.push({
    tag: '合理分组',
    beats: [
      { sub: '妈妈买了 12 个橘子，要每 3 个装一袋。', say: '妈妈买了十二个橘子，要每三个装一袋。' },
      { sub: '能装几袋呢？', say: '能装几袋呢？', rate: '-6%' },
      { sub: '一个一个数，数着数着，就乱了！', say: '一个一个数，数着数着，就乱了！', pitch: '+8Hz' },
      { sub: '怎么分又快又清楚？今天教你两招。', say: '怎么分，又快又清楚？今天，教你两招。' }
    ],
    els: e1
  })

  /* 2 第一招：圈一圈（12 个 → 正好 4 袋） */
  var OX = function (i) { return 380 + i * 100 }
  var e2 = [
    { t: 'big', x: 960, y: 470, title: '第一招', sub: '几个一份，圈一圈', color: BLUE, at: 0, out: [1, 0] },
    { t: 'slot', id: 'q2', x: 1740, y: 430, size: 104, at: [1, 0.3] },
    lbl(1740, 530, '袋', GREY, [1, 0.5], { font: 'kl', size: 44 })
  ]
  for (var i2 = 0; i2 < 12; i2++) e2.push(item('orange', OX(i2), 430, 84, [1, 0, i2 * 0.05]))
  circles(e2, OX, 430, 3, 4, 130, function (j) { return [1, NTH[j] + '袋'] }, { num: true })
  e2 = e2.concat([
    fill('q2', [2, '四袋'], '4'),
    lbl(900, 700, '3 + 3 + 3 + 3 = 12', GREEN, [3, '三加三'], { font: 'num', size: 58 }),
    { t: 'check', x: 1850, y: 425, at: [3, '正好', 0.2] },
    { t: 'stamp', x: 1580, y: 830, s: '答：正好装 4 袋', color: RED, size: 48, rot: -6, at: [3, '十二', 0.6] }
  ])
  S.push({
    tag: '第一招 | 圈一圈',
    beats: [
      { sub: '第一招：几个一份，圈一圈。', say: '第一招：几个一份，圈一圈。' },
      { sub: '3 个一圈：一袋、两袋、三袋、四袋。', say: '三个一圈：一袋、两袋、三袋、四袋。' },
      { sub: '正好圈完，一共 **4** 袋！', say: '正好圈完，一共四袋！' },
      { sub: '验一验：3 加 3 加 3 加 3，正好 12！', say: '验一验：三加三加三加三，正好十二！', pause: 1 }
    ],
    els: e2
  })

  /* 3 第一招续：14 个 → 圈 4 圈剩 2 个 */
  var OX3 = function (i) { return 330 + i * 88 }
  var e3 = [
    lbl(960, 165, '要是有 14 个橘子呢？', GREY, [0, 0.2], { font: 'kl', size: 46 }),
    { t: 'slot', id: 'q3', x: 1740, y: 430, size: 104, at: [0, 0.4] },
    lbl(1740, 530, '袋', GREY, [0, 0.6], { font: 'kl', size: 44 }),
    { t: 'loop', x: (OX3(12) + OX3(13)) / 2, y: 430, w: 170, h: 120, color: GREY, dashed: true, at: [2, '不够'] },
    lbl((OX3(12) + OX3(13)) / 2, 530, '不够一袋', GREY, [2, '不够'], { font: 'kl', size: 34 })
  ]
  for (var i3 = 0; i3 < 14; i3++) e3.push(item('orange', OX3(i3), 430, 76, [0, '十四', i3 * 0.05], { glow: i3 >= 12 ? [1, '还剩'] : undefined }))
  circles(e3, OX3, 430, 3, 4, 120, function (j) { return [1, '圈了', j * 0.3] })
  e3 = e3.concat([
    fill('q3', [3, '四袋'], '4'),
    { t: 'check', x: 1850, y: 425, at: [3, '四袋', 0.3] },
    { t: 'stamp', x: 1500, y: 760, s: '答：装满 4 袋，剩 2 个', color: RED, size: 46, rot: -6, at: [3, '两个', 0.6] }
  ])
  S.push({
    tag: '第一招 | 圈一圈',
    beats: [
      { sub: '要是有 14 个橘子呢？', say: '要是，有十四个橘子呢？', rate: '-6%' },
      { sub: '还是 3 个一圈：圈了 4 圈，还剩 2 个。', say: '还是三个一圈：圈了四圈，还剩两个。' },
      { sub: '2 个不够一袋，圈到不够，就算完！', say: '两个不够一袋，圈到不够，就算完！' },
      { sub: '最多装满 **4** 袋，还剩 2 个。', say: '最多装满四袋，还剩两个。', pause: 1 }
    ],
    els: e3
  })

  /* 4 冲突：6 男 4 女，一男一女一组 —— 圈不了 */
  var KX = function (i) { return 600 + i * 150 }
  var e4 = [
    lbl(960, 165, '6 个男生、4 个女生，一男一女一组，最多几组？', GREY, [1, 0], { font: 'kl', size: 42 }),
    lbl(380, 380, '男生', BLUE, [0, '男生'], { font: 'kl', size: 42 }),
    lbl(380, 640, '女生', RED, [0, '女生'], { font: 'kl', size: 42 }),
    { t: 'stamp', x: 1560, y: 520, s: '圈不了了！', color: ORANGE, size: 64, rot: -5, at: [2, '圈不了'] }
  ]
  kidsRows(e4, 6, 4, KX, 380, 640, 110, [0, '男生'])
  S.push({
    tag: '第一招 | 圈一圈',
    beats: [
      { sub: '再来一题：6 个男生、4 个女生做游戏，', say: '再来一题：六个男生、四个女生做游戏，' },
      { sub: '一男一女配一组，最多能分几组？', say: '一男一女配一组，最多能分几组？', rate: '-6%' },
      { sub: '这次不是几个一份，怎么圈？圈不了了！', say: '这次不是几个一份，怎么圈？圈不了了！', pitch: '+8Hz' }
    ],
    els: e4
  })

  /* 5 第二招：配一配（女生用完 → 4 组） */
  var e5 = [
    { t: 'big', x: 960, y: 470, title: '第二招', sub: '一对一，配一配', color: RED, at: 0, out: [1, 0] },
    lbl(380, 380, '男生', BLUE, [1, 0], { font: 'kl', size: 42 }),
    lbl(380, 640, '女生', RED, [1, 0], { font: 'kl', size: 42 }),
    { t: 'note', x: 1560, y: 170, s: '配对看少的', color: RED, at: [3, '少的'] },
    lbl((KX(4) + KX(5)) / 2, 270, '没人配了', GREY, [2, '没人配'], { font: 'kl', size: 36 }),
    { t: 'slot', id: 'q5', x: 1760, y: 510, size: 104, at: [1, 0.3] },
    lbl(1760, 610, '组', GREY, [1, 0.5], { font: 'kl', size: 44 })
  ]
  kidsRows(e5, 6, 4, KX, 380, 640, 110, [1, 0], {
    boyGlow: function (i) { return i >= 4 ? [2, '剩下', (i - 4) * 0.2] : undefined },
    girlGlow: function (j) { return [3, '少的', j * 0.15] }
  })
  for (var p5 = 0; p5 < 4; p5++) {
    e5.push({ t: 'seg', x1: KX(p5), y1: 445, x2: KX(p5), y2: 575, color: GREEN, sw: 7, at: [1, NTH[p5] + '组'] })
    e5.push(lbl(KX(p5) + 34, 510, String(p5 + 1), GREEN, [1, NTH[p5] + '组'], { font: 'num', size: 36 }))
  }
  e5 = e5.concat([
    fill('q5', [3, '四组'], '4'),
    { t: 'check', x: 1870, y: 505, at: [3, '四组', 0.3] },
    { t: 'stamp', x: 1580, y: 810, s: '答：最多 4 组', color: RED, size: 50, rot: -6, at: [3, '四组', 0.8] }
  ])
  S.push({
    tag: '第二招 | 配一配',
    beats: [
      { sub: '第二招：一对一，配一配。', say: '第二招：一对一，配一配。' },
      { sub: '一男配一女，连一条线：一组、两组、三组、四组。', say: '一个男生配一个女生，连一条线：一组、两组、三组、四组。' },
      { sub: '女生用完了！剩下 2 个男生，没人配了。', say: '女生用完了！剩下两个男生，没人配了。', pitch: '+5Hz' },
      { sub: '少的那边有几个，就分几组：**4** 组！', say: '少的那边有几个，就能分几组：四组！', pause: 1 }
    ],
    els: e5
  })

  /* 6 口诀（讲解页原文） */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '几个一份圈一圈，', say: '几个一份圈一圈，', rate: '-15%' },
      { sub: '圈到不够就算完。', say: '圈到不够就算完。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 480, w: 1360, h: 400, at: 0 },
      { t: 'chant', x: 960, y: 420, s: '几个一份圈一圈，', color: RED, at: 1 },
      { t: 'chant', x: 960, y: 570, s: '圈到不够就算完。', color: BLUE, at: 2 }
    ]
  })

  /* 7 小挑战 1：17 个饺子，每 5 个一盘 → 3 盘剩 2 个 */
  var DX = function (i) { return 290 + i * 80 }
  var e7 = [
    lbl(960, 165, '有 17 个饺子，每 5 个装一盘，最多能装满几盘？', GREY, [0, 0.2], { font: 'kl', size: 40 }),
    { t: 'slot', id: 'q7', x: 1760, y: 430, size: 104, at: [1, '几盘'] },
    lbl(1760, 530, '盘', GREY, [1, '几盘', 0.2], { font: 'kl', size: 44 }),
    { t: 'think', x: 960, y: 790, at: [2, '想一想', 0.7], from: 5, pulse: 'q7' },
    { t: 'loop', x: (DX(15) + DX(16)) / 2, y: 430, w: 150, h: 110, color: GREY, dashed: true, at: [4, '不够'] },
    lbl((DX(15) + DX(16)) / 2, 525, '不够一盘', GREY, [4, '不够'], { font: 'kl', size: 32 })
  ]
  for (var i7 = 0; i7 < 17; i7++) e7.push(item('dumpling', DX(i7), 438, 74, [0, '饺子', i7 * 0.04], { glow: i7 >= 15 ? [4, '还剩'] : undefined }))
  circles(e7, DX, 430, 5, 3, 140, function (j) { return [3, NTH[j] + '盘'] }, { num: true })
  e7 = e7.concat([
    fill('q7', [4, '三盘'], '3'),
    lbl(900, 660, '5 + 5 + 5 + 2 = 17', GREEN, [5, '五加五'], { font: 'num', size: 56 }),
    { t: 'check', x: 1870, y: 425, at: [5, '正好', 0.2] },
    { t: 'stamp', x: 1520, y: 820, s: '答：装满 3 盘，剩 2 个', color: RED, size: 44, rot: -6, at: [5, '十七', 0.6] }
  ])
  S.push({
    tag: '小挑战 | 第 1 题',
    beats: [
      { sub: '小挑战，第一题：有 17 个饺子，', say: '小挑战，第一题：有十七个饺子，' },
      { sub: '每 5 个装一盘，最多能装满几盘？', say: '每五个装一盘，最多能装满几盘？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '圈一圈：5 个一圈，一盘、两盘、三盘。', say: '圈一圈：五个一圈，一盘、两盘、三盘。' },
      { sub: '还剩 2 个，不够一盘：最多装满 **3** 盘！', say: '还剩两个，不够一盘了：最多装满三盘！' },
      { sub: '验一验：5 加 5 加 5，再加 2，正好 17！', say: '验一验：五加五加五，再加二，正好十七！', pause: 1 }
    ],
    els: e7
  })

  /* 8 小挑战 2：7 男 9 女 → 7 组 */
  var KX8 = function (i) { return 330 + i * 130 }
  var e8 = [
    lbl(960, 165, '7 个男生、9 个女生，一男一女一组，最多几组？', GREY, [0, 0.2], { font: 'kl', size: 40 }),
    { t: 'slot', id: 'q8', x: 1740, y: 480, size: 104, at: [1, '几组'] },
    lbl(1740, 580, '组', GREY, [1, '几组', 0.2], { font: 'kl', size: 44 }),
    { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q8' },
    lbl((KX8(7) + KX8(8)) / 2, 700, '没人配了', GREY, [2, '还剩'], { font: 'kl', size: 34 }),
    lbl(900, 760, '男生少：7 个 → 7 组', GREEN, [3, '少的'], { font: 'kl', size: 48 })
  ]
  kidsRows(e8, 7, 9, KX8, 360, 600, 92, [0, '男生'], {
    boyGlow: function (i) { return [3, '少的', i * 0.1] },
    girlGlow: function (j) { return j >= 7 ? [2, '还剩', (j - 7) * 0.2] : undefined }
  })
  for (var p8 = 0; p8 < 7; p8++) e8.push({ t: 'seg', x1: KX8(p8), y1: 415, x2: KX8(p8), y2: 545, color: GREEN, sw: 6, at: [2, '配一配', p8 * 0.25] })
  e8 = e8.concat([
    fill('q8', [3, '七组'], '7'),
    { t: 'check', x: 1850, y: 475, at: [3, '七组', 0.3] },
    { t: 'stamp', x: 1580, y: 830, s: '答：最多 7 组', color: RED, size: 50, rot: -6, at: [3, '七组', 0.8] }
  ])
  S.push({
    tag: '小挑战 | 第 2 题',
    beats: [
      { sub: '第二题：7 个男生、9 个女生，一男一女一组，', say: '第二题：七个男生、九个女生，一男一女一组，' },
      { sub: '最多几组？这次，用哪一招？', say: '最多能分几组？这次，用哪一招？', rate: '-6%', pause: 5 },
      { sub: '配一配：男生配完了，女生还剩 2 个。', say: '配一配：男生配完了，女生还剩两个。' },
      { sub: '看少的那边：男生 7 个，最多 **7** 组！', say: '看少的那边：男生七个，最多七组！', pause: 1 }
    ],
    els: e8
  })

  /* 9 结尾 + 下一课预告 */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天，我们学会了两招：', say: '今天，我们学会了两招：' },
      { sub: '几个一份圈一圈；配对就看少的。', say: '几个一份，圈一圈；配对，就看少的。' },
      { sub: '下一课，我们来认识「和不变与差不变」！', say: '下一课，我们来认识，和不变与差不变！', pitch: '+4Hz' },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: [
      { t: 'card', x: 760, y: 420, title: '第一招', sub: '圈一圈', color: BLUE, at: 0, glow: [1, '圈一圈'] },
      { t: 'card', x: 1160, y: 420, title: '第二招', sub: '配一配', color: RED, at: [0, 0.3], glow: [1, '配对'] },
      { t: 'card', x: 960, y: 690, title: '下一课 · 第 20 课', sub: '和不变与差不变', color: ORANGE, at: [2, '下一课'], glow: [2, '差不变'], out: 3 },
      { t: 'tape', x: 960, y: 690, s: '去练习纸上试试吧！', size: 50, at: [3, '练习纸'] }
    ]
  })

  /* 封面 */
  var cv = [
    { t: 'txt', x: 960, y: 140, s: '奥数 · 第 19 课 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
    { t: 'tape', x: 960, y: 290, s: '合理分组问题', size: 140, at: 0 },
    { t: 'txt', x: 960, y: 440, s: '几个一份圈一圈', size: 58, color: RED, font: 'kl', at: 0 }
  ]
  var CVX = function (i) { return 410 + i * 100 }
  for (var c = 0; c < 12; c++) cv.push(item('orange', CVX(c), 640, 84, 0))
  circles(cv, CVX, 640, 3, 4, 130, function () { return 0 })
  cv.push({ t: 'txt', x: 960, y: 830, s: '12 个，3 个一份 → 正好 4 份', size: 54, color: GREEN, font: 'kl', at: 0 })
  S.cover = { tag: null, els: cv }

  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
