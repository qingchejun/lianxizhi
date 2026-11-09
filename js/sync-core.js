/**
 * 云同步的合并规则（纯函数，无 IO；node 下由 tools/check-sync.js 校验）。
 *
 * 每键 LWW：本地 mtime 对云端 updated_at，新者胜；相平谁也不动——两台设备时钟
 * 有偏差，平局如果不稳定会互相覆盖来回打乒乓。本地有值但没 mtime 的键是
 * 「同步功能上线前的老数据」，不能替用户做主，交给首登确认（js/sync.js）。
 */
;(function (root) {
  'use strict'

  function planFirstLogin(cloudCount, unresolvedCount, localCount) {
    if (!cloudCount && localCount) return 'push-all'
    if (unresolvedCount) return 'confirm'
    return 'none'
  }

  /**
   * localMeta: {key: mtime}；localHas(key)->bool；cloudItems: [{key, value, updated_at}]
   * 返回 { apply: [{key, value, mtime}], pushKeys: [key], unresolved: [key] }
   */
  function merge(localMeta, localHas, cloudItems) {
    var apply = []
    var pushKeys = []
    var unresolved = []
    var seen = {}
    cloudItems.forEach(function (it) {
      seen[it.key] = true
      var lm = localMeta[it.key]
      if (lm == null) {
        if (localHas(it.key)) unresolved.push(it.key)
        else apply.push({ key: it.key, value: it.value, mtime: it.updated_at })
        return
      }
      if (lm > it.updated_at) pushKeys.push(it.key)
      else if (lm < it.updated_at) apply.push({ key: it.key, value: it.value, mtime: it.updated_at })
      /* 相平：谁也不动 */
    })
    Object.keys(localMeta).forEach(function (k) {
      if (!seen[k] && localHas(k)) pushKeys.push(k)
    })
    return { apply: apply, pushKeys: pushKeys, unresolved: unresolved }
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.syncCore = { planFirstLogin: planFirstLogin, merge: merge }
})(typeof window !== 'undefined' ? window : globalThis)
