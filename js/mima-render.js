/**
 * 密码推理练习纸渲染。
 *
 * 每页固定 2 道题（L3 试过 3 道：4 行线索卡 ≈ 70mm，3 张 + 间隔 + 页顶规则
 * = 235mm 超出 222mm 版心，被排版校验拦下）。对战双份（copies===2）在这一层
 * 做：同页连印两份，答案页只印一份（不随份数翻倍——泄题又费纸），与数独一致。
 *
 * buildHTML 是纯字符串函数（node 里可测），render 只做挂 DOM + 收尾。
 */
(function (root) {
  'use strict'

  function P() {
    return root.SumSum.render.parts
  }

  /*
   * 排版尺寸（mm）。版心按 180×225（A4 纵向 210×297、页边距 15、扣页眉页脚），
   * fitW/fitH 故意再收一点余量——本项目在口算/奥数上都栽过内联 mm 累计溢出、
   * 多挤空白页的坑。校验脚本另写一套独立常量对证（见 tools/check-mima.js）。
   */
  var MM = {
    fitW: 178,
    fitH: 222,
    gap: 8, // 题卡间距
    PER_PAGE: { L1: 2, L2: 2, L3: 2, L4: 2 },
    ansCols: 2,
    ansRows: 2
  }
  var ANS_PER_PAGE = MM.ansCols * MM.ansRows

  function perPageOf(s, count) {
    var want = MM.PER_PAGE[s.level] || 2
    return Math.max(1, Math.min(want, count || 1))
  }

  /* 反馈区：点子皮肤印 ●○（先 ● 后 ○，顺序固定——打乱会泄露对应关系；
     一个点都没有的行印「—」，图例里说明它代表全错）；文字皮肤印句子 */
  function fbHTML(row, lv) {
    if (!lv.dots) {
      return '<span class="mima-fb mima-fb-text">' + P().esc(root.SumSum.mima.clueText(row.a, row.b)) + '</span>'
    }
    var t = ''
    for (var i = 0; i < row.a; i++) t += '●'
    for (var j = 0; j < row.b; j++) t += '○'
    return '<span class="mima-fb">' + (t || '—') + '</span>'
  }

  /* 页顶那行：关卡名 + 该关的读题说明（点子关附图例） */
  function ruleText(lv) {
    if (lv.dots) {
      return '第 ' + lv.no + ' 关 · ' + lv.name + ' —— 密码是 ' + lv.N +
        ' 个不重复的数字。● 数字对、位置也对；○ 数字对、位置不对；没有点 = 这行里没有密码的数字。'
    }
    return '第 ' + lv.no + ' 关 · ' + lv.name + ' —— 密码是 ' + lv.N +
      ' 个不重复的数字，照每行的线索把密码推出来。'
  }

  function itemHTML(entry, lv) {
    var rows = entry.q.rows.map(function (r) {
      var cells = ''
      r.g.forEach(function (d) {
        cells += '<span class="mima-cell">' + d + '</span>'
      })
      return '<div class="mima-clue">' + cells + fbHTML(r, lv) + '</div>'
    }).join('')

    var boxes = ''
    for (var i = 0; i < lv.N; i++) boxes += '<span class="mima-box"></span>'

    var strip = ''
    if (lv.strip) {
      var cells2 = ''
      lv.pool.forEach(function (d) {
        cells2 += '<span class="mima-cell">' + d + '</span>'
      })
      strip = '<div class="mima-strip"><span class="mima-strip-l">划掉不在密码里的数字：</span>' + cells2 + '</div>'
    }

    return (
      '<div class="mima-item">' +
      '<p class="mima-no">' + P().numLabel(entry.idx) + '</p>' +
      '<div class="mima-clues">' + rows + '</div>' +
      /* 作答格与上面的线索格同宽同距、逐格对齐（孩子照着猜的形状写答案）；
         「密码」标签放在右边反馈点的空区，不占行也不推开格子 */
      '<div class="mima-ans">' + boxes + '<span class="mima-ans-l">密码</span></div>' +
      strip +
      '</div>'
    )
  }

  function headHTML(title) {
    return (
      '<header class="sheet-head">' +
      '<h2 class="sheet-title">' + P().esc(title) + '</h2>' +
      P().metaHTML() +
      '</header>'
    )
  }

  function puzzleSheetHTML(list, opts) {
    var lv = root.SumSum.mima.levelOf(opts.level)
    var items = list.map(function (entry) {
      return itemHTML(entry, lv)
    }).join('')
    var span = list.length > 1
      ? '第 ' + list[0].idx + '~' + list[list.length - 1].idx + ' 题'
      : '第 ' + list[0].idx + ' 题'
    return (
      '<section class="sheet sheet-mima">' +
      headHTML(opts.title) +
      '<p class="mima-rule">' + P().esc(ruleText(lv)) + '</p>' +
      '<div class="mima-grid">' + items + '</div>' +
      '<footer class="sheet-foot">' + span + ' / 共 ' + opts.total + ' 题' +
      (opts.copyNo ? '　·　第 ' + opts.copyNo + ' 份' : '') +
      '</footer>' +
      '</section>'
    )
  }

  /* 答案页：每题密码 + 分步解析（trace 就是求解器的人话轨迹） */
  function answerSheetHTML(list, opts) {
    var items = list.map(function (entry) {
      var steps = entry.q.trace.map(function (line) {
        return '<li>' + P().esc(line) + '</li>'
      }).join('')
      return (
        '<div class="mima-ans-item">' +
        '<p class="mima-ans-head"><span class="ans-no">' + P().numLabel(entry.idx) + '</span>' +
        '<span class="mima-ans-code">密码 <b>' + entry.q.code.join(' ') + '</b></span></p>' +
        '<ol class="mima-steps">' + steps + '</ol>' +
        '</div>'
      )
    }).join('')
    return (
      '<section class="sheet sheet-mima-ans">' +
      headHTML(opts.title + '（答案）') +
      '<div class="mima-ans-grid">' + items + '</div>' +
      '<footer class="sheet-foot">答案 · 第 ' + opts.pageNo + ' 页 / 共 ' + opts.pageTotal + ' 页</footer>' +
      '</section>'
    )
  }

  function buildHTML(s, puzzles) {
    var M = root.SumSum.mima
    var title = s.title || M.titleFor(s)
    var per = perPageOf(s, puzzles.length)
    var html = []

    for (var start = 0; start < puzzles.length; start += per) {
      var list = []
      for (var k = start; k < Math.min(start + per, puzzles.length); k++) {
        list.push({ q: puzzles[k], idx: k + 1 })
      }
      /* 对战：同一页原样再印一份紧跟其后，只有页脚「第 N 份」不同 */
      for (var c = 1; c <= s.copies; c++) {
        html.push(puzzleSheetHTML(list, {
          level: s.level,
          title: title,
          total: puzzles.length,
          copyNo: s.copies > 1 ? c : 0
        }))
      }
    }

    if (s.answerPage && puzzles.length) {
      var entries = puzzles.map(function (q, i) { return { q: q, idx: i + 1 } })
      var pageTotal = Math.ceil(entries.length / ANS_PER_PAGE)
      for (var p = 0; p < pageTotal; p++) {
        html.push(answerSheetHTML(entries.slice(p * ANS_PER_PAGE, (p + 1) * ANS_PER_PAGE), {
          title: title,
          pageNo: p + 1,
          pageTotal: pageTotal
        }))
      }
    }
    return html.join('')
  }

  function render(container, s, puzzles) {
    container.innerHTML = buildHTML(s, puzzles)
    /* 密码页固定 A4 纵向，不用像口算那样切 body.landscape */
    root.document.body.classList.remove('landscape')
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.mimaRender = {
    render: render,
    buildHTML: buildHTML,
    MM: MM,
    perPageOf: perPageOf
  }
})(typeof window !== 'undefined' ? window : globalThis)
