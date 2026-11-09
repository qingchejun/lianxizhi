import { readCookie, verify, COOKIE } from '../../../server/session.js'
import { meBySession } from '../../../server/auth-core.js'
import { repo } from '../../../server/repo-d1.js'
import { json } from '../../../server/http.js'

export async function onRequestGet(context) {
  const raw = readCookie(context.request.headers.get('Cookie'), COOKIE)
  const session = raw ? await verify(raw, context.env.SESSION_SECRET, Date.now()) : null
  const r = await meBySession(repo(context.env.DB), session)
  return json(r.body, r.status)
}
