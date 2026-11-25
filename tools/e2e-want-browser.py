# 完整版说明页「开通时通知我」（2026-11-25）浏览器验收：
#   没登录的人在识字说明页点「开通时通知我」→ 弹出注册框 → 在框里注册、填验证码 →
#   页面不刷新，按钮自动变成「已登记」，写明发到哪个邮箱；刷新后仍是已登记；没有脚本报错。
# 用法：先起本机预览（npx wrangler pages dev . --port 8999 --binding SESSION_SECRET=dev-secret --binding DEV_SHOW_CODE=1），
#   本机 D1 已跑过 tools/migrate-20261125-wants.sql，再 uv run --with playwright python tools/e2e-want-browser.py
import json, subprocess, sys, time
from playwright.sync_api import sync_playwright

subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'lianxizhi', '--local', '--command',
                "DELETE FROM limits WHERE scope LIKE 'ip%' OR scope = 'all'"], capture_output=True)

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
    codes = []
    page.on('response', lambda r: codes.append(r) if r.url.endswith('/api/auth/register') else None)

    page.goto(BASE + '/shizi')
    page.wait_for_selector('[data-want]', timeout=10000)
    check('没登录：说明页有「开通时通知我」和登录按钮，没有填码框', page.is_visible('[data-want]') and page.is_visible('[data-lk-guest] [data-login]') and not page.is_visible('.lk-card [data-redeem]'))
    page.click('[data-want]')
    page.wait_for_selector('dialog.account-dialog[open] form[data-view="register"]', timeout=5000)
    check('点了弹出注册框，带一句说明', '付费开通' in page.inner_text('dialog.account-dialog[open]'))

    email = 'want-%d@test.local' % int(time.time())
    page.fill('form[data-view="register"] input[name="email"]', email)
    page.fill('form[data-view="register"] input[name="password"]', 'password123')
    if page.query_selector('form[data-view="register"] [data-ts]'):
        page.wait_for_function("() => { const i = document.querySelector('[data-ts] input[name=\"cf-turnstile-response\"]'); return i && i.value }", timeout=30000)
    page.click('form[data-view="register"] [data-act="submit"]')
    page.wait_for_selector('.code-box', timeout=30000)
    code = json.loads(codes[-1].text())['dev_code']
    for box, digit in zip(page.query_selector_all('.code-box'), code):
        box.type(digit)

    page.wait_for_selector('[data-want-msg]:not([hidden])', timeout=20000)
    check('注册完不刷新，自动登记，写明邮箱', page.inner_text('[data-want]') == '已登记' and email in page.inner_text('[data-want-msg]'), page.inner_text('[data-want-msg]'))
    check('换成免费版的样子：能填邀请码', page.is_visible('.lk-card [data-redeem]') and not page.is_visible('[data-lk-guest] [data-login]'))
    page.keyboard.press('Escape')
    page.reload()
    page.wait_for_selector('[data-want-msg]:not([hidden])', timeout=10000)
    check('刷新后仍是已登记', page.inner_text('[data-want]') == '已登记')
    r = page.evaluate("fetch('/api/auth/want', {method:'POST', credentials:'same-origin'}).then(r => r.status)")
    check('不带 JSON 的 POST → 422（防跨站表单）', r == 422, r)
    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
