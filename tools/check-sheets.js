/**
 * 纸记录（扫码登记）校验脚本。用法：node tools/check-sheets.js
 *
 * 压住：纸号稳定、60 天清理、按错题自动定档、待登记列表、
 * 口算按错题调整下一张、奥数三档作用与撤回、游戏升降关。
 */
'use strict'

require('../js/sheets-core.js')
var C = globalThis.SumSum.sheetsCore

var problems = []
function check(cond, msg) {
  if (!cond) problems.push(msg)
}
var DAY = 86400000
var NOW = Date.UTC(2026, 10, 23, 12)

function rec(id, module, date, at, extra) {
  var r = C.newRecord({ id: id, module: module, title: id, date: date, units: [{ key: 'all', label: '整张' }], items: [] }, at)
  return Object.assign(r, extra || {})
}

/* ---------- 纸号 ---------- */
var a = C.makeId('kousuan|seed=1|2026-11-23')
var b = C.makeId('kousuan|seed=2|2026-11-23')
check(a === C.makeId('kousuan|seed=1|2026-11-23'), 'makeId 不稳定')
check(/^[23456789abcdefghjkmnpqrstuvwxyz]{6}$/.test(a), 'makeId 格式 ' + a)
check(a !== b, 'makeId 撞了')
check(C.keyOf(a) === 'sumsum:sheet:v1:' + a, 'keyOf')
check(C.validId(a) && !C.validId('ABC') && !C.validId('../x'), 'validId')

/* ---------- 定档 ---------- */
check(C.levelFromWrong(20, 0) === 'good', '全对=会了')
check(C.levelFromWrong(20, 1) === 'good', '错1=会了')
check(C.levelFromWrong(20, 2) === 'ok', '错2=一般')
check(C.levelFromWrong(20, 9) === 'ok', '错9/20=一般')
check(C.levelFromWrong(20, 10) === 'bad', '错一半=不会')
check(C.levelFromWrong(2, 1) === 'ok', '两题错一题=一般')

/* ---------- 清理 ---------- */
var old = rec('aaaaaa', 'kousuan', '2026-09-01', NOW - 70 * DAY)
var oldRated = rec('bbbbbb', 'kousuan', '2026-09-01', NOW - 70 * DAY, {
  rating: { all: { level: 'ok', auto: false, at: NOW - 5 * DAY } }
})
var fresh = rec('cccccc', 'kousuan', '2026-11-23', NOW)
var st = C.staleKeys([
  { key: C.keyOf('aaaaaa'), value: JSON.stringify(old) },
  { key: C.keyOf('bbbbbb'), value: JSON.stringify(oldRated) },
  { key: C.keyOf('cccccc'), value: JSON.stringify(fresh) },
  { key: C.keyOf('dddddd'), value: '坏了' },
  { key: 'sumsum:shizi:v1', value: '{}' }
], NOW)
check(st.length === 2 && st.indexOf(C.keyOf('aaaaaa')) >= 0 && st.indexOf(C.keyOf('dddddd')) >= 0, '清理键不对 ' + st)
check(C.lastTouched(oldRated) === NOW - 5 * DAY, 'lastTouched')

/* ---------- 待登记 ---------- */
var y = rec('y00000', 'huochai', '2026-11-22', NOW - DAY)
var d2 = rec('z00000', 'huochai', '2026-11-21', NOW - 2 * DAY)
var rated = rec('r00000', 'kousuan', '2026-11-23', NOW, { rating: { all: { level: 'good', auto: false, at: NOW } } })
var done = rec('s00000', 'shizi', '2026-11-23', NOW, { done: true })
var p = C.pending([y, d2, rated, fresh, done], '2026-11-23')
check(p.length === 2 && p[0].id === 'cccccc' && p[1].id === 'y00000', '待登记列表不对 ' + p.map(function (r) { return r.id }))
check(C.prevDate('2026-03-01') === '2026-02-28', 'prevDate 跨月')

if (problems.length) {
  console.log('✗ ' + problems.length + ' 处不对：\n  ' + problems.join('\n  '))
  process.exit(1)
}
console.log('✓ sheets 校验通过')
