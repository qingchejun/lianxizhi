/**
 * 纸记录（扫码登记）校验脚本。用法：node tools/check-sheets.js
 *
 * 压住：纸号稳定、60 天清理、按错题自动定档、待打分列表（只练习四板块、2 天内、按板块）与历史、
 * 全对 / 点错题提交、拼音提交换算、口算按错题调整下一张、奥数作用与撤回。游戏 2026-11-27 起不打分。
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

/* ---------- 待打分 / 历史 ---------- */
var y = rec('y00000', 'kousuan', '2026-11-22', NOW - DAY)
var d2 = rec('z00000', 'kousuan', '2026-11-21', NOW - 2 * DAY)
var game = rec('g00000', 'huochai', '2026-11-23', NOW)
var rated = rec('r00000', 'kousuan', '2026-11-23', NOW, { rating: { all: { level: 'good', auto: false, at: NOW } } })
var done = rec('s00000', 'shizi', '2026-11-23', NOW, { done: true })
var szPend = rec('s00001', 'shizi', '2026-11-23', NOW - 10)
var skipped = rec('k00000', 'kousuan', '2026-11-23', NOW, { done: true, skipped: true })
var all5 = [y, d2, game, rated, fresh, done, szPend, skipped]
var p = C.pending(all5, '2026-11-23')
check(p.map(function (r) { return r.id }).join() === 'cccccc,s00001,y00000', '待打分列表不对 ' + p.map(function (r) { return r.id }))
check(C.pending(all5, '2026-11-23', 'shizi').map(function (r) { return r.id }).join() === 's00001', '按板块过滤')
check(C.pending(all5, '2026-11-23', 'huochai').length === 0, '游戏不进待打分')
check(C.prevDate('2026-03-01') === '2026-02-28', 'prevDate 跨月')
var hist = C.history(all5, 'kousuan')
check(hist.length === 5 && hist[hist.length - 1].id === 'z00000', '历史含打过分和超过 2 天的 ' + hist.map(function (r) { return r.id }))
check(C.resultText(rated) === '全对' && C.resultText(y) === '没打分' && C.resultText(skipped) === '没打分', 'resultText')
check(C.resultText(rec('w', 'kousuan', '2026-11-23', NOW, { rating: { all: { level: 'ok', at: NOW } }, wrong: ['a', 'b'] })) === '错 2 题', 'resultText 错题')
check(!C.isPractice('shudu') && C.isPractice('pinyin'), 'isPractice')

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

/* ---------- 保存打分（登记页用）：写记录 + 作用到板块存储，改档不叠加 ---------- */
function memStore(init) {
  var m = {}
  Object.keys(init || {}).forEach(function (k) { m[k] = JSON.stringify(init[k]) })
  return {
    get: function (k) { return k in m ? JSON.parse(m[k]) : null },
    getString: function (k) { return k in m ? m[k] : null },
    set: function (k, v) { m[k] = JSON.stringify(v) },
    keys: function () { return Object.keys(m) }
  }
}
var LK = 'sumsum:aoshu:learned:v1'
var DK = 'sumsum:aoshu:review-due:v1'
var st1 = memStore({})
st1.set(LK, ['old'])
var ao = rec('a00001', 'aoshu', '2026-11-23', NOW, {
  units: [{ key: 't1', label: '一' }, { key: 't2', label: '二' }],
  items: [{ key: '1', label: '第 1 题', unit: 't1' }, { key: '2', label: '第 2 题', unit: 't2' }]
})
st1.set(C.keyOf(ao.id), ao)
var saved = C.saveRating(st1, ao, { t1: { level: 'good', auto: false }, t2: { level: 'ok', auto: true } }, ['2'], NOW)
check(st1.get(LK).slice().sort().join() === 'old,t1,t2', '奥数保存后已学 ' + st1.get(LK))
check(st1.get(DK).join() === 't2', '奥数保存后待复习 ' + st1.get(DK))
check(st1.get(C.keyOf(ao.id)).rating.t1.level === 'good' && st1.get(C.keyOf(ao.id)).wrong.join() === '2', '记录里有打分与错题')
C.saveRating(st1, st1.get(C.keyOf(ao.id)), { t1: { level: 'bad' }, t2: { level: 'bad' } }, [], NOW + 1000)
check(st1.get(LK).join() === 'old', '改成不会后撤回已学 ' + st1.get(LK))
check(st1.get(DK).length === 0, '改成不会后撤回待复习 ' + st1.get(DK))

var st5 = memStore({})
var kr = rec('k00009', 'kousuan', '2026-11-23', NOW, { items: [{ key: '8 + 5', cat: 'carry' }] })
C.saveRating(st5, kr, { all: { level: 'ok', auto: true } }, ['8 + 5'], NOW)
check(st5.get(C.keyOf(kr.id)).rating.all.at === NOW && st5.keys().length === 1, '口算只写记录')

/* ---------- 提交：全对 / 点错题 ---------- */
var st7 = memStore({})
var k20 = rec('k00020', 'kousuan', '2026-11-23', NOW, { items: [] })
for (var qi = 0; qi < 20; qi++) k20.items.push({ key: 'q' + qi, label: 'q' + qi, cat: 'plain' })
var sub1 = C.submit(st7, k20, [], NOW)
check(sub1.rating.all.level === 'good' && sub1.wrong.length === 0 && C.resultText(sub1) === '全对', '全对提交 ' + JSON.stringify(sub1.rating))
var sub2 = C.submit(st7, sub1, ['q1', 'q2', 'nope'], NOW + 1)
check(sub2.rating.all.level === 'ok' && sub2.wrong.join() === 'q1,q2', '点错题提交（不认识的 key 丢掉）' + JSON.stringify(sub2))
check(C.submit(st7, sub2, k20.items.slice(0, 10).map(function (i) { return i.key }), NOW + 2).rating.all.level === 'bad', '错一半 → bad')

var st8 = memStore({})
st8.set(LK, [])
var ao2 = rec('a00002', 'aoshu', '2026-11-23', NOW, {
  units: [{ key: 't1', label: '一' }, { key: 't2', label: '二' }],
  items: [{ key: '1', unit: 't1' }, { key: '2', unit: 't1' }, { key: '3', unit: 't1' }, { key: '4', unit: 't2' }, { key: '5', unit: 't2' }]
})
C.submit(st8, ao2, ['4', '5'], NOW)
check(st8.get(LK).join() === 't1', '奥数：t1 全对标已学、t2 全错不标 ' + st8.get(LK))
check((st8.get(DK) || []).join() === 't2', '奥数：错题所在课进待复习 ' + st8.get(DK))
C.submit(st8, st8.get(C.keyOf('a00002')), [], NOW + 1)
check(st8.get(LK).slice().sort().join() === 't1,t2' && st8.get(DK).length === 0, '改成全对：撤回再作用 ' + st8.get(LK) + '|' + st8.get(DK))
check(!st8.get(C.keyOf('a00002')).skipped, '提交后不再是没做')

/* ---------- 拼音提交换算 ---------- */
var py = {
  units: [{ key: 'g1', phase: 'independent' }, { key: 'g2', phase: 'independent' }, { key: 'g3', phase: 'observe' },
    { key: 'g4', phase: 'check', parent: 'g1' }, { key: 'g5', phase: 'check', parent: 'g2' }],
  items: [{ key: '1', unit: 'g1' }, { key: '2', unit: 'g1' }, { key: '3', unit: 'g2' }, { key: '4', unit: 'g3' },
    { key: '5', unit: 'g3' }, { key: '6', unit: 'g4' }, { key: '7', unit: 'g5' }]
}
var pr = C.pinyinResults(py, [])
check(pr['1'] === 'ok' && pr['3'] === 'ok' && pr['4'] === 'unpracticed' && pr['6'] === 'unpracticed' && pr['7'] === 'unpracticed', '拼音全对 ' + JSON.stringify(pr))
var pr2 = C.pinyinResults(py, ['2', '5'])
check(pr2['1'] === 'ok' && pr2['2'] === 'miss', '独立组点了 = miss ' + JSON.stringify(pr2))
check(pr2['6'] === 'ok' && pr2['7'] === 'unpracticed', '换题再试跟着卡住的那组 ' + JSON.stringify(pr2))
check(pr2['4'] === 'ok' && pr2['5'] === 'miss', '试一试点了错题才算做过 ' + JSON.stringify(pr2))
check(C.pinyinResults(py, ['7'])['7'] === 'miss', '换题再试自己点了错题也算做过')

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
