import json, sys, subprocess, asyncio, os
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
TIMING = json.load(open(os.path.join(HERE, sys.argv[1])))
FPS = 30
async def main(mode, args):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1920, 'height': 1080})
        await pg.goto('file://' + os.path.join(HERE, 'render.html'))
        if mode == 'cover':  # cover out.jpg：渲染 SCENES.cover 的静止画面
            fake = {'beats': [{'start': 0, 'voice': 1, 'say': '', 'words': []}], 'dur': 99}
            await pg.evaluate('(tm) => build("cover", tm)', fake)
            await pg.evaluate('render(5)')
            await pg.locator('#stage').screenshot(path=args[0], type='jpeg', quality=88)
        elif mode == 'still':  # still  si t out.png ...
            for k in range(0, len(args), 3):
                si, t, out = int(args[k]), float(args[k+1]), args[k+2]
                await pg.evaluate('([i,tm]) => build(i, tm)', [si, TIMING[si]])
                await pg.evaluate(f'render({t})')
                await pg.locator('#stage').screenshot(path=out)
        else:  # video si out.mp4
            si, out = int(args[0]), args[1]
            await pg.evaluate('([i,tm]) => build(i, tm)', [si, TIMING[si]])
            n = int(round(TIMING[si]['dur'] * FPS))
            ff = subprocess.Popen(['ffmpeg','-v','error','-y','-f','image2pipe','-framerate',str(FPS),'-i','-',
                '-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-preset','medium','-r',str(FPS),out], stdin=subprocess.PIPE)
            for i in range(n):
                await pg.evaluate(f'render({i / FPS})')
                ff.stdin.write(await pg.screenshot(type='jpeg', quality=94))
            ff.stdin.close(); ff.wait()
        await b.close()
asyncio.run(main(sys.argv[2], sys.argv[3:]))
