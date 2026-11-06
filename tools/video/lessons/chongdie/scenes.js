/* 11 重叠问题 · 讲解视频分镜 v1（对标 08；关键动作用 [beat, '关键词'] 对齐配音） */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420'
  var PALE_B = '#cfe0f2', PALE_R = '#f6d3cf', PALE_G = '#e6ded0'

  function stagger(at, d) {
    if (!Array.isArray(at)) return [at, d]
    if (typeof at[1] === 'string') return [at[0], at[1], (at[2] || 0) + d]
    return [at[0], (at[1] || 0) + d]
  }
  function lbl(x, y, s, color, at, o) {
    o = o || {}
    return { t: 'txt', id: o.id, x: x, y: y, s: s, size: o.size || 40, font: o.font || 'kai', color: color || GREY, at: at, out: o.out, anim: o.anim, glow: o.glow, move: o.move, overlapOk: o.overlapOk }
  }
  function fill(id, at, val) { return { t: 'fill', id: id, at: at, val: val } }
  function kid(i, x, y, size, at, o) {
    o = o || {}
    return { t: 'item', k: 'kid' + (i % 6), id: o.id, x: x, y: y, size: size, at: at, out: o.out, dim: o.dim, glow: o.glow, overlapOk: o.overlapOk }
  }
  /* 韦恩图两个圈：左蓝右红 */
  function venn(at, o) {
    o = o || {}
    return [
      { t: 'loop', x: 780, y: 500, w: 700, h: 480, color: BLUE, at: o.atL || at, out: o.out },
      { t: 'loop', x: 1140, y: 500, w: 700, h: 480, color: RED, at: o.atR || at, out: o.out }
    ]
  }

  var S = []

  /* 0 开场 */
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '上一课，我们玩了「换一换」。', say: '上一课，我们玩了换一换的游戏。' },
      { sub: '今天，来学「重叠问题」：小心，有人会被数两次！', say: '今天，来学重叠问题：小心，有人会被数两次！' }
    ],
    els: [
      { t: 'txt', x: 960, y: 230, s: '奥数 · 第 11 课', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
      { t: 'tape', x: 960, y: 360, s: '重叠问题', size: 130, at: [0, 0.2] },
      { t: 'loop', x: 820, y: 680, w: 440, h: 300, color: BLUE, at: [2, '重叠问题'] },
      { t: 'loop', x: 1100, y: 680, w: 440, h: 300, color: RED, at: [2, '重叠问题', 0.3] },
      kid(0, 700, 680, 110, [2, '重叠问题', 0.5]),
      kid(3, 960, 680, 120, [2, '有人'], { glow: [2, '数两次'] }),
      kid(4, 1220, 680, 110, [2, '重叠问题', 0.7])
    ]
  })

  /* 1 引入：举手数人数 → 5 + 4 = 9，可只有 7 人 */
  var KX = [420, 600, 780, 960, 1140, 1320, 1500], KY = 470
  var e1 = []
  var hb = ['一', '二', '三', '四', '五'], hs = ['一', '二', '三', '四']
  KX.forEach(function (x, i) {
    var draw = i < 5 ? [1, hb[i]] : null, sing = i >= 3 ? [3, hs[i - 3]] : null
    var o = { id: 'k' + i, out: 7, glow: draw || sing }
    if (draw && sing) o.glow2 = sing
    var k = kid(i, x, KY, 150, stagger(0, i * 0.12), o); if (o.glow2) k.glow2 = o.glow2
    e1.push(k)
    if (draw) e1.push(lbl(x, KY - 125, String(i + 1), BLUE, draw, { font: 'num', size: 56, out: 7 }))
    if (sing) e1.push(lbl(x, KY + 125, String(i - 2), RED, sing, { font: 'num', size: 56, out: 7 }))
  })
  e1 = e1.concat([
    lbl(330, KY - 125, '画画', BLUE, [0, '画画'], { font: 'kl', size: 40, out: 7 }),
    lbl(330, KY + 125, '唱歌', RED, [2, '唱歌'], { font: 'kl', size: 40, out: 7 }),
    { t: 'txt', x: 700, y: 790, s: '5 + 4 = 9', size: 66, font: 'num', color: INK, at: [4, '五加四'], out: 5 },
    { t: 'stamp', x: 1300, y: 790, s: '只有 7 个人！', color: ORANGE, size: 50, rot: -5, at: [4, '只有'], out: 5 },
    { t: 'loop', x: 1050, y: KY, w: 400, h: 440, color: ORANGE, at: [5, '这两个'], out: 7 },
    lbl(1050, 790, '被数了 2 次', ORANGE, [5, '数了两次'], { font: 'kl', size: 56, out: 7 }),
    { t: 'tape', x: 960, y: 230, s: '重叠', size: 70, at: [6, '重叠'], out: 7 },
    { t: 'card', x: 760, y: 470, title: '第一招', sub: '分三块数', color: BLUE, at: [7, '两招'] },
    { t: 'card', x: 1160, y: 470, title: '第二招', sub: '先加再减', color: RED, at: [7, '两招', 0.3] }
  ])
  S.push({
    tag: '重叠问题',
    beats: [
      { sub: '老师问：参加画画的，举手！', say: '老师问：参加画画的，举手！' },
      { sub: '1、2、3、4、5，5 个人。', say: '一、二、三、四、五，五个人。' },
      { sub: '参加唱歌的，举手！', say: '参加唱歌的，举手！' },
      { sub: '1、2、3、4，4 个人。', say: '一、二、三、四，四个人。' },
      { sub: '5 + 4 = 9。可是数一数，这里只有 7 个小朋友！', say: '五加四，等于九。可是数一数，这里只有七个小朋友！', pitch: '+6Hz' },
      { sub: '原来，这两个小朋友画画、唱歌都参加了——被数了两次！', say: '原来，这两个小朋友，画画唱歌都参加了，被数了两次！' },
      { sub: '两组里都有的，就叫「重叠」。', say: '两组里都有的，就叫重叠。' },
      { sub: '怎样才不会数错？今天，教你两招。', say: '怎样才不会数错？今天，教你两招。' }
    ],
    els: e1
  })

  /* 2 第一招：分三块数（跳绳 6，踢毽 5，都参加 3 → 8） */
  var MID = [[900, 425], [1020, 425], [960, 555]], LEFT = [[540, 425], [680, 425], [610, 555]], RIGHT = [[1280, 425], [1370, 555]]
  var e2 = [
    { t: 'big', x: 960, y: 470, title: '第一招', sub: '分三块数', color: BLUE, at: 0, out: 1 },
    lbl(560, 215, '跳绳 6 人', BLUE, [1, '跳绳'], { font: 'kl', size: 44 }),
    lbl(960, 215, '都参加 3 人', ORANGE, [1, '两样都'], { font: 'kl', size: 44 }),
    lbl(1360, 215, '踢毽 5 人', RED, [1, '踢毽'], { font: 'kl', size: 44 })
  ].concat(venn(null, { atL: [1, '跳绳'], atR: [1, '踢毽'] }))
  MID.forEach(function (p, i) { var k = kid(i + 3, p[0], p[1], 90, [3, '三人', i * 0.2], { glow: [7, '六个', 0.15 * (3 + i)] }); k.glow2 = [7, '五个', 0.15 * i]; e2.push(k) })
  LEFT.forEach(function (p, i) { e2.push(kid(i, p[0], p[1], 90, [4, '放左边', -0.6 + i * 0.2], { glow: [7, '六个', 0.15 * i] })) })
  RIGHT.forEach(function (p, i) { e2.push(kid(i + 1, p[0], p[1], 90, [5, '放右边', -0.6 + i * 0.2], { glow: [7, '五个', 0.15 * (3 + i)] })) })
  e2 = e2.concat([
    { t: 'varrow', x: 960, y1: 245, y2: 330, color: ORANGE, at: [3, '放在中间'] },
    lbl(640, 642, '6 − 3 = 3', BLUE, [4, '六减三'], { font: 'num', size: 44 }),
    lbl(1285, 642, '5 − 3 = 2', RED, [5, '五减三'], { font: 'num', size: 44 }),
    { t: 'txt', x: 760, y: 825, s: '3 + 3 + 2 =', size: 64, font: 'num', color: INK, at: [6, '三加三'] },
    { t: 'slot', id: 'q2', x: 1040, y: 825, size: 104, at: [2, '几个人'] },
    lbl(1145, 825, '人', GREY, [2, '几个人', 0.2], { font: 'kl', size: 48 }),
    fill('q2', [6, '一共八'], '8'),
    { t: 'check', x: 1240, y: 820, at: [7, '对啦'] },
    { t: 'stamp', x: 1560, y: 825, s: '答：8 人', color: RED, size: 50, rot: -6, at: [7, '对啦', 0.9] }
  ])
  S.push({
    tag: '第一招 | 分三块数',
    beats: [
      { sub: '第一招：分三块数。', say: '第一招：分三块数。' },
      { sub: '跳绳 6 人，踢毽 5 人，两样都参加的 3 人。', say: '参加跳绳的有六人，踢毽的有五人，两样都参加的有三人。' },
      { sub: '一共有几个人？', say: '一共有几个人？', rate: '-6%' },
      { sub: '先把两样都参加的 3 人，放在中间。', say: '先把两样都参加的三人，放在中间。' },
      { sub: '只跳绳的：6 − 3 = 3 人，放左边。', say: '只跳绳的：六减三，等于三人，放左边。' },
      { sub: '只踢毽的：5 − 3 = 2 人，放右边。', say: '只踢毽的：五减三，等于二人，放右边。' },
      { sub: '三块加起来：3 + 3 + 2 = 8，一共 **8** 人。', say: '三块加起来：三加三加二，等于八，一共八人。' },
      { sub: '验一验：蓝圈里 6 个，红圈里 5 个，对啦！', say: '验一验：蓝圈里六个，红圈里五个，对啦！', pause: 1 }
    ],
    els: e2
  })
  /* 3 冲突：数字一大，画不下了 */
  var e3 = [
    lbl(560, 215, '足球 18 人', BLUE, [0, '足球'], { font: 'kl', size: 44 }),
    lbl(960, 215, '都参加 6 人', ORANGE, [0, '两样都'], { font: 'kl', size: 44 }),
    lbl(1360, 215, '篮球 15 人', RED, [0, '篮球'], { font: 'kl', size: 44 })
  ].concat(venn(null, { atL: [0, '足球'], atR: [0, '篮球'] }))
  /* 27 个小人：只足球 12、都参加 6、只篮球 9，挤在圈里（伪随机位置，固定种子） */
  var seed = 7
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
  var pos = []
  function scatter(n, x0, x1) { for (var i = 0; i < n; i++) pos.push([x0 + rnd() * (x1 - x0), 340 + rnd() * 320]) }
  scatter(12, 470, 750); scatter(6, 840, 1080); scatter(9, 1170, 1450)
  pos.forEach(function (p, i) { e3.push(kid(i, p[0], p[1], 86, [2, '一个一个画', 0.25 + i * 0.09], { overlapOk: true, dim: [3, '画不下'] })) })
  e3 = e3.concat([
    { t: 'slot', id: 'q3', x: 1700, y: 760, size: 104, at: [1, '几个人'] },
    lbl(1700, 860, '人', GREY, [1, '几个人', 0.2], { font: 'kl', size: 40 }),
    { t: 'stamp', x: 960, y: 500, s: '画不下了！', color: ORANGE, size: 72, rot: -5, at: [3, '画不下'] },
    { t: 'mess', x: 1640, y: 470, at: [3, '画不下', 0.3] }
  ])
  S.push({
    tag: '第一招 | 分三块数',
    beats: [
      { sub: '再看这道：足球 18 人，篮球 15 人，两样都参加 6 人。', say: '再看这道：参加足球的有十八人，篮球的有十五人，两样都参加的有六人。' },
      { sub: '一共有几个人？', say: '一共有几个人？', rate: '-6%' },
      { sub: '还用分三块数？一个一个画……要画好多好多小人！', say: '还用分三块数？一个一个画，要画好多好多小人！' },
      { sub: '画不下了！', say: '画不下了！', pitch: '+10Hz', rate: '-5%' }
    ],
    els: e3
  })

  /* 4 第二招：先加再减（人数画成长条：30px = 1 人） */
  var U = 30, BX = 555, BY = 330, RY = 450
  var bx1 = BX + 18 * U, rx0 = bx1 - 6 * U, rx1 = rx0 + 15 * U
  S.push({
    tag: '第二招 | 先加再减',
    beats: [
      { sub: '别急，用第二招：先加，再减。', say: '别急，用第二招：先加，再减。' },
      { sub: '把人数画成两根长条：足球 18 人，篮球 15 人。', say: '把人数画成两根长条：足球十八人，篮球十五人。' },
      { sub: '两样都参加的 6 人，两根条里都有——这一段叠在一起。', say: '两样都参加的六人，两根条里都有，这一段叠在一起。' },
      { sub: '先加：18 + 15 = 33。可重叠的 6 人被数了两次！', say: '先加：十八加十五，等于三十三。可是，重叠的六人，被数了两次！' },
      { sub: '再减：33 − 6 = 27，一共 **27** 人。', say: '再减：三十三减六，等于二十七，一共二十七人。' },
      { sub: '验一验：12 + 6 + 9，正好 27 人！', say: '验一验：只足球的十二人，加都参加的六人，再加只篮球的九人，正好二十七人！', pause: 1 }
    ],
    els: [
      { t: 'big', x: 960, y: 470, title: '第二招', sub: '先加再减', color: RED, at: 0, out: 1 },
      { t: 'strip', x0: BX, y: BY, w: 18 * U, h: 80, unit: U, fill: PALE_B, at: [1, '足球'] },
      lbl(BX - 135, BY, '足球 18 人', BLUE, [1, '足球'], { font: 'kl', size: 42 }),
      { t: 'strip', x0: rx0, y: RY, w: 15 * U, h: 80, unit: U, fill: PALE_R, at: [1, '篮球'] },
      lbl(rx1 + 135, RY, '篮球 15 人', RED, [1, '篮球'], { font: 'kl', size: 42 }),
      { t: 'zone', id: 'z4', x0: rx0 - 6, y: (BY + RY) / 2, w: 6 * U + 12, h: RY - BY + 104, at: [2, '这一段'], glow: [3, '重叠的'] },
      lbl((rx0 + bx1) / 2, 230, '都参加 6 人', ORANGE, [2, '六人'], { font: 'kl', size: 42 }),
      { t: 'txt', x: 960, y: 660, s: '18 + 15 = 33', size: 64, font: 'num', color: INK, at: [3, '十八加十五'] },
      { t: 'txt', x: 860, y: 780, s: '33 − 6 =', size: 64, font: 'num', color: RED, at: [4, '三十三减六'] },
      { t: 'slot', id: 'q4', x: 1100, y: 780, size: 104, at: [4, '三十三减六', 0.3] },
      lbl(1205, 780, '人', GREY, [4, '三十三减六', 0.5], { font: 'kl', size: 48 }),
      fill('q4', [4, '一共'], '27'),
      { t: 'badge', x: (BX + rx0) / 2, y: BY, s: '12', color: GREEN, at: [5, '十二人'] },
      { t: 'badge', x: (rx0 + bx1) / 2, y: (BY + RY) / 2, s: '6', color: GREEN, at: [5, '六人'] },
      { t: 'badge', x: (bx1 + rx1) / 2, y: RY, s: '9', color: GREEN, at: [5, '九人'] },
      { t: 'check', x: 1300, y: 775, at: [5, '正好'] },
      { t: 'stamp', x: 1580, y: 660, s: '答：27 人', color: RED, size: 50, rot: -6, at: [5, '正好', 1.2] }
    ]
  })

  /* 5 口诀（讲解页原文） */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '两组加起来，', say: '两组，加起来，', rate: '-15%' },
      { sub: '重叠减一次。', say: '重叠，减一次。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 480, w: 900, h: 400, at: 0 },
      { t: 'chant', x: 960, y: 420, s: '两组加起来，', color: BLUE, at: 1 },
      { t: 'chant', x: 960, y: 570, s: '重叠减一次。', color: RED, at: 2 }
    ]
  })

  /* 6 小挑战 1：纸条 8 + 6，重叠 2（80px = 1 厘米） */
  var C = 100, AX = 360, AY = 370, BYY = 420, bx0 = AX + 6 * C
  S.push({
    tag: '小挑战 | 第 1 题',
    beats: [
      { sub: '小挑战，第一题：', say: '小挑战，第一题：' },
      { sub: '纸条一根 8 厘米、一根 6 厘米，粘起来重叠 2 厘米。', say: '一根纸条长八厘米，一根长六厘米，粘在一起，中间重叠了二厘米。' },
      { sub: '粘好后，一共长多少厘米？', say: '粘好后，一共长多少厘米？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '重叠的 2 厘米，两根纸条都量到了，多算了一次。', say: '重叠的二厘米，两根纸条都量到了，多算了一次。' },
      { sub: '先加：8 + 6 = 14；再减：14 − 2 = 12，一共 **12** 厘米。', say: '先加：八加六，等于十四；再减：十四减二，等于十二，一共十二厘米。' },
      { sub: '验一验：露出 6 + 重叠 2 + 露出 4，正好 12 厘米！', say: '验一验：左边露出六，加重叠的二，再加右边露出的四，正好十二厘米！', pause: 1 }
    ],
    els: [
      { t: 'strip', x0: AX, y: AY, w: 8 * C, h: 74, unit: C, fill: PALE_B, at: [1, '八厘米'] },
      lbl(AX + 4 * C, AY - 80, '8 厘米', BLUE, [1, '八厘米'], { font: 'kl', size: 44 }),
      { t: 'strip', x0: bx0, y: BYY, w: 6 * C, h: 74, unit: C, fill: PALE_R, at: [1, '六厘米'], move: [[1, '粘在一起'], 300, 110] },
      lbl(bx0 + 3 * C, BYY + 82, '6 厘米', RED, [1, '六厘米'], { font: 'kl', size: 44, move: [[1, '粘在一起'], 300, 110] }),
      { t: 'zone', x0: bx0 - 6, y: (AY + BYY) / 2, w: 2 * C + 12, h: BYY - AY + 96, at: [1, '重叠了'], glow: [4, '都量到了'] },
      lbl(bx0 + C, AY - 80, '重叠 2', ORANGE, [1, '重叠了', 0.2], { font: 'kl', size: 44 }),
      { t: 'slot', id: 'q6', x: 1720, y: 400, size: 104, at: [2, '多少厘米'] },
      lbl(1720, 500, '厘米', GREY, [2, '多少厘米', 0.2], { font: 'kl', size: 40 }),
      { t: 'think', x: 960, y: 790, at: [3, '想一想', 0.7], from: 5, pulse: 'q6' },
      { t: 'txt', x: 700, y: 640, s: '8 + 6 = 14', size: 60, font: 'num', color: INK, at: [5, '八加六'] },
      { t: 'txt', x: 1180, y: 640, s: '14 − 2 = 12', size: 60, font: 'num', color: RED, at: [5, '十四减二'] },
      fill('q6', [5, '一共十二'], '12'),
      { t: 'badge', x: AX + 3 * C, y: AY - 4, s: '6', color: GREEN, at: [6, '露出六'] },
      { t: 'badge', x: bx0 + C, y: (AY + BYY) / 2, s: '2', color: GREEN, at: [6, '重叠的二'] },
      { t: 'badge', x: bx0 + 4 * C, y: BYY + 4, s: '4', color: GREEN, at: [6, '露出的四'] },
      { t: 'check', x: 1830, y: 400, at: [6, '正好'] },
      { t: 'stamp', x: 1420, y: 790, s: '答：12 厘米', color: RED, size: 48, rot: -6, at: [6, '正好', 1.2] }
    ]
  })

  /* 7 小挑战 2：反求重叠（70px = 1 人）。画画 7 + 唱歌 6 = 13，一共只有 10 → 多 3 */
  var V = 80, PX = 500, PY = 320, QY = 400, TY = 570
  var p1 = PX + 7 * V, q0 = p1 - 3 * V, tot1 = PX + 10 * V
  S.push({
    tag: '小挑战 | 第 2 题',
    beats: [
      { sub: '第二题：画画 7 人，唱歌 6 人，一共只有 10 人。', say: '第二题：画画的有七人，唱歌的有六人，参加活动的一共只有十人。' },
      { sub: '两样都参加的，有几人？', say: '两样都参加的，有几人？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', pause: 5 },
      { sub: '还是先加：7 + 6 = 13。', say: '还是先加：七加六，等于十三。' },
      { sub: '比 10 人多了 3 人——多出来的，就是被数了两次的人！', say: '比十人多了三人，多出来的，就是被数了两次的人！' },
      { sub: '13 − 10 = 3，两样都参加的有 **3** 人。', say: '十三减十，等于三，两样都参加的有三人。' },
      { sub: '验一验：4 + 3 + 3，正好 10 人！', say: '验一验：只画画的四人，加都参加的三人，再加只唱歌的三人，正好十人！', pause: 1 }
    ],
    els: [
      { t: 'strip', x0: PX, y: PY, w: 7 * V, h: 74, unit: V, fill: PALE_B, at: [0, '画画'] },
      lbl(PX - 130, PY, '画画 7 人', BLUE, [0, '画画'], { font: 'kl', size: 40 }),
      { t: 'strip', x0: q0, y: QY, w: 6 * V, h: 74, unit: V, fill: PALE_R, at: [0, '唱歌'], move: [[5, '十三减十'], 3 * V, 0] },
      lbl(q0 + 3 * V, QY + 72, '唱歌 6 人', RED, [0, '唱歌'], { font: 'kl', size: 40, move: [[5, '十三减十'], 3 * V, 0] }),
      { t: 'strip', x0: PX, y: TY, w: 10 * V, h: 74, unit: V, fill: PALE_G, s: '一共 10 人', size: 36, at: [0, '一共只有'] },
      { t: 'slot', id: 'q7', x: 1720, y: 420, size: 104, at: [1, '有几人'] },
      lbl(1720, 520, '人', GREY, [1, '有几人', 0.2], { font: 'kl', size: 40 }),
      { t: 'think', x: 960, y: 790, at: [2, '哪一招', 0.6], from: 5, pulse: 'q7' },
      { t: 'txt', x: 700, y: 700, s: '7 + 6 = 13', size: 60, font: 'num', color: INK, at: [3, '七加六'] },
      { t: 'zone', x0: tot1 - 4, y: QY, w: 3 * V + 8, h: 96, at: [4, '多了三人'], out: [5, '十三减十'] },
      lbl(tot1 + 1.5 * V, QY - 72, '多出 3 人', ORANGE, [4, '多了三人'], { font: 'kl', size: 40, out: [5, '十三减十'] }),
      { t: 'txt', x: 1220, y: 700, s: '13 − 10 = 3', size: 60, font: 'num', color: RED, at: [5, '十三减十'] },
      { t: 'zone', x0: q0 - 6, y: (PY + QY) / 2, w: 3 * V + 12, h: QY - PY + 96, at: [5, '十三减十', 0.8] },
      fill('q7', [5, '都参加的有三'], '3'),
      { t: 'badge', x: (PX + q0) / 2, y: PY, s: '4', color: GREEN, at: [6, '四人'] },
      { t: 'badge', x: (q0 + p1) / 2, y: (PY + QY) / 2, s: '3', color: GREEN, at: [6, '都参加的三人'] },
      { t: 'badge', x: p1 + 1.5 * V, y: QY, s: '3', color: GREEN, at: [6, '唱歌的三人'] },
      { t: 'check', x: 1830, y: 420, at: [6, '正好'] },
      { t: 'stamp', x: 1420, y: 800, s: '答：3 人', color: RED, size: 50, rot: -6, at: [6, '正好', 1.2] }
    ]
  })

  /* 8 结尾 + 下一课预告 */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天，我们学会了两招：', say: '今天，我们学会了两招：' },
      { sub: '分三块数；先加，再减。', say: '分三块数；先加，再减。' },
      { sub: '下一课，我们来认识「枚举法」！', say: '下一课，我们来认识，枚举法！', pitch: '+4Hz' },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: [
      { t: 'card', x: 760, y: 420, title: '第一招', sub: '分三块数', color: BLUE, at: 0, glow: [1, '分三块数'] },
      { t: 'card', x: 1160, y: 420, title: '第二招', sub: '先加再减', color: RED, at: [0, 0.3], glow: [1, '先加'] },
      { t: 'card', x: 960, y: 690, title: '下一课 · 第 12 课', sub: '枚举法初步', color: ORANGE, at: [2, '下一课'], glow: [2, '枚举法'], out: 3 },
      { t: 'tape', x: 960, y: 690, s: '去练习纸上试试吧！', size: 50, at: [3, '练习纸'] }
    ]
  })

  /* 封面 */
  S.cover = {
    tag: null,
    els: [
      { t: 'txt', x: 960, y: 140, s: '奥数 · 第 11 课 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
      { t: 'tape', x: 960, y: 300, s: '重叠问题', size: 160, at: 0 },
      { t: 'txt', x: 960, y: 455, s: '分三块数 · 先加再减', size: 50, color: RED, font: 'kl', at: 0 },
      { t: 'loop', x: 800, y: 760, w: 520, h: 320, color: BLUE, at: 0 },
      { t: 'loop', x: 1120, y: 760, w: 520, h: 320, color: RED, at: 0 },
      kid(0, 640, 760, 140, 0),
      kid(3, 960, 760, 150, 0),
      kid(1, 1280, 760, 140, 0),
      lbl(640, 570, '画画', BLUE, 0, { font: 'kl', size: 44 }),
      lbl(1280, 570, '唱歌', RED, 0, { font: 'kl', size: 44 })
    ]
  }
  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
