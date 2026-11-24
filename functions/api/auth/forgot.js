import { readBody, respond, clientIp } from '../../../server/http.js'
import { forgot } from '../../../server/auth-core.js'
import { repo } from '../../../server/repo-d1.js'

/* 找回密码不放人机验证：验证码页里「重发」还要调这里，人机验证的票只能用一次。
   只发给已验证的老账号、按邮箱和地址限流、占的是全站总额度（auth-core sendGate 的 old 桶） */
export async function onRequestPost(context) {
  return respond(context, await forgot(repo(context.env.DB), Date.now(), await readBody(context.request), { ip: clientIp(context.request) }))
}
