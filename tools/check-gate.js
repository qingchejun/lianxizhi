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
  check('静态资源放行（css/js/字体/图标）', ['/css/app.css', '/js/store.js', '/fonts/pinyin-kids.woff2', '/icons/favicon.svg', '/icons/apple-touch-icon.png', '/img/samples/kousuan.jpg']
    .every(function (p) { return d(p, '', false).action === 'pass' }))
  check('接口放行（接口自己验登录）', d('/api/auth/login', '', false).action === 'pass')
  check('没登录打开首页 → 介绍兼登录页', d('/', '', false).action === 'welcome')
  check('扫码登记页：登录后放行', d('/mark', '?id=abc234', true).action === 'pass')
  check('扫码登记页：没登录 → 登录后回到这张纸', d('/mark', '?id=abc234', false).location === '/?next=' + encodeURIComponent('/mark?id=abc234'))
  check('二维码库放行', d('/js/vendor/qrcode.js', '', false).action === 'pass')
  check('密码重设邮件链接 /?reset= 落在介绍页', d('/', '?reset=ab', false).action === 'welcome')
  var r = d('/mark', '?a=3', false)
  check('没登录打开要登录的页面 → 跳首页并记住原址', r.action === 'redirect' &&
    r.location === '/?next=' + encodeURIComponent('/mark?a=3'), r.location)
  /* 2026-11-25 整站结构：没开放的板块不再把没登录的人带回首页，在原网址显示「完整版」说明页（不收录） */
  check('没登录打开还没开放的板块 → 原网址显示完整版说明页', ['/shizi', '/pinyin.html', '/pinyin/'].every(function (p) {
    return d(p, '?seed=3', false).action === 'locked'
  }))
  check('口算、数独、游戏组和奥数（前三课公开，11-25）没登录也放行（免登录出题打印）', ['/kousuan', '/kousuan.html', '/shudu', '/shudu.html', '/huochai', '/mima/', '/migong.html', '/zhizhi', '/aoshu', '/aoshu.html'].every(function (p) {
    return d(p, '?seed=3', false).action === 'pass'
  }))
  check('使用说明没登录也放行（2026-11-25：想免费打印的人要看打印帮助）', ['/help', '/help.html'].every(function (p) { return d(p, '', false).action === 'pass' }))
  check('其余要登录的页面没登录照样拦', ['/index.html', '/mark', '/admin', '/aoshu/x', '/pinyinx'].every(function (p) {
    return d(p, '', false).action === 'redirect'
  }))
  check('开放页面不能借大小写或尾斜杠绕到别处', d('/KOUSUAN', '', false).action === 'redirect' && d('/kousuan/../aoshu', '', false).action !== 'pass')
  check('凑十法内页没登录也放行，并带上要取的文件', ['/kousuan/coushifa', '/kousuan/coushifa/', '/kousuan/coushifa.html'].every(function (p) {
    var r = d(p, '', false); return r.action === 'pass' && r.file === '/coushifa'
  }))
  check('凑十法内页：免费版放行、完整版放行', d('/kousuan/coushifa', '', { ok: true, plan: 'free' }).file === '/coushifa' && d('/kousuan/coushifa', '', true).file === '/coushifa')
  check('内页文件自己的网址 301 到正式网址（只留一个网址）', ['/coushifa', '/coushifa.html', '/coushifa/'].every(function (p) {
    var r = d(p, '?x=1', false); return r.action === 'moved' && r.location === '/kousuan/coushifa?x=1'
  }) && d('/coushifa', '', true).action === 'moved')
  check('破十法内页：没登录、免费版、完整版都放行，文件自己的网址 301', ['/kousuan/poshifa', '/kousuan/poshifa/'].every(function (p) {
    return d(p, '', false).file === '/poshifa' && d(p, '', { ok: true, plan: 'free' }).file === '/poshifa' && d(p, '', true).file === '/poshifa'
  }) && d('/poshifa.html', '?a=1', false).location === '/kousuan/poshifa?a=1')
  check('管理页同样拦', d('/admin.html', '', false).action === 'redirect')
  check('大小写绕不过（/CSS/ 不算静态目录）', d('/CSS/x.css', '', false).action === 'redirect' && d('/CSS/../kousuan.html', '', false).action !== 'pass')
  check('登录后一切放行', ['/', '/kousuan', '/admin.html', '/pinyin.html'].every(function (p) {
    return d(p, '', true).action === 'pass'
  }))
  check('介绍页本身不单独开放（避免重复收录）', d('/welcome', '', false).action === 'redirect' &&
    d('/welcome.html', '', true).location === '/')

  /* --- 免费版（2026-11-24 放开注册）：白名单，每个网页 × 各种写法都试 --- */
  var fs = require('fs')
  var FREE_OK = ['index', 'kousuan', 'aoshu', 'shizi', 'pinyin', 'shudu', 'huochai', 'mima', 'migong', 'zhizhi', 'mark', 'help', 'privacy', 'terms', '404']
  var htmls = fs.readdirSync(require('path').join(__dirname, '..')).filter(function (f) { return /\.html$/.test(f) })
  var free = { ok: true, plan: 'free' }, full = { ok: true, plan: 'full' }
  var leaks = []
  htmls.forEach(function (f) {
    var base = f.replace(/\.html$/, '')
    if (base === 'welcome' || base === 'locked') return
    if (base === 'coushifa' || base === 'poshifa') return /* 内页文件：自己的网址 301 到 /kousuan/…，上面单独测 */
    ;['/' + base, '/' + base + '/', '/' + base + '.html', '/' + base + '.html/', '/' + base + '//'].forEach(function (p) {
      var a = d(p, '', free).action
      var want = FREE_OK.indexOf(base) >= 0 ? 'pass' : 'locked'
      if (a !== want && !(a === 'deny' && /\/\/$/.test(p))) leaks.push(p + ' → ' + a) /* 双斜杠被更早的可疑路径规则直接拒，更严 */
    })
  })
  check('免费版：只有白名单里的网页能开，其余一律上锁（每个网页 5 种写法）', !leaks.length && htmls.length > 10, leaks)
  check('免费版：首页、今天放行', d('/', '', free).action === 'pass' && d('/index.html', '', free).action === 'pass')
  check('完整版：一切放行', ['/aoshu', '/shizi/', '/admin.html', '/pinyin'].every(function (p) { return d(p, '', full).action === 'pass' }))
  check('上锁页不单独开网址', d('/locked', '', full).action === 'redirect' && d('/locked.html', '', free).action === 'redirect')
  check('隐私说明没登录也能看', d('/privacy', '', false).action === 'pass')
  check('用户协议和退款说明没登录也能看、免费版也能看', d('/terms', '', false).action === 'pass' && d('/terms', '', { ok: true, plan: 'free' }).action === 'pass')
  check('老调用传 true 仍当完整版', d('/aoshu', '', true).action === 'pass')

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

  /* 侧栏的锁（js/sidebar.js FREE_MODULES）要和服务器规则一致：开放给没登录 / 免费版的板块不挂锁，其余挂锁 */
  var sideSrc = require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'sidebar.js'), 'utf8')
  var freeMods = JSON.parse(/FREE_MODULES = (\[[^\]]*\])/.exec(sideSrc)[1].replace(/'/g, '"'))
  var guestMods = JSON.parse(/GUEST_MODULES = (\[[^\]]*\])/.exec(sideSrc)[1].replace(/'/g, '"'))
  var BOARD_PATH = { 口算: '/kousuan', 奥数: '/aoshu', 识字: '/shizi', 拼音: '/pinyin', 数独: '/shudu', 火柴: '/huochai', 密码: '/mima', 迷宫: '/migong', 数织: '/zhizhi' }
  check('侧栏的锁和服务器规则一致（没登录、免费版）', Object.keys(BOARD_PATH).every(function (m) {
    return (d(BOARD_PATH[m], '', false).action === 'pass') === (guestMods.indexOf(m) >= 0) &&
      (d(BOARD_PATH[m], '', { ok: true, plan: 'free' }).action === 'pass') === (freeMods.indexOf(m) >= 0)
  }), { guestMods: guestMods, freeMods: freeMods })

  /* --- 中间件整链 --- */
  var SECRET = 'gate-secret'
  var users = { u1: { id: 'u1', pwver: 2, banned: 0 }, u2: { id: 'u2', pwver: 1, banned: 1 }, u3: { id: 'u3', pwver: 1, banned: 0, plan: 'free', email: 'f@x.co', verified: 1 } }
  var dbDown = false
  function ctx(path, cookie, host) {
    var calls = { next: 0, assets: [] }
    return {
      calls: calls,
      request: new Request('https://' + (host || 'zhihebi.com') + path, { headers: cookie ? { Cookie: cookie } : {} }),
      env: {
        SESSION_SECRET: SECRET,
        DB: { prepare: function (sql) { return { bind: function (id) { return {
          first: async function () {
            if (dbDown) throw new Error('db down')
            return /FROM sessions/.test(sql) ? sessions[id] || null : users[id] || null
          },
          run: async function () { return {} }
        } } } } },
        ASSETS: { fetch: async function (u) { calls.assets.push(String(u)); return new Response('<h1>介绍</h1>', { status: 200, headers: { 'Content-Type': 'text/html' } }) } }
      },
      next: async function () { calls.next++; return new Response('page', { status: 200, headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=0' } }) }
    }
  }
  var now = Date.now()
  /* 登录设备记录（2026-11-24 起 cookie 带 sid） */
  var sessions = {
    s1: { id: 's1', uid: 'u1', last_seen: now, ended_at: null },
    s2: { id: 's2', uid: 'u2', last_seen: now, ended_at: null },
    sk: { id: 'sk', uid: 'u1', last_seen: now, ended_at: now, ended_reason: 'kicked' }
  }
  var good = S.COOKIE + '=' + await S.sign({ uid: 'u1', pwver: 2, sid: 's1', exp: now + 60000 }, SECRET)
  var oldPw = S.COOKIE + '=' + await S.sign({ uid: 'u1', pwver: 1, sid: 's1', exp: now + 60000 }, SECRET)
  var banned = S.COOKIE + '=' + await S.sign({ uid: 'u2', pwver: 1, sid: 's2', exp: now + 60000 }, SECRET)
  var forged = S.COOKIE + '=' + (await S.sign({ uid: 'u1', pwver: 2, sid: 's1', exp: now + 60000 }, 'wrong'))
  var kicked = S.COOKIE + '=' + await S.sign({ uid: 'u1', pwver: 2, sid: 'sk', exp: now + 60000 }, SECRET)
  var noSid = S.COOKIE + '=' + await S.sign({ uid: 'u1', pwver: 2, exp: now + 60000 }, SECRET)
  var otherSid = S.COOKIE + '=' + await S.sign({ uid: 'u1', pwver: 2, sid: 's2', exp: now + 60000 }, SECRET)

  var c = ctx('/pinyin')
  var res = await M.onRequest(c)
  check('无 cookie 访问没开放的板块 → 原网址显示完整版说明页、不收录', res.status === 200 && c.calls.next === 0 &&
    c.calls.assets.some(function (u) { return /\/locked$/.test(u) }) && res.headers.get('X-Robots-Tag') === 'noindex')
  c = ctx('/mark')
  res = await M.onRequest(c)
  check('无 cookie 访问要登录的页面 → 302 首页', res.status === 302 && res.headers.get('Location').indexOf('/?next=') === 0 && c.calls.next === 0)

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

  c = ctx('/mark', oldPw)
  check('改过密码的旧登录态 → 拦', (await M.onRequest(c)).status === 302)
  c = ctx('/mark', banned)
  check('停用账号 → 拦', (await M.onRequest(c)).status === 302)
  c = ctx('/mark', forged)
  check('伪造签名 → 拦', (await M.onRequest(c)).status === 302)
  c = ctx('/mark', kicked)
  check('被第 4 台挤掉的设备 → 拦', (await M.onRequest(c)).status === 302)
  c = ctx('/', kicked)
  res = await M.onRequest(c)
  check('被挤掉的设备回首页 → 登录页知道是被挤掉的', res.status === 200 && ((await res.text()).indexOf('"kicked":true') >= 0 || typeof HTMLRewriter === 'undefined'))
  c = ctx('/mark', noSid)
  check('没有设备记录的旧登录 → 拦（上线后都重新登录一次）', (await M.onRequest(c)).status === 302)
  c = ctx('/mark', otherSid)
  check('拿别的账号的设备记录 → 拦', (await M.onRequest(c)).status === 302)
  dbDown = true
  c = ctx('/mark', good)
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
  c = ctx('/mark', null, 'abc123.lianxizhi.pages.dev')
  res = await M.onRequest(c)
  check('预览部署地址不跳', res.status === 302 && res.headers.get('Location').indexOf('/?next=') === 0)
  var MV = await import('../server/move.js')
  check('过渡期结束（hard）：已登录也直接跳', MV.moveDecision('lianxizhi.pages.dev', '/kousuan', '', true, true, 'hard').action === 'redirect')
  check('退回旧地址（off）：都不跳', MV.moveDecision('lianxizhi.pages.dev', '/kousuan', '', true, false, 'off') === null)
  check('已登录过渡期：注入的跳转地址带原路径', MV.moveDecision('lianxizhi.pages.dev', '/mark', '?id=abc', true, true, 'soft').to === 'https://zhihebi.com/mark?id=abc')

  console.log(bad ? '---- 登录门槛有 ' + bad + ' 条没过' : '✓ 登录门槛全部通过')
  process.exit(bad ? 1 : 0)
}).catch(function (e) { console.error(e); process.exit(1) })
