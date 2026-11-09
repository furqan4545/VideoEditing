#!/bin/zsh
# Old Man (multilingual) designed voice, one generation at a time.
cd "${0:A:h}"; P=1f0f102c
gen() { # file language text
  curl -s --show-error -X POST localhost:3900/generate -F profile_id=$P -F "language=$2" -F num_step=32 \
    --form-string "text=$3" -o "$1.wav" -w "$1 http=%{http_code} "
  echo "dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$1.wav" 2>/dev/null || head -c 200 "$1.wav")"
}
gen 00-en-hook   English  "I speak five languages. I learned them ten seconds ago."
gen 01-es        Spanish  "Hola, amigos. Ahora hablo español, sin estudiar nada."
gen 02-ja        Japanese "こんにちは。今は日本語を話しています。"
gen 03-fr        French   "Bonjour. Maintenant, je parle français. Évidemment."
gen 04-zh        Chinese  "大家好。现在我说中文。"
gen 05-en-punch  English  "Jensen Huang loves Chinese fine shit."
