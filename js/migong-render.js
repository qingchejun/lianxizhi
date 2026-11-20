/**
 * 算式迷宫练习纸渲染。
 *
 * 每页张数按关卡分两档：L1/L2 迷宫小（4×4、5×5），一页 2 张；L3/L4 大迷宫
 * （6×6，格 24mm）一页 1 张——格子太小等式就印不清了。对战双份（copies===2）
 * 的印法随之不同：一页 2 张的关卡同页连印两份（一张纸裁开就是对战），
 * 一页 1 张的关卡整卷印完第 1 份再印第 2 份（同页装不下两份大迷宫）。
 * 答案页只印一份（不随份数翻倍），与数独、密码一致。
 *
 * buildHTML 是纯字符串函数（node 里可测），render 只做挂 DOM + 收尾。
 */
(function (root) {
  'use strict'

  function P() {
    return root.SumSum.render.parts
  }

  /*
   * 排版尺寸（mm）。版心 178×222（A4 纵向、页边距 15、扣页眉页脚，与密码页
   * 同口径）；fitW/fitH 故意再收一点余量。校验脚本另写一套独立常量对证
   * （tools/check-migong.js）。CELL 与 migong-core 的 LEVELS[].cell 对应。
   */
  var MM = {
    fitW: 178,
    fitH: 222,
    gap: 8, // 题卡间距
    PER_PAGE: { L1: 2, L2: 2, L3: 1, L4: 1 },
    ansCols: 2,
    ansRows: 2,
    ansCell: 8 // 答案页缩印格边长
  }
  var ANS_PER_PAGE = MM.ansCols * MM.ansRows

  function perPageOf(s, count) {
    var want = MM.PER_PAGE[s.level] || 2
    return Math.max(1, Math.min(want, count || 1))
  }

  /* 页顶那行：关卡名 + 玩法一句话 */
  function ruleText(lv) {
    return '第 ' + lv.no + ' 关 · ' + lv.name + ' —— 算式对的格子才能走：从「起」出发，' +
      '上下左右走相邻的格子，只踩算对的，走到「终」就赢了。'
  }

  function cellHTML(pz, r, c) {
    var N = pz.n
    if (r === 0 && c === 0) return '<td class="migong-cell migong-start">起</td>'
    if (r === N - 1 && c === N - 1) return '<td class="migong-cell migong-end">终</td>'
    var cell = pz.cells[r][c]
    return '<td class="migong-cell"><span class="migong-eq">' +
      cell.a + cell.op + cell.b + '=' + cell.r + '</span></td>'
  }

  function gridHTML(pz, lv) {
    var html = '<table class="migong-grid migong-l' + lv.no + '">'
    for (var r = 0; r < pz.n; r++) {
      html += '<tr>'
      for (var c = 0; c < pz.n; c++) html += cellHTML(pz, r, c)
      html += '</tr>'
    }
    return html + '</table>'
  }

  function itemHTML(entry, lv) {
    return (
      '<div class="migong-item">' +
      '<p class="migong-no">' + P().numLabel(entry.idx) + '</p>' +
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
    var lv = opts.lv
    var items = list.map(function (entry) {
      return itemHTML(entry, lv)
    }).join('')
    var span = list.length > 1
      ? '第 ' + list[0].idx + '~' + list[list.length - 1].idx + ' 张'
      : '第 ' + list[0].idx + ' 张'
    return (
      '<section class="sheet sheet-migong">' +
      headHTML(opts.title) +
      '<p class="migong-rule">' + P().esc(ruleText(lv)) + '</p>' +
      '<div class="migong-gridwrap">' + items + '</div>' +
      '<footer class="sheet-foot">' + span + ' / 共 ' + opts.total + ' 张' +
      (opts.copyNo ? '　·　第 ' + opts.copyNo + ' 份' : '') +
      '</footer>' +
      '</section>'
    )
  }

  /* 答案页：缩印迷宫，正确路线格深灰底、诱饵格浅灰底，一眼看出唯一路线 */
  function ansItemHTML(entry, lv) {
    var N = entry.q.n
    var onPath = {}
    entry.q.path.forEach(function (p) { onPath[p[0] * N + p[1]] = 1 })
    var isBait = {}
    entry.q.baits.forEach(function (p) { isBait[p[0] * N + p[1]] = 1 })

    var html = '<table class="migong-ans-grid">'
    for (var r = 0; r < N; r++) {
      html += '<tr>'
      for (var c = 0; c < N; c++) {
        var k = r * N + c
        var cls = 'migong-ans-cell'
        if (r === 0 && c === 0) cls += ' migong-ans-start'
        else if (r === N - 1 && c === N - 1) cls += ' migong-ans-end'
        else if (onPath[k]) cls += ' migong-ans-path'
        else if (isBait[k]) cls += ' migong-ans-bait'
        var txt = (r === 0 && c === 0) ? '起' : (r === N - 1 && c === N - 1) ? '终' : ''
        html += '<td class="' + cls + '">' + txt + '</td>'
      }
      html += '</tr>'
    }
    return (
      '<div class="migong-ans-item">' +
      '<p class="migong-ans-head"><span class="ans-no">' + P().numLabel(entry.idx) + '</span>' +
      '<span class="migong-ans-note">深色 = 唯一的正确路线</span></p>' +
      html + '</table>' +
      '</div>'
    )
  }

  function answerSheetHTML(list, opts) {
    var lv = opts.lv
    var items = list.map(function (entry) {
      return ansItemHTML(entry, lv)
    }).join('')
    return (
      '<section class="sheet sheet-migong-ans">' +
      headHTML(opts.title + '（答案）') +
      '<div class="migong-ans-wrap">' + items + '</div>' +
      '<footer class="sheet-foot">答案 · 第 ' + opts.pageNo + ' 页 / 共 ' + opts.pageTotal + ' 页</footer>' +
      '</section>'
    )
  }

  function buildHTML(s, puzzles) {
    var M = root.SumSum.migong
    var lv = M.levelOf(s.level)
    var title = s.title || M.titleFor(s)
    var per = perPageOf(s, puzzles.length)
    var html = []

    function pageList(start) {
      var list = []
      for (var k = start; k < Math.min(start + per, puzzles.length); k++) {
        list.push({ q: puzzles[k], idx: k + 1 })
      }
      return list
    }

    if (per >= 2) {
      /* 一页多张：对战 = 同页连印两份（一张纸裁开就是对战），与密码一致 */
      for (var start = 0; start < puzzles.length; start += per) {
        var list = pageList(start)
        for (var c = 1; c <= s.copies; c++) {
          html.push(puzzleSheetHTML(list, {
            lv: lv, title: title, total: puzzles.length,
            copyNo: s.copies > 1 ? c : 0
          }))
        }
      }
    } else {
      /* 一页一张（大迷宫）：整卷印完一份再印一份，同页装不下两份 */
      for (var c2 = 1; c2 <= s.copies; c2++) {
        for (var st = 0; st < puzzles.length; st += per) {
          html.push(puzzleSheetHTML(pageList(st), {
            lv: lv, title: title, total: puzzles.length,
            copyNo: s.copies > 1 ? c2 : 0
          }))
        }
      }
    }

    if (s.answerPage && puzzles.length) {
      var entries = puzzles.map(function (q, i) { return { q: q, idx: i + 1 } })
      var pageTotal = Math.ceil(entries.length / ANS_PER_PAGE)
      for (var p = 0; p < pageTotal; p++) {
        html.push(answerSheetHTML(entries.slice(p * ANS_PER_PAGE, (p + 1) * ANS_PER_PAGE), {
          lv: lv, title: title, pageNo: p + 1, pageTotal: pageTotal
        }))
      }
    }
    return html.join('')
  }

  function render(container, s, puzzles) {
    container.innerHTML = buildHTML(s, puzzles)
    /* 迷宫页固定 A4 纵向 */
    root.document.body.classList.remove('landscape')
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.migongRender = {
    render: render,
    buildHTML: buildHTML,
    MM: MM,
    perPageOf: perPageOf
  }
})(typeof window !== 'undefined' ? window : globalThis)
