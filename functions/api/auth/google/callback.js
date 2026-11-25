import { callbackUrl, clearStateCookie, exchangeCode, parseStateCookie, readIdToken, STATE_COOKIE } from '../../../../server/google.js'
import { googleLogin, openSession } from '../../../../server/auth-core.js'
import { sign, cookieHeader, sessionPayload, readCookie } from '../../../../server/session.js'
import { repo } from '../../../../server/repo-d1.js'

/* 谷歌跳回来：核对 state → 换 id_token → 登进（或新建）账号 → 回到点登录前的页面。
   出错一律回首页 /?gerr=原因#login，首页弹出登录框说一句（见 welcome.html） */
export async function onRequestGet(context) {
  const env = context.env
  const url = new URL(context.request.url)
  const back = function (location, extraCookie) {
    const h = new Headers({ Location: location, 'Cache-Control': 'no-store' })
    h.append('Set-Cookie', clearStateCookie())
    if (extraCookie) h.append('Set-Cookie', extraCookie)
    return new Response(null, { status: 302, headers: h })
  }
  const fail = function (why) { return back('/?gerr=' + why + '#login') }

  if (url.searchParams.get('error')) return fail('cancel') /* 在谷歌那边点了取消 */
  const saved = parseStateCookie(readCookie(context.request.headers.get('Cookie'), STATE_COOKIE))
  const state = url.searchParams.get('state') || ''
  if (!saved || saved.state !== state) return fail('state')
  const code = url.searchParams.get('code') || ''
  if (!code || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return fail('token')

  const now = Date.now()
  const idToken = await exchangeCode(code, env, callbackUrl(url.origin))
  const profile = readIdToken(idToken, env.GOOGLE_CLIENT_ID, now)
  if (!profile) return fail('token')

  const db = repo(env.DB)
  let r, sid
  try {
    r = await googleLogin(db, now, profile)
    if (r.status !== 200) return fail(r.status === 403 ? 'banned' : 'token')
    sid = await openSession(db, r.session.uid, now) /* 跟密码登录一样占一个设备名额 */
  } catch (e) {
    return fail('token')
  }
  const token = await sign(sessionPayload(r.session.uid, r.session.pwver, now, sid), env.SESSION_SECRET)
  return back(saved.next, cookieHeader(token, 90 * 86400))
}
