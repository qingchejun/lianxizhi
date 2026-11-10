/**
 * 知识点「B02 推理比较：比轻重」（L1 补充，对照学而思 1 级第 1 讲好方法 4～6 和练习 14～18，拆题笔记 docs/xes-1ji/01-推理比较.md）。
 * 变式：①看天平（平了一样重，沉下去的重、翘起来的轻；借中间的东西比）②几个天平排顺序（写成「>」串糖葫芦）
 *       ③先拿掉一样的（两边去掉相同的东西 / 两个比一个，def:false）。
 * 图是黑白内联 SVG 天平（上皿式，东西直接摆在盘子上，写名字）。
 * 每道题先给东西定「真实重量」画出天平，再把 1～6 的所有重量组合枚举一遍：
 * 和这些天平都对得上的组合，问的结论必须都一样（只靠天平就能推出来），否则重出。
 * key = 变式:东西:天平(左+左>右)…:问法，tools/check-aoshu-gen.js 从 key 独立枚举复核。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util
  var CIRC = ['①', '②', '③', '④', '⑤', '⑥']
  /* 大小差不多、看不出谁重的东西（不出西瓜比橘子这种靠常识就知道的） */
  var SETS = [
    { word: '水果', items: ['苹果', '梨', '桃', '橘子', '柠檬'] },
    { word: '彩球', items: ['红球', '黄球', '蓝球', '绿球', '白球'] },
    { word: '玩具', items: ['小熊', '小兔', '小猴', '小狗', '小猫'] }
  ]
  var WMAX = 6

  function pickNames(n) {
    return U.shuffled(U.pick(SETS).items).slice(0, n)
  }
  function sum(w, idx) {
    return idx.reduce(function (a, i) { return a + w[i] }, 0)
  }
  function sgn(x) { return x > 0 ? 1 : x < 0 ? -1 : 0 }
  /* 天平：L、R 是东西的下标；s = 1 左沉，-1 右沉，0 平 */
  function scale(w, L, R) {
    if (U.rand() < 0.5) { var t = L; L = R; R = t }
    return { L: L, R: R, s: sgn(sum(w, L) - sum(w, R)) }
  }

  /* 枚举每样东西 1～WMAX 的所有重量，留下和天平都对得上的；f 的结果全都一样才返回它，否则 undefined */
  function canTell(n, scales, f) {
    var w = []
    var val
    var seen = false
    var ok = true
    function rec(k) {
      if (!ok) return
      if (k === n) {
        for (var i = 0; i < scales.length; i++) {
          var sc = scales[i]
          if (sgn(sum(w, sc.L) - sum(w, sc.R)) !== sc.s) return
        }
        var v = f(w)
        if (!seen) { seen = true; val = v } else if (v !== val) ok = false
        return
      }
      for (var x = 1; x <= WMAX; x++) { w[k] = x; rec(k + 1) }
    }
    rec(0)
    return seen && ok ? val : undefined
  }

  function argBy(w, better) {
    var best = 0
    for (var i = 1; i < w.length; i++) if (better(w[i], w[best])) best = i
    /* 并列最重 / 最轻：答案不唯一，返回 -1 */
    for (var j = 0; j < w.length; j++) if (j !== best && w[j] === w[best]) return -1
    return best
  }
  function heaviest(w) { return argBy(w, function (a, b) { return a > b }) }
  function lightest(w) { return argBy(w, function (a, b) { return a < b }) }

  function scaleKey(sc) {
    return sc.L.join('+') + (sc.s > 0 ? '>' : sc.s < 0 ? '<' : '=') + sc.R.join('+')
  }
  function keyOf(variant, names, scales, ask) {
    return variant + ':' + names.join('/') + ':' + scales.map(scaleKey).join(',') + ':' + ask
  }

  /* ---------------- 画天平 ---------------- */

  var BW = 344
  var BH = 134

  function itemW(name) { return name.length * 15 + 12 }

  function panItems(names, idx, ex, ey) {
    var ws = idx.map(function (i) { return itemW(names[i]) })
    var total = ws.reduce(function (a, b) { return a + b }, 0) + (idx.length - 1) * 3
    var plate = Math.max(58, total + 14)
    var p = []
    /* 盘子：一块平板 + 下面一截短柱接在横梁端点上 */
    p.push('<line x1="' + ex + '" y1="' + ey + '" x2="' + ex + '" y2="' + (ey - 14) + '" stroke="#000" stroke-width="2"/>')
    p.push('<rect x="' + (ex - plate / 2) + '" y="' + (ey - 17) + '" width="' + plate + '" height="4" fill="#000"/>')
    var x = ex - total / 2
    idx.forEach(function (i, k) {
      var wd = ws[k]
      p.push('<rect x="' + x + '" y="' + (ey - 45) + '" width="' + wd + '" height="27" rx="5" fill="#fff" stroke="#000" stroke-width="1.5"/>')
      p.push('<text x="' + (x + wd / 2) + '" y="' + (ey - 26) + '" font-size="15" text-anchor="middle">' + names[i] + '</text>')
      x += wd + 3
    })
    return p.join('')
  }

  function balance(x0, y0, sc, names, label) {
    var cx = x0 + BW / 2
    var py = y0 + 68
    var half = 112
    var t = sc.s * 16 // 左沉：左端往下
    var p = []
    if (label) p.push('<text x="' + (x0 + 6) + '" y="' + (y0 + 16) + '" font-size="15" text-anchor="start">' + label + '</text>')
    /* 底座和立柱 */
    p.push('<path d="M' + (cx - 34) + ' ' + (y0 + 126) + ' L' + (cx + 34) + ' ' + (y0 + 126) + ' L' + (cx + 22) + ' ' + (y0 + 116) + ' L' + (cx - 22) + ' ' + (y0 + 116) + ' Z" fill="#fff" stroke="#000" stroke-width="1.6"/>')
    p.push('<line x1="' + cx + '" y1="' + py + '" x2="' + cx + '" y2="' + (y0 + 116) + '" stroke="#000" stroke-width="3"/>')
    /* 横梁 */
    p.push('<line x1="' + (cx - half) + '" y1="' + (py + t) + '" x2="' + (cx + half) + '" y2="' + (py - t) + '" stroke="#000" stroke-width="3.2"/>')
    p.push('<circle cx="' + cx + '" cy="' + py + '" r="4" fill="#fff" stroke="#000" stroke-width="1.6"/>')
    p.push(panItems(names, sc.L, cx - half, py + t))
    p.push(panItems(names, sc.R, cx + half, py - t))
    return p.join('')
  }

  function scalesSVG(scales, names) {
    var cols = scales.length > 1 ? 2 : 1
    var rows = Math.ceil(scales.length / cols)
    var W = cols * BW
    var H = rows * BH
    var many = scales.length > 1
    var p = ['<svg class="' + (rows > 1 ? 'fig-route' : 'fig-big') + '" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">']
    scales.forEach(function (sc, i) {
      p.push(balance((i % cols) * BW, Math.floor(i / cols) * BH, sc, names, many ? CIRC[i] : ''))
    })
    p.push('</svg>')
    return p.join('')
  }

  /* 一个天平用话说出来：「① 苹果 > 梨」（平了用 =；两边几样东西用 + 连） */
  function side(names, idx) {
    var c = {}
    var order = []
    idx.forEach(function (i) { if (!c[i]) { c[i] = 0; order.push(i) } c[i]++ })
    return order.map(function (i) { return (c[i] > 1 ? c[i] + ' 个' : '') + names[i] }).join(' + ')
  }
  function sayScale(sc, names, label) {
    var a = side(names, sc.L)
    var b = side(names, sc.R)
    var head = label ? label + ' ' : ''
    if (sc.s === 0) return head + a + ' = ' + b
    return head + (sc.s > 0 ? a + ' > ' + b : b + ' > ' + a)
  }

  function figStem(stem, scales, names) {
    return stem + '<div>' + scalesSVG(scales, names) + '</div>'
  }

  /* ---------------- 变式①：看天平 ---------------- */

  function distinctWeights(n) {
    return U.shuffled([1, 2, 3, 4, 5, 6]).slice(0, n)
  }

  function genScale(s) {
    var d = s.difficulty || 'L1'
    var names
    var w
    var scales
    var ask
    var stem
    var answer
    var ansSuffix
    var think
    var trap
    var steps = []

    if (d === 'L1') {
      names = pickNames(2)
      var equal = U.rand() < 0.2
      w = equal ? [3, 3] : distinctWeights(2)
      scales = [scale(w, [0], [1])]
      var heavy = U.rand() < 0.5
      ask = (heavy ? 'cmpH' : 'cmpL') + '0-1'
      stem = '看天平，' + names[0] + '和' + names[1] + '哪个' + (heavy ? '重' : '轻') + '？'
      var sc = scales[0]
      var down = sc.s > 0 ? sc.L[0] : sc.R[0]
      var up = sc.s > 0 ? sc.R[0] : sc.L[0]
      /* 答案栏统一「答：____。」：平了的那道如果单独少个「重」字，等于把答案告诉孩子 */
      answer = sc.s === 0 ? '一样重' : heavy ? names[down] + '重' : names[up] + '轻'
      ansSuffix = '。'
      think = '天平平了，两边一样重；歪了，沉下去的那边重，翘起来的那边轻。'
      steps.push({ tag: '看一看', text: sc.s === 0 ? '天平平平的，' + names[0] + '和' + names[1] + '一样重。' : names[down] + '那边沉下去，' + names[up] + '那边翘起来：' + names[down] + ' > ' + names[up] + '。' })
      trap = '翘得高的不是重，是轻！'
    } else if (d === 'L2') {
      names = pickNames(3)
      w = distinctWeights(3)
      var pairs = U.shuffled([[0, 1], [0, 2], [1, 2]]).slice(0, 2)
      scales = pairs.map(function (pr) { return scale(w, [pr[0]], [pr[1]]) })
      var askMax = U.rand() < 0.5
      var real = askMax ? heaviest(w) : lightest(w)
      if (canTell(3, scales, askMax ? heaviest : lightest) !== real) return null
      ask = askMax ? 'max' : 'min'
      stem = '看两个天平，' + names.join('、') + '里哪个最' + (askMax ? '重' : '轻') + '？'
      answer = names[real]
      ansSuffix = '最' + (askMax ? '重' : '轻') + '。'
      think = '先把每个天平写成「重 > 轻」，再把两句话连起来看。'
      steps.push({ tag: '写一写', text: scales.map(function (x, i) { return sayScale(x, names, CIRC[i]) }).join('；') + '。' })
      steps.push({ tag: '比一比', text: linkText(scales, w, names, askMax, real) })
      trap = '只看一个天平不够：在这个天平上重，换一个天平可能就是轻的。'
    } else {
      names = pickNames(3)
      if (U.rand() < 0.5) {
        /* 借「一样重」比：0 和 1 一样重，2 和其中一个比 */
        var a = U.randInt(2, 5)
        var c = U.rand() < 0.5 ? a + 1 : a - 1
        w = [a, a, c]
        var via = U.randInt(0, 1)
        scales = U.shuffled([scale(w, [0], [1]), scale(w, [via], [2])])
        var other = 1 - via
        ask = 'cmpH' + other + '-2'
        var tellEq = canTell(3, scales, function (x) { return sgn(x[other] - x[2]) })
        if (tellEq !== sgn(w[other] - w[2]) || tellEq === 0) return null
        stem = '看两个天平，' + names[other] + '和' + names[2] + '哪个重？'
        answer = w[other] > w[2] ? names[other] : names[2]
        ansSuffix = '重。'
        think = names[other] + '和' + names[2] + '没在同一个天平上，要借' + names[via] + '来比。'
        steps.push({ tag: '写一写', text: scales.map(function (x, i) { return sayScale(x, names, CIRC[i]) }).join('；') + '。' })
        steps.push({ tag: '比一比', text: names[via] + '和' + names[other] + '一样重，' + names[2] + (w[2] > a ? '比' + names[via] + '重，所以也比' + names[other] + '重' : '比' + names[via] + '轻，所以也比' + names[other] + '轻') + '。' })
        trap = '天平平了不是「没用」：一样重的东西可以拿来顶替。'
      } else {
        /* 串起来比：0 > 1 > 2 的链只给相邻两个天平，问头和尾 */
        w = distinctWeights(3).sort(function (x, y) { return y - x })
        scales = U.shuffled([scale(w, [0], [1]), scale(w, [1], [2])])
        var order = U.shuffled([0, 2])
        ask = 'cmpH' + order[0] + '-' + order[1]
        if (canTell(3, scales, function (x) { return sgn(x[0] - x[2]) }) !== 1) return null
        stem = '看两个天平，' + names[order[0]] + '和' + names[order[1]] + '哪个重？'
        answer = names[0]
        ansSuffix = '重。'
        think = names[0] + '和' + names[2] + '没在同一个天平上，要借中间的' + names[1] + '来比。'
        steps.push({ tag: '写一写', text: scales.map(function (x, i) { return sayScale(x, names, CIRC[i]) }).join('；') + '。' })
        steps.push({ tag: '串一串', text: names[0] + ' > ' + names[1] + ' > ' + names[2] + '，所以' + names[0] + '比' + names[2] + '重。' })
        trap = '两样东西没放在一起称，也能比：找它们都比过的那一个。'
      }
    }
    var head = [{ tag: '想一想', text: think }]
    return {
      topic: 'bizhong',
      variant: 'scale',
      stem: stem,
      stemHTML: figStem(stem, scales, names),
      answer: answer,
      unit: '',
      ansLabel: '答：',
      ansSuffix: ansSuffix,
      workLabel: '写一写',
      solution: head.concat(steps, [
        { tag: '小心陷阱', text: trap },
        { tag: '答', text: answer + ansSuffix }
      ]),
      key: keyOf('scale', names, scales, ask)
    }
  }

  /* 两个天平找最重 / 最轻时的「连起来」说法 */
  function linkText(scales, w, names, askMax, win) {
    var rel = scales.map(function (sc) {
      var h = sc.s > 0 ? sc.L[0] : sc.R[0]
      var l = sc.s > 0 ? sc.R[0] : sc.L[0]
      return [h, l]
    })
    var mid = -1
    if (rel[0][1] === rel[1][0]) mid = 0
    else if (rel[1][1] === rel[0][0]) mid = 1
    if (mid >= 0) {
      var top = rel[mid][0]
      var m = rel[mid][1]
      var bot = rel[1 - mid][1]
      return '串起来：' + names[top] + ' > ' + names[m] + ' > ' + names[bot] + '，最' + (askMax ? '重的是 ' + names[top] : '轻的是 ' + names[bot]) + '。'
    }
    var others = [0, 1, 2].filter(function (i) { return i !== win }).map(function (i) { return names[i] })
    return names[win] + '比' + others[0] + (askMax ? '重' : '轻') + '，也比' + others[1] + (askMax ? '重' : '轻') + '，所以' + names[win] + '最' + (askMax ? '重' : '轻') + '。'
  }

  /* ---------------- 变式②：几个天平排顺序 ---------------- */

  function genSort(s) {
    var d = s.difficulty || 'L1'
    var n = d === 'L1' ? 3 : d === 'L2' ? 4 : 5
    var names = pickNames(n)
    var w = distinctWeights(n)
    var byW = w.map(function (x, i) { return i }).sort(function (a, b) { return w[b] - w[a] })
    var scales = []
    for (var i = 0; i + 1 < n; i++) scales.push(scale(w, [byW[i]], [byW[i + 1]]))
    scales = U.shuffled(scales)
    /* 天平顺序不能正好就是排好的顺序，不然抄下来就是答案 */
    var heavySeq = scales.map(function (sc) { return sc.s > 0 ? sc.L[0] : sc.R[0] })
    if (heavySeq.every(function (h, k) { return h === byW[k] })) return null
    var desc = d === 'L1' ? true : U.rand() < 0.5
    var seqStr = function (x) {
      var o = x.map(function (v, k) { return k }).sort(function (a, b) { return x[b] - x[a] })
      if (!desc) o.reverse()
      return o.join(',')
    }
    if (canTell(n, scales, seqStr) !== seqStr(w)) return null
    var seq = desc ? byW : byW.slice().reverse()
    var answer = seq.map(function (k) { return names[k] }).join(' → ')
    var dir = desc ? '从重到轻' : '从轻到重'
    var chain = byW.map(function (k) { return names[k] }).join(' > ')
    var stem = '看' + (n - 1 === 2 ? '两' : n - 1 === 3 ? '三' : '四') + '个天平，把' + names.join('、') + dir + '排一排。'
    var sol = [
      { tag: '想一想', text: '把每个天平写成「重 > 轻」，再像串糖葫芦一样，接得上的串在一起。' },
      { tag: '写一写', text: scales.map(function (x, k) { return sayScale(x, names, CIRC[k]) }).join('；') + '。' },
      { tag: '串一串', text: chain + '。' }
    ]
    if (n >= 4) sol.push({ tag: '验一验', text: names[byW[0]] + '每次都在沉下去的那边，最重；' + names[byW[n - 1]] + '每次都在翘起来的那边，最轻 ✓' })
    sol.push({ tag: '小心陷阱', text: desc ? '翘起来的是轻的，写「>」时别把轻的写在前面。' : '问的是从轻到重：先按「>」串好，再倒过来写。' })
    sol.push({ tag: '答', text: dir + '是 ' + answer + '。' })
    return {
      topic: 'bizhong',
      variant: 'sort',
      stem: stem,
      stemHTML: figStem(stem, scales, names),
      answer: answer,
      unit: '',
      ansLabel: '答：' + dir + '是',
      ansSuffix: '。',
      workLabel: '写一写',
      solution: sol,
      key: keyOf('sort', names, scales, desc ? 'desc' : 'asc')
    }
  }

  /* ---------------- 变式③：先拿掉一样的 ---------------- */

  function repeat(i, k) {
    var a = []
    for (var j = 0; j < k; j++) a.push(i)
    return a
  }

  function genCancel(s) {
    var d = s.difficulty || 'L1'
    var mode = d === 'L1' ? 'many' : d === 'L2' ? U.pick(['many', 'drop']) : 'drop3'
    var names
    var w
    var scales
    var ask
    var stem
    var answer
    var ansSuffix = '重。'
    var sol

    if (mode === 'many') {
      /* 两个（三个）A 还没有一个 B 重 ⇒ 一个 A 当然比 B 轻；反过来也一样 */
      names = pickNames(2)
      var k = d === 'L1' ? 2 : U.randInt(2, 3)
      var lightMany = U.rand() < 0.5 // true：k 个 0 号 < 1 个 1 号
      if (lightMany) {
        w = [1, U.randInt(k + 1, WMAX)]
        scales = [scale(w, repeat(0, k), [1])]
      } else {
        w = [U.randInt(k + 1, WMAX), 1]
        scales = [scale(w, [0], repeat(1, k))]
      }
      var real = sgn(w[0] - w[1])
      if (canTell(2, scales, function (x) { return sgn(x[0] - x[1]) }) !== real) return null
      ask = 'cmpH0-1'
      var big = real > 0 ? 0 : 1
      var small = 1 - big
      answer = names[big]
      stem = '看天平，1 个' + names[0] + '和 1 个' + names[1] + '，哪个重？'
      sol = [
        { tag: '想一想', text: k + ' 个' + names[small] + '还没有 1 个' + names[big] + '重，那 1 个' + names[small] + '就更轻了。' },
        { tag: '写一写', text: sayScale(scales[0], names, '') + '。' },
        { tag: '比一比', text: '1 个' + names[big] + ' > ' + k + ' 个' + names[small] + '，所以 1 个' + names[big] + ' > 1 个' + names[small] + '。' },
        { tag: '小心陷阱', text: names[small] + '放了 ' + k + ' 个才翘起来，不是' + names[small] + '重！东西个数不一样，要想一想。' }
      ]
    } else if (mode === 'drop') {
      /* 两边都有一个 C，拿掉后剩 X 对 Y；Y 可以就是 C（苹果+葡萄 对 苹果+苹果） */
      var same = U.rand() < 0.5
      if (same) {
        names = pickNames(2) // 0 = X，1 = C
        w = distinctWeights(2)
        scales = [scale(w, [1, 0], [1, 1])]
        ask = 'cmpH0-1'
        answer = w[0] > w[1] ? names[0] : names[1]
        stem = '看天平，' + names[0] + '和' + names[1] + '哪个重？'
        if (canTell(2, scales, function (x) { return sgn(x[0] - x[1]) }) !== sgn(w[0] - w[1])) return null
        sol = [
          { tag: '想一想', text: '两边都有 1 个' + names[1] + '，一起拿掉，天平还是这样歪着。' },
          { tag: '写一写', text: sayScale(scales[0], names, '') + '。' },
          { tag: '拿一拿', text: '两边各拿掉 1 个' + names[1] + '，剩下' + names[0] + '对 1 个' + names[1] + '：' + (w[0] > w[1] ? names[0] + ' > ' + names[1] : names[1] + ' > ' + names[0]) + '。' },
          { tag: '小心陷阱', text: '别数个数：两边都是 2 个，比的是剩下那一个。' }
        ]
      } else {
        names = pickNames(3) // 0 = X，1 = Y，2 = C
        var xy = distinctWeights(2)
        w = [xy[0], xy[1], U.randInt(1, WMAX)]
        scales = [scale(w, [2, 0], [2, 1])]
        ask = 'cmpH0-1'
        answer = w[0] > w[1] ? names[0] : names[1]
        stem = '看天平，' + names[0] + '和' + names[1] + '哪个重？'
        if (canTell(3, scales, function (x) { return sgn(x[0] - x[1]) }) !== sgn(w[0] - w[1])) return null
        sol = [
          { tag: '想一想', text: '两边都有 1 个' + names[2] + '，一起拿掉，天平还是这样歪着。' },
          { tag: '写一写', text: sayScale(scales[0], names, '') + '。' },
          { tag: '拿一拿', text: '拿掉' + names[2] + '，剩下' + names[0] + '对' + names[1] + '：' + (w[0] > w[1] ? names[0] + ' > ' + names[1] : names[1] + ' > ' + names[0]) + '。' },
          { tag: '小心陷阱', text: names[2] + '在两边都有，它多重都不影响，别被它干扰。' }
        ]
      }
    } else {
      /* L3：三样东西两两配对上天平，每个天平两边都有第三样；拿掉后排出最重 / 最轻 */
      names = pickNames(3)
      w = distinctWeights(3)
      var pairs = U.shuffled([[0, 1], [0, 2], [1, 2]]).slice(0, 2)
      scales = pairs.map(function (pr) {
        var c = 3 - pr[0] - pr[1]
        return scale(w, U.shuffled([c, pr[0]]), U.shuffled([c, pr[1]]))
      })
      var askMax = U.rand() < 0.5
      var win = askMax ? heaviest(w) : lightest(w)
      if (canTell(3, scales, askMax ? heaviest : lightest) !== win) return null
      ask = askMax ? 'max' : 'min'
      stem = '看两个天平，' + names.join('、') + '里哪个最' + (askMax ? '重' : '轻') + '？'
      answer = names[win]
      ansSuffix = '最' + (askMax ? '重' : '轻') + '。'
      var left = scales.map(function (sc) {
        var c = sc.L.filter(function (i) { return sc.R.indexOf(i) >= 0 })[0]
        var a = sc.L.filter(function (i) { return i !== c })[0]
        var b = sc.R.filter(function (i) { return i !== c })[0]
        return { s: sc.s, L: [a], R: [b], c: c }
      })
      sol = [
        { tag: '想一想', text: '每个天平两边都有一样的东西，先拿掉，再比剩下的。' },
        { tag: '拿一拿', text: left.map(function (x, i) { return CIRC[i] + ' 拿掉' + names[x.c] + '：' + sayScale(x, names, '') }).join('；') + '。' },
        { tag: '比一比', text: linkText(left, w, names, askMax, win) },
        { tag: '小心陷阱', text: '两边东西一样多，别以为天平该平；拿掉一样的再看。' }
      ]
    }
    sol.push({ tag: '答', text: answer + ansSuffix })
    return {
      topic: 'bizhong',
      variant: 'cancel',
      stem: stem,
      stemHTML: figStem(stem, scales, names),
      answer: answer,
      unit: '',
      ansLabel: '答：',
      ansSuffix: ansSuffix,
      workLabel: '写一写',
      solution: sol,
      key: keyOf('cancel', names, scales, ask)
    }
  }

  /* ---------------- 讲解页里的小插图 ---------------- */

  function one(sc, names) {
    return '<svg viewBox="0 0 ' + BW + ' ' + BH + '" width="' + (BW * 0.7) + '" height="' + (BH * 0.7) + '">' + balance(0, 0, sc, names, '') + '</svg>'
  }

  /* 先想一想：跷跷板 */
  var HOOK_SVG = (function () {
    var p = ['<svg viewBox="0 0 240 110" width="240" height="110">']
    p.push('<path d="M106 100 L134 100 L120 76 Z" fill="#fff" stroke="#000" stroke-width="2"/>')
    p.push('<line x1="20" y1="94" x2="220" y2="58" stroke="#000" stroke-width="4"/>')
    function kid(x, y, label) {
      p.push('<circle cx="' + x + '" cy="' + (y - 34) + '" r="9" fill="#fff" stroke="#000" stroke-width="2"/>')
      p.push('<line x1="' + x + '" y1="' + (y - 25) + '" x2="' + x + '" y2="' + (y - 6) + '" stroke="#000" stroke-width="2.4"/>')
      p.push('<line x1="' + (x - 9) + '" y1="' + (y - 18) + '" x2="' + (x + 9) + '" y2="' + (y - 18) + '" stroke="#000" stroke-width="2"/>')
      p.push('<text x="' + x + '" y="' + (y - 50) + '" font-size="13" text-anchor="middle">' + label + '</text>')
    }
    kid(40, 90, '牛牛')
    kid(200, 61, '丁丁')
    p.push('</svg>')
    return p.join('')
  })()

  var KNOW_EQ = one({ L: [0], R: [1], s: 0 }, ['红球', '黄球'])
  var KNOW_TILT = one({ L: [0], R: [1], s: 1 }, ['红球', '黄球'])

  /* 弹簧：挂得越重，拉得越长（学而思「探索知识巅峰」，只讲不出题） */
  var SPRING_FIG = (function () {
    var p = ['<svg viewBox="0 0 170 110" width="170" height="110">']
    p.push('<line x1="10" y1="6" x2="160" y2="6" stroke="#000" stroke-width="3"/>')
    function spring(x, len, label) {
      var coils = 6
      var d = 'M' + x + ' 6 L' + x + ' 12'
      var step = (len - 12) / coils
      for (var i = 0; i < coils; i++) {
        d += ' L' + (x + 8) + ' ' + (12 + step * (i + 0.25)) + ' L' + (x - 8) + ' ' + (12 + step * (i + 0.75)) + ' L' + x + ' ' + (12 + step * (i + 1))
      }
      p.push('<path d="' + d + '" fill="none" stroke="#000" stroke-width="1.6"/>')
      p.push('<circle cx="' + x + '" cy="' + (len + 10) + '" r="10" fill="#fff" stroke="#000" stroke-width="2"/>')
      p.push('<text x="' + x + '" y="' + (len + 14) + '" font-size="11" text-anchor="middle">' + label + '</text>')
    }
    spring(50, 40, '①')
    spring(120, 80, '②')
    p.push('</svg>')
    return p.join('')
  })()

  var MOVE1_FIG = one({ L: [0], R: [1], s: -1 }, ['苹果', '梨'])
  var MOVE3_FIG = one({ L: [2, 0], R: [2, 1], s: 1 }, ['桃', '梨', '苹果'])

  var BIZHONG = {
    id: 'bizhong',
    no: 'B02',
    stage: 'L1B',
    name: '推理比较：比轻重',
    lesson: {
      v2: true,
      title: '推理比较：比轻重 · 方法讲解',
      goal: '天平会说话。今天学三招：看懂天平，把几个天平串起来，先拿掉一样的。',
      sections: [
        {
          kind: 'hook',
          heading: '先想一想',
          paras: [
            '牛牛和丁丁坐跷跷板，牛牛那头落在地上，丁丁被翘到半空。谁重？',
            '牛牛重！沉下去的那边重，翘起来的那边轻。天平也是这样。'
          ],
          figHTML: HOOK_SVG
        },
        {
          kind: 'know',
          heading: '先认识',
          cards: [
            { title: '平了：一样重', text: '横梁平平的，不往哪边歪，两边一样重。', figHTML: KNOW_EQ },
            { title: '歪了：下沉的重', text: '红球那边沉下去，红球重；黄球那边翘起来，黄球轻。', figHTML: KNOW_TILT },
            { title: '弹簧也会说话', text: '挂上东西，弹簧拉得越长，东西越重：② 比 ① 重。', figHTML: SPRING_FIG }
          ]
        },
        {
          kind: 'move',
          name: '看天平，说轻重',
          tip: '一个天平就是一句话：谁比谁重。',
          steps: [
            '先看平不平：平了，两边一样重。',
            '歪了：沉下去的重，翘起来的轻，写成「重 > 轻」。',
            '两样东西没在一起称：找它们都比过的那一个，借它来比。'
          ],
          pitfall: '翘得高的是轻的，不是重的。',
          figHTML: MOVE1_FIG,
          variants: ['scale']
        },
        {
          kind: 'move',
          name: '串糖葫芦',
          tip: '好几个天平、好几样东西，要排出谁重谁轻。',
          steps: [
            '每个天平写一句「重 > 轻」。',
            '接得上的串起来：A > B，B > C，就是 A > B > C。',
            '验一验：最重的每次都沉下去，最轻的每次都翘起来。'
          ],
          pitfall: '问「从轻到重」时，串好后倒过来写。',
          variants: ['sort']
        },
        {
          kind: 'move',
          name: '先拿掉一样的',
          tip: '天平两边放了好几样东西时，先把两边都有的拿掉。',
          steps: [
            '两边都有一样的东西，一起拿掉，天平还是这样歪着。',
            '比剩下的：哪边沉，剩下的那样就重。',
            '2 个 A 还没有 1 个 B 重，那 1 个 A 更比 B 轻。'
          ],
          pitfall: '别光数个数：东西多的那边不一定重。',
          figHTML: MOVE3_FIG,
          variants: ['cancel']
        },
        {
          kind: 'pick',
          heading: '用哪一招？',
          rows: [
            ['一两个天平，问谁重、谁最重', '看天平，说轻重', ['scale']],
            ['好几个天平，排出顺序', '串糖葫芦', ['sort']],
            ['天平两边放了好几样东西', '先拿掉一样的', ['cancel']]
          ]
        },
        { kind: 'chant', chant: '天平会说话：平了一样重，沉的重、翘的轻；几个天平串成串，两边一样先拿掉。' }
      ]
    },
    variants: [
      {
        id: 'scale',
        setting: 'vBzScale',
        label: '看天平（谁重谁轻）',
        idea: '平了一样重，歪了沉下去的重、翘起来的轻；两样东西没一起称，就借它们都比过的那一个来比。',
        gen: genScale
      },
      {
        id: 'sort',
        setting: 'vBzSort',
        label: '几个天平排顺序',
        idea: '每个天平写成「重 > 轻」，接得上的串成一串；问从轻到重就倒过来写。',
        gen: genSort
      },
      {
        id: 'cancel',
        setting: 'vBzCancel',
        label: '先拿掉一样的（两边多样东西）',
        idea: '两边都有的东西先拿掉再比剩下的；几个 A 还没有 1 个 B 重，1 个 A 更比 B 轻。',
        def: false,
        gen: genCancel
      }
    ],
    generate: function (s) {
      return U.generateFrom(BIZHONG.variants, s)
    },
    titleFor: function (s) {
      return '推理比较：比轻重练习 · ' + U.DIFF_LABEL[s.difficulty || 'L1']
    }
  }

  root.SumSum.aoshu.topics.bizhong = BIZHONG
  root.SumSum.aoshu.topicList.push(BIZHONG)
})(typeof window !== 'undefined' ? window : globalThis)
