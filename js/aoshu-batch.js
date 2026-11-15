/**
 * 奥数题目批次的种子账本（2026-11：题目固定到点「重新生成」为止）。
 *
 * 此前的行为：每次进页面都重新随机出一批，走开再回来题目就换了一批。
 * 现在每批题记一个种子：同一课 + 同一套出题设置 → 同一个种子 → 同一批题；
 * 点「重新生成」或改了影响题目的设置才滚新种子。每课各记各的，
 * 综合复习卷单独一份（key 固定，不看当前点在哪一课）。
 *
 * sig（指纹）只算影响题目的设置：难度、题量、题型勾选；复习卷再算范围
 * 和【所有课】的题型勾选（复习卷从每课抽题，哪课的勾选变了题都会变）。
 * 标题、讲解页/练习页/解析页开关这些纯排版项不进指纹——改它们不许换题。
 *
 * 账本存 localStorage（走 store.set，随账号同步和备份走：换台设备登进来，
 * 看到的还是同一批题），一课一条只留最新，不积历史。
 * 无 DOM 依赖，tools/check-aoshu-batch.js 在 node 里直接跑。
 */
;(function (root) {
  'use strict'

  var KEY = 'sumsum:aoshu:batches:v1'
  var REVIEW_KEY = '__review'

  /* 这一批挂在谁名下：单课挂知识点 id，复习卷统一挂固定 key */
  function keyOf(s) {
    return s.review ? REVIEW_KEY : s.topic
  }

  function variantSig(t, s) {
    return t.variants.map(function (v) {
      return v.setting + (s[v.setting] ? 1 : 0)
    }).join('')
  }

  function sigOf(s) {
    var A = root.SumSum.aoshu
    var parts = [s.difficulty, s.count]
    if (s.review) {
      parts.push(s.reviewTopics)
      A.topicList.forEach(function (t) {
        parts.push(variantSig(t, s))
      })
      return 'r1:' + parts.join('|')
    }
    var t = A.topics[s.topic]
    if (t) parts.push(variantSig(t, s))
    return 't1:' + parts.join('|')
  }

  function load() {
    try {
      var o = JSON.parse(root.localStorage.getItem(KEY))
      return o && typeof o === 'object' ? o : {}
    } catch (e) {
      return {} /* 账本损坏就当没有，重新滚种子 */
    }
  }

  function save(batches) {
    try {
      root.SumSum.store.set(KEY, batches)
    } catch (e) {
      /* 隐私模式写不了：种子记不住，退回每次进页面一批新题（同老行为） */
    }
  }

  function newSeed() {
    return Math.floor(Math.random() * 999999999) + 1
  }

  /* 拿某一批的种子：指纹没变就沿用（题目不变），变了就滚新的并记下 */
  function seedFor(key, sig) {
    var batches = load()
    var b = batches[key]
    if (b && b.sig === sig && b.seed >= 1) return b.seed
    b = { seed: newSeed(), sig: sig }
    batches[key] = b
    save(batches)
    return b.seed
  }

  /* 「重新生成」按钮专用：参数不变也要换一批 */
  function roll(key, sig) {
    var batches = load()
    batches[key] = { seed: newSeed(), sig: sig }
    save(batches)
    return batches[key].seed
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.aoshu = root.SumSum.aoshu || {}
  root.SumSum.aoshu.batch = {
    KEY: KEY,
    keyOf: keyOf,
    sigOf: sigOf,
    seedFor: seedFor,
    roll: roll
  }
})(typeof window !== 'undefined' ? window : globalThis)
