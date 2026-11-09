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

  var state = { loggedIn: false, email: '' }
  var listeners = []
  function setLogin(email) {
    state.loggedIn = !!email
    state.email = email || ''
    listeners.forEach(function (fn) { fn(state) })
  }

  /* 页面打开先探一下登录态（me 401 = 没登录，不算错） */
  async function init(fetchFn) {
    var r = await request('/api/auth/me', undefined, fetchFn)
    if (r.status === 200 && r.body.ok) setLogin(r.body.email)
    return state
  }

  async function logout(fetchFn) {
    await request('/api/auth/logout', {}, fetchFn)
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
