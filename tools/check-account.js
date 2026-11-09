/* 账号客户端：哈希与校验。node 24 自带 crypto.subtle，IIFE 挂到 globalThis 即可直跑。 */
globalThis.window = globalThis
require('../js/account.js')
var A = globalThis.SumSum.account
var crypto = require('crypto')

var bad = 0
var n = 0
function check(name, ok, extra) {
  n++
  if (!ok) {
    bad++
    console.log('✗ ' + name + (extra !== undefined ? ' → ' + JSON.stringify(extra) : ''))
  } else console.log('✓ ' + name)
}

Promise.resolve().then(async function () {
  /* 哈希与 node 的 pbkdf2Sync 对账——服务器按同样口径收 */
  var h = await A.hashPassword('Parent@Example.com', 'password123')
  var oracle = crypto.pbkdf2Sync('password123', 'parent@example.com' + 'lianxizhi-account-v1', 600000, 32, 'sha256').toString('hex')
  check('哈希与 pbkdf2Sync 口径一致（邮箱转小写）', h === oracle, h)
  check('哈希是 64 位 hex', /^[0-9a-f]{64}$/.test(h))
  var h2 = await A.hashPassword('parent@example.com', 'password123')
  check('同一邮箱大小写同哈希', h === h2)
  var h3 = await A.hashPassword('parent@example.com', 'password124')
  check('改一位密码哈希就变', h !== h3)

  check('validEmail 正常邮箱', A.validEmail('a@b.co') === true)
  check('validEmail 拒空格与缺 @', A.validEmail('a b.co') === false && A.validEmail('ab.co') === false)
  check('validPassword 至少 8 位', A.validPassword('1234567') === false && A.validPassword('12345678') === true)
  check('normEmail 去空格转小写', A.normEmail('  A@B.CO ') === 'a@b.co')

  /* request：注入的 fetch 按路径转发，解析 JSON 与非 2xx */
  var calls = []
  var fake = async function (url, opt) {
    calls.push([url, opt])
    if (url.indexOf('/bad') >= 0) return { ok: false, status: 500, text: async function () { return '{"error":"服务器开小差了"}' } }
    return { ok: true, status: 200, text: async function () { return '{"ok":true}' } }
  }
  var r = await A.request('/api/auth/login', { email: 'a@b.co', password: 'x' }, fake)
  check('request POST 带凭证头', calls[0][1].method === 'POST' && calls[0][1].credentials === 'same-origin')
  check('request 解析 JSON', r.status === 200 && r.body.ok === true)
  var rb = await A.request('/bad', {}, fake)
  check('request 非 2xx 也给 body', rb.status === 500 && rb.body.error === '服务器开小差了')

  console.log(bad ? '\n有 ' + bad + ' 项没过' : '\n全部通过（' + n + ' 项）')
  process.exit(bad ? 1 : 0)
}).catch(function (e) { console.error(e); process.exit(1) })
