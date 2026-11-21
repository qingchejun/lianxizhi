'use strict'

const assert = require('node:assert/strict')
require('../js/pinyin-syllables.js')
require('../js/pinyin-words.js')
require('../js/pinyin-data.js')
require('../js/pinyin-core.js')
const P = globalThis.SumSum.pinyin
const d = '2026-11-20'
const first = P.makeSheet(d, {})
assert.equal(first.focus, 'letters')
assert.deepEqual(first, P.makeSheet(d, {}))
assert.equal(first.groups[0].items.length, 4)
assert.equal(first.groups[1].items.length, 2)
assert.equal(Object.keys(P.derive([first], {}, d)).length, 0)
// 手选一个没练过的方向：理由要是一句通顺的话（曾拼成「试一试n / l 听读对照」）
assert.equal(P.makeSheet(d, {}, { focus: 'nl', mode: 'topic' }).reason, '第一次练「n / l 听读对照」，先看看孩子掌握得怎样')
// 卷号：日期 + 4 位短码，避开 0/O/1/I/L 这类认不清的字符；撞上已有卷号就换一个
const ids = new Set()
let seq = 0
const fakeRandom = () => [0.01, 0.99, 0.5, 0.25, 0.75][seq++ % 5]
for (let i = 0; i < 50; i++) {
  const id = P.makeId('2026-11-21', ids, Math.random)
  assert.match(id, /^1121-[2-9A-HJKMNP-Z]{4}$/, id)
  assert.ok(!ids.has(id))
  ids.add(id)
}
const fixed = new Set([P.makeId('2026-11-21', new Set(), fakeRandom)])
seq = 0
assert.notEqual(P.makeId('2026-11-21', fixed, fakeRandom), [...fixed][0])
console.log('拼音规则通过')

const group = first.groups[0]
const miss = { result: 'miss' }
const missD = { result: 'miss', heard: 'd' }
const marksFor = (sheet, records) => ({ [sheet.id]: records })
const complete = group => Object.fromEntries(group.items.map(item => [item.id, { result: 'ok' }]))
const tomorrow = P.addDays(d, 1)
const followUp = P.addDays(d, 2)

const partial = P.confirmRange(group, { 2: miss }, '2')
assert.deepEqual(Object.values(partial).map(mark => mark.result), ['ok', 'miss', 'unpracticed', 'unpracticed'])
const partialState = P.derive([first], marksFor(first, partial), d)
assert.equal(partialState.letters.due, tomorrow)
assert.equal(partialState.letters.streak, 0)
assert.equal(partialState.bd, undefined)
assert.equal(P.makeSheet(tomorrow, partialState).focus, 'letters')
assert.equal(P.confirmRange(group, {}, '4', ['3'])[3].result, 'unpracticed')

const b = group.items.find(item => item.text === 'b')
const p = group.items.find(item => item.text === 'p')
const knownPair = P.derive([first], marksFor(first, { [b.id]: missD }), d)
assert.equal(P.makeSheet(tomorrow, knownPair).focus, 'bd')
const both = P.derive([first], marksFor(first, { [b.id]: missD, [p.id]: miss }), d)
assert.equal(both.letters.due, tomorrow)
assert.equal(both.bd.due, tomorrow)
assert.equal(P.derive([first], marksFor(first, { [b.id]: { result: 'unpracticed' } }), tomorrow).letters, undefined)

const blend = first.groups[1]
const toneError = P.derive([first], marksFor(first, {
  ...complete(group), ...complete(blend), [blend.items[0].id]: { result: 'miss', tone: true }
}), d)
assert.equal(P.makeSheet(tomorrow, toneError).focus, 'tones')
assert.equal(toneError.letters.streak, 1)
assert.equal(toneError.blend.streak, 0)

const firstMarks = { ...complete(group), ...complete(blend) }
const passed = P.derive([first], marksFor(first, firstMarks), d)
assert.equal(passed.letters.due, followUp)
assert.notEqual(P.makeSheet(tomorrow, passed).focus, 'letters')
const second = P.makeSheet(followUp, passed)
assert.equal(second.focus, 'letters')
assert.notDeepEqual(second.groups[0].items.map(item => item.text), group.items.map(item => item.text))
assert.ok(second.groups[1].items.every(item => !passed.blend.accepted.includes(item.text)))

const sameDay = { ...first, id: 'other-device' }
assert.equal(P.derive([first, sameDay], {
  ...marksFor(first, firstMarks), ...marksFor(sameDay, firstMarks)
}, followUp).letters.streak, 1)
const stable = P.derive([first, second], {
  ...marksFor(first, firstMarks), ...marksFor(second, complete(second.groups[0]))
}, followUp)
assert.equal(stable.letters.streak, 2)
const errorDate = P.addDays(followUp, 1)
const error = P.makeSheet(errorDate, stable, { focus: 'letters', mode: 'topic' })
const reopened = P.derive([first, second, error], {
  ...marksFor(first, firstMarks), ...marksFor(second, complete(second.groups[0])),
  ...marksFor(error, { 1: miss })
}, errorDate)
assert.equal(reopened.letters.streak, 0)
assert.equal(reopened.letters.due, P.addDays(errorDate, 1))

const D = globalThis.SumSum.pinyinData
const S = globalThis.SumSum.pinyinSyllables
assert.equal(Object.keys(S.syllables).length, 407)
assert.equal(D.lessons.length, 20)
assert.equal(D.topics.length, 10)
assert.equal(new Set(D.vocabulary.map(word => word.hanzi)).size, D.vocabulary.length)
assert.ok(D.vocabulary.length >= 200 && D.vocabulary.length <= 300)
assert.equal(S.split('lüè').final, 'üe')
assert.equal(S.split('biang'), null)
for (const direction of Object.values(D.directions)) {
  assert.ok(direction.samples.length >= 3, direction.id)
  if (!direction.id.startsWith('lesson-') && ['sound', 'tone', 'word', 'whole', 'blend'].includes(direction.kind)) {
    for (const syllable of direction.samples.flat().join(' ').replaceAll('.', '').split(' ')) {
      assert.ok(S.split(syllable), direction.id + '：' + syllable)
    }
  }
}
const allStable = Object.fromEntries(D.order.map(id => [id, { observed: true, streak: 2 }]))
assert.equal(P.makeSheet(d, allStable), null)
for (const focus of D.order) {
  const due = Object.fromEntries(D.order.map(id => [id, { observed: true, due: d }]))
  const sheet = P.makeSheet(d, due, { focus })
  const normal = sheet.groups.filter(group => group.phase !== 'check')
  assert.ok(normal.flatMap(group => group.items).length <= 15)
  assert.ok(sheet.cards.every(card => {
    const group = sheet.groups.find(group => group.id === card.group)
    return group.items.length === (group.direction === 'letters' ? 4 : 2)
  }))
}

// 换题再试必须真的换题：不能和触发它的那组一模一样（字母只有四个时至少换顺序）。
for (const day of Array.from({ length: 14 }, (_, index) => P.addDays(d, index))) for (const state of [{}, Object.fromEntries(D.order.map(id => [id, { observed: true, due: day }]))]) {
  for (const focus of D.order) {
    const sheet = P.makeSheet(day, state, { focus })
    for (const card of sheet.cards.filter(card => card.startsAt)) {
      const texts = id => sheet.groups.find(group => group.id === id).items.map(item => item.text)
      assert.notEqual(texts(card.group).join('/'), texts(card.startsAt).join('/'), focus + ' 换题再试与原题相同')
    }
  }
}
assert.notEqual(first.groups.at(-2).items.map(item => item.text).join('/'), group.items.map(item => item.text).join('/'))

const mem = new Map()
globalThis.localStorage = {
  get length() { return mem.size },
  key: index => [...mem.keys()][index],
  getItem: key => mem.get(key) ?? null,
  setItem: (key, value) => mem.set(key, value)
}
require('../js/store.js')
require('../js/pinyin-storage.js')
const DB = globalThis.SumSum.pinyinStorage
DB.saveSheet(first)
DB.saveSheet(sameDay)
DB.saveMark(first, '1', miss)
DB.saveMark(sameDay, '1', { result: 'ok' })
DB.saveMark(first, '1', { result: 'unpracticed' })
const restored = DB.read(globalThis.localStorage)
assert.deepEqual(restored.sheets.find(sheet => sheet.id === sameDay.id), sameDay)
assert.equal(restored.marks[first.id][1].result, 'unpracticed')
assert.equal(restored.marks[sameDay.id][1].result, 'ok')
assert.ok(globalThis.SumSum.store.meta()['sumsum:pinyin:mark:v1:' + first.id + ':1'] > 1)
console.log('半组、撤销、混淆定位、跨日复核、题库、休息日与分卷存储通过')

require('../js/backup.js')
const backup = globalThis.SumSum.backup
const exported = backup.parse(JSON.stringify(backup.collect(globalThis.localStorage)))
assert.ok(exported.ok)
assert.match(backup.describe(exported.data).join(' '), /拼音练习卷：2 张/)
mem.clear()
backup.apply(globalThis.localStorage, exported.data)
const imported = DB.read(globalThis.localStorage)
assert.deepEqual(imported, restored)
assert.deepEqual(P.derive(imported.sheets, imported.marks, d), P.derive(restored.sheets, restored.marks, d))
console.log('备份恢复保持原卷、题号和复核状态')
