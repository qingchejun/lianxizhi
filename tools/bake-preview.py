"""Bake one default sheet into #preview of kousuan.html / shudu.html.

Why: the sheets are drawn by JS, so the page source has no problems in it.
Search engines that do not run JS (and the first paint before scripts run)
then see an empty #preview. We capture what a guest sees with default
settings and write it between bake markers; the page JS replaces it on load.

The kousuan sample uses carryMode=carryonly so the baked problems match the
page promise (carry / borrow problems), not the random default mix.

Run against the local dev server (port 8999):
  uv run --with playwright python tools/bake-preview.py [base_url]
Re-run after changing a renderer or the default settings.
"""
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8999'
PAGES = [('kousuan.html', '/kousuan?carryMode=carryonly'), ('shudu.html', '/shudu')]
START, END = '<!-- bake:preview -->', '<!-- /bake:preview -->'
BLOCK = re.compile(r'<div id="preview">(?:' + re.escape(START) + r'.*?' + re.escape(END) + r')?</div>', re.S)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, path in PAGES:
            page = browser.new_page()
            page.add_init_script('localStorage.clear()')
            page.goto(BASE + path, wait_until='networkidle')
            page.wait_for_selector('#preview .sheet')
            html = page.eval_on_selector('#preview', 'el => el.innerHTML').strip()
            page.close()
            # the date would go stale in the file; JS fills in today's on load
            html = re.sub(r'<span class="meta-date">[^<]*</span>', '<span class="meta-date"></span>', html)
            if 'sheet-qr' in html:
                sys.exit(name + ': captured sheet has a QR code; run as a guest')
            file = ROOT / name
            src = file.read_text()
            if len(BLOCK.findall(src)) != 1:
                sys.exit(name + ': expected exactly one #preview block')
            baked = '<div id="preview">' + START + html + END + '</div>'
            file.write_text(BLOCK.sub(lambda m: baked, src, count=1))
            print(name, len(html), 'chars')
        browser.close()


if __name__ == '__main__':
    main()
