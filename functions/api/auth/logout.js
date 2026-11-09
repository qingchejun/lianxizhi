import { json } from '../../../server/http.js'
import { clearCookieHeader } from '../../../server/session.js'

export async function onRequestPost() {
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookieHeader() })
}
