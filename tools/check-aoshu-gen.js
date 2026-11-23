/**
 * 奥数出题校验。用法：node tools/check-aoshu-gen.js
 *
 * 盯两件事：
 * 1.【5 道一组】家长的用法是先做 5 道、错了再做下一组 5 道。每组都要把勾选的题型轮一遍，
 *   同一种题型不连着出，第二组和第一组题目不重复。
 * 2.【不出送分题】「5、6、7、8、9、（　）」「3 个点数线段」这种跟 1+1 没区别的题，
 *   按知识点逐条压住下限；顺带用独立算法把这些题的答案重算一遍（报错先怀疑本脚本，手算一两道再动生成器）。
 */
'use strict'

globalThis.window = globalThis
globalThis.document = {
  getElementById: function () { return null },
  querySelectorAll: function () { return [] },
  body: { classList: { remove: function () {}, add: function () {} } }
}

var fs = require('fs')
var path = require('path')
var JS = path.join(__dirname, '..', 'js')

require(path.join(JS, 'render.js'))
require(path.join(JS, 'aoshu-topics.js'))
fs.readdirSync(JS)
  .filter(function (f) { return /^aoshu-topic-/.test(f) })
  .forEach(function (f) { require(path.join(JS, f)) })

var A = globalThis.SumSum.aoshu
var U = A.util
var DIFFS = ['L1', 'L2', 'L3']

var problems = []
function bad(msg) {
  if (problems.length < 60) problems.push(msg)
}

/* 默认勾选（def !== false）的设置 */
function defaults(t, d, count) {
  var s = { difficulty: d, count: count }
  t.variants.forEach(function (v) { s[v.setting] = v.def !== false })
  return s
}

/* 某个题型单独出 n 道（直接调生成器，拒绝采样） */
function sample(t, vid, d, n) {
  var v = t.variants.filter(function (x) { return x.id === vid })[0]
  var out = []
  for (var i = 0; out.length < n && i < n * 300; i++) {
    var q = v.gen({ difficulty: d })
    if (q) out.push(q)
  }
  return out
}

function nums(stem) {
  return (String(stem).match(/\d+/g) || []).map(Number)
}

/* ---------- 1. 5 道一组 ---------- */

function checkGroups() {
  A.topicList.forEach(function (t) {
    DIFFS.forEach(function (d) {
      for (var seed = 1; seed <= 30; seed++) {
        var s = defaults(t, d, 10)
        var on = U.selectedVariants(t.variants, s).length
        /* 某种题型自己就凑不出 10 道不重样的（如入门档「求原差」只有 3 道），轮到它就只能让别的题型顶上，不考核 */
        var thin = U.selectedVariants(t.variants, s).some(function (v) {
          var only = { difficulty: d, count: 10 }
          only[v.setting] = true
          return U.withSeed(seed, function () { return U.generateFrom([v], only) }).shortfall > 0
        })
        if (thin) continue
        var r = U.withSeed(seed, function () { return t.generate(s) })
        var qs = r.questions
        var keys = new Set(qs.map(function (q) { return q.key }))
        if (keys.size !== qs.length) bad(t.no + ' ' + d + ' 种子 ' + seed + '：一张卷子里有重复的题')
        if (r.shortfall) continue // 题库本来就不够的（比如只勾一种、范围很小）不考核分组
        for (var g = 0; g < qs.length; g += U.GROUP) {
          var grp = qs.slice(g, g + U.GROUP)
          var kinds = new Set(grp.map(function (q) { return q.variant }))
          var want = Math.min(on, grp.length)
          if (kinds.size < want) {
            bad(t.no + ' ' + t.name + ' ' + d + ' 种子 ' + seed + '：第 ' + (g / U.GROUP + 1) + ' 组只出了 ' +
              kinds.size + ' 种题型（勾了 ' + on + ' 种）：' + grp.map(function (q) { return q.variant }).join(','))
          }
        }
        for (var i = 1; i < qs.length; i++) {
          if (on > 1 && qs[i].variant === qs[i - 1].variant) {
            bad(t.no + ' ' + t.name + ' ' + d + ' 种子 ' + seed + '：第 ' + i + '、' + (i + 1) + ' 道是同一种题型')
            break
          }
        }
      }
    })
  })
}

/* 组内尽量不撞答案：拿只有一种题型、答案又很集中的知识点看 */
function checkGroupAnswers() {
  var t = A.topics.xianjing
  var s = { difficulty: 'L1', count: 5, vXjAge: false, vXjCandle: true, vXjShare: false }
  if (!t.variants.some(function (v) { return v.setting === 'vXjCandle' })) return
  for (var seed = 1; seed <= 20; seed++) {
    var qs = U.withSeed(seed, function () { return t.generate(s) }).questions
    var ans = new Set(qs.map(function (q) { return JSON.stringify(q.answer) }))
    if (ans.size < qs.length) bad('趣味陷阱 只勾蜡烛 种子 ' + seed + '：5 道里答案有重复 ' + qs.map(function (q) { return q.answer }).join(','))
  }
}

/* 综合复习卷排课：每组每课至少 1 道、多的给最新的课、同一课不挨着 */
function checkReviewPlan() {
  function counts(arr) {
    var c = {}
    arr.forEach(function (x) { c[x] = (c[x] || 0) + 1 })
    return c
  }
  var cases = [
    { ids: ['a', 'b', 'c', 'd'], want: { a: 1, b: 1, c: 1, d: 2 } },
    { ids: ['a', 'b', 'c'], want: { a: 1, b: 2, c: 2 } },
    { ids: ['a', 'b'], want: { a: 2, b: 3 } },
    { ids: ['a'], want: { a: 5 } },
    { ids: ['a', 'b', 'c', 'd', 'e'], want: { a: 1, b: 1, c: 1, d: 1, e: 1 } }
  ]
  for (var seed = 1; seed <= 50; seed++) {
    cases.forEach(function (cs) {
      var plan = U.withSeed(seed, function () { return U.planReview(cs.ids, 10) })
      if (plan.length !== 10) bad('复习排课出了 ' + plan.length + ' 道')
      for (var g = 0; g < 10; g += 5) {
        var c = counts(plan.slice(g, g + 5))
        Object.keys(cs.want).forEach(function (id) {
          if (c[id] !== cs.want[id]) bad('复习排课 ' + cs.ids.join('') + ' 第 ' + (g / 5 + 1) + ' 组：' + plan.slice(g, g + 5).join(','))
        })
      }
      if (cs.ids.length > 2) {
        for (var i = 1; i < plan.length; i++) {
          if (plan[i] === plan[i - 1]) bad('复习排课 ' + cs.ids.join('') + ' 同一课挨着：' + plan.join(','))
        }
      }
    })
    /* 超过 5 课：最新的课每组都有，组内不重复，两组合起来尽量覆盖 */
    var many = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    var plan = U.withSeed(seed, function () { return U.planReview(many, 10) })
    for (var g = 0; g < 10; g += 5) {
      var grp = plan.slice(g, g + 5)
      if (grp.indexOf('h') < 0) bad('复习排课 8 课：最新的课这一组没出：' + grp.join(','))
      if (new Set(grp).size !== 5) bad('复习排课 8 课：组内有重复的课：' + grp.join(','))
    }
    if (new Set(plan).size < 8) bad('复习排课 8 课：两组下来还有课没轮到：' + plan.join(','))
  }
  /* 题量不是 5 的倍数：最后一组照样先保证每课 1 道 */
  var odd = U.withSeed(3, function () { return U.planReview(['a', 'b', 'c'], 8) })
  if (odd.length !== 8 || new Set(odd.slice(5)).size !== 3) bad('复习排课 8 道：最后 3 道应各来自一课：' + odd.join(','))
}

/* ---------- 2. 不出送分题 + 独立重算答案 ---------- */

var N = 200

function each(id, vid, fn) {
  var t = A.topics[id]
  DIFFS.forEach(function (d) {
    sample(t, vid, d, N).forEach(function (q) { fn(q, d) })
  })
}

function sym(a, b) { return a > b ? '>' : a < b ? '<' : '=' }

/* B01 比长短：从 key 独立重算（不调生成器里的任何函数），再核对「只靠讲解页的方法能判断」 */
function checkBichang() {
  if (!A.topics.bichang) return
  each('bichang', 'rope', function (q, d) {
    var parts = q.key.split(':')
    var rods = parts[1].split(',').map(function (x) { var a = x.split('/'); return { th: +a[0], n: +a[1] } })
    var len = rods.map(function (r) { return r.n * (r.th ? 1.6 : 1) })
    var want = parts[2] === 'L' ? Math.max.apply(null, len) : Math.min.apply(null, len)
    if (len.filter(function (l) { return l === want }).length !== 1) bad('B01 绕绳子答案不唯一：' + q.key)
    if (len.indexOf(want) + 1 !== q.answer) bad('B01 绕绳子答案错：' + q.key + ' 给的 ' + q.answer)
    if (rods.every(function (r) { return r.n < 3 })) bad('B01 绕绳子圈数太少：' + q.key)
  })
  each('bichang', 'grid', function (q, d) {
    var bars = q.key.split(':')[1].split(',').map(function (x) { return +x.replace(/t$/, '').split('.').slice(2).join('.') })
    var idx = bars.map(function (l, i) { return i })
    idx.sort(function (a, b) { return bars[a] - bars[b] })
    if (d === 'L1') {
      var want = /最长/.test(q.stem) ? idx[idx.length - 1] + 1 : idx[0] + 1
      if (q.answer !== want) bad('B01 方格最长最短答错：' + q.key + ' 给的 ' + q.answer)
    } else {
      var asc = /短到长/.test(q.stem)
      var seq = (asc ? idx : idx.slice().reverse()).map(function (i) { return (i + 1) + ' 号' }).join(' → ')
      if (q.answer !== seq) bad('B01 方格排序答错：' + q.key + ' 给的 ' + q.answer + ' 应为 ' + seq)
    }
    if (new Set(bars).size !== bars.length) bad('B01 方格有两支一样长：' + q.key)
  })
  each('bichang', 'route', function (q, d) {
    var mv = q.key.split(':')[2].split('|')
    var c = mv.map(function (m) {
      var dg = (m.match(/[RF]/g) || []).length
      return { dg: dg, st: m.length - dg, len: m.length - dg + dg * Math.SQRT2 }
    })
    var names = q.stem.match(/^(.+?)和(.+?)走得/)
    var want = Math.abs(c[0].len - c[1].len) < 1e-9 ? '两人同时到' : (c[0].len < c[1].len ? names[1] : names[2]) + '先到'
    if (q.answer !== want) bad('B01 路线答错：' + q.key + ' 给的 ' + q.answer + ' 应为 ' + want)
    var ok = (c[0].dg >= c[1].dg && c[0].st >= c[1].st) || (c[1].dg >= c[0].dg && c[1].st >= c[0].st)
    if (!ok) bad('B01 路线要算 1.4 倍才比得出：' + q.key)
    if (d !== 'L1' && c[0].dg + c[1].dg === 0) bad('B01 提高档路线没有斜线：' + q.key)
  })
}

/* B02 比轻重：从 key 独立枚举（每样东西 1～6 的重量全试一遍），和天平都对得上的组合，答案必须都一样且等于给的答案 */
function checkBizhong() {
  if (!A.topics.bizhong) return
  function parse(q) {
    var p = q.key.split(':')
    var names = p[1].split('/')
    var scales = p[2].split(',').map(function (x) {
      var m = x.match(/^([\d+]+)([<>=])([\d+]+)$/)
      return { L: m[1].split('+').map(Number), R: m[3].split('+').map(Number), op: m[2] }
    })
    return { names: names, scales: scales, ask: p[3] }
  }
  function answerFor(k, w) {
    var a = k.ask
    var n = k.names
    var m = a.match(/^cmp([HL])(\d)-(\d)$/)
    if (m) {
      var i = +m[2], j = +m[3]
      if (w[i] === w[j]) return '一样重'
      var heavy = w[i] > w[j] ? i : j
      return m[1] === 'H' ? n[heavy] : n[i + j - heavy]
    }
    var idx = w.map(function (x, i) { return i })
    if (a === 'max' || a === 'min') {
      var best = a === 'max' ? Math.max.apply(null, w) : Math.min.apply(null, w)
      var who = idx.filter(function (i) { return w[i] === best })
      return who.length === 1 ? n[who[0]] : '并列'
    }
    if (new Set(w).size !== w.length) return '有一样重的'
    idx.sort(function (x, y) { return w[y] - w[x] })
    if (a === 'asc') idx.reverse()
    return idx.map(function (i) { return n[i] }).join(' → ')
  }
  function solve(k) {
    var n = k.names.length
    var outs = new Set()
    var w = []
    ;(function rec(d) {
      if (d === n) {
        var ok = k.scales.every(function (sc) {
          var l = sc.L.reduce(function (s, i) { return s + w[i] }, 0)
          var r = sc.R.reduce(function (s, i) { return s + w[i] }, 0)
          return sc.op === '>' ? l > r : sc.op === '<' ? l < r : l === r
        })
        if (ok) outs.add(answerFor(k, w))
        return
      }
      for (var x = 1; x <= 6; x++) { w[d] = x; rec(d + 1) }
    })(0)
    return outs
  }
  ;['scale', 'sort', 'cancel'].forEach(function (vid) {
    each('bizhong', vid, function (q, d) {
      var k = parse(q)
      var outs = solve(k)
      if (outs.size !== 1) bad('B02 ' + vid + ' 光看天平推不出唯一答案：' + q.key + ' → ' + Array.from(outs).join(' / '))
      /* 入门档看天平答「小熊重 / 小狗轻」，比对时去掉末尾的重、轻 */
      var got = vid === 'scale' && d === 'L1' && q.answer !== '一样重' ? String(q.answer).replace(/[重轻]$/, '') : q.answer
      if (outs.size === 1 && Array.from(outs)[0] !== got) bad('B02 ' + vid + ' 答案错：' + q.key + ' 给的 ' + q.answer + ' 应为 ' + Array.from(outs)[0])
      if (vid === 'scale' && d === 'L1' && q.answer !== '一样重' && !/^.+(重|轻)$/.test(q.answer)) bad('B02 入门看天平答案要带重/轻：' + q.answer)
      var N = k.names.length
      if (vid === 'scale') {
        if (d !== 'L1' && k.scales.length < 2) bad('B02 看天平提高档只有一个天平：' + q.key)
        var cm = k.ask.match(/^cmp[HL](\d)-(\d)$/)
        if (d === 'L3' && cm && k.scales.some(function (sc) { return sc.L.concat(sc.R).indexOf(+cm[1]) >= 0 && sc.L.concat(sc.R).indexOf(+cm[2]) >= 0 })) bad('B02 看天平挑战档问的两样放在同一个天平上，一眼看穿：' + q.key)
      }
      if (vid === 'sort') {
        var want = d === 'L1' ? 3 : d === 'L2' ? 4 : 5
        if (N !== want || k.scales.length !== want - 1) bad('B02 排顺序数量不对：' + q.key)
      }
      if (vid === 'cancel' && !k.scales.every(function (sc) { return sc.L.length + sc.R.length >= 3 })) bad('B02 拿掉一样的：天平两边只有一对一，不用拿：' + q.key)
    })
  })
}

/*
 * B03 认识钟表：从 key 的时刻独立重算答案；再把题干 SVG 里每个钟两根针的终点量出来，
 * 换成角度和 key 的时刻对得上（分针 = 分 × 6°，时针 = (时 + 分/60) × 30°），长针必须比短针长。
 */
function checkZhongbiao() {
  if (!A.topics.zhongbiao) return
  var CI = ['①', '②', '③', '④']
  function tm(x) { var m = x.split(':'); return { h: +m[0], m: +m[1] } }
  function show(t) { return t.h + ':' + (t.m < 10 ? '0' : '') + t.m }
  function hands(html) {
    var out = []
    var re = /<line class="(mh|hh)" x1="([\d.]+)" y1="([\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/g
    var m
    while ((m = re.exec(html))) {
      var dx = +m[4] - +m[2], dy = +m[5] - +m[3]
      var deg = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360
      out.push({ k: m[1], deg: deg, len: Math.hypot(dx, dy) })
    }
    return out
  }
  function angOk(a, b) { var d = Math.abs(a - b) % 360; return Math.min(d, 360 - d) < 0.6 }
  function checkFace(q, times) {
    var hs = hands(q.stemHTML)
    if (hs.length !== times.length * 2) { bad('B03 题干里针的数量不对：' + q.key); return }
    times.forEach(function (t, i) {
      var mh = hs[i * 2], hh = hs[i * 2 + 1]
      if (mh.k !== 'mh' || hh.k !== 'hh') bad('B03 针的顺序不对：' + q.key)
      if (!angOk(mh.deg, t.m * 6)) bad('B03 分针角度和时刻对不上：' + q.key + ' 第 ' + (i + 1) + ' 个')
      if (!angOk(hh.deg, ((t.h % 12) + t.m / 60) * 30)) bad('B03 时针角度和时刻对不上：' + q.key + ' 第 ' + (i + 1) + ' 个')
      if (!(mh.len > hh.len * 1.4)) bad('B03 分针不比时针长：' + q.key)
    })
  }
  each('zhongbiao', 'read', function (q, d) {
    var times = q.key.split(':').slice(1).join(':').split(',').map(tm)
    var want = times.length > 1 ? times.map(function (t, i) { return CI[i] + ' ' + show(t) }).join('　') : show(times[0])
    if (q.answer !== want) bad('B03 看钟答案错：' + q.key + ' 给的 ' + q.answer)
    times.forEach(function (t) { if (t.m !== 0 && t.m !== 30) bad('B03 本课只出整时半时：' + q.key) })
    if (d === 'L1' && times.some(function (t) { return t.m !== 0 })) bad('B03 入门看钟出了半时：' + q.key)
    if (d === 'L3' && times.length !== 2) bad('B03 挑战看钟应是两个钟：' + q.key)
    checkFace(q, times)
  })
  each('zhongbiao', 'pick', function (q, d) {
    var parts = q.key.slice(5).split('|')
    var target = tm(parts[0])
    var opts = parts.slice(1).map(tm)
    var hit = []
    opts.forEach(function (o, i) { if (o.h === target.h && o.m === target.m) hit.push(i) })
    if (hit.length !== 1) bad('B03 选一选正确的钟不是正好一个：' + q.key)
    else if (q.answer !== CI[hit[0]]) bad('B03 选一选答案错：' + q.key + ' 给的 ' + q.answer)
    if (new Set(parts.slice(1)).size !== opts.length) bad('B03 选项有重复：' + q.key)
    if (opts.length !== (d === 'L3' ? 4 : 3)) bad('B03 选项个数不对：' + q.key)
    if (d === 'L1' && target.m !== 0) bad('B03 入门选一选出了半时：' + q.key)
    checkFace(q, opts)
  })
  each('zhongbiao', 'draw', function (q, d) {
    var times = q.key.split(':').slice(1).join(':').split(',').map(tm)
    var want = times.length > 1 ? times.map(function (t, i) { return CI[i] + ' ' + show(t) }).join('　') : show(times[0])
    if (q.answer !== want) bad('B03 画钟答案错：' + q.key + ' 给的 ' + q.answer)
    if (hands(q.stemHTML).length) bad('B03 画钟的题干钟面上已经有针：' + q.key)
    var ah = hands(q.diagramHTML)
    if (ah.length !== times.length * 2) bad('B03 画钟解析里缺答案图：' + q.key)
    if (/重在一起/.test(q.stem) && q.answer !== '12:00') bad('B03 两针重叠应是 12:00：' + q.stem)
    if (/一条直线/.test(q.stem) && q.answer !== '6:00') bad('B03 连成直线应是 6:00：' + q.stem)
  })
}

/*
 * B04 几时几分：从 key 的时刻独立重算答案（不调生成器），量题干两根针的角度；
 * 选一选正好一个对、选项不重复；排一排按「12 时最早、再 1 时、2 时……」重排；各档范围。
 */
function checkZhongbiao2() {
  if (!A.topics.zhongbiao2) return
  var CI = ['①', '②', '③', '④']
  function tm(x) { var m = x.split(':'); return { h: +m[0], m: +m[1] } }
  function show(t) { return t.h + ':' + (t.m < 10 ? '0' : '') + t.m }
  function list(q) { return q.key.split('|')[0].replace(/^[a-z]+:/, '').split(',').map(tm) }
  function hands(html) {
    var out = []
    var re = /<line class="(mh|hh)" x1="([\d.]+)" y1="([\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/g
    var m
    while ((m = re.exec(html))) {
      var dx = +m[4] - +m[2], dy = +m[5] - +m[3]
      out.push({ k: m[1], deg: (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360, len: Math.hypot(dx, dy) })
    }
    return out
  }
  function gap(a, b) { var d = Math.abs(a - b) % 360; return Math.min(d, 360 - d) }
  function checkFace(q, times, html) {
    var hs = hands(html || q.stemHTML)
    if (hs.length !== times.length * 2) { bad('B04 针的数量不对：' + q.key); return }
    times.forEach(function (t, i) {
      var mh = hs[i * 2], hh = hs[i * 2 + 1]
      if (mh.k !== 'mh' || hh.k !== 'hh') bad('B04 针的顺序不对：' + q.key)
      if (gap(mh.deg, t.m * 6) > 0.6) bad('B04 分针角度对不上：' + q.key)
      if (gap(hh.deg, ((t.h % 12) + t.m / 60) * 30) > 0.6) bad('B04 时针角度对不上：' + q.key)
      if (gap(mh.deg, hh.deg) < 14) bad('B04 两根针挨太近，小格数不清：' + q.key)
      if (!(mh.len > hh.len * 1.4)) bad('B04 分针不比时针长：' + q.key)
    })
  }
  function notB03(q, times) {
    times.forEach(function (t) { if (t.m === 0 || t.m === 30) bad('B04 出了整时半时（B03 的）：' + q.key) })
  }
  function joined(times) {
    return times.length > 1 ? times.map(function (t, i) { return CI[i] + ' ' + show(t) }).join('　') : show(times[0])
  }
  each('zhongbiao2', 'read', function (q, d) {
    var times = list(q)
    if (q.answer !== joined(times)) bad('B04 看钟答案错：' + q.key + ' 给的 ' + q.answer)
    notB03(q, times)
    if (d === 'L1' && times.some(function (t) { return t.m % 5 })) bad('B04 入门看钟分针不在数上：' + q.key)
    if (d === 'L3') {
      var s = times.slice().sort(function (a, b) { return b.m - a.m })
      if (times.length !== 2 || s[0].m < 45 || s[1].m > 14 || s[1].h !== s[0].h % 12 + 1) bad('B04 挑战看钟应是快到整时和刚过整时：' + q.key)
    }
    checkFace(q, times)
  })
  each('zhongbiao2', 'pick', function (q, d) {
    var parts = q.key.slice(5).split('|')
    var target = tm(parts[0])
    var opts = parts.slice(1).map(tm)
    var hit = []
    opts.forEach(function (o, i) { if (o.h === target.h && o.m === target.m) hit.push(i) })
    if (hit.length !== 1) bad('B04 选一选正确的钟不是正好一个：' + q.key)
    else if (q.answer !== CI[hit[0]]) bad('B04 选一选答案错：' + q.key + ' 给的 ' + q.answer)
    if (new Set(parts.slice(1)).size !== opts.length) bad('B04 选项有重复：' + q.key)
    if (opts.length !== (d === 'L3' ? 4 : 3)) bad('B04 选项个数不对：' + q.key)
    notB03(q, opts)
    var name = q.stem.match(/表示 (.+)？/)[1]
    if (name !== show(target) && name !== target.h + ' 时 ' + target.m + ' 分') bad('B04 选一选题干和 key 对不上：' + q.stem)
    checkFace(q, opts)
  })
  each('zhongbiao2', 'draw', function (q, d) {
    var times = list(q)
    if (q.answer !== joined(times)) bad('B04 画钟答案错：' + q.key)
    notB03(q, times)
    if (hands(q.stemHTML).length) bad('B04 画钟题干钟面上已经有针：' + q.key)
    checkFace(q, times, q.diagramHTML)
  })
  each('zhongbiao2', 'order', function (q, d) {
    var times = list(q)
    var idx = times.map(function (t, i) { return i })
    idx.sort(function (a, b) { var x = times[a], y = times[b]; return (x.h === 12 ? 0 : x.h) * 60 + x.m - ((y.h === 12 ? 0 : y.h) * 60 + y.m) })
    var want = idx.map(function (i) { return CI[i] }).join(' → ')
    if (q.answer !== want) bad('B04 排一排答案错：' + q.key + ' 给的 ' + q.answer)
    if (times.length !== 3) bad('B04 排一排不是三件事：' + q.key)
    if (new Set(times.map(show)).size !== 3) bad('B04 排一排有同一时刻：' + q.key)
    if (d !== 'L1' && !times.some(function (t) { return t.h === 12 })) bad('B04 提高、挑战的排一排应有中午 12 时：' + q.key)
    if (d === 'L3' && !times.some(function (t) { return t.m >= 45 && times.some(function (u) { return u.h === t.h % 12 + 1 && u.m <= 14 }) })) bad('B04 挑战排一排缺快到整时的一对：' + q.key)
    notB03(q, times)
    checkFace(q, times)
  })
}

/*
 * B05 轴对称：从 key 的方格编码独立重算（不调生成器）：哪几个对称、轴的条数、哪组成轴对称、补全后几格；
 * 标准图形的对称轴条数单独列表核对；方格图要连成一块。
 */
function checkDuichen() {
  if (!A.topics.duichen) return
  var CI = ['①', '②', '③', '④']
  function dec(s) {
    var p = s.split('.'), w = +p[0], h = +p[1], c = []
    for (var r = 0; r < h; r++) c.push(p[2].slice(r * w, r * w + w).split('').map(Number))
    return { w: w, h: h, c: c }
  }
  function cellsOf(g) { var o = []; g.c.forEach(function (row, r) { row.forEach(function (v, k) { if (v) o.push([r, k]) }) }); return o }
  /* 用坐标集合判断对称：先算外框，再看每个格子的对称位置是否也有格子 */
  function axes(g) {
    var cs = cellsOf(g)
    var r0 = Math.min.apply(null, cs.map(function (x) { return x[0] })), r1 = Math.max.apply(null, cs.map(function (x) { return x[0] }))
    var k0 = Math.min.apply(null, cs.map(function (x) { return x[1] })), k1 = Math.max.apply(null, cs.map(function (x) { return x[1] }))
    var set = {}
    cs.forEach(function (x) { set[x[0] + ',' + x[1]] = 1 })
    function ok(f) { return cs.every(function (x) { var y = f(x[0], x[1]); return set[y[0] + ',' + y[1]] }) }
    var n = 0
    if (ok(function (r, k) { return [r, k0 + k1 - k] })) n++
    if (ok(function (r, k) { return [r0 + r1 - r, k] })) n++
    if (r1 - r0 === k1 - k0) {
      if (ok(function (r, k) { return [r0 + (k - k0), k0 + (r - r0)] })) n++
      if (ok(function (r, k) { return [r0 + (k1 - k), k0 + (r1 - r)] })) n++
    }
    return n
  }
  function conn(g) {
    var cs = cellsOf(g), set = {}, seen = {}
    cs.forEach(function (x) { set[x.join()] = 1 })
    var st = [cs[0]], m = 0
    seen[cs[0].join()] = 1
    while (st.length) {
      var x = st.pop(); m++
      ;[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var y = [x[0] + d[0], x[1] + d[1]].join()
        if (set[y] && !seen[y]) { seen[y] = 1; st.push(y.split(',').map(Number)) }
      })
    }
    return m === cs.length
  }
  function mirror(g, dir) {
    return g.c.map(function (row, r) { return row.map(function (v, k) { return dir === 'v' ? g.c[r][g.w - 1 - k] : g.c[g.h - 1 - r][k] }) }).map(function (r) { return r.join('') }).join('')
  }
  var TABLE = { square: 4, rect: 2, circle: '无数条', iso: 1, heart: 1, semi: 1, equi: 3, trap: 1, rhombus: 2, seg: 2, angle: 1, para: 0, right: 0, hexa: 6, star5: 5, star4: 4 }
  function txt(n) { return typeof n === 'string' ? n : n + ' 条' }
  each('duichen', 'judge', function (q, d) {
    var gs = q.key.slice(6).split('|').map(dec)
    var yes = []
    gs.forEach(function (g, i) { if (axes(g) > 0) yes.push(CI[i]); if (!conn(g)) bad('B05 判断题的图没连成一块：' + q.key) })
    if (q.answer !== yes.join('')) bad('B05 判断题答案错：' + q.key + ' 给的 ' + q.answer + ' 算出 ' + yes.join(''))
    if (gs.length !== (d === 'L1' ? 3 : 4) || yes.length !== (d === 'L3' ? 2 : 1)) bad('B05 判断题个数不对：' + q.key)
  })
  each('duichen', 'axes', function (q, d) {
    var items = q.key.slice(5).split('|')
    var want = items.map(function (it, i) {
      var n = it[0] === 'g' ? axes(dec(it.slice(1))) : TABLE[it]
      if (n === undefined) bad('B05 不认识的图形：' + it)
      return CI[i] + ' ' + txt(n)
    }).join('　')
    if (q.answer !== want) bad('B05 对称轴条数错：' + q.key + ' 给的 ' + q.answer + ' 算出 ' + want)
    if (items[0] === items[1]) bad('B05 两个图形一样：' + q.key)
  })
  each('duichen', 'pair', function (q, d) {
    var parts = q.key.slice(5).split('|')
    var dir = parts[0]
    var prs = parts.slice(1).map(function (x) { return x.split('~').map(dec) })
    var ok = []
    prs.forEach(function (pr, i) { if (mirror(pr[0], dir) === pr[1].c.map(function (r) { return r.join('') }).join('')) ok.push(CI[i]) })
    if (ok.length !== 1) bad('B05 成轴对称的不是正好一组：' + q.key)
    else if (q.answer !== ok[0]) bad('B05 成轴对称答案错：' + q.key)
    if (prs.length !== (d === 'L3' ? 4 : 3)) bad('B05 组数不对：' + q.key)
    if (d !== 'L3' && dir !== 'v') bad('B05 入门提高应是左右成对：' + q.key)
    if (axes(prs[0][0]) !== 0) bad('B05 成对题左边的图自己就对称：' + q.key)
  })
  each('duichen', 'fill', function (q, d) {
    var parts = q.key.slice(5).split('|')
    var dir = parts[0], g = dec(parts[1])
    if (mirror(g, dir) !== g.c.map(function (r) { return r.join('') }).join('')) bad('B05 补全的图不对称：' + q.key)
    var n = cellsOf(g).length
    if (q.answer !== n) bad('B05 补全格数错：' + q.key + ' 给的 ' + q.answer + ' 算出 ' + n)
    if (!conn(g)) bad('B05 补全的图没连成一块：' + q.key)
    if (d !== 'L3' && (dir !== 'v' || g.w % 2)) bad('B05 入门提高应是竖轴在格线上：' + q.key)
  })
}

/*
 * B06 镜子：从 key 独立重算：钟 = 12 时 − 镜子里的时间，并量题干两根针对上镜子里的时间；
 * 数 / 选一选用七段编码逐段左右（上下）互换、镜子再倒序，和题图（key）对上。
 */
function checkJingzi() {
  if (!A.topics.jingzi) return
  var CI = ['①', '②', '③', '④']
  var SEG = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg']
  var M = { a: 'a', b: 'f', c: 'e', d: 'd', e: 'c', f: 'b', g: 'g' }
  var W = { a: 'd', b: 'c', c: 'b', d: 'a', e: 'f', f: 'e', g: 'g' }
  function tr(s, m) { return s.split('').map(function (c) { return m[c] }).sort().join('') }
  function img(num, how) {
    var d = num.split('').map(function (c) { return SEG[+c] })
    if (how === 'mirror') return d.map(function (x) { return tr(x, M) }).reverse().join('.')
    return d.map(function (x) { return tr(x, W) }).join('.')
  }
  function hm(s) { var p = s.split(':'); return (+p[0] % 12) * 60 + +p[1] }
  each('jingzi', 'clock', function (q, d) {
    var p = q.key.slice(6).split('|')
    if (q.answer !== p[0]) bad('B06 钟答案和 key 不一致：' + q.key)
    if ((hm(p[0]) + hm(p[1])) % 720 !== 0) bad('B06 镜子钟两个时间合起来不是 12 时：' + q.key)
    if (p[0] === p[1]) bad('B06 镜子钟翻过来不变：' + q.key)
    var m = +p[0].split(':')[1]
    if (d === 'L1' && m !== 0) bad('B06 入门应是整时：' + q.key)
    if (d === 'L2' && m !== 30) bad('B06 提高应是半时：' + q.key)
    if (d === 'L3' && (m === 0 || m === 30 || m % 5)) bad('B06 挑战应是几时几分（5 的倍数）：' + q.key)
    /* 量题干两根针 = 镜子里的时间 */
    var lines = []
    var re = /<line class="(mh|hh)" x1="([\d.]+)" y1="([\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/g, mm
    while ((mm = re.exec(q.stemHTML))) lines.push((Math.atan2(+mm[4] - +mm[2], -(+mm[5] - +mm[3])) * 180 / Math.PI + 360) % 360)
    var seen = p[1].split(':').map(Number)
    function gap(a, b) { var x = Math.abs(a - b) % 360; return Math.min(x, 360 - x) }
    if (lines.length !== 2 || gap(lines[0], seen[1] * 6) > 0.6 || gap(lines[1], ((seen[0] % 12) + seen[1] / 60) * 30) > 0.6) bad('B06 题干钟面和镜子里的时间对不上：' + q.key)
  })
  each('jingzi', 'num', function (q, d) {
    var p = q.key.slice(4).split('|')
    if (q.answer !== +p[1]) bad('B06 镜子数答案错：' + q.key)
    var len = p[1].length
    if ((d === 'L1' && len !== 2) || (d === 'L2' && (len < 3 || len > 4)) || (d === 'L3' && len !== 5)) bad('B06 镜子数位数不对：' + q.key)
    var shown = img(p[1], p[0]).split('.')
    if (shown.every(function (x) { return SEG.indexOf(x) >= 0 })) bad('B06 镜子里的数能直接读，太容易：' + q.key)
    var rects = (q.stemHTML.match(/<rect x="[\d.]+" y="[\d.]+" width="[\d.]+" height="[\d.]+" rx="2"/g) || []).length
    var want = shown.reduce(function (n, x) { return n + x.length }, 0)
    if (rects !== want) bad('B06 镜子数题图段数对不上：' + q.key)
  })
  each('jingzi', 'pick', function (q, d) {
    var p = q.key.slice(5).split('|')
    var how = p[0], real = p[1], opts = p.slice(2)
    var right = img(real, how)
    var hit = []
    opts.forEach(function (o, i) { if (o === right) hit.push(i) })
    if (hit.length !== 1) bad('B06 选一选对的不是正好一个：' + q.key)
    else if (q.answer !== CI[hit[0]]) bad('B06 选一选答案错：' + q.key)
    if (new Set(opts).size !== opts.length) bad('B06 选项重复：' + q.key)
    if (opts.length !== (d === 'L1' ? 3 : 4)) bad('B06 选项个数不对：' + q.key)
    if (q.stem.indexOf(real) < 0) bad('B06 题干没写真实号码：' + q.key)
  })
}

/*
 * B07 叠放顺序：从 key 独立重算（自己逐点算遮挡，不调生成器）。
 * 排顺序 / 摆的顺序：每个图形露出一块；按「叠住处露出来的是谁」推出的先后，所有排法里只有一种对得上，且就是答案。
 * 至少拿几张：★ 纸往上倒推的张数 + 1；要拿的纸和 ★ 纸的压着关系都看得见；有一张在上面却不用拿。
 * 取铅笔：重算交叉，每个交叉都指定了谁在上；模拟每步只有一支能取，最后剩 ≥ 3 支卡住，轮到的人输。
 */
function checkDiefang() {
  if (!A.topics.diefang) return
  var CI = ['①', '②', '③', '④', '⑤']
  function poly(t, x, y, s, r) {
    var o = [], i, a
    if (t === 'square') return [[x - s / 2, y - s / 2], [x + s / 2, y - s / 2], [x + s / 2, y + s / 2], [x - s / 2, y + s / 2]]
    if (t === 'rect') { var w = r ? s * 0.75 : s * 1.4, h = r ? s * 1.4 : s * 0.75; return [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]] }
    if (t === 'tri') return [[x, y - s * 0.55], [x + s * 0.58, y + s * 0.45], [x - s * 0.58, y + s * 0.45]]
    if (t === 'diamond') return [[x, y - s * 0.62], [x + s * 0.48, y], [x, y + s * 0.62], [x - s * 0.48, y]]
    if (t === 'hex') { for (i = 0; i < 6; i++) { a = i * Math.PI / 3; o.push([x + s * 0.56 * Math.cos(a), y + s * 0.56 * Math.sin(a)]) } return o }
    if (t === 'star') { for (i = 0; i < 10; i++) { a = -Math.PI / 2 + i * Math.PI / 5; var q = i % 2 ? s * 0.3 : s * 0.66; o.push([x + q * Math.cos(a), y + q * Math.sin(a)]) } return o }
    if (t === 'trap') return [[x - s * 0.33, y - s * 0.38], [x + s * 0.33, y - s * 0.38], [x + s * 0.66, y + s * 0.38], [x - s * 0.66, y + s * 0.38]]
    if (t === 'paper') { var hh = s / 2; return r ? [[x, y - hh * 1.3], [x + hh * 1.3, y], [x, y + hh * 1.3], [x - hh * 1.3, y]] : [[x - hh, y - hh], [x + hh, y - hh], [x + hh, y + hh], [x - hh, y + hh]] }
    return null
  }
  function hit(sh, px, py) {
    if (sh.t === 'circle') return (px - sh.x) * (px - sh.x) + (py - sh.y) * (py - sh.y) <= sh.s * sh.s / 4
    var v = sh.v, c = false
    for (var i = 0, j = v.length - 1; i < v.length; j = i++) {
      if ((v[i][1] > py) !== (v[j][1] > py) && px < (v[j][0] - v[i][0]) * (py - v[i][1]) / (v[j][1] - v[i][1]) + v[i][0]) c = !c
    }
    return c
  }
  /* 步长 1 逐点：面积、露出、叠住、叠住处露出的是上面那个 */
  function scan(sh, W, H) {
    var n = sh.length, area = [], vis = [], ov = [], ev = []
    for (var i = 0; i < n; i++) { area.push(0); vis.push(0); ov.push(new Array(n).fill(0)); ev.push(new Array(n).fill(0)) }
    for (var y = 0.5; y < H; y += 1) for (var x = 0.5; x < W; x += 1) {
      var c = []
      for (i = 0; i < n; i++) if (hit(sh[i], x, y)) c.push(i)
      if (!c.length) continue
      vis[c[0]]++
      for (var a = 0; a < c.length; a++) { area[c[a]]++; for (var b = a + 1; b < c.length; b++) { ov[c[a]][c[b]]++; if (a === 0) ev[c[a]][c[b]]++ } }
    }
    return { area: area, vis: vis, ov: ov, ev: ev }
  }
  function perms(a) {
    if (a.length <= 1) return [a]
    var out = []
    a.forEach(function (x, i) { perms(a.slice(0, i).concat(a.slice(i + 1))).forEach(function (p) { out.push([x].concat(p)) }) })
    return out
  }
  ;['order', 'build'].forEach(function (vid) {
    each('diefang', vid, function (q, d) {
      var items = q.key.slice(vid.length + 1).split('|').map(function (it) {
        var f = it.split(',')
        var sh = { t: f[0], x: +f[1], y: +f[2], s: +f[3], r: +f[4], p: f[5], lab: f[6] }
        sh.v = poly(sh.t, sh.x, sh.y, sh.s, sh.r)
        return sh
      })
      var n = items.length
      if (n !== (d === 'L1' ? 3 : d === 'L2' ? 4 : 5)) bad('B07 图形个数不对：' + q.key)
      if (new Set(items.map(function (x) { return x.t })).size !== n || new Set(items.map(function (x) { return x.p })).size !== n) bad('B07 图形或图案重复：' + q.key)
      var R = scan(items, 140, 120)
      var seen = []
      for (var i = 0; i < n; i++) {
        if (R.vis[i] < R.area[i] * 0.25) bad('B07 有图形露得太少：' + q.key)
        for (var j = i + 1; j < n; j++) if (R.ov[i][j] > 0) {
          if (R.ov[i][j] < 30) bad('B07 两个图形只碰到一点点：' + q.key)
          if (R.ev[i][j] < 30) bad('B07 叠住处看不出谁在上：' + q.key)
          seen.push([i, j])
        }
      }
      /* 按看得见的先后，所有排法里只能有一种 */
      var ok = perms(items.map(function (_, i) { return i })).filter(function (p) {
        return seen.every(function (e) { return p.indexOf(e[0]) < p.indexOf(e[1]) })
      })
      if (ok.length !== 1) bad('B07 排法不唯一（' + ok.length + ' 种）：' + q.key)
      var down = items.map(function (x) { return x.lab }).join('、')
      var want = vid === 'order' ? down : items.map(function (x) { return x.lab }).reverse().join('、')
      if (q.answer !== want) bad('B07 ' + vid + ' 答案错：' + q.key + ' 给的 ' + q.answer + ' 算出 ' + want)
      if (vid === 'build' && q.answer === down) bad('B07 摆的顺序和从上到下一样：' + q.key)
      var labs = items.map(function (x) { return x.lab }).sort().join('')
      if (labs !== CI.slice(0, n).join('')) bad('B07 编号不全：' + q.key)
      if ((q.stemHTML.replace(/<defs>.*?<\/defs>/g, '').match(/<(polygon|circle) /g) || []).length !== n * 2) bad('B07 题图图形个数不对：' + q.key)
    })
  })
  each('diefang', 'take', function (q, d) {
    var parts = q.key.slice(5).split('|')
    var wh = parts[0].split(',').map(Number), ti = +parts[1]
    var ps = parts.slice(2).map(function (it) {
      var f = it.split(',').map(Number)
      var sh = { t: 'paper', x: f[0], y: f[1], s: 40, r: f[2] }
      sh.v = poly('paper', sh.x, sh.y, 40, sh.r)
      return sh
    })
    var n = ps.length
    if (n !== (d === 'L1' ? 5 : d === 'L2' ? 7 : 9)) bad('B07 纸的张数不对：' + q.key)
    var R = scan(ps, wh[0], wh[1])
    var need = {}, stack = [ti], depth = {}
    depth[ti] = 0
    while (stack.length) {
      var b = stack.pop()
      for (var a = 0; a < b; a++) if (R.ov[a][b] > 0 && !(a in need)) { need[a] = true; depth[a] = depth[b] + 1; stack.push(a) }
    }
    var ks = Object.keys(need).map(Number)
    if (q.answer !== ks.length + 1) bad('B07 拿几张答案错：' + q.key + ' 给的 ' + q.answer + ' 算出 ' + (ks.length + 1))
    var lo = d === 'L1' ? 2 : d === 'L2' ? 3 : 4, hi = d === 'L1' ? 3 : d === 'L2' ? 5 : 6
    if (q.answer < lo || q.answer > hi) bad('B07 拿几张超出本档范围：' + q.key)
    if (d === 'L3' && !ks.some(function (k) { return depth[k] >= 2 })) bad('B07 挑战档没有「压着压着它的」：' + q.key)
    var spare = false
    for (var i = 0; i < ti; i++) if (!need[i]) spare = true
    if (!spare) bad('B07 ★ 上面没有不用拿的纸：' + q.key)
    var S = ks.concat([ti])
    for (i = 0; i < n; i++) {
      if (R.vis[i] < R.area[i] * 0.18) bad('B07 有纸露得太少：' + q.key)
      for (var j = i + 1; j < n; j++) {
        if (R.ov[i][j] > 0 && (S.indexOf(i) >= 0 || S.indexOf(j) >= 0) && R.ev[i][j] < 40) bad('B07 要拿的纸压着关系看不清：' + q.key)
      }
    }
  })
  var wins = { first: 0, second: 0 }
  each('diefang', 'game', function (q, d) {
    var parts = q.key.slice(5).split('|')
    var who = parts[0].split(',')
    var segs = {}, L = []
    parts.slice(1, -1).forEach(function (it) { var f = it.split(':'); segs[f[0]] = f[1].split(',').map(Number); L.push(f[0]) })
    var over = {}
    parts[parts.length - 1].split(',').forEach(function (e) { over[e] = true })
    function cross(a, b) {
      var r = [a[2] - a[0], a[3] - a[1]], s2 = [b[2] - b[0], b[3] - b[1]], den = r[0] * s2[1] - r[1] * s2[0]
      if (!den) return false
      var t = ((b[0] - a[0]) * s2[1] - (b[1] - a[1]) * s2[0]) / den, u = ((b[0] - a[0]) * r[1] - (b[1] - a[1]) * r[0]) / den
      return t > 0 && t < 1 && u > 0 && u < 1
    }
    var pairs = 0
    L.forEach(function (a) {
      L.forEach(function (b) {
        if (a >= b) return
        var c = cross(segs[a], segs[b])
        var o = (over[a + b] ? 1 : 0) + (over[b + a] ? 1 : 0)
        if (c && o !== 1) bad('B07 交叉没指定谁在上：' + a + b + ' ' + q.key)
        if (!c && o) bad('B07 不交叉却写了谁压谁：' + a + b + ' ' + q.key)
        if (c) {
          pairs++
          var t1 = Math.atan2(segs[a][3] - segs[a][1], segs[a][2] - segs[a][0]), t2 = Math.atan2(segs[b][3] - segs[b][1], segs[b][2] - segs[b][0])
          var x = Math.abs(t1 - t2) % Math.PI
          if (Math.min(x, Math.PI - x) < Math.PI / 6 - 1e-9) bad('B07 两支铅笔交叉太斜：' + q.key)
        }
      })
    })
    var left = L.slice(), taken = 0
    while (true) {
      var free = left.filter(function (a) { return !left.some(function (b) { return over[b + a] }) })
      if (!free.length) break
      if (free.length > 1) { bad('B07 有一步能取的不止一支：' + q.key); break }
      left.splice(left.indexOf(free[0]), 1)
      taken++
    }
    if (left.length < 3) bad('B07 最后没卡住 3 支以上：' + q.key)
    var lo = d === 'L1' ? 1 : d === 'L2' ? 2 : 3
    if (taken < lo || taken > lo + 1) bad('B07 被迫取走的支数不在本档范围：' + q.key)
    var winner = taken % 2 ? who[0] : who[1]
    if (q.answer !== winner) bad('B07 取铅笔答案错：' + q.key + ' 给的 ' + q.answer + ' 算出 ' + winner)
    wins[taken % 2 ? 'first' : 'second']++
    if (q.stem.indexOf(who[0] + '先取') < 0) bad('B07 题干没写谁先取：' + q.key)
  })
  var tot = wins.first + wins.second
  if (tot && (wins.first < tot * 0.3 || wins.second < tot * 0.3)) bad('B07 取铅笔先取 / 后取赢得太偏：' + JSON.stringify(wins))
}

/*
 * B08 翻转问题：从 key 独立重做变换。
 * key = 模式:方向|第一段前后+入口边+出口边|洞的顺序|四个选项各用哪种变换（0 = 正确）。
 * 检查：洞相邻、不重复；答案字母 = 正确变换所在位置；四张两两不同、也都和图 1 不同；
 * 正确变换：翻一次 = 那个方向反 + 前后换，翻两次 = 左右上下都反 + 前后不变。
 */
function checkFanzhuan() {
  if (!A.topics.fanzhuan) return
  var LETTERS = 'ABCD'
  function flip(r, mx, my, sw) {
    var fs = { L: mx ? 'R' : 'L', R: mx ? 'L' : 'R', T: my ? 'B' : 'T', B: my ? 'T' : 'B' }
    return { p: r.p.map(function (q) { return [my ? 2 - q[0] : q[0], mx ? 2 - q[1] : q[1]] }), f: sw ? 1 - r.f : r.f, a: fs[r.a], b: fs[r.b] }
  }
  /* 画出来的样子：每段（端点 + 前后），不管正着倒着走 */
  function look(r) {
    var pts = ['E' + r.a + r.p[0].join('')].concat(r.p.map(function (q) { return q.join('') })).concat(['E' + r.b + r.p[r.p.length - 1].join('')])
    var out = []
    for (var i = 0; i + 1 < pts.length; i++) out.push([pts[i], pts[i + 1]].sort().join('-') + '/' + ((r.f + i) % 2))
    return out.sort().join(' ')
  }
  ;['lr', 'ud', 'twice'].forEach(function (vid) {
    var cnt = {}
    each('fanzhuan', vid, function (q, d) {
      var f = q.key.slice(vid.length + 1).split('|')
      var dir = f[0], r = { f: +f[1][0], a: f[1][1], b: f[1][2], p: f[2].split(',').map(function (t) { return [+t[0], +t[1]] }) }
      var order = f[3].split('').map(Number)
      var k = r.p.length
      var lo = d === 'L1' ? 3 : d === 'L2' ? 4 : 6, hi = d === 'L1' ? 3 : d === 'L2' ? 5 : 7
      if (k < lo || k > hi) bad('B08 洞数不在本档范围：' + q.key)
      var seen = {}
      r.p.forEach(function (q2, i) {
        if (seen[q2.join()]) bad('B08 洞重复：' + q.key)
        seen[q2.join()] = true
        if (i && (Math.abs(q2[0] - r.p[i - 1][0]) > 1 || Math.abs(q2[1] - r.p[i - 1][1]) > 1)) bad('B08 洞不相邻：' + q.key)
      })
      var mx, my, sw
      if (vid === 'twice') { mx = 1; my = 1; sw = 0; if (!/^[LR][UD]$/.test(dir)) bad('B08 翻两次方向不对：' + q.key) }
      else { mx = vid === 'lr' ? 1 : 0; my = 1 - mx; sw = 1; if (vid === 'lr' ? !/^[LR]$/.test(dir) : !/^[UD]$/.test(dir)) bad('B08 方向不对：' + q.key) }
      var rightLook = look(flip(r, mx, my, sw))
      var looks = [look(r)]
      /* 四个选项的变换（和生成器的约定独立写一遍） */
      var kinds = vid === 'twice' ? [[1, 1, 0], [1, 1, 1], [1, 0, 1], [0, 1, 1]] : [[mx, my, 1], [mx, my, 0], [0, 0, 1], [my, mx, 1]]
      var hit = []
      order.forEach(function (kk, i) {
        var L = look(flip(r, kinds[kk][0], kinds[kk][1], kinds[kk][2]))
        looks.push(L)
        if (L === rightLook) hit.push(LETTERS[i])
      })
      if (new Set(looks).size !== 5) bad('B08 选项画出来有一样的：' + q.key)
      if (hit.length !== 1 || q.answer !== hit[0]) bad('B08 答案错：' + q.key + ' 给的 ' + q.answer + ' 算出 ' + hit.join(''))
      cnt[q.answer] = (cnt[q.answer] || 0) + 1
      if ((q.stemHTML.match(/<rect /g) || []).length !== 5) bad('B08 题图卡片数不对：' + q.key)
    })
    var tot = Object.keys(cnt).reduce(function (a, b) { return a + cnt[b] }, 0)
    'ABCD'.split('').forEach(function (L) { if ((cnt[L] || 0) < tot * 0.15) bad('B08 ' + vid + ' 答案 ' + L + ' 太少：' + JSON.stringify(cnt)) })
  })
}

/* B09 蜗牛爬井：从 key 一天一天模拟（白天加、到顶就出去、晚上减），过河一趟一趟模拟，独立重算答案 */
function checkWoniu() {
  if (!A.topics.woniu) return
  function climb(H, a, b) { var h = 0; for (var d = 1; d < 500; d++) { h += a; if (h >= H) return d; h -= b } return -1 }
  each('woniu', 'well', function (q, d) {
    var f = q.key.slice(5).split(','), H = +f[1], a = +f[2], b = +f[3]
    if (!(a > b && b > 0 && H > a)) bad('B09 爬井参数不对：' + q.key)
    var want = climb(H, a, b)
    if (q.answer !== want) bad('B09 几天爬出答案错：' + q.key + ' 给的 ' + q.answer + ' 算出 ' + want)
    if (H % (a - b) === 0 && H / (a - b) === want) bad('B09 陷阱不成立（直接除也对）：' + q.key)
    if (d === 'L1' && H > 8) bad('B09 入门井太深：' + q.key)
  })
  each('woniu', 'where', function (q, d) {
    var f = q.key.slice(6).split(','), H = +f[1], a = +f[2], b = +f[3], n = +f[4], eve = +f[5]
    var h = 0, at = null
    for (var day = 1; day <= n; day++) {
      h += a
      if (h >= H) { bad('B09 问的那天已经爬出去了：' + q.key); return }
      if (day === n && eve) at = h
      h -= b
      if (day === n && !eve) at = h
    }
    if (q.answer !== at) bad('B09 第几天在哪答案错：' + q.key + ' 给的 ' + q.answer + ' 算出 ' + at)
    if (d === 'L1' && eve) bad('B09 入门不问傍晚：' + q.key)
  })
  each('woniu', 'boat', function (q) {
    var f = q.key.slice(5).split(','), N = +f[0], k = +f[1]
    var left = N, t = 0
    while (left > 0) { t++; if (left <= k) break; left = left - k + 1 }
    if (q.answer !== t) bad('B09 过河答案错：' + q.key + ' 给的 ' + q.answer + ' 算出 ' + t)
    if (Math.ceil(N / k) === t) bad('B09 过河陷阱不成立：' + q.key)
  })
}

/* B10 间隔问题（补充）：页数按一页一页数，夹子按一块一块挂上去数，剪绳子把绳子展开一个个找剪口，独立重算 */
function checkJiangebc() {
  if (!A.topics.jiangebc) return
  each('jiangebc', 'page', function (q, d) {
    var f = q.key.slice(5).split(','), kind = f[0], a = +f[1], want
    if (kind === 'count') { var b = +f[2], c = 0; for (var p = a; p <= b; p++) c++; want = c }
    else if (kind === 'left') { var b2 = +f[2], N = +f[3], seen = 0; for (var p2 = a; p2 <= b2; p2++) seen++; want = N - seen; if (b2 > N) bad('B10 看过的页超出计划：' + q.key) }
    else { var n = +f[2], last = a; for (var i = 1; i < n; i++) last++; want = last }
    if (q.answer !== want) bad('B10 页数答案错：' + q.key + ' 给的 ' + q.answer + ' 算出 ' + want)
    if (d === 'L1' && kind !== 'count') bad('B10 入门只问一共几页：' + q.key)
  })
  each('jiangebc', 'clip', function (q) {
    var f = q.key.slice(5).split(','), kind = f[0], v = +f[1], want
    function together(n) { var c = 0; for (var i = 0; i < n; i++) c += i ? 1 : 2; return c }
    if (kind === 'min') want = together(v)
    else if (kind === 'max') { want = 0; for (var i = 0; i < v; i++) want += 2 }
    else { want = 0; while (together(want + 1) <= v) want++ }
    if (q.answer !== want) bad('B10 夹子答案错：' + q.key + ' 给的 ' + q.answer + ' 算出 ' + want)
  })
  each('jiangebc', 'fold', function (q, d) {
    var f = q.key.slice(5).split(','), k = +f[0], xs = f[1].split('-').map(Number)
    /* 折好的绳子长 12，展开后第 j 股：偶数股正着、奇数股倒着；剪口去重后数段 */
    var st = 1; for (var i = 0; i < k; i++) st *= 2
    var pts = {}
    for (var j = 0; j < st; j++) xs.forEach(function (x) { if (x <= 0 || x >= 12) bad('B10 剪在折弯上：' + q.key); pts[j % 2 ? (j + 1) * 12 - x : j * 12 + x] = true })
    var want = Object.keys(pts).length + 1
    if (q.answer !== want) bad('B10 剪绳子答案错：' + q.key + ' 给的 ' + q.answer + ' 算出 ' + want)
    if (d === 'L1' && k !== 1) bad('B10 入门只对折一次：' + q.key)
  })
}

/*
 * B11 认识线：不看 key，直接量题干 SVG 重算答案。
 * 每个编号一个 <g class="it">；直的线 <line class="ln">，折线 <polyline>，曲线 <path>，端点 <circle class="dot">，小板凳 <polyline class="mk">。
 */
function checkRenxian() {
  if (!A.topics.renxian) return
  var CIRC = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧']
  function groups(html) {
    return html.split('<g class="it"').slice(1).map(function (g) { return g.split('</g>')[0] })
  }
  function lines(g) {
    var out = []
    g.replace(/<line class="ln" x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/g, function (m, a, b, c, d) {
      out.push([[+a, +b], [+c, +d]])
    })
    return out
  }
  function dots(g) {
    var out = []
    g.replace(/<circle class="dot" cx="([-\d.]+)" cy="([-\d.]+)"/g, function (m, a, b) { out.push([+a, +b]) })
    return out
  }
  function ang(l) { var a = Math.atan2(l[1][1] - l[0][1], l[1][0] - l[0][0]) * 180 / Math.PI; return ((a % 180) + 180) % 180 }
  function adiff(a, b) { var d = Math.abs(a - b) % 180; return Math.min(d, 180 - d) }
  function len(l) { return Math.hypot(l[1][0] - l[0][0], l[1][1] - l[0][1]) }
  function cr(a, b) { return a[0] * b[1] - a[1] * b[0] }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]] }
  /* 两条直线 a、b 的交点参数（a 上 t，b 上 s；0～1 是画出来的部分） */
  function inter(a, b) {
    var da = sub(a[1], a[0]), db = sub(b[1], b[0]), den = cr(da, db)
    if (Math.abs(den) < 1e-6) return null
    var w = sub(b[0], a[0])
    return { t: cr(w, db) / den, s: cr(w, da) / den }
  }
  function nums(arr) { return arr.map(function (i) { return CIRC[i] }).join('') || '没有' }
  function near(p, q) { return Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.05 }

  each('renxian', 'kind', function (q, d) {
    var by = { line: [], ray: [], seg: [] }
    var other = 0, shortLine = false, longSeg = false, dotted = false
    groups(q.stemHTML).forEach(function (g, i) {
      var ls = lines(g), ds = dots(g)
      if (ls.length === 1 && !/<polyline|<path/.test(g)) {
        var k = ['line', 'ray', 'seg'][ds.length]
        ds.forEach(function (p) { if (!near(p, ls[0][0]) && !near(p, ls[0][1])) bad('B11 认线：端点不在线头上 ' + q.key) })
        by[k].push(i)
        if (k === 'line' && len(ls[0]) < 35) shortLine = true
        if (k === 'seg' && len(ls[0]) > 58) longSeg = true
      } else {
        other++
        if (ds.length) dotted = true
      }
    })
    var want = '直线 ' + nums(by.line) + '；射线 ' + nums(by.ray) + '；线段 ' + nums(by.seg)
    if (q.answer !== want) bad('B11 认线答案错：给的 ' + q.answer + ' 应为 ' + want)
    if (!by.line.length || !by.ray.length || !by.seg.length) bad('B11 认线缺了一类：' + q.answer)
    if (d === 'L1' && other) bad('B11 认线入门出了折线曲线')
    if (d !== 'L1' && !other) bad('B11 认线 ' + d + ' 没有折线曲线干扰')
    if (d === 'L3' && !(shortLine && longSeg && dotted)) bad('B11 认线挑战缺陷阱（短直线 / 长线段 / 带点折线）：' + q.key)
  })

  each('renxian', 'rel', function (q, d) {
    var by = { par: [], perp: [], cross: [], conv: [] }
    groups(q.stemHTML).forEach(function (g, i) {
      var ls = lines(g)
      if (ls.length !== 2) { bad('B11 平行垂直：一格里不是两条线 ' + q.key); return }
      var df = adiff(ang(ls[0]), ang(ls[1]))
      var x = inter(ls[0], ls[1])
      var touch = x && x.t >= 0 && x.t <= 1 && x.s >= 0 && x.s <= 1
      var mk = /class="mk"/.test(g)
      if (df < 0.3) {
        by.par.push(i)
        var gap = Math.abs(cr(sub(ls[1][0], ls[0][0]), sub(ls[0][1], ls[0][0]))) / len(ls[0])
        if (gap < 12) bad('B11 平行线挨得太近：' + gap.toFixed(1))
      } else if (Math.abs(df - 90) < 0.3) {
        if (!mk || !touch) bad('B11 垂直没画小板凳或没交上：' + q.key)
        by.perp.push(i)
      } else if (touch) {
        if (mk) bad('B11 不垂直却画了小板凳')
        if (Math.abs(df - 90) < 39.5) bad('B11 斜着交叉的太像直角：' + df.toFixed(1) + '°')
        by.cross.push(i)
      } else {
        if (df < 18) bad('B11 没碰到的两条线太像平行：' + df.toFixed(1) + '°')
        by.conv.push(i)
      }
    })
    var want = '平行 ' + nums(by.par) + '；垂直 ' + nums(by.perp)
    if (d === 'L3') want += '；相交 ' + nums(by.perp.concat(by.cross).sort(function (a, b) { return a - b }))
    if (q.answer !== want) bad('B11 平行垂直答案错：给的 ' + q.answer + ' 应为 ' + want)
    if (!by.par.length || !by.perp.length) bad('B11 平行垂直缺了一类：' + q.answer)
    if (d === 'L3' && by.conv.length) bad('B11 挑战问相交时出了没碰到的（有歧义）')
    if (d === 'L2' && !by.conv.length) bad('B11 提高档没有「没碰到但不平行」')
  })

  each('renxian', 'meet', function (q, d) {
    var yes = []
    var types = {}
    groups(q.stemHTML).forEach(function (g, i) {
      var ds = dots(g)
      var ps = lines(g).map(function (l) {
        var dp = ds.some(function (p) { return near(p, l[0]) }), dq = ds.some(function (p) { return near(p, l[1]) })
        /* 有点的那头当起点：射线从起点往另一头延长 */
        var l2 = dq && !dp ? [l[1], l[0]] : l
        var type = dp && dq ? 'seg' : dp || dq ? 'ray' : 'line'
        return { l: l2, type: type, lo: type === 'line' ? -Infinity : 0, hi: type === 'seg' ? 1 : Infinity }
      })
      types[ps.map(function (p) { return p.type }).sort().join('-')] = 1
      /* 坐标取了两位小数，平行的两条量出来会差一丝丝，0.5° 以内都当平行 */
      if (adiff(ang(ps[0].l), ang(ps[1].l)) < 0.5) return // 平行：永远碰不到
      var x = inter(ps[0].l, ps[1].l)
      var m0 = Math.min((x.t - ps[0].lo) * len(ps[0].l), (ps[0].hi - x.t) * len(ps[0].l))
      var m1 = Math.min((x.s - ps[1].lo) * len(ps[1].l), (ps[1].hi - x.s) * len(ps[1].l))
      if (x.t >= 0 && x.t <= 1 && x.s >= 0 && x.s <= 1) bad('B11 能相交：画出来就已经交叉了 ' + q.key)
      if (m0 >= 0 && m1 >= 0) {
        yes.push('ABCD'[i])
        if (Math.min(m0, m1) < 5) bad('B11 能相交：交点太贴近端点 ' + q.key)
      } else if (Math.min(m0, m1) > -13) bad('B11 能相交：差一点点就碰到，看不准 ' + q.key)
    })
    var want = yes.length === 1 ? yes[0] : yes.slice(0, -1).join('、') + ' 和 ' + yes[yes.length - 1]
    if (!yes.length || yes.length === 4) bad('B11 能相交：全对或全错 ' + q.key)
    else if (q.answer !== want) bad('B11 能相交答案错：给的 ' + q.answer + ' 应为 ' + want)
    if (d === 'L1' && types['ray-ray'] + types['line-ray'] + types['ray-seg']) bad('B11 能相交入门出了射线')
  })

  each('renxian', 'par', function (q, d) {
    var fam = {}
    lines(q.stemHTML).forEach(function (l) {
      var a = Math.round(ang(l) * 2) / 2 % 180
      fam[a] = (fam[a] || 0) + 1
    })
    var total = 0
    Object.keys(fam).forEach(function (a) { var n = fam[a]; total += n * (n - 1) / 2 })
    if (q.answer !== total) bad('B11 数平行线答案错：给的 ' + q.answer + ' 应为 ' + total + ' ' + q.key)
    if (total < (d === 'L1' ? 3 : d === 'L2' ? 3 : 4)) bad('B11 数平行线太少：' + total)
    var dirs = Object.keys(fam).map(Number)
    dirs.forEach(function (a, i) { dirs.slice(i + 1).forEach(function (b) { if (adiff(a, b) < 15) bad('B11 不平行的线方向太接近：' + a + '° / ' + b + '°') }) })
  })
}

function checkFloors() {
  each('daxiao', 'num', function (q) {
    var n = nums(q.stem)
    var a = n[0], b = n[1]
    if (q.answer !== sym(a, b)) bad('01 比大小答案错：' + q.stem)
    var swapped = String(a).split('').reverse().join('') === String(b)
    var sameUnit = a % 10 === b % 10
    if (Math.abs(a - b) > 3 && !swapped && !sameUnit) bad('01 两个数差得太远，一眼看穿：' + q.stem)
  })
  each('daxiao', 'expr', function (q) {
    var n = nums(q.stem)
    var left = /\+/.test(q.stem) ? n[0] + n[1] : n[0] - n[1]
    if (q.answer !== sym(left, n[2])) bad('01 算式比大小答案错：' + q.stem)
    if (Math.abs(left - n[2]) > 2) bad('01 算式和数差得太远：' + q.stem)
  })
  each('coushi', 'friend', function (q) {
    var a = nums(q.stem).filter(function (x) { return x !== 10 })[0]
    if ([1, 5, 9].indexOf(a) >= 0) bad('02 好朋友出了顺口的 ' + a + '：' + q.stem)
    if (a + q.answer !== 10) bad('02 好朋友答案错：' + q.stem)
  })
  ;['move', 'origDiff'].forEach(function (vid) {
    each('yiduobushao', vid, function (q) {
      var n = nums(q.stem)
      var m = vid === 'move' ? (n[0] - n[1]) / 2 : n[0]
      if (m < 2) bad('03 移 1 个就一样多：' + q.stem)
      if (vid === 'move' && q.answer !== m) bad('03 移多补少答案错：' + q.stem)
      if (vid === 'origDiff' && q.answer !== 2 * m) bad('03 求原差答案错：' + q.stem)
    })
  })
  each('yiduobushao2', 'target', function (q) {
    var n = nums(q.stem)
    if (q.answer !== (n[0] - n[1]) / 2) bad('04 还多几个答案错：' + q.stem)
    if (q.answer < 2) bad('04 只移 1 个：' + q.stem)
  })
  each('tianfu', 'one', function (q) {
    var n = nums(q.stem)
    if (n[0] < 10) bad('05 一位数配一位数：' + q.stem)
    var ok = (q.answer === '+' && n[0] + n[1] === n[2]) || (q.answer === '−' && n[0] - n[1] === n[2])
    if (!ok) bad('05 填算符答案错：' + q.stem)
  })
  ;['dengcha', 'jiaoti'].forEach(function (vid) {
    each('xulie', vid, function (q, d) {
      var parts = q.stem.split('：')[1].split('、')
      var blank = parts.indexOf('（　）')
      var terms = parts.map(Number)
      terms[blank] = q.answer
      var gap = vid === 'dengcha' ? 1 : 2
      for (var i = 0; i < gap; i++) {
        var steps = new Set()
        for (var j = i + gap; j < terms.length; j += gap) steps.add(terms[j] - terms[j - gap])
        if (steps.size !== 1) bad('08 数列规律不一致：' + q.stem + ' → ' + q.answer)
      }
      if (vid === 'dengcha') {
        var step = Math.abs(terms[1] - terms[0])
        if (step < (d === 'L1' ? 2 : 3)) bad('08 每次只差 ' + step + '（等于数数）：' + q.stem)
      } else {
        var g = blank % 2
        if (terms[g + 2] === terms[g]) bad('08 挖空挖在一直不变的那组：' + q.stem)
      }
    })
  })
  each('tuxing', 'repeat', function (q) {
    var seq = Array.from(q.stem.split('：')[1].replace('（　）', ''))
    var p = 1
    while (p < seq.length && !seq.every(function (c, i) { return c === seq[i % p] })) p++
    if (p < 3) bad('09 两个一换：' + q.stem)
    if (seq[seq.length % p] !== q.answer) bad('09 接着画答案错：' + q.stem)
  })
  each('tuxing', 'grow', function (q) {
    var groups = q.stem.split('：')[1].split('、').slice(0, 3).map(function (g) { return Array.from(g).length })
    var d0 = groups[1] - groups[0]
    if (d0 < 2) bad('09 每组只多 1 个：' + q.stem)
    if (groups[2] - groups[1] !== d0 || q.answer !== groups[2] + d0) bad('09 递增答案错：' + q.stem)
  })
  each('meiju', 'digit', function (q) {
    var cards = q.stem.match(/卡片 ([\d、]+) 摆/)[1].split('、').map(Number)
    var reuse = /重复用/.test(q.stem)
    var set = new Set()
    cards.forEach(function (a, i) {
      cards.forEach(function (b, j) {
        if (a !== 0 && (reuse || i !== j)) set.add(a * 10 + b)
      })
    })
    if (set.size !== q.answer) bad('12 摆两位数答案错（应为 ' + set.size + '）：' + q.stem)
  })
  var digitAnswers = new Set()
  each('meiju', 'digit', function (q) { digitAnswers.add(q.answer) })
  if (digitAnswers.size < 3) bad('12 摆两位数答案只有 ' + Array.from(digitAnswers).join('、') + '，背下来就会')
  each('meiju', 'shake', function (q) {
    var n = nums(q.stem)[0]
    if (n < 4) bad('12 握手人数太少：' + q.stem)
    if (q.answer !== (n * (n - 1)) / 2) bad('12 握手答案错：' + q.stem)
  })
  each('fendui', 'two', function (q) {
    var n = nums(q.stem)[0]
    if (n < 6) bad('13 分两堆数太小：' + q.stem)
    if (q.answer !== Math.floor(n / 2)) bad('13 分两堆答案错：' + q.stem)
  })
  each('kongping', 'drink', function (q, d) {
    if (d === 'L1' && nums(q.stem)[2] < 5) bad('14 空瓶太少：' + q.stem)
  })
  each('jiange', 'stairs', function (q) {
    var n = nums(q.stem)
    if (q.answer !== n[1] - n[0]) bad('16 爬楼梯答案错：' + q.stem)
    if (q.answer < 3) bad('16 只走一两层：' + q.stem)
  })
  ;['segment', 'angle', 'triangle'].forEach(function (vid) {
    each('jishu', vid, function (q) {
      var k = vid === 'segment' ? (q.stem.match(/这 (\d+) 个点/) || [])[1]
        : vid === 'angle' ? nums(q.stem)[0] : (q.stem.match(/这 (\d+) 个点/) || [])[1]
      k = Number(k)
      if (k < 4) bad('32 规模太小（' + k + '）：' + q.stem)
      if (q.answer !== (k * (k - 1)) / 2) bad('32 计数答案错：' + q.stem)
    })
  })
  each('jiou', 'judge', function (q) {
    var n = nums(q.stem)[0]
    if (n < 10) bad('30 认一位数的奇偶：' + q.stem)
    if (q.answer !== (n % 2 ? '奇数' : '偶数')) bad('30 奇偶答案错：' + q.stem)
  })
  each('kuohao1', 'fill', function (q) {
    if (/^\d+ \+ \(/.test(q.stem)) bad('22 又出了「加上一个和」送分题：' + q.stem)
  })
  each('kuohao2', 'fill', function (q) {
    if (/^\d+ \+ \(/.test(q.stem)) bad('23 又出了「加上一个差」送分题：' + q.stem)
  })
  ;['kuohao1', 'kuohao2'].forEach(function (id) {
    each(id, 'fill', function (q) {
      /* 把 ○ 换成答案，两边都按从左往右（括号先算）求值，必须相等 */
      var eq = q.stem.split('。')[0].replace('○', q.answer)
      function ev(x) {
        return Function('return ' + x.replace(/−/g, '-'))()
      }
      var sides = eq.split('=')
      if (ev(sides[0]) !== ev(sides[1])) bad(id + ' 填符号答案错：' + q.stem)
      if (ev(sides[0]) < 0) bad(id + ' 出现负数：' + q.stem)
    })
  })
  each('paidui', 'behind', function (q) {
    var n = nums(q.stem)
    if (q.answer !== n[0] - n[1] || q.answer < 2) bad('17 后面几人：' + q.stem)
  })
  each('paidui', 'both', function (q) {
    var n = nums(q.stem)
    if (n[0] < 2 || n[1] < 2) bad('17 前后只有 1 个人：' + q.stem)
  })
  ;['big', 'small'].forEach(function (vid) {
    each('xianduan1', vid, function (q) {
      if (nums(q.stem)[1] < 2) bad('37 只多 1 个：' + q.stem)
    })
  })
}

/* ---------- 3. 题库够不够：默认勾选至少出满一组 5 道 ---------- */

/*
 * 个别知识点的题本来就只有几种（数线段只看点数、火柴棒只看个数），凑不满 10 道是题目本身的限制，
 * 不算错，列出来心里有数；但连一组 5 道都出不满就不行了。
 */
var thinTopics = []

function checkSupply() {
  A.topicList.forEach(function (t) {
    DIFFS.forEach(function (d) {
      var r5 = U.withSeed(7, function () { return t.generate(defaults(t, d, U.GROUP)) })
      if (r5.shortfall) bad(t.no + ' ' + t.name + ' ' + d + '：默认勾选连一组 5 道都出不满')
      var r10 = U.withSeed(7, function () { return t.generate(defaults(t, d, 10)) })
      if (r10.shortfall) thinTopics.push(t.no + t.name + ' ' + d + ' 只有 ' + r10.questions.length + ' 道')
    })
  })
}

var t0 = Date.now()
checkGroups()
checkGroupAnswers()
checkReviewPlan()
checkFloors()
checkBichang()
checkBizhong()
checkZhongbiao()
checkZhongbiao2()
checkDuichen()
checkJingzi()
checkDiefang()
checkFanzhuan()
checkWoniu()
checkJiangebc()
checkRenxian()
checkSupply()

if (problems.length) {
  console.log('✗ ' + problems.length + ' 处问题（最多列 60 条）：')
  problems.forEach(function (p) { console.log('  - ' + p) })
  process.exit(1)
}
console.log('✓ 奥数出题：5 道一组轮题型 / 组内少撞答案 / 复习卷排课 / 送分题下限 + 答案重算 / 默认至少出满一组 全部通过（' + (Date.now() - t0) + 'ms）')
if (thinTopics.length) console.log('  （题目本身种类少、凑不满 10 道：' + thinTopics.join('；') + '）')
