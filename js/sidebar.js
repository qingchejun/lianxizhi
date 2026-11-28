/**
 * 侧栏交互（2026-11 二次改版）：
 *   - 收起 / 展开（记在本机 lianxizhi:rail，不进云同步；首帧前由 <head> 里的小脚本先套上 class，免得闪）；
 *   - 栏底账号：显示当前登录的邮箱，点开菜单 = 账号与密码 / 备份与恢复 / 退出登录。
 * 菜单里的「账号与密码」「备份与恢复」仍是 [data-account] / [data-backup]，由 account-ui.js、help.js 接管。
 * 由 tools/rail.py 以 defer 引入：执行时页面里的同步脚本都已跑完。
 */
;(function (root) {
  'use strict'

  var doc = root.document
  var html = doc.documentElement
  var KEY = 'lianxizhi:rail'

  /* ---------- 收起 / 展开 ---------- */
  var fold = doc.querySelector('[data-rail-fold]')
  function syncFold() {
    var folded = html.classList.contains('rail-folded')
    if (!fold) return
    fold.setAttribute('aria-label', folded ? '展开侧栏' : '收起侧栏')
    fold.title = folded ? '展开侧栏' : '收起侧栏'
  }
  /* 奥数这类多一列目录的页面：没手动选过时，窗口不够宽就先收起侧栏，把地方让给纸 */
  var saved = null
  try { saved = root.localStorage.getItem(KEY) } catch (e) { /* 读不了当没选过 */ }
  if (!saved && doc.querySelector('.topic-nav') && root.innerWidth < 1600) {
    html.classList.add('rail-folded')
    root.dispatchEvent(new Event('resize'))
  }

  if (fold) {
    fold.addEventListener('click', function () {
      var folded = html.classList.toggle('rail-folded')
      try { root.localStorage.setItem(KEY, folded ? 'fold' : 'open') } catch (e) { /* 存不了就只管这一次 */ }
      syncFold()
      /* 纸张区宽度变了：各板块的 fit() 挂在 resize 上，按新宽度重新缩放纸 */
      root.dispatchEvent(new Event('resize'))
    })
    syncFold()
  }

  /* ---------- 账号菜单 ---------- */
  var user = doc.querySelector('[data-account-menu]')
  var menu = doc.querySelector('.rail-menu')
  if (!user || !menu) return

  function openMenu(on) {
    menu.hidden = !on
    user.setAttribute('aria-expanded', on ? 'true' : 'false')
    if (on) {
      var first = menu.querySelector('[role="menuitem"]')
      if (first) first.focus()
    }
  }

  /* 没登录能进的板块（server/gate.js GUEST_PAGES）和免费版能进的（FREE_PAGES）：2026-11-27 起识字、拼音只对免费版开放 */
  var GUEST_MODULES = ['今天', '口算', '奥数', '数学知识点', '数独', '火柴', '密码', '迷宫', '数织']
  /* 写字、知识点 2026-11-28 从识字、拼音、口算页搬出来，免费版照旧能进（会员部分在页面里锁） */
  var FREE_MODULES = ['今天', '口算', '奥数', '数学知识点', '识字', '写字', '拼音', '语文知识点', '数独', '火柴', '密码', '迷宫', '数织']
  /* 没登录（口算、数独和游戏组免登录出题打印）：点这里直接打开登录框，不弹菜单 */
  function guest() {
    var A0 = root.SumSum && root.SumSum.account
    var pre = root.__SUMSUM_ME
    return !(A0 && A0.state && A0.state.loggedIn) && !(pre && pre.ok)
  }
  user.addEventListener('click', function (e) {
    e.stopPropagation()
    var ui = root.SumSum && root.SumSum.accountUI
    if (guest() && ui && ui.open) { openMenu(false); ui.open('login'); return }
    openMenu(menu.hidden)
  })
  menu.addEventListener('click', function (e) {
    var item = e.target.closest('[role="menuitem"]')
    if (!item) return
    openMenu(false)
    if (item.hasAttribute('data-logout')) logout()
  })
  doc.addEventListener('click', function (e) {
    if (!menu.hidden && !menu.contains(e.target)) openMenu(false)
    var login = e.target.closest && e.target.closest('[data-login]')
    var ui = root.SumSum && root.SumSum.accountUI
    if (login && ui && ui.open) ui.open('login')
  })
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) {
      openMenu(false)
      user.focus()
    }
    if (menu.hidden || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return
    var items = Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]'))
    var i = items.indexOf(doc.activeElement)
    var next = items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]
    if (next) { e.preventDefault(); next.focus() }
  })

  async function logout() {
    var S = root.SumSum || {}
    try {
      if (S.sync && S.sync.flush) await S.sync.flush() /* 防抖里还没推的改动先推掉 */
      if (S.account) await S.account.logout()
    } catch (e) {
      /* 没退成就别跳走：跳回首页会因为还登录着直接进「今天」，看着像退出了其实没有 */
      root.alert('退出没有成功，请检查网络后再试一次。')
      return
    }
    root.location.href = '/' /* 全站要登录才能看：退出后回首页（介绍兼登录页） */
  }

  /* 显示当前登录的邮箱（账号状态由 account.js 探到后广播） */
  var A = root.SumSum && root.SumSum.account
  function show(state) {
    var email = state && state.loggedIn ? state.email : ''
    var box = user.querySelector('[data-account-email]')
    var initial = user.querySelector('[data-account-initial]')
    var out = !email && guest()
    var sub = user.querySelector('.rail-who small')
    if (box) box.textContent = email || (out ? '登录 / 注册' : '账号')
    if (sub) sub.textContent = out ? '登录后进度自动同步' : '练习进度自动同步'
    if (initial) initial.textContent = email ? email.charAt(0).toUpperCase() : ''
    user.title = email ? email + '（点开账号菜单）' : (out ? '登录或注册' : '账号')
    /* 免费版和没登录的人：奥数、识字、拼音挂一把锁（只是提示；真正拦的是服务器，见 server/gate.js FREE_PAGES、FULL_BOARDS）。
       2026-11-25 起没登录的人点上锁的板块也能进去看这个板块是什么（原网址显示会员说明页） */
    var plan = (state && state.plan) || root.__SUMSUM_PLAN || ''
    var free = !!email && plan === 'free' || !email && !out && root.__SUMSUM_PLAN === 'free'
    if (sub && !out) sub.textContent = free ? '免费版' : '练习进度自动同步'
    Array.prototype.forEach.call(doc.querySelectorAll('.rail-link[data-module]'), function (a) {
      var m = a.getAttribute('data-module')
      var lock = out ? GUEST_MODULES.indexOf(m) < 0 : free && FREE_MODULES.indexOf(m) < 0
      a.classList.toggle('is-locked', lock)
      var icon = a.querySelector('.rail-lock')
      if (lock && !icon) {
        icon = doc.createElement('i')
        icon.className = 'rail-lock'
        icon.setAttribute('aria-label', '会员')
        icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="10.5" width="13" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>'
        a.appendChild(icon)
      } else if (!lock && icon) icon.remove()
    })
    /* 会员入口（2026-11-28）：没登录、免费版着重显示并标价；会员标到期日，永久会员标「永久」 */
    var vip = doc.querySelector('.rail-vip')
    if (vip) {
      var tag = vip.querySelector('[data-vip-tag]')
      var st = state || {}
      var base = st.base || (root.__SUMSUM_ME && root.__SUMSUM_ME.base) || ''
      var until = Number(st.fullUntil || (root.__SUMSUM_ME && root.__SUMSUM_ME.full_until)) || 0
      var member = !out && !free
      var text = '99 元/年'
      if (member && base === 'full') text = '永久'
      else if (member && until > Date.now()) {
        var d = new Date(until)
        text = '到 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日'
      }
      vip.classList.toggle('is-promo', !member)
      if (tag) tag.textContent = text
      vip.title = member ? '会员' : '开通会员 · 99 元/年'
    }
    /* 没登录的人点「今天」看到的是首页介绍，不是每日练习面板，所以叫「首页」（2026-11-25） */
    var today = doc.querySelector('.rail-link[data-module="今天"]')
    if (today) {
      var label = out ? '首页' : '今天'
      var span = today.querySelector('span')
      if (span && span.textContent !== label) span.textContent = label
      today.title = label
    }
    /* 纸上方「不用登录就能出题、打印」的提示条：只给没登录的人看 */
    Array.prototype.forEach.call(doc.querySelectorAll('[data-guest-note]'), function (n) { n.hidden = !out })
    /* 管理员多一项：邀请码管理 */
    var adminItem = menu.querySelector('[data-admin-link]')
    if (state && state.admin && !adminItem) {
      adminItem = doc.createElement('button')
      adminItem.type = 'button'
      adminItem.setAttribute('role', 'menuitem')
      adminItem.setAttribute('data-admin-link', '')
      adminItem.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="2.5"/><path d="M8 10.5h5M8 13.5h8"/></svg><span>邀请码管理</span>'
      adminItem.addEventListener('click', function () { root.location.href = 'admin.html' })
      menu.insertBefore(adminItem, menu.querySelector('[data-logout]'))
    } else if (adminItem && !(state && state.admin)) {
      adminItem.remove()
    }
  }
  if (A) {
    A.onChange(show)
    show(A.state)
  }
})(window)
