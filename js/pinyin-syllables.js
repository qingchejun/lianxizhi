;(function (root) {
  'use strict'

  // Explicit combinations of initials and written finals. Do not generate a Cartesian product.
  const rows = {
    '': 'a ai an ang ao e ei en eng er o ou',
    b: 'a ai an ang ao ei en eng i ian iao ie in ing o u',
    p: 'a ai an ang ao ei en eng i ian iao ie in ing o ou u',
    m: 'a ai an ang ao e ei en eng i ian iao ie in ing iu o ou u',
    f: 'a an ang ei en eng o ou u',
    d: 'a ai an ang ao e ei eng i ia ian iao ie ing iu ong ou u uan ui un uo',
    t: 'a ai an ang ao e eng i ian iao ie ing ong ou u uan ui un uo',
    n: 'a ai an ang ao e ei en eng i ian iang iao ie in ing iu ong ou u uan uo ü üe',
    l: 'a ai an ang ao e ei eng i ia ian iang iao ie in ing iu ong ou u uan un uo ü üe',
    g: 'a ai an ang ao e ei en eng ong ou u ua uai uan uang ui un uo',
    k: 'a ai an ang ao e en eng ong ou u ua uai uan uang ui un uo',
    h: 'a ai an ang ao e ei en eng ong ou u ua uai uan uang ui un uo',
    j: 'i ia ian iang iao ie in ing iong iu u uan ue un',
    q: 'i ia ian iang iao ie in ing iong iu u uan ue un',
    x: 'i ia ian iang iao ie in ing iong iu u uan ue un',
    zh: 'a ai an ang ao e ei en eng i ong ou u ua uai uan uang ui un uo',
    ch: 'a ai an ang ao e en eng i ong ou u ua uai uan uang ui un uo',
    sh: 'a ai an ang ao e ei en eng i ou u ua uai uan uang ui un uo',
    r: 'an ang ao e en eng i ong ou u ua uan ui un uo',
    z: 'a ai an ang ao e ei en eng i ong ou u uan ui un uo',
    c: 'a ai an ang ao e en eng i ong ou u uan ui un uo',
    s: 'a ai an ang ao e en eng i ong ou u uan ui un uo',
    y: 'a an ang ao e i in ing o ong ou u uan ue un',
    w: 'a ai an ang ei en eng o u'
  }

  const syllables = Object.create(null)
  for (const [initial, endings] of Object.entries(rows)) {
    for (const final of endings.split(' ')) {
      const spelling = initial + final
      if (syllables[spelling]) throw Error('重复音节 ' + spelling)
      syllables[spelling] = { initial, final }
    }
  }

  function split(text) {
    const spelling = text.toLowerCase().normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g, '').normalize('NFC')
    return syllables[spelling] || null
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.pinyinSyllables = { syllables, split }
})(typeof window !== 'undefined' ? window : globalThis)
