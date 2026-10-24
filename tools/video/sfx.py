# 合成音效（对照 08 的听感：倒计时短促木质「嗒」、打勾清脆「叮」、盖章「啪」、揭晓答案小闪亮）
# 用法：python3 sfx.py  → sfx/tick.wav ding.wav stamp.wav reveal.wav
import numpy as np, wave, os
SR = 44100
os.makedirs('sfx', exist_ok=True)
rng = np.random.default_rng(7)

def env(n, tau, attack=0.002):
    t = np.arange(n) / SR
    a = np.clip(t / attack, 0, 1)
    return a * np.exp(-t / tau)

def tone(freq, dur, tau, amp=1.0, attack=0.002):
    n = int(SR * dur); t = np.arange(n) / SR
    return amp * np.sin(2 * np.pi * freq * t) * env(n, tau, attack)

def pad(x, n):
    return np.pad(x, (0, max(0, n - len(x))))[:n]

def save(name, x, peak=0.7):
    x = x / (np.abs(x).max() + 1e-9) * peak
    fade = int(SR * 0.005); x[-fade:] *= np.linspace(1, 0, fade)
    with wave.open(f'sfx/{name}.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())

# 滴答：木鱼感，08 里峰值在约 1.65k / 3.2kHz，极短
n = int(SR * 0.14)
click = rng.standard_normal(int(SR * 0.004)) * np.linspace(1, 0, int(SR * 0.004))
tick = pad(tone(1650, 0.14, 0.022), n) + 0.55 * pad(tone(3200, 0.14, 0.012), n) + 0.25 * pad(tone(820, 0.14, 0.03), n) + 0.35 * pad(click, n)
save('tick', tick, 0.75)

# 叮：两音上行「叮—咚」式的清脆铃声（G6 → C7），钟形泛音
def bell(f, dur=1.1, amp=1.0):
    parts = [(1, 1.0, 0.45), (2.0, 0.45, 0.25), (2.76, 0.25, 0.18), (5.4, 0.12, 0.08)]
    n = int(SR * dur)
    return amp * sum(pad(tone(f * r, dur, tau, a, 0.003), n) for r, a, tau in parts)
n = int(SR * 1.2)
ding = pad(bell(1568, 1.1, 0.8), n) + np.concatenate([np.zeros(int(SR * 0.09)), pad(bell(2093, 1.1, 1.0), n - int(SR * 0.09))])
save('ding', ding, 0.6)

# 啪：盖章，低频闷响 + 一点纸面噪声
n = int(SR * 0.22)
noise = rng.standard_normal(n) * env(n, 0.018)
lp = np.convolve(noise, np.ones(18) / 18, mode='same')
t = np.arange(n) / SR
thud = np.sin(2 * np.pi * (140 - 60 * t / 0.22) * t) * env(n, 0.05)
save('stamp', 0.9 * thud + 1.2 * lp, 0.75)

# 揭晓：三个音快速上行的小闪亮（C6 E6 G6）
n = int(SR * 0.6)
rev = np.zeros(n)
for i, f in enumerate([1047, 1319, 1568]):
    s0 = int(SR * 0.055 * i)
    rev[s0:] += pad(tone(f, 0.6, 0.12, 0.8) + 0.3 * tone(f * 2, 0.6, 0.06), n - s0)
save('reveal', rev, 0.5)
print('ok', sorted(os.listdir('sfx')))
