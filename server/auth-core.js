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

/* ---- 登录（失败 10 次锁 15 分钟；未验证补发验证码） ---- */
const LOGIN_MAX_FAILS = 10
const LOCK_MS = 15 * 60 * 1000

async function bumpLoginFails(repo, email, now) {
  const row = await repo.limitGet(email, 'loginfail')
  const n = (row ? row.n : 0) + 1
  await repo.limitSet(email, 'loginfail', { n: n, ts: now, until: n >= LOGIN_MAX_FAILS ? now + LOCK_MS : 0 })
}

export async function login(repo, now, body) {
  const email = normEmail(body && body.email)
  const pw = (body && body.password) || ''
  const generic = { status: 401, body: { ok: false, error: '邮箱或密码不对。' } }
  const user = await repo.userByEmail(email)
  if (!user || !validClientHash(pw)) {
    if (user) await bumpLoginFails(repo, email, now) /* 只对真用户计数，防按邮箱骚扰 */
    return generic
  }
  const row = await repo.limitGet(email, 'loginfail')
  if (row && row.until > now) return { status: 429, body: { ok: false, error: '试错次数太多，等 15 分钟再来。' } }
  if (user.pw_hash !== await sha256hex(user.pw_salt + pw)) {
    await bumpLoginFails(repo, email, now)
    return generic
  }
  await repo.limitSet(email, 'loginfail', { n: 0, ts: now, until: 0 })
  if (!user.verified) {
    const r = await issueCode(repo, user, now)
    /* 不管发没发出去（节流 429 也罢），登录的结果都是「请去验证」——刚注册的人
       手里的码还没过期，没理由用「发送太频繁」把他挡在验证页外面 */
    r.status = 200
    r.body = { ok: false, need_verify: true }
    return r
  }
  return { status: 200, body: { ok: true }, session: { uid: user.id, pwver: user.pwver } }
}

/* ---- 找回密码：无论邮箱是否存在都 200（spec：不泄露注册情况） ---- */
export async function forgot(repo, now, body) {
  const email = normEmail(body && body.email)
  if (!validEmail(email)) return { status: 422, body: { ok: false, error: '邮箱地址看起来不对。' } }
  const user = await repo.userByEmail(email)
  if (!user) return { status: 200, body: { ok: true } }
  if (await mailGate(repo, email, now)) return { status: 200, body: { ok: true } } /* 节流也装作成功 */
  const token = randomHex(32)
  await repo.tokenInsert({
    token_hash: 'plain$' + await sha256hex(token),
    user_id: user.id, kind: 'reset', expires_at: now + 30 * 60 * 1000
  })
  await mailMark(repo, email, now)
  return {
    status: 200, body: { ok: true },
    mail: {
      to: email, subject: '练习纸 · 重设密码',
      text: '有人（希望是你）申请重设「练习纸」的密码。打开下面的链接重设，30 分钟内有效、用一次就作废：\nhttps://lianxizhi.qingchejun.com/?reset=' + token + '\n不是你的话，忽略这封邮件就行。'
    },
    dev: { token: token }
  }
}

/* ---- 重设密码：token 一次性；pwver+1 旧登录态全失效 ---- */
export async function reset(repo, now, body) {
  const token = (body && body.token) || ''
  const pw = (body && body.password) || ''
  if (!validClientHash(pw)) return { status: 422, body: { ok: false, error: '密码至少 8 位。' } }
  if (!/^[0-9a-f]{64}$/.test(token)) return { status: 422, body: { ok: false, error: '重置链接不对。' } }
  const row = await repo.tokenGet('plain$' + await sha256hex(token))
  if (!row || row.kind !== 'reset' || row.used_at || row.expires_at <= now) {
    return { status: 422, body: { ok: false, error: '重置链接已失效，请重新发一封。' } }
  }
  const user = await repo.userById(row.user_id)
  if (!user) return { status: 422, body: { ok: false, error: '重置链接已失效，请重新发一封。' } }
  await repo.tokenUse(row.token_hash)
  /* 密码一换，之前发出去的重设链接/验证码全部作废——不然泄漏的旧链接
     还能在有效期内反杀，界面「其他设备需要重新登录」就成了空话 */
  await repo.tokensClear(user.id, 'reset')
  await repo.tokensClear(user.id, 'verify')
  const pw_salt = randomHex(16)
  /* 同 changePassword：先存 nextPwver，别依赖 repo 不改写 user */
  const nextPwver = user.pwver + 1
  await repo.updateUser(user.id, {
    pw_hash: await sha256hex(pw_salt + pw), pw_salt: pw_salt,
    pwver: nextPwver, verified: 1 /* 重设顺带验证（能收到邮件就证明邮箱是本人的） */
  })
  return { status: 200, body: { ok: true }, session: { uid: user.id, pwver: nextPwver } }
}

/* ---- 改密码：要登录态 + 当前密码；副作用与重设一致（pwver+1，别处登录态全失效）。
   当前密码的试错与登录共用 loginfail 计数：同一个账号同一个语义——猜密码。 ---- */
export async function changePassword(repo, session, now, body) {
  if (!session) return { status: 401, body: { ok: false, error: '先登录才能改密码。' } }
  const oldHash = (body && body.old) || ''
  const newHash = (body && body.new) || ''
  if (!validClientHash(newHash)) return { status: 422, body: { ok: false, error: '新密码至少 8 位。' } }
  if (!validClientHash(oldHash)) return { status: 401, body: { ok: false, error: '当前密码不对。' } }
  const user = await repo.userById(session.uid)
  if (!user) return { status: 401, body: { ok: false, error: '先登录才能改密码。' } }
  const row = await repo.limitGet(user.email, 'loginfail')
  if (row && row.until > now) return { status: 429, body: { ok: false, error: '试错次数太多，等 15 分钟再来。' } }
  if (user.pw_hash !== await sha256hex(user.pw_salt + oldHash)) {
    await bumpLoginFails(repo, user.email, now)
    return { status: 401, body: { ok: false, error: '当前密码不对。' } }
  }
  const pw_salt = randomHex(16)
  /* 先存好 nextPwver 再写库：repo 若原地改写 user（内存桩就会），user.pwver+1 会算两遍 */
  const nextPwver = user.pwver + 1
  await repo.updateUser(user.id, {
    pw_hash: await sha256hex(pw_salt + newHash), pw_salt: pw_salt,
    pwver: nextPwver
  })
  /* 同 reset：改密码就得把手里所有重设链接/验证码都收回（安全审查 Important 1） */
  await repo.tokensClear(user.id, 'reset')
  await repo.tokensClear(user.id, 'verify')
  await repo.limitSet(user.email, 'loginfail', { n: 0, ts: now, until: 0 })
  return { status: 200, body: { ok: true }, session: { uid: user.id, pwver: nextPwver } }
}

/* ---- /api/auth/me：会话有效性 + pwver 比对 ---- */
export async function meBySession(repo, session) {
  if (!session) return { status: 401, body: { ok: false } }
  const user = await repo.userById(session.uid)
  if (!user || user.pwver !== session.pwver) return { status: 401, body: { ok: false } }
  return { status: 200, body: { ok: true, email: user.email, verified: !!user.verified } }
}

/* ---- data 拉取 / 推送 ---- */
const PUSH_MAX_ITEMS = 200
const VALUE_MAX = 64 * 1024
const QUOTA_BYTES = 5 * 1024 * 1024 /* 一个账号 5MB 封顶：正常数据几十 KB，防写爆免费档 D1 */
const PUSH_MIN_MAX = 60 /* 一分钟最多 60 次推送（客户端防抖 2 秒，正常用远够不着） */

/* 推送频控：滚动一分钟计数，复用 limits 表 */
async function pushGate(repo, userId, now) {
  const row = await repo.limitGet('push:' + userId, 'min')
  return !!(row && row.ts > now - 60 * 1000 && row.n >= PUSH_MIN_MAX)
}
async function pushMark(repo, userId, now) {
  const row = await repo.limitGet('push:' + userId, 'min')
  const n = row && row.ts > now - 60 * 1000 ? row.n + 1 : 1
  await repo.limitSet('push:' + userId, 'min', { n: n, ts: now, until: 0 })
}

export async function dataPull(repo, userId) {
  const items = await repo.dataRows(userId)
  return { status: 200, body: { ok: true, items: items } }
}

export async function dataPush(repo, userId, items, now) {
  now = now || Date.now()
  if (!Array.isArray(items) || !items.length) return { status: 422, body: { ok: false, error: '没东西要同步。' } }
  if (items.length > PUSH_MAX_ITEMS) return { status: 413, body: { ok: false, error: '一次同步的东西太多了。' } }
  if (await pushGate(repo, userId, now)) {
    return { status: 429, body: { ok: false, error: '同步得太频繁了，缓一缓再试。' } }
  }
  /* 先过一遍验参并算好这批的字节数：配额不够就整批拒绝，不落半批 */
  let incoming = 0
  const valid = []
  for (const it of items) {
    if (!it || typeof it.key !== 'string' || it.key.indexOf('sumsum:') !== 0 ||
        it.key === 'sumsum:help:seen' || it.key === 'sumsum:sync:meta' ||
        typeof it.value !== 'string' || it.value.length > VALUE_MAX ||
        typeof it.updated_at !== 'number' || !isFinite(it.updated_at)) {
      continue
    }
    valid.push(it)
    incoming += it.value.length
  }
  const used = await repo.dataBytes(userId)
  if (used + incoming > QUOTA_BYTES) {
    return { status: 413, body: { ok: false, error: '云端的空间存不下这么多进度了，这份没有同步。' } }
  }
  await pushMark(repo, userId, now)
  let applied = 0, skipped = items.length - valid.length
  for (const it of valid) {
    if (await repo.dataUpsert(userId, it.key, it.value, it.updated_at)) applied++
    else skipped++
  }
  return { status: 200, body: { ok: true, applied: applied, skipped: skipped } }
}
