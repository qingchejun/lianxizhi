;(function (root) {
  'use strict'

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char])
  }

  /* 标题、教学卡里夹着的拼音字母也用拼音字体（单层 ɑ、ɡ），不然印出来是英文的双层 a、g（2026-11-27 站长实拍发现）。
     先切段再转义，免得把 &amp; 这类转义里的字母也包进去 */
  const LATIN = /[A-Za-zÀ-ʯ\u0300-\u036f]+/g
  function latin(value) {
    const text = String(value ?? '')
    let out = ''
    let last = 0
    for (const m of text.matchAll(LATIN)) {
      out += escape(text.slice(last, m.index)) + '<span class="py-latin">' + escape(m[0]) + '</span>'
      last = m.index + m[0].length
    }
    return out + escape(text.slice(last))
  }

  const circled = ['①', '②', '③', '④', '⑤', '⑥']

  function steps(list) {
    return list.map((text, index) => (circled[index] || (index + 1) + '.') + ' ' + latin(text)).join('　')
  }

  // Teaching card as labelled lines: what to watch, how to explain, a demo, then numbered guide steps.
  function teachingLines(card) {
    return (card.probe ? '<p><b>先观察</b>　' + latin(card.probe) + '</p>' : '') +
      '<p><b>怎么讲</b>　' + latin(card.tip) + '</p>' +
      '<p><b>示范</b>　' + latin(card.demo) + '</p>' +
      '<p><b>引导</b>　' + steps(card.guide) + '</p>'
  }

  function teaching(card) {
    return teachingLines(card)
  }

  function prompt(item) {
    return '<div class="pinyin-prompt"><span>' + escape(item.id) + '.</span><span class="pinyin-text">' +
      escape(item.text) + '</span></div>'
  }

  // Paper cell width: letters fit four to a row, words take half a row, sentences a full row.
  function span(item) {
    const length = Array.from(item.text).length
    return item.kind === 'write' ? '' : length > 10 ? ' py-full' : length > 5 ? ' py-wide' : ''
  }

  function cell(item) {
    const write = item.kind === 'write'
    return '<li class="py-cell' + span(item) + (write ? ' py-write' : '') + '"><span class="py-no">' + escape(item.id) +
      '</span><span class="pinyin-text">' + escape(item.text) + '</span><span class="py-box" aria-hidden="true"></span>' +
      (write ? '<span class="py-break"></span><span class="py-lines" aria-hidden="true"><i></i><i></i><i></i></span>' : '') + '</li>'
  }

  function answers(groups) {
    return groups.flatMap(group => group.items).filter(item => item.answer)
      .map(item => escape(item.id) + '. ' + escape(item.answer)).join('　')
  }

  const when = { check: '卡住时才做', observe: '有余量再做' }

  function print(sheet) {
    const first = sheet.focus === 'letters'
    const instructions = sheet.mode === 'lesson'
      ? '照下面的教学卡示范并引导，然后盖住家长区，让孩子独立完成上面的题。'
      : first
        ? '先读字母，再拼音节。都顺利就接着做后面的组，有余量再做「试一试」。卡住时选下面对应的一条教学，讲完做「换题再试」，随后可以收工。'
        : '先做重点题。顺利再做复习，有余量再做「试一试」。卡住时用下面的教学卡，讲完做「换题再试」，随后可以收工。'
    const keys = answers(sheet.groups)
    const range = ids => ids.length > 2 ? ids[0] + '–' + ids.at(-1) : ids.join('、')
    return '<article class="sheet pinyin-print"><header class="sheet-head"><div class="sheet-title">拼音练习 · ' +
      latin(sheet.title) + '</div><div class="sheet-meta">' + escape(sheet.date) + '　卷号 ' + escape(sheet.id) +
      '</div></header>' +
      sheet.groups.map(group =>
        '<section class="py-group"><h3>' + (group.phase === 'check' ? '换题再试 · ' : '') + latin(group.label) +
        (when[group.phase] ? '<small>' + when[group.phase] + '</small>' : '') +
        '</h3><ol class="py-cells">' + group.items.map(cell).join('') + '</ol></section>'
      ).join('') + '<aside class="py-parent"><h3>给家长</h3><p>' + instructions + '</p>' +
      '<p>每题右边的小方框：顺的不用标，卡住的（要提示或读不出）画 ×。做完扫右上角二维码打分：全对选「全对」，有 × 的点出来再提交。</p>' +
      (keys ? '<p><b>答案</b>　' + keys + '</p>' : '') +
      sheet.cards.map(card => {
        const group = sheet.groups.find(entry => entry.id === card.group)
        return '<div class="py-card"><h4>' + latin(card.label) + (group ? ' · 讲完做第 ' +
          range(group.items.map(item => escape(item.id))) + ' 题' : '') + '</h4>' + teachingLines(card) + '</div>'
      }).join('') + '</aside><div class="py-sign">纸和笔 · zhihebi.com</div></article>'
  }

  root.SumSum.pinyinRender = { escape, latin, teaching, prompt, print, answers }
})(window)
