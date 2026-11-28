'use strict'
/*
 * 数学知识点闪卡（js/math-cards.js）：
 *   1. 每张卡字段齐全、id 不重、单元真实存在；
 *   2. 不超纲：按教材出的每道口算题（kousuan-tags 逐单元抽题），错了以后带出的卡都是这个单元为止教过的；
 *   3. 用错题当例子的卡：100 以内全部加减题逐道生成，背面答案对，「方法」里每个等式都算得对；
 *   4. 挑卡：错题卡在前（最多半页）、本单元的卡都在、不重复、不超过一页、复习的只用学过的；
 *   5. 纸样：数学卡能出页、角上写教材和单元。
 * node tools/check-math-cards.js
 */
require('../js/kousuan-tags.js')
require('../js/math-cards.js')
require('../js/pinyin-flash.js')
const S = globalThis.SumSum
const MC = S.mathCards
const KT = S.kousuanTags
const F = S.pinyinFlash

let pass = 0
const bad = []
function ok(name, cond, info) {
  if (cond) pass++
  else bad.push(name + (info === undefined ? '' : '：' + JSON.stringify(info)))
}

// 1. 字段
const ids = new Set()
for (const c of MC.CARDS) {
  ok(c.id + '：id 不重', !ids.has(c.id))
  ids.add(c.id)
  ok(c.id + '：至少在一本书里', c.at.length >= 1)
  for (const s of c.at) {
    const [b, u] = s.split(':')
    ok(c.id + '：单元 ' + s + ' 存在', !!KT.BOOKS[b] && Number(u) >= 0 && Number(u) < KT.BOOKS[b].units.length)
  }
  ok(c.id + '：正面有大字和问题', !!(c.front.big && c.front.ask))
  ok(c.id + '：问题以问号或句号结尾', /[？?。]$/.test(c.front.ask), c.front.ask)
  ok(c.id + '：背面有答案', !!c.back.big)
  ok(c.id + '：背面至少两行说明', ['rhyme', 'words', 'how', 'pitfall'].filter(k => c.back[k]).length >= 2)
}
for (const b of KT.BOOK_ORDER) {
  ok(b + '：全套至少 10 张', MC.bookCards(b).length >= 10, MC.bookCards(b).length)
  KT.BOOKS[b].units.forEach((u, i) => {
    if (u[1].length) ok(b + ' ' + u[0] + '：有算式的单元有卡', MC.unitCards(b, i).length >= 1)
  })
}
ok('免费的一上前两个单元有卡', MC.unitCards('rj1a', 1).length >= 2 && MC.unitCards('bsd1a', 1).length >= 2)

// 2. 不超纲：按教材每个单元抽的题 → 错了带出的卡在这个单元为止教过
for (const b of KT.BOOK_ORDER) {
  KT.BOOKS[b].units.forEach((u, i) => {
    for (const tag of u[1]) {
      const qs = KT.generate({ weights: { [tag]: 1 }, count: 200, seed: 7 }).questions || []
      let none = 0
      const beyond = new Set()
      for (const q of qs) {
        const id = MC.skillOf(q.key)
        if (!id) { none++; continue }
        if (!MC.learned(MC.BY_ID[id], b, i)) beyond.add(q.key + '→' + id)
      }
      ok(b + ' ' + tag + '：抽到了题', qs.length > 0)
      ok(b + ' ' + tag + '：每道题都有对应的卡', none === 0, none)
      ok(b + ' ' + tag + '：带出的卡不超纲', beyond.size === 0, [...beyond].slice(0, 5))
    }
  })
}
ok('乘除没有卡', MC.skillOf('6 × 7') === null && MC.skillOf('42 ÷ 6') === null)
ok('凑十', MC.skillOf('9 + 4') === 'make10' && MC.skillOf('4 + 9') === 'make10')
ok('破十', MC.skillOf('13 − 9') === 'break10' && MC.skillOf('20 − 7') === 'break10')
ok('两位数退位', MC.skillOf('36 − 8') === 'sub-b' && MC.skillOf('52 − 25') === 'vertical-b')
ok('连加连减', MC.skillOf('5 + 3 − 2') === 'chain')

// 3. 用错题当例子：等式都算得对
function checkHow(name, text, needEq) {
  const eqs = String(text).match(/\d+(?:\s*[+−]\s*\d+)+\s*=\s*\d+/g) || []
  for (const e of eqs) {
    const [l, r] = e.split('=')
    const t = l.trim().split(/\s*([+−])\s*/)
    let v = Number(t[0])
    for (let i = 1; i < t.length; i += 2) v = t[i] === '+' ? v + Number(t[i + 1]) : v - Number(t[i + 1])
    if (v !== Number(r)) return ok(name + '：等式算错 ' + e, false)
  }
  if (needEq) ok(name + '：方法里有等式', eqs.length > 0, text)
  else pass++
}
const MUST = { make10: 0, break10: 0, 'add-c': 0, 'sub-b': 0, vertical: 0, 'vertical-c': 0, 'vertical-b': 0, tens: 0, 'tens-one': 0, 'add-nc': 0, teen: 0, chain: 0 }
let made = 0
const keys = []
for (let a = 0; a <= 100; a++) for (let b = 0; b <= 100; b++) {
  if (a + b <= 100) keys.push(a + ' + ' + b)
  if (a - b >= 0) keys.push(a + ' − ' + b)
}
for (const k of ['5 + 3 − 2', '10 − 3 − 2', '9 + 8 − 6', '45 + 30 − 20', '60 − 25 + 7']) keys.push(k)
const failed = []
for (const key of keys) {
  const id = MC.skillOf(key)
  if (!id) continue
  const c = MC.BY_ID[id]
  ok(key + '：对应的卡存在', !!c, id)
  if (!c || !c.make) continue
  const q = MC.parse(key)
  const m = c.make(q)
  if (!m) {
    if (id in MUST) failed.push(key + '→' + id)
    continue
  }
  made++
  if (id in MUST) MUST[id]++
  if (String(m.back.big) !== String(q.ans)) failed.push(key + ' 答案 ' + m.back.big)
  if (m.front.big !== q.tokens.join(' ') + ' = ？') failed.push(key + ' 正面 ' + m.front.big)
  checkHow(key, m.back.how, id !== 'tens' && id !== 'tens-one')
}
ok('错题例子：主要几类都换成了孩子的题', failed.length === 0, failed.slice(0, 10))
for (const id in MUST) ok(id + '：至少有一道错题能当例子', MUST[id] > 0)
ok('一共生成了很多例子', made > 3000, made)
for (const c of MC.CARDS) {
  if (c.back.how) checkHow(c.id + ' 默认例子', c.back.how, false)
}

// 4. 挑卡
const wrong = [
  { key: '13 − 9', at: 3 }, { key: '14 − 6', at: 2 }, { key: '9 + 4', at: 1 }, { key: '8 + 5', at: 5 },
  { key: '6 × 7', at: 4 }, { key: '5 + 3 − 2', at: 6 }
]
const wc = MC.wrongCards(wrong)
ok('错题归卡：错得多的在前', wc[0].n === 2 && wc[1].n === 2 && wc[2].n === 1 && wc[2].id === 'chain', wc)
ok('错题归卡：例子用最近一次错的', wc.find(w => w.id === 'make10').q.tokens.join(' ') === '8 + 5')
for (const b of KT.BOOK_ORDER) {
  KT.BOOKS[b].units.forEach((u, i) => {
    for (const per of [4, 6]) {
      const p = MC.pick({ book: b, unit: i, wrong, today: '2026-11-28', per })
      const name = b + ' 单元 ' + i + ' 一页 ' + per
      ok(name + '：不超过一页', p.length <= per)
      ok(name + '：不重复', new Set(p.map(x => x.card.id)).size === p.length)
      const firstNonWrong = p.findIndex(x => x.why !== 'wrong')
      const wrongs = p.filter(x => x.why === 'wrong').length
      ok(name + '：错题卡最多先放半页', !MC.unitCards(b, i).length || firstNonWrong === -1 || firstNonWrong <= Math.ceil(per / 2))
      ok(name + '：有错题就有错题卡', wrongs >= 1)
      const unitIds = MC.unitCards(b, i).map(c => c.id)
      const want = Math.min(unitIds.length, per - Math.min(wrongs, Math.ceil(per / 2)))
      ok(name + '：本单元的卡放进来了', p.filter(x => unitIds.includes(x.card.id)).length >= want)
      ok(name + '：复习的只用学过的', p.filter(x => x.why === 'review').every(x => MC.learned(MC.BY_ID[x.card.id], b, i)))
    }
    const p0 = MC.pick({ book: b, unit: i, wrong: [], today: '2026-11-28', per: 6 })
    ok(b + ' 单元 ' + i + '：没错题时一张不超纲', p0.every(x => MC.learned(MC.BY_ID[x.card.id], b, i)))
  })
}
const r1b = MC.pick({ book: 'rj1b', unit: 1, wrong: [{ key: '13 − 9', at: 1 }], today: '2026-11-28', per: 6 })
ok('错题卡用孩子的题当例子', r1b[0].card.id === 'break10' && r1b[0].card.from === '13 − 9' && r1b[0].card.front.big === '13 − 9 = ？')
ok('一下也复习一上的卡', r1b.some(x => x.why === 'review' && MC.placeIn(MC.BY_ID[x.card.id], 'rj1b').book === 'rj1a'))
ok('卡角写教材和单元', MC.tagOf(MC.BY_ID.make10, 'rj1a') === '人教一上 · 第五单元 · 凑十法', MC.tagOf(MC.BY_ID.make10, 'rj1a'))
ok('北师大一下的凑十在第一单元', MC.tagOf(MC.BY_ID.make10, 'bsd1b') === '北师大一下 · 第一单元 · 凑十法')
ok('别的教材的卡只写名字', MC.tagOf(MC.BY_ID['add-c'], 'bsd1b') === '两位数加一位数（进位）')
ok('隔天复习的卡会换', JSON.stringify(MC.pick({ book: 'rj1b', unit: 6, wrong: [], today: '2026-11-28', per: 6 }).map(x => x.card.id)) !==
  JSON.stringify(MC.pick({ book: 'rj1b', unit: 6, wrong: [], today: '2026-11-29', per: 6 }).map(x => x.card.id)) ||
  JSON.stringify(MC.pick({ book: 'rj1b', unit: 6, wrong: [], today: '2026-11-28', per: 6 }).map(x => x.card.id)) !==
  JSON.stringify(MC.pick({ book: 'rj1b', unit: 6, wrong: [], today: '2026-11-30', per: 6 }).map(x => x.card.id)))

// 5. 纸样
const html = F.sheets(MC.bookCards('rj1a'), { size: 'm', kind: 'math', title: '数学闪卡' })
ok('人教一上全套能出页', html.length === Math.ceil(MC.bookCards('rj1a').length / 6))
ok('数学纸带 is-math', html[0].includes('is-math'))
ok('角上写教材单元', html[0].includes('人教一上 · '))
ok('背面有「方法」行', html.join('').includes('<b>方法</b>'))

console.log(pass + ' 项通过' + (bad.length ? '，' + bad.length + ' 项不通过：' : ''))
bad.slice(0, 40).forEach(b => console.log('  ✗ ' + b))
process.exit(bad.length ? 1 : 0)
