/**
 * 知识点「B10 间隔问题（补充）」（L1 补充，对照学而思 1 级第 7 讲好方法 3、5，练 7～9、练 13；
 * 拆题笔记 docs/xes-1ji/07-左右脑开发1.md）。原课 16 间隔问题（锯木头、爬楼梯、排一排）不动，这里只放原课没有的：
 * 变式：①看了几页（头尾都算：末 − 首 + 1）②晾手帕要几个夹子（挨着挂共用夹子：块数 + 1；分开挂：块数 × 2）
 *       ③对折剪绳子（对折 k 次剪 m 刀：段数 = 剪开的地方 + 1，剪开的地方 = 股数 × 刀数）。
 * key 带全部参数，tools/check-aoshu-gen.js 的 checkJiangebc 独立重算（剪绳子把绳子展开逐个找剪开的点）。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  function f2(n) { return +n.toFixed(2) }
  function txt(x, y, s, size, anchor) {
    return '<text x="' + f2(x) + '" y="' + f2(y) + '" font-size="' + (size || 9) + '" text-anchor="' + (anchor || 'middle') + '">' + s + '</text>'
  }

  /* ---------------- ①看了几页 ---------------- */
  var BOOKS = ['故事书', '绘本', '科普书', '童话书', '漫画书']
  function pagesSVG(a, b, style) {
    /* 一格一页；页数多了中间用省略号 */
    var n = b - a + 1, show = n <= 12 ? null : [a, a + 1, a + 2, null, b - 2, b - 1, b]
    var list = show || []
    if (!show) for (var p = a; p <= b; p++) list.push(p)
    var W = list.length * 18 + 8
    var s = ['<svg ' + (style ? 'style="' + style + '"' : '') + ' viewBox="0 0 ' + W + ' 40" width="' + W * 1.6 + '" height="64">']
    list.forEach(function (p, i) {
      var x = 4 + i * 18
      if (p === null) { s.push(txt(x + 8, 22, '…', 10)); return }
      s.push('<rect x="' + x + '" y="6" width="15" height="20" rx="1.5" fill="#fff" stroke="#000" stroke-width="1"/>')
      s.push(txt(x + 7.5, 20, p, 7.5))
    })
    s.push('<path d="M4 31H' + (W - 4) + '" stroke="#000" stroke-width="0.8"/><path d="M4 28V34M' + (W - 4) + ' 28V34" stroke="#000" stroke-width="0.8"/>')
    s.push(txt(W / 2, 39, '两头都算：' + n + ' 页', 7))
    s.push('</svg>')
    return s.join('')
  }
  function genPage(s) {
    var d = s.difficulty || 'L1'
    var max = d === 'L1' ? 20 : d === 'L2' ? 60 : 120
    var book = U.pick(BOOKS), name = U.pickTwoNames()[0]
    var kind = d === 'L1' ? 'count' : U.pick(d === 'L2' ? ['count', 'count', 'left'] : ['count', 'left', 'last'])
    var a, b, ans, stem, sol = [], key
    if (kind === 'count') {
      a = U.randInt(2, max - 4); b = U.randInt(a + 2, Math.min(max, a + (d === 'L1' ? 9 : 30)))
      ans = b - a + 1
      stem = name + '看一本' + book + '，从第 ' + a + ' 页看到第 ' + b + ' 页，一共看了几页？'
      sol.push({ tag: '想一想', text: '第 ' + a + ' 页和第 ' + b + ' 页都看了，两头都要算上。' + b + ' − ' + a + ' 算的是中间隔了几步，还要再加上开头那一页。' })
      sol.push({ tag: '列算式', text: b + ' − ' + a + ' + 1 = ' + ans + '（页）' })
      sol.push({ tag: '小心陷阱', text: '只算 ' + b + ' − ' + a + ' = ' + (b - a) + '，就把第 ' + a + ' 页漏掉了。' })
      sol.push({ tag: '答', text: '一共看了 ' + ans + ' 页。' })
      key = 'page:count,' + a + ',' + b
    } else if (kind === 'left') {
      /* 计划看 N 页（从第 1 页起），已经看了第 a 页到第 b 页 —— 讲义练 9 */
      var N = U.randInt(10, Math.min(max, 40))
      a = U.randInt(1, N - 5); b = U.randInt(a + 2, N - 2)
      var done = b - a + 1
      ans = N - done
      stem = name + '计划今天看 ' + N + ' 页' + book + '，已经看了第 ' + a + ' 页到第 ' + b + ' 页。还要看几页？'
      sol.push({ tag: '想一想', text: '先算已经看了几页：第 ' + a + ' 页到第 ' + b + ' 页，两头都算，' + b + ' − ' + a + ' + 1 = ' + done + '（页）。' })
      sol.push({ tag: '列算式', text: N + ' − ' + done + ' = ' + ans + '（页）' })
      sol.push({ tag: '小心陷阱', text: '已经看的不是 ' + (b - a) + ' 页，第 ' + a + ' 页也看了。' })
      sol.push({ tag: '答', text: '还要看 ' + ans + ' 页。' })
      key = 'page:left,' + a + ',' + b + ',' + N
    } else {
      /* 从第 a 页开始看了 n 页，最后看的是第几页 */
      a = U.randInt(5, max - 30)
      var n = U.randInt(4, 25)
      b = a + n - 1
      ans = b
      stem = name + '从' + book + '的第 ' + a + ' 页开始看，一口气看了 ' + n + ' 页。最后看的是第几页？'
      sol.push({ tag: '想一想', text: '第 ' + a + ' 页本身就是看的第 1 页，往后再翻 ' + (n - 1) + ' 页就是最后一页。' })
      sol.push({ tag: '列算式', text: a + ' + ' + n + ' − 1 = ' + b + '（页）' })
      sol.push({ tag: '验一验', text: '第 ' + a + ' 页到第 ' + b + ' 页：' + b + ' − ' + a + ' + 1 = ' + n + '（页）✓' })
      sol.push({ tag: '小心陷阱', text: a + ' + ' + n + ' = ' + (a + n) + ' 多算了 1 页 —— 开头那页已经算在 ' + n + ' 页里了。' })
      sol.push({ tag: '答', text: '最后看的是第 ' + b + ' 页。' })
      key = 'page:last,' + a + ',' + n
    }
    return {
      topic: 'jiangebc',
      variant: 'page',
      stem: stem,
      diagramHTML: '<div class="sol-diagram">' + pagesSVG(a, b, 'height:14mm;width:auto') + '</div>',
      answer: ans,
      unit: '',
      ansLabel: kind === 'last' ? '答：最后看的是第' : kind === 'left' ? '答：还要看' : '答：一共看了',
      ansSuffix: '页。',
      workLabel: '列算式',
      solution: sol,
      key: key
    }
  }

  /* ---------------- ②晾手帕要几个夹子 ---------------- */
  /* together：挨着挂（相邻两块共用一个夹子）；apart：一块一块分开挂（每块 2 个） */
  function clipsSVG(n, together, style) {
    /* 最多画 5 块，再多中间画省略号 */
    var m = Math.min(n, 5), cut = n > 5
    var w = 22, gap = together ? 0 : 8
    var W = 10 + m * w + (m - 1) * gap + (cut ? 16 : 0) + 10
    var s = ['<svg ' + (style ? 'style="' + style + '"' : '') + ' viewBox="0 0 ' + W + ' 40" width="' + W * 1.6 + '" height="64">']
    s.push('<path d="M2 8H' + (W - 2) + '" stroke="#000" stroke-width="1"/>')
    function clip(cx) { s.push('<rect x="' + f2(cx - 2) + '" y="4" width="4" height="9" rx="1" fill="#000"/>') }
    var x = 10
    for (var i = 0; i < m; i++) {
      if (cut && i === m - 1) { s.push(txt(x + 6, 24, '…', 10)); x += 16 }
      s.push('<rect x="' + x + '" y="9" width="' + w + '" height="20" fill="#eee" stroke="#000" stroke-width="1"/>')
      if (!together || i === 0 || (cut && i === m - 1)) clip(x)
      clip(x + w)
      x += w + gap
    }
    s.push(txt(W / 2, 38, together ? '挨着挂：夹子比块数多 1' : '分开挂：每块 2 个', 7))
    s.push('</svg>')
    return s.join('')
  }
  function genClip(s) {
    var d = s.difficulty || 'L1'
    var max = d === 'L1' ? 9 : d === 'L2' ? 20 : 40
    var kind = d === 'L1' ? 'min' : U.pick(d === 'L2' ? ['min', 'max'] : ['min', 'max', 'back'])
    var name = U.pickTwoNames()[0]
    var thing = U.pick(['手帕', '毛巾', '小方巾'])
    var unitW = '块'
    var stem, ans, sol = [], key, n, c
    if (kind === 'back') {
      c = U.randInt(5, max)
      ans = c - 1
      stem = '晾' + thing + '时，每' + unitW + '的两个角都要用夹子夹住，挨着的两' + unitW + '可以共用一个夹子。' + name + '有 ' + c + ' 个夹子，最多能晾几' + unitW + '？'
      sol.push({ tag: '想一想', text: '挨着挂最省夹子：第 1 ' + unitW + '用 2 个，以后每多 1 ' + unitW + '只多用 1 个 —— 夹子总比' + thing + '多 1。' })
      sol.push({ tag: '列算式', text: c + ' − 1 = ' + ans + '（' + unitW + '）' })
      sol.push({ tag: '验一验', text: ans + ' ' + unitW + '挨着挂，要 ' + ans + ' + 1 = ' + c + ' 个夹子 ✓' })
      sol.push({ tag: '答', text: '最多能晾 ' + ans + ' ' + unitW + '。' })
      key = 'clip:back,' + c
    } else {
      var min = kind === 'min'
      n = U.randInt(3, min ? max : Math.min(max, 15))
      ans = min ? n + 1 : n * 2
      if (!min && ans > 100) return null
      stem = '晾 ' + n + ' ' + unitW + thing + '，每' + unitW + '的两个角都要用夹子夹住' + (min ? '，挨着的两' + unitW + '可以共用一个夹子。最少要几个夹子？' : '。最多会用几个夹子？')
      if (min) {
        sol.push({ tag: '想一想', text: '要最少，就挨着挂，相邻两' + unitW + '共用中间那个夹子。第 1 ' + unitW + '用 2 个，以后每' + unitW + '只多用 1 个 —— 夹子比' + thing + '多 1。' })
        sol.push({ tag: '列算式', text: n + ' + 1 = ' + ans + '（个）' })
        sol.push({ tag: '小心陷阱', text: '算成 ' + n + ' × 2 = ' + (n * 2) + ' 是分开挂，那是最多，不是最少。' })
      } else {
        sol.push({ tag: '想一想', text: '要最多，就一' + unitW + '一' + unitW + '分开挂，谁也不共用，每' + unitW + '都用 2 个夹子。' })
        sol.push({ tag: '列算式', text: n + ' + ' + n + ' = ' + ans + '（个）' })
        sol.push({ tag: '小心陷阱', text: '挨着挂才是 ' + n + ' + 1 = ' + (n + 1) + ' 个，那是最少。' })
      }
      sol.push({ tag: '答', text: (min ? '最少要 ' : '最多会用 ') + ans + ' 个夹子。' })
      key = 'clip:' + kind + ',' + n
    }
    return {
      topic: 'jiangebc',
      variant: 'clip',
      stem: stem,
      diagramHTML: '<div class="sol-diagram">' + clipsSVG(kind === 'back' ? ans : n, kind !== 'max', 'height:14mm;width:auto') + '</div>',
      answer: ans,
      unit: '',
      ansLabel: kind === 'back' ? '答：最多能晾' : kind === 'min' ? '答：最少要' : '答：最多会用',
      ansSuffix: kind === 'back' ? unitW + '。' : '个。',
      workLabel: '列算式',
      solution: sol,
      key: key
    }
  }

  /* ---------------- ③对折剪绳子 ---------------- */
  /*
   * 对折 k 次 → 2^k 股；每刀在折好的绳子上离左端 x（0 < x < L）处，剪断每一股。
   * 展开以后第 j 股（0 起）占 [jL, (j+1)L]，偶数股正着、奇数股倒着：剪开点 = jL + x 或 (j+1)L − x。
   */
  function cutPoints(k, L, xs) {
    var strands = Math.pow(2, k), pts = []
    for (var j = 0; j < strands; j++) xs.forEach(function (x) { pts.push(j % 2 ? (j + 1) * L - x : j * L + x) })
    return pts.sort(function (a, b) { return a - b })
  }
  function foldSVG(k, xs, style) {
    /* 折好的绳子：2^k 股叠在一起，左右两头交替连着；竖虚线是剪刀 */
    var st = Math.pow(2, k), L = 80, gap = 6, X0 = 14
    var H = st * gap + 22
    var s = ['<svg ' + (style ? 'style="' + style + '"' : 'class="fig-big"') + ' viewBox="0 0 ' + (L + 2 * X0 + 4) + ' ' + H + '" width="' + (L + 2 * X0 + 4) * 1.6 + '" height="' + H * 1.6 + '">']
    var d = ''
    for (var j = 0; j < st; j++) {
      var y = 8 + j * gap
      d += (j ? '' : 'M' + X0 + ' ' + y) + (j % 2 ? 'H' + X0 : 'H' + (X0 + L))
      if (j < st - 1) {
        var ex = j % 2 ? X0 : X0 + L, dir = j % 2 ? -1 : 1
        d += 'C' + (ex + dir * 5) + ' ' + y + ' ' + (ex + dir * 5) + ' ' + (y + gap) + ' ' + ex + ' ' + (y + gap)
      }
    }
    s.push('<path d="' + d + '" fill="none" stroke="#000" stroke-width="1.6"/>')
    xs.forEach(function (x) {
      var cx = X0 + x * L / 12
      s.push('<path d="M' + cx + ' 3V' + (8 + (st - 1) * gap + 5) + '" stroke="#000" stroke-width="0.9" stroke-dasharray="2 1.5"/>')
      s.push(txt(cx, H - 2, '✂', 8))
    })
    s.push('</svg>')
    return s.join('')
  }
  function lineSVG(k, xs, style) {
    var st = Math.pow(2, k), L = 12, total = st * L, u = 200 / total
    var pts = cutPoints(k, L, xs)
    var s = ['<svg ' + (style ? 'style="' + style + '"' : '') + ' viewBox="0 0 214 26" width="342" height="42">']
    s.push('<path d="M7 10H207" stroke="#000" stroke-width="1.6"/>')
    pts.forEach(function (p) { s.push('<path d="M' + f2(7 + p * u) + ' 4V16" stroke="#000" stroke-width="1.2"/>') })
    s.push(txt(107, 25, '展开：' + pts.length + ' 个剪口，' + (pts.length + 1) + ' 段', 7))
    s.push('</svg>')
    return s.join('')
  }
  function genFold(s) {
    var d = s.difficulty || 'L1'
    var k, m
    if (d === 'L1') { k = 1; m = U.randInt(1, 2) }
    else if (d === 'L2') { k = U.pick([1, 1, 2]); m = k === 1 ? U.randInt(1, 3) : 1 }
    else { k = U.pick([1, 2, 2, 3]); m = k === 1 ? U.randInt(2, 4) : k === 2 ? U.randInt(1, 2) : 1 }
    /* 每刀的位置：12 等分里取，不碰两头的折弯 */
    var xs = m === 1 ? [6] : U.shuffled([2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, m).sort(function (a, b) { return a - b })
    var st = Math.pow(2, k), cuts = st * m, ans = cuts + 1
    var name = U.pickTwoNames()[0]
    var foldTxt = k === 1 ? '对折一次' : k === 2 ? '对折，再对折' : '连着对折三次'
    var stem = name + '把一根绳子' + foldTxt + '，然后' + (m === 1 ? '从中间剪一刀' : '剪了 ' + m + ' 刀（每刀都把所有的绳子剪断）') + '。绳子被剪成了几段？'
    var sol = [{ tag: '想一想', text: foldTxt + '，叠在一起的绳子有 ' + st + ' 股；剪一刀，' + st + ' 股都被剪断，绳子上就多出 ' + st + ' 个剪口。' }]
    sol.push({ tag: '列算式', text: (m === 1 ? '剪口：' + st + ' 个' : '剪口：' + m + ' 刀，每刀 ' + st + ' 个，一共 ' + cuts + ' 个') + '；段数比剪口多 1：' + cuts + ' + 1 = ' + ans + '（段）' })
    sol.push({ tag: '画一画', text: '把绳子展开，数一数剪口和段数（见下图）。' })
    sol.push({ tag: '小心陷阱', text: '不是 ' + (m + 1) + ' 段 —— 叠起来的每一股都被剪断了。' })
    sol.push({ tag: '答', text: '剪成了 ' + ans + ' 段。' })
    return {
      topic: 'jiangebc',
      variant: 'fold',
      stem: stem,
      stemHTML: stem + '<div>' + foldSVG(k, xs) + '</div>',
      diagramHTML: '<div class="sol-diagram">' + lineSVG(k, xs, 'height:12mm;width:auto') + '</div>',
      answer: ans,
      unit: '',
      ansLabel: '答：剪成了',
      ansSuffix: '段。',
      workLabel: '列算式',
      solution: sol,
      key: 'fold:' + k + ',' + xs.join('-')
    }
  }

  var JIANGEBC = {
    id: 'jiangebc',
    no: 'B10',
    stage: 'L1B',
    name: '间隔问题（补充）',
    lesson: {
      v2: true,
      title: '间隔问题补充 · 方法讲解',
      goal: '会数「两头都算」的页数和夹子，会把对折剪开的绳子展开来数。',
      sections: [
        {
          kind: 'hook',
          heading: '先想一想',
          paras: [
            '第 16 课我们学过锯木头、爬楼梯、排一排：段数和次数差 1。今天再学三种新的。',
            '从第 3 页看到第 7 页，是 7 − 3 = 4 页吗？数一数：3、4、5、6、7，是 5 页 —— 第 3 页也看了，两头都要算。'
          ],
          figHTML: pagesSVG(3, 7, 'height:16mm;width:auto')
        },
        {
          kind: 'move',
          name: '两头都算',
          tip: '头和尾都算上：末 − 首 + 1；共用的夹子只算一次。',
          steps: [
            '看了第几页到第几页：末页 − 首页，再加上开头那一页。',
            '晾东西挨着挂：相邻两块共用一个夹子，夹子比块数多 1。',
            '分开挂谁也不共用，每块 2 个夹子 —— 那是最多。'
          ],
          pitfall: '只算「末 − 首」会漏掉开头那页；挨着挂和分开挂，夹子数不一样。',
          figHTML: clipsSVG(4, true, 'height:14mm;width:auto'),
          variants: ['page', 'clip']
        },
        {
          kind: 'move',
          name: '展开画一画',
          tip: '对折几次就叠了几股，一刀剪断每一股。',
          steps: [
            '对折一次 2 股，再对折 4 股，再对折 8 股。',
            '剪一刀，每一股都断，剪口 = 股数；剪几刀就乘几次。',
            '展开来看：段数比剪口多 1。'
          ],
          pitfall: '不是「剪一刀变两段」—— 叠在一起的每一股都被剪断了。',
          figHTML: foldSVG(1, [6], 'height:16mm;width:auto') + ' ' + lineSVG(1, [6], 'height:10mm;width:auto'),
          variants: ['fold']
        },
        {
          kind: 'pick',
          heading: '用哪一招？',
          rows: [
            ['第几页到第几页、晾手帕夹子', '两头都算', ['page', 'clip']],
            ['绳子对折以后剪', '展开画一画', ['fold']]
          ]
        },
        { kind: 'chant', chant: '头尾都算加上一，挨着共用省夹子；对折几次叠几股，展开再数不糊涂。' }
      ]
    },
    variants: [
      {
        id: 'page',
        setting: 'vJbPage',
        label: '看了几页',
        idea: '第几页到第几页，两头都要算：末页 − 首页 + 1；还剩几页先算看了几页。',
        gen: genPage
      },
      {
        id: 'clip',
        setting: 'vJbClip',
        label: '晾手帕夹子',
        idea: '挨着挂共用夹子，夹子比块数多 1（最少）；分开挂每块 2 个（最多）。',
        gen: genClip
      },
      {
        id: 'fold',
        setting: 'vJbFold',
        label: '对折剪绳子',
        idea: '对折几次叠成几股，一刀剪断每一股：剪口 = 股数 × 刀数，段数 = 剪口 + 1。',
        gen: genFold
      }
    ],
    generate: function (s) {
      return U.generateFrom(JIANGEBC.variants, s)
    },
    titleFor: function (s) {
      return '间隔问题补充练习 · ' + U.DIFF_LABEL[s.difficulty || 'L1']
    }
  }

  JIANGEBC._cutPoints = cutPoints
  root.SumSum.aoshu.topics.jiangebc = JIANGEBC
  root.SumSum.aoshu.topicList.push(JIANGEBC)
})(typeof window !== 'undefined' ? window : globalThis)
