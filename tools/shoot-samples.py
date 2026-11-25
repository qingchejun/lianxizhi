# 首页「九个板块，印出来就是这样」和完整版说明页用的样张：每个板块截一整页 A4，缩成 600×848（屏幕上按 300 宽显示，2 倍清晰）。
# 2026-11-25 起用这个脚本生成（以前手工截上半页，改了板块名就跟实际对不上）。改了板块名、版面后重跑一次：
#   先起本机预览（npx wrangler pages dev . --port 8999 --binding SESSION_SECRET=dev-secret --binding DEV_SHOW_CODE=1），再
#   uv run --with playwright --with pillow python tools/shoot-samples.py
#   然后 node tools/stamp-assets.js（图片换了，网址指纹跟着换）。
# 用本机新注册的完整版账号截（识字、拼音要完整版；纸角带二维码，跟家长登录后打出来的一样）。
import io, json, random, subprocess, sys, time
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'img' / 'samples'
BASE = 'http://127.0.0.1:8999'
W, H = 600, 848  # A4 比例

# 板块 → (网址, 取预览里的第几张纸)
SHOTS = {
    'kousuan': ('/kousuan?carryMode=carryonly', 0),   # 跟首页首屏按钮同一种题
    'aoshu': ('/aoshu?topic=yiduobushao', 2),         # 第 03 课（免费）的练习页；0、1 是方法讲解
    'shizi': ('/shizi', 0),
    'pinyin': ('/pinyin', 0),
    'shudu': ('/shudu', 0),
    'huochai': ('/huochai', 0),
    'mima': ('/mima', 0),
    'migong': ('/migong', 0),
    'zhizhi': ('/zhizhi', 0),
}


def d1(sql):
    subprocess.run(['npx', 'wrangler', 'd1', 'execute', 'lianxizhi', '--local', '--command', sql], check=True, capture_output=True)


def fit(png):
    im = Image.open(io.BytesIO(png)).convert('RGB')
    im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    page = Image.new('RGB', (W, H), 'white')
    page.paste(im.crop((0, 0, W, min(H, im.height))), (0, 0))  # 比 A4 长（拼音屏幕上稍长）就截掉底下，短就补白
    return page


d1("DELETE FROM limits WHERE scope LIKE 'ip%' OR scope = 'all'")
code = ''.join(random.choice('ABCDEFGHJKMNPQRSTUVWXYZ23456789') for _ in range(8))
d1(f"INSERT INTO invites(id,code,note,created_at) VALUES ('shot-{code}','{code}','样张截图',0)")

with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page(viewport={'width': 1600, 'height': 1300}, device_scale_factor=2)
    regs = []
    pg.on('response', lambda r: regs.append(r) if r.url.endswith('/api/auth/register') else None)
    pg.goto(BASE + '/')
    pg.click('[data-wl-signup]')
    pg.wait_for_selector('form[data-view="register"]')
    pg.fill('form[data-view="register"] input[name="email"]', 'samples-%d@test.local' % int(time.time()))
    pg.fill('form[data-view="register"] input[name="password"]', 'password123')
    pg.fill('form[data-view="register"] input[name="invite"]', code)
    pg.click('form[data-view="register"] [data-act="submit"]')
    pg.wait_for_selector('.code-box', timeout=30000)
    for box, digit in zip(pg.query_selector_all('.code-box'), json.loads(regs[-1].text())['dev_code']):
        box.type(digit)
    pg.wait_for_selector('#today-cards', timeout=30000)

    for name, (path, index) in SHOTS.items():
        pg.goto(BASE + path)
        pg.wait_for_selector('#preview .sheet', timeout=20000)
        pg.wait_for_timeout(1500)  # 字体、二维码画完
        pg.evaluate("document.querySelectorAll('dialog[open]').forEach(d => d.close())")
        sheet = pg.locator('#preview .sheet').nth(index)
        fit(sheet.screenshot()).save(OUT / (name + '.jpg'), quality=84, optimize=True, progressive=True)
        print('✓', name)
    br.close()
