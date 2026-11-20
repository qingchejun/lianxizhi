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

  const curriculum = [
    ['a o e','ā/ó|ǎ/è|ō/é'], ['i u ü','ī/ǔ|ǘ/ú|ì/ǚ'], ['b p m f','b/p/m/f|f/m/p/b|m/b/f/p'],
    ['d t n l','d/t/n/l|l/n/t/d|n/d/l/t'], ['g k h','g/k/h|h/g/k|k/h/g'], ['j q x（ü 去点）','jqx'],
    ['z c s','z/c/s|c/s/z|s/z/c'], ['zh ch sh r','zh/ch/sh/r|r/sh/ch/zh|ch/r/zh/sh'], ['y w','yw'],
    ['ai ei ui','aiei'], ['ao ou iu','aoou'], ['ie üe er','ie/üe|üe/er|er/ie'],
    ['an en in','an/en/in|en/in/an|in/an/en'], ['ang eng ing ong','ang/eng/ing/ong|ong/ing/eng/ang|ing/ang/ong/eng'],
    ['整体认读 · 上','whole1'], ['整体认读 · 下','whole2'], ['声调与标调','tones'],
    ['三拼与介音','triple'], ['拼写规则汇总','accent'], ['词句应用与复核','sentences']
  ]
  const lessons = curriculum.map(([label, content], index) => {
    const id = 'lesson-' + (index + 1)
    if (!directions[content]) {
      const examples = Array.from(new Set(content.split(/[|/]/))).join('、')
      add(id, index < 9 ? 1 : index < 12 ? 2 : 3, label, 'letter', content,
        '按例子逐个辨读，注意口形。', '家长依次示范 ' + examples + '。', '指着示范项跟读/换个顺序辨读')
    }
    const extra = { 6: ['v-dot'], 10: ['iuui'], 11: ['iuui'], 17: ['accent', 'i-dot'], 19: ['i-dot', 'v-dot', 'yw'], 20: ['words'] }
    return { id, label, directions: [directions[content] ? content : id].concat(extra[index + 1] || []) }
  })
  const order = Array.from(new Set([
    'letters', 'blend', 'tones', 'triple', 'whole1', 'words',
    ...lessons.flatMap(lesson => lesson.directions), ...Object.keys(directions)
  ]))

  root.SumSum = root.SumSum || {}
  root.SumSum.pinyinData = { version: 1, directions, topics, lessons, order, shapes, vocabulary, writtenAnswers }
})(typeof window !== 'undefined' ? window : globalThis)
