/**
 * 火柴棒算式出题（无 DOM 依赖，可在 node 中直接测试）。
 *
 * 题面：一道用火柴拼的【错】算式 A op B = C，按提示拿走 / 添上 / 移动一根，
 * 让算式成立。数字按七段拼（段名 a 上 b 右上 c 右下 d 下 e 左下 f 左上 g 中），
 * '+' 两根（h 横、v 竖），'-' 一根（h），'=' 不参与改动。
 *
 * 不随机构造而是【穷举】：范围小（0–20），把本关所有错式都试一遍，只留
 * 「改对的结果恰好一个」的进题池；出卷 = 种子洗牌后取前 count 道。
 * 唯一性按全部改对结果计数（不论在不在本关范围），再要求那唯一一个在范围内。
 *
 * 题目对象：{ level, kind, from, to, edit, key }
 *   from / to = { a, op, b, c }；key = eqText(from)
 *   edit = { removed: {i, seg} | null, added: {i, seg} | null }，
 *   i 是 symbolsOf(from) 的下标（答案页标出动的那根）
 */
(function (root) {
  'use strict'

  /* 四档难度的叫法（2026-11-25 站长定：不叫「第几关」，免得家长以为只有四关）。LEVELS 的 key 仍是 L1–L4 */
  var DIFF = ['入门', '简单', '中等', '挑战']

  var SEG = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg']
  var DIGIT_SEGS = 'abcdefg'
  var OP_SEGS = 'hv'

  /* 段集合规范化成按字母排序的串，方便查表 */
  function norm(s) {
    return s.split('').sort().join('')
  }
  var SEG_TO_DIGIT = {}
  SEG.forEach(function (s, d) { SEG_TO_DIGIT[norm(s)] = d })

  var LEVELS = {
    L1: { key: 'L1', no: 1, name: '拿走一根', kind: 'take', max: 9, two: false },
    L2: { key: 'L2', no: 2, name: '添上一根', kind: 'add', max: 9, two: false },
    L3: { key: 'L3', no: 3, name: '挪一挪', kind: 'move', max: 9, two: false },
    L4: { key: 'L4', no: 4, name: '两位数', kind: 'move', max: 20, two: true }
  }
  var LEVEL_ORDER = ['L1', 'L2', 'L3', 'L4']
  var KIND_TEXT = { take: '拿走一根', add: '添上一根', move: '移动一根' }

  function levelOf(key) {
    return LEVELS[key] || LEVELS.L1
  }

  function eqText(e) {
    return e.a + e.op + e.b + '=' + e.c
  }

  function holds(e) {
    return (e.op === '+' ? e.a + e.b : e.a - e.b) === e.c
  }

  /* 算式 → 符号序列 */
  function symbolsOf(e) {
    var out = []
    function num(n) {
      String(n).split('').forEach(function (ch) { out.push({ t: 'd', segs: SEG[+ch] }) })
    }
    num(e.a)
    out.push({ t: 'op', segs: e.op === '+' ? 'hv' : 'h' })
    num(e.b)
    out.push({ t: 'eq' })
    num(e.c)
    return out
  }

  /* 符号序列 → 算式；有不成形的字、空数、以 0 开头的多位数则返回 null */
  function parseSymbols(syms) {
    var nums = ['']
    var op = null
    for (var i = 0; i < syms.length; i++) {
      var s = syms[i]
      if (s.t === 'd') {
        var d = SEG_TO_DIGIT[norm(s.segs)]
        if (d === undefined) return null
        nums[nums.length - 1] += d
      } else if (s.t === 'op') {
        var k = norm(s.segs)
        if (k === 'hv') op = '+'
        else if (k === 'h') op = '-'
        else return null
        nums.push('')
      } else {
        nums.push('')
      }
    }
    for (var j = 0; j < 3; j++) {
      if (!nums[j] || (nums[j].length > 1 && nums[j].charAt(0) === '0')) return null
    }
    return { a: Number(nums[0]), op: op, b: Number(nums[1]), c: Number(nums[2]) }
  }

  function slotsOf(sym) {
    return sym.t === 'd' ? DIGIT_SEGS : sym.t === 'op' ? OP_SEGS : ''
  }

  /* 一个符号是不是成形的字（数字或 + / -） */
  function validSym(s) {
    if (s.t === 'd') return SEG_TO_DIGIT[norm(s.segs)] !== undefined
    if (s.t === 'op') { var k = norm(s.segs); return k === 'hv' || k === 'h' }
    return true
  }

  /*
   * 单个符号的三种成形变化（按 类型+形状 记忆化）：
   *   take: 拿掉一根仍成形 [{seg, segs}]；add: 添一根仍成形 [{seg, segs}]；
   *   move: 符号内挪一根后成形 [{from, to, segs}]（放回原处不算）
   * 最终算式每个符号都必须成形，所以只枚举成形的变化——L4 穷举因此很快。
   */
  var MEMO = {}
  function changesOf(sym) {
    var id = sym.t + ':' + norm(sym.segs)
    if (MEMO[id]) return MEMO[id]
    var slots = slotsOf(sym)
    var ok = function (segs) { return validSym({ t: sym.t, segs: segs }) }
    var take = []
    var add = []
    var move = []
    sym.segs.split('').forEach(function (seg) {
      var rest = sym.segs.replace(seg, '')
      if (ok(rest)) take.push({ seg: seg, segs: rest })
      slots.split('').forEach(function (to) {
        if (to === seg || rest.indexOf(to) >= 0) return
        if (ok(rest + to)) move.push({ from: seg, to: to, segs: rest + to })
      })
    })
    slots.split('').forEach(function (seg) {
      if (sym.segs.indexOf(seg) >= 0) return
      if (ok(sym.segs + seg)) add.push({ seg: seg, segs: sym.segs + seg })
    })
    MEMO[id] = { take: take, add: add, move: move }
    return MEMO[id]
  }

  function withSegs(syms, i, segs) {
    var n = syms.slice()
    n[i] = { t: syms[i].t, segs: segs }
    return n
  }

  /* 全部单根改动：[{ syms, edit }]，edit = { removed: {i, seg}|null, added: {i, seg}|null } */
  function variants(syms, kind) {
    var out = []
    var ch = syms.map(function (s) { return s.t === 'eq' ? { take: [], add: [], move: [] } : changesOf(s) })
    if (kind === 'take' || kind === 'move') {
      ch.forEach(function (c, i) {
        c.take.forEach(function (t) {
          if (kind === 'take') {
            out.push({ syms: withSegs(syms, i, t.segs), edit: { removed: { i: i, seg: t.seg }, added: null } })
            return
          }
          /* 跨符号移动：拿处成形 × 别处添一根成形 */
          ch.forEach(function (c2, j) {
            if (j === i) return
            c2.add.forEach(function (a) {
              out.push({
                syms: withSegs(withSegs(syms, i, t.segs), j, a.segs),
                edit: { removed: { i: i, seg: t.seg }, added: { i: j, seg: a.seg } }
              })
            })
          })
        })
        if (kind === 'move') {
          c.move.forEach(function (m) {
            out.push({ syms: withSegs(syms, i, m.segs), edit: { removed: { i: i, seg: m.from }, added: { i: i, seg: m.to } } })
          })
        }
      })
    } else {
      ch.forEach(function (c, i) {
        c.add.forEach(function (a) {
          out.push({ syms: withSegs(syms, i, a.segs), edit: { removed: null, added: { i: i, seg: a.seg } } })
        })
      })
    }
    return out
  }

  /* 全部改对的结果（按算式去重，每个结果留第一种改法）：[{ to, edit }] */
  /* cap：数到这么多个就停（出题池只需知道「是不是恰好 1 个」，传 2） */
  function solutions(e, kind, cap) {
    var seen = {}
    var out = []
    var vs = variants(symbolsOf(e), kind)
    for (var i = 0; i < vs.length; i++) {
      var r = parseSymbols(vs[i].syms)
      if (!r || !holds(r)) continue
      var k = eqText(r)
      if (seen[k]) continue
      seen[k] = 1
      out.push({ to: r, edit: vs[i].edit })
      if (cap && out.length >= cap) break
    }
    return out
  }

  function zeroCount(e) {
    return (e.a === 0 ? 1 : 0) + (e.b === 0 ? 1 : 0) + (e.c === 0 ? 1 : 0)
  }
  function inRange(e, max) {
    return e.a <= max && e.b <= max && e.c <= max && e.a >= 0 && e.b >= 0 && e.c >= 0
  }

  var POOLS = {}
  function poolOf(levelKey) {
    var lv = levelOf(levelKey)
    if (POOLS[lv.key]) return POOLS[lv.key]
    var pool = []
    for (var a = 0; a <= lv.max; a++) {
      for (var b = 0; b <= lv.max; b++) {
        for (var c = 0; c <= lv.max; c++) {
          for (var o = 0; o < 2; o++) {
            var e = { a: a, op: o ? '-' : '+', b: b, c: c }
            if (holds(e) || zeroCount(e) > 1) continue
            var sol = solutions(e, lv.kind, 2)
            if (sol.length !== 1) continue
            var to = sol[0].to
            if (!inRange(to, lv.max) || zeroCount(to) > 1) continue
            if (lv.two && Math.max(a, b, c, to.a, to.b, to.c) < 10) continue
            pool.push({ level: lv.key, kind: lv.kind, from: e, to: to, edit: sol[0].edit, key: eqText(e) })
          }
        }
      }
    }
    POOLS[lv.key] = pool
    return pool
  }

  /* 可复现随机源：与 migong-core 同一份（mulberry32 + 种子预搅动，见那边注释） */
  function makeRandom(seed) {
    var t = seed >>> 0
    t = Math.imul(t ^ (t >>> 16), 0x85ebca6b)
    t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35)
    t = (t ^ (t >>> 16)) >>> 0
    return function () {
      t = (t + 0x6d2b79f5) >>> 0
      var r = Math.imul(t ^ (t >>> 15), t | 1)
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
  }

  /* 主入口：题池洗牌取前 count 道（题池本身无重复，同卷自然不重复） */
  function generate(s) {
    var rnd = s.seed ? makeRandom(s.seed) : Math.random
    var pool = poolOf(s.level).slice()
    for (var k = pool.length - 1; k > 0; k--) {
      var j = Math.floor(rnd() * (k + 1))
      var t = pool[k]; pool[k] = pool[j]; pool[j] = t
    }
    var puzzles = pool.slice(0, s.count)
    return { puzzles: puzzles, shortfall: s.count - puzzles.length }
  }

  function titleFor(s) {
    var lv = levelOf(s.level)
    return '火柴棒算式 · ' + DIFF[lv.no - 1] + ' · ' + lv.name
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.huochai = {
    SEG: SEG,
    LEVELS: LEVELS,
    LEVEL_ORDER: LEVEL_ORDER,
    KIND_TEXT: KIND_TEXT,
    levelOf: levelOf,
    eqText: eqText,
    holds: holds,
    symbolsOf: symbolsOf,
    parseSymbols: parseSymbols,
    solutions: solutions,
    poolOf: poolOf,
    makeRandom: makeRandom,
    generate: generate,
    titleFor: titleFor
  }
})(typeof window !== 'undefined' ? window : globalThis)
