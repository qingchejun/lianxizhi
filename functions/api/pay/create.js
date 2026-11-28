import { readBody, json } from '../../../server/http.js'
import { requireSession } from '../../../server/session.js'
import { repo } from '../../../server/repo-d1.js'
import { createOrder } from '../../../server/pay-core.js'
import * as W from '../../../server/waffo.js'

/* 下单 → Waffo 收银台地址。要带 JSON {buy:true}（跨站表单伪造不出 application/json） */
export async function onRequestPost(context) {
  const body = await readBody(context.request)
  if (!body || body.buy !== true) return json({ ok: false, error: '请求不对。' }, 422)
  const origin = new URL(context.request.url).origin
  const r = await createOrder(repo(context.env.DB), W, context.env, await requireSession(context), Date.now(), origin)
  return json(r.body, r.status, { 'Cache-Control': 'no-store' })
}
