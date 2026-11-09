import { json, readBody } from '../../../server/http.js'
import { requireSession } from '../../../server/session.js'
import { dataPush } from '../../../server/auth-core.js'
import { repo } from '../../../server/repo-d1.js'

export async function onRequestPost(context) {
  const session = await requireSession(context)
  if (!session) return json({ ok: false, error: '请先登录。' }, 401)
  const body = await readBody(context.request)
  const r = await dataPush(repo(context.env.DB), session.uid, body.items, Date.now())
  return json(r.body, r.status)
}
