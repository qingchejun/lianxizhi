import { requireSession } from '../../server/session.js'

/* 奥数讲解视频（2026-11-24 起只给会员）：/v/aoshu/<id>.mp4
   先验登录 + 版本，再从 R2（lianxizhi-video 桶）取。支持拖动进度条（Range），
   并放进 Cloudflare 节点缓存：同一个节点第二个人看就不用再回 R2，国内播放不变慢。
   封面图（.jpg）仍走 video.zhihebi.com 公开地址（首页要用），这里只管 mp4。 */
const OK_PATH = /^\/v\/(aoshu\/[a-z0-9_-]{1,64}\.mp4)$/
/* 公开的课的视频（2026-11-25 奥数前三课公开，只有第 03 课有视频；js/aoshu-topics.js FREE） */
export const FREE_VIDEOS = ['aoshu/yiduobushao.mp4']
const EDGE_TTL = 'public, max-age=2592000'
const BROWSER_TTL = 'private, max-age=86400'

export async function fullUser(context) {
  const s = await requireSession(context) /* 验签 + 改密 / 停用 / 被挤掉的设备都不算 */
  return !!(s && s.plan !== 'free')
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
  if (!FREE_VIDEOS.includes(m[1]) && !(await fullUser(context))) return deny(403, '奥数讲解视频属于会员内容，登录会员账号后再看。')
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

  /* 没缓存：先按请求给这一个人；只在「从头开始播」（没有 Range 或从第 0 字节起）时，后台取一次整段进缓存。
     拖进度条产生的分段请求不再各自触发整段复制（2026-11-24 安全审查：省 R2 读取，也防被人刷） */
  const startsAtZero = !range || /^bytes=0-/.test(range)
  const fill = () => context.waitUntil((async () => {
    const whole = await bucket.get(m[1])
    if (!whole) return
    const h = headersOf(whole, EDGE_TTL)
    h.set('Content-Length', String(whole.size))
    await cache.put(new Request(keyUrl), new Response(whole.body, { headers: h }))
  })().catch(() => {}))

  if (!range) {
    const obj = await bucket.get(m[1])
    if (!obj) return deny(404, 'Not found')
    fill()
    const h = headersOf(obj, BROWSER_TTL)
    h.set('Content-Length', String(obj.size))
    return new Response(obj.body, { status: 200, headers: h })
  }

  let part
  try {
    part = await bucket.get(m[1], { range: context.request.headers })
  } catch (e) {
    /* 范围不合法（超出文件长度等）：416，并告诉浏览器文件多大 */
    const head = await bucket.head(m[1])
    if (!head) return deny(404, 'Not found')
    return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + head.size, 'Cache-Control': 'no-store' } })
  }
  if (!part) return deny(404, 'Not found')
  if (startsAtZero) fill()
  const h = headersOf(part, BROWSER_TTL)
  const r = part.range || {}
  let start = r.suffix !== undefined ? Math.max(0, part.size - r.suffix) : (r.offset || 0)
  let len = r.suffix !== undefined ? Math.min(r.suffix, part.size) : (r.length !== undefined ? r.length : part.size - start)
  len = Math.max(0, Math.min(len, part.size - start)) /* R2 万一原样回传超长的 length，这里夹到文件末尾 */
  h.set('Content-Range', 'bytes ' + start + '-' + (start + len - 1) + '/' + part.size)
  h.set('Content-Length', String(len))
  return new Response(part.body, { status: 206, headers: h })
}
