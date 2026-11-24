# 凑十法内页 /kousuan/coushifa（2026-11-24）浏览器验收：
#   1. 没登录打开 → 200，H1、介绍文字写在网页里；出的是凑十法的题（默认 10 的好朋友 + 凑十法，不出破十、平十）；
#      不显示奥数目录、综合复习、空的视频框；有「不用登录」提示、纸上没二维码；页面资源全部加载成功；
#   2. /coushifa（文件自己的网址）→ 301 到 /kousuan/coushifa；
#   3. 不动奥数页的设置（奥数页记着的那一课不变）；
#   4. 免费版账号能打开；纸上有二维码。
# 用法：本机预览跑着（见 e2e-free-browser.py），再
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-coushifa-browser.py
import json, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'lianxizhi', '--local', '--command',
                "DELETE FROM limits WHERE scope LIKE 'ip%' OR scope = 'all'"], capture_output=True)

BASE = 'http://127.0.0.1:8999'
results = []


def check(name, ok, extra=''):
    results.append(bool(ok))
    print(('✓ ' if ok else '✗ ') + name + ((' → ' + str(extra)) if not ok else ''))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


raw = urllib.request.urlopen(BASE + '/kousuan/coushifa').read().decode('utf-8')
check('网页源码里就有 H1 和介绍文字（给搜索引擎）', '<h1 class="work-title" id="lesson-title">凑十法练习题</h1>' in raw and '先背熟 10 的好朋友' in raw)
check('正式网址写在 canonical 里', 'href="https://zhihebi.com/kousuan/coushifa"' in raw)
try:
    urllib.request.build_opener(NoRedirect).open(BASE + '/coushifa?a=1')
    check('/coushifa → 301', False)
except urllib.error.HTTPError as e:
    check('/coushifa → 301 到 /kousuan/coushifa', e.code == 301 and e.headers.get('Location') == '/kousuan/coushifa?a=1', [e.code, e.headers.get('Location')])

with sync_playwright() as p:
    br = p.chromium.launch()
    errs, bad = [], []
    ctx = br.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.on('response', lambda r: bad.append(r.url + ' ' + str(r.status)) if r.status >= 400 else None)
    page.goto(BASE + '/aoshu?topic=xulie')  # 没登录会被带回首页；只为在本机存一份「奥数页设置」做对照
    page.evaluate("localStorage.setItem('sumsum:aoshu:v1', JSON.stringify({ topic: 'xulie' }))")
    page.goto(BASE + '/kousuan/coushifa')
    page.wait_for_selector('#preview .sheet', timeout=15000)
    page.evaluate("document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    st = page.evaluate("""() => ({
      h1: document.getElementById('lesson-title').textContent,
      nav: getComputedStyle(document.querySelector('.topic-nav')).display,
      review: getComputedStyle(document.querySelector('[data-review-group]')).display,
      video: document.getElementById('video-group').hidden,
      guest: !document.querySelector('[data-guest-note]').hidden,
      qr: !!document.querySelector('#preview .sheet-qr'),
      text: document.getElementById('preview').innerText,
      railOn: (document.querySelector('.rail-link.active') || {}).textContent,
      aoshu: JSON.parse(localStorage.getItem('sumsum:aoshu:v1') || '{}').topic
    })""")
    check('H1 没被脚本改掉', st['h1'] == '凑十法练习题', st['h1'])
    check('不显示奥数目录、综合复习、空的视频框', st['nav'] == 'none' and st['review'] == 'none' and st['video'], st)
    check('没登录：有「不用登录」提示，纸上没二维码', st['guest'] and not st['qr'], st)
    check('出的是凑十法的题', '凑十法' in st['text'] or '10 的好朋友' in st['text'], st['text'][:200])
    check('默认不出破十法、平十法', '破十法算一算' not in st['text'] and '平十法算一算' not in st['text'])
    check('侧栏亮的是口算', (st['railOn'] or '').strip() == '口算', st['railOn'])
    check('不动奥数页记着的那一课', st['aoshu'] == 'xulie', st['aoshu'])
    check('页面资源全部加载成功（没有 404）', not bad, bad)
    page.screenshot(path='/tmp/coushifa.png', full_page=False)
    page.evaluate("window.scrollTo(0, 0)")
    page.locator('.board-intro').screenshot(path='/tmp/coushifa-intro.png')

    # 换题型：勾上破十法，刷新后还记着（单独存）
    page.click('#variant-list input[type="checkbox"] >> nth=2')
    page.reload()
    page.wait_for_selector('#preview .sheet', timeout=15000)
    page.evaluate("document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    on = page.eval_on_selector_all('#variant-list input[type="checkbox"]', 'els => els.map(e => e.checked)')
    check('改过的题型刷新后还记着', on[2] is True, on)
    # 免费版账号：能打开，纸上有二维码
    c2 = br.new_context(viewport={'width': 1440, 'height': 900})
    p2 = c2.new_page()
    p2.on('pageerror', lambda e: errs.append('免费版 ' + str(e)))
    codes = []
    p2.on('response', lambda r: codes.append(r) if r.url.endswith('/api/auth/register') else None)
    p2.goto(BASE + '/')
    p2.wait_for_selector('[data-wl-signup]', timeout=10000)
    p2.click('[data-wl-signup]')
    p2.fill('form[data-view="register"] input[name="email"]', 'csf-%d@test.local' % int(time.time()))
    p2.fill('form[data-view="register"] input[name="password"]', 'password123')
    p2.click('form[data-view="register"] [data-act="submit"]')
    p2.wait_for_selector('.code-box', timeout=30000)
    for box, dg in zip(p2.query_selector_all('.code-box'), json.loads(codes[-1].text())['dev_code']):
        box.type(dg)
    p2.wait_for_selector('#today-cards .dk-shelf', timeout=30000)
    p2.goto(BASE + '/kousuan/coushifa')
    p2.wait_for_selector('#preview .sheet', timeout=15000)
    check('免费版能打开凑十法页，纸上有二维码', p2.query_selector('.lk-card') is None and p2.query_selector('#preview .sheet-qr') is not None)
    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
