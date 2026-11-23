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

  root.SumSum = root.SumSum || {}
  root.SumSum.sheetsCore = {
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
