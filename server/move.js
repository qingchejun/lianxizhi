/**
 * 换域名（2026-11-24 起正式地址 zhihebi.com）。纯函数，tools/check-gate.js 校验。
 *
 * www.zhihebi.com → 一律 301 到不带 www 的同一地址。
 * 旧地址（lianxizhi.qingchejun.com、lianxizhi.pages.dev）只管「打开网页」：
 *   没登录 → 301 到新地址同一页（打印出去的旧二维码照样能扫）；
 *   已登录 → MODE 'soft'（过渡期）：页面照常打开，先把这台设备上的练习进度传上云，再自动跳（js/account-ui.js）；
 *            MODE 'hard'（过渡期结束，计划 2027-01）：直接 301。
 * 接口和静态文件在旧地址上照常处理：还开着的旧页面要能把数据传完。
 * 出问题要退回旧地址：MODE 改成 'off'，推上线即可。
 */
export const NEW_HOST = 'zhihebi.com'
export const OLD_HOSTS = ['lianxizhi.qingchejun.com', 'lianxizhi.pages.dev']
export const MODE = 'soft'

export function moveDecision(host, path, search, isPage, loggedIn, mode) {
  mode = mode || MODE
  host = String(host || '').toLowerCase()
  const to = 'https://' + NEW_HOST + path + (search || '')
  if (host === 'www.' + NEW_HOST) return { action: 'redirect', location: to }
  if (mode === 'off' || !OLD_HOSTS.includes(host) || !isPage) return null
  if (!loggedIn || mode === 'hard') return { action: 'redirect', location: to }
  return { action: 'soft', to: to }
}
