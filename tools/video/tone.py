"""量一量配音里某个字的声调：取该字时间段的基频（pyin），看走势。
用法：python3 tone.py 圈 [audio_dir]
一声（quān）平；四声（juàn）明显下降；二声（quán）上升。"""
import sys, json, glob, os
import numpy as np, librosa

ch = sys.argv[1]
d = sys.argv[2] if len(sys.argv) > 2 else 'audio'
for jf in sorted(glob.glob(os.path.join(d, 's*_b*.json'))):
    W = json.load(open(jf))
    hits = []
    for w in W:
        n = len(w['w'])
        for k, c in enumerate(w['w']):
            if c == ch:
                hits.append((w['t'] + w['d'] * k / n, w['d'] / n, w['w']))
    if not hits:
        continue
    y, sr = librosa.load(jf[:-5] + '.mp3', sr=16000)
    for t0, dur, word in hits:
        a, b = int((t0 + dur * 0.15) * sr), int((t0 + dur * 0.9) * sr)
        seg = y[a:b]
        if len(seg) < 800:
            print(os.path.basename(jf), word, '太短'); continue
        f0, vf, _ = librosa.pyin(seg, fmin=120, fmax=450, sr=sr, frame_length=512, hop_length=80)
        f = f0[~np.isnan(f0)]
        if len(f) < 4:
            print(os.path.basename(jf), word, '无基频'); continue
        q = max(1, len(f) // 4)
        st = 12 * np.log2(np.median(f[-q:]) / np.median(f[:q]))  # 末段相对开头，半音
        mean = np.median(f)
        tone = '四声↓' if st < -2.5 else ('二声↑' if st > 2 else '一声→')
        print('%s  %-6s 起 %.0fHz 均 %.0fHz 走势 %+.1f 半音  %s' % (os.path.basename(jf), word, np.median(f[:q]), mean, st, tone))
