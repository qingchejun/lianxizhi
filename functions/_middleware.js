import { decide, assetCacheControl } from '../server/gate.js'
import { requireSession } from '../server/session.js'

/* 全站登录门槛。规则见 server/gate.js；验登录沿用接口的 requireSession（验签 + 改密/停用即失效）。 */
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

  let session = null
  try {
    session = await requireSession(context)
  } catch (e) {
    session = null /* 数据库出错：宁可拦下，也不放没验过的人进来 */
  }
  const r = decide(url.pathname, url.search, !!session)

  if (r.action === 'redirect') {
    return new Response(null, { status: 302, headers: { Location: r.location, 'Cache-Control': 'private, no-store' } })
  }
  if (r.action === 'welcome') {
    const page = await context.env.ASSETS.fetch(new URL('/welcome', url))
    return withCache(page, 'no-cache')
  }
  /* 登录后的页面：同一网址登录前后内容不同，不许进共享缓存，浏览器每次回源确认 */
  return withCache(await context.next(), 'private, no-cache')
}

function withCache(res, value) {
  const out = new Response(res.body, res)
  out.headers.set('Cache-Control', value)
  out.headers.append('Vary', 'Cookie')
  return out
}
