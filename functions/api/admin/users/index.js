import { json } from '../../../../server/http.js'
import { repo } from '../../../../server/repo-d1.js'
import { listUsers } from '../../../../server/admin-core.js'
import { requireSession } from '../../../../server/session.js'

export async function onRequestGet(context) {
  const r = await listUsers(repo(context.env.DB), await requireSession(context), Date.now())
  return json(r.body, r.status)
}
