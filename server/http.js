/** HTTP 小件：JSON 响应与请求体解析（functions/api/* 共用）。 */
export function json(obj, status, headers) {
  const h = { 'Content-Type': 'application/json; charset=utf-8' }
  if (headers) Object.assign(h, headers)
  return new Response(JSON.stringify(obj), { status: status || 200, headers: h })
}
export async function readBody(request) {
  try {
    /* 只认 application/json：跨站自动提交的表单（enctype=text/plain 等）伪造不出这个
       Content-Type，body 一律当空 → 验参失败，挡掉「静默登进攻击者账号」的登录 CSRF */
    const ct = (request.headers.get('content-type') || '').split(';')[0].trim()
    if (ct !== 'application/json') return {}
    return await request.json()
  } catch (e) {
    return {}
  }
}

import { sign, cookieHeader, sessionPayload, clearCookieHeader } from './session.js'
import { openSession } from './auth-core.js'
import { repo } from './repo-d1.js'
import { sendMail } from './email.js'

/** 把 auth-core 的返回翻成 Response：发信、签 cookie、DEV 回显。 */
export async function respond(context, r) {
  const env = context.env
  if (r.mail && !(await sendMail(env, r.mail))) {
    return json({ ok: false, error: '邮件暂时发不出去，请稍后再试。' }, 502)
  }
  const headers = {}
  if (r.clearSession) headers['Set-Cookie'] = clearCookieHeader()
  if (r.session) {
    const now = Date.now()
    let sid
    try {
      sid = await openSession(repo(env.DB), r.session.uid, now) /* 占一个设备名额，超过 3 台挤掉最久没用的 */
    } catch (e) {
      /* 数据库一时出错：密码若已改好不会回滚，让人用（新）密码重新登录一次就行 */
      return json({ ok: false, error: '登录没完成，请稍后用密码重新登录一次。' }, 503)
    }
    const token = await sign(sessionPayload(r.session.uid, r.session.pwver, now, sid), env.SESSION_SECRET)
    headers['Set-Cookie'] = cookieHeader(token, 90 * 86400)
  }
  const body = Object.assign({}, r.body)
  if (r.dev && env.DEV_SHOW_CODE === '1') {
    const host = new URL(context.request.url).hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      if (r.dev.code) body.dev_code = r.dev.code
      if (r.dev.token) body.dev_token = r.dev.token
    }
  }
  return json(body, r.status, headers)
}

/* 访客地址（Cloudflare 填的 CF-Connecting-IP）：限流用。取不到返回空串，由调用方退回按邮箱限流 */
export function clientIp(request) {
  return (request.headers.get('CF-Connecting-IP') || '').trim()
}

/* 人机验证（Cloudflare Turnstile）：没配 TURNSTILE_SECRET 时不验（本地开发、还没在后台建好时）。
   只放在注册和找回密码上：这两处会发邮件，是刷的人唯一能消耗额度的地方 */
export async function humanCheck(context, body) {
  const secret = context.env.TURNSTILE_SECRET
  if (!secret) return true
  const token = body && typeof body.turnstile === 'string' ? body.turnstile : ''
  if (!token) return false
  try {
    const form = new FormData()
    form.append('secret', secret)
    form.append('response', token)
    const ip = clientIp(context.request)
    if (ip) form.append('remoteip', ip)
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
    const d = await r.json()
    return !!(d && d.success)
  } catch (e) {
    return false
  }
}
export const HUMAN_FAIL = { ok: false, error: '没通过「确认是真人」那一步，刷新页面再试一次。', human: false }
