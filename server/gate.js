/**
 * 登录门槛的规则（纯函数，tools/check-gate.js 校验）。
 * 没登录：首页显示介绍兼登录页（对谷歌公开、可收录）；GUEST_PAGES 里的板块页照常打开；其余页面一律 302 回首页（免费版账号见 FREE_PAGES），带上 next=原址，
 * 登录后回原页。静态资源与接口放行——接口各自验登录（requireSession），页面里的数据也只在登录后拉取。
 */
const PUBLIC_PREFIXES = ['/api/', '/css/', '/js/', '/fonts/', '/icons/', '/img/', '/v/', '/nx/'] /* /v/ 是奥数视频，functions/v 自己验登录和版本；/nx/ 是访问统计转发（server/stats.js） */
const PUBLIC_FILES = ['/robots.txt', '/sitemap.xml', '/favicon.ico'] /* 给搜索引擎的两份文件优先于下面按扩展名的拒绝 */
const HOME = ['/', '/index', '/index.html']
const WELCOME = ['/welcome', '/welcome.html']
/* 没登录也能出题、打印的板块页（2026-11-24 先开口算和数独；11-25 游戏组火柴、密码、迷宫、数织一起开）：纸上不印二维码、不记录，
   扫码打分、错哪练哪、保存进度仍要登录（js/sheets.js）。要开放新板块就往这里加 */
const GUEST_PAGES = ['/kousuan', '/shudu', '/huochai', '/mima', '/migong', '/zhizhi', '/privacy', '/terms', '/kousuan/coushifa', '/kousuan/poshifa', '/aoshu', '/help']
/* 内页：网址挂在板块下面，文件放在根目录（相对路径、盖指纹、侧栏脚本都只认根目录的 html）。
   中间层按这张表去取文件；文件自己的网址（/coushifa）301 到正式网址，同一内容只留一个网址 */
export const INNER_PAGES = { '/kousuan/coushifa': '/coushifa', '/kousuan/poshifa': '/poshifa' }
/* 免费版账号能打开的网页（白名单，2026-11-24 放开注册）：其余网页一律显示上锁说明页。
   用白名单而不是「锁哪几个」：以后新加的板块默认就是完整版专属，不会忘了锁 */
const FREE_PAGES = ['/', '/index', '/kousuan', '/shudu', '/huochai', '/mima', '/migong', '/zhizhi', '/mark', '/help', '/privacy', '/terms', '/404', '/kousuan/coushifa', '/kousuan/poshifa', '/aoshu',
  '/shizi', '/pinyin'] /* 2026-11-27：识字、拼音对免费版开放（每日一卷 / 今日卷），写字、单元检查、专题、课程在页面里锁 */
/* 完整版板块（2026-11-25 整站结构）：没登录的人打开时不再带回首页，在原网址显示「完整版」说明页（不收录），
   侧栏、首页都能点进来看这个板块是什么。开放给没登录的人时，从这里挪到 GUEST_PAGES / FREE_PAGES */
const FULL_BOARDS = ['/shizi', '/pinyin'] /* 奥数 11-25 起前三课公开（页面里锁后面的课），挪进上面两张表 */
/* 上锁说明页只由中间层在原网址上显示，不单独开网址 */
const LOCKED = ['/locked', '/locked.html']

/* 网址规整成一种写法再比：去掉末尾的 /、去掉 .html（/aoshu/、/aoshu.html、/aoshu.html/ 都是 /aoshu） */
export function pagePath(path) {
  let p = String(path || '/')
  p = p.replace(/\/+$/, '')
  p = p.replace(/\.html$/i, '')
  p = p.replace(/\/+$/, '')
  return p || '/'
}

/* 站点根目录就是仓库根目录：源码、脚本、文档、配置都在里面，登没登录都不给 */
const DENY_PREFIXES = ['/server/', '/tools/', '/docs/', '/functions/', '/node_modules/', '/.']
const DENY_FILES = ['/wrangler.toml', '/_headers', '/_redirects', '/_routes.json', '/package.json']
const DENY_EXT = /\.(md|sql|toml|py|sh|txt|json|log)$/i

/* 路径里任何编码过的 / \ . 以及解码后的 .. 一律拒：静态文件服务器会把 %2f 解开，
   /js/..%2fserver/x 在规则看来是 /js/ 下的文件，实际却读到了 /server/x（2026-11-21 本机实测过） */
function suspicious(path) {
  if (/%(2f|5c|2e|25)/i.test(path)) return true
  let plain
  try { plain = decodeURIComponent(path) } catch (e) { return true }
  return plain.includes('..') || plain.includes('\\') || plain.includes('//')
}

/* 静态文件的缓存：带内容指纹（?v=，tools/stamp-assets.js 盖的）的缓存一年且不再回源确认——
   文件一改指纹就变，页面会引用新地址。没带指纹的返回 null，保持 _headers 里的"每次确认"，
   免得哪个漏盖章的文件被浏览器死死记住一年（2026-11-10 识字页新旧混跑的教训）。 */
export const IMMUTABLE = 'public, max-age=31536000, immutable'
export function assetCacheControl(search, status) {
  if (status !== 200 && status !== 304) return null /* 304 也给：ETag 已证明内容相同，顺便把浏览器旧记录升级成长期缓存 */
  return /(?:^\?|&)v=[0-9a-f]{6,}(?:&|$)/.test(search || '') ? IMMUTABLE : null
}

/* me：登录信息（{ ok, plan }）；老调用传 true / false 也认（true = 完整版） */
export function decide(path, search, me) {
  const loggedIn = typeof me === 'object' && me !== null ? !!me.ok : !!me
  const plan = typeof me === 'object' && me !== null && me.plan === 'free' ? 'free' : 'full'
  if (suspicious(path)) return { action: 'deny' }
  if (PUBLIC_FILES.includes(path)) return { action: 'pass', asset: true }
  if (DENY_PREFIXES.some(p => path.startsWith(p)) || DENY_FILES.includes(path) ||
      (DENY_EXT.test(path) && !path.startsWith('/fonts/'))) return { action: 'deny' }
  if (PUBLIC_PREFIXES.some(p => path.startsWith(p)) || PUBLIC_FILES.includes(path)) return { action: 'pass', asset: true }
  /* 介绍页只经由首页出现，不单独开一个网址（避免同一内容两个网址被收录） */
  if (WELCOME.includes(path) || LOCKED.includes(path)) return { action: 'redirect', location: '/' }
  const page = pagePath(path)
  const canonical = Object.keys(INNER_PAGES).find(k => INNER_PAGES[k] === page)
  if (canonical) return { action: 'moved', location: canonical + (search || '') }
  const file = INNER_PAGES[page] /* 内页：放行时带上要取的文件 */
  if (loggedIn) {
    if (plan === 'free' && !FREE_PAGES.includes(page)) return { action: 'locked' }
    return file ? { action: 'pass', file: file } : { action: 'pass' }
  }
  if (GUEST_PAGES.includes(page)) return file ? { action: 'pass', file: file } : { action: 'pass' }
  if (FULL_BOARDS.includes(page)) return { action: 'locked' }
  if (path === '/') return { action: 'welcome' }
  /* /index、/index.html 与 / 同内容：没登录时并到 /，只留一个网址给谷歌 */
  if (HOME.includes(path)) return { action: 'redirect', location: '/' + (search || '') }
  return { action: 'redirect', location: '/?next=' + encodeURIComponent(path + (search || '')) }
}
