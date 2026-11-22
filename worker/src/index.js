// Telegram webhook for the Shorts pipeline. Only the owner chat ID is served; everything else is ignored.
// Secrets (wrangler secret put): TELEGRAM_BOT_TOKEN, WEBHOOK_SECRET, GH_PAT (fine-grained: this repo, Contents + Actions read/write).
const API = 'https://api.telegram.org';
const tg = (env, method, body) => fetch(`${API}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
const say = (env, text, extra = {}) => tg(env, 'sendMessage', { chat_id: env.OWNER_CHAT_ID, text, ...extra });
const gh = (env, path, init = {}) => fetch(`https://api.github.com/repos/${env.GH_REPO}${path}`, { ...init, headers: { authorization: `Bearer ${env.GH_PAT}`, accept: 'application/vnd.github+json', 'user-agent': 'shorts-bot', ...(init.headers || {}) } });
const dispatch = async (env, wf, inputs) => { const r = await gh(env, `/actions/workflows/${wf}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: 'main', inputs }) }); if (r.status !== 204) throw new Error(`dispatch ${wf}: ${r.status} ${await r.text()}`); };
const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
async function putFile(env, path, text, msg) { const cur = await gh(env, `/contents/${path}`); const sha = cur.ok ? (await cur.json()).sha : undefined;
  const r = await gh(env, `/contents/${path}`, { method: 'PUT', body: JSON.stringify({ message: msg, content: b64(text), sha, committer: { name: 'shorts-bot', email: 'bot@users.noreply.github.com' } }) }); if (!r.ok) throw new Error(`putFile ${path}: ${r.status}`); }
const getText = async (env, path) => { const r = await gh(env, `/contents/${path}`, { headers: { accept: 'application/vnd.github.raw+json' } }); if (!r.ok) throw new Error(`read ${path}: ${r.status}`); return r.text(); };
const getState = async env => JSON.parse((await env.STATE.get('state')) || '{"phase":"idle","tzMin":330}');
const setState = (env, s) => env.STATE.put('state', JSON.stringify(s));
const jobId = () => new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
const HELP = `Shorts bot commands:\n/ideas [topic hint] – 3 script options\n/status – current step + latest run\n/tz +05:30 – set your time zone\n/cancel – drop the current job\nOr send your own script as plain text.`;

async function handle(u, env) {
  const cb = u.callback_query, m = u.message, from = (cb || m)?.from?.id;
  if (String(from) !== String(env.OWNER_CHAT_ID)) return;   // owner only
  let st = await getState(env);
  if (cb) { await tg(env, 'answerCallbackQuery', { callback_query_id: cb.id }); const [kind, job, n] = cb.data.split(':');
    if (kind === 'pick') { const ideas = JSON.parse(await getText(env, `jobs/${job}/ideas.json`)), o = ideas.options[+n - 1];
      await putFile(env, `jobs/${job}/script.txt`, o.script_lines.join('\n') + '\n', `script: ${o.title}`); await putFile(env, `jobs/${job}/cards.json`, JSON.stringify(o.cards, null, 1), 'cards');
      await putFile(env, `jobs/${job}/meta.json`, JSON.stringify({ title: o.title, description: o.description, tags: o.tags }, null, 1), 'meta');
      st = { ...st, phase: 'voice', job }; await setState(env, st);
      await say(env, `Picked: ${o.title}\n\nGenerate this in ElevenLabs and send me the MP3:`); await say(env, o.script_lines.join('\n')); return; }
    if (kind === 'approve') { st = { ...st, phase: 'schedule', job }; await setState(env, st); return say(env, `Approved. When should it go live? Reply like: 2026-11-25 18:00 (time zone ${tzLabel(st.tzMin)}; change with /tz +05:30)`); }
    if (kind === 'changes') { st = { ...st, phase: 'changes', job }; await setState(env, st); return say(env, 'What should change? Reply with a note (for example "make the pig bigger, slow the cut at 13 s"). I will pick it up in the next editing session.'); }
    return; }
  const text = (m.text || '').trim();
  if (text === '/start' || text === '/help') return say(env, HELP);
  if (text === '/cancel') { await setState(env, { phase: 'idle', tzMin: st.tzMin }); return say(env, 'Cancelled.'); }
  if (text.startsWith('/tz')) { const mm = text.match(/([+-])(\d{1,2}):?(\d{2})?/); if (!mm) return say(env, 'Use /tz +05:30'); st.tzMin = (mm[1] === '-' ? -1 : 1) * (+mm[2] * 60 + +(mm[3] || 0)); await setState(env, st); return say(env, `Time zone set to ${tzLabel(st.tzMin)}`); }
  if (text === '/status') { const r = await (await gh(env, '/actions/runs?per_page=1')).json(), run = r.workflow_runs?.[0]; return say(env, `Step: ${st.phase}${st.job ? ` (${st.job})` : ''}\nLatest run: ${run ? `${run.name} – ${run.status}${run.conclusion ? '/' + run.conclusion : ''}\n${run.html_url}` : 'none'}`); }
  if (text.startsWith('/ideas')) { const job = jobId(); await dispatch(env, 'ideas.yml', { mode: 'ideas', job, hint: text.replace('/ideas', '').trim() }); st = { ...st, phase: 'pick', job }; await setState(env, st); return say(env, 'Thinking up 3 options… (about a minute)'); }
  const media = m.audio || m.voice || (m.document?.mime_type?.startsWith('audio') ? m.document : null) || (m.document?.file_name?.match(/\.(mp3|wav|m4a|ogg)$/i) ? m.document : null);
  if (media) { if (st.phase !== 'voice') return say(env, 'I was not waiting for a voiceover. Use /ideas or send a script first.');
    await dispatch(env, 'intake.yml', { job: st.job, file_id: media.file_id, chat_id: String(env.OWNER_CHAT_ID) }); st.phase = 'built-by-claude'; await setState(env, st); return say(env, 'Got the voiceover. Saving it to the job now; I will message you when it is stored. The video itself is built in a Claude Code session (hand-built scene), not automatically.'); }
  if (st.phase === 'schedule') { const mm = text.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/); if (!mm) return say(env, 'Format: 2026-11-25 18:00');
    const utc = new Date(Date.UTC(+mm[1], +mm[2] - 1, +mm[3], +mm[4], +mm[5]) - st.tzMin * 60000).toISOString(); await putFile(env, `jobs/${st.job}/schedule.json`, JSON.stringify({ publishAtUtc: utc, requestedLocal: text, tzMin: st.tzMin }, null, 1), 'schedule');
    st.phase = 'idle'; await setState(env, st); return say(env, `Saved: publish at ${utc} UTC. (YouTube upload is not connected yet, so I will hold the file until that step is built.)`); }
  if (st.phase === 'changes') { await putFile(env, `jobs/${st.job}/changes.md`, `${text}\n`, 'change request'); st.phase = 'idle'; await setState(env, st); return say(env, 'Noted in jobs/' + st.job + '/changes.md.'); }
  if (text && !text.startsWith('/')) { const lines = text.split('\n').map(s => s.trim()).filter(Boolean), job = jobId();
    await putFile(env, `jobs/${job}/script.txt`, lines.join('\n') + '\n', 'custom script'); await dispatch(env, 'ideas.yml', { mode: 'cards', job, hint: '' }); st = { ...st, phase: 'voice', job }; await setState(env, st);
    return say(env, `Using your script (${lines.length} lines). Generate the voiceover in ElevenLabs and send me the MP3. I am preparing on-screen cards in the background.`); }
  return say(env, HELP);
}
const tzLabel = mn => `UTC${mn < 0 ? '-' : '+'}${String(Math.floor(Math.abs(mn) / 60)).padStart(2, '0')}:${String(Math.abs(mn) % 60).padStart(2, '0')}`;
export default { async fetch(req, env) { const url = new URL(req.url);
  if (url.pathname === '/') return new Response('shorts-bot ok');
  if (url.pathname !== '/tg' || req.method !== 'POST') return new Response('not found', { status: 404 });
  if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
  const u = await req.json(); try { await handle(u, env); } catch (e) { await say(env, `Error: ${e.message}`); } return new Response('ok'); } };
