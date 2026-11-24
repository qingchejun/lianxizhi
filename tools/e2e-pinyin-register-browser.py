# 拼音登记说法（2026-11-24）浏览器验收：
#   1. 收尾按钮写「登记好了，下一组 / 收工」，上面一行「没点按钮的题，都记为读对了」；
#   2. 一道不点就登记 → 分组状态「全对」；点了「没读出」→「1 题卡住」；
#   3. 选做的组（试一试 / 换题再试）有「这组没做」，点了状态「没做」，不算全对。
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


def steps(page):
    return page.eval_on_selector_all('.py-step', 'els => els.map(e => [e.querySelector(".py-step-main b").textContent, e.querySelector(".py-step-st").textContent])')


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
    page.wait_for_selector('.py-steps', timeout=15000)
    page.evaluate("document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    print('分组：', steps(page))
    check('收尾按钮写「登记好了」', '登记好了' in page.inner_text('.py-group-foot [data-action="next"]'), page.inner_text('.py-group-foot'))
    check('按钮上面说明没点的题记为读对', '没点按钮的题，都记为读对了' in page.inner_text('.py-now'))
    check('普通组没有「这组没做」', page.query_selector('.py-group-foot [data-action="skip"]') is None)

    # 第 1 组一道不点 → 全对
    page.click('.py-group-foot [data-action="next"]')
    st = steps(page)
    check('一道不点就登记 → 第 1 组「全对」', st[0][1] == '全对', st)

    # 依次往下：普通组点「没读出」一题；遇到选做组点「这组没做」
    saw_stuck = saw_skip = False
    for _ in range(10):
        if not page.query_selector('.py-now'):
            break
        is_opt = page.query_selector('.py-group-foot [data-action="skip"]') is not None
        title = page.inner_text('.py-now .group-title')
        if is_opt:
            page.click('.py-group-foot [data-action="skip"]')
            row = [s for s in steps(page) if title.split(' · ')[-1] in s[0]]
            check('选做组「' + title + '」点「这组没做」→ 状态「没做」', row and row[0][1] == '没做', steps(page))
            saw_skip = True
        else:
            page.click('.py-rows .py-row:first-child [data-mark="miss"]')
            page.click('.py-group-foot [data-action="next"]')
            if not saw_stuck:
                check('点了一题「没读出」→「1 题卡住」', any(s[1] == '1 题卡住' for s in steps(page)), steps(page))
                saw_stuck = True
    check('走完一张卷', page.query_selector('.py-done') is not None)
    if not saw_skip:
        print('（这张卷没轮到选做组，跳过「这组没做」检查）')
    page.screenshot(path='/tmp/pinyin-register.png')
    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
