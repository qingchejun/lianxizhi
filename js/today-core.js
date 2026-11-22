/**
 * 「今天」首页的数据：从各板块存在浏览器里的东西，拼出五张卡片要显示的内容。
 *
 * 只读不写。每张卡片说的都必须和点进板块后看到的一致，所以能复用板块自己的
 * sanitize / sliceOf 就复用，不另写一套规则（例：识字周次越界怎么钳，以 shizi-core 为准）。
 *
 * 「打印」链接一律是板块页 + #print：板块页照常用上次的设置渲染，再在纸张上方弹一条
 * 「确认打印」（见 js/shell.js）。识字、口算、数独【不能】往链接里塞设置参数 ——
 * 它们的 load() 看到网址参数就整个忽略本地存储，进度会被打回默认值。
 * 奥数例外：它是「本地存储 ← 网址参数」叠加，带 topic 只会换课、不丢别的设置。
 *
 * 无 DOM 依赖，node 下由 tools/check-today.js 校验。
 */
;(function (root) {
  'use strict'

  var WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

  var PAPER_LABELS = { portrait: 'A4 纵向', landscape: 'A4 横向' }

  /* 读一个键并解析 JSON。存储不可用、键不存在、内容坏了，一律返回 null */
  function readJson(storage, key) {
    try {
      var raw = storage.getItem(key)
      return raw == null ? null : JSON.parse(raw)
    } catch (e) {
      return null
    }
  }

  function isObj(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v)
  }

  function dateText(now) {
    return (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日 星期' + WEEKDAYS[now.getDay()]
  }

  /* ---------- 奥数 ---------- */

  function aoshuCard(storage) {
    var A = root.SumSum.aoshu
    var V = root.SumSum.aoshuVideos
    var list = readJson(storage, 'sumsum:aoshu:learned:v1')
    var learned = {}
    if (Array.isArray(list)) {
      list.forEach(function (id) {
        if (typeof id === 'string') learned[id] = true
      })
    }
    var outline = A.OUTLINE
    var done = outline.filter(function (o) {
      return learned[o.id]
    }).length
    var nextEntry = outline.filter(function (o) {
      return !learned[o.id]
    })[0]

    /* 讲解页 / 解析页的开关沿用上次的设置；练习题总是印的 */
    var s = readJson(storage, 'sumsum:aoshu:v1')
    if (!isObj(s)) s = {}
    var parts = []
    if (s.lessonPage !== false) parts.push('讲解')
    parts.push('练习')
    if (s.answerPage !== false) parts.push('解析')

    var next = nextEntry ? { no: nextEntry.no, id: nextEntry.id, name: nextEntry.name } : null
    var href = next ? 'aoshu.html?topic=' + next.id + '&review=false' : 'aoshu.html?review=true'
    return {
      learned: done,
      total: outline.length,
      next: next,
      video: next ? V.of(next.id) : null,
      parts: parts.join(' + '),
      href: href,
      printHref: href + '#print'
    }
  }

  /* ---------- 识字 ---------- */

  function shiziCard(storage) {
    var Z = root.SumSum.shizi
    var raw = readJson(storage, 'sumsum:shizi:v1')
    var s = root.SumSum.shiziSettings.sanitize(isObj(raw) ? raw : {})
    var slice = Z.slice(s)
    var rj = s.book !== Z.HONGEN
    var lessons = rj ? Z.lessonsOf(s.book) : []
    var at = rj ? (s.lesson ? lessons[s.lesson - 1] : lessons[lessons.length - 1]) : null

    /* 2026-11 起错字集是 v3；老备份导入前的 v2 也认（在集的都当红底数） */
    var marks = readJson(storage, 'sumsum:shizi:wrong:v3')
    if (!isObj(marks)) marks = readJson(storage, 'sumsum:shizi:wrong:v2')
    var z = function (v) {
      return (v < 10 ? '0' : '') + v
    }
    var now = new Date()
    var todayStr = now.getFullYear() + '-' + z(now.getMonth() + 1) + '-' + z(now.getDate())
    var wrong = 0
    var repeats = 0
    var due = 0
    if (isObj(marks)) {
      Object.keys(marks).forEach(function (ch) {
        var e = marks[ch]
        if (!isObj(e)) return
        if (Z.stateOf(e) !== 'out') {
          wrong++
          /* v2 条目没有 due：迁移后一律今天到期，这里照这个口径数 */
          if (!e.due || e.due <= todayStr) due++
        }
        if (Z.markCount(e) >= 2) repeats++
      })
    }

    return {
      /* 识字页打开永远是「每日一卷」（shizi-settings 的 load 不记页签），卡片跟它一致；
         存着的 mode 只是上次停在哪个页签，不能拿来决定卡片印什么 */
      mode: 'daily',
      book: s.book,
      /* 人教版：学到哪一课（今天卡片上写给家长看）、单元检查印的是哪个单元 */
      lessonLabel: at ? (s.lesson ? Z.lessonLabel(at) : '整册') : '',
      bookShort: rj ? (root.SumSum.shiziRjData.BOOKS[s.book] || {}).short || '' : '',
      unitName: rj ? slice.unitName : '',
      /* 写字（人教版写字表）：跟着学校进度该练哪一课 */
      xie: rj && root.SumSum.shiziXie ? (function () {
        var xl = root.SumSum.shiziXie.pick(s.book, s.xieLesson, s.lesson)
        return xl ? { label: xl.label, chars: xl.chars.join(''), href: 'shizi.html?pane=xie' } : null
      })() : null,
      chars: slice.chars.slice(0, 20),
      week: slice.week,
      weeks: slice.weeks,
      from: slice.from,
      to: slice.to,
      wrong: wrong,
      repeats: repeats,
      due: due,
      withWrong: s.withWrong,
      href: 'shizi.html',
      printHref: 'shizi.html#print'
    }
  }

  /* ---------- 口算 ---------- */

  function kousuanCard(storage) {
    var raw = readJson(storage, 'sumsum:settings:v1')
    var K = root.SumSum.settings
    var s = K.sanitize(isObj(raw) ? raw : {})
    var mode = K.MODE_LABELS[s.mode]
    /* 命中预设就用预设名当标题 —— 家长认的是「20以内进退位」这个名字 */
    var preset = K.presetOf(s)
    var meta = [s.count + ' 题', s.columns + ' 列', PAPER_LABELS[s.paper]]
    if (preset) meta.unshift(mode)
    return {
      title: preset || mode,
      meta: meta.join(' · '),
      href: 'kousuan.html',
      printHref: 'kousuan.html#print'
    }
  }

  /* ---------- 数独 ---------- */

  function shuduCard(storage) {
    var D = root.SumSum.shudu
    var raw = readJson(storage, 'sumsum:shudu:v1')
    var s = root.SumSum.shuduSettings.sanitize(isObj(raw) ? raw : {})
    var meta = [
      s.count + ' 题',
      s.copies > 1 ? '2 份（同题对战）' : '1 份',
      s.perPage ? s.perPage + ' 题 / 页' : '自动排版'
    ]
    return {
      title: D.shapeOf(s.shape).name + ' · ' + s.clues + ' 个提示',
      meta: meta.join(' · '),
      href: 'shudu.html',
      printHref: 'shudu.html#print'
    }
  }

  function pinyinCard(storage, now) {
    var P = root.SumSum.pinyin
    var DB = root.SumSum.pinyinStorage
    var date = P.dateKey(now)
    var data = DB.read(storage)
    var saved = DB.current(data, date)
    var sheet = saved || P.makeSheet(date, P.derive(data.sheets, data.marks, date))
    if (!sheet) return { title: '今天可以休息', href: 'pinyin.html?view=topics' }
    var count = sheet.groups.reduce(function (total, group) {
      return total + group.items.filter(function (item) {
        var mark = data.marks[sheet.id]?.[item.id]
        return mark && mark.result !== 'unpracticed'
      }).length
    }, 0)
    return {
      title: root.SumSum.pinyinData.directions[sheet.focus].label,
      items: sheet.groups[0].items.slice(0, 4).map(function (item) { return item.text }),
      groups: sheet.groups.filter(function (group) { return group.phase !== 'check' }).length,
      count: count,
      href: 'pinyin.html',
      printHref: 'pinyin.html#print'
    }
  }

  /* 三个游戏的关卡名：照抄各 *-core.js 的 LEVELS 与板块页下拉框（check-today 对着下拉框校验）。
     首页不为三行字加载三个题目引擎，所以设置也在这里按同样的钳位规则读 */
  var GAME_LEVELS = {
    mima: [{ name: '点点入门' }, { name: '双色点' }, { name: '读题破译' }, { name: '大侦探' }],
    zhizhi: [{ name: '迷你涂画', note: '5×5' }, { name: '小小图案', note: '8×8' }, { name: '大发现', note: '10×10' }, { name: '像素大师', note: '12×12' }],
    migong: [{ name: '起步小路', note: '10 以内加法' }, { name: '岔路寻踪', note: '10 以内加减' }, { name: '进位翻山', note: '20 以内进位加' }, { name: '终极大冒险', note: '20 以内加减' }]
  }
  var GAME_RULES = {
    mima: { unit: '题', max: 12 },
    zhizhi: { unit: '幅', max: 8 },
    migong: { unit: '张', max: 8 }
  }

  function clamp(v, min, max, fallback) {
    var n = Number(v)
    if (v === '' || v == null || !isFinite(n)) return fallback
    return Math.min(max, Math.max(min, Math.round(n)))
  }

  function gameCard(storage, key) {
    var raw = readJson(storage, 'sumsum:' + key + ':v1')
    var s = isObj(raw) ? raw : {}
    var no = /^L[1-4]$/.test(s.level) ? Number(s.level.slice(1)) : 1
    var lv = GAME_LEVELS[key][no - 1]
    var count = clamp(s.count, 1, GAME_RULES[key].max, 4)
    var copies = clamp(s.copies, 1, 2, 2)
    var meta = [count + ' ' + GAME_RULES[key].unit]
    if (lv.note) meta.push(lv.note)
    meta.push(copies > 1 ? '2 份（同题对战）' : '1 份')
    return {
      key: key,
      level: no,
      title: '第 ' + no + ' 关 · ' + lv.name,
      meta: meta.join(' · '),
      href: key + '.html',
      printHref: key + '.html#print'
    }
  }

  function build(storage, now) {
    return {
      date: dateText(now),
      aoshu: aoshuCard(storage),
      shizi: shiziCard(storage),
      kousuan: kousuanCard(storage),
      shudu: shuduCard(storage),
      pinyin: pinyinCard(storage, now),
      games: ['mima', 'zhizhi', 'migong'].map(function (k) { return gameCard(storage, k) })
    }
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.today = { build: build, pinyinCard: pinyinCard, GAME_LEVELS: GAME_LEVELS }
})(typeof window !== 'undefined' ? window : globalThis)
