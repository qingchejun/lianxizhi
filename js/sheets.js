/**
 * 纸角二维码 + 打印时登记纸记录（扫码登记的电脑端）。
 *
 * 各板块渲染完一张纸就调 SumSum.sheets.use({...})：算纸号、把二维码插进第一张题目页的页眉。
 * 真正写记录是在打印那一刻（beforeprint，连 Ctrl/Cmd+P 也接得住）——只渲染不打印的纸不留痕。
 * 写完立刻盖「现在」的时间戳：store.set 首次写入记的是 1（播种），不盖会被 60 天清理当成旧纸删掉。
 *
 * 顶栏另加一个「登记」按钮：电脑上也能直接去登记页（/mark?id=…）。
 *
 * qrSvg 无 DOM 依赖，node 下由 tools/check-sheets.js 校验；其余部分只在浏览器里跑。
 */
;(function (root) {
  'use strict'

  function C() {
    return root.SumSum.sheetsCore
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n
  }

  function today(d) {
    d = d || new Date()
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
  }

  /* 二维码 SVG：纠错 M，四周留 2 格白边（页眉本身也是白的），按 viewBox 缩放到 CSS 给的尺寸 */
  function qrSvg(text) {
    var make = root.qrcode
    var qr = make(0, 'M')
    qr.addData(text)
    qr.make()
    var n = qr.getModuleCount()
    var m = 2
    var d = ''
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z'
      }
    }
    var size = n + m * 2
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size +
      '" shape-rendering="crispEdges" aria-hidden="true"><rect width="' + size + '" height="' + size +
      '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>'
  }

  function markUrl(id) {
    return root.location.origin + '/mark?id=' + id
  }

  var current = null /* { id, info, date } 当前屏幕上这张纸 */

  /* 第一张题目页：奥数讲解页在前，用 data-kind="practice" 标出练习页；其余板块取第一张不是答案页的纸 */
  function targetSheet(doc) {
    var box = doc.getElementById('preview') || doc
    var practice = box.querySelector('.sheet[data-kind="practice"]')
    if (practice) return practice
    var all = box.querySelectorAll('.sheet')
    for (var i = 0; i < all.length; i++) {
      if (!/-ans\b|\bsheet-ans\b|\bsheet-sol\b/.test(all[i].className) && !all[i].hasAttribute('data-kind')) return all[i]
    }
    return null
  }

  function placeQr(doc, id) {
    var old = doc.querySelectorAll('.sheet-qr')
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i])
    var sheet = targetSheet(doc)
    if (!sheet) return
    /* 2026-11-23 站长定：放左下角页脚（页眉本来就挤）。页脚是「页码居中 + 落款靠右」，左边正好空着。
       没有页脚的纸（拼音）退回页眉右侧 */
    var foot = sheet.querySelector('.sheet-foot')
    var head = sheet.querySelector('.sheet-head')
    var box = doc.createElement('div')
    if (foot) {
      box.className = 'sheet-qr sheet-qr-foot'
      box.innerHTML = qrSvg(markUrl(id)) + '<small>扫码<br>打分</small>'
      foot.classList.add('has-qr')
      foot.insertBefore(box, foot.firstChild)
    } else if (head) {
      box.className = 'sheet-qr'
      box.innerHTML = '<small>扫码<br>打分</small>' + qrSvg(markUrl(id))
      head.appendChild(box)
      fitHead(head)
    }
  }

  /* 加了二维码页眉变挤：标题逐级缩字号（最小 14px），还放不下就允许折行（同奥数 fitHeads 的做法） */
  function fitHead(head) {
    var title = head.querySelector('.sheet-title')
    if (!title || head.scrollWidth <= head.clientWidth + 1) return
    var size = parseFloat(root.getComputedStyle(title).fontSize)
    while (head.scrollWidth > head.clientWidth + 1 && size > 14) {
      size -= 1
      title.style.fontSize = size + 'px'
      if (size < 19) title.style.letterSpacing = '1px'
    }
    if (head.scrollWidth > head.clientWidth + 1) title.style.whiteSpace = 'normal'
  }

  /* 板块渲染完调用。info: { module, title, idParts, units, items, ref } */
  function use(info) {
    var date = today()
    var id = C().makeId(info.module + '|' + info.idParts + '|' + date)
    current = { id: id, info: info, date: date }
    if (root.document) {
      placeQr(root.document, id)
      /* 识字、拼音本页就能逐字 / 逐题登记，不加「登记」按钮（拼音的登记页本身就跳回这里） */
      var kind = C().MODULE_KIND[info.module]
      if (kind === 'three' || kind === 'game') ensureButton(root.document)
    }
    return id
  }

  /* 把当前这张纸记下来（已有记录就不动，免得重复打印冲掉打分） */
  function ensureSaved() {
    if (!current) return null
    var S = root.SumSum.store
    var key = C().keyOf(current.id)
    if (S.get(key)) {
      /* 已经记过（重复打印）：不覆盖打分，但再推一次，万一上次没推上去 */
      if (root.SumSum.sync && root.SumSum.sync.pushNow) root.SumSum.sync.pushNow([key])
      return current.id
    }
    var i = current.info
    S.set(key, C().newRecord({
      id: current.id,
      module: i.module,
      title: i.title,
      date: current.date,
      units: i.units,
      items: i.items,
      ref: i.ref
    }, Date.now()))
    S.stampNow([key])
    /* 马上推上云：家长打印完常常立刻拿手机扫，不能等普通同步（见 js/sync.js pushNow） */
    if (root.SumSum.sync && root.SumSum.sync.pushNow) root.SumSum.sync.pushNow([key])
    return current.id
  }

  /* 在板块页上登记完（识字「登记结果」、拼音逐题登记）：把当前这张纸标成已登记，登记页的待办列表里就不再出现。
     没打印过（没有记录）就不新建 */
  function markDone(id) {
    id = id || (current && current.id)
    if (!id) return
    var S = root.SumSum.store
    var key = C().keyOf(id)
    var rec = C().parse(S.getString(key))
    if (!rec || rec.done) return
    rec.done = true
    rec.doneAt = Date.now()
    S.set(key, rec)
  }

  function ensureButton(doc) {
    if (doc.getElementById('btn-mark')) return
    var print = doc.getElementById('btn-print')
    if (!print || !print.parentNode) return
    var b = doc.createElement('button')
    b.type = 'button'
    b.id = 'btn-mark'
    b.className = 'btn'
    b.title = '孩子做完后打分：会了 / 一般 / 不会，或点做错的题'
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3 8-8M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11"/></svg>打分'
    b.addEventListener('click', function () {
      var id = ensureSaved()
      if (id) root.location.href = '/mark?id=' + id
    })
    print.parentNode.insertBefore(b, print)
  }

  if (root.addEventListener && root.document) {
    root.addEventListener('beforeprint', ensureSaved)
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.sheets = {
    use: use,
    ensureSaved: ensureSaved,
    markDone: markDone,
    current: function () { return current },
    qrSvg: qrSvg,
    markUrl: markUrl,
    today: today
  }
})(typeof window !== 'undefined' ? window : globalThis)
