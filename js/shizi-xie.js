/**
 * 识字板块的「写字」：人教版写字表的田字格练字纸 + 屏幕上的笔顺动画。
 *
 * 一个字两行：
 *   第一行  范字（标笔顺编号）· 拼音 · 几画 · 笔顺分解（一格加一笔，新的一笔黑、写过的灰，下面写笔画名）
 *   第二行  描红几格（浅灰）+ 空格自己写
 * 字形、笔顺都画自 js/shizi-xie-data.js 的笔画图形（不靠系统字体），范字、分解、描红是同一个字形。
 *
 * 写字表按课的清单在 js/shizi-rj-data.js 的 xie（小，「今天」页也用）；笔顺图形在 js/shizi-xie-data.js（大，只有识字页加载）。
 * 纯函数（lessons / pick / neighbor / sheets）无 DOM 依赖，tools/check-shizi.js 在 node 里测；
 * 动画（animate）要浏览器和 js/vendor/hanzi-writer.min.js。
 */
;(function (root) {
  'use strict'

  function D() {
    return root.SumSum.shiziXieData
  }
  function Z() {
    return root.SumSum.shizi
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  /* 写字表按课列出，每课带上它在识字表里的课号 i（「学校学到」用的同一套编号），没有写字的课不在里面 */
  function lessons(book) {
    var b = root.SumSum.shiziRjData && root.SumSum.shiziRjData.BOOKS[book]
    var x = b && b.xie
    if (!x) return []
    var ls = Z().lessonsOf(book)
    return x.map(function (row) {
      var l = null
      for (var k = 0; k < ls.length; k++) if (ls[k].t === row[0]) l = ls[k]
      return { i: l ? l.i : 0, t: row[0], label: Z().lessonLabel(l) || row[0], unitName: l ? l.unitName : '', chars: Array.from(row[1]) }
    })
  }

  /*
   * 练哪一课：xieLesson 是识字表课号（0 = 跟着「学校学到」走，取学到的最后一个有写字的课）。
   * 指定的课号没有写字（比如拼音课）时，取它前面最近的一课。
   */
  function pick(book, xieLesson, learned) {
    var ls = lessons(book)
    if (!ls.length) return null
    var want = xieLesson > 0 ? xieLesson : learned > 0 ? learned : 9999
    var hit = ls[0]
    ls.forEach(function (l) { if (l.i <= want) hit = l })
    return hit
  }

  /*
   * 写字和认字的字表分开选（2026-11-28）。「自动」那一课：
   *   同一册 → 跟着认字的「学校学到」；写的是认字那册的上册 → 上册整册学过，取最后一课；其余从第一课开始。
   */
  function learnedFor(s) {
    if (s.xieBook === s.book) return s.lesson
    var b = root.SumSum.shiziRjData && root.SumSum.shiziRjData.BOOKS[s.book]
    return b && b.prev === s.xieBook ? 0 : 1
  }
  function pickFor(s) {
    return pick(s.xieBook, s.xieLesson, learnedFor(s))
  }

  /* 同一册里前一课 / 后一课（写字表里的），给面板上的 ◀ ▶ */
  function neighbor(book, i, delta) {
    var ls = lessons(book)
    for (var k = 0; k < ls.length; k++) {
      if (ls[k].i === i) {
        var n = ls[k + delta]
        return n ? n.i : 0
      }
    }
    return 0
  }

  /* ---------- 画字 ---------- */

  /* 田字格：外框实线，中线虚线 */
  function gridLines() {
    return '<rect x="1" y="1" width="1022" height="1022" fill="none" stroke="#2f7d4f" stroke-width="14"/>' +
      '<path d="M512 8V1016M8 512H1016" stroke="#7fb393" stroke-width="7" stroke-dasharray="40 28" fill="none"/>'
  }

  /*
   * 一个田字格里的字。opts：
   *   upto     画到第几笔（不给 = 全画）
   *   color    字的颜色（描红用浅灰）
   *   hot      这一笔用黑色、前面的用灰色（笔顺分解）
   *   nums     在每一笔起笔处标编号（范字）
   */
  function cellSvg(ch, opts) {
    opts = opts || {}
    var c = D().CHARS[ch]
    var body = ''
    if (c) {
      var n = opts.upto || c.s.length
      var paths = ''
      for (var k = 0; k < n; k++) {
        var fill = opts.hot ? (k === n - 1 ? '#000' : '#c4c4c4') : opts.color || '#000'
        paths += '<path d="' + c.s[k] + '" fill="' + fill + '"/>'
      }
      body = '<g transform="translate(0,900) scale(1,-1)">' + paths + '</g>'
      if (opts.nums) {
        /* 编号放在起笔处「往回退一点」的位置（逆着这一笔起笔的方向）：竖的编号在上头、横的在左边，
           和字帖一样；同一个角起笔的两笔（如「四」的竖和横折）就自然分开了。还挤就再往回退。 */
        var nums = ''
        var placed = []
        c.m.forEach(function (m, k) {
          var sx = m[0][0]
          var sy = 900 - m[0][1]
          var j = Math.min(m.length - 1, 2)
          var dx = m[j][0] - m[0][0]
          var dy = (900 - m[j][1]) - sy
          var len = Math.sqrt(dx * dx + dy * dy) || 1
          dx /= len
          dy /= len
          var back = 100
          var x, y
          for (var tries = 0; tries < 5; tries++) {
            x = Math.max(70, Math.min(954, sx - dx * back))
            y = Math.max(70, Math.min(954, sy - dy * back))
            var hit = placed.some(function (p) { return Math.abs(p[0] - x) < 130 && Math.abs(p[1] - y) < 130 })
            if (!hit) break
            back += 80
          }
          placed.push([x, y])
          nums += '<g transform="translate(' + Math.round(x) + ',' + Math.round(y) + ')"><circle r="64" fill="#d23c2f"/>' +
            '<text y="30" text-anchor="middle" font-size="88" font-weight="700" fill="#fff" font-family="Helvetica,Arial,sans-serif">' + (k + 1) + '</text></g>'
        })
        body += nums
      }
    }
    return '<svg class="xz-svg" viewBox="0 0 1024 1024" aria-hidden="true">' + (opts.noGrid ? '' : gridLines()) + body + '</svg>'
  }

  /* ---------- 排版 ---------- */

  /* 两种格子大小。cell = 田字格边长（mm），per = 一页几个字，step = 笔顺分解小格边长 */
  var SIZES = {
    l: { cell: 18, cols: 10, per: 5, step: 12, model: 24 },
    m: { cell: 15, cols: 12, per: 6, step: 11, model: 21 }
  }

  function charBlock(ch, s, size) {
    var c = D().CHARS[ch]
    if (!c) return ''
    var z = SIZES[size] || SIZES.l
    var steps = ''
    for (var k = 1; k <= c.s.length; k++) {
      steps += '<figure class="xz-step" style="width:' + z.step + 'mm">' +
        '<div class="xz-box" style="width:' + z.step + 'mm;height:' + z.step + 'mm">' + cellSvg(ch, { upto: k, hot: true }) + '</div>' +
        '<figcaption>' + esc(c.n[k - 1]) + '</figcaption></figure>'
    }
    var row = ''
    for (var j = 0; j < z.cols; j++) {
      row += '<div class="xz-box" style="width:' + z.cell + 'mm;height:' + z.cell + 'mm">' +
        (j < s.trace ? cellSvg(ch, { color: '#d6d6d6' }) : cellSvg('')) + '</div>'
    }
    return '<div class="xz-char" data-ch="' + esc(ch) + '">' +
      '<div class="xz-top">' +
        '<div class="xz-box xz-model" data-anim="' + esc(ch) + '" title="点一下看笔顺动画" style="width:' + z.model + 'mm;height:' + z.model + 'mm">' +
          cellSvg(ch, { nums: true }) + '</div>' +
        '<div class="xz-info"><b>' + esc(c.py) + '</b><span>' + c.s.length + ' 画</span></div>' +
        '<div class="xz-steps">' + steps + '</div>' +
      '</div>' +
      '<div class="xz-row">' + row + '</div>' +
    '</div>'
  }

  /*
   * 一课的练字纸，按每页 per 个字分页、按份数连印。返回 HTML 字符串数组（一张纸一项）。
   * s：{ size: 'l'|'m', trace: 描红几格, copies, title }；lesson：pick() 的结果。
   */
  function sheets(s, lesson, headHTML) {
    if (!lesson) return []
    var z = SIZES[s.size] || SIZES.l
    var chars = lesson.chars
    var pages = Math.ceil(chars.length / z.per)
    var title = s.title || '写字 · ' + lesson.label
    var out = []
    for (var p = 0; p < pages; p++) {
      var chunk = chars.slice(p * z.per, (p + 1) * z.per)
      var foot = lesson.unitName + '　·　' + lesson.label + '　·　' + chars.length + ' 个字' +
        (pages > 1 ? '　·　第 ' + (p + 1) + ' 页 / 共 ' + pages + ' 页' : '') + '　·　先描红，再自己写；边写边念笔画名'
      for (var c = 1; c <= (s.copies || 1); c++) {
        out.push('<section class="sheet sheet-xie">' + headHTML(title) +
          '<div class="xz-stage">' + chunk.map(function (ch) { return charBlock(ch, s, s.size) }).join('') + '</div>' +
          '<footer class="sheet-foot">' + esc(foot + (s.copies > 1 ? '　·　第 ' + c + ' 份' : '')) + '</footer></section>')
      }
    }
    return out
  }

  /* ---------- 屏幕上的笔顺动画（点范字弹出） ---------- */

  var dlg = null
  var writer = null

  function animate(ch) {
    var HW = root.HanziWriter
    var c = D().CHARS[ch]
    if (!HW || !c || !root.document) return
    var doc = root.document
    if (!dlg) {
      dlg = doc.createElement('dialog')
      dlg.className = 'account-dialog xz-anim'
      dlg.innerHTML = '<div class="help-head"><h2 class="xz-anim-title"></h2>' +
        '<button type="button" class="help-close" aria-label="关闭">×</button></div>' +
        '<div class="xz-anim-body"><div class="xz-anim-stage" id="xz-anim-stage"></div>' +
        '<p class="xz-anim-names"></p>' +
        '<div class="account-row"><button type="button" class="btn btn-primary" data-act="replay">再看一遍</button>' +
        '<button type="button" class="btn" data-act="step">一笔一笔看</button></div></div>'
      doc.body.appendChild(dlg)
      dlg.querySelector('.help-close').addEventListener('click', function () { dlg.close() })
      dlg.addEventListener('click', function (e) {
        if (e.target === dlg) dlg.close()
        var b = e.target.closest('[data-act]')
        if (!b || !writer) return
        if (b.dataset.act === 'replay') writer.animateCharacter()
        if (b.dataset.act === 'step') stepOne()
      })
    }
    var stepAt = 0
    function stepOne() {
      if (stepAt === 0) writer.hideCharacter()
      if (stepAt >= c.s.length) { stepAt = 0; writer.hideCharacter(); return }
      writer.animateStroke(stepAt)
      stepAt++
    }
    dlg.querySelector('.xz-anim-title').textContent = ch + '　' + c.py + '　' + c.s.length + ' 画'
    dlg.querySelector('.xz-anim-names').textContent = '笔顺：' + c.n.join('、')
    var stage = dlg.querySelector('#xz-anim-stage')
    stage.innerHTML = cellSvg('', {})
    writer = HW.create(stage, ch, {
      width: 260, height: 260, padding: 12,
      showOutline: true, strokeColor: '#111', outlineColor: '#e2e2e2', radicalColor: null,
      strokeAnimationSpeed: 0.8, delayBetweenStrokes: 350,
      charDataLoader: function (k, done) { done({ strokes: c.s, medians: c.m }) }
    })
    /* 田字格垫在动画底下：hanzi-writer 自己生成的 svg 叠在上面 */
    var svgs = stage.querySelectorAll('svg')
    if (svgs.length > 1) svgs[1].classList.add('xz-anim-writer')
    if (!dlg.open) dlg.showModal()
    writer.animateCharacter()
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.shiziXie = {
    SIZES: SIZES,
    lessons: lessons,
    pick: pick,
    pickFor: pickFor,
    learnedFor: learnedFor,
    neighbor: neighbor,
    cellSvg: cellSvg,
    sheets: sheets,
    animate: animate
  }
})(typeof window !== 'undefined' ? window : globalThis)
