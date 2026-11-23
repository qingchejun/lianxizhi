/**
 * 火柴棒算式页交互：表单 ↔ 设置对象双向同步、重新生成 / 打印。
 * 与口算/密码一致——任何参数变化都会自动重新生成并渲染（所见即所得）。
 * 生成：首次进某关时穷举题池（L4 约 0.2 秒），之后同关换批是瞬时的。
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
    anspage: $('f-anspage'),
    title: $('f-title')
  }

  var settings = S.huochaiSettings.load()

  var LEVEL_HINTS = {
    L1: '拿走一根火柴，让算式变对。只动一处，最容易上手：先看哪个数字少一根能变成别的数。',
    L2: '添上一根火柴，让算式变对。卷面上淡虚线是能放火柴的空位，减号添一根竖的就变成加号。',
    L3: '移动一根火柴：从一处拿走，放到另一处。可以在同一个数字里挪，也可以挪到别的数字或符号上。',
    L4: '移动一根火柴，数字到 20，有两位数。适合家长陪着一起想，比谁先改对。'
  }

  function fillForm(s) {
    els.level.value = s.level
    els.count.value = s.count
    els.copies.value = String(s.copies)
    els.anspage.checked = s.answerPage
    els.title.value = s.title
  }

  function readForm() {
    return S.huochaiSettings.sanitize({
      level: els.level.value,
      count: els.count.value,
      copies: els.copies.value,
      answerPage: els.anspage.checked,
      seed: settings.seed, // 种子不是表单项，改参数时沿用，只有「重新生成」才换
      title: els.title.value.trim()
    })
  }

  function pagesHint(s, count) {
    var R = S.huochaiRender
    var pages = Math.ceil(count / R.PER_PAGE) * s.copies
    var ansPages = s.answerPage ? Math.ceil(count / R.ANS_PER_PAGE) : 0
    var parts = ['共 ' + (pages + ansPages) + ' 张纸', '每页 ' + R.PER_PAGE + ' 道']
    if (s.copies > 1) parts.push('印 2 份')
    if (ansPages) parts.push('含 ' + ansPages + ' 张答案页')
    return parts.join(' · ')
  }

  /* 主流程：保存设置 → 同步表单 → 生成题目 → 渲染 → 提示语 */
  function refresh() {
    S.huochaiSettings.save(settings)
    fillForm(settings)

    var result = S.huochai.generate(settings)
    S.huochaiRender.render($('preview'), settings, result.puzzles)
    S.shell.fit()

    $('level-hint').textContent = LEVEL_HINTS[settings.level] || ''
    $('pages-hint').textContent = pagesHint(settings, result.puzzles.length)
    S.shell.summary([
      S.huochai.levelOf(settings.level).name,
      result.puzzles.length + ' 道',
      settings.copies > 1 ? '2 份' : ''
    ])

    var notice = $('notice')
    if (result.shortfall > 0) {
      notice.textContent = '这一关的题只有 ' + result.puzzles.length + ' 道，少于设定的 ' + settings.count + ' 道。'
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

  /* 换关卡等于换一整批题（也是换一种改法），顺手换个种子，与密码换关同一条规矩 */
  els.level.addEventListener('change', function () {
    settings = S.huochaiSettings.sanitize(Object.assign({}, settings, {
      level: els.level.value,
      seed: S.huochaiSettings.newSeed()
    }))
    refresh()
  })

  /* 重新生成：参数不变，换一批随机题——换种子即可（种子已写进网址，可复现） */
  $('btn-regen').addEventListener('click', function () {
    settings = Object.assign({}, settings, { seed: S.huochaiSettings.newSeed() })
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
