# shorts-pipeline
Phone-driven pipeline for 9:16 animated history Shorts: idea → script → voiceover → three.js render → YouTube.
Engine: 3D cartoon rig + sets (MIT, see LICENSE-engine). Status: step 1 (CI render test) — see `.github/workflows/render-test.yml`.
Local software-GL check (no GPU): `cd engine && CHROME_ARGS="--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --no-sandbox" XQ="&dur=2" node render.cjs out/t.mp4 1080 1920 30`
