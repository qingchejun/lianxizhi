/**
 * 识字页交互：模式切换、表单 ↔ 设置对象双向同步、周次前进后退、打印。
 * 与其它三个板块一致 —— 任何参数变化都会自动重新渲染（所见即所得），没有「生成」按钮。
 * 这里连生成都算不上：字表是固定的，换一周只是换一段下标。
 *
 * 错字集的标记动作【不走这里】：它由 js/shizi-mark.js 直接改被点那一格的 class，
 * 绕开 refresh()。原因见那个文件的说明 —— 点一下就重渲染会让卷面在手指底下重新流动。
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
    lesson: $('f-lesson')
  }

  var settings = S.shiziSettings.load()
  S.shizi.useBook(settings.book, settings.lesson)

  function isRj(s) {
    return s.book !== S.shizi.HONGEN
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
      S.shiziMark.all(),
      S.shizi.slice(settings).chars,
      APPEND_MAX,
      null,
      S.shiziMark.weightOf
    )
    pickedForWeek = sliceKey(settings)
  }

  /* 附页缓存认的是「哪一段」：洪恩看周次，人教版看单元 */
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
    if (S.shiziMark.size() !== renderedWrong.length) return true
    return renderedWrong.some(function (ch) {
      return !S.shiziMark.has(ch)
    })
  }

  /* ---------- 每日一卷 ---------- */

  /* browseIdx=null 看最新一张（登记/作废都在它身上）；数字是 papers 数组的下标，
     只用来翻往期。往期一律只读 —— 卷是「冻住」的，历史卷不能再点。 */
  var browseIdx = null

  function dailyPaper() {
    var p = browseIdx != null ? S.shiziMark.paperAt(browseIdx) : null
    /* 兜底：翻着往期时数组理论上不会变短（作废会先重置 browseIdx），但别让 null 炸渲染 */
    return p || S.shiziMark.ensurePaper()
  }

  function renderDaily() {
    var p = dailyPaper()
    var todayStr = S.shiziMark.today()
    var active = browseIdx == null && !p.settled
    /* data-locked='1' 时 shizi-mark 的点击代理直接忽略（往期卷只读）；
       今天的活卷必须清掉，否则从往期切回来点不动 */
    if (active) delete $('preview').dataset.locked
    else $('preview').dataset.locked = '1'
    $('preview').innerHTML = S.shiziRender.renderWrong(settings, Array.from(p.chars), {
      title: '识字 · 每日一卷',
      foot: '每日一卷 · ' + p.chars.length + ' 字'
    }).join('')
    root.document.body.classList.remove('landscape')
    S.shiziMark.paint()
    var status = $('daily-status')
    var settledToday = browseIdx == null && S.shiziMark.canUndo('daily')
    if (active) {
      status.innerHTML = p.d === todayStr
        ? '今天 ' + p.chars.length + ' 个字，含最多 10 个错字。打印考完，在卷面上点出<b>没认出</b>的字，再点「登记结果」。'
        : p.d > todayStr
          ? (settledToday ? '今天已登记。' : '') + '明天的 ' + p.chars.length + ' 个字已经出好，含今晚登记的错字，可以先打印。'
          : md(p.d) + ' 的卷子还没登记。对着那张纸点出没认出的字再登记，或者作废。'
    } else {
      status.innerHTML = (p.d === todayStr ? '今天' : md(p.d)) + '的卷子已登记。' +
        (browseIdx == null ? '下一张会自动出好。' : '（往期卷只读）')
    }
    $('btn-daily-settle').hidden = !active
    /* 撤销登记：看着「今天已登记的那张」时亮；登记完顶上来的是明日预览卷，那也得亮 */
    $('btn-daily-undo').hidden = !(browseIdx == null && ((p.settled && p.d === todayStr) || p.d > todayStr) && S.shiziMark.canUndo('daily'))
    $('btn-daily-drop').hidden = !active
    var n = S.shiziMark.paperCount()
    $('daily-browse').hidden = n < 2
    $('paper-which').textContent = n ? md(p.d) + ' · 第 ' + (browseIdx == null ? n : browseIdx + 1) + '/' + n + ' 张' : ''
    /* ◀ 往旧翻：停在最早一张时才禁用；▶ 往回走：停在最新一张时禁用 */
    $('btn-paper-prev').disabled = browseIdx != null && browseIdx <= 0
    $('btn-paper-next').disabled = browseIdx == null
  }

  function fillTabs(s) {
    var tabs = $('mode-tabs').querySelectorAll('.stage-tab')
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].dataset.mode === s.mode)
    }
    /* 页签上直接带字数，不用切进去才知道攒了多少（每日一卷不带：到期数跟
       错字集总数常年一样大，摆出来只让人多问一句是什么） */
    var n = S.shiziMark.size()
    $('wrong-n').textContent = n ? ' · ' + n : ''
    $('wrong-title-n').textContent = n ? n + ' 个' : ''
  }

  function fillForm(s) {
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
      /* 「学到第几课」只在人教版下从下拉框读；洪恩下下拉框是空的，沿用记着的值，
         切回人教版时进度还在（sanitize 会按所选那一册钳位） */
      lesson: els.book.value === settings.book && isRj(settings) ? els.lesson.value : settings.lesson,
      unit: settings.unit,
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
      $('week-hint').textContent = '学完一个单元考一次：整个单元的字印一张，没认出的点一下再登记，错字会进每日一卷。'
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
    var n = S.shiziMark.size()
    if (!n) {
      /* 一个字都没有时，讲「怎么毕业」是没意义的 —— 不管在哪个模式，
         此刻唯一有用的信息都是「去哪儿、怎么把第一个字收进来」。 */
      return '错字集是空的。' +
        (s.mode === 'wrong' ? '在「每日一卷」或「本周复习」里，' : '') +
        '孩子念不出的字在卷面上点一下，再点「登记结果」。标记不会印到纸上。'
    }
    var once = S.shiziMark.onceCount()
    var head = '错字集 <b>' + n + '</b> 个字' + (once ? '，其中 ' + once + ' 个再认出一次就毕业' : '') + '。' +
      '没认出的字第二天接着考，认出后隔 3 天复核，复核认出才毕业。'
    if (s.mode === 'wrong') {
      return head + '<br>考完点出<b>没认出</b>的字，再点「登记结果」，没点的算认出。'
    }
    var tail = head + '孩子念不出的字点一下，再点「登记结果」。'
    if (s.withWrong && appendPick.length) {
      tail += '<br>附页的 ' + appendPick.length + ' 个旧错字：没认出的点一下，考完一并「登记结果」。'
    }
    return tail
  }

  /* 按钮文案随模式走：印的是哪张卷子，按钮上就写哪张 */
  var PRINT_LABEL = { daily: '打印今日卷', week: '打印复习卷', wrong: '打印错字卷', history: '打印' }

  /* 主流程：保存设置 → 同步表单 → 渲染 → 把错字标记投影回新 DOM */
  function refresh() {
    S.shizi.useBook(settings.book, settings.lesson)
    S.shiziSettings.save(settings)
    fillTabs(settings)
    fillForm(settings)
    if (settings.mode === 'week') fillProgress(settings)

    /* 错字集模式下，渲染用的是【进入时的快照】；之后用户再点就只改 class，
       不动卷面结构，直到他自己点「重新排版」或切走再切回来。 */
    renderedWrong = settings.mode === 'wrong' ? S.shiziMark.all() : []
    if (settings.mode === 'daily') {
      renderDaily()
      fitPreview()
      var dp = dailyPaper()
      $('pages-hint').textContent = pagesHint(settings, dp ? dp.chars.length : 0, null)
      /* 翻到往期卷时印的就是那张往期卷，按钮不能还顶着「今日」的名字 */
      $('btn-print').querySelector('.txt').textContent =
        browseIdx == null ? PRINT_LABEL.daily : '打印往期卷'
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
      var st = S.shiziMark.history().stats
      S.shell.summary(['历史错字', st.total + ' 个字', '累计错 ' + st.times + ' 次'])
      return
    }
    var append = appendChars()
    S.shiziRender.render($('preview'), settings, renderedWrong, append)
    /* 渲染之后立刻把集合投影到新 DOM 上 —— 位置对应数独 render() 紧跟 attach() 的那两行 */
    S.shiziMark.paint()
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
    var st = S.shiziMark.history().stats
    if (!st.total) return ''
    var rep = S.shiziMark.repeats().length
    return '<p class="hint">历史上错过 <b>' + st.total + '</b> 个字' +
      (rep ? '，其中 <b>' + rep + '</b> 个错过 2 次以上' : '') + '，已学会移出 ' + st.out + ' 个。</p>' +
      '<button type="button" class="btn btn-sm" data-goto="history">看历史统计 →</button>'
  }

  /* ---------- 复习结算 ---------- */

  /* 卷面上现在有哪些字（去重）。份数 = 2 时同一个字有两格 */
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

  /*
   * 登记那一块。三种情况：
   *   今天登记过                    → 显示今天的结果和「撤销登记」；
   *   卷面上有在集字或点过字        → 「登记结果」按钮 + 说清楚登记会怎样；
   *   都没有（纯认识字的一周卷）    → 空，不占地方。
   * 文案里只有数字，没有用户输入，可以直接进 innerHTML。
   */
  function settleHtml() {
    if (settings.mode === 'history' || settings.mode === 'daily') return ''
    var chars = sheetChars()
    var seen = S.shiziMark.onSheet(chars)
    var picked = S.shiziMark.pickedIn(chars)
    var row = S.shiziMark.todayLog()
    var html = ''
    if (row) {
      html += '<p class="hint settle-done">今天登记过 <b>' + row.seen.length + '</b> 个旧错字：认出 ' + row.ok +
        (row.out ? '（其中 ' + row.out + ' 个复核通过毕业）' : '') +
        '，又错 <b>' + row.miss + '</b> 个。' +
        (S.shiziMark.canUndo('sheet') ? ' <button type="button" class="link-btn" data-settle="undo">撤销登记</button>' : '') + '</p>'
    }
    if (seen.length || picked.length) {
      html += '<button type="button" class="btn btn-sm settle-btn" data-settle="go">登记结果</button>' +
        '<p class="hint">点了 <b>' + picked.length + '</b> 个没认出的；没点的 ' + seen.length +
        ' 个旧错字算认出（认出记一次，隔 3 天复核过了就毕业）。点错了再点一下就取消。</p>'
    }
    return html
  }

  $('settle').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-settle]')
    if (!b) return
    if (b.getAttribute('data-settle') === 'go') S.shiziMark.settle(sheetChars())
    else S.shiziMark.undoSettle()
    /* 只改格子的颜色，卷面不重排（理由同 shizi-mark 的文件头）；面板由 onChange 刷 */
    S.shiziMark.paint()
  })

  /* ---------- 每日一卷的按钮 ---------- */

  $('btn-daily-settle').addEventListener('click', function () {
    var p = dailyPaper()
    if (!p || p.settled) return
    S.shiziMark.settle(Array.from(p.chars), p)
    refresh()
  })

  $('btn-daily-undo').addEventListener('click', function () {
    S.shiziMark.undoSettle()
    refresh()
  })

  $('btn-daily-drop').addEventListener('click', function () {
    if (!root.confirm('作废这张卷子？字的数据不动，随时可以重新生成一张。')) return
    S.shiziMark.discardPaper()
    browseIdx = null
    refresh()
  })

  /* ◀ 往旧翻：从最新一张开始，一路翻到最早；▶ 往回走，走出倒数第二张就回到「活卷」视角
     ——最新那张永远由 null 视角显示（活卷/今天已登记），浏览范围不含它，免得同一张卷
     出现「可点的」和「锁住的」两个版本 */
  $('btn-paper-prev').addEventListener('click', function () {
    var n = S.shiziMark.paperCount()
    browseIdx = browseIdx == null ? n - 2 : Math.max(0, browseIdx - 1)
    refresh()
  })

  $('btn-paper-next').addEventListener('click', function () {
    if (browseIdx == null) return
    var n = S.shiziMark.paperCount()
    browseIdx = browseIdx >= n - 2 ? null : browseIdx + 1
    refresh()
  })

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
    var h = S.shiziMark.history()
    var st = h.stats
    var box = $('preview')
    var lessonBox = isRj(settings) ? lessonTable(settings, h.marks) : ''
    if (!st.total) {
      box.innerHTML = '<div class="hist">' + lessonBox + '<p class="hist-empty">还没有错过的字。' +
        '在每日一卷或' + (isRj(settings) ? '单元检查' : '本周复习') + '的卷面上点孩子念不出来的字，登记后就会记到这里。</p></div>'
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
        : '<p class="hist-empty">还没有复习记录。考完对着纸点没认出的字、点「登记结果」，这里就会记一笔。</p>') +
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
    var settle = settleHtml()
    $('settle').hidden = !settle
    $('settle').innerHTML = settle

    /* 附页开关只在「本周复习」下露面；错字集空的时候留着但点不动，
       比整个藏起来好 —— 至少看得见有这么个东西，攒够字自己会亮。 */
    var n = S.shiziMark.size()
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
    $('btn-clear-wrong').disabled = !S.shiziMark.size()
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
    if (k === 'perWeek' || k === 'book' || k === 'lesson') return
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
   * （不然切到人教版，卷上还是洪恩的字）；点过字的不动，免得把孩子的标记弄丢，下一张自然按新字表出。
   */
  function onBookChange() {
    var before = settings.book + ':' + settings.lesson
    settings = readForm()
    if (settings.book + ':' + settings.lesson !== before) {
      S.shizi.useBook(settings.book, settings.lesson)
      var last = S.shiziMark.paperCount() ? S.shiziMark.paperAt(S.shiziMark.paperCount() - 1) : null
      if (last && !last.settled && !S.shiziMark.pickCount()) {
        S.shiziMark.discardPaper()
        browseIdx = null
      }
    }
    refresh()
  }
  els.book.addEventListener('change', onBookChange)
  els.lesson.addEventListener('change', onBookChange)

  /* 字表那一块：人教版时填「学校学到」的课表（按单元分组），提示每日一卷考的范围 */
  var lessonsFor = ''
  function fillBook(s) {
    els.book.value = s.book
    var rj = isRj(s)
    $('lesson-field').hidden = !rj
    var weekTab = $('mode-tabs').querySelector('[data-mode="week"]')
    if (weekTab) weekTab.textContent = rj ? '单元检查' : '本周复习'
    if (!rj) {
      $('book-hint').textContent = '按洪恩识字的顺序，每日一卷从全部 1600 字里抽。'
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
    var n = S.shizi.learnedChars(s.book, s.lesson).length
    $('book-hint').textContent = '每日一卷只考学校已经教过的 ' + n + ' 个字，跟着学校进度改这里。错字两套字表共用。'
  }

  function gotoMode(mode) {
    if (mode === settings.mode) return
    browseIdx = null // 离开又回来，先看最新一张，别停在刚才翻的往期上
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
    var n = S.shiziMark.size()
    if (!n) return
    /* 清空是不可逆的，而且攒了几个月的东西 —— 值得拦一道 */
    if (!root.confirm('清空错字集里的 ' + n + ' 个字？这一步撤不回来。\n\n每个字累计进过几次的记录会留着。')) return
    S.shiziMark.clear()
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
  S.shiziMark.onChange(refreshMarkPanel)
  S.shiziMark.bind()
  refresh()

  /* 完工标记：上面任何一步抛错都到不了这里；HTML 里的防护脚本据此判断并提示 */
  document.documentElement.setAttribute('data-sumsum-ready', '1')
})(window)
