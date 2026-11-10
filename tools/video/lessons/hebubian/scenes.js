/* 20 和不变与差不变 · 讲解视频分镜 v1（对标 08；关键动作用 [beat, '关键词'] 对齐配音）
 * 第一招「总数不变」：给来给去，东西只是换了地方，一共还是那么多。
 * 第二招「相差不变」：一起多（或一起少）同样多，你追我也跑，差还是那么多。
 * 引入：哥哥和妹妹一共 10 个苹果，哥哥给妹妹 3 个 —— 一看到「给了」就减，10 − 3 = 7？不对！
 * 第一招：假如 6 个和 4 个，挪 3 个过去 → 3 个和 7 个，3 + 7 = 10。
 * 冲突：哥哥比妹妹多 4 个，两人各买 3 个 —— 总数变了，第一招用不上了！
 * 第二招：7 个和 3 个，多出的 4 个画黄条；各添 3 个 → 10 个和 6 个，多出的还是 4 个，10 − 6 = 4。
 * 小挑战：一共 15 颗糖，小明给小红 5 颗 → 还是 15 颗（9、6 → 4、11）；
 *         哥哥比妹妹多 5 颗，各吃掉 2 颗 → 还是多 5 颗（8、3 → 6、1，一起少）。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b'
  var BAND = 'rgba(232,190,95,0.38)'
  var NTH = ['一', '两', '三', '四', '五']

  function lbl(x, y, s, color, at, o) {
    o = o || {}
    return { t: 'txt', id: o.id, x: x, y: y, s: s, size: o.size || 40, font: o.font || 'kai', color: color || GREY, at: at, out: o.out, anim: o.anim, glow: o.glow, glow2: o.glow2, overlapOk: o.overlapOk }
  }
  function fill(id, at, val) { return { t: 'fill', id: id, at: at, val: val } }
  function item(k, x, y, size, at, o) {
    o = o || {}
    return { t: 'item', k: k, x: x, y: y, size: size, at: at, out: o.out, glow: o.glow, glow2: o.glow2, anim: o.anim, move: o.move, overlapOk: true }
  }
  /* 一排东西：n 个，从 xs(from) 开始；返回元素数组 */
  function row(arr, k, n, xs, y, size, at, o) {
    o = o || {}
    for (var i = 0; i < n; i++) {
      var j = (o.from || 0) + i
      arr.push(item(k, xs(j), y, size, o.stagger ? [at[0], at[1] || 0, (at[2] || 0) + i * o.stagger] : at, {
        out: o.out ? o.out(j) : undefined, glow: o.glow ? o.glow(j) : undefined, move: o.move ? o.move(j) : undefined
      }))
    }
  }
  /* 左边的人：哥哥 kid0，妹妹 kid1，小明 kid2，小红 kid3 */
  function who(arr, k, name, y, color, at) {
    arr.push(item(k, 250, y, 120, at))
    arr.push(lbl(250, y + 82, name, color, at, { font: 'kl', size: 36 }))
  }

  var S = []

  /* 0 开场 */
  var e0 = [
    { t: 'txt', x: 960, y: 230, s: '奥数 · 第 20 课', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
    { t: 'tape', x: 960, y: 360, s: '和不变与差不变', size: 120, at: [0, 0.2] },
    lbl(960, 560, '上一课：几个一份圈一圈', BLUE, [1, '上一课'], { font: 'kl', size: 50, out: [2, 0] }),
    item('kid0', 700, 650, 130, [2, '和不变']),
    item('kid1', 1220, 650, 130, [2, '和不变', 0.15]),
    { t: 'harrow', x1: 800, x2: 1120, y: 620, color: GREEN, s: '给来给去', at: [2, '差不变'] }
  ]
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '上一课，我们学了合理分组：几个一份圈一圈。', say: '上一课，我们学了合理分组：几个一份圈一圈。' },
      { sub: '今天，我们来认识和不变与差不变！', say: '今天，我们来认识，和不变与差不变！' }
    ],
    els: e0
  })

  /* 1 引入：一共 10 个，哥哥给妹妹 3 个 —— 10 − 3 = 7？不对！ */
  var OUT1 = [3, '两招']
  var AX1 = function (i) { return 600 + i * 80 }
  var e1 = [
    lbl(960, 165, '哥哥和妹妹一共有 10 个苹果。', GREY, [0, 0.2], { font: 'kl', size: 46, out: OUT1 }),
    item('kid0', 380, 400, 150, [0, '哥哥'], { out: OUT1 }),
    item('kid1', 1540, 400, 150, [0, '妹妹'], { out: OUT1 }),
    { t: 'harrow', x1: 500, x2: 1420, y: 330, color: GREEN, s: '哥哥给妹妹 3 个', at: [1, '给了'], out: OUT1 },
    lbl(960, 760, '10 − 3 = 7 ？', GREY, [2, '十减三'], { font: 'num', size: 64, out: OUT1 }),
    { t: 'stamp', x: 1330, y: 760, s: '不对！', color: ORANGE, size: 64, rot: -6, at: [2, '不对'], out: OUT1 },
    { t: 'card', x: 760, y: 470, title: '第一招', sub: '总数不变', color: BLUE, at: [3, '两招', 0.3] },
    { t: 'card', x: 1160, y: 470, title: '第二招', sub: '相差不变', color: RED, at: [3, '两招', 0.6] }
  ]
  row(e1, 'apple', 10, AX1, 560, 70, [0, '十个'], { stagger: 0.06, out: function () { return OUT1 } })
  S.push({
    tag: '和不变与差不变',
    beats: [
      { sub: '哥哥和妹妹，一共有 10 个苹果。', say: '哥哥和妹妹，一共有十个苹果。' },
      { sub: '哥哥给了妹妹 3 个，现在两人一共有几个？', say: '哥哥给了妹妹三个，现在两人一共有几个？', rate: '-6%' },
      { sub: '一看到「给了」就减：10 减 3 等于 7？不对！', say: '一看到给了就减：十减三等于七？不对！', pitch: '+8Hz' },
      { sub: '什么变了？什么没变？今天教你两招。', say: '什么变了？什么没变？今天，教你两招。' }
    ],
    els: e1
  })

  /* 2 第一招：给来给去，总数不变（6、4 → 3、7） */
  var AX = function (i) { return 470 + i * 96 }
  var YB = 340, YG = 600
  var e2 = [
    { t: 'big', x: 960, y: 470, title: '第一招', sub: '给来给去，总数不变', color: BLUE, at: 0, out: [1, 0] }
  ]
  who(e2, 'kid0', '哥哥', YB, BLUE, [1, '哥哥'])
  who(e2, 'kid1', '妹妹', YG, RED, [1, '妹妹'])
  row(e2, 'apple', 3, AX, YB, 80, [1, '六个'], { stagger: 0.06 })
  row(e2, 'apple', 4, AX, YG, 80, [1, '四个'], { stagger: 0.06 })
  /* 要挪过去的 3 个：先待在哥哥那排（第 4～6 个），念到「一个、两个、三个」时滑到妹妹那排（第 5～7 个） */
  row(e2, 'apple', 3, AX, YG, 80, [1, '六个', 0.18], {
    from: 4, stagger: 0.06,
    move: function (j) { return [[2, NTH[j - 4] + '个#' + (j === 6 ? 2 : 1)], -96, YB - YG] },
    glow: function (j) { return [2, NTH[j - 4] + '个#' + (j === 6 ? 2 : 1)] }
  })
  e2 = e2.concat([
    lbl(1270, YB, '6 个', BLUE, [1, '六个'], { font: 'kl', size: 44, out: [2, '一个'] }),
    lbl(1270, YB, '3 个', BLUE, [2, '三个#2', 0.5], { font: 'kl', size: 44 }),
    lbl(1270, YG, '4 个', RED, [1, '四个'], { font: 'kl', size: 44, out: [2, '一个'] }),
    lbl(1270, YG, '7 个', RED, [2, '三个#2', 0.5], { font: 'kl', size: 44 }),
    lbl(1640, 330, '一共', GREY, [1, '四个', 0.4], { font: 'kl', size: 44 }),
    { t: 'slot', id: 'q2', x: 1640, y: 450, size: 110, at: [1, '四个', 0.4] },
    fill('q2', [3, '没少'], '10'),
    lbl(800, 790, '3 + 7 = 10', GREEN, [4, '三加七'], { font: 'num', size: 62 }),
    { t: 'check', x: 1760, y: 445, at: [4, '还是', 0.2] },
    { t: 'stamp', x: 1500, y: 800, s: '答：还是 10 个', color: RED, size: 50, rot: -6, at: [4, '总数', 0.4] }
  ])
  S.push({
    tag: '第一招 | 总数不变',
    beats: [
      { sub: '第一招：给来给去，总数不变。', say: '第一招：给来给去，总数不变。' },
      { sub: '假如哥哥有 6 个，妹妹有 4 个。', say: '假如哥哥有六个，妹妹有四个。' },
      { sub: '哥哥给妹妹 3 个：一个、两个、三个。', say: '哥哥给妹妹三个：一个、两个、三个。' },
      { sub: '苹果只是换了地方，一个没多，一个没少！', say: '苹果只是换了地方，一个没多，一个没少！' },
      { sub: '验一验：3 加 7，还是 **10**！总数不变。', say: '验一验：三加七，还是十！总数不变。', pause: 1 }
    ],
    els: e2
  })

  /* 3 冲突：哥哥比妹妹多 4 个，两人各买 3 个 —— 总数变了 */
  var e3 = [
    lbl(960, 165, '哥哥比妹妹多 4 个苹果。两人又各买了 3 个，', GREY, [0, 0.2], { font: 'kl', size: 42 }),
    lbl(960, 235, '现在哥哥比妹妹多几个？', GREY, [1, 0.2], { font: 'kl', size: 42 }),
    item('kid0', 600, 470, 160, [0, '哥哥']),
    item('kid1', 1320, 470, 160, [0, '妹妹']),
    lbl(600, 650, '+ 3 个', GREEN, [1, '各买'], { font: 'kl', size: 52 }),
    lbl(1320, 650, '+ 3 个', GREEN, [1, '各买', 0.2], { font: 'kl', size: 52 }),
    { t: 'stamp', x: 960, y: 760, s: '总数变了！', color: ORANGE, size: 64, rot: -5, at: [2, '总数变了'] }
  ]
  S.push({
    tag: '第一招 | 总数不变',
    beats: [
      { sub: '再来一题：哥哥比妹妹多 4 个苹果。', say: '再来一题：哥哥比妹妹多四个苹果。' },
      { sub: '两人又各买了 3 个，现在哥哥比妹妹多几个？', say: '两人又各买了三个，现在哥哥比妹妹多几个？', rate: '-6%' },
      { sub: '两人都多了，总数变了！第一招用不上了！', say: '两人都多了，总数变了！第一招，用不上了！', pitch: '+8Hz' }
    ],
    els: e3
  })

  /* 4 第二招：一起多，相差不变（7、3 → 10、6，多出的还是 4 个） */
  var BX = function (i) { return 460 + i * 88 }
  var e4 = [
    { t: 'big', x: 960, y: 470, title: '第二招', sub: '一起多一起少，相差不变', color: RED, at: 0, out: [1, 0] },
    { t: 'band', x: (BX(3) + BX(6)) / 2, y: YB, w: 4 * 88 + 6, h: 110, color: BAND, at: [1, '多出'], out: [3, '你追'] },
    lbl((BX(3) + BX(6)) / 2, YB + 86, '多 4 个', RED, [1, '多出'], { font: 'kl', size: 36, out: [3, '你追'] }),
    { t: 'loop', x: BX(8), y: YB, w: 3 * 88 + 6, h: 110, color: GREEN, at: [2, '哥哥多了'], out: [3, '你追'] },
    { t: 'loop', x: BX(4), y: YG, w: 3 * 88 + 6, h: 110, color: GREEN, at: [2, '妹妹也多了'], out: [3, '你追'] },
    { t: 'band', x: (BX(6) + BX(9)) / 2, y: YB, w: 4 * 88 + 6, h: 110, color: BAND, at: [3, '多出来'] },
    lbl((BX(6) + BX(9)) / 2, YB + 86, '还是多 4 个', RED, [3, '还是'], { font: 'kl', size: 36 }),
    lbl(1700, 330, '多几个', GREY, [1, '多出', 0.3], { font: 'kl', size: 40 }),
    { t: 'slot', id: 'q4', x: 1700, y: 450, size: 110, at: [1, '多出', 0.3] }
  ]
  who(e4, 'kid0', '哥哥', YB, BLUE, [1, '哥哥'])
  who(e4, 'kid1', '妹妹', YG, RED, [1, '妹妹'])
  row(e4, 'apple', 7, BX, YB, 74, [1, '七个'], { stagger: 0.05 })
  row(e4, 'apple', 3, BX, YG, 74, [1, '三个'], { stagger: 0.05 })
  row(e4, 'apple', 3, BX, YB, 74, [2, '哥哥多了'], { from: 7, stagger: 0.2 })
  row(e4, 'apple', 3, BX, YG, 74, [2, '妹妹也多了'], { from: 3, stagger: 0.2 })
  e4 = e4.concat([
    fill('q4', [3, '四个'], '4'),
    lbl(760, 790, '10 − 6 = 4', GREEN, [4, '十减六'], { font: 'num', size: 62 }),
    { t: 'check', x: 1820, y: 445, at: [4, '还是', 0.2] },
    { t: 'stamp', x: 1500, y: 800, s: '答：还是多 4 个', color: RED, size: 50, rot: -6, at: [4, '还是', 0.6] }
  ])
  S.push({
    tag: '第二招 | 相差不变',
    beats: [
      { sub: '第二招：一起多一起少，相差不变。', say: '第二招：一起多一起少，相差不变。' },
      { sub: '假如哥哥 7 个、妹妹 3 个，哥哥多出这 4 个。', say: '假如哥哥七个、妹妹三个，哥哥多出这四个。' },
      { sub: '各买 3 个：哥哥多了 3 个，妹妹也多了 3 个。', say: '各买三个：哥哥多了三个，妹妹也多了三个。' },
      { sub: '你追我也跑，多出来的，还是 **4** 个！', say: '你追我也跑，多出来的，还是四个！', pitch: '+5Hz' },
      { sub: '验一验：10 减 6，还是 4！', say: '验一验：十减六，还是四！', pause: 1 }
    ],
    els: e4
  })

  /* 5 口诀（讲解页原文） */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '给来又给去，总数不变心里记；', say: '给来又给去，总数不变心里记；', rate: '-15%' },
      { sub: '一起多一起少，相差不变不用急。', say: '一起多一起少，相差不变不用急。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 480, w: 1500, h: 400, at: 0 },
      { t: 'chant', x: 960, y: 420, s: '给来又给去，总数不变心里记；', color: BLUE, size: 72, at: 1 },
      { t: 'chant', x: 960, y: 570, s: '一起多一起少，相差不变不用急。', color: RED, size: 72, at: 2 }
    ]
  })

  /* 6 小挑战 1：一共 15 颗，小明给小红 5 颗 → 还是 15 颗 */
  var CX = function (i) { return 430 + i * 90 }
  var Y6B = 340, Y6G = 560
  var e6 = [
    lbl(960, 165, '小明和小红一共有 15 颗糖，小明给了小红 5 颗，', GREY, [0, 0.2], { font: 'kl', size: 40 }),
    lbl(960, 230, '现在两人一共有几颗？', GREY, [1, 0.2], { font: 'kl', size: 40 }),
    lbl(1720, 330, '一共', GREY, [1, '几颗'], { font: 'kl', size: 40 }),
    { t: 'slot', id: 'q6', x: 1720, y: 450, size: 110, at: [1, '几颗'] },
    lbl(1720, 560, '颗', GREY, [1, '几颗', 0.2], { font: 'kl', size: 40 }),
    { t: 'think', x: 960, y: 790, at: [2, '想一想', 0.7], from: 5, pulse: 'q6' },
    fill('q6', [3, '十五颗'], '15')
  ]
  who(e6, 'kid2', '小明', Y6B, BLUE, [0, '小明'])
  who(e6, 'kid3', '小红', Y6G, RED, [0, '小红'])
  row(e6, 'candy', 4, CX, Y6B, 86, [4, '九颗'], { stagger: 0.05 })
  row(e6, 'candy', 6, CX, Y6G, 86, [4, '六颗'], { stagger: 0.05 })
  row(e6, 'candy', 5, CX, Y6G, 86, [4, '九颗', 0.2], {
    from: 6, stagger: 0.05,
    move: function () { return [[4, '给完'], -180, Y6B - Y6G] },
    glow: function () { return [4, '给完'] }
  })
  e6 = e6.concat([
    lbl(1300, 700, '4 + 11 = 15', GREEN, [5, '四加'], { font: 'num', size: 58 }),
    { t: 'check', x: 1830, y: 445, at: [5, '正好', 0.2] },
    { t: 'stamp', x: 1500, y: 830, s: '答：还是 15 颗', color: RED, size: 48, rot: -6, at: [5, '正好', 0.6] }
  ])
  S.push({
    tag: '小挑战 | 第 1 题',
    beats: [
      { sub: '小挑战，第一题：小明和小红一共有 15 颗糖，', say: '小挑战，第一题：小明和小红，一共有十五颗糖，' },
      { sub: '小明给了小红 5 颗，现在两人一共有几颗？', say: '小明给了小红五颗，现在两人一共有几颗？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '糖只是换了地方，总数不变：还是 **15** 颗！', say: '糖只是换了地方，总数不变：还是十五颗！' },
      { sub: '假如原来是 9 颗和 6 颗，给完是 4 颗和 11 颗。', say: '假如原来是九颗和六颗，给完是四颗和十一颗。' },
      { sub: '验一验：4 加 11，正好 15！', say: '验一验：四加十一，正好十五！', pause: 1 }
    ],
    els: e6
  })

  /* 7 小挑战 2：哥哥比妹妹多 5 颗，各吃掉 2 颗 → 还是多 5 颗（一起少） */
  var e7 = [
    lbl(960, 165, '哥哥比妹妹多 5 颗糖，两人各吃掉 2 颗，', GREY, [0, 0.2], { font: 'kl', size: 40 }),
    lbl(960, 230, '现在哥哥比妹妹多几颗？', GREY, [1, 0.2], { font: 'kl', size: 40 }),
    lbl(1720, 330, '多几颗', GREY, [1, '几颗'], { font: 'kl', size: 40 }),
    { t: 'slot', id: 'q7', x: 1720, y: 450, size: 110, at: [1, '几颗'] },
    { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q7' },
    fill('q7', [2, '五颗'], '5'),
    { t: 'band', x: (CX(3) + CX(7)) / 2, y: Y6B, w: 5 * 90 + 6, h: 104, color: BAND, at: [3, '八颗', 0.4], out: [3, '吃掉'] },
    { t: 'band', x: (CX(1) + CX(5)) / 2, y: Y6B, w: 5 * 90 + 6, h: 104, color: BAND, at: [4, '六减一'] },
    lbl((CX(1) + CX(5)) / 2, Y6B + 80, '还是多 5 颗', RED, [4, '六减一'], { font: 'kl', size: 34 })
  ]
  who(e7, 'kid0', '哥哥', Y6B, BLUE, [0, '哥哥'])
  who(e7, 'kid1', '妹妹', Y6G, RED, [0, '妹妹'])
  row(e7, 'candy', 8, CX, Y6B, 86, [3, '八颗'], { stagger: 0.05, out: function (j) { return j >= 6 ? [3, '吃掉', (j - 6) * 0.25] : undefined } })
  row(e7, 'candy', 3, CX, Y6G, 86, [3, '三颗'], { stagger: 0.05, out: function (j) { return j >= 1 ? [3, '吃掉', (j - 1) * 0.25] : undefined } })
  e7 = e7.concat([
    lbl(1300, 700, '6 − 1 = 5', GREEN, [4, '六减一'], { font: 'num', size: 58 }),
    { t: 'check', x: 1830, y: 445, at: [4, '正好', 0.2] },
    { t: 'stamp', x: 1500, y: 830, s: '答：还是多 5 颗', color: RED, size: 48, rot: -6, at: [4, '正好', 0.6] }
  ])
  S.push({
    tag: '小挑战 | 第 2 题',
    beats: [
      { sub: '第二题：哥哥比妹妹多 5 颗糖，两人各吃掉 2 颗，', say: '第二题：哥哥比妹妹多五颗糖，两人各吃掉两颗，' },
      { sub: '现在哥哥比妹妹多几颗？这次，用哪一招？', say: '现在哥哥比妹妹多几颗？这次，用哪一招？', rate: '-6%', pause: 5 },
      { sub: '一起少了同样多，相差不变：还是多 **5** 颗！', say: '一起少了同样多，相差不变：还是多五颗！' },
      { sub: '假如哥哥 8 颗、妹妹 3 颗，各吃掉 2 颗，', say: '假如哥哥八颗、妹妹三颗，各吃掉两颗，' },
      { sub: '验一验：6 减 1，正好 5！', say: '验一验：六减一，正好五！', pause: 1 }
    ],
    els: e7
  })

  /* 8 结尾 + 下一课预告 */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天，我们学会了两招：', say: '今天，我们学会了两招：' },
      { sub: '给来给去，总数不变；一起多少，相差不变。', say: '给来给去，总数不变；一起多，一起少，相差不变。' },
      { sub: '下一课，我们来认识「加减法文字谜」！', say: '下一课，我们来认识，加减法文字谜！', pitch: '+4Hz' },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: [
      { t: 'card', x: 760, y: 420, title: '第一招', sub: '总数不变', color: BLUE, at: 0, glow: [1, '总数'] },
      { t: 'card', x: 1160, y: 420, title: '第二招', sub: '相差不变', color: RED, at: [0, 0.3], glow: [1, '相差'] },
      { t: 'card', x: 960, y: 690, title: '下一课 · 第 21 课', sub: '加减法文字谜', color: ORANGE, at: [2, '下一课'], glow: [2, '文字谜'], out: 3 },
      { t: 'tape', x: 960, y: 690, s: '去练习纸上试试吧！', size: 50, at: [3, '练习纸'] }
    ]
  })

  /* 封面 */
  var cv = [
    { t: 'txt', x: 960, y: 140, s: '奥数 · 第 20 课 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
    { t: 'tape', x: 960, y: 290, s: '和不变与差不变', size: 130, at: 0 },
    { t: 'txt', x: 960, y: 440, s: '给来给去，总数不变', size: 58, color: RED, font: 'kl', at: 0 },
    item('kid0', 470, 640, 150, 0),
    item('kid1', 1450, 640, 150, 0),
    { t: 'harrow', x1: 580, x2: 1340, y: 560, color: GREEN, s: '给 3 个', at: 0 },
    { t: 'txt', x: 960, y: 830, s: '6 + 4 = 3 + 7 = 10', size: 60, color: GREEN, font: 'num', at: 0 }
  ]
  for (var c = 0; c < 6; c++) cv.push(item('apple', 720 + c * 96, 690, 80, 0))
  S.cover = { tag: null, els: cv }

  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
