;(async function (root) {
  'use strict'

  const S = root.SumSum
  const P = S.pinyin
  const D = S.pinyinData
  const DB = S.pinyinStorage
  const R = S.pinyinRender
  const doc = root.document
  const host = doc.getElementById('pinyin-view')
  const printButton = doc.getElementById('btn-print')
  const query = new URLSearchParams(root.location.search)
  const today = P.dateKey()
  const view = query.get('view')
  let storage
  try { storage = root.localStorage } catch (error) { /* Practice is still available. */ }

  // Give a signed-in browser a chance to load the original paper before generating a local one.
  let timeout
  await Promise.race([
    S.accountUI.initialSync,
    new Promise(resolve => { timeout = root.setTimeout(resolve, 1500) })
  ])
  root.clearTimeout(timeout)
  const data = DB.read(storage)
  let sheet = data.sheets.find(entry => entry.id === query.get('sheet'))
  let group
  let childView = false
  let lastStep = '可点击分组继续练习或修改登记。'
  let showPaper = root.location.hash === '#print'

  function link(label, params) {
    return '<a class="btn" href="pinyin.html?' + R.escape(new URLSearchParams(params).toString()) + '">' +
      R.escape(label) + '</a>'
  }

  function panel(content) {
    host.innerHTML = '<section class="pinyin-panel">' + content + '</section>'
  }

  function catalog() {
    if (view === 'history') {
      panel('<h2>历史卷与补登</h2><p>按纸上的日期和卷号找回原题。</p>' +
        (data.sheets.length ? data.sheets.map(entry =>
          '<article><h3>' + R.escape(entry.date + ' · ' + entry.title) + '</h3><p>卷号 ' + R.escape(entry.id) +
          '</p>' + link('打开与补登记', { sheet: entry.id }) + '</article>').join('') : '<p>这里还没有练习卷。</p>'))
      return
    }
    if (view === 'lessons') {
      panel('<h2>拼音课程</h2>' + D.lessons.map((lesson, index) =>
        '<article><h3>第 ' + (index + 1) + ' 课 · ' + R.escape(lesson.label) + '</h3><div class="pinyin-actions">' +
        lesson.directions.map(focus => link(D.directions[focus].label, { lesson: lesson.id, focus })).join('') + '</div></article>'
      ).join(''))
      return
    }
    panel('<h2>按专题练</h2>' + D.topics.map((topic, index) =>
      '<article><h3>' + R.escape(topic) + '</h3><div class="pinyin-actions">' +
      Object.values(D.directions).filter(entry => entry.topic === index && !entry.id.startsWith('lesson-'))
        .map(entry => link(entry.label, { topic: entry.id })).join('') + '</div></article>'
    ).join(''))
  }

  function savedMarks() {
    return data.marks[sheet.id] ||= Object.create(null)
  }

  function save(id, value) {
    const prior = savedMarks()[id]
    if (prior?.result === value.result && prior.heard === value.heard && prior.tone === value.tone && Boolean(prior.skipped) === Boolean(value.skipped) && prior.previousResult === value.previousResult) return
    savedMarks()[id] = DB.saveMark(sheet, id, value)
  }

  function statusOf(entry) {
    const played = entry.items.filter(item => {
      const record = savedMarks()[item.id]
      return record && record.result !== 'unpracticed'
    }).length
    return played ? played + ' / ' + entry.items.length + ' 题已记' : '未练'
  }

  const labels = { ok: '独立完成', hint: '提示了', miss: '没读出／没做对', unpracticed: '未练' }

  function itemForm(item) {
    const mark = savedMarks()[item.id]
    const additional = mark && ['hint', 'miss'].includes(mark.result)
    const controls = [
      ['hint', '提示了'], ['miss', item.kind === 'write' ? '没写对' : '没读出'], ['unpracticed', '跳过'], ['', '撤销标记']
    ]
    return '<li class="pinyin-item" data-item="' + R.escape(item.id) + '">' + R.prompt(item) +
      '<details class="pinyin-parent" ' + (additional ? 'open' : '') + '><summary>第 ' + R.escape(item.id) +
      ' 题登记 · ' + (labels[mark?.result] || '待确认') + '</summary><div class="pinyin-actions">' +
      controls.map(([value, label]) =>
        '<button type="button" class="btn" data-mark="' + value + '">' + label + '</button>').join('') + '</div>' +
      (additional ? '<label>读成什么或备注 <input type="text" maxlength="80" data-heard value="' + R.escape(mark.heard) + '"></label>' +
        (!['write', 'shape', 'letter'].includes(item.kind)
          ? '<label><input type="checkbox" data-tone ' + (mark.tone ? 'checked' : '') + '> 确认是声调错</label>' : '') : '') +
      '</details></li>'
  }

  function rangeForm(expanded) {
    const last = group.items.findLast(item => {
      const mark = savedMarks()[item.id]
      return mark && mark.result !== 'unpracticed'
    })
    return '<details class="pinyin-parent" id="pinyin-stop"' + (expanded ? ' open' : '') + '><summary>这组做到一半／修改进度</summary>' +
      '<label>最后做到哪题？ <select id="pinyin-last"><option value="">这组还没练</option>' +
      group.items.map(item => '<option value="' + R.escape(item.id) + '"' +
        (item.id === last?.id ? ' selected' : '') + '>第 ' + R.escape(item.id) + ' 题</option>').join('') +
      '</select></label><button type="button" class="btn" data-action="stop">保存并收工</button></details>'
  }

  function render() {
    if (!sheet) return
    const setting = S.store.get(DB.SETTINGS)
    const size = [26, 32, 40].includes(setting?.size) ? setting.size : 32
    if (childView && group) {
      host.innerHTML = '<section class="pinyin-panel" style="--pinyin-size:' + size + 'px"><ol class="pinyin-items">' +
        group.items.map(item => '<li class="pinyin-item">' + R.prompt(item) + '</li>').join('') +
        '</ol><button type="button" class="btn" data-action="adult-view">返回登记</button></section>' + R.print(sheet)
      return
    }
    const keys = group ? R.answers([group]) : ''
    const lessonCard = sheet.mode === 'lesson' ? sheet.cards[0] : null
    const card = group && sheet.cards.find(entry => entry.group === group.id)
    const failure = group && group.items.some(item => ['hint', 'miss'].includes(savedMarks()[item.id]?.result))
    const branch = group && sheet.cards.find(entry => entry.startsAt === group.id)
    const groups = sheet.groups.map(entry =>
      '<button type="button" class="btn" data-group="' + R.escape(entry.id) + '"' +
      (group?.id === entry.id ? ' aria-current="step"' : '') + '>' +
      (entry.phase === 'check' ? '换题再试 · ' : '') + R.escape(entry.label) + '（' + statusOf(entry) + '）</button>'
    ).join('')
    const actions = group ? '<div class="pinyin-actions"><button class="btn btn-primary" data-action="next">' +
      (group.phase === 'check' ? '本组做完，收工' : '本组做完') + '</button>' +
      (branch && failure ? '<button class="btn" data-action="teach" data-target="' + R.escape(branch.group) +
        '">转教学，换题再试</button>' : '') + '</div>' + rangeForm(Boolean(branch && failure)) : ''
    const result = !group && lastStep ? '<p role="status">' + R.escape(lastStep) + '</p>' : ''
    const reason = R.escape(sheet.reason)
    const state = P.derive(data.sheets, data.marks, P.addDays(today, 1))
    const tomorrow = !group ? P.makeSheet(P.addDays(today, 1), state) : null
    const recommendation = !group ? '<p>' + (tomorrow ? '下次建议 · ' + R.escape(tomorrow.reason) + ' · ' +
      R.escape(tomorrow.title) : '明天可以休息。') + '</p>' : ''

    host.innerHTML = '<section class="pinyin-panel" style="--pinyin-size:' + size + 'px"><h2>' +
      R.escape(sheet.title) + '</h2><p>' + reason + '</p><p>' + R.escape(sheet.date + ' · 卷号 ' + sheet.id) + '</p>' +
      '<div class="pinyin-actions"><button class="btn" data-action="preview">' + (showPaper ? '收起纸卷' : '查看纸卷') +
      '</button><label>题目字号 <select id="pinyin-size">' + [26, 32, 40].map(value =>
        '<option value="' + value + '"' + (size === value ? ' selected' : '') + '>' + value + '</option>').join('') +
      '</select></label></div><div class="pinyin-status pinyin-actions" aria-label="练习分组">' + groups + '</div>' +
      (lessonCard && group ? '<details class="pinyin-parent"><summary>给家长 · 课前讲解与引导</summary>' + R.teaching(lessonCard) +
        '</details>' : '') +
      (card ? '<details class="pinyin-parent"><summary>给家长 · 先讲，再合上独立检验</summary>' + R.teaching(card) + '</details>' : '') +
      (group ? '<h3>' + R.escape(group.label) + '</h3><div class="pinyin-actions"><button class="btn" data-action="child-view">孩子视图</button></div>' +
        (keys ? '<details class="pinyin-parent"><summary>家长核对</summary><p>' + keys + '</p></details>' : '') + '<ol class="pinyin-items">' + group.items.map(itemForm).join('') +
        '</ol><p class="pinyin-status">顺的题留空，做完后统一确认。</p>' + actions : result + recommendation) +
      '</section><div class="' + (showPaper ? 'pinyin-paper-visible' : '') + '">' + R.print(sheet) + '</div>'
    printButton.disabled = false
    host.closest('#preview-wrap').dataset.pinyinPrintable = 'true'
  }

  function confirm(last) {
    const skipped = group.items.filter(item => savedMarks()[item.id]?.skipped).map(item => item.id)
    const confirmed = P.confirmRange(group, savedMarks(), last, skipped)
    for (const item of group.items) {
      const value = confirmed[item.id]
      save(item.id, skipped.includes(item.id) ? { ...value, skipped: true } : value)
    }
  }

  function create(focus, mode) {
    const id = root.crypto?.randomUUID ? root.crypto.randomUUID().slice(0, 12) :
      Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
    return P.makeSheet(today, P.derive(data.sheets, data.marks, today), { focus, id, mode })
  }

  if (query.has('sheet') && !sheet) {
    panel('<h2>本机没有找到这份卷</h2><p>若卷在另一台设备上，请先登录同一账号同步，或导入包含原卷的备份。</p>')
  } else if (!sheet && ['history', 'topics', 'lessons'].includes(view)) {
    catalog()
  } else {
    if (!sheet) {
      const lesson = D.lessons.find(entry => entry.id === query.get('lesson'))
      const focus = lesson?.directions.includes(query.get('focus')) ? query.get('focus') : query.get('topic')
      if (D.directions[focus]) {
        const mode = lesson ? 'lesson' : 'topic'
        sheet = data.sheets.find(entry => entry.date === today && entry.mode === mode && entry.focus === focus) ||
          create(focus, mode)
      } else {
        sheet = DB.current(data, today) || create(undefined, 'daily')
      }
      if (sheet && !data.sheets.includes(sheet)) {
        DB.saveSheet(sheet)
        data.sheets.push(sheet)
      }
    }
    if (sheet) {
      group = Object.keys(savedMarks()).length ? undefined : sheet.groups[0]
      render()
    } else {
      panel('<h2>今天可以休息</h2><p>也可以到专题或课程挑一项练练。</p>')
    }
  }

  host.addEventListener('click', event => {
    const button = event.target.closest('button')
    if (!button || !sheet) return
    if (button.dataset.group) group = sheet.groups.find(entry => entry.id === button.dataset.group)
    if (button.dataset.mark !== undefined) {
      const id = button.closest('[data-item]').dataset.item
      const prior = savedMarks()[id]
      const result = button.dataset.mark
      save(id, result ? { result, skipped: result === 'unpracticed',
        previousResult: prior?.previousResult || (prior?.result === 'ok' ? 'ok' : 'unpracticed') } :
        { result: prior?.previousResult || 'unpracticed' })
    }

    const action = button.dataset.action
    if (action === 'child-view' || action === 'adult-view') childView = action === 'child-view'
    if (action === 'preview') showPaper = !showPaper
    if (action === 'stop' || action === 'teach' || action === 'next') {
      const current = group
      const last = action === 'next' ? current.items.at(-1).id : doc.getElementById('pinyin-last').value
      confirm(last)
      const failed = current.items.some(item => ['hint', 'miss'].includes(savedMarks()[item.id]?.result))
      const followUp = failed && sheet.cards.find(entry => entry.startsAt === current.id)
      const normal = sheet.groups.filter(entry => entry.phase !== 'check')
      group = action === 'teach' ? sheet.groups.find(entry => entry.id === button.dataset.target) :
        action === 'next' && followUp ? sheet.groups.find(entry => entry.id === followUp.group) :
        action === 'next' && current.phase !== 'check' ? normal[normal.indexOf(current) + 1] : undefined
      if (!group) lastStep = '已保存练习记录'
    }
    const marked = button.closest('[data-item]')?.dataset.item
    render()
    if (marked) host.querySelector('[data-item="' + marked + '"] summary')?.focus()
    if (action === 'preview' && showPaper) doc.querySelector('.pinyin-paper-visible').scrollIntoView()
  })

  host.addEventListener('change', event => {
    const field = event.target
    if (field.id === 'pinyin-size') {
      S.store.set(DB.SETTINGS, { size: Number(field.value) })
      render()
    }
    const item = field.closest('[data-item]')
    if (!item) return
    const id = item.dataset.item
    const current = savedMarks()[id]
    if (field.matches('[data-heard]')) save(id, { ...current, heard: field.value.trim() })
    if (field.matches('[data-tone]')) save(id, { ...current, tone: field.checked })
  })
  printButton.addEventListener('click', () => { if (sheet) root.print() })
})(window)
