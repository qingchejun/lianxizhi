#!/usr/bin/env python3
"""
从现成页面生成「同一套脚本、固定一块内容」的页面（2026-11-28 学科 → 专题 + 知识点改版）。

  xiezi.html        ← shizi.html   写字（/xiezi）：识字页的写字那一块单独成页，<html data-pane="xie">
  yuwen-zhishi.html ← pinyin.html  语文知识点（/yuwen/zhishi）：拼音页的闪卡单独成页，<html data-view="cards">

为什么生成而不是抄一份：写字和认字共用 js/shizi-main.js，脚本要求面板里每个控件都在；
手抄一份，以后识字页加个控件、写字页忘了加，写字页就白屏。改源页面以后跑 python3 tools/rail.py（它会先调这里）。
提交前钩子跑 --check：生成结果和仓库里的文件对不上（侧栏块除外）就拦下。

用法：python3 tools/derive_pages.py [--check]
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
HEAD_NOTE = '<!-- 本页由 tools/derive_pages.py 从 %s 生成，别手改：改源页面再跑 python3 tools/rail.py -->\n'
RAIL_RE = re.compile(r'(<!-- rail:[^>]*-->).*?(<!-- /rail -->)', re.S)

PY_TABS = re.compile(r'      <section class="group bare">\n        <nav class="stage-tabs" id="py-tabs".*?</nav>\n      </section>\n', re.S)

DERIVED = {
    'xiezi.html': ('shizi.html', [
        ('<html lang="zh-CN" data-pane="ren">', '<html lang="zh-CN" data-pane="xie">'),
        ('<title>识字 · 纸和笔</title>', '<title>写字 · 纸和笔</title>\n  <meta name="robots" content="noindex" />'),
        (re.compile(r'<meta name="description" content="[^"]*" />'),
         '<meta name="description" content="按统编版课本写字表，一课一张田字格练字纸：范字、笔顺分解、描红，再自己写。" />'),
        ('<!-- rail:识字 -->', '<!-- rail:写字 -->'),
        ('<h1 class="work-title">识字</h1>', '<h1 class="work-title">写字</h1>'),
        ('placeholder="留空则自动生成，如：识字复习 · 第 3 周"', 'placeholder="留空则自动生成，如：写字 · 课文 3"'),
    ]),
    'yuwen-zhishi.html': ('pinyin.html', [
        ('<html lang="zh-CN">', '<html lang="zh-CN" data-view="cards">'),
        # 网址是 /yuwen/zhishi（两级），页面里的相对路径要从根目录算
        ('<meta charset="utf-8">', '<meta charset="utf-8">\n  <base href="/" />'),
        ('<title>拼音 · 纸和笔</title>', '<title>语文知识点闪卡 · 纸和笔</title>\n  <meta name="robots" content="noindex">'),
        (re.compile(r'<meta name="description" content="[^"]*">'),
         '<meta name="description" content="一年级语文知识点闪卡：一张卡一个知识点，按课挑卡，剪下对折就能用。">'),
        ('<!-- rail:拼音 -->', '<!-- rail:语文知识点 -->'),
        ('<h1 class="work-title">拼音</h1>', '<h1 class="work-title">语文知识点</h1>'),
        (PY_TABS, ''),
    ]),
}


def derive(name):
    src, subs = DERIVED[name]
    text = (ROOT / src).read_text(encoding='utf-8')
    for old, new in subs:
        if isinstance(old, re.Pattern):
            text, n = old.subn(new, text, count=1)
        else:
            n = text.count(old)
            text = text.replace(old, new, 1)
        if n != 1:
            raise SystemExit('%s → %s：没找到要替换的「%s」（源页面改过了？改这里的替换表）' % (src, name, getattr(old, 'pattern', old)[:60]))
    return text.replace('<!doctype html>\n', '<!doctype html>\n' + HEAD_NOTE % src, 1)


def strip_rail(text):
    return RAIL_RE.sub(lambda m: m.group(1) + m.group(2), text)


def main():
    check = '--check' in sys.argv
    bad = []
    for name in DERIVED:
        path = ROOT / name
        text = derive(name)
        if check:
            have = path.read_text(encoding='utf-8') if path.exists() else ''
            if strip_rail(have) != strip_rail(text):
                bad.append(name)
        else:
            # 侧栏块留着现有的（rail.py 接着会重写）
            if path.exists():
                old = RAIL_RE.search(path.read_text(encoding='utf-8'))
                if old:
                    text = RAIL_RE.sub(lambda m: old.group(0), text, count=1)
            path.write_text(text, encoding='utf-8')
            print('✓ 生成', name)
    if bad:
        raise SystemExit('这些页面和源页面对不上，跑一下 python3 tools/rail.py：' + '、'.join(bad))


if __name__ == '__main__':
    main()
