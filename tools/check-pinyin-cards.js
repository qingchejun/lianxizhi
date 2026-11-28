'use strict'
/*
 * 拼音知识点闪卡（js/pinyin-cards.js、js/pinyin-flash.js）：
 *   1. 每张卡字段齐全、id 不重、课号 1–14、direction 在 pinyin-data 里；
 *   2. 例词里的每个拼音音节都是合法音节，且只用到这一课为止学过的声母、韵母（不超纲）；
 *   3. 挑卡：本课在前、该练了的其次、补满不重复；纸样页数、空格对。
 * node tools/check-pinyin-cards.js
 */
require('../js/pinyin-syllables.js')
require('../js/pinyin-words.js')
require('../js/pinyin-data.js')
require('../js/pinyin-cards.js')
require('../js/pinyin-flash.js')
const S = globalThis.SumSum
const D = S.pinyinData
const CARDS = S.pinyinCards.CARDS
const F = S.pinyinFlash
const split = S.pinyinSyllables.split

let pass = 0
const bad = []
function ok(name, cond, info) {
  if (cond) pass++
  else bad.push(name + (info === undefined ? '' : '：' + JSON.stringify(info)))
}

/* 统编一上 14 课：声母、韵母各在第几课学（三拼的 ua uo ia 第 5 课学，带介音的其余韵母取组成部分里最晚的一课） */
const INITIAL = { b: 3, p: 3, m: 3, f: 3, d: 4, t: 4, n: 4, l: 4, g: 5, k: 5, h: 5, j: 6, q: 6, x: 6,
  z: 7, c: 7, s: 7, zh: 8, ch: 8, sh: 8, r: 8, y: 9, w: 9, '': 1 }
const FINAL = { a: 1, o: 1, e: 1, i: 2, u: 2, 'ü': 2, v: 2, ua: 5, uo: 5, ia: 5, ai: 10, ei: 10, ui: 10, ao: 11, ou: 11, iu: 11,
  ie: 12, 'üe': 12, ue: 12, er: 12, an: 13, en: 13, in: 13, un: 13, 'ün': 13, ang: 14, eng: 14, ing: 14, ong: 14 }
const WHOLE = { zhi: 8, chi: 8, shi: 8, ri: 8, zi: 7, ci: 7, si: 7, yi: 9, wu: 9, yu: 9, ye: 12, yue: 12, yuan: 13, yin: 13, yun: 13, ying: 14 }

function plain(syl) {
  return syl.toLowerCase().normalize('NFD').replace(/[̀́̄̌]/g, '').normalize('NFC')
}
function finalLesson(f) {
  if (FINAL[f]) return FINAL[f]
  /* iao ian iang uan uang uai iong üan：介音（5 课学三拼）+ 后面的韵母 */
  const base = f.replace(/^[iuü]/, '')
  return FINAL[base] ? Math.max(5, FINAL[base]) : 99
}
/* 这个音节最早第几课能读：整体认读看整体表，其余看声母、韵母里晚的那个 */
function lessonOf(syl) {
  const p = plain(syl)
  if (WHOLE[p]) return WHOLE[p]
  const sp = split(p)
  if (!sp) return /^[aoeiuü]+$/.test(p) && FINAL[p] ? FINAL[p] : null
  let f = sp.final
  if (/^[jqxy]/.test(sp.initial) && /^u/.test(f)) f = 'ü' + f.slice(1) /* ju、que、xun 里的 u 是 ü */
  return Math.max(INITIAL[sp.initial] || 99, finalLesson(f))
}
/* 一行例词里的拼音音节（去掉汉字、标点、破折号） */
function syllables(line) {
  return String(line).split(/[^a-zA-ZüÜāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ]+/).filter(Boolean)
}

// 1. 字段
const ids = new Set()
for (const c of CARDS) {
  ok(c.id + '：id 不重', !ids.has(c.id))
  ids.add(c.id)
  ok(c.id + '：课号 1–14', c.lesson >= 1 && c.lesson <= 14, c.lesson)
  ok(c.id + '：direction 存在', c.direction === null || !!D.directions[c.direction], c.direction)
  ok(c.id + '：正面有大字和问题', !!(c.front.big && c.front.ask))
  ok(c.id + '：背面有答案', !!c.back.big)
  ok(c.id + '：背面至少两行说明', ['rhyme', 'words', 'pitfall', 'list'].filter(k => c.back[k]).length >= 2)
  ok(c.id + '：问题以问号结尾', /[？?。]$/.test(c.front.ask), c.front.ask)
}
ok('一共 38 张', CARDS.length === 38, CARDS.length)
for (let n = 1; n <= 14; n++) ok('第 ' + n + ' 课至少 2 张', CARDS.filter(c => c.lesson === n).length >= 2)

// 2. 例词不超纲、音节合法
for (const c of CARDS) {
  for (const s of syllables(c.back.words || '')) {
    const at = lessonOf(s)
    ok(c.id + '：例词「' + s + '」是合法音节', at !== null)
    if (at !== null) ok(c.id + '：例词「' + s + '」第 ' + at + ' 课才学，超纲了', at <= c.lesson)
  }
}
ok('自测：zhǐ 第 8 课', lessonOf('zhǐ') === 8)
ok('自测：jǔ 第 6 课', lessonOf('jǔ') === 6)
ok('自测：xué 第 12 课', lessonOf('xué') === 12)
ok('自测：guā 第 5 课', lessonOf('guā') === 5)
ok('自测：shuǐ 第 10 课', lessonOf('shuǐ') === 10)
ok('自测：nǎi 第 10 课（第 4 课用就超纲）', lessonOf('nǎi') === 10)

// 3. 挑卡
const today = '2026-11-28'
const p6 = F.pick(CARDS, 6, {}, today, 6)
ok('第 6 课：先放这一课的 3 张', p6.slice(0, 3).every(x => x.card.lesson === 6 && x.why === 'lesson'), p6.map(x => x.card.id))
ok('第 6 课：补满 6 张、都是前面的课', p6.length === 6 && p6.slice(3).every(x => x.card.lesson < 6 && x.why === 'review'))
ok('不重复', new Set(p6.map(x => x.card.id)).size === p6.length)
const state = { nl: { observed: true, streak: 0, due: '2026-11-27' }, bd: { observed: true, streak: 2, due: null }, tones: { observed: true, streak: 1, due: '2026-12-01' } }
const pd = F.pick(CARDS, 6, state, today, 6)
ok('该练了的（n/l 到日子）排在复习前面', pd[3].card.id === 'k04-nl' && pd[3].why === 'due', pd.map(x => x.card.id + ':' + x.why))
ok('已掌握的、没到日子的不算该练了', !pd.some(x => x.why === 'due' && (x.card.id === 'k03-bd' || x.card.id === 'k01-tones')))
ok('第 1 课：只有本课 2 张（前面没课）', F.pick(CARDS, 1, {}, today, 6).length === 2)
ok('一页 4 张：最多 4 张', F.pick(CARDS, 14, {}, today, 4).length === 4)
ok('隔天补的卡会换', F.pick(CARDS, 10, {}, '2026-11-28', 6).map(x => x.card.id).join() !== F.pick(CARDS, 10, {}, '2026-11-29', 6).map(x => x.card.id).join())
ok('当前课：一课没练过 → 第 1 课', F.currentLesson(D.lessons, {}) === 1)
ok('当前课：练过第 6 课的方向 → 第 6 课', F.currentLesson(D.lessons, { 'v-dot': { observed: true } }) === 6)

// 4. 纸样
ok('38 张一页 6 张 = 7 页', F.sheets(CARDS, {}).length === 7)
ok('38 张一页 4 张 = 10 页', F.sheets(CARDS, { size: 'l' }).length === 10)
const last = F.sheets(CARDS, {})[6]
ok('最后一页 2 张卡 + 4 个空格', (last.match(/data-card=/g) || []).length === 2 && (last.match(/is-empty/g) || []).length === 4)
ok('转义：卡片内容进 HTML 前转义', !F.sheets([{ id: 'x', lesson: 1, title: '<b>', front: { big: 'a', ask: '?' }, back: { big: 'b' } }])[0].includes('<b><'))

if (bad.length) {
  console.log('✗ 拼音闪卡：' + bad.length + ' 处问题')
  bad.slice(0, 30).forEach(m => console.log('  · ' + m))
  process.exit(1)
}
console.log('✓ 拼音闪卡：' + pass + ' 项通过（38 张卡、例词不超纲、挑卡、纸样）')
