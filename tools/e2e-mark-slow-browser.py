# 慢网络下的扫码打分全流程（2026-11-24）。手机实测国内连海外：单个请求常要 10 秒以上、偶尔失败。
# 本脚本给所有 /api/ 请求人为加延迟，并让电脑的头两次上传直接失败，验证：
#   1. 网页自带登录态，不再单独请求 /api/auth/me；
#   2. 电脑打印后上传失败会自动重试，最终提示「已存到云端」；
#   3. 手机先扫、电脑后传上来：手机显示「还在上传」并自动等，传上来后直接出卡片，全程不刷新、不报「找不到」；
#   4. 「这张没做，不用打分」能把其他纸从列表里拿掉。
# 用法：先起本机预览（npx wrangler pages dev . --port 8999 --binding SESSION_SECRET=dev-secret --binding DEV_SHOW_CODE=1），
#   账号 preview@local.test / preview123 要先存在，再
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-mark-slow-browser.py
import asyncio, json, time
from playwright.async_api import async_playwright

BASE = 'http://127.0.0.1:8999'
EMAIL, PASSWORD = 'preview@local.test', 'preview123'
API_DELAY = 6  # 秒：每个接口请求都慢这么多
results = []


def check(name, ok, extra=''):
    results.append(bool(ok))
    print(('✓ ' if ok else '✗ ') + name + ((' → ' + str(extra)) if not ok else ''))


async def login(page):
    await page.goto(BASE + '/')
    await page.fill('form[data-view="login"] input[name="email"]', EMAIL)
    await page.fill('form[data-view="login"] input[name="password"]', PASSWORD)
    await page.click('form[data-view="login"] [data-act="submit"]')
    await page.wait_for_url(BASE + '/', timeout=30000)
    await asyncio.sleep(2)


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        errs = []

        # ---------- 电脑 ----------
        desk = await br.new_context(viewport={'width': 1440, 'height': 900})
        d = await desk.new_page()
        d.on('pageerror', lambda e: errs.append('电脑 ' + str(e)))
        await login(d)

        me_calls = []
        push_state = {'n': 0}
        release = asyncio.Event()

        async def desk_api(route):
            url = route.request.url
            if '/api/auth/me' in url:
                me_calls.append(url)
            await asyncio.sleep(API_DELAY)
            if '/api/data/push' in url:
                push_state['n'] += 1
                if push_state['n'] <= 2:
                    return await route.abort('failed')  # 头两次上传直接断掉
                await release.wait()  # 手机先扫，再放行电脑的上传
            await route.continue_()

        await d.route('**/api/**', desk_api)
        await d.goto(BASE + '/kousuan')
        await d.wait_for_function("window.SumSum && SumSum.account && SumSum.account.state.loggedIn", timeout=5000)
        check('网页自带登录态：打开页面 5 秒内就知道已登录（不等接口）', True)
        await d.click('#btn-regen')
        await asyncio.sleep(1)
        await d.evaluate("window.dispatchEvent(new Event('beforeprint'))")
        sid = await d.evaluate('SumSum.sheets.current().id')
        await asyncio.sleep(1)
        t0 = await d.inner_text('#cloud-toast')
        check('打印后提示正在存云端', '云端' in t0, t0)
        toasts = set()
        for _ in range(int(API_DELAY * 2 + 6)):
            toasts.add(await d.inner_text('#cloud-toast'))
            await asyncio.sleep(1)
        check('上传失败 → 提示正在自动重试', any('重试' in t for t in toasts), toasts)
        check('电脑上没请求过 /api/auth/me', not me_calls, me_calls)

        # ---------- 手机：电脑还没传上来就扫 ----------
        mob = await br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        m = await mob.new_page()
        m.on('pageerror', lambda e: errs.append('手机 ' + str(e)))
        await login(m)

        async def mob_api(route):
            await asyncio.sleep(API_DELAY)
            await route.continue_()

        await m.route('**/api/**', mob_api)
        navs = []
        await m.goto(BASE + '/mark?id=' + sid)
        m.on('framenavigated', lambda f: navs.append(f.url) if f == m.main_frame else None)
        seen = set()
        bad_words = ['电脑那边还没同步好', '找不到这张纸']
        for _ in range(12):  # 先看 24 秒：一直是「读取 / 上传中」的提示
            txt = await m.inner_text('#mark-page')
            for w in ['网络有点慢', '还在上传'] + bad_words:
                if w in txt:
                    seen.add(w)
            await asyncio.sleep(2)
        check('手机：电脑没传上来时显示「还在上传」在等', '还在上传' in seen, seen)
        check('手机：没出现「没同步好 / 找不到」', not (seen & set(bad_words)), seen)

        release.set()  # 电脑的上传放行
        found = False
        for _ in range(30):
            if await m.query_selector('[data-card="%s"] [data-lv]' % sid):
                found = True
                break
            await asyncio.sleep(1)
        check('电脑传上来后，手机不用刷新就出现这张纸', found)
        check('手机全程没整页刷新', not navs, navs)
        await asyncio.sleep(3)
        t2 = await d.inner_text('#cloud-toast')
        check('电脑最终提示「已存到云端」', '已存到云端' in t2, t2)

        # ---------- 这张没做 ----------
        skip = await m.query_selector('[data-skip]')
        if skip:
            other = await skip.get_attribute('data-sheet')
            await skip.click()
            await asyncio.sleep(0.5)
            gone = await m.query_selector('[data-card="%s"]' % other) is None
            raw = await m.evaluate('k => localStorage.getItem(k)', 'sumsum:sheet:v1:' + other)
            rec = json.loads(raw) if raw else {}
            check('「这张没做」：卡片拿掉、记录标为跳过', gone and rec.get('done') and rec.get('skipped'), rec)
        else:
            print('（列表里没有其他没打分的纸，跳过「这张没做」）')
        check('扫的这张纸自己没有「这张没做」', await m.query_selector('[data-card="%s"] [data-skip]' % sid) is None)
        diag = await m.inner_text('#mark-diag')
        print('手机页底诊断：', diag)
        check('全程没有脚本报错', not errs, errs)
        await br.close()

    print('\n%d / %d 通过' % (sum(results), len(results)))
    raise SystemExit(0 if all(results) else 1)


asyncio.run(main())
