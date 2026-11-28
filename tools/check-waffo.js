/* Waffo 接口（server/waffo.js）：拿 Aship 模板里装的官方 SDK（@waffo/pancake-ts）当标准答案交叉验证。
 *   1. 同一个请求，我们签出来的 X-Signature、X-Idempotency-Key 和 SDK 一模一样（PKCS#8、PKCS#1、裸 base64 三种私钥）；
 *   2. 建收银台：两步请求的路径、参数和 SDK 一样，地址拼上 #token=；
 *   3. 回调：我们造的签名 SDK 验得过、SDK 那套规则造的我们验得过；改一个字、过期、换钥匙都验不过；
 *   4. 查单、退款的返回解析。
 * node tools/check-waffo.js（模板不在本机时只跑不依赖 SDK 的部分）
 */
'use strict'
const nodeCrypto = require('crypto')
const path = require('path')
const fs = require('fs')

let ok = 0
let bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) } else { bad++; console.log('✗', name, extra === undefined ? '' : JSON.stringify(extra)) }
}

const SDK_PATH = path.join(process.env.HOME, 'coding/template-shipany-ai/node_modules/@waffo/pancake-ts/dist/index.cjs')
const SDK = fs.existsSync(SDK_PATH) ? require(SDK_PATH) : null

const { privateKey, publicKey } = nodeCrypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
const PK8 = privateKey.export({ type: 'pkcs8', format: 'pem' })
const PK1 = privateKey.export({ type: 'pkcs1', format: 'pem' })
const PUB = publicKey.export({ type: 'spki', format: 'pem' })
const PUB1 = publicKey.export({ type: 'pkcs1', format: 'pem' })
const RAW8 = PK8.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')

function fakeFetch(log, reply) {
  return async (url, init) => {
    log.push({ url, headers: Object.assign({}, init.headers), body: init.body })
    const r = typeof reply === 'function' ? reply(url, JSON.parse(init.body)) : reply
    return { status: r.status || 200, json: async () => r.body }
  }
}

import('../server/waffo.js').then(async W => {
  const env = { WAFFO_MERCHANT_ID: 'MER_test123456789012345678', WAFFO_PRIVATE_KEY: PK8, WAFFO_PRODUCT_ID: 'PROD_abcdefghijklmnopqrstuv', WAFFO_API_BASE: 'https://api.example' }

  // 1. 签名和 SDK 一样
  for (const [label, key] of [['PKCS#8', PK8], ['PKCS#1', PK1], ['裸 base64', RAW8]]) {
    const sig = await W.signRequest('POST', '/v1/graphql', '1764300000', '{"a":1}', key)
    const v = nodeCrypto.createVerify('sha256')
    v.update('POST\n/v1/graphql\n1764300000\n' + nodeCrypto.createHash('sha256').update('{"a":1}').digest('base64'))
    check(label + ' 私钥：签名 node 验得过', v.verify(publicKey, sig, 'base64'))
  }
  if (SDK) {
    const realNow = Date.now
    const fixed = 1764300000123
    Date.now = () => fixed
    try {
      const log = []
      const client = new SDK.WaffoPancake({ merchantId: env.WAFFO_MERCHANT_ID, privateKey: PK1, fetch: fakeFetch(log, { body: { data: { payments: [] } } }) })
      await client.graphql.query({ query: 'query { x }', variables: { ref: 'o1' } })
      const sdkReq = log[0]
      const mine = []
      await W.post(Object.assign({}, env, { WAFFO_PRIVATE_KEY: PK1 }), '/v1/graphql', JSON.parse(sdkReq.body), { fetch: fakeFetch(mine, { body: {} }), now: fixed, noIdempotency: !sdkReq.headers['X-Idempotency-Key'] })
      check('和 SDK 同一请求：X-Signature 一样', mine[0].headers['X-Signature'] === sdkReq.headers['X-Signature'])
      check('和 SDK 同一请求：X-Timestamp 一样', mine[0].headers['X-Timestamp'] === sdkReq.headers['X-Timestamp'])
      check('和 SDK 同一请求：body 一样', mine[0].body === sdkReq.body)

      // 2. 建收银台：和 SDK 的 authenticated.create 两步一样
      const sdkLog = []
      const reply = (url) => ({ body: { data: url.endsWith('issue-session-token') ? { token: 'TOK', expiresAt: 'x' } : { sessionId: 'S1', checkoutUrl: 'https://pay.example/c/S1', expiresAt: 'x' } } })
      const sdk2 = new SDK.WaffoPancake({ merchantId: env.WAFFO_MERCHANT_ID, privateKey: PK8, fetch: fakeFetch(sdkLog, reply) })
      const order = { orderNo: 'zh_ord_1', amount: 9900, currency: 'CNY', uid: 'u123', email: 'a@b.c', successUrl: 'https://zhihebi.com/?paid=zh_ord_1' }
      const sdkRes = await sdk2.checkout.authenticated.create({
        productId: env.WAFFO_PRODUCT_ID, currency: 'CNY', priceSnapshot: { amount: '99.00', taxCategory: 'digital_goods' },
        buyerIdentity: 'u123', buyerEmail: 'a@b.c', successUrl: order.successUrl, orderMerchantExternalId: 'zh_ord_1',
        metadata: { uid: 'u123', orderNo: 'zh_ord_1' }, language: 'zh-Hans'
      })
      const myLog = []
      const myRes = await W.createCheckout(env, order, { fetch: fakeFetch(myLog, reply), now: fixed })
      const byPath = l => Object.fromEntries(l.map(x => [x.url.replace(/^https:\/\/[^/]+/, ''), x]))
      const a = byPath(sdkLog)
      const b = byPath(myLog)
      for (const p of ['/v1/actions/auth/issue-session-token', '/v1/actions/checkout/create-session']) {
        check('收银台 ' + p + '：参数和 SDK 一样', a[p] && b[p] && JSON.stringify(JSON.parse(a[p].body)) === JSON.stringify(JSON.parse(b[p].body)), [a[p] && a[p].body, b[p] && b[p].body])
        check('收银台 ' + p + '：签名和幂等键和 SDK 一样', a[p] && b[p] && a[p].headers['X-Signature'] === b[p].headers['X-Signature'] && a[p].headers['X-Idempotency-Key'] === b[p].headers['X-Idempotency-Key'])
      }
      check('收银台地址拼上 #token=，和 SDK 一样', myRes.checkoutUrl === sdkRes.checkoutUrl && myRes.checkoutUrl === 'https://pay.example/c/S1#token=TOK', [myRes, sdkRes.checkoutUrl])
    } finally {
      Date.now = realNow
    }
  } else {
    console.log('（本机没有模板里的 SDK，跳过和 SDK 对照）')
  }

  // 3. 回调验签
  const payload = JSON.stringify({ id: 'e1', eventType: 'order.completed', eventId: 'PAY_1', mode: 'test', data: { orderMerchantExternalId: 'zh_ord_1', paymentId: 'PAY_1', total: '99.00', amount: '99.00', currency: 'CNY', merchantProvidedBuyerIdentity: 'u123' } })
  const t = String(Date.now())
  const s = nodeCrypto.createSign('RSA-SHA256'); s.update(t + '.' + payload)
  const header = 't=' + t + ',v1=' + s.sign(privateKey, 'base64')
  const henv = { WAFFO_WEBHOOK_PUBLIC_KEY: PUB, WAFFO_ENV: 'test' }
  const ev = await W.verifyWebhook(henv, payload, header)
  check('回调：自己的钥匙验得过', ev.eventType === 'order.completed')
  const ev1 = await W.verifyWebhook({ WAFFO_WEBHOOK_PUBLIC_KEY: PUB1, WAFFO_ENV: 'test' }, payload, header)
  check('回调：PKCS#1 公钥也行', ev1.eventId === 'PAY_1')
  if (SDK) {
    const sdkEv = SDK.verifyWebhook(payload, header, { publicKey: PUB, toleranceMs: 300000 })
    check('回调：SDK 也验得过同一个签名', sdkEv.eventId === 'PAY_1')
  }
  async function fails(name, fn) {
    try { await fn(); check(name, false) } catch (e) { check(name, true) }
  }
  await fails('回调：改一个字验不过', () => W.verifyWebhook(henv, payload.replace('99.00', '9.00'), header))
  await fails('回调：过期 6 分钟验不过', () => W.verifyWebhook(henv, payload, header, Date.now() + 6 * 60 * 1000))
  await fails('回调：用 Waffo 正式公钥验不过（不是它签的）', () => W.verifyWebhook({ WAFFO_ENV: 'prod' }, payload, header))
  await fails('回调：环境不对（测试回调打到正式）', () => W.verifyWebhook({ WAFFO_WEBHOOK_PUBLIC_KEY: PUB, WAFFO_ENV: 'prod' }, payload, header))
  await fails('回调：没签名头', () => W.verifyWebhook(henv, payload, ''))
  await fails('回调：没设 WAFFO_ENV 一律拒（不两把钥匙都试）', () => W.verifyWebhook({ WAFFO_WEBHOOK_PUBLIC_KEY: PUB }, payload, header))
  const noMode = JSON.stringify({ eventType: 'order.completed', data: {} })
  const s2 = nodeCrypto.createSign('RSA-SHA256'); s2.update(t + '.' + noMode)
  await fails('回调：没写 mode 的也拒', () => W.verifyWebhook(henv, noMode, 't=' + t + ',v1=' + s2.sign(privateKey, 'base64')))
  for (const k of ['test', 'prod']) {
    let okKey = true
    try { await W.importPublicKey(W.WAFFO_PUBLIC_KEYS[k]) } catch (e) { okKey = false }
    check('Waffo ' + k + ' 公钥能导入', okKey)
  }
  const paid = W.paidFromEvent(ev)
  check('回调解析：订单号、付款号、金额（分）、币种、账号', paid.orderNo === 'zh_ord_1' && paid.paymentId === 'PAY_1' && paid.amount === 9900 && paid.currency === 'CNY' && paid.uid === 'u123', paid)

  // 4. 查单、退款
  const found = await W.findPayment(env, 'zh_ord_1', { fetch: fakeFetch([], { body: { data: { payments: [
    { id: 'PAY_0', status: 'failed', orderMerchantExternalId: 'zh_ord_1', snapshotAmountDetails: { currency: 'CNY', total: '99.00' } },
    { id: 'PAY_1', status: 'succeeded', orderMerchantExternalId: 'zh_ord_1', snapshotAmountDetails: { currency: 'cny', total: '99.00' } }
  ] } } }) })
  check('查单：找到成功的那笔', found.paid && found.paymentId === 'PAY_1' && found.amount === 9900 && found.currency === 'CNY', found)
  const none = await W.findPayment(env, 'zh_ord_1', { fetch: fakeFetch([], { body: { data: { payments: [] } } }) })
  check('查单：没付', none.paid === false)
  const noAmt = await W.findPayment(env, 'zh_ord_1', { fetch: fakeFetch([], { body: { data: { payments: [{ id: 'P', status: 'succeeded', orderMerchantExternalId: 'zh_ord_1', snapshotAmountDetails: null }] } } }) })
  check('查单：成功但还没金额 → 先算没到', noAmt.paid === false)
  const rlog = []
  const rf = await W.refund(env, { paymentId: 'PAY_1', amount: 9900, currency: 'CNY', orderNo: 'zh_ord_1', reason: '7 天内退款' }, { fetch: fakeFetch(rlog, { body: { data: { ticket: { id: 'TKT_1', status: 'processing' } } } }) })
  const rb = JSON.parse(rlog[0].body)
  check('退款：金额 99.00、单号带 refund_', rf.ok && rf.ticketId === 'TKT_1' && rb.requestedAmount.amount === '99.00' && rb.refundTicketMerchantExternalId === 'refund_zh_ord_1', rb)
  const again = await W.refund(env, { paymentId: 'PAY_1', amount: 9900, currency: 'CNY', orderNo: 'zh_ord_1' }, { fetch: fakeFetch([], { status: 409, body: { errors: [{ message: 'Refund ticket already exists' }] } }) })
  check('退款：重复点算已在退', again.ok && again.again)
  await fails('退款：被拒要报错', () => W.refund(env, { paymentId: 'PAY_1', amount: 9900, currency: 'CNY', orderNo: 'x' }, { fetch: fakeFetch([], { body: { data: { ticket: { id: 'T', status: 'rejected' } } } }) }))
  check('没配齐不算开通（环境也要写明）', !W.configured({ WAFFO_MERCHANT_ID: 'x' }) && !W.configured(env) && W.configured(Object.assign({ WAFFO_ENV: 'prod' }, env)))

  console.log('\n' + ok + ' 通过，' + bad + ' 失败')
  process.exit(bad ? 1 : 0)
}).catch(e => { console.error(e); process.exit(1) })
