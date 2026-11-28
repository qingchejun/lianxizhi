/**
 * 孩子档案（2026-11-28 站长定）：年级、学期、各科课本版本设一次，口算、数学知识点、识字、写字都照这个出。
 *
 *   sumsum:profile:v1   { v: 1, cur: 0, kids: [{ grade: 1, term: 'a' | 'b', math: 'rj' | 'bsd' }] }
 *     kids 是数组、cur 指当前孩子：现在一个账号一个孩子，以后做多孩子切换不用改存储格式。
 *     语文全国统编，一年级五四制和六三制课本逐页相同（见 js/shizi-rj-data.js 文件头），所以不问。
 *   sumsum:progress-at:v1  { math: 时间戳, yuwen: 时间戳 }：家长最后一次改「学到哪」的时间，
 *     「今天」页据此提醒「数学还在第三单元吗？」（三周没动过）。
 *
 * 两层分开：课本版本一年才换一次 → 放档案；学到第几单元每周都变 → 留在各页面，一个学科共用一份
 * （数学：sumsum:kousuan:mode:v1 的 book / unit，口算「按教材」和数学知识点共用；语文：sumsum:shizi:v1 的 book / lesson / xieBook）。
 * 档案只是默认值：识字还能选某恩等课本外的字表；分享来的口算链接（?src=）照链接里的课本出。
 *
 * 老用户不弹框：本机口算已经在「按教材」出题的，按它推出档案直接存下（infer）。
 * 新用户在跟课本走的页面第一次打开时弹一次；点「以后再说」这次打开浏览器期间不再弹。
 * 都存在 sumsum:* 键里，登录后跟着账号同步（js/store.js、js/sync.js）。无 DOM 的部分 node 下由 tools/check-profile.js 校验。
 */
;(function (root) {
  'use strict'

  var KEY = 'sumsum:profile:v1'
  var AT_KEY = 'sumsum:progress-at:v1'
  var MODE_KEY = 'sumsum:kousuan:mode:v1'
  var SHIZI_KEY = 'sumsum:shizi:v1'
  var LATER_KEY = 'sumsum-profile-later' /* sessionStorage，不同步 */
  var STALE_DAYS = 21

  var GRADES = [[1, '一年级']] /* 二年级 2027-09 前做齐，到时候加一行 */
  var TERMS = [['a', '上学期', '上册'], ['b', '下学期', '下册']]
  var MATH = [['rj', '人教版'], ['bsd', '北师大版']]

  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v) }
  function label(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i][0] === id) return list[i][1]
    return ''
  }
  function gradeName(g) { return label(GRADES, g) }
  function termBook(t) { return t === 'b' ? '下册' : '上册' }

  function clean(k) {
    if (!isObj(k)) return null
    var grade = GRADES.some(function (g) { return g[0] === Number(k.grade) }) ? Number(k.grade) : null
    var term = k.term === 'a' || k.term === 'b' ? k.term : null
    var math = k.math === 'rj' || k.math === 'bsd' ? k.math : null
    if (!grade || !term || !math) return null
    return { grade: grade, term: term, math: math }
  }

  function get(store) {
    var raw = store && store.get(KEY)
    if (!isObj(raw) || !Array.isArray(raw.kids)) return null
    var cur = Number(raw.cur) || 0
    return clean(raw.kids[cur] || raw.kids[0])
  }

  function save(store, kid) {
    var k = clean(kid)
    if (!k) return null
    var raw = store.get(KEY)
    var out = isObj(raw) && Array.isArray(raw.kids) ? { v: 1, cur: Number(raw.cur) || 0, kids: raw.kids.slice() } : { v: 1, cur: 0, kids: [] }
    out.kids[out.cur] = k
    store.set(KEY, out)
    return k
  }

  /* 课本编号：和 js/kousuan-tags.js、js/shizi-rj-data.js 的 BOOKS 一致（rj1a = 人教 / 统编一上） */
  function mathBook(k) { return k ? k.math + k.grade + k.term : '' }
  function yuwenBook(k) { return k ? 'rj' + k.grade + k.term : '' }
  function mathName(k) { return k ? label(MATH, k.math) + gradeName(k.grade) + termBook(k.term) : '' }
  function yuwenName(k) { return k ? '统编版' + gradeName(k.grade) + termBook(k.term) : '' }
  function summary(k) { return k ? gradeName(k.grade) + label(TERMS, k.term) + ' · 数学' + label(MATH, k.math) : '' }

  var BOOK_RE = /^(rj|bsd)(\d)([ab])$/

  /* 老用户：本机口算已经按教材出题 → 推出档案。推不全返回 null（要问）；hint 是推出来的半截，给弹框预填 */
  function infer(store) {
    var mode = store.get(MODE_KEY)
    var sz = store.get(SHIZI_KEY)
    var m = isObj(mode) && mode.kind === 'book' && BOOK_RE.exec(String(mode.book || ''))
    var y = isObj(sz) && /^rj\d[ab]$/.test(String(sz.book || '')) && BOOK_RE.exec(sz.book)
    /* 数学和识字的学期对不上（数学一上、识字已经一下）：不悄悄定，弹框问（预填数学课本），
       免得照数学定成上学期、把识字写字的进度改回上册（2026-11-28 复审） */
    if (m && y && (y[2] !== m[2] || y[3] !== m[3])) return { kid: null, hint: { grade: Number(m[2]), term: null, math: m[1] } }
    if (m) return { kid: clean({ grade: Number(m[2]), term: m[3], math: m[1] }), hint: null }
    var hint = y ? { grade: Number(y[2]), term: y[3] } : null
    return { kid: null, hint: hint }
  }

  /* 档案定了（或改了）→ 改各学科的课本：只换课本，不碰别的设置。
     progress：{ mathUnit, yuwenLesson }，弹框里顺手选了「学到哪」就带上 */
  function apply(store, kid, progress) {
    var k = clean(kid)
    if (!k) return
    progress = progress || {}
    var mb = mathBook(k)
    var mode = store.get(MODE_KEY)
    if (isObj(mode) || progress.mathUnit != null) {
      var next = Object.assign({}, isObj(mode) ? mode : { kind: 'level' })
      if (next.book !== mb) {
        next.book = mb
        delete next.unit /* 换了课本：单元由 js/kousuan-mode.js cleanMode 按月份重猜 */
      }
      if (progress.mathUnit != null) next.unit = Number(progress.mathUnit)
      store.set(MODE_KEY, next)
    }
    var yb = yuwenBook(k)
    var sz = store.get(SHIZI_KEY)
    if (isObj(sz) || progress.yuwenLesson != null) {
      var s = Object.assign({}, isObj(sz) ? sz : {})
      /* 认字：用课本字表（或还没选过）才跟档案走；用某恩的不动 */
      if (!s.book || /^rj\d[ab]$/.test(String(s.book))) {
        if (s.book !== yb) {
          s.book = yb
          s.lesson = /b$/.test(yb) ? 1 : 0 /* 同 js/shizi-main.js readForm：下册从第 1 课，上册默认整册学完 */
        }
        if (progress.yuwenLesson != null) s.lesson = Number(progress.yuwenLesson)
      }
      /* 写字一律跟档案的课本 */
      if (s.xieBook !== yb) {
        s.xieBook = yb
        s.xieLesson = 0
      }
      store.set(SHIZI_KEY, s)
    }
    if (progress.mathUnit != null) touch(store, 'math')
    if (progress.yuwenLesson != null) touch(store, 'yuwen')
  }

  function touch(store, subject, now) {
    var raw = store.get(AT_KEY)
    var out = Object.assign({}, isObj(raw) ? raw : {})
    out[subject] = now || Date.now()
    store.set(AT_KEY, out)
  }

  /* 「今天」页提醒：哪些学科的「学到哪」三周没改了。没记录过的从现在算起（只记一下，不提醒） */
  function stale(store, now) {
    now = now || Date.now()
    var k = get(store)
    if (!k) return []
    var at = store.get(AT_KEY)
    at = isObj(at) ? at : {}
    var out = []
    var mode = store.get(MODE_KEY)
    if (isObj(mode) && mode.kind === 'book') {
      if (!at.math) touch(store, 'math', now)
      else if (now - at.math > STALE_DAYS * 864e5) out.push('math')
    }
    var sz = store.get(SHIZI_KEY)
    if (isObj(sz) && /^rj\d[ab]$/.test(String(sz.book || ''))) {
      if (!at.yuwen) touch(store, 'yuwen', now)
      else if (now - at.yuwen > STALE_DAYS * 864e5) out.push('yuwen')
    }
    return out
  }

  /* ---------------- 弹框（只在浏览器里） ---------------- */

  var doc = root.document

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  function seg(name, list, on) {
    return '<div class="seg-ctl" role="group" data-pf="' + name + '">' + list.map(function (x) {
      return '<button type="button" data-v="' + x[0] + '" class="' + (String(x[0]) === String(on) ? 'on' : '') + '">' + x[1] + '</button>'
    }).join('') + '</div>'
  }

  /* 数学「学到哪」：页面上加载了 js/kousuan-tags.js 才有单元表 */
  function mathUnits(k) {
    var KT = root.SumSum && root.SumSum.kousuanTags
    var b = KT && KT.BOOKS[mathBook(k)]
    return b ? b.units.map(function (u, i) { return [i, u[0]] }) : null
  }
  /* 语文「学到哪」：页面上加载了 js/shizi-core.js 才有课表 */
  function yuwenLessons(k) {
    var Z = root.SumSum && root.SumSum.shizi
    if (!Z || !Z.lessonsOf || !Z.hasBook || !Z.hasBook(yuwenBook(k))) return null
    return Z.lessonsOf(yuwenBook(k)).map(function (l) { return [l.i, Z.lessonLabel(l)] })
  }
  function progressSelect(id, list, cur) {
    return '<select class="input" id="' + id + '"><option value="">先不选</option>' + list.map(function (x) {
      return '<option value="' + x[0] + '"' + (cur != null && String(cur) === String(x[0]) ? ' selected' : '') + '>' + esc(x[1]) + '</option>'
    }).join('') + '</select>'
  }

  var openDlg = null

  /*
   * 打开档案弹框。返回 Promise：保存了 → 档案；关掉 / 以后再说 → null。
   * opts.first：第一次弹（文案不同，「以后再说」这次浏览器会话不再弹）；opts.ask：'math' / 'yuwen' 显示对应的「学到哪」。
   */
  function open(opts) {
    opts = opts || {}
    var S = root.SumSum
    var store = S.store
    if (openDlg) openDlg.close()
    var cur = get(store) || (opts.hint ? Object.assign({ grade: 1, term: null, math: null }, opts.hint) : { grade: 1, term: null, math: null })
    var state = { grade: cur.grade || 1, term: cur.term, math: cur.math }
    var mode = store.get(MODE_KEY)
    var sz = store.get(SHIZI_KEY)

    return new Promise(function (resolve) {
      var dlg = doc.createElement('dialog')
      dlg.className = 'account-dialog profile-dialog'
      dlg.setAttribute('aria-labelledby', 'profile-title')
      openDlg = dlg
      var done = false
      function finish(v) {
        if (done) return
        done = true
        openDlg = null
        if (dlg.open) dlg.close()
        dlg.remove()
        resolve(v)
      }

      function body() {
        var ready = clean(state)
        var ask = ''
        if (ready && opts.ask === 'math') {
          var us = mathUnits(ready)
          var mu = isObj(mode) && mode.book === mathBook(ready) ? mode.unit : null
          if (us) ask = '<label class="auth-field"><span>数学学到</span>' + progressSelect('pf-unit', us, mu) +
            '<small>学校现在讲到哪个单元。纸上只出教过的，不超纲；以后在页面上随时改。</small></label>'
        }
        if (ready && opts.ask === 'yuwen') {
          var ls = yuwenLessons(ready)
          var yl = isObj(sz) && sz.book === yuwenBook(ready) ? sz.lesson : null
          if (ls) ask = '<label class="auth-field"><span>语文学到</span>' + progressSelect('pf-lesson', ls, yl) +
            '<small>学校现在讲到哪一课。识字只考教过的字，写字从这一课练起；以后在页面上随时改。</small></label>'
        }
        return '<div class="help-head"><h2 id="profile-title">' + (opts.first ? '先说说孩子用的课本' : '孩子档案') + '</h2>' +
            '<button type="button" class="help-close" aria-label="关闭">×</button></div>' +
          '<div class="account-body profile-body">' +
            '<p class="pf-intro">' + (opts.first
              ? '设一次就行：口算、数学知识点、识字、写字都照这个出题，不用每个页面各选一遍。'
              : '口算、数学知识点、识字、写字都照这个出题。升年级、换学期回这里改。') + '</p>' +
            '<div class="auth-field"><span>年级</span>' + seg('grade', GRADES, state.grade) +
              '<small>现在先有一年级，二年级明年秋季开学前做齐。</small></div>' +
            '<div class="auth-field"><span>学期</span>' + seg('term', TERMS, state.term) + '</div>' +
            '<div class="auth-field"><span>数学课本</span>' + seg('math', MATH, state.math) +
              '<small>看孩子数学书封面上的出版社。语文全国都是统编版，不用选。</small></div>' +
            ask +
            '<div class="pf-act"><button type="button" class="btn btn-primary" data-pf-save' + (ready ? '' : ' disabled') + '>保存</button>' +
              (opts.first ? '<button type="button" class="btn" data-pf-later>以后再说</button>' : '') + '</div>' +
          '</div>'
      }

      /* 重画；before 是改之前的课本：课本没变就留着已经选的「学到哪」，变了就清掉（单元表对不上了） */
      function paint(before) {
        var unit = dlg.querySelector('#pf-unit')
        var lesson = dlg.querySelector('#pf-lesson')
        var keep = { u: unit && unit.value, l: lesson && lesson.value }
        dlg.innerHTML = body()
        var nu = dlg.querySelector('#pf-unit')
        var nl = dlg.querySelector('#pf-lesson')
        if (nu && keep.u && before.m === mathBook(state)) nu.value = keep.u
        if (nl && keep.l && before.y === yuwenBook(state)) nl.value = keep.l
      }

      dlg.addEventListener('click', function (e) {
        if (e.target === dlg || e.target.closest('.help-close')) return finish(null)
        var b = e.target.closest('[data-pf] button')
        if (b) {
          var name = b.parentNode.getAttribute('data-pf')
          var before = { m: mathBook(state), y: yuwenBook(state) }
          state[name] = name === 'grade' ? Number(b.getAttribute('data-v')) : b.getAttribute('data-v')
          paint(before)
          return
        }
        if (e.target.closest('[data-pf-later]')) {
          try { root.sessionStorage.setItem(LATER_KEY, '1') } catch (err) { /* 隐私模式 */ }
          return finish(null)
        }
        if (e.target.closest('[data-pf-save]')) {
          var unit = dlg.querySelector('#pf-unit')
          var lesson = dlg.querySelector('#pf-lesson')
          var kid = save(store, state)
          if (!kid) return
          apply(store, kid, {
            mathUnit: unit && unit.value !== '' ? Number(unit.value) : null,
            yuwenLesson: lesson && lesson.value !== '' ? Number(lesson.value) : null
          })
          finish(kid)
        }
      })
      dlg.addEventListener('cancel', function () { finish(null) })
      dlg.innerHTML = body()
      doc.body.appendChild(dlg)
      dlg.showModal()
    })
  }

  /*
   * 跟课本走的页面打开时调：有档案 → 直接给；老用户推得出 → 存下给；
   * 都没有 → 等登录同步（换了新设备，云端的档案还没下来）再看一眼，还没有就弹框（这次会话点过「以后再说」就不弹）。
   * 返回 Promise：{ kid, fresh }，fresh = 这次刚设的（页面要按新课本重新出）。
   */
  function ensure(opts) {
    var S = root.SumSum
    var store = S.store
    var k = get(store)
    if (k) return Promise.resolve({ kid: k, fresh: false })
    var guess = infer(store)
    if (guess.kid) return Promise.resolve({ kid: save(store, guess.kid), fresh: false })
    var later = false
    try { later = root.sessionStorage.getItem(LATER_KEY) === '1' } catch (e) { /* 隐私模式 */ }
    if (later) return Promise.resolve({ kid: null, fresh: false })
    /* 页面脚本可能在 js/account-ui.js 之前跑：等整页脚本都跑完，再等登录同步（最多 2.5 秒） */
    var parsed = doc.readyState === 'loading'
      ? new Promise(function (r) { doc.addEventListener('DOMContentLoaded', r) })
      : Promise.resolve()
    var wait = parsed.then(function () {
      var sync = S.accountUI && S.accountUI.initialSync
      return sync ? Promise.race([sync, new Promise(function (r) { root.setTimeout(r, 2500) })]) : null
    })
    return wait.then(function () {
      var again = get(store)
      if (again) return { kid: again, fresh: false }
      var g2 = infer(store)
      if (g2.kid) return { kid: save(store, g2.kid), fresh: false }
      return open(Object.assign({ first: true, hint: g2.hint }, opts || {})).then(function (kid) { return { kid: kid, fresh: !!kid } })
    })
  }

  /*
   * 页面开头照本机的档案出了题；等登录同步回来（换了设备、别的设备改过档案），档案变了就按新的重开这一页。
   * used：页面开头用的档案（没有就 null）
   */
  function watch(used) {
    if (!doc) return
    var S = root.SumSum
    var parsed = doc.readyState === 'loading'
      ? new Promise(function (r) { doc.addEventListener('DOMContentLoaded', r) })
      : Promise.resolve()
    parsed.then(function () {
      var sync = S.accountUI && S.accountUI.initialSync
      return sync || null
    }).then(function () {
      if (JSON.stringify(get(S.store)) !== JSON.stringify(used || null) && (used || get(S.store))) reload()
    })
  }

  /* 改了档案后重新打开这一页：去掉网址参数。口算、识字会把设置抄进网址（?src=book:…、?book=…），
     带着刷新会被当成「分享来的链接」照旧课本出（2026-11-28 测出来的） */
  function reload() {
    root.location.href = root.location.pathname
  }

  /* 页面上的「改」：[data-profile-open] 点了打开档案，保存了就刷新（各页按新课本重出） */
  if (doc) {
    doc.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-profile-open]')
      if (!b) return
      e.preventDefault()
      open({ ask: b.getAttribute('data-profile-open') || '' }).then(function (kid) { if (kid) reload() })
    })
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.profile = {
    KEY: KEY,
    AT_KEY: AT_KEY,
    STALE_DAYS: STALE_DAYS,
    get: get,
    save: save,
    clean: clean,
    infer: infer,
    apply: apply,
    touch: touch,
    stale: stale,
    mathBook: mathBook,
    yuwenBook: yuwenBook,
    mathName: mathName,
    yuwenName: yuwenName,
    summary: summary,
    open: open,
    ensure: ensure,
    watch: watch,
    reload: reload
  }
})(typeof window !== 'undefined' ? window : globalThis)
