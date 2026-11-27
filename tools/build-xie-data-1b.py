"""把统编版一年级下册「写字表」200 字追加进 js/shizi-xie-data.js（一上的 100 字原样保留）。

输入（重新生成时按下面重新准备，放 /tmp/xie-in）：
  - 课本：国家中小学智慧教育平台《义务教育教科书 语文 一年级 下册》（2024 新版，平台 2026-03 更新），
    PDF 要登录，但每页图片公开：.../assets/b87e153f-a64c-451a-aa6c-6ed9ac7d6821.t/zh-CN/1772437264666/transcode/image/<页>.jpg
    书后第 117–119 页（图 122–124）「写字表」→ 下面 XIE 和 PY（看图逐字录入，字数对上「共 200 个字」）。
  - 笔画图形与笔顺：npm hanzi-writer-data@2.0.1 → /tmp/xie-in/hw/package/<字>.json
  - 笔画名称：npm cnchar@3.2.6 + cnchar-order@3.2.6，cnchar.stroke(字, 'order', 'name') → /tmp/xie-in/names.json
    （点2→点、横斜钩→横折弯钩；cnchar 给两个候选的笔画按课本叫法逐字定在 NAME_FIX。
     这套规则先拿一上已人工核对过的 100 字试过：只差这几类，其余全对。）
两个来源的笔画数逐字核对一致。
"""
import json, re

XIE = [('识字 1','春冬吹花飞入'),('识字 2','什么古胡双言'),('识字 3','青清晴苗请生'),('识字 4','字红动万无明'),('语文园地一','文卡片合'),
 ('课文 1','共产党太阳光'),('课文 2','井主江住方后'),('课文 3','告的会北京广'),('语文园地二','写认'),
 ('课文 4','走河说让自己'),('课文 5','从好们叫他回'),('课文 6','快乐当书画毛'),('语文园地三','止斤寸丁千旦'),
 ('课文 7','思床前地故乡'),('课文 8','色把讲样笑再'),('课文 9','节米间分吃肉'),('语文园地四','册支电衣'),
 ('识字 5','物造运欢房网'),('识字 6','对今雪细夕语'),('识字 7','打皮跑足沙包'),('识字 8','近习远学玉义'),('语文园地五','饱抱'),
 ('课文 10','首池采尖角早'),('课文 11','眼泪它贝气娃'),('课文 12','机台唱伞朵美'),('课文 13','这看鱼面问加'),('语文园地六','豆斗'),
 ('课文 14','笔知道放平安'),('课文 15','元灯车站坐老师'),('课文 16','国都百听时点林'),('课文 17','高兴着往瓜兔进'),('语文园地七','巾洗'),
 ('课文 18','她空还干身星久'),('课文 19','吓为怕家象没到'),('课文 20','向边行草赶过找'),('语文园地八','页户交父')]

PY = dict(zip(list(''.join(c for _, c in XIE)), '''chūn dōng chuī huā fēi rù shén me gǔ hú shuāng yán qīng qīng qíng miáo qǐng shēng
zì hóng dòng wàn wú míng wén kǎ piàn hé gòng chǎn dǎng tài yáng guāng jǐng zhǔ jiāng zhù fāng hòu gào de huì běi jīng guǎng
xiě rèn zǒu hé shuō ràng zì jǐ cóng hǎo men jiào tā huí kuài lè dāng shū huà máo zhǐ jīn cùn dīng qiān dàn
sī chuáng qián dì gù xiāng sè bǎ jiǎng yàng xiào zài jié mǐ jiān fēn chī ròu cè zhī diàn yī
wù zào yùn huān fáng wǎng duì jīn xuě xì xī yǔ dǎ pí pǎo zú shā bāo jìn xí yuǎn xué yù yì bǎo bào
shǒu chí cǎi jiān jiǎo zǎo yǎn lèi tā bèi qì wá jī tái chàng sǎn duǒ měi zhè kàn yú miàn wèn jiā dòu dǒu
bǐ zhī dào fàng píng ān yuán dēng chē zhàn zuò lǎo shī guó dōu bǎi tīng shí diǎn lín gāo xìng zhe wǎng guā tù jìn jīn xǐ
tā kōng hái gàn shēn xīng jiǔ xià wèi pà jiā xiàng méi dào xiàng biān xíng cǎo gǎn guò zhǎo yè hù jiāo fù'''.split()))

# cnchar 给两个候选（或叫法和课本不同）的笔画：{字: {第几笔(1 起): 名称}}
HG, HP = '横钩', '横撇'
NAME_FIX = {
  '冬': {2: HP}, '吹': {5: HG}, '双': {1: HP, 3: HP}, '字': {3: HG, 4: HP}, '党': {5: HG}, '写': {2: HG},
  '好': {4: HP}, '色': {2: HP}, '支': {3: HP}, '欢': {1: HP, 4: HG}, '对': {1: HP}, '今': {4: HP},
  '雪': {3: HG}, '夕': {2: HP}, '皮': {1: HG, 4: HP}, '学': {5: HG, 6: HP}, '饱': {2: HG}, '角': {2: HP},
  '它': {3: HG}, '鱼': {2: HP}, '安': {3: HG}, '兔': {2: HP}, '空': {3: HG}, '久': {2: HP}, '家': {3: HG},
  '象': {2: HP}, '没': {6: HP, 5: '横折弯'}, '朵': {2: '横折弯'},
  '阳': {1: '横撇弯钩'}, '都': {9: '横撇弯钩'},
  '思': {7: '卧钩'}, '找': {5: '斜钩'},
  '乐': {2: '竖折'}, '画': {7: '竖折'},
}

assert len(PY) == 200, len(PY)
names = json.load(open('/tmp/xie-in/names.json'))
path = 'js/shizi-xie-data.js'
src = open(path, encoding='utf-8').read()
m = re.search(r'var CHARS = (\{.*\})\n', src)
chars = json.loads(m.group(1))
for ch, py in PY.items():
    n = list(names[ch])
    for k, v in NAME_FIX.get(ch, {}).items():
        n[k - 1] = v
    bad = [s for s in n if '|' in s or s == '竖弯' or not s]
    if bad:
        raise SystemExit('没定名：%s %s' % (ch, n))
    d = json.load(open('/tmp/xie-in/hw/package/%s.json' % ch))
    assert len(d['strokes']) == len(n) == len(d['medians']), ch
    chars[ch] = {'py': py, 'n': n, 's': d['strokes'], 'm': [[[round(x), round(y)] for x, y in mm] for mm in d['medians']]}
src = src[:m.start(1)] + json.dumps(chars, ensure_ascii=False, separators=(',', ':')) + src[m.end(1):]
src = src.replace('写字表（人教版语文一年级上册书后「写字表」，100 字）', '写字表（统编版语文一年级上册 100 字 + 下册 200 字）')
src = src.replace('由 tools/build-xie-data.py 生成', '由 tools/build-xie-data.py（一上）和 tools/build-xie-data-1b.py（一下）生成')
open(path, 'w', encoding='utf-8').write(src)
print('ok', len(chars), 'chars')
