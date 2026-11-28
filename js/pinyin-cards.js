/**
 * 拼音知识点闪卡（2026-11-28 方案 docs/superpowers/specs/2026-11-28-pinyin-flashcards.md）。
 * 一张卡一个知识点：正面给孩子认读的大号拼音 + 家长念的问题，背面大号答案 + 口诀、例词、易错。
 * lesson：第几课（1–14，照 2024 统编一上）；direction：对上 pinyin-data 的进度方向号（只读，用来挑「该练了」的卡）。
 * 例词只用这一课为止学过的声母韵母（不超纲）。现在只有 6 张样卡，站长看过再写全套。内容手写，改动要过审阅稿 docs/review/pinyin-flashcards.md。
 */
;(function (root) {
  'use strict'

  var CARDS = [
    {
      id: 'k03-bd', lesson: 3, direction: 'bd', title: 'b 和 d',
      front: { big: 'b　d', ask: '这两个字母怎么分？' },
      back: {
        big: 'b 肚子在右，d 肚子在左',
        rhyme: '右下半圆 b b b，左下半圆 d d d。',
        words: 'bà ba 爸爸　bǐ 笔',
        pitfall: '还要分清 p：p 的竖往下长。'
      }
    },
    {
      id: 'k03-blend', lesson: 3, direction: 'blend', title: '两拼音节',
      front: { big: 'b + ā = ？', ask: '声母和韵母，怎么连起来读？' },
      back: {
        big: 'bā',
        rhyme: '前音轻短后音重，两音相连猛一碰。',
        words: 'bā 八　mā 妈　pà 怕',
        pitfall: '别读成「波—啊」两个音，b 要读得又轻又短。'
      }
    },
    {
      id: 'k04-nl', lesson: 4, direction: 'nl', title: 'n 和 l',
      front: { big: 'n　l', ask: '捏住鼻子读一读，哪个读不出来？' },
      back: {
        big: 'n 读不出来',
        rhyme: 'n 的气从鼻子出来，l 的气从舌头两边出来。',
        words: 'ná 拿　mǎ lù 马路　nǚ 女',
        pitfall: '很多孩子 n、l 不分，捏鼻子一试就知道。'
      }
    },
    {
      id: 'k06-vdot', lesson: 6, direction: 'v-dot', title: '小 ü 摘帽',
      front: { big: 'j + ü = ？', ask: 'ü 碰到 j，头上两点怎么办？' },
      back: {
        big: 'ju',
        rhyme: '小 ü 有礼貌，见到 j q x 就摘帽。',
        words: 'jǔ 举　qù 去　xǔ 许',
        pitfall: '摘了帽还读 ü；碰到 n、l 不摘：nǚ 女、lǜ 绿。'
      }
    },
    {
      id: 'k10-accent', lesson: 10, direction: 'accent', title: '调号标在哪',
      front: { big: 'bai　gui', ask: 'bai 标二声、gui 标四声，调号写在哪个字母上？' },
      back: {
        big: 'bái　guì',
        rhyme: '有 a 不放过，没 a 找 o e，i u 并列标在后。',
        words: 'mèi 妹　duì 对　duō 多',
        pitfall: 'i 上标调先去点：yī、mí。'
      }
    },
    {
      id: 'k14-nasal', lesson: 14, direction: 'anang', title: '前鼻音和后鼻音',
      front: { big: 'an　ang', ask: '读完这两个，舌头哪里不一样？' },
      back: {
        big: 'an 舌尖顶，ang 舌根抬',
        rhyme: '前鼻音，舌尖顶住上牙床；后鼻音，舌根往上抬。',
        words: 'shān 山　shàng 上　mén 门　dēng 灯',
        pitfall: '成对读：an—ang，en—eng，in—ing。'
      }
    }
  ]

  root.SumSum = root.SumSum || {}
  root.SumSum.pinyinCards = { CARDS: CARDS }
})(typeof window !== 'undefined' ? window : globalThis)
