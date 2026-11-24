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

/* ---- 2026-11-24 放开注册：免费版 / 完整版，发信总量与按地址限流（方案 open-register-full-plan.md） ---- */
export const PLAN_FREE = 'free'
export const PLAN_FULL = 'full'
const DAY = 86400 * 1000
const HOUR = 3600 * 1000
/* 全站每天发信上限（按世界标准时间算天）：没验证过的新账号最多用 NEW 封，
   其余（带邀请码注册、已注册账号找回密码等）一起不超过 ALL —— 刷注册刷不光老用户的额度 */
export const MAIL_DAY_NEW = 150
export const MAIL_DAY_ALL = 200
const IP_HOUR_MAX = 10
const IP_DAY_MAX = 20
const INVITE_IP_HOUR_FAILS = 20 /* 换邮箱猜码：按地址再计一次 */
const UNVERIFIED_TTL = 48 * HOUR

function dayStart(now) { return now - (now % DAY) }
function hourStart(now) { return now - (now % HOUR) }

/* IPv6 按 /64 一段算（一台机器通常拿到一整段，按单个地址限等于没限） */
export function ipScope(ip) {
  ip = String(ip || '').trim().toLowerCase()
  if (!ip) return ''
  if (ip.indexOf(':') >= 0) {
    const parts = ip.split('::')[0].split(':')
    return 'ip6:' + parts.slice(0, 4).join(':')
  }
  return 'ip:' + ip
}

/* 发信闸：按地址每小时 / 每天，再按全站每天。用原子计数，不会多发 */
async function sendGate(repo, now, opts) {
  const scope = ipScope(opts && opts.ip)
  if (scope) {
    if (!(await repo.counterBump(scope, 'mailhour', hourStart(now), IP_HOUR_MAX))) return 'ip'
    if (!(await repo.counterBump(scope, 'mailday', dayStart(now), IP_DAY_MAX))) return 'ip'
  }
  const bucket = (opts && opts.bucket) || 'new'
  if (bucket === 'new' && !(await repo.counterBump('all', 'mailnew', dayStart(now), MAIL_DAY_NEW))) return 'day'
  if (!(await repo.counterBump('all', 'mailall', dayStart(now), MAIL_DAY_ALL))) return 'day'
  return null
}
const GATE_MSG = {
  ip: '这个网络今天发的验证码太多了，换个网络或明天再试。',
  day: '今天注册的人太多了，验证码发不过来，请明天再来。'
}

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
export function normInvite(s) {
  return typeof s === 'string' ? s.toUpperCase().replace(/[^A-Z0-9]/g, '') : ''
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
async function issueCode(repo, user, now, kind, opts) {
  kind = kind || 'verify'
  const gate = await mailGate(repo, user.email, now)
  if (gate === 'interval') return { status: 429, body: { ok: false, error: '发送太频繁了，一分钟后再试。' } }
  if (gate === 'hour') return { status: 429, body: { ok: false, error: '这一小时发的邮件够多了，过一小时再试。' } }
  const sg = await sendGate(repo, now, Object.assign({ bucket: user.verified ? 'old' : (user.invite_id ? 'invite' : 'new') }, opts))
  if (sg) return { status: 429, body: { ok: false, error: GATE_MSG[sg] }, capped: sg }
  const code = String(100000 + (parseInt(randomHex(8), 16) % 900000))
  const salt = randomHex(16)
  await repo.tokenInsert({
    token_hash: salt + '$' + await sha256hex(salt + ':' + code),
    user_id: user.id, kind: kind, expires_at: now + CODE_TTL
  })
  await mailMark(repo, user.email, now)
  await repo.limitSet(user.email, 'codefail', { n: 0, ts: now, until: 0 }) /* 新码配新的 5 次机会 */
  const mail = kind === 'reset'
    ? { to: user.email, subject: '纸和笔 · 重设密码验证码', text: '重设密码的验证码：' + code + '\n10 分钟内有效，用一次就作废。如果不是你在操作，忽略这封邮件就行，密码不会变。' }
    : { to: user.email, subject: '纸和笔 · 验证码', text: '验证码：' + code + '\n10 分钟内有效。如果不是你在操作，忽略这封邮件就行。' }
  return {
    status: 200, body: { ok: true },
    mail: mail,
    dev: { code: code }
  }
}

/* ---- 注册（2026-11-24 放开：邀请码选填。填对 = 完整版；不填 = 免费版；填错 = 不注册，免得家长以为开了完整版） ---- */
const INVITE_MAX_FAILS = 5
const INVITE_LOCK_MS = 15 * 60 * 1000
const BAD_INVITE = '邀请码不对，检查一下；没有邀请码可以清空这一栏，先免费注册。'

/* 校验邀请码（不占用）：试错按邮箱 / 账号计数，再按地址计数（换邮箱猜码也挡得住）。返回 { inv } 或 { res } */
async function checkInvite(repo, now, who, code, ip) {
  const fails = await repo.limitGet(who, 'invitefail')
  if (fails && fails.until > now) return { res: { status: 429, body: { ok: false, error: '邀请码错得太多，等 15 分钟再试。' } } }
  const scope = ipScope(ip)
  if (scope) {
    const row = await repo.limitGet(scope, 'invitefail')
    if (row && row.ts >= hourStart(now) && row.n >= INVITE_IP_HOUR_FAILS) {
      return { res: { status: 429, body: { ok: false, error: '邀请码错得太多，过一小时再试。' } } }
    }
  }
  const inv = await repo.inviteGetByCode(code)
  if (!inv || inv.revoked_at || inv.claimed_by) {
    const n = (fails ? fails.n : 0) + 1
    await repo.limitSet(who, 'invitefail', { n: n, ts: now, until: n >= INVITE_MAX_FAILS ? now + INVITE_LOCK_MS : 0 })
    if (scope) await repo.counterBump(scope, 'invitefail', hourStart(now), 1e9)
    return { res: { status: 422, body: { ok: false, error: BAD_INVITE } } }
  }
  return { inv: inv }
}

/* 没验证的账号放 48 小时就清掉（邮箱、它占着的邀请码都放回去）。Pages 没有定时任务，借注册的请求顺手清 */
async function purgeStale(repo, now) {
  if (repo.purgeUnverified) await repo.purgeUnverified(now - UNVERIFIED_TTL, now)
}

export async function register(repo, now, body, ctx) {
  ctx = ctx || {}
  const email = normEmail(body && body.email)
  const pw = (body && body.password) || ''
  if (!validEmail(email)) return { status: 422, body: { ok: false, error: '邮箱地址看起来不对。' } }
  if (!validClientHash(pw)) return { status: 422, body: { ok: false, error: '密码至少 8 位。' } }
  await purgeStale(repo, now)
  const code = normInvite(body && body.invite)
  let user = await repo.userByEmail(email)
  if (user && user.verified) {
    /* 不在页面上说「已经注册过」（放开注册后这句话谁都能拿来查邮箱）：页面照常进验证码页，
       邮箱主人收到的是一封「已经注册过，直接登录」的提醒 */
    const ok = { status: 200, body: { ok: true } }
    if (user.banned || await mailGate(repo, email, now)) return ok
    if (await sendGate(repo, now, { ip: ctx.ip, bucket: 'old' })) return ok
    await mailMark(repo, email, now)
    ok.mail = { to: email, subject: '纸和笔 · 这个邮箱已经注册过', text: '有人（可能就是你）刚用这个邮箱在纸和笔注册。这个邮箱已经有账号了，直接登录就行；忘了密码，在登录框点「忘记密码」。\n如果不是你在操作，忽略这封邮件就行。' }
    return ok
  }
  if (user && user.banned) return { status: 403, body: { ok: false, error: '账号已被停用。' } }
  let inv = null
  if (code) {
    const c = await checkInvite(repo, now, email, code, ctx.ip)
    if (c.res) return c.res
    inv = c.inv
  }
  if (user) {
    /* 未验证过的邮箱重复注册 = 换密码重来（裁定 5）。别人抢先用这个邮箱注册过也没关系：
       真主人这次带的邀请码照样认，开成完整版（不会被悄悄降成免费版） */
    await repo.updateUser(user.id, { pw_hash: await sha256hex(user.pw_salt + pw) })
    if (inv && !user.invite_id) {
      if (!(await repo.inviteClaim(inv.id, user.id, now))) return { status: 422, body: { ok: false, error: BAD_INVITE } }
      await repo.setPlan(user.id, PLAN_FULL, inv.id)
    }
  } else {
    const id = crypto.randomUUID()
    /* 占码在插用户之前：宁可"码占住没用户"（站长作废即可），不可"两个用户抢一张码" */
    if (inv && !(await repo.inviteClaim(inv.id, id, now))) return { status: 422, body: { ok: false, error: BAD_INVITE } }
    const pw_salt = randomHex(16)
    await repo.insertUser({
      id: id, email: email,
      pw_hash: await sha256hex(pw_salt + pw), pw_salt: pw_salt,
      pwver: 1, verified: 0, created_at: now, invite_id: inv ? inv.id : null,
      plan: inv ? PLAN_FULL : PLAN_FREE
    })
  }
  user = await repo.userByEmail(email)
  return issueCode(repo, user, now, 'verify', { ip: ctx.ip, bucket: (inv || user.invite_id) ? 'invite' : 'new' })
}

/* ---- 注册后补填邀请码：免费版 → 完整版。要登录、要验证过邮箱；占码和升级一起写，不会码用掉了账号没升级 ---- */
export async function redeemInvite(repo, session, now, body, ctx) {
  ctx = ctx || {}
  if (!session) return { status: 401, body: { ok: false, error: '先登录。' } }
  const user = await repo.userById(session.uid)
  if (!user || user.pwver !== session.pwver || user.banned) return { status: 401, body: { ok: false, error: '先登录。' } }
  if (!user.verified) return { status: 403, body: { ok: false, error: '先验证邮箱。' } }
  if (planOf(user) === PLAN_FULL) return { status: 200, body: { ok: true, plan: PLAN_FULL } }
  const code = normInvite(body && body.invite)
  if (!code) return { status: 422, body: { ok: false, error: '请填邀请码。' } }
  const c = await checkInvite(repo, now, 'uid:' + user.id, code, ctx.ip)
  if (c.res) {
    if (c.res.status === 422) c.res.body.error = '邀请码不对，找邀请你的人核对一下。'
    return c.res
  }
  if (!(await repo.redeemInvite(c.inv.id, user.id, now))) {
    return { status: 422, body: { ok: false, error: '邀请码不对，找邀请你的人核对一下。' } }
  }
  return { status: 200, body: { ok: true, plan: PLAN_FULL } }
}

/* 账号版本：只认数据库里明写的 free；老账号（加列前就有的）一律算完整版 */
export function planOf(user) {
  return user && user.plan === PLAN_FREE ? PLAN_FREE : PLAN_FULL
}

/* ---- 删除账号：要当前密码。练习数据、验证码一起删；用过的邀请码不放回 ---- */
export async function deleteAccount(repo, session, now, body) {
  if (!session) return { status: 401, body: { ok: false, error: '先登录。' } }
  const user = await repo.userById(session.uid)
  if (!user || user.pwver !== session.pwver) return { status: 401, body: { ok: false, error: '先登录。' } }
  const pw = (body && body.password) || ''
  const row = await repo.limitGet(user.email, 'loginfail')
  if (row && row.until > now) return { status: 429, body: { ok: false, error: '试错次数太多，等 15 分钟再来。' } }
  if (!validClientHash(pw) || user.pw_hash !== await sha256hex(user.pw_salt + pw)) {
    await bumpLoginFails(repo, user.email, now)
    return { status: 422, body: { ok: false, error: '当前密码不对。' } }
  }
  if (user.admin) return { status: 403, body: { ok: false, error: '管理员账号不能在这里删除。' } }
  await repo.deleteUser(user.id)
  return { status: 200, body: { ok: true }, clearSession: true }
}

/* ---- 验证码校验 ---- */
export async function verify(repo, now, body) {
  const email = normEmail(body && body.email)
  const code = (body && body.code) || ''
  if (!/^\d{6}$/.test(code)) return { status: 422, body: { ok: false, error: '验证码是 6 位数字。' } }
  /* 和 reset 一样：试错计数按邮箱、先于查账号，没注册的邮箱错满也回 429，免得被拿来试探邮箱 */
  const fails = await repo.limitGet(email, 'codefail')
  const user = await repo.userByEmail(email)
  if (fails && fails.n >= CODE_MAX_FAILS) {
    if (user) await repo.tokensClear(user.id, 'verify')
    return { status: 429, body: { ok: false, error: '错得太多了，验证码已作废，请重新发送。' } }
  }
  if (!user) {
    await repo.limitSet(email, 'codefail', { n: (fails ? fails.n : 0) + 1, ts: now, until: 0 })
    return { status: 422, body: { ok: false, error: '验证码不对，再看一眼邮件。' } }
  }
  if (user.banned) return { status: 403, body: { ok: false, error: '账号已被停用。' } }
  const rows = await repo.tokenListByUser(user.id, 'verify')
  for (const row of rows) {
    const salt = row.token_hash.split('$')[0]
    if (row.token_hash === salt + '$' + await sha256hex(salt + ':' + code)) {
      if (row.used_at) break /* 用过的码当错码处理（防重放） */
      if (row.expires_at <= now) return { status: 422, body: { ok: false, error: '验证码过期了，请重新发送。' } }
      await repo.tokenUse(row.token_hash)
      await repo.setVerified(user.id)
      if (user.invite_id) await repo.inviteActivate(user.invite_id, now) /* 老账号 invite_id 为 null，不动 */
      return { status: 200, body: { ok: true, admin: !!user.admin, plan: planOf(user) }, session: { uid: user.id, pwver: user.pwver } }
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

export async function login(repo, now, body, ctx) {
  ctx = ctx || {}
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
  /* 密码对但账号被站长停用：挡在发码/发 session 之前（错密码的试探仍走上面的通用文案） */
  if (user.banned) return { status: 403, body: { ok: false, error: '账号已被停用。' } }
  await repo.limitSet(email, 'loginfail', { n: 0, ts: now, until: 0 })
  if (!user.verified) {
    const r = await issueCode(repo, user, now, 'verify', { ip: ctx.ip })
    /* 不管发没发出去（节流 429 也罢），登录的结果都是「请去验证」——刚注册的人
       手里的码还没过期，没理由用「发送太频繁」把他挡在验证页外面 */
    r.status = 200
    r.body = { ok: false, need_verify: true }
    return r
  }
  return { status: 200, body: { ok: true, admin: !!user.admin, plan: planOf(user) }, session: { uid: user.id, pwver: user.pwver } }
}

/* ---- 找回密码：发 6 位验证码到邮箱（2026-11 改版：不再发链接，手机微信里不用跳浏览器）。
   无论邮箱是否存在都 200（spec：不泄露注册情况） ---- */
export async function forgot(repo, now, body, ctx) {
  ctx = ctx || {}
  const email = normEmail(body && body.email)
  if (!validEmail(email)) return { status: 422, body: { ok: false, error: '邮箱地址看起来不对。' } }
  const user = await repo.userByEmail(email)
  if (!user || user.banned) return { status: 200, body: { ok: true } } /* 不存在/已停用都装作成功，不泄露注册情况 */
  if (await mailGate(repo, email, now)) return { status: 200, body: { ok: true } } /* 节流也装作成功 */
  return issueCode(repo, user, now, 'reset', { ip: ctx.ip, bucket: 'old' })
}

/* ---- 重设密码：token 一次性；pwver+1 旧登录态全失效 ---- */
export async function reset(repo, now, body) {
  const token = (body && body.token) || ''
  const pw = (body && body.password) || ''
  if (!validClientHash(pw)) return { status: 422, body: { ok: false, error: '密码至少 8 位。' } }
  let user, used
  if (body && body.code !== undefined) {
    /* 新流程：邮箱 + 6 位验证码。试错计数与注册验证码共用 codefail（同一语义：猜验证码） */
    const email = normEmail(body.email)
    const code = String(body.code || '')
    const bad = { status: 422, body: { ok: false, error: '验证码不对，再看一眼邮件。' } }
    if (!/^\d{6}$/.test(code)) return { status: 422, body: { ok: false, error: '验证码是 6 位数字。' } }
    /* 试错计数按邮箱记、先于查账号：没注册的邮箱错满 5 次也回同一句 429，
       不然能靠「429 还是 422」试出邮箱有没有注册 */
    const fails = await repo.limitGet(email, 'codefail')
    user = await repo.userByEmail(email)
    if (fails && fails.n >= CODE_MAX_FAILS) {
      if (user) await repo.tokensClear(user.id, 'reset')
      return { status: 429, body: { ok: false, error: '错得太多了，验证码已作废，请重新发送。' } }
    }
    if (!user || user.banned) {
      await repo.limitSet(email, 'codefail', { n: (fails ? fails.n : 0) + 1, ts: now, until: 0 })
      return bad
    }
    for (const row of await repo.tokenListByUser(user.id, 'reset')) {
      const salt = row.token_hash.split('$')[0]
      if (salt === 'plain') continue
      if (row.token_hash === salt + '$' + await sha256hex(salt + ':' + code)) {
        if (row.used_at) break
        if (row.expires_at <= now) return { status: 422, body: { ok: false, error: '验证码过期了，请重新发送。' } }
        used = row
        break
      }
    }
    if (!used) {
      await repo.limitSet(email, 'codefail', { n: (fails ? fails.n : 0) + 1, ts: now, until: 0 })
      return bad
    }
  } else {
    /* 旧流程：邮件里的重设链接（改版前发出去的链接 30 分钟内仍可用） */
    if (!/^[0-9a-f]{64}$/.test(token)) return { status: 422, body: { ok: false, error: '重置链接不对。' } }
    used = await repo.tokenGet('plain$' + await sha256hex(token))
    if (!used || used.kind !== 'reset' || used.used_at || used.expires_at <= now) {
      return { status: 422, body: { ok: false, error: '重置链接已失效，请重新发一封。' } }
    }
    user = await repo.userById(used.user_id)
    if (!user || user.banned) return { status: 422, body: { ok: false, error: '重置链接已失效，请重新发一封。' } } /* 停用的账号不给重设回来 */
  }
  await repo.tokenUse(used.token_hash)
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
  return { status: 200, body: { ok: true, admin: !!user.admin, plan: planOf(user) }, session: { uid: user.id, pwver: nextPwver } }
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
  if (!user || user.banned) return { status: 401, body: { ok: false, error: '先登录才能改密码。' } }
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
  return { status: 200, body: { ok: true, admin: !!user.admin, plan: planOf(user) }, session: { uid: user.id, pwver: nextPwver } }
}

/* ---- /api/auth/me：会话有效性 + pwver 比对 ---- */
export async function meBySession(repo, session) {
  if (!session) return { status: 401, body: { ok: false } }
  const user = await repo.userById(session.uid)
  if (!user || user.pwver !== session.pwver || user.banned) return { status: 401, body: { ok: false } }
  return { status: 200, body: { ok: true, email: user.email, verified: !!user.verified, admin: !!user.admin, plan: planOf(user) } }
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

/* 纸记录（扫码登记）只留 60 天。同步不传播删除，所以服务器拉取时删一次、本机同步前删一次（js/sync.js），
   两头规则一致：这里看行的 updated_at（最后一次打印 / 打分推上来的时间） */
const SHEET_PREFIX = 'sumsum:sheet:v1:'
const SHEET_KEEP_MS = 60 * 86400 * 1000

export async function dataPull(repo, userId, now) {
  now = now || Date.now()
  if (repo.dataDeletePrefixBefore) await repo.dataDeletePrefixBefore(userId, SHEET_PREFIX, now - SHEET_KEEP_MS)
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
