#!/usr/bin/env python3
"""timing.json / words.json / lines.json for pig-war from script.txt + voice.mp3.
ffprobe duration + syllable-ish word-length weighting; punctuation pauses are snapped to silences actually found in the audio."""
import json, re, subprocess, shutil, os
import bisect
import sys
D = os.path.abspath(sys.argv[1])   # job dir: script.txt + voice.mp3 in, timing/words/lines.json out
ENG = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine', 'film')
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{D}/voice.mp3']).decode())
sil = subprocess.run(['ffmpeg', '-hide_banner', '-i', f'{D}/voice.mp3', '-af', 'silencedetect=noise=-35dB:d=0.15', '-f', 'null', '-'], capture_output=True, text=True).stderr
ss = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', sil)]; se = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', sil)]
SIL = list(zip(ss, se[:len(ss)])) + ([(ss[-1], dur)] if len(ss) > len(se) else [])
speech0 = se[0] if ss and ss[0] < 0.05 and se else 0.05
speech1 = SIL[-1][0] if SIL and SIL[-1][1] >= dur - 0.05 else dur - 0.1
lines = [l.strip() for l in open(f'{D}/script.txt') if l.strip()]
syl = lambda w: max(1, len(re.findall(r'[aeiouy]+', re.sub(r'[^a-z]', '', w.lower())))) + 0.12 * len(re.sub(r'[^A-Za-z0-9]', '', w))
PAUSE = {'.': 0.45, '?': 0.5, ',': 0.22, '!': 0.45}
toks = []   # (line, word, weight, pause_after)
for li, l in enumerate(lines):
    for w in l.replace('\u2014', '\u2014 ').split():
        dash = w.endswith('\u2014'); w = w.rstrip('\u2014') if dash else w
        if not w: continue
        p = 0.25 if dash else PAUSE.get(w[-1], 0.0); toks.append((li, w, syl(w), p))
toks[-1] = (*toks[-1][:3], 0.0)
tp = sum(t[3] for t in toks); tw = sum(t[2] for t in toks); k = (speech1 - speech0 - tp) / tw
est = []; t = speech0; pauses = []
for li, w, a, p in toks:
    est.append([t, t + a * k]); t += a * k
    if p: pauses.append((len(est) - 1, t, t + p)); t += p
# anchors: pause (a,b) -> matching real silence (monotonic). Line-final pauses are strong (win +-1.6 s, evict conflicting weak anchors).
anch = [(speech0, speech0, 1)]
lineend = {i for i, t in enumerate(toks) if i + 1 == len(toks) or toks[i + 1][0] != t[0]}
for idx, a, b in pauses:
    strong = idx in lineend; win = 1.6 if strong else 0.8; best = None
    for (s0, s1) in SIL:
        if s1 - s0 < 0.2: continue
        d = abs((s0 + s1) / 2 - (a + b) / 2)
        if d < win and (best is None or d < best[0]): best = (d, s0, s1)
    if not best: continue
    _, s0, s1 = best
    while len(anch) > 1 and anch[-1][1] >= s0 - 0.05 and (strong and not anch[-1][2]): anch.pop()
    if s0 > anch[-1][1] + 0.05 and a > anch[-1][0] + 0.02:
        anch += [(a, s0, strong), (b, s1, strong)]
anch = [(x, y) for x, y, _ in anch]
anch.append((speech1, speech1))
ex = [x for x, _ in anch]; ey = [y for _, y in anch]
def warp(x):
    if x <= ex[0]: return ey[0] + (x - ex[0])
    if x >= ex[-1]: return ey[-1] + (x - ex[-1])
    i = bisect.bisect_right(ex, x) - 1; d = ex[i + 1] - ex[i]
    return ey[i] if d <= 0 else ey[i] + (ey[i + 1] - ey[i]) * (x - ex[i]) / d
words = []; L = {}
for (li, w, a, p), (s, e) in zip(toks, est):
    s, e = warp(s), warp(e); words.append({'li': li, 'w': w, 'start': round(s, 3), 'end': round(e, 3)})
out_lines = []
for li, l in enumerate(lines):
    ws = [x for x in words if x['li'] == li]
    nxt = [x for x in words if x['li'] == li + 1]
    start = ws[0]['start'] if li else 0.25 if ws[0]['start'] > 0.25 else ws[0]['start']
    end = nxt[0]['start'] if nxt else round(dur, 3)
    out_lines.append({'id': f'L{li}', 'start': round(start, 3), 'end': round(end, 3), 'text': l, 'words': [{'w': x['w'], 't': x['start'], 'e': x['end']} for x in ws]})
json.dump({'duration': round(dur, 3), 'tempo': 1.0, 'lines': out_lines}, open(f'{D}/timing.json', 'w'), indent=1)
json.dump([{'w': x['w'], 'start': x['start'], 'end': x['end']} for x in words], open(f'{D}/words.json', 'w'), indent=1)
json.dump([{k2: v for k2, v in l.items() if k2 != 'words'} for l in out_lines], open(f'{D}/lines.json', 'w'), indent=1)
for f in ('words.json', 'lines.json'): shutil.copy(f'{D}/{f}', f'{ENG}/{f}')
