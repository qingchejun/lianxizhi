/* 10 等量代换 · 讲解视频分镜 v2（对标 08；关键动作用 [beat, '关键词'] 对齐配音） */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420'

  /* 天平：托盘面 y-15，支点 y-155，底座 y+95；tilt = [[时间, 角度], ...]（负数 = 左边沉） */
  function balance(id, x, y, w, at, o) {
    o = o || {}
    return { t: 'balance', id: id, x: x, y: y, w: w, at: at, out: o.out, dim: o.dim, tilt: o.tilt }
  }
  /* 托盘里的一排物品：ats 可以是一个时间，也可以是每个物品各自的时间数组 */
  function onPan(k, n, B, side, size, ats, o) {
    o = o || {}
    var gap = o.gap || size * 0.92, cx = B.x + (side === 'L' ? -1 : 1) * B.w / 2, py = B.y - 15, els = []
    for (var i = 0; i < n; i++) {
      var at = (Array.isArray(ats) && Array.isArray(ats[0])) ? ats[i] : stagger(ats, i * 0.15)
      els.push({ t: 'item', k: k, id: (o.pre || k) + i, x: cx + (i - (n - 1) / 2) * gap, y: py - size / 2 + 8, size: size,
        at: at, out: o.out, dim: o.dim, on: [B.id, side], overlapOk: true })
    }
    return els
  }
  /* 给时间锚点加一个错开量 */
  function stagger(at, d) {
    if (!Array.isArray(at)) return [at, d]
    if (typeof at[1] === 'string') return [at[0], at[1], (at[2] || 0) + d]
    return [at[0], (at[1] || 0) + d]
  }
  function line(k, n, cx, y, size, at, o) {
    o = o || {}
    var gap = o.gap || size * 0.95, els = []
    for (var i = 0; i < n; i++) {
      els.push({ t: 'item', k: k, id: (o.pre || k) + i, x: cx + (i - (n - 1) / 2) * gap, y: y, size: size,
        at: stagger(at, i * (o.step || 0.12)), out: o.out, dim: o.dim })
    }
    return els
  }
  function lbl(x, y, s, color, at, o) {
    o = o || {}
    return { t: 'txt', x: x, y: y, s: s, size: o.size || 40, font: o.font || 'kai', color: color || GREY, at: at, out: o.out, anim: o.anim, overlapOk: o.overlapOk }
  }
  function fill(id, at, val) { return { t: 'fill', id: id, at: at, val: val } }

  var S = []

  /* 0 开场 */
  var B0 = { id: 'b0', x: 960, y: 745, w: 520 }
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '上一课，我们给图形排队找规律。', say: '上一课，我们给图形排队找规律。' },
      { sub: '今天，来玩一个「换一换」的游戏！', say: '今天，来玩一个换一换的游戏！' }
    ],
    els: [
      { t: 'txt', x: 960, y: 250, s: '奥数 · 第 10 课', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
      { t: 'tape', x: 960, y: 380, s: '等量代换', size: 130, at: [0, 0.2] },
      balance('b0', B0.x, B0.y, B0.w, [2, '换一换'], { tilt: [[null, 0], [[2, '换一换', 0.3], -10], [[2, '游戏', 0], 0]] })
    ].concat(onPan('melon', 1, B0, 'L', 150, [2, '换一换', 0.3]))
      .concat(onPan('apple', 3, B0, 'R', 84, [[2, '游戏', 0], [2, '游戏', 0.1], [2, '游戏', 0.2]], { gap: 74 }))
  })

  /* 1 引入：天平慢慢放平 → 一样重 → 能互相换 */
  var B1 = { id: 'b1', x: 960, y: 560, w: 640 }
  S.push({
    tag: '等量代换',
    beats: [
      { sub: '看，天平左边放 1 个西瓜——', say: '看，天平左边放一个西瓜——' },
      { sub: '右边放 1 个、2 个、3 个苹果。', say: '右边放一个、两个、三个苹果。' },
      { sub: '天平平了！说明 1 个西瓜和 3 个苹果一样重。', say: '天平平了！说明一个西瓜和三个苹果一样重。', pitch: '+6Hz' },
      { sub: '一样重，就能互相换。这就叫「等量代换」。', say: '一样重，就能互相换。这就叫，等量代换。' },
      { sub: '今天，教你两招。', say: '今天，教你两招。' }
    ],
    els: [balance('b1', B1.x, B1.y, B1.w, 0, { out: 4, tilt: [[null, 0], [[0, '西瓜'], -12], [[1, '一个'], -8], [[1, '两个'], -4], [[1, '三个'], 0]] })]
      .concat(onPan('melon', 1, B1, 'L', 180, [0, '西瓜'], { out: 4 }))
      .concat(onPan('apple', 3, B1, 'R', 92, [[1, '一个'], [1, '两个'], [1, '三个']], { gap: 70, out: 4 }))
      .concat([
        { t: 'stamp', x: 960, y: 220, s: '平了！', color: GREEN, size: 56, rot: -4, at: [2, '平了'], out: 4 },
        { t: 'note', x: 1600, y: 170, s: '1 西瓜 = 3 苹果', color: RED, at: [2, '一样重'] },
        { t: 'harrow', x1: 720, x2: 1200, y: 760, s: '互相换', color: RED, at: [3, '互相换'], out: 4 },
        { t: 'tape', x: 960, y: 835, s: '等量代换', size: 60, at: [3, '等量代换'], out: 4 },
        { t: 'card', x: 760, y: 470, title: '第一招', sub: '一个换几个', color: BLUE, at: [4, '两招'] },
        { t: 'card', x: 1160, y: 470, title: '第二招', sub: '一层一层换', color: RED, at: [4, '两招', 0.3] }
      ])
  })

  /* 2 第一招：2 个西瓜 = ？个苹果 */
  var MX = [620, 1040], AY = 640
  var e2 = [
    { t: 'big', x: 960, y: 470, title: '第一招', sub: '一个换几个', color: BLUE, at: 0, out: 1 },
    { t: 'note', x: 1600, y: 170, s: '1 西瓜 = 3 苹果', color: RED, at: 1, glow: [2, '三个苹果'] },
    { t: 'item', k: 'melon', id: 'm0', x: MX[0], y: 360, size: 170, at: [1, '两个西瓜'], dim: [2, '换', 0.3], glow: [2, '第一个'] },
    { t: 'item', k: 'melon', id: 'm1', x: MX[1], y: 360, size: 170, at: [1, '两个西瓜', 0.25], dim: [3, '换', 0.3], glow: [3, '第二个'] },
    lbl(1380, 360, '=', INK, [1, '几个苹果'], { font: 'num', size: 90 }),
    { t: 'slot', id: 'q2', x: 1560, y: 360, size: 130, at: [1, '几个苹果'] },
    lbl(1560, 470, '个苹果', GREY, [1, '几个苹果', 0.2], { font: 'kai', size: 40 })
  ]
  ;[0, 1].forEach(function (g) {
    var b = 2 + g
    e2.push({ t: 'varrow', x: MX[g], y1: 455, y2: 560, color: BLUE, at: [b, '换'] })
    e2 = e2.concat(line('apple', 3, MX[g], AY, 86, [b, '换', 0.25], { gap: 88, pre: 'a' + g + '_' }))
    e2.push({ t: 'loop', x: MX[g], y: AY, w: 310, h: 130, color: BLUE, at: [b, '换', 0.8] })
    e2.push({ t: 'badge', x: MX[g], y: AY + 112, s: '3', color: BLUE, at: [4, '三加三', g * 0.4] })
    var nums = ['一#2', '二', '三', '四', '五', '六']
    for (var i = 0; i < 3; i++) {
      e2.push(lbl(MX[g] + (i - 1) * 88, AY - 72, String(g * 3 + i + 1), GREEN, [5, nums[g * 3 + i]], { font: 'num', size: 42 }))
      e2.forEach(function (e) { if (e.id === 'a' + g + '_' + i) e.glow = [5, nums[g * 3 + i]] })
    }
  })
  e2 = e2.concat([
    { t: 'txt', x: 830, y: 850, s: '3 + 3 = 6', size: 64, font: 'num', color: RED, at: [4, '三加三'] },
    fill('q2', [4, '六个苹果'], '6'),
    { t: 'check', x: 1700, y: 360, at: [5, '正好'] },
    { t: 'stamp', x: 1560, y: 610, s: '答：6 个苹果', color: RED, size: 46, rot: -6, at: [5, '六个', 0.9] }
  ])
  S.push({
    tag: '第一招 | 一个换几个',
    beats: [
      { sub: '第一招：一个换几个。', say: '第一招：一个换几个。' },
      { sub: '2 个西瓜，和几个苹果一样重？', say: '两个西瓜，和几个苹果一样重？', rate: '-6%' },
      { sub: '1 个西瓜换 3 个苹果。第 1 个西瓜，换！', say: '一个西瓜换三个苹果。第一个西瓜，换！' },
      { sub: '第 2 个西瓜，也换！', say: '第二个西瓜，也换！' },
      { sub: '3 + 3 = 6，一共 **6** 个苹果。', say: '三加三，等于六，一共六个苹果。' },
      { sub: '验一验：1、2、3、4、5、6，正好 6 个！', say: '验一验：一、二、三、四、五、六，正好六个！', pause: 1 }
    ],
    els: e2
  })
  /* 第 2 句里「换」要取最后一次（「第一个西瓜，换」），单独修正 */
  S[2].els.forEach(function (e) {
    ;['at', 'dim'].forEach(function (k) { if (Array.isArray(e[k]) && e[k][0] === 2 && e[k][1] === '换') e[k] = [2, '换#2', e[k][2]] })
  })

  /* 3 冲突：两台天平，没有「猫换鸡」这句话 */
  var BA = { id: 'ba', x: 640, y: 380, w: 440 }, BB = { id: 'bb', x: 640, y: 720, w: 440 }
  S.push({
    tag: '第一招 | 一个换几个',
    beats: [
      { sub: '再看这道：1 只猫和 2 只兔一样重，1 只兔和 3 只鸡一样重。', say: '再看这道：一只猫和两只兔一样重；一只兔和三只鸡一样重。' },
      { sub: '那 1 只猫，和几只鸡一样重？', say: '那一只猫，和几只鸡一样重？', rate: '-6%' },
      { sub: '想直接换？可是，没有一句话说猫能换几只鸡！', say: '想直接换？可是，没有一句话，说猫能换几只鸡！' },
      { sub: '换不动了！', say: '换不动了！', pitch: '+10Hz', rate: '-5%' }
    ],
    els: [
      balance('ba', BA.x, BA.y, BA.w, 0, { tilt: [[null, 0], [[0, '一只猫'], -10], [[0, '两只兔'], 0]] }),
      balance('bb', BB.x, BB.y, BB.w, [0, '一只兔', -0.3], { tilt: [[null, 0], [[0, '一只兔'], -10], [[0, '三只鸡'], 0]] })
    ].concat(onPan('cat', 1, BA, 'L', 130, [0, '一只猫']))
      .concat(onPan('rabbit', 2, BA, 'R', 104, [0, '两只兔'], { gap: 100, pre: 'ra' }))
      .concat(onPan('rabbit', 1, BB, 'L', 104, [0, '一只兔'], { pre: 'rb' }))
      .concat(onPan('chick', 3, BB, 'R', 82, [0, '三只鸡'], { gap: 72 }))
      .concat([
        { t: 'item', k: 'cat', x: 1330, y: 470, size: 130, at: [1, '一只猫'] },
        lbl(1460, 470, '=', INK, [1, '几只鸡'], { font: 'num', size: 80 }),
        { t: 'slot', id: 'q3', x: 1590, y: 470, size: 120, at: [1, '几只鸡'] },
        lbl(1590, 575, '只鸡', GREY, [1, '几只鸡', 0.2], { font: 'kai', size: 40 }),
        { t: 'harrow', x1: 1280, x2: 1640, y: 290, s: '猫 → 鸡？', color: GREY, dashed: true, at: [2, '直接换'] },
        { t: 'stamp', x: 1480, y: 690, s: '没有这句话！', color: ORANGE, size: 50, rot: -5, at: [2, '没有一句话'] },
        { t: 'mess', x: 1700, y: 820, at: [3, '换不动'] }
      ])
  })

  /* 4 第二招：一层一层换（兔子是桥） */
  var CX = 250, RX = [660, 1260], CY = 470
  var e4 = [
    { t: 'big', x: 960, y: 470, title: '第二招', sub: '一层一层换', color: RED, at: 0, out: 1 },
    { t: 'note', x: 1590, y: 170, s: '1 猫 = 2 兔　1 兔 = 3 鸡', color: RED, at: 1 },
    { t: 'item', k: 'cat', id: 'cat', x: CX, y: CY, size: 150, at: [1, 0.1], dim: [2, '两只兔'], glow: [5, '一只猫'] },
    { t: 'brace', x: 960, y: CY + 110, w: 760, label: '兔子 = 桥', color: GREY, at: [1, '一座桥'], out: 2 },
    { t: 'harrow', x1: 360, x2: 520, y: CY - 50, s: '第 1 步', color: BLUE, at: [2, '第一步'] },
    { t: 'item', k: 'rabbit', id: 'r0', x: RX[0], y: CY, size: 124, at: [2, '两只兔'], dim: [3, '三只鸡', 0.6], glow: [5, '两只兔'] },
    { t: 'item', k: 'rabbit', id: 'r1', x: RX[1], y: CY, size: 124, at: [2, '两只兔', 0.25], dim: [3, '三只鸡', 1.4] }
  ]
  ;[0, 1].forEach(function (g) {
    e4.push({ t: 'harrow', x1: RX[g] + 72, x2: RX[g] + 170, y: CY - 50, s: g === 0 ? '第 2 步' : '', color: RED, at: [3, g === 0 ? '第二步' : '三只鸡', g * 0.8] })
    e4 = e4.concat(line('chick', 3, RX[g] + 292, CY, 74, [3, '三只鸡', 0.2 + g * 0.8], { gap: 74, pre: 'c' + g + '_' }))
    e4.push({ t: 'loop', x: RX[g] + 292, y: CY, w: 250, h: 116, color: RED, at: [3, '三只鸡', 0.6 + g * 0.8] })
    e4.push({ t: 'badge', x: RX[g] + 292, y: CY + 104, s: '3', color: RED, at: [4, '三加三', g * 0.4], glow: [5, '六只鸡', g * 0.15] })
  })
  e4 = e4.concat([
    { t: 'txt', x: 960, y: 760, s: '3 + 3 = 6', size: 64, font: 'num', color: RED, at: [4, '三加三'] },
    lbl(960, 860, '1 只猫 = 2 只兔 = 6 只鸡', GREEN, [5, '一只猫'], { font: 'kl', size: 50 }),
    { t: 'check', x: 1310, y: 855, at: [5, '对啦'] },
    { t: 'stamp', x: 1600, y: 700, s: '答：6 只鸡', color: RED, size: 46, rot: -6, at: [5, '对啦', 0.9] }
  ])
  S.push({
    tag: '第二招 | 一层一层换',
    beats: [
      { sub: '别急，用第二招：一层一层换。', say: '别急，用第二招：一层一层换。' },
      { sub: '兔子是一座桥：猫能换兔，兔又能换鸡。', say: '兔子是一座桥：猫能换兔，兔又能换鸡。' },
      { sub: '第 1 步：1 只猫，先换成 2 只兔。', say: '第一步：一只猫，先换成两只兔。' },
      { sub: '第 2 步：每只兔，再换成 3 只鸡。', say: '第二步：每只兔，再换成三只鸡。' },
      { sub: '3 + 3 = 6，一共 **6** 只鸡。', say: '三加三，等于六，一共六只鸡。' },
      { sub: '验一验：1 只猫 = 2 只兔 = 6 只鸡，对啦！', say: '验一验：一只猫，等于两只兔，等于六只鸡，对啦！', pause: 1 }
    ],
    els: e4
  })

  /* 5 口诀（讲解页原文） */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这四句口诀：', say: '记住这四句口诀：' },
      { sub: '一个换几个，', say: '一个，换几个，', rate: '-15%' },
      { sub: '先要看清楚；', say: '先要，看清楚；', rate: '-15%' },
      { sub: '大的换小的，', say: '大的，换小的，', rate: '-15%' },
      { sub: '一层一层换。', say: '一层，一层换。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 480, w: 900, h: 460, at: 0 },
      { t: 'chant', x: 760, y: 410, s: '一个换几个，', color: BLUE, at: 1 },
      { t: 'chant', x: 1165, y: 410, s: '先要看清楚；', color: BLUE, at: 2 },
      { t: 'chant', x: 760, y: 560, s: '大的换小的，', color: RED, at: 3 },
      { t: 'chant', x: 1165, y: 560, s: '一层一层换。', color: RED, at: 4 }
    ]
  })

  /* 6 小挑战 1：○ + ○ = 8，○ + △ = 11 */
  var Y1 = 360, Y2 = 540
  S.push({
    tag: '小挑战 | 第 1 题',
    beats: [
      { sub: '小挑战，第一题：', say: '小挑战，第一题：' },
      { sub: '○ + ○ = 8，○ + △ = 11。△ 是几？', say: '圆圈加圆圈等于八，圆圈加三角形等于十一。三角形是几？' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '先看只有 ○ 的第一条：两个 ○ 一样大，8 分成两份，○ 是 4。', say: '先看只有圆圈的第一条：两个圆圈一样大，八分成两份，圆圈是四。' },
      { sub: '把 4 换进第二条：4 + △ = 11。', say: '把四换进第二条：四加三角形等于十一。' },
      { sub: '11 − 4 = 7，△ 是 **7**！', say: '十一减四，等于七，三角形是七！', pitch: '+6Hz' },
      { sub: '验一验：4 + 4 = 8，4 + 7 = 11，全对！', say: '验一验：四加四等于八，四加七等于十一，全对！', pause: 1 }
    ],
    els: [
      lbl(560, Y1, '①', GREY, [1, '圆圈'], { size: 52 }),
      { t: 'sym', id: 'a0', k: 'ci', x: 700, y: Y1, size: 110, at: [1, '圆圈'], glow: [3, '两个圆圈'] },
      lbl(810, Y1, '+', INK, [1, '圆圈'], { font: 'num', size: 80 }),
      { t: 'sym', id: 'a1', k: 'ci', x: 920, y: Y1, size: 110, at: [1, '圆圈#2'], glow: [3, '两个圆圈', 0.4] },
      lbl(1040, Y1, '=', INK, [1, '八'], { font: 'num', size: 80 }),
      lbl(1150, Y1, '8', INK, [1, '八'], { font: 'num', size: 96 }),
      lbl(560, Y2, '②', GREY, [1, '圆圈#3'], { size: 52 }),
      { t: 'sym', id: 'b0', k: 'ci', x: 700, y: Y2, size: 110, at: [1, '圆圈#3'] },
      lbl(810, Y2, '+', INK, [1, '圆圈#3'], { font: 'num', size: 80 }),
      { t: 'sym', id: 'b1', k: 'tri', x: 920, y: Y2, size: 120, at: [1, '三角形'] },
      lbl(1040, Y2, '=', INK, [1, '十一'], { font: 'num', size: 80 }),
      lbl(1150, Y2, '11', INK, [1, '十一'], { font: 'num', size: 96 }),
      { t: 'think', x: 960, y: 790, at: [2, '想一想', 0.7], from: 5, pulse: 'b1' },
      { t: 'band', x: 930, y: Y1, w: 760, h: 150, color: 'rgba(63,127,196,0.12)', at: [3, '第一条'], out: 4 },
      { t: 'txt', x: 1520, y: Y1, s: '8 = 4 + 4', size: 60, font: 'num', color: BLUE, at: [3, '分成两份'] },
      fill('a0', [3, '圆圈是四'], '4'), fill('a1', [3, '圆圈是四', 0.15], '4'),
      { t: 'varrow', x: 700, y1: 420, y2: 480, color: BLUE, at: [4, '换进'] },
      fill('b0', [4, '第二条'], '4'),
      { t: 'txt', x: 1520, y: Y2, s: '11 − 4 = 7', size: 60, font: 'num', color: RED, at: [5, '十一减四'] },
      fill('b1', [5, '三角形是七'], '7'),
      { t: 'check', x: 1310, y: Y1, at: [6, '等于八'] },
      { t: 'check', x: 1310, y: Y2, at: [6, '等于十一'] },
      { t: 'stamp', x: 1500, y: 720, s: '答：△ = 7', color: RED, size: 50, rot: -6, at: [6, '全对', 0.6] }
    ]
  })

  /* 7 小挑战 2：1 大南瓜 = 4 土豆，3 大南瓜 = ？ */
  var PX = [470, 960, 1450], PY = 330, TY = 620
  var e7 = [{ t: 'note', x: 1600, y: 170, s: '1 大南瓜 = 4 土豆', color: RED, at: [0, '四个土豆'] }]
  var cnt = ['四', '八', '十二']
  PX.forEach(function (x, g) {
    e7.push({ t: 'item', k: 'pumpkin', x: x, y: PY, size: 130, at: [0, '三个大南瓜', g * 0.2], dim: [2, '每个南瓜', 0.4 + g * 0.5] })
    e7.push({ t: 'varrow', x: x, y1: PY + 80, y2: TY - 110, color: BLUE, at: [2, '每个南瓜', 0.4 + g * 0.5] })
    e7 = e7.concat(line('potato', 4, x, TY, 72, [2, '每个南瓜', 0.7 + g * 0.5], { gap: 78, step: 0.08, pre: 'p' + g + '_' }))
    e7.push({ t: 'loop', x: x, y: TY, w: 360, h: 110, color: BLUE, at: [2, '四个土豆', g * 0.3] })
    e7.push({ t: 'badge', x: x, y: TY + 100, s: '4', color: BLUE, at: [3, '四加四', g * 0.3], glow: [4, cnt[g]] })
    e7.push(lbl(x, TY - 80, String(4 * (g + 1)), GREEN, [4, cnt[g]], { font: 'num', size: 48 }))
  })
  e7 = e7.concat([
    { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q7' },
    { t: 'txt', x: 760, y: 850, s: '4 + 4 + 4 = 12', size: 64, font: 'num', color: RED, at: [3, '四加四'] },
    { t: 'slot', id: 'q7', x: 1360, y: 850, size: 100, at: [0, '三个大南瓜', 0.6] },
    lbl(1490, 850, '个土豆', GREY, [0, '三个大南瓜', 0.8], { font: 'kl', size: 44 }),
    fill('q7', [3, '十二个'], '12'),
    { t: 'check', x: 1620, y: 845, at: [4, '对啦'] },
    { t: 'stamp', x: 960, y: 185, s: '答：12 个土豆', color: RED, size: 46, rot: -6, at: [4, '对啦', 0.9] }
  ])
  S.push({
    tag: '小挑战 | 第 2 题',
    beats: [
      { sub: '第二题：1 个大南瓜和 4 个土豆一样重。3 个大南瓜呢？', say: '第二题：一个大南瓜和四个土豆一样重。三个大南瓜呢？' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', pause: 5 },
      { sub: '只有一层：一个换几个！每个南瓜换 4 个土豆。', say: '只有一层：一个换几个！每个南瓜，换四个土豆。' },
      { sub: '4 + 4 + 4 = 12，一共 **12** 个土豆。', say: '四加四加四，等于十二，一共十二个土豆。' },
      { sub: '验一验：4、8、12，正好 12 个，对啦！', say: '验一验：四、八、十二，正好十二个，对啦！', pause: 1 }
    ],
    els: e7
  })

  /* 8 结尾 + 下一课预告 */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天，我们学会了两招：', say: '今天，我们学会了两招：' },
      { sub: '一个换几个，一层一层换。', say: '一个换几个；一层一层换。' },
      { sub: '下一课，我们来认识「重叠问题」！', say: '下一课，我们来认识，重叠问题！', pitch: '+4Hz' },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: [
      { t: 'card', x: 760, y: 420, title: '第一招', sub: '一个换几个', color: BLUE, at: 0, glow: [1, '一个换几个'] },
      { t: 'card', x: 1160, y: 420, title: '第二招', sub: '一层一层换', color: RED, at: [0, 0.3], glow: [1, '一层一层换'] },
      { t: 'card', x: 960, y: 690, title: '下一课 · 第 11 课', sub: '重叠问题', color: ORANGE, at: [2, '下一课'], glow: [2, '重叠问题'], out: 3 },
      { t: 'tape', x: 960, y: 690, s: '去练习纸上试试吧！', size: 50, at: [3, '练习纸'] }
    ]
  })

  /* 封面（网站视频播放前显示）：python3 shoot.py timing.json cover cover.jpg */
  var BC = { id: 'bc', x: 960, y: 790, w: 600 }
  S.cover = {
    tag: null,
    els: [
      { t: 'txt', x: 960, y: 140, s: '奥数 · 第 10 课 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
      { t: 'tape', x: 960, y: 300, s: '等量代换', size: 160, at: 0 },
      { t: 'txt', x: 960, y: 455, s: '一个换几个 · 一层一层换', size: 50, color: RED, font: 'kl', at: 0 },
      balance('bc', BC.x, BC.y, BC.w, 0)
    ].concat(onPan('melon', 1, BC, 'L', 190, 0))
      .concat(onPan('apple', 3, BC, 'R', 96, 0, { gap: 76 }))
  }
  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
