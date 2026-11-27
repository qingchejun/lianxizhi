/**
 * 账号：浏览器端只做一层 PBKDF2（SHA-256、60 万轮、盐=小写邮箱+固定串），
 * 明文密码不出浏览器，服务器再叠一层 SHA-256。API 封装带登录态广播，
 * UI（account-ui.js）只认这里的 state 与 onChange。
 */
;(function (root) {
  'use strict'

  var SALT_SUFFIX = 'lianxizhi-account-v1'
  var ITER = 600000

  function normEmail(v) {
    return String(v || '').trim().toLowerCase()
  }
  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim())
  }
  function validPassword(p) {
    return typeof p === 'string' && p.length >= 8
  }

  var te = new TextEncoder()
  function toHex(buf) {
    return Array.from(new Uint8Array(buf)).map(function (b) {
      return (b < 16 ? '0' : '') + b.toString(16)
    }).join('')
  }

  async function hashPassword(email, password) {
    var key = await root.crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveBits'])
    var bits = await root.crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: te.encode(normEmail(email) + SALT_SUFFIX), iterations: ITER },
      key, 256
    )
    return toHex(bits)
  }

  async function request(path, body, fetchFn) {
    var f = fetchFn || root.fetch
    var r = await f(path, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    var text = await r.text()
    var data = null
    try {
      data = text ? JSON.parse(text) : {}
    } catch (e) {
      data = {}
    }
    return { status: r.status, body: data }
  }

  var state = { loggedIn: false, email: '', admin: false, plan: '', base: '', fullUntil: 0 }
  var listeners = []
  /* plan：free = 免费版（口算、数独和游戏组），full = 完整版；没给就沿用服务器写进网页的 __SUMSUM_PLAN */
  /* base / fullUntil：账号本身的版本和完整版到期日（2026-11-27 起免费账号注册送 7 天体验），「今天」页写还剩几天 */
  function setLogin(email, admin, plan, base, fullUntil) {
    state.base = !email ? '' : (base === 'free' || base === 'full' ? base : (plan === 'free' ? 'free' : 'full'))
    state.fullUntil = !email ? 0 : Number(fullUntil) || 0
    state.loggedIn = !!email
    state.email = email || ''
    state.admin = !!email && !!admin
    state.plan = !email ? '' : (plan === 'free' || plan === 'full' ? plan : (root.__SUMSUM_PLAN || 'full'))
    if (email) root.__SUMSUM_PLAN = state.plan
    listeners.forEach(function (fn) { fn(state) })
  }

  /* 页面打开先探一下登录态（me 401 = 没登录，不算错） */
  async function init(fetchFn) {
    /* 服务器发网页时已经验过登录、写进了页面（functions/_middleware.js），直接用，省一个请求。
       只用一次：之后（测试里、或没注入的页面）照常问 /api/auth/me */
    var pre = !fetchFn && root.__SUMSUM_ME
    if (pre && typeof pre === 'object') {
      root.__SUMSUM_ME = null
      if (pre.ok) setLogin(pre.email, pre.admin, pre.plan, pre.base, pre.full_until)
      if (pre.ok && typeof pre.moveTo === 'string') state.moveTo = pre.moveTo /* 旧网址：同步完要跳到新网址（account-ui） */
      /* 为什么又要登录：被第 4 台设备挤掉 / 设备上限上线前的旧登录（登录页说一句，account-ui） */
      state.why = pre.ok ? '' : pre.kicked ? 'kicked' : pre.relogin ? 'relogin' : ''
      return state
    }
    var r = await request('/api/auth/me', undefined, fetchFn)
    if (r.status === 200 && r.body.ok) setLogin(r.body.email, r.body.admin, r.body.plan, r.body.base, r.body.full_until)
    return state
  }

  /* 只有服务器确认清掉了登录 cookie 才算退出；断网 / 出错就抛出，由界面提示重试（共用电脑时别让人误以为退出了） */
  async function logout(fetchFn) {
    var r = await request('/api/auth/logout', {}, fetchFn)
    if (r.status !== 200) throw new Error('logout failed: ' + r.status)
    setLogin('')
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.account = {
    normEmail: normEmail,
    validEmail: validEmail,
    validPassword: validPassword,
    hashPassword: hashPassword,
    request: request,
    init: init,
    logout: logout,
    setLogin: setLogin,
    state: state,
    onChange: function (fn) {
      if (typeof fn === 'function') listeners.push(fn)
    }
  }
})(typeof window !== 'undefined' ? window : globalThis)
