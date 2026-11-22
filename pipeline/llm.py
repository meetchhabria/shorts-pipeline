"""Shared Gemini + Telegram helpers (stdlib only). Env: GEMINI_API_KEY, GEMINI_MODEL, TELEGRAM_BOT_TOKEN, TELEGRAM_OWNER_CHAT_ID."""
import json, os, time, urllib.request, urllib.error
def gemini(prompt, model=None, temperature=0.7):
    model = model or os.environ.get('GEMINI_MODEL') or 'gemini-3.5-flash'; key = os.environ['GEMINI_API_KEY']
    body = json.dumps({'contents': [{'parts': [{'text': prompt}]}], 'generationConfig': {'responseMimeType': 'application/json', 'temperature': temperature}}).encode()
    for attempt in range(4):
        req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent', body, {'content-type': 'application/json', 'x-goog-api-key': key})
        try: return json.loads(json.loads(urllib.request.urlopen(req, timeout=180).read())['candidates'][0]['content']['parts'][0]['text'])
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503) and attempt < 3: time.sleep(8 * (attempt + 1)); continue
            raise RuntimeError(f'Gemini {model}: HTTP {e.code} {e.read().decode()[:300]}')
def tg(text, markup=None):
    tok, chat = os.environ.get('TELEGRAM_BOT_TOKEN'), os.environ.get('TELEGRAM_OWNER_CHAT_ID')
    if not tok or not chat: print(text); return
    p = {'chat_id': chat, 'text': text[:4000]}
    if markup: p['reply_markup'] = markup
    urllib.request.urlopen(urllib.request.Request(f'https://api.telegram.org/bot{tok}/sendMessage', json.dumps(p).encode(), {'content-type': 'application/json'}), timeout=60)
