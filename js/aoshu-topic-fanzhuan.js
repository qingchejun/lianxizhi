/**
 * 知识点「B08 叠加覆盖：翻转问题」（L1 补充，对照学而思 1 级第 6 讲好方法 6、练 16～18，
 * 拆题笔记 docs/xes-1ji/06-叠加覆盖问题.md 第 6 节）。
 * 卡片上 3×3 九个洞，一根绳子从卡片外穿进来，在洞里穿进穿出，再穿出去。
 * 黑白打印：实线 = 绳子在卡片前面，虚线 = 在卡片后面。每经过一个洞换一次前后。
 * 变式：①左右翻 ②上下翻（选一选 A～D）③翻两次（先左右、再上下，def: false）。
 * 干扰项固定三类：只翻方向不换前后、只换前后不翻方向、翻错方向。四张画出来两两不同才出。
 * key 带洞的顺序、第一段的前后、四个选项的变换，tools/check-aoshu-gen.js 的 checkFanzhuan 从 key 独立重算。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util
  var LET = ['A', 'B', 'C', 'D']

  /* 卡片：3×3 洞，格子 16，边 9（边宽一点，从边到洞那一小段的实线虚线才看得清） */
  var N = 3, CELL = 16, PAD = 9, CW = N * CELL + PAD * 2, OUT = 8
  function hole(r, c) { return [PAD + c * CELL + CELL / 2, PAD + r * CELL + CELL / 2] }

  /*
   * 绳子 = { path: [[r,c],…], first: 0|1（第一段 0 在前 1 在后）, a: 入口边, b: 出口边 }
   * 边：'L' 'R' 'T' 'B'。线段 i（0 = 从卡片外到第一个洞）的前后 = (first + i) % 2。
   */
  function sidesOf(r, c) {
    var s = []
    if (c === 0) s.push('L')
    if (c === N - 1) s.push('R')
    if (r === 0) s.push('T')
    if (r === N - 1) s.push('B')
    return s
  }
  function edgePoint(r, c, side) {
    var h = hole(r, c)
    if (side === 'L') return [[0, h[1]], [-OUT, h[1]]]
    if (side === 'R') return [[CW, h[1]], [CW + OUT, h[1]]]
    if (side === 'T') return [[h[0], 0], [h[0], -OUT]]
    return [[h[0], CW], [h[0], CW + OUT]]
  }

  /* 变换：mx 左右反、my 上下反、sw 前后换 */
  function trans(rope, mx, my, sw) {
    var flipSide = { L: mx ? 'R' : 'L', R: mx ? 'L' : 'R', T: my ? 'B' : 'T', B: my ? 'T' : 'B' }
    return {
      path: rope.path.map(function (p) { return [my ? N - 1 - p[0] : p[0], mx ? N - 1 - p[1] : p[1]] }),
      first: sw ? 1 - rope.first : rope.first,
      a: flipSide[rope.a],
      b: flipSide[rope.b]
    }
  }
  /* 画出来一样的绳子算同一个（正着走、倒着走都算） */
  function canon(rope) {
    var segs = []
    var pts = [['E', rope.a, rope.path[0]]].concat(rope.path).concat([['E', rope.b, rope.path[rope.path.length - 1]]])
    function key(p) { return p[0] === 'E' ? 'E' + p[1] + p[2].join('') : p.join('') }
    for (var i = 0; i + 1 < pts.length; i++) {
      var k1 = key(pts[i]), k2 = key(pts[i + 1])
      segs.push((k1 < k2 ? k1 + '-' + k2 : k2 + '-' + k1) + ':' + ((rope.first + i) % 2))
    }
    return segs.sort().join(' ')
  }

  /* 随机走：相邻的洞（横竖斜），不重复；斜着交叉的两段不能同在前或同在后会看混，干脆不让斜线交叉 */
  function walk(k) {
    for (var t = 0; t < 300; t++) {
      var start = [U.randInt(0, N - 1), U.randInt(0, N - 1)]
      if (!sidesOf(start[0], start[1]).length) continue
      var path = [start], used = {}
      used[start.join()] = true
      var ok = true
      while (path.length < k && ok) {
        var cur = path[path.length - 1], nb = []
        for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue
          var r = cur[0] + dr, c = cur[1] + dc
          if (r < 0 || c < 0 || r >= N || c >= N || used[r + ',' + c]) continue
          /* 斜着走时，另一条对角线不能已经走过（不交叉） */
          if (dr && dc && crossed(path, cur, [r, c])) continue
          nb.push([r, c])
        }
        if (!nb.length) { ok = false; break }
        var nx = U.pick(nb)
        path.push(nx)
        used[nx.join()] = true
      }
      if (!ok) continue
      var end = path[path.length - 1]
      var sa = sidesOf(start[0], start[1]), sb = sidesOf(end[0], end[1])
      if (!sb.length) continue
      var a = U.pick(sa), b = U.pick(sb)
      if (start[0] === end[0] && start[1] === end[1]) continue
      return { path: path, first: U.randInt(0, 1), a: a, b: b }
    }
    return null
  }
  function crossed(path, p, q) {
    /* 和 p→q 交叉的另一条对角线：(p.r, q.c)→(q.r, p.c) */
    var u = p[0] + ',' + q[1], v = q[0] + ',' + p[1]
    for (var i = 0; i + 1 < path.length; i++) {
      var s = path[i].join(), e = path[i + 1].join()
      if ((s === u && e === v) || (s === v && e === u)) return true
    }
    return false
  }

  /* ---------------- 画卡片 ---------------- */
  function f2(n) { return +n.toFixed(2) }
  function cardSVG(rope, ox, oy) {
    var p = ['<rect x="' + ox + '" y="' + oy + '" width="' + CW + '" height="' + CW + '" rx="2" fill="#e4e4e4" stroke="#000" stroke-width="1.2"/>']
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var h = hole(r, c)
      p.push('<circle cx="' + (ox + h[0]) + '" cy="' + (oy + h[1]) + '" r="5" fill="#fff" stroke="#000" stroke-width="0.9"/>')
    }
    var ea = edgePoint(rope.path[0][0], rope.path[0][1], rope.a)
    var last = rope.path[rope.path.length - 1]
    var eb = edgePoint(last[0], last[1], rope.b)
    /* 线段：入口边 → 洞 → … → 出口边 */
    var pts = [ea[0]].concat(rope.path.map(function (q) { return hole(q[0], q[1]) })).concat([eb[0]])
    var back = [], front = []
    for (var i = 0; i + 1 < pts.length; i++) {
      var d = 'M' + f2(ox + pts[i][0]) + ' ' + f2(oy + pts[i][1]) + 'L' + f2(ox + pts[i + 1][0]) + ' ' + f2(oy + pts[i + 1][1])
      if ((rope.first + i) % 2) back.push(d)
      else front.push(d)
    }
    if (back.length) p.push('<path d="' + back.join('') + '" fill="none" stroke="#000" stroke-width="1.5" stroke-dasharray="3 2.4" stroke-linecap="round"/>')
    if (front.length) p.push('<path d="' + front.join('') + '" fill="none" stroke="#000" stroke-width="2.3" stroke-linecap="round"/>')
    /* 卡片外的两头：总看得见，实线 */
    p.push('<path d="M' + f2(ox + ea[0][0]) + ' ' + f2(oy + ea[0][1]) + 'L' + f2(ox + ea[1][0]) + ' ' + f2(oy + ea[1][1]) +
      'M' + f2(ox + eb[0][0]) + ' ' + f2(oy + eb[0][1]) + 'L' + f2(ox + eb[1][0]) + ' ' + f2(oy + eb[1][1]) + '" fill="none" stroke="#000" stroke-width="2.3" stroke-linecap="round"/>')
    return p.join('')
  }
  function txt(x, y, s, size) {
    return '<text x="' + f2(x) + '" y="' + f2(y) + '" font-size="' + (size || 11) + '" text-anchor="middle">' + s + '</text>'
  }
  /* 图 1 + 四个选项 */
  function questionSVG(rope, opts, dirText, style) {
    var G = CW + OUT * 2 + 8, W = G * 5 + 14, H = CW + OUT * 2 + 18
    var p = ['<svg ' + (style ? 'style="' + style + '"' : 'class="fig-big"') + ' viewBox="0 0 ' + W + ' ' + H + '" width="' + W * 1.5 + '" height="' + H * 1.5 + '">']
    p.push(cardSVG(rope, OUT + 4, OUT))
    p.push(txt(OUT + 4 + CW / 2, H - 2, '图 1（' + dirText + '）', 10))
    p.push('<line x1="' + (G + 7) + '" y1="2" x2="' + (G + 7) + '" y2="' + (H - 2) + '" stroke="#000" stroke-width="0.5" stroke-dasharray="3 3"/>')
    opts.forEach(function (o, i) {
      var x = G * (i + 1) + 14 + OUT
      p.push(cardSVG(o, x, OUT))
      p.push(txt(x + CW / 2, H - 2, LET[i], 12))
    })
    p.push('</svg>')
    return p.join('')
  }
  function singleSVG(rope, label, style) {
    var W = CW + OUT * 2 + 4, H = CW + OUT * 2 + (label ? 14 : 2)
    return '<svg ' + (style ? 'style="' + style + '"' : '') + ' viewBox="0 0 ' + W + ' ' + H + '" width="' + W * 1.6 + '" height="' + H * 1.6 + '">' +
      cardSVG(rope, OUT + 2, OUT) + (label ? txt(W / 2, H - 2, label, 10) : '') + '</svg>'
  }

  /* ---------------- 出题 ---------------- */

  var DIRS = {
    L: { text: '向左翻', mx: 1, my: 0 }, R: { text: '向右翻', mx: 1, my: 0 },
    U: { text: '向上翻', mx: 0, my: 1 }, D: { text: '向下翻', mx: 0, my: 1 }
  }
  function holesFor(d) { return d === 'L1' ? 3 : d === 'L2' ? U.randInt(4, 5) : U.randInt(6, 7) }

  /* kinds：每个选项用哪种变换 [mx, my, sw] */
  function build(s, mode) {
    var d = s.difficulty || 'L1'
    var rope = walk(holesFor(d))
    if (!rope) return null
    var dir1, dir2, kinds, right
    if (mode === 'twice') {
      dir1 = U.pick(['L', 'R']); dir2 = U.pick(['U', 'D'])
      kinds = [
        { t: [1, 1, 0], why: 'right' },
        { t: [1, 1, 1], why: 'swap' },
        { t: [1, 0, 1], why: 'once' },
        { t: [0, 1, 1], why: 'second' }
      ]
    } else {
      dir1 = mode === 'lr' ? U.pick(['L', 'R']) : U.pick(['U', 'D'])
      var mx = DIRS[dir1].mx, my = DIRS[dir1].my
      kinds = [
        { t: [mx, my, 1], why: 'right' },
        { t: [mx, my, 0], why: 'noswap' },
        { t: [0, 0, 1], why: 'nomirror' },
        { t: [my, mx, 1], why: 'wrongaxis' }
      ]
    }
    var order = U.shuffled([0, 1, 2, 3])
    var opts = order.map(function (k) { var t = kinds[k].t; return trans(rope, t[0], t[1], t[2]) })
    /* 四张两两不同，也都和图 1 不同 */
    var seen = {}
    seen[canon(rope)] = true
    for (var i = 0; i < 4; i++) {
      var c = canon(opts[i])
      if (seen[c]) return null
      seen[c] = true
    }
    right = order.indexOf(0)
    var dirText = mode === 'twice' ? '先' + DIRS[dir1].text + '，再' + DIRS[dir2].text : DIRS[dir1].text
    var stem = mode === 'twice'
      ? '把图 1 的卡片' + dirText + '，它会变成 A～D 里的哪一张？（实线：绳子在卡片前面；虚线：在后面）'
      : '把图 1 的卡片' + dirText + '过来，它会变成 A～D 里的哪一张？（实线：绳子在卡片前面；虚线：在后面）'
    var why = {}
    order.forEach(function (k, i) { why[kinds[k].why] = LET[i] })
    var sol = []
    if (mode === 'twice') {
      sol.push({ tag: '想一想', text: '左右翻一次：左右相反，前后换；上下再翻一次：上下也相反，前后又换回来。' })
      sol.push({ tag: '排除', text: why.once + ' 只翻了第一次，' + why.second + ' 只翻了第二次，' + why.swap + ' 的实线虚线换了（翻了两次，前后应该换回原样）。' })
      sol.push({ tag: '小心陷阱', text: '翻两次，前后换了两次，实线还是实线、虚线还是虚线。' })
    } else {
      var lr = mode === 'lr'
      sol.push({ tag: '想一想', text: (lr ? '左右翻：左右相反，上下不变' : '上下翻：上下相反，左右不变') + '；翻过去以后，前面的绳子到了后面，实线变虚线、虚线变实线。' })
      sol.push({ tag: '排除', text: why.nomirror + ' 方向没' + (lr ? '左右' : '上下') + '反过来，' + why.wrongaxis + ' 是' + (lr ? '上下' : '左右') + '反了，都不对；' + why.noswap + ' 方向对了，可是实线虚线没换。' })
      sol.push({ tag: '小心陷阱', text: why.noswap + ' 最像，要看细节：原来的实线，翻过去要变成虚线。' })
    }
    sol.push({ tag: '答', text: '选 ' + LET[right] + '。' })
    var key = mode + ':' + dir1 + (dir2 || '') + '|' + rope.first + rope.a + rope.b + '|' + rope.path.map(function (q) { return q.join('') }).join(',') + '|' + order.join('')
    return {
      topic: 'fanzhuan',
      variant: mode,
      stem: stem,
      stemHTML: stem + '<div>' + questionSVG(rope, opts, dirText) + '</div>',
      answer: LET[right],
      unit: '',
      ansLabel: '答：选',
      ansSuffix: '。',
      workLabel: '排除',
      solution: sol,
      key: key
    }
  }

  /* ---------------- 讲解页插图 ---------------- */
  var DEMO = { path: [[0, 0], [1, 1], [1, 2]], first: 0, a: 'L', b: 'R' }
  function demoPair(dir) {
    var t = DIRS[dir]
    var W = (CW + OUT * 2 + 4) * 2 + 30, H = CW + OUT * 2 + 14
    var after = trans(DEMO, t.mx, t.my, 1)
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W * 1.5 + '" height="' + H * 1.5 + '">' +
      cardSVG(DEMO, OUT + 2, OUT) + txt(OUT + 2 + CW / 2, H - 2, '原来', 10) +
      '<path d="M' + (CW + OUT * 2 + 8) + ' ' + (CW / 2 + OUT) + 'h18" stroke="#000" stroke-width="1.2" marker-end="url(#fzA' + dir + ')"/>' +
      '<defs><marker id="fzA' + dir + '" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6z"/></marker></defs>' +
      txt(CW + OUT * 2 + 17, CW / 2 + OUT - 4, t.text.slice(1, 2), 8) +
      cardSVG(after, CW + OUT * 3 + 34, OUT) + txt(CW * 1.5 + OUT * 3 + 34, H - 2, t.text + '后', 10) + '</svg>'
  }

  var FANZHUAN = {
    id: 'fanzhuan',
    no: 'B08',
    stage: 'L1B',
    name: '叠加覆盖：翻转问题',
    lesson: {
      v2: true,
      title: '翻转问题 · 方法讲解',
      goal: '卡片翻过去，会想出它的样子：往哪边翻哪边反，前面的绳子跑到后面。',
      sections: [
        {
          kind: 'hook',
          heading: '先想一想',
          paras: [
            '卡片上穿着一根绳子。把卡片向左翻过来，绳子会变成什么样？',
            '左边的到了右边，上下没变；原来在前面的那段绳子（实线），翻过去跑到后面，变成了虚线。'
          ],
          figHTML: demoPair('L')
        },
        {
          kind: 'know',
          heading: '先认识',
          cards: [
            { title: '实线在前，虚线在后', text: '绳子在洞里穿进穿出：实线是在卡片前面的绳子，虚线是在卡片后面的绳子。每穿过一个洞，就换一次前后。' },
            { title: '往哪翻，哪边反', text: '向左（右）翻：左右相反，上下不变。向上（下）翻：上下相反，左右不变。不管往哪翻，前面的都翻到后面。', figHTML: demoPair('D') }
          ]
        },
        {
          kind: 'move',
          name: '翻一次',
          tip: '方向反过来，前后换一换。',
          steps: [
            '看往哪边翻：左右翻，左右对调；上下翻，上下对调。',
            '没翻的那个方向不变。',
            '实线变虚线，虚线变实线，再一张张排除。'
          ],
          pitfall: '方向对了、实线虚线没换的那张最像，一定要看细节。',
          variants: ['lr', 'ud']
        },
        {
          kind: 'move',
          name: '翻两次',
          tip: '一次一次翻，前后换了两次又换回来。',
          steps: [
            '先按第一次翻：比如左右对调，前后换。',
            '再按第二次翻：上下也对调，前后再换一次。',
            '前后换了两次，实线还是实线，虚线还是虚线。'
          ],
          pitfall: '只翻了一次的那两张，和前后换了的那张，都不对。',
          variants: ['twice']
        },
        {
          kind: 'pick',
          heading: '用哪一招？',
          rows: [
            ['卡片翻一次', '翻一次', ['lr', 'ud']],
            ['先这样翻，再那样翻', '翻两次', ['twice']]
          ]
        },
        { kind: 'chant', chant: '往哪翻哪边反，另一边不变；前面翻到后面，实线变虚线。' }
      ]
    },
    variants: [
      {
        id: 'lr',
        setting: 'vFzLR',
        label: '左右翻',
        idea: '向左（右）翻：左右相反、上下不变；前面的绳子翻到后面，实线变虚线、虚线变实线。',
        gen: function (s) { return build(s, 'lr') }
      },
      {
        id: 'ud',
        setting: 'vFzUD',
        label: '上下翻',
        idea: '向上（下）翻：上下相反、左右不变；前面的绳子翻到后面，实线变虚线、虚线变实线。',
        gen: function (s) { return build(s, 'ud') }
      },
      {
        id: 'twice',
        setting: 'vFzTwice',
        label: '翻两次',
        idea: '一次一次翻：左右反、上下也反；前后换了两次又换回来，实线还是实线。',
        def: false,
        gen: function (s) { return build(s, 'twice') }
      }
    ],
    generate: function (s) {
      return U.generateFrom(FANZHUAN.variants, s)
    },
    titleFor: function (s) {
      return '翻转问题练习 · ' + U.DIFF_LABEL[s.difficulty || 'L1']
    }
  }

  root.SumSum.aoshu.topics.fanzhuan = FANZHUAN
  root.SumSum.aoshu.topicList.push(FANZHUAN)
})(typeof window !== 'undefined' ? window : globalThis)
