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

import { sign, cookieHeader, sessionPayload } from './session.js'
import { sendMail } from './email.js'

/** 把 auth-core 的返回翻成 Response：发信、签 cookie、DEV 回显。 */
export async function respond(context, r) {
  const env = context.env
  if (r.mail && !(await sendMail(env, r.mail))) {
    return json({ ok: false, error: '邮件暂时发不出去，请稍后再试。' }, 502)
  }
  const headers = {}
  if (r.session) {
    const token = await sign(sessionPayload(r.session.uid, r.session.pwver, Date.now()), env.SESSION_SECRET)
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
