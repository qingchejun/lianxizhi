import { readBody, respond } from '../../../server/http.js'
import { verify } from '../../../server/auth-core.js'
import { repo } from '../../../server/repo-d1.js'

export async function onRequestPost(context) {
  return respond(context, await verify(repo(context.env.DB), Date.now(), await readBody(context.request)))
}
