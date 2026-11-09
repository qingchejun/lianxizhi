import { readBody, respond } from '../../../server/http.js'
import { forgot } from '../../../server/auth-core.js'
import { repo } from '../../../server/repo-d1.js'

export async function onRequestPost(context) {
  return respond(context, await forgot(repo(context.env.DB), Date.now(), await readBody(context.request)))
}
