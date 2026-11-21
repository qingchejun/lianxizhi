/**
 * 账号界面：登录 / 注册（验证码六格）/ 找回（验证码六格 + 新密码）/ 修改密码 / 已登录主页。
 *
 * 两种挂法，同一套视图：
 *   弹窗 —— 板块页左下角「账号」按钮（[data-account]）打开 <dialog>；
 *   内嵌 —— 没登录时的首页（welcome.html）里有 [data-account-inline]，表单直接画在页面上，
 *          手机微信里点开就能填，不用再点一下弹窗。
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
  function tabs(on) {
    return '<div class="stage-tabs auth-tabs" role="tablist">' +
      '<button type="button" role="tab" class="stage-tab' + (on === 'login' ? ' active' : '') + '" aria-selected="' + (on === 'login') + '" data-goto="login">登录</button>' +
      '<button type="button" role="tab" class="stage-tab' + (on === 'register' ? ' active' : '') + '" aria-selected="' + (on === 'register') + '" data-goto="register">注册</button>' +
    '</div>'
  }
  function head(title, sub) {
    return '<div class="auth-head"><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>'
  }

  function forms() {
    var who = '<b>' + esc(mem.email) + '</b>'
    return {
      login: {
        title: '登录',
        html: tabs('login') + '<form data-view="login" novalidate>' + EMAIL +
          '<label class="auth-field"><span>密码<button type="button" class="link-btn quiet" data-goto="forgot">忘记密码？</button></span>' +
          '<input class="input" type="password" name="password" required autocomplete="current-password" minlength="8"></label>' +
          MSG + '<button type="submit" class="btn btn-primary btn-lg auth-submit" data-act="submit">登录</button></form>'
      },
      register: {
        title: '注册',
        html: tabs('register') + '<form data-view="register" novalidate>' + EMAIL +
          field('密码', '<input class="input" type="password" name="password" required minlength="8" autocomplete="new-password">', '至少 8 位') +
          field('邀请码', '<input class="input input-code" type="text" name="invite" required autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="9" placeholder="K7M2-QF9W">', '找邀请你的家长要，一个邀请码只能注册一个账号') +
          MSG + '<button type="submit" class="btn btn-primary btn-lg auth-submit" data-act="submit">注册，发验证码到邮箱</button></form>'
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
      }
    }
  }

  function render() {
    var body = dlg.querySelector('[data-body]')
    var title = dlg.querySelector('[data-title]')
    /* 登录态掉了还停在改密码表单上，回去登录页（提交也只会 401） */
    if (!A.state.loggedIn && (view === 'account' || view === 'changepw')) view = 'login'
    if (A.state.loggedIn && view !== 'changepw') {
      if (title) title.textContent = '账号'
      body.innerHTML =
        '<div class="account-who"><span class="account-avatar" aria-hidden="true">' + esc(A.state.email.charAt(0).toUpperCase()) + '</span>' +
          '<div><b>' + esc(A.state.email) + '</b><small>已登录 · 练习进度自动同步</small></div></div>' +
        '<p class="account-sub">换一台电脑，登录同一个账号，进度就跟过去了。</p>' +
        (A.state.admin ? '<div class="account-row"><a class="btn" href="admin.html">管理员面板</a></div>' : '') +
        '<div class="account-row">' +
          '<button type="button" class="btn" data-act="changepw">修改密码</button>' +
          '<button type="button" class="btn btn-danger" data-act="logout">退出登录</button>' +
        '</div>' + MSG
      return
    }
    var f = forms()[view] || forms().login
    if (title) title.textContent = f.title
    body.innerHTML = f.html
    body.setAttribute('data-view', view)
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

  function loggedIn(email, admin) {
    A.setLogin(email, admin)
    startSync()
    view = 'account'
    if (!inline) render()
    else say('登录成功，正在打开…', 'ok')
  }

  var syncStarted = false
  function startSync() {
    var sync = root.SumSum.sync
    if (!sync || syncStarted) return /* 只启动一次：重复 init 会堆 onChange 监听、重复推 */
    syncStarted = true
    return sync.init({
      confirm: function (o) {
        return new Promise(function (resolve) {
          var lines = function (keys) {
            return '<ul>' + keys.slice(0, 8).map(function (k) { return '<li>' + esc(k) + '</li>' }).join('') +
              (keys.length > 8 ? '<li>…共 ' + keys.length + ' 项</li>' : '') + '</ul>'
          }
          dlg.querySelector('[data-body]').innerHTML =
            '<p class="account-sub">这台电脑上和云端<b>都有</b>练习进度，先上传哪边？</p>' +
            '<div class="account-choice">' +
              '<button type="button" class="btn" data-pick="local">用这台电脑的<br><small>' + o.local.length + ' 项</small>' + lines(o.local) + '</button>' +
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
        if (view === 'register' && fd.get('invite').replace(/[^0-9a-z]/gi, '').length !== 8) {
          return say('邀请码是 8 位字母和数字，像 K7M2-QF9W。', 'bad')
        }
        var hash = await A.hashPassword(email, pw)
        mem.email = email
        mem.hash = hash
        if (view === 'register') {
          var r = await A.request('/api/auth/register', { email: email, password: hash, invite: fd.get('invite') || '' })
          if (r.status === 200) { /* 未验证过的重复注册也走 200：换密码 + 重发码（auth-core 裁定） */
            view = 'code'
            render()
          } else say(r.body.error || '注册没成功，稍后再试。', 'bad')
        } else {
          var rl = await A.request('/api/auth/login', { email: email, password: hash })
          if (rl.status === 200 && rl.body.need_verify) {
            view = 'code'
            render()
          } else if (rl.status === 200) {
            loggedIn(email, rl.body.admin)
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
        if (rc.status === 200) loggedIn(mem.email, rc.body.admin)
        else say(rc.body.error || '没改成，稍后再试。', 'bad')
      } else if (view === 'reset') {
        if (!A.validEmail(email)) return say('邮箱地址看起来不对。', 'bad')
        if (!A.validPassword(pw)) return say('密码至少 8 位。', 'bad')
        var rr = await A.request('/api/auth/reset', { token: resetToken, password: await A.hashPassword(email, pw) })
        if (rr.status === 200) loggedIn(email, rr.body.admin)
        else say(rr.body.error || '重设没成功。', 'bad')
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
    } else if (b.dataset.act === 'changepw') {
      view = 'changepw'
      render()
    } else if (b.dataset.act === 'resend') {
      /* 注册验证码：再调一次 register（带上缓存的哈希）→ 未验证账号换密码 + 重发码；
         找回验证码：再调一次 forgot。限流（60 秒 / 每小时 3 封）由 auth-core 的 mailGate 拦 */
      b.disabled = true
      var r = view === 'resetcode'
        ? await A.request('/api/auth/forgot', { email: mem.email })
        : await A.request('/api/auth/register', { email: mem.email, password: mem.hash })
      if (r.status === 200) { clearCode(); say('新的验证码已发送。', 'ok'); countdown() }
      else { say(r.body.error || '发送太频繁了，稍等再试。', 'bad'); b.disabled = false }
    }
  }

  function open(v) {
    if (!dlg) build()
    view = A.state.loggedIn ? 'account' : (v || 'login')
    render()
    if (!inline) dlg.showModal()
  }

  function boot() {
    A = root.SumSum && root.SumSum.account
    var host = doc.querySelector('[data-account-inline]')
    var trigger = doc.querySelector('[data-account]')
    if (!A || (!host && !trigger)) return
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
      if (A.state.loggedIn) return startSync()
    }).catch(function () { /* 探不到登录态就当未登录，别抛未处理的 Promise 异常 */ })
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
