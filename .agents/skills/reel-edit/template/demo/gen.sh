#!/bin/zsh
# Reel 4 demo voices, all from VoiceStudio, one generation at a time. Voice: "Ali (my voice)" clone (903af710).
# Text fields go through --form-string (a value starting with "(" breaks curl's -F).
cd "${0:A:h}"; P=903af710
gen() { # file engine text [extra -F args...]
  local f=$1 eng=$2 txt=$3; shift 3
  local t0=$(date +%s)
  curl -s --show-error -X POST localhost:3900/generate -F profile_id=$P -F language=English -F engine=$eng \
    --form-string "text=$txt" "$@" -o "$f.wav" -w "$f http=%{http_code} "
  echo "secs=$(( $(date +%s) - t0 )) dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f.wav" 2>/dev/null || head -c 300 "$f.wav")"
}
LINE="In a world where every voice costs money one free app changed everything"
# BAD: the default engine, no punctuation, no direction, rushed
gen bad_default omnivoice "$LINE" -F num_step=16 -F speed=1.12
# GOOD: emotion engine + written direction + pauses
gen good_trailer_a voxcpm2 "(deep, slow, dramatic movie trailer narrator, intense, cinematic) In a world... where every voice... costs money... one free app... changed everything."
gen good_trailer_b voxcpm2 "(epic movie trailer voice, low and gravelly, slow, full of suspense) In a world... where every voice costs money... one free app... changed... everything."
# BONUS: an ElevenLabs-style tag on the default engine gets read out loud
gen excited_tag omnivoice "[excited] Oh my god, this is so cool!" -F num_step=32
# CLOSE: Ali's clone says the line he didn't record
gen cta_clone voxcpm2 "(casual, friendly, confident, slight smile) Link and setup are in the description."
