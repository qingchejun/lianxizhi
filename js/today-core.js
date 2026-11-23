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

  /* ---------- 预计用时（口号「一页纸，五分钟」落到每张卡上） ----------
     一年级孩子的大致速度，宁可估多不估少；按 5 分钟取整、最少 5 分钟。
     改了题量（如口算 100 题）卡片上的分钟数会跟着变，说到做到。 */
  var PACE = {
    kousuan: 4,   /* 题 / 分钟 */
    shizi: 4,     /* 字 / 分钟（认读） */
    aoshu: 1      /* 题 / 分钟（不含讲解视频，视频时长卡片上另写） */
  }
  var SHUDU_MIN = { s4: 3, s6: 6, s9: 15 }  /* 每盘分钟 */
  var GAME_MIN = {                           /* 每题分钟，按关卡 L1–L4 */
    huochai: [1, 1, 1.5, 1.5],
    mima: [1, 1.25, 1.5, 2],
    migong: [1.25, 1.25, 1.5, 2],
    zhizhi: [1.25, 2.5, 4, 6]
  }
  function minutes(raw) {
    return Math.max(5, Math.round(raw / 5) * 5)
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
      minutes: minutes(clamp(s.count, 2, 30, 5) / PACE.aoshu),
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
      minutes: minutes(20 / PACE.shizi),
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
      minutes: minutes(s.count / PACE.kousuan),
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
      minutes: minutes(s.count * (SHUDU_MIN[s.shape] || SHUDU_MIN.s4)),
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
    if (!sheet) return { title: '今天可以休息', href: 'pinyin.html?view=topics' } /* 休息日不标分钟 */
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
      minutes: 5, /* 拼音每日一页按「约五分钟」设计（见使用说明） */
      href: 'pinyin.html',
      printHref: 'pinyin.html#print'
    }
  }

  /* 数独以外几个游戏的关卡名：照抄各 *-core.js 的 LEVELS 与板块页下拉框（check-today 对着下拉框校验）。
     首页不为三行字加载三个题目引擎，所以设置也在这里按同样的钳位规则读 */
  var GAME_LEVELS = {
    huochai: [{ name: '拿走一根', note: '10 以内' }, { name: '添上一根', note: '10 以内' }, { name: '挪一挪', note: '10 以内' }, { name: '两位数挑战', note: '20 以内' }],
    mima: [{ name: '点点入门' }, { name: '双色点' }, { name: '读题破译' }, { name: '大侦探' }],
    zhizhi: [{ name: '迷你涂画', note: '5×5' }, { name: '小小图案', note: '8×8' }, { name: '大发现', note: '10×10' }, { name: '像素大师', note: '12×12' }],
    migong: [{ name: '起步小路', note: '10 以内加法' }, { name: '岔路寻踪', note: '10 以内加减' }, { name: '进位翻山', note: '20 以内进位加' }, { name: '终极大冒险', note: '20 以内加减' }]
  }
  var GAME_RULES = {
    huochai: { unit: '题', max: 10, def: 5 },
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
    var count = clamp(s.count, 1, GAME_RULES[key].max, GAME_RULES[key].def || 4)
    var copies = clamp(s.copies, 1, 2, 2)
    var meta = [count + ' ' + GAME_RULES[key].unit]
    if (lv.note) meta.push(lv.note)
    meta.push(copies > 1 ? '2 份（同题对战）' : '1 份')
    return {
      key: key,
      level: no,
      title: '第 ' + no + ' 关 · ' + lv.name,
      meta: meta.join(' · '),
      minutes: minutes(count * GAME_MIN[key][no - 1]),
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
      games: ['huochai', 'mima', 'migong', 'zhizhi'].map(function (k) { return gameCard(storage, k) })
    }
  }

  /* ---------- 扫码登记带来的提示（纸记录见 js/sheets-core.js） ----------
     store 要有 keys / getString / get（js/store.js；测试里用内存桩）。today 为 YYYY-MM-DD。
     返回：还有几张没登记（及最近一张的纸号）、口算该不该升档、奥数哪课该再练 / 待复习几课、
     游戏上次自动升降关（可撤销）。 */
  function markNotes(store, today) {
    var SC = root.SumSum.sheetsCore
    var out = { pending: 0, pendingId: null, kousuanUp: null, aoshuRetry: null, aoshuDue: [], games: [] }
    if (!SC || !store || !store.keys) return out
    var recs
    try { recs = SC.records(store) } catch (e) { return out }
    var pend = SC.pending(recs.map(function (r) {
      /* 识字每日卷在识字页登记过也算：sheets.markDone 会写 done */
      return r
    }), today)
    out.pending = pend.length
    out.pendingId = pend.length ? pend[0].id : null

    var K = root.SumSum.settings
    if (K) {
      var label = SC.kousuanUpgrade(recs.filter(function (r) { return r.module === 'kousuan' }), K.PRESETS)
      var cur = K.sanitize(store.get('sumsum:settings:v1') || {})
      /* 已经换到那一档了就不再提示 */
      if (label && K.presetOf(cur) !== label) out.kousuanUp = label
    }

    var learned = store.get(SC.AOSHU_LEARNED)
    learned = Array.isArray(learned) ? learned : []
    var lastAo = null
    recs.forEach(function (r) {
      if (r.module === 'aoshu' && SC.rated(r) && !(r.ref && r.ref.review) && (!lastAo || SC.ratedAt(r) > SC.ratedAt(lastAo))) lastAo = r
    })
    if (lastAo) {
      var u = (lastAo.units || [])[0]
      if (u && SC.levelOf(lastAo, u.key) === 'bad' && learned.indexOf(u.key) < 0) {
        out.aoshuRetry = { id: u.key, label: u.label }
      }
    }
    var due = store.get(SC.AOSHU_DUE)
    out.aoshuDue = Array.isArray(due) ? due.filter(function (x) { return typeof x === 'string' }) : []

    ;['shudu', 'huochai', 'mima', 'migong', 'zhizhi'].forEach(function (m) {
      var last = null
      recs.forEach(function (r) {
        if (r.module === m && SC.rated(r) && (!last || SC.ratedAt(r) > SC.ratedAt(last))) last = r
      })
      var a = last && last.applied
      if (!a || !a.changed || a.undone) return
      var f = m === 'shudu' ? 'clues' : 'level'
      var now = store.get(SC.gameKey(m)) || {}
      if (now[f] !== a.next) return /* 之后家长自己改过，就不提了 */
      var shown = {}
      shown[f] = a.next
      out.games.push({
        module: m,
        recId: last.id,
        up: SC.levelOf(last) === 'good',
        text: SC.MODULE_LABEL[m] + '按上次反馈' + (SC.levelOf(last) === 'good' ? '加难' : '降难') + '到' + SC.gameLevelText(m, shown)
      })
    })
    return out
  }

  /* 奥数「这一课再练一张」：给这一课的种子账本换个新种子（保留 sig），进奥数页就是新一批题 */
  function rollAoshu(store, topicId) {
    var KEY = 'sumsum:aoshu:batches:v1'
    var b = store.get(KEY)
    if (!isObj(b) || !isObj(b[topicId])) return false
    var next = Object.assign({}, b)
    next[topicId] = Object.assign({}, b[topicId], { seed: Math.floor(Math.random() * 999999999) + 1 })
    store.set(KEY, next)
    return true
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.today = { build: build, markNotes: markNotes, rollAoshu: rollAoshu, pinyinCard: pinyinCard, GAME_LEVELS: GAME_LEVELS, minutes: minutes }
})(typeof window !== 'undefined' ? window : globalThis)
