# 生成剪映草稿（可选：想在剪映里微调时用）。在本文件所在文件夹运行：python3 build_draft.py
import json, os, sys, subprocess
os.chdir(os.path.dirname(os.path.abspath(__file__)))
try:
    import pyJianYingDraft as draft
except ImportError:
    r = subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', '--user', 'pyJianYingDraft'])
    if r.returncode:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', '--user', '--break-system-packages', 'pyJianYingDraft'], check=True)
    import site, importlib; importlib.reload(site)
    import pyJianYingDraft as draft
from pyJianYingDraft import trange_seconds
ASSET = os.getcwd()
beats = json.load(open('beats.json')); timing = json.load(open('timing.json'))
folder = draft.DraftFolder(os.path.expanduser("~/Movies/JianyingPro Drafts"))
script = folder.create_draft("图形找规律-新版", 1920, 1080, fps=30, allow_replace=True)
script.append_tracks([
    draft.TrackSpec(draft.TrackType.audio, "背景音乐"),
    draft.TrackSpec(draft.TrackType.audio, "旁白"),
    draft.TrackSpec(draft.TrackType.video, "画面"),
    draft.TrackSpec(draft.TrackType.text, "字幕"),
])
VOICE_DELAY = 0.1
style = draft.TextStyle(size=11.0, color=(0.17, 0.14, 0.13), align=1)
border = draft.TextBorder(color=(1.0, 1.0, 1.0), width=45.0)
pos = draft.ClipSettings(transform_y=-0.80)
t0 = 0.0
for si, sc in enumerate(timing):
    clip = os.path.join(ASSET, 'clips', f'scene{si}.mp4')
    cd = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',clip])) if subprocess.run(['which','ffprobe'],capture_output=True).returncode == 0 else sc['dur']
    cd = min(cd, sc['dur']) - 0.001
    script.add_segment(draft.VideoSegment(clip, trange_seconds(t0, end=t0 + cd)), "画面")
    bs = sc['beats']
    for bi, b in enumerate(bs):
        a = os.path.join(ASSET, 'audio', f's{si:02d}_b{bi:02d}.mp3')
        script.add_segment(draft.AudioSegment(a, trange_seconds(t0 + b['start'] + VOICE_DELAY, duration=b['voice'] - 0.03)), "旁白")
        start = t0 + b['start']
        end = t0 + (bs[bi + 1]['start'] if bi + 1 < len(bs) else cd)
        script.add_segment(draft.TextSegment(beats[si][bi]['sub'].replace('**', ''), trange_seconds(start, end=end), font=draft.FontType.LXGWWenKai_Bold,
                                             style=style, border=border, clip_settings=pos), "字幕")
    t0 += cd
bm = draft.AudioMaterial(os.path.join(ASSET, '..', '素材-shuzimi2-重做版', 'bgm_full.wav'))  # 与 07 同款背景音乐
script.add_segment(draft.AudioSegment(bm, trange_seconds(0, end=min(t0, bm.duration / 1e6)), volume=1.0), "背景音乐")
script.save()
print('剪映草稿「图形找规律-新版」已生成，总长 %.1f 秒。打开剪映即可看到。' % t0)
