/**
 * 打分页（/mark?id=<纸号> 或 /mark?module=<板块>）：家长扫纸角二维码打开，手机优先，电脑也能用
 * （各练习板块页上的「打分」按钮也进这里）。2026-11-27 改版，设计稿
 * docs/superpowers/specs/2026-11-27-practice-loop-design.md：
 *
 *   上面：扫的这一张；
 *   中间：同一个板块里还没打分的（打印后 2 天内），一个板块一个板块地打，不再混在一起；
 *   下面：这个板块的历史（60 天内的纸），点一行展开补打 / 改；
 *   最后：其他板块还有几张没打分，点了去那个板块。
 *
 * 每张纸只有一种打法：选「全对」或点错题 → 提交（js/rate.js）。提交后：
 *   口算 / 奥数 → sheetsCore.submit（档位按错题比例自动算）；
 *   识字 → shiziMark.settle（与识字页「登记结果」同一套，规则不动）；
 *   拼音 → sheetsCore.pinyinResults 换成每题结果写 pinyin:mark（与拼音页同一套）。
 * 游戏 2026-11-27 起不打分。
 *
 * 必须等登录与同步完成再画（accountUI.initialSync）：电脑刚打印的纸要先从云端拉下来。
 */
;(function (root) {
  'use strict'

  var doc = root.document
  var S = root.SumSum
  var SC = S.sheetsCore
  var R = S.rate
  var page = doc.getElementById('mark-page')
  var params = new URLSearchParams(root.location.search)
  var mainId = params.get('id') || ''
  var askedModule = params.get('module') || ''

  var opened = {} /* 历史里展开的纸 */
  var listIds = [] /* 本页列过的待打分纸：打完分留在原位显示「已打分」，不会一点就消失 */

  var esc = R.esc

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

  /* 识字每日卷：按日期 + 字找回那张卷（shizi-mark 的 papers）。只按日期会认错：
     同一天作废重出的卷日期一样、字不一样，打旧纸的分不能结到新卷上 */
  function shiziPaper(rec) {
    var M = S.shiziMark
    if (!M || !rec.ref || rec.ref.kind !== 'daily') return null
    var chars = (rec.items || []).map(function (it) { return it.key }).join('')
    for (var i = M.paperCount() - 1; i >= 0; i--) {
      var p = M.paperAt(i)
      if (p && p.d === rec.ref.d && Array.from(p.chars).join('') === chars) return p
    }
    return null
  }

  /* 拼音这张卷每题的结果（sumsum:pinyin:mark:v1:<卷号>:<题号>）；拼音页和这里打分写的都是它 */
  var PY_MARK = 'sumsum:pinyin:mark:v1:'
  function pinyinMarks(sheetId) {
    var out = {}
    var pre = PY_MARK + sheetId + ':'
    S.store.keys().forEach(function (k) {
      if (k.indexOf(pre) !== 0) return
      var v = S.store.get(k)
      if (v && v.result) out[k.slice(pre.length)] = v.result
    })
    return out
  }
  function pinyinSheetHere(rec) {
    return !!S.store.getString('sumsum:pinyin:sheet:v1:' + rec.ref.date + ':' + rec.ref.sheetId)
  }

  /* 打过分没有，以板块自己的数据为准（不信纸记录上的 done：识字页撤销登记、拼音页打分都不一定回写纸记录）：
     识字每日卷看那张卷 settled；拼音看这张卷有没有每题结果。只给这页看，不写回 */
  function withDone(rec) {
    if (rec.module === 'shizi' && rec.ref && rec.ref.kind === 'daily') {
      var p = shiziPaper(rec)
      if (p) return Object.assign({}, rec, { done: !!p.settled })
      return rec
    }
    if (rec.module === 'pinyin' && rec.ref && rec.ref.sheetId && !pinyinLegacy(rec)) {
      var mk = pinyinMarks(rec.ref.sheetId)
      var keys = Object.keys(mk)
      return Object.assign({}, rec, {
        done: keys.length > 0,
        wrong: keys.filter(function (k) { return mk[k] === 'miss' || mk[k] === 'hint' }),
        draftId: 'py-' + rec.ref.sheetId
      })
    }
    return rec
  }

  /* 拼音的老纸记录（2026-11-27 前打印的）没有题目清单，只能回拼音页 */
  function pinyinLegacy(rec) {
    return rec.module === 'pinyin' && !(rec.items && rec.items.length)
  }

  /* ---------- 卡片 ---------- */

  /* 存好以后告诉家长：下一张会怎么变 */
  function effectHTML(rec) {
    if (!SC.rated(rec)) return ''
    if (rec.module === 'kousuan') {
      var nx = SC.kousuanNext(rec, S.store.get('sumsum:settings:v1') || { carryMode: 'random' })
      var parts = []
      if (nx.mustInclude.length) parts.push('再出这 ' + nx.mustInclude.length + ' 道错题')
      if (nx.carryOverride) parts.push('多出进位、退位的题')
      return parts.length ? '下一张口算会' + parts.join('，') + '。' : '下一张口算照常出。'
    }
    if (rec.module === 'aoshu') {
      return (rec.units || []).map(function (u) {
        var lv = SC.levelOf(rec, u.key)
        if (!lv) return ''
        return esc(u.label) + '：' + (lv === 'good' ? '记为学会了' : lv === 'ok' ? '记为学过，过几天复习' : '还没学会，「今天」页可以再练一张')
      }).filter(Boolean).join('；') + '。'
    }
    return ''
  }

  function bodyHTML(rec) {
    var kind = SC.MODULE_KIND[rec.module]
    var done = SC.isDone(rec)
    if (pinyinLegacy(rec)) {
      return done ? '<p class="rule">这张卷已经打过分了。</p>'
        : '<p class="rule">这张是改版前打印的拼音卷，到拼音页打分。</p>' +
          '<a class="btn btn-primary btn-block" href="pinyin.html?sheet=' + encodeURIComponent((rec.ref && rec.ref.sheetId) || '') + '">去拼音页打分</a>'
    }
    if (rec.module === 'shizi' && !done && rec.ref && rec.ref.kind === 'daily' && !shiziPaper(rec)) {
      return '<p class="rule">这张每日卷在这台设备上找不到了（可能已经作废）。到识字页看看。</p>'
    }
    if (rec.module === 'pinyin' && !done && !pinyinSheetHere(rec)) {
      return '<p class="rule">这张拼音卷还没同步到这台设备。稍等一会儿刷新，或者到出卷的那台电脑上的拼音页打分。</p>'
    }
    /* 识字页上已经点过的字带过来，别在这里提交时被清掉 */
    if (rec.module === 'shizi' && !done && S.shiziMark) {
      var d0 = R.draft(rec)
      var picked = S.shiziMark.pickedIn((rec.items || []).map(function (it) { return it.key }))
      if (!d0.all && !d0.wrong.length && picked.length) R.setDraft(R.keyOf(rec), { all: false, wrong: picked, editing: false })
    }
    return R.body(rec, {
      kind: kind,
      done: done,
      result: SC.resultText(rec),
      canEdit: rec.module !== 'shizi',
      editHint: '识字要改，到识字页点「撤销登记」再重打。',
      effect: effectHTML(rec) || (rec.module === 'shizi' ? '没认出的字会自动安排复习。' : rec.module === 'pinyin' ? '卡住的内容会安排到后面的卷里再练。' : '')
    })
  }

  function cardHTML(rec, main) {
    var done = SC.isDone(rec)
    return '<section class="mcard' + (main ? ' mcard-main' : '') + '" data-card="' + rec.id + '">' +
      '<header class="mcard-head"><span class="tag">' + esc(SC.MODULE_LABEL[rec.module] || '') + '</span>' +
      '<b class="mcard-title">' + esc(rec.title) + '</b>' +
      '<span class="mcard-date">' + md(rec.date) + (done ? ' · <span class="ok">已打分</span>' : '') + '</span></header>' +
      bodyHTML(rec) + '</section>'
  }

  /* 历史一行：日期 · 标题 · 结论；点开就地展开成卡片 */
  function histRow(rec) {
    var r = SC.resultText(rec)
    var open = opened[rec.id]
    return '<li class="hrow' + (open ? ' is-open' : '') + '">' +
      '<button type="button" class="hrow-btn" data-open="' + rec.id + '" aria-expanded="' + !!open + '">' +
        '<span class="hrow-date">' + md(rec.date) + '</span><span class="hrow-title">' + esc(rec.title) + '</span>' +
        '<span class="hrow-st' + (r === '没打分' ? ' is-none' : r === '全对' ? ' is-ok' : ' is-bad') + '">' + r + '</span></button>' +
      (open ? cardHTML(rec) : '') + '</li>'
  }

  /* ---------- 整页 ---------- */

  function render() {
    var recs = SC.records(S.store).map(withDone)
    var byId = {}
    recs.forEach(function (r) { byId[r.id] = r })
    var main = SC.validId(mainId) ? byId[mainId] || null : null
    var module = main ? main.module : SC.isPractice(askedModule) ? askedModule : ''
    var html = ''

    if (mainId && !SC.validId(mainId)) {
      html += notice('这个二维码看不懂', '请对着纸角的二维码重新扫一次。')
    } else if (mainId && !main && tSync == null) {
      /* 同步还没回来（国内连海外服务器常要十几秒）：别说「电脑没同步好」吓人，读到了会自动重画 */
      html += notice('网络有点慢，还在读取', '读到了会自动显示，不用刷新。')
    } else if (mainId && !main && !waitGaveUp) {
      /* 同步完了还没有：多半是电脑刚打印、还在上传。自动隔几秒再查，查到直接显示 */
      startWait()
      html += notice('电脑那边还在上传这张纸', '正在自动等，传上来了会直接显示，不用刷新。已等 ' +
        Math.round((Date.now() - waitStart) / 1000) + ' 秒。')
    } else if (mainId && !main) {
      html += notice('找不到这张纸',
        '等了两分钟，电脑那边还是没把这张纸传上来。请看电脑上打印后有没有出现「已存到云端」：没有的话，在电脑上刷新页面，再点一次打印。' +
        '如果这张纸是别的账号打印的，要换成那个账号登录再扫。', true)
    } else if (main && !SC.isPractice(main.module)) {
      html += notice('游戏不用打分了', '数独、火柴这些游戏纸，孩子玩得开心就好。想换难度，在游戏页上直接调。')
      module = ''
    } else if (main) {
      html += cardHTML(main, true)
    }

    var label = SC.MODULE_LABEL[module] || ''
    if (module) {
      var pend = SC.pending(recs, today(), module).filter(function (r) { return r.id !== mainId })
      pend.forEach(function (r) { if (listIds.indexOf(r.id) < 0) listIds.push(r.id) })
      var rest = listIds.map(function (id) { return byId[id] }).filter(Boolean)
      var left = rest.filter(function (r) { return !SC.isDone(r) }).length
      if (rest.length) {
        html += '<h2 class="mark-sub">' + label + (main ? '还有' : '') + '没打分的纸' + (left ? ' · ' + left + ' 张' : '') + '</h2>' +
          rest.map(function (r) { return cardHTML(r) }).join('')
      } else if (!main) {
        html += '<p class="mark-all">' + label + '最近两天打印的纸都打好分了。</p>'
      }
      var shown = {}
      if (main) shown[main.id] = true
      rest.forEach(function (r) { shown[r.id] = true })
      var hist = SC.history(recs, module).filter(function (r) { return !shown[r.id] })
      if (hist.length) {
        html += '<h2 class="mark-sub">' + label + '历史<small>60 天内打印的纸，点开可以补打、改分</small></h2>' +
          '<ul class="hist">' + hist.map(histRow).join('') + '</ul>'
      }
    } else if (!mainId) {
      html += '<p class="mark-all">选一个板块打分。</p>'
    }

    /* 其他板块还有几张没打分 */
    var others = SC.PRACTICE.filter(function (m) { return m !== module }).map(function (m) {
      return { m: m, n: SC.pending(recs, today(), m).length }
    })
    var links = others.filter(function (o) { return o.n || !module }).map(function (o) {
      return '<a class="omod" href="/mark?module=' + o.m + '"><b>' + SC.MODULE_LABEL[o.m] + '</b>' +
        '<span>' + (o.n ? o.n + ' 张没打分' : '去看历史') + '</span></a>'
    })
    if (links.length) html += '<h2 class="mark-sub">' + (module ? '其他板块' : '板块') + '</h2><div class="omods">' + links.join('') + '</div>'

    page.innerHTML = html
    var total = (main && SC.isPractice(main.module) && !SC.isDone(main) ? 1 : 0) +
      (module ? SC.pending(recs, today(), module).filter(function (r) { return r.id !== mainId }).length : 0)
    doc.getElementById('work-sum').textContent = module
      ? (total ? label + '还有 ' + total + ' 张没打分' : label + '：全对选「全对」，有错点出来，再提交')
      : '孩子做完后，全对选「全对」，有错点出来'
  }

  function notice(title, text, retry) {
    return '<section class="mcard mcard-empty"><b>' + esc(title) + '</b><p>' + esc(text) + '</p>' +
      (retry ? '<button type="button" class="btn btn-primary" data-retry>刷新</button>' : '') + '</section>'
  }

  /* ---------- 提交 ---------- */

  function submit(rec, wrong) {
    var now = Date.now()
    if (rec.module === 'kousuan' || rec.module === 'aoshu') {
      SC.submit(S.store, rec, wrong, now)
      return
    }
    if (rec.module === 'shizi') {
      var M = S.shiziMark
      var chars = (rec.items || []).map(function (it) { return it.key })
      /* 点选集换成这次点的字，再走识字页同一个结算 */
      M.clearPicks(chars)
      wrong.forEach(function (ch) { if (!M.picked(ch)) M.togglePick(ch) })
      M.settle(chars, shiziPaper(rec) || undefined)
    } else if (rec.module === 'pinyin') {
      if (!pinyinSheetHere(rec)) return
      var res = SC.pinyinResults(rec, wrong)
      var sheet = { id: rec.ref.sheetId, date: rec.ref.date }
      Object.keys(res).forEach(function (k) { S.pinyinStorage.saveMark(sheet, k, { result: res[k] }) })
    }
    var fresh = load(rec.id) || rec
    fresh.done = true
    fresh.doneAt = now
    fresh.wrong = wrong.slice()
    delete fresh.skipped
    S.store.set(SC.keyOf(rec.id), fresh)
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
    var o = e.target.closest('[data-open]')
    if (o) {
      var id = o.getAttribute('data-open')
      opened[id] = !opened[id]
      render()
      return
    }
    R.click(e, {
      load: function (id) { var r = load(id); return r && withDone(r) },
      submit: submit,
      render: render
    })
  })

  /* ---------- 等电脑上传：每 4 秒只拉一次云端补纸，最多等 2 分钟 ---------- */
  var waitStart = 0
  var waitTimer = null
  var waitGaveUp = false
  var WAIT_MAX = 120000
  function startWait() {
    if (waitTimer || waitGaveUp) return
    if (!waitStart) waitStart = Date.now()
    waitTimer = setTimeout(function () {
      var sync = S.sync
      var pull = sync && sync.pullMissing ? sync.pullMissing(SC.isSheetKey) : Promise.resolve(0)
      pull.catch(function () { return 0 }).then(function () {
        waitTimer = null
        if (!load(mainId) && Date.now() - waitStart >= WAIT_MAX) waitGaveUp = true
        safeRender()
      })
    }, 4000)
  }

  /* ---------- 启动：等登录与同步，但最多等 8 秒；出错把原因写在页面底部，方便家长截图给站长 ---------- */
  var problems = []
  var syncState = '同步中'
  /* 用时诊断：页面脚本跑到这用了多久、同步完成又用了多久（手机上读取慢时看卡在哪段） */
  var tPage = now()
  var tSync = null
  function now() {
    try { return Math.round(root.performance.now() / 100) / 10 } catch (e) { return null }
  }
  function sec(ms) { return Math.round(ms / 100) / 10 }
  /* 分段：网页本身几秒到、静态文件最慢一个几秒、登录检查 / 拉取 / 推送各几秒（看卡在哪个请求） */
  function phases() {
    var out = []
    try {
      var nav = root.performance.getEntriesByType('navigation')[0]
      if (nav) out.push('网页 ' + sec(nav.responseEnd))
      var slow = 0
      var api = { me: null, pull: null, push: null }
      root.performance.getEntriesByType('resource').forEach(function (r) {
        var u = r.name
        if (/\/api\/auth\/me/.test(u)) api.me = r
        else if (/\/api\/data\/push/.test(u)) api.push = r
        else if (/\/api\/data(\?|$)/.test(u)) api.pull = r
        else if (/\/(js|css)\//.test(u)) slow = Math.max(slow, r.duration)
      })
      if (slow) out.push('最慢文件 ' + sec(slow))
      if (api.me) out.push('登录 ' + sec(api.me.duration))
      if (api.pull) out.push('拉取 ' + sec(api.pull.duration))
      if (api.push) out.push('推送 ' + sec(api.push.duration))
    } catch (e) { /* 老浏览器没有这些接口就不写 */ }
    return out.length ? ' · ' + out.join(' / ') : ''
  }
  function timing() {
    if (tPage == null) return ''
    return ' · 页面 ' + tPage + ' 秒' + (tSync != null ? ' · 同步完 ' + tSync + ' 秒' : '') + phases()
  }
  /* 同步迟迟不完：每 2 秒刷新一次诊断行，最多 60 秒，好看出最后卡多久 */
  var diagTicks = 0
  var diagTimer = setInterval(function () {
    diagTicks++
    if (tSync != null || diagTicks > 30) clearInterval(diagTimer)
    if (doc.getElementById('mark-diag')) paintDiag()
  }, 2000)
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
    el.textContent = '本机纸记录 ' + n + ' 张 · ' + syncState + timing() + (problems.length ? ' · ' + problems.join(' / ') : '')
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
    tSync = now()
    safeRender()
  }, function (err) {
    syncState = '同步失败'
    tSync = now()
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
