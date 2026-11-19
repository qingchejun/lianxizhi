/**
 * 密码推理生成器校验脚本。用法：node tools/check-mima.js
 *
 * 套路照抄 check-shudu.js：① 求解/计数在这里【独立另写一遍】，故意不复用
 * mima-core 的实现，两套互为对证；② 脚本先跑「自检」——手工验证过的样例
 * （含那道经典的 5827 四位密码题）不通过就 exit，明说"是校验器坏了"。
 */
'use strict'

require('../js/mima-core.js')
require('../js/store.js') // 写入收口：mima-settings 的 save 走它（node 下无害）
require('../js/mima-settings.js')
require('../js/mima-render.js')
require('../js/render.js') // 只为 mima-render 的 P().esc 等零件；加载期不碰 DOM，node 可直接 require
var MI = globalThis.SumSum.mima

/* 关卡参数在这里【重新写一遍】，不从 mima-core 取——那边写错了这里才能发现。
   poolMin/poolMax 描述数字池（含两端）。 */
var LEVELS = {
  L1: { N: 3, poolMin: 1, poolMax: 6, rowMin: 4, rowMax: 5, bZero: true, dots: true, strip: true },
  L2: { N: 3, poolMin: 1, poolMax: 9, rowMin: 4, rowMax: 4, bZero: false, dots: true, strip: true },
  L3: { N: 3, poolMin: 0, poolMax: 9, rowMin: 4, rowMax: 4, bZero: false, dots: false, strip: false },
  L4: { N: 4, poolMin: 0, poolMax: 9, rowMin: 3, rowMax: 4, bZero: false, dots: false, strip: false }
}

/* 独立实现 ①：反馈计算。与 core 的 score 写法不同——先数两串共有的数字，
   再从中减去对位的，得到 (a, b)。 */
function score2(guess, code) {
  var share = 0
  for (var i = 0; i < guess.length; i++) {
    if (code.indexOf(guess[i]) >= 0) share++
  }
  var exact = 0
  for (var j = 0; j < guess.length; j++) {
    if (guess[j] === code[j]) exact++
  }
  return [exact, share - exact]
}

/* 独立实现 ②：解计数。与 core 的 enumerate 遍历方式不同——按位递归、位掩码
   记已用下标（密码各位顺序有意义，必须枚举全部排列而不是组合；数到 cap 个
   就停）。 */
function enumerate2(pool, N, rows, cap) {
  var found = []
  function step(pos, usedMask, cur) {
    if (found.length >= cap) return
    if (pos === N) {
      for (var r = 0; r < rows.length; r++) {
        var fb = score2(rows[r].g, cur)
        if (fb[0] !== rows[r].a || fb[1] !== rows[r].b) return
      }
      found.push(cur.slice())
      return
    }
    for (var i = 0; i < pool.length; i++) {
      if (usedMask & (1 << i)) continue
      cur.push(pool[i])
      step(pos + 1, usedMask | (1 << i), cur)
      cur.pop()
    }
  }
  step(0, 0, [])
  return found
}

/* ---------- 校验器自检：手工样例，先确认校验器本身是对的 ---------- */

/*
 * 样例 A：2026-11-19 站长发来的经典题（人工推过，密码 5827）。
 *   9341 —— 没有一个号码正确        (0,0)
 *   2697 —— 两个对，一个位置对      (1,1)
 *   4803 —— 一个对，位置对          (1,0)
 *   2598 —— 三个对，位置都不对      (0,3)
 */
var FIXTURE_5827 = {
  code: [5, 8, 2, 7],
  rows: [
    { g: [9, 3, 4, 1], a: 0, b: 0 },
    { g: [2, 6, 9, 7], a: 1, b: 1 },
    { g: [4, 8, 0, 3], a: 1, b: 0 },
    { g: [2, 5, 9, 8], a: 0, b: 3 }
  ]
}

/* 样例 B：L1 风格的 b=0 题（原型输出的手验样本，密码 613）。 */
var FIXTURE_L1 = {
  code: [6, 1, 3],
  rows: [
    { g: [2, 4, 3], a: 1, b: 0 },
    { g: [2, 1, 5], a: 1, b: 0 },
    { g: [4, 2, 5], a: 0, b: 0 },
    { g: [2, 5, 4], a: 0, b: 0 },
    { g: [5, 2, 4], a: 0, b: 0 }
  ]
}

function selfTest() {
  var fails = []

  /* score2 的四类反馈都得算对（拿 5827 的四行当已知答案） */
  FIXTURE_5827.rows.forEach(function (r) {
    var fb = score2(r.g, FIXTURE_5827.code)
    if (fb[0] !== r.a || fb[1] !== r.b) {
      fails.push('score2 对 ' + r.g.join('') + ' 算出 (' + fb + ')，应为 (' + r.a + ',' + r.b + ')')
    }
  })

  /* 5827 这组线索必须恰好一个解，且就是 5827 */
  var sols = enumerate2([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4, FIXTURE_5827.rows, 2)
  if (sols.length !== 1 || sols[0].join('') !== '5827') {
    fails.push('enumerate2 在 5827 样例上数出 ' + sols.length + ' 个解（应为 1 个且等于 5827）')
  }

  /* L1 样例：唯一解 613 */
  var l1 = enumerate2([1, 2, 3, 4, 5, 6], 3, FIXTURE_L1.rows, 2)
  if (l1.length !== 1 || l1[0].join('') !== '613') {
    fails.push('enumerate2 在 L1 样例上数出 ' + l1.length + ' 个解（应为 1 个且等于 613）')
  }

  /* 只有一行"全错"必然多解（cap=3 至少数到 2 个才说明计数器在工作） */
  var many = enumerate2([0, 1, 2, 3], 2, [{ g: [0, 1], a: 0, b: 0 }], 3)
  if (many.length < 2) fails.push('enumerate2 在明显多解的题上没数到 ≥2 个解')

  /* cap 生效：cap=1 就只找 1 个 */
  var one = enumerate2([0, 1, 2, 3], 2, [{ g: [0, 1], a: 0, b: 0 }], 1)
  if (one.length !== 1) fails.push('enumerate2 没有遵守 cap=1 的停止条件')

  return fails
}

/* ---------- 主校验：每关扫一批生成题 ---------- */

var ROUNDS = 300

function poolOf(lv) {
  var p = []
  for (var d = lv.poolMin; d <= lv.poolMax; d++) p.push(d)
  return p
}

function checkLevel(levelKey, report) {
  var lv = LEVELS[levelKey]
  var pool = poolOf(lv)

  for (var r = 1; r <= ROUNDS; r++) {
    var seed = r * 7919 + levelKey.charCodeAt(1) * 131
    var res = MI.generate({ level: levelKey, count: 1, seed: seed, noDuplicates: false })
    var q = res.puzzles[0]
    var where = levelKey + ' seed=' + seed
    if (!q) { report(where + '：generate 没产出题目'); continue }

    /* ① 密码本身：位数、不重复、都在池里 */
    if (q.code.length !== lv.N) report(where + '：密码位数 ' + q.code.length + ' ≠ ' + lv.N)
    if (new Set(q.code).size !== lv.N) report(where + '：密码数字重复 ' + q.code.join(''))
    q.code.forEach(function (d) {
      if (d < lv.poolMin || d > lv.poolMax) report(where + '：密码数字 ' + d + ' 不在池里')
    })

    /* ② 线索行：条数在关卡区间、行内数字合规、行不重复、行 ≠ 密码、反馈真算 */
    if (q.rows.length < lv.rowMin || q.rows.length > lv.rowMax) {
      report(where + '：线索 ' + q.rows.length + ' 行，超出 [' + lv.rowMin + ',' + lv.rowMax + ']')
    }
    var seenRow = {}
    q.rows.forEach(function (row) {
      var k = row.g.join('')
      if (k === q.code.join('')) report(where + '：有线索行等于密码本身')
      if (seenRow[k]) report(where + '：线索行重复 ' + k)
      seenRow[k] = 1
      if (row.g.length !== lv.N) report(where + '：行 ' + k + ' 位数不对')
      if (new Set(row.g).size !== lv.N) report(where + '：行 ' + k + ' 数字重复')
      row.g.forEach(function (d) {
        if (d < lv.poolMin || d > lv.poolMax) report(where + '：行 ' + k + ' 数字 ' + d + ' 不在池里')
      })
      var fb = score2(row.g, q.code)
      if (fb[0] !== row.a || fb[1] !== row.b) {
        report(where + '：行 ' + k + ' 反馈 (' + row.a + ',' + row.b + ') 与真算 (' + fb + ') 不符——线索说谎')
      }
      if (lv.bZero && row.b !== 0) report(where + '：L1 出现了 ○（b=' + row.b + '）')
    })

    /* ③ 唯一解（独立计数器）且就是那个密码 */
    var sols = enumerate2(pool, lv.N, q.rows, 2)
    if (sols.length !== 1) { report(where + '：【红线】解的个数是 ' + sols.length + '，不唯一'); continue }
    if (sols[0].join('') !== q.code.join('')) report(where + '：唯一解与 code 字段不一致')

    /* ④ 排除可解：solve 必须推到底、推出的就是密码、步骤是孩子跟得上的句式 */
    var sol = MI.solve(pool, lv.N, q.rows)
    if (!sol.solved) { report(where + '：【红线】只靠排除推不到底'); continue }
    if (sol.placed.join('') !== q.code.join('')) report(where + '：【红线】推出的密码与 code 不一致')
    if (!q.trace || !q.trace.length) report(where + '：trace 为空')
    q.trace.forEach(function (line) {
      if (!/^(第|定位|剩下|密码是)/.test(line)) report(where + '：解析步骤句式不对：' + line)
    })
    var last = q.trace[q.trace.length - 1]
    if (last !== '密码是 ' + q.code.join(' ')) report(where + '：解析末条应为密码本身，实际是 ' + last)

    /* ⑤ key 与题目对得上（去重靠它） */
    if (q.key !== levelKey + '|' + q.code.join('') + '|' + q.rows.map(function (x) { return x.g.join('') }).join('.')) {
      report(where + '：key 字段与题目内容不一致')
    }
  }
}

function checkReproducible(report) {
  ['L1', 'L4'].forEach(function (lk) {
    var s = { level: lk, count: 6, seed: 20261119, noDuplicates: true }
    var a = JSON.stringify(MI.generate(s).puzzles)
    var b = JSON.stringify(MI.generate(s).puzzles)
    if (a !== b) report(lk + '：同一种子两次生成不同（不可复现）')
    var other = JSON.stringify(MI.generate({ level: lk, count: 6, seed: 20261120, noDuplicates: true }).puzzles)
    if (a === other) report(lk + '：换种子题目没变（种子没生效）')
  })
}

function checkNoDuplicates(report) {
  var res = MI.generate({ level: 'L1', count: 12, seed: 424242, noDuplicates: true })
  var seen = {}
  res.puzzles.forEach(function (q) {
    if (seen[q.key]) report('L1：开了「题目不重复」仍出现重复题')
    seen[q.key] = 1
  })
  if (res.puzzles.length !== 12) report('L1：要 12 题只出了 ' + res.puzzles.length + ' 题')
}

function checkClueText(report) {
  var T = MI.clueText
  if (T(0, 0) !== '这些号码都不在密码里') report('clueText(0,0) 文案不对：' + T(0, 0))
  if (T(1, 0) !== '只有 1 个号码正确，位置也对') report('clueText(1,0) 文案不对')
  if (T(0, 3) !== '有 3 个号码正确，位置都不对') report('clueText(0,3) 文案不对')
  if (T(1, 1) !== '有 2 个号码正确，只有 1 个位置正确') report('clueText(1,1) 文案不对')
}

function checkSettings(report) {
  var ST = globalThis.SumSum.mimaSettings
  if (!ST) { report('mima-settings.js 没加载上'); return }

  /* 越界/畸形值必须被钳住或回退，而不是透传给生成器 */
  if (ST.sanitize({ level: 'L9' }).level !== 'L1') report('level=L9 没回退到 L1')
  if (ST.sanitize({ level: 'l1' }).level !== 'L1') report('level 大小写敏感地拒绝了 l1（应回退 L1）')
  if (ST.sanitize({ count: 0 }).count !== 1) report('count=0 没钳到 1')
  if (ST.sanitize({ count: 99 }).count !== 12) report('count=99 没钳到 12')
  if (ST.sanitize({ count: 'abc' }).count !== 4) report('count=abc 没回退默认 4')
  if (ST.sanitize({ copies: 5 }).copies !== 2) report('copies=5 没钳到 2')
  if (ST.sanitize({ copies: '1' }).copies !== 1) report("copies='1' 没按数字处理")
  if (ST.sanitize({ noDuplicates: 'false' }).noDuplicates !== false) report("noDuplicates='false' 没转成布尔假")
  if (ST.sanitize({ answerPage: '1' }).answerPage !== true) report("answerPage='1' 没转成布尔真")
  if (ST.sanitize({ title: 'x'.repeat(50) }).title.length > 30) report('title 没截到 30 字')
  if (ST.sanitize({ seed: -5 }).seed !== 0) report('seed=-5 没钳到 0')
  /* 默认值本身 */
  var d = ST.DEFAULTS
  if (d.level !== 'L1' || d.count !== 4 || d.copies !== 2 || d.noDuplicates !== true || d.answerPage !== false) {
    report('DEFAULTS 与规格不符：' + JSON.stringify(d))
  }
}

/* ---------- 渲染：字符串级断言（buildHTML 在 node 里可直接跑） ---------- */

function genOne(levelKey, seed) {
  return MI.generate({ level: levelKey, count: 2, seed: seed, noDuplicates: false }).puzzles
}

function checkRenderStrings(report) {
  var R = globalThis.SumSum.mimaRender
  if (!R) { report('mima-render.js 没加载上'); return }

  /* 皮肤不许串关 */
  var l1 = R.buildHTML({ level: 'L1', copies: 1, answerPage: false, title: '' }, genOne('L1', 11))
  if (l1.indexOf('mima-strip') < 0) report('L1 卷面没有划掉数字带')
  if (l1.indexOf('号码正确') >= 0) report('L1 卷面出现了文字线索（应是点子）')
  var l2 = R.buildHTML({ level: 'L2', copies: 1, answerPage: false, title: '' }, genOne('L2', 12))
  if (l2.indexOf('mima-strip') < 0) report('L2 卷面没有划掉数字带')
  var l3 = R.buildHTML({ level: 'L3', copies: 1, answerPage: false, title: '' }, genOne('L3', 13))
  if (l3.indexOf('号码正确') < 0) report('L3 卷面没有文字线索')
  if (l3.indexOf('mima-strip') >= 0) report('L3 卷面不该有划掉数字带')
  var l4 = R.buildHTML({ level: 'L4', copies: 1, answerPage: false, title: '' }, genOne('L4', 14))
  if (l4.indexOf('mima-strip') >= 0) report('L4 卷面不该有划掉数字带')

  /* 对战双份：题页 ×2，答案页仍只 1 份 */
  var two = R.buildHTML({ level: 'L1', copies: 2, answerPage: true, title: '' }, genOne('L1', 15))
  var sheetCount = (two.match(/sheet sheet-mima"/g) || []).length
  var ansCount = (two.match(/sheet-mima-ans"/g) || []).length
  /* L1 每页 2 道、2 道题 = 1 页 × 2 份 = 2 张题页 + 1 张答案页 */
  if (sheetCount !== 2) report('copies=2 时题页应为 2 张，实际 ' + sheetCount)
  if (ansCount !== 1) report('copies=2 时答案页应仍为 1 张，实际 ' + ansCount)

  /* 答案页带密码与分步解析 */
  if (two.indexOf('mima-steps') < 0) report('答案页没有分步解析')
  if (two.indexOf('mima-ans-code') < 0) report('答案页没有密码行')

  /* 题目比每页容量少时按实际题数排 */
  if (R.perPageOf({ level: 'L1' }, 1) !== 1) report('只出 1 道时没有按 1 道排')
  if (R.perPageOf({ level: 'L3' }, 9) !== 2) report('L3 每页应固定 2 道')
}

/* ---------- 排版：按 A4 实际尺寸独立重算（不共用渲染层的 MM 常量） ---------- */

function checkLayout(report) {
  var R = globalThis.SumSum.mimaRender
  if (!R) { report('mima-render.js 没加载上'); return }
  var W = 180 // A4 纵向内容区宽
  var GAP = 8
  var RULE = 9, NO = 6, ROWH = 11, ANSH = 12, STRIPH = 9, PADH = 8

  Object.keys(LEVELS).forEach(function (lk) {
    var lv = LEVELS[lk]
    var per = R.MM.PER_PAGE[lk]
    var h = RULE + per * (NO + lv.rowMax * ROWH + ANSH + (lv.strip ? STRIPH : 0) + PADH) + (per - 1) * GAP
    if (h > 222) report(lk + ' 每页 ' + per + ' 道高 ' + h.toFixed(0) + 'mm，超出 222mm 版心')
    /* 宽：一行 = N 个数字格 + 反馈（点子 18mm / 文字最长约 62mm） */
    var fbW = lv.dots ? 18 : 62
    var w = lv.N * 9 + 3 + fbW + 8 /* 卡片左右 padding */
    if (w > W) report(lk + ' 线索行宽 ' + w + 'mm 超出 ' + W + 'mm')
  })

  /* 答案页 2×2：步骤按最长 12 条估 */
  var ansH = 2 * (NO + 8 + 12 * 5.2 + PADH) + GAP
  if (ansH > 218) report('答案页高 ' + ansH.toFixed(0) + 'mm 超出版心')
}

function main() {
  var problems = []
  function report(msg) { problems.push(msg) }

  var selfFails = selfTest()
  if (selfFails.length) {
    console.log('✗ 校验器自检没通过——问题在校验脚本本身，先别动生成器：')
    selfFails.forEach(function (m) { console.log('   · ' + m) })
    process.exit(2)
  }
  console.log('✓ 校验器自检通过')

  var t0 = Date.now()
  var total = 0
  Object.keys(LEVELS).forEach(function (lk) {
    var before = problems.length
    var st = Date.now()
    checkLevel(lk, report)
    total += ROUNDS
    console.log(
      (problems.length > before ? '✗' : '✓') + ' ' + lk + '  ' + ROUNDS + ' 局  (' + (Date.now() - st) + 'ms)'
    )
  })
  ;[
    ['文字句式', checkClueText],
    ['种子可复现', checkReproducible],
    ['题目不重复', checkNoDuplicates],
    ['设置钳位', checkSettings],
    ['渲染皮肤', checkRenderStrings],
    ['排版放得下', checkLayout]
  ].forEach(function (pair) {
    var before = problems.length
    pair[1](report)
    console.log((problems.length > before ? '✗' : '✓') + ' ' + pair[0])
  })

  console.log('')
  if (problems.length) {
    console.log('✗ ' + total + ' 局里发现 ' + problems.length + ' 处问题（最多列前 20 条）：')
    problems.slice(0, 20).forEach(function (m) { console.log('   · ' + m) })
    process.exit(1)
  }
  console.log('✓ 全部通过：' + total + ' 局，耗时 ' + (Date.now() - t0) + 'ms')
}

main()
