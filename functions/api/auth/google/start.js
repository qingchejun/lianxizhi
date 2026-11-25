import { authUrl, callbackUrl, stateCookie } from '../../../../server/google.js'

/* 点「用 Google 账号登录」：带着一次性 state 跳去谷歌。?next= 是登录后回哪一页 */
export async function onRequestGet(context) {
  const env = context.env
  const url = new URL(context.request.url)
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return new Response(null, { status: 302, headers: { Location: '/?gerr=off#login', 'Cache-Control': 'no-store' } })
  }
  const b = crypto.getRandomValues(new Uint8Array(16))
  const state = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  const h = new Headers({ Location: authUrl(env.GOOGLE_CLIENT_ID, callbackUrl(url.origin), state), 'Cache-Control': 'no-store' })
  h.append('Set-Cookie', stateCookie(state, url.searchParams.get('next') || '/'))
  return new Response(null, { status: 302, headers: h })
}
