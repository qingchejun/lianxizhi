# 识字：认字和写字的字表分开选（2026-11-28）+ 拼音目录状态说人话
#   本地预览（:8999）在跑、账号 preview@local.test / preview123 存在时运行：
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-shizi-xie-browser.py
import json, sys, time
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:8999'
EMAIL, PASSWORD = 'preview@local.test', 'preview123'
ok_n = 0
bad = []


def check(name, cond, info=''):
    global ok_n
    if cond:
        ok_n += 1
        print('✓ ' + name)
    else:
        bad.append(name)
        print('✗ ' + name + ('  ' + str(info) if info != '' else ''))


def login(page):
    if not page.is_visible('form[data-view="login"]'):
        page.click('.sh-act a')
    page.fill('form[data-view="login"] input[name="email"]', EMAIL)
    page.fill('form[data-view="login"] input[name="password"]', PASSWORD)
    page.click('form[data-view="login"] [data-act="submit"]')


def shizi(page):
    raw = page.evaluate("localStorage.getItem('sumsum:shizi:v1')")
    return json.loads(raw) if raw else {}


with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []
    ctx = br.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: d.accept())
    pg.goto(BASE + '/')
    login(pg)
    pg.wait_for_url(BASE + '/', timeout=30000)
    time.sleep(1.5)

    old_prof = pg.evaluate("SumSum.store.get('sumsum:profile:v1')")
    # 2026-11-28 写字的课本照孩子档案：先设成一年级下学期
    pg.evaluate("SumSum.store.set('sumsum:profile:v1', { v: 1, cur: 0, kids: [{ grade: 1, term: 'b', math: 'rj' }] })")
    pg.goto(BASE + '/shizi')
    pg.wait_for_selector('[data-sumsum-ready]', timeout=15000)
    pg.evaluate("document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    check('识字页不再有认字 / 写字切换，只出认字', pg.query_selector('.pane-tab') is None and pg.is_visible('#sec-book') and not pg.is_visible('#sec-xie'))
    pg.select_option('#f-book', 'hongen')
    time.sleep(0.5)
    check('认字选某恩', shizi(pg).get('book') == 'hongen')
    # 2026-11-28 写字单独一页（/xiezi），旧网址 /shizi?pane=xie 301 过去
    pg.goto(BASE + '/shizi?pane=xie')
    pg.wait_for_selector('[data-sumsum-ready]', timeout=15000)
    pg.evaluate("document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    time.sleep(0.5)
    check('旧网址跳到写字页、侧栏「写字」亮着', pg.url.split('?')[0] == BASE + '/xiezi' and 'active' in (pg.get_attribute('.rail-link[data-module="写字"]', 'class') or ''), pg.url)
    check('写字：认字的「字表」收起，写哪套字照档案', not pg.is_visible('#sec-book') and pg.inner_text('#xie-book-name') == '统编版一年级下册写字表')
    check('认字用某恩，写字照样能出练字纸', pg.query_selector('#preview .sheet') is not None and not pg.is_visible('#sec-xie-off'))
    s = shizi(pg)
    check('写字是一下：存下来，认字还是某恩', s.get('xieBook') == 'rj1b' and s.get('book') == 'hongen', s)
    first = pg.inner_text('#xie-now')
    pg.click('#btn-xie-next')
    time.sleep(0.4)
    check('下一课在一下里走', pg.inner_text('#xie-now') != first and shizi(pg).get('xieBook') == 'rj1b', pg.inner_text('#xie-now'))
    check('写字页网址不带 pane', 'pane=' not in pg.url, pg.url)
    pg.click('.rail-link[data-module="识字"]')
    pg.wait_for_selector('[data-sumsum-ready]', timeout=15000)
    pg.evaluate("document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    time.sleep(0.4)
    check('回到认字：字表还在、还是某恩', pg.is_visible('#sec-book') and pg.input_value('#f-book') == 'hongen')
    pg.select_option('#f-book', 'rj1b')
    time.sleep(0.5)
    check('认字换回课本：只能选档案那一册（一下）、写字还是一下', shizi(pg).get('book') == 'rj1b' and shizi(pg).get('xieBook') == 'rj1b')
    check('字表里一上藏起来', pg.eval_on_selector('#f-book option[value="rj1a"]', 'o => o.hidden'))

    # 拼音目录：状态说该干什么
    pg.goto(BASE + '/pinyin?view=lessons')
    pg.wait_for_selector('.py-state', timeout=15000)
    body = pg.inner_text('body')
    check('拼音不再出现「待复核」「已稳固」', '待复核' not in body and '已稳固' not in body)
    check('拼音状态用「没练过 / 再练 / 该练了 / 已掌握」', any(w in body for w in ['没练过', '再练', '该练了', '已掌握']))
    pg.evaluate("(pf) => SumSum.store.set('sumsum:profile:v1', pf || { v: 1, cur: 0, kids: [] })", old_prof)
    time.sleep(1.5)
    check('全程没有脚本报错', not errs, errs)
    ctx.close()
    br.close()

print('')
print('%d / %d 通过' % (ok_n, ok_n + len(bad)))
sys.exit(1 if bad else 0)
