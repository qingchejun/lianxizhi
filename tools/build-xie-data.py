"""生成 js/shizi-xie-data.js（人教版写字表 + 每个字的拼音、笔画名、笔顺图形）。

一次性脚本，输入放在 /tmp/rj（重新生成时按下面重新下载）：
  - 课本：国家中小学智慧教育平台《义务教育教科书 语文 一年级 上册》PDF（2024 年 8 月版），
    书后第 108 页「写字表」→ 字和拼音（pdftotext -layout，拼音是自定义字体编码，见 TONE 表）。
  - 笔画图形与笔顺：hanzi-writer-data@2.0.1（来自 Make Me a Hanzi，Arphic Public License，
    许可全文见 js/vendor/LICENSE-hanzi-writer-data-ARPHICPL.txt）→ /tmp/rj/hw_data.json
  - 笔画名称：cnchar-order@3.2.6（MIT）的笔顺字母 → /tmp/rj/cn_order.json
两个来源逐字核对过：笔画数一致、每一笔走向和笔画名相符（见 2026-11-22 记录）。
cnchar 不区分的几对笔画按课本叫法逐字指定（NAME_FIX）。
"""
import json

XIE = [
 ('识字 2','一二三上'),('识字 3','口耳目手'),('识字 4','日火田禾'),('语文园地一','六七八十'),
 ('语文园地二','九王'),('语文园地三','午下'),('语文园地四','去年'),
 ('课文 1','了子大人'),('课文 2','可叶东西'),('课文 3','竹马牙用几'),('课文 4','四小鸟是天'),('语文园地五','女开关先'),
 ('识字 5','云雨虫山水'),('识字 6','力男土木心'),('识字 7','尺本刀不少'),('识字 8','中五风立正'),('语文园地六','工厂门卫'),
 ('课文 5','月儿头里见'),('课文 6','在我左右'),('课文 7','和也又才'),('语文园地七','爸妈'),
 ('课文 8','比巴长公'),('课文 9','只个多石出'),('课文 10','来半你有'),('语文园地八','牛羊果白'),
]
LETTER = {'j':'横','f':'竖','s':'撇','l':'捺','k':'点','d':'点','i':'提','c':'横折','r':'横折钩','q':'横折折折',
  'a':'横折折撇','p':'横折提','u':'竖弯钩','z':'竖折折钩','h':'竖提','g':'竖钩','n':'撇折','m':'撇点','t':'弯钩'}
# cnchar 一个字母对两种笔画（或叫法和课本不同）的，按字指定：{字: {第几笔(1起): 名称}}
NAME_FIX = {
  '山': {2: '竖折'}, '出': {1: '竖折', 4: '竖折'}, '西': {5: '竖弯'}, '四': {4: '竖弯'},
  '九': {2: '横折弯钩'}, '几': {2: '横折弯钩'}, '风': {2: '横折弯钩'},
  '了': {1: '横撇'}, '子': {1: '横撇'}, '水': {2: '横撇'}, '又': {1: '横撇'}, '多': {2: '横撇', 5: '横撇'},
  '你': {4: '横钩'}, '心': {2: '卧钩'}, '我': {5: '斜钩'},
}
PY_FIX = {'工': 'gōng', '厂': 'chǎng', '门': 'mén', '卫': 'wèi'}  # 这一行和「汉语拼音」标题挤在一行，按课本手填

hw = json.load(open('/tmp/rj/hw_data.json'))
cn = json.load(open('/tmp/rj/cn_order.json'))
py = json.load(open('/tmp/rj/xie_py.json'))
py.update(PY_FIX)

chars = {}
for _, cs in XIE:
    for ch in cs:
        names = []
        for i, c in enumerate(cn[ch]):
            n = NAME_FIX.get(ch, {}).get(i + 1) or LETTER.get(c)
            if not n:
                raise SystemExit('没定名：%s 第 %d 笔（%s）' % (ch, i + 1, c))
            names.append(n)
        d = hw[ch]
        assert len(d['strokes']) == len(names) == len(d['medians']), ch
        chars[ch] = {'py': py[ch], 'n': names, 's': d['strokes'],
                     'm': [[[round(x), round(y)] for x, y in m] for m in d['medians']]}

out = ['/**',
 ' * 写字表（人教版语文一年级上册书后「写字表」，100 字）+ 每个字的拼音、笔画名、笔顺图形。',
 ' * 由 tools/build-xie-data.py 生成，别手改（来源与核对方法见那个脚本）。',
 ' * 图形数据来自 Make Me a Hanzi / hanzi-writer-data，Arphic Public License，',
 ' * 许可全文见 js/vendor/LICENSE-hanzi-writer-data-ARPHICPL.txt。',
 ' * 坐标：1024×1024，y 轴朝上，画的时候要 translate(0,900) scale(1,-1)。',
 ' */',
 '(function (root) {',
 "  'use strict'",
 '  var CHARS = ' + json.dumps(chars, ensure_ascii=False, separators=(',', ':')),
 '  root.SumSum = root.SumSum || {}',
 '  root.SumSum.shiziXieData = { CHARS: CHARS }',
 "})(typeof window !== 'undefined' ? window : globalThis)", '']
open('js/shizi-xie-data.js', 'w').write('\n'.join(out))
print('ok', len(chars), 'chars')
