# 扫码登记浏览器全流程（2026-11-23）。
# 电脑：口算 / 火柴 / 识字 / 奥数各出一张并「打印」（触发 beforeprint 记下纸）→
# 手机（新浏览器、没登录）：打开纸角二维码地址 → 跳登录 → 登录后回到这张纸 →
# 口算展开点 2 道错题（自动定档）、火柴点「太简单」、识字点 1 个没认出的字并登记、奥数点「一般」→
# 断言存储（火柴升关、奥数已学与待复习、识字错字、口算记录）→ 改档不叠加 →
# 回电脑：口算下一张含刚才的错题；找不到的纸号给提示不报错。
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
    # 起点固定：火柴第 1 关
    d.evaluate("SumSum.store.set('sumsum:huochai:v1', Object.assign({}, JSON.parse(localStorage.getItem('sumsum:huochai:v1') || '{}'), { level: 'L1' }))")
    ids = {}
    for m, url in [('kousuan', '/kousuan'), ('huochai', '/huochai'), ('shizi', '/shizi'), ('aoshu', '/aoshu?review=0')]:
        d.goto(BASE + url)
        time.sleep(2.5)
        if d.query_selector('#btn-regen'):  # 换一批：重复跑本脚本时不撞上次已登记的同一张纸
            d.click('#btn-regen')
            time.sleep(1.5)
        check(m + ' 页眉有二维码', d.evaluate("document.querySelectorAll('#preview .sheet-qr svg').length") == 1)
        d.evaluate("window.dispatchEvent(new Event('beforeprint'))")
        ids[m] = d.evaluate('SumSum.sheets.current().id')
        check(m + ' 打印时记下了纸', get(d, 'sumsum:sheet:v1:' + ids[m]) is not None)
    time.sleep(3.5)  # 同步防抖 2 秒后推上云

    mob = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    m = mob.new_page()
    m.on('pageerror', lambda e: errs.append('手机 ' + str(e)))
    m.goto(BASE + '/mark?id=' + ids['kousuan'])
    check('没登录扫码 → 先去登录', '/?next=' in m.url, m.url)
    login(m)
    m.wait_for_url('**/mark?id=*', timeout=30000)
    m.wait_for_selector('[data-card="%s"]' % ids['kousuan'], timeout=15000)
    check('登录后回到这张纸', ids['kousuan'] in m.url)
    for k in ('huochai', 'shizi', 'aoshu'):
        check('今天还没登记的列表里有 ' + k, m.query_selector('[data-card="%s"]' % ids[k]) is not None)

    # 口算：展开点 2 道错题 → 自动定档
    card = '[data-card="%s"] ' % ids['kousuan']
    m.click(card + '[data-expand]')
    items = m.query_selector_all(card + '[data-item]')
    wrong_keys = [items[0].get_attribute('data-item'), items[1].get_attribute('data-item')]
    m.click(card + '[data-item="%s"]' % wrong_keys[0])
    m.click(card + '[data-item="%s"]' % wrong_keys[1])
    rec = get(m, 'sumsum:sheet:v1:' + ids['kousuan'])
    check('口算点错题后自动定档为「一般」', rec and rec['rating']['all']['level'] == 'ok' and rec['rating']['all']['auto'], rec and rec.get('rating'))
    check('口算记下错题', rec and sorted(rec['wrong']) == sorted(wrong_keys), rec and rec.get('wrong'))
    check('口算卡片说明下一张怎么变', '再出这 2 道错题' in m.inner_text(card + '.effect'))

    # 火柴：太简单 → 升关；改成太难 → 回到 L1 不叠加（L1 已到底不再降）
    hc = '[data-card="%s"] ' % ids['huochai']
    m.click(hc + '[data-lv="good"]')
    check('火柴太简单 → 第 2 关', get(m, 'sumsum:huochai:v1')['level'] == 'L2', get(m, 'sumsum:huochai:v1'))
    m.click(hc + '[data-lv="bad"]')
    check('改成太难：撤回升关，不从第 2 关往下降', get(m, 'sumsum:huochai:v1')['level'] == 'L1', get(m, 'sumsum:huochai:v1'))
    m.click(hc + '[data-lv="good"]')

    # 奥数：一般 → 标已学 + 待复习
    ao = '[data-card="%s"] ' % ids['aoshu']
    m.click(ao + '[data-lv="ok"]')
    arec = get(m, 'sumsum:sheet:v1:' + ids['aoshu'])
    tid = arec['units'][0]['key']
    check('奥数一般 → 标已学', tid in (get(m, 'sumsum:aoshu:learned:v1') or []))
    check('奥数一般 → 进待复习', tid in (get(m, 'sumsum:aoshu:review-due:v1') or []))

    # 识字：点 1 个字、登记
    sz = '[data-card="%s"] ' % ids['shizi']
    if m.query_selector(sz + '[data-ch]'):
        ch = m.query_selector(sz + '[data-ch]').get_attribute('data-ch')
        m.click(sz + '[data-ch="%s"]' % ch)
        m.click(sz + '[data-settle]')
        marks = get(m, 'sumsum:shizi:wrong:v3') or {}
        check('识字登记后错字进错字集', ch in json.dumps(marks, ensure_ascii=False), ch)
        check('识字卡片显示已打分', '已打分' in m.inner_text(sz + '.mcard-date'))
    else:
        print('（本地测试账号今天的识字卷前面已经用掉，跳过识字这步）')
    m.screenshot(path='/tmp/e2e-mark-phone.png', full_page=True)

    # 找不到的纸号
    m.goto(BASE + '/mark?id=zzzzzz')
    m.wait_for_selector('.mcard-empty', timeout=15000)
    check('还没传上来的纸号：提示在等电脑上传', '还在上传' in m.inner_text('.mcard-empty'))
    m.goto(BASE + '/mark?id=../x')
    m.wait_for_selector('.mcard-empty', timeout=15000)
    check('乱码纸号给提示', '看不懂' in m.inner_text('.mcard-empty'))

    time.sleep(3.5)  # 手机的打分推上云
    # 回电脑：刷新拉到打分，口算下一张含错题
    d.goto(BASE + '/kousuan')
    time.sleep(3)
    d.goto(BASE + '/kousuan')  # 同步拉下来会自动刷新一次，再进一次确保读到
    time.sleep(2.5)
    text = d.inner_text('#preview')
    norm = lambda s: s.replace(' ', '')
    check('电脑上口算下一张含刚才的错题', all(norm(k) in norm(text) for k in wrong_keys), wrong_keys)
    check('火柴设置同步到电脑（第 2 关）', (get(d, 'sumsum:huochai:v1') or {}).get('level') == 'L2', get(d, 'sumsum:huochai:v1'))

    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
raise SystemExit(0 if all(results) else 1)
