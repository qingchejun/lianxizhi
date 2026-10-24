# 逐句生成配音（edge-tts 晓晓）+ 逐字时间戳。在本文件所在文件夹运行：python3 tts.py
# - 多音字：送去配音前按 POLY 表替换成同音字（只影响读音，不影响字幕）
# - 每句同时保存 audio/sXX_bYY.json：[{t: 秒, d: 秒, w: 词}]，画面按关键词对齐配音
import json, asyncio, os, sys, subprocess
os.chdir(os.path.dirname(os.path.abspath(__file__)))
try:
    import edge_tts
except ImportError:
    print('正在安装 edge-tts …')
    r = subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', '--user', 'edge-tts'])
    if r.returncode:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', '--user', '--break-system-packages', 'edge-tts'], check=True)
    import site, importlib; importlib.reload(site)
    import edge_tts

VOICE, RATE = 'zh-CN-XiaoxiaoNeural', '+0%'
# 多音字表：晓晓容易读错的词 → 同音字写法（按需补充）
POLY = [
    ('数一数', '蜀一蜀'), ('一个一个数', '一个一个蜀'), ('一组一组地数', '一组一组地蜀'),
    ('数到', '蜀到'), ('数数', '蜀蜀'), ('再数', '再蜀'), ('数出', '蜀出'),
]
def fix(text):
    for a, b in POLY:
        text = text.replace(a, b)
    return text

beats = json.load(open('beats.json'))
os.makedirs('audio', exist_ok=True)

async def one(si, bi, b):
    out = f'audio/s{si:02d}_b{bi:02d}'
    if os.path.exists(out + '.mp3') and os.path.exists(out + '.json'):
        return
    text = b.get('tts') or fix(b['say'])
    kw = dict(rate=b.get('rate', RATE), pitch=b.get('pitch', '+0Hz'))  # 每句可单独设语速、音调
    try:
        com = edge_tts.Communicate(text, VOICE, boundary='WordBoundary', **kw)
    except TypeError:  # 旧版 edge-tts 默认就给 WordBoundary
        com = edge_tts.Communicate(text, VOICE, **kw)
    words = []
    with open(out + '.mp3', 'wb') as f:
        async for ch in com.stream():
            if ch['type'] == 'audio':
                f.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                words.append({'t': round(ch['offset'] / 1e7, 3), 'd': round(ch['duration'] / 1e7, 3), 'w': ch['text']})
    json.dump(words, open(out + '.json', 'w'), ensure_ascii=False)

async def main():
    sem = asyncio.Semaphore(6)
    async def run(si, bi, b):
        async with sem:
            for k in range(3):
                try:
                    return await one(si, bi, b)
                except Exception as e:
                    if k == 2: raise
                    await asyncio.sleep(2)
    await asyncio.gather(*[run(si, bi, b) for si, sc in enumerate(beats) for bi, b in enumerate(sc)])
asyncio.run(main())
n = sum(len(sc) for sc in beats)
print(f'完成：{n} 句配音（含逐字时间）已生成在 audio 文件夹。回到 Claude 说一声就行。')
