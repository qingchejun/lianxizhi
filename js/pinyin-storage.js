;(function (root) {
  'use strict'

  const S = root.SumSum
  const SHEET = 'sumsum:pinyin:sheet:v1:'
  const MARK = 'sumsum:pinyin:mark:v1:'
  const SETTINGS = 'sumsum:pinyin:settings:v1'

  function validSheet(value, key) {
    return value && typeof value.id === 'string' && typeof value.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.date) && Number.isFinite(Date.parse(value.date)) &&
      key === SHEET + value.date + ':' + value.id &&
      S.pinyinData.directions[value.focus] && Array.isArray(value.cards) &&
      value.cards.every(card => card && Array.isArray(card.guide)) &&
      Array.isArray(value.groups) && value.groups.length > 0 &&
      value.groups.every(group => group && S.pinyinData.directions[group.direction] &&
        Array.isArray(group.items) && group.items.length > 0 &&
        group.items.every(item => item && typeof item.id === 'string' && typeof item.text === 'string'))
  }

  function read(storage) {
    const sheets = []
    const marks = Object.create(null)
    if (!storage) return { sheets, marks }
    try {
      for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index)
        if (!key || (!key.startsWith(SHEET) && !key.startsWith(MARK))) continue
        let value
        try { value = JSON.parse(storage.getItem(key)) } catch (error) { continue }
        if (key.startsWith(SHEET)) {
          if (validSheet(value, key)) sheets.push(value)
        } else if (value && ['ok', 'miss', 'hint', 'unpracticed'].includes(value.result)) {
          const [id, item] = key.slice(MARK.length).split(':')
          marks[id] ||= Object.create(null)
          marks[id][item] = value
        }
      }
    } catch (error) {
      // A restricted browser can still use the in-memory worksheet.
    }
    sheets.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
    return { sheets, marks }
  }

  function current(data, date) {
    const candidates = data.sheets.filter(sheet => sheet.date === date)
    const daily = candidates.find(sheet => sheet.mode === 'daily')
    const played = sheet => Object.values(data.marks[sheet.id] || {}).some(mark => mark.result !== 'unpracticed')
    if (daily && played(daily)) return daily
    return candidates.find(played) || daily || candidates[0]
  }

  function saveSheet(sheet) {
    S.store.set(SHEET + sheet.date + ':' + sheet.id, sheet)
  }

  function saveMark(sheet, item, value) {
    const key = MARK + sheet.id + ':' + item
    const record = { ...value, date: sheet.date }
    S.store.set(key, record)
    S.store.stampNow([key])
    return record
  }

  S.pinyinStorage = { read, current, saveSheet, saveMark, SETTINGS }
})(typeof window !== 'undefined' ? window : globalThis)
