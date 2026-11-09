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
    var all = list()
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
   * ============ 每日一卷（2026-11）：间隔阶梯、到期挑选、登记 ============
   *
   * 错字集从「进一出二」升级成间隔阶梯（与用户 2026-11-09 定的）：
   *   进集 / 又错 → 第 2 天考；认出一次后隔 3 天，再 7 天，再 15 天；
   *   首错字（n=1）认出 2 次毕业，错过 2 次以上（n≥2）要认出 4 次；
   *   任一步没认出：k 归 0、n +1，明天再考。
   * 记录升级为 v3（键 sumsum:shizi:wrong:v3），v2/v1 由 migrateWrong 迁入，旧键留着不删。
   *
   * entry 字段：add=本轮进集日，n=累计错过次数，k=本轮连续认出次数，
   * due=下次到期日（'' 或过去的日子都算到期），hit/fail=最近一次认出/又错的日子
   * （只为「同一天不重复记」和复习记录重算），out=毕业日，first=第一次错的日子。
   */

  var PASS_INTERVALS = [1, 3, 7, 15]

  function passesNeeded(n) {
    return n >= 2 ? 4 : 2
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

  /* 新收进错字集（登记时点了的字）。以前错过的不清零，n 接着加 —— 再错自动走四步阶梯 */
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

  /* 认出来了（登记时没点的字）：k + 1；攒够 passesNeeded(n) 次就毕业（墓碑只剩 n/first） */
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
   * 再一样就 rnd() 决胜。''（v1 迁移来等）比任何日期都小、最先到期。
   * rnd 可注入：check-shizi 喂常数把顺序钉死。
   */
  function dueList(marks, t, rnd) {
    var r = rnd || Math.random
    var arr = []
    Object.keys(marks || {}).forEach(function (ch) {
      var e = marks[ch]
      if (!e || e.out) return
      if (e.due && e.due > t) return
      arr.push({ ch: ch, due: e.due || '', n: markCount(e), r: r() })
    })
    arr.sort(function (a, b) {
      return (a.due < b.due ? -1 : a.due > b.due ? 1 : 0) || b.n - a.n || a.r - b.r
    })
    return arr.map(function (x) {
      return x.ch
    })
  }

  /*
   * 构建今天这一卷：≤10 个到期错字 + 认识字补满 20，显示顺序整体打乱
   * （错字混在认识字里，卷面上看不出哪些是复习位）。
   * 认识字池 = 字表里不在错字集里的全部字（毕业的算认识），完全随机。
   * 卷子一经生成就冻结，由 shizi-mark 存进 daily:v1。
   */
  function buildDaily(marks, t, rnd) {
    var r = rnd || Math.random
    var inSet = {}
    Object.keys(marks || {}).forEach(function (ch) {
      var e = marks[ch]
      if (e && !e.out) inSet[ch] = true
    })
    var wrong = dueList(marks, t, r).slice(0, DAILY_WRONG_MAX)
    var known = shuffle(pool().filter(function (ch) {
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
    dueList: dueList,
    buildDaily: buildDaily,
    DAILY_SIZE: DAILY_SIZE,
    DAILY_WRONG_MAX: DAILY_WRONG_MAX,
    settleApply: settleApply,
    refreshRow: refreshRow,
    historyStats: historyStats,
    sliceOf: sliceOf,
    titleFor: titleFor
  }
})(typeof window !== 'undefined' ? window : globalThis)
