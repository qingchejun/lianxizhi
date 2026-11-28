import { readBody, respond } from '../../../../server/http.js'
import { repo } from '../../../../server/repo-d1.js'
import { adminRefund } from '../../../../server/pay-core.js'
import { requireSession } from '../../../../server/session.js'
import * as W from '../../../../server/waffo.js'

export async function onRequestPost(context) {
  return respond(context, await adminRefund(repo(context.env.DB), W, context.env, await requireSession(context), Date.now(), await readBody(context.request)))
}
