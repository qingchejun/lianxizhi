/**
 * 密码推理题目生成（无 DOM 依赖，可在 node 中直接测试）。
 *
 * 题面：一个 N 位、数字不重复的密码，配若干行"猜测"，每行带反馈——
 *   a = 数字对且位置也对的个数（卷面印 ●）
 *   b = 数字对但位置不对的个数（卷面印 ○）
 * 低关卡把 (a,b) 印成点子（不要求读句子），高关卡印成文字，信息完全一样；
 * 难度差在"线索的样子"和位数/数字池，推理方法不变。
 *
 * 质量红线（与数独的「只用唯一候选数」同构）：
 *   ① 每题必须唯一解——全枚举验证（最坏 P(9,4)=3024 个排列，瞬时）；
 *   ② 必须只靠「孩子跟得上的排除动作」推到底——solve() 只会划数字、定位、
 *      行内数名额这几招，绝无"假设试试"。它既是出题的验收标准（makeOne 里
 *      调它，推不动就换题），也是答案页分步解析的来源（推理轨迹原样记下来
 *      就是人话步骤）。
 *
 * 题目对象：{ level, code, rows, trace, key }
 *   rows: [{ g:[…], a, b }]；trace: ['第 1 行全错 → 划掉 9、3、4、1', …]
 */
(function (root) {
  'use strict'

  /* 可复现随机源（mulberry32）。与 js/shudu-core.js、js/generator.js 里的同名
     函数是同一个算法，这里有意再抄一份而不是共享：种子语义各模块独立，
     共享就得给已经正常工作的页面插加载顺序依赖——为 8 行代码不值得。 */
  function makeRandom(seed) {
    var t = seed >>> 0
    return function () {
      t = (t + 0x6d2b79f5) >>> 0
      var r = Math.imul(t ^ (t >>> 15), t | 1)
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
  }

  function shuffle(arr, rnd) {
    for (var k = arr.length - 1; k > 0; k--) {
      var j = Math.floor(rnd() * (k + 1))
      var t = arr[k]; arr[k] = arr[j]; arr[j] = t
    }
    return arr
  }

  /* ---------- 关卡 ---------- */

  /*
   * 循序渐进的"序"落在三处：线索的呈现（点子 → 文字）、数字池大小、位数。
   * 参数是常量但都好调——给儿子试做之后觉得哪关太陡，改一行就行。
   *   bZero：L1 每行反馈必须 b=0（只有 ● 和"全错"），先不引入 ○ 的心智负担
   *   dots：卷面用点子还是文字（mima-render 据此选皮肤）
   *   strip：卷面附不附"划掉数字带"（训练轮）
   */
  var LEVELS = {
    L1: { key: 'L1', no: 1, name: '点点入门', N: 3, pool: [1, 2, 3, 4, 5, 6], rowMin: 4, rowMax: 5, bZero: true, dots: true, strip: true },
    L2: { key: 'L2', no: 2, name: '双色点', N: 3, pool: [1, 2, 3, 4, 5, 6, 7, 8, 9], rowMin: 4, rowMax: 4, bZero: false, dots: true, strip: true },
    L3: { key: 'L3', no: 3, name: '读题破译', N: 3, pool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], rowMin: 4, rowMax: 4, bZero: false, dots: false, strip: false },
    L4: { key: 'L4', no: 4, name: '大侦探', N: 4, pool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], rowMin: 3, rowMax: 4, bZero: false, dots: false, strip: false }
  }

  var LEVEL_ORDER = ['L1', 'L2', 'L3', 'L4']

  function levelOf(key) {
    return LEVELS[key] || LEVELS.L1
  }

  /* ---------- 题目模型 ---------- */

  /* 反馈 (a,b)。密码与猜测的数字都不重复，b = 共有数字数 - a。 */
  function score(guess, code) {
    var a = 0, b = 0
    for (var i = 0; i < guess.length; i++) {
      if (guess[i] === code[i]) a++
      else if (code.indexOf(guess[i]) >= 0) b++
    }
    return [a, b]
  }

  /* 文字皮肤：同一份 (a,b) 的句子化。数字用阿拉伯数字——一年级读数字没问题，
     难的是句子结构。 */
  function clueText(a, b) {
    if (a === 0 && b === 0) return '这些号码都不在密码里'
    if (b === 0) return '只有 ' + a + ' 个号码正确，位置也对'
    if (a === 0) return '有 ' + b + ' 个号码正确，位置都不对'
    return '有 ' + (a + b) + ' 个号码正确，只有 ' + a + ' 个位置正确'
  }

  /* 全枚举：数出与所有线索一致的密码，数到 cap 个就停（唯一性验证用 cap=2）。
     逐位压栈、按池顺序取数，天然保证数字不重复。 */
  function enumerate(pool, N, rows, cap) {
    var found = []
    var used = {}
    var cur = []
    function step() {
      if (found.length >= cap) return
      if (cur.length === N) {
        for (var r = 0; r < rows.length; r++) {
          var fb = score(rows[r].g, cur)
          if (fb[0] !== rows[r].a || fb[1] !== rows[r].b) return
        }
        found.push(cur.slice())
        return
      }
      for (var i = 0; i < pool.length; i++) {
        var d = pool[i]
        if (used[d]) continue
        used[d] = 1
        cur.push(d)
        step()
        cur.pop()
        used[d] = 0
      }
    }
    step()
    return found
  }

  /*
   * 逐步排除求解器——本模块的心脏。
   *
   * 状态：每位一个候选集 cand[pos]（初始全池），placed[pos] 记已定位的数字，
   * inCode 记"确认在密码里"的数字。数字"存活" = 已定位或还在某位候选里。
   * 规则迭代到不动点，全部定位即解出：
   *
   *   R1 划数字：全错行 (0,0) → 行内数字从所有位划掉
   *   R2 行收编：行内存活数字数 == a+b → 这些数全在密码里
   *   R3 单一定位：确认在密码里的数只剩一个可能位置 → 定位
   *   R4 行位置名额：行内【还可能落在自己行位置】的存活数字集合 T
   *      （注意不限于"已确认在密码里"——位置对的数未必先被确认，5827 那道
   *      原题就是靠这步推出 7 在第 4 位）：
   *      |T| == a → T 全部定位；a == 0 → T 从自己的行位置划掉
   *   R5 池收紧：存活数字数 == 未定位位数 → 存活的全在密码里；
   *      某位候选只剩 1 个 → 定位
   *
   * 这里【绝对不能】加假设/回溯分支——它是出题的验收标准（见 makeOne），
   * 一旦能猜，出的题就可能要孩子试错，红线就破了。每次规则触发记一条
   * 人话步骤，答案页按序号印出来就是分步解析。
   */
  function solve(pool, N, rows) {
    var cand = []
    for (var z = 0; z < N; z++) cand.push(new Set(pool))
    var placed = new Array(N).fill(null)
    var inCode = new Set()
    var trace = []

    function aliveSet() {
      var s = new Set(placed.filter(Boolean))
      for (var i = 0; i < N; i++) {
        if (placed[i] == null) cand[i].forEach(function (d) { s.add(d) })
      }
      return s
    }
    function isAlive(d) {
      if (placed.indexOf(d) >= 0) return true
      for (var i = 0; i < N; i++) {
        if (cand[i].has(d)) return true
      }
      return false
    }
    function place(i, d, why) {
      placed[i] = d
      inCode.add(d)
      cand[i] = new Set([d])
      for (var j = 0; j < N; j++) {
        if (j !== i) cand[j].delete(d)
      }
      trace.push('定位：第 ' + (i + 1) + ' 位是 ' + d + '（' + why + '）')
    }

    var changed = true
    while (changed) {
      changed = false

      /* R1 */
      rows.forEach(function (row, ri) {
        if (row.a !== 0 || row.b !== 0) return
        var gone = []
        row.g.forEach(function (d) {
          var hit = false
          for (var i = 0; i < N; i++) {
            if (placed[i] == null && cand[i].delete(d)) hit = true
          }
          if (hit) gone.push(d)
        })
        if (gone.length) {
          trace.push('第 ' + (ri + 1) + ' 行全错 → 划掉 ' + gone.join('、'))
          changed = true
        }
      })

      /* R2 */
      rows.forEach(function (row, ri) {
        var aliveRow = row.g.filter(isAlive)
        if (aliveRow.length !== row.a + row.b) return
        var fresh = aliveRow.filter(function (d) { return !inCode.has(d) })
        if (fresh.length) {
          fresh.forEach(function (d) { inCode.add(d) })
          trace.push('第 ' + (ri + 1) + ' 行名额已满 → ' + fresh.join('、') + ' 在密码里')
          changed = true
        }
      })

      /* R5 前半：存活数字刚好等于空位数 → 全在密码里 */
      var unplaced = placed.filter(function (p) { return p == null }).length
      var alive = aliveSet()
      if (alive.size === unplaced) {
        var freshAll = []
        alive.forEach(function (d) {
          if (!inCode.has(d)) { inCode.add(d); freshAll.push(d) }
        })
        if (freshAll.length) {
          trace.push('剩下的数刚好够 → ' + freshAll.join('、') + ' 在密码里')
          changed = true
        }
      }

      /* R3 */
      inCode.forEach(function (d) {
        if (placed.indexOf(d) >= 0) return
        var ps = []
        for (var i = 0; i < N; i++) {
          if (placed[i] == null && cand[i].has(d)) ps.push(i)
        }
        if (ps.length === 1) {
          place(ps[0], d, '只剩这一个位置')
          changed = true
        }
      })

      /* R5 后半：某位候选只剩 1 个 */
      for (var i2 = 0; i2 < N; i2++) {
        if (placed[i2] == null && cand[i2].size === 1) {
          var only = null
          cand[i2].forEach(function (d) { only = d })
          place(i2, only, '这位只剩这个数')
          changed = true
        }
      }

      /* R4 */
      rows.forEach(function (row, ri) {
        var T = row.g.filter(function (d, i) {
          return (placed[i] == null && cand[i].has(d)) || placed[i] === d
        })
        if (row.a > 0 && T.length === row.a) {
          for (var i = 0; i < row.g.length; i++) {
            if (T.indexOf(row.g[i]) >= 0 && placed[i] == null) {
              place(i, row.g[i], '第 ' + (ri + 1) + ' 行位置对的名额落在它身上')
              changed = true
            }
          }
        } else if (row.a === 0) {
          var gone = []
          for (var j = 0; j < row.g.length; j++) {
            if (placed[j] == null && cand[j].delete(row.g[j])) {
              gone.push(row.g[j] + ' 不在第 ' + (j + 1) + ' 位')
            }
          }
          if (gone.length) {
            trace.push('第 ' + (ri + 1) + ' 行位置都不对 → ' + gone.join('，'))
            changed = true
          }
        }
      })
    }

    return { solved: placed.every(function (p) { return p != null }), placed: placed, trace: trace }
  }

  /* ---------- 生成 ---------- */

  /*
   * 重试上限：同一密码换 20 批行仍不过关就换密码（原型实测 L1 平均 1.6 次、
   * L4 平均 10.4 次换密码，50 次上限内 98% 出题成功；算力上都是瞬时）。
   * 换行是"整批重撒"而不是累加——线索越堆越啰嗦，宁可重来。
   */
  var MAX_ROW_TRIES = 20
  var MAX_CODE_TRIES = 50

  function pickDigits(lv, rnd) {
    return shuffle(lv.pool.slice(), rnd).slice(0, lv.N)
  }

  function makeRows(lv, code, target, rnd) {
    var rows = []
    var seen = {}
    var guard = 0
    var codeKey = code.join('')
    while (rows.length < target && guard++ < 200) {
      var g = pickDigits(lv, rnd)
      var k = g.join('')
      if (k === codeKey || seen[k]) continue
      var fb = score(g, code)
      if (lv.bZero && fb[1] !== 0) continue
      seen[k] = 1
      rows.push({ g: g, a: fb[0], b: fb[1] })
    }
    return rows.length === target ? rows : null
  }

  function makeOne(levelKey, rnd) {
    var lv = levelOf(levelKey)
    for (var ct = 0; ct < MAX_CODE_TRIES; ct++) {
      var code = pickDigits(lv, rnd)
      var target = lv.rowMin + Math.floor(rnd() * (lv.rowMax - lv.rowMin + 1))
      for (var rt = 0; rt < MAX_ROW_TRIES; rt++) {
        var rows = makeRows(lv, code, target, rnd)
        if (!rows) continue
        if (enumerate(lv.pool, lv.N, rows, 2).length !== 1) continue
        var sol = solve(lv.pool, lv.N, rows)
        if (!sol.solved) continue
        if (sol.placed.join('') !== code.join('')) continue /* 理论上不可能，防御 */
        /* 末条补上密码本身（规格第 7 节：答案页最后一步就是结论） */
        return {
          level: levelKey,
          code: code,
          rows: rows,
          trace: sol.trace.concat(['密码是 ' + code.join(' ')]),
          key: levelKey + '|' + code.join('') + '|' + rows.map(function (r) { return r.g.join('') }).join('.')
        }
      }
    }
    return null
  }

  /* 主入口：按设置生成一批题。去重按 key；尝试上限 count×50 防死循环。 */
  function generate(s) {
    var rnd = s.seed ? makeRandom(s.seed) : Math.random
    var seen = {}
    var puzzles = []
    var maxAttempts = s.count * 50
    for (var i = 0; i < maxAttempts && puzzles.length < s.count; i++) {
      var q = makeOne(s.level, rnd)
      if (!q) continue /* L4 偶尔 50 次重试全败（约 2%），接着再试，不是放弃整批 */
      if (s.noDuplicates && seen[q.key]) continue
      seen[q.key] = 1
      puzzles.push(q)
    }
    return { puzzles: puzzles, shortfall: s.count - puzzles.length }
  }

  function titleFor(s) {
    var lv = levelOf(s.level)
    return '密码推理 · 第 ' + lv.no + ' 关 ' + lv.name
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.mima = {
    LEVELS: LEVELS,
    LEVEL_ORDER: LEVEL_ORDER,
    levelOf: levelOf,
    score: score,
    clueText: clueText,
    enumerate: enumerate,
    solve: solve,
    makeRandom: makeRandom,
    makeOne: makeOne,
    generate: generate,
    titleFor: titleFor,
    MAX_ROW_TRIES: MAX_ROW_TRIES,
    MAX_CODE_TRIES: MAX_CODE_TRIES
  }
})(typeof window !== 'undefined' ? window : globalThis)
