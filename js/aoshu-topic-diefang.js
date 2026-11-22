/**
 * 知识点「B07 叠加覆盖：叠放顺序」（L1 补充，对照学而思 1 级第 6 讲好方法 1～5 和巅峰，
 * 拆题笔记 docs/xes-1ji/06-叠加覆盖问题.md 的 K1～K8、M1～M5；翻转问题留给 B08）。
 * 变式：①从上到下排顺序（3～5 个图形）②摆成这样的顺序（倒过来）
 *       ③至少拿几张才拿到 ★ 纸（从 ★ 往上倒推）④取铅笔游戏谁赢（def: false）
 * 遮挡全靠程序逐点算：在格点上看「这一点露出来的是谁」，保证每个图形都露出一块、
 * 叠住的地方看得出谁在上（相邻两层一定叠住 → 答案唯一）。铅笔每个交叉谁盖谁单独指定（能压成一圈）。
 * key 里带全部图形 / 铅笔的位置和层次，tools/check-aoshu-gen.js 的 checkDiefang 从 key 独立重算。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util
  var CIRC = ['①', '②', '③', '④', '⑤', '⑥']
  var uid = 0
  /* svg 里图案、裁剪的 id：按题目内容算（同一道题每次一样，讲解页例题才稳定） */
  function hid(str) {
    var h = 5381
    for (var i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0
    return h.toString(36)
  }

  /* ---------------- 图形 ---------------- */

  var TYPES = ['circle', 'square', 'tri', 'rect', 'star', 'diamond', 'hex', 'trap']
  var PATS = ['w', 'g', 's', 'd', 'x']

  /* 图形 → 多边形顶点（圆返回 null） */
  function verts(sh) {
    var x = sh.x, y = sh.y, s = sh.s, i, a, out = []
    switch (sh.t) {
      case 'square':
        return [[x - s / 2, y - s / 2], [x + s / 2, y - s / 2], [x + s / 2, y + s / 2], [x - s / 2, y + s / 2]]
      case 'rect':
        var w = sh.r ? s * 0.75 : s * 1.4, h = sh.r ? s * 1.4 : s * 0.75
        return [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]]
      case 'tri':
        return [[x, y - s * 0.55], [x + s * 0.58, y + s * 0.45], [x - s * 0.58, y + s * 0.45]]
      case 'diamond':
        return [[x, y - s * 0.62], [x + s * 0.48, y], [x, y + s * 0.62], [x - s * 0.48, y]]
      case 'hex':
        for (i = 0; i < 6; i++) { a = i * Math.PI / 3; out.push([x + s * 0.56 * Math.cos(a), y + s * 0.56 * Math.sin(a)]) }
        return out
      case 'star':
        for (i = 0; i < 10; i++) {
          a = -Math.PI / 2 + i * Math.PI / 5
          var rr = i % 2 ? s * 0.3 : s * 0.66
          out.push([x + rr * Math.cos(a), y + rr * Math.sin(a)])
        }
        return out
      case 'trap':
        return [[x - s * 0.33, y - s * 0.38], [x + s * 0.33, y - s * 0.38], [x + s * 0.66, y + s * 0.38], [x - s * 0.66, y + s * 0.38]]
    }
    return null
  }
  function inPoly(px, py, v) {
    var c = false
    for (var i = 0, j = v.length - 1; i < v.length; j = i++) {
      if ((v[i][1] > py) !== (v[j][1] > py) && px < (v[j][0] - v[i][0]) * (py - v[i][1]) / (v[j][1] - v[i][1]) + v[i][0]) c = !c
    }
    return c
  }
  function inside(sh, px, py) {
    if (sh.t === 'circle') { var dx = px - sh.x, dy = py - sh.y; return dx * dx + dy * dy <= sh.s * sh.s / 4 }
    return inPoly(px, py, sh.v)
  }
  function bbox(sh) {
    if (sh.t === 'circle') return [sh.x - sh.s / 2, sh.y - sh.s / 2, sh.x + sh.s / 2, sh.y + sh.s / 2]
    var xs = sh.v.map(function (p) { return p[0] }), ys = sh.v.map(function (p) { return p[1] })
    return [Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs), Math.max.apply(null, ys)]
  }
  function mk(t, x, y, s, r, p) {
    var sh = { t: t, x: x, y: y, s: s, r: r ? 1 : 0, p: p }
    sh.v = verts(sh)
    return sh
  }

  /*
   * 逐点算遮挡。shapes 按层次排好（0 = 最上面）。返回每个图形的面积点数、露出点数，
   * 以及每对图形 i < j（i 在上）的叠住点数 ov[i][j] 和「叠住处露出来的正是 i」的点数 ev[i][j]。
   */
  var STEP = 1.5
  function raster(shapes, W, H, step) {
    var STEP = step || 1.5
    var n = shapes.length, area = [], vis = [], ov = [], ev = [], i, j
    for (i = 0; i < n; i++) { area.push(0); vis.push(0); ov.push([]); ev.push([]); for (j = 0; j < n; j++) { ov[i].push(0); ev[i].push(0) } }
    var bb = shapes.map(bbox)
    var top = [], grid = []
    for (var y = STEP / 2; y < H; y += STEP) {
      for (var x = STEP / 2; x < W; x += STEP) {
        var cov = []
        for (i = 0; i < n; i++) {
          if (x < bb[i][0] || x > bb[i][2] || y < bb[i][1] || y > bb[i][3]) continue
          if (inside(shapes[i], x, y)) cov.push(i)
        }
        if (!cov.length) { top.push(-1); continue }
        var t = cov[0]
        top.push(t)
        vis[t]++
        for (var a = 0; a < cov.length; a++) {
          area[cov[a]]++
          for (var b = a + 1; b < cov.length; b++) {
            ov[cov[a]][cov[b]]++
            if (cov[a] === t) ev[cov[a]][cov[b]]++
          }
        }
      }
    }
    return { area: area, vis: vis, ov: ov, ev: ev, top: top, cols: Math.ceil((W - STEP / 2) / STEP), step: STEP }
  }

  /* 每个露出的区域里挑一个离边最远的点放编号 */
  function labelPoint(R, k, W, H) {
    var cols = R.cols, rows = Math.ceil(R.top.length / cols), best = null, bestD = -1, STEP = R.step
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (R.top[r * cols + c] !== k) continue
        var d = 0
        while (d < 9) {
          var nd = d + 1, ok = true
          for (var dr = -nd; dr <= nd && ok; dr++) {
            for (var dc = -nd; dc <= nd && ok; dc++) {
              if (Math.abs(dr) !== nd && Math.abs(dc) !== nd) continue
              var rr = r + dr, cc = c + dc
              if (rr < 0 || cc < 0 || rr >= rows || cc >= cols || R.top[rr * cols + cc] !== k) ok = false
            }
          }
          if (!ok) break
          d = nd
        }
        if (d > bestD) { bestD = d; best = [STEP / 2 + c * STEP, STEP / 2 + r * STEP] }
      }
    }
    return best
  }

  /* SVG：图案定义（每张图自己一套 id，不靠页面上别的 svg） */
  function defs(u) {
    return '<defs>' +
      '<pattern id="dfS' + u + '" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#fff"/><line x1="1" y1="0" x2="1" y2="5" stroke="#000" stroke-width="1.3"/></pattern>' +
      '<pattern id="dfD' + u + '" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#fff"/><circle cx="2.5" cy="2.5" r="1.05" fill="#000"/></pattern>' +
      '<pattern id="dfX' + u + '" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#fff"/><path d="M0 0.4H5M0.4 0V5" stroke="#000" stroke-width="0.8"/></pattern>' +
      '</defs>'
  }
  function fillOf(p, u) {
    return p === 'w' ? '#fff' : p === 'g' ? '#bdbdbd' : p === 's' ? 'url(#dfS' + u + ')' : p === 'd' ? 'url(#dfD' + u + ')' : 'url(#dfX' + u + ')'
  }
  function f2(n) { return +n.toFixed(2) }
  function shapeSVG(sh, u, dx, dy, k) {
    k = k || 1
    var st = ' fill="' + fillOf(sh.p, u) + '" stroke="#000" stroke-width="1.6" stroke-linejoin="round"'
    if (sh.t === 'circle') return '<circle cx="' + f2(dx + sh.x * k) + '" cy="' + f2(dy + sh.y * k) + '" r="' + f2(sh.s / 2 * k) + '"' + st + '/>'
    return '<polygon points="' + sh.v.map(function (p) { return f2(dx + p[0] * k) + ',' + f2(dy + p[1] * k) }).join(' ') + '"' + st + '/>'
  }
  function txt(x, y, s, size) {
    return '<text x="' + f2(x) + '" y="' + f2(y) + '" font-size="' + (size || 12) + '" text-anchor="middle">' + s + '</text>'
  }

  /* ---------------- 变式①②：排顺序 / 摆的顺序 ---------------- */

  var SW = 130, SH = 112
  function makeStack(n) {
    for (var tries = 0; tries < 400; tries++) {
      var types = U.shuffled(TYPES).slice(0, n)
      /* 正方形和长方形不同时出（只露一角时分不清） */
      if (types.indexOf('square') >= 0 && types.indexOf('rect') >= 0) continue
      var pats = U.shuffled(PATS).slice(0, n)
      var shapes = [], fit = true
      for (var i = 0; i < n; i++) {
        var s = U.randInt(n >= 5 ? 34 : 38, n >= 5 ? 50 : 56)
        var sh = mk(types[i], U.randInt(34, SW - 34), U.randInt(32, SH - 32), s, U.rand() < 0.5, pats[i])
        var b = bbox(sh)
        if (b[0] < 3 || b[1] < 3 || b[2] > SW - 3 || b[3] > SH - 3) { fit = false; break }
        shapes.push(sh)
      }
      if (!fit) continue
      /* 先粗查：相邻两层的外框得叠上 */
      var near = true
      for (i = 0; i + 1 < n; i++) {
        var p = bbox(shapes[i]), q = bbox(shapes[i + 1])
        if (p[2] < q[0] + 10 || q[2] < p[0] + 10 || p[3] < q[1] + 10 || q[3] < p[1] + 10) near = false
      }
      if (!near) continue
      /* 先粗扫看露没露够，再细扫 */
      var R0 = raster(shapes, SW, SH, 4), vis = true
      for (i = 0; i < n && vis; i++) if (R0.vis[i] < R0.area[i] * 0.22) vis = false
      if (!vis) continue
      var R = raster(shapes, SW, SH, 1)
      if (stackOK(R, n)) return { shapes: shapes, R: R }
    }
    return null
  }
  function stackOK(R, n) {
    for (var i = 0; i < n; i++) {
      if (R.vis[i] < R.area[i] * 0.28) return false            // 每个至少露出一块
      if (i > 0 && R.vis[i] > R.area[i] * 0.85) return false    // 下面的真被压住一块
      for (var j = i + 1; j < n; j++) {
        if (R.ov[i][j] > 0 && R.ov[i][j] < 56) return false     // 只碰到一点点，看不清（步长 1，56 个点 ≈ 7×8）
        if (R.ov[i][j] > 0 && R.ev[i][j] < 56) return false     // 叠住的地方被第三个全挡了
      }
      if (i + 1 < n && R.ov[i][i + 1] === 0) return false      // 相邻两层一定叠住（答案唯一）
    }
    return true
  }

  /* 图 1 叠好的样子（裁到图形的外框、放大 1.5 倍，叠住的地方看得清）+ 图 2 分开的图形（按 order 给的编号顺序） */
  function stackSVG(shapes, order, style, u) {
    u = u || 'h' + (++uid)
    var n = shapes.length, Z = 1.5, k = 0.85
    var bbs = shapes.map(bbox)
    var ux0 = Math.min.apply(null, bbs.map(function (b) { return b[0] })) - 3
    var uy0 = Math.min.apply(null, bbs.map(function (b) { return b[1] })) - 3
    var uw = (Math.max.apply(null, bbs.map(function (b) { return b[2] })) + 3 - ux0) * Z
    var uh = (Math.max.apply(null, bbs.map(function (b) { return b[3] })) + 3 - uy0) * Z
    var cell = Math.ceil(Math.max.apply(null, bbs.map(function (b) { return Math.max(b[2] - b[0], b[3] - b[1]) })) * k) + 8
    var cols = n === 4 ? 2 : 3
    var rows = Math.ceil(n / cols)
    var gh = rows * (cell + 14)
    var H = Math.max(uh + 18, gh)
    var top1 = (H - uh - 16) / 2, top2 = (H - gh) / 2
    var px = uw + 22
    var W = px + cols * cell
    var p = ['<svg ' + (style ? 'style="' + style + '"' : 'class="fig-big"') + ' viewBox="0 0 ' + f2(W) + ' ' + f2(H) + '" width="' + f2(W * 1.2) + '" height="' + f2(H * 1.2) + '">', defs(u)]
    for (var i = n - 1; i >= 0; i--) p.push(shapeSVG(shapes[i], u, -ux0 * Z, top1 - uy0 * Z, Z))
    p.push(txt(uw / 2, top1 + uh + 13, '图 1'))
    p.push('<line x1="' + f2(uw + 10) + '" y1="4" x2="' + f2(uw + 10) + '" y2="' + f2(H - 4) + '" stroke="#000" stroke-width="0.6" stroke-dasharray="3 3"/>')
    order.forEach(function (idx, j) {
      var sh = shapes[idx], b = bbs[idx]
      var cx = px + (j % cols) * cell + cell / 2, cy = top2 + Math.floor(j / cols) * (cell + 14) + cell / 2
      p.push(shapeSVG(sh, u, cx - (b[0] + b[2]) / 2 * k, cy - (b[1] + b[3]) / 2 * k, k))
      p.push(txt(cx, cy + cell / 2 + 11, CIRC[j], 12))
    })
    p.push('</svg>')
    return p.join('')
  }
  function enc(sh) { return [sh.t, sh.x, sh.y, sh.s, sh.r, sh.p].join(',') }

  function genStack(s, mode) {
    var d = s.difficulty || 'L1'
    var n = d === 'L1' ? 3 : d === 'L2' ? 4 : 5
    if (mode === 'build') makeStack(3)  // 先空转一次：同一个种子下和排顺序的例题错开
    var st = makeStack(n)
    if (!st) return null
    var shapes = st.shapes
    /* 图 2 里的编号顺序：打乱，但别正好是从上到下或倒过来（那样一眼就猜） */
    var order
    do { order = U.shuffled(shapes.map(function (_, i) { return i })) }
    while (order.every(function (v, i) { return v === i }) || order.every(function (v, i) { return v === n - 1 - i }))
    var lab = []
    order.forEach(function (idx, j) { lab[idx] = CIRC[j] })
    var down = lab.join('、')
    var up = lab.slice().reverse().join('、')
    var stem = mode === 'order'
      ? '图 1 是用图 2 的 ' + n + ' 个图形叠起来的。请按从上到下的顺序排一排。'
      : '用图 2 的 ' + n + ' 个图形，一个一个摆成图 1 的样子。先摆哪个？请按摆的先后顺序写出来。'
    var steps = []
    for (var i = 0; i < n; i++) {
      if (i === 0) steps.push(lab[0] + ' 和图 1 里一样完整，在最上面')
      else if (i < n - 1) steps.push('拿走它，' + lab[i] + ' 就露出完整的样子')
      else steps.push('最后剩下 ' + lab[i] + '，在最下面')
    }
    var sol = [{ tag: '想一想', text: '上面的图形能看见整个，下面的只能看见一部分。最上面的一定是完整的，找到它，想象拿走，再找下一个完整的。' }]
    sol.push({ tag: mode === 'order' ? '找一找' : '先正着排', text: steps.join('；') + '。从上到下：' + down + '。' })
    if (mode === 'build') {
      sol.push({ tag: '再倒过来', text: '摆的时候先摆最下面的，所以把从上到下的顺序倒过来：' + up + '。' })
      sol.push({ tag: '小心陷阱', text: '别直接写从上到下的顺序，那是拆开的顺序，摆的顺序正好相反。' })
    } else {
      sol.push({ tag: '小心陷阱', text: '大的不一定在下面，要看叠住的地方露出来的是谁。' })
    }
    sol.push({ tag: '答', text: (mode === 'order' ? '从上到下：' : '摆的顺序：') + (mode === 'order' ? down : up) + '。' })
    var key = mode + ':' + shapes.map(function (sh, i) { return enc(sh) + ',' + lab[i] }).join('|')
    return {
      topic: 'diefang',
      variant: mode,
      stem: stem,
      stemHTML: stem + '<div>' + stackSVG(shapes, order, null, hid(key)) + '</div>',
      answer: mode === 'order' ? down : up,
      unit: '',
      ansLabel: mode === 'order' ? '答：从上到下' : '答：摆的顺序',
      ansSuffix: '。',
      workLabel: mode === 'order' ? '找一找' : '先正着排',
      solution: sol,
      key: key
    }
  }

  /* ---------------- 变式③：至少拿几张 ---------------- */

  var PS = 40
  /* 离线搜好的纸堆（tools/gen-diefang-take.js 生成）：「★ 纸的层次|x,y,是否斜放;…」，0 = 最上面 */
  var TAKE_TABLE = {
    L1: [
      '2|83,56,0;83,88,0;106,43,0;64,44,0;103,70,0',
      '3|59,54,1;41,30,0;92,48,0;107,58,0;78,62,0',
      '2|72,63,0;97,53,0;43,43,1;88,74,1;77,47,0',
      '3|87,70,0;74,42,0;108,90,0;93,37,0;117,56,0',
      '2|69,69,0;49,90,0;82,49,1;53,35,0;95,73,0',
      '3|43,44,0;79,74,1;28,54,0;32,75,0;60,56,0',
      '3|57,46,1;38,63,0;32,29,0;89,51,0;67,73,1',
      '3|87,63,1;59,62,0;43,47,1;75,88,0;62,36,0',
      '2|48,50,0;73,80,0;71,37,0;80,53,0;93,29,0',
      '3|51,60,0;78,46,1;35,90,1;76,73,1;56,90,0',
      '2|47,29,0;89,59,0;41,55,0;38,69,0;61,48,0',
      '3|48,68,0;70,59,0;95,48,0;39,41,0;65,34,1',
      '2|60,64,1;93,46,0;30,79,0;63,88,0;86,67,0',
      '3|58,81,1;38,91,0;88,86,0;80,74,0;69,58,0',
      '2|84,57,0;106,64,1;58,46,1;107,34,1;51,70,0',
      '3|122,83,0;101,80,0;114,51,0;66,57,0;91,51,0',
      '2|59,29,1;88,45,0;33,51,1;61,49,0;110,33,0',
      '3|64,69,1;35,56,1;90,59,1;48,43,1;73,32,1',
      '2|29,29,1;111,32,0;97,48,0;69,65,1;48,57,0',
      '3|50,90,0;68,56,1;83,33,0;40,69,0;39,37,0',
      '2|76,45,0;32,89,0;76,73,0;53,88,0;50,67,1',
      '3|101,41,0;98,67,0;40,55,0;119,51,0;70,65,0',
      '2|109,45,1;61,81,1;101,34,1;40,85,1;76,54,0',
      '3|86,64,1;58,57,0;108,87,0;77,30,1;56,35,1',
      '2|55,59,0;103,56,0;98,84,0;36,79,0;76,62,1',
      '3|86,34,0;114,46,0;46,74,0;50,43,0;80,47,0',
      '2|64,48,1;30,55,0;85,54,0;61,81,1;44,36,0',
      '3|40,52,0;71,48,0;31,81,1;57,29,0;73,79,0',
      '2|108,48,1;52,78,0;60,59,1;39,55,1;83,60,0',
      '3|48,64,1;95,46,1;110,29,0;62,52,0;79,66,0',
      '2|64,78,0;65,36,0;32,28,1;51,55,0;79,57,1',
      '3|89,87,0;70,71,0;95,68,0;43,70,0;62,91,1',
      '2|31,47,0;98,56,0;76,69,0;109,77,1;62,53,0',
      '3|60,65,1;38,56,1;86,56,0;38,36,0;73,38,1',
      '2|31,84,0;97,87,0;82,57,0;61,43,0;61,73,1',
      '3|122,90,1;65,72,0;65,41,0;80,54,0;102,76,1',
      '3|43,38,1;63,29,0;97,67,0;45,72,0;75,48,1',
      '3|85,69,0;108,83,0;60,88,0;58,68,0;55,35,0',
      '2|86,45,0;94,70,1;65,36,1;50,70,0;68,85,0',
      '3|83,68,0;106,79,0;58,65,0;102,53,0;89,33,0',
      '2|88,92,1;37,56,0;93,71,1;43,45,1;65,68,0',
      '3|106,62,0;65,49,0;42,42,0;94,50,0;118,40,0',
      '2|80,65,0;98,82,0;45,85,0;50,69,1;72,86,0',
      '3|113,55,1;76,84,0;64,64,1;110,79,1;84,60,0',
      '2|112,54,0;37,75,1;92,54,1;40,44,0;67,42,0',
      '3|63,83,0;119,61,0;65,64,0;69,36,1;94,73,1',
      '3|55,64,1;28,64,1;36,79,1;77,42,0;63,90,0',
      '3|58,47,0;49,67,0;38,84,0;84,68,0;68,80,0',
      '2|117,59,0;61,30,0;69,40,0;88,49,0;69,60,0',
      '3|59,46,0;110,55,1;37,54,1;88,29,0;40,86,0',
      '2|88,77,0;44,44,0;103,41,1;89,39,1;70,50,1',
      '3|64,89,1;92,70,0;49,77,0;120,84,0;68,58,0',
      '3|78,62,0;98,65,1;91,32,0;44,60,0;64,86,1',
      '3|72,54,0;67,31,0;87,48,0;45,37,0;65,81,0',
      '2|119,58,1;61,54,0;115,85,0;74,34,1;92,45,0',
      '3|59,47,0;79,58,0;58,79,0;101,42,0;73,38,0',
      '2|65,54,0;32,72,0;43,31,0;48,84,0;73,87,0',
      '3|70,41,0;62,50,0;92,54,0;49,57,0;49,36,1',
      '3|79,43,0;95,67,0;88,90,0;63,28,1;113,84,1',
      '3|121,44,1;87,42,1;111,30,0;81,73,0;109,62,0'
    ],
    L2: [
      '3|113,42,0;134,66,0;86,49,0;71,67,0;103,70,1;73,45,0;142,53,0',
      '5|131,61,0;98,106,0;101,82,0;120,96,0;134,91,0;79,97,0;74,73,0',
      '5|98,92,1;132,53,1;105,73,0;74,43,0;124,90,0;54,63,0;77,71,0',
      '5|101,112,0;112,87,0;98,56,0;130,29,1;98,33,1;90,104,0;85,84,1',
      '4|49,79,1;86,47,0;58,60,0;85,69,1;33,56,0;54,103,0;51,28,0',
      '5|122,102,1;88,60,0;90,98,0;113,86,0;62,54,0;73,75,0;71,109,0',
      '4|99,61,0;96,95,0;128,48,1;146,70,1;78,74,0;77,106,0;62,45,0',
      '4|122,57,1;65,61,1;141,36,0;116,79,1;89,62,0;93,31,1;100,107,0',
      '5|71,87,0;128,72,0;98,104,0;101,90,1;143,47,0;96,76,0;118,53,1',
      '3|68,59,0;73,82,1;138,92,0;96,78,0;93,101,0;120,71,0;83,35,0',
      '4|33,101,0;59,52,0;45,78,0;39,48,1;56,97,0;69,100,0;81,76,0',
      '5|45,66,0;135,41,0;76,87,0;46,88,1;90,59,0;117,68,0;102,84,0',
      '3|115,81,1;94,68,0;119,52,0;68,84,0;92,93,0;85,59,0;92,37,0',
      '5|122,47,0;89,102,0;148,36,0;125,87,0;139,71,1;89,76,0;98,46,0',
      '5|98,70,0;37,59,0;60,33,1;120,52,1;37,31,0;92,48,0;70,56,0',
      '3|81,92,0;103,66,1;89,44,0;110,100,0;68,32,0;71,62,1;118,87,1',
      '4|105,57,1;122,110,0;70,90,0;98,36,0;95,81,0;111,93,0;78,72,0',
      '5|61,57,0;103,96,0;90,108,0;75,37,0;78,81,0;70,105,1;44,84,1',
      '3|98,109,0;71,59,1;141,80,0;84,78,0;130,112,0;82,105,0;141,52,0',
      '4|63,97,1;56,72,0;43,98,0;87,79,0;83,50,0;104,50,1;103,29,1',
      '5|102,84,1;43,66,0;55,83,0;75,101,1;40,37,1;78,74,0;60,48,0',
      '3|135,95,0;54,79,0;116,109,0;102,80,1;97,60,1;119,69,0;77,67,1',
      '4|44,107,0;59,80,0;71,54,1;81,76,1;39,56,1;36,82,1;47,48,0',
      '5|58,43,0;117,30,0;85,32,0;116,105,0;76,59,0;107,58,1;91,85,0',
      '3|125,77,0;116,91,0;42,87,1;99,70,1;97,90,1;71,96,0;61,76,1',
      '5|96,72,1;54,41,0;146,64,0;126,84,0;86,40,0;72,62,1;63,69,0',
      '5|108,40,0;67,85,0;129,75,0;137,39,1;86,59,0;109,78,0;96,90,0',
      '3|56,34,0;93,95,1;103,43,1;74,52,1;47,56,0;80,31,0;95,63,1',
      '4|85,59,1;50,30,1;115,39,0;31,37,0;82,39,1;63,49,0;111,64,1',
      '5|32,58,1;96,29,0;79,85,1;44,30,0;66,28,1;52,53,1;86,61,1',
      '4|104,86,0;139,105,0;91,56,0;116,104,0;76,82,0;62,47,1;86,105,0',
      '4|72,58,0;116,44,0;128,95,0;79,77,1;92,95,0;104,72,0;81,106,0',
      '5|100,82,0;47,105,1;126,66,0;53,81,1;65,48,1;82,74,0;75,102,0',
      '4|105,76,0;125,78,0;112,106,1;82,36,0;77,68,0;65,47,1;118,59,0',
      '4|97,63,0;90,43,0;110,58,0;41,60,0;68,71,0;67,43,1;101,29,0',
      '5|79,102,0;132,95,0;57,96,0;71,73,0;39,85,0;98,83,0;112,106,0',
      '3|122,60,0;61,110,0;51,103,0;80,96,0;52,81,0;142,87,0;101,84,1',
      '5|59,102,0;69,32,0;100,80,0;110,56,0;87,105,1;79,57,0;59,78,0',
      '5|46,95,0;67,105,1;48,41,0;96,91,0;118,65,0;97,58,0;71,44,1',
      '5|74,105,1;136,75,0;136,42,1;128,104,0;55,78,0;107,77,1;97,105,1',
      '4|58,38,0;78,28,0;136,77,0;37,62,1;103,59,0;71,53,0;124,49,0',
      '5|90,77,0;84,52,0;71,76,1;78,103,0;56,52,0;68,28,0;99,35,0',
      '3|116,86,0;68,88,0;134,110,0;83,93,1;143,85,1;96,77,0;96,99,0',
      '5|85,80,0;47,89,0;110,63,1;45,109,0;103,44,1;66,99,0;98,93,0',
      '5|128,87,0;126,67,1;75,79,0;78,36,0;58,98,0;100,65,0;102,44,0',
      '3|90,93,1;106,101,1;72,69,0;53,90,0;98,74,0;37,79,0;47,62,0',
      '4|122,37,0;94,47,0;65,57,0;147,44,0;67,80,0;84,76,1;45,87,1',
      '5|70,108,0;105,29,0;128,55,0;100,59,0;145,34,0;84,81,0;108,80,1',
      '4|77,66,0;45,84,0;104,41,1;99,71,1;59,103,0;80,99,0;101,107,0',
      '5|32,36,0;118,49,1;50,90,1;36,108,0;88,47,0;63,44,0;74,76,0',
      '5|85,71,0;58,72,0;30,75,0;70,91,0;44,43,0;78,46,0;109,56,0',
      '5|47,105,1;134,91,1;42,91,1;67,112,1;103,79,0;81,57,0;71,84,0',
      '4|118,91,0;97,98,0;42,57,0;113,46,0;69,68,0;98,66,1;86,43,0',
      '5|106,85,1;29,109,1;91,99,0;82,32,0;58,52,0;76,76,0;50,82,0',
      '4|91,62,1;123,67,0;83,83,0;70,112,0;71,53,0;59,78,0;56,28,0',
      '4|58,88,0;95,39,1;144,51,0;116,35,1;104,55,0;73,59,1;130,72,0',
      '5|40,63,1;53,66,0;103,112,0;73,82,0;86,87,0;44,91,0;71,108,0',
      '5|66,32,0;99,75,1;71,65,1;121,87,1;87,44,0;132,75,0;113,42,1',
      '4|45,112,0;32,82,0;55,87,1;108,68,0;66,96,0;110,40,0;85,93,0',
      '5|106,69,0;95,48,0;88,88,0;62,57,0;59,91,0;46,42,0;39,65,0'
    ],
    L3: [
      '4|71,88,1;129,78,1;92,65,0;100,92,1;65,55,0;124,109,0;90,106,0;59,72,0;69,34,0',
      '6|111,58,0;65,108,0;91,65,0;93,89,0;67,79,0;58,53,1;108,92,0;66,45,0;92,113,0',
      '6|123,85,1;92,73,1;99,129,0;65,87,0;101,40,0;99,107,1;77,104,0;52,114,1;43,56,1',
      '4|97,30,1;96,67,0;123,43,1;109,92,1;113,117,0;146,126,0;94,97,1;161,111,1;142,106,0',
      '6|118,100,0;162,115,0;88,92,0;58,68,0;172,95,0;144,94,0;132,118,0;101,126,0;64,119,0',
      '6|141,111,1;135,83,1;58,98,0;113,94,1;45,42,1;86,96,0;100,67,0;66,71,0;167,62,0',
      '4|70,34,1;60,63,0;90,54,0;126,45,0;82,80,0;29,84,0;113,71,0;153,40,1;124,107,1',
      '5|115,70,1;170,120,0;104,88,0;112,34,0;147,115,0;126,88,0;126,39,0;101,41,0;122,104,0',
      '7|52,116,0;128,111,0;135,64,0;81,123,0;165,55,0;113,81,1;39,90,1;102,102,1;74,99,1',
      '6|106,82,1;58,84,0;145,56,1;172,54,0;130,82,1;79,104,1;154,104,0;110,113,0;132,132,1',
      '6|118,58,0;29,83,0;140,42,1;101,70,0;117,101,0;53,65,0;81,49,1;152,66,1;61,31,0',
      '6|44,55,0;133,29,0;61,66,1;151,38,0;141,97,1;123,55,1;96,75,0;127,83,0;107,57,0',
      '4|108,35,0;67,88,0;61,121,1;113,61,0;102,86,0;80,59,0;53,109,0;128,77,0;47,75,0',
      '5|115,92,1;122,116,0;105,128,0;126,30,1;93,115,0;63,116,0;106,59,0;82,104,0;78,131,0',
      '6|90,128,0;111,66,1;61,128,0;142,85,0;62,76,0;91,77,0;78,105,0;105,98,0;125,129,0',
      '4|82,80,0;112,71,1;93,60,0;104,53,0;58,66,0;38,53,0;133,50,0;61,109,0;141,93,0',
      '6|110,43,0;140,95,0;169,108,1;66,96,0;153,122,0;96,78,0;123,63,0;143,31,0;66,69,0',
      '7|68,131,0;31,126,1;82,96,0;108,80,0;41,63,0;38,80,0;136,72,0;49,91,0;68,73,0',
      '7|61,55,1;110,78,0;88,50,1;141,65,0;61,35,1;76,69,0;169,58,1;145,45,1;113,41,0',
      '6|79,103,1;102,95,1;62,125,1;99,126,0;168,76,1;116,68,0;135,62,0;132,82,0;139,92,0',
      '7|115,118,0;97,69,1;48,123,1;107,91,0;114,63,1;79,85,1;136,106,0;85,116,0;50,103,1',
      '7|92,69,1;70,55,0;80,120,0;74,102,0;100,32,0;62,131,1;102,99,0;118,49,1;112,28,1',
      '6|77,28,1;83,48,0;90,83,0;73,65,0;125,72,0;114,103,0;48,96,0;78,109,0;92,118,0',
      '7|80,70,0;135,82,0;29,44,0;59,120,1;50,46,0;57,59,0;111,91,1;43,89,0;69,89,0',
      '4|145,108,0;94,55,0;142,82,0;131,101,0;97,112,0;76,38,1;63,49,0;76,64,0;114,87,0',
      '7|58,95,0;74,122,0;129,105,0;111,117,1;101,38,1;113,70,0;131,87,1;83,59,0;102,92,0',
      '6|133,62,1;163,107,0;56,120,0;91,121,0;35,132,1;116,89,0;136,97,0;121,111,0;150,122,1',
      '5|161,99,0;95,78,0;118,33,0;106,54,0;118,70,0;78,71,0;55,99,0;140,75,0;140,48,0',
      '5|132,78,0;82,75,0;152,104,0;164,81,1;130,111,1;101,94,1;70,92,0;159,70,0;128,55,0',
      '6|74,52,0;99,69,0;107,38,0;32,83,0;110,99,0;122,52,0;126,65,0;45,61,0;155,51,0',
      '5|114,46,0;52,58,0;77,52,1;157,91,0;126,110,0;109,79,1;105,97,0;141,58,0;152,122,1',
      '5|147,73,1;47,122,0;65,73,1;122,45,0;111,63,1;100,81,0;129,92,1;88,60,0;41,96,0',
      '6|78,54,1;134,131,0;57,60,0;123,109,1;146,84,1;83,78,0;98,107,0;108,132,1;152,114,0',
      '6|168,61,1;109,69,0;136,73,0;87,71,0;53,54,1;58,30,0;149,51,0;121,48,1;86,38,0',
      '6|38,76,1;86,77,0;159,63,1;63,67,0;138,61,1;141,75,0;110,91,1;64,99,0;96,99,0',
      '7|71,93,0;99,51,0;45,91,0;162,88,1;91,113,0;101,91,0;57,122,0;130,72,0;113,45,1',
      '4|117,124,1;145,45,0;123,93,0;165,75,0;113,65,0;166,46,1;144,113,0;130,44,0;102,93,0',
      '5|155,35,1;165,57,0;133,61,0;111,86,0;160,70,0;139,111,0;165,129,0;130,129,0;165,102,0',
      '7|96,121,0;126,89,0;121,120,1;157,67,1;126,65,0;80,113,0;77,40,0;96,63,0;96,83,0',
      '5|82,77,0;70,56,1;104,53,0;72,129,0;77,109,0;126,68,0;126,47,1;119,81,0;110,129,0',
      '6|71,52,1;78,130,0;66,85,0;88,74,0;123,81,0;152,89,1;74,103,0;94,102,0;43,56,0',
      '6|42,47,1;121,127,0;100,102,0;34,85,0;83,86,0;101,77,0;52,72,0;75,52,0;79,127,0',
      '6|57,52,0;43,78,0;80,82,0;127,64,0;29,53,0;106,60,1;69,100,0;94,104,0;94,36,0',
      '6|103,70,0;88,40,0;138,49,0;75,69,0;55,95,0;132,71,1;67,115,0;151,80,1;84,93,0',
      '7|104,73,1;172,95,0;129,76,0;61,105,0;132,121,0;88,88,0;155,123,0;111,102,0;111,128,0',
      '5|67,90,0;119,104,0;148,127,0;48,77,0;103,81,1;92,56,0;114,63,0;95,111,0;123,127,0',
      '5|60,76,1;141,102,0;151,121,0;97,72,0;117,87,1;107,93,1;77,102,1;51,104,0;171,92,0',
      '6|60,85,0;62,109,0;31,93,0;133,130,0;90,92,0;82,127,0;108,123,0;127,93,1;28,117,0',
      '4|75,126,0;152,90,0;148,119,1;126,105,0;106,85,1;124,73,1;98,105,1;78,90,0;119,115,0',
      '5|36,92,1;85,86,1;110,69,0;31,28,0;76,65,0;57,75,0;96,39,1;31,58,0;53,44,1',
      '6|66,119,0;139,50,1;63,66,0;59,33,0;81,86,1;73,54,0;90,59,0;126,46,1;106,67,0',
      '4|131,110,0;116,87,0;80,96,0;137,98,0;88,59,0;121,74,0;153,87,0;62,80,0;146,67,0',
      '5|53,92,0;60,64,0;96,67,1;113,79,0;109,101,0;111,47,0;80,39,1;105,116,0;83,85,1',
      '7|144,41,0;152,107,0;134,70,0;100,94,0;87,36,1;130,98,0;73,112,1;76,84,0;99,71,1',
      '7|42,28,0;111,76,0;36,100,1;135,72,0;113,41,0;64,52,0;60,127,0;59,72,0;87,81,0',
      '5|62,105,0;52,70,1;159,79,1;124,32,0;109,54,0;84,76,0;120,81,0;103,109,0;140,62,0',
      '6|86,75,1;106,31,1;158,98,0;172,60,1;132,95,1;107,66,0;132,38,1;156,47,0;137,66,1',
      '4|33,98,1;119,58,0;82,67,0;135,35,0;55,90,1;73,55,1;75,85,1;83,132,1;55,117,1',
      '7|94,110,0;115,54,1;109,86,0;135,62,0;99,66,0;140,132,0;101,39,1;131,116,0;134,100,0',
      '7|142,64,0;65,58,0;107,28,1;82,40,0;120,90,0;101,118,0;70,115,0;91,89,0;96,69,0'
    ]
  }
  function paper(x, y, tilt) {
    var sh = { t: 'paper', x: x, y: y, s: PS, r: tilt ? 1 : 0, p: 'w' }
    var h = PS / 2
    sh.v = tilt ? [[x, y - h * 1.3], [x + h * 1.3, y], [x, y + h * 1.3], [x - h * 1.3, y]] : [[x - h, y - h], [x + h, y - h], [x + h, y + h], [x - h, y + h]]
    return sh
  }
  /* 两个凸多边形是否相交（分离轴） */
  function sat(A, B) {
    var polys = [A, B]
    for (var k = 0; k < 2; k++) {
      var P = polys[k]
      for (var i = 0; i < P.length; i++) {
        var j = (i + 1) % P.length
        var nx = P[j][1] - P[i][1], ny = P[i][0] - P[j][0]
        var a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity
        A.forEach(function (p) { var v = p[0] * nx + p[1] * ny; if (v < a0) a0 = v; if (v > a1) a1 = v })
        B.forEach(function (p) { var v = p[0] * nx + p[1] * ny; if (v < b0) b0 = v; if (v > b1) b1 = v })
        if (a1 <= b0 || b1 <= a0) return false
      }
    }
    return true
  }
  /* 压着关系：i 在 j 上面且叠住 */
  function closureOf(R, n, t) {
    var lvl = [], seen = {}, frontier = [t]
    seen[t] = true
    while (frontier.length) {
      var next = []
      frontier.forEach(function (b) {
        for (var a = 0; a < b; a++) if (R.ov[a][b] > 0 && !seen[a]) { seen[a] = true; next.push(a) }
      })
      next.sort(function (x, y) { return x - y })
      if (next.length) lvl.push(next)
      frontier = next
    }
    return lvl
  }

  /* 一叠纸里拿第 ti 张当 ★ 纸行不行 */
  function tryTarget(R, n, ti, want, d, TW, TH) {
    var lvl = closureOf(R, n, ti)
    var need = [].concat.apply([], lvl)
    if (need.length + 1 !== want) return null
    if (d === 'L3' && lvl.length < 2) return null
    /* ★ 上面有一张不用拿的（陷阱），也有压在 ★ 下面的 */
    var spare = false, below = false, i
    for (i = 0; i < ti; i++) if (need.indexOf(i) < 0) spare = true
    for (i = ti + 1; i < n; i++) if (R.ov[ti][i] > 0) below = true
    if (!spare || (d !== 'L1' && !below)) return null
    /* 要拿的纸和 ★ 纸：压着关系都看得见 */
    var S = need.concat([ti]), mp = Math.round(60 / (R.step * R.step))  // 60 个单位面积 ≈ 8×8
    for (var a = 0; a < n; a++) {
      for (var b = a + 1; b < n; b++) {
        if (R.ov[a][b] && (S.indexOf(a) >= 0 || S.indexOf(b) >= 0) && (R.ov[a][b] < mp || R.ev[a][b] < mp)) return null
      }
    }
    var star = labelPoint(R, ti, TW, TH)
    if (!star) return null
    var pts = need.map(function (k) { return labelPoint(R, k, TW, TH) })
    if (pts.some(function (q) { return !q })) return null
    return { ti: ti, lvl: lvl, need: need, star: star, pts: pts }
  }

  /* 离线搜纸堆（tools/gen-diefang-take.js 调用）：返回「★ 的层次|x,y,斜;…」 */
  function searchTake(d, want) {
    var n = d === 'L1' ? 5 : d === 'L2' ? 7 : 9
    var TW = takeSize(n)[0], TH = takeSize(n)[1]
    for (var tries = 0; tries < 3000; tries++) {
      var ps = []
      /* 一张挨着一张摆成一堆：新纸的中心离某张旧纸 20～34（9 张时到 38） */
      ps.push(paper(U.randInt(TW / 2 - 20, TW / 2 + 20), U.randInt(TH / 2 - 14, TH / 2 + 14), U.rand() < 0.3))
      for (var i = 1; i < n; i++) {
        var base = U.pick(ps), q = null
        for (var g = 0; g < 30 && !q; g++) {
          var a = U.rand() * Math.PI * 2, r = U.randInt(20, n === 9 ? 38 : 34)
          var x = Math.round(base.x + Math.cos(a) * r), y = Math.round(base.y + Math.sin(a) * r)
          if (x >= 28 && x <= TW - 28 && y >= 28 && y <= TH - 28 && !ps.some(function (o) { return Math.abs(o.x - x) + Math.abs(o.y - y) < 16 })) q = paper(x, y, U.rand() < 0.3)
        }
        if (!q) break
        ps.push(q)
      }
      if (ps.length < n) continue
      ps = U.shuffled(ps)
      /* 先用多边形相交粗算压着关系：哪几张当 ★ 纸答案、层数对得上（★ 上面有好几张，下面也有） */
      var M = { ov: ps.map(function (a) { return ps.map(function (b) { return a !== b && sat(a.v, b.v) ? 1 : 0 }) }) }
      var cand = []
      for (var t = Math.floor(n / 2); t <= n - 2; t++) {
        var pre = closureOf(M, n, t)
        if ([].concat.apply([], pre).length + 1 === want && (d !== 'L3' || pre.length >= 2)) cand.push(t)
      }
      if (!cand.length) continue
      /* 先粗扫一遍看每张露没露够，够了再细扫 */
      var R0 = raster(ps, TW, TH, 4), ok = true
      for (i = 0; i < n && ok; i++) if (R0.vis[i] < R0.area[i] * 0.16) ok = false
      if (!ok) continue
      var R = raster(ps, TW, TH, 1)
      for (i = 0; i < n && ok; i++) if (R.vis[i] < R.area[i] * 0.2) ok = false
      if (!ok) continue
      var got = null
      U.shuffled(cand).some(function (ti) {
        got = tryTarget(R, n, ti, want, d, TW, TH)
        /* 左右翻、上下翻以后也得过（边上刚好擦到的纸，翻过去可能多出一两个格点） */
        if (got && ![[1, 0], [0, 1], [1, 1]].every(function (f) {
          var qs = ps.map(function (q) { return paper(f[0] ? TW - q.x : q.x, f[1] ? TH - q.y : q.y, q.r) })
          return tryTarget(raster(qs, TW, TH, 1), n, ti, want, d, TW, TH)
        })) got = null
        return got
      })
      if (got) return got.ti + '|' + ps.map(function (q) { return [q.x, q.y, q.r].join(',') }).join(';')
    }
    return null
  }

  function takeSize(n) { var w = n === 5 ? 150 : n === 7 ? 176 : 200; return [w, Math.round(w * 0.4) * 2] }  // 宽高取偶数，翻过来格点还对得上
  function genTake(s) {
    var d = s.difficulty || 'L1'
    var row = U.pick(TAKE_TABLE[d]).split('|')
    var ti = +row[0]
    var raw = row[1].split(';').map(function (t) { return t.split(',').map(Number) })
    var n = raw.length, wh = takeSize(n), TW = wh[0], TH = wh[1]
    /* 随机左右翻、上下翻（遮挡关系不变；表里的纸堆离线逐点验过，见 searchTake） */
    var fx = U.rand() < 0.5, fy = U.rand() < 0.5
    var ps = raw.map(function (f) { return paper(fx ? TW - f[0] : f[0], fy ? TH - f[1] : f[1], f[2]) })
    /* 压着关系用多边形相交算（和逐点算一样，表里没有只碰到一点的） */
    var M = { ov: ps.map(function (a) { return ps.map(function (b) { return a !== b && sat(a.v, b.v) ? 1 : 0 }) }) }
    var lvl = closureOf(M, n, ti)
    var need = [].concat.apply([], lvl)
    /* 编号的位置用粗一点的格子找，够快 */
    var R = raster(ps, TW, TH, 2)
    var star = labelPoint(R, ti, TW, TH)
    var pts = need.map(function (k) { return labelPoint(R, k, TW, TH) })
    if (!star || pts.some(function (q) { return !q })) return null
    return buildTake(ps, ti, M, lvl, need, star, pts, TW, TH)
  }

  /* 一堆纸：每张换一种图案好分清，★ 纸深灰；裁到纸堆的外框 */
  var TPAT = ['w', 's', 'd', 'x']
  function takeSVG(ps, ti, star, marks, TW, TH, style, u) {
    u = u || 'h' + (++uid)
    var bbs = ps.map(function (q) { return bbox(q) })
    var x0 = Math.floor(Math.min.apply(null, bbs.map(function (b) { return b[0] }))) - 4
    var y0 = Math.floor(Math.min.apply(null, bbs.map(function (b) { return b[1] }))) - 4
    var w = Math.ceil(Math.max.apply(null, bbs.map(function (b) { return b[2] }))) + 4 - x0
    var h = Math.ceil(Math.max.apply(null, bbs.map(function (b) { return b[3] }))) + 4 - y0
    var p = ['<svg ' + (style ? 'style="' + style + '"' : 'class="fig-route"') + ' viewBox="' + x0 + ' ' + y0 + ' ' + w + ' ' + h + '" width="' + w * 1.4 + '" height="' + h * 1.4 + '">', defs(u)]
    for (var i = ps.length - 1; i >= 0; i--) {
      p.push('<polygon points="' + ps[i].v.map(function (q) { return f2(q[0]) + ',' + f2(q[1]) }).join(' ') + '" fill="' + (i === ti ? '#9a9a9a' : fillOf(TPAT[i % TPAT.length], u)) + '" stroke="#000" stroke-width="1.6"/>')
    }
    p.push('<circle cx="' + f2(star[0]) + '" cy="' + f2(star[1]) + '" r="7.5" fill="#fff" stroke="#000" stroke-width="1"/>')
    p.push(txt(star[0], star[1] + 4.6, '★', 13))
    ;(marks || []).forEach(function (m) {
      p.push('<circle cx="' + f2(m[0]) + '" cy="' + f2(m[1]) + '" r="6.5" fill="#fff" stroke="#000" stroke-width="1"/>')
      p.push(txt(m[0], m[1] + 3.6, m[2], 10))
    })
    p.push('</svg>')
    return p.join('')
  }
  function buildTake(ps, ti, R, lvl, need, star, pts, TW, TH) {
    var num = {}
    need.forEach(function (k, i) { num[k] = i + 1 })
    var marks = need.map(function (k, i) { return [pts[i][0], pts[i][1], String(i + 1)] })
    function pressers(b) {
      var out = []
      for (var a = 0; a < b; a++) if (R.ov[a][b] > 0) out.push(num[a])
      return out.sort(function (x, y) { return x - y })
    }
    var lines = ['★ 纸被 ' + pressers(ti).join('、') + ' 压着']
    need.forEach(function (k) {
      var pr = pressers(k)
      if (pr.length) lines.push(num[k] + ' 被 ' + pr.join('、') + ' 压着')
    })
    var m = need.length
    var key = 'take:' + TW + ',' + TH + '|' + ti + '|' + ps.map(function (q) { return [q.x, q.y, q.r].join(',') }).join('|')
    var stem = '从上往下取彩纸，每次只能拿 1 张，拿的纸不能被别的纸压着。至少要拿几张，才能拿到画 ★ 的深灰色纸？'
    var sol = [{ tag: '想一想', text: '从 ★ 纸往上倒着推：先找压着它的，再找压着「压着它的」的，一直找到没被压着的为止。' }]
    sol.push({ tag: '找一找', text: lines.join('；') + '（图里标了号）。最上面那几张没被压着，可以先拿。' })
    sol.push({ tag: '小心陷阱', text: '有的纸也在上面，可是没压着 ★ 纸和要拿的纸，不用拿；数完别忘了 ★ 纸自己。' })
    sol.push({ tag: '列算式', text: m + ' + 1 = ' + (m + 1) + '（张）' })
    sol.push({ tag: '答', text: '至少要拿 ' + (m + 1) + ' 张。' })
    return {
      topic: 'diefang',
      variant: 'take',
      stem: stem,
      stemHTML: stem + '<div>' + takeSVG(ps, ti, star, null, TW, TH, null, hid(key)) + '</div>',
      diagramHTML: '<div class="sol-diagram">' + takeSVG(ps, ti, star, marks, TW, TH, 'height:30mm;width:auto', hid(key) + 's') + '</div>',
      answer: m + 1,
      unit: '',
      ansLabel: '答：至少要拿',
      ansSuffix: '张。',
      workLabel: '找一找',
      solution: sol,
      key: key
    }
  }

  /* ---------------- 变式④：取铅笔游戏 ---------------- */

  var GW = 210, GH = 170, PW = 7
  var LET = 'ABCDEFG'
  function segX(a, b) {
    /* 两条线段的交点参数，不交返回 null */
    var r = [a[2] - a[0], a[3] - a[1]], s = [b[2] - b[0], b[3] - b[1]]
    var den = r[0] * s[1] - r[1] * s[0]
    if (Math.abs(den) < 1e-9) return null
    var qp = [b[0] - a[0], b[1] - a[1]]
    var t = (qp[0] * s[1] - qp[1] * s[0]) / den, u = (qp[0] * r[1] - qp[1] * r[0]) / den
    if (t < 0 || t > 1 || u < 0 || u > 1) return null
    return [t, u, a[0] + t * r[0], a[1] + t * r[1]]
  }
  function ptSeg(px, py, a) {
    var dx = a[2] - a[0], dy = a[3] - a[1]
    var t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy)))
    var x = a[0] + t * dx - px, y = a[1] + t * dy - py
    return Math.sqrt(x * x + y * y)
  }
  function segDist(a, b) {
    return Math.min(ptSeg(a[0], a[1], b), ptSeg(a[2], a[3], b), ptSeg(b[0], b[1], a), ptSeg(b[2], b[3], a))
  }
  function len(a) { return Math.sqrt((a[2] - a[0]) * (a[2] - a[0]) + (a[3] - a[1]) * (a[3] - a[1])) }
  function acute(a, b) {
    var t1 = Math.atan2(a[3] - a[1], a[2] - a[0]), t2 = Math.atan2(b[3] - b[1], b[2] - b[0])
    var x = Math.abs(t1 - t2) % Math.PI
    return Math.min(x, Math.PI - x)
  }

  /* 摆铅笔：返回线段 [尾x, 尾y, 尖x, 尖y] 和所有交叉 */
  function layPencils(n) {
    for (var tries = 0; tries < 40; tries++) {
      var segs = []
      for (var i = 0; i < n; i++) {
        var got = false
        for (var t = 0; t < 120 && !got; t++) {
          var L = U.randInt(104, 128), ang = U.rand() * Math.PI * 2
          var cx = U.randInt(GW / 2 - 40, GW / 2 + 40), cy = U.randInt(GH / 2 - 30, GH / 2 + 30)
          var sg = [cx - Math.cos(ang) * L / 2, cy - Math.sin(ang) * L / 2, cx + Math.cos(ang) * L / 2, cy + Math.sin(ang) * L / 2].map(function (v) { return Math.round(v) })
          if (Math.min(sg[0], sg[2]) < 14 || Math.max(sg[0], sg[2]) > GW - 14 || Math.min(sg[1], sg[3]) < 14 || Math.max(sg[1], sg[3]) > GH - 14) continue
          /* 新放的这支至少和前面一支交叉，图才连成一堆 */
          if (segs.length && !segs.some(function (o) { return segX(o, sg) })) continue
          if (checkLayout(segs.concat([sg]))) { segs.push(sg); got = true }
        }
        if (!got) break
      }
      if (segs.length === n) return { segs: segs, cross: checkLayout(segs) }
    }
    return null
  }
  /* 交叉角 ≥ 30°、离两头 ≥ 16；不交的离开 ≥ 10；交叉处离第三支足够远；字母标签不压别的铅笔 */
  function checkLayout(segs) {
    var n = segs.length, cross = [], i, j, k
    for (i = 0; i < n; i++) {
      for (j = i + 1; j < n; j++) {
        var x = segX(segs[i], segs[j])
        if (!x) { if (segDist(segs[i], segs[j]) < PW + 4) return null; continue }
        var th = acute(segs[i], segs[j])
        if (th < Math.PI / 6) return null
        var li = len(segs[i]), lj = len(segs[j])
        if (x[0] * li < 16 || (1 - x[0]) * li < 16 || x[1] * lj < 16 || (1 - x[1]) * lj < 16) return null
        var rad = (PW / 2) / Math.sin(th / 2)
        for (k = 0; k < n; k++) {
          if (k === i || k === j) continue
          if (ptSeg(x[2], x[3], segs[k]) < rad + PW / 2 + 3) return null
        }
        cross.push([i, j, x[2], x[3]])
      }
    }
    for (i = 0; i < n; i++) {
      var lp = labelPos(segs[i])
      if (lp[0] < 6 || lp[0] > GW - 6 || lp[1] < 8 || lp[1] > GH - 4) return null
      for (k = 0; k < n; k++) if (k !== i && ptSeg(lp[0], lp[1], segs[k]) < 10) return null
    }
    return cross
  }
  function labelPos(sg) {
    var L = len(sg), ux = (sg[2] - sg[0]) / L, uy = (sg[3] - sg[1]) / L
    return [sg[0] - ux * 9, sg[1] - uy * 9]
  }
  /* 铅笔的轮廓：尾 → 笔杆 → 笔尖；grow 放大一点用来裁剪 */
  function pencilPoly(sg, grow) {
    grow = grow || 0
    var L = len(sg), ux = (sg[2] - sg[0]) / L, uy = (sg[3] - sg[1]) / L, nx = -uy, ny = ux
    var h = PW / 2 + grow
    var tx = sg[0] - ux * grow, ty = sg[1] - uy * grow
    var bx = sg[2] - ux * 11, by = sg[3] - uy * 11
    var ex = sg[2] + ux * grow, ey = sg[3] + uy * grow
    return [[tx + nx * h, ty + ny * h], [bx + nx * h, by + ny * h], [ex, ey], [bx - nx * h, by - ny * h], [tx - nx * h, ty - ny * h]]
  }
  function pts(poly) { return poly.map(function (q) { return f2(q[0]) + ',' + f2(q[1]) }).join(' ') }
  function pencilSVG(sg) {
    var L = len(sg), ux = (sg[2] - sg[0]) / L, uy = (sg[3] - sg[1]) / L, nx = -uy, ny = ux, h = PW / 2
    var p = ['<polygon points="' + pts(pencilPoly(sg)) + '" fill="#fff" stroke="#000" stroke-width="1.3" stroke-linejoin="round"/>']
    /* 橡皮那一圈 */
    var ex = sg[0] + ux * 7, ey = sg[1] + uy * 7
    p.push('<line x1="' + f2(ex + nx * h) + '" y1="' + f2(ey + ny * h) + '" x2="' + f2(ex - nx * h) + '" y2="' + f2(ey - ny * h) + '" stroke="#000" stroke-width="1"/>')
    /* 笔芯 */
    var bx = sg[2] - ux * 4, by = sg[3] - uy * 4
    p.push('<polygon points="' + pts([[bx + nx * 1.3, by + ny * 1.3], [sg[2], sg[3]], [bx - nx * 1.3, by - ny * 1.3]]) + '" fill="#000"/>')
    return p.join('')
  }
  /*
   * over[i][j] = true 表示 i 盖在 j 上。先按 base 顺序画（后画的在上），
   * 再把「本该在上、却先画了」的交叉处，用下面那支的轮廓裁一块重画上面那支。
   */
  function pencilsSVG(segs, cross, over, labels, style, u) {
    var n = segs.length
    u = u || 'h' + (++uid)
    /* 画的顺序：被压次数多的先画 */
    var score = segs.map(function (_, i) {
      var c = 0
      for (var j = 0; j < n; j++) if (over[j][i]) c++
      return c
    })
    var base = segs.map(function (_, i) { return i }).sort(function (a, b) { return score[b] - score[a] || a - b })
    var rank = []
    base.forEach(function (i, r) { rank[i] = r })
    var p = ['<svg ' + (style ? 'style="' + style + '"' : 'class="fig-route"') + ' viewBox="0 0 ' + GW + ' ' + GH + '" width="' + GW * 1.4 + '" height="' + GH * 1.4 + '">', '<defs>']
    var fix = []
    cross.forEach(function (c, k) {
      var hi = over[c[0]][c[1]] ? c[0] : c[1], lo = hi === c[0] ? c[1] : c[0]
      if (rank[hi] < rank[lo]) {
        p.push('<clipPath id="dfC' + u + '_' + k + '"><polygon points="' + pts(pencilPoly(segs[lo], 1.4)) + '"/></clipPath>')
        fix.push([hi, k])
      }
    })
    p.push('</defs>')
    base.forEach(function (i) { p.push(pencilSVG(segs[i])) })
    fix.forEach(function (f) { p.push('<g clip-path="url(#dfC' + u + '_' + f[1] + ')">' + pencilSVG(segs[f[0]]) + '</g>') })
    segs.forEach(function (sg, i) {
      var lp = labelPos(sg)
      p.push(txt(lp[0], lp[1] + 4.5, labels[i], 13))
    })
    p.push('</svg>')
    return p.join('')
  }

  /* 模拟：每步能取的（没被剩下的压着）必须正好一支；取不动时停 */
  function play(n, over) {
    var left = [], seq = [], i, j
    for (i = 0; i < n; i++) left.push(i)
    while (true) {
      var free = left.filter(function (a) { return !left.some(function (b) { return over[b][a] }) })
      if (free.length === 0) return { seq: seq, stuck: left }
      if (free.length > 1) return null
      seq.push(free[0])
      left = left.filter(function (a) { return a !== free[0] })
      if (!left.length) return null
    }
  }

  function genGame(s) {
    var d = s.difficulty || 'L1'
    var k = d === 'L1' ? U.randInt(1, 2) : d === 'L2' ? U.randInt(2, 3) : U.randInt(3, 4)
    var n = k + 3 + (d !== 'L1' && U.rand() < 0.3 ? 1 : 0)
    if (n > 7) n = 7
    for (var tries = 0; tries < 2400; tries++) {
      if (tries % 80 === 0) {
        var lay = layPencils(n)
        if (!lay) return null
        var segs = lay.segs, cross = lay.cross, i, j
      }
      var over = []
      for (i = 0; i < n; i++) { over.push([]); for (j = 0; j < n; j++) over[i].push(false) }
      /* 层次：前 k 支是被迫依次取走的（序号小的在上），后面的互相交叉随便盖 */
      var ord = U.shuffled(segs.map(function (_, i) { return i }))
      var pos = []
      ord.forEach(function (v, r) { pos[v] = r })
      cross.forEach(function (c) {
        var a = c[0], b = c[1]
        var top
        if (pos[a] < k || pos[b] < k) top = pos[a] < pos[b] ? a : b
        else top = U.rand() < 0.5 ? a : b
        over[top][top === a ? b : a] = true
      })
      var r = play(n, over)
      if (!r || r.seq.length !== k || r.stuck.length < 3) continue
      var labels = U.shuffled(LET.slice(0, n).split(''))
      return buildGame(segs, cross, over, labels, r, d)
    }
    return null
  }
  function buildGame(segs, cross, over, labels, r, d) {
    var who = U.pickTwoNames()
    var k = r.seq.length
    var firstWins = k % 2 === 1
    var winner = firstWins ? who[0] : who[1], loser = firstWins ? who[1] : who[0]
    var stem = who[0] + '和' + who[1] + '玩取铅笔游戏：两人轮流取，每人每次取 1 支，取的时候不能动别的铅笔，动了就算输。' +
      who[0] + '先取，两人都很小心，没有失误。谁会赢？'
    var takes = r.seq.map(function (v, i) { return (i % 2 ? who[1] : who[0]) + '取 ' + labels[v] })
    var stuckTxt = r.stuck.map(function (v) {
      var by = r.stuck.filter(function (b) { return over[b][v] }).map(function (b) { return labels[b] })
      return labels[v] + ' 被 ' + by.join('、') + ' 压着'
    })
    var sol = [{ tag: '想一想', text: '每次只能取完整的那支（没被别的铅笔压着），一层一层往下揭。看交叉的地方，谁盖在上面谁就压着另一支。' }]
    sol.push({ tag: '取一取', text: takes.join('，') + '：每一次都只有这一支是完整的。' })
    sol.push({ tag: '卡住了', text: '剩下 ' + r.stuck.map(function (v) { return labels[v] }).join('、') + '：' + stuckTxt.join('，') + '，谁也取不出来。' })
    sol.push({ tag: '小心陷阱', text: '先取的人不一定赢，要数一数能顺利取走几支：' + k + ' 支，' + (k % 2 ? '最后一支是' + who[0] + '取的' : '最后一支是' + who[1] + '取的') + '，接下来轮到' + loser + '。' })
    sol.push({ tag: '答', text: '轮到' + loser + '时只能动别的铅笔，' + loser + '输，' + winner + '赢。' })
    var ov = []
    cross.forEach(function (c) { ov.push(over[c[0]][c[1]] ? labels[c[0]] + labels[c[1]] : labels[c[1]] + labels[c[0]]) })
    var key = 'game:' + who.join(',') + '|' + segs.map(function (sg, i) { return labels[i] + ':' + sg.join(',') }).join('|') + '|' + ov.join(',')
    return {
      topic: 'diefang',
      variant: 'game',
      stem: stem,
      stemHTML: stem + '<div>' + pencilsSVG(segs, cross, over, labels, null, hid(key)) + '</div>',
      answer: winner,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '会赢。',
      workLabel: '取一取',
      solution: sol,
      key: key
    }
  }

  /* ---------------- 讲解页插图 ---------------- */

  var HOOK_SHAPES = [mk('tri', 64, 40, 44, 0, 's'), mk('circle', 44, 62, 50, 0, 'g'), mk('square', 80, 70, 46, 0, 'w')]
  function hookSVG(withPieces) {
    var u = ++uid
    var p = ['<svg viewBox="0 0 ' + (withPieces ? 250 : 120) + ' 110" width="' + (withPieces ? 250 : 120) * 1.2 + '" height="132">', defs(u)]
    for (var i = HOOK_SHAPES.length - 1; i >= 0; i--) p.push(shapeSVG(HOOK_SHAPES[i], u, 0, 0))
    if (withPieces) {
      var order = [1, 2, 0]
      order.forEach(function (idx, j) {
        var sh = HOOK_SHAPES[idx], k = 0.7
        var cx = 150 + j * 38, cy = 52
        p.push(shapeSVG(sh, u, cx - sh.x * k, cy - sh.y * k, k))
        p.push(txt(cx, 98, CIRC[j], 11))
      })
    }
    p.push('</svg>')
    return p.join('')
  }
  /* 「倒着想」的小图：一叠纸，★ 被 1、2 压着，2 又被 3 压着 */
  var TAKE_FIG = (function () {
    var ps = [paper(112, 44, 0), paper(52, 50, 0), paper(88, 62, 1), paper(70, 86, 0), paper(30, 92, 0)]
    var u = ++uid
    var p = ['<svg viewBox="0 0 150 120" width="180" height="144">']
    for (var i = ps.length - 1; i >= 0; i--) p.push('<polygon points="' + pts(ps[i].v) + '" fill="' + (i === 3 ? '#9a9a9a' : '#fff') + '" stroke="#000" stroke-width="1.6"/>')
    p.push(txt(72, 102, '★', 14))
    ;[[112, 40, '3'], [44, 52, '1'], [92, 66, '2']].forEach(function (m) {
      p.push('<circle cx="' + m[0] + '" cy="' + m[1] + '" r="6.5" fill="#fff" stroke="#000"/>' + txt(m[0], m[1] + 3.6, m[2], 10))
    })
    p.push('</svg>')
    return p.join('')
  })()

  var DIEFANG = {
    id: 'diefang',
    no: 'B07',
    stage: 'L1B',
    name: '叠加覆盖：叠放顺序',
    lesson: {
      v2: true,
      title: '叠放顺序 · 方法讲解',
      goal: '看出叠在一起的图形谁在上、谁在下，会排顺序、会倒着摆，还会算至少拿几张。',
      sections: [
        {
          kind: 'hook',
          heading: '先想一想',
          paras: [
            '三张纸片叠在一起，哪张在最上面？哪张在最下面？',
            '斜线三角形一点都没被挡住，它在最上面；灰色的圆被挡住了两块，它在最下面。'
          ],
          figHTML: hookSVG(false)
        },
        {
          kind: 'know',
          heading: '先认识',
          cards: [
            { title: '上面的完整，下面的缺一块', text: '叠在一起时，上面的能看见整个，下面的被挡住一块，只能看见一部分。最上面的一定是完整的。', figHTML: hookSVG(true) },
            { title: '叠住的地方看得见谁，谁就在上', text: '两张叠住的地方，露出来的是谁、谁的边线没断，谁就在上面。离得远、没叠住的两张，看不出谁先谁后。' }
          ]
        },
        {
          kind: 'move',
          name: '一层层揭',
          tip: '完整的在最上面，拿走它再找下一个完整的。',
          steps: [
            '给每个图形（每支铅笔）标上号。',
            '找完整的那个，和单独画的一模一样，它在最上面。',
            '想象拿走它，再找下一个完整的，一层一层往下揭。'
          ],
          pitfall: '大的不一定在下面；取铅笔游戏揭到几支互相压成一圈，谁也取不动，轮到谁谁输，先取的人不一定赢。',
          variants: ['order', 'game']
        },
        {
          kind: 'move',
          name: '倒着想',
          tip: '摆的顺序倒过来；要拿哪张往上推。',
          steps: [
            '摆成图的样子：先摆最下面的，把从上到下的顺序倒过来。',
            '要拿到 ★ 纸：先找压着它的，再找压着「压着它的」的，一直找到最上面。',
            '数一数这些纸，再加上 ★ 纸自己。'
          ],
          pitfall: '在上面但没压着它们的纸不用拿；别忘了加 ★ 纸自己。',
          figHTML: TAKE_FIG,
          variants: ['build', 'take']
        },
        {
          kind: 'pick',
          heading: '用哪一招？',
          rows: [
            ['排从上到下的顺序、取铅笔谁赢', '一层层揭', ['order', 'game']],
            ['摆成这样先摆谁、至少拿几张', '倒着想', ['build', 'take']]
          ]
        },
        { kind: 'chant', chant: '完整的在最上面，一层一层往下揭；摆的顺序倒过来，要拿哪张往上推。' }
      ]
    },
    variants: [
      {
        id: 'order',
        setting: 'vDfOrder',
        label: '从上到下排顺序',
        idea: '最上面的一定是完整的：找到它，想象拿走，再找下一个完整的，一层层往下揭。',
        gen: function (s) { return genStack(s, 'order') }
      },
      {
        id: 'build',
        setting: 'vDfBuild',
        label: '摆成这样的顺序',
        idea: '摆的时候先摆最下面的：先从上到下排好，再倒过来就是摆的顺序。',
        gen: function (s) { return genStack(s, 'build') }
      },
      {
        id: 'take',
        setting: 'vDfTake',
        label: '至少拿几张',
        idea: '从 ★ 纸往上倒推：压着它的、压着「压着它的」的都得先拿，没压着的不用拿，最后加上 ★ 纸自己。',
        gen: genTake
      },
      {
        id: 'game',
        setting: 'vDfGame',
        label: '取铅笔游戏',
        idea: '每次只能取完整的那支，一层层揭；揭到几支互相压成一圈就谁也取不动，数一数顺利取走几支，看轮到谁。',
        def: false,
        gen: genGame
      }
    ],
    generate: function (s) {
      return U.generateFrom(DIEFANG.variants, s)
    },
    titleFor: function (s) {
      return '叠放顺序练习 · ' + U.DIFF_LABEL[s.difficulty || 'L1']
    }
  }

  DIEFANG._searchTake = searchTake
  root.SumSum.aoshu.topics.diefang = DIEFANG
  root.SumSum.aoshu.topicList.push(DIEFANG)
})(typeof window !== 'undefined' ? window : globalThis)
