# 登录设备上限 3 台（2026-11-24）浏览器验收：
#   1. 一个账号在 4 个浏览器里先后登录 → 最早那台（最久没用）被挤掉：打开网站回到登录页，看到「在别的设备上登录了」；
#      其余三台照常；被挤掉的那台看视频 403、同步接口 401；
#   2. 一台退出 → 让出名额，被挤掉的那台重新登录，不再挤掉别人；
#   3. 没有设备记录的旧登录（上线前的 cookie）→ 登录页提示「登录方式升级了」。
# 用法：本机预览跑着（见 e2e-free-browser.py），本机 D1 跑过 tools/migrate-20261124-sessions.sql，再
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-devices-browser.py
import json, random, subprocess, sys, time
from playwright.sync_api import sync_playwright

subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'lianxizhi', '--local', '--command',
                "DELETE FROM limits WHERE scope LIKE 'ip%' OR scope = 'all' OR kind = 'loginfail'"], capture_output=True)

BASE = 'http://127.0.0.1:8999'
EMAIL = f'dev-{int(time.time())}@test.local'
results = []


def check(name, ok, extra=''):
    results.append(bool(ok))
    print(('✓ ' if ok else '✗ ') + name + ((' → ' + str(extra)) if not ok else ''))


def make_invite():
    code = ''.join(random.choice('ABCDEFGHJKMNPQRSTUVWXYZ23456789') for _ in range(8))
    subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'lianxizhi', '--local', '--command',
                    f"INSERT INTO invites(id,code,note,created_at) VALUES ('e2e-{code}','{code}','e2e',0)"],
                   check=True, capture_output=True)
    return code


def close_help(page):
    page.evaluate("document.querySelectorAll('dialog.help-dialog[open]').forEach(d => d.close())")


def login(page):
    page.goto(BASE + '/')
    page.wait_for_selector('.wl-auth form[data-view="login"]', timeout=10000)
    page.fill('form[data-view="login"] input[name="email"]', EMAIL)
    page.fill('form[data-view="login"] input[name="password"]', 'password123')
    page.click('form[data-view="login"] [data-act="submit"]')
    page.wait_for_selector('#today-cards .dk-shelf', timeout=30000)
    close_help(page)


def logged_in(page):
    page.goto(BASE + '/')
    page.wait_for_selector('#today-cards .dk-shelf, .wl-auth form[data-view="login"]', timeout=15000)
    return page.query_selector('#today-cards .dk-shelf') is not None


def login_msg(page):
    page.wait_for_timeout(500)
    m = page.query_selector('.wl-auth [data-msg]:not([hidden])')
    return m.inner_text() if m else ''


def api(page, path):
    return page.evaluate("p => fetch(p).then(r => r.status)", path)


with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []
    pages = []
    for i in range(4):
        c = br.new_context(viewport={'width': 1440, 'height': 900})
        pg = c.new_page()
        pg.on('pageerror', lambda e, i=i: errs.append('设备%d %s' % (i + 1, e)))
        pages.append(pg)

    # 设备 1：带码注册（注册验证也占一个名额）
    d1 = pages[0]
    codes = []
    d1.on('response', lambda r: codes.append(r) if r.url.endswith('/api/auth/register') else None)
    d1.goto(BASE + '/')
    d1.wait_for_selector('.wl-auth form[data-view="login"]', timeout=10000)
    d1.click('[data-wl-signup]')
    d1.fill('form[data-view="register"] input[name="email"]', EMAIL)
    d1.fill('form[data-view="register"] input[name="password"]', 'password123')
    d1.fill('form[data-view="register"] input[name="invite"]', make_invite())
    d1.click('form[data-view="register"] [data-act="submit"]')
    d1.wait_for_selector('.code-box', timeout=30000)
    for box, d in zip(d1.query_selector_all('.code-box'), json.loads(codes[-1].text())['dev_code']):
        box.type(d)
    d1.wait_for_selector('#today-cards .dk-shelf', timeout=30000)
    close_help(d1)

    for pg in pages[1:3]:
        login(pg)
    check('三台都登录着', all(logged_in(pg) for pg in pages[:3]))

    login(pages[3])
    check('第 4 台登录成功', logged_in(pages[3]))
    check('最早那台被挤掉，回到登录页', not logged_in(d1))
    msg = login_msg(d1)
    check('登录页说明是在别的设备上登录了', '别的设备' in msg and '3 台' in msg, msg)
    check('被挤掉的那台：同步接口 401', api(d1, '/api/data') == 401)
    check('被挤掉的那台：看视频 403', api(d1, '/v/aoshu/xulie.mp4') == 403)
    check('其余三台照常', all(logged_in(pg) for pg in pages[1:]))
    check('其余三台同步接口照常', all(api(pg, '/api/data') == 200 for pg in pages[1:]))

    # 设备 4 退出 → 让出名额；设备 1 重新登录，不挤别人
    d4 = pages[3]
    d4.click('[data-account-menu]')
    d4.click('.rail-menu [data-logout]') if d4.query_selector('.rail-menu [data-logout]') else d4.evaluate("SumSum.account.logout().then(() => location.reload())")
    d4.wait_for_timeout(1500)
    check('设备 4 退出了', not logged_in(d4))
    check('退出后的登录页不说「被挤掉」', '别的设备' not in login_msg(d4))
    login(d1)
    check('设备 1 重新登录后，设备 2、3 仍在线（退出让出了名额）', logged_in(pages[1]) and logged_in(pages[2]) and logged_in(d1))

    # 上线前的旧 cookie：签名对、没有 sid（用本机预览的 SESSION_SECRET=dev-secret 现签一个）
    c5 = br.new_context()
    p5 = c5.new_page()
    uid = json.loads(subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'lianxizhi', '--local', '--json', '--command',
                                     f"SELECT id, pwver FROM users WHERE email='{EMAIL}'"], capture_output=True, text=True).stdout)[0]['results'][0]
    token = subprocess.run(['node', '--input-type=module', '-e',
                            "import { sign } from './server/session.js'; console.log(await sign({ uid: %s, pwver: %d, exp: Date.now() + 864e5 }, 'dev-secret'))" % (json.dumps(uid['id']), uid['pwver'])],
                           capture_output=True, text=True).stdout.strip()
    c5.add_cookies([{'name': 'sumsum_sess', 'value': token, 'url': BASE}])
    check('上线前的旧登录 → 要重新登录', not logged_in(p5))
    msg = login_msg(p5)
    check('登录页说明登录方式升级了', '升级' in msg, msg)

    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
