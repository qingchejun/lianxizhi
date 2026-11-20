;(function (root) {
  'use strict'

  const D = root.SumSum.pinyinData

  function dateKey(date = new Date()) {
    return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
      .map(value => String(value).padStart(2, '0')).join('-')
  }

  function addDays(date, days) {
    const time = new Date(date + 'T12:00:00Z')
    time.setUTCDate(time.getUTCDate() + days)
    return time.toISOString().slice(0, 10)
  }

  function hash(value) {
    return Array.from(value).reduce((seed, char) => (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0, 0)
  }

  function makeSheet(date, state, options = {}) {
    const due = D.order.filter(id => state[id]?.due && state[id].due <= date)
      .sort((a, b) => state[a].due.localeCompare(state[b].due))
    const unseen = D.order.filter(id => !state[id]?.observed)
    const focus = options.focus || due[0] || unseen[0]
    if (!D.directions[focus]) return null

    const direction = D.directions[focus]
    const groups = []
    const cards = []
    const id = options.id || date + '-daily'
    let number = 0
    let normalCount = 0

    function choose(directionId, exclude = [], initial = false) {
      const variants = D.directions[directionId].samples
      const offset = initial ? 0 : hash(date + directionId) % variants.length
      const ordered = variants.slice(offset).concat(variants.slice(0, offset))
      const previous = state[directionId]?.accepted || state[directionId]?.examples || []
      const overlaps = (variant, samples) => variant.filter(text => samples.includes(text)).length
      return ordered.slice().sort((a, b) =>
        overlaps(a, exclude) - overlaps(b, exclude) ||
        overlaps(a, previous) - overlaps(b, previous) ||
        (a.join('/') === previous.join('/')) - (b.join('/') === previous.join('/')))[0]
    }

    function group(directionId, label, samples, phase, pass = false) {
      const dir = D.directions[directionId]
      const entry = {
        id: 'g' + (groups.length + 1), direction: directionId, label, phase, pass,
        items: samples.map(text => {
          const answer = dir.kind === 'write' ? D.writtenAnswers[text] :
            directionId === 'words' ? D.vocabulary.find(word => word.pinyin === text)?.hanzi : undefined
          const item = { id: String(++number), text, kind: dir.kind }
          return answer ? { ...item, answer } : item
        })
      }
      groups.push(entry)
      if (phase === 'independent') normalCount += entry.items.length
      return entry
    }

    function branch(directionId, samples, ref) {
      const dir = D.directions[directionId]
      const alternatives = Array.from(new Set(choose(directionId, samples).filter(text => !samples.includes(text))))
      const candidates = alternatives.length >= 2 ? alternatives : choose(directionId, samples)
      const firstLetters = directionId === 'letters'
      const items = candidates.slice(0, firstLetters ? 4 : 2)
      const entry = group(directionId, dir.label, items, 'check')
      cards.push({ group: entry.id, startsAt: ref?.id, label: dir.label, tip: dir.tip, demo: dir.demo, guide: dir.guide })
      if (firstLetters) {
        cards.at(-1).probe = '从四个备选字母里挑两个复核，优先选刚才卡住的字母及容易和它混的字母。其余题可跳过。'
      }
    }

    const first = focus === 'letters'
    const leadsWithTeaching = options.mode === 'lesson'
    const primary = choose(focus, [], first && !state.letters?.observed)
    const main = group(focus, first ? '大声读出字母' : direction.label, primary, 'independent', true)
    let application
    if (first && !leadsWithTeaching) {
      application = group('blend', '拼一拼', choose('blend', [], !state.blend?.observed), 'independent', true)
    }

    if (!leadsWithTeaching) {
      const included = new Set(groups.map(entry => entry.direction))
      for (const next of due) {
        if (included.has(next)) continue
        const samples = choose(next)
        if (normalCount + samples.length > 10) continue
        group(next, '复习 · ' + D.directions[next].label, samples, 'independent', true)
        included.add(next)
        if (groups.length >= 3) break
      }
      if (groups.length < 4 && normalCount < 10) {
        const next = unseen.find(id => id !== 'letters' && !included.has(id))
        if (next) group(next, '试一试 · ' + D.directions[next].label, choose(next).slice(0, 2), 'observe')
      }
    }

    if (leadsWithTeaching) {
      cards.push({ label: direction.label, tip: direction.tip, demo: direction.demo, guide: direction.guide })
    } else {
      branch(focus, primary, main)
      if (application) {
        branch('blend', application.items.map(item => item.text), application)
        cards[cards.length - 1].probe = '先让孩子单认卡住的音节里的声母和韵母，再看卡在哪一步。'
      } else if (direction.kind === 'blend') {
        cards[0].probe = '先让孩子单认音节里的声母和韵母，再看卡在哪一步。'
      }
    }
    const reason = first && !state.letters?.observed ? '先看看四个容易认混的字母' :
      state[focus]?.due <= date ? state[focus].reason : '试一试' + direction.label

    return { id, date, focus, title: direction.label, reason, mode: options.mode || 'daily',
      version: D.version, groups, cards }
  }

  function derive(sheets, marks, date) {
    const days = Object.create(null)
    function evidence(direction, day) {
      days[direction] ||= Object.create(null)
      return days[direction][day] ||= { pass: null, failure: null, attempted: false, examples: null }
    }

    for (const sheet of sheets) {
      if (sheet.date > date) continue
      for (const group of sheet.groups) {
        const records = group.items.map(item => marks[sheet.id]?.[item.id])
        if (!records.some(record => record && ['ok', 'hint', 'miss'].includes(record.result))) continue
        const entry = evidence(group.direction, sheet.date)
        entry.attempted = true
        const examples = group.items.map(item => item.text)
        if (group.pass && records.every(record => record?.result === 'ok')) entry.pass = examples
        if (group.phase !== 'check') entry.examples = examples
        group.items.forEach((item, index) => {
          const mark = records[index]
          if (mark?.result !== 'hint' && mark?.result !== 'miss') return
          if (item.kind === 'shape' && mark.heard) {
            const pair = D.shapes.find(([, a, b]) =>
              (a === item.text && b === mark.heard) || (b === item.text && a === mark.heard))
            if (pair && pair[0] !== group.direction) {
              evidence(pair[0], sheet.date).failure = '上次把 ' + item.text + ' 读成了 ' + mark.heard
              if (group.direction === 'letters') {
                entry.targeted = true
                return
              }
            }
          }
          if (mark.tone && item.kind !== 'shape' && item.kind !== 'write' && group.direction !== 'tones') {
            evidence('tones', sheet.date).failure = '上次读 ' + item.text + ' 时声调有误'
            entry.targeted = true
            return
          }
          entry.failure = '上次 ' + item.text + (mark.result === 'hint' ? ' 需要提示' :
            item.kind === 'write' ? ' 没写对' : ' 没读出') + '，今天换题再试'
        })
      }
    }

    const state = Object.create(null)
    for (const [id, history] of Object.entries(days)) {
      const direction = D.directions[id]
      const result = { observed: false, streak: 0, due: null, reason: '', examples: [] }
      let accepted = []
      for (const day of Object.keys(history).sort()) {
        const entry = history[day]
        if (entry.examples) result.examples = entry.examples
        if (entry.failure) {
          result.observed = true
          result.streak = 0
          result.due = addDays(day, 1)
          result.reason = entry.failure
          accepted = []
        } else if (entry.pass && result.streak < 2 &&
           (!accepted.length || (['shape', 'letter', 'whole'].includes(direction.kind)
             ? entry.pass.join('/') !== accepted.join('/')
             : entry.pass.every(sample => !accepted.includes(sample))))) {
          result.observed = true
          result.streak++
          accepted = entry.pass
          result.due = result.streak === 2 ? null : addDays(day, 2)
          result.reason = '上次独立读写通过，今天换题确认'
        } else if ((entry.attempted || entry.targeted) && result.streak < 2 && !result.due) {
          result.observed = true
          result.due = addDays(day, entry.targeted ? 2 : 1)
          result.reason = '上次只观察了一部分，今天再确认'
        }
      }
      if (accepted.length) result.accepted = accepted
      state[id] = result
    }
    return state
  }

  function confirmRange(group, current, last, skipped = []) {
    const position = group.items.findIndex(item => item.id === last)
    return Object.fromEntries(group.items.map((item, index) => {
      const prior = current[item.id]
      const result = index <= position && !skipped.includes(item.id)
        ? (prior?.result === 'hint' || prior?.result === 'miss' ? prior : { result: 'ok' })
        : { result: 'unpracticed' }
      return [item.id, result]
    }))
  }

  root.SumSum.pinyin = { dateKey, addDays, makeSheet, derive, confirmRange }
})(typeof window !== 'undefined' ? window : globalThis)
