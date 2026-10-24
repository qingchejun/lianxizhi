# 合成成片：画面 clips + 逐句配音 + 背景音乐（按旁白自动压低）+ 音效 + 烧录字幕 → final.mp4
# 响度统一到 -16 LUFS，faststart 可直接上传。SEL=1,6 python3 assemble.py → 只合成这几个场景，输出 sample.mp4（样片）
import json, subprocess, re, os, wave
import numpy as np
beats = json.load(open('beats.json')); timing = json.load(open('timing.json'))
SEL = [int(x) for x in os.environ['SEL'].split(',')] if os.environ.get('SEL') else list(range(len(timing)))
OUT = 'sample.mp4' if os.environ.get('SEL') else 'final.mp4'
SFX_VOL = {'tick': 0.17, 'ding': 0.6, 'stamp': 0.4, 'reveal': 0.35}  # 对照 08：滴答比人声峰值低约 13dB，叮与人声相当
SR = 44100

def dur(f): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]))
def ts(x):
    h, m, s = int(x // 3600), int(x % 3600 // 60), x % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}".replace('.', ',')

clips = {si: f'clips/scene{si}.mp4' for si in SEL}
durs = {si: min(dur(clips[si]), timing[si]['dur']) for si in SEL}
offs, t0 = {}, 0.0
for si in SEL:
    offs[si] = t0; t0 += durs[si]
TOTAL = t0

# 字幕（**数字** 标红）
with open('subs.srt', 'w') as f:
    n = 0
    for si in SEL:
        bs = timing[si]['beats']
        for bi, b in enumerate(bs):
            a = offs[si] + b['start']; e = offs[si] + (bs[bi + 1]['start'] if bi + 1 < len(bs) else durs[si])
            n += 1
            sub = re.sub(r'\*\*(.+?)\*\*', r'<font color="#d9443a">\1</font>', beats[si][bi]['sub'])
            f.write(f"{n}\n{ts(a)} --> {ts(e)}\n{sub}\n\n")

# 画面
open('list.txt', 'w').write(''.join(f"file '{clips[si]}'\n" for si in SEL))
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i','list.txt','-c','copy','video_only.mp4'], check=True)

# 音效轨：sfx.json 里是每个场景内的相对时间
track = np.zeros(int(SR * (TOTAL + 1)))
if os.path.exists('sfx.json'):
    for e in json.load(open('sfx.json')):
        if e['s'] not in offs: continue
        with wave.open(f"sfx/{e['k']}.wav") as w:
            x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32767
        i = int((offs[e['s']] + e['t']) * SR); track[i:i + len(x)] += x[:len(track) - i] * SFX_VOL.get(e['k'], 0.5)
with wave.open('sfx_track.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(track, -1, 1) * 32767).astype(np.int16).tobytes())

# 声音：旁白一轨 → BGM 按旁白压低（sidechain）→ + 音效 → 淡出 → -16 LUFS
inputs, filt, labels = ['-i', 'bgm_full.wav'], ['[1:a]aresample=44100,aformat=channel_layouts=stereo[bg]'], []
k = 0
for si in SEL:
    for bi, b in enumerate(timing[si]['beats']):
        inputs += ['-i', f'audio/s{si:02d}_b{bi:02d}.mp3']
        ms = int((offs[si] + b['start'] + 0.1) * 1000)
        filt.append(f'[{k+2}:a]aresample=44100,aformat=channel_layouts=stereo,adelay={ms}|{ms}[a{k}]'); labels.append(f'[a{k}]'); k += 1
inputs += ['-i', 'sfx_track.wav']
filt.append(f'[{k+2}:a]aresample=44100,aformat=channel_layouts=stereo[fx]')
filt.append(''.join(labels) + f'amix=inputs={k}:normalize=0,asplit=2[vo1][vo2]')
filt.append('[bg]volume=0.9[bgv];[bgv][vo2]sidechaincompress=threshold=0.02:ratio=5:attack=30:release=500:makeup=1[bgd]')
filt.append(f'[vo1][bgd][fx]amix=inputs=3:normalize=0,afade=t=out:st={TOTAL-1.5:.3f}:d=1.5,atrim=0:{TOTAL:.3f},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100[aout]')
filt.append("[0:v]subtitles=subs.srt:fontsdir=fonts:force_style='FontName=LXGW WenKai Medium,FontSize=22,PrimaryColour=&H00202B2B,OutlineColour=&H00FFFFFF,BorderStyle=1,Outline=2.2,Shadow=0,MarginV=20,Alignment=2'[vout]")
subprocess.run(['ffmpeg','-v','error','-y','-i','video_only.mp4'] + inputs + ['-filter_complex', ';'.join(filt), '-map','[vout]','-map','[aout]',
       '-c:v','libx264','-crf','20','-preset','medium','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart', OUT], check=True)
print('%s  %.2fs' % (OUT, TOTAL))
