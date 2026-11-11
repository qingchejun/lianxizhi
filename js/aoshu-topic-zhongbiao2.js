/**
 * 知识点「B04 认识钟表：几时几分」（L1 补充，对照学而思 1 级第 5 讲好方法 3、4、5、6 和练习 3、5～10、13～18，
 * 拆题笔记 docs/xes-1ji/05-时间的认知.md 的 K8～K13、M3～M6；整时、半时、认针在 B03 zhongbiao 已讲，这里不再讲）。
 * 变式：①看钟写几时几分（入门分针指在数上；提高有零头小格；挑战两个钟：快到整时和刚过整时放一起）
 *       ②哪个钟是 X（干扰：把分针指着的数当分、逆着数小格、时针快到 h 的 (h-1) 时）
 *       ③画几时几分（def:false，解析给标准答案图）
 *       ④排一排（中午到傍晚的几件事按先后排：12 时最早、快到整时的陷阱）
 * 图是黑白内联 SVG 钟面，和 B03 同一种画法：60 个小刻度、1～12，时针短粗、分针长细，按真实角度画。
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
  function word(t) { return t.h + ' 时 ' + t.m + ' 分' }
  function same(a, b) { return a.h === b.h && a.m === b.m }
  /* 下午的先后：12 时最早，然后 1 时、2 时…… */
  function pmOrder(t) { return (t.h % 12) * 60 + t.m }

  function hourDeg(t) { return ((t.h % 12) + t.m / 60) * 30 }
  function minDeg(t) { return t.m * 6 }
  /* 两根针要分得开，不然压住的小格数不清 */
  function clear(t) {
    var d = Math.abs(hourDeg(t) - minDeg(t)) % 360
    return Math.min(d, 360 - d) >= 15
  }
  function allClear(ts) { return ts.every(clear) }

  /* 分不是整时、半时（那是 B03 的） */
  function randMin(mult5) {
    var m
    do { m = mult5 ? U.randInt(1, 11) * 5 : U.randInt(1, 59) } while (m === 30 || (!mult5 && m % 5 === 0))
    return m
  }

  /* 时针在哪：解析里用 */
  function hourWhere(t) {
    if (t.m < 20) return '刚过 ' + t.h + ' 一点'
    if (t.m <= 40) return '在 ' + t.h + ' 和 ' + next(t.h) + ' 中间附近'
    return '快到 ' + next(t.h) + ' 了，可还没到'
  }
  /* 分针怎么数：解析里用 */
  function countMin(t) {
    var k = Math.floor(t.m / 5)
    var r = t.m % 5
    var seq = []
    for (var i = 1; i <= Math.min(k, 3); i++) seq.push(i * 5)
    var five = k <= 3 ? seq.join('、') : seq.join('、') + '……' + k * 5
    if (k === 0) return '分针从 12 起一小格一小格数，数到 ' + r + '，是 ' + t.m + ' 分'
    if (r === 0) return '分针指着 ' + k + '，5 个 5 个数：' + five + '，是 ' + t.m + ' 分'
    return '分针过了 ' + k + '：先 5 个 5 个数到 ' + k * 5 + '，再数 ' + r + ' 小格，是 ' + t.m + ' 分'
  }
  function readLine(t) {
    return '时针' + hourWhere(t) + '，是 ' + t.h + ' 时；' + countMin(t) + '：' + fmt(t)
  }

  /* ---------------- 画钟面（和 B03 同一种画法） ---------------- */

  var R = 52
  var CELL = 124

  function pt(cx, cy, len, deg) {
    var a = deg * Math.PI / 180
    return [+(cx + len * Math.sin(a)).toFixed(2), +(cy - len * Math.cos(a)).toFixed(2)]
  }

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

  /* 一排钟；labels 为真时左上角标 ①②③；caps 是钟下面的小字（排一排写事情） */
  function clocksSVG(times, labels, style, caps) {
    var top = labels ? 16 : 0
    var bottom = caps ? 20 : 0
    var W = times.length * CELL
    var H = CELL + top + bottom
    var p = ['<svg ' + (style ? 'style="' + style + '"' : 'class="fig-big"') + ' viewBox="0 0 ' + W + ' ' + H + '" width="' + W * 1.6 + '" height="' + H * 1.6 + '">']
    times.forEach(function (t, i) {
      if (labels) p.push('<text x="' + (i * CELL + 8) + '" y="14" font-size="15" text-anchor="start">' + CIRC[i] + '</text>')
      p.push(face(i * CELL + CELL / 2, top + CELL / 2, t))
      if (caps) p.push('<text x="' + (i * CELL + CELL / 2) + '" y="' + (top + CELL + 15) + '" font-size="14" text-anchor="middle">' + caps[i] + '</text>')
    })
    p.push('</svg>')
    return p.join('')
  }

  function figStem(stem, svg) { return stem + '<div>' + svg + '</div>' }
  function answerFig(times, labels) {
    return '<div class="sol-diagram">' + clocksSVG(times, labels, 'height:24mm;width:auto') + '</div>'
  }
  function keyOf(variant, times, opts) {
    return variant + ':' + times.map(fmt).join(',') + (opts ? '|' + opts.map(fmt).join('|') : '')
  }

  /* 快到整时的一对：h:45～59 和 (h+1):01～14，两根时针都在 h+1 附近 */
  function nearPair() {
    var h = U.randInt(1, 12)
    return [T(h, U.randInt(45, 59)), T(next(h), U.randInt(1, 14))]
  }

  /* ---------------- 变式①：看钟写几时几分 ---------------- */

  function genRead(s) {
    var d = s.difficulty || 'L1'
    var times
    if (d === 'L1') times = [T(U.randInt(1, 12), randMin(true))]
    else if (d === 'L2') {
      var h = U.randInt(1, 12)
      /* 一半出零几分（练补 0） */
      times = [T(h, U.rand() < 0.4 ? U.pick([1, 2, 3, 4, 6, 7, 8, 9]) : randMin(false))]
    } else times = U.shuffled(nearPair())
    if (!allClear(times)) return null
    var two = times.length > 1
    var stem = two ? '下面两个钟各是几时几分？用电子计时法写一写。' : '钟面上是几时几分？用电子计时法写一写。'
    var answer = two ? times.map(function (t, i) { return CIRC[i] + ' ' + fmt(t) }).join('　') : fmt(times[0])
    var sol = [{ tag: '想一想', text: '先看短短的时针过了几，就是几时；再从 12 起顺着数分针走了几小格，就是几分。' }]
    times.forEach(function (t, i) {
      sol.push({ tag: two ? '看' + CIRC[i] : '读一读', text: readLine(t) + '。' })
    })
    var trap
    if (two) {
      var late = times[0].m > 40 ? times[0] : times[1]
      trap = '两根时针都在 ' + next(late.h) + ' 附近。分针快转完一圈的那个还没到 ' + next(late.h) + '，是 ' + late.h + ' 时，不是 ' + next(late.h) + ' 时。'
    } else if (times[0].m < 10) {
      trap = '分不满 10 前面要补 0：' + times[0].h + ' 时 ' + times[0].m + ' 分写作 ' + fmt(times[0]) + '。'
    } else if (times[0].m % 5 === 0) {
      trap = '分针指着 ' + times[0].m / 5 + '，不是 ' + times[0].m / 5 + ' 分，是 ' + times[0].m + ' 分。'
    } else if (times[0].m > 40) {
      trap = '时针快到 ' + next(times[0].h) + ' 了，可还没到，是 ' + times[0].h + ' 时。'
    } else {
      trap = '零头的小格别忘了数，也别从别的数开始数。'
    }
    sol.push({ tag: '小心陷阱', text: trap })
    sol.push({ tag: '答', text: answer + '。' })
    return {
      topic: 'zhongbiao2',
      variant: 'read',
      stem: stem,
      stemHTML: figStem(stem, clocksSVG(times, two)),
      answer: answer,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '。',
      workLabel: '数一数',
      solution: sol,
      key: keyOf('read', times)
    }
  }

  /* ---------------- 变式②：哪个钟是 X ---------------- */

  /* 干扰钟：每种对应一个常见错 */
  function traps(t) {
    var out = []
    if (t.m <= 11 && t.m !== 6) out.push({ k: 'num', t: T(t.h, t.m * 5) })                /* 把指着的数当分：7:02 ← 分针指着 2 的 7:10 */
    if (t.m >= 35) out.push({ k: 'hour', t: T(prev(t.h), t.m) })            /* 时针快到 h 了的 (h-1) 时 */
    if (60 - t.m !== t.m) out.push({ k: 'back', t: T(t.h, 60 - t.m) })      /* 逆着数小格 */
    out.push({ k: 'other', t: T(t.m >= 30 ? next(t.h) : prev(t.h), t.m) })  /* 时不对 */
    return out
  }

  function genPick(s) {
    var d = s.difficulty || 'L1'
    var h = U.randInt(1, 12)
    var m
    if (d === 'L1') m = randMin(true)
    else if (d === 'L2') m = U.rand() < 0.5 ? U.pick([1, 2, 3, 4, 6, 7, 8, 9, 10, 11]) : U.randInt(36, 59)
    else m = U.rand() < 0.4 ? U.pick([2, 3, 4, 7, 8, 9, 11]) : U.randInt(40, 59)
    var target = T(h, m)
    var pool = traps(target)
    var n = d === 'L3' ? 3 : 2
    var chosen
    if (d === 'L1') {
      chosen = pool.filter(function (x) { return x.k === 'back' || x.k === 'other' || x.k === 'num' })
      chosen = U.shuffled(chosen).slice(0, n)
    } else {
      /* 先要「数当分」「时针快到」，不够再补 */
      var main = pool.filter(function (x) { return x.k === 'num' || x.k === 'hour' })
      var rest = U.shuffled(pool.filter(function (x) { return x.k !== 'num' && x.k !== 'hour' }))
      chosen = main.concat(rest).slice(0, n)
    }
    if (chosen.length < n) return null
    var opts = [target].concat(chosen.map(function (x) { return x.t }))
    for (var i = 0; i < opts.length; i++) {
      for (var j = i + 1; j < opts.length; j++) if (same(opts[i], opts[j])) return null
    }
    if (!allClear(opts)) return null
    var order = U.shuffled(opts.map(function (o, k) { return k }))
    var shown = order.map(function (k) { return opts[k] })
    var idx = order.indexOf(0)
    if (idx === 0 && U.rand() < 0.5) return null
    var asText = U.rand() < 0.5
    var name = asText ? word(target) : fmt(target)
    var stem = '下面哪个钟表示 ' + name + '？'
    var sol = [{ tag: '想一想', text: name + '：时针过了 ' + h + '，分针从 12 起顺着数 ' + m + ' 小格' + (m % 5 === 0 ? '（指着 ' + m / 5 + '）' : m > 5 ? '（先数到 ' + Math.floor(m / 5) + ' 是 ' + Math.floor(m / 5) * 5 + ' 分，再数 ' + m % 5 + ' 小格）' : '') + '。' }]
    sol.push({ tag: '看一看', text: shown.map(function (o, k) { return CIRC[k] + ' 是 ' + fmt(o) }).join('；') + '。' })
    var why = []
    chosen.forEach(function (x) {
      var c = CIRC[order.indexOf(opts.indexOf(x.t))]
      if (x.k === 'num') why.push(c + ' 的分针指着 ' + m + '，那是 ' + m * 5 + ' 分，不是 ' + m + ' 分')
      else if (x.k === 'hour') why.push(c + ' 的时针快到 ' + h + ' 了，可还没到，是 ' + prev(h) + ' 时')
      else if (x.k === 'back') why.push(c + ' 是倒着数的，分针要从 12 起顺着数')
      else why.push(c + ' 的时针过的是 ' + x.t.h + '，是 ' + x.t.h + ' 时')
    })
    sol.push({ tag: '小心陷阱', text: why.join('；') + '。' })
    sol.push({ tag: '答', text: CIRC[idx] + ' 号钟表示 ' + name + '。' })
    return {
      topic: 'zhongbiao2',
      variant: 'pick',
      stem: stem,
      stemHTML: figStem(stem, clocksSVG(shown, true)),
      answer: CIRC[idx],
      unit: '',
      ansLabel: '答：',
      ansSuffix: '号钟。',
      workLabel: '划一划',
      solution: sol,
      key: keyOf('pick', [target], shown)
    }
  }

  /* ---------------- 变式③：画几时几分 ---------------- */

  function drawLine(t) {
    var k = Math.floor(t.m / 5)
    var r = t.m % 5
    var minute = r === 0
      ? '长长细细的分针指着 ' + k + '（' + t.m + ' 分 = ' + k + ' 个 5 小格）'
      : k === 0 ? '长长细细的分针从 12 起数 ' + r + ' 小格'
        : '长长细细的分针先到 ' + k + '（' + k * 5 + ' 分），再往后数 ' + r + ' 小格'
    return minute + '；短短粗粗的时针' + hourWhere(t) + '。'
  }

  function genDraw(s) {
    var d = s.difficulty || 'L1'
    var times
    if (d === 'L1') times = [T(U.randInt(1, 12), randMin(true))]
    else if (d === 'L2') times = [T(U.randInt(1, 12), randMin(false))]
    else times = U.shuffled(nearPair())
    if (!allClear(times)) return null
    var two = times.length > 1
    var stem = '在钟面上画出 ' + (two ? times.map(function (t, i) { return CIRC[i] + ' ' + word(t) }).join('、') : word(times[0])) +
      ' 的时针和分针，再用电子计时法写一写。'
    var answer = two ? times.map(function (t, i) { return CIRC[i] + ' ' + fmt(t) }).join('　') : fmt(times[0])
    var sol = [{ tag: '想一想', text: '先画分针：数好小格再画，长长细细的；再画时针：过了几就画在几后面，短短粗粗的。' }]
    times.forEach(function (t, i) { sol.push({ tag: two ? '画' + CIRC[i] : '画一画', text: drawLine(t) }) })
    sol.push({ tag: '小心陷阱', text: two
      ? '两个钟的时针都在同一个数附近：' + fmt(times[0].m > 40 ? times[0] : times[1]) + ' 的时针要画在这个数前面一点，' + fmt(times[0].m > 40 ? times[1] : times[0]) + ' 的画在后面一点。'
      : '时针别正对着 ' + times[0].h + '：几分的时候时针已经往前走了一点。' })
    sol.push({ tag: '答', text: answer + '。' })
    return {
      topic: 'zhongbiao2',
      variant: 'draw',
      stem: stem,
      stemHTML: figStem(stem, clocksSVG(times.map(function () { return null }), two)),
      diagramHTML: answerFig(times, two),
      answer: answer,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '。',
      workLabel: '画一画',
      solution: sol,
      key: keyOf('draw', times)
    }
  }

  /* ---------------- 变式④：排一排（中午到傍晚） ---------------- */

  var THINGS = ['画画', '踢球', '看书', '弹琴', '搭积木', '写字', '跳绳']

  function genOrder(s) {
    var d = s.difficulty || 'L1'
    var hs = U.shuffled([1, 2, 3, 4, 5])
    var times
    if (d === 'L1') times = [T(hs[0], randMin(true)), T(hs[1], randMin(true)), T(hs[2], randMin(true))]
    else if (d === 'L2') times = [T(12, U.randInt(5, 55)), T(hs[0], U.randInt(1, 59)), T(hs[1], U.randInt(1, 59))]
    else {
      var a = U.randInt(1, 4)
      times = [T(12, U.randInt(5, 55)), T(a, U.randInt(45, 59)), T(a + 1, U.randInt(1, 14))]
    }
    if (times.some(function (t) { return t.m === 0 || t.m === 30 })) return null
    if (!allClear(times)) return null
    times = U.shuffled(times)
    var rank = times.map(function (t, i) { return i }).sort(function (x, y) { return pmOrder(times[x]) - pmOrder(times[y]) })
    /* 不要正好就是 ①②③ 的顺序 */
    if (rank.join() === '0,1,2') return null
    var who = U.pick(U.NAMES)
    var things = U.shuffled(THINGS).slice(0, 3)
    var stem = who + (d === 'L1' ? '下午' : '从中午到傍晚') + '做了三件事，钟面是每件事开始的时刻。按先后排一排（填序号）。'
    var answer = rank.map(function (i) { return CIRC[i] }).join(' → ')
    var sol = [{ tag: '想一想', text: '先把每个钟读出来，再比先后：中午 12 时过了，接着是下午 1 时、2 时……' }]
    sol.push({ tag: '读一读', text: times.map(function (t, i) { return CIRC[i] + ' ' + things[i] + ' ' + fmt(t) }).join('；') + '。' })
    var trap = []
    if (times.some(function (t) { return t.h === 12 })) trap.push('12 时虽然数大，却是中午，比下午 1 时早')
    var late = times.filter(function (t) { return t.m >= 45 })[0]
    if (d === 'L3' && late) trap.push(fmt(late) + ' 的时针快到 ' + next(late.h) + ' 了，可还没到，比 ' + next(late.h) + ' 时几分早')
    if (!trap.length) trap.push('先比时：时针过了几；时一样再比分')
    sol.push({ tag: '小心陷阱', text: trap.join('；') + '。' })
    sol.push({ tag: '答', text: rank.map(function (i) { return CIRC[i] + ' ' + things[i] }).join(' → ') + '。' })
    return {
      topic: 'zhongbiao2',
      variant: 'order',
      stem: stem,
      stemHTML: figStem(stem, clocksSVG(times, true, null, things)),
      answer: answer,
      unit: '',
      ansLabel: '答：',
      ansSuffix: '。',
      workLabel: '读一读',
      solution: sol,
      key: keyOf('order', times)
    }
  }

  /* ---------------- 讲解页小插图 ---------------- */

  function small(t, w) {
    return clocksSVG([t], false, 'width:' + (w || 96) + 'px;height:auto')
  }

  /* 先想一想：7:20，分针既不指 12 也不指 6 */
  var HOOK_SVG = (function () {
    var p = ['<svg viewBox="0 0 124 124" width="124" height="124">']
    p.push(face(62, 62, T(7, 20)))
    p.push('</svg>')
    return p.join('')
  })()

  /* 大格和小格：放大 12 到 1 这一段 */
  var GRID_FIG = (function () {
    var p = ['<svg viewBox="0 0 170 70" width="150" height="62">']
    p.push('<line x1="10" y1="30" x2="160" y2="30" stroke="#000" stroke-width="1.6"/>')
    for (var i = 0; i <= 5; i++) {
      var x = 10 + i * 30
      var big = i === 0 || i === 5
      p.push('<line x1="' + x + '" y1="' + (big ? 16 : 22) + '" x2="' + x + '" y2="30" stroke="#000" stroke-width="' + (big ? 2.2 : 1) + '"/>')
      if (i > 0) p.push('<text x="' + (x - 15) + '" y="46" font-size="11" text-anchor="middle">' + i + '</text>')
    }
    p.push('<text x="10" y="12" font-size="13" text-anchor="middle">12</text>')
    p.push('<text x="160" y="12" font-size="13" text-anchor="middle">1</text>')
    p.push('<text x="85" y="64" font-size="12" text-anchor="middle">1 大格 = 5 小格</text>')
    p.push('</svg>')
    return p.join('')
  })()

  /* 5 个 5 个数：数字 → 分 */
  var FIVE_FIG = (function () {
    var p = ['<svg viewBox="0 0 240 52" width="230" height="50">']
    p.push('<text x="2" y="18" font-size="11">指着</text><text x="2" y="42" font-size="11">是</text>')
    for (var i = 1; i <= 11; i++) {
      var x = 30 + (i - 1) * 19.5
      p.push('<text x="' + x + '" y="18" font-size="11" text-anchor="middle">' + i + '</text>')
      p.push('<text x="' + x + '" y="42" font-size="11" text-anchor="middle" font-weight="bold">' + i * 5 + '</text>')
    }
    p.push('<line x1="22" y1="26" x2="236" y2="26" stroke="#000" stroke-width="0.8"/>')
    p.push('</svg>')
    return p.join('')
  })()

  var DIGI_FIG = (function () {
    var p = ['<svg viewBox="0 0 160 90" width="140" height="78">']
    ;[['7 时 20 分', '7:20', 6], ['7 时 5 分', '7:05', 48]].forEach(function (r) {
      p.push('<text x="4" y="' + (r[2] + 26) + '" font-size="13">' + r[0] + '</text>')
      p.push('<rect x="74" y="' + (r[2] + 4) + '" width="78" height="32" rx="5" fill="#fff" stroke="#000" stroke-width="1.8"/>')
      p.push('<text x="113" y="' + (r[2] + 27) + '" font-size="19" font-weight="bold" text-anchor="middle">' + r[1] + '</text>')
    })
    p.push('</svg>')
    return p.join('')
  })()

  var ZHONGBIAO2 = {
    id: 'zhongbiao2',
    no: 'B04',
    stage: 'L1B',
    name: '认识钟表：几时几分',
    lesson: {
      v2: true,
      title: '几时几分 · 方法讲解',
      goal: '分针不指 12、也不指 6 的时候，也能读出、画出几时几分，还能排出先后。',
      sections: [
        {
          kind: 'hook',
          heading: '先想一想',
          paras: [
            'B03 我们会读整时和半时了。可这个钟的分针既不指 12，也不指 6，是几时几分？',
            '时针过了 7，是 7 时；分针要一小格一小格数。数小格，就是今天的本领。'
          ],
          figHTML: HOOK_SVG
        },
        {
          kind: 'know',
          heading: '先认识',
          cards: [
            { title: '大格和小格', text: '钟面上有 12 个大格、60 个小格；1 大格 = 5 小格。分针走 1 小格是 1 分。', figHTML: GRID_FIG },
            { title: '5 个 5 个数', text: '分针指着几，就 5 个 5 个数几次：指着 4 是 20 分，不是 4 分。分针走一圈 60 小格，1 时 = 60 分。', figHTML: FIVE_FIG },
            { title: '补 0', text: '电子计时法分要写两位：7 时 5 分写作 7:05。', figHTML: DIGI_FIG }
          ]
        },
        {
          kind: 'move',
          name: '读几时几分',
          tip: '时针看过了几，分针从 12 起顺着数。',
          steps: [
            '看时针：过了几就是几时；快到下一个数也还没到，还是这一时。',
            '看分针：指着数就 5 个 5 个数；在两个数中间，先数到前一个数，再一小格一小格数。',
            '写一写：几时几分写成「几:分」，分不满 10 前面补 0。'
          ],
          pitfall: '时针快到 6 的 5 时 58 分，别读成 6:58。',
          figHTML: small(T(5, 52)),
          variants: ['read', 'pick']
        },
        {
          kind: 'move',
          name: '画几时几分',
          tip: '先数好小格画分针，再看分画时针。',
          steps: [
            '画分针：长长的、细细的，从 12 起数到第几小格就指到哪。',
            '画时针：短短的、粗粗的，过了几就画在几后面——分少刚过一点，30 分左右在中间，分多快到下一个数。',
            '写一写：用电子计时法写出来。'
          ],
          pitfall: '几分的时候，时针不会正对着数。',
          figHTML: small(T(4, 11)),
          variants: ['draw']
        },
        {
          kind: 'move',
          name: '排先后',
          tip: '一个个读出来，再比时、比分。',
          steps: [
            '先把每个钟读成几时几分。',
            '比时：中午 12 时最早，接着是下午 1 时、2 时、3 时……',
            '时一样再比分，分少的早。'
          ],
          pitfall: '12 时数大，可中午 12 时比下午 1 时早。',
          variants: ['order']
        },
        {
          kind: 'pick',
          heading: '用哪一招？',
          rows: [
            ['给了钟，问几时几分；或者给了时刻，问是哪个钟', '读几时几分', ['read', 'pick']],
            ['给了时刻和空钟面', '画几时几分', ['draw']],
            ['几个钟，问谁先谁后', '排先后', ['order']]
          ]
        },
        { kind: 'chant', chant: '时针过几就几时，快到下个还不算；分针 5 个 5 个数，零头小格接着数；分不满 10 前补 0。' }
      ]
    },
    variants: [
      {
        id: 'read',
        setting: 'vZfRead',
        label: '看钟写几时几分',
        idea: '时针过了几就是几时（快到下一个数也还没到）；分针从 12 起顺着数，指着数就 5 个 5 个数，零头一小格一小格数；分不满 10 补 0。',
        gen: genRead
      },
      {
        id: 'pick',
        setting: 'vZfPick',
        label: '哪个钟是这个时刻',
        idea: '把每个钟读出来再比；小心分针指着 2 是 10 分不是 2 分、倒着数的小格、时针快到 h 的其实是 (h-1) 时。',
        gen: genPick
      },
      {
        id: 'draw',
        setting: 'vZfDraw',
        label: '画几时几分',
        idea: '先数小格画长长细细的分针，再看分多少画短短粗粗的时针：分少刚过几，30 分左右在中间，分多快到下一个数。',
        def: false,
        gen: genDraw
      },
      {
        id: 'order',
        setting: 'vZfOrder',
        label: '排先后（中午到傍晚）',
        idea: '把每个钟读出来，中午 12 时最早，再是下午 1 时、2 时……；时一样比分；快到整时的还没到那一时。',
        gen: genOrder
      }
    ],
    generate: function (s) {
      return U.generateFrom(ZHONGBIAO2.variants, s)
    },
    titleFor: function (s) {
      return '几时几分练习 · ' + U.DIFF_LABEL[s.difficulty || 'L1']
    }
  }

  root.SumSum.aoshu.topics.zhongbiao2 = ZHONGBIAO2
  root.SumSum.aoshu.topicList.push(ZHONGBIAO2)
})(typeof window !== 'undefined' ? window : globalThis)
