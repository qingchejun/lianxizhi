/**
 * 完整版功能的锁（2026-11-27）：识字、拼音对免费版开放「每日一张」，其余功能（写字、单元检查、错字集整页打印、
 * 拼音专题和课程）在页面里显示这块说明，代替纸张。真正的版本以服务器为准（__SUMSUM_PLAN 由中间层写进网页，
 * 7 天体验期里算完整版）；这里只管显示。
 *
 * 用法：SumSum.fullLock.isFull() 判断；html(标题, 说明) 出一块说明；bind(容器) 接上两个按钮。
 */
;(function (root) {
  'use strict'

  var doc = root.document
  var LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="10.5" width="13" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>'

  function S() { return root.SumSum || {} }

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  function isFull() {
    var A = S().account
    var plan = (A && A.state && A.state.plan) || root.__SUMSUM_PLAN || ''
    return plan === 'full'
  }

  /* 体验结束了没有：免费账号、有过到期日、已经过了 */
  function trialEnded() {
    var st = S().account && S().account.state
    /* 板块脚本可能比 account.js 先跑：那时还没有 state，先看中间层写进网页的登录信息 */
    if (!st || !st.loggedIn) {
      var me = root.__SUMSUM_ME
      st = me && me.ok ? { base: me.base, fullUntil: me.full_until } : null
    }
    return !!(st && st.base === 'free' && st.fullUntil && st.fullUntil <= Date.now())
  }

  function html(title, desc) {
    return '<div class="empty full-lock">' + LOCK_SVG +
      '<b>' + esc(title) + '</b>' +
      '<p>' + esc(desc) + (trialEnded() ? '7 天完整版体验已经结束，孩子练过的记录都还在，开通后马上接着用。' : '') + '</p>' +
      '<p class="full-lock-free">免费版也能用：识字每日一卷、拼音今日卷，打分、错题自动复习都照常。</p>' +
      '<div class="full-lock-acts">' +
        '<button type="button" class="btn btn-sm btn-primary" data-fl-redeem>填邀请码开通</button>' +
        '<button type="button" class="btn btn-sm" data-fl-want>付费开通时通知我</button>' +
      '</div>' +
      '<p class="full-lock-msg" data-fl-msg hidden></p></div>'
  }

  function bind(box) {
    if (!box || box.__flBound) return
    box.__flBound = true
    box.addEventListener('click', function (e) {
      if (e.target.closest('[data-fl-redeem]')) {
        var ui = S().accountUI
        if (ui && ui.open) ui.open('account')
        return
      }
      var want = e.target.closest('[data-fl-want]')
      if (!want) return
      var msg = box.querySelector('[data-fl-msg]')
      want.disabled = true
      root.fetch('/api/auth/want', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: '{"want":true}'
      }).then(function (r) { return r.json() }).then(function (d) {
        if (d && d.ok && d.wanted) {
          want.textContent = '已登记'
          if (msg) { msg.textContent = '付费开通上线那天，发邮件到 ' + d.email + ' 告诉你。'; msg.hidden = false }
        } else {
          want.disabled = false
          if (msg) { msg.textContent = (d && d.error) || '没登记上，稍后再试一次。'; msg.hidden = false }
        }
      }).catch(function () {
        want.disabled = false
        if (msg) { msg.textContent = '网络不太好，稍后再试一次。'; msg.hidden = false }
      })
    })
  }

  /* 页签上的小锁 */
  function markTab(el, on) {
    if (!el) return
    var icon = el.querySelector('.tab-lock')
    if (on && !icon) {
      icon = doc.createElement('i')
      icon.className = 'tab-lock'
      icon.setAttribute('aria-label', '完整版')
      icon.innerHTML = LOCK_SVG
      el.appendChild(icon)
    } else if (!on && icon) icon.remove()
  }

  /* 在这页开通了（填邀请码）：刷新一下，锁就没了 */
  var hooked = false
  function reloadOnUpgrade() {
    var A = S().account
    if (hooked || !A || !A.onChange) return
    hooked = true
    var was = isFull()
    A.onChange(function () {
      if (!was && isFull()) root.location.reload()
    })
  }

  if (root.addEventListener) root.addEventListener('load', reloadOnUpgrade)

  root.SumSum = root.SumSum || {}
  root.SumSum.fullLock = { isFull: isFull, trialEnded: trialEnded, html: html, bind: bind, markTab: markTab, reloadOnUpgrade: reloadOnUpgrade }
})(typeof window !== 'undefined' ? window : globalThis)
