#!/usr/bin/env node
/**
 * 奥数解析页标题校验。用法：node tools/check-aoshu-sol.js
 *
 * 页眉标题是 nowrap 的，纸宽留给标题的只有约 75mm（约 12 个字，见 sheet.css
 * 的 .sheet-title / .sheet-meta）。综合复习卷的默认标题「综合复习 · 混合 N 个
 * 知识点」已经有 12 个字，再追加「（解析）」必然顶破页眉（2026-11-18 用户打印
 * 时发现解析页页眉排到纸外）。规则：
 *   - 综合复习卷 + 没自拟标题 → 解析页就叫「综合复习解析」；
 *   - 自拟了标题（无论是不是复习卷）→ 照旧追加「（解析）」，长度是家长自己定的；
 *   - 单课卷 → 课名标题照旧追加「（解析）」（历史行为，不动）。
 * 装页测高要真实排版，node 里测不了；紧凑省纸档（.sol-grid.compact）的
 * 页数取舍在浏览器里验（见 e2e）。
 */
'use strict'

require('../js/aoshu-topics.js')
require('../js/aoshu-render.js')

var R = globalThis.SumSum.aoshu.render

var failures = []
function check(name, cond, detail) {
  if (!cond) failures.push(name + (detail ? '：' + detail : ''))
}

var t = R.solTitle
check('solTitle 已导出', typeof t === 'function')

/* 综合复习卷、没自拟标题：短标题，6 个字，页眉放得下 */
var v1 = t({ title: '' }, { review: true }, '综合复习 · 混合 6 个知识点')
check('复习卷默认标题 → 综合复习解析', v1 === '综合复习解析', '实际是 ' + v1)
check('复习卷默认标题够短（页眉约放得下 12 个字）', v1.length <= 8, v1 + ' 共 ' + v1.length + ' 字')

/* 综合复习卷、自拟了标题：照旧追加（解析） */
var v2 = t({ title: '期末混合' }, { review: true }, '期末混合')
check('复习卷自拟标题照旧追加（解析）', v2 === '期末混合（解析）', '实际是 ' + v2)

/* 单课卷：历史行为不动 */
var v3 = t({ title: '' }, {}, '移多补少练习 · 20以内')
check('单课卷照旧追加（解析）', v3 === '移多补少练习 · 20以内（解析）', '实际是 ' + v3)

/* title 传进来的就是最终卷面标题：解析页标题只在这一个函数里定 */
var v4 = t({}, {}, '第 3 课 · 巧填算符')
check('无 opts 时也按单课卷处理', v4 === '第 3 课 · 巧填算符（解析）', '实际是 ' + v4)

if (failures.length) {
  console.error('✗ 奥数解析页标题：' + failures.join(' / '))
  process.exit(1)
}
console.log('✓ 奥数解析页标题：复习卷短标题 / 自拟照旧 / 单课照旧 全部通过')
