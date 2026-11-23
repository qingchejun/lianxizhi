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
        '<p class="dk-kind">' + o.name + '<span>' + o.kind + '</span>' +
          (o.mins ? '<em class="dk-min">约 ' + o.mins + ' 分钟</em>' : '') + '</p>' +
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
      name: '奥数', mins: a.minutes, kind: a.next ? '接着学' : '全部学完',
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
      name: '识字', mins: z.minutes, kind: isWeek ? '本周复习' : isDaily ? '每日一卷' : '错字集',
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
      name: '口算', mins: k.minutes, kind: '上次的设置',
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
      name: '数独', mins: d.minutes, kind: '上次的设置',
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
      name: '拼音', mins: p.minutes, kind: '每日练习',
      href: p.href, printHref: p.printHref || p.href, cls: 'pp-pinyin',
      sheetTitle: '拼音练习', face: face,
      title: p.title,
      lines: '<p class="dk-meta">' + (p.printHref
        ? p.groups + ' 组，' + (p.count ? '已登记 ' + p.count + ' 题' : '还没练') : '也可以按需要手选专题') + '</p>' +
        '',
      printText: p.printHref ? '打印今日卷' : '选专题',
      more: '去登记'
    })
  }

  /* 几个游戏的纸面示意 */
  var GAME_FACE = {
    /* 火柴：一道错的小火柴算式 6+3=8（纸面示意，不是题） */
    huochai: function () {
      var S = { a: [2, 2, 8, 2], b: [8, 2, 8, 9], c: [8, 9, 8, 16], d: [2, 16, 8, 16], e: [2, 9, 2, 16], f: [2, 2, 2, 9], g: [2, 9, 8, 9] }
      var D = { 6: 'acdefg', 3: 'abcdg', 8: 'abcdefg' }
      function line(p, dx) {
        return '<line x1="' + (p[0] + dx) + '" y1="' + p[1] + '" x2="' + (p[2] + dx) + '" y2="' + p[3] + '"/>'
      }
      function digit(d, dx) {
        return D[d].split('').map(function (k) { return line(S[k], dx) }).join('')
      }
      var body = digit(6, 0) + line([11, 9, 17, 9], 0) + line([14, 6, 14, 12], 0) + digit(3, 18) +
        line([29, 7, 35, 7], 0) + line([29, 11, 35, 11], 0) + digit(8, 36)
      return '<svg class="pp-match" viewBox="0 0 46 18" aria-hidden="true">' + body + '</svg>'
    },
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
    huochai: { name: '火柴', note: '动一根火柴让算式变对', more: '换一关' },
    mima: { name: '密码', note: '看线索推出密码', more: '换一关' },
    zhizhi: { name: '数织', note: '涂完是一幅小图', more: '换一关' },
    migong: { name: '迷宫', note: '算对了才走得通', more: '换一关' }
  }
  function gameCard(g) {
    var t = GAME_TEXT[g.key]
    return paper({
      name: t.name, mins: g.minutes, kind: '上次的设置',
      href: g.href, printHref: g.printHref, cls: 'pp-games pp-' + g.key,
      sheetTitle: t.name + ' · 第 ' + g.level + ' 关', face: GAME_FACE[g.key](),
      title: g.title,
      lines: '<p class="dk-meta">' + esc(g.meta) + '</p><p class="dk-note">' + t.note + '</p>',
      printText: '打印',
      more: t.more
    })
  }

  function shelf(title, items) {
    return '<section class="dk-shelf" aria-label="' + title + '"><h2>' + title + '</h2><div class="dk-row' + (items.length === 5 ? ' dk-row-5' : '') + '">' + items.join('') + '</div></section>'
  }

  var data = S.today.build(storage(), new Date())
  doc.getElementById('today-date').textContent = data.date + ' · 一页纸，五分钟，挑两三张就够'
  doc.getElementById('today-cards').innerHTML =
    shelf('练习', [aoshuCard(data.aoshu), shiziCard(data.shizi), kousuanCard(data.kousuan), pinyinCard(data.pinyin)]) +
    shelf('游戏', [shuduCard(data.shudu)].concat(data.games.map(gameCard)))

  /* 扫码登记带来的提醒：没登记的纸、口算升档、奥数再练 / 复习卷、游戏自动升降关（可撤销） */
  var marksBox = doc.getElementById('today-marks')
  function z2(n) { return (n < 10 ? '0' : '') + n }
  function todayKey() {
    var d = new Date()
    return d.getFullYear() + '-' + z2(d.getMonth() + 1) + '-' + z2(d.getDate())
  }
  function paintMarks() {
    if (!marksBox || !S.today.markNotes || !S.store) return
    var n = S.today.markNotes(S.store, todayKey())
    var rows = []
    if (n.pending) {
      rows.push('<p><span>还有 <b>' + n.pending + '</b> 张纸还没打分。孩子做完后，手机扫纸角的二维码就能打分。' +
        '</span><a class="btn btn-sm" href="mark?id=' + esc(n.pendingId) + '">去打分</a></p>')
    }
    if (n.kousuanUp) {
      rows.push('<p><span>口算连续两张都「会了」，可以升到「' + esc(n.kousuanUp) + '」。' +
        '</span><button type="button" class="btn btn-sm" data-ks-up="' + esc(n.kousuanUp) + '">换到这一档</button></p>')
    }
    if (n.aoshuRetry) {
      rows.push('<p><span>奥数「' + esc(n.aoshuRetry.label) + '」上次打了「不会」，可以换一批题再练一张。' +
        '</span><button type="button" class="btn btn-sm" data-ao-retry="' + esc(n.aoshuRetry.id) + '">再练一张</button></p>')
    }
    if (n.aoshuDue.length >= 3) {
      rows.push('<p><span>奥数有 <b>' + n.aoshuDue.length + '</b> 课待复习（打了「一般」或点过错题）。' +
        '</span><a class="btn btn-sm" href="aoshu.html?review=true&reviewTopics=' + encodeURIComponent(n.aoshuDue.join(',')) + '#print">打印复习卷</a></p>')
    }
    n.games.forEach(function (g) {
      rows.push('<p><span>' + esc(g.text) + '。</span><button type="button" class="btn btn-sm" data-game-undo="' + esc(g.recId) + '">撤销</button></p>')
    })
    marksBox.innerHTML = rows.join('')
    marksBox.hidden = !rows.length
  }
  if (marksBox) {
    marksBox.addEventListener('click', function (e) {
      var b = e.target.closest('button')
      if (!b) return
      if (b.dataset.ksUp) {
        var K = S.settings
        var p = K.PRESETS.filter(function (x) { return x.label === b.dataset.ksUp })[0]
        if (p) S.store.set('sumsum:settings:v1', Object.assign({}, K.sanitize(S.store.get('sumsum:settings:v1') || {}), p.patch, { title: '' }))
        root.location.reload()
      } else if (b.dataset.aoRetry) {
        S.today.rollAoshu(S.store, b.dataset.aoRetry)
        root.location.href = 'aoshu.html?topic=' + encodeURIComponent(b.dataset.aoRetry) + '&review=false#print'
      } else if (b.dataset.gameUndo) {
        var rec = S.sheetsCore.parse(S.store.getString(S.sheetsCore.keyOf(b.dataset.gameUndo)))
        if (rec) S.sheetsCore.undoGame(S.store, rec)
        root.location.reload()
      }
    })
    paintMarks()
  }

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
