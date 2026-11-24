import { trackingPath, forwardHeaders, STATS_ORIGIN, MAX_BODY_BYTES } from '../../server/stats.js'

/* 访问统计转发（规则见 server/stats.js）：/nx/script.js、/nx/site/tracking-config/<id>、POST /nx/track，其余 404 */
export async function onRequest(context) {
  const req = context.request
  const url = new URL(req.url)
  const path = trackingPath(req.method, url.pathname)
  if (path === null) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })
  let body
  if (req.method === 'POST') {
    if (Number(req.headers.get('content-length') || '0') > MAX_BODY_BYTES) return new Response('Too large', { status: 413 })
    body = await req.arrayBuffer()
    if (body.byteLength > MAX_BODY_BYTES) return new Response('Too large', { status: 413 })
  }
  let up
  try {
    up = await fetch(STATS_ORIGIN + '/api' + path + url.search, {
      method: req.method, headers: forwardHeaders(req.headers), body: body, redirect: 'manual'
    })
  } catch (e) {
    return new Response('', { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
  const out = new Headers(up.headers)
  out.delete('set-cookie')
  out.delete('content-encoding')
  out.delete('content-length')
  if (path === '/script.js') out.set('Cache-Control', 'public, max-age=3600')
  return new Response(up.body, { status: up.status, headers: out })
}
