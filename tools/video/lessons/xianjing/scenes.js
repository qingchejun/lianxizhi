/* 18 趣味陷阱题 · 讲解视频分镜 v1（对标 08；关键动作用 [beat, '关键词'] 对齐配音）
 * 第一招「找出捣乱的」：题目读两遍，哪个数是来捣乱的？（年龄差不变）
 * 第二招「问啥就答啥」：题目问的到底是什么？（蜡烛陷阱）
 * 引入：小明 7 岁、哥哥 10 岁，5 年以后哥哥大几岁？急着算 10 + 5 = 15 —— 上当了。
 * 第一招例题：5 年以后是捣乱的，每年都差 3 → 10 − 7 = 3；验：15 − 12 = 3。
 * 冲突：8 支蜡烛吹灭 3 支，早上剩几支？8 和 3 都有用，找不出捣乱的了！
 * 第二招：问的是早上 → 点着的 5 支烧光，吹灭的 3 支留下 → 3 支。
 * 小挑战：小红和爸爸、妈妈分 12 个橘子 → 3 个人（别忘了自己），每人 4 个；
 *         姐姐 12 岁、小华 8 岁，20 年以后 → 还是大 4 岁。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420'
  var BAND_B = 'rgba(63,127,196,0.16)', BAND_R = 'rgba(217,68,58,0.16)'

  function lbl(x, y, s, color, at, o) {
    o = o || {}
    return { t: 'txt', id: o.id, x: x, y: y, s: s, size: o.size || 40, font: o.font || 'kai', color: color || GREY, at: at, out: o.out, anim: o.anim, glow: o.glow, glow2: o.glow2, overlapOk: o.overlapOk }
  }
  function fill(id, at, val) { return { t: 'fill', id: id, at: at, val: val } }
  function item(k, x, y, size, at, o) {
    o = o || {}
    return { t: 'item', k: k, x: x, y: y, size: size, at: at, out: o.out, glow: o.glow, glow2: o.glow2, anim: o.anim, overlapOk: true }
  }

  var S = []

  /* 0 开场 */
  var e0 = [
    { t: 'txt', x: 960, y: 230, s: '奥数 · 第 18 课', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
    { t: 'tape', x: 960, y: 360, s: '趣味陷阱题', size: 130, at: [0, 0.2] },
    lbl(960, 560, '上一课：自己别忘算', BLUE, [1, '上一课'], { font: 'kl', size: 50, out: [2, 0] }),
    item('candle', 860, 650, 130, [2, '陷阱']),
    item('candleOut', 1060, 650, 130, [2, '陷阱', 0.2])
  ]
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '上一课，我们学了排队问题：自己别忘算。', say: '上一课，我们学了排队问题：自己别忘算。' },
      { sub: '今天，我们来做趣味陷阱题！', say: '今天，我们来做趣味陷阱题！' }
    ],
    els: e0
  })

  /* 1 引入：年龄题，急着算 10 + 5 —— 上当了 */
  var OUT1 = [4, '两招']
  var e1 = [
    lbl(960, 190, '今年小明 7 岁，哥哥 10 岁。', INK, [0, 0.2], { font: 'kl', size: 48, out: OUT1 }),
    lbl(960, 270, '5 年以后，哥哥比小明大几岁？', INK, [1, 0], { font: 'kl', size: 48, out: OUT1 }),
    item('kid0', 760, 470, 140, [0, '小明'], { out: OUT1 }),
    lbl(760, 590, '小明 7 岁', BLUE, [0, '七岁'], { font: 'kl', size: 40, out: OUT1 }),
    item('kid4', 1160, 470, 140, [0, '哥哥'], { out: OUT1 }),
    lbl(1160, 590, '哥哥 10 岁', RED, [0, '十岁'], { font: 'kl', size: 40, out: OUT1 }),
    lbl(760, 730, '10 + 5 = 15 ？', GREY, [2, '十加五'], { font: 'num', size: 58, out: OUT1 }),
    { t: 'stamp', x: 1260, y: 730, s: '上当了！', color: ORANGE, size: 64, rot: -5, at: [3, '上当'], out: OUT1 },
    { t: 'card', x: 760, y: 470, title: '第一招', sub: '找捣乱的', color: BLUE, at: [4, '两招', 0.3] },
    { t: 'card', x: 1160, y: 470, title: '第二招', sub: '问啥答啥', color: RED, at: [4, '两招', 0.6] }
  ]
  S.push({
    tag: '趣味陷阱题',
    beats: [
      { sub: '先来一道题：今年小明 7 岁，哥哥 10 岁。', say: '先来一道题：今年小明七岁，哥哥十岁。' },
      { sub: '5 年以后，哥哥比小明大几岁？', say: '五年以后，哥哥比小明大几岁？', rate: '-6%' },
      { sub: '小明一看有个 5，赶紧算：10 加 5，15！', say: '小明一看有个五，赶紧算：十加五，十五！' },
      { sub: '哎呀，上当了！题目里藏着陷阱！', say: '哎呀，上当了！题目里，藏着陷阱！', pitch: '+8Hz' },
      { sub: '怎么不掉进陷阱？今天教你两招。', say: '怎么不掉进陷阱？今天，教你两招。' }
    ],
    els: e1
  })

  /* 2 第一招：找出捣乱的（年龄差不变） */
  var AX = function (i) { return 600 + i * 175 }
  var e2 = [
    { t: 'big', x: 960, y: 470, title: '第一招', sub: '题目读两遍，找出捣乱的', color: BLUE, at: 0, out: [1, 0] },
    { t: 'note', x: 1540, y: 165, s: '5 年以后：捣乱的！', color: RED, at: [1, '捣乱'] },
    item('kid4', 300, 380, 100, [2, '哥哥']),
    lbl(410, 380, '哥哥', RED, [2, '哥哥'], { font: 'kl', size: 36 }),
    item('kid0', 300, 590, 100, [2, '小明']),
    lbl(410, 590, '小明', BLUE, [2, '小明'], { font: 'kl', size: 36 }),
    { t: 'slot', id: 'q2', x: 1760, y: 485, size: 104, at: [3, 0] },
    lbl(1760, 585, '岁', GREY, [3, 0.2], { font: 'kl', size: 44 })
  ]
  var HEAD = ['今年', '1 年后', '2 年后', '3 年后', '4 年后', '5 年后']
  for (var i2 = 0; i2 < 6; i2++) {
    var at2 = [2, '每过一年', i2 * 0.35]
    e2.push(lbl(AX(i2), 270, HEAD[i2], GREY, at2, { font: 'kl', size: 32 }))
    e2.push(lbl(AX(i2), 380, (10 + i2) + ' 岁', RED, at2, { font: 'kl', size: 44, glow: i2 === 5 ? [5, '十五'] : undefined }))
    e2.push(lbl(AX(i2), 590, (7 + i2) + ' 岁', BLUE, at2, { font: 'kl', size: 44, glow: i2 === 5 ? [5, '十二'] : undefined }))
    e2.push(lbl(AX(i2), 485, '差 3', ORANGE, [3, '每一年', i2 * 0.25], { font: 'kl', size: 36 }))
  }
  e2 = e2.concat([
    lbl(760, 730, '10 − 7 = 3', GREEN, [4, '十减七'], { font: 'num', size: 58 }),
    fill('q2', [4, '三岁'], '3'),
    lbl(1200, 730, '15 − 12 = 3', GREEN, [5, '十五减十二'], { font: 'num', size: 50 }),
    { t: 'check', x: 1870, y: 480, at: [5, '还是', 0.2] },
    { t: 'stamp', x: 1580, y: 830, s: '答：还是大 3 岁', color: RED, size: 46, rot: -6, at: [5, '还是三', 0.6] }
  ])
  S.push({
    tag: '第一招 | 找捣乱的',
    beats: [
      { sub: '第一招：题目读两遍，找出捣乱的。', say: '第一招：题目读两遍，找出捣乱的。' },
      { sub: '「5 年以后」，就是来捣乱的！', say: '五年以后，就是来捣乱的！', pitch: '+5Hz' },
      { sub: '哥哥和小明一起长大，每过一年，都各长 1 岁。', say: '哥哥和小明一起长大，每过一年，都各长一岁。' },
      { sub: '所以每一年，哥哥都比小明大 3 岁！', say: '所以每一年，哥哥都比小明大三岁！' },
      { sub: '10 减 7，还是大 **3** 岁。', say: '十减七，还是大三岁。' },
      { sub: '验一验：5 年后，15 减 12，还是 3！', say: '验一验：五年后，十五减十二，还是三！', pause: 1 }
    ],
    els: e2
  })

  /* 3 冲突：蜡烛题，找不出捣乱的 */
  var CX = function (i) { return 520 + i * 125 }
  var e3 = [
    lbl(1640, 330, '呼——', GREY, [1, '一阵风'], { font: 'kl', size: 54 }),
    { t: 'stamp', x: 960, y: 720, s: '找不出来了！', color: ORANGE, size: 64, rot: -5, at: [3, '找不出'] }
  ]
  for (var i3 = 0; i3 < 8; i3++) {
    var out3 = i3 >= 5
    e3.push(item('candle', CX(i3), 450, 170, [0, '蜡烛', i3 * 0.1], { out: out3 ? [1, '吹灭', (i3 - 5) * 0.2] : undefined, glow: [2, '八和三', i3 * 0.05] }))
    if (out3) e3.push(item('candleOut', CX(i3), 450, 170, [1, '吹灭', (i3 - 5) * 0.2], { anim: 'none', glow: [2, '八和三', 0.6] }))
  }
  S.push({
    tag: '第一招 | 找捣乱的',
    beats: [
      { sub: '再来一题：桌上点着 8 支蜡烛，', say: '再来一题：桌上点着八支蜡烛，' },
      { sub: '一阵风吹灭了 3 支。第二天早上，还剩几支？', say: '一阵风，吹灭了三支。第二天早上，还剩几支？', rate: '-6%' },
      { sub: '找捣乱的？8 和 3，好像都有用……', say: '找捣乱的？八和三，好像都有用……' },
      { sub: '这下，找不出捣乱的了！', say: '这下，找不出捣乱的了！', pitch: '+8Hz' }
    ],
    els: e3
  })

  /* 4 第二招：问啥就答啥 → 早上剩 3 支 */
  var e4 = [
    { t: 'big', x: 960, y: 470, title: '第二招', sub: '问啥就答啥', color: RED, at: 0, out: [1, 0] },
    { t: 'note', x: 1540, y: 165, s: '问：早上还剩几支？', color: RED, at: [1, '早上'] },
    { t: 'band', x: (CX(0) + CX(4)) / 2, y: 450, w: CX(4) - CX(0) + 140, h: 220, color: BAND_B, at: [2, '夜里'] },
    lbl((CX(0) + CX(4)) / 2, 610, '亮着的 5 支', BLUE, [2, '夜里'], { font: 'kl', size: 38, out: [3, '就没了'] }),
    lbl((CX(0) + CX(4)) / 2, 610, '烧光了', GREY, [3, '就没了'], { font: 'kl', size: 38 }),
    { t: 'band', x: (CX(5) + CX(7)) / 2, y: 450, w: CX(7) - CX(5) + 140, h: 220, color: BAND_R, at: [4, '吹灭'] },
    lbl((CX(5) + CX(7)) / 2, 610, '吹灭的 3 支', RED, [4, '吹灭'], { font: 'kl', size: 38 }),
    lbl(760, 740, '8 − 3 = 5：夜里亮着的', GREY, [2, '八减三'], { font: 'kl', size: 44, out: [5, 0] }),
    { t: 'slot', id: 'q4', x: 1760, y: 450, size: 104, at: [1, 0.3] },
    lbl(1760, 550, '支', GREY, [1, 0.5], { font: 'kl', size: 44 }),
    fill('q4', [5, '三支'], '3'),
    { t: 'check', x: 1870, y: 445, at: [5, '三支', 0.3] },
    { t: 'stamp', x: 1580, y: 810, s: '答：还剩 3 支', color: RED, size: 50, rot: -6, at: [5, '三支', 0.8] }
  ]
  for (var i4 = 0; i4 < 8; i4++) {
    if (i4 < 5) {
      e4.push(item('candle', CX(i4), 450, 170, [1, 0, i4 * 0.06], { out: [3, '烧到早上', i4 * 0.15], glow: [3, '一直烧', i4 * 0.1] }))
      e4.push(item('candleGone', CX(i4), 450, 170, [3, '烧到早上', i4 * 0.15], { anim: 'fade' }))
    } else {
      e4.push(item('candleOut', CX(i4), 450, 170, [1, 0, i4 * 0.06], { glow: [4, '留了下来', (i4 - 5) * 0.2], glow2: [5, '三支', (i4 - 5) * 0.15] }))
    }
  }
  S.push({
    tag: '第二招 | 问啥答啥',
    beats: [
      { sub: '第二招：问啥就答啥。', say: '第二招：问啥就答啥。' },
      { sub: '题目问的是：第二天早上，还剩几支？', say: '题目问的是：第二天早上，还剩几支？' },
      { sub: '8 减 3 等于 5，那是夜里还亮着的。', say: '八减三等于五，那是夜里还亮着的。' },
      { sub: '点着的 5 支，一直烧，烧到早上就没了。', say: '点着的五支，一直烧，烧到早上就没了。' },
      { sub: '吹灭的 3 支不烧了，反而留了下来。', say: '吹灭的三支不烧了，反而留了下来。' },
      { sub: '所以早上，还剩 **3** 支！', say: '所以早上，还剩三支！', pitch: '+5Hz', pause: 1 }
    ],
    els: e4
  })

  /* 5 口诀（讲解页原文） */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '题目读两遍，找出捣乱的；', say: '题目读两遍，找出捣乱的；', rate: '-15%' },
      { sub: '问啥就答啥，不掉陷阱里。', say: '问啥就答啥，不掉陷阱里。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 480, w: 1360, h: 400, at: 0 },
      { t: 'chant', x: 960, y: 420, s: '题目读两遍，找出捣乱的；', color: RED, at: 1 },
      { t: 'chant', x: 960, y: 570, s: '问啥就答啥，不掉陷阱里。', color: BLUE, at: 2 }
    ]
  })

  /* 6 小挑战 1：小红和爸爸、妈妈分 12 个橘子 → 3 个人，每人 4 个 */
  var PX = [560, 960, 1360], WHO = ['小红', '爸爸', '妈妈']
  var e6 = [
    lbl(960, 165, '小红和爸爸、妈妈一起分 12 个橘子，每人一样多，每人几个？', GREY, [0, 0.2], { font: 'kl', size: 38 }),
    { t: 'slot', id: 'q6', x: 1760, y: 430, size: 104, at: [1, '几个'] },
    lbl(1760, 530, '个', GREY, [1, '几个', 0.2], { font: 'kl', size: 44 }),
    { t: 'think', x: 960, y: 790, at: [2, '想一想', 0.7], from: 5, pulse: 'q6' },
    lbl(960, 660, '3 个人分！', ORANGE, [3, '三个人'], { font: 'kl', size: 48 })
  ]
  for (var p = 0; p < 3; p++) {
    e6.push(item('plate', PX[p], 470, 260, [3, '几个人', p * 0.2]))
    e6.push(lbl(PX[p], 570, WHO[p], p === 0 ? RED : INK, [3, '几个人', p * 0.2], { font: 'kl', size: 42, glow: p === 0 ? [3, '自己'] : undefined }))
    for (var o = 0; o < 4; o++) {
      e6.push(item('orange', PX[p] - 66 + o * 44, 440, 62, [4, '三个四', 0.1 + p * 0.35 + o * 0.08], { glow: [5, '四加四加四', p * 0.45] }))
    }
  }
  e6 = e6.concat([
    fill('q6', [4, '四个'], '4'),
    { t: 'check', x: 1870, y: 425, at: [5, '正好', 0.2] },
    { t: 'stamp', x: 1580, y: 810, s: '答：每人 4 个', color: RED, size: 50, rot: -6, at: [5, '十二个', 0.8] }
  ])
  S.push({
    tag: '小挑战 | 第 1 题',
    beats: [
      { sub: '小挑战，第一题：小红和爸爸、妈妈，', say: '小挑战，第一题：小红和爸爸、妈妈，' },
      { sub: '一起分 12 个橘子，每人一样多。每人几个？', say: '一起分十二个橘子，每人一样多。每人分几个？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '小心陷阱：几个人分？别忘了小红自己，3 个人！', say: '小心陷阱：几个人分？别忘了小红自己，三个人！' },
      { sub: '3 个几是 12？3 个 4，每人 **4** 个！', say: '三个几是十二？三个四，正好十二，每人四个！' },
      { sub: '验一验：4 加 4 加 4，正好 12 个！', say: '验一验：四加四加四，正好十二个！', pause: 1 }
    ],
    els: e6
  })

  /* 7 小挑战 2：姐姐 12 岁、小华 8 岁，20 年以后 → 还是大 4 岁 */
  var e7 = [
    lbl(960, 165, '今年姐姐 12 岁，小华 8 岁。20 年以后，姐姐比小华大几岁？', GREY, [0, 0.2], { font: 'kl', size: 38 }),
    item('kid3', 600, 430, 130, [0, '姐姐']),
    lbl(600, 545, '姐姐 12 岁', RED, [0, '十二岁'], { font: 'kl', size: 40 }),
    item('kid2', 1120, 430, 130, [0, '小华']),
    lbl(1120, 545, '小华 8 岁', BLUE, [0, '八岁'], { font: 'kl', size: 40 }),
    { t: 'slot', id: 'q7', x: 1760, y: 430, size: 104, at: [1, '几岁'] },
    lbl(1760, 530, '岁', GREY, [1, '几岁', 0.2], { font: 'kl', size: 44 }),
    { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q7' },
    { t: 'note', x: 860, y: 300, s: '20 年以后：捣乱的！', color: RED, at: [2, '捣乱'] },
    lbl(860, 660, '12 − 8 = 4', GREEN, [3, '十二减八'], { font: 'num', size: 60 }),
    fill('q7', [3, '四岁'], '4'),
    { t: 'check', x: 1870, y: 425, at: [3, '四岁', 0.3] },
    { t: 'stamp', x: 1580, y: 810, s: '答：还是大 4 岁', color: RED, size: 46, rot: -6, at: [3, '四岁', 0.9] }
  ]
  S.push({
    tag: '小挑战 | 第 2 题',
    beats: [
      { sub: '第二题：今年姐姐 12 岁，小华 8 岁。', say: '第二题：今年姐姐十二岁，小华八岁。' },
      { sub: '20 年以后，姐姐比小华大几岁？用哪一招？', say: '二十年以后，姐姐比小华大几岁？这次，用哪一招？', rate: '-6%', pause: 5 },
      { sub: '找出捣乱的：「20 年以后」是来捣乱的！', say: '找出捣乱的：二十年以后，是来捣乱的！' },
      { sub: '12 减 8，还是大 **4** 岁！', say: '十二减八，还是大四岁！', pause: 1 }
    ],
    els: e7
  })

  /* 8 结尾 + 下一课预告 */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天，我们学会了两招：', say: '今天，我们学会了两招：' },
      { sub: '找出捣乱的；问啥就答啥。', say: '找出捣乱的；问啥，就答啥。' },
      { sub: '下一课，我们来认识「合理分组问题」！', say: '下一课，我们来认识，合理分组问题！', pitch: '+4Hz' },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: [
      { t: 'card', x: 760, y: 420, title: '第一招', sub: '找捣乱的', color: BLUE, at: 0, glow: [1, '捣乱'] },
      { t: 'card', x: 1160, y: 420, title: '第二招', sub: '问啥答啥', color: RED, at: [0, 0.3], glow: [1, '答啥'] },
      { t: 'card', x: 960, y: 690, title: '下一课 · 第 19 课', sub: '合理分组问题', color: ORANGE, at: [2, '下一课'], glow: [2, '分组'], out: 3 },
      { t: 'tape', x: 960, y: 690, s: '去练习纸上试试吧！', size: 50, at: [3, '练习纸'] }
    ]
  })

  /* 封面 */
  var cv = [
    { t: 'txt', x: 960, y: 140, s: '奥数 · 第 18 课 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
    { t: 'tape', x: 960, y: 290, s: '趣味陷阱题', size: 150, at: 0 },
    { t: 'txt', x: 960, y: 440, s: '题目读两遍，找出捣乱的', size: 58, color: RED, font: 'kl', at: 0 }
  ]
  for (var c = 0; c < 8; c++) cv.push(item(c < 5 ? 'candle' : 'candleOut', 520 + c * 125, 640, 170, 0))
  cv.push({ t: 'txt', x: 960, y: 830, s: '吹灭 3 支，早上还剩几支？', size: 54, color: GREEN, font: 'kl', at: 0 })
  S.cover = { tag: null, els: cv }

  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
