/* B09 蜗牛爬井 · 讲解视频分镜 v1（L1 补充第九课，新结构，两招）
 * 开场直接进题（不提上一课、结尾不预告）。
 * 引入：5 米井，白天爬 2 米、晚上滑 1 米，一天净爬 1 米 —— 是 5 天吗？
 * 知识地图：问第几天在哪 → 一天一天看；问几天爬出、过河几次 → 最后一天单独算。
 * 第一招：在井上一天一天画（傍晚到哪、早上滑到哪），第 4 天白天就到井口了。你来试：竹竿 8 节、上 3 滑 1，第 3 天早上在几节（6）。
 * 第二招：24 米井、上 8 滑 4，画不下了 → 先留出最后一天的 8 米，16 米每天净爬 4，4 天，+1 = 5 天；小心 24 ÷ 4 = 6 多算了。
 *        过河也一样：16 人、船坐 5 人 → 留出最后一趟 5 人，11 人每趟净送 4 人，3 趟，+1 = 4 趟。你来试：11 节竹竿、上 3 滑 1（5 天）。
 * 挑战：10 米井、上 4 滑 2，第 3 天傍晚在几米（第一招，8）。口诀 → 知识地图 → 拓展：井深 6 米要几天？→ 去练习纸。 */
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

  /* ---------- 井、竹竿、蜗牛 ---------- */
  /* 井：左边刻度，井口在 yTop，井底在 yBot */
  function well(x0, w, yTop, yBot, H, at, o) {
    o = o || {}
    var u = (yBot - yTop) / H, L = 100, D = 20, Hh = yBot - yTop
    var W = L + w + 20, Ht = D + Hh + 34
    function ly(v) { return (D + Hh - v * u).toFixed(1) }
    var s = '<rect x="' + L + '" y="0" width="' + w + '" height="' + (D + Hh + 30) + '" fill="#e8e0d2"/>'
    s += '<rect x="' + L + '" y="' + (D + Hh) + '" width="' + w + '" height="30" fill="#b9a98f"/>'
    s += '<path d="M' + L + ' 0V' + (D + Hh + 30) + 'M' + (L + w) + ' 0V' + (D + Hh + 30) + '" stroke="' + INK + '" stroke-width="8"/>'
    var lstep = H > 12 ? 4 : 1
    for (var v = 0; v <= H; v++) {
      if (H <= 12 || v % 2 === 0) s += '<path d="M' + (L - 26) + ' ' + ly(v) + 'h20" stroke="' + INK + '" stroke-width="3"/>'
      if (v % lstep === 0 || v === H) s += '<text x="' + (L - 34) + '" y="' + (+ly(v) + 13).toFixed(1) + '" font-family="Num" font-size="36" text-anchor="end" fill="' + INK + '">' + v + '</text>'
    }
    return svg(x0 - L, yTop - D, W, Ht, s, at, { out: o.out })
  }
  function snailHTML(flip) {
    return '<g' + (flip ? ' transform="translate(90 0) scale(-1 1)"' : '') + '>' +
      '<path d="M8 52 Q4 40 20 40 H70 Q84 40 86 30 L90 30 Q90 52 70 54 H14 Z" fill="#c9e39a" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<path d="M84 32 L92 12 M86 33 L100 18" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/><circle cx="92" cy="11" r="3.5" fill="' + INK + '"/><circle cx="100" cy="17" r="3.5" fill="' + INK + '"/>' +
      '<circle cx="42" cy="28" r="24" fill="#e9a65a" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<path d="M42 28 m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0 a16 16 0 1 1 -32 0" fill="none" stroke="' + INK + '" stroke-width="3"/></g>'
  }
  /* 蜗牛竖着贴在井壁上爬（转 -90 度），(cx, cy) 是它的位置 */
  function snail(cx, cy, at, o) {
    o = o || {}
    return svg(cx - 8, cy - 82, 96, 165, '<g transform="scale(1.5)"><g transform="rotate(-90 32 55) translate(-23 27)">' + snailHTML(false) + '</g></g>', at, { out: o.out, glow: o.glow, anim: o.anim || 'pop' })
  }
  function arrowUp(x, y1, y2, color, at, o) {
    o = o || {}
    var h = y1 - y2
    var html = '<path class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M15 ' + (h + 4) + 'V18" stroke="' + color + '" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M3 22L15 2L27 22Z" fill="' + color + '"/>'
    return svg(x - 15, y2 - 4, 30, h + 8, html, at, { draw: true, dur: 0.6, out: o.out })
  }
  function arrowDown(x, y1, y2, color, at, o) {
    o = o || {}
    var h = y2 - y1
    var html = '<path d="M15 0V' + (h - 18) + '" stroke="' + color + '" stroke-width="6" stroke-dasharray="12 9" fill="none"/><path d="M3 ' + (h - 22) + 'L15 ' + h + 'L27 ' + (h - 22) + 'Z" fill="' + color + '"/>'
    return svg(x - 15, y1, 30, h + 2, html, at, { out: o.out })
  }

  var S = []

  /* ---------- 0 开场 ---------- */
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '今天，我们来学蜗牛爬井！', say: '今天，我们来学蜗牛爬井！' }
    ],
    els: [
      { t: 'txt', x: 960, y: 200, s: '奥数 · L1 补充 · B09', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
      { t: 'tape', x: 960, y: 330, s: '蜗牛爬井', size: 110, at: [0, 0.2] },
      svg(860, 560, 200, 130, '<g transform="scale(2)">' + snailHTML(false) + '</g>', [1, '蜗牛'])
    ]
  })

  /* ---------- 1 引入：5 米井，是 5 天吗？ ---------- */
  var WX = 400, WW = 300, YT = 190, YB = 790, H5 = 5
  function y5(v) { return YB - v * (YB - YT) / H5 }
  var SX = WX + WW / 2
  S.push({
    tag: '蜗牛爬井',
    beats: [
      { sub: '一只小蜗牛掉进了 5 米深的井里。', say: '一只小蜗牛，掉进了五米深的井里。' },
      { sub: '它白天往上爬 2 米，晚上又滑下来 1 米。', say: '它白天往上爬两米，晚上又滑下来一米。' },
      { sub: '一天一夜，净爬 1 米。', say: '一天一夜，净爬一米。' },
      { sub: '5 米，是不是要 5 天？', say: '五米，是不是要五天？', rate: '-6%', pause: 1 }
    ],
    els: [
      well(WX, WW, YT, YB, H5, [0, 0.2]),
      lbl(WX + WW + 120, YT - 10, '井口', GREY, [0, 0.3], { font: 'kai', size: 40 }),
      snail(SX, y5(0) - 40, [0, '蜗牛']),
      lbl(1350, 300, '白天 ↑ 2 米', GREEN, [1, '爬两米'], { size: 56 }),
      lbl(1350, 420, '晚上 ↓ 1 米', RED, [1, '滑下来'], { size: 56 }),
      lbl(1350, 560, '一天一夜：2 − 1 = 1 米', BLUE, [2, '净爬'], { size: 52 }),
      lbl(1350, 700, '5 天？', ORANGE, [3, '五天'], { size: 80 })
    ]
  })

  /* ---------- 2 知识地图 ---------- */
  var MX = [620, 1300]
  function mapEls(at, lit) {
    return [
      node(960, 210, 330, '蜗牛爬井', INK, at, { size: 46 }),
      line2(960, 252, MX[0], 360, lit ? at : [0, '在哪']),
      line2(960, 252, MX[1], 360, lit ? at : [0, '几天']),
      node(MX[0], 405, 520, '问第几天在哪', BLUE, lit ? at : [0, '在哪'], { size: 44 }),
      node(MX[1], 405, 520, '问几天爬出去', RED, lit ? at : [0, '几天'], { size: 44 }),
      flowArrow(MX[0], 452, 540, lit ? at : [1, '一天一天']),
      flowArrow(MX[1], 452, 540, lit ? at : [1, '单独算']),
      node(MX[0], 595, 520, '① 一天一天看', BLUE, lit ? at : [1, '一天一天'], { size: 44 }),
      node(MX[1], 595, 520, '② 最后一天单独算', RED, lit ? at : [1, '单独算'], { size: 44 })
    ]
  }
  S.push({
    tag: '蜗牛爬井 | 两招',
    beats: [
      { sub: '这种题，有的问第几天在哪，有的问几天爬出去。', say: '这种题，有的问第几天在哪，有的问几天爬出去。' },
      { sub: '两招：一天一天看；最后一天单独算！', say: '两招：一天一天看；最后一天单独算！' }
    ],
    els: mapEls(0, false)
  })

  /* ---------- 3 第一招：一天一天画 ---------- */
  var days5 = [[0, 2, 1], [1, 3, 2], [2, 4, 3], [3, 5, null]]
  var dayEls = []
  var AX0 = SX + 200
  days5.forEach(function (d, i) {
    var x = AX0 + i * 130
    var b = i + 1
    dayEls.push(arrowUp(x, y5(d[0]), y5(d[1]), GREEN, [b, '傍晚']))
    dayEls.push(lbl(x + 16, YB + 50, '第' + (i + 1) + '天', GREY, [b, '第'], { size: 30, font: 'kai' }))
    if (d[2] !== null) dayEls.push(arrowDown(x + 34, y5(d[1]), y5(d[2]), RED, [b, '早上']))
  })
  /* 蜗牛：每天傍晚在上面，早上滑到下面 */
  var snails = [snail(SX, y5(0) - 40, [0, 0.2], { out: [1, '傍晚'] })]
  days5.forEach(function (d, i) {
    var b = i + 1
    snails.push(snail(SX, y5(d[1]) - 40, [b, '傍晚'], { anim: 'fade', out: d[2] === null ? undefined : [b, '早上'] }))
    if (d[2] !== null) snails.push(snail(SX, y5(d[2]) - 40, [b, '早上'], { anim: 'fade', out: [b + 1, '傍晚'] }))
  })
  S.push({
    tag: '第一招 | 一天一天看',
    beats: [
      { sub: '第一招：一天一天看，在井上画出来。', say: '第一招：一天一天看，在井上画出来。' },
      { sub: '第 1 天傍晚爬到 2 米，早上滑到 1 米；', say: '第一天傍晚，爬到两米；早上，滑到一米；' },
      { sub: '第 2 天傍晚 3 米，早上 2 米；', say: '第二天傍晚三米，早上两米；' },
      { sub: '第 3 天傍晚 4 米，早上 3 米；', say: '第三天傍晚四米，早上三米；' },
      { sub: '第 4 天傍晚，爬到 5 米 —— 到井口了！', say: '第四天傍晚，爬到五米，到井口了！', pitch: '+8Hz', pause: 0.6 },
      { sub: '爬出去就不会再滑下来，只要 **4** 天！', say: '爬出去，就不会再滑下来了，只要四天！', pause: 1 },
      { sub: '第几天早上在哪？就是几个「净爬」。', say: '第几天早上在哪？就是几个净爬。' }
    ],
    els: [
      well(WX, WW, YT, YB, H5, [0, 0.1]),
      lbl(WX + WW + 120, YT - 10, '井口', GREY, [0, 0.2], { font: 'kai', size: 40 })
    ].concat(dayEls).concat(snails).concat([
      { t: 'check', x: AX0 + 3 * 130 + 60, y: y5(5) - 10, at: [4, '到井口'] },
      node(1620, 260, 380, '白天 ↑ 爬上去', GREEN, [1, '爬到'], { size: 40 }),
      node(1620, 380, 380, '晚上 ↓ 滑下来', RED, [1, '滑到'], { size: 40 }),
      node(1620, 500, 380, '一天一夜净爬 1', BLUE, [2, 0.3], { size: 40 }),
      { t: 'stamp', x: 1620, y: 680, s: '4 天！', color: RED, size: 70, rot: -6, at: [5, '四天'] },
      lbl(1620, 800, '早上：几个净爬', BLUE, [6, '净爬'], { size: 44 })
    ])
  })

  /* ---------- 4 你来试 1：竹竿 8 节，上 3 滑 1，第 3 天早上（6） ---------- */
  var H8 = 8, Y8T = 200, Y8B = 780
  function y8(v) { return Y8B - v * (Y8B - Y8T) / H8 }
  S.push({
    tag: '第一招 | 你来试',
    beats: [
      { sub: '你来试：竹竿 8 节，蜗牛白天爬 3 节，晚上滑 1 节。', say: '你来试：竹竿八节，蜗牛白天爬三节，晚上滑一节。', rate: '-6%' },
      { sub: '第 3 天早上，它在第几节？', say: '第三天早上，它在第几节？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '一天一夜净爬 2 节，3 天早上：2 + 2 + 2 = **6** 节！', say: '一天一夜净爬两节，第三天早上，二加二加二，等于六节！', pause: 1 }
    ],
    els: [
      well(WX, WW, Y8T, Y8B, H8, [0, 0.2]),
      lbl(WX + WW + 120, Y8T - 10, '竿顶', GREY, [0, 0.3], { font: 'kai', size: 40 }),
      snail(SX, y8(0) - 40, [0, 0.4], { out: [3, '净爬'] }),
      lbl(1350, 300, '白天 ↑ 3 节', GREEN, [0, '爬三节'], { size: 52 }),
      lbl(1350, 400, '晚上 ↓ 1 节', RED, [0, '滑一节'], { size: 52 }),
      { t: 'slot', id: 'q4', x: 1500, y: 560, size: 200, at: [1, '第几节'] },
      { t: 'think', x: 960, y: 790, at: [2, '想一想', 0.5], from: 5, pulse: 'q4' },
      arrowUp(SX + 170, y8(0), y8(3), GREEN, [3, '净爬']),
      arrowDown(SX + 204, y8(3), y8(2), RED, [3, '净爬', 0.3]),
      arrowUp(SX + 280, y8(2), y8(5), GREEN, [3, '二加二']),
      arrowDown(SX + 314, y8(5), y8(4), RED, [3, '二加二', 0.3]),
      arrowUp(SX + 390, y8(4), y8(7), GREEN, [3, '加二加二']),
      arrowDown(SX + 424, y8(7), y8(6), RED, [3, '加二加二', 0.3]),
      snail(SX, y8(6) - 40, [3, '等于'], { anim: 'fade', glow: [3, '六节'] }),
      fill('q4', [3, '六节'], '6'),
      lbl(1500, 700, '节', GREY, [1, '第几节'], { size: 48 })
    ]
  })

  /* ---------- 6 第二招：24 米井，上 8 滑 4 —— 画不下了 → 留出最后一天 ---------- */
  var BX = 560, BT = 170, BB = 770, H24 = 24
  function yb(v) { return BB - v * (BB - BT) / H24 }
  function barSeg(v1, v2, color, at, o) {
    o = o || {}
    return svg(BX - 70, yb(v2), 140, yb(v1) - yb(v2), '<rect x="3" y="3" width="134" height="' + (yb(v1) - yb(v2) - 6) + '" rx="8" fill="' + color + '" stroke="' + INK + '" stroke-width="4"/>', at, { anim: 'pop', glow: o.glow, out: o.out })
  }
  S.push({
    tag: '第二招 | 最后一天单独算',
    beats: [
      { sub: '井有 24 米深，白天爬 8 米，晚上滑 4 米。', say: '井有二十四米深，白天爬八米，晚上滑四米。' },
      { sub: '一天一天画？要画好久，画不下了！', say: '一天一天画？要画好久，画不下了！', pitch: '+5Hz' },
      { sub: '第二招：最后一天单独算。', say: '第二招：最后一天单独算。' },
      { sub: '最后一天白天爬 8 米就出去了，先把它留出来：', say: '最后一天，白天爬八米就出去了，先把它留出来：' },
      { sub: '24 − 8 = 16 米。', say: '二十四减八，等于十六米。' },
      { sub: '这 16 米，每天净爬 4 米：4 天。', say: '这十六米，每天净爬四米，四个四，四天。' },
      { sub: '再加最后 1 天：4 + 1 = **5** 天！', say: '再加最后一天：四加一，等于五天！', pause: 1 },
      { sub: '小心：24 里有 6 个 4，6 天就多算了！', say: '小心：二十四里有六个四，六天就多算了！', pause: 0.6 }
    ],
    els: [
      well(BX - 70, 140, BT, BB, H24, [0, 0.2]),
      lbl(BX + 230, BT - 10, '井口 24 米', GREY, [0, 0.3], { font: 'kai', size: 40 }),
      barSeg(16, 24, '#f6d365', [3, '留出来'], { glow: [3, '八米'] }),
      lbl(BX + 300, yb(20), '最后一天 8 米', ORANGE, [3, '留出来'], { size: 42 }),
      barSeg(0, 4, '#9fd3f0', [5, '四个四']),
      barSeg(4, 8, '#9fd3f0', [5, '四个四', 0.3]),
      barSeg(8, 12, '#9fd3f0', [5, '四个四', 0.6]),
      barSeg(12, 16, '#9fd3f0', [5, '四个四', 0.9]),
      lbl(BX + 200, yb(2), '1', BLUE, [5, '四个四'], { font: 'num', size: 40 }),
      lbl(BX + 200, yb(6), '2', BLUE, [5, '四个四', 0.3], { font: 'num', size: 40 }),
      lbl(BX + 200, yb(10), '3', BLUE, [5, '四个四', 0.6], { font: 'num', size: 40 }),
      lbl(BX + 200, yb(14), '4', BLUE, [5, '四个四', 0.9], { font: 'num', size: 40 }),
      lbl(BX + 200, yb(20) + 50, '5', RED, [6, '最后一天'], { font: 'num', size: 40 }),
      node(1460, 250, 520, '① 留出最后一天：24 − 8', RED, [4, '二十四减八'], { size: 38 }),
      flowArrow(1460, 290, 350, [5, '每天']),
      node(1460, 390, 520, '② 16 米，每天净爬 4：4 天', RED, [5, '每天'], { size: 38 }),
      flowArrow(1460, 430, 490, [6, '再加']),
      node(1460, 530, 520, '③ 再加 1 天：5 天', GREEN, [6, '再加'], { size: 38 }),
      { t: 'stamp', x: 1460, y: 690, s: '答：5 天', color: RED, size: 60, rot: -6, at: [6, '五天'] },
      lbl(1460, 815, '24 里 6 个 4 → 6 天 ✗', GREY, [7, '多算'], { size: 46 })
    ]
  })

  /* ---------- 7 过河：最后一趟不用回来 ---------- */
  function kids(n, x0, y0, cols, color, at, o) {
    var els = []
    for (var i = 0; i < n; i++) {
      var c = i % cols, r = Math.floor(i / cols)
      els.push({ t: 'item', k: 'kid' + (i % 6), x: x0 + c * 95, y: y0 + r * 115, size: 95, at: Array.isArray(at) ? at : at, out: o && o.out })
    }
    return els
  }
  S.push({
    tag: '第二招 | 过河也一样',
    beats: [
      { sub: '过河也一样：16 个小朋友，船每次坐 5 人，没有船工。', say: '过河也一样：十六个小朋友，船每次坐五人，没有船工。' },
      { sub: '每次要有 1 人把船划回来，一来一回只送过去 4 人。', say: '每次要有一个人把船划回来，一来一回，只送过去四人。' },
      { sub: '最后一次不用回来，先留出 5 人：16 − 5 = 11。', say: '最后一次不用回来，先留出五人：十六减五，等于十一。' },
      { sub: '11 人，每次 4 人，要 3 次；再加 1 次：**4** 次！', say: '十一人，每次四人，要三次；再加一次：四次！', pause: 1 }
    ],
    els: kids(16, 180, 250, 4, null, [0, '十六个']).concat([
      svg(640, 540, 330, 140, '<g transform="scale(1.27)"><path d="M10 20 H250 L220 95 H40 Z" fill="#c98b4e" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/><path d="M60 20V0M200 20V0" stroke="' + INK + '" stroke-width="4"/></g>', [0, '船']),
      lbl(805, 730, '坐 5 人', GREY, [0, '五人'], { size: 40 }),
      { t: 'harrow', x1: 1000, x2: 1220, y: 470, color: GREEN, at: [1, '一来一回'] },
      { t: 'harrow', x1: 1220, x2: 1000, y: 540, color: RED, at: [1, '划回来'] },
      lbl(1110, 420, '去 5 人', GREEN, [1, '一来一回'], { size: 38 }),
      lbl(1110, 600, '回 1 人', RED, [1, '划回来'], { size: 38 }),
      node(1560, 300, 460, '最后一次：5 人', RED, [2, '最后一次'], { size: 40 }),
      node(1560, 420, 460, '16 − 5 = 11', RED, [2, '十六减五'], { size: 40 }),
      node(1560, 540, 460, '11 人，每次 4 人：3 次', BLUE, [3, '要三次'], { size: 40 }),
      { t: 'stamp', x: 1560, y: 700, s: '答：4 次', color: RED, size: 60, rot: -6, at: [3, '四次'] }
    ])
  })

  /* ---------- 8 你来试 2：竹竿 11 节，上 3 滑 1（5 天） ---------- */
  S.push({
    tag: '第二招 | 你来试',
    beats: [
      { sub: '你来试：竹竿 11 节，白天爬 3 节，晚上滑 1 节，', say: '你来试：竹竿十一节，白天爬三节，晚上滑一节，', rate: '-6%' },
      { sub: '第几天能爬到竿顶？', say: '第几天能爬到竿顶？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '留出最后 3 节：11 − 3 = 8，每天净爬 2，要 4 天；', say: '留出最后三节：十一减三，等于八，每天净爬两节，要四天；' },
      { sub: '再加 1 天：第 **5** 天！', say: '再加一天：第五天！', pause: 1 }
    ],
    els: [
      { t: 'paper', x: 700, y: 450, w: 900, h: 420, at: [0, 0.2] },
      lbl(700, 330, '竹竿 11 节', INK, [0, '十一节'], { size: 56 }),
      lbl(700, 440, '白天 ↑ 3　晚上 ↓ 1', INK, [0, '晚上'], { size: 52 }),
      lbl(700, 560, '第几天到竿顶？', BLUE, [1, '第几天'], { size: 52 }),
      { t: 'slot', id: 'q8', x: 1500, y: 450, size: 220, at: [1, '第几天'] },
      { t: 'think', x: 960, y: 790, at: [2, '想一想', 0.5], from: 5, pulse: 'q8' },
      lbl(700, 700, '11 − 3 = 8，8 里 4 个 2', RED, [3, '十一减三'], { size: 46 }),
      lbl(700, 790, '4 + 1 = 5', RED, [4, '再加'], { size: 52 }),
      fill('q8', [4, '第五天'], '5'),
      lbl(1500, 610, '天', GREY, [1, '第几天'], { size: 48 })
    ]
  })

  /* ---------- 10 挑战：10 米井、上 4 滑 2，第 3 天傍晚（第一招，8） ---------- */
  S.push({
    tag: '挑战 | 这次用哪一招？',
    beats: [
      { sub: '挑战：井深 10 米，白天爬 4 米，晚上滑 2 米。', say: '挑战：井深十米，白天爬四米，晚上滑两米。', rate: '-6%' },
      { sub: '第 3 天傍晚，它爬到几米？用哪一招？', say: '第三天傍晚，它爬到几米？用哪一招？', rate: '-6%', pause: 5 },
      { sub: '问第几天在哪，用第一招：一天一天看。', say: '问第几天在哪，用第一招：一天一天看。' },
      { sub: '2 天净爬 2 + 2 = 4，第 3 天白天再爬 4：**8** 米！', say: '两天净爬，二加二等于四，第三天白天再爬四米：八米！', pause: 1 }
    ],
    els: [
      { t: 'paper', x: 700, y: 430, w: 900, h: 400, at: [0, 0.2] },
      lbl(700, 320, '井深 10 米', INK, [0, '十米'], { size: 56 }),
      lbl(700, 430, '白天 ↑ 4　晚上 ↓ 2', INK, [0, '晚上'], { size: 52 }),
      lbl(700, 540, '第 3 天傍晚在几米？', BLUE, [1, '傍晚'], { size: 52 }),
      { t: 'slot', id: 'q10', x: 1500, y: 430, size: 220, at: [1, '几米'] },
      { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q10' },
      lbl(700, 690, '第一招：一天一天看', RED, [2, '第一招'], { size: 48 }),
      lbl(1500, 600, '米', GREY, [1, '几米'], { size: 48 }),
      fill('q10', [3, '八米'], '8'),
      lbl(1500, 700, '2 + 2 + 4 = 8', RED, [3, '再爬'], { size: 48 })
    ]
  })

  /* ---------- 11 口诀 ---------- */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '白天爬，晚上滑，一天只算爬多少；', say: '白天爬，晚上滑，一天只算爬多少；', rate: '-15%' },
      { sub: '最后一天不下滑，先把它来留出来。', say: '最后一天不下滑，先把它来留出来。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 470, w: 1500, h: 420, at: 0 },
      { t: 'chant', x: 960, y: 390, s: '白天爬，晚上滑，一天只算爬多少；', color: BLUE, size: 60, at: 1 },
      { t: 'chant', x: 960, y: 560, s: '最后一天不下滑，先把它来留出来。', color: RED, size: 60, at: 2 }
    ]
  })

  /* ---------- 12 结尾 ---------- */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天学会了两招：一天一天看；最后一天单独算。', say: '今天学会了两招：一天一天看；最后一天单独算。' },
      { sub: '想一想：井要是 6 米深，小蜗牛要几天？', say: '想一想：井要是六米深，小蜗牛要几天？', rate: '-6%', pause: 1 },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: mapEls(0, true).concat([
      { t: 'check', x: MX[0] + 290, y: 590, at: 0, sfx: false },
      { t: 'check', x: MX[1] + 290, y: 590, at: 0, sfx: false },
      svg(780, 730, 130, 85, '<g transform="scale(1.3)">' + snailHTML(false) + '</g>', [1, '想一想'], { out: [2, 0] }),
      lbl(1120, 770, '6 米？', RED, [1, '六米'], { size: 56, out: [2, 0] }),
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
    return { tag: '蜗牛爬井 | 学到哪了', beats: [{ sub: say, say: say, pitch: '+5Hz', pause: 0.4 }], els: e }
  }
  /* 0 开场 1 引入 2 地图 3 第一招 4 你来试1 | 5 第二招 6 过河 7 你来试2 | 8 挑战 9 口诀 10 结尾 */
  S.splice(8, 0, mapScene(2))
  S.splice(5, 0, mapScene(1))

  S.cover = {
    tag: null,
    els: [
      { t: 'txt', x: 960, y: 130, s: '奥数 · L1 补充 · B09 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
      { t: 'tape', x: 960, y: 270, s: '蜗牛爬井', size: 120, at: 0 },
      { t: 'txt', x: 960, y: 410, s: '最后一天不下滑', size: 58, color: RED, font: 'kl', at: 0 },
      svg(720, 520, 480, 320, '<g transform="scale(4.6)">' + snailHTML(false) + '</g>', 0),
      { t: 'txt', x: 960, y: 960, s: '一天一天看 · 最后一天单独算', size: 50, color: GREEN, font: 'kl', at: 0 }
    ]
  }
  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
