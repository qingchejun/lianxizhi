/**
 * 奥数页交互：表单 ↔ 设置对象双向同步、按知识点动态渲染变式勾选、
 * 重新生成 / 打印。任何参数变化都会自动重新生成并渲染（所见即所得）。
 */
(function (root) {
  'use strict'

  var doc = root.document
  var S = root.SumSum

  function $(id) {
    return doc.getElementById(id)
  }

  var els = {
    difficulty: $('f-difficulty'),
    count: $('f-count'),
    lessonpage: $('f-lessonpage'),
    practice: $('f-practice'),
    anspage: $('f-anspage'),
    review: $('f-review'),
    title: $('f-title')
  }

  /* 单课内页（2026-11-24 起：/kousuan/coushifa 凑十法，免登录、免费版都能用）：
     html 上 data-aoshu-fixed="知识点 id"，只出这一课；目录、综合复习收起；设置单独存，不动奥数页的。
     data-aoshu-preset：第一次打开时的题型勾选（JSON），之后按家长自己改的记着 */
  var FIXED = doc.documentElement.getAttribute('data-aoshu-fixed') || ''
  /* 同一课可以开几个内页（凑十法、破十法都是第 02 课）：data-aoshu-key 区分各页自己的设置 */
  if (FIXED) S.aoshu.settings.useKey('sumsum:aoshu:fixed:' + (doc.documentElement.getAttribute('data-aoshu-key') || FIXED) + ':v1')
  var firstFixed = FIXED && !S.aoshu.settings.hasStored()
  var settings = S.aoshu.settings.load()
  if (FIXED) {
    var preset = {}
    try { preset = firstFixed ? JSON.parse(doc.documentElement.getAttribute('data-aoshu-preset') || '{}') : {} } catch (e) { preset = {} }
    settings = S.aoshu.settings.sanitize(Object.assign({}, settings, preset, { topic: FIXED, review: false }))
  }

  /* 前三课公开（2026-11-25 站长定）：没登录、免费版只能出公开的几课，后面的课在目录里挂锁，点了说明怎么开通；
     综合复习卷要混好几课，也只给会员。服务器只认 /aoshu 整页放行，锁哪几课由这里管（视频另由 functions/v 把关） */
  var LOGGED_IN = !!root.__SUMSUM_PLAN
  var FULL = root.__SUMSUM_PLAN === 'full'
  var FREE_IDS = S.aoshu.FREE || []
  function isOpen(id) {
    return FULL || !!FIXED || FREE_IDS.indexOf(id) >= 0
  }
  /* 试看（2026-11-25）：会员的课，免费版、没登录的人也能点开看——讲解页看全，练习只露前两道、解析只露第 1 题，不能打印。
     打开页面时不自动落在试看课上（上次看的是试看课就回第 01 课）；点目录、点「接着学」、打开带课号的网址才进试看 */
  var TRIAL_KEEP = 2
  if (!isOpen(settings.topic)) {
    var askedByUrl = new URLSearchParams(root.location.search).get('topic') === settings.topic
    if (!askedByUrl || !S.aoshu.topics[settings.topic]) {
      settings = S.aoshu.settings.sanitize(Object.assign({}, settings, { topic: FREE_IDS[0], title: '' }))
    }
  }
  if (!FULL && !FIXED) {
    var legend = doc.querySelector('.topic-legend')
    if (legend) legend.insertAdjacentHTML('afterend', '<p class="topic-legend topic-legend-lock"><svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/></svg>= 会员，点开可以试看</p>')
  }
  function inTrial(s) {
    return !s.review && !isOpen(s.topic)
  }
  if (!FULL && settings.review) settings = S.aoshu.settings.sanitize(Object.assign({}, settings, { review: false }))
  var reviewGroup = doc.querySelector('[data-review-group]')
  if (!FULL && !FIXED && reviewGroup) reviewGroup.style.display = 'none'


  /*
   * 「已学」标记：与设置分开存（不进 URL），value 是知识点 id 数组。
   * 用户可能跳着学，交互是清单式：目录每一行自带圆点，点圆点直接切换
   * 已学状态（不用先切换过去），点课名才是选中知识点。顶栏「标记为已学」管当前这一课。
   */
  var LEARNED_KEY = 'sumsum:aoshu:learned:v1'

  function loadLearned() {
    try {
      var arr = JSON.parse(root.localStorage.getItem(LEARNED_KEY))
      return new Set(Array.isArray(arr) ? arr : [])
    } catch (e) {
      return new Set()
    }
  }

  function saveLearned(set) {
    try {
      root.SumSum.store.set(LEARNED_KEY, Array.from(set))
    } catch (e) {
      /* 隐私模式下写入失败可忽略 */
    }
  }

  var learned = loadLearned()

  /*
   * 复习卷范围（settings.reviewTopics）和「已学」是两回事：已学记进度，范围决定这张卷混哪几课。
   * 老用户以前的复习卷就是按已学出的，第一次没有范围记录时拿已学的课垫底，打开后看到的卷子不变；
   * 之后两边各管各的。
   */
  function hasSavedScope() {
    try {
      if (new URLSearchParams(root.location.search).has('reviewTopics')) return true
      var stored = JSON.parse(root.localStorage.getItem('sumsum:aoshu:v1'))
      return !!stored && Object.prototype.hasOwnProperty.call(stored, 'reviewTopics')
    } catch (e) {
      return false
    }
  }
  if (!hasSavedScope()) {
    settings = S.aoshu.settings.sanitize(
      Object.assign({}, settings, { reviewTopics: Array.from(learned).join(',') })
    )
  }

  /*
   * 知识点目录：L1/L2 页签 + 按大纲一行一课的列表。
   * viewStage 是纯浏览状态（看哪个页签），与当前选中的知识点无关；
   * 未实现的知识点（OUTLINE 里有、topics 里没有）渲染为灰色不可点。
   */
  var viewStage = (S.aoshu.topics[settings.topic] || { stage: 'L1' }).stage

  /* 点课名 = 去上这一课：复习卷开着也直接退出（勾的混哪几课保留），哪怕点的就是原来那一课 */
  function selectTopic(id) {
    if (FIXED && id !== FIXED) return
    if (id === settings.topic && !settings.review) return
    settings = S.aoshu.settings.sanitize(
      Object.assign({}, settings, { topic: id, title: '', review: false })
    )
    refresh()
  }

  function toggleLearned(id) {
    if (learned.has(id)) learned.delete(id)
    else learned.add(id)
    saveLearned(learned)
    renderCatalog() // 只刷目录和顶栏按钮，不重新生成题目
    paintLearnedBtn()
  }

  function outlineOf(id) {
    return S.aoshu.OUTLINE.filter(function (o) {
      return o.id === id
    })[0]
  }

  var CAM_SVG =
    '<svg class="cam" viewBox="0 0 24 24" aria-label="有讲解视频"><rect x="3" y="6" width="13" height="12" rx="2"/>' +
    '<path d="M16 10l5-3v10l-5-3z"/></svg>'
  var LOCK_SVG = '<svg class="lock" viewBox="0 0 24 24" aria-label="会员"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/></svg>'
  var TICK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>'

  /* 目录文字全来自大纲常量（OUTLINE），没有用户输入，可以直接拼 HTML */
  function renderCatalog() {
    var wrap = $('topic-list')
    wrap.innerHTML = S.aoshu.OUTLINE.filter(function (o) {
      return o.stage === viewStage
    }).map(function (o) {
      var done = learned.has(o.id)
      var ready = !!S.aoshu.topics[o.id]
      var shut = ready && !isOpen(o.id)
      var cls = 'tp' + (done ? ' done' : '') + (shut ? ' shut' : '') + (ready && o.id === settings.topic && !settings.review ? ' cur' : '')
      var dot = ready && !shut
        ? '<button type="button" class="tp-dot" data-learn="' + o.id + '" title="' +
          (done ? '取消「已学」标记' : '标为已学') + '" aria-pressed="' + done + '">' + TICK_SVG + '</button>'
        : '<span class="tp-dot" aria-hidden="true"></span>'
      var name = '<span class="no">' + o.no + '</span><span class="nm">' + o.name + '</span>' +
        (S.aoshuVideos.of(o.id) ? CAM_SVG : '') + (shut ? LOCK_SVG : '')
      var btn = ready
        ? '<button type="button" class="tp-name" data-pick="' + o.id + '">' + name + '</button>'
        : '<button type="button" class="tp-name" disabled title="还没做好，敬请期待">' + name + '</button>'
      return '<div class="' + cls + '">' + dot + btn + '</div>'
    }).join('')

    /* 已学进度：只数大纲里有的，老数据里残留的 id 不算 */
    var total = S.aoshu.OUTLINE.length
    var n = S.aoshu.OUTLINE.filter(function (o) {
      return learned.has(o.id)
    }).length
    $('learned-n').textContent = '已学 ' + n + ' / ' + total
    $('learned-bar').style.width = (n / total) * 100 + '%'

    Array.prototype.forEach.call(doc.querySelectorAll('.stage-tab'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-stage') === viewStage)
    })
    renderNextHint()
  }

  /* 点圆点：只标已学；点课名：切换知识点。委托绑一次，目录重绘不用重绑 */
  $('topic-list').addEventListener('click', function (ev) {
    var learn = ev.target.closest('[data-learn]')
    if (learn) return toggleLearned(learn.getAttribute('data-learn'))
    var pick = ev.target.closest('[data-pick]')
    if (pick) selectTopic(pick.getAttribute('data-pick'))
  })

  /* 顶栏：当前这一课的「标记为已学」。综合复习卷不是某一课，藏起来 */
  function paintLearnedBtn() {
    var b = $('btn-learned')
    b.hidden = settings.review || inTrial(settings)
    var on = learned.has(settings.topic)
    b.classList.toggle('on', on)
    b.setAttribute('aria-pressed', String(on))
    b.querySelector('.txt').textContent = on ? '已学 ✓' : '标记为已学'
  }

  $('btn-learned').addEventListener('click', function () {
    toggleLearned(settings.topic)
  })

  /* 「接着学」：按大纲顺序指向第一个还没标已学的知识点，省得自己翻目录 */
  function renderNextHint() {
    var btn = $('btn-next')
    var next = S.aoshu.OUTLINE.filter(function (o) {
      return S.aoshu.topics[o.id] && !learned.has(o.id)
    })[0]
    if (!next || (next.id === settings.topic && !settings.review)) {
      btn.hidden = true
      return
    }
    btn.hidden = false
    btn.textContent = '接着学 → ' + next.no + ' ' + next.name + (isOpen(next.id) ? (S.aoshuVideos.of(next.id) ? '（有视频）' : '') : '（试看）')
    btn.onclick = function () {
      if (settings.review) {
        settings = S.aoshu.settings.sanitize(Object.assign({}, settings, { review: false }))
        if (next.id === settings.topic) return refresh()
      }
      selectTopic(next.id)
    }
  }

  /* ---------- 复习卷范围：混哪几课 ---------- */

  function scopeIds(s) {
    return s.reviewTopics ? s.reviewTopics.split(',') : []
  }

  function setScope(ids) {
    settings = S.aoshu.settings.sanitize(Object.assign({}, settings, { reviewTopics: ids.join(',') }))
    refresh()
  }

  /* 勾选清单按 L1 / L2 分两组；课名来自大纲常量，没有用户输入，可以直接拼 HTML */
  function renderScope(s) {
    var box = $('review-scope')
    box.hidden = !s.review
    if (!s.review) return
    var on = {}
    scopeIds(s).forEach(function (id) {
      on[id] = 1
    })
    var ready = S.aoshu.OUTLINE.filter(function (o) {
      return S.aoshu.topics[o.id]
    })
    var html = ''
    var STAGE_NAME = { L1: 'L1', L1B: 'L1 补充', L2: 'L2' }
    ;['L1', 'L1B', 'L2'].forEach(function (stage) {
      var rows = ready.filter(function (o) {
        return o.stage === stage
      })
      if (!rows.length) return
      html += '<div class="scope-stage">' + STAGE_NAME[stage] + '</div>' + rows.map(function (o) {
        return '<label class="tick"><input type="checkbox" data-scope="' + o.id + '"' +
          (on[o.id] ? ' checked' : '') + ' /><span><span class="scope-no">' + o.no + '</span>' +
          o.name + '</span></label>'
      }).join('')
    })
    $('scope-list').innerHTML = html
    var n = scopeIds(s).length
    $('scope-n').textContent = n ? '已选 ' + n + ' 课' : '还没选'
  }

  $('scope-list').addEventListener('change', function (ev) {
    var box = ev.target.closest('[data-scope]')
    if (!box) return
    var ids = scopeIds(settings).filter(function (id) {
      return id !== box.getAttribute('data-scope')
    })
    if (box.checked) ids.push(box.getAttribute('data-scope'))
    setScope(ids) // sanitize 会按大纲顺序重排
  })

  $('review-scope').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-scope-act]')
    if (!b) return
    var act = b.getAttribute('data-scope-act')
    if (act === 'learned') setScope(learnedIds())
    else if (act === 'none') setScope([])
  })

  Array.prototype.forEach.call(doc.querySelectorAll('.stage-tab'), function (b) {
    b.addEventListener('click', function () {
      viewStage = b.getAttribute('data-stage')
      renderCatalog()
    })
  })

  /* 变式勾选区：由当前知识点的 variants 动态渲染，checkbox 对应设置字段 */
  var variantEls = {}
  var builtTopicId = null
  function buildVariantList(topic) {
    builtTopicId = topic.id
    var wrap = $('variant-list')
    wrap.innerHTML = ''
    variantEls = {}
    topic.variants.forEach(function (v) {
      var label = doc.createElement('label')
      label.className = 'tick'
      var box = doc.createElement('input')
      box.type = 'checkbox'
      var span = doc.createElement('span')
      span.textContent = v.label
      label.appendChild(box)
      label.appendChild(span)
      wrap.appendChild(label)
      box.addEventListener('change', onFormChange)
      variantEls[v.setting] = box
    })
  }

  function fillForm(s) {
    els.difficulty.value = s.difficulty
    els.count.value = s.count
    els.lessonpage.checked = s.lessonPage
    els.practice.checked = s.practicePage
    els.anspage.checked = s.answerPage
    els.review.checked = s.review
    els.title.value = s.title
    Object.keys(variantEls).forEach(function (k) {
      variantEls[k].checked = s[k]
    })
    /* 综合复习卷跨多个知识点，单个知识点的题型勾选与讲解页都不适用 */
    $('group-variants').hidden = s.review
    $('tick-lesson').hidden = s.review
  }

  /* 在当前 settings 上覆盖表单值——只覆盖当前知识点的勾选框，别的知识点的变式选择保持不动 */
  function readForm() {
    var raw = Object.assign({}, settings, {
      difficulty: els.difficulty.value,
      count: els.count.value,
      lessonPage: els.lessonpage.checked,
      practicePage: els.practice.checked,
      answerPage: els.anspage.checked,
      review: els.review.checked,
      title: els.title.value.trim()
    })
    Object.keys(variantEls).forEach(function (k) {
      raw[k] = variantEls[k].checked
    })
    return S.aoshu.settings.sanitize(raw)
  }

  /* 纸张区放不下一整张 A4 时整体缩小（见 js/shell.js 的 fit） */
  function fitPreview() {
    S.shell.fit()
  }

  /* ---------- 讲解视频 ---------- */

  /*
   * 小窗在设置区最上面；「放大播放」把同一个 <video> 所在的盒子铺满屏幕（CSS 的 .is-big），
   * 不换元素，所以放大、收起时进度和播放状态都不丢。
   * 只在换课时重建：refresh() 会被改难度、改题量触发，每次重建会把正在播的视频打断。
   */
  var videoFor = null

  function durText(dur) {
    var p = dur.split(':')
    return Number(p[0]) + ' 分 ' + Number(p[1]) + ' 秒'
  }

  function setBig(on) {
    var box = $('video-box')
    if (!box) return
    box.classList.toggle('is-big', on)
    doc.body.classList.toggle('video-big', on)
  }

  function renderVideo(s) {
    var group = $('video-group')
    var vid = group.querySelector('video')
    if (s.review) {
      /* 复习卷混了好几课，没有讲解视频：留一行说明和回到原来那一课的按钮，别让视频凭空消失 */
      if (vid) vid.pause()
      videoFor = null
      var back = outlineOf(s.topic)
      group.innerHTML = '<p class="video-none">' + CAM_SVG + '复习卷混了好几课，没有讲解视频。</p>' +
        (back ? '<button type="button" class="btn btn-sm video-back" data-act="back">回到第 ' + back.no + ' 课' +
          (S.aoshuVideos.of(s.topic) ? '（有视频）' : '') + '</button>' : '')
      return
    }
    if (videoFor === s.topic) return
    videoFor = s.topic
    if (vid) vid.pause()
    var v = S.aoshuVideos.of(s.topic)
    var o = outlineOf(s.topic)
    if (!v) {
      group.hidden = !!FIXED /* 单课内页没有视频就整块不显示 */
      group.innerHTML = '<p class="video-none">' + CAM_SVG + '这一课还没有讲解视频</p>'
      return
    }
    group.hidden = false
    if (!isOpen(s.topic)) {
      /* 试看：视频只给会员（服务器 functions/v 也拦着），这里放封面和时长 */
      group.innerHTML =
        '<div class="row-between"><div class="group-title">讲解视频</div>' +
          '<span class="lbl">' + durText(v.dur) + ' · 会员可看</span></div>' +
        '<div class="video-locked">' + (v.poster ? '<img src="' + v.poster + '" alt="" loading="lazy">' : '') +
          '<span>' + LOCK_SVG + '第 ' + o.no + ' 课讲解视频 · 开通会员后可看</span></div>'
      return
    }
    /* 文字来自大纲常量和视频登记表，没有用户输入 */
    group.innerHTML =
      '<div class="row-between"><div class="group-title">讲解视频</div>' +
        '<span class="lbl">' + durText(v.dur) + ' · 只在屏幕播放</span></div>' +
      '<div class="video-box" id="video-box">' +
        '<div class="video-top"><span>第 ' + o.no + ' 课 · ' + o.name + ' · 讲解视频</span>' +
          '<button type="button" class="btn" data-act="small">收起（Esc）</button></div>' +
        '<video controls preload="metadata" playsinline' + (v.poster ? ' poster="' + v.poster + '"' : '') + ' src="' + v.src + '"></video>' +
        '<p class="video-foot">视频只在屏幕上播放，不会打印。</p>' +
      '</div>' +
      '<button type="button" class="btn btn-sm" data-act="big">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>' +
        '放大播放（给孩子看）</button>'
  }

  $('video-group').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act]')
    if (!b) return
    if (b.getAttribute('data-act') === 'back') return selectTopic(settings.topic)
    setBig(b.getAttribute('data-act') === 'big')
  })

  doc.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && doc.body.classList.contains('video-big')) setBig(false)
  })

  /* 顶栏：第几课叫什么、这一沓纸由哪几部分组成 */
  function paintHead(s, pages) {
    var o = outlineOf(s.topic)
    /* 单课内页、没登录时（搜索引擎看到的就是这样）H1 用网页里写死的；课名放进顶栏小字 */
    var lessonName = s.review ? '综合复习卷' : '第 ' + o.no + ' 课 · ' + o.name
    if (!FIXED && LOGGED_IN) $('lesson-title').textContent = lessonName
    var parts = []
    if (pages.lesson) parts.push('讲解 ' + pages.lesson + ' 页')
    if (pages.practice) parts.push('练习 ' + pages.practice + ' 页')
    if (pages.answer) parts.push('解析 ' + pages.answer + ' 页')
    S.shell.summary(!FIXED && !LOGGED_IN ? [lessonName, parts.join(' + ')] : [parts.join(' + ')])
    paintLearnedBtn()
  }

  /* 已学且已实现的知识点，按大纲顺序 */
  function learnedIds() {
    return S.aoshu.OUTLINE.filter(function (o) {
      return learned.has(o.id) && S.aoshu.topics[o.id]
    }).map(function (o) {
      return o.id
    })
  }

  /*
   * 综合复习卷：从勾选范围里的知识点轮着抽题。每道题都走对应知识点自己的
   * 生成器（题型勾选、难度档都沿用），所以解析、图示一切照旧；
   * 额外记下知识点名字，解析页上标出来，方便家长知道这题在考什么。
   */
  /*
   * 综合复习卷：先用 planReview 排好每道题出自哪一课（5 道一组、每课至少 1 道、多的给最新的课），
   * 再按课出题。同一组里同一课要 2 道时一次出 2 道，走单课出题的轮题型规则，两道不会是同一种题型。
   */
  function generateReview(s) {
    var ids = scopeIds(s)
    if (!ids.length) return { questions: [], shortfall: s.count, noTopics: true }
    var U = S.aoshu.util
    var plan = U.planReview(ids, s.count)
    var out = []
    var seen = {}

    function labelOf(id) {
      var entry = S.aoshu.OUTLINE.filter(function (o) {
        return o.id === id
      })[0]
      return entry.no + ' ' + entry.name
    }

    /* 从某一课出 n 道全卷没出过的题；出不够就返回几道算几道 */
    function draw(id, n) {
      var got = []
      for (var t = 0; t < 6 && got.length < n; t++) {
        var sub = S.aoshu.settings.sanitize(Object.assign({}, s, { topic: id, count: n + t, review: false }))
        S.aoshu.topics[id].generate(sub).questions.forEach(function (q) {
          var k = id + '#' + q.key
          if (got.length < n && !seen[k]) {
            seen[k] = 1
            got.push(Object.assign({}, q, { topicLabel: labelOf(id), topicId: id }))
          }
        })
      }
      return got
    }

    for (var g = 0; g < plan.length; g += U.GROUP) {
      var slots = plan.slice(g, g + U.GROUP)
      var need = {}
      slots.forEach(function (id) {
        need[id] = (need[id] || 0) + 1
      })
      var pool = {}
      Object.keys(need).forEach(function (id) {
        pool[id] = draw(id, need[id])
      })
      slots.forEach(function (id) {
        var q = pool[id].shift()
        /* 这一课的题出完了（题库小），换一课顶上，不缺题 */
        for (var j = 0; !q && j < ids.length; j++) q = draw(ids[(ids.indexOf(id) + j + 1) % ids.length], 1)[0]
        if (q) out.push(q)
      })
    }
    return { questions: out, shortfall: s.count - out.length, topicCount: ids.length }
  }

  var firstPaint = true

  /* 扫码登记：练习页第一页印二维码，打印时记下这张。单课 → 这一课一个打分单位；
     复习卷 → 每课一个；题目按所属课登记，点错的题让那一课进「待复习」 */
  function topicLabel(id) {
    var entry = S.aoshu.OUTLINE.filter(function (o) { return o.id === id })[0]
    return entry ? entry.no + ' ' + entry.name : id
  }

  function registerSheet(s, topic, result, seed) {
    if (!S.sheets || !s.practicePage || !result.questions.length || inTrial(s)) return
    var units = []
    var items = result.questions.map(function (q, i) {
      var tid = s.review ? q.topicId : topic.id
      if (tid && !units.some(function (u) { return u.key === tid })) {
        units.push({ key: tid, label: topicLabel(tid) })
      }
      return { key: String(i + 1), label: '第 ' + (i + 1) + ' 题', unit: tid }
    }).filter(function (it) { return !!it.unit }) /* 不知道属于哪课的题点了也没地方记，不列出来 */
    S.sheets.use({
      module: 'aoshu',
      title: s.title || (s.review ? '综合复习' : topicLabel(topic.id)),
      idParts: JSON.stringify([s, seed, result.questions.length, items.map(function (it) { return it.unit })]),
      units: units,
      items: items,
      ref: { review: !!s.review }
    })
  }

  /* ---------- 试看条：纸张上方说明 + 两种开通方式 ---------- */
  var PRINT_HTML = $('btn-print').innerHTML
  var WANT_KEY = 'zhihebi:lk-want' /* 跟会员说明页同一个记号：弹框里注册完回来自动登记 */
  var trialTracked = {}
  function isGuest() {
    var A = S.account
    return !(A && A.state && A.state.loggedIn) && !LOGGED_IN
  }
  function wantCall(method) {
    return root.fetch('/api/auth/want', method === 'POST'
      ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{"want":true}' }
      : { credentials: 'same-origin' }).then(function (r) { return r.json() })
  }
  var wantEmail = ''
  function wantDone(email) {
    wantEmail = email
    var b = doc.querySelector('[data-trial-want]')
    var m = doc.querySelector('[data-trial-want-msg]')
    if (b) { b.disabled = true; b.textContent = '已登记' }
    if (m) { m.textContent = '付费开通上线那天，发邮件到 ' + email + ' 告诉你。'; m.hidden = false }
  }
  function wantRecord() {
    var m = doc.querySelector('[data-trial-want-msg]')
    wantCall('POST').then(function (d) {
      if (d && d.ok && d.wanted) return wantDone(d.email)
      if (m) { m.textContent = (d && d.error) || '没登记上，稍后再试一次。'; m.hidden = false }
    }).catch(function () {
      if (m) { m.textContent = '网络不太好，没登记上，稍后再试一次。'; m.hidden = false }
    })
  }
  var wantChecked = false
  function buildTrialBar(o) {
    var bar = $('trial-bar')
    if (!bar) {
      bar = doc.createElement('div')
      bar.id = 'trial-bar'
      bar.className = 'trial-bar'
      $('preview').parentNode.insertBefore(bar, $('preview'))
      bar.addEventListener('click', function (ev) {
        if (ev.target.closest('[data-trial-want]')) {
          if (isGuest()) {
            try { root.sessionStorage.setItem(WANT_KEY, '1') } catch (e) { /* 忽略 */ }
            if (S.accountUI && S.accountUI.open) S.accountUI.open('register', '注册一个免费账号，付费开通上线那天发邮件告诉你。')
          } else wantRecord()
        }
        if (ev.target.closest('[data-trial-login]') && S.accountUI && S.accountUI.open) S.accountUI.open('register', '先注册或登录，再填邀请码开通会员。')
      })
    }
    var guest = isGuest()
    var key = o.id + (guest ? ':g' : ':u')
    if (bar.getAttribute('data-key') === key) return /* 改难度、换一批不重画，别把填了一半的邀请码冲掉 */
    bar.setAttribute('data-key', key)
    /* 文字来自大纲常量，没有用户输入 */
    bar.innerHTML =
      '<div class="trial-head"><b>第 ' + o.no + ' 课「' + o.name + '」是会员内容，现在是试看</b>' +
        '<p>讲解页能看全；练习题只显示前 ' + TRIAL_KEEP + ' 道，解析只显示第 1 题。开通会员后，54 课都能整课打印，带讲解视频。</p></div>' +
      '<div class="trial-ways">' +
        '<div class="trial-way"><span>朋友给了邀请码</span>' +
          (guest
            ? '<button type="button" class="btn" data-trial-login>注册 / 登录后填码</button>'
            : '<form class="redeem-form" data-redeem novalidate><input class="input input-code" type="text" name="invite" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="9" placeholder="如 K7M2-QF9W" aria-label="邀请码">' +
              '<button type="submit" class="btn btn-primary">开通会员</button><p class="redeem-msg" data-redeem-msg role="alert" hidden></p></form>') +
        '</div>' +
        (S.pay && S.pay.on()
          /* 2026-11-28 付费开通上线（js/pay.js） */
          ? '<div class="trial-way" data-pay-scope><span>付费开通 · ' + S.pay.label() + '</span>' +
            '<button type="button" class="btn btn-primary" data-pay-buy>开通会员</button>' +
            '<p class="lk-want-msg" data-pay-msg role="status" hidden></p></div>'
          : '<div class="trial-way"><span>付费开通 2027 年 1 月上线</span>' +
            '<button type="button" class="btn" data-trial-want>' + (guest ? '注册，开通时通知我' : '开通时通知我') + '</button>' +
            '<p class="lk-want-msg" data-trial-want-msg role="status" hidden></p></div>') +
      '</div>'
    if (guest || (S.pay && S.pay.on())) return
    if (wantEmail) return wantDone(wantEmail)
    if (wantChecked) return
    wantChecked = true
    var pending = false
    try { pending = root.sessionStorage.getItem(WANT_KEY) === '1'; root.sessionStorage.removeItem(WANT_KEY) } catch (e) { /* 忽略 */ }
    if (pending) wantRecord()
    else wantCall('GET').then(function (d) { if (d && d.ok && d.wanted) wantDone(d.email) }).catch(function () {})
  }
  function paintTrial(s) {
    var trial = inTrial(s)
    doc.documentElement.classList.toggle('aoshu-trial', trial)
    var bar = $('trial-bar')
    if (trial) buildTrialBar(outlineOf(s.topic))
    else if (bar) bar.remove()
    var pb = $('btn-print')
    var label = trial ? '开通会员' : '打印'
    if (pb.textContent !== label) {
      if (trial) pb.textContent = label
      else pb.innerHTML = PRINT_HTML
    }
    pb.title = trial ? '这一课是会员内容，试看不能打印' : ''
    var mark = $('btn-mark')
    if (mark) mark.hidden = trial
    /* 记一笔试看了哪一课（访问统计的自定义事件，只记课号，不记账号）：12-08 定收费时看家长最常点开哪几课 */
    if (trial && !trialTracked[s.topic]) {
      trialTracked[s.topic] = 1
      try { if (root.rybbit && root.rybbit.event) root.rybbit.event('aoshu_trial', { lesson: outlineOf(s.topic).no }) } catch (e) { /* 统计没加载就算了 */ }
    }
  }
  /* 在弹框里注册、登录完（页面不刷新）：会员直接刷新；免费版把试看条换成登录后的样子 */
  doc.addEventListener('DOMContentLoaded', function () {
    var A = S.account
    if (!A || !A.onChange) return
    A.onChange(function () {
      if (!A.state.loggedIn) return
      if (A.state.plan === 'full' && !FULL) { root.location.reload(); return }
      if (inTrial(settings)) buildTrialBar(outlineOf(settings.topic))
    })
  })

  /* 主流程：保存设置 → 同步表单 → 生成题目 → 渲染练习纸 */
  function refresh() {
    var trial = inTrial(settings)
    if (!trial) S.aoshu.settings.save(settings)
    else {
      /* 试看课不存进设置（下次打开回到能打印的课），网址带上课号，刷新、转发都还是这一课的试看 */
      try { root.history.replaceState(null, '', root.location.pathname + '?topic=' + encodeURIComponent(settings.topic)) } catch (e) { /* 忽略 */ }
    }
    var topic = S.aoshu.topics[settings.topic]
    var switched = builtTopicId !== topic.id
    if (switched) {
      buildVariantList(topic) // 切换知识点时重建变式勾选区
      viewStage = topic.stage // 并把目录页签切到该知识点所在阶段
    }
    renderCatalog()
    /* 从「今天」或「接着学」跳过来时，当前这一课可能在目录下半截，滚到看得见 */
    var cur = (switched || firstPaint) && doc.querySelector('#topic-list .tp.cur')
    if (cur) cur.scrollIntoView({ block: 'nearest' })
    firstPaint = false
    fillForm(settings)

    /* 出题走种子账本：同课同设置给同一个种子（走开再回来题目不变），
       改了影响题目的设置或点「重新生成」才滚新种子（见 js/aoshu-batch.js） */
    var batch = S.aoshu.batch
    var seed = batch.seedFor(batch.keyOf(settings), batch.sigOf(settings))
    var result = S.aoshu.util.withSeed(seed, function () {
      return settings.review ? generateReview(settings) : topic.generate(settings)
    })
    var pages = S.aoshu.render.render($('preview'), settings, result.questions, {
      review: settings.review,
      topicCount: result.topicCount,
      trial: trial ? TRIAL_KEEP : 0
    })
    fitPreview()
    registerSheet(settings, topic, result, seed)
    renderVideo(settings)
    renderScope(settings)
    paintHead(settings, pages)
    paintTrial(settings)

    var notice = $('notice')
    if (result.noTopics) {
      notice.textContent =
        '综合复习卷还没选要混哪几课。在右边「综合复习」下面勾几课就能出题了。'
      notice.hidden = false
    } else if (result.shortfall > 0) {
      notice.textContent = settings.review
        ? '选的这几课凑不出这么多不重复的题（只有 ' + result.questions.length +
          ' 道）。可以减少题量，或在右边多勾几课。'
        : '当前参数下不重复的题目只有 ' + result.questions.length +
          ' 道（少于设定的 ' + settings.count +
          ' 道）。可以减少题量、提高难度档，或多勾选几种题型。'
      notice.hidden = false
    } else {
      notice.hidden = true
    }
  }

  function onFormChange() {
    settings = readForm()
    refresh()
  }

  Object.keys(els).forEach(function (k) {
    els[k].addEventListener('change', onFormChange)
  })

  buildVariantList(S.aoshu.topics[settings.topic])

  /* 重新生成：参数不变也要换一批——滚新种子再刷新 */
  $('btn-regen').addEventListener('click', function () {
    var batch = S.aoshu.batch
    batch.roll(batch.keyOf(settings), batch.sigOf(settings))
    refresh()
  })

  $('btn-print').addEventListener('click', function () {
    if (inTrial(settings)) {
      var bar = $('trial-bar')
      if (bar) { bar.scrollIntoView({ block: 'nearest' }); bar.classList.remove('flash'); void bar.offsetWidth; bar.classList.add('flash') }
      return
    }
    root.print()
  })

  root.addEventListener('resize', fitPreview)

  /* 页面隔天未刷新直接打印（含浏览器菜单打印）时，日期仍保证是当天 */
  root.addEventListener('beforeprint', S.render.refreshDates)

  refresh()

  /* 完工标记：上面任何一步抛错都到不了这里；HTML 里的防护脚本据此判断并提示 */
  document.documentElement.setAttribute('data-sumsum-ready', '1')
})(window)
