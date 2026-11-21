/* B06 镜子里的对称 · 讲解视频分镜 v1（L1 补充第六课，新结构，两招）
 * 开场直接进题（不提上一课、结尾不预告）。
 * 引入：举右手照镜子，镜子里举的是左手 → 镜子里和镜子外成轴对称，镜面是对称轴：上下不变、左右相反。
 * 知识地图：镜子里的钟 / 镜子里的数 → 左右翻、倒着读翻回来。
 * 第一招：镜子里看到「3:30」→ 12 到 6 画竖线 → 整个钟左右翻 → 8:30；验一验 3:30 + 8:30 = 12 时。小心：指着 12、6 的针不动（镜子里 9 时 → 3 时）。你来试：镜子里 1:30 → 10:30。
 * 第二招：镜子里一串数 → 顺序倒了、每个也翻了面 → 整个翻过去 → 810076；小心：水里的倒影是上下翻。你来试：号码 253，镜子里是哪个（② 倒序 + 翻面）。
 * 挑战：镜子里的钟 7:50 → 4:10（用第一招）。口诀 → 知识地图 → 拓展：镜子里的电子表 10:10，再过 10 分镜子里是几点？→ 去练习纸。
 * 镜像都用引擎的 fold：元素一出场就翻成镜子里的样子，讲到「翻过去」时再翻回来。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420'

  function lbl(x, y, s, color, at, o) {
    o = o || {}
    return { t: 'txt', id: o.id, x: x, y: y, s: s, size: o.size || 40, font: o.font || 'kl', color: color || GREY, at: at, out: o.out, anim: o.anim, glow: o.glow, glow2: o.glow2, overlapOk: o.overlapOk }
  }
  function fill(id, at, val) { return { t: 'fill', id: id, at: at, val: val } }
  function svg(x0, y0, w, h, html, at, o) {
    o = o || {}
    return { t: 'svg', id: o.id, x: x0 + w / 2, y: y0 + h / 2, w: w, h: h, html: html, at: at, out: o.out, draw: o.draw, dur: o.dur, glow: o.glow, glow2: o.glow2, anim: o.anim, fold: o.fold, dim: o.dim, overlapOk: o.overlapOk }
  }
  function node(cx, cy, w, text, color, at, o) {
    o = o || {}
    var fs = o.size || 42
    var h = fs + 34
    var html = '<rect x="3" y="3" width="' + (w - 6) + '" height="' + (h - 6) + '" rx="14" fill="#fffaf0" stroke="' + color + '" stroke-width="4"/>' +
      '<text x="' + w / 2 + '" y="' + (h / 2 + fs * 0.36) + '" font-family="KL" font-size="' + fs + '" text-anchor="middle" fill="' + INK + '">' + text + '</text>'
    return svg(cx - w / 2, cy - h / 2, w, h, html, at, { out: o.out, glow: o.glow, anim: 'pop', dim: o.dim })
  }
  function flowArrow(x, y1, y2, at, o) {
    return { t: 'varrow', x: x, y1: y1, y2: y2, color: GREY, at: at, out: (o || {}).out }
  }
  function line2(x1, y1, x2, y2, at, o) {
    return { t: 'seg', x1: x1, y1: y1, x2: x2, y2: y2, color: GREY, sw: 5, at: at, out: (o || {}).out }
  }
  function cross(x, y, at, o) {
    var html = '<path class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M14 14 L126 126 M126 14 L14 126" fill="none" stroke="' + RED + '" stroke-width="12" stroke-linecap="round"/>'
    return svg(x - 70, y - 70, 140, 140, html, at, { draw: true, dur: 0.5, out: (o || {}).out })
  }
  function dashV(x, y1, y2, at, o) {
    var html = '<line x1="6" y1="0" x2="6" y2="' + (y2 - y1) + '" stroke="' + RED + '" stroke-width="6" stroke-dasharray="18 12"/>'
    return svg(x - 6, y1, 12, y2 - y1, html, at, o)
  }
  /* 镜子：一条竖着的粗线 + 斜纹 */
  function mirror(x, y1, y2, at, o) {
    var p = ['<line x1="8" y1="0" x2="8" y2="' + (y2 - y1) + '" stroke="#7aa7c7" stroke-width="10"/>']
    for (var y = 20; y < y2 - y1; y += 34) p.push('<line x1="13" y1="' + y + '" x2="30" y2="' + (y - 18) + '" stroke="#7aa7c7" stroke-width="3"/>')
    return svg(x - 8, y1, 34, y2 - y1, p.join(''), at, o)
  }
  /* 钟：mir 为真时一出场就是镜子里的样子（左右翻），flipBack 锚点时翻回来 */
  function clock(x, y, size, time, at, o) {
    o = o || {}
    var fold
    if (o.mir) fold = [[0, 'x', size / 2, size / 2, 0.01]].concat(o.flipBack ? [[o.flipBack, 'x', size / 2, size / 2, 1.4]] : [])
    return { t: 'clock', id: o.id, x: x, y: y, size: size, time: time, nums: o.nums, at: at, out: o.out, glow: o.glow, glow2: o.glow2, fold: fold, overlapOk: o.overlapOk }
  }

  /* ---------- 七段数字 ---------- */
  var SEG = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg']
  function segRects(s, x0, y0, w, h, t, color) {
    var hh = h / 2
    var R = {
      a: [x0 + t, y0, w - 2 * t, t], d: [x0 + t, y0 + h - t, w - 2 * t, t], g: [x0 + t, y0 + hh - t / 2, w - 2 * t, t],
      f: [x0, y0 + t, t, hh - 1.5 * t], b: [x0 + w - t, y0 + t, t, hh - 1.5 * t],
      e: [x0, y0 + hh + t / 2, t, hh - 1.5 * t], c: [x0 + w - t, y0 + hh + t / 2, t, hh - 1.5 * t]
    }
    return s.split('').map(function (k) { var r = R[k]; return '<rect x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] + '" rx="' + t / 3 + '" fill="' + color + '"/>' }).join('')
  }
  /* 一块电子屏：真实的数 str；how = 'mirror' 一出场左右翻，'water' 上下翻；back 锚点翻回来 */
  function screen(cx, cy, str, scale, at, o) {
    o = o || {}
    var DW = 60 * scale, DH = 104 * scale, DT = 13 * scale, DG = 26 * scale, pad = 24 * scale
    var W = str.length * DW + (str.length - 1) * DG + pad * 2, H = DH + pad * 2
    var p = o.bare ? [] : ['<rect x="4" y="4" width="' + (W - 8) + '" height="' + (H - 8) + '" rx="' + 18 * scale + '" fill="#3a332d" stroke="' + INK + '" stroke-width="5"/>']
    str.split('').forEach(function (dg, i) { p.push(segRects(SEG[+dg], pad + i * (DW + DG), pad, DW, DH, DT, o.color || '#ffe08a')) })
    var fold
    if (o.how) {
      var ax = o.how === 'water' ? 'y' : 'x'
      fold = [[0, ax, W / 2, H / 2, 0.01]].concat(o.back ? [[o.back, ax, W / 2, H / 2, 1.4]] : [])
    }
    return svg(cx - W / 2, cy - H / 2, W, H, p.join(''), at, { out: o.out, glow: o.glow, glow2: o.glow2, fold: fold, anim: o.anim })
  }

  /* ---------- 小人（举右手） ---------- */
  function kidSVG() {
    var st = 'stroke="' + INK + '" stroke-width="10" stroke-linecap="round" fill="none"'
    /* 面向我们：他的右手在画面左边 */
    return '<circle cx="110" cy="70" r="42" fill="#f6d5b8" stroke="' + INK + '" stroke-width="8"/>' +
      '<circle cx="96" cy="66" r="5" fill="' + INK + '"/><circle cx="124" cy="66" r="5" fill="' + INK + '"/>' +
      '<path d="M96 88 Q110 98 124 88" ' + st.replace('10', '6') + '/>' +
      '<path d="M70 130 L150 130 L160 250 L60 250 Z" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="8" stroke-linejoin="round"/>' +
      '<line x1="72" y1="140" x2="30" y2="40" ' + st + '/><circle cx="28" cy="34" r="12" fill="#f6d5b8" stroke="' + INK + '" stroke-width="6"/>' +
      '<line x1="148" y1="140" x2="182" y2="220" ' + st + '/>' +
      '<line x1="90" y1="250" x2="86" y2="330" ' + st + '/><line x1="130" y1="250" x2="134" y2="330" ' + st + '/>'
  }

  var S = []

  /* ---------- 0 开场 ---------- */
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '今天，我们来认识镜子里的对称！', say: '今天，我们来认识镜子里的对称！' }
    ],
    els: [
      { t: 'txt', x: 960, y: 200, s: '奥数 · L1 补充 · B06', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
      { t: 'tape', x: 960, y: 330, s: '镜子里的对称', size: 110, at: [0, 0.2] },
      screen(700, 650, '27', 1, [1, '认识']),
      mirror(960, 520, 780, [1, '认识', 0.2]),
      screen(1220, 650, '27', 1, [1, '镜子'], { how: 'mirror' })
    ]
  })

  /* ---------- 1 引入：举右手 ---------- */
  S.push({
    tag: '镜子里的对称',
    beats: [
      { sub: '举起右手照镜子，镜子里的小朋友举的是哪只手？', say: '举起右手照镜子，镜子里的小朋友，举的是哪只手？', rate: '-6%' },
      { sub: '是左手！', say: '是左手！', pitch: '+8Hz' },
      { sub: '镜子里和镜子外成轴对称，镜面就是对称轴。', say: '镜子里和镜子外，成轴对称，镜面就是对称轴。' },
      { sub: '上下不变，左右相反！', say: '上下不变，左右相反！', pause: 0.6 }
    ],
    els: [
      svg(500, 260, 220, 340, kidSVG(), [0, 0.2]),
      mirror(960, 230, 640, [0, 0.4]),
      svg(1200, 260, 220, 340, kidSVG(), [0, '镜子里'], { fold: [[0, 'x', 110, 170, 0.01]] }),
      lbl(470, 250, '右手', RED, [0, '右手'], { size: 46 }),
      lbl(1450, 250, '左手', RED, [1, '左手'], { size: 46, glow: [1, '左手'] }),
      lbl(960, 700, '镜面 = 对称轴', BLUE, [2, '镜面'], { size: 50 }),
      lbl(700, 790, '上下不变', GREEN, [3, '上下'], { size: 56 }),
      lbl(1220, 790, '左右相反', RED, [3, '左右'], { size: 56 })
    ]
  })

  /* ---------- 2 知识地图（两枝） ---------- */
  var MX = [620, 1300]
  function mapEls(at, lit) {
    return [
      node(960, 210, 360, '镜子里的对称', INK, at, { size: 46 }),
      line2(960, 252, MX[0], 360, lit ? at : [0, '钟']),
      line2(960, 252, MX[1], 360, lit ? at : [0, '数']),
      node(MX[0], 405, 420, '镜子里的钟', BLUE, lit ? at : [0, '钟'], { size: 44 }),
      node(MX[1], 405, 420, '镜子里的数', RED, lit ? at : [0, '数']),
      flowArrow(MX[0], 452, 540, lit ? at : [1, 0.3]),
      flowArrow(MX[1], 452, 540, lit ? at : [1, 0.7]),
      node(MX[0], 595, 420, '① 左右翻', BLUE, lit ? at : [1, 0.3], { size: 44, glow: lit ? [0, '钟'] : undefined }),
      node(MX[1], 595, 480, '② 倒着读、翻回来', RED, lit ? at : [1, 0.7], { size: 44, glow: lit ? [0, '数'] : undefined })
    ]
  }
  S.push({
    tag: '镜子 | 两种题',
    beats: [
      { sub: '镜子里的题有两种：镜子里的钟，镜子里的数。', say: '镜子里的题，有两种：镜子里的钟，镜子里的数。' },
      { sub: '一种一招，我们一招一招来学！', say: '一种一招，我们一招一招来学！' }
    ],
    els: mapEls(0, false)
  })

  /* ---------- 3 第一招：镜子里的钟（镜子里 3:30 → 8:30） ---------- */
  S.push({
    tag: '第一招 | 镜子里的钟',
    beats: [
      { sub: '第一招：镜子里的钟，左右翻。镜子里的钟是这样的：', say: '第一招：镜子里的钟，左右翻。镜子里看到的钟，是这样的：' },
      { sub: '看起来像三点半，可这是镜子里的样子！', say: '看起来像三点半，可这是镜子里的样子！' },
      { sub: '从 12 到 6 画一条竖线，当对称轴。', say: '从十二到六，画一条竖线，当对称轴。' },
      { sub: '把整个钟左右翻过去：', say: '把整个钟，左右翻过去：' },
      { sub: '分针还指着 6，时针在 8 和 9 中间：八点半！', say: '分针还指着六，时针在八和九中间：是八点半！', pitch: '+5Hz' },
      { sub: '验一验：3:30 + 8:30，正好 12 时！', say: '验一验：三点半加八点半，正好十二时！', pause: 1 }
    ],
    els: [
      lbl(500, 165, '第一招：镜子里的钟，左右翻', BLUE, [0, '第一招'], { size: 44 }),
      clock(560, 520, 420, [8, 30], [0, '这样的'], { mir: true, flipBack: [3, '翻过去'] }),
      dashV(560, 290, 750, [2, '竖线']),
      lbl(560, 800, '镜子里：3:30', ORANGE, [1, '三点半'], { size: 48, out: [4, 0] }),
      lbl(560, 800, '真实：8:30', RED, [4, '八点半'], { size: 52 }),
      node(1450, 270, 460, '镜子里的钟', INK, [0, '第一招'], { size: 40 }),
      flowArrow(1450, 308, 368, [2, '竖线']),
      node(1450, 410, 460, '12 到 6 画竖线', INK, [2, '竖线'], { size: 40 }),
      flowArrow(1450, 448, 508, [3, '翻过去']),
      node(1450, 550, 460, '左右翻过去', BLUE, [3, '翻过去'], { size: 40 }),
      flowArrow(1450, 588, 648, [5, '验一验']),
      node(1450, 690, 460, '合起来 12 时', GREEN, [5, '验一验'], { size: 40 }),
      { t: 'stamp', x: 1000, y: 330, s: '3:30 + 8:30 = 12:00', color: RED, size: 44, rot: -5, at: [5, '正好'] }
    ]
  })

  /* ---------- 4 小心：指着 12、6 的不动（镜子里 9 时 → 3 时） ---------- */
  S.push({
    tag: '第一招 | 小心',
    beats: [
      { sub: '小心！左右翻，上下不变：指着 12 的分针不动。', say: '小心！左右翻，上下不变：指着十二的分针，翻过去不动。' },
      { sub: '镜子里像九点，真实是三点。', say: '镜子里像九点，真实是三点。', pause: 1 }
    ],
    els: [
      clock(620, 500, 380, [3, 0], [0, 0.2], { mir: true, flipBack: [1, '真实'], glow: [0, '十二的分针'] }),
      dashV(620, 290, 710, [0, '上下不变']),
      lbl(1300, 400, '镜子里：9:00', ORANGE, [1, '九点'], { size: 52 }),
      lbl(1300, 520, '真实：3:00', RED, [1, '三点'], { size: 56 }),
      lbl(1300, 650, '9:00 + 3:00 = 12:00', GREEN, [1, '三点', 0.6], { size: 44 })
    ]
  })

  /* ---------- 5 你来试 1：镜子里 1:30 → 10:30 ---------- */
  S.push({
    tag: '第一招 | 你来试',
    beats: [
      { sub: '你来试：镜子里看到的钟是这样的，真实是几点？', say: '你来试：镜子里看到的钟是这样的，真实是几点？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '左右翻过去：分针还指 6，时针在 10 和 11 中间。', say: '左右翻过去：分针还指着六，时针在十和十一中间。' },
      { sub: '是 **10:30**！1:30 + 10:30 正好 12 时。', say: '是十点半！一点半加十点半，正好十二时。', pause: 1 }
    ],
    els: [
      lbl(960, 165, '你来试：真实是几点？', GREY, [0, 0.2], { size: 46 }),
      clock(600, 480, 400, [10, 30], [0, 0.3], { mir: true, flipBack: [2, '翻过去'] }),
      { t: 'slot', id: 'q5', x: 1400, y: 470, size: 230, at: [0, 0.6] },
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q5' },
      fill('q5', [3, '十点半'], '<span style="font-size:52%">10:30</span>'),
      { t: 'stamp', x: 1500, y: 790, s: '答：10:30', color: RED, size: 54, rot: -6, at: [3, '正好'] }
    ]
  })

  /* ---------- 6 第二招：镜子里的数（810076） ---------- */
  var NUM = '810076'
  S.push({
    tag: '第二招 | 镜子里的数',
    beats: [
      { sub: '这回，镜子里是一串数，看不懂了！', say: '这回，镜子里是一串数，看不懂了！', pitch: '+5Hz' },
      { sub: '第二招：倒着读，翻回来。', say: '第二招：倒着读，翻回来。' },
      { sub: '镜子里左右相反，顺序倒了：要从右往左读。', say: '镜子里左右相反，顺序倒过来了：要从右往左读。' },
      { sub: '每个数也翻了面，要左右翻回来。', say: '每个数，也翻了面，要左右翻回来。' },
      { sub: '最简单：整个翻过去！', say: '最简单的办法：整个翻过去！' },
      { sub: '是 8、1、0、0、7、6！', say: '是八、一、零、零、七、六！', pause: 0.6 },
      { sub: '小心！水里的倒影是上下翻：顺序不变。', say: '小心！水里的倒影，是上下翻：顺序不变，每个数上下翻。', pause: 1 }
    ],
    els: [
      lbl(500, 165, '第二招：倒着读、翻回来', RED, [1, '第二招'], { size: 44 }),
      screen(620, 380, NUM, 0.9, [0, 0.2], { how: 'mirror', back: [4, '翻过去'] }),
      svg(260, 520, 740, 40, '<path class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M734 20 L10 20 M34 4 L8 20 L34 36" fill="none" stroke="' + ORANGE + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>', [2, '从右往左'], { draw: true, dur: 0.9 }),
      lbl(620, 600, '从右往左读', ORANGE, [2, '从右往左'], { size: 42 }),
      { t: 'stamp', x: 620, y: 690, s: '810076', color: RED, size: 64, rot: -4, at: [5, '是八'] },
      lbl(1460, 560, '水里的倒影', BLUE, [6, '水里'], { size: 42 }),
      screen(1340, 680, '27', 0.6, [6, '水里']),
      screen(1590, 680, '27', 0.6, [6, '上下翻'], { how: 'water' }),
      node(1460, 260, 440, '镜子里的数', INK, [1, '第二招'], { size: 40 }),
      flowArrow(1460, 298, 348, [2, '从右往左']),
      node(1460, 390, 440, '从右往左读，翻回来', RED, [2, '从右往左'], { size: 38 })
    ]
  })

  /* ---------- 7 你来试 2：号码 253，镜子里是哪个 → ② ---------- */
  /* 镜子里的样子：顺序倒 + 每个左右翻；① 只翻不倒序、③ 只倒序不翻 → 用 fold 画：① 每个数单独翻、② 整个翻、③ 倒序 */
  function each(cx, cy, str, scale, at, o) {
    /* 一串数，每个数单独左右翻（顺序不变） */
    var DW = 60 * scale, DG = 26 * scale, pad = 24 * scale
    var W = str.length * DW + (str.length - 1) * DG + pad * 2
    var out = [screen(cx, cy, str, scale, at, { color: 'rgba(0,0,0,0)' })]
    str.split('').forEach(function (dg, i) {
      var x = cx - W / 2 + pad + i * (DW + DG) + DW / 2
      out.push(Object.assign(screen(x, cy, dg, scale, at, { how: 'mirror', bare: true }), { overlapOk: true }))
    })
    return out
  }
  var e7 = [
    lbl(960, 165, '你来试：号码 253，镜子里看到哪个？', GREY, [0, 0.2], { size: 46 }),
    screen(960, 300, '253', 0.7, [0, 0.3]),
    { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5 },
    cross(420, 520, [2, '没反过来']),
    cross(1500, 520, [2, '没翻面']),
    { t: 'check', x: 1130, y: 420, at: [3, '倒过来'] },
    { t: 'stamp', x: 1500, y: 790, s: '答：②', color: RED, size: 56, rot: -6, at: [3, '答案'] }
  ]
  e7 = e7.concat(each(420, 520, '253', 0.6, [0, 0.5]))
  e7.push(screen(960, 520, '253', 0.6, [0, 0.65], { how: 'mirror' }))
  e7.push(screen(1500, 520, '352', 0.6, [0, 0.8]))
  ;['①', '②', '③'].forEach(function (c, i) { e7.push(lbl([420, 960, 1500][i] - 150, 430, c, INK, [0, 0.5 + i * 0.15], { font: 'kai', size: 40 })) })
  S.push({
    tag: '第二招 | 你来试',
    beats: [
      { sub: '你来试：衣服上的号码是 253，照镜子看到哪个？', say: '你来试：衣服上的号码是二五三，照镜子时，看到的是哪个？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '① 每个翻了，顺序没反；③ 顺序反了，可没翻面。', say: '一号，每个数翻了，顺序没反过来；三号，顺序反了，可是没翻面。' },
      { sub: '② 倒过来又翻了面，答案是 **②**！', say: '二号，倒过来，又翻了面：答案是二号！', pause: 1 }
    ],
    els: e7
  })

  /* ---------- 8 挑战：镜子里 2:10 → 9:50 ---------- */
  S.push({
    tag: '挑战 | 这次用哪一招？',
    beats: [
      { sub: '挑战题：镜子里的钟是这样的，真实是几时几分？', say: '挑战题：镜子里的钟是这样的，真实是几时几分？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', rate: '-6%', pause: 5 },
      { sub: '是钟，用第一招：左右翻过去。', say: '是钟，就用第一招：左右翻过去。' },
      { sub: '分针翻到 2，时针刚过 4：四点十分！', say: '分针翻到二，时针刚过四：是四点十分！' },
      { sub: '验一验：7:50 + 4:10 = 12 时，对了！', say: '验一验：七点五十分加四点十分，正好十二时，对了！', pause: 1 }
    ],
    els: [
      lbl(960, 165, '挑战：真实是几时几分？', GREY, [0, 0.2], { size: 46 }),
      clock(600, 480, 400, [4, 10], [0, 0.3], { mir: true, flipBack: [2, '翻过去'] }),
      { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5 },
      lbl(1400, 330, '第一招：左右翻', BLUE, [2, '第一招'], { size: 46 }),
      lbl(1400, 470, '4:10', RED, [3, '四点十分'], { size: 96, font: 'num' }),
      { t: 'stamp', x: 1500, y: 790, s: '7:50 + 4:10 = 12:00', color: RED, size: 40, rot: -5, at: [4, '正好'] }
    ]
  })

  /* ---------- 9 口诀 ---------- */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '镜子上下不变、左右反；', say: '镜子上下不变，左右反；', rate: '-15%' },
      { sub: '钟面竖线翻一翻，两个时间凑 12 时；', say: '钟面竖线翻一翻，两个时间凑十二时；', rate: '-15%' },
      { sub: '镜中数字倒着读，每个都要翻回来。', say: '镜中数字倒着读，每个都要翻回来。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 470, w: 1500, h: 480, at: 0 },
      { t: 'chant', x: 960, y: 330, s: '镜子上下不变、左右反；', color: RED, size: 58, at: 1 },
      { t: 'chant', x: 960, y: 470, s: '钟面竖线翻一翻，两个时间凑 12 时；', color: BLUE, size: 58, at: 2 },
      { t: 'chant', x: 960, y: 610, s: '镜中数字倒着读，每个都要翻回来。', color: GREEN, size: 58, at: 3 }
    ]
  })

  /* ---------- 10 结尾：知识地图 + 拓展想一想 ---------- */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天学会了两招：镜子里的钟，镜子里的数。', say: '今天学会了两招：镜子里的钟，镜子里的数。' },
      { sub: '想一想：镜子里的电子表是 10:10，再过 10 分呢？', say: '想一想：镜子里的电子表是十点十分，再过十分钟，镜子里是几点？', rate: '-6%', pause: 1 },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: mapEls(0, true).concat([
      screen(860, 790, '1010', 0.55, [1, '电子表'], { out: [2, 0] }),
      lbl(1200, 790, '+10 分 = ？', RED, [1, '再过'], { size: 52, out: [2, 0] }),
      { t: 'tape', x: 960, y: 790, s: '去练习纸上试试吧！', size: 50, at: [2, '练习纸'] }
    ])
  })

  /* 讲完一招点亮知识地图的一枝 */
  function mapScene(n) {
    var e = mapEls(0, true)
    var moves = e.slice(-2)
    var sits = e.slice(3, 5)
    moves.forEach(function (m, k) {
      m.glow = undefined
      if (k === n - 1) { m.at = [0, '学会']; m.glow = [0, '学会', 0.3] }
      if (k >= n) { m.dim = 0; sits[k].dim = 0 }
    })
    for (var k = 0; k < n; k++) e.push({ t: 'check', x: MX[k] + (k ? 270 : 240), y: 590, at: k === n - 1 ? [0, '学会', 0.3] : 0, sfx: k === n - 1 ? undefined : false })
    var say = ['第一招学会了！还有一招。', '两招都学会了！来个挑战！'][n - 1]
    return { tag: '镜子 | 学到哪了', beats: [{ sub: say, say: say, pitch: '+5Hz', pause: 0.4 }], els: e }
  }
  /* 顺序：0 开场 1 引入 2 地图 3 第一招 4 小心 5 你来试1 | 6 第二招 7 你来试2 | 8 挑战 9 口诀 10 结尾 */
  S.splice(8, 0, mapScene(2))
  S.splice(6, 0, mapScene(1))

  S.cover = {
    tag: null,
    els: [
      { t: 'txt', x: 960, y: 130, s: '奥数 · L1 补充 · B06 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
      { t: 'tape', x: 960, y: 270, s: '镜子里的对称', size: 120, at: 0 },
      { t: 'txt', x: 960, y: 410, s: '上下不变，左右相反', size: 58, color: RED, font: 'kl', at: 0 },
      clock(560, 670, 340, [8, 30], 0, { mir: true }),
      mirror(960, 520, 820, 0),
      clock(1360, 670, 340, [8, 30], 0),
      { t: 'txt', x: 960, y: 930, s: '镜子里的钟 · 镜子里的数', size: 50, color: GREEN, font: 'kl', at: 0 }
    ]
  }

  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
