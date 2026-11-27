# 奥数试看（2026-11-25）浏览器验收：
#   1. 没登录：点第 05 课（没视频）→ 试看条、讲解页完整、练习只有前 2 道真题（后面是占位、网页里没有题目文字）、
#      解析只有第 1 题；打印按钮换成「开通完整版」、点了不弹打印；没有「标记为已学」；纸上没二维码；
#      Ctrl+P 打印样式下纸张整块隐藏；改难度后照样是试看；
#   2. 带视频的课（第 08 课）：视频区只有封面和锁，没有 <video>；
#   3. 免费版账号：试看条里有邀请码输入框和「开通时通知我」，点了登记成「已登记」；不印二维码、没有打分按钮；
#      前三课照常能打印；「接着学」学完前三课后指向第 04 课（试看）；
#   4. 完整版账号：没有试看条，能打印，有二维码；
#   5. 全程没有脚本报错。
# 用法：本机预览跑着（npx wrangler pages dev . --port 8999 --binding SESSION_SECRET=dev-secret --binding DEV_SHOW_CODE=1），再
#   uv run --with playwright python tools/e2e-aoshu-trial-browser.py
import json, random, string, subprocess, sys, time
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


def close_dialogs(page):
    page.evaluate("document.querySelectorAll('dialog[open]').forEach(d => d.close())")


def register(page, email, invite=''):
    codes = []
    page.on('response', lambda r: codes.append(r) if r.url.endswith('/api/auth/register') else None)
    page.goto(BASE + '/')
    page.click('[data-wl-signup]')
    page.fill('form[data-view="register"] input[name="email"]', email)
    page.fill('form[data-view="register"] input[name="password"]', 'password123')
    if invite:
        page.fill('form[data-view="register"] input[name="invite"]', invite)
    page.click('form[data-view="register"] [data-act="submit"]')
    page.wait_for_selector('.code-box', timeout=30000)
    for box, dg in zip(page.query_selector_all('.code-box'), json.loads(codes[-1].text())['dev_code']):
        box.type(dg)
    page.wait_for_selector('.rail', timeout=30000)
    time.sleep(2)


STATE = """() => ({
  bar: !!document.getElementById('trial-bar'),
  barText: (document.getElementById('trial-bar') || {}).innerText || '',
  lesson: document.querySelectorAll('#preview [data-kind=lesson]').length,
  realQ: document.querySelectorAll('#preview .aq:not(.trial-lock)').length,
  lockQ: document.querySelectorAll('#preview .aq.trial-lock').length,
  realSol: document.querySelectorAll('#preview .sol:not(.trial-lock)').length,
  lockSol: document.querySelectorAll('#preview .sol.trial-lock').length,
  lockText: [...document.querySelectorAll('#preview .trial-lock')].map(e => e.innerText).join('|'),
  print: document.getElementById('btn-print').textContent.trim(),
  learned: getComputedStyle(document.getElementById('btn-learned')).display,
  mark: (() => { const m = document.getElementById('btn-mark'); return !!m && getComputedStyle(m).display !== 'none' })(),
  qr: !!document.querySelector('#preview .sheet-qr'),
  video: !!document.querySelector('#video-group video'),
  videoLocked: !!document.querySelector('#video-group .video-locked'),
  trialClass: document.documentElement.classList.contains('aoshu-trial'),
  url: location.search
})"""

with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []

    # ---------- 没登录 ----------
    ctx = br.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errs.append('游客 ' + str(e)))
    page.add_init_script("window.__printed = 0; window.print = () => { window.__printed++ }")
    page.goto(BASE + '/aoshu')
    page.wait_for_selector('#preview .sheet', timeout=15000)
    close_dialogs(page)
    page.click('#topic-list [data-pick="tianfu"]')
    page.wait_for_selector('#trial-bar', timeout=5000)
    st = page.evaluate(STATE)
    check('游客点第 05 课 → 试看条，写明第 05 课', st['bar'] and '第 05 课' in st['barText'] and '试看' in st['barText'], st['barText'][:80])
    check('讲解页完整', st['lesson'] >= 1, st)
    check('练习页只有前 2 道真题，后面是占位', st['realQ'] == 2 and st['lockQ'] >= 1, st)
    check('解析页只有第 1 题，后面是占位', st['realSol'] == 1 and st['lockSol'] >= 1, st)
    check('占位框里没有题目文字', all(('○' not in t and '=' not in t) for t in st['lockText'].split('|')), st['lockText'][:120])
    check('打印按钮换成「开通完整版」', st['print'] == '开通完整版', st['print'])
    page.click('#btn-print')
    page.wait_for_timeout(300)
    check('点「开通完整版」不弹打印', page.evaluate('window.__printed') == 0)
    check('没有「标记为已学」，纸上没二维码', st['learned'] == 'none' and not st['qr'], st)
    check('网址带上课号', st['url'] == '?topic=tianfu', st['url'])
    check('游客按钮写「注册，开通时通知我」', '注册，开通时通知我' in st['barText'])
    page.emulate_media(media='print')
    check('打印样式下纸张整块隐藏', page.evaluate("getComputedStyle(document.getElementById('preview')).display") == 'none')
    page.emulate_media(media='screen')
    page.click('#btn-regen')
    page.wait_for_timeout(300)
    st = page.evaluate(STATE)
    check('换一批后照样是试看', st['bar'] and st['realQ'] == 2, st)
    page.click('#topic-list [data-pick="xulie"]')
    page.wait_for_timeout(500)
    st = page.evaluate(STATE)
    check('带视频的第 08 课：只有封面和锁，没有视频播放器', st['videoLocked'] and not st['video'], st)
    page.click('#topic-list [data-pick="yiduobushao"]')
    page.wait_for_timeout(500)
    st = page.evaluate(STATE)
    check('回到第 03 课：试看条消失，能打印，视频能播', not st['bar'] and not st['trialClass'] and st['print'] == '打印' and st['video'], st)
    page.click('#btn-print')
    check('第 03 课点打印会打印', page.evaluate('window.__printed') == 1)
    page.screenshot(path='/tmp/shots/trial-guest.png')
    ctx.close()

    # ---------- 免费版 ----------
    c2 = br.new_context(viewport={'width': 1440, 'height': 900})
    p2 = c2.new_page()
    p2.on('pageerror', lambda e: errs.append('免费版 ' + str(e)))
    em2 = 'trial-%d@test.local' % int(time.time())
    register(p2, em2)
    # 2026-11-27 起新注册送 7 天完整版：这里测的是体验结束后的免费版，先把体验改成已结束
    subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'lianxizhi', '--local', '--command',
                    "UPDATE users SET full_until = 1 WHERE email = '%s'" % em2], check=True, capture_output=True)
    p2.goto(BASE + '/aoshu?topic=shuzimi')
    p2.wait_for_selector('#trial-bar', timeout=15000)
    close_dialogs(p2)
    st = p2.evaluate(STATE)
    check('免费版：试看条里有邀请码输入框', p2.query_selector('#trial-bar form[data-redeem] input[name=invite]') is not None)
    check('免费版：不印二维码、没有打分按钮', not st['qr'] and not st['mark'], st)
    p2.click('[data-trial-want]')
    p2.wait_for_function("document.querySelector('[data-trial-want]').textContent === '已登记'", timeout=10000)
    check('免费版：点「开通时通知我」→ 已登记', '告诉你' in p2.inner_text('[data-trial-want-msg]'))
    p2.click('#btn-regen')
    p2.wait_for_timeout(300)
    check('换一批后「已登记」还在', p2.inner_text('[data-trial-want]') == '已登记')
    p2.screenshot(path='/tmp/shots/trial-free.png')
    # 学完前三课 → 「接着学」指向第 04 课（试看）
    p2.evaluate("SumSum.store.set('sumsum:aoshu:learned:v1', ['daxiao','coushi','yiduobushao'])")
    p2.goto(BASE + '/aoshu')
    p2.wait_for_selector('#preview .sheet', timeout=15000)
    close_dialogs(p2)
    nxt = p2.inner_text('#btn-next')
    check('免费版学完前三课：「接着学」指向第 04 课（试看）', '04' in nxt and '试看' in nxt, nxt)
    st = p2.evaluate(STATE)
    check('免费版打开奥数页不自动落在试看课', not st['bar'], st)
    check('免费版前三课纸上有二维码', st['qr'], st)
    c2.close()

    # ---------- 完整版 ----------
    c3 = br.new_context(viewport={'width': 1440, 'height': 900})
    p3 = c3.new_page()
    p3.on('pageerror', lambda e: errs.append('完整版 ' + str(e)))
    register(p3, 'trialf-%d@test.local' % int(time.time()), make_invite())
    p3.goto(BASE + '/aoshu?topic=tianfu')
    p3.wait_for_selector('#preview .sheet', timeout=15000)
    close_dialogs(p3)
    st = p3.evaluate(STATE)
    check('完整版：没有试看条、能打印、练习题全在、有二维码', not st['bar'] and st['print'] == '打印' and st['lockQ'] == 0 and st['qr'], st)
    c3.close()

    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
