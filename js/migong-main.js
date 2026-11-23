/**
 * 算式迷宫页交互：表单 ↔ 设置对象双向同步、重新生成 / 打印。
 * 与口算/密码一致——任何参数变化都会自动重新生成并渲染（所见即所得）。
 * 生成是瞬时的（6×6 网格的路径 DFS + 唯一性验证都在毫秒级）。
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

  var settings = S.migongSettings.load()

  var LEVEL_HINTS = {
    L1: '10 以内加法 · 4×4 小迷宫。第一次玩就能走通：把每格都算一遍，对的格子连起来就是路。',
    L2: '10 以内加减混合 · 5×5。路上开始有岔口——踩之前先算清楚，岔进去就回不去了。',
    L3: '20 以内进位加法（7+8 这种）· 6×6 大迷宫，一张纸一整张迷宫。',
    L4: '20 以内加减混合，含退位减（15-8 这种）· 6×6 · 岔口最多，适合家长陪着比谁先到终点。'
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
    return S.migongSettings.sanitize({
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
    var per = S.migongRender.perPageOf(s, count)
    var sheets = Math.ceil(count / per)
    /* 每页 1 张的大迷宫：对战是整卷分份印（copies 份各 sheets 页）；
       每页 2 张的：同页双份。两种印法总页数相同，口径统一按 sheets × copies。 */
    var pages = sheets * s.copies
    var ansPages = s.answerPage ? Math.ceil(count / 4) : 0
    var parts = ['共 ' + (pages + ansPages) + ' 张纸', '每页 ' + per + ' 张']
    if (s.copies > 1) parts.push('印 2 份')
    if (ansPages) parts.push('含 ' + ansPages + ' 张答案页')
    return parts.join(' · ')
  }

  /* 主流程：保存设置 → 同步表单 → 生成题目 → 渲染 → 提示语 */
  function refresh() {
    S.migongSettings.save(settings)
    fillForm(settings)

    var result = S.migong.generate(settings)
    S.migongRender.render($('preview'), settings, result.puzzles)
    /* 扫码登记：纸角二维码 + 打印时记下这张（太简单 / 刚好 / 太难 → 下一张升降关，见 mark 页） */
    if (S.sheets) {
      S.sheets.use({
        module: 'migong',
        title: S.sheetsCore.MODULE_LABEL.migong + ' · ' + S.sheetsCore.gameLevelText('migong', settings),
        idParts: JSON.stringify(settings),
        units: [{ key: 'all', label: '整张' }],
        items: [],
        ref: { settings: settings }
      })
    }
    S.shell.fit()

    $('level-hint').textContent = LEVEL_HINTS[settings.level] || ''
    $('pages-hint').textContent = pagesHint(settings, result.puzzles.length)
    S.shell.summary([
      S.migong.levelOf(settings.level).name,
      result.puzzles.length + ' 张',
      settings.copies > 1 ? '2 份' : ''
    ])

    var notice = $('notice')
    if (result.shortfall > 0) {
      notice.textContent =
        '当前设置下不重复的迷宫只有 ' + result.puzzles.length +
        ' 张（少于设定的 ' + settings.count +
        ' 张）。可以减少张数，或关闭「迷宫不重复」。'
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

  /* 换关卡等于换一整批题（也是换一种算的范围），顺手换个种子，与密码换关同一条规矩 */
  els.level.addEventListener('change', function () {
    settings = S.migongSettings.sanitize(Object.assign({}, settings, {
      level: els.level.value,
      seed: S.migongSettings.newSeed()
    }))
    refresh()
  })

  /* 重新生成：参数不变，换一批随机题——换种子即可（种子已写进网址，可复现） */
  $('btn-regen').addEventListener('click', function () {
    settings = Object.assign({}, settings, { seed: S.migongSettings.newSeed() })
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
