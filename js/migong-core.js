/**
 * 儿童迷宫生成（无 DOM 依赖，可在 node 中直接测试）。
 *
 * 2026-11-25 站长定：算式迷宫下线，换成普通的方格走线迷宫——孩子拿笔从「起」画到「终」。
 *
 * 质量红线：
 *   1. 唯一通路：迷宫是「完美迷宫」（任意两格之间恰好一条路，没有环），
 *      所以从起到终只有一条走法；tools/check-migong.js 另写一套独立求解器对证；
 *   2. 不能太短：通路经过的格数不少于 LEVELS[].minPath，否则重来；
 *   3. 同一个种子永远出同一张；同一张卷子里不出重复的迷宫。
 *
 * 题目对象：{ level, n, walls, path, key }
 *   walls[r * n + c] = 这一格还立着的墙：上 1、右 2、下 4、左 8（相邻两格的同一堵墙两边一致）
 *   入口在左上角格子的上边，出口在右下角格子的下边（画的时候在那两处留口子，walls 里不拆）
 *   path = 从起到终的格子序列 [[r, c], …]（答案页画红线用）
 */
(function (root) {
  'use strict'

  /* 可复现随机源（mulberry32 + 种子预搅动，与旧版同一个，分享出去的网址换了题型也能复现） */
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

  /* ---------- 关卡 ---------- */
  /*
   * 递进靠迷宫大小（格子越多、岔路越多）。minPath 是通路至少经过的格数（含起终），
   * 防止出「贴着边一下就到」的迷宫；数值取各尺寸实际跑出来的下四分位（2026-11-25 每档 400 张实测：8 格 21、12 格 37、16 格 61、20 格 87），约四分之三的迷宫一次就过。
   * cell 是卷面格边长（mm），与 js/migong-render.js、tools/check-migong.js 的独立常量对证。
   * perPage：8×8、12×12 一页两张，16×16、20×20 一页一张。
   */
  var LEVELS = {
    L1: { key: 'L1', no: 1, name: '小小迷宫', N: 8, minPath: 21, cell: 8.5, perPage: 2 },
    L2: { key: 'L2', no: 2, name: '小探险', N: 12, minPath: 37, cell: 6.2, perPage: 2 },
    L3: { key: 'L3', no: 3, name: '大迷宫', N: 16, minPath: 61, cell: 10, perPage: 1 },
    L4: { key: 'L4', no: 4, name: '迷宫挑战', N: 20, minPath: 87, cell: 8, perPage: 1 }
  }

  var LEVEL_ORDER = ['L1', 'L2', 'L3', 'L4']

  function levelOf(key) {
    return LEVELS[key] || LEVELS.L1
  }

  var UP = 1, RIGHT = 2, DOWN = 4, LEFT = 8
  /* [行变化, 列变化, 本格的墙, 对面格的墙] */
  var STEPS = [[-1, 0, UP, DOWN], [0, 1, RIGHT, LEFT], [1, 0, DOWN, UP], [0, -1, LEFT, RIGHT]]

  /*
   * 挖迷宫：随机深度优先（回溯法）。从随机一格出发，每次随机挑一个没去过的邻格打通，
   * 走投无路就退回上一格。所有格子都去过时，打通的墙正好 n*n-1 堵，连成一棵树——
   * 这就是「完美迷宫」：任意两格之间恰好一条路。用自己的栈，不递归（20×20 也不会爆栈）。
   */
  function carve(n, rnd) {
    var walls = []
    for (var i = 0; i < n * n; i++) walls.push(UP | RIGHT | DOWN | LEFT)
    var seen = new Array(n * n)
    var start = Math.floor(rnd() * n * n)
    var stack = [start]
    seen[start] = true
    while (stack.length) {
      var cur = stack[stack.length - 1]
      var r = Math.floor(cur / n), c = cur % n
      var opts = []
      for (var k = 0; k < 4; k++) {
        var nr = r + STEPS[k][0], nc = c + STEPS[k][1]
        if (nr < 0 || nr >= n || nc < 0 || nc >= n || seen[nr * n + nc]) continue
        opts.push(k)
      }
      if (!opts.length) { stack.pop(); continue }
      var d = opts[Math.floor(rnd() * opts.length)]
      var nxt = (r + STEPS[d][0]) * n + (c + STEPS[d][1])
      walls[cur] &= ~STEPS[d][2]
      walls[nxt] &= ~STEPS[d][3]
      seen[nxt] = true
      stack.push(nxt)
    }
    return walls
  }

  /* 从左上角走到右下角的路（广度优先，记下每格从哪来，再倒推回去） */
  function solve(n, walls) {
    var from = new Array(n * n)
    var end = n * n - 1
    from[0] = -1
    var queue = [0]
    for (var q = 0; q < queue.length; q++) {
      var cur = queue[q]
      if (cur === end) break
      var r = Math.floor(cur / n), c = cur % n
      for (var k = 0; k < 4; k++) {
        if (walls[cur] & STEPS[k][2]) continue
        var nr = r + STEPS[k][0], nc = c + STEPS[k][1]
        if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue
        var nxt = nr * n + nc
        if (from[nxt] !== undefined) continue
        from[nxt] = cur
        queue.push(nxt)
      }
    }
    if (from[end] === undefined) return null
    var path = []
    for (var at = end; at !== -1; at = from[at]) path.push([Math.floor(at / n), at % n])
    return path.reverse()
  }

  var MAX_TRIES = 60

  function makeOne(levelKey, rnd) {
    var lv = levelOf(levelKey)
    var best = null
    for (var t = 0; t < MAX_TRIES; t++) {
      var walls = carve(lv.N, rnd)
      var path = solve(lv.N, walls)
      if (!path) continue
      var pz = { level: lv.key, n: lv.N, walls: walls, path: path, key: lv.key + ':' + walls.map(function (w) { return w.toString(16) }).join('') }
      if (path.length >= lv.minPath) return pz
      if (!best || path.length > best.path.length) best = pz
    }
    return best /* 极少数情况下 60 次都偏短：给最长的那张，不让卷子空着 */
  }

  /* 主入口：按设置生成一批。去重按 key；尝试上限 count×20 防死循环 */
  function generate(s) {
    var rnd = s.seed ? makeRandom(s.seed) : Math.random
    var seen = {}
    var puzzles = []
    var maxAttempts = s.count * 20
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
    return '儿童迷宫 · 第 ' + lv.no + ' 关 ' + lv.name
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.migong = {
    LEVELS: LEVELS,
    LEVEL_ORDER: LEVEL_ORDER,
    levelOf: levelOf,
    WALL: { UP: UP, RIGHT: RIGHT, DOWN: DOWN, LEFT: LEFT },
    carve: carve,
    solve: solve,
    makeRandom: makeRandom,
    makeOne: makeOne,
    generate: generate,
    titleFor: titleFor,
    MAX_TRIES: MAX_TRIES
  }
})(typeof window !== 'undefined' ? window : globalThis)
