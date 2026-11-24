/* 邀请码：注册门槛 / 占用激活。node 直跑。管理端用例在文件后半（Task 2 会扩）。 */
'use strict'

var ok = 0, bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) }
  else { bad++; console.log('✗', name, extra === undefined ? '' : JSON.stringify(extra)) }
}

/* --- 内存 repo：D1 语义的最小镜像（对照 repo-d1.js 手写，不 import 它） --- */
function memRepo() {
  var users = [], invites = [], tokens = [], limits = {}
  return {
    users: users, _invites: invites, _tokens: tokens,
    /* 登录设备（sessions） */
    _sessions: [],
    async sessionGet(id) { return this._sessions.find(function (s) { return s.id === id }) || null },
    async sessionInsert(s) { this._sessions.push(Object.assign({ ended_at: null, ended_reason: null }, s)) },
    async sessionsAlive(uid, since) { return this._sessions.filter(function (s) { return s.uid === uid && !s.ended_at && s.created_at > since }) },
    async sessionEnd(id, now, reason) { var s = this._sessions.find(function (x) { return x.id === id && !x.ended_at }); if (s) { s.ended_at = now; s.ended_reason = reason } },
    async sessionsEndAll(uid, now, reason) { this._sessions.forEach(function (s) { if (s.uid === uid && !s.ended_at) { s.ended_at = now; s.ended_reason = reason } }) },
    async sessionTouch(id, now) { var s = this._sessions.find(function (x) { return x.id === id }); if (s) s.last_seen = now },
    async sessionsPrune(uid, endedBefore, createdBefore) {
      this._sessions = this._sessions.filter(function (s) { return !(s.uid === uid && ((s.ended_at && s.ended_at < endedBefore) || s.created_at < createdBefore)) })
      var ended = this._sessions.filter(function (s) { return s.uid === uid && s.ended_at }).sort(function (a, b) { return b.ended_at - a.ended_at })
      var drop = ended.slice(20)
      this._sessions = this._sessions.filter(function (s) { return drop.indexOf(s) < 0 })
    },
    async userByEmail(e) { return users.find(function (u) { return u.email === e }) || null },
    async userById(id) { return users.find(function (u) { return u.id === id }) || null },
    async insertUser(u) { users.push(u) },
    async updateUser(id, f) { Object.assign(users.find(function (u) { return u.id === id }), f) },
    async setVerified(id) { users.find(function (u) { return u.id === id }).verified = 1 },
    async tokenInsert(t) { tokens.push(t) },
    async tokenListByUser(uid, kind) { return tokens.filter(function (t) { return t.user_id === uid && t.kind === kind }) },
    async tokenGet(h) { return tokens.find(function (t) { return t.token_hash === h }) || null },
    async tokenUse(h) { tokens.find(function (t) { return t.token_hash === h }).used_at = 1 },
    async tokensClear(uid, kind) { tokens.forEach(function (t) { if (t.user_id === uid && t.kind === kind) t.used_at = 1 }) },
    async counterBump(scope, kind, windowStart, max) {
      var k = scope + '/' + kind, row = limits[k]
      if (!row || row.ts < windowStart) { limits[k] = { n: 1, ts: windowStart, until: 0 }; return true }
      if (row.n >= max) return false
      row.n++
      return true
    },
    async setPlan(id, plan, inviteId) {
      var u = users.find(function (x) { return x.id === id })
      u.plan = plan
      if (inviteId) u.invite_id = inviteId
    },
    async redeemInvite(inviteId, uid, now) {
      var v = invites.find(function (x) { return x.id === inviteId })
      var me = users.find(function (x) { return x.id === uid })
      if (!v || v.claimed_by || v.revoked_at || !me || me.plan !== 'free') return false
      v.claimed_by = uid; v.claimed_at = now; v.activated_at = now
      var u = users.find(function (x) { return x.id === uid })
      u.plan = 'full'; u.invite_id = inviteId
      return true
    },
    async purgeUnverified(before, now) {
      var gone = users.filter(function (u) { return !u.verified && !u.admin && u.created_at < before })
      gone.forEach(function (u) {
        invites.forEach(function (v) { if (v.claimed_by === u.id && !v.activated_at) { v.claimed_by = null; v.claimed_at = null } })
        users.splice(users.indexOf(u), 1)
      })
      return gone.length
    },
    async deleteUser(id) {
      var i = users.findIndex(function (u) { return u.id === id })
      if (i >= 0) users.splice(i, 1)
    },
    async limitGet(s, k) { return limits[s + '/' + k] || null },
    async limitSet(s, k, row) { limits[s + '/' + k] = row },
    async inviteInsert(v) { invites.push(v) },
    async inviteGetByCode(code) { return invites.find(function (v) { return v.code === code }) || null },
    async inviteGetById(id) { return invites.find(function (v) { return v.id === id }) || null },
    async inviteClaim(id, uid, now) {
      var v = invites.find(function (x) { return x.id === id })
      if (!v || v.claimed_by || v.revoked_at) return false
      v.claimed_by = uid; v.claimed_at = now
      return true
    },
    async inviteActivate(id, now) {
      var v = invites.find(function (x) { return x.id === id })
      if (v && !v.activated_at) v.activated_at = now
    },
    async inviteRevoke(id, now) {
      var v = invites.find(function (x) { return x.id === id })
      if (v && !v.revoked_at) v.revoked_at = now
    },
    async inviteSetNote(id, note) {
      var v = invites.find(function (x) { return x.id === id })
      if (v) v.note = note
    },
    async setBanned(id, flag) {
      var u = users.find(function (x) { return x.id === id })
      if (u) u.banned = flag
    },
    _sheetRows: [],
    async sheetRowsSince(since) {
      return this._sheetRows.filter(function (r) { return r.updated_at >= since })
    },
    async usersList() { return users.slice() },
    async invitesList() {
      return invites.map(function (v) {
        var u = users.find(function (x) { return x.id === v.claimed_by })
        var c = {}
        for (var k in v) c[k] = v[k]
        c.claimed_email = u ? u.email : null
        c.claimed_banned = u ? !!u.banned : false
        return c
      }).sort(function (a, b) { return b.created_at - a.created_at })
    }
  }
}

function seedInvite(db, code) {
  var v = { id: 'inv-' + code, code: code, note: '', created_at: 1, revoked_at: null, claimed_by: null, claimed_at: null, activated_at: null }
  db._invites.push(v)
  return v
}
var clientHash = function (email, pw) {
  return require('crypto').pbkdf2Sync(pw, email + 'lianxizhi-account-v1', 1000, 32, 'sha256').toString('hex')
}

Promise.all([import('../server/auth-core.js'), import('../server/admin-core.js')]).then(async function (mods) {
  var A = mods[0], AD = mods[1]
  var now = 1700000000000

  /* --- 注册门槛 --- */
  var db = memRepo()
  seedInvite(db, 'GOODCODE')
  var fr = await A.register(db, now, { email: 'free@b.co', password: clientHash('free@b.co', 'password123') })
  check('不填邀请码 → 免费注册，发验证码', fr.status === 200 && fr.mail, fr)
  check('不填邀请码 → 免费版、不占码', db.users[0].plan === 'free' && !db.users[0].invite_id && !db._invites[0].claimed_by)
  db.users.splice(0, 1)
  var wrong = await A.register(db, now, { email: 'a@b.co', password: clientHash('a@b.co', 'password123'), invite: 'NOPE1234' })
  check('错码 422 且不发邮件', wrong.status === 422 && !wrong.mail, wrong)
  var good = await A.register(db, now, { email: 'a@b.co', password: clientHash('a@b.co', 'password123'), invite: 'good-code ' })
  check('好码注册成功（小写/横线/空格规范化）', good.status === 200 && good.mail, good)
  check('码被占用 + 用户绑码', db._invites[0].claimed_by === db.users[0].id && db.users[0].invite_id === 'inv-GOODCODE')
  var again = await A.register(db, now + 61 * 1000, { email: 'a@b.co', password: clientHash('a@b.co', 'password123') })
  check('未验证重发不再要码不换码', again.status === 200 && db._invites.length === 1 && db._invites[0].claimed_by === db.users[0].id, again)
  check('一码第二邮箱 422', (await A.register(db, now + 62 * 1000, { email: 'x@y.co', password: clientHash('x@y.co', 'password123'), invite: 'GOODCODE' })).status === 422)

  /* --- 验证即激活 --- */
  await A.verify(db, now + 63 * 1000, { email: 'a@b.co', code: good.dev.code })
  check('验证即激活', db._invites[0].activated_at === now + 63 * 1000)

  /* --- 老账号（invite_id 为 null）verify 不炸 --- */
  var db2 = memRepo()
  seedInvite(db2, 'OLDTEST1')
  var reg2 = await A.register(db2, now, { email: 'old@m.co', password: clientHash('old@m.co', 'password123'), invite: 'OLDTEST1' })
  db2.users[0].invite_id = null /* 改造成老账号形态 */
  var lg = await A.login(db2, now + 61 * 1000, { email: 'old@m.co', password: clientHash('old@m.co', 'password123') })
  check('老账号未验证登录补码', lg.status === 200 && lg.body.need_verify, lg)
  check('老账号 verify 正常', (await A.verify(db2, now + 62 * 1000, { email: 'old@m.co', code: lg.dev.code })).status === 200)

  /* --- 作废 --- */
  var dbR = memRepo()
  var rv = seedInvite(dbR, 'REVOKED1')
  rv.revoked_at = 1
  check('已作废 422', (await A.register(dbR, now, { email: 'a@b.co', password: clientHash('a@b.co', 'password123'), invite: 'REVOKED1' })).status === 422)

  /* --- 错码 5 次锁 15 分钟 --- */
  var dbF = memRepo()
  seedInvite(dbF, 'FRESHONE')
  for (var i = 0; i < 5; i++) {
    await A.register(dbF, now + i, { email: 'f@m.co', password: clientHash('f@m.co', 'password123'), invite: 'WRONG00' + i })
  }
  check('错 5 次后好码也锁', (await A.register(dbF, now + 10, { email: 'f@m.co', password: clientHash('f@m.co', 'password123'), invite: 'FRESHONE' })).status === 429)
  check('15 分钟后好码能用', (await A.register(dbF, now + 15 * 60 * 1000 + 20, { email: 'f@m.co', password: clientHash('f@m.co', 'password123'), invite: 'FRESHONE' })).status === 200)

  /* --- 原子占码：第二个 claim 必须失败 --- */
  var dbC = memRepo()
  seedInvite(dbC, 'RACETEST')
  check('原子占码第二个失败', (await dbC.inviteClaim('inv-RACETEST', 'u-a', 1)) === true && (await dbC.inviteClaim('inv-RACETEST', 'u-b', 2)) === false)

  /* ===== 2026-11-24 放开注册：免费版 / 完整版 / 补填邀请码 / 防刷 ===== */
  var P = memRepo()
  seedInvite(P, 'PAYDAY01')
  seedInvite(P, 'PAYDAY02')
  var pw = function (e) { return clientHash(e, 'password123') }
  var t0 = now + 3 * 86400 * 1000
  var rf = await A.register(P, t0, { email: 'p@m.co', password: pw('p@m.co') }, { ip: '1.2.3.4' })
  var pu = P.users.find(function (u) { return u.email === 'p@m.co' })
  check('免费注册：plan=free', pu.plan === 'free')
  var sess = { uid: pu.id, pwver: pu.pwver }
  check('没验证邮箱不能补填邀请码', (await A.redeemInvite(P, sess, t0 + 1, { invite: 'PAYDAY01' })).status === 403)
  await A.verify(P, t0 + 2, { email: 'p@m.co', code: rf.dev.code })
  sess.sid = await A.openSession(P, pu.id, t0 + 2) /* 2026-11-24 起登录态要带设备记录 */
  var me = await A.meBySession(P, sess)
  check('me 带出 plan=free', me.body.plan === 'free', me.body)
  check('补填：没登录 401', (await A.redeemInvite(P, null, t0 + 3, { invite: 'PAYDAY01' })).status === 401)
  check('补填：空码 422', (await A.redeemInvite(P, sess, t0 + 3, { invite: '' })).status === 422)
  check('补填：错码 422 不升级', (await A.redeemInvite(P, sess, t0 + 4, { invite: 'NOPE0000' })).status === 422 && pu.plan === 'free')
  var rd = await A.redeemInvite(P, sess, t0 + 5, { invite: 'payday-01' })
  check('补填：好码 → 完整版', rd.status === 200 && rd.body.plan === 'full' && pu.plan === 'full', rd)
  var iv = P._invites.find(function (v) { return v.code === 'PAYDAY01' })
  check('补填：码被占用并标为已开通', iv.claimed_by === pu.id && iv.activated_at === t0 + 5 && pu.invite_id === iv.id)
  check('补填：已是完整版再填 → 直接 200，不再占码', (await A.redeemInvite(P, sess, t0 + 6, { invite: 'PAYDAY02' })).status === 200 &&
    !P._invites.find(function (v) { return v.code === 'PAYDAY02' }).claimed_by)
  check('me 带出 plan=full', (await A.meBySession(P, sess)).body.plan === 'full')
  check('老账号（没有 plan 字段）算完整版', A.planOf({ email: 'x' }) === 'full' && A.planOf({ plan: 'free' }) === 'free')

  /* 别人抢先用这个邮箱免费注册、没验证；真主人带邀请码来注册 → 照样开成完整版 */
  await A.register(P, t0 + 100, { email: 'v@m.co', password: pw('v@m.co') }, { ip: '9.9.9.9' })
  var rv2 = await A.register(P, t0 + 200 * 1000, { email: 'v@m.co', password: pw('v@m.co'), invite: 'PAYDAY02' }, { ip: '8.8.8.8' })
  var vu = P.users.find(function (u) { return u.email === 'v@m.co' })
  check('抢注的邮箱：主人带码注册 → 完整版、占码', rv2.status === 200 && vu.plan === 'full' && vu.invite_id === 'inv-PAYDAY02', rv2)
  check('补填用过的码：别人再填 → 422', (await A.redeemInvite(P, { uid: vu.id, pwver: vu.pwver }, t0 + 1e6, { invite: 'PAYDAY01' })).status !== 200)

  /* 48 小时没验证 → 下次有人注册时清掉，占着的码放回 */
  var Q = memRepo()
  seedInvite(Q, 'STALE001')
  await A.register(Q, t0, { email: 's@m.co', password: pw('s@m.co'), invite: 'STALE001' })
  await A.register(Q, t0 + 49 * 3600 * 1000, { email: 'n@m.co', password: pw('n@m.co') })
  check('48 小时没验证的账号被清掉、码放回', !Q.users.find(function (u) { return u.email === 's@m.co' }) && !Q._invites[0].claimed_by)

  /* 按地址限流：同一地址一小时 10 封 */
  var R = memRepo()
  var codes = []
  for (var k = 0; k < 11; k++) {
    codes.push((await A.register(R, t0 + k, { email: 'ip' + k + '@m.co', password: pw('ip' + k + '@m.co') }, { ip: '5.6.7.8' })).status)
  }
  check('同一地址一小时第 11 次注册 → 429', codes.slice(0, 10).every(function (c) { return c === 200 }) && codes[10] === 429, codes)
  check('换个地址照常', (await A.register(R, t0 + 20, { email: 'other@m.co', password: pw('other@m.co') }, { ip: '5.6.7.9' })).status === 200)
  check('IPv6 以 :: 开头的地址不全挤进同一组', A.ipScope('::1') !== A.ipScope('::2:0:0:0:1') && A.ipScope('::ffff:1.2.3.4') === 'ip6:0:0:0:0')
  var E = memRepo()
  var ev = await A.register(E, t0, { email: 'enum@m.co', password: pw('enum@m.co') })
  await A.verify(E, t0 + 1, { email: 'enum@m.co', code: ev.dev.code })
  var bad1 = await A.register(E, t0 + 120000, { email: 'enum@m.co', password: pw('enum@m.co'), invite: 'ZZZZZZZZ' })
  var bad2 = await A.register(E, t0 + 120000, { email: 'nobody@m.co', password: pw('nobody@m.co'), invite: 'ZZZZZZZZ' })
  check('错邀请码：注册过和没注册过的邮箱回一样的结果', bad1.status === bad2.status && bad1.body.error === bad2.body.error && bad1.status === 422, [bad1, bad2])
  var g1 = await A.register(E, t0 + 120001, { email: 'enum@m.co', password: pw('enum@m.co') })
  var g2 = await A.register(E, t0 + 120002, { email: 'enum@m.co', password: pw('enum@m.co') })
  check('已注册邮箱连着注册：同样回「发送太频繁」（跟新邮箱一样）', g1.status === 200 && g2.status === 429, [g1.status, g2.status])
  check('IPv6 同一 /64 算一个地址', A.ipScope('2408:8a00:1:2:aaaa::1') === A.ipScope('2408:8a00:1:2:bbbb::9') && A.ipScope('2408:8a00:1:3::1') !== A.ipScope('2408:8a00:1:2::1'))

  /* 全站每天的新注册额度用完：没码的挡住，带码的、找回密码的照常 */
  var S = memRepo()
  seedInvite(S, 'CAPCODE1')
  var day0 = t0 - (t0 % 86400000)
  S._limits = null
  await S.counterBump('all', 'mailnew', day0, 1e9)
  for (var m = 1; m < A.MAIL_DAY_NEW; m++) await S.counterBump('all', 'mailnew', day0, 1e9)
  var capped = await A.register(S, t0, { email: 'cap@m.co', password: pw('cap@m.co') })
  var F = memRepo()
  var fu = await A.register(F, t0, { email: 'old@m.co', password: pw('old@m.co') })
  await A.verify(F, t0 + 1, { email: 'old@m.co', code: fu.dev.code })
  for (var q = 0; q < A.MAIL_DAY_OLD; q++) await F.counterBump('all', 'mailold', day0, 1e9)
  check('找回密码的额度用完，不影响新用户注册', (await A.register(F, t0 + 5, { email: 'brand@m.co', password: pw('brand@m.co') })).status === 200)
  check('新注册额度用完 → 429「今天注册的人太多了」', capped.status === 429 && /太多/.test(capped.body.error), capped)
  check('带邀请码的注册不占新注册额度', (await A.register(S, t0, { email: 'cap2@m.co', password: pw('cap2@m.co'), invite: 'CAPCODE1' })).status === 200)
  var next = await A.register(S, t0 + 86400000, { email: 'cap3@m.co', password: pw('cap3@m.co') })
  check('第二天额度恢复', next.status === 200, next)

  /* 删除账号 */
  var D = memRepo()
  var rdel = await A.register(D, t0, { email: 'd@m.co', password: pw('d@m.co') })
  await A.verify(D, t0 + 1, { email: 'd@m.co', code: rdel.dev.code })
  var du = D.users[0]
  var dsess = { uid: du.id, pwver: du.pwver }
  check('删除账号：密码不对 422', (await A.deleteAccount(D, dsess, t0 + 2, { password: clientHash('d@m.co', 'wrongpass1') })).status === 422 && D.users.length === 1)
  var del = await A.deleteAccount(D, dsess, t0 + 3, { password: pw('d@m.co') })
  check('删除账号：密码对 → 删掉并清登录', del.status === 200 && del.clearSession && D.users.length === 0, del)

  /* ===== 管理端：账号统计与手动改版本 ===== */
  var U = memRepo()
  U.users.push({ id: 'adm', email: 'adm@x.co', admin: 1, verified: 1, plan: 'full', pwver: 1, created_at: now })
  U.users.push({ id: 'f1', email: 'f1@x.co', verified: 1, plan: 'free', pwver: 1, created_at: now })
  U.users.push({ id: 'f2', email: 'f2@x.co', verified: 0, plan: 'free', pwver: 1, created_at: now })
  var adm = { uid: 'adm', pwver: 1 }
  check('账号列表：非管理员 403', (await AD.listUsers(U, { uid: 'f1', pwver: 1 }, now)).status === 403)
  var lu = await AD.listUsers(U, adm, now)
  check('账号统计：已验证 2、完整版 1、免费版 1、未验证 1', lu.body.stats.total === 2 && lu.body.stats.full === 1 && lu.body.stats.free === 1 && lu.body.stats.unverified === 1, lu.body.stats)
  check('管理员手动开通完整版', (await AD.setUserPlan(U, adm, now, { id: 'f1', plan: 'full' })).status === 200 && U.users[1].plan === 'full')
  check('非管理员不能改版本', (await AD.setUserPlan(U, { uid: 'f1', pwver: 1 }, now, { id: 'f1', plan: 'free' })).status === 403)
  check('版本只认 free / full', (await AD.setUserPlan(U, adm, now, { id: 'f1', plan: 'vip' })).status === 422)

  /* ===== 管理端 ===== */
  var dbA = memRepo()
  dbA.users.push({ id: 'boss', email: 'boss@m.co', pw_hash: 'x', pw_salt: 's', pwver: 1, verified: 1, admin: 1 })
  dbA.users.push({ id: 'pleb', email: 'pleb@m.co', pw_hash: 'x', pw_salt: 's', pwver: 1, verified: 1, admin: 0 })
  check('管理端未登录 401', (await AD.listInvites(dbA, null)).status === 401)
  check('管理端非管理员 403', (await AD.listInvites(dbA, { uid: 'pleb' })).status === 403)

  var mk = await AD.createInvites(dbA, { uid: 'boss' }, now, { note: '张三家长', count: 3 })
  check('批量生成 3 张', mk.status === 200 && mk.body.invites.length === 3, mk)
  check('码格式 8 位限定字母表（无 I/L/O/0/1）', mk.body.invites.every(function (v) { return /^[A-HJKMNP-Z2-9]{8}$/.test(v.code) }), mk.body.invites)
  check('备注落库', dbA._invites.slice(-3).every(function (v) { return v.note === '张三家长' }))
  check('count 钳到 20', (await AD.createInvites(dbA, { uid: 'boss' }, now, { note: 'x', count: 99 })).body.invites.length === 20)

  var regA = await A.register(dbA, now, { email: 'z@san.co', password: clientHash('z@san.co', 'password123'), invite: dbA._invites[0].code })
  await A.verify(dbA, now + 1, { email: 'z@san.co', code: regA.dev.code })
  var ls2 = await AD.listInvites(dbA, { uid: 'boss' })
  var used = ls2.body.invites.find(function (v) { return v.claimed_email === 'z@san.co' })
  check('激活后状态+邮箱带出', used && used.state === 'activated', ls2.body.invites)

  /* 近 7 天登记了几张纸：数纸记录里打分 / 登记时间在 7 天内的（扫码登记，见 js/sheets-core.js） */
  var zUid = used.claimed_by || dbA.users.find(function (u) { return u.email === 'z@san.co' }).id
  var D7 = 7 * 86400000
  dbA._sheetRows.push(
    { user_id: zUid, updated_at: now, value: JSON.stringify({ id: 'a', rating: { all: { level: 'good', at: now - 1000 } } }) },
    { user_id: zUid, updated_at: now, value: JSON.stringify({ id: 'b', done: true, doneAt: now - 2000 }) },
    { user_id: zUid, updated_at: now, value: JSON.stringify({ id: 'c', rating: null }) },
    { user_id: zUid, updated_at: now, value: JSON.stringify({ id: 'd', rating: { all: { level: 'ok', at: now - D7 - 1 } } }) },
    { user_id: zUid, updated_at: now, value: '坏了' }
  )
  var ls3 = await AD.listInvites(dbA, { uid: 'boss' }, now)
  var z3 = ls3.body.invites.find(function (v) { return v.claimed_email === 'z@san.co' })
  check('近 7 天登记张数', z3 && z3.marked7d === 2, z3)
  check('没用的码登记数为 0', ls3.body.invites.filter(function (v) { return v.claimed_email !== 'z@san.co' }).every(function (v) { return v.marked7d === 0 }))

  /* 桩行是原始字段（无 state——state 由 admin-core 的 fmt 算），挑没用过的码用原始字段判 */
  var otherId = dbA._invites.find(function (v) { return !v.revoked_at && !v.activated_at && !v.claimed_by }).id
  check('作废成功', (await AD.revokeInvite(dbA, { uid: 'boss' }, now + 2, { id: otherId })).status === 200)
  check('作废后该码注册被拒', (await A.register(dbA, now + 3, { email: 'w@u.co', password: clientHash('w@u.co', 'password123'), invite: dbA._invites.find(function (v) { return v.id === otherId }).code })).status === 422)
  check('作废不存在的码 404', (await AD.revokeInvite(dbA, { uid: 'boss' }, now + 4, { id: 'ghost' })).status === 404)

  /* --- admin 标记贯通：me / login 的 200 body 都要带 --- */
  var meBoss = await A.meBySession(dbA, { uid: 'boss', pwver: 1, sid: await A.openSession(dbA, 'boss', now) })
  check('me 带 admin 标记（管理员）', meBoss.status === 200 && meBoss.body.admin === true, meBoss.body)
  var lgZ = await A.login(dbA, now + 5, { email: 'z@san.co', password: clientHash('z@san.co', 'password123') })
  check('login 带 admin 标记（普通用户为 false）', lgZ.status === 200 && lgZ.body.admin === false, lgZ.body)

  /* ===== 停用账号 + 改备注（2026-11-20 冒烟后追加） ===== */
  var dbB = memRepo()
  dbB.users.push({ id: 'boss', email: 'boss@m.co', pw_hash: 'x', pw_salt: 's', pwver: 1, verified: 1, admin: 1 })
  await AD.createInvites(dbB, { uid: 'boss' }, now, { note: '旧备注', count: 2 })
  var banId = dbB._invites[0].id
  var regB = await A.register(dbB, now, { email: 'ban@me.co', password: clientHash('ban@me.co', 'password123'), invite: dbB._invites[0].code })
  var banUid = dbB.users.find(function (u) { return u.email === 'ban@me.co' }).id

  check('停用已占用码的账号', (await AD.setBan(dbB, { uid: 'boss' }, now + 1, { id: banId, banned: true })).status === 200)
  check('停用后登录 403', (await A.login(dbB, now + 2, { email: 'ban@me.co', password: clientHash('ban@me.co', 'password123') })).status === 403)
  var banReg = await A.register(dbB, now + 3, { email: 'ban@me.co', password: clientHash('ban@me.co', 'password123') })
  check('停用后再注册：不发验证码、不发信（回的结果跟别的邮箱一样，不暴露停用）', !banReg.dev && !banReg.mail && banReg.status !== 403, banReg)
  check('停用后验证码 403', (await A.verify(dbB, now + 4, { email: 'ban@me.co', code: regB.dev.code })).status === 403)
  var fB = await A.forgot(dbB, now + 5, { email: 'ban@me.co' })
  check('停用后 forgot 静默 200 不发信', fB.status === 200 && !fB.mail, fB)
  check('停用后 me 401', (await A.meBySession(dbB, { uid: banUid, pwver: 1 })).status === 401)
  check('停用后改密码 401', (await A.changePassword(dbB, { uid: banUid, pwver: 1 }, now + 6, { old: clientHash('ban@me.co', 'password123'), new: clientHash('ban@me.co', 'password456') })).status === 401)
  check('停用状态进列表', (await AD.listInvites(dbB, { uid: 'boss' })).body.invites.find(function (v) { return v.id === banId }).claimed_banned === true)

  /* 后续节奏避开 60 秒发信闸：注册那封在 now，登录补码要 ≥61s，forgot 再 ≥61s */
  check('解除停用', (await AD.setBan(dbB, { uid: 'boss' }, now + 60 * 1000, { id: banId, banned: false })).status === 200)
  var lgB = await A.login(dbB, now + 61 * 1000, { email: 'ban@me.co', password: clientHash('ban@me.co', 'password123') })
  check('解除后能登录（未验证补码）', lgB.status === 200 && lgB.body.need_verify && !!lgB.dev, lgB)
  check('解除后验证激活', (await A.verify(dbB, now + 62 * 1000, { email: 'ban@me.co', code: lgB.dev.code })).status === 200)
  var fB2 = await A.forgot(dbB, now + 122 * 1000, { email: 'ban@me.co' })
  check('激活后 forgot 正常发信', fB2.status === 200 && !!fB2.mail, fB2)
  check('再次停用（已激活）', (await AD.setBan(dbB, { uid: 'boss' }, now + 123 * 1000, { id: banId, banned: true })).status === 200)
  check('停用后重设链接作废 422', (await A.reset(dbB, now + 124 * 1000, { token: fB2.dev.token, password: clientHash('ban@me.co', 'password456') })).status === 422)
  check('停用后已激活登录也 403', (await A.login(dbB, now + 125 * 1000, { email: 'ban@me.co', password: clientHash('ban@me.co', 'password123') })).status === 403)
  check('再次解除直接登录', (await AD.setBan(dbB, { uid: 'boss' }, now + 126 * 1000, { id: banId, banned: false })).status === 200 &&
    (await A.login(dbB, now + 127 * 1000, { email: 'ban@me.co', password: clientHash('ban@me.co', 'password123') })).status === 200)

  check('没被占用的码停用 422', (await AD.setBan(dbB, { uid: 'boss' }, now + 128 * 1000, { id: dbB._invites[1].id, banned: true })).status === 422)
  check('改备注', (await AD.setNote(dbB, { uid: 'boss' }, now + 129 * 1000, { id: dbB._invites[1].id, note: '新备注' })).status === 200 && dbB._invites[1].note === '新备注')
  var longNote = ''
  for (var i = 0; i < 150; i++) longNote += '字'
  check('备注超长截到 100', (await AD.setNote(dbB, { uid: 'boss' }, now + 130 * 1000, { id: dbB._invites[1].id, note: longNote })).status === 200 && dbB._invites[1].note.length === 100)
  check('改不存在的码备注 404', (await AD.setNote(dbB, { uid: 'boss' }, now + 131 * 1000, { id: 'ghost', note: 'x' })).status === 404)
  check('停用不存在的码 404', (await AD.setBan(dbB, { uid: 'boss' }, now + 132 * 1000, { id: 'ghost', banned: true })).status === 404)

  console.log(bad ? '---- 有 ' + bad + ' 条没过' : '✓ invite 注册侧全部通过')
  process.exit(bad ? 1 : 0)
}).catch(function (e) { console.error(e); process.exit(1) })
