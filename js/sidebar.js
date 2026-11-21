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

  user.addEventListener('click', function (e) {
    e.stopPropagation()
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
    } finally {
      root.location.href = '/' /* 全站要登录才能看：退出后回首页（介绍兼登录页） */
    }
  }

  /* 显示当前登录的邮箱（账号状态由 account.js 探到后广播） */
  var A = root.SumSum && root.SumSum.account
  function show(state) {
    var email = state && state.loggedIn ? state.email : ''
    var box = user.querySelector('[data-account-email]')
    var initial = user.querySelector('[data-account-initial]')
    if (box) box.textContent = email || '账号'
    if (initial) initial.textContent = email ? email.charAt(0).toUpperCase() : ''
    user.title = email ? email + '（点开账号菜单）' : '账号'
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
