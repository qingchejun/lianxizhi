/* B08 叠加覆盖：翻转问题 · 讲解视频分镜 v1（L1 补充第八课，新结构，两招）
 * 开场直接进题（不提上一课、结尾不预告）。
 * 引入：卡片上穿着一根绳子，向左翻过来（卡片真的翻面）：左右反了，前面的绳子跑到后面。
 * 先认识：实线 = 绳子在卡片前面，虚线 = 在后面；每穿过一个洞换一次。
 * 知识地图：翻转问题 → 翻一次（方向反、前后换）/ 翻两次（一次一次翻）。
 * 第一招：向左翻选哪张（A 上下反了、D 没翻 → 排除；C 实线没变虚线 → 排除；选 B，翻过来验证）。你来试：向下翻（C）。
 * 第二招：先向左、再向上（卡片翻两次：左右反、上下也反，前后换回来，选 D）。你来试：先右再下（A）。
 * 挑战：向右翻，用哪一招（C）。口诀 → 知识地图 → 拓展：向左翻两次会怎样？→ 去练习纸。
 * 题目取自练习纸出题器（tools/video/lessons/fanzhuan/extract.js 导出 DATA）。 */
var SCENES = (function () {
  var RED = '#d9443a', BLUE = '#3f7fc4', GREEN = '#3d9a5c', GREY = '#8a7f72', ORANGE = '#e09a2b', INK = '#2b2420'
  var DATA = /*DATA*/null

  function lbl(x, y, s, color, at, o) {
    o = o || {}
    return { t: 'txt', id: o.id, x: x, y: y, s: s, size: o.size || 40, font: o.font || 'kl', color: color || GREY, at: at, out: o.out, anim: o.anim, glow: o.glow, glow2: o.glow2, overlapOk: o.overlapOk }
  }
  function fill(id, at, val) { return { t: 'fill', id: id, at: at, val: val } }
  function svg(x0, y0, w, h, html, at, o) {
    o = o || {}
    return { t: 'svg', id: o.id, x: x0 + w / 2, y: y0 + h / 2, w: w, h: h, html: html, at: at, out: o.out, glow: o.glow, glow2: o.glow2, anim: o.anim, dim: o.dim, fold: o.fold, overlapOk: o.overlapOk !== undefined ? o.overlapOk : true }
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
  function harrow(x1, x2, y, at) { return { t: 'harrow', x1: x1, x2: x2, y: y, color: GREY, at: at } }
  function line2(x1, y1, x2, y2, at) { return { t: 'seg', x1: x1, y1: y1, x2: x2, y2: y2, color: GREY, sw: 5, at: at } }
  function cross(cx, cy, r, at) {
    var html = '<path d="M8 8L' + (r * 2 - 8) + ' ' + (r * 2 - 8) + 'M' + (r * 2 - 8) + ' 8L8 ' + (r * 2 - 8) + '" stroke="' + RED + '" stroke-width="10" stroke-linecap="round"/>'
    return svg(cx - r, cy - r, r * 2, r * 2, html, at, { anim: 'pop' })
  }
  /* 锚点加几秒 */
  function plus(a, s) { return typeof a === 'number' ? [a, s] : (typeof a[1] === 'string' ? [a[0], a[1], (a[2] || 0) + s] : [a[0], a[1] + s]) }

  /* ---------- 卡片和绳子（坐标和练习纸出题器一样） ---------- */
  var N = 3, CELL = 16, PAD = 9, CW = N * CELL + PAD * 2, OUT = 8, FULL = CW + OUT * 2
  function hole(r, c) { return [PAD + c * CELL + CELL / 2, PAD + r * CELL + CELL / 2] }
  function edge(r, c, side) {
    var h = hole(r, c)
    if (side === 'L') return [[0, h[1]], [-OUT, h[1]]]
    if (side === 'R') return [[CW, h[1]], [CW + OUT, h[1]]]
    if (side === 'T') return [[h[0], 0], [h[0], -OUT]]
    return [[h[0], CW], [h[0], CW + OUT]]
  }
  function trans(rp, mx, my, sw) {
    var fs = { L: mx ? 'R' : 'L', R: mx ? 'L' : 'R', T: my ? 'B' : 'T', B: my ? 'T' : 'B' }
    return { path: rp.path.map(function (p) { return [my ? N - 1 - p[0] : p[0], mx ? N - 1 - p[1] : p[1]] }), first: sw ? 1 - rp.first : rp.first, a: fs[rp.a], b: fs[rp.b] }
  }
  var ROPE = '#8a4b22'
  /* 卡片 html：本地坐标 0..FULL*Z，hl = 要亮起来的段（'front' / 'back'） */
  function cardHTML(rp, Z, hl) {
    function P(p) { return ((p[0] + OUT) * Z).toFixed(1) + ' ' + ((p[1] + OUT) * Z).toFixed(1) }
    var s = '<rect x="' + OUT * Z + '" y="' + OUT * Z + '" width="' + CW * Z + '" height="' + CW * Z + '" rx="' + 3 * Z + '" fill="#9fd3f0" stroke="' + INK + '" stroke-width="' + 0.9 * Z + '"/>'
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var h = hole(r, c)
      s += '<circle cx="' + ((h[0] + OUT) * Z).toFixed(1) + '" cy="' + ((h[1] + OUT) * Z).toFixed(1) + '" r="' + 5 * Z + '" fill="#fffaf0" stroke="' + INK + '" stroke-width="' + 0.6 * Z + '"/>'
    }
    var ea = edge(rp.path[0][0], rp.path[0][1], rp.a), last = rp.path[rp.path.length - 1], eb = edge(last[0], last[1], rp.b)
    var pts = [ea[0]].concat(rp.path.map(function (q) { return hole(q[0], q[1]) })).concat([eb[0]])
    var back = '', front = ''
    for (var i = 0; i + 1 < pts.length; i++) {
      var d = 'M' + P(pts[i]) + 'L' + P(pts[i + 1])
      if ((rp.first + i) % 2) back += d
      else front += d
    }
    var wB = 1.2 * Z, wF = 1.8 * Z
    if (back) s += '<path d="' + back + '" fill="none" stroke="' + ROPE + '" stroke-width="' + wB + '" stroke-dasharray="' + 2.6 * Z + ' ' + 2 * Z + '" stroke-linecap="round"' + (hl === 'back' ? ' style="filter:drop-shadow(0 0 ' + 2 * Z + 'px #f2c14e)"' : '') + '/>'
    if (front) s += '<path d="' + front + '" fill="none" stroke="' + ROPE + '" stroke-width="' + wF + '" stroke-linecap="round"' + (hl === 'front' ? ' style="filter:drop-shadow(0 0 ' + 2 * Z + 'px #f2c14e)"' : '') + '/>'
    s += '<path d="M' + P(ea[0]) + 'L' + P(ea[1]) + 'M' + P(eb[0]) + 'L' + P(eb[1]) + '" fill="none" stroke="' + ROPE + '" stroke-width="' + wF + '" stroke-linecap="round"/>'
    return s
  }
  function card(rp, Z, cx, cy, at, o) {
    o = o || {}
    var S = FULL * Z
    return svg(cx - S / 2, cy - S / 2, S, S, cardHTML(rp, Z, o.hl), at, { out: o.out, glow: o.glow, glow2: o.glow2, anim: o.anim, fold: o.fold, dim: o.dim })
  }
  /*
   * 卡片真的翻面：steps = [[轴 'x'|'y', 锚点], …]。
   * 每一步：旧卡片绕中线翻到一半（变成一条线）后消失；接着「换了前后、还没镜像」的卡片继续翻完（scale -1 正好镜像），
   * 翻完换成直接画好的新样子（看上去一样，后面才能再翻）。
   */
  function flipCard(rp, Z, cx, cy, at0, steps, o) {
    o = o || {}
    var S = FULL * Z, els = [], cur = rp
    var curEl = card(cur, Z, cx, cy, at0, { glow: o.glow0 })
    els.push(curEl)
    steps.forEach(function (st, k) {
      var ax = st[0], a = st[1]
      curEl.fold = [[a, ax, S / 2, S / 2, 1.2]]
      curEl.out = plus(a, 0.55)
      var mid = trans(cur, 0, 0, 1)
      els.push(card(mid, Z, cx, cy, plus(a, 0.6), { anim: 'none', fold: [[a, ax, S / 2, S / 2, 1.2]], out: plus(a, 1.3) }))
      cur = trans(cur, ax === 'x' ? 1 : 0, ax === 'y' ? 1 : 0, 1)
      curEl = card(cur, Z, cx, cy, plus(a, 1.22), { anim: 'none', glow: (o.glowEnd || [])[k], out: k === steps.length - 1 ? o.out : undefined })
      els.push(curEl)
    })
    return els
  }
  /* 图 1 + A～D：opts 按出题器的 order（0 正确、1/2/3 三种错）算出来 */
  function kindsOf(q) {
    if (q.dir.length === 2) return [[1, 1, 0], [1, 1, 1], [1, 0, 1], [0, 1, 1]]
    var mx = q.dir === 'L' || q.dir === 'R' ? 1 : 0, my = 1 - mx
    return [[mx, my, 1], [mx, my, 0], [0, 0, 1], [my, mx, 1]]
  }
  function optRopes(q) {
    var K = kindsOf(q)
    return q.order.map(function (k) { return trans(q, K[k][0], K[k][1], K[k][2]) })
  }
  var OX = [830, 1120, 1410, 1700], OY = 370, OZ = 3.3
  function options(q, at, o) {
    o = o || {}
    var els = []
    optRopes(q).forEach(function (rp, i) {
      els.push(card(rp, OZ, OX[i], OY, at, { glow: (o.glow || [])[i], glow2: (o.glow2 || [])[i], dim: (o.dim || [])[i] }))
      els.push(lbl(OX[i], OY + FULL * OZ / 2 + 34, 'ABCD'[i], INK, at, { font: 'num', size: 48 }))
    })
    return els
  }

  var S = []

  /* ---------- 0 开场 ---------- */
  var DEMO = { path: [[0, 0], [1, 1], [1, 2]], first: 0, a: 'L', b: 'R' }
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '今天，我们来学翻转问题！', say: '今天，我们来学翻转问题！' }
    ],
    els: [
      { t: 'txt', x: 960, y: 200, s: '奥数 · L1 补充 · B08', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
      { t: 'tape', x: 960, y: 330, s: '叠加覆盖：翻转问题', size: 100, at: [0, 0.2] },
      card(DEMO, 4, 960, 640, [1, '翻转'])
    ]
  })

  /* ---------- 1 引入：卡片向左翻 ---------- */
  S.push({
    tag: '翻转问题',
    beats: [
      { sub: '卡片上穿着一根绳子。', say: '卡片上，穿着一根绳子。' },
      { sub: '把它向左翻过来，会变成什么样？', say: '把它向左翻过来，会变成什么样？', rate: '-6%' },
      { sub: '翻！', say: '翻！', pitch: '+8Hz', pause: 1.2 },
      { sub: '左边的跑到了右边，上下没有变。', say: '左边的跑到了右边，上下没有变。' },
      { sub: '原来在前面的绳子，翻过去跑到后面了！', say: '原来在前面的绳子，翻过去，跑到后面了！', pitch: '+5Hz', pause: 0.6 }
    ],
    els: flipCard(DEMO, 6, 620, 470, [0, 0.2], [['x', [2, '翻']]], { glowEnd: [[3, '左边']] }).concat([
      card(DEMO, 3, 1480, 330, [3, '左边'], { glow: [4, '原来'] }),
      lbl(1480, 520, '原来', GREY, [3, '左边'], { font: 'kai', size: 40 }),
      lbl(1480, 640, '左右相反，上下不变', BLUE, [3, '上下'], { size: 50 }),
      lbl(1480, 740, '前面的 → 后面', RED, [4, '后面'], { size: 50 })
    ])
  })

  /* ---------- 2 先认识：实线在前，虚线在后 ---------- */
  S.push({
    tag: '先认识',
    beats: [
      { sub: '在卡片前面的绳子，画成实线；', say: '在卡片前面的绳子，画成实线；' },
      { sub: '穿到卡片后面的绳子，画成虚线。', say: '穿到卡片后面的绳子，画成虚线。' },
      { sub: '每穿过一个洞，就换一次前后。', say: '每穿过一个洞，就换一次前后。', pause: 0.6 }
    ],
    els: [
      card(DEMO, 6, 620, 470, [0, 0.1], { out: [0, '实线', 0.4] }),
      card(DEMO, 6, 620, 470, [0, '实线', 0.2], { anim: 'none', hl: 'front', out: [1, '后面'] }),
      card(DEMO, 6, 620, 470, [1, '后面'], { anim: 'none', hl: 'back', out: [2, 0.2] }),
      card(DEMO, 6, 620, 470, [2, 0.1], { anim: 'none' }),
      svg(1180, 290, 200, 40, '<path d="M10 20H190" stroke="' + ROPE + '" stroke-width="11" stroke-linecap="round"/>', [0, '实线']),
      lbl(1560, 310, '实线：在前面', INK, [0, '实线'], { size: 50 }),
      svg(1180, 430, 200, 40, '<path d="M10 20H190" stroke="' + ROPE + '" stroke-width="7" stroke-dasharray="16 12" stroke-linecap="round"/>', [1, '虚线']),
      lbl(1560, 450, '虚线：在后面', INK, [1, '虚线'], { size: 50 }),
      lbl(1440, 620, '穿过一个洞，换一次', BLUE, [2, '换一次'], { size: 50 })
    ]
  })

  /* ---------- 3 知识地图 ---------- */
  var MX = [620, 1300]
  function mapEls(at, lit) {
    return [
      node(960, 210, 330, '翻转问题', INK, at, { size: 46 }),
      line2(960, 252, MX[0], 360, lit ? at : [0, '翻一次']),
      line2(960, 252, MX[1], 360, lit ? at : [0, '翻两次']),
      node(MX[0], 405, 520, '卡片翻一次', BLUE, lit ? at : [0, '翻一次'], { size: 44 }),
      node(MX[1], 405, 520, '先这样，再那样', RED, lit ? at : [0, '翻两次'], { size: 44 }),
      flowArrow(MX[0], 452, 540, lit ? at : [1, '方向反']),
      flowArrow(MX[1], 452, 540, lit ? at : [1, '一次一次']),
      node(MX[0], 595, 520, '① 方向反、前后换', BLUE, lit ? at : [1, '方向反'], { size: 42 }),
      node(MX[1], 595, 520, '② 一次一次翻', RED, lit ? at : [1, '一次一次'], { size: 42 })
    ]
  }
  S.push({
    tag: '翻转问题 | 两招',
    beats: [
      { sub: '卡片可能翻一次，也可能翻两次。', say: '卡片可能翻一次，也可能翻两次。' },
      { sub: '两招：方向反、前后换；一次一次翻！', say: '两招：方向反、前后换；一次一次翻！' }
    ],
    els: mapEls(0, false)
  })

  /* ---------- 4 第一招：向左翻选哪张（A 上下反、D 没翻、C 没换 → B） ---------- */
  var EX = DATA.ex, FX = 960
  S.push({
    tag: '第一招 | 翻一次',
    beats: [
      { sub: '第一招：翻一次。图 1 向左翻，会变成哪一张？', say: '第一招：翻一次。图一向左翻，会变成哪一张？', rate: '-6%' },
      { sub: '先看方向：向左翻，左右相反，上下不变。', say: '先看方向：向左翻，左右相反，上下不变。' },
      { sub: 'A 是上下反了，D 根本没翻，都不对。', say: 'A是上下反了，D根本没翻，都不对。' },
      { sub: 'B 和 C 方向都对，再看细节：', say: 'B和C方向都对，再看细节：' },
      { sub: '原来的实线，翻过去要变成虚线。C 没变，不对！', say: '原来的实线，翻过去要变成虚线。C没变，不对！' },
      { sub: '选 B！把图 1 翻过来看看——', say: '选B！把图一翻过来看看——', pause: 1.2 },
      { sub: '和 B 一模一样！', say: '和B一模一样！', pitch: '+5Hz', pause: 1 },
      { sub: '小心：方向对、实线虚线没换的那张最像！', say: '小心：方向对了、实线虚线没换的那张，最像！', pause: 0.6 }
    ],
    els: flipCard(EX, 5.4, 330, 400, [0, 0.2], [['x', [5, '翻过来']]]).concat(options(EX, [0, 0.4], {
      glow: [[2, 'A是'], [6, '一模一样'], [4, 'C没变'], [2, 'D根本']],
      glow2: [undefined, undefined, [7, '最像'], undefined]
    })).concat([
      lbl(330, 665, '图 1（向左翻）', GREY, [0, 0.3], { font: 'kai', size: 40 }),
      cross(OX[0], OY, 115, [2, '不对']),
      cross(OX[3], OY, 115, [2, '不对']),
      cross(OX[2], OY, 115, [4, '不对']),
      node(560, 770, 300, '往哪翻？', BLUE, [1, '先看方向'], { size: 40 }),
      harrow(720, 790, 770, [1, '左右相反']),
      node(980, 770, 340, '那边反过来', BLUE, [1, '左右相反'], { size: 40 }),
      harrow(1160, 1230, 770, [3, '细节']),
      node(1420, 770, 360, '实线 ⇄ 虚线', BLUE, [3, '细节'], { size: 40 }),
      { t: 'check', x: OX[1] + 140, y: OY - 130, at: [6, '一模一样'] },
      { t: 'stamp', x: 1720, y: 840, s: '答：选 B', color: RED, size: 56, rot: -6, at: [5, '选B'] }
    ])
  })

  /* ---------- 5 你来试 1：向下翻（A 左右反、B 没翻、D 没换 → C） ---------- */
  var T1 = DATA.try1
  S.push({
    tag: '第一招 | 你来试',
    beats: [
      { sub: '你来试：图 1 向下翻，会变成哪一张？', say: '你来试：图一向下翻，会变成哪一张？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '向下翻：上下相反。A 左右反了，B 没翻。', say: '向下翻：上下相反。A是左右反了，B没翻。' },
      { sub: 'D 的实线没变虚线。选 **C**！', say: 'D的实线没变成虚线。选C！', pause: 1 }
    ],
    els: [card(T1, 5.4, 330, 400, [0, 0.2])].concat(options(T1, [0, 0.4], { glow: [[2, 'A是'], [2, 'B没翻'], [3, '选C'], [3, 'D的']] })).concat([
      lbl(330, 665, '图 1（向下翻）', GREY, [0, 0.3], { font: 'kai', size: 40 }),
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5 },
      cross(OX[0], OY, 115, [2, '左右反']),
      cross(OX[1], OY, 115, [2, '没翻']),
      cross(OX[3], OY, 115, [3, '虚线']),
      { t: 'check', x: OX[2] + 140, y: OY - 130, at: [3, '选C'] },
      { t: 'stamp', x: 1720, y: 840, s: '答：选 C', color: RED, size: 56, rot: -6, at: [3, '选C', 0.3] }
    ])
  })

  /* ---------- 7 第二招：先向左、再向上（一次一次翻 → D） ---------- */
  var E2 = DATA.ex2
  S.push({
    tag: '第二招 | 翻两次',
    beats: [
      { sub: '要是先向左翻，再向上翻呢？', say: '要是先向左翻，再向上翻呢？', rate: '-6%' },
      { sub: '第二招：一次一次翻！', say: '第二招：一次一次翻！' },
      { sub: '第一次向左翻：左右反了，实线变虚线。', say: '第一次向左翻：左右反了，实线变虚线。', pause: 1 },
      { sub: '第二次向上翻：上下也反了，虚线又变回实线！', say: '第二次向上翻：上下也反了，虚线又变回实线！', pause: 1 },
      { sub: '左右、上下都反，实线还是实线：选 D！', say: '左右、上下都反，实线还是实线：选D！', pause: 1 },
      { sub: '小心：前后换了两次，就换回来了。', say: '小心：前后换了两次，就又换回来了。', pause: 0.6 }
    ],
    els: flipCard(E2, 5.4, 330, 400, [0, 0.2], [['x', [2, '第一次', 0.6]], ['y', [3, '第二次', 0.6]]]).concat(options(E2, [0, 0.4], { glow: [undefined, undefined, undefined, [4, '选D']] })).concat([
      lbl(330, 665, '图 1（先左，再上）', GREY, [0, 0.3], { font: 'kai', size: 40 }),
      node(560, 770, 360, '① 左右反 + 换', RED, [2, '左右反了'], { size: 40 }),
      harrow(750, 820, 770, [3, '上下']),
      node(1020, 770, 360, '② 上下反 + 换', RED, [3, '上下'], { size: 40 }),
      harrow(1210, 1280, 770, [4, '实线还是']),
      node(1440, 770, 300, '换回来了', GREEN, [4, '实线还是'], { size: 40 }),
      { t: 'check', x: OX[3] + 140, y: OY - 130, at: [4, '选D'] },
      { t: 'stamp', x: 1720, y: 840, s: '答：选 D', color: RED, size: 56, rot: -6, at: [4, '选D', 0.3] }
    ])
  })

  /* ---------- 8 你来试 2：先右、再下（A） ---------- */
  var T2 = DATA.try2
  S.push({
    tag: '第二招 | 你来试',
    beats: [
      { sub: '你来试：先向右翻，再向下翻，变成哪一张？', say: '你来试：先向右翻，再向下翻，变成哪一张？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '左右反、上下也反，前后换了两次又换回来。', say: '左右反、上下也反，前后换了两次，又换回来。' },
      { sub: '实线还是实线，选 **A**！', say: '实线还是实线，选A！', pause: 1 }
    ],
    els: [card(T2, 5.4, 330, 400, [0, 0.2])].concat(options(T2, [0, 0.4], { glow: [[3, '选A']] })).concat([
      lbl(330, 665, '图 1（先右，再下）', GREY, [0, 0.3], { font: 'kai', size: 40 }),
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5 },
      { t: 'check', x: OX[0] + 140, y: OY - 130, at: [3, '选A'] },
      { t: 'stamp', x: 1720, y: 840, s: '答：选 A', color: RED, size: 56, rot: -6, at: [3, '选A', 0.3] }
    ])
  })

  /* ---------- 10 挑战：向右翻，用哪一招（C） ---------- */
  var CH = DATA.chal
  S.push({
    tag: '挑战 | 这次用哪一招？',
    beats: [
      { sub: '挑战：图 1 向右翻，变成哪一张？', say: '挑战：图一向右翻，变成哪一张？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', rate: '-6%', pause: 5 },
      { sub: '只翻一次：第一招，方向反、前后换。', say: '只翻一次，用第一招：方向反、前后换。' },
      { sub: 'A 上下反了，B 没翻，D 实线没变虚线：选 C！', say: 'A上下反了，B没翻，D的实线没变虚线：选C！', pause: 1 }
    ],
    els: [card(CH, 5.4, 330, 400, [0, 0.2])].concat(options(CH, [0, 0.4], { glow: [undefined, undefined, [3, '选C']] })).concat([
      lbl(330, 665, '图 1（向右翻）', GREY, [0, 0.3], { font: 'kai', size: 40 }),
      { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5 },
      lbl(1265, 640, '第一招：方向反、前后换', BLUE, [2, '第一招'], { size: 46 }),
      cross(OX[0], OY, 115, [3, '上下反']),
      cross(OX[1], OY, 115, [3, '没翻']),
      cross(OX[3], OY, 115, [3, '没变']),
      { t: 'check', x: OX[2] + 140, y: OY - 130, at: [3, '选C'] },
      { t: 'stamp', x: 1720, y: 840, s: '答：选 C', color: RED, size: 56, rot: -6, at: [3, '选C', 0.3] }
    ])
  })

  /* ---------- 11 口诀 ---------- */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '往哪翻哪边反，另一边不变；', say: '往哪翻，哪边反，另一边不变；', rate: '-15%' },
      { sub: '前面翻到后面，实线变虚线。', say: '前面翻到后面，实线变虚线。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 470, w: 1500, h: 420, at: 0 },
      { t: 'chant', x: 960, y: 390, s: '往哪翻哪边反，另一边不变；', color: BLUE, size: 62, at: 1 },
      { t: 'chant', x: 960, y: 560, s: '前面翻到后面，实线变虚线。', color: RED, size: 62, at: 2 }
    ]
  })

  /* ---------- 12 结尾 ---------- */
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天学会了两招：方向反、前后换；一次一次翻。', say: '今天学会了两招：方向反、前后换；一次一次翻。' },
      { sub: '想一想：向左翻，再向左翻，卡片会变成什么样？', say: '想一想：向左翻，再向左翻，卡片会变成什么样？', rate: '-6%', pause: 1 },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: mapEls(0, true).concat([
      { t: 'check', x: MX[0] + 290, y: 590, at: 0, sfx: false },
      { t: 'check', x: MX[1] + 290, y: 590, at: 0, sfx: false },
      card(DEMO, 2.2, 760, 760, [1, '想一想'], { out: [2, 0] }),
      lbl(1060, 760, '← ← ?', RED, [1, '再向左'], { size: 56, out: [2, 0] }),
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
    return { tag: '翻转问题 | 学到哪了', beats: [{ sub: say, say: say, pitch: '+5Hz', pause: 0.4 }], els: e }
  }
  /* 0 开场 1 引入 2 先认识 3 地图 4 第一招 5 你来试1 | 6 第二招 7 你来试2 | 8 挑战 9 口诀 10 结尾 */
  S.splice(8, 0, mapScene(2))
  S.splice(6, 0, mapScene(1))

  S.cover = {
    tag: null,
    els: [
      { t: 'txt', x: 960, y: 130, s: '奥数 · L1 补充 · B08 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
      { t: 'tape', x: 960, y: 270, s: '叠加覆盖：翻转问题', size: 110, at: 0 },
      { t: 'txt', x: 960, y: 410, s: '往哪翻，哪边反', size: 58, color: RED, font: 'kl', at: 0 },
      card(DEMO, 4.2, 600, 700, 0),
      { t: 'txt', x: 960, y: 700, s: '→ 翻 →', size: 60, color: GREY, font: 'kl', at: 0 },
      card(trans(DEMO, 1, 0, 1), 4.2, 1320, 700, 0),
      { t: 'txt', x: 960, y: 960, s: '方向反 · 前后换', size: 50, color: GREEN, font: 'kl', at: 0 }
    ]
  }
  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
