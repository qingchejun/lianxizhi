/**
 * 页面交互：表单 ↔ 设置对象双向同步、按模式显隐控件、重新生成 / 打印。任何参数变化都会自动重新生成并渲染（所见即所得）。
 *
 * 2026-11-28 出题方式：右栏最上面「按教材 / 按难度」（js/kousuan-mode.js 管状态，js/kousuan-tags.js 出题）。
 *   按教材、难度预设、挑题型存的难度 → kousuan-tags；「按数的范围」存的难度（老用户的「我原来的设置」）→ 原来的 generator，
 *   这时才露出「出什么题」那一组和几个只对它有用的选项（data-params）。
 */
(function (root) {
  'use strict'

  var doc = root.document
  var S = root.SumSum


  function $(id) {
    return doc.getElementById(id)
  }

  var els = {
    mode: $('f-mode'),
    min: $('f-min'),
    max: $('f-max'),
    mulmin: $('f-mulmin'),
    mulmax: $('f-mulmax'),
    carry: $('f-carry'),
    count: $('f-count'),
    columns: $('f-columns'),
    blank: $('f-blank'),
    paper: $('f-paper'),
    nonneg: $('f-nonneg'),
    exactdiv: $('f-exactdiv'),
    parens: $('f-parens'),
    skiptrivial: $('f-skiptrivial'),
    nodup: $('f-nodup'),
    anspage: $('f-anspage'),
    stephint: $('f-stephint'),
    title: $('f-title')
  }

  /* 顶栏「附答案页」（2026-11-25）：和右边「更多选项」里的「打印时附答案页」是同一个设置，勾哪一处两处都跟着变 */
  var headAns = $('h-anspage')

  var settings = S.settings.load()

  var KM = S.kousuanMode
  var KT = S.kousuanTags
  var boot = KM.init(S.store)
  var mode = boot.mode
  var plans = boot.plans
  var shared = null /* 别人分享的「挑题型」难度（网址 src=tg:…），只在这次打开里用，不存 */
  ;(function () {
    var q = new URLSearchParams(root.location.search)
    if (q.get('src')) return applySrc(q.get('src'))
    /* 改版前分享的链接（网址里是出题参数）：照原样出，不改自己的选择 */
    var old = KM.PARAM_KEYS.some(function (k) { return q.has(k) })
    if (!old) return
    shared = { id: 'share', name: '分享来的设置', kind: 'params', s: KM.pickParams(settings) }
    plans = plans.concat([shared])
    mode = Object.assign({}, mode, { kind: 'level', pick: 'p:share' })
  })()

  /* 网址里的出题方式：book:rj1b:3 / lv:as3[:b][:c] / tg:add20c.sub20b[:b]（分享的链接打开就是同一张卷子） */
  function applySrc(src) {
    var p = String(src || '').split(':')
    if (p[0] === 'book' && KT.BOOKS[p[1]]) {
      mode = KM.cleanMode(Object.assign({}, mode, { kind: 'book', book: p[1], unit: Number(p[2]) }), plans)
    } else if (p[0] === 'lv' && KT.parseLevel(p[1])) {
      mode = KM.cleanMode(Object.assign({}, mode, { kind: 'level', pick: p[1], blankMid: p.indexOf('b') > 1, chain: p.indexOf('c') > 1 }), plans)
    } else if (p[0] === 'tg') {
      var tags = String(p[1] || '').split('.').filter(function (t) { return KT.TAGS[t] })
      if (!tags.length) return
      shared = { id: 'share', name: '分享来的难度', kind: 'tags', tags: tags, blankMid: p.indexOf('b') > 1 }
      plans = plans.concat([shared])
      mode = Object.assign({}, mode, { kind: 'level', pick: 'p:share' })
    }
  }

  function srcOf(r) {
    if (mode.kind === 'book') return 'book:' + mode.book + ':' + mode.unit
    var plan = KM.planOf(mode, plans)
    if (plan && plan.kind === 'tags') return 'tg:' + plan.tags.join('.') + (plan.blankMid ? ':b' : '')
    if (plan) return ''
    return 'lv:' + mode.pick + (mode.blankMid ? ':b' : '') + (mode.chain && /^as/.test(mode.pick) ? ':c' : '')
  }

  function storePlans() {
    KM.savePlans(S.store, plans.filter(function (p) { return p !== shared }))
  }
  var bootJSON = JSON.stringify(mode)
  function storeMode() {
    if (KM.planOf(mode, plans) === shared && shared) return /* 分享来的难度不覆盖自己的选择 */
    if (!boot.saved && JSON.stringify(mode) === bootJSON) return /* 新用户还没动过：默认值不存（见 kousuan-mode init） */
    boot.saved = true
    KM.saveMode(S.store, mode)
  }

  function fillForm(s) {
    els.mode.value = s.mode
    els.min.value = s.min
    els.max.value = s.max
    els.mulmin.value = s.mulMin
    els.mulmax.value = s.mulMax
    els.carry.value = s.carryMode
    els.count.value = s.count
    els.columns.value = String(s.columns)
    els.blank.value = s.blankMode
    els.paper.value = s.paper
    els.nonneg.checked = !s.allowNegative // 勾选「不出负数」= 不允许负数
    els.exactdiv.checked = s.exactDivision
    els.parens.checked = s.parens
    els.skiptrivial.checked = s.skipTrivial
    els.nodup.checked = s.noDuplicates
    els.anspage.checked = s.answerPage
    if (headAns) headAns.checked = s.answerPage
    els.stephint.checked = s.stepHint
    els.title.value = s.title
  }

  /*
   * sanitize 会把不可行的范围钳回可行域（如加法要求 2×min ≤ max），
   * 钳完的值又被 fillForm 写回输入框——用户看到数字自己变了却不知为何。
   * 这里记下这一次改写，refresh() 会在提示条里说明原因。
   */
  var rangeNote = ''
  var lastTouched = '' // 'min' / 'max'：用户刚改的那个值优先保住，调另一个

  function hasAdd(mode) {
    return mode === 'add' || mode === 'addsub' || mode === 'addsubmul' || mode === 'mixed'
  }

  /* 含加法的模式要求 2×min ≤ max，其余只要求 max > min */
  function neededMax(mode, min) {
    return hasAdd(mode) ? min * 2 : min + 1
  }

  function readForm() {
    var typedMin = Number(els.min.value)
    var typedMax = Number(els.max.value)
    var rawMax = els.max.value
    /*
     * 用户刚调大最小值时，别把它钳回去——那样他刚输入的数字会凭空消失，
     * 而且再去改最大值也救不回来。这里改为顺势把最大值抬到可行域。
     */
    if (
      lastTouched === 'min' &&
      Number.isFinite(typedMin) &&
      Number.isFinite(typedMax)
    ) {
      var need = neededMax(els.mode.value, typedMin)
      if (typedMax < need) rawMax = String(Math.min(10000, need))
    }
    var clean = S.settings.sanitize({
      mode: els.mode.value,
      min: els.min.value,
      max: rawMax,
      mulMin: els.mulmin.value,
      mulMax: els.mulmax.value,
      carryMode: els.carry.value,
      count: els.count.value,
      columns: els.columns.value,
      blankMode: els.blank.value,
      paper: els.paper.value,
      allowNegative: !els.nonneg.checked,
      exactDivision: els.exactdiv.checked,
      parens: els.parens.checked,
      skipTrivial: els.skiptrivial.checked,
      noDuplicates: els.nodup.checked,
      answerPage: els.anspage.checked,
      stepHint: els.stephint.checked,
      seed: settings.seed, // 种子不是表单项，改参数时沿用，只有「重新生成」才换
      title: els.title.value.trim()
    })
    rangeNote = ''
    var why = hasAdd(els.mode.value)
      ? '加法要求两个加数都不小于最小值、和又不超过最大值，所以最小值最多是最大值的一半'
      : '最大值必须大于最小值'
    if (Number.isFinite(typedMin) && Number.isFinite(typedMax)) {
      if (clean.max !== typedMax) {
        rangeNote =
          '为了让最小值 ' + clean.min + ' 生效，最大值已自动调到 ' +
          clean.max + '（' + why + '）。'
      } else if (clean.min !== typedMin) {
        rangeNote =
          '最小值已从 ' + typedMin + ' 改成 ' + clean.min + '：' + why + '。'
      }
    }
    return clean
  }

  /* 按当前模式显隐相关控件（HTML 中用 data-show / data-show-inline 标注适用模式） */
  function updateVisibility(m, paramsOn) {
    var nodes = doc.querySelectorAll('[data-show], [data-show-inline]')
    Array.prototype.forEach.call(nodes, function (el) {
      var attr = el.getAttribute('data-show') || el.getAttribute('data-show-inline')
      el.hidden = attr.split(' ').indexOf(m) < 0 || (el.hasAttribute('data-params') && !paramsOn)
    })
    Array.prototype.forEach.call(doc.querySelectorAll('[data-params]:not([data-show]):not([data-show-inline])'), function (el) {
      el.hidden = !paramsOn
    })
    $('grp-what').hidden = !paramsOn
  }

  /* 切换纸张方向时改写 @page 规则，打印方向随之变化 */
  function updatePageStyle(paper) {
    $('page-style').textContent = '@page { size: A4 ' + paper + '; margin: 15mm; }'
  }

  /* 纸张区放不下一整张 A4 时整体缩小（见 js/shell.js 的 fit） */
  function fitPreview() {
    S.shell.fit()
  }

  /*
   * 屏幕外壳上跟着设置变的几处：预设按钮高亮、「更多选项」开了几项、顶栏摘要。
   * 「更多选项」默认折叠，所以要在标题上写明开着几项 —— 否则家长不知道里面有没有开着的开关。
   */
  function paintShell(s, r) {
    var on = Array.prototype.filter.call(doc.querySelectorAll('#more-opts .check'), function (label) {
      return !label.hidden && label.querySelector('input').checked
    }).length
    $('more-count').textContent = '· 已开 ' + on + ' 项'
    S.shell.summary([r.label, r.engine === 'params' ? S.settings.MODE_LABELS[s.mode] : '', s.count + ' 题', s.columns + ' 列'])
  }

  /* 四则运算里含 × 或 ÷ 的题目占比，用来判断卷面是不是退化成了纯加减 */
  function mulDivShare(questions) {
    if (!questions.length) return 1
    var hit = questions.filter(function (q) {
      return q.tokens.some(function (t) {
        return t === '×' || t === '÷'
      })
    }).length
    return hit / questions.length
  }

  /* 主流程：保存设置 → 同步表单与显隐 → 生成题目 → 渲染练习纸 */
  function refresh() {
    var r = KM.resolve(mode, plans)
    var paramsOn = r.engine === 'params'
    if (paramsOn) settings = S.settings.sanitize(Object.assign({}, settings, r.params, { seed: settings.seed }))
    S.settings.save(settings)
    saveUrl(r)
    storeMode()
    fillForm(settings)
    paintSource(r)
    updateVisibility(settings.mode, paramsOn)
    updatePageStyle(settings.paper)

    /* 扫码打分：上一张点过的错题、整张「不会」→ 只作用于这一张（不改设置），见 sheets-core kousuanNext */
    var SC = S.sheetsCore
    var last = SC && S.store ? SC.lastRatedUnused(SC.records(S.store), 'kousuan') : null
    var result, used, title
    if (paramsOn) {
      var adjust = SC ? SC.kousuanNext(last, settings) : null
      used = adjust ? Object.assign({}, settings, adjust) : settings
      result = S.generator.generate(used)
      title = settings.title || S.generator.titleFor(settings)
    } else {
      var must = SC ? SC.kousuanNext(last, { carryMode: 'carryonly' }).mustInclude : []
      used = { src: srcOf(r) || r.label, seed: settings.seed, count: settings.count, must: must }
      result = KT.generate({ weights: r.weights, count: settings.count, seed: settings.seed, blankMid: r.blankMid, mustInclude: must })
      title = settings.title || r.title
    }
    S.render.render($('preview'), Object.assign({}, settings, { title: title }), result.questions)
    if (S.sheets) {
      S.sheets.use({
        module: 'kousuan',
        title: title,
        idParts: JSON.stringify(used),
        units: [{ key: 'all', label: '整张' }],
        items: SC.kousuanItems(result.questions),
        ref: { preset: r.preset || '' }
      })
    }
    fitPreview()
    paintShell(settings, r)

    var notice = $('notice')
    /* 折行的格子由 render.fitSheet 打上 .q-wrap：算式没被裁掉，但版面挤 */
    var wrapped = $('preview').querySelectorAll('.q-wrap').length
    if (!paramsOn && !Object.keys(r.weights).length) {
      notice.textContent = mode.kind === 'book'
        ? '学到这里还没有学过加减法，选后面一点的单元，或者换「按难度」。'
        : '这套难度还没勾题型：在右边「我的难度」下面至少勾一种。'
      notice.hidden = false
    } else if (rangeNote) {
      notice.textContent = rangeNote
      notice.hidden = false
    } else if (result.shortfall > 0 && paramsOn) {
      notice.textContent =
        '当前参数下不重复的题目只有 ' + result.questions.length +
        ' 道（少于设定的 ' + settings.count +
        ' 道）。可以减少题量、扩大数值范围，或关闭「题目不重复」' +
        (settings.skipTrivial ? '、「跳过送分题」' : '') + '。'
      notice.hidden = false
    } else if (settings.mode === 'mixed' && mulDivShare(result.questions) < 0.15) {
      /* 乘除操作数太大时，乘积超出「数值范围」会被整题否掉，卷面会退化成纯加减 */
      notice.textContent =
        '这批题里乘除法很少——「乘除数范围」相对「数值范围」偏大，乘出来的数超过了结果上限。' +
        '把数值范围的最大值调大，或把乘除数范围调小，乘除题就会多起来。'
      notice.hidden = false
    } else if (wrapped > 0) {
      notice.textContent =
        '有 ' + wrapped + ' 道题的算式一行放不下，已自动折行（内容完整，不会被裁掉）。' +
        '想让版面更清爽，可以把列数改少一点。'
      notice.hidden = false
    } else {
      notice.hidden = true
    }
  }

  function onFormChange() {
    settings = readForm()
    if (headAns) headAns.checked = settings.answerPage
    /* 选的是「按数的范围」存的难度：改了参数就存回这套难度 */
    var plan = KM.planOf(mode, plans)
    if (plan && plan.kind === 'params') {
      plan.s = KM.pickParams(settings)
      storePlans()
    }
    refresh()
  }

  if (headAns) headAns.addEventListener('change', function () {
    els.anspage.checked = headAns.checked
    lastTouched = ''
    onFormChange()
  })

  Object.keys(els).forEach(function (k) {
    els[k].addEventListener('change', function () {
      lastTouched = k === 'min' || k === 'max' ? k : ''
      onFormChange()
    })
  })

  /* ---------- 出题方式（按教材 / 按难度）---------- */

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  /* settings.save 已经把参数写进网址；按教材 / 题型出题时参数没用，换成 src，分享出去打开是同一张 */
  function saveUrl(r) {
    try {
      var params = new URLSearchParams(root.location.search)
      if (r.engine === 'params') {
        params.delete('src')
      } else {
        KM.PARAM_KEYS.forEach(function (k) { params.delete(k) })
        var src = srcOf(r)
        if (src) params.set('src', src)
        else params.delete('src')
      }
      var qs = params.toString()
      root.history.replaceState(null, '', qs ? '?' + qs : root.location.pathname)
    } catch (e) { /* file:// 下改不了网址，忽略 */ }
  }

  function tagList(tags) {
    return '（' + tags.map(function (t) { return KT.tagLabel(t) }).join('、') + '）'
  }

  function fillBookSelects() {
    var bs = $('k-book')
    if (!bs.options.length) {
      bs.innerHTML = KT.BOOK_ORDER.map(function (k) {
        return '<option value="' + k + '">' + esc(KT.BOOKS[k].name) + '</option>'
      }).join('')
    }
    bs.value = mode.book
    var us = $('k-unit')
    if (us.dataset.book !== mode.book) {
      us.innerHTML = KT.BOOKS[mode.book].units.map(function (u, i) {
        return '<option value="' + i + '">' + esc(u[0]) + '</option>'
      }).join('')
      us.dataset.book = mode.book
    }
    us.value = String(mode.unit)
  }

  function bookHint() {
    var u = KT.BOOKS[mode.book].units[mode.unit]
    var all = KT.learnedTags(mode.book, mode.unit)
    var before = all.filter(function (t) { return u[1].indexOf(t) < 0 })
    var h
    if (!all.length) h = '学到这里还没学过加减法。'
    else if (u[1].length && before.length) h = '纸上约六成是这个单元的' + tagList(u[1]) + '，约四成复习之前学过的 ' + before.length + ' 种题。'
    else if (u[1].length) h = '纸上都是这个单元的' + tagList(u[1]) + '。'
    else h = '这个单元没有计算，纸上复习之前学过的' + tagList(all) + '。'
    h += '只出课本已经教过的，不超纲。'
    if (boot.first) h += '<br><b>先把「学校学到」改成孩子现在的进度。</b>'
    return h
  }

  function levelsHTML() {
    return ['as', 'mul', 'div'].map(function (g) {
      var btns = [1, 2, 3, 4, 5].map(function (n) {
        var id = KT.levelId(g, n)
        return '<button type="button" class="ks-lv' + (mode.pick === id ? ' on' : '') + '" data-lv="' + id + '" title="' +
          esc(KT.levelName(id)) + '" aria-pressed="' + (mode.pick === id) + '">' + n + '</button>'
      }).join('')
      return '<div class="ks-lv-row"><span>' + KT.GROUP_LABEL[g] + '</span>' + btns + '</div>'
    }).join('')
  }

  function mineHTML() {
    var chips = plans.map(function (p) {
      var on = mode.pick === 'p:' + p.id
      return '<button type="button" class="ks-chip' + (on ? ' on' : '') + '" data-plan="' + esc(p.id) + '" aria-pressed="' + on + '">' + esc(p.name) + '</button>'
    }).join('')
    var full = plans.filter(function (p) { return p !== shared }).length >= KM.PLAN_MAX
    return chips +
      '<button type="button" class="ks-chip ks-add" data-new="tags"' + (full ? ' disabled' : '') + ' title="照现在选的难度复制一份，再勾题型">＋ 挑题型</button>' +
      '<button type="button" class="ks-chip ks-add" data-new="params"' + (full ? ' disabled' : '') + ' title="自己选加减乘除、数从几到几、进位退位">＋ 自己设范围</button>'
  }

  function editHTML(plan) {
    var name = '<label class="field"><span>名字</span><input type="text" class="input" id="k-pname" maxlength="20" value="' + esc(plan.name) + '" /></label>'
    var act = '<div class="ks-edit-act"><button type="button" class="btn btn-sm" data-act="copy">复制一份</button>' +
      (plan.id === KM.DEFAULT_ID ? '' : '<button type="button" class="btn btn-sm btn-danger" data-act="del">删除</button>') + '</div>'
    if (plan === shared) {
      return '<p class="hint">这是别人分享的' + (plan.kind === 'tags' ? '难度：' + tagList(plan.tags) : '设置，在下面「出什么题」里能看到') + '。</p>' +
        '<div class="ks-edit-act"><button type="button" class="btn btn-sm" data-act="keep">存成我的难度</button></div>'
    }
    if (plan.kind === 'params') {
      /* 「出什么题」那组控件挪进这里（见 paintSource），名字、范围、复制删除在一处 */
      return name + '<p class="hint">选算什么、数从几到几、进位退位，改了自动存进「' + esc(plan.name) + '」。</p>' +
        '<div id="k-what-slot"></div>' + act
    }
    var groups = ['as', 'mul', 'div'].map(function (g) {
      var boxes = KT.ORDER.filter(function (t) { return KT.tagGroup(t) === g }).map(function (t) {
        var on = plan.tags.indexOf(t) >= 0
        return '<label class="check"><input type="checkbox" data-tag="' + t + '"' + (on ? ' checked' : '') + ' /><span>' + esc(KT.tagLabel(t)) + '</span></label>'
      }).join('')
      return '<div class="ks-tags-h">' + KT.GROUP_LABEL[g] + '</div><div class="ks-tags">' + boxes + '</div>'
    }).join('')
    return name + '<p class="hint">勾上要出的题型，每种题量差不多；勾了连加连减，它合占一半。</p>' + groups +
      '<label class="check"><input type="checkbox" id="k-pblank"' + (plan.blankMid ? ' checked' : '') + ' /><span>空在中间（如 8 + □ = 15）</span></label>' + act
  }

  var editingId = ''
  /* 「出什么题」原来的位置：不选「自己设范围」的难度时放回去（藏着） */
  var whatHome = doc.createComment('grp-what')
  $('grp-what').parentNode.insertBefore(whatHome, $('grp-what'))
  function paintSource(r) {
    $('k-kind').value = mode.kind
    var book = mode.kind === 'book'
    $('k-book-box').hidden = !book
    $('k-level-box').hidden = book
    if (book) {
      fillBookSelects()
      $('k-book-hint').innerHTML = bookHint()
      return
    }
    var plan = KM.planOf(mode, plans)
    $('k-levels').innerHTML = levelsHTML()
    var lv = KT.parseLevel(mode.pick)
    $('k-level-hint').innerHTML = lv
      ? esc(KT.levelName(mode.pick)) + '。出：' + KT.levelPlan(mode.pick).tags.map(function (t) { return esc(KT.tagLabel(t)) }).join('、') + '。'
      : '用的是「' + esc(plan ? plan.name : '') + '」，在下面改。'
    $('k-level-opts').hidden = !lv
    $('k-chain-row').hidden = !lv || lv.group !== 'as'
    $('k-blankmid').checked = mode.blankMid
    $('k-chain').checked = mode.chain
    $('k-mine').innerHTML = mineHTML()
    var box = $('k-edit')
    box.hidden = !plan
    /* 正在打名字时不重画编辑区，免得光标跳走 */
    var what = $('grp-what')
    if (plan && (editingId !== plan.id || !box.innerHTML)) {
      if (box.contains(what)) whatHome.parentNode.insertBefore(what, whatHome)
      box.innerHTML = editHTML(plan)
    }
    editingId = plan ? plan.id : ''
    var slot = $('k-what-slot')
    if (plan && plan.kind === 'params' && slot && !slot.contains(what)) slot.appendChild(what)
  }

  function pick(id) {
    mode = Object.assign({}, mode, { kind: 'level', pick: id })
    editingId = ''
    refresh()
  }

  $('k-kind').addEventListener('change', function () {
    mode = Object.assign({}, mode, { kind: $('k-kind').value })
    refresh()
  })
  $('k-book').addEventListener('change', function () {
    var b = $('k-book').value
    /* 换册：同出版社上下册之间换，下册从第一单元算，上册算整册学过 */
    mode = KM.cleanMode(Object.assign({}, mode, { book: b, unit: KT.BOOKS[b].prev ? 0 : KT.BOOKS[b].units.length - 1 }), plans)
    boot.first = false
    refresh()
  })
  $('k-unit').addEventListener('change', function () {
    mode = Object.assign({}, mode, { unit: Number($('k-unit').value) })
    boot.first = false
    refresh()
  })
  $('k-blankmid').addEventListener('change', function () {
    mode = Object.assign({}, mode, { blankMid: $('k-blankmid').checked })
    refresh()
  })
  $('k-chain').addEventListener('change', function () {
    mode = Object.assign({}, mode, { chain: $('k-chain').checked })
    refresh()
  })
  $('k-levels').addEventListener('click', function (e) {
    var b = e.target.closest('[data-lv]')
    if (b) pick(b.getAttribute('data-lv'))
  })

  function addPlan(plan) {
    plans = plans.filter(function (p) { return p !== shared }).concat([plan])
    shared = null
    storePlans()
    pick('p:' + plan.id)
  }

  function nextName() {
    var n = 1
    while (plans.some(function (p) { return p.name === '我的难度 ' + n })) n++
    return '我的难度 ' + n
  }

  $('k-mine').addEventListener('click', function (e) {
    var b = e.target.closest('button')
    if (!b || b.disabled) return
    if (b.hasAttribute('data-plan')) return pick('p:' + b.getAttribute('data-plan'))
    var kind = b.getAttribute('data-new')
    var id = KM.newId(plans)
    if (kind === 'params') return addPlan({ id: id, name: nextName(), kind: 'params', s: KM.pickParams(settings) })
    var cur = KM.planOf(mode, plans)
    var tags = cur && cur.kind === 'tags' ? cur.tags.slice()
      : KT.parseLevel(mode.pick) ? KT.levelPlan(mode.pick, mode.chain).tags : ['add20c', 'sub20b']
    addPlan({ id: id, name: nextName(), kind: 'tags', tags: tags, blankMid: cur ? !!cur.blankMid : mode.blankMid })
  })

  $('k-edit').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]')
    if (!b) return
    var plan = KM.planOf(mode, plans)
    if (!plan) return
    var act = b.getAttribute('data-act')
    if (act === 'del') {
      if (!root.confirm('删掉「' + plan.name + '」？')) return
      plans = plans.filter(function (p) { return p !== plan })
      storePlans()
      pick('p:' + KM.DEFAULT_ID)
    } else if (act === 'copy' || act === 'keep') {
      var copy = JSON.parse(JSON.stringify(plan))
      copy.id = KM.newId(plans)
      copy.name = act === 'keep' ? nextName() : (plan.name + ' 副本').slice(0, 20)
      addPlan(copy)
    }
  })

  $('k-edit').addEventListener('change', function (e) {
    var plan = KM.planOf(mode, plans)
    if (!plan || plan === shared) return
    var t = e.target
    if (t.id === 'k-pname') {
      plan.name = t.value.trim().slice(0, 20) || plan.name
    } else if (t.id === 'k-pblank') {
      plan.blankMid = t.checked
    } else if (t.hasAttribute('data-tag')) {
      var tag = t.getAttribute('data-tag')
      plan.tags = plan.tags.filter(function (x) { return x !== tag })
      if (t.checked) plan.tags.push(tag)
      plan.tags = KT.ORDER.filter(function (x) { return plan.tags.indexOf(x) >= 0 })
    } else {
      return
    }
    storePlans()
    refresh()
  })

  /* 重新生成：参数不变，换一批随机题——换种子即可（种子已写进网址，可复现） */
  $('btn-regen').addEventListener('click', function () {
    settings = Object.assign({}, settings, { seed: S.settings.newSeed() })
    refresh()
  })

  $('btn-print').addEventListener('click', function () {
    root.print()
  })

  root.addEventListener('resize', fitPreview)

  /* 页面隔天未刷新直接打印（含浏览器菜单打印）时，日期仍保证是当天 */
  root.addEventListener('beforeprint', S.render.refreshDates)

  refresh()

  /* 完工标记：上面任何一步抛错都到不了这里；HTML 里的防护脚本据此判断并提示 */
  document.documentElement.setAttribute('data-sumsum-ready', '1')
})(window)
