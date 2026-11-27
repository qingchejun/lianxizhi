/**
 * 登录态：HMAC-SHA256 签名的会话 cookie。payload 放 {uid, pwver, sid, exp}（ASCII，btoa 安全）；
 * 邮箱每次由 /api/auth/me 查库带出。sid 对应 sessions 表的一行（2026-11-24 起：一个账号最多 3 台设备，
 * 见 auth-core openSession）；没有 sid 的旧 cookie 一律当没登录。
 * 时间 unix 毫秒。requireSession 额外查 users 表比对 pwver：改密/重置后旧登录态立刻失效。
 */
import { planOf } from './auth-core.js'
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

export function sessionPayload(uid, pwver, now, sid) {
  return { uid: uid, pwver: pwver, sid: sid, exp: now + 90 * DAY }
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

/** data 等接口的门槛：验签 + pwver 比对 + 这台设备没被挤掉。context 是 Pages Functions 的 EventContext。
 *  返回 payload 外加 plan（视频等按版本放行用）。 */
export async function requireSession(context) {
  const raw = readCookie(context.request.headers.get('Cookie'), COOKIE)
  if (!raw) return null
  const payload = await verify(raw, context.env.SESSION_SECRET, Date.now())
  if (!payload || typeof payload.sid !== 'string') return null
  const row = await context.env.DB.prepare(
    'SELECT u.pwver, u.banned, u.plan, u.full_until, s.ended_at FROM users u JOIN sessions s ON s.id=? AND s.uid=u.id WHERE u.id=?'
  ).bind(payload.sid, payload.uid).first()
  if (!row || row.pwver !== payload.pwver || row.banned || row.ended_at) return null /* 停用账号、被挤掉的设备立即失效 */
  /* 免费账号在完整版到期日（7 天体验 / 年卡）之前按完整版放行：和 /me 用同一个 planOf */
  return Object.assign({}, payload, { plan: planOf(row, Date.now()) })
}
