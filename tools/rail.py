#!/usr/bin/env python3
"""
把左侧板块栏写进各板块页面。用法：python3 tools/rail.py

各板块页面的板块栏一模一样，只有「当前是哪一个」不同。手抄八份迟早会改漏一份，
所以页面里只留 <!-- rail:今天 --> … <!-- /rail --> 这对标记，内容由本脚本生成。
改板块栏（加板块、换图标、调分组）只改这里，再跑一遍。

2026-11 起分两组：练习（今天/口算/奥数/识字/拼音）与游戏（数独/火柴/密码/迷宫/数织，按受欢迎程度排）——
给孩子选板块时先分「做题还是玩」，再挑具体项目。
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent

# (名称, 页面, 图标)。2026-11 全站改版统一的一套线条图标：24 网格、描边 1.75、圆头圆角，
# 只有少量「实心小块」（class="f"，填 currentColor）做强调。单独的 SVG 文件由本脚本同步写到 icons/rail/。
GROUPS = [
    ('练习', [
        ('今天', '/', 'today', '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><rect class="f" x="7" y="12.5" width="4" height="4" rx="1"/>'),
        ('口算', '/kousuan', 'kousuan', '<path d="M4.5 7.5h5.5M7.25 4.75v5.5M14 7.5h5.5M5 14.25l4.5 4.5M9.5 14.25L5 18.75M14 15h5.5M14 18.25h5.5"/>'),
        ('奥数', '/aoshu', 'aoshu', '<path d="M12 3.75l8.5 15.5h-17z"/><circle cx="12" cy="14" r="2.75"/>'),
        ('识字', '/shizi', 'shizi', '<path d="M12 6.5C10 5 7 4.5 4 5v13.5c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5V20"/>'),
        ('拼音', '/pinyin', 'pinyin', '<circle cx="10.5" cy="14.25" r="4.25"/><path d="M14.75 10v8.5M7 5.25h8M4 20.25h16"/>'),
    ]),
    ('游戏', [
        ('数独', '/shudu', 'shudu', '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M9.33 4v16M14.67 4v16M4 9.33h16M4 14.67h16"/>'),
        ('火柴', '/huochai', 'huochai', '<path d="M6 18L15.5 8.5M17.5 6.5h.01M9 19.5h10"/><circle class="f" cx="17" cy="7" r="1.75"/>'),
        ('密码', '/mima', 'mima', '<rect x="4" y="10.5" width="16" height="10" rx="2.5"/><path d="M7.75 10.5V7.75a4.25 4.25 0 0 1 8.5 0v2.75M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01"/>'),
        ('迷宫', '/migong', 'migong', '<path d="M8.5 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h9M12.5 4h5A2.5 2.5 0 0 1 20 6.5V20M8.5 4v4.5h4M16 8.5V16M8 12.5V16h4"/>'),
        ('数织', '/zhizhi', 'zhizhi', '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M12 4v16M4 12h16"/><rect class="f" x="6.25" y="6.25" width="3.5" height="3.5" rx=".75"/><rect class="f" x="14.25" y="14.25" width="3.5" height="3.5" rx=".75"/>'),
    ]),
]

# 栏底：使用说明 + 当前登录的账号（点开是菜单：账号与密码 / 备份与恢复 / 退出登录）。
# 2026-11 二次改版：账号、备份不再和板块平级摆成按钮，收进账号菜单，像正式产品那样。
TOOLS = [
    ('使用说明', '/help', 'data-help', 'help', '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.3M12 16.75h.01"/>'),
    # 2026-11-28 会员入口：放在使用说明下面，免费版 / 没登录时着重显示（js/sidebar.js 按账号改右边的小字）
    ('会员', '/huiyuan', 'data-vip', 'vip', '<path d="M4.5 8.5l4 3.5L12 6l3.5 6 4-3.5-1.75 10h-11.5z"/><path d="M7.25 21h9.5"/>'),
]
MENU = [
    ('账号与密码', 'data-account=""', 'account', '<circle cx="12" cy="8.25" r="3.75"/><path d="M4.75 19.75c1.4-3.3 4.1-4.75 7.25-4.75s5.85 1.45 7.25 4.75"/>'),
    ('备份与恢复', 'data-backup', 'backup', '<path d="M12 4v10M8 10.25L12 14l4-3.75M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/>'),
    ('退出登录', 'data-logout', 'logout', '<path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14M10 16l-4-4 4-4M6 12h9.5"/>'),
]

SVG_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true">'

ME = ('  <div class="rail-me">\n'
      '    <button type="button" class="rail-user" data-account-menu aria-haspopup="menu" aria-expanded="false" title="账号">'
      '<span class="rail-avatar" data-account-initial aria-hidden="true"></span>'
      '<span class="rail-who"><b data-account-email>账号</b><small>练习进度自动同步</small></span>'
      + SVG_OPEN + '<path d="M8 10l4-4 4 4M8 14l4 4 4-4"/></svg></button>\n'
      '    <div class="rail-menu" role="menu" hidden>\n'
      + ''.join('      <button type="button" role="menuitem" %s>%s%s</svg><span>%s</span></button>\n' % (attr, SVG_OPEN, icon, name)
                for name, attr, _, icon in MENU)
      + '    </div>\n  </div>\n')

def tail(current):
    # 「使用说明」是到帮助页的链接（help.js 会按当前板块补上 #锚点）；在帮助页上它就是当前项
    out = '  <span class="rail-gap"></span>\n'
    for name, href, attr, slug, icon in TOOLS:
        on = name == current
        cls = ' rail-' + slug if slug == 'vip' else ''
        tag = '<small class="rail-tag" data-vip-tag></small>' if slug == 'vip' else ''
        out += ('  <a class="rail-link rail-tool%s%s" href="%s" %s title="%s"%s>%s%s</svg><span>%s</span>%s</a>\n'
                % (cls, ' active' if on else '', href, attr, name, ' aria-current="page"' if on else '', SVG_OPEN, icon, name, tag))
    return out + ME


FOLD = ('<button type="button" class="rail-fold" data-rail-fold aria-label="收起侧栏" title="收起侧栏">'
        + SVG_OPEN + '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.5 4.5v15M15.5 10l-2 2 2 2"/></svg></button>')

BRAND = ('  <div class="rail-top"><a class="rail-brand" href="/" aria-label="纸和笔 · 今天">'
         '<img src="icons/mark.svg" width="28" height="28" alt=""><span>纸和笔<small>少报班，少看屏</small></span></a>' + FOLD + '</div>\n')

# 每页 <head> 里统一的标签页 / 桌面图标（替换旧的 emoji 图标）
HEAD_ICONS = ('<link rel="icon" href="icons/favicon.svg" type="image/svg+xml" />\n'
              '  <link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />\n'
              '  <meta name="theme-color" content="#f6f7f9" />')
# 侧栏收起状态要在画第一帧前就定下来，否则会先展开再收起闪一下（只存本机，不进云同步）
FOLD_BOOT = ('<script>try{if(localStorage.getItem("lianxizhi:rail")==="fold")'
             'document.documentElement.classList.add("rail-folded")}catch(e){}</script>')

PAGES = {
    'index.html': '今天', 'kousuan.html': '口算', 'aoshu.html': '奥数',
    'shizi.html': '识字', 'shudu.html': '数独', 'mima.html': '密码', 'zhizhi.html': '数织',
    'migong.html': '迷宫', 'huochai.html': '火柴', 'pinyin.html': '拼音', 'help.html': '使用说明', 'admin.html': '邀请码管理', 'mark.html': '打分',
    'locked.html': '上锁', 'huiyuan.html': '会员', 'coushifa.html': '口算', 'poshifa.html': '口算',
}


def rail(current):
    out = ['<nav class="rail" aria-label="板块">\n', BRAND]
    for label, links in GROUPS:
        out.append('  <span class="rail-label">%s</span>\n' % label)
        for name, href, _, icon in links:
            on = name == current
            out.append(
                ('  <a class="rail-link%s" href="%s" data-module="%s" title="%s"%s>' + SVG_OPEN + '%s</svg><span>%s</span></a>\n')
                % (' active' if on else '', href, name, name, ' aria-current="page"' if on else '', icon, name)
            )
    out.append(tail(current))
    out.append('</nav>\n<script src="js/sidebar.js" defer></script>')
    return ''.join(out)


ICON_RE = re.compile(r'[ \t]*<(?:link rel="(?:icon|apple-touch-icon)"|meta name="theme-color")(?:[^>"]|"[^"]*")*>\n')
FOLD_RE = re.compile(r'[ \t]*<script>try\{if\(localStorage\.getItem\("lianxizhi:rail"\).*?</script>\n')


def head_icons(text, app=False):
    text = ICON_RE.sub('', text)
    text = FOLD_RE.sub('', text)
    extra = ('  ' + FOLD_BOOT + '\n') if app else ''
    return re.sub(r'(<meta name="viewport"[^>]*>\n)', lambda m: m.group(1) + '  ' + HEAD_ICONS + '\n' + extra, text, count=1)


# 单独的 SVG 源文件（设计交付用；页面里是内联的）
out_dir = ROOT / 'icons' / 'rail'
out_dir.mkdir(parents=True, exist_ok=True)
for _, items in GROUPS:
    for name, _, slug, icon in items:
        (out_dir / (slug + '.svg')).write_text(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><style>.f{fill:currentColor;stroke:none}</style>'
            + icon + '</svg>\n', encoding='utf-8')
for name, _, slug, icon in [(t[0], t[2], t[3], t[4]) for t in TOOLS] + MENU:
    (out_dir / (slug + '.svg')).write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + icon + '</svg>\n', encoding='utf-8')

for page in ['welcome.html', '404.html', 'privacy.html']:
    path = ROOT / page
    path.write_text(head_icons(path.read_text(encoding='utf-8')), encoding='utf-8')

for page, current in PAGES.items():
    path = ROOT / page
    text = path.read_text(encoding='utf-8')
    pat = re.compile(r'(<!-- rail:%s -->).*?(<!-- /rail -->)' % re.escape(current), re.S)
    if not pat.search(text):
        raise SystemExit('%s 里没找到 <!-- rail:%s --> 标记' % (page, current))
    text = pat.sub(lambda m: m.group(1) + '\n' + rail(current) + '\n' + m.group(2), text)
    text = head_icons(text, app=True)
    path.write_text(text, encoding='utf-8')
    print('✓', page)

# 页眉、页脚（2026-11-25 站长定）：一种页面只用一种导航。
# 1. 没有侧栏的页面（首页、隐私说明、404）顶上放页眉：品牌 + 九个板块 + 登录 / 免费注册；
# 2. 页脚只放在首页（没登录的首页 welcome.html 和登录后的「今天」index.html，网址都是 /）；
#    有侧栏的板块页、内页不放页脚，侧栏就是它们的导航。
# 页面里只留 <!-- sitehead --> … <!-- /sitehead -->、<!-- sitefoot --> … <!-- /sitefoot --> 标记，内容在这里生成。
# 链接文字用各页的主词（锚文本 = 目标页关键词）；加内页时往 INNER 里加一行（排在所属板块后面）。
HEAD_NAMES = [(g, [(n, h) for n, h, *_ in items if n != '今天']) for g, items in GROUPS]
FOOT_NAME = {'口算': '口算题', '奥数': '奥数', '识字': '识字', '拼音': '拼音', '数独': '儿童数独',
             '火柴': '火柴棒等式题', '密码': '密码推理题', '迷宫': '儿童迷宫', '数织': '数织游戏'}
# 页眉位置窄，大多用短名；单看容易猜错的三个写全（2026-11-25 站长同意）。只改显示文字，侧栏、锁、data-module 仍用短名
HEAD_NAME = {'口算': '口算题', '火柴': '火柴棒', '密码': '密码推理'}
FULL_ONLY = ['识字', '拼音']  # 奥数 11-25 起前三课免费，不再标  # 会员才能用全的，链接后面标小字
INNER = {'口算': [('凑十法练习题', '/kousuan/coushifa'), ('破十法练习题', '/kousuan/poshifa')]}


def sitehead():
    nav = '<i aria-hidden="true"></i>'.join(
        '<span class="sh-group">%s</span>%s' % (g, ''.join('<a href="%s">%s</a>' % (h, HEAD_NAME.get(n, n)) for n, h in items))
        for g, items in HEAD_NAMES)
    return ('<header class="sh"><div class="sh-in">\n'
            '  <a class="sh-brand" href="/" aria-label="纸和笔首页"><img src="/icons/mark.svg" width="28" height="28" alt=""><span>纸和笔</span></a>\n'
            '  <nav class="sh-nav" aria-label="板块">' + nav + '</nav>\n'
            '  <div class="sh-act"><a class="sh-vip" href="/huiyuan">会员</a><a class="btn btn-primary sh-login" href="/#login">登录 / 注册</a></div>\n'
            '</div></header>')


def sitefoot():
    cols = []
    for g, items in HEAD_NAMES:
        links = []
        for n, h in items:
            tag = '<small>会员</small>' if n in FULL_ONLY else ''
            links.append('<a href="%s">%s%s</a>' % (h, FOOT_NAME[n], tag))
            links += ['<a href="%s">%s</a>' % (u, t) for t, u in INNER.get(n, [])]  # 内页跟板块平起平坐
        cols.append('    <nav class="sf-col" aria-label="%s"><div class="sf-h">%s</div>%s</nav>\n' % (g, g, ''.join(links)))
    return ('<footer class="sf">\n  <div class="sf-in">\n'
            '    <section class="sf-about">\n'
            '      <a class="sf-brand" href="/"><img src="/icons/mark.svg" width="22" height="22" alt=""><span>纸和笔</span></a>\n'
            '      <p>一位一年级家长给自己孩子做的练习纸网站：能在家练好的不送去报班，能在纸上做的不让孩子盯屏幕。口算、奥数前三课和纸笔游戏打开就能打印；做完扫一下纸角，下一张专练错的。</p>\n'
            '      <p>意见反馈：<a href="mailto:hi@zhihebi.com">hi@zhihebi.com</a>，一般一两天内回复。</p>\n'
            '    </section>\n' + ''.join(cols) +
            '    <nav class="sf-col" aria-label="关于"><div class="sf-h">关于</div><a href="/">纸和笔首页</a><a href="/help">使用说明</a><a href="/help#print">打印与存 PDF</a><a href="/huiyuan">会员</a><a href="/privacy">隐私说明</a><a href="/terms">服务条款</a><a href="mailto:hi@zhihebi.com">意见反馈</a></nav>\n'
            '  </div>\n'
            '  <div class="sf-bot"><span>© 2026 纸和笔 · zhihebi.com</span><span>少报班，少看屏 · 一页纸，五分钟</span></div>\n'
            '</footer>')


def fill(page, mark, html):
    path = ROOT / page
    text = path.read_text(encoding='utf-8')
    pat = re.compile(r'(<!-- %s -->).*?(<!-- /%s -->)' % (mark, mark), re.S)
    if not pat.search(text):
        raise SystemExit('%s 里没找到 <!-- %s --> 标记' % (page, mark))
    path.write_text(pat.sub(lambda m: m.group(1) + '\n' + html + '\n' + m.group(2), text), encoding='utf-8')
    print('✓', mark, page)


for page in ['welcome.html', 'privacy.html', 'terms.html', '404.html']:
    fill(page, 'sitehead', sitehead())
for page in ['welcome.html', 'index.html']:
    fill(page, 'sitefoot', sitefoot())

# 侧栏重写会带回没盖指纹的 js/sidebar.js 引用：顺手重盖一遍（见 tools/stamp-assets.js）
import subprocess
subprocess.run(['node', str(ROOT / 'tools' / 'stamp-assets.js')], check=True)
