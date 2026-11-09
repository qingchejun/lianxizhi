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
  return {
    users: users,
    _tokens: tokens,
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

  console.log(bad ? '---- 有 ' + bad + ' 条没过' : '✓ auth-core 注册/验证码全部通过')
  process.exit(bad ? 1 : 0)
}).catch(function (e) { console.error(e); process.exit(1) })
