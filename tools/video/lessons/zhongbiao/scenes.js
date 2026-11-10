/* B03 认识钟表：整时和半时 · 讲解视频分镜 v1（L1 补充第三课，新结构，样板 bizhong）
 * 开场接 B02 结尾「下一课，我们来认识钟表」→ 引入（手机 5:00 vs 圆钟）→ 认识钟面（1～12、时针短慢、分针长快：分针转一圈，时针走一格）
 * → 知识地图（给了钟 / 给了时刻 / 空钟面 → 读钟、对一对、画钟）
 * 第一招 读钟：3:00（分针指 12，时针指 3）；5:30（分针指 6，时针在 5 和 6 中间，过了 5）。小心：不是 6 时半。你来试：8:30。
 * 第二招 对一对：哪个是 4:30？① 4:00 ② 3:30 ③ 4:30；小心长短针反过来的钟（长针指 4、短针在 12 和 1 之间 = 12:20）。你来试：哪个是 7 时？① 12:35 ② 7:00 ③ 8:00 → ②。
 * 第三招 画钟：9 时半（先画分针指 6，再画时针在 9 和 10 正中间，写 9:30）。你来试：画 2 时。
 * 挑战：两个钟 5:30 / 6:00（读钟）。口诀 → 知识地图 → 拓展：两针叠在一起的整时是几时？→ 下一课：几时几分。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420'

  function lbl(x, y, s, color, at, o) {
    o = o || {}
    return { t: 'txt', id: o.id, x: x, y: y, s: s, size: o.size || 40, font: o.font || 'kl', color: color || GREY, at: at, out: o.out, anim: o.anim, glow: o.glow, glow2: o.glow2, overlapOk: o.overlapOk, move: o.move }
  }
  function fill(id, at, val) { return { t: 'fill', id: id, at: at, val: val } }
  function svg(x0, y0, w, h, html, at, o) {
    o = o || {}
    return { t: 'svg', x: x0 + w / 2, y: y0 + h / 2, w: w, h: h, html: html, at: at, out: o.out, draw: o.draw, dur: o.dur, glow: o.glow, anim: o.anim }
  }
  function node(cx, cy, w, text, color, at, o) {
    o = o || {}
    var fs = o.size || 42
    var h = fs + 34
    var html = '<rect x="3" y="3" width="' + (w - 6) + '" height="' + (h - 6) + '" rx="14" fill="#fffaf0" stroke="' + color + '" stroke-width="4"/>' +
      '<text x="' + w / 2 + '" y="' + (h / 2 + fs * 0.36) + '" font-family="KL" font-size="' + fs + '" text-anchor="middle" fill="' + INK + '">' + text + '</text>'
    return svg(cx - w / 2, cy - h / 2, w, h, html, at, { out: o.out, glow: o.glow, anim: 'pop' })
  }
  function flowArrow(x, y1, y2, at, o) {
    return { t: 'varrow', x: x, y1: y1, y2: y2, color: GREY, at: at, out: (o || {}).out }
  }
  function line2(x1, y1, x2, y2, at, o) {
    return { t: 'seg', x1: x1, y1: y1, x2: x2, y2: y2, color: GREY, sw: 5, at: at, out: (o || {}).out }
  }
  /* 钟：time [时, 分]；o.turn / mAt / hAt / glowNums 见 render.html 的 clock */
  function clock(x, y, size, time, at, o) {
    o = o || {}
    return { t: 'clock', id: o.id, x: x, y: y, size: size, time: time, turn: o.turn, mAt: o.mAt, hAt: o.hAt, glowNums: o.glowNums,
      at: at, out: o.out, glow: o.glow, glow2: o.glow2, dim: o.dim, overlapOk: o.overlapOk }
  }
  /* 电子钟（手机上那种）：深色屏、亮字 */
  function digi(x, y, s, at, o) {
    o = o || {}
    var w = o.w || 260, h = o.h || 120
    var html = '<rect x="4" y="4" width="' + (w - 8) + '" height="' + (h - 8) + '" rx="18" fill="#3a332d" stroke="' + INK + '" stroke-width="5"/>' +
      '<text x="' + w / 2 + '" y="' + (h / 2 + h * 0.2) + '" font-family="Num" font-weight="700" font-size="' + h * 0.56 + '" text-anchor="middle" fill="#ffe08a">' + s + '</text>'
    return svg(x - w / 2, y - h / 2, w, h, html, at, { out: o.out, glow: o.glow, anim: 'pop' })
  }
  /* 手机：屏幕里写着时间 */
  function phone(x, y, s, at, o) {
    var html = '<rect x="6" y="6" width="208" height="368" rx="34" fill="#fbf8f1" stroke="' + INK + '" stroke-width="7"/>' +
      '<rect x="26" y="52" width="168" height="270" rx="10" fill="#3a332d"/>' +
      '<circle cx="110" cy="346" r="12" fill="none" stroke="' + INK + '" stroke-width="5"/>' +
      '<text x="110" y="208" font-family="Num" font-weight="700" font-size="66" text-anchor="middle" fill="#ffe08a">' + s + '</text>'
    return svg(x - 110, y - 190, 220, 380, html, at, o)
  }
  /* 划掉：红色大叉 */
  function cross(x, y, at, o) {
    var html = '<path class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M14 14 L126 126 M126 14 L14 126" fill="none" stroke="' + RED + '" stroke-width="12" stroke-linecap="round"/>'
    return svg(x - 70, y - 70, 140, 140, html, at, { draw: true, dur: 0.5, out: (o || {}).out })
  }
  function circ(i) { return ['①', '②', '③', '④'][i] }

  var S = []

  /* 0 开场：接 B02 结尾 */
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '上一课的最后，我们说：下一课认识钟表。', say: '上一课的最后，我们说：下一课，来认识钟表。' },
      { sub: '今天就来认识钟表：整时和半时！', say: '今天，我们就来认识钟表：整时和半时！' }
    ],
    els: [
      { t: 'txt', x: 960, y: 230, s: '奥数 · L1 补充 · B03', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
      { t: 'tape', x: 960, y: 370, s: '认识钟表：整时和半时', size: 104, at: [0, 0.2] },
      lbl(960, 520, '上一课：推理比较：比轻重', BLUE, [1, '上一课'], { size: 48, out: [2, 0] }),
      clock(960, 690, 300, [10, 10], [2, '认识钟表'], { turn: [[[2, '整时'], 12, 0], [[2, '半时'], 12, 30]] })
    ]
  })

  /* 1 引入：手机 5:00 vs 圆钟 */
  var OUT1 = undefined
  S.push({
    tag: '认识钟表',
    beats: [
      { sub: '手机上写着 5:00，一看就知道是 5 时。', say: '手机上写着五点，一看就知道，是五时。' },
      { sub: '墙上的圆钟没写字，你看得出它也是 5 时吗？', say: '墙上的圆钟没写字，你看得出，它也是五时吗？', rate: '-4%', pause: 0.6 },
      { sub: '圆钟靠两根针说话。先来认识钟面！', say: '圆钟，是靠两根针说话的。我们先来认识钟面！' }
    ],
    els: [
      phone(560, 500, '5:00', [0, '手机'], { out: OUT1 }),
      lbl(560, 760, '5 时', BLUE, [0, '五时'], { size: 56, out: OUT1 }),
      clock(1300, 480, 420, [5, 0], [1, '圆钟'], { out: OUT1 }),
      lbl(1300, 760, '？', RED, [1, '看得出'], { size: 90, out: [2, 0] }),
      lbl(1300, 760, '两根针', RED, [2, '两根针'], { size: 56, out: OUT1 })
    ]
  })

  /* 2 认识钟面：1～12、时针、分针；分针转一圈，时针走一格 */
  var nums = []
  for (var k = 1; k <= 12; k++) nums.push([[0, '顺着一圈', (k - 1) * 0.22], k, 0.5])
  S.push({
    tag: '认识钟表 | 钟面',
    beats: [
      { sub: '钟面上有 1 到 12，十二个数，顺着一圈排。', say: '钟面上，有一到十二，十二个数，顺着一圈排。' },
      { sub: '短短粗粗的，是时针。', say: '短短的、粗粗的，是时针。' },
      { sub: '长长细细的，是分针。', say: '长长的、细细的，是分针。' },
      { sub: '分针走得快：它转一整圈，', say: '分针走得快：它转一整圈，' },
      { sub: '时针才慢慢走一格。', say: '时针，才慢慢地走一格。', pause: 0.3 }
    ],
    els: [
      clock(700, 490, 520, [12, 0], [0, 0.2], { glowNums: nums, turn: [[[3, '一整圈'], 1, 0, 3.4]] }),
      lbl(1300, 330, '时针：短、粗、慢', RED, [1, '时针'], { size: 54, glow: [4, '慢慢'] }),
      lbl(1300, 470, '分针：长、细、快', BLUE, [2, '分针'], { size: 54, glow: [3, '走得快'] }),
      lbl(1300, 650, '分针转一圈', BLUE, [3, '一整圈'], { size: 46 }),
      lbl(1300, 730, '时针走一格', RED, [4, '走一格'], { size: 46 })
    ]
  })

  /* 3 知识地图 */
  function mapEls(at, lit) {
    return [
      node(960, 210, 340, '认识钟表', INK, at, { size: 50 }),
      line2(960, 252, 420, 360, lit ? at : [0, '给了钟']),
      line2(960, 252, 960, 360, lit ? at : [0, '给了时刻']),
      line2(960, 252, 1500, 360, lit ? at : [0, '空钟面']),
      node(420, 405, 420, '给了钟，问时刻', BLUE, lit ? at : [0, '给了钟'], { size: 44 }),
      node(960, 405, 420, '给了时刻，找钟', RED, lit ? at : [0, '给了时刻'], { size: 44 }),
      node(1500, 405, 420, '给了空钟面', GREEN, lit ? at : [0, '空钟面'], { size: 44 }),
      flowArrow(420, 452, 540, lit ? at : [1, '第一招']),
      flowArrow(960, 452, 540, lit ? at : [1, '第二招']),
      flowArrow(1500, 452, 540, lit ? at : [1, '第三招']),
      node(420, 595, 300, '① 读钟', BLUE, lit ? at : [1, '第一招'], { size: 48, glow: lit ? [0, '读钟'] : undefined }),
      node(960, 595, 300, '② 对一对', RED, lit ? at : [1, '第二招'], { size: 48, glow: lit ? [0, '对一对'] : undefined }),
      node(1500, 595, 300, '③ 画钟', GREEN, lit ? at : [1, '第三招'], { size: 48, glow: lit ? [0, '画钟'] : undefined })
    ]
  }
  S.push({
    tag: '认识钟表 | 三种题',
    beats: [
      { sub: '钟表的题有三种：', say: '钟表的题有三种：给了钟问时刻，给了时刻找钟，给了空钟面。' },
      { sub: '每种一招，我们一招一招来学！', say: '每种一招：第一招、第二招、第三招，一招一招来学！' }
    ],
    els: mapEls(0, false)
  })

  /* 4 第一招：读钟（3:00 → 5:30） */
  var OUT4a = [3, 0]
  var e4 = [
    lbl(470, 165, '第一招：读钟', BLUE, [0, 0], { size: 46 }),
    clock(560, 510, 440, [3, 0], [0, '分针'], { turn: [[[3, 0.3], 5, 30]], glow: [1, '指着十二'] }),
    lbl(560, 790, '3 时', BLUE, [2, '三时'], { size: 54, out: OUT4a }),
    digi(800, 790, '3:00', [2, '写作'], { out: OUT4a }),
    lbl(560, 790, '5 时半', RED, [5, '五时半'], { size: 54 }),
    digi(810, 790, '5:30', [5, '写作'], { w: 240 }),
    { t: 'stamp', x: 900, y: 300, s: '不是 6 时半！', color: ORANGE, size: 50, rot: -5, at: [6, '小心'] },
    /* 判断小流程 */
    node(1450, 230, 360, '分针指着几？', INK, [0, '分针']),
    line2(1390, 270, 1290, 340, [1, '指着十二']),
    line2(1510, 270, 1610, 340, [3, '指着六']),
    node(1270, 385, 300, '指 12：整时', BLUE, [1, '指着十二'], { size: 40 }),
    node(1630, 385, 300, '指 6：半时', RED, [3, '指着六'], { size: 40 }),
    flowArrow(1270, 427, 505, [2, '时针']),
    flowArrow(1630, 427, 505, [4, '时针']),
    node(1270, 550, 330, '时针指几：几时', BLUE, [2, '时针'], { size: 38 }),
    node(1630, 550, 360, '时针过几：几时半', RED, [4, '时针'], { size: 38, glow: [6, '还没到'] }),
    node(1270, 700, 260, '写成 几:00', BLUE, [2, '写作'], { size: 38 }),
    node(1630, 700, 260, '写成 几:30', RED, [5, '写作'], { size: 38 })
  ]
  S.push({
    tag: '第一招 | 读钟',
    beats: [
      { sub: '第一招：读钟。先看长长的分针，指着几？', say: '第一招：读钟。先看长长的分针，指着几？' },
      { sub: '分针指着 12，是整时。', say: '分针指着十二，是整时。' },
      { sub: '时针指着 3，就是 3 时，写作 3:00。', say: '短短的时针指着三，就是三时，写作三点零零。' },
      { sub: '换一个：分针指着 6，是半时。', say: '换一个：分针指着六，是半时。' },
      { sub: '时针在 5 和 6 中间，过了 5。', say: '时针在五和六的中间，刚过了五。' },
      { sub: '所以是 5 时半，写作 5:30。', say: '所以是五时半，写作五点三十。', pause: 0.3 },
      { sub: '小心！时针还没到 6，不是 6 时半！', say: '小心！时针还没到六，不是六时半！', pause: 1 }
    ],
    els: e4
  })

  /* 5 你来试 1：8:30 */
  S.push({
    tag: '第一招 | 你来试',
    beats: [
      { sub: '你来试：这个钟是什么时刻？', say: '你来试：这个钟，是什么时刻？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '分针指 6，时针刚过 8：8 时半，写作 **8:30**！', say: '分针指着六，时针刚过八：八时半，写作八点三十！', pause: 1 }
    ],
    els: [
      lbl(960, 165, '你来试：是什么时刻？', GREY, [0, 0.2], { size: 46 }),
      clock(600, 500, 440, [8, 30], [0, 0.3], { glow: [2, '分针'], glow2: [2, '时针'] }),
      { t: 'slot', id: 'q5', x: 1400, y: 470, size: 220, at: [0, 0.6] },
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q5' },
      fill('q5', [2, '八时半'], '<span style="font-size:52%">8:30</span>'),
      { t: 'stamp', x: 1450, y: 790, s: '答：8:30', color: RED, size: 54, rot: -6, at: [2, '八点三十', 0.3] }
    ]
  })

  /* 6 冲突 + 第二招：对一对（哪个是 4:30？① 4:00 ② 3:30 ③ 4:30；再看反过来的钟 12:20） */
  var CX = [300, 690, 1080]
  var OUT6 = [5, 0]
  var e6 = [
    lbl(960, 165, '哪个钟是 4:30？', GREY, [0, 0.2], { size: 50, out: [1, '第二招'] }),
    lbl(470, 165, '第二招：对一对', RED, [1, '第二招'], { size: 46 }),
    clock(CX[0], 470, 300, [4, 0], [0, 0.4], { dim: [2, '划掉'], out: OUT6 }),
    clock(CX[1], 470, 300, [3, 30], [0, 0.5], { dim: [3, '划掉'], out: OUT6 }),
    clock(CX[2], 470, 300, [4, 30], [0, 0.6], { glow: [4, '就是它'], out: OUT6 }),
    cross(CX[0], 470, [2, '划掉'], { out: OUT6 }),
    cross(CX[1], 470, [3, '划掉'], { out: OUT6 }),
    { t: 'check', x: CX[2] + 195, y: 300, at: [4, '就是它'], out: OUT6 },
    lbl(690, 700, '答：③', RED, [4, '三号'], { size: 54, out: OUT6 }),
    /* 反过来的钟 */
    clock(500, 500, 400, [12, 20], [5, 0.2], { glow: [5, '长针'] }),
    lbl(500, 780, '长针是分针：12:20', RED, [6, '分针'], { size: 46 }),
    { t: 'stamp', x: 920, y: 300, s: '不是 4 时！', color: RED, size: 50, rot: -6, at: [6, '不是'] },
    /* 判断小流程 */
    node(1520, 250, 380, '分针对不对？', INK, [1, '先看分针']),
    flowArrow(1520, 292, 360, [2, '划掉']),
    node(1520, 405, 340, '不对：划掉', RED, [2, '划掉']),
    flowArrow(1520, 447, 515, [3, '时针']),
    node(1520, 560, 380, '再看时针过几', RED, [3, '时针']),
    node(1520, 720, 380, '先认针！长的是分针', RED, [6, '先认针'], { size: 36 })
  ]
  CX.forEach(function (x, i) { e6.push(lbl(x - 120, 300, circ(i), INK, [0, 0.4 + i * 0.1], { font: 'kai', size: 46, out: OUT6 })) })
  S.push({
    tag: '第二招 | 对一对',
    beats: [
      { sub: '反过来：哪个钟是 4:30？', say: '反过来：哪个钟，是四点三十？', rate: '-6%' },
      { sub: '第二招：对一对。半时，分针该指着 6。', say: '第二招：对一对。先看分针：半时，分针该指着六。' },
      { sub: '① 的分针指着 12，划掉！', say: '一号钟，分针指着十二，划掉！' },
      { sub: '② 的时针过了 3，是 3:30，划掉！', say: '二号钟，时针过了三，是三点三十，也划掉！' },
      { sub: '③ 的时针过了 4：就是它！', say: '三号钟，时针过了四：就是它！', pause: 0.6 },
      { sub: '小心这种钟：长针指着 4，短针在 12 旁边。', say: '小心这种钟：长针指着四，短针在十二旁边。', rate: '-6%' },
      { sub: '长的是分针！它是 12:20，不是 4 时！先认针！', say: '长的是分针！它是十二点二十，不是四时！先认针！', pause: 1 }
    ],
    els: e6
  })

  /* 7 你来试 2：哪个是 7 时？① 12:35 ② 7:00 ③ 8:00 → ② */
  var CX7 = [420, 840, 1260]
  var e7 = [
    lbl(960, 165, '你来试：哪个钟是 7 时？', GREY, [0, 0.2], { size: 46 }),
    clock(CX7[0], 480, 320, [12, 35], [0, 0.3], { dim: [2, '划掉'] }),
    clock(CX7[1], 480, 320, [7, 0], [0, 0.4], { glow: [3, '二号'] }),
    clock(CX7[2], 480, 320, [8, 0], [0, 0.5], { dim: [3, '八'] }),
    cross(CX7[0], 480, [2, '划掉']),
    cross(CX7[2], 480, [3, '八']),
    { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5 },
    { t: 'check', x: CX7[1] + 205, y: 300, at: [3, '二号', 0.3] },
    { t: 'stamp', x: 1550, y: 790, s: '答：②', color: RED, size: 56, rot: -6, at: [3, '二号', 0.5] }
  ]
  CX7.forEach(function (x, i) { e7.push(lbl(x - 125, 300, circ(i), INK, [0, 0.3 + i * 0.1], { font: 'kai', size: 46 })) })
  S.push({
    tag: '第二招 | 你来试',
    beats: [
      { sub: '你来试：哪个钟是 7 时？', say: '你来试：哪个钟，是七时？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '7 时，分针指 12：① 长短针反了，划掉。', say: '七时，分针指着十二。一号钟长短针反了，划掉。' },
      { sub: '③ 时针指着 8；② 时针指着 7：答案是 ②！', say: '三号时针指着八；二号指着七：答案是二号！', pause: 1 }
    ],
    els: e7
  })

  /* 8 冲突 + 第三招：画钟（9 时半） */
  var e8 = [
    lbl(470, 165, '第三招：画钟', GREEN, [1, '第三招'], { size: 46 }),
    lbl(600, 165, '画出 9 时半', GREY, [0, 0.2], { size: 50, out: [1, '第三招'] }),
    clock(600, 510, 460, [9, 30], [0, 0.3], { mAt: [2, '先画分针', 0.3], hAt: [3, '再画时针', 0.3] }),
    { t: 'stamp', x: 1040, y: 290, s: '一根针也没有！', color: ORANGE, size: 50, rot: -5, at: [0, '没有'], out: [1, '第三招'] },
    lbl(600, 820, '9:30', RED, [4, '写一写'], { size: 66, font: 'num' }),
    /* 判断小流程 */
    node(1450, 250, 440, '① 先画分针：长、细', BLUE, [2, '先画分针'], { size: 40 }),
    lbl(1450, 330, '整时指 12，半时指 6', BLUE, [2, '指着六'], { size: 36 }),
    flowArrow(1450, 360, 420, [3, '再画时针']),
    node(1450, 465, 440, '② 再画时针：短、粗', RED, [3, '再画时针'], { size: 40 }),
    lbl(1450, 545, '半时：两个数正中间', RED, [3, '正中间'], { size: 36, glow: [5, '别正对'] }),
    flowArrow(1450, 575, 635, [4, '写一写']),
    node(1450, 680, 440, '③ 写：几:00、几:30', GREEN, [4, '写一写'], { size: 40 }),
    lbl(1000, 760, '时针要比分针短！', RED, [5, '时针要'], { size: 40 })
  ]
  S.push({
    tag: '第三招 | 画钟',
    beats: [
      { sub: '这回，钟面上一根针都没有！要画出 9 时半。', say: '这回，钟面上一根针都没有！画出九时半。', rate: '-6%' },
      { sub: '第三招：画钟。', say: '第三招：画钟。' },
      { sub: '先画分针：长长细细的，半时指着 6。', say: '先画分针：长长的、细细的，半时就指着六。' },
      { sub: '再画时针：短短粗粗，画在 9 和 10 正中间。', say: '再画时针：短短的、粗粗的，画在九和十的正中间。' },
      { sub: '最后写一写：9:30。', say: '最后写一写：九点三十。', pause: 0.3 },
      { sub: '小心！时针要比分针短；半时的时针，别正对着数。', say: '小心！时针要画得比分针短；半时的时针，别正对着数。', pause: 1 }
    ],
    els: e8
  })

  /* 9 你来试 3：画 2 时 */
  S.push({
    tag: '第三招 | 你来试',
    beats: [
      { sub: '你来试：在钟面上画出 2 时。', say: '你来试：在钟面上，画出两时。', rate: '-6%' },
      { sub: '想一想，先画哪根针？', say: '想一想，先画哪根针？', pause: 5 },
      { sub: '分针指 12，时针正对 2，写作 **2:00**！', say: '长长的分针指着十二，短短的时针正对着二，写作两点零零！', pause: 1 }
    ],
    els: [
      lbl(960, 165, '你来试：画出 2 时', GREY, [0, 0.2], { size: 46 }),
      clock(640, 470, 420, [2, 0], [0, 0.3], { mAt: [2, '分针', 0.2], hAt: [2, '时针', 0.2] }),
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5 },
      lbl(1400, 500, '2:00', RED, [2, '写作'], { size: 90, font: 'num' }),
      { t: 'stamp', x: 1600, y: 790, s: '画对了！', color: RED, size: 50, rot: -6, at: [2, '写作', 0.6] }
    ]
  })

  /* 10 挑战：两个钟 5:30 / 6:00（读钟） */
  S.push({
    tag: '挑战 | 这次用哪一招？',
    beats: [
      { sub: '挑战题：这两个钟，各是什么时刻？', say: '挑战题：这两个钟，各是什么时刻？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', rate: '-6%', pause: 5 },
      { sub: '给了钟问时刻，用第一招：读钟。', say: '给了钟问时刻，用第一招：读钟。' },
      { sub: '① 分针指 6，时针过了 5：**5:30**；', say: '一号，分针指着六，时针过了五：五点三十；' },
      { sub: '② 分针指 12，时针指着 6：**6:00**！', say: '二号，分针指着十二，时针指着六：六点零零！', pause: 1 }
    ],
    els: [
      lbl(960, 165, '挑战：两个钟各是什么时刻？', GREY, [0, 0.2], { size: 46 }),
      lbl(235, 290, '①', INK, [0, 0.3], { font: 'kai', size: 50 }),
      lbl(895, 290, '②', INK, [0, 0.4], { font: 'kai', size: 50 }),
      clock(420, 410, 300, [5, 30], [0, 0.3], { glow: [3, '一号'] }),
      clock(1080, 410, 300, [6, 0], [0, 0.4], { glow: [4, '二号'] }),
      { t: 'slot', id: 'q10a', x: 420, y: 640, size: 150, at: [0, 0.6] },
      { t: 'slot', id: 'q10b', x: 1080, y: 640, size: 150, at: [0, 0.7] },
      { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q10a' },
      lbl(1600, 420, '第一招：读钟', BLUE, [2, '第一招'], { size: 44 }),
      fill('q10a', [3, '五点三十'], '<span style="font-size:72%">5:30</span>'),
      fill('q10b', [4, '六点零零'], '<span style="font-size:72%">6:00</span>'),
      { t: 'stamp', x: 1560, y: 790, s: '时针过几就是几！', color: RED, size: 44, rot: -6, at: [4, '六点零零', 0.4] }
    ]
  })

  /* 11 口诀（讲解页原文） */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '短的时针长的分，', say: '短的时针，长的分，', rate: '-15%' },
      { sub: '分针指 12 是整时，分针指 6 是半时；', say: '分针指十二是整时，分针指六是半时；', rate: '-15%' },
      { sub: '时针过几就几时，写成几:00、几:30。', say: '时针过几就几时，写成几点零零、几点三十。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 470, w: 1500, h: 480, at: 0 },
      { t: 'chant', x: 960, y: 330, s: '短的时针长的分，', color: INK, size: 62, at: 1 },
      { t: 'chant', x: 960, y: 470, s: '分针指 12 是整时，分针指 6 是半时；', color: BLUE, size: 62, at: 2 },
      { t: 'chant', x: 960, y: 610, s: '时针过几就几时，写成几:00、几:30。', color: RED, size: 62, at: 3 }
    ]
  })

  /* 12 结尾：知识地图 + 拓展想一想（两针叠在一起的整时）+ 下一课 */
  var e12 = mapEls(0, true).concat([
    clock(960, 780, 200, null, [1, '叠在一起'], { out: [2, '下一课'] }),
    lbl(1260, 790, '？', RED, [1, '几时'], { size: 90, out: [2, '下一课'] }),
    { t: 'card', x: 960, y: 790, title: '下一课', sub: '几时几分', color: ORANGE, at: [2, '下一课'], out: 3 },
    { t: 'tape', x: 960, y: 790, s: '去练习纸上试试吧！', size: 50, at: [3, '练习纸'] }
  ])
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天学会了三招：读钟，对一对，画钟。', say: '今天，我们学会了三招：读钟，对一对，画钟。' },
      { sub: '想一想：整时，时针和分针叠在一起，是几时？', say: '想一想：整时的时候，时针和分针叠在一起，是几时？', rate: '-6%', pause: 1 },
      { sub: '下一课，我们来认识几时几分！', say: '下一课，我们来认识，几时几分！', pitch: '+4Hz' },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: e12
  })

  /* 讲完一招点亮知识地图的一枝 */
  function mapScene(n) {
    var e = mapEls(0, true)
    var moves = e.slice(-3)
    var sits = e.slice(4, 7)
    var XS = [[420, 300], [960, 300], [1500, 300]]
    moves.forEach(function (m, k) {
      m.glow = undefined
      if (k === n - 1) { m.at = [0, '学会']; m.glow = [0, '学会', 0.3] }
      if (k >= n) { m.dim = 0; sits[k].dim = 0 }
    })
    for (var k = 0; k < n; k++) e.push({ t: 'check', x: XS[k][0] + XS[k][1] / 2 + 46, y: 590, at: k === n - 1 ? [0, '学会', 0.3] : 0, sfx: k === n - 1 ? undefined : false })
    var say = ['第一招学会了！还有两招。', '第二招也学会了！还剩最后一招。', '三招都学会了！来个挑战！'][n - 1]
    return { tag: '认识钟表 | 学到哪了', beats: [{ sub: say, say: say, pitch: '+5Hz', pause: 0.4 }], els: e }
  }
  S.splice(10, 0, mapScene(3))
  S.splice(8, 0, mapScene(2))
  S.splice(6, 0, mapScene(1))

  /* 封面 */
  S.cover = {
    tag: null,
    els: [
      { t: 'txt', x: 960, y: 130, s: '奥数 · L1 补充 · B03 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
      { t: 'tape', x: 960, y: 270, s: '认识钟表：整时和半时', size: 110, at: 0 },
      { t: 'txt', x: 960, y: 410, s: '短的时针长的分', size: 58, color: RED, font: 'kl', at: 0 },
      clock(700, 660, 360, [3, 0], 0),
      clock(1220, 660, 360, [5, 30], 0),
      { t: 'txt', x: 960, y: 900, s: '读钟 · 对一对 · 画钟', size: 50, color: GREEN, font: 'kl', at: 0 }
    ]
  }

  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
