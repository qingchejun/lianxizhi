import { decide, assetCacheControl, pagePath } from '../server/gate.js'
import { wantsStats, statsTag } from '../server/stats.js'
import { readCookie, verify, COOKIE } from '../server/session.js'
import { meBySession } from '../server/auth-core.js'
import { repo } from '../server/repo-d1.js'
import { moveDecision } from '../server/move.js'
import { payInfo } from '../server/pay-core.js'

/* 全站登录门槛。规则见 server/gate.js；验登录沿用 /api/auth/me 的 meBySession（验签 + 改密/停用即失效）。
   验完顺手把登录态写进网页（window.__SUMSUM_ME），页面不用再单独请求一次 /api/auth/me——
   国内连海外服务器，多一个请求就可能多等十几秒（2026-11-24 手机实测「登录 11.2 秒」）。 */
export async function onRequest(context) {
  const url = new URL(context.request.url)
  /* www → 不带 www（任何请求） */
  const www = moveDecision(url.hostname, url.pathname, url.search, true, true)
  if (www && url.hostname.startsWith('www.')) return movedTo(www.location)
  const pre = decide(url.pathname, url.search, false)
  if (pre.action === 'deny') return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })
  if (pre.action === 'pass' && pre.asset) { /* 静态资源、接口：不查库（没登录也放行的板块页不走这里：要验登录、写登录态） */
    const res = await context.next()
    /* /api/ 和 /v/（要登录的视频）不改缓存头：带 ?v= 的视频请求不许被改成公开长期缓存 */
    const cc = pre.asset && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/v/') ? assetCacheControl(url.search, res.status) : null
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
  /* 旧地址打开网页：没登录直接搬，登录了先在旧页面把数据传完再跳（见 server/move.js） */
  const move = moveDecision(url.hostname, url.pathname, url.search, context.request.method === 'GET', session)
  if (move && move.action === 'redirect') return movedTo(move.location)
  if (move && move.action === 'soft') me = Object.assign({}, me, { moveTo: move.to })
  const r = decide(url.pathname, url.search, { ok: session, plan: session ? me.plan : null })

  if (r.action === 'moved') return movedTo(r.location)
  if (r.file) {
    /* 内页（/kousuan/coushifa）：文件在根目录，按表去取；登录态照常写进网页 */
    const page = await context.env.ASSETS.fetch(new URL(r.file, url))
    return withCache(withMe(page, me, context.env, url), 'private, no-cache')
  }
  if (r.action === 'redirect') {
    return new Response(null, { status: 302, headers: { Location: r.location, 'Cache-Control': 'private, no-store' } })
  }
  if (r.action === 'locked') {
    /* 免费版打开会员的板块：原网址上显示上锁说明页（能补填邀请码），不跳转、不收录 */
    const page = await context.env.ASSETS.fetch(new URL('/locked', url))
    const out = withCache(withMe(page, me, context.env, url), 'private, no-cache')
    out.headers.set('X-Robots-Tag', 'noindex')
    return out
  }
  if (r.action === 'welcome') {
    const page = await context.env.ASSETS.fetch(new URL('/welcome', url))
    /* 没登录的首页：顺带告诉页面为什么要重新登录（被别的设备挤掉 / 登录方式升级），只是一句提示 */
    const why = me && !me.ok ? { ok: false, kicked: !!me.kicked, relogin: !!me.relogin } : { ok: false }
    return withCache(withMe(page, why, context.env, url), 'private, no-cache')
  }
  /* 登录后的页面：同一网址登录前后内容不同，不许进共享缓存，浏览器每次回源确认。
     请求里去掉 If-None-Match / If-Modified-Since：网页里写着登录态和账号版本，文件没变不代表这些没变
     （2026-11-27 体验到期后浏览器拿 304 继续用旧网页，页面还以为是会员） */
  return withCache(withMe(await context.next(unconditional(context.request)), me, context.env, url), 'private, no-cache')
}

/* 只给网页注入；字段与 /api/auth/me 的返回一致（js/account.js init 直接用） */
function movedTo(location) {
  return new Response(null, { status: 301, headers: { Location: location, 'Cache-Control': 'no-store' } })
}

function meScript(me, env) {
  const safe = me && me.ok
    ? { ok: true, email: String(me.email || ''), verified: !!me.verified, admin: !!me.admin, plan: me.plan === 'free' ? 'free' : 'full',
        /* 7 天体验（2026-11-27）：账号本身的版本 + 会员到期日，页面据此写「体验还剩几天 / 已结束」 */
        base: me.base === 'free' ? 'free' : 'full', full_until: Number(me.full_until) || 0 }
    : { ok: false }
  if (me && !me.ok && me.kicked) safe.kicked = true
  if (me && !me.ok && me.relogin) safe.relogin = true
  if (me && me.ok && me.moveTo) safe.moveTo = String(me.moveTo)
  /* __SUMSUM_PLAN：账号版本，页面上一直留着（__SUMSUM_ME 被 account.js 用完就清）；
     __SUMSUM_TS：人机验证（Turnstile）的公开站点编号，没配就不出人机验证框 */
  const ts = env && env.TURNSTILE_SITEKEY ? String(env.TURNSTILE_SITEKEY) : ''
  return '<script>window.__SUMSUM_ME=' + JSON.stringify(safe).replace(/</g, '\\u003c') +
    ';window.__SUMSUM_PLAN=' + JSON.stringify(safe.ok ? safe.plan : '') +
    ';window.__SUMSUM_TS=' + JSON.stringify(ts).replace(/</g, '\\u003c') +
    /* __SUMSUM_PAY：付费开通开没开（Waffo 密钥配齐才算，2026-11-28 js/pay.js） */
    ';window.__SUMSUM_PAY=' + JSON.stringify(payPublic(env, safe)) + '</script>'
}

/* 测试环境（WAFFO_ENV=test）只给管理员看到购买按钮：家长点进去是测试收银台，付不了真钱 */
function payPublic(env, me) {
  const p = payInfo(env)
  const on = p.on && (env.WAFFO_ENV === 'prod' || !!(me && me.ok && me.admin))
  return { on: on, label: p.label }
}

function withMe(res, me, env, url) {
  const type = res.headers.get('Content-Type') || ''
  if (!type.includes('text/html') || typeof HTMLRewriter === 'undefined') return res
  const tag = meScript(me, env)
  /* 访问统计脚本（server/stats.js）：只在正式网址加，扫码打分页、管理页不加 */
  const stats = url && wantsStats(url.hostname, pagePath(url.pathname)) ? statsTag() : ''
  const out = new HTMLRewriter().on('head', {
    element(el) {
      el.prepend(tag, { html: true })
      if (stats) el.append(stats, { html: true })
    }
  }).transform(res)
  /* 写进了登录态的网页不给 ETag / Last-Modified：浏览器下次就不会拿着它来问「变了没有」 */
  const fresh = new Response(out.body, out)
  fresh.headers.delete('ETag')
  fresh.headers.delete('Last-Modified')
  return fresh
}

function unconditional(request) {
  const h = new Headers(request.headers)
  h.delete('If-None-Match')
  h.delete('If-Modified-Since')
  return new Request(request, { headers: h })
}

function withCache(res, value) {
  const out = new Response(res.body, res)
  out.headers.set('Cache-Control', value)
  out.headers.append('Vary', 'Cookie')
  return out
}
