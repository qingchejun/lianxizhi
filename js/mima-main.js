/**
 * 密码页交互：表单 ↔ 设置对象双向同步、重新生成 / 打印。
 * 与口算/数独一致——任何参数变化都会自动重新生成并渲染（所见即所得），
 * 没有单独的「生成」按钮。最贵的一关（L4）一批 12 题实测在几百毫秒级。
 */
(function (root) {
  'use strict'

  var doc = root.document
  var S = root.SumSum

  function $(id) {
    return doc.getElementById(id)
  }

  var els = {
    level: $('f-level'),
    count: $('f-count'),
    copies: $('f-copies'),
    nodup: $('f-nodup'),
    anspage: $('f-anspage'),
    title: $('f-title')
  }

  var settings = S.mimaSettings.load()

  var LEVEL_HINTS = {
    L1: '只有 ●（数字对、位置也对）和「全错」两种线索，卷上印着可以划掉的数字带——目标是第一次就做得出来。',
    L2: '加入 ○（数字对但位置不对），要学会「这个数在密码里、但不在这个位置」。',
    L3: '线索换成句子，和书上见到的题一个样子，开始练读题。',
    L4: '四位密码 +「两个号码正确，位置都不对」这类复合线索，信息最密，适合家长陪着一起推。'
  }

  function fillForm(s) {
    els.level.value = s.level
    els.count.value = s.count
    els.copies.value = String(s.copies)
    els.nodup.checked = s.noDuplicates
    els.anspage.checked = s.answerPage
    els.title.value = s.title
  }

  function readForm() {
    return S.mimaSettings.sanitize({
      level: els.level.value,
      count: els.count.value,
      copies: els.copies.value,
      noDuplicates: els.nodup.checked,
      answerPage: els.anspage.checked,
      seed: settings.seed, // 种子不是表单项，改参数时沿用，只有「重新生成」才换
      title: els.title.value.trim()
    })
  }

  function pagesHint(s, count) {
    var per = S.mimaRender.perPageOf(s, count)
    var sheets = Math.ceil(count / per)
    var pages = sheets * s.copies
    var ansPages = s.answerPage ? Math.ceil(count / 4) : 0
    var text = '一共 ' + (pages + ansPages) + ' 张纸：' + count + ' 道题 · 每页 ' + per + ' 道 = ' + sheets + ' 页'
    if (s.copies > 1) text += ' × 2 份 = ' + pages + ' 张'
    if (ansPages) text += '，另加 ' + ansPages + ' 张答案页'
    return text + '。'
  }

  /* 主流程：保存设置 → 同步表单 → 生成题目 → 渲染 → 提示语 */
  function refresh() {
    S.mimaSettings.save(settings)
    fillForm(settings)

    var result = S.mima.generate(settings)
    S.mimaRender.render($('preview'), settings, result.puzzles)
    S.shell.fit()

    $('level-hint').textContent = LEVEL_HINTS[settings.level] || ''
    $('pages-hint').textContent = pagesHint(settings, result.puzzles.length)
    S.shell.summary([
      S.mima.levelOf(settings.level).name,
      result.puzzles.length + ' 题',
      settings.copies > 1 ? '2 份' : ''
    ])

    var notice = $('notice')
    if (result.shortfall > 0) {
      notice.textContent =
        '当前设置下不重复的题目只有 ' + result.puzzles.length +
        ' 道（少于设定的 ' + settings.count +
        ' 道）。可以减少题量，或关闭「题目不重复」。'
      notice.hidden = false
    } else {
      notice.hidden = true
    }
  }

  function onFormChange() {
    settings = readForm()
    refresh()
  }

  /* level 单独绑（见下），不要进这个循环，否则换关卡会连着渲染两遍 */
  Object.keys(els).forEach(function (k) {
    if (k === 'level') return
    els[k].addEventListener('change', onFormChange)
  })

  /* 换关卡等于换一整批题（也是换一种玩法），顺手换个种子，与数独换盘型同一条规矩 */
  els.level.addEventListener('change', function () {
    settings = S.mimaSettings.sanitize(Object.assign({}, settings, {
      level: els.level.value,
      seed: S.mimaSettings.newSeed()
    }))
    refresh()
  })

  /* 重新生成：参数不变，换一批随机题——换种子即可（种子已写进网址，可复现） */
  $('btn-regen').addEventListener('click', function () {
    settings = Object.assign({}, settings, { seed: S.mimaSettings.newSeed() })
    refresh()
  })

  $('btn-print').addEventListener('click', function () {
    root.print()
  })

  root.addEventListener('resize', S.shell.fit)

  /* 页面隔天未刷新直接打印（含浏览器菜单打印）时，日期仍保证是当天 */
  root.addEventListener('beforeprint', S.render.refreshDates)

  refresh()

  /* 完工标记：上面任何一步抛错都到不了这里；HTML 里的防护脚本据此判断并提示 */
  document.documentElement.setAttribute('data-sumsum-ready', '1')
})(window)
