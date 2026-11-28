/**
 * 数学知识点闪卡（2026-11-28）：一张卡一个知识点，按课本单元排，另按孩子口算的错题挑卡。
 *
 *   at：在哪些课本的哪个单元教（'rj1a:5' = 人教一上下标 5 的单元，单元表见 js/kousuan-tags.js BOOKS）。
 *       内容只用到这个单元为止学过的东西（不超纲），单元是对着 2024 新版课本图片核过的。
 *   front / back：默认的例子。back.how 是「方法」（一步一步怎么算），rhyme 是口诀。
 *   make(q)：可选。孩子最近做错的一道口算题 q → 用这道题当例子的正面和背面（算式、拆数步骤都由程序算，不手写）。
 *
 * skillOf(key)：一道口算题（题面 key，如 '13 − 9'、'5 + 3 − 2'）→ 对应哪张卡；乘除没有卡，返回 null。
 * pick(opts)：一页挑哪些卡：错题对应的卡先放（最多半页）→ 这个单元的卡 → 剩下的错题卡 → 前面单元的卡轮着补满。
 * 纸样复用 js/pinyin-flash.js 的 sheets（对折卡，一页 6 张或 4 张）。tools/check-math-cards.js 校验。
 */
;(function (root) {
  'use strict'

  function T() { return root.SumSum.kousuanTags }

  function card(id, at, title, front, back, make) {
    return { id: id, at: at, title: title, front: front, back: back, make: make || null }
  }

  /* ---------- 用孩子的错题当例子 ---------- */

  function sign(op) { return op === '+' ? '+' : '−' }
  function calc(a, op, b) { return op === '+' ? a + b : a - b }
  function expr(q) { return q.tokens.join(' ') + ' = ？' }

  /* 凑十法：两个一位数相加、满十 */
  function makeMake10(q) {
    if (q.op !== '+' || q.a > 9 || q.b > 9 || q.ans <= 10) return null
    var big = Math.max(q.a, q.b)
    var small = Math.min(q.a, q.b)
    var need = 10 - big
    var rest = small - need
    return {
      front: { big: expr(q), ask: big + ' 还差几就是 10？把 ' + small + ' 拆一拆。' },
      back: { big: String(q.ans), rhyme: '看大数，拆小数，凑成十，加剩下的。',
        how: small + ' 拆成 ' + need + ' 和 ' + rest + '：' + big + ' + ' + need + ' = 10，10 + ' + rest + ' = ' + q.ans,
        pitfall: '凑成 10 以后，别忘了加剩下的 ' + rest + '。' }
    }
  }

  /* 破十法：十几（或 20）减一位数、个位不够减 */
  function makeBreak10(q) {
    if (q.op !== '−' || q.a < 11 || q.a > 20 || q.b > 9 || q.a % 10 >= q.b) return null
    var u = q.a - 10
    var d = 10 - q.b
    return {
      front: { big: expr(q), ask: '个位 ' + (q.a % 10) + ' 不够减 ' + q.b + '，怎么办？' },
      back: { big: String(q.ans), rhyme: '十几拆成十和几，用十去减，再把几加上。',
        how: q.a + ' 拆成 10 和 ' + u + '：10 − ' + q.b + ' = ' + d + '，' + d + ' + ' + u + ' = ' + q.ans,
        pitfall: '最后一步是加 ' + u + '，不是减 ' + u + '。' }
    }
  }

  /* 十几加减几（不进位不退位） */
  function makeTeen(q) {
    var big = q.op === '+' ? Math.max(q.a, q.b) : q.a
    var small = q.op === '+' ? Math.min(q.a, q.b) : q.b
    if (big < 11 || big > 19 || small > 9 || small < 1) return null
    var u = big % 10
    var x = calc(u, q.op, small)
    if (x < 0 || x > 9) return null
    return {
      front: { big: expr(q), ask: big + ' 是 1 个十和 ' + u + ' 个一，' + small + ' 和哪一位' + (q.op === '+' ? '加' : '减') + '？' },
      back: { big: String(q.ans), rhyme: '十几' + (q.op === '+' ? '加' : '减') + '几：十不动，只算个位。',
        how: '个位 ' + u + ' ' + q.op + ' ' + small + ' = ' + x + '，10 + ' + x + ' = ' + q.ans,
        pitfall: '十位上的 1 不能丢。' }
    }
  }

  /* 两位数加一位数，个位满十（含十几加几得 20） */
  function makeAddC(q) {
    if (q.op !== '+') return null
    var big = Math.max(q.a, q.b)
    var small = Math.min(q.a, q.b)
    if (big < 10 || small > 9 || (big % 10) + small < 10) return null
    var u = big % 10
    var t = big - u
    var x = u + small
    return {
      front: { big: expr(q), ask: '个位 ' + u + ' + ' + small + ' 满十了，怎么算？' },
      back: { big: String(q.ans), rhyme: '个位满十，向十位进 1。',
        how: u + ' + ' + small + ' = ' + x + '，' + t + ' + ' + x + ' = ' + q.ans,
        pitfall: '得数是 ' + q.ans + '，不是 ' + (q.ans - 10) + '：进上去的 1 个十别丢。' }
    }
  }

  /* 两位数减一位数，个位不够减（被减数 21 以上） */
  function makeSubB(q) {
    if (q.op !== '−' || q.a < 21 || q.b > 9 || q.a % 10 >= q.b) return null
    var u = q.a % 10
    var hi = q.a - u - 10
    var lo = 10 + u
    var x = lo - q.b
    return {
      front: { big: expr(q), ask: '个位 ' + u + ' 不够减 ' + q.b + '，怎么办？' },
      back: { big: String(q.ans), rhyme: '个位不够减，从十位拿 1 个十。',
        how: q.a + ' 分成 ' + hi + ' 和 ' + lo + '：' + lo + ' − ' + q.b + ' = ' + x + '，' + hi + ' + ' + x + ' = ' + q.ans,
        pitfall: '十位被拿走了 1 个十：得 ' + q.ans + '，不是 ' + (q.ans + 10) + '。' }
    }
  }

  /* 两位数加减一位数或整十，不进位不退位 */
  function makeAddNc(q) {
    var big = q.op === '+' ? Math.max(q.a, q.b) : q.a
    var small = q.op === '+' ? Math.min(q.a, q.b) : q.b
    if (big < 10 || (big < 20 && small < 10)) return null
    var how
    if (small < 10) {
      var u = big % 10
      var x = calc(u, q.op, small)
      if (x < 0 || x > 9) return null
      how = '个位 ' + u + ' ' + q.op + ' ' + small + ' = ' + x + '，十位不变，得 ' + q.ans
    } else if (small % 10 === 0) {
      var t = Math.floor(big / 10)
      var y = calc(t, q.op, small / 10)
      if (y < 1 || y > 9) return null
      how = '十位 ' + t + ' ' + q.op + ' ' + (small / 10) + ' = ' + y + '，个位不变，得 ' + q.ans
    } else {
      return null
    }
    return {
      front: { big: expr(q), ask: small + ' 要和 ' + big + ' 的哪一位' + (q.op === '+' ? '加' : '减') + '？' },
      back: { big: String(q.ans), rhyme: '相同数位对齐：个位和个位算，十位和十位算。', how: how,
        pitfall: small < 10 ? small + ' 是 ' + small + ' 个一，只动个位。' : small + ' 是 ' + (small / 10) + ' 个十，只动十位。' }
    }
  }

  /* 整十加减整十 */
  function makeTens(q) {
    if (q.a % 10 || q.b % 10 || q.a < 10 || q.b < 10) return null
    var word = q.op === '+' ? '加' : '减'
    return {
      front: { big: expr(q), ask: '想一想：几个十' + word + '几个十？' },
      back: { big: String(q.ans), rhyme: '整十' + word + '整十，看成几个十来算。',
        how: (q.a / 10) + ' 个十 ' + q.op + ' ' + (q.b / 10) + ' 个十 = ' + (q.ans / 10) + ' 个十，就是 ' + q.ans,
        pitfall: '别忘了得数后面的 0。' }
    }
  }

  /* 整十和一位数：40 + 8、48 − 8、48 − 40 */
  function makeTensOne(q) {
    var how
    if (q.op === '+') {
      var t = Math.max(q.a, q.b)
      var d = Math.min(q.a, q.b)
      if (t % 10 || d > 9 || d < 1) return null
      how = (t / 10) + ' 个十和 ' + d + ' 个一合起来是 ' + q.ans
    } else if (q.a % 10 && q.b === q.a % 10) {
      how = q.a + ' 去掉 ' + q.b + ' 个一，剩 ' + q.ans
    } else if (q.a % 10 && q.b === q.a - (q.a % 10)) {
      how = q.a + ' 去掉 ' + (q.b / 10) + ' 个十，剩 ' + q.ans
    } else {
      return null
    }
    return {
      front: { big: expr(q), ask: '想一想：几个十和几个一？' },
      back: { big: String(q.ans), rhyme: '几个十和几个一，合起来就是几十几。', how: how,
        pitfall: '十和一不能直接相加：40 + 8 是 48，不是 12。' }
    }
  }

  /* 两位数加减两位数（竖式），进位退位都行 */
  function makeVertical(q) {
    if (q.a < 10 || q.b < 10 || q.a % 10 === 0 && q.b % 10 === 0) return null
    var u1 = q.a % 10
    var u2 = q.b % 10
    var t1 = Math.floor(q.a / 10)
    var t2 = Math.floor(q.b / 10)
    var how
    var pit
    if (q.op === '+') {
      var x = u1 + u2
      if (x >= 10) {
        how = '个位 ' + u1 + ' + ' + u2 + ' = ' + x + '，写 ' + (x - 10) + '，向十位进 1；十位 ' + t1 + ' + ' + t2 + ' + 1 = ' + (t1 + t2 + 1)
        pit = '别忘了加进上来的 1。'
      } else {
        how = '个位 ' + u1 + ' + ' + u2 + ' = ' + x + '，十位 ' + t1 + ' + ' + t2 + ' = ' + (t1 + t2)
        pit = '两个数的个位要对齐。'
      }
    } else if (u1 < u2) {
      how = '个位 ' + u1 + ' 减 ' + u2 + ' 不够减，从十位退 1：' + (u1 + 10) + ' − ' + u2 + ' = ' + (u1 + 10 - u2) +
        '；十位 ' + t1 + ' − 1 − ' + t2 + ' = ' + (t1 - 1 - t2)
      pit = '十位退了 1，要先减掉这个 1。'
    } else {
      how = '个位 ' + u1 + ' − ' + u2 + ' = ' + (u1 - u2) + '，十位 ' + t1 + ' − ' + t2 + ' = ' + (t1 - t2)
      pit = '两个数的个位要对齐。'
    }
    return {
      front: { big: expr(q), ask: pit === '两个数的个位要对齐。' ? '个位和个位算，十位和十位算：先算哪一位？' : '用竖式算：个位' + (q.op === '+' ? '满十了' : '不够减') + '，怎么办？' },
      back: { big: String(q.ans), rhyme: '相同数位对齐，从个位算起。', how: how, pitfall: pit }
    }
  }

  /* 连加连减 */
  function makeChain(q) {
    if (q.tokens.length !== 5) return null
    var a = q.tokens[0]
    var v1 = calc(a, q.tokens[1], q.tokens[2])
    return {
      front: { big: expr(q), ask: '三个数，先算哪两个？' },
      back: { big: String(q.ans), rhyme: '从左往右，一步一步算。',
        how: a + ' ' + q.tokens[1] + ' ' + q.tokens[2] + ' = ' + v1 + '，' + v1 + ' ' + q.tokens[3] + ' ' + q.tokens[4] + ' = ' + q.ans,
        pitfall: '先算前两个数，得数再和第三个数算。' }
    }
  }

  /* ---------- 卡 ---------- */

  var CARDS = [
    card('position', ['rj1a:0', 'bsd1a:2'], '左右是相对的',
      { big: '小猫在小狗的左边', ask: '那小狗在小猫的哪一边？' },
      { big: '右边', rhyme: '你在我左边，我就在你右边：位置是相对的。',
        words: '上和下、前和后、左和右，都是一对一对的', pitfall: '面对面站着时，你的左手对着别人的右手。' }),

    card('compare', ['rj1a:1', 'bsd1a:1'], '比大小',
      { big: '5 ○ 8', ask: '圈里填 >、< 还是 =？' },
      { big: '5 < 8', rhyme: '开口朝着大的数，尖尖对着小的数。',
        words: '9 > 6　7 = 7　2 < 4', pitfall: '先看哪个数大，再让开口朝它。' }),
    card('ordinal', ['rj1a:1', 'bsd1a:1'], '第几和几个',
      { big: '第 3 个　3 个', ask: '这两个说法一样吗？' },
      { big: '不一样', rhyme: '「几个」是一共有多少，「第几」是排在哪一个。',
        words: '小明排第 3，他前面有 2 个人', pitfall: '数第几，先看从哪一边数起。' }),
    card('split5', ['rj1a:1', 'bsd1a:2'], '5 的分与合',
      { big: '5 = 2 + □', ask: '5 可以分成 2 和几？' },
      { big: '3', rhyme: '5 可以分成 1 和 4、2 和 3，倒过来也一样。',
        words: '5 = 1+4 = 2+3 = 3+2 = 4+1', pitfall: '倒过来说也要会：2 和 3 合起来是 5。' }),
    card('meaning', ['rj1a:1', 'bsd1a:2'], '加法还是减法',
      { big: '一共？还剩？', ask: '求「一共」用加法还是减法？求「还剩」呢？' },
      { big: '一共用 +，还剩用 −', rhyme: '合起来用加法，拿走一部分用减法。',
        words: '3 只又来 2 只，一共 3 + 2 = 5 只', pitfall: '先看问的是合起来，还是拿走以后。' }),
    card('zero', ['rj1a:1', 'bsd1a:2'], '有 0 的加减法',
      { big: '5 + 0　5 − 5', ask: '这两道各得几？' },
      { big: '5　0', rhyme: '加 0、减 0 不变，自己减自己得 0。',
        words: '0 + 3 = 3　4 − 0 = 4', pitfall: '5 − 0 还是 5，不是 0。' }),

    card('split69', ['rj1a:2', 'bsd1a:4'], '6～9 的分与合',
      { big: '8 = 5 + □', ask: '8 可以分成 5 和几？' },
      { big: '3', rhyme: '8 可以分成 1 和 7、2 和 6、3 和 5、4 和 4。',
        words: '7 = 3 + 4　9 = 6 + 3', pitfall: '按顺序一对一对说，就不会漏。' }),
    card('split10', ['rj1a:2', 'bsd1a:4'], '10 的分与合',
      { big: '10 = 3 + □', ask: '10 可以分成 3 和几？' },
      { big: '7', rhyme: '一九、二八、三七、四六、五五，都是凑成 10 的好朋友。',
        words: '10 = 1+9 = 2+8 = 3+7 = 4+6 = 5+5', pitfall: '5 和 5 也是一对，别漏了。' }),
    card('addsub', ['rj1a:2', 'bsd1a:4'], '看加法算减法',
      { big: '3 + 7 = 10，10 − 3 = ？', ask: '看着前面的加法，减法得几？' },
      { big: '7', rhyme: '一图四式：3 + 7、7 + 3、10 − 3、10 − 7。',
        words: '4 + 5 = 9，所以 9 − 4 = 5', pitfall: '减法要从合起来的那个数减起。' }),
    card('chain', ['rj1a:2', 'bsd1a:4'], '连加连减',
      { big: '10 − 3 − 2 = ？', ask: '三个数，先算哪两个？' },
      { big: '5', rhyme: '从左往右，一步一步算。',
        how: '10 − 3 = 7，7 − 2 = 5', pitfall: '先算前两个数，得数再和第三个数算。' }, makeChain),

    card('sort', ['bsd1a:3'], '分一分',
      { big: '苹果　足球　香蕉　篮球', ask: '分成两堆，可以怎么分？' },
      { big: '水果一堆，球一堆', rhyme: '先定好按什么分，再一个一个放，不重复、不漏掉。',
        words: '还可以按颜色分、按大小分', pitfall: '同一次分，只能按一种方法分。' }),

    card('solids', ['rj1a:3', 'bsd1a:5'], '认识立体图形',
      { big: '长方体　正方体　圆柱　球', ask: '哪些能滚起来？' },
      { big: '圆柱和球', rhyme: '球往哪边都能滚；圆柱上下一样粗，躺着能滚，立着站得稳。',
        words: '牙膏盒是长方体，魔方是正方体，易拉罐是圆柱', pitfall: '圆柱立着放时不会滚。' }),
    card('cube', ['rj1a:3', 'bsd1a:5'], '正方体和长方体',
      { big: '正方体　长方体', ask: '这两个有什么不一样？' },
      { big: '正方体的面一样大', rhyme: '正方体的每个面都是一样大的正方形；长方体的面大多是长方形。',
        words: '魔方是正方体，牙膏盒是长方体', pitfall: '看面：每个面都一样大的才是正方体。' }),

    card('ten-ones', ['rj1a:4', 'bsd1b:0'], '10 个一是 1 个十',
      { big: '10 个一 = □ 个十', ask: '10 根小棒捆成一捆，是几个十？' },
      { big: '1 个十', rhyme: '10 个一捆成一捆，就是 1 个十。',
        words: '数出 10 根小棒，捆成 1 捆，再接着数', pitfall: '10 没有新数字，是用 1 和 0 写的。' }),
    card('teen-place', ['rj1a:4', 'bsd1b:0'], '十位和个位',
      { big: '14', ask: '14 里有几个十、几个一？' },
      { big: '1 个十，4 个一', rhyme: '从右往左数：第一位是个位，第二位是十位。',
        words: '17 是 1 个十和 7 个一　20 是 2 个十', pitfall: '十四写成 14，不是 104。' }),
    card('teen', ['rj1a:4', 'bsd1b:0'], '十几加减几',
      { big: '13 + 4 = ？', ask: '13 是 1 个十和 3 个一，4 和哪一位加？' },
      { big: '17', rhyme: '十几加减几：十不动，只算个位。',
        how: '个位 3 + 4 = 7，10 + 7 = 17', pitfall: '十位上的 1 不能丢。' }, makeTeen),
    card('neighbors', ['rj1a:4', 'bsd1b:0'], '前一个数、后一个数',
      { big: '□　15　□', ask: '15 前面一个数、后面一个数是几？' },
      { big: '14　16', rhyme: '前一个数少 1，后一个数多 1。',
        words: '19 后面是 20，10 前面是 9', pitfall: '一个一个数，别跳过。' }),

    card('make10', ['rj1a:5', 'bsd1b:0'], '凑十法',
      { big: '9 + 4 = ？', ask: '9 还差几就是 10？把 4 拆一拆。' },
      { big: '13', rhyme: '看大数，拆小数，凑成十，加剩下的。',
        how: '4 拆成 1 和 3：9 + 1 = 10，10 + 3 = 13', pitfall: '凑成 10 以后，别忘了加剩下的 3。' }, makeMake10),
    card('swap', ['rj1a:5', 'bsd1b:0'], '交换加数',
      { big: '3 + 9 = ？', ask: '小数在前面，怎么算快？' },
      { big: '12', rhyme: '两个数换个位置，和不变：3 + 9 = 9 + 3。',
        how: '算 9 + 3：3 拆成 1 和 2，9 + 1 = 10，10 + 2 = 12', pitfall: '换了位置，得数还是一样。' }),
    card('whole', ['rj1a:5'], '原来有多少',
      { big: '拿走 4 个，还剩 6 个', ask: '原来有几个？' },
      { big: '10 个', rhyme: '求原来有多少：拿走的和剩下的合起来，用加法。',
        words: '4 + 6 = 10（个）', pitfall: '看到「拿走」别急着用减法，先看问的是什么。' }),

    card('break10', ['rj1b:1', 'bsd1b:2'], '破十法',
      { big: '13 − 9 = ？', ask: '个位 3 不够减 9，怎么办？' },
      { big: '4', rhyme: '十几拆成十和几，用十去减，再把几加上。',
        how: '13 拆成 10 和 3：10 − 9 = 1，1 + 3 = 4', pitfall: '最后一步是加 3，不是减 3。' }, makeBreak10),
    card('think-add', ['rj1b:1', 'bsd1b:2'], '想加算减',
      { big: '15 − 8 = ？', ask: '想一想：8 加几等于 15？' },
      { big: '7', rhyme: '做减法，想加法。',
        how: '8 + 7 = 15，所以 15 − 8 = 7', pitfall: '20 以内的进位加法要背熟，减法才快。' }),
    card('flat10', ['rj1b:1', 'bsd1b:2'], '先减到 10',
      { big: '14 − 6 = ？', ask: '先减几，能正好得 10？' },
      { big: '8', rhyme: '先减到 10，再减剩下的。',
        how: '6 拆成 4 和 2：14 − 4 = 10，10 − 2 = 8', pitfall: '先减掉的是个位上的 4。' }),
    card('more-less', ['bsd1b:2', 'rj1b:5'], '多几、少几',
      { big: '13 比 6 多几？', ask: '用加法还是减法？' },
      { big: '7', rhyme: '求一个数比另一个数多几、少几，用大数减小数。',
        words: '13 − 6 = 7，也可以说 6 比 13 少 7', pitfall: '问「少几」也用减法。' }),

    card('shapes', ['rj1b:0', 'bsd1b:5'], '长方形和正方形',
      { big: '长方形　正方形', ask: '它们有什么不一样？' },
      { big: '正方形四条边一样长', rhyme: '长方形相对的边一样长，正方形四条边都一样长。',
        words: '还学过三角形、圆、平行四边形', pitfall: '正方形斜着放，还是正方形。' }),
    card('faces', ['bsd1b:1'], '从立体图形上找平面图形',
      { big: '圆柱的底面', ask: '用它印一印，能印出什么图形？' },
      { big: '圆', rhyme: '立体图形的一个面，印下来就是平面图形。',
        words: '正方体 → 正方形　长方体 → 长方形　圆柱 → 圆', pitfall: '长方体有的面也可能是正方形。' }),
    card('tangram', ['rj1b:0', 'bsd1b:5'], '七巧板',
      { big: '七巧板', ask: '一套有几块？都是什么图形？' },
      { big: '7 块', rhyme: '5 个三角形、1 个正方形、1 个平行四边形。',
        words: '三角形有 2 个大的、1 个中的、2 个小的', pitfall: '拼图时 7 块都要用上，不能重叠。' }),

    card('hundred', ['rj1b:2', 'bsd1b:3'], '认识 100',
      { big: '10 个十 = ？', ask: '10 捆小棒（每捆 10 根），一共几根？' },
      { big: '100', rhyme: '10 个十是一百；99 再添 1 就是 100。',
        words: '100 是三位数：百位上是 1', pitfall: '100 读作一百，写的时候是 1 后面两个 0。' }),
    card('place', ['rj1b:2', 'bsd1b:3'], '两位数的组成',
      { big: '47', ask: '4 和 7 各表示什么？' },
      { big: '4 个十，7 个一', rhyme: '从右边起，第一位是个位，第二位是十位，第三位是百位。',
        words: '74 是 7 个十和 4 个一', pitfall: '47 和 74 不一样：数字站的位置决定它表示多少。' }),
    card('read-write', ['rj1b:2', 'bsd1b:3'], '读数和写数',
      { big: '八十五　六十', ask: '写出来是多少？' },
      { big: '85　60', rhyme: '先写十位，再写个位；个位一个也没有，写 0。',
        words: '七十 → 70　九十九 → 99', pitfall: '六十写成 60，不是 6，也不是 610。' }),
    card('compare100', ['rj1b:2', 'bsd1b:3'], '100 以内比大小',
      { big: '58 ○ 62', ask: '圈里填 >、< 还是 =？' },
      { big: '58 < 62', rhyme: '先比十位，十位大的数就大；十位一样，再比个位。',
        words: '45 < 54　90 > 89', pitfall: '58 的个位 8 比 2 大，但十位 5 比 6 小，58 还是小。' }),
    card('estimate', ['rj1b:2', 'bsd1b:3'], '多一些、多得多',
      { big: '36 和 39', ask: '36 比 39 少一些，还是少得多？' },
      { big: '少一些', rhyme: '差得不多说多一些、少一些；差得很多说多得多、少得多。',
        words: '36 比 90 少得多', pitfall: '先看十位：十位差得多，就是「多得多」。' }),
    card('tens-one', ['rj1b:2', 'bsd1b:3'], '整十和几个一',
      { big: '40 + 8 = ？', ask: '想一想：几个十和几个一？' },
      { big: '48', rhyme: '几个十和几个一，合起来就是几十几。',
        how: '4 个十和 8 个一合起来是 48', pitfall: '十和一不能直接相加：40 + 8 是 48，不是 12。' }, makeTensOne),
    card('tens', ['rj1b:2', 'bsd1b:4'], '整十加减整十',
      { big: '40 + 30 = ？', ask: '想一想：几个十加几个十？' },
      { big: '70', rhyme: '整十加减整十，看成几个十来算。',
        how: '4 个十 + 3 个十 = 7 个十，就是 70', pitfall: '别忘了得数后面的 0。' }, makeTens),

    card('add-nc', ['rj1b:3', 'bsd1b:4'], '两位数加减一位数、整十',
      { big: '34 + 20 = ？', ask: '20 要和 34 的哪一位加？' },
      { big: '54', rhyme: '相同数位对齐：个位和个位算，十位和十位算。',
        how: '十位 3 + 2 = 5，个位不变，得 54', pitfall: '20 是 2 个十，只动十位：不是 36。' }, makeAddNc),
    card('add-c', ['rj1b:3'], '两位数加一位数（进位）',
      { big: '38 + 5 = ？', ask: '个位 8 + 5 满十了，怎么算？' },
      { big: '43', rhyme: '个位满十，向十位进 1。',
        how: '8 + 5 = 13，30 + 13 = 43', pitfall: '得数是 43，不是 33：进上去的 1 个十别丢。' }, makeAddC),
    card('sub-b', ['rj1b:3'], '两位数减一位数（退位）',
      { big: '36 − 8 = ？', ask: '个位 6 不够减 8，怎么办？' },
      { big: '28', rhyme: '个位不够减，从十位拿 1 个十。',
        how: '36 分成 20 和 16：16 − 8 = 8，20 + 8 = 28', pitfall: '十位被拿走了 1 个十：得 28，不是 38。' }, makeSubB),

    card('vertical', ['rj1b:3', 'bsd1b:4'], '两位数加减两位数',
      { big: '34 + 22 = ？', ask: '个位和个位算，十位和十位算：先算哪一位？' },
      { big: '56', rhyme: '相同数位对齐，从个位算起。',
        how: '个位 4 + 2 = 6，十位 3 + 2 = 5', pitfall: '两个数的个位要对齐。' }, makeVertical),
    card('vertical-c', ['rj1b:4'], '竖式加法（进位）',
      { big: '46 + 37 = ？', ask: '个位满十了，竖式怎么写？' },
      { big: '83', rhyme: '个位满十，向十位进 1，进位的 1 写小一点。',
        how: '个位 6 + 7 = 13，写 3，向十位进 1；十位 4 + 3 + 1 = 8', pitfall: '别忘了加进上来的 1。' }, makeVertical),
    card('vertical-b', ['rj1b:4'], '竖式减法（退位）',
      { big: '52 − 25 = ？', ask: '个位 2 减 5 不够减，竖式怎么算？' },
      { big: '27', rhyme: '个位不够减，从十位退 1，在十位上点个小点。',
        how: '个位 12 − 5 = 7；十位 5 − 1 − 2 = 2', pitfall: '十位退了 1，要先减掉这个 1。' }, makeVertical),

    card('relation', ['rj1b:5'], '比谁多几、少几',
      { big: '男生 24 人，女生比男生少 7 人', ask: '女生有几人？' },
      { big: '17 人', rhyme: '比谁少几，就从谁里减几；比谁多几，就在谁上加几。',
        words: '24 − 7 = 17（人）', pitfall: '先找出是和谁比。' }),

    card('money', ['rj1b:6'], '认识人民币',
      { big: '1 元 = □ 角', ask: '1 元能换几个 1 角？' },
      { big: '10 角', rhyme: '1 元 = 10 角，1 角 = 10 分。',
        words: '5 个 1 元是 5 元', pitfall: '元和角差 10 倍，不是 100 倍。' }),
    card('money-change', ['rj1b:6'], '换钱',
      { big: '1 张 20 元 = □ 张 5 元', ask: '20 元能换几张 5 元？' },
      { big: '4 张', rhyme: '换钱时总数不变：5 + 5 + 5 + 5 = 20。',
        words: '1 张 10 元 = 2 张 5 元 = 10 张 1 元', pitfall: '换成面额小的，张数就多。' }),
    card('money-pay', ['rj1b:6'], '找零钱',
      { big: '13 元的东西，付 20 元', ask: '要找回几元？' },
      { big: '7 元', rhyme: '找回的钱 = 付的钱 − 价钱。',
        words: '20 − 13 = 7（元）', pitfall: '用付的钱减价钱，别减反了。' })
  ]

  var BY_ID = {}
  CARDS.forEach(function (c) { BY_ID[c.id] = c })

  /* ---------- 错题 → 卡 ---------- */

  /* 题面 key → { tokens, a, op, b, ans }；只认加减（两个数或三个数连加连减） */
  function parse(key) {
    var t = String(key || '').trim().split(/\s+/)
    if (t.length !== 3 && t.length !== 5) return null
    var tokens = []
    for (var i = 0; i < t.length; i++) {
      if (i % 2) {
        var op = t[i] === '-' ? '−' : t[i]
        if (op !== '+' && op !== '−') return null
        tokens.push(op)
      } else {
        if (!/^\d+$/.test(t[i])) return null
        tokens.push(Number(t[i]))
      }
    }
    var ans = calc(tokens[0], tokens[1], tokens[2])
    if (tokens.length === 5) ans = calc(ans, tokens[3], tokens[4])
    if (ans < 0) return null
    return { tokens: tokens, a: tokens[0], op: tokens[1], b: tokens[2], ans: ans }
  }

  function skillOf(key) {
    var q = parse(key)
    if (!q) return null
    if (q.tokens.length === 5) return 'chain'
    var a = q.a
    var b = q.b
    if (q.op === '+') {
      var s = a + b
      if (a === 0 || b === 0) return 'zero'
      if (s <= 5) return 'split5'
      if (s <= 9) return 'split69'
      if (s === 10) return 'split10'
      var big = Math.max(a, b)
      var small = Math.min(a, b)
      if (big < 10) return 'make10'
      if (a % 10 === 0 && b % 10 === 0) return 'tens'
      if (big === 10 && s < 20) return 'teen-place'
      if (s <= 20) return (big % 10) + small >= 10 ? 'add-c' : 'teen'
      if (big % 10 === 0 && small < 10) return 'tens-one'
      var carry = (a % 10) + (b % 10) >= 10
      if (small < 10) return carry ? 'add-c' : 'add-nc'
      if (small % 10 === 0) return 'add-nc'
      return carry ? 'vertical-c' : 'vertical'
    }
    if (b === 0 || a === b) return 'zero'
    if (a <= 5) return 'split5'
    if (a <= 9) return 'split69'
    if (a === 10) return 'split10'
    if (a <= 20) {
      if (b < 10 && a % 10 < b) return 'break10'
      if (a % 10 === 0 && b % 10 === 0) return 'tens'
      if (b === 10) return 'teen-place'
      return b < 10 ? 'teen' : 'vertical'
    }
    if (a % 10 === 0 && b % 10 === 0) return 'tens'
    if (a % 10 && (b === a % 10 || b === a - (a % 10))) return 'tens-one'
    var borrow = a % 10 < b % 10
    if (b < 10) return borrow ? 'sub-b' : 'add-nc'
    if (b % 10 === 0) return 'add-nc'
    return borrow ? 'vertical-b' : 'vertical'
  }

  /* ---------- 教材里的位置 ---------- */

  function family(book) {
    var B = T().BOOKS
    return B[book] && B[book].prev ? [B[book].prev, book] : [book]
  }

  /* 这张卡在这一册（或上一册）哪个单元教：{ book, unit }，没有就 null */
  function placeIn(c, book) {
    var fam = family(book)
    var best = null
    c.at.forEach(function (s) {
      var p = s.split(':')
      var i = fam.indexOf(p[0])
      if (i < 0) return
      var rank = i * 100 + Number(p[1])
      if (!best || rank < best.rank) best = { book: p[0], unit: Number(p[1]), rank: rank }
    })
    return best
  }

  /* 学到 book 第 unit 单元时，这张卡学过没有（上一册的都算学过） */
  function learned(c, book, unit) {
    var p = placeIn(c, book)
    if (!p) return false
    return p.book !== book || p.unit <= unit
  }

  function unitShort(name) {
    var m = /^第.单元/.exec(name)
    return m ? m[0] : name
  }

  /* 卡角上的小字：「人教一上 · 第五单元 · 凑十法」；别的教材的卡（孩子错题带出来的）只写名字 */
  function tagOf(c, book) {
    var p = placeIn(c, book)
    if (!p) return c.title
    var b = T().BOOKS[p.book]
    return b.short + ' · ' + unitShort(b.units[p.unit][0]) + ' · ' + c.title
  }

  /* 一张卡 → 给纸样用的样子；q 是孩子做错的那道题（有 make 时换成这道题当例子） */
  function resolve(c, book, q) {
    var made = q && c.make ? c.make(q) : null
    return {
      id: c.id,
      tag: tagOf(c, book),
      title: c.title,
      front: made ? made.front : c.front,
      back: made ? made.back : c.back,
      from: made ? q.tokens.join(' ') : ''
    }
  }

  /* 这一册第 unit 单元教的卡 */
  function unitCards(book, unit) {
    return CARDS.filter(function (c) {
      var p = placeIn(c, book)
      return p && p.book === book && p.unit === unit
    })
  }

  function hash(text) {
    var h = 0
    for (var i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) >>> 0
    return h
  }

  /*
   * 错题：[{ key, at }]（at 是打分时间，新的在前也行、乱序也行）→ [{ id, n, q }]，按错的次数多到少，
   * q 是最近一次错的那道题。
   */
  function wrongCards(wrong) {
    var map = {}
    var list = []
    ;(wrong || []).slice().sort(function (x, y) { return (y.at || 0) - (x.at || 0) }).forEach(function (w) {
      var id = skillOf(w.key)
      if (!id || !BY_ID[id]) return
      if (!map[id]) {
        map[id] = { id: id, n: 0, q: parse(w.key) }
        list.push(map[id])
      }
      map[id].n++
    })
    return list.sort(function (x, y) { return y.n - x.n })
  }

  /*
   * 一页挑哪些卡。opts：{ book, unit, wrong: [{ key, at }], today 'YYYY-MM-DD', per }
   * 返回 [{ card（resolve 过的）, why: 'wrong' | 'unit' | 'review', n（错了几次） }]，最多 per 张。
   *   1. 错题对应的卡，先放最多半页；2. 这个单元的卡；3. 剩下的错题卡；4. 前面学过的卡，按日子轮着补满。
   */
  function pick(opts) {
    var book = opts.book
    var unit = opts.unit
    var per = opts.per || 6
    var out = []
    var used = {}
    function add(c, why, w) {
      if (out.length >= per || used[c.id]) return
      used[c.id] = true
      out.push({ card: resolve(c, book, w && w.q), why: why, n: w ? w.n : 0 })
    }
    var wrong = wrongCards(opts.wrong)
    var half = Math.ceil(per / 2)
    wrong.slice(0, half).forEach(function (w) { add(BY_ID[w.id], 'wrong', w) })
    unitCards(book, unit).forEach(function (c) { add(c, 'unit') })
    wrong.forEach(function (w) { add(BY_ID[w.id], 'wrong', w) })
    var before = CARDS.filter(function (c) {
      var p = placeIn(c, book)
      return p && learned(c, book, unit) && !(p.book === book && p.unit === unit)
    })
    if (before.length) {
      /* 离现在近的单元先复习，起点按日子轮转，隔天印出来不完全一样 */
      var rank = function (c) { return placeIn(c, book).rank }
      var rest = before.slice().sort(function (x, y) { return rank(y) - rank(x) })
      var start = hash(String(opts.today) + ':' + book + ':' + unit) % rest.length
      rest.slice(start).concat(rest.slice(0, start)).forEach(function (c) { add(c, 'review') })
    }
    return out
  }

  /* 这一册全套（按单元顺序） */
  function bookCards(book) {
    return CARDS.filter(function (c) {
      var p = placeIn(c, book)
      return p && p.book === book
    }).sort(function (x, y) { return placeIn(x, book).rank - placeIn(y, book).rank })
      .map(function (c) { return resolve(c, book, null) })
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.mathCards = {
    CARDS: CARDS,
    BY_ID: BY_ID,
    parse: parse,
    skillOf: skillOf,
    placeIn: placeIn,
    learned: learned,
    tagOf: tagOf,
    resolve: resolve,
    unitCards: unitCards,
    wrongCards: wrongCards,
    pick: pick,
    bookCards: bookCards
  }
})(typeof window !== 'undefined' ? window : globalThis)
