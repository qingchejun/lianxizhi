# 账号浏览器全流程（2026-11-21 按改版后的页面重写）：
# 首页表单用邀请码注册（六格验证码）→ 数据推上云端 → 第二个浏览器登录后数据跟过去 →
# 退出 → 忘记密码收 6 位码重设并自动登录 → 账号菜单里改密码 → 退出后用新密码登录。
# DEV_SHOW_CODE=1 时验证码在响应 JSON 的 dev_code 里，用 page.on('response') 抓。
# 用法：先起 wrangler（npx wrangler pages dev . --port 8999 --binding SESSION_SECRET=dev-secret --binding DEV_SHOW_CODE=1），再
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-account-browser.py
# 注册信发出后 60 秒内不能再发重设信，脚本会等够再继续（全程约 1.5 分钟）。
import json, random, string, subprocess, sys, time
from playwright.sync_api import sync_playwright


# 本机预览所有请求都来自 127.0.0.1：先清掉本机限流计数，免得撞上「同一地址一小时 10 封」（2026-11-24 起有地址限流）
import subprocess as _sp
_sp.run(['npx', 'wrangler', 'd1', 'execute', 'lianxizhi', '--local', '--command',
         "DELETE FROM limits WHERE scope LIKE 'ip%' OR scope = 'all'"], capture_output=True)

BASE = 'http://127.0.0.1:8999'
EMAIL = f'acct-{int(time.time())}@test.local'
results = []
errors = []


def check(name, ok, extra=''):
    results.append(ok)
    print(('✓ ' if ok else '✗ ') + name + ((' → ' + str(extra)) if not ok else ''))


def make_invite():
    code = ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'lianxizhi', '--local', '--command',
                    f"INSERT INTO invites(id,code,note,created_at) VALUES ('e2e-{code}','{code}','e2e',0)"],
                   check=True, capture_output=True)
    return code


def dev_code(responses, path):
    for r in reversed(responses):
        if r.url.endswith(path):
            try:
                c = json.loads(r.text()).get('dev_code')
                if c:
                    return c
            except Exception:
                pass
    return None


def type_code(page, code):
    for box, digit in zip(page.query_selector_all('.code-box'), code):
        box.type(digit)


def login(page, email, password):
    page.goto(BASE + '/#login')  # 2026-11-25 起首页登录是弹出框
    page.fill('form[data-view="login"] input[name="email"]', email)
    page.fill('form[data-view="login"] input[name="password"]', password)
    page.click('form[data-view="login"] [data-act="submit"]')
    page.wait_for_selector('.rail', timeout=20000)


def logout(page):
    page.wait_for_load_state('networkidle')
    page.click('[data-account-menu]')
    page.wait_for_selector('.rail-menu [data-logout]', state='visible', timeout=5000)
    page.click('.rail-menu [data-logout]')
    page.wait_for_url(BASE + '/', timeout=10000)
    page.wait_for_selector('.wl-hero', timeout=10000)


with sync_playwright() as p:
    browser = p.chromium.launch()

    # --- 注册 ---
    ctx1 = browser.new_context()
    page = ctx1.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    apis = []
    page.on('response', lambda r: apis.append(r) if '/api/' in r.url else None)
    page.goto(BASE + '/')
    page.click('[data-wl-signup]')
    page.fill('form[data-view="register"] input[name="email"]', EMAIL)
    page.fill('form[data-view="register"] input[name="password"]', 'password123')
    page.fill('form[data-view="register"] input[name="invite"]', make_invite())
    page.click('form[data-view="register"] [data-act="submit"]')
    page.wait_for_selector('.code-box', timeout=30000)
    mail_at = time.time()
    code = dev_code(apis, '/api/auth/register')
    check('注册后收到验证码', code is not None)
    type_code(page, code or '000000')
    page.wait_for_selector('.rail', timeout=30000)
    check('填完验证码进入网站', page.is_visible('.rail'))

    # --- 数据上云 ---
    time.sleep(2)  # 登录后首次同步可能刷新一次页面
    page.wait_for_load_state('networkidle')
    page.wait_for_function("window.SumSum && SumSum.accountUI && SumSum.accountUI.initialSync", timeout=20000)
    page.evaluate("SumSum.accountUI.initialSync")
    page.wait_for_load_state('networkidle')
    page.evaluate("SumSum.store.set('sumsum:e2e:acct:v1', {n: 1})")
    time.sleep(4)
    cloud = page.evaluate("fetch('/api/data').then(r => r.json())")
    check('改动推上云端', any(it['key'] == 'sumsum:e2e:acct:v1' for it in cloud.get('items', [])))

    # --- 第二台登录，数据跟过去 ---
    ctx2 = browser.new_context()
    page2 = ctx2.new_page()
    page2.on('pageerror', lambda e: errors.append(str(e)))
    login(page2, EMAIL, 'password123')
    time.sleep(3)
    page2.wait_for_load_state('networkidle')
    check('第二台登录后拿到数据', page2.evaluate("localStorage.getItem('sumsum:e2e:acct:v1')") is not None)

    # --- 忘记密码：6 位码重设 ---
    logout(page2)
    wait = 62 - (time.time() - mail_at)
    if wait > 0:
        print(f'…等 {wait:.0f} 秒过邮件限流')
        time.sleep(wait)
    apis2 = []
    page2.on('response', lambda r: apis2.append(r) if '/api/' in r.url else None)
    page2.click('.sh-act a')  # 退出后回到首页，登录是弹出框
    page2.click('form[data-view="login"] [data-goto="forgot"]')
    page2.fill('form[data-view="forgot"] input[name="email"]', EMAIL)
    page2.click('form[data-view="forgot"] [data-act="submit"]')
    page2.wait_for_selector('form[data-view="resetcode"]', timeout=20000)
    rcode = dev_code(apis2, '/api/auth/forgot')
    check('忘记密码收到 6 位码', rcode is not None)
    type_code(page2, rcode or '000000')
    page2.fill('form[data-view="resetcode"] input[name="password"]', 'newpassword9')
    page2.click('form[data-view="resetcode"] [data-act="submit"]')
    page2.wait_for_selector('.rail', timeout=30000)
    check('重设后自动登录', page2.is_visible('.rail'))

    # --- 改密码（登录后同步会刷新一次页面，等它落定再点菜单） ---
    time.sleep(3)
    page2.wait_for_load_state('networkidle')
    page2.click('[data-account-menu]')
    page2.wait_for_selector('.rail-menu [data-account]', state='visible', timeout=5000)
    page2.click('.rail-menu [data-account]')
    page2.click('[data-act="changepw"]')
    page2.fill('form[data-view="changepw"] input[name="old"]', 'newpassword9')
    page2.fill('form[data-view="changepw"] input[name="password"]', 'password777')
    page2.click('form[data-view="changepw"] [data-act="submit"]')
    page2.wait_for_selector('.account-who', timeout=20000)
    check('改密码成功回到账号页', True)
    page2.keyboard.press('Escape')
    page2.wait_for_timeout(300)
    logout(page2)
    login(page2, EMAIL, 'password777')
    check('新密码能登录', page2.is_visible('.rail'))

    # 第一台的登录在重设密码后应失效
    me = page.evaluate("fetch('/api/auth/me').then(r => r.status)")
    check('重设密码后旧设备被踢下线', me == 401, me)

    browser.close()

for e in errors:
    print('PAGEERROR:', e)
check('页面无脚本报错', not errors)
print(f'\n{sum(results)}/{len(results)} 通过')
sys.exit(0 if all(results) else 1)
