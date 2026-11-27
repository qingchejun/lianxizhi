/**
 * 打分卡（2026-11-27）：扫码打分页和拼音页共用的一块。
 *
 * 只有一种手感（设计稿 docs/superpowers/specs/2026-11-27-practice-loop-design.md 1.1）：
 *   题目格子摊开 → 选「全对」，或者点做错的题（两者互斥）→ 点「提交」才算数。
 * 提交之前点的东西是「草稿」，存本机（不同步，键不带 sumsum: 前缀），手机锁屏、切走再回来不丢。
 *
 * 本文件只画 HTML、管草稿；提交后怎么记由调用方做（口算/奥数 sheetsCore.submit，识字 shiziMark.settle，
 * 拼音 sheetsCore.pinyinResults → pinyin:mark）。点击统一用 data-rate-* 属性，调用方在自己的容器上监听，
 * 交给 SumSum.rate.click(e, hooks) 处理。
 */
;(function (root) {
  'use strict'

  var DRAFT_KEY = 'zhihebi:rate-draft:v1'
  var drafts = null

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  /* ---------- 草稿 ---------- */

  function loadDrafts() {
    if (drafts) return drafts
    drafts = {}
    try {
      var raw = JSON.parse(root.localStorage.getItem(DRAFT_KEY) || '{}')
      if (raw && typeof raw === 'object') drafts = raw
    } catch (e) { /* 本机存不了就只在内存里 */ }
    return drafts
  }

  function saveDrafts() {
    try {
      /* 只留最近 30 张的草稿，免得越攒越多 */
      var ids = Object.keys(drafts).sort(function (a, b) { return (drafts[b].t || 0) - (drafts[a].t || 0) })
      ids.slice(30).forEach(function (id) { delete drafts[id] })
      root.localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts))
    } catch (e) { /* 同上 */ }
  }

  /* 一张纸的草稿 { all: bool, wrong: [key], editing: bool }。没有草稿时：
     已打过分的从记录里还原（改一下时用），没打过的是空的 */
  /* 草稿按 draftId 存（拼音页和打分页对同一张卷用同一个 'py-<卷号>'，一边提交另一边不留旧草稿），没有就用纸号 */
  function keyOf(rec) {
    return rec.draftId || rec.id
  }

  function draft(rec) {
    var d = loadDrafts()[keyOf(rec)]
    if (d) return { all: !!d.all, wrong: (d.wrong || []).slice(), editing: !!d.editing }
    return { all: false, wrong: [], editing: false }
  }

  function setDraft(id, d) {
    loadDrafts()[id] = { all: !!d.all, wrong: d.wrong.slice(), editing: !!d.editing, t: Date.now() }
    saveDrafts()
  }

  function clearDraft(id) {
    delete loadDrafts()[id]
    saveDrafts()
  }

  /* ---------- 画 ---------- */

  var RULE = {
    three: '孩子做完，全对就选「全对」；有错就点出做错的题。再点「提交」。',
    chars: '全认识就选「全对」；有没认出的字就点出来。再点「提交」。',
    pinyin: '全对就选「全对」；有卡住的（要提示或读不出）就点出来。再点「提交」。'
  }

  function itemBtn(rec, it, on, cls) {
    return '<button type="button" class="' + cls + (on ? ' on' : '') + '" data-sheet="' + esc(rec.id) +
      '" data-rate-item="' + esc(it.key) + '" aria-pressed="' + on + '">' + esc(it.label) + '</button>'
  }

  function gridHTML(rec, kind, d) {
    var wrong = {}
    d.wrong.forEach(function (k) { wrong[k] = true })
    var items = rec.items || []
    if (kind === 'chars') {
      return '<div class="rate-grid rate-chars">' + items.map(function (it) {
        return itemBtn(rec, it, !!wrong[it.key], 'rate-ch')
      }).join('') + '</div>'
    }
    var units = rec.units || []
    var groups = units.length > 1 || kind === 'pinyin'
      ? units.map(function (u) {
        return { unit: u, items: items.filter(function (it) { return it.unit === u.key }) }
      }).filter(function (g) { return g.items.length })
      : [{ unit: null, items: items }]
    var cls = rec.module === 'kousuan' ? 'rate-items rate-kousuan' : kind === 'pinyin' ? 'rate-items rate-pinyin' : 'rate-items rate-no'
    return groups.map(function (g) {
      var head = g.unit ? '<p class="rate-unit">' + esc(g.unit.label) +
        (g.unit.when ? '<small>' + esc(g.unit.when) + '</small>' : '') + '</p>' : ''
      return head + '<div class="rate-grid ' + cls + '">' + g.items.map(function (it) {
        return itemBtn(rec, it, !!wrong[it.key], 'rate-item' + (kind === 'pinyin' ? ' pinyin-text' : ''))
      }).join('') + '</div>'
    }).join('')
  }

  /*
   * 一张纸的打分区（不含卡片外框和标题）。opts：
   *   kind：three / chars / pinyin
   *   done：打过分没有；result：「全对」「错 3 题」
   *   canEdit：打过分后能不能「改一下」（识字不行：要到识字页撤销登记）
   *   editHint：不能改时的说明
   *   effect：打完分之后一句话（下一张会怎么变），已转义的 HTML
   */
  function body(rec, opts) {
    return '<div class="rate">' + inner(rec, opts) + '</div>'
  }

  function inner(rec, opts) {
    var d = draft(rec)
    if (opts.done && !d.editing) {
      return '<p class="rate-done"><b>已打分：' + esc(opts.result) + '</b>' +
        (opts.canEdit ? '<button type="button" class="link-btn" data-sheet="' + esc(rec.id) + '" data-rate-edit>改一下</button>' : '') +
        '</p>' + (opts.editHint && !opts.canEdit ? '<p class="rule">' + esc(opts.editHint) + '</p>' : '') +
        (opts.effect ? '<p class="effect">' + opts.effect + '</p>' : '')
    }
    var n = d.wrong.length
    var ready = d.all || n > 0
    return '<p class="rule">' + RULE[opts.kind] + '</p>' +
      gridHTML(rec, opts.kind, d) +
      '<div class="rate-foot">' +
        '<button type="button" class="rate-all' + (d.all ? ' on' : '') + '" data-sheet="' + esc(rec.id) +
          '" data-rate-all aria-pressed="' + d.all + '">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.5l4.5 4.5 8.5-10"/></svg>全对</button>' +
        '<button type="button" class="btn btn-primary rate-submit" data-sheet="' + esc(rec.id) + '" data-rate-submit' +
          (ready ? '' : ' disabled') + '>提交' + (n ? '（错 ' + n + ' 题）' : '') + '</button>' +
      '</div>' +
      (d.editing ? '<button type="button" class="link-btn quiet" data-sheet="' + esc(rec.id) + '" data-rate-cancel>不改了</button>' : '')
  }

  /*
   * 处理打分区里的点击。hooks：
   *   load(id) → 纸记录；submit(rec, wrong:[key]) → 调用方记下来（wrong 为空 = 全对）；
   *   startEdit(rec) → 改一下时用来还原草稿的错题（默认 rec.wrong）；render() 重画。
   * 返回 true 表示这次点击是打分区的。
   */
  function click(e, hooks) {
    var b = e.target.closest('[data-sheet]')
    if (!b) return false
    var isRate = b.hasAttribute('data-rate-item') || b.hasAttribute('data-rate-all') ||
      b.hasAttribute('data-rate-submit') || b.hasAttribute('data-rate-edit') || b.hasAttribute('data-rate-cancel')
    if (!isRate) return false
    var rec = hooks.load(b.getAttribute('data-sheet'))
    if (!rec) return true
    var d = draft(rec)
    if (b.hasAttribute('data-rate-item')) {
      var k = b.getAttribute('data-rate-item')
      var i = d.wrong.indexOf(k)
      if (i >= 0) d.wrong.splice(i, 1)
      else d.wrong.push(k)
      if (d.wrong.length) d.all = false
      setDraft(keyOf(rec), d)
    } else if (b.hasAttribute('data-rate-all')) {
      d.all = !d.all
      if (d.all) d.wrong = []
      setDraft(keyOf(rec), d)
    } else if (b.hasAttribute('data-rate-edit')) {
      var w = hooks.startEdit ? hooks.startEdit(rec) : (rec.wrong || [])
      setDraft(keyOf(rec), { all: !w.length, wrong: w, editing: true })
    } else if (b.hasAttribute('data-rate-cancel')) {
      clearDraft(keyOf(rec))
    } else {
      if (!d.all && !d.wrong.length) return true
      hooks.submit(rec, d.all ? [] : d.wrong)
      clearDraft(keyOf(rec))
    }
    hooks.render()
    return true
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.rate = { body: body, click: click, draft: draft, setDraft: setDraft, clearDraft: clearDraft, keyOf: keyOf, esc: esc }
})(typeof window !== 'undefined' ? window : globalThis)
