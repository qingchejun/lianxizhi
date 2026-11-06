/* 13 分堆与枚举 · 讲解视频分镜 v1（对标 08；关键动作用 [beat, '关键词'] 对齐配音）
 * 两招：第一招「列到一半停」（小堆从 1 起）；第二招「从小到大排」（分三堆）。
 * 例题：7 个苹果分两堆 → 1和6、2和5、3和4 → 3 种；7 个苹果分三堆 → 115、124、133、223 → 4 种。
 * 小挑战：10 颗糖分两堆且不一样多 → 4 种（5和5 划掉）；6 个西瓜分三堆 → 114、123、222 → 3 种。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420'

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
  function item(k, x, y, size, at, o) {
    o = o || {}
    return { t: 'item', k: k, x: x, y: y, size: size, at: at, out: o.out, glow: o.glow, move: o.move, overlapOk: o.overlapOk }
  }
  function loop(x, y, w, h, color, at, o) {
    o = o || {}
    return { t: 'loop', x: x, y: y, w: w, h: h, color: color, at: at, out: o.out, overlapOk: true }
  }
  /* 一堆苹果：从 x0 起 n 个，间距 dx；可选加圈 */
  function pile(arr, k, n, x0, y, size, dx, at, o) {
    o = o || {}
    for (var j = 0; j < n; j++) arr.push(item(k, x0 + j * dx, y, size, stagger(at, j * (o.st || 0.08)), { out: o.out, glow: o.glow, overlapOk: true }))
    if (o.ring) arr.push(loop(x0 + (n - 1) * dx / 2, y, (n - 1) * dx + size * 1.5 + 10, size + 30, o.ring, o.ringAt || at, { out: o.out }))
  }
  function strike(x, y, w, at, o) {
    o = o || {}
    return { t: 'seg', x1: x - w / 2, y1: y + 14, x2: x + w / 2, y2: y - 14, color: RED, sw: 8, at: at, out: o.out }
  }

  var S = []

  /* 0 开场 */
  var e0 = [
    { t: 'txt', x: 960, y: 230, s: '奥数 · 第 13 课', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
    { t: 'tape', x: 960, y: 360, s: '分堆与枚举', size: 130, at: [0, 0.2] },
    lbl(960, 640, '上一课：排好顺序，不重不漏', BLUE, [1, '排好顺序'], { font: 'kl', size: 50, out: [2, 0] })
  ]
  ;[640, 740, 840].forEach(function (x, i) { e0.push(item('apple', x, 640, 84, [2, '一堆东西', i * 0.1])) })
  ;[1000, 1100, 1200, 1300].forEach(function (x, i) { e0.push(item('apple', x, 640, 84, [2, '一堆东西', 0.3 + i * 0.1], { move: [[2, '几堆'], -60, 0] })) })
  e0.push(loop(740, 640, 320, 130, BLUE, [2, '几堆', 0.5]))
  e0.push(loop(1150, 640, 420, 130, RED, [2, '几堆', 0.7]))
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '上一课，我们学了「枚举法」：排好顺序，不重不漏。', say: '上一课，我们学了枚举法：排好顺序，不重不漏。' },
      { sub: '今天学「分堆」：一堆东西分成几堆，有几种分法？', say: '今天，来学分堆：把一堆东西，分成几堆，有几种分法？' }
    ],
    els: e0
  })

  /* 1 引入：小明 1 和 6、小红 6 和 1 → 换个位置，算同一种 */
  var e1 = []
  for (var i1 = 0; i1 < 7; i1++) e1.push(item('apple', 660 + i1 * 100, 280, 84, [0, '七个苹果', i1 * 0.08], { out: [3, '两招'] }))
  e1 = e1.concat([
    item('kid0', 230, 560, 140, [1, '小明'], { out: [3, '两招'] }),
    lbl(230, 680, '小明', BLUE, [1, '小明'], { font: 'kl', size: 40, out: [3, '两招'] }),
    item('kid1', 1050, 560, 140, [1, '小红'], { out: [3, '两招'] }),
    lbl(1050, 680, '小红', RED, [1, '小红'], { font: 'kl', size: 40, out: [3, '两招'] })
  ])
  pile(e1, 'apple', 1, 400, 560, 64, 62, [1, '一个和六个'], { ring: BLUE, out: [3, '两招'] })
  pile(e1, 'apple', 6, 530, 560, 64, 62, [1, '六个'], { ring: RED, out: [3, '两招'] })
  pile(e1, 'apple', 6, 1200, 560, 64, 62, [1, '六个和一个'], { ring: RED, out: [3, '两招'] })
  pile(e1, 'apple', 1, 1640, 560, 64, 62, [1, '一个#2'], { ring: BLUE, out: [3, '两招'] })
  e1 = e1.concat([
    lbl(600, 680, '1 和 6', BLUE, [1, '六个'], { font: 'kl', size: 54, out: [3, '两招'], glow: [2, '换了个位置'] }),
    lbl(1410, 680, '6 和 1', RED, [1, '一个#2'], { font: 'kl', size: 54, out: [3, '两招'], glow: [2, '换了个位置', 0.3] }),
    { t: 'stamp', x: 960, y: 800, s: '算同一种！', color: ORANGE, size: 56, rot: -5, at: [2, '同一种'], out: [3, '两招'] },
    { t: 'card', x: 760, y: 470, title: '第一招', sub: '列到一半停', color: BLUE, at: [3, '两招', 0.3] },
    { t: 'card', x: 1160, y: 470, title: '第二招', sub: '从小到大排', color: RED, at: [3, '两招', 0.6] }
  ])
  S.push({
    tag: '分堆',
    beats: [
      { sub: '7 个苹果，分成两堆，每堆至少 1 个。', say: '七个苹果，分成两堆，每堆至少一个。' },
      { sub: '小明分：1 个和 6 个；小红分：6 个和 1 个。', say: '小明分：一个和六个；小红分：六个和一个。' },
      { sub: '这算两种吗？不算！换个位置，是同一种。', say: '这算两种吗？不算！换了个位置，是同一种。' },
      { sub: '一共有几种分法？今天教你两招。', say: '一共有几种分法？今天，教你两招。' }
    ],
    els: e1
  })

  /* 2 第一招：小堆从 1 起，列到一半停 */
  var RY = [300, 430, 560]
  var ROWS2 = [[1, 6, [1, '大堆就是六'], '一加六'], [2, 5, [2, '二和五'], '二加五'], [3, 4, [2, '三和四'], '三加四']]
  var e2 = [{ t: 'big', x: 960, y: 470, title: '第一招', sub: '列到一半停', color: BLUE, at: 0, out: [1, 0] }]
  ROWS2.forEach(function (r, i) {
    var a = r[0], b = r[1], y = RY[i]
    pile(e2, 'apple', a, 340, y, 56, 60, r[2], { ring: BLUE, st: 0.06 })
    pile(e2, 'apple', b, 340 + a * 60 + 74, y, 56, 60, stagger(r[2], 0.25), { ring: RED, st: 0.06 })
    e2.push(lbl(1090, y, a + ' 和 ' + b, INK, stagger(r[2], 0.2), { font: 'kl', size: 64, glow: [5, r[3]] }))
    e2.push(lbl(1430, y, a + ' + ' + b + ' = 7', GREEN, [5, r[3]], { font: 'num', size: 46 }))
    e2.push({ t: 'badge', x: 215, y: y, s: String(i + 1), color: GREEN, at: [4, '三行', i * 0.25] })
  })
  e2 = e2.concat([
    lbl(1090, 690, '4 和 3', GREY, [3, '四和三'], { font: 'kl', size: 64 }),
    strike(1090, 690, 200, [3, '停']),
    lbl(1380, 690, '= 3 和 4', GREY, [3, '就是三和四'], { font: 'kl', size: 48, glow: [3, '就是三和四', 0.1] }),
    { t: 'stamp', x: 640, y: 690, s: '停！', color: ORANGE, size: 60, rot: -6, at: [3, '停'] },
    { t: 'slot', id: 'q2', x: 1720, y: 560 - 130, size: 104, at: [0, '一半', 0.4] },
    lbl(1720, 530, '种', GREY, [0, '一半', 0.6], { font: 'kl', size: 44 }),
    fill('q2', [4, '三种'], '3'),
    { t: 'check', x: 1830, y: 425, at: [5, '都是七'] },
    { t: 'stamp', x: 1640, y: 810, s: '答：3 种', color: RED, size: 50, rot: -6, at: [5, '都是七', 0.9] }
  ])
  S.push({
    tag: '第一招 | 列到一半停',
    beats: [
      { sub: '第一招：小堆从 1 起，列到一半就停。', say: '第一招：小堆从一起，列到一半，就停。' },
      { sub: '小堆是 1，大堆就是 6：1 和 6。', say: '小堆是一，大堆就是六。' },
      { sub: '小堆是 2：2 和 5；小堆是 3：3 和 4。', say: '小堆是二：二和五；小堆是三：三和四。' },
      { sub: '再往下，4 和 3？就是 3 和 4，停！', say: '再往下，四和三？就是三和四，停！', pitch: '+6Hz' },
      { sub: '一共列了 3 行，就是 **3** 种分法。', say: '一共列了三行，就是三种分法。' },
      { sub: '验一验：1 加 6，2 加 5，3 加 4，都是 7！', say: '验一验：一加六，二加五，三加四，都是七！', pause: 1 }
    ],
    els: e2
  })

  /* 3 冲突：7 个苹果分三堆，还用第一招 → 重复了！ */
  var e3 = []
  pile(e3, 'apple', 2, 640, 250, 64, 70, [0, '七个苹果'], { ring: BLUE, ringAt: [0, '三堆'] })
  pile(e3, 'apple', 2, 880, 250, 64, 70, [0, '七个苹果', 0.2], { ring: RED, ringAt: [0, '三堆', 0.2] })
  pile(e3, 'apple', 3, 1120, 250, 64, 70, [0, '七个苹果', 0.4], { ring: GREEN, ringAt: [0, '三堆', 0.4] })
  var TR3 = [['1、1、5', '一一五'], ['1、5、1', '一五一一'], ['1、2、4', '一二四'], ['1、4、2', '一四二']]
  TR3.forEach(function (r, i) {
    e3.push(lbl(700, 420 + i * 100, r[0], INK, [1, r[1]], { font: 'kl', size: 64, glow: i === 0 ? [2, '一一五'] : i === 1 ? [2, '一五一'] : undefined }))
  })
  e3 = e3.concat([
    { t: 'slot', id: 'q3', x: 1700, y: 250, size: 104, at: [0, '几种'] },
    lbl(1700, 350, '种', GREY, [0, '几种', 0.2], { font: 'kl', size: 40 }),
    strike(700, 520, 230, [2, '重复了']),
    { t: 'harrow', x1: 870, x2: 1060, y: 470, color: ORANGE, at: [2, '不就是'] },
    { t: 'stamp', x: 1330, y: 520, s: '重复了！', color: ORANGE, size: 64, rot: -5, at: [2, '重复了'] }
  ])
  S.push({
    tag: '第一招 | 列到一半停',
    beats: [
      { sub: '再难一点：7 个苹果分成三堆，有几种分法？', say: '再难一点：七个苹果，分成三堆，有几种分法？', rate: '-6%' },
      { sub: '还用第一招？1、1、5；1、5、1；1、2、4；1、4、2……', say: '还用第一招？一，一，五；一，五，一；一，二，四；一，四，二……' },
      { sub: '等等！1、5、1 不就是 1、1、5 吗？重复了！', say: '等等！一五一，不就是一一五吗？重复了！', pitch: '+8Hz' }
    ],
    els: e3
  })

  /* 4 第二招：从小到大排（第一堆 ≤ 第二堆 ≤ 第三堆） */
  var e4 = [
    { t: 'big', x: 960, y: 470, title: '第二招', sub: '从小到大排', color: RED, at: 0, out: [0, '后面的堆'] },
    lbl(960, 210, '第一堆 ≤ 第二堆 ≤ 第三堆', GREY, [0, '后面的堆', 0.2], { font: 'kl', size: 46 }),
    lbl(560, 320, '第一堆是 1', BLUE, [1, '第一堆是一'], { font: 'kl', size: 46 }),
    lbl(1160, 320, '第一堆是 2', RED, [3, '第一堆是二'], { font: 'kl', size: 46 })
  ]
  var L4 = [['1、1、5', 420, '一一五', '一一五'], ['1、2、4', 520, '一二四', '一二四'], ['1、3、3', 620, '一三三', '一三三']]
  L4.forEach(function (r, i) {
    e4.push(lbl(560, r[1], r[0], INK, [1, r[2]], { font: 'kl', size: 64, glow: [5, '每一行', 0.3 + i * 0.3] }))
    e4.push({ t: 'badge', x: 360, y: r[1], s: String(i + 1), color: GREEN, at: [4, '四行', i * 0.25] })
  })
  e4 = e4.concat([
    lbl(560, 720, '1、4、2', GREY, [2, '一四二'], { font: 'kl', size: 64 }),
    strike(560, 720, 230, [2, '停']),
    { t: 'stamp', x: 800, y: 720, s: '停！', color: ORANGE, size: 56, rot: -6, at: [2, '停'] },
    lbl(1160, 420, '2、2、3', INK, [3, '二二三'], { font: 'kl', size: 64, glow: [5, '每一行', 1.2] }),
    { t: 'badge', x: 960, y: 420, s: '4', color: GREEN, at: [4, '四行', 0.75] },
    lbl(1160, 560, '第一堆是 3', GREY, [3, '是三'], { font: 'kl', size: 46 }),
    lbl(1160, 640, '不够分了', GREY, [3, '不够分'], { font: 'kl', size: 40 }),
    { t: 'slot', id: 'q4', x: 1660, y: 470, size: 104, at: [0, '后面的堆', 0.4] },
    lbl(1660, 570, '种', GREY, [0, '后面的堆', 0.6], { font: 'kl', size: 44 }),
    fill('q4', [4, '四种'], '4'),
    { t: 'check', x: 1770, y: 465, at: [5, '都是七'] },
    { t: 'stamp', x: 1600, y: 800, s: '答：4 种', color: RED, size: 50, rot: -6, at: [5, '都是七', 0.9] }
  ])
  S.push({
    tag: '第二招 | 从小到大排',
    beats: [
      { sub: '第二招：从小到大排！后面的堆不能比前面小。', say: '第二招：从小到大排！后面的堆，不能比前面小。' },
      { sub: '第一堆是 1：1、1、5；1、2、4；1、3、3。', say: '第一堆是一：一，一，五；一，二，四；一，三，三。' },
      { sub: '再往下，1、4、2？第三堆比第二堆小了，停！', say: '再往下，一，四，二？第三堆比第二堆小了，停！', pitch: '+6Hz' },
      { sub: '第一堆是 2：2、2、3；是 3 就不够分了。', say: '第一堆是二：二，二，三；是三，就不够分了。' },
      { sub: '一共列了 4 行，就是 **4** 种分法。', say: '一共列了四行，就是四种分法。' },
      { sub: '验一验：每一行三堆加起来，都是 7！', say: '验一验：每一行，三堆加起来，都是七！', pause: 1 }
    ],
    els: e4
  })

  /* 5 口诀（讲解页原文） */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '小堆从一起，列到一半停；', say: '小堆从一起，列到一半停；', rate: '-15%' },
      { sub: '换位一样的，只能算一种。', say: '换位一样的，只能算一种。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 480, w: 1000, h: 400, at: 0 },
      { t: 'chant', x: 960, y: 420, s: '小堆从一起，列到一半停；', color: BLUE, at: 1 },
      { t: 'chant', x: 960, y: 570, s: '换位一样的，只能算一种。', color: RED, at: 2 }
    ]
  })

  /* 6 小挑战 1：10 颗糖分两堆，不能一样多 → 4 种 */
  var e6 = []
  for (var c6 = 0; c6 < 10; c6++) e6.push(item('candy', 1290 + (c6 % 5) * 105, 250 + Math.floor(c6 / 5) * 100, 96, [0, '十颗糖', c6 * 0.06]))
  var R6 = [[1, 9, '一和九', '一和九'], [2, 8, '二和八', '二和八'], [3, 7, '三和七', '三和七'], [4, 6, '四和六', '四和六']]
  R6.forEach(function (r, i) {
    var y = 290 + i * 100
    e6.push(lbl(520, y, r[0] + ' 和 ' + r[1], INK, [3, r[2]], { font: 'kl', size: 64 }))
    e6.push({ t: 'badge', x: 320, y: y, s: String(i + 1), color: GREEN, at: [5, '四行', i * 0.25] })
    e6.push(lbl(850, y, r[0] + ' + ' + r[1] + ' = 10', GREEN, [6, '十颗', 0.2 + i * 0.3], { font: 'num', size: 44 }))
  })
  e6 = e6.concat([
    lbl(520, 690, '5 和 5', GREY, [4, '五和五'], { font: 'kl', size: 64 }),
    strike(520, 690, 210, [4, '划掉']),
    lbl(820, 690, '一样多', ORANGE, [4, '一样多'], { font: 'kl', size: 44 }),
    { t: 'slot', id: 'q6', x: 1500, y: 560, size: 104, at: [1, '几种'] },
    lbl(1600, 560, '种', GREY, [1, '几种', 0.2], { font: 'kl', size: 44 }),
    { t: 'think', x: 960, y: 790, at: [2, '想一想', 0.7], from: 5, pulse: 'q6' },
    fill('q6', [5, '四种'], '4'),
    { t: 'check', x: 1700, y: 555, at: [6, '没有一样多'] },
    { t: 'stamp', x: 1440, y: 790, s: '答：4 种', color: RED, size: 50, rot: -6, at: [6, '没有一样多', 1.0] }
  ])
  S.push({
    tag: '小挑战 | 第 1 题',
    beats: [
      { sub: '小挑战，第一题：10 颗糖分成两堆，', say: '小挑战，第一题：十颗糖分成两堆，' },
      { sub: '两堆不能一样多，有几种分法？', say: '两堆不能一样多，有几种分法？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '小堆从 1 起：1 和 9，2 和 8，3 和 7，4 和 6。', say: '小堆从一起：一和九，二和八，三和七，四和六。' },
      { sub: '5 和 5？一样多，划掉！', say: '五和五？一样多，划掉！', pitch: '+6Hz' },
      { sub: '一共 4 行，就是 **4** 种分法。', say: '一共四行，就是四种分法。' },
      { sub: '验一验：每行都是 10 颗，没有一样多的！', say: '验一验：每行都是十颗，没有一样多的！', pause: 1 }
    ],
    els: e6
  })

  /* 7 小挑战 2：6 个西瓜分三堆 → 114、123、222 → 3 种 */
  var e7 = []
  for (var c7 = 0; c7 < 6; c7++) e7.push(item('melon', 1500 + (c7 % 3) * 130, 270 + Math.floor(c7 / 3) * 110, 110, [0, '六个西瓜', c7 * 0.08]))
  e7 = e7.concat([
    lbl(560, 300, '第一堆是 1', BLUE, [2, '第一堆是一'], { font: 'kl', size: 46 }),
    lbl(560, 400, '1、1、4', INK, [2, '一一四'], { font: 'kl', size: 64, glow: [5, '每行', 0.3] }),
    lbl(560, 500, '1、2、3', INK, [2, '一二三'], { font: 'kl', size: 64, glow: [5, '每行', 0.6] }),
    lbl(1100, 300, '第一堆是 2', RED, [3, '第一堆是二'], { font: 'kl', size: 46 }),
    lbl(1100, 400, '2、2、2', INK, [3, '二二二'], { font: 'kl', size: 64, glow: [5, '每行', 0.9] }),
    lbl(1100, 520, '第一堆是 3', GREY, [3, '是三'], { font: 'kl', size: 46 }),
    lbl(1100, 600, '不够分了', GREY, [3, '不够分'], { font: 'kl', size: 40 }),
    { t: 'badge', x: 360, y: 400, s: '1', color: GREEN, at: [4, '三行'] },
    { t: 'badge', x: 360, y: 500, s: '2', color: GREEN, at: [4, '三行', 0.25] },
    { t: 'badge', x: 900, y: 400, s: '3', color: GREEN, at: [4, '三行', 0.5] },
    { t: 'slot', id: 'q7', x: 1600, y: 600, size: 104, at: [0, '几种'] },
    lbl(1700, 600, '种', GREY, [0, '几种', 0.2], { font: 'kl', size: 44 }),
    { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q7' },
    fill('q7', [4, '三种'], '3'),
    { t: 'check', x: 1800, y: 595, at: [5, '都是六'] },
    { t: 'stamp', x: 1440, y: 790, s: '答：3 种', color: RED, size: 50, rot: -6, at: [5, '都是六', 0.9] }
  ])
  S.push({
    tag: '小挑战 | 第 2 题',
    beats: [
      { sub: '第二题：6 个西瓜分成三堆，有几种分法？', say: '第二题：六个西瓜，分成三堆，有几种分法？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', pause: 5 },
      { sub: '第二招，从小到大排！第一堆是 1：1、1、4；1、2、3。', say: '第二招，从小到大排！第一堆是一：一，一，四；一，二，三。' },
      { sub: '第一堆是 2：2、2、2；是 3 就不够分了。', say: '第一堆是二：二，二，二；是三，就不够分了。' },
      { sub: '一共列了 3 行，就是 **3** 种分法。', say: '一共列了三行，就是三种分法。' },
      { sub: '验一验：每行三堆加起来，都是 6！', say: '验一验：每行三堆加起来，都是六！', pause: 1 }
    ],
    els: e7
  })

  /* 8 结尾 + 下一课预告 */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天，我们学会了两招：', say: '今天，我们学会了两招：' },
      { sub: '分两堆，列到一半停；分三堆，从小到大排。', say: '分两堆，列到一半就停；分三堆，从小到大排。' },
      { sub: '下一课，我们来认识「空瓶换水」！', say: '下一课，我们来认识，空瓶换水！', pitch: '+4Hz' },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: [
      { t: 'card', x: 760, y: 420, title: '第一招', sub: '列到一半停', color: BLUE, at: 0, glow: [1, '列到一半'] },
      { t: 'card', x: 1160, y: 420, title: '第二招', sub: '从小到大排', color: RED, at: [0, 0.3], glow: [1, '从小到大'] },
      { t: 'card', x: 960, y: 690, title: '下一课 · 第 14 课', sub: '空瓶换水', color: ORANGE, at: [2, '下一课'], glow: [2, '空瓶'], out: 3 },
      { t: 'tape', x: 960, y: 690, s: '去练习纸上试试吧！', size: 50, at: [3, '练习纸'] }
    ]
  })

  /* 封面 */
  var cv = [
    { t: 'txt', x: 960, y: 140, s: '奥数 · 第 13 课 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
    { t: 'tape', x: 960, y: 300, s: '分堆与枚举', size: 150, at: 0 },
    { t: 'txt', x: 960, y: 455, s: '列到一半停 · 从小到大排', size: 54, color: RED, font: 'kl', at: 0 }
  ]
  pile(cv, 'apple', 3, 610, 680, 100, 100, 0, { ring: BLUE })
  pile(cv, 'apple', 4, 1010, 680, 100, 100, 0, { ring: RED })
  cv.push({ t: 'txt', x: 960, y: 870, s: '1 和 6 · 2 和 5 · 3 和 4', size: 54, color: BLUE, font: 'kl', at: 0 })
  S.cover = { tag: null, els: cv }
  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
