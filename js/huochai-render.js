/**
 * 火柴棒算式练习纸渲染。
 *
 * 卷面每页 5 道，对战双份（copies===2）时同一页连印两份；答案页每页 10 道，
 * 只印一份（与数独、密码、迷宫一致）。火柴图是内联 SVG：每根火柴一条带
 * 火柴头的粗线；L2–L4 在数字的空段位和减号的竖位印淡虚线，提示能放哪。
 *
 * buildHTML 是纯字符串函数（node 里可测），render 只做挂 DOM。
 */
(function (root) {
  'use strict'

  function P() {
    return root.SumSum.render.parts
  }
  function H() {
    return root.SumSum.huochai
  }

  var PER_PAGE = 5
  var ANS_PER_PAGE = 10

  /*
   * 符号坐标（SVG 用户单位）。数字格 10×18：左 x=2、右 x=8，上 y=2、中 y=9、
   * 下 y=16；运算符格与等号格宽 8。卷面 1 单位 = 1.2mm，答案页 0.75mm。
   */
  var DIGIT_W = 10
  var OP_W = 8
  var FIG_H = 18
  var SEGS = {
    a: [2, 2, 8, 2], b: [8, 2, 8, 9], c: [8, 9, 8, 16], d: [2, 16, 8, 16],
    e: [2, 9, 2, 16], f: [2, 2, 2, 9], g: [2, 9, 8, 9]
  }
  var OPS = { h: [1, 9, 7, 9], v: [4, 6, 4, 12] }
  var EQS = [[1, 7, 7, 7], [1, 11, 7, 11]]

  /* 一根火柴：两端各缩 0.6 留缝，起点画火柴头 */
  function stick(x1, y1, x2, y2, cls) {
    var dx = x2 - x1
    var dy = y2 - y1
    var len = Math.sqrt(dx * dx + dy * dy)
    var ux = dx / len
    var uy = dy / len
    var ax = x1 + ux * 0.6
    var ay = y1 + uy * 0.6
    var bx = x2 - ux * 0.6
    var by = y2 - uy * 0.6
    var line = '<line x1="' + r(ax) + '" y1="' + r(ay) + '" x2="' + r(bx) + '" y2="' + r(by) + '"/>'
    if (cls === 'hc-slot') return '<g class="hc-slot">' + line + '</g>'
    var head = '<circle cx="' + r(ax) + '" cy="' + r(ay) + '" r="0.95"/>'
    if (cls === 'hc-removed') {
      var mx = (ax + bx) / 2
      var my = (ay + by) / 2
      return '<g class="hc-removed">' + line + head +
        '<path class="hc-x" d="M' + r(mx - 1.6) + ' ' + r(my - 1.6) + 'L' + r(mx + 1.6) + ' ' + r(my + 1.6) +
        'M' + r(mx + 1.6) + ' ' + r(my - 1.6) + 'L' + r(mx - 1.6) + ' ' + r(my + 1.6) + '"/></g>'
    }
    if (cls === 'hc-added') {
      /* 添上的那根：底下垫一道宽灰带，缩印也一眼能认出 */
      return '<g class="hc-added">' + line.replace('<line', '<line class="hc-halo"') + line + head + '</g>'
    }
    return '<g class="' + cls + '">' + line + head + '</g>'
  }
  function r(n) {
    return Math.round(n * 100) / 100
  }

  function sameMark(m, i, seg) {
    return m && m.i === i && m.seg === seg
  }

  /*
   * 火柴图。opts：
   *   slots   空位印虚线（L2–L4）
   *   removed / added  答案页标注：{i, seg}，i 为 symbolsOf 下标
   *   scale   1 单位 = 多少 mm（默认 1.2）
   */
  function figureSVG(eq, opts) {
    opts = opts || {}
    var syms = H().symbolsOf(eq)
    var x = 0
    var body = ''
    syms.forEach(function (s, i) {
      var w = s.t === 'd' ? DIGIT_W : OP_W
      var parts = ''
      if (s.t === 'eq') {
        EQS.forEach(function (p) { parts += stick(p[0], p[1], p[2], p[3], 'hc-stick') })
      } else {
        var geo = s.t === 'd' ? SEGS : OPS
        Object.keys(geo).forEach(function (seg) {
          var p = geo[seg]
          var has = s.segs.indexOf(seg) >= 0
          if (has) {
            parts += stick(p[0], p[1], p[2], p[3], sameMark(opts.removed, i, seg) ? 'hc-removed' : 'hc-stick')
          } else if (sameMark(opts.added, i, seg)) {
            parts += stick(p[0], p[1], p[2], p[3], 'hc-added')
          } else if (opts.slots) {
            /* 加号的横位永远有火柴；减号只缺竖位 */
            parts += stick(p[0], p[1], p[2], p[3], 'hc-slot')
          }
        })
      }
      body += '<g transform="translate(' + x + ' 0)">' + parts + '</g>'
      x += w
    })
    var scale = opts.scale || 1.2
    return '<svg class="hc-fig" viewBox="0 0 ' + x + ' ' + FIG_H + '" style="width:' + r(x * scale) + 'mm;height:' +
      r(FIG_H * scale) + 'mm" aria-label="' + P().esc(H().eqText(eq)) + '">' + body + '</svg>'
  }

  function ruleText(lv) {
    return '第 ' + lv.no + ' 关 · ' + lv.name + ' —— 按提示动一根火柴，让算式变对。' +
      '拿走的那根打 ×，添上的那根用铅笔画出来，再把改好的算式写在横线上。'
  }

  function headHTML(title) {
    return '<header class="sheet-head"><h2 class="sheet-title">' + P().esc(title) + '</h2>' + P().metaHTML() + '</header>'
  }

  function itemHTML(entry, lv) {
    var q = entry.q
    return (
      '<div class="hc-item">' +
      '<div class="hc-head"><span class="hc-no">' + P().numLabel(entry.idx) + '</span>' +
      '<span class="hc-kind">' + H().KIND_TEXT[q.kind] + '</span></div>' +
      '<div class="hc-body">' +
      '<div class="hc-figwrap">' + figureSVG(q.from, { slots: lv.key !== 'L1' }) + '</div>' +
      '<p class="hc-write">改好的算式：<span class="hc-line"></span></p>' +
      '</div></div>'
    )
  }

  function puzzleSheetHTML(list, opts) {
    var span = list.length > 1
      ? '第 ' + list[0].idx + '~' + list[list.length - 1].idx + ' 题'
      : '第 ' + list[0].idx + ' 题'
    return (
      '<section class="sheet sheet-huochai">' +
      headHTML(opts.title) +
      '<p class="hc-rule">' + P().esc(ruleText(opts.lv)) + '</p>' +
      '<div class="hc-list">' + list.map(function (e) { return itemHTML(e, opts.lv) }).join('') + '</div>' +
      '<footer class="sheet-foot">' + span + ' / 共 ' + opts.total + ' 题' +
      (opts.copyNo ? '　·　第 ' + opts.copyNo + ' 份' : '') + '</footer>' +
      '</section>'
    )
  }

  function ansItemHTML(entry) {
    var q = entry.q
    return (
      '<div class="hc-ans-item">' +
      '<p class="hc-ans-head"><span class="ans-no">' + P().numLabel(entry.idx) + '</span>' +
      '<span class="hc-ans-eq">' + P().esc(H().eqText(q.from)) + ' → <b>' + P().esc(H().eqText(q.to)) + '</b></span></p>' +
      figureSVG(q.from, { removed: q.edit.removed, added: q.edit.added, scale: 0.75 }) +
      '</div>'
    )
  }

  function answerSheetHTML(list, opts) {
    return (
      '<section class="sheet sheet-huochai-ans">' +
      headHTML(opts.title + '（答案）') +
      '<p class="hc-ans-legend">打 × 的是拿走的火柴，垫着灰底的是添上的火柴。</p>' +
      '<div class="hc-ans-wrap">' + list.map(ansItemHTML).join('') + '</div>' +
      '<footer class="sheet-foot">答案 · 第 ' + opts.pageNo + ' 页 / 共 ' + opts.pageTotal + ' 页</footer>' +
      '</section>'
    )
  }

  function buildHTML(s, puzzles) {
    var lv = H().levelOf(s.level)
    var title = s.title || H().titleFor(s)
    var html = []
    for (var start = 0; start < puzzles.length; start += PER_PAGE) {
      var list = []
      for (var k = start; k < Math.min(start + PER_PAGE, puzzles.length); k++) list.push({ q: puzzles[k], idx: k + 1 })
      for (var c = 1; c <= s.copies; c++) {
        html.push(puzzleSheetHTML(list, { lv: lv, title: title, total: puzzles.length, copyNo: s.copies > 1 ? c : 0 }))
      }
    }
    if (s.answerPage && puzzles.length) {
      var entries = puzzles.map(function (q, i) { return { q: q, idx: i + 1 } })
      var pageTotal = Math.ceil(entries.length / ANS_PER_PAGE)
      for (var p = 0; p < pageTotal; p++) {
        html.push(answerSheetHTML(entries.slice(p * ANS_PER_PAGE, (p + 1) * ANS_PER_PAGE), {
          title: title, pageNo: p + 1, pageTotal: pageTotal
        }))
      }
    }
    return html.join('')
  }

  function render(container, s, puzzles) {
    container.innerHTML = buildHTML(s, puzzles)
    /* 火柴页固定 A4 纵向 */
    root.document.body.classList.remove('landscape')
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.huochaiRender = {
    render: render,
    buildHTML: buildHTML,
    figureSVG: figureSVG,
    PER_PAGE: PER_PAGE,
    ANS_PER_PAGE: ANS_PER_PAGE
  }
})(typeof window !== 'undefined' ? window : globalThis)
