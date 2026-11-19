#!/bin/zsh
# Reel 5 "How human can a FREE AI voice get?" — the six AI levels, one generation at a time.
# Level 1 is a classic computer voice (macOS `say -v Fred`), made by l1 below, not VoiceStudio.
# Levels 2-5: the same VoiceStudio voice ("Demo Voice", demo0001) getting more human each level.
# Level 6: Ali's own clone (903af710).
# Text goes through --form-string (a value starting with "(" breaks curl's -F).
cd "${0:A:h}"
gen() { # file profile engine text [extra -F args...]
  local f=$1 p=$2 eng=$3 txt=$4; shift 4
  [ -s "$f.wav" ] && { echo "$f exists"; return; }
  local t0=$(date +%s)
  curl -s --show-error -X POST localhost:3900/generate -F profile_id=$p -F language=English -F engine=$eng \
    --form-string "text=$txt" "$@" -o "$f.wav" -w "$f http=%{http_code} "
  echo "secs=$(( $(date +%s) - t0 )) dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f.wav" 2>/dev/null || head -c 300 "$f.wav")"
}
V=demo0001; ALI=903af710
# L1: computer voice, all lowercase, no punctuation
[ -s l1_Fred.wav ] || { say -v Fred -r 190 -o l1.aiff "hello i am not a robot i am a real human"; ffmpeg -v error -y -i l1.aiff -ar 48000 -ac 1 l1_Fred.wav; rm l1.aiff; }
# L2: punctuation only, default engine, no direction
gen l2_a $V omnivoice "Hi... I'm not a robot. I promise."
gen l2_b $V omnivoice "Hi... I'm not a robot. I promise."
# L3: emotion engine + direction: nervous
gen l3_a $V voxcpm2 "(nervous, stammering, anxious, quick breaths) Why are you staring? I'm... I'm not a robot."
gen l3_b $V voxcpm2 "(very nervous and scared, voice shaking, stammering) Why are you staring? I'm... I'm not a robot."
# L4: direction: offended
gen l4_a $V voxcpm2 "(offended, sassy, annoyed, dramatic) Excuse me? Robots don't get offended. And I am VERY offended."
gen l4_b $V voxcpm2 "(deeply insulted, sassy, outraged, emphatic) Excuse me? Robots don't get offended. And I am very offended."
# L5: a real laugh
gen l5_a $V omnivoice "[laughter] Me? A robot? That's the funniest thing I've heard all day."
gen l5_b $V omnivoice "[laughter] Me? A robot? [laughter] That's the funniest thing I've heard all day."
gen l5_c $V voxcpm2 "(laughing out loud, genuinely amused, cracking up) Ha ha ha! Me? A robot? That's the funniest thing I've heard all day."
# L6: Ali's clone, whispering
gen l6_a $ALI voxcpm2 "(whispering, calm, slow, a little creepy) Relax. I'm not the robot... you are."
gen l6_b $ALI voxcpm2 "(soft whisper, close to the microphone, slow and eerie) Relax. I'm not the robot... you are."
gen l6_c $ALI voxcpm2 "(whispering) Relax... I'm not the robot... you are."
gen l6_d $ALI voxcpm2 "(a quiet breathy whisper, secretive, almost silent) Relax. I'm not the robot... you are."
