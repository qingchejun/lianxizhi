# 打分抽屉（2026-11-27 打分统一）浏览器验收：练习页顶栏只有一个「打分」入口，点开右侧抽屉，和手机扫码打分页同一个组件。
#   1. 拼音：右栏不再有打分卡；抽屉里「屏幕上这张」没打印也能打；全对 → 独立组 ok、选做组没做；改一下点一题 → miss；右栏跟着显示结果；
#   2. 识字：右栏没有「全对 / 提交 / 撤销 / 作废 / ◀▶」；抽屉里点一个字提交 → 页面自动换成下一张；
#      刚打的那张能「改一下」；顶栏「换一张」能换掉还没打分的卷；
#   3. 口算：打印后按钮角标 +1，抽屉里全对提交后角标 -1；
#   4. 手机（另一个浏览器）打开 /mark?module=kousuan，看到电脑上刚打的分。
# 用法：本机预览跑着（npx wrangler pages dev . --port 8999 --binding SESSION_SECRET=dev-secret --binding DEV_SHOW_CODE=1），
#   账号 preview@local.test / preview123 要先存在，再
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-rate-drawer-browser.py
import json, sys, time
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8999'
EMAIL, PASSWORD = 'preview@local.test', 'preview123'
results = []


def check(name, ok, extra=''):
    results.append(bool(ok))
    print(('✓ ' if ok else '✗ ') + name + ((' → ' + str(extra)) if not ok else ''))


def login(page):
    if not page.is_visible('form[data-view="login"]'):
        page.click('.sh-act a')
    page.fill('form[data-view="login"] input[name="email"]', EMAIL)
    page.fill('form[data-view="login"] input[name="password"]', PASSWORD)
    page.click('form[data-view="login"] [data-act="submit"]')


def get(page, key):
    raw = page.evaluate('k => localStorage.getItem(k)', key)
    return json.loads(raw) if raw else None


def close_dialogs(page):
    page.evaluate("document.querySelectorAll('dialog[open]').forEach(d => d.close())")


def open_drawer(page):
    page.click('#btn-mark')
    page.wait_for_selector('.rdrawer-wrap:not([hidden]) .rdrawer', timeout=5000)


def close_drawer(page):
    page.click('.rdrawer-x')
    page.wait_for_selector('.rdrawer-wrap[hidden]', state='attached', timeout=5000)


def badge(page):
    el = page.query_selector('#btn-mark .btn-n')
    return int(el.inner_text()) if el else 0


def py_marks(page, sheet_id):
    return page.evaluate("""id => {
      const out = {}, pre = 'sumsum:pinyin:mark:v1:' + id + ':'
      for (const k of Object.keys(localStorage)) if (k.startsWith(pre)) out[k.slice(pre.length)] = JSON.parse(localStorage.getItem(k)).result
      return out
    }""", sheet_id)


with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []
    desk = br.new_context(viewport={'width': 1440, 'height': 900})
    d = desk.new_page()
    d.on('pageerror', lambda e: errs.append('电脑 ' + str(e)))
    d.on('dialog', lambda dlg: dlg.accept())
    d.goto(BASE + '/')
    login(d)
    d.wait_for_url(BASE + '/', timeout=30000)
    time.sleep(1.5)

    # ---------- 拼音 ----------
    d.goto(BASE + '/pinyin')
    d.wait_for_selector('#py-rate', timeout=15000)
    close_dialogs(d)
    check('拼音右栏不再有打分卡', d.query_selector('#pinyin-view [data-rate-submit]') is None)
    cur = d.evaluate('SumSum.sheets.current()')
    sheet_id = cur['info']['ref']['sheetId']
    open_drawer(d)
    main = '.rdrawer [data-card="%s"] ' % cur['id']
    d.wait_for_selector(main, timeout=5000)
    check('抽屉标题是拼音', '拼音' in d.inner_text('#rdrawer-title'), d.inner_text('#rdrawer-title'))
    check('抽屉里有屏幕上这张（没打印也能打）', d.query_selector(main) is not None)
    if d.query_selector(main + '[data-rate-edit]'):
        d.click(main + '[data-rate-edit]')
        if d.get_attribute(main + '[data-rate-all]', 'aria-pressed') == 'true':
            d.click(main + '[data-rate-all]')
        for b in d.query_selector_all(main + '[data-rate-item][aria-pressed="true"]'):
            b.click()
    check('没选时「提交」是灰的', d.is_disabled(main + '[data-rate-submit]'))
    units = d.evaluate("s => [...document.querySelectorAll(s + '.rate-unit')].map(e => e.textContent)", main)
    d.click(main + '[data-rate-all]')
    d.click(main + '[data-rate-submit]')
    mk = py_marks(d, sheet_id)
    check('全对 → 有题记 ok、没有 miss', 'ok' in mk.values() and 'miss' not in mk.values(), mk)
    if any(('试一试' in u or '换题再试' in u) for u in units):
        check('全对 → 选做组记没做', 'unpracticed' in mk.values(), mk)
    check('提交后纸记录存下来了', get(d, 'sumsum:sheet:v1:' + cur['id']) is not None)
    check('右栏显示「已打分：全对」', '已打分：全对' in d.inner_text('#py-rate'), d.inner_text('#py-rate'))
    d.click(main + '[data-rate-edit]')
    first = d.query_selector(main + '[data-rate-item]').get_attribute('data-rate-item')
    d.click(main + '[data-rate-item="%s"]' % first)
    d.click(main + '[data-rate-submit]')
    mk = py_marks(d, sheet_id)
    check('改一下：点的那题记 miss', mk.get(first) == 'miss', mk)
    check('右栏显示「卡住 1 题」', '卡住 1 题' in d.inner_text('#py-rate'), d.inner_text('#py-rate'))
    d.screenshot(path='/tmp/e2e-drawer-pinyin.png')
    close_drawer(d)

    # ---------- 识字 ----------
    d.goto(BASE + '/shizi')
    d.wait_for_selector('#preview .sheet', timeout=15000)
    close_dialogs(d)
    gone = all(d.query_selector(s) is None for s in ['#btn-daily-allok', '#btn-daily-settle', '#btn-daily-undo', '#btn-daily-drop', '#btn-paper-prev', '#settle'])
    check('识字右栏没有旧的全对 / 提交 / 撤销 / 作废 / 翻页 / 结算区', gone)
    check('识字页没有「登记」两个字', '登记' not in d.inner_text('body'))
    paper = d.evaluate('(() => { const n = SumSum.shiziMark.paperCount(); return SumSum.shiziMark.paperAt(n - 1) })()')
    today = d.evaluate('SumSum.shiziMark.today()')
    if not paper['settled'] and paper['d'] > today:
        # 上次跑完留下的是明天的预出卷：把识字的「今天」拨到那天（shiziMark 的测试钩子），再让页面重画
        d.evaluate("dd => { SumSum.shiziMark.setToday(() => dd); window.dispatchEvent(new CustomEvent('sumsum:rated', { detail: { module: 'shizi' } })) }", paper['d'])
        today = paper['d']
        time.sleep(0.5)
    if not paper['settled'] and paper['d'] <= today:
        cur = d.evaluate('SumSum.sheets.current()')
        open_drawer(d)
        main = '.rdrawer [data-card="%s"] ' % cur['id']
        d.wait_for_selector(main + '[data-rate-item]', timeout=5000)
        ch = d.query_selector(main + '[data-rate-item]').get_attribute('data-rate-item')
        d.click(main + '[data-rate-item="%s"]' % ch)
        d.click(main + '[data-rate-submit]')
        time.sleep(0.5)
        after = d.evaluate('(() => { const n = SumSum.shiziMark.paperCount(); return SumSum.shiziMark.paperAt(n - 1) })()')
        check('识字提交后页面换成下一张', after['chars'] != paper['chars'] and not after['settled'], [paper, after])
        rec = get(d, 'sumsum:sheet:v1:' + cur['id'])
        check('识字纸记录记下了没认出的字', rec and rec.get('done') and rec.get('wrong') == [ch], rec)
        card = '.rdrawer [data-card="%s"] ' % cur['id']
        check('刚打的那张留在抽屉里、能「改一下」', d.query_selector(card + '[data-rate-edit]') is not None, d.inner_text('.rdrawer-panel')[:300])
        if d.query_selector(card + '[data-rate-edit]'):
            d.click(card + '[data-rate-edit]')
            d.click(card + '[data-rate-item="%s"]' % ch)  # 取消那个字
            d.click(card + '[data-rate-all]')
            d.click(card + '[data-rate-submit]')
            rec = get(d, 'sumsum:sheet:v1:' + cur['id'])
            check('识字改一下成全对', rec and rec.get('wrong') == [], rec)
            n = d.evaluate('SumSum.shiziMark.paperCount()')
            check('改完只有一张新卷（撤回的那笔不留下多余的卷）', d.evaluate('SumSum.shiziMark.paperAt(%d).settled' % (n - 2)) is True)
        d.screenshot(path='/tmp/e2e-drawer-shizi.png')
        close_drawer(d)
    seq = d.evaluate("(() => { const s = SumSum.shiziSettings.load(); return s.book !== SumSum.shizi.HONGEN && s.order === 'seq' })()")
    if seq:
        check('按课本顺序出卷时不给「换一张」（重出还是同样的字）', not d.is_visible('#btn-swap'))
        d.evaluate("v => { const e = document.getElementById('f-order'); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })) }", 'rand')
        time.sleep(0.8)
    before = d.evaluate('(() => { const n = SumSum.shiziMark.paperCount(); return SumSum.shiziMark.paperAt(n - 1).chars })()')
    if d.is_visible('#btn-swap'):
        d.click('#btn-swap')
        time.sleep(0.5)
        now = d.evaluate('(() => { const n = SumSum.shiziMark.paperCount(); return SumSum.shiziMark.paperAt(n - 1).chars })()')
        check('「换一张」换掉了没打分的卷', now != before, [before, now])
    else:
        check('随机出卷时还没打分的卷有「换一张」', False)
    if seq:
        d.evaluate("v => { const e = document.getElementById('f-order'); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })) }", 'seq')
        time.sleep(0.5)

    # ---------- 口算：角标 ----------
    d.goto(BASE + '/kousuan')
    time.sleep(2.5)
    d.click('#btn-regen')
    time.sleep(1)
    n0 = badge(d)
    d.evaluate("window.dispatchEvent(new Event('beforeprint'))")
    kid = d.evaluate('SumSum.sheets.current().id')
    time.sleep(0.6)
    n1 = badge(d)
    check('打印后角标 +1', n1 == n0 + 1, [n0, n1])
    open_drawer(d)
    main = '.rdrawer [data-card="%s"] ' % kid
    check('抽屉最上面是屏幕上这张', d.query_selector('.rdrawer-panel > .mcard-main[data-card="%s"]' % kid) is not None)
    d.click(main + '[data-rate-all]')
    d.click(main + '[data-rate-submit]')
    time.sleep(0.6)
    check('全对提交后角标 -1', badge(d) == n0, [n0, badge(d)])
    check('卡片显示已打分', '已打分：全对' in d.inner_text(main))
    d.keyboard.press('Escape')
    check('按 Esc 关上抽屉', d.evaluate("document.querySelector('.rdrawer-wrap').hidden"))
    time.sleep(3.5)  # 推上云

    # ---------- 手机看到电脑打的分 ----------
    mob = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    m = mob.new_page()
    m.on('pageerror', lambda e: errs.append('手机 ' + str(e)))
    m.goto(BASE + '/mark?module=kousuan')
    login(m)
    m.wait_for_url('**/mark?module=kousuan', timeout=30000)
    m.wait_for_selector('#mark-page .hist, #mark-page .mcard', timeout=15000)
    row = m.query_selector('[data-open="%s"]' % kid)
    check('手机上看到电脑抽屉里打的分', row is not None and '全对' in row.inner_text(), m.inner_text('#mark-page')[:300])

    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
