# 从引擎导出每个场景的音效时间表 → sfx.json（相对整片的秒数）
import json, sys, asyncio, os
from playwright.async_api import async_playwright
T = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'timing.json'))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1920, 'height': 1080})
        await pg.goto('file://' + os.path.abspath('render.html'))
        out, t0 = [], 0.0
        for si, sc in enumerate(T):
            await pg.evaluate('([i,tm]) => build(i, tm)', [si, sc])
            for e in await pg.evaluate('sfxList()'):
                if e['t'] < sc['dur'] - 0.1: out.append({'s': si, 't': round(e['t'], 3), 'k': e['k']})
            t0 += sc['dur']
        json.dump(out, open('sfx.json', 'w'))
        from collections import Counter
        print(len(out), '个音效', dict(Counter(e['k'] for e in out)))
        await b.close()
asyncio.run(main())
