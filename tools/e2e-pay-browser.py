# 付费开通完整版（2026-11-28，Waffo）：用一个假 Waffo 把整套流程在本机走一遍。
#   起一个假 Waffo（:8996，验我们请求的签名、出收银台页、付款后按 Waffo 的规则签名发回调），
#   再起一个带收款配置的本机预览（:8997，和 :8999 共用本机 D1），浏览器里：
#   注册免费账号 → 账号页「开通完整版 · 99 元/年」→ 假收银台付款 → 回来「完整版已开通」→ 到期日加一年；
#   回调丢了时轮询兜底开通；管理页看到订单、点退款扣回一年；签名不对的回调被拒。
# 本机 D1 先跑过 tools/migrate-20261128-orders.sql。用法：
#   /opt/homebrew/opt/python@3.10/bin/python3.10 tools/e2e-pay-browser.py
import base64, hashlib, json, os, signal, subprocess, sys, threading, time, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOCK_PORT, APP_PORT = 8996, 8997
BASE = 'http://localhost:%d' % APP_PORT
MOCK = 'http://localhost:%d' % MOCK_PORT
ADMIN_EMAIL, ADMIN_PW = 'preview@local.test', 'preview123'
STAMP = int(time.time())

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


def d1(sql):
    r = subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'lianxizhi', '--local', '--json', '--command', sql], capture_output=True, text=True, cwd=ROOT)
    try:
        return json.loads(r.stdout)[0]['results']
    except Exception:
        return []


# ---------- 钥匙：商户（我们签请求）、Waffo（签回调） ----------
merchant = rsa.generate_private_key(public_exponent=65537, key_size=2048)
waffo = rsa.generate_private_key(public_exponent=65537, key_size=2048)
MERCHANT_PK8 = base64.b64encode(merchant.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())).decode()
WAFFO_PUB = base64.b64encode(waffo.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)).decode()
MERCHANT_ID = 'MER_e2etest12345678901234'
PRODUCT_ID = 'PROD_e2etest1234567890123'

sessions = {}     # orderNo → create-session 参数
payments = {}     # orderNo → 付款（graphql 用）
refunds = []
sig_errors = []


def verify_request(handler, body):
    ts = handler.headers.get('X-Timestamp', '')
    sig = handler.headers.get('X-Signature', '')
    canonical = 'POST\n%s\n%s\n%s' % (handler.path, ts, base64.b64encode(hashlib.sha256(body).digest()).decode())
    try:
        merchant.public_key().verify(base64.b64decode(sig), canonical.encode(), padding.PKCS1v15(), hashes.SHA256())
        if handler.headers.get('X-Merchant-Id') != MERCHANT_ID:
            raise ValueError('merchant id')
        return True
    except Exception as e:
        sig_errors.append(handler.path + ' ' + str(e))
        return False


def send_webhook(event, key=None):
    payload = json.dumps(event, ensure_ascii=False)
    t = str(int(time.time() * 1000))
    sig = (key or waffo).sign((t + '.' + payload).encode(), padding.PKCS1v15(), hashes.SHA256())
    req = urllib.request.Request(BASE + '/api/pay/waffo', data=payload.encode(), method='POST', headers={
        'Content-Type': 'application/json', 'X-Waffo-Signature': 't=%s,v1=%s' % (t, base64.b64encode(sig).decode())})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def pay(order, hook=True):
    s = sessions[order]
    payments[order] = {'id': 'PAY_' + order[-12:], 'status': 'succeeded', 'orderMerchantExternalId': order, 'createdAt': '2026-11-28T00:00:00Z',
                       'snapshotAmountDetails': {'currency': s['currency'], 'total': s['priceSnapshot']['amount']}}
    if hook:
        return send_webhook({'id': 'evt_' + order, 'eventType': 'order.completed', 'eventId': payments[order]['id'], 'mode': 'prod',
                             'data': {'orderId': 'ORD_x', 'orderMerchantExternalId': order, 'paymentId': payments[order]['id'], 'paymentStatus': 'succeeded',
                                      'amount': s['priceSnapshot']['amount'], 'total': s['priceSnapshot']['amount'], 'taxAmount': '0.00', 'currency': s['currency'],
                                      'buyerEmail': s.get('buyerEmail', ''), 'merchantProvidedBuyerIdentity': '', 'productName': '纸和笔完整版'}})


class Mock(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def reply(self, obj, status=200, ctype='application/json'):
        data = obj if isinstance(obj, bytes) else json.dumps(obj).encode()
        self.send_response(status)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        # 假收银台：/c/<订单号>（#token=… 浏览器不发过来）
        if self.path.startswith('/c/'):
            order = self.path[3:].split('?')[0]
            s = sessions.get(order, {})
            html = ('<!doctype html><meta charset="utf-8"><title>假收银台</title><h1>假 Waffo 收银台</h1>'
                    '<p id="amt">%s %s</p><form method="post" action="/pay/%s"><button id="pay">付款</button></form>'
                    '<form method="post" action="/pay/%s?nohook=1"><button id="pay-nohook">付款（回调丢失）</button></form>') % (
                s.get('priceSnapshot', {}).get('amount'), s.get('currency'), order, order)
            return self.reply(html.encode(), 200, 'text/html; charset=utf-8')
        self.reply({'errors': [{'message': 'not found'}]}, 404)

    def do_POST(self):
        n = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(n)
        if self.path.startswith('/pay/'):
            order = self.path[5:].split('?')[0]
            pay(order, hook='nohook' not in self.path)
            self.send_response(303)
            self.send_header('Location', sessions[order]['successUrl'])
            self.end_headers()
            return
        if not verify_request(self, body):
            return self.reply({'errors': [{'message': 'Authentication failed'}]}, 401)
        p = json.loads(body)
        if self.path == '/v1/actions/auth/issue-session-token':
            return self.reply({'data': {'token': 'tok_' + p['buyerIdentity'], 'expiresAt': 'x'}})
        if self.path == '/v1/actions/checkout/create-session':
            sessions[p['orderMerchantExternalId']] = p
            return self.reply({'data': {'sessionId': 'cs_' + p['orderMerchantExternalId'], 'checkoutUrl': MOCK + '/c/' + p['orderMerchantExternalId'], 'expiresAt': 'x'}})
        if self.path == '/v1/graphql':
            ref = p['variables']['ref']
            return self.reply({'data': {'payments': [payments[ref]] if ref in payments else []}})
        if self.path == '/v1/actions/refund-ticket/create-ticket':
            refunds.append(p)
            return self.reply({'data': {'ticket': {'id': 'TKT_' + str(len(refunds)), 'status': 'processing'}}})
        self.reply({'errors': [{'message': 'unknown ' + self.path}]}, 404)


mock = ThreadingHTTPServer(('localhost', MOCK_PORT), Mock)
threading.Thread(target=mock.serve_forever, daemon=True).start()

d1("DELETE FROM limits WHERE scope LIKE 'ip%' OR scope = 'all'")
app = subprocess.Popen(['npx', 'wrangler', 'pages', 'dev', '.', '--port', str(APP_PORT),
                        '--binding', 'SESSION_SECRET=dev-secret', '--binding', 'DEV_SHOW_CODE=1',
                        '--binding', 'WAFFO_MERCHANT_ID=' + MERCHANT_ID, '--binding', 'WAFFO_PRIVATE_KEY=' + MERCHANT_PK8,
                        '--binding', 'WAFFO_PRODUCT_ID=' + PRODUCT_ID, '--binding', 'WAFFO_API_BASE=' + MOCK,
                        '--binding', 'WAFFO_WEBHOOK_PUBLIC_KEY=' + WAFFO_PUB, '--binding', 'WAFFO_ENV=prod'],
                       cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, start_new_session=True)
log_lines = []
threading.Thread(target=lambda: [log_lines.append(l) for l in app.stdout], daemon=True).start()
for _ in range(90):
    try:
        urllib.request.urlopen(BASE + '/api/pay/info', timeout=2)
        break
    except Exception:
        time.sleep(1)


def register(page, email):
    codes = []
    page.on('response', lambda r: codes.append(r) if r.url.endswith('/api/auth/register') else None)
    page.goto(BASE + '/')
    page.wait_for_selector('[data-wl-signup]', timeout=15000)
    page.click('[data-wl-signup]')
    page.wait_for_selector('dialog.account-dialog form[data-view="register"]', timeout=5000)
    page.fill('form[data-view="register"] input[name="email"]', email)
    page.fill('form[data-view="register"] input[name="password"]', 'password123')
    page.click('form[data-view="register"] [data-act="submit"]')
    page.wait_for_selector('.code-box', timeout=30000)
    code = json.loads(codes[-1].text())['dev_code']
    for box, digit in zip(page.query_selector_all('.code-box'), code):
        box.type(digit)
    page.wait_for_function('() => window.SumSum && SumSum.account && SumSum.account.state.loggedIn', timeout=20000)


def open_account(page):
    page.evaluate("SumSum.accountUI.open('account')")
    page.wait_for_selector('dialog.account-dialog .account-plan', timeout=5000)


def full_until(email):
    r = d1("SELECT full_until FROM users WHERE email='%s'" % email)
    return int(r[0]['full_until']) if r else 0


try:
    info = json.loads(urllib.request.urlopen(BASE + '/api/pay/info').read())
    check('带收款配置的预览：收款开着、99 元/年', info.get('on') is True and info.get('price') == 9900, info)

    with sync_playwright() as p:
        br = p.chromium.launch()
        errs = []
        ctx = br.new_context(viewport={'width': 1440, 'height': 900})
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        email = 'pay%d@local.test' % STAMP
        register(pg, email)
        before = full_until(email)
        check('新注册：7 天体验', before > time.time() * 1000 + 6 * 86400 * 1000, before)

        # 账号页买
        open_account(pg)
        check('账号页有「开通完整版 · 99 元/年」', '开通完整版 · 99 元/年' in pg.inner_text('dialog.account-dialog .account-plan'))
        check('账号页链了退款说明', pg.locator('dialog.account-dialog a[href="/terms"]').count() == 1)
        pg.click('dialog.account-dialog [data-pay-buy]')
        pg.wait_for_url(MOCK + '/c/**', timeout=20000)
        check('跳到收银台，金额 99.00 CNY', pg.inner_text('#amt').strip() == '99.00 CNY', pg.inner_text('#amt'))
        order = pg.url.split('/c/')[1].split('#')[0]
        s = sessions.get(order, {})
        check('收银台参数：商品、中文、订单号、回来的地址、邮箱', s.get('productId') == PRODUCT_ID and s.get('language') == 'zh-Hans' and
              s.get('successUrl') == BASE + '/?paid=' + order and s.get('buyerEmail') == email, s)
        check('签名都对（假 Waffo 用商户公钥验过）', not sig_errors, sig_errors)
        pg.click('#pay')
        pg.wait_for_url(BASE + '/?paid=' + order, timeout=20000)
        try:
            pg.wait_for_selector('.pay-wait', timeout=10000)
        except Exception:
            print('DEBUG url', pg.url, 'errs', errs, 'pay', pg.evaluate('typeof SumSum !== "undefined" && !!SumSum.pay'), pg.evaluate('document.title'))
            pg.screenshot(path='/tmp/pay-debug.png')
            raise
        pg.wait_for_function("() => document.querySelector('.pay-wait [data-pw-title]').textContent === '完整版已开通'", timeout=30000)
        txt = pg.inner_text('.pay-wait')
        check('回来显示「完整版已开通」和到期日', '用到' in txt and '年' in txt, txt)
        after = full_until(email)
        check('到期日 = 原到期日 + 365 天', abs(after - (before + 365 * 86400 * 1000)) < 1000, (after - before) / 86400000)
        rows = d1("SELECT status, amount, currency, waffo_payment_id FROM orders WHERE id='%s'" % order)
        check('订单：已付、9900 分、CNY、记了付款号', rows and rows[0]['status'] == 'paid' and rows[0]['amount'] == 9900 and rows[0]['waffo_payment_id'], rows)
        check('开通邮件（本机打日志）', any('纸和笔完整版已开通' in l for l in log_lines))
        pg.click('.pay-wait [data-pw-ok]')
        pg.wait_for_load_state('load')
        check('点「好的」后网址去掉了 paid', 'paid=' not in pg.url, pg.url)

        # 同一回调重放：不再加
        check('同一回调再发一次：不再加天数', pay(order) == 200 and full_until(email) == after)
        # 签名不对的回调
        fake = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        st = send_webhook({'eventType': 'order.completed', 'mode': 'prod', 'data': {'orderMerchantExternalId': order}}, key=fake)
        check('别人签的回调：401', st == 401, st)

        # 回调丢了：轮询兜底
        open_account(pg)
        check('已付用户账号页写用到哪天', '用到' in pg.inner_text('dialog.account-dialog .account-plan'))
        pg.click('dialog.account-dialog [data-pay-buy]')
        pg.wait_for_url(MOCK + '/c/**', timeout=20000)
        order2 = pg.url.split('/c/')[1].split('#')[0]
        pg.click('#pay-nohook')
        pg.wait_for_url(BASE + '/?paid=' + order2, timeout=20000)
        pg.wait_for_function("() => document.querySelector('.pay-wait [data-pw-title]') && document.querySelector('.pay-wait [data-pw-title]').textContent === '完整版已开通'", timeout=30000)
        after2 = full_until(email)
        check('回调丢了：页面轮询查到已付也开通，再加一年', abs(after2 - (after + 365 * 86400 * 1000)) < 1000, (after2 - after) / 86400000)
        ctx.close()

        # 管理页退款
        ctx = br.new_context(viewport={'width': 1440, 'height': 900})
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE + '/')
        if not pg.is_visible('form[data-view="login"]'):
            pg.click('.sh-act a')
        pg.fill('form[data-view="login"] input[name="email"]', ADMIN_EMAIL)
        pg.fill('form[data-view="login"] input[name="password"]', ADMIN_PW)
        pg.click('form[data-view="login"] [data-act="submit"]')
        pg.wait_for_url(BASE + '/', timeout=30000)
        d1("UPDATE users SET admin=1 WHERE email='%s'" % ADMIN_EMAIL)
        pg.goto(BASE + '/admin')
        pg.wait_for_selector('[data-refund="%s"]' % order2, timeout=15000)
        check('管理页：订单列表里有这两单', pg.locator('[data-refund="%s"]' % order).count() == 1)
        pg.on('dialog', lambda d: d.accept())
        pg.click('[data-refund="%s"]' % order2)
        pg.wait_for_function("(o) => !document.querySelector('[data-refund=\"' + o + '\"]')", arg=order2, timeout=15000)
        check('退款：按付款号、99.00 元', refunds and refunds[-1]['paymentId'] == payments[order2]['id'] and refunds[-1]['requestedAmount'] == {'amount': '99.00', 'currency': 'CNY'}, refunds)
        check('退款：订单已退、扣回一年', d1("SELECT status FROM orders WHERE id='%s'" % order2)[0]['status'] == 'refunded' and abs(full_until(email) - after) < 1000)
        ctx.close()

        # 页面上的入口：上锁页、拼音闪卡锁（免费账号）
        ctx = br.new_context(viewport={'width': 1440, 'height': 900})
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        email2 = 'payfree%d@local.test' % STAMP
        register(pg, email2)
        d1("UPDATE users SET full_until=0 WHERE email='%s'" % email2)
        pg.goto(BASE + '/kousuan?view=cards')
        pg.wait_for_selector('#ks-cards:not([hidden])', timeout=15000)
        pg.select_option('#mfc-unit', 'all')
        pg.wait_for_selector('#preview .full-lock [data-pay-buy]', timeout=10000)
        check('完整版锁上：「开通完整版」在前、邀请码在后，没有「通知我」', pg.locator('#preview [data-fl-want]').count() == 0 and pg.locator('#preview [data-fl-redeem]').count() == 1)
        gctx = br.new_context(viewport={'width': 1440, 'height': 900})
        gp = gctx.new_page()
        gp.on('pageerror', lambda e: errs.append(str(e)))
        gp.goto(BASE + '/pinyin')
        gp.wait_for_selector('[data-lk-pay]:not([hidden])', timeout=15000)
        check('没登录看完整版板块：说明页显示付费开通、藏起「开通时通知我」', gp.is_visible('[data-lk-pay] [data-pay-buy]') and not gp.is_visible('[data-lk-want]'))
        gp.click('[data-lk-pay] [data-pay-buy]')
        gp.wait_for_selector('dialog.account-dialog form[data-view="register"]', timeout=5000)
        check('没登录点开通：先弹注册', '先注册' in gp.inner_text('dialog.account-dialog'))
        gctx.close()
        pg.goto(BASE + '/terms')
        check('用户协议和退款说明能打开、不收录', '7 天内' in pg.inner_text('main') and pg.locator('meta[name="robots"][content="noindex"]').count() == 1)
        check('全程没有脚本报错', not errs, errs)
        ctx.close()
        br.close()
finally:
    try:
        os.killpg(os.getpgid(app.pid), signal.SIGTERM)
    except Exception:
        pass
    mock.shutdown()

print('')
print('%d / %d 通过' % (ok_n, ok_n + len(bad)))
sys.exit(1 if bad else 0)
