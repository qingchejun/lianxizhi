# 奥数复习卷不再挡住讲解视频（2026-11-24）浏览器验收：
#   1. 打开复习卷 → 视频位置显示说明和「回到第 X 课」，点按钮回到那一课、视频出现；
#   2. 复习卷开着点左边课名（包括原来那一课）→ 退出复习卷、进那一课；
#   3. 复习卷开着刷新 / 重新打开 → 落在那一课；「今天」页的复习卷链接（review=true）照常进复习卷；
#   4. 复习卷勾的「混哪几课」退出后保留。
# 用法：本机预览跑着（见 e2e-free-browser.py），再
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-aoshu-review-browser.py
import json, random, subprocess, sys, time
from playwright.sync_api import sync_playwright

subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'lianxizhi', '--local', '--command',
                "DELETE FROM limits WHERE scope LIKE 'ip%' OR scope = 'all'"], capture_output=True)

BASE = 'http://127.0.0.1:8999'
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


def state(page):
    return page.evaluate("""() => ({
      title: document.getElementById('lesson-title').textContent,
      review: document.getElementById('f-review').checked,
      video: !!document.querySelector('#video-group video'),
      back: (document.querySelector('#video-group [data-act="back"]') || {}).textContent || '',
      note: (document.querySelector('#video-group .video-none') || {}).textContent || '',
      url: location.search
    })""")


with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []
    ctx = br.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errs.append(str(e)))

    # 带邀请码注册一个完整版账号
    codes = []
    page.on('response', lambda r: codes.append(r) if r.url.endswith('/api/auth/register') else None)
    page.goto(BASE + '/')
    page.wait_for_selector('.wl-auth form[data-view="login"]', timeout=10000)
    page.click('[data-wl-signup]')
    page.fill('form[data-view="register"] input[name="email"]', f'review-{int(time.time())}@test.local')
    page.fill('form[data-view="register"] input[name="password"]', 'password123')
    page.fill('form[data-view="register"] input[name="invite"]', make_invite())
    page.click('form[data-view="register"] [data-act="submit"]')
    page.wait_for_selector('.code-box', timeout=30000)
    code = json.loads(codes[-1].text())['dev_code']
    for box, d in zip(page.query_selector_all('.code-box'), code):
        box.type(d)
    page.wait_for_selector('#today-cards .dk-shelf', timeout=30000)

    # 进第 8 课（数列找规律，有视频）
    page.goto(BASE + '/aoshu?topic=xulie')
    page.wait_for_selector('#video-group video', timeout=15000)
    close_help(page)
    check('第 8 课有视频', state(page)['video'])

    # 打开复习卷
    page.check('#f-review')
    page.wait_for_function("document.getElementById('lesson-title').textContent === '综合复习卷'")
    st = state(page)
    check('复习卷：视频位置有说明，不是空的', '没有讲解视频' in st['note'] and not st['video'], st)
    check('复习卷：有「回到第 8 课（有视频）」', st['back'] == '回到第 08 课（有视频）', st)
    check('复习卷不进地址栏', 'review' not in st['url'].replace('reviewTopics', ''), st)

    # 勾一课进复习范围，退出后应保留
    page.click('#review-scope [data-scope-act="none"]')
    page.click('#scope-list input[type="checkbox"] >> nth=0')  # 勾完清单会重画，不能拿着旧元素再勾
    scope = page.evaluate("JSON.parse(localStorage.getItem('sumsum:aoshu:v1')).reviewTopics")

    # 点按钮回去
    page.click('#video-group [data-act="back"]')
    page.wait_for_selector('#video-group video', timeout=10000)
    st = state(page)
    check('点「回到第 8 课」→ 回到那一课、视频出现、开关取消', st['video'] and not st['review'] and '第 08 课' in st['title'], st)

    # 复习卷开着点左边原来那一课
    page.check('#f-review')
    page.wait_for_function("document.getElementById('lesson-title').textContent === '综合复习卷'")
    page.click('#topic-list [data-pick="xulie"]')
    page.wait_for_selector('#video-group video', timeout=10000)
    st = state(page)
    check('复习卷开着点原来那一课 → 退出复习卷', st['video'] and not st['review'] and '第 08 课' in st['title'], st)

    # 复习卷开着点另一课
    page.check('#f-review')
    page.wait_for_function("document.getElementById('lesson-title').textContent === '综合复习卷'")
    page.click('#topic-list [data-pick="dengliang"]')
    page.wait_for_function("document.getElementById('lesson-title').textContent.indexOf('等量代换') >= 0", timeout=10000)
    st = state(page)
    check('复习卷开着点另一课 → 进那一课、有视频', st['video'] and not st['review'], st)
    check('复习卷勾的几课保留', page.evaluate("JSON.parse(localStorage.getItem('sumsum:aoshu:v1')).reviewTopics") == scope, scope)

    # 复习卷开着刷新、重新从侧栏进
    page.check('#f-review')
    page.wait_for_function("document.getElementById('lesson-title').textContent === '综合复习卷'")
    page.reload()
    page.wait_for_selector('#video-group video', timeout=15000)
    close_help(page)
    st = state(page)
    check('复习卷开着刷新 → 落在那一课', not st['review'] and '等量代换' in st['title'], st)
    page.check('#f-review')
    page.wait_for_function("document.getElementById('lesson-title').textContent === '综合复习卷'")
    page.goto(BASE + '/aoshu')
    page.wait_for_selector('#video-group video', timeout=15000)
    close_help(page)
    st = state(page)
    check('从侧栏重新打开奥数 → 落在上次那一课', not st['review'] and '等量代换' in st['title'], st)

    # 「今天」页的复习卷链接
    page.goto(BASE + '/aoshu?review=true')
    page.wait_for_function("document.getElementById('lesson-title').textContent === '综合复习卷'", timeout=15000)
    close_help(page)
    st = state(page)
    check('链接带 review=true → 进复习卷', st['review'] and '没有讲解视频' in st['note'], st)

    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
