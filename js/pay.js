/**
 * 付费开通会员（2026-11-28，Waffo 收款，服务器端 server/pay-core.js）。
 *   SumSum.pay.on()：收款开没开（中间层写进网页的 window.__SUMSUM_PAY；没开就还显示「开通时通知我」）
 *   SumSum.pay.button(文字)：一个「开通会员 · 99 元/年」按钮的 HTML（data-pay-buy），bind(容器) 接上点击
 *   付完 Waffo 跳回 /?paid=订单号：任何页面加载时看到 ?paid= 就弹一个「正在确认付款」，每 3 秒问一次服务器，
 *   到账了显示到期日、刷新页面（锁就没了）。
 */
;(function (root) {
  'use strict'

  var doc = root.document
  function S() { return root.SumSum || {} }
  function info() { return root.__SUMSUM_PAY || { on: false } }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  function on() { return !!info().on }
  function label() { return info().label || '99 元/年' }

  function button(text, cls) {
    return '<button type="button" class="btn ' + (cls || 'btn-primary') + '" data-pay-buy>' + esc(text || ('开通会员 · ' + label())) + '</button>'
  }

  function loggedIn() {
    var A = S().account
    if (A && A.state) return !!A.state.loggedIn
    var me = root.__SUMSUM_ME
    return !!(me && me.ok)
  }

  /* 下单 → 跳 Waffo 收银台。msg：出错时写字的地方 */
  function start(btn, msg) {
    function say(t) {
      if (msg) { msg.textContent = t; msg.hidden = false }
      else root.console.log(t)
    }
    if (!loggedIn()) {
      var ui = S().accountUI
      if (ui && ui.open) ui.open('register', '先注册一个账号（或登录），再开通会员。')
      return
    }
    if (btn) btn.disabled = true
    root.fetch('/api/pay/create', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: '{"buy":true}'
    }).then(function (r) { return r.json() }).then(function (d) {
      if (d && d.ok && d.url) {
        root.location.href = d.url
        return
      }
      if (btn) btn.disabled = false
      say((d && d.error) || '收银台没打开，稍后再试一次。')
    }).catch(function () {
      if (btn) btn.disabled = false
      say('网络不太好，收银台没打开，稍后再试一次。')
    })
  }

  function bind(box) {
    if (!box || box.__payBound) return
    box.__payBound = true
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pay-buy]')
      if (!b) return
      var scope = b.closest('[data-pay-scope]') || box
      start(b, scope.querySelector('[data-pay-msg]'))
    })
  }

  /* ---------- 付完回来：确认到账 ---------- */

  function fmt(t) {
    var d = new Date(t)
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日'
  }

  function waitPaid(order) {
    var box = doc.createElement('div')
    box.className = 'pay-wait'
    box.setAttribute('role', 'dialog')
    box.setAttribute('aria-modal', 'true')
    box.innerHTML = '<div class="pay-card"><b data-pw-title>正在确认付款……</b>' +
      '<p data-pw-text>付款成功后一般几秒钟就到账，请不要关掉这个页面。</p>' +
      '<div class="pay-acts"><button type="button" class="btn btn-primary" data-pw-ok hidden>好的</button>' +
      '<button type="button" class="btn" data-pw-close>先关掉</button></div></div>'
    doc.body.appendChild(box)
    var title = box.querySelector('[data-pw-title]')
    var text = box.querySelector('[data-pw-text]')
    var okBtn = box.querySelector('[data-pw-ok]')
    var tries = 0
    var timer = null
    function clean() {
      var u = new URL(root.location.href)
      u.searchParams.delete('paid')
      root.history.replaceState(null, '', u.pathname + (u.search || '') + u.hash)
    }
    function close(reload) {
      if (timer) root.clearTimeout(timer)
      box.remove()
      clean()
      if (reload) root.location.reload()
    }
    box.querySelector('[data-pw-close]').addEventListener('click', function () { close(false) })
    okBtn.addEventListener('click', function () { close(true) })
    function poll() {
      tries++
      root.fetch('/api/pay/status?o=' + encodeURIComponent(order), { credentials: 'same-origin', cache: 'no-store' })
        .then(function (r) { return r.json() }).then(function (d) {
          if (d && d.ok && d.state === 'paid') {
            title.textContent = '会员已开通'
            text.textContent = '用到 ' + fmt(d.full_until) + '。确认邮件已经发到你的邮箱；付款 7 天内不满意，发邮件到 hi@zhihebi.com 就全额退款。'
            okBtn.hidden = false
            box.querySelector('[data-pw-close]').hidden = true
            return
          }
          if (d && d.ok && d.state === 'mismatch') {
            title.textContent = '付款金额对不上'
            text.textContent = '这笔没有自动开通。请发邮件到 hi@zhihebi.com，附上订单号 ' + order + '，我们人工处理。'
            return
          }
          if (d && !d.ok) {
            title.textContent = '没找到这笔订单'
            text.textContent = (d.error || '') + ' 如果已经付了款，请发邮件到 hi@zhihebi.com，附上订单号 ' + order + '。'
            return
          }
          if (tries >= 40) {
            title.textContent = '还没确认到账'
            text.textContent = '有时候到账会慢一些。过几分钟刷新页面看看；一直没开通的话，发邮件到 hi@zhihebi.com，附上订单号 ' + order + '。'
            return
          }
          timer = root.setTimeout(poll, 3000)
        }).catch(function () {
          if (tries < 40) timer = root.setTimeout(poll, 3000)
        })
    }
    poll()
  }

  function boot() {
    var order = new URLSearchParams(root.location.search).get('paid')
    if (order && /^zh[0-9a-z]{8,40}$/.test(order)) waitPaid(order)
    bind(doc.body)
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.pay = { on: on, label: label, button: button, bind: bind, start: start }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot)
  else boot()
})(typeof window !== 'undefined' ? window : globalThis)
