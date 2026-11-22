#!/usr/bin/env bash
# Third-party files that are NOT redistributed in this repo (their own licenses apply): Mixamo Xbot rig (three.js examples) + Anton / Inter fonts (SIL OFL).
set -euo pipefail
cd "$(dirname "$0")/../engine"
TJ=https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/models/gltf
mkdir -p assets/rigs film
curl -fsSL -o assets/rigs/Xbot.glb "$TJ/Xbot.glb"
curl -fsSL -o film/Anton.ttf "https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf"
curl -fsSL -o film/Inter-Black.otf "https://github.com/rsms/inter/raw/v3.19/docs/font-files/Inter-Black.otf"
echo "core assets ok"
