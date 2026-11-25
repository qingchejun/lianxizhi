/**
 * 儿童迷宫练习纸渲染（2026-11-25 换成普通方格迷宫，墙用 SVG 画，打印清楚）。
 *
 * 每页张数按关卡分两档：L1/L2（8×8、12×12）一页 2 张；L3/L4（16×16、20×20）
 * 一页 1 张，通道宽 8~10mm，孩子拿铅笔画得进去。对战双份（copies===2）
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
   * 排版尺寸（mm）。版心 178×222（A4 纵向、页边距 15、扣页眉页脚，与密码页同口径）。
   * 每关的格边长在 migong-core 的 LEVELS[].cell；迷宫上下各留 0.75 格写「起」「终」。
   * 校验脚本另写一套独立常量对证（tools/check-migong.js）。
   */
  var MM = {
    fitW: 178,
    fitH: 222,
    PER_PAGE: { L1: 2, L2: 2, L3: 1, L4: 1 },
    ansCols: 2,
    ansRows: 2,
    ansW: 78, // 答案页每张迷宫的宽
    wall: 0.55 // 墙线粗细
  }
  var ANS_PER_PAGE = MM.ansCols * MM.ansRows
  var PAD = 0.75 // 迷宫上下留给「起」「终」的空，单位：格

  function perPageOf(s, count) {
    var want = MM.PER_PAGE[s.level] || 2
    return Math.max(1, Math.min(want, count || 1))
  }

  /* 页顶那行：关卡名 + 玩法一句话 */
  function ruleText(lv) {
    return '第 ' + lv.no + ' 关 · ' + lv.name + ' —— 从「起」走进去，拿笔沿着通道画线，不能穿过墙，画到「终」就走出来了。'
  }

  /* 一张迷宫的 SVG：cellMM 是格边长（mm），withPath 时叠一条红色通路（答案页） */
  function mazeSVG(pz, cellMM, withPath) {
    var W = root.SumSum.migong.WALL
    var n = pz.n
    var d = []
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        var w = pz.walls[r * n + c]
        if ((w & W.UP) && !(r === 0 && c === 0)) d.push('M' + c + ' ' + r + 'h1')
        if (w & W.LEFT) d.push('M' + c + ' ' + r + 'v1')
        if (c === n - 1 && (w & W.RIGHT)) d.push('M' + (c + 1) + ' ' + r + 'v1')
        if (r === n - 1 && (w & W.DOWN) && c !== n - 1) d.push('M' + c + ' ' + (r + 1) + 'h1')
      }
    }
    var sw = (MM.wall / cellMM).toFixed(3)
    var fs = Math.min(0.62, 4.2 / cellMM).toFixed(2) /* 「起」「终」大约 4mm 高，格子大时不超过 0.62 格 */
    var svg = '<svg class="migong-svg" viewBox="-0.1 ' + (-PAD) + ' ' + (n + 0.2) + ' ' + (n + 2 * PAD) + '"' +
      ' width="' + ((n + 0.2) * cellMM).toFixed(1) + 'mm" height="' + ((n + 2 * PAD) * cellMM).toFixed(1) + 'mm" aria-hidden="true">' +
      '<path d="' + d.join('') + '" fill="none" stroke="#222" stroke-width="' + sw + '" stroke-linecap="square"/>' +
      '<text x="0.5" y="' + (-PAD / 2) + '" font-size="' + fs + '" text-anchor="middle" dominant-baseline="central" font-weight="700">起</text>' +
      '<text x="' + (n - 0.5) + '" y="' + (n + PAD / 2) + '" font-size="' + fs + '" text-anchor="middle" dominant-baseline="central" font-weight="700">终</text>'
    if (withPath) {
      var pts = ['0.5,' + (-PAD / 3)].concat(pz.path.map(function (p) { return (p[1] + 0.5) + ',' + (p[0] + 0.5) }))
      pts.push((n - 0.5) + ',' + (n + PAD / 3))
      svg += '<polyline class="migong-route" points="' + pts.join(' ') + '" fill="none" stroke="#c62f28" stroke-width="' +
        (0.9 / cellMM).toFixed(3) + '" stroke-linejoin="round" stroke-linecap="round"/>'
    }
    return svg + '</svg>'
  }

  function itemHTML(entry, lv) {
    return (
      '<div class="migong-item">' +
      '<p class="migong-no">' + P().numLabel(entry.idx) + '</p>' +
      mazeSVG(entry.q, lv.cell, false) +
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

  /* 答案页：缩印迷宫，红线画出唯一的通路 */
  function ansItemHTML(entry) {
    var n = entry.q.n
    return (
      '<div class="migong-ans-item">' +
      '<p class="migong-ans-head"><span class="ans-no">' + P().numLabel(entry.idx) + '</span>' +
      '<span class="migong-ans-note">红线 = 唯一的通路</span></p>' +
      mazeSVG(entry.q, MM.ansW / (n + 0.2), true) +
      '</div>'
    )
  }

  function answerSheetHTML(list, opts) {
    var items = list.map(ansItemHTML).join('')
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
    mazeSVG: mazeSVG,
    perPageOf: perPageOf
  }
})(typeof window !== 'undefined' ? window : globalThis)
