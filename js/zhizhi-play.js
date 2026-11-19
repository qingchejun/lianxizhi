/*
 * 数织在线玩（最小版）：卷面题卡上的「试玩」按钮 → 弹层棋盘。
 * 本文件加载期不碰 DOM（校验器在 node 里 load 后只测下面的纯函数）；
 * 弹层构建、事件与打印隔离规则在下半段，样式见 css/zhizhi.css 末段。
 */
;(function (root) {
  'use strict'

  /* ---------- 纯逻辑（node 可测） ---------- */

  /* 格子状态：0 空 / 1 黑 / 2 叉（打叉 = 标记这格一定是空的） */

  /* 一行/列状态 -> 黑格段序列，无黑记 [0]（与 zhizhi-core 的 cluesOf 同口径：叉不算黑，
     但也不切断黑段——叉只是玩家的自我标记，不是空格的证明义务） */
  function lineClue(cells) {
    var seg = []
    var run = 0
    for (var i = 0; i <= cells.length; i++) {
      if (i < cells.length && cells[i] === 1) run++
      else if (run) { seg.push(run); run = 0 }
    }
    return seg.length ? seg : [0]
  }

  /* 黑格集合与答案逐格一致即赢（叉/空不影响——涂对了就该赢，不强迫把空格全打叉）。
     列宽取 rows[r].length，不依赖 art.size 字段 */
  function wonBoard(states, art) {
    for (var r = 0; r < art.rows.length; r++) {
      for (var c = 0; c < art.rows[r].length; c++) {
        if ((states[r][c] === 1) !== (art.rows[r].charAt(c) === 'X')) return false
      }
    }
    return true
  }

  /* 每格都做过决定（黑或叉）——判错提示只在满盘时给 */
  function fullBoard(states) {
    for (var r = 0; r < states.length; r++) {
      for (var c = 0; c < states[r].length; c++) {
        if (states[r][c] === 0) return false
      }
    }
    return true
  }

  /* 黑格与答案不一致的格数（判错提示用，不指位置） */
  function wrongCount(states, art) {
    var n = 0
    for (var r = 0; r < art.rows.length; r++) {
      for (var c = 0; c < art.rows[r].length; c++) {
        if ((states[r][c] === 1) !== (art.rows[r].charAt(c) === 'X')) n++
      }
    }
    return n
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.zhizhiPlay = {
    lineClue: lineClue,
    wonBoard: wonBoard,
    fullBoard: fullBoard,
    wrongCount: wrongCount
  }
})(typeof window !== 'undefined' ? window : globalThis)
