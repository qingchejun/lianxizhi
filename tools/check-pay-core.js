/* 会员年卡收款（server/pay-core.js）：内存 repo + 假 Waffo，node 直跑。
 *   下单门槛、开通只一次、金额不对不开通、到期日怎么加、轮询兜底、回调验签、退款扣回。 */
'use strict'
let ok = 0
let bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) } else { bad++; console.log('✗', name, extra === undefined ? '' : JSON.stringify(extra)) }
}
const DAY = 86400 * 1000

function memRepo() {
  const users = {}
  const orders = {}
  return {
    users, orders,
    async userById(id) { return users[id] || null },
    async setFullUntil(id, t) { users[id].full_until = t },
    async orderInsert(o) { orders[o.id] = Object.assign({ waffo_session: null, waffo_payment_id: null, refund_ticket: null, paid_at: null, refunded_at: null }, o) },
    async orderById(id) { return orders[id] ? Object.assign({}, orders[id]) : null },
    async orderSetSession(id, s) { orders[id].waffo_session = s },
    async ordersPendingSince(uid, since) { return Object.values(orders).filter(o => o.uid === uid && o.status === 'pending' && o.created_at >= since).length },
    async orderGrant(id, pid, now, uid, ms) {
      const o = orders[id]
      if (!o || o.status !== 'pending') return false
      if (pid && Object.values(orders).some(x => x.waffo_payment_id === pid)) throw new Error('UNIQUE waffo_payment_id')
      Object.assign(o, { status: 'paid', waffo_payment_id: pid, paid_at: now, granted_at: now })
      if (users[uid]) users[uid].full_until = Math.max(now, users[uid].full_until || 0) + ms
      return true
    },
    async orderMarkMismatch(id, pid) { if (orders[id].status === 'pending') Object.assign(orders[id], { status: 'mismatch', waffo_payment_id: pid }) },
    async orderRevoke(id, t, now, uid, ms) {
      const o = orders[id]
      if (!o || o.status !== 'paid') return false
      Object.assign(o, { status: 'refunded', refund_ticket: t, refunded_at: now, revoked_at: now })
      if (users[uid]) users[uid].full_until = Math.max(0, (users[uid].full_until || 0) - ms)
      return true
    },
    async ordersList() { return Object.values(orders).map(o => Object.assign({ user_email: users[o.uid] && users[o.uid].email }, o)) }
  }
}

function fakeW(state) {
  return {
    async createCheckout(env, o) { state.checkouts.push(o); if (state.failCheckout) throw new Error('down'); return { sessionId: 'S_' + o.orderNo, checkoutUrl: 'https://pay.example/' + o.orderNo + '#token=T' } },
    async findPayment(env, orderNo) { return state.paid[orderNo] || { paid: false } },
    async refund(env, r) { state.refunds.push(r); if (state.failRefund) throw new Error('refund rejected'); return { ok: true, ticketId: 'TKT_' + r.orderNo } },
    async verifyWebhook(env, payload, header) { if (header !== 'good') throw new Error('bad sig'); return JSON.parse(payload) },
    paidFromEvent(ev) {
      const d = ev.data || {}
      return { orderNo: d.orderMerchantExternalId, paymentId: d.paymentId, amount: d.total == null ? null : Math.round(Number(d.total) * 100), currency: String(d.currency || '').toUpperCase() }
    }
  }
}

import('../server/pay-core.js').then(async P => {
  const env = { WAFFO_MERCHANT_ID: 'MER_x', WAFFO_PRIVATE_KEY: 'k', WAFFO_PRODUCT_ID: 'PROD_x', WAFFO_ENV: 'prod' }
  const now = Date.UTC(2026, 11, 20, 4, 0, 0)
  const repo = memRepo()
  const st = { checkouts: [], paid: {}, refunds: [] }
  const W = fakeW(st)
  repo.users.u1 = { id: 'u1', email: 'a@x.com', pwver: 1, verified: 1, plan: 'free', full_until: now + 3 * DAY }
  repo.users.u2 = { id: 'u2', email: 'b@x.com', pwver: 1, verified: 1, plan: 'full', full_until: 0 }
  repo.users.u3 = { id: 'u3', email: 'c@x.com', pwver: 1, verified: 0, plan: 'free', full_until: 0 }
  repo.users.adm = { id: 'adm', email: 'z@x.com', pwver: 1, verified: 1, plan: 'full', admin: 1 }
  const s1 = { uid: 'u1', pwver: 1 }

  // 下单门槛
  check('收款没配：不开放', (await P.createOrder(repo, W, {}, s1, now, 'https://zhihebi.com')).status === 503)
  check('没登录：401', (await P.createOrder(repo, W, env, null, now, 'https://zhihebi.com')).status === 401)
  check('改过密码的旧登录：401', (await P.createOrder(repo, W, env, { uid: 'u1', pwver: 0 }, now, 'x')).status === 401)
  check('邮箱没验证：403', (await P.createOrder(repo, W, env, { uid: 'u3', pwver: 1 }, now, 'x')).status === 403)
  check('测试环境：普通账号下不了单', (await P.createOrder(repo, W, Object.assign({}, env, { WAFFO_ENV: 'test' }), s1, now, 'x')).status === 503)
  check('邀请码永久会员：不卖', (await P.createOrder(repo, W, env, { uid: 'u2', pwver: 1 }, now, 'x')).status === 409)
  const c1 = await P.createOrder(repo, W, env, s1, now, 'https://zhihebi.com/')
  const id1 = c1.body.order
  check('下单：拿到收银台地址', c1.status === 200 && c1.body.url === 'https://pay.example/' + id1 + '#token=T', c1)
  check('下单：订单待付、99 元、365 天', repo.orders[id1].status === 'pending' && repo.orders[id1].amount === 9900 && repo.orders[id1].currency === 'CNY' && repo.orders[id1].days === 365)
  check('下单：回来的地址带订单号', st.checkouts[0].successUrl === 'https://zhihebi.com/?paid=' + id1, st.checkouts[0].successUrl)
  check('下单：订单号格式', /^zh20261220[a-z0-9]{10}$/.test(id1), id1)
  st.failCheckout = true
  check('收银台打不开：502', (await P.createOrder(repo, W, env, s1, now, 'x')).status === 502)
  st.failCheckout = false

  // 轮询：没付
  let s = await P.orderStatus(repo, W, env, s1, id1, now)
  check('轮询：还没付', s.body.state === 'pending' && !s.mail)
  check('轮询：别人的订单看不到', (await P.orderStatus(repo, W, env, { uid: 'adm', pwver: 1 }, id1, now)).status === 404)

  // 回调：签名不对
  const ev = (o, total, pid) => JSON.stringify({ eventType: 'order.completed', eventId: pid, data: { orderMerchantExternalId: o, paymentId: pid, total, currency: 'CNY' } })
  check('回调：签名不对 401，不开通', (await P.webhook(repo, W, env, ev(id1, '99.00', 'PAY_1'), 'bad', now)).status === 401 && repo.orders[id1].status === 'pending')

  // 伪造回调：签名真（Waffo 平台钥匙），但我们店里查不到这笔付款 → 不开通
  const forged = await P.webhook(repo, W, env, ev(id1, '99.00', 'PAY_EVIL'), 'good', now + 500)
  check('别人店里的付款冒用我们的订单号：查不到就不开通', !forged.body.granted && repo.orders[id1].status === 'pending' && repo.users.u1.full_until === now + 3 * DAY)

  // 回调开通（回调只是提示，去 Waffo 查到才算）
  st.paid[id1] = { paid: true, paymentId: 'PAY_1', amount: 9900, currency: 'CNY' }
  const w1 = await P.webhook(repo, W, env, ev(id1, '9.00', 'PAY_WRONG'), 'good', now + 1000)
  check('回调：按查到的付款开通（不看回调里写的金额、付款号）', w1.status === 200 && w1.body.granted && repo.orders[id1].status === 'paid' && repo.orders[id1].waffo_payment_id === 'PAY_1')
  check('到期日：没过期的体验接着加一年', repo.users.u1.full_until === now + 3 * DAY + 365 * DAY, repo.users.u1.full_until - now)
  check('开通发邮件，写了到期日和 7 天退款', w1.mail && w1.mail.to === 'a@x.com' && /到期日/.test(w1.mail.text) && /7 天内/.test(w1.mail.text) && /hi@zhihebi.com/.test(w1.mail.text))
  const before = repo.users.u1.full_until
  const w2 = await P.webhook(repo, W, env, ev(id1, '99.00', 'PAY_1'), 'good', now + 2000)
  check('同一回调再来一次：不再加', !w2.body.granted && repo.users.u1.full_until === before && !w2.mail)
  s = await P.orderStatus(repo, W, env, s1, id1, now + 3000)
  check('轮询：已付、会员、不重复开通', s.body.state === 'paid' && s.body.plan === 'full' && repo.users.u1.full_until === before && !s.mail)

  // 轮询兜底开通（回调丢了）
  const c2 = await P.createOrder(repo, W, env, s1, now + DAY, 'https://zhihebi.com')
  const id2 = c2.body.order
  st.paid[id2] = { paid: true, paymentId: 'PAY_2', amount: 9900, currency: 'CNY' }
  s = await P.orderStatus(repo, W, env, s1, id2, now + DAY)
  check('回调丢了：轮询查到已付就开通，续一年接在后面', s.body.state === 'paid' && repo.users.u1.full_until === before + 365 * DAY && s.mail)

  // 过期以后买：从现在算
  repo.users.u4 = { id: 'u4', email: 'd@x.com', pwver: 1, verified: 1, plan: 'free', full_until: now - 30 * DAY }
  const c4 = await P.createOrder(repo, W, env, { uid: 'u4', pwver: 1 }, now, 'x')
  st.paid[c4.body.order] = { paid: true, paymentId: 'PAY_4', amount: 9900, currency: 'CNY' }
  await P.webhook(repo, W, env, ev(c4.body.order, '99.00', 'PAY_4'), 'good', now)
  check('过期以后买：从付款那天算一年', repo.users.u4.full_until === now + 365 * DAY)

  // 金额不对
  const c5 = await P.createOrder(repo, W, env, { uid: 'u4', pwver: 1 }, now, 'x')
  const u4before = repo.users.u4.full_until
  st.paid[c5.body.order] = { paid: true, paymentId: 'PAY_5', amount: 990, currency: 'CNY' }
  await P.webhook(repo, W, env, ev(c5.body.order, '99.00', 'PAY_5'), 'good', now)
  check('金额不对：不开通，记 mismatch', repo.orders[c5.body.order].status === 'mismatch' && repo.users.u4.full_until === u4before)
  const c6 = await P.createOrder(repo, W, env, { uid: 'u4', pwver: 1 }, now, 'x')
  st.paid[c6.body.order] = { paid: true, paymentId: 'PAY_6', amount: 9900, currency: 'USD' }
  await P.webhook(repo, W, env, JSON.stringify({ eventType: 'order.completed', data: { orderMerchantExternalId: c6.body.order, paymentId: 'PAY_6', total: '99.00', currency: 'CNY' } }), 'good', now)
  check('币种不对：不开通', repo.orders[c6.body.order].status === 'mismatch' && repo.users.u4.full_until === u4before)
  check('不认识的订单号：回 200 不报错', (await P.webhook(repo, W, env, ev('zhnope', '99.00', 'PAY_X'), 'good', now)).status === 200)
  check('别的事件：忽略', (await P.webhook(repo, W, env, JSON.stringify({ eventType: 'subscription.updated', data: {} }), 'good', now)).body.ignored === 'subscription.updated')

  // 下单太多
  for (let i = 0; i < 12; i++) await P.createOrder(repo, W, env, { uid: 'u4', pwver: 1 }, now, 'x')
  check('一小时下单太多次：429', (await P.createOrder(repo, W, env, { uid: 'u4', pwver: 1 }, now, 'x')).status === 429)

  // 退款
  const sa = { uid: 'adm', pwver: 1 }
  check('非管理员不能退', (await P.adminRefund(repo, W, env, s1, now, { id: id2 })).status === 403)
  check('非管理员看不到订单', (await P.listOrders(repo, s1)).status === 403)
  const list = await P.listOrders(repo, sa)
  check('管理员看订单列表', list.status === 200 && list.body.orders.length >= 4 && list.body.orders.some(o => o.id === id2 && o.email === 'a@x.com'))
  const u1before = repo.users.u1.full_until
  st.failRefund = true
  check('Waffo 退款失败：502，不扣天数', (await P.adminRefund(repo, W, env, sa, now, { id: id2 })).status === 502 && repo.users.u1.full_until === u1before && repo.orders[id2].status === 'paid')
  st.failRefund = false
  const rf = await P.adminRefund(repo, W, env, sa, now + 2 * DAY, { id: id2 })
  check('退款：成功、订单已退、扣回 365 天', rf.status === 200 && repo.orders[id2].status === 'refunded' && repo.users.u1.full_until === u1before - 365 * DAY)
  check('退款：按付款号、99.00 元退', st.refunds.length === 2 && st.refunds[1].paymentId === 'PAY_2' && st.refunds[1].amount === 9900)
  check('退过的再退：409', (await P.adminRefund(repo, W, env, sa, now, { id: id2 })).status === 409)
  await P.webhook(repo, W, env, JSON.stringify({ eventType: 'refund.succeeded', data: { orderMerchantExternalId: id2 } }), 'good', now)
  check('退款回调后到：不再扣', repo.users.u1.full_until === u1before - 365 * DAY)
  const uB = repo.users.u4.full_until
  await P.webhook(repo, W, env, JSON.stringify({ eventType: 'refund.succeeded', data: { orderMerchantExternalId: c4.body.order } }), 'good', now)
  check('退款回调不当真（防伪造回调扣别人一年）：只认管理页发起的退款', repo.orders[c4.body.order].status === 'paid' && repo.users.u4.full_until === uB)
  check('收款信息：99 元/年；没写环境不算开', P.payInfo(env).on && P.payInfo(env).price === 9900 && !P.payInfo({}).on && !P.payInfo(Object.assign({}, env, { WAFFO_ENV: '' })).on)

  console.log('\n' + ok + ' 通过，' + bad + ' 失败')
  process.exit(bad ? 1 : 0)
}).catch(e => { console.error(e); process.exit(1) })
