/**
 * 打分面板（2026-11-27 打分统一）：手机扫码打分页（/mark，js/mark-main.js）和各练习页右侧「打分」抽屉
 * （js/rate-drawer.js）共用同一个组件。设计稿 docs/superpowers/specs/2026-11-27-rating-kousuan-flashcards.md。
 *
 *   上面：扫的这一张 / 屏幕上这一张；
 *   中间：同一个板块里还没打分的（打印后 2 天内）；
 *   下面：这个板块的历史（60 天内的纸），点一行展开补打 / 改一下；
 *   最后（只有打分页）：其他板块还有几张没打分。
 *
 * 每张纸只有一种打法：选「全对」或点错题 → 提交（js/rate.js）。提交后：
 *   口算 / 奥数 → sheetsCore.submit（档位按错题比例自动算，改分先撤回再作用）；
 *   识字 → shiziMark.settle（规则不动）；改一下 = 先 undoSettle 再重新结算，只有今天最后打分的那张能改；
 *   拼音 → sheetsCore.pinyinResults 换成每题结果写 pinyin:mark。
 * 游戏不打分。
 */
;(function (root) {
  'use strict'

  var S = root.SumSum
  function SC() { return S.sheetsCore }
  function R() { return S.rate }

  function esc(s) { return R().esc(s) }

  function md(d) {
    var p = String(d).split('-')
    return Number(p[1]) + ' 月 ' + Number(p[2]) + ' 日'
  }

  function today() {
    if (S.sheets && S.sheets.today) return S.sheets.today()
    var d = new Date()
    var p = function (n) { return (n < 10 ? '0' : '') + n }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  }

  function load(id) {
    return SC().parse(S.store.getString(SC().keyOf(id)))
  }

  /* 识字每日卷：按日期 + 字找回那张卷（shizi-mark 的 papers）。只按日期会认错：
     同一天换过一张的卷日期一样、字不一样，打旧纸的分不能结到新卷上 */
  function shiziPaper(rec) {
    var M = S.shiziMark
    if (!M || !rec.ref || rec.ref.kind !== 'daily') return null
    var chars = (rec.items || []).map(function (it) { return it.key }).join('')
    for (var i = M.paperCount() - 1; i >= 0; i--) {
      var p = M.paperAt(i)
      if (p && p.d === rec.ref.d && Array.from(p.chars).join('') === chars) return p
    }
    return null
  }

  /* 拼音这张卷每题的结果（sumsum:pinyin:mark:v1:<卷号>:<题号>） */
  var PY_MARK = 'sumsum:pinyin:mark:v1:'
  function pinyinMarks(sheetId) {
    var out = {}
    var pre = PY_MARK + sheetId + ':'
    S.store.keys().forEach(function (k) {
      if (k.indexOf(pre) !== 0) return
      var v = S.store.get(k)
      if (v && v.result) out[k.slice(pre.length)] = v.result
    })
    return out
  }
  function pinyinSheetHere(rec) {
    return !!S.store.getString('sumsum:pinyin:sheet:v1:' + rec.ref.date + ':' + rec.ref.sheetId)
  }

  /* 拼音的老纸记录（2026-11-27 前打印的）没有题目清单 */
  function pinyinLegacy(rec) {
    return rec.module === 'pinyin' && !(rec.items && rec.items.length)
  }

  /* 打过分没有，以板块自己的数据为准：识字每日卷看那张卷 settled；拼音看这张卷有没有每题结果 */
  function withDone(rec) {
    if (rec.module === 'shizi' && rec.ref && rec.ref.kind === 'daily') {
      var p = shiziPaper(rec)
      if (p) return Object.assign({}, rec, { done: !!p.settled })
      return rec
    }
    if (rec.module === 'pinyin' && rec.ref && rec.ref.sheetId && !pinyinLegacy(rec)) {
      var mk = pinyinMarks(rec.ref.sheetId)
      var keys = Object.keys(mk)
      return Object.assign({}, rec, {
        done: keys.length > 0,
        wrong: keys.filter(function (k) { return mk[k] === 'miss' || mk[k] === 'hint' }),
        draftId: 'py-' + rec.ref.sheetId
      })
    }
    return rec
  }

  var enrichFn = null /* 拼音页给老纸记录补上题目清单（setEnrich） */
  function prep(rec) {
    if (!rec) return null
    if (enrichFn) rec = enrichFn(rec) || rec
    return withDone(rec)
  }

  function allRecords() {
    return SC().records(S.store).map(prep)
  }

  /* 某板块两天内还没打分的张数（顶栏「打分」按钮的角标） */
  function pendingCount(module) {
    return SC().pending(allRecords(), today(), module).length
  }

  /* 识字能不能改一下：只有今天最后打分的那张（下一张卷是照着它出的），而且它之后的卷还没打印 */
  function shiziEdit(rec, recs) {
    var M = S.shiziMark
    var no = '识字只能改今天最后打分的那一张：下一张卷是照着它出的。'
    if (!M) return no
    var kind = rec.ref && rec.ref.kind === 'daily' ? 'daily' : 'sheet'
    if (!M.canUndo(kind)) return no
    var latest = null
    recs.forEach(function (r) {
      if (r.module === 'shizi' && SC().isDone(r) && (!latest || (r.doneAt || 0) > (latest.doneAt || 0))) latest = r
    })
    if (!latest || latest.id !== rec.id) return no
    if (kind === 'daily' && recs.some(function (r) {
      return r.module === 'shizi' && r.ref && r.ref.kind === 'daily' && r.ref.d > rec.ref.d
    })) return '这张之后的卷已经打印了，不能再改。'
    return ''
  }

  /* ---------- 提交 ---------- */

  function submit(rec, wrong) {
    var now = Date.now()
    /* 屏幕上这张还没打印过（识字、拼音的卷是固定的，可以先做后打分）：先把纸记录存下来 */
    if (!load(rec.id) && S.sheets && S.sheets.current && S.sheets.current() && S.sheets.current().id === rec.id) {
      S.sheets.ensureSaved(true)
    }
    if (rec.module === 'kousuan' || rec.module === 'aoshu') {
      SC().submit(S.store, load(rec.id) || rec, wrong, now)
      return
    }
    if (rec.module === 'shizi') {
      var M = S.shiziMark
      if (!M) return
      /* 改一下：先整笔撤回，再按这次点的重新结算 */
      if (SC().isDone(rec)) M.undoSettle()
      var chars = (rec.items || []).map(function (it) { return it.key })
      M.clearPicks(chars)
      wrong.forEach(function (ch) { if (!M.picked(ch)) M.togglePick(ch) })
      M.settle(chars, shiziPaper(rec) || undefined)
    } else if (rec.module === 'pinyin') {
      if (!pinyinSheetHere(rec)) return
      var res = SC().pinyinResults(rec, wrong)
      var sheet = { id: rec.ref.sheetId, date: rec.ref.date }
      Object.keys(res).forEach(function (k) { S.pinyinStorage.saveMark(sheet, k, { result: res[k] }) })
      /* 同一张卷隔天重印过（纸号不同）：那几条纸记录一起标成已打分 */
      SC().records(S.store).forEach(function (r) {
        if (r.id === rec.id || r.module !== 'pinyin' || !r.ref || r.ref.sheetId !== rec.ref.sheetId) return
        S.store.set(SC().keyOf(r.id), Object.assign({}, r, { done: true, doneAt: now, wrong: wrong.slice() }))
      })
    }
    var fresh = load(rec.id)
    if (!fresh) return
    fresh.done = true
    fresh.doneAt = now
    fresh.wrong = wrong.slice()
    delete fresh.skipped
    S.store.set(SC().keyOf(rec.id), fresh)
  }

  function isParamsPlan(id) {
    var raw = S.store.get('sumsum:kousuan:plans:v1')
    var list = raw && Array.isArray(raw.plans) ? raw.plans : []
    return list.some(function (p) { return p && p.id === id && p.kind === 'params' })
  }

  /* ---------- 面板 ---------- */

  /*
   * mount(el, opts)：
   *   module：板块（打分页可以为空，由扫的那张决定）
   *   mainId：扫的那张纸号（打分页）
   *   current()：屏幕上这张（抽屉用）：已打印的纸记录，或识字 / 拼音还没打印的卷（临时记录，提交时才存）
   *   top(ctx)：打分页在最上面放提示（找不到纸、还在上传……），返回 { html, module } 或 null
   *   others：是否列出其他板块
   *   onSubmit(rec)：提交之后
   *   onRender(info)：画完之后 { module, label, total }
   */
  function mount(el, opts) {
    opts = opts || {}
    var opened = {} /* 历史里展开的纸 */
    var listIds = [] /* 列过的纸：打完分留在原位显示「已打分」，不会一点就消失 */
    var extra = {} /* 还没存的临时记录（屏幕上这张） */
    el.classList.add('mpanel')

    function find(id) {
      var r = load(id)
      if (r) return prep(r)
      return extra[id] ? prep(extra[id]) : null
    }

    function effectHTML(rec) {
      if (!SC().rated(rec)) return ''
      if (rec.module === 'kousuan') {
        /* 按教材 / 题型出题时没有「多出进位退位」这一调，只再出错题 */
        var km = S.store.get('sumsum:kousuan:mode:v1')
        var paramsPlan = !km || (km.kind === 'level' && /^p:/.test(km.pick || '') && isParamsPlan(km.pick.slice(2)))
        var nx = SC().kousuanNext(rec, paramsPlan ? S.store.get('sumsum:settings:v1') || { carryMode: 'random' } : { carryMode: 'carryonly' })
        var parts = []
        if (nx.mustInclude.length) parts.push('再出这 ' + nx.mustInclude.length + ' 道错题')
        if (nx.carryOverride) parts.push('多出进位、退位的题')
        return parts.length ? '下一张口算会' + parts.join('，') + '。' : '下一张口算照常出。'
      }
      if (rec.module === 'aoshu') {
        return (rec.units || []).map(function (u) {
          var lv = SC().levelOf(rec, u.key)
          if (!lv) return ''
          return esc(u.label) + '：' + (lv === 'good' ? '记为学会了' : lv === 'ok' ? '记为学过，过几天复习' : '还没学会，「今天」页可以再练一张')
        }).filter(Boolean).join('；') + '。'
      }
      return ''
    }

    function bodyHTML(rec, recs) {
      var kind = SC().MODULE_KIND[rec.module]
      var done = SC().isDone(rec)
      if (pinyinLegacy(rec)) {
        return done ? '<p class="rule">这张卷已经打过分了。</p>'
          : '<p class="rule">这张是 11 月 27 日改版前打印的拼音卷，纸上的题目没记下来。到电脑上的拼音页，打开这张卷再点「打分」。</p>'
      }
      if (rec.module === 'shizi' && !done && rec.ref && rec.ref.kind === 'daily' && !shiziPaper(rec)) {
        return '<p class="rule">这张每日卷在这台设备上找不到了（可能换过一张）。到识字页看看。</p>'
      }
      if (rec.module === 'pinyin' && !done && !pinyinSheetHere(rec)) {
        return '<p class="rule">这张拼音卷还没同步到这台设备。稍等一会儿刷新，或者在出卷的那台电脑上打分。</p>'
      }
      /* 识字今天已经点过的字带过来，别在这里提交时被清掉 */
      if (rec.module === 'shizi' && !done && S.shiziMark) {
        var d0 = R().draft(rec)
        var picked = S.shiziMark.pickedIn((rec.items || []).map(function (it) { return it.key }))
        if (!d0.all && !d0.wrong.length && picked.length) R().setDraft(R().keyOf(rec), { all: false, wrong: picked, editing: false })
      }
      var why = rec.module === 'shizi' && done ? shiziEdit(rec, recs) : ''
      return R().body(rec, {
        kind: kind,
        done: done,
        result: SC().resultText(rec),
        canEdit: !why,
        editHint: why,
        effect: effectHTML(rec) || (rec.module === 'shizi' ? '没认出的字会自动安排复习。' : rec.module === 'pinyin' ? '卡住的内容会安排到后面的卷里再练。' : '')
      })
    }

    function cardHTML(rec, recs, main) {
      var done = SC().isDone(rec)
      return '<section class="mcard' + (main ? ' mcard-main' : '') + '" data-card="' + esc(rec.id) + '">' +
        '<header class="mcard-head"><span class="tag">' + esc(SC().MODULE_LABEL[rec.module] || '') + '</span>' +
        '<b class="mcard-title">' + esc(rec.title) + '</b>' +
        '<span class="mcard-date">' + md(rec.date) + (done ? ' · <span class="ok">已打分</span>' : main && opts.current ? ' · 屏幕上这张' : '') + '</span></header>' +
        bodyHTML(rec, recs) + '</section>'
    }

    function histRow(rec, recs) {
      var r = SC().resultText(rec)
      var open = opened[rec.id]
      return '<li class="hrow' + (open ? ' is-open' : '') + '">' +
        '<button type="button" class="hrow-btn" data-open="' + esc(rec.id) + '" aria-expanded="' + !!open + '">' +
          '<span class="hrow-date">' + md(rec.date) + '</span><span class="hrow-title">' + esc(rec.title) + '</span>' +
          '<span class="hrow-st' + (r === '没打分' ? ' is-none' : r === '全对' ? ' is-ok' : ' is-bad') + '">' + r + '</span></button>' +
        (open ? cardHTML(rec, recs) : '') + '</li>'
    }

    function render() {
      var recs = allRecords()
      var byId = {}
      recs.forEach(function (r) { byId[r.id] = r })
      extra = {}
      var mainId = opts.mainId || ''
      var cur = !mainId && opts.current ? opts.current() : null
      if (cur) {
        mainId = cur.id
        if (!byId[cur.id]) {
          extra[cur.id] = cur
          var c = prep(cur)
          byId[cur.id] = c
          recs.push(c)
        }
      }
      var main = SC().validId(mainId) ? byId[mainId] || null : null
      var module = main ? main.module : SC().isPractice(opts.module) ? opts.module : ''
      var html = ''

      var top = opts.top ? opts.top({ main: main, mainId: mainId }) : null
      if (top) {
        html += top.html
        if ('module' in top) module = top.module
        if (top.hideMain) main = null
      }
      if (main && module && main.module !== module) main = null
      if (main) html += cardHTML(main, recs, true)
      /* 抽屉里屏幕上这张打完分，页面可能换了卷（识字出下一张）：刚打的那张留在下面「刚打过分的」里 */
      if (main && opts.current && listIds.indexOf(main.id) < 0) listIds.unshift(main.id)

      var label = SC().MODULE_LABEL[module] || ''
      if (module) {
        var pend = SC().pending(recs, today(), module).filter(function (r) { return !main || r.id !== main.id })
        pend.forEach(function (r) { if (listIds.indexOf(r.id) < 0) listIds.push(r.id) })
        var rest = listIds.map(function (id) { return byId[id] }).filter(function (r) { return r && (!main || r.id !== main.id) })
        var left = rest.filter(function (r) { return !SC().isDone(r) }).length
        if (rest.length) {
          html += '<h2 class="mark-sub">' + (left ? label + (main ? '还有' : '') + '没打分的纸 · ' + left + ' 张' : '刚打过分的') + '</h2>' +
            rest.map(function (r) { return cardHTML(r, recs) }).join('')
        } else if (!main) {
          html += '<p class="mark-all">' + label + '最近两天打印的纸都打好分了。</p>'
        }
        var shown = {}
        if (main) shown[main.id] = true
        rest.forEach(function (r) { shown[r.id] = true })
        var hist = SC().history(recs, module).filter(function (r) { return !shown[r.id] && !extra[r.id] })
        if (hist.length) {
          html += '<h2 class="mark-sub">' + label + '历史<small>60 天内打印的纸，点开可以补打分、改一下</small></h2>' +
            '<ul class="hist">' + hist.map(function (r) { return histRow(r, recs) }).join('') + '</ul>'
        }
      } else if (!mainId) {
        html += '<p class="mark-all">选一个板块打分。</p>'
      }

      if (opts.others) {
        var links = SC().PRACTICE.filter(function (m) { return m !== module }).map(function (m) {
          return { m: m, n: SC().pending(recs, today(), m).length }
        }).filter(function (o) { return o.n || !module }).map(function (o) {
          return '<a class="omod" href="/mark?module=' + o.m + '"><b>' + SC().MODULE_LABEL[o.m] + '</b>' +
            '<span>' + (o.n ? o.n + ' 张没打分' : '去看历史') + '</span></a>'
        })
        if (links.length) html += '<h2 class="mark-sub">' + (module ? '其他板块' : '板块') + '</h2><div class="omods">' + links.join('') + '</div>'
      }

      el.innerHTML = html
      var total = (main && !SC().isDone(main) ? 1 : 0) +
        (module ? SC().pending(recs, today(), module).filter(function (r) { return !main || r.id !== main.id }).length : 0)
      if (opts.onRender) opts.onRender({ module: module, label: label, total: total })
    }

    el.addEventListener('click', function (e) {
      var o = e.target.closest('[data-open]')
      if (o && el.contains(o)) {
        var id = o.getAttribute('data-open')
        opened[id] = !opened[id]
        render()
        return
      }
      var hit = false
      R().click(e, {
        load: find,
        submit: function (rec, wrong) {
          submit(rec, wrong)
          hit = rec
        },
        render: render
      })
      if (hit && opts.onSubmit) opts.onSubmit(hit)
    })

    return {
      render: render,
      /* 抽屉重新打开：收起历史、忘掉上次列过的纸 */
      reset: function () { opened = {}; listIds = [] }
    }
  }

  S.markPanel = {
    mount: mount,
    pendingCount: pendingCount,
    setEnrich: function (fn) { enrichFn = typeof fn === 'function' ? fn : null },
    shiziEdit: shiziEdit,
    submit: submit
  }
})(window)
