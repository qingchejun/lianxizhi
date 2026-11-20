/**
 * 算式迷宫页设置管理：默认值、输入校验（钳位）、localStorage 持久化、URL 参数编解码。
 * 加载优先级：默认值 ← localStorage ← URL 参数。套路与 js/mima-settings.js 一致。
 */
(function (root) {
  'use strict'

  var KEY = 'sumsum:migong:v1'

  var DEFAULTS = Object.freeze({
    level: 'L1', // 一年级从 10 以内加法起步
    /* 一张卷 4 张迷宫：两页的量，做完正好休息 */
    count: 4,
    /* 默认印两份：父子同题对战（L1/L2 同页双份，大迷宫整卷分份印） */
    copies: 2,
    noDuplicates: true,
    answerPage: false,
    seed: 0, // 0 = 未指定；load() 会补一个随机种子
    title: ''
  })

  function clampInt(v, min, max, fallback) {
    if (v === '' || v == null) return fallback // Number('') === 0，需单独处理空输入
    var n = Number(v)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, Math.round(n)))
  }

  function toBool(v, fallback) {
    if (v === true || v === 'true' || v === '1') return true
    if (v === false || v === 'false' || v === '0') return false
    return fallback
  }

  function sanitize(raw) {
    var s = Object.assign({}, DEFAULTS, raw)
    var order = root.SumSum.migong.LEVEL_ORDER
    var level = order.indexOf(s.level) >= 0 ? s.level : DEFAULTS.level
    return {
      level: level,
      count: clampInt(s.count, 1, 8, DEFAULTS.count),
      copies: clampInt(s.copies, 1, 2, DEFAULTS.copies),
      noDuplicates: toBool(s.noDuplicates, DEFAULTS.noDuplicates),
      answerPage: toBool(s.answerPage, DEFAULTS.answerPage),
      seed: clampInt(s.seed, 0, 999999999, DEFAULTS.seed),
      title: String(s.title == null ? '' : s.title).slice(0, 30)
    }
  }

  function newSeed() {
    return Math.floor(Math.random() * 999999998) + 1
  }

  /*
   * 读取设置。网址里带参数时**完全忽略** localStorage —— save() 会把所有非默认项
   * 写进网址，所以「默认值 + 网址参数」正好复原分享者当时的设置（同 mima）。
   */
  function load() {
    var fromUrl = {}
    var hasUrl = false
    try {
      new URLSearchParams(root.location.search).forEach(function (v, k) {
        if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) {
          fromUrl[k] = v
          hasUrl = true
        }
      })
    } catch (e) {
      fromUrl = {}
    }
    var base = {}
    if (!hasUrl) {
      try {
        base = JSON.parse(root.localStorage.getItem(KEY)) || {}
      } catch (e) {
        base = {} // 隐私模式或数据损坏时回退默认值
      }
      delete base.seed // 从书签进来应当是新的一批题，不沿用上次的种子
    }
    var out = sanitize(Object.assign({}, base, fromUrl))
    if (!out.seed) out.seed = newSeed()
    return out
  }

  /* 保存：写 localStorage，并把「非默认值」的项同步进 URL（保持链接干净可收藏） */
  function save(s) {
    try {
      root.SumSum.store.set(KEY, s)
    } catch (e) {
      /* 隐私模式下写入失败可忽略 */
    }
    try {
      var params = new URLSearchParams()
      Object.keys(DEFAULTS).forEach(function (k) {
        if (s[k] !== DEFAULTS[k]) params.set(k, String(s[k]))
      })
      var qs = params.toString()
      root.history.replaceState(null, '', qs ? '?' + qs : root.location.pathname)
    } catch (e) {
      /* file:// 协议下 replaceState 可能受限，忽略 */
    }
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.migongSettings = {
    DEFAULTS: DEFAULTS,
    sanitize: sanitize,
    newSeed: newSeed,
    load: load,
    save: save
  }
})(typeof window !== 'undefined' ? window : globalThis)
