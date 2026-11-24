/* 鉴权核心（auth-core）：注册 / 验证码生命周期 / 邮件限流。node 直跑。 */
'use strict'

var ok = 0, bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) }
  else { bad++; console.log('✗', name, extra === undefined ? '' : JSON.stringify(extra)) }
}

/* --- 内存 repo：D1 语义的最小镜像 --- */
function memRepo() {
  var users = [], tokens = [], limits = {}, invites = []
  var dbData = new Map()
  return {
    users: users,
    _tokens: tokens,
    async dataRows(uid) {
      var out = []
      dbData.forEach(function (v, k) {
        if (k.indexOf(uid + '/') === 0) out.push({ key: k.slice(uid.length + 1), value: v.value, updated_at: v.updated_at })
      })
      return out
    },
    async dataUpsert(uid, key, value, updated_at) {
      var k = uid + '/' + key
      var cur = dbData.get(k)
      if (cur && cur.updated_at >= updated_at) return false
      dbData.set(k, { value: value, updated_at: updated_at })
      return true
    },
    async dataDeletePrefixBefore(uid, prefix, before) {
      var n = 0
      dbData.forEach(function (v, k) {
        if (k.indexOf(uid + '/' + prefix) === 0 && v.updated_at < before) { dbData.delete(k); n++ }
      })
      return n
    },
    async dataBytes(uid) {
      var n = 0
      dbData.forEach(function (v, k) { if (k.indexOf(uid + '/') === 0) n += v.value.length })
      return n
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
    async limitGet(s, k) { return limits[s + '/' + k] || null },
    async limitSet(s, k, row) { limits[s + '/' + k] = row },
    _invites: invites,
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
    async invitesList() {
      return invites.map(function (v) {
        var u = users.find(function (x) { return x.id === v.claimed_by })
        var c = {}
        for (var k in v) c[k] = v[k]
        c.claimed_email = u ? u.email : null
        return c
      }).sort(function (a, b) { return b.created_at - a.created_at })
    }
  }
}

function clientHash(email, pw) {
  /* 与浏览器 account.js 同派生（node:crypto 独立实现，互为对照） */
  var c = require('crypto')
  return c.pbkdf2Sync(pw, email + 'lianxizhi-account-v1', 1000, 32, 'sha256').toString('hex')
  /* 迭代次数无所谓——服务端只看是不是 64 位 hex */
}

/* 邀请码门槛上线后，"新邮箱首次注册"的用例要先埋一张可用码（check-invite-core.js 另有全量用例） */
function seedInvite(db, code) {
  var v = { id: 'inv-' + code, code: code, note: '', created_at: 1, revoked_at: null, claimed_by: null, claimed_at: null, activated_at: null }
  db._invites.push(v)
  return v
}

import('../server/auth-core.js').then(async function (A) {
  var now = 1700000000000

  /* --- 注册 --- */
  var db = memRepo()
  var bad1 = await A.register(db, now, { email: 'not-an-email', password: clientHash('a@b.co', 'password123') })
  check('坏邮箱 422', bad1.status === 422)
  var bad2 = await A.register(db, now, { email: 'a@b.co', password: 'short' })
  check('密码不是 64hex 422', bad2.status === 422)

  seedInvite(db, 'TAAAAA1')
  var r = await A.register(db, now, { email: 'A@B.CO ', password: clientHash('a@b.co', 'password123'), invite: 'TAAAAA1' })
  check('注册成功并发码', r.status === 200 && r.mail && /^\d{6}$/.test(r.dev.code), r)
  check('邮箱归一成小写', db.users[0].email === 'a@b.co')
  check('新号未验证', db.users[0].verified === 0)
  check('验证码入库是 hash 不是明文', db._tokens[0].token_hash.indexOf(r.dev.code) < 0)
  check('验证码 10 分钟有效', db._tokens[0].expires_at === now + 10 * 60 * 1000)

  /* --- 未验证重复注册：换密码重发，不 409（裁定 5） --- */
  var r2 = await A.register(db, now + 61 * 1000, { email: 'a@b.co', password: clientHash('a@b.co', 'password456') })
  check('未验证重复注册 → 重发', r2.status === 200 && r2.dev.code !== r.dev.code)

  /* --- 验证 --- */
  var v = await A.verify(db, now + 62 * 1000, { email: 'a@b.co', code: r.dev.code })
  check('旧验证码（未过期未用）仍可用', v.status === 200 && v.session && v.session.uid === db.users[0].id, v)
  check('验证后 verified=1', db.users[0].verified === 1)

  var v2 = await A.verify(db, now + 63 * 1000, { email: 'a@b.co', code: r.dev.code })
  check('用过的码再交 → 失败', v2.status === 422)

  /* 已验证的邮箱再注册 → 409 */
  var r3 = await A.register(db, now + 130 * 1000, { email: 'a@b.co', password: clientHash('a@b.co', 'x') })
  check('已验证重复注册 → 409', r3.status === 409)

  /* --- 错 5 次作废 --- */
  var db2 = memRepo()
  seedInvite(db2, 'TBBBBB2')
  var reg = await A.register(db2, now, { email: 'c@d.co', password: clientHash('c@d.co', 'password123'), invite: 'TBBBBB2' })
  var rightCode = reg.dev.code
  for (var i = 0; i < 5; i++) {
    await A.verify(db2, now + 1000 + i, { email: 'c@d.co', code: '000000' })
  }
  var vf = await A.verify(db2, now + 2000, { email: 'c@d.co', code: rightCode })
  check('5 次错后正确码也进不去', vf.status === 429, vf)
  check('作废后 token 全标已用', db2._tokens.every(function (t) { return t.used_at }))

  /* --- 邮件限流：60 秒间隔 + 每小时 3 封 --- */
  var db3 = memRepo()
  seedInvite(db3, 'TCCCCC3')
  await A.register(db3, now, { email: 'e@f.co', password: clientHash('e@f.co', 'password123'), invite: 'TCCCCC3' })
  var again = await A.register(db3, now + 30 * 1000, { email: 'e@f.co', password: clientHash('e@f.co', 'password123') })
  check('60 秒内重发 → 429', again.status === 429, again)
  await A.register(db3, now + 61 * 1000, { email: 'e@f.co', password: clientHash('e@f.co', 'password123') })
  await A.register(db3, now + 121 * 1000, { email: 'e@f.co', password: clientHash('e@f.co', 'password123') })
  var fourth = await A.register(db3, now + 181 * 1000, { email: 'e@f.co', password: clientHash('e@f.co', 'password123') })
  check('一小时内第 4 封 → 429', fourth.status === 429, fourth)

  /* --- 邮件是中文纯文本且不含营销话术（spec） --- */
  check('邮件文案到位', /验证码/.test(reg.mail.text) && reg.mail.subject.indexOf('纸和笔') === 0)

  /* ===== Task 6：登录 / 锁定 / 找回 / 重设 / data ===== */
  var MIN = 60 * 1000

  /* --- 登录 --- */
  var dbL = memRepo()
  seedInvite(dbL, 'TDDDD4')
  var regL = await A.register(dbL, now, { email: 'l@m.co', password: clientHash('l@m.co', 'password123'), invite: 'TDDDD4' })
  await A.verify(dbL, now + 1000, { email: 'l@m.co', code: regL.dev.code })

  var good = await A.login(dbL, now + 2000, { email: 'L@M.CO', password: clientHash('l@m.co', 'password123') })
  check('登录成功给 session', good.status === 200 && good.session && good.session.uid === dbL.users[0].id, good)

  var wrongPw = await A.login(dbL, now + 3000, { email: 'l@m.co', password: clientHash('l@m.co', 'password999') })
  var noUser = await A.login(dbL, now + 3000, { email: 'ghost@m.co', password: clientHash('ghost@m.co', 'password999') })
  check('错密码与不存在邮箱同文案同状态（防探测）',
    wrongPw.status === noUser.status && wrongPw.body.error === noUser.body.error &&
    wrongPw.body.error === '邮箱或密码不对。', [wrongPw, noUser])

  /* --- 锁定：10 次锁 15 分钟 --- */
  var dbK = memRepo()
  seedInvite(dbK, 'TEEEE5')
  var regK = await A.register(dbK, now, { email: 'k@m.co', password: clientHash('k@m.co', 'password123'), invite: 'TEEEE5' })
  await A.verify(dbK, now + 1000, { email: 'k@m.co', code: regK.dev.code })
  for (var j = 0; j < 10; j++) {
    await A.login(dbK, now + 2000 + j, { email: 'k@m.co', password: clientHash('k@m.co', 'wrongpw' + j) })
  }
  var locked = await A.login(dbK, now + 3000, { email: 'k@m.co', password: clientHash('k@m.co', 'password123') })
  check('锁内正确密码也 429', locked.status === 429, locked)
  var after = await A.login(dbK, now + 16 * MIN, { email: 'k@m.co', password: clientHash('k@m.co', 'password123') })
  check('15 分钟后能登', after.status === 200, after)

  /* --- 未验证登录 → 补发验证码 --- */
  var dbV = memRepo()
  seedInvite(dbV, 'TFFFF6')
  await A.register(dbV, now, { email: 'v@m.co', password: clientHash('v@m.co', 'password123'), invite: 'TFFFF6' })
  var nv = await A.login(dbV, now + 61 * 1000, { email: 'v@m.co', password: clientHash('v@m.co', 'password123') })
  check('未验证 → need_verify + 发码', nv.status === 200 && nv.body.need_verify === true && nv.mail, nv)

  /* --- 找回：恒 200 不泄露 --- */
  var dbF = memRepo()
  seedInvite(dbF, 'TGGGG7')
  var regF = await A.register(dbF, now, { email: 'f@m.co', password: clientHash('f@m.co', 'password123'), invite: 'TGGGG7' })
  await A.verify(dbF, now + 1000, { email: 'f@m.co', code: regF.dev.code })
  var ghost = await A.forgot(dbF, now + 2000, { email: 'ghost@m.co' })
  check('不存在的邮箱 forgot 也 200 且不发信', ghost.status === 200 && ghost.body.ok === true && !ghost.mail)
  var real = await A.forgot(dbF, now + 65 * 1000, { email: 'f@m.co' })
  check('存在的邮箱发重设验证码', real.status === 200 && real.mail && /^\d{6}$/.test(real.dev.code), real)
  check('重设信里有验证码、没有链接', real.mail.text.indexOf(real.dev.code) >= 0 && real.mail.text.indexOf('http') < 0)
  check('重设验证码不能拿去验证注册', (await A.verify(dbF, now + 66 * 1000, { email: 'f@m.co', code: real.dev.code })).status === 422)

  /* --- 重设：错太多次时，注册过和没注册的邮箱回一样的话（不能拿来试探邮箱是否注册） --- */
  async function sixWrong(db, email) {
    var last
    for (var i = 0; i < 6; i++) last = await A.reset(db, now + 2100 + i, { email: email, code: '000000', password: clientHash(email, 'whatever99') })
    return last
  }
  var dbE = memRepo()
  seedInvite(dbE, 'TEEEE5')
  var regE = await A.register(dbE, now, { email: 'e@m.co', password: clientHash('e@m.co', 'password123'), invite: 'TEEEE5' })
  await A.verify(dbE, now + 1000, { email: 'e@m.co', code: regE.dev.code })
  check('（准备）e@m.co 已注册', !!(await dbE.userByEmail('e@m.co')))
  await A.forgot(dbE, now + 65 * 1000, { email: 'e@m.co' })
  var exist6 = await sixWrong(dbE, 'e@m.co')
  var ghost6 = await sixWrong(dbE, 'nobody@m.co')
  var dbE2 = memRepo()
  seedInvite(dbE2, 'TEEEE6')
  await A.register(dbE2, now, { email: 'e2@m.co', password: clientHash('e2@m.co', 'password123'), invite: 'TEEEE6' })
  var v6a, v6b
  for (var vi = 0; vi < 6; vi++) {
    v6a = await A.verify(dbE2, now + 100 + vi, { email: 'e2@m.co', code: '000000' })
    v6b = await A.verify(dbE2, now + 100 + vi, { email: 'nobody2@m.co', code: '000000' })
  }
  check('注册验证第 6 次错码：注册过和没注册的邮箱回应一样', v6a.status === v6b.status && v6a.body.error === v6b.body.error, [v6a.status, v6b.status])
  check('第 6 次错码：注册过和没注册的邮箱回应一样', exist6.status === ghost6.status && exist6.body.error === ghost6.body.error, [exist6.status, ghost6.status])

  /* --- 重设：一次性、pwver 失效 --- */
  var newHash = clientHash('f@m.co', 'newpassword9')
  /* 重设前埋第二枚活 token（模拟同时泄漏出去的两封重设邮件） */
  var leaked2 = 'b'.repeat(64)
  await dbF.tokenInsert({ token_hash: 'plain$' + require('crypto').createHash('sha256').update(leaked2).digest('hex'), user_id: dbF.users[0].id, kind: 'reset', expires_at: now + 30 * 60 * 1000 })
  var wrongCode = await A.reset(dbF, now + 2500, { email: 'f@m.co', code: real.dev.code === '111111' ? '222222' : '111111', password: newHash })
  check('验证码错 422 且不改密码', wrongCode.status === 422 && dbF.users[0].pwver === 1, wrongCode)
  var rs = await A.reset(dbF, now + 3000, { email: 'f@m.co', code: real.dev.code, password: newHash })
  check('重设成功并登录', rs.status === 200 && rs.session, rs)
  check('重设顺带验证', dbF.users[0].verified === 1)
  var rs2 = await A.reset(dbF, now + 4000, { email: 'f@m.co', code: real.dev.code, password: newHash })
  check('验证码一次性', rs2.status === 422, rs2)
  check('重设作废之前泄漏的其他重设链接', (await A.reset(dbF, now + 4100, { token: leaked2, password: newHash })).status === 422)
  check('pwver 加过', dbF.users[0].pwver === 2)
  var oldSess = await A.meBySession(dbF, { uid: dbF.users[0].id, pwver: 1 })
  check('旧登录态失效', oldSess.status === 401)
  var newSess = await A.meBySession(dbF, rs.session) /* 用返回值不硬编码：盯住 pwver 别算两遍 */
  check('新登录态有效', newSess.status === 200 && newSess.body.email === 'f@m.co')
  var oldPwLogin = await A.login(dbF, now + 5000, { email: 'f@m.co', password: clientHash('f@m.co', 'password123') })
  check('旧密码登不上', oldPwLogin.status === 401)
  var newPwLogin = await A.login(dbF, now + 5000, { email: 'f@m.co', password: newHash })
  check('新密码能登', newPwLogin.status === 200)

  /* --- 改密码：要登录态 + 当前密码对得上；副作用与重设一致（pwver+1） --- */
  var dbC = memRepo()
  seedInvite(dbC, 'THHHH8')
  var regC = await A.register(dbC, now, { email: 'c@m.co', password: clientHash('c@m.co', 'password123'), invite: 'THHHH8' })
  await A.verify(dbC, now + 1000, { email: 'c@m.co', code: regC.dev.code })
  var sessC = { uid: dbC.users[0].id, pwver: 1 }
  /* 改密码前埋一枚活着的重设 token 和一枚验证码（模拟改密码前泄漏出去的链接） */
  var sha = function (s) { return require('crypto').createHash('sha256').update(s).digest('hex') }
  var leakedReset = 'a'.repeat(64)
  await dbC.tokenInsert({ token_hash: 'plain$' + sha(leakedReset), user_id: sessC.uid, kind: 'reset', expires_at: now + 30 * 60 * 1000 })
  await dbC.tokenInsert({ token_hash: 's$' + sha('555555'), user_id: sessC.uid, kind: 'verify', expires_at: now + 10 * 60 * 1000 })
  var noSess = await A.changePassword(dbC, null, now + 2000, { old: 'x', new: 'y' })
  check('没登录不能改密码', noSess.status === 401, noSess)
  var badNew = await A.changePassword(dbC, sessC, now + 2000, { old: clientHash('c@m.co', 'password123'), new: 'short' })
  check('新密码格式不对 422', badNew.status === 422, badNew)
  var wrongOld = await A.changePassword(dbC, sessC, now + 2000, { old: clientHash('c@m.co', 'password999'), new: clientHash('c@m.co', 'newpassword9') })
  check('当前密码错 401', wrongOld.status === 401, wrongOld)
  var cp = await A.changePassword(dbC, sessC, now + 3000, { old: clientHash('c@m.co', 'password123'), new: clientHash('c@m.co', 'newpassword9') })
  check('改密码成功', cp.status === 200 && cp.session && cp.session.pwver === 2, cp)
  check('改密码作废之前泄漏的重设链接', (await A.reset(dbC, now + 3500, { token: leakedReset, password: clientHash('c@m.co', 'evilpass9') })).status === 422)
  check('改密码作废之前的验证码', (await A.verify(dbC, now + 3500, { email: 'c@m.co', code: '555555' })).status === 422)
  check('改密码 pwver 加过', dbC.users[0].pwver === 2)
  check('改密码后旧登录态失效', (await A.meBySession(dbC, sessC)).status === 401)
  check('改密码后新登录态有效', (await A.meBySession(dbC, cp.session)).status === 200)
  check('改后旧密码登不上', (await A.login(dbC, now + 4000, { email: 'c@m.co', password: clientHash('c@m.co', 'password123') })).status === 401)
  check('改后新密码能登', (await A.login(dbC, now + 4000, { email: 'c@m.co', password: clientHash('c@m.co', 'newpassword9') })).status === 200)

  /* 改密码的当前密码也吃登录锁：错 10 次锁 15 分钟（和登录共用一个计数） */
  var dbC2 = memRepo()
  seedInvite(dbC2, 'TJJJJ9')
  var regC2 = await A.register(dbC2, now, { email: 'c2@m.co', password: clientHash('c2@m.co', 'password123'), invite: 'TJJJJ9' })
  await A.verify(dbC2, now + 1000, { email: 'c2@m.co', code: regC2.dev.code })
  var sessC2 = { uid: dbC2.users[0].id, pwver: 1 }
  for (var w = 0; w < 10; w++) {
    await A.changePassword(dbC2, sessC2, now + 2000 + w, { old: clientHash('c2@m.co', 'wrongpw' + w), new: clientHash('c2@m.co', 'newpassword9') })
  }
  var lockedC = await A.changePassword(dbC2, sessC2, now + 3000, { old: clientHash('c2@m.co', 'password123'), new: clientHash('c2@m.co', 'newpassword9') })
  check('错太多次当前密码被锁', lockedC.status === 429, lockedC)
  check('改密码的锁也挡登录（共用计数）', (await A.login(dbC2, now + 3100, { email: 'c2@m.co', password: clientHash('c2@m.co', 'password123') })).status === 429)
  var afterC = await A.changePassword(dbC2, sessC2, now + 16 * MIN, { old: clientHash('c2@m.co', 'password123'), new: clientHash('c2@m.co', 'newpassword9') })
  check('15 分钟后能改', afterC.status === 200, afterC)
  check('改成后计数清零', afterC.status === 200 && (await A.login(dbC2, now + 17 * MIN, { email: 'c2@m.co', password: clientHash('c2@m.co', 'newpassword9') })).status === 200)

  /* --- data：拉取 + 推送（坏键混合 / LWW / 平局） --- */
  var uid = dbF.users[0].id
  var p1 = await A.dataPush(dbF, uid, [
    { key: 'sumsum:shizi:v1', value: '{"week":3}', updated_at: now },
    { key: 'evil:key', value: 'x', updated_at: now },
    { key: 'sumsum:help:seen', value: '1', updated_at: now },
    { key: 'sumsum:sync:meta', value: '{}', updated_at: now },
    { key: 'sumsum:big:v1', value: new Array(70 * 1024).join('x'), updated_at: now }
  ])
  check('坏键跳过好键入库', p1.status === 200 && p1.body.applied === 1 && p1.body.skipped === 4, p1)
  var pull1 = await A.dataPull(dbF, uid)
  check('拉得到推上去的', pull1.body.items.length === 1 && pull1.body.items[0].key === 'sumsum:shizi:v1')

  var pStale = await A.dataPush(dbF, uid, [{ key: 'sumsum:shizi:v1', value: '{"week":1}', updated_at: now - 1 }])
  check('旧数据不覆盖新', pStale.body.applied === 0)
  var pEqual = await A.dataPush(dbF, uid, [{ key: 'sumsum:shizi:v1', value: '{"week":1}', updated_at: now }])
  check('平局不动', pEqual.body.applied === 0)
  var pNew = await A.dataPush(dbF, uid, [{ key: 'sumsum:shizi:v1', value: '{"week":9}', updated_at: now + 1 }])
  check('新数据覆盖', pNew.body.applied === 1)
  var tooMany = []
  for (var q = 0; q < 201; q++) tooMany.push({ key: 'sumsum:k' + q, value: '1', updated_at: now })
  var pBig = await A.dataPush(dbF, uid, tooMany)
  check('超过 200 条整批拒绝', pBig.status === 413)

  /* --- 纸记录 60 天清理：拉取时先删服务器上的旧纸（同步不传播删除，只能两头各删） --- */
  var DAYMS = 86400000
  await A.dataPush(dbF, uid, [
    { key: 'sumsum:sheet:v1:oldold', value: '{}', updated_at: now - 61 * DAYMS },
    { key: 'sumsum:sheet:v1:newnew', value: '{}', updated_at: now - 59 * DAYMS },
    { key: 'sumsum:oldother:v1', value: '{}', updated_at: now - 400 * DAYMS }
  ], now + 120000)
  var pullS = await A.dataPull(dbF, uid, now)
  var keysS = pullS.body.items.map(function (it) { return it.key })
  check('拉取时删 60 天前的纸', keysS.indexOf('sumsum:sheet:v1:oldold') < 0, keysS)
  check('新纸保留', keysS.indexOf('sumsum:sheet:v1:newnew') >= 0, keysS)
  check('别的旧数据不动', keysS.indexOf('sumsum:oldother:v1') >= 0, keysS)

  /* --- push 总量配额：一个账号 5MB 封顶，防写爆免费档 D1 --- */
  var dbQ = memRepo()
  dbQ.users.push({ id: 'u-q', email: 'q@m.co', pw_hash: 'x', pw_salt: 's', pwver: 1, verified: 1 })
  var kb60 = new Array(60 * 1024).join('x') /* 约 60KB */
  var items80 = [], items90 = []
  for (var i = 0; i < 80; i++) items80.push({ key: 'sumsum:q1:' + i + ':v1', value: kb60, updated_at: 1 })
  for (var j2 = 0; j2 < 90; j2++) items90.push({ key: 'sumsum:q2:' + j2 + ':v1', value: kb60, updated_at: 2 })
  var pq1 = await A.dataPush(dbQ, 'u-q', items80, now)
  check('配额内（约 4.8MB）可推', pq1.status === 200 && pq1.body.applied === 80, pq1.body)
  var pq2 = await A.dataPush(dbQ, 'u-q', items90, now)
  check('累计超 5MB 整批拒绝', pq2.status === 413, pq2.body)
  var pq3 = await A.dataPush(dbQ, 'u-q', [{ key: 'sumsum:small:v1', value: '1', updated_at: 3 }], now)
  check('拒绝后小推不受影响', pq3.status === 200 && pq3.body.applied === 1, pq3.body)

  /* --- push 频控：同账号一分钟最多 60 次（客户端防抖 2s，正常用远够不着） --- */
  var dbR = memRepo()
  dbR.users.push({ id: 'u-r', email: 'r@m.co', pw_hash: 'x', pw_salt: 's', pwver: 1, verified: 1 })
  var rr = null
  for (var k2 = 0; k2 <= 60; k2++) {
    rr = await A.dataPush(dbR, 'u-r', [{ key: 'sumsum:r:v1', value: String(k2), updated_at: k2 }], now)
  }
  check('一分钟内第 61 次推送被限流', rr.status === 429, rr.body)

  console.log(bad ? '---- 有 ' + bad + ' 条没过' : '✓ auth-core 注册/验证码全部通过')
  process.exit(bad ? 1 : 0)
}).catch(function (e) { console.error(e); process.exit(1) })
