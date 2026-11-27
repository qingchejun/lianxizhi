/**
 * 数织页交互：表单 ↔ 设置对象双向同步、重新生成 / 打印。
 * 与口算/数独/密码一致——任何参数变化都会自动重新生成并渲染（所见即所得），
 * 没有单独的「生成」按钮。最贵的一关（L4）一批 8 幅实测在几十毫秒级。
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

  var settings = S.zhizhiSettings.load()

  var LEVEL_HINTS = {
    L1: '5×5 小格子，字母和数字图形，涂完就是一幅画——第一次玩从这一档开始。',
    L2: '8×8，动物和日常物件。要学会「挤一挤」：线索长的时候，从两头往中间数，重叠的格子一定能涂。',
    L3: '10×10，图案细节更多，行推出一点、列再推出一点，交叉着往前走。',
    L4: '12×12 一整页一幅大图，适合安静的下午慢慢涂。'
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
    return S.zhizhiSettings.sanitize({
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
    var per = S.zhizhiRender.perPageOf(s, count)
    var sheets = Math.ceil(count / per)
    var pages = sheets * s.copies
    var ansPages = s.answerPage ? Math.ceil(count / 4) : 0
    var parts = ['共 ' + (pages + ansPages) + ' 张纸', '每页 ' + per + ' 幅']
    if (s.copies > 1) parts.push('印 2 份')
    if (ansPages) parts.push('含 ' + ansPages + ' 张答案页')
    return parts.join(' · ')
  }

  /* 主流程：保存设置 → 同步表单 → 生成图案 → 渲染 → 提示语 */
  function refresh() {
    S.zhizhiSettings.save(settings)
    fillForm(settings)

    var result = S.zhizhi.generate(settings)
    S.zhizhiRender.render($('preview'), settings, result.puzzles)
    S.zhizhiPlay.attach($('preview'), result.puzzles)
    S.shell.fit()

    $('level-hint').textContent = LEVEL_HINTS[settings.level] || ''
    $('pages-hint').textContent = pagesHint(settings, result.puzzles.length)
    S.shell.summary([
      S.zhizhi.levelOf(settings.level).name,
      result.puzzles.length + ' 幅',
      settings.copies > 1 ? '2 份' : ''
    ])

    var notice = $('notice')
    if (result.shortfall > 0) {
      notice.textContent =
        '当前设置下不重复的图案只有 ' + result.puzzles.length +
        ' 幅（少于设定的 ' + settings.count +
        ' 幅）。可以减少题量，或关闭「图案不重复」。'
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

  /* 换关卡等于换一整批图案（也是换一种玩法），顺手换个种子，与数独换盘型同一条规矩 */
  els.level.addEventListener('change', function () {
    settings = S.zhizhiSettings.sanitize(Object.assign({}, settings, {
      level: els.level.value,
      seed: S.zhizhiSettings.newSeed()
    }))
    refresh()
  })

  /* 重新生成：参数不变，换一批随机图案——换种子即可（种子已写进网址，可复现） */
  $('btn-regen').addEventListener('click', function () {
    settings = Object.assign({}, settings, { seed: S.zhizhiSettings.newSeed() })
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
