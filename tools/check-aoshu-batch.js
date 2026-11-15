/**
 * 奥数「题目固定到点重新生成为止」校验。用法：node tools/check-aoshu-batch.js
 *
 * 2026-11 起的规矩：一批题出完就一直固定——切页再回来、刷新、明天再打开都是同一批，
 * 只有点「重新生成」或改了影响题目的设置（难度/题量/题型勾选/复习范围）才换新一批。
 *
 * 这里盯三件事：
 * 1.【可复现】同一个种子跑两遍，所有已实现知识点的题目一字不差——
 *    这是「题目固定」的根，根不稳一切白搭。
 * 2.【指纹对】sig 只含影响题目的设置：难度/题量/题型勾选变了指纹要变；
 *    标题、讲解页/练习页/解析页开关这些纯排版项变了指纹【不能】变（改它们不许换题）。
 * 3.【种子账本】seedFor：同指纹给同一个种子；换指纹滚新种子；roll 永远换新；
 *    每课各记各的，综合复习卷单独一份（key 固定，不看当前点在哪一课）。
 *
 * 与 check-shizi / check-shudu 一样是能用 node 直接跑的独立脚本（项目无测试框架）。
 * refresh() 怎么把种子接进出题（DOM 层的接线）node 里测不了，那部分浏览器里扫。
 */
'use strict'

globalThis.window = globalThis
globalThis.document = {
  getElementById: function () { return null },
  querySelectorAll: function () { return [] },
  body: { classList: { remove: function () {}, add: function () {} } }
}

/* 假 localStorage：种子账本要落盘（重开页面还能拿到同一批题），node 里给个内存版 */
var mem = {}
globalThis.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null },
  setItem: function (k, v) { mem[k] = String(v) },
  removeItem: function (k) { delete mem[k] },
  key: function (i) { return Object.keys(mem)[i] || null },
  get length() { return Object.keys(mem).length }
}

var fs = require('fs')
var path = require('path')
var JS = path.join(__dirname, '..', 'js')

require(path.join(JS, 'store.js'))
require(path.join(JS, 'render.js'))
require(path.join(JS, 'aoshu-topics.js'))
fs.readdirSync(JS)
  .filter(function (f) { return /^aoshu-topic-/.test(f) })
  .forEach(function (f) { require(path.join(JS, f)) })
require(path.join(JS, 'aoshu-settings.js'))
require(path.join(JS, 'aoshu-batch.js'))

var A = globalThis.SumSum.aoshu
var U = A.util
var B = A.batch
var sanitize = A.settings.sanitize
var DIFFS = ['L1', 'L2', 'L3']

var problems = []
function bad(msg) { problems.push(msg) }

/* 全默认设置的干净样本（title 各不相同不影响指纹） */
function base(top) {
  return sanitize(Object.assign({}, A.settings.DEFAULTS, { topic: top }))
}

/* ---------- 1. 可复现：同种子两遍，题目一字不差 ---------- */

function checkReproducible() {
  A.topicList.forEach(function (t) {
    DIFFS.forEach(function (d) {
      var s = sanitize(Object.assign({}, base(t.id), { difficulty: d, count: 8 }))
      var a = U.withSeed(424242, function () { return JSON.stringify(t.generate(s).questions) })
      var b = U.withSeed(424242, function () { return JSON.stringify(t.generate(s).questions) })
      if (a !== b) bad(t.no + ' ' + d + '：同种子两遍题目不一样，种子固定白搭')
    })
  })
  /* 综合复习卷的排课也走随机洗牌，同样要可复现 */
  var ids = A.topicList.slice(0, 7).map(function (t) { return t.id })
  var p1 = U.withSeed(777, function () { return JSON.stringify(U.planReview(ids, 15)) })
  var p2 = U.withSeed(777, function () { return JSON.stringify(U.planReview(ids, 15)) })
  if (p1 !== p2) bad('planReview：同种子两遍排课不一样')
}

/* ---------- 2. 指纹：只算影响题目的设置 ---------- */

function checkSig() {
  var t = A.topicList[0]
  var s1 = base(t.id)

  /* 纯排版项不进指纹：改标题、勾讲解页/练习页/解析页，题不许换 */
  ;[
    { title: '随便起的标题' },
    { title: '' },
    { lessonPage: !s1.lessonPage },
    { practicePage: !s1.practicePage },
    { answerPage: !s1.answerPage }
  ].forEach(function (patch) {
    if (B.sigOf(s1) !== B.sigOf(sanitize(Object.assign({}, s1, patch)))) {
      bad('sig 把纯排版项算进去了：' + JSON.stringify(patch))
    }
  })

  /* 影响题目的项必须进指纹 */
  if (B.sigOf(s1) === B.sigOf(sanitize(Object.assign({}, s1, { difficulty: 'L3' })))) bad('sig 没算难度')
  if (B.sigOf(s1) === B.sigOf(sanitize(Object.assign({}, s1, { count: 12 })))) bad('sig 没算题量')
  /* 翻转该课第一个变式（其余仍勾着，不会被 sanitize 强制回落） */
  var v0 = t.variants[0]
  var flip = {}
  flip[v0.setting] = !s1[v0.setting]
  if (B.sigOf(s1) === B.sigOf(sanitize(Object.assign({}, s1, flip)))) bad('sig 没算题型勾选')

  /* 复习卷：范围和【任何一课】的题型勾选都影响题目 */
  var r1 = sanitize(Object.assign({}, base(t.id), { review: true, reviewTopics: A.topicList.slice(0, 3).map(function (x) { return x.id }).join(',') }))
  var r2 = sanitize(Object.assign({}, r1, { reviewTopics: A.topicList.slice(0, 4).map(function (x) { return x.id }).join(',') }))
  if (B.sigOf(r1) === B.sigOf(r2)) bad('复习卷 sig 没算范围')
  var other = A.topicList[2] /* 与上面两张单课卷无关的一课 */
  var of = {}
  of[other.variants[0].setting] = !r1[other.variants[0].setting]
  if (B.sigOf(r1) === B.sigOf(sanitize(Object.assign({}, r1, of)))) bad('复习卷 sig 没算别课的题型勾选')
  /* 但单课卷的指纹不受别课勾选影响：别的课怎么勾，这一课的题不该变 */
  var sA = base(t.id)
  var flipOther = {}
  flipOther[other.variants[0].setting] = !sA[other.variants[0].setting]
  if (B.sigOf(sA) !== B.sigOf(sanitize(Object.assign({}, sA, flipOther)))) {
    bad('单课 sig 把别课的题型勾选算进去了')
  }
}

/* ---------- 3. 种子账本：key 各归各，种子同指纹沿用、换指纹滚新 ---------- */

function checkLedger() {
  var t1 = A.topicList[0]
  var t2 = A.topicList[1]
  var s1 = base(t1.id)
  var s2 = base(t2.id)

  if (B.keyOf(s1) !== t1.id) bad('keyOf 单课应是知识点 id')
  if (B.keyOf(sanitize(Object.assign({}, s1, { review: true }))) !== B.keyOf(sanitize(Object.assign({}, s2, { review: true })))) {
    bad('keyOf 复习卷应固定一个 key，不看当前课')
  }

  /* 同指纹沿用：两次调用给同一个种子（这就是走开再回来题目不变） */
  var a1 = B.seedFor(B.keyOf(s1), B.sigOf(s1))
  if (a1 !== B.seedFor(B.keyOf(s1), B.sigOf(s1))) bad('同指纹两次给了不同种子')
  if (!/^\d+$/.test(String(a1)) || a1 < 1) bad('种子应是正整数：' + a1)

  /* 换指纹滚新 */
  var changed = sanitize(Object.assign({}, s1, { count: 9 }))
  var a2 = B.seedFor(B.keyOf(changed), B.sigOf(changed))
  if (a2 === a1) bad('换了指纹还沿用旧种子')

  /* 每课各记各的：另一课滚种子不碰这一课（先领回本课当前种子——上面改题量已合法换过一批） */
  var cur = B.seedFor(B.keyOf(s1), B.sigOf(s1))
  var b1 = B.seedFor(B.keyOf(s2), B.sigOf(s2))
  B.seedFor(B.keyOf(s2), B.sigOf(sanitize(Object.assign({}, s2, { count: 9 }))))
  if (B.seedFor(B.keyOf(s1), B.sigOf(s1)) !== cur) bad('别课滚种子把这一课的种子也动了')

  /* 复习卷与单课互不干扰 */
  var r = sanitize(Object.assign({}, s1, { review: true, reviewTopics: t1.id + ',' + t2.id }))
  var rr = B.seedFor(B.keyOf(r), B.sigOf(r))
  if (B.keyOf(r) === t1.id || rr === a1) bad('复习卷和单课账本没有分开')
  if (B.seedFor(B.keyOf(r), B.sigOf(r)) !== rr) bad('复习卷同指纹两次给了不同种子')

  /* roll：重新生成按钮，参数不变也要换新 */
  var before = B.seedFor(B.keyOf(s1), B.sigOf(s1))
  B.roll(B.keyOf(s1), B.sigOf(s1))
  if (B.seedFor(B.keyOf(s1), B.sigOf(s1)) === before) bad('roll 之后种子没换')

  /* 落盘：账本真的写进了 localStorage（重开页面读得到） */
  var raw = mem[B.KEY]
  if (!raw) bad('种子账本没写进 localStorage')
  else {
    var stored = JSON.parse(raw)
    if (!stored[t1.id] || stored[t1.id].seed !== B.seedFor(B.keyOf(s1), B.sigOf(s1))) bad('账本里这一课的种子对不上')
    if (Object.keys(stored).length > A.topicList.length + 1) bad('账本比课还多，在积历史')
  }

  /* 坏数据不炸：账本损坏时照常滚新种子 */
  mem[B.KEY] = 'not json{'
  var junk = B.seedFor('whatever', 'sig')
  if (typeof junk !== 'number' || junk < 1) bad('账本损坏时滚不出新种子')
}

/* ---------- 跑 ---------- */

checkReproducible()
checkSig()
checkLedger()

if (problems.length) {
  problems.forEach(function (m) { console.log('✗ ' + m) })
  console.log('FAIL ' + problems.length)
  process.exit(1)
}
console.log('PASS 奥数题目批次：可复现 / 指纹 / 种子账本 全部通过（' + A.topicList.length + ' 课 × 3 难度）')
