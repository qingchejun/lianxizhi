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
  var throwPull = false
  var api = {
    pull: async function () { if (throwPull) throw new Error('offline'); return { status: 200, body: pulled } },
    push: async function (items) { pushed.push(items); return { status: 200, body: { applied: items.length, skipped: 0 } } }
  }
  function lastPushByKey() {
    var by = {}
    ;(pushed[pushed.length - 1] || []).forEach(function (it) { by[it.key] = it })
    return by
  }

  Promise.resolve().then(async function () {
    /* 本地有数据、云端空 → 首登推送全部。三类键三种待遇（终审 C1）：
       老键（无 mtime 的真实数据）盖「现在」；用户改过的键带自己的 mtime；
       播种键（mtime=1 的默认值）必须按 1 推——盖了「现在」，干净设备一建号
       就把空错字集变成云端新王，别机的真实数据登录时会被它清空。 */
    mem['sumsum:old:v1'] = '{"a":1}' /* 同步上线前的老键：无 mtime */
    mem['sumsum:local:v1'] = '{"b":2}'
    meta['sumsum:local:v1'] = 100
    mem['sumsum:seed:v1'] = '{"c":3}'
    meta['sumsum:seed:v1'] = 1
    var confirmCalls = []
    await sync.init({ api: api, noReload: true, confirm: async function (o) { confirmCalls.push(o); return 'local' } })
    await new Promise(function (r) { setTimeout(r, 30) })
    var by1 = lastPushByKey()
    check('首登本地有云端无 → 推全部（三类键都在）', by1['sumsum:old:v1'] && by1['sumsum:local:v1'] && by1['sumsum:seed:v1'], by1)
    check('不需要弹确认框（云端空）', confirmCalls.length === 0)
    check('老键盖「现在」推上去', by1['sumsum:old:v1'].updated_at === 123 && meta['sumsum:old:v1'] === 123, by1['sumsum:old:v1'])
    check('已有 mtime 的键按自己的时间推', by1['sumsum:local:v1'].updated_at === 100 && meta['sumsum:local:v1'] === 100, by1['sumsum:local:v1'])
    check('播种键按 1 推（默认值不得变云端新王）', by1['sumsum:seed:v1'].updated_at === 1 && meta['sumsum:seed:v1'] === 1, by1['sumsum:seed:v1'])

    /* 再打开：拉到云端新键 → 应用 */
    pulled = { items: [ { key: 'sumsum:cloud:v1', value: '{"a":1}', updated_at: 500 } ] }
    pushed = []
    await sync.init({ api: api, noReload: true })
    await new Promise(function (r) { setTimeout(r, 30) })
    check('拉取应用云端键', mem['sumsum:cloud:v1'] === '{"a":1}')

    /* 本地改动 → 防抖后推送（测试里防抖调到 5ms）。
       监听回调按真实 store.js 的签名只传 key（fire(key)）——曾因假桩多传了 value 把 bug 藏住；
       云端清空 + init 自身的 push-all 先落地并清零，才能隔离出「改动触发的这一次推送」 */
    pulled = { items: [] }
    pushed = []
    await sync.init({ api: api, noReload: true, debounce: 5 })
    await new Promise(function (r) { setTimeout(r, 30) })
    check('init 首登推送全部（隔离前提）', pushed.length === 1 && pushed[0].length >= 1, pushed.length)
    pushed = []
    await new Promise(function (r) { setTimeout(r, 30) })
    changes.forEach(function (fn) { fn('sumsum:local:v1') })
    await new Promise(function (r) { setTimeout(r, 50) })
    check('改动触发推送（防抖后）', pushed.length === 1 && pushed[0][0].key === 'sumsum:local:v1', pushed.length)

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

    /* 选「本机为准」：老键盖「现在」推上去；播种键同样不许盖（C1 同源） */
    mem['sumsum:old3:v1'] = '{"x":9}'
    delete meta['sumsum:old3:v1']
    mem['sumsum:seed3:v1'] = '{"y":8}'
    meta['sumsum:seed3:v1'] = 1
    pulled = { items: [ { key: 'sumsum:old3:v1', value: '{"x":1}', updated_at: 900 } ] }
    pushed = []
    await sync.init({ api: api, noReload: true, confirm: async function () { return 'local' } })
    await new Promise(function (r) { setTimeout(r, 30) })
    var by3 = lastPushByKey()
    check('选本机 → 老键盖「现在」推上去', by3['sumsum:old3:v1'] && by3['sumsum:old3:v1'].updated_at === 123, by3['sumsum:old3:v1'])
    check('选本机 → 播种键仍按 1 推', by3['sumsum:seed3:v1'] && by3['sumsum:seed3:v1'].updated_at === 1, by3['sumsum:seed3:v1'])

    /* 断网打开页面：pull 抛异常 → init 不炸、监听照挂，恢复后一有改动就推（终审 I1） */
    throwPull = true
    pushed = []
    await sync.init({ api: api, noReload: true, debounce: 5 })
    await new Promise(function (r) { setTimeout(r, 30) })
    changes.forEach(function (fn) { fn('sumsum:local:v1') })
    await new Promise(function (r) { setTimeout(r, 50) })
    check('断网打开后改动仍触发推送（监听必须挂上）', pushed.length >= 1, pushed.length)

    finish()
  }).catch(function (e) { console.error(e); process.exit(1) })

  function finish() {
    console.log(bad ? '\nsync 流程有 ' + bad + ' 项没过' : '\nsync 流程全部通过')
    process.exit(bad ? 1 : 0)
  }
})()
