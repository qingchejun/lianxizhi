/**
 * 拼音板块：按全站骨架排（2026-11 改版）。
 *   中间 = 纸卷预览（pinyin-render.print，已定稿不改）；
 *   右边 = 今日 / 专题 / 课程 / 历史 四个页签。
 *     今日：为什么练这个 → 打分状态（打分统一在顶栏「打分」抽屉里，js/rate-drawer.js，与扫码打分页同一个组件）→
 *           家长教学卡、孩子视图 → 字号；
 *     专题 / 课程：目录，每项标状态（没练过 / 今天该练、几号再练 / 已掌握），点一项中间出该项纸卷；
 *     历史：出过的卷，卷号醒目，点开可以重印、在抽屉里补打分。
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
    if (s.streak >= 2 && !s.due) return { cls: 'solid', text: '已掌握' }
    /* 2026-11-28 站长看不懂「待复核 · 11/28」：改成说该干什么。到日子的每日一张会自动先出它 */
    const when = !s.due || s.due <= today ? '该练了' : md(s.due) + ' 再练'
    return { cls: 'due', text: (s.streak === 1 ? '对了 1 次 · ' : '') + when }
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
      '<dl class="py-stats"><div><dt>已掌握</dt><dd>' + c.solid + '</dd></div><div><dt>还在练</dt><dd>' + c.due + '</dd></div>' +
      '<div><dt>没练过</dt><dd>' + c.fresh + '</dd></div></dl>' +
      '<p class="hint">一项要隔两天、换不同的题对两次才算掌握；错了第二天再练。到日子的项，每日一张会自动先出，不用自己挑。</p></section>' +
      (due.length ? '<section class="group"><div class="group-title">还在练的</div><ul class="py-items">' +
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
      catalogPage('出过的卷', '点开一张，中间显示那张卷的原样，可以重印，也可以点顶栏「打分」补打。',
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
      sumEl.textContent = '课程 · ' + D.lessons.length + ' 课'
      const ids = Array.from(new Set(D.lessons.flatMap(lesson => lesson.directions)))
      host.innerHTML = overview('课程进度', '照一年级课本顺序排，可以跳着学、回头看。每课先讲后练。', ids)
      catalogPage('拼音课程', '照 2024 年新版一年级上册课本，从 a o e 到 ang eng ing ong，一共 ' + D.lessons.length + ' 课。每课一张教学卡：怎么发音、口诀、易错、怎么写、例词。',
        '<ol class="py-lesson-grid">' + D.lessons.map((lesson, index) =>
          '<li class="py-card"><h3><span class="py-lesson-no">' + (index + 1) + '</span><span class="py-lesson-name">' + esc(lesson.label) + '</span></h3><ul class="py-items">' +
          lesson.directions.map((focus, i) => item(i === 0 ? '本课练习' : D.directions[focus].label,
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


  /* 打过分没有：这张卷上有任何一题记过结果（提交会给每题都写上） */
  function rated(entry) {
    return Object.keys(marksOf(entry)).length > 0
  }
  function stuckKeys(entry) {
    const marks = marksOf(entry)
    return Object.keys(marks).filter(k => ['hint', 'miss'].includes(marks[k]?.result))
  }


  /* 教学卡：每组一行（孩子视图 + 卡住时看的教学卡），这一组有卡住的题就默认展开 */
  function teachHTML() {
    const stuck = new Set(stuckKeys(sheet))
    const lessonCard = sheet.mode === 'lesson' ? sheet.cards[0] : null
    return sheet.groups.map(g => {
      const card = lessonCard && g === sheet.groups[0] ? lessonCard
        : !lessonCard ? sheet.cards.find(entry => entry.group === g.id || entry.startsAt === g.id) : null
      const open = Boolean(lessonCard && card) || g.items.some(it => stuck.has(it.id))
      return '<div class="py-teach-row"><div class="py-teach-head"><b>' + R.latin(groupName(sheet, g)) + '</b>' +
        '<button type="button" class="btn btn-sm" data-kid="' + esc(g.id) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="11.5" rx="2"/><path d="M9 20h6M12 16.5V20"/></svg>孩子视图</button></div>' +
        (card ? '<details class="py-teach"' + (open ? ' open' : '') + '><summary><span>家长教学卡 · ' + R.latin(card.label) + '</span>' +
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
    let after = ''
    if (done) {
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
      '<section class="group py-rate" id="py-rate"><div class="group-title">这张卷<span class="sub">' +
        (done ? '已打分：' + esc(resultOf(sheet)) : '还没打分') + '</span></div>' +
        (done ? '' : '<p class="hint">孩子做完，点顶栏「打分」：全对选「全对」，卡住的题点出来，再提交。手机扫纸角的二维码也行。</p>') +
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

  /* 免费版（2026-11-27）：今日卷和历史照常；专题、课程是完整版功能（7 天体验期里算完整版） */
  const FL = S.fullLock
  const pyLocked = FL && !FL.isFull() && (tab === 'topics' || tab === 'lessons')
  if (FL && !FL.isFull()) {
    doc.querySelectorAll('#py-tabs [data-tab="topics"], #py-tabs [data-tab="lessons"]').forEach(a => FL.markTab(a, true))
  }

  if (pyLocked) {
    const lessonsTab = tab === 'lessons'
    sumEl.textContent = (lessonsTab ? '课程' : '专题') + ' · 完整版'
    host.innerHTML = '<section class="group"><p class="hint">' + (lessonsTab
      ? '课程照课本顺序一课一课讲，每课有教学卡：怎么发音、口诀、容易错在哪。'
      : '专题按难点分类，孩子哪里老错就挑哪一项集中练。') +
      '</p><a class="btn btn-sm" href="pinyin.html">回今日卷</a></section>'
    paper.innerHTML = FL.html(lessonsTab ? '拼音课程是完整版功能' : '拼音专题是完整版功能',
      lessonsTab ? '跟着课本从 a o e 学到整体认读，每课先讲后练。' : '平舌翘舌、前后鼻音、形近字母这些难点，一项一张卷。')
    FL.bind(paper)
    paper.style.zoom = ''
    printButton.disabled = true
  } else if (query.has('sheet') && !sheet) {
    host.innerHTML = '<section class="group"><div class="empty">' + ICON.paper + '<b>这台设备上没有这张卷</b>' +
      '<p>卷可能出在另一台设备上。登录同一个账号等它同步过来，或者导入包含这张卷的备份。</p>' +
      '<a class="btn btn-sm" href="pinyin.html?view=history">回历史卷</a></div></section>'
    emptyPaper('找不到卷号 ' + esc(query.get('sheet')), '换一台设备出的卷，要先同步过来。')
  } else if (!sheet && ['history', 'topics', 'lessons'].includes(view)) {
    catalog()
  } else {
    if (!sheet) {
      /* 老课号（lesson-N，2026-11-27 前的 20 课）的收藏链接：按 focus 找到现在含它的课 */
      const lesson = !query.has('lesson') ? null : D.lessons.find(entry => entry.id === query.get('lesson')) ||
        D.lessons.find(entry => entry.directions.includes(query.get('focus')))
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
      /* 老链接带 #mark（原来从打分页跳过来打分）：直接打开打分抽屉 */
      if (root.location.hash === '#mark' && S.rateDrawer) root.setTimeout(() => S.rateDrawer.open(), 0)
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
  })

  /* 打分抽屉（js/rate-drawer.js）：拼音卷是固定的，没打印也能打分；老纸记录（11-27 前打印的，没记题目）
     按卷号从这台设备的卷里补上题目，照样能打 */
  if (S.rateDrawer) S.rateDrawer.allowUnprinted(() => true)
  if (S.markPanel) {
    S.markPanel.setEnrich(rec => {
      if (rec.module !== 'pinyin' || rec.items?.length || !rec.ref?.sheetId) return rec
      const entry = data.sheets.find(x => x.id === rec.ref.sheetId)
      return entry ? { ...rec, ...rateShape(entry), ref: { sheetId: entry.id, date: entry.date } } : rec
    })
  }
  /* 抽屉里提交了拼音的分：每题结果是抽屉写进存储的，这里重读一遍再画右栏和历史 */
  root.addEventListener('sumsum:rated', event => {
    if (event.detail?.module !== 'pinyin') return
    const fresh = DB.read(storage)
    for (const k of Object.keys(data.marks)) delete data.marks[k]
    Object.assign(data.marks, fresh.marks)
    if (sheet) render()
    else if (['history', 'topics', 'lessons'].includes(view)) catalog()
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
