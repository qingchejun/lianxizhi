/**
 * 数织练习纸渲染。
 *
 * 题卡不带外框（mima 的线索卡要边框是因为线索行没形状；涂画网格自身就是形状），
 * 也省出高度：L2 两题纵排时卡片 padding 就够把 222mm 版心顶爆。
 * 对战双份（copies===2）在这一层做：同页连印两份，答案页只印一份
 * （不随份数翻倍——泄题又费纸），与数独/密码一致。
 *
 * buildHTML 是纯字符串函数（node 里可测），render 只做挂 DOM + 收尾。
 */
(function (root) {
  'use strict'

  function P() {
    return root.SumSum.render.parts
  }

  /*
   * 排版尺寸（mm）。fitH 沿用 222 的保守版心（A4 纵向内容 267 减页眉页脚余量）。
   * 列线索堆叠高度按图库实测：5×5 最多 2 段、8×8 与 10×10 最多 4 段、12×12 最多 6 段。
   * 校验脚本另写一套独立常量对证（见 tools/check-zhizhi.js）。
   */
  var MM = {
    fitW: 178,
    fitH: 222,
    gap: 8, // 题卡间距
    PER_PAGE: { L1: 2, L2: 2, L3: 2, L4: 1 },
    CELL: { L1: 10, L2: 9, L3: 7, L4: 9 },
    CLUE_LINE: 3.7, // 列线索一行高（10px 字号 + 行距）
    ansCellMM: 3,
    ansCols: 2,
    ansRows: 2
  }
  var ANS_PER_PAGE = MM.ansCols * MM.ansRows

  function perPageOf(s, count) {
    var want = MM.PER_PAGE[s.level] || 2
    return Math.max(1, Math.min(want, count || 1))
  }

  /* 页顶那行：关卡名 + 读题说明（图例） */
  function ruleText(lv) {
    return '第 ' + lv.no + ' 关 · ' + lv.name + ' —— 数字 = 这一行的黑格分组：按顺序、至少隔 1 格空；0 = 全空。'
  }

  /* 10/12 关每 5 格加粗辅助线：孩子 5 个 5 个数格子 */
  function v5(lv, j) {
    return lv.N >= 10 && (j + 1) % 5 === 0 && j !== lv.N - 1
  }

  function gridHTML(pz, lv) {
    var N = lv.N
    var h = '<table class="zhizhi-grid"><tr><td class="zhizhi-blank"></td>'
    for (var j = 0; j < N; j++) {
      h += '<td class="zhizhi-colclue' + (v5(lv, j) ? ' zhizhi-v5' : '') + '">' +
        pz.colClues[j].map(function (n) { return '<span>' + n + '</span>' }).join('') +
        '</td>'
    }
    h += '</tr>'
    for (var i = 0; i < N; i++) {
      h += '<tr><td class="zhizhi-rowclue">' + pz.rowClues[i].join(' ') + '</td>'
      for (var k = 0; k < N; k++) {
        h += '<td class="zhizhi-cell' +
          (v5(lv, k) ? ' zhizhi-v5' : '') +
          (v5(lv, i) ? ' zhizhi-h5' : '') +
          '"></td>'
      }
      h += '</tr>'
    }
    return h + '</table>'
  }

  function itemHTML(entry, lv) {
    return (
      '<div class="zhizhi-item">' +
      '<p class="zhizhi-no">' + P().numLabel(entry.idx) + '</p>' +
      gridHTML(entry.q, lv) +
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
    var lv = root.SumSum.zhizhi.levelOf(opts.level)
    var items = list.map(function (entry) {
      return itemHTML(entry, lv)
    }).join('')
    var span = list.length > 1
      ? '第 ' + list[0].idx + '~' + list[list.length - 1].idx + ' 题'
      : '第 ' + list[0].idx + ' 题'
    return (
      '<section class="sheet sheet-zhizhi zhizhi-l' + lv.no + '">' +
      headHTML(opts.title) +
      '<p class="zhizhi-rule">' + P().esc(ruleText(lv)) + '</p>' +
      '<div class="zhizhi-list">' + items + '</div>' +
      '<footer class="sheet-foot">' + span + ' / 共 ' + opts.total + ' 题' +
      (opts.copyNo ? '　·　第 ' + opts.copyNo + ' 份' : '') +
      '</footer>' +
      '</section>'
    )
  }

  /* 答案页：完成图（黑格实心）+ 图案名 + 起步提示 */
  function ansBoardHTML(art) {
    var h = '<table class="zhizhi-ans-board">'
    for (var i = 0; i < art.rows.length; i++) {
      h += '<tr>'
      for (var j = 0; j < art.size; j++) {
        h += '<td class="zhizhi-ans-cell' + (art.rows[i].charAt(j) === 'X' ? ' zhizhi-ans-on' : '') + '"></td>'
      }
      h += '</tr>'
    }
    return h + '</table>'
  }

  function answerSheetHTML(list, opts) {
    var items = list.map(function (entry) {
      var hints = entry.q.hints.map(function (line) {
        return '<li>' + P().esc(line) + '</li>'
      }).join('')
      return (
        '<div class="zhizhi-ans-item">' +
        '<p class="zhizhi-ans-head"><span class="ans-no">' + P().numLabel(entry.idx) + '</span>' +
        '<b class="zhizhi-ans-name">' + P().esc(entry.q.art.name) + '</b></p>' +
        ansBoardHTML(entry.q.art) +
        '<ol class="zhizhi-hints">' + hints + '</ol>' +
        '</div>'
      )
    }).join('')
    return (
      '<section class="sheet sheet-zhizhi-ans">' +
      headHTML(opts.title + '（答案）') +
      '<div class="zhizhi-ans-grid">' + items + '</div>' +
      '<footer class="sheet-foot">答案 · 第 ' + opts.pageNo + ' 页 / 共 ' + opts.pageTotal + ' 页</footer>' +
      '</section>'
    )
  }

  function buildHTML(s, puzzles) {
    var M = root.SumSum.zhizhi
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
    /* 数织页固定 A4 纵向，不用像口算那样切 body.landscape */
    root.document.body.classList.remove('landscape')
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.zhizhiRender = {
    render: render,
    buildHTML: buildHTML,
    MM: MM,
    perPageOf: perPageOf,
    ruleText: ruleText
  }
})(typeof window !== 'undefined' ? window : globalThis)
