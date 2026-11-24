import { readCookie, verify, COOKIE } from '../../server/session.js'

/* 奥数讲解视频（2026-11-24 起只给完整版）：/v/aoshu/<id>.mp4
   先验登录 + 版本，再从 R2（lianxizhi-video 桶）取。支持拖动进度条（Range），
   并放进 Cloudflare 节点缓存：同一个节点第二个人看就不用再回 R2，国内播放不变慢。
   封面图（.jpg）仍走 video.zhihebi.com 公开地址（首页要用），这里只管 mp4。 */
const OK_PATH = /^\/v\/(aoshu\/[a-z0-9_-]{1,64}\.mp4)$/
const EDGE_TTL = 'public, max-age=2592000'
const BROWSER_TTL = 'private, max-age=86400'

export async function fullUser(context) {
  const raw = readCookie(context.request.headers.get('Cookie'), COOKIE)
  if (!raw) return false
  const payload = await verify(raw, context.env.SESSION_SECRET, Date.now())
  if (!payload) return false
  const u = await context.env.DB.prepare('SELECT pwver, banned, plan FROM users WHERE id=?').bind(payload.uid).first()
  return !!(u && u.pwver === payload.pwver && !u.banned && u.plan !== 'free')
}

function deny(status, text) {
  return new Response(text, { status: status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}

function headersOf(obj, cc) {
  const h = new Headers()
  h.set('Content-Type', 'video/mp4')
  h.set('Accept-Ranges', 'bytes')
  h.set('Cache-Control', cc)
  if (obj.httpEtag) h.set('ETag', obj.httpEtag)
  return h
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const m = url.pathname.match(OK_PATH)
  if (!m) return deny(404, 'Not found')
  if (!(await fullUser(context))) return deny(403, '奥数讲解视频属于完整版，登录完整版账号后再看。')
  const bucket = context.env.VIDEO
  if (!bucket) return deny(503, '视频暂时打不开，稍后再试。')

  /* 节点缓存：键不带 cookie、不带查询串；存整段，Range 由缓存自己切 */
  const cache = caches.default
  const keyUrl = 'https://zhihebi.com/__video-cache/' + m[1]
  const range = context.request.headers.get('Range')
  const hit = await cache.match(new Request(keyUrl, { headers: range ? { Range: range } : {} }))
  if (hit) {
    const out = new Response(hit.body, hit)
    out.headers.set('Cache-Control', BROWSER_TTL) /* 缓存里是公开整段；给浏览器时只许它自己存 */
    return out
  }

  /* 没缓存：整段请求就一份流分两路（给用户、进缓存）；Range 请求先按范围给，后台再取整段进缓存 */
  const putWhole = (obj, body) => cache.put(new Request(keyUrl), new Response(body, { headers: (() => {
    const h = headersOf(obj, EDGE_TTL)
    h.set('Content-Length', String(obj.size))
    return h
  })() }))

  if (!range) {
    const obj = await bucket.get(m[1])
    if (!obj) return deny(404, 'Not found')
    const [a, b] = obj.body.tee()
    context.waitUntil(putWhole(obj, b).catch(() => {}))
    const h = headersOf(obj, BROWSER_TTL)
    h.set('Content-Length', String(obj.size))
    return new Response(a, { status: 200, headers: h })
  }

  const part = await bucket.get(m[1], { range: context.request.headers })
  if (!part) return deny(404, 'Not found')
  context.waitUntil((async () => {
    const whole = await bucket.get(m[1])
    if (whole) await putWhole(whole, whole.body)
  })().catch(() => {}))
  const h = headersOf(part, BROWSER_TTL)
  const r = part.range || {}
  const start = r.suffix !== undefined ? part.size - r.suffix : (r.offset || 0)
  const len = r.suffix !== undefined ? r.suffix : (r.length !== undefined ? r.length : part.size - start)
  h.set('Content-Range', 'bytes ' + start + '-' + (start + len - 1) + '/' + part.size)
  h.set('Content-Length', String(len))
  return new Response(part.body, { status: 206, headers: h })
}
