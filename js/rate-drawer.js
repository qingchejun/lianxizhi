/**
 * 打分抽屉（2026-11-27 打分统一）：练习四板块顶栏只有一个「打分」入口，点开是右侧抽屉，不跳页。
 * 抽屉里是 js/mark-panel.js——和手机扫码打分页同一个组件：
 *   屏幕上这张（打印过的；识字、拼音的卷固定，没打印也能打）→ 两天内没打分的 → 60 天历史（改一下）。
 * 按钮上带角标：这个板块两天内还没打分的张数。
 *
 * 电脑、手机写的是同一条纸记录（sumsum:sheet:v1:<id>）。抽屉打开时、页面回到前台时，从云端补一次：
 * 手机上打过的分马上看得到。识字、拼音的打分还写在板块自己的数据里，页面内存里有一份旧的，
 * 补到了这些键就刷新页面（不然页面上的旧数据之后会盖回去）。
 *
 * 提交后在 window 上发 'sumsum:rated'（detail: { module, id }），识字页据此出下一张、拼音页重画右栏。
 */
;(function (root) {
  'use strict'

  var doc = root.document
  var S = root.SumSum
  var module = ''
  var button = null
  var box = null
  var panel = null
  var lastFocus = null
  var REOPEN = 'zhihebi:rate-drawer:reopen'
  var unprinted = null /* 页面告诉抽屉：屏幕上这张没打印也能打分吗（识字、拼音） */

  function SC() { return S.sheetsCore }

  function isOpen() { return !!box && !box.hidden }

  /* 屏幕上这张：打印过就用纸记录；没打印过、页面又允许（识字、拼音），就临时拼一条，提交时才存 */
  function current() {
    var cur = S.sheets && S.sheets.current ? S.sheets.current() : null
    if (!cur || cur.info.module !== module) return null
    var saved = SC().parse(S.store.getString(SC().keyOf(cur.id)))
    if (saved) return saved
    if (!unprinted || !unprinted(cur)) return null
    var i = cur.info
    return SC().newRecord({ id: cur.id, module: i.module, title: i.title, date: cur.date, units: i.units, items: i.items, ref: i.ref }, Date.now())
  }

  function build() {
    if (box) return
    box = doc.createElement('div')
    box.className = 'rdrawer-wrap'
    box.hidden = true
    box.innerHTML = '<div class="rdrawer-mask" data-rd-close></div>' +
      '<aside class="rdrawer" role="dialog" aria-modal="true" aria-labelledby="rdrawer-title">' +
        '<header class="rdrawer-head"><b id="rdrawer-title">打分</b>' +
          '<button type="button" class="rdrawer-x" data-rd-close aria-label="关上">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>' +
        '<div class="rdrawer-body"><div class="rdrawer-panel"></div>' +
          '<p class="rdrawer-tip">手机扫纸角的二维码也能打分，电脑和手机打的是同一份。</p></div>' +
      '</aside>'
    doc.body.appendChild(box)
    box.addEventListener('click', function (e) {
      if (e.target.closest('[data-rd-close]')) close()
    })
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) close()
    })
    panel = S.markPanel.mount(box.querySelector('.rdrawer-panel'), {
      module: module,
      current: current,
      onRender: function (info) {
        box.querySelector('#rdrawer-title').textContent = '打分 · ' + (info.label || '') +
          (info.total ? '（' + info.total + ' 张没打）' : '')
      },
      onSubmit: function (rec) {
        badge()
        try {
          root.dispatchEvent(new root.CustomEvent('sumsum:rated', { detail: { module: rec.module, id: rec.id } }))
        } catch (e) { /* 老浏览器没有 CustomEvent 构造器就不通知 */ }
        /* 页面收到通知后可能换了卷（识字出下一张）：屏幕上这张跟着变 */
        if (isOpen()) panel.render()
      }
    })
  }

  function open() {
    if (!module) return
    build()
    lastFocus = doc.activeElement
    panel.reset()
    panel.render()
    box.hidden = false
    doc.documentElement.classList.add('rdrawer-on')
    var x = box.querySelector('.rdrawer-x')
    if (x) x.focus()
    refreshFromCloud(true)
  }

  function close() {
    if (!box) return
    box.hidden = true
    doc.documentElement.classList.remove('rdrawer-on')
    if (lastFocus && lastFocus.focus) lastFocus.focus()
  }

  /* 从云端补纸记录和这个板块的数据；补到了板块数据（识字、拼音）就刷新页面，抽屉开着的话刷新后再打开 */
  var pulling = false
  var lastPull = 0
  function refreshFromCloud(force) {
    var sync = S.sync
    if (!sync || !sync.pullMissing || pulling) return
    if (!force && Date.now() - lastPull < 30000) return
    if (!S.sheets || !S.sheets.signedIn()) return
    pulling = true
    lastPull = Date.now()
    var applied = []
    var pre = 'sumsum:' + module + ':'
    sync.pullMissing(function (k) { return SC().isSheetKey(k) || k.indexOf(pre) === 0 }, applied)
      .catch(function () { return 0 })
      .then(function () {
        pulling = false
        if (applied.some(function (k) { return k.indexOf(pre) === 0 })) {
          try { if (isOpen()) root.sessionStorage.setItem(REOPEN, module) } catch (e) { /* 忽略 */ }
          root.location.reload()
          return
        }
        if (applied.length) {
          badge()
          if (isOpen()) panel.render()
        }
      })
  }

  function badge() {
    if (!button || !module) return
    var n = 0
    try { n = S.sheets.signedIn() ? S.markPanel.pendingCount(module) : 0 } catch (e) { n = 0 }
    var el = button.querySelector('.btn-n')
    if (!n) {
      if (el) el.parentNode.removeChild(el)
      button.title = '孩子做完后打分：全对选「全对」，有错点出来，再提交'
      return
    }
    if (!el) {
      el = doc.createElement('span')
      el.className = 'btn-n'
      button.appendChild(el)
    }
    el.textContent = String(n)
    button.title = '这个板块最近两天还有 ' + n + ' 张纸没打分'
  }

  /* sheets.js 建好顶栏按钮后调用 */
  function attach(mod, btn) {
    module = mod
    button = btn
    badge()
    var again = false
    try {
      again = root.sessionStorage.getItem(REOPEN) === mod
      root.sessionStorage.removeItem(REOPEN)
    } catch (e) { /* 忽略 */ }
    if (root.location.hash === '#rate') {
      again = true
      try { root.history.replaceState(null, '', root.location.pathname + root.location.search) } catch (e) { /* 忽略 */ }
    }
    if (again && S.sheets.signedIn()) setTimeout(open, 0)
  }

  var badgeTimer = null
  S.store.onChange(function (key) {
    if (!SC().isSheetKey(key) && key.indexOf('sumsum:' + module + ':') !== 0) return
    clearTimeout(badgeTimer)
    badgeTimer = setTimeout(badge, 300)
  })
  doc.addEventListener('visibilitychange', function () {
    if (doc.visibilityState === 'visible' && module) refreshFromCloud(false)
  })
  /* 账号脚本在页面后面才加载：等整页加载完再挂（登录状态一变、首次同步完成，角标重算） */
  root.addEventListener('load', function () {
    if (S.account && S.account.onChange) S.account.onChange(function () { badge() })
    if (S.accountUI && S.accountUI.initialSync) S.accountUI.initialSync.then(badge, badge)
  })

  S.rateDrawer = {
    open: open,
    close: close,
    attach: attach,
    badge: badge,
    isOpen: isOpen,
    refresh: function () { badge(); if (isOpen()) panel.render() },
    /* 页面设置：fn(cur) 返回 true 表示屏幕上这张没打印也能打分 */
    allowUnprinted: function (fn) { unprinted = typeof fn === 'function' ? fn : null }
  }
})(window)
