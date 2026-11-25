# 奥数前三课公开（2026-11-25）浏览器验收：
#   1. 源码：标题、描述、canonical、H1、介绍文字、全部课程表都写在网页里，可收录；站点地图有 /aoshu；
#   2. 没登录：打开是默认的第 03 课（有视频），纸上没二维码；前三课能切换，后面的课挂锁，点了进试看；
#      ?topic=后面的课 → 这一课的试看；没有综合复习；H1 不被脚本改掉；
#   3. 第 03 课视频没登录能看，其他课视频 403；
#   4. 完整版账号：全部课都开，没有锁，有综合复习，H1 换成课名；
#   5. 全程没有脚本报错。
# 用法：本机预览跑着（npx wrangler pages dev . --port 8999 --binding SESSION_SECRET=dev-secret --binding DEV_SHOW_CODE=1），
#   本机 R2 放 lianxizhi-video/aoshu/yiduobushao.mp4（随便一个 mp4），再
#   uv run --with playwright python tools/e2e-aoshu-free-browser.py
import json, random, string, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'lianxizhi', '--local', '--command',
                "DELETE FROM limits WHERE scope LIKE 'ip%' OR scope = 'all'"], capture_output=True)

BASE = 'http://127.0.0.1:8999'
results = []


def check(name, ok, extra=''):
    results.append(bool(ok))
    print(('✓ ' if ok else '✗ ') + name + ((' → ' + str(extra)) if not ok else ''))


def make_invite():
    code = ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'lianxizhi', '--local', '--command',
                    f"INSERT INTO invites(id,code,note,created_at) VALUES ('e2e-{code}','{code}','e2e',0)"],
                   check=True, capture_output=True)
    return code


def close_dialogs(page):
    page.evaluate("document.querySelectorAll('dialog[open]').forEach(d => d.close())")


resp = urllib.request.urlopen(BASE + '/aoshu')
raw = resp.read().decode('utf-8')
check('源码：标题、描述、canonical、H1、介绍、课程表都在', all(x in raw for x in [
    '<title>小学奥数思维题：', 'name="description"', '<link rel="canonical" href="https://zhihebi.com/aoshu"',
    '<h1 class="work-title" id="lesson-title">小学奥数思维题</h1>', '一课一个思维方法', 'class="bi-lessons"', '移多补少（基础篇）']))
check('可收录（没有 noindex）', 'noindex' not in raw and 'noindex' not in (resp.headers.get('x-robots-tag') or ''))
check('站点地图有 /aoshu', 'https://zhihebi.com/aoshu<' in urllib.request.urlopen(BASE + '/sitemap.xml').read().decode('utf-8'))

with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []

    # ---------- 没登录 ----------
    ctx = br.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errs.append('游客 ' + str(e)))
    page.goto(BASE + '/aoshu')
    page.wait_for_selector('#preview .sheet', timeout=15000)
    close_dialogs(page)
    st = page.evaluate("""() => ({
      h1: document.getElementById('lesson-title').textContent,
      cur: (document.querySelector('#topic-list .tp.cur .nm') || {}).textContent,
      sum: document.getElementById('work-sum').textContent,
      qr: !!document.querySelector('#preview .sheet-qr'),
      guest: !document.querySelector('[data-guest-note]').hidden,
      review: getComputedStyle(document.querySelector('[data-review-group]')).display,
      shut: document.querySelectorAll('#topic-list .tp.shut').length,
      open: [...document.querySelectorAll('#topic-list .tp:not(.shut) .nm')].map(e => e.textContent)
    })""")
    check('没登录打开是默认的第 03 课（有视频），H1 保持「小学奥数思维题」，课名在顶栏小字', st['cur'] == '移多补少（基础篇）' and st['h1'] == '小学奥数思维题' and '第 03 课' in st['sum'], st)
    check('纸上没二维码，有「不用登录」提示', not st['qr'] and st['guest'], st)
    check('没有综合复习', st['review'] == 'none', st['review'])
    check('L1 目录：前三课开、后面 17 课挂锁', st['open'] == ['数的大小比较', '凑十、平十和破十', '移多补少（基础篇）'] and st['shut'] == 17, st)
    page.click('#topic-list [data-pick="daxiao"]')
    page.wait_for_timeout(300)
    check('切到第 01 课能出题', '第 01 课' in page.inner_text('#work-sum'))
    page.click('#topic-list [data-pick="yiduobushao"]')
    page.wait_for_selector('#video-group video', timeout=5000)
    check('切回第 03 课：出题、有讲解视频', '移多补少' in page.inner_text('#preview'))
    vs = page.evaluate("fetch(document.querySelector('#video-group video').src, {headers: {Range: 'bytes=0-'}}).then(r => r.status)")
    check('第 03 课视频没登录能播', vs in (200, 206), vs)
    check('其他课视频没登录 403', page.evaluate("fetch('/v/aoshu/xulie.mp4').then(r => r.status)") == 403)
    # 后面的课：试看（2026-11-25 起，细节见 tools/e2e-aoshu-trial-browser.py）
    page.click('#topic-list [data-pick="yiduobushao2"]')
    page.wait_for_selector('#trial-bar', timeout=5000)
    check('点挂锁的课 → 进试看，不弹框', page.query_selector('dialog.account-dialog[open]') is None and '试看' in page.inner_text('#trial-bar'))
    page.goto(BASE + '/aoshu')
    page.wait_for_selector('#preview .sheet', timeout=15000)
    close_dialogs(page)
    check('再打开奥数页回到能打印的课（试看课不存）', page.query_selector('#trial-bar') is None and page.query_selector('#topic-list .tp.cur .nm').text_content() == '移多补少（基础篇）')
    page.goto(BASE + '/aoshu?topic=xulie')
    page.wait_for_selector('#trial-bar', timeout=15000)
    close_dialogs(page)
    check('?topic=后面的课 → 这一课的试看', page.query_selector('#topic-list .tp.cur .nm').text_content() == '数列找规律')
    page.locator('.board-intro').screenshot(path='/tmp/aoshu-intro.png')
    page.screenshot(path='/tmp/aoshu-guest.png')
    check('侧栏奥数不挂锁', page.query_selector('.rail-link.is-locked[data-module="奥数"]') is None)
    ctx.close()

    # ---------- 完整版 ----------
    c2 = br.new_context(viewport={'width': 1440, 'height': 900})
    p2 = c2.new_page()
    p2.on('pageerror', lambda e: errs.append('完整版 ' + str(e)))
    codes = []
    p2.on('response', lambda r: codes.append(r) if r.url.endswith('/api/auth/register') else None)
    p2.goto(BASE + '/')
    p2.click('[data-wl-signup]')
    p2.fill('form[data-view="register"] input[name="email"]', 'aof-%d@test.local' % int(time.time()))
    p2.fill('form[data-view="register"] input[name="password"]', 'password123')
    p2.fill('form[data-view="register"] input[name="invite"]', make_invite())
    p2.click('form[data-view="register"] [data-act="submit"]')
    p2.wait_for_selector('.code-box', timeout=30000)
    for box, dg in zip(p2.query_selector_all('.code-box'), json.loads(codes[-1].text())['dev_code']):
        box.type(dg)
    p2.wait_for_selector('.rail', timeout=30000)
    time.sleep(3)
    p2.goto(BASE + '/aoshu?topic=xulie')
    p2.wait_for_selector('#preview .sheet', timeout=15000)
    close_dialogs(p2)
    st2 = p2.evaluate("""() => ({
      h1: document.getElementById('lesson-title').textContent,
      shut: document.querySelectorAll('#topic-list .tp.shut').length,
      review: getComputedStyle(document.querySelector('[data-review-group]')).display,
      notice: document.getElementById('notice').hidden
    })""")
    check('完整版：没有锁、能直接上第 08 课、有综合复习、H1 是课名', st2['shut'] == 0 and st2['review'] != 'none' and st2['notice'] and '数列找规律' in st2['h1'], st2)
    c2.close()
    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
