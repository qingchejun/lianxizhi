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
  check('扫码登记页：登录后放行', d('/mark', '?id=abc234', true).action === 'pass')
  check('扫码登记页：没登录 → 登录后回到这张纸', d('/mark', '?id=abc234', false).location === '/?next=' + encodeURIComponent('/mark?id=abc234'))
  check('二维码库放行', d('/js/vendor/qrcode.js', '', false).action === 'pass')
  check('密码重设邮件链接 /?reset= 落在介绍页', d('/', '?reset=ab', false).action === 'welcome')
  var r = d('/pinyin', '?mode=add&seed=3', false)
  check('没登录打开没开放的板块页 → 跳首页并记住原址', r.action === 'redirect' &&
    r.location === '/?next=' + encodeURIComponent('/pinyin?mode=add&seed=3'), r.location)
  check('口算、数独没登录也放行（免登录出题打印）', ['/kousuan', '/kousuan.html', '/shudu', '/shudu.html'].every(function (p) {
    return d(p, '?seed=3', false).action === 'pass'
  }))
  check('其余板块没登录照样拦', ['/aoshu', '/shizi', '/pinyin.html', '/huochai', '/mima', '/migong', '/zhizhi', '/index.html', '/help'].every(function (p) {
    return d(p, '', false).action === 'redirect'
  }))
  check('开放页面不能借大小写或尾斜杠绕到别处', d('/KOUSUAN', '', false).action === 'redirect' && d('/kousuan/../aoshu', '', false).action !== 'pass')
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
  function ctx(path, cookie, host) {
    var calls = { next: 0, assets: [] }
    return {
      calls: calls,
      request: new Request('https://' + (host || 'zhihebi.com') + path, { headers: cookie ? { Cookie: cookie } : {} }),
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

  var c = ctx('/pinyin')
  var res = await M.onRequest(c)
  check('无 cookie 访问没开放的板块 → 302 首页', res.status === 302 && res.headers.get('Location').indexOf('/?next=') === 0 && c.calls.next === 0)

  c = ctx('/kousuan')
  res = await M.onRequest(c)
  check('无 cookie 访问口算 → 200 页面照常打开', res.status === 200 && c.calls.next === 1)
  check('口算页注入的是「没登录」', (await res.text()).indexOf('"ok":false') >= 0 || typeof HTMLRewriter === 'undefined')
  check('没登录的口算页也不进共享缓存', /private/.test(res.headers.get('Cache-Control') || ''))

  c = ctx('/', null)
  res = await M.onRequest(c)
  check('无 cookie 访问首页 → 200 介绍页（谷歌可收录）', res.status === 200 && c.calls.assets.length === 1 &&
    /\/welcome$/.test(c.calls.assets[0]) && (await res.text()).indexOf('介绍') >= 0, c.calls.assets[0])
  check('介绍页不让浏览器缓存成登录后的首页', /no-cache|no-store/.test(res.headers.get('Cache-Control') || ''))

  c = ctx('/kousuan', good)
  res = await M.onRequest(c)
  check('有效登录 → 放行', res.status === 200 && c.calls.next === 1)
  check('登录后的页面标 private（不进共享缓存）', /private/.test(res.headers.get('Cache-Control') || ''), res.headers.get('Cache-Control'))

  c = ctx('/pinyin', oldPw)
  check('改过密码的旧登录态 → 拦', (await M.onRequest(c)).status === 302)
  c = ctx('/pinyin', banned)
  check('停用账号 → 拦', (await M.onRequest(c)).status === 302)
  c = ctx('/pinyin', forged)
  check('伪造签名 → 拦', (await M.onRequest(c)).status === 302)
  dbDown = true
  c = ctx('/pinyin', good)
  check('数据库出错 → 按没登录处理（宁可拦）', (await M.onRequest(c)).status === 302)
  dbDown = false

  c = ctx('/server/session.js', good)
  res = await M.onRequest(c)
  check('登录了也拿不到服务器源码', res.status === 404 && c.calls.next === 0)

  c = ctx('/js/store.js')
  res = await M.onRequest(c)
  check('静态资源不查库直接放行', res.status === 200 && c.calls.next === 1)

  /* ---- 给搜索引擎的文件 ---- */
  check('robots.txt 公开（不被 .txt 规则拦）', G.decide('/robots.txt', '', false).action === 'pass')
  check('sitemap.xml 公开', G.decide('/sitemap.xml', '', false).action === 'pass')
  check('其他 .txt 照样拦', G.decide('/js/vendor/LICENSE-qrcode-generator.txt', '', false).action === 'deny' && G.decide('/notes.txt', '', true).action === 'deny')

  /* ---- 换域名（server/move.js） ---- */
  c = ctx('/kousuan?x=1', null, 'www.zhihebi.com')
  res = await M.onRequest(c)
  check('www → 301 不带 www 的同一页', res.status === 301 && res.headers.get('Location') === 'https://zhihebi.com/kousuan?x=1', res.headers.get('Location'))
  c = ctx('/mark?id=abc234', null, 'lianxizhi.pages.dev')
  res = await M.onRequest(c)
  check('旧地址没登录扫旧二维码 → 301 新地址同一页', res.status === 301 && res.headers.get('Location') === 'https://zhihebi.com/mark?id=abc234' && c.calls.next === 0, res.headers.get('Location'))
  c = ctx('/', null, 'lianxizhi.qingchejun.com')
  res = await M.onRequest(c)
  check('旧地址首页（谷歌）→ 301 新首页', res.status === 301 && res.headers.get('Location') === 'https://zhihebi.com/')
  c = ctx('/kousuan', good, 'lianxizhi.qingchejun.com')
  res = await M.onRequest(c)
  check('旧地址已登录（过渡期）→ 页面照常打开，等同步完再跳', res.status === 200 && c.calls.next === 1)
  c = ctx('/api/data', good, 'lianxizhi.pages.dev')
  res = await M.onRequest(c)
  check('旧地址的接口照常处理（不跳）', res.status === 200 && c.calls.next === 1)
  c = ctx('/js/store.js', null, 'lianxizhi.pages.dev')
  res = await M.onRequest(c)
  check('旧地址的静态文件照常给', res.status === 200 && c.calls.next === 1)
  c = ctx('/pinyin', null, 'abc123.lianxizhi.pages.dev')
  res = await M.onRequest(c)
  check('预览部署地址不跳', res.status === 302 && res.headers.get('Location').indexOf('/?next=') === 0)
  var MV = await import('../server/move.js')
  check('过渡期结束（hard）：已登录也直接跳', MV.moveDecision('lianxizhi.pages.dev', '/kousuan', '', true, true, 'hard').action === 'redirect')
  check('退回旧地址（off）：都不跳', MV.moveDecision('lianxizhi.pages.dev', '/kousuan', '', true, false, 'off') === null)
  check('已登录过渡期：注入的跳转地址带原路径', MV.moveDecision('lianxizhi.pages.dev', '/mark', '?id=abc', true, true, 'soft').to === 'https://zhihebi.com/mark?id=abc')

  console.log(bad ? '---- 登录门槛有 ' + bad + ' 条没过' : '✓ 登录门槛全部通过')
  process.exit(bad ? 1 : 0)
}).catch(function (e) { console.error(e); process.exit(1) })
