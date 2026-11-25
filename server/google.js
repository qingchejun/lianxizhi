/**
 * 谷歌登录（2026-11-25）：标准的「授权码」流程，全在服务器上做，网页里不加载谷歌的脚本。
 *   1. /api/auth/google/start：生成一次性 state，连同登录后要回的页面写进短命 cookie，跳去谷歌；
 *   2. 谷歌带着 code、state 跳回 /api/auth/google/callback：state 跟 cookie 对上了，才拿 code 去谷歌换 id_token；
 *   3. id_token 是服务器直接从谷歌（HTTPS）换回来的，按 OpenID 规范可以不验签，但要核对 iss、aud、exp、email_verified。
 * GOOGLE_CLIENT_ID（公开的）和 GOOGLE_CLIENT_SECRET 都用 wrangler pages secret put 放进线上环境：
 *   不写进 wrangler.toml 的 [vars]，免得 wrangler.toml 接管后台的环境变量。
 * 谷歌后台只登记了 https://zhihebi.com/api/auth/google/callback：别的网址（旧域名、本机）跳过去会被谷歌拒绝。
 */
export const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
export const TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const STATE_COOKIE = 'g_oauth'
export const STATE_MAX_AGE = 600 /* 10 分钟内要走完谷歌那边 */

/* 登录后回哪一页：只认本站路径（/ 开头、不是 //、没有反斜杠和控制字符），其余一律回首页 */
export function safeNext(next) {
  if (typeof next !== 'string' || next.charAt(0) !== '/' || next.charAt(1) === '/' || next.length > 300) return '/'
  if (/[\u0000-\u001f\\]/.test(next)) return '/'
  return next
}

export function callbackUrl(origin) {
  return origin + '/api/auth/google/callback'
}

export function authUrl(clientId, redirectUri, state) {
  const q = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
    scope: 'openid email', state: state, prompt: 'select_account'
  })
  return AUTH_URL + '?' + q.toString()
}

/* state cookie：「state|登录后回的页面」。state 是 32 位随机十六进制 */
export function stateCookie(state, next) {
  return STATE_COOKIE + '=' + state + '|' + encodeURIComponent(safeNext(next)) +
    '; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/google; Max-Age=' + STATE_MAX_AGE
}
export function clearStateCookie() {
  return STATE_COOKIE + '=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/google; Max-Age=0'
}
export function parseStateCookie(v) {
  if (typeof v !== 'string') return null
  const i = v.indexOf('|')
  const state = i < 0 ? v : v.slice(0, i)
  if (!/^[0-9a-f]{32}$/.test(state)) return null
  let next = '/'
  try { next = safeNext(decodeURIComponent(v.slice(i + 1))) } catch (e) { next = '/' }
  return { state: state, next: next }
}

function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/* 从 id_token 里取邮箱；不合格（别的客户端的、过期的、邮箱没验证过的）返回 null。now 是毫秒 */
export function readIdToken(idToken, clientId, now) {
  if (typeof idToken !== 'string') return null
  const parts = idToken.split('.')
  if (parts.length !== 3) return null
  let p
  try { p = JSON.parse(b64urlDecode(parts[1])) } catch (e) { return null }
  if (!p || (p.iss !== 'accounts.google.com' && p.iss !== 'https://accounts.google.com')) return null
  if (p.aud !== clientId) return null
  if (typeof p.exp !== 'number' || p.exp * 1000 <= now) return null
  if (p.email_verified !== true && p.email_verified !== 'true') return null
  if (typeof p.email !== 'string' || !p.email) return null
  return { email: p.email, sub: String(p.sub || '') }
}

/* 拿授权码去谷歌换 id_token；失败返回 null */
export async function exchangeCode(code, env, redirectUri, fetchImpl) {
  const f = fetchImpl || fetch
  try {
    const r = await f(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri, grant_type: 'authorization_code'
      }).toString(),
      signal: AbortSignal.timeout(8000) /* 谷歌那边卡住也别让家长一直等 */
    })
    if (!r.ok) return null
    const d = await r.json()
    return d && typeof d.id_token === 'string' ? d.id_token : null
  } catch (e) {
    return null
  }
}
