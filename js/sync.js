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

  var PUSH_BATCH_SIZE = 200 /* 与服务端每批限制一致 */
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
    /* 换账号：本机数据属于别的账号 → 先清空再同步，一条都不许推进当前账号。
       没有归属记录（修复前的老用户）→ 认领给当前账号，数据保留 */
    var me = String(acct.state.email || '').trim().toLowerCase()
    var owner = store.owner()
    var wiped = false
    if (owner && owner !== me) {
      store.wipe()
      wiped = true
    }
    if (owner !== me) store.setOwner(me)
    session = me
    if (!storageWatched && root.addEventListener) {
      storageWatched = true
      /* 别的标签页换了账号：本页的数据是上一个人的，立刻刷新（刷新后按新账号重来） */
      root.addEventListener('storage', function (e) {
        if (e.key === 'sumsum:sync:owner' && e.newValue && e.newValue !== session && !opts.noReload) root.location.reload()
      })
    }
    pruneSheets(store, Date.now())
    var pushedVersions = Object.create(null)
    var allKeys = store.keys() /* 现存可同步键，含没 mtime 的老键 */
    var metaMap = store.meta()
    var oldKeys = allKeys.filter(function (k) { return !(k in metaMap) }) /* 同步上线前的老数据 */

    try {
    var pulled = await api.pull()
    var cloudItems = (pulled && pulled.status === 200 && pulled.body && pulled.body.items) || []

    cloudItems.forEach(function (it) { pushedVersions[it.key] = it.updated_at })

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
        /* 只给老键（同步上线前的真实数据）盖「现在」；播种键按 1 原样推，
           否则干净设备的默认值会变成云端新王，反过来清空别机的真实数据 */
        if (oldKeys.length) store.stampNow(oldKeys)
        oldKeys.forEach(function (key) { delete pushedVersions[key] })
        await pushAll(api, store, pushedVersions)
        cloudItems = [] /* 本地版本已推送，继续挂上后续改动监听 */
      } else if (pick === 'cloud') {
        applyAll(store, cloudItems)
        /* 云端为基准，但本地独有、云端没有的老键不丢：盖个现在，下次打开自然推上去 */
        var cloudKeys = {}
        cloudItems.forEach(function (it) { cloudKeys[it.key] = true })
        var keep = oldKeys.filter(function (k) { return !cloudKeys[k] })
        if (keep.length) store.stampNow(keep)
        /* 真刷新了就到此为止；不刷新（登记页、已自动刷过一次）→ 往下挂改动监听，否则这页之后的改动推不上云 */
        if (reload(opts)) return
        cloudItems = []
      } else {
        return /* 用户没选（关了弹窗）：这次不同步，下次打开再问 */
      }
    } else if (plan === 'push-all') {
      /* 同上：只盖老键，播种键（mtime=1）与已有时钟的键按自己的时间推 */
      if (oldKeys.length) store.stampNow(oldKeys)
      await pushAll(api, store, pushedVersions)
      cloudItems = []
    }

    if (cloudItems.length) {
      var r = core().merge(store.meta(), function (k) { return store.getString(k) !== null }, cloudItems)
      var appliedAny = false
      r.apply.forEach(function (it) {
        store.applyRemote(it.key, it.value, it.mtime)
        appliedAny = true
      })
      var stamped = store.meta()
      var toPush = r.pushKeys.map(function (k) {
        return { key: k, value: store.getString(k), updated_at: stamped[k] }
      }).filter(function (it) { return it.value !== null })
      await pushBatches(api, toPush, pushedVersions)
      if (appliedAny) reload(opts)
    }
    } catch (e) {
      /* 断网、服务器抖动：本次不同步就跳过；下面的监听照挂，
         之后一有改动防抖推会自愈（本地 mtime 还新着） */
    }

    /* 页面是用上一个账号的数据画的，清完必须刷新（归属已改，刷新后不会再清，不会循环） */
    if (wiped) {
      if (opts.onWipe) return opts.onWipe()
      if (!opts.noReload) return root.location.reload()
      /* 不刷新的页（登记页）同步完才画，画的就是新账号的数据：照常挂监听 */
    }

    /* 之后本地一有改动，防抖推。store 的 fire 只传 key：删键也会走到这，
       但 pushAll 只推 meta 里还有的键，删掉的键自然不在推送里 */
    store.onChange(function () {
      later(api, opts.debounce, pushedVersions)
    })
  }

  /* 纸记录（扫码登记）只留 60 天：拉之前先删本机的旧纸，否则合并时它算「本地独有」又被推回云端。
     服务器拉取时按同一规则删（server/auth-core.js dataPull）。sheets-core 没加载的页面跳过 */
  function pruneSheets(store, now) {
    var SC = root.SumSum.sheetsCore
    if (!SC) return
    var entries = store.keys().filter(SC.isSheetKey).map(function (k) {
      return { key: k, value: store.getString(k) }
    })
    SC.staleKeys(entries, now).forEach(function (k) { store.remove(k) })
  }

  function defaultApi(fetchFn) {
    var A = root.SumSum.account
    return {
      pull: function () { return A.request('/api/data', undefined, fetchFn) },
      push: function (items) { return A.request('/api/data/push', { items: items }, fetchFn) }
    }
  }

  var timer = null
  var session = '' /* 本页签登录的账号（小写邮箱） */
  var storageWatched = false
  var lastPush = null /* flush 用：最近一次 init 的 api 与已推版本 */
  function later(api, ms, pushedVersions) {
    lastPush = { api: api, pushedVersions: pushedVersions }
    if (timer) clearTimeout(timer)
    timer = setTimeout(function () {
      timer = null
      pushAll(api, S(), pushedVersions).catch(function () { /* 推失败不重试：下次改动或下次打开自然再推 */ })
    }, ms || DEBOUNCE)
  }

  /* 退出登录前调：防抖里还没推的改动立刻推掉，免得换账号时被清掉 */
  async function flush() {
    if (!timer || !lastPush) return
    clearTimeout(timer)
    timer = null
    try { await pushAll(lastPush.api, S(), lastPush.pushedVersions) } catch (e) { /* 推不上就算了 */ }
  }

  async function pushAll(api, store, pushedVersions) {
    /* 归属已不是本页签的账号（别的页签换了号）：本页的数据不属于当前登录的人，一条都不推 */
    var holder = store.owner ? store.owner() : null
    if (holder && holder !== session) return
    var meta = store.meta()
    var items = Object.keys(meta).filter(function (key) {
      return store.syncable(key) && !(pushedVersions[key] >= meta[key])
    }).map(function (k) {
      var v = store.getString(k)
      return v === null ? null : { key: k, value: v, updated_at: meta[k] }
    }).filter(Boolean)
    await pushBatches(api, items, pushedVersions)
  }

  async function pushBatches(api, items, pushedVersions) {
    for (var offset = 0; offset < items.length; offset += PUSH_BATCH_SIZE) {
      var batch = items.slice(offset, offset + PUSH_BATCH_SIZE)
      var result = await api.push(batch)
      if (!result || result.status !== 200) break
      batch.forEach(function (item) {
        pushedVersions[item.key] = Math.max(pushedVersions[item.key] || 0, item.updated_at)
      })
    }
  }

  function applyAll(store, items) {
    items.forEach(function (it) { store.applyRemote(it.key, it.value, it.updated_at) })
  }

  /* 返回是否真的刷新了 */
  function reload(opts) {
    if (opts.noReload) return false
    try {
      if (root.sessionStorage.getItem(RELOAD_KEY)) return false /* 只自动刷一次，免得循环 */
      root.sessionStorage.setItem(RELOAD_KEY, '1')
    } catch (e) { /* 隐私模式存不了就照刷 */ }
    root.location.reload()
    return true
  }

  /* 立刻把指定的键推上云（不等防抖、不依赖 init 是否已挂好监听）：打印时记下的纸要马上能被手机扫到。
     推不上（网络慢、断网、登录态还没确认）不放弃：留在待推清单里，2、4、8…秒后重试，最多约 10 分钟；
     每次状态变化通知 onOutbox 的监听（打印页据此提示「已存到云端，可以扫码了」）。
     2026-11-24：之前推失败静默放弃，电脑打印的纸没上云、手机扫了一直找不到 */
  var outbox = Object.create(null)
  var outboxBusy = false
  var outboxAgain = false
  var outboxTimer = null
  var outboxTries = 0
  var outboxFns = []
  var RETRY_MS = [2000, 4000, 8000, 15000, 30000]
  var RETRY_MAX = 25

  function outboxEmit(state) {
    var info = { state: state, tries: outboxTries, left: Object.keys(outbox).length }
    outboxFns.forEach(function (fn) { try { fn(info) } catch (e) { /* 监听出错不影响推送 */ } })
  }

  function pushNow(keys) {
    ;(keys || []).forEach(function (k) { outbox[k] = true })
    outboxTries = 0
    if (outboxTimer) { clearTimeout(outboxTimer); outboxTimer = null }
    return drainOutbox()
  }

  async function drainOutbox() {
    if (outboxBusy) { outboxAgain = true; return false }
    var keys = Object.keys(outbox)
    if (!keys.length) return true
    outboxBusy = true
    var ok = false
    try {
      var A = root.SumSum.account
      if (A && A.state && A.state.loggedIn) {
        if (!outboxTries) outboxEmit('sending') /* 重试中就一直显示「正在重试」，别跳回「正在存」 */
        var store = S()
        var meta = store.meta()
        var items = keys.map(function (k) {
          var v = store.getString(k)
          return v === null ? null : { key: k, value: v, updated_at: meta[k] || Date.now() }
        }).filter(Boolean)
        var r = items.length ? await defaultApi().push(items) : { status: 200 }
        ok = !!(r && r.status === 200)
        if (ok) items.forEach(function (it) {
          /* 推的途中又改过（比如刚打了分）就留着下一轮再推 */
          if (store.getString(it.key) === it.value) delete outbox[it.key]
        })
        keys.forEach(function (k) { if (store.getString(k) === null) delete outbox[k] })
      }
    } catch (e) {
      ok = false
    }
    outboxBusy = false
    var left = Object.keys(outbox).length
    if (!left) {
      outboxTries = 0
      outboxEmit('ok')
      return true
    }
    if (outboxAgain || ok) { outboxAgain = false; return drainOutbox() }
    outboxTries++
    if (outboxTries > RETRY_MAX) { outboxEmit('failed'); return false }
    outboxEmit('retrying')
    outboxTimer = setTimeout(function () {
      outboxTimer = null
      drainOutbox()
    }, RETRY_MS[Math.min(outboxTries - 1, RETRY_MS.length - 1)])
    return false
  }

  if (root.addEventListener) {
    /* 网络恢复：立刻再推一次，不等计时器 */
    root.addEventListener('online', function () {
      if (!Object.keys(outbox).length) return
      if (outboxTimer) { clearTimeout(outboxTimer); outboxTimer = null }
      drainOutbox()
    })
  }

  function onOutbox(fn) {
    if (typeof fn === 'function') outboxFns.push(fn)
  }

  /* 只拉取、只补本机没有或更旧的键（打分页等电脑上传那张纸、打分抽屉打开时用）：返回补了几条。
     applied 给了就把补上的键名放进去（抽屉据此判断要不要刷新页面） */
  async function pullMissing(filter, applied) {
    var A = root.SumSum.account
    if (!A || !A.state || !A.state.loggedIn) return 0
    var r = await defaultApi().pull()
    if (!r || r.status !== 200 || !r.body || !r.body.items) return 0
    var store = S()
    var meta = store.meta()
    var n = 0
    r.body.items.forEach(function (it) {
      if (filter && !filter(it.key)) return
      if (store.getString(it.key) !== null && (meta[it.key] || 0) >= it.updated_at) return
      store.applyRemote(it.key, it.value, it.updated_at)
      if (applied) applied.push(it.key)
      n++
    })
    return n
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.sync = { init: init, flush: flush, pushNow: pushNow, onOutbox: onOutbox, pullMissing: pullMissing }
})(typeof window !== 'undefined' ? window : globalThis)
