/**
 * 纸记录（扫码打分）核心：纸号、记录结构、60 天清理、按错题定档、待打分列表与历史，
 * 以及打完分怎么作用到下一张（口算 / 奥数；识字、拼音各有自己的规则）。
 *
 * 2026-11-27 起打分只有一种手感（docs/superpowers/specs/2026-11-27-practice-loop-design.md）：
 * 选「全对」或点错题 → 提交。只给练习四板块（口算、奥数、识字、拼音）打分，游戏不打分。
 *
 * 每张打印出去的纸一个同步键 sumsum:sheet:v1:<纸号>（按键合并：电脑出新纸、手机打分互不覆盖）。
 * 同步不传播删除，所以清理要服务器（拉取时）和本机（同步前）按同一条规则各删一次，
 * 见 server/auth-core.js dataPull 与 js/sync.js。
 *
 * 记录里的档位 good / ok / bad 由错题比例自动算（levelFromWrong），家长看不到，奥数用它决定已学 / 待复习。
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

  /* 各板块打分卡的格子长什么样：three = 题（口算算式 / 奥数题号）；chars = 字；pinyin = 按组排的音节。
     游戏不在这里：2026-11-27 起游戏不打分 */
  var MODULE_KIND = {
    kousuan: 'three',
    aoshu: 'three',
    shizi: 'chars',
    pinyin: 'pinyin'
  }
  var PRACTICE = ['kousuan', 'aoshu', 'shizi', 'pinyin']

  function isPractice(module) {
    return PRACTICE.indexOf(module) >= 0
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
    var t = Math.max(Number(rec.printedAt) || 0, Number(rec.doneAt) || 0)
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

  /* 一张纸打过分没有：口算 / 奥数看 rating，识字 / 拼音由调用方按板块数据填 rec.done */
  function isDone(rec) {
    return !!(rec && (rated(rec) || rec.done))
  }

  /* 待打分：练习四板块、打印后 2 天内（今天和昨天）、还没打分的纸，新的在前。module 给了就只看这个板块。
     更早没打的不催（站长 11-27 定：不累积），到历史里能补 */
  function pending(records, today, module) {
    var y = prevDate(today)
    return records.filter(function (r) {
      return r && isPractice(r.module) && (!module || r.module === module) &&
        (r.date === today || r.date === y) && !isDone(r) && !r.skipped
    }).sort(function (x, z) {
      return (z.printedAt || 0) - (x.printedAt || 0)
    })
  }

  /* 某板块的历史：60 天内打印过的全部纸（含打过分的），新的在前 */
  function history(records, module) {
    return records.filter(function (r) {
      return r && r.module === module
    }).sort(function (x, z) {
      return (z.printedAt || 0) - (x.printedAt || 0)
    })
  }

  /* 卡片上的结论：全对 / 错 N 题 / 没打分 */
  function resultText(rec) {
    if (!isDone(rec) || rec.skipped) return '没打分'
    var n = Array.isArray(rec.wrong) ? rec.wrong.length : 0
    return n ? '错 ' + n + ' 题' : '全对'
  }

  /* 错题 → 每个打分单位的档位（全对 = 每个单位都 good）。units 为空时整张一个单位 all */
  function levelsFor(rec, wrong) {
    var units = rec.units && rec.units.length ? rec.units : [{ key: 'all' }]
    var set = {}
    ;(wrong || []).forEach(function (k) { set[k] = true })
    var out = {}
    units.forEach(function (u) {
      var mine = (rec.items || []).filter(function (it) { return units.length === 1 || it.unit === u.key })
      var n = mine.filter(function (it) { return set[it.key] }).length
      out[u.key] = { level: mine.length ? levelFromWrong(mine.length, n) : 'good', auto: true }
    })
    return out
  }

  /* 口算 / 奥数提交：wrong 为空 = 全对。档位自动算，再走 saveRating（改分先撤回再作用，不叠加） */
  function submit(store, rec, wrong, now) {
    var w = (wrong || []).filter(function (k) {
      return (rec.items || []).some(function (it) { return it.key === k })
    })
    return saveRating(store, rec, levelsFor(rec, w), w, now)
  }

  /* 拼音提交 → 每题的结果（拼音页 / 打分页共用；写进 pinyin:mark 由调用方做）。
     units = 纸上的组 { key, phase, parent }，items = 题 { key, unit }。规则（设计稿 1.1 第 6 条）：
       独立组：点了 = miss，没点 = ok；
       换题再试（check，卡住时才做）：它跟着的那组或它自己有错题才算做过，否则全组 unpracticed；
       试一试（observe，有余量再做）：自己有错题才算做过，否则 unpracticed。 */
  function pinyinResults(rec, wrong) {
    var set = {}
    ;(wrong || []).forEach(function (k) { set[k] = true })
    var hasWrong = {}
    ;(rec.items || []).forEach(function (it) { if (set[it.key]) hasWrong[it.unit] = true })
    var unitOf = {}
    ;(rec.units || []).forEach(function (u) { unitOf[u.key] = u })
    var out = {}
    ;(rec.items || []).forEach(function (it) {
      var u = unitOf[it.unit] || {}
      var done = u.phase === 'check' ? !!(hasWrong[it.unit] || (u.parent && hasWrong[u.parent]))
        : u.phase === 'observe' ? !!hasWrong[it.unit]
          : true
      out[it.key] = !done ? 'unpracticed' : set[it.key] ? 'miss' : 'ok'
    })
    return out
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

  /* ---------- 保存打分（打分页用） ---------- */

  var AOSHU_LEARNED = 'sumsum:aoshu:learned:v1'
  var AOSHU_DUE = 'sumsum:aoshu:review-due:v1'

  function arr(v) {
    return Array.isArray(v) ? v.slice() : []
  }

  /*
   * 保存一张纸的打分并作用到板块进度。levels: { 单位 key: { level, auto } }，wrong: 点过的错题 key。
   * 改档时先撤回上一次的作用再重新作用，不叠加。
   * 口算不在这里作用：出下一张时读最近一次打分（kousuanNext）。返回写好的记录。
   */
  function saveRating(store, rec, levels, wrong, now) {
    rec = Object.assign({}, rec)
    var rating = {}
    Object.keys(levels).forEach(function (u) {
      var l = levels[u]
      if (l && (l.level === 'good' || l.level === 'ok' || l.level === 'bad')) {
        rating[u] = { level: l.level, auto: !!l.auto, at: now }
      }
    })
    rec.rating = rating
    rec.wrong = Array.isArray(wrong) ? wrong.slice() : []
    delete rec.skipped

    if (rec.module === 'aoshu') {
      var state = { learned: arr(store.get(AOSHU_LEARNED)), due: arr(store.get(AOSHU_DUE)) }
      var base = aoshuRevert(state, rec.applied)
      var unitOf = {}
      ;(rec.items || []).forEach(function (it) { unitOf[it.key] = it.unit })
      var wrongTopics = []
      rec.wrong.forEach(function (k) { if (unitOf[k]) addTo(wrongTopics, unitOf[k]) })
      var lv = {}
      Object.keys(rating).forEach(function (u) { lv[u] = rating[u].level })
      var next = aoshuApply(base, lv, wrongTopics)
      store.set(AOSHU_LEARNED, next.learned)
      store.set(AOSHU_DUE, next.due)
      rec.applied = aoshuDiff(base, next)
    }

    store.set(keyOf(rec.id), rec)
    return rec
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
    AOSHU_LEARNED: AOSHU_LEARNED,
    AOSHU_DUE: AOSHU_DUE,
    saveRating: saveRating,
    submit: submit,
    levelsFor: levelsFor,
    pinyinResults: pinyinResults,
    lastRatedUnused: lastRatedUnused,
    aoshuApply: aoshuApply,
    aoshuDiff: aoshuDiff,
    aoshuRevert: aoshuRevert,
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
    PRACTICE: PRACTICE,
    isPractice: isPractice,
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
    isDone: isDone,
    resultText: resultText,
    prevDate: prevDate,
    pending: pending,
    history: history
  }
})(typeof window !== 'undefined' ? window : globalThis)
