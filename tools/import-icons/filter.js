#!/usr/bin/env node
/*
 * 过滤栅格化结果，产出可入库的候选图案。
 * 用法：node tools/import-icons/filter.js
 * 输入：vendor/raster-out.html（Chrome --dump-dom 的结果）
 * 输出：vendor/candidates.json（含点阵）、vendor/contact-sheet.html（人眼验收用）
 *
 * 五道关（与 js/zhizhi-core.js 的生成门同一标准）：
 *   包围盒长宽比 0.6~1.67（拉伸不能太狠）、黑格 4-连通恰 1 块、
 *   黑格比例 35%~60%、line-solver 可解（唯一解+不用猜）、同尺寸点阵去重。
 *
 * 判定逻辑从 tools/check-zhizhi.js 复制（第二实现副本），工具代码不共享运行时。
 */
'use strict'

var fs = require('fs')
var path = require('path')

/* ---------- 从 check-zhizhi.js 复制的判定实现 ---------- */

function bits(rows) {
  return rows.map(function (r) {
    return r.split('').map(function (c) { return c === 'X' ? 1 : 0 })
  })
}

function cluesOf(rows) {
  var g = bits(rows)
  var R = [], C = []
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
    var line = [], cur = 0
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

function solvable(N, rowClues, colClues) {
  var rowKnown = [], colKnown = []
  var i, j
  for (i = 0; i < N; i++) {
    var rk = [], ck = []
    for (j = 0; j < N; j++) { rk.push(-1); ck.push(-1) }
    rowKnown.push(rk); colKnown.push(ck)
  }
  function prop(known, clue) {
    var ps = placements(N, clue, known)
    if (!ps.length) return -1
    var m = merge(ps, N)
    for (var a = 0; a < N; a++) if (m[a] !== -1 && known[a] === -1) known[a] = m[a]
    return 0
  }
  var progress = true
  while (progress) {
    progress = false
    for (var r = 0; r < N; r++) {
      var before = rowKnown[r].join(',')
      if (prop(rowKnown[r], rowClues[r]) < 0) return false
      if (rowKnown[r].join(',') !== before) progress = true
      for (var c0 = 0; c0 < N; c0++) {
        if (rowKnown[r][c0] !== -1 && colKnown[c0][r] === -1) colKnown[c0][r] = rowKnown[r][c0]
      }
    }
    for (var c = 0; c < N; c++) {
      var before2 = colKnown[c].join(',')
      if (prop(colKnown[c], colClues[c]) < 0) return false
      if (colKnown[c].join(',') !== before2) progress = true
      for (var r0 = 0; r0 < N; r0++) {
        if (colKnown[c][r0] !== -1 && rowKnown[r0][c] === -1) rowKnown[r0][c] = colKnown[c][r0]
      }
    }
  }
  for (var a = 0; a < N; a++) for (var b = 0; b < N; b++) if (rowKnown[a][b] === -1) return false
  return true
}

function blocks(rows) {
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
          var di = [-1, 1, 0, 0], dj = [0, 0, -1, 1]
          for (var d = 0; d < 4; d++) {
            var ni = t[0] + di[d], nj = t[1] + dj[d]
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

/* ---------- 主流程 ---------- */

function extractJson(html) {
  var m = html.match(/<pre id="out">(.*?)<\/pre>/s)
  if (!m) throw new Error('没找到 <pre id="out">，栅格化可能没跑完')
  var text = m[1]
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  return JSON.parse(text)
}

function main() {
  var html = fs.readFileSync(path.join(__dirname, 'vendor', 'raster-out.html'), 'utf8')
  var icons = extractJson(html)
  console.log('读到 ' + icons.length + ' 个图标栅格化结果')

  var stats = { total: 0, ratio: 0, blocks: 0, fill: 0, solve: 0, dup: 0, kept: 0 }
  var seen = {}
  var candidates = []

  icons.forEach(function (ic) {
    if (!ic.sizes) return
    var bw = ic.bbox[0], bh = ic.bbox[1]
    ;[8, 10, 12].forEach(function (N) {
      stats.total++
      if (bw / bh < 0.6 || bw / bh > 1 / 0.6) { stats.ratio++; return }
      var rows = ic.sizes[String(N)]
      var flat = rows.join('')
      var blacks = flat.split('X').length - 1
      if (blacks === 0) { stats.fill++; return }
      var ratio = blacks / (N * N)
      if (ratio < 0.35 || ratio > 0.6) { stats.fill++; return }
      if (blocks(rows) !== 1) { stats.blocks++; return }
      var clues = cluesOf(rows)
      if (!solvable(N, clues.rows, clues.cols)) { stats.solve++; return }
      var key = N + '|' + flat
      if (seen[key]) { stats.dup++; return }
      seen[key] = true
      stats.kept++
      candidates.push({ name: ic.name, size: N, ratio: Math.round(ratio * 100) / 100, rows: rows })
    })
  })

  console.log('过滤统计：', JSON.stringify(stats))
  fs.writeFileSync(path.join(__dirname, 'vendor', 'candidates.json'), JSON.stringify(candidates))
  console.log('✓ vendor/candidates.json，' + candidates.length + ' 幅候选')

  /* contact sheet：按尺寸分区，每幅画格子 + 名字 */
  function cell(rows, px) {
    var html2 = '<table class="g" style="border-collapse:collapse">'
    rows.forEach(function (r) {
      html2 += '<tr>'
      r.split('').forEach(function (c) {
        html2 += '<td style="width:' + px + 'px;height:' + px + 'px;border:1px solid #ddd;' +
          (c === 'X' ? 'background:#111' : '') + '"></td>'
      })
      html2 += '</tr>'
    })
    return html2 + '</table>'
  }
  var sheet = '<!doctype html><meta charset="utf-8"><body style="font:12px/1.4 sans-serif">' +
    '<style>.it{display:inline-block;margin:8px;text-align:center;vertical-align:top}' +
    '.nm{margin-top:4px;max-width:120px;word-break:break-all;color:#333}</style>'
  ;[8, 10, 12].forEach(function (N) {
    var list = candidates.filter(function (c) { return c.size === N })
    sheet += '<h2>' + N + '×' + N + '（' + list.length + ' 幅）</h2>'
    list.forEach(function (c) {
      sheet += '<div class="it">' + cell(c.rows, N === 8 ? 14 : 12) +
        '<div class="nm">' + c.name + '</div></div>'
    })
  })
  sheet += '</body>'
  fs.writeFileSync(path.join(__dirname, 'vendor', 'contact-sheet.html'), sheet)
  console.log('✓ vendor/contact-sheet.html（Chrome 截图后人工验收）')
}

main()
