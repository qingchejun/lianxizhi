// 访问统计规则（server/stats.js）：node tools/check-stats.js
import assert from 'node:assert/strict'
import { wantsStats, statsTag, trackingPath, forwardHeaders, STATS_SITE_ID } from '../server/stats.js'
import { decide } from '../server/gate.js'

let n = 0
const ok = (name, fn) => { fn(); n++; console.log('✓ ' + name) }

ok('正式网址的普通网页加统计', () => {
  for (const p of ['/', '/kousuan', '/kousuan/coushifa', '/kousuan/poshifa', '/aoshu', '/privacy', '/help', '/404']) assert.equal(wantsStats('zhihebi.com', p), true, p)
})
ok('扫码打分页、管理页不加', () => {
  for (const p of ['/mark', '/admin', '/mark/x']) assert.equal(wantsStats('zhihebi.com', p), false, p)
  assert.equal(wantsStats('zhihebi.com', '/markdown'), true)
})
ok('本机、旧地址、www 不加', () => {
  for (const h of ['127.0.0.1', 'localhost', 'lianxizhi.qingchejun.com', 'www.zhihebi.com', 'lianxizhi.pages.dev']) assert.equal(wantsStats(h, '/'), false, h)
})
ok('脚本标签走本站 /nx/，带站点编号', () => {
  assert.equal(statsTag(), '<script src="/nx/script.js?siteId=' + STATS_SITE_ID + '" defer></script>')
})
ok('转发只放行统计脚本要用的地址', () => {
  assert.equal(trackingPath('GET', '/nx/script.js'), '/script.js')
  assert.equal(trackingPath('GET', '/nx/site/tracking-config/a91ff53bab73'), '/site/tracking-config/a91ff53bab73')
  assert.equal(trackingPath('POST', '/nx/track'), '/track')
  for (const [m, p] of [['GET', '/nx/track'], ['POST', '/nx/script.js'], ['GET', '/nx/sites/11'], ['GET', '/nx/'], ['GET', '/nx/../api/x'],
    ['GET', '/nx/site/tracking-config/a/b'], ['POST', '/nx/identify'], ['GET', '/nx/replay.js'], ['GET', '/script.js']]) assert.equal(trackingPath(m, p), null, m + ' ' + p)
})
ok('转发不带本站 cookie、不信访客自己填的 IP', () => {
  const h = forwardHeaders(new Headers({ cookie: 'sumsum=x', 'x-forwarded-for': '6.6.6.6', 'x-real-ip': '6.6.6.6', 'cf-connecting-ip': '1.2.3.4', 'cf-ray': 'r', 'user-agent': 'UA' }))
  assert.equal(h.get('cookie'), null)
  assert.equal(h.get('cf-ray'), null)
  assert.equal(h.get('x-real-ip'), '1.2.3.4')
  assert.equal(h.get('x-forwarded-for'), '1.2.3.4')
  assert.equal(h.get('user-agent'), 'UA')
})
ok('/nx/ 不用登录、不查库（中间层直接放行给转发函数）', () => {
  assert.deepEqual(decide('/nx/script.js', '?siteId=x', false), { action: 'pass', asset: true })
  assert.deepEqual(decide('/nx/track', '', false), { action: 'pass', asset: true })
  assert.equal(decide('/nx/%2e%2e/server/x', '', false).action, 'deny')
})
console.log('\n' + n + ' 项通过')
