# 打印帮助与顶栏「附答案页」（2026-11-25）浏览器验收（没登录）：
#   1. 口算页顶栏有「附答案页」复选框（默认不勾）和「打印帮助」链接；
#   2. 勾顶栏的 → 预览多出答案页，右边「更多选项」里的同一项跟着勾上；反过来取消右边的，顶栏也取消；
#   3. 没登录打开使用说明（/help#print）→ 不被拦，能看到「另存为 PDF」；开头写了没登录也能用；
#   4. 首页页脚有「使用说明」「打印与存 PDF」；识字说明页没登录时按钮写「注册，开通时通知我」；
#   5. 没有脚本报错。
# 用法：先起本机预览（端口 8999），再 uv run --with playwright python tools/e2e-print-help-browser.py
import sys
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8999'
results = []


def check(name, ok, extra=''):
    results.append(ok)
    print(('✓ ' if ok else '✗ ') + name + ('' if ok or extra == '' else '  ' + str(extra)))


with sync_playwright() as p:
    br = p.chromium.launch()
    page = br.new_page(viewport={'width': 1440, 'height': 900})
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))

    page.goto(BASE + '/kousuan?carryMode=carryonly')
    page.wait_for_selector('#preview .sheet', timeout=15000)
    n0 = page.locator('#preview .sheet').count()
    check('顶栏有「附答案页」（默认不勾）和「打印帮助」', page.is_visible('#h-anspage') and not page.is_checked('#h-anspage')
          and page.get_attribute('.work-head .head-help', 'href') == '/help#print')
    page.check('#h-anspage')
    page.wait_for_timeout(500)
    n1 = page.locator('#preview .sheet').count()
    check('勾顶栏的 → 多出答案页，右边设置同一项也勾上', n1 == n0 + 1 and page.is_checked('#f-anspage'), [n0, n1])
    page.evaluate("const e = document.getElementById('f-anspage'); e.checked = false; e.dispatchEvent(new Event('change'))")
    page.wait_for_timeout(500)
    check('取消右边的 → 顶栏也取消、答案页没了', not page.is_checked('#h-anspage') and page.locator('#preview .sheet').count() == n0)

    resp = page.goto(BASE + '/help#print')
    page.wait_for_selector('#print', timeout=10000)
    check('没登录打开使用说明 → 不被拦', resp.status == 200 and '/help' in page.url and '?next=' not in page.url, page.url)
    check('打印设置里写了另存为 PDF', '另存为 PDF' in page.inner_text('#print'))
    check('开头写了没登录也能用', '没登录也能用' in page.inner_text('#start'))

    page.goto(BASE + '/')
    foot = page.eval_on_selector_all('.sf a', 'els => els.map(e => e.getAttribute("href"))')
    check('首页页脚有使用说明、打印与存 PDF', '/help' in foot and '/help#print' in foot, foot)
    check('「错哪练哪」写明登录后打印的纸才有二维码', '登录后打印的练习纸' in page.inner_text('section[aria-labelledby=wl-loop]'))

    page.goto(BASE + '/shizi')
    page.wait_for_selector('[data-want]')
    check('识字说明页没登录：按钮写「注册，开通时通知我」', page.inner_text('[data-want]') == '注册，开通时通知我', page.inner_text('[data-want]'))
    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
