;(function (root) {
  'use strict'

  const directions = Object.create(null)
  const topics = ['字形看混', '相近声母', '复韵母', '鼻韵母', '声调', '两拼', '三拼', '整体认读', '书写规则', '词句应用']

  function add(id, topic, label, kind, samples, tip, demo, guide) {
    directions[id] = {
      id, topic, label, kind, samples: samples.split('|').map(group => group.split('/')),
      tip, demo, guide: guide.split('/')
    }
  }

  add('letters', 0, '观察 b、d、p、q', 'shape', 'd/p/b/q|q/b/d/p|b/q/p/d',
    '看圆肚子在竖线哪一侧、在上面还是下面。', 'b 的圆肚子在右下。', '找圆肚子/把字母打乱再认')
  const shapes = [
    ['bd', 'b', 'd', 'b 的圆肚子在右下，d 的在左下。'],
    ['bp', 'b', 'p', 'b 的竖线向上，p 的竖线向下。'],
    ['dq', 'd', 'q', 'd 的竖线向上，q 的竖线向下。'],
    ['pq', 'p', 'q', 'p 的圆肚子在竖线右边，q 的在左边。'],
    ['mn', 'm', 'n', 'm 有两道拱，n 有一道拱。'],
    ['ft', 'f', 't', '看弯钩的位置。f 在上面，t 在下面。'],
    ['uv', 'u', 'ü', 'ü 的上面有两点。']
  ]
  for (const [id, a, b, tip] of shapes) {
    add(id, 0, a + ' / ' + b + ' 字形', 'shape', a+'/'+b+'|'+b+'/'+a+'|'+a+'/'+b+'/'+a,
      tip, '先指认 ' + a + '，再指认 ' + b + '。', '找出 '+a+'/找出 '+b)
  }

  const initials = [
    ['nl','n / l','nā/lā|ní/lí|nù/lù','读 n 时让气流从鼻子出来，读 l 时让气流从舌头两边出来。','nǐ/lǐ'],
    ['zzh','z / zh','zā/zhā|zǔ/zhǔ|zá/zhá','对照平舌的 z 和翘舌的 zh。','zǎ/zhǎ'],
    ['cch','c / ch','cā/chā|cū/chū|cái/chái','对照平舌的 c 和翘舌的 ch。','cài/chài'],
    ['ssh','s / sh','sā/shā|sū/shū|sǎo/shǎo','对照平舌的 s 和翘舌的 sh。','sì/shì'],
    ['bp-sound','b / p','bā/pā|bí/pí|bù/pù','手放在嘴前，对照 b 和 p，读 p 时气更明显。','bǎo/pǎo'],
    ['dt','d / t','dā/tā|dí/tí|dù/tù','手放在嘴前，读 t 时气更明显。','dǎo/tǎo'],
    ['gk','g / k','gā/kā|gǔ/kǔ|gǒu/kǒu','手放在嘴前，读 k 时气更明显。','gài/kài']
  ]
  for (const [id, label, samples, tip, demo] of initials) {
    add(id, 1, label + ' 听读对照', 'sound', samples, tip, '家长示范 ' + demo.replace('/', '、') + '。', '听一遍区别/各跟读一次')
  }

  for (const [id, label, topic, samples, tip, demo] of [
    ['aiei','ai / ei',2,'bái/bēi|mǎi/měi|pái/pèi','先发 a 或 e，再滑向 i。','lái、lěi'],
    ['aoou','ao / ou',2,'dǎo/dǒu|pǎo/pǒu|māo/móu','先听清起始的 a 或 o，再滑向后一个音。','gāo、gōu'],
    ['ieei','ie / ei',2,'bié/bèi|miè/mèi|jiē/gēi','ie 从 i 起，ei 从 e 起。','liè、lèi'],
    ['iuui','iu / ui',2,'liù/duì|jiǔ/guǐ|qiú/tuí','先读完整的 iou、uei，再读缩写形式 iu、ui。','niú、shuǐ'],
    ['anang','an / ang',3,'bān/bāng|tán/táng|lǎn/lǎng','先读 a，再分别接前鼻尾 n、后鼻尾 ng。','màn、màng'],
    ['eneng','en / eng',3,'bēn/bēng|chén/chéng|fěn/fěng','先读 e，再分清收尾的 n 和 ng。','mén、méng'],
    ['ining','in / ing',3,'bīn/bīng|qín/qíng|jǐn/jǐng','先读 i，再分清收尾的 n 和 ng。','lín、líng']
  ]) add(id, topic, label, 'sound', samples, tip, '家长示范 ' + demo + '。', '先认韵母/把韵母放进音节跟读')

  add('tones', 4, '四声打乱读', 'tone', 'mǎ/mā/mà/má|bí/bì/bǐ/bī|dā/dǎ/dá/dà',
    '看调号，用手势带过一平、二升、三拐弯、四降。', '示范 lū、lú、lǔ、lù。', '跟手势读/换顺序读')
  add('tone23', 4, '二声和三声', 'tone', 'má/mǎ|dí/dǐ|lǐ/lí',
    '二声往上扬，单读三声先降再升。', '先读 tá，再读 tǎ。', '听两声的区别/再跟读')
  add('tone-change', 4, '同一个音节换声调', 'tone', 'mā/mà|bā/bà|tī/tì',
    '先读准声母和韵母，再按调号改变声调。', '读 pī、pì。', '指调号/按新调号再读')
  add('blend', 5, '声母和韵母拼起来', 'blend', 'bā/dī|pá/qí|dū/bǐ',
    '声母轻短，韵母读清，两部分连成一口气。', 'm 和 ǎ 连成 mǎ。', '分开读 m 和 ǎ/连起来读 mǎ')
  add('triple', 6, '带介音的三拼音节', 'blend', 'guā/huǒ|kuā/luò|huā/guǒ',
    '先点出中间的介音，再把三部分连起来。', 'j、i、ā 连成 jiā。', '找中间的 i/把三部分连起来')
  add('whole1', 7, '整体认读 · 平舌和翘舌', 'whole', 'zhi/zi/chi/ci/shi/si/ri|si/shi/ri/ci/chi/zi/zhi|chi/ri/zi/shi/ci/zhi/si',
    '整个音节直接读。可和开头的声母对照。', '指着 sh 和 shi 各读一次。', '分清声母和音节/直接读完整音节')
  add('whole2', 7, '整体认读 · y 和 w 开头', 'whole', 'yi/wu/yu/ye/yue/yuan/yin/yun/ying|ying/yue/yun/yin/ye/yi/yu/wu/yuan|yuan/yi/yun/yin/wu/ye/ying/yu/yue',
    '把一个音节当成一块直接认读。', '示范 yī 和 wǔ。', '指清整个音节/跟读完整音节')
  add('accent', 8, '给韵母标声调', 'write', 'ao 3声/ei 4声|ou 1声/ai 2声|iu 3声/ui 4声',
    '有 a 标在 a 上；接着找 o、e。iu 和 ui 标在后一个字母上。', 'ao 加一声写 āo。', '先找要标的位置/动笔标一次')
  add('i-dot', 8, 'i 加调要去点', 'write', 'i 2声/mi 3声|bi 4声/ni 1声|di 2声/li 3声',
    '给 i 标声调时，调号写在原来点的位置。', 'mi 加二声写 mí。', '指出 i 的点/去点再标调')
  add('v-dot', 8, 'ü 上的两点', 'write', 'j + ü/q + ü|x + ü/n + ü|l + ü/j + üè',
    'ü 跟 j、q、x 拼写时去掉两点，跟 n、l 拼时保留。', 'q 和 ü 写成 qu，n 和 ü 写成 nü。', '先看声母/决定两点留不留')
  add('yw', 8, '用 y 或 w 写音节', 'write', 'i → 音节/u → 音节|ü → 音节/ia → 音节|ie → 音节/ua → 音节',
    '单独成音节时按 y、w 的写法拼。', 'i 写成 yi，u 写成 wu，ü 写成 yu。', '读一遍韵母/写出完整音节')
  const writtenAnswers = {
    'ao 3声': 'ǎo', 'ei 4声': 'èi', 'ou 1声': 'ōu', 'ai 2声': 'ái', 'iu 3声': 'iǔ', 'ui 4声': 'uì',
    'i 2声': 'í', 'mi 3声': 'mǐ', 'bi 4声': 'bì', 'ni 1声': 'nī', 'di 2声': 'dí', 'li 3声': 'lǐ',
    'j + ü': 'ju', 'q + ü': 'qu', 'x + ü': 'xu', 'n + ü': 'nü', 'l + ü': 'lü', 'j + üè': 'juè',
    'i → 音节': 'yi', 'u → 音节': 'wu', 'ü → 音节': 'yu', 'ia → 音节': 'ya', 'ie → 音节': 'ye', 'ua → 音节': 'wa'
  }
  add('words', 9, '拼读熟悉的词语', 'word', 'xiǎo māo/dà mǐ|bái yún/kāi mén|huǒ chē/shū bāo',
    '先逐个读音节，再连起来读，说一说意思。', 'shuǐ、guǒ，连读 shuǐ guǒ。', '分两次读音节/把词连起来读')
  const vocabulary = root.SumSum.pinyinWords
  directions.words.samples = Array.from({ length: Math.floor(vocabulary.length / 2) }, (_, index) =>
    vocabulary.slice(index * 2, index * 2 + 2).map(word => word.pinyin))
  add('sentences', 9, '读短句，说意思', 'word', 'wǒ ài mā ma./xiǎo māo hē shuǐ.|wǒ kàn shū./bái yún piāo.|gē ge kāi mén./mèi mei huà huā.',
    '按词停一停，读完整句，再说句子讲了什么。', '先读 wǒ，再读 ài xué xí，最后连起来。', '听一句/分词读一句')

  add('jqx', 1, '读 j、q、x', 'letter', 'j/q/x|x/j/q|q/x/j',
    '家长分别示范 j、q、x 的读法。让孩子指着字母跟读，再打乱读。', '按 j、q、x 的顺序示范。', '指认 j/把 q 和 x 调换位置')

  /*
   * 课程（2026-11-27 改）：照 2024 年新版统编一年级上册的 14 课排。整体认读、声调、标调规则放进对应的课里，专题照样保留。
   * 方向号不能改：老卷子按方向号存（group.direction），lesson-1…lesson-14 里和新课内容相同的照用老号，
   * 进度接得上；内容变了的另起新号（lesson-yw / lesson-ai / lesson-ao / lesson-an）。
   * 老课程里不再用的 lesson-13（an en in）留在 directions 里、标 legacy：老卷子能打开、到期的复习照排，但不再当新内容出。
   * 每课一张教学卡 teach：发音、口诀、易错、书写（四线格）、例词。不做读音。
   */
  function letters(id, topic, label, samples, tip, demo) {
    add(id, topic, label, 'letter', samples, tip, demo, '指着示范项跟读/换个顺序辨读')
  }
  letters('lesson-1', 2, 'a o e', 'ā/ó|ǎ/è|ō/é', '按例子逐个辨读，注意口形。', '家长依次示范 ā、ó、ǎ、è、ō、é。')
  letters('lesson-2', 2, 'i u ü', 'ī/ǔ|ǘ/ú|ì/ǚ', '按例子逐个辨读，注意口形。', '家长依次示范 ī、ǔ、ǘ、ú、ì、ǚ。')
  letters('lesson-3', 1, 'b p m f', 'b/p/m/f|f/m/p/b|m/b/f/p', '声母读得轻短，按例子逐个辨读。', '家长依次示范 b、p、m、f。')
  letters('lesson-4', 1, 'd t n l', 'd/t/n/l|l/n/t/d|n/d/l/t', '声母读得轻短，按例子逐个辨读。', '家长依次示范 d、t、n、l。')
  letters('lesson-5', 1, 'g k h', 'g/k/h|h/g/k|k/h/g', '声母读得轻短，按例子逐个辨读。', '家长依次示范 g、k、h。')
  letters('lesson-7', 1, 'z c s', 'z/c/s|zi/ci/si|s/z/c', '声母读得轻短；zi ci si 整个直接读。', '家长依次示范 z、c、s，再读 zi、ci、si。')
  letters('lesson-8', 1, 'zh ch sh r', 'zh/ch/sh/r|zhi/chi/shi/ri|ch/r/zh/sh', '舌尖翘起；zhi chi shi ri 整个直接读。', '家长依次示范 zh、ch、sh、r，再读 zhi、chi、shi、ri。')
  letters('lesson-yw', 1, 'y w', 'y/w|yi/wu/yu|w/y', 'y、w 读得轻短；yi wu yu 整个直接读。', '家长依次示范 y、w，再读 yi、wu、yu。')
  letters('lesson-ai', 2, 'ai ei ui', 'ai/ei/ui|ui/ai/ei|ei/ui/ai', '从前一个音滑到后一个音，读成一个音。', '家长依次示范 ai、ei、ui。')
  letters('lesson-ao', 2, 'ao ou iu', 'ao/ou/iu|iu/ao/ou|ou/iu/ao', '从前一个音滑到后一个音，读成一个音。', '家长依次示范 ao、ou、iu。')
  letters('lesson-12', 2, 'ie üe er', 'ie/üe|üe/er|er/ie', '按例子逐个辨读；er 要卷舌。', '家长依次示范 ie、üe、er。')
  letters('lesson-13', 3, 'an en in', 'an/en/in|en/in/an|in/an/en', '按例子逐个辨读，注意口形。', '家长依次示范 an、en、in。')
  directions['lesson-13'].legacy = true
  letters('lesson-an', 3, 'an en in un ün', 'an/en/in/un/ün|un/ün/an/in/en|in/an/ün/en/un', '读完舌尖抵住上牙床，是前鼻音。', '家长依次示范 an、en、in、un、ün。')
  letters('lesson-14', 3, 'ang eng ing ong', 'ang/eng/ing/ong|ong/ing/eng/ang|ing/ang/ong/eng', '读完舌根往上抬，是后鼻音。', '家长依次示范 ang、eng、ing、ong。')

  const W = list => list.split('，').map(pair => pair.split(' = '))
  const curriculum = [
    ['a o e', ['lesson-1', 'tones'], {
      sound: 'ɑ：嘴巴张大，舌头放平，声音响亮。o：嘴唇拢圆，像个小圆圈。e：嘴巴半张，嘴角向两边微微咧开。',
      rhyme: '张大嘴巴 ɑ ɑ ɑ，圆圆嘴巴 o o o，扁扁嘴巴 e e e。声调：一声平，二声扬，三声拐弯，四声降。',
      pitfall: 'o 和 e 容易读混：o 的嘴是圆的，e 的嘴是扁的。二声和三声分不清：二声一路往上扬，三声先往下再往上。',
      write: '三个字母都写在中格，占满中格。ɑ 先写左半圆，再写右边的竖弯；o 从左上起笔，一笔写圆；e 先写一横，再接着向上绕成半圆。',
      words: W('ā = 啊，é = 鹅，è = 饿，ó = 哦')
    }],
    ['i u ü', ['lesson-2', 'tone23', 'i-dot'], {
      sound: 'i：牙齿对齐，嘴角向两边展开，像在笑。u：嘴唇拢圆、往前突出，像吹蜡烛。ü：先摆好 i 的舌头，再把嘴唇撮成小圆孔。',
      rhyme: '牙齿对齐 i i i，嘴巴突出 u u u，吹个口哨 ü ü ü。i 上标调，先把点去掉。',
      pitfall: 'u 和 ü 读混：ü 的嘴形更小、更紧。给 i 标声调时要去掉点，调号写在点的位置（ī，不是 i 上再加一横）。',
      write: '三个字母的主体都在中格。i 的竖在中格，点在上格；u 在中格，右边一竖带个小尾巴；ü 的两点写在上格。',
      words: W('yī = 衣，wū = 屋，yú = 鱼（课本插图里的字，先跟读，第 9 课再讲 y w）')
    }],
    ['b p m f', ['lesson-3', 'bd', 'bp', 'bp-sound', 'blend'], {
      sound: '声母要读得轻、读得短。b：双唇闭紧，突然张开，气流弱。p：口形同 b，但气流强，手放嘴前能感到一股气。m：双唇闭住，气从鼻子出来。f：上牙轻轻咬住下唇，气从缝里挤出来。',
      rhyme: '听广播 b b b，爬山坡 p p p，两扇门 m m m，一根拐棍 f f f。拼音节：前音轻短后音重，两音相连猛一碰。',
      pitfall: 'b 和 d、p 和 q 左右、上下认反。b 和 p 读混：手放嘴前试一试，p 有气、b 没有。声母读得太重太长：b 不是拖长的「波——」。',
      write: 'b：竖从上格写到中格底，半圆在中格右边。p：竖从中格顶写到下格，半圆在中格右边。m：在中格，两个门洞一样宽。f：弯头在上格，竖写到中格底，横贴着中格上线。',
      words: W('bà ba = 爸爸，mā ma = 妈妈，pá pō = 爬坡，mù mǎ = 木马')
    }],
    ['d t n l', ['lesson-4', 'dt', 'nl'], {
      sound: '舌尖抵住上牙床。d：舌尖抵住后突然弹开，气流弱。t：同 d，但气流强。n：舌尖抵住不放，气从鼻子出来。l：舌尖抵住，气从舌头两边出来。',
      rhyme: '左下半圆 d d d，一把雨伞 t t t，一个门洞 n n n，一根小棍 l l l。',
      pitfall: 'n 和 l 分不清（四川话里很常见）：捏住鼻子读一读，n 读不出来，l 照样能读。d 和 t 读混：手放嘴前，t 有气。d 和 b 认反：d 的半圆在左边。',
      write: 'd：半圆在中格左边，竖从上格写到中格底。t：竖从上格起笔，到中格底向右弯，横贴着中格上线。n：在中格，一个门洞。l：从上格写到中格底，一竖。',
      words: W('tǔ dì = 土地，mǎ lù = 马路，dì di = 弟弟，lǜ = 绿')
    }],
    ['g k h', ['lesson-5', 'gk', 'triple'], {
      sound: '舌根往上抬，抵住口腔后上方。g：抵住后突然放开，气流弱。k：同 g，但气流强。h：舌根靠近但不抵住，气从缝里摩擦出来，像冬天哈气。',
      rhyme: '鸽子 g g g，蝌蚪 k k k，喝水 h h h。三拼音节：声轻介快韵母响，三音连读很顺当。',
      pitfall: 'g 和数字 9、q 认混。三拼音节漏了中间的 u：guā 读成 gā。g 和 k 读混：手放嘴前，k 有气。',
      write: 'g：圆在中格，竖从中格写到下格再向左弯，只有一个圈（不要写成印刷体那种上下两个圈）。k：竖从上格写到中格底，右边两笔在中格。h：竖从上格起笔，右边门洞在中格。',
      words: W('gē ge = 哥哥，kū = 哭，hé = 河，guā = 瓜，huā = 花')
    }],
    ['j q x', ['jqx', 'v-dot'], {
      sound: '舌面前部往上抬，贴住上牙后面那块硬地方。j：贴住后突然放开，气流弱。q：同 j，但气流强。x：舌面靠近但不贴住，气从缝里摩擦出来。',
      rhyme: 'j q x，真淘气，从来不和 u 在一起。小 ü 小 ü 有礼貌，见到 j q x 就脱帽（去掉两点）。',
      pitfall: 'ju、qu、xu 里的 u 其实读 ü，孩子常按 u 读。q 和 p、g 认混：q 的半圆在左边。j 的点忘写。',
      write: 'j：点在上格，竖从中格写到下格再向左弯。q：半圆在中格左边，竖从中格顶写到下格。x：在中格，先写左上到右下的一笔，再写右上到左下的一笔。',
      words: W('jī = 鸡，qí = 骑，qù = 去，xī guā = 西瓜')
    }],
    ['z c s', ['lesson-7'], {
      sound: '舌尖平伸，抵住或靠近上门牙背后。z：抵住后放开，气流弱。c：同 z，但气流强。s：舌尖靠近，气从缝里挤出来，像漏气的「丝」声。zi、ci、si 是整体认读音节，直接读，不拼。',
      rhyme: '像个 2 字 z z z，半个圆圈 c c c，半个 8 字 s s s。',
      pitfall: '把 zi 拼成 z—i：整体认读要整个直接读。c 和 e、o 认混。s 方向写反。',
      write: '三个都写在中格。z：横、斜、横，一笔写成。c：从右上起笔，向左绕半个圆。s：从右上起笔，一笔写成，上下两个弯一样大。',
      words: W('zì = 字，sì = 四，cā = 擦，zì jǐ = 自己')
    }],
    ['zh ch sh r', ['lesson-8', 'zzh', 'cch', 'ssh', 'whole1'], {
      sound: '舌尖翘起来，抵住或靠近上牙床后面。zh：抵住后放开，气流弱。ch：同 zh，但气流强。sh：舌尖靠近，气从缝里摩擦出来。r：舌头位置同 sh，但声音带震动。zhi、chi、shi、ri 是整体认读音节。',
      rhyme: 'z c s 加上 h，舌头翘起读 zh ch sh。',
      pitfall: '平舌、翘舌分不清（四川话常把 zh ch sh 读成 z c s）：读翘舌时舌尖要往上翘。r 读成 l 或 y。zhi 拼成 zh—i。',
      write: 'zh、ch、sh 是两个字母，要靠紧，h 的竖从上格起笔。r：在中格，竖再加一个小弯。',
      words: W('zhī zhū = 蜘蛛，chī = 吃，shū = 书，rì = 日')
    }],
    ['y w', ['lesson-yw', 'yw'], {
      sound: 'y 读起来和 i 差不多，w 读起来和 u 差不多，都读得轻短。yi、wu、yu 是整体认读音节，直接读。',
      rhyme: '小 i 写成 yi，小 u 写成 wu。小 ü 见到 y，擦掉眼泪（去掉两点）笑嘻嘻：yu。',
      pitfall: 'yu 的 u 其实读 ü。w 写成两个 v 分开。yi 拼成 y—i。',
      write: 'y：先写左边短的一笔（从中格左上斜向右下），再写长的一笔，从中格右上一直斜到下格。w：在中格，一笔写成，像两个 v 连在一起。',
      words: W('yī fu = 衣服，wǔ = 五，yǔ = 雨，wá wa = 娃娃')
    }],
    ['ai ei ui', ['lesson-ai', 'aiei', 'accent'], {
      sound: '复韵母：从前一个音滑到后一个音，中间不停，读成一个音。ai：从 ɑ 滑向 i。ei：从 e 滑向 i。ui：从 u 滑向 i。',
      rhyme: '标调歌：有 ɑ 不放过，没 ɑ 找 o e，i u 并列标在后。',
      pitfall: 'ai 读成两个音「ɑ—i」。ui 的调号标在 u 上：应该标在 i 上（guì）。ei 和后面的 ie 认反。',
      write: '两个字母都在中格，靠紧写，像一个整体；i 的点在上格。',
      words: W('bái cài = 白菜，mèi mei = 妹妹，shuǐ = 水，hēi = 黑')
    }],
    ['ao ou iu', ['lesson-ao', 'aoou', 'iuui'], {
      sound: 'ao：从 ɑ 滑向 o，嘴从大到圆。ou：从 o 滑向 u，嘴越收越小。iu：从 i 滑向 u。',
      rhyme: 'i u 并列标在后：iu 的调号标在 u 上，ui 的调号标在 i 上。',
      pitfall: 'ao 和 ou 读混：ao 开头嘴张大，ou 开头嘴是圆的。iu 和 ui 认反。iu 的调号标错位置（应是 liù）。',
      write: '两个字母都在中格，靠紧写；i 的点在上格。',
      words: W('māo = 猫，gǒu = 狗，niú = 牛，hǎo = 好')
    }],
    ['ie üe er', ['lesson-12', 'ieei'], {
      sound: 'ie：从 i 滑向 e。üe：从 ü 滑向 e。er：先摆好 e 的口形，舌尖往上卷。ye、yue 是整体认读音节。',
      rhyme: '小 ü 见了 j q x y，去掉两点还读 ü：jue、que、xue、yue。',
      pitfall: 'ie 和 ei 认反。xue、yue 里的 u 其实读 ü。er 不跟声母拼，单独成音节。',
      write: '都在中格，字母靠紧写；ü 的两点在上格，跟 j q x y 拼时不写两点。',
      words: W('yé ye = 爷爷，xié = 鞋，xué xí = 学习，ěr duo = 耳朵，yuè liang = 月亮')
    }],
    ['an en in un ün', ['lesson-an'], {
      sound: '前鼻韵母：先读前面的 ɑ、e、i、u、ü，舌尖马上抵住上牙床，气从鼻子出来。yuan、yin、yun 是整体认读音节。',
      rhyme: '前鼻音，舌尖顶，顶住上牙床不放松。',
      pitfall: '前鼻音、后鼻音分不清（an 读成 ang）：读完舌尖要抵住上牙床。ün 跟 j q x y 拼时去掉两点：jun、qun、xun、yun。',
      write: '都在中格，字母靠紧写；i 的点、ü 的两点在上格。',
      words: W('shān = 山，mén = 门，lín = 林，chūn tiān = 春天，yún = 云')
    }],
    ['ang eng ing ong', ['lesson-14', 'anang', 'eneng', 'ining', 'whole2', 'words'], {
      sound: '后鼻韵母：先读前面的 ɑ、e、i、o，舌根马上往上抬，气从鼻子出来，嘴巴不闭上。ying 是整体认读音节。',
      rhyme: '后鼻音，舌根抬，嘴巴张开气出来。前后鼻音成对读：an—ang，en—eng，in—ing。',
      pitfall: 'eng 读成 en、ing 读成 in（四川话常见）：读完舌根要往上抬。ong 不能单独成音节，前面总带声母。',
      write: '前面的字母在中格，g 的圆在中格、尾巴向左弯到下格，只有一个圈。',
      words: W('tài yáng = 太阳，fēng = 风，xīng xing = 星星，hóng = 红，dēng = 灯')
    }]
  ]
  const lessons = curriculum.map(([label, list, teach], index) => {
    directions[list[0]].teach = { label, ...teach }
    return { id: 'k' + String(index + 1).padStart(2, '0'), label, directions: list }
  })
  const legacy = Object.keys(directions).filter(id => directions[id].legacy)
  const order = Array.from(new Set([
    'letters', 'blend', 'tones', 'triple', 'whole1', 'words',
    ...lessons.flatMap(lesson => lesson.directions), ...Object.keys(directions)
  ])).filter(id => !directions[id].legacy)

  root.SumSum = root.SumSum || {}
  root.SumSum.pinyinData = { version: 1, directions, topics, lessons, order, legacy, shapes, vocabulary, writtenAnswers }
})(typeof window !== 'undefined' ? window : globalThis)
