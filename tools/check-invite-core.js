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
  check('无邀请码 422', (await A.register(db, now, { email: 'a@b.co', password: clientHash('a@b.co', 'password123') })).status === 422)
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

  /* 桩行是原始字段（无 state——state 由 admin-core 的 fmt 算），挑没用过的码用原始字段判 */
  var otherId = dbA._invites.find(function (v) { return !v.revoked_at && !v.activated_at && !v.claimed_by }).id
  check('作废成功', (await AD.revokeInvite(dbA, { uid: 'boss' }, now + 2, { id: otherId })).status === 200)
  check('作废后该码注册被拒', (await A.register(dbA, now + 3, { email: 'w@u.co', password: clientHash('w@u.co', 'password123'), invite: dbA._invites.find(function (v) { return v.id === otherId }).code })).status === 422)
  check('作废不存在的码 404', (await AD.revokeInvite(dbA, { uid: 'boss' }, now + 4, { id: 'ghost' })).status === 404)

  console.log(bad ? '---- 有 ' + bad + ' 条没过' : '✓ invite 注册侧全部通过')
  process.exit(bad ? 1 : 0)
}).catch(function (e) { console.error(e); process.exit(1) })
