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
    check('写字：认字的「字表」收起，有自己的「写哪套字」', not pg.is_visible('#sec-book') and pg.is_visible('#f-xiebook'))
    check('认字用某恩，写字照样能出练字纸', pg.query_selector('#preview .sheet') is not None and not pg.is_visible('#sec-xie-off'))
    pg.select_option('#f-xiebook', 'rj1b')
    time.sleep(0.5)
    s = shizi(pg)
    check('写字选一下：存下来，认字还是某恩', s.get('xieBook') == 'rj1b' and s.get('book') == 'hongen', s)
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
    pg.select_option('#f-book', 'rj1a')
    time.sleep(0.5)
    check('认字换统编一上：写字不跟着变', shizi(pg).get('xieBook') == 'rj1b')

    # 拼音目录：状态说该干什么
    pg.goto(BASE + '/pinyin?view=lessons')
    pg.wait_for_selector('.py-state', timeout=15000)
    body = pg.inner_text('body')
    check('拼音不再出现「待复核」「已稳固」', '待复核' not in body and '已稳固' not in body)
    check('拼音状态用「没练过 / 再练 / 该练了 / 已掌握」', any(w in body for w in ['没练过', '再练', '该练了', '已掌握']))
    check('全程没有脚本报错', not errs, errs)
    ctx.close()
    br.close()

print('')
print('%d / %d 通过' % (ok_n, ok_n + len(bad)))
sys.exit(1 if bad else 0)
