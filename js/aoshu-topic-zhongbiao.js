/**
 * 知识点「B03 认识钟表：整时和半时」（L1 补充，对照学而思 1 级第 5 讲好方法 1、2、5 和练习 1、2、4、11、12、巅峰，
 * 拆题笔记 docs/xes-1ji/05-时间的认知.md；几时几分留给 B04）。
 * 变式：①看钟写时刻（整时、半时，挑战档两个钟一起比）②哪个钟是 X（选一选：长短针颠倒、少一时的半时做干扰）
 *       ③画钟（空钟面画针再写电子计时法，def:false；挑战档有「两针重叠 / 成一条直线」的整时）。
 * 图是黑白内联 SVG 钟面：60 个小刻度、1～12，时针短粗、分针长细，按真实角度画（半时时针正好在两个数中间）。
 * key = 变式:时刻[,时刻…][|选项…]，tools/check-aoshu-gen.js 从 key 独立重算答案，并量题干里两根针的角度。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util
  var CIRC = ['①', '②', '③', '④']

  /* ---------------- 时刻 ---------------- */

  function T(h, m) { return { h: h, m: m } }
  function fmt(t) { return t.h + ':' + (t.m < 10 ? '0' : '') + t.m }
  function next(h) { return h % 12 + 1 }
  function prev(h) { return h === 1 ? 12 : h - 1 }
  /* 「3 时」「5 时半」：题干里换着用文字和电子计时法 */
  function word(t) { return t.h + ' 时' + (t.m === 30 ? '半' : '') }
  function same(a, b) { return a.h === b.h && a.m === b.m }

  /* 一个钟怎么读出来（解析里用） */
  function readSteps(t) {
    if (t.m === 0) {
      return [
        { tag: '看分针', text: '长长的分针指着 12，是整时。' },
        { tag: '看时针', text: '短短的时针指着 ' + t.h + '，是 ' + t.h + ' 时。' },
        { tag: '写一写', text: t.h + ' 时写作 ' + fmt(t) + '。' }
      ]
    }
    return [
      { tag: '看分针', text: '长长的分针指着 6，是半时。' },
      { tag: '看时针', text: '短短的时针在 ' + t.h + ' 和 ' + next(t.h) + ' 中间，过了 ' + t.h + '，是 ' + t.h + ' 时半。' },
      { tag: '写一写', text: t.h + ' 时半写作 ' + fmt(t) + '。' }
    ]
  }

  /* ---------------- 画钟面 ---------------- */

  var R = 52
  var CELL = 124

  function pt(cx, cy, len, deg) {
    var a = deg * Math.PI / 180
    return [+(cx + len * Math.sin(a)).toFixed(2), +(cy - len * Math.cos(a)).toFixed(2)]
  }
  function hourDeg(t) { return ((t.h % 12) + t.m / 60) * 30 }
  function minDeg(t) { return t.m * 6 }

  /* 钟面：t 为 null 时只画钟面和中心点（给孩子画针） */
  function face(cx, cy, t) {
    var p = []
    p.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="#fff" stroke="#000" stroke-width="2.6"/>')
    for (var i = 0; i < 60; i++) {
      var big = i % 5 === 0
      var a = pt(cx, cy, R - 2, i * 6)
      var b = pt(cx, cy, R - (big ? 8 : 5), i * 6)
      p.push('<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="#000" stroke-width="' + (big ? 1.8 : 0.8) + '"/>')
    }
    for (var n = 1; n <= 12; n++) {
      var q = pt(cx, cy, R - 18, n * 30)
      p.push('<text x="' + q[0] + '" y="' + (q[1] + 4.3) + '" font-size="12" text-anchor="middle">' + n + '</text>')
    }
    if (t) {
      var mh = pt(cx, cy, R * 0.8, minDeg(t))
      var hh = pt(cx, cy, R * 0.48, hourDeg(t))
      p.push('<line class="mh" x1="' + cx + '" y1="' + cy + '" x2="' + mh[0] + '" y2="' + mh[1] + '" stroke="#000" stroke-width="2.2" stroke-linecap="round"/>')
      p.push('<line class="hh" x1="' + cx + '" y1="' + cy + '" x2="' + hh[0] + '" y2="' + hh[1] + '" stroke="#000" stroke-width="5.5" stroke-linecap="round"/>')
    }
    p.push('<circle cx="' + cx + '" cy="' + cy + '" r="3.4" fill="#000"/>')
    return p.join('')
  }

  /* 一排钟；labels 为真时左上角标 ①②③ */
  function clocksSVG(times, labels, style) {
    var top = labels ? 16 : 0
    var W = times.length * CELL
    var H = CELL + top
    var p = ['<svg ' + (style ? 'style="' + style + '"' : 'class="fig-big"') + ' viewBox="0 0 ' + W + ' ' + H + '" width="' + W * 1.6 + '" height="' + H * 1.6 + '">']
    times.forEach(function (t, i) {
      if (labels) p.push('<text x="' + (i * CELL + 8) + '" y="14" font-size="15" text-anchor="start">' + CIRC[i] + '</text>')
      p.push(face(i * CELL + CELL / 2, top + CELL / 2, t))
    })
    p.push('</svg>')
    return p.join('')
  }

  function figStem(stem, svg) {
    return stem + '<div>' + svg + '</div>'
  }
  /* 解析里的「标准答案」钟：不加 fig 类，用内联高度，免得和题干一样大 */
  function answerFig(times, labels) {
    return '<div class="sol-diagram">' + clocksSVG(times, labels, 'height:24mm;width:auto') + '</div>'
  }

  function keyOf(variant, times, opts) {
    return variant + ':' + times.map(fmt).join(',') + (opts ? '|' + opts.map(fmt).join('|') : '')
  }

  /* ---------------- 变式①：看钟写时刻 ---------------- */

  function genRead(s) {
    var d = s.difficulty || 'L1'
    var h = U.randInt(1, 12)
    var times
    if (d === 'L1') times = [T(h, 0)]
    else if (d === 'L2') times = [T(h, U.rand() < 0.75 ? 30 : 0)]
    else {
      /* 几时半和下一个整时（5:30 / 6:00），或者相邻的两个半时（4:30 / 5:30）：只差在时针过了几 */
      var other = U.rand() < 0.5 ? T(next(h), 0) : T(next(h), 30)
      times = U.shuffled([T(h, 30), other])
    }
    var two = times.length > 1
    var stem = two ? '下面两个钟各是什么时刻？用电子计时法写一写。' : '钟面上是什么时刻？用电子计时法写一写。'
    var answer = two ? times.map(function (t, i) { return CIRC[i] + ' ' + fmt(t) }).join('　') : fmt(times[0])
    var sol = [{ tag: '想一想', text: '先认针：短的是时针，长的是分针。再看分针指着 12 还是 6。' }]
    if (two) {
      times.forEach(function (t, i) {
        var st = readSteps(t)
        sol.push({ tag: '看' + CIRC[i], text: st[0].text.replace(/。$/, '；') + st[1].text })
      })
      var half = times.filter(function (t) { return t.m === 30 })
      sol.push({ tag: '小心陷阱', text: half.length === 2
        ? '两个钟分针都指着 6，看时针：过了几就是几时半，别读成快到的那个数。'
        : '两个钟的时针都在 ' + next(h) + ' 附近：分针指 6 的那个时针还没到 ' + next(h) + '，是 ' + h + ' 时半。' })
    } else {
      sol = sol.concat(readSteps(times[0]))
      sol.push({ tag: '小心陷阱', text: times[0].m === 0
        ? '长针指着几不是几时，几时要看短短的时针。'
        : '时针快到 ' + next(h) + ' 了，可还没到，是 ' + h + ' 时半，不是 ' + next(h) + ' 时半。' })
    }
    sol.push({ tag: '答', text: answer + '。' })
    return {
      topic: 'zhongbiao',
      variant: 'read',
      stem: stem,
      stemHTML: figStem(stem, clocksSVG(times, two)),
      answer: answer,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '。',
      workLabel: '看一看',
      solution: sol,
      key: keyOf('read', times)
    }
  }

  /* ---------------- 变式②：哪个钟是 X ---------------- */

  /* 长短针颠倒的样子：长针指着 h，短针在 12（或 6）附近 —— 读出来是另一个真实时刻 */
  function swapped(target) {
    return T(target.m === 0 ? 12 : 6, (target.h * 5) % 60)
  }

  function genPick(s) {
    var d = s.difficulty || 'L1'
    var h = U.randInt(1, 12)
    var target
    var opts
    if (d === 'L1') {
      target = T(h, 0)
      opts = [target, swapped(target), T(U.rand() < 0.5 ? next(h) : prev(h), 0)]
    } else if (d === 'L2') {
      target = T(h, 30)
      opts = [target, T(prev(h), 30), T(h, 0)]
    } else if (U.rand() < 0.7) {
      target = T(h, 30)
      opts = [target, T(prev(h), 30), T(next(h), 0), swapped(target)]
    } else {
      target = T(h, 0)
      opts = [target, T(prev(h), 30), T(next(h), 0), swapped(target)]
    }
    /* 选项必须互不相同；颠倒的钟两针要分得开（不能长针也落在短针旁边） */
    for (var i = 0; i < opts.length; i++) {
      for (var j = i + 1; j < opts.length; j++) if (same(opts[i], opts[j])) return null
    }
    var sw = d === 'L2' ? null : swapped(target)
    if (sw && Math.abs(((hourDeg(sw) - minDeg(sw)) % 360 + 360) % 360 - 180) > 150) return null
    opts = U.shuffled(opts)
    var idx = opts.findIndex(function (o) { return same(o, target) })
    /* 正确答案别总在第一个 */
    if (idx === 0 && U.rand() < 0.5) return null
    var asText = d === 'L1' ? U.rand() < 0.5 : d === 'L2' ? U.rand() < 0.5 : U.rand() < 0.6
    var name = asText ? word(target) : fmt(target)
    var stem = '下面哪个钟表示 ' + name + '？'
    var mWant = target.m === 0 ? 12 : 6
    var outByMin = []
    var keep = []
    opts.forEach(function (o, k) { (o.m === target.m ? keep : outByMin).push(k) })
    var sol = [{ tag: '想一想', text: name + (/\d$/.test(name) ? ' ' : '') + (target.m === 0 ? '是整时' : '是半时') + '，分针要指着 ' + mWant + '；再看短短的时针。' }]
    if (outByMin.length) {
      sol.push({ tag: '划一划', text: outByMin.map(function (k) { return CIRC[k] }).join(' ') + ' 的长针没指着 ' + mWant + '，划掉。' })
    }
    sol.push({ tag: '看时针', text: keep.map(function (k) {
      var o = opts[k]
      return CIRC[k] + ' 时针' + (o.m === 0 ? '指着 ' + o.h + '，是 ' + fmt(o) : '在 ' + o.h + ' 和 ' + next(o.h) + ' 中间，是 ' + fmt(o))
    }).join('；') + '。' })
    var hasSwap = sw && opts.some(function (o) { return same(o, sw) })
    sol.push({ tag: '小心陷阱', text: hasSwap
      ? '有一个钟长短针反过来了：长针指着 ' + target.h + '，短针在 ' + sw.h + ' 和 ' + next(sw.h) + ' 之间，它不是 ' + name + '。先认针！'
      : '时针在 ' + prev(h) + ' 和 ' + h + ' 中间是 ' + prev(h) + ' 时半，不是 ' + h + ' 时半：过了几就是几。' })
    sol.push({ tag: '答', text: CIRC[idx] + ' 号钟表示 ' + name + '。' })
    return {
      topic: 'zhongbiao',
      variant: 'pick',
      stem: stem,
      stemHTML: figStem(stem, clocksSVG(opts, true)),
      answer: CIRC[idx],
      unit: '',
      ansLabel: '答：',
      ansSuffix: '号钟。',
      workLabel: '划一划',
      solution: sol,
      key: keyOf('pick', [target], opts)
    }
  }

  /* ---------------- 变式③：画钟 ---------------- */

  function drawSteps(t) {
    if (t.m === 0) {
      return [
        { tag: '画分针', text: t.h + ' 时是整时，长长细细的分针指着 12。' },
        { tag: '画时针', text: '短短粗粗的时针正对着 ' + t.h + '。' },
        { tag: '写一写', text: t.h + ' 时写作 ' + fmt(t) + '。' }
      ]
    }
    return [
      { tag: '画分针', text: t.h + ' 时半是半时，长长细细的分针指着 6。' },
      { tag: '画时针', text: '短短粗粗的时针画在 ' + t.h + ' 和 ' + next(t.h) + ' 正中间。' },
      { tag: '写一写', text: t.h + ' 时半写作 ' + fmt(t) + '。' }
    ]
  }

  function genDraw(s) {
    var d = s.difficulty || 'L1'
    var h = U.randInt(1, 12)
    var times
    var stem
    var sol
    var answer
    if (d === 'L3' && U.rand() < 0.3) {
      var over = U.rand() < 0.5
      times = [over ? T(12, 0) : T(6, 0)]
      stem = '现在是整时，钟面上的时针和分针' + (over ? '重在一起' : '正好连成一条直线') + '。这是几时？在钟面上画出来，再用电子计时法写一写。'
      answer = fmt(times[0])
      sol = [
        { tag: '想一想', text: '整时的时候，分针一定指着 12。' },
        { tag: '画一画', text: over ? '时针和分针重在一起，时针也指着 12：是 12 时。' : '时针和分针连成一条直线，时针指着 12 对面的 6：是 6 时。' },
        { tag: '写一写', text: (over ? 12 : 6) + ' 时写作 ' + answer + '。' },
        { tag: '小心陷阱', text: over ? '两针重在一起也要画出长短：短针压在长针上。' : '连成一条直线不是两针一样长：上面长、下面短。' }
      ]
    } else {
      if (d === 'L1') times = [T(h, 0)]
      else if (d === 'L2') times = [T(h, 30)]
      else {
        var k = U.randInt(1, 12)
        if (k === h) return null
        times = U.shuffled([T(h, 0), T(k, 30)])
      }
      var two = times.length > 1
      stem = '在钟面上画出 ' + (two ? times.map(function (t, i) { return CIRC[i] + ' ' + word(t) }).join('、') : word(times[0])) +
        '的时针和分针，再用电子计时法写一写。'
      answer = two ? times.map(function (t, i) { return CIRC[i] + ' ' + fmt(t) }).join('　') : fmt(times[0])
      sol = [{ tag: '想一想', text: '先画分针：长长的、细细的；再画时针：短短的、粗粗的。' }]
      if (two) {
        times.forEach(function (t, i) {
          var st = drawSteps(t)
          sol.push({ tag: '画' + CIRC[i], text: st[0].text.replace(/。$/, '；') + st[1].text })
        })
      } else sol = sol.concat(drawSteps(times[0]))
      sol.push({ tag: '小心陷阱', text: times.some(function (t) { return t.m === 30 })
        ? '半时的时针不能正对着数，要画在两个数正中间；时针要画得比分针短。'
        : '时针要画得比分针短，不然就读成别的时刻了。' })
    }
    sol.push({ tag: '答', text: answer + '。' })
    var two2 = times.length > 1
    var blanks = times.map(function () { return null })
    return {
      topic: 'zhongbiao',
      variant: 'draw',
      stem: stem,
      stemHTML: figStem(stem, clocksSVG(blanks, two2)),
      diagramHTML: answerFig(times, two2),
      answer: answer,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '。',
      workLabel: '画一画',
      solution: sol,
      key: keyOf('draw', times)
    }
  }

  /* ---------------- 讲解页小插图 ---------------- */

  function small(t, w) {
    return clocksSVG([t], false, 'width:' + (w || 96) + 'px;height:auto')
  }

  /* 先想一想：手机上 5:00，墙上的圆钟 */
  var HOOK_SVG = (function () {
    var p = ['<svg viewBox="0 0 250 124" width="250" height="124">']
    p.push('<rect x="6" y="18" width="62" height="98" rx="10" fill="#fff" stroke="#000" stroke-width="2"/>')
    p.push('<rect x="13" y="32" width="48" height="66" fill="#fff" stroke="#000" stroke-width="1"/>')
    p.push('<text x="37" y="72" font-size="18" text-anchor="middle" font-weight="bold">5:00</text>')
    p.push(face(186, 62, T(5, 0)))
    p.push('</svg>')
    return p.join('')
  })()

  var FACE_FIG = small(null)

  /* 两根针：标出「时针」「分针」 */
  var HANDS_FIG = (function () {
    var p = ['<svg viewBox="0 0 170 124" width="150" height="110">']
    p.push(face(62, 62, T(2, 0)))
    p.push('<line x1="88" y1="20" x2="122" y2="14" stroke="#000" stroke-width="1" stroke-dasharray="3 2"/>')
    p.push('<text x="124" y="18" font-size="13">分针</text>')
    p.push('<line x1="80" y1="52" x2="122" y2="60" stroke="#000" stroke-width="1" stroke-dasharray="3 2"/>')
    p.push('<text x="124" y="64" font-size="13">时针</text>')
    p.push('</svg>')
    return p.join('')
  })()

  var DIGI_FIG = (function () {
    var p = ['<svg viewBox="0 0 150 90" width="130" height="78">']
    ;[['3 时', '3:00', 6], ['3 时半', '3:30', 48]].forEach(function (r) {
      p.push('<text x="8" y="' + (r[2] + 26) + '" font-size="14">' + r[0] + '</text>')
      p.push('<rect x="64" y="' + (r[2] + 4) + '" width="78" height="32" rx="5" fill="#fff" stroke="#000" stroke-width="1.8"/>')
      p.push('<text x="103" y="' + (r[2] + 27) + '" font-size="19" font-weight="bold" text-anchor="middle">' + r[1] + '</text>')
    })
    p.push('</svg>')
    return p.join('')
  })()

  var ZHONGBIAO = {
    id: 'zhongbiao',
    no: 'B03',
    stage: 'L1B',
    name: '认识钟表：整时和半时',
    lesson: {
      v2: true,
      title: '整时和半时 · 方法讲解',
      goal: '看懂圆圆的钟。今天学三招：读钟，对一对，画钟。',
      sections: [
        {
          kind: 'hook',
          heading: '先想一想',
          paras: [
            '手机上写着 5:00，一看就知道是 5 时。墙上的圆钟没有写字，你能看出它也是 5 时吗？',
            '圆钟靠两根针说时间。认识了这两根针，圆钟一看就懂。'
          ],
          figHTML: HOOK_SVG
        },
        {
          kind: 'know',
          heading: '先认识',
          cards: [
            { title: '钟面', text: '钟面上有 1 到 12，十二个数顺着一圈排。', figHTML: FACE_FIG },
            { title: '两根针', text: '短短粗粗的是时针，走得慢；长长细细的是分针，走得快。', figHTML: HANDS_FIG },
            { title: '电子计时法', text: '3 时写作 3:00，3 时半写作 3:30。', figHTML: DIGI_FIG }
          ]
        },
        {
          kind: 'move',
          name: '读钟',
          tip: '先认针，再看分针，最后看时针。',
          steps: [
            '认针：短的是时针，长的是分针。',
            '看分针：指着 12 是整时，指着 6 是半时。',
            '看时针：整时指着几就是几时；半时时针在两个数中间，过了几就是几时半。'
          ],
          pitfall: '时针在 5 和 6 中间是 5 时半，不是 6 时半。',
          figHTML: small(T(5, 30)),
          variants: ['read']
        },
        {
          kind: 'move',
          name: '对一对',
          tip: '几个钟里找出一个对的，先划掉一眼就不对的。',
          steps: [
            '先想：整时分针指 12，半时分针指 6；分针不对的划掉。',
            '再看剩下的时针：过了几，就是几时半。',
            '小心长短针反过来的钟：长针指着那个数，可它是分针。'
          ],
          pitfall: '时针快到 6 的不是 6 时半，是 5 时半。',
          variants: ['pick']
        },
        {
          kind: 'move',
          name: '画钟',
          tip: '先画长长的分针，再画短短的时针，最后写电子计时法。',
          steps: [
            '画分针：长长的、细细的，整时指着 12，半时指着 6。',
            '画时针：短短的、粗粗的，整时正对着几，半时画在两个数正中间。',
            '写一写：几时写成「几:00」，几时半写成「几:30」。'
          ],
          pitfall: '时针要画得比分针短；半时的时针别正对着数。',
          figHTML: small(T(9, 30)),
          variants: ['draw']
        },
        {
          kind: 'pick',
          heading: '用哪一招？',
          rows: [
            ['给了钟，问是什么时刻', '读钟', ['read']],
            ['给了时刻，问是哪个钟', '对一对', ['pick']],
            ['给了时刻和空钟面', '画钟', ['draw']]
          ]
        },
        { kind: 'chant', chant: '短的时针长的分，分针指 12 是整时，分针指 6 是半时；时针过几就几时，写成几:00、几:30。' }
      ]
    },
    variants: [
      {
        id: 'read',
        setting: 'vZbRead',
        label: '看钟写时刻',
        idea: '先认针：短的时针、长的分针；分针指 12 是整时，指 6 是半时；时针过了几就是几时（半），写成几:00、几:30。',
        gen: genRead
      },
      {
        id: 'pick',
        setting: 'vZbPick',
        label: '哪个钟是这个时刻',
        idea: '先按分针划掉不对的，再看时针过了几；小心长短针反过来的钟和「快到下一个数」的钟。',
        gen: genPick
      },
      {
        id: 'draw',
        setting: 'vZbDraw',
        label: '画钟（画时针和分针）',
        idea: '先画长长细细的分针（整时指 12、半时指 6），再画短短粗粗的时针（整时正对、半时在两个数中间），最后写电子计时法。',
        def: false,
        gen: genDraw
      }
    ],
    generate: function (s) {
      return U.generateFrom(ZHONGBIAO.variants, s)
    },
    titleFor: function (s) {
      return '整时和半时练习 · ' + U.DIFF_LABEL[s.difficulty || 'L1']
    }
  }

  root.SumSum.aoshu.topics.zhongbiao = ZHONGBIAO
  root.SumSum.aoshu.topicList.push(ZHONGBIAO)
})(typeof window !== 'undefined' ? window : globalThis)
