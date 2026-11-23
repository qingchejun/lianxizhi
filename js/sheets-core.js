/**
 * 纸记录（扫码登记）核心：纸号、记录结构、60 天清理、按错题定档、待登记列表，
 * 以及打完分怎么作用到下一张（口算 / 奥数 / 游戏）。
 *
 * 每张打印出去的纸一个同步键 sumsum:sheet:v1:<纸号>（按键合并：电脑出新纸、手机打分互不覆盖）。
 * 同步不传播删除，所以清理要服务器（拉取时）和本机（同步前）按同一条规则各删一次，
 * 见 server/auth-core.js dataPull 与 js/sync.js。
 *
 * 打分值统一 good / ok / bad：口算、奥数显示「会了 / 一般 / 不会」，游戏显示「太简单 / 刚好 / 太难」。
 *
 * 无 DOM 依赖，node 下由 tools/check-sheets.js 校验。
 */
;(function (root) {
  'use strict'

  var PREFIX = 'sumsum:sheet:v1:'
  var KEEP_DAYS = 60
  var DAY = 86400000
  var ID_CHARS = '23456789abcdefghjkmnpqrstuvwxyz'
  var ID_RE = /^[23456789abcdefghjkmnpqrstuvwxyz]{6}$/

  /* 各板块的登记方式：three = 三档（可展开点错题）；game = 太简单/刚好/太难；
     chars = 点没认出的字；link = 回板块页登记 */
  var MODULE_KIND = {
    kousuan: 'three',
    aoshu: 'three',
    shudu: 'game',
    huochai: 'game',
    mima: 'game',
    migong: 'game',
    zhizhi: 'game',
    shizi: 'chars',
    pinyin: 'link'
  }

  var MODULE_LABEL = {
    kousuan: '口算',
    aoshu: '奥数',
    shudu: '数独',
    huochai: '火柴',
    mima: '密码',
    migong: '迷宫',
    zhizhi: '数织',
    shizi: '识字',
    pinyin: '拼音'
  }

  /* ---------- 纸号 ---------- */

  /* FNV-1a 32 位，再按字符集取 6 位：同一张纸（板块 + 设置 + 种子 + 日期）重渲染纸号不变 */
  function makeId(parts) {
    var str = String(parts)
    var h = 0x811c9dc5
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i)
      h = Math.imul(h, 16777619) >>> 0
    }
    var out = ''
    for (var k = 0; k < 6; k++) {
      out += ID_CHARS.charAt(h % ID_CHARS.length)
      h = Math.floor(h / ID_CHARS.length)
      if (h < ID_CHARS.length) h = (Math.imul(h ^ (k + 1) ^ 0x9e3779b9, 16777619) >>> 0)
    }
    return out
  }

  function validId(id) {
    return typeof id === 'string' && ID_RE.test(id)
  }

  function keyOf(id) {
    return PREFIX + id
  }

  function isSheetKey(k) {
    return typeof k === 'string' && k.indexOf(PREFIX) === 0
  }

  /* ---------- 记录 ---------- */

  function newRecord(info, now) {
    return {
      id: info.id,
      module: info.module,
      title: String(info.title || ''),
      date: info.date,
      printedAt: now,
      units: Array.isArray(info.units) ? info.units : [],
      items: Array.isArray(info.items) ? info.items : [],
      ref: info.ref || null,
      rating: null,
      wrong: null,
      applied: null
    }
  }

  function parse(raw) {
    if (raw && typeof raw === 'object') return raw
    try {
      var o = JSON.parse(raw)
      return o && typeof o === 'object' && typeof o.id === 'string' ? o : null
    } catch (e) {
      return null
    }
  }

  function lastTouched(rec) {
    var t = Number(rec.printedAt) || 0
    if (rec.rating && typeof rec.rating === 'object') {
      Object.keys(rec.rating).forEach(function (k) {
        var r = rec.rating[k]
        if (r && Number(r.at) > t) t = Number(r.at)
      })
    }
    return t
  }

  /* 该清理的纸键：坏了的、或最后一次动它（打印 / 打分）早于 60 天 */
  function staleKeys(entries, now) {
    var limit = now - KEEP_DAYS * DAY
    var out = []
    entries.forEach(function (e) {
      if (!isSheetKey(e.key)) return
      var r = parse(e.value)
      if (!r || lastTouched(r) < limit) out.push(e.key)
    })
    return out
  }

  /* ---------- 定档 ---------- */

  /* 展开点了错题时自动选档：错 0–1 题 → 会了；错一半及以上 → 不会；其余 → 一般。
     题很少时（≤2 题）错 1 题算一般 */
  function levelFromWrong(total, wrong) {
    if (wrong * 2 >= total && total > 0 && wrong > 0 && !(total <= 2 && wrong === 1)) return 'bad'
    if (wrong === 0 || (wrong === 1 && total > 2)) return 'good'
    return 'ok'
  }

  function rated(rec) {
    return !!(rec.rating && Object.keys(rec.rating).length)
  }

  /* ---------- 待登记 ---------- */

  function pad(n) {
    return (n < 10 ? '0' : '') + n
  }

  function prevDate(d) {
    var p = String(d).split('-')
    var t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]) - DAY)
    return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate())
  }

  /* 今天和昨天打印、还没登记的纸，新的在前。识字 / 拼音是否登记过由调用方按板块数据填 rec.done */
  function pending(records, today) {
    var y = prevDate(today)
    return records.filter(function (r) {
      return r && (r.date === today || r.date === y) && !rated(r) && !r.done
    }).sort(function (x, z) {
      return (z.printedAt || 0) - (x.printedAt || 0)
    })
  }

  /* 一张纸最后一次打分的时间（没打过分为 0） */
  function ratedAt(rec) {
    var t = 0
    if (rec && rec.rating) {
      Object.keys(rec.rating).forEach(function (k) {
        var r = rec.rating[k]
        if (r && Number(r.at) > t) t = Number(r.at)
      })
    }
    return t
  }

  function levelOf(rec, unit) {
    var r = rec && rec.rating && rec.rating[unit || 'all']
    return r ? r.level : null
  }

  /* ---------- 口算 ---------- */

  function hasCarry(a, b) {
    while (a > 0 || b > 0) {
      if ((a % 10) + (b % 10) >= 10) return true
      a = Math.floor(a / 10)
      b = Math.floor(b / 10)
    }
    return false
  }

  function hasBorrow(a, b) {
    while (b > 0) {
      if (a % 10 < b % 10) return true
      a = Math.floor(a / 10)
      b = Math.floor(b / 10)
    }
    return false
  }

  /* 题目分类：进位加 / 退位减 / 不进退位 / 乘 / 除 / 混合（多于一个运算符） */
  function kousuanCat(q) {
    var t = q.tokens || []
    var ops = t.filter(function (x) { return typeof x === 'string' && x !== '(' && x !== ')' })
    if (ops.length !== 1) return 'mixed'
    var op = ops[0]
    var a = t[0]
    var b = t[2]
    if (op === '×') return 'mul'
    if (op === '÷') return 'div'
    if (op === '+') return hasCarry(a, b) ? 'carry' : 'plain'
    if (op === '−' || op === '-') return a >= b && hasBorrow(a, b) ? 'borrow' : 'plain'
    return 'mixed'
  }

  function kousuanItems(questions) {
    return questions.map(function (q) {
      return { key: q.key, label: q.tokens.join(' ') + ' =', cat: kousuanCat(q) }
    })
  }

  var MUST_MAX = 5

  /* 下一张口算怎么调（只作用于下一张，不改设置）：
     点过的错题最多 5 道原样再出；错题里进退位占一半以上、或整张「不会」→ 临时以进退位为主 */
  function kousuanNext(last, settings) {
    var out = { mustInclude: [], carryOverride: null }
    if (!last || !rated(last)) return out
    var wrong = Array.isArray(last.wrong) ? last.wrong : []
    out.mustInclude = wrong.slice(0, MUST_MAX)
    var cats = {}
    ;(last.items || []).forEach(function (it) { cats[it.key] = it.cat })
    var hard = wrong.filter(function (k) { return cats[k] === 'carry' || cats[k] === 'borrow' }).length
    var want = levelOf(last) === 'bad' || (wrong.length > 0 && hard * 2 >= wrong.length)
    var mode = settings && settings.carryMode
    if (want && (mode === 'random' || mode === 'nocarry')) out.carryOverride = 'carrymore'
    return out
  }

  /* 同一预设最近两张都「会了」→ 提示升到下一个预设（返回它的 label），否则 null */
  function kousuanUpgrade(recs, presets) {
    var list = recs.filter(function (r) { return r && rated(r) }).sort(function (x, z) {
      return ratedAt(z) - ratedAt(x)
    })
    if (list.length < 2) return null
    var a = list[0]
    var b = list[1]
    var pa = a.ref && a.ref.preset
    if (!pa || pa !== (b.ref && b.ref.preset)) return null
    if (levelOf(a) !== 'good' || levelOf(b) !== 'good') return null
    for (var i = 0; i < presets.length - 1; i++) {
      if (presets[i].label === pa) return presets[i + 1].label
    }
    return null
  }

  /* ---------- 奥数 ---------- */

  function addTo(arr, v) {
    if (arr.indexOf(v) < 0) arr.push(v)
  }
  function drop(arr, v) {
    var i = arr.indexOf(v)
    if (i >= 0) arr.splice(i, 1)
  }

  /* 三档作用到「已学」与「待复习」：会了 → 标已学、移出待复习；一般 → 标已学 + 进待复习；
     不会 → 不动已学（不删以前标的）、建议再练（今天页）；点过错题的课一律进待复习。不改入参 */
  function aoshuApply(state, unitRatings, wrongTopics) {
    var learned = (state.learned || []).slice()
    var due = (state.due || []).slice()
    Object.keys(unitRatings || {}).forEach(function (id) {
      var lv = unitRatings[id]
      if (lv === 'good') {
        addTo(learned, id)
        drop(due, id)
      } else if (lv === 'ok') {
        addTo(learned, id)
        addTo(due, id)
      }
    })
    ;(wrongTopics || []).forEach(function (id) { addTo(due, id) })
    return { learned: learned, due: due }
  }

  function aoshuDiff(before, after) {
    function minus(x, y) { return x.filter(function (v) { return y.indexOf(v) < 0 }) }
    return {
      learnedAdded: minus(after.learned, before.learned),
      dueAdded: minus(after.due, before.due),
      dueRemoved: minus(before.due, after.due)
    }
  }

  /* 撤回上一次作用（改档时先撤回再重新作用，不叠加） */
  function aoshuRevert(state, applied) {
    var learned = (state.learned || []).slice()
    var due = (state.due || []).slice()
    if (applied) {
      ;(applied.learnedAdded || []).forEach(function (id) { drop(learned, id) })
      ;(applied.dueAdded || []).forEach(function (id) { drop(due, id) })
      ;(applied.dueRemoved || []).forEach(function (id) { addTo(due, id) })
    }
    return { learned: learned, due: due }
  }

  /* ---------- 游戏 ---------- */

  var GAME_LEVELS = ['L1', 'L2', 'L3', 'L4']

  /* 太简单（good）→ 升一档；太难（bad）→ 降一档；刚好不变；到顶到底不动。
     数独的难度是提示数：少给提示更难，每步 = 范围的约 1/6 */
  function gameStep(module, settings, level, clueRange) {
    var prev = Object.assign({}, settings)
    var next = Object.assign({}, settings)
    var dir = level === 'good' ? 1 : level === 'bad' ? -1 : 0
    if (module === 'shudu') {
      var r = clueRange || { min: 5, max: 12 }
      var step = Math.max(1, Math.ceil((r.max - r.min) / 6))
      var c = Number(settings.clues)
      var nc = Math.min(r.max, Math.max(r.min, c - dir * step))
      next.clues = nc
      return { prev: prev, next: next, changed: nc !== c }
    }
    var i = GAME_LEVELS.indexOf(settings.level)
    if (i < 0) i = 0
    var ni = Math.min(GAME_LEVELS.length - 1, Math.max(0, i + dir))
    next.level = GAME_LEVELS[ni]
    return { prev: prev, next: next, changed: ni !== i }
  }

  function gameLevelText(module, settings) {
    if (module === 'shudu') return settings.clues + ' 个提示数'
    return '第 ' + String(settings.level || 'L1').replace('L', '') + ' 关'
  }

  /* 本机全部纸记录（坏的跳过） */
  function records(store) {
    return store.keys().filter(isSheetKey).map(function (k) {
      return parse(store.getString(k))
    }).filter(Boolean)
  }

  /* 某板块「最近一次打完分、而且之后还没打印过新纸」的记录：下一张按它调；
     打印了新纸就算用过了，不会一直重复同一批错题 */
  function lastRatedUnused(recs, module) {
    var mine = recs.filter(function (r) { return r.module === module })
    var best = null
    mine.forEach(function (r) {
      if (rated(r) && (!best || ratedAt(r) > ratedAt(best))) best = r
    })
    if (!best) return null
    var t = ratedAt(best)
    var printedAfter = mine.some(function (r) { return r.id !== best.id && (r.printedAt || 0) > t })
    return printedAfter ? null : best
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.sheetsCore = {
    records: records,
    lastRatedUnused: lastRatedUnused,
    aoshuApply: aoshuApply,
    aoshuDiff: aoshuDiff,
    aoshuRevert: aoshuRevert,
    GAME_LEVELS: GAME_LEVELS,
    gameStep: gameStep,
    gameLevelText: gameLevelText,
    ratedAt: ratedAt,
    levelOf: levelOf,
    kousuanCat: kousuanCat,
    kousuanItems: kousuanItems,
    kousuanNext: kousuanNext,
    kousuanUpgrade: kousuanUpgrade,
    PREFIX: PREFIX,
    KEEP_DAYS: KEEP_DAYS,
    MODULE_KIND: MODULE_KIND,
    MODULE_LABEL: MODULE_LABEL,
    makeId: makeId,
    validId: validId,
    keyOf: keyOf,
    isSheetKey: isSheetKey,
    newRecord: newRecord,
    parse: parse,
    lastTouched: lastTouched,
    staleKeys: staleKeys,
    levelFromWrong: levelFromWrong,
    rated: rated,
    prevDate: prevDate,
    pending: pending
  }
})(typeof window !== 'undefined' ? window : globalThis)
