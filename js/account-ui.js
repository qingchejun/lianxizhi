/**
 * 账号弹窗：登录 / 注册（验证码六格）/ 找回 / 重设 / 已登录主页。
 * 骨架沿用 help.js：dialog 建一次、view 切换、data-act / data-goto 事件委托。
 * 登录成功 → sync.init（confirm 由本文件提供：本地/云端二选一弹窗）。
 * 首页带 ?reset=<token> 时直接打开重设视图（重设要重问邮箱：PBKDF2 盐需要它）。
 */
;(function (root) {
  'use strict'
  var doc = root.document
  var A, view = 'login', resendTimer = null, resetToken = ''

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function say(text, kind) {
    var m = dlg.querySelector('[data-msg]')
    if (!m) return
    m.innerHTML = text /* text 只由本文件写死的句子 + esc() 过的邮箱拼成 */
    m.className = 'account-msg' + (kind ? ' is-' + kind : '')
    m.hidden = !text
  }
  function busy(on) {
    var b = dlg.querySelector('[data-act="submit"]')
    if (b) b.disabled = !!on
  }

  var dlg = null
  function build() {
    dlg = doc.createElement('dialog')
    dlg.className = 'account-dialog'
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
    /* 表单提交与按钮全走委托 */
    dlg.addEventListener('submit', onSubmit)
    dlg.addEventListener('click', onClick)
  }

  function render() {
    var body = dlg.querySelector('[data-body]')
    var title = dlg.querySelector('[data-title]')
    if (A.state.loggedIn) {
      title.textContent = '账号'
      body.innerHTML =
        '<p class="account-line">已登录：<b>' + esc(A.state.email) + '</b></p>' +
        '<p class="account-sub">这台浏览器上的练习进度会自动同步到云端；换电脑登录同一账号即可带过去。</p>' +
        '<div class="account-row"><button type="button" class="btn" data-act="logout">退出登录</button></div>' +
        '<div class="account-msg" data-msg hidden></div>'
      return
    }
    var forms = {
      login: {
        title: '登录',
        html: '<form data-view="login">' +
          '<label>邮箱<input type="email" name="email" required autocomplete="email"></label>' +
          '<label>密码<input type="password" name="password" required autocomplete="current-password" minlength="8"></label>' +
          '<button type="submit" class="btn btn-primary" data-act="submit">登录</button>' +
          '<div class="account-links">' +
            '<button type="button" class="link-btn" data-goto="register">注册新账号</button>' +
            '<button type="button" class="link-btn" data-goto="forgot">忘记密码</button>' +
          '</div>' +
          '<div class="account-msg" data-msg hidden></div></form>'
      },
      register: {
        title: '注册',
        html: '<form data-view="register">' +
          '<label>邮箱<input type="email" name="email" required autocomplete="email"></label>' +
          '<label>密码（至少 8 位）<input type="password" name="password" required minlength="8" autocomplete="new-password"></label>' +
          '<button type="submit" class="btn btn-primary" data-act="submit">注册</button>' +
          '<div class="account-links"><button type="button" class="link-btn" data-goto="login">已有账号，去登录</button></div>' +
          '<div class="account-msg" data-msg hidden></div></form>'
      },
      code: {
        title: '验证邮箱',
        html: '<form data-view="code">' +
          '<p class="account-sub">验证码已发到 <b data-email></b>，10 分钟内有效。</p>' +
          '<div class="code-row">' +
            '<input class="code-box" type="text" inputmode="numeric" maxlength="1" autocomplete="one-time-code">' +
            '<input class="code-box" type="text" inputmode="numeric" maxlength="1">' +
            '<input class="code-box" type="text" inputmode="numeric" maxlength="1">' +
            '<input class="code-box" type="text" inputmode="numeric" maxlength="1">' +
            '<input class="code-box" type="text" inputmode="numeric" maxlength="1">' +
            '<input class="code-box" type="text" inputmode="numeric" maxlength="1">' +
          '</div>' +
          '<button type="submit" class="btn btn-primary" data-act="submit" hidden>提交</button>' +
          '<div class="account-links"><button type="button" class="link-btn" data-act="resend" disabled>重新发送</button>' +
          '<button type="button" class="link-btn" data-goto="login">返回登录</button></div>' +
          '<div class="account-msg" data-msg hidden></div></form>'
      },
      forgot: {
        title: '找回密码',
        html: '<form data-view="forgot">' +
          '<label>邮箱<input type="email" name="email" required autocomplete="email"></label>' +
          '<button type="submit" class="btn btn-primary" data-act="submit">发送重设邮件</button>' +
          '<div class="account-links"><button type="button" class="link-btn" data-goto="login">返回登录</button></div>' +
          '<div class="account-msg" data-msg hidden></div></form>'
      },
      reset: {
        title: '重设密码',
        html: '<form data-view="reset">' +
          '<p class="account-sub">输入注册邮箱和新密码。</p>' +
          '<label>邮箱<input type="email" name="email" required autocomplete="email"></label>' +
          '<label>新密码（至少 8 位）<input type="password" name="password" required minlength="8" autocomplete="new-password"></label>' +
          '<button type="submit" class="btn btn-primary" data-act="submit">保存新密码</button>' +
          '<div class="account-msg" data-msg hidden></div></form>'
      }
    }
    var f = forms[view] || forms.login
    title.textContent = f.title
    body.innerHTML = f.html
    if (view === 'code') {
      dlg.querySelector('[data-email]').textContent = A.normEmail(dlg.__email || '')
      wireCode()
    }
  }

  /* 六格验证码：自动跳格，第 6 格填满自动提交；错误提示后清空重填 */
  function wireCode() {
    var boxes = Array.prototype.slice.call(dlg.querySelectorAll('.code-box'))
    boxes[0].focus()
    boxes.forEach(function (b, i) {
      b.addEventListener('input', function () {
        b.value = b.value.replace(/\D/g, '').slice(-1)
        if (b.value && i < boxes.length - 1) boxes[i + 1].focus()
        if (boxes.every(function (x) { return x.value })) submitCode()
      })
      b.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !b.value && i > 0) boxes[i - 1].focus()
      })
    })
    /* 重发倒计时 60 秒 */
    var btn = dlg.querySelector('[data-act="resend"]')
    var left = 60
    btn.disabled = true
    btn.textContent = '重新发送（' + left + 's）'
    clearInterval(resendTimer)
    resendTimer = setInterval(function () {
      left--
      if (left <= 0) {
        clearInterval(resendTimer)
        btn.disabled = false
        btn.textContent = '重新发送'
      } else btn.textContent = '重新发送（' + left + 's）'
    }, 1000)
  }

  function codeValue() {
    return Array.prototype.map.call(dlg.querySelectorAll('.code-box'), function (b) { return b.value }).join('')
  }
  function clearCode() {
    Array.prototype.forEach.call(dlg.querySelectorAll('.code-box'), function (b) { b.value = '' })
    dlg.querySelectorAll('.code-box')[0].focus()
  }

  async function submitCode() {
    var email = A.normEmail(dlg.__email || '')
    var r = await A.request('/api/auth/verify', { email: email, code: codeValue() })
    if (r.status === 200) {
      A.setLogin(email)
      startSync()
      view = 'account'
      render()
    } else {
      say(r.body.error || '验证码不对，重新填一次。', 'bad')
      clearCode()
    }
  }

  var syncStarted = false
  function startSync() {
    var sync = root.SumSum.sync
    if (!sync || syncStarted) return /* 只启动一次：重复 init 会堆 onChange 监听、重复推 */
    syncStarted = true
    sync.init({
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
          dlg.querySelector('[data-title]').textContent = '选择要保留的进度'
          var done = false
          dlg.querySelector('[data-body]').addEventListener('click', function h(e) {
            var b = e.target.closest('[data-pick]')
            if (!b || done) return
            done = true
            dlg.querySelector('[data-body]').removeEventListener('click', h)
            dlg.close()
            resolve(b.dataset.pick)
          })
          dlg.showModal()
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
        var hash = await A.hashPassword(email, pw)
        if (view === 'register') {
          dlg.__hash = hash
          var r = await A.request('/api/auth/register', { email: email, password: hash })
          if (r.status === 200) { /* 未验证过的重复注册也走 200：换密码 + 重发码（auth-core 裁定） */
            dlg.__email = email
            view = 'code'
            render()
          } else say(r.body.error || '注册没成功，稍后再试。', 'bad')
        } else {
          dlg.__hash = hash
          var rl = await A.request('/api/auth/login', { email: email, password: hash })
          if (rl.status === 200 && rl.body.need_verify) {
            dlg.__email = email
            view = 'code'
            render()
          } else if (rl.status === 200) {
            A.setLogin(email)
            startSync()
            view = 'account'
            render()
          } else say(rl.body.error || '登录没成功。', 'bad')
        }
      } else if (view === 'forgot') {
        if (!A.validEmail(email)) return say('邮箱地址看起来不对。', 'bad')
        await A.request('/api/auth/forgot', { email: email })
        say('如果这个邮箱注册过，重设邮件已经发出，几分钟内到。', 'ok')
      } else if (view === 'reset') {
        if (!A.validEmail(email)) return say('邮箱地址看起来不对。', 'bad')
        if (!A.validPassword(pw)) return say('密码至少 8 位。', 'bad')
        var rh = await A.hashPassword(email, pw)
        var rr = await A.request('/api/auth/reset', { token: resetToken, password: rh })
        if (rr.status === 200) {
          A.setLogin(email)
          startSync()
          view = 'account'
          render()
        } else say(rr.body.error || '重设没成功。', 'bad')
      }
    } catch (err) {
      say('网络出了问题，稍后再试。', 'bad')
    } finally {
      busy(false)
    }
  }

  async function onClick(e) {
    var b = e.target.closest('[data-goto],[data-act]')
    if (!b) return
    if (b.dataset.goto) {
      view = b.dataset.goto
      render()
    } else if (b.dataset.act === 'logout') {
      await A.logout()
      view = 'login'
      render()
    } else if (b.dataset.act === 'resend') {
      /* 重发 = 再调一次 register（带上注册时缓存的哈希）：未验证账号 → 换密码 + 重发码，
         限流（60 秒 / 每小时 3 封）由 auth-core 的 mailGate 拦，429 时把提示亮出来 */
      var r = await A.request('/api/auth/register', { email: dlg.__email, password: dlg.__hash })
      if (r.status === 200) { clearCode(); say('新的验证码已发送。', 'ok'); wireCode() }
      else say(r.body.error || '发送太频繁了，稍等再试。', 'bad')
    }
  }

  function open(v) {
    if (!dlg) build()
    view = A.state.loggedIn ? 'account' : (v || 'login')
    render()
    dlg.showModal()
  }

  function boot() {
    A = root.SumSum && root.SumSum.account
    if (!A || !doc.querySelector('[data-account]')) return
    doc.querySelector('[data-account]').addEventListener('click', function () { open() })
    A.onChange(function () {
      if (dlg && dlg.open) render() /* 登录态变了，弹窗内容跟着换 */
    })
    A.init().then(function () {
      if (A.state.loggedIn) startSync()
    }).catch(function () { /* 探不到登录态就当未登录，别抛未处理的 Promise 异常 */ })
    /* ?reset=<token>：只在首页（module 页面会吃参数）。token 不留在历史记录里 */
    var m = root.location.search.match(/[?&]reset=([0-9a-f]{64})/)
    if (m) {
      resetToken = m[1]
      root.history.replaceState(null, '', root.location.pathname)
      open('reset')
    }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot)
  else boot()
  root.SumSum = root.SumSum || {}
  root.SumSum.accountUI = { open: open }
})(window)
