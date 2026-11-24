/**
 * 发信：Cloudflare Email Sending 为主、Resend 备用（见 sendMail）。都没配（本地开发）时打日志当发出去了，
 * 让 e2e 能靠 DEV_SHOW_CODE 走完整流程。发件人 spec 定死，不许改。
 */
const FROM = '纸和笔 <no-reply@mail.zhihebi.com>'

/* 2026-11-24：Cloudflare 发信为主（Workers 付费版含每月 3000 封），没配或发失败再走 Resend。
   两边都没配（本地开发）时打日志当发出去了 */
const CF_ACCOUNT = 'd011254cf0e07715288bb7d93f2a107f'

async function viaCloudflare(env, mail) {
  if (!env.CF_EMAIL_TOKEN) return false
  try {
    const r = await fetch('https://api.cloudflare.com/client/v4/accounts/' + CF_ACCOUNT + '/email/sending/send', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.CF_EMAIL_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: mail.to, subject: mail.subject, text: mail.text })
    })
    if (!r.ok) return false
    const d = await r.json()
    return !!(d && d.success && d.result && (d.result.delivered || []).concat(d.result.queued || []).length)
  } catch (e) {
    return false
  }
}

async function viaResend(env, mail) {
  if (!env.RESEND_API_KEY) return false
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

export async function sendMail(env, mail) {
  if (!env.RESEND_API_KEY && !env.CF_EMAIL_TOKEN) {
    console.log('[mail:dev]', mail.to, '|', mail.subject, '|', mail.text.replace(/\n/g, ' / '))
    return true
  }
  if (await viaCloudflare(env, mail)) return true
  return viaResend(env, mail)
}
