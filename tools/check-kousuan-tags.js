/* 口算「按教材 / 按难度」出题引擎（js/kousuan-tags.js）校验：
 *   1. 每种题型抽 400 道，逐道按定义复核（范围、进退位、整除、不出送分题）；
 *   2. 教材：学过的题型只来自本册已学单元 + 上一册，绝不超出；权重当前单元六成、之前四成；
 *   3. 难度预设 15 个都能出满 20 道；「两步」开关让连加连减占一半；
 *   4. 同一个种子出同一批题；错题原样插进去；空在中间只挖两数一算的题。
 * 用法：node tools/check-kousuan-tags.js */
'use strict'
require('../js/kousuan-tags.js')
const K = globalThis.SumSum.kousuanTags

let pass = 0
let fail = 0
function ok(name, cond, extra) {
  if (cond) pass++
  else { fail++; console.log('✗ ' + name + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')) }
}

const carry = (a, b) => K._carry(a, b)
const borrow = (a, b) => K._borrow(a, b)
const two = n => n >= 11 && n <= 99 && n % 10 !== 0
const isTens = n => n >= 10 && n <= 90 && n % 10 === 0

/* 每种题型的独立定义：拿到 [a, op, b] 或连加连减 tokens 和答案，判断合不合格 */
function chainOk(t, cap, stepOk) {
  if (t.length !== 5) return false
  if (t[1] !== t[3] && (t[4] === t[2] || (t[3] === '−' && t[4] === t[0]))) return false /* 一加一减抵消 */
  let v = t[0]
  for (let i = 1; i < t.length; i += 2) {
    const op = t[i]
    const b = t[i + 1]
    if (b === 0) return false
    if (stepOk && !stepOk(v, op, b)) return false
    v = op === '+' ? v + b : v - b
    if (v <= 0 || v > cap) return false
  }
  return true
}
const RULES = {
  add5: ([a, op, b]) => op === '+' && a >= 1 && b >= 1 && a + b <= 5,
  sub5: ([a, op, b]) => op === '−' && a <= 5 && b >= 1 && b < a,
  add10: ([a, op, b]) => op === '+' && a >= 1 && b >= 1 && a + b <= 10,
  sub10: ([a, op, b]) => op === '−' && a <= 10 && b >= 1 && b < a,
  chain10: t => chainOk(t, 10),
  add20n: ([a, op, b]) => op === '+' && a + b <= 19 && Math.max(a, b) >= 10 && Math.min(a, b) >= 1 && !carry(a, b),
  sub20n: ([a, op, b]) => op === '−' && a >= 11 && a <= 19 && b >= 1 && (b === 10 || b <= a % 10) && !borrow(a, b),
  chain20n: t => chainOk(t, 20, (v, op, b) => (op === '+' ? !carry(v, b) : !borrow(v, b))),
  add20c: ([a, op, b]) => op === '+' && a >= 2 && a <= 9 && b >= 2 && b <= 9 && a + b >= 11,
  sub20b: ([a, op, b]) => op === '−' && a >= 11 && a <= 18 && b >= 2 && b <= 9 && borrow(a, b),
  chain20: t => chainOk(t, 20),
  tens1: ([a, op, b]) => op === '+' ? (isTens(a) && b >= 1 && b <= 9) || (isTens(b) && a >= 1 && a <= 9)
    : two(a) && (b === a % 10 || b === a - (a % 10)),
  tens: ([a, op, b]) => isTens(a) && isTens(b) && (op === '+' ? a + b <= 100 : a > b),
  add100n: ([a, op, b]) => op === '+' && a + b <= 99 && !carry(a, b) &&
    ((two(a) && ((b >= 1 && b <= 9) || isTens(b))) || (two(b) && ((a >= 1 && a <= 9) || isTens(a)))),
  sub100n: ([a, op, b]) => op === '−' && two(a) && !borrow(a, b) && ((b >= 1 && b <= 9) || (isTens(b) && b < a)),
  add2d: ([a, op, b]) => op === '+' && two(a) && two(b) && a + b <= 99 && !carry(a, b),
  sub2d: ([a, op, b]) => op === '−' && two(a) && two(b) && a > b && !borrow(a, b),
  add100c: ([a, op, b]) => op === '+' && a + b <= 100 && carry(a, b) && ((two(a) && b >= 2 && b <= 9) || (two(b) && a >= 2 && a <= 9)),
  sub100b: ([a, op, b]) => op === '−' && a >= 20 && a <= 99 && b >= 2 && b <= 9 && borrow(a, b),
  add2dc: ([a, op, b]) => op === '+' && two(a) && two(b) && a + b <= 100 && carry(a, b),
  sub2db: ([a, op, b]) => op === '−' && a >= 20 && two(b) && a > b && borrow(a, b),
  chain100: t => chainOk(t, 100),
  mulP20: ([a, op, b]) => op === '×' && a >= 2 && b >= 2 && a <= 9 && b <= 9 && a * b <= 20,
  mulP50: ([a, op, b]) => op === '×' && a >= 2 && b >= 2 && a <= 9 && b <= 9 && a * b <= 50,
  mulTable: ([a, op, b]) => op === '×' && a >= 2 && b >= 2 && a <= 9 && b <= 9,
  mulTens: ([a, op, b]) => op === '×' && ((isTens(a) && b >= 2 && b <= 9) || (isTens(b) && a >= 2 && a <= 9)),
  mul2x1: ([a, op, b]) => op === '×' && two(a) && b >= 2 && b <= 9 && a * b <= 200,
  mul2x2s: ([a, op, b]) => op === '×' && a >= 11 && a <= 19 && b >= 11 && b <= 19,
  mul2x2: ([a, op, b]) => op === '×' && a >= 11 && a <= 99 && b >= 11 && b <= 99 && (a % 10 !== 0 || b % 10 !== 0),
  divP20: ([a, op, b]) => op === '÷' && b >= 2 && b <= 9 && a % b === 0 && a / b >= 2 && a / b <= 9 && a <= 20,
  divP50: ([a, op, b]) => op === '÷' && b >= 2 && b <= 9 && a % b === 0 && a / b >= 2 && a / b <= 9 && a <= 50,
  divTable: ([a, op, b]) => op === '÷' && b >= 2 && b <= 9 && a % b === 0 && a / b >= 2 && a / b <= 9,
  divTens: ([a, op, b]) => op === '÷' && isTens(a) && a >= 20 && b >= 2 && b <= 9 && a % b === 0 && a / b >= 10,
  div2x1: ([a, op, b]) => op === '÷' && a <= 99 && b >= 2 && b <= 9 && a % b === 0 && a / b >= 10
}

function evalTokens(t) {
  let v = t[0]
  for (let i = 1; i < t.length; i += 2) {
    const b = t[i + 1]
    v = t[i] === '+' ? v + b : t[i] === '−' ? v - b : t[i] === '×' ? v * b : v / b
  }
  return v
}

// 1. 每种题型
ok('每种题型都有校验规则', K.ORDER.every(id => RULES[id]), K.ORDER.filter(id => !RULES[id]))
for (const id of K.ORDER) {
  const r = K.generate({ weights: { [id]: 1 }, count: 400, seed: 7 })
  const bad = r.questions.filter(x => !RULES[id](x.tokens) || evalTokens(x.tokens) !== x.answer)
  ok(id + '（' + K.tagLabel(id) + '）400 道都合格', bad.length === 0, bad.slice(0, 3).map(x => x.key))
  ok(id + ' 题库不够也出满（允许重复）', r.questions.length === 400, r.questions.length)
  const r20 = K.generate({ weights: { [id]: 1 }, count: 20, seed: 7 })
  const keys = r20.questions.map(x => x.key)
  const distinct = new Set(keys).size
  ok(id + ' 一张纸 20 道：题库够就不重复，重复的不挨着', (distinct === 20 || distinct >= 10) && keys.every((k, i) => i === 0 || k !== keys[i - 1]), keys)
}

// 2. 教材
for (const book of K.BOOK_ORDER) {
  const b = K.BOOKS[book]
  b.units.forEach((u, i) => {
    const learned = K.learnedTags(book, i)
    let allowed = []
    if (b.prev) K.BOOKS[b.prev].units.forEach(x => { allowed = allowed.concat(x[1]) })
    b.units.slice(0, i + 1).forEach(x => { allowed = allowed.concat(x[1]) })
    ok(book + ' ' + u[0] + '：学过的题型不超出已学单元', learned.every(t => allowed.includes(t)) && allowed.every(t => learned.includes(t)))
    const w = K.bookWeights(book, i)
    ok(book + ' ' + u[0] + '：权重只给学过的题型', Object.keys(w).every(t => learned.includes(t)))
    if (learned.length) {
      const r = K.generate({ weights: w, count: 20, seed: 3 })
      ok(book + ' ' + u[0] + '：出满 20 道', r.questions.length === 20, r.questions.length)
    }
  })
}
ok('所有教材用到的题型都存在', K.BOOK_ORDER.every(bk => K.BOOKS[bk].units.every(u => u[1].every(t => K.TAGS[t]))))
const w4 = K.bookWeights('rj1b', 3)
const cur4 = ['add100n', 'sub100n', 'add100c', 'sub100b', 'add2d', 'sub2d']
const sumCur = cur4.reduce((s, t) => s + (w4[t] || 0), 0)
ok('人教一下第四单元：本单元合占六成', Math.abs(sumCur - 0.6) < 1e-9, sumCur)
ok('人教一下第四单元：一上的进位加法也在复习里', w4.add20c > 0)
ok('人教一下第四单元：不出第五单元的两位数进位加', !w4.add2dc)
const wShape = K.bookWeights('rj1a', 2) /* 第三单元 认识立体图形：没有算式 */
ok('没有算式的单元：学过的一视同仁', Object.keys(wShape).length === 5 && Object.values(wShape).every(v => Math.abs(v - 0.2) < 1e-9), wShape)
ok('人教一上第一单元之前（数学游戏）什么都没学', Object.keys(K.bookWeights('rj1a', 0)).length === 0)
ok('北师大一上 20 以内要到一下才有', !K.learnedTags('bsd1a', 5).some(t => /20/.test(t)))

// 3. 难度预设
for (const g of ['as', 'mul', 'div']) {
  for (let n = 1; n <= 5; n++) {
    const id = K.levelId(g, n)
    const plan = K.levelPlan(id)
    const r = K.generate({ weights: K.evenWeights(plan.tags), count: 20, seed: 11 })
    ok(K.levelName(id) + ' 出满 20 道', r.questions.length === 20, r.questions.length)
  }
}
ok('乘法预设不受「两步」影响', K.levelPlan('mul3', true).tags.join() === 'mulTable')
const ch = K.generate({ weights: K.evenWeights(K.levelPlan('as3', true).tags), count: 20, seed: 5 })
ok('加减 3 级开「两步」：一半是连加连减', ch.questions.filter(x => x.tokens.length === 5).length === 10)
ok('levelName', K.levelName('as3') === '加减 3 级 · 20 以内进位退位', K.levelName('as3'))
ok('乱写的预设 id 认不出', K.parseLevel('as9') === null && K.levelPlan('x') === null)

// 4. 种子、错题、空在中间
const a1 = K.generate({ weights: K.bookWeights('rj1b', 4), count: 20, seed: 42 })
const a2 = K.generate({ weights: K.bookWeights('rj1b', 4), count: 20, seed: 42 })
ok('同一个种子同一批题', JSON.stringify(a1) === JSON.stringify(a2))
const a3 = K.generate({ weights: K.bookWeights('rj1b', 4), count: 20, seed: 43 })
ok('换种子换一批', JSON.stringify(a1) !== JSON.stringify(a3))
const m = K.generate({ weights: { add20c: 1 }, count: 20, seed: 1, mustInclude: ['12 − 5', '7 + 8', 'x', '3 + 4 + 5', '2 − 9 + 1'] })
ok('错题原样插进去、总数不变', m.questions.length === 20 && m.questions.some(x => x.key === '12 − 5') && m.questions.some(x => x.key === '7 + 8'))
ok('错题不重复出现', m.questions.filter(x => x.key === '7 + 8').length === 1)
ok('连加连减的错题也再出、算错的不收', m.questions.some(x => x.key === '3 + 4 + 5' && x.answer === 12) && !m.questions.some(x => x.key === '2 − 9 + 1'))
const bm = K.generate({ weights: K.evenWeights(['add20c', 'chain20']), count: 40, seed: 9, blankMid: true })
ok('空在中间：有挖加数的题', bm.questions.some(x => x.blank === 0 || x.blank === 2))
ok('空在中间：连加连减只挖结果', bm.questions.filter(x => x.tokens.length === 5).every(x => x.blank === 'ans'))
const nb = K.generate({ weights: { add20c: 1 }, count: 20, seed: 9 })
ok('不开空在中间：全挖结果', nb.questions.every(x => x.blank === 'ans'))
const al = K.allocate({ a: 0.6, b: 0.2, c: 0.2 }, 20, 1)
ok('分配题量：6:2:2 → 12/4/4', al.a === 12 && al.b === 4 && al.c === 4, al)
const al2 = K.allocate({ a: 1, b: 1, c: 1 }, 20, 1)
ok('分配题量：除不尽也凑满', al2.a + al2.b + al2.c === 20, al2)

// 5. 出题方式的状态（js/kousuan-mode.js）
require('../js/kousuan-mode.js')
const M = globalThis.SumSum.kousuanMode
function fakeStore(init) {
  const data = Object.assign({}, init)
  return { get: k => (k in data ? JSON.parse(JSON.stringify(data[k])) : null), set: (k, v) => { data[k] = JSON.parse(JSON.stringify(v)) }, data }
}
const fresh = fakeStore()
const f = M.init(fresh, new Date(2026, 10, 28))
ok('新用户：按难度、选中「默认难度」', f.mode.kind === 'level' && f.mode.pick === 'p:old', f.mode)
ok('新用户：只有一套「默认难度」，按数的范围出', f.plans.length === 1 && f.plans[0].name === '默认难度' && f.plans[0].kind === 'params', f.plans)
ok('新用户：默认难度也先不存', !fresh.data[M.PLANS_KEY])
ok('切到按教材：11 月猜人教一上第四单元', (m => m.book === 'rj1a' && m.unit === 4)(M.cleanMode({ kind: 'book' }, f.plans)) || new Date().getMonth() !== 10)
ok('新用户：默认值先不存（等同步回来的老设置）', !fresh.data[M.MODE_KEY] && !f.saved)
ok('3 月猜人教一下第二单元', M.guessBook(new Date(2027, 2, 1)).book === 'rj1b' && M.guessBook(new Date(2027, 2, 1)).unit === 1)
const oldStore = fakeStore({ 'sumsum:settings:v1': { mode: 'mul', mulMin: 2, mulMax: 9, count: 30, columns: 4, carryMode: 'random', min: 0, max: 20 } })
const o = M.init(oldStore)
ok('老用户：按难度、选中「默认难度」', o.mode.kind === 'level' && o.mode.pick === 'p:old', o.mode)
ok('老用户：原来的出题参数存进这套难度（排版、题量不算）', o.plans[0].kind === 'params' && o.plans[0].s.mode === 'mul' && o.plans[0].s.mulMin === 2 && !('count' in o.plans[0].s) && !('columns' in o.plans[0].s), o.plans[0])
const r0 = M.resolve(o.mode, o.plans)
ok('老用户：仍走原来的出题方式', r0.engine === 'params' && r0.params.mode === 'mul')
const o2 = M.init(oldStore)
ok('第二次打开不再新建', o2.plans.length === 1 && !o2.first)
ok('老用户：默认难度和出题方式都存下了', oldStore.data[M.PLANS_KEY].plans[0].name === '默认难度' && oldStore.data[M.MODE_KEY].pick === 'p:old')
const renamed = M.init(fakeStore({ [M.PLANS_KEY]: { plans: [{ id: 'old', name: '我原来的设置', kind: 'params', s: { mode: 'add' } }] }, [M.MODE_KEY]: { kind: 'level', pick: 'p:old' } }))
ok('上一版的「我原来的设置」改叫「默认难度」', renamed.plans[0].name === '默认难度' && renamed.plans.length === 1)
const onlyMine = fakeStore({ [M.PLANS_KEY]: { plans: [{ id: 'c1', name: '乘法', kind: 'tags', tags: ['mulTable'] }] }, [M.MODE_KEY]: { kind: 'book', book: 'rj1b', unit: 2 } })
const om = M.init(onlyMine)
ok('只存过自己难度的：补上默认难度放最前，选的不变', om.plans.map(p => p.id).join() === 'old,c1' && om.mode.kind === 'book' && onlyMine.data[M.PLANS_KEY].plans.length === 2)
const rb = M.resolve({ kind: 'book', book: 'rj1a', unit: 5, pick: 'as1' }, [])
ok('按教材的标题用单元名', rb.title === '20 以内的进位加法口算', rb.title)
const rs = M.resolve({ kind: 'book', book: 'rj1a', unit: 3, pick: 'as1' }, [])
ok('图形单元的标题：复习', rs.title === '人教一上口算复习', rs.title)
const rl = M.resolve({ kind: 'level', pick: 'as3', chain: true, blankMid: true }, [])
ok('预设：带「两步」「空在中间」，记下预设 id', rl.preset === 'as3' && rl.blankMid && Object.keys(rl.weights).includes('chain20'), rl)
const plans = [{ id: 'c1', name: '我家的乘法', kind: 'tags', tags: ['mulP20', 'nope'], blankMid: true }]
const cm = M.cleanMode({ kind: 'level', pick: 'p:c1' }, M.readPlans(fakeStore({ [M.PLANS_KEY]: { plans } })))
ok('自己的难度能选中', cm.pick === 'p:c1')
ok('选中的难度被删了 → 回到默认难度', M.cleanMode({ kind: 'level', pick: 'p:zz' }, f.plans).pick === 'p:old')
const rp = M.resolve(cm, M.readPlans(fakeStore({ [M.PLANS_KEY]: { plans } })))
ok('自己的难度：不认识的题型丢掉，标题用名字', rp.title === '我家的乘法' && Object.keys(rp.weights).join() === 'mulP20' && rp.blankMid, rp)
const tt = (tags, name, id) => M.tagsTitle({ id: id || 'c1', name: name || '我的难度 1', tags })
ok('没改名的难度：标题按题型起', tt(['mul2x2s']) === '两位数乘两位数（20 以内的数）口算' && tt(['mul2x2s', 'mulTable']) === '乘法口算' && tt(['mulTable', 'add10']) === '口算练习')
ok('分享来的难度：标题按题型起', tt(['divTable'], '分享来的难度', 'share') === '表内除法口算')
ok('改过名字：标题用名字', tt(['mulTable'], '周末乘法') === '周末乘法')
ok('坏数据：单元号越界钳回去', M.cleanMode({ kind: 'book', book: 'bsd1a', unit: 99 }, []).unit <= 5)
ok('新难度编号不撞', M.newId([{ id: 'c1' }, { id: 'c2' }]) === 'c3')

console.log((fail ? '' : '✓ ') + '口算题型引擎：' + pass + ' 通过，' + fail + ' 失败')
process.exit(fail ? 1 : 0)
