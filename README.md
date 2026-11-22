# shorts-pipeline
Phone-driven pipeline for 9:16 animated history Shorts: **idea → script → voiceover → storyboard → three.js render → YouTube** (YouTube step not connected yet).

- **Bot**: Telegram → Cloudflare Worker (`worker/`) → GitHub Actions. Only the owner's chat ID is served.
- **Ideas**: Gemini (free tier) writes 3 scripts each morning (`pipeline/ideas.py`, style notes in `pipeline/style.md`).
- **Storyboard**: Gemini turns a script into `jobs/<id>/shots.json` using only the vocabulary in `engine/kit/vocab.json`; validated by `pipeline/storyboard.py`. If a story can't be staged, nothing renders.
- **Render**: software-GL Chrome on GitHub runners, 8 parallel frame shards, then ffmpeg mux (`.github/workflows/render.yml`).
- **Scene kit** (`engine/director.js`, `engine/world.js`): 16 roles, 22 actions, 7 camera moves, and these sets: palace, farm, camps, pier, street, tavern, study, workshop, great_hall, ship_deck, forest, desert, snowfield. Add a set = build it in `world.js`, register anchors in `vocab.json`.
- Engine: 3D cartoon rig (MIT, `LICENSE-engine`). Third-party rig/fonts are downloaded in CI (`scripts/fetch-core.sh`), not redistributed.
