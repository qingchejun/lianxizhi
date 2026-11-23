/**
 * 火柴棒算式校验脚本。用法：node tools/check-huochai.js
 *
 * 套路同 check-migong.js：① 七段表与「改一根」的枚举在这里【独立另写一遍】
 *    （位掩码写法，core 里是字符串写法），两套互为对证；② 先跑「自检」——
 *    手算过的样例不通过就 exit，明说"是校验器坏了"。
 *
 * 红线（设计稿 §4）：唯一答案 / 原式是错的 / 答案在范围内 / 不出怪数 /
 * 同卷不重复；外加：四关题池 ≥ 60、每关出满 10 题、同种子复现、卷面冒烟。
 */
'use strict'

var problems = []
function check(ok, msg) {
  if (!ok) problems.push(msg)
}

/* ---------- 独立实现：七段位掩码 ---------- */
/* 段位：a=1 b=2 c=4 d=8 e=16 f=32 g=64 */
var BIT = { a: 1, b: 2, c: 4, d: 8, e: 16, f: 32, g: 64 }
function mask(s) {
  var m = 0
  for (var i = 0; i < s.length; i++) m |= BIT[s[i]]
  return m
}
var DIGIT_MASK = [mask('abcdef'), mask('bc'), mask('abdeg'), mask('abcdg'), mask('bcfg'),
  mask('acdfg'), mask('acdefg'), mask('abc'), mask('abcdefg'), mask('abcdfg')]
var MASK_DIGIT = {}
DIGIT_MASK.forEach(function (m, d) { MASK_DIGIT[m] = d })
/* 运算符：横=1 竖=2；'+'=3 '-'=1 */
var OP_MASK = { '+': 3, '-': 1 }

/* 算式 → 槽位数组 [{k:'d'|'o'|'=', m}] */
function slots(a, op, b, c) {
  var out = []
  function num(n) {
    String(n).split('').forEach(function (ch) { out.push({ k: 'd', m: DIGIT_MASK[+ch] }) })
  }
  num(a); out.push({ k: 'o', m: OP_MASK[op] }); num(b); out.push({ k: '=', m: 0 }); num(c)
  return out
}

/* 槽位数组 → 'a op b = c' 文本；不合法返回 null */
function read(sl) {
  var parts = ['']
  var ops = []
  for (var i = 0; i < sl.length; i++) {
    var s = sl[i]
    if (s.k === 'd') {
      if (!(s.m in MASK_DIGIT)) return null
      parts[parts.length - 1] += MASK_DIGIT[s.m]
    } else if (s.k === 'o') {
      if (s.m === 3) ops.push('+')
      else if (s.m === 1) ops.push('-')
      else return null
      parts.push('')
    } else {
      parts.push('')
    }
  }
  for (var j = 0; j < 3; j++) {
    if (!parts[j] || (parts[j].length > 1 && parts[j][0] === '0')) return null
  }
  return { a: +parts[0], op: ops[0], b: +parts[1], c: +parts[2] }
}

function holds(e) {
  return (e.op === '+' ? e.a + e.b : e.a - e.b) === e.c
}
function txt(e) {
  return e.a + (e.op === '+' ? '+' : '-') + e.b + '=' + e.c
}

/* 每个槽可放火柴的全部位 */
function fullOf(s) {
  return s.k === 'd' ? 127 : s.k === 'o' ? 3 : 0
}

/* 所有「改一根」后的槽位数组 */
function variants(sl, kind) {
  var out = []
  function bitsOf(m) {
    var r = []
    for (var b = 1; b <= 64; b <<= 1) if (m & b) r.push(b)
    return r
  }
  sl.forEach(function (s, i) {
    if (kind === 'take') {
      bitsOf(s.m).forEach(function (b) {
        var n = sl.slice(); n[i] = { k: s.k, m: s.m & ~b }; out.push(n)
      })
    } else if (kind === 'add') {
      bitsOf(fullOf(s) & ~s.m).forEach(function (b) {
        var n = sl.slice(); n[i] = { k: s.k, m: s.m | b }; out.push(n)
      })
    }
  })
  if (kind === 'move') {
    variants(sl, 'take').forEach(function (t) {
      variants(t, 'add').forEach(function (n) {
        var same = n.every(function (s, i) { return s.m === sl[i].m })
        if (!same) out.push(n)
      })
    })
  }
  return out
}

/* 独立求解：返回改对后的算式文本集合（排序数组） */
function solve(e, kind) {
  var set = {}
  variants(slots(e.a, e.op, e.b, e.c), kind).forEach(function (n) {
    var r = read(n)
    if (r && holds(r)) set[txt(r)] = 1
  })
  return Object.keys(set).sort()
}

/* ---------- 自检（手算过的样例） ---------- */
;(function selfTest() {
  var bad = []
  var t1 = solve({ a: 0, op: '+', b: 0, c: 8 }, 'take')
  if (t1.join() !== '0+0=0') bad.push('0+0=8 拿一根 应只有 0+0=0，得到 ' + t1)
  var t2 = solve({ a: 8, op: '+', b: 1, c: 9 }, 'take')
  if (t2.length !== 0) bad.push('8+1=9 拿一根 应无解，得到 ' + t2)
  var t3 = solve({ a: 5, op: '+', b: 3, c: 6 }, 'add')
  if (t3.join() !== '5+3=8') bad.push('5+3=6 添一根 应只有 5+3=8，得到 ' + t3)
  var t4 = solve({ a: 0, op: '+', b: 1, c: 8 }, 'move')
  if (t4.join() !== '8+1=9') bad.push('0+1=8 移一根 应只有 8+1=9，得到 ' + t4)
  var t5 = solve({ a: 5, op: '-', b: 3, c: 8 }, 'add')
  if (t5.indexOf('5+3=8') < 0) bad.push('5-3=8 添一根 应含 5+3=8（减号添竖），得到 ' + t5)
  if (bad.length) {
    console.log('✗ 校验器自检失败（是校验器坏了，不是题目）：')
    bad.forEach(function (b) { console.log('  - ' + b) })
    process.exit(1)
  }
})()

/* ---------- 关卡参数：这里【重新写一遍】，不从 core 取 ---------- */
var LV = {
  L1: { kind: 'take', max: 9, two: false },
  L2: { kind: 'add', max: 9, two: false },
  L3: { kind: 'move', max: 9, two: false },
  L4: { kind: 'move', max: 20, two: true }
}

function zeros(e) {
  return [e.a, e.b, e.c].filter(function (n) { return n === 0 }).length
}
function inRange(e, max) {
  return [e.a, e.b, e.c].every(function (n) { return n >= 0 && n <= max })
}

/* ---------- 对证 core ---------- */
var H
try {
  require('../js/huochai-core.js')
  H = globalThis.SumSum.huochai
} catch (err) {
  console.log('✗ 读不了 js/huochai-core.js：' + err.message)
  process.exit(1)
}

;(function checkCore() {
  /* 七段表与设计稿一致 */
  var want = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg']
  want.forEach(function (s, d) {
    check(mask(H.SEG[d]) === mask(s), '七段表 ' + d + ' 应为 ' + s + '，core 是 ' + H.SEG[d])
  })
  check(H.LEVEL_ORDER.join() === 'L1,L2,L3,L4', '关卡顺序')

  Object.keys(LV).forEach(function (key) {
    var lv = LV[key]
    var core = H.levelOf(key)
    check(core.kind === lv.kind && core.max === lv.max, key + ' 关卡参数与设计稿不一致')

    /* 独立穷举出「应有的题池」，与 core 的题池逐条对证 */
    var expect = {}
    for (var a = 0; a <= lv.max; a++) {
      for (var b = 0; b <= lv.max; b++) {
        for (var c = 0; c <= lv.max; c++) {
          ;['+', '-'].forEach(function (op) {
            var e = { a: a, op: op, b: b, c: c }
            if (holds(e)) return
            if (zeros(e) > 1) return
            var sol = solve(e, lv.kind)
            if (sol.length !== 1) return
            var m = /^(\d+)([+-])(\d+)=(\d+)$/.exec(sol[0])
            var to = { a: +m[1], op: m[2], b: +m[3], c: +m[4] }
            if (!inRange(to, lv.max) || zeros(to) > 1) return
            if (lv.two && Math.max(a, b, c, to.a, to.b, to.c) < 10) return
            expect[txt(e)] = sol[0]
          })
        }
      }
    }
    var pool = H.poolOf(key)
    var got = {}
    pool.forEach(function (p) {
      got[txt(p.from)] = txt(p.to)
      check(p.level === key && p.kind === lv.kind, key + ' 题目带错关卡：' + txt(p.from))
      check(!holds(p.from), key + ' 原式本来就对：' + txt(p.from))
      check(holds(p.to), key + ' 答案不成立：' + txt(p.to))
      check(p.key === txt(p.from), key + ' key 应为原式文本：' + p.key)
      /* 标注的那一根改动，照做一遍必须得到答案 */
      var sl = slots(p.from.a, p.from.op, p.from.b, p.from.c)
      var ed = p.edit
      var n = sl.slice()
      var BITS = { a: 1, b: 2, c: 4, d: 8, e: 16, f: 32, g: 64, h: 1, v: 2 }
      if (ed.removed) {
        var r = n[ed.removed.i]
        check(r && (r.m & BITS[ed.removed.seg]), key + ' 标注拿走的那根不存在：' + txt(p.from))
        if (r) n[ed.removed.i] = { k: r.k, m: r.m & ~BITS[ed.removed.seg] }
      }
      if (ed.added) {
        var s2 = n[ed.added.i]
        check(s2 && !(s2.m & BITS[ed.added.seg]), key + ' 标注添上的位置已有火柴：' + txt(p.from))
        if (s2) n[ed.added.i] = { k: s2.k, m: s2.m | BITS[ed.added.seg] }
      }
      var shape = (ed.removed ? 'R' : '') + (ed.added ? 'A' : '')
      check(shape === { take: 'R', add: 'A', move: 'RA' }[lv.kind], key + ' 改法标注应为 ' + lv.kind + '，得到 ' + shape + '：' + txt(p.from))
      var after = read(n)
      check(after && txt(after) === txt(p.to), key + ' 照标注改完不是答案：' + txt(p.from) + ' → ' + (after && txt(after)))
    })
    var miss = Object.keys(expect).filter(function (k) { return got[k] !== expect[k] })
    var extra = Object.keys(got).filter(function (k) { return !(k in expect) })
    check(!miss.length, key + ' core 题池缺题或答案不符 ' + miss.length + ' 道，如 ' + miss.slice(0, 3))
    check(!extra.length, key + ' core 题池多出不合格的题 ' + extra.length + ' 道，如 ' + extra.slice(0, 3))
    var n = Object.keys(expect).length
    check(n >= 60, key + ' 题池只有 ' + n + ' 道（少于 60，要找站长商量）')
    console.log('  ' + key + ' 题池 ' + n + ' 道')

    /* 出卷：300 个种子 × 10 题 */
    var rnd = Math.random
    for (var t = 0; t < 300; t++) {
      var seed = Math.floor(rnd() * 999999998) + 1
      var s = { level: key, count: 10, copies: 2, answerPage: true, seed: seed, title: '' }
      var r1 = H.generate(s)
      check(r1.shortfall === 0 && r1.puzzles.length === 10, key + ' 种子 ' + seed + ' 没出满 10 题')
      var seen = {}
      r1.puzzles.forEach(function (p) {
        check(!seen[p.key], key + ' 种子 ' + seed + ' 同卷重复：' + p.key)
        seen[p.key] = 1
        check(p.key in expect, key + ' 出了题池外的题：' + p.key)
      })
      if (t < 20) {
        var r2 = H.generate(s)
        check(r2.puzzles.map(function (p) { return p.key }).join() === r1.puzzles.map(function (p) { return p.key }).join(),
          key + ' 同种子 ' + seed + ' 两次出卷不同')
      }
    }
  })
})()

/* ---------- 设置钳位 ---------- */
;(function checkSettings() {
  var ok = true
  try {
    require('../js/store.js')
    require('../js/huochai-settings.js')
  } catch (err) {
    ok = false
    check(false, '读不了 js/huochai-settings.js：' + err.message)
  }
  if (!ok) return
  var HS = globalThis.SumSum.huochaiSettings
  var d = HS.sanitize({})
  check(d.level === 'L1' && d.count === 5 && d.copies === 2 && d.answerPage === false && d.title === '', '默认设置：' + JSON.stringify(d))
  var x = HS.sanitize({ level: 'L9', count: 'abc', copies: 7, answerPage: 'x', title: new Array(50).join('长') })
  check(x.level === 'L1' && x.count === 5 && x.copies === 2 && x.answerPage === false && x.title.length === 30, '乱填参数钳位：' + JSON.stringify(x))
  check(HS.sanitize({ count: 99 }).count === 10 && HS.sanitize({ count: 0 }).count === 1, '题量钳在 1–10')
})()

/* ---------- 卷面冒烟 ---------- */
;(function checkRender() {
  var ok = true
  try {
    require('../js/render.js')
    require('../js/huochai-render.js')
  } catch (err) {
    ok = false
    check(false, '读不了 js/huochai-render.js：' + err.message)
  }
  if (!ok) return
  var HR = globalThis.SumSum.huochaiRender
  function sticksOf(e) {
    var n = 0
    slots(e.a, e.op, e.b, e.c).forEach(function (s) {
      for (var b = 1; b <= 64; b <<= 1) if (s.m & b) n++
    })
    return n + 2 /* 等号两根 */
  }
  ;['L1', 'L2', 'L3', 'L4'].forEach(function (key) {
    var s = { level: key, count: 7, copies: 2, answerPage: true, seed: 12345, title: '' }
    var pz = H.generate(s).puzzles
    var html = HR.buildHTML(s, pz)
    var sheets = (html.match(/class="sheet sheet-huochai"/g) || []).length
    var ans = (html.match(/class="sheet sheet-huochai-ans"/g) || []).length
    check(sheets === Math.ceil(7 / 5) * 2, key + ' 卷面页数应为 4，得到 ' + sheets)
    check(ans === Math.ceil(7 / 10), key + ' 答案页数应为 1，得到 ' + ans)
    var one = HR.figureSVG(pz[0].from, { slots: key !== 'L1' })
    var sticks = (one.match(/class="hc-stick"/g) || []).length
    check(sticks === sticksOf(pz[0].from), key + ' 火柴图实线根数 ' + sticks + ' ≠ ' + sticksOf(pz[0].from))
    var hasSlot = /class="hc-slot"/.test(one)
    check(hasSlot === (key !== 'L1'), key + (key === 'L1' ? ' 不该印虚线槽' : ' 应印虚线槽'))
    check(html.indexOf(H.eqText(pz[0].to)) >= 0, key + ' 答案页缺正确算式 ' + H.eqText(pz[0].to))
  })
  var none = HR.buildHTML({ level: 'L1', count: 5, copies: 1, answerPage: true, seed: 1, title: '' }, [])
  check(typeof none === 'string', '零题时 buildHTML 不该抛错')
})()

if (problems.length) {
  console.log('✗ ' + problems.length + ' 处问题：')
  problems.slice(0, 40).forEach(function (p) { console.log('  - ' + p) })
  process.exit(1)
}
console.log('✓ 火柴棒：自检 / 四关题池对证 / 出卷 / 设置 / 卷面 全部通过')
