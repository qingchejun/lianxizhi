/**
 * 拼音知识点闪卡：挑卡 + 纸样（2026-11-28）。纯函数，无 DOM 依赖，tools/check-pinyin-cards.js 在 node 里测。
 *
 * 纸样：一页 A4 纵向 6 张（2 列 × 3 行）或 4 张大卡（2 × 2）。每格上半是正面、下半是背面（转 180°）：
 * 沿中间虚线往后折，背面朝外；孩子像翻书一样左右翻过来，背面正好是正的。外框实线是剪裁线。
 * 只做对折、不做双面打印（不用对齐）。样式在 css/pinyin.css 的 .pfc-*。
 *
 * 挑卡（pick）：一页 = 这一课的卡 → 前面课里拼音进度「该练了」的知识点的卡 → 前面课的卡按日子轮着补满。
 * 只读进度（pinyin-core derive 的 state），闪卡本身不打分、不写进度（方案第六节）。
 */
;(function (root) {
  'use strict'

  var HAN = /[㐀-鿿]/

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  /* ---------- 挑卡 ---------- */

  /* 拼音进度里「该练了」：练过、还没掌握、到日子了（和拼音目录的「该练了」同一个口径） */
  function isDue(s, today) {
    if (!s || !s.observed) return false
    if (s.streak >= 2 && !s.due) return false
    return !s.due || s.due <= today
  }

  function hash(text) {
    var h = 0
    for (var i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) >>> 0
    return h
  }

  /*
   * cards：全部卡；lesson：第几课（1–14）；state：pinyin.derive 的结果（可以是 {}）；today 'YYYY-MM-DD'；per 一页几张。
   * 返回 [{ card, why: 'lesson' | 'due' | 'review' }]，最多 per 张；这一课的卡比 per 多时只取前 per 张。
   */
  function pick(cards, lesson, state, today, per) {
    var out = []
    var used = Object.create(null)
    function add(card, why) {
      if (out.length >= per || used[card.id]) return
      used[card.id] = true
      out.push({ card: card, why: why })
    }
    cards.filter(function (c) { return c.lesson === lesson }).forEach(function (c) { add(c, 'lesson') })
    var before = cards.filter(function (c) { return c.lesson < lesson })
    before.filter(function (c) { return c.direction && isDue((state || {})[c.direction], today) })
      .forEach(function (c) { add(c, 'due') })
    if (before.length) {
      /* 剩下的按课倒着排（离现在近的先复习），起点按日子轮转，隔天印出来不完全一样 */
      var rest = before.slice().sort(function (a, b) { return b.lesson - a.lesson })
      var start = hash(String(today) + ':' + lesson) % rest.length
      rest.slice(start).concat(rest.slice(0, start)).forEach(function (c) { add(c, 'review') })
    }
    return out
  }

  /* 孩子正在学哪一课：拼音进度里练过的最后一课（课程顺序），一课没练过就是第 1 课 */
  function currentLesson(lessons, state) {
    var at = 1
    lessons.forEach(function (l, i) {
      if (l.directions.some(function (d) { return state && state[d] && state[d].observed })) at = i + 1
    })
    return at
  }

  /* ---------- 纸样 ---------- */

  /* 大号那一行：纯拼音用拼音字体、更大；夹着汉字的（「n 读不出来」）字号小一档 */
  function big(text) {
    return '<div class="pfc-big' + (HAN.test(text) ? ' is-zh' : '') + '">' + esc(text) + '</div>'
  }

  function front(card) {
    return '<div class="pfc-face pfc-front">' +
      '<div class="pfc-tag">' + (card.lesson ? '第 ' + card.lesson + ' 课 · ' : '') + esc(card.title) + '</div>' +
      big(card.front.big) +
      '<div class="pfc-ask">' + esc(card.front.ask) + '</div>' +
      '</div>'
  }

  function back(card) {
    var b = card.back
    return '<div class="pfc-face pfc-back">' +
      big(b.big) +
      '<div class="pfc-lines">' +
      (b.list ? '<p><b>全部</b><span class="pfc-py">' + esc(b.list) + '</span></p>' : '') +
      (b.rhyme ? '<p><b>口诀</b>' + esc(b.rhyme) + '</p>' : '') +
      (b.words ? '<p><b>例</b><span class="pfc-py">' + esc(b.words) + '</span></p>' : '') +
      (b.pitfall ? '<p><b>易错</b>' + esc(b.pitfall) + '</p>' : '') +
      '</div></div>'
  }

  function cell(card) {
    if (!card) return '<div class="pfc-cell is-empty"></div>'
    return '<div class="pfc-cell" data-card="' + esc(card.id) + '">' + front(card) + back(card) + '</div>'
  }

  var HOW = '剪下沿虚线往后折。家长念问题，孩子答完左右翻过来对。分三堆：会了、犹豫、不会；不会的明天再过，会了的一周过一次。'

  /*
   * cards → 若干页 HTML（每页一个 section.sheet，屏幕上和别的练习纸一样是一张白纸）。
   * opts：{ size: 'm'（一页 6 张，默认）| 'l'（一页 4 张大卡）, title }
   */
  function sheets(cards, opts) {
    var o = opts || {}
    var per = o.size === 'l' ? 4 : 6
    var pages = []
    for (var i = 0; i < Math.max(cards.length, 1); i += per) {
      var slice = cards.slice(i, i + per)
      while (slice.length < per) slice.push(null)
      pages.push('<section class="sheet pfc-page is-' + (per === 4 ? 'l' : 'm') + '">' +
        '<div class="pfc-grid">' + slice.map(cell).join('') + '</div>' +
        '<footer class="pfc-how"><b>' + esc(o.title || '拼音闪卡') + '</b>' + HOW + '</footer>' +
        '</section>')
    }
    return pages
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.pinyinFlash = { sheets: sheets, pick: pick, currentLesson: currentLesson, isDue: isDue, HOW: HOW }
})(typeof window !== 'undefined' ? window : globalThis)
