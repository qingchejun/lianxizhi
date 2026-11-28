import { json } from '../../../server/http.js'
import { payInfo } from '../../../server/pay-core.js'

/* 收款开没开、价格（页面据此显示「开通完整版 · 99 元/年」还是「开通时通知我」） */
export async function onRequestGet(context) {
  return json(Object.assign({ ok: true }, payInfo(context.env)), 200, { 'Cache-Control': 'no-store' })
}
