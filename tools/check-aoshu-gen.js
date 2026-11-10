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
checkSupply()

if (problems.length) {
  console.log('✗ ' + problems.length + ' 处问题（最多列 60 条）：')
  problems.forEach(function (p) { console.log('  - ' + p) })
  process.exit(1)
}
console.log('✓ 奥数出题：5 道一组轮题型 / 组内少撞答案 / 复习卷排课 / 送分题下限 + 答案重算 / 默认至少出满一组 全部通过（' + (Date.now() - t0) + 'ms）')
if (thinTopics.length) console.log('  （题目本身种类少、凑不满 10 道：' + thinTopics.join('；') + '）')
