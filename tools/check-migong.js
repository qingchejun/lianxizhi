/**
 * 算式迷宫生成器校验脚本。用法：node tools/check-migong.js
 *
 * 套路照抄 check-mima.js：① 唯一路线的计数在这里【独立另写一遍】（迭代 DFS，
 *    core 里是递归 DFS），两套互为对证；② 脚本先跑「自检」——手工构造的样例
 *    （同一张盘，带诱饵恰好 2 条路、去掉诱饵恰好 1 条）不通过就 exit，
 *    明说"是校验器坏了"。
 */
'use strict'

require('../js/migong-core.js')
require('../js/store.js')
require('../js/migong-settings.js')
require('../js/migong-render.js')
require('../js/render.js')
var MG = globalThis.SumSum.migong
var MGR = globalThis.SumSum.migongRender

/* 关卡参数在这里【重新写一遍】，不从 migong-core 取——那边写错了这里才能发现 */
var LEVELS = {
  L1: { N: 4, kind: 'add10', lenMin: 6, lenMax: 8, baitMin: 0, baitMax: 1, cell: 18, perPage: 2 },
  L2: { N: 5, kind: 'mix10', lenMin: 8, lenMax: 10, baitMin: 1, baitMax: 2, cell: 15, perPage: 2 },
  L3: { N: 6, kind: 'carry', lenMin: 10, lenMax: 12, baitMin: 2, baitMax: 3, cell: 24, perPage: 1 },
  L4: { N: 6, kind: 'mix20', lenMin: 12, lenMax: 15, baitMin: 3, baitMax: 4, cell: 24, perPage: 1 }
}

/* 独立实现：重算等式 */
function evalEq2(a, op, b) {
  return op === '+' ? a + b : a - b
}

/* 独立实现：数「起 → 终」全踩对的简单路径条数（迭代 DFS，每步带路径副本，
   与 core 的递归回溯写法不同）。数到 cap 条即停。 */
function countRoutes2(n, cells, cap) {
  var count = 0
  function walkable(r, c) {
    if ((r === 0 && c === 0) || (r === n - 1 && c === n - 1)) return true
    return !!cells[r][c] && cells[r][c].ok
  }
  var stack = [{ r: 0, c: 0, seen: { '0,0': 1 } }]
  while (stack.length) {
    var st = stack.pop()
    if (st.r === n - 1 && st.c === n - 1) {
      count++
      if (count >= cap) return count
      continue
    }
    var dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]]
    for (var i = 0; i < 4; i++) {
      var nr = st.r + dirs[i][0]
      var nc = st.c + dirs[i][1]
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue
      if (!walkable(nr, nc)) continue
      var k = nr + ',' + nc
      if (st.seen[k]) continue
      var seen2 = Object.assign({}, st.seen)
      seen2[k] = 1
      stack.push({ r: nr, c: nc, seen: seen2 })
    }
  }
  return count
}

/* ---------- 校验器自检：手工样例，先确认校验器本身是对的 ---------- */

/*
 * 样例（4×4，路径 (0,0)→(0,1)→(1,1)→(1,2)→(2,2)→(2,3)→(3,3)，步数 6）：
 *   起  1+1=2✓  2+2=5✗  3+1=5✗
 *   1+2=3✓* 2+3=5✓  4+2=6✓  6+3=8✗     * = 诱饵 (1,0)
 *   1+3=6✗  5+4=8✗  3+3=6✓  5+2=7✓
 *   2+1=4✗  4+4=9✗  3+2=6✗  终
 * 带诱饵：起→(0,1)→… 与 起→(1,0)→… 两条路（诱饵与起点和 (1,1) 都相邻）；
 * 把诱饵改错后恰好 1 条。所有错误等式的差值都在 {1,2} 内。
 */
function eq(a, op, b, r, ok) {
  return { a: a, op: op, b: b, r: r, ok: ok }
}

function fixture(withBait) {
  var row = function () { return [].slice.call(arguments) }
  return [
    row(null, eq(1, '+', 1, 2, true), eq(2, '+', 2, 5, false), eq(3, '+', 1, 5, false)),
    row(withBait ? eq(1, '+', 2, 3, true) : eq(1, '+', 2, 4, false), eq(2, '+', 3, 5, true), eq(4, '+', 2, 6, true), eq(6, '+', 3, 8, false)),
    row(eq(1, '+', 3, 6, false), eq(5, '+', 4, 8, false), eq(3, '+', 3, 6, true), eq(5, '+', 2, 7, true)),
    row(eq(2, '+', 1, 4, false), eq(4, '+', 4, 9, false), eq(3, '+', 2, 6, false), null)
  ]
}

;(function selfTest() {
  var a = countRoutes2(4, fixture(true), 9)
  var b = countRoutes2(4, fixture(false), 9)
  if (a !== 2) fail('自检失败：带诱饵应 2 条路，数出 ' + a + '——校验器坏了')
  if (b !== 1) fail('自检失败：去掉诱饵应 1 条路，数出 ' + b + '——校验器坏了')
  /* core 的递归版与独立迭代版在同一张盘上必须同数 */
  if (MG.countRoutes(4, fixture(true), 9) !== 2) fail('自检失败：core countRoutes 与手工结论不符')
  if (MG.countRoutes(4, fixture(false), 9) !== 1) fail('自检失败：core countRoutes 与手工结论不符')
  console.log('✓ 自检：手工样例两条/一条路，两套计数器一致')
})()

function fail(msg) {
  console.error('✗ ' + msg)
  process.exit(1)
}
function ok(msg) {
  console.log('✓ ' + msg)
}

/* ---------- 范围检查：等式是否符合关卡口径 ---------- */

function inRange(cell, kind) {
  var a = cell.a, b = cell.b, op = cell.op
  if (kind === 'add10') return op === '+' && a >= 1 && a <= 9 && b >= 1 && a + b <= 10
  if (kind === 'mix10') {
    if (op === '+') return a >= 1 && a <= 9 && b >= 1 && a + b <= 10
    return a >= 1 && a <= 10 && b >= 1 && b <= a
  }
  if (kind === 'carry') return op === '+' && a >= 2 && a <= 9 && b >= 2 && a + b >= 11
  /* mix20 */
  if (op === '+') return a >= 2 && a <= 9 && b >= 2 && a + b >= 11
  return a >= 11 && a <= 18 && b >= 2 && b <= 9 && a % 10 < b
}

/* ---------- 批量生成验证 ---------- */

var PER_LEVEL = 300
var stats = {}

Object.keys(LEVELS).forEach(function (lk, li) {
  var lv = LEVELS[lk]
  var made = 0
  var tries = 0
  /* 整批一条流连出——与网站 generate() 的真实用法一致。mulberry32 的加法状态
     有个暗伤：两个相差 k*0x6d2b79f5 (mod 2^32) 的种子产出同一条流平移 k 步的
     序列，按算术序列换种子喂 makeOne 会撞出整盘相同的迷宫（2026-11-20 撞过
     两次，消耗数之差恰等于平移量，机制已证实）。一条流内部没有跨种子平移，
     撞 key 才意味着生成器真有周期性 bug */
  var rnd = MG.makeRandom(20261120 + li)
  var keysSeen = {}
  var maxTries = PER_LEVEL * 10
  while (made < PER_LEVEL && tries < maxTries) {
    tries++
    var pz = MG.makeOne(lk, rnd)
    if (!pz) continue
    made++

    if (pz.n !== lv.N) fail(lk + ' 网格尺寸 ' + pz.n + ' ≠ ' + lv.N)

    /* ① 唯一路线（独立计数器） */
    if (countRoutes2(pz.n, pz.cells, 2) !== 1) fail(lk + ' 第 ' + made + ' 张不是唯一路线')

    /* ② 路径合法：相邻步、含起终、不自交 */
    var steps = pz.path.length - 1
    if (pz.path[0][0] !== 0 || pz.path[0][1] !== 0) fail(lk + ' 路径不从起点出发')
    var last = pz.path[pz.path.length - 1]
    if (last[0] !== pz.n - 1 || last[1] !== pz.n - 1) fail(lk + ' 路径不到终点')
    if (steps < lv.lenMin || steps > lv.lenMax) fail(lk + ' 路径步数 ' + steps + ' 出界')
    var pathSeen = {}
    for (var pi = 0; pi < pz.path.length; pi++) {
      var pk = pz.path[pi].join(',')
      if (pathSeen[pk]) fail(lk + ' 路径自交')
      pathSeen[pk] = 1
      if (pi) {
        var dr = Math.abs(pz.path[pi][0] - pz.path[pi - 1][0])
        var dc = Math.abs(pz.path[pi][1] - pz.path[pi - 1][1])
        if (dr + dc !== 1) fail(lk + ' 路径第 ' + pi + ' 步不相邻')
      }
    }

    /* ③ 诱饵：非路径、与路径相邻、数量在区间 */
    if (pz.baits.length < lv.baitMin || pz.baits.length > lv.baitMax) {
      fail(lk + ' 诱饵数 ' + pz.baits.length + ' 出界')
    }
    pz.baits.forEach(function (bp) {
      if (pathSeen[bp.join(',')]) fail(lk + ' 诱饵落在主路径上')
      var adj = [[0, 1], [1, 0], [0, -1], [-1, 0]].some(function (d) {
        return pathSeen[(bp[0] + d[0]) + ',' + (bp[1] + d[1])]
      })
      if (!adj) fail(lk + ' 诱饵不贴主路径')
    })

    /* ④ 逐格：范围、对错、位置归属；错误差值 ∈ {1,2}；去重规则 */
    var correctOps = {}
    var n = pz.n
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if ((r === 0 && c === 0) || (r === n - 1 && c === n - 1)) {
          if (pz.cells[r][c] !== null) fail(lk + ' 起/终格应有等式位为 null')
          continue
        }
        var cell = pz.cells[r][c]
        if (!cell) fail(lk + ' 普通格为空')
        if (!inRange(cell, lv.kind)) fail(lk + ' 等式 ' + cell.a + cell.op + cell.b + '=' + cell.r + ' 超出 ' + lv.kind + ' 范围')
        var truth = evalEq2(cell.a, cell.op, cell.b) === cell.r
        if (truth !== cell.ok) fail(lk + ' ok 标记与实算不符：' + cell.a + cell.op + cell.b + '=' + cell.r)
        var onPath = !!pathSeen[r + ',' + c]
        var isBait = pz.baits.some(function (bp) { return bp[0] === r && bp[1] === c })
        if (cell.ok && !onPath && !isBait) fail(lk + ' 正确格既不在路径也不是诱饵 @' + r + ',' + c)
        if (!cell.ok && (onPath || isBait)) fail(lk + ' 路径/诱饵格放的是错误等式 @' + r + ',' + c)
        if (!cell.ok) {
          var diff = Math.abs(cell.r - evalEq2(cell.a, cell.op, cell.b))
          if (diff !== 1 && diff !== 2) fail(lk + ' 错误答案差值 ' + diff + ' 不像真实错误')
          if (cell.r < 0 || cell.r > 20) fail(lk + ' 错误答案 ' + cell.r + ' 越界')
        } else {
          var opk = cell.a + cell.op + cell.b
          if (correctOps[opk]) fail(lk + ' 正确算式同盘重复：' + opk)
          correctOps[opk] = 1
        }
      }
    }

    /* ⑤ 错误算式不得与正确算式同算式（一正一错会把判断变比对） */
    for (var r2 = 0; r2 < n; r2++) {
      for (var c2 = 0; c2 < n; c2++) {
        var cc = pz.cells[r2][c2]
        if (cc && !cc.ok && correctOps[cc.a + cc.op + cc.b]) {
          fail(lk + ' 错误格算式与正确格相同：' + cc.a + cc.op + cc.b)
        }
      }
    }

    if (keysSeen[pz.key]) fail(lk + ' 同一条流里出现重复 key')
    keysSeen[pz.key] = 1
  }
  if (made < PER_LEVEL) fail(lk + ' 生成不足：' + made + '/' + PER_LEVEL)
  stats[lk] = { made: made, tries: tries }
})

ok('生成：四关各 ' + PER_LEVEL + ' 张全部通过（唯一路线 / 范围 / 归属 / 差值 / 去重），成功率 ' +
  Object.keys(stats).map(function (k) { return k + ' ' + stats[k].tries + ' 次/' + stats[k].made + ' 张' }).join('，'))

/* generate() 整批口径：去重、shortfall */
;[1, 2, 3, 4].forEach(function (lk) {
  var key = 'L' + lk
  var res = MG.generate({ level: key, count: 8, copies: 1, noDuplicates: true, seed: 424242 + lk })
  if (res.shortfall !== 0) fail('generate ' + key + ' shortfall=' + res.shortfall)
  var seen = {}
  res.puzzles.forEach(function (p) {
    if (seen[p.key]) fail('generate ' + key + ' 去重失效')
    seen[p.key] = 1
  })
})
ok('generate：四关各 8 张整批生成、去重有效、无缺口')

/* ---------- 渲染粗验 ---------- */

/* 卷面页数口径：L1/L2 每页 2 张 ×2 份；L3/L4 每页 1 张 ×2 份（份在外） */
function sheetCount(html) {
  return (html.match(/class="sheet sheet-migong"/g) || []).length
}
function ansSheetCount(html) {
  return (html.match(/class="sheet sheet-migong-ans"/g) || []).length
}

var h1 = MGR.buildHTML(
  { level: 'L1', copies: 2, answerPage: false, title: 'T' },
  MG.generate({ level: 'L1', count: 4, copies: 1, seed: 11 }).puzzles
)
if (sheetCount(h1) !== 4) fail('L1 4 张×2 份应 4 页，得到 ' + sheetCount(h1))
if ((h1.match(/第 1 份/g) || []).length !== 2) fail('L1 对战页脚份数不对')

var h3 = MGR.buildHTML(
  { level: 'L3', copies: 2, answerPage: true, title: 'T' },
  MG.generate({ level: 'L3', count: 2, copies: 1, seed: 33 }).puzzles
)
if (sheetCount(h3) !== 4) fail('L3 2 张×2 份应 4 页（份在外），得到 ' + sheetCount(h3))
if (ansSheetCount(h3) !== 1) fail('L3 答案页应 1 张，得到 ' + ansSheetCount(h3))
if (h3.indexOf('深色 = 唯一的正确路线') < 0) fail('答案页图例缺失')

/* 每张卷都有规则行；每张迷宫恰好一个「起」一个「终」——题卷上起终数 =
   张数×份数（L1 一页排 2 张，一页就有两个起终，不等于页数），答案页每张
   迷宫再各印一个。口径 2026-11-20 修正：原版拿页数当期望，一页 2 张的
   关卡必挂——此前每次跑都在更早的重复 key 处退出，这条从没真正执行过 */
;[[h1, 4 * 2], [h3, 2 * 2 + 2]].forEach(function (hc, i) {
  var h = hc[0]
  var expect = hc[1]
  var sheets = h.split('class="sheet sheet-migong"').length - 1
  var rules = (h.match(/算式对的格子才能走/g) || []).length
  var starts = (h.match(/>起</g) || []).length
  var ends = (h.match(/>终</g) || []).length
  if (rules !== sheets) fail('卷 ' + i + ' 规则行数 ' + rules + ' ≠ 页数 ' + sheets)
  if (starts !== expect || ends !== expect) {
    fail('卷 ' + i + ' 起终字数 ' + starts + '/' + ends + '，应各 ' + expect)
  }
})

/* 渲染 MM 与独立常量对证（cell / 每页张数） */
if (MGR.MM.PER_PAGE.L1 !== LEVELS.L1.perPage || MGR.MM.PER_PAGE.L4 !== LEVELS.L4.perPage) {
  fail('渲染层 PER_PAGE 与校验器常量不一致')
}
var coreLv = MG.levelOf('L3')
if (coreLv.cell !== LEVELS.L3.cell) fail('core cell 与校验器常量不一致')

ok('渲染：页数口径（小迷宫同页双份 / 大迷宫整卷分份）、规则行、起终、答案图例全对')

console.log('✓ 全部通过')
