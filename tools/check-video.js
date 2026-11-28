/* 奥数讲解视频的门槛（functions/v）：公开课的视频谁都能看，其余只给会员。node 直跑。 */
'use strict'
var ok = 0, bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) } else { bad++; console.log('✗', name, extra === undefined ? '' : String(extra)) }
}
globalThis.caches = { default: { match: async function () { return null }, put: async function () {} } }
var bucket = {
  get: async function (k) { return { body: 'video:' + k, size: 10, httpEtag: '"e"' } },
  head: async function () { return { size: 10 } }
}
function ctx(path) {
  return { request: new Request('https://zhihebi.com' + path), env: { VIDEO: bucket, SESSION_SECRET: 's' }, waitUntil: function () {} }
}
Promise.all([import('../functions/v/[[path]].js'), import('fs')]).then(async function (m) {
  var V = m[0]
  var pub = await V.onRequestGet(ctx('/v/aoshu/yiduobushao.mp4'))
  check('第 03 课（公开）的视频没登录也能看', pub.status === 200, pub.status)
  var priv = await V.onRequestGet(ctx('/v/aoshu/xulie.mp4'))
  check('其他课的视频没登录 → 403', priv.status === 403, priv.status)
  var odd = await V.onRequestGet(ctx('/v/aoshu/yiduobushao2.mp4'))
  check('名字相近的课不会被误放行', odd.status === 403, odd.status)
  /* 公开视频要和页面里公开的课对得上（js/aoshu-topics.js FREE） */
  var src = m[1].readFileSync(require('path').join(__dirname, '..', 'js', 'aoshu-topics.js'), 'utf8')
  var free = JSON.parse(/aoshu\.FREE = (\[[^\]]*\])/.exec(src)[1].replace(/'/g, '"'))
  var vids = m[1].readFileSync(require('path').join(__dirname, '..', 'js', 'aoshu-videos.js'), 'utf8')
  var withVideo = free.filter(function (id) { return new RegExp('\\n\\s+' + id + ": '").test(vids) })
  check('公开视频 = 公开的课里有视频的那几课', JSON.stringify(withVideo.map(function (id) { return 'aoshu/' + id + '.mp4' })) === JSON.stringify(V.FREE_VIDEOS), withVideo)
  console.log(bad ? '\n✗ 有 ' + bad + ' 项没通过' : '\n✓ 视频门槛全部通过（' + ok + ' 项）')
  process.exit(bad ? 1 : 0)
}).catch(function (e) { console.error(e); process.exit(1) })
