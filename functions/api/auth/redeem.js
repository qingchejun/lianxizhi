import { readBody, respond, clientIp } from '../../../server/http.js'
import { requireSession } from '../../../server/session.js'
import { redeemInvite } from '../../../server/auth-core.js'
import { repo } from '../../../server/repo-d1.js'

/* 免费版补填邀请码 → 会员 */
export async function onRequestPost(context) {
  const session = await requireSession(context)
  return respond(context, await redeemInvite(repo(context.env.DB), session, Date.now(), await readBody(context.request), { ip: clientIp(context.request) }))
}
