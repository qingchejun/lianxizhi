/**
 * 邀请码管理端：纯逻辑 + 传入 repo，不碰 fetch/Response。
 * functions/api/admin/* 只做 HTTP 翻译；可测部分 node 直跑（tools/check-invite-core.js）。
 * 门槛 = requireSession 之后再查 users.admin（页面挡体验，这里挡安全）。
 */

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' /* 31 字符：去 I/L/O/0/1 */

function genCode() {
  const b = new Uint8Array(8)
  crypto.getRandomValues(b)
  return [...b].map(x => CODE_ALPHABET[x % CODE_ALPHABET.length]).join('')
}

async function requireAdmin(repo, session) {
  if (!session) return { status: 401, body: { ok: false, error: '先登录。' } }
  const user = await repo.userById(session.uid)
  if (!user || !user.admin) return { status: 403, body: { ok: false, error: '无权访问。' } }
  return null
}

function fmt(v) {
  return {
    id: v.id, code: v.code, note: v.note,
    state: v.revoked_at ? 'revoked' : v.activated_at ? 'activated' : v.claimed_by ? 'claimed' : 'unused',
    created_at: v.created_at, revoked_at: v.revoked_at || null,
    claimed_at: v.claimed_at || null, claimed_email: v.claimed_email || null,
    claimed_banned: !!v.claimed_banned,
    activated_at: v.activated_at || null
  }
}

/* 每个账号近 7 天登记了几张纸（扫码登记的纸记录 sumsum:sheet:v1:*，打分或登记时间在 7 天内）。
   路线图里的「熟人家庭坚持度」就看这一列 */
const WEEK_MS = 7 * 86400 * 1000
async function markedByUser(repo, now) {
  const out = {}
  if (!repo.sheetRowsSince) return out
  const since = now - WEEK_MS
  for (const row of await repo.sheetRowsSince(since)) {
    let rec
    try { rec = JSON.parse(row.value) } catch (e) { continue }
    if (!rec || typeof rec !== 'object') continue
    let t = Number(rec.doneAt) || 0
    if (rec.rating && typeof rec.rating === 'object') {
      for (const k of Object.keys(rec.rating)) {
        const at = Number(rec.rating[k] && rec.rating[k].at) || 0
        if (at > t) t = at
      }
    }
    if (t >= since) out[row.user_id] = (out[row.user_id] || 0) + 1
  }
  return out
}

export async function listInvites(repo, session, now) {
  const gate = await requireAdmin(repo, session)
  if (gate) return gate
  const marked = await markedByUser(repo, now || Date.now())
  const invites = (await repo.invitesList()).map(function (v) {
    return Object.assign(fmt(v), { marked7d: (v.claimed_by && marked[v.claimed_by]) || 0 })
  })
  return { status: 200, body: { ok: true, invites: invites } }
}

export async function createInvites(repo, session, now, body) {
  const gate = await requireAdmin(repo, session)
  if (gate) return gate
  const note = String((body && body.note) || '').slice(0, 100)
  const count = Math.max(1, Math.min(20, parseInt(body && body.count, 10) || 1))
  const made = []
  for (let i = 0; i < count; i++) {
    for (let t = 0; t < 10; t++) { /* UNIQUE 撞了就重生成（31^8 空间，防御性） */
      const code = genCode()
      if (await repo.inviteGetByCode(code)) continue
      const v = { id: crypto.randomUUID(), code: code, note: note, created_at: now }
      await repo.inviteInsert(v)
      made.push(v)
      break
    }
  }
  return { status: 200, body: { ok: true, invites: made.map(fmt) } }
}

export async function revokeInvite(repo, session, now, body) {
  const gate = await requireAdmin(repo, session)
  if (gate) return gate
  const id = (body && body.id) || ''
  if (!id) return { status: 422, body: { ok: false, error: '缺少邀请码 id。' } }
  const inv = await repo.inviteGetById(id)
  if (!inv) return { status: 404, body: { ok: false, error: '没有这张码。' } }
  await repo.inviteRevoke(id, now)
  return { status: 200, body: { ok: true } }
}

export async function setNote(repo, session, now, body) {
  const gate = await requireAdmin(repo, session)
  if (gate) return gate
  const id = (body && body.id) || ''
  const note = String((body && body.note) || '').slice(0, 100)
  if (!id) return { status: 422, body: { ok: false, error: '缺少邀请码 id。' } }
  const inv = await repo.inviteGetById(id)
  if (!inv) return { status: 404, body: { ok: false, error: '没有这张码。' } }
  await repo.inviteSetNote(id, note)
  return { status: 200, body: { ok: true } }
}

/* 停用/恢复的是「这张码换来的账号」，不是码本身；登录/验证/重设/登录态全被 auth-core 的 banned 门槛挡住 */
export async function setBan(repo, session, now, body) {
  const gate = await requireAdmin(repo, session)
  if (gate) return gate
  const id = (body && body.id) || ''
  if (!id) return { status: 422, body: { ok: false, error: '缺少邀请码 id。' } }
  const inv = await repo.inviteGetById(id)
  if (!inv) return { status: 404, body: { ok: false, error: '没有这张码。' } }
  if (!inv.claimed_by) return { status: 422, body: { ok: false, error: '这张码还没人用，没有账号可停。' } }
  await repo.setBanned(inv.claimed_by, body && body.banned ? 1 : 0)
  return { status: 200, body: { ok: true } }
}

/* ---- 账号（2026-11-24 放开注册）：统计 + 列表 + 手动设免费版 / 完整版 ---- */
const DAY_MS = 86400 * 1000
export async function listUsers(repo, session, now) {
  const gate = await requireAdmin(repo, session)
  if (gate) return gate
  now = now || Date.now()
  const rows = await repo.usersList()
  const users = rows.map(function (u) {
    return {
      id: u.id, email: u.email, plan: u.plan === 'free' ? 'free' : 'full',
      verified: !!u.verified, banned: !!u.banned, admin: !!u.admin,
      invited: !!u.invite_id, created_at: u.created_at
    }
  })
  const ok = users.filter(function (u) { return u.verified })
  const stats = {
    total: ok.length,
    free: ok.filter(function (u) { return u.plan === 'free' }).length,
    full: ok.filter(function (u) { return u.plan === 'full' }).length,
    new1d: ok.filter(function (u) { return u.created_at >= now - DAY_MS }).length,
    new7d: ok.filter(function (u) { return u.created_at >= now - 7 * DAY_MS }).length,
    unverified: users.length - ok.length
  }
  return { status: 200, body: { ok: true, stats: stats, users: users } }
}

export async function setUserPlan(repo, session, now, body) {
  const gate = await requireAdmin(repo, session)
  if (gate) return gate
  const id = (body && body.id) || ''
  const plan = body && body.plan === 'free' ? 'free' : body && body.plan === 'full' ? 'full' : ''
  if (!id || !plan) return { status: 422, body: { ok: false, error: '缺少账号或版本。' } }
  const user = await repo.userById(id)
  if (!user) return { status: 404, body: { ok: false, error: '没有这个账号。' } }
  await repo.setPlan(id, plan)
  return { status: 200, body: { ok: true } }
}
