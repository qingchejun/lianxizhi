"""生成若干测试句到 ttstest/，格式同 audio/（mp3 + 逐字时间 json）。用法：python3 ttstest.py 名字=句子 ..."""
import sys, os, json, asyncio, ssl, edge_tts
import edge_tts.communicate as _c
if os.environ.get("SSL_CERT_FILE"): _c._SSL_CTX = ssl.create_default_context(cafile=os.environ["SSL_CERT_FILE"])
VOICE = 'zh-CN-XiaoxiaoNeural'
os.makedirs('ttstest', exist_ok=True)

async def one(name, text):
    com = edge_tts.Communicate(text, VOICE, boundary='WordBoundary')
    words = []
    with open('ttstest/%s.mp3' % name, 'wb') as f:
        async for ch in com.stream():
            if ch['type'] == 'audio':
                f.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                words.append({'t': round(ch['offset'] / 1e7, 3), 'd': round(ch['duration'] / 1e7, 3), 'w': ch['text']})
    json.dump(words, open('ttstest/%s.json' % name, 'w'), ensure_ascii=False)

async def main():
    for a in sys.argv[1:]:
        n, t = a.split('=', 1)
        await one(n, t)
asyncio.run(main())
