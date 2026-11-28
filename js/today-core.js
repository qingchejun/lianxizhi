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
    migong: [1, 2, 3, 4],
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
      /* 写字（统编版写字表，2026-11-28 起和认字的字表分开选，认字用某恩也有）：该练哪一课 */
      xie: root.SumSum.shiziXie ? (function () {
        var xl = root.SumSum.shiziXie.pickFor(s)
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
    /* 2026-11-28 出题方式：按教材 / 按难度。标题用「人教一上 · 20 以内的进位加法」「加减 3 级 · …」或自己难度的名字 */
    var KM = root.SumSum.kousuanMode
    var km = readJson(storage, 'sumsum:kousuan:mode:v1')
    /* 还没存出题方式：口算页默认选「默认难度」（参数就是本机原来的设置或出厂参数） */
    if (!isObj(km)) km = {}
    if (KM) {
      var st = { get: function (k) { return readJson(storage, k) } }
      var plans = KM.readPlans(st)
      KM.withDefault(plans, raw)
      var cm = KM.cleanMode(km, plans)
      var r = KM.resolve(cm, plans)
      if (r.engine === 'tags') {
        preset = r.label
        meta = [s.count + ' 题', s.columns + ' 列', PAPER_LABELS[s.paper]]
      } else if (cm.pick !== 'p:' + KM.DEFAULT_ID) {
        meta.unshift(r.label) /* 默认难度就不写了，跟改版前一样 */
      }
    }
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
    huochai: [{ name: '拿走一根', note: '10 以内' }, { name: '添上一根', note: '10 以内' }, { name: '挪一挪', note: '10 以内' }, { name: '两位数', note: '20 以内' }],
    mima: [{ name: '单色点' }, { name: '双色点' }, { name: '读题破译' }, { name: '大侦探' }],
    zhizhi: [{ name: '迷你涂画', note: '5×5' }, { name: '小小图案', note: '8×8' }, { name: '大发现', note: '10×10' }, { name: '像素大师', note: '12×12' }],
    migong: [{ name: '小小迷宫', note: '8×8' }, { name: '小探险', note: '12×12' }, { name: '大迷宫', note: '16×16' }, { name: '超大迷宫', note: '20×20' }]
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
      title: ['入门', '简单', '中等', '挑战'][no - 1] + ' · ' + lv.name, /* 四档难度，不叫「第几关」（2026-11-25） */
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
     返回：各板块还有几张没打分（pendingBy，按板块分开）、口算该不该升档、奥数哪课该再练 / 待复习几课。
     游戏 2026-11-27 起不打分。 */
  function markNotes(store, today) {
    var SC = root.SumSum.sheetsCore
    var out = { pending: 0, pendingBy: [], kousuanUp: null, aoshuRetry: null, aoshuDue: [] }
    if (!SC || !store || !store.keys) return out
    var recs
    try { recs = SC.records(store) } catch (e) { return out }
    /* 识字、拼音打过分：mark-panel 提交时写 done */
    SC.PRACTICE.forEach(function (m) {
      var n = SC.pending(recs, today, m).length
      if (n) out.pendingBy.push({ module: m, label: SC.MODULE_LABEL[m], n: n })
      out.pending += n
    })

    /* 升级提示（2026-11-28 改成难度预设）：同一级连着两张全对或只错 1 题 → 提示升到同一类的下一级。
       各类之间插一个空档，加减 5 级不会提示「乘法 1 级」 */
    var KT = root.SumSum.kousuanTags
    if (KT) {
      var ladder = []
      ;['as', 'mul', 'div'].forEach(function (g) {
        for (var n = 1; n <= 5; n++) ladder.push({ label: KT.levelId(g, n) })
        ladder.push({ label: '' })
      })
      var up = SC.kousuanUpgrade(recs.filter(function (r) { return r.module === 'kousuan' }), ladder)
      var km = store.get('sumsum:kousuan:mode:v1')
      /* 已经换到那一级了就不再提示 */
      if (up && !(km && km.kind === 'level' && km.pick === up)) {
        out.kousuanUp = up
        out.kousuanUpName = KT.levelName(up)
      }
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

    return out
  }

  /* 7 天会员体验（2026-11-27）：me = 中间层写进网页的登录信息（__SUMSUM_ME）。
     体验期最后 2 天提醒还剩几天；结束后 7 天内说一句「已结束」，之后不再提；会员账号、没登录的不提 */
  var DAY_MS = 86400000
  function trialNote(me, now) {
    if (!me || !me.ok || me.base !== 'free') return null
    var until = Number(me.full_until) || 0
    if (!until) return null
    if (until > now) {
      var days = Math.ceil((until - now) / DAY_MS)
      return days <= 2 ? { left: days } : null
    }
    return now - until < 7 * DAY_MS ? { ended: true } : null
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
  root.SumSum.today = { build: build, markNotes: markNotes, trialNote: trialNote, rollAoshu: rollAoshu, pinyinCard: pinyinCard, GAME_LEVELS: GAME_LEVELS, minutes: minutes }
})(typeof window !== 'undefined' ? window : globalThis)
