/*
 * 浏览器端栅格化库（被 build-page.js 拼进生成的 HTML）。
 * 输入：全局 ICONS = [{name, svg}]；输出：JSON 结果写进页面末尾的 pre#out 元素。
 *
 * 做法：SVG 文本 -> data URL -> Image -> 先画到 64×64 探测内容包围盒，
 * 再把包围盒拉伸到 8/10/12 的方格盘，alpha ≥50% 判黑。
 * 包围盒裁剪是因为图标四周的留白会让小图案缩成一角、认不出来。
 */
(function () {
  var SIZES = [8, 10, 12]
  var PROBE = 64

  function toImg(svg) {
    return new Promise(function (resolve, reject) {
      var img = new Image()
      img.onload = function () { resolve(img) }
      img.onerror = function () { reject(new Error('img')) }
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    })
  }

  function rowsFrom(data, N) {
    var rows = []
    for (var y = 0; y < N; y++) {
      var line = ''
      for (var x = 0; x < N; x++) line += data[(y * N + x) * 4 + 3] > 127 ? 'X' : '.'
      rows.push(line)
    }
    return rows
  }

  var out = []
  var i = 0

  function step() {
    if (i >= ICONS.length) {
      var pre = document.createElement('pre')
      pre.id = 'out'
      pre.textContent = JSON.stringify(out)
      document.body.appendChild(pre)
      return
    }
    var it = ICONS[i++]
    toImg(it.svg).then(function (img) {
      var rec = { name: it.name }
      try {
        var P = PROBE
        var c = document.createElement('canvas')
        c.width = P; c.height = P
        var ctx = c.getContext('2d')
        ctx.clearRect(0, 0, P, P)
        ctx.drawImage(img, 0, 0, P, P)
        var d = ctx.getImageData(0, 0, P, P).data
        var minX = P, minY = P, maxX = -1, maxY = -1
        for (var y = 0; y < P; y++) {
          for (var x = 0; x < P; x++) {
            if (d[(y * P + x) * 4 + 3] > 20) {
              if (x < minX) minX = x
              if (x > maxX) maxX = x
              if (y < minY) minY = y
              if (y > maxY) maxY = y
            }
          }
        }
        if (maxX >= 0) {
          var bw = maxX - minX + 1
          var bh = maxY - minY + 1
          rec.bbox = [bw, bh]
          rec.sizes = {}
          for (var s = 0; s < SIZES.length; s++) {
            var N = SIZES[s]
            var cc = document.createElement('canvas')
            cc.width = N; cc.height = N
            var cx = cc.getContext('2d')
            cx.clearRect(0, 0, N, N)
            cx.drawImage(img,
              minX * img.width / P, minY * img.height / P, bw * img.width / P, bh * img.height / P,
              0, 0, N, N)
            rec.sizes[N] = rowsFrom(cx.getImageData(0, 0, N, N).data, N)
          }
        }
      } catch (e) {
        rec.error = String(e)
      }
      out.push(rec)
      step()
    }, function () {
      out.push({ name: it.name, error: 'img' })
      step()
    })
  }

  step()
})()
