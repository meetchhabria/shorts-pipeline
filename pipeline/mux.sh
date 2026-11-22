#!/usr/bin/env bash
# mux.sh <job-dir> <raw.mp4> <out.mp4>: captions overlay + voice, -14 LUFS two-pass loudnorm, H.264 yuv420p + AAC 192k
set -euo pipefail
J=$(cd "$1" && pwd); RAW=$2; OUT=$3
ffmpeg -y -v error -i "$J/voice.mp3" -ar 44100 -ac 1 "$J/voice.wav"
M=$(ffmpeg -hide_banner -i "$J/voice.wav" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | python3 -c "
import sys,json; t=sys.stdin.read(); i=t.index('{'); d=json.loads(t[i:t.index('}',i)+1]); print('measured_I=%s:measured_TP=%s:measured_LRA=%s:measured_thresh=%s:offset=%s'%(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset']))" | tr -d '\r\n')
ffmpeg -y -v error -i "$RAW" -i "$J/cap/overlay.mov" -i "$J/voice.wav" -filter_complex "[0:v][1:v]overlay=0:0:format=auto,scale=out_range=tv,format=yuv420p[v];[2:a]loudnorm=I=-14:TP=-1.5:LRA=11:${M}:linear=true,aresample=44100[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p -color_range tv -r 30 -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
