/**
 * 识字页交互：模式切换、表单 ↔ 设置对象双向同步、周次前进后退、打印。
 * 与其它三个板块一致 —— 任何参数变化都会自动重新渲染（所见即所得），没有「生成」按钮。
 * 这里连生成都算不上：字表是固定的，换一周只是换一段下标。
 *
 * 打分（2026-11-27 打分统一）：不在这页上点卷面、也没有「登记」区了，统一在顶栏「打分」抽屉里
 * （js/rate-drawer.js + js/mark-panel.js，和手机扫码打分页同一个组件）。提交后抽屉发 sumsum:rated，
 * 这里 refresh：每日一卷打了分才出下一张。不想做这张就点顶栏「换一张」（原「作废重来」）。
 */
(function (root) {
  'use strict'

  var doc = root.document
  var S = root.SumSum

  function $(id) {
    return doc.getElementById(id)
  }

  var els = {
    week: $('f-week'),
    perWeek: $('f-perweek'),
    perPage: $('f-perpage'),
    font: $('f-font'),
    copies: $('f-copies'),
    withWrong: $('f-withwrong'),
    title: $('f-title'),
    book: $('f-book'),
    lesson: $('f-lesson'),
    order: $('f-order'),
    xieBook: $('f-xiebook'),
    xieLesson: $('f-xielesson'),
    xieSize: $('f-xiesize'),
    xieTrace: $('f-xietrace')
  }

  var settings = S.shiziSettings.load()
  /* 孩子档案（js/profile.js，2026-11-28）：认字用课本字表时、写字一律，照档案的课本（统编哪一册）。
     认字选了某恩不动。档案里的册和本机不同（别的设备改了档案、同步过来）→ 换过来，课从头算（同手动换册） */
  var PF = S.profile
  var kid = PF && PF.get(S.store)
  var kidBook = kid && S.shizi.hasBook(PF.yuwenBook(kid)) ? PF.yuwenBook(kid) : ''
  /* 网址带着卷子参数（别人分享的链接）：照链接出，不套档案（同 js/shizi-settings.js load 的规矩） */
  var sharedLink = false
  new URLSearchParams(root.location.search).forEach(function (v, k) {
    if (['pane', 'mode', 'withWrong'].indexOf(k) < 0 && Object.prototype.hasOwnProperty.call(S.shiziSettings.DEFAULTS, k)) sharedLink = true
  })
  if (PF && !sharedLink) PF.watch(kid)
  if (kidBook && !sharedLink) {
    var fix = {}
    if (/^rj/.test(settings.book) && settings.book !== kidBook) {
      fix.book = kidBook
      fix.lesson = /b$/.test(kidBook) ? 1 : 0
    }
    if (settings.xieBook !== kidBook) {
      fix.xieBook = kidBook
      fix.xieLesson = 0
    }
    if (Object.keys(fix).length) settings = S.shiziSettings.sanitize(Object.assign({}, settings, fix))
    /* 字表下拉：课本只留档案那一册，写明来自档案；某恩照旧能选 */
    Array.prototype.forEach.call(els.book.options, function (o) {
      if (!/^rj/.test(o.value)) return
      o.hidden = o.value !== kidBook
      o.disabled = o.value !== kidBook
      if (o.value === kidBook) o.textContent = '课本：' + PF.yuwenName(kid) + ((o.textContent.match(/（\d+ 字）/) || [''])[0])
    })
    $('book-pf').hidden = false
    els.xieBook.closest('.field').hidden = true
    $('xie-book-line').hidden = false
    $('xie-book-name').textContent = PF.yuwenName(kid) + '写字表'
  }
  S.shizi.useBook(settings.book, settings.lesson, settings.order)

  function isRj(s) {
    return s.book !== S.shizi.HONGEN
  }

  /* 错字集只有一份；用人教版时只看课本里的字（某恩独有的错字不上人教版的卷，见 shizi-core 的 inScope） */
  function wrongAll() {
    return S.shiziMark.all().filter(S.shizi.inScope)
  }
  function wrongSize() {
    return isRj(settings) ? wrongAll().length : S.shiziMark.size()
  }
  function wrongOnce() {
    if (!isRj(settings)) return S.shiziMark.onceCount()
    return wrongAll().filter(function (ch) { return S.shiziMark.remainingOf(ch) === 1 }).length
  }
  /* 历史统计：人教版下也只算课本里的字 */
  function historyNow() {
    var h = S.shiziMark.history()
    if (!isRj(settings)) return h
    var m = {}
    Object.keys(h.marks || {}).forEach(function (ch) { if (S.shizi.inScope(ch)) m[ch] = h.marks[ch] })
    return { stats: S.shizi.historyStats(m), marks: m, log: h.log }
  }

  /* 错字集卷面渲染时用的那一份快照。渲染之后用户还会继续点，
     集合和卷面就会对不上 —— 用它判断要不要提示「重新排版」。 */
  var renderedWrong = []

  /* 本周卷后面那张错字附页最多印几个字。多了就不是「顺带复习」而是另一张卷子了，
     那种需求有专门的「错字集」模式。 */
  var APPEND_MAX = 20

  /*
   * 附页当前这一批字，以及它是给第几周挑的。
   *
   * 【必须缓存，不能每次渲染现抽】：refresh() 会被改字体、改份数、改每页字数
   * 这类跟错字毫无关系的动作触发，每次现抽的话，屏幕上看到的那 20 个字
   * 和按下打印时印出来的可能是两批 —— 这是最不该发生的事。
   * 所以只在三种情况下重抽：第一次勾上、换了周次、手动点「换一批」。
   */
  var appendPick = []
  var pickedForWeek = null

  /* 重抽一批。exclude 本周卷上已经有的字：同一沓纸里同一个字不印两遍。
     按权重抽：错得越多越容易抽到（见 shizi-core 的 reviewWeight） */
  function repick() {
    appendPick = S.shizi.sampleWrong(
      wrongAll(),
      S.shizi.slice(settings).chars,
      APPEND_MAX,
      null,
      S.shiziMark.weightOf
    )
    pickedForWeek = sliceKey(settings)
  }

  /* 附页缓存认的是「哪一段」：某恩看周次，人教版看单元 */
  function sliceKey(s) {
    return s.book + ':' + (isRj(s) ? s.unit : s.week)
  }

  /*
   * 这次渲染该附哪些字。
   * 缓存里的字可能已经被移出错字集（在附页上点掉的），先滤掉；
   * 但【不补新的】—— 错字集里加了字也不动这一批，理由同「重新排版」按钮：
   * 卷面不该在手指底下变。想换就自己点「换一批」。
   */
  function appendChars() {
    if (settings.mode !== 'week' || !settings.withWrong) return []
    appendPick = appendPick.filter(function (ch) {
      return S.shiziMark.has(ch)
    })
    if (!appendPick.length || pickedForWeek !== sliceKey(settings)) repick()
    return appendPick
  }

  /* 当前卷面是不是已经和错字集对不上了（只在错字集模式下有意义） */
  function isStale() {
    if (settings.mode !== 'wrong') return false
    if (wrongSize() !== renderedWrong.length) return true
    return renderedWrong.some(function (ch) {
      return !S.shiziMark.has(ch)
    })
  }

  /* ---------- 每日一卷 ---------- */

  /* 每日一卷：屏幕上永远是最新一张（往期卷在顶栏「打分」抽屉的历史里看）。
     打分在抽屉里（js/rate-drawer.js），打了分页面收到 sumsum:rated 再 refresh，出下一张 */
  function dailyPaper() {
    return S.shiziMark.ensurePaper()
  }

  function renderDaily() {
    var p = dailyPaper()
    var todayStr = S.shiziMark.today()
    var active = !p.settled
    $('preview').dataset.locked = '1' // 卷面不再点字打分，统一在打分卡上点
    $('preview').innerHTML = S.shiziRender.renderWrong(settings, Array.from(p.chars), {
      title: '识字 · 每日一卷',
      foot: '每日一卷 · ' + p.chars.length + ' 字'
    }).join('')
    root.document.body.classList.remove('landscape')
    S.shiziMark.paint()
    registerSheet('daily', '识字 · 每日一卷', Array.from(p.chars), { kind: 'daily', d: p.d })
    var status = $('daily-status')
    var ratedToday = S.shiziMark.canUndo('daily')
    if (!active) {
      status.innerHTML = (p.d === todayStr ? '今天' : md(p.d)) + '的卷子已打分，下一张会自动出好。'
    } else if (p.d > todayStr) {
      status.innerHTML = (ratedToday ? '今天的卷子已打分。' : '') + '明天的 ' + p.chars.length + ' 个字已经出好，含今晚没认出的字，可以先打印。'
    } else if (p.d === todayStr) {
      status.innerHTML = '今天 ' + p.chars.length + ' 个字，含最多 10 个错字。打印考完，点顶栏「打分」：全认识选「全对」，有<b>没认出</b>的字就点出来，再提交。打了分才出下一张。'
    } else {
      status.innerHTML = md(p.d) + ' 的卷子还没打分。点顶栏「打分」给它打分；不想做了就点「换一张」。'
    }
    /* 换一张：只在这张还没打分时能用（原来的「作废重来」）。统编版按课本顺序出的卷，重出还是同样的字，不给这个按钮 */
    $('btn-swap').hidden = !active || (isRj(settings) && settings.order === 'seq')
  }

  function fillTabs(s) {
    var tabs = $('mode-tabs').querySelectorAll('.stage-tab')
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].dataset.mode === s.mode)
    }
    /* 页签上直接带字数，不用切进去才知道攒了多少（每日一卷不带：到期数跟
       错字集总数常年一样大，摆出来只让人多问一句是什么） */
    var n = wrongSize()
    $('wrong-n').textContent = n ? ' · ' + n : ''
    $('wrong-title-n').textContent = n ? n + ' 个' : ''
  }

  function fillForm(s) {
    fillPane(s)
    $('sec-daily').hidden = s.mode !== 'daily'
    /* 非「本周复习」模式下，周次与每周字数这两块控件不起作用，直接收起来。
       留着变灰只是噪音 —— 上面的页签已经说清楚现在在看哪张卷子。 */
    $('sec-progress').hidden = s.mode !== 'week'
    $('sec-range').hidden = s.mode !== 'week' || isRj(s)
    fillBook(s)
    $('hist-append-hint').hidden = isRj(s)
    /* 「历史」是屏幕上的统计页，不印，排版、标题、错字集这几块都用不上 */
    var hist = s.mode === 'history'
    $('sec-history').hidden = !hist
    $('sec-layout').hidden = hist
    $('sec-wrong').hidden = hist
    $('sec-title').hidden = hist
    $('mark-legend').hidden = hist
    $('btn-print').hidden = hist
    /* 每周字数一改，总周数就变了，输入框的上限要跟着走，
       否则浏览器自带的上下箭头能点到一个会被钳掉的数，看着像没生效。 */
    els.week.max = String(S.shizi.totalWeeks(s.perWeek))
    els.week.value = String(s.week)
    els.perWeek.value = String(s.perWeek)
    els.perPage.value = String(s.perPage)
    els.font.value = s.font
    els.copies.value = String(s.copies)
    els.withWrong.checked = s.withWrong
    els.title.value = s.title
  }

  function readForm() {
    return S.shiziSettings.sanitize({
      week: els.week.value,
      perWeek: els.perWeek.value,
      perPage: els.perPage.value,
      font: els.font.value,
      copies: els.copies.value,
      withWrong: els.withWrong.checked,
      book: els.book.value,
      /* 「学到第几课」只在人教版下从下拉框读；某恩下下拉框是空的，沿用记着的值，
         切回人教版时进度还在（sanitize 会按所选那一册钳位） */
      lesson: els.book.value === settings.book && isRj(settings) ? els.lesson.value
        /* 统编版换了一册（一上 ↔ 一下）：课号不通用。换到下册从第 1 课算起，换回上册算整册学过 */
        : isRj(settings) && els.book.value !== S.shizi.HONGEN ? (rjPrev(els.book.value) ? 1 : 0) : settings.lesson,
      unit: settings.unit,
      order: isRj(settings) && els.order.value ? els.order.value : settings.order,
      pane: settings.pane, // 认字/写字 由页面决定（shizi.html / xiezi.html 的 <html data-pane>）
      /* 写字的三项只在写字面板开着时从表单读（认字时那几个框没填过，读出来是第一个选项） */
      xieBook: settings.pane === 'xie' ? els.xieBook.value || settings.xieBook : settings.xieBook,
      /* 换了写字那册：课号不通用，回到自动 */
      xieLesson: settings.pane !== 'xie' ? settings.xieLesson
        : els.xieBook.value !== settings.xieBook ? 0 : els.xieLesson.value !== '' ? els.xieLesson.value : settings.xieLesson,
      xieSize: settings.pane === 'xie' ? els.xieSize.value || settings.xieSize : settings.xieSize,
      xieTrace: settings.pane === 'xie' ? els.xieTrace.value || settings.xieTrace : settings.xieTrace,
      mode: settings.mode, // 模式不是表单项，由页签管
      title: els.title.value.trim()
    })
  }

  /* 面板顶部那块进度：大号周次 + 字序区间 + 进度条 + 前后按钮的可用状态 */
  function fillProgress(s) {
    var sl = S.shizi.slice(s)
    $('week-fill').style.width = (sl.week / sl.weeks) * 100 + '%'
    $('btn-prev').disabled = sl.week <= 1
    $('btn-next').disabled = sl.week >= sl.weeks
    $('btn-prev').textContent = '◀ 上一' + sl.unitWord
    $('btn-next').textContent = '下一' + sl.unitWord + ' ▶'
    if (isRj(s)) {
      $('week-now').textContent = sl.unitName + ' · ' + sl.kind
      $('week-sub').textContent = sl.range + '　·　' + sl.chars.length + ' 字　·　共 ' + sl.weeks + ' 个单元'
      $('week-hint').textContent = '学完一个单元考一次：整个单元的字印一张，考完点顶栏「打分」把没认出的字点出来，错字会进每日一卷。'
      return
    }
    $('week-now').textContent = '第 ' + sl.week + ' 周'
    $('week-sub').textContent =
      '第 ' + sl.from + '–' + sl.to + ' 字　·　共 ' + sl.weeks + ' 周　·　字表 ' +
      S.shizi.poolSize() + ' 字'

    $('week-hint').textContent =
      sl.week >= sl.weeks
        ? '这是最后一周。想再来一轮，把「第几周」改回 1。'
        : '印完这一张，点「下一周」继续。'
  }

  /*
   * 提前把「会印几张纸、字有多大」告诉用户。
   * 字的毫米数是这个板块最该说清楚的一件事 —— 一年级课本的生字大约 10mm，
   * 家长有这个参照才知道 7.8mm 是「有点小但能认」还是「太小了」。
   */
  function pagesHint(s, count, append) {
    if (!count) return ''
    var per = S.shiziRender.perPageOf(s, count)
    var lay = S.shiziRender.layout(per)
    if (!lay) return '' // 与 shizi-render 同一条兜底：目前不可达，但别让面板先炸
    var sheets = Math.ceil(count / per)
    /* 附页跟着同一套排版参数走，所以张数得照 perPageOf 再算一遍（20 个字通常就一页） */
    var addSheets = append && append.length
      ? Math.ceil(append.length / S.shiziRender.perPageOf(s, append.length))
      : 0
    var parts = ['共 ' + (sheets + addSheets) * s.copies + ' 张纸', count + ' 个字']
    if (addSheets) parts.push('含错字附页')
    if (s.copies > 1) parts.push('印 ' + s.copies + ' 份')
    parts.push(lay.cols + ' 列 × ' + lay.rows + ' 行，字约 ' + (Math.round(lay.glyph) / 10) + ' 厘米见方')
    return parts.join(' · ')
  }

  /*
   * 错字集那一块的说明。全站统一的标记规则（点 = 没认出，见 shizi-mark 的文件头）。
   * 返回的是 HTML，里面全是写死的文案，没有任何用户输入，可以直接进 innerHTML。
   */
  function markHint(s) {
    var n = wrongSize()
    if (!n) {
      /* 一个字都没有时，讲「怎么毕业」是没意义的 —— 不管在哪个模式，
         此刻唯一有用的信息都是「去哪儿、怎么把第一个字收进来」。 */
      return '错字集是空的。' +
        (s.mode === 'wrong' ? '在「每日一卷」或「本周复习」里，' : '') +
        '考完点顶栏「打分」，把孩子念不出的字点出来，再点「提交」。'
    }
    var once = wrongOnce()
    var head = '错字集 <b>' + n + '</b> 个字' + (once ? '，其中 ' + once + ' 个再认出一次就毕业' : '') + '。' +
      '没认出的字第二天接着考，认出后隔 3 天复核，复核认出才毕业。'
    if (s.mode === 'wrong') {
      return head + '<br>考完点顶栏「打分」，点出<b>没认出</b>的字再提交，没点的算认出。'
    }
    var tail = head + '考完点顶栏「打分」，孩子念不出的字点出来再提交。'
    if (s.withWrong && appendPick.length) {
      tail += '<br>附页的 ' + appendPick.length + ' 个旧错字也在打分卡上，没认出的一并点出来。'
    }
    return tail
  }

  /* 按钮文案随模式走：印的是哪张卷子，按钮上就写哪张 */
  var PRINT_LABEL = { daily: '打印今日卷', week: '打印复习卷', wrong: '打印错字卷', history: '打印' }

  /* 主流程：保存设置 → 同步表单 → 渲染 → 把错字标记投影回新 DOM */
  /* 免费版（2026-11-27）：每日一卷和历史照常；写字、单元检查 / 本周复习、错字集整页打印是会员功能，
     纸张区换成说明（js/full-lock.js）。7 天体验期里算会员 */
  var LOCKS = {
    xie: ['写字是会员功能', '按课本写字表一课出一张田字格练字纸，范字带笔顺，屏幕上还能看笔顺动画。'],
    week: ['单元检查是会员功能', '学完一个单元，把整个单元的字印一张考一次，没认出的字自动进每日一卷。'],
    wrong: ['错字集整页打印是会员功能', '把还没过关的错字印成一整张专门复习。错字每天照样会进每日一卷，不开通也不耽误。']
  }
  function lockedWhat() {
    var FL = S.fullLock
    if (!FL || FL.isFull()) return null
    return settings.pane === 'xie' ? LOCKS.xie : settings.mode === 'week' ? LOCKS.week : settings.mode === 'wrong' ? LOCKS.wrong : null
  }
  function markLocks() {
    var FL = S.fullLock
    if (!FL) return
    var free = !FL.isFull()
    FL.markTab($('mode-tabs').querySelector('[data-mode="week"]'), free)
    FL.markTab($('mode-tabs').querySelector('[data-mode="wrong"]'), free)
  }
  function renderLocked(what) {
    var box = $('preview')
    delete box.dataset.locked
    $('notice').hidden = true
    box.innerHTML = S.fullLock.html(what[0], what[1])
    S.fullLock.bind(box)
    $('btn-print').disabled = true
    $('btn-print').hidden = false
    $('btn-print').querySelector('.txt').textContent = '打印'
    $('sec-progress').hidden = true /* 单元 / 周次的翻页用不上，别露出个「第 1 周」 */
    $('pages-hint').textContent = ''
    S.shell.summary([what[0].replace('是会员功能', '')])
    fitPreview()
  }

  function refresh() {
    S.shizi.useBook(settings.book, settings.lesson, settings.order)
    S.shiziSettings.save(settings)
    fillTabs(settings)
    fillForm(settings)
    markLocks()
    $('btn-swap').hidden = true // 只有每日一卷有「换一张」，renderDaily 里再打开
    var locked = lockedWhat()
    if (locked) {
      renderLocked(locked)
      return
    }
    if (settings.pane === 'xie') {
      renderXie()
      return
    }
    if (settings.mode === 'week') fillProgress(settings)

    /* 错字集模式下，渲染用的是【进入时的快照】；之后用户再点就只改 class，
       不动卷面结构，直到他自己点「重新排版」或切走再切回来。 */
    renderedWrong = settings.mode === 'wrong' ? wrongAll() : []
    if (settings.mode === 'daily') {
      renderDaily()
      fillBook(settings) /* 卷子刚生成（可能刚往下走了一段），顺序进度的提示要按新卷重算 */
      fitPreview()
      var dp = dailyPaper()
      $('pages-hint').textContent = pagesHint(settings, dp ? dp.chars.length : 0, null)
      $('btn-print').querySelector('.txt').textContent = PRINT_LABEL.daily
      refreshMarkPanel()
      S.shell.summary([
        '每日一卷',
        dp && dp.wrong.length ? '错字 ' + dp.wrong.length + ' + 认识 ' + (dp.chars.length - dp.wrong.length) : dp ? '认识 ' + dp.chars.length : '',
        dp ? md(dp.d) : ''
      ])
      $('notice').hidden = true
      return
    }
    /* 每日一卷给 #preview 上过的只读锁，别的模式一律解掉 */
    delete $('preview').dataset.locked
    if (settings.mode === 'history') {
      renderHistory()
      fitPreview()
      $('pages-hint').textContent = ''
      $('notice').hidden = true
      refreshMarkPanel()
      var st = historyNow().stats
      S.shell.summary(['历史错字', st.total + ' 个字', '累计错 ' + st.times + ' 次'])
      return
    }
    var append = appendChars()
    S.shiziRender.render($('preview'), settings, renderedWrong, append)
    /* 渲染之后立刻把集合投影到新 DOM 上 —— 位置对应数独 render() 紧跟 attach() 的那两行 */
    S.shiziMark.paint()
    if (settings.mode === 'week' || settings.mode === 'wrong') {
      var label = settings.mode === 'week' ? (isRj(settings) ? '检查卷' : '本周卷') : '错字卷'
      registerSheet(settings.mode, '识字 · ' + label, sheetChars(), { kind: settings.mode })
    }
    fitPreview()

    var count = settings.mode === 'wrong'
      ? renderedWrong.length
      : S.shizi.slice(settings).chars.length
    $('pages-hint').textContent = pagesHint(settings, count, append)
    $('btn-print').querySelector('.txt').textContent =
      settings.mode === 'week' && isRj(settings) ? '打印检查卷' : PRINT_LABEL[settings.mode]
    $('btn-print').disabled = settings.mode === 'wrong' && !renderedWrong.length
    refreshMarkPanel()
    paintSummary(settings, count)

    var notice = $('notice')
    if (settings.mode === 'wrong' && !renderedWrong.length) {
      notice.textContent =
        '错字集还是空的。切到「本周复习」，孩子念不出来的字在卷面上点一下，就会收到这里。'
      notice.hidden = false
    } else {
      notice.hidden = true
    }
  }

  /*
   * 错字集那一栏底下的一行历史摘要，点按钮去「历史」页签看全部。
   * 以前这里直接列「反复错的字」，有了历史页之后挪过去了，面板上只留个入口。
   */
  function repeatsHtml() {
    var st = historyNow().stats
    if (!st.total) return ''
    var rep = S.shiziMark.repeats().length
    return '<p class="hint">历史上错过 <b>' + st.total + '</b> 个字' +
      (rep ? '，其中 <b>' + rep + '</b> 个错过 2 次以上' : '') + '，已学会移出 ' + st.out + ' 个。</p>' +
      '<button type="button" class="btn btn-sm" data-goto="history">看历史统计 →</button>'
  }

  /* ---------- 复习结算 ---------- */

  /* 卷面上现在有哪些字（去重）。份数 = 2 时同一个字有两格 */
  /* 扫码打分：纸角二维码 + 打印时记下这张。手机打分页和顶栏「打分」抽屉是同一个组件，结算都走 shiziMark.settle */
  function registerSheet(kind, title, chars, ref) {
    if (!S.sheets || !chars.length) return
    S.sheets.use({
      module: 'shizi',
      title: title,
      idParts: kind + '|' + chars.join(''),
      units: [],
      items: chars.map(function (ch) { return { key: ch, label: ch } }),
      ref: ref
    })
  }

  function sheetChars() {
    var seen = {}
    var out = []
    var cells = doc.querySelectorAll('#preview .shizi-cell')
    for (var i = 0; i < cells.length; i++) {
      var ch = cells[i].dataset.ch
      if (ch && !seen[ch]) {
        seen[ch] = true
        out.push(ch)
      }
    }
    return out
  }

  /* 换一张（2026-11-27，原「作废重来」）：这张卷不算分，按现在的错字重新出一张。
     已经打印过的那张纸标成「不用打了」，免得打分抽屉里一直挂着 */
  $('btn-swap').addEventListener('click', function () {
    var cur = S.sheets && S.sheets.current ? S.sheets.current() : null
    var rec = cur ? S.sheetsCore.parse(S.store.getString(S.sheetsCore.keyOf(cur.id))) : null
    var msg = rec ? '换一张？已经打印的这张就不用做了，字的记录不动。' : '换一张？字的记录不动，按现在的错字重新出一张。'
    if (!root.confirm(msg)) return
    var last = S.shiziMark.paperAt(S.shiziMark.paperCount() - 1)
    if (!S.shiziMark.discardPaper()) return
    skipPaperRecords(last)
    refresh()
  })

  /* 卷子换掉了（换一张、换册重出）：打印过的那张纸标成「不用打了」，打分抽屉里不再挂着 */
  function skipPaperRecords(paper) {
    if (!paper || !S.sheetsCore) return
    var chars = Array.from(paper.chars).join('')
    S.sheetsCore.records(S.store).forEach(function (r) {
      if (r.module !== 'shizi' || !r.ref || r.ref.kind !== 'daily' || r.ref.d !== paper.d || r.done || r.skipped) return
      if ((r.items || []).map(function (it) { return it.key }).join('') !== chars) return
      S.store.set(S.sheetsCore.keyOf(r.id), Object.assign({}, r, { skipped: true }))
    })
  }

  /* 打分抽屉里提交了识字的分：出下一张（每日一卷）、刷新错字集面板 */
  root.addEventListener('sumsum:rated', function (e) {
    if (e.detail && e.detail.module === 'shizi') refresh()
  })
  /* 屏幕上这张没打印也能打分：每日一卷只限今天和以前的卷（明天的预出卷还没到考的时候），本周卷、错字卷随时 */
  if (S.rateDrawer) {
    S.rateDrawer.allowUnprinted(function (cur) {
      var ref = cur.info.ref || {}
      return ref.kind === 'daily' ? ref.d <= S.shiziMark.today() : true
    })
  }

  /* ---------- 历史页（只在屏幕上，不印） ---------- */

  function md(d) {
    var p = String(d || '').split('-')
    return p.length === 3 ? Number(p[1]) + '/' + Number(p[2]) : ''
  }

  var ST_LABEL = { wrong: '在错字集里', once: '认出过一次，复核认出就毕业', out: '已毕业，移出了' }

  /*
   * 上半：四个数；中间：按错的次数分组，一字一块，颜色和卷面一致（红底 / 半红 / 白底 = 已移出）；
   * 下半：最近的复习记录。字来自字表、其余是数字和日期，没有用户输入，可以直接进 innerHTML。
   */
  function renderHistory() {
    var h = historyNow()
    var st = h.stats
    var box = $('preview')
    var lessonBox = isRj(settings) ? lessonTable(settings, h.marks) : ''
    if (!st.total) {
      box.innerHTML = '<div class="hist">' + lessonBox + '<p class="hist-empty">还没有错过的字。' +
        '在每日一卷或' + (isRj(settings) ? '单元检查' : '本周复习') + '考完，点顶栏「打分」把孩子念不出来的字点出来，提交后就会记到这里。</p></div>'
      return
    }
    var cards = [
      [st.total, '个字错过', '只要错过一次就算'],
      [st.inSet, '个还在错字集', st.once ? '其中 ' + st.once + ' 个差一次毕业' : '　'],
      [st.out, '个已学会', '复核通过，毕业移出'],
      [st.times, '次', '累计一共错过']
    ].map(function (c) {
      return '<div class="hist-card"><b>' + c[0] + '</b><span>' + c[1] + '</span><small>' + c[2] + '</small></div>'
    }).join('')
    var groups = st.groups.map(function (g) {
      return '<div class="hist-row"><div class="hist-n">错 ' + g.n + ' 次<small>' + g.items.length + ' 字</small></div>' +
        '<div class="hist-chars">' + g.items.map(function (it) {
          var tip = ST_LABEL[it.st] + (it.first ? ' · 第一次错 ' + md(it.first) : '') +
            (it.last && it.last !== it.first ? ' · 最近一次错 ' + md(it.last) : '')
          return '<span class="hc ' + it.st + '" title="' + tip + '">' + it.ch + '</span>'
        }).join('') + '</div></div>'
    }).join('')
    var LOG_SHOW = 12
    var logRows = h.log.slice(0, LOG_SHOW).map(function (r) {
      return '<tr><td>' + md(r.d) + '</td><td>' + r.seen.length + '</td><td>' + (r.ok || 0) + '</td><td>' +
        (r.miss || 0) + '</td><td>' + (r.out || 0) + '</td></tr>'
    }).join('')
    box.innerHTML = '<div class="hist">' + lessonBox +
      '<div class="hist-cards">' + cards + '</div>' +
      '<h3 class="hist-h">按错的次数<span class="hist-key"><i class="hc wrong"></i>在错字集里' +
        '<i class="hc once"></i>认出过一次，等复核<i class="hc out"></i>已毕业</span></h3>' +
      groups +
      '<h3 class="hist-h">最近的复习</h3>' +
      (logRows
        ? '<table class="hist-log"><thead><tr><th>日期</th><th>复习旧错字</th><th>认出</th><th>又错</th>' +
          '<th>毕业移出</th></tr></thead><tbody>' + logRows + '</tbody></table>'
        : '<p class="hist-empty">还没有复习记录。考完对着纸点没认出的字、点「提交」，这里就会记一笔。</p>') +
      '</div>'
  }

  /*
   * 人教版「按课看掌握情况」：每课一行，红 = 还在错字集，半红 = 认出过一次等复核，灰 = 错过已学会。
   * 学校还没教到的课整行变淡。字都来自字表，可以直接进 innerHTML。
   */
  function lessonTable(s, marks) {
    var rows = S.shizi.lessonStats(s.book, s.lesson, marks || {})
    var unit = 0
    var body = rows.map(function (r) {
      var head = r.unit !== unit ? '<tr class="lt-unit"><th colspan="3">' + r.unitName + '</th></tr>' : ''
      unit = r.unit
      var miss = r.wrong.length + r.once.length
      var chips = r.wrong.map(function (ch) { return '<span class="hc wrong">' + ch + '</span>' }).join('') +
        r.once.map(function (ch) { return '<span class="hc once">' + ch + '</span>' }).join('') +
        r.out.map(function (ch) { return '<span class="hc out">' + ch + '</span>' }).join('')
      var state = !r.taught ? '还没教' : miss ? miss + ' 个没掌握' : r.out.length ? '已掌握（错过 ' + r.out.length + ' 个）' : '没错过'
      return head + '<tr class="' + (r.taught ? '' : 'lt-later') + (miss && r.taught ? ' lt-miss' : '') + '">' +
        '<td>' + r.label + '<small>' + r.total + ' 字</small></td><td>' + state + '</td><td class="lt-chars">' + chips + '</td></tr>'
    }).join('')
    return '<h3 class="hist-h">按课看掌握情况<span class="hist-key"><i class="hc wrong"></i>没认出' +
      '<i class="hc once"></i>认出过一次，等复核<i class="hc out"></i>错过、已学会</span></h3>' +
      '<table class="hist-log lesson-table"><thead><tr><th>课</th><th>情况</th><th>错过的字</th></tr></thead><tbody>' +
      body + '</tbody></table>'
  }

  /* 顶栏摘要：现在印的是哪一张、多少字 */
  function paintSummary(s, count) {
    if (s.mode === 'wrong') {
      S.shell.summary(['错字集', count + ' 个字'])
      return
    }
    var sl = S.shizi.slice(s)
    S.shell.summary([
      isRj(s) ? '单元检查' : '本周复习',
      sl.label,
      isRj(s) ? sl.chars.length + ' 字' : sl.range,
      s.withWrong && appendPick.length ? '附 ' + appendPick.length + ' 个错字' : ''
    ])
  }

  /* 只刷错字集那一块 + 页签徽标。标记动作走这条路，不碰 #preview */
  function refreshMarkPanel() {
    fillTabs(settings)
    $('mark-hint').innerHTML = markHint(settings)
    var rep = repeatsHtml()
    $('mark-repeats').hidden = !rep
    $('mark-repeats').innerHTML = rep
    /* 附页开关只在「本周复习」下露面；错字集空的时候留着但点不动，
       比整个藏起来好 —— 至少看得见有这么个东西，攒够字自己会亮。 */
    var n = wrongSize()
    $('sec-append').hidden = settings.mode !== 'week'
    els.withWrong.disabled = !n
    /* 挑够了 APPEND_MAX 才说明是「抽」出来的，才有得换；
       不够这个数意味着符合条件的字全在纸上了，换一批换不出别的东西。 */
    $('btn-repick').hidden =
      settings.mode !== 'week' || !settings.withWrong || appendPick.length < APPEND_MAX

    var stale = isStale()
    var relayout = $('btn-relayout')
    relayout.hidden = !stale
    if (stale) {
      var gone = renderedWrong.filter(function (ch) {
        return !S.shiziMark.has(ch)
      }).length
      relayout.textContent = gone ? '重新排版（移出 ' + gone + ' 字）' : '重新排版'
    }
    $('btn-clear-wrong').disabled = !wrongSize()
  }

  /* 纸张区放不下一整张 A4 时整体缩小（见 js/shell.js 的 fit）；错字集空着时没有纸，清掉缩放 */
  function fitPreview() {
    if (!doc.querySelector('#preview .sheet')) {
      $('preview').style.zoom = ''
      return
    }
    S.shell.fit()
  }

  function onFormChange() {
    settings = readForm()
    refresh()
  }

  /* perWeek 单独绑（见下），不要进这个循环，否则改每周字数会走通用路径、把进度弄丢 */
  Object.keys(els).forEach(function (k) {
    if (k === 'perWeek' || k === 'book' || k === 'lesson' || k === 'order') return
    els[k].addEventListener('change', onFormChange)
  })

  /*
   * 改每周字数 = 换单位，不是换进度：周次要跟着搬，人还停在同一个字上。
   * 换算在 shizi-core 的 remapWeek 里（连同为什么必须换算的理由）。
   * 与数独换盘型时用 remapClues 把难度等比搬过去是同一套道理，
   * 所以它也和 shape 一样单独绑、不走通用的 onFormChange。
   */
  els.perWeek.addEventListener('change', function () {
    var to = S.shiziSettings.sanitize({ perWeek: els.perWeek.value }).perWeek
    settings = S.shiziSettings.sanitize(
      Object.assign({}, settings, {
        perWeek: to,
        week: S.shizi.remapWeek(settings.week, settings.perWeek, to)
      })
    )
    refresh()
  })

  /*
   * 周次边打边跟，但【只更新面板上那块进度显示】，不回读表单、不重渲染。
   * 若在 input 里走 onFormChange，refresh → fillForm 会把值立刻写回输入框：
   * 用户按退格把 16 删空的瞬间就被回填成 1，这个框永远清不掉最后一位。
   * 数独的难度滑块在 input 里也只改标签文字，同一个理由。真正的重算交给 change。
   */
  els.week.addEventListener('input', function () {
    var v = Number(els.week.value)
    if (!Number.isFinite(v) || v < 1) return // 空串 / 半截输入先不动
    fillProgress(S.shiziSettings.sanitize(Object.assign({}, settings, { week: v })))
  })

  /*
   * 换字表 / 改「学校学到」：今天那张每日卷如果还没点过字，按新字表重出一张
   * （不然切到人教版，卷上还是某恩的字）；点过字的不动，免得把孩子的标记弄丢，下一张自然按新字表出。
   */
  function rjPrev(book) {
    var b = S.shiziRjData && S.shiziRjData.BOOKS[book]
    return b ? b.prev || '' : ''
  }

  function onBookChange() {
    var before = settings.book + ':' + settings.lesson + ':' + settings.order
    var lessonBefore = settings.lesson
    settings = readForm()
    if (PF && String(settings.lesson) !== String(lessonBefore)) PF.touch(S.store, 'yuwen')
    if (settings.book + ':' + settings.lesson + ':' + settings.order !== before) {
      S.shizi.useBook(settings.book, settings.lesson, settings.order)
      var last = S.shiziMark.paperCount() ? S.shiziMark.paperAt(S.shiziMark.paperCount() - 1) : null
      if (last && !last.settled && !S.shiziMark.pickCount()) {
        S.shiziMark.discardPaper()
        skipPaperRecords(last)
      }
    }
    refresh()
  }
  els.book.addEventListener('change', onBookChange)
  els.lesson.addEventListener('change', onBookChange)
  els.order.addEventListener('change', onBookChange)

  /* 字表那一块：人教版时填「学校学到」的课表（按单元分组），提示每日一卷考的范围 */
  var lessonsFor = ''
  function fillBook(s) {
    els.book.value = s.book
    var rj = isRj(s)
    $('lesson-field').hidden = !rj
    $('order-field').hidden = !rj
    var weekTab = $('mode-tabs').querySelector('[data-mode="week"]')
    /* 只换开头那段字：页签末尾可能挂着会员小锁（js/full-lock.js markTab），整个 textContent 一改锁就没了 */
    if (weekTab && weekTab.firstChild && weekTab.firstChild.nodeType === 3) weekTab.firstChild.nodeValue = rj ? '单元检查' : '本周复习'
    else if (weekTab) weekTab.insertBefore(doc.createTextNode(rj ? '单元检查' : '本周复习'), weekTab.firstChild)
    if (!rj) {
      $('book-hint').textContent = '按某恩识字的顺序，每日一卷从全部 1600 字里抽。'
      return
    }
    var ls = S.shizi.lessonsOf(s.book)
    if (lessonsFor !== s.book) {
      var html = '<option value="0">整册都学完了</option>'
      var unit = 0
      ls.forEach(function (l) {
        if (l.unit !== unit) {
          html += (unit ? '</optgroup>' : '') + '<optgroup label="' + l.unitName + ' · ' + l.kind + '">'
          unit = l.unit
        }
        html += '<option value="' + l.i + '">' + S.shizi.lessonLabel(l) + '</option>'
      })
      els.lesson.innerHTML = html + '</optgroup>'
      lessonsFor = s.book
    }
    els.lesson.value = String(s.lesson)
    els.order.value = s.order
    var n = S.shizi.learnedChars(s.book, s.lesson).length
    var hint = '每日一卷只考学校已经教过的 ' + n + ' 个字，跟着学校进度改这里。'
    if (s.order === 'seq') {
      /* 顺序进度：下一张从哪一课接着出 */
      var q = S.shiziMark.lastSeq() || { next: 0, round: 1 }
      var w = S.shizi.seqWhere(s.book, s.lesson, q.next, q.round)
      hint = '按课本顺序：第 ' + w.round + ' 轮，下一张从' + (w.lesson ? S.shizi.lessonLabel(w.lesson) + '的「' + w.ch + '」' : '开头') +
        '接着出，一轮里不重复。' + hint
    }
    $('book-hint').textContent = hint + '统编版只考课本里的错字。'
  }

  /* ================= 写字（2026-11-22） ================= */

  var XIE_SECS = ['sec-xie', 'sec-xie-off']
  var REN_SECS = ['sec-tabs', 'sec-daily', 'mark-legend', 'sec-progress', 'sec-history', 'sec-layout', 'sec-wrong']

  /* 认字 / 写字 两大块的显隐；认字里各节自己的显隐照旧在 fillForm 里算，这里只在写字时整块收起 */
  function fillPane(s) {
    var xie = s.pane === 'xie'
    if (!xie) XIE_SECS.forEach(function (id) { $(id).hidden = true })
    if (!xie) $('sec-book').hidden = false
  }

  function xieLessonNow(s) {
    return S.shiziXie.pickFor(s)
  }

  var xieFor = ''
  function fillXie(s) {
    REN_SECS.forEach(function (id) { $(id).hidden = true })
    /* 认字的「字表」那一节在写字时收起：写字有自己的「写哪套字」 */
    $('sec-book').hidden = true
    $('sec-xie').hidden = false
    $('sec-xie-off').hidden = true
    els.xieBook.value = s.xieBook
    var ls = S.shiziXie.lessons(s.xieBook)
    var auto = S.shiziXie.pick(s.xieBook, 0, S.shiziXie.learnedFor(s))
    var key = s.xieBook + ':' + s.book + ':' + s.lesson
    if (xieFor !== key) {
      var autoWord = s.xieBook === s.book ? '跟着认字的「学校学到」' : '自动'
      var html = '<option value="0">' + autoWord + '（' + (auto ? auto.label : '') + '）</option>'
      var unit = ''
      ls.forEach(function (l) {
        if (l.unitName !== unit) {
          html += (unit ? '</optgroup>' : '') + '<optgroup label="' + l.unitName + '">'
          unit = l.unitName
        }
        html += '<option value="' + l.i + '">' + l.label + '（' + l.chars.join('') + '）</option>'
      })
      els.xieLesson.innerHTML = html + '</optgroup>'
      xieFor = key
    }
    els.xieLesson.value = String(s.xieLesson)
    if (els.xieLesson.value === '') els.xieLesson.value = '0'
    els.xieSize.value = s.xieSize
    els.xieTrace.value = String(s.xieTrace)
    var l = xieLessonNow(s)
    $('xie-now').textContent = l ? l.label : ''
    $('xie-sub').textContent = l ? l.unitName + '　·　' + l.chars.join(' ') + '　·　' + l.chars.length + ' 个字' : ''
    $('btn-xie-prev').disabled = !l || !S.shiziXie.neighbor(s.xieBook, l.i, -1)
    $('btn-xie-next').disabled = !l || !S.shiziXie.neighbor(s.xieBook, l.i, 1)
    return l
  }

  function renderXie() {
    delete $('preview').dataset.locked
    $('notice').hidden = true
    var l = fillXie(settings)
    var box = $('preview')
    if (!l) {
      box.innerHTML = '<div class="empty"><b>写字要用统编版字表</b><p>在右边「字表」里选统编版（人教社）一年级上册或下册，这里就会按课出田字格练字纸。</p></div>'
      $('btn-print').disabled = true
      $('pages-hint').textContent = ''
      S.shell.summary(['写字'])
      fitPreview()
      return
    }
    box.innerHTML = S.shiziXie.sheets({ size: settings.xieSize, trace: settings.xieTrace, copies: settings.copies, title: settings.title },
      l, function (title) {
        return '<header class="sheet-head"><div class="sheet-title">' + S.render.parts.esc(title) + '</div>' + S.render.parts.metaHTML() + '</header>'
      }).join('')
    $('btn-print').disabled = false
    $('btn-print').hidden = false
    $('btn-print').querySelector('.txt').textContent = '打印练字纸'
    S.shell.summary(['写字', l.label, l.chars.length + ' 个字'])
    fitPreview()
  }


  function xieStep(delta) {
    return function () {
      var l = xieLessonNow(settings)
      var to = l ? S.shiziXie.neighbor(settings.xieBook, l.i, delta) : 0
      if (!to) return
      settings = S.shiziSettings.sanitize(Object.assign({}, settings, { xieLesson: to }))
      refresh()
    }
  }
  $('btn-xie-prev').addEventListener('click', xieStep(-1))
  $('btn-xie-next').addEventListener('click', xieStep(1))

  /* 点范字看笔顺动画（只在写字纸上；卷面的点字标记在认字里，互不相干） */
  $('preview').addEventListener('click', function (ev) {
    if (settings.pane !== 'xie') return
    var m = ev.target.closest('[data-anim]')
    if (m) S.shiziXie.animate(m.getAttribute('data-anim'))
  })

  function gotoMode(mode) {
    if (mode === settings.mode) return
    settings = S.shiziSettings.sanitize(Object.assign({}, settings, { mode: mode }))
    refresh()
  }

  /* 模式页签 */
  $('mode-tabs').addEventListener('click', function (ev) {
    var tab = ev.target.closest ? ev.target.closest('.stage-tab') : null
    if (tab && tab.dataset.mode) gotoMode(tab.dataset.mode)
  })

  /* 错字集一栏底下的「看历史统计 →」 */
  $('mark-repeats').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-goto]')
    if (b) gotoMode(b.getAttribute('data-goto'))
  })

  function step(delta) {
    return function () {
      var k = isRj(settings) ? 'unit' : 'week'
      var patch = {}
      patch[k] = settings[k] + delta
      settings = S.shiziSettings.sanitize(Object.assign({}, settings, patch))
      refresh()
    }
  }

  $('btn-prev').addEventListener('click', step(-1))
  $('btn-next').addEventListener('click', step(1))

  /* 用户自己决定什么时候把点掉的字从卷面上清掉 */
  $('btn-relayout').addEventListener('click', refresh)

  /* 附页这一批不合意（比如刚好全是简单字），换一批。这是唯一会主动重抽的入口 */
  $('btn-repick').addEventListener('click', function () {
    repick()
    refresh()
  })

  $('btn-clear-wrong').addEventListener('click', function () {
    var n = wrongSize()
    if (!n) return
    /* 清空是不可逆的，而且攒了几个月的东西 —— 值得拦一道。人教版下只清课本里的字 */
    if (!root.confirm('清空错字集里的 ' + n + ' 个字？这一步撤不回来。\n\n' +
      (isRj(settings) ? '只清人教版课本里的字，某恩的错字不动。' : '') + '每个字累计进过几次的记录会留着。')) return
    S.shiziMark.clear(isRj(settings) ? S.shizi.inScope : null)
    refresh()
  })

  $('btn-print').addEventListener('click', function () {
    root.print()
  })

  root.addEventListener('resize', fitPreview)

  /* 页面隔天未刷新直接打印（含浏览器菜单打印）时，日期仍保证是当天 */
  root.addEventListener('beforeprint', S.render.refreshDates)

  /*
   * 标记变化时【只刷面板】，绝不重渲染卷面。
   * 这是这个功能好不好用的关键，理由见 js/shizi-mark.js 的文件头。
   */
  /*
   * 用人教版时，最新那张还没考的卷子上如果有课本外的字（旧版规则下出的卷：某恩的错字也上卷），
   * 而且还没点过字，就按现在的规则重出一张。点过字的不动，免得丢标记；打过分的卷绝不改。
   */
  function refreshStalePaper() {
    if (!isRj(settings)) return
    var n = S.shiziMark.paperCount()
    var last = n ? S.shiziMark.paperAt(n - 1) : null
    if (!last || last.settled || S.shiziMark.pickCount()) return
    var off = Array.from(last.chars).some(function (ch) { return !S.shizi.inScope(ch) })
    if (off && S.shiziMark.discardPaper()) skipPaperRecords(last)
  }

  S.shiziMark.onChange(refreshMarkPanel)
  refreshStalePaper()
  refresh()
  /* 第一次来、还没有孩子档案：弹一次（顺手问语文学到哪），设好按新课本重出 */
  if (PF) PF.ensure({ ask: 'yuwen' }).then(function (r) { if (r.fresh) PF.reload() })

  /* 完工标记：上面任何一步抛错都到不了这里；HTML 里的防护脚本据此判断并提示 */
  document.documentElement.setAttribute('data-sumsum-ready', '1')
})(window)
/* 2026-11-27 一下上线：换指纹 */
