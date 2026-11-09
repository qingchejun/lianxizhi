/**
 * 错字集（v3）+ 每日登记：点选「没认出」的字，登记时一批结算。
 *
 * 2026-11 起全站统一语义：**点 = 没认出**，登记时**没点的算认出**。
 * 点了先不落库 —— 只进当天的「点选集」（picks:v1，切板块、刷新、重开都不丢），
 * 点「登记结果」才一批写进错字集（settleApply）。这修掉了两件老毛病：
 *   1) 打印后切走再回来，附页错字重抽（appendPick 只活在 JS 变量里）——现在选择与卷子都落库；
 *   2) 「错字集页点 = 认出、本周页点 = 不认识」两套相反的规则——现在只有一个方向。
 *
 * 登记当天可整卷撤销：settle 前把 marks/log/papers 快照进 undo:v1，undoSettle 整体还原。
 *
 * 【点击绝不触发重新渲染】的老规矩不变（见 shizi-main 的 refresh）：点字只改 class。
 */
(function (root) {
  'use strict'

  var doc = root.document

  function C() {
    return root.SumSum.shizi
  }

  var KEY = 'sumsum:shizi:wrong:v3'
  /* v2/v1 只用来第一次迁移，迁完留着不删：老备份文件里还是这些键 */
  var KEY_V2 = 'sumsum:shizi:wrong:v2'
  var KEY_V1 = 'sumsum:shizi:wrong:v1'
  var PICK_KEY = 'sumsum:shizi:picks:v1'
  var UNDO_KEY = 'sumsum:shizi:undo:v1'
  var PAPERS_KEY = 'sumsum:shizi:daily:v1'
  var PAPERS_MAX = 60
  var LOG_KEY = 'sumsum:shizi:log:v1'
  var LOG_MAX = 120

  function isObj(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v)
  }

  function readJSON(k) {
    try {
      return JSON.parse(root.localStorage.getItem(k))
    } catch (e) {
      return null
    }
  }

  function writeJSON(k, v) {
    try {
      root.SumSum.store.set(k, v)
    } catch (e) {
      /* 隐私模式下写入失败可忽略 */
    }
  }

  /* 本地日期。toISOString 是 UTC，北京时间早上 8 点前会算成前一天，所以自己拼。
     setToday 是测试钩子：浏览器实测「隔天」不必真等到明天。 */
  var todayFn = null
  function today() {
    if (todayFn) return todayFn()
    var d = new Date()
    var p = function (n) {
      return (n < 10 ? '0' : '') + n
    }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  }

  function setToday(fn) {
    todayFn = typeof fn === 'function' ? fn : null
  }

  /* ---------- 错字集（v3） ---------- */

  /* 老的 v2/v1 原样读回来（不清洗——清洗交给 migrateWrong） */
  function loadV2Raw() {
    var raw = readJSON(KEY_V2)
    if (isObj(raw)) return raw
    var old = readJSON(KEY_V1)
    if (Array.isArray(old)) {
      var map = {}
      old.forEach(function (ch) {
        if (typeof ch === 'string' && ch) map[ch] = { add: '' }
      })
      return map
    }
    return {}
  }

  /* v3：有就用（条目防线同 v2 时代），没有就把 v2/v1 迁进来。
     在集的字一律今天到期——一轮刚摸完底，从今天开始按新阶梯走。 */
  function loadMarks() {
    var raw = readJSON(KEY)
    if (isObj(raw)) {
      var map = {}
      Object.keys(raw).forEach(function (ch) {
        var e = raw[ch]
        if (isObj(e) && (typeof e.add === 'string' || typeof e.out === 'string')) map[ch] = e
      })
      return map
    }
    var m = C().migrateWrong(loadV2Raw(), today())
    writeJSON(KEY, m)
    return m
  }

  var marks = loadMarks()

  function saveMarks() {
    writeJSON(KEY, marks)
  }

  /* ---------- 复习记录（键与格式都不变） ---------- */

  function loadLog() {
    var raw = readJSON(LOG_KEY)
    return Array.isArray(raw)
      ? raw.filter(function (r) {
          return isObj(r) && typeof r.d === 'string' && typeof r.seen === 'string'
        })
      : []
  }

  var log = loadLog()

  function saveLog() {
    writeJSON(LOG_KEY, log.slice(-LOG_MAX))
  }

  function todayLog() {
    var t = today()
    return log.length && log[log.length - 1].d === t ? log[log.length - 1] : null
  }

  /* ---------- 每日卷存储（Task 5 的面板从这里取） ---------- */

  function loadPapers() {
    var p = readJSON(PAPERS_KEY)
    return isObj(p) && Array.isArray(p.papers) ? p : { papers: [] }
  }

  var papers = loadPapers()

  function savePapers() {
    writeJSON(PAPERS_KEY, { papers: papers.papers.slice(-PAPERS_MAX) })
  }

  function paperCount() {
    return papers.papers.length
  }

  function paperAt(i) {
    return papers.papers[i] || null
  }

  /*
   * 拿「该看的那张卷」：有未登记的就先登记它（哪怕是昨天的）；
   * 今天已经登记过 → 就是它（今天完成了）；否则生成今天的新卷。
   * 一天一卷由「papers 只在生成时追加」保证；作废（discardPaper）是唯一的删法。
   */
  function ensurePaper() {
    var t = today()
    var last = papers.papers[papers.papers.length - 1] || null
    if (last && !last.settled) return last
    if (last && last.d === t) return last
    var b = C().buildDaily(marks, t)
    var p = { d: t, chars: b.chars.join(''), wrong: b.wrong.join(''), settled: false }
    papers.papers.push(p)
    savePapers()
    return p
  }

  /* 作废最后一张未登记的卷：字的数据一律不动，当天可以重新生成一张 */
  function discardPaper() {
    var last = papers.papers[papers.papers.length - 1]
    if (!last || last.settled) return false
    papers.papers.pop()
    clearPicks(Array.from(last.chars))
    savePapers()
    return true
  }

  /* ---------- 点选集：点了 = 没认出，只存当天 ---------- */

  function loadPicks() {
    var p = readJSON(PICK_KEY)
    return isObj(p) && typeof p.d === 'string' && typeof p.chars === 'string' ? p : { d: '', chars: '' }
  }

  var picks = loadPicks()

  function savePicks() {
    writeJSON(PICK_KEY, picks)
  }

  function picked(ch) {
    return picks.d === today() && picks.chars.indexOf(ch) >= 0
  }

  /* 点一下切换选中/取消。登记前再点一下 = 撤回这一个 */
  function togglePick(ch) {
    if (!ch) return
    if (picks.d !== today()) picks = { d: today(), chars: '' }
    var i = picks.chars.indexOf(ch)
    if (i >= 0) picks.chars = picks.chars.slice(0, i) + picks.chars.slice(i + 1)
    else picks.chars += ch
    savePicks()
    fire()
  }

  /* 登记后只清掉这批字的选择；别的卷上点的还留着（那边登记时用） */
  function clearPicks(chs) {
    var drop = {}
    ;(chs || []).forEach(function (ch) {
      drop[ch] = true
    })
    picks.chars = Array.from(picks.chars)
      .filter(function (ch) {
        return !drop[ch]
      })
      .join('')
    savePicks()
  }

  function pickCount() {
    return picks.d === today() ? Array.from(picks.chars).length : 0
  }

  /* ---------- 查询 ---------- */

  function stateOfCh(ch) {
    return C().stateOf(marks[ch])
  }

  function has(ch) {
    return stateOfCh(ch) !== 'out'
  }

  function members() {
    return Object.keys(marks).filter(has)
  }

  function size() {
    return members().length
  }

  function countOf(ch) {
    return C().markCount(marks[ch])
  }

  /* 还差几次毕业（在集的字才有意义），格子右上角的数字 */
  function remainingOf(ch) {
    var e = marks[ch]
    if (!e || e.out) return 0
    return C().passesNeeded(C().markCount(e)) - (e.k || 0)
  }

  /* 其中只差一次认出就毕业的 */
  function onceCount() {
    return members().filter(function (ch) {
      return remainingOf(ch) === 1
    }).length
  }

  /* 今天到期的字数（每日一卷页签的徽标用） */
  function dueCount() {
    var t = today()
    return members().filter(function (ch) {
      var due = marks[ch].due
      return !due || due <= t
    }).length
  }

  var REPEAT_MIN = 2
  function repeats() {
    var chars = C().sortByTable(
      Object.keys(marks).filter(function (ch) {
        return countOf(ch) >= REPEAT_MIN
      })
    )
    var rank = {}
    chars.forEach(function (ch, i) {
      rank[ch] = i
    })
    return chars
      .sort(function (a, b) {
        return countOf(b) - countOf(a) || rank[a] - rank[b]
      })
      .map(function (ch) {
        return { ch: ch, n: countOf(ch), on: has(ch) }
      })
  }

  function all() {
    return C().sortByTable(members())
  }

  /* 卷面上这些字里，哪些是旧错字（在集的） */
  function onSheet(chars) {
    var seen = {}
    return (chars || []).filter(function (ch) {
      if (seen[ch]) return false
      seen[ch] = true
      return has(ch)
    })
  }

  function pickedIn(chars) {
    var seen = {}
    return (chars || []).filter(function (ch) {
      if (seen[ch]) return false
      seen[ch] = true
      return picked(ch)
    })
  }

  function history() {
    return {
      stats: C().historyStats(marks),
      log: log.slice().reverse()
    }
  }

  /* ---------- 登记与撤销 ---------- */

  /* 撤销快照隔天作废：昨天的登记已经「落章」，再撤会跟今天的记录打架 */
  var undoSlot = readJSON(UNDO_KEY)
  if (undoSlot && undoSlot.d !== today()) {
    undoSlot = null
    root.SumSum.store.remove(UNDO_KEY)
  }

  function settle(chars, paper) {
    var t = today()
    var pickedMap = {}
    if (picks.d === t) {
      Array.from(picks.chars).forEach(function (ch) {
        pickedMap[ch] = true
      })
    }
    /* settleApply 是纯函数：先算出结果，判断这一笔是不是空操作 ——
       重复登记同一张卷（点选已吃掉、同日幂等全拦住）什么都不该改，
       更不能把撤销槽覆盖掉，否则「撤销登记」变成无声的无效按钮。 */
    var r = C().settleApply(marks, chars, pickedMap, t)
    var marksChanged = JSON.stringify(r.marks) !== JSON.stringify(marks)
    var paperLocks = !!(paper && !paper.settled)
    if (!marksChanged && !paperLocks) {
      fire()
      return
    }
    /* 整卷回滚的快照：marks、复习记录、每日卷、点选，四个一起拍。
       点选必须跟着还原 —— 撤销后重新登记，真错的字还得是「点了」的状态，
       不然会被记成认出。kind 记下这一笔是哪种卷，两个撤销按钮各撤各的。 */
    writeJSON(UNDO_KEY, {
      d: t,
      marks: marks,
      log: log,
      papers: papers,
      picks: picks,
      kind: paper ? 'daily' : 'sheet'
    })
    undoSlot = readJSON(UNDO_KEY)
    marks = r.marks
    if (r.seen.length) {
      var row = log.length && log[log.length - 1].d === t ? log[log.length - 1] : null
      if (!row) {
        row = { d: t, seen: '' }
        log.push(row)
      }
      r.seen.forEach(function (ch) {
        if (row.seen.indexOf(ch) < 0) row.seen += ch
      })
      C().refreshRow(row, marks, t)
    }
    if (paper) {
      paper.settled = true
      savePapers()
    }
    clearPicks(chars)
    saveMarks()
    saveLog()
    fire()
  }

  function undoSettle() {
    if (!undoSlot || undoSlot.d !== today()) return
    marks = isObj(undoSlot.marks) ? undoSlot.marks : {}
    log = Array.isArray(undoSlot.log) ? undoSlot.log : []
    if (isObj(undoSlot.papers)) {
      papers = undoSlot.papers
      savePapers()
    }
    if (isObj(undoSlot.picks)) {
      picks = undoSlot.picks
      savePicks()
    }
    saveMarks()
    saveLog()
    root.SumSum.store.remove(UNDO_KEY)
    undoSlot = null
    fire()
  }

  /* kind 可选：'daily'（每日一卷那笔）/ 'sheet'（周卷、错字卷那笔）。
     同一天两笔登记只有最新一笔可撤，按钮按 kind 判断自己那笔还在不在。 */
  function canUndo(kind) {
    return !!undoSlot && undoSlot.d === today() && (!kind || undoSlot.kind === kind)
  }

  /* 「清空错字集」：在集的一律当作今天毕业（n 与 first 留着，历史统计不丢）。
     跟登记一样不可逆（面板上有 confirm 拦一道），点选集顺手全清，免得残留的选择
     把刚毕业的字又收回来。 */
  function clear() {
    var t = today()
    Object.keys(marks).forEach(function (ch) {
      var e = marks[ch]
      if (!e || e.out) return
      var o = { n: C().markCount(e), out: t }
      if (e.first) o.first = e.first
      marks[ch] = o
    })
    picks = { d: '', chars: '' }
    savePicks()
    saveMarks()
    fire()
  }

  /* ---------- 屏幕投影 ---------- */

  var listeners = []

  function fire() {
    listeners.forEach(function (fn) {
      fn(size())
    })
  }

  function onChange(fn) {
    listeners.push(fn)
  }

  function paintCell(cell, ch, noPick) {
    var st = stateOfCh(ch)
    var n = countOf(ch)
    cell.classList.toggle('is-wrong', st !== 'out')
    cell.classList.toggle('is-once', st === 'once')
    /* 往期卷（只读锁）上不画今天的点选高亮：那是今天那张卷的状态，画到旧卷上只会误导 */
    cell.classList.toggle('is-pick', !noPick && picked(ch))
    if (n >= REPEAT_MIN) cell.dataset.n = n
    else delete cell.dataset.n
    var rem = remainingOf(ch)
    if (st !== 'out' && rem > 0) cell.dataset.k = rem
    else delete cell.dataset.k
  }

  function paint() {
    var preview = doc.getElementById('preview')
    var locked = !!preview && preview.dataset.locked === '1'
    var cells = doc.querySelectorAll('#preview .shizi-cell')
    for (var i = 0; i < cells.length; i++) paintCell(cells[i], cells[i].dataset.ch, locked)
  }

  function bind() {
    var preview = doc.getElementById('preview')
    if (!preview) return
    preview.addEventListener('click', function (ev) {
      if (preview.dataset.locked === '1') return // 往期卷只读
      var cell = ev.target.closest ? ev.target.closest('.shizi-cell') : null
      if (!cell || !preview.contains(cell)) return
      var ch = cell.dataset.ch
      if (!ch) return
      togglePick(ch)
      var same = preview.querySelectorAll('.shizi-cell[data-ch="' + ch.replace(/"/g, '\\"') + '"]')
      for (var i = 0; i < same.length; i++) paintCell(same[i], ch)
    })
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.shiziMark = {
    bind: bind,
    paint: paint,
    onChange: onChange,
    setToday: setToday,
    today: today,
    has: has,
    size: size,
    countOf: countOf,
    onceCount: onceCount,
    dueCount: dueCount,
    remainingOf: remainingOf,
    repeats: repeats,
    all: all,
    onSheet: onSheet,
    pickedIn: pickedIn,
    picked: picked,
    pickCount: pickCount,
    togglePick: togglePick,
    settle: settle,
    undoSettle: undoSettle,
    canUndo: canUndo,
    clear: clear,
    todayLog: todayLog,
    history: history,
    weightOf: function (ch) {
      return C().reviewWeight(marks[ch])
    },
    ensurePaper: ensurePaper,
    discardPaper: discardPaper,
    paperAt: paperAt,
    paperCount: paperCount
  }
})(typeof window !== 'undefined' ? window : globalThis)
