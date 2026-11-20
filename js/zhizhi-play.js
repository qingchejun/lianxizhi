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

  /* ---------- 弹层（浏览器专用；原生 dialog：Esc、遮罩置顶交给浏览器） ---------- */

  var HINT = '左键涂黑 · 右键打叉 · 涂对的行列数字会变灰'

  var cur = null /* 当前这盘：{ pz, lv, states, dialog, cells, rowClues, colClues, won } */
  var paint = 0 /* 拖动模式：0 不拖 / 1 涂黑 / -1 擦黑 / 2 打叉 / -2 去叉 */

  /* 与渲染层同一条粗线规则：L3/L4 每 5 格加粗（5 个 5 个数格子好数） */
  function v5(lv, j) {
    return lv.N >= 10 && (j + 1) % 5 === 0 && j !== lv.N - 1
  }

  function emptyStates(N) {
    var s = []
    for (var i = 0; i < N; i++) {
      var row = []
      for (var j = 0; j < N; j++) row.push(0)
      s.push(row)
    }
    return s
  }

  function boardDOM(pz, lv) {
    var doc = root.document
    var N = lv.N
    var table = doc.createElement('table')
    table.className = 'zp-table zp-l' + lv.no
    var cells = [] /* 按 r*N+c 平铺存，刷新时直接下标取 */
    var rowClues = []
    var colClues = []

    var head = doc.createElement('tr')
    head.appendChild(doc.createElement('td'))
    for (var j = 0; j < N; j++) {
      var cc = doc.createElement('td')
      cc.className = 'zp-colclue' + (v5(lv, j) ? ' zp-v5' : '')
      for (var k = 0; k < pz.colClues[j].length; k++) {
        var sp = doc.createElement('span')
        sp.textContent = pz.colClues[j][k]
        cc.appendChild(sp)
      }
      colClues.push(cc)
      head.appendChild(cc)
    }
    table.appendChild(head)

    for (var i = 0; i < N; i++) {
      var tr = doc.createElement('tr')
      var rc = doc.createElement('td')
      rc.className = 'zp-rowclue'
      rc.textContent = pz.rowClues[i].join(' ')
      rowClues.push(rc)
      tr.appendChild(rc)
      for (var c = 0; c < N; c++) {
        var td = doc.createElement('td')
        td.className = 'zp-cell' + (v5(lv, c) ? ' zp-v5' : '') + (v5(lv, i) ? ' zp-h5' : '')
        td.setAttribute('data-r', i)
        td.setAttribute('data-c', c)
        cells.push(td)
        tr.appendChild(td)
      }
      table.appendChild(tr)
    }
    return { table: table, cells: cells, rowClues: rowClues, colClues: colClues }
  }

  /* 一次改动后的全量刷新：格子样式、线索变灰、判赢、满盘判错。N ≤ 12，怎么刷都不心疼 */
  function refresh() {
    var st = cur.states
    var N = cur.lv.N
    var i, j, c
    for (i = 0; i < N; i++) {
      for (j = 0; j < N; j++) {
        var el = cur.cells[i * N + j]
        el.classList.toggle('zp-on', st[i][j] === 1)
        el.classList.toggle('zp-mark', st[i][j] === 2)
      }
      cur.rowClues[i].classList.toggle('zp-done', lineClue(st[i]).join(',') === cur.pz.rowClues[i].join(','))
    }
    for (c = 0; c < N; c++) {
      var col = []
      for (i = 0; i < N; i++) col.push(st[i][c])
      cur.colClues[c].classList.toggle('zp-done', lineClue(col).join(',') === cur.pz.colClues[c].join(','))
    }

    if (cur.won) return
    var status = cur.dialog.querySelector('.zp-status')
    if (wonBoard(st, cur.pz.art)) {
      cur.won = true
      cur.dialog.classList.add('zp-won')
      cur.dialog.querySelector('.zp-title').textContent = '完成！这是「' + cur.pz.art.name + '」'
      status.textContent = '全部涂对了！点「再来一幅」换一幅接着玩。'
      return
    }
    status.textContent = fullBoard(st)
      ? '有 ' + wrongCount(st, cur.pz.art) + ' 格不对——再看看还没变灰的数字。'
      : HINT
  }

  function apply(r, c) {
    if (!cur || cur.won || !paint) return
    var s = cur.states[r][c]
    if (paint === 1 && s !== 1) cur.states[r][c] = 1
    else if (paint === -1 && s === 1) cur.states[r][c] = 0
    else if (paint === 2 && s !== 2) cur.states[r][c] = 2
    else if (paint === -2 && s === 2) cur.states[r][c] = 0
    refresh()
  }

  function cellOf(target) {
    var td = target && target.closest ? target.closest('td.zp-cell') : null
    return td ? { r: +td.getAttribute('data-r'), c: +td.getAttribute('data-c') } : null
  }

  /* mousedown 落点格子的当前状态决定这一趟是涂还是擦：点黑格左键 = 擦，从黑格拖 = 擦一路 */
  function onDown(e) {
    if (!cur || cur.won) return
    var cell = cellOf(e.target)
    if (!cell) return
    e.preventDefault() /* 防拖选文本；右键菜单在 contextmenu 里统一压掉 */
    var s = cur.states[cell.r][cell.c]
    if (e.button === 2) paint = s === 2 ? -2 : 2
    else paint = s === 1 ? -1 : 1
    apply(cell.r, cell.c)
  }

  function onOver(e) {
    if (!paint || !cur || cur.won) return
    var cell = cellOf(e.target)
    if (cell) apply(cell.r, cell.c)
  }

  function onUp() { paint = 0 }

  /* 再来一幅：同关换一幅、不与当前重名（图库每关 ≥ 2 幅，校验器断言兜底） */
  function nextPuzzle() {
    var list = root.SumSum.zhizhi.generate({
      level: cur.pz.level, count: 2, copies: 1,
      noDuplicates: true, seed: root.SumSum.zhizhiSettings.newSeed(), title: ''
    }).puzzles
    if (!list.length) return
    var next = list[0].art.name === cur.pz.art.name ? (list[1] || list[0]) : list[0]
    open(next)
  }

  function teardown() {
    if (!cur) return
    root.document.removeEventListener('mouseup', onUp)
    paint = 0
    var d = cur.dialog
    cur = null /* 先清再关：close 事件重入 teardown 时已是空操作 */
    d.close()
    d.remove()
  }

  function open(pz) {
    teardown()
    var doc = root.document
    var lv = root.SumSum.zhizhi.levelOf(pz.level)
    var d = doc.createElement('dialog')
    d.className = 'zhizhi-play-dialog'
    d.innerHTML =
      '<header class="zp-head">' +
      '<span class="zp-title">第 ' + lv.no + ' 关 · 在线试玩</span>' +
      '<button type="button" class="zp-close" aria-label="关闭">×</button>' +
      '</header>' +
      '<p class="zp-status">' + HINT + '</p>' +
      '<div class="zp-board"></div>' +
      '<footer class="zp-foot">' +
      '<button type="button" class="btn btn-sm" data-act="clear">擦掉全部</button>' +
      '<button type="button" class="btn btn-sm btn-primary" data-act="next">再来一幅</button>' +
      '<button type="button" class="btn btn-sm" data-act="close">关闭</button>' +
      '</footer>'
    var bd = boardDOM(pz, lv)
    d.querySelector('.zp-board').appendChild(bd.table)
    doc.body.appendChild(d)

    cur = {
      pz: pz, lv: lv, states: emptyStates(lv.N), dialog: d,
      cells: bd.cells, rowClues: bd.rowClues, colClues: bd.colClues, won: false
    }

    d.addEventListener('click', function (e) {
      if (e.target === d) { teardown(); return } /* 点到 dialog 自身 = 点的是遮罩空白 */
      var btn = e.target.closest ? e.target.closest('button[data-act]') : null
      if (!btn) return
      var act = btn.getAttribute('data-act')
      if (act === 'close') teardown()
      else if (act === 'next') nextPuzzle()
      else if (act === 'clear' && !cur.won) { cur.states = emptyStates(cur.lv.N); refresh() }
    })
    d.querySelector('.zp-close').addEventListener('click', teardown)
    d.addEventListener('mousedown', onDown)
    d.addEventListener('mouseover', onOver)
    d.addEventListener('contextmenu', function (e) { e.preventDefault() })
    d.addEventListener('close', teardown) /* Esc 走原生关闭 */
    doc.addEventListener('mouseup', onUp)

    d.showModal()
    refresh()
  }

  /* 每次渲染后由 zhizhi-main 调用：给题卷题卡挂「试玩」按钮。
     render 重建 innerHTML，旧按钮随 DOM 销毁，这里每次重挂即可 */
  function attach(container, puzzles) {
    if (!root.document || !puzzles || !puzzles.length) return
    var items = container.querySelectorAll('.sheet-zhizhi .zhizhi-item[data-zp-idx]')
    for (var i = 0; i < items.length; i++) {
      var pz = puzzles[+items[i].getAttribute('data-zp-idx')]
      if (!pz) continue
      var btn = root.document.createElement('button')
      btn.type = 'button'
      btn.className = 'zhizhi-play-btn'
      btn.textContent = '试玩'
      /* 挂进头行右端（题号在左、按钮在右）；题卡右对齐后按钮若再绝对定位在右上角，
         会正好压住最后一列的列线索数字 */
      ;(items[i].querySelector('.zhizhi-head') || items[i]).appendChild(btn)
      ;(function (mine) { /* var 是函数级作用域，必须逐个封进闭包，否则按钮全开同一幅 */
        btn.addEventListener('click', function () { open(mine) })
      })(pz)
    }
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.zhizhiPlay = {
    lineClue: lineClue,
    wonBoard: wonBoard,
    fullBoard: fullBoard,
    wrongCount: wrongCount,
    attach: attach,
    open: open
  }
})(typeof window !== 'undefined' ? window : globalThis)
