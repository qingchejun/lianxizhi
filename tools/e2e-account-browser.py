# 账号浏览器全流程：注册（六格验证码自动提交）→ 登录态 → 改动同步到第二个浏览器 → 找回重设。
# DEV_SHOW_CODE=1 时验证码/重设 token 在响应 JSON 里，用 page.on('response') 抓。
# 用法：先起 wrangler（同 tools/e2e-account.sh，不带 --d1），再
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-account-browser.py
import sys, time
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8999'
EMAIL = f'e2e-{int(time.time())}@test.local'
PASSWORD = 'password123'
results = []
page_errors = []

def check(name, ok, extra=''):
    results.append(ok)
    print(('✓ ' if ok else '✗ ') + name + ((' → ' + str(extra)) if not ok else ''))

def watch(page):
    page.on('pageerror', lambda e: page_errors.append(str(e)))

def dump_errors():
    for e in page_errors:
        print('PAGEERROR:', e)

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx1 = browser.new_context()
    page = ctx1.new_page()
    watch(page)
    apis = []  # 所有 /api/ 响应（push 在 /api/data/ 下，不能只盯 /api/auth/）
    page.on('response', lambda r: apis.append(r) if '/api/' in r.url else None)
    page.goto(BASE + '/shizi.html')
    try:  # 新档案会自动弹「使用说明」，等它出来再 Esc 关掉
        page.wait_for_selector('.help-dialog', timeout=5000)
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    except Exception:
        pass

    # 注册：填邮箱密码，提交后进六格
    page.click('[data-account]')
    page.click('[data-goto="register"]')
    page.fill('input[name=email]', EMAIL)
    page.fill('input[name=password]', PASSWORD)
    page.click('[data-act="submit"]')
    page.wait_for_selector('.code-box', timeout=10000)
    code = None
    mail_at = time.time()  # 注册邮件的发送时刻（限流窗口从这里算）
    for r in apis:
        if r.url.endswith('/api/auth/register'):
            try:
                j = r.json()
                if j.get('dev_code'):
                    code = j['dev_code']
            except Exception:
                pass
    check('注册后拿到 dev_code', code is not None, [r.url for r in apis])
    for i, ch in enumerate(code or '000000'):
        page.fill(f'.code-box:nth-of-type({i + 1})', ch)
        page.wait_for_timeout(80)
    page.wait_for_selector('.account-line', timeout=10000)
    check('六格填满自动验证并进入已登录视图', EMAIL in page.inner_html('.account-dialog'))
    page.keyboard.press('Escape')

    # 改动：识字点一个字产生 sumsum: 写入 → 防抖 2s 后推送
    page.click('#preview .shizi-cell')
    page.wait_for_timeout(3500)
    check('本地改动触发推送', any(r.url.endswith('/api/data/push') for r in apis))

    # 第二个浏览器：同账号新 context 登录。卷面是每台随机生成的，播种语义下（mtime=1 对 1）
    # 互不覆盖——点选只在同一张卷上可见。先把第一台的卷面塞给第二台再登录，模拟
    # 老设备→新设备的真实继承（真实 mtime 的数据赢过新设备的播种值）。
    ctx2 = browser.new_context()
    page2 = ctx2.new_page()
    watch(page2)
    apis2 = []
    page2.on('response', lambda r: apis2.append(r) if '/api/' in r.url else None)
    page2.goto(BASE + '/shizi.html')
    try:
        page2.wait_for_selector('.help-dialog', timeout=5000)
        page2.keyboard.press('Escape')
        page2.wait_for_timeout(300)
    except Exception:
        pass
    paper = page.evaluate("() => localStorage.getItem('sumsum:shizi:daily:v1')")
    page2.evaluate("v => localStorage.setItem('sumsum:shizi:daily:v1', v)", paper)
    page2.reload()
    page2.wait_for_selector('#preview .shizi-cell')
    page2.click('[data-account]')
    page2.fill('input[name=email]', EMAIL)
    page2.fill('input[name=password]', PASSWORD)
    page2.click('[data-act="submit"]')
    # 拉取 → 应用 → 自动 reload：等它落定再验
    page2.wait_for_timeout(2500)
    page2.wait_for_selector('#preview .shizi-cell')
    picked = page2.eval_on_selector_all('#preview .shizi-cell.is-pick', 'els => els.length')
    check('点选同步到第二台', picked >= 1, picked)
    page2.click('[data-account]')
    page2.wait_for_selector('.account-line', timeout=10000)
    check('第二台登录成功', True)
    page2.keyboard.press('Escape')
    page2.wait_for_timeout(200)

    # 找回重设：forgot 的 dev_token 从响应抓，打开 /?reset=
    # 注册那封邮件后 60 秒内 forgot 会被限流（响应仍是 200 但不发送、无 dev_token）→ 先等够
    wait = 62 - (time.time() - mail_at)
    if wait > 0:
        print(f'…等 {wait:.0f}s 过邮件限流窗口')
        time.sleep(wait)
    page2.click('[data-account]')
    page2.click('[data-act="logout"]')
    page2.wait_for_selector('input[name=email]')
    page2.click('[data-goto="forgot"]')
    page2.fill('input[name=email]', EMAIL)
    page2.click('[data-act="submit"]')
    page2.wait_for_timeout(800)
    token = None
    for r in apis2:
        if r.url.endswith('/api/auth/forgot'):
            try:
                j = r.json()
                if j.get('dev_token'):
                    token = j['dev_token']
            except Exception:
                pass
    check('forgot 拿到 dev_token', token is not None)
    page2.goto(BASE + '/?reset=' + (token or 'x' * 64))
    try:
        page2.wait_for_selector('input[name=email]', timeout=10000)
    except Exception:
        dump_errors()
        raise
    check('?reset= 直接开重设视图', '重设' in page2.inner_html('.account-dialog'))
    page2.fill('input[name=email]', EMAIL)
    page2.fill('input[name=password]', 'newpassword9')
    page2.click('[data-act="submit"]')
    page2.wait_for_selector('.account-line', timeout=10000)
    check('重设后自动登录', True)

    browser.close()

for e in page_errors:
    print('PAGEERROR:', e)
print()
sys.exit(0 if all(results) else 1)
