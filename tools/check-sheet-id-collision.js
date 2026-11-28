'use strict'
/*
 * 2026-11-28 修的 bug：识字每日一卷学过的字少时，前后两张卷的字可能一模一样；同一天里（今天还能预出明天的卷）
 * 纸号只由「板块 + 字 + 打印日期」算，新卷撞上已打过分的旧卷，一打开就显示「已打分」、打不了分。
 * 现在：撞上的是别的卷（ref.d 不同）才另起号；同一张卷重复打印号不变。
 * node tools/check-sheet-id-collision.js
 */
const assert = require('node:assert/strict')
const data = {}
globalThis.SumSum = { store: { get: k => (k in data ? JSON.parse(data[k]) : null), set: (k, v) => { data[k] = JSON.stringify(v) } } }
require('../js/sheets-core.js')
require('../js/sheets.js')
const S = globalThis.SumSum.sheets
const C = globalThis.SumSum.sheetsCore
const info = d => ({ module: 'shizi', title: '识字 · 每日一卷', idParts: 'daily|天地人', units: [], items: [], ref: { kind: 'daily', d } })

const first = S.use(info('2026-12-18'))
assert.equal(S.use(info('2026-12-18')), first, '同一张卷再打开，号不变')
data[C.keyOf(first)] = JSON.stringify({ id: first, module: 'shizi', ref: { kind: 'daily', d: '2026-12-18' }, done: true })
assert.equal(S.use(info('2026-12-18')), first, '已经记过的同一张卷（ref.d 一样），号还是原来的')
const next = S.use(info('2026-12-19'))
assert.notEqual(next, first, '字一样的下一张卷（ref.d 不同）另起号，不会显示成已打分')
assert.equal(S.use(info('2026-12-19')), next, '下一张卷再打开，号稳定')
const plain = S.use({ module: 'kousuan', title: '口算', idParts: 'x', units: [], items: [], ref: {} })
assert.ok(plain, '没有 ref.d 的板块照旧')
console.log('✓ 纸号：同一天字一样的两张识字卷不撞号（4 项）')
