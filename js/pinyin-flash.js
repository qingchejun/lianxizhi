/**
 * 拼音知识点闪卡的纸样（2026-11-28）。纯字符串拼 HTML，无 DOM 依赖，node 下能测。
 *
 * 一页 A4 纵向 6 张（2 列 × 3 行）或 4 张大卡（2 × 2）。每格上半是正面、下半是背面（转 180°）：
 * 沿中间虚线往后折，背面朝外；孩子像翻书一样左右翻过来，背面正好是正的。外框实线是剪裁线。
 * 只做对折、不做双面打印（不用对齐）。样式在 css/pinyin.css 的 .pfc-*。
 */
;(function (root) {
  'use strict'

  var HAN = /[㐀-鿿]/

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  /* 大号那一行：纯拼音用拼音字体、更大；夹着汉字的（「n 读不出来」）字号小一档 */
  function big(text) {
    return '<div class="pfc-big' + (HAN.test(text) ? ' is-zh' : '') + '">' + esc(text) + '</div>'
  }

  function front(card) {
    return '<div class="pfc-face pfc-front">' +
      '<div class="pfc-tag">第 ' + card.lesson + ' 课 · ' + esc(card.title) + '</div>' +
      big(card.front.big) +
      '<div class="pfc-ask">' + esc(card.front.ask) + '</div>' +
      '</div>'
  }

  function back(card) {
    var b = card.back
    return '<div class="pfc-face pfc-back">' +
      big(b.big) +
      '<div class="pfc-lines">' +
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
   * cards → 若干页。opts：{ size: 'm'（一页 6 张，默认）| 'l'（一页 4 张大卡）, title }
   */
  function sheets(cards, opts) {
    var o = opts || {}
    var per = o.size === 'l' ? 4 : 6
    var pages = []
    for (var i = 0; i < Math.max(cards.length, 1); i += per) {
      var slice = cards.slice(i, i + per)
      while (slice.length < per) slice.push(null)
      pages.push('<section class="pfc-page is-' + (per === 4 ? 'l' : 'm') + '">' +
        '<div class="pfc-grid">' + slice.map(cell).join('') + '</div>' +
        '<footer class="pfc-how"><b>' + esc(o.title || '拼音闪卡') + '</b>' + HOW + '</footer>' +
        '</section>')
    }
    return pages
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.pinyinFlash = { sheets: sheets, HOW: HOW }
})(typeof window !== 'undefined' ? window : globalThis)
