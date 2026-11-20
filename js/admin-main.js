/**
 * 管理员面板（admin.html）：进门 /api/auth/me——未登录提示回首页登录，
 * 非管理员显示无权访问。真门闩在服务端（requireSession + users.admin），
 * 页面挡的是体验。生成 / 列表 / 作废 / 一键复制。仅站长用，桌面版。
 */
;(function (root) {
  'use strict'
  var doc = root.document
  var invites = []

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
      '<td>' + esc(v.note || '') + '</td>' +
      '<td><span class="badge badge-' + esc(v.state) + '">' + (STATE_LABEL[v.state] || v.state) + '</span></td>' +
      '<td>' + fmtTime(v.created_at) + '</td>' +
      '<td>' + (v.claimed_email ? esc(v.claimed_email) + '<br><small>' + fmtTime(v.claimed_at) + '</small>' : '—') + '</td>' +
      '<td>' + (v.activated_at ? fmtTime(v.activated_at) : '—') + '</td>' +
      '<td>' + ((v.state === 'activated' || v.state === 'revoked') ? '' :
        '<button type="button" class="admin-btn admin-btn-danger" data-revoke="' + esc(v.id) + '">作废</button>') + '</td>' +
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
        '<th>邀请码</th><th>备注</th><th>状态</th><th>生成时间</th><th>占用（邮箱/时间）</th><th>激活时间</th><th></th>' +
      '</tr></thead><tbody>' +
      (invites.length ? invites.map(rowHTML).join('') : '<tr><td colspan="7" class="admin-note">还没有邀请码，先生成几张。</td></tr>') +
      '</tbody></table>'
    doc.getElementById('admin-create').addEventListener('submit', onCreate)
  }

  async function load() {
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

  function onRootClick(e) {
    var cp = e.target.closest('[data-copy]')
    if (cp) {
      root.navigator.clipboard.writeText(displayCode(cp.dataset.copy))
      var old = cp.textContent
      cp.textContent = '已复制 ✓'
      setTimeout(function () { cp.textContent = old }, 1200)
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
