/* 给页面引用的静态文件盖"内容指纹"：src="js/x.js" → src="js/x.js?v=<内容哈希>"。
 * 配合 functions/_middleware.js：带 ?v= 的静态文件让浏览器缓存一年，文件一改指纹就变，
 * 浏览器自然去拿新的——既快（国内家长每次不必把几十个文件挨个去美国问一遍），
 * 又不会新旧文件混跑（2026-11-10 识字页空白就是混跑）。
 *
 * 用法：
 *   node tools/stamp-assets.js          盖章（改写根目录 *.html 与 css/*.css）
 *   node tools/stamp-assets.js --check  只检查，有没盖对的就列出来并以 1 退出（pre-commit 钩子用）
 *
 * 规则：
 *   页面里 src= / href= 指向 js/ css/ fonts/ icons/ 下本地文件的都盖；外链、页面跳转不动。
 *   css 里 url(../fonts/..) 这类也盖，并且先盖 css 再算 css 的指纹（字体变了，css 指纹也跟着变）。
 *   幂等：已有 ?v= 的会换成当前内容的指纹。 */
'use strict'

var fs = require('fs')
var path = require('path')
var crypto = require('crypto')

var ROOT = path.join(__dirname, '..')
var ASSET_DIRS = ['js', 'css', 'fonts', 'icons', 'img']

function hashOf(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10)
}

/* 把引用路径解析成站点内的相对路径（如 "js/x.js"）；不是我们管的静态文件就返回 null */
function resolveRef(ref, fromDir) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith('//') || ref.startsWith('#')) return null
  var clean = ref.split('#')[0].split('?')[0]
  if (!clean) return null
  var rel = clean.startsWith('/') ? clean.slice(1) : path.posix.normalize(path.posix.join(fromDir, clean))
  if (rel.startsWith('../')) return null
  var top = rel.split('/')[0]
  return ASSET_DIRS.indexOf(top) >= 0 ? rel : null
}

/* 去掉旧的 v= 参数，换成新的；其余查询参数保留 */
function withVersion(ref, v) {
  var hashIdx = ref.indexOf('#')
  var frag = hashIdx >= 0 ? ref.slice(hashIdx) : ''
  var noFrag = hashIdx >= 0 ? ref.slice(0, hashIdx) : ref
  var q = noFrag.indexOf('?')
  var base = q >= 0 ? noFrag.slice(0, q) : noFrag
  var params = q >= 0 ? noFrag.slice(q + 1).split('&').filter(function (p) { return p && !/^v=/.test(p) }) : []
  params.push('v=' + v)
  return base + '?' + params.join('&') + frag
}

/* lookup(rel) → 指纹或 null（文件不存在）。missing 收集引用了却找不到的文件 */
function rewriteHtml(html, lookup, missing) {
  return html.replace(/(\s(?:src|href)=)(["'])([^"']+)\2/g, function (all, attr, quote, ref) {
    var rel = resolveRef(ref, '')
    if (!rel) return all
    var v = lookup(rel)
    if (!v) { if (missing) missing.push(rel); return all }
    return attr + quote + withVersion(ref, v) + quote
  })
}

function rewriteCss(css, fromDir, lookup, missing) {
  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, function (all, quote, ref) {
    if (/^data:/i.test(ref)) return all
    var rel = resolveRef(ref, fromDir)
    if (!rel) return all
    var v = lookup(rel)
    if (!v) { if (missing) missing.push(rel); return all }
    return 'url(' + quote + withVersion(ref, v) + quote + ')'
  })
}

function run(check) {
  var cache = {}
  function lookup(rel) {
    if (rel in cache) return cache[rel]
    var p = path.join(ROOT, rel)
    cache[rel] = fs.existsSync(p) && fs.statSync(p).isFile() ? hashOf(fs.readFileSync(p)) : null
    return cache[rel]
  }
  var changed = [], missing = []

  /* 先 css（它引用字体），盖完再让 css 的指纹按新内容算 */
  var cssDir = path.join(ROOT, 'css')
  fs.readdirSync(cssDir).filter(function (f) { return f.endsWith('.css') }).forEach(function (f) {
    var p = path.join(cssDir, f)
    var src = fs.readFileSync(p, 'utf8')
    var out = rewriteCss(src, 'css', lookup, missing)
    if (out !== src) { changed.push('css/' + f); if (!check) fs.writeFileSync(p, out) }
    cache['css/' + f] = hashOf(Buffer.from(out, 'utf8'))
  })

  fs.readdirSync(ROOT).filter(function (f) { return f.endsWith('.html') }).forEach(function (f) {
    var p = path.join(ROOT, f)
    var src = fs.readFileSync(p, 'utf8')
    var out = rewriteHtml(src, lookup, missing)
    if (out !== src) { changed.push(f); if (!check) fs.writeFileSync(p, out) }
  })

  return { changed: changed, missing: Array.from(new Set(missing)) }
}

module.exports = { resolveRef: resolveRef, withVersion: withVersion, rewriteHtml: rewriteHtml, rewriteCss: rewriteCss, hashOf: hashOf }

if (require.main === module) {
  var check = process.argv.indexOf('--check') >= 0
  var r = run(check)
  if (r.missing.length) console.log('⚠ 引用了但找不到的文件：' + r.missing.join(', '))
  if (check) {
    if (r.changed.length) {
      console.log('✗ 这些文件的指纹没盖对（改了 js/css/字体/图标却没重盖）：\n  ' + r.changed.join('\n  ') +
        '\n请先运行：node tools/stamp-assets.js，再把改动加进这次提交。')
      process.exit(1)
    }
    console.log('✓ 静态文件指纹都是最新的')
  } else {
    console.log(r.changed.length ? '已盖章：' + r.changed.join(', ') : '指纹都是最新的，无需改动')
  }
}
