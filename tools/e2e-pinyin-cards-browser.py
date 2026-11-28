# 拼音知识点闪卡（2026-11-28）：会员账号走一遍「闪卡」页签
#   本地预览（:8999）在跑、账号 preview@local.test / preview123 存在（会员）时运行：
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-pinyin-cards-browser.py
# 免费版只能印第 1、2 课：在 tools/e2e-free-browser.py 里测。
import sys, time
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


def cells(page):
    return page.eval_on_selector_all('#preview .pfc-cell[data-card]', 'els => els.map(e => e.dataset.card)')


with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []
    ctx = br.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/')
    login(pg)
    pg.wait_for_url(BASE + '/', timeout=30000)
    time.sleep(1.5)

    # 2026-11-28 拼音闪卡搬到语文知识点（/yuwen/zhishi），旧网址 301 过去
    pg.goto(BASE + '/pinyin')
    pg.wait_for_selector('#py-tabs', timeout=15000)
    check('拼音页不再有闪卡页签', pg.query_selector('#py-tabs [data-tab="cards"]') is None)
    pg.goto(BASE + '/pinyin?view=cards&k=6&size=m')
    pg.wait_for_selector('#preview .pfc-page', timeout=15000)
    check('旧网址跳到语文知识点、参数照带', pg.url.startswith(BASE + '/yuwen/zhishi?') and 'k=6' in pg.url, pg.url)
    check('侧栏「语文 → 知识点」亮着、没有拼音页签', 'active' in (pg.get_attribute('.rail-link[data-module="语文知识点"]', 'class') or '') and pg.query_selector('#py-tabs') is None)
    check('标题是语文知识点、右栏写「拼音闪卡」', '语文知识点' in pg.inner_text('h1') and '拼音闪卡' in pg.inner_text('#panel'))
    ids = cells(pg)
    check('第 6 课：一页 6 张，本课 3 张在前', len(ids) == 6 and all(i.startswith('k06') for i in ids[:3]), ids)
    check('右栏列出这一页的卡、标了「本课」', pg.locator('.pfc-list li').count() == 6 and '本课' in pg.inner_text('.pfc-list'))
    check('打印按钮可用、写「打印闪卡」', not pg.is_disabled('#btn-print') and '打印闪卡' in pg.inner_text('#btn-print'))
    check('一页没有溢出', pg.evaluate("Array.from(document.querySelectorAll('.pfc-face')).every(f => f.scrollHeight <= f.clientHeight + 1)"))
    pg.select_option('#pfc-k', 'all')
    time.sleep(0.4)
    check('全套：38 张 7 页', len(cells(pg)) == 38 and pg.locator('#preview .pfc-page').count() == 7)
    check('网址记下 k=all、还在语文知识点', 'k=all' in pg.url and '/yuwen/zhishi?' in pg.url, pg.url)
    pg.click('[data-pfc-size="l"]')
    time.sleep(0.4)
    check('大卡：一页 4 张 → 10 页', pg.locator('#preview .pfc-page').count() == 10 and pg.locator('#preview .pfc-page.is-l').count() == 10)
    check('大卡也不溢出', pg.evaluate("Array.from(document.querySelectorAll('.pfc-face')).every(f => f.scrollHeight <= f.clientHeight + 1 && f.scrollWidth <= f.clientWidth + 1)"))
    pg.goto(BASE + '/yuwen/zhishi')
    pg.wait_for_selector('#preview .pfc-page', timeout=15000)
    check('大小记住了', pg.locator('#preview .pfc-page.is-l').count() >= 1)
    pg.emulate_media(media='print')
    check('打印时背面正着印、在正面右边', pg.evaluate("(() => { const c = document.querySelector('.pfc-cell'), f = c.querySelector('.pfc-front').getBoundingClientRect(), b = c.querySelector('.pfc-back').getBoundingClientRect(); return getComputedStyle(c.querySelector('.pfc-back')).transform === 'none' && Math.abs(f.top - b.top) < 1 && b.left > f.left })()"))
    check('打印时右栏不上纸', not pg.is_visible('#panel') if pg.query_selector('#panel') else True)
    pg.emulate_media(media='screen')
    # 还原偏好，别影响下次
    pg.click('[data-pfc-size="m"]')
    check('全程没有脚本报错', not errs, errs)
    ctx.close()
    br.close()

print('')
print('%d / %d 通过' % (ok_n, ok_n + len(bad)))
sys.exit(1 if bad else 0)
