import { respond } from '../../../../server/http.js'
import { repo } from '../../../../server/repo-d1.js'
import { listOrders } from '../../../../server/pay-core.js'
import { requireSession } from '../../../../server/session.js'

export async function onRequestGet(context) {
  return respond(context, await listOrders(repo(context.env.DB), await requireSession(context)))
}
