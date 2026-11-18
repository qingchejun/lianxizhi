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
require("../js/store.js") // 写入收口：shizi-mark 的 writeJSON 走它，落到本文件的 localStorage 桩上
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

/* ---------- 换规迁移：老阶梯攒到 k≥2 的在集字，加载即毕业并落盘 ----------
   毕业日是「加载那一刻的真实今天」（setToday 只能在模块加载之后设），所以只验墓碑形状。 */
M = fresh({ 'sumsum:shizi:wrong:v3': JSON.stringify({
  甲: { add: '2026-11-01', n: 2, k: 2, due: '2026-11-30', hit: '2026-11-15', first: '2026-10-01' },
  乙: { add: '2026-11-19', n: 1, k: 1, due: '2026-11-22', hit: '2026-11-19' }
}) })
M.setToday(function () { return T0 })
var ji = marksNow().甲
check(ji && typeof ji.out === 'string' && ji.n === 2 && ji.first === '2026-10-01' && ji.add === undefined,
  '换规：认出过 2 次的甲加载即毕业（墓碑只留 n/out/first）', ji)
check(marksNow().乙 && marksNow().乙.k === 1 && !marksNow().乙.out,
  '换规：半红乙原样等复核', marksNow().乙)

/* ---------- 云同步：点选集要像错字集一样首载播种（终审后浏览器 e2e 抓出） ----------
   picks:v1 只在用户点选时才首写，会被播种语义盖成 mtime=1——两台设备各点过字
   就永远打平（1 vs 1），点选互不同步。修法与 wrong:v3 一致：页面加载就写空集。 */
M = fresh({})
check(mem['sumsum:shizi:picks:v1'] !== undefined,
  '空浏览器首载播种空点选集', mem['sumsum:shizi:picks:v1'])
M.setToday(function () { return T0 })
M.togglePick('甲')
var pickMtime = JSON.parse(mem['sumsum:sync:meta'] || '{}')['sumsum:shizi:picks:v1']
check(typeof pickMtime === 'number' && pickMtime > 1,
  '首次点选盖「现在」（>1）而非播种的 1，两台设备才能分出新旧', pickMtime)

/* ---------- 预生成明天的卷（2026-11-18 用户场景：周卷标完错字，自动出的卷没带它们） ----------
   规矩：今晚登记的错字到期日是明天，所以登记完自动出的下一张 = 按「明天到期」组卷的
   明日卷；明晚卷已出、又标了新错字 → 还没考的明日卷重排带上（考过的绝不重排）。 */
var T1 = '2026-11-21', T2 = '2026-11-22'

/* S1：每日卷登记完 → 预生成明天的卷，今晚的错字就在上面 */
M = fresh({
  'sumsum:shizi:wrong:v3': JSON.stringify({ 甲: { add: '2026-11-19', n: 1, k: 0, due: T0 } }),
  'sumsum:shizi:daily:v1': JSON.stringify({ papers: [{ d: T0, chars: '甲', wrong: '甲', settled: false }] })
})
M.setToday(function () { return T0 })
M.togglePick('甲')
M.settle(['甲'], M.paperAt(0))
var pv = M.ensurePaper()
check(pv && pv.d === T1 && !pv.settled, 'S1：登记完自动出的是明天的卷', pv)
check(pv && pv.wrong.indexOf('甲') >= 0, 'S1：今晚错的甲在明日卷上（第二天接着考）', pv)

/* S2：明天打开页面，还是这张（不重新生成、字不变脸） */
M.setToday(function () { return T1 })
var frozen = JSON.stringify(M.paperAt(1))
var served = M.ensurePaper()
check(JSON.stringify(served) === frozen && M.paperCount() === 2, 'S2：明天打开还是昨晚那张，不重出', served)

/* S3：今天只登记了周卷（还没出过每日卷）→ 直接出明天的卷，别出「今天到期」的加场卷 */
M = fresh({
  'sumsum:shizi:wrong:v3': JSON.stringify({ 乙: { add: '2026-11-19', n: 1, k: 0, due: T0 } })
})
M.setToday(function () { return T0 })
M.togglePick('乙')
M.settle(['乙'], null) // 周卷上登记乙（点了＝又错）
var pv3 = M.ensurePaper()
check(pv3 && pv3.d === T1 && pv3.wrong.indexOf('乙') >= 0 && M.paperCount() === 1,
  'S3：周卷登记后直接出明天的卷（带乙）', pv3)

/* S4：明日卷已出，又去标了新错字 → 还没考的明日卷重排带上，不翻倍 */
M.togglePick('丙')
M.settle(['丙'], null) // 又登记了一笔周卷错字
var pv4 = M.paperAt(0)
check(pv4 && pv4.d === T1 && pv4.wrong.indexOf('丙') >= 0 && pv4.wrong.indexOf('乙') >= 0,
  'S4：晚标的丙也进明日卷（乙还在）', pv4)
check(M.paperCount() === 1, 'S4：重排是换一张，不是多一张', M.paperCount())

/* S5：考过（登记过）的卷绝不重排；下一张从后天起 */
M.setToday(function () { return T1 })
var p2 = M.paperAt(0)
var p2Face = p2.chars + '|' + p2.wrong // 卷面 = 字 + 错字位；settled 翻位是登记本身，不算变脸
M.settle(Array.from(p2.chars), p2) // 明日卷第二天考完，全认出（没点）
M.togglePick('丁')
M.settle(['丁'], null) // 又标了新错字
var p2After = M.paperAt(0)
check(p2After.settled === true && p2After.chars + '|' + p2After.wrong === p2Face,
  'S5：登记过的卷不重排（红线）', p2After)
var pv5 = M.ensurePaper()
check(pv5 && pv5.d === T2 && pv5.wrong.indexOf('丁') >= 0 && pv5.wrong.indexOf('乙') < 0,
  'S5：下一张从后天起，带丁不带乙（乙在等复核）', pv5)

/* S6：往日欠账卷今天结清 → 出的还是今天的卷（不许跳天） */
M = fresh({
  'sumsum:shizi:wrong:v3': JSON.stringify({ 甲: { add: '2026-11-16', n: 1, k: 0, due: '2026-11-17' } }),
  'sumsum:shizi:daily:v1': JSON.stringify({
    papers: [{ d: '2026-11-17', chars: '甲', wrong: '甲', settled: false }]
  })
})
M.setToday(function () { return T0 })
M.settle(['甲'], M.paperAt(0)) // 欠账卷今天补考，甲认出
var pv6 = M.ensurePaper()
check(pv6 && pv6.d === T0 && M.paperCount() === 2, 'S6：结完欠账卷出今天的卷，不跳明天', pv6)

/* S7：逾期积压满 10 个时，今晚新标的错字仍要上明天的卷（2026-11-18 用户实测的洞：
   周卷标了 3 个字，明天的卷被 10 个逾期老错字占满位子，一个都没带上） */
M = fresh({
  'sumsum:shizi:wrong:v3': JSON.stringify((function () {
    var seed = {}
    '甲乙丙丁戊己庚辛壬癸'.split('').forEach(function (ch) {
      seed[ch] = { add: '2026-11-10', n: 1, k: 0, due: '2026-11-19' } // 全部逾期一天
    })
    return seed
  })())
})
M.setToday(function () { return T0 })
M.togglePick('觅')
M.settle(['觅'], null) // 周卷上登记觅（点了＝没认出）
var pv7 = M.ensurePaper()
check(pv7 && pv7.d === T1 && pv7.wrong.indexOf('觅') >= 0 && pv7.wrong.length === 10,
  'S7：积压满 10 个，今晚新标的觅仍上明天的卷（位子从逾期老字里匀）', pv7 && pv7.wrong)

if (problems.length) {
  console.log('✗ ' + problems.length + ' 处问题：')
  problems.forEach(function (p) { console.log('  - ' + p) })
  process.exit(1)
}
console.log('✓ 识字标记层：登记/撤销/快照（点选还原、空操作不覆盖、分笔撤销）全部通过')
