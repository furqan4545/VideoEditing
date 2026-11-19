#!/usr/bin/env python3
"""The voice lines, one at a time (never two models at once), then a Whisper check of each.

    python3 vo/generate.py            every line that has no take yet         (VoiceStudio must be open: localhost:3900)
    python3 vo/generate.py hook host  only these lines (delete vo/raw/NN_key.wav first to re-record one)

vo/script.json:  { "voice": "dr-pimp", "whisper_prompt": "rare words, names", "lines": [
   { "key": "claim", "text": what the voice SAYS (spell hard things out: "Koo-bye", "twenty-eight hundred", "A.I."),
     "show": what the screen shows if different ("Kubai", "2,800", "AI"), "direction": how to say it (goes in brackets before the text),
     "seed": another take of this one line, "gap": silence before it (default 0.28 s), "pauses": { "heard word": seconds added after it } } ] }

The voice is a saved one: downloads/voices/<voice>/voice.json (profile, engine, seed, settings). Dr.pimp is the default.
READ the Whisper line it prints for every take: a dropped or garbled word means a new take (add "seed": 742, 743, ...).
"""
import json, os, subprocess, sys, wave
from pathlib import Path
ROOT = Path(__file__).resolve().parent; RAW = ROOT / "raw"; RAW.mkdir(exist_ok=True)
DOC = json.loads((ROOT / "script.json").read_text()); SCRIPT = DOC["lines"]
def voice_json(name):
    if os.environ.get("VOICE_JSON"): return Path(os.environ["VOICE_JSON"])
    for up in ROOT.parents:
        for cand in (up / "voices" / name / "voice.json", up / "downloads/voices" / name / "voice.json"):
            if cand.exists(): return cand
    sys.exit(f"no saved voice '{name}': expected downloads/voices/{name}/voice.json (or set VOICE_JSON)")
CFG = json.loads(voice_json(DOC.get("voice", "dr-pimp")).read_text())
only = set(sys.argv[1:])
for i, line in enumerate(SCRIPT):
    if only and line["key"] not in only: continue
    target = RAW / f"{i+1:02d}_{line['key']}.wav"
    if not (target.exists() and target.stat().st_size > 1000):
        cmd = ["curl", "--fail-with-body", "--silent", "--show-error", "--max-time", "600", "-X", "POST", "http://localhost:3900/generate"]
        fields = {"engine": CFG["engine"], "language": CFG["language"], "profile_id": CFG["profile_id"], **{k: str(v) for k, v in CFG["generation"].items()},
                  "text": f"({line.get('direction') or CFG.get('default_direction', '')}) {line['text']}"}
        if "seed" in line: fields["seed"] = str(line["seed"])
        for k, v in fields.items(): cmd += ["--form-string", f"{k}={v}"]
        subprocess.run(cmd + ["--output", str(target)], check=True)
    with wave.open(str(target)) as w: dur = w.getnframes() / w.getframerate()
    tj = target.with_suffix(".json")
    subprocess.run(["curl", "--fail-with-body", "--silent", "--show-error", "--max-time", "180", "-X", "POST",
                    "http://localhost:3900/v1/audio/transcriptions", "-F", f"file=@{target}", "-F", "model=whisper-1", "-F", "language=en",
                    "-F", "response_format=verbose_json", "-F", "timestamp_granularities[]=word",
                    "--form-string", "prompt=" + DOC.get("whisper_prompt", ""), "--output", str(tj)], check=True)
    text = json.loads(tj.read_text()).get("text", "").strip(); n = len(line["text"].split())
    print(f"{i+1:02d} {line['key']:9s} {dur:5.2f}s {n/dur:4.2f} w/s | {text}", flush=True)
print("VOICE_BATCH_COMPLETE", flush=True)
