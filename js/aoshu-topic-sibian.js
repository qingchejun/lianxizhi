/**
 * 知识点「B14 平面图形：认识四边形」（L1 补充，对照学而思 1 级第 4 讲好方法 1、2、5、6，拆题笔记 docs/xes-1ji/04-有趣的平面图形.md 第 6 节）。
 * 变式：①圆、椭圆、扇形 ②梯形和平行四边形（钉子板）③平移（钉子板）④选点围四边形（def: false）。
 * 图全是黑白内联 SVG。钉子 <circle class="dot">，四边形 / 平移的图形是 <polygon class="qd">，顶点都在钉子上；
 * 圆 <circle class="yc">、椭圆 <ellipse class="ye">、扇形 <path class="ys">。
 * 自检（check-aoshu-gen.js 的 checkSibian）不看 key，直接量题干 SVG：每个编号一个 <g class="it">。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util
  var CIRC = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧']
  var SW = 2.2

  function f2(x) { return Math.round(x * 100) / 100 }
  function svgOpen(w, h, cls, scale) {
    var k = scale || 1.5
    return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 ' + f2(w) + ' ' + f2(h) + '" width="' + f2(w * k) + '" height="' + f2(h * k) + '">'
  }
  function txt(x, y, s, size, extra) {
    return '<text x="' + f2(x) + '" y="' + f2(y) + '" font-size="' + (size || 12) + '" text-anchor="middle"' + (extra || '') + '>' + s + '</text>'
  }
  function nums(arr) { return arr.map(function (i) { return CIRC[i] }).join('') || '没有' }
  function poly(pts, cls, extra) {
    return '<polygon class="' + (cls || 'qd') + '" points="' + pts.map(function (p) { return f2(p[0]) + ',' + f2(p[1]) }).join(' ') +
      '" fill="none" stroke="#000" stroke-width="' + SW + '" stroke-linejoin="round"' + (extra || '') + '/>'
  }

  /* ---------------- 格点几何（整数） ---------------- */
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]] }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1]] }
  function dot(u, v) { return u[0] * v[0] + u[1] * v[1] }
  function cross(u, v) { return u[0] * v[1] - u[1] * v[0] }
  function len2(v) { return dot(v, v) }
  function par(u, v) { return cross(u, v) === 0 }
  /* 两条线方向差几度（0～90） */
  function dirDiff(u, v) {
    var a = Math.abs(Math.atan2(cross(u, v), dot(u, v))) * 180 / Math.PI
    return a > 90 ? 180 - a : a
  }
  function sides(Q) { return [0, 1, 2, 3].map(function (i) { return sub(Q[(i + 1) % 4], Q[i]) }) }
  /* 凸、不自交、每个角 ≥ minA */
  function convexOk(Q, minA) {
    var s = sides(Q)
    var sg = 0
    for (var i = 0; i < 4; i++) {
      var c = cross(s[i], s[(i + 1) % 4])
      if (c === 0) return false
      var g = c > 0 ? 1 : -1
      if (sg && g !== sg) return false
      sg = g
      var u = [-s[i][0], -s[i][1]], v = s[(i + 1) % 4]
      var ang = Math.atan2(Math.abs(cross(u, v)), dot(u, v)) * 180 / Math.PI
      if (ang < (minA || 25)) return false
    }
    return true
  }
  /* 四边形类型：ti 梯形、px 平行四边形、cf 长方形、zf 正方形、lx 菱形、qt 一般四边形；看不清的（差一点平行）返回 null */
  function quadKind(Q) {
    var s = sides(Q)
    var p1 = par(s[0], s[2]), p2 = par(s[1], s[3])
    if (!p1 && dirDiff(s[0], s[2]) < 14) return null
    if (!p2 && dirDiff(s[1], s[3]) < 14) return null
    if (p1 && p2) {
      var right = dot(s[0], s[1]) === 0
      var eq = len2(s[0]) === len2(s[1])
      if (right && eq) return 'zf'
      if (right) return 'cf'
      if (eq) return 'lx'
      return 'px'
    }
    if (p1 || p2) return 'ti'
    return 'qt'
  }
  var PXFAM = { px: 1, cf: 1, zf: 1, lx: 1 }
  function canon(P) {
    var mx = Math.min.apply(null, P.map(function (p) { return p[0] })), my = Math.min.apply(null, P.map(function (p) { return p[1] }))
    return P.map(function (p) { return (p[0] - mx) + '.' + (p[1] - my) }).sort().join('_')
  }

  /* ---------------- 钉子板 ---------------- */
  var SP = 13
  var BC = 5
  var BR = 4
  var CW = 80
  var CH = 56

  function dotsHTML(cols, rows, ox, oy, sp) {
    var p = []
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      p.push('<circle class="dot" cx="' + f2(ox + x * sp) + '" cy="' + f2(oy + y * sp) + '" r="1.15" fill="#000"/>')
    }
    return p.join('')
  }
  function boardItem(P) {
    var ox = (CW - (BC - 1) * SP) / 2
    var oy = (CH - (BR - 1) * SP) / 2
    return dotsHTML(BC, BR, ox, oy, SP) + poly(P.map(function (q) { return [ox + q[0] * SP, oy + q[1] * SP] }))
  }
  function rowSVG(htmls, cls, scale) {
    var W = htmls.length * CW
    var H = CH + 18
    var p = [svgOpen(W, H, cls === undefined ? 'fig-big' : cls, scale || Math.min(1.5, 640 / W))]
    htmls.forEach(function (h, i) {
      var ox = i * CW
      p.push('<g class="it" transform="translate(' + ox + ' 0)">' + h + '</g>')
      p.push(txt(ox + CW / 2, CH + 14, CIRC[i], 13))
    })
    p.push('</svg>')
    return p.join('')
  }

  /* ---------------- 变式①：圆、椭圆、扇形 ---------------- */

  function shapeHTML(sp, d) {
    var cx = CW / 2, cy = CH / 2
    if (sp.t === 'yc') return '<circle class="yc" cx="' + cx + '" cy="' + cy + '" r="' + sp.r + '" fill="none" stroke="#000" stroke-width="' + SW + '"/>'
    if (sp.t === 'ye') return '<ellipse class="ye" cx="' + cx + '" cy="' + cy + '" rx="' + sp.rx + '" ry="' + sp.ry + '" transform="rotate(' + sp.rot + ' ' + cx + ' ' + cy + ')" fill="none" stroke="#000" stroke-width="' + SW + '"/>'
    if (sp.t === 'ys') {
      /* 扇形：圆心在 (cx, cy)，从 a0 开始张开 span 度（数学角度：0 向右、逆时针） */
      var r = sp.r
      var a0 = sp.a0 * Math.PI / 180, a1 = (sp.a0 + sp.span) * Math.PI / 180
      /* 让扇形整体居中：圆心往张口反方向挪一点 */
      var mid = (sp.a0 + sp.span / 2) * Math.PI / 180
      var sh = sp.span <= 180 ? r * 0.35 : 0
      var ox = cx - Math.cos(mid) * sh, oy = cy + Math.sin(mid) * sh
      var p0 = [ox + r * Math.cos(a0), oy - r * Math.sin(a0)], p1 = [ox + r * Math.cos(a1), oy - r * Math.sin(a1)]
      return '<path class="ys" data-span="' + sp.span + '" d="M' + f2(ox) + ' ' + f2(oy) + ' L' + f2(p0[0]) + ' ' + f2(p0[1]) + ' A' + r + ' ' + r + ' 0 ' + (sp.span > 180 ? 1 : 0) + ' 0 ' + f2(p1[0]) + ' ' + f2(p1[1]) + ' Z" fill="none" stroke="#000" stroke-width="' + SW + '" stroke-linejoin="round"/>'
    }
    /* 干扰：三角形或正方形 */
    if (sp.t === 'tri') return poly([[cx - 22, cy + 18], [cx + 22, cy + 18], [cx, cy - 20]], 'oth')
    return poly([[cx - 19, cy - 19], [cx + 19, cy - 19], [cx + 19, cy + 19], [cx - 19, cy + 19]], 'oth')
  }
  function randShape(t, d) {
    if (t === 'yc') return { t: t, r: U.pick([18, 20, 22, 24]) }
    if (t === 'ye') {
      var ratio = d === 'L3' ? U.pick([1.3, 1.4, 1.6]) : U.pick([1.5, 1.7, 1.9])
      var rx = U.pick([24, 26, 28])
      return { t: t, rx: rx, ry: f2(rx / ratio), rot: d === 'L1' ? U.pick([0, 90]) : U.pick([0, 30, 60, 90, 120, 150]) }
    }
    if (t === 'ys') {
      var spans = d === 'L1' ? [90, 120] : d === 'L2' ? [60, 90, 120, 150] : [60, 90, 150, 240, 270, 300]
      var span = U.pick(spans)
      return { t: t, r: span > 180 ? 22 : 30, span: span, a0: d === 'L1' ? 45 : U.pick([0, 30, 45, 90, 135, 180, 210, 270, 300]) }
    }
    return { t: t }
  }
  function shapeKey(sp) {
    return sp.t + '.' + (sp.r || '') + '.' + (sp.rx || '') + '.' + (sp.ry || '') + '.' + (sp.rot || '') + '.' + (sp.span || '') + '.' + (sp.a0 || '')
  }

  function genYuan(s) {
    var d = s.difficulty || 'L1'
    var n = d === 'L1' ? 5 : d === 'L2' ? 6 : 7
    var types = ['yc', 'ye', 'ys']
    if (d === 'L3') types.push(U.pick(['tri', 'sq']))
    while (types.length < n) types.push(U.pick(['yc', 'ye', 'ys', 'ys']))
    var c = {}
    types.forEach(function (t) { c[t] = (c[t] || 0) + 1 })
    if (c.yc > 2 || c.ye > 3 || c.ys > 3) return null
    types = U.shuffled(types)
    var shapes = types.map(function (t) { return randShape(t, d) })
    var seen = {}
    for (var i = 0; i < shapes.length; i++) {
      var k = shapeKey(shapes[i])
      if (seen[k]) return null
      seen[k] = 1
    }
    if (d === 'L3' && !shapes.some(function (sp) { return sp.t === 'ys' && sp.span > 180 })) return null
    var by = { yc: [], ye: [], ys: [] }
    shapes.forEach(function (sp, i) { if (by[sp.t]) by[sp.t].push(i) })
    var ans = '圆 ' + nums(by.yc) + '；椭圆 ' + nums(by.ye) + '；扇形 ' + nums(by.ys)
    var stem = '下面的图形中，哪些是圆、椭圆、扇形？把序号填在横线上。'
    var look = shapes.map(function (sp, i) {
      var w = sp.t === 'yc' ? '圆圆的，是圆' : sp.t === 'ye' ? '像圆被压扁了，是椭圆' : sp.t === 'ys' ? '像圆缺了一块（一条边是弯的、两条边是直的），是扇形' : '有尖尖的角、边都是直的，不是这三种'
      return CIRC[i] + ' ' + w
    }).join('；')
    return {
      topic: 'sibian',
      variant: 'yuan',
      stem: stem,
      stemHTML: stem + '<div>' + rowSVG(shapes.map(function (sp) { return shapeHTML(sp, d) })) + '</div>',
      answer: ans,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '',
      ansFields: ['圆', '椭圆', '扇形'],
      solution: [
        { tag: '想一想', text: '拿圆来比：一模一样圆圆的是圆，被压扁了的是椭圆，缺了一块（像披萨的一角）的是扇形。' },
        { tag: '看一看', text: look + '。' },
        { tag: '小心陷阱', text: d === 'L3' ? '缺了一小块、剩下一大半的也是扇形；有点扁的也是椭圆，不是圆。' : '椭圆转个方向还是椭圆；扇形不管朝哪边开口都是扇形。' },
        { tag: '答', text: ans + '。' }
      ],
      key: 'yuan:' + d + ':' + shapes.map(shapeKey).join(',')
    }
  }

  /* ---------------- 变式②：梯形和平行四边形 ---------------- */

  function randQuad() {
    for (var t = 0; t < 300; t++) {
      var Q = [0, 1, 2, 3].map(function () { return [U.randInt(0, BC - 1), U.randInt(0, BR - 1)] })
      if (!convexOk(Q, 30)) continue
      var s = sides(Q)
      var a2 = Math.abs(cross(s[0], s[1]) + cross(s[2], s[3]))
      if (a2 < 6) continue // 面积至少 3 格
      if (s.some(function (v) { return len2(v) < 1 })) continue
      return Q
    }
    return null
  }
  function quadOf(want, d) {
    for (var t = 0; t < 1500; t++) {
      var Q = randQuad()
      if (!Q) return null
      var k = quadKind(Q)
      if (k !== want) continue
      var s = sides(Q)
      if (want === 'ti') {
        var pv = par(s[0], s[2]) ? s[0] : s[1]
        if (d === 'L1' && pv[1] !== 0) continue // 入门：上下两条边横着平行
        var o = par(s[0], s[2]) ? [s[0], s[2]] : [s[1], s[3]]
        if (len2(o[0]) === len2(o[1])) continue
      }
      if (want === 'lx') {
        /* 菱形要一眼看得出：两条对角线一横一竖 */
        var d1 = sub(Q[2], Q[0]), d2 = sub(Q[3], Q[1])
        if (!((d1[0] === 0 && d2[1] === 0) || (d1[1] === 0 && d2[0] === 0))) continue
      }
      if (want === 'zf' || want === 'cf') {
        if (d === 'L1' && !(s[0][0] === 0 || s[0][1] === 0)) continue
      }
      return Q
    }
    return null
  }

  function kindWord(k) {
    return { ti: '只有一组对边平行，是梯形', px: '两组对边都平行，是平行四边形', cf: '两组对边都平行，是长方形，也是平行四边形', zf: '两组对边都平行、四条边一样长，是正方形，也是平行四边形', lx: '两组对边都平行、四条边一样长，是菱形，也是平行四边形', qt: '没有平行的对边，都不是' }[k]
  }

  function genSibian(s) {
    var d = s.difficulty || 'L1'
    var n = d === 'L1' ? 5 : 6
    var kinds = d === 'L1' ? ['ti', 'ti', 'px', 'px', U.pick(['ti', 'px', 'qt'])]
      : d === 'L2' ? ['ti', 'px', U.pick(['cf', 'zf']), 'qt', U.pick(['ti', 'px']), U.pick(['ti', 'px', 'cf', 'qt'])]
        : ['ti', 'px', 'lx', 'zf', U.pick(['ti', 'qt']), U.pick(['ti', 'px', 'cf', 'lx'])]
    kinds = U.shuffled(kinds).slice(0, n)
    var quads = []
    var seen = {}
    for (var i = 0; i < n; i++) {
      var Q = quadOf(kinds[i], d)
      if (!Q || seen[canon(Q)]) return null
      seen[canon(Q)] = 1
      quads.push(Q)
    }
    var by = { ti: [], px: [], lx: [] }
    quads.forEach(function (Q, i) {
      var k = quadKind(Q)
      if (k === 'ti') by.ti.push(i)
      if (PXFAM[k]) by.px.push(i)
      if (k === 'lx' || k === 'zf') by.lx.push(i)
    })
    var fields = d === 'L3' ? ['梯形', '平行四边形', '菱形'] : ['梯形', '平行四边形']
    var ans = '梯形 ' + nums(by.ti) + '；平行四边形 ' + nums(by.px) + (d === 'L3' ? '；菱形 ' + nums(by.lx) : '')
    var stem = '下面钉子板上的四边形中，哪些是梯形、平行四边形' + (d === 'L3' ? '、菱形' : '') + '？把序号填在横线上。'
    var look = quads.map(function (Q, i) { return CIRC[i] + ' ' + kindWord(quadKind(Q)) }).join('；')
    return {
      topic: 'sibian',
      variant: 'sibian',
      stem: stem,
      stemHTML: stem + '<div>' + rowSVG(quads.map(boardItem)) + '</div>',
      answer: ans,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '',
      ansFields: fields,
      solution: [
        { tag: '想一想', text: '找对边平行：顺着钉子看，两条对边方向一样、永远碰不到，就是平行。只有一组平行是梯形，两组都平行是平行四边形。' + (d === 'L3' ? '平行四边形四条边一样长，是菱形。' : '') },
        { tag: '看一看', text: look + '。' },
        { tag: '小心陷阱', text: d === 'L1' ? '梯形上下两条边不一样长；两组对边都平行的才是平行四边形。' : d === 'L2' ? '长方形、正方形两组对边都平行，也要填进平行四边形。' : '正方形四条边一样长，也是菱形；长方形、正方形、菱形都是平行四边形。' },
        { tag: '答', text: ans + '。' }
      ],
      key: 'sb:' + d + ':' + quads.map(function (Q) { return Q.map(function (p) { return p.join('.') }).join('-') }).join(',')
    }
  }

  /* ---------------- 变式③：平移 ---------------- */

  function normalize(P) {
    var mx = Math.min.apply(null, P.map(function (p) { return p[0] })), my = Math.min.apply(null, P.map(function (p) { return p[1] }))
    return P.map(function (p) { return [p[0] - mx, p[1] - my] })
  }
  function ext(P) {
    return [Math.max.apply(null, P.map(function (p) { return p[0] })), Math.max.apply(null, P.map(function (p) { return p[1] }))]
  }
  function rot90(P) { return normalize(P.map(function (p) { return [-p[1], p[0]] })) }
  function rot180(P) { return normalize(P.map(function (p) { return [-p[0], -p[1]] })) }
  function flipX(P) { return normalize(P.map(function (p) { return [-p[0], p[1]] })) }
  /* 平移后能重合 = 顶点集合（去掉位置）一样 */
  function same(P, Q) { return canon(P) === canon(Q) }
  function polyOk(P) {
    if (P.length === 3) {
      var c = cross(sub(P[1], P[0]), sub(P[2], P[0]))
      if (Math.abs(c) < 2) return false
      for (var i = 0; i < 3; i++) {
        var u = sub(P[(i + 1) % 3], P[i]), v = sub(P[(i + 2) % 3], P[i])
        if (Math.atan2(Math.abs(cross(u, v)), dot(u, v)) * 180 / Math.PI < 25) return false
      }
      return true
    }
    return convexOk(P, 30)
  }
  function baseShape() {
    for (var t = 0; t < 300; t++) {
      var k = U.pick([3, 4])
      var P = []
      for (var i = 0; i < k; i++) P.push([U.randInt(0, 3), U.randInt(0, 2)])
      if (k === 4) {
        /* 四边形按绕一圈的顺序排 */
        var cx = P.reduce(function (a, p) { return a + p[0] }, 0) / 4, cy = P.reduce(function (a, p) { return a + p[1] }, 0) / 4
        P.sort(function (a, b) { return Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx) })
      }
      if (!polyOk(P)) continue
      P = normalize(P)
      var e = ext(P)
      if (e[0] < 2 || e[1] < 1) continue
      /* 不对称：转、翻之后都和原来不一样 */
      if (same(P, rot90(P)) || same(P, rot180(P)) || same(P, flipX(P)) || same(P, normalize(P.map(function (p) { return [p[0], -p[1]] })))) continue
      return P
    }
    return null
  }
  /* 动一个顶点（形状变了） */
  function tweak(P) {
    for (var t = 0; t < 40; t++) {
      var i = U.randInt(0, P.length - 1)
      var dv = U.pick([[1, 0], [-1, 0], [0, 1], [0, -1]])
      var Q = P.map(function (p, j) { return j === i ? add(p, dv) : p.slice() })
      if (!polyOk(Q)) continue
      Q = normalize(Q)
      var e = ext(Q)
      if (e[0] > BC - 1 || e[1] > BR - 1) continue
      if (same(Q, P) || same(Q, rot90(P)) || same(Q, rot180(P)) || same(Q, flipX(P))) continue
      return Q
    }
    return null
  }
  function place(P) {
    var e = ext(P)
    if (e[0] > BC - 1 || e[1] > BR - 1) return null
    var dx = U.randInt(0, BC - 1 - e[0]), dy = U.randInt(0, BR - 1 - e[1])
    return P.map(function (p) { return [p[0] + dx, p[1] + dy] })
  }

  function genPingyi(s) {
    var d = s.difficulty || 'L1'
    var n = d === 'L1' ? 5 : 6
    var P = baseShape()
    if (!P) return null
    var others = d === 'L1' ? ['rot90', 'tweak'] : d === 'L2' ? ['rot90', 'flip', 'tweak'] : ['rot90', 'rot180', 'flip', 'tweak']
    var nYes = U.randInt(1, d === 'L1' ? 2 : 3)
    var kinds = []
    for (var i = 0; i < nYes; i++) kinds.push('move')
    while (kinds.length < n - 1) kinds.push(others[(kinds.length - nYes) % others.length])
    kinds = U.shuffled(kinds)
    var items = [{ k: 'base', P: place(P) }]
    for (var j = 0; j < kinds.length; j++) {
      var Q = kinds[j] === 'move' ? P : kinds[j] === 'rot90' ? (U.rand() < 0.5 ? rot90(P) : rot90(rot180(P))) : kinds[j] === 'rot180' ? rot180(P) : kinds[j] === 'flip' ? (U.rand() < 0.5 ? flipX(P) : normalize(P.map(function (p) { return [p[0], -p[1]] }))) : tweak(P)
      if (!Q) return null
      var pl = place(Q)
      if (!pl) return null
      items.push({ k: kinds[j], P: pl })
    }
    /* 平移过去的那几个位置要和 ① 不一样（不然看不出挪过） */
    var pos = {}
    for (var m = 0; m < items.length; m++) {
      var kk = items[m].P.map(function (p) { return p.join('.') }).sort().join('_')
      if (pos[kk]) return null
      pos[kk] = 1
    }
    if (items.some(function (it, i) { return i > 0 && it.k === 'move' && it.P[0][0] === items[0].P[0][0] && it.P[0][1] === items[0].P[0][1] })) return null
    var yes = []
    items.forEach(function (it, i) { if (i > 0 && same(it.P, items[0].P)) yes.push(i) })
    var ans = nums(yes)
    var why = { rot90: '转了方向', rot180: '倒过来了', flip: '翻过来了', tweak: '形状变了' }
    var look = items.map(function (it, i) { return i === 0 ? null : CIRC[i] + (it.k === 'move' ? ' 形状、大小、方向都一样，只是位置变了' : ' ' + why[it.k]) }).filter(Boolean).join('；')
    var stem = '下面的图形中，哪些和 ① 平移后能完全重合？把序号填在横线上。'
    return {
      topic: 'sibian',
      variant: 'pingyi',
      stem: stem,
      stemHTML: stem + '<div>' + rowSVG(items.map(function (it) { return boardItem(it.P) })) + '</div>',
      answer: ans,
      unit: '',
      ansLabel: '答：能重合的是',
      ansSuffix: '。',
      workLabel: '比一比',
      solution: [
        { tag: '想一想', text: '平移只改变位置，不改变形状、大小和方向。拿 ① 一个个比：数一数每条边走几格、朝哪边。' },
        { tag: '比一比', text: look + '。' },
        { tag: '小心陷阱', text: d === 'L1' ? '转了方向的不算平移。' : '转了方向、翻过来的都不算平移，形状一样也不行。' },
        { tag: '答', text: '能重合的是 ' + ans + '。' }
      ],
      key: 'py:' + d + ':' + items.map(function (it) { return it.P.map(function (p) { return p.join('.') }).join('-') }).join(',')
    }
  }

  /* ---------------- 变式④：选点围四边形 ---------------- */

  var DC = 7
  var DR = 5
  var DS = 18
  var DPAD = 16

  function cheb(p, q) { return Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1])) }
  function inB(p) { return p[0] >= 0 && p[0] < DC && p[1] >= 0 && p[1] < DR }

  function huaBoard(A, B, C, D, show) {
    var W = (DC - 1) * DS + DPAD * 2
    var H = (DR - 1) * DS + DPAD * 2
    var P = function (q) { return [DPAD + q[0] * DS, DPAD + q[1] * DS] }
    var p = [dotsHTML(DC, DR, DPAD, DPAD, DS)]
    ;(show || []).forEach(function (sh) {
      p.push(poly([A, B, C, D[sh.i]].map(P), 'ans', sh.dash ? ' stroke-dasharray="' + sh.dash + '" stroke-width="1.6"' : ' stroke-width="1.6"'))
    })
    var a = P(A), b = P(B), c = P(C)
    p.push('<polyline class="abc" points="' + a.join(',') + ' ' + b.join(',') + ' ' + c.join(',') + '" fill="none" stroke="#000" stroke-width="' + SW + '" stroke-linecap="round" stroke-linejoin="round"/>')
    ;[[a, 'A'], [b, 'B'], [c, 'C']].forEach(function (x) {
      p.push('<circle class="pa" cx="' + x[0][0] + '" cy="' + x[0][1] + '" r="3" fill="#000"/>')
    })
    /* 字母放在离另两点远的一侧 */
    var g = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3]
    ;[[a, 'A'], [b, 'B'], [c, 'C']].forEach(function (x) {
      var v = [x[0][0] - g[0], x[0][1] - g[1]], l = Math.hypot(v[0], v[1]) || 1
      p.push(txt(x[0][0] + v[0] / l * 9, x[0][1] + v[1] / l * 9 + 4, x[1], 11, ' font-weight="700" stroke="#fff" stroke-width="3" paint-order="stroke"'))
    })
    D.forEach(function (q, i) {
      var cc = P(q)
      p.push('<circle class="pc" cx="' + cc[0] + '" cy="' + cc[1] + '" r="4.2" fill="#fff" stroke="#000" stroke-width="1.4"/>')
      p.push('<circle cx="' + cc[0] + '" cy="' + cc[1] + '" r="1.3" fill="#000"/>')
      p.push(txt(cc[0] + 8, cc[1] - 5, CIRC[i], 11, ' stroke="#fff" stroke-width="3" paint-order="stroke"'))
    })
    return { W: W, H: H, html: p.join('') }
  }

  function genHuasi(s) {
    for (var t = 0; t < 30; t++) {
      var q = huasiOnce(s)
      if (q) return q
    }
    return null
  }
  function huasiOnce(s) {
    var d = s.difficulty || 'L1'
    var asks = d === 'L1' ? ['px'] : ['ti', 'px']
    var m = d === 'L1' ? 3 : 4
    var B = [U.randInt(1, DC - 2), U.randInt(1, DR - 2)]
    var u, v
    if (d === 'L3') {
      u = U.pick([[2, 1], [1, 2], [-2, 1], [2, -1], [3, 1], [1, -2]])
      v = U.pick([[2, 0], [3, 0], [0, 2], [-2, 0], [1, 1], [-1, 1], [2, -1]])
    } else {
      u = U.pick([[0, -2], [0, -3], [0, 2], [2, 0], [-2, 0], [3, 0]])
      v = U.pick([[2, -2], [1, -2], [2, 2], [3, 0], [0, 2], [-2, -1], [3, 1]])
    }
    if (par(u, v)) return null
    var A = add(B, u), C = add(B, v)
    if (!inB(A) || !inB(C)) return null
    var all = []
    for (var y = 0; y < DR; y++) for (var x = 0; x < DC; x++) {
      var D = [x, y]
      if (cheb(D, A) < 2 || cheb(D, C) < 2 || cheb(D, B) < 2) continue
      var Q = [A, B, C, D]
      if (!convexOk(Q, 25)) continue
      var k = quadKind(Q)
      if (!k) continue
      all.push({ q: D, k: k })
    }
    function isPx(o) { return !!PXFAM[o.k] }
    var cands = asks.map(function (a) { return all.filter(a === 'px' ? isPx : function (o) { return o.k === 'ti' }) })
    if (cands.some(function (c) { return !c.length })) return null
    var others = all.filter(function (o) { return d === 'L1' ? !isPx(o) : o.k === 'qt' })
    var pick = null
    for (var at = 0; at < 40 && !pick; at++) {
      var pk = cands.map(function (c) { return U.pick(c) })
      while (pk.length < m && others.length) pk.push(U.pick(others))
      if (pk.length < m) return null
      var ok = true
      for (var i = 0; i < pk.length; i++) for (var j = i + 1; j < pk.length; j++) if (cheb(pk[i].q, pk[j].q) < 2) ok = false
      if (ok) pick = pk
    }
    if (!pick) return null
    pick = U.shuffled(pick)
    var who = {}
    for (var a = 0; a < asks.length; a++) {
      var hit = []
      pick.forEach(function (o, i) { if (asks[a] === 'px' ? isPx(o) : o.k === 'ti') hit.push(i) })
      if (hit.length !== 1) return null
      who[asks[a]] = hit[0]
    }
    var Ds = pick.map(function (o) { return o.q })
    var NAME = { ti: '梯形', px: '平行四边形' }
    var ans = asks.map(function (k) { return NAME[k] + ' ' + CIRC[who[k]] }).join('；')
    var labels = Ds.map(function (q, i) { return CIRC[i] }).join('')
    var stem = '钉子板上已经连好了 A、B、C 三点。从圈出的点 ' + labels + ' 中选一个，和 A、C 连起来围成四边形：哪个点能围成' + asks.map(function (k) { return NAME[k] }).join('、') + '？'
    var stemB = huaBoard(A, B, C, Ds)
    var dash = { px: null, ti: '5 3' }
    var ansB = huaBoard(A, B, C, Ds, asks.map(function (k) { return { i: who[k], dash: dash[k] } }))
    var noteMap = { px: '实线', ti: '虚线' }
    var conn = pick.map(function (o, i) {
      return CIRC[i] + ' ' + (isPx(o) ? '两组对边都平行' : o.k === 'ti' ? '只有一组对边平行' : '没有平行的对边')
    }).join('；')
    return {
      topic: 'sibian',
      variant: 'huasi',
      stem: stem,
      stemHTML: stem + '<div>' + svgOpen(stemB.W, stemB.H, 'fig-big', 2.4) + stemB.html + '</svg></div>',
      diagramHTML: '<div class="sol-diagram">' + svgOpen(ansB.W, ansB.H, '', 1.4).replace('<svg', '<svg style="max-height:28mm;width:auto"') + ansB.html + '</svg>' +
        '<div class="dot-note">' + asks.map(function (k) { return noteMap[k] + '：' + NAME[k] }).join('；') + '</div></div>',
      answer: ans,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '',
      ansFields: asks.map(function (k) { return NAME[k] }),
      solution: [
        { tag: '想一想', text: '把每个圈出的点和 A、C 连起来，看对边平不平行：平行四边形两组对边都平行，梯形只有一组。' },
        { tag: '连一连', text: conn + '。' },
        { tag: '小心陷阱', text: '平行要顺着钉子数：一条边往右走几格、往上走几格，对边也要走一样的方向。' },
        { tag: '答', text: ans + '。' }
      ],
      key: 'hs:' + d + ':' + [A, B, C].map(function (q) { return q.join('.') }).join('-') + ':' + Ds.map(function (q) { return q.join('.') }).join(',')
    }
  }

  /* ---------------- 讲解页插图 ---------------- */

  function small(w, h, body, k) {
    k = k || 1.3
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w * k + '" height="' + h * k + '">' + body + '</svg>'
  }
  function lab(x, y, s) { return txt(x, y, s, 8) }
  function pl(pts, extra) { return poly(pts, 'fig', extra) }
  function grid(cols, rows, sp, ox, oy) {
    var p = ''
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) p += '<circle cx="' + (ox + x * sp) + '" cy="' + (oy + y * sp) + '" r="1.1"/>'
    return p
  }
  /* 先想一想：茶叶罐的底面是圆 */
  var HOOK_SVG = small(200, 80,
    '<ellipse cx="40" cy="14" rx="26" ry="7" fill="none" stroke="#000" stroke-width="2"/>' +
    '<path d="M14 14 L14 62 A26 7 0 0 0 66 62 L66 14" fill="none" stroke="#000" stroke-width="2"/>' + lab(40, 78, '茶叶罐') +
    '<path d="M80 40 L104 40" stroke="#000" stroke-width="1.5"/><path d="M100 36 L104 40 L100 44" fill="none" stroke="#000" stroke-width="1.5"/>' +
    '<circle cx="132" cy="40" r="22" fill="none" stroke="#000" stroke-width="2.2"/>' + lab(132, 78, '底面是圆') +
    '<ellipse cx="182" cy="40" rx="14" ry="22" fill="none" stroke="#000" stroke-width="2"/>' + lab(182, 78, '?'))
  var YUAN_FIG = small(150, 60,
    '<circle cx="24" cy="26" r="18" fill="none" stroke="#000" stroke-width="2.2"/>' + lab(24, 57, '圆') +
    '<ellipse cx="74" cy="26" rx="24" ry="14" fill="none" stroke="#000" stroke-width="2.2"/>' + lab(74, 57, '椭圆') +
    '<path d="M118 40 L146 40 A28 28 0 0 0 132 15.8 Z" fill="none" stroke="#000" stroke-width="2.2" stroke-linejoin="round"/>' + lab(132, 57, '扇形'))
  var TI_FIG = small(150, 60,
    pl([[6, 44], [46, 44], [36, 18], [16, 18]]) + lab(26, 57, '等腰梯形') +
    pl([[56, 44], [96, 44], [76, 18], [56, 18]]) + lab(76, 57, '直角梯形') +
    pl([[106, 44], [146, 44], [128, 18], [112, 18]]) + lab(126, 57, '一般梯形'))
  var PX_FIG = small(160, 66,
    '<rect x="4" y="4" width="152" height="52" rx="8" fill="none" stroke="#000" stroke-width="1" stroke-dasharray="3 2"/>' + lab(20, 14, '平行四边形') +
    pl([[14, 46], [40, 46], [48, 24], [22, 24]]) +
    '<rect x="58" y="24" width="30" height="22" fill="none" stroke="#000" stroke-width="2.2"/>' + lab(73, 54, '长方形') +
    '<rect x="98" y="24" width="22" height="22" fill="none" stroke="#000" stroke-width="2.2"/>' + lab(109, 54, '正方形') +
    pl([[140, 22], [151, 35], [140, 48], [129, 35]]) + lab(140, 60, '菱形'))
  var PY_FIG = small(150, 60,
    grid(8, 4, 16, 12, 10) +
    pl([[12, 42], [44, 42], [28, 10]]) + pl([[76, 42], [108, 42], [92, 10]], ' stroke-dasharray="4 2"') +
    '<path d="M50 28 L70 28" stroke="#000" stroke-width="1.5"/><path d="M66 24 L70 28 L66 32" fill="none" stroke="#000" stroke-width="1.5"/>' + lab(60, 22, '平移'))
  var ROT_FIG = small(120, 60,
    pl([[10, 46], [46, 46], [10, 16]]) + pl([[70, 16], [100, 16], [100, 52]]) + lab(85, 58, '转了方向') + lab(28, 58, '原来'))
  var MOVE1_FIG = YUAN_FIG
  var MOVE2_FIG = small(150, 64,
    grid(9, 4, 16, 10, 10) +
    pl([[10, 58], [74, 58], [58, 26], [26, 26]]) +
    '<path d="M26 26 L58 26 M10 58 L74 58" stroke="#c00" stroke-width="3"/>' +
    pl([[90, 58], [122, 58], [138, 26], [106, 26]]) + lab(42, 18, '一组平行：梯形') + lab(116, 18, '两组平行'))
  var MOVE3_FIG = PY_FIG

  var SIBIAN = {
    id: 'sibian',
    no: 'B14',
    stage: 'L1B',
    name: '平面图形：认识四边形',
    lesson: {
      v2: true,
      title: '认识四边形 · 方法讲解',
      goal: '认识圆、椭圆、扇形，会找梯形和平行四边形，还会判断哪些图形平移后能重合。',
      sections: [
        {
          kind: 'hook',
          heading: '先想一想',
          paras: [
            '茶叶罐是立体的，可它的底面是一个平平的圆。',
            '把圆压扁一点、切掉一块，又变成什么图形呢？'
          ],
          figHTML: HOOK_SVG
        },
        {
          kind: 'know',
          heading: '先认识',
          cards: [
            { title: '圆、椭圆、扇形', text: '椭圆像圆被压扁了；扇形像圆形披萨切下的一角，两条直边、一条弯边。', figHTML: YUAN_FIG },
            { title: '梯形', text: '只有一组对边平行的四边形（平行 B11 学过）。有一个直角的是直角梯形，两条腰一样长的是等腰梯形。', figHTML: TI_FIG },
            { title: '平行四边形', text: '两组对边分别平行。长方形、正方形、菱形都是平行四边形；四条边一样长是菱形，正方形也是菱形。', figHTML: PX_FIG },
            { title: '平移和旋转', text: '平移只改变位置，形状、大小、方向都不变；转了方向的叫旋转，不是平移。', figHTML: ROT_FIG }
          ]
        },
        {
          kind: 'move',
          name: '和圆比一比',
          tip: '拿圆来比，看是压扁了还是缺了一块。',
          steps: [
            '圆圆的、哪个方向都一样宽，是圆。',
            '像圆被压扁了，一边宽一边窄，是椭圆。',
            '缺了一块，两条直边加一条弯边，是扇形。'
          ],
          pitfall: '缺一小块、剩一大半的也是扇形；有点扁的是椭圆，不是圆。',
          figHTML: MOVE1_FIG,
          variants: ['yuan']
        },
        {
          kind: 'move',
          name: '找对边平行',
          tip: '四边形先找对边：平行的有几组？',
          steps: [
            '顺着钉子看对边：走的方向一样，就是平行。',
            '只有一组对边平行，是梯形。',
            '两组对边都平行，是平行四边形（长方形、正方形、菱形也算）。'
          ],
          pitfall: '长方形、正方形也是平行四边形，别漏填。',
          figHTML: MOVE2_FIG,
          variants: ['sibian', 'huasi']
        },
        {
          kind: 'move',
          name: '平移比方向',
          tip: '平移只挪位置，不转、不翻、不变大。',
          steps: [
            '先看形状、大小一样不一样（每条边走几格）。',
            '再看方向：尖尖的角、长长的边还朝原来那边吗？',
            '都一样，只是位置变了，平移后就能重合。'
          ],
          pitfall: '转了方向、翻过来的，形状再像也不是平移。',
          figHTML: MOVE3_FIG,
          variants: ['pingyi']
        },
        {
          kind: 'pick',
          heading: '用哪一招？',
          rows: [
            ['弯弯的图形，问圆、椭圆、扇形', '和圆比一比', ['yuan']],
            ['四边形，问梯形、平行四边形', '找对边平行', ['sibian', 'huasi']],
            ['问平移后能不能重合', '平移比方向', ['pingyi']]
          ]
        },
        { kind: 'chant', chant: '圆被压扁是椭圆，缺了一块是扇形；一组对边平行是梯形，两组对边平行是平行四边形；长方形、正方形、菱形都是平行四边形；平移只挪位置，不转不翻不变大。' }
      ]
    },
    variants: [
      {
        id: 'yuan',
        setting: 'vSbYuan',
        label: '圆、椭圆、扇形',
        idea: '和圆比：压扁了是椭圆，缺了一块（两条直边、一条弯边）是扇形；转个方向还是一样。',
        gen: genYuan
      },
      {
        id: 'sibian',
        setting: 'vSbSibian',
        label: '梯形和平行四边形',
        idea: '顺着钉子找对边平行：只有一组平行是梯形，两组都平行是平行四边形；长方形、正方形、菱形也是平行四边形。',
        gen: genSibian
      },
      {
        id: 'pingyi',
        setting: 'vSbPingyi',
        label: '平移后能重合吗',
        idea: '平移只改变位置：形状、大小、方向都一样才能平移重合；转了方向、翻过来的都不行。',
        gen: genPingyi
      },
      {
        id: 'huasi',
        setting: 'vSbHuasi',
        label: '选点围四边形',
        def: false,
        idea: '把每个圈出的点和 A、C 连起来，看对边平不平行：两组都平行是平行四边形，只有一组是梯形。',
        gen: genHuasi
      }
    ],
    generate: function (s) {
      return U.generateFrom(SIBIAN.variants, s)
    },
    titleFor: function (s) {
      return '四边形练习 · ' + U.DIFF_LABEL[s.difficulty || 'L1']
    }
  }

  root.SumSum.aoshu.topics.sibian = SIBIAN
  root.SumSum.aoshu.topicList.push(SIBIAN)
})(typeof window !== 'undefined' ? window : globalThis)
