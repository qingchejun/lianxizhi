# 口算「按教材 / 按难度」（2026-11-28）浏览器验收：
#   1. 新用户：默认按教材，网址带 src；换成北师大一下第五单元 → 纸上没有乘除、没有超出 100 以内不进位；
#   2. 按难度：加减 3 级开「两步」→ 一半连加连减；乘法 1 级 → 积都在 20 以内；分享链接打开是同一张；
#   3. 我的难度：挑题型新建 → 全取消有提示 → 勾一种 → 改名 → 刷新还在 → 删除；定范围新建露出「出什么题」；
#   4. 老用户（本机已有口算设置）：按难度、选中「我原来的设置」，纸和原来一样；
#   5. 登录后：按教材出一张、打印、抽屉里点一道错题 → 重新生成后那道题还在。
# 用法：本机预览跑着（见 e2e-rate-drawer-browser.py），账号 preview@local.test / preview123，再
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-kousuan-modes-browser.py
import re, sys, time
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8999'
results = []


def check(name, ok, extra=''):
    results.append(bool(ok))
    print(('✓ ' if ok else '✗ ') + name + ((' → ' + str(extra)) if not ok else ''))


def qs(page):
    return page.evaluate("[...document.querySelectorAll('#preview .sheet:not(.sheet-ans) .q-expr')].map(e => e.textContent.replace(/\\s+/g, ' ').trim())")


def nums(expr):
    return [int(x) for x in re.findall(r'\d+', expr)]


def seg(page, sel_id, value):
    page.click('#%s + .seg-ctl button[data-v="%s"]' % (sel_id, value))
    time.sleep(0.4)


def close_dialogs(page):
    page.evaluate("document.querySelectorAll('dialog[open]').forEach(d => d.close())")


with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []

    # ---------- 1. 新用户 ----------
    ctx = br.new_context(viewport={'width': 1440, 'height': 1000})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: d.accept())
    pg.goto(BASE + '/kousuan')
    pg.wait_for_selector('#preview .q-expr', timeout=15000)
    close_dialogs(pg)
    check('新用户默认按难度、选中「默认难度」', pg.evaluate("document.getElementById('k-kind').value") == 'level' and '默认难度' in pg.inner_text('.ks-chip.on'))
    check('默认难度：运算、范围就在编辑框里', pg.is_visible('#k-edit #grp-what') and pg.evaluate("document.getElementById('f-mode').value") == 'addsub')
    check('默认难度不能删', pg.query_selector('#k-edit [data-act="del"]') is None)
    ex = qs(pg)
    check('默认难度：20 以内加减', len(ex) == 20 and all(max(nums(e)) <= 20 for e in ex), ex)
    check('新用户什么都没动：不存', pg.evaluate("localStorage.getItem('sumsum:kousuan:mode:v1')") is None)
    seg(pg, 'k-kind', 'book')
    # 2026-11-28 还没有孩子档案：切到按教材弹档案，选北师大一下
    pg.wait_for_selector('.profile-dialog[open]', timeout=5000)
    pg.click('.profile-dialog [data-pf="term"] [data-v="b"]')
    pg.click('.profile-dialog [data-pf="math"] [data-v="bsd"]')
    pg.click('[data-pf-save]')
    pg.wait_for_load_state('load')
    pg.wait_for_selector('#preview .sheet', timeout=15000)
    time.sleep(0.4)
    check('切到按教材', pg.is_visible('#k-book-box') and 'src=book' in pg.url, pg.url)
    check('课本照档案', pg.inner_text('#k-book-name') == '北师大版一年级下册', pg.inner_text('#k-book-name'))
    check('按教材时「出什么题」那组藏起来', not pg.is_visible('#grp-what'))
    pg.select_option('#k-unit', '4')
    time.sleep(0.5)
    ex = qs(pg)
    check('北师大一下第五单元：20 道', len(ex) == 20, len(ex))
    check('没有乘除', not any(('×' in e or '÷' in e) for e in ex), ex)
    check('都在 100 以内', all(max(nums(e)) <= 100 for e in ex), ex)
    check('标题是单元名', '100 以内数加与减（一）口算' in pg.inner_text('#preview .sheet-title'), pg.inner_text('#preview .sheet-title'))
    pg.select_option('#k-unit', '1')  # 图形单元：复习之前学过的
    time.sleep(0.4)
    check('图形单元：标题写复习', '复习' in pg.inner_text('#preview .sheet-title'))

    # ---------- 2. 按难度 ----------
    seg(pg, 'k-kind', 'level')
    pg.click('[data-lv="as3"]')
    time.sleep(0.3)
    pg.check('#k-chain')
    time.sleep(0.4)
    ex = qs(pg)
    chains = [e for e in ex if len(re.findall(r'[+−]', e)) == 2]
    check('加减 3 级 + 两步：一半连加连减', len(chains) == 10, ex)
    pg.uncheck('#k-chain')
    pg.click('[data-lv="mul1"]')
    time.sleep(0.4)
    ex = qs(pg)
    check('乘法 1 级：积都在 20 以内', all('×' in e and nums(e)[0] * nums(e)[1] <= 20 for e in ex), ex)
    check('乘法没有「两步」开关', not pg.is_visible('#k-chain-row'))
    share = pg.url
    ctx2 = br.new_context(viewport={'width': 1440, 'height': 1000})
    p2 = ctx2.new_page()
    p2.goto(share)
    p2.wait_for_selector('#preview .q-expr', timeout=15000)
    check('分享链接打开是同一张', qs(p2) == ex)
    ctx2.close()

    # ---------- 3. 我的难度 ----------
    pg.click('[data-new="tags"]')
    time.sleep(0.4)
    check('新建的难度选中了、编辑区打开', pg.is_visible('#k-edit') and pg.query_selector('.ks-chip.on') is not None)
    check('照乘法 1 级复制了题型', pg.is_checked('#k-edit [data-tag="mulP20"]'))
    pg.uncheck('#k-edit [data-tag="mulP20"]')
    time.sleep(0.4)
    check('一个题型都没勾：提示', pg.is_visible('#notice') and '至少勾一种' in pg.inner_text('#notice'))
    pg.check('#k-edit [data-tag="divTable"]')
    time.sleep(0.4)
    ex = qs(pg)
    check('勾了表内除法：纸上都是除法', len(ex) == 20 and all('÷' in e for e in ex), ex[:3])
    pg.fill('#k-pname', '我家的除法')
    pg.press('#k-pname', 'Tab')
    time.sleep(0.4)
    check('改名后标题跟着变', '我家的除法' in pg.inner_text('#preview .sheet-title'))
    pg.goto(BASE + '/kousuan')
    pg.wait_for_selector('#preview .q-expr', timeout=15000)
    close_dialogs(pg)
    check('刷新后还是这套难度', '我家的除法' in pg.inner_text('.ks-chip.on'), pg.inner_text('#k-mine'))
    pg.click('#k-edit [data-act="del"]')
    time.sleep(0.4)
    check('删除后回到默认难度', '默认难度' in pg.inner_text('.ks-chip.on') and '我家的除法' not in pg.inner_text('#k-mine'))
    pg.click('#k-edit [data-act="copy"]')  # 默认难度复制一份 → 自己设范围的难度
    time.sleep(0.4)
    check('复制默认难度：控件跟着挪进新的编辑框', '默认难度 副本' in pg.inner_text('.ks-chip.on') and pg.is_visible('#k-edit #grp-what'))
    pg.click('[data-new="tags"]')
    time.sleep(0.4)
    check('切到挑题型：范围控件藏起来', not pg.is_visible('#grp-what') and pg.query_selector('#k-edit #grp-what') is None)
    pg.uncheck('#k-edit [data-tag="add20c"]')
    pg.uncheck('#k-edit [data-tag="sub20b"]')
    pg.check('#k-edit [data-tag="mul2x2s"]')
    time.sleep(0.4)
    ex = qs(pg)
    check('两位数乘两位数（20 以内）：11～19 互乘', len(ex) == 20 and all('×' in e and 11 <= nums(e)[0] <= 19 and 11 <= nums(e)[1] <= 19 for e in ex), ex[:3])
    check('没改名：标题按题型起', '两位数乘两位数（20 以内的数）口算' in pg.inner_text('#preview .sheet-title'), pg.inner_text('#preview .sheet-title'))
    pg.click('[data-new="params"]')
    time.sleep(0.4)
    check('自己设范围新建：控件在编辑框里', pg.is_visible('#k-edit #grp-what'))
    pg.select_option('#f-mode', 'mixed')
    time.sleep(0.4)
    plans = pg.evaluate("JSON.parse(localStorage.getItem('sumsum:kousuan:plans:v1')).plans")
    check('改的参数存进这套难度', plans[-1]['kind'] == 'params' and plans[-1]['s']['mode'] == 'mixed', plans)
    ctx.close()

    # ---------- 4. 老用户 ----------
    ctx = br.new_context(viewport={'width': 1440, 'height': 1000})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/help')
    pg.evaluate("localStorage.setItem('sumsum:settings:v1', JSON.stringify({ mode: 'mul', min: 0, max: 20, mulMin: 2, mulMax: 5, count: 12, columns: 2, carryMode: 'random', blankMode: 'end' }))")
    pg.goto(BASE + '/kousuan')
    pg.wait_for_selector('#preview .q-expr', timeout=15000)
    close_dialogs(pg)
    check('老用户：按难度、选中「默认难度」', pg.evaluate("document.getElementById('k-kind').value") == 'level' and '默认难度' in pg.inner_text('.ks-chip.on'))
    ex = qs(pg)
    check('老用户：纸和原来一样（12 道 2～5 的乘法）', len(ex) == 12 and all('×' in e and 2 <= nums(e)[0] <= 5 and 2 <= nums(e)[1] <= 5 for e in ex), ex)
    check('老用户：「出什么题」还在', pg.is_visible('#grp-what') and pg.evaluate("document.getElementById('f-mode').value") == 'mul')
    ctx.close()

    # ---------- 5. 登录后：错题再出 ----------
    ctx = br.new_context(viewport={'width': 1440, 'height': 1000})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/')
    if not pg.is_visible('form[data-view="login"]'):
        pg.click('.sh-act a')
    pg.fill('form[data-view="login"] input[name="email"]', 'preview@local.test')
    pg.fill('form[data-view="login"] input[name="password"]', 'preview123')
    pg.click('form[data-view="login"] [data-act="submit"]')
    pg.wait_for_url(BASE + '/', timeout=30000)
    time.sleep(1.5)
    pg.goto(BASE + '/kousuan?src=book:rj1a:5')
    pg.wait_for_selector('#preview .q-expr', timeout=15000)
    time.sleep(1.5)
    close_dialogs(pg)
    pg.click('#btn-regen')
    time.sleep(0.6)
    pg.evaluate("window.dispatchEvent(new Event('beforeprint'))")
    sid = pg.evaluate('SumSum.sheets.current().id')
    pg.click('#btn-mark')
    card = '.rdrawer [data-card="%s"] ' % sid
    pg.wait_for_selector(card + '[data-rate-item]', timeout=5000)
    key = pg.query_selector(card + '[data-rate-item]').get_attribute('data-rate-item')
    pg.click(card + '[data-rate-item="%s"]' % key)
    pg.click(card + '[data-rate-submit]')
    check('抽屉提交后说下一张会再出错题', '再出这 1 道错题' in pg.inner_text(card), pg.inner_text(card))
    pg.keyboard.press('Escape')
    pg.click('#btn-regen')
    time.sleep(0.6)
    ex = qs(pg)
    check('重新生成：那道错题还在', any(e.startswith(key.replace(' ', ' ')) for e in ex), [key, ex])
    ctx.close()

    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
