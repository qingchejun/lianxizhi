# 换域名过渡期（server/move.js MODE='soft'）浏览器验收（2026-11-24）。
# 用 host-resolver 把旧地址 lianxizhi.qingchejun.com 指到本机预览，验证：
#   1. 旧地址已登录打开页面：顶上出现「网址换成 zhihebi.com 了」，本机没传上云的改动先传上去，再跳到新地址同一页；
#   2. 旧地址没登录：直接 301 到新地址同一页（旧二维码 /mark?id=… 原样带过去）；
#   3. 页面里的品牌名是「纸和笔」。
# 用法：先起本机预览（npx wrangler pages dev . --port 8999 --binding SESSION_SECRET=dev-secret --binding DEV_SHOW_CODE=1），
#   账号 preview@local.test / preview123 要先存在，再
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-move-browser.py
import json, time
from playwright.sync_api import sync_playwright

LOCAL = 'http://127.0.0.1:8999'
OLD = 'https://lianxizhi.qingchejun.com'
EMAIL, PASSWORD = 'preview@local.test', 'preview123'
results = []


def check(name, ok, extra=''):
    results.append(bool(ok))
    print(('✓ ' if ok else '✗ ') + name + ((' → ' + str(extra)) if not ok else ''))


with sync_playwright() as p:
    br = p.chromium.launch()

    def to_local(route):
        # 旧地址的请求全部转到本机预览，Host 头保持旧地址（不碰线上）
        req = route.request
        headers = dict(req.all_headers())
        headers['host'] = 'lianxizhi.qingchejun.com'
        resp = route.fetch(url=req.url.replace(OLD, LOCAL), headers=headers, max_redirects=0)
        if resp.status in (301, 302):
            redirects.append((req.url, resp.headers.get('location')))
        route.fulfill(response=resp)

    redirects = []
    errs = []

    # 先在本机地址登录，拿到登录 cookie，复制到旧地址（本机是 http，Secure cookie 只能手动带过去）
    ctx = br.new_context(viewport={'width': 1280, 'height': 860})
    pg = ctx.new_page()
    pg.goto(LOCAL + '/')
    # 2026-11-25 起首页登录是弹出框：被拦下回首页时自动弹出，否则点右上角「登录 / 注册」
    if not pg.is_visible('form[data-view="login"]'):
        pg.click('.sh-act a')
    pg.fill('form[data-view="login"] input[name="email"]', EMAIL)
    pg.fill('form[data-view="login"] input[name="password"]', PASSWORD)
    pg.click('form[data-view="login"] [data-act="submit"]')
    pg.wait_for_url(LOCAL + '/', timeout=30000)
    check('品牌名是「纸和笔」', '纸和笔' in pg.title() and '纸和笔' in pg.inner_text('.rail-brand'), pg.title())
    sess = [c for c in ctx.cookies() if c['name'] == 'sumsum_sess'][0]
    ctx.add_cookies([{'name': 'sumsum_sess', 'value': sess['value'], 'domain': 'lianxizhi.qingchejun.com',
                      'path': '/', 'httpOnly': True, 'secure': True, 'sameSite': 'Lax'}])
    ctx.route(OLD + '/**', to_local)

    moved = []
    ctx.route('https://zhihebi.com/**', lambda r: (moved.append(r.request.url), r.fulfill(status=200, body='<title>moved</title>moved', content_type='text/html')))

    # 旧地址上留一条「没传上云」的改动：在旧地址的静态文件页里直接写本机存储（那里不跑同步、不会跳走）
    marker = 'move-test-%d' % int(time.time())
    raw = ctx.new_page()
    raw.goto(OLD + '/icons/mark.svg')
    raw.evaluate('''([m, email]) => {
      localStorage.setItem('sumsum:movetest:v1', JSON.stringify({ m: m }))
      const meta = JSON.parse(localStorage.getItem('sumsum:sync:meta') || '{}')
      meta['sumsum:movetest:v1'] = Date.now()
      localStorage.setItem('sumsum:sync:meta', JSON.stringify(meta))
      localStorage.setItem('sumsum:sync:owner', email)
    }''', [marker, EMAIL])
    raw.close()

    moved.clear()
    page = ctx.new_page()
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(OLD + '/mark?id=abc234')
    bar = ''
    try:
        page.wait_for_selector('#move-bar', timeout=10000)
        bar = page.inner_text('#move-bar')
    except Exception:
        pass
    check('旧地址已登录：顶上提示网址换了', 'zhihebi.com' in bar, bar)
    for _ in range(40):  # 用 wait_for_timeout 等：time.sleep 会卡住本脚本转发请求的处理函数
        if page.url.startswith('https://zhihebi.com'):
            break
        page.wait_for_timeout(500)
    check('同步完自动跳到新地址同一页', page.url.startswith('https://zhihebi.com/mark') and 'abc234' in (moved[-1] if moved else page.url), [page.url, moved])

    # 跳之前那条改动已经传上云：本机地址拉一次看看
    data = pg.evaluate("() => fetch('/api/data').then(r => r.json())")
    vals = [it['value'] for it in data.get('items', []) if it['key'] == 'sumsum:movetest:v1']
    check('跳走前把这台设备没传上的改动传上云了', vals and marker in vals[0], vals)

    # 没登录：直接 301
    anon = br.new_context()
    anon.route(OLD + '/**', to_local)
    anon_moved = []
    anon.route('https://zhihebi.com/**', lambda r: (anon_moved.append(r.request.url), r.fulfill(status=200, body='moved', content_type='text/html')))
    ap = anon.new_page()
    redirects.clear()
    ap.goto(OLD + '/mark?id=abc234')
    check('旧地址没登录扫旧二维码 → 直接 301 到新地址同一页', ('https://lianxizhi.qingchejun.com/mark?id=abc234', 'https://zhihebi.com/mark?id=abc234') in redirects, redirects)

    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
raise SystemExit(0 if all(results) else 1)
