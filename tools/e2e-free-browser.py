# 放开注册 · 免费版 / 完整版（2026-11-24）浏览器验收：
#   1. 不填邀请码注册 → 免费版：今天页只有口算、数独，另外七个板块列在下面带锁；侧栏七个板块挂锁；
#   2. 免费版打开奥数（各种写法）→ 原网址显示上锁页、能补填邀请码；口算照常、纸上有二维码；
#   3. 免费版看奥数视频 → 403；补填错码报错，好码开通后刷新，奥数页能用、视频能播（含拖动进度条的分段请求）；
#   4. 带邀请码注册 → 直接完整版；已注册的邮箱再注册 → 页面不暴露「注册过」；
#   5. 删除账号。
# 用法：先起本机预览（npx wrangler pages dev . --port 8999 --binding SESSION_SECRET=dev-secret --binding DEV_SHOW_CODE=1），
#   本机 D1 已跑过 tools/migrate-20261124-plan.sql，本机 R2 放一个 lianxizhi-video/aoshu/xulie.mp4，再
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-free-browser.py
import json, random, string, subprocess, sys, time
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8999'
STAMP = int(time.time())
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


def register(page, email, invite=''):
    codes = []
    page.on('response', lambda r: codes.append(r) if r.url.endswith('/api/auth/register') else None)
    page.goto(BASE + '/')
    page.wait_for_selector('.wl-auth form[data-view="login"]', timeout=10000)
    page.click('[data-wl-signup]')
    page.wait_for_selector('.wl-auth form[data-view="register"]', timeout=5000)
    page.fill('form[data-view="register"] input[name="email"]', email)
    page.fill('form[data-view="register"] input[name="password"]', 'password123')
    if invite:
        page.fill('form[data-view="register"] input[name="invite"]', invite)
    if page.query_selector('form[data-view="register"] [data-ts]'):
        # 配了人机验证（测试钥匙会自动通过）：等那一格打上勾
        page.wait_for_function("() => { const i = document.querySelector('[data-ts] input[name=\"cf-turnstile-response\"]'); return i && i.value }", timeout=30000)
    page.click('form[data-view="register"] [data-act="submit"]')
    page.wait_for_selector('.code-box', timeout=30000)
    body = json.loads(codes[-1].text())
    return body


def enter_code(page, code):
    for box, digit in zip(page.query_selector_all('.code-box'), code):
        box.type(digit)


def video(page, rng=None):
    return page.evaluate("""async (r) => {
      const res = await fetch('/v/aoshu/xulie.mp4', { headers: r ? { Range: r } : {} })
      const buf = await res.arrayBuffer()
      return { status: res.status, len: buf.byteLength, range: res.headers.get('Content-Range'), type: res.headers.get('Content-Type') }
    }""", rng)


with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []

    # ---------- 免费注册 ----------
    ctx = br.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errs.append(str(e)))
    email = f'free-{STAMP}@test.local'
    body = register(page, email)
    check('不填邀请码也能注册（发了验证码）', body.get('ok') and body.get('dev_code'), body)
    enter_code(page, body['dev_code'])
    page.wait_for_selector('#today-cards .dk-shelf', timeout=30000)
    close_help(page)
    shelves = page.inner_text('#today-cards')
    check('今天页：免费版只摆口算、数独', '免费版可用' in shelves and '口算' in shelves and '数独' in shelves, shelves[:200])
    check('今天页：另外七个板块列在「完整版」下面', page.query_selector_all('.dk-lock-list a').__len__() == 7)
    locks = page.eval_on_selector_all('.rail-link.is-locked', 'els => els.map(e => e.dataset.module)')
    check('侧栏七个板块挂锁', sorted(locks) == sorted(['奥数', '识字', '拼音', '火柴', '密码', '迷宫', '数织']), locks)

    # ---------- 上锁页 ----------
    for path in ['/aoshu', '/aoshu/', '/aoshu.html', '/shizi', '/admin']:
        resp = page.goto(BASE + path)
        ok = page.query_selector('.lk-card') is not None and page.query_selector('[data-redeem]') is not None
        check('免费版打开 ' + path + ' → 上锁页、能填邀请码', ok and resp.status == 200, [resp.status, page.url])
    page.goto(BASE + '/aoshu')
    check('上锁页按网址显示板块名', '奥数' in page.inner_text('#lk-name'))
    check('上锁页不收录', 'noindex' in (page.evaluate("fetch(location.href).then(r => r.headers.get('X-Robots-Tag'))") or ''))
    v = video(page)
    check('免费版看奥数视频 → 403', v['status'] == 403, v)

    page.goto(BASE + '/kousuan')
    page.wait_for_selector('#preview .sheet', timeout=10000)
    close_help(page)
    check('免费版口算照常，纸上有二维码', page.query_selector('#preview .sheet-qr') is not None)

    # ---------- 账号弹窗 ----------
    page.click('[data-account-menu]')
    page.click('.rail-menu [data-account]')
    page.wait_for_selector('dialog.account-dialog[open] .account-plan', timeout=5000)
    check('账号弹窗显示「免费版」和补填邀请码', '免费版' in page.inner_text('.account-plan') and page.query_selector('dialog .account-plan [data-redeem]') is not None)
    page.keyboard.press('Escape')

    # ---------- 补填邀请码 ----------
    page.goto(BASE + '/aoshu')
    page.fill('.lk-card [data-redeem] input[name="invite"]', 'ABCD-2345')
    page.click('.lk-card [data-redeem] button[type="submit"]')
    page.wait_for_selector('.lk-card [data-redeem-msg]:not([hidden])', timeout=10000)
    check('补填错码 → 提示不对', '不对' in page.inner_text('.lk-card [data-redeem-msg]'), page.inner_text('.lk-card [data-redeem-msg]'))
    code = make_invite()
    page.fill('.lk-card [data-redeem] input[name="invite"]', code)
    page.click('.lk-card [data-redeem] button[type="submit"]')
    page.wait_for_selector('.topic-nav, #preview .sheet', timeout=30000)
    close_help(page)
    check('补填好码 → 刷新后奥数页能用', page.query_selector('.lk-card') is None and '/aoshu' in page.url)
    check('侧栏的锁没了', not page.query_selector_all('.rail-link.is-locked'))
    v = video(page)
    check('完整版能看视频（整段 200）', v['status'] == 200 and v['len'] > 1000 and v['type'] == 'video/mp4', v)
    v = video(page, 'bytes=0-99')
    check('完整版拖动进度条（分段 206）', v['status'] == 206 and v['len'] == 100 and (v['range'] or '').startswith('bytes 0-99/'), v)
    v = video(page, 'bytes=-50')
    check('分段请求「最后 50 字节」也对', v['status'] == 206 and v['len'] == 50, v)

    # ---------- 带码注册、重复注册 ----------
    c2 = br.new_context(viewport={'width': 1440, 'height': 900})
    p2 = c2.new_page()
    p2.on('pageerror', lambda e: errs.append('带码 ' + str(e)))
    b2 = register(p2, f'full-{STAMP}@test.local', make_invite())
    enter_code(p2, b2['dev_code'])
    p2.wait_for_selector('#today-cards .dk-shelf', timeout=30000)
    check('带邀请码注册 → 直接完整版（今天页九个板块）', '免费版可用' not in p2.inner_text('#today-cards') and not p2.query_selector_all('.rail-link.is-locked'))

    c3 = br.new_context()
    p3 = c3.new_page()
    b3 = register(p3, email)
    check('已注册的邮箱再注册 → 页面照常进验证码页，不说「注册过」', b3.get('ok') and not b3.get('dev_code') and '注册过' not in p3.inner_text('body'), b3)

    # ---------- 删除账号 ----------
    page.click('[data-account-menu]')
    page.click('.rail-menu [data-account]')
    page.wait_for_selector('dialog.account-dialog[open] [data-act="delete"]', timeout=5000)
    page.click('dialog.account-dialog [data-act="delete"]')
    page.fill('dialog.account-dialog form[data-view="delete"] input[name="password"]', 'password123')
    page.click('dialog.account-dialog form[data-view="delete"] [data-act="submit"]')
    page.wait_for_url(BASE + '/', timeout=15000)
    check('删除账号后回到首页（没登录）', page.query_selector('.wl-auth') is not None)
    lg = page.evaluate("""async (e) => {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, password: 'x'.repeat(64) }) })
      return r.status }""", email)
    check('删掉的账号登录不了', lg == 401, lg)

    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
