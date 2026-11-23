/**
 * 「今天」首页：把 today-core 算好的五张卡片画出来。
 *
 * 卡片上半部是进入板块的链接，底栏蓝色「打印」是另一个链接（板块页 + #print），
 * 板块页会先把纸渲染出来、在纸上方弹一条「确认打印」，家长看一眼再印 —— 用户定的规矩：
 * 首页不直接弹打印对话框。
 *
 * 文字全部来自固定文案、大纲常量和数字，没有用户输入（口算/数独的自定义标题不在卡片上用），
 * 可以直接拼 HTML。
 */
;(function (root) {
  'use strict'

  var doc = root.document
  var S = root.SumSum

  function storage() {
    try {
      return root.localStorage
    } catch (e) {
      return { getItem: function () { return null } }
    }
  }

  var PLAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>'

  /*
   * 2026-11 改版：首页是一张「书桌」，今天每个板块的纸按 A4 比例缩小摆在上面，纸面画的是
   * 它真正的样子（田字格里是真字、拼音是今天卷上的真题），纸下面写这张纸是什么、两个按钮。
   * 分「练习」「游戏」两排，与左栏分组一致。纸面元素一律用 cqw（纸宽的百分比）排，纸多大都等比。
   */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }

  function paper(o) {
    return '<article class="dk-item">' +
      '<a class="dk-paper" href="' + o.href + '" aria-label="进入' + o.name + '">' +
        '<div class="pp ' + (o.cls || '') + '" aria-hidden="true">' +
          '<div class="pp-head"><b>' + esc(o.sheetTitle) + '</b><span>' + (o.sheetMeta || '姓名＿＿＿') + '</span></div>' +
          o.face +
        '</div>' +
      '</a>' +
      '<div class="dk-cap">' +
        '<p class="dk-kind">' + o.name + '<span>' + o.kind + '</span></p>' +
        '<h3><a href="' + o.href + '">' + esc(o.title) + '</a></h3>' +
        (o.lines || '') +
        '<div class="dk-act">' +
          '<a class="btn btn-primary btn-sm" href="' + o.printHref + '">' + o.printText + '</a>' +
          '<a class="dk-more" href="' + o.href + '">' + o.more + '</a>' +
        '</div>' +
      '</div>' +
    '</article>'
  }

  function rows(n, cls) {
    var out = ''
    for (var i = 0; i < n; i++) out += '<i class="' + (cls || '') + '"></i>'
    return out
  }

  function aoshuCard(a) {
    var lines = '<p class="dk-meta">' +
      (a.next ? (a.video ? '<span class="dk-vid">' + PLAY_SVG + '讲解视频 ' + a.video.dur + '</span>' : '') + esc(a.parts)
        : '从学过的课里混合出题') + '</p>' +
      '<div class="dk-prog"><div class="progress"><i style="width:' + (a.learned / a.total) * 100 + '%"></i></div>' +
      '<span>已学 ' + a.learned + ' / ' + a.total + '</span></div>'
    var face = '<div class="pp-sec">讲解</div>' + rows(3, 'pp-ln') +
      '<div class="pp-figs"><span></span><span></span><span></span></div>' +
      '<div class="pp-sec">练习</div>' + rows(2, 'pp-ln') + '<div class="pp-figs pp-figs-sm"><span></span><span></span></div>' + rows(2, 'pp-ln')
    return paper({
      name: '奥数', kind: a.next ? '接着学' : '全部学完',
      href: a.href, printHref: a.printHref, cls: 'pp-aoshu',
      sheetTitle: a.next ? '第 ' + a.next.no + ' 课 · ' + a.next.name : '综合复习',
      face: face,
      title: a.next ? '第 ' + a.next.no + ' 课 · ' + a.next.name : '出一张综合复习卷',
      lines: lines,
      printText: a.next ? '打印本课' : '打印复习卷',
      more: '换一课'
    })
  }

  function shiziCard(z) {
    var chars = z.chars || []
    var rj = z.book && z.book !== 'hongen'
    var face = '<div class="pp-zi">' + chars.map(function (c) { return '<span>' + esc(c) + '</span>' }).join('') + '</div>'
    var isWeek = z.mode === 'week'
    var isDaily = z.mode === 'daily'
    var weeks = ''
    for (var i = 1; i <= z.weeks; i++) weeks += '<i' + (i === z.week ? ' class="on"' : i < z.week ? ' class="past"' : '') + '></i>'
    var meta = ['错字集 ' + z.wrong + ' 个']
    if (z.repeats) meta.push('其中 ' + z.repeats + ' 个反复错')
    return paper({
      name: '识字', kind: isWeek ? '本周复习' : isDaily ? '每日一卷' : '错字集',
      href: z.href, printHref: z.printHref, cls: 'pp-shizi',
      sheetTitle: isWeek ? (rj ? '识字检查 · ' + z.unitName : '识字 · 第 ' + z.week + ' 周') : isDaily ? '识字 · 每日一卷' : '识字 · 错字卷',
      face: face,
      title: isWeek
        ? (rj ? z.unitName + ' · 单元检查' : '第 ' + z.week + ' 周 · 第 ' + z.from + '–' + z.to + ' 字')
        : isDaily ? (z.due ? '今天到期 ' + z.due + ' 个字' : '今天 20 个字') : '错字卷 · ' + z.wrong + ' 个字',
      lines: '<p class="dk-meta">' + meta.join('，') + '</p>' +
        (rj
          ? '<p class="dk-note">' + esc(z.bookShort) + ' · 学到 ' + esc(z.lessonLabel) + '</p>' +
            (z.xie ? '<p class="dk-note dk-xie">写字：<a href="' + z.xie.href + '">' + esc(z.xie.label) + ' · ' + esc(z.xie.chars) + '</a></p>' : '')
          : '<div class="dk-prog"><div class="weeks">' + weeks + '</div><span>第 ' + z.week + ' / ' + z.weeks + ' 周</span></div>'),
      printText: isWeek ? (rj ? '打印检查卷' : '打印本周卷') : isDaily ? '打印今日卷' : '打印错字卷',
      more: '标记错字'
    })
  }

  /* 口算缩略图上的算式只是示意（真题每次打印都换），按 20 以内排得像一张真卷 */
  var KS = ['8 + 5', '13 − 6', '7 + 9', '15 − 8', '6 + 6', '12 − 4', '9 + 3', '17 − 9', '4 + 8', '11 − 5', '5 + 7', '16 − 7', '8 + 8', '14 − 6', '3 + 9', '18 − 9']
  function kousuanCard(k) {
    var face = '<ol class="pp-calc">' + KS.map(function (q) { return '<li>' + q + ' =<i></i></li>' }).join('') + '</ol>'
    return paper({
      name: '口算', kind: '上次的设置',
      href: k.href, printHref: k.printHref, cls: 'pp-kousuan',
      sheetTitle: k.title, sheetMeta: '得分＿＿',
      face: face,
      title: k.title,
      lines: '<p class="dk-meta">' + esc(k.meta) + '</p><p class="dk-note">每次打印都换一批新题</p>',
      printText: '打印',
      more: '调设置'
    })
  }

  function board(n, given) {
    var cells = ''
    for (var i = 0; i < n * n; i++) cells += '<span>' + (given[i] || '') + '</span>'
    return '<div class="pp-board" style="--n:' + n + '">' + cells + '</div>'
  }

  function shuduCard(d) {
    var g = { 0: 1, 3: 4, 5: 3, 10: 2, 12: 4, 15: 1, 6: 2 }
    return paper({
      name: '数独', kind: '上次的设置',
      href: d.href, printHref: d.printHref, cls: 'pp-games',
      sheetTitle: '数独', face: board(4, g) + board(4, { 1: 2, 4: 3, 9: 1, 14: 4, 7: 1, 11: 3 }),
      title: d.title,
      lines: '<p class="dk-meta">' + esc(d.meta) + '</p><p class="dk-note">也能在屏幕上直接玩</p>',
      printText: '打印',
      more: '换难度'
    })
  }

  function pinyinCard(p) {
    var items = (p.items && p.items.length ? p.items : ['b', 'd', 'p', 'q'])
    var face = '<div class="pp-sec">读一读</div><ol class="pp-py">' + items.map(function (t) {
      return '<li><span>' + esc(t) + '</span><i></i></li>'
    }).join('') + '</ol><div class="pp-sec">拼一拼</div><ol class="pp-py pp-py-sm"><li><span>bā</span><i></i></li><li><span>dī</span><i></i></li></ol>' +
      '<div class="pp-sec">换题再试</div><ol class="pp-py pp-py-sm"><li><span>pá</span><i></i></li><li><span>qí</span><i></i></li></ol>' +
      '<div class="pp-parent">' + rows(3, 'pp-ln') + '</div>'
    return paper({
      name: '拼音', kind: '每日练习',
      href: p.href, printHref: p.printHref || p.href, cls: 'pp-pinyin',
      sheetTitle: '拼音练习', face: face,
      title: p.title,
      lines: '<p class="dk-meta">' + (p.printHref
        ? p.groups + ' 组，' + (p.count ? '已登记 ' + p.count + ' 题' : '还没练') : '也可以按需要手选专题') + '</p>' +
        '<p class="dk-note">每天约五分钟</p>',
      printText: p.printHref ? '打印今日卷' : '选专题',
      more: '去登记'
    })
  }

  /* 三个游戏的纸面示意 */
  var GAME_FACE = {
    mima: function () {
      var rowsHtml = ''
      var marks = ['●○', '●', '○○', '●●']
      for (var i = 0; i < 4; i++) {
        rowsHtml += '<div class="pp-lock"><span>' + [3, 1, 4, 2][i] + '</span><span>' + [5, 2, 6, 1][i] + '</span><span>' + [2, 6, 3, 5][i] +
          '</span><em>' + marks[i] + '</em></div>'
      }
      return rowsHtml + '<div class="pp-lock pp-lock-ans"><span></span><span></span><span></span></div>'
    },
    zhizhi: function () {
      var heart = '0101011111111110111000100'
      var cells = ''
      for (var i = 0; i < 25; i++) cells += '<span' + (heart[i] === '1' ? ' class="on"' : '') + '></span>'
      return '<div class="pp-nono"><div class="pp-board pp-board-fill" style="--n:5">' + cells + '</div></div>'
    },
    migong: function () {
      var nums = [3, 7, 5, 9, 6, 2, 8, 4, 10, 1, 7, 5, 9, 3, 6, 8]
      return '<div class="pp-board pp-maze" style="--n:4">' + nums.map(function (n, i) {
        return '<span' + ([0, 4, 5, 9, 13, 14, 15].indexOf(i) >= 0 ? ' class="path"' : '') + '>' + n + '</span>'
      }).join('') + '</div>'
    }
  }
  var GAME_TEXT = {
    mima: { name: '密码', note: '看线索推出密码', more: '换一关' },
    zhizhi: { name: '数织', note: '涂完是一幅小图', more: '换一关' },
    migong: { name: '迷宫', note: '算对了才走得通', more: '换一关' }
  }
  function gameCard(g) {
    var t = GAME_TEXT[g.key]
    return paper({
      name: t.name, kind: '上次的设置',
      href: g.href, printHref: g.printHref, cls: 'pp-games pp-' + g.key,
      sheetTitle: t.name + ' · 第 ' + g.level + ' 关', face: GAME_FACE[g.key](),
      title: g.title,
      lines: '<p class="dk-meta">' + esc(g.meta) + '</p><p class="dk-note">' + t.note + '</p>',
      printText: '打印',
      more: t.more
    })
  }

  function shelf(title, items) {
    return '<section class="dk-shelf" aria-label="' + title + '"><h2>' + title + '</h2><div class="dk-row">' + items.join('') + '</div></section>'
  }

  var data = S.today.build(storage(), new Date())
  doc.getElementById('today-date').textContent = data.date
  doc.getElementById('today-cards').innerHTML =
    shelf('练习', [aoshuCard(data.aoshu), shiziCard(data.shizi), kousuanCard(data.kousuan), pinyinCard(data.pinyin)]) +
    shelf('游戏', [shuduCard(data.shudu)].concat(data.games.map(gameCard)))

  /* 最近更新：只摆最近两次，全部的在使用说明页 */
  var news = doc.getElementById('today-news')
  var log = (S.changelog && S.changelog.list) || []
  if (news && log.length) {
    news.innerHTML = '<h2 id="tn-title">最近更新</h2><div class="tn-list">' +
      log.slice(0, 2).map(function (e) {
        return '<div class="tn-day"><time datetime="' + esc(e.date) + '">' + +e.date.slice(5, 7) + ' 月 ' + (+e.date.slice(8)) + ' 日</time>' +
          '<div class="tn-items">' + e.items.map(function (t) { return '<p>' + esc(t) + '</p>' }).join('') + '</div></div>'
      }).join('') +
      '</div><p class="tn-more"><a href="help.html#changelog">全部更新记录</a></p>'
    news.hidden = false
  }

  /* 第一次登录的三步引导 */
  var intro = doc.getElementById('today-intro')
  var INTRO_KEY = 'sumsum:today:intro:v1'
  var introSeen = true
  try { introSeen = !!root.localStorage.getItem(INTRO_KEY) } catch (e) { /* 存不了就别弹 */ }
  if (intro && !introSeen) {
    intro.hidden = false
    intro.addEventListener('click', function (e) {
      if (e.target.closest('[data-intro-help]')) return /* help.js 负责跳到使用说明页 */
      if (!e.target.closest('[data-intro-close]')) return
      intro.hidden = true
      try { root.localStorage.setItem(INTRO_KEY, '1') } catch (err) { /* 下次再关 */ }
    })
  }

  /* 完工标记：上面任何一步抛错都到不了这里；HTML 里的防护脚本据此判断并提示 */
  document.documentElement.setAttribute('data-sumsum-ready', '1')
})(window)
