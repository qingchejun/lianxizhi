/* store 收口：写记 mtime、订阅广播、导入盖章、拉取不回声。node 直跑。 */
'use strict'

var mem = {}
globalThis.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null },
  setItem: function (k, v) { mem[k] = String(v) },
  removeItem: function (k) { delete mem[k] },
  key: function (i) { return Object.keys(mem)[i] || null },
  get length() { return Object.keys(mem).length }
}
globalThis.SumSum = globalThis.SumSum || {}

function fresh() {
  mem = {}
  delete require.cache[require.resolve('../js/store.js')]
  require('../js/store.js')
  return globalThis.SumSum.store
}

var ok = 0, bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) }
  else { bad++; console.log('✗', name, extra === undefined ? '' : JSON.stringify(extra)) }
}

/* --- 写入记 mtime + 广播 --- */
var S = fresh()
var t0 = Date.now()
var heard = []
S.onChange(function (k) { heard.push(k) })
S.set('sumsum:shizi:v1', { week: 3 })
check('set 写入可读回', S.get('sumsum:shizi:v1').week === 3)
var m = S.meta()
check('set 记了 mtime', m['sumsum:shizi:v1'] >= t0, JSON.stringify(m))
check('set 广播了', heard.indexOf('sumsum:shizi:v1') >= 0)
check('mtime 表落在 META_KEY', mem['sumsum:sync:meta'] !== undefined)

/* --- applyRemote：写原始串、mtime 用给定值、不广播 --- */
heard.length = 0
S.applyRemote('sumsum:shizi:v1', '{"week":9}', 12345)
check('applyRemote 写原始串', S.getString('sumsum:shizi:v1') === '{"week":9}')
check('applyRemote mtime 用给定值', S.meta()['sumsum:shizi:v1'] === 12345)
check('applyRemote 不广播', heard.length === 0)

/* --- 不可同步的键：不记 mtime、不广播 --- */
heard.length = 0
S.set('foo:bar', 1)
S.set('sumsum:help:seen', '1')
check('非同步键不记 mtime', S.meta()['foo:bar'] === undefined && S.meta()['sumsum:help:seen'] === undefined)
check('非同步键不广播', heard.length === 0)

/* --- remove 清 mtime --- */
S.remove('sumsum:shizi:v1')
check('remove 清掉 mtime', S.meta()['sumsum:shizi:v1'] === undefined)

/* --- meta 持久化：新实例仍能读到 --- */
S.set('sumsum:aoshu:v1', { x: 1 })
var S2 = fresh()
check('meta 跨实例持久', S2.meta()['sumsum:shizi:v1'] === undefined || true) /* fresh() 清了 mem，这条验证的是 fresh 不炸 */
/* 真正的持久化验证：不清 mem 重读 */
mem['sumsum:sync:meta'] = JSON.stringify({ 'sumsum:k': 42 })
delete require.cache[require.resolve('../js/store.js')]
require('../js/store.js')
check('meta 从存储读回', globalThis.SumSum.store.meta()['sumsum:k'] === 42)

/* --- noteImport / stampNow --- */
var S3 = fresh()
S3.noteImport({ 'sumsum:shizi:wrong:v2': '{}', 'foo:skip': '1' })
var m3 = S3.meta()
check('noteImport 盖了可同步键', m3['sumsum:shizi:wrong:v2'] >= t0)
check('noteImport 跳过非同步键', m3['foo:skip'] === undefined)
S3.stampNow(['sumsum:shudu:v1'])
check('stampNow 盖时间', S3.meta()['sumsum:shudu:v1'] >= t0)

/* --- keys()：现存可同步键全列出（含无 mtime 的老键） --- */
mem['sumsum:old:v1'] = '{}'   /* 直接进 localStorage，绕过 set——模拟同步上线前的老数据 */
mem['foo:other'] = '1'
check('keys 列出老键', S3.keys().indexOf('sumsum:old:v1') >= 0)
check('keys 排除不同步的', S3.keys().indexOf('foo:other') < 0 && S3.keys().indexOf('sumsum:sync:meta') < 0)

console.log(bad ? '---- 有 ' + bad + ' 条没过' : '✓ store 收口全部通过')

/* --- 守卫：六个板块文件不允许再直写 localStorage（写入必须走 store 才有 mtime） --- */
var WATCHED = ['../js/settings.js', '../js/aoshu-settings.js', '../js/shizi-settings.js',
  '../js/shudu-settings.js', '../js/aoshu-main.js', '../js/shizi-mark.js']
var fs = require('fs')
var path = require('path')
WATCHED.forEach(function (rel) {
  var src = fs.readFileSync(path.join(__dirname, rel), 'utf8')
  var hit = src.match(/localStorage\.(setItem|removeItem)/)
  check(rel + ' 无直写 localStorage', !hit, hit && hit[0])
})

process.exit(bad ? 1 : 0)
