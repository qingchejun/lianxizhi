/* 鉴权核心（auth-core）：注册 / 验证码生命周期 / 邮件限流。node 直跑。 */
'use strict'

var ok = 0, bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) }
  else { bad++; console.log('✗', name, extra === undefined ? '' : JSON.stringify(extra)) }
}

/* --- 内存 repo：D1 语义的最小镜像 --- */
function memRepo() {
  var users = [], tokens = [], limits = {}
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
    async limitSet(s, k, row) { limits[s + '/' + k] = row }
  }
}

function clientHash(email, pw) {
  /* 与浏览器 account.js 同派生（node:crypto 独立实现，互为对照） */
  var c = require('crypto')
  return c.pbkdf2Sync(pw, email + 'lianxizhi-account-v1', 1000, 32, 'sha256').toString('hex')
  /* 迭代次数无所谓——服务端只看是不是 64 位 hex */
}

import('../server/auth-core.js').then(async function (A) {
  var now = 1700000000000

  /* --- 注册 --- */
  var db = memRepo()
  var bad1 = await A.register(db, now, { email: 'not-an-email', password: clientHash('a@b.co', 'password123') })
  check('坏邮箱 422', bad1.status === 422)
  var bad2 = await A.register(db, now, { email: 'a@b.co', password: 'short' })
  check('密码不是 64hex 422', bad2.status === 422)

  var r = await A.register(db, now, { email: 'A@B.CO ', password: clientHash('a@b.co', 'password123') })
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
  var reg = await A.register(db2, now, { email: 'c@d.co', password: clientHash('c@d.co', 'password123') })
  var rightCode = reg.dev.code
  for (var i = 0; i < 5; i++) {
    await A.verify(db2, now + 1000 + i, { email: 'c@d.co', code: '000000' })
  }
  var vf = await A.verify(db2, now + 2000, { email: 'c@d.co', code: rightCode })
  check('5 次错后正确码也进不去', vf.status === 429, vf)
  check('作废后 token 全标已用', db2._tokens.every(function (t) { return t.used_at }))

  /* --- 邮件限流：60 秒间隔 + 每小时 3 封 --- */
  var db3 = memRepo()
  await A.register(db3, now, { email: 'e@f.co', password: clientHash('e@f.co', 'password123') })
  var again = await A.register(db3, now + 30 * 1000, { email: 'e@f.co', password: clientHash('e@f.co', 'password123') })
  check('60 秒内重发 → 429', again.status === 429, again)
  await A.register(db3, now + 61 * 1000, { email: 'e@f.co', password: clientHash('e@f.co', 'password123') })
  await A.register(db3, now + 121 * 1000, { email: 'e@f.co', password: clientHash('e@f.co', 'password123') })
  var fourth = await A.register(db3, now + 181 * 1000, { email: 'e@f.co', password: clientHash('e@f.co', 'password123') })
  check('一小时内第 4 封 → 429', fourth.status === 429, fourth)

  /* --- 邮件是中文纯文本且不含营销话术（spec） --- */
  check('邮件文案到位', /验证码/.test(reg.mail.text) && reg.mail.subject.indexOf('练习纸') === 0)

  /* ===== Task 6：登录 / 锁定 / 找回 / 重设 / data ===== */
  var MIN = 60 * 1000

  /* --- 登录 --- */
  var dbL = memRepo()
  var regL = await A.register(dbL, now, { email: 'l@m.co', password: clientHash('l@m.co', 'password123') })
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
  var regK = await A.register(dbK, now, { email: 'k@m.co', password: clientHash('k@m.co', 'password123') })
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
  await A.register(dbV, now, { email: 'v@m.co', password: clientHash('v@m.co', 'password123') })
  var nv = await A.login(dbV, now + 61 * 1000, { email: 'v@m.co', password: clientHash('v@m.co', 'password123') })
  check('未验证 → need_verify + 发码', nv.status === 200 && nv.body.need_verify === true && nv.mail, nv)

  /* --- 找回：恒 200 不泄露 --- */
  var dbF = memRepo()
  var regF = await A.register(dbF, now, { email: 'f@m.co', password: clientHash('f@m.co', 'password123') })
  await A.verify(dbF, now + 1000, { email: 'f@m.co', code: regF.dev.code })
  var ghost = await A.forgot(dbF, now + 2000, { email: 'ghost@m.co' })
  check('不存在的邮箱 forgot 也 200 且不发信', ghost.status === 200 && ghost.body.ok === true && !ghost.mail)
  var real = await A.forgot(dbF, now + 65 * 1000, { email: 'f@m.co' })
  check('存在的邮箱发重设信', real.status === 200 && real.mail && /^[0-9a-f]{64}$/.test(real.dev.token), real)
  check('重设信里有链接', real.mail.text.indexOf('/?reset=') >= 0)

  /* --- 重设：一次性、pwver 失效 --- */
  var newHash = clientHash('f@m.co', 'newpassword9')
  var rs = await A.reset(dbF, now + 3000, { token: real.dev.token, password: newHash })
  check('重设成功并登录', rs.status === 200 && rs.session, rs)
  check('重设顺带验证', dbF.users[0].verified === 1)
  var rs2 = await A.reset(dbF, now + 4000, { token: real.dev.token, password: newHash })
  check('token 一次性', rs2.status === 422, rs2)
  check('pwver 加过', dbF.users[0].pwver === 2)
  var oldSess = await A.meBySession(dbF, { uid: dbF.users[0].id, pwver: 1 })
  check('旧登录态失效', oldSess.status === 401)
  var newSess = await A.meBySession(dbF, { uid: dbF.users[0].id, pwver: 2 })
  check('新登录态有效', newSess.status === 200 && newSess.body.email === 'f@m.co')
  var oldPwLogin = await A.login(dbF, now + 5000, { email: 'f@m.co', password: clientHash('f@m.co', 'password123') })
  check('旧密码登不上', oldPwLogin.status === 401)
  var newPwLogin = await A.login(dbF, now + 5000, { email: 'f@m.co', password: newHash })
  check('新密码能登', newPwLogin.status === 200)

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
