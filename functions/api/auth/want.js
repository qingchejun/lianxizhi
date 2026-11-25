import { readBody, respond, json } from '../../../server/http.js'
import { requireSession } from '../../../server/session.js'
import { wantFull } from '../../../server/auth-core.js'
import { repo } from '../../../server/repo-d1.js'

/* 「开通时通知我」：GET 查登记过没有，POST 登记（完整版说明页用，2026-11-25）。
   POST 要带 JSON {want:true}：跟别的接口一样，跨站表单伪造不出 application/json */
export async function onRequestGet(context) {
  return respond(context, await wantFull(repo(context.env.DB), await requireSession(context), Date.now(), false))
}
export async function onRequestPost(context) {
  const body = await readBody(context.request)
  if (!body || body.want !== true) return json({ ok: false, error: '请求不对。' }, 422)
  return respond(context, await wantFull(repo(context.env.DB), await requireSession(context), Date.now(), true))
}
