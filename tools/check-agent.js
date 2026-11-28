/* 给 aship 的站点接口（server/agent.js）：钥匙只认指纹、只读、订单和账号的样子是 aship 认的（node 直跑）。 */
'use strict'
let ok = 0
let bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) } else { bad++; console.log('✗', name, extra === undefined ? '' : JSON.stringify(extra)) }
}
const sha = s => require('crypto').createHash('sha256').update(s).digest('hex')
const KEY = 'sa_admin_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6'
const t0 = Date.UTC(2026, 11, 20)
const repo = {
  async agentOrders(q) {
    const all = [
      { id: 'zh2', uid: 'u1', email: 'a@x.com', user_email: 'a@x.com', amount: 9900, currency: 'CNY', days: 365, status: 'refunded', created_at: t0 + 2, paid_at: t0 + 3, refunded_at: t0 + 4 },
      { id: 'zh1', uid: 'u1', email: 'a@x.com', user_email: 'a@x.com', amount: 9900, currency: 'CNY', days: 365, status: 'paid', created_at: t0, paid_at: t0 + 1 }
    ].filter(o => !q.status || o.status === q.status)
    this.lastQ = q
    return { total: all.length, items: all.slice((q.page - 1) * q.pageSize, q.page * q.pageSize) }
  },
  async agentUsers(q) { return { total: 1, items: [{ id: 'u1', email: 'a@x.com', admin: 1, created_at: t0 }] } }
}
import('../server/agent.js').then(async A => {
  const env = { ASHIP_AGENT_KEY_SHA256: sha(KEY), WAFFO_MERCHANT_ID: 'MER_abcdefghijklmnop', WAFFO_PRIVATE_KEY: 'secret-private', WAFFO_PRODUCT_ID: 'PROD_x', WAFFO_ENV: 'test' }
  const call = (op, input, auth, e) => A.handleAgent(e || env, repo, auth === undefined ? 'Bearer ' + KEY : auth, JSON.stringify({ operation: op, input }))

  check('没钥匙：401', (await call('site_info', {}, '')).status === 401)
  check('钥匙不对：401', (await call('site_info', {}, 'Bearer sa_admin_' + 'x'.repeat(32))).status === 401)
  check('站点没配指纹：整个接口关着', (await call('site_info', {}, undefined, {})).status === 401)
  check('格式不对的钥匙：401', (await call('site_info', {}, 'Bearer ' + KEY + ' ')).status === 401)
  const info = await call('site_info', {})
  check('site_info：code 0、列出能做的事', info.status === 200 && info.body.code === 0 && info.body.data.operations.includes('orders_list'), info.body)
  check('改设置一律拒', (await call('settings_update', { a: 'b' })).status === 403)
  check('不认识的操作：400', (await call('drop_everything', {})).status === 400)
  check('不是 JSON：400', (await A.handleAgent(env, repo, 'Bearer ' + KEY, '{oops')).status === 400)

  const st = (await call('settings_get', {})).body.data
  check('设置：商户号打码、私钥不出现', st.waffo_merchant_id === 'MER_****mnop' && !JSON.stringify(st).includes('secret-private'), st)
  check('设置：收款开着、测试环境、99 元', st.payment_on === '开着' && st.waffo_env === 'test' && /99\.00 CNY/.test(st.price))
  const cat = (await call('settings_catalog', {})).body.data
  check('设置清单：每一项都只能看', cat.fields.length === 11 && cat.fields.every(f => f.readonly) && cat.fields.every(f => Object.prototype.hasOwnProperty.call(st, f.name)))

  const o = (await call('orders_list', { page: 1, pageSize: 100 })).body.data
  check('订单：总数和条数', o.total === 2 && o.items.length === 2)
  const paid = o.items.find(x => x.orderNo === 'zh1')
  const ref = o.items.find(x => x.orderNo === 'zh2')
  check('已付订单：分、小写币种、付款时间', paid.amount === 9900 && paid.currency === 'cny' && paid.status === 'paid' && paid.paidAt === new Date(t0 + 1).toISOString() && paid.refundAmount === 0 && paid.paymentProvider === 'waffo')
  check('已退订单：退款金额整单、退款时间', ref.status === 'refunded' && ref.refundAmount === 9900 && ref.refundedAt === new Date(t0 + 4).toISOString() && ref.paidAt)
  await call('orders_list', { page: 0, pageSize: 999, search: 'x'.repeat(500) })
  check('分页参数夹在范围内', repo.lastQ.page === 1 && repo.lastQ.pageSize === 100 && repo.lastQ.search.length === 200)
  check('按状态筛', (await call('orders_list', { status: 'paid' })).body.data.total === 1)
  const u = (await call('users_list', {})).body.data
  check('账号：id、邮箱、角色、注册时间', u.items[0].email === 'a@x.com' && u.items[0].roles[0] === 'admin' && u.items[0].createdAt)
  for (const op of ['subscriptions_list', 'credits_list', 'ai_tasks_list']) {
    const r = (await call(op, {})).body.data
    check(op + '：空列表', r.total === 0 && r.items.length === 0)
  }
  check('太大的请求：413', (await A.handleAgent(env, repo, 'Bearer ' + KEY, 'x'.repeat(20001))).status === 413)
  console.log('\n' + ok + ' 通过，' + bad + ' 失败')
  process.exit(bad ? 1 : 0)
}).catch(e => { console.error(e); process.exit(1) })
