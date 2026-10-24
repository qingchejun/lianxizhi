# 由配音时长 + 逐字时间生成 timing.json。用法：python3 timing.py [est]（est = 没有配音时按字数估）
import json, os, subprocess, sys, re
beats = json.load(open('beats.json'))
EST = len(sys.argv) > 1 and sys.argv[1] == 'est'
LEAD, GAP, TAIL = 0.3, 0.3, 0.5
P = re.compile(r'[\s，。！？、：；,.!?:;“”"\'（）()「」—…·]')
def dur(f): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]))
T = []
for si, sc in enumerate(beats):
    t = LEAD; bs = []
    for bi, b in enumerate(sc):
        base = f'audio/s{si:02d}_b{bi:02d}'
        if EST:
            chars = P.sub('', b['say']); d = len(chars) * 0.235 + 0.25
            words = [{'t': round(0.05 + i * 0.235, 3), 'd': 0.2, 'w': c} for i, c in enumerate(chars)]
        else:
            d = dur(base + '.mp3')
            words = json.load(open(base + '.json')) if os.path.exists(base + '.json') else []
        bs.append({'start': round(t, 3), 'voice': round(d, 3), 'say': b['say'], 'words': words})
        t += d + GAP + b.get('pause', 0)
    T.append({'beats': bs, 'dur': round(t - GAP + TAIL, 3)})
json.dump(T, open('timing_est.json' if EST else 'timing.json', 'w'), ensure_ascii=False)
print('total %.1fs' % sum(s['dur'] for s in T), [s['dur'] for s in T])
