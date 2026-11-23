/**
 * 知识点「B12 线角初步：认识角」（L1 补充，对照学而思 1 级第 2 讲好方法 3、4，拆题笔记 docs/xes-1ji/02-线角初步.md）。
 * 变式：①认角（一个顶点、两条直直的边）②锐角、直角、钝角 ③打枪法数角 ④数角并分类（def: false）。
 * 数线段（好方法 2）留给第 11 讲补充版，见拆题笔记第 6 节。
 * 图全是黑白内联 SVG，线 2.4 宽；直角的「小板凳」用 <polyline class="mk">。
 * 自检（check-aoshu-gen.js 的 checkRenjiao）不看 key，直接量题干 SVG：每个编号一个 <g class="it">，直的边用 <line class="ln">，弯的边用 <path>。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util
  var CIRC = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧']
  var SW = 2.4

  function f2(x) { return Math.round(x * 100) / 100 }
  function rad(a) { return (a * Math.PI) / 180 }
  function dir(a) { return [Math.cos(rad(a)), -Math.sin(rad(a))] } // 数学角度：0 向右、90 向上
  function add(p, v, k) { return [p[0] + v[0] * k, p[1] + v[1] * k] }

  function svgOpen(w, h, cls, scale) {
    var k = scale || 1.5
    return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 ' + f2(w) + ' ' + f2(h) + '" width="' + f2(w * k) + '" height="' + f2(h * k) + '">'
  }
  function txt(x, y, s, size, extra) {
    return '<text x="' + f2(x) + '" y="' + f2(y) + '" font-size="' + (size || 12) + '" text-anchor="middle"' + (extra || '') + '>' + s + '</text>'
  }
  function ln(p, q) {
    return '<line class="ln" x1="' + f2(p[0]) + '" y1="' + f2(p[1]) + '" x2="' + f2(q[0]) + '" y2="' + f2(q[1]) + '" stroke="#000" stroke-width="' + SW + '" stroke-linecap="round"/>'
  }
  function mark(V, a, b, k) {
    /* 小板凳：顶点 V，两条边的方向 a、b（度） */
    k = k || 7
    var u = dir(a)
    var v = dir(b)
    var pts = [add(V, u, k), add(add(V, u, k), v, k), add(V, v, k)]
    return '<polyline class="mk" points="' + pts.map(function (q) { return f2(q[0]) + ',' + f2(q[1]) }).join(' ') + '" fill="none" stroke="#000" stroke-width="1.3"/>'
  }
  function nums(arr) { return arr.map(function (i) { return CIRC[i] }).join('') || '没有' }

  /* 一格里的图：先在原点附近画好（点集 pts 用来量大小），再平移到格子中间 */
  var CW = 80
  var CH = 60
  function place(pts) {
    var xs = pts.map(function (p) { return p[0] })
    var ys = pts.map(function (p) { return p[1] })
    var minX = Math.min.apply(null, xs)
    var maxX = Math.max.apply(null, xs)
    var minY = Math.min.apply(null, ys)
    var maxY = Math.max.apply(null, ys)
    if (maxX - minX > CW - 10 || maxY - minY > CH - 8) return null
    return [CW / 2 - (minX + maxX) / 2, CH / 2 - (minY + maxY) / 2]
  }
  function mv(p, d) { return [p[0] + d[0], p[1] + d[1]] }

  function rowSVG(items, cls, scale) {
    var W = items.length * CW
    var H = CH + 18
    var p = [svgOpen(W, H, cls === undefined ? 'fig-big' : cls, scale || Math.min(1.5, 640 / W))]
    items.forEach(function (it, i) {
      var ox = i * CW
      p.push('<g class="it" transform="translate(' + ox + ' 0)">' + it.html + '</g>')
      p.push(txt(ox + CW / 2, CH + 14, CIRC[i], 13))
    })
    p.push('</svg>')
    return p.join('')
  }

  /* 一个角：顶点 V=原点，两条边方向 a、a+deg，边长 l1、l2 */
  function angleItem(a, deg, l1, l2, withMark) {
    var V = [0, 0]
    var P = add(V, dir(a), l1)
    var Q = add(V, dir(a + deg), l2)
    var d = place([V, P, Q])
    if (!d) return null
    V = mv(V, d)
    P = mv(P, d)
    Q = mv(Q, d)
    return { html: ln(V, P) + ln(V, Q) + (withMark ? mark(V, a, a + deg) : ''), key: a + '.' + deg + '.' + l1 + '.' + l2 + (withMark ? 'm' : '') }
  }

  /* ---------------- 变式①：认角 ---------------- */

  function notAngle(type, d) {
    var a = U.pick([0, 15, 30, 45, 60, 90, 120, 150, 180, 210, 270, 300])
    var deg = U.pick([40, 60, 90, 110, 130])
    var L = U.randInt(36, 46)
    var V = [0, 0]
    if (type === 'gap') {
      /* 两条边没碰到：一条边从顶点往外挪开 9～12 */
      var g = U.randInt(9, 12)
      var V2 = add(V, dir(a + deg / 2), g)
      var P = add(V, dir(a), L)
      var Q = add(V2, dir(a + deg), L - 4)
      var dd = place([V, P, V2, Q])
      if (!dd) return null
      return { html: ln(mv(V, dd), mv(P, dd)) + ln(mv(V2, dd), mv(Q, dd)), key: 'g' + a + '.' + deg + '.' + g }
    }
    if (type === 'curve') {
      /* 一条边直、一条边弯 */
      var P2 = add(V, dir(a), L)
      var u = dir(a + deg)
      var nrm = dir(a + deg + 90)
      var pts = []
      for (var k = 0; k <= 16; k++) {
        var t = k / 16
        pts.push(add(add(V, u, L * t), nrm, 6 * Math.sin(t * 2 * Math.PI)))
      }
      var d2 = place([V, P2].concat(pts))
      if (!d2) return null
      return {
        html: ln(mv(V, d2), mv(P2, d2)) + '<path d="M' + pts.map(function (q) { q = mv(q, d2); return f2(q[0]) + ' ' + f2(q[1]) }).join(' L') + '" fill="none" stroke="#000" stroke-width="' + SW + '" stroke-linecap="round"/>',
        key: 'c' + a + '.' + deg
      }
    }
    /* par：两条平行线，碰不到 */
    var uu = dir(a)
    var n2 = dir(a + 90)
    var gap = U.randInt(14, 18)
    var A1 = add(V, uu, -L / 2)
    var A2 = add(V, uu, L / 2)
    var B1 = add(A1, n2, gap)
    var B2 = add(A2, n2, gap)
    var d3 = place([A1, A2, B1, B2])
    if (!d3) return null
    return { html: ln(mv(A1, d3), mv(A2, d3)) + ln(mv(B1, d3), mv(B2, d3)), key: 'p' + a + '.' + gap }
  }

  function genIs(s) {
    var d = s.difficulty || 'L1'
    var n = d === 'L1' ? 5 : d === 'L2' ? 6 : 7
    var nYes = U.randInt(2, n - 2)
    var others = d === 'L1' ? ['gap', 'par'] : ['gap', 'curve', 'par']
    var spec = []
    for (var i = 0; i < n; i++) spec.push(i < nYes ? 'ang' : others[(i - nYes) % others.length])
    if (d !== 'L1' && spec.indexOf('curve') < 0) return null
    spec = U.shuffled(spec)
    var items = []
    var yes = []
    for (var j = 0; j < spec.length; j++) {
      var it
      if (spec[j] === 'ang') {
        var a = d === 'L1' ? U.pick([0, 0, 90]) : U.pick([0, 30, 60, 90, 135, 180, 225, 270, 315])
        var deg = U.pick([40, 60, 90, 120, 140])
        it = angleItem(a, deg, U.randInt(38, 46), U.randInt(38, 46), false)
        yes.push(j)
      } else it = notAngle(spec[j], d)
      if (!it) return null
      it.type = spec[j]
      items.push(it)
    }
    var ans = nums(yes)
    var why = { gap: '两条边没碰到，没有顶点', curve: '有一条边是弯的', par: '两条线平行，碰不到' }
    var look = items.map(function (it, i) { return it.type === 'ang' ? null : CIRC[i] + ' ' + why[it.type] }).filter(Boolean).join('；')
    var stem = '下面的图中，哪些是角？把序号写在横线上。'
    return {
      topic: 'renjiao',
      variant: 'isjiao',
      stem: stem,
      stemHTML: stem + '<div>' + rowSVG(items) + '</div>',
      answer: ans,
      unit: '',
      ansLabel: '答：是角的有',
      ansSuffix: '。',
      workLabel: '看一看',
      solution: [
        { tag: '想一想', text: '角有一个顶点，从顶点引出两条直直的边。没有顶点、边是弯的，都不是角。' },
        { tag: '看一看', text: ans + ' 都是一个顶点、两条直边，是角；' + look + '，都不是角。' },
        { tag: '小心陷阱', text: d === 'L1' ? '两条边要交在一个点上才是角，差一点没碰到也不行。' : '角可以朝各个方向张开，斜着、倒着放也是角；可边一弯就不是角了。' },
        { tag: '答', text: '是角的有 ' + ans + '。' }
      ],
      key: 'is:' + d + ':' + items.map(function (it) { return it.key }).join(',')
    }
  }

  /* ---------------- 变式②：锐角、直角、钝角 ---------------- */

  function genKind(s) {
    var d = s.difficulty || 'L1'
    var n = d === 'L1' ? 5 : d === 'L2' ? 6 : 7
    var kinds = ['rui', 'zhi', 'dun']
    while (kinds.length < n) kinds.push(U.pick(['rui', 'zhi', 'dun']))
    var c = { rui: 0, zhi: 0, dun: 0 }
    kinds.forEach(function (k) { c[k]++ })
    if (c.rui > 3 || c.zhi > 3 || c.dun > 3) return null
    kinds = U.shuffled(kinds)
    var items = []
    var by = { rui: [], zhi: [], dun: [] }
    for (var i = 0; i < n; i++) {
      var k = kinds[i]
      var deg = k === 'zhi' ? 90 : k === 'rui' ? U.pick([30, 40, 45, 50, 60]) : U.pick([120, 130, 135, 140, 150])
      var a
      if (d === 'L1') a = U.pick([0, 0, 180 - deg])
      else if (d === 'L2') a = k === 'zhi' ? U.pick([0, 90, 180, 270]) : U.pick([0, 90, 180, 270, 30, 45])
      else a = U.pick([15, 30, 45, 60, 75, 105, 120, 135, 150, 200, 225, 250, 290, 315])
      var l1 = d === 'L3' ? U.pick([26, 30]) : U.randInt(38, 46)
      var l2 = d === 'L3' ? U.pick([44, 48]) : U.randInt(38, 46)
      if (d === 'L3' && U.rand() < 0.5) { var t = l1; l1 = l2; l2 = t }
      var it = angleItem(a, deg, l1, l2, d === 'L1' && k === 'zhi')
      if (!it) return null
      it.kind = k
      items.push(it)
      by[k].push(i)
    }
    var ans = '锐角 ' + nums(by.rui) + '；直角 ' + nums(by.zhi) + '；钝角 ' + nums(by.dun)
    var stem = '下面的角中，哪些是锐角、直角、钝角？把序号填在横线上。'
    var compare = d === 'L1'
      ? '有小板凳的是直角。张口比直角小的是锐角，比直角大的是钝角。'
      : '拿本子的角（直角）去比：和它一样的是直角，比它小的是锐角，比它大的是钝角。'
    return {
      topic: 'renjiao',
      variant: 'kind',
      stem: stem,
      stemHTML: stem + '<div>' + rowSVG(items) + '</div>',
      answer: ans,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '',
      ansFields: ['锐角', '直角', '钝角'],
      solution: [
        { tag: '想一想', text: compare },
        { tag: '比一比', text: '比直角小 ' + nums(by.rui) + ' → 锐角；正好是直角 ' + nums(by.zhi) + '；比直角大 ' + nums(by.dun) + ' → 钝角。' },
        { tag: '小心陷阱', text: d === 'L3' ? '角的大小看张口，不看边画得长短；斜着放的直角也还是直角。' : d === 'L2' ? '这次直角没画小板凳，要用本子角比一比。' : '只看张口大小，不看朝哪边开口。' },
        { tag: '答', text: ans + '。' }
      ],
      key: 'kind:' + d + ':' + items.map(function (it) { return it.key }).join(',')
    }
  }

  /* ---------------- 变式③④：一个点引出几条射线 ---------------- */

  var FW = 170
  var FH = 120
  var PAD = 14

  /* 射线方向（度，从小到大），相邻至少差 gapMin；总张开 < 175 */
  function fan(k, gapMin, need) {
    for (var t = 0; t < 80; t++) {
      var base = U.pick([0, 5, 10, 15, 20])
      var angs = [base]
      for (var i = 1; i < k; i++) angs.push(angs[i - 1] + U.randInt(gapMin, gapMin + (k >= 5 ? 12 : 25)))
      if (angs[k - 1] - angs[0] >= 175) continue
      if (need && !need(angs)) continue
      return angs
    }
    return null
  }

  function fanLines(angs) {
    /* 顶点在左下，射线长 110～130；整体放进 FW×FH 的框（放不下就缩短） */
    var V = [0, 0]
    var ends = angs.map(function (a) { return { a: a, L: U.randInt(110, 130) } })
    for (var tries = 0; tries < 10; tries++) {
      var pts = [V].concat(ends.map(function (e) { return add(V, dir(e.a), e.L) }))
      var xs = pts.map(function (p) { return p[0] })
      var ys = pts.map(function (p) { return p[1] })
      var w = Math.max.apply(null, xs) - Math.min.apply(null, xs)
      var h = Math.max.apply(null, ys) - Math.min.apply(null, ys)
      if (w <= FW - 8 && h <= FH - 8) {
        var dx = FW / 2 - (Math.max.apply(null, xs) + Math.min.apply(null, xs)) / 2
        var dy = FH / 2 - (Math.max.apply(null, ys) + Math.min.apply(null, ys)) / 2
        return { V: [V[0] + dx, V[1] + dy], ends: pts.slice(1).map(function (p) { return [p[0] + dx, p[1] + dy] }), angs: angs }
      }
      ends.forEach(function (e) { e.L *= 0.9 })
    }
    return null
  }

  function fanSVG(F, labels, marks, cls, scale) {
    var W = FW + PAD * 2
    var H = FH + PAD * 2
    var p = [svgOpen(W, H, cls === undefined ? 'fig-big' : cls, scale)]
    p.push('<g transform="translate(' + PAD + ' ' + PAD + ')">')
    F.ends.forEach(function (e) { p.push(ln(F.V, e)) })
    ;(marks || []).forEach(function (m) { p.push(mark(F.V, F.angs[m], F.angs[m + 1], 9)) })
    if (labels) F.ends.forEach(function (e, i) {
      var at = add(F.V, dir(F.angs[i]), Math.hypot(e[0] - F.V[0], e[1] - F.V[1]) + 9)
      p.push(txt(at[0], at[1] + 5, String(i + 1), 13, ' font-weight="700"'))
    })
    p.push('</g></svg>')
    return p.join('')
  }

  function pairsText(k) {
    var rows = []
    for (var i = 1; i < k; i++) {
      var r = []
      for (var j = i + 1; j <= k; j++) r.push(i + ' 和 ' + j)
      rows.push(r.join('、'))
    }
    return rows.join('；')
  }
  function sumText(k) {
    var parts = []
    for (var m = k - 1; m >= 1; m--) parts.push(m)
    return parts.join(' + ') + ' = ' + (k * (k - 1)) / 2
  }

  function genCount(s) {
    var d = s.difficulty || 'L1'
    var k = d === 'L1' ? U.randInt(3, 4) : d === 'L2' ? U.randInt(4, 5) : U.randInt(5, 6)
    var angs = fan(k, k >= 5 ? 22 : 26)
    if (!angs) return null
    var F = fanLines(angs)
    if (!F) return null
    var total = (k * (k - 1)) / 2
    var stem = '数一数，下面的图中一共有几个角？'
    return {
      topic: 'renjiao',
      variant: 'count',
      stem: stem,
      stemHTML: stem + '<div>' + fanSVG(F, null, null, 'fig-big fig-mid') + '</div>',
      diagramHTML: '<div class="sol-diagram">' + fanSVG(F, [1], null, null, 1.2).replace('<svg', '<svg style="max-height:26mm;width:auto"') + '<div class="dot-note">先给每条边标上号。</div></div>',
      answer: total,
      unit: '个',
      ansLabel: '答：一共有',
      ansSuffix: '个角。',
      workLabel: '标号、配对',
      solution: [
        { tag: '想一想', text: '一个顶点引出 ' + k + ' 条边，任意两条边就组成一个角。' },
        { tag: '打枪法', text: '标好号（见图），' + pairsText(k) + '。' },
        { tag: '算一算', text: sumText(k) + '（个）。' },
        { tag: '小心陷阱', text: '不是只数挨着的小角：隔开的两条边（比如 1 和 3）也组成一个大角。' },
        { tag: '答', text: '一共有 ' + total + ' 个角。' }
      ],
      key: 'count:' + d + ':' + F.angs.join('.')
    }
  }

  function genSort(s) {
    var d = s.difficulty || 'L1'
    var k = d === 'L1' ? 3 : d === 'L2' ? 4 : U.randInt(4, 5)
    /* 相邻的可以正好 90（画小板凳）；其余每一对离 90 至少 15° */
    var angs = fan(k, 25, function (A) {
      for (var i = 0; i < A.length; i++) {
        for (var j = i + 1; j < A.length; j++) {
          var g = A[j] - A[i]
          if (g === 90 && j === i + 1) continue
          if (Math.abs(g - 90) < 15) return false
        }
      }
      return true
    })
    if (!angs) return null
    /* 想要一个直角：随机把一对相邻的拉成 90 再检查 */
    if (U.rand() < 0.6) {
      var at = U.randInt(0, k - 2)
      var shift = 90 - (angs[at + 1] - angs[at])
      var B = angs.map(function (a, i) { return i > at ? a + shift : a })
      var ok = B[k - 1] - B[0] < 175 && B.every(function (a, i) { return i === 0 || a - B[i - 1] >= 25 })
      for (var i2 = 0; ok && i2 < k; i2++) {
        for (var j2 = i2 + 1; j2 < k; j2++) {
          var g2 = B[j2] - B[i2]
          if (!(g2 === 90 && j2 === i2 + 1) && Math.abs(g2 - 90) < 15) ok = false
        }
      }
      if (ok) angs = B
    }
    var F = fanLines(angs)
    if (!F) return null
    var c = { rui: 0, zhi: 0, dun: 0 }
    var marks = []
    var list = []
    for (var i = 0; i < k; i++) {
      for (var j = i + 1; j < k; j++) {
        var g = angs[j] - angs[i]
        var kk = g === 90 ? 'zhi' : g < 90 ? 'rui' : 'dun'
        c[kk]++
        if (kk === 'zhi') marks.push(i)
        list.push((i + 1) + ' 和 ' + (j + 1) + ' ' + { rui: '锐角', zhi: '直角', dun: '钝角' }[kk])
      }
    }
    if (c.rui === 0 || c.dun === 0) return null
    var total = (k * (k - 1)) / 2
    var ans = '锐角 ' + c.rui + ' 个；直角 ' + c.zhi + ' 个；钝角 ' + c.dun + ' 个'
    var stem = '下面的图中，锐角、直角、钝角各有几个？'
    return {
      topic: 'renjiao',
      variant: 'sortcount',
      stem: stem,
      stemHTML: stem + '<div>' + fanSVG(F, null, marks, 'fig-big fig-mid') + '</div>',
      diagramHTML: '<div class="sol-diagram">' + fanSVG(F, [1], marks, null, 1.2).replace('<svg', '<svg style="max-height:26mm;width:auto"') + '<div class="dot-note">先给每条边标上号。</div></div>',
      answer: ans,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '',
      ansFields: ['锐角', '直角', '钝角'],
      solution: [
        { tag: '想一想', text: '先用打枪法把角一个个找出来，再一个个和直角比。' },
        { tag: '打枪法', text: '标好号（见图），' + list.join('；') + '。一共 ' + sumText(k) + ' 个角。' },
        { tag: '数一数', text: '锐角 ' + c.rui + ' 个，直角 ' + c.zhi + ' 个，钝角 ' + c.dun + ' 个，合起来 ' + total + ' 个，对上了。' },
        { tag: '小心陷阱', text: '两个小角拼成的大角也要算，它常常是钝角。' },
        { tag: '答', text: ans + '。' }
      ],
      key: 'sort:' + d + ':' + angs.join('.')
    }
  }

  /* ---------------- 讲解页插图 ---------------- */

  function small(w, h, body, k) {
    k = k || 1.3
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w * k + '" height="' + h * k + '">' + body + '</svg>'
  }
  /* 先想一想：剪刀张开，钟面两根针 */
  var HOOK_SVG = small(200, 90,
    '<circle cx="22" cy="30" r="10" fill="none" stroke="#000" stroke-width="2.4"/><circle cx="22" cy="62" r="10" fill="none" stroke="#000" stroke-width="2.4"/>' +
    '<path d="M30 36 L92 12 M30 56 L92 80" stroke="#000" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M44 34 Q56 46 44 58" fill="none" stroke="#000" stroke-width="1.2"/>' +
    txt(60, 88, '剪刀张开', 9) +
    '<circle cx="155" cy="45" r="34" fill="#fff" stroke="#000" stroke-width="2"/>' +
    '<path d="M155 45 L155 17 M155 45 L178 45" stroke="#000" stroke-width="2.8" stroke-linecap="round"/>' +
    '<circle cx="155" cy="45" r="2.5" fill="#000"/>' + txt(155, 92, '钟面 3 时', 9))
  var ANGLE_FIG = small(120, 60,
    ln([20, 50], [100, 50]) + ln([20, 50], [80, 8]) + '<circle cx="20" cy="50" r="2.6" fill="#000"/>' +
    txt(14, 60, '顶点', 8) + txt(100, 44, '边', 8) + txt(86, 18, '边', 8))
  var ZHI_FIG = small(120, 60, ln([30, 52], [100, 52]) + ln([30, 52], [30, 6]) + mark([30, 52], 0, 90, 9) + txt(80, 30, '小板凳', 9))
  var RUIDUN_FIG = small(120, 60,
    ln([10, 50], [52, 50]) + ln([10, 50], [42, 18]) + txt(34, 59, '锐角', 8) +
    ln([74, 50], [112, 50]) + ln([74, 50], [58, 16]) + txt(92, 59, '钝角', 8))
  var SIZE_FIG = small(120, 60,
    ln([8, 50], [34, 50]) + ln([8, 50], [26, 32]) +
    ln([50, 50], [112, 50]) + ln([50, 50], [94, 6]) + txt(60, 59, '一样大', 8))
  var MOVE1_FIG = small(150, 60,
    ln([10, 50], [50, 50]) + ln([10, 50], [36, 14]) + txt(30, 59, '是角', 8) +
    ln([62, 50], [98, 50]) + ln([70, 42], [92, 12]) + txt(80, 59, '没碰到', 8) +
    ln([110, 50], [146, 50]) + '<path d="M110 50 Q118 34 124 30 T138 12" fill="none" stroke="#000" stroke-width="2.4"/>' + txt(128, 59, '边弯了', 8))
  var MOVE2_FIG = small(150, 60,
    ln([10, 50], [50, 50]) + ln([10, 50], [36, 18]) + txt(30, 59, '锐角', 8) +
    ln([62, 50], [100, 50]) + ln([62, 50], [62, 10]) + mark([62, 50], 0, 90, 7) + txt(82, 59, '直角', 8) +
    ln([128, 50], [148, 50]) + ln([128, 50], [108, 18]) + txt(130, 59, '钝角', 8))
  var MOVE3_FIG = small(150, 70,
    ln([20, 62], [120, 62]) + ln([20, 62], [100, 22]) + ln([20, 62], [60, 4]) +
    txt(128, 66, '1', 10, ' font-weight="700"') + txt(108, 22, '2', 10, ' font-weight="700"') + txt(66, 6, '3', 10, ' font-weight="700"') +
    txt(120, 44, '3 个角', 9))

  var RENJIAO = {
    id: 'renjiao',
    no: 'B12',
    stage: 'L1B',
    name: '线角初步：认识角',
    lesson: {
      v2: true,
      title: '认识角 · 方法讲解',
      goal: '认识角，会分锐角、直角、钝角，还会用打枪法数一个点引出的角有几个。',
      sections: [
        {
          kind: 'hook',
          heading: '先想一想',
          paras: [
            '剪刀张开，两片刀刃从一个点出发，张出一个口子。',
            '钟面上 3 时，两根针也从中心出发，张出一个方方正正的口子。这样的口子就是「角」。'
          ],
          figHTML: HOOK_SVG
        },
        {
          kind: 'know',
          heading: '先认识',
          cards: [
            { title: '角', text: '一个顶点，从顶点引出两条直直的边。', figHTML: ANGLE_FIG },
            { title: '直角', text: '方方正正的角，像本子的角，用「小板凳」标出来。', figHTML: ZHI_FIG },
            { title: '锐角和钝角', text: '比直角小的是锐角，比直角大的是钝角。', figHTML: RUIDUN_FIG },
            { title: '角的大小', text: '看张口大小，不看边画得长短。', figHTML: SIZE_FIG }
          ]
        },
        {
          kind: 'move',
          name: '看顶点和边',
          tip: '一个顶点、两条直边，才是角。',
          steps: [
            '找顶点：两条边要交在一个点上，没碰到的不是角。',
            '看边：两条边都要直直的，有一条弯了就不是角。',
            '朝哪边开口都行，斜着、倒着放也是角。'
          ],
          pitfall: '差一点没碰到也不是角；边一弯就不算。',
          figHTML: MOVE1_FIG,
          variants: ['isjiao']
        },
        {
          kind: 'move',
          name: '和直角比',
          tip: '拿本子的角（直角）去比一比。',
          steps: [
            '有小板凳的，或和本子角正好对齐的，是直角。',
            '张口比直角小的，是锐角。',
            '张口比直角大的，是钝角。'
          ],
          pitfall: '只看张口，不看边长短，也不看朝哪边开口。',
          figHTML: MOVE2_FIG,
          variants: ['kind']
        },
        {
          kind: 'move',
          name: '打枪法数角',
          tip: '给边编号，两条边配一个角，按顺序配不重不漏。',
          steps: [
            '从一边开始，给每条边标上 1、2、3……',
            '打枪法：1 和后面每一条配一次，再 2 和后面每一条配一次……',
            '把组数加起来：3 条边 2 + 1 = 3 个角，4 条边 3 + 2 + 1 = 6 个角；要分类就一个个和直角比。'
          ],
          pitfall: '隔开的两条边（1 和 3）也组成一个大角，别漏掉。',
          figHTML: MOVE3_FIG,
          variants: ['count', 'sortcount']
        },
        {
          kind: 'pick',
          heading: '用哪一招？',
          rows: [
            ['问哪些是角', '看顶点和边', ['isjiao']],
            ['问锐角、直角、钝角', '和直角比', ['kind']],
            ['问一共有几个角、各有几个', '打枪法数角', ['count', 'sortcount']]
          ]
        },
        { kind: 'chant', chant: '一个顶点两条边，直直的边才是角；小板凳是直角，比它小的是锐角，比它大的是钝角；数角先给边编号，打枪配对不重不漏。' }
      ]
    },
    variants: [
      {
        id: 'isjiao',
        setting: 'vRjIs',
        label: '认角（哪些是角）',
        idea: '一个顶点、两条直直的边才是角；两条边没碰到、有一条边是弯的、两条平行线都不是角。',
        gen: genIs
      },
      {
        id: 'kind',
        setting: 'vRjKind',
        label: '锐角、直角、钝角',
        idea: '和直角（小板凳、本子角）比：一样大是直角，比它小是锐角，比它大是钝角；只看张口，不看边长。',
        gen: genKind
      },
      {
        id: 'count',
        setting: 'vRjCount',
        label: '数角（打枪法）',
        idea: '一个顶点引出几条边：给边编号，1 和后面每条配一次、2 和后面每条配一次……加起来就是角的个数。',
        gen: genCount
      },
      {
        id: 'sortcount',
        setting: 'vRjSort',
        label: '数角并分类',
        def: false,
        idea: '先用打枪法把每个角找出来，再一个个和直角比，分别数锐角、直角、钝角；两个小角拼成的大角常是钝角。',
        gen: genSort
      }
    ],
    generate: function (s) {
      return U.generateFrom(RENJIAO.variants, s)
    },
    titleFor: function (s) {
      return '认识角练习 · ' + U.DIFF_LABEL[s.difficulty || 'L1']
    }
  }

  root.SumSum.aoshu.topics.renjiao = RENJIAO
  root.SumSum.aoshu.topicList.push(RENJIAO)
})(typeof window !== 'undefined' ? window : globalThis)
