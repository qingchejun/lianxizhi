/* 12 枚举法初步 · 讲解视频分镜 v1（对标 08；关键动作用 [beat, '关键词'] 对齐配音）
 * 两招：第一招「排好顺序」（一组一组列）；第二招「不回头」（每人只和后面的配）。
 * 例题：1、2、3 摆两位数 → 6 个；4 人握手 → 3+2+1 = 6 次。
 * 小挑战：2 元和 1 元凑 7 元 → 4 种；5 人握手 → 4+3+2+1 = 10 次。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420', PURPLE = '#8a63c9'

  function stagger(at, d) {
    if (!Array.isArray(at)) return [at, d]
    if (typeof at[1] === 'string') return [at[0], at[1], (at[2] || 0) + d]
    return [at[0], (at[1] || 0) + d]
  }
  function lbl(x, y, s, color, at, o) {
    o = o || {}
    return { t: 'txt', id: o.id, x: x, y: y, s: s, size: o.size || 40, font: o.font || 'kai', color: color || GREY, at: at, out: o.out, anim: o.anim, glow: o.glow, glow2: o.glow2, rot: o.rot, move: o.move, overlapOk: o.overlapOk }
  }
  function fill(id, at, val) { return { t: 'fill', id: id, at: at, val: val } }
  function kid(i, x, y, size, at, o) {
    o = o || {}
    return { t: 'item', k: 'kid' + (i % 6), id: o.id, x: x, y: y, size: size, at: at, out: o.out, dim: o.dim, glow: o.glow, glow2: o.glow2, overlapOk: o.overlapOk }
  }
  function card(s, x, y, size, at, o) {
    o = o || {}
    return { t: 'dcard', s: s, x: x, y: y, size: size, at: at, out: o.out, glow: o.glow, rot: o.rot, color: o.color }
  }
  var PCOL = [BLUE, RED, GREEN, ORANGE, PURPLE]
  /* 实心彩色编号（① 用楷体太细） */
  function M(i) { return '<span class="mk" style="background:' + PCOL[i] + '">' + (i + 1) + '</span>' }

  var S = []

  /* 0 开场 */
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '上一课，我们学了「重叠问题」。', say: '上一课，我们学了重叠问题。' },
      { sub: '今天学「枚举法」：把所有情况，一个一个列出来！', say: '今天，来学枚举法：把所有情况，一个一个列出来！' }
    ],
    els: [
      { t: 'txt', x: 960, y: 230, s: '奥数 · 第 12 课', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
      { t: 'tape', x: 960, y: 360, s: '枚举法初步', size: 130, at: [0, 0.2] },
      card('1', 780, 660, 170, [2, '所有情况'], { rot: -4 }),
      card('2', 960, 660, 170, [2, '所有情况', 0.2], { rot: 2 }),
      card('3', 1140, 660, 170, [2, '所有情况', 0.4], { rot: 5 }),
      lbl(960, 820, '一个一个列出来', ORANGE, [2, '一个一个'], { font: 'kl', size: 48 })
    ]
  })

  /* 1 引入：乱摆两位数 → 重复了、还漏了 */
  var MESS = [['12', 520, 560, -7, '十二'], ['31', 820, 650, 5, '三十一'], ['23', 1110, 560, -4, '二十三'], ['12', 1400, 650, 8, '十二#2']]
  var e1 = [
    card('1', 760, 290, 150, [0, '三张卡片'], { rot: -3, out: 4 }),
    card('2', 960, 290, 150, [0, '三张卡片', 0.2], { rot: 2, out: 4 }),
    card('3', 1160, 290, 150, [0, '三张卡片', 0.4], { rot: 4, out: 4 }),
    { t: 'slot', id: 'q1', x: 1700, y: 290, size: 104, at: [1, '几个'], out: 4 },
    lbl(1700, 390, '个', GREY, [1, '几个', 0.2], { font: 'kl', size: 40, out: 4 })
  ]
  MESS.forEach(function (m, i) {
    e1.push({ t: 'txt', x: m[1], y: m[2], s: m[0], size: 104, font: 'num', color: INK, rot: m[3], at: [2, m[4]], out: 4, glow: m[0] === '12' ? [3, '十二'] : undefined })
  })
  e1 = e1.concat([
    { t: 'stamp', x: 1400, y: 800, s: '重复了！', color: ORANGE, size: 52, rot: -5, at: [3, '两次'], out: 4 },
    lbl(760, 800, '还有没摆到的？', GREY, [3, '还有'], { font: 'kl', size: 50, out: 4 }),
    { t: 'card', x: 760, y: 470, title: '第一招', sub: '排好顺序', color: BLUE, at: [4, '两招'] },
    { t: 'card', x: 1160, y: 470, title: '第二招', sub: '不回头', color: RED, at: [4, '两招', 0.3] }
  ])
  S.push({
    tag: '枚举法',
    beats: [
      { sub: '用 1、2、3 三张卡片摆两位数，每张只用一次，', say: '用一、二、三，三张卡片摆两位数，每张只能用一次，' },
      { sub: '能摆出几个？', say: '能摆出几个？', rate: '-6%' },
      { sub: '小明随手摆：12、31、23、12……', say: '小明随手摆：十二，三十一，二十三，十二……' },
      { sub: '咦，12 摆了两次！还有没摆到的吗？', say: '咦，十二摆了两次！还有没摆到的吗？', pitch: '+6Hz' },
      { sub: '想要不重、不漏，今天教你两招。', say: '想要不重、不漏，今天，教你两招。' }
    ],
    els: e1
  })

  /* 2 第一招：排好顺序（按十位从小到大，一组一组列） */
  var RY = [330, 480, 630]
  var ROWS = [
    ['1', [1, '十位是一'], [['12', [1, '十二']], ['13', [1, '十三']]]],
    ['2', [2, '十位是二'], [['21', [2, '二十一']], ['23', [2, '二十三']]]],
    ['3', [2, '十位是三'], [['31', [2, '三十一']], ['32', [2, '三十二']]]]
  ]
  var MISSED = { '13': '十三', '21': '二十一', '32': '三十二' }
  var e2 = [{ t: 'big', x: 960, y: 470, title: '第一招', sub: '排好顺序', color: BLUE, at: 0, out: 1 }]
  ROWS.forEach(function (r, i) {
    e2.push(lbl(620, RY[i], '十位是 ' + r[0], BLUE, r[1], { font: 'kl', size: 48 }))
    r[2].forEach(function (nn, j) {
      e2.push({ t: 'txt', x: 970 + j * 220, y: RY[i], s: nn[0], size: 90, font: 'num', color: INK, at: nn[1], glow: MISSED[nn[0]] ? [4, MISSED[nn[0]]] : undefined })
    })
    e2.push({ t: 'badge', x: 1440, y: RY[i], s: '2', color: GREEN, at: [3, '每组两个', i * 0.25] })
  })
  e2 = e2.concat([
    { t: 'txt', x: 890, y: 800, s: '2 + 2 + 2 =', size: 64, font: 'num', color: INK, at: [3, '二加二'] },
    { t: 'slot', id: 'q2', x: 1160, y: 800, size: 104, at: [1, 0.2] },
    lbl(1260, 800, '个', GREY, [1, 0.4], { font: 'kl', size: 48 }),
    fill('q2', [3, '一共六'], '6'),
    { t: 'check', x: 1360, y: 795, at: [4, '全找回来'] },
    { t: 'stamp', x: 1640, y: 800, s: '答：6 个', color: RED, size: 50, rot: -6, at: [4, '全找回来', 0.9] }
  ])
  S.push({
    tag: '第一招 | 排好顺序',
    beats: [
      { sub: '第一招：排好顺序，一组一组列。', say: '第一招：排好顺序，一组一组列。' },
      { sub: '先让十位是 1：个位放 2 或 3，12、13。', say: '先让十位是一：个位放二或三，十二，十三。' },
      { sub: '十位是 2：21、23；十位是 3：31、32。', say: '十位是二：二十一，二十三；十位是三：三十一，三十二。' },
      { sub: '每组 2 个，2 + 2 + 2 = 6，一共 **6** 个。', say: '每组两个，二加二加二，等于六，一共六个。' },
      { sub: '验一验：小明漏掉的 13、21、32，全找回来了！', say: '验一验：小明漏掉的十三，二十一，三十二，全找回来了！', pause: 1 }
    ],
    els: e2
  })

  /* 3 冲突：握手还用第一招 → 重复了！ 四个小朋友摆成方形 */
  var SQ = [[470, 320], [790, 320], [790, 630], [470, 630]]
  function square(at, o) {
    o = o || {}
    var a = []
    SQ.forEach(function (p, i) {
      a.push(kid(i, p[0], p[1], 130, stagger(at, i * 0.15), { glow: o.glow && o.glow[i] }))
      a.push(lbl(p[0] + (i === 0 || i === 3 ? -100 : 100), p[1], M(i), PCOL[i], stagger(at, i * 0.15), { size: 56 }))
    })
    return a
  }
  var PX = [1150, 1350, 1550]
  var e3 = square([0, '四个小朋友'])
  e3 = e3.concat([
    { t: 'slot', id: 'q3', x: 1760, y: 640, size: 104, at: [0, '几次'] },
    lbl(1760, 740, '次', GREY, [0, '几次', 0.2], { font: 'kl', size: 40 }),
    lbl(PX[0], 320, M(0) + M(1), BLUE, [1, '一二'], { size: 64, glow: [3, '就是一二'] }),
    lbl(PX[1], 320, M(0) + M(2), BLUE, [1, '一三'], { size: 64 }),
    lbl(PX[2], 320, M(0) + M(3), BLUE, [1, '一四'], { size: 64 }),
    lbl(PX[0], 470, M(1) + M(0), RED, [2, '二一'], { size: 64, glow: [3, '二一'] }),
    lbl(PX[1], 470, M(1) + M(2), RED, [2, '二三'], { size: 64 }),
    lbl(PX[2], 470, M(1) + M(3), RED, [2, '二四'], { size: 64 }),
    { t: 'seg', x1: PX[0] - 70, y1: 490, x2: PX[0] + 70, y2: 450, color: RED, sw: 8, at: [3, '重复了'] },
    { t: 'stamp', x: 1350, y: 640, s: '重复了！', color: ORANGE, size: 60, rot: -5, at: [3, '重复了'] }
  ])
  S.push({
    tag: '第一招 | 排好顺序',
    beats: [
      { sub: '再看：4 个小朋友，每两人握一次手，一共几次？', say: '再看这道：四个小朋友，每两人握一次手，一共握几次？', rate: '-6%' },
      { sub: '还用第一招？① 和别人握：①②、①③、①④。', say: '还用第一招？一号和别人握：一二，一三，一四。' },
      { sub: '② 和别人握：②①、②③、②④……', say: '二号和别人握：二一，二三，二四……' },
      { sub: '等等！②① 就是 ①②——重复了！', say: '等等！二一，就是一二，重复了！', pitch: '+8Hz' }
    ],
    els: e3
  })

  /* 4 第二招：不回头（每人只和后面的人握），连线 + 阶梯 3、2、1 */
  var PAIRS = [[0, 1, [1, '一二']], [0, 2, [1, '一三']], [0, 3, [1, '一四']], [1, 2, [2, '二三']], [1, 3, [2, '二四']], [2, 3, [3, '三四']]]
  var RY4 = [300, 430, 560]
  var e4 = [{ t: 'big', x: 960, y: 470, title: '第二招', sub: '不回头', color: RED, at: 0, out: [0, '每个人'] }]
  PAIRS.forEach(function (pr, k) {
    var a = SQ[pr[0]], b = SQ[pr[1]]
    e4.push({ t: 'seg', x1: a[0], y1: a[1], x2: b[0], y2: b[1], color: PCOL[pr[0]], at: pr[2], glow: [5, '连线', 0.6 + k * 0.18] })
  })
  e4 = e4.concat(square([0, '每个人']))
  PAIRS.forEach(function (pr) {
    e4.push(lbl(PX[pr[1] - 1], RY4[pr[0]], M(pr[0]) + M(pr[1]), PCOL[pr[0]], pr[2], { size: 64 }))
  })
  e4 = e4.concat([
    { t: 'badge', x: 1700, y: RY4[0], s: '3', color: GREEN, at: [1, '三次'] },
    { t: 'badge', x: 1700, y: RY4[1], s: '2', color: GREEN, at: [2, '两次'] },
    { t: 'badge', x: 1700, y: RY4[2], s: '1', color: GREEN, at: [3, '一次'] },
    lbl(PX[2], 680, M(3) + ' 后面没人了', GREY, [3, '没人了'], { font: 'kl', size: 40 }),
    { t: 'txt', x: 1130, y: 790, s: '3 + 2 + 1 =', size: 64, font: 'num', color: INK, at: [4, '三加二'] },
    { t: 'slot', id: 'q4', x: 1400, y: 790, size: 104, at: [0, '后面的人握'] },
    lbl(1495, 790, '次', GREY, [0, '后面的人握', 0.2], { font: 'kl', size: 48 }),
    fill('q4', [4, '握六次'], '6'),
    { t: 'check', x: 1590, y: 785, at: [5, '正好'] },
    { t: 'stamp', x: 1780, y: 790, s: '答：6 次', color: RED, size: 46, rot: -6, at: [5, '正好', 0.9] }
  ])
  S.push({
    tag: '第二招 | 不回头',
    beats: [
      { sub: '第二招：不回头——每人只和后面的人握。', say: '别急，用第二招：不回头！每个人，只和后面的人握。' },
      { sub: '① 和后面的人握：①②、①③、①④，3 次。', say: '一号和后面的人握：一二，一三，一四，三次。' },
      { sub: '② 不回头，只握 ②③、②④，2 次。', say: '二号不回头，只握二三，二四，两次。' },
      { sub: '③ 只握 ③④，1 次；④ 后面没人了。', say: '三号只握三四，一次；四号后面，没人了。' },
      { sub: '3 + 2 + 1 = 6，一共要握 **6** 次。', say: '三加二加一，等于六，一共要握六次。' },
      { sub: '验一验：数一数连线，正好 6 条！', say: '验一验：数一数连线，正好六条！', pause: 1 }
    ],
    els: e4
  })

  /* 5 口诀（讲解页原文） */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '定好顺序列一列，', say: '定好顺序，列一列，', rate: '-15%' },
      { sub: '不重不漏数一数。', say: '不重不漏，数一数。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 480, w: 900, h: 400, at: 0 },
      { t: 'chant', x: 960, y: 420, s: '定好顺序列一列，', color: BLUE, at: 1 },
      { t: 'chant', x: 960, y: 570, s: '不重不漏数一数。', color: RED, at: 2 }
    ]
  })

  /* 6 小挑战 1：2 元和 1 元凑 7 元 → 按 2 元个数 3、2、1、0 列 → 4 种 */
  var CY = [290, 400, 510, 620]
  var CROWS = [
    [3, 1, [3, '三个二元'], [3, '一个一元'], '6 + 1 = 7'],
    [2, 3, [4, '两个二元'], [4, '配三个'], '4 + 3 = 7'],
    [1, 5, [4, '一个二元'], [4, '配五个'], '2 + 5 = 7'],
    [0, 7, [4, '零个'], [4, '七个一元'], '0 + 7 = 7']
  ]
  var e6 = []
  CROWS.forEach(function (r, i) {
    var y = CY[i]
    for (var a = 0; a < r[0]; a++) e6.push({ t: 'coin', v: 2, x: 370 + a * 102, y: y, size: 94, at: stagger(r[2], a * 0.12) })
    if (!r[0]) e6.push(lbl(470, y, '没有 2 元', GREY, r[2], { font: 'kl', size: 38 }))
    e6.push({ t: 'txt', x: 690, y: y, s: '+', size: 56, font: 'num', color: GREY, at: r[2] })
    for (var b = 0; b < r[1]; b++) e6.push({ t: 'coin', v: 1, x: 780 + b * 80, y: y, size: 72, at: stagger(r[3], b * 0.08) })
    e6.push({ t: 'badge', x: 245, y: y, s: String(i + 1), color: GREEN, at: [5, '列了', 0.3 + i * 0.3] })
    e6.push(lbl(1450, y, r[4], GREEN, [6, '每一行', 0.3 + i * 0.3], { font: 'num', size: 46 }))
  })
  e6 = e6.concat([
    { t: 'slot', id: 'q6', x: 1720, y: 420, size: 104, at: [1, '凑法'] },
    lbl(1720, 520, '种', GREY, [1, '凑法', 0.2], { font: 'kl', size: 40 }),
    { t: 'think', x: 960, y: 790, at: [2, '想一想', 0.7], from: 5, pulse: 'q6' },
    fill('q6', [5, '四种'], '4'),
    { t: 'check', x: 1830, y: 420, at: [6, '正好'] },
    { t: 'stamp', x: 1420, y: 790, s: '答：4 种', color: RED, size: 50, rot: -6, at: [6, '正好', 1.3] }
  ])
  S.push({
    tag: '小挑战 | 第 1 题',
    beats: [
      { sub: '小挑战，第一题：用 2 元和 1 元硬币凑出 7 元，', say: '小挑战，第一题：用二元和一元的硬币，凑出七元，' },
      { sub: '有几种不同的凑法？', say: '有几种不同的凑法？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '按 2 元从多到少列：3 个 2 元，配 1 个 1 元；', say: '按二元从多到少列：三个二元，配一个一元；' },
      { sub: '2 个 2 元配 3 个，1 个配 5 个，0 个配 7 个。', say: '两个二元配三个，一个二元配五个，零个二元，就要七个一元。' },
      { sub: '一共列了 4 行，就是 **4** 种凑法。', say: '数一数，一共列了四行，就是四种凑法。' },
      { sub: '验一验：每一行，都正好 7 元！', say: '验一验：每一行，都正好七元！', pause: 1 }
    ],
    els: e6
  })

  /* 7 小挑战 2：5 人握手 → 不回头：4+3+2+1 = 10 */
  var PC = [580, 460], PR = 220
  var PENT = []
  for (var i = 0; i < 5; i++) {
    var ang = -Math.PI / 2 + i * 2 * Math.PI / 5
    PENT.push([PC[0] + PR * Math.cos(ang), PC[1] + PR * Math.sin(ang), ang])
  }
  var WHO = [[2, '一号握四次'], [2, '二号握三次'], [3, '三号握两次'], [3, '四号握一次']]
  var e7 = [], kk = 0
  for (var a7 = 0; a7 < 4; a7++) {
    for (var b7 = a7 + 1; b7 < 5; b7++) {
      e7.push({ t: 'seg', x1: PENT[a7][0], y1: PENT[a7][1], x2: PENT[b7][0], y2: PENT[b7][1], color: PCOL[a7], sw: 6, at: stagger(WHO[a7], (b7 - a7 - 1) * 0.18), glow: [5, '连线', 0.5 + kk * 0.13] })
      kk++
    }
  }
  PENT.forEach(function (p, i) {
    e7.push(kid(i, p[0], p[1], 110, [0, '五个小朋友', i * 0.15]))
    e7.push(lbl(PC[0] + (PR + 88) * Math.cos(p[2]), PC[1] + (PR + 88) * Math.sin(p[2]), M(i), PCOL[i], [0, '五个小朋友', i * 0.15], { size: 54 }))
  })
  var CNT = [M(0) + ' 握 4 次', M(1) + ' 握 3 次', M(2) + ' 握 2 次', M(3) + ' 握 1 次']
  CNT.forEach(function (s, i) { e7.push(lbl(1260, 250 + i * 95, s, PCOL[i], WHO[i], { font: 'kl', size: 46 })) })
  e7 = e7.concat([
    lbl(1260, 630, M(4) + ' 后面没人了', GREY, [3, '没人了'], { font: 'kl', size: 40 }),
    { t: 'slot', id: 'q7', x: 1640, y: 760, size: 104, at: [0, '几次'] },
    lbl(1740, 760, '次', GREY, [0, '几次', 0.2], { font: 'kl', size: 48 }),
    { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q7' },
    { t: 'txt', x: 1350, y: 760, s: '4 + 3 + 2 + 1 =', size: 60, font: 'num', color: INK, at: [4, '四加三'] },
    fill('q7', [4, '握十次'], '10'),
    { t: 'check', x: 1840, y: 755, at: [5, '正好'] },
    { t: 'stamp', x: 1660, y: 600, s: '答：10 次', color: RED, size: 48, rot: -6, at: [5, '正好', 1.1] }
  ])
  S.push({
    tag: '小挑战 | 第 2 题',
    beats: [
      { sub: '第二题：5 个小朋友，每两人握一次手，一共几次？', say: '第二题：五个小朋友，每两人握一次手，一共握几次？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', pause: 5 },
      { sub: '第二招，不回头！① 握 4 次，② 握 3 次，', say: '第二招，不回头！一号握四次，二号握三次，' },
      { sub: '③ 握 2 次，④ 握 1 次，⑤ 后面没人了。', say: '三号握两次，四号握一次，五号后面，没人了。' },
      { sub: '4 + 3 + 2 + 1 = 10，一共要握 **10** 次。', say: '四加三加二加一，等于十，一共要握十次。' },
      { sub: '验一验：数一数连线，正好 10 条！', say: '验一验：数一数连线，正好十条！', pause: 1 }
    ],
    els: e7
  })

  /* 8 结尾 + 下一课预告 */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天，我们学会了两招：', say: '今天，我们学会了两招：' },
      { sub: '排好顺序，一组一组列；不回头，只和后面配。', say: '排好顺序，一组一组列；不回头，只和后面的配。' },
      { sub: '下一课，我们来认识「分堆与枚举」！', say: '下一课，我们来认识，分堆与枚举！', pitch: '+4Hz' },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: [
      { t: 'card', x: 760, y: 420, title: '第一招', sub: '排好顺序', color: BLUE, at: 0, glow: [1, '排好顺序'] },
      { t: 'card', x: 1160, y: 420, title: '第二招', sub: '不回头', color: RED, at: [0, 0.3], glow: [1, '不回头'] },
      { t: 'card', x: 960, y: 690, title: '下一课 · 第 13 课', sub: '分堆与枚举', color: ORANGE, at: [2, '下一课'], glow: [2, '分堆'], out: 3 },
      { t: 'tape', x: 960, y: 690, s: '去练习纸上试试吧！', size: 50, at: [3, '练习纸'] }
    ]
  })

  /* 封面 */
  S.cover = {
    tag: null,
    els: [
      { t: 'txt', x: 960, y: 140, s: '奥数 · 第 12 课 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
      { t: 'tape', x: 960, y: 300, s: '枚举法初步', size: 150, at: 0 },
      { t: 'txt', x: 960, y: 455, s: '排好顺序 · 不回头', size: 54, color: RED, font: 'kl', at: 0 },
      card('1', 560, 720, 220, 0, { rot: -6 }),
      card('2', 760, 720, 220, 0, { rot: 3 }),
      card('3', 960, 720, 220, 0, { rot: -2 }),
      { t: 'coin', v: 2, x: 1240, y: 690, size: 140, at: 0 },
      { t: 'coin', v: 1, x: 1390, y: 760, size: 112, at: 0 },
      { t: 'txt', x: 960, y: 930, s: '12 · 13 · 21 · 23 · 31 · 32', size: 54, color: BLUE, font: 'num', at: 0 }
    ]
  }
  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
