import { readBody, respond } from '../../../../server/http.js'
import { repo } from '../../../../server/repo-d1.js'
import { listInvites, createInvites } from '../../../../server/admin-core.js'
import { requireSession } from '../../../../server/session.js'

export async function onRequestGet(context) {
  return respond(context, await listInvites(repo(context.env.DB), await requireSession(context), Date.now()))
}

export async function onRequestPost(context) {
  return respond(context, await createInvites(repo(context.env.DB), await requireSession(context), Date.now(), await readBody(context.request)))
}
