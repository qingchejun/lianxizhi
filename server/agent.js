/**
 * 给 aship 用的站点接口（2026-11-28）：POST /api/admin/agent/execute，格式照 Aship 通用模板
 * （~/coding/template-tanstarter-general/src/agent/，aship 里按 'tanstarter-general' 模板接）：
 *   请求 { operation, input }，头 Authorization: Bearer sa_admin_…；回答 { code, message, data }，code 0 为成功。
 * aship 靠它读纸和笔的订单（统计里的收入、「订阅」菜单）、账号和设置。**全部只读**：settings_update 一律拒。
 * 钥匙只存指纹：Cloudflare 密钥 ASHIP_AGENT_KEY_SHA256 = sha256(钥匙) 的十六进制；没配就整个接口关着（401）。
 * 纯逻辑 + 传入 repo，tools/check-agent.js 在 node 里测。
 */
import { payInfo, PRICE, REFUND_DAYS } from './pay-core.js'

export const KEY_FORMAT = /^sa_admin_[A-Za-z0-9_-]{20,200}$/
const MAX_BODY = 20000
/* 这把钥匙能做的：只读 */
const PERMISSIONS = ['admin.settings.read', 'admin.payments.read', 'admin.subscriptions.read', 'admin.users.read', 'admin.credits.read', 'admin.ai-tasks.read']

async function sha256hex(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/* 等长比较，不因为前几位对不对而快慢不同 */
function sameHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let x = 0
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return x === 0
}

export async function keyAllowed(env, authorization) {
  const want = String((env && env.ASHIP_AGENT_KEY_SHA256) || '').trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(want)) return false
  const key = (/^Bearer (\S+)$/.exec(authorization || '') || [])[1] || ''
  if (!KEY_FORMAT.test(key)) return false
  return sameHex(await sha256hex(key), want)
}

const iso = t => (t ? new Date(Number(t)).toISOString() : null)

function pageInput(input) {
  const page = Math.max(1, Math.min(100000, Math.floor(Number(input.page) || 1)))
  const pageSize = Math.max(1, Math.min(100, Math.floor(Number(input.pageSize) || 20)))
  const search = typeof input.search === 'string' ? input.search.trim().slice(0, 200) : ''
  const status = typeof input.status === 'string' ? input.status.slice(0, 40) : ''
  return { page, pageSize, search, status }
}

function mask(v) {
  const s = String(v || '')
  if (!s) return ''
  return s.length <= 8 ? '****' : s.slice(0, 4) + '****' + s.slice(-4)
}

/* 设置：只给看，不给改（改价、换钥匙都在代码和 Cloudflare 密钥里） */
const SETTING_FIELDS = [
  ['site_name', 'site', '网站名'],
  ['site_domain', 'site', '网址'],
  ['support_email', 'site', '客服邮箱'],
  ['payment_provider', 'pay', '收款平台'],
  ['payment_on', 'pay', '付费开通开没开'],
  ['waffo_env', 'pay', 'Waffo 环境（test / prod）'],
  ['waffo_merchant_id', 'pay', 'Waffo 商户号', true],
  ['waffo_product_id', 'pay', 'Waffo 商品'],
  ['price', 'pay', '价格'],
  ['refund_days', 'pay', '几天内可退款'],
  ['rybbit_site_id', 'site', 'Rybbit 站点']
]

function settingsValues(env) {
  const p = payInfo(env)
  return {
    site_name: '纸和笔',
    site_domain: 'zhihebi.com',
    support_email: 'hi@zhihebi.com',
    payment_provider: 'waffo',
    payment_on: p.on ? '开着' : '没开（Waffo 密钥没配齐）',
    waffo_env: String(env.WAFFO_ENV || ''),
    waffo_merchant_id: mask(env.WAFFO_MERCHANT_ID),
    waffo_product_id: String(env.WAFFO_PRODUCT_ID || ''),
    price: (PRICE.amount / 100).toFixed(2) + ' ' + PRICE.currency + ' / ' + PRICE.days + ' 天（一次性，不自动续费）',
    refund_days: String(REFUND_DAYS),
    rybbit_site_id: '11'
  }
}

function settingsCatalog() {
  return {
    template: 'zhihebi',
    tabs: [{ name: 'site', title: '设置' }],
    groups: [
      { name: 'site', tab: 'site', title: '网站', description: '纸和笔是自己写的站，这里只能看。', link: '', test: null },
      { name: 'pay', tab: 'site', title: '收款', description: '完整版年卡走 Waffo；价格写在代码里，密钥在 Cloudflare 密钥里，改了要重新部署。', link: '', test: null }
    ],
    fields: SETTING_FIELDS.map(([name, group, title, secret]) => ({
      name, tab: 'site', group, type: secret ? 'password' : 'text', title, placeholder: '',
      tip: '只能看：纸和笔的设置在代码和 Cloudflare 里，改它要重新部署', options: [], secret: !!secret, readonly: true
    }))
  }
}

const EMPTY = { items: [], total: 0 }

/* 订单 → aship 认的样子（金额都是分；退款按整单退） */
function orderItem(o) {
  const refunded = o.status === 'refunded'
  return {
    orderNo: o.id,
    userId: o.uid,
    userEmail: o.user_email || o.email,
    userName: null,
    status: o.status,
    amount: o.amount,
    currency: String(o.currency || '').toLowerCase(),
    paymentType: 'one-time',
    paymentProvider: 'waffo',
    productId: 'full-year',
    productName: '纸和笔完整版 · 一年',
    description: o.days + ' 天完整版',
    paymentAmount: o.amount,
    subscriptionNo: null,
    refundAmount: refunded ? o.amount : 0,
    refundedAt: refunded ? iso(o.refunded_at) : null,
    paidAt: iso(o.paid_at),
    createdAt: iso(o.created_at)
  }
}

function userItem(u) {
  const roles = []
  if (u.admin) roles.push('admin')
  return { id: u.id, name: null, email: u.email, roles, createdAt: iso(u.created_at) }
}

const OPERATIONS = {
  site_info: { permission: 'admin.settings.read', run: async (ctx) => ({
    template: 'zhihebi', version: '2026.11.28', domain: 'zhihebi.com', operations: Object.keys(OPERATIONS)
  }) },
  settings_catalog: { permission: 'admin.settings.read', run: async () => settingsCatalog() },
  settings_get: { permission: 'admin.settings.read', run: async (ctx) => settingsValues(ctx.env) },
  orders_list: { permission: 'admin.payments.read', run: async (ctx, input) => {
    const q = pageInput(input)
    const r = await ctx.repo.agentOrders(q)
    return { total: r.total, items: r.items.map(orderItem) }
  } },
  users_list: { permission: 'admin.users.read', run: async (ctx, input) => {
    const q = pageInput(input)
    const r = await ctx.repo.agentUsers(q)
    return { total: r.total, items: r.items.map(userItem) }
  } },
  /* 一次性年卡，没有订阅、积分、AI 任务：列表照样有，aship 各站一样读 */
  subscriptions_list: { permission: 'admin.subscriptions.read', run: async () => EMPTY },
  credits_list: { permission: 'admin.credits.read', run: async () => EMPTY },
  ai_tasks_list: { permission: 'admin.ai-tasks.read', run: async () => EMPTY }
}

/* → { status, body } */
export async function handleAgent(env, repo, authorization, text) {
  const answer = (status, code, message, data) => ({ status, body: Object.assign({ code, message }, data === undefined ? {} : { data }) })
  if (!(await keyAllowed(env, authorization))) return answer(401, -1, 'unauthorized')
  if (String(text || '').length > MAX_BODY) return answer(413, -1, 'request too large')
  let body
  try { body = JSON.parse(text) } catch (e) { return answer(400, -1, 'the body is not JSON') }
  if (!body || typeof body.operation !== 'string') return answer(400, -1, 'bad request')
  if (body.operation === 'settings_update' || body.operation === 'settings_test') {
    return answer(403, -1, '纸和笔的设置在这里只能看，改要改代码或 Cloudflare 密钥')
  }
  const op = Object.prototype.hasOwnProperty.call(OPERATIONS, body.operation) ? OPERATIONS[body.operation] : null
  if (!op) return answer(400, -1, 'unknown operation: ' + String(body.operation).slice(0, 60))
  if (!PERMISSIONS.includes(op.permission)) return answer(403, -1, 'missing permission: ' + op.permission)
  const input = body.input && typeof body.input === 'object' && !Array.isArray(body.input) ? body.input : {}
  const data = await op.run({ env, repo }, input)
  return answer(200, 0, 'ok', data)
}
