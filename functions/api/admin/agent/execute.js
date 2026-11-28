import { json } from '../../../../server/http.js'
import { repo } from '../../../../server/repo-d1.js'
import { handleAgent } from '../../../../server/agent.js'

/* aship 读纸和笔的订单、账号、设置（只读，2026-11-28）。钥匙指纹在 Cloudflare 密钥 ASHIP_AGENT_KEY_SHA256 */
export async function onRequestPost(context) {
  if (Number(context.request.headers.get('content-length') || 0) > 20000) return json({ code: -1, message: 'request too large' }, 413)
  const r = await handleAgent(context.env, repo(context.env.DB), context.request.headers.get('authorization'), await context.request.text())
  return json(r.body, r.status, { 'Cache-Control': 'no-store' })
}
