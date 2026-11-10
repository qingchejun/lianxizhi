/* B02 推理比较：比轻重 · 讲解视频分镜 v1（L1 补充第二课，新结构，样板 bichang）
 * 引入（跷跷板）→ 知识地图（一个天平 / 好几个天平 / 两边放好几样 → 三招）
 * 第一招 看天平，说轻重：苹果 = 梨（平了）；苹果 vs 橘子，苹果沉 → 苹果 > 橘子。你来试：红球翘起 → 红球轻。
 * 第二招 串糖葫芦：①梨 > 苹果 ②苹果 > 橘子 → 梨 > 苹果 > 橘子。你来试：①绿 > 红 ②蓝 > 黄 ③红 > 蓝 → 绿 红 蓝 黄。
 * 第三招 先拿掉一样的：苹果+梨 vs 苹果+橘子（左沉）→ 梨重；2 橘子 < 1 苹果 → 1 橘子更轻。你来试：黄+红 vs 黄+蓝（右沉）→ 蓝球重。
 * 挑战：①桃 > 梨 ②苹果 > 桃，哪个最轻 → 梨（第二招）。口诀 → 知识地图 → 拓展：弹簧 → 下一课预告。 */
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
  function stagger(at, d) {
    if (!Array.isArray(at)) return [at, d]
    if (typeof at[1] === 'string') return [at[0], at[1], (at[2] || 0) + d]
    return [at[0], (at[1] || 0) + d]
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

  /* 天平（可缩小）：B = {id, x, y, w, s}；托盘面在 y-15s，托盘中心 x ± w/2·s；tilt 负 = 左沉 */
  function bal(B, at, o) {
    o = o || {}
    return { t: 'balance', id: B.id, x: B.x, y: B.y, w: B.w, scale: B.s, at: at, out: o.out, tilt: o.tilt }
  }
  /* 托盘里放东西：keys 物品名数组；o.ats / o.outs / o.glows 可以给每个物品单独的时间 */
  function pan(arr, B, side, keys, size, at, o) {
    o = o || {}
    var cx = B.x + (side === 'L' ? -1 : 1) * B.w / 2 * B.s
    var py = B.y - 15 * B.s
    var gap = size * 0.98
    var n = keys.length
    keys.forEach(function (k, i) {
      arr.push({ t: 'item', k: k, x: cx + (i - (n - 1) / 2) * gap, y: py - size / 2 + 6 * B.s, size: size,
        at: o.ats ? o.ats[i] : stagger(at, i * 0.12), out: o.outs ? o.outs[i] : o.out,
        glow: o.glows ? o.glows[i] : o.glow, glow2: o.glow2s ? o.glow2s[i] : undefined, on: [B.id, side], overlapOk: true })
    })
  }

  /* 跷跷板：flat 平的 / 左端低 */
  function seesaw(tilted, at, o) {
    var dy = tilted ? 60 : 0
    var html = '<path d="M380 250 L420 170 L460 250 Z" fill="#d9a066" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>' +
      '<line x1="20" y1="' + (170 + dy) + '" x2="820" y2="' + (170 - dy) + '" stroke="#b97d45" stroke-width="22" stroke-linecap="round"/>' +
      '<line x1="20" y1="' + (170 + dy) + '" x2="820" y2="' + (170 - dy) + '" stroke="' + INK + '" stroke-width="4" stroke-linecap="round" opacity="0.5"/>' +
      '<line x1="0" y1="255" x2="840" y2="255" stroke="' + GREY + '" stroke-width="4" stroke-linecap="round"/>'
    return svg(540, 400, 840, 270, html, at, o)
  }
  /* 弹簧挂球（拓展想一想） */
  function springs(at, o) {
    function sp(x, len, c) {
      var d = 'M' + x + ' 10 L' + x + ' 20'
      var n = 7
      var step = (len - 20) / n
      for (var i = 0; i < n; i++) d += ' L' + (x + 16) + ' ' + (20 + step * (i + 0.25)) + ' L' + (x - 16) + ' ' + (20 + step * (i + 0.75)) + ' L' + x + ' ' + (20 + step * (i + 1))
      return '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
        '<circle cx="' + x + '" cy="' + (len + 26) + '" r="26" fill="' + c + '" stroke="' + INK + '" stroke-width="5"/>'
    }
    var html = '<line x1="20" y1="10" x2="380" y2="10" stroke="' + INK + '" stroke-width="8" stroke-linecap="round"/>' +
      sp(130, 70, '#e8574a') + sp(270, 130, '#5b95d6')
    return svg(760, 680, 400, 200, html, at, o)
  }

  var S = []

  /* 0 开场 */
  var B0 = { id: 'b0', x: 960, y: 720, w: 400, s: 0.6 }
  var e0 = [
    { t: 'txt', x: 960, y: 230, s: '奥数 · L1 补充 · B02', size: 40, color: GREY, font: 'kai', at: 0, anim: 'fade' },
    { t: 'tape', x: 960, y: 370, s: '推理比较：比轻重', size: 110, at: [0, 0.2] },
    lbl(960, 520, '上一课：推理比较：比长短', BLUE, [1, '上一课'], { size: 48, out: [2, 0] }),
    bal(B0, [2, '比轻重'], { tilt: [[null, 0], [[2, '比轻重', 0.5], -9]] })
  ]
  pan(e0, B0, 'L', ['apple'], 66, [2, '比轻重', 0.2])
  pan(e0, B0, 'R', ['orange'], 66, [2, '比轻重', 0.3])
  S.push({
    tag: null,
    beats: [
      { sub: '小朋友，你好！', say: '小朋友，你好！', pitch: '+5Hz' },
      { sub: '上一课，我们学了比长短。', say: '上一课，我们学了比长短。' },
      { sub: '今天学推理比较的第二课：比轻重！', say: '今天，我们学推理比较的第二课：比轻重！' }
    ],
    els: e0
  })

  /* 1 引入：跷跷板 */
  var OUT1 = [4, '三招']
  var e1 = [
    seesaw(false, [0, 0.2], { out: [1, '沉下去'] }),
    seesaw(true, [1, '沉下去'], { out: OUT1 }),
    { t: 'item', k: 'kid0', x: 600, y: 512, size: 150, at: [0, '牛牛'], out: OUT1, move: [[1, '沉下去'], 0, -60] },
    { t: 'item', k: 'kid2', x: 1320, y: 392, size: 150, at: [0, '丁丁'], out: OUT1, move: [[1, '沉下去'], 0, 60] },
    lbl(600, 410, '牛牛', BLUE, [0, '牛牛'], { size: 40, out: OUT1, move: [[1, '沉下去'], 0, -60] }),
    lbl(1320, 290, '丁丁', RED, [0, '丁丁'], { size: 40, out: OUT1, move: [[1, '沉下去'], 0, 60] }),
    { t: 'stamp', x: 960, y: 260, s: '谁重？', color: ORANGE, size: 60, rot: -5, at: [2, '谁重'], out: [3, '牛牛重'] },
    lbl(380, 520, '沉下去：重', RED, [3, '沉下去'], { size: 46, out: OUT1 }),
    lbl(1580, 380, '翘起来：轻', BLUE, [3, '翘起来'], { size: 46, out: OUT1 }),
    { t: 'card', x: 560, y: 470, title: '第一招', sub: '看天平', color: BLUE, at: [4, '三招', 0.3] },
    { t: 'card', x: 960, y: 470, title: '第二招', sub: '串糖葫芦', color: RED, at: [4, '三招', 0.6] },
    { t: 'card', x: 1360, y: 470, title: '第三招', sub: '先拿掉', color: GREEN, at: [4, '三招', 0.9] }
  ]
  S.push({
    tag: '比轻重',
    beats: [
      { sub: '牛牛和丁丁，坐跷跷板。', say: '牛牛和丁丁，坐跷跷板。' },
      { sub: '牛牛那头沉下去，丁丁被翘到半空。', say: '牛牛那头沉下去，丁丁被翘到了半空。' },
      { sub: '谁重？', say: '谁重？', rate: '-6%', pause: 1.5 },
      { sub: '牛牛重！沉下去的重，翘起来的轻。', say: '牛牛重！沉下去的那边重，翘起来的那边轻。', pitch: '+6Hz' },
      { sub: '天平也是这样。今天，教你三招！', say: '天平也是这样。今天，教你三招！' }
    ],
    els: e1
  })

  /* 2 知识地图 */
  function mapEls(at, lit) {
    return [
      node(960, 210, 300, '比轻重', INK, at, { size: 50 }),
      line2(960, 252, 420, 360, lit ? at : [0, '一个天平']),
      line2(960, 252, 960, 360, lit ? at : [0, '好几个天平']),
      line2(960, 252, 1500, 360, lit ? at : [0, '好几样']),
      node(420, 405, 400, '一个天平', BLUE, lit ? at : [0, '一个天平'], { size: 46 }),
      node(960, 405, 400, '好几个天平', RED, lit ? at : [0, '好几个天平'], { size: 46 }),
      node(1500, 405, 460, '两边放好几样', GREEN, lit ? at : [0, '好几样'], { size: 46 }),
      flowArrow(420, 452, 540, lit ? at : [1, '第一招']),
      flowArrow(960, 452, 540, lit ? at : [1, '第二招']),
      flowArrow(1500, 452, 540, lit ? at : [1, '第三招']),
      node(420, 595, 460, '① 看天平，说轻重', BLUE, lit ? at : [1, '第一招'], { size: 46, glow: lit ? [1, '看哪边沉'] : undefined }),
      node(960, 595, 380, '② 串糖葫芦', RED, lit ? at : [1, '第二招'], { size: 46, glow: lit ? [1, '串糖葫芦'] : undefined }),
      node(1500, 595, 460, '③ 先拿掉一样的', GREEN, lit ? at : [1, '第三招'], { size: 46, glow: lit ? [1, '先拿掉'] : undefined })
    ]
  }
  S.push({
    tag: '比轻重 | 三种情况',
    beats: [
      { sub: '比轻重，先看天平是什么样子：', say: '比轻重，先看天平是什么样子：一个天平的，好几个天平的，两边放了好几样东西的。' },
      { sub: '每种样子，有一招：第一招、第二招、第三招。', say: '每种样子，都有一招：第一招、第二招、第三招。' },
      { sub: '我们一招一招来学！', say: '我们一招一招来学！' }
    ],
    els: mapEls(0, false)
  })

  /* 3 第一招：看天平，说轻重 */
  var B3 = { id: 'b3', x: 560, y: 600, w: 440, s: 0.85 }
  var e3 = [
    lbl(470, 165, '第一招：看天平，说轻重', BLUE, [0, 0], { size: 46 }),
    bal(B3, [0, '平不平'], { tilt: [[null, 0], [[2, '沉下去'], -9]] }),
    { t: 'stamp', x: 560, y: 300, s: '平了！', color: GREEN, size: 56, rot: -4, at: [1, '平了'], out: [2, 0] },
    lbl(560, 800, '苹果 = 梨', BLUE, [1, '一样重'], { size: 54, out: [2, 0] }),
    lbl(560, 800, '苹果 > 橘子', RED, [4, '大于'], { size: 58 }),
    lbl(900, 330, '翘得高的：轻', ORANGE, [5, '翘得高'], { size: 42 }),
    /* 判断小流程 */
    node(1450, 240, 340, '天平平不平？', INK, [0, '平不平']),
    line2(1400, 280, 1290, 360, [1, '平了']),
    line2(1500, 280, 1610, 360, [2, '歪了']),
    node(1270, 405, 300, '平：一样重', BLUE, [1, '平了'], { glow: [1, '一样重'] }),
    node(1620, 405, 330, '歪：看哪边沉', RED, [2, '歪了']),
    flowArrow(1620, 447, 525, [3, '沉下去的重']),
    node(1600, 570, 400, '沉的重，翘的轻', RED, [3, '沉下去的重'], { glow: [5, '小心'] }),
    node(1600, 720, 400, '写成：重 > 轻', RED, [4, '写成'])
  ]
  pan(e3, B3, 'L', ['apple'], 112, [1, '苹果'], { glow: [3, '沉下去的重'] })
  pan(e3, B3, 'R', ['pear'], 112, [1, '梨'], { out: [2, 0] })
  pan(e3, B3, 'R', ['orange'], 112, [2, '橘子'], { glow: [3, '翘起来的轻'] })
  S.push({
    tag: '第一招 | 看天平，说轻重',
    beats: [
      { sub: '第一招：看天平，说轻重。先看：天平平不平？', say: '第一招：看天平，说轻重。先看：天平平不平？' },
      { sub: '苹果和梨，天平平了：两边一样重。', say: '左边苹果，右边梨，天平平了：两边一样重。' },
      { sub: '换上橘子，天平歪了：苹果这边沉下去。', say: '换上橘子，天平歪了：苹果这边沉下去，橘子那边翘起来。' },
      { sub: '沉下去的重，翘起来的轻：苹果比橘子重！', say: '沉下去的重，翘起来的轻：苹果比橘子重！' },
      { sub: '写成：苹果 > 橘子，重的写在前面。', say: '写成：苹果，大于橘子。重的写在前面。' },
      { sub: '小心！翘得高的不是重，是轻！', say: '小心！翘得高的，不是重，是轻！', pause: 1 }
    ],
    els: e3
  })

  /* 4 你来试 1：红球翘起 → 红球轻 */
  var B4 = { id: 'b4', x: 620, y: 560, w: 440, s: 0.85 }
  var e4 = [
    lbl(960, 165, '你来试：红球和蓝球，哪个轻？', GREY, [0, 0.2], { size: 46 }),
    bal(B4, [0, 0.3], { tilt: [[null, 0], [[0, 1.2], 9]] }),
    { t: 'slot', id: 'q4', x: 1500, y: 430, size: 170, at: [0, 0.6] },
    lbl(1500, 580, '哪个轻？', GREY, [0, 0.7], { size: 36 }),
    { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q4' },
    fill('q4', [2, '红球轻'], '<span style="font-size:58%">红球</span>'),
    { t: 'stamp', x: 1500, y: 790, s: '答：红球轻', color: RED, size: 50, rot: -6, at: [2, '红球轻', 0.5] }
  ]
  pan(e4, B4, 'L', ['ballR'], 110, [0, 0.4], { glow: [2, '翘起来'] })
  pan(e4, B4, 'R', ['ballB'], 110, [0, 0.5])
  S.push({
    tag: '第一招 | 你来试',
    beats: [
      { sub: '你来试：红球和蓝球，哪个轻？', say: '你来试：红球和蓝球，哪个轻？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '红球那边翘起来，翘起来的轻：红球轻！', say: '红球那边翘起来，翘起来的轻：红球轻！', pause: 1 }
    ],
    els: e4
  })

  /* 5 冲突 + 第二招：串糖葫芦（①梨 > 苹果 ②苹果 > 橘子） */
  var B5a = { id: 'b5a', x: 320, y: 480, w: 380, s: 0.7 }
  var B5b = { id: 'b5b', x: 850, y: 480, w: 380, s: 0.7 }
  var OUT5 = [1, 0]
  var e5 = [
    { t: 'item', k: 'pear', x: 620, y: 420, size: 150, at: [0, '两样东西'], out: OUT5 },
    { t: 'item', k: 'orange', x: 1080, y: 420, size: 150, at: [0, '两样东西', 0.2], out: OUT5 },
    lbl(850, 420, '？', RED, [0, '怎么比'], { size: 90, out: OUT5 }),
    lbl(320, 290, '①', INK, [1, '两个天平'], { font: 'kai', size: 50 }),
    lbl(850, 290, '②', INK, [1, '两个天平'], { font: 'kai', size: 50 }),
    bal(B5a, [1, '两个天平'], { tilt: [[null, 0], [[1, '梨和苹果'], -9]] }),
    bal(B5b, [1, '两个天平', 0.2], { tilt: [[null, 0], [[1, '苹果和橘子'], 9]] }),
    lbl(470, 165, '第二招：串糖葫芦', RED, [2, '第二招'], { size: 46 }),
    lbl(320, 655, '梨 > 苹果', RED, [3, '梨比苹果重'], { size: 48, glow: [4, '都有苹果'] }),
    lbl(850, 655, '苹果 > 橘子', RED, [3, '苹果比橘子重'], { size: 48, glow: [4, '都有苹果', 0.3] }),
    /* 糖葫芦：一根竹签串三个 */
    { t: 'seg', x1: 270, y1: 790, x2: 960, y2: 790, color: '#c79a5a', sw: 9, at: [5, 0] },
    { t: 'item', k: 'pear', x: 370, y: 790, size: 104, at: [5, '梨'], glow: [6, '最重'] },
    lbl(485, 790, '>', INK, [5, '大于'], { size: 60 }),
    { t: 'item', k: 'apple', x: 600, y: 790, size: 104, at: [5, '苹果'] },
    lbl(715, 790, '>', INK, [5, '大于#2'], { size: 60 }),
    { t: 'item', k: 'orange', x: 830, y: 790, size: 104, at: [5, '橘子'], glow: [6, '最轻'] },
    { t: 'check', x: 1030, y: 785, at: [7, '翘起来', 0.3] },
    /* 判断小流程 */
    node(1480, 250, 360, '有几个天平？', INK, [2, '第二招']),
    line2(1420, 290, 1310, 360, [2, '第二招', 0.3]),
    line2(1540, 290, 1650, 360, [2, '串糖葫芦']),
    node(1290, 405, 300, '一个：直接看', BLUE, [2, '第二招', 0.4]),
    node(1660, 405, 330, '好几个：串起来', RED, [2, '串糖葫芦'], { glow: [4, '串成一串'] }),
    flowArrow(1660, 447, 525, [6, '倒过来']),
    node(1620, 570, 400, '从轻到重？倒过来', RED, [6, '倒过来'])
  ]
  pan(e5, B5a, 'L', ['pear'], 76, [1, '两个天平'], { glow: [7, '梨总是'] })
  pan(e5, B5a, 'R', ['apple'], 76, [1, '两个天平'])
  pan(e5, B5b, 'L', ['orange'], 76, [1, '两个天平', 0.2], { glow: [7, '橘子总是'] })
  pan(e5, B5b, 'R', ['apple'], 76, [1, '两个天平', 0.2])
  S.push({
    tag: '第二招 | 串糖葫芦',
    beats: [
      { sub: '两样东西没放在一起称，怎么比谁重？', say: '上一课的问题：两样东西没放在一起称，怎么比谁重？', rate: '-6%' },
      { sub: '看两个天平：梨和苹果，苹果和橘子。', say: '看两个天平：梨和苹果称一称，苹果和橘子称一称。' },
      { sub: '第二招：串糖葫芦。每个天平，写一句。', say: '第二招：串糖葫芦。每个天平，写一句。' },
      { sub: '梨比苹果重；苹果比橘子重。', say: '梨比苹果重；苹果比橘子重。' },
      { sub: '两句里都有苹果，就能串成一串：', say: '两句里都有苹果，就能接起来，串成一串：' },
      { sub: '梨 > 苹果 > 橘子！', say: '梨，大于苹果，大于橘子！', pitch: '+5Hz' },
      { sub: '最重是梨，最轻是橘子；从轻到重就倒过来。', say: '最重是梨，最轻是橘子；从轻到重，就倒过来念。' },
      { sub: '验一验：梨总是沉下去，橘子总是翘起来。', say: '验一验：梨总是沉下去，橘子总是翘起来。', pause: 1 }
    ],
    els: e5
  })

  /* 6 你来试 2：①红 vs 绿（绿沉）②蓝 vs 黄（蓝沉）③蓝 vs 红（红沉）→ 绿 红 蓝 黄 */
  var B6 = [
    { id: 'b6a', x: 330, y: 430, w: 360, s: 0.56 },
    { id: 'b6b', x: 800, y: 430, w: 360, s: 0.56 },
    { id: 'b6c', x: 1270, y: 430, w: 360, s: 0.56 }
  ]
  var SX = [540, 780, 1020, 1260]
  var e6 = [
    lbl(960, 165, '你来试：四个球，从重到轻排一排', GREY, [0, 0.2], { size: 46 }),
    lbl(330, 245, '①', INK, [0, 0.3], { font: 'kai', size: 46 }),
    lbl(800, 245, '②', INK, [0, 0.3], { font: 'kai', size: 46 }),
    lbl(1270, 245, '③', INK, [0, 0.3], { font: 'kai', size: 46 }),
    bal(B6[0], [0, 0.3], { tilt: [[null, 0], [[0, 1.2], 8]] }),
    bal(B6[1], [0, 0.4], { tilt: [[null, 0], [[0, 1.3], -8]] }),
    bal(B6[2], [0, 0.5], { tilt: [[null, 0], [[0, 1.4], 8]] }),
    { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q6a' },
    lbl(1660, 360, '① 绿 > 红', RED, [2, '绿球'], { size: 40 }),
    lbl(1660, 420, '③ 红 > 蓝', RED, [2, '红球#2'], { size: 40 }),
    lbl(1660, 480, '② 蓝 > 黄', RED, [2, '蓝球#2'], { size: 40 })
  ]
  SX.forEach(function (x, i) {
    e6.push({ t: 'slot', id: 'q6' + 'abcd'[i], x: x, y: 640, size: 110, at: [0, 0.6 + i * 0.1], out: [3, ['绿球', '红球', '蓝球', '黄球'][i]] })
    e6.push({ t: 'item', k: ['ballG', 'ballR', 'ballB', 'ballY'][i], x: x, y: 640, size: 100, at: [3, ['绿球', '红球', '蓝球', '黄球'][i]] })
    if (i < 3) e6.push(lbl(x + 120, 640, '>', INK, [0, 0.7], { size: 54 }))
  })
  pan(e6, B6[0], 'L', ['ballR'], 66, [0, 0.3], { glow: [2, '红球'] })
  pan(e6, B6[0], 'R', ['ballG'], 66, [0, 0.3], { glow: [2, '绿球'] })
  pan(e6, B6[1], 'L', ['ballB'], 66, [0, 0.4], { glow: [2, '蓝球#2'] })
  pan(e6, B6[1], 'R', ['ballY'], 66, [0, 0.4], { glow: [2, '黄球'] })
  pan(e6, B6[2], 'L', ['ballB'], 66, [0, 0.5], { glow: [2, '蓝球'] })
  pan(e6, B6[2], 'R', ['ballR'], 66, [0, 0.5], { glow: [2, '红球#2'] })
  S.push({
    tag: '第二招 | 你来试',
    beats: [
      { sub: '你来试：四个球，从重到轻排一排。', say: '你来试：四个球，从重到轻，排一排。', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '每个天平写一句：绿 > 红，红 > 蓝，蓝 > 黄。', say: '每个天平写一句：绿球大于红球，红球大于蓝球，蓝球大于黄球。' },
      { sub: '串起来：绿球、红球、蓝球、黄球！', say: '串起来：绿球、红球、蓝球、黄球！', pause: 1 }
    ],
    els: e6
  })

  /* 7 冲突 + 第三招：先拿掉一样的 */
  var B7 = { id: 'b7', x: 600, y: 600, w: 460, s: 0.85 }
  var B7b = { id: 'b7b', x: 600, y: 600, w: 460, s: 0.85 }
  var OUT7 = [5, 0]
  var e7 = [
    bal(B7, [0, 0.3], { out: OUT7, tilt: [[null, 0], [[0, 1.2], -9]] }),
    { t: 'stamp', x: 1450, y: 420, s: '看不清了！', color: ORANGE, size: 60, rot: -5, at: [1, '看不清'], out: [2, '第三招'] },
    lbl(500, 165, '第三招：先拿掉一样的', GREEN, [2, '第三招'], { size: 46 }),
    lbl(600, 800, '梨 > 橘子', RED, [4, '梨重'], { size: 54, out: OUT7 }),
    { t: 'stamp', x: 1020, y: 800, s: '答：梨重', color: RED, size: 50, rot: -6, at: [4, '梨重', 0.4], out: OUT7 },
    bal(B7b, [5, 0.2], { tilt: [[null, 0], [[5, '还没有'], 9]] }),
    lbl(600, 800, '1 个苹果 > 1 个橘子', RED, [6, '更轻'], { size: 50 }),
    /* 判断小流程 */
    node(1480, 260, 420, '两边有一样的吗？', INK, [2, '第三招']),
    flowArrow(1480, 302, 370, [3, '拿掉']),
    node(1480, 415, 340, '有：先拿掉', GREEN, [3, '拿掉'], { glow: [3, '拿掉', 0.3] }),
    flowArrow(1480, 457, 525, [4, '剩下']),
    node(1480, 570, 340, '比剩下的', GREEN, [4, '剩下']),
    node(1480, 720, 440, '多的不一定重！', RED, [6, '多的'])
  ]
  pan(e7, B7, 'L', ['apple', 'pear'], 96, [0, 0.4], { outs: [[3, '拿掉'], OUT7], glows: [[2, '苹果'], [4, '梨这边']] })
  pan(e7, B7, 'R', ['apple', 'orange'], 96, [0, 0.5], { outs: [[3, '拿掉'], OUT7], glows: [[2, '苹果', 0.2], undefined] })
  pan(e7, B7b, 'L', ['orange', 'orange'], 96, [5, '两个橘子'], { glow: [6, '一个橘子'] })
  pan(e7, B7b, 'R', ['apple'], 96, [5, '一个苹果'])
  S.push({
    tag: '第三招 | 先拿掉一样的',
    beats: [
      { sub: '两边都放了两样东西：梨和橘子，哪个重？', say: '这个天平，两边都放了两样东西：梨和橘子，哪个重？', rate: '-6%' },
      { sub: '东西挤在一起，看不清了！', say: '东西挤在一起，看不清谁重了！', pitch: '+8Hz' },
      { sub: '第三招：先拿掉一样的。两边都有苹果。', say: '第三招：先拿掉一样的。两边都有一个苹果。' },
      { sub: '各拿掉一个苹果，天平还是这样歪着。', say: '两边各拿掉一个苹果，天平还是这样歪着。' },
      { sub: '剩下梨和橘子：梨这边沉下去，梨重！', say: '剩下梨和橘子：梨这边沉下去，梨重！', pause: 0.6 },
      { sub: '再看：两个橘子，还没有一个苹果重。', say: '再看这个：两个橘子，还没有一个苹果重。', rate: '-6%' },
      { sub: '一个橘子更轻了！东西多的，不一定重。', say: '一个橘子，就更轻了！东西多的，不一定重。', pause: 1 }
    ],
    els: e7
  })

  /* 8 你来试 3：黄+红 vs 黄+蓝（右沉）→ 蓝球重 */
  var B8 = { id: 'b8', x: 600, y: 580, w: 460, s: 0.85 }
  var e8 = [
    lbl(960, 165, '你来试：红球和蓝球，哪个重？', GREY, [0, 0.2], { size: 46 }),
    bal(B8, [0, 0.3], { tilt: [[null, 0], [[0, 1.2], 9]] }),
    { t: 'slot', id: 'q8', x: 1500, y: 430, size: 170, at: [0, 0.6] },
    lbl(1500, 580, '哪个重？', GREY, [0, 0.7], { size: 36 }),
    { t: 'think', x: 960, y: 790, at: [1, '想一想', 0.5], from: 5, pulse: 'q8' },
    fill('q8', [3, '蓝球重'], '<span style="font-size:58%">蓝球</span>'),
    { t: 'stamp', x: 1500, y: 790, s: '答：蓝球重', color: RED, size: 50, rot: -6, at: [3, '蓝球重', 0.5] }
  ]
  pan(e8, B8, 'L', ['ballY', 'ballR'], 96, [0, 0.4], { outs: [[2, '拿掉'], undefined] })
  pan(e8, B8, 'R', ['ballY', 'ballB'], 96, [0, 0.5], { outs: [[2, '拿掉'], undefined], glows: [undefined, [3, '蓝球这边']] })
  S.push({
    tag: '第三招 | 你来试',
    beats: [
      { sub: '你来试：红球和蓝球，哪个重？', say: '你来试：红球和蓝球，哪个重？', rate: '-6%' },
      { sub: '想一想。', say: '想一想。', pause: 5 },
      { sub: '两边都有黄球，先拿掉。', say: '两边都有黄球，先拿掉。' },
      { sub: '剩下蓝球这边沉：蓝球重！', say: '剩下蓝球这边沉下去：蓝球重！', pause: 1 }
    ],
    els: e8
  })

  /* 9 挑战：①桃 > 梨 ②苹果 > 桃，哪个最轻 → 梨（第二招） */
  var B9a = { id: 'b9a', x: 350, y: 480, w: 380, s: 0.7 }
  var B9b = { id: 'b9b', x: 870, y: 480, w: 380, s: 0.7 }
  var e9 = [
    lbl(960, 165, '挑战：桃子、梨、苹果，哪个最轻？', GREY, [0, 0.2], { size: 46 }),
    lbl(350, 290, '①', INK, [0, 0.3], { font: 'kai', size: 50 }),
    lbl(870, 290, '②', INK, [0, 0.3], { font: 'kai', size: 50 }),
    bal(B9a, [0, 0.3], { tilt: [[null, 0], [[0, 1.2], -9]] }),
    bal(B9b, [0, 0.4], { tilt: [[null, 0], [[0, 1.3], 9]] }),
    { t: 'slot', id: 'q9', x: 1550, y: 430, size: 170, at: [0, 0.6] },
    lbl(1550, 580, '哪个最轻？', GREY, [0, 0.7], { size: 36 }),
    { t: 'think', x: 960, y: 790, at: [1, '哪一招', 0.6], from: 5, pulse: 'q9' },
    lbl(350, 655, '桃 > 梨', RED, [2, '桃子大于梨'], { size: 46 }),
    lbl(870, 655, '苹果 > 桃', RED, [2, '苹果大于桃子'], { size: 46 }),
    fill('q9', [3, '梨最轻'], '<span style="font-size:70%">梨</span>'),
    { t: 'stamp', x: 1500, y: 790, s: '答：梨最轻', color: RED, size: 50, rot: -6, at: [3, '梨最轻', 0.4] }
  ]
  pan(e9, B9a, 'L', ['peach'], 76, [0, 0.3])
  pan(e9, B9a, 'R', ['pear'], 76, [0, 0.3], { glow: [3, '梨最轻'] })
  pan(e9, B9b, 'L', ['peach'], 76, [0, 0.4])
  pan(e9, B9b, 'R', ['apple'], 76, [0, 0.4])
  S.push({
    tag: '挑战 | 这次用哪一招？',
    beats: [
      { sub: '挑战题：桃子、梨、苹果，哪个最轻？', say: '挑战题：桃子、梨、苹果，哪个最轻？', rate: '-6%' },
      { sub: '这次，用哪一招？', say: '这次，用哪一招？', rate: '-6%', pause: 5 },
      { sub: '好几个天平，用第二招，每个天平写一句：', say: '好几个天平，用第二招，每个天平写一句：桃子大于梨，苹果大于桃子。' },
      { sub: '串起来：苹果 > 桃 > 梨，梨最轻！', say: '串起来：苹果、桃子、梨。梨最轻！', pause: 1 }
    ],
    els: e9
  })

  /* 10 口诀（讲解页原文） */
  S.push({
    tag: '记住口诀',
    beats: [
      { sub: '记住这句口诀：', say: '记住这句口诀：' },
      { sub: '天平会说话：', say: '天平会说话：', rate: '-15%' },
      { sub: '平了一样重，沉的重、翘的轻；', say: '平了一样重，沉的重、翘的轻；', rate: '-15%' },
      { sub: '几个天平串成串，两边一样先拿掉。', say: '几个天平串成串，两边一样先拿掉。', rate: '-15%' }
    ],
    els: [
      { t: 'paper', x: 960, y: 470, w: 1500, h: 480, at: 0 },
      { t: 'chant', x: 960, y: 330, s: '天平会说话：', color: INK, size: 64, at: 1 },
      { t: 'chant', x: 960, y: 470, s: '平了一样重，沉的重、翘的轻；', color: BLUE, size: 64, at: 2 },
      { t: 'chant', x: 960, y: 610, s: '几个天平串成串，两边一样先拿掉。', color: GREEN, size: 64, at: 3 }
    ]
  })

  /* 11 结尾：知识地图 + 拓展想一想（弹簧）+ 下一课 */
  var e11 = mapEls(0, true).concat([
    springs([2, '弹簧'], { out: [3, '下一课'] }),
    { t: 'card', x: 960, y: 790, title: '下一课', sub: '认识钟表', color: ORANGE, at: [3, '下一课'], out: 4 },
    { t: 'tape', x: 960, y: 790, s: '去练习纸上试试吧！', size: 50, at: [4, '练习纸'] }
  ])
  S.push({
    tag: '今天学会了',
    beats: [
      { sub: '今天，我们学会了三招：', say: '今天，我们学会了三招：' },
      { sub: '看哪边沉，串糖葫芦，先拿掉一样的。', say: '看哪边沉，串糖葫芦，先拿掉一样的。' },
      { sub: '想一想：球挂在弹簧上，怎么看谁重？', say: '想一想：没有天平，把球挂在弹簧上，怎么看谁重？', rate: '-6%', pause: 1 },
      { sub: '下一课，我们来认识钟表！', say: '下一课，我们来认识钟表！', pitch: '+4Hz' },
      { sub: '快去练习纸上试试吧！', say: '快去练习纸上，试试吧！' }
    ],
    els: e11
  })

  /* 讲完一招点亮知识地图的一枝 */
  function mapScene(n) {
    var e = mapEls(0, true)
    var moves = e.slice(-3)
    var sits = e.slice(4, 7)
    var XS = [[420, 460], [960, 380], [1500, 460]]
    moves.forEach(function (m, k) {
      m.glow = undefined
      if (k === n - 1) { m.at = [0, '学会']; m.glow = [0, '学会', 0.3] }
      if (k >= n) { m.dim = 0; sits[k].dim = 0 }
    })
    for (var k = 0; k < n; k++) e.push({ t: 'check', x: XS[k][0] + XS[k][1] / 2 + 46, y: 590, at: k === n - 1 ? [0, '学会', 0.3] : 0, sfx: k === n - 1 ? undefined : false })
    var say = ['第一招学会了！还有两招。', '第二招也学会了！还剩最后一招。', '三招都学会了！来个挑战！'][n - 1]
    return { tag: '比轻重 | 学到哪了', beats: [{ sub: say, say: say, pitch: '+5Hz', pause: 0.6 }], els: e }
  }
  S.splice(9, 0, mapScene(3))
  S.splice(7, 0, mapScene(2))
  S.splice(5, 0, mapScene(1))

  /* 封面 */
  var BC = { id: 'bc', x: 960, y: 690, w: 460, s: 0.85 }
  var cv = [
    { t: 'txt', x: 960, y: 130, s: '奥数 · L1 补充 · B02 · 讲解视频', size: 44, color: GREY, font: 'kai', at: 0 },
    { t: 'tape', x: 960, y: 270, s: '推理比较：比轻重', size: 120, at: 0 },
    { t: 'txt', x: 960, y: 410, s: '天平会说话：沉的重，翘的轻', size: 58, color: RED, font: 'kl', at: 0 },
    bal(BC, 0, { tilt: [[null, -9]] }),
    { t: 'txt', x: 960, y: 900, s: '看天平 · 串糖葫芦 · 先拿掉一样的', size: 50, color: GREEN, font: 'kl', at: 0 }
  ]
  pan(cv, BC, 'L', ['apple', 'pear'], 96, 0)
  pan(cv, BC, 'R', ['orange', 'peach'], 82, 0)
  S.cover = { tag: null, els: cv }

  return S
})()
if (typeof module !== 'undefined') module.exports = SCENES
