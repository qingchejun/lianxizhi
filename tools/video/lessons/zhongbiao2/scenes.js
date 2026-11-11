/* B04 认识钟表：几时几分 · 讲解视频分镜 v1（L1 补充第四课，新结构，样板 zhongbiao）
 * 开场直接进题（不提上一课、结尾不预告）。B03 讲过的认针、整时半时不再讲。
 * 引入：7:20 的钟，分针不指 12 也不指 6 → 认识大格小格（12 大格、1 大格 = 5 小格、60 小格、1 小格 = 1 分、1 时 = 60 分）
 * → 知识地图（给了钟 / 给了时刻和空钟面 / 好几个钟 → 读几时几分、画几时几分、排先后）
 * 第一招 读：7:20（5 个 5 个数）；4:13（先数到 2 是 10，再接着数 11、12、13）。小心：5:55 不是 6:55；3:05 补 0。你来试：10:08。
 * 第二招 画：3:40（分针指 8，时针快到 4、靠近 4；分少刚过、30 左右中间、分多快到下一个数）。你来试：画 6:10。
 * 第三招 排先后：① 画画 2:15 ② 踢球 12:40 ③ 看书 1:50 → ② ③ ①（12 时最早）。你来试：① 3:05 ② 2:55 ③ 4:20 → ② ① ③。
 * 挑战：哪个钟是 8:10？① 8:50 ② 8:10 ③ 7:10 → ②。口诀 → 知识地图 → 拓展：5:58 再过 2 分是几时几分？→ 去练习纸。 */
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
  /* 钟：time [时, 分]；turn / mAt / hAt / glowNums / sweep / outer / ticks 见 render.html 的 clock */
  function clock(x, y, size, time, at, o) {
    o = o || {}
    return { t: 'clock', id: o.id, x: x, y: y, size: size, time: time, turn: o.turn, mAt: o.mAt, hAt: o.hAt, glowNums: o.glowNums,
      sweep: o.sweep, outer: o.outer, ticks: o.ticks,
      at: at, out: o.out, glow: o.glow, glow2: o.glow2, dim: o.dim, overlapOk: o.overlapOk }
  }
  function digi(x, y, s, at, o) {
    o = o || {}
    var w = o.w || 260, h = o.h || 120
    var html = '<rect x="4" y="4" width="' + (w - 8) + '" height="' + (h - 8) + '" rx="18" fill="#3a332d" stroke="' + INK + '" stroke-width="5"/>' +
      '<text x="' + w / 2 + '" y="' + (h / 2 + h * 0.2) + '" font-family="Num" font-weight="700" font-size="' + h * 0.56 + '" text-anchor="middle" fill="#ffe08a">' + s + '</text>'
    return svg(x - w / 2, y - h / 2, w, h, html, at, { out: o.out, glow: o.glow, anim: 'pop' })
  }
  function cross(x, y, at, o) {
    var html = '<path class="ap" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" d="M14 14 L126 126 M126 14 L14 126" fill="none" stroke="' + RED + '" stroke-width="12" stroke-linecap="round"/>'
    return svg(x - 70, y - 70, 140, 140, html, at, { draw: true, dur: 0.5, out: (o || {}).out })
  }
  function circ(i) { return ['①', '②', '③', '④'][i] }
  /* 外圈 5、10、15……：k 从 1 到 n，从锚点起每隔 d 秒写一个 */
  function outerSeq(n, b, kw, d, t0) {
    var out = []
    for (var k = 1; k <= n; k++) out.push([[b, kw, (t0 || 0) + (k - 1) * d], k])
    return out
  }

  var S = []

  /* 0 开场 */
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '今天，我们来认识钟表：几时几分！', say: '今天，我们来认识钟表：几时几分！' }
    ],
    els: [
      { t: 'txt', x: 960, y: 230, s: '奥数 · L1 补充 · B04', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
      { t: 'tape', x: 960, y: 370, s: '认识钟表：几时几分', size: 104, at: [0, 0.2] },
      clock(960, 640, 340, [10, 10], [1, '认识钟表'], { turn: [[[1, '几时几分'], 7, 20]] })
    ]
  })

  /* 1 引入：7:20，分针不指 12 也不指 6 */
  S.push({
    tag: '认识钟表',
    beats: [
      { sub: '这个钟，分针不指 12，也不指 6。', say: '这个钟，长长的分针不指十二，也不指六。' },
      { sub: '它是几时几分？秘密藏在小格子里！', say: '它是几时几分？秘密就在小格子里！', rate: '-4%' }
    ],
    els: [
      clock(760, 500, 500, [7, 20], [0, 0.2], { glow: [0, '分针'], ticks: [[[1, '小格子'], 0, 59, 0.025]] }),
      lbl(1380, 360, '不指 12', RED, [0, '十二'], { size: 54 }),
      lbl(1380, 470, '也不指 6', RED, [0, '六'], { size: 54 }),
      lbl(1380, 640, '？', RED, [1, '几时几分'], { size: 120 })
    ]
  })

  /* 2 认识大格、小格 */
  var nums = []
  for (var k = 1; k <= 12; k++) nums.push([[0, '十二个', (k - 1) * 0.15], k, 0.5])
  S.push({
    tag: '认识钟表 | 大格和小格',
    beats: [
      { sub: '12 个数，把一圈分成 12 个大格。', say: '十二个数，把一圈分成十二个大格。' },
      { sub: '每个大格里，有 5 个小格。', say: '每个大格里，有五个小格。' },
      { sub: '一圈一共 60 个小格。', say: '一圈，一共有六十个小格。' },
      { sub: '分针走 1 小格是 1 分；走一圈 60 分，就是 1 时。', say: '分针走一小格，是一分；走一整圈，六十分，就是一时。', pause: 0.3 }
    ],
    els: [
      clock(640, 500, 580, [12, 0], [0, 0.2], {
        glowNums: nums,
        ticks: [[[1, '五个小格'], 1, 5, 0.32], [[2, '一圈'], 6, 60, 0.03]],
        sweep: [[[1, '五个小格'], 5, 1.6], [[2, '一圈'], 60, 1.8]],
        turn: [[[3, '一小格'], 12, 1, 0.5], [[3, '一整圈'], 1, 0, 2.6]]
      }),
      lbl(1360, 290, '12 个大格', INK, [0, '大格'], { size: 50 }),
      lbl(1360, 400, '1 大格 = 5 小格', BLUE, [1, '五个小格'], { size: 50 }),
      lbl(1360, 510, '一圈 60 小格', BLUE, [2, '六十'], { size: 50 }),
      lbl(1360, 650, '1 小格 = 1 分', RED, [3, '一分'], { size: 50 }),
      lbl(1360, 760, '1 时 = 60 分', RED, [3, '一时'], { size: 56, glow: [3, '一时', 0.3] })
    ]
  })

  /* 3 知识地图 */
  var MX = [400, 960, 1520]
  function mapEls(at, lit) {
    return [
      node(960, 210, 340, '几时几分', INK, at, { size: 50 }),
      line2(960, 252, MX[0], 360, lit ? at : [0, '给了钟']),
      line2(960, 252, MX[1], 360, lit ? at : [0, '给了时刻']),
      line2(960, 252, MX[2], 360, lit ? at : [0, '好几个钟']),
      node(MX[0], 405, 470, '给了钟，问几时几分', BLUE, lit ? at : [0, '给了钟'], { size: 42 }),
      node(MX[1], 405, 470, '给了时刻和空钟面', RED, lit ? at : [0, '给了时刻'], { size: 42 }),
      node(MX[2], 405, 470, '好几个钟，比先后', GREEN, lit ? at : [0, '好几个钟'], { size: 42 }),
      flowArrow(MX[0], 452, 540, lit ? at : [1, 0.3]),
      flowArrow(MX[1], 452, 540, lit ? at : [1, 0.7]),
      flowArrow(MX[2], 452, 540, lit ? at : [1, 1.1]),
      node(MX[0], 595, 330, '① 读几时几分', BLUE, lit ? at : [1, 0.3], { size: 44, glow: lit ? [0, '读'] : undefined }),
      node(MX[1], 595, 330, '② 画几时几分', RED, lit ? at : [1, 0.7], { size: 44, glow: lit ? [0, '画'] : undefined }),
      node(MX[2], 595, 330, '③ 排先后', GREEN, lit ? at : [1, 1.1], { size: 44, glow: lit ? [0, '排先后'] : undefined })
    ]
  }
  S.push({
    tag: '认识钟表 | 三种题',
    beats: [
      { sub: '几时几分的题，有三种：', say: '几时几分的题，有三种：给了钟，给了时刻，好几个钟。' },
      { sub: '每种一招，我们一招一招来学！', say: '每种一招，我们一招一招来学！' }
    ],
    els: mapEls(0, false)
  })

  /* 4 第一招：读几时几分（7:20 → 4:13） */
  var OUT4 = [3, 0]
  var e4 = [
    lbl(500, 165, '第一招：读几时几分', BLUE, [0, 0], { size: 46 }),
    clock(560, 500, 460, [7, 20], [0, 0.3], {
      glow: [0, '时针'], out: OUT4,
      outer: outerSeq(1, 2, '五十', 0).concat([[[2, '十十五'], 2], [[2, '十五二'], 3], [[2, '二十写'], 4]]),
      sweep: [[[2, '五十'], 20, 2.6]]
    }),
    lbl(560, 800, '7 时 20 分', BLUE, [2, '二十写'], { size: 52, out: OUT4 }),
    digi(850, 800, '7:20', [2, '写作'], { out: OUT4 }),
    { t: 'stamp', x: 900, y: 290, s: '不是 4 分！', color: ORANGE, size: 48, rot: -5, at: [1, '不是四分'], out: [2, '五十'] },
    clock(560, 500, 460, [4, 13], [3, 0.2], {
      outer: [[[3, '五个五个'], 1], [[3, '到二', 0], 2]],
      sweep: [[[3, '到二'], 10, 1.2], [[4, '十一'], 13, 1.4]],
      ticks: [[[4, '十一'], 11, 13, 0.45]],
      glow: [5, '刚过四']
    }),
    lbl(560, 800, '4 时 13 分', RED, [5, '四时'], { size: 52 }),
    digi(850, 800, '4:13', [5, '写作']),
    /* 判断小流程 */
    node(1450, 230, 400, '时针过了几：几时', INK, [0, '时针'], { size: 40 }),
    flowArrow(1450, 268, 318, [1, '分针']),
    node(1450, 360, 380, '分针指着数吗？', INK, [1, '分针'], { size: 40 }),
    line2(1390, 398, 1290, 455, [2, '五个五个']),
    line2(1510, 398, 1610, 455, [3, '中间']),
    node(1270, 500, 320, '指着：5 个 5 个数', BLUE, [2, '五个五个'], { size: 36 }),
    node(1650, 500, 400, '在中间：先数到前一个数', RED, [3, '中间'], { size: 32 }),
    lbl(1650, 575, '再一小格一小格接着数', RED, [4, '接着数'], { size: 34 }),
    node(1450, 690, 360, '写成 几:分', GREEN, [2, '写作'], { size: 40 })
  ]
  S.push({
    tag: '第一招 | 读几时几分',
    beats: [
      { sub: '第一招：读几时几分。时针过了 7，是 7 时。', say: '第一招：读几时几分。时针过了七，是七时。' },
      { sub: '再看分针：指着 4，可不是 4 分！', say: '再看分针：它指着四，可不是四分！', pitch: '+5Hz' },
      { sub: '5 个 5 个数：5、10、15、20，写作 7:20。', say: '从十二起，五个五个数：五、十、十五、二十，写作七点二十。', pause: 0.3 },
      { sub: '换一个：分针在 2 和 3 中间。先数到 2，是 10 分；', say: '换一个：分针停在二和三的中间。先五个五个数到二，是十分；' },
      { sub: '再一小格一小格接着数：11、12、13！', say: '再一小格一小格接着数：十一、十二、十三，是十三分。' },
      { sub: '时针刚过 4：4 时 13 分，写作 4:13。', say: '时针刚过四，就是四时十三分，写作四点十三。', pause: 0.4 }
    ],
    els: e4
  })

  /* 5 小心两个陷阱：5:55、3:05 */
  S.push({
    tag: '第一招 | 小心',
    beats: [
      { sub: '小心陷阱！这个钟是几时几分？', say: '小心陷阱！这个钟，是几时几分？', rate: '-4%' },
      { sub: '时针快到 6 了，可还没到，还是 5 时！', say: '时针快到六了，可还没到，还是五时！' },
      { sub: '分针指着 11，是 55 分：5:55，不是 6:55！', say: '分针指着十一，是五十五分：五点五十五，不是六点五十五！', pause: 0.6 }
    ],
    els: [
      clock(600, 490, 460, [5, 55], [0, 0.3], { glow: [1, '快到六'], glow2: [2, '十一'], outer: [[[2, '十一'], 11]] }),
      lbl(1300, 270, '时针快到 6，还没到：5 时', RED, [1, '快到六'], { size: 44 }),
      digi(1300, 420, '5:55', [2, '五点五十五'], { w: 300, h: 140 }),
      { t: 'stamp', x: 1300, y: 640, s: '不是 6:55！', color: RED, size: 60, rot: -6, at: [2, '不是'] }
    ]
  })

  /* 6 你来试 1：10:08 */
  S.push({
    tag: '第一招 | 你来试',
    beats: [
      { sub: '你来试：这个钟是几时几分？', say: '你来试：这个钟，是几时几分？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '时针刚过 10；分针：5、6、7、8，是 8 分。', say: '时针刚过十；分针五、六、七、八，是八分。' },
      { sub: '分不满 10，补个 0：写作 **10:08**！', say: '分不满十，前面补个零，写作十点零八！', pause: 1 }
    ],
    els: [
      lbl(960, 165, '你来试：是几时几分？', GREY, [0, 0.2], { size: 46 }),
      clock(600, 490, 460, [10, 8], [0, 0.3], { glow: [2, '刚过十'], ticks: [[[2, '六七'], 6, 8, 0.4]], outer: [[[2, '分针五'], 1]] }),
      { t: 'slot', id: 'q6', x: 1400, y: 470, size: 230, at: [0, 0.6] },
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q6' },
      fill('q6', [3, '十点零八'], '<span style="font-size:46%">10:08</span>'),
      lbl(1400, 650, '分不满 10，前面补 0', RED, [3, '补个零'], { size: 40 }),
      { t: 'stamp', x: 1500, y: 790, s: '答：10:08', color: RED, size: 54, rot: -6, at: [3, '十点零八', 0.3] }
    ]
  })

  /* 7 第二招：画几时几分（3:40） */
  S.push({
    tag: '第二招 | 画几时几分',
    beats: [
      { sub: '没有针了！第二招：画几时几分，画出 3 时 40 分。', say: '这回没有针了！第二招：画几时几分，画出三时四十分。' },
      { sub: '先画分针：40 分，5 个 5 个数到 8，分针指着 8。', say: '先画分针：四十分，五个五个数到八，长长的分针就指着八。' },
      { sub: '再画时针：40 分过了一大半，时针快到 4，靠近 4。', say: '再画时针：四十分过了一大半，时针快到四，画在靠近四的地方。' },
      { sub: '分少刚过一点，30 分左右在中间，分多快到下个数。', say: '分少，刚过一点；三十分左右，在中间；分多，快到下一个数。' },
      { sub: '小心！几分的时候，时针不会正对着数。', say: '小心！几分的时候，时针不会正对着三。', pause: 1 }
    ],
    els: [
      lbl(500, 165, '第二招：画几时几分', RED, [0, '第二招'], { size: 46 }),
            clock(600, 500, 470, [3, 40], [0, 0.3], {
        mAt: [1, '指着八', 0.2], hAt: [2, '快到四', 0.2],
        outer: outerSeq(8, 1, '五个五个', 0.22, 0.4),
        sweep: [[[1, '五个五个', 0.4], 40, 1.9]],
        glowNums: [[[2, '靠近四'], 4, 1.2]]
      }),
      lbl(1000, 780, '3:40', RED, [2, '靠近四', 0.6], { size: 72, font: 'num' }),
      /* 判断小流程 */
      node(1450, 230, 460, '① 分针：数到第几小格', BLUE, [1, '先画分针'], { size: 38 }),
      flowArrow(1450, 266, 330, [2, '再画时针']),
      node(1450, 370, 460, '② 时针：过了几，看分', RED, [2, '再画时针'], { size: 38 }),
      line2(1450, 405, 1240, 470, [3, '分少']),
      line2(1450, 405, 1450, 470, [3, '三十分']),
      line2(1450, 405, 1660, 470, [3, '分多']),
      node(1240, 515, 200, '分少：刚过', RED, [3, '分少'], { size: 32 }),
      node(1450, 515, 200, '30 左右：中间', RED, [3, '三十分'], { size: 30 }),
      node(1660, 515, 200, '分多：快到', RED, [3, '分多'], { size: 32, glow: [3, '分多', 0.6] }),
      lbl(1450, 650, '几分的时候，时针不正对着数', RED, [4, '不会'], { size: 38 })
    ]
  })

  /* 8 你来试 2：画 6:10 */
  S.push({
    tag: '第二招 | 你来试',
    beats: [
      { sub: '你来试：画出 6 时 10 分。', say: '你来试：画出六时十分。', rate: '-6%' },
      { sub: '想一想，两根针各画在哪？', say: '想一想，两根针，各画在哪？', pause: 5 },
      { sub: '分针指着 2；分少，时针刚过 6 一点。', say: '分针指着二；分少，时针刚过六一点。' },
      { sub: '写作 **6:10**，画对了！', say: '写作六点十分，画对了吗？', pause: 1 }
    ],
    els: [
      lbl(960, 165, '你来试：画出 6 时 10 分', GREY, [0, 0.2], { size: 46 }),
      clock(640, 470, 440, [6, 10], [0, 0.3], { mAt: [2, '指着二', 0.1], hAt: [2, '刚过六', 0.1] }),
      { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5 },
      lbl(1400, 480, '6:10', RED, [3, '写作'], { size: 90, font: 'num' }),
      { t: 'stamp', x: 1600, y: 780, s: '画对了！', color: RED, size: 50, rot: -6, at: [3, '画对了'] }
    ]
  })

  /* 9 第三招：排先后（① 画画 2:15 ② 踢球 12:40 ③ 看书 1:50 → ② ③ ①） */
  var PX = [250, 590, 930]
  var e9 = [
    lbl(470, 165, '第三招：排先后', GREEN, [1, '第三招'], { size: 46 }),
    lbl(590, 165, '乐乐中午到下午做了三件事', GREY, [0, 0.2], { size: 44, out: [1, '第三招'] }),
    { t: 'stamp', x: 1500, y: 790, s: '答：② → ③ → ①', color: RED, size: 54, rot: -5, at: [4, '最后', 0.5] }
  ]
  ;[[2, 15, '画画'], [12, 40, '踢球'], [1, 50, '看书']].forEach(function (c, i) {
    e9.push(lbl(PX[i] - 125, 262, circ(i), INK, [0, 0.3 + i * 0.1], { font: 'kai', size: 44 }))
    e9.push(clock(PX[i], 420, 260, [c[0], c[1]], [0, 0.3 + i * 0.1], { glow: [2, ['一号', '二号', '三号'][i]], glow2: i === 1 ? [3, '十二最大'] : undefined }))
    e9.push(lbl(PX[i], 590, c[2], INK, [0, 0.4 + i * 0.1], { size: 40 }))
    e9.push(lbl(PX[i], 660, c[0] + ':' + c[1], RED, [2, ['一号', '二号', '三号'][i], 0.4], { size: 50, font: 'num' }))
  })
  ;[['第 3', '最后'], ['第 1', '最早'], ['第 2', '接着']].forEach(function (o, i) { e9.push(lbl(PX[i], 730, o[0], GREEN, [4, o[1]], { size: 46 })) })
  e9 = e9.concat([
    node(1500, 250, 400, '① 读出每个钟', GREEN, [1, '读出来'], { size: 40 }),
    flowArrow(1500, 288, 350, [3, '中午']),
    node(1500, 395, 560, '② 比时：中午 12 时最早，', GREEN, [3, '中午'], { size: 38, glow: [3, '中午十二时'] }),
    lbl(1500, 470, '再是下午 1 时、2 时……', GREEN, [3, '下午'], { size: 38 }),
    flowArrow(1500, 500, 560, [4, '所以']),
    node(1500, 605, 400, '③ 时一样，比分', GREEN, [4, '所以'], { size: 40 }),
    { t: 'stamp', x: 1500, y: 790, s: '12 时不是最晚！', color: ORANGE, size: 46, rot: -5, at: [3, '不是最晚'], out: [4, 0] }
  ])
  S.push({
    tag: '第三招 | 排先后',
    beats: [
      { sub: '乐乐中午到下午做了三件事，谁先谁后？', say: '乐乐中午到下午做了三件事，谁先谁后？', rate: '-6%' },
      { sub: '第三招：排先后。先把每个钟读出来。', say: '第三招：排先后。先把每个钟，读出来。' },
      { sub: '① 2:15，② 12:40，③ 1:50。', say: '一号两点十五，二号十二点四十，三号一点五十。' },
      { sub: '12 最大，可不是最晚！中午 12 时过了，才是下午 1 时。', say: '十二最大，可不是最晚！中午十二时过了，才是下午一时。' },
      { sub: '所以 ② 最早，再是 ③，最后是 ①！', say: '所以二号最早，接着是三号，最后是一号！', pause: 1 }
    ],
    els: e9
  })

  /* 10 你来试 3：① 跳绳 3:05 ② 弹琴 2:55 ③ 搭积木 4:20 → ② ① ③ */
  var e10 = [
    lbl(960, 165, '你来试：谁先谁后？', GREY, [0, 0.2], { size: 46 }),
    { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5 },
    { t: 'stamp', x: 960, y: 830, s: '答：② → ① → ③', color: RED, size: 52, rot: -5, at: [3, '顺序', 0.4] }
  ]
  var QX = [420, 960, 1500]
  ;[[3, 5, '跳绳'], [2, 55, '弹琴'], [4, 20, '搭积木']].forEach(function (c, i) {
    e10.push(lbl(QX[i] - 150, 258, circ(i), INK, [0, 0.3 + i * 0.1], { font: 'kai', size: 44 }))
    e10.push(clock(QX[i], 420, 280, [c[0], c[1]], [0, 0.3 + i * 0.1], { glow: [2, ['一号', '二号', '三号'][i]] }))
    e10.push(lbl(QX[i], 600, c[2], INK, [0, 0.4 + i * 0.1], { size: 40 }))
    e10.push(lbl(QX[i], 670, c[0] + ':' + (c[1] < 10 ? '0' : '') + c[1], RED, [2, ['一号', '二号', '三号'][i], 0.4], { size: 50, font: 'num' }))
  })
  ;['第 2', '第 1', '第 3'].forEach(function (o, i) { e10.push(lbl(QX[i], 740, o, GREEN, [3, '顺序', 0.6 + i * 0.1], { size: 46 })) })
  S.push({
    tag: '第三招 | 你来试',
    beats: [
      { sub: '你来试：这三件事，谁先谁后？', say: '你来试：这三件事，谁先谁后？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '② 时针快到 3 还没到，是 2:55；① 3:05，③ 4:20。', say: '二号快到三，还没到，是两点五十五；一号三点零五，三号四点二十。' },
      { sub: '顺序是：② → ① → ③！', say: '所以顺序是：二、一、三！', pause: 1 }
    ],
    els: e10
  })

  /* 11 挑战：哪个钟是 8:10？① 8:50 ② 8:10 ③ 7:10 → ② */
  var CX = [420, 960, 1500]
  var e11 = [
    lbl(960, 165, '挑战：哪个钟是 8:10？', GREY, [0, 0.2], { size: 46 }),
    { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5 },
    lbl(960, 640, '第一招：一个一个读', BLUE, [2, '第一招'], { size: 44 }),
    cross(CX[0], 430, [2, '划掉']),
    cross(CX[2], 430, [3, '划掉']),
    { t: 'check', x: CX[1] + 170, y: 280, at: [4, '就是它'] },
    { t: 'stamp', x: 1500, y: 780, s: '答：②', color: RED, size: 56, rot: -6, at: [4, '就是它', 0.3] }
  ]
  ;[[8, 50], [8, 10], [7, 10]].forEach(function (c, i) {
    e11.push(lbl(CX[i] - 150, 258, circ(i), INK, [0, 0.3 + i * 0.1], { font: 'kai', size: 44 }))
    e11.push(clock(CX[i], 430, 280, c, [0, 0.3 + i * 0.1], { glow: [[2, 4, 3][i], ['一号', '二号', '三号'][i]], dim: i === 1 ? undefined : [[2, 4, 3][i], '划掉'] }))
  })
  S.push({
    tag: '挑战 | 这次用哪一招？',
    beats: [
      { sub: '挑战题：哪个钟是 8:10？', say: '挑战题：哪个钟，是八点十分？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', rate: '-6%', pause: 5 },
      { sub: '用第一招读：① 分针指着 10，是 50 分，划掉！', say: '用第一招读：一号，分针指着十，是五十分，划掉！' },
      { sub: '③ 时针刚过 7，是 7:10，划掉！', say: '三号，时针刚过七，是七点十分，也划掉！' },
      { sub: '② 时针刚过 8，分针指着 2：就是 **②**！', say: '二号，时针刚过八，分针指着二：就是它！', pause: 1 }
    ],
    els: e11
  })

  /* 12 口诀（讲解页原文） */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '时针过几就几时，快到下个还不算；', say: '时针过几就几时，快到下个还不算；', rate: '-15%' },
      { sub: '分针 5 个 5 个数，零头小格接着数；', say: '分针五个五个数，零头小格接着数；', rate: '-15%' },
      { sub: '分不满 10 前补 0。', say: '分不满十，前补零。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 470, w: 1500, h: 480, at: 0 },
      { t: 'chant', x: 960, y: 330, s: '时针过几就几时，快到下个还不算；', color: RED, size: 60, at: 1 },
      { t: 'chant', x: 960, y: 470, s: '分针 5 个 5 个数，零头小格接着数；', color: BLUE, size: 60, at: 2 },
      { t: 'chant', x: 960, y: 610, s: '分不满 10 前补 0。', color: INK, size: 60, at: 3 }
    ]
  })

  /* 13 结尾：知识地图 + 拓展想一想 */
  var e13 = mapEls(0, true).concat([
    clock(820, 790, 230, [5, 58], [1, '五点五十八'], { out: [2, 0] }),
    lbl(1160, 790, '+2 分 = ？', RED, [1, '再过'], { size: 56, out: [2, 0] }),
    { t: 'tape', x: 960, y: 790, s: '去练习纸上试试吧！', size: 50, at: [2, '练习纸'] }
  ])
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天学会了三招：读、画、排先后。', say: '今天学会了三招：读、画、排先后。' },
      { sub: '想一想：5:58 再过 2 分，是几时几分？', say: '想一想：五点五十八，再过两分，是几时几分？', rate: '-6%', pause: 0.6 },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: e13
  })

  /* 讲完一招点亮知识地图的一枝 */
  function mapScene(n) {
    var e = mapEls(0, true)
    var moves = e.slice(-3)
    var sits = e.slice(4, 7)
    moves.forEach(function (m, k) {
      m.glow = undefined
      if (k === n - 1) { m.at = [0, '学会']; m.glow = [0, '学会', 0.3] }
      if (k >= n) { m.dim = 0; sits[k].dim = 0 }
    })
    for (var k = 0; k < n; k++) e.push({ t: 'check', x: MX[k] + 165 + 46, y: 590, at: k === n - 1 ? [0, '学会', 0.3] : 0, sfx: k === n - 1 ? undefined : false })
    var say = ['第一招学会了！还有两招。', '第二招也学会了！还剩最后一招。', '三招都学会了！来个挑战！'][n - 1]
    return { tag: '几时几分 | 学到哪了', beats: [{ sub: say, say: say, pitch: '+5Hz', pause: 0.4 }], els: e }
  }
  S.splice(11, 0, mapScene(3))
  S.splice(9, 0, mapScene(2))
  S.splice(7, 0, mapScene(1))

  /* 封面 */
  S.cover = {
    tag: null,
    els: [
      { t: 'txt', x: 960, y: 130, s: '奥数 · L1 补充 · B04 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
      { t: 'tape', x: 960, y: 270, s: '认识钟表：几时几分', size: 110, at: 0 },
      { t: 'txt', x: 960, y: 410, s: '分针 5 个 5 个数', size: 58, color: RED, font: 'kl', at: 0 },
      clock(700, 660, 360, [7, 20], 0, { outer: [[0, 1], [0, 2], [0, 3], [0, 4]], sweep: [[0, 20, 0.01]] }),
      clock(1220, 660, 360, [4, 13], 0),
      { t: 'txt', x: 960, y: 900, s: '读几时几分 · 画几时几分 · 排先后', size: 50, color: GREEN, font: 'kl', at: 0 }
    ]
  }

  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
