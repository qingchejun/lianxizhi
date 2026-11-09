/**
 * 发信：Resend HTTP API。没配 RESEND_API_KEY（本地开发）时打日志当发出去了，
 * 让 e2e 能靠 DEV_SHOW_CODE 走完整流程。发件人 spec 定死，不许改。
 */
const FROM = '练习纸 <no-reply@mail.qingchejun.com>'

export async function sendMail(env, mail) {
  if (!env.RESEND_API_KEY) {
    console.log('[mail:dev]', mail.to, '|', mail.subject, '|', mail.text.replace(/\n/g, ' / '))
    return true
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [mail.to], subject: mail.subject, text: mail.text })
    })
    return r.ok
  } catch (e) {
    return false
  }
}
