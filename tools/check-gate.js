/* 登录门槛（functions/_middleware.js + server/gate.js）。node 直跑（动态 import ESM）。
 * 规矩：没登录只能看到首页的介绍兼登录页（可被谷歌收录）；其余页面一律跳回首页登录，登录后回原页。 */
'use strict'

var ok = 0, bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) }
  else { bad++; console.log('✗', name, extra === undefined ? '' : String(extra)) }
}

Promise.all([import('../server/gate.js'), import('../functions/_middleware.js'), import('../server/session.js')])
.then(async function (mods) {
  var G = mods[0], M = mods[1], S = mods[2]

  /* --- 纯规则 --- */
  var d = G.decide
  check('静态资源放行（css/js/字体/图标）', ['/css/app.css', '/js/store.js', '/fonts/pinyin-kids.woff2', '/icons/favicon.svg', '/icons/apple-touch-icon.png']
    .every(function (p) { return d(p, '', false).action === 'pass' }))
  check('接口放行（接口自己验登录）', d('/api/auth/login', '', false).action === 'pass')
  check('没登录打开首页 → 介绍兼登录页', d('/', '', false).action === 'welcome')
  check('密码重设邮件链接 /?reset= 落在介绍页', d('/', '?reset=ab', false).action === 'welcome')
  var r = d('/kousuan', '?mode=add&seed=3', false)
  check('没登录打开板块页 → 跳首页并记住原址', r.action === 'redirect' &&
    r.location === '/?next=' + encodeURIComponent('/kousuan?mode=add&seed=3'), r.location)
  check('管理页同样拦', d('/admin.html', '', false).action === 'redirect')
  check('大小写绕不过（/CSS/ 不算静态目录）', d('/CSS/x.css', '', false).action === 'redirect' && d('/CSS/../kousuan.html', '', false).action !== 'pass')
  check('登录后一切放行', ['/', '/kousuan', '/admin.html', '/pinyin.html'].every(function (p) {
    return d(p, '', true).action === 'pass'
  }))
  check('介绍页本身不单独开放（避免重复收录）', d('/welcome', '', false).action === 'redirect' &&
    d('/welcome.html', '', true).location === '/')

  /* 源码、脚本、文档、配置：登没登录都不给看（站点根目录就是仓库根目录） */
  check('内部文件一律 404', ['/server/session.js', '/tools/migrate-20261120-invites.sql', '/docs/superpowers/specs/x.md',
    '/functions/_middleware.js', '/wrangler.toml', '/口算题生成器-提示词.md', '/.gitignore', '/_headers']
    .every(function (p) { return d(p, '', true).action === 'deny' && d(p, '', false).action === 'deny' }))
  check('/index、/index.html 没登录时并到 /（避免重复收录）', d('/index.html', '', false).location === '/' &&
    d('/index', '?a=1', false).location === '/?a=1')

  check('编码斜杠绕不出静态目录（/js/..%2fserver/…）', ['/js/..%2fserver/session.js', '/js/%2e%2e%2fserver/session.js',
    '/css/..%5cserver/x.js', '/js/%252e%252e%252fserver/x.js', '/js/%E0%A4%A'].every(function (p) {
      return d(p, '', true).action === 'deny' && d(p, '', false).action === 'deny'
    }))
  check('正常的中文与编码路径不误伤', d('/js/store.js', '', false).action === 'pass' && d('/fonts/Andika-OFL.txt', '', false).action === 'pass')

  /* --- 中间件整链 --- */
  var SECRET = 'gate-secret'
  var users = { u1: { id: 'u1', pwver: 2, banned: 0 }, u2: { id: 'u2', pwver: 1, banned: 1 } }
  var dbDown = false
  function ctx(path, cookie) {
    var calls = { next: 0, assets: [] }
    return {
      calls: calls,
      request: new Request('https://lianxizhi.qingchejun.com' + path, { headers: cookie ? { Cookie: cookie } : {} }),
      env: {
        SESSION_SECRET: SECRET,
        DB: { prepare: function () { return { bind: function (id) { return { first: async function () {
          if (dbDown) throw new Error('db down')
          return users[id] || null
        } } } } } },
        ASSETS: { fetch: async function (u) { calls.assets.push(String(u)); return new Response('<h1>介绍</h1>', { status: 200, headers: { 'Content-Type': 'text/html' } }) } }
      },
      next: async function () { calls.next++; return new Response('page', { status: 200, headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=0' } }) }
    }
  }
  var now = Date.now()
  var good = S.COOKIE + '=' + await S.sign({ uid: 'u1', pwver: 2, exp: now + 60000 }, SECRET)
  var oldPw = S.COOKIE + '=' + await S.sign({ uid: 'u1', pwver: 1, exp: now + 60000 }, SECRET)
  var banned = S.COOKIE + '=' + await S.sign({ uid: 'u2', pwver: 1, exp: now + 60000 }, SECRET)
  var forged = S.COOKIE + '=' + (await S.sign({ uid: 'u1', pwver: 2, exp: now + 60000 }, 'wrong'))

  var c = ctx('/kousuan')
  var res = await M.onRequest(c)
  check('无 cookie 访问板块 → 302 首页', res.status === 302 && res.headers.get('Location').indexOf('/?next=') === 0 && c.calls.next === 0)

  c = ctx('/', null)
  res = await M.onRequest(c)
  check('无 cookie 访问首页 → 200 介绍页（谷歌可收录）', res.status === 200 && c.calls.assets.length === 1 &&
    /\/welcome$/.test(c.calls.assets[0]) && (await res.text()).indexOf('介绍') >= 0, c.calls.assets[0])
  check('介绍页不让浏览器缓存成登录后的首页', /no-cache|no-store/.test(res.headers.get('Cache-Control') || ''))

  c = ctx('/kousuan', good)
  res = await M.onRequest(c)
  check('有效登录 → 放行', res.status === 200 && c.calls.next === 1)
  check('登录后的页面标 private（不进共享缓存）', /private/.test(res.headers.get('Cache-Control') || ''), res.headers.get('Cache-Control'))

  c = ctx('/kousuan', oldPw)
  check('改过密码的旧登录态 → 拦', (await M.onRequest(c)).status === 302)
  c = ctx('/kousuan', banned)
  check('停用账号 → 拦', (await M.onRequest(c)).status === 302)
  c = ctx('/kousuan', forged)
  check('伪造签名 → 拦', (await M.onRequest(c)).status === 302)
  dbDown = true
  c = ctx('/kousuan', good)
  check('数据库出错 → 按没登录处理（宁可拦）', (await M.onRequest(c)).status === 302)
  dbDown = false

  c = ctx('/server/session.js', good)
  res = await M.onRequest(c)
  check('登录了也拿不到服务器源码', res.status === 404 && c.calls.next === 0)

  c = ctx('/js/store.js')
  res = await M.onRequest(c)
  check('静态资源不查库直接放行', res.status === 200 && c.calls.next === 1)

  console.log(bad ? '---- 登录门槛有 ' + bad + ' 条没过' : '✓ 登录门槛全部通过')
  process.exit(bad ? 1 : 0)
}).catch(function (e) { console.error(e); process.exit(1) })
