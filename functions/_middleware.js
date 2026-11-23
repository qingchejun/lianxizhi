import { decide, assetCacheControl } from '../server/gate.js'
import { readCookie, verify, COOKIE } from '../server/session.js'
import { meBySession } from '../server/auth-core.js'
import { repo } from '../server/repo-d1.js'

/* 全站登录门槛。规则见 server/gate.js；验登录沿用 /api/auth/me 的 meBySession（验签 + 改密/停用即失效）。
   验完顺手把登录态写进网页（window.__SUMSUM_ME），页面不用再单独请求一次 /api/auth/me——
   国内连海外服务器，多一个请求就可能多等十几秒（2026-11-24 手机实测「登录 11.2 秒」）。 */
export async function onRequest(context) {
  const url = new URL(context.request.url)
  const pre = decide(url.pathname, url.search, false)
  if (pre.action === 'deny') return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })
  if (pre.action === 'pass') { /* 静态资源、接口：不查库 */
    const res = await context.next()
    const cc = pre.asset && !url.pathname.startsWith('/api/') ? assetCacheControl(url.search, res.status) : null
    if (!cc) return res
    const out = new Response(res.body, res)
    out.headers.set('Cache-Control', cc)
    return out
  }

  let me = { ok: false }
  try {
    const raw = readCookie(context.request.headers.get('Cookie'), COOKIE)
    const payload = raw ? await verify(raw, context.env.SESSION_SECRET, Date.now()) : null
    if (payload) me = (await meBySession(repo(context.env.DB), payload)).body
  } catch (e) {
    me = { ok: false } /* 数据库出错：宁可拦下，也不放没验过的人进来 */
  }
  const session = !!(me && me.ok)
  const r = decide(url.pathname, url.search, session)

  if (r.action === 'redirect') {
    return new Response(null, { status: 302, headers: { Location: r.location, 'Cache-Control': 'private, no-store' } })
  }
  if (r.action === 'welcome') {
    const page = await context.env.ASSETS.fetch(new URL('/welcome', url))
    return withCache(withMe(page, { ok: false }), 'no-cache')
  }
  /* 登录后的页面：同一网址登录前后内容不同，不许进共享缓存，浏览器每次回源确认 */
  return withCache(withMe(await context.next(), me), 'private, no-cache')
}

/* 只给网页注入；字段与 /api/auth/me 的返回一致（js/account.js init 直接用） */
function meScript(me) {
  const safe = me && me.ok
    ? { ok: true, email: String(me.email || ''), verified: !!me.verified, admin: !!me.admin }
    : { ok: false }
  return '<script>window.__SUMSUM_ME=' + JSON.stringify(safe).replace(/</g, '\\u003c') + '</script>'
}

function withMe(res, me) {
  const type = res.headers.get('Content-Type') || ''
  if (!type.includes('text/html') || typeof HTMLRewriter === 'undefined') return res
  const tag = meScript(me)
  return new HTMLRewriter().on('head', {
    element(el) { el.prepend(tag, { html: true }) }
  }).transform(res)
}

function withCache(res, value) {
  const out = new Response(res.body, res)
  out.headers.set('Cache-Control', value)
  out.headers.append('Vary', 'Cookie')
  return out
}
