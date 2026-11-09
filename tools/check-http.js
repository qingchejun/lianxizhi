/* http.readBody：POST 只收 application/json——跨站表单（enctype=text/plain 等）伪造不出
   这个 Content-Type，登录 CSRF 就断了。node 24 自带 Request，直跑。 */
'use strict'

var ok = 0, bad = 0
function check(name, cond, extra) {
  if (cond) { ok++; console.log('✓', name) }
  else { bad++; console.log('✗', name, extra === undefined ? '' : JSON.stringify(extra)) }
}

function req(contentType, body) {
  var h = {}
  if (contentType !== null) h['content-type'] = contentType
  return new Request('http://x/api/auth/login', { method: 'POST', headers: h, body: body })
}

import('../server/http.js').then(async function (H) {
  var j = await H.readBody(req('application/json', '{"email":"a@b.co"}'))
  check('application/json 正常解析', j.email === 'a@b.co', j)

  var jc = await H.readBody(req('application/json; charset=utf-8', '{"email":"a@b.co"}'))
  check('带 charset 的 json 也收', jc.email === 'a@b.co', jc)

  /* 攻击向量：自动提交表单 enctype="text/plain"，body 是 JSON 样子的文本 */
  var tp = await H.readBody(req('text/plain', '{"email":"attacker@test.co","password":"64hex…"}'))
  check('text/plain 一律当空体（挡表单 CSRF）', tp.email === undefined, tp)

  var none = await H.readBody(req(null, '{"email":"a@b.co"}'))
  check('没写 Content-Type 当空体', none.email === undefined, none)

  var form = await H.readBody(req('application/x-www-form-urlencoded', 'email=a@b.co'))
  check('表单编码当空体', form.email === undefined, form)

  var broken = await H.readBody(req('application/json', '不是json'))
  check('声明 json 但内容坏 → 空体不炸', broken.email === undefined, broken)

  console.log(bad ? '---- 有 ' + bad + ' 条没过' : '✓ http 校验全部通过')
  process.exit(bad ? 1 : 0)
}).catch(function (e) { console.error(e); process.exit(1) })
