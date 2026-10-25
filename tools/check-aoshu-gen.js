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
checkSupply()

if (problems.length) {
  console.log('✗ ' + problems.length + ' 处问题（最多列 60 条）：')
  problems.forEach(function (p) { console.log('  - ' + p) })
  process.exit(1)
}
console.log('✓ 奥数出题：5 道一组轮题型 / 组内少撞答案 / 复习卷排课 / 送分题下限 + 答案重算 / 默认至少出满一组 全部通过（' + (Date.now() - t0) + 'ms）')
if (thinTopics.length) console.log('  （题目本身种类少、凑不满 10 道：' + thinTopics.join('；') + '）')
