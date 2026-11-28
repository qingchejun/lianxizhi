import { json } from '../../../server/http.js'
import { requireSession } from '../../../server/session.js'
import { repo } from '../../../server/repo-d1.js'
import { sendMail } from '../../../server/email.js'
import { orderStatus } from '../../../server/pay-core.js'
import * as W from '../../../server/waffo.js'

/* 付款完成页轮询：?o=订单号。没到账时顺手去 Waffo 查一次，查到已付就开通（回调丢了的兜底） */
export async function onRequestGet(context) {
  const o = new URL(context.request.url).searchParams.get('o') || ''
  const r = await orderStatus(repo(context.env.DB), W, context.env, await requireSession(context), o, Date.now())
  if (r.mail) {
    try { await sendMail(context.env, r.mail) } catch (e) { console.log('[pay] 开通邮件没发出去', o) }
  }
  return json(r.body, r.status, { 'Cache-Control': 'no-store' })
}
