/**
 * 知识点「B06 镜子里的对称」（L1 补充，对照学而思 1 级第 15 讲好方法 5、6 和练 13、16～18，
 * 拆题笔记 docs/xes-1ji/15-感受对称之美.md 的 K11～K13、M5、M6；轴对称图形在 B05 duichen）。
 * 变式：①镜子里的钟（入门整时、提高半时、挑战几时几分；真实时间 = 12 时 − 镜子里的时间）
 *       ②镜子里的数（七段数字；入门两位、提高三四位、挑战五位或水里的倒影）
 *       ③照镜子选一选（给真实的数，选镜子里 / 水里看到的样子）
 * 数字一律画成电子表的七段数字（不靠字体）：镜子 = 每段左右互换 + 顺序倒过来，水里 = 每段上下互换。
 * key 里带真实时间 / 数和翻法，tools/check-aoshu-gen.js 的 checkJingzi 从 key 独立重算。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util
  var CIRC = ['①', '②', '③', '④']

  /* ---------------- 七段数字 ---------------- */

  var SEG = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg']
  var MIR = { a: 'a', b: 'f', c: 'e', d: 'd', e: 'c', f: 'b', g: 'g' }   /* 左右翻 */
  var WAT = { a: 'd', b: 'c', c: 'b', d: 'a', e: 'f', f: 'e', g: 'g' }   /* 上下翻 */
  function mapSeg(s, m) { return s.split('').map(function (c) { return m[c] }).sort().join('') }
  /* 一串数字 → 段编码数组 */
  function segs(str) { return str.split('').map(function (d) { return SEG[+d] }) }
  /* 翻法：mirror 镜子（翻每个 + 倒序），water 水里（翻每个上下），flipOnly 只翻不倒序，revOnly 只倒序 */
  function look(str, how) {
    var s = segs(str)
    if (how === 'mirror') return s.map(function (x) { return mapSeg(x, MIR) }).reverse()
    if (how === 'water') return s.map(function (x) { return mapSeg(x, WAT) })
    if (how === 'flipOnly') return s.map(function (x) { return mapSeg(x, MIR) })
    if (how === 'revOnly') return s.slice().reverse()
    return s
  }
  function same(a, b) { return a.join('|') === b.join('|') }
  /* 翻过来以后能不能直接当数字读（能读就太容易了） */
  function readable(img) { return img.every(function (x) { return SEG.indexOf(x) >= 0 }) }

  var DW = 30, DH = 52, DT = 6, DG = 12
  function digitPath(s, x0, y0) {
    var w = DW, h = DH, t = DT, hh = h / 2
    var R = {
      a: [x0 + t, y0, w - 2 * t, t],
      d: [x0 + t, y0 + h - t, w - 2 * t, t],
      g: [x0 + t, y0 + hh - t / 2, w - 2 * t, t],
      f: [x0, y0 + t, t, hh - 1.5 * t],
      b: [x0 + w - t, y0 + t, t, hh - 1.5 * t],
      e: [x0, y0 + hh + t / 2, t, hh - 1.5 * t],
      c: [x0 + w - t, y0 + hh + t / 2, t, hh - 1.5 * t]
    }
    return s.split('').map(function (k) {
      var r = R[k]
      return '<rect x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] + '" rx="2" fill="#000"/>'
    }).join('')
  }
  /* 一串七段数字，外面画个框（像电子屏） */
  function digitsSVG(img, style, label) {
    var pad = 10
    var W = img.length * DW + (img.length - 1) * DG + pad * 2
    var H = DH + pad * 2 + (label ? 16 : 0)
    var top = label ? 16 : 0
    var p = ['<svg ' + (style ? 'style="' + style + '"' : 'class="fig-big"') + ' viewBox="0 0 ' + W + ' ' + H + '" width="' + W * 1.6 + '" height="' + H * 1.6 + '">']
    if (label) p.push('<text x="2" y="12" font-size="12">' + label + '</text>')
    p.push('<rect x="1" y="' + (top + 1) + '" width="' + (W - 2) + '" height="' + (DH + pad * 2 - 2) + '" rx="6" fill="#fff" stroke="#000" stroke-width="1.6"/>')
    img.forEach(function (s, i) { p.push(digitPath(s, pad + i * (DW + DG), top + pad)) })
    p.push('</svg>')
    return p.join('')
  }
  /* 一排选项 */
  function optionsSVG(imgs) {
    var pad = 10, gap = 22
    var widths = imgs.map(function (img) { return img.length * DW + (img.length - 1) * DG + pad * 2 })
    var W = widths.reduce(function (a, b) { return a + b + gap }, 0)
    var H = DH + pad * 2 + 18
    var p = ['<svg style="width:100%;height:auto;max-height:24mm;max-width:' + imgs.length * 46 + 'mm" viewBox="0 0 ' + W + ' ' + H + '" width="' + W * 1.6 + '" height="' + H * 1.6 + '">']
    var x = 0
    imgs.forEach(function (img, k) {
      p.push('<text x="' + (x + 2) + '" y="13" font-size="13">' + CIRC[k] + '</text>')
      p.push('<rect x="' + (x + 1) + '" y="19" width="' + (widths[k] - 2) + '" height="' + (DH + pad * 2 - 2) + '" rx="6" fill="#fff" stroke="#000" stroke-width="1.6"/>')
      img.forEach(function (s, i) { p.push(digitPath(s, x + pad + i * (DW + DG), 18 + pad)) })
      x += widths[k] + gap
    })
    p.push('</svg>')
    return p.join('')
  }

  /* ---------------- 钟 ---------------- */

  function T(h, m) { return { h: h, m: m } }
  function fmt(t) { return t.h + ':' + (t.m < 10 ? '0' : '') + t.m }
  function word(t) { return t.h + ' 时' + (t.m === 0 ? '' : t.m === 30 ? '半' : ' ' + t.m + ' 分') }
  /* 镜子里的时间 ↔ 真实时间：合起来 12 时 */
  function mirrorTime(t) {
    var v = (720 - ((t.h % 12) * 60 + t.m)) % 720
    var h = Math.floor(v / 60)
    return T(h === 0 ? 12 : h, v % 60)
  }

  var R = 52
  function pt(cx, cy, len, deg) {
    var a = deg * Math.PI / 180
    return [+(cx + len * Math.sin(a)).toFixed(2), +(cy - len * Math.cos(a)).toFixed(2)]
  }
  /* nums = false：镜子里的钟不写数，12 点那一格刻度加粗 */
  function face(cx, cy, t, nums) {
    var p = []
    p.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="#fff" stroke="#000" stroke-width="2.6"/>')
    for (var i = 0; i < 60; i++) {
      var big = i % 5 === 0
      var a = pt(cx, cy, R - 2, i * 6)
      var b = pt(cx, cy, R - (i === 0 && !nums ? 13 : big ? 8 : 5), i * 6)
      p.push('<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="#000" stroke-width="' + (i === 0 && !nums ? 4 : big ? 1.8 : 0.8) + '"/>')
    }
    if (nums) for (var n = 1; n <= 12; n++) {
      var q = pt(cx, cy, R - 18, n * 30)
      p.push('<text x="' + q[0] + '" y="' + (q[1] + 4.3) + '" font-size="12" text-anchor="middle">' + n + '</text>')
    }
    var mh = pt(cx, cy, R * 0.8, t.m * 6)
    var hh = pt(cx, cy, R * 0.48, ((t.h % 12) + t.m / 60) * 30)
    p.push('<line class="mh" x1="' + cx + '" y1="' + cy + '" x2="' + mh[0] + '" y2="' + mh[1] + '" stroke="#000" stroke-width="2.2" stroke-linecap="round"/>')
    p.push('<line class="hh" x1="' + cx + '" y1="' + cy + '" x2="' + hh[0] + '" y2="' + hh[1] + '" stroke="#000" stroke-width="5.5" stroke-linecap="round"/>')
    p.push('<circle cx="' + cx + '" cy="' + cy + '" r="3.4" fill="#000"/>')
    return p.join('')
  }
  /* 镜子里的钟：钟 + 右边一面镜子（斜线） */
  function mirrorClockSVG(t, style) {
    var p = ['<svg ' + (style ? 'style="' + style + '"' : 'class="fig-big"') + ' viewBox="0 0 150 124" width="240" height="198">']
    p.push(face(62, 62, t, false))
    p.push('<line x1="132" y1="6" x2="132" y2="118" stroke="#000" stroke-width="3"/>')
    for (var y = 12; y < 118; y += 10) p.push('<line x1="132" y1="' + y + '" x2="142" y2="' + (y - 7) + '" stroke="#000" stroke-width="1"/>')
    p.push('</svg>')
    return p.join('')
  }
  function realClockSVG(t, style) {
    return '<svg ' + (style ? 'style="' + style + '"' : '') + ' viewBox="0 0 124 124" width="124" height="124">' + face(62, 62, t, true) + '</svg>'
  }

  /* ---------------- 变式①：镜子里的钟 ---------------- */

  function genClock(s) {
    var d = s.difficulty || 'L1'
    var real
    if (d === 'L1') real = T(U.pick([1, 2, 3, 4, 5, 7, 8, 9, 10, 11]), 0)
    else if (d === 'L2') real = T(U.randInt(1, 12), 30)
    else {
      var m
      do { m = U.randInt(1, 11) * 5 } while (m === 30)
      real = T(U.randInt(1, 12), m)
    }
    var seen = mirrorTime(real)
    if (seen.h === real.h && seen.m === real.m) return null
    /* 两根针挨太近看不清 */
    var gap = Math.abs(((seen.h % 12) + seen.m / 60) * 30 - seen.m * 6) % 360
    if (Math.min(gap, 360 - gap) < 15 && seen.m !== 0) return null
    var stem = d === 'L1'
      ? '从镜子里看到的钟是这样的，看起来是 ' + word(seen) + '。钟上真实的时间是几时？'
      : '从镜子里看到的钟是这样的（钟面没写数，最粗的那格是 12）。钟上真实的时间是几时几分？'
    var sol = [{ tag: '想一想', text: '镜子里上下不变、左右相反。从 12 到 6 画一条竖线当对称轴，把两根针左右翻过去。' }]
    sol.push({ tag: '读一读', text: '镜子里的钟看起来是 ' + fmt(seen) + '。' })
    var hint = []
    if (seen.m === 0 || seen.m === 30) hint.push('分针指着 ' + (seen.m === 0 ? 12 : 6) + '，翻过去不动')
    else hint.push('分针从 ' + seen.m / 5 + ' 那边翻到 ' + (12 - seen.m / 5) + ' 那边')
    hint.push('时针从 ' + (seen.h % 12 === 0 ? 12 : seen.h) + (seen.m ? ' 后面' : ' ') + '翻到 ' + (real.h % 12 === 0 ? 12 : real.h) + (real.m ? ' 后面' : ''))
    sol.push({ tag: '翻一翻', text: hint.join('；') + '，真实时间是 ' + fmt(real) + '。' })
    sol.push({ tag: '验一验', text: '镜子里的时间和真实时间合起来正好 12 时：' + fmt(seen) + ' + ' + fmt(real) + ' = 12:00。' })
    sol.push({ tag: '答', text: '真实时间是 ' + fmt(real) + '。' })
    return {
      topic: 'jingzi',
      variant: 'clock',
      stem: stem,
      stemHTML: stem + '<div>' + mirrorClockSVG(seen) + '</div>',
      diagramHTML: '<div class="sol-diagram">' + realClockSVG(real, 'height:24mm;width:auto') + '</div>',
      answer: fmt(real),
      unit: '',
      ansLabel: '答：真实时间是',
      ansSuffix: '。',
      workLabel: '翻一翻',
      solution: sol,
      key: 'clock:' + fmt(real) + '|' + fmt(seen)
    }
  }

  /* ---------------- 变式②：镜子里的数 ---------------- */

  var ODD = [3, 4, 6, 7, 9] /* 镜子里翻过来不像数字的 */
  function randNum(len) {
    for (var t = 0; t < 50; t++) {
      var s = String(U.randInt(1, 9))
      for (var i = 1; i < len; i++) s += U.randInt(0, 9)
      if (s.split('').some(function (c) { return ODD.indexOf(+c) >= 0 })) return s
    }
    return null
  }

  function genNum(s) {
    var d = s.difficulty || 'L1'
    var len = d === 'L1' ? 2 : d === 'L2' ? U.randInt(3, 4) : 5
    var how = d === 'L3' && U.rand() < 0.4 ? 'water' : 'mirror'
    var real = randNum(len)
    if (!real) return null
    var img = look(real, how)
    if (readable(img)) return null
    var stem = how === 'mirror'
      ? '下面是从镜子里看到的一个数，这个数实际是多少？'
      : '下面是一个数在水里的倒影，这个数实际是多少？'
    var sol = [{ tag: '想一想', text: how === 'mirror'
      ? '镜子里左右相反：顺序倒过来了，每个数也翻了面。从右往左读，每个数左右翻回来。'
      : '水里的倒影上下相反：顺序不变，每个数上下翻回来。' }]
    sol.push({ tag: '翻一翻', text: (how === 'mirror' ? '从右往左：' : '从左往右：') + real.split('').join('、') + '。也可以把纸翻过来，对着光看背面。' })
    sol.push({ tag: '小心陷阱', text: how === 'mirror' ? '别从左往右直接读，那样顺序是反的。' : '水里的倒影是上下翻，顺序不用倒过来。' })
    sol.push({ tag: '答', text: '这个数实际是 ' + real + '。' })
    return {
      topic: 'jingzi',
      variant: 'num',
      stem: stem,
      stemHTML: stem + '<div>' + digitsSVG(img, 'height:auto;width:' + (len * 13 + 8) + 'mm;max-width:100%') + '</div>',
      answer: +real,
      unit: '',
      ansLabel: '答：实际是',
      ansSuffix: '。',
      workLabel: '翻一翻',
      solution: sol,
      key: 'num:' + how + '|' + real
    }
  }

  /* ---------------- 变式③：照镜子选一选 ---------------- */

  function genPick(s) {
    var d = s.difficulty || 'L1'
    var len = d === 'L1' ? 2 : 3
    var how = d === 'L3' && U.rand() < 0.5 ? 'water' : 'mirror'
    var real = randNum(len)
    if (!real) return null
    var right = { k: how, img: look(real, how) }
    var traps = how === 'mirror'
      ? [{ k: 'flipOnly', img: look(real, 'flipOnly') }, { k: 'revOnly', img: look(real, 'revOnly') }, { k: 'water', img: look(real, 'water') }]
      : [{ k: 'mirror', img: look(real, 'mirror') }, { k: 'revOnly', img: look(real, 'revOnly') }, { k: 'real', img: look(real, 'real') }]
    var n = d === 'L1' ? 3 : 4
    traps = traps.slice(0, n - 1)
    var all = [right].concat(traps)
    for (var i = 0; i < all.length; i++) for (var j = i + 1; j < all.length; j++) if (same(all[i].img, all[j].img)) return null
    all = U.shuffled(all)
    var idx = 0
    all.forEach(function (o, k) { if (o === right) idx = k })
    var stem = how === 'mirror'
      ? '衣服上的号码是 ' + real + '，照镜子时，镜子里看到的是哪个？'
      : '车牌上的号码是 ' + real + '，水里的倒影是哪个？'
    var why = all.map(function (o, k) {
      var c = CIRC[k]
      if (o === right) return c + (how === 'mirror' ? ' 顺序倒了、每个数也左右翻了，对' : ' 每个数上下翻了、顺序没变，对')
      if (o.k === 'flipOnly') return c + ' 每个数翻了，可是顺序没倒过来'
      if (o.k === 'revOnly') return c + ' 顺序倒了，可是每个数没翻面'
      if (o.k === 'water') return c + ' 是上下翻的，那是水里的倒影'
      if (o.k === 'mirror') return c + ' 是左右翻的，那是镜子里的样子'
      return c + ' 就是原来的样子，没翻'
    })
    var sol = [{ tag: '想一想', text: how === 'mirror'
      ? '镜子里左右相反：顺序倒过来，每个数也左右翻面；上下不变。'
      : '水里的倒影上下相反：顺序不变，每个数上下翻。' }]
    sol.push({ tag: '比一比', text: why.join('；') + '。' })
    sol.push({ tag: '答', text: CIRC[idx] + ' 号。' })
    return {
      topic: 'jingzi',
      variant: 'pick',
      stem: stem,
      stemHTML: stem + '<div>' + optionsSVG(all.map(function (o) { return o.img })) + '</div>',
      answer: CIRC[idx],
      unit: '',
      ansLabel: '答：',
      ansSuffix: '号。',
      workLabel: '比一比',
      solution: sol,
      key: 'pick:' + how + '|' + real + '|' + all.map(function (o) { return o.img.join('.') }).join('|')
    }
  }

  /* ---------------- 讲解页插图 ---------------- */

  /* 举右手照镜子：小人 + 镜子 + 镜子里的小人 */
  var HOOK_SVG = (function () {
    function kid(x, handRight, dash) {
      var st = 'stroke="#000" stroke-width="2.4" fill="none"' + (dash ? ' stroke-dasharray="4 3"' : '')
      var hx = handRight ? 1 : -1
      return '<circle cx="' + x + '" cy="22" r="10" ' + st + '/>' +
        '<line x1="' + x + '" y1="32" x2="' + x + '" y2="66" ' + st + '/>' +
        '<line x1="' + x + '" y1="42" x2="' + (x + 16 * hx) + '" y2="22" ' + st + '/>' +
        '<line x1="' + x + '" y1="42" x2="' + (x - 14 * hx) + '" y2="56" ' + st + '/>' +
        '<line x1="' + x + '" y1="66" x2="' + (x - 10) + '" y2="88" ' + st + '/><line x1="' + x + '" y1="66" x2="' + (x + 10) + '" y2="88" ' + st + '/>'
    }
    return '<svg viewBox="0 0 170 100" width="200" height="118">' + kid(40, true, false) +
      '<line x1="85" y1="4" x2="85" y2="96" stroke="#000" stroke-width="3"/>' +
      kid(130, false, true) +
      '<text x="56" y="12" font-size="10">右手</text><text x="100" y="12" font-size="10">？</text></svg>'
  })()
  var MIRROR_NUM_FIG = '<div style="display:flex;gap:10px;align-items:center">' +
    digitsSVG(look('27', 'real'), 'width:60px;height:auto') + '<span>镜子 →</span>' + digitsSVG(look('27', 'mirror'), 'width:60px;height:auto') + '</div>'
  var WATER_FIG = '<div style="display:flex;gap:10px;align-items:center">' +
    digitsSVG(look('27', 'real'), 'width:60px;height:auto') + '<span>水里 →</span>' + digitsSVG(look('27', 'water'), 'width:60px;height:auto') + '</div>'
  var CLOCK_FIG = '<div style="display:flex;gap:8px;align-items:center">' + mirrorClockSVG(T(3, 30), 'width:96px;height:auto') +
    '<span>翻过来 →</span>' + realClockSVG(T(8, 30), 'width:80px;height:auto') + '</div>'

  var JINGZI = {
    id: 'jingzi',
    no: 'B06',
    stage: 'L1B',
    name: '镜子里的对称',
    lesson: {
      v2: true,
      title: '镜子里的对称 · 方法讲解',
      goal: '知道镜子里上下不变、左右相反，会读镜子里的钟和数，还能认出水里的倒影。',
      sections: [
        {
          kind: 'hook',
          heading: '先想一想',
          paras: [
            '举起右手照镜子，镜子里的小朋友举的是哪只手？',
            '是左手！镜子里的你和你成轴对称，镜面就是对称轴：上下不变，左右相反。'
          ],
          figHTML: HOOK_SVG
        },
        {
          kind: 'know',
          heading: '先认识',
          cards: [
            { title: '镜子：左右相反', text: '镜子里的东西上下不变、左右相反。一串数在镜子里，顺序倒过来，每个数也翻了面。', figHTML: MIRROR_NUM_FIG },
            { title: '水里的倒影：上下相反', text: '水面像一面横着的镜子：左右不变、上下相反，顺序不倒。', figHTML: WATER_FIG }
          ]
        },
        {
          kind: 'move',
          name: '镜子里的钟：左右翻',
          tip: '从 12 到 6 画竖线，两根针翻过去。',
          steps: [
            '从 12 到 6 画一条竖线，当对称轴。',
            '两根针左右翻过去：3 点那边翻到 9 点那边，指着 12、6 的不动。',
            '读出真实时间，验一验：两个时间合起来正好 12 时（3:30 + 8:30 = 12:00）。'
          ],
          pitfall: '只翻左右，上下不变：指着 12 的分针还指着 12。',
          figHTML: CLOCK_FIG,
          variants: ['clock']
        },
        {
          kind: 'move',
          name: '镜子里的数：倒着读、翻回来',
          tip: '从右往左读，每个数翻回来。',
          steps: [
            '镜子里的数顺序反了：从右往左读。',
            '每个数也翻了面：把它左右翻回来再认。',
            '也可以把纸翻过来，对着光看背面透出来的数。'
          ],
          pitfall: '水里的倒影是上下翻，顺序不用倒。',
          figHTML: MIRROR_NUM_FIG,
          variants: ['num', 'pick']
        },
        {
          kind: 'pick',
          heading: '用哪一招？',
          rows: [
            ['镜子里的钟', '镜子里的钟：左右翻', ['clock']],
            ['镜子里、水里的数', '镜子里的数：倒着读、翻回来', ['num', 'pick']]
          ]
        },
        { kind: 'chant', chant: '镜子上下不变、左右反；钟面竖线翻一翻，两个时间凑 12 时；镜中数字倒着读，每个都要翻回来。' }
      ]
    },
    variants: [
      {
        id: 'clock',
        setting: 'vJzClock',
        label: '镜子里的钟',
        idea: '从 12 到 6 画竖线当对称轴，两根针左右翻过去；镜子里的时间和真实时间合起来正好 12 时。',
        gen: genClock
      },
      {
        id: 'num',
        setting: 'vJzNum',
        label: '镜子里的数',
        idea: '镜子里顺序倒了、每个数也翻了面：从右往左读，每个数左右翻回来；水里的倒影是上下翻。',
        gen: genNum
      },
      {
        id: 'pick',
        setting: 'vJzPick',
        label: '照镜子选一选',
        idea: '镜子里的样子要同时满足两条：顺序倒过来、每个数左右翻；只做到一条的不对，上下翻的是水里的倒影。',
        gen: genPick
      }
    ],
    generate: function (s) {
      return U.generateFrom(JINGZI.variants, s)
    },
    titleFor: function (s) {
      return '镜子里的对称练习 · ' + U.DIFF_LABEL[s.difficulty || 'L1']
    }
  }

  root.SumSum.aoshu.topics.jingzi = JINGZI
  root.SumSum.aoshu.topicList.push(JINGZI)
})(typeof window !== 'undefined' ? window : globalThis)
