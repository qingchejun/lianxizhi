/**
 * 纸角二维码 + 打印时记下纸记录（扫码打分的电脑端）。
 *
 * 各板块渲染完一张纸就调 SumSum.sheets.use({...})：算纸号、把二维码插进第一张题目页的页眉。
 * 真正写记录是在打印那一刻（beforeprint，连 Ctrl/Cmd+P 也接得住）——只渲染不打印的纸不留痕。
 * 写完立刻盖「现在」的时间戳：store.set 首次写入记的是 1（播种），不盖会被 60 天清理当成旧纸删掉。
 *
 * 顶栏另加一个「打分」按钮：点开右侧打分抽屉（js/rate-drawer.js，和手机扫码打分页同一个组件），按钮上带待打分张数。
 * 只给练习四板块用（口算、奥数、识字、拼音）；游戏 2026-11-27 起不打分、不印二维码。
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
  /* 登录了没有：account.js 探到之前先看服务器写进网页的登录态（functions/_middleware.js），免得已登录的人首屏少了二维码 */
  function signedIn() {
    var A = root.SumSum && root.SumSum.account
    if (A && A.state && A.state.loggedIn) return true
    var pre = root.__SUMSUM_ME
    return !!(pre && pre.ok)
  }

  /* 没登录也能出题打印（口算、数独和游戏组，见 server/gate.js GUEST_PAGES）：纸上不印二维码、不记录这张纸。
     在页面上登录后马上把二维码补上 */
  var loginHooked = false
  function hookLogin() {
    var A = root.SumSum && root.SumSum.account
    if (loginHooked || !A || !A.onChange) return
    loginHooked = true
    A.onChange(function (st) {
      if (st.loggedIn && current && root.document) placeQr(root.document, current.id)
    })
  }

  function use(info) {
    if (!C().isPractice(info.module)) return null
    var date = today()
    var id = C().makeId(info.module + '|' + info.idParts + '|' + date)
    /* 同一天、内容一模一样的另一张卷（识字每日一卷学过的字少时，前后两张可能字完全相同；
       今天还能预出明天的卷）：已有记录是别的卷（ref.d 不同）就另起一个号，免得新卷一打开就显示「已打分」。
       只在撞上时才换号，平常的号不变，已经印出去的纸照样扫得到 */
    var St = root.SumSum && root.SumSum.store
    var old = St && info.ref && info.ref.d ? St.get(C().keyOf(id)) : null
    if (old && old.ref && old.ref.d && old.ref.d !== info.ref.d) id = C().makeId(info.module + '|' + info.idParts + '|' + date + '|' + info.ref.d)
    current = { id: id, info: info, date: date }
    if (root.document) {
      hookLogin()
      if (signedIn()) placeQr(root.document, id)
      ensureButton(root.document, info.module)
    }
    return id
  }

  /* 把当前这张纸记下来（已有记录就不动，免得重复打印冲掉打分）。
     quiet：打分抽屉里给没打印过的卷打分时顺手存下，不弹「可以扫码打分了」 */
  function ensureSaved(quiet) {
    quiet = quiet === true
    if (!current || !signedIn()) return null
    var S = root.SumSum.store
    var key = C().keyOf(current.id)
    if (S.get(key)) {
      /* 已经记过（重复打印）：不覆盖打分，但再推一次，万一上次没推上去 */
      pushSheet(key, quiet)
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
    pushSheet(key, quiet)
    return current.id
  }

  /* 打印后提示纸有没有存上云端（sync.js 的待推清单会自动重试）。只在本页打印过才提示 */
  var toastWatching = false
  var toastHide = null
  var TOAST = {
    sending: ['', '正在把这张纸存到云端…'],
    retrying: ['warn', '网络不太好，这张纸还没存到云端，正在自动重试。先别关这个页面。'],
    failed: ['bad', '这张纸没能存到云端，手机扫码会找不到。请检查网络，刷新页面后再点一次打印。'],
    ok: ['ok', '已存到云端，手机可以扫码打分了。']
  }
  function toast(state) {
    var doc = root.document
    var t = TOAST[state]
    if (!doc || !t || !toastWatching) return
    var el = doc.getElementById('cloud-toast')
    if (!el) {
      el = doc.createElement('div')
      el.id = 'cloud-toast'
      el.setAttribute('role', 'status')
      doc.body.appendChild(el)
    }
    el.className = 'cloud-toast' + (t[0] ? ' ' + t[0] : '')
    el.textContent = t[1]
    el.hidden = false
    if (toastHide) { clearTimeout(toastHide); toastHide = null }
    if (state === 'ok') {
      toastWatching = false
      toastHide = setTimeout(function () { el.hidden = true }, 6000)
    }
  }
  function pushSheet(key, quiet) {
    var sync = root.SumSum.sync
    if (!sync || !sync.pushNow) return
    if (!toastHooked && sync.onOutbox) {
      toastHooked = true
      sync.onOutbox(function (info) { toast(info.state) })
    }
    if (!quiet) toastWatching = true
    sync.pushNow([key])
  }
  var toastHooked = false

  function ensureButton(doc, module) {
    if (doc.getElementById('btn-mark')) return
    var print = doc.getElementById('btn-print')
    if (!print || !print.parentNode) return
    var b = doc.createElement('button')
    b.type = 'button'
    b.id = 'btn-mark'
    b.className = 'btn'
    b.title = '孩子做完后打分：全对选「全对」，有错点出来，再提交'
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3 8-8M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11"/></svg>打分'
    b.addEventListener('click', function () {
      if (!signedIn()) {
        var ui = root.SumSum.accountUI
        if (ui && ui.open) ui.open('login', '登录后就能打分：孩子做完，手机扫一下纸角的二维码点一下哪里错了，下一张就专练这些。')
        return
      }
      /* 2026-11-27 打分统一：右侧抽屉（js/rate-drawer.js）。没加载抽屉的页面退回打分页 */
      if (root.SumSum.rateDrawer) return root.SumSum.rateDrawer.open()
      var id = current && root.SumSum.store.get(C().keyOf(current.id)) ? current.id : ''
      root.location.href = '/mark?module=' + module + (id ? '&id=' + id : '')
    })
    /* 口算页「打印」左边还有「打印帮助」「附答案页」（2026-11-25）：打分放在它们前面，让「附答案页」紧挨着「打印」 */
    var anchor = print.parentNode.querySelector('.head-help, .head-check') || print
    print.parentNode.insertBefore(b, anchor)
    if (root.SumSum.rateDrawer) root.SumSum.rateDrawer.attach(module, b)
  }

  if (root.addEventListener && root.document) {
    root.addEventListener('beforeprint', ensureSaved)
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', hookLogin)
    else hookLogin()
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.sheets = {
    use: use,
    ensureSaved: ensureSaved,
    current: function () { return current },
    qrSvg: qrSvg,
    signedIn: signedIn,
    markUrl: markUrl,
    today: today
  }
})(typeof window !== 'undefined' ? window : globalThis)
