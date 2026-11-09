/**
 * 识字标记层（js/shizi-mark.js）的校验。用法：node tools/check-shizi-mark.js
 *
 * mark 层管的是 localStorage（v3 错字集、点选集、撤销快照、每日卷），核心的纯函数
 * 已有 tools/check-shizi.js 盖着；这里压的是「登记 / 撤销 / 快照」这些带存储副作用的
 * 流程，出问题的代价是孩子的错字记录被悄悄改写：
 *   - 撤销登记要连点选一起还原：撤销后重新登记，真错的字必须仍记「又错」，
     不能因为点选丢了被记成「认出」（复审 I1）；
 *   - 重复登记同一张卷是空操作，不许覆盖撤销槽把「撤销」变成无声的无效按钮（I2）；
 *   - 同一天登记了周卷和每日卷，两个「撤销」只能各撤各的，按钮上看得见的那笔（I3）。
 *
 * mark.js 无 DOM 依赖也能加载（bind/paint 不调用就不碰 document），
 * 这里用一个内存版 localStorage 桩代替浏览器。每个场景 fresh() 重载模块、重铺存储。
 */
'use strict'

require('../js/shizi-data.js')
require('../js/shizi-core.js')

var mem = {}
globalThis.localStorage = {
  getItem: function (k) {
    return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null
  },
  setItem: function (k, v) {
    mem[k] = String(v)
  },
  removeItem: function (k) {
    delete mem[k]
  }
}

var problems = []
function check(cond, msg, got) {
  if (!cond) problems.push(msg + (got !== undefined ? '（实际 ' + JSON.stringify(got) + '）' : ''))
}

/* 重铺存储、重载 mark 模块（它加载时会把存储读进闭包，改 mem 不重载是不够的） */
function fresh(seed) {
  mem = {}
  Object.keys(seed || {}).forEach(function (k) {
    mem[k] = seed[k]
  })
  delete require.cache[require.resolve('../js/shizi-mark.js')]
  require('../js/shizi-mark.js')
  return globalThis.SumSum.shiziMark
}

function marksNow() {
  return JSON.parse(mem['sumsum:shizi:wrong:v3'])
}

var T0 = '2026-11-20' // 演练用「今天」；setToday 钩子只改内存，正好模拟
var V3_ONE = JSON.stringify({ 甲: { add: '2026-11-19', n: 1, k: 0, due: '2026-11-19' } })

/* ---------- 对照组：登记的基本语义（已有行为，防回归的锚） ---------- */

var M = fresh({ 'sumsum:shizi:wrong:v3': V3_ONE })
M.setToday(function () { return T0 })
M.togglePick('甲')
M.settle(['甲'])
check(marksNow().甲.n === 2 && marksNow().甲.k === 0 && marksNow().甲.fail === T0,
  '对照组：点了没认出的甲，登记记又错', marksNow().甲)

/* ---------- I1：撤销登记要还原点选 ---------- */

M = fresh({ 'sumsum:shizi:wrong:v3': V3_ONE })
M.setToday(function () { return T0 })
M.togglePick('甲')
M.settle(['甲'])
M.undoSettle()
check(marksNow().甲.n === 1, 'I1 前半：撤销后甲回到 n1', marksNow().甲)
check(M.picked('甲'), 'I1 后半：撤销要把点选还原（点过的字还是「没认出」待登记）')
M.settle(['甲'])
check(marksNow().甲.n === 2 && marksNow().甲.k === 0,
  'I1：撤销后重登记，甲仍记又错（若点选丢了会变成记认出）', marksNow().甲)

/* ---------- I2：重复登记同一张卷不许覆盖撤销槽 ---------- */

M = fresh({ 'sumsum:shizi:wrong:v3': V3_ONE })
M.setToday(function () { return T0 })
M.togglePick('甲')
M.settle(['甲'])
M.settle(['甲']) // 第二次：点选已被吃掉、同日幂等全拦住，是空操作
check(M.canUndo(), 'I2 前置：第二笔登记后撤销按钮仍在')
M.undoSettle()
check(marksNow().甲.n === 1, 'I2：空操作的登记不能覆盖撤销槽（撤销仍回到登记前）', marksNow().甲)

/* ---------- I3：同一天两笔登记，各撤各的 ---------- */

M = fresh({
  'sumsum:shizi:wrong:v3': JSON.stringify({
    甲: { add: '2026-11-19', n: 1, k: 0, due: '2026-11-19' },
    乙: { add: '2026-11-19', n: 1, k: 0, due: '2026-11-19' }
  }),
  'sumsum:shizi:daily:v1': JSON.stringify({
    papers: [{ d: T0, chars: '甲', wrong: '甲', settled: false }]
  })
})
M.setToday(function () { return T0 })
M.togglePick('乙')
M.settle(['乙']) // 周卷上登记乙（点了＝又错）
var paper = M.paperAt(0)
M.togglePick('甲')
M.settle(Array.from(paper.chars), paper) // 每日卷登记甲
check(marksNow().乙.n === 2 && marksNow().甲.n === 2, 'I3 前置：两笔都记上了', marksNow())
check(M.canUndo('sheet') === false, 'I3：最新一笔是每日卷，周卷的撤销不该再亮')
check(M.canUndo('daily') === true, 'I3：每日卷的撤销该亮')
check(M.canUndo() === true, 'I3：不带参数的 canUndo 兼容旧调用（还有可撤销的）')
M.undoSettle()
check(marksNow().甲.n === 1 && marksNow().乙.n === 2,
  'I3：撤销只回滚最新那笔（每日卷），周卷那笔保住', marksNow())

if (problems.length) {
  console.log('✗ ' + problems.length + ' 处问题：')
  problems.forEach(function (p) { console.log('  - ' + p) })
  process.exit(1)
}
console.log('✓ 识字标记层：登记/撤销/快照（点选还原、空操作不覆盖、分笔撤销）全部通过')
