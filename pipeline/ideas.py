#!/usr/bin/env python3
"""ideas.py ideas|cards <job> [hint]  — Gemini (free tier) writes 3 script options (or cards+meta for a user script).
Env: GEMINI_API_KEY, GEMINI_MODEL (default gemini-2.0-flash), TELEGRAM_BOT_TOKEN, TELEGRAM_OWNER_CHAT_ID."""
import json, os, sys, glob, urllib.request, urllib.error
mode, job = sys.argv[1], sys.argv[2]; hint = sys.argv[3] if len(sys.argv) > 3 else ''
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); D = f'{R}/jobs/{job}'; os.makedirs(D, exist_ok=True)
RULES = """Format: vertical 9:16 animated history Short, voiced by one narrator, 36-45 seconds spoken (about 85-150 words), 4-8 lines (one line per scene beat, line 1 is a hook).
Tone: punchy, grounded in the historical record. NEVER show or describe bodies or gore. Do not overclaim causes; say 'subsided' not 'definitively stopped'. Only use facts you are confident are accurate. Prefer topics with a small cast (2-4 people) in one place around one object or place.
Cards: short on-screen callouts (ALL CAPS, <= 28 chars) like 'SOHO, 1854' or '500+ DEATHS / 10 DAYS'. Each card: {"text","from":"L0","to":"L1","y":0.15,"size":100,"color":"#ffd400"}; put a smaller second white card at y 0.21 size 52 for a subtitle. from/to are line ids L0..Ln or "end"."""
SCHEMA = '{"options":[{"title":"...","description":"YouTube description with sources","tags":["..."],"script_lines":["line 1 (hook)","line 2","..."],"cards":[{...}]}]}'
def pick_model():
    """GEMINI_MODEL if set; otherwise the newest stable 'flash' text model this key can call (model names change, so ask the API)."""
    if os.environ.get('GEMINI_MODEL'): return os.environ['GEMINI_MODEL']
    import re
    req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', headers={'x-goog-api-key': os.environ['GEMINI_API_KEY']})
    ms = json.loads(urllib.request.urlopen(req, timeout=60).read()).get('models', [])
    ok = [m['name'].split('/')[-1] for m in ms if 'generateContent' in m.get('supportedGenerationMethods', [])]
    bad = ('lite', 'image', 'tts', 'live', 'audio', 'embed', 'thinking', 'vision', 'robotics', 'computer', 'preview', 'exp', 'latest', 'learnlm', 'gemma')
    cand = [n for n in ok if 'flash' in n and not any(b in n for b in bad)]
    ver = lambda n: [int(x) for x in re.findall(r'\d+', n)] or [0]
    pick = sorted(cand, key=ver)[-1] if cand else (sorted([n for n in ok if 'gemini' in n and 'preview' not in n], key=ver) or ok)[-1]
    print('using model', pick, '(of', len(ok), 'usable)'); return pick
def gemini(prompt):
    import time
    model = pick_model(); key = os.environ['GEMINI_API_KEY']
    body = json.dumps({'contents': [{'parts': [{'text': prompt}]}], 'generationConfig': {'responseMimeType': 'application/json', 'temperature': 0.9}}).encode()
    for attempt in range(4):
        req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent', body, {'content-type': 'application/json', 'x-goog-api-key': key})
        try: return json.loads(json.loads(urllib.request.urlopen(req, timeout=120).read())['candidates'][0]['content']['parts'][0]['text'])
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503) and attempt < 3: time.sleep(8 * (attempt + 1)); continue
            raise RuntimeError(f'Gemini {model}: HTTP {e.code} {e.read().decode()[:300]}')
def tg(text, markup=None):
    tok, chat = os.environ.get('TELEGRAM_BOT_TOKEN'), os.environ.get('TELEGRAM_OWNER_CHAT_ID')
    if not tok or not chat: print(text); return
    p = {'chat_id': chat, 'text': text[:4000]};
    if markup: p['reply_markup'] = markup
    urllib.request.urlopen(urllib.request.Request(f'https://api.telegram.org/bot{tok}/sendMessage', json.dumps(p).encode(), {'content-type': 'application/json'}), timeout=60)
def valid(o):
    n = len(o['script_lines']); assert 3 <= n <= 9, 'line count'
    for c in o['cards']:
        for k in ('from', 'to'):
            assert c[k] == 'end' or (c[k][0] == 'L' and int(c[k][1:]) < n), 'card ref'
    return o
def main():
    if mode == 'ideas':
        past = sorted({open(f).read().split('\n')[0][:80] for f in glob.glob(f'{R}/jobs/*/script.txt')})
        out = gemini(f"""{RULES}\n\nWrite 3 different script options for tomorrow's Short{(' about: ' + hint) if hint else ''}. Avoid repeating these earlier topics (first lines): {json.dumps(past)}.\nReturn JSON exactly like {SCHEMA} with 3 options.""")
        opts = [valid(o) for o in out['options'][:3]]; json.dump({'options': opts}, open(f'{D}/ideas.json', 'w'), indent=1)
        txt = '\n\n'.join(f"{i+1}. {o['title']}\n" + '\n'.join(o['script_lines']) for i, o in enumerate(opts))
        tg('Morning options:\n\n' + txt + '\n\nTap one, or reply with your own script.', {'inline_keyboard': [[{'text': f'Use {i+1}', 'callback_data': f'pick:{job}:{i+1}'} for i in range(len(opts))]]})
    else:
        lines = [l.strip() for l in open(f'{D}/script.txt') if l.strip()]
        out = gemini(f"{RULES}\n\nHere is a finished script (lines L0..L{len(lines)-1}):\n" + '\n'.join(f'L{i}: {l}' for i, l in enumerate(lines)) + f"\n\nReturn JSON like {{\"title\":\"...\",\"description\":\"...\",\"tags\":[...],\"cards\":[...]}} with cards for these exact lines.")
        valid({'script_lines': lines, 'cards': out['cards']}); json.dump(out['cards'], open(f'{D}/cards.json', 'w'), indent=1); json.dump({k: out[k] for k in ('title', 'description', 'tags')}, open(f'{D}/meta.json', 'w'), indent=1)
        tg(f"Cards ready for '{out['title']}'. Send the MP3 voiceover whenever you have it.")

try: main()
except Exception as e:
    tg(f'Idea generation failed: {e}'); raise
