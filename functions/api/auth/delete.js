import { readBody, respond } from '../../../server/http.js'
import { requireSession } from '../../../server/session.js'
import { deleteAccount } from '../../../server/auth-core.js'
import { repo } from '../../../server/repo-d1.js'

/* 删除账号（要当前密码） */
export async function onRequestPost(context) {
  const session = await requireSession(context)
  return respond(context, await deleteAccount(repo(context.env.DB), session, Date.now(), await readBody(context.request)))
}
