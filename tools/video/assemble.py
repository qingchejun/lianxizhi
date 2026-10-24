# 合成成片：画面 clips + 逐句配音 + 背景音乐 + 烧录字幕 → final.mp4（faststart，可直接上传）
import json, subprocess, re
beats = json.load(open('beats.json')); timing = json.load(open('timing.json'))
clips = [f'clips/scene{i}.mp4' for i in range(len(timing))]
def dur(f): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]))
durs = [min(dur(c), sc['dur']) for c, sc in zip(clips, timing)]
def ts(x):
    h, m, s = int(x // 3600), int(x % 3600 // 60), x % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}".replace('.', ',')
srt, t0 = [], 0.0
for si, sc in enumerate(timing):
    bs = sc['beats']
    for bi, b in enumerate(bs):
        a = t0 + b['start']; e = t0 + (bs[bi + 1]['start'] if bi + 1 < len(bs) else durs[si])
        srt.append((a, e, beats[si][bi]['sub']))
    t0 += durs[si]
with open('subs.srt', 'w') as f:
    for i, (a, b, s) in enumerate(srt, 1):
        s2 = re.sub(r'\*\*(.+?)\*\*', r'<font color="#d9443a">\1</font>', s)  # **数字** 标红
        f.write(f"{i}\n{ts(a)} --> {ts(b)}\n{s2}\n\n")
open('list.txt', 'w').write(''.join(f"file '{c}'\n" for c in clips))
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i','list.txt','-c','copy','video_only.mp4'], check=True)
inputs, filt, labels = ['-i','bgm_full.wav'], ['[1:a]aresample=44100,aformat=channel_layouts=stereo[bg]'], ['[bg]']
t0 = 0; k = 0
for si, sc in enumerate(timing):
    for bi, b in enumerate(sc['beats']):
        inputs += ['-i', f'audio/s{si:02d}_b{bi:02d}.mp3']
        ms = int((t0 + b['start'] + 0.1) * 1000)
        filt.append(f'[{k+2}:a]aresample=44100,aformat=channel_layouts=stereo,adelay={ms}|{ms}[a{k}]'); labels.append(f'[a{k}]'); k += 1
    t0 += durs[si]
# 旁白合成一轨 → 背景音乐按旁白自动压低（sidechain）→ 混合后统一响度到 -16 LUFS
# 音效轨：按 sfx.json 把 sfx/*.wav 摆到时间轴上，预先混成一条（音效不参与 BGM 压低）
import os, wave, numpy as np
SFX_VOL = {'tick': 0.17, 'ding': 0.6, 'stamp': 0.4, 'reveal': 0.35}  # 对照 08：滴答比人声峰值低约 13dB，叮与人声相当
SR = 44100; track = np.zeros(int(SR * (t0 + 1)))
if os.path.exists('sfx.json'):
    for e in json.load(open('sfx.json')):
        with wave.open(f"sfx/{e['k']}.wav") as w:
            x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32767
        i = int(e['t'] * SR); track[i:i + len(x)] += x[:len(track) - i] * SFX_VOL.get(e['k'], 0.5)
with wave.open('sfx_track.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(track, -1, 1) * 32767).astype(np.int16).tobytes())
inputs += ['-i', 'sfx_track.wav']
filt.append(f'[{k+2}:a]aresample=44100,aformat=channel_layouts=stereo[fx]')
filt.append(''.join(labels[1:]) + f'amix=inputs={k}:normalize=0,asplit=2[vo1][vo2]')
filt.append('[bg]volume=0.9[bgv];[bgv][vo2]sidechaincompress=threshold=0.02:ratio=5:attack=30:release=500:makeup=1[bgd]')
filt.append(f'[vo1][bgd][fx]amix=inputs=3:normalize=0,afade=t=out:st={t0-1.5:.3f}:d=1.5,atrim=0:{t0:.3f},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100[aout]')
filt.append("[0:v]subtitles=subs.srt:fontsdir=fonts:force_style='FontName=LXGW WenKai Medium,FontSize=22,PrimaryColour=&H00202B2B,OutlineColour=&H00FFFFFF,BorderStyle=1,Outline=2.2,Shadow=0,MarginV=20,Alignment=2'[vout]")
subprocess.run(['ffmpeg','-v','error','-y','-i','video_only.mp4'] + inputs + ['-filter_complex', ';'.join(filt), '-map','[vout]','-map','[aout]',
       '-c:v','libx264','-crf','20','-preset','medium','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart','final.mp4'], check=True)
print('total %.2fs' % t0)
