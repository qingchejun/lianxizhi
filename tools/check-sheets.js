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

/* ---------- 口算 ---------- */
require('../js/settings.js')
require('../js/generator.js')
var G = globalThis.SumSum.generator
var KS = globalThis.SumSum.settings
check(C.kousuanCat({ tokens: [8, '+', 5] }) === 'carry', '8+5 进位')
check(C.kousuanCat({ tokens: [13, '−', 5] }) === 'borrow', '13-5 退位')
check(C.kousuanCat({ tokens: [12, '+', 3] }) === 'plain', '12+3 不进位')
check(C.kousuanCat({ tokens: [3, '×', 4] }) === 'mul', '乘')
check(C.kousuanCat({ tokens: [12, '÷', 4] }) === 'div', '除')
check(C.kousuanCat({ tokens: [3, '+', 4, '−', 2] }) === 'mixed', '混合')

var base = Object.assign({}, KS.DEFAULTS, { mode: 'addsub', min: 0, max: 20, count: 20, carryMode: 'random', seed: 42 })
var plain = G.generate(base).questions.map(function (q) { return q.key })
var same = G.generate(Object.assign({}, base, { mustInclude: [], carryOverride: null })).questions.map(function (q) { return q.key })
check(JSON.stringify(plain) === JSON.stringify(same), '不传新参数时出题变了')
var withMust = G.generate(Object.assign({}, base, { mustInclude: ['8 + 5', '99 + 99', '13 − 5'] })).questions.map(function (q) { return q.key })
check(withMust.indexOf('8 + 5') >= 0 && withMust.indexOf('13 − 5') >= 0, '必含错题没出现 ' + withMust)
check(withMust.indexOf('99 + 99') < 0, '超范围的必含题不该出现')
check(withMust.length === 20, '必含后题量不对 ' + withMust.length)
check(new Set(withMust).size === withMust.length, '必含后出现重复题')
var mulOnly = G.generate(Object.assign({}, base, { mode: 'mul', mulMin: 1, mulMax: 9, mustInclude: ['8 + 5', '3 × 4'] })).questions.map(function (q) { return q.key })
check(mulOnly.indexOf('8 + 5') < 0 && mulOnly.indexOf('3 × 4') >= 0, '必含题要符合当前题型')
var carryQs = G.generate(Object.assign({}, base, { carryMode: 'nocarry', carryOverride: 'carryonly' })).questions
check(carryQs.every(function (q) { var c = C.kousuanCat(q); return c === 'carry' || c === 'borrow' }), '临时进位模式没生效')

var items = C.kousuanItems([{ key: '8 + 5', tokens: [8, '+', 5] }, { key: '13 − 5', tokens: [13, '−', 5] }, { key: '2 + 3', tokens: [2, '+', 3] }])
check(items.length === 3 && items[0].cat === 'carry' && items[0].label === '8 + 5 =', 'kousuanItems ' + JSON.stringify(items[0]))
var last = rec('k00001', 'kousuan', '2026-11-23', NOW, {
  items: items,
  wrong: ['8 + 5', '13 − 5', '2 + 3'],
  rating: { all: { level: 'ok', auto: true, at: NOW } }
})
var nx = C.kousuanNext(last, base)
check(nx.mustInclude.length === 3 && nx.carryOverride === 'carrymore', '口算下一张规则 ' + JSON.stringify(nx))
check(C.kousuanNext(null, base).mustInclude.length === 0 && C.kousuanNext(null, base).carryOverride === null, '没打过分就不调整')
check(C.kousuanNext(last, Object.assign({}, base, { carryMode: 'carryonly' })).carryOverride === null, 'carryonly 不再覆盖')
var bad = rec('k00002', 'kousuan', '2026-11-23', NOW, { rating: { all: { level: 'bad', at: NOW } } })
check(C.kousuanNext(bad, base).carryOverride === 'carrymore', '整张不会→多出进退位')
var good = rec('k00003', 'kousuan', '2026-11-23', NOW, { rating: { all: { level: 'good', at: NOW } } })
check(C.kousuanNext(good, base).carryOverride === null, '会了不加难')
var many = rec('k00004', 'kousuan', '2026-11-23', NOW, { items: [], wrong: ['1 + 1', '1 + 2', '1 + 3', '1 + 4', '1 + 5', '1 + 6', '1 + 7'], rating: { all: { level: 'bad', at: NOW } } })
check(C.kousuanNext(many, base).mustInclude.length === 5, '错题最多带 5 道')

var r1 = rec('k00005', 'kousuan', '2026-11-22', NOW - 1000, { ref: { preset: '10以内加减' }, rating: { all: { level: 'good', at: NOW - 1000 } } })
var r2 = rec('k00006', 'kousuan', '2026-11-23', NOW, { ref: { preset: '10以内加减' }, rating: { all: { level: 'good', at: NOW } } })
check(C.kousuanUpgrade([r2, r1], KS.PRESETS) === '20以内进退位', '升档提示')
check(C.kousuanUpgrade([r2], KS.PRESETS) === null, '一张会了不提示')
var r3 = rec('k00007', 'kousuan', '2026-11-23', NOW, { ref: { preset: '四则入门' }, rating: { all: { level: 'good', at: NOW } } })
var r4 = rec('k00008', 'kousuan', '2026-11-22', NOW - 1000, { ref: { preset: '四则入门' }, rating: { all: { level: 'good', at: NOW - 1000 } } })
check(C.kousuanUpgrade([r3, r4], KS.PRESETS) === null, '最后一档不再提示')
check(C.kousuanUpgrade([r2, r4], KS.PRESETS) === null, '两张预设不同不提示')

/* 下一张用哪次打分：打过分后又打印了新纸就不再用 */
var ra = rec('u00001', 'kousuan', '2026-11-23', NOW - 5000, { rating: { all: { level: 'bad', at: NOW - 4000 } } })
var rb = rec('u00002', 'kousuan', '2026-11-23', NOW - 3000)
check(C.lastRatedUnused([ra], 'kousuan') === ra, '打分后没打印新纸 → 用它')
check(C.lastRatedUnused([ra, rb], 'kousuan') === null, '之后打印过新纸 → 不再用')
check(C.lastRatedUnused([ra], 'aoshu') === null, '只看本板块')

/* ---------- 奥数 ---------- */
var s0 = { learned: ['a'], due: ['b'] }
var s1 = C.aoshuApply(s0, { a: 'good', b: 'good', c: 'ok', d: 'bad' }, ['e'])
check(s1.learned.slice().sort().join() === 'a,b,c', '奥数已学 ' + s1.learned)
check(s1.due.slice().sort().join() === 'c,e', '奥数待复习 ' + s1.due)
check(s0.due.join() === 'b' && s0.learned.join() === 'a', '不能改入参')
var ap = C.aoshuDiff(s0, s1)
var back = C.aoshuRevert(s1, ap)
check(back.learned.slice().sort().join() === 'a' && back.due.slice().sort().join() === 'b', '奥数撤回不对 ' + JSON.stringify(back))
/* 改档：先撤回再作用，不叠加 */
var s2 = C.aoshuApply(back, { c: 'bad' }, [])
check(s2.learned.indexOf('c') < 0 && s2.due.indexOf('c') < 0, '改成不会后 c 不该留在已学/待复习')
var sBad = C.aoshuApply({ learned: ['x'], due: [] }, { x: 'bad' }, [])
check(sBad.learned.indexOf('x') >= 0, '不会不删以前标的已学')

/* ---------- 游戏 ---------- */
var h = C.gameStep('huochai', { level: 'L2' }, 'good')
check(h.next.level === 'L3' && h.changed && h.prev.level === 'L2', '火柴升关')
check(C.gameStep('huochai', { level: 'L4' }, 'good').changed === false, '到顶不动')
check(C.gameStep('mima', { level: 'L1' }, 'bad').changed === false, '到底不动')
check(C.gameStep('migong', { level: 'L3' }, 'bad').next.level === 'L2', '迷宫降关')
check(C.gameStep('zhizhi', { level: 'L2' }, 'ok').changed === false, '刚好不变')
var sd = C.gameStep('shudu', { shape: 's9', clues: 35 }, 'good', { min: 27, max: 50 })
check(sd.next.clues === 31 && sd.next.shape === 's9', '数独太简单少给提示 ' + sd.next.clues)
check(C.gameStep('shudu', { shape: 's4', clues: 12 }, 'bad', { min: 5, max: 12 }).changed === false, '数独到顶不动')
check(C.gameStep('shudu', { shape: 's4', clues: 6 }, 'good', { min: 5, max: 12 }).next.clues === 5, '数独不低于下限')
check(C.gameLevelText('huochai', { level: 'L3' }) === '第 3 关' && C.gameLevelText('shudu', { clues: 31 }) === '31 个提示数', 'gameLevelText')

/* ---------- 二维码 ---------- */
globalThis.qrcode = require('../js/vendor/qrcode.js')
require('../js/sheets.js')
var Q = globalThis.SumSum.sheets
var svg1 = Q.qrSvg('https://example.test/mark?id=abc234')
check(/^<svg[^>]*viewBox="0 0 \d+ \d+"/.test(svg1) && svg1.indexOf('<path') > 0, '二维码 SVG 格式 ' + svg1.slice(0, 80))
check(svg1 === Q.qrSvg('https://example.test/mark?id=abc234'), '同一网址二维码要相同')
check(svg1 !== Q.qrSvg('https://example.test/mark?id=abc235'), '不同网址二维码要不同')
check(Q.today(new Date(2026, 0, 5)) === '2026-01-05', 'today 补零')

if (problems.length) {
  console.log('✗ ' + problems.length + ' 处不对：\n  ' + problems.join('\n  '))
  process.exit(1)
}
console.log('✓ sheets 校验通过')
