"""Baked first sheet (tools/bake-preview.py) and heading levels.

  uv run --with playwright python tools/e2e-baked-browser.py [base_url]
"""
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8999'
ok = 0
fails = []


def check(name, cond, detail=''):
    global ok
    if cond:
        ok += 1
    else:
        fails.append(name + ('：' + str(detail) if detail else ''))


with sync_playwright() as p:
    browser = p.chromium.launch()

    # 1. no JS: the page source already carries a full sheet
    ctx = browser.new_context(java_script_enabled=False)
    page = ctx.new_page()
    page.goto(BASE + '/kousuan')
    text = page.inner_text('#preview')
    check('关掉脚本 /kousuan 能读到 20 道算式', page.locator('#preview .q').count() == 20, page.locator('#preview .q').count())
    check('关掉脚本 /kousuan 有纸标题', '20以内加减法练习' in text, text[:60])
    check('关掉脚本 /kousuan 算式带等号', text.count('=') >= 20)
    page.goto(BASE + '/shudu')
    check('关掉脚本 /shudu 有数独纸', page.locator('#preview .sheet').count() >= 1)
    ctx.close()

    # 2. with JS: baked sheet is replaced, not duplicated, date filled in
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    for path in ['/kousuan', '/shudu']:
        page.goto(BASE + path, wait_until='networkidle')
        html = page.inner_html('#preview')
        check(path + ' 脚本出题后预烤的标记不在了', 'bake:preview' not in html)
        check(path + ' 日期由脚本填上', page.locator('#preview .meta-date').first.inner_text().strip() != '')
    page.goto(BASE + '/kousuan', wait_until='networkidle')
    n1 = page.locator('#preview .sheet').count()
    page.goto(BASE + '/kousuan?carryMode=carryonly', wait_until='networkidle')
    check('换设置后纸张照常', page.locator('#preview .sheet').count() >= 1 and n1 >= 1)

    # 3. heading levels: settings labels and sheet titles are not h2
    for path in ['/kousuan', '/shudu', '/aoshu', '/kousuan/coushifa', '/huochai']:
        page.goto(BASE + path, wait_until='networkidle')
        check(path + ' 设置标签不是 h2', page.locator('h2.group-title, h2.sheet-title').count() == 0)
        check(path + ' 只有一个 h1', page.locator('h1').count() == 1, page.locator('h1').count())
    check('没有脚本报错', not errors, errors[:2])
    browser.close()

total = ok + len(fails)
for f in fails:
    print('✗', f)
print(f'{ok} / {total} 通过')
sys.exit(1 if fails else 0)
