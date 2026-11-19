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

  if (problems.length) process.exit(1)
}

main()
