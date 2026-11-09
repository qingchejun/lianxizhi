import { json } from '../../../server/http.js'
import { requireSession } from '../../../server/session.js'
import { dataPull } from '../../../server/auth-core.js'
import { repo } from '../../../server/repo-d1.js'

export async function onRequestGet(context) {
  const session = await requireSession(context)
  if (!session) return json({ ok: false, error: '请先登录。' }, 401)
  const r = await dataPull(repo(context.env.DB), session.uid)
  return json(r.body, r.status)
}
