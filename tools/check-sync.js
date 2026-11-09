/* 云同步的合并规则（sync-core 纯函数）。node 直跑。 */
'use strict'

globalThis.SumSum = globalThis.SumSum || {}
require('../js/sync-core.js')
var C = globalThis.SumSum.syncCore

var ok = 0, bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) }
  else { bad++; console.log('✗', name, extra === undefined ? '' : JSON.stringify(extra)) }
}

/* --- 首登三分支 --- */
check('云空本机有 → push-all', C.planFirstLogin(0, 0, 5) === 'push-all')
check('有对不上的老键 → confirm', C.planFirstLogin(3, 2, 8) === 'confirm')
check('都能比出新旧 → none', C.planFirstLogin(3, 0, 8) === 'none')
check('两边都空 → none', C.planFirstLogin(0, 0, 0) === 'none')

var has = function (keys) {
  return function (k) { return keys.indexOf(k) >= 0 }
}

/* --- LWW 两个方向 --- */
var r1 = C.merge({ a: 200 }, has(['a']), [{ key: 'a', value: 'V', updated_at: 100 }])
check('本地新 → push', r1.pushKeys.indexOf('a') >= 0 && r1.apply.length === 0, r1)
var r2 = C.merge({ a: 100 }, has(['a']), [{ key: 'a', value: 'V', updated_at: 200 }])
check('云端新 → apply', r2.apply.length === 1 && r2.apply[0].mtime === 200 && r2.pushKeys.length === 0, r2)

/* --- 相平：谁也不动（时钟偏差下必须稳定） --- */
var r3 = C.merge({ a: 150 }, has(['a']), [{ key: 'a', value: 'V', updated_at: 150 }])
check('相平不动', r3.apply.length === 0 && r3.pushKeys.length === 0, r3)

/* --- 云端独有的键 → 直接 apply（本机没有就不算冲突） --- */
var r4 = C.merge({}, has([]), [{ key: 'new', value: 'V', updated_at: 5 }])
check('云端独有 → apply', r4.apply.length === 1 && r4.apply[0].key === 'new', r4)

/* --- 本地独有的键（meta 里有）→ push --- */
var r5 = C.merge({ mine: 9 }, has(['mine']), [])
check('本地独有 → push', r5.pushKeys.indexOf('mine') >= 0, r5)

/* --- 本地有值但没有 mtime（老数据）→ unresolved，不替用户做主 --- */
var r6 = C.merge({}, has(['old']), [{ key: 'old', value: 'V', updated_at: 5 }])
check('老数据 → unresolved', r6.unresolved.indexOf('old') >= 0 && r6.apply.length === 0 && r6.pushKeys.length === 0, r6)

console.log(bad ? '---- 有 ' + bad + ' 条没过' : '✓ sync-core 合并规则全部通过')
process.exit(bad ? 1 : 0)
