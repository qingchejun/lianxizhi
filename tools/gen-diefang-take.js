/**
 * 生成 B07「至少拿几张」的纸堆表（js/aoshu-topic-diefang.js 里的 TAKE_TABLE）。
 * 逐点扫遮挡的随机搜索太慢（挑战档一道要上百毫秒，出卷子时为了组内不撞答案会反复重抽），
 * 所以离线搜好一批纸堆写进代码，出题时再随机左右 / 上下翻，选一张当 ★ 纸。
 * 用法：node tools/gen-diefang-take.js > /tmp/take.txt，把输出贴进 TAKE_TABLE。
 */
'use strict'
globalThis.window = globalThis
globalThis.document = { getElementById: function () { return null }, querySelectorAll: function () { return [] }, body: { classList: { remove: function () {}, add: function () {} } } }
var path = require('path')
var JS = path.join(__dirname, '..', 'js')
require(path.join(JS, 'render.js'))
require(path.join(JS, 'aoshu-topics.js'))
require(path.join(JS, 'aoshu-topic-diefang.js'))
var T = globalThis.SumSum.aoshu.topics.diefang
var U = globalThis.SumSum.aoshu.util
var out = {}
;['L1', 'L2', 'L3'].forEach(function (d) {
  var seen = new Set(), list = [], byAns = {}
  var lo = d === 'L1' ? 2 : d === 'L2' ? 3 : 4, hi = d === 'L1' ? 3 : d === 'L2' ? 5 : 6
  U.withSeed(20261121, function () {
    while (list.length < 60) {
      var want = lo + (list.length % (hi - lo + 1))
      var r = T._searchTake(d, want)
      if (!r || seen.has(r)) continue
      seen.add(r)
      list.push(r)
    }
  })
  out[d] = list
})
console.log(JSON.stringify(out, null, 1))
