/* 静态文件指纹（tools/stamp-assets.js）与长期缓存规则（server/gate.js assetCacheControl）的校验。node 直跑。 */
'use strict'

var ok = 0, bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) }
  else { bad++; console.log('✗', name, extra === undefined ? '' : String(extra)) }
}

var S = require('./stamp-assets.js')
var H = { 'js/a.js': 'aaaaaaaaaa', 'css/app.css': 'cccccccccc', 'fonts/f.woff2': 'ffffffffff', 'icons/i.svg': '1111111111' }
function lookup(rel) { return H[rel] || null }

/* --- 页面 --- */
var missing = []
var html = [
  '<script src="js/a.js"></script>',
  '<link rel="stylesheet" href="/css/app.css" />',
  '<link rel="icon" href="icons/i.svg?v=53" />',
  '<a href="/kousuan">口算</a>',
  '<a href="https://example.com/js/a.js">外链</a>',
  '<script src="js/gone.js"></script>',
  "<img src='icons/i.svg#x'>"
].join('\n')
var out = S.rewriteHtml(html, lookup, missing)
check('本地脚本盖章', out.indexOf('src="js/a.js?v=aaaaaaaaaa"') >= 0, out)
check('根路径写法也盖', out.indexOf('href="/css/app.css?v=cccccccccc"') >= 0)
check('旧的手写 v= 换成内容指纹', out.indexOf('icons/i.svg?v=1111111111"') >= 0 && out.indexOf('v=53') < 0)
check('页面跳转不动', out.indexOf('href="/kousuan"') >= 0)
check('外链不动', out.indexOf('href="https://example.com/js/a.js"') >= 0)
check('找不到的文件不动并报出来', out.indexOf('src="js/gone.js"') >= 0 && missing.indexOf('js/gone.js') >= 0)
check('单引号与 #片段 保留', out.indexOf("src='icons/i.svg?v=1111111111#x'") >= 0, out)
check('幂等：再盖一遍不变', S.rewriteHtml(out, lookup, []) === out)

/* --- 样式表 --- */
var css = '@font-face{src:url("../fonts/f.woff2") format("woff2")}\n.a{background:url("data:image/svg+xml,%3Csvg%3E")}\n.b{background:url(../icons/i.svg)}'
var cssOut = S.rewriteCss(css, 'css', lookup, [])
check('css 里的字体盖章', cssOut.indexOf('url("../fonts/f.woff2?v=ffffffffff")') >= 0, cssOut)
check('css 无引号写法也盖', cssOut.indexOf('url(../icons/i.svg?v=1111111111)') >= 0, cssOut)
check('data: 内嵌图不动', cssOut.indexOf('url("data:image/svg+xml,%3Csvg%3E")') >= 0)
check('越出站点根的路径不管', S.resolveRef('../../x.js', 'css') === null)
check('其余查询参数保留', S.withVersion('js/a.js?x=1&v=old', 'abc123') === 'js/a.js?x=1&v=abc123')

/* --- 缓存规则 --- */
import('../server/gate.js').then(function (G) {
  var c = G.assetCacheControl
  check('带指纹的 200 → 缓存一年', c('?v=aaaaaaaaaa', 200) === G.IMMUTABLE)
  check('带指纹的 304 → 缓存一年', c('?v=aaaaaaaaaa', 304) === G.IMMUTABLE)
  check('没指纹 → 不改（保持每次确认）', c('', 200) === null)
  check('手写的非指纹 v= 不算', c('?v=53', 200) === null && c('?v=sanjiao', 200) === null)
  check('404 不给长期缓存', c('?v=aaaaaaaaaa', 404) === null)

  /* --- 仓库现状：所有页面都已盖好最新指纹 --- */
  var r = require('child_process').spawnSync(process.execPath, [require('path').join(__dirname, 'stamp-assets.js'), '--check'], { encoding: 'utf8' })
  check('仓库里的页面指纹都是最新的', r.status === 0, r.stdout)
  check('没有引用了却不存在的文件', r.stdout.indexOf('找不到') < 0, r.stdout)

  console.log('\n' + ok + ' 通过，' + bad + ' 失败')
  process.exit(bad ? 1 : 0)
})
