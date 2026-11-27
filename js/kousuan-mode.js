/**
 * 口算出题方式的状态（2026-11-28）：按教材 / 按难度，以及家长自己存的难度。无 DOM，node 下由 tools/check-kousuan-tags.js 校验。
 *
 *   sumsum:kousuan:mode:v1  { kind: 'book' | 'level', book, unit, pick, blankMid, chain }
 *     pick：难度预设 'as3'（加减 3 级）或自己存的难度 'p:<id>'；blankMid / chain 是预设的「空在中间」「两步」
 *   sumsum:kousuan:plans:v1 { plans: [{ id, name, kind: 'tags' | 'params', tags, blankMid, s }] }
 *     tags：挑题型存下的难度；params：按数的范围定（原来右栏那套参数，s 里是 generator 的参数）
 *
 * 老用户（本机已经有 sumsum:settings:v1）第一次打开：原来的参数存成一套「我原来的设置」，默认就用它，纸不变样。
 * 新用户默认按教材：人教版，按月份猜学到哪（9 月第一单元……，界面上提醒改成学校的进度）。
 */
;(function (root) {
  'use strict'

  var MODE_KEY = 'sumsum:kousuan:mode:v1'
  var PLANS_KEY = 'sumsum:kousuan:plans:v1'
  var OLD_KEY = 'sumsum:settings:v1'
  var PLAN_MAX = 20
  /* 原来那套参数里决定「出什么题」的部分（排版、题量、标题不算） */
  var PARAM_KEYS = ['mode', 'min', 'max', 'mulMin', 'mulMax', 'carryMode', 'blankMode', 'allowNegative', 'exactDivision', 'parens', 'skipTrivial', 'noDuplicates']

  function T() { return root.SumSum.kousuanTags }

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v) }

  /* 按月份猜学校进度（只用于新用户第一次打开） */
  function guessBook(date) {
    var m = (date || new Date()).getMonth() + 1
    var A = { 9: 1, 10: 2, 11: 4, 12: 5, 1: 5 }
    var B = { 2: 1, 3: 1, 4: 2, 5: 3, 6: 4, 7: 4, 8: 4 }
    if (A[m] != null) return { book: 'rj1a', unit: A[m] }
    return { book: 'rj1b', unit: B[m] }
  }

  function pickParams(s) {
    var out = {}
    PARAM_KEYS.forEach(function (k) { if (s && k in s) out[k] = s[k] })
    return out
  }

  function cleanPlan(p) {
    if (!isObj(p) || typeof p.id !== 'string' || !p.id) return null
    var kind = p.kind === 'params' ? 'params' : 'tags'
    var out = { id: p.id.slice(0, 20), name: String(p.name || '我的难度').slice(0, 20), kind: kind }
    if (kind === 'tags') {
      out.tags = (Array.isArray(p.tags) ? p.tags : []).filter(function (t) { return T().TAGS[t] })
      out.blankMid = !!p.blankMid
    } else {
      out.s = pickParams(isObj(p.s) ? p.s : {})
    }
    return out
  }

  function readPlans(store) {
    var raw = store.get(PLANS_KEY)
    var list = isObj(raw) && Array.isArray(raw.plans) ? raw.plans : []
    return list.map(cleanPlan).filter(Boolean).slice(0, PLAN_MAX)
  }

  function savePlans(store, plans) {
    store.set(PLANS_KEY, { plans: plans.slice(0, PLAN_MAX) })
  }

  function cleanMode(m, plans) {
    var g = guessBook()
    var out = {
      kind: m && m.kind === 'level' ? 'level' : 'book',
      book: m && T().BOOKS[m.book] ? m.book : g.book,
      unit: 0,
      pick: 'as1',
      blankMid: !!(m && m.blankMid),
      chain: !!(m && m.chain)
    }
    var units = T().BOOKS[out.book].units.length
    out.unit = m && m.unit >= 0 && m.unit < units ? Math.floor(m.unit) : Math.min(units - 1, g.unit)
    var pick = m && m.pick
    if (T().parseLevel(pick)) out.pick = pick
    else if (typeof pick === 'string' && pick.indexOf('p:') === 0 && plans.some(function (p) { return 'p:' + p.id === pick })) out.pick = pick
    return out
  }

  /*
   * 打开口算页时调用：返回 { mode, plans }。第一次（没有 mode 键）：
   *   本机有老设置 → 存一套「我原来的设置」，按难度、选中它；
   *   没有 → 按教材（按月份猜进度）。
   */
  function init(store, date) {
    var plans = readPlans(store)
    var raw = store.get(MODE_KEY)
    if (isObj(raw)) return { mode: cleanMode(raw, plans), plans: plans, first: false, saved: true }
    var old = store.get(OLD_KEY)
    var mode
    if (isObj(old)) {
      if (!plans.some(function (p) { return p.id === 'old' })) {
        plans.unshift({ id: 'old', name: '我原来的设置', kind: 'params', s: pickParams(old) })
        savePlans(store, plans)
      }
      mode = cleanMode({ kind: 'level', pick: 'p:old' }, plans)
      store.set(MODE_KEY, mode)
      return { mode: mode, plans: plans, first: true, saved: true }
    }
    /* 新用户的默认值先不存：换了新设备、云端的老设置还没同步下来时，别抢先把「按教材」存上去盖掉。
       家长动过一次（或同步回来刷新后认出是老用户）才存 */
    var g = guessBook(date)
    mode = cleanMode({ kind: 'book', book: g.book, unit: g.unit }, plans)
    return { mode: mode, plans: plans, first: true, saved: false }
  }

  function saveMode(store, mode) {
    store.set(MODE_KEY, mode)
  }

  function planOf(mode, plans) {
    if (!mode || mode.pick.indexOf('p:') !== 0) return null
    var id = mode.pick.slice(2)
    return plans.filter(function (p) { return p.id === id })[0] || null
  }

  function newId(plans) {
    var n = 1
    while (plans.some(function (p) { return p.id === 'c' + n })) n++
    return 'c' + n
  }

  function unitName(book, unit) {
    var u = T().BOOKS[book].units[unit]
    return u ? u[0] : ''
  }

  /* 单元名去掉「第几单元」，留给标题用：「第五单元 20 以内的进位加法」→「20 以内的进位加法」 */
  function shortUnit(name) {
    return String(name).replace(/^第.单元\s*/, '')
  }

  /*
   * 当前方式 → 怎么出题：
   *   { engine: 'tags', weights, blankMid, title, preset, label }  或
   *   { engine: 'params', params, title: '', preset: '', label }（交给原来的 generator，标题由它自动起）
   * preset：难度预设 id（升级提示用），按教材和自己的难度为空。
   */
  function resolve(mode, plans) {
    var K = T()
    if (mode.kind === 'book') {
      var b = K.BOOKS[mode.book]
      var cur = b.units[mode.unit]
      var w = K.bookWeights(mode.book, mode.unit)
      var title = cur[1].length ? shortUnit(cur[0]) + '口算' : b.short + '口算复习'
      return { engine: 'tags', weights: w, blankMid: false, title: title, preset: '', label: b.short + ' · ' + shortUnit(cur[0]) }
    }
    var plan = planOf(mode, plans)
    if (plan && plan.kind === 'params') return { engine: 'params', params: plan.s, title: '', preset: '', label: plan.name }
    if (plan) return { engine: 'tags', weights: K.evenWeights(plan.tags), blankMid: plan.blankMid, title: plan.name, preset: '', label: plan.name }
    var lp = K.levelPlan(mode.pick, mode.chain)
    var l = K.parseLevel(mode.pick)
    var name = K.LEVELS[l.group][l.n - 1][0]
    return {
      engine: 'tags',
      weights: K.evenWeights(lp.tags),
      blankMid: mode.blankMid,
      title: name + (l.group === 'as' && mode.chain ? '（两步）' : '') + '口算',
      preset: mode.pick,
      label: K.levelName(mode.pick)
    }
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.kousuanMode = {
    MODE_KEY: MODE_KEY,
    PLANS_KEY: PLANS_KEY,
    PARAM_KEYS: PARAM_KEYS,
    PLAN_MAX: PLAN_MAX,
    init: init,
    saveMode: saveMode,
    readPlans: readPlans,
    savePlans: savePlans,
    planOf: planOf,
    newId: newId,
    pickParams: pickParams,
    unitName: unitName,
    shortUnit: shortUnit,
    guessBook: guessBook,
    resolve: resolve,
    cleanMode: cleanMode
  }
})(typeof window !== 'undefined' ? window : globalThis)
