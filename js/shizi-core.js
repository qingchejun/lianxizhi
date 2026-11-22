/**
 * 识字板块的核心：把一整张字表按「第几周」切出该印的那一批字。
 *
 * 这个板块没有随机、没有生成算法 —— 字表是固定的、顺序是洪恩排好的、
 * 复习就是照着顺序一周一批走过去，所以这里全是纯粹的下标计算。
 * 正因为简单，反而容易在边界上出错（最后一周、越界的周次、每周字数被改过之后
 * 原来的周次还指向哪里），边界都在 sliceOf / clampWeek 里收口。
 *
 * 无 DOM 依赖，node 里可直接 require（tools/check-shizi.js 靠这一点）。
 */
(function (root) {
  'use strict'

  /*
   * 纳入复习的字数。字表原始有 1620 字（9 屏 × 180），孩子在洪恩上学到第 1595 字，
   * 取整到 1600 —— 正好 16 周 × 100 字，不用处理「最后一周只有 95 个字、
   * 格子要不要跟着变大」这种一次性的碎问题。
   * 将来想把剩下的 20 字也纳进来，改这一个数即可（周次会自动变成 17 周）。
   */
  var TOTAL = 1600

  function list() {
    return root.SumSum.shiziData.LIST
  }

  /* 实际参与复习的字表（前 TOTAL 个）。字表比 TOTAL 短时以字表为准，不会越界。 */
  function pool() {
    return list().slice(0, Math.min(TOTAL, list().length))
  }

  function poolSize() {
    return Math.min(TOTAL, list().length)
  }

  /* 每周 perWeek 个字，一共要走几周。末周不满也算一周。 */
  function totalWeeks(perWeek) {
    var n = Math.max(1, perWeek | 0)
    return Math.max(1, Math.ceil(poolSize() / n))
  }

  function clampWeek(week, perWeek) {
    var w = Math.round(Number(week) || 1)
    return Math.min(totalWeeks(perWeek), Math.max(1, w))
  }

  /*
   * 第 week 周该印哪些字。
   * from / to 是给人看的序号（1 起算，闭区间），chars 是字符数组。
   * 末周不满时 chars.length < perWeek —— 渲染层要按 chars.length 排版，
   * 不能按 perWeek 排，否则末页会多出一片空格子。
   */
  function sliceOf(week, perWeek) {
    var n = Math.max(1, perWeek | 0)
    var w = clampWeek(week, n)
    var start = (w - 1) * n
    var chars = pool().slice(start, start + n)
    return {
      week: w,
      weeks: totalWeeks(n),
      from: start + 1,
      to: start + chars.length,
      chars: chars
    }
  }

  /*
   * 换每周字数时，周次怎么跟着搬。
   *
   * week 存的是序数不是字序，所以光改 perWeek 会让同一个 week 指向完全不同的字：
   * 第 16 周在「每周 100 字」下是第 1501–1600 字，在「每周 50 字」下却成了第 751–800 字，
   * 复习进度凭空倒退 750 个字。正确做法是【停在同一个字上】：取当前这周的起始字序，
   * 算出在新的每周字数下，包含这个字的是第几周。
   *
   * 放在 core 而不是 main，与数独的 remapClues 一样 —— 一来这是纯计算，
   * 二来放 main 里 tools/check-shizi.js 就够不着了（main 依赖 DOM）。
   */
  function remapWeek(week, fromPerWeek, toPerWeek) {
    var to = Math.max(1, toPerWeek | 0)
    var from = sliceOf(week, fromPerWeek).from // 当前这周的起始字序，1 起算
    return clampWeek(Math.floor((from - 1) / to) + 1, to)
  }

  /* ================= 人教版字表（2026-11 加） =================
   *
   * 洪恩是一张长表、按周往下走；人教版是按课排的，家长设「学校学到第几课」，
   * 每日一卷的认识字只从已经教过的课里抽，「单元检查」按单元整块印。
   * 当前用哪套字由 useBook() 设定（页面按设置调一次）。它只影响：
   *   每日一卷的认识字池 knownPool()、sortByTable 的排序依据、slice() 印哪一段。
   * 洪恩那一套（pool / sliceOf / clampWeek / remapWeek）原样不动，周次照旧只按洪恩算。
   */
  var HONGEN = 'hongen'
  var cur = { book: HONGEN, lesson: 0 }

  function rjBooks() {
    var d = root.SumSum.shiziRjData
    return (d && d.BOOKS) || {}
  }

  function hasBook(book) {
    return book === HONGEN || Object.prototype.hasOwnProperty.call(rjBooks(), book)
  }

  /* 一册书拍平成课的列表：i 从 1 起算，跨单元连续编号（「学到第几课」存的就是它） */
  function lessonsOf(book) {
    var b = rjBooks()[book]
    if (!b) return []
    var out = []
    b.units.forEach(function (u, ui) {
      u.lessons.forEach(function (l) {
        out.push({ i: out.length + 1, unit: ui + 1, unitName: u.name, kind: u.kind, t: l[0], name: l[1], chars: Array.from(l[2]) })
      })
    })
    return out
  }

  function clampIndex(v, max, dflt) {
    var n = Math.round(Number(v))
    if (!Number.isFinite(n) || n <= 0) n = dflt /* 0 / 空 = 取默认（学到第几课的 0 表示整册） */
    return Math.min(max, Math.max(1, n))
  }

  /* 按字去重、保持先后（书上蓝色的多音字第二次出现时不重复算） */
  function uniq(chars) {
    var seen = {}
    return chars.filter(function (ch) {
      if (seen[ch]) return false
      seen[ch] = true
      return true
    })
  }

  /* 学到第 lesson 课为止教过的全部字 */
  function learnedChars(book, lesson) {
    var ls = lessonsOf(book)
    if (!ls.length) return []
    var n = clampIndex(lesson, ls.length, ls.length)
    var all = []
    ls.slice(0, n).forEach(function (l) { Array.prototype.push.apply(all, l.chars) })
    return uniq(all)
  }

  function unitCount(book) {
    var b = rjBooks()[book]
    return b ? b.units.length : 0
  }

  /* 一个单元的全部字（单元内去重），给「单元检查」整块印 */
  function unitSlice(book, unit) {
    var units = unitCount(book)
    var u = clampIndex(unit, Math.max(1, units), 1)
    var ls = lessonsOf(book).filter(function (l) { return l.unit === u })
    var all = []
    ls.forEach(function (l) { Array.prototype.push.apply(all, l.chars) })
    var b = rjBooks()[book]
    return {
      week: u,
      weeks: units,
      chars: uniq(all),
      unitName: b ? b.units[u - 1].name : '',
      kind: b ? b.units[u - 1].kind : '',
      range: ls.length ? ls[0].t + ' – ' + ls[ls.length - 1].t : ''
    }
  }

  /* 课的显示名：「课文 4《四季》」「语文园地五」「拼音 3 b p m f」 */
  function lessonLabel(l) {
    if (!l) return ''
    if (!l.name) return l.t
    return /^拼音/.test(l.t) ? l.t + ' ' + l.name : l.t + '《' + l.name + '》'
  }

  function useBook(book, lesson) {
    cur = { book: hasBook(book) ? book : HONGEN, lesson: Number(lesson) || 0 }
  }

  function currentBook() {
    return cur.book
  }

  /* 每日一卷的认识字池：洪恩 = 前 TOTAL 个字；人教版 = 学到的课为止 */
  function knownPool() {
    return cur.book === HONGEN ? pool() : learnedChars(cur.book, cur.lesson)
  }

  /*
   * 「本周复习 / 单元检查」这一页签印哪一段，统一出口。
   * 洪恩：照旧按周（sliceOf）；人教版：按 s.unit 整个单元。
   * 返回里 week/weeks 是给进度条和前后按钮用的序号（人教版就是第几单元/共几单元）。
   */
  function slice(s) {
    var book = s && hasBook(s.book) ? s.book : HONGEN
    if (book === HONGEN) {
      var sl = sliceOf(s.week, s.perWeek)
      sl.book = HONGEN
      sl.label = '第 ' + sl.week + ' 周'
      sl.unitWord = '周'
      sl.range = '第 ' + sl.from + '–' + sl.to + ' 字'
      return sl
    }
    var u = unitSlice(book, s.unit)
    u.book = book
    u.from = 1
    u.to = u.chars.length
    u.label = u.unitName
    u.unitWord = '单元'
    return u
  }

  /*
   * 按课的掌握情况（人教版「历史」页签用）：每课的字里，
   *   wrong 现在还在错字集（没认出 / 等复核）、out 错过但已学会；其余是没错过的。
   * 一个字出现在两课（书上蓝字）时两课都算。
   */
  function lessonStats(book, lesson, marks) {
    var ls = lessonsOf(book)
    var learned = clampIndex(lesson, Math.max(1, ls.length), ls.length)
    return ls.map(function (l) {
      var row = { i: l.i, unit: l.unit, unitName: l.unitName, label: lessonLabel(l), total: uniq(l.chars).length,
        wrong: [], once: [], out: [], taught: l.i <= learned }
      uniq(l.chars).forEach(function (ch) {
        var e = marks && marks[ch]
        if (!e || typeof e !== 'object') return
        var st = stateOf(e)
        if (st === 'out') row.out.push(ch)
        else if (st === 'once') row.once.push(ch)
        else row.wrong.push(ch)
      })
      return row
    })
  }

  /*
   * 把一批字按【字表顺序】排好，顺带去重。
   *
   * 错字集是家长一个一个点出来的，顺序是点击的先后，印成卷子会显得杂乱。
   * 按字表下标排之后，同一课、同一屏的字自然聚在一起，孩子读起来是有上下文的。
   * 字表里没有的字（理论上不会有，但别让它凭空消失）排到最后，保持原相对顺序。
   *
   * 纯函数放在 core 而不是 shizi-mark，是为了 tools/check-shizi.js 够得着 ——
   * mark 那一层依赖 DOM 和 localStorage，node 里跑不了。与 remapWeek 同一个理由。
   */
  function sortByTable(chars) {
    if (!chars || !chars.length) return []
    /* 用人教版时按课本顺序排（同一课的字聚在一起），课本外的字再按洪恩顺序 */
    var all = cur.book === HONGEN ? list() : learnedChars(cur.book, 9999).concat(list())
    var rank = {}
    for (var i = 0; i < all.length; i++) {
      /* 同一个字在表里只应出现一次；万一重复，以第一次出现的位置为准 */
      if (rank[all[i]] == null) rank[all[i]] = i
    }
    var seen = {}
    var out = []
    chars.forEach(function (ch) {
      if (seen[ch]) return
      seen[ch] = true
      out.push(ch)
    })
    return out
      .map(function (ch, i) {
        /* 表外的字给一个比表长还大的名次，并用录入顺序 i 做次级键，排在最后且保持原序 */
        return { ch: ch, r: rank[ch] == null ? all.length + i : rank[ch] }
      })
      .sort(function (a, b) {
        return a.r - b.r
      })
      .map(function (e) {
        return e.ch
      })
  }

  /*
   * 从错字集里挑一批，附在本周复习卷后面。
   *
   *   pool     错字集里全部的字（顺序无所谓）
   *   exclude  本周卷上已经印了的字。同一沓纸里同一个字印两遍是浪费 ——
   *            孩子刚念完一遍，翻一页又是它，附页的格子该留给早几周的旧账。
   *   max      最多挑几个。少于这个数就全给，这是调用方定的策略，这里只执行。
   *   rnd      取随机数的函数，默认 Math.random。注入是为了 tools/check-shizi.js
   *            能喂一串定死的数，把「挑出来的是不是真的均匀」算清楚。
   *   weight   每个字的抽中权重（见 reviewWeight），不给就人人一样。权重 0 的不抽。
   *            错得越多的字越容易被抽到，但不是「只抽错得最多的」—— 那样附页每周都是
   *            同一批字，错一两次的永远轮不上。
   *
   * 【挑是随机的，印出来是有序的】：返回值过一遍 sortByTable。
   * 理由同错字卷 —— 同一课的字聚在一起，孩子读的时候是有上下文的；
   * 而且卷面顺序固定，家长核对起来不用来回找。
   */
  function sampleWrong(pool, exclude, max, rnd, weight) {
    if (!pool || !pool.length || !(max > 0)) return []
    var skip = {}
    ;(exclude || []).forEach(function (ch) {
      skip[ch] = true
    })
    var cand = []
    var seen = {}
    var w = weight || function () {
      return 1
    }
    pool.forEach(function (ch) {
      if (!ch || skip[ch] || seen[ch] || !(w(ch) > 0)) return
      seen[ch] = true
      cand.push(ch)
    })
    if (cand.length <= max) return sortByTable(cand)
    /* 带权不放回抽样（Efraimidis–Spirakis）：每个字抽一个 -ln(u)/权重，取最小的 max 个。
       权重全一样时就是等概率抽 max 个。 */
    var r = rnd || Math.random
    return sortByTable(cand.map(function (ch) {
      return { ch: ch, k: -Math.log(1 - r()) / w(ch) }
    }).sort(function (a, b) {
      return a.k - b.k
    }).slice(0, max).map(function (e) {
      return e.ch
    }))
  }

  /*
   * 附页抽字的权重：累计错的次数 × 2（红底）或 × 1（半红，上次复习认出来了）。
   * 已经移出的是 0，不抽。错 4 次的红底字（8）被抽中的机会大约是错 1 次的半红字（1）的 8 倍。
   */
  function reviewWeight(e) {
    var st = stateOf(e)
    if (st === 'out') return 0
    return markCount(e) * (st === 'wrong' ? 2 : 1)
  }

  /* 进出规则、累计次数与 v3 记录形状见下面「每日一卷」那一节；缺 n 的老记录
     （v1 迁移过来的、v2 早期的）一律当作错过 1 次。永远返回新对象，不改传进来的 entry。 */
  function markCount(e) {
    return e ? e.n || 1 : 0
  }

  /*
   * ============ 每日一卷：进出规则、到期挑选、登记（2026-11-18 与用户定的） ============
   *
   * 答应孩子每天只认 20 个字，错字包含在这 20 里（最多占 10 个位）：
   *   进集 / 又错 → 第 2 天考，之后天天都在候选里（近 7 天的错字自然天天在卷上）；
   *   认出一次 → 下架，隔 3 天回来复核：复核认出 → 毕业；复核没认出 → 回炉接着滚；
   *   毕业后再错 → 重新进集，n 接着累计（错得越多排得越靠前）。
   * 挑错字位的顺序：最逾期的在前（复核到期的先伺候毕业）；同日错得多的优先；
   * 再同先错的先上（老字优先，不再掷随机）。
   *
   * 记录仍是 v3（键 sumsum:shizi:wrong:v3），字段一个没变；上一版阶梯
   * （首错认 2 次 / 错多次认 4 次、隔 3/7/15 天）攒到 k≥2 的在集字由 normalizeWrong
   * 换规当天直接毕业。v2/v1 由 migrateWrong 迁入，旧键留着不删。
   *
   * entry 字段：add=本轮进集日，n=累计错过次数，k=本轮连续认出次数（换规后只有 0 / 1），
   * due=下次到期日（'' 或过去的日子都算到期），hit/fail=最近一次认出/又错的日子
   * （只为「同一天不重复记」和复习记录重算），out=毕业日，first=第一次错的日子。
   */

  /* [0]：进集/又错后第 2 天考（markFail 里直接写死 +1，这里只作记录）；
     [1]：认出一次后隔 3 天复核。毕业只需认出 2 次，用不到更长的间隔。 */
  var PASS_INTERVALS = [1, 3]

  /* 2026-11-18 起统一：认出 2 次（当场 + 隔 3 天复核）毕业，不再按错几次分档 */
  function passesNeeded() {
    return 2
  }

  /* 'YYYY-MM-DD' 加 n 天。用本地时间构造再取回来：toISOString 走 UTC，
     北京时间早上 8 点前会把日期挪回前一天（today() 那条注释的同一个坑）。 */
  function addDays(d, n) {
    var p = String(d || '').split('-')
    if (p.length !== 3) return ''
    var dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + n)
    var z = function (v) {
      return (v < 10 ? '0' : '') + v
    }
    return dt.getFullYear() + '-' + z(dt.getMonth() + 1) + '-' + z(dt.getDate())
  }

  /* v3 的状态：k≥1 = 半红（攒认出次数中），k=0 = 红底，out/null = 不在集 */
  function stateOf(e) {
    if (!e || e.out) return 'out'
    return (e.k || 0) >= 1 ? 'once' : 'wrong'
  }

  /* 把 first 搬去新条目、去掉值为 undefined 的键（存起来干净） */
  function keepFirst(e, o) {
    if (e && e.first) o.first = e.first
    Object.keys(o).forEach(function (k) {
      if (o[k] === undefined) delete o[k]
    })
    return o
  }

  /* 新收进错字集（登记时点了的字）。以前错过的不清零，n 接着加 —— 再错重新攒复核 */
  function markEnter(e, t) {
    if (e && !e.out) return e // 已经在集里：进集这条路由 markFail 表达，这里不动
    var o = keepFirst(e, { add: t, n: markCount(e) + 1, k: 0, due: addDays(t, 1) })
    if (!e && !o.first) o.first = t // 头一回错就是今天（历史统计靠 first 显示「最早错于」）；
    return o                        // 老墓碑缺 first 的照旧缺着，历史页拿 add 顶（同 v2 口径）
  }

  /* 又没认出：k 归 0、n +1、明天再考。今天动过（进/错/认出）的字一律原样返回 ——
     同一天登记两张都带着它，也只记一次 */
  function markFail(e, t) {
    if (!e || e.out) return e
    if (e.add === t || e.fail === t || e.hit === t) return e
    return keepFirst(e, { add: e.add, n: markCount(e) + 1, k: 0, due: addDays(t, 1), fail: t })
  }

  /* 认出来了（登记时没点的字）：k + 1；认出 2 次（当场 + 复核）就毕业（墓碑只剩 n/first） */
  function markPass(e, t) {
    if (!e || e.out) return e
    if (e.add === t || e.fail === t || e.hit === t) return e
    var n = markCount(e)
    var k = (e.k || 0) + 1
    if (k >= passesNeeded(n)) return keepFirst(e, { n: n, out: t })
    return keepFirst(e, { add: e.add, n: n, k: k, due: addDays(t, PASS_INTERVALS[k]), hit: t })
  }

  /* v2/v1 记录迁进 v3。在集的字一律 due=今天：一轮刚走完，从今天开始按新阶梯走。
     v1 的 {add:''} 与缺 n 的老条目当作 n=1 的红底（同 markCount 的口径）。 */
  function migrateWrong(raw, t) {
    var out = {}
    if (!raw || typeof raw !== 'object') return out
    Object.keys(raw).forEach(function (ch) {
      var e = raw[ch]
      if (!e || typeof e !== 'object' || (typeof e.add !== 'string' && typeof e.out !== 'string')) return
      var o
      if (e.out) {
        o = { n: markCount(e), out: e.out }
      } else {
        o = { add: e.add, n: markCount(e), k: e.hit ? 1 : 0, due: t }
      }
      out[ch] = keepFirst(e, o)
    })
    return out
  }

  /* 2026-11-18 换规：老阶梯时代在集、已认出 2 次以上（k≥2）的字，新规则下早就够
     毕业了（否则它们的 due 是按 7/15 天排的，还得干等）。加载时直接毕业，其余原样。
     换规收尾后 markPass 在 k=2 就落 out，在集的 k≥2 不会再出现，这是趟一次性迁移。 */
  function normalizeWrong(raw, t) {
    var out = {}
    Object.keys(raw || {}).forEach(function (ch) {
      var e = raw[ch]
      if (!e || typeof e !== 'object' || (typeof e.add !== 'string' && typeof e.out !== 'string')) return
      if (!e.out && (e.k || 0) >= 2) {
        out[ch] = keepFirst(e, { n: markCount(e), out: t })
        return
      }
      out[ch] = e
    })
    return out
  }

  var DAILY_SIZE = 20
  var DAILY_WRONG_MAX = 10

  function shuffle(a, rnd) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1))
      var tmp = a[i]
      a[i] = a[j]
      a[j] = tmp
    }
    return a
  }

  /*
   * 到期（due ≤ 今天）的错字，最逾期的排前面；一样逾期的话错得多的优先；
   * 再一样先错的先上（first 早的在前 —— 2026-11-18 与用户定的「从每周一的错字开始」，
   * 取代原先的随机决胜：哪 10 个字上卷不再看运气）。''（v1 迁移来等）比任何日期都小、
   * 最先到期。rnd 参数留着兼容旧调用，已不参与排序。
   */
  function dueList(marks, t, rnd) {
    var arr = []
    Object.keys(marks || {}).forEach(function (ch) {
      var e = marks[ch]
      if (!e || e.out) return
      if (e.due && e.due > t) return
      arr.push({ ch: ch, due: e.due || '', n: markCount(e), f: e.first || e.add || '' })
    })
    arr.sort(function (a, b) {
      return (a.due < b.due ? -1 : a.due > b.due ? 1 : 0) || b.n - a.n ||
        (a.f < b.f ? -1 : a.f > b.f ? 1 : 0)
    })
    return arr.map(function (x) {
      return x.ch
    })
  }

  /*
   * 构建今天这一卷：≤10 个到期错字 + 认识字补满 20，显示顺序整体打乱
   * （错字混在认识字里，卷面上看不出哪些是复习位）。
   * 认识字池 = 当前字表（knownPool：洪恩全表 / 人教版学到的课）里不在错字集的字（毕业的算认识），完全随机。
   * 卷子一经生成就冻结，由 shizi-mark 存进 daily:v1。
   */
  function buildDaily(marks, t, rnd) {
    var r = rnd || Math.random
    var inSet = {}
    Object.keys(marks || {}).forEach(function (ch) {
      var e = marks[ch]
      if (e && !e.out) inSet[ch] = true
    })
    /* 「没认出 → 明天接着考」是硬承诺：due 正好落在卷子日期上的（昨晚新收的、
       当天到期复核的）先占位，不许被逾期积压挤掉；余下的位子再按最逾期优先补。
       2026-11-18 用户实测：积压满 10 个时新错的字全被挤出卷，才把这条提到最前。 */
    var fresh = []
    var late = []
    dueList(marks, t, r).forEach(function (ch) {
      ;((marks[ch].due || '') === t ? fresh : late).push(ch)
    })
    var wrong = fresh.concat(late).slice(0, DAILY_WRONG_MAX)
    var known = shuffle(knownPool().filter(function (ch) {
      return !inSet[ch]
    }), r).slice(0, DAILY_SIZE - wrong.length)
    return { wrong: wrong, known: known, chars: shuffle(wrong.concat(known), r) }
  }

  /*
   * 登记一批卷面。picked 里是「点了 = 没认出」的字：
   *   点了：在集的又错一次（markFail），白底的收进错字集（markEnter）；
   *   没点：在集的认出一次（markPass），白底的不动。
   * 返回新 marks（不改传入）和 seen（这次记进复习记录的旧错字，新收进的不算）。
   * 幂等由 markFail / markPass 的「今天动过就跳过」保证：同一天登记两张卷
   * 都带着同一个字，也只记一次。
   */
  function settleApply(marks, chars, picked, t) {
    var out = Object.assign({}, marks || {})
    var seen = []
    ;(chars || []).forEach(function (ch) {
      var e = out[ch]
      var inSet = !!e && !e.out
      if (picked && picked[ch]) {
        if (inSet) {
          out[ch] = markFail(e, t)
          seen.push(ch)
        } else {
          out[ch] = markEnter(e, t)
        }
      } else if (inSet) {
        var next = markPass(e, t)
        if (next !== e) {
          out[ch] = next
          seen.push(ch)
        }
      }
    })
    return { marks: out, seen: seen }
  }

  /* 复习记录当天那行的数字按当前 marks 重算（登记后又点、反悔再点，都跟着变）。
     ok 含当天毕业的，与 v2 时代 refreshLog 同一个口径，历史页签的表头不用动。 */
  function refreshRow(row, marks, t) {
    var ok = 0
    var miss = 0
    var out = 0
    Array.from(row.seen).forEach(function (ch) {
      var e = marks[ch]
      if (!e) return
      if (!e.out && (e.add === t || e.fail === t)) miss++
      else if (e.out === t) out++
      else if (e.hit === t) ok++
    })
    row.ok = ok + out
    row.miss = miss
    row.out = out
    return row
  }

  /*
   * 历史错字统计：只要错过一次的字都在里面，移出了的也在（这就是「历史错字集」，
   * 和错字集是同一份记录，见「每日一卷」那一节的 entry 说明）。
   * 按累计次数从多到少分组，同一组里按字表顺序，免得每次打开顺序都在变。
   * 被人手改坏的条目跳过，判断口径同 shizi-mark 的 load。
   */
  function historyStats(marks) {
    var out = { total: 0, inSet: 0, once: 0, out: 0, times: 0, groups: [] }
    if (!marks || typeof marks !== 'object') return out
    var byN = {}
    var info = {}
    Object.keys(marks).forEach(function (ch) {
      var e = marks[ch]
      if (!e || typeof e !== 'object' || (typeof e.add !== 'string' && typeof e.out !== 'string')) return
      var st = stateOf(e)
      var n = markCount(e)
      out.total++
      out.times += n
      if (st === 'out') out.out++
      else out.inSet++
      if (st === 'once') out.once++
      var add = e.add || ''
      var fail = e.fail || ''
      info[ch] = { ch: ch, n: n, st: st, first: e.first || add, last: fail > add ? fail : add }
      ;(byN[n] = byN[n] || []).push(ch)
    })
    out.groups = Object.keys(byN).map(Number).sort(function (a, b) {
      return b - a
    }).map(function (n) {
      return {
        n: n,
        items: sortByTable(byN[n]).map(function (ch) {
          return info[ch]
        })
      }
    })
    return out
  }

  /*
   * 练习纸标题。用户在面板上填了标题就用他的，这里只管默认的那一行。
   *
   * 标题【必须短】。页眉是 .sheet-title + .sheet-meta 一行排开，两者都是
   * white-space: nowrap（css/sheet.css），换不了行；「日期 姓名 用时 得分」
   * 那一栏就占掉 99mm，标题只剩 73mm 可用（180 - 99 - 8mm 间距）。
   * 一旦超出，页眉不会截断也不会换行 —— 浏览器会把【整张纸】等比缩到能装下为止。
   * 缩完页眉那条横线仍然满宽（它是 width:auto，跟着页框走），所以从横线上
   * 完全看不出来；露馅的是字格：按 mm 写死的尺寸全跟着缩。
   *
   * 原先标题是「识字复习 · 第 1 周（第 1–100 字）」，96.8mm，连同页眉信息栏
   * 合计 204mm，整页被缩到 88%，字从 10.6mm 缩成 9.4mm、字格离右边空出一截。
   * 字序区间页脚里本来就有（「第 1 周 / 共 16 周 · 第 1–100 字」），标题不必再说一遍。
   */
  function titleFor(s) {
    if (s && s.book && s.book !== HONGEN && hasBook(s.book)) return '识字检查 · ' + unitSlice(s.book, s.unit).unitName
    return '识字复习 · 第 ' + clampWeek(s.week, s.perWeek) + ' 周'
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.shizi = {
    TOTAL: TOTAL,
    pool: pool,
    poolSize: poolSize,
    totalWeeks: totalWeeks,
    clampWeek: clampWeek,
    remapWeek: remapWeek,
    sortByTable: sortByTable,
    sampleWrong: sampleWrong,
    reviewWeight: reviewWeight,
    markCount: markCount,
    stateOf: stateOf,
    addDays: addDays,
    PASS_INTERVALS: PASS_INTERVALS,
    passesNeeded: passesNeeded,
    markEnter: markEnter,
    markFail: markFail,
    markPass: markPass,
    migrateWrong: migrateWrong,
    normalizeWrong: normalizeWrong,
    dueList: dueList,
    buildDaily: buildDaily,
    DAILY_SIZE: DAILY_SIZE,
    DAILY_WRONG_MAX: DAILY_WRONG_MAX,
    settleApply: settleApply,
    refreshRow: refreshRow,
    historyStats: historyStats,
    sliceOf: sliceOf,
    HONGEN: HONGEN,
    hasBook: hasBook,
    lessonsOf: lessonsOf,
    learnedChars: learnedChars,
    unitCount: unitCount,
    unitSlice: unitSlice,
    lessonLabel: lessonLabel,
    useBook: useBook,
    currentBook: currentBook,
    knownPool: knownPool,
    slice: slice,
    lessonStats: lessonStats,
    titleFor: titleFor
  }
})(typeof window !== 'undefined' ? window : globalThis)
