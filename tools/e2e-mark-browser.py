# 扫码打分浏览器全流程（2026-11-27 改版：全对 / 点错题 → 提交，按板块分开，游戏不打分）。
# 电脑：口算 / 奥数 / 识字 / 拼音各出一张并「打印」（触发 beforeprint 记下纸）；火柴页不再有二维码 →
# 手机（新浏览器、没登录）：扫口算 → 跳登录 → 回到这张纸 → 只列口算、不混别的板块 →
# 提交按钮没选时是灰的 → 全对提交 → 改一下点 2 道错题提交 → 奥数点错题后刷新草稿还在、全对提交 →
# 识字点 1 个字提交 → 拼音点 1 题提交 → 历史里能展开改分 → 回电脑：口算下一张含错题、拼音页显示已打分。
# 用法：先起本机预览（npx wrangler pages dev . --port 8999 --binding SESSION_SECRET=dev-secret --binding DEV_SHOW_CODE=1），
#   账号 preview@local.test / preview123 要先存在，再
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-mark-browser.py
import json, time
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


with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []
    desk = br.new_context(viewport={'width': 1440, 'height': 900})
    d = desk.new_page()
    d.on('pageerror', lambda e: errs.append('电脑 ' + str(e)))
    d.goto(BASE + '/')
    login(d)
    d.wait_for_url(BASE + '/', timeout=30000)
    time.sleep(1.5)
    ids = {}
    for m, url in [('kousuan', '/kousuan'), ('shizi', '/shizi'), ('aoshu', '/aoshu?review=0'), ('pinyin', '/pinyin')]:
        d.goto(BASE + url)
        time.sleep(2.5)
        if d.query_selector('#btn-regen'):  # 换一批：重复跑本脚本时不撞上次已打过分的同一张纸
            d.click('#btn-regen')
            time.sleep(1.5)
        check(m + ' 纸上有二维码', d.evaluate("document.querySelectorAll('#preview .sheet-qr svg').length") == 1)
        check(m + ' 顶栏有「打分」按钮', d.query_selector('#btn-mark') is not None)
        d.evaluate("window.dispatchEvent(new Event('beforeprint'))")
        ids[m] = d.evaluate('SumSum.sheets.current().id')
        check(m + ' 打印时记下了纸', get(d, 'sumsum:sheet:v1:' + ids[m]) is not None)
    prec = get(d, 'sumsum:sheet:v1:' + ids['pinyin'])
    check('拼音纸记录带上了分组和题目', prec and len(prec['items']) > 0 and len(prec['units']) > 0 and prec['ref'].get('date'), prec and prec.get('ref'))
    d.goto(BASE + '/huochai')
    time.sleep(2)
    check('火柴（游戏）不再印二维码、没有打分按钮',
          d.evaluate("document.querySelectorAll('#preview .sheet-qr').length") == 0 and d.query_selector('#btn-mark') is None)
    time.sleep(3.5)  # 推上云

    mob = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    m = mob.new_page()
    m.on('pageerror', lambda e: errs.append('手机 ' + str(e)))
    m.goto(BASE + '/mark?id=' + ids['kousuan'])
    check('没登录扫码 → 先去登录', '/?next=' in m.url, m.url)
    login(m)
    m.wait_for_url('**/mark?id=*', timeout=30000)
    m.wait_for_selector('[data-card="%s"]' % ids['kousuan'], timeout=15000)
    check('登录后回到这张纸', ids['kousuan'] in m.url)
    check('只列口算，不混别的板块', m.query_selector('[data-card="%s"]' % ids['aoshu']) is None)
    check('下面有其他板块的入口', m.query_selector('a.omod[href="/mark?module=aoshu"]') is not None)

    card = '[data-card="%s"] ' % ids['kousuan']
    check('什么都没选时「提交」是灰的', m.is_disabled(card + '[data-rate-submit]'))
    check('没有「会了 / 一般 / 不会」', '一般' not in m.inner_text(card))
    m.click(card + '[data-rate-all]')
    m.click(card + '[data-rate-submit]')
    rec = get(m, 'sumsum:sheet:v1:' + ids['kousuan'])
    check('全对提交', rec and rec['rating']['all']['level'] == 'good' and rec['wrong'] == [], rec and rec.get('rating'))
    check('卡片显示已打分：全对', '已打分：全对' in m.inner_text(card))
    m.click(card + '[data-rate-edit]')
    items = m.query_selector_all(card + '[data-rate-item]')
    wrong_keys = [items[0].get_attribute('data-rate-item'), items[1].get_attribute('data-rate-item')]
    m.click(card + '[data-rate-item="%s"]' % wrong_keys[0])
    m.click(card + '[data-rate-item="%s"]' % wrong_keys[1])
    check('点了错题，「全对」自动取消', m.get_attribute(card + '[data-rate-all]', 'aria-pressed') == 'false')
    m.click(card + '[data-rate-submit]')
    rec = get(m, 'sumsum:sheet:v1:' + ids['kousuan'])
    check('改成错 2 题', rec and sorted(rec['wrong']) == sorted(wrong_keys) and rec['rating']['all']['level'] == 'ok', rec and rec.get('wrong'))
    check('卡片说明下一张怎么变', '再出这 2 道错题' in m.inner_text(card + '.effect'))

    # 奥数：点错题 → 刷新草稿还在 → 改成全对提交
    m.goto(BASE + '/mark?module=aoshu')
    ao = '[data-card="%s"] ' % ids['aoshu']
    m.wait_for_selector(ao, timeout=15000)
    first = m.query_selector(ao + '[data-rate-item]').get_attribute('data-rate-item')
    m.click(ao + '[data-rate-item="%s"]' % first)
    m.reload()
    m.wait_for_selector(ao, timeout=15000)
    check('点了一半刷新，草稿还在', m.get_attribute(ao + '[data-rate-item="%s"]' % first, 'aria-pressed') == 'true')
    m.click(ao + '[data-rate-all]')
    check('选「全对」清掉点过的错题', m.get_attribute(ao + '[data-rate-item="%s"]' % first, 'aria-pressed') == 'false')
    m.click(ao + '[data-rate-submit]')
    arec = get(m, 'sumsum:sheet:v1:' + ids['aoshu'])
    tid = arec['units'][0]['key']
    check('奥数全对 → 记为学会', tid in (get(m, 'sumsum:aoshu:learned:v1') or []))

    # 识字：点 1 个字提交
    m.goto(BASE + '/mark?module=shizi')
    sz = '[data-card="%s"] ' % ids['shizi']
    m.wait_for_selector('#mark-page .mcard, #mark-page .mark-all', timeout=15000)
    if m.query_selector(sz + '[data-rate-item]'):
        ch = m.query_selector(sz + '[data-rate-item]').get_attribute('data-rate-item')
        m.click(sz + '[data-rate-item="%s"]' % ch)
        m.click(sz + '[data-rate-submit]')
        marks = get(m, 'sumsum:shizi:wrong:v3') or {}
        check('识字提交后错字进错字集', ch in json.dumps(marks, ensure_ascii=False), ch)
        check('识字卡片显示已打分', '已打分' in m.inner_text(sz))
    else:
        print('（本地测试账号今天的识字卷前面已经打过分，跳过识字这步）')

    # 拼音：点 1 题提交 → pinyin:mark 写上
    m.goto(BASE + '/mark?module=pinyin')
    py = '[data-card="%s"] ' % ids['pinyin']
    m.wait_for_selector(py + ', [data-open="%s"]' % ids['pinyin'], timeout=15000)
    if not m.query_selector(py):  # 重复跑：今天的拼音卷上次已打过分，在历史里展开再改
        m.click('[data-open="%s"]' % ids['pinyin'])
        m.click(py + '[data-rate-edit]')
        if m.get_attribute(py + '[data-rate-all]', 'aria-pressed') == 'false':
            for b in m.query_selector_all(py + '[data-rate-item][aria-pressed="true"]'):
                b.click()
    if m.query_selector(py + '[data-rate-item]'):
        it = m.query_selector(py + '[data-rate-item]').get_attribute('data-rate-item')
        m.click(py + '[data-rate-item="%s"]' % it)
        m.click(py + '[data-rate-submit]')
        mk = get(m, 'sumsum:pinyin:mark:v1:%s:%s' % (prec['ref']['sheetId'], it))
        check('拼音点的题记 miss', mk and mk['result'] == 'miss', mk)
        check('拼音卡片显示已打分', '已打分：错 1 题' in m.inner_text(py))
    else:
        check('拼音卡片有题目格子', False, m.inner_text(py))
    m.screenshot(path='/tmp/e2e-mark-phone.png', full_page=True)

    # 历史：口算打过分的纸在历史里，能展开
    m.goto(BASE + '/mark?module=kousuan')
    m.wait_for_selector('#mark-page .hist, #mark-page .mark-all', timeout=15000)
    row = m.query_selector('[data-open="%s"]' % ids['kousuan'])
    check('打过分的纸进历史', row is not None and '错 2 题' in row.inner_text())
    if row:
        row.click()
        check('历史展开成卡片，可改', m.query_selector('[data-card="%s"] [data-rate-edit]' % ids['kousuan']) is not None)

    # 找不到的纸号
    m.goto(BASE + '/mark?id=zzzzzz')
    m.wait_for_selector('.mcard-empty', timeout=15000)
    check('还没传上来的纸号：提示在等电脑上传', '还在上传' in m.inner_text('.mcard-empty'))
    m.goto(BASE + '/mark?id=../x')
    m.wait_for_selector('.mcard-empty', timeout=15000)
    check('乱码纸号给提示', '看不懂' in m.inner_text('.mcard-empty'))

    time.sleep(3.5)  # 手机的打分推上云
    d.goto(BASE + '/kousuan')
    time.sleep(3)
    d.goto(BASE + '/kousuan')  # 同步拉下来会自动刷新一次，再进一次确保读到
    time.sleep(2.5)
    text = d.inner_text('#preview')
    norm = lambda s: s.replace(' ', '')
    check('电脑上口算下一张含刚才的错题', all(norm(k) in norm(text) for k in wrong_keys), wrong_keys)
    d.goto(BASE + '/pinyin?sheet=' + prec['ref']['sheetId'])
    time.sleep(2.5)
    check('拼音页显示已打分', '已打分' in d.inner_text('#pinyin-view'), d.inner_text('#pinyin-view')[:200])

    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
raise SystemExit(0 if all(results) else 1)
