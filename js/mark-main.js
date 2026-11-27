/**
 * 打分页（/mark?id=<纸号> 或 /mark?module=<板块>）：家长扫纸角二维码打开，手机优先，电脑也能用。
 * 卡片、待打分、历史都在 js/mark-panel.js（各练习页右侧「打分」抽屉用的是同一个）；
 * 这里只管扫码那一层：二维码不对、电脑还在上传（自动等 2 分钟）、游戏纸、其他板块，以及诊断行。
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
  var askedModule = params.get('module') || ''

  function esc(s) { return S.rate.esc(s) }

  function load(id) {
    return SC.parse(S.store.getString(SC.keyOf(id)))
  }

  function notice(title, text, retry) {
    return '<section class="mcard mcard-empty"><b>' + esc(title) + '</b><p>' + esc(text) + '</p>' +
      (retry ? '<button type="button" class="btn btn-primary" data-retry>刷新</button>' : '') + '</section>'
  }

  /* 扫码打开时最上面的提示：二维码不对、还在读取、电脑还在上传、游戏纸 */
  function top(ctx) {
    if (!mainId) return null
    if (!SC.validId(mainId)) return { html: notice('这个二维码看不懂', '请对着纸角的二维码重新扫一次。') }
    if (!ctx.main && tSync == null) {
      /* 同步还没回来（国内连海外服务器常要十几秒）：别说「电脑没同步好」吓人，读到了会自动重画 */
      return { html: notice('网络有点慢，还在读取', '读到了会自动显示，不用刷新。') }
    }
    if (!ctx.main && !waitGaveUp) {
      /* 同步完了还没有：多半是电脑刚打印、还在上传。自动隔几秒再查，查到直接显示 */
      startWait()
      return { html: notice('电脑那边还在上传这张纸', '正在自动等，传上来了会直接显示，不用刷新。已等 ' +
        Math.round((Date.now() - waitStart) / 1000) + ' 秒。') }
    }
    if (!ctx.main) {
      return { html: notice('找不到这张纸',
        '等了两分钟，电脑那边还是没把这张纸传上来。请看电脑上打印后有没有出现「已存到云端」：没有的话，在电脑上刷新页面，再点一次打印。' +
        '如果这张纸是别的账号打印的，要换成那个账号登录再扫。', true) }
    }
    if (!SC.isPractice(ctx.main.module)) {
      return { html: notice('游戏不用打分了', '数独、火柴这些游戏纸，孩子玩得开心就好。想换难度，在游戏页上直接调。'), module: '', hideMain: true }
    }
    return null
  }

  var panel = S.markPanel.mount(page, {
    module: askedModule,
    mainId: mainId,
    top: top,
    others: true,
    onRender: function (info) {
      doc.getElementById('work-sum').textContent = info.module
        ? (info.total ? info.label + '还有 ' + info.total + ' 张没打分' : info.label + '：全对选「全对」，有错点出来，再提交')
        : '孩子做完后，全对选「全对」，有错点出来'
    }
  })
  function render() { panel.render() }

  page.addEventListener('click', function (e) {
    if (!e.target.closest('[data-retry]')) return
    try {
      var k = 'sumsum:mark:retry:' + mainId
      root.sessionStorage.setItem(k, String((Number(root.sessionStorage.getItem(k)) || 0) + 1))
      root.sessionStorage.removeItem('sumsum:sync:reloaded')
    } catch (err) { /* 忽略 */ }
    root.location.reload()
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
