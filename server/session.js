/**
 * 无状态登录态：HMAC-SHA256 签名的会话 cookie（spec 定的：不建 session 表）。
 * payload 只放 {uid, pwver, exp}（ASCII，btoa 安全）；邮箱每次由 /api/auth/me 查库带出。
 * 时间 unix 毫秒。requireSession 额外查 users 表比对 pwver：改密/重置后旧登录态立刻失效。
 */
export const COOKIE = 'sumsum_sess'
const DAY = 86400 * 1000

const enc = new TextEncoder()

async function hmac(data, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function b64url(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromB64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return decodeURIComponent(escape(atob(s)))
}
function sameHex(a, b) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

export async function sign(payload, secret) {
  const body = b64url(JSON.stringify(payload))
  return body + '.' + await hmac(body, secret)
}

export async function verify(token, secret, now) {
  if (typeof token !== 'string') return null
  const i = token.lastIndexOf('.')
  if (i < 1 || i === token.length - 1) return null
  const body = token.slice(0, i)
  const sig = token.slice(i + 1)
  if (!/^[0-9a-f]+$/.test(sig)) return null
  if (!sameHex(sig, await hmac(body, secret))) return null
  let payload
  try {
    payload = JSON.parse(fromB64url(body))
  } catch (e) {
    return null
  }
  if (!payload || typeof payload.uid !== 'string' || typeof payload.pwver !== 'number' ||
      typeof payload.exp !== 'number' || payload.exp <= now) return null
  return payload
}

export function sessionPayload(uid, pwver, now) {
  return { uid: uid, pwver: pwver, exp: now + 90 * DAY }
}

export function cookieHeader(token, maxAgeSec) {
  return COOKIE + '=' + token + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=' + maxAgeSec
}

export function clearCookieHeader() {
  return COOKIE + '=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
}

export function readCookie(header, name) {
  if (!header) return null
  const parts = header.split(';')
  for (const p of parts) {
    const t = p.trim()
    if (t.startsWith(name + '=')) return t.slice(name.length + 1)
  }
  return null
}

/** data 等接口的门槛：验签 + pwver 比对。context 是 Pages Functions 的 EventContext。 */
export async function requireSession(context) {
  const raw = readCookie(context.request.headers.get('Cookie'), COOKIE)
  if (!raw) return null
  const payload = await verify(raw, context.env.SESSION_SECRET, Date.now())
  if (!payload) return null
  const user = await context.env.DB.prepare('SELECT id, pwver FROM users WHERE id=?').bind(payload.uid).first()
  if (!user || user.pwver !== payload.pwver) return null
  return payload
}
