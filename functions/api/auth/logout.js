import { json } from '../../../server/http.js'
import { clearCookieHeader, readCookie, verify, COOKIE } from '../../../server/session.js'

/* 退出：清 cookie，并把这台设备的登录记录结掉，让出 3 台的名额 */
export async function onRequestPost(context) {
  try {
    const raw = readCookie(context.request.headers.get('Cookie'), COOKIE)
    const p = raw ? await verify(raw, context.env.SESSION_SECRET, Date.now()) : null
    if (p && typeof p.sid === 'string') {
      await context.env.DB.prepare("UPDATE sessions SET ended_at=?, ended_reason='logout' WHERE id=? AND uid=? AND ended_at IS NULL")
        .bind(Date.now(), p.sid, p.uid).run()
    }
  } catch (e) { /* 记录没结掉也照样退出：cookie 清了这台就登不上了 */ }
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookieHeader() })
}
