/* 更新记录（js/changelog.js）格式：日期合法、新的在前、不重复、每条都有内容。node 直跑。 */
'use strict'

var ok = 0, bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) }
  else { bad++; console.log('✗', name, extra === undefined ? '' : String(extra)) }
}

var list = require('../js/changelog.js').list
check('至少有一条', Array.isArray(list) && list.length > 0)
var badDate = list.filter(function (e) {
  return !/^\d{4}-\d{2}-\d{2}$/.test(e.date) || isNaN(Date.parse(e.date + 'T00:00:00Z'))
})
check('日期都是 YYYY-MM-DD', badDate.length === 0, badDate.map(function (e) { return e.date }))
var order = list.every(function (e, i) { return i === 0 || list[i - 1].date > e.date })
check('新的在前，同一天只一条', order)
var empty = list.filter(function (e) {
  return !Array.isArray(e.items) || !e.items.length ||
    e.items.some(function (t) { return typeof t !== 'string' || !t.trim() || /[<>]/.test(t) })
})
check('每条有内容、不夹 HTML', empty.length === 0, empty.map(function (e) { return e.date }))

console.log('\n' + ok + ' passed, ' + bad + ' failed')
process.exit(bad ? 1 : 0)
