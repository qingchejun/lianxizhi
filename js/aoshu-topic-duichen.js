/**
 * 知识点「B05 轴对称图形」（L1 补充，对照学而思 1 级第 15 讲好方法 1～4 和练 2～12、练 14，
 * 拆题笔记 docs/xes-1ji/15-感受对称之美.md 的 K1～K10、M1～M4；镜子里的对称（好方法 5、6）留给 B06）。
 * 变式：①哪个是轴对称图形（方格图；入门 3 选 1、提高 4 选 1、挑战 4 选 2，可能是横轴、斜轴）
 *       ②有几条对称轴（标准图形两个；挑战加方格图，程序数轴）
 *       ③哪组成轴对称（方格图对子；干扰：只挪过去没翻面、翻了差一格、上下翻）
 *       ④补另一半（def:false，答案栏写补完一共几格；挑战对称轴横放或穿过一列格子）
 * 方格图编码：「宽.高.01串」（按行），key 里带上，tools/check-aoshu-gen.js 的 checkDuichen 从 key 独立重算。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util
  var CIRC = ['①', '②', '③', '④']

  /* ---------------- 方格图 ---------------- */

  /* g = { w, h, c: [[0/1]] }，c[r][col] */
  function make(w, h) {
    var c = []
    for (var r = 0; r < h; r++) { c.push([]); for (var k = 0; k < w; k++) c[r].push(0) }
    return { w: w, h: h, c: c }
  }
  function code(g) { return g.w + '.' + g.h + '.' + g.c.map(function (row) { return row.join('') }).join('') }
  function count(g) { var n = 0; g.c.forEach(function (row) { row.forEach(function (v) { n += v }) }); return n }
  function same(a, b) { return code(a) === code(b) }
  function map(g, w, h, f) { var o = make(w, h); for (var r = 0; r < h; r++) for (var k = 0; k < w; k++) o.c[r][k] = f(r, k); return o }
  function flipV(g) { return map(g, g.w, g.h, function (r, k) { return g.c[r][g.w - 1 - k] }) }   /* 左右翻 */
  function flipH(g) { return map(g, g.w, g.h, function (r, k) { return g.c[g.h - 1 - r][k] }) }   /* 上下翻 */
  function transpose(g) { return map(g, g.h, g.w, function (r, k) { return g.c[k][r] }) }
  function rot(g) { return map(g, g.h, g.w, function (r, k) { return g.c[g.h - 1 - k][r] }) }      /* 顺时针转 90° */
  function or(a, b) { return map(a, a.w, a.h, function (r, k) { return a.c[r][k] | b.c[r][k] }) }

  /* 去掉四周空行空列 */
  function trim(g) {
    var r0 = g.h, r1 = -1, k0 = g.w, k1 = -1
    for (var r = 0; r < g.h; r++) for (var k = 0; k < g.w; k++) if (g.c[r][k]) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); k0 = Math.min(k0, k); k1 = Math.max(k1, k) }
    if (r1 < 0) return make(0, 0)
    return map(g, k1 - k0 + 1, r1 - r0 + 1, function (r, k) { return g.c[r + r0][k + k0] })
  }
  /* 对称轴：竖、横、两条斜（只有正方形外框才可能有斜轴） */
  function axesOf(g0) {
    var g = trim(g0)
    var out = []
    if (same(g, flipV(g))) out.push('v')
    if (same(g, flipH(g))) out.push('h')
    if (g.w === g.h) {
      if (same(g, transpose(g))) out.push('d1')
      if (same(g, rot(rot(transpose(g))))) out.push('d2')
    }
    return out
  }
  /* 格子要连成一块（上下左右挨着） */
  function connected(g) {
    var seen = {}, start = null, n = 0
    for (var r = 0; r < g.h; r++) for (var k = 0; k < g.w; k++) if (g.c[r][k]) { n++; if (!start) start = [r, k] }
    if (!start) return false
    var st = [start], m = 0
    seen[start.join()] = 1
    while (st.length) {
      var p = st.pop(); m++
      ;[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var r2 = p[0] + d[0], k2 = p[1] + d[1]
        if (r2 >= 0 && r2 < g.h && k2 >= 0 && k2 < g.w && g.c[r2][k2] && !seen[r2 + ',' + k2]) { seen[r2 + ',' + k2] = 1; st.push([r2, k2]) }
      })
    }
    return m === n
  }
  function full(g) { var t = trim(g); return t.w === g.w && t.h === g.h }
  function rnd(w, h, p) { return map(make(w, h), w, h, function () { return U.rand() < p ? 1 : 0 }) }

  /* 有某种对称的图：kind = v 竖轴 / h 横轴 / d 斜轴 / vh 横竖都有 / all 四条 */
  function symFig(w, h, kind) {
    for (var t = 0; t < 40; t++) {
      var g = rnd(w, h, 0.32)
      if (kind === 'v') g = or(g, flipV(g))
      else if (kind === 'h') g = or(g, flipH(g))
      else if (kind === 'd') g = or(g, transpose(g))
      else if (kind === 'vh') { g = or(g, flipV(g)); g = or(g, flipH(g)) }
      else if (kind === 'all') { g = or(g, flipV(g)); g = or(g, flipH(g)); g = or(g, transpose(g)) }
      var n = count(g)
      if (!connected(g) || !full(g) || n < 5 || n > w * h - 3) continue
      var ax = axesOf(g)
      var want = { v: 1, h: 1, d: 1, vh: 2, all: 4 }[kind]
      if (ax.length !== want) continue
      return g
    }
    return null
  }
  /* 不对称的图：从对称图改一格；或者「风车」（转着对称，一条轴也没有） */
  function asymFrom(g) {
    for (var t = 0; t < 30; t++) {
      var r = U.randInt(0, g.h - 1), k = U.randInt(0, g.w - 1)
      var o = map(g, g.w, g.h, function (rr, kk) { return rr === r && kk === k ? 1 - g.c[rr][kk] : g.c[rr][kk] })
      if (connected(o) && full(o) && count(o) >= 5 && axesOf(o).length === 0) return o
    }
    return null
  }
  function pinwheel(n) {
    for (var t = 0; t < 60; t++) {
      var g = rnd(n, n, 0.25)
      var a = g
      for (var i = 0; i < 3; i++) { a = rot(a); g = or(g, a) }
      if (connected(g) && full(g) && axesOf(g).length === 0 && count(g) >= 6 && count(g) <= n * n - 4) return g
    }
    return null
  }
  /* 不对称、大小合适的图（成对题的左边那个） */
  function asymFig(w, h) {
    for (var t = 0; t < 60; t++) {
      var g = rnd(w, h, 0.45)
      if (connected(g) && full(g) && axesOf(g).length === 0 && count(g) >= 4 && count(g) <= w * h - 2 &&
        !same(flipV(g), flipH(g))) return g
    }
    return null
  }

  /* ---------------- 画方格 ---------------- */

  var C = 14

  function cells(g, ox, oy, o) {
    o = o || {}
    var p = []
    for (var r = 0; r < g.h; r++) for (var k = 0; k < g.w; k++) {
      var on = g.c[r][k]
      if (on || o.grid) p.push('<rect x="' + (ox + k * C) + '" y="' + (oy + r * C) + '" width="' + C + '" height="' + C + '" fill="' + (on ? (o.fill || '#9a9a9a') : '#fff') + '" stroke="' + (on ? '#000' : '#bbb') + '" stroke-width="' + (on ? 1 : 0.7) + '"/>')
    }
    return p.join('')
  }
  function svgOpen(w, h, cls, style) {
    return '<svg ' + (style ? 'style="' + style + '"' : 'class="' + (cls || 'fig-big') + '"') + ' viewBox="0 0 ' + w + ' ' + h + '" width="' + w * 2 + '" height="' + h * 2 + '">'
  }
  function dash(x1, y1, x2, y2) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#000" stroke-width="2" stroke-dasharray="5 3"/>'
  }
  /* 一排方格图，每个带编号 */
  function figsSVG(gs, style) {
    var GAP = 16, top = 16
    var W = 6, H = 0
    gs.forEach(function (g) { W += g.w * C + GAP; H = Math.max(H, g.h * C) })
    var p = [svgOpen(W, H + top + 4, null, style)]
    var x = 6
    gs.forEach(function (g, i) {
      p.push('<text x="' + x + '" y="12" font-size="12" text-anchor="start">' + CIRC[i] + '</text>')
      p.push(cells(map(g, g.w, g.h, function (r, k) { return g.c[r][k] }), x, top + (H - g.h * C) / 2, { grid: true }))
      x += g.w * C + GAP
    })
    p.push('</svg>')
    return p.join('')
  }

  /* ---------------- 变式①：哪个是轴对称图形 ---------------- */

  function axisName(a) { return { v: '竖着', h: '横着', d1: '斜着', d2: '斜着' }[a] }

  function genJudge(s) {
    var d = s.difficulty || 'L1'
    var n = d === 'L1' ? 3 : 4
    var nYes = d === 'L3' ? 2 : 1
    var kinds = d === 'L1' ? ['v'] : d === 'L2' ? ['v', 'h'] : ['v', 'h', 'd', 'vh']
    var figs = []
    for (var i = 0; i < nYes; i++) {
      var k = U.pick(kinds)
      var sz = k === 'd' || k === 'vh' ? 4 : U.randInt(4, 5)
      var g = k === 'd' ? symFig(4, 4, 'd') : k === 'h' ? symFig(U.randInt(3, 4), sz, 'h') : symFig(sz, U.randInt(3, 4), k)
      if (!g) return null
      figs.push({ g: g, yes: true })
    }
    while (figs.length < n) {
      var base = figs[U.randInt(0, nYes - 1)].g
      var no = d !== 'L1' && U.rand() < 0.35 ? pinwheel(4) : asymFrom(symFig(base.w, base.h, U.pick(kinds) === 'h' ? 'h' : 'v') || base)
      if (!no) return null
      figs.push({ g: no, yes: false })
    }
    for (var a = 0; a < figs.length; a++) for (var b = a + 1; b < figs.length; b++) if (same(figs[a].g, figs[b].g)) return null
    figs = U.shuffled(figs)
    var yesIdx = []
    figs.forEach(function (f, i) { if (f.yes) yesIdx.push(i) })
    if (nYes === 1 && yesIdx[0] === 0 && U.rand() < 0.5) return null
    var answer = yesIdx.map(function (i) { return CIRC[i] }).join('')
    var stem = nYes === 1 ? '下面哪个是轴对称图形？' : '下面哪两个是轴对称图形？'
    var sol = [{ tag: '想一想', text: '轴对称图形：沿一条直线对折，两边能完全重合。竖着、横着、斜着都试一试。' }]
    sol.push({ tag: '折一折', text: figs.map(function (f, i) {
      if (f.yes) return CIRC[i] + ' ' + axesOf(f.g).map(axisName).filter(function (x, j, arr) { return arr.indexOf(x) === j }).join('、') + '对折能重合，是'
      return CIRC[i] + ' 怎么折都差一点，不是'
    }).join('；') + '。' })
    var trap = figs.some(function (f) { return !f.yes && same(trim(f.g), trim(rot(rot(f.g)))) })
      ? '像风车那样转一转能和自己一样的，不算轴对称图形，要「对折」重合才算。'
      : '只差一个格子也不行，要两边完全重合。'
    sol.push({ tag: '小心陷阱', text: trap })
    sol.push({ tag: '答', text: answer + (nYes === 1 ? ' 是轴对称图形。' : ' 是轴对称图形。') })
    return {
      topic: 'duichen',
      variant: 'judge',
      stem: stem,
      stemHTML: stem + '<div>' + figsSVG(figs.map(function (f) { return f.g }), 'width:100%;height:auto;max-height:30mm;max-width:' + figs.length * 34 + 'mm') + '</div>',
      answer: answer,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '号。',
      workLabel: '折一折',
      solution: sol,
      key: 'judge:' + figs.map(function (f) { return code(f.g) }).join('|')
    }
  }

  /* ---------------- 变式②：有几条对称轴 ---------------- */

  /* 标准图形，画在 100×100 里；axes 是对称轴条数（-1 = 无数条） */
  var SH = {
    square: { axes: 4, lv: 1, svg: '<rect x="15" y="15" width="70" height="70"/>' },
    rect: { axes: 2, lv: 1, svg: '<rect x="5" y="25" width="90" height="50"/>' },
    circle: { axes: -1, lv: 1, svg: '<circle cx="50" cy="50" r="38"/>' },
    iso: { axes: 1, lv: 1, svg: '<polygon points="50,22 92,80 8,80"/>' },
    heart: { axes: 1, lv: 1, svg: '<path d="M50 88 C20 66 6 48 10 32 C14 16 36 12 50 30 C64 12 86 16 90 32 C94 48 80 66 50 88 Z"/>' },
    semi: { axes: 1, lv: 1, svg: '<path d="M10 70 A40 40 0 0 1 90 70 Z"/>' },
    equi: { axes: 3, lv: 2, svg: '<polygon points="50,12 90,81 10,81"/>' },
    trap: { axes: 1, lv: 2, svg: '<polygon points="30,25 70,25 94,78 6,78"/>' },
    rhombus: { axes: 2, lv: 2, svg: '<polygon points="50,12 86,50 50,88 14,50"/>' },
    seg: { axes: 2, lv: 2, svg: '<line x1="10" y1="50" x2="90" y2="50"/><circle cx="10" cy="50" r="3" fill="#000"/><circle cx="90" cy="50" r="3" fill="#000"/>' },
    angle: { axes: 1, lv: 2, svg: '<polyline points="88,22 12,50 88,78"/>' },
    para: { axes: 0, lv: 2, svg: '<polygon points="30,25 94,25 70,75 6,75"/>' },
    right: { axes: 0, lv: 2, svg: '<polygon points="12,20 12,82 92,82"/>' },
    hexa: { axes: 6, lv: 3, svg: '<polygon points="30,15.4 70,15.4 90,50 70,84.6 30,84.6 10,50"/>' },
    star5: { axes: 5, lv: 3, svg: '<polygon points="50,8 59.9,36.4 90,37 66,55.3 74.7,84 50,67 25.3,84 34,55.3 10,37 40.1,36.4"/>' },
    star4: { axes: 4, lv: 3, svg: '<polygon points="50,6 58,42 94,50 58,58 50,94 42,58 6,50 42,42"/>' }
  }
  function axesText(n) { return n < 0 ? '无数条' : n + ' 条' }
  function shapeBox(inner, x, label) {
    return '<text x="' + (x + 2) + '" y="12" font-size="12">' + label + '</text>' +
      '<g transform="translate(' + x + ',16)" fill="#fff" stroke="#000" stroke-width="2.4" stroke-linejoin="round">' + inner + '</g>'
  }

  function genAxes(s) {
    var d = s.difficulty || 'L1'
    var lv = d === 'L1' ? 1 : d === 'L2' ? 2 : 3
    var ids = Object.keys(SH).filter(function (k) { return SH[k].lv <= lv })
    var items = []
    var pickIds = U.shuffled(ids)
    if (lv > 1) {
      /* 至少一个本档新加的图形 */
      var fresh = ids.filter(function (k) { return SH[k].lv === lv })
      pickIds = [U.pick(fresh)].concat(pickIds.filter(function (k) { return pickIds.indexOf(k) >= 0 }))
    }
    for (var i = 0; i < pickIds.length && items.length < 2; i++) if (items.every(function (it) { return it.id !== pickIds[i] })) items.push({ id: pickIds[i], axes: SH[pickIds[i]].axes })
    if (lv === 3 && U.rand() < 0.5) {
      var kind = U.pick(['v', 'vh', 'all', 'none'])
      var g = kind === 'none' ? pinwheel(4) : symFig(kind === 'v' ? 5 : 4, 4, kind)
      if (!g) return null
      items[1] = { grid: g, axes: axesOf(g).length }
    }
    if (items[0].axes === items[1].axes) return null
    items = U.shuffled(items)
    var p = [svgOpen(240, 120, null)]
    items.forEach(function (it, i) {
      var x = 10 + i * 124
      if (it.grid) {
        p.push('<text x="' + (x + 2) + '" y="12" font-size="12">' + CIRC[i] + '</text>')
        p.push(cells(it.grid, x + 50 - it.grid.w * C / 2, 16 + 50 - it.grid.h * C / 2, { grid: true }))
      } else p.push(shapeBox(SH[it.id].svg, x, CIRC[i]))
    })
    p.push('</svg>')
    var stem = '下面两个图形各有几条对称轴？'
    var answer = items.map(function (it, i) { return CIRC[i] + ' ' + axesText(it.axes) }).join('　')
    var sol = [{ tag: '想一想', text: '竖着、横着、斜着都试着对折，每个能折得两边完全重合的方向，就是一条对称轴。' }]
    items.forEach(function (it, i) {
      var why
      if (it.axes < 0) why = '圆沿着任何一条穿过圆心的直线对折都重合，有无数条'
      else if (it.axes === 0) why = '怎么折两边都对不上，不是轴对称图形，0 条'
      else if (it.id === 'seg') why = '线段竖着从中间折、横着沿线段本身折，都重合，2 条'
      else if (it.id === 'square') why = '正方形横、竖各 1 条，两条斜的也行，4 条'
      else if (it.id === 'rect') why = '长方形横、竖各 1 条；斜着折对不上，2 条'
      else if (it.id === 'equi') why = '三条边一样长，每个尖角对着的边中间都能折，3 条'
      else if (it.id === 'hexa') why = '对着的两个角连线 3 条，对着的两条边中点连线 3 条，一共 6 条'
      else if (it.id === 'star5') why = '每个尖角都能沿中线对折，5 个角 5 条'
      else if (it.id === 'star4') why = '4 个尖角，横、竖、两条斜的，4 条'
      else if (it.id === 'rhombus') why = '沿两条对角线对折都重合，2 条'
      else if (it.grid) why = '方格图试着折：' + (axesOf(it.grid).length ? axesOf(it.grid).map(axisName).join('、') + '能重合' : '怎么折都对不上') + '，' + it.axes + ' 条'
      else why = '只有中间竖着那一条能折重合，1 条'
      sol.push({ tag: '看' + CIRC[i], text: why + '。' })
    })
    sol.push({ tag: '小心陷阱', text: '别只找竖着的一条，横的、斜的也要试；长方形斜着折对不上。' })
    sol.push({ tag: '答', text: answer + '。' })
    return {
      topic: 'duichen',
      variant: 'axes',
      stem: stem,
      stemHTML: stem + '<div>' + p.join('') + '</div>',
      answer: answer,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '。',
      workLabel: '画一画',
      solution: sol,
      key: 'axes:' + items.map(function (it) { return it.grid ? 'g' + code(it.grid) : it.id }).join('|')
    }
  }

  /* ---------------- 变式③：哪组成轴对称 ---------------- */

  /* 一组：左右（竖虚线）或上下（横虚线），中间空一格 */
  function pairSVG(pairs, dir, style) {
    var g0 = pairs[0][0]
    var bw = dir === 'v' ? g0.w * 2 + 2 : g0.w
    var bh = dir === 'v' ? g0.h : g0.h * 2 + 2
    var GAP = 18, top = 16
    var W = 6 + pairs.length * (bw * C + GAP)
    var p = [svgOpen(W, bh * C + top + 8, null, style)]
    pairs.forEach(function (pr, i) {
      var x = 6 + i * (bw * C + GAP)
      p.push('<text x="' + x + '" y="12" font-size="12">' + CIRC[i] + '</text>')
      var board = make(bw, bh)
      p.push(cells(board, x, top, { grid: true }))
      if (dir === 'v') {
        p.push(cells(pr[0], x, top))
        p.push(cells(pr[1], x + (g0.w + 2) * C, top))
        p.push(dash(x + bw * C / 2, top - 4, x + bw * C / 2, top + bh * C + 4))
      } else {
        p.push(cells(pr[0], x, top))
        p.push(cells(pr[1], x, top + (g0.h + 2) * C))
        p.push(dash(x - 4, top + bh * C / 2, x + bw * C + 4, top + bh * C / 2))
      }
    })
    p.push('</svg>')
    return p.join('')
  }

  function genPair(s) {
    var d = s.difficulty || 'L1'
    var n = d === 'L3' ? 4 : 3
    var dir = d === 'L3' && U.rand() < 0.5 ? 'h' : 'v'
    var a = asymFig(3, U.randInt(3, 4))
    if (!a) return null
    var flip = dir === 'v' ? flipV : flipH
    var other = dir === 'v' ? flipH : flipV
    var good = [a, flip(a)]
    var traps = []
    traps.push({ k: 'copy', p: [a, a] })
    var off = asymFrom(flip(a))
    if (off && !same(off, flip(a))) traps.push({ k: 'off', p: [a, off] })
    var wrong = other(a)
    if (!same(wrong, flip(a)) && !same(wrong, a)) traps.push({ k: 'other', p: [a, wrong] })
    if (n === 4) {
      var off2 = asymFrom(a)
      if (off2 && !same(off2, a) && !same(off2, flip(a))) traps.push({ k: 'copy2', p: [a, off2] })
    }
    if (traps.length < n - 1) return null
    traps = (d === 'L1' ? traps.filter(function (t) { return t.k === 'copy' || t.k === 'off' }) : U.shuffled(traps)).slice(0, n - 1)
    if (traps.length < n - 1) traps = traps.concat([{ k: 'other', p: [a, other(a)] }]).slice(0, n - 1)
    var all = U.shuffled([{ k: 'good', p: good }].concat(traps))
    var rights = all.map(function (t) { return code(t.p[1]) })
    if (rights.some(function (c, i) { return rights.indexOf(c) !== i })) return null
    var idx = 0
    all.forEach(function (t, i) { if (t.k === 'good') idx = i })
    if (idx === 0 && U.rand() < 0.5) return null
    var stem = '虚线是对称轴，下面哪一组的两个图形成轴对称？'
    var sol = [{ tag: '想一想', text: '两个图形成轴对称：一模一样，还要' + (dir === 'v' ? '面对面' : '上下对着') + '，沿虚线折过去能完全重合。' }]
    var why = all.map(function (t, i) {
      var c = CIRC[i]
      if (t.k === 'good') return c + ' 沿虚线折过去，每一格都对上了'
      if (t.k === 'copy' || t.k === 'copy2') return c + ' 只是把图形挪过去，没有翻面，折过去对不上'
      if (t.k === 'off') return c + ' 翻面了，可是有一格不一样'
      return c + (dir === 'v' ? ' 是上下翻的，不是左右翻' : ' 是左右翻的，不是上下翻')
    })
    sol.push({ tag: '折一折', text: why.join('；') + '。' })
    sol.push({ tag: '小心陷阱', text: '两个图形长得一模一样还不够，要像照镜子一样翻过去才成轴对称。' })
    sol.push({ tag: '答', text: '第 ' + CIRC[idx] + ' 组成轴对称。' })
    return {
      topic: 'duichen',
      variant: 'pair',
      stem: stem,
      stemHTML: stem + '<div>' + pairSVG(all.map(function (t) { return t.p }), dir, 'width:100%;height:auto;max-height:44mm;max-width:' + (all.length * (dir === 'v' ? 44 : 22)) + 'mm') + '</div>',
      answer: CIRC[idx],
      unit: '',
      ansLabel: '答：第',
      ansSuffix: '组。',
      workLabel: '折一折',
      solution: sol,
      key: 'pair:' + dir + '|' + all.map(function (t) { return code(t.p[0]) + '~' + code(t.p[1]) }).join('|')
    }
  }

  /* ---------------- 变式④：补另一半 ---------------- */

  /* 半张图 + 对称轴；dir v 竖轴（左半给出），h 横轴（上半给出）；mid 对称轴穿过中间一列（行） */
  function fillSVG(gFull, dir, mid, showAll, style) {
    var g = gFull
    var top = 6, left = 6
    var W = g.w * C + 12, H = g.h * C + 12
    var p = [svgOpen(W, H, null, style)]
    p.push(cells(make(g.w, g.h), left, top, { grid: true }))
    var half = map(g, g.w, g.h, function (r, k) {
      if (showAll) return g.c[r][k]
      if (dir === 'v') return k < Math.ceil(g.w / 2) ? g.c[r][k] : 0
      return r < Math.ceil(g.h / 2) ? g.c[r][k] : 0
    })
    p.push(cells(half, left, top))
    if (showAll) {
      var rest = map(g, g.w, g.h, function (r, k) { return g.c[r][k] && !half.c[r][k] ? 1 : 0 })
      p.push(cells(rest, left, top))
    }
    if (dir === 'v') p.push(dash(left + g.w * C / 2, 1, left + g.w * C / 2, top + g.h * C + 5))
    else p.push(dash(1, top + g.h * C / 2, left + g.w * C + 5, top + g.h * C / 2))
    p.push('</svg>')
    return p.join('')
  }

  function genFill(s) {
    var d = s.difficulty || 'L1'
    var dir = d === 'L3' && U.rand() < 0.5 ? 'h' : 'v'
    var mid = d === 'L3' && dir === 'v'
    var w, h
    if (d === 'L1') { w = 6; h = U.randInt(4, 5) }
    else if (d === 'L2') { w = 8; h = U.randInt(5, 6) }
    else if (dir === 'v') { w = 7; h = 6 }
    else { w = 6; h = 6 }
    var g = symFig(w, h, dir)
    if (!g) return null
    /* 对称轴两边都要有格子；格子不能都挤在轴边上 */
    var halfCells = 0, farCells = 0
    for (var r = 0; r < g.h; r++) for (var k = 0; k < g.w; k++) if (g.c[r][k]) {
      var dist = dir === 'v' ? Math.abs(k - (g.w - 1) / 2) : Math.abs(r - (g.h - 1) / 2)
      if (dist > 0.6) halfCells++
      if (dist > 1.6) farCells++
    }
    if (farCells < 2) return null
    var total = count(g)
    var given = 0
    for (r = 0; r < g.h; r++) for (k = 0; k < g.w; k++) if (g.c[r][k] && (dir === 'v' ? k < Math.ceil(g.w / 2) : r < Math.ceil(g.h / 2))) given++
    if (total < 8 || total > (d === 'L1' ? 14 : 22)) return null
    if (mid) {
      var onAxis = 0
      for (r = 0; r < g.h; r++) if (g.c[r][(g.w - 1) / 2]) onAxis++
      if (onAxis === 0) return null
    }
    var stem = '虚线是对称轴，把这个轴对称图形的另一半画出来（涂上格子），再数一数一共涂了几格。'
    var sol = [{ tag: '想一想', text: '对称的两边，每个格子离对称轴一样远：这边离虚线几格，那边也离几格。' }]
    sol.push({ tag: '画一画', text: (dir === 'v' ? '一行一行看：左边' : '一列一列看：上边') + '的格子数一数离虚线几格，在' + (dir === 'v' ? '右边' : '下边') + '同样远的地方涂上。' })
    if (mid) sol.push({ tag: '小心陷阱', text: '虚线穿过中间一列，压在虚线上的格子不用再画一次。一共是 ' + given + ' + ' + (total - given) + ' = ' + total + ' 格。' })
    else sol.push({ tag: '算一算', text: '画出的另一半和原来一样多：' + given + ' + ' + given + ' = ' + total + ' 格。' })
    sol.push({ tag: '答', text: '一共涂了 ' + total + ' 格。' })
    return {
      topic: 'duichen',
      variant: 'fill',
      stem: stem,
      stemHTML: stem + '<div>' + fillSVG(g, dir, mid, false) + '</div>',
      diagramHTML: '<div class="sol-diagram">' + fillSVG(g, dir, mid, true, 'height:26mm;width:auto') + '</div>',
      answer: total,
      unit: '格',
      ansLabel: '答：一共涂了',
      ansSuffix: '格。',
      workLabel: '画一画',
      solution: sol,
      key: 'fill:' + dir + '|' + code(g)
    }
  }

  /* ---------------- 讲解页插图 ---------------- */

  /* 蝴蝶：竖轴方格图 */
  var BUTTERFLY = (function () {
    var rows = ['1100011', '1110111', '0111110', '0011100', '0111110', '1101011']
    var g = make(7, 6)
    rows.forEach(function (row, r) { row.split('').forEach(function (v, k) { g.c[r][k] = +v }) })
    return g
  })()
  function bigFig(g, axis) {
    var W = g.w * C + 12, H = g.h * C + 12
    var p = ['<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W * 1.6 + '" height="' + H * 1.6 + '">']
    p.push(cells(make(g.w, g.h), 6, 6, { grid: true }))
    p.push(cells(g, 6, 6))
    if (axis) p.push(dash(6 + g.w * C / 2, 1, 6 + g.w * C / 2, 6 + g.h * C + 5))
    p.push('</svg>')
    return p.join('')
  }
  var HOOK_SVG = bigFig(BUTTERFLY, true)
  var SHAPES_FIG = (function () {
    var p = ['<svg viewBox="0 0 340 120" width="300" height="106">']
    ;[['square', '4 条'], ['rect', '2 条'], ['equi', '3 条'], ['circle', '无数条']].forEach(function (it, i) {
      var x = i * 85
      p.push('<g transform="translate(' + x + ',0) scale(0.8)" fill="#fff" stroke="#000" stroke-width="2.6">' + SH[it[0]].svg + '</g>')
      p.push('<text x="' + (x + 40) + '" y="112" font-size="14" text-anchor="middle">' + it[1] + '</text>')
    })
    p.push('</svg>')
    return p.join('')
  })()
  var PAIR_FIG = (function () {
    var a = make(3, 3)
    ;['110', '011', '010'].forEach(function (row, r) { row.split('').forEach(function (v, k) { a.c[r][k] = +v }) })
    return pairSVG([[a, flipV(a)]], 'v', 'width:120px;height:auto')
  })()
  var ONE_TWO_FIG = (function () {
    var p = ['<svg viewBox="0 0 200 70" width="220" height="77">']
    var b = make(4, 3)
    ;['0110', '1111', '1001'].forEach(function (row, r) { row.split('').forEach(function (v, k) { b.c[r][k] = +v }) })
    p.push(cells(b, 6, 10))
    p.push(dash(6 + 2 * C, 4, 6 + 2 * C, 10 + 3 * C + 6))
    p.push('<text x="34" y="66" font-size="12" text-anchor="middle">一个图形</text>')
    var l = make(2, 3)
    ;['01', '11', '10'].forEach(function (row, r) { row.split('').forEach(function (v, k) { l.c[r][k] = +v }) })
    p.push(cells(l, 110, 10))
    p.push(cells(flipV(l), 110 + 4 * C, 10))
    p.push(dash(110 + 3 * C, 4, 110 + 3 * C, 10 + 3 * C + 6))
    p.push('<text x="152" y="66" font-size="12" text-anchor="middle">两个图形</text>')
    p.push('</svg>')
    return p.join('')
  })()

  var DUICHEN = {
    id: 'duichen',
    no: 'B05',
    stage: 'L1B',
    name: '轴对称图形',
    lesson: {
      v2: true,
      title: '轴对称图形 · 方法讲解',
      goal: '会用「对折」判断轴对称图形、找对称轴，分清一个图形和两个图形的对称，还能补画另一半。',
      sections: [
        {
          kind: 'hook',
          heading: '先想一想',
          paras: [
            '这只方格蝴蝶，沿着中间的虚线对折，左右两边会怎么样？',
            '每一格都正好叠在一起！这样的图形就叫轴对称图形。'
          ],
          figHTML: HOOK_SVG
        },
        {
          kind: 'know',
          heading: '先认识',
          cards: [
            { title: '轴对称图形', text: '沿一条直线对折，两边完全重合。那条直线叫对称轴，画成虚线。', figHTML: SHAPES_FIG },
            { title: '两个图形成轴对称', text: '两个图形一模一样、面对面，沿中间的直线折过去能重合。', figHTML: PAIR_FIG },
            { title: '一个和两个', text: '一个图形自己对称，叫轴对称图形；两个图形互相对称，叫成轴对称。轴对称图形沿轴分开，就是两个成轴对称的图形。数字和字母要看字体：0、8 是，3 上小下大不是。', figHTML: ONE_TWO_FIG }
          ]
        },
        {
          kind: 'move',
          name: '对折看重合',
          tip: '竖着、横着、斜着都折一折。',
          steps: [
            '想象沿一条直线把图形对折。',
            '两边每一格、每条边都对上了，就是轴对称图形，这条线就是对称轴。',
            '数对称轴：每个能折重合的方向算一条，横、竖、斜都要试。'
          ],
          pitfall: '风车那样转一转一样的不算；长方形斜着折对不上，只有 2 条。',
          figHTML: SHAPES_FIG,
          variants: ['judge', 'axes']
        },
        {
          kind: 'move',
          name: '翻过去看重合',
          tip: '一模一样还不够，要面对面。',
          steps: [
            '看两个图形是不是一模一样。',
            '再看是不是翻了面、面对面站着。',
            '沿虚线折过去，每一格都对上，才成轴对称。'
          ],
          pitfall: '只挪过去、没翻面的两个图形，不成轴对称。',
          figHTML: PAIR_FIG,
          variants: ['pair']
        },
        {
          kind: 'move',
          name: '数格子补另一半',
          tip: '这边离虚线几格，那边也几格。',
          steps: [
            '一行一行看，每个格子数一数离虚线几格。',
            '在虚线另一边同样远的地方涂上。',
            '画完对折检查：两边要完全一样。'
          ],
          pitfall: '虚线穿过一列格子时，压在虚线上的格子不用再画。',
          figHTML: bigFig(BUTTERFLY, true),
          variants: ['fill']
        },
        {
          kind: 'pick',
          heading: '用哪一招？',
          rows: [
            ['一个图形，问是不是、有几条对称轴', '对折看重合', ['judge', 'axes']],
            ['两个图形，问是不是成轴对称', '翻过去看重合', ['pair']],
            ['只画了一半，要补完整', '数格子补另一半', ['fill']]
          ]
        },
        { kind: 'chant', chant: '对折两边能重合，中间直线叫对称轴；一个图形找身上，两个图形找中间；补画一半数格子，离轴一样远。' }
      ]
    },
    variants: [
      {
        id: 'judge',
        setting: 'vDcJudge',
        label: '哪个是轴对称图形',
        idea: '沿一条直线对折，两边完全重合才是；竖、横、斜都试；转着看一样的风车不算，差一格也不算。',
        gen: genJudge
      },
      {
        id: 'axes',
        setting: 'vDcAxes',
        label: '有几条对称轴',
        idea: '每个能折重合的方向算一条：正方形 4、长方形 2、等边三角形 3、圆无数条；平行四边形 0 条。',
        gen: genAxes
      },
      {
        id: 'pair',
        setting: 'vDcPair',
        label: '哪组成轴对称',
        idea: '两个图形一模一样、面对面，沿虚线折过去每格都对上才成轴对称；只挪过去没翻面的不算。',
        gen: genPair
      },
      {
        id: 'fill',
        setting: 'vDcFill',
        label: '补画另一半',
        idea: '每个格子离对称轴几格，另一边也几格；对称轴穿过一列时，轴上的格子不重复画。',
        def: false,
        gen: genFill
      }
    ],
    generate: function (s) {
      return U.generateFrom(DUICHEN.variants, s)
    },
    titleFor: function (s) {
      return '轴对称练习 · ' + U.DIFF_LABEL[s.difficulty || 'L1']
    }
  }

  root.SumSum.aoshu.topics.duichen = DUICHEN
  root.SumSum.aoshu.topicList.push(DUICHEN)
})(typeof window !== 'undefined' ? window : globalThis)
