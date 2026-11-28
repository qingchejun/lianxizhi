import { json } from '../../../server/http.js'
import { repo } from '../../../server/repo-d1.js'
import { sendMail } from '../../../server/email.js'
import { webhook } from '../../../server/pay-core.js'
import * as W from '../../../server/waffo.js'

/* Waffo 回调（在 Waffo 后台登记的地址：https://zhihebi.com/api/pay/waffo）。验签在 pay-core.webhook 里 */
export async function onRequestPost(context) {
  /* 回调很小；没验签前不读大包（安全复审 11-28） */
  if (Number(context.request.headers.get('content-length') || 0) > 65536) return json({ ok: false }, 413)
  const payload = await context.request.text()
  if (payload.length > 65536) return json({ ok: false }, 413)
  const r = await webhook(repo(context.env.DB), W, context.env, payload, context.request.headers.get('x-waffo-signature'), Date.now())
  if (r.mail) {
    try { await sendMail(context.env, r.mail) } catch (e) { console.log('[pay] 开通邮件没发出去') }
  }
  return json(r.body, r.status)
}
