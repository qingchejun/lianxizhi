/* B10 间隔问题（补充）· 讲解视频分镜 v1（L1 补充第十课，新结构，两招）
 * 开场直接进题（不提上一课、结尾不预告）。
 * 引入：从第 3 页看到第 7 页，是 7 − 3 = 4 页吗？一页一页数：5 页。
 * 知识地图：页数、夹子 → 两头都算；对折剪绳子 → 展开画一画。
 * 第一招：第 25 页到第 32 页（32 − 25 是隔了几步，再加开头那页 = 8）；晾 4 块手帕：挨着挂 5 个夹子、分开挂 8 个。你来试：第 12 到 20 页（9）。
 * 第二招：对折剪一刀 —— 展开看 2 个剪口、3 段；对折再对折剪一刀 —— 4 股、4 个剪口、5 段。你来试：对折一次剪 2 刀（5）。
 * 挑战：晾 6 块手帕最少几个夹子（第一招，7）。口诀 → 知识地图 → 拓展：对折三次剪一刀？→ 去练习纸。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420'

  function lbl(x, y, s, color, at, o) {
    o = o || {}
    return { t: 'txt', id: o.id, x: x, y: y, s: s, size: o.size || 40, font: o.font || 'kl', color: color || GREY, at: at, out: o.out, anim: o.anim, glow: o.glow, glow2: o.glow2, overlapOk: o.overlapOk }
  }
  function fill(id, at, val) { return { t: 'fill', id: id, at: at, val: val } }
  function svg(x0, y0, w, h, html, at, o) {
    o = o || {}
    return { t: 'svg', id: o.id, x: x0 + w / 2, y: y0 + h / 2, w: w, h: h, html: html, at: at, out: o.out, glow: o.glow, glow2: o.glow2, anim: o.anim, dim: o.dim, draw: o.draw, dur: o.dur, move: o.move, overlapOk: o.overlapOk !== undefined ? o.overlapOk : true }
  }
  function node(cx, cy, w, text, color, at, o) {
    o = o || {}
    var fs = o.size || 42, h = fs + 34
    var html = '<rect x="3" y="3" width="' + (w - 6) + '" height="' + (h - 6) + '" rx="14" fill="#fffaf0" stroke="' + color + '" stroke-width="4"/>' +
      '<text x="' + w / 2 + '" y="' + (h / 2 + fs * 0.36) + '" font-family="KL" font-size="' + fs + '" text-anchor="middle" fill="' + INK + '">' + text + '</text>'
    var e = svg(cx - w / 2, cy - h / 2, w, h, html, at, { out: o.out, glow: o.glow, anim: 'pop', dim: o.dim })
    e.overlapOk = false
    return e
  }
  function flowArrow(x, y1, y2, at) { return { t: 'varrow', x: x, y1: y1, y2: y2, color: GREY, at: at } }
  function line2(x1, y1, x2, y2, at) { return { t: 'seg', x1: x1, y1: y1, x2: x2, y2: y2, color: GREY, sw: 5, at: at } }

  /* ---------- 书页：一页一个小方块 ---------- */
  function page(cx, cy, n, at, o) {
    o = o || {}
    var html = '<rect x="4" y="4" width="92" height="122" rx="8" fill="#fffaf0" stroke="' + INK + '" stroke-width="5"/><path d="M20 30H80M20 48H80M20 66H70" stroke="#d6cbb8" stroke-width="5"/>' +
      '<text x="50" y="112" font-family="Num" font-size="38" font-weight="600" text-anchor="middle" fill="' + INK + '">' + n + '</text>'
    var k = o.k || 1.35
    return svg(cx - 50 * k, cy - 65 * k, 100 * k, 130 * k, '<g transform="scale(' + k + ')">' + html + '</g>', at, { anim: 'pop', glow: o.glow, glow2: o.glow2, out: o.out })
  }
  function pages(a, b, x0, cy, step, at, glowAt, o) {
    o = o || {}
    var els = []
    for (var p = a; p <= b; p++) {
      var i = p - a
      els.push(page(x0 + i * step, cy, p, Array.isArray(at) && Array.isArray(at[0]) ? at[i] : at, { glow: glowAt ? glowAt(i) : undefined, out: o.out, k: 1.5 }))
    }
    return els
  }
  function countBadge(cx, cy, k, at, o) {
    var html = '<circle cx="30" cy="30" r="26" fill="' + RED + '"/><text x="30" y="42" font-family="Num" font-weight="600" font-size="32" text-anchor="middle" fill="#fff">' + k + '</text>'
    return svg(cx - 30, cy - 30, 60, 60, html, at, { anim: 'pop', out: (o || {}).out })
  }

  /* ---------- 晾手帕：绳子 + 手帕 + 夹子 ---------- */
  var HK = ['#9fd3f0', '#f9c97c', '#a8dba8', '#f5a6b8', '#c9b6ef', '#f7e08a']
  function hanky(cx, ty, i, at, o) {
    var html = '<rect x="4" y="4" width="132" height="132" rx="6" fill="' + HK[i % 6] + '" stroke="' + INK + '" stroke-width="5"/><path d="M20 40H120M20 70H120M20 100H120" stroke="#ffffff" stroke-width="5" opacity="0.6"/>'
    return svg(cx - 70, ty, 140, 140, html, at, { anim: 'pop', out: (o || {}).out })
  }
  function clip(cx, ty, at, o) {
    o = o || {}
    var html = '<rect x="6" y="2" width="20" height="50" rx="5" fill="' + (o.color || RED) + '" stroke="' + INK + '" stroke-width="4"/><path d="M16 14V40" stroke="#fff" stroke-width="3"/>'
    return svg(cx - 16, ty - 22, 32, 56, html, at, { anim: 'pop', glow: o.glow, out: o.out })
  }
  function rope(x1, x2, y, at, o) {
    return { t: 'seg', x1: x1, y1: y, x2: x2, y2: y, color: INK, sw: 6, at: at, out: (o || {}).out }
  }

  /* ---------- 绳子：折起来 / 展开 ---------- */
  var ROPE = '#8a4b22'
  /* 折好的绳子：st 股叠在一起，左右两头交替连着；cuts 是剪刀位置（0..1） */
  function folded(x0, y0, len, st, cuts, at, o) {
    o = o || {}
    var gap = o.gap || 56, d = ''
    for (var j = 0; j < st; j++) {
      var y = 30 + j * gap
      d += (j ? '' : 'M30 ' + y) + (j % 2 ? 'H30' : 'H' + (30 + len))
      if (j < st - 1) {
        var ex = j % 2 ? 30 : 30 + len, dir = j % 2 ? -1 : 1
        d += 'C' + (ex + dir * gap * 0.75) + ' ' + y + ' ' + (ex + dir * gap * 0.75) + ' ' + (y + gap) + ' ' + ex + ' ' + (y + gap)
      }
    }
    var H = 60 + (st - 1) * gap
    var s = '<path d="' + d + '" fill="none" stroke="' + ROPE + '" stroke-width="16" stroke-linecap="round"/>'
    return svg(x0 - 30, y0 - 30, len + 60, H, s, at, { out: o.out, glow: o.glow })
  }
  function scissorLine(x, y1, y2, at, o) {
    var h = y2 - y1
    var html = '<path d="M24 50V' + h + '" stroke="' + RED + '" stroke-width="7" stroke-dasharray="16 10"/><text x="24" y="46" font-size="52" text-anchor="middle" fill="' + RED + '">✂</text>'
    return svg(x - 24, y1 - 30, 48, h + 30, html, at, { anim: 'pop', out: (o || {}).out })
  }
  /* 展开的绳子：总长 W，剪口 pts（0..1），段交替上色 */
  function unfolded(x0, y, W, pts, at, o) {
    o = o || {}
    var cuts = pts.slice().sort(function (a, b) { return a - b }), xs = [0].concat(cuts).concat([1]), s = ''
    for (var i = 0; i + 1 < xs.length; i++) {
      var a = 20 + xs[i] * W + (i ? 7 : 0), b = 20 + xs[i + 1] * W - (i + 1 < xs.length - 1 ? 7 : 0)
      s += '<path d="M' + a.toFixed(1) + ' 40H' + b.toFixed(1) + '" stroke="' + (i % 2 ? '#c98b4e' : ROPE) + '" stroke-width="12" stroke-linecap="round"/>'
    }
    cuts.forEach(function (c) { s += '<path d="M' + (20 + c * W).toFixed(1) + ' 14V66" stroke="' + RED + '" stroke-width="5"/>' })
    return svg(x0 - 20, y - 40, W + 40, 80, s, at, { out: o.out, glow: o.glow, anim: o.anim })
  }

  var S = []

  /* ---------- 0 开场 ---------- */
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '今天，我们再学三种间隔问题！', say: '今天，我们再学三种间隔问题！' }
    ],
    els: [
      { t: 'txt', x: 960, y: 200, s: '奥数 · L1 补充 · B10', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
      { t: 'tape', x: 960, y: 330, s: '间隔问题（补充）', size: 100, at: [0, 0.2] },
      lbl(960, 560, '看了几页 · 晾手帕 · 剪绳子', GREY, [1, '三种'], { size: 54 })
    ]
  })

  /* ---------- 1 引入：第 3 页到第 7 页 ---------- */
  var P1 = pages(3, 7, 560, 400, 200, [0, '第三页'], function (i) { return [3, ['三', '四', '五', '六', '七'][i] + '、'] })
  S.push({
    tag: '看了几页',
    beats: [
      { sub: '从第 3 页看到第 7 页，一共看了几页？', say: '从第三页看到第七页，一共看了几页？', rate: '-6%' },
      { sub: '7 − 3 = 4 页？', say: '七减三，等于四页？', rate: '-6%' },
      { sub: '我们一页一页数：', say: '我们一页一页数：' },
      { sub: '3、4、5、6、7，是 5 页！', say: '三、四、五、六、七、是五页！', pitch: '+5Hz', pause: 0.6 },
      { sub: '第 3 页也看了，两头都要算上。', say: '第三页也看了，两头都要算上。', pause: 0.6 }
    ],
    els: P1.concat([
      lbl(960, 640, '7 − 3 = 4 ？', ORANGE, [1, '七减三'], { size: 60, out: [3, '五页'] }),
      countBadge(560, 250, 1, [3, '三、']), countBadge(760, 250, 2, [3, '四、']), countBadge(960, 250, 3, [3, '五、']),
      countBadge(1160, 250, 4, [3, '六、']), countBadge(1360, 250, 5, [3, '七、']),
      { t: 'stamp', x: 960, y: 650, s: '5 页！', color: RED, size: 70, rot: -6, at: [3, '五页'] },
      lbl(960, 800, '两头都算', BLUE, [4, '两头'], { size: 56 })
    ])
  })

  /* ---------- 2 知识地图 ---------- */
  var MX = [620, 1300]
  function mapEls(at, lit) {
    return [
      node(960, 210, 400, '间隔问题（补充）', INK, at, { size: 44 }),
      line2(960, 252, MX[0], 360, lit ? at : [0, '页数']),
      line2(960, 252, MX[1], 360, lit ? at : [0, '剪绳子']),
      node(MX[0], 405, 520, '页数 · 夹子', BLUE, lit ? at : [0, '页数'], { size: 44 }),
      node(MX[1], 405, 520, '对折剪绳子', RED, lit ? at : [0, '剪绳子'], { size: 44 }),
      flowArrow(MX[0], 452, 540, lit ? at : [1, '两头都算']),
      flowArrow(MX[1], 452, 540, lit ? at : [1, '展开']),
      node(MX[0], 595, 520, '① 两头都算', BLUE, lit ? at : [1, '两头都算'], { size: 44 }),
      node(MX[1], 595, 520, '② 展开画一画', RED, lit ? at : [1, '展开'], { size: 44 })
    ]
  }
  S.push({
    tag: '间隔问题 | 两招',
    beats: [
      { sub: '数页数、数夹子，还有对折剪绳子。', say: '数页数、数夹子，还有对折剪绳子。' },
      { sub: '两招：两头都算；展开画一画！', say: '两招：两头都算；展开画一画！' }
    ],
    els: mapEls(0, false)
  })

  /* ---------- 3 第一招 · 页数：25 到 32 ---------- */
  var P3 = []
  ;[25, 26, 27, 28, 29, 30, 31, 32].forEach(function (p, i) { P3.push(page(330 + i * 180, 330, p, [0, '第二十五', 0.1 * i], { glow: i === 0 ? [3, '开头'] : undefined, k: 1.25 })) })
  var hops = []
  for (var i = 0; i < 7; i++) {
    var x = 330 + i * 180
    hops.push(svg(x, 180, 180, 70, '<path class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M8 64Q90 -6 172 64" fill="none" stroke="' + BLUE + '" stroke-width="6"/>', [2, '隔了', 0.25 * i], { draw: true, dur: 0.4 }))
  }
  S.push({
    tag: '第一招 | 两头都算',
    beats: [
      { sub: '第一招：两头都算。从第 25 页看到第 32 页：', say: '第一招：两头都算。从第二十五页，看到第三十二页：' },
      { sub: '32 − 25 = 7，', say: '三十二减二十五，等于七，' },
      { sub: '这 7 是从开头跳到末尾，隔了 7 步；', say: '这个七，是从开头跳到末尾，隔了七步；' },
      { sub: '还要加上开头那一页：7 + 1 = **8** 页！', say: '还要加上开头那一页：七加一，等于八页！', pause: 1 },
      { sub: '小心：只算「末 − 首」，就把开头那页漏掉了。', say: '小心：只算末页减首页，就把开头那一页漏掉了。', pause: 0.6 }
    ],
    els: P3.concat(hops).concat([
      node(560, 600, 420, '末 − 首：隔了几步', BLUE, [1, '三十二减'], { size: 40 }),
      { t: 'harrow', x1: 780, x2: 870, y: 600, color: GREY, at: [3, '还要'] },
      node(1080, 600, 380, '再 + 1（开头）', BLUE, [3, '还要'], { size: 40 }),
      { t: 'stamp', x: 1500, y: 600, s: '8 页', color: RED, size: 66, rot: -6, at: [3, '八页'] },
      lbl(960, 790, '32 − 25 + 1 = 8', INK, [3, '七加一'], { font: 'num', size: 56 })
    ])
  })

  /* ---------- 4 第一招 · 晾手帕：4 块，挨着 5 个、分开 8 个 ---------- */
  var RY = 250, RY2 = 560
  var els4 = [rope(150, 1150, RY, [0, 0.2]), lbl(160, RY - 70, '挨着挂', BLUE, [1, '挨着'], { size: 44 })]
  for (var h = 0; h < 4; h++) els4.push(hanky(290 + h * 140, RY, h, [0, '四块', 0.15 * h]))
  for (var c = 0; c <= 4; c++) els4.push(clip(220 + c * 140, RY, [1, '共用', 0.3 * c], { color: RED }))
  els4.push(rope(150, 1150, RY2, [3, '分开']), lbl(160, RY2 - 70, '分开挂', ORANGE, [3, '分开'], { size: 44 }))
  for (var h2 = 0; h2 < 4; h2++) {
    els4.push(hanky(270 + h2 * 200, RY2, h2, [3, '分开', 0.15 * h2]))
    els4.push(clip(208 + h2 * 200, RY2, [4, '两个', 0.3 * h2], { color: ORANGE }))
    els4.push(clip(332 + h2 * 200, RY2, [4, '两个', 0.3 * h2 + 0.15], { color: ORANGE }))
  }
  S.push({
    tag: '第一招 | 晾手帕',
    beats: [
      { sub: '晾 4 块手帕，每块的两个角都要用夹子夹住。', say: '晾四块手帕，每块的两个角，都要用夹子夹住。' },
      { sub: '挨着挂，相邻两块共用一个夹子：', say: '挨着挂，相邻两块共用一个夹子：' },
      { sub: '夹子比手帕多 1：4 + 1 = **5** 个，这是最少。', say: '夹子比手帕多一个：四加一，等于五个，这是最少。', pause: 0.6 },
      { sub: '要是分开挂，谁也不共用，', say: '要是分开挂，谁也不共用，' },
      { sub: '每块两个：4 + 4 = **8** 个，这是最多。', say: '每块两个：四加四，等于八个，这是最多。', pause: 1 }
    ],
    els: els4.concat([
      lbl(1500, 300, '最少：4 + 1 = 5', BLUE, [2, '四加一'], { size: 54 }),
      lbl(1500, 610, '最多：4 + 4 = 8', ORANGE, [4, '四加四'], { size: 54 })
    ])
  })

  /* ---------- 5 你来试 1：第 12 到 20 页（9） ---------- */
  S.push({
    tag: '第一招 | 你来试',
    beats: [
      { sub: '你来试：从第 12 页看到第 20 页，一共几页？', say: '你来试：从第十二页，看到第二十页，一共几页？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '20 − 12 = 8，再加开头那一页：**9** 页！', say: '二十减十二，等于八，再加开头那一页：九页！', pause: 1 }
    ],
    els: [
      page(560, 400, 12, [0, '十二页'], { k: 1.7 }),
      lbl(760, 400, '……', GREY, [0, '二十页'], { size: 60 }),
      page(960, 400, 20, [0, '二十页'], { k: 1.7 }),
      { t: 'slot', id: 'q5', x: 1450, y: 400, size: 200, at: [0, '几页'] },
      lbl(1450, 545, '页', GREY, [0, '几页'], { size: 48 }),
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q5' },
      lbl(760, 600, '20 − 12 + 1 = 9', RED, [2, '二十减'], { font: 'num', size: 56 }),
      fill('q5', [2, '九页'], '9')
    ]
  })

  /* ---------- 7 第二招 · 对折剪绳子 ---------- */
  var FX0 = 300, FY = 260, FL = 480
  S.push({
    tag: '第二招 | 展开画一画',
    beats: [
      { sub: '一根绳子对折，从中间剪一刀，剪成几段？', say: '一根绳子对折，从中间剪一刀，剪成几段？', rate: '-6%' },
      { sub: '2 段？叠在一起的有 2 股，一刀把 2 股都剪断了！', say: '两段？叠在一起的有两股，一刀把两股都剪断了！', pitch: '+5Hz' },
      { sub: '第二招：展开画一画。展开一看，', say: '第二招：展开画一画。展开一看，' },
      { sub: '2 个剪口，剪成 **3** 段。', say: '两个剪口，剪成三段。', pause: 1 },
      { sub: '对折，再对折，叠成 4 股；剪一刀，4 个剪口。', say: '对折，再对折，叠成四股；剪一刀，四个剪口。' },
      { sub: '段数比剪口多 1：4 + 1 = **5** 段！', say: '段数比剪口多一：四加一，等于五段！', pause: 1 }
    ],
    els: [
      folded(FX0, FY, FL, 2, [0.5], [0, '对折']),
      scissorLine(FX0 + FL / 2, FY - 50, FY + 100, [0, '剪一刀']),
      lbl(1420, 260, '2 股', RED, [1, '两股'], { size: 60 }),
      unfolded(260, 470, 1000, [0.25, 0.75], [2, '展开一看'], { anim: 'pop' }),
      countBadge(260 + 1000 * 0.25, 410, 1, [3, '两个']), countBadge(260 + 1000 * 0.75, 410, 2, [3, '两个', 0.3]),
      lbl(1420, 470, '3 段', RED, [3, '三段'], { size: 60 }),
      folded(FX0, 610, FL * 0.5, 4, [0.5], [4, '对折，再'], { gap: 46 }),
      scissorLine(FX0 + FL * 0.25, 570, 790, [4, '剪一刀']),
      unfolded(700, 720, 600, [0.125, 0.375, 0.625, 0.875], [4, '四个剪口'], { anim: 'pop' }),
      lbl(1500, 720, '4 + 1 = 5 段', RED, [5, '四加一'], { size: 52 })
    ].map(function (e) { return e })
  })

  /* ---------- 8 你来试 2：对折一次剪 2 刀（5） ---------- */
  S.push({
    tag: '第二招 | 你来试',
    beats: [
      { sub: '你来试：绳子对折一次，剪了 2 刀，剪成几段？', say: '你来试：绳子对折一次，剪了两刀，剪成几段？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '每刀剪断 2 股：2 刀，4 个剪口；4 + 1 = **5** 段！', say: '每一刀剪断两股：两刀，四个剪口；四加一，等于五段！', pause: 1 }
    ],
    els: [
      folded(FX0, 300, FL, 2, [], [0, '对折']),
      scissorLine(FX0 + FL / 3, 250, 400, [0, '两刀']),
      scissorLine(FX0 + FL * 2 / 3, 250, 400, [0, '两刀', 0.2]),
      { t: 'slot', id: 'q8', x: 1450, y: 330, size: 200, at: [0, '几段'] },
      lbl(1450, 475, '段', GREY, [0, '几段'], { size: 48 }),
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q8' },
      unfolded(260, 560, 1000, [1 / 6, 2 / 6, 4 / 6, 5 / 6], [2, '四个剪口'], { anim: 'pop' }),
      fill('q8', [2, '五段'], '5')
    ]
  })

  /* ---------- 10 挑战：6 块手帕最少几个夹子（7） ---------- */
  S.push({
    tag: '挑战 | 这次用哪一招？',
    beats: [
      { sub: '挑战：晾 6 块手帕，挨着挂，最少要几个夹子？', say: '挑战：晾六块手帕，挨着挂，最少要几个夹子？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', rate: '-6%', pause: 5 },
      { sub: '第一招：两头都算，夹子比手帕多 1。', say: '第一招：两头都算，夹子比手帕多一个。' },
      { sub: '6 + 1 = **7** 个！', say: '六加一，等于七个！', pause: 1 }
    ],
    els: (function () {
      var e = [rope(150, 1150, 260, [0, 0.2])]
      for (var h = 0; h < 6; h++) e.push(hanky(220 + h * 140, 260, h, [0, '六块', 0.1 * h]))
      for (var c = 0; c <= 6; c++) e.push(clip(150 + c * 140, 260, [3, '六加一', 0.15 * c], { color: RED }))
      return e.concat([
        { t: 'slot', id: 'q10', x: 1520, y: 330, size: 200, at: [0, '几个'] },
        lbl(1520, 475, '个', GREY, [0, '几个'], { size: 48 }),
        { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q10' },
        lbl(700, 560, '第一招：两头都算', BLUE, [2, '第一招'], { size: 52 }),
        fill('q10', [3, '七个'], '7')
      ])
    })()
  })

  /* ---------- 11 口诀 ---------- */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '头尾都算加上一，挨着共用省夹子；', say: '头尾都算加上一，挨着共用省夹子；', rate: '-15%' },
      { sub: '对折几次叠几股，展开再数不糊涂。', say: '对折几次叠几股，展开再数不糊涂。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 470, w: 1500, h: 420, at: 0 },
      { t: 'chant', x: 960, y: 390, s: '头尾都算加上一，挨着共用省夹子；', color: BLUE, size: 60, at: 1 },
      { t: 'chant', x: 960, y: 560, s: '对折几次叠几股，展开再数不糊涂。', color: RED, size: 60, at: 2 }
    ]
  })

  /* ---------- 12 结尾 ---------- */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天学会了两招：两头都算；展开画一画。', say: '今天学会了两招：两头都算；展开画一画。' },
      { sub: '想一想：对折三次，再剪一刀，会剪成几段？', say: '想一想：对折三次，再剪一刀，会剪成几段？', rate: '-6%', pause: 1 },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: mapEls(0, true).concat([
      { t: 'check', x: MX[0] + 290, y: 590, at: 0, sfx: false },
      { t: 'check', x: MX[1] + 290, y: 590, at: 0, sfx: false },
      lbl(960, 760, '对折 3 次，剪 1 刀：几段？', RED, [1, '想一想'], { size: 52, out: [2, 0] }),
      { t: 'tape', x: 960, y: 790, s: '去练习纸上试试吧！', size: 50, at: [2, '练习纸'] }
    ])
  })

  function mapScene(n) {
    var e = mapEls(0, true)
    var moves = e.slice(-2), sits = e.slice(3, 5)
    moves.forEach(function (m, k) {
      if (k === n - 1) { m.at = [0, '学会']; m.glow = [0, '学会', 0.3] }
      if (k >= n) { m.dim = 0; sits[k].dim = 0 }
    })
    for (var k = 0; k < n; k++) e.push({ t: 'check', x: MX[k] + 290, y: 590, at: k === n - 1 ? [0, '学会', 0.3] : 0, sfx: k === n - 1 ? undefined : false })
    var say = ['第一招学会了！还有一招。', '两招都学会了！来个挑战！'][n - 1]
    return { tag: '间隔问题 | 学到哪了', beats: [{ sub: say, say: say, pitch: '+5Hz', pause: 0.4 }], els: e }
  }
  /* 0 开场 1 引入 2 地图 3 页数 4 手帕 5 你来试1 | 6 剪绳子 7 你来试2 | 8 挑战 9 口诀 10 结尾 */
  S.splice(8, 0, mapScene(2))
  S.splice(6, 0, mapScene(1))

  S.cover = {
    tag: null,
    els: [
      { t: 'txt', x: 960, y: 130, s: '奥数 · L1 补充 · B10 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
      { t: 'tape', x: 960, y: 270, s: '间隔问题（补充）', size: 110, at: 0 },
      { t: 'txt', x: 960, y: 410, s: '头尾都算加上一', size: 58, color: RED, font: 'kl', at: 0 }
    ].concat(pages(3, 7, 560, 620, 200, 0)).concat([
      { t: 'txt', x: 960, y: 960, s: '两头都算 · 展开画一画', size: 50, color: GREEN, font: 'kl', at: 0 }
    ])
  }
  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
