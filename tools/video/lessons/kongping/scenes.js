/* 14 空瓶换水 · 讲解视频分镜 v1（对标 08；关键动作用 [beat, '关键词'] 对齐配音）
 * 两招：第一招「一轮一轮换」（换几瓶 → 空瓶 = 剩下的 + 新的）；第二招「买的先喝掉」（最后把买的加上）。
 * 例题：2 空瓶换 1，有 7 个空瓶 → 7→3 剩1 共4；4→2 共2；2→1 共1；剩 1 停 → 3+2+1 = 6 瓶。
 *       3 空瓶换 1，买 7 瓶 → 7→2 剩1 共3；3→1 共1；剩 1 停 → 7+2+1 = 10 瓶。
 * 小挑战：3 换 1，有 11 个空瓶 → 11→3 剩2 共5；5→1 剩2 共3；3→1 共1 → 3+1+1 = 5 瓶。
 *         2 换 1，买 4 瓶 → 4→2 共2；2→1 共1 → 4+2+1 = 7 瓶。 */
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
    return { t: 'item', k: k, x: x, y: y, size: size, at: at, out: o.out, glow: o.glow, move: o.move, overlapOk: true }
  }
  function loop(x, y, w, h, color, at, o) {
    o = o || {}
    return { t: 'loop', x: x, y: y, w: w, h: h, color: color, at: at, out: o.out, overlapOk: true }
  }
  function strike(x, y, w, at, o) {
    o = o || {}
    return { t: 'seg', x1: x - w / 2, y1: y + 14, x2: x + w / 2, y2: y - 14, color: RED, sw: 8, at: at, out: o.out }
  }

  /* 一排瓶子：n 个，每 g 个一组（组间多空 gap）；full = 满瓶，empty 时刻（可选）满瓶变空瓶 */
  var BS = 84, BDX = 46, GAP = 14
  function bx(x0, j, g) { return x0 + j * BDX + (g ? Math.floor(j / g) * GAP : 0) }
  function bottles(arr, n, x0, y, at, o) {
    o = o || {}
    for (var j = 0; j < n; j++) {
      var x = bx(x0, j, o.g), a = stagger(at, j * (o.st === undefined ? 0.06 : o.st))
      var gl = o.glowLeft && o.g && j >= Math.floor(n / o.g) * o.g ? o.glowLeft : o.glow
      if (o.full && o.emptyAt) {
        arr.push(item('bottle', x, y, BS, a, { out: o.emptyAt }))
        arr.push(item('empty', x, y, BS, o.emptyAt, { out: o.out, glow: gl }))
      } else arr.push(item(o.full ? 'bottle' : 'empty', x, y, BS, a, { out: o.out, glow: gl }))
    }
  }
  /* 把 n 个空瓶每 g 个圈一圈 */
  function groups(arr, n, g, x0, y, at, o) {
    o = o || {}
    for (var k = 0; k < Math.floor(n / g); k++) {
      var xa = bx(x0, k * g, g), xb = bx(x0, k * g + g - 1, g)
      arr.push(loop((xa + xb) / 2, y + 4, xb - xa + 60, BS + 30, o.color || BLUE, stagger(at, k * 0.15), { out: o.out }))
    }
  }
  /* 一轮：左边 start 个空瓶（每 n 个一圈）→ 箭头 → t 瓶新汽水 → 「t 瓶」 → 「剩 + 新 = 空瓶」 */
  function roundRow(arr, r) {
    var t = Math.floor(r.start / r.n), left = r.start - t * r.n
    arr.push(lbl(200, r.y, r.label, GREY, r.atRow, { font: 'kl', size: 40 }))
    if (!r.skipBottles) bottles(arr, r.start, r.x0, r.y, r.atRow, { g: r.n, full: r.full, emptyAt: r.emptyAt, glowLeft: r.glowLeft })
    groups(arr, r.start, r.n, r.x0, r.y, r.atLoop)
    arr.push({ t: 'harrow', x1: r.ax, x2: r.ax + 110, y: r.y - 46, color: ORANGE, s: '换', at: r.atLoop })
    bottles(arr, t, r.ax + 160, r.y, stagger(r.atLoop, 0.3), { full: true, st: 0.12 })
    arr.push(lbl(r.ax + 160 + (t - 1) * BDX + 90, r.y, t + ' 瓶', GREEN, stagger(r.atLoop, 0.4), { font: 'kl', size: 44, glow: r.sumGlow }))
    if (r.atFormula) arr.push(lbl(r.fx, r.y, left + ' + ' + t + ' = ' + (left + t) + ' 个空瓶', BLUE, r.atFormula, { font: 'kl', size: 42 }))
  }
  function rule(n, at) {
    return { t: 'note', x: 1660, y: 190, s: n + ' 个空瓶 → 1 瓶', color: INK, at: at, rot: 3 }
  }

  var S = []

  /* 0 开场 */
  var e0 = [
    { t: 'txt', x: 960, y: 230, s: '奥数 · 第 14 课', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
    { t: 'tape', x: 960, y: 360, s: '空瓶换水', size: 130, at: [0, 0.2] },
    lbl(960, 640, '上一课：列到一半停 · 从小到大排', BLUE, [1, '列到一半'], { font: 'kl', size: 50, out: [2, 0] })
  ]
  e0.push(item('empty', 720, 650, 120, [2, '瓶子']))
  e0.push(item('empty', 790, 650, 120, [2, '瓶子', 0.12]))
  e0.push({ t: 'harrow', x1: 880, x2: 1040, y: 610, color: ORANGE, s: '换', at: [2, '还能换'] })
  e0.push(item('bottle', 1150, 650, 120, [2, '汽水']))
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '上一课，我们学了分堆：列到一半停，从小到大排。', say: '上一课，我们学了分堆：列到一半停，从小到大排。' },
      { sub: '今天学「空瓶换水」：喝完的瓶子，还能换汽水！', say: '今天，来学空瓶换水：喝完的瓶子，还能换汽水！' }
    ],
    els: e0
  })

  /* 1 引入：小明 7 个空瓶，换了 3 瓶就走了 → 喝完又是空瓶，还能换！ */
  var X1 = 520
  var e1 = [
    item('empty', 830, 330, 110, [0, '两个空瓶'], { out: [1, 0] }),
    item('empty', 890, 330, 110, [0, '两个空瓶', 0.12], { out: [1, 0] }),
    { t: 'harrow', x1: 960, x2: 1100, y: 290, color: ORANGE, s: '换', at: [0, '可以换'], out: [1, 0] },
    item('bottle', 1170, 330, 110, [0, '一瓶汽水'], { out: [1, 0] }),
    rule(2, [0, '一瓶汽水', 0.4]),
    item('kid0', 270, 500, 170, [1, '小明'], { out: [3, '两招'] }),
    lbl(270, 630, '小明', BLUE, [1, '小明'], { font: 'kl', size: 40, out: [3, '两招'] })
  ]
  bottles(e1, 7, X1, 500, [1, '七个空瓶'], { g: 2, out: [3, '两招'] })
  groups(e1, 7, 2, X1, 500, [1, '换了三瓶'], { out: [3, '两招'] })
  e1.push({ t: 'harrow', x1: 900, x2: 1010, y: 454, color: ORANGE, s: '换', at: [1, '换了三瓶'], out: [3, '两招'] })
  bottles(e1, 3, 1070, 500, [1, '换了三瓶', 0.3], { full: true, st: 0.12, emptyAt: [2, '又变成'], out: [3, '两招'] })
  e1 = e1.concat([
    lbl(1500, 500, '喝完就走？', GREY, [1, '就走了'], { font: 'kl', size: 48, out: [2, '等等'] }),
    { t: 'stamp', x: 1500, y: 500, s: '还能换！', color: ORANGE, size: 64, rot: -5, at: [2, '接着换'], out: [3, '两招'] },
    lbl(1120, 640, '又是 3 个空瓶', RED, [2, '又变成', 0.3], { font: 'kl', size: 46, out: [3, '两招'] }),
    { t: 'card', x: 760, y: 470, title: '第一招', sub: '一轮一轮换', color: BLUE, at: [3, '两招', 0.3] },
    { t: 'card', x: 1160, y: 470, title: '第二招', sub: '买的先喝掉', color: RED, at: [3, '两招', 0.6] }
  ])
  S.push({
    tag: '空瓶换水',
    beats: [
      { sub: '小卖部说：2 个空瓶，可以换 1 瓶汽水。', say: '小卖部说：两个空瓶，可以换一瓶汽水。' },
      { sub: '小明有 7 个空瓶，换了 3 瓶，喝完就走了。', say: '小明有七个空瓶，换了三瓶，喝完，就走了。' },
      { sub: '等等！喝完的 3 个瓶子，又变成空瓶，还能换！', say: '等等！喝完的三个瓶子，又变成空瓶，还能接着换！', pitch: '+8Hz' },
      { sub: '最多能喝几瓶？今天教你两招。', say: '最多能喝几瓶？今天，教你两招。' }
    ],
    els: e1
  })

  /* 2 第一招：一轮一轮换（2 换 1，7 个空瓶 → 6 瓶） */
  var Y2 = [310, 440, 570], X2 = 330, A2 = 720, F2 = 1370
  var e2 = [
    { t: 'big', x: 960, y: 470, title: '第一招', sub: '一轮一轮换', color: BLUE, at: 0, out: [1, 0] },
    rule(2, [1, 0]),
    lbl(960, 165, '7 个空瓶，最多喝几瓶？', GREY, [1, 0], { font: 'kl', size: 40 }),
    { t: 'slot', id: 'q2', x: 1760, y: 440, size: 104, at: [1, 0.3] },
    lbl(1760, 540, '瓶', GREY, [1, 0.5], { font: 'kl', size: 44 })
  ]
  roundRow(e2, { y: Y2[0], label: '第 1 轮', start: 7, n: 2, x0: X2, ax: A2, fx: F2, atRow: [1, '七个空瓶'], atLoop: [1, '换三瓶'], glowLeft: [1, '剩一个'], atFormula: [2, '一加三'], sumGlow: [5, '三加'] })
  roundRow(e2, { y: Y2[1], label: '第 2 轮', start: 4, n: 2, x0: X2, ax: A2, fx: F2, atRow: [3, '四个'], atLoop: [3, '换两瓶'], atFormula: [3, '换两瓶', 0.6], sumGlow: [5, '二加'] })
  roundRow(e2, { y: Y2[2], label: '第 3 轮', start: 2, n: 2, x0: X2, ax: A2, fx: F2, atRow: [3, '两个'], atLoop: [3, '换一瓶'], atFormula: [3, '换一瓶', 0.6], sumGlow: [5, '加一'] })
  bottles(e2, 1, X2, 700, [4, '剩一个'], { glow: [4, '剩一个', 0.2] })
  e2 = e2.concat([
    lbl(560, 700, '剩 1 个，不够 2 个', GREY, [4, '不够'], { font: 'kl', size: 44 }),
    { t: 'stamp', x: 860, y: 700, s: '停！', color: ORANGE, size: 60, rot: -6, at: [4, '停'] },
    lbl(1260, 710, '3 + 2 + 1 = 6', GREEN, [5, '三加'], { font: 'num', size: 64 }),
    fill('q2', [5, '六瓶'], '6'),
    { t: 'check', x: 1870, y: 435, at: [5, '六瓶', 0.3] },
    { t: 'stamp', x: 1640, y: 810, s: '答：6 瓶', color: RED, size: 50, rot: -6, at: [5, '六瓶', 0.9] }
  ])
  S.push({
    tag: '第一招 | 一轮一轮换',
    beats: [
      { sub: '第一招：一轮一轮换！先算换几瓶，再数空瓶。', say: '第一招：一轮一轮地换！每轮先算换几瓶，再数空瓶。' },
      { sub: '第 1 轮：7 个空瓶，换 3 瓶，剩 1 个。', say: '第一轮：七个空瓶，换三瓶，剩一个。' },
      { sub: '喝完 3 瓶，空瓶就有：1 + 3 = 4 个。', say: '喝完三瓶，空瓶就有：一加三，四个。' },
      { sub: '第 2 轮：4 个换 2 瓶；第 3 轮：2 个换 1 瓶。', say: '第二轮：四个，换两瓶；第三轮：两个，换一瓶。' },
      { sub: '最后剩 1 个空瓶，不够 2 个，停！', say: '最后剩一个空瓶，不够两个，停！', pitch: '+6Hz' },
      { sub: '一共喝了：3 + 2 + 1 = **6** 瓶。', say: '一共喝了：三加二加一，六瓶。', pause: 1 }
    ],
    els: e2
  })

  /* 3 冲突：买了 7 瓶，3 换 1 —— 手里一个空瓶都没有，换不了！ */
  var e3 = [
    rule(3, [0, '三个空瓶']),
    item('kid1', 260, 440, 180, [0, '小红']),
    lbl(260, 580, '小红', RED, [0, '小红'], { font: 'kl', size: 40 }),
    { t: 'slot', id: 'q3', x: 1560, y: 440, size: 104, at: [1, '几瓶'] },
    lbl(1660, 440, '瓶', GREY, [1, '几瓶', 0.2], { font: 'kl', size: 44 }),
    lbl(760, 660, '空瓶：0 个', RED, [2, '一个空瓶'], { font: 'kl', size: 54 }),
    { t: 'stamp', x: 1180, y: 670, s: '换不了！', color: ORANGE, size: 64, rot: -5, at: [2, '换不了'] }
  ]
  for (var j3 = 0; j3 < 7; j3++) e3.push(item('bottle', 500 + j3 * 105, 440, 130, [0, '七瓶汽水', j3 * 0.08], { glow: [2, '可是'] }))
  S.push({
    tag: '第一招 | 一轮一轮换',
    beats: [
      { sub: '再来一题：小红买了 7 瓶汽水，3 个空瓶换 1 瓶。', say: '再来一题：小红买了七瓶汽水，三个空瓶，换一瓶。', rate: '-6%' },
      { sub: '她一共能喝几瓶？', say: '她一共，能喝几瓶？', rate: '-6%' },
      { sub: '可是，手里一个空瓶都没有，换不了！', say: '可是，手里一个空瓶都没有，换不了！', pitch: '+8Hz' }
    ],
    els: e3
  })

  /* 4 第二招：买的先喝掉（3 换 1，买 7 瓶 → 7 + 2 + 1 = 10） */
  var Y4 = [320, 470], X4 = 330, A4 = 720, F4 = 1370
  var e4 = [
    { t: 'big', x: 960, y: 470, title: '第二招', sub: '买的先喝掉', color: RED, at: 0, out: [0, '七瓶喝完'] },
    rule(3, [0, '七瓶喝完']),
    { t: 'slot', id: 'q4', x: 1760, y: 470, size: 104, at: [0, '七瓶喝完', 0.3] },
    lbl(1760, 570, '瓶', GREY, [0, '七瓶喝完', 0.5], { font: 'kl', size: 44 }),
    lbl(560, 200, '买的 7 瓶', RED, [0, '七瓶喝完'], { font: 'kl', size: 44, glow: [3, '买的七瓶'], glow2: [4, '七加'] })
  ]
  roundRow(e4, { y: Y4[0], label: '第 1 轮', start: 7, n: 3, x0: X4, ax: A4, fx: F4, full: true, atRow: [0, '七瓶喝完'], emptyAt: [0, '就有'], atLoop: [1, '换两瓶'], glowLeft: [1, '剩一个'], atFormula: [1, '一加二'], sumGlow: [4, '二加'] })
  roundRow(e4, { y: Y4[1], label: '第 2 轮', start: 3, n: 3, x0: X4, ax: A4, fx: F4, atRow: [2, '三个'], atLoop: [2, '换一瓶'], sumGlow: [4, '加一'] })
  bottles(e4, 1, X4, 600, [2, '剩一个'], { glow: [2, '剩一个', 0.2] })
  e4 = e4.concat([
    lbl(560, 600, '剩 1 个，不够 3 个', GREY, [2, '不够换'], { font: 'kl', size: 44 }),
    { t: 'stamp', x: 860, y: 600, s: '停！', color: ORANGE, size: 60, rot: -6, at: [2, '停'] },
    { t: 'stamp', x: 1340, y: 610, s: '别忘了买的！', color: ORANGE, size: 54, rot: -4, at: [3, '别忘了'] },
    lbl(960, 740, '7 + 2 + 1 = 10', GREEN, [4, '七加'], { font: 'num', size: 64 }),
    fill('q4', [4, '十瓶'], '10'),
    { t: 'check', x: 1870, y: 465, at: [5, '正好'] },
    { t: 'stamp', x: 1640, y: 810, s: '答：10 瓶', color: RED, size: 50, rot: -6, at: [5, '正好', 0.9] }
  ])
  S.push({
    tag: '第二招 | 买的先喝掉',
    beats: [
      { sub: '第二招：买的先喝掉！7 瓶喝完，就有 7 个空瓶。', say: '第二招：买的先喝掉！七瓶喝完，就有七个空瓶。' },
      { sub: '第 1 轮：7 个换 2 瓶，剩 1 个；喝完有 3 个。', say: '第一轮：七个换两瓶，剩一个；喝完，一加二，三个空瓶。' },
      { sub: '第 2 轮：3 个换 1 瓶；喝完剩 1 个，停！', say: '第二轮：三个换一瓶；喝完剩一个，不够换，停！' },
      { sub: '别忘了，买的 7 瓶也要算进去！', say: '别忘了，买的七瓶，也要算进去！', pitch: '+5Hz' },
      { sub: '一共喝了：7 + 2 + 1 = **10** 瓶。', say: '一共喝了：七加二加一，十瓶。' },
      { sub: '验一验：买的 7 瓶，加换来的 3 瓶，正好 10 瓶！', say: '验一验：买的七瓶，加换来的三瓶，正好十瓶！', pause: 1 }
    ],
    els: e4
  })

  /* 5 口诀（讲解页原文） */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '喝完瓶子别扔掉，凑够就去换一瓶；', say: '喝完瓶子别扔掉，凑够就去换一瓶；', rate: '-15%' },
      { sub: '一轮一轮慢慢数，直到不够换为止。', say: '一轮一轮慢慢数，直到不够换为止。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 480, w: 1360, h: 400, at: 0 },
      { t: 'chant', x: 960, y: 420, s: '喝完瓶子别扔掉，凑够就去换一瓶；', color: BLUE, at: 1 },
      { t: 'chant', x: 960, y: 570, s: '一轮一轮慢慢数，直到不够换为止。', color: RED, at: 2 }
    ]
  })

  /* 6 小挑战 1：3 换 1，有 11 个空瓶 → 3 + 1 + 1 = 5 */
  var Y6 = [290, 420, 550], X6 = 300, A6 = 870, F6 = 1470
  var e6 = [
    rule(3, [0, '三个空瓶']),
    { t: 'slot', id: 'q6', x: 1760, y: 690, size: 104, at: [1, '几瓶'] },
    lbl(1860, 690, '瓶', GREY, [1, '几瓶', 0.2], { font: 'kl', size: 44 }),
    { t: 'think', x: 960, y: 790, at: [2, '想一想', 0.7], from: 5, pulse: 'q6' }
  ]
  bottles(e6, 11, X6, Y6[0], [1, '十一个空瓶'], { g: 3, glowLeft: [3, '剩两个'] })
  roundRow(e6, { y: Y6[0], label: '第 1 轮', start: 11, n: 3, x0: X6, ax: A6, fx: F6, skipBottles: true, atRow: [3, '第一轮'], atLoop: [3, '换三瓶'], atFormula: [3, '有五个'], sumGlow: [6, '三加'] })
  roundRow(e6, { y: Y6[1], label: '第 2 轮', start: 5, n: 3, x0: X6, ax: A6, fx: F6, atRow: [4, '五个'], atLoop: [4, '换一瓶'], glowLeft: [4, '剩两个'], atFormula: [4, '有三个'], sumGlow: [6, '一加'] })
  roundRow(e6, { y: Y6[2], label: '第 3 轮', start: 3, n: 3, x0: X6, ax: A6, fx: F6, atRow: [5, '三个'], atLoop: [5, '换一瓶'], sumGlow: [6, '加一#2'] })
  bottles(e6, 1, X6, 680, [5, '剩一个'], { glow: [5, '剩一个', 0.2] })
  e6 = e6.concat([
    lbl(560, 680, '剩 1 个，不够 3 个', GREY, [5, '剩一个', 0.2], { font: 'kl', size: 44 }),
    { t: 'stamp', x: 860, y: 680, s: '停！', color: ORANGE, size: 60, rot: -6, at: [5, '停'] },
    lbl(1180, 690, '3 + 1 + 1 = 5', GREEN, [6, '三加'], { font: 'num', size: 64 }),
    fill('q6', [6, '五瓶'], '5'),
    { t: 'check', x: 1760, y: 580, at: [6, '五瓶', 0.3] },
    { t: 'stamp', x: 1640, y: 810, s: '答：5 瓶', color: RED, size: 50, rot: -6, at: [6, '五瓶', 0.9] }
  ])
  S.push({
    tag: '小挑战 | 第 1 题',
    beats: [
      { sub: '小挑战，第一题：3 个空瓶换 1 瓶汽水，', say: '小挑战，第一题：三个空瓶，换一瓶汽水，' },
      { sub: '有 11 个空瓶，最多能喝几瓶？', say: '有十一个空瓶，最多能喝几瓶？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '第 1 轮：11 个换 3 瓶，剩 2 个；喝完有 5 个。', say: '第一轮：十一个换三瓶，剩两个；喝完，有五个。' },
      { sub: '第 2 轮：5 个换 1 瓶，剩 2 个；喝完有 3 个。', say: '第二轮：五个换一瓶，剩两个；喝完，有三个。' },
      { sub: '第 3 轮：3 个换 1 瓶；最后剩 1 个，停！', say: '第三轮：三个换一瓶；最后剩一个，停！' },
      { sub: '验一验：3 + 1 + 1，正好 **5** 瓶！', say: '验一验：三加一加一，正好五瓶！', pause: 1 }
    ],
    els: e6
  })

  /* 7 小挑战 2：2 换 1，买 4 瓶 → 4 + 2 + 1 = 7 */
  var Y7 = [300, 440], X7 = 330, A7 = 720, F7 = 1370
  var e7 = [
    rule(2, [0, '两个空瓶']),
    { t: 'slot', id: 'q7', x: 1760, y: 470, size: 104, at: [0, '几瓶'] },
    lbl(1760, 570, '瓶', GREY, [0, '几瓶', 0.2], { font: 'kl', size: 44 }),
    lbl(450, 200, '买的 4 瓶', RED, [0, '四瓶'], { font: 'kl', size: 44, glow: [4, '买的'], glow2: [5, '买的'] }),
    { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q7' }
  ]
  roundRow(e7, { y: Y7[0], label: '第 1 轮', start: 4, n: 2, x0: X7, ax: A7, fx: F7, full: true, atRow: [0, '四瓶'], emptyAt: [2, '先喝掉'], atLoop: [2, '换两瓶'], atFormula: [3, '两个空瓶'], sumGlow: [4, '二加'] })
  roundRow(e7, { y: Y7[1], label: '第 2 轮', start: 2, n: 2, x0: X7, ax: A7, fx: F7, atRow: [3, '两个空瓶'], atLoop: [3, '再换'], sumGlow: [4, '加一'] })
  bottles(e7, 1, X7, 580, [3, '剩一个'], { glow: [3, '剩一个', 0.2] })
  e7 = e7.concat([
    lbl(560, 580, '剩 1 个，不够 2 个', GREY, [3, '剩一个', 0.2], { font: 'kl', size: 44 }),
    { t: 'stamp', x: 860, y: 580, s: '停！', color: ORANGE, size: 60, rot: -6, at: [3, '停'] },
    lbl(960, 720, '4 + 2 + 1 = 7', GREEN, [4, '四加'], { font: 'num', size: 64 }),
    fill('q7', [4, '七瓶'], '7'),
    { t: 'check', x: 1870, y: 465, at: [5, '正好'] },
    { t: 'stamp', x: 1640, y: 810, s: '答：7 瓶', color: RED, size: 50, rot: -6, at: [5, '正好', 0.9] }
  ])
  S.push({
    tag: '小挑战 | 第 2 题',
    beats: [
      { sub: '第二题：买 4 瓶汽水，2 个空瓶换 1 瓶，一共喝几瓶？', say: '第二题：买四瓶汽水，两个空瓶换一瓶，一共能喝几瓶？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', pause: 5 },
      { sub: '第二招，买的先喝掉！4 个空瓶，换 2 瓶。', say: '第二招，买的先喝掉！四个空瓶，换两瓶。' },
      { sub: '喝完 2 个空瓶，再换 1 瓶；剩 1 个，停！', say: '喝完，两个空瓶，再换一瓶；剩一个，停！' },
      { sub: '别忘了买的：4 + 2 + 1 = **7** 瓶！', say: '别忘了买的：四加二加一，七瓶！' },
      { sub: '验一验：买的 4 瓶，加换来的 3 瓶，正好 7 瓶！', say: '验一验：买的四瓶，加换来的三瓶，正好七瓶！', pause: 1 }
    ],
    els: e7
  })

  /* 8 结尾 + 下一课预告 */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天，我们学会了两招：', say: '今天，我们学会了两招：' },
      { sub: '一轮一轮换，别漏新空瓶；买的先喝掉，最后加上它。', say: '一轮一轮换，别漏了新空瓶；买的先喝掉，最后别忘了加上它。' },
      { sub: '下一课，我们来认识「火柴棒游戏」！', say: '下一课，我们来认识，火柴棒游戏！', pitch: '+4Hz' },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: [
      { t: 'card', x: 760, y: 420, title: '第一招', sub: '一轮一轮换', color: BLUE, at: 0, glow: [1, '一轮一轮'] },
      { t: 'card', x: 1160, y: 420, title: '第二招', sub: '买的先喝掉', color: RED, at: [0, 0.3], glow: [1, '买的'] },
      { t: 'card', x: 960, y: 690, title: '下一课 · 第 15 课', sub: '火柴棒游戏', color: ORANGE, at: [2, '下一课'], glow: [2, '火柴'], out: 3 },
      { t: 'tape', x: 960, y: 690, s: '去练习纸上试试吧！', size: 50, at: [3, '练习纸'] }
    ]
  })

  /* 封面 */
  var cv = [
    { t: 'txt', x: 960, y: 140, s: '奥数 · 第 14 课 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
    { t: 'tape', x: 960, y: 300, s: '空瓶换水', size: 150, at: 0 },
    { t: 'txt', x: 960, y: 455, s: '一轮一轮换 · 买的先喝掉', size: 54, color: RED, font: 'kl', at: 0 }
  ]
  ;[[560, 'empty'], [640, 'empty'], [1060, 'bottle']].forEach(function (b) { cv.push(item(b[1], b[0], 660, 150, 0)) })
  cv.push(loop(600, 664, 180, 190, BLUE, 0))
  cv.push({ t: 'harrow', x1: 760, x2: 960, y: 610, color: ORANGE, s: '换', at: 0 })
  cv.push(item('empty', 1260, 660, 150, 0))
  cv.push({ t: 'txt', x: 1400, y: 660, s: '…', size: 90, color: GREY, font: 'kl', at: 0 })
  cv.push({ t: 'txt', x: 960, y: 870, s: '喝完还能换 · 直到不够换为止', size: 54, color: BLUE, font: 'kl', at: 0 })
  S.cover = { tag: null, els: cv }
  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
