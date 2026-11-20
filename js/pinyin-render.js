;(function (root) {
  'use strict'

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char])
  }

  function teaching(card) {
    return '<p>' + escape(card.probe) + '</p><p>' + escape(card.tip) + '</p><p>' +
      escape(card.demo) + '</p><ol>' + card.guide.map(text => '<li>' + escape(text) + '</li>').join('') + '</ol>'
  }

  function prompt(item, printing) {
    return '<div class="pinyin-prompt"><span>' + escape(item.id) + '.</span><span class="pinyin-text">' +
      escape(item.text) + '</span>' +
      (printing && item.kind === 'write' ? '<span class="pinyin-answer-line"></span>' : '') + '</div>'
  }

  function answers(groups) {
    return groups.flatMap(group => group.items).filter(item => item.answer)
      .map(item => escape(item.id) + '. ' + escape(item.answer)).join('　')
  }

  function print(sheet) {
    const first = sheet.focus === 'letters'
    const instructions = sheet.mode === 'lesson'
      ? '照教学卡示范并引导，盖住家长区，再让孩子独立完成上面的题。'
      : first
        ? '先读字母，再做音节应用。都顺利就继续复习，有余量再做观察题。卡住时选下面对应的一条教学和检验，随后可以收工。'
        : '先做重点题。顺利再做复习，有余量再做观察。卡住时用下面的教学卡，换题检验后即可收工。'
    const keys = answers(sheet.groups)
    return '<article class="sheet pinyin-print"><header class="sheet-head"><h2>拼音练习</h2><div>' +
      escape(sheet.date) + ' · 卷号 ' + escape(sheet.id) + '</div></header>' +
      sheet.groups.map(group =>
        '<section><h3>' + (group.phase === 'check' ? '换题再试 · ' : '') + escape(group.label) +
        '</h3><ol class="pinyin-items">' + group.items.map(item =>
          '<li class="pinyin-item">' + prompt(item, true) + '</li>').join('') + '</ol></section>'
      ).join('') + '<aside class="pinyin-parent"><h3>给家长</h3><p>' + instructions + '</p>' +
      '<p>顺的不用标，提示画 ∨，没读出画 ×。中途停止圈最后一题，跳题画横线。</p>' +
      (keys ? '<p>家长核对 · ' + keys + '</p>' : '') +
      sheet.cards.map(card => {
        const group = sheet.groups.find(entry => entry.id === card.group)
        return '<div><strong>' + escape(card.label) + (group ? ' · 检验第 ' +
          group.items.map(item => escape(item.id)).join('、') + ' 题' : '') + '</strong>' +
          (card.probe ? '<p>' + escape(card.probe) + '</p>' : '') +
          '<p>' + escape([card.tip, card.demo, ...card.guide].join(' ')) + '</p></div>'
      }).join('') + '</aside></article>'
  }

  root.SumSum.pinyinRender = { escape, teaching, prompt, print, answers }
})(window)
