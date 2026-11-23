/**
 * 登记页（/mark?id=<纸号>）：家长扫纸角二维码打开，手机优先，电脑也能用。
 *
 * 上面是扫的这张纸，下面接着列「今天还没登记的纸」（今天和昨天打印、还没登记的），一页点完。
 * 登记方式按板块（sheets-core MODULE_KIND）：
 *   three：会了 / 一般 / 不会，可展开逐题点错（点过就按错题比例自动选档）——口算、奥数（复习卷每课一行）
 *   game ：太简单 / 刚好 / 太难 → 下一张自动升降关
 *   chars：点没认出的字 → 「登记结果」，与识字页同一套结算（shizi-mark）
 *   link ：拼音规则多，跳回拼音页这张卷的登记区
 * 点了就存（sheets-core saveRating：改档先撤回再作用，不叠加），没有「提交」按钮。
 *
 * 必须等登录与同步完成再画（accountUI.initialSync）：电脑刚打印的纸要先从云端拉下来。
 */
;(function (root) {
  'use strict'

  var doc = root.document
  var S = root.SumSum
  var SC = S.sheetsCore
  var page = doc.getElementById('mark-page')
  var params = new URLSearchParams(root.location.search)
  var mainId = params.get('id') || ''

  var THREE = [
    { lv: 'good', text: '会了' },
    { lv: 'ok', text: '一般' },
    { lv: 'bad', text: '不会' }
  ]
  var GAME = [
    { lv: 'good', text: '太简单' },
    { lv: 'ok', text: '刚好' },
    { lv: 'bad', text: '太难' }
  ]

  /* 每张纸在本页的临时状态：{ levels, wrong:Set, open } */
  var ui = {}
  var listIds = [] /* 下半部列表里出现过的纸（登记完也留着） */

  function esc(str) {
    return String(str).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  function md(d) {
    var p = String(d).split('-')
    return Number(p[1]) + ' 月 ' + Number(p[2]) + ' 日'
  }

  function today() {
    return S.sheets && S.sheets.today ? S.sheets.today() : todayStr()
  }
  function todayStr() {
    var d = new Date()
    var p = function (n) { return (n < 10 ? '0' : '') + n }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  }

  function load(id) {
    return SC.parse(S.store.getString(SC.keyOf(id)))
  }

  /* 识字每日卷：按日期找回那张卷（shizi-mark 的 papers） */
  function shiziPaper(rec) {
    var M = S.shiziMark
    if (!M || !rec.ref || rec.ref.kind !== 'daily') return null
    for (var i = M.paperCount() - 1; i >= 0; i--) {
      var p = M.paperAt(i)
      if (p && p.d === rec.ref.d) return p
    }
    return null
  }

  function isDone(rec) {
    if (SC.rated(rec) || rec.done) return true
    if (rec.module === 'shizi') {
      var p = shiziPaper(rec)
      return !!(p && p.settled)
    }
    return false
  }

  function stateOf(rec) {
    if (!ui[rec.id]) {
      var levels = {}
      Object.keys(rec.rating || {}).forEach(function (u) {
        levels[u] = { level: rec.rating[u].level, auto: rec.rating[u].auto }
      })
      ui[rec.id] = { levels: levels, wrong: new Set(rec.wrong || []), open: !!(rec.wrong && rec.wrong.length) }
    }
    return ui[rec.id]
  }

  /* ---------- 卡片 ---------- */

  function segHTML(rec, unit, opts, chosen) {
    return '<div class="seg3" role="group">' + opts.map(function (o) {
      return '<button type="button" class="seg3-btn' + (chosen === o.lv ? ' on' : '') + '" data-sheet="' + rec.id +
        '" data-unit="' + esc(unit) + '" data-lv="' + o.lv + '" aria-pressed="' + (chosen === o.lv) + '">' + o.text + '</button>'
    }).join('') + '</div>'
  }

  function itemsHTML(rec, st) {
    var units = rec.units || []
    var multi = units.length > 1
    var groups = multi ? units.map(function (u) {
      return { unit: u, items: rec.items.filter(function (it) { return it.unit === u.key }) }
    }) : [{ unit: null, items: rec.items }]
    return groups.map(function (g) {
      return (g.unit ? '<p class="items-unit">' + esc(g.unit.label) + '</p>' : '') +
        '<div class="items ' + (rec.module === 'kousuan' ? 'items-kousuan' : 'items-no') + '">' +
        g.items.map(function (it) {
          var on = st.wrong.has(it.key)
          return '<button type="button" class="item' + (on ? ' on' : '') + '" data-sheet="' + rec.id +
            '" data-item="' + esc(it.key) + '" aria-pressed="' + on + '">' + esc(it.label) + '</button>'
        }).join('') + '</div>'
    }).join('')
  }

  function threeBody(rec, st) {
    var units = rec.units || []
    var html = ''
    if (units.length <= 1) {
      var u = units[0] ? units[0].key : 'all'
      html += segHTML(rec, u, THREE, st.levels[u] && st.levels[u].level)
    } else {
      html += units.map(function (unit) {
        return '<div class="unit-row"><span class="unit-name">' + esc(unit.label) + '</span>' +
          segHTML(rec, unit.key, THREE, st.levels[unit.key] && st.levels[unit.key].level) + '</div>'
      }).join('')
    }
    html += '<p class="rule">会了：全对或只错 1 题　一般：错了几题　不会：错一半以上，或做不下去</p>'
    if (rec.items && rec.items.length) {
      html += '<button type="button" class="link-btn" data-sheet="' + rec.id + '" data-expand>' +
        (st.open ? '收起错题' : '展开点错题（更准）') + '</button>'
      if (st.open) {
        html += '<p class="rule">点做错的题，档位会按错题多少自动选好。点错了再点一下取消。</p>' + itemsHTML(rec, st)
      }
    }
    return html
  }

  function gameBody(rec, st) {
    var cur = (rec.ref && rec.ref.settings) || {}
    return segHTML(rec, 'all', GAME, st.levels.all && st.levels.all.level) +
      '<p class="rule">这张是' + esc(SC.gameLevelText(rec.module, cur)) + '。太简单下一张升一档，太难降一档，刚好不变。</p>'
  }

  function charsBody(rec) {
    var M = S.shiziMark
    var chars = (rec.items || []).map(function (it) { return it.key })
    if (isDone(rec)) {
      return '<p class="rule">这张卷已经登记过了。没认出的字会自动安排复习。</p>'
    }
    var paper = shiziPaper(rec)
    if (rec.ref && rec.ref.kind === 'daily' && !paper) {
      return '<p class="rule">这张每日卷在这台设备上找不到了（可能已经作废）。到识字页看看。</p>'
    }
    return '<p class="rule">点孩子<b>没认出</b>的字，再点「登记结果」。没点的算认出。</p>' +
      '<div class="chars">' + chars.map(function (ch) {
        var on = M.picked(ch)
        return '<button type="button" class="ch' + (on ? ' on' : '') + '" data-sheet="' + rec.id + '" data-ch="' + esc(ch) +
          '" aria-pressed="' + on + '">' + esc(ch) + '</button>'
      }).join('') + '</div>' +
      '<button type="button" class="btn btn-primary btn-block" data-sheet="' + rec.id + '" data-settle>登记结果</button>'
  }

  function linkBody(rec) {
    var sid = rec.ref && rec.ref.sheetId
    return '<p class="rule">拼音要逐题登记（顺的不点、提示了、没读出、停在哪题），在拼音页这张卷上点。</p>' +
      '<a class="btn btn-primary btn-block" href="pinyin.html?sheet=' + encodeURIComponent(sid || '') + '#mark">去拼音页登记</a>'
  }

  /* 存好以后告诉家长：下一张会怎么变 */
  function effectHTML(rec) {
    if (!SC.rated(rec)) return ''
    var msg = ''
    if (rec.module === 'kousuan') {
      var nx = SC.kousuanNext(rec, S.store.get('sumsum:settings:v1') || { carryMode: 'random' })
      var parts = []
      if (nx.mustInclude.length) parts.push('再出这 ' + nx.mustInclude.length + ' 道错题')
      if (nx.carryOverride) parts.push('多出进位、退位的题')
      msg = parts.length ? '下一张口算会' + parts.join('，') + '。' : '下一张口算照常出。'
    } else if (rec.module === 'aoshu') {
      msg = (rec.units || []).map(function (u) {
        var lv = SC.levelOf(rec, u.key)
        if (!lv) return ''
        return esc(u.label) + '：' + (lv === 'good' ? '已标为学过' : lv === 'ok' ? '已标为学过，放进待复习' : '先不标学过，「今天」页可以再练一张')
      }).filter(Boolean).join('；') + '。'
    } else if (SC.MODULE_KIND[rec.module] === 'game') {
      var a = rec.applied
      var cur = Object.assign({}, rec.ref && rec.ref.settings)
      var f = rec.module === 'shudu' ? 'clues' : 'level'
      if (a && a.changed) {
        cur[f] = a.next
        msg = '下一张自动' + (rec.rating.all.level === 'good' ? '加难' : '降难') + '到' + SC.gameLevelText(rec.module, cur) + '。'
      } else {
        msg = '下一张难度不变。'
      }
    }
    return msg ? '<p class="effect">' + msg + '</p>' : ''
  }

  function cardHTML(rec) {
    var st = stateOf(rec)
    var kind = SC.MODULE_KIND[rec.module]
    var done = isDone(rec)
    var body = kind === 'three' ? threeBody(rec, st)
      : kind === 'game' ? gameBody(rec, st)
      : kind === 'chars' ? charsBody(rec)
      : linkBody(rec)
    return '<section class="mcard" data-card="' + rec.id + '">' +
      '<header class="mcard-head"><span class="tag">' + esc(SC.MODULE_LABEL[rec.module] || '') + '</span>' +
      '<b class="mcard-title">' + esc(rec.title) + '</b>' +
      '<span class="mcard-date">' + md(rec.date) + (done ? ' · <span class="ok">已登记</span>' : '') + '</span></header>' +
      body + effectHTML(rec) + '</section>'
  }

  /* ---------- 整页 ---------- */

  function render() {
    var recs = SC.records(S.store)
    var main = SC.validId(mainId) ? load(mainId) : null
    var html = ''
    if (!SC.validId(mainId)) {
      html += notice('这个二维码看不懂', '请对着纸角的二维码重新扫一次。')
    } else if (!main) {
      var tries = 0
      try { tries = Number(root.sessionStorage.getItem('sumsum:mark:retry:' + mainId)) || 0 } catch (e) { /* 忽略 */ }
      html += tries < 2
        ? notice('电脑那边还没同步好', '刚点完打印的话，等几秒再刷新一下。', true)
        : notice('找不到这张纸', '可能是别的账号打印的，或者已经超过 60 天。换成打印这张纸的账号登录再扫。', true)
    } else {
      html += cardHTML(main)
    }
    var pend = SC.pending(recs.map(function (r) {
      return isDone(r) ? Object.assign({}, r, { done: true }) : r
    }), today()).filter(function (r) { return r.id !== mainId })
    /* 本页登记过的卡片留在原位（显示「已登记」，还能改档），不会一点就消失 */
    pend.forEach(function (r) { if (listIds.indexOf(r.id) < 0) listIds.push(r.id) })
    var rest = listIds.map(load).filter(Boolean)
    var left = rest.filter(function (r) { return !isDone(r) }).length
    var total = left + (main && !isDone(main) ? 1 : 0)
    if (rest.length) {
      html += '<h2 class="mark-sub">今天打印的其他纸' + (left ? ' · ' + left + ' 张没登记' : '') + '</h2>' + rest.map(cardHTML).join('')
    }
    if (main && !total) html += '<p class="mark-all">今天的纸都登记好了。</p>'
    page.innerHTML = html
    doc.getElementById('work-sum').textContent = total ? '还有 ' + total + ' 张没登记' : '孩子做完后，点一下哪里卡住了'
  }

  function notice(title, text, retry) {
    return '<section class="mcard mcard-empty"><b>' + esc(title) + '</b><p>' + esc(text) + '</p>' +
      (retry ? '<button type="button" class="btn btn-primary" data-retry>刷新</button>' : '') + '</section>'
  }

  function save(rec, st) {
    var levels = {}
    Object.keys(st.levels).forEach(function (u) { levels[u] = st.levels[u] })
    var saved = SC.saveRating(S.store, rec, levels, Array.from(st.wrong), Date.now(), {
      clueRange: S.shudu && S.shudu.clueRange
    })
    return saved
  }

  page.addEventListener('click', function (e) {
    if (e.target.closest('[data-retry]')) {
      try {
        var k = 'sumsum:mark:retry:' + mainId
        root.sessionStorage.setItem(k, String((Number(root.sessionStorage.getItem(k)) || 0) + 1))
        root.sessionStorage.removeItem('sumsum:sync:reloaded')
      } catch (err) { /* 忽略 */ }
      root.location.reload()
      return
    }
    var b = e.target.closest('[data-sheet]')
    if (!b) return
    var rec = load(b.dataset.sheet)
    if (!rec) return
    var st = stateOf(rec)
    if (b.hasAttribute('data-lv')) {
      st.levels[b.dataset.unit] = { level: b.dataset.lv, auto: false }
      save(rec, st)
    } else if (b.hasAttribute('data-expand')) {
      st.open = !st.open
    } else if (b.hasAttribute('data-item')) {
      var key = b.dataset.item
      if (st.wrong.has(key)) st.wrong.delete(key)
      else st.wrong.add(key)
      st.levels = SC.autoLevel(rec, st.levels, st.wrong, key) /* 只重算这道题所在的那一课 */
      save(rec, st)
    } else if (b.hasAttribute('data-ch')) {
      S.shiziMark.togglePick(b.dataset.ch)
    } else if (b.hasAttribute('data-settle')) {
      var chars = (rec.items || []).map(function (it) { return it.key })
      var paper = shiziPaper(rec)
      S.shiziMark.settle(chars, paper || undefined)
      rec.done = true
      rec.doneAt = Date.now()
      S.store.set(SC.keyOf(rec.id), rec)
    }
    render()
  })

  /* ---------- 启动：等登录与同步，但最多等 8 秒；出错把原因写在页面底部，方便家长截图给站长 ---------- */
  var problems = []
  var syncState = '同步中'
  function note(msg) {
    problems.push(String(msg).slice(0, 200))
    paintDiag()
  }
  function paintDiag() {
    var el = doc.getElementById('mark-diag')
    if (!el) {
      el = doc.createElement('p')
      el.id = 'mark-diag'
      el.className = 'mark-diag'
      page.parentNode.appendChild(el)
    }
    var n = 0
    try { n = SC.records(S.store).length } catch (e) { /* 忽略 */ }
    el.textContent = '本机纸记录 ' + n + ' 张 · ' + syncState + (problems.length ? ' · ' + problems.join(' / ') : '')
  }
  root.addEventListener('error', function (e) { note('脚本错误：' + (e.message || e.type)) })
  root.addEventListener('unhandledrejection', function (e) {
    note('脚本错误：' + (e.reason && (e.reason.message || e.reason)))
  })

  var drawn = false
  function safeRender() {
    try {
      render()
      drawn = true
    } catch (err) {
      note('画页面出错：' + (err && err.message))
      page.innerHTML = notice('页面出了点问题', '请把这一页截图发给站长。', true)
    }
    paintDiag()
  }

  var ready = S.accountUI && S.accountUI.initialSync ? S.accountUI.initialSync : Promise.resolve()
  ready.then(function () {
    syncState = '已同步'
    safeRender()
  }, function (err) {
    syncState = '同步失败'
    note(err && err.message)
    safeRender()
  })
  setTimeout(function () {
    if (drawn) return
    syncState = '同步超过 8 秒还没完成'
    safeRender()
  }, 8000)
  root.document.documentElement.setAttribute('data-sumsum-ready', '1')
})(window)
