#!/usr/bin/env bash
# prepare.sh <job-dir>: timing + captions for a job (script.txt, cards.json, voice.mp3 in the job dir)
set -euo pipefail
J=$(cd "$1" && pwd); R=$(cd "$(dirname "$0")/.." && pwd)
python3 "$R/pipeline/gen_timing.py" "$J" "$R/engine/film"
cd "$J"
python3 -m pip -q install pillow >/dev/null
CAP_Y=${CAP_Y:-0.74} FONT=${FONT:-/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf} python3 "$R/pipeline/captions_yellow.py"
