/**
 * 算式迷宫题目生成（无 DOM 依赖，可在 node 中直接测试）。
 *
 * 题面：N×N 网格每格一条完整等式（如 3+2=5），只有答案正确的格子能踩；
 * 从左上「起」一路踩正确格到右下「终」通关。主路径全放正确等式，
 * 贴着主路径另撒几个正确格当诱饵（岔口感），其余格放错误等式。
 *
 * 质量红线（与密码的「唯一解」同构）：
 *   每张迷宫从起到终恰好一条全踩对的路线——countRoutes 数简单路径
 *   （数到 2 即停）验证，不唯一就换诱饵布局重试。
 *
 * 题目对象：{ level, n, cells, path, baits, key }
 *   cells[r][c] = { a, op, b, r, ok }，起 (0,0) 终 (n-1,n-1) 两格为 null
 *   path = 主路径坐标序列 [[0,0],…]（含起终，答案页画路线用）
 *   baits = 诱饵坐标序列（非路径的正确格）
 */
(function (root) {
  'use strict'

  /* 可复现随机源（mulberry32 + 种子预搅动）。与 shudu-core / mima-core 里的
     同名函数同源，但这里多一步搅动：mulberry32 的状态推进是纯加法（每次
     +0x6d2b79f5），两个相差 k*0x6d2b79f5 (mod 2^32) 的种子会产出同一条流
     平移 k 步的序列——2026-11-20 校验器按算术序列喂种子，两次撞出整盘相同
     的迷宫（消耗数之差恰好等于平移量，机制已证实）。先过一遍 splitmix 式
     搅动把种子的加法结构打散；同种子仍得同流，复现与分享不受影响。 */
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

  function shuffle(arr, rnd) {
    for (var k = arr.length - 1; k > 0; k--) {
      var j = Math.floor(rnd() * (k + 1))
      var t = arr[k]; arr[k] = arr[j]; arr[j] = t
    }
    return arr
  }

  /* ---------- 关卡 ---------- */
  /*
   * 递进的"序"落在算的范围（跟课内进度接力）+ 迷宫大小 + 诱饵数（岔口感）。
   * lenMin/lenMax 是主路径步数（起点到终点的移动次数）；baitMin/baitMax 是
   * 诱饵格数。cell 是卷面格边长（mm），与 css/migong.css（.migong-l1~l4）、
   * tools/check-migong.js 的独立常量三方对证。
   */
  var LEVELS = {
    L1: { key: 'L1', no: 1, name: '起步小路', N: 4, kind: 'add10', lenMin: 6, lenMax: 8, baitMin: 0, baitMax: 1, cell: 18 },
    L2: { key: 'L2', no: 2, name: '岔路寻踪', N: 5, kind: 'mix10', lenMin: 8, lenMax: 10, baitMin: 1, baitMax: 2, cell: 15 },
    L3: { key: 'L3', no: 3, name: '进位翻山', N: 6, kind: 'carry', lenMin: 10, lenMax: 12, baitMin: 2, baitMax: 3, cell: 24 },
    L4: { key: 'L4', no: 4, name: '终极大冒险', N: 6, kind: 'mix20', lenMin: 12, lenMax: 15, baitMin: 3, baitMax: 4, cell: 24 }
  }

  var LEVEL_ORDER = ['L1', 'L2', 'L3', 'L4']

  function levelOf(key) {
    return LEVELS[key] || LEVELS.L1
  }

  /* ---------- 等式 ---------- */
  /*
   * kind → 随机取一条算式 (a, op, b)：
   *   add10  10 以内加法：a,b∈[1,9]，a+b≤10
   *   mix10  10 以内加减各半（减 a≥b≥1，差可为 0）
   *   carry  20 以内进位加：a,b∈[2,9]，a+b≥11（个位必进位）
   *   mix20  进位加（同上）与退位减各半：a∈[11,18]，b∈[2,9]，a%10<b（必退位）
   * ban 是已用算式集合（"a op b" 串）。正确算式同盘不重复；错误算式避开
   * 正确算式（同算式一正一错同盘会把判断变成比对）但错误之间允许重复。
   */
  function pickOperands(kind, rnd, ban) {
    for (var t = 0; t < 60; t++) {
      var a, op, b
      if (kind === 'add10') {
        op = '+'
        a = 1 + Math.floor(rnd() * 9)
        b = 1 + Math.floor(rnd() * (10 - a)) /* a+b ≤ 10 */
      } else if (kind === 'mix10') {
        if (rnd() < 0.5) {
          op = '+'
          a = 1 + Math.floor(rnd() * 9)
          b = 1 + Math.floor(rnd() * (10 - a))
        } else {
          op = '-'
          a = 1 + Math.floor(rnd() * 10) /* 1..10 */
          b = 1 + Math.floor(rnd() * a)
        }
      } else if (kind === 'carry') {
        op = '+'
        do {
          a = 2 + Math.floor(rnd() * 8)
          b = 2 + Math.floor(rnd() * 8)
        } while (a + b < 11)
      } else { /* mix20 */
        if (rnd() < 0.5) {
          op = '+'
          do {
            a = 2 + Math.floor(rnd() * 8)
            b = 2 + Math.floor(rnd() * 8)
          } while (a + b < 11)
        } else {
          op = '-'
          do {
            a = 11 + Math.floor(rnd() * 8)
            b = 2 + Math.floor(rnd() * 8)
          } while (a % 10 >= b)
        }
      }
      if (!ban[a + op + b]) return { a: a, op: op, b: b }
    }
    return null /* 容量耗尽（L3 纯进位加的算式池最小，同盘 36 条封顶） */
  }

  function evalOp(a, op, b) {
    return op === '+' ? a + b : a - b
  }

  /* 错误答案 = 正确答案 ±1（2/3）或 ±2（1/3），像孩子真实的进位/退位错；
     约束 ≥0、≤20、≠正确值，不满足就翻符号退回 ±1。 */
  function wrongAnswer(val, rnd) {
    var d = rnd() < 2 / 3 ? 1 : 2
    var w = val + (rnd() < 0.5 ? d : -d)
    if (w === val || w < 0 || w > 20) w = val + 1
    if (w > 20) w = val - 1
    return w
  }

  /* ---------- 迷宫结构 ---------- */

  var DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]]

  /* 从 (0,0) 到 (N-1,N-1) 的自回避路径：方向随机序 DFS，取第一条步数落在
     [lenMin, lenMax] 的。超长剪枝 + 找到即停，N ≤ 6 上瞬时。 */
  function findPath(N, lenMin, lenMax, rnd) {
    var best = null
    var visited = {}
    var path = [[0, 0]]
    function dfs(r, c, steps) {
      if (best) return
      if (r === N - 1 && c === N - 1) {
        if (steps >= lenMin) best = path.slice()
        return /* 经过终点即结束：路径不能再延长（自回避） */
      }
      if (steps >= lenMax) return
      var dirs = shuffle(DIRS.slice(), rnd)
      for (var i = 0; i < 4; i++) {
        var nr = r + dirs[i][0]
        var nc = c + dirs[i][1]
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue
        var k = nr * N + nc
        if (visited[k]) continue
        visited[k] = 1
        path.push([nr, nc])
        dfs(nr, nc, steps + 1)
        path.pop()
        visited[k] = 0
        if (best) return
      }
    }
    visited[0] = 1
    dfs(0, 0, 0)
    return best
  }

  /* 诱饵候选：与主路径相邻的非路径格——贴着路放才有岔口感 */
  function baitCandidates(N, path) {
    var onPath = {}
    path.forEach(function (p) { onPath[p[0] * N + p[1]] = 1 })
    var cand = {}
    path.forEach(function (p) {
      DIRS.forEach(function (d) {
        var nr = p[0] + d[0]
        var nc = p[1] + d[1]
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) return
        var k = nr * N + nc
        if (!onPath[k]) cand[k] = [nr, nc]
      })
    })
    return Object.keys(cand).map(function (k) { return cand[k] })
  }

  /* 数「起 → 终」的全踩对简单路径条数（起、终、正确格可走；数到 cap 停）。
     唯一解红线的验证器，也是校验脚本独立对证的对象。 */
  function countRoutes(n, cells, cap) {
    var count = 0
    var visited = {}
    function walkable(r, c) {
      if ((r === 0 && c === 0) || (r === n - 1 && c === n - 1)) return true
      var cell = cells[r][c]
      return !!cell && cell.ok
    }
    function dfs(r, c) {
      if (count >= cap) return
      if (r === n - 1 && c === n - 1) { count++; return }
      for (var i = 0; i < 4; i++) {
        var nr = r + DIRS[i][0]
        var nc = c + DIRS[i][1]
        if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue
        var k = nr * n + nc
        if (visited[k] || !walkable(nr, nc)) continue
        visited[k] = 1
        dfs(nr, nc)
        visited[k] = 0
        if (count >= cap) return
      }
    }
    visited[0] = 1
    dfs(0, 0)
    return count
  }

  /* ---------- 生成 ---------- */

  /* 同一盘换诱饵 / 换路径的尝试上限。原型实测：L1 几乎一次过，
     L4 偶尔要换几轮诱饵（诱饵多了容易多解），上限内全部成功。 */
  var MAX_PATH_TRIES = 30
  var MAX_BAIT_TRIES = 30

  /* 给主路径 + 诱饵放正确等式、其余放错误等式。正确算式同盘不重复、
     错误算式避开正确算式；容量耗尽返回 null（上层换路径重来）。 */
  function buildPuzzle(lv, path, baits, rnd) {
    var N = lv.N
    var cells = []
    for (var r = 0; r < N; r++) {
      var row = []
      for (var c = 0; c < N; c++) row.push(null)
      cells.push(row)
    }

    var correctSlots = []
    for (var i = 1; i < path.length - 1; i++) correctSlots.push(path[i])
    baits.forEach(function (b) { correctSlots.push(b) })

    var used = {}
    var okList = []
    for (var s = 0; s < correctSlots.length; s++) {
      var base = pickOperands(lv.kind, rnd, used)
      if (!base) return null
      used[base.a + base.op + base.b] = 1
      var val = evalOp(base.a, base.op, base.b)
      var cell = { a: base.a, op: base.op, b: base.b, r: val, ok: true }
      cells[correctSlots[s][0]][correctSlots[s][1]] = cell
      okList.push(cell)
    }

    var wrongCount = 0
    for (var rr = 0; rr < N; rr++) {
      for (var cc = 0; cc < N; cc++) {
        if (cells[rr][cc]) continue
        if ((rr === 0 && cc === 0) || (rr === N - 1 && cc === N - 1)) continue
        var w = pickOperands(lv.kind, rnd, used)
        if (!w) return null
        var wv = evalOp(w.a, w.op, w.b)
        cells[rr][cc] = { a: w.a, op: w.op, b: w.b, r: wrongAnswer(wv, rnd), ok: false }
        wrongCount++
      }
    }
    if (!wrongCount) return null /* 防御：满盘全对没有判断量 */

    return {
      level: lv.key,
      n: N,
      cells: cells,
      path: path,
      baits: baits,
      key: lv.key + '|' + cells.map(function (row) {
        return row.map(function (c) { return c ? c.a + c.op + c.b + '=' + c.r : '-' }).join('')
      }).join('.')
    }
  }

  function makeOne(levelKey, rnd) {
    var lv = levelOf(levelKey)
    for (var pt = 0; pt < MAX_PATH_TRIES; pt++) {
      var path = findPath(lv.N, lv.lenMin, lv.lenMax, rnd)
      if (!path) continue
      var cand = shuffle(baitCandidates(lv.N, path), rnd)
      for (var bt = 0; bt < MAX_BAIT_TRIES; bt++) {
        var k = lv.baitMin + Math.floor(rnd() * (lv.baitMax - lv.baitMin + 1))
        var baits = cand.slice(0, Math.min(k, cand.length))
        var pz = buildPuzzle(lv, path, baits, rnd)
        if (!pz) break /* 算式容量耗尽，换条路径 */
        if (countRoutes(lv.N, pz.cells, 2) !== 1) continue
        return pz
      }
    }
    return null
  }

  /* 主入口：按设置生成一批。去重按 key；尝试上限 count×80 防死循环。 */
  function generate(s) {
    var rnd = s.seed ? makeRandom(s.seed) : Math.random
    var seen = {}
    var puzzles = []
    var maxAttempts = s.count * 80
    for (var i = 0; i < maxAttempts && puzzles.length < s.count; i++) {
      var q = makeOne(s.level, rnd)
      if (!q) continue
      if (s.noDuplicates && seen[q.key]) continue
      seen[q.key] = 1
      puzzles.push(q)
    }
    return { puzzles: puzzles, shortfall: s.count - puzzles.length }
  }

  function titleFor(s) {
    var lv = levelOf(s.level)
    return '算式迷宫 · 第 ' + lv.no + ' 关 ' + lv.name
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.migong = {
    LEVELS: LEVELS,
    LEVEL_ORDER: LEVEL_ORDER,
    levelOf: levelOf,
    pickOperands: pickOperands,
    wrongAnswer: wrongAnswer,
    evalOp: evalOp,
    findPath: findPath,
    baitCandidates: baitCandidates,
    countRoutes: countRoutes,
    makeRandom: makeRandom,
    makeOne: makeOne,
    generate: generate,
    titleFor: titleFor,
    MAX_PATH_TRIES: MAX_PATH_TRIES,
    MAX_BAIT_TRIES: MAX_BAIT_TRIES
  }
})(typeof window !== 'undefined' ? window : globalThis)
