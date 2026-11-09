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

/* ===== sync.js 流程（Task 9） ===== */
;(function () {
  globalThis.window = globalThis
  /* 假 store：内存实现 + 可控 meta */
  var mem = {}
  var meta = {}
  var changes = []
  globalThis.SumSum.store = {
    getString: function (k) { return k in mem ? mem[k] : null },
    set: function (k, v) { mem[k] = JSON.stringify(v); meta[k] = meta[k] || 1 },
    remove: function (k) { delete mem[k] },
    applyRemote: function (k, v) { mem[k] = v; meta[k] = -1 },
    stampNow: function (keys, now) { keys.forEach(function (k) { meta[k] = now || 123 }) },
    meta: function () { return meta },
    keys: function () { return Object.keys(mem).filter(function (k) { return k.indexOf('sumsum:') === 0 && k !== 'sumsum:help:seen' && k !== 'sumsum:sync:meta' }) },
    syncable: function (k) { return k.indexOf('sumsum:') === 0 && k !== 'sumsum:help:seen' && k !== 'sumsum:sync:meta' },
    onChange: function (fn) { changes.push(fn) }
  }
  globalThis.SumSum.account = { state: { loggedIn: true, email: 'a@b.co' }, onChange: function () {} }
  delete require.cache[require.resolve('../js/sync.js')]
  require('../js/sync.js')
  var sync = globalThis.SumSum.sync

  var pushed = []
  var pulled = { items: [] }
  var api = {
    pull: async function () { return { status: 200, body: pulled } },
    push: async function (items) { pushed.push(items); return { status: 200, body: { applied: items.length, skipped: 0 } } }
  }

  Promise.resolve().then(async function () {
    /* 本地有数据、云端空 → 首登推送全部 */
    mem['sumsum:local:v1'] = '{"b":2}'
    meta['sumsum:local:v1'] = 100
    var confirmCalls = []
    await sync.init({ api: api, noReload: true, confirm: async function (o) { confirmCalls.push(o); return 'local' } })
    await new Promise(function (r) { setTimeout(r, 30) })
    check('首登本地有云端无 → 推全部', pushed.length === 1 && pushed[0][0].key === 'sumsum:local:v1', pushed)
    check('不需要弹确认框（云端空）', confirmCalls.length === 0)
    check('推送后 meta 已刷新', meta['sumsum:local:v1'] === 123)

    /* 再打开：拉到云端新键 → 应用 */
    pulled = { items: [ { key: 'sumsum:cloud:v1', value: '{"a":1}', updated_at: 500 } ] }
    pushed = []
    await sync.init({ api: api, noReload: true })
    await new Promise(function (r) { setTimeout(r, 30) })
    check('拉取应用云端键', mem['sumsum:cloud:v1'] === '{"a":1}')

    /* 本地改动 → 防抖后推送（测试里防抖调到 5ms） */
    pushed = []
    await sync.init({ api: api, noReload: true, debounce: 5 })
    await new Promise(function (r) { setTimeout(r, 30) })
    changes.forEach(function (fn) { fn('sumsum:local:v1', '{"b":3}') })
    await new Promise(function (r) { setTimeout(r, 50) })
    check('改动触发推送（防抖后）', pushed.length >= 1 && pushed[pushed.length - 1][0].key === 'sumsum:local:v1', pushed.length)

    /* 老数据（本地有值、无 mtime）撞上云端 → confirm 选云端 */
    mem['sumsum:both:v1'] = '{"side":"local"}'
    delete meta['sumsum:both:v1']   /* 同步上线前的老键：meta 里没有它 */
    mem['sumsum:cloud:v1'] = '{"side":"oldcloud"}'
    meta['sumsum:cloud:v1'] = 50
    pulled = { items: [ { key: 'sumsum:both:v1', value: '{"side":"cloud"}', updated_at: 900 }, { key: 'sumsum:cloud:v1', value: '{"side":"newcloud"}', updated_at: 900 } ] }
    var chose = []
    await sync.init({ api: api, noReload: true, confirm: async function (o) { chose.push(o); return 'cloud' } })
    await new Promise(function (r) { setTimeout(r, 30) })
    check('老数据撞云端 → 弹了一次确认', chose.length === 1, chose.length)
    check('选云端 → 云端值应用', mem['sumsum:both:v1'] === '{"side":"cloud"}', mem['sumsum:both:v1'])
    check('确认框里给的是键清单', chose[0] && chose[0].local.indexOf('sumsum:both:v1') >= 0 && chose[0].cloud.length === 2)

    /* 弹窗被关掉（没选方向）→ 本地云端都不动，下次再问（Review Focus 6） */
    mem['sumsum:old2:v1'] = '{"x":1}'
    delete meta['sumsum:old2:v1']
    pulled = { items: [ { key: 'sumsum:old2:v1', value: '{"x":2}', updated_at: 900 } ] }
    pushed = []
    await sync.init({ api: api, noReload: true, confirm: async function () { return undefined } })
    await new Promise(function (r) { setTimeout(r, 30) })
    check('没选方向 → 本地云端都不动', mem['sumsum:old2:v1'] === '{"x":1}' && pushed.length === 0,
      [mem['sumsum:old2:v1'], pushed.length])

    finish()
  }).catch(function (e) { console.error(e); process.exit(1) })

  function finish() {
    console.log(bad ? '\nsync 流程有 ' + bad + ' 项没过' : '\nsync 流程全部通过')
    process.exit(bad ? 1 : 0)
  }
})()
