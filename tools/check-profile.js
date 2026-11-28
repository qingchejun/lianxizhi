/* 孩子档案（js/profile.js）校验：档案的读写、从老设置推档案、改档案后各学科的课本跟着变、「学到哪」三周没改的提醒。
 * 用法：node tools/check-profile.js */
'use strict'
require('../js/profile.js')
const P = globalThis.SumSum.profile

let pass = 0
let fail = 0
function ok(name, cond, extra) {
  if (cond) pass++
  else { fail++; console.log('✗ ' + name + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')) }
}

function mem(init) {
  const data = JSON.parse(JSON.stringify(init || {}))
  return {
    data,
    get: k => (k in data ? JSON.parse(JSON.stringify(data[k])) : null),
    set: (k, v) => { data[k] = JSON.parse(JSON.stringify(v)) }
  }
}
const MODE = 'sumsum:kousuan:mode:v1'
const SZ = 'sumsum:shizi:v1'
const DAY = 864e5

/* --- 读写 --- */
{
  const s = mem()
  ok('没档案时 get 为空', P.get(s) === null)
  ok('不完整的档案存不进去', P.save(s, { grade: 1, term: 'a' }) === null && P.get(s) === null)
  ok('不认识的年级、课本存不进去', P.save(s, { grade: 9, term: 'a', math: 'rj' }) === null && P.save(s, { grade: 1, term: 'a', math: 'sj' }) === null)
  P.save(s, { grade: 1, term: 'b', math: 'bsd', extra: 1 })
  ok('存下：留年级、学期、数学课本，多余字段丢掉', JSON.stringify(P.get(s)) === JSON.stringify({ grade: 1, term: 'b', math: 'bsd' }), P.get(s))
  ok('存成 kids 数组（给以后多孩子留位置）', Array.isArray(s.data['sumsum:profile:v1'].kids) && s.data['sumsum:profile:v1'].cur === 0)
  const k = P.get(s)
  ok('课本编号：北师大一下 / 统编一下', P.mathBook(k) === 'bsd1b' && P.yuwenBook(k) === 'rj1b')
  ok('给人看的名字', P.mathName(k) === '北师大版一年级下册' && P.yuwenName(k) === '统编版一年级下册' && P.summary(k) === '一年级下学期 · 数学北师大版', [P.mathName(k), P.summary(k)])
}

/* --- 老用户推档案 --- */
{
  const a = P.infer(mem({ [MODE]: { kind: 'book', book: 'bsd1a', unit: 3 } }))
  ok('口算按教材出过题：推出完整档案', a.kid && a.kid.math === 'bsd' && a.kid.term === 'a' && a.kid.grade === 1, a)
  const b = P.infer(mem({ [MODE]: { kind: 'level', book: 'rj1a', unit: 2 } }))
  ok('口算按难度（课本是猜的）：不算数，要问', b.kid === null, b)
  const c = P.infer(mem({ [SZ]: { book: 'rj1b', lesson: 5 } }))
  ok('只有识字用课本：推不出数学，但预填下学期', c.kid === null && c.hint && c.hint.term === 'b', c)
  const d = P.infer(mem({ [SZ]: { book: 'hongen' } }))
  ok('识字用某恩：什么都推不出', d.kid === null && d.hint === null, d)
  ok('什么都没有：要问', P.infer(mem()).kid === null)
  const e = P.infer(mem({ [MODE]: { kind: 'book', book: 'rj1a', unit: 5 }, [SZ]: { book: 'rj1b', lesson: 8 } }))
  ok('数学一上、识字已经一下：学期对不上，不悄悄定，弹框预填数学课本', e.kid === null && e.hint && e.hint.math === 'rj' && e.hint.term === null, e)
  const f = P.infer(mem({ [MODE]: { kind: 'book', book: 'bsd1b', unit: 2 }, [SZ]: { book: 'rj1b', lesson: 8 } }))
  ok('数学、识字都是下学期：照样悄悄定', f.kid && f.kid.term === 'b' && f.kid.math === 'bsd', f)
}

/* --- 改档案 → 各学科课本跟着变 --- */
{
  const s = mem({ [MODE]: { kind: 'book', book: 'rj1a', unit: 4, pick: 'as3' }, [SZ]: { book: 'rj1a', lesson: 20, xieBook: 'rj1a', xieLesson: 7, perWeek: 100 } })
  P.apply(s, { grade: 1, term: 'b', math: 'bsd' })
  const m = s.get(MODE)
  ok('数学换成北师大一下、单元清掉重猜、别的设置不动', m.book === 'bsd1b' && !('unit' in m) && m.pick === 'as3' && m.kind === 'book', m)
  const z = s.get(SZ)
  ok('识字换成统编一下、从第 1 课', z.book === 'rj1b' && z.lesson === 1 && z.perWeek === 100, z)
  ok('写字跟着换、从自动的那一课', z.xieBook === 'rj1b' && z.xieLesson === 0, z)
}
{
  const s = mem({ [MODE]: { kind: 'book', book: 'rj1a', unit: 4 }, [SZ]: { book: 'rj1a', lesson: 20, xieBook: 'rj1a', xieLesson: 7 } })
  P.apply(s, { grade: 1, term: 'a', math: 'rj' })
  ok('课本没变：单元、课都不动', s.get(MODE).unit === 4 && s.get(SZ).lesson === 20 && s.get(SZ).xieLesson === 7)
  P.apply(s, { grade: 1, term: 'a', math: 'rj' }, { mathUnit: 2, yuwenLesson: 9 })
  ok('弹框里选了学到哪：写进去', s.get(MODE).unit === 2 && s.get(SZ).lesson === 9)
  ok('选了学到哪：记下改的时间', s.get('sumsum:progress-at:v1').math > 0 && s.get('sumsum:progress-at:v1').yuwen > 0)
}
{
  const s = mem({ [SZ]: { book: 'hongen', lesson: 0, xieBook: 'rj1a' } })
  P.apply(s, { grade: 1, term: 'b', math: 'rj' })
  ok('认字用某恩：认字不动，写字照样跟档案', s.get(SZ).book === 'hongen' && s.get(SZ).xieBook === 'rj1b', s.get(SZ))
  ok('口算没用过：不凭空建设置', s.get(MODE) === null)
}
{
  const s = mem()
  P.apply(s, { grade: 1, term: 'a', math: 'bsd' }, { mathUnit: 3 })
  ok('新用户在弹框里选了数学单元：建一份口算设置（按难度不变，课本和单元记下）', s.get(MODE).book === 'bsd1a' && s.get(MODE).unit === 3 && s.get(MODE).kind === 'level', s.get(MODE))
}

/* --- 三周没改「学到哪」的提醒 --- */
{
  const now = Date.UTC(2026, 11, 20)
  const s = mem({ [MODE]: { kind: 'book', book: 'rj1a', unit: 4 }, [SZ]: { book: 'rj1a', lesson: 20 } })
  ok('没档案：不提醒', P.stale(s, now).length === 0)
  P.save(s, { grade: 1, term: 'a', math: 'rj' })
  ok('第一次看：从现在算起，不提醒', P.stale(s, now).length === 0 && s.get('sumsum:progress-at:v1').math === now)
  ok('20 天：不提醒', P.stale(s, now + 20 * DAY).length === 0)
  ok('22 天：数学、语文都提醒', JSON.stringify(P.stale(s, now + 22 * DAY)) === JSON.stringify(['math', 'yuwen']))
  P.touch(s, 'math', now + 22 * DAY)
  ok('数学改过了：只剩语文', JSON.stringify(P.stale(s, now + 23 * DAY)) === JSON.stringify(['yuwen']))
  s.set(MODE, { kind: 'level', book: 'rj1a' })
  s.set(SZ, { book: 'hongen' })
  ok('口算按难度、识字用某恩：都不提醒', P.stale(s, now + 60 * DAY).length === 0)
}

console.log(fail ? '\n' + fail + ' 处问题' : '✓ 孩子档案 ' + pass + ' 项全部通过')
process.exit(fail ? 1 : 0)
