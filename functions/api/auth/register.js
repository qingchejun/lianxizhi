import { readBody, respond, json, clientIp, humanCheck, HUMAN_FAIL } from '../../../server/http.js'
import { register } from '../../../server/auth-core.js'
import { repo } from '../../../server/repo-d1.js'

export async function onRequestPost(context) {
  const body = await readBody(context.request)
  if (!(await humanCheck(context, body))) return json(HUMAN_FAIL, 403)
  return respond(context, await register(repo(context.env.DB), Date.now(), body, { ip: clientIp(context.request) }))
}
