/* 谷歌登录的小件（server/google.js）：回跳页面只认本站、state cookie、id_token 核对、换 token。node 直跑。 */
'use strict'
var ok = 0, bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) }
  else { bad++; console.log('✗', name, extra === undefined ? '' : JSON.stringify(extra)) }
}
function tok(p) {
  var b = function (o) { return Buffer.from(JSON.stringify(o)).toString('base64url') }
  return b({ alg: 'RS256' }) + '.' + b(p) + '.sig'
}

import('../server/google.js').then(async function (G) {
  var CID = 'cid.apps.googleusercontent.com', NOW = 1764000000000
  check('回跳页面：本站路径照用', G.safeNext('/kousuan?level=2') === '/kousuan?level=2')
  check('回跳页面：外站、//、反斜杠、控制字符、空 → 首页', ['https://evil.com', '//evil.com', '/\\evil.com', '/\tx', '', null, 'kousuan'].every(function (x) { return G.safeNext(x) === '/' }))

  var u = new URL(G.authUrl(CID, 'https://zhihebi.com/api/auth/google/callback', 'ab'.repeat(16)))
  check('跳去谷歌的网址：客户端、回调、只要邮箱、带 state', u.origin + u.pathname === G.AUTH_URL && u.searchParams.get('client_id') === CID &&
        u.searchParams.get('redirect_uri') === 'https://zhihebi.com/api/auth/google/callback' && u.searchParams.get('scope') === 'openid email' &&
        u.searchParams.get('state') === 'ab'.repeat(16) && u.searchParams.get('response_type') === 'code')

  var c = G.stateCookie('0123456789abcdef0123456789abcdef', '/shudu?x=1')
  check('state cookie：只发给 /api/auth/google、HttpOnly、10 分钟', /Path=\/api\/auth\/google;/.test(c) && /HttpOnly/.test(c) && /Max-Age=600/.test(c))
  var v = c.split(';')[0].split('=').slice(1).join('=')
  var ps = G.parseStateCookie(v)
  check('state cookie 读回来：state 和回跳页面都对', ps && ps.state === '0123456789abcdef0123456789abcdef' && ps.next === '/shudu?x=1', ps)
  check('state cookie 被改坏 → 不认', G.parseStateCookie('xyz|%2F') === null && G.parseStateCookie(undefined) === null)
  check('state cookie 里的回跳页面被换成外站 → 回首页', G.parseStateCookie('0123456789abcdef0123456789abcdef|' + encodeURIComponent('//evil.com')).next === '/')

  var good = { iss: 'https://accounts.google.com', aud: CID, exp: NOW / 1000 + 600, email: 'a@gmail.com', email_verified: true, sub: '42' }
  var r = G.readIdToken(tok(good), CID, NOW)
  check('id_token 合格 → 取出邮箱', r && r.email === 'a@gmail.com' && r.sub === '42', r)
  check('id_token：别的客户端的 → 不认', G.readIdToken(tok(Object.assign({}, good, { aud: 'other' })), CID, NOW) === null)
  check('id_token：不是谷歌发的 → 不认', G.readIdToken(tok(Object.assign({}, good, { iss: 'evil.com' })), CID, NOW) === null)
  check('id_token：过期 → 不认', G.readIdToken(tok(Object.assign({}, good, { exp: NOW / 1000 - 1 })), CID, NOW) === null)
  check('id_token：邮箱没验证过 → 不认', G.readIdToken(tok(Object.assign({}, good, { email_verified: false })), CID, NOW) === null)
  check('id_token：格式坏的 → 不认', G.readIdToken('abc', CID, NOW) === null && G.readIdToken(null, CID, NOW) === null && G.readIdToken('a.!!!.c', CID, NOW) === null)

  var sent = null
  var fake = async function (url, init) { sent = { url: url, body: new URLSearchParams(init.body) }; return { ok: true, json: async function () { return { id_token: 'T' } } } }
  var t = await G.exchangeCode('CODE', { GOOGLE_CLIENT_ID: CID, GOOGLE_CLIENT_SECRET: 'S' }, 'https://zhihebi.com/api/auth/google/callback', fake)
  check('换 token：发给谷歌的是授权码、客户端、密钥、回调', t === 'T' && sent.url === G.TOKEN_URL && sent.body.get('code') === 'CODE' &&
        sent.body.get('client_secret') === 'S' && sent.body.get('grant_type') === 'authorization_code')
  var t2 = await G.exchangeCode('CODE', {}, 'x', async function () { return { ok: false } })
  var t3 = await G.exchangeCode('CODE', {}, 'x', async function () { throw new Error('net') })
  check('换 token：谷歌拒绝、网络出错 → null', t2 === null && t3 === null)

  console.log(bad ? '---- 有 ' + bad + ' 条没过' : '✓ 谷歌登录小件全部通过')
  process.exit(bad ? 1 : 0)
}).catch(function (e) { console.error(e); process.exit(1) })
