#!/usr/bin/env python3
"""storyboard.py <job>: Gemini turns jobs/<job>/script.txt into jobs/<job>/shots.json using ONLY the vocabulary in engine/kit/vocab.json.
Validated before it is saved; if the story cannot be staged with the kit's sets/roles/actions it says so (and exits non-zero) instead of letting a wrong video render."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from llm import gemini, tg
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); job = sys.argv[1]; D = f'{R}/jobs/{job}'
VOC = json.load(open(f'{R}/engine/kit/vocab.json')); EX = open(f'{R}/engine/kit/example_palace.json').read()
lines = [l.strip() for l in open(f'{D}/script.txt') if l.strip()]
norm = lambda w: re.sub(r"[^a-z0-9-]", '', w.lower())
def validate(sb):
    e = []; V = VOC
    if sb.get('unsupported'): return []
    cast = {c['id']: c for c in sb.get('cast', [])}
    if not 1 <= len(cast) <= 9: e.append('cast must have 1-9 people')
    for c in cast.values():
        if c.get('role') not in V['roles']: e.append(f"unknown role {c.get('role')} (allowed: {list(V['roles'])})")
    shots = sb.get('shots', [])
    if not 5 <= len(shots) <= 24: e.append('need 5-24 shots')
    last = (-1, -1)
    for i, s in enumerate(shots):
        w = f'shot {i}'
        if s.get('set') not in V['sets']: e.append(f"{w}: unknown set {s.get('set')} (allowed: {list(V['sets'])})"); continue
        A = V['sets'][s['set']]['anchors']; ids = set(cast)
        t0 = s.get('t0'); key = None
        if isinstance(t0, (int, float)): key = (0, 0) if t0 == 0 else None
        else:
            m = re.match(r"^L(\d+)(?:@([\w'-]+?)(?:#(\d+))?)?$", str(t0))
            if not m or int(m.group(1)) >= len(lines): e.append(f'{w}: bad t0 {t0}')
            else:
                li = int(m.group(1)); pos = 0
                if m.group(2):
                    toks = [norm(x) for x in lines[li].split()]; idx = [k for k, x in enumerate(toks) if x.startswith(norm(m.group(2)))]
                    if not idx: e.append(f'{w}: word "{m.group(2)}" not in line L{li}')
                    else: pos = idx[(int(m.group(3)) - 1) if m.group(3) else 0] if len(idx) >= (int(m.group(3)) if m.group(3) else 1) else idx[0]
                key = (li, pos)
        if i == 0 and t0 != 0: e.append('first shot t0 must be 0')
        if key is not None:
            if key < last: e.append(f'{w}: t0 {t0} is earlier than the previous shot')
            last = max(last, key)
        for a in s.get('actors', []):
            if a.get('id') not in ids: e.append(f"{w}: actor {a.get('id')} not in cast")
            for k in ('at', 'to'):
                if k in a and not (a[k] in A or (isinstance(a[k], list) and len(a[k]) == 2)): e.append(f"{w}: {k} '{a[k]}' not an anchor of {s['set']} ({list(A)})")
            if a.get('act', 'idle') not in V['actions']: e.append(f"{w}: unknown action {a.get('act')}")
            if a.get('mood', 'calm') not in V['moods']: e.append(f"{w}: unknown mood {a.get('mood')}")
            if a.get('act') == 'point' and not a.get('target'): e.append(f'{w}: point needs target')
            f = a.get('face')
            if f and f not in ('camera', 'away', 'travel') and f not in ids and f not in A: e.append(f"{w}: bad face '{f}'")
        c = s.get('camera', {})
        if c.get('move', 'static') not in V['camera']['moves']: e.append(f"{w}: bad camera move {c.get('move')}")
        if c.get('size', 'medium') not in V['camera']['sizes']: e.append(f"{w}: bad camera size {c.get('size')}")
        if c.get('side', 'front') not in V['camera']['sides']: e.append(f"{w}: bad camera side {c.get('side')}")
        sub = c.get('subject')
        if sub and not (sub in ids or sub in A or sub in ('curtain', 'litter')): e.append(f"{w}: camera subject '{sub}' unknown")
        pr = s.get('props', {})
        if 'curtain' in pr and s['set'] != 'palace': e.append(f'{w}: curtain only in palace')
        if 'litter' in pr:
            for k in ('from', 'to'):
                if pr['litter'].get(k) not in A: e.append(f'{w}: litter {k} must be an anchor')
            for x in [pr['litter'].get('rider')] + pr['litter'].get('bearers', []):
                if x not in ids: e.append(f'{w}: litter person {x} not in cast')
    return e
PROMPT = f"""You are the storyboard director for a vertical 9:16 animated history Short staged in a fixed 3D kit. Turn the narration script into shots.json.

VOCABULARY (use ONLY these names; anything else is rejected):
{json.dumps(VOC, indent=1)}

RULES
- Cover the WHOLE narration: shot 0 starts at t0 = 0, later shots start at 'L<n>' or 'L<n>@word' (a word spoken in that line). 8-16 shots, each roughly 2-5 seconds, in time order. Change shot when the narration changes beat.
- Cast 2-7 people with short lowercase ids; give every named person in the script a cast entry. People not listed in a shot's actors are hidden in that shot.
- Place people only on the set's anchors (or [x,z]). Use act 'walk' with 'to' for movement. Each actor needs a fitting mood. Show reactions (flinch, kneel, plead, cheer, hail...).
- People in the same shot should stand close together (within about 5 m: use adjacent anchors); the portrait frame is narrow and the camera backs off to fit everyone, making them tiny if they are far apart.
- Camera: say who is the subject. Vary size (wide to establish, medium/close for action, ecu sparingly) and move. Portrait frames are narrow: keep the subject centred, use 'wide' only for establishing.
- NEVER show bodies, blood or gore. Keep it grounded in the historical record; do not invent facts beyond the script.
- Use hold_rifle only for 1800s stories. Choose the closest available set. If the story truly cannot be staged with these sets/roles, return {{"unsupported": "one sentence why"}}.

EXAMPLE (a different story, in the palace set):
{EX}

NARRATION (L0..L{len(lines)-1}):
{chr(10).join(f'L{i}: {l}' for i, l in enumerate(lines))}

Return only JSON: {{"cast":[...],"shots":[...]}} (or the unsupported object)."""
def main():
    errs = []; sb = None
    for attempt in range(3):
        sb = gemini(PROMPT + (('\n\nYour previous attempt had these errors, fix them:\n- ' + '\n- '.join(errs[:20])) if errs else ''), temperature=0.4)
        if sb.get('unsupported'): break
        errs = validate(sb)
        if not errs: break
        print('attempt', attempt, 'errors:', errs[:6])
    if sb.get('unsupported'):
        tg(f"Can't stage this story with the current scene kit: {sb['unsupported']}\nPick another idea or send a different script."); sys.exit(2)
    if errs:
        tg('Storyboard failed validation after 3 tries:\n- ' + '\n- '.join(errs[:6])); sys.exit(3)
    json.dump(sb, open(f'{D}/shots.json', 'w'), indent=1)
    sets = sorted({s['set'] for s in sb['shots']}); tg(f"Storyboard ready: {len(sb['shots'])} shots, {len(sb['cast'])} characters, set: {', '.join(sets)}. Send the MP3 voiceover when ready.")
try: main()
except SystemExit: raise
except Exception as e:
    tg(f'Storyboard step crashed: {e}'); raise
