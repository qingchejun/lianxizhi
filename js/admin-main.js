/**
 * 管理员面板（admin.html）：进门 /api/auth/me——未登录提示回首页登录，
 * 非管理员显示无权访问。真门闩在服务端（requireSession + users.admin），
 * 页面挡的是体验。生成 / 列表 / 作废 / 一键复制。仅站长用，桌面版。
 */
;(function (root) {
  'use strict'
  var doc = root.document
  var invites = []
  var users = null /* { stats, users } */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function fmtTime(ms) {
    if (!ms) return '—'
    var d = new Date(ms)
    var p = function (n) { return (n < 10 ? '0' : '') + n }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
  }
  function displayCode(c) { return c.slice(0, 4) + '-' + c.slice(4) }
  var STATE_LABEL = { unused: '未用', claimed: '已占用', activated: '已激活', revoked: '已作废' }

  async function api(path, body) {
    var r = await root.fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    var data = {}
    try { data = await r.json() } catch (e) {}
    return { status: r.status, body: data }
  }

  function rowHTML(v) {
    return '<tr>' +
      '<td><button type="button" class="admin-code" data-copy="' + esc(v.code) + '" title="点击复制">' + esc(displayCode(v.code)) + '</button></td>' +
      '<td><span class="admin-note-txt" data-editnote="' + esc(v.id) + '" title="点击修改备注">' + (v.note ? esc(v.note) : '—') + '</span></td>' +
      '<td><span class="badge badge-' + esc(v.state) + '">' + (STATE_LABEL[v.state] || v.state) + '</span></td>' +
      '<td>' + fmtTime(v.created_at) + '</td>' +
      '<td>' + (v.claimed_email ? esc(v.claimed_email) + (v.claimed_banned ? ' <span class="badge badge-revoked">已停用</span>' : '') + '<br><small>' + fmtTime(v.claimed_at) + '</small>' : '—') + '</td>' +
      '<td>' + (v.activated_at ? fmtTime(v.activated_at) : '—') + '</td>' +
      '<td>' + (v.claimed_email ? (v.marked7d || 0) + ' 张' : '—') + '</td>' +
      '<td class="admin-ops">' +
        ((v.state === 'claimed' || v.state === 'activated') ? (v.claimed_banned
          ? '<button type="button" class="admin-btn" data-unban="' + esc(v.id) + '">解除停用</button> '
          : '<button type="button" class="admin-btn admin-btn-danger" data-ban="' + esc(v.id) + '">停用账号</button> ') : '') +
        ((v.state === 'activated' || v.state === 'revoked') ? '' :
          '<button type="button" class="admin-btn admin-btn-danger" data-revoke="' + esc(v.id) + '">作废</button>') +
      '</td>' +
    '</tr>'
  }

  function render() {
    var el = doc.getElementById('admin-root')
    el.innerHTML =
      '<form class="admin-form" id="admin-create">' +
        '<input type="text" name="note" placeholder="备注：发给谁（如 张三妈妈）" maxlength="100">' +
        '<select name="count"><option value="1">1 张</option><option value="2">2 张</option><option value="3">3 张</option><option value="5">5 张</option><option value="10">10 张</option><option value="20">20 张</option></select>' +
        '<button type="submit" class="admin-btn admin-btn-primary">生成</button>' +
      '</form>' +
      '<table class="admin-table"><thead><tr>' +
        '<th>邀请码</th><th>备注</th><th>状态</th><th>生成时间</th><th>占用（邮箱/时间）</th><th>激活时间</th><th title="近 7 天扫码或在板块页打分了几张纸">近 7 天打分</th><th></th>' +
      '</tr></thead><tbody>' +
      (invites.length ? invites.map(rowHTML).join('') : '<tr><td colspan="8" class="admin-note">还没有邀请码，先生成几张。</td></tr>') +
      '</tbody></table>' + usersHTML()
    doc.getElementById('admin-create').addEventListener('submit', onCreate)
  }

  /* 账号：免费版 / 完整版统计，手动开通或改回免费版 */
  function usersHTML() {
    if (!users) return ''
    var st = users.stats
    return '<h2 class="admin-h2">账号</h2>' +
      '<p class="admin-stats">已验证账号 <b>' + st.total + '</b>：完整版 <b>' + st.full + '</b>，免费版 <b>' + st.free + '</b>；' +
      '近 1 天新注册 <b>' + st.new1d + '</b>，近 7 天 <b>' + st.new7d + '</b>；还没验证邮箱 ' + st.unverified + '（48 小时后自动清掉）。</p>' +
      '<p class="admin-stats">免费版里：7 天体验中 <b>' + (st.trial || 0) + '</b>，体验已结束 <b>' + (st.ended || 0) + '</b>，' +
      '其中结束后近 7 天还在打分的 <b>' + (st.endedActive || 0) + '</b>。</p>' +
      '<table class="admin-table"><thead><tr><th>邮箱</th><th>版本</th><th>注册时间</th><th>来源</th><th title="近 7 天扫码或在板块页打分了几张纸">近 7 天打分</th><th></th></tr></thead><tbody>' +
      users.users.map(function (u) {
        return '<tr><td>' + esc(u.email) + (u.verified ? '' : ' <small>（没验证）</small>') + (u.banned ? ' <span class="badge badge-revoked">已停用</span>' : '') + '</td>' +
          '<td><span class="badge badge-' + (u.plan === 'full' ? 'activated' : 'unused') + '">' + (u.plan === 'full' ? '完整版' : '免费版') + '</span>' +
            (u.trial ? ' <small>体验到 ' + fmtTime(u.full_until) + '</small>' : u.ended ? ' <small>体验已结束</small>' : '') + '</td>' +
          '<td>' + fmtTime(u.created_at) + '</td>' +
          '<td>' + (u.invited ? '邀请码' : '免费注册') + '</td>' +
          '<td>' + (u.marked7d || 0) + '</td>' +
          '<td class="admin-ops">' + (u.admin || !u.verified ? '' : u.plan === 'full'
            ? '<button type="button" class="admin-btn" data-plan="free" data-uid="' + esc(u.id) + '">改回免费版</button>'
            : '<button type="button" class="admin-btn admin-btn-primary" data-plan="full" data-uid="' + esc(u.id) + '">开通完整版</button>') + '</td></tr>'
      }).join('') + '</tbody></table>'
  }

  async function load() {
    var ru = await api('/api/admin/users')
    users = ru.status === 200 ? ru.body : null
    var r = await api('/api/admin/invites')
    if (r.status !== 200) {
      doc.getElementById('admin-root').innerHTML = '<p class="admin-note">' + esc(r.body.error || '列表没拉到，刷新试试。') + '</p>'
      return
    }
    invites = r.body.invites || []
    render()
  }

  async function onCreate(e) {
    e.preventDefault()
    var f = e.target
    var r = await api('/api/admin/invites', { note: f.note.value.trim(), count: parseInt(f.count.value, 10) || 1 })
    if (r.status !== 200) { root.alert(r.body.error || '没生成成功，稍后再试。'); return }
    await load()
  }

  async function doRevoke(id) {
    var r = await api('/api/admin/invites/revoke', { id: id })
    if (r.status !== 200) { root.alert(r.body.error || '没作废成功，稍后再试。'); return }
    await load()
  }

  async function doBan(id, flag) {
    var r = await api('/api/admin/invites/ban', { id: id, banned: flag })
    if (r.status !== 200) { root.alert(r.body.error || '操作没成功，稍后再试。'); return }
    await load()
  }

  /* 备注格内直接改：点文字变输入框，回车/失焦保存，Esc 取消 */
  function startNoteEdit(el) {
    var id = el.dataset.editnote
    var v = invites.find(function (x) { return x.id === id })
    if (!v) return
    var td = el.parentNode
    td.innerHTML = '<input type="text" class="admin-note-input" maxlength="100" value="' + esc(v.note || '') + '">'
    var inp = td.firstChild
    inp.focus()
    inp.select()
    var done = false
    function save() {
      if (done) return
      done = true
      api('/api/admin/invites/note', { id: id, note: inp.value.trim() }).then(function (r) {
        if (r.status !== 200) root.alert(r.body.error || '备注没保存成功，稍后再试。')
        load()
      })
    }
    inp.addEventListener('blur', save)
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); save() }
      else if (e.key === 'Escape') { done = true; render() }
    })
  }

  function onRootClick(e) {
    var cp = e.target.closest('[data-copy]')
    if (cp) {
      root.navigator.clipboard.writeText(displayCode(cp.dataset.copy))
      var old = cp.textContent
      cp.textContent = '已复制 ✓'
      setTimeout(function () { cp.textContent = old }, 1200)
      return
    }
    var ed = e.target.closest('[data-editnote]')
    if (ed) { startNoteEdit(ed); return }
    var bn = e.target.closest('[data-ban]')
    if (bn && root.confirm('停用后这个账号立刻无法登录、也收不到任何邮件，确定？')) { doBan(bn.dataset.ban, true); return }
    var ub = e.target.closest('[data-unban]')
    if (ub && root.confirm('恢复这个账号的登录资格？')) { doBan(ub.dataset.unban, false); return }
    var pl = e.target.closest('[data-plan]')
    if (pl) {
      var full = pl.dataset.plan === 'full'
      if (!root.confirm(full ? '给这个账号开通完整版？' : '把这个账号改回免费版？奥数、识字、拼音会锁上。')) return
      api('/api/admin/users/plan', { id: pl.dataset.uid, plan: pl.dataset.plan }).then(function (r) {
        if (r.status !== 200) root.alert(r.body.error || '操作没成功，稍后再试。')
        load()
      })
      return
    }
    var rv = e.target.closest('[data-revoke]')
    if (rv && root.confirm('作废后这张码就再也没人能用了，确定？')) doRevoke(rv.dataset.revoke)
  }

  async function boot() {
    var r = await api('/api/auth/me')
    var el = doc.getElementById('admin-root')
    if (r.status !== 200 || !r.body.ok) {
      el.innerHTML = '<p class="admin-note">请先回<a href="index.html">首页</a>登录站长账号，再打开这个页面。</p>'
      return
    }
    if (!r.body.admin) {
      el.innerHTML = '<p class="admin-note">这个页面只有管理员能看。</p>'
      return
    }
    el.addEventListener('click', onRootClick)
    await load()
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot)
  else boot()
})(window)
