/**
 * 知识点「B09 蜗牛爬井」（L1 补充，对照学而思 1 级第 7 讲好方法 4、练 10～12，
 * 拆题笔记 docs/xes-1ji/07-左右脑开发1.md）。
 * 白天往上爬 a，晚上往下滑 b，一天一夜净爬 a − b；爬到顶就出去了，最后一天只上不下。
 * 变式：①第几天在哪 ②几天爬出 ③过河几次（最后一趟不用划回来，def: false）。
 * key 带全部参数，tools/check-aoshu-gen.js 的 checkWoniu 一天一天模拟、独立重算。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 一天一天模拟：返回第几天白天爬出 */
  function daysOut(H, a, b) {
    var h = 0
    for (var d = 1; d < 200; d++) {
      h += a
      if (h >= H) return d
      h -= b
    }
    return null
  }
  /* 「留出最后一天」的算法（讲解用）：(H − a) ÷ (a − b)，除不尽多一天，再 +1 */
  function byFormula(H, a, b) {
    var rest = H - a, net = a - b
    return Math.ceil(rest / net) + 1
  }

  var THEMES = [
    { id: 'jing', who: '小蜗牛', where: '一口井', dep: '井深', unit: '米', bottom: '井底', top: '井口', climb: '从井底往上爬', out: '爬出井口' },
    { id: 'gan', who: '一只蜗牛', where: '一根竹竿', dep: '竹竿高', unit: '节', bottom: '地面', top: '竿顶', climb: '从地面往上爬', out: '爬到竿顶' },
    { id: 'shu', who: '一只毛毛虫', where: '一棵小树', dep: '树高', unit: '分米', bottom: '地面', top: '树顶', climb: '从地面往上爬', out: '爬到树顶' }
  ]

  /* ---------------- 图：井 / 竹竿的刻度 ---------------- */
  function f2(n) { return +n.toFixed(2) }
  function txt(x, y, s, size, anchor) {
    return '<text x="' + f2(x) + '" y="' + f2(y) + '" font-size="' + (size || 9) + '" text-anchor="' + (anchor || 'middle') + '">' + s + '</text>'
  }
  /*
   * 刻度从下（0）到上（H）。days：解析图里画每一天：傍晚到哪（向上实线箭头）、早上滑到哪（向下虚线箭头）。
   * mark：题干里要问的位置（打问号）。
   */
  function wellSVG(H, th, opt) {
    opt = opt || {}
    var step = 1, lstep = H > 10 ? 2 : 1
    var top = 10, bot = 108, X0 = 38
    var u = (bot - top) / H
    function y(v) { return bot - v * u }
    var days = opt.days || []
    var W = Math.max(110, X0 + 26 + days.length * 15 + 10)
    var p = ['<svg ' + (opt.style ? 'style="' + opt.style + '"' : 'class="fig-big"') + ' viewBox="0 0 ' + W + ' 122" width="' + W * 1.6 + '" height="' + 122 * 1.6 + '">',
      '<defs><marker id="wnU' + (opt.uid || '') + '" markerUnits="userSpaceOnUse" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5z"/></marker></defs>']
    /* 井壁（竹竿就是一根竿） */
    if (th.id === 'jing') {
      p.push('<path d="M' + (X0 + 4) + ' ' + (top - 4) + 'V' + (bot + 2) + 'H' + (W - 6) + 'V' + (top - 4) + '" fill="none" stroke="#000" stroke-width="1.6"/>')
      p.push('<path d="M' + (X0 + 4) + ' ' + (bot + 2) + 'h' + (W - X0 - 10) + 'v4h-' + (W - X0 - 10) + 'z" fill="#bbb"/>')
    } else {
      p.push('<rect x="' + (X0 + 6) + '" y="' + top + '" width="7" height="' + (bot - top) + '" fill="#e6e6e6" stroke="#000" stroke-width="1"/>')
      p.push('<path d="M' + (X0 - 2) + ' ' + bot + 'H' + (W - 4) + '" stroke="#000" stroke-width="1.6"/>')
    }
    /* 刻度 */
    for (var v = 0; v <= H; v += step) {
      p.push('<path d="M' + (X0 - 4) + ' ' + f2(y(v)) + 'h6" stroke="#000" stroke-width="0.8"/>')
      if ((v % lstep === 0 && v !== H - 1) || v === H) p.push(txt(X0 - 6, y(v) + 3, v, 7.5, 'end'))
    }
    p.push(txt(X0 + 14, top - 1.5, th.top, 7, 'start'))
    p.push(txt(W - 8, bot - 2, th.bottom, 7, 'end'))
    /* 每一天 */
    var mk = 'url(#wnU' + (opt.uid || '') + ')'
    days.forEach(function (d, i) {
      var x = X0 + 24 + i * 15
      p.push('<path d="M' + x + ' ' + f2(y(d.from)) + 'V' + f2(y(d.up) + 2) + '" stroke="#000" stroke-width="1.4" marker-end="' + mk + '"/>')
      if (d.down !== null) {
        p.push('<path d="M' + (x + 4) + ' ' + f2(y(d.up)) + 'V' + f2(y(d.down) - 2) + '" stroke="#000" stroke-width="1" stroke-dasharray="2 1.5" marker-end="' + mk + '"/>')
      } else {
        p.push(txt(x + 4, y(d.up) - 3, '✓', 9))
      }
      p.push(txt(x + 2, bot + 13, i + 1, 7.5))
    })
    if (days.length) p.push(txt(X0 + 18, bot + 13, '第', 7, 'end'))
    if (days.length) p.push(txt(X0 + 24 + days.length * 15 - 4, bot + 13, '天', 7, 'start'))
    /* 小蜗牛 */
    if (!days.length) {
      var sx = X0 + 30, sy = bot - 7
      /* 小蜗牛：壳 + 身子 + 触角 */
      p.push('<path d="M' + (sx - 8) + ' ' + (sy + 6) + 'h20q3 0 3 -3" fill="none" stroke="#000" stroke-width="1.2"/><circle cx="' + sx + '" cy="' + sy + '" r="6" fill="#fff" stroke="#000" stroke-width="1.2"/><path d="M' + (sx - 3) + ' ' + sy + 'a3 3 0 1 1 3 3" fill="none" stroke="#000" stroke-width="0.8"/><path d="M' + (sx + 13) + ' ' + (sy + 3) + 'l2 -6M' + (sx + 14) + ' ' + (sy + 3) + 'l4 -5" stroke="#000" stroke-width="0.8"/>')
    }
    if (opt.mark !== undefined) {
      p.push('<path d="M' + (W - 30) + ' ' + f2(y(opt.mark)) + 'h12" stroke="#000" stroke-width="1"/>' + txt(W - 12, y(opt.mark) + 3, '？', 9))
    }
    p.push('</svg>')
    return p.join('')
  }
  function dayList(H, a, b, upTo) {
    var out = [], h = 0
    for (var d = 1; d <= upTo; d++) {
      var from = h
      h += a
      if (h >= H) { out.push({ from: from, up: H, down: null }); break }
      out.push({ from: from, up: h, down: h - b })
      h -= b
    }
    return out
  }

  /* 参数：返回 [H, a, b]，保证天数不太多（图画得下） */
  function pickClimb(d, needDiv) {
    for (var t = 0; t < 200; t++) {
      var a, b, H
      if (d === 'L1') { a = U.randInt(2, 3); b = a - 1; H = U.randInt(a + 2, 8) }
      else if (d === 'L2') { a = U.randInt(2, 5); b = U.randInt(1, a - 1); H = U.randInt(a + 3, 15) }
      else { a = U.randInt(3, 8); b = U.randInt(1, a - 1); H = U.randInt(a + 4, 24) }
      var net = a - b, days = daysOut(H, a, b)
      if (!days || days < 3 || days > (d === 'L1' ? 6 : 8)) continue
      if (needDiv === true && (H - a) % net) continue
      if (needDiv === false && !((H - a) % net)) continue
      /* 陷阱：井深 ÷ 净爬 算出来要和答案不一样 */
      if (H % net === 0 && H / net === days) continue
      return [H, a, b, days]
    }
    return null
  }

  function genWhere(s) {
    var d = s.difficulty || 'L1'
    var r = pickClimb(d)
    if (!r) return null
    var H = r[0], a = r[1], b = r[2], days = r[3]
    var th = U.pick(THEMES)
    var evening = d !== 'L1' && U.rand() < 0.5
    /* 问第 n 天：那时还没爬出去 */
    var n = U.randInt(2, days - 1)
    var net = a - b
    var ans = evening ? (n - 1) * net + a : n * net
    var when = evening ? '第 ' + n + ' 天傍晚（白天爬完）' : '第 ' + n + ' 天早上（晚上滑完）'
    var stem = th.where + '，' + th.dep + ' ' + H + ' ' + th.unit + '。' + th.who + th.climb + '，白天爬上 ' + a + ' ' + th.unit + '，晚上滑下 ' + b + ' ' + th.unit + '。' + when + '，它离' + th.bottom + '多高？'
    var sol = [{ tag: '想一想', text: '白天爬上 ' + a + '，晚上滑下 ' + b + '：一天一夜净往上 ' + a + ' − ' + b + ' = ' + net + '（' + th.unit + '）。' }]
    var seq = []
    for (var i = 1; i <= n; i++) {
      seq.push('第 ' + i + ' 天傍晚 ' + ((i - 1) * net + a) + (i < n || !evening ? '、早上 ' + (i * net) : ''))
    }
    sol.push({ tag: '画一画', text: seq.join('；') + '（' + th.unit + '）。' })
    sol.push({ tag: '列算式', text: evening ? (n - 1) + ' 个一天一夜一共净爬 ' + (n - 1) + ' 个 ' + net + '，是 ' + ((n - 1) * net) + '；再加第 ' + n + ' 天白天的 ' + a + '：' + ((n - 1) * net) + ' + ' + a + ' = ' + ans + '（' + th.unit + '）' : n + ' 个一天一夜，就是 ' + n + ' 个 ' + net + '：' + Array(n + 1).join(net + ' + ').slice(0, -3) + ' = ' + ans + '（' + th.unit + '）' })
    sol.push({ tag: '答', text: when + '，离' + th.bottom + ' ' + ans + ' ' + th.unit + '。' })
    var key = 'where:' + [th.id, H, a, b, n, evening ? 1 : 0].join(',')
    return {
      topic: 'woniu',
      variant: 'where',
      stem: stem,
      stemHTML: stem + '<div>' + wellSVG(H, th, { mark: undefined }) + '</div>',
      diagramHTML: '<div class="sol-diagram">' + wellSVG(H, th, { days: dayList(H, a, b, n).map(function (x, i) { return i === n - 1 && evening ? { from: x.from, up: x.up, down: null, open: true } : x }), style: 'height:30mm;width:auto', uid: 'w' + H + a + b + n }).replace(/<text[^>]*>✓<\/text>/g, '') + '</div>',
      answer: ans,
      unit: '',
      ansLabel: '答：离' + th.bottom,
      ansSuffix: th.unit + '。',
      workLabel: '画一画',
      solution: sol,
      key: key
    }
  }

  function genWell(s) {
    var d = s.difficulty || 'L1'
    var r = pickClimb(d, d === 'L3' ? (U.rand() < 0.6 ? false : true) : true)
    if (!r) return null
    var H = r[0], a = r[1], b = r[2], days = r[3]
    var th = U.pick(THEMES)
    var net = a - b, rest = H - a, k = Math.ceil(rest / net)
    var stem = th.where + '，' + th.dep + ' ' + H + ' ' + th.unit + '。' + th.who + th.climb + '，白天爬上 ' + a + ' ' + th.unit + '，晚上滑下 ' + b + ' ' + th.unit + '。它第几天能' + th.out + '？'
    var sol = [{ tag: '想一想', text: '一天一夜净爬 ' + a + ' − ' + b + ' = ' + net + '（' + th.unit + '）。最后一天白天爬到' + th.top + '就出去了，不会再滑下来 —— 先把最后一天爬的 ' + a + ' ' + th.unit + '留出来。' }]
    sol.push({ tag: '列算式', text: H + ' − ' + a + ' = ' + rest + '（' + th.unit + '），这 ' + rest + ' ' + th.unit + '每天净爬 ' + net + '，' + (rest % net ? '要 ' + k + ' 天（' + (k - 1) + ' 天才 ' + ((k - 1) * net) + '，不够，要 ' + k + ' 天）' : '要 ' + k + ' 天（' + k + ' 个 ' + net + ' 是 ' + rest + '）') + '；再加最后 1 天：' + k + ' + 1 = ' + days + '（天）。' })
    sol.push({ tag: '验一验', text: '第 ' + (days - 1) + ' 天早上在 ' + ((days - 1) * net) + ' ' + th.unit + '，第 ' + days + ' 天白天爬 ' + a + '，到 ' + ((days - 1) * net + a) + ' ' + th.unit + '，' + ((days - 1) * net + a > H ? '超过' : '正好到') + th.top + '。' })
    sol.push({ tag: '小心陷阱', text: '不能直接算 ' + H + ' 里有几个 ' + net + ' —— 最后一天爬上去就不滑了。' })
    sol.push({ tag: '答', text: '第 ' + days + ' 天能' + th.out + '。' })
    var key = 'well:' + [th.id, H, a, b].join(',')
    return {
      topic: 'woniu',
      variant: 'well',
      stem: stem,
      stemHTML: stem + '<div>' + wellSVG(H, th) + '</div>',
      diagramHTML: '<div class="sol-diagram">' + wellSVG(H, th, { days: dayList(H, a, b, days), style: 'height:30mm;width:auto', uid: 'k' + H + a + b }) + '</div>',
      answer: days,
      unit: '',
      ansLabel: '答：第',
      ansSuffix: '天。',
      workLabel: '列算式',
      solution: sol,
      key: key
    }
  }

  /* 过河：N 人，船最多坐 k 人，没有船工，每趟要一人划回来 */
  function trips(N, k) {
    var left = N, t = 0
    while (left > 0) {
      t++
      if (left <= k) return t
      left -= k
      left += 1 // 一人划船回来
    }
    return t
  }
  function genBoat(s) {
    var d = s.difficulty || 'L1'
    for (var t = 0; t < 100; t++) {
      var k = d === 'L3' ? U.randInt(3, 6) : U.randInt(3, 5)
      var N = d === 'L3' ? U.randInt(k + 4, 24) : U.randInt(k + 3, 14)
      var ans = trips(N, k)
      if (ans < 3 || ans > 6) continue
      /* 陷阱：N ÷ k 往上凑的次数要和答案不一样 */
      if (Math.ceil(N / k) === ans) continue
      var stem = N + ' 个小朋友要过河，只有一条小船，没有船工。船上每次最多坐 ' + k + ' 个小朋友，过去以后要有 1 个人把船划回来。至少要划过去几次，大家才能都过河？'
      var net = k - 1, rest = N - k, m = Math.ceil(rest / net)
      var sol = [{ tag: '想一想', text: '每次划过去 ' + k + ' 人，可是要有 1 人划回来，所以一来一回只送过去 ' + k + ' − 1 = ' + net + ' 人；最后一次不用回来，能送过去 ' + k + ' 人。' }]
      sol.push({ tag: '列算式', text: '先留出最后一次的 ' + k + ' 人：' + N + ' − ' + k + ' = ' + rest + '；这 ' + rest + ' 人每次净送 ' + net + ' 人，要 ' + m + ' 次；再加最后 1 次：' + m + ' + 1 = ' + ans + '（次）。' })
      sol.push({ tag: '小心陷阱', text: '不能用 ' + N + ' 里有几个 ' + k + ' 来算 —— 每次都有 1 个人要坐船回来。' })
      sol.push({ tag: '答', text: '至少要划过去 ' + ans + ' 次。' })
      return {
        topic: 'woniu',
        variant: 'boat',
        stem: stem,
        answer: ans,
        unit: '',
        ansLabel: '答：至少要划过去',
        ansSuffix: '次。',
        workLabel: '列算式',
        solution: sol,
        key: 'boat:' + N + ',' + k
      }
    }
    return null
  }

  /* 讲解页插图：5 米井，上 2 滑 1 */
  var DEMO_TH = THEMES[0]

  var WONIU = {
    id: 'woniu',
    no: 'B09',
    stage: 'L1B',
    name: '蜗牛爬井',
    lesson: {
      v2: true,
      title: '蜗牛爬井 · 方法讲解',
      goal: '白天爬、晚上滑的题，会一天一天看，会把最后一天单独算。',
      sections: [
        {
          kind: 'hook',
          heading: '先想一想',
          paras: [
            '井深 5 米，小蜗牛白天爬上 2 米，晚上滑下 1 米。一天一夜净爬 1 米，是不是要 5 天？',
            '画一画：第 3 天早上在 3 米，第 4 天白天爬 2 米，正好到井口 —— 4 天就出来了！最后一天爬上去，就不会再滑下来。'
          ],
          figHTML: wellSVG(5, DEMO_TH, { days: dayList(5, 2, 1, 4), style: 'height:34mm;width:auto', uid: 'h' })
        },
        {
          kind: 'move',
          name: '一天一天看',
          tip: '白天上，晚上下，一天一夜净爬「上 − 下」。',
          steps: [
            '一天一夜净往上爬：白天爬的 − 晚上滑的。',
            '第几天早上，就是几个「净爬」。',
            '第几天傍晚，再加上这一天白天爬的。'
          ],
          pitfall: '傍晚和早上不一样：傍晚是刚爬上去，早上是滑下来以后。',
          variants: ['where']
        },
        {
          kind: 'move',
          name: '最后一天单独算',
          tip: '最后一天只上不下，先把它留出来。',
          steps: [
            '先留出最后一天白天爬的那一段：井深 − 白天爬的。',
            '剩下的每天净爬「上 − 下」，看要几天（不够一天也算一天）。',
            '再加上最后 1 天。过河也一样：最后一次不用划回来。'
          ],
          pitfall: '不能直接算井深里有几个「净爬」，那样会多算几天。',
          variants: ['well', 'boat']
        },
        {
          kind: 'pick',
          heading: '用哪一招？',
          rows: [
            ['问第几天早上 / 傍晚在哪', '一天一天看', ['where']],
            ['问第几天爬出去、过河几次', '最后一天单独算', ['well', 'boat']]
          ]
        },
        { kind: 'chant', chant: '白天爬，晚上滑，一天只算爬多少；最后一天不下滑，先把它来留出来。' }
      ]
    },
    variants: [
      {
        id: 'where',
        setting: 'vWnWhere',
        label: '第几天在哪',
        idea: '一天一夜净爬「白天爬的 − 晚上滑的」：第几天早上就是几个净爬，傍晚再加这一天白天爬的。',
        gen: genWhere
      },
      {
        id: 'well',
        setting: 'vWnWell',
        label: '几天爬出',
        idea: '最后一天爬到顶就出去了：先从井深里减掉最后一天爬的，剩下的看每天净爬要几天，再加 1 天。',
        gen: genWell
      },
      {
        id: 'boat',
        setting: 'vWnBoat',
        label: '过河几次',
        idea: '每次要有 1 人把船划回来，一来一回只送过去「船位 − 1」人；最后一次不用回来，先留出来，再加 1 次。',
        def: false,
        gen: genBoat
      }
    ],
    generate: function (s) {
      return U.generateFrom(WONIU.variants, s)
    },
    titleFor: function (s) {
      return '蜗牛爬井练习 · ' + U.DIFF_LABEL[s.difficulty || 'L1']
    }
  }

  WONIU._byFormula = byFormula
  root.SumSum.aoshu.topics.woniu = WONIU
  root.SumSum.aoshu.topicList.push(WONIU)
})(typeof window !== 'undefined' ? window : globalThis)
