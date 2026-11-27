/**
 * 口算「按教材」「按难度」（2026-11-28）：题型标签 + 权重 → 一批题。无 DOM 依赖，node 下由 tools/check-kousuan-tags.js 校验。
 * 方案见 docs/superpowers/specs/2026-11-27-rating-kousuan-flashcards.md 第二节。
 *
 *   按教材：选教材 + 学到第几单元，只出已经教过的题型，绝不超出课本。当前单元约六成、之前学过的约四成。
 *   按难度：跟年级无关。加减 / 乘法 / 除法各 1–5 级预设；家长自定义的难度是一组题型（存在 sumsum:kousuan:plans:v1）。
 *
 * 教材单元的题型来自国家中小学智慧教育平台的课本页面图片（2022 版课标修订本），逐页 OCR 后对着每单元出现的算式定的：
 *   北师大版一上：5 以内（第二单元）、10 以内与连加连减（第四单元），20 以内在一下；
 *   北师大版一下：20 以内进位加（一）、退位减（三）、整十加一位（四）、100 以内不进位不退位（五，「（一）」只到不进位）；
 *   人教版一上：5 以内（一）、10 以内与连加连减（二）、十几加减几不进退位（四）、20 以内进位加（五）；
 *   人教版一下：退位减（二）、整十加减（三）、两位数加减一位数和整十含进退位、两位数加减两位数不进退位（四）、
 *               两位数加减两位数进退位（五，课本是笔算，题目范围就是这些）。
 * 只做算式题；比大小、看图列式不做。
 */
;(function (root) {
  'use strict'

  /* ---------- 随机源（同 generator.js：同一个种子出同一批题） ---------- */

  function makeRandom(seed) {
    var t = seed >>> 0
    return function () {
      t = (t + 0x6d2b79f5) >>> 0
      var r = Math.imul(t ^ (t >>> 15), t | 1)
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
  }
  var rnd = Math.random
  function ri(a, b) { return Math.floor(rnd() * (b - a + 1)) + a }
  function coin() { return rnd() < 0.5 }

  function carry(a, b) {
    while (a > 0 || b > 0) {
      if ((a % 10) + (b % 10) >= 10) return true
      a = Math.floor(a / 10)
      b = Math.floor(b / 10)
    }
    return false
  }
  function borrow(a, b) {
    while (b > 0) {
      if (a % 10 < b % 10) return true
      a = Math.floor(a / 10)
      b = Math.floor(b / 10)
    }
    return false
  }

  function q(a, op, b, ans) {
    var tokens = [a, op, b]
    return { tokens: tokens, answer: ans, remainder: 0, blank: 'ans', key: tokens.join(' ') }
  }
  function add(a, b) { return q(a, '+', b, a + b) }
  function sub(a, b) { return q(a, '−', b, a - b) }
  function mul(a, b) { return q(a, '×', b, a * b) }
  function div(a, b) { return q(a, '÷', b, a / b) }
  function tens() { return ri(1, 9) * 10 }
  function twoDigit() { var n; do { n = ri(11, 99) } while (n % 10 === 0); return n } /* 两位数，不是整十 */

  /* 三个数连加连减：每一步结果都在 0..cap，ok(a, op, b) 给每一步额外的约束（不进位等） */
  function chain(cap, pickNum, ok) {
    var a = pickNum()
    var tokens = [a]
    var v = a
    for (var i = 0; i < 2; i++) {
      var op = coin() ? '+' : '−'
      var b = pickNum()
      var nv = op === '+' ? v + b : v - b
      if (nv <= 0 || nv > cap || b === 0) return null /* 中间、最后得 0 的（8 − 8 + 5）也不出 */
      if (ok && !ok(v, op, b)) return null
      /* 一加一减抵消的（5 + 4 − 4、8 − 3 + 3、5 + 1 − 5）算不上两步 */
      if (i === 1 && tokens[1] !== op && (b === tokens[2] || (op === '−' && b === a))) return null
      tokens.push(op, b)
      v = nv
    }
    return { tokens: tokens, answer: v, remainder: 0, blank: 'ans', key: tokens.join(' ') }
  }
  function noCarryStep(v, op, b) { return op === '+' ? !carry(v, b) : !borrow(v, b) }

  /*
   * 题型表：id → [给家长看的名字, 所属（加减 as / 乘法 mul / 除法 div）, 出一道题（不合格返回 null，外面重试）]
   * 送分题（+0、−0、×1、÷1、自己减自己）一律不出。
   */
  var TAGS = {
    add5: ['5 以内加法', 'as', function () { var s = ri(2, 5); var a = ri(1, s - 1); return add(a, s - a) }],
    sub5: ['5 以内减法', 'as', function () { var a = ri(2, 5); return sub(a, ri(1, a - 1)) }],
    add10: ['10 以内加法', 'as', function () { var s = ri(3, 10); var a = ri(1, s - 1); return add(a, s - a) }],
    sub10: ['10 以内减法', 'as', function () { var a = ri(3, 10); return sub(a, ri(1, a - 1)) }],
    chain10: ['10 以内连加连减', 'as', function () { return chain(10, function () { return ri(1, 9) }) }],
    add20n: ['十几加几（不进位）', 'as', function () {
      var a = ri(10, 18)
      var b = ri(1, 9 - (a % 10) || 9)
      if (a % 10 + b > 9) return null
      return coin() ? add(a, b) : add(b, a)
    }],
    sub20n: ['十几减几（不退位）', 'as', function () {
      var a = ri(11, 19)
      return coin() || a % 10 === 0 ? sub(a, 10) : sub(a, ri(1, a % 10))
    }],
    chain20n: ['20 以内连加连减（不进位不退位）', 'as', function () {
      return chain(20, function () { return ri(1, 10) }, noCarryStep)
    }],
    add20c: ['20 以内进位加法', 'as', function () {
      var a = ri(2, 9)
      var b = ri(Math.max(2, 11 - a), 9)
      return add(a, b)
    }],
    sub20b: ['20 以内退位减法', 'as', function () {
      var a = ri(11, 18)
      var b = ri(a % 10 + 1, 9)
      return b < 2 ? null : sub(a, b)
    }],
    chain20: ['20 以内连加连减', 'as', function () { return chain(20, function () { return ri(2, 9) }) }],
    tens1: ['整十加一位数和相应的减法', 'as', function () {
      var t = tens()
      var o = ri(1, 9)
      var k = ri(0, 3)
      return k === 0 ? add(t, o) : k === 1 ? add(o, t) : k === 2 ? sub(t + o, o) : sub(t + o, t)
    }],
    tens: ['整十加减整十', 'as', function () {
      var a = tens()
      var b = tens()
      if (coin()) return a + b <= 100 ? add(a, b) : null
      return a > b ? sub(a, b) : null
    }],
    add100n: ['两位数加一位数、整十（不进位）', 'as', function () {
      var a = twoDigit()
      if (coin()) {
        var b = ri(1, 9)
        return a % 10 + b <= 9 ? (coin() ? add(a, b) : add(b, a)) : null
      }
      var t = tens()
      return a + t <= 99 ? (coin() ? add(a, t) : add(t, a)) : null
    }],
    sub100n: ['两位数减一位数、整十（不退位）', 'as', function () {
      var a = twoDigit()
      if (coin()) return a % 10 >= 2 ? sub(a, ri(1, a % 10)) : null
      var t = tens()
      return t < a ? sub(a, t) : null
    }],
    add2d: ['两位数加两位数（不进位）', 'as', function () {
      var a = twoDigit()
      var b = twoDigit()
      return a + b <= 99 && !carry(a, b) ? add(a, b) : null
    }],
    sub2d: ['两位数减两位数（不退位）', 'as', function () {
      var a = twoDigit()
      var b = twoDigit()
      return a > b && !borrow(a, b) ? sub(a, b) : null
    }],
    add100c: ['两位数加一位数（进位）', 'as', function () {
      var a = twoDigit()
      var b = ri(2, 9)
      return a % 10 + b >= 10 && a + b <= 100 ? (coin() ? add(a, b) : add(b, a)) : null
    }],
    sub100b: ['两位数减一位数（退位）', 'as', function () {
      var a = ri(20, 99)
      var b = ri(2, 9)
      return a % 10 < b ? sub(a, b) : null
    }],
    add2dc: ['两位数加两位数（进位）', 'as', function () {
      var a = twoDigit()
      var b = twoDigit()
      return a + b <= 100 && carry(a, b) ? add(a, b) : null
    }],
    sub2db: ['两位数减两位数（退位）', 'as', function () {
      var a = ri(20, 99)
      var b = twoDigit()
      return a > b && borrow(a, b) ? sub(a, b) : null
    }],
    chain100: ['100 以内连加连减', 'as', function () {
      return chain(100, function () { return coin() ? ri(2, 9) : twoDigit() })
    }],
    mulP20: ['乘法（积在 20 以内）', 'mul', function () { var a = ri(2, 9); var b = ri(2, 9); return a * b <= 20 ? mul(a, b) : null }],
    mulP50: ['乘法（积在 50 以内）', 'mul', function () { var a = ri(2, 9); var b = ri(2, 9); return a * b <= 50 ? mul(a, b) : null }],
    mulTable: ['表内乘法（九九乘法表）', 'mul', function () { return mul(ri(2, 9), ri(2, 9)) }],
    mulTens: ['整十数乘一位数', 'mul', function () { var t = tens(); var b = ri(2, 9); return coin() ? mul(t, b) : mul(b, t) }],
    mul2x1: ['两位数乘一位数', 'mul', function () { var a = twoDigit(); var b = ri(2, 9); return a * b <= 200 ? mul(a, b) : null }],
    divP20: ['除法（被除数在 20 以内）', 'div', function () { var d = ri(2, 9); var k = ri(2, 9); return d * k <= 20 ? div(d * k, d) : null }],
    divP50: ['除法（被除数在 50 以内）', 'div', function () { var d = ri(2, 9); var k = ri(2, 9); return d * k <= 50 ? div(d * k, d) : null }],
    divTable: ['表内除法', 'div', function () { var d = ri(2, 9); return div(d * ri(2, 9), d) }],
    divTens: ['整十数除以一位数', 'div', function () {
      var n = ri(2, 9) * 10
      var d = ri(2, 9)
      return n % d === 0 && n / d >= 10 ? div(n, d) : null
    }],
    div2x1: ['两位数除以一位数', 'div', function () {
      var d = ri(2, 9)
      var k = ri(10, 49)
      var n = d * k
      return n <= 99 && (n % 10 !== 0 || k % 10 !== 0) ? div(n, d) : null
    }]
  }
  var ORDER = Object.keys(TAGS)
  var GROUP_LABEL = { as: '加减', mul: '乘法', div: '除法' }

  function tagLabel(id) { return TAGS[id] ? TAGS[id][0] : id }
  function tagGroup(id) { return TAGS[id] ? TAGS[id][1] : '' }
  function isChain(id) { return /^chain/.test(id) }

  /* ---------- 教材 ---------- */

  var BOOKS = {
    bsd1a: { name: '北师大版一年级上册', short: '北师大一上', units: [
      ['我上学啦', []],
      ['第一单元 生活中的数', []],
      ['第二单元 5 以内数加与减', ['add5', 'sub5']],
      ['第三单元 整理与分类', []],
      ['第四单元 10 以内数加与减', ['add10', 'sub10', 'chain10']],
      ['第五单元 有趣的立体图形', []]
    ] },
    bsd1b: { name: '北师大版一年级下册', short: '北师大一下', prev: 'bsd1a', units: [
      ['第一单元 20 以内数与加法', ['add20n', 'add20c']],
      ['第二单元 图形大变身（一）', []],
      ['第三单元 20 以内数与减法', ['sub20n', 'sub20b']],
      ['第四单元 100 以内数的认识', ['tens1']],
      ['第五单元 100 以内数加与减（一）', ['tens', 'add100n', 'sub100n', 'add2d', 'sub2d']],
      ['第六单元 有趣的平面图形（一）', []]
    ] },
    rj1a: { name: '人教版一年级上册', short: '人教一上', units: [
      ['数学游戏', []],
      ['第一单元 5 以内数的认识和加、减法', ['add5', 'sub5']],
      ['第二单元 6～10 的认识和加、减法', ['add10', 'sub10', 'chain10']],
      ['第三单元 认识立体图形', []],
      ['第四单元 11～20 的认识', ['add20n', 'sub20n', 'chain20n']],
      ['第五单元 20 以内的进位加法', ['add20c']],
      ['第六单元 复习与关联', []]
    ] },
    rj1b: { name: '人教版一年级下册', short: '人教一下', prev: 'rj1a', units: [
      ['第一单元 认识平面图形', []],
      ['第二单元 20 以内的退位减法', ['sub20b', 'chain20']],
      ['第三单元 100 以内数的认识', ['tens1', 'tens']],
      ['第四单元 100 以内的口算加、减法', ['add100n', 'sub100n', 'add100c', 'sub100b', 'add2d', 'sub2d']],
      ['第五单元 100 以内的笔算加、减法', ['add2dc', 'sub2db', 'chain100']],
      ['第六单元 数量间的加减关系', []],
      ['欢乐购物街', []],
      ['第七单元 复习与关联', []]
    ] }
  }
  var BOOK_ORDER = ['rj1a', 'rj1b', 'bsd1a', 'bsd1b']

  function uniq(arr) {
    var seen = {}
    return arr.filter(function (x) { if (seen[x]) return false; seen[x] = true; return true })
  }

  /* 学到这一册第 unit 个单元（下标从 0 起）时学过的全部题型：本册前面各单元 + 上一册整册 */
  function learnedTags(book, unit) {
    var b = BOOKS[book]
    if (!b) return []
    var out = []
    if (b.prev) out = out.concat(learnedTags(b.prev, BOOKS[b.prev].units.length - 1))
    b.units.slice(0, unit + 1).forEach(function (u) { out = out.concat(u[1]) })
    return uniq(out)
  }

  /*
   * 按教材的权重：学到的这个单元有算式 → 它的题型合占六成，之前学过的合占四成；
   * 这个单元没有算式（图形、整理复习）→ 学过的一视同仁。一个都没学过 → 空（界面上提示）。
   */
  function bookWeights(book, unit) {
    var b = BOOKS[book]
    if (!b) return {}
    unit = Math.max(0, Math.min(b.units.length - 1, unit | 0))
    var cur = b.units[unit][1]
    var all = learnedTags(book, unit)
    var before = all.filter(function (t) { return cur.indexOf(t) < 0 })
    var w = {}
    if (cur.length && before.length) {
      cur.forEach(function (t) { w[t] = 0.6 / cur.length })
      before.forEach(function (t) { w[t] = 0.4 / before.length })
    } else {
      all.forEach(function (t) { w[t] = 1 / all.length })
    }
    return w
  }

  /* ---------- 难度预设 ---------- */

  var LEVELS = {
    as: [
      ['10 以内加减', ['add10', 'sub10']],
      ['20 以内不进位不退位', ['add20n', 'sub20n']],
      ['20 以内进位退位', ['add20c', 'sub20b']],
      ['100 以内不进位不退位', ['tens1', 'tens', 'add100n', 'sub100n', 'add2d', 'sub2d']],
      ['100 以内进位退位', ['add100c', 'sub100b', 'add2dc', 'sub2db']]
    ],
    mul: [
      ['积在 20 以内', ['mulP20']],
      ['积在 50 以内', ['mulP50']],
      ['九九乘法表', ['mulTable']],
      ['整十数乘一位数', ['mulTens']],
      ['两位数乘一位数', ['mul2x1']]
    ],
    div: [
      ['被除数在 20 以内', ['divP20']],
      ['被除数在 50 以内', ['divP50']],
      ['表内除法', ['divTable']],
      ['整十数除以一位数', ['divTens']],
      ['两位数除以一位数', ['div2x1']]
    ]
  }
  /* 「两步」开关：加减各级换成同范围的连加连减（约一半的题） */
  var LEVEL_CHAIN = ['chain10', 'chain20n', 'chain20', 'chain100', 'chain100']

  /* 预设 id：as3 = 加减 3 级 */
  function levelId(group, n) { return group + n }
  function parseLevel(id) {
    var m = /^(as|mul|div)([1-5])$/.exec(String(id || ''))
    return m ? { group: m[1], n: Number(m[2]) } : null
  }
  function levelName(id) {
    var l = parseLevel(id)
    return l ? GROUP_LABEL[l.group] + ' ' + l.n + ' 级 · ' + LEVELS[l.group][l.n - 1][0] : ''
  }
  function levelPlan(id, chainOn) {
    var l = parseLevel(id)
    if (!l) return null
    var tags = LEVELS[l.group][l.n - 1][1].slice()
    if (chainOn && l.group === 'as') tags.push(LEVEL_CHAIN[l.n - 1])
    return { tags: tags }
  }

  /* 题型列表 → 均分权重；带连加连减时它合占一半（「两步」开关的意思） */
  function evenWeights(tags) {
    var w = {}
    var list = uniq(tags.filter(function (t) { return TAGS[t] }))
    var chains = list.filter(isChain)
    var plain = list.filter(function (t) { return !isChain(t) })
    if (chains.length && plain.length) {
      chains.forEach(function (t) { w[t] = 0.5 / chains.length })
      plain.forEach(function (t) { w[t] = 0.5 / plain.length })
    } else {
      list.forEach(function (t) { w[t] = 1 / list.length })
    }
    return w
  }

  /* ---------- 出题 ---------- */

  /* 按权重把 count 道题分给各题型：先按比例取整，余下的按小数部分大小补（同分随种子） */
  function allocate(weights, count) {
    var ids = Object.keys(weights).filter(function (k) { return weights[k] > 0 })
    var total = ids.reduce(function (s, k) { return s + weights[k] }, 0)
    var out = {}
    if (!ids.length || !total) return out
    var left = count
    var rest = ids.map(function (k) {
      var exact = (weights[k] / total) * count
      out[k] = Math.floor(exact)
      left -= out[k]
      return { k: k, f: exact - out[k] + rnd() * 1e-6 }
    }).sort(function (a, b) { return b.f - a.f })
    for (var i = 0; left > 0; i = (i + 1) % rest.length, left--) out[rest[i].k]++
    return out
  }

  /* 上一张点过的错题（题面 key）原样再出：「a 运算 b」和三个数的连加连减 */
  function mustQuestion(key) {
    var t = String(key).split(' ')
    if (t.length === 5) {
      var n = [Number(t[0]), Number(t[2]), Number(t[4])]
      if (!n.every(function (x) { return x >= 0 && x === Math.floor(x) })) return null
      if (!/^[+−]$/.test(t[1]) || !/^[+−]$/.test(t[3])) return null
      var v1 = t[1] === '+' ? n[0] + n[1] : n[0] - n[1]
      var v2 = t[3] === '+' ? v1 + n[2] : v1 - n[2]
      if (v1 < 0 || v2 < 0) return null
      var tk = [n[0], t[1], n[1], t[3], n[2]]
      return { tokens: tk, answer: v2, remainder: 0, blank: 'ans', key: tk.join(' ') }
    }
    if (t.length !== 3) return null
    var a = Number(t[0])
    var b = Number(t[2])
    if (!(a >= 0) || !(b >= 0) || a !== Math.floor(a) || b !== Math.floor(b)) return null
    var op = t[1]
    if (op === '+') return add(a, b)
    if (op === '−') return a >= b ? sub(a, b) : null
    if (op === '×') return mul(a, b)
    if (op === '÷') return b > 0 && a % b === 0 ? div(a, b) : null
    return null
  }

  /*
   * opts：{ weights, count, seed, blankMid, mustInclude }
   * blankMid：「空在中间」——两数一算的题约一半挖掉一个数（填加数、减数、因数……），连加连减只挖结果。
   * 返回 { questions, shortfall }，题目对象同 generator.js。
   */
  function generate(opts) {
    rnd = opts.seed ? makeRandom(opts.seed) : Math.random
    var count = Math.max(1, opts.count | 0)
    var seen = {}
    var musts = []
    ;(opts.mustInclude || []).forEach(function (k) {
      var m = mustQuestion(k)
      if (m && !seen[m.key]) { seen[m.key] = true; musts.push(m) }
    })
    var plan = allocate(opts.weights || {}, Math.max(0, count - musts.length))
    var list = []
    Object.keys(plan).forEach(function (id) {
      var gen = TAGS[id] && TAGS[id][2]
      var need = plan[id]
      var cap = need * 60 + 400
      for (var tries = 0; need > 0 && tries < cap; tries++) {
        var x = gen()
        if (!x || seen[x.key]) continue
        seen[x.key] = true
        list.push(x)
        need--
      }
      /* 题库太小（5 以内加法只有 10 道）：允许重复，凑满一张纸 */
      for (tries = 0; need > 0 && tries < cap; tries++) {
        var y = gen()
        if (!y) continue
        list.push(y)
        need--
      }
    })
    /* 打乱（随种子固定），错题散插进去 */
    for (var i = list.length - 1; i > 0; i--) {
      var j = ri(0, i)
      var t = list[i]; list[i] = list[j]; list[j] = t
    }
    /* 重复的题别挨着 */
    for (var k = 1; k < list.length; k++) {
      if (list[k].key !== list[k - 1].key) continue
      for (var z = k + 1; z < list.length; z++) {
        if (list[z].key !== list[k - 1].key && (z + 1 >= list.length || list[z + 1].key !== list[k].key)) {
          var tmp = list[k]; list[k] = list[z]; list[z] = tmp
          break
        }
      }
    }
    musts.forEach(function (m) { list.splice(ri(0, list.length), 0, m) })
    if (opts.blankMid) {
      list = list.map(function (x) {
        if (x.tokens.length !== 3 || !coin()) return x
        return Object.assign({}, x, { blank: coin() ? 0 : 2 })
      })
    }
    return { questions: list, shortfall: count - list.length }
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.kousuanTags = {
    TAGS: TAGS,
    ORDER: ORDER,
    GROUP_LABEL: GROUP_LABEL,
    BOOKS: BOOKS,
    BOOK_ORDER: BOOK_ORDER,
    LEVELS: LEVELS,
    tagLabel: tagLabel,
    tagGroup: tagGroup,
    isChain: isChain,
    learnedTags: learnedTags,
    bookWeights: bookWeights,
    levelId: levelId,
    parseLevel: parseLevel,
    levelName: levelName,
    levelPlan: levelPlan,
    evenWeights: evenWeights,
    allocate: function (w, n, seed) { rnd = seed ? makeRandom(seed) : Math.random; return allocate(w, n) },
    generate: generate,
    _carry: carry,
    _borrow: borrow
  }
})(typeof window !== 'undefined' ? window : globalThis)
