/**
 * 访问统计（2026-11-24 接入 aship 的 Rybbit，统计服务器 stats.aship.fun 是站长自己的）。纯函数，tools/check-stats.js 校验。
 *
 * 1. 统计脚本走本站的 /nx/ 转发（functions/nx/[[path]].js），浏览器不直接连统计服务器，少被拦截插件挡；
 *    转发只放行统计脚本自己要用的几个地址，统计后台和接口一律 404。规则照搬模板站 src/lib/rybbit-proxy.ts（Rybbit v2.9.1）。
 * 2. 只在正式网址 zhihebi.com 上加脚本（本机预览、旧地址不加）；扫码打分页（网址里带纸的编号）、管理页不加。
 * 3. 只数访问，不跟账号挂钩（不调 identify）；Rybbit 那边已关掉网址参数、单页跳转、录屏。
 */
export const STATS_HOST = 'zhihebi.com'
export const STATS_SITE_ID = 'a91ff53bab73' /* Rybbit 站点 11 */
export const STATS_ORIGIN = 'https://stats.aship.fun'
export const STATS_PREFIX = '/nx'

const NO_STATS = ['/mark', '/admin']

/* 这个网页要不要加统计脚本；path 用规整过的网址（server/gate.js pagePath） */
export function wantsStats(hostname, page) {
  if (hostname !== STATS_HOST) return false
  return !NO_STATS.some(p => page === p || page.startsWith(p + '/'))
}

export function statsTag() {
  return '<script src="' + STATS_PREFIX + '/script.js?siteId=' + STATS_SITE_ID + '" defer></script>'
}

const ID = '[A-Za-z0-9]{1,32}'
const RULES = [
  { method: 'GET', path: /^\/script\.js$/ },
  { method: 'GET', path: new RegExp('^/site/tracking-config/' + ID + '$') },
  { method: 'POST', path: /^\/track$/ },
]

/* 允许转发的请求 → 统计服务器 /api 后面的路径；其余 null */
export function trackingPath(method, pathname) {
  if (!pathname.startsWith(STATS_PREFIX + '/')) return null
  const rest = pathname.slice(STATS_PREFIX.length)
  return RULES.some(r => r.method === method && r.path.test(rest)) ? rest : null
}

/* 不往统计服务器带的请求头：本站 cookie（登录状态）、凭据、访客自己填的 IP 头（会冒充 IP 和国家） */
const DROP = ['cookie', 'authorization', 'x-api-key', 'host', 'content-length',
  'x-real-ip', 'x-forwarded-for', 'forwarded', 'true-client-ip', 'cf-connecting-ip']

export function forwardHeaders(incoming) {
  const out = new Headers(incoming)
  for (const h of DROP) out.delete(h)
  for (const h of [...out.keys()]) if (h.startsWith('cf-')) out.delete(h)
  const ip = (incoming.get('cf-connecting-ip') || '').split(',')[0].trim() /* Cloudflare 自己写的访客 IP，访客改不了 */
  if (ip) { out.set('x-real-ip', ip); out.set('x-forwarded-for', ip) }
  return out
}

export const MAX_BODY_BYTES = 100000
