/**
 * 儿童迷宫生成器校验脚本（2026-11-25 换成普通方格迷宫后重写）。用法：node tools/check-migong.js
 *
 * 套路照抄 check-mima.js：① 「只有一条路」在这里【独立另写一遍】——不用 core 的求解器，
 *    而是数「打通的墙」和「连通的格子」：n×n 格全连通且正好打通 n×n-1 堵墙 = 没有环 = 任意两格只有一条路；
 *    再用深度优先独立走一遍起→终，跟 core 给的路径逐格比对；
 * ② 脚本先跑「自检」——手工构造的 3×3 样例（一张完美迷宫、一张多拆一堵墙有环的），
 *    校验器判不对就 exit，明说"是校验器坏了"。
 */
'use strict'

require('../js/migong-core.js')
require('../js/store.js')
require('../js/migong-settings.js')
require('../js/render.js')
require('../js/migong-render.js')
var MG = globalThis.SumSum.migong
var MGR = globalThis.SumSum.migongRender

/* 关卡参数在这里【重新写一遍】，不从 migong-core 取——那边写错了这里才能发现 */
var LEVELS = {
  L1: { N: 8, minPath: 21, cell: 8.5, perPage: 2 },
  L2: { N: 12, minPath: 37, cell: 6.2, perPage: 2 },
  L3: { N: 16, minPath: 61, cell: 10, perPage: 1 },
  L4: { N: 20, minPath: 87, cell: 8, perPage: 1 }
}
var FIT_W = 178, FIT_H = 222 /* A4 纵向版心（mm） */

function fail(msg) {
  console.error('✗ ' + msg)
  process.exit(1)
}
function ok(msg) {
  console.log('✓ ' + msg)
}

/* 独立实现：墙的位 上 1 右 2 下 4 左 8；相邻两格的同一堵墙两边要一致 */
var D = [[-1, 0, 1, 4], [0, 1, 2, 8], [1, 0, 4, 1], [0, -1, 8, 2]]

/* 检查一张迷宫：墙两边一致、外圈封死、全连通、打通的墙正好 n*n-1 堵；返回 null 或错误说明 */
function perfectProblem(n, walls) {
  if (walls.length !== n * n) return '格子数不对'
  var opened = 0
  for (var r = 0; r < n; r++) {
    for (var c = 0; c < n; c++) {
      var w = walls[r * n + c]
      for (var k = 0; k < 4; k++) {
        var nr = r + D[k][0], nc = c + D[k][1]
        var open = !(w & D[k][2])
        if (nr < 0 || nr >= n || nc < 0 || nc >= n) {
          if (open) return '外圈有缺口 (' + r + ',' + c + ')'
          continue
        }
        var back = !(walls[nr * n + nc] & D[k][3])
        if (open !== back) return '墙两边不一致 (' + r + ',' + c + ')'
        if (open && k < 2) opened++ /* 只数上、右，每堵墙数一次 */
      }
    }
  }
  /* 连通：从 0 号格出发用栈走一遍 */
  var seen = {}, stack = [0], cnt = 0
  seen[0] = 1
  while (stack.length) {
    var cur = stack.pop()
    cnt++
    var cr = Math.floor(cur / n), cc = cur % n
    for (var j = 0; j < 4; j++) {
      if (walls[cur] & D[j][2]) continue
      var nx = (cr + D[j][0]) * n + (cc + D[j][1])
      if (!seen[nx]) { seen[nx] = 1; stack.push(nx) }
    }
  }
  if (cnt !== n * n) return '有走不到的格子（' + cnt + '/' + n * n + '）'
  if (opened !== n * n - 1) return '打通了 ' + opened + ' 堵墙，应为 ' + (n * n - 1) + '（多了就有环、不止一条路）'
  return null
}

/* 独立实现：深度优先找起→终的路（完美迷宫里这就是唯一的那条） */
function route(n, walls) {
  var prev = {}
  prev[0] = -1
  var stack = [0]
  while (stack.length) {
    var cur = stack.pop()
    var cr = Math.floor(cur / n), cc = cur % n
    for (var j = 0; j < 4; j++) {
      if (walls[cur] & D[j][2]) continue
      var nx = (cr + D[j][0]) * n + (cc + D[j][1])
      if (prev[nx] === undefined) { prev[nx] = cur; stack.push(nx) }
    }
  }
  var out = []
  for (var at = n * n - 1; at !== -1; at = prev[at]) {
    if (at === undefined) return null
    out.unshift(at)
  }
  return out
}

/* ---------- 校验器自检 ---------- */
/* 3×3 蛇形：第一行往右、第二行往左、第三行往右，竖着只在 (0,2)-(1,2)、(1,0)-(2,0) 打通 */
var snake = [
  15 & ~2 & ~0, 15 & ~2 & ~8, 15 & ~8 & ~4,
  15 & ~2 & ~4, 15 & ~2 & ~8, 15 & ~8 & ~1,
  15 & ~1 & ~2, 15 & ~2 & ~8, 15 & ~8
]
if (perfectProblem(3, snake) !== null) fail('校验器坏了：蛇形 3×3 应判为完美迷宫，得到「' + perfectProblem(3, snake) + '」')
if ((route(3, snake) || []).length !== 9) fail('校验器坏了：蛇形 3×3 的路应经过 9 格')
var loop = snake.slice()
loop[0] &= ~4; loop[3] &= ~1 /* 多拆 (0,0)-(1,0) 一堵，出环 */
if (perfectProblem(3, loop) === null) fail('校验器坏了：多拆一堵墙的 3×3 应判出有环')
var broken = snake.slice()
broken[0] &= ~1 /* 外圈开口 */
if (perfectProblem(3, broken) === null) fail('校验器坏了：外圈有缺口应判出来')
ok('校验器自检：完美 / 有环 / 外圈缺口三种样例都判对')

/* ---------- 批量生成验证 ---------- */
var PER_LEVEL = 150
var shortCount = 0
Object.keys(LEVELS).forEach(function (key) {
  var L = LEVELS[key]
  var lv = MG.levelOf(key)
  if (lv.N !== L.N || lv.minPath !== L.minPath || lv.cell !== L.cell || lv.perPage !== L.perPage) fail(key + ' 关卡参数与校验器常量不一致')
  var rnd = MG.makeRandom(20261125 + L.N)
  for (var i = 0; i < PER_LEVEL; i++) {
    var pz = MG.makeOne(key, rnd)
    if (!pz) fail(key + ' 第 ' + i + ' 张生成失败')
    if (pz.n !== L.N) fail(key + ' 尺寸不对')
    var bad = perfectProblem(L.N, pz.walls)
    if (bad) fail(key + ' 第 ' + i + ' 张不是完美迷宫：' + bad)
    var mine = route(L.N, pz.walls)
    if (!mine || mine.length !== pz.path.length) fail(key + ' 第 ' + i + ' 张 core 给的通路与独立求解不一致')
    for (var s = 0; s < mine.length; s++) {
      if (mine[s] !== pz.path[s][0] * L.N + pz.path[s][1]) fail(key + ' 第 ' + i + ' 张通路第 ' + s + ' 格不一致')
    }
    if (pz.path.length < L.minPath) shortCount++
  }
})
/* 太短的允许极少数兜底（makeOne 60 次都偏短时给最长那张），超过 1% 说明参数定错了 */
if (shortCount > PER_LEVEL * 4 * 0.01) fail('通路偏短的迷宫太多：' + shortCount + ' 张')
ok('四关各 ' + PER_LEVEL + ' 张：都是完美迷宫（全连通、无环、外圈封死），通路与独立求解逐格一致，偏短 ' + shortCount + ' 张')

/* 同种子同题；不同种子不同题 */
var a1 = MG.generate({ level: 'L2', count: 2, noDuplicates: true, seed: 99 })
var a2 = MG.generate({ level: 'L2', count: 2, noDuplicates: true, seed: 99 })
var a3 = MG.generate({ level: 'L2', count: 2, noDuplicates: true, seed: 100 })
if (a1.puzzles[0].key !== a2.puzzles[0].key) fail('同一个种子出了不同的迷宫')
if (a1.puzzles[0].key === a3.puzzles[0].key) fail('不同种子出了同一张迷宫')
ok('同一个种子出同一批，换种子换一批')

;['L1', 'L2', 'L3', 'L4'].forEach(function (key) {
  var res = MG.generate({ level: key, count: 8, noDuplicates: true, seed: 424242 })
  if (res.shortfall !== 0) fail('generate ' + key + ' shortfall=' + res.shortfall)
  var seen = {}
  res.puzzles.forEach(function (p) {
    if (seen[p.key]) fail('generate ' + key + ' 同一卷里出了重复的迷宫')
    seen[p.key] = 1
  })
})
ok('generate：四关各 8 张整批生成、不重复、无缺口')

/* ---------- 渲染 ---------- */
function count(html, re) {
  return (html.match(re) || []).length
}

var h1 = MGR.buildHTML({ level: 'L1', copies: 2, answerPage: false, title: 'T' },
  MG.generate({ level: 'L1', count: 4, seed: 11 }).puzzles)
if (count(h1, /class="sheet sheet-migong"/g) !== 4) fail('L1 4 张×2 份应 4 页')
if (count(h1, /第 1 份/g) !== 2) fail('L1 对战页脚份数不对')

var h3 = MGR.buildHTML({ level: 'L3', copies: 2, answerPage: true, title: 'T' },
  MG.generate({ level: 'L3', count: 2, seed: 33 }).puzzles)
if (count(h3, /class="sheet sheet-migong"/g) !== 4) fail('L3 2 张×2 份应 4 页（份在外）')
if (count(h3, /class="sheet sheet-migong-ans"/g) !== 1) fail('L3 答案页应 1 张')
if (count(h3, /class="migong-route"/g) !== 2) fail('答案页每张迷宫应有一条红线')
if (h3.indexOf('红线 = 唯一的通路') < 0) fail('答案页图例缺失')

/* 每张卷一行规则；题卷和答案页上每张迷宫各一个「起」一个「终」 */
;[[h1, 4 * 2, 4], [h3, 2 * 2 + 2, 4]].forEach(function (t, i) {
  var h = t[0]
  if (count(h, /拿笔沿着通道画线/g) !== t[2]) fail('卷 ' + i + ' 规则行数不对')
  if (count(h, />起</g) !== t[1] || count(h, />终</g) !== t[1]) fail('卷 ' + i + ' 起终个数不对，应各 ' + t[1])
})

/* 题卷上不能漏出答案：没有红线 */
if (count(h1, /migong-route/g) !== 0) fail('题卷上出现了答案红线')

/* 尺寸：每关迷宫（含上下写起终的空）放得进版心；一页两张的两张加起来也放得下 */
Object.keys(LEVELS).forEach(function (key) {
  var L = LEVELS[key]
  var w = (L.N + 0.2) * L.cell, h = (L.N + 1.5) * L.cell
  var card = h + 6 + 6 /* 卡片上下内边距 + 编号行，约数 */
  var need = L.perPage * card + (L.perPage - 1) * 6 + 8 /* 张间距 + 规则行 */
  if (w > FIT_W) fail(key + ' 迷宫宽 ' + w.toFixed(0) + 'mm 超出版心')
  if (need > FIT_H) fail(key + ' 一页 ' + L.perPage + ' 张要 ' + need.toFixed(0) + 'mm，超出版心 ' + FIT_H)
  if (L.cell < 6) fail(key + ' 通道只有 ' + L.cell + 'mm，孩子画不进去')
  var svg = MGR.mazeSVG(MG.makeOne(key, MG.makeRandom(5)), L.cell, false)
  if (svg.indexOf('width="' + w.toFixed(1) + 'mm"') < 0) fail(key + ' SVG 宽度与独立计算不一致')
})
if (MGR.MM.PER_PAGE.L1 !== LEVELS.L1.perPage || MGR.MM.PER_PAGE.L4 !== LEVELS.L4.perPage) fail('渲染层 PER_PAGE 与校验器常量不一致')
ok('渲染：页数口径（小迷宫同页双份 / 大迷宫整卷分份）、规则行、起终、答案红线、版心尺寸全对')

/* ---------- 设置 ---------- */
var SS = globalThis.SumSum.migongSettings
var cl = SS.sanitize({ level: 'L9', count: 99, copies: 5 })
if (cl.level !== 'L1' || cl.count !== 8 || cl.copies !== 2) fail('设置钳位不对：' + JSON.stringify(cl))
ok('设置：关卡越界回第 1 关，张数、份数钳位')

console.log('✓ 全部通过')
