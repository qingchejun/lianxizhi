# 数学知识点闪卡（2026-11-28）：先在口算页「闪卡」页签，当天搬成单独一页 /shuxue/zhishi（侧栏数学 → 知识点）
#   本地预览（:8999）在跑、账号 preview@local.test / preview123 存在（会员）时运行：
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-math-cards-browser.py
# 游客（免费）：只能印一上前两个单元；会员：按单元挑卡、错题卡排前面并用孩子的题当例子、全套、大卡、打印版式。
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


# 2026-11-28 课本来自孩子档案（js/profile.js）：测试里直接写档案再刷新
def set_profile(page, book):
    page.evaluate("(b) => SumSum.store.set('sumsum:profile:v1', { v: 1, cur: 0, kids: [{ grade: 1, term: b.slice(-1), math: b.slice(0, -2) }] })", book)


def cells(page):
    return page.eval_on_selector_all('#preview .pfc-cell[data-card]', 'els => els.map(e => e.dataset.card)')


NO_OVERFLOW = "Array.from(document.querySelectorAll('.pfc-face')).every(f => f.scrollHeight <= f.clientHeight + 1 && f.scrollWidth <= f.clientWidth + 1)"
FAKE_ID = 'zzmc2q'

with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []

    # ---------- 游客 ----------
    ctx = br.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/kousuan')
    pg.wait_for_selector('#preview .sheet', timeout=15000)
    check('口算页不再有闪卡页签', pg.query_selector('#ks-tabs') is None and pg.query_selector('#ks-cards') is None)
    set_profile(pg, 'rj1a')  # 有档案就不弹（弹框见 tools/e2e-profile-browser.py）
    pg.reload()  # 档案变了页面会自己重开（profile.watch），先刷新再往下走，免得撞上
    pg.wait_for_selector('#preview .sheet', timeout=15000)
    time.sleep(1)
    pg.click('.rail-link[data-module="数学知识点"]')
    pg.wait_for_url(BASE + '/shuxue/zhishi', timeout=15000)
    pg.wait_for_selector('#mfc-book', timeout=15000)
    check('侧栏「数学 → 知识点」亮着，显示「知识点」', 'active' in (pg.get_attribute('.rail-link[data-module="数学知识点"]', 'class') or '') and
          pg.inner_text('.rail-link[data-module="数学知识点"] span') == '知识点')
    check('标题是数学知识点', '数学知识点' in pg.inner_text('h1'))
    pg.goto(BASE + '/kousuan?view=cards&size=l')
    check('旧网址 /kousuan?view=cards 跳到新页面', pg.url == BASE + '/shuxue/zhishi?size=l', pg.url)
    check('课本照档案：人教一上', pg.inner_text('#mfc-book') == '人教版一年级上册', pg.inner_text('#mfc-book'))
    pg.select_option('#mfc-unit', '1')
    time.sleep(0.3)
    ids = cells(pg)
    check('游客：人教一上第一单元能印', len(ids) >= 4 and 'compare' in ids and not pg.is_disabled('#btn-print'), ids)
    check('角上写教材单元', '人教一上 · 第一单元' in pg.inner_text('#preview .pfc-cell[data-card="compare"] .pfc-tag'))
    check('游客：提示登录后按错题出卡', '登录后' in pg.inner_text('#ks-cards'))
    pg.select_option('#mfc-unit', '5')
    time.sleep(0.3)
    check('游客：第五单元是会员', pg.locator('#preview .full-lock').count() == 1 and pg.is_disabled('#btn-print'))
    pg.select_option('#mfc-unit', '0')
    time.sleep(0.3)
    check('数学游戏单元：左右的卡', 'position' in cells(pg))
    check('游客页没有脚本报错', not errs, errs)
    ctx.close()

    # ---------- 会员账号 ----------
    ctx = br.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/')
    login(pg)
    pg.wait_for_url(BASE + '/', timeout=30000)
    time.sleep(1.5)
    pg.goto(BASE + '/kousuan')
    pg.wait_for_selector('#preview .sheet', timeout=15000)
    old_mode = pg.evaluate("SumSum.store.get('sumsum:kousuan:mode:v1')")
    old_prof = pg.evaluate("SumSum.store.get('sumsum:profile:v1')")
    pg.evaluate("SumSum.store.set('sumsum:kousuan:cards:v1', { size: 'm' })")  # 卡片大小是账号里记住的，上一轮留下的不算
    set_profile(pg, 'rj1b')
    pg.reload()
    pg.wait_for_selector('#preview .sheet', timeout=15000)
    time.sleep(1)
    # 造一张打过分的口算纸：错了 13 − 9、14 − 6、5 + 3 − 2
    pg.evaluate("""(id) => SumSum.store.set('sumsum:sheet:v1:' + id, {
      id, module: 'kousuan', date: '2026-11-28', createdAt: Date.now(), printedAt: Date.now() - 1000,
      items: [{ key: '13 − 9' }, { key: '14 − 6' }, { key: '5 + 3 − 2' }, { key: '9 + 4' }],
      wrong: ['13 − 9', '14 − 6', '5 + 3 − 2'], rating: { all: { level: 'mid', at: Date.now() } } })""", FAKE_ID)
    pg.goto(BASE + '/shuxue/zhishi')
    pg.wait_for_selector('#mfc-book', timeout=15000)
    pg.select_option('#mfc-unit', '1')
    time.sleep(0.4)
    ids = cells(pg)
    check('人教一下第二单元：错题卡排在前半页', 'break10' in ids[:3] and pg.locator('.pfc-list em.is-due').count() >= 2, ids)
    front = pg.inner_text('#preview .pfc-cell[data-card="break10"] .pfc-front')
    check('错题卡用孩子做错的题当例子', '13 − 9' in front, front)
    back = pg.inner_text('#preview .pfc-cell[data-card="break10"] .pfc-back')
    check('背面方法按这道题一步步算', '10 − 9 = 1' in back and '1 + 3 = 4' in back, back)
    check('本单元的卡也在', 'think-add' in ids and 'flat10' in ids, ids)
    lst = pg.inner_text('.pfc-list')
    check('右栏标了「错过」和「本单元」', '错过' in lst and '本单元' in lst, lst)
    check('一页 6 张不溢出', len(ids) == 6 and pg.evaluate(NO_OVERFLOW), (len(ids), pg.url, pg.evaluate("SumSum.store.get('sumsum:kousuan:cards:v1')")))
    mode = pg.evaluate("SumSum.store.get('sumsum:kousuan:mode:v1')")
    check('教材进度和出题共用', mode and mode.get('book') == 'rj1b' and mode.get('unit') == 1, mode)
    pg.select_option('#mfc-unit', 'all')
    time.sleep(0.4)
    n_all = len(cells(pg))
    check('全套：人教一下所有卡、网址记下 k=all', n_all >= 15 and 'k=all' in pg.url, (n_all, pg.url))
    check('全套不溢出', pg.evaluate(NO_OVERFLOW))
    pg.click('[data-mfc-size="l"]')
    time.sleep(0.4)
    check('大卡：一页 4 张', pg.locator('#preview .pfc-page.is-l').count() == -(-n_all // 4))
    check('大卡也不溢出', pg.evaluate(NO_OVERFLOW))
    for b in ['rj1a', 'bsd1a', 'bsd1b']:
        set_profile(pg, b)
        pg.reload()
        pg.wait_for_selector('#mfc-unit', timeout=15000)
        pg.select_option('#mfc-unit', 'all')
        time.sleep(0.4)
        check(b + ' 全套大卡不溢出', len(cells(pg)) >= 10 and pg.evaluate(NO_OVERFLOW))
        pg.click('[data-mfc-size="m"]')
        time.sleep(0.3)
        check(b + ' 全套一页 6 张不溢出', pg.evaluate(NO_OVERFLOW))
        pg.click('[data-mfc-size="l"]')
        time.sleep(0.3)
    pg.emulate_media(media='print')
    check('打印时右栏不上纸', not pg.is_visible('#panel'))
    check('打印时背面在正面右边', pg.evaluate("(() => { const c = document.querySelector('.pfc-cell'), f = c.querySelector('.pfc-front').getBoundingClientRect(), b = c.querySelector('.pfc-back').getBoundingClientRect(); return Math.abs(f.top - b.top) < 1 && b.left > f.left })()"))
    pg.emulate_media(media='screen')
    pg.click('[data-mfc-size="m"]')
    # 回口算页：教材设置跟着变了，口算正常出题
    pg.click('.rail-link[data-module="口算"]')
    pg.wait_for_selector('#preview .sheet .q', timeout=15000)
    check('回到出题页正常出题', pg.locator('#preview .q').count() >= 10)
    # 还原
    pg.evaluate("""([id, m, pf]) => { SumSum.store.remove('sumsum:sheet:v1:' + id); if (m) SumSum.store.set('sumsum:kousuan:mode:v1', m)
      SumSum.store.set('sumsum:profile:v1', pf || { v: 1, cur: 0, kids: [] }) }""", [FAKE_ID, old_mode, old_prof])
    check('全程没有脚本报错', not errs, errs)
    ctx.close()
    br.close()

print('')
print('%d / %d 通过' % (ok_n, ok_n + len(bad)))
sys.exit(1 if bad else 0)
