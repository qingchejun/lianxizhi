# 免登录出题打印（第二期，2026-11-24）浏览器验收：口算、数独没登录也能打开、出题、打印。
#   1. 网页源码里直接写着标题、描述、canonical、H1 和介绍文字（谷歌不跑脚本也读得到）；
#   2. 没登录：纸上没有二维码，打印不记录、不上传；顶上有提示条，侧栏显示「登录 / 注册」；
#   3. 点「打分」弹出登录框并说明为什么要登录；在框里登录后不刷新页面，二维码就补上，打印开始记录；
#   4. 打印时介绍文字和提示条都不上纸，文件名用短名；
#   5. 其余板块没登录照样拦回首页。
# 用法：先起本机预览（npx wrangler pages dev . --port 8999 --binding SESSION_SECRET=dev-secret --binding DEV_SHOW_CODE=1），
#   账号 preview@local.test / preview123 要先存在，再
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-guest-browser.py
import sys, urllib.request
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8999'
EMAIL, PASSWORD = 'preview@local.test', 'preview123'
results = []


def check(name, ok, extra=''):
    results.append(bool(ok))
    print(('✓ ' if ok else '✗ ') + name + ((' → ' + str(extra)) if not ok else ''))


def close_help(page):
    page.evaluate("document.querySelectorAll('dialog.help-dialog[open]').forEach(d => d.close())")


def sheet_keys(page):
    return page.evaluate("Object.keys(localStorage).filter(k => k.indexOf('sumsum:sheet:v1:') === 0)")


# ---------- 源码（不跑脚本）----------
for path, title, h1 in [('/kousuan', '口算题生成器', '口算题'), ('/shudu', '儿童数独打印', '儿童数独')]:
    raw = urllib.request.urlopen(BASE + path).read().decode('utf-8')
    check(path + ' 源码：标题、描述、canonical、H1、介绍文字都在', all(x in raw for x in [
        '<title>' + title, 'name="description"', '<link rel="canonical" href="https://zhihebi.com' + path + '"',
        '<h1 class="work-title">' + h1, 'class="board-intro"', '常见问题']))
    check(path + ' 源码里写的是「没登录」', '"ok":false' in raw)

with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    pushes = []
    page.on('request', lambda r: pushes.append(r.url) if '/api/data/push' in r.url else None)

    # ---------- 口算：没登录 ----------
    resp = page.goto(BASE + '/kousuan')
    check('没登录打开口算 → 200，不跳首页', resp.status == 200 and page.url.startswith(BASE + '/kousuan'), [resp.status, page.url])
    page.wait_for_selector('#preview .sheet', timeout=10000)
    close_help(page)
    check('练习纸出来了', page.is_visible('#preview .sheet'))
    check('纸上没有二维码', page.query_selector('.sheet-qr') is None)
    check('顶上提示「不用登录就能出题、打印」', page.is_visible('[data-guest-note]') and '不用登录' in page.inner_text('[data-guest-note]'))
    check('侧栏显示「登录 / 注册」', '登录' in page.inner_text('[data-account-email]'), page.inner_text('[data-account-email]'))
    before = page.inner_text('#preview .sheet')
    page.click('#btn-regen')
    page.wait_for_timeout(300)
    check('「重新生成」换了一批题', page.inner_text('#preview .sheet') != before)

    page.evaluate("window.dispatchEvent(new Event('beforeprint'))")
    title = page.title()
    page.evaluate("window.dispatchEvent(new Event('afterprint'))")
    check('打印文件名用短名「口算 · 纸和笔 · 时间」', title.startswith('口算 · 纸和笔 · 2'), title)
    page.wait_for_timeout(1500)
    check('没登录打印：不记录这张纸', not sheet_keys(page), sheet_keys(page))
    check('没登录打印：不上传', not pushes, pushes)
    check('没登录打印：不弹「存到云端」', page.query_selector('#cloud-toast') is None or not page.is_visible('#cloud-toast'))

    page.emulate_media(media='print')
    check('打印时介绍文字、提示条不上纸', not page.is_visible('.board-intro') and not page.is_visible('[data-guest-note]'))
    page.emulate_media(media='screen')
    check('屏幕上能看到介绍文字', page.is_visible('.board-intro'))

    page.click('#btn-mark')
    page.wait_for_selector('dialog.account-dialog[open] form[data-view="login"]', timeout=5000)
    check('点「打分」→ 弹出登录框并说明为什么', '登录后就能打分' in page.inner_text('dialog.account-dialog[open]'))

    navs = []
    page.on('framenavigated', lambda f: navs.append(f.url) if f == page.main_frame else None)
    page.fill('dialog.account-dialog form[data-view="login"] input[name="email"]', EMAIL)
    page.fill('dialog.account-dialog form[data-view="login"] input[name="password"]', PASSWORD)
    page.click('dialog.account-dialog form[data-view="login"] [data-act="submit"]')
    ok = False
    for _ in range(60):
        if page.query_selector('#preview .sheet-qr'):
            ok = True
            break
        page.wait_for_timeout(500)
    check('在框里登录后，二维码补上', ok)
    page.wait_for_timeout(2500)  # 首次登录同步可能会刷新一次页面
    page.wait_for_selector('#preview .sheet', timeout=10000)
    close_help(page)
    check('登录后提示条收起、侧栏显示邮箱', not page.is_visible('[data-guest-note]') and EMAIL in page.inner_text('[data-account-email]'))
    page.evaluate("window.dispatchEvent(new Event('beforeprint'))")
    page.evaluate("window.dispatchEvent(new Event('afterprint'))")
    page.wait_for_timeout(1000)
    check('登录后打印：开始记录这张纸', len(sheet_keys(page)) >= 1)

    # ---------- 数独：没登录 ----------
    g = br.new_context(viewport={'width': 1440, 'height': 900})
    gp = g.new_page()
    gp.on('pageerror', lambda e: errs.append('数独 ' + str(e)))
    resp = gp.goto(BASE + '/shudu')
    gp.wait_for_selector('#preview .sheet', timeout=10000)
    close_help(gp)
    check('没登录打开数独 → 能出题', resp.status == 200 and gp.is_visible('#preview .sheet'))
    check('数独纸上没有二维码', gp.query_selector('.sheet-qr') is None)
    gp.evaluate("window.dispatchEvent(new Event('beforeprint'))")
    gp.evaluate("window.dispatchEvent(new Event('afterprint'))")
    gp.wait_for_timeout(800)
    check('数独没登录打印不记录', not sheet_keys(gp))
    gp.click('[data-account-menu]')
    check('点侧栏「登录 / 注册」直接弹登录框', gp.is_visible('dialog.account-dialog[open] form[data-view="login"]'))

    # ---------- 其余板块照样拦 ----------
    for path in ['/aoshu', '/shizi', '/huochai']:
        gp.goto(BASE + path)
        check('没登录打开 ' + path + ' → 拦回首页', '/?next=' in gp.url, gp.url)

    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
