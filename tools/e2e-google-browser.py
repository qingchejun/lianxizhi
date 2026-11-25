# 谷歌登录（2026-11-25）浏览器验收。真跳到谷歌、选账号这一步本机走不了（谷歌后台只登记了 zhihebi.com 的回调），
# 上线后由站长用自己的谷歌账号点一次。这里测的是我们这边：
#   1. 登录框、注册框底下都有「用 Google 账号登录」，链接带着登录后要回的页面；
#   2. /api/auth/google/start：跳去谷歌，带客户端编号、回调网址、state，并把 state 写进只发给 /api/auth/google 的 cookie；
#   3. callback：在谷歌点了取消 / state 对不上 / 授权码换不到 token → 回首页弹登录框，说一句为什么；
#   4. 没配谷歌（本机 8999）→ 回首页说「暂时用不了」；
#   5. 微信里点 → 不跳，提示去浏览器打开。
# 用法：本机起两个预览：8999（平常那个）和 8998（带假的谷歌配置）：
#   npx wrangler pages dev . --port 8998 --binding SESSION_SECRET=dev-secret --binding GOOGLE_CLIENT_ID=test-cid.apps.googleusercontent.com --binding GOOGLE_CLIENT_SECRET=fake-secret
#   uv run --with playwright python tools/e2e-google-browser.py
import sys, urllib.request, urllib.error
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8999'
GBASE = 'http://127.0.0.1:8998'
results = []


def check(name, ok, extra=''):
    results.append(bool(ok))
    print(('✓ ' if ok else '✗ ') + name + ((' → ' + str(extra)) if not ok else ''))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


op = urllib.request.build_opener(NoRedirect)


def get(url, cookie=None):
    req = urllib.request.Request(url, headers={'Cookie': cookie} if cookie else {})
    try:
        r = op.open(req)
    except urllib.error.HTTPError as e:
        r = e
    return r.status if hasattr(r, 'status') else r.code, r.headers


# ---------- 服务器这边 ----------
st, h = get(GBASE + '/api/auth/google/start?next=' + urllib.request.quote('/shudu?size=6'))
loc = h.get('Location') or ''
q = parse_qs(urlparse(loc).query)
check('start → 302 跳去谷歌', st == 302 and loc.startswith('https://accounts.google.com/o/oauth2/v2/auth?'), loc)
check('带着客户端编号、回调网址、只要邮箱', q.get('client_id') == ['test-cid.apps.googleusercontent.com'] and q.get('redirect_uri') == [GBASE + '/api/auth/google/callback'] and q.get('scope') == ['openid email'], q)
cookies = h.get_all('Set-Cookie') or []
gc = [c for c in cookies if c.startswith('g_oauth=')]
state = q.get('state', [''])[0]
check('state 写进 cookie（只发给 /api/auth/google，HttpOnly）', gc and gc[0].startswith('g_oauth=' + state + '|') and 'Path=/api/auth/google;' in gc[0] and 'HttpOnly' in gc[0], cookies)
cv = gc[0].split(';')[0] if gc else ''

st, h = get(GBASE + '/api/auth/google/callback?error=access_denied&state=' + state, cv)
check('在谷歌点了取消 → 回首页 gerr=cancel', st == 302 and h.get('Location') == '/?gerr=cancel#login', h.get('Location'))
st, h = get(GBASE + '/api/auth/google/callback?code=x&state=' + state)
check('没有 state cookie（别的网站引过来的）→ gerr=state', h.get('Location') == '/?gerr=state#login', h.get('Location'))
st, h = get(GBASE + '/api/auth/google/callback?code=x&state=' + 'f' * 32, cv)
check('state 对不上 → gerr=state', h.get('Location') == '/?gerr=state#login', h.get('Location'))
st, h = get(GBASE + '/api/auth/google/callback?code=fake-code&state=' + state, cv)
sc = h.get_all('Set-Cookie') or []
check('授权码是假的（谷歌换不到 token）→ gerr=token，不发登录态', h.get('Location') == '/?gerr=token#login' and not any(c.startswith('sumsum_sess=') and 'Max-Age=0' not in c for c in sc), [h.get('Location'), sc])
check('回首页时清掉 state cookie', any(c.startswith('g_oauth=;') and 'Max-Age=0' in c for c in sc), sc)
st, h = get(BASE + '/api/auth/google/start')
check('没配谷歌的环境 → 回首页说暂时用不了', st == 302 and h.get('Location') == '/?gerr=off#login', h.get('Location'))

# ---------- 页面这边 ----------
with sync_playwright() as p:
    br = p.chromium.launch()
    errs = []
    ctx = br.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/#login')
    pg.wait_for_selector('dialog.account-dialog[open] form[data-view="login"]', timeout=10000)
    check('登录框底下有「用 Google 账号登录」', pg.is_visible('dialog.account-dialog a[data-google]') and 'Google' in pg.inner_text('dialog.account-dialog a[data-google]'))
    pg.click('dialog.account-dialog [data-goto="register"]')
    check('注册框底下也有', pg.is_visible('dialog.account-dialog a[data-google]'))

    pg.goto(BASE + '/?gerr=token#login')
    pg.wait_for_selector('dialog.account-dialog[open] [data-msg]:not([hidden])', timeout=10000)
    check('谷歌登录没成功回来 → 弹登录框说明原因', '谷歌登录没成功' in pg.inner_text('dialog.account-dialog [data-msg]'))
    check('网址里的 gerr 清掉了（刷新不再提示）', 'gerr' not in pg.url, pg.url)

    pg.goto(BASE + '/huochai')
    pg.wait_for_selector('#preview .sheet', timeout=15000)
    pg.evaluate("document.querySelectorAll('dialog.help-dialog[open]').forEach(d => d.close())")
    pg.evaluate("SumSum.accountUI.open('login')")
    pg.wait_for_selector('dialog.account-dialog[open] a[data-google]')
    reqs = []
    pg.on('request', lambda r: reqs.append(r.url) if '/api/auth/google/start' in r.url else None)
    pg.click('dialog.account-dialog a[data-google]')
    pg.wait_for_timeout(1500)
    check('板块页点谷歌登录 → 去 start，登录后回这一页', reqs and 'next=%2Fhuochai' in reqs[0], reqs)
    ctx.close()

    wx = br.new_context(viewport={'width': 400, 'height': 800}, user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.50')
    wp = wx.new_page()
    wp.goto(BASE + '/#login')
    wp.wait_for_selector('dialog.account-dialog[open] a[data-google]', timeout=10000)
    wp.click('dialog.account-dialog a[data-google]')
    wp.wait_for_timeout(800)
    check('微信里点 → 不跳走，提示去浏览器打开', wp.url.startswith(BASE + '/') and '在浏览器打开' in wp.inner_text('dialog.account-dialog [data-msg]'), wp.url)
    wx.close()
    check('全程没有脚本报错', not errs, errs)
    br.close()

print('\n%d / %d 通过' % (sum(results), len(results)))
sys.exit(0 if all(results) else 1)
