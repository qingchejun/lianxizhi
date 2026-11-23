# 手机上有「同步上线前的老数据」（本机有值、没有修改时间）且云端也有同一项时，
# 板块页 / 登记页要弹「保留哪边」的框，而不是静默跳过整次同步（2026-11-23 站长手机扫码登记一直「0 张」的根因）。
# 用法同 tools/e2e-mark-browser.py（先起本机预览，账号 preview@local.test / preview123）。
import time
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8999'
results = []


def check(name, ok, extra=''):
    results.append(bool(ok))
    print(('✓ ' if ok else '✗ ') + name + ((' → ' + str(extra)) if not ok else ''))


def login(pg):
    pg.fill('form[data-view="login"] input[name="email"]', 'preview@local.test')
    pg.fill('form[data-view="login"] input[name="password"]', 'preview123')
    pg.click('form[data-view="login"] [data-act="submit"]')


with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []
    desk = br.new_context(viewport={'width': 1440, 'height': 900})
    d = desk.new_page()
    d.goto(BASE + '/')
    login(d)
    d.wait_for_url(BASE + '/', timeout=30000)
    time.sleep(1.5)
    d.goto(BASE + '/kousuan')
    time.sleep(2.5)
    d.click('#btn-regen')
    time.sleep(1.5)
    d.evaluate("window.dispatchEvent(new Event('beforeprint'))")
    sid = d.evaluate('SumSum.sheets.current().id')
    time.sleep(2)

    mob = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    m = mob.new_page()
    m.on('pageerror', lambda e: errs.append(str(e)))
    m.goto(BASE + '/')
    login(m)
    m.wait_for_url(BASE + '/', timeout=30000)
    time.sleep(2)
    # 造一条「老数据」：云端有的键，本机有值但没有修改时间
    m.evaluate("""() => {
      localStorage.setItem('sumsum:settings:v1', JSON.stringify({ mode: 'add' }))
      const meta = JSON.parse(localStorage.getItem('sumsum:sync:meta') || '{}')
      delete meta['sumsum:settings:v1']
      for (const k of Object.keys(meta)) if (k.indexOf('sumsum:sheet:v1:') === 0) { delete meta[k]; localStorage.removeItem(k) }
      localStorage.setItem('sumsum:sync:meta', JSON.stringify(meta))
      sessionStorage.clear()
    }""")
    m.goto(BASE + '/mark?id=' + sid)
    try:
        m.wait_for_selector('dialog.account-dialog[open] [data-pick="cloud"]', timeout=15000)
        shown = True
    except Exception:
        shown = False
    check('有老数据时弹出「保留哪边」的框', shown)
    if shown:
        m.click('dialog.account-dialog[open] [data-pick="cloud"]')
        time.sleep(5)
        m.wait_for_selector('#mark-page .mcard', timeout=15000)
    check('选了云端以后登记页找得到这张纸', m.query_selector('[data-card="%s"]' % sid) is not None, m.inner_text('#mark-page')[:60])
    check('没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
raise SystemExit(0 if all(results) else 1)
