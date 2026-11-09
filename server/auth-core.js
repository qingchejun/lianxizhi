/**
 * 账号鉴权的核心逻辑：纯逻辑 + 传入 repo，不碰 fetch/Response。
 * functions/api/* 只做 HTTP 翻译；这里可测的部分全部 node 直跑（tools/check-auth-core.js）。
 * 时间一律 unix 毫秒。返回值统一 { status, body, session?, mail?, dev? }：
 *   session = {uid, pwver}（wrapper 签成 cookie）；mail 由 wrapper 发；dev 仅本地回显。
 */

const enc = new TextEncoder()
const CODE_TTL = 10 * 60 * 1000
const CODE_MAX_FAILS = 5
const MAIL_INTERVAL = 60 * 1000
const MAIL_HOUR_MAX = 3

async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(s))
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}
function randomHex(nBytes) {
  const b = new Uint8Array(nBytes)
  crypto.getRandomValues(b)
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('')
}
export function normEmail(s) {
  return typeof s === 'string' ? s.trim().toLowerCase() : ''
}
export function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}
export function validClientHash(h) {
  return /^[0-9a-f]{64}$/.test(h)
}

/* ---- 邮件限流：60 秒间隔 + 每小时 3 封（验证码和重设共用一个闸） ---- */
async function mailGate(repo, email, now) {
  const row = await repo.limitGet(email, 'mail')
  if (row && row.until > now) return 'interval'
  if (row && row.ts > now - 3600 * 1000 && row.n >= MAIL_HOUR_MAX) return 'hour'
  return null
}
async function mailMark(repo, email, now) {
  const row = await repo.limitGet(email, 'mail')
  const n = row && row.ts > now - 3600 * 1000 ? row.n + 1 : 1
  await repo.limitSet(email, 'mail', { n: n, ts: now, until: now + MAIL_INTERVAL })
}

/* ---- 发验证码（6 位、hash 入库、10 分钟） ---- */
async function issueCode(repo, user, now) {
  const gate = await mailGate(repo, user.email, now)
  if (gate === 'interval') return { status: 429, body: { ok: false, error: '发送太频繁了，一分钟后再试。' } }
  if (gate === 'hour') return { status: 429, body: { ok: false, error: '这一小时发的邮件够多了，过一小时再试。' } }
  const code = String(100000 + (parseInt(randomHex(8), 16) % 900000))
  const salt = randomHex(16)
  await repo.tokenInsert({
    token_hash: salt + '$' + await sha256hex(salt + ':' + code),
    user_id: user.id, kind: 'verify', expires_at: now + CODE_TTL
  })
  await mailMark(repo, user.email, now)
  await repo.limitSet(user.email, 'codefail', { n: 0, ts: now, until: 0 }) /* 新码配新的 5 次机会 */
  return {
    status: 200, body: { ok: true },
    mail: { to: user.email, subject: '练习纸 · 验证码', text: '验证码：' + code + '\n10 分钟内有效。如果不是你在操作，忽略这封邮件就行。' },
    dev: { code: code }
  }
}

/* ---- 注册 ---- */
export async function register(repo, now, body) {
  const email = normEmail(body && body.email)
  const pw = (body && body.password) || ''
  if (!validEmail(email)) return { status: 422, body: { ok: false, error: '邮箱地址看起来不对。' } }
  if (!validClientHash(pw)) return { status: 422, body: { ok: false, error: '密码至少 8 位。' } }
  let user = await repo.userByEmail(email)
  if (user && user.verified) return { status: 409, body: { ok: false, error: '这个邮箱已经注册过了，直接登录就行。' } }
  if (user) {
    /* 未验证过的邮箱重复注册 = 换密码重来（裁定 5） */
    await repo.updateUser(user.id, { pw_hash: await sha256hex(user.pw_salt + pw) })
  } else {
    const id = crypto.randomUUID()
    const pw_salt = randomHex(16)
    await repo.insertUser({
      id: id, email: email,
      pw_hash: await sha256hex(pw_salt + pw), pw_salt: pw_salt,
      pwver: 1, verified: 0, created_at: now
    })
  }
  return issueCode(repo, await repo.userByEmail(email), now)
}

/* ---- 验证码校验 ---- */
export async function verify(repo, now, body) {
  const email = normEmail(body && body.email)
  const code = (body && body.code) || ''
  const user = await repo.userByEmail(email)
  if (!user) return { status: 422, body: { ok: false, error: '验证码不对，再看一眼邮件。' } }
  if (!/^\d{6}$/.test(code)) return { status: 422, body: { ok: false, error: '验证码是 6 位数字。' } }
  const fails = await repo.limitGet(email, 'codefail')
  if (fails && fails.n >= CODE_MAX_FAILS) {
    await repo.tokensClear(user.id, 'verify')
    return { status: 429, body: { ok: false, error: '错得太多了，验证码已作废，请重新发送。' } }
  }
  const rows = await repo.tokenListByUser(user.id, 'verify')
  for (const row of rows) {
    const salt = row.token_hash.split('$')[0]
    if (row.token_hash === salt + '$' + await sha256hex(salt + ':' + code)) {
      if (row.used_at) break /* 用过的码当错码处理（防重放） */
      if (row.expires_at <= now) return { status: 422, body: { ok: false, error: '验证码过期了，请重新发送。' } }
      await repo.tokenUse(row.token_hash)
      await repo.setVerified(user.id)
      return { status: 200, body: { ok: true }, session: { uid: user.id, pwver: user.pwver } }
    }
  }
  await repo.limitSet(email, 'codefail', { n: (fails ? fails.n : 0) + 1, ts: now, until: 0 })
  return { status: 422, body: { ok: false, error: '验证码不对，再看一眼邮件。' } }
}
