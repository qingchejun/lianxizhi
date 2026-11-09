import { readBody, respond } from '../../../server/http.js'
import { reset } from '../../../server/auth-core.js'
import { repo } from '../../../server/repo-d1.js'

export async function onRequestPost(context) {
  return respond(context, await reset(repo(context.env.DB), Date.now(), await readBody(context.request)))
}
