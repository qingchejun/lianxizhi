# 游戏组开放（2026-11-25）浏览器验收：火柴、密码、迷宫、数织没登录也能打开、出题、打印。
#   1. 网页源码里直接写着标题、描述、canonical、H1 和介绍文字，不带 noindex；
#   2. 没登录：能出题、换一批，纸上没有二维码，打印不记录；提示条在，打印时介绍文字不上纸；
#   3. 点「打分」弹出登录框；打印文件名用短名；
#   4. 迷宫是普通方格迷宫：四关都画得出来，答案页有红线，题卷上没有；
#   5. 全程没有脚本报错。
# 用法：先起本机预览（npx wrangler pages dev . --port 8999 --binding SESSION_SECRET=dev-secret --binding DEV_SHOW_CODE=1），再
#   uv run --with playwright python tools/e2e-games-browser.py
import sys, urllib.request
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8999'
results = []


def check(name, ok, extra=''):
    results.append(bool(ok))
    print(('✓ ' if ok else '✗ ') + name + ((' → ' + str(extra)) if not ok else ''))


GAMES = [
    ('/huochai', '火柴棒等式题：', '火柴棒等式题', '火柴'),
    ('/mima', '密码推理题：', '密码推理题', '密码'),
    ('/migong', '儿童迷宫打印：', '儿童迷宫', '迷宫'),
    ('/zhizhi', '数织游戏：', '数织游戏', '数织'),
]

# ---------- 源码（不跑脚本）----------
for path, title, h1, _ in GAMES:
    resp = urllib.request.urlopen(BASE + path)
    raw = resp.read().decode('utf-8')
    check(path + ' 源码：标题、描述、canonical、H1、介绍文字、常见问题都在', all(x in raw for x in [
        '<title>' + title, 'name="description"', '<link rel="canonical" href="https://zhihebi.com' + path + '"',
        '<h1 class="work-title">' + h1, 'class="board-intro"', '常见问题']))
    check(path + ' 可收录（没有 noindex）', 'noindex' not in (resp.headers.get('x-robots-tag') or '') and 'noindex' not in raw)

sitemap = urllib.request.urlopen(BASE + '/sitemap.xml').read().decode('utf-8')
check('站点地图列上了四个游戏页', all('https://zhihebi.com' + g[0] + '<' in sitemap for g in GAMES))

with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []
    for path, _, _, short in GAMES:
        ctx = br.new_context(viewport={'width': 1440, 'height': 900})
        page = ctx.new_page()
        page.on('pageerror', lambda e, path=path: errs.append(path + ' ' + str(e)))
        resp = page.goto(BASE + path)
        page.wait_for_selector('#preview .sheet', timeout=15000)
        page.evaluate("document.querySelectorAll('dialog.help-dialog[open]').forEach(d => d.close())")
        check(path + ' 没登录 → 200、原网址、出题了', resp.status == 200 and page.url.startswith(BASE + path) and page.query_selector('.lk-card') is None)
        check(path + ' 纸上没有二维码', page.query_selector('.sheet-qr') is None)
        check(path + ' 提示条「不用登录就能出题、打印」', page.is_visible('[data-guest-note]'))
        before = page.inner_html('#preview')
        page.click('#btn-regen')
        page.wait_for_timeout(300)
        check(path + ' 「重新生成」换了一批', page.inner_html('#preview') != before)
        page.evaluate("window.dispatchEvent(new Event('beforeprint'))")
        t = page.title()
        page.evaluate("window.dispatchEvent(new Event('afterprint'))")
        check(path + ' 打印文件名用短名', t.startswith(short + ' · 纸和笔'), t)
        page.wait_for_timeout(800)
        keys = page.evaluate("Object.keys(localStorage).filter(k => k.indexOf('sumsum:sheet:v1:') === 0)")
        check(path + ' 没登录打印不记录', not keys, keys)
        page.emulate_media(media='print')
        check(path + ' 打印时介绍文字、提示条不上纸', not page.is_visible('.board-intro') and not page.is_visible('[data-guest-note]'))
        page.emulate_media(media='screen')
        mark = page.query_selector('#btn-mark')
        if mark:
            mark.click()
            page.wait_for_selector('dialog.account-dialog[open] form[data-view="login"]', timeout=5000)
            check(path + ' 点「打分」→ 弹出登录框', True)
        else:
            check(path + ' 有「打分」按钮', False)

        if path == '/migong':
            for lv in ['L1', 'L2', 'L3', 'L4']:
                page.goto(BASE + '/migong?level=' + lv + '&answerPage=true&count=2')
                page.wait_for_selector('#preview .migong-svg', timeout=10000)
                n_q = len(page.query_selector_all('.sheet-migong .migong-svg'))
                n_route = len(page.query_selector_all('.sheet-migong .migong-route'))
                n_ans = len(page.query_selector_all('.sheet-migong-ans .migong-route'))
                check('迷宫 ' + lv + '：题卷有迷宫、没红线，答案页每张一条红线', n_q >= 2 and n_route == 0 and n_ans == 2, [n_q, n_route, n_ans])
            for lv in ['L1', 'L2', 'L3', 'L4']:  # 一页两张的小迷宫、一页一张的大迷宫，最后一张都在页脚上面
                page.goto(BASE + '/migong?level=' + lv + '&count=2&copies=1')
                page.wait_for_selector('#preview .migong-svg', timeout=10000)
                r = page.evaluate("""() => { const s = document.querySelector('.sheet-migong'); const it = s.querySelectorAll('.migong-item');
                  return [it[it.length - 1].getBoundingClientRect().bottom, s.querySelector('.sheet-foot').getBoundingClientRect().top] }""")
                check('迷宫 ' + lv + ' 放得进一页纸（屏幕预览）', r[0] <= r[1], r)
        ctx.close()
    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
