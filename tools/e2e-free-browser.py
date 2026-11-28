# 放开注册 · 免费版 / 会员（2026-11-24；11-27 改：注册送 7 天会员，识字、拼音对免费版开放每日一张）浏览器验收：
#   1. 不填邀请码注册 → 7 天体验期：账号里写「会员体验」，能看奥数视频；
#   2. 把体验改成已结束（本机 D1）→ 免费版：今天页摆识字、口算、拼音和游戏，会员功能列在下面；侧栏不挂锁；
#      识字每日一卷能用，单元检查 / 错字集 / 写字显示「会员功能」；拼音今日卷能用，专题 / 课程上锁；/admin 是上锁页；
#   3. 免费版看奥数视频 → 403；账号里补填错码报错，好码开通后识字单元检查能用、视频能播（含拖动进度条的分段请求）；
#   4. 带邀请码注册 → 直接会员；已注册的邮箱再注册 → 页面不暴露「注册过」；
#   5. 删除账号。
# 用法：先起本机预览（npx wrangler pages dev . --port 8999 --binding SESSION_SECRET=dev-secret --binding DEV_SHOW_CODE=1），
#   本机 D1 已跑过 tools/migrate-20261124-plan.sql，本机 R2 放一个 lianxizhi-video/aoshu/xulie.mp4，再
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-free-browser.py
import json, random, string, subprocess, sys, time
from playwright.sync_api import sync_playwright


# 本机预览所有请求都来自 127.0.0.1：先清掉本机限流计数，免得撞上「同一地址一小时 10 封」（2026-11-24 起有地址限流）
import subprocess as _sp
_sp.run(['npx', 'wrangler', 'd1', 'execute', 'lianxizhi', '--local', '--command',
         "DELETE FROM limits WHERE scope LIKE 'ip%' OR scope = 'all'"], capture_output=True)

BASE = 'http://127.0.0.1:8999'
STAMP = int(time.time())
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


def register(page, email, invite=''):
    codes = []
    page.on('response', lambda r: codes.append(r) if r.url.endswith('/api/auth/register') else None)
    page.goto(BASE + '/')
    page.wait_for_selector('[data-wl-signup]', timeout=10000)
    page.click('[data-wl-signup]')
    page.wait_for_selector('dialog.account-dialog form[data-view="register"]', timeout=5000)
    page.fill('form[data-view="register"] input[name="email"]', email)
    page.fill('form[data-view="register"] input[name="password"]', 'password123')
    if invite:
        page.fill('form[data-view="register"] input[name="invite"]', invite)
    if page.query_selector('form[data-view="register"] [data-ts]'):
        # 配了人机验证（测试钥匙会自动通过）：等那一格打上勾
        page.wait_for_function("() => { const i = document.querySelector('[data-ts] input[name=\"cf-turnstile-response\"]'); return i && i.value }", timeout=30000)
    page.click('form[data-view="register"] [data-act="submit"]')
    page.wait_for_selector('.code-box', timeout=30000)
    body = json.loads(codes[-1].text())
    return body


def enter_code(page, code):
    for box, digit in zip(page.query_selector_all('.code-box'), code):
        box.type(digit)


def video(page, rng=None):
    return page.evaluate("""async (r) => {
      const res = await fetch('/v/aoshu/xulie.mp4', { headers: r ? { Range: r } : {} })
      const buf = await res.arrayBuffer()
      return { status: res.status, len: buf.byteLength, range: res.headers.get('Content-Range'), type: res.headers.get('Content-Type') }
    }""", rng)


with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []

    # ---------- 免费注册 ----------
    ctx = br.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errs.append(str(e)))
    email = f'free-{STAMP}@test.local'
    body = register(page, email)
    check('不填邀请码也能注册（发了验证码）', body.get('ok') and body.get('dev_code'), body)
    enter_code(page, body['dev_code'])
    page.wait_for_selector('#today-cards .dk-shelf', timeout=30000)
    close_help(page)
    # ---------- 7 天体验 ----------
    v = video(page)
    check('体验期能看奥数视频', v['status'] == 200, v)
    page.click('[data-account-menu]')
    page.click('.rail-menu [data-account]')
    page.wait_for_selector('dialog.account-dialog[open] .account-plan', timeout=5000)
    check('账号里写「会员体验」，也能补填邀请码', '会员体验' in page.inner_text('.account-plan') and page.query_selector('dialog .account-plan [data-redeem]') is not None, page.inner_text('.account-plan'))
    page.keyboard.press('Escape')
    page.goto(BASE + '/shizi?mode=week')
    page.wait_for_selector('#preview .sheet, #preview .full-lock', timeout=15000)
    check('体验期识字单元检查不上锁', page.query_selector('#preview .full-lock') is None)

    # ---------- 体验结束 → 免费版 ----------
    subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'lianxizhi', '--local', '--command',
                    f"UPDATE users SET full_until = {int(time.time() * 1000) - 86400000} WHERE email = '{email}'"], check=True, capture_output=True)
    for _ in range(10):  # 本机 D1 由另一个进程改写，预览服务器要过一会儿才读到
        page.goto(BASE + '/')
        page.wait_for_selector('#today-cards .dk-shelf', timeout=30000)
        if page.evaluate('window.__SUMSUM_PLAN') == 'free':
            break
        time.sleep(1.5)
    close_help(page)
    shelves = page.inner_text('#today-cards')
    check('今天页：免费版摆识字、口算、拼音和五个游戏', all(k in shelves for k in ['识字', '口算', '拼音', '数独', '火柴', '密码', '迷宫', '数织']), shelves[:300])
    locked_list = page.eval_on_selector_all('.dk-lock-list a b', 'els => els.map(e => e.textContent)')
    check('今天页：会员功能列在下面', locked_list == ['奥数', '写字', '识字 · 单元检查与错字集', '拼音 · 课程与专题'], locked_list)
    check('今天页：说体验已结束', '体验已结束' in page.inner_text('#today-marks'))
    locks = page.eval_on_selector_all('.rail-link.is-locked', 'els => els.map(e => e.dataset.module)')
    check('侧栏不挂锁（识字、拼音 11-27 起免费版能进）', locks == [], locks)
    for path in ['/huochai', '/mima', '/migong', '/zhizhi']:
        page.goto(BASE + path)
        page.wait_for_selector('#preview .sheet', timeout=15000)
        check('免费版打开 ' + path + ' → 直接能出题', page.query_selector('.lk-card') is None)

    page.goto(BASE + '/shizi')
    page.wait_for_selector('#preview .sheet', timeout=15000)
    close_help(page)
    check('免费版识字：每日一卷能用', page.query_selector('#preview .full-lock') is None and page.query_selector('.lk-card') is None)
    # 拼音闪卡（2026-11-28）：免费版能印第 1、2 课，第 3 课以后和全套是会员
    page.goto(BASE + '/pinyin?view=cards&k=2')
    page.wait_for_selector('#preview .pfc-page, #preview .full-lock', timeout=15000)
    check('免费版拼音闪卡：第 2 课能印', page.query_selector('#preview .pfc-page') is not None and not page.is_disabled('#btn-print'))
    for k in ['3', 'all']:
        page.goto(BASE + '/pinyin?view=cards&k=' + k)
        page.wait_for_selector('#preview .pfc-page, #preview .full-lock', timeout=15000)
        check('免费版拼音闪卡：k=' + k + ' 显示「会员功能」、打印不可用', page.query_selector('#preview .full-lock') is not None and page.is_disabled('#btn-print'))
    for q, name in [('mode=week', '单元检查'), ('mode=wrong', '错字集'), ('pane=xie', '写字')]:
        page.goto(BASE + '/shizi?' + q)
        page.wait_for_selector('#preview .sheet, #preview .full-lock, #preview .empty', timeout=15000)
        check('免费版识字：' + name + '显示「会员功能」、打印按钮不可用', page.query_selector('#preview .full-lock') is not None and page.is_disabled('#btn-print'))
    # 2026-11-28 写字单独成页（/shizi?pane=xie 301 到 /xiezi，上面已测），识字页上只剩单元检查、错字集两个页签带锁
    page.goto(BASE + '/shizi')
    page.wait_for_selector('#preview .sheet, #preview .full-lock, #preview .empty', timeout=15000)
    try:
        page.wait_for_selector('#mode-tabs .tab-lock', timeout=8000)
    except Exception:
        pass
    check('识字页签上有小锁（单元检查、错字集）', len(page.query_selector_all('#mode-tabs .tab-lock')) >= 2, page.inner_html('#mode-tabs')[:300])
    page.goto(BASE + '/pinyin')
    page.wait_for_selector('#py-rate', timeout=15000)
    check('免费版拼音：今日卷能用', page.query_selector('#preview .full-lock') is None)
    page.goto(BASE + '/pinyin?view=topics')
    page.wait_for_selector('#preview .full-lock', timeout=15000)
    check('免费版拼音：专题上锁', page.is_disabled('#btn-print'))

    resp = page.goto(BASE + '/admin')
    check('免费版打开 /admin → 上锁页', page.query_selector('.lk-card') is not None and resp.status == 200, [resp.status, page.url])
    check('上锁页不收录', 'noindex' in (page.evaluate("fetch(location.href).then(r => r.headers.get('X-Robots-Tag'))") or ''))
    v = video(page)
    check('免费版看奥数视频 → 403', v['status'] == 403, v)

    page.goto(BASE + '/kousuan')
    page.wait_for_selector('#preview .sheet', timeout=10000)
    close_help(page)
    check('免费版口算照常，纸上有二维码', page.query_selector('#preview .sheet-qr') is not None)

    # ---------- 账号弹窗补填邀请码 ----------
    page.goto(BASE + '/shizi?mode=week')
    page.wait_for_selector('#preview .full-lock', timeout=15000)
    page.click('#preview [data-fl-redeem]')
    page.wait_for_selector('dialog.account-dialog[open] .account-plan [data-redeem]', timeout=5000)
    check('锁里点「填邀请码开通」→ 账号弹窗写「免费版」', '免费版' in page.inner_text('.account-plan'))
    page.fill('dialog .account-plan [data-redeem] input[name="invite"]', 'ABCD-2345')
    page.click('dialog .account-plan [data-redeem] button[type="submit"]')
    page.wait_for_selector('dialog .account-plan [data-redeem-msg]:not([hidden])', timeout=10000)
    check('补填错码 → 提示不对', '不对' in page.inner_text('dialog .account-plan [data-redeem-msg]'))
    code = make_invite()
    page.fill('dialog .account-plan [data-redeem] input[name="invite"]', code)
    page.click('dialog .account-plan [data-redeem] button[type="submit"]')
    time.sleep(4)
    page.goto(BASE + '/shizi?mode=week')
    page.wait_for_selector('#preview .sheet', timeout=15000)
    close_help(page)
    check('补填好码 → 识字单元检查能用', page.query_selector('#preview .full-lock') is None)
    v = video(page)
    check('会员能看视频（整段 200）', v['status'] == 200 and v['len'] > 1000 and v['type'] == 'video/mp4', v)
    v = video(page, 'bytes=0-99')
    check('会员拖动进度条（分段 206）', v['status'] == 206 and v['len'] == 100 and (v['range'] or '').startswith('bytes 0-99/'), v)
    v = video(page, 'bytes=-50')
    check('分段请求「最后 50 字节」也对', v['status'] == 206 and v['len'] == 50, v)
    v = video(page, 'bytes=0-99999999')
    check('分段请求超出文件长度 → 夹到文件末尾', v['status'] in (200, 206) and v['len'] > 1000 and (v['range'] is None or v['range'].endswith('/' + str(v['len']))), v)
    v = video(page, 'bytes=99999999-')
    check('分段请求完全超出 → 416 或整段（按规范都可以）', v['status'] == 416 or (v['status'] == 200 and v['len'] > 1000), v)

    # ---------- 没登录看识字：注册就能用 ----------
    cg = br.new_context(viewport={'width': 1440, 'height': 900})
    pg = cg.new_page()
    pg.goto(BASE + '/shizi')
    pg.wait_for_selector('.lk-card', timeout=15000)
    check('没登录打开识字 → 说明页写「注册免费账号就能用」、有样张', '注册免费账号就能用' in pg.inner_text('#lk-kicker') and pg.is_visible('[data-lk-sample="shizi"]'))
    cg.close()

    # ---------- 带码注册、重复注册 ----------
    c2 = br.new_context(viewport={'width': 1440, 'height': 900})
    p2 = c2.new_page()
    p2.on('pageerror', lambda e: errs.append('带码 ' + str(e)))
    b2 = register(p2, f'full-{STAMP}@test.local', make_invite())
    enter_code(p2, b2['dev_code'])
    p2.wait_for_selector('#today-cards .dk-shelf', timeout=30000)
    check('带邀请码注册 → 直接会员（今天页九个板块）', p2.query_selector('.dk-locked') is None and not p2.query_selector_all('.rail-link.is-locked'))

    c3 = br.new_context()
    p3 = c3.new_page()
    p3.goto(BASE + '/')
    same = p3.evaluate("""async (e) => {
      const h = 'a'.repeat(64)
      const post = (em) => fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, password: h }) }).then(async r => ({ status: r.status, body: await r.json() }))
      return { old: await post(e), fresh: await post('fresh-' + Date.now() + '@test.local') }
    }""", email)
    old, fresh = same['old'], same['fresh']
    check('已注册的邮箱再注册 → 不说「注册过」、不给验证码', not old['body'].get('dev_code') and '注册过' not in json.dumps(old['body'], ensure_ascii=False), same)
    check('已注册邮箱的结果和新邮箱是同一类（200 或同一句限流提示）', old['status'] in (200, 429) and fresh['status'] == 200, same)

    # ---------- 删除账号 ----------
    page.click('[data-account-menu]')
    page.click('.rail-menu [data-account]')
    page.wait_for_selector('dialog.account-dialog[open] [data-act="delete"]', timeout=5000)
    page.click('dialog.account-dialog [data-act="delete"]')
    page.fill('dialog.account-dialog form[data-view="delete"] input[name="password"]', 'password123')
    page.click('dialog.account-dialog form[data-view="delete"] [data-act="submit"]')
    page.wait_for_url(BASE + '/', timeout=15000)
    check('删除账号后回到首页（没登录）', page.query_selector('.wl-hero') is not None)
    lg = page.evaluate("""async (e) => {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, password: 'x'.repeat(64) }) })
      return r.status }""", email)
    check('删掉的账号登录不了', lg == 401, lg)

    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
