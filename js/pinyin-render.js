;(function (root) {
  'use strict'

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char])
  }

  const circled = ['①', '②', '③', '④', '⑤', '⑥']

  function steps(list) {
    return list.map((text, index) => (circled[index] || (index + 1) + '.') + ' ' + escape(text)).join('　')
  }

  // Teaching card as labelled lines: what to watch, how to explain, a demo, then numbered guide steps.
  function teachingLines(card) {
    return (card.probe ? '<p><b>先观察</b>　' + escape(card.probe) + '</p>' : '') +
      '<p><b>怎么讲</b>　' + escape(card.tip) + '</p>' +
      '<p><b>示范</b>　' + escape(card.demo) + '</p>' +
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
      escape(sheet.title) + '</div><div class="sheet-meta">' + escape(sheet.date) + '　卷号 ' + escape(sheet.id) +
      '</div></header>' +
      sheet.groups.map(group =>
        '<section class="py-group"><h3>' + (group.phase === 'check' ? '换题再试 · ' : '') + escape(group.label) +
        (when[group.phase] ? '<small>' + when[group.phase] + '</small>' : '') +
        '</h3><ol class="py-cells">' + group.items.map(cell).join('') + '</ol></section>'
      ).join('') + '<aside class="py-parent"><h3>给家长</h3><p>' + instructions + '</p>' +
      '<p>每题右边的小方框：顺的不用标，提示过画 ∨，没读出画 ×。中途停止圈最后一题，跳过的题画横线。</p>' +
      (keys ? '<p><b>答案</b>　' + keys + '</p>' : '') +
      sheet.cards.map(card => {
        const group = sheet.groups.find(entry => entry.id === card.group)
        return '<div class="py-card"><h4>' + escape(card.label) + (group ? ' · 讲完做第 ' +
          range(group.items.map(item => escape(item.id))) + ' 题' : '') + '</h4>' + teachingLines(card) + '</div>'
      }).join('') + '</aside></article>'
  }

  root.SumSum.pinyinRender = { escape, teaching, prompt, print, answers }
})(window)
