/**
 * 拼音板块：按全站骨架排（2026-11 改版）。
 *   中间 = 纸卷预览（pinyin-render.print，已定稿不改）；
 *   右边 = 今日 / 专题 / 课程 / 历史 四个页签。
 *     今日：为什么练这个 → 分组进度 → 当前组逐题登记 → 组底部操作 → 家长教学卡 → 字号、孩子视图；
 *     专题 / 课程：目录，每项标状态（没练过 / 待复核 + 日期 / 已稳固），点一项中间出该项纸卷、右边转登记；
 *     历史：出过的卷，卷号醒目，点开补登记。
 * 网址决定看哪张卷（?sheet= / ?topic= / ?lesson=&focus= / ?view=），换卷就是换网址——刷新、收藏都还在原处。
 * 登记规则（顺的题不点、提示了 / 没读出 / 跳过、做到一半停在哪题）与改版前一致，存储格式不变。
 */
;(async function (root) {
  'use strict'

  const S = root.SumSum
  const P = S.pinyin
  const D = S.pinyinData
  const DB = S.pinyinStorage
  const R = S.pinyinRender
  const doc = root.document
  const esc = R.escape
  const host = doc.getElementById('pinyin-view')
  const paper = doc.getElementById('preview')
  const sumEl = doc.getElementById('work-sum')
  const printButton = doc.getElementById('btn-print')
  const kid = doc.getElementById('py-kid')
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
  let stopOpen = false
  let saved = ''

  /* ---------- 页签：哪一个亮 ---------- */

  const tab = view === 'topics' || query.has('topic') ? 'topics'
    : view === 'lessons' || query.has('lesson') ? 'lessons'
      : view === 'history' || query.has('sheet') ? 'history' : 'today'
  doc.querySelectorAll('#py-tabs [data-tab]').forEach(a => {
    const on = a.dataset.tab === tab
    a.classList.toggle('active', on)
    if (on) a.setAttribute('aria-current', 'page')
  })

  const ICON = {
    paper: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l4 4V20.5H7z"/><path d="M14 3.5V7.5h4M9.5 12h6M9.5 15.5h6"/></svg>',
    rest: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 13.5c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2M9 9.5h.01M15 9.5h.01"/></svg>'
  }

  function emptyPaper(title, text) {
    paper.innerHTML = '<div class="empty py-empty">' + ICON.paper + '<b>' + title + '</b><p>' + text + '</p></div>'
    paper.style.zoom = ''
    printButton.disabled = true
  }

  function href(params) {
    return 'pinyin.html?' + esc(new URLSearchParams(params).toString())
  }

  /* ---------- 状态：专题、课程每一项练到哪了 ---------- */

  const state = P.derive(data.sheets, data.marks, today)

  function md(date) {
    const [, m, d] = date.split('-')
    return Number(m) + '/' + Number(d)
  }

  function stateOf(id) {
    const s = state[id]
    if (!s || !s.observed) return { cls: 'new', text: '没练过' }
    if (s.streak >= 2 && !s.due) return { cls: 'solid', text: '已稳固' }
    return { cls: 'due', text: '待复核' + (s.due ? ' · ' + md(s.due) : '') }
  }

  function item(label, link, id) {
    const st = stateOf(id)
    return '<li><a class="py-item" href="' + link + '"><span class="py-item-name">' + esc(label) + '</span>' +
      '<span class="py-state is-' + st.cls + '">' + st.text + '</span></a></li>'
  }

  /* ---------- 目录：专题 / 课程 / 历史 ---------- */

  /* 2026-11 二次改版：目录放在中间的大区域（原来全挤在右侧窄栏、中间一片空白），
     右栏只留概况和怎么选。纸卷区没有纸时打印按钮不可用。 */
  function counts(ids) {
    const all = ids.map(stateOf)
    const n = cls => all.filter(entry => entry.cls === cls).length
    return { solid: n('solid'), due: n('due'), fresh: n('new'), total: all.length }
  }

  function overview(title, text, ids) {
    const c = counts(ids)
    const due = ids.filter(id => stateOf(id).cls === 'due')
    return '<section class="group"><div class="group-title">' + title + '</div><p class="hint">' + text + '</p>' +
      '<dl class="py-stats"><div><dt>已稳固</dt><dd>' + c.solid + '</dd></div><div><dt>待复核</dt><dd>' + c.due + '</dd></div>' +
      '<div><dt>没练过</dt><dd>' + c.fresh + '</dd></div></dl></section>' +
      (due.length ? '<section class="group"><div class="group-title">该复核了</div><ul class="py-items">' +
        due.map(id => item(D.directions[id].label, href({ topic: id }), id)).join('') + '</ul></section>' : '')
  }

  function catalogPage(title, lead, body) {
    printButton.disabled = true
    paper.innerHTML = '<div class="py-catalog"><header class="py-cat-head"><h2>' + title + '</h2><p>' + lead + '</p></header>' + body + '</div>'
    paper.style.zoom = ''
  }

  function catalog() {
    if (view === 'history') {
      sumEl.textContent = '历史卷 · 共 ' + data.sheets.length + ' 张'
      host.innerHTML = '<section class="group"><div class="group-title">按卷号找</div>' +
        '<p class="hint">输入纸上右上角印的卷号，比如 1121-K7QM。</p>' +
        '<input class="input" type="search" id="py-find" placeholder="卷号" autocomplete="off" spellcheck="false"></section>'
      if (!data.sheets.length) {
        catalogPage('出过的卷', '每打印一张都会记在这里，可以按卷号找回来补登记。',
          '<div class="empty">' + ICON.paper + '<b>还没有出过卷</b><p>到「今日」打印第一张。</p>' +
          '<a class="btn btn-sm btn-primary" href="pinyin.html">去今日</a></div>')
        return
      }
      const rows = data.sheets.slice().sort((a, b) => b.date.localeCompare(a.date)).map(entry => {
        const groups = entry.groups.filter(g => g.phase !== 'check')
        const done = groups.filter(g => groupState(entry, g).marked).length
        return '<tr data-id="' + esc(entry.id.toUpperCase()) + '"><td>' + esc(md(entry.date)) + '</td>' +
          '<td><span class="py-hist-no">' + esc(entry.id) + '</span></td>' +
          '<td><a href="' + href({ sheet: entry.id }) + '">' + esc(entry.title) + '</a></td>' +
          '<td>' + (entry.mode === 'topic' ? '专题' : entry.mode === 'lesson' ? '课程' : '每日') + '</td>' +
          '<td><span class="py-hist-prog' + (done === groups.length ? ' is-done' : '') + '">' +
            (done ? '已练 ' + done + ' / ' + groups.length + ' 组' : '未登记') + '</span></td>' +
          '<td class="py-td-act"><a class="btn btn-sm" href="' + href({ sheet: entry.id }) + '">打开</a></td></tr>'
      }).join('')
      catalogPage('出过的卷', '点开一张，中间显示那张卷的原样，可以重印，也可以补登记。',
        '<table class="py-table"><thead><tr><th>日期</th><th>卷号</th><th>内容</th><th>类型</th><th>进度</th><th></th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table><p class="py-none" hidden>没有找到这个卷号。</p>')
      const find = doc.getElementById('py-find')
      find.addEventListener('input', () => {
        const q = find.value.trim().toUpperCase().replace(/\s/g, '')
        let shown = 0
        paper.querySelectorAll('.py-table tbody tr').forEach(tr => {
          const on = !q || tr.dataset.id.includes(q)
          tr.hidden = !on
          if (on) shown++
        })
        paper.querySelector('.py-none').hidden = shown > 0
      })
      return
    }
    if (view === 'lessons') {
      sumEl.textContent = '课程 · 20 课'
      const ids = Array.from(new Set(D.lessons.flatMap(lesson => lesson.directions)))
      host.innerHTML = overview('课程进度', '照一年级课本顺序排，可以跳着学、回头看。每课先讲后练。', ids)
      catalogPage('拼音课程', '跟着课本，从 a o e 到词句应用，一共 20 课。',
        '<ol class="py-lesson-grid">' + D.lessons.map((lesson, index) =>
          '<li class="py-card"><h3><span class="py-lesson-no">' + (index + 1) + '</span><span class="py-lesson-name">' + esc(lesson.label) + '</span></h3><ul class="py-items">' +
          lesson.directions.map(focus => item(D.directions[focus].label === lesson.label ? '本课练习' : D.directions[focus].label,
            href({ lesson: lesson.id, focus }), focus)).join('') +
          '</ul></li>').join('') + '</ol>')
      return
    }
    sumEl.textContent = '专题 · ' + D.topics.length + ' 类'
    const topicIds = Object.values(D.directions).filter(entry => !entry.id.startsWith('lesson-')).map(entry => entry.id)
    host.innerHTML = overview('专题进度', '发现孩子哪里容易错，就挑对应的一项。状态会随登记自动更新。', topicIds)
    catalogPage('按专题练', '十类常见难点，每一项一张卷：先独立做，卡住了按教学卡讲，再换题试。',
      '<div class="py-topic-grid">' + D.topics.map((topic, index) => {
        const list = Object.values(D.directions).filter(entry => entry.topic === index && !entry.id.startsWith('lesson-'))
        if (!list.length) return ''
        return '<section class="py-card"><h3>' + esc(topic) + '<small>' + list.length + ' 项</small></h3>' +
          '<ul class="py-items">' + list.map(entry => item(entry.label, href({ topic: entry.id }), entry.id)).join('') + '</ul></section>'
      }).join('') + '</div>')
  }

  /* ---------- 登记 ---------- */

  function marksOf(entry) {
    return data.marks[entry.id] ||= Object.create(null)
  }
  function savedMarks() {
    return marksOf(sheet)
  }

  function save(id, value) {
    const prior = savedMarks()[id]
    if (prior?.result === value.result && prior.heard === value.heard && prior.tone === value.tone && Boolean(prior.skipped) === Boolean(value.skipped) && prior.previousResult === value.previousResult) return
    savedMarks()[id] = DB.saveMark(sheet, id, value)
    if (S.sheets) S.sheets.markDone() /* 登记过就不再出现在扫码登记页的待办里 */
  }

  /* 一组的状态：记了几题、是不是做完了（「本组做完」会给每题都写上结果） */
  function groupState(entry, g) {
    const marks = marksOf(entry)
    const counted = rec => rec && (rec.result !== 'unpracticed' || rec.skipped)
    const marked = g.items.filter(it => counted(marks[it.id])).length
    const done = marked === g.items.length && g.items.every(it => marks[it.id])
    const stuckN = g.items.filter(it => ['hint', 'miss'].includes(marks[it.id]?.result)).length
    /* 整组登记成「没做」（「这组没做」或「做到一半停了 → 这组还没练」）：算登记过了，不算对也不算错 */
    const skippedAll = !marked && g.items.every(it => marks[it.id]?.result === 'unpracticed')
    return { marked, done, stuck: stuckN > 0, stuckN, skippedAll }
  }

  function firstOpen() {
    return sheet.groups.find(g => g.phase !== 'check' && !groupState(sheet, g).done && !groupState(sheet, g).skippedAll)
  }

  /* 「登记好了」之后去哪一组：卡住了且有换题再试就去那组；选做的「换题再试」之后收工；否则下一组。没有下一组 = 收工 */
  function nextAfter(current) {
    const failed = groupState(sheet, current).stuck
    const followUp = failed && sheet.cards.find(entry => entry.startsAt === current.id)
    if (followUp) return sheet.groups.find(entry => entry.id === followUp.group)
    if (current.phase === 'check') return undefined
    const normal = sheet.groups.filter(entry => entry.phase !== 'check')
    return normal[normal.indexOf(current) + 1]
  }

  const KIND = { check: '换题再试', observe: '试一试' }
  const WHEN = { check: '卡住时才做', observe: '有余量再做' }

  function progress() {
    let n = 0
    return '<ol class="py-steps">' + sheet.groups.map(g => {
      const st = groupState(sheet, g)
      const normal = !g.phase || g.phase === 'independent'
      if (normal) n++
      const label = g.label.replace(/^(复习|试一试) · /, '')
      /* 状态直接说记成了什么：全对 / 几题卡住 / 没做，家长一眼看出登记得对不对 */
      const status = st.done ? (st.stuckN ? st.stuckN + ' 题卡住' : '全对') : st.skippedAll ? '没做'
        : st.marked ? '已记 ' + st.marked + '/' + g.items.length : '未练'
      return '<li><button type="button" class="py-step' + (group === g ? ' is-on' : '') + (st.done ? ' is-done' : '') +
        (normal ? '' : ' is-' + g.phase) + '" data-group="' + esc(g.id) + '"' + (group === g ? ' aria-current="step"' : '') + '>' +
        '<span class="py-dot">' + (st.done ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9"/></svg>' : normal ? n : '') + '</span>' +
        '<span class="py-step-main"><b>' + (normal ? '第 ' + n + ' 组 · ' : KIND[g.phase] + ' · ') + esc(label) + '</b>' +
        (normal ? '' : '<small>' + WHEN[g.phase] + '</small>') + '</span>' +
        '<span class="py-step-st' + (st.stuck ? ' is-stuck' : '') + '">' + status + '</span></button></li>'
    }).join('') + '</ol>'
  }

  function row(it) {
    const mark = savedMarks()[it.id]
    const r = mark?.result
    const open = r === 'hint' || r === 'miss'
    const reading = !['write', 'shape', 'letter'].includes(it.kind)
    const btn = (value, label) => '<button type="button" class="py-mark is-' + value + '" data-mark="' + value + '"' +
      ' aria-pressed="' + (r === value && (value !== 'unpracticed' || mark?.skipped) ? 'true' : 'false') + '">' + label + '</button>'
    return '<li class="py-row' + (open ? ' is-open' : '') + (mark?.skipped ? ' is-skip' : '') + '" data-item="' + esc(it.id) + '">' +
      '<span class="py-row-no">' + esc(it.id) + '</span>' +
      '<span class="pinyin-text py-row-text">' + esc(it.text) + '</span>' +
      '<span class="py-row-btns">' + btn('hint', '提示了') + btn('miss', it.kind === 'write' ? '没写对' : '没读出') + btn('unpracticed', '跳过') + '</span>' +
      (open ? '<span class="py-row-more"><label><span>读成什么</span><input class="input" type="text" maxlength="80" data-heard value="' + esc(mark.heard) + '" placeholder="比如 d"></label>' +
        (reading ? '<label class="py-tone"><input type="checkbox" data-tone' + (mark.tone ? ' checked' : '') + '><span>是声调错</span></label>' : '') + '</span>' : '') +
      '</li>'
  }

  function teachCard() {
    const lessonCard = sheet.mode === 'lesson' ? sheet.cards[0] : null
    const card = lessonCard || sheet.cards.find(entry => entry.group === group.id || entry.startsAt === group.id)
    if (!card) return ''
    const st = groupState(sheet, group)
    const open = st.stuck || group.phase === 'check' || Boolean(lessonCard)
    return '<details class="py-teach"' + (open ? ' open' : '') + '><summary>家长教学卡 · ' + esc(card.label) +
      (open && !lessonCard ? '<small>卡住了，先讲再换题</small>' : '<small>卡住时再看</small>') + '</summary>' +
      '<div class="py-teach-body">' + R.teaching(card) + '</div></details>'
  }

  function sizeOf() {
    const setting = S.store.get(DB.SETTINGS)
    return [26, 32, 40].includes(setting?.size) ? setting.size : 32
  }

  function summary() {
    const normal = sheet.groups.filter(g => g.phase !== 'check')
    const done = normal.filter(g => groupState(sheet, g).marked).length
    sumEl.textContent = [sheet.title, normal.length + ' 组', done ? '已练 ' + done + ' 组' : '未练', '卷号 ' + sheet.id].join(' · ')
  }

  function render() {
    if (!sheet) return
    const size = sizeOf()
    summary()
    const keys = group ? R.answers([group]) : ''
    const st = group ? groupState(sheet, group) : null
    const branch = group && sheet.cards.find(entry => entry.startsAt === group.id)
    const back = tab !== 'today' && !query.has('sheet')
      ? '<a class="link-btn py-back" href="pinyin.html?view=' + tab + '">‹ 回' + (tab === 'topics' ? '专题' : '课程') + '目录</a>'
      : tab === 'history' ? '<a class="link-btn py-back" href="pinyin.html?view=history">‹ 回历史卷</a>' : ''

    let body = ''
    if (group) {
      const normalIdx = sheet.groups.filter(g => g.phase !== 'check').indexOf(group)
      const optional = group.phase === 'check' || group.phase === 'observe'
      const doneLabel = nextAfter(group) ? '登记好了，下一组' : '登记好了，收工'
      const name = group.phase === 'check' ? '换题再试 · ' + group.label.replace(/^复习 · /, '')
        : group.phase === 'observe' ? group.label : '第 ' + (normalIdx + 1) + ' 组 · ' + group.label.replace(/^复习 · /, '')
      body = '<section class="group py-now" style="--pinyin-size:' + size + 'px">' +
        '<div class="py-now-head"><div class="group-title">' + esc(name) + '</div>' +
        '<button type="button" class="btn btn-sm" data-action="child-view"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="11.5" rx="2"/><path d="M9 20h6M12 16.5V20"/></svg>孩子视图</button></div>' +
        '<p class="hint">顺利的题什么都不点。孩子读不出来、要提示，才点对应的按钮。</p>' +
        '<ol class="py-rows">' + group.items.map(row).join('') + '</ol>' +
        (keys ? '<details class="py-keys"><summary>答案</summary><p>' + keys + '</p></details>' : '') +
        '<p class="hint py-foot-hint">没点按钮的题，都记为读对了。</p>' +
        '<div class="py-group-foot">' +
          (branch && st.stuck ? '<button type="button" class="btn btn-primary" data-action="teach" data-target="' + esc(branch.group) + '">转教学，换题再试</button>' +
            '<button type="button" class="btn" data-action="next">' + doneLabel + '</button>'
            : '<button type="button" class="btn btn-primary" data-action="next">' + doneLabel + '</button>') +
          /* 选做的两组（试一试 / 换题再试）：没做就一键记「没做」，别被当成全对 */
          (optional ? '<button type="button" class="btn" data-action="skip">这组没做</button>' : '') +
          '<button type="button" class="link-btn quiet" data-action="half">做到一半停了</button>' +
        '</div>' +
        (stopOpen ? '<div class="py-stop"><label class="field"><span>最后做到哪一题？</span><select class="input" id="pinyin-last">' +
          '<option value="">这组还没练</option>' + group.items.map(it => '<option value="' + esc(it.id) + '">第 ' + esc(it.id) + ' 题</option>').join('') +
          '</select></label><button type="button" class="btn btn-sm btn-primary" data-action="stop">保存并收工</button></div>' : '') +
        '</section>' + teachCard()
    } else {
      const next = P.makeSheet(P.addDays(today, 1), P.derive(data.sheets, data.marks, P.addDays(today, 1)))
      body = '<section class="group py-done"><p class="tip ok"><b>已保存</b>　' + esc(saved || '这张卷的登记都记下了。') + '</p>' +
        '<div class="py-next"><span>下次建议</span><b>' + (next ? esc(next.title) : '休息一天') + '</b>' +
        '<p>' + (next ? esc(next.reason) : '明天没有到期要复核的内容。') + '</p></div>' +
        '<p class="hint">想补登记或改结果，点上面任意一组。</p></section>'
    }

    host.innerHTML =
      '<section class="group py-why">' + back +
        '<h2 class="py-title">' + esc(sheet.title) + '</h2>' +
        '<p class="py-reason"><span>为什么练这个</span>' + esc(sheet.reason) + '</p>' +
        '<p class="py-meta">' + esc(md(sheet.date)) + ' · 卷号 <b>' + esc(sheet.id) + '</b></p>' +
      '</section>' +
      '<section class="group"><div class="group-title">分组<span class="sub">点一组登记</span></div>' + progress() + '</section>' +
      body +
      '<section class="group"><div class="row-between"><span class="lbl">题目字号</span>' +
        '<div class="seg-ctl py-size" role="group" aria-label="题目字号">' + [26, 32, 40].map(v =>
          '<button type="button" data-size="' + v + '" class="' + (v === size ? 'on' : '') + '">' + v + '</button>').join('') +
        '</div></div></section>'
    printButton.disabled = false
  }

  function renderPaper() {
    paper.innerHTML = R.print(sheet)
    /* 扫码登记：拼音的登记规则多（顺 / 提示了 / 没读出 / 停在哪题），手机扫码后跳回本页这张卷登记 */
    if (S.sheets) {
      S.sheets.use({
        module: 'pinyin',
        title: '拼音练习 · ' + sheet.title,
        idParts: sheet.id,
        units: [],
        items: [],
        ref: { sheetId: sheet.id }
      })
    }
    if (S.shell && S.shell.fit) S.shell.fit()
  }

  function showKid(on) {
    if (!on) {
      kid.hidden = true
      doc.body.style.overflow = ''
      return
    }
    kid.innerHTML = '<div class="py-kid-bar"><span>' + esc(group.label) + '</span>' +
      '<button type="button" class="btn" data-action="adult-view">返回登记</button></div>' +
      '<ol class="py-kid-items">' + group.items.map(it => '<li><span class="pinyin-text">' + esc(it.text) + '</span></li>').join('') + '</ol>'
    kid.hidden = false
    doc.body.style.overflow = 'hidden'
    kid.querySelector('button').focus()
  }

  function confirm(last) {
    const skipped = group.items.filter(it => savedMarks()[it.id]?.skipped).map(it => it.id)
    const confirmed = P.confirmRange(group, savedMarks(), last, skipped)
    for (const it of group.items) {
      const value = confirmed[it.id]
      save(it.id, skipped.includes(it.id) ? { ...value, skipped: true } : value)
    }
  }

  function create(focus, mode) {
    const id = P.makeId(today, new Set(data.sheets.map(entry => entry.id)))
    return P.makeSheet(today, P.derive(data.sheets, data.marks, today), { focus, id, mode })
  }

  /* ---------- 开场：按网址挑卷 ---------- */

  if (query.has('sheet') && !sheet) {
    host.innerHTML = '<section class="group"><div class="empty">' + ICON.paper + '<b>这台设备上没有这张卷</b>' +
      '<p>卷可能出在另一台设备上。登录同一个账号等它同步过来，或者导入包含这张卷的备份。</p>' +
      '<a class="btn btn-sm" href="pinyin.html?view=history">回历史卷</a></div></section>'
    emptyPaper('找不到卷号 ' + esc(query.get('sheet')), '换一台设备出的卷，要先同步过来。')
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
      group = firstOpen()
      renderPaper()
      render()
      /* 从扫码登记页跳过来（#mark）：手机上纸在上、登记区在下，直接滚到登记区 */
      if (root.location.hash === '#mark') host.scrollIntoView({ block: 'start' })
    } else {
      sumEl.textContent = '今天没有到期的内容'
      host.innerHTML = '<section class="group"><div class="empty">' + ICON.rest + '<b>今天可以休息</b>' +
        '<p>没有到期要复核的内容。想多练，到「专题」或「课程」挑一项。</p>' +
        '<a class="btn btn-sm btn-primary" href="pinyin.html?view=topics">去专题</a></div></section>'
      emptyPaper('今天没有新卷', '到专题或课程里挑一项，纸卷会出现在这里。')
    }
  }
  root.document.documentElement.setAttribute('data-sumsum-ready', '1')

  /* ---------- 交互 ---------- */

  host.addEventListener('click', event => {
    const button = event.target.closest('button')
    if (!button || !sheet) return
    if (button.dataset.size) {
      S.store.set(DB.SETTINGS, { size: Number(button.dataset.size) })
      render()
      return
    }
    if (button.dataset.group) {
      group = sheet.groups.find(entry => entry.id === button.dataset.group)
      stopOpen = false
    }
    let marked
    if (button.dataset.mark !== undefined) {
      marked = button.closest('[data-item]').dataset.item
      const prior = savedMarks()[marked]
      const result = button.dataset.mark
      /* 再点一次已按下的按钮 = 撤销 */
      if (button.getAttribute('aria-pressed') === 'true') save(marked, { result: prior?.previousResult || 'unpracticed' })
      else {
        save(marked, { result, skipped: result === 'unpracticed',
          previousResult: prior?.previousResult || (prior?.result === 'ok' ? 'ok' : 'unpracticed') })
      }
    }

    const action = button.dataset.action
    if (action === 'child-view') return showKid(true)
    if (action === 'half') stopOpen = !stopOpen
    if (action === 'stop' || action === 'teach' || action === 'next' || action === 'skip') {
      const current = group
      const last = action === 'stop' ? doc.getElementById('pinyin-last').value : action === 'skip' ? '' : current.items.at(-1).id
      confirm(last)
      const normal = sheet.groups.filter(entry => entry.phase !== 'check')
      group = action === 'teach' ? sheet.groups.find(entry => entry.id === button.dataset.target) :
        action === 'next' ? nextAfter(current) :
          action === 'skip' && current.phase !== 'check' ? normal[normal.indexOf(current) + 1] : undefined
      stopOpen = false
      if (!group) {
        saved = action === 'stop'
          ? (last ? '这组做到第 ' + last + ' 题，后面的记为没练。' : '这组记为没练。')
          : '这张卷的登记都记下了。'
      }
    }
    render()
    if (marked) host.querySelector('[data-item="' + marked + '"] .py-mark[aria-pressed="true"], [data-item="' + marked + '"] .py-mark')?.focus()
    if (action === 'teach' || action === 'next' || action === 'skip') host.querySelector('.py-now, .py-done')?.scrollIntoView({ block: 'nearest' })
  })

  host.addEventListener('change', event => {
    const field = event.target
    const itemEl = field.closest('[data-item]')
    if (!itemEl) return
    const id = itemEl.dataset.item
    const current = savedMarks()[id]
    if (field.matches('[data-heard]')) save(id, { ...current, heard: field.value.trim() })
    if (field.matches('[data-tone]')) save(id, { ...current, tone: field.checked })
  })

  kid.addEventListener('click', event => {
    if (event.target.closest('[data-action="adult-view"]')) showKid(false)
  })
  doc.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !kid.hidden) showKid(false)
  })

  // Wait for the pinyin font so the paper never prints in the fallback double-storey a/g.
  printButton.addEventListener('click', () => {
    if (!sheet) return
    const ready = doc.fonts?.load ? doc.fonts.load('30pt "Pinyin Kids"', 'ɑ') : Promise.resolve()
    ready.catch(() => {}).then(() => root.print())
  })
  root.addEventListener('resize', function () { if (S.shell && S.shell.fit) S.shell.fit() })
})(window)
