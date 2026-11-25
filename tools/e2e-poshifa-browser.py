# 破十法内页 /kousuan/poshifa（2026-11-25）浏览器验收：
#   1. 网页源码里有 H1、介绍文字、canonical；/poshifa（文件自己的网址）301 到正式网址；
#   2. 没登录打开：默认出 10 的好朋友 + 破十法，不出凑十法、平十法；没二维码；不显示奥数目录；
#   3. 跟凑十法页各记各的设置（同是奥数第 02 课）；口算页快速预设、凑十法页都链过来；
#   4. 全程没有脚本报错、没有 404。
# 用法：本机预览跑着（npx wrangler pages dev . --port 8999 ...），再
#   uv run --with playwright python tools/e2e-poshifa-browser.py
import sys, urllib.request, urllib.error
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8999'
results = []


def check(name, ok, extra=''):
    results.append(bool(ok))
    print(('✓ ' if ok else '✗ ') + name + ((' → ' + str(extra)) if not ok else ''))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


raw = urllib.request.urlopen(BASE + '/kousuan/poshifa').read().decode('utf-8')
check('源码里有 H1、介绍文字、canonical、标题', all(x in raw for x in [
    '<h1 class="work-title" id="lesson-title">破十法练习题</h1>', '先熟 10 的分解',
    'href="https://zhihebi.com/kousuan/poshifa"', '<title>破十法练习题：']))
check('可收录（没有 noindex）', 'noindex' not in raw)
try:
    urllib.request.build_opener(NoRedirect).open(BASE + '/poshifa?a=1')
    check('/poshifa → 301', False)
except urllib.error.HTTPError as e:
    check('/poshifa → 301 到 /kousuan/poshifa', e.code == 301 and e.headers.get('Location') == '/kousuan/poshifa?a=1', [e.code, e.headers.get('Location')])
sm = urllib.request.urlopen(BASE + '/sitemap.xml').read().decode('utf-8')
check('站点地图里有破十法页', 'https://zhihebi.com/kousuan/poshifa<' in sm)

with sync_playwright() as p:
    br = p.chromium.launch()
    errs, bad = [], []
    ctx = br.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.on('response', lambda r: bad.append(r.url + ' ' + str(r.status)) if r.status >= 400 else None)
    page.goto(BASE + '/kousuan/poshifa')
    page.wait_for_selector('#preview .sheet', timeout=15000)
    page.evaluate("document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    st = page.evaluate("""() => ({
      h1: document.getElementById('lesson-title').textContent,
      nav: getComputedStyle(document.querySelector('.topic-nav')).display,
      guest: !document.querySelector('[data-guest-note]').hidden,
      qr: !!document.querySelector('#preview .sheet-qr'),
      text: document.getElementById('preview').innerText,
      on: [...document.querySelectorAll('#variant-list input[type=checkbox]')].map(e => e.checked)
    })""")
    check('H1 没被脚本改掉', st['h1'] == '破十法练习题', st['h1'])
    check('不显示奥数目录；有「不用登录」提示；纸上没二维码', st['nav'] == 'none' and st['guest'] and not st['qr'], st)
    check('默认题型：10 的好朋友 + 破十法', st['on'] == [True, False, True, False], st['on'])
    check('出了破十法的题', '用破十法算一算' in st['text'], st['text'][:200])
    check('不出凑十法、平十法', '凑十法算一算' not in st['text'] and '平十法算一算' not in st['text'])
    page.evaluate("window.dispatchEvent(new Event('beforeprint'))")
    t = page.title()
    page.evaluate("window.dispatchEvent(new Event('afterprint'))")
    check('打印文件名是「破十法练习」', t.startswith('破十法练习'), t)
    page.screenshot(path='/tmp/poshifa.png', full_page=False)
    page.locator('.board-intro').screenshot(path='/tmp/poshifa-intro.png')

    # 跟凑十法页各记各的
    page.goto(BASE + '/kousuan/coushifa')
    page.wait_for_selector('#preview .sheet', timeout=15000)
    page.evaluate("document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    on = page.eval_on_selector_all('#variant-list input[type="checkbox"]', 'els => els.map(e => e.checked)')
    check('凑十法页默认照旧（10 的好朋友 + 凑十法），没被破十法页带偏', on == [True, True, False, False], on)
    check('凑十法页链到破十法页', page.query_selector('.board-intro a[href="/kousuan/poshifa"]') is not None)
    page.goto(BASE + '/kousuan')
    page.wait_for_selector('#preset-row', timeout=15000)
    check('口算页快速预设里有「破十法练习题」', page.query_selector('#preset-row a.preset-link[href="/kousuan/poshifa"]') is not None)
    check('口算页介绍里链到破十法页', page.query_selector('.board-intro a[href="/kousuan/poshifa"]') is not None)
    page.goto(BASE + '/')
    check('首页页脚列出破十法页', page.query_selector('footer.sf a[href="/kousuan/poshifa"]') is not None)
    check('全程没有脚本报错', not errs, errs)
    check('页面资源全部加载成功（没有 404）', not bad, bad)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
