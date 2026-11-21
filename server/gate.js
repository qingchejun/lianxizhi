/**
 * 登录门槛的规则（纯函数，tools/check-gate.js 校验）。
 * 没登录：首页显示介绍兼登录页（对谷歌公开、可收录）；其余页面一律 302 回首页，带上 next=原址，
 * 登录后回原页。静态资源与接口放行——接口各自验登录（requireSession），页面里的数据也只在登录后拉取。
 */
const PUBLIC_PREFIXES = ['/api/', '/css/', '/js/', '/fonts/']
const PUBLIC_FILES = ['/robots.txt', '/favicon.ico']
const HOME = ['/', '/index', '/index.html']
const WELCOME = ['/welcome', '/welcome.html']

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

export function decide(path, search, loggedIn) {
  if (suspicious(path)) return { action: 'deny' }
  if (DENY_PREFIXES.some(p => path.startsWith(p)) || DENY_FILES.includes(path) ||
      (DENY_EXT.test(path) && !path.startsWith('/fonts/'))) return { action: 'deny' }
  if (PUBLIC_PREFIXES.some(p => path.startsWith(p)) || PUBLIC_FILES.includes(path)) return { action: 'pass', asset: true }
  /* 介绍页只经由首页出现，不单独开一个网址（避免同一内容两个网址被收录） */
  if (WELCOME.includes(path)) return { action: 'redirect', location: '/' }
  if (loggedIn) return { action: 'pass' }
  if (path === '/') return { action: 'welcome' }
  /* /index、/index.html 与 / 同内容：没登录时并到 /，只留一个网址给谷歌 */
  if (HOME.includes(path)) return { action: 'redirect', location: '/' + (search || '') }
  return { action: 'redirect', location: '/?next=' + encodeURIComponent(path + (search || '')) }
}
