/**
 * 知识点「B11 线角初步：认识线」（L1 补充，对照学而思 1 级第 2 讲好方法 1、5、6，拆题笔记 docs/xes-1ji/02-线角初步.md）。
 * 变式：①认线（看端点：直线、射线、线段）②平行和垂直 ③能不能相交（延长看看，def: false）④数平行线（编号 + 打枪法）。
 * 图全是黑白内联 SVG：线 2.4 宽，端点是实心圆点，垂直一律画「小板凳」。
 * 自检（check-aoshu-gen.js 的 checkRenxian）不看 key，直接量题干 SVG 重算答案，所以画图要守规矩：
 *   每个编号一个 <g class="it">；直的线用 <line class="ln">，折线用 <polyline>，曲线用 <path>；端点用 <circle class="dot">；小板凳用 <polyline class="mk">。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util
  var CIRC = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧']
  var LET = ['A', 'B', 'C', 'D']
  var SW = 2.4
  var DOT = 3.4

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
  function ln(p, q, extra) {
    return '<line class="ln" x1="' + f2(p[0]) + '" y1="' + f2(p[1]) + '" x2="' + f2(q[0]) + '" y2="' + f2(q[1]) + '" stroke="#000" stroke-width="' + SW + '" stroke-linecap="round"' + (extra || '') + '/>'
  }
  function dash(p, q) {
    return '<line x1="' + f2(p[0]) + '" y1="' + f2(p[1]) + '" x2="' + f2(q[0]) + '" y2="' + f2(q[1]) + '" stroke="#000" stroke-width="1.3" stroke-dasharray="3 2.5"/>'
  }
  function dot(p) {
    return '<circle class="dot" cx="' + f2(p[0]) + '" cy="' + f2(p[1]) + '" r="' + DOT + '" fill="#000"/>'
  }
  function inBox(p, x0, y0, x1, y1) { return p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1 }
  function joinLetters(arr) {
    if (arr.length === 1) return arr[0]
    return arr.slice(0, -1).join('、') + ' 和 ' + arr[arr.length - 1]
  }
  function nums(arr) { return arr.map(function (i) { return CIRC[i] }).join('') || '没有' }

  /* ---------------- 变式①：认线 ---------------- */

  var KW = 80
  var KH = 58 // 画线的区域高，下面再留 16 写编号
  var KIND_NAME = { line: '直线', ray: '射线', seg: '线段', zig: '折线', curve: '曲线' }

  /* 一个编号格子里的一条线。trick：'short' 画短的直线，'long' 画长的线段，'dots' 折线曲线两头带点 */
  function kindItem(type, trick) {
    var c = [KW / 2, KH / 2]
    var it = { type: type, trick: trick }
    if (type === 'line' || type === 'ray' || type === 'seg') {
      var a = U.pick([0, 20, 35, 55, 90, 125, 145, 160])
      var u = dir(a)
      var maxL = Math.min(Math.abs(u[0]) > 1e-6 ? 66 / Math.abs(u[0]) : 999, Math.abs(u[1]) > 1e-6 ? 44 / Math.abs(u[1]) : 999)
      var L = trick === 'short' ? U.randInt(26, 32) : trick === 'long' ? 64 : U.randInt(40, 54)
      if (L > maxL) {
        if (trick === 'long') return null
        L = Math.floor(maxL)
      }
      if (trick === 'long' && L < 60) return null
      it.p = add(c, u, -L / 2)
      it.q = add(c, u, L / 2)
      it.dots = type === 'line' ? [] : type === 'seg' ? [it.p, it.q] : [U.rand() < 0.5 ? it.p : it.q]
      it.key = type[0] + a + '.' + L + (type === 'ray' ? (it.dots[0] === it.p ? 'p' : 'q') : '')
      return it
    }
    /* 折线、曲线：先在横着的方向上画，再整体转一个小角度 */
    var tilt = U.pick([-20, -10, 0, 10, 20])
    var pts = []
    if (type === 'zig') {
      var segs = U.randInt(2, 4)
      var w = 56
      for (var i = 0; i <= segs; i++) pts.push([-w / 2 + (w * i) / segs, (i % 2 ? -1 : 1) * U.randInt(9, 15)])
    } else {
      var waves = U.pick([1, 1.5])
      for (var k = 0; k <= 24; k++) {
        var x = -28 + (56 * k) / 24
        pts.push([x, 11 * Math.sin((k / 24) * waves * 2 * Math.PI)])
      }
    }
    var cs = Math.cos(rad(tilt))
    var sn = Math.sin(rad(tilt))
    it.pts = pts.map(function (p) { return [c[0] + p[0] * cs - p[1] * sn, c[1] + p[0] * sn + p[1] * cs] })
    it.dots = trick === 'dots' ? [it.pts[0], it.pts[it.pts.length - 1]] : []
    it.key = type[0] + tilt + '.' + pts.length + (trick === 'dots' ? 'd' : '')
    return it
  }

  function kindSVG(items, cls, scale) {
    /* 排成一行：一行 5～8 个，比两行省高度，每个也不小（整行约 165mm 宽） */
    var per = items.length
    var rows = 1
    var W = per * KW
    var H = rows * (KH + 18)
    var p = [svgOpen(W, H, cls === undefined ? 'fig-big' : cls, scale || Math.min(1.5, 640 / W))]
    items.forEach(function (it, i) {
      var ox = (i % per) * KW
      var oy = Math.floor(i / per) * (KH + 18)
      p.push('<g class="it" transform="translate(' + ox + ' ' + oy + ')">')
      if (it.p) p.push(ln(it.p, it.q))
      else if (it.type === 'zig') p.push('<polyline points="' + it.pts.map(function (q) { return f2(q[0]) + ',' + f2(q[1]) }).join(' ') + '" fill="none" stroke="#000" stroke-width="' + SW + '" stroke-linejoin="round"/>')
      else p.push('<path d="M' + it.pts.map(function (q) { return f2(q[0]) + ' ' + f2(q[1]) }).join(' L') + '" fill="none" stroke="#000" stroke-width="' + SW + '" stroke-linejoin="round"/>')
      it.dots.forEach(function (d) { p.push(dot(d)) })
      p.push('</g>')
      p.push(txt(ox + KW / 2, oy + KH + 14, CIRC[i], 13))
    })
    p.push('</svg>')
    return p.join('')
  }

  function genKind(s) {
    var d = s.difficulty || 'L1'
    var n = d === 'L1' ? 5 : d === 'L2' ? U.randInt(6, 7) : 8
    var types = ['line', 'ray', 'seg']
    var extra = d === 'L1' ? 0 : d === 'L2' ? U.randInt(1, 2) : 2
    var others = []
    for (var e = 0; e < extra; e++) others.push(e === 0 ? U.pick(['zig', 'curve']) : (others[0] === 'zig' ? 'curve' : 'zig'))
    var main = n - extra
    var list = types.slice()
    while (list.length < main) list.push(U.pick(types))
    var cnt = { line: 0, ray: 0, seg: 0 }
    list.forEach(function (t) { cnt[t]++ })
    if (cnt.line > 3 || cnt.ray > 3 || cnt.seg > 3) return null
    var spec = list.map(function (t) { return { type: t } }).concat(others.map(function (t) { return { type: t } }))
    if (d === 'L3') {
      /* 挑战：短直线、长线段各一条，折线曲线两头带点 */
      spec.filter(function (x) { return x.type === 'line' })[0].trick = 'short'
      spec.filter(function (x) { return x.type === 'seg' })[0].trick = 'long'
      spec.forEach(function (x) { if (x.type === 'zig' || x.type === 'curve') x.trick = 'dots' })
    } else if (d === 'L2' && U.rand() < 0.5) {
      spec.filter(function (x) { return x.type === 'line' })[0].trick = 'short'
    }
    spec = U.shuffled(spec)
    var items = []
    for (var i = 0; i < spec.length; i++) {
      var it = kindItem(spec[i].type, spec[i].trick)
      if (!it) return null
      items.push(it)
    }
    var by = { line: [], ray: [], seg: [] }
    items.forEach(function (it, i) { if (by[it.type]) by[it.type].push(i) })
    var ans = '直线 ' + nums(by.line) + '；射线 ' + nums(by.ray) + '；线段 ' + nums(by.seg)
    var zz = []
    items.forEach(function (it, i) { if (!by[it.type]) zz.push(CIRC[i] + ' ' + KIND_NAME[it.type]) })
    var look = '没有端点 ' + nums(by.line) + ' → 直线；1 个端点 ' + nums(by.ray) + ' → 射线；2 个端点 ' + nums(by.seg) + ' → 线段' +
      (zz.length ? '；' + zz.join('、') + '不是直的，不算' + (d === 'L3' ? '（两头有点也不算线段）' : '') : '')
    var hasZ = others.indexOf('zig') >= 0
    var hasC = others.indexOf('curve') >= 0
    var bent = (hasC ? '弯弯的是曲线' : '') + (hasC && hasZ ? '，' : '') + (hasZ ? '拐弯的是折线' : '')
    var think = extra
      ? '先看直不直：' + bent + '，都不算。直的再数端点：没有端点是直线，1 个是射线，2 个是线段。'
      : '数端点：没有端点是直线，1 个端点是射线，2 个端点是线段。'
    var trap = d === 'L3'
      ? '折线、曲线两头有点也不是线段；画得短的直线还是直线，画得长的线段还是线段——只看端点，不看长短。'
      : d === 'L2' ? (hasZ ? '折线是几段直线连起来的，拐了弯，不算线段；' : '曲线不是直的，不算；') + '认线只看端点，不看长短和方向。' : '只看端点，不看画得长短，也不看横着、竖着还是斜着。'
    var stem = '下面的图中，哪些是直线、射线、线段？把序号填在横线上。'
    return {
      topic: 'renxian',
      variant: 'kind',
      stem: stem,
      stemHTML: stem + '<div>' + kindSVG(items) + '</div>',
      answer: ans,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '',
      ansFields: ['直线', '射线', '线段'],
      solution: [
        { tag: '想一想', text: think },
        { tag: '数一数', text: look + '。' },
        { tag: '小心陷阱', text: trap },
        { tag: '答', text: ans + '。' }
      ],
      key: 'kind:' + d + ':' + items.map(function (it) { return it.key }).join(',')
    }
  }

  /* ---------------- 变式②：平行和垂直 ---------------- */

  var RW = 80
  var RH = 60

  /* 一对线放在格子里：先在原点附近造好，再整体平移到格子中间，放不下就重来 */
  function fitPair(lines, extra) {
    var xs = []
    var ys = []
    lines.forEach(function (l) { xs.push(l[0][0], l[1][0]); ys.push(l[0][1], l[1][1]) })
    var minX = Math.min.apply(null, xs)
    var maxX = Math.max.apply(null, xs)
    var minY = Math.min.apply(null, ys)
    var maxY = Math.max.apply(null, ys)
    if (maxX - minX > RW - 10 || maxY - minY > RH - 8) return null
    var dx = RW / 2 - (minX + maxX) / 2
    var dy = RH / 2 - (minY + maxY) / 2
    function mv(p) { return [p[0] + dx, p[1] + dy] }
    return {
      lines: lines.map(function (l) { return [mv(l[0]), mv(l[1])] }),
      mark: extra ? extra.map(mv) : null
    }
  }

  function relItem(type, d) {
    var a = U.pick([0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165])
    var u
    var v
    var o = [0, 0]
    if (type === 'par') {
      u = dir(a)
      var nrm = dir(a + 90)
      var gap = U.randInt(14, 20)
      var l1 = d === 'L3' ? U.randInt(28, 34) : U.randInt(46, 56)
      var l2 = U.randInt(48, 58)
      var sh = d === 'L3' ? U.pick([-12, -8, 8, 12]) : U.randInt(-3, 3)
      var c1 = add(o, nrm, gap / 2)
      var c2 = add(add(o, nrm, -gap / 2), u, sh)
      var r = fitPair([[add(c1, u, -l1 / 2), add(c1, u, l1 / 2)], [add(c2, u, -l2 / 2), add(c2, u, l2 / 2)]])
      if (r) r.key = 'p' + a + '.' + gap + '.' + l1 + '.' + sh
      return r
    }
    if (type === 'perp' || type === 'cross') {
      if (type === 'perp') {
        if (d === 'L1') a = U.pick([0, 90])
        else if (d === 'L2') a = U.pick([0, 90, 45, 135])
        else a = U.pick([15, 30, 60, 75, 105, 120, 150, 165])
        var b = a + 90
      } else {
        b = a + U.pick([35, 40, 45, 50, 130, 135, 140, 145]) // 离直角至少 40°，一眼就不是小板凳
      }
      u = dir(a)
      v = dir(b)
      var L1 = U.randInt(46, 56)
      var L2 = U.randInt(46, 56)
      /* 交点不一定在正中：沿两条线各错开一点，像「十」也像「卜」 */
      var s1 = U.randInt(-10, 10)
      var s2 = U.randInt(-10, 10)
      var mk = null
      if (type === 'perp') {
        var k = 7
        mk = [add(o, u, k), add(add(o, u, k), v, k), add(o, v, k)]
      }
      var rr = fitPair([[add(o, u, -L1 / 2 + s1), add(o, u, L1 / 2 + s1)], [add(o, v, -L2 / 2 + s2), add(o, v, L2 / 2 + s2)]], mk)
      if (rr) rr.key = type[1] + a + '.' + b + '.' + s1 + '.' + s2
      return rr
    }
    /* conv：两条线越往一头越近，但画出来的部分没碰到 */
    var dlt = U.randInt(22, 30)
    var r0 = U.randInt(22, 28)
    var len = U.randInt(40, 48)
    u = dir(a)
    v = dir(a + dlt)
    var rc = fitPair([[add(o, u, r0), add(o, u, r0 + len)], [add(o, v, r0), add(o, v, r0 + len)]])
    if (rc) rc.key = 'v' + a + '.' + dlt + '.' + r0
    return rc
  }

  function relSVG(items, cls, scale) {
    /* 排成一行：一行 5～8 个，比两行省高度，每个也不小（整行约 165mm 宽） */
    var per = items.length
    var rows = 1
    var W = per * RW
    var H = rows * (RH + 18)
    var p = [svgOpen(W, H, cls === undefined ? 'fig-big' : cls, scale || Math.min(1.5, 640 / W))]
    items.forEach(function (it, i) {
      var ox = (i % per) * RW
      var oy = Math.floor(i / per) * (RH + 18)
      p.push('<g class="it" transform="translate(' + ox + ' ' + oy + ')">')
      it.lines.forEach(function (l) { p.push(ln(l[0], l[1])) })
      if (it.mark) p.push('<polyline class="mk" points="' + it.mark.map(function (q) { return f2(q[0]) + ',' + f2(q[1]) }).join(' ') + '" fill="none" stroke="#000" stroke-width="1.3"/>')
      p.push('</g>')
      p.push(txt(ox + RW / 2, oy + RH + 14, CIRC[i], 13))
    })
    p.push('</svg>')
    return p.join('')
  }

  function genRel(s) {
    var d = s.difficulty || 'L1'
    var n = d === 'L1' ? 5 : d === 'L2' ? 6 : 7
    var list
    if (d === 'L1') list = ['par', 'perp', 'cross']
    else if (d === 'L2') list = ['par', 'perp', 'cross', 'conv']
    else list = ['par', 'perp', 'cross', 'par']
    var pool = ['par', 'perp', 'cross']
    while (list.length < n) list.push(U.pick(pool))
    var c = {}
    list.forEach(function (t) { c[t] = (c[t] || 0) + 1 })
    if (c.par > 3 || c.perp > 3 || c.cross > 2) return null
    list = U.shuffled(list)
    var items = []
    for (var i = 0; i < list.length; i++) {
      var it = relItem(list[i], d)
      if (!it) return null
      it.type = list[i]
      items.push(it)
    }
    var by = { par: [], perp: [], cross: [], conv: [] }
    items.forEach(function (it, i) { by[it.type].push(i) })
    var askMeet = d === 'L3'
    var meetIdx = by.perp.concat(by.cross).sort(function (a, b) { return a - b })
    var ans = '平行 ' + nums(by.par) + '；垂直 ' + nums(by.perp) + (askMeet ? '；相交 ' + nums(meetIdx) : '')
    var look = '方向一样、碰不到 ' + nums(by.par) + ' → 平行；交出小板凳 ' + nums(by.perp) + ' → 垂直' +
      (by.cross.length ? '；交叉了但没有小板凳 ' + nums(by.cross) + ' → 相交，不垂直' : '') +
      (by.conv.length ? '；没碰到，可越往一头越近 ' + nums(by.conv) + ' → 延长会碰到，不平行' : '')
    var trap = d === 'L3'
      ? '垂直也是相交！写「相交」的时候，垂直的那几个也要写上。平行线画得一长一短、错开一点，也还是平行。'
      : d === 'L2' ? '没碰到不一定平行：越往一头越近的，延长就会碰到。' : '交叉了不一定垂直，要看有没有小板凳。'
    var stem = askMeet
      ? '下面的图中，哪些是平行的？哪些是垂直的？哪些是相交的？把序号填在横线上。'
      : '下面的图中，哪些是平行的？哪些是垂直的？把序号填在横线上。'
    return {
      topic: 'renxian',
      variant: 'rel',
      stem: stem,
      stemHTML: stem + '<div>' + relSVG(items) + '</div>',
      answer: ans,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '',
      ansFields: askMeet ? ['平行', '垂直', '相交'] : ['平行', '垂直'],
      solution: [
        { tag: '想一想', text: '平行：方向一样，永远碰不到。相交：交在一个点上。垂直：交出小板凳（直角），是特别的相交。' },
        { tag: '看一看', text: look + '。' },
        { tag: '小心陷阱', text: trap },
        { tag: '答', text: ans + '。' }
      ],
      key: 'rel:' + d + ':' + items.map(function (it) { return it.key }).join(',')
    }
  }

  /* ---------------- 变式③：能不能相交 ---------------- */

  var MW = 100
  var MH = 80

  /* 一条线：p 到 q 是画出来的部分。射线的端点在 p，往 q 那头延长 */
  function piece(type) {
    var p = [U.randInt(12, MW - 12), U.randInt(12, MH - 12)]
    var a = U.randInt(0, 35) * 10
    var L = U.randInt(30, 44)
    var q = add(p, dir(a), L)
    if (!inBox(q, 10, 10, MW - 10, MH - 10)) return null
    return { type: type, p: p, q: q, a: a, L: L }
  }
  function cross2(a, b) { return a[0] * b[1] - a[1] * b[0] }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]] }
  function lim(type) { return type === 'line' ? [-Infinity, Infinity] : type === 'ray' ? [0, Infinity] : [0, 1] }
  /* 交点离「能延长到的范围」的边有多远（px）：正数在范围里，负数在范围外 */
  function margin(t, type, L) {
    var r = lim(type)
    return Math.min((t - r[0]) * L, (r[1] - t) * L)
  }
  function segDist(p, a, b) {
    var ab = sub(b, a)
    var t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / (ab[0] * ab[0] + ab[1] * ab[1])))
    var x = add(a, ab, t)
    return Math.hypot(p[0] - x[0], p[1] - x[1])
  }

  /* 判断一组：yes / no / null（模棱两可，不出）。trap 表示「看着要碰上了，其实碰不到」 */
  function judge(A, B) {
    var da = sub(A.q, A.p)
    var db = sub(B.q, B.p)
    var den = cross2(da, db)
    var gapMin = Math.min(segDist(A.p, B.p, B.q), segDist(A.q, B.p, B.q), segDist(B.p, A.p, A.q), segDist(B.q, A.p, A.q))
    if (gapMin < 10) return null
    var sin = Math.abs(den) / (A.L * B.L)
    if (sin < 1e-9) return { yes: false, par: true, why: 'par' }
    if (sin < Math.sin(rad(25))) return null
    var w = sub(B.p, A.p)
    var t = cross2(w, db) / den
    var s = cross2(w, da) / den
    if (t >= 0 && t <= 1 && s >= 0 && s <= 1) return null // 画出来就已经交叉了
    var X = add(A.p, da, t)
    var ma = margin(t, A.type, A.L)
    var mb = margin(s, B.type, B.L)
    if (ma >= 6 && mb >= 6) {
      if (!inBox(X, 6, 6, MW - 6, MH - 6)) return null
      return { yes: true, X: X }
    }
    if (Math.min(ma, mb) <= -14) {
      var who = ma < mb ? A : B
      return { yes: false, X: X, block: who.type, trap: inBox(X, 6, 6, MW - 6, MH - 6) }
    }
    return null
  }

  var PAIRS = {
    L1: [['line', 'line'], ['seg', 'seg'], ['line', 'seg']],
    L2: [['line', 'line'], ['seg', 'seg'], ['line', 'seg'], ['ray', 'line'], ['ray', 'seg'], ['ray', 'ray']],
    L3: [['line', 'seg'], ['ray', 'line'], ['ray', 'seg'], ['ray', 'ray'], ['seg', 'seg'], ['line', 'line']]
  }

  function makeOption(pair, want, wantPar) {
    for (var k = 0; k < 60; k++) {
      var A = piece(pair[0])
      var B
      if (wantPar) {
        if (!A) continue
        /* 平行：同一个方向，错开 16～24 */
        var nrm = dir(A.a + 90)
        var off = U.pick([-1, 1]) * U.randInt(16, 24)
        var p = add(add(A.p, nrm, off), dir(A.a), U.randInt(-8, 8))
        var Lb = U.randInt(30, 44)
        var q = add(p, dir(A.a), Lb)
        if (!inBox(p, 10, 10, MW - 10, MH - 10) || !inBox(q, 10, 10, MW - 10, MH - 10)) continue
        B = { type: pair[1], p: p, q: q, a: A.a, L: Lb }
      } else {
        B = piece(pair[1])
      }
      if (!A || !B) continue
      var j = judge(A, B)
      if (!j) continue
      if (wantPar ? !j.par : j.par) continue
      if (want !== null && j.yes !== want) continue
      return { a: A, b: B, j: j }
    }
    return null
  }

  function extendLine(P, Q, type) {
    /* 在框里能延长到哪里：返回要补画的虚线段 */
    var dd = sub(Q, P)
    /* Liang–Barsky：直线 P + t·dd 在框里的 t 范围 */
    var t0 = -Infinity
    var t1 = Infinity
    var pp = [-dd[0], dd[0], -dd[1], dd[1]]
    var qq = [P[0] - 2, MW - 2 - P[0], P[1] - 2, MH - 2 - P[1]]
    for (var i = 0; i < 4; i++) {
      if (Math.abs(pp[i]) < 1e-9) continue
      var r = qq[i] / pp[i]
      if (pp[i] < 0) t0 = Math.max(t0, r)
      else t1 = Math.min(t1, r)
    }
    var out = []
    if (type === 'line' && t0 < 0) out.push([add(P, dd, t0), P])
    if ((type === 'line' || type === 'ray') && t1 > 1) out.push([Q, add(P, dd, t1)])
    return out
  }

  function meetSVG(opts, withExt, cls, scale) {
    var G = MW + 12
    var W = G * 4 - 12
    var H = MH + 18
    var p = [svgOpen(W, H, cls === undefined ? 'fig-big' : cls, scale)]
    opts.forEach(function (o, i) {
      var ox = i * G
      if (i) p.push('<line x1="' + (ox - 6) + '" y1="2" x2="' + (ox - 6) + '" y2="' + (MH - 2) + '" stroke="#000" stroke-width="0.5" stroke-dasharray="3 3"/>')
      p.push('<g class="it" transform="translate(' + ox + ' 0)">')
      ;[o.a, o.b].forEach(function (pc) {
        p.push(ln(pc.p, pc.q))
        if (pc.type === 'seg') p.push(dot(pc.p), dot(pc.q))
        if (pc.type === 'ray') p.push(dot(pc.p))
        if (withExt) extendLine(pc.p, pc.q, pc.type).forEach(function (e) { p.push(dash(e[0], e[1])) })
      })
      if (withExt && o.j.yes) p.push('<circle cx="' + f2(o.j.X[0]) + '" cy="' + f2(o.j.X[1]) + '" r="4.5" fill="none" stroke="#000" stroke-width="1.4"/>')
      p.push('</g>')
      p.push(txt(ox + MW / 2, H - 3, LET[i], 13))
    })
    p.push('</svg>')
    return p.join('')
  }

  function genMeet(s) {
    var d = s.difficulty || 'L1'
    var pairs = PAIRS[d]
    var nYes = U.randInt(1, 3)
    var wants = []
    for (var i = 0; i < 4; i++) wants.push(i < nYes)
    wants = U.shuffled(wants)
    var parAt = d === 'L3' && U.rand() < 0.5 ? wants.indexOf(false) : -1
    var opts = []
    for (var k = 0; k < 4; k++) {
      var pair
      if (k === parAt) pair = ['line', 'line']
      else {
        pair = U.pick(pairs)
        if (wants[k] && pair[0] === 'seg' && pair[1] === 'seg') pair = ['line', 'seg'] // 两条线段不碰就永远碰不到
      }
      if (U.rand() < 0.5) pair = [pair[1], pair[0]]
      var o = makeOption(pair, wants[k], k === parAt)
      if (!o) return null
      opts.push(o)
    }
    /* 不出四组一模一样的类型；挑战档至少一个「看着要碰上、其实碰不到」的陷阱 */
    var kinds = {}
    opts.forEach(function (o) { kinds[[o.a.type, o.b.type].sort().join('-')] = 1 })
    if (Object.keys(kinds).length < 3) return null
    if (d === 'L3' && !opts.some(function (o) { return o.j.trap })) return null
    if (d !== 'L1' && !opts.some(function (o) { return o.a.type === 'ray' || o.b.type === 'ray' })) return null
    var yesL = []
    opts.forEach(function (o, i) { if (o.j.yes) yesL.push(LET[i]) })
    var ans = joinLetters(yesL)
    var look = opts.map(function (o, i) {
      var t = KIND_NAME[o.a.type] + '和' + KIND_NAME[o.b.type]
      if (o.a.type === o.b.type) t = '两条' + KIND_NAME[o.a.type]
      var why
      if (o.j.yes) why = '延长后碰到了，能'
      else if (o.j.par) why = '平行，永远碰不到，不能'
      else if (o.j.block === 'seg') why = '线段要延长才碰得到，不能'
      else why = '射线有点那头不能延长，不能'
      return LET[i] + ' ' + t + '：' + why + '相交'
    }).join('；')
    var trap = opts.some(function (o) { return !o.j.yes && o.j.block === 'ray' })
      ? '射线只能往没有点的那头延长，有点的那头到头了。'
      : '线段两头都有点，一点也不能延长；看着快碰上了也不行。'
    var stem = '下面每组两条线，哪几组能相交？'
    return {
      topic: 'renxian',
      variant: 'meet',
      stem: stem,
      stemHTML: stem + '<div>' + meetSVG(opts, false, 'fig-big fig-mid') + '</div>',
      diagramHTML: '<div class="sol-diagram">' + meetSVG(opts, true, null, 1.2).replace('<svg', '<svg style="max-height:26mm;width:auto"') + '<div class="dot-note">虚线是延长出来的部分，小圆圈是交点。</div></div>',
      answer: ans,
      unit: '',
      ansLabel: '答：能相交的是',
      ansSuffix: '。',
      workLabel: '延长看看',
      solution: [
        { tag: '想一想', text: '直线两头都能延长，射线只能往没有点的那头延长，线段不能延长。延长以后碰得到，就能相交。' },
        { tag: '一组一组看', text: look + '。' },
        { tag: '小心陷阱', text: trap },
        { tag: '答', text: '能相交的是 ' + ans + '。' }
      ],
      key: 'meet:' + d + ':' + opts.map(function (o) {
        return [o.a, o.b].map(function (pc) { return pc.type[0] + pc.p.join('.') + '.' + pc.a + '.' + pc.L }).join('/')
      }).join(',')
    }
  }

  /* ---------------- 变式④：数平行线 ---------------- */

  var PW = 170
  var PH = 120
  var PAD = 14 // 四边留白放编号

  function pairList(ids) {
    var groups = []
    for (var i = 0; i < ids.length; i++) {
      var g = []
      for (var j = i + 1; j < ids.length; j++) g.push(ids[i] + ' 和 ' + ids[j])
      if (g.length) groups.push(g.join('、'))
    }
    return groups.join('；')
  }
  function sumText(n) {
    var parts = []
    for (var k = n - 1; k >= 1; k--) parts.push(k)
    return parts.length > 1 ? parts.join(' + ') + ' = ' + (n * (n - 1)) / 2 : String(parts[0])
  }

  /* 一组平行线：方向 a，n 条，间距 gap，以 c 为中心 */
  function parSet(n, a, gap, c, lenMin, lenMax) {
    var u = dir(a)
    var nrm = dir(a + 90)
    var out = []
    for (var i = 0; i < n; i++) {
      var off = (i - (n - 1) / 2) * gap
      var L = U.randInt(lenMin, lenMax)
      var m = add(add(c, nrm, off), u, U.randInt(-12, 12))
      out.push([add(m, u, -L / 2), add(m, u, L / 2)])
    }
    return out
  }

  /* 让每条线的「起点」在左边（竖线在上边），编号写在起点外侧 */
  function orient(l) {
    var a = l[0]
    var b = l[1]
    if (Math.abs(a[0] - b[0]) < 1) return a[1] < b[1] ? [a, b] : [b, a]
    return a[0] < b[0] ? [a, b] : [b, a]
  }

  function parSVG(lines, labels, cls, scale) {
    var W = PW + PAD * 2
    var H = PH + PAD * 2
    var p = [svgOpen(W, H, cls === undefined ? 'fig-big' : cls, scale)]
    p.push('<g transform="translate(' + PAD + ' ' + PAD + ')">')
    lines.forEach(function (l) { p.push(ln(l[0], l[1])) })
    if (labels) {
      lines.forEach(function (l, i) {
        if (labels[i] == null) return
        var o = orient(l)
        var u = sub(o[0], o[1])
        var len = Math.hypot(u[0], u[1])
        var at = add(o[0], [u[0] / len, u[1] / len], 9)
        p.push(txt(at[0], at[1] + 5, labels[i], 14, ' font-weight="700"'))
      })
    }
    p.push('</g></svg>')
    return p.join('')
  }

  function okBox(lines) {
    return lines.every(function (l) { return inBox(l[0], 4, 4, PW - 4, PH - 4) && inBox(l[1], 4, 4, PW - 4, PH - 4) })
  }

  function genPar(s) {
    var d = s.difficulty || 'L1'
    var shape
    if (d === 'L1') shape = 'set'
    else if (d === 'L2') shape = U.pick(['set', 'setx', 'tri'])
    else shape = U.pick(['tri', 'two', 'two'])
    var lines = []
    var fam = [] // 每组平行线在 lines 里的下标
    var c = [PW / 2, PH / 2]
    var think
    var trap
    if (shape === 'set' || shape === 'setx') {
      var n = d === 'L1' ? U.randInt(3, 4) : shape === 'set' ? U.randInt(4, 5) : U.randInt(3, 4)
      var a = U.pick([0, 90, 15, 165, 30, 150])
      var gap = n <= 3 ? U.randInt(18, 22) : U.randInt(15, 18)
      lines = parSet(n, a, gap, c, 70, 120)
      fam.push(lines.map(function (l, i) { return i }))
      if (shape === 'setx') {
        var b = a + U.pick([40, 50, 60, 120, 130, 140])
        var u = dir(b)
        var L = 120
        lines.push([add(c, u, -L / 2), add(c, u, L / 2)])
      }
      think = '方向一样、永远碰不到的两条线是一组平行线。' + (shape === 'setx' ? '斜着穿过去的那条和谁都不平行，不算。' : '')
      trap = '不是只数挨着的两条：隔开的两条（比如 1 和 3）也是一组。'
    } else if (shape === 'tri') {
      var k = d === 'L2' ? U.randInt(3, 4) : U.randInt(4, 5)
      var apex = [PW / 2, 4]
      var half = U.randInt(62, 76)
      var baseY = PH - 4
      var BL = [PW / 2 - half, baseY]
      var BR = [PW / 2 + half, baseY]
      lines.push([apex, BL], [apex, BR])
      var h = (baseY - apex[1]) / (k + 0.6)
      var hs = []
      for (var i = 0; i < k; i++) {
        var y = baseY - i * h
        var f = (y - apex[1]) / (baseY - apex[1])
        hs.push(lines.length)
        lines.push([[PW / 2 - half * f, y], [PW / 2 + half * f, y]])
      }
      fam.push(hs)
      think = '三角形里横着的线（连底边）方向都一样，两两平行；两条斜边方向不一样，和谁都不平行。'
      trap = '底边也是横线，别忘了数它；两条斜边不平行。'
    } else {
      var na = U.randInt(2, 4)
      var nb = U.randInt(2, 4)
      if (na + nb > 7 || Math.max(na, nb) < 3) return null
      var bb = U.pick([90, 90, 60, 120])
      var A = parSet(na, 0, U.randInt(20, 24), c, 120, 140)
      var B = parSet(nb, bb, U.randInt(26, 32), c, 90, 104)
      lines = A.concat(B)
      fam.push(A.map(function (l, i) { return i }), B.map(function (l, i) { return na + i }))
      think = '这里有两个方向的线：横着的一组方向一样，' + (bb === 90 ? '竖着' : '斜着') + '的一组方向一样，各自两两平行；横的和' + (bb === 90 ? '竖' : '斜') + '的不平行。'
      trap = '两个方向要分开数，最后加起来；横线和' + (bb === 90 ? '竖线' : '斜线') + '交叉了，不能配成一组。'
    }
    if (!okBox(lines)) return null

    /* 编号：每组平行线按从上到下（竖的从左到右）排好，再依次编 1、2、3… */
    var labels = lines.map(function () { return null })
    var no = 1
    var famIds = fam.map(function (g) {
      var sorted = g.slice().sort(function (i, j) {
        var mi = [(lines[i][0][0] + lines[i][1][0]) / 2, (lines[i][0][1] + lines[i][1][1]) / 2]
        var mj = [(lines[j][0][0] + lines[j][1][0]) / 2, (lines[j][0][1] + lines[j][1][1]) / 2]
        var horiz = Math.abs(lines[i][0][1] - lines[i][1][1]) < Math.abs(lines[i][0][0] - lines[i][1][0])
        return horiz ? mi[1] - mj[1] : mi[0] - mj[0]
      })
      return sorted.map(function (idx) { labels[idx] = no; return no++ })
    })
    var total = 0
    var pairsTxt = []
    var sums = []
    famIds.forEach(function (ids) {
      var m = ids.length
      total += (m * (m - 1)) / 2
      pairsTxt.push(pairList(ids))
      sums.push(sumText(m))
    })
    var count
    if (famIds.length === 1) count = sums[0] + '（组）。'
    else count = '横的 ' + sums[0] + '，' + (shape === 'two' ? '另一组 ' : '') + sums[1] + '，一共 ' + famIds.map(function (ids) { return (ids.length * (ids.length - 1)) / 2 }).join(' + ') + ' = ' + total + '（组）。'
    var stem = d === 'L1' ? '下面的图中，一共有几组平行线？' : '数一数，下面的图中一共有几组平行线？'
    return {
      topic: 'renxian',
      variant: 'par',
      stem: stem,
      stemHTML: stem + '<div>' + parSVG(lines, null, 'fig-big fig-mid') + '</div>',
      diagramHTML: '<div class="sol-diagram">' + parSVG(lines, labels, null, 1.2).replace('<svg', '<svg style="max-height:26mm;width:auto"') + '<div class="dot-note">先给平行的线标上号。</div></div>',
      answer: total,
      unit: '组',
      ansLabel: '答：一共有',
      ansSuffix: '组平行线。',
      workLabel: '标号、配对',
      solution: [
        { tag: '想一想', text: think },
        { tag: '打枪法', text: '标好号（见图），' + pairsTxt.join('；') + '。' },
        { tag: '算一算', text: count },
        { tag: '小心陷阱', text: trap },
        { tag: '答', text: '一共有 ' + total + ' 组平行线。' }
      ],
      key: 'par:' + d + ':' + shape + ':' + lines.map(function (l) { return l.map(function (pt) { return Math.round(pt[0]) + '.' + Math.round(pt[1]) }).join('/') }).join(',')
    }
  }

  /* ---------------- 讲解页里的插图 ---------------- */

  function small(w, h, body, k) {
    k = k || 1.3
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w * k + '" height="' + h * k + '">' + body + '</svg>'
  }
  function dots3(p, u) {
    /* 一直延长下去：线外面画三个小点 */
    var s = ''
    for (var i = 1; i <= 3; i++) {
      var q = add(p, u, 5 + i * 5)
      s += '<circle cx="' + f2(q[0]) + '" cy="' + f2(q[1]) + '" r="1.2" fill="#000"/>'
    }
    return s
  }

  /* 先想一想：手电筒的光 + 尺子 */
  var HOOK_SVG = small(200, 90,
    '<rect x="6" y="18" width="34" height="16" rx="3" fill="#fff" stroke="#000" stroke-width="1.6"/>' +
    '<path d="M40 16 L48 12 L48 40 L40 36 Z" fill="#fff" stroke="#000" stroke-width="1.6"/>' +
    ln([48, 26], [150, 26]) + dots3([150, 26], [1, 0]) +
    '<path d="M50 18 L150 8 M50 34 L150 44" stroke="#000" stroke-width="0.8" stroke-dasharray="2 3"/>' +
    txt(100, 58, '光：一直往前照', 10) +
    '<rect x="30" y="66" width="130" height="16" fill="#fff" stroke="#000" stroke-width="1.4"/>' +
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(function (i) {
      return '<line x1="' + (30 + i * 10) + '" y1="66" x2="' + (30 + i * 10) + '" y2="' + (i % 5 ? 71 : 74) + '" stroke="#000" stroke-width="0.8"/>'
    }).join('') +
    txt(178, 78, '尺子', 10))

  /* 直线、射线、线段放一张卡：三条一样长，只差端点 */
  var THREE_FIG = small(150, 58,
    ln([18, 9], [96, 9]) + dots3([18, 9], [-1, 0]) + dots3([96, 9], [1, 0]) + txt(132, 13, '直线', 10) +
    ln([18, 29], [96, 29]) + dot([18, 29]) + dots3([96, 29], [1, 0]) + txt(132, 33, '射线', 10) +
    ln([18, 49], [96, 49]) + dot([18, 49]) + dot([96, 49]) + txt(132, 53, '线段', 10), 1.05)
  var ZIGCURVE_FIG = small(120, 34,
    '<polyline points="6,26 22,8 38,26 54,8" fill="none" stroke="#000" stroke-width="' + SW + '" stroke-linejoin="round"/>' +
    '<path d="M66 17 Q76 3 86 17 T106 17" fill="none" stroke="#000" stroke-width="' + SW + '"/>' +
    txt(30, 33, '折线', 8) + txt(86, 33, '曲线', 8))
  var PAR_FIG = small(120, 34, ln([14, 9], [106, 9]) + ln([14, 25], [106, 25]))
  var CROSS_FIG = small(120, 50,
    ln([8, 8], [52, 42]) + ln([8, 42], [52, 8]) + '<circle cx="30" cy="25" r="2.6" fill="#000"/>' + txt(30, 49, '相交', 8) +
    ln([68, 25], [112, 25]) + ln([90, 4], [90, 44]) + '<polyline points="97,25 97,18 90,18" fill="none" stroke="#000" stroke-width="1.3"/>' + txt(104, 49, '垂直', 8))

  /* 招 1：数端点 */
  var KIND_FIG = small(150, 76,
    ln([10, 12], [80, 12]) + txt(118, 16, '0 个点', 10) +
    ln([10, 38], [80, 38]) + dot([10, 38]) + txt(118, 42, '1 个点', 10) +
    ln([10, 64], [80, 64]) + dot([10, 64]) + dot([80, 64]) + txt(118, 68, '2 个点', 10))

  /* 招 2：射线往没点的那头延长，碰到了线段 */
  var MEET_FIG = (function () {
    /* 射线 (14,14)→(60,40) 往右下延长，碰到 x = 120 的竖线段 */
    var y = 14 + (26 * (120 - 14)) / 46
    return small(150, 86,
      ln([14, 14], [60, 40]) + dot([14, 14]) + dash([60, 40], [120, y]) +
      ln([120, 24], [120, 80]) + dot([120, 24]) + dot([120, 80]) +
      '<circle cx="120" cy="' + f2(y) + '" r="4.5" fill="none" stroke="#000" stroke-width="1.3"/>' +
      txt(58, 76, '射线延长，碰到了', 9))
  })()

  /* 招 3：三条平行线编号配对 */
  var PAR3_FIG = small(150, 70,
    ln([20, 12], [110, 12]) + ln([20, 34], [110, 34]) + ln([20, 56], [110, 56]) +
    txt(10, 16, '1', 11, ' font-weight="700"') + txt(10, 38, '2', 11, ' font-weight="700"') + txt(10, 60, '3', 11, ' font-weight="700"') +
    '<path d="M114 12 q10 11 0 22 M114 34 q10 11 0 22 M118 12 q22 22 0 44" fill="none" stroke="#000" stroke-width="1.1"/>' +
    txt(140, 40, '3 组', 9))

  var RENXIAN = {
    id: 'renxian',
    no: 'B11',
    stage: 'L1B',
    name: '线角初步：认识线',
    lesson: {
      v2: true,
      title: '认识线 · 方法讲解',
      goal: '认识直线、射线、线段，会看两条线是平行、相交还是垂直，还会数几组平行线。',
      sections: [
        {
          kind: 'hook',
          heading: '先想一想',
          paras: [
            '打开手电筒，光能照多远？一直往前，没有尽头。',
            '尺子的边呢？两头都到头了。它们都是直直的线，可不一样——今天就来认一认。'
          ],
          figHTML: HOOK_SVG
        },
        {
          kind: 'know',
          heading: '先认识',
          cards: [
            { title: '直线、射线、线段', text: '直线两头都能一直延长；射线从端点出发往一头延长（像手电筒的光）；线段两头到头，不能延长（像尺子的边）。', figHTML: THREE_FIG },
            { title: '折线和曲线', text: '拐弯的是折线，弯弯的是曲线。', figHTML: ZIGCURVE_FIG },
            { title: '平行', text: '方向一样，延长多远也碰不到。', figHTML: PAR_FIG },
            { title: '相交和垂直', text: '交在一点是相交；交出「小板凳」（直角）是垂直，也算相交。', figHTML: CROSS_FIG }
          ]
        },
        {
          kind: 'move',
          name: '看端点认线',
          tip: '先看直不直，再数端点。',
          steps: [
            '先看直不直：拐弯的是折线，弯弯的是曲线，先划掉。',
            '直的数端点：没有端点是直线，1 个是射线，2 个是线段。',
            '一个一个认完，把序号写进对应的横线上。'
          ],
          pitfall: '只看端点，不看长短：画得短的直线还是直线；折线两头有点也不是线段。',
          figHTML: KIND_FIG,
          variants: ['kind']
        },
        {
          kind: 'move',
          name: '看两条线的位置',
          tip: '先看碰没碰到，没碰到就延长看看。',
          steps: [
            '交叉了：有小板凳是垂直，没有就是相交（垂直也算相交）。',
            '没碰到：想一想延长——直线两头能延长，射线往没点的那头延长，线段不能延长。',
            '方向一样、延长多远也碰不到的是平行；延长后碰得到的，就能相交。'
          ],
          pitfall: '没碰到不一定平行；线段看着快碰上了，可它不能延长。',
          figHTML: MEET_FIG,
          variants: ['rel', 'meet']
        },
        {
          kind: 'move',
          name: '编号数平行线',
          tip: '两条平行线是一组，用打枪法按顺序配，不重不漏。',
          steps: [
            '找出方向一样的线，从上到下标上 1、2、3……',
            '打枪法：1 和后面每一条配一次，再 2 和后面每一条配一次……',
            '把每一轮的组数加起来：3 条是 2 + 1 = 3 组，4 条是 3 + 2 + 1 = 6 组。'
          ],
          pitfall: '隔开的两条也是一组；斜着的线和横线不平行，别配进去。',
          figHTML: PAR3_FIG,
          variants: ['par']
        },
        {
          kind: 'pick',
          heading: '用哪一招？',
          rows: [
            ['问哪些是直线、射线、线段', '看端点认线', ['kind']],
            ['问平行、垂直，能不能相交', '看两条线的位置', ['rel', 'meet']],
            ['问一共有几组平行线', '编号数平行线', ['par']]
          ]
        },
        { kind: 'chant', chant: '没有端点是直线，一个端点是射线，两个端点是线段；永远碰不到是平行，交成小板凳是垂直；直线射线能延长，线段到头不能长；数平行线先编号，两条一组按顺序。' }
      ]
    },
    variants: [
      {
        id: 'kind',
        setting: 'vRxKind',
        label: '认线（直线、射线、线段）',
        idea: '先看直不直，折线曲线不算；直的数端点：没有是直线，1 个是射线，2 个是线段，不看长短。',
        gen: genKind
      },
      {
        id: 'rel',
        setting: 'vRxRel',
        label: '平行和垂直',
        idea: '方向一样、永远碰不到是平行；交出小板凳是垂直，垂直也是相交；没碰到但越来越近的不平行。',
        gen: genRel
      },
      {
        id: 'meet',
        setting: 'vRxMeet',
        label: '能不能相交（延长看看）',
        def: false,
        idea: '直线两头能延长，射线往没点的那头延长，线段不能延长；延长后碰得到就能相交，平行的永远碰不到。',
        gen: genMeet
      },
      {
        id: 'par',
        setting: 'vRxPar',
        label: '数平行线（编号 + 打枪法）',
        idea: '给方向一样的线标号，1 和后面每条配、2 和后面每条配……把组数加起来；两个方向分开数再相加。',
        gen: genPar
      }
    ],
    generate: function (s) {
      return U.generateFrom(RENXIAN.variants, s)
    },
    titleFor: function (s) {
      return '认识线练习 · ' + U.DIFF_LABEL[s.difficulty || 'L1']
    }
  }

  root.SumSum.aoshu.topics.renxian = RENXIAN
  root.SumSum.aoshu.topicList.push(RENXIAN)
})(typeof window !== 'undefined' ? window : globalThis)
