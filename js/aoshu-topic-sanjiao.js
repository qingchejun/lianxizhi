/**
 * 知识点「B13 平面图形：认识三角形」（L1 补充，对照学而思 1 级第 4 讲好方法 3、4 和探索知识巅峰，拆题笔记 docs/xes-1ji/04-有趣的平面图形.md）。
 * 变式：①按边分（标了边长的三角形）②按角分（钉子板上的三角形）③看图判断 ④选点围三角形（def: false）。
 * 图全是黑白内联 SVG。钉子板的钉子是 <circle class="dot">，三角形是 <polygon class="tri">，顶点都落在钉子上；
 * 自检（check-aoshu-gen.js 的 checkSanjiao）不看 key，直接量题干 SVG：每个编号一个 <g class="it">。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util
  var CIRC = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧']
  var SW = 2.2
  var KIND_CN = { rui: '锐角', zhi: '直角', dun: '钝角' }

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
    return '<polygon class="' + (cls || 'tri') + '" points="' + pts.map(function (p) { return f2(p[0]) + ',' + f2(p[1]) }).join(' ') +
      '" fill="none" stroke="#000" stroke-width="' + SW + '" stroke-linejoin="round"' + (extra || '') + '/>'
  }

  /* ---------------- 格点三角形的几何（全用整数算，不会有误差） ---------------- */

  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]] }
  function d2(a, b) { var v = sub(a, b); return v[0] * v[0] + v[1] * v[1] }
  function dot(u, v) { return u[0] * v[0] + u[1] * v[1] }
  function cross(u, v) { return u[0] * v[1] - u[1] * v[0] }
  /* 三个角（度）、每个角的点积 */
  function angles(T) {
    return [0, 1, 2].map(function (i) {
      var u = sub(T[(i + 1) % 3], T[i])
      var v = sub(T[(i + 2) % 3], T[i])
      return { deg: Math.atan2(Math.abs(cross(u, v)), dot(u, v)) * 180 / Math.PI, dot: dot(u, v), u: u, v: v }
    })
  }
  function kindOf(T) {
    var A = angles(T)
    if (A.some(function (a) { return a.dot === 0 })) return 'zhi'
    if (A.some(function (a) { return a.dot < 0 })) return 'dun'
    return 'rui'
  }
  function maxDeg(T) { return Math.max.apply(null, angles(T).map(function (a) { return a.deg })) }
  function minDeg(T) { return Math.min.apply(null, angles(T).map(function (a) { return a.deg })) }
  function axis(v) { return v[0] === 0 || v[1] === 0 }
  function nice(v) { return axis(v) || Math.abs(v[0]) === Math.abs(v[1]) }
  /* 直角的两条边：横竖放（axis）还是斜着 */
  function rightLegs(T) {
    var A = angles(T)
    for (var i = 0; i < 3; i++) if (A[i].dot === 0) return A[i]
    return null
  }
  /* 等腰「看得出来」：顶点两边一样长，底边横、竖或 45° 斜（整个三角形沿横、竖或斜线对称） */
  function isoSeen(T) {
    for (var i = 0; i < 3; i++) {
      var P = T[i], Q = T[(i + 1) % 3], R = T[(i + 2) % 3]
      if (d2(P, Q) === d2(P, R) && nice(sub(R, Q))) return true
    }
    return false
  }
  function anyEqual(T) {
    var a = d2(T[0], T[1]), b = d2(T[1], T[2]), c = d2(T[2], T[0])
    return a === b || b === c || c === a
  }
  /* 三条边长短都差 15% 以上（不会看着像等腰） */
  function clearlyScalene(T) {
    var L = [d2(T[0], T[1]), d2(T[1], T[2]), d2(T[2], T[0])].map(Math.sqrt).sort(function (a, b) { return a - b })
    return L[1] / L[0] >= 1.15 && L[2] / L[1] >= 1.15
  }
  /* 角的类型看得清：锐角三角形最大角 ≤ ruiMax，钝角 ≥ dunMin */
  function clearKind(T, ruiMax, dunMin) {
    var k = kindOf(T)
    var m = maxDeg(T)
    if (k === 'rui') return m <= ruiMax
    if (k === 'dun') return m >= dunMin
    return true
  }
  function canon(T) {
    return T.map(function (p) { return p[0] + '.' + p[1] }).sort().join('_')
  }

  /* ---------------- 钉子板 ---------------- */

  var SP = 13 // 一格 13，卷子上约 5mm
  var BC = 5 // 每个小钉子板 5 列 × 4 行
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
  /* 一格：钉子板 + 三角形（格点坐标 T，y 向下） */
  function boardItem(T, extra) {
    var ox = (CW - (BC - 1) * SP) / 2
    var oy = (CH - (BR - 1) * SP) / 2
    var pts = T.map(function (q) { return [ox + q[0] * SP, oy + q[1] * SP] })
    return dotsHTML(BC, BR, ox, oy, SP) + poly(pts) + (extra || '')
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

  /* 随机一个格点三角形：三个点在 BC×BR 的钉子上，不太扁、不太小 */
  function randTri() {
    for (var t = 0; t < 400; t++) {
      var T = [0, 1, 2].map(function () { return [U.randInt(0, BC - 1), U.randInt(0, BR - 1)] })
      var c2 = cross(sub(T[1], T[0]), sub(T[2], T[0]))
      if (Math.abs(c2) < 3) continue // 面积至少 1.5 格
      if (minDeg(T) < 20) continue
      return T
    }
    return null
  }

  /* 按要求抽一个格点三角形 */
  function triOf(want, d, iso) {
    var ruiMax = d === 'L1' ? 70 : 72
    var dunMin = d === 'L1' ? 125 : 115
    for (var t = 0; t < 600; t++) {
      var T = randTri()
      if (!T) return null
      if (kindOf(T) !== want) continue
      if (!clearKind(T, ruiMax, dunMin)) continue
      if (want === 'zhi') {
        var R = rightLegs(T)
        if (d !== 'L3' && !(axis(R.u) && axis(R.v))) continue
      }
      if (iso === true && !isoSeen(T)) continue
      if (iso === false && (anyEqual(T) || !clearlyScalene(T))) continue
      if (iso === undefined && anyEqual(T) && !isoSeen(T)) continue
      return T
    }
    return null
  }

  /* ---------------- 变式①：按边分（标了边长） ---------------- */

  function typeOfLens(L) {
    if (L[0] === L[1] && L[1] === L[2]) return 'deng'
    if (L[0] === L[1] || L[1] === L[2] || L[0] === L[2]) return 'yao'
    return 'bu'
  }
  /* 三条边能围成、最小角不太尖 */
  function lensOk(L) {
    var s = L.slice().sort(function (a, b) { return a - b })
    if (s[0] + s[1] <= s[2]) return false
    for (var i = 0; i < 3; i++) {
      var a = L[i], b = L[(i + 1) % 3], c = L[(i + 2) % 3]
      var cos = (b * b + c * c - a * a) / (2 * b * c)
      if (Math.acos(cos) * 180 / Math.PI < 22) return false
    }
    return true
  }
  function lensFor(type, d) {
    var lo = d === 'L1' ? 2 : 3
    var hi = d === 'L1' ? 8 : 9
    for (var t = 0; t < 200; t++) {
      var L
      if (type === 'deng') { var e = U.randInt(lo, hi); L = [e, e, e] } else if (type === 'yao') {
        var a = U.randInt(lo, hi), b = U.randInt(lo, hi)
        if (a === b) continue
        L = [a, a, b]
      } else {
        L = [U.randInt(lo, hi), U.randInt(lo, hi), U.randInt(lo, hi)]
        if (typeOfLens(L) !== 'bu') continue
      }
      if (!lensOk(L)) continue
      return U.shuffled(L)
    }
    return null
  }
  /* 挑战档：边长挨得近，画出来差不多，只能看数 */
  function lensNear(n) {
    return U.shuffled([
      [n, n, n], [n, n, n + 1], [n, n + 1, n + 1], [n - 1, n, n + 1], [n, n + 1, n + 2], [n + 1, n + 1, n + 1],
      [n - 1, n - 1, n], [n, n, n + 2], [n + 1, n, n + 2]
    ]).map(function (L) { return U.shuffled(L) })
  }

  /* 按边长画：AB=c 在下面，C 在上面；整体转 rot 度；数字放在边外侧 */
  function sideItem(L, rot) {
    var a = L[0], b = L[1], c = L[2] // a = BC, b = CA, c = AB
    var x = (b * b + c * c - a * a) / (2 * c)
    var y = -Math.sqrt(Math.max(0, b * b - x * x))
    var P = [[0, 0], [c, 0], [x, y]]
    var r = rot * Math.PI / 180
    P = P.map(function (p) { return [p[0] * Math.cos(r) - p[1] * Math.sin(r), p[0] * Math.sin(r) + p[1] * Math.cos(r)] })
    var cx = (P[0][0] + P[1][0] + P[2][0]) / 3
    var cy = (P[0][1] + P[1][1] + P[2][1]) / 3
    /* 边 i：P[i]→P[i+1]，长度依次 c、a、b */
    var lens = [c, a, b]
    var maxL = Math.max(a, b, c)
    var k = 46 / maxL
    var Q = P.map(function (p) { return [(p[0] - cx) * k, (p[1] - cy) * k] })
    var labs = [0, 1, 2].map(function (i) {
      var p = Q[i], q = Q[(i + 1) % 3]
      var mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2
      var nx = q[1] - p[1], ny = -(q[0] - p[0])
      var nl = Math.hypot(nx, ny)
      nx /= nl; ny /= nl
      if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny } // 朝外
      var off = lens[i] >= 10 ? 10 : 8
      return { x: mx + nx * off, y: my + ny * off, s: lens[i] }
    })
    var all = Q.concat(labs.map(function (l) { return [l.x, l.y] }))
    var xs = all.map(function (p) { return p[0] }), ys = all.map(function (p) { return p[1] })
    var w = Math.max.apply(null, xs) - Math.min.apply(null, xs) + 10
    var h = Math.max.apply(null, ys) - Math.min.apply(null, ys) + 10
    var f = Math.min(1, (CW - 4) / w, (CH - 2) / h)
    var dx = CW / 2 - (Math.max.apply(null, xs) + Math.min.apply(null, xs)) / 2 * f
    var dy = CH / 2 - (Math.max.apply(null, ys) + Math.min.apply(null, ys)) / 2 * f
    var pts = Q.map(function (p) { return [p[0] * f + dx, p[1] * f + dy] })
    return poly(pts) + labs.map(function (l) {
      return txt(l.x * f + dx, l.y * f + dy + 4, String(l.s), 11, ' class="len"')
    }).join('')
  }

  function genBian(s) {
    var d = s.difficulty || 'L1'
    var n = d === 'L1' ? 4 : d === 'L2' ? 5 : 6
    var types
    var lensList = []
    if (d === 'L3') {
      var pool = lensNear(U.randInt(5, 8)).filter(lensOk)
      if (pool.length < n) return null
      lensList = pool.slice(0, n)
    } else {
      var base = d === 'L1' ? ['yao', 'bu'] : ['deng', 'yao', 'bu']
      types = base.slice()
      while (types.length < n) types.push(U.pick(d === 'L1' ? ['yao', 'bu'] : ['yao', 'yao', 'bu', 'deng']))
      types = U.shuffled(types)
      for (var i = 0; i < n; i++) {
        var L = lensFor(types[i], d)
        if (!L) return null
        lensList.push(L)
      }
    }
    var c = { bu: [], yao: [], deng: [] }
    lensList.forEach(function (L, i) { c[typeOfLens(L)].push(i) })
    if (!c.bu.length || !c.yao.length) return null
    if (d !== 'L1' && !c.deng.length) return null
    if (c.deng.length > 2) return null
    var seen = {}
    for (var j = 0; j < lensList.length; j++) {
      var kk = lensList[j].slice().sort().join('.')
      if (seen[kk]) return null
      seen[kk] = 1
    }
    var rots = [0, 0, 0, 180, 15, -15, 30, -30]
    var html = lensList.map(function (L) { return sideItem(L, U.pick(rots)) })
    var yao = c.yao.concat(c.deng).sort()
    var fields, ans, stem
    if (d === 'L1') {
      fields = ['等腰']
      ans = '等腰 ' + nums(yao)
      stem = '三角形边上的数是边的长度。下面的三角形中，哪些是等腰三角形？把序号填在横线上。'
    } else if (d === 'L2') {
      fields = ['等腰', '等边']
      ans = '等腰 ' + nums(yao) + '；等边 ' + nums(c.deng)
      stem = '三角形边上的数是边的长度。下面的三角形中，哪些是等腰三角形、等边三角形？把序号填在横线上。'
    } else {
      fields = ['不等边', '等腰', '等边']
      ans = '不等边 ' + nums(c.bu) + '；等腰 ' + nums(yao) + '；等边 ' + nums(c.deng)
      stem = '三角形边上的数是边的长度。下面的三角形中，哪些是不等边三角形、等腰三角形、等边三角形？把序号填在横线上。'
    }
    var look = lensList.map(function (L, i) {
      var t = typeOfLens(L)
      return CIRC[i] + ' ' + L.join('、') + (t === 'deng' ? ' 三条都一样' : t === 'yao' ? ' 两条一样' : ' 都不一样')
    }).join('；')
    return {
      topic: 'sanjiao',
      variant: 'bian',
      stem: stem,
      stemHTML: stem + '<div>' + rowSVG(html) + '</div>',
      answer: ans,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '',
      ansFields: fields,
      solution: [
        { tag: '想一想', text: '看每个三角形的三个数：两个数一样是等腰三角形，三个数都一样是等边三角形。' },
        { tag: '比一比', text: look + '。' },
        { tag: '小心陷阱', text: d === 'L1' ? '只看数，别看画得像不像。' : d === 'L2' ? '等边三角形三条边都相等，当然也有两条边相等，所以也要填进等腰。' : '这几个三角形画出来差不多，只能看数；等边三角形也要填进等腰。' },
        { tag: '答', text: ans + '。' }
      ],
      key: 'bian:' + d + ':' + lensList.map(function (L) { return L.join('.') }).join(',')
    }
  }

  /* ---------------- 变式②：按角分（钉子板） ---------------- */

  function bigAngleText(T) {
    var k = kindOf(T)
    return k === 'zhi' ? '最大的角是直角' : k === 'dun' ? '最大的角比直角大' : '最大的角也比直角小'
  }

  function genJiao(s) {
    var d = s.difficulty || 'L1'
    var n = d === 'L1' ? 5 : 6
    var kinds = ['rui', 'zhi', 'dun']
    while (kinds.length < n) kinds.push(U.pick(['rui', 'zhi', 'dun']))
    var cnt = { rui: 0, zhi: 0, dun: 0 }
    kinds.forEach(function (k) { cnt[k]++ })
    if (cnt.rui > 3 || cnt.zhi > 3 || cnt.dun > 3) return null
    kinds = U.shuffled(kinds)
    var tris = []
    var seen = {}
    for (var i = 0; i < n; i++) {
      var T = triOf(kinds[i], d)
      if (!T || seen[canon(T)]) return null
      seen[canon(T)] = 1
      tris.push(T)
    }
    if (d === 'L3' && !tris.some(function (T) { var R = rightLegs(T); return R && !axis(R.u) })) return null
    var by = { rui: [], zhi: [], dun: [] }
    tris.forEach(function (T, i) { by[kindOf(T)].push(i) })
    var ans = '锐角 ' + nums(by.rui) + '；直角 ' + nums(by.zhi) + '；钝角 ' + nums(by.dun)
    var stem = '下面钉子板上的三角形中，哪些是锐角三角形、直角三角形、钝角三角形？把序号填在横线上。'
    return {
      topic: 'sanjiao',
      variant: 'jiao',
      stem: stem,
      stemHTML: stem + '<div>' + rowSVG(tris.map(function (T) { return boardItem(T) })) + '</div>',
      answer: ans,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '',
      ansFields: ['锐角', '直角', '钝角'],
      solution: [
        { tag: '想一想', text: '每个三角形都有锐角，所以先找最大的那个角，拿本子角（直角）比一比。' },
        { tag: '比一比', text: tris.map(function (T, i) { return CIRC[i] + ' ' + bigAngleText(T) }).join('；') + '。' },
        { tag: '小心陷阱', text: d === 'L3' ? '斜着放的直角也是直角：两条边顺着斜的钉子走，拿本子角斜过来比。' : '有一个锐角不算数，三个角都是锐角才是锐角三角形。' },
        { tag: '答', text: ans + '。' }
      ],
      key: 'jiao:' + d + ':' + tris.map(canon).join(',')
    }
  }

  /* ---------------- 变式③：看图判断 ---------------- */

  function sayTri(T, i, edge) {
    var k = KIND_CN[kindOf(T)]
    if (!edge) return CIRC[i] + ' ' + bigAngleText(T) + '，是' + k + '三角形'
    var iso = isoSeen(T)
    return CIRC[i] + (iso ? ' 两条边一样长' : ' 三条边不一样长') + '，' + bigAngleText(T) + '，' + (iso ? '是等腰、' : '不是等腰，是') + k + '三角形'
  }

  function genPan(s) {
    var d = s.difficulty || 'L1'
    var n = d === 'L1' ? 3 : d === 'L2' ? 4 : 5
    var types = d === 'L1' ? ['iso', 'kind', U.pick(['iso', 'kind'])]
      : d === 'L2' ? ['iso', 'kind', 'onerui', U.pick(['iso', 'kind'])]
        : ['iso', 'kind', 'onerui', 'both', U.pick(['both', 'twoeq'])]
    types = U.shuffled(types)
    var items = []
    var seen = {}
    for (var i = 0; i < n; i++) {
      var ty = types[i]
      var k, iso, T, text, truth
      if (ty === 'onerui') {
        k = U.pick(['zhi', 'dun'])
      } else if (ty === 'twoeq') {
        k = U.pick(['rui', 'dun'])
        iso = true
      } else {
        k = U.pick(['rui', 'zhi', 'dun'])
        if (ty !== 'kind') iso = ty === 'both' ? U.rand() < 0.7 : U.rand() < 0.5
      }
      /* 锐角三角形在小钉子板上围不出「一眼看出三条边都不一样长」的，问到边的锐角三角形一律等腰 */
      if (iso === false && k === 'rui') iso = true
      T = triOf(k, d, iso)
      if (!T || seen[canon(T)]) return null
      seen[canon(T)] = 1
      var n0 = CIRC[i]
      if (ty === 'iso') {
        text = n0 + '是等腰三角形。'
        truth = iso
      } else if (ty === 'kind') {
        var sk = U.rand() < 0.5 ? k : U.pick(['rui', 'zhi', 'dun'].filter(function (x) { return x !== k }))
        text = n0 + '是' + KIND_CN[sk] + '三角形。'
        truth = sk === k
      } else if (ty === 'onerui') {
        text = n0 + '有一个锐角，所以它是锐角三角形。'
        truth = false
      } else if (ty === 'both') {
        var bk = U.rand() < 0.6 ? k : U.pick(['rui', 'zhi', 'dun'].filter(function (x) { return x !== k }))
        text = n0 + '既是等腰三角形，又是' + KIND_CN[bk] + '三角形。'
        truth = iso && bk === k
      } else {
        text = n0 + '有两条边相等，所以它是等腰直角三角形。'
        truth = false
      }
      items.push({ T: T, text: text, truth: truth, ty: ty, edge: iso !== undefined })
    }
    var yes = []
    items.forEach(function (it, i) { if (it.truth) yes.push(i) })
    if (yes.length < (n >= 4 ? 2 : 1) || yes.length === n) return null
    var ans = nums(yes)
    var stem = '看图想一想，下面哪几句话说对了？把说对了的序号填在横线上。'
    var lines = items.map(function (it) { return it.text })
    var why = items.map(function (it, i) {
      return sayTri(it.T, i, it.edge) + '，' + (it.truth ? '对' : '错') + '。'
    })
    return {
      topic: 'sanjiao',
      variant: 'pan',
      stem: stem + lines.join(' '),
      stemHTML: stem + '<div>' + rowSVG(items.map(function (it) { return boardItem(it.T) })) + '</div>' +
        '<div class="sj-says">' + lines.map(function (l) { return '<div>' + l + '</div>' }).join('') + '</div>',
      answer: ans,
      unit: '',
      ansLabel: '答：说对了的是',
      ansSuffix: '。',
      workLabel: '看一看',
      solution: [
        { tag: '想一想', text: '每个三角形先看边（有没有两条一样长），再看最大的角，最后对照这句话。' },
        { tag: '看一看', text: why.join('') },
        { tag: '小心陷阱', text: d === 'L1' ? '等腰看边，锐角、直角、钝角看角，别弄混。' : d === 'L2' ? '每个三角形都有锐角，「有一个锐角」说明不了是锐角三角形。' : '「有一个锐角」说明不了是锐角三角形；两条边相等还要有直角，才是等腰直角三角形；「既……又……」两样都对才对。' },
        { tag: '答', text: '说对了的是 ' + ans + '。' }
      ],
      key: 'pan:' + d + ':' + items.map(function (it) { return canon(it.T) + '~' + it.text.slice(1) }).join(',')
    }
  }

  /* ---------------- 变式④：选点围三角形 ---------------- */

  var DC = 7 // 大钉子板 7 列 × 5 行
  var DR = 5
  var DS = 18
  var DPAD = 16 // 上、右留白：圈出的点的编号写在点的右上方，贴边会被裁

  function cheb(p, q) { return Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1])) }

  function dianBoard(A, B, C, show) {
    var W = (DC - 1) * DS + DPAD * 2
    var H = (DR - 1) * DS + DPAD * 2
    var P = function (q) { return [DPAD + q[0] * DS, DPAD + q[1] * DS] }
    var p = [dotsHTML(DC, DR, DPAD, DPAD, DS)]
    ;(show || []).forEach(function (sh) {
      p.push(poly([A, B, C[sh.i]].map(P), 'ans', sh.dash ? ' stroke-dasharray="' + sh.dash + '" stroke-width="1.6"' : ' stroke-width="1.6"'))
    })
    var a = P(A), b = P(B)
    p.push('<line class="ab" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="#000" stroke-width="' + SW + '" stroke-linecap="round"/>')
    p.push('<circle class="pa" cx="' + a[0] + '" cy="' + a[1] + '" r="3" fill="#000"/>')
    p.push('<circle class="pa" cx="' + b[0] + '" cy="' + b[1] + '" r="3" fill="#000"/>')
    /* A、B 字母放在线的外侧 */
    var hor = A[1] === B[1]
    var lA = hor ? [a[0] + (A[0] < B[0] ? -8 : 8), a[1] + 4] : [a[0] - 8, a[1] + (A[1] < B[1] ? -2 : 10)]
    var lB = hor ? [b[0] + (B[0] < A[0] ? -8 : 8), b[1] + 4] : [b[0] - 8, b[1] + (B[1] < A[1] ? -2 : 10)]
    p.push(txt(lA[0], lA[1], 'A', 11, ' font-weight="700" stroke="#fff" stroke-width="3" paint-order="stroke"'))
    p.push(txt(lB[0], lB[1], 'B', 11, ' font-weight="700" stroke="#fff" stroke-width="3" paint-order="stroke"'))
    C.forEach(function (q, i) {
      var c = P(q)
      p.push('<circle class="pc" cx="' + c[0] + '" cy="' + c[1] + '" r="4.2" fill="#fff" stroke="#000" stroke-width="1.4"/>')
      p.push('<circle cx="' + c[0] + '" cy="' + c[1] + '" r="1.3" fill="#000"/>')
      p.push(txt(c[0] + 8, c[1] - 5, CIRC[i], 11, ' stroke="#fff" stroke-width="3" paint-order="stroke"'))
    })
    return { W: W, H: H, html: p.join('') }
  }

  function genDian(s) {
    var d = s.difficulty || 'L1'
    var asks = d === 'L1' ? ['zhi'] : d === 'L2' ? ['zhi', 'dun'] : ['zhi', 'dun', 'iso']
    var m = d === 'L2' ? 4 : 3 // 挑战档三个点正好对应三问（锐角又不等腰的点在小钉子板上围不出来，见 clearlyScalene）
    /* A、B：横着或竖着，长 2～4 格 */
    var hor = U.rand() < 0.65
    var len = U.randInt(2, hor ? 4 : 3)
    var A, B
    if (hor) { var ax = U.randInt(0, DC - 1 - len), ay = U.randInt(1, DR - 2); A = [ax, ay]; B = [ax + len, ay] } else { var bx = U.randInt(1, DC - 2), by0 = U.randInt(0, DR - 1 - len); A = [bx, by0]; B = [bx, by0 + len] }
    if (U.rand() < 0.5) { var tmp = A; A = B; B = tmp }
    var all = []
    for (var y = 0; y < DR; y++) for (var x = 0; x < DC; x++) {
      var q = [x, y]
      if (cross(sub(B, A), sub(q, A)) === 0) continue // 在 AB 那条线上
      if (cheb(q, A) < 2 || cheb(q, B) < 2) continue
      var T = [A, B, q]
      if (minDeg(T) < 18) continue
      all.push(q)
    }
    function info(q) {
      var T = [A, B, q]
      var k = kindOf(T)
      return { q: q, k: k, m: maxDeg(T), iso: isoSeen(T), eq: anyEqual(T), sc: clearlyScalene(T), atC: false }
    }
    /* 直角在 C 上：两条边一条连 A 一条连 B。这里重算一下 */
    function rightAtC(q) { return dot(sub(A, q), sub(B, q)) === 0 }
    var infos = all.map(info)
    infos.forEach(function (o) { o.atC = o.k === 'zhi' && rightAtC(o.q) })
    function okZhi(o) { return o.k === 'zhi' && (d === 'L3' || !o.atC) && (d !== 'L3' || !o.eq) && (d !== 'L3' || o.sc) }
    function okDun(o) { return o.k === 'dun' && o.m >= (d === 'L1' ? 125 : 115) && (d !== 'L3' || (!o.eq && o.sc)) }
    function okRui(o) { return o.k === 'rui' && o.m <= (d === 'L1' ? 70 : 72) }
    function okIso(o) { return okRui(o) && o.iso }
    function okOther(o) { return okRui(o) && (d !== 'L3' || (!o.eq && o.sc)) }
    var cands = asks.map(function (k) { return k === 'zhi' ? infos.filter(okZhi) : k === 'dun' ? infos.filter(okDun) : infos.filter(okIso) })
    if (cands.some(function (c) { return !c.length })) return null
    var others = infos.filter(d === 'L1' ? function (o) { return okRui(o) || okDun(o) } : okOther)
    var pick = null
    for (var at = 0; at < 40 && !pick; at++) {
      var pk = cands.map(function (c) { return U.pick(c) })
      while (pk.length < m && others.length) pk.push(U.pick(others))
      if (pk.length < m) return null
      var spread = true
      for (var i = 0; i < pk.length; i++) for (var j = i + 1; j < pk.length; j++) if (cheb(pk[i].q, pk[j].q) < 2) spread = false
      if (spread) pick = pk
    }
    if (!pick) return null
    pick = U.shuffled(pick)
    /* 每一问恰好一个点 */
    var who = {}
    var tests = { zhi: function (o) { return o.k === 'zhi' }, dun: function (o) { return o.k === 'dun' }, iso: function (o) { return o.eq } }
    for (var a = 0; a < asks.length; a++) {
      var hit = []
      pick.forEach(function (o, i) { if (tests[asks[a]](o)) hit.push(i) })
      if (hit.length !== 1) return null
      who[asks[a]] = hit[0]
    }
    var C = pick.map(function (o) { return o.q })
    var NAME = { zhi: '直角', dun: '钝角', iso: '等腰' }
    var ans = asks.map(function (k) { return NAME[k] + ' ' + CIRC[who[k]] }).join('；')
    var labels = C.map(function (q, i) { return CIRC[i] }).join('')
    var askText = asks.map(function (k) { return NAME[k] + '三角形' }).join('、')
    var stem = '钉子板上已经连好了 A、B 两点。从圈出的点 ' + labels + ' 中选一个，和 A、B 连成三角形：哪个点能连成' + askText + '？'
    var stemB = dianBoard(A, B, C)
    var dash = { zhi: null, dun: '5 3', iso: '1.5 2.5' }
    var ansB = dianBoard(A, B, C, asks.map(function (k) { return { i: who[k], dash: dash[k] } }))
    var noteMap = { zhi: '实线', dun: '虚线', iso: '点线' }
    var sol = [{ tag: '想一想', text: '把每个圈出的点和 A、B 连起来，看最大的角；问等腰的，看两条边是不是一样长（对折能重合）。' }]
    sol.push({
      tag: '连一连',
      text: pick.map(function (o, i) {
        return CIRC[i] + ' 连出来' + (o.k === 'zhi' ? '有一个直角' + (o.atC ? '（直角就在' + CIRC[i] + '上）' : '') : o.k === 'dun' ? '有一个钝角' : '三个角都是锐角') + (d === 'L3' && o.eq ? '，两条边一样长' : '')
      }).join('；') + '。'
    })
    sol.push({ tag: '小心陷阱', text: d === 'L3' ? '直角不一定在 A、B 上，也可能在圈出的点上：拿本子角对着那个点比一比。' : '要连好两条线再判断，别只看点离得远近。' })
    sol.push({ tag: '答', text: ans + '。' })
    return {
      topic: 'sanjiao',
      variant: 'dian',
      stem: stem,
      stemHTML: stem + '<div>' + svgOpen(stemB.W, stemB.H, 'fig-big fig-mid', 2.4) + stemB.html + '</svg></div>',
      diagramHTML: '<div class="sol-diagram">' + svgOpen(ansB.W, ansB.H, '', 1.4).replace('<svg', '<svg style="max-height:28mm;width:auto"') + ansB.html + '</svg>' +
        '<div class="dot-note">' + asks.map(function (k) { return noteMap[k] + '：' + NAME[k] + '三角形' }).join('；') + '</div></div>',
      answer: ans,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '',
      ansFields: asks.map(function (k) { return NAME[k] }),
      solution: sol,
      key: 'dian:' + d + ':' + A.join('.') + '-' + B.join('.') + ':' + C.map(function (q) { return q.join('.') }).join(',')
    }
  }

  /* ---------------- 讲解页插图 ---------------- */

  function small(w, h, body, k) {
    k = k || 1.3
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w * k + '" height="' + h * k + '">' + body + '</svg>'
  }
  function stick(p, q) {
    return '<line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + q[0] + '" y2="' + q[1] + '" stroke="#000" stroke-width="3.6" stroke-linecap="round"/>'
  }
  function tri(pts, extra) { return poly(pts, 'fig', extra) }
  function lab(x, y, s) { return txt(x, y, s, 8) }
  function mark(V, P, Q, k) {
    k = k || 6
    var u = sub(P, V), v = sub(Q, V)
    var lu = Math.hypot(u[0], u[1]), lv = Math.hypot(v[0], v[1])
    u = [u[0] / lu * k, u[1] / lu * k]
    v = [v[0] / lv * k, v[1] / lv * k]
    var pts = [[V[0] + u[0], V[1] + u[1]], [V[0] + u[0] + v[0], V[1] + u[1] + v[1]], [V[0] + v[0], V[1] + v[1]]]
    return '<polyline points="' + pts.map(function (q) { return f2(q[0]) + ',' + f2(q[1]) }).join(' ') + '" fill="none" stroke="#000" stroke-width="1.2"/>'
  }

  /* 先想一想：三根小棒围三角形 */
  var HOOK_SVG = small(210, 76,
    stick([10, 60], [60, 60]) + stick([10, 60], [35, 17]) + stick([60, 60], [35, 17]) + txt(35, 74, '三根一样长', 8) +
    stick([80, 60], [124, 60]) + stick([80, 60], [102, 10]) + stick([124, 60], [102, 10]) + txt(102, 74, '两根一样长', 8) +
    stick([146, 60], [202, 60]) + stick([146, 60], [168, 22]) + stick([202, 60], [168, 22]) + txt(174, 74, '三根都不一样', 8))
  var TRI_FIG = small(120, 64,
    tri([[20, 54], [100, 54], [44, 10]]) + '<circle cx="20" cy="54" r="2.4"/><circle cx="100" cy="54" r="2.4"/><circle cx="44" cy="10" r="2.4"/>' +
    lab(12, 62, '顶点') + lab(60, 63, '边') + '<path d="M 30 54 A 10 10 0 0 0 26 45" fill="none" stroke="#000" stroke-width="1.1"/>' + lab(36, 48, '角'), 1.05)

  var BIAN_FIG = small(150, 62,
    tri([[6, 50], [44, 50], [16, 14]]) + lab(25, 59, '3') + lab(36, 30, '5') + lab(6, 30, '4') + lab(25, 8, '不等边') +
    tri([[56, 50], [92, 50], [74, 12]]) + lab(74, 59, '3') + lab(60, 30, '5') + lab(88, 30, '5') + lab(74, 7, '等腰') +
    tri([[104, 50], [144, 50], [124, 15.4]]) + lab(124, 59, '4') + lab(108, 30, '4') + lab(140, 30, '4') + lab(124, 9, '等边'), 1.05)

  var JIAO_FIG = small(150, 62,
    tri([[6, 50], [44, 50], [22, 14]]) + lab(25, 60, '锐角三角形') +
    tri([[58, 50], [94, 50], [58, 12]]) + mark([58, 50], [94, 50], [58, 12]) + lab(76, 60, '直角三角形') +
    tri([[104, 50], [146, 50], [114, 30]]) + lab(125, 60, '钝角三角形'), 1.05)

  var TWO_FIG = small(120, 62,
    stick([20, 52], [100, 52]) + '<line x1="30" y1="52" x2="30" y2="6" stroke="#000" stroke-width="2.2"/><line x1="90" y1="52" x2="90" y2="6" stroke="#000" stroke-width="2.2"/>' +
    mark([30, 52], [100, 52], [30, 6]) + mark([90, 52], [20, 52], [90, 6]) + lab(60, 20, '碰不到'), 1.05)

  var MOVE1_FIG = small(160, 62,
    tri([[10, 50], [42, 50], [26, 22]]) + lab(26, 59, '6') + lab(11, 36, '6') + lab(42, 36, '6') + lab(26, 12, '等边也是等腰') +
    tri([[62, 50], [96, 50], [79, 16]]) + lab(79, 59, '6') + lab(63, 33, '7') + lab(96, 33, '7') + lab(79, 9, '等腰') +
    tri([[118, 50], [150, 50], [126, 18]]) + lab(134, 59, '5') + lab(116, 33, '6') + lab(146, 33, '7') + lab(134, 10, '不等边'), 1.1)

  var MOVE2_FIG = small(150, 62,
    tri([[10, 46], [140, 46], [40, 22]]) + '<path d="M 33 27.6 A 9 9 0 0 0 48.75 24.1" fill="none" stroke="#000" stroke-width="1.2"/>' +
    lab(40, 16, '最大的角') + lab(76, 58, '最大的角比直角大 → 钝角三角形'), 1.1)

  var MOVE3_FIG = (function () {
    var p = []
    for (var y = 0; y < 4; y++) for (var x = 0; x < 6; x++) p.push('<circle cx="' + (12 + x * 18) + '" cy="' + (10 + y * 18) + '" r="1.2"/>')
    p.push(tri([[12, 64], [84, 64], [48, 28]]))
    p.push(mark([48, 28], [12, 64], [84, 64], 7))
    p.push(lab(140, 30, '两条边一样长'))
    p.push(lab(140, 42, '还有一个直角'))
    p.push(lab(140, 54, '→ 等腰直角'))
    return small(170, 74, p.join(''), 1.1)
  })()

  var SANJIAO = {
    id: 'sanjiao',
    no: 'B13',
    stage: 'L1B',
    name: '平面图形：认识三角形',
    lesson: {
      v2: true,
      title: '认识三角形 · 方法讲解',
      goal: '认识三角形，会按边分（等腰、等边），会按角分（锐角、直角、钝角三角形），还会在钉子板上找点连三角形。',
      sections: [
        {
          kind: 'hook',
          heading: '先想一想',
          paras: [
            '拿三根小棒头尾相接，就能围成一个三角形。',
            '三根一样长、两根一样长、三根都不一样长，围出来的三角形有什么不一样？'
          ],
          figHTML: HOOK_SVG
        },
        {
          kind: 'know',
          heading: '先认识',
          cards: [
            { title: '三角形', text: '三条边、三个角、三个顶点。在钉子板上画三角形，顶点要在钉子上。', figHTML: TRI_FIG },
            { title: '按边分', text: '三条边都不相等是不等边三角形，两条边相等是等腰三角形，三条边都相等是等边三角形。等边三角形也是等腰三角形。等腰三角形对折，两条一样长的边能重合。', figHTML: BIAN_FIG },
            { title: '按角分', text: '锐角、直角、钝角 B12 学过。三个角都是锐角是锐角三角形，有一个直角是直角三角形，有一个钝角是钝角三角形。', figHTML: JIAO_FIG },
            { title: '最多一个直角', text: '有两个直角的话，两条边都竖着、平行（B11 学过），碰不到，围不起来。钝角也最多一个。', figHTML: TWO_FIG }
          ]
        },
        {
          kind: 'move',
          name: '数一样长的边',
          tip: '按边分，只看边上的数。',
          steps: [
            '把三条边的数读一遍。',
            '两个数一样是等腰，三个数都一样是等边。',
            '等边三角形也要算进等腰三角形。'
          ],
          pitfall: '看数，不看画得像不像：6、6、7 和 6、7、7 画出来差不多。',
          figHTML: MOVE1_FIG,
          variants: ['bian']
        },
        {
          kind: 'move',
          name: '看最大的角',
          tip: '每个三角形都有锐角，只看最大的那个角。',
          steps: [
            '找出最大的角（它对着最长的边）。',
            '拿本子角（直角）比一比。',
            '是直角→直角三角形，比直角大→钝角三角形，也比直角小→锐角三角形。'
          ],
          pitfall: '有一个锐角不算数；斜着放的直角也是直角。',
          figHTML: MOVE2_FIG,
          variants: ['jiao']
        },
        {
          kind: 'move',
          name: '边和角一起看',
          tip: '先看边，再看角，两样都对才算对。',
          steps: [
            '看边：有没有两条边一样长（对折能重合）。',
            '看角：最大的角是锐角、直角还是钝角。',
            '选点的题，先把点和 A、B 连起来，再看边和角。'
          ],
          pitfall: '两条边相等只说明是等腰，有直角才是等腰直角三角形。',
          figHTML: MOVE3_FIG,
          variants: ['pan', 'dian']
        },
        {
          kind: 'pick',
          heading: '用哪一招？',
          rows: [
            ['边上标着数，问等腰、等边', '数一样长的边', ['bian']],
            ['问锐角、直角、钝角三角形', '看最大的角', ['jiao']],
            ['判断说法对不对、钉子板上选点', '边和角一起看', ['pan', 'dian']]
          ]
        },
        { kind: 'chant', chant: '三条边，三个角，围成一个三角形；两边相等是等腰，三边相等是等边，等边也算是等腰；看角先找最大的：直角就是直角的，钝角就是钝角的，最大也是锐角才是锐角的。' }
      ]
    },
    variants: [
      {
        id: 'bian',
        setting: 'vSjBian',
        label: '按边分（等腰、等边）',
        idea: '看边上的数：两个一样是等腰三角形，三个都一样是等边三角形；等边三角形也算等腰三角形。',
        gen: genBian
      },
      {
        id: 'jiao',
        setting: 'vSjJiao',
        label: '按角分（锐角、直角、钝角三角形）',
        idea: '先找最大的角，和直角比：是直角就是直角三角形，比直角大是钝角三角形，最大的也比直角小才是锐角三角形。',
        gen: genJiao
      },
      {
        id: 'pan',
        setting: 'vSjPan',
        label: '看图判断对错',
        idea: '每个三角形先看边、再看最大的角，再对照说法；有一个锐角不算锐角三角形，两条边相等不一定是等腰直角三角形。',
        gen: genPan
      },
      {
        id: 'dian',
        setting: 'vSjDian',
        label: '选点围三角形',
        def: false,
        idea: '把每个圈出的点和 A、B 连起来，看最大的角是直角、钝角还是锐角；问等腰就看两条边是不是一样长。',
        gen: genDian
      }
    ],
    generate: function (s) {
      return U.generateFrom(SANJIAO.variants, s)
    },
    titleFor: function (s) {
      return '三角形练习 · ' + U.DIFF_LABEL[s.difficulty || 'L1']
    }
  }

  root.SumSum.aoshu.topics.sanjiao = SANJIAO
  root.SumSum.aoshu.topicList.push(SANJIAO)
})(typeof window !== 'undefined' ? window : globalThis)
