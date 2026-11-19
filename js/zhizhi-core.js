/*
 * 数织核心：线索计算、单行传播求解器、生成门、关卡与选题。
 *
 * 红线（与数独/密码同源）：每题只用「满行 / 全空 / 挤一挤 / 行列交叉」就能推完全盘
 * ——solve() 就是这个推理过程的机器版，解不出（需要猜）的图进不了图库。
 * 起步提示直接取 solve 轨迹的前几步翻成孩子话。
 */
(function (root) {
  'use strict'

  /* ---------- 随机数（每模块自带一份，mulberry32） ---------- */

  function makeRandom(seed) {
    var a = seed >>> 0
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0
      var t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  function shuffle(arr, rnd) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1))
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t
    }
    return arr
  }

  /* ---------- 关卡 ---------- */

  var LEVELS = {
    L1: { key: 'L1', no: 1, name: '迷你涂画', N: 5, perPage: 2, cellMM: 10 },
    L2: { key: 'L2', no: 2, name: '小小图案', N: 8, perPage: 2, cellMM: 9 },
    L3: { key: 'L3', no: 3, name: '大发现', N: 10, perPage: 2, cellMM: 7 },
    L4: { key: 'L4', no: 4, name: '像素大师', N: 12, perPage: 1, cellMM: 9 }
  }
  var LEVEL_ORDER = ['L1', 'L2', 'L3', 'L4']

  function levelOf(key) {
    return LEVELS[key] || LEVELS.L1
  }

  /* ---------- 线索 ---------- */

  /* 点阵字符行 -> 01 矩阵 */
  function bits(rows) {
    return rows.map(function (r) {
      return r.split('').map(function (c) { return c === 'X' ? 1 : 0 })
    })
  }

  /* 点阵 -> { rows: 行线索, cols: 列线索 }，空行/列记 [0] */
  function cluesOf(rows) {
    var g = bits(rows)
    var R = []
    var C = []
    var i, j, run, seg
    for (i = 0; i < g.length; i++) {
      seg = []; run = 0
      for (j = 0; j <= g[i].length; j++) {
        if (j < g[i].length && g[i][j] === 1) run++
        else if (run) { seg.push(run); run = 0 }
      }
      R.push(seg.length ? seg : [0])
    }
    for (j = 0; j < g[0].length; j++) {
      seg = []; run = 0
      for (i = 0; i <= g.length; i++) {
        if (i < g.length && g[i][j] === 1) run++
        else if (run) { seg.push(run); run = 0 }
      }
      C.push(seg.length ? seg : [0])
    }
    return { rows: R, cols: C }
  }

  /* ---------- 单行传播 ---------- */

  /* 单行（长 n、线索 clue）与已知 known(-1/0/1) 相容的全部放置 */
  function placements(n, clue, known) {
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
  function merge(lists, n) {
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

  /* 单行传播：把公共确定格写回 known，返回本轮新确定的格子下标 */
  function propagate(n, clue, known) {
    var ps = placements(n, clue, known)
    if (!ps.length) return null
    var m = merge(ps, n)
    var found = []
    for (var i = 0; i < n; i++) {
      if (m[i] !== -1 && known[i] === -1) {
        known[i] = m[i]
        found.push(i)
      }
    }
    return found
  }

  /* ---------- 全盘求解（行/列传播到不动点） ---------- */

  /*
   * trace 每步：{ line: 'r3'|'c5', kind: 'zero'|'full'|'overlap'|'cross', found: [下标] }
   *   zero    线索为 0，整行留白
   *   full    线索+间隔正好排满，整行全黑
   *   overlap 不依赖其他行列、纯「挤一挤」推出来的
   *   cross   依赖其他行列先推出的格子（交叉推理）
   */
  function solve(N, rowClues, colClues) {
    var rowKnown = []
    var colKnown = []
    var i, j
    for (i = 0; i < N; i++) {
      var rk = [], ck = []
      for (j = 0; j < N; j++) { rk.push(-1); ck.push(-1) }
      rowKnown.push(rk); colKnown.push(ck)
    }
    var trace = []

    function span(clue) {
      var s = clue.length - 1
      for (var k = 0; k < clue.length; k++) s += clue[k]
      return s
    }
    function kindOf(clue, knownBefore) {
      if (clue.length === 1 && clue[0] === 0) return 'zero'
      if (span(clue) === N) return 'full'
      /* 本行传播前一格已知都没有 -> 纯挤一挤；有已知格 -> 交叉 */
      var had = false
      for (var i2 = 0; i2 < N; i2++) if (knownBefore[i2] !== -1) { had = true; break }
      return had ? 'cross' : 'overlap'
    }

    var progress = true
    while (progress) {
      progress = false
      for (var r = 0; r < N; r++) {
        var before = rowKnown[r].slice()
        var found = propagate(N, rowClues[r], rowKnown[r])
        if (found === null) return { solved: false, grid: null, trace: trace }
        if (found.length) {
          trace.push({ line: 'r' + r, kind: kindOf(rowClues[r], before), found: found })
          progress = true
          for (var c = 0; c < N; c++) if (rowKnown[r][c] !== -1 && colKnown[c][r] === -1) colKnown[c][r] = rowKnown[r][c]
        }
      }
      for (var c2 = 0; c2 < N; c2++) {
        var before2 = colKnown[c2].slice()
        var found2 = propagate(N, colClues[c2], colKnown[c2])
        if (found2 === null) return { solved: false, grid: null, trace: trace }
        if (found2.length) {
          trace.push({ line: 'c' + c2, kind: kindOf(colClues[c2], before2), found: found2 })
          progress = true
          for (var r2 = 0; r2 < N; r2++) if (colKnown[c2][r2] !== -1 && rowKnown[r2][c2] === -1) rowKnown[r2][c2] = colKnown[c2][r2]
        }
      }
    }
    for (var a = 0; a < N; a++) {
      for (var b = 0; b < N; b++) {
        if (rowKnown[a][b] === -1) return { solved: false, grid: null, trace: trace }
      }
    }
    return { solved: true, grid: rowKnown, trace: trace }
  }

  /* ---------- 生成门（图库入库标准，校验器全量复核） ---------- */

  function floodBlocks(rows) {
    var g = bits(rows)
    var n = g.length
    var seen = g.map(function (r) { return r.map(function () { return false }) })
    var count = 0
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        if (g[i][j] === 1 && !seen[i][j]) {
          count++
          var stack = [[i, j]]
          seen[i][j] = true
          while (stack.length) {
            var t = stack.pop()
            var di = [-1, 1, 0, 0]
            var dj = [0, 0, -1, 1]
            for (var d = 0; d < 4; d++) {
              var ni = t[0] + di[d]
              var nj = t[1] + dj[d]
              if (ni >= 0 && ni < n && nj >= 0 && nj < n && g[ni][nj] === 1 && !seen[ni][nj]) {
                seen[ni][nj] = true
                stack.push([ni, nj])
              }
            }
          }
        }
      }
    }
    return count
  }

  function validate(art) {
    if (!art || !art.name || !art.rows || art.rows.length !== art.size) return false
    for (var i = 0; i < art.rows.length; i++) {
      if (art.rows[i].length !== art.size) return false
      if (!/^[X.]+$/.test(art.rows[i])) return false
    }
    var flat = art.rows.join('')
    var blacks = flat.split('X').length - 1
    var ratio = blacks / (art.size * art.size)
    if (ratio < 0.35 || ratio > 0.6) return false
    if (floodBlocks(art.rows) !== 1) return false
    var cl = cluesOf(art.rows)
    var sol = solve(art.size, cl.rows, cl.cols)
    return sol.solved
  }

  /* ---------- 起步提示（孩子话，答案页用） ---------- */

  function spanText(clue) {
    return clue.join(' ')
  }

  function hintLine(step, clues) {
    var isRow = step.line.charAt(0) === 'r'
    var idx = +(step.line.slice(1)) + 1
    var where = isRow ? '第 ' + idx + ' 行' : '第 ' + idx + ' 列'
    var clue = clues ? spanText(clues[+step.line.slice(1)]) : ''
    if (step.kind === 'zero') return where + '印着 0——这一' + (isRow ? '行' : '列') + '全空，一格都不涂。'
    if (step.kind === 'full') return where + '印着 ' + clue + '，正好排满——全部涂黑！'
    if (step.kind === 'overlap') return where + '的「' + clue + '」：挨着挤一挤，重叠的格子先涂上。'
    return where + '结合已经涂好的格子，又能定下几格。'
  }

  /* 挑 3 步：优先 full / zero（最好教），再补 overlap / cross；尾句揭晓图案名 */
  function hints(art, trace) {
    var cl = cluesOf(art.rows)
    var clueArr = { r: cl.rows, c: cl.cols }
    var picked = []
    var order = ['full', 'zero', 'overlap', 'cross']
    for (var o = 0; o < order.length && picked.length < 3; o++) {
      for (var t = 0; t < trace.length && picked.length < 3; t++) {
        if (trace[t].kind === order[o] && picked.indexOf(trace[t]) < 0) picked.push(trace[t])
      }
    }
    if (!picked.length && trace.length) picked.push(trace[0])
    var out = picked.map(function (step) {
      return hintLine(step, clueArr[step.line.charAt(0)])
    })
    out.push('涂完就是「' + art.name + '」！')
    return out
  }

  /* ---------- 选题 ---------- */

  function titleFor(s) {
    var lv = levelOf(s.level)
    return '数织涂画 · 第 ' + lv.no + ' 关 ' + lv.name
  }

  function generate(s) {
    var lv = levelOf(s.level)
    var rnd = makeRandom(s.seed)
    var pool = shuffle((root.SumSum.zhizhiArt.ARTS).filter(function (a) { return a.size === lv.N }), rnd)
    var want = s.count
    var use = s.noDuplicates === false ? null : {}
    var picked = []
    var i = 0
    while (picked.length < want) {
      if (i >= pool.length) {
        if (s.noDuplicates === false) { i = 0 } else break
      }
      var art = pool[i++]
      if (use) {
        if (use[art.name]) continue
        use[art.name] = true
      }
      var cl = cluesOf(art.rows)
      var sol = solve(lv.N, cl.rows, cl.cols)
      picked.push({
        level: s.level,
        art: art,
        rowClues: cl.rows,
        colClues: cl.cols,
        hints: hints(art, sol.trace),
        key: s.level + '|' + art.name + '|' + lv.N
      })
    }
    return { puzzles: picked, shortfall: want - picked.length }
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.zhizhi = {
    makeRandom: makeRandom,
    LEVELS: LEVELS,
    LEVEL_ORDER: LEVEL_ORDER,
    levelOf: levelOf,
    cluesOf: cluesOf,
    placements: placements,
    propagate: propagate,
    solve: solve,
    validate: validate,
    hints: hints,
    generate: generate,
    titleFor: titleFor
  }
})(typeof window !== 'undefined' ? window : globalThis)
