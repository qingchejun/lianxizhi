/**
 * Waffo（Pancake）收款接口的最小实现（2026-11-28，方案 docs/superpowers/specs/2026-11-28-payment-waffo.md）。
 *
 * 照 Aship 模板 ~/coding/template-shipany-ai/src/core/payment/waffo.ts（官方 SDK @waffo/pancake-ts 0.18）的做法，
 * 只留一次性付款要用的四样：建收银台、查付款、退款、验回调。SDK 用 Node 的 crypto，这里换成 WebCrypto，
 * Pages Functions 和 node 测试里都能跑；签名规则和 SDK 一字不差，tools/check-waffo.js 拿模板里的 SDK 交叉验证。
 *
 *   请求签名：RSA-SHA256( "POST\n路径\n秒级时间戳\nbase64(sha256(body))" )，头 X-Merchant-Id / X-Timestamp / X-Signature；
 *            X-Idempotency-Key = hex(sha256("商户号:路径:body[:floor(秒/时间窗)]"))。
 *   回调验签：头 X-Waffo-Signature: t=毫秒,v1=base64，RSA-SHA256( t + "." + 原文 ) 用 Waffo 公钥验；默认 5 分钟内有效。
 *
 * 配置（Cloudflare 密钥 / 本地 --binding）：WAFFO_MERCHANT_ID、WAFFO_PRIVATE_KEY、WAFFO_PRODUCT_ID、WAFFO_ENV（test | prod）；
 * 本地测试另可设 WAFFO_API_BASE（假 Waffo）和 WAFFO_WEBHOOK_PUBLIC_KEY（自己造的回调公钥）。
 */

const API_BASE = 'https://api.waffo.ai'

/* Waffo 回调公钥（抄自 SDK 0.18 dist/index.js；SDK 升级换钥匙时同步） */
export const WAFFO_PUBLIC_KEYS = {
  test: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxnmRY6yMMA3lVqmAU6ZG
b1sjL/+r/z6E+ZjkXaDAKiqOhk9rpazni0bNsGXwmftTPk9jy2wn+j6JHODD/WH/
SCnSfvKkLIjy4Hk7BuCgB174C0ydan7J+KgXLkOwgCAxxB68t2tezldwo74ZpXgn
F49opzMvQ9prEwIAWOE+kV9iK6gx/AckSMtHIHpUesoPDkldpmFHlB2qpf1vsFTZ
5kD6DmGl+2GIVK01aChy2lk8pLv0yUMu18v44sLkO5M44TkGPJD9qG09wrvVG2wp
OTVCn1n5pP8P+HRLcgzbUB3OlZVfdFurn6EZwtyL4ZD9kdkQ4EZE/9inKcp3c1h4
xwIDAQAB
-----END PUBLIC KEY-----`,
  prod: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAz+xApdTIb4ua+DgZKQ54
iBsD82ybyhGCLRETONW4Jgbb3A8DUM1LqBk6r/CmTOCHqLalTQHNigvP3R5zkDNX
iRJz6gA4MJ/+8K0+mnEE2RISQzN+Qu65TNd6svb+INm/kMaftY4uIXr6y6kchtTJ
dwnQhcKdAL2v7h7IFnkVelQsKxDdb2PqX8xX/qwd01iXvMcpCCaXovUwZsxH2QN5
ZKBTseJivbhUeyJCco4fdUyxOMHe2ybCVhyvim2uxAl1nkvL5L8RCWMCAV55LLo0
9OhmLahz/DYNu13YLVP6dvIT09ZFBYU6Owj1NxdinTynlJCFS9VYwBgmftosSE1U
dwIDAQAB
-----END PUBLIC KEY-----`
}

const enc = new TextEncoder()
const RSA = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }

function toB64(buf) {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}
function fromB64(b64) {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}
function toHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/* ---------- 钥匙 ---------- */

/* DER 长度编码 */
function derLen(n) {
  if (n < 0x80) return [n]
  const bytes = []
  while (n > 0) { bytes.unshift(n & 0xff); n >>= 8 }
  return [0x80 | bytes.length, ...bytes]
}
function derSeq(tag, body) {
  return new Uint8Array([tag, ...derLen(body.length), ...body])
}
/* PKCS#1 RSA 私钥 → PKCS#8（WebCrypto 只收 PKCS#8） */
function pkcs1ToPkcs8(pkcs1) {
  const version = [0x02, 0x01, 0x00]
  const algo = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]
  const octet = derSeq(0x04, [...pkcs1])
  return derSeq(0x30, [...version, ...algo, ...octet])
}
/* PKCS#1 RSA 公钥 → SPKI */
function pkcs1PubToSpki(pkcs1) {
  const algo = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]
  const bits = derSeq(0x03, [0x00, ...pkcs1])
  return derSeq(0x30, [...algo, ...bits])
}

function pemBody(pem) {
  return String(pem || '').replace(/\\n/g, '\n').replace(/-----(BEGIN|END)[^-]+-----/g, '').replace(/\s+/g, '')
}

const keyCache = new Map()

/* 商户私钥：PEM（PKCS#8 / PKCS#1）或裸 base64 都收，和 SDK 一样 */
export async function importPrivateKey(raw) {
  if (keyCache.has(raw)) return keyCache.get(raw)
  const text = String(raw || '').replace(/\\n/g, '\n')
  const der = fromB64(pemBody(text))
  let key
  if (/BEGIN RSA PRIVATE KEY/.test(text)) {
    key = await crypto.subtle.importKey('pkcs8', pkcs1ToPkcs8(der), RSA, false, ['sign'])
  } else {
    try {
      key = await crypto.subtle.importKey('pkcs8', der, RSA, false, ['sign'])
    } catch (e) {
      key = await crypto.subtle.importKey('pkcs8', pkcs1ToPkcs8(der), RSA, false, ['sign'])
    }
  }
  keyCache.set(raw, key)
  return key
}

export async function importPublicKey(raw) {
  if (keyCache.has(raw)) return keyCache.get(raw)
  const text = String(raw || '').replace(/\\n/g, '\n')
  const der = fromB64(pemBody(text))
  let key
  if (/BEGIN RSA PUBLIC KEY/.test(text)) {
    key = await crypto.subtle.importKey('spki', pkcs1PubToSpki(der), RSA, false, ['verify'])
  } else {
    try {
      key = await crypto.subtle.importKey('spki', der, RSA, false, ['verify'])
    } catch (e) {
      key = await crypto.subtle.importKey('spki', pkcs1PubToSpki(der), RSA, false, ['verify'])
    }
  }
  keyCache.set(raw, key)
  return key
}

/* ---------- 请求签名 ---------- */

export async function signRequest(method, path, timestamp, body, privateKey) {
  const bodyHash = toB64(await crypto.subtle.digest('SHA-256', enc.encode(body)))
  const canonical = method + '\n' + path + '\n' + timestamp + '\n' + bodyHash
  const key = await importPrivateKey(privateKey)
  return toB64(await crypto.subtle.sign(RSA, key, enc.encode(canonical)))
}

export async function idempotencyKey(merchantId, path, body, timestampSec, windowSec) {
  const base = merchantId + ':' + path + ':' + body
  const input = windowSec ? base + ':' + Math.floor(timestampSec / windowSec) : base
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(input)))
}

export function configured(env) {
  return !!(env && env.WAFFO_MERCHANT_ID && env.WAFFO_PRIVATE_KEY && env.WAFFO_PRODUCT_ID && (env.WAFFO_ENV === 'test' || env.WAFFO_ENV === 'prod'))
}

/*
 * 签名 POST。返回 { status, data, errors }（不抛 errors[]，调用方看）；网络出错、回的不是 JSON 才抛。
 * opts：{ window: 秒（同样参数在时间窗内算同一请求）, noIdempotency, fetch, now }
 */
export async function post(env, path, payload, opts) {
  const o = opts || {}
  const body = JSON.stringify(payload)
  const nowSec = Math.floor((o.now || Date.now()) / 1000)
  const ts = String(nowSec)
  const headers = {
    'Content-Type': 'application/json',
    'X-Merchant-Id': env.WAFFO_MERCHANT_ID,
    'X-Timestamp': ts,
    'X-Signature': await signRequest('POST', path, ts, body, env.WAFFO_PRIVATE_KEY)
  }
  if (!o.noIdempotency) headers['X-Idempotency-Key'] = await idempotencyKey(env.WAFFO_MERCHANT_ID, path, body, nowSec, o.window)
  const base = String(env.WAFFO_API_BASE || API_BASE).replace(/\/+$/, '')
  const doFetch = o.fetch || fetch
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), 15000) : null
  let res
  try {
    res = await doFetch(base + path, { method: 'POST', headers, body, signal: controller ? controller.signal : undefined })
  } finally {
    if (timer) clearTimeout(timer)
  }
  let envelope
  try {
    envelope = await res.json()
  } catch (e) {
    throw new Error('Waffo ' + path + ' 返回的不是 JSON（' + res.status + '）')
  }
  return Object.assign({ status: res.status }, envelope)
}

function errText(r) {
  return (r.errors || []).map(e => e && e.message).filter(Boolean).join('; ') || ('HTTP ' + r.status)
}

/* 分 → Waffo 的金额字符串（人民币两位小数） */
export function money(minor) {
  return (Number(minor) / 100).toFixed(2)
}

/*
 * 建收银台（一次性付款，SDK checkout.authenticated.create 的两步）：
 * { orderNo, amount（分）, currency, uid, email, successUrl } → { sessionId, checkoutUrl }
 */
export async function createCheckout(env, order, opts) {
  const sessionParams = {
    productId: env.WAFFO_PRODUCT_ID,
    currency: order.currency,
    priceSnapshot: { amount: money(order.amount), taxCategory: 'digital_goods' },
    buyerEmail: order.email,
    successUrl: order.successUrl,
    orderMerchantExternalId: order.orderNo,
    metadata: { uid: String(order.uid), orderNo: order.orderNo },
    language: 'zh-Hans'
  }
  const [tok, ses] = await Promise.all([
    post(env, '/v1/actions/auth/issue-session-token', { productId: env.WAFFO_PRODUCT_ID, buyerIdentity: String(order.uid) }, Object.assign({ window: 60 }, opts)),
    post(env, '/v1/actions/checkout/create-session', sessionParams, Object.assign({ window: 60 }, opts))
  ])
  if (tok.errors && tok.errors.length) throw new Error('Waffo 登录令牌：' + errText(tok))
  if (ses.errors && ses.errors.length) throw new Error('Waffo 收银台：' + errText(ses))
  const s = ses.data || {}
  const t = tok.data || {}
  if (!s.checkoutUrl || !t.token) throw new Error('Waffo 收银台没返回地址')
  return { sessionId: s.sessionId, checkoutUrl: s.checkoutUrl + '#token=' + t.token }
}

const PAYMENTS_BY_REF = `query ($ref: String!) {
  payments(filter: { orderMerchantExternalId: { eq: $ref } }) {
    id status orderId orderMerchantExternalId createdAt
    snapshotAmountDetails { currency total }
  }
}`

/*
 * 按我们的订单号查 Waffo 付款（回调丢了时兜底）：
 * → { paid: true, paymentId, amount（分）, currency } | { paid: false }
 */
export async function findPayment(env, orderNo, opts) {
  const r = await post(env, '/v1/graphql', { query: PAYMENTS_BY_REF, variables: { ref: orderNo } }, Object.assign({ noIdempotency: true }, opts))
  if (r.errors && r.errors.length) throw new Error('Waffo 查单：' + errText(r))
  const list = (r.data && r.data.payments) || []
  const p = list.find(x => x && x.orderMerchantExternalId === orderNo && x.status === 'succeeded')
  if (!p || !p.snapshotAmountDetails || p.snapshotAmountDetails.total == null) return { paid: false }
  return {
    paid: true,
    paymentId: p.id,
    amount: Math.round(Number(p.snapshotAmountDetails.total) * 100),
    currency: String(p.snapshotAmountDetails.currency || '').toUpperCase()
  }
}

/* 退款（商户发起，自动通过）：→ { ok, ticketId, status } */
export async function refund(env, { paymentId, amount, currency, orderNo, reason }, opts) {
  const r = await post(env, '/v1/actions/refund-ticket/create-ticket', {
    paymentId,
    reason: String(reason || '退款').slice(0, 500),
    requestedAmount: { amount: money(amount), currency },
    refundTicketMerchantExternalId: ('refund_' + orderNo).slice(0, 128)
  }, opts)
  if (r.errors && r.errors.length) {
    if (r.status === 409 && /already exists/i.test(errText(r))) return { ok: true, status: 'processing', again: true }
    throw new Error('Waffo 退款：' + errText(r))
  }
  const t = (r.data && r.data.ticket) || {}
  if (t.status === 'failed' || t.status === 'rejected') throw new Error('Waffo 退款被拒：' + t.status)
  return { ok: true, ticketId: t.id, status: t.status || 'processing' }
}

/*
 * 回调验签：→ 回调内容（对象）；验不过抛错。
 * 公钥：WAFFO_WEBHOOK_PUBLIC_KEY（本地测试用）> 按 WAFFO_ENV 选正式 / 测试。WAFFO_ENV 必须是 test 或 prod，回调的 mode 必须一致。
 * 验过签也只说明「是 Waffo 发的」，不说明是我们店的付款：开通前还要用 findPayment 查（server/pay-core.js webhook）。
 */
export async function verifyWebhook(env, payload, header, now, toleranceMs) {
  if (!header) throw new Error('缺少 X-Waffo-Signature')
  let t = ''
  let v1 = ''
  for (const pair of String(header).split(',')) {
    const i = pair.indexOf('=')
    if (i < 0) continue
    const k = pair.slice(0, i).trim()
    const v = pair.slice(i + 1).trim()
    if (k === 't') t = v
    else if (k === 'v1') v1 = v
  }
  if (!t || !v1) throw new Error('X-Waffo-Signature 格式不对')
  const age = (now || Date.now()) - Number(t)
  const tol = toleranceMs == null ? 5 * 60 * 1000 : toleranceMs
  if (Number.isNaN(age) || age > tol || age < -60 * 1000) throw new Error('回调时间不对（可能是重放）')
  const data = enc.encode(t + '.' + payload)
  const sig = fromB64(v1)
  /* 环境必须明写（安全复审 11-28）：没写就拒，免得测试钥匙签的回调在正式站也算数 */
  if (env.WAFFO_ENV !== 'test' && env.WAFFO_ENV !== 'prod') throw new Error('WAFFO_ENV 没设成 test 或 prod')
  const key = env.WAFFO_WEBHOOK_PUBLIC_KEY || WAFFO_PUBLIC_KEYS[env.WAFFO_ENV]
  if (await crypto.subtle.verify(RSA, await importPublicKey(key), sig, data)) {
    const event = JSON.parse(payload)
    if (event.mode !== env.WAFFO_ENV) throw new Error('回调环境不对：' + event.mode)
    return event
  }
  throw new Error('回调签名不对')
}

/* 回调里的付款信息（order.completed）→ { orderNo, paymentId, amount（分）, currency, uid } */
export function paidFromEvent(event) {
  const d = (event && event.data) || {}
  const total = d.total != null && d.total !== '' ? d.total : d.amount
  return {
    orderNo: d.orderMerchantExternalId || '',
    paymentId: d.paymentId || event.eventId || '',
    amount: total == null || total === '' ? null : Math.round(Number(total) * 100),
    currency: String(d.currency || '').toUpperCase(),
    uid: d.merchantProvidedBuyerIdentity || (d.orderMetadata && d.orderMetadata.uid) || '',
    status: d.paymentStatus || ''
  }
}
