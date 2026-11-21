# 登录门槛 + 换账号不串数据，浏览器全流程（2026-11-21）。
# 没登录打开板块页 → 被拦回首页、自动弹登录框 → 用邀请码注册 A → 回到原板块页 →
# 记一条练习数据 → 退出（回介绍页）→ 同一浏览器注册 B → A 的数据不在本机、也没推进 B 的云端。
# 用法：先起 wrangler（同 tools/e2e-account.sh，不带 --d1），再
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-gate-browser.py
import json, random, string, subprocess, sys, time
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8999'
STAMP = int(time.time())
results = []


def check(name, ok, extra=''):
    results.append(ok)
    print(('✓ ' if ok else '✗ ') + name + ((' → ' + str(extra)) if not ok else ''))


def make_invite():
    code = ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'lianxizhi', '--local', '--command',
                    f"INSERT INTO invites(id,code,note,created_at) VALUES ('e2e-{code}','{code}','e2e',0)"],
                   check=True, capture_output=True)
    return code


def register(page, email, invite):
    codes = []
    page.on('response', lambda r: codes.append(r) if r.url.endswith('/api/auth/register') else None)
    page.click('dialog[open] [data-goto="register"]') if page.is_visible('dialog[open] [data-goto="register"]') else None
    page.fill('dialog[open] form[data-view="register"] input[name="email"]', email)
    page.fill('dialog[open] form[data-view="register"] input[name="password"]', 'password123')
    page.fill('dialog[open] form[data-view="register"] input[name="invite"]', invite)
    page.click('dialog[open] form[data-view="register"] [data-act="submit"]')
    page.wait_for_selector('dialog[open] .code-box', timeout=30000)
    code = json.loads(codes[-1].text())['dev_code']
    boxes = page.query_selector_all('dialog[open] .code-box')
    for box, digit in zip(boxes, code):
        box.type(digit)


def close_help(page):
    # 第一次进各板块会自动弹「使用说明」，挡住点击
    page.evaluate("document.querySelectorAll('dialog.help-dialog[open]').forEach(d => d.close())")


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context()
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    page.goto(BASE + '/kousuan')
    check('没登录打开口算 → 拦回首页', '/?next=' in page.url, page.url)
    check('首页是介绍页', '每天一页' in page.inner_text('h1'))
    page.wait_for_selector('dialog[open]', timeout=5000)
    check('被拦下时自动弹出登录框', page.is_visible('dialog[open] form[data-view="login"]'))

    a = f'gate-a-{STAMP}@test.local'
    register(page, a, make_invite())
    page.wait_for_url('**/kousuan**', timeout=30000)
    check('注册完成 → 回到原来要去的口算页', '/kousuan' in page.url, page.url)
    page.wait_for_selector('.sheet', timeout=10000)
    check('口算页正常显示', page.is_visible('.sheet'))

    page.evaluate("SumSum.store.set('sumsum:e2e:mine:v1', {owner: 'A'})")
    time.sleep(4)  # 防抖 2 秒后推上 A 的云端
    a_cloud = page.evaluate("fetch('/api/data').then(r => r.json())")
    check('A 的数据推上了 A 的云端', any(it['key'] == 'sumsum:e2e:mine:v1' for it in a_cloud.get('items', [])))

    close_help(page)
    page.click('[data-account]')
    page.click('dialog[open] [data-act="logout"]')
    page.wait_for_url(BASE + '/', timeout=10000)
    check('退出登录 → 回到介绍页', '每天一页' in page.inner_text('h1'))
    check('本机还留着 A 的数据（还没换账号）', page.evaluate("localStorage.getItem('sumsum:e2e:mine:v1')") is not None)

    b = f'gate-b-{STAMP}@test.local'
    page.click('[data-open="register"]')
    register(page, b, make_invite())
    page.wait_for_selector('.today-card, .card, .work', timeout=30000)
    time.sleep(4)  # 同步：发现换了账号 → 清本机 → 刷新
    page.wait_for_load_state('networkidle')
    check('B 登录后本机没有 A 的数据', page.evaluate("localStorage.getItem('sumsum:e2e:mine:v1')") is None)
    check('本机归属改成 B', page.evaluate("localStorage.getItem('sumsum:sync:owner')") == b,
          page.evaluate("localStorage.getItem('sumsum:sync:owner')"))
    b_cloud = page.evaluate("fetch('/api/data').then(r => r.json())")
    check('A 的数据没推进 B 的云端', not any(it['key'] == 'sumsum:e2e:mine:v1' for it in b_cloud.get('items', [])),
          [it['key'] for it in b_cloud.get('items', [])])

    phone = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    mp = phone.new_page()
    mp.goto(BASE + '/')
    mp.screenshot(path='/tmp/gate-phone.png', full_page=True)
    wide = mp.evaluate('document.documentElement.scrollWidth')
    check('手机宽度不横向滚动', wide <= 390, wide)
    desk = browser.new_context(viewport={'width': 1440, 'height': 900})
    dp = desk.new_page()
    dp.goto(BASE + '/')
    dp.screenshot(path='/tmp/gate-desktop.png', full_page=True)

    for e in errors:
        print('PAGEERROR:', e)
    check('页面无脚本报错', not errors)
    browser.close()

print(f'\n{sum(results)}/{len(results)} 通过')
sys.exit(0 if all(results) else 1)
