# 孩子档案（2026-11-28，js/profile.js）浏览器验收：
#   本地预览（:8999）在跑、账号 preview@local.test / preview123 存在（会员）时运行：
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-profile-browser.py
# 游客：第一次开数学知识点弹档案 → 存下，口算「按教材」直接照档案；口算切按教材也会弹；「以后再说」这次不再弹；
#       老用户（口算已经按教材）不弹、悄悄推出档案。
# 会员：识字、写字照档案的册；账号菜单在游戏页也能开档案；「今天」页三周没改进度会提醒。跑完还原账号数据。
import sys, time
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:8999'
EMAIL, PASSWORD = 'preview@local.test', 'preview123'
ok_n = 0
bad = []


def check(name, cond, info=''):
    global ok_n
    if cond:
        ok_n += 1
        print('✓ ' + name)
    else:
        bad.append(name)
        print('✗ ' + name + ('  ' + str(info) if info != '' else ''))


def login(page):
    if not page.is_visible('form[data-view="login"]'):
        page.click('.sh-act a')
    page.fill('form[data-view="login"] input[name="email"]', EMAIL)
    page.fill('form[data-view="login"] input[name="password"]', PASSWORD)
    page.click('form[data-view="login"] [data-act="submit"]')


def pick(page, name, v):
    page.click('.profile-dialog [data-pf="%s"] [data-v="%s"]' % (name, v))


KEYS = ['sumsum:profile:v1', 'sumsum:kousuan:mode:v1', 'sumsum:shizi:v1', 'sumsum:progress-at:v1']

with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []

    # ---------- 游客：数学知识点第一次打开 ----------
    ctx = br.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/shuxue/zhishi')
    pg.wait_for_selector('.profile-dialog[open]', timeout=15000)
    check('第一次开数学知识点：弹档案', '先说说孩子用的课本' in pg.inner_text('.profile-dialog'))
    check('没选全不能保存', pg.is_disabled('[data-pf-save]'))
    pick(pg, 'term', 'b')
    pick(pg, 'math', 'bsd')
    check('选全了能保存、出现「数学学到」', not pg.is_disabled('[data-pf-save]') and pg.is_visible('#pf-unit'))
    pg.select_option('#pf-unit', '2')
    pg.click('[data-pf-save]')
    pg.wait_for_selector('.profile-dialog', state='detached', timeout=5000)
    time.sleep(0.5)
    check('知识点按档案：北师大一下、第 3 个单元', pg.inner_text('#mfc-book') == '北师大版一年级下册' and pg.input_value('#mfc-unit') == '2',
          (pg.inner_text('#mfc-book'), pg.input_value('#mfc-unit')))
    pg.goto(BASE + '/kousuan')
    pg.wait_for_selector('#preview .sheet', timeout=15000)
    pg.click('#k-kind + .seg-ctl button[data-v="book"]')
    time.sleep(0.6)
    check('口算切到按教材：不再弹，课本、单元和知识点同一份', pg.query_selector('.profile-dialog') is None and
          pg.inner_text('#k-book-name') == '北师大版一年级下册' and pg.input_value('#k-unit') == '2',
          (pg.inner_text('#k-book-name'), pg.input_value('#k-unit')))
    pg.goto(BASE + '/kousuan?src=book:rj1a:3')
    pg.wait_for_selector('#preview .sheet', timeout=15000)
    check('分享来的链接照链接的课本出、注明', '人教版一年级上册（分享的链接）' in pg.inner_text('#k-book-name'), pg.inner_text('#k-book-name'))
    ctx.close()

    # ---------- 游客：口算切按教材弹、以后再说 ----------
    ctx = br.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/kousuan')
    pg.wait_for_selector('#preview .sheet', timeout=15000)
    check('口算按难度打开：不弹', pg.query_selector('.profile-dialog') is None)
    pg.click('#k-kind + .seg-ctl button[data-v="book"]')
    pg.wait_for_selector('.profile-dialog[open]', timeout=5000)
    check('切到按教材：弹档案', True)
    pg.click('[data-pf-later]')
    time.sleep(0.3)
    pg.goto(BASE + '/shuxue/zhishi')
    pg.wait_for_selector('#mfc-book', timeout=15000)
    time.sleep(3)
    check('点了以后再说：这次不再弹', pg.query_selector('.profile-dialog') is None)
    ctx.close()

    # ---------- 老用户：口算已经按教材 ----------
    ctx = br.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/kousuan')
    pg.wait_for_selector('#preview .sheet', timeout=15000)
    pg.evaluate("SumSum.store.set('sumsum:kousuan:mode:v1', { kind: 'book', book: 'bsd1a', unit: 3 })")
    pg.goto(BASE + '/shuxue/zhishi')
    pg.wait_for_selector('#mfc-book', timeout=15000)
    time.sleep(3)
    prof = pg.evaluate("SumSum.profile.get(SumSum.store)")
    check('老用户不弹、悄悄推出档案', pg.query_selector('.profile-dialog') is None and prof and prof['math'] == 'bsd' and prof['term'] == 'a', prof)
    check('老用户的单元不动', pg.input_value('#mfc-unit') == '3', pg.input_value('#mfc-unit'))
    ctx.close()

    # ---------- 会员 ----------
    ctx = br.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: d.accept())
    pg.goto(BASE + '/')
    login(pg)
    pg.wait_for_url(BASE + '/', timeout=30000)
    time.sleep(2)
    saved = pg.evaluate("(keys) => keys.map(k => SumSum.store.get(k))", KEYS)
    # 清档案用空档案（删本机的键不会同步到云端，下次同步又回来）
    pg.evaluate("SumSum.store.set('sumsum:profile:v1', { v: 1, cur: 0, kids: [] }); SumSum.store.set('sumsum:shizi:v1', Object.assign({}, SumSum.store.get('sumsum:shizi:v1') || {}, { book: 'hongen' })); SumSum.store.set('sumsum:kousuan:mode:v1', Object.assign({}, SumSum.store.get('sumsum:kousuan:mode:v1') || {}, { kind: 'level' }))")
    pg.goto(BASE + '/shizi')
    pg.wait_for_selector('.profile-dialog[open]', timeout=15000)
    pick(pg, 'term', 'a')
    pick(pg, 'math', 'rj')
    check('识字页弹档案、问「语文学到」', pg.is_visible('#pf-lesson'))
    pg.select_option('#pf-lesson', '5')
    pg.click('[data-pf-save]')
    pg.wait_for_load_state('load')
    pg.wait_for_selector('[data-sumsum-ready]', timeout=15000)
    time.sleep(0.8)
    pg.evaluate("document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    s = pg.evaluate("SumSum.store.get('sumsum:shizi:v1')")
    check('认字原来用某恩：不动；写字跟档案（统编一上）', s['book'] == 'hongen' and s['xieBook'] == 'rj1a', s)
    pg.select_option('#f-book', 'rj1a')
    time.sleep(0.5)
    opt = pg.eval_on_selector_all('#f-book option', 'os => os.map(o => [o.value, o.hidden, o.textContent])')
    check('字表：课本只留档案那一册、写明来自档案', any(o[0] == 'rj1a' and not o[1] and o[2].startswith('课本：统编版一年级上册') for o in opt) and
          any(o[0] == 'rj1b' and o[1] for o in opt), opt)
    pg.goto(BASE + '/xiezi')
    pg.wait_for_selector('[data-sumsum-ready]', timeout=15000)
    time.sleep(0.5)
    pg.evaluate("document.querySelectorAll('dialog[open]').forEach(d => d.close())")
    check('写字页：课本一行字、下拉框藏起来', pg.is_visible('#xie-book-line') and pg.inner_text('#xie-book-name') == '统编版一年级上册写字表' and not pg.is_visible('#f-xiebook'))
    # 账号菜单在游戏页打开档案（现取脚本），改成下学期
    pg.goto(BASE + '/shudu')
    pg.wait_for_selector('#preview .sheet', timeout=15000)
    pg.click('.rail-user')
    pg.click('.rail-menu [data-profile]')
    pg.wait_for_selector('.profile-dialog[open]', timeout=5000)
    check('账号菜单「孩子档案」：游戏页也能打开、显示现在的档案', 'on' in (pg.get_attribute('[data-pf="term"] [data-v="a"]', 'class') or ''))
    pick(pg, 'term', 'b')
    pg.click('[data-pf-save]')
    pg.wait_for_load_state('load')
    time.sleep(1)
    pg.goto(BASE + '/xiezi')
    pg.wait_for_selector('[data-sumsum-ready]', timeout=15000)
    time.sleep(0.5)
    check('改成下学期：写字换成一下', pg.inner_text('#xie-book-name') == '统编版一年级下册写字表', pg.inner_text('#xie-book-name'))
    # 今天页：数学三周没改进度
    pg.evaluate("SumSum.store.set('sumsum:kousuan:mode:v1', Object.assign({}, SumSum.store.get('sumsum:kousuan:mode:v1') || {}, { kind: 'book', book: 'rj1b', unit: 2 })); SumSum.store.set('sumsum:progress-at:v1', { math: Date.now() - 30 * 864e5, yuwen: Date.now() })")
    pg.goto(BASE + '/')
    pg.wait_for_selector('#today-cards', timeout=15000)
    time.sleep(1)
    txt = pg.inner_text('#today-marks') if pg.is_visible('#today-marks') else ''
    check('今天页：数学三周没改「学校学到」会问一声', '数学还在「' in txt and '吗？' in txt, txt[:200])
    if pg.query_selector('[data-pf-keep="math"]'):
        pg.click('[data-pf-keep="math"]')
        time.sleep(0.3)
    txt2 = pg.inner_text('#today-marks') if pg.is_visible('#today-marks') else ''
    check('点「还在这儿」：提醒收起', '数学还在' not in txt2)
    # 还原账号数据
    pg.evaluate("""([keys, vals]) => keys.forEach((k, i) => vals[i] == null ? (k === 'sumsum:profile:v1' ? SumSum.store.set(k, { v: 1, cur: 0, kids: [] }) : SumSum.store.remove(k)) : SumSum.store.set(k, vals[i]))""", [KEYS, saved])
    time.sleep(2)
    check('全程没有脚本报错', not errs, errs)
    ctx.close()
    br.close()

print('')
print('%d / %d 通过' % (ok_n, ok_n + len(bad)))
sys.exit(1 if bad else 0)
