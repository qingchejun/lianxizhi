/**
 * 全站 localStorage 写入的统一收口（2026-11 账号同步起）。
 *
 * 为什么要有它：云同步按「每键最后写入时间」（LWW）合并，写入时间必须和写入动作
 * 绑在一起记，散在各模块的 localStorage.setItem 做不到。所有 sumsum:* 的写入
 * （设置、进度、错字集……）都走这里：真正写 localStorage 的同时把 mtime 记进
 * sumsum:sync:meta，并广播给订阅者（js/sync.js 拿它做防抖推送）。
 *
 * mtime 表本身不进备份也不进同步（js/backup.js 的 SKIP 同款），不然导入老备份
 * 会把别台机器的时间戳一起搬进来。
 *
 * 本文件无 DOM 依赖；localStorage 不可用（隐私模式）时写操作静默失败，
 * 页面照常可用，只是同步不了。
 */
;(function (root) {
  'use strict'

  var META_KEY = 'sumsum:sync:meta'
  var SKIP = { 'sumsum:help:seen': true, 'sumsum:sync:meta': true }

  var listeners = []

  function syncable(k) {
    return typeof k === 'string' && k.indexOf('sumsum:') === 0 && !SKIP[k]
  }

  function loadMeta() {
    try {
      var v = root.localStorage.getItem(META_KEY)
      var o = v ? JSON.parse(v) : null
      return o && typeof o === 'object' ? o : {}
    } catch (e) {
      return {}
    }
  }

  function saveMeta(m) {
    try {
      root.localStorage.setItem(META_KEY, JSON.stringify(m))
    } catch (e) { /* 存不了就没记上，最多少同步一次 */ }
  }

  function fire(key) {
    for (var i = 0; i < listeners.length; i++) listeners[i](key)
  }

  function get(key) {
    try {
      var v = root.localStorage.getItem(key)
      return v == null ? null : JSON.parse(v)
    } catch (e) {
      return null
    }
  }

  function getString(key) {
    try {
      return root.localStorage.getItem(key)
    } catch (e) {
      return null
    }
  }

  function set(key, value) {
    try {
      root.localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      return
    }
    if (syncable(key)) {
      var m = loadMeta()
      m[key] = Date.now()
      saveMeta(m)
      fire(key)
    }
  }

  /* 同步拉取专用：云端赢了就写本地，mtime 记云端的 updated_at，不再触发推送 */
  function applyRemote(key, raw, mtime) {
    try {
      root.localStorage.setItem(key, raw)
    } catch (e) {
      return
    }
    if (syncable(key)) {
      var m = loadMeta()
      m[key] = mtime
      saveMeta(m)
    }
  }

  function remove(key) {
    try {
      root.localStorage.removeItem(key)
    } catch (e) {
      return
    }
    if (syncable(key)) {
      var m = loadMeta()
      delete m[key]
      saveMeta(m)
      fire(key)
    }
  }

  /* 导入备份后给备份里的键盖「现在」：导入是用户的明确意图，这些值要压过云端 */
  function noteImport(data) {
    var m = loadMeta()
    var hit = false
    Object.keys(data).forEach(function (k) {
      if (syncable(k)) {
        m[k] = Date.now()
        hit = true
      }
    })
    if (hit) saveMeta(m)
  }

  /* 首登确认选「本机为准」后用：给指定键盖现在的时间，让它们赢过云端 */
  function stampNow(keys) {
    var m = loadMeta()
    var hit = false
    keys.forEach(function (k) {
      if (syncable(k)) {
        m[k] = Date.now()
        hit = true
      }
    })
    if (hit) saveMeta(m)
  }

  function meta() {
    return loadMeta()
  }

  /* 现存的所有可同步键。直接扫 localStorage：老数据没走 set、meta 里没有它们 */
  function keys() {
    var out = []
    try {
      for (var i = 0; i < root.localStorage.length; i++) {
        var k = root.localStorage.key(i)
        if (syncable(k)) out.push(k)
      }
    } catch (e) { /* 读不了就当没有 */ }
    return out
  }

  function onChange(fn) {
    listeners.push(fn)
    return fn
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.store = {
    META_KEY: META_KEY,
    syncable: syncable,
    get: get,
    getString: getString,
    set: set,
    applyRemote: applyRemote,
    remove: remove,
    noteImport: noteImport,
    stampNow: stampNow,
    keys: keys,
    meta: meta,
    onChange: onChange
  }
})(typeof window !== 'undefined' ? window : globalThis)
