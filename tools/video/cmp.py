"""同一句框架里只换一个字，比较整句 MFCC 的 DTW 距离：看原句的「圈」更像 juān（娟）还是 quān（悛）。
用法：python3 cmp.py 原句名 juān句名 quān句名 ...（都在 ttstest/）"""
import sys, numpy as np, librosa

def mf(n):
    y, sr = librosa.load('ttstest/%s.mp3' % n, sr=16000)
    y, _ = librosa.effects.trim(y, top_db=35)
    m = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, n_fft=400, hop_length=160)
    return m - m.mean(1, keepdims=True)

def d(a, b):
    D, wp = librosa.sequence.dtw(X=a, Y=b, metric='euclidean')
    return D[-1, -1] / len(wp)

names = sys.argv[1:]
M = {n: mf(n) for n in names}
print('%-10s' % '' + ''.join('%-10s' % n for n in names))
for a in names:
    print('%-10s' % a + ''.join('%-10.1f' % d(M[a], M[b]) for b in names))
