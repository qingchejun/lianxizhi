# 拼音打分（2026-11-27 改版）浏览器验收：右边「打分」是和扫码打分页同一张卡——
#   1. 没选时「提交」是灰的；选「全对」提交 → 独立组每题 ok，选做组（试一试 / 换题再试）记没做，不算读对；
#   2. 「改一下」点一题再提交 → 那题 miss，状态「卡住 1 题」，跟着它的「换题再试」组算做过；
#   3. 没有旧的「登记好了 / 这组没做 / 做到一半停了」。
# 用法：本机预览跑着（见 e2e-free-browser.py），再
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-pinyin-register-browser.py
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


def marks(page):
    return page.evaluate("""() => {
      const out = {}
      for (const k of Object.keys(localStorage)) if (k.startsWith('sumsum:pinyin:mark:v1:')) out[k.split(':').pop()] = JSON.parse(localStorage.getItem(k)).result
      return out
    }""")


with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []
    page = br.new_page(viewport={'width': 1440, 'height': 900})
    page.on('pageerror', lambda e: errs.append(str(e)))
    codes = []
    page.on('response', lambda r: codes.append(r) if r.url.endswith('/api/auth/register') else None)
    page.goto(BASE + '/')
    page.wait_for_selector('[data-wl-signup]', timeout=10000)
    page.click('[data-wl-signup]')
    page.fill('form[data-view="register"] input[name="email"]', f'py-{int(time.time())}@test.local')
    page.fill('form[data-view="register"] input[name="password"]', 'password123')
    page.fill('form[data-view="register"] input[name="invite"]', make_invite())
    page.click('form[data-view="register"] [data-act="submit"]')
    page.wait_for_selector('.code-box', timeout=30000)
    for box, d in zip(page.query_selector_all('.code-box'), json.loads(codes[-1].text())['dev_code']):
        box.type(d)
    page.wait_for_selector('#today-cards .dk-shelf', timeout=30000)

    page.goto(BASE + '/pinyin')
    page.wait_for_selector('#py-rate .rate', timeout=15000)
    page.evaluate("document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    text = page.inner_text('#pinyin-view')
    check('没有旧的登记按钮', '登记好了' not in text and '这组没做' not in text and '做到一半' not in text, text[:300])
    check('没选时「提交」是灰的', page.is_disabled('#py-rate [data-rate-submit]'))
    units = page.evaluate("[...document.querySelectorAll('#py-rate .rate-unit')].map(e => e.textContent)")
    print('分组：', units)
    page.click('#py-rate [data-rate-all]')
    page.click('#py-rate [data-rate-submit]')
    mk = marks(page)
    check('全对 → 有题记 ok', 'ok' in mk.values(), mk)
    check('全对 → 没有 miss', 'miss' not in mk.values(), mk)
    has_opt = any(('试一试' in u or '换题再试' in u) for u in units)
    if has_opt:
        check('全对 → 选做组记没做', 'unpracticed' in mk.values(), mk)
    check('显示「已打分：全对」', '已打分：全对' in page.inner_text('#py-rate'))

    page.click('#py-rate [data-rate-edit]')
    first = page.query_selector('#py-rate [data-rate-item]').get_attribute('data-rate-item')
    page.click('#py-rate [data-rate-item="%s"]' % first)
    page.click('#py-rate [data-rate-submit]')
    mk = marks(page)
    check('点的那题记 miss', mk.get(first) == 'miss', mk)
    check('显示「已打分：卡住 1 题」', '卡住 1 题' in page.inner_text('#py-rate'), page.inner_text('#py-rate'))
    check('有卡住的组，教学卡自动展开', page.query_selector('.py-teach[open]') is not None)
    page.screenshot(path='/tmp/pinyin-register.png')
    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
