import { readBody, respond } from '../../../../server/http.js'
import { repo } from '../../../../server/repo-d1.js'
import { setBan } from '../../../../server/admin-core.js'
import { requireSession } from '../../../../server/session.js'

export async function onRequestPost(context) {
  return respond(context, await setBan(repo(context.env.DB), await requireSession(context), Date.now(), await readBody(context.request)))
}
