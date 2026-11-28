/**
 * 完整版年卡收款（2026-11-28，方案 docs/superpowers/specs/2026-11-28-payment-waffo.md）：纯逻辑，repo 和 Waffo 从外面传进来，
 * node 直跑测试（tools/check-pay-core.js）；functions/api/pay/* 只做 HTTP 翻译。
 *
 *   下单 createOrder：建一条待付订单 → Waffo 收银台地址。邀请码账号（永久完整版）不卖。
 *   开通 settle：Waffo 回调 order.completed（验过签）或轮询时 → 都用我们的商户钥匙去 Waffo 查这个订单号的付款（findPayment），
 *       查到已付才开通：Waffo 用同一把平台钥匙给所有商户签回调，别人在自己的店里用我们的订单号付一笔、把回调指到我们这，
 *       签名照样是真的，所以回调里的金额、订单只当「去查一下」的提示（安全复审 11-28）。
 *       同一单只开通一次：记已付和加天数在一个事务里（repo.orderGrant），加天数用 SQL 原子地加，并发不会丢；
 *       金额、币种对不上不开通，记 mismatch 等人工看。
 *       到期日：没过期就在原到期日上加，过期了从现在算（体验期剩下的几天也接着算进去）。
 *   退款 adminRefund：站长在管理页点，7 天内全额退（站长 11-28 定）；Waffo 建退款单成功就记已退、把这一单的天数扣回来。
 */
import { basePlan, planOf } from './auth-core.js'

const DAY = 86400 * 1000
export const PRICE = { amount: 9900, currency: 'CNY', days: 365, label: '99 元/年' }
export const REFUND_DAYS = 7
const ORDER_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

function newOrderId(now) {
  const d = new Date(now)
  const ymd = d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0')
  const b = new Uint8Array(10)
  crypto.getRandomValues(b)
  return 'zh' + ymd + [...b].map(x => ORDER_ALPHABET[x % ORDER_ALPHABET.length]).join('')
}

async function currentUser(repo, session) {
  if (!session) return null
  const user = await repo.userById(session.uid)
  if (!user || user.pwver !== session.pwver || user.banned) return null
  return user
}

function fmtDate(t) {
  const d = new Date(t + 8 * 3600 * 1000) /* 北京时间 */
  return d.getUTCFullYear() + ' 年 ' + (d.getUTCMonth() + 1) + ' 月 ' + d.getUTCDate() + ' 日'
}

/* 给页面看：收款开没开、价格 */
export function payInfo(env) {
  return { on: !!(env && env.WAFFO_MERCHANT_ID && env.WAFFO_PRIVATE_KEY && env.WAFFO_PRODUCT_ID && (env.WAFFO_ENV === 'test' || env.WAFFO_ENV === 'prod')), price: PRICE.amount, currency: PRICE.currency, label: PRICE.label, days: PRICE.days }
}

/* 下单：W = server/waffo.js（测试时换成假的）；origin = 网站地址，拼付款完成后回来的地址 */
export async function createOrder(repo, W, env, session, now, origin) {
  if (!payInfo(env).on) return { status: 503, body: { ok: false, error: '付费开通还没开放。' } }
  const user = await currentUser(repo, session)
  if (!user) return { status: 401, body: { ok: false, error: '先登录。' } }
  if (!user.verified) return { status: 403, body: { ok: false, error: '先验证邮箱再开通。' } }
  if (env.WAFFO_ENV !== 'prod' && !user.admin) return { status: 503, body: { ok: false, error: '付费开通还没开放。' } } /* 测试环境只给管理员试 */
  if (basePlan(user) === 'full' && !(env.WAFFO_ENV !== 'prod' && user.admin)) return { status: 409, body: { ok: false, error: '你的账号已经是永久完整版，不用再买。' } }
  if ((await repo.ordersPendingSince(user.id, now - 3600 * 1000)) >= 10) {
    return { status: 429, body: { ok: false, error: '下单太多次了，过一会儿再试。' } }
  }
  const id = newOrderId(now)
  await repo.orderInsert({ id, uid: user.id, email: user.email, amount: PRICE.amount, currency: PRICE.currency, days: PRICE.days, status: 'pending', created_at: now })
  let session2
  try {
    session2 = await W.createCheckout(env, {
      orderNo: id, amount: PRICE.amount, currency: PRICE.currency, uid: user.id, email: user.email,
      successUrl: String(origin).replace(/\/+$/, '') + '/?paid=' + id
    })
  } catch (e) {
    console.log('[pay] 建收银台失败', id, String(e && e.message || e))
    return { status: 502, body: { ok: false, error: '收银台暂时打不开，请稍后再试。' } }
  }
  if (session2.sessionId) await repo.orderSetSession(id, session2.sessionId)
  return { status: 200, body: { ok: true, order: id, url: session2.checkoutUrl } }
}

/*
 * 开通（回调和轮询共用）。paid：{ paymentId, amount（分，可能为 null）, currency }
 * → { granted: 这一次开通的, already: 早开通过, mismatch, fullUntil, mail }
 */
export async function settle(repo, orderNo, paid, now) {
  const order = await repo.orderById(orderNo)
  if (!order) return { missing: true }
  if (order.status !== 'pending') return { already: order.status === 'paid', status: order.status }
  if (paid.amount == null || paid.amount < order.amount || String(paid.currency).toUpperCase() !== order.currency) {
    try { await repo.orderMarkMismatch(orderNo, paid.paymentId || null) } catch (e) { /* 付款号撞了唯一索引：只记日志 */ }
    console.log('[pay] 金额对不上，没开通', orderNo, JSON.stringify(paid))
    return { mismatch: true }
  }
  const user = await repo.userById(order.uid)
  if (!(await repo.orderGrant(orderNo, paid.paymentId || null, now, order.uid, order.days * DAY))) {
    return { already: true }
  }
  if (!user) return { granted: true, orphan: true }
  const until = Number((await repo.userById(order.uid) || {}).full_until) || 0
  return {
    granted: true,
    fullUntil: until,
    mail: {
      to: user.email,
      subject: '纸和笔完整版已开通',
      text: '你好：\n\n纸和笔完整版已经开通，到期日是 ' + fmtDate(until) + '。\n\n' +
        '订单号：' + orderNo + '\n金额：' + (order.amount / 100).toFixed(2) + ' 元\n\n' +
        '付款 ' + REFUND_DAYS + ' 天内不满意，发邮件到 hi@zhihebi.com（写上订单号）就给你全额退款。\n\n' +
        '打开 https://zhihebi.com 就能用。\n\n纸和笔'
    }
  }
}

/* 付款完成页轮询：这单到了没。没到就去 Waffo 查一次（回调丢了也能开通） */
export async function orderStatus(repo, W, env, session, orderNo, now) {
  const user = await currentUser(repo, session)
  if (!user) return { status: 401, body: { ok: false, error: '先登录。' } }
  const order = orderNo ? await repo.orderById(orderNo) : null
  if (!order || order.uid !== user.id) return { status: 404, body: { ok: false, error: '没有这笔订单。' } }
  let mail = null
  if (order.status === 'pending' && payInfo(env).on) {
    try {
      const p = await W.findPayment(env, orderNo)
      if (p.paid) {
        const r = await settle(repo, orderNo, p, now)
        if (r.granted) mail = r.mail
      }
    } catch (e) {
      console.log('[pay] 查单失败', orderNo, String(e && e.message || e))
    }
  }
  const fresh = await repo.orderById(orderNo)
  const u = await repo.userById(user.id)
  return {
    status: 200,
    mail,
    body: { ok: true, order: orderNo, state: fresh.status, plan: planOf(u, now), full_until: Number(u.full_until) || 0 }
  }
}

/* Waffo 回调：先验签（W.verifyWebhook），再按事件处理。返回 { status, body, mail } */
export async function webhook(repo, W, env, payload, header, now) {
  let event
  try {
    event = await W.verifyWebhook(env, payload, header, now)
  } catch (e) {
    console.log('[pay] 回调验签失败', String(e && e.message || e))
    return { status: 401, body: { ok: false } }
  }
  const type = event.eventType
  if (type === 'order.completed') {
    const orderNo = W.paidFromEvent(event).orderNo
    if (!orderNo) return { status: 200, body: { ok: true, ignored: 'no order' } }
    const order = await repo.orderById(orderNo)
    if (!order) return { status: 200, body: { ok: true, ignored: 'unknown order' } }
    if (order.status !== 'pending') return { status: 200, body: { ok: true, granted: false } }
    /* 回调内容不当真：用我们的商户钥匙去查这单（只查得到我们店里的付款） */
    let p
    try {
      p = await W.findPayment(env, orderNo)
    } catch (e) {
      console.log('[pay] 回调后查单失败', orderNo, String(e && e.message || e))
      return { status: 502, body: { ok: false } } /* 让 Waffo 过一会儿重发 */
    }
    if (!p.paid) return { status: 200, body: { ok: true, ignored: 'not paid' } }
    const r = await settle(repo, orderNo, p, now)
    return { status: 200, body: { ok: true, granted: !!r.granted }, mail: r.granted ? r.mail : null }
  }
  /* refund.succeeded 等其余事件不处理：退款只从管理页发起（adminRefund 退成功就记账），
     不让一条回调就扣掉别人一年（同上，回调内容不当真） */
  return { status: 200, body: { ok: true, ignored: type } }
}

/* 记已退、把这一单的天数扣回来（只做一次，和记已退在一个事务里） */
async function refundLocal(repo, orderNo, ticket, now) {
  const order = await repo.orderById(orderNo)
  if (!order || order.status !== 'paid') return false
  return await repo.orderRevoke(orderNo, ticket, now, order.uid, order.days * DAY)
}

async function requireAdmin(repo, session) {
  if (!session) return { status: 401, body: { ok: false, error: '先登录。' } }
  const user = await repo.userById(session.uid)
  if (!user || !user.admin) return { status: 403, body: { ok: false, error: '无权访问。' } }
  return null
}

/* 管理页：订单列表 */
export async function listOrders(repo, session) {
  const gate = await requireAdmin(repo, session)
  if (gate) return gate
  const rows = await repo.ordersList(300)
  return {
    status: 200,
    body: {
      ok: true,
      orders: rows.map(o => ({
        id: o.id, email: o.user_email || o.email, amount: o.amount, currency: o.currency, days: o.days, status: o.status,
        created_at: o.created_at, paid_at: o.paid_at || null, refunded_at: o.refunded_at || null
      }))
    }
  }
}

/* 管理页：退款（站长点）。Waffo 建退款单成功就算退了 */
export async function adminRefund(repo, W, env, session, now, body) {
  const gate = await requireAdmin(repo, session)
  if (gate) return gate
  const id = body && body.id
  const order = id ? await repo.orderById(id) : null
  if (!order) return { status: 404, body: { ok: false, error: '没有这笔订单。' } }
  if (order.status !== 'paid') return { status: 409, body: { ok: false, error: '这笔订单不是「已付」，不能退。' } }
  if (!order.waffo_payment_id) return { status: 409, body: { ok: false, error: '这笔订单没有 Waffo 付款号，去 Waffo 后台退。' } }
  let r
  try {
    r = await W.refund(env, { paymentId: order.waffo_payment_id, amount: order.amount, currency: order.currency, orderNo: order.id, reason: '7 天内退款' })
  } catch (e) {
    return { status: 502, body: { ok: false, error: '退款没成功：' + String(e && e.message || e).slice(0, 200) } }
  }
  const done = await refundLocal(repo, order.id, r.ticketId || null, now)
  if (!done) return { status: 500, body: { ok: false, error: 'Waffo 已经退款，但本站没记上：刷新看一下，还是「已付」就再点一次。' } }
  return { status: 200, body: { ok: true } }
}
