/**
 * 拼音板块：按全站骨架排（2026-11 改版）。
 *   中间 = 纸卷预览（pinyin-render.print，已定稿不改）；
 *   右边 = 今日 / 专题 / 课程 / 历史 四个页签。
 *     今日：为什么练这个 → 打分卡（全对或点卡住的题 → 提交，js/rate.js，与扫码打分页同一套）→
 *           家长教学卡、孩子视图 → 字号；
 *     专题 / 课程：目录，每项标状态（没练过 / 待复核 + 日期 / 已稳固），点一项中间出该项纸卷、右边转打分；
 *     历史：出过的卷，卷号醒目，点开补打分。
 * 网址决定看哪张卷（?sheet= / ?topic= / ?lesson=&focus= / ?view=），换卷就是换网址——刷新、收藏都还在原处。
 * 2026-11-27 打分改成一步：点了的记 miss，独立组没点的记 ok，选做组按 sheetsCore.pinyinResults 的规则
 * 记没做或 ok（不再分「提示了 / 读成了什么 / 声调错 / 停在哪题」）。pinyin:mark 存储格式不变，derive 照旧。
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
        catalogPage('出过的卷', '每打印一张都会记在这里，可以按卷号找回来补打分。',
          '<div class="empty">' + ICON.paper + '<b>还没有出过卷</b><p>到「今日」打印第一张。</p>' +
          '<a class="btn btn-sm btn-primary" href="pinyin.html">去今日</a></div>')
        return
      }
      const rows = data.sheets.slice().sort((a, b) => b.date.localeCompare(a.date)).map(entry => {
        const result = resultOf(entry)
        return '<tr data-id="' + esc(entry.id.toUpperCase()) + '"><td>' + esc(md(entry.date)) + '</td>' +
          '<td><span class="py-hist-no">' + esc(entry.id) + '</span></td>' +
          '<td><a href="' + href({ sheet: entry.id }) + '">' + esc(entry.title) + '</a></td>' +
          '<td>' + (entry.mode === 'topic' ? '专题' : entry.mode === 'lesson' ? '课程' : '每日') + '</td>' +
          '<td><span class="py-hist-prog' + (result ? ' is-done' : '') + '">' + (result || '没打分') + '</span></td>' +
          '<td class="py-td-act"><a class="btn btn-sm" href="' + href({ sheet: entry.id }) + '">打开</a></td></tr>'
      }).join('')
      catalogPage('出过的卷', '点开一张，中间显示那张卷的原样，可以重印，也可以补打分。',
        '<table class="py-table"><thead><tr><th>日期</th><th>卷号</th><th>内容</th><th>类型</th><th>打分</th><th></th></tr></thead>' +
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
    host.innerHTML = overview('专题进度', '发现孩子哪里容易错，就挑对应的一项。状态会随打分自动更新。', topicIds)
    catalogPage('按专题练', '十类常见难点，每一项一张卷：先独立做，卡住了按教学卡讲，再换题试。',
      '<div class="py-topic-grid">' + D.topics.map((topic, index) => {
        const list = Object.values(D.directions).filter(entry => entry.topic === index && !entry.id.startsWith('lesson-'))
        if (!list.length) return ''
        return '<section class="py-card"><h3>' + esc(topic) + '<small>' + list.length + ' 项</small></h3>' +
          '<ul class="py-items">' + list.map(entry => item(entry.label, href({ topic: entry.id }), entry.id)).join('') + '</ul></section>'
      }).join('') + '</div>')
  }

  /* ---------- 打分 ---------- */

  function marksOf(entry) {
    return data.marks[entry.id] ||= Object.create(null)
  }
  function savedMarks() {
    return marksOf(sheet)
  }

  /* ---------- 打分（rate.js）：这张卷换成打分卡要的样子 ---------- */

  const KIND = { check: '换题再试', observe: '试一试' }
  const WHEN = { check: '卡住时才做', observe: '有余量再做' }

  function groupName(entry, g) {
    const normalIdx = entry.groups.filter(x => x.phase !== 'check').indexOf(g)
    const label = g.label.replace(/^(复习|试一试) · /, '')
    return g.phase === 'check' || g.phase === 'observe' ? KIND[g.phase] + ' · ' + label : '第 ' + (normalIdx + 1) + ' 组 · ' + label
  }

  /* units / items 与印在纸上的一致；check 组记下它跟着哪一组（卡住才做） */
  function rateShape(entry) {
    return {
      units: entry.groups.map(g => {
        const card = entry.cards.find(c => c.group === g.id)
        return { key: g.id, label: groupName(entry, g), phase: g.phase || 'independent', parent: card?.startsAt || null, when: WHEN[g.phase] || '' }
      }),
      items: entry.groups.flatMap(g => g.items.map(it => ({ key: it.id, label: it.text, unit: g.id })))
    }
  }

  function rateRec(entry) {
    return { id: 'py-' + entry.id, draftId: 'py-' + entry.id, module: 'pinyin', ...rateShape(entry) }
  }

  /* 打过分没有：这张卷上有任何一题记过结果（提交会给每题都写上） */
  function rated(entry) {
    return Object.keys(marksOf(entry)).length > 0
  }
  function stuckKeys(entry) {
    const marks = marksOf(entry)
    return Object.keys(marks).filter(k => ['hint', 'miss'].includes(marks[k]?.result))
  }

  function submit(wrong) {
    const res = S.sheetsCore.pinyinResults(rateShape(sheet), wrong)
    for (const id of Object.keys(res)) savedMarks()[id] = DB.saveMark(sheet, id, { result: res[id] })
    /* 这张卷打印过的纸记录（可能不止一条：隔天重印纸号不同）都标成已打分，打分页的待办里就不再出现 */
    if (S.sheetsCore) {
      for (const rec of S.sheetsCore.records(S.store)) {
        if (rec.module !== 'pinyin' || rec.ref?.sheetId !== sheet.id) continue
        S.store.set(S.sheetsCore.keyOf(rec.id), { ...rec, done: true, doneAt: Date.now(), wrong: wrong.slice() })
      }
    }
  }

  /* 教学卡：每组一行（孩子视图 + 卡住时看的教学卡），这一组有卡住的题就默认展开 */
  function teachHTML() {
    const stuck = new Set(stuckKeys(sheet))
    const lessonCard = sheet.mode === 'lesson' ? sheet.cards[0] : null
    return sheet.groups.map(g => {
      const card = lessonCard && g === sheet.groups[0] ? lessonCard
        : !lessonCard ? sheet.cards.find(entry => entry.group === g.id || entry.startsAt === g.id) : null
      const open = Boolean(lessonCard && card) || g.items.some(it => stuck.has(it.id))
      return '<div class="py-teach-row"><div class="py-teach-head"><b>' + esc(groupName(sheet, g)) + '</b>' +
        '<button type="button" class="btn btn-sm" data-kid="' + esc(g.id) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="11.5" rx="2"/><path d="M9 20h6M12 16.5V20"/></svg>孩子视图</button></div>' +
        (card ? '<details class="py-teach"' + (open ? ' open' : '') + '><summary>家长教学卡 · ' + esc(card.label) +
          '<small>' + (open && !lessonCard ? '卡住了，先讲再换题' : '卡住时再看') + '</small></summary>' +
          '<div class="py-teach-body">' + R.teaching(card) + '</div></details>' : '') +
        '</div>'
    }).join('')
  }

  function sizeOf() {
    const setting = S.store.get(DB.SETTINGS)
    return [26, 32, 40].includes(setting?.size) ? setting.size : 32
  }

  function resultOf(entry) {
    if (!rated(entry)) return ''
    const n = stuckKeys(entry).length
    return n ? '卡住 ' + n + ' 题' : '全对'
  }

  function summary() {
    const normal = sheet.groups.filter(g => g.phase !== 'check')
    sumEl.textContent = [sheet.title, normal.length + ' 组', resultOf(sheet) || '没打分', '卷号 ' + sheet.id].join(' · ')
  }

  function render() {
    if (!sheet) return
    const size = sizeOf()
    summary()
    const keys = R.answers(sheet.groups)
    const back = tab !== 'today' && !query.has('sheet')
      ? '<a class="link-btn py-back" href="pinyin.html?view=' + tab + '">‹ 回' + (tab === 'topics' ? '专题' : '课程') + '目录</a>'
      : tab === 'history' ? '<a class="link-btn py-back" href="pinyin.html?view=history">‹ 回历史卷</a>' : ''
    const done = rated(sheet)
    const editing = S.rate.draft(rateRec(sheet)).editing
    let after = ''
    if (done && !editing) {
      const next = P.makeSheet(P.addDays(today, 1), P.derive(data.sheets, data.marks, P.addDays(today, 1)))
      after = '<div class="py-next"><span>下次建议</span><b>' + (next ? esc(next.title) : '休息一天') + '</b>' +
        '<p>' + (next ? esc(next.reason) : '明天没有到期要复核的内容。') + '</p></div>'
    }

    host.innerHTML =
      '<section class="group py-why">' + back +
        '<h2 class="py-title">' + esc(sheet.title) + '</h2>' +
        '<p class="py-reason"><span>为什么练这个</span>' + esc(sheet.reason) + '</p>' +
        '<p class="py-meta">' + esc(md(sheet.date)) + ' · 卷号 <b>' + esc(sheet.id) + '</b></p>' +
      '</section>' +
      '<section class="group py-rate" id="py-rate"><div class="group-title">打分</div>' +
        S.rate.body(rateRec(sheet), {
          kind: 'pinyin',
          done: done,
          result: resultOf(sheet),
          canEdit: true,
          effect: '卡住的内容会安排到后面的卷里再练。'
        }) +
        (keys ? '<details class="py-keys"><summary>答案</summary><p>' + keys + '</p></details>' : '') +
        after +
      '</section>' +
      '<section class="group" style="--pinyin-size:' + size + 'px"><div class="group-title">上课用<span class="sub">孩子视图、卡住时的教学卡</span></div>' +
        teachHTML() + '</section>' +
      '<section class="group"><div class="row-between"><span class="lbl">题目字号</span>' +
        '<div class="seg-ctl py-size" role="group" aria-label="题目字号">' + [26, 32, 40].map(v =>
          '<button type="button" data-size="' + v + '" class="' + (v === size ? 'on' : '') + '">' + v + '</button>').join('') +
        '</div></div></section>'
    printButton.disabled = false
  }

  function renderPaper() {
    paper.innerHTML = R.print(sheet)
    /* 扫码打分：纸记录带上分组和每题，手机打分页直接画同一张打分卡（rate.js） */
    if (S.sheets) {
      S.sheets.use({
        module: 'pinyin',
        title: '拼音练习 · ' + sheet.title,
        idParts: sheet.id,
        ...rateShape(sheet),
        ref: { sheetId: sheet.id, date: sheet.date }
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
      '<button type="button" class="btn" data-action="adult-view">返回</button></div>' +
      '<ol class="py-kid-items">' + group.items.map(it => '<li><span class="pinyin-text">' + esc(it.text) + '</span></li>').join('') + '</ol>'
    kid.hidden = false
    doc.body.style.overflow = 'hidden'
    kid.querySelector('button').focus()
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
      renderPaper()
      render()
      /* 从扫码打分页跳过来（#mark）：手机上纸在上、打分区在下，直接滚到打分区 */
      if (root.location.hash === '#mark') doc.getElementById('py-rate')?.scrollIntoView({ block: 'start' })
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
    if (button.dataset.kid) {
      group = sheet.groups.find(entry => entry.id === button.dataset.kid)
      if (group) showKid(true)
      return
    }
    S.rate.click(event, {
      load: () => rateRec(sheet),
      submit: (rec, wrong) => submit(wrong),
      startEdit: () => stuckKeys(sheet),
      render
    })
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
