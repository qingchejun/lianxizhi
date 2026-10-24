# 版面自检：每句话念完时 + 场景末尾，检查压字幕区、出画、实心元素重叠。用法：python3 check.py timing.json
import json, sys, asyncio, os
from playwright.async_api import async_playwright
T = json.load(open(sys.argv[1]))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1920, 'height': 1080})
        msgs = []
        pg.on('console', lambda m: msgs.append(m.text) if '没找到' in m.text else None)
        await pg.goto('file://' + os.path.abspath('render.html'))
        bad = 0
        for si, sc in enumerate(T):
            await pg.evaluate('([i,tm]) => build(i, tm)', [si, sc])
            seen = set()
            times = [bb['start'] + bb['voice'] + 0.25 for bb in sc['beats']] + [sc['dur'] - 0.35]
            for t in times:
                for m in await pg.evaluate(f'layoutReport({t})'):
                    if m not in seen:
                        seen.add(m); bad += 1; print(f'场景{si} @{t:.1f}s  {m}')
        for m in msgs: print('⚠', m)
        print('版面自检：', '没有问题' if bad == 0 and not msgs else f'{bad} 处问题，{len(msgs)} 个关键词没对上')
        await b.close()
asyncio.run(main())
