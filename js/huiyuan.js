/**
 * 会员页（huiyuan.html，2026-11-28）：按账号写最上面那段、决定显示哪个按钮。
 *   没登录：「注册就送 7 天会员」；按钮点了先弹注册框（js/pay.js start 自己处理）
 *   免费版 / 体验结束：「你现在是免费版」
 *   体验中或付费会员：「会员用到 X 月 X 日」，按钮改成「再买一年」
 *   永久会员（邀请码）：不显示按钮
 * 付费开通没开（__SUMSUM_PAY.on 为假，Waffo 审核期间）：显示「开通时通知我」，和上锁页同一个登记接口 /api/auth/want。
 */
;(function (root) {
  'use strict'

  var doc = root.document
  var PENDING = 'zhihebi:lk-want' /* 和上锁页同一个记号：弹框里注册完回来自动登记 */

  function S() { return root.SumSum || {} }
  function $(sel) { return doc.querySelector(sel) }

  function fmt(t) {
    var d = new Date(t)
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日'
  }

  function current() {
    var A = S().account
    var st = A && A.state
    if (st && st.loggedIn) return st
    var me = root.__SUMSUM_ME
    if (me && me.ok) return { loggedIn: true, email: me.email, plan: me.plan, base: me.base, fullUntil: me.full_until }
    return { loggedIn: false }
  }

  var stateBox = $('[data-hy-state]')
  var payBox = $('[data-hy-pay]')
  var wantBox = $('[data-hy-want]')
  var buyBtn = payBox && payBox.querySelector('[data-pay-buy]')
  var wantBtn = $('[data-hy-want-btn]')
  var msg = $('[data-pay-msg]')

  function say(t) {
    msg.textContent = t
    msg.hidden = !t
  }

  function render() {
    var st = current()
    var payOn = !!(S().pay ? S().pay.on() : (root.__SUMSUM_PAY && root.__SUMSUM_PAY.on))
    var forever = st.loggedIn && st.base === 'full'
    var member = st.loggedIn && st.plan === 'full'
    var until = Number(st.fullUntil) || 0
    var label = (root.__SUMSUM_PAY && root.__SUMSUM_PAY.label) || '99 元/年'

    if (!st.loggedIn) {
      stateBox.innerHTML = '注册免费账号就送 <b>7 天会员</b>，先用用看。'
    } else if (forever) {
      stateBox.innerHTML = '你是<b>永久会员</b>（邀请码开通），九个板块一直都能用，不用再买。'
    } else if (member && until > Date.now()) {
      var left = Math.ceil((until - Date.now()) / 86400000)
      stateBox.innerHTML = '你现在是<b>会员</b>，用到 ' + fmt(until) + (left <= 8 ? '（还剩 ' + left + ' 天）' : '') + '。'
    } else {
      stateBox.innerHTML = '你现在是<b>免费版</b>' + (until ? '，7 天会员体验已经结束，孩子的记录都还在' : '') + '。'
    }

    var canBuy = !forever
    payBox.hidden = !(canBuy && payOn)
    wantBox.hidden = !(canBuy && !payOn)
    if (buyBtn) buyBtn.textContent = member && until > Date.now() ? '再买一年 · ' + label : '开通会员 · ' + label
    if (wantBtn && !wantBtn.disabled) wantBtn.textContent = st.loggedIn ? '开通时通知我' : '注册，开通时通知我'
  }

  /* ---------- 开通时通知我（付费开通没开时） ---------- */
  function wantDone(email) {
    wantBtn.disabled = true
    wantBtn.textContent = '已登记'
    say('付费开通上线那天，发邮件到 ' + email + ' 告诉你。')
  }
  function want(method) {
    return root.fetch('/api/auth/want', method === 'POST'
      ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{"want":true}' }
      : { credentials: 'same-origin' }).then(function (r) { return r.json() })
  }
  function record() {
    wantBtn.disabled = true
    want('POST').then(function (d) {
      if (d && d.ok && d.wanted) { wantDone(d.email); return }
      wantBtn.disabled = false
      say((d && d.error) || '没登记上，稍后再试一次。')
    }).catch(function () {
      wantBtn.disabled = false
      say('网络不太好，没登记上，稍后再试一次。')
    })
  }
  if (wantBtn) {
    wantBtn.addEventListener('click', function () {
      if (!current().loggedIn) {
        try { root.sessionStorage.setItem(PENDING, '1') } catch (e) { /* 存不了就回来再点一次 */ }
        var ui = S().accountUI
        if (ui && ui.open) ui.open('register', '注册一个免费账号，付费开通上线那天发邮件告诉你。')
        return
      }
      record()
    })
  }
  function settleWant() {
    if (!wantBtn || wantBox.hidden || !current().loggedIn) return
    var pending = false
    try { pending = root.sessionStorage.getItem(PENDING) === '1'; root.sessionStorage.removeItem(PENDING) } catch (e) { /* 读不了当没点过 */ }
    if (pending) record()
    else want('GET').then(function (d) { if (d && d.ok && d.wanted) wantDone(d.email) }).catch(function () {})
  }

  render()
  settleWant()
  var A = S().account
  if (A && A.onChange) A.onChange(function () { render(); settleWant() })
})(window)
