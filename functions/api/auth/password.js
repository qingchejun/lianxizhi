import { readBody, respond } from '../../../server/http.js'
import { requireSession } from '../../../server/session.js'
import { changePassword } from '../../../server/auth-core.js'
import { repo } from '../../../server/repo-d1.js'

export async function onRequestPost(context) {
  const session = await requireSession(context)
  return respond(context, await changePassword(repo(context.env.DB), session, Date.now(), await readBody(context.request)))
}
