/**
 * 云同步引擎：登录后（且仅登录后）——
 *   打开页面先拉（云 → 本地按 mtime 合并）；本地改动防抖 2 秒后推。
 *   首登遇到「同步上线前的老数据」（本地有值但没 mtime）撞上云端 → 交给 UI 的
 *   confirm 弹窗二选一；云端空 → 直接推本地。
 *   拉下来有应用 → 自动刷新一次（各板块只在加载时读存储）。
 * 推失败不重试：下次改动或下次打开自然会再推（mtime 还新着，自愈）。
 */
;(function (root) {
  'use strict'

  var DEBOUNCE = 2000 /* 测试里可用 opts.debounce 调短 */
  var RELOAD_KEY = 'sumsum:sync:reloaded'

  function S() {
    return root.SumSum.store
  }
  function core() {
    return root.SumSum.syncCore
  }

  async function init(opts) {
    opts = opts || {}
    var api = opts.api || defaultApi(opts.fetchFn)
    var acct = root.SumSum.account
    if (!acct || !acct.state.loggedIn) return /* 没登录不做事，也别报错 */

    var store = S()
    var allKeys = store.keys() /* 现存可同步键，含没 mtime 的老键 */
    var metaMap = store.meta()
    var oldKeys = allKeys.filter(function (k) { return !(k in metaMap) }) /* 同步上线前的老数据 */

    var pulled = await api.pull()
    var cloudItems = (pulled && pulled.status === 200 && pulled.body && pulled.body.items) || []

    /* 老数据里有跟云端同键的（两边都有值、没法比时间）→ 只能问用户 */
    var unresolved = cloudItems.filter(function (it) {
      return store.getString(it.key) !== null && !(it.key in metaMap)
    }).length
    var plan = core().planFirstLogin(cloudItems.length, unresolved, allKeys.length)
    if (plan === 'confirm' && opts.confirm) {
      var pick = await opts.confirm({
        local: allKeys,
        cloud: cloudItems.map(function (it) { return it.key })
      })
      if (pick === 'local') {
        store.stampNow(allKeys)
        await pushAll(api, store)
        return /* 本地已称王 */
      } else if (pick === 'cloud') {
        applyAll(store, cloudItems)
        /* 云端为基准，但本地独有、云端没有的老键不丢：盖个现在，下次打开自然推上去 */
        var cloudKeys = {}
        cloudItems.forEach(function (it) { cloudKeys[it.key] = true })
        var keep = oldKeys.filter(function (k) { return !cloudKeys[k] })
        if (keep.length) store.stampNow(keep)
        reload(opts)
        return
      } else {
        return /* 用户没选（关了弹窗）：这次不同步，下次打开再问 */
      }
    } else if (plan === 'push-all') {
      store.stampNow(allKeys)
      await pushAll(api, store)
      cloudItems = []
    }

    if (cloudItems.length) {
      var r = core().merge(store.meta(), function (k) { return store.getString(k) !== null }, cloudItems)
      var appliedAny = false
      r.apply.forEach(function (it) {
        store.applyRemote(it.key, it.value, it.mtime)
        appliedAny = true
      })
      var toPush = r.pushKeys.map(function (k) {
        return { key: k, value: store.getString(k), updated_at: store.meta()[k] }
      }).filter(function (it) { return it.value !== null })
      if (toPush.length) await api.push(toPush)
      if (appliedAny) reload(opts)
    }

    /* 之后本地一有改动，防抖推 */
    store.onChange(function (key, value) {
      if (!value && value !== '') return
      later(api, opts.debounce)
    })
  }

  function defaultApi(fetchFn) {
    var A = root.SumSum.account
    return {
      pull: function () { return A.request('/api/data', undefined, fetchFn) },
      push: function (items) { return A.request('/api/data/push', { items: items }, fetchFn) }
    }
  }

  var timer = null
  function later(api, ms) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(function () {
      timer = null
      pushAll(api, S())
    }, ms || DEBOUNCE)
  }

  async function pushAll(api, store) {
    var meta = store.meta()
    var items = Object.keys(meta).filter(store.syncable).map(function (k) {
      var v = store.getString(k)
      return v === null ? null : { key: k, value: v, updated_at: meta[k] }
    }).filter(Boolean)
    if (items.length) await api.push(items)
  }

  function applyAll(store, items) {
    items.forEach(function (it) { store.applyRemote(it.key, it.value, it.updated_at) })
  }

  function reload(opts) {
    if (opts.noReload) return
    try {
      if (root.sessionStorage.getItem(RELOAD_KEY)) return /* 只自动刷一次，免得循环 */
      root.sessionStorage.setItem(RELOAD_KEY, '1')
    } catch (e) { /* 隐私模式存不了就照刷 */ }
    root.location.reload()
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.sync = { init: init }
})(typeof window !== 'undefined' ? window : globalThis)
