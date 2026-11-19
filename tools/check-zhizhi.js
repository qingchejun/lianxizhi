#!/usr/bin/env node
/*
 * 数织校验器。规矩与 check-mima 相同：
 *   1. 自带一套独立第二实现（clues2 / placements2 / solve2 / flood2），
 *      自检失败 exit(2) —— 校验器自己都错，就先别动生成器。
 *   2. 图库全量过生成门（唯一解、连通、比例），生成抽样复核。
 *   3. 用法：node tools/check-zhizhi.js（在仓库任意目录均可）。
 */
'use strict'

var path = require('path')

function load(rel) {
  require(path.join(__dirname, '..', rel))
}

/* ================= 独立第二实现（与 js/zhizhi-core.js 无共享代码） ================= */

/* 点阵字符行 -> 01 矩阵 */
function bits2(rows) {
  return rows.map(function (r) {
    return r.split('').map(function (c) { return c === 'X' ? 1 : 0 })
  })
}

/* 点阵 -> { rows: 行线索数组, cols: 列线索数组 }；空行/列 -> [0] */
function clues2(rows) {
  var g = bits2(rows)
  var R = []
  var C = []
  var i, j, run, seg
  for (i = 0; i < g.length; i++) {
    seg = []; run = 0
    for (j = 0; j <= g[i].length; j++) {
      if (j < g[i].length && g[i][j] === 1) { run++ }
      else if (run) { seg.push(run); run = 0 }
    }
    R.push(seg.length ? seg : [0])
  }
  for (j = 0; j < g[0].length; j++) {
    seg = []; run = 0
    for (i = 0; i <= g.length; i++) {
      if (i < g.length && g[i][j] === 1) { run++ }
      else if (run) { seg.push(run); run = 0 }
    }
    C.push(seg.length ? seg : [0])
  }
  return { rows: R, cols: C }
}

/* 单行（长 n、线索 clue）与已知 known(-1/0/1) 相容的全部放置 */
function placements2(n, clue, known) {
  var out = []
  var i
  if (clue.length === 1 && clue[0] === 0) {
    var blank = []
    for (i = 0; i < n; i++) blank.push(0)
    for (i = 0; i < n; i++) if (known[i] === 1) return []
    return [blank]
  }
  function build(starts) {
    var line = []
    var cur = 0
    for (var k = 0; k < clue.length; k++) {
      while (cur < starts[k]) { line.push(0); cur++ }
      for (var t = 0; t < clue[k]; t++) { line.push(1); cur++ }
      if (k < clue.length - 1) { line.push(0); cur++ }
    }
    while (cur < n) { line.push(0); cur++ }
    return line
  }
  function fits(line) {
    for (var i2 = 0; i2 < n; i2++) {
      if (known[i2] === 1 && line[i2] !== 1) return false
      if (known[i2] === 0 && line[i2] !== 0) return false
    }
    return true
  }
  function rec(k, minStart, starts) {
    if (k === clue.length) {
      var line = build(starts)
      if (fits(line)) out.push(line)
      return
    }
    var tail = 0
    for (var t = k; t < clue.length; t++) tail += clue[t]
    tail += clue.length - 1 - k
    for (var s = minStart; s <= n - tail; s++) rec(k + 1, s + clue[k] + 1, starts.concat(s))
  }
  rec(0, 0, [])
  return out
}

/* 一组放置的公共确定格（不一致记 -1） */
function merge2(lists, n) {
  var out = []
  for (var i = 0; i < n; i++) {
    var v = lists[0][i]
    for (var k = 1; k < lists.length; k++) {
      if (lists[k][i] !== v) { v = -1; break }
    }
    out.push(v)
  }
  return out
}

/* 行/列传播到不动点。solved=真 ⟹ 唯一解且只用「单行必然推理」（不用猜）。 */
function solve2(N, rowClues, colClues) {
  var rowKnown = []
  var colKnown = []
  var i, j
  for (i = 0; i < N; i++) {
    var rk = [], ck = []
    for (j = 0; j < N; j++) { rk.push(-1); ck.push(-1) }
    rowKnown.push(rk); colKnown.push(ck)
  }
  function progressFrom(lists, known) {
    var m = merge2(lists, N)
    var changed = false
    for (var a = 0; a < N; a++) {
      if (m[a] !== -1 && known[a] === -1) {
        known[a] = m[a]
        changed = true
      }
    }
    return changed
  }
  var progress = true
  while (progress) {
    progress = false
    for (var r = 0; r < N; r++) {
      var ps = placements2(N, rowClues[r], rowKnown[r])
      if (!ps.length) return { solved: false, rows: null }
      if (progressFrom(ps, rowKnown[r])) progress = true
    }
    /* 行推出后同步进列 */
    for (var r2 = 0; r2 < N; r2++) {
      for (var c2 = 0; c2 < N; c2++) {
        if (rowKnown[r2][c2] !== -1 && colKnown[c2][r2] === -1) colKnown[c2][r2] = rowKnown[r2][c2]
      }
    }
    for (var c = 0; c < N; c++) {
      var ps2 = placements2(N, colClues[c], colKnown[c])
      if (!ps2.length) return { solved: false, rows: null }
      if (progressFrom(ps2, colKnown[c])) progress = true
    }
    for (var r3 = 0; r3 < N; r3++) {
      for (var c3 = 0; c3 < N; c3++) {
        if (colKnown[c3][r3] !== -1 && rowKnown[r3][c3] === -1) rowKnown[r3][c3] = colKnown[c3][r3]
      }
    }
  }
  for (var a = 0; a < N; a++) {
    for (var b = 0; b < N; b++) {
      if (rowKnown[a][b] === -1) return { solved: false, rows: null }
    }
  }
  return { solved: true, rows: rowKnown }
}

/* 黑格 4-连通块计数 */
function flood2(rows) {
  var g = bits2(rows)
  var n = g.length
  var seen = []
  var i, j
  for (i = 0; i < n; i++) {
    var row = []
    for (j = 0; j < n; j++) row.push(false)
    seen.push(row)
  }
  var blocks = 0
  for (i = 0; i < n; i++) {
    for (j = 0; j < n; j++) {
      if (g[i][j] === 1 && !seen[i][j]) {
        blocks++
        var stack = [[i, j]]
        seen[i][j] = true
        while (stack.length) {
          var top = stack.pop()
          var di = [-1, 1, 0, 0]
          var dj = [0, 0, -1, 1]
          for (var d = 0; d < 4; d++) {
            var ni = top[0] + di[d]
            var nj = top[1] + dj[d]
            if (ni >= 0 && ni < n && nj >= 0 && nj < n && g[ni][nj] === 1 && !seen[ni][nj]) {
              seen[ni][nj] = true
              stack.push([ni, nj])
            }
          }
        }
      }
    }
  }
  return blocks
}

/* ================= 自检（手工样例） ================= */

function selfTest() {
  var problems = []
  function eq(actual, expected, msg) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      problems.push(msg + '：得到 ' + JSON.stringify(actual) + '，期望 ' + JSON.stringify(expected))
    }
  }

  /* T 字形 5×5：满行 [5] + 满列交叉，line-solver 必可解 */
  var T = [
    'XXXXX',
    '..X..',
    '..X..',
    '..X..',
    '.....'
  ]
  var tc = clues2(T)
  eq(tc.rows, [[5], [1], [1], [1], [0]], 'T 行线索')
  eq(tc.cols, [[1], [1], [4], [1], [1]], 'T 列线索')

  var ts = solve2(5, tc.rows, tc.cols)
  if (!ts.solved) problems.push('T 应可解')
  else eq(ts.rows, bits2(T), 'T 解 == 原图')

  /* L 字形：镜像后行线索不变、列线索倒序 */
  var L = [
    'X....',
    'X....',
    'X....',
    'X....',
    'XXXX.'
  ]
  var Lm = L.map(function (r) { return r.split('').reverse().join('') })
  var lc = clues2(L)
  var lmc = clues2(Lm)
  eq(lmc.rows, lc.rows, '镜像行线索不变')
  eq(lmc.cols, lc.cols.slice().reverse(), '镜像列线索倒序')

  /* 2×2 棋盘：双对角二解，line-solver 必须推不出（多解拦截的试金石） */
  var chess = ['X.', '.X']
  var cc = clues2(chess)
  eq(cc.rows, [[1], [1]], '棋盘行线索')
  eq(cc.cols, [[1], [1]], '棋盘列线索')
  if (solve2(2, cc.rows, cc.cols).solved) problems.push('2×2 棋盘二解应被拦下')

  /* 连通块 */
  eq(flood2(T), 1, 'T 连通 1 块')
  eq(flood2(['X..X', '....', '..X.', '....']), 3, '孤点 3 块')

  /* 放置枚举：5 格 [2,1]，slack=1 -> C(3,2)=3 种 */
  var ps = placements2(5, [2, 1], [-1, -1, -1, -1, -1])
  eq(ps.length, 3, '[2,1] 在 5 格有 3 种放置')
  /* known[0]=黑 -> 排除 .XX.X，剩 XX.X. / XX..X 两种 */
  var ps2 = placements2(5, [2, 1], [1, -1, -1, -1, -1])
  eq(ps2.length, 2, '已知首位黑 -> 2 种')
  eq(ps2[0], [1, 1, 0, 1, 0], '其一为 XX.X.')
  eq(ps2[1], [1, 1, 0, 0, 1], '其二为 XX..X')
  /* 满行 */
  eq(placements2(5, [5], [-1, -1, -1, -1, -1]).length, 1, '[5] 满行 1 种')
  /* 全空与已知冲突 */
  eq(placements2(5, [0], [1, -1, -1, -1, -1]).length, 0, '全空行遇已知黑 -> 矛盾')

  return problems
}

/* ================= main ================= */

function main() {
  var self = selfTest()
  if (self.length) {
    console.error('自检失败（' + self.length + ' 条），先别动生成器：')
    self.forEach(function (p) { console.error('  ✗ ' + p) })
    process.exit(2)
  }
  console.log('✓ 自检通过：clues2 / placements2 / solve2 / flood2（手工样例）')

  /* ---------- 图库全量（第二实现复核生成门） ---------- */

  load('js/zhizhi-art.js')
  load('js/zhizhi-core.js')
  var Z = globalThis.SumSum.zhizhi
  var ARTS = globalThis.SumSum.zhizhiArt.ARTS

  var artProblems = []
  var seenName = {}
  var seenDot = {}
  var bySize = {}
  ARTS.forEach(function (a) {
    bySize[a.size] = (bySize[a.size] || 0) + 1
    var tag = a.size + '×' + a.size + ' ' + a.name
    if (!a.name || typeof a.name !== 'string') { artProblems.push('缺名字：' + JSON.stringify(a)); return }
    if (!Array.isArray(a.rows) || a.rows.length !== a.size) { artProblems.push(tag + '：行数不等于尺寸'); return }
    for (var i = 0; i < a.rows.length; i++) {
      if (a.rows[i].length !== a.size) { artProblems.push(tag + '：第 ' + (i + 1) + ' 行宽度不是 ' + a.size); return }
      if (!/^[X.]+$/.test(a.rows[i])) { artProblems.push(tag + '：含 X 和 . 之外的字符'); return }
    }
    var nk = a.size + '|' + a.name
    if (seenName[nk]) artProblems.push(tag + '：同尺寸重名')
    seenName[nk] = true
    var dk = a.size + '|' + a.rows.join('')
    if (seenDot[dk]) artProblems.push(tag + '：同尺寸点阵重复')
    seenDot[dk] = true
    var blacks = a.rows.join('').split('X').length - 1
    var ratio = blacks / (a.size * a.size)
    if (ratio < 0.35 || ratio > 0.6) artProblems.push(tag + '：黑格比例 ' + Math.round(ratio * 100) + '% 出界（35~60）')
    if (flood2(a.rows) !== 1) artProblems.push(tag + '：黑格不连通')
    var cl = clues2(a.rows)
    var sol = solve2(a.size, cl.rows, cl.cols)
    if (!sol.solved) artProblems.push(tag + '：line-solver 解不动（需要猜）')
    else if (JSON.stringify(sol.rows) !== JSON.stringify(bits2(a.rows))) artProblems.push(tag + '：唯一解 != 原图')
  })
  Z.LEVEL_ORDER.forEach(function (k) {
    var N = Z.LEVELS[k].N
    if (!bySize[N]) artProblems.push(k + '（' + N + '×' + N + '）图库是空的')
  })
  if (artProblems.length) {
    console.error('图库有 ' + artProblems.length + ' 处问题：')
    artProblems.forEach(function (p) { console.error('  ✗ ' + p) })
    process.exit(1)
  }
  console.log('✓ 图库全量：' + ARTS.length + ' 幅过生成门（唯一解 / 连通 / 比例 / 重名去重，第二实现复核）')

  /* ---------- 生成抽样（每关 50 个种子） ---------- */

  var genProblems = []
  var ROUNDS = 50
  Z.LEVEL_ORDER.forEach(function (lv) {
    var N = Z.LEVELS[lv].N
    for (var s = 1; s <= ROUNDS; s++) {
      var conf = { level: lv, count: 4, copies: 2, noDuplicates: true, seed: s * 7919, title: '' }
      var r1 = Z.generate(conf)
      var r2 = Z.generate(conf)
      if (JSON.stringify(r1) !== JSON.stringify(r2)) { genProblems.push(lv + ' 种子 ' + conf.seed + '：两次生成不一致（不可复现）'); continue }
      if (r1.shortfall !== 0) { genProblems.push(lv + ' 种子 ' + conf.seed + '：题不够（shortfall=' + r1.shortfall + '）'); continue }
      var names = {}
      for (var p = 0; p < r1.puzzles.length; p++) {
        var pz = r1.puzzles[p]
        if (pz.level !== lv) genProblems.push(lv + ' 种子 ' + conf.seed + '：题卡 level 写错')
        if (pz.key !== lv + '|' + pz.art.name + '|' + N) genProblems.push(lv + '：key 格式错 -> ' + pz.key)
        if (names[pz.art.name]) genProblems.push(lv + ' 种子 ' + conf.seed + '：图案重复 ' + pz.art.name)
        names[pz.art.name] = true
        var cl2 = clues2(pz.art.rows)
        if (JSON.stringify(pz.rowClues) !== JSON.stringify(cl2.rows)) genProblems.push(lv + ' ' + pz.art.name + '：rowClues 与第二实现不一致')
        if (JSON.stringify(pz.colClues) !== JSON.stringify(cl2.cols)) genProblems.push(lv + ' ' + pz.art.name + '：colClues 与第二实现不一致')
        if (!solve2(N, pz.rowClues, pz.colClues).solved) genProblems.push(lv + ' ' + pz.art.name + '：第二实现解不动题卡线索')
        if (!pz.hints.length) genProblems.push(lv + ' ' + pz.art.name + '：起步提示为空')
        else if (pz.hints[pz.hints.length - 1] !== '涂完就是「' + pz.art.name + '」！') genProblems.push(lv + ' ' + pz.art.name + '：提示尾句不是揭晓语')
      }
    }
  })

  /* L1 图库最小（14 幅）：要 20 题时应给全库并如实报缺，而不是死循环或重复 */
  var sf = Z.generate({ level: 'L1', count: 20, copies: 1, noDuplicates: true, seed: 1, title: '' })
  if (sf.puzzles.length !== bySize[5] || sf.shortfall !== 20 - bySize[5]) {
    genProblems.push('L1 shortfall：拿到 ' + sf.puzzles.length + ' 幅、报缺 ' + sf.shortfall + '，期望 ' + bySize[5] + ' 幅、报缺 ' + (20 - bySize[5]))
  }

  if (genProblems.length) {
    console.error('生成抽样有 ' + genProblems.length + ' 处问题：')
    genProblems.forEach(function (p) { console.error('  ✗ ' + p) })
    process.exit(1)
  }
  console.log('✓ 生成抽样：每关 ' + ROUNDS + ' 个种子，可复现 / 无重复 / 线索一致 / 提示齐全 / shortfall 如实')

  /* ---------- 设置（越界/畸形值必须钳住，不透传给生成器） ---------- */

  load('js/store.js') // 写入收口：zhizhi-settings 的 save 走它（node 下无害）
  load('js/zhizhi-settings.js')
  var ST = globalThis.SumSum.zhizhiSettings
  var stProblems = []
  if (ST.sanitize({ level: 'L9' }).level !== 'L1') stProblems.push('level=L9 没回退到 L1')
  if (ST.sanitize({ level: 'l1' }).level !== 'L1') stProblems.push('level=l1 应回退 L1')
  if (ST.sanitize({ count: 0 }).count !== 1) stProblems.push('count=0 没钳到 1')
  if (ST.sanitize({ count: 99 }).count !== 8) stProblems.push('count=99 没钳到 8')
  if (ST.sanitize({ count: 'abc' }).count !== 4) stProblems.push('count=abc 没回退默认 4')
  if (ST.sanitize({ count: '' }).count !== 4) stProblems.push("count='' 被当成 0（应回退默认）")
  if (ST.sanitize({ copies: 5 }).copies !== 2) stProblems.push('copies=5 没钳到 2')
  if (ST.sanitize({ copies: '1' }).copies !== 1) stProblems.push("copies='1' 没按数字处理")
  if (ST.sanitize({ noDuplicates: 'false' }).noDuplicates !== false) stProblems.push("noDuplicates='false' 没转成布尔假")
  if (ST.sanitize({ answerPage: '1' }).answerPage !== true) stProblems.push("answerPage='1' 没转成布尔真")
  if (ST.sanitize({ title: 'x'.repeat(50) }).title.length > 30) stProblems.push('title 没截到 30 字')
  if (ST.sanitize({ seed: -5 }).seed !== 0) stProblems.push('seed=-5 没钳到 0')
  var d = ST.DEFAULTS
  if (d.level !== 'L1' || d.count !== 4 || d.copies !== 2 || d.noDuplicates !== true || d.answerPage !== false) {
    stProblems.push('DEFAULTS 与规格不符：' + JSON.stringify(d))
  }
  if (stProblems.length) {
    stProblems.forEach(function (p) { console.error('  ✗ ' + p) })
    process.exit(1)
  }
  console.log('✓ 设置：钳位 / 回退 / 默认值与规格一致')

  /* ---------- 渲染字符串（buildHTML 在 node 里可直接跑） ---------- */

  load('js/render.js') // 只为 zhizhi-render 的 P().esc 等零件；加载期不碰 DOM
  load('js/zhizhi-render.js')
  var R = globalThis.SumSum.zhizhiRender
  var rProblems = []

  function genPuzzles(levelKey, seed, count) {
    return Z.generate({
      level: levelKey, count: count || 2, copies: 1,
      noDuplicates: false, seed: seed, title: ''
    }).puzzles
  }

  /* 每页容量钳位 */
  if (R.perPageOf({ level: 'L1' }, 1) !== 1) rProblems.push('L1 只出 1 题时应按 1 题排')
  if (R.perPageOf({ level: 'L3' }, 9) !== 2) rProblems.push('L3 每页应固定 2 题')
  if (R.perPageOf({ level: 'L4' }, 9) !== 1) rProblems.push('L4 每页应固定 1 题')
  if (R.perPageOf({ level: 'L2' }, 0) !== 1) rProblems.push('count=0 时每页按 1 题兜底')

  /* 题卷：图例在、答案不在、图案名不许泄露（名字就是谜底） */
  var p1 = genPuzzles('L1', 11)
  var h1 = R.buildHTML({ level: 'L1', copies: 1, answerPage: false, title: '' }, p1)
  if (h1.indexOf('0 = 全空') < 0) rProblems.push('题卷页顶没有读题图例')
  if (h1.indexOf('sheet-zhizhi-ans') >= 0) rProblems.push('没勾答案页却印了答案')
  if (h1.indexOf('zhizhi-hints') >= 0) rProblems.push('题卷不该有起步提示')
  if (h1.indexOf(p1[0].art.name) >= 0) rProblems.push('题卷泄露了图案名 ' + p1[0].art.name)

  /* 全空行的线索必须印成 0（拿手绘小山做样例，它最后一行全空） */
  var xshan = null
  ARTS.forEach(function (a) { if (a.size === 5 && a.name === '小山') xshan = a })
  if (!xshan) {
    rProblems.push('图库里找不到手绘小山（0 线索样例）')
  } else {
    var clX = Z.cluesOf(xshan.rows)
    var pX = {
      level: 'L1', art: xshan, rowClues: clX.rows, colClues: clX.cols,
      hints: Z.hints(xshan, Z.solve(5, clX.rows, clX.cols).trace), key: 'L1|小山|5'
    }
    var hx = R.buildHTML({ level: 'L1', copies: 1, answerPage: false, title: '' }, [pX])
    if (hx.indexOf('zhizhi-rowclue">0<') < 0) rProblems.push('全空行的行线索没印成 0')
    if (hx.indexOf('小山') >= 0) rProblems.push('题卷泄露了图案名 小山')
  }

  /* 对战双份 + 答案页：4 题 L1 = 2 页 × 2 份题卷 + 1 张 2×2 答案页 */
  var p2 = genPuzzles('L1', 12, 4)
  var h2 = R.buildHTML({ level: 'L1', copies: 2, answerPage: true, title: '' }, p2)
  var sheetN = (h2.match(/sheet sheet-zhizhi zhizhi-l1"/g) || []).length
  var ansN = (h2.match(/sheet sheet-zhizhi-ans"/g) || []).length
  if (sheetN !== 4) rProblems.push('copies=2 时题卷应为 4 张（2 页×2 份），实际 ' + sheetN)
  if (ansN !== 1) rProblems.push('copies=2 时答案页应仍为 1 张，实际 ' + ansN)
  if ((h2.match(/zhizhi-ans-item/g) || []).length !== 4) rProblems.push('答案页应有 4 个题位')
  if (h2.indexOf(p2[0].art.name) < 0) rProblems.push('答案页没有图案名')
  if (h2.indexOf('zhizhi-hints') < 0) rProblems.push('答案页没有起步提示')
  if (h2.indexOf('zhizhi-ans-on') < 0) rProblems.push('答案页完成图没有黑格')

  /* 8 题答案页翻页：2×2 一张，第 5 题起第二张 */
  var h3 = R.buildHTML({ level: 'L1', copies: 1, answerPage: true, title: '' }, genPuzzles('L1', 13, 8))
  var ans3 = (h3.match(/sheet sheet-zhizhi-ans"/g) || []).length
  if (ans3 !== 2) rProblems.push('8 题的答案页应为 2 张，实际 ' + ans3)

  if (rProblems.length) {
    rProblems.forEach(function (p) { console.error('  ✗ ' + p) })
    process.exit(1)
  }
  console.log('✓ 渲染：图例 / 0 线索 / 不泄题名 / 双份与答案页分页')

  /* ---------- 排版：独立常量对证（不共用渲染层的 MM） ---------- */

  var lProblems = []
  var LV2 = {
    L1: { N: 5, cell: 10, per: 2, maxColSegs: 2, maxRowChars: 3 },
    L2: { N: 8, cell: 9, per: 2, maxColSegs: 4, maxRowChars: 7 },
    L3: { N: 10, cell: 7, per: 2, maxColSegs: 4, maxRowChars: 7 },
    L4: { N: 12, cell: 9, per: 1, maxColSegs: 6, maxRowChars: 11 }
  }
  var FIT_W = 178, FIT_H = 222, GAP2 = 8, RULE2 = 7, NO2 = 6, CLUE_LINE2 = 3.7, DIGIT_MM = 1.7

  /* 图库实际值不得超过排版模型（超了说明要改模型，不是删检查） */
  var realSegs = {}, realChars = {}
  ARTS.forEach(function (a) {
    var cl = clues2(a.rows)
    var ms = 0, mc = 0
    cl.cols.forEach(function (c) { ms = Math.max(ms, c.length) })
    cl.rows.forEach(function (r) { mc = Math.max(mc, r.join(' ').length) })
    realSegs[a.size] = Math.max(realSegs[a.size] || 0, ms)
    realChars[a.size] = Math.max(realChars[a.size] || 0, mc)
  })
  Object.keys(LV2).forEach(function (k) {
    var lv = LV2[k]
    var real = realSegs[lv.N], realC = realChars[lv.N]
    if (real > lv.maxColSegs) lProblems.push(k + '：图库列线索最多 ' + real + ' 段，超过排版模型 ' + lv.maxColSegs)
    if (realC > lv.maxRowChars) lProblems.push(k + '：图库行线索最长 ' + realC + ' 字符，超过排版模型 ' + lv.maxRowChars)
    var w = lv.N * lv.cell + lv.maxRowChars * DIGIT_MM + 4
    if (w > FIT_W) lProblems.push(k + ' 题宽 ' + w.toFixed(1) + 'mm 超出 ' + FIT_W + 'mm')
    var stack = lv.maxColSegs * CLUE_LINE2 + 1
    var h = RULE2 + lv.per * (NO2 + stack + lv.N * lv.cell) + (lv.per - 1) * GAP2
    if (h > FIT_H) lProblems.push(k + ' 每页 ' + lv.per + ' 题高 ' + h.toFixed(1) + 'mm，超出 ' + FIT_H + 'mm 版心')
  })
  /* 答案页 2×2：卡片 padding + 头 + 完成图（3mm 小格）+ 提示按 4 行估 */
  var ansH2 = 2 * (8 + 6 + 12 * 3 + 4 * 5.2) + GAP2
  if (ansH2 > 218) lProblems.push('答案页高 ' + ansH2.toFixed(1) + 'mm 超出版心')
  if (lProblems.length) {
    lProblems.forEach(function (p) { console.error('  ✗ ' + p) })
    process.exit(1)
  }
  console.log('✓ 排版：题宽 / 题高 / 答案页高全部在版心内（独立常量对证）')

  console.log('✓ 全部通过')
}

main()
