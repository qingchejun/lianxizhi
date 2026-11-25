/**
 * 账号界面：登录 / 注册（验证码六格）/ 找回（验证码六格 + 新密码）/ 修改密码 / 已登录主页。
 *
 * 两种挂法，同一套视图：
 *   弹窗 —— 板块页左下角「账号」按钮（[data-account]）打开 <dialog>；
 *   内嵌 —— 页面里有 [data-account-inline]，表单直接画在页面上（2026-11-25 起首页不再用，保留这种挂法）；
 *   没登录时的首页（welcome.html）body 上有 [data-account-boot]：照常探登录态，按钮自己调 open()。
 * view 切换 + data-act / data-goto 事件委托；登录成功 → sync.init（confirm 由本文件提供）。
 * 改版前发出去的重设链接 /?reset=<token> 仍然认（重设要重问邮箱：PBKDF2 盐需要它）。
 */
;(function (root) {
  'use strict'
  var doc = root.document
  var A, view = 'login', resendTimer = null, resetToken = ''
  var dlg = null       /* 弹窗或内嵌容器 */
  var inline = false   /* true = 画在页面里 */
  var mem = { email: '', hash: '' } /* 注册/找回途中记住的邮箱与哈希（重发验证码要用） */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }

  /* 出错时顺带把对应的输入框标红：按服务器报错里的关键词认是哪一格 */
  function fieldOf(text) {
    if (/邀请码/.test(text)) return 'invite'
    if (/验证码/.test(text)) return 'code'
    if (/当前密码/.test(text)) return 'old'
    if (/密码/.test(text)) return 'password'
    if (/邮箱/.test(text)) return 'email'
    return ''
  }
  function say(text, kind) {
    var m = dlg.querySelector('[data-msg]')
    if (!m) return
    Array.prototype.forEach.call(dlg.querySelectorAll('[aria-invalid]'), function (x) { x.removeAttribute('aria-invalid') })
    m.innerHTML = text /* text 只由本文件写死的句子 + 服务器的固定中文提示拼成 */
    m.className = 'auth-msg' + (kind ? ' is-' + kind : '')
    m.hidden = !text
    if (kind !== 'bad') return
    var f = fieldOf(text)
    if (f === 'code') {
      Array.prototype.forEach.call(dlg.querySelectorAll('.code-box'), function (b) { b.setAttribute('aria-invalid', 'true') })
    } else if (f) {
      var input = dlg.querySelector('[name="' + f + '"]')
      if (input) { input.setAttribute('aria-invalid', 'true'); input.focus() }
    }
  }
  function busy(on) {
    var b = dlg.querySelector('[data-act="submit"]')
    if (!b) return
    b.disabled = !!on
    b.classList.toggle('is-busy', !!on)
  }

  function build(host) {
    if (host) {
      inline = true
      dlg = host
      dlg.classList.add('auth', 'auth-inline')
      dlg.innerHTML = '<div class="account-body" data-body></div>'
    } else {
      dlg = doc.createElement('dialog')
      dlg.className = 'account-dialog auth'
      dlg.setAttribute('aria-labelledby', 'account-title')
      dlg.innerHTML =
        '<div class="help-head">' +
          '<h2 id="account-title" data-title>账号</h2>' +
          '<button type="button" class="help-close" aria-label="关闭">×</button>' +
        '</div>' +
        '<div class="account-body" data-body></div>'
      doc.body.appendChild(dlg)
      dlg.querySelector('.help-close').addEventListener('click', function () { dlg.close() })
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close() })
    }
    dlg.addEventListener('submit', onSubmit)
    dlg.addEventListener('click', onClick)
    dlg.addEventListener('input', onInput)
  }

  /* ---------- 视图片段 ---------- */

  function field(label, input, hint) {
    return '<label class="auth-field"><span>' + label + '</span>' + input +
      (hint ? '<small>' + hint + '</small>' : '') + '</label>'
  }
  var EMAIL = field('邮箱', '<input class="input" type="email" name="email" required autocomplete="email" inputmode="email" placeholder="name@example.com">')
  function codeBoxes() {
    var out = '<div class="code-row" role="group" aria-label="6 位验证码">'
    for (var i = 0; i < 6; i++) {
      out += '<input class="code-box" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" aria-label="第 ' + (i + 1) + ' 位"' +
        (i === 0 ? ' autocomplete="one-time-code"' : ' autocomplete="off"') + '>'
    }
    return out + '</div>'
  }
  var RESEND = '<p class="auth-help">没收到验证码？请看垃圾邮件箱，或 <button type="button" class="link-btn" data-act="resend" disabled>60 秒后重发</button></p>'
  var MSG = '<div class="auth-msg" data-msg role="alert" hidden></div>'
  /* 登录页开头说明为什么要重新登录（服务器写进网页的 __SUMSUM_ME.kicked / relogin） */
  var WHY = {
    kicked: '这个账号在别的设备上登录了，这台已经退出。一个账号最多同时登录 3 台设备，重新登录就能接着用。',
    relogin: '网站的登录方式升级了，请重新登录一次。练习记录都在云端，登录后会自动回来。'
  }
  function tabs(on) {
    return '<div class="stage-tabs auth-tabs" role="tablist">' +
      '<button type="button" role="tab" class="stage-tab' + (on === 'login' ? ' active' : '') + '" aria-selected="' + (on === 'login') + '" data-goto="login">登录</button>' +
      '<button type="button" role="tab" class="stage-tab' + (on === 'register' ? ' active' : '') + '" aria-selected="' + (on === 'register') + '" data-goto="register">注册</button>' +
    '</div>'
  }
  function head(title, sub) {
    return '<div class="auth-head"><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>'
  }

  /* 谷歌登录（2026-11-25，server/google.js）：登录、注册页签底下各放一个。
     谷歌不让在微信里打开的网页用它登录，微信里点了只提示去浏览器打开 */
  var GOOGLE = '<div class="auth-or"><span>或者</span></div>' +
    '<a class="btn btn-lg auth-google" href="/api/auth/google/start" data-google>' +
    '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>' +
    '用 Google 账号登录</a>'
  function googleClick(e) {
    var a = e.target.closest && e.target.closest('[data-google]')
    if (!a) return
    if (/MicroMessenger/i.test(root.navigator.userAgent)) {
      e.preventDefault()
      say('微信里用不了谷歌登录：点右上角「…」，选「在浏览器打开」再登录；或者用邮箱登录。', '')
      return
    }
    /* 登录后回到哪一页：首页被拦下时带着 ?next=，其余就是当前这一页 */
    var next = new URLSearchParams(root.location.search).get('next') || (root.location.pathname + root.location.search)
    a.href = '/api/auth/google/start?next=' + encodeURIComponent(next)
  }

  function forms() {
    var who = '<b>' + esc(mem.email) + '</b>'
    return {
      login: {
        title: '登录',
        html: tabs('login') + '<form data-view="login" novalidate>' + EMAIL +
          '<label class="auth-field"><span>密码<button type="button" class="link-btn quiet" data-goto="forgot">忘记密码？</button></span>' +
          '<input class="input" type="password" name="password" required autocomplete="current-password" minlength="8"></label>' +
          MSG + '<button type="submit" class="btn btn-primary btn-lg auth-submit" data-act="submit">登录</button></form>' + GOOGLE
      },
      register: {
        title: '注册',
        html: tabs('register') + '<form data-view="register" novalidate>' + EMAIL +
          field('密码', '<input class="input" type="password" name="password" required minlength="8" autocomplete="new-password">', '至少 8 位') +
          field('邀请码（选填）', '<input class="input input-code" type="text" name="invite" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="9" placeholder="K7M2-QF9W">', '有邀请码就填上，开通完整版；没有就空着，先免费用口算、数独、四个思维游戏和奥数前三课') +
          (tsKey() ? '<div class="ts-box" data-ts></div>' : '') +
          MSG + '<button type="submit" class="btn btn-primary btn-lg auth-submit" data-act="submit">注册，发验证码到邮箱</button>' +
          '<p class="auth-help">注册即表示同意<a href="/privacy" target="_blank" rel="noopener">隐私说明</a>。</p></form>' + GOOGLE
      },
      code: {
        title: '验证邮箱',
        html: head('验证邮箱', '6 位验证码已发到 ' + who + '，10 分钟内有效。') +
          '<form data-view="code" novalidate>' + codeBoxes() + MSG + RESEND +
          '<button type="submit" class="btn btn-primary btn-lg auth-submit" data-act="submit">完成注册</button>' +
          '<p class="auth-alt"><button type="button" class="link-btn quiet" data-goto="register">邮箱填错了，返回修改</button></p></form>'
      },
      forgot: {
        title: '找回密码',
        html: head('找回密码', '输入注册时用的邮箱，我们发一个 6 位验证码过去。') +
          '<form data-view="forgot" novalidate>' + EMAIL + MSG +
          '<button type="submit" class="btn btn-primary btn-lg auth-submit" data-act="submit">发送验证码</button>' +
          '<p class="auth-alt"><button type="button" class="link-btn quiet" data-goto="login">返回登录</button></p></form>'
      },
      resetcode: {
        title: '设新密码',
        html: head('设新密码', '如果 ' + who + ' 注册过，6 位验证码已经发过去了，10 分钟内有效。') +
          '<form data-view="resetcode" novalidate>' + codeBoxes() +
          field('新密码', '<input class="input" type="password" name="password" required minlength="8" autocomplete="new-password">', '至少 8 位。改好后，其他设备要重新登录') +
          MSG + RESEND +
          '<button type="submit" class="btn btn-primary btn-lg auth-submit" data-act="submit">设新密码并登录</button>' +
          '<p class="auth-alt"><button type="button" class="link-btn quiet" data-goto="forgot">换个邮箱</button></p></form>'
      },
      reset: {
        title: '重设密码',
        html: head('重设密码', '输入注册邮箱和新密码。') +
          '<form data-view="reset" novalidate>' + EMAIL +
          field('新密码', '<input class="input" type="password" name="password" required minlength="8" autocomplete="new-password">', '至少 8 位') +
          MSG + '<button type="submit" class="btn btn-primary btn-lg auth-submit" data-act="submit">保存新密码</button></form>'
      },
      changepw: {
        title: '修改密码',
        html: '<form data-view="changepw" novalidate>' +
          field('当前密码', '<input class="input" type="password" name="old" required minlength="8" autocomplete="current-password">') +
          field('新密码', '<input class="input" type="password" name="password" required minlength="8" autocomplete="new-password">', '至少 8 位。改好后，其他设备要重新登录') +
          MSG + '<div class="account-row"><button type="submit" class="btn btn-primary" data-act="submit">保存新密码</button>' +
          '<button type="button" class="btn" data-goto="account">返回</button></div></form>'
      },
      delete: {
        title: '删除账号',
        html: head('删除账号', '账号和云端的练习记录会一起删掉，删了找不回来。这台设备上的本机记录不受影响。') +
          '<form data-view="delete" novalidate>' +
          field('当前密码', '<input class="input" type="password" name="password" required autocomplete="current-password" minlength="8">', '用 Google 账号注册、没设过密码的：先退出，在登录框点「忘记密码」设一个') +
          MSG + '<div class="account-row"><button type="submit" class="btn btn-danger" data-act="submit">确认删除</button>' +
          '<button type="button" class="btn" data-goto="account">返回</button></div></form>'
      }
    }
  }

  /* 人机验证（Cloudflare Turnstile）：服务器写进网页的公开编号，没有就不出这个框 */
  function tsKey() {
    return typeof root.__SUMSUM_TS === 'string' ? root.__SUMSUM_TS : ''
  }
  var tsToken = '', tsWidget = null, tsLoading = null
  function mountTs() {
    var box = dlg && dlg.querySelector('[data-ts]')
    if (!box || !tsKey()) return
    tsToken = ''
    if (!tsLoading) {
      tsLoading = new Promise(function (resolve, reject) {
        var sc = doc.createElement('script')
        sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        sc.async = true
        sc.onload = resolve
        sc.onerror = function () { tsLoading = null; reject(new Error('ts')) }
        doc.head.appendChild(sc)
      })
    }
    tsLoading.then(function () {
      if (!root.turnstile || !box.isConnected) return
      tsWidget = root.turnstile.render(box, {
        sitekey: tsKey(),
        language: 'zh-cn',
        callback: function (t) { tsToken = t },
        'expired-callback': function () { tsToken = '' },
        'error-callback': function () { tsToken = '' }
      })
    }).catch(function () {
      say('「确认是真人」的小框没加载出来，检查一下网络，刷新页面再试。', 'bad')
    })
  }
  function resetTs() {
    tsToken = ''
    if (tsWidget !== null && root.turnstile) { try { root.turnstile.reset(tsWidget) } catch (e) { /* 框已经不在了 */ } }
  }

  /* 账号页里的版本：免费版能补填邀请码开通完整版 */
  function planBlock() {
    if (A.state.plan === 'free') {
      return '<div class="account-plan"><p><b>免费版</b> · 可以用口算、数独、火柴、密码、迷宫、数织，扫码打分、按错题出下一张都有。</p>' +
        redeemForm() + '</div>'
    }
    return '<div class="account-plan"><p><b>完整版</b> · 九个板块都能用。</p></div>'
  }
  function redeemForm() {
    return '<form class="redeem-form" data-redeem novalidate>' +
      '<input class="input input-code" type="text" name="invite" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="9" placeholder="如 K7M2-QF9W" aria-label="邀请码">' +
      '<button type="submit" class="btn btn-primary">开通完整版</button>' +
      '<p class="redeem-msg" data-redeem-msg role="alert" hidden></p></form>'
  }

  function render() {
    var body = dlg.querySelector('[data-body]')
    var title = dlg.querySelector('[data-title]')
    /* 登录态掉了还停在改密码表单上，回去登录页（提交也只会 401） */
    if (!A.state.loggedIn && (view === 'account' || view === 'changepw' || view === 'delete')) view = 'login'
    if (A.state.loggedIn && view !== 'changepw' && view !== 'delete') {
      if (title) title.textContent = '账号'
      body.innerHTML =
        '<div class="account-who"><span class="account-avatar" aria-hidden="true">' + esc(A.state.email.charAt(0).toUpperCase()) + '</span>' +
          '<div><b>' + esc(A.state.email) + '</b><small>已登录 · 练习进度自动同步</small></div></div>' +
        '<p class="account-sub">换一台电脑，登录同一个账号，进度就跟过去了。</p>' +
        planBlock() +
        (A.state.admin ? '<div class="account-row"><a class="btn" href="admin.html">管理员面板</a></div>' : '') +
        '<div class="account-row">' +
          '<button type="button" class="btn" data-act="changepw">修改密码</button>' +
          '<button type="button" class="btn btn-danger" data-act="logout">退出登录</button>' +
        '</div>' + MSG +
        '<p class="account-foot"><a href="/privacy" target="_blank" rel="noopener">隐私说明</a> · <button type="button" class="link-btn quiet" data-act="delete">删除账号</button></p>'
      return
    }
    var f = forms()[view] || forms().login
    if (title) title.textContent = f.title
    body.innerHTML = f.html
    body.setAttribute('data-view', view)
    if (view === 'register') mountTs()
    if (view === 'code' || view === 'resetcode') wireCode(view === 'code')
    else if (!inline || doc.activeElement && dlg.contains(doc.activeElement)) {
      var first = body.querySelector('input:not([type=hidden])')
      if (first && root.matchMedia && root.matchMedia('(hover: hover)').matches) first.focus()
    }
  }

  /* 六格验证码：自动跳格，整串粘贴铺满；注册验证时填满第 6 格自动提交 */
  function wireCode(autoSubmit) {
    var boxes = Array.prototype.slice.call(dlg.querySelectorAll('.code-box'))
    boxes[0].focus()
    function full() { return boxes.every(function (x) { return x.value }) }
    boxes.forEach(function (b, i) {
      b.addEventListener('input', function () {
        var v = b.value.replace(/\D/g, '')
        if (v.length > 1) { spread(v, i); return }
        b.value = v
        b.removeAttribute('aria-invalid')
        if (v && i < boxes.length - 1) boxes[i + 1].focus()
        if (autoSubmit && full()) submitCode()
      })
      /* 整串粘贴：6 位验证码一次性铺进六格（从邮件复制回来的人不用手敲） */
      b.addEventListener('paste', function (e) {
        e.preventDefault()
        spread(String((e.clipboardData || root.clipboardData).getData('text') || '').replace(/\D/g, ''), 0)
      })
      b.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !b.value && i > 0) boxes[i - 1].focus()
        if (e.key === 'ArrowLeft' && i > 0) boxes[i - 1].focus()
        if (e.key === 'ArrowRight' && i < boxes.length - 1) boxes[i + 1].focus()
      })
    })
    function spread(t, from) {
      if (!t) return
      for (var j = from, k = 0; j < boxes.length && k < t.length; j++, k++) boxes[j].value = t.charAt(k)
      boxes[Math.min(boxes.length - 1, from + t.length)].focus()
      if (full()) {
        if (autoSubmit) submitCode()
        else { var pw = dlg.querySelector('[name="password"]'); if (pw) pw.focus() }
      }
    }
    countdown()
  }
  /* 重发倒计时 60 秒 */
  function countdown() {
    var btn = dlg.querySelector('[data-act="resend"]')
    if (!btn) return
    var left = 60
    btn.disabled = true
    btn.textContent = left + ' 秒后重发'
    clearInterval(resendTimer)
    resendTimer = setInterval(function () {
      left--
      if (!btn.isConnected) return clearInterval(resendTimer)
      if (left <= 0) {
        clearInterval(resendTimer)
        btn.disabled = false
        btn.textContent = '重新发送'
      } else btn.textContent = left + ' 秒后重发'
    }, 1000)
  }

  function codeValue() {
    return Array.prototype.map.call(dlg.querySelectorAll('.code-box'), function (b) { return b.value }).join('')
  }
  function clearCode() {
    Array.prototype.forEach.call(dlg.querySelectorAll('.code-box'), function (b) { b.value = '' })
    dlg.querySelectorAll('.code-box')[0].focus()
  }

  var submitting = false
  async function submitCode() {
    if (submitting) return
    submitting = true
    busy(true)
    try {
      var r = await A.request('/api/auth/verify', { email: mem.email, code: codeValue() })
      if (r.status === 200) {
        loggedIn(mem.email, r.body.admin)
      } else {
        say(r.body.error || '验证码不对，再看一眼邮件。', 'bad')
        clearCode()
      }
    } catch (err) {
      say('网络出了问题，稍后再试。', 'bad')
    } finally {
      submitting = false
      busy(false)
    }
  }

  function loggedIn(email, admin, plan) {
    A.setLogin(email, admin, plan)
    startSync()
    view = 'account'
    if (!inline) render()
    else say('登录成功，正在打开…', 'ok')
  }

  function moveBar() {
    if (doc.getElementById('move-bar')) return
    var bar = doc.createElement('div')
    bar.id = 'move-bar'
    bar.className = 'move-bar'
    bar.setAttribute('role', 'status')
    bar.textContent = '网址换成 zhihebi.com 了。正在把这台设备上的练习进度存好，马上自动跳过去；到了新网址要重新登录一次。'
    doc.body.appendChild(bar)
  }

  var syncStarted = false
  function startSync() {
    var sync = root.SumSum.sync
    if (!sync || syncStarted) return /* 只启动一次：重复 init 会堆 onChange 监听、重复推 */
    syncStarted = true
    return sync.init({
      /* 登记页等同步完才画，拉到新数据不必整页刷新（手机上整页重载一次要多等十几秒） */
      noReload: !!doc.body && doc.body.hasAttribute('data-sync-no-reload'),
      confirm: function (o) {
        /* 板块页、登记页上弹窗是用到时才建的：没建就直接用会抛错，整次同步被静默跳过（2026-11-23 手机扫码登记一直「0 张」的根因） */
        if (!dlg) build()
        return new Promise(function (resolve) {
          var lines = function (keys) {
            return '<p>' + keys.slice(0, 8).map(esc).join('、') +
              (keys.length > 8 ? '，等共 ' + keys.length + ' 项' : '') + '</p>'
          }
          dlg.querySelector('[data-body]').innerHTML =
            '<p class="account-sub">这台设备上和云端<b>都有</b>练习进度，保留哪边？一般选「用云端的」。</p>' +
            '<div class="account-choice">' +
              '<button type="button" class="btn" data-pick="local">用这台设备的<br><small>' + o.local.length + ' 项</small>' + lines(o.local) + '</button>' +
              '<button type="button" class="btn" data-pick="cloud">用云端的<br><small>' + o.cloud.length + ' 项</small>' + lines(o.cloud) + '</button>' +
            '</div>'
          if (dlg.querySelector('[data-title]')) dlg.querySelector('[data-title]').textContent = '选择要保留的进度'
          var done = false
          dlg.querySelector('[data-body]').addEventListener('click', function h(e) {
            var b = e.target.closest('[data-pick]')
            if (!b || done) return
            done = true
            dlg.querySelector('[data-body]').removeEventListener('click', h)
            if (dlg.close) dlg.close()
            resolve(b.dataset.pick)
          })
          if (!inline) dlg.showModal()
        })
      }
    })
  }

  async function onSubmit(e) {
    e.preventDefault()
    var form = e.target
    var fd = new FormData(form)
    var email = A.normEmail(fd.get('email'))
    var pw = fd.get('password') || ''
    busy(true)
    try {
      if (view === 'login' || view === 'register') {
        if (!A.validEmail(email)) return say('邮箱地址看起来不对。', 'bad')
        if (!A.validPassword(pw)) return say('密码至少 8 位。', 'bad')
        var invRaw = view === 'register' ? String(fd.get('invite') || '').replace(/[^0-9a-z]/gi, '') : ''
        if (invRaw && invRaw.length !== 8) {
          return say('邀请码是 8 位字母和数字，像 K7M2-QF9W；没有邀请码就把这一栏清空。', 'bad')
        }
        if (view === 'register' && tsKey() && !tsToken) return say('请等「确认是真人」那一格打上勾再点注册。', 'bad')
        var hash = await A.hashPassword(email, pw)
        mem.email = email
        mem.hash = hash
        if (view === 'register') {
          var r = await A.request('/api/auth/register', { email: email, password: hash, invite: invRaw ? fd.get('invite') : '', turnstile: tsToken })
          if (r.status === 200) { /* 未验证过的重复注册也走 200：换密码 + 重发码（auth-core 裁定） */
            view = 'code'
            render()
          } else { resetTs(); say(r.body.error || '注册没成功，稍后再试。', 'bad') }
        } else {
          var rl = await A.request('/api/auth/login', { email: email, password: hash })
          if (rl.status === 200 && rl.body.need_verify) {
            view = 'code'
            render()
          } else if (rl.status === 200) {
            loggedIn(email, rl.body.admin, rl.body.plan)
          } else say(rl.body.error || '登录没成功。', 'bad')
        }
      } else if (view === 'code') {
        if (codeValue().length !== 6) return say('验证码是 6 位数字。', 'bad')
        busy(false)
        await submitCode()
      } else if (view === 'forgot') {
        if (!A.validEmail(email)) return say('邮箱地址看起来不对。', 'bad')
        var rf = await A.request('/api/auth/forgot', { email: email })
        if (rf.status !== 200) return say(rf.body.error || '没发出去，稍后再试。', 'bad')
        mem.email = email
        view = 'resetcode'
        render()
      } else if (view === 'resetcode') {
        var code = codeValue()
        if (code.length !== 6) return say('验证码是 6 位数字。', 'bad')
        if (!A.validPassword(pw)) return say('新密码至少 8 位。', 'bad')
        var rc = await A.request('/api/auth/reset', { email: mem.email, code: code, password: await A.hashPassword(mem.email, pw) })
        if (rc.status === 200) loggedIn(mem.email, rc.body.admin, rc.body.plan)
        else say(rc.body.error || '没改成，稍后再试。', 'bad')
      } else if (view === 'reset') {
        if (!A.validEmail(email)) return say('邮箱地址看起来不对。', 'bad')
        if (!A.validPassword(pw)) return say('密码至少 8 位。', 'bad')
        var rr = await A.request('/api/auth/reset', { token: resetToken, password: await A.hashPassword(email, pw) })
        if (rr.status === 200) loggedIn(email, rr.body.admin, rr.body.plan)
        else say(rr.body.error || '重设没成功。', 'bad')
      } else if (view === 'delete') {
        var dpw = fd.get('password') || ''
        if (!A.validPassword(dpw)) return say('当前密码至少 8 位。', 'bad')
        if (root.SumSum.sync && root.SumSum.sync.flush) await root.SumSum.sync.flush()
        var dr = await A.request('/api/auth/delete', { password: await A.hashPassword(A.state.email, dpw) })
        if (dr.status !== 200) return say(dr.body.error || '没删成，稍后再试。', 'bad')
        /* 本机记录归属清掉：下一个在这台设备登录的人不会被当成同一个账号合并 */
        try { root.localStorage.removeItem('sumsum:sync:owner') } catch (e) { /* 存不了就算了 */ }
        root.location.href = '/'
      } else if (view === 'changepw') {
        /* 已登录才能到这个视图；PBKDF2 的盐要邮箱，直接用登录态里的 */
        var oldPw = fd.get('old') || ''
        if (!A.validPassword(oldPw)) return say('当前密码至少 8 位。', 'bad')
        if (!A.validPassword(pw)) return say('新密码至少 8 位。', 'bad')
        var oh = await A.hashPassword(A.state.email, oldPw)
        var nh = await A.hashPassword(A.state.email, pw)
        var cr = await A.request('/api/auth/password', { old: oh, new: nh })
        if (cr.status === 200) {
          /* 改完服务端发了新登录 cookie（别的设备全下线）；停一拍让「已改好」看得见再回主页 */
          say('密码已改好，其他设备需要重新登录。', 'ok')
          setTimeout(function () { view = 'account'; render() }, 1500)
        } else say(cr.body.error || '没改成，稍后再试。', 'bad')
      }
    } catch (err) {
      say('网络出了问题，稍后再试。', 'bad')
    } finally {
      busy(false)
    }
  }

  /* 邀请码边输边排成 K7M2-QF9W 的样子 */
  function onInput(e) {
    var t = e.target
    if (t.name === 'invite') {
      var raw = t.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 8)
      var v = raw.length > 4 ? raw.slice(0, 4) + '-' + raw.slice(4) : raw
      if (v !== t.value) t.value = v
    }
    if (t.hasAttribute && t.hasAttribute('aria-invalid') && !t.classList.contains('code-box')) t.removeAttribute('aria-invalid')
  }

  async function onClick(e) {
    var b = e.target.closest('[data-goto],[data-act]')
    if (!b) return
    if (b.dataset.goto) {
      /* 登录 ↔ 注册 ↔ 找回之间切换时，已填的邮箱跟着走 */
      var em = dlg.querySelector('[name="email"]')
      if (em && em.value) mem.email = A.normEmail(em.value)
      view = b.dataset.goto
      render()
      var em2 = dlg.querySelector('[name="email"]')
      if (em2 && mem.email && !em2.value) em2.value = mem.email
    } else if (b.dataset.act === 'logout') {
      if (root.SumSum.sync && root.SumSum.sync.flush) await root.SumSum.sync.flush()
      try {
        await A.logout()
      } catch (err) {
        say('退出没有成功，请检查网络后再试一次。', 'bad') /* 没退成就别跳走，免得看着像退出了 */
        return
      }
      /* 全站要登录才能看：退出后回首页（介绍兼登录页） */
      root.location.href = '/'
    } else if (b.dataset.act === 'delete') {
      view = 'delete'
      render()
    } else if (b.dataset.act === 'changepw') {
      view = 'changepw'
      render()
    } else if (b.dataset.act === 'resend') {
      /* 注册验证码：再调一次 register（带上缓存的哈希）→ 未验证账号换密码 + 重发码；
         找回验证码：再调一次 forgot。限流（60 秒 / 每小时 3 封）由 auth-core 的 mailGate 拦 */
      b.disabled = true
      /* 注册验证码的重发走登录接口（没验证的账号登录 = 补发验证码）：注册接口要人机验证，票只能用一次 */
      var r = view === 'resetcode'
        ? await A.request('/api/auth/forgot', { email: mem.email })
        : await A.request('/api/auth/login', { email: mem.email, password: mem.hash })
      if (r.status === 200) { clearCode(); say('新的验证码已发送。', 'ok'); countdown() }
      else { say(r.body.error || '发送太频繁了，稍等再试。', 'bad'); b.disabled = false }
    }
  }

  /* hint：没登录时点了要登录的功能（如板块页的「打分」），在登录表单里说一句为什么要登录 */
  function open(v, hint) {
    if (!dlg) build()
    view = A.state.loggedIn ? 'account' : (v || 'login')
    render()
    if (hint && !A.state.loggedIn) say(esc(hint), '')
    else if (!A.state.loggedIn && view === 'login' && WHY[A.state.why]) say(WHY[A.state.why]) /* 被挤下线 / 要重新登录：说一句为什么 */
    if (!inline && !dlg.open) dlg.showModal()
  }

  /* 补填邀请码：账号页、上锁页里的 [data-redeem] 表单都走这里。开通后刷新，上锁的板块直接能用 */
  function onRedeem(e) {
    var form = e.target && e.target.closest && e.target.closest('[data-redeem]')
    if (!form) return
    e.preventDefault()
    e.stopPropagation()
    var input = form.querySelector('[name="invite"]')
    var msg = form.querySelector('[data-redeem-msg]')
    var btn = form.querySelector('button[type="submit"]')
    function show(text, bad) {
      if (!msg) return
      msg.textContent = text
      msg.className = 'redeem-msg' + (bad ? ' is-bad' : ' is-ok')
      msg.hidden = false
    }
    var raw = String(input && input.value || '').replace(/[^0-9a-z]/gi, '')
    if (raw.length !== 8) return show('邀请码是 8 位字母和数字，像 K7M2-QF9W。', true)
    if (btn) btn.disabled = true
    A.request('/api/auth/redeem', { invite: input.value }).then(function (r) {
      if (r.status === 200) {
        show('已开通完整版，正在刷新…', false)
        A.setLogin(A.state.email, A.state.admin, 'full')
        setTimeout(function () { root.location.reload() }, 600)
      } else {
        show(r.body.error || '没开通成功，稍后再试。', true)
        if (btn) btn.disabled = false
      }
    }).catch(function () {
      show('网络出了问题，稍后再试。', true)
      if (btn) btn.disabled = false
    })
  }

  function boot() {
    A = root.SumSum && root.SumSum.account
    doc.addEventListener('submit', onRedeem, true)
    doc.addEventListener('click', googleClick)
    doc.addEventListener('input', function (e) { if (e.target && e.target.closest && e.target.closest('[data-redeem]')) onInput(e) })
    var host = doc.querySelector('[data-account-inline]')
    var trigger = doc.querySelector('[data-account]')
    if (!A || (!host && !trigger && !doc.querySelector('[data-account-boot]'))) return
    if (host) {
      build(host)
      view = host.getAttribute('data-account-inline') || 'login'
      render()
    }
    if (trigger) trigger.addEventListener('click', function () { open() })
    A.onChange(function () {
      if (dlg && dlg.open) render() /* 登录态变了，弹窗内容跟着换 */
    })
    var initialSync = A.init().then(function () {
      if (inline && !A.state.loggedIn && view === 'login' && WHY[A.state.why]) say(WHY[A.state.why])
      if (A.state.moveTo) moveBar()
      if (A.state.loggedIn) return startSync()
    }).catch(function () { /* 探不到登录态就当未登录，别抛未处理的 Promise 异常 */ })
    /* 换域名过渡期（server/move.js）：旧网址上先把这台设备的数据同步上云，再跳到新网址同一页 */
    initialSync.then(function () {
      var to = A.state.moveTo
      if (!to) return
      var sync = root.SumSum.sync
      return Promise.resolve(sync && sync.flush ? sync.flush() : null).then(function () {
        root.location.replace(to)
      })
    })
    /* ?reset=<token>：改版前发出的重设链接。token 不留在历史记录里 */
    var m = root.location.search.match(/[?&]reset=([0-9a-f]{64})/)
    if (m) {
      resetToken = m[1]
      root.history.replaceState(null, '', root.location.pathname)
      open('reset')
    }
    return initialSync
  }

  var initialSync = new Promise(function (resolve) {
    function start() { resolve(boot()) }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start)
    else start()
  })
  root.SumSum = root.SumSum || {}
  root.SumSum.accountUI = { open: open, initialSync: initialSync }
})(window)
