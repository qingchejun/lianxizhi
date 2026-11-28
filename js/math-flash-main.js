/**
 * 口算页「闪卡」页签（2026-11-28，网址 /kousuan?view=cards）：数学知识点闪卡。
 *   教材、单元和口算「按教材」是同一个设置（sumsum:kousuan:mode:v1 的 book / unit），这里改了那边也跟着变。
 *   挑卡：最近两周口算点过的错题对应的卡排最前（卡上的例子换成孩子做错的那道题）→ 这个单元的卡 → 前面单元的卡补满。
 *   只读打分记录，闪卡本身不打分、不留记录。卡的内容和挑卡在 js/math-cards.js，纸样 js/pinyin-flash.js。
 *   免费版能印一年级上册前两个单元（人教、北师大），和拼音闪卡「前 2 课」一个口径。
 * 这个页签打开时 js/main.js 什么都不做（不出口算题），整页由这里接管。
 */
;(function (root) {
  'use strict'

  var doc = root.document
  var S = root.SumSum
  var query = new URLSearchParams(root.location.search)
  if (query.get('view') !== 'cards') return

  var MC = S.mathCards
  var F = S.pinyinFlash
  var KM = S.kousuanMode
  var KT = S.kousuanTags
  var SC = S.sheetsCore
  var FL = S.fullLock
  var host = doc.getElementById('ks-cards')
  var paper = doc.getElementById('preview')
  var sumEl = doc.getElementById('work-sum')
  var printButton = doc.getElementById('btn-print')
  var PREF = 'sumsum:kousuan:cards:v1'
  var WRONG_DAYS = 14
  var FREE_UNITS = { rj1a: 2, bsd1a: 2 }

  doc.documentElement.classList.add('ks-cards-view')
  host.hidden = false
  doc.querySelectorAll('#ks-tabs [data-tab]').forEach(function (a) {
    var on = a.dataset.tab === 'cards'
    a.classList.toggle('active', on)
    if (on) a.setAttribute('aria-current', 'page')
    else a.removeAttribute('aria-current')
  })
  /* 打印按钮上的字：最后一个文字节点（前面是图标） */
  var label = Array.prototype.filter.call(printButton.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim() }).pop()
  if (label) label.textContent = '打印闪卡'

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  function today() {
    var d = new Date()
    function p(n) { return (n < 10 ? '0' : '') + n }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  }

  function signedIn() {
    var A = S.account
    return !!(A && A.state && A.state.loggedIn)
  }

  /* 最近两周口算打分时点过的错题 */
  function recentWrong() {
    if (!SC || !S.store) return []
    var since = Date.now() - WRONG_DAYS * 864e5
    var out = []
    SC.records(S.store).forEach(function (r) {
      if (r.module !== 'kousuan') return
      var at = SC.ratedAt(r)
      if (!at || at < since) return
      ;(Array.isArray(r.wrong) ? r.wrong : []).forEach(function (key) { out.push({ key: key, at: at }) })
    })
    return out
  }

  function render() {
    var mode = KM.init(S.store).mode
    var book = mode.book
    var unit = mode.unit
    var B = KT.BOOKS[book]
    var pref = (S.store && S.store.get(PREF)) || {}
    var q = new URLSearchParams(root.location.search)
    var size = (q.get('size') || pref.size) === 'l' ? 'l' : 'm'
    var per = size === 'l' ? 4 : 6
    var all = q.get('k') === 'all'
    var free = FL && !FL.isFull()
    var freeOk = function (bk, u) { return FREE_UNITS[bk] != null && u <= FREE_UNITS[bk] }
    var locked = free && (all || !freeOk(book, unit))
    var wrong = recentWrong()
    var picked = all
      ? MC.bookCards(book).map(function (c) { return { card: c, why: 'all', n: 0 } })
      : MC.pick({ book: book, unit: unit, wrong: wrong, today: today(), per: per })
    var nWrong = picked.filter(function (x) { return x.why === 'wrong' }).length
    var pages = Math.ceil(picked.length / per)
    var unitLabel = all ? B.short + ' 全套' : B.short + ' · ' + KM.shortUnit(B.units[unit][0])

    sumEl.textContent = '闪卡 · ' + unitLabel + ' · ' + picked.length + ' 张' + (pages > 1 ? ' · ' + pages + ' 页' : '')

    var bookOpts = KT.BOOK_ORDER.map(function (id) {
      return '<option value="' + id + '"' + (id === book ? ' selected' : '') + '>' + esc(KT.BOOKS[id].name) + '</option>'
    }).join('')
    var unitOpts = B.units.map(function (u, i) {
      var n = MC.unitCards(book, i).length
      return '<option value="' + i + '"' + (!all && i === unit ? ' selected' : '') + '>' + esc(u[0]) +
        (n ? '（' + n + ' 张）' : '') + (free && !freeOk(book, i) ? '（会员）' : '') + '</option>'
    }).join('') +
      '<option value="all"' + (all ? ' selected' : '') + '>这一册全套 ' + MC.bookCards(book).length + ' 张' + (free ? '（会员）' : '') + '</option>'

    var wrongHint = !signedIn()
      ? '登录后，孩子做完口算扫码点出错题，错题对应的卡会排在最前面，卡上的例子就用孩子做错的那道题。'
      : wrong.length
        ? '最近两周口算错过 ' + wrong.length + ' 道题，对应的卡排在最前面，卡上的例子就用孩子做错的那道题。'
        : '最近两周口算还没有点过错题。孩子做完口算扫码点出错题，这里就会按错题出卡。'

    host.innerHTML =
      '<div class="group-title">数学知识点闪卡</div>' +
      '<p class="hint">一张卡一个知识点：正面是题和家长念的问题，背面是答案、口诀和方法。剪下对折就能用，不用打分。</p>' +
      '<label class="field"><span>教材</span><select class="input" id="mfc-book">' + bookOpts + '</select></label>' +
      '<label class="field"><span>学校学到</span><select class="input" id="mfc-unit">' + unitOpts + '</select></label>' +
      '<p class="hint">和「出题」里按教材的进度是同一个，改一处两处都变。只出学到这个单元为止教过的内容。</p>' +
      '<p class="hint mfc-wrong-hint">' + esc(wrongHint) + '</p>' +
      '<div class="field"><span>大小</span><div class="seg-ctl" role="group" aria-label="闪卡大小">' +
        '<button type="button" data-mfc-size="m" class="' + (size === 'm' ? 'on' : '') + '">一页 6 张</button>' +
        '<button type="button" data-mfc-size="l" class="' + (size === 'l' ? 'on' : '') + '">一页 4 张大卡</button></div></div>' +
      (locked || !picked.length ? '' :
        '<div class="group-title mfc-list-title">这' + (pages > 1 ? ' ' + pages + ' 页' : '一页') + '的卡' + (nWrong ? '（' + nWrong + ' 张来自错题）' : '') + '</div>' +
        '<ol class="pfc-list">' + picked.map(function (x) {
          var badge = x.why === 'wrong' ? '<em class="is-due">错过' + (x.n > 1 ? ' ' + x.n + ' 次' : '') + (x.card.from ? ' · ' + esc(x.card.from) : '') + '</em>'
            : x.why === 'unit' ? '<em class="is-lesson">本单元</em>'
              : x.why === 'review' ? '<em>复习</em>' : ''
          return '<li><span>' + esc(x.card.title) + '</span>' + badge + '</li>'
        }).join('') + '</ol>') +
      '<div class="group-title mfc-list-title">怎么用</div><p class="hint">' + esc(F.HOW) + '打印时选「实际大小」或 100%，别选「适合页面」。</p>'

    if (locked) {
      paper.innerHTML = FL.html('数学闪卡的这部分是会员功能',
        '免费版可以印一年级上册前两个单元的闪卡试一试；会员每个单元都有，还会按孩子口算的错题出卡。')
      FL.bind(paper)
      paper.style.zoom = ''
      printButton.disabled = true
    } else if (!picked.length) {
      paper.innerHTML = '<div class="empty"><b>这个单元还没有闪卡</b><p>这是开学第一个单元，还没有要记的知识点。选下一个单元看看。</p></div>'
      paper.style.zoom = ''
      printButton.disabled = true
    } else {
      paper.innerHTML = F.sheets(picked.map(function (x) { return x.card }), { size: size, kind: 'math', title: '数学闪卡 · ' + unitLabel }).join('')
      printButton.disabled = false
      if (S.shell && S.shell.fit) S.shell.fit()
    }
  }

  function go(change) {
    var q = new URLSearchParams(root.location.search)
    Object.keys(change).forEach(function (k) {
      if (change[k] == null) q.delete(k)
      else q.set(k, change[k])
    })
    root.history.replaceState(null, '', root.location.pathname + '?' + q.toString())
    render()
  }

  function saveMode(patch) {
    var mode = Object.assign({}, KM.init(S.store).mode, patch)
    KM.saveMode(S.store, KM.cleanMode(mode, KM.readPlans(S.store)))
  }

  host.addEventListener('change', function (e) {
    var t = e.target
    if (t.id === 'mfc-book') {
      var cur = KM.init(S.store).mode
      saveMode({ book: t.value, unit: Math.min(cur.unit, KT.BOOKS[t.value].units.length - 1) })
      go({ k: null })
    } else if (t.id === 'mfc-unit') {
      if (t.value === 'all') return go({ k: 'all' })
      saveMode({ unit: Number(t.value) })
      go({ k: null })
    }
  })
  host.addEventListener('click', function (e) {
    var b = e.target.closest('[data-mfc-size]')
    if (!b) return
    S.store.set(PREF, Object.assign({}, S.store.get(PREF) || {}, { size: b.dataset.mfcSize }))
    go({ size: b.dataset.mfcSize })
  })
  printButton.addEventListener('click', function () { root.print() })
  root.addEventListener('resize', function () { if (S.shell && S.shell.fit) S.shell.fit() })
  /* 登录、开通、同步回来新的打分 → 重新挑一遍 */
  if (S.account && S.account.onChange) S.account.onChange(render)
  root.addEventListener('sumsum:rated', render)

  render()
  doc.documentElement.setAttribute('data-sumsum-ready', '1')
})(window)
