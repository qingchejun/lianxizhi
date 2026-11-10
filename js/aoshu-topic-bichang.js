/**
 * 知识点「B01 推理比较：比长短」（L1 补充，对照学而思 1 级第 1 讲好方法 1～3，拆题笔记 docs/xes-1ji/01-推理比较.md）。
 * 变式：①绕绳子（数圈数、看粗细）②方格排长短（数格子，半格也算，和粗细横竖无关）③方格路线（横竖线、斜线分开数）。
 * 图全是黑白内联 SVG；答案都用「真实长度」独立算一遍，再要求只靠讲解页的方法就能判断（不出要算 1.4 倍的题）。
 * 讲解页用新版结构（lesson.v2）：先想一想 → 招式卡（每招带生成器例题）→ 用哪一招 → 口诀。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util
  var CIRC = ['①', '②', '③', '④', '⑤', '⑥']
  var PAIRS = [['牛牛', '丁丁'], ['小明', '小红'], ['乐乐', '天天'], ['果果', '朵朵']]

  function svgOpen(w, h, cls) {
    return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">'
  }
  function txt(x, y, s, size, anchor) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 13) + '" text-anchor="' + (anchor || 'middle') + '">' + s + '</text>'
  }

  /* ---------------- 变式①：绕绳子 ---------------- */

  /* 一支横放的铅笔（粗 = 18、细 = 10），中间缠 n 圈绳子（斜线），左边标编号 */
  function pencil(y, thick, turns, label) {
    var h = thick ? 20 : 10
    var x0 = 34
    var L = 220
    var p = []
    p.push(txt(14, y + 5, label, 15))
    p.push('<rect x="' + x0 + '" y="' + (y - h / 2) + '" width="' + L + '" height="' + h + '" fill="#fff" stroke="#000" stroke-width="1.6"/>')
    p.push('<path d="M' + (x0 + L) + ' ' + (y - h / 2) + ' L' + (x0 + L + 16) + ' ' + y + ' L' + (x0 + L) + ' ' + (y + h / 2) + '" fill="#fff" stroke="#000" stroke-width="1.6"/>')
    p.push('<circle cx="' + (x0 + L + 14) + '" cy="' + y + '" r="1.8" fill="#000"/>')
    /* 圈数：斜线等距排在中段，一圈一道 */
    var gap = 14
    var start = x0 + L / 2 - ((turns - 1) * gap) / 2
    for (var i = 0; i < turns; i++) {
      var x = start + i * gap
      p.push('<line x1="' + (x - 4) + '" y1="' + (y + h / 2 + 2) + '" x2="' + (x + 4) + '" y2="' + (y - h / 2 - 2) + '" stroke="#000" stroke-width="3"/>')
    }
    return p.join('')
  }

  function ropeSVG(rods) {
    var gapY = 40
    var h = rods.length * gapY + 6
    var p = [svgOpen(280, h, 'fig-big')]
    rods.forEach(function (r, i) {
      p.push(pencil(24 + i * gapY, r.thick, r.turns, CIRC[i]))
    })
    p.push('</svg>')
    return p.join('')
  }

  /* 真实长度：一圈的长度跟着粗细走（粗的一圈按 1.6 倍算），只用于独立验算 */
  function ropeLen(r) {
    return r.turns * (r.thick ? 1.6 : 1)
  }

  /* a 是否「靠讲解页的办法」就能看出比 b 长：粗细、圈数都不吃亏，且至少一样占优 */
  function ropeBeats(a, b) {
    return a.thick >= b.thick && a.turns >= b.turns && (a.thick > b.thick || a.turns > b.turns)
  }

  function genRope(s) {
    var d = s.difficulty || 'L1'
    var tMax = d === 'L1' ? 6 : 9
    var rods
    var kind
    if (d === 'L3' && U.rand() < 0.6) {
      /* 三根排成一条链：每一根都能被下一根「两个条件都不吃亏」地比下去 */
      var base = U.randInt(3, tMax - 3)
      var cand = [
        { thick: 0, turns: base },
        { thick: 0, turns: base + U.randInt(1, 2) },
        { thick: 1, turns: base + U.randInt(1, 3) }
      ]
      if (cand[2].turns < cand[1].turns) return null
      rods = U.shuffled(cand)
      kind = 'three'
    } else {
      var mode = d === 'L3' ? 'both' : U.pick(['turns', 'thick'])
      var a
      var b
      if (mode === 'turns') {
        var th = U.randInt(0, 1)
        var t1 = U.randInt(3, tMax - 2)
        a = { thick: th, turns: t1 + U.randInt(2, 3) }
        b = { thick: th, turns: t1 }
      } else if (mode === 'thick') {
        var t = U.randInt(3, tMax)
        a = { thick: 1, turns: t }
        b = { thick: 0, turns: t }
      } else {
        var t2 = U.randInt(3, tMax - 2)
        a = { thick: 1, turns: t2 + U.randInt(1, 2) }
        b = { thick: 0, turns: t2 }
      }
      if (a.turns > tMax + 1) return null
      rods = U.rand() < 0.5 ? [a, b] : [b, a]
      kind = mode
    }

    var askLong = U.rand() < 0.5
    var word = askLong ? '长' : '短'
    /* 独立验算：按真实长度找最长 / 最短，再核对它确实被所有人「看得出来地」比下去 */
    var idx = rods.map(function (r, i) { return i })
    idx.sort(function (i, j) { return ropeLen(rods[j]) - ropeLen(rods[i]) })
    var win = askLong ? idx[0] : idx[idx.length - 1]
    var clear = rods.every(function (r, i) {
      return i === win || (askLong ? ropeBeats(rods[win], r) : ropeBeats(r, rods[win]))
    })
    if (!clear) return null

    var desc = rods.map(function (r, i) {
      return CIRC[i] + (r.thick ? '粗' : '细') + '、' + r.turns + ' 圈'
    }).join('；')
    var think
    if (kind === 'turns') think = '两支铅笔一样粗，就数圈数：圈数' + (askLong ? '多' : '少') + '的绳子' + word + '。'
    else if (kind === 'thick') think = '两根绳子圈数一样，就看粗细：缠在' + (askLong ? '粗' : '细') + '铅笔上的绳子' + word + '（粗的绕一圈更长）。'
    else think = '粗细、圈数两样都要看：' + (askLong ? '又粗、圈又多的绳子一定长' : '又细、圈又少的绳子一定短') + '。'
    var many = rods.length > 2
    var stem = '下面' + (many ? '三' : '两') + '支铅笔上缠着绳子，哪根绳子' + (many ? '最' + word : word + '一些') + '？'
    return {
      topic: 'bichang',
      variant: 'rope',
      stem: stem,
      stemHTML: stem + '<div>' + ropeSVG(rods) + '</div>',
      answer: win + 1,
      unit: '',
      ansLabel: '答：第',
      ansSuffix: '根绳子' + (many ? '最' + word : word + '一些') + '。',
      workLabel: '数一数',
      solution: [
        { tag: '想一想', text: think },
        { tag: '数一数', text: desc + '。' },
        { tag: '小心陷阱', text: kind === 'thick' ? '圈数一样不等于一样长！粗的铅笔绕一圈，绳子用得多。' : '别只数圈数，先看看铅笔一样不一样粗。' },
        { tag: '答', text: '第 ' + (win + 1) + ' 根绳子' + (many ? '最' + word : word + '一些') + '。' }
      ],
      key: 'rope:' + rods.map(function (r) { return r.thick + '/' + r.turns }).join(',') + ':' + (askLong ? 'L' : 'S')
    }
  }

  /* ---------------- 变式②：方格排长短 ---------------- */

  var CELL = 18
  var COLS = 15
  var ROWS = 8

  /* bars: [{dir:'h'|'v', x, y, len, thick}]，x/y 以格为单位（横条 y 取行中线，竖条 x 取列中线） */
  function gridSVG(bars) {
    /* 上边、右边各留一条白边放编号，贴边的铅笔编号才不会被裁掉 */
    var ox = 4
    var oy = 16
    var W = COLS * CELL + ox + 14
    var H = ROWS * CELL + oy + 4
    var p = [svgOpen(W, H, 'fig-big')]
    for (var c = 0; c <= COLS; c++) p.push('<line x1="' + (ox + c * CELL) + '" y1="' + oy + '" x2="' + (ox + c * CELL) + '" y2="' + (oy + ROWS * CELL) + '" stroke="#999" stroke-width="0.8"/>')
    for (var r = 0; r <= ROWS; r++) p.push('<line x1="' + ox + '" y1="' + (oy + r * CELL) + '" x2="' + (ox + COLS * CELL) + '" y2="' + (oy + r * CELL) + '" stroke="#999" stroke-width="0.8"/>')
    bars.forEach(function (b, i) {
      var sw = b.thick ? 8 : 4
      var x1, y1, x2, y2, lx, ly
      if (b.dir === 'h') {
        x1 = ox + b.x * CELL; x2 = x1 + b.len * CELL; y1 = y2 = oy + (b.y + 0.5) * CELL
        lx = x1; ly = y1 - 6
      } else {
        y1 = oy + b.y * CELL; y2 = y1 + b.len * CELL; x1 = x2 = ox + (b.x + 0.5) * CELL
        lx = x1 - 4; ly = y1 - 4
      }
      p.push('<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#000" stroke-width="' + sw + '" stroke-linecap="butt"/>')
      p.push('<text x="' + lx + '" y="' + ly + '" font-size="12" font-weight="700" text-anchor="start" fill="#000" stroke="#fff" stroke-width="3" paint-order="stroke">' + (i + 1) + '</text>')
    })
    p.push('</svg>')
    return p.join('')
  }

  function lenText(len) {
    var whole = Math.floor(len)
    return len % 1 ? (whole ? whole + ' 格半' : '半格') : len + ' 格'
  }

  function genGrid(s) {
    var d = s.difficulty || 'L1'
    var n = d === 'L1' ? 3 : d === 'L2' ? 4 : 5
    var half = d === 'L3'
    var nV = d === 'L1' ? 0 : d === 'L2' ? U.randInt(1, 2) : U.randInt(2, 3)
    var nH = n - nV
    /* 横条：放在 0～8 列，每条占一行（行之间空一行）；竖条：放在 10、12、14 列 */
    var lens = []
    var bars = []
    /* 横条之间至少空一行，编号才不会压到别的铅笔上 */
    var rowsH = nH <= 4 ? [1, 3, 5, 7].slice(0, nH) : [0, 2, 4, 6, 7]
    if (nH < 4 && U.rand() < 0.5) rowsH = [2, 4, 6].slice(0, nH)
    for (var i = 0; i < nH; i++) {
      var len = U.randInt(2, 8) + (half && U.rand() < 0.5 ? 0.5 : 0)
      if (len > 8.5) return null
      var x = U.randInt(0, Math.floor(9 - len))
      bars.push({ dir: 'h', x: x, y: rowsH[i], len: len })
      lens.push(len)
    }
    var colsV = U.shuffled([10, 12, 14]).slice(0, nV).sort(function (a, b) { return a - b }) // 竖条之间空一列，编号不压线
    for (var j = 0; j < nV; j++) {
      var lv = U.randInt(2, 7) + (half && U.rand() < 0.5 ? 0.5 : 0)
      if (lv > ROWS) return null
      var yv = U.randInt(0, Math.floor(ROWS - lv))
      bars.push({ dir: 'v', x: colsV[j], y: yv, len: lv })
      lens.push(lv)
    }
    /* 长度互不相同，最短和最长差得开（不出 7 格 vs 7 格半 这种看不出差别的排序题） */
    var sorted = lens.slice().sort(function (a, b) { return a - b })
    for (var k = 1; k < sorted.length; k++) if (sorted[k] === sorted[k - 1]) return null
    if (half && !lens.some(function (l) { return l % 1 })) return null
    /* 粗细陷阱：L2 起随机一两条画粗——最粗的不能恰好就是最长的，否则陷阱白设 */
    if (d !== 'L1') {
      var shortest = lens.indexOf(sorted[0])
      bars[shortest].thick = true
      if (d === 'L3') bars[lens.indexOf(sorted[1])].thick = true
    }
    /* 编号打乱：编号顺序 ≠ 长短顺序 */
    var order = U.shuffled(bars.map(function (b, i) { return i }))
    bars = order.map(function (i) { return bars[i] })
    lens = order.map(function (i) { return lens[i] })
    var byLen = lens.map(function (l, i) { return i }).sort(function (a, b) { return lens[a] - lens[b] })
    var asc = d === 'L3' ? U.rand() < 0.5 : true
    var count = lens.map(function (l, i) { return (i + 1) + ' 号 ' + lenText(l) }).join('，')

    var stem
    var answer
    var ansLabel
    var ansSuffix
    var ansText
    if (d === 'L1') {
      var askLong = U.rand() < 0.5
      var w = askLong ? byLen[byLen.length - 1] : byLen[0]
      stem = '方格里有 3 支铅笔，哪一支最' + (askLong ? '长' : '短') + '？'
      answer = w + 1
      ansLabel = '答：'
      ansSuffix = '号铅笔最' + (askLong ? '长' : '短') + '。'
      ansText = (w + 1) + ' 号铅笔最' + (askLong ? '长' : '短')
    } else {
      var seq = asc ? byLen : byLen.slice().reverse()
      stem = '把方格里带编号的铅笔按从' + (asc ? '短到长' : '长到短') + '的顺序排一排。'
      answer = seq.map(function (i) { return (i + 1) + ' 号' }).join(' → ')
      ansLabel = '答：从' + (asc ? '短到长' : '长到短') + '是'
      ansSuffix = '。'
      ansText = '从' + (asc ? '短到长' : '长到短') + '是 ' + answer
    }
    return {
      topic: 'bichang',
      variant: 'grid',
      stem: stem,
      stemHTML: stem + '<div>' + gridSVG(bars) + '</div>',
      answer: answer,
      unit: '',
      ansLabel: ansLabel,
      ansSuffix: ansSuffix,
      workLabel: '数一数',
      solution: [
        { tag: '想一想', text: '每一格一样大，数每支铅笔占了几格' + (half ? '（半格也要算）' : '') + '，格数多的长。' },
        { tag: '数一数', text: count + '。' },
        { tag: '小心陷阱', text: d === 'L1' ? '横着摆、竖着摆都一样，只看占几格。' : '画得粗的不一定长！比长短只看格数，不看粗细、横竖。' },
        { tag: '答', text: ansText + '。' }
      ],
      key: 'grid:' + bars.map(function (b) { return b.dir + b.x + '.' + b.y + '.' + b.len + (b.thick ? 't' : '') }).join(',') + ':' + d + (asc ? 'a' : 'd')
    }
  }

  /* ---------------- 变式③：方格路线 ---------------- */

  var RCELL = 24

  /* 走法：E 横、U/D 竖、R/F 斜（右上 / 右下）。返回点列；越界返回 null */
  function walk(moves, y0, H) {
    var x = 0
    var y = y0
    var pts = [[0, y0]]
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i]
      if (m === 'E') x++
      else if (m === 'U') y--
      else if (m === 'D') y++
      else if (m === 'R') { x++; y-- }
      else if (m === 'F') { x++; y++ }
      if (y < 0 || y > H) return null
      pts.push([x, y])
    }
    return pts
  }

  function countMoves(moves) {
    var dg = 0
    var st = 0
    moves.forEach(function (m) {
      if (m === 'R' || m === 'F') dg++
      else st++
    })
    return { dg: dg, st: st }
  }

  /* L1：一条横路 W 格，中间拱起 1～2 个「凸起」（上去 h 格、横走、下来 h 格） */
  function bumpMoves(W, bumps) {
    var mv = []
    var x = 0
    bumps.sort(function (a, b) { return a.at - b.at })
    bumps.forEach(function (b) {
      while (x < b.at) { mv.push('E'); x++ }
      for (var i = 0; i < b.h; i++) mv.push('U')
      for (var j = 0; j < b.w; j++) { mv.push('E'); x++ }
      for (var k = 0; k < b.h; k++) mv.push('D')
    })
    while (x < W) { mv.push('E'); x++ }
    return mv
  }

  /* L2/L3：从左走到右，随机夹带斜线和上下台阶；不许原路折返（U 紧跟 D） */
  function randomMoves(W, H, y0, diagP) {
    var mv = []
    var x = 0
    var y = y0
    var guard = 0
    while (x < W && guard++ < 60) {
      var r = U.rand()
      var m
      if (r < diagP) m = U.rand() < 0.5 ? 'R' : 'F'
      else if (r < diagP + 0.25) m = U.rand() < 0.5 ? 'U' : 'D'
      else m = 'E'
      var last = mv[mv.length - 1]
      if ((m === 'U' && last === 'D') || (m === 'D' && last === 'U')) continue
      var ny = y + (m === 'U' || m === 'R' ? -1 : m === 'D' || m === 'F' ? 1 : 0)
      if (ny < 0 || ny > H) continue
      mv.push(m)
      y = ny
      if (m === 'E' || m === 'R' || m === 'F') x++
    }
    return x === W ? mv : null
  }

  function routeSVG(paths, names, W, H) {
    var bandH = (H + 1) * RCELL
    var gx = 52
    var Wpx = gx + W * RCELL + 30
    var Hpx = paths.length * (bandH + 12) + 4
    var p = [svgOpen(Wpx, Hpx, 'fig-route')]
    paths.forEach(function (pts, i) {
      var oy = 6 + i * (bandH + 12)
      for (var c = 0; c <= W; c++) p.push('<line x1="' + (gx + c * RCELL) + '" y1="' + oy + '" x2="' + (gx + c * RCELL) + '" y2="' + (oy + H * RCELL) + '" stroke="#bbb" stroke-width="0.8"/>')
      for (var r = 0; r <= H; r++) p.push('<line x1="' + gx + '" y1="' + (oy + r * RCELL) + '" x2="' + (gx + W * RCELL) + '" y2="' + (oy + r * RCELL) + '" stroke="#bbb" stroke-width="0.8"/>')
      var d = pts.map(function (pt, k) {
        return (k ? 'L' : 'M') + (gx + pt[0] * RCELL) + ' ' + (oy + pt[1] * RCELL)
      }).join(' ')
      p.push('<path d="' + d + '" fill="none" stroke="#000" stroke-width="3" stroke-linejoin="round"/>')
      var s0 = pts[0]
      var e = pts[pts.length - 1]
      p.push('<circle cx="' + (gx + s0[0] * RCELL) + '" cy="' + (oy + s0[1] * RCELL) + '" r="3.5" fill="#000"/>')
      p.push(txt(gx - 6, oy + s0[1] * RCELL + 5, names[i], 15, 'end'))
      /* 终点小旗 */
      var fx = gx + e[0] * RCELL
      var fy = oy + e[1] * RCELL
      p.push('<line x1="' + fx + '" y1="' + fy + '" x2="' + fx + '" y2="' + (fy - 16) + '" stroke="#000" stroke-width="1.6"/>')
      p.push('<path d="M' + fx + ' ' + (fy - 16) + ' L' + (fx + 11) + ' ' + (fy - 12) + ' L' + fx + ' ' + (fy - 8) + ' Z" fill="#000"/>')
    })
    p.push('</svg>')
    return p.join('')
  }

  function genRoute(s) {
    var d = s.difficulty || 'L1'
    var names = U.pick(PAIRS)
    var W
    var H
    var mvA
    var mvB
    var y0
    if (d === 'L1') {
      W = U.randInt(8, 11)
      H = 3
      y0 = 3
      var hA = U.randInt(1, 3)
      var hB = U.randInt(1, 3)
      if (hA === hB && U.rand() < 0.7) return null
      var atA = U.randInt(1, W - 4)
      var atB = U.randInt(1, W - 4)
      mvA = bumpMoves(W, [{ at: atA, h: hA, w: U.randInt(1, 2) }])
      mvB = bumpMoves(W, [{ at: atB, h: hB, w: U.randInt(1, 2) }])
      if (walk(mvA, y0, H) === null || walk(mvB, y0, H) === null) return null
    } else {
      W = U.randInt(6, d === 'L2' ? 8 : 10)
      H = 2 // 只有两行高，同样的图高里每格更大，好数
      y0 = U.randInt(0, H)
      var p = d === 'L2' ? 0.3 : 0.45
      mvA = randomMoves(W, H, y0, p)
      mvB = randomMoves(W, H, y0, p)
      if (!mvA || !mvB) return null
    }
    var a = countMoves(mvA)
    var b = countMoves(mvB)
    if (d !== 'L1' && a.dg + b.dg === 0) return null
    /* 只出「分开数就能比」的：一样多，或一种线一样多 / 两种线都不吃亏 */
    var aLong = a.dg >= b.dg && a.st >= b.st
    var bLong = b.dg >= a.dg && b.st >= a.st
    if (!aLong && !bLong) return null
    var same = aLong && bLong
    /* 独立验算：真实长度（斜线按 1.414 格） */
    var la = a.st + a.dg * Math.SQRT2
    var lb = b.st + b.dg * Math.SQRT2
    if (same !== (Math.abs(la - lb) < 1e-9)) return null
    var first = same ? '' : la < lb ? names[0] : names[1]

    var tell
    if (d === 'L1') {
      tell = names[0] + '：横线 ' + W + ' 段、竖线 ' + (a.st - W) + ' 段，一共 ' + a.st + ' 段；' +
        names[1] + '：横线 ' + W + ' 段、竖线 ' + (b.st - W) + ' 段，一共 ' + b.st + ' 段。'
    } else {
      tell = names[0] + '：斜线 ' + a.dg + ' 条、横竖线 ' + a.st + ' 段；' + names[1] + '：斜线 ' + b.dg + ' 条、横竖线 ' + b.st + ' 段。'
    }
    var cmp
    if (same) cmp = '两种线都一样多，两条路一样长。'
    else if (d === 'L1') cmp = (la < lb ? names[0] : names[1]) + '的路少 ' + Math.abs(a.st - b.st) + ' 段，路短。'
    else if (a.dg === b.dg) cmp = '斜线一样多，横竖线' + first + '少 ' + Math.abs(a.st - b.st) + ' 段，' + first + '的路短。'
    else if (a.st === b.st) cmp = '横竖线一样多，斜线' + first + '少 ' + Math.abs(a.dg - b.dg) + ' 条，' + first + '的路短。'
    else cmp = first + '的斜线少、横竖线也少，路一定短。'

    var ansText = same ? '两人同时到' : first + '先到'
    var stem = names[0] + '和' + names[1] + '走得一样快，同时出发去小旗那里，谁先到？'
    return {
      topic: 'bichang',
      variant: 'route',
      stem: stem,
      stemHTML: stem + '<div>' + routeSVG([walk(mvA, y0, H), walk(mvB, y0, H)], names, W, H) + '</div>',
      answer: ansText,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '。',
      workLabel: '数一数',
      solution: [
        { tag: '想一想', text: d === 'L1' ? '每一小段横线、竖线一样长，数一数各走了几段，段数少的路短，先到。' : '横线竖线每段一样长，斜线比它们长，要分开数，同一种线比多少。' },
        { tag: '数一数', text: tell },
        { tag: '比一比', text: cmp },
        { tag: '小心陷阱', text: d === 'L1' ? '拐上去、拐下来的竖线也要数，别只数横着走的。' : '斜线不能当成一段横线来数，它更长。' },
        { tag: '答', text: ansText + '。' }
      ],
      key: 'route:' + d + ':' + mvA.join('') + '|' + mvB.join('') + ':' + y0
    }
  }

  /* ---------------- 讲解页里的小插图 ---------------- */

  /* 先想一想：箭头错觉（两条一样长的线） */
  var HOOK_SVG = (function () {
    var p = [svgOpen(240, 92)]
    function arrow(y, out) {
      var x1 = 50
      var x2 = 190
      var dx = out ? -14 : 14
      p.push('<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="#000" stroke-width="2.4"/>')
      p.push('<path d="M' + (x1 - dx) + ' ' + (y - 12) + ' L' + x1 + ' ' + y + ' L' + (x1 - dx) + ' ' + (y + 12) + '" fill="none" stroke="#000" stroke-width="2.4"/>')
      p.push('<path d="M' + (x2 + dx) + ' ' + (y - 12) + ' L' + x2 + ' ' + y + ' L' + (x2 + dx) + ' ' + (y + 12) + '" fill="none" stroke="#000" stroke-width="2.4"/>')
    }
    arrow(24, true)
    arrow(70, false)
    p.push(txt(20, 29, '①', 15), txt(20, 75, '②', 15))
    p.push('</svg>')
    return p.join('')
  })()

  /* 招 1：同样一圈，粗的更长 */
  var ROPE_FIG = (function () {
    var p = [svgOpen(170, 86)]
    p.push('<circle cx="42" cy="34" r="13" fill="none" stroke="#000" stroke-width="2.4"/>')
    p.push('<circle cx="122" cy="32" r="26" fill="none" stroke="#000" stroke-width="2.4"/>')
    p.push(txt(42, 80, '细的绕一圈', 11), txt(122, 80, '粗的绕一圈', 11))
    p.push('</svg>')
    return p.join('')
  })()

  /* 招 3：一格里，斜线比边长 */
  var DIAG_FIG = (function () {
    var p = [svgOpen(170, 80)]
    p.push('<rect x="20" y="10" width="54" height="54" fill="none" stroke="#999" stroke-width="1"/>')
    p.push('<line x1="20" y1="64" x2="74" y2="64" stroke="#000" stroke-width="3.5"/>')
    p.push(txt(47, 78, '横线', 11))
    p.push('<rect x="100" y="10" width="54" height="54" fill="none" stroke="#999" stroke-width="1"/>')
    p.push('<line x1="100" y1="64" x2="154" y2="10" stroke="#000" stroke-width="3.5"/>')
    p.push(txt(127, 78, '斜线更长', 11))
    p.push('</svg>')
    return p.join('')
  })()

  var BICHANG = {
    id: 'bichang',
    no: 'B01',
    stage: 'L1B',
    name: '推理比较：比长短',
    lesson: {
      v2: true,
      title: '推理比较：比长短 · 方法讲解',
      goal: '眼睛有时会骗人。今天学三招，用办法比出谁长谁短。',
      sections: [
        {
          kind: 'hook',
          heading: '先想一想',
          paras: [
            '① 和 ② 两条线，哪条长？看上去 ① 更长吧？',
            '用尺子量一量——两条一样长！眼睛会骗人，比长短不能只靠看。'
          ],
          figHTML: HOOK_SVG
        },
        {
          kind: 'move',
          name: '数圈数，看粗细',
          tip: '绳子缠在铅笔、树干上，拉不直，就看它缠了几圈、缠在多粗的东西上。',
          steps: [
            '先看两支铅笔一样粗吗？',
            '一样粗：圈数多的绳子长。',
            '圈数一样：缠在粗铅笔上的绳子长——粗的绕一圈要用更多绳子。'
          ],
          pitfall: '别一上来就数圈数，先看粗细。',
          figHTML: ROPE_FIG,
          variants: ['rope']
        },
        {
          kind: 'move',
          name: '数格子',
          tip: '东西摆在方格里，每一格一样大，格子就是我们的尺子。',
          steps: [
            '一支一支数：占了几格，写在旁边。',
            '不满一格的半格也要记上（比如 3 格半）。',
            '按格数排队：格数少的短，格数多的长。'
          ],
          pitfall: '画得粗的不一定长，横着竖着也没关系——只看格数。',
          variants: ['grid']
        },
        {
          kind: 'move',
          name: '路线分开数',
          tip: '在方格里走路，路线是一段一段的。',
          steps: [
            '横线、竖线：每一段一样长。斜线比它们长，是另一种线。',
            '两条路分别数：斜线几条？横竖线几段？',
            '同一种线比多少：一种一样多，就比另一种；少的路短，先到。'
          ],
          pitfall: '拐上去又拐下来的竖线也要数；斜线不能当一段横线。',
          figHTML: DIAG_FIG,
          variants: ['route']
        },
        {
          kind: 'pick',
          heading: '用哪一招？',
          rows: [
            ['绳子缠在铅笔、树上', '数圈数，看粗细', ['rope']],
            ['东西摆在方格里', '数格子', ['grid']],
            ['在方格里走路，比谁先到', '路线分开数', ['route']]
          ]
        },
        { kind: 'chant', chant: '眼睛会骗人，比长短靠办法：先看粗细再数圈，方格里面数格子，路线横竖斜线分开数。' }
      ]
    },
    variants: [
      {
        id: 'rope',
        setting: 'vBcRope',
        label: '绕绳子（数圈数、看粗细）',
        idea: '先看铅笔一样粗吗：一样粗就数圈数，圈多的长；圈数一样就看粗细，缠在粗的上面的长。',
        gen: genRope
      },
      {
        id: 'grid',
        setting: 'vBcGrid',
        label: '方格排长短（数格子）',
        idea: '每格一样大，一支一支数占了几格，半格也要算；只看格数排队，不管粗细和横竖。',
        gen: genGrid
      },
      {
        id: 'route',
        setting: 'vBcRoute',
        label: '方格路线（横竖斜分开数）',
        idea: '横线竖线每段一样长、斜线更长，两条路分开数各有几条，同一种线比多少，少的先到。',
        gen: genRoute
      }
    ],
    generate: function (s) {
      return U.generateFrom(BICHANG.variants, s)
    },
    titleFor: function (s) {
      return '推理比较：比长短练习 · ' + U.DIFF_LABEL[s.difficulty || 'L1']
    }
  }

  root.SumSum.aoshu.topics.bichang = BICHANG
  root.SumSum.aoshu.topicList.push(BICHANG)
})(typeof window !== 'undefined' ? window : globalThis)
