/* 会话 cookie：签名/验签/到期/篡改/序列化。node 直跑（动态 import ESM）。 */
'use strict'

var ok = 0, bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) }
  else { bad++; console.log('✗', name, extra === undefined ? '' : String(extra)) }
}

import('../server/session.js').then(async function (S) {
  var SECRET = 'test-secret'
  var now = 1700000000000

  var t = await S.sign({ uid: 'u1', pwver: 1, exp: now + 1000 }, SECRET)
  var p = await S.verify(t, SECRET, now)
  check('签名后能验回', p && p.uid === 'u1' && p.pwver === 1)

  check('改 payload 一位 → 拒绝', (await S.verify(t.slice(0, -2) + 'zz', SECRET, now)) === null)
  check('换密钥 → 拒绝', (await S.verify(t, 'other', now)) === null)

  var te = await S.sign({ uid: 'u1', pwver: 1, exp: now }, SECRET)
  check('exp == now → 拒绝', (await S.verify(te, SECRET, now)) === null)
  var tl = await S.sign({ uid: 'u1', pwver: 1, exp: now + 1 }, SECRET)
  check('exp == now+1 → 放行', (await S.verify(tl, SECRET, now)) !== null)

  var h = S.cookieHeader(t, 90 * 86400)
  check('cookie 属性齐全', h.indexOf('HttpOnly') >= 0 && h.indexOf('Secure') >= 0 && h.indexOf('SameSite=Lax') >= 0 && h.indexOf('Max-Age=7776000') >= 0, h)
  check('清 cookie 是 Max-Age=0', S.clearCookieHeader().indexOf('Max-Age=0') >= 0)

  check('readCookie 解析', S.readCookie('a=1; sumsum_sess=xyz; b=2', 'sumsum_sess') === 'xyz')
  check('readCookie 没有 → null', S.readCookie('a=1', 'sumsum_sess') === null)

  var sp = S.sessionPayload('u1', 3, now)
  check('90 天有效期', sp.exp - now === 90 * 86400 * 1000 && sp.pwver === 3)

  console.log(bad ? '---- 有 ' + bad + ' 条没过' : '✓ 会话 cookie 全部通过')
  process.exit(bad ? 1 : 0)
}).catch(function (e) { console.error(e); process.exit(1) })
