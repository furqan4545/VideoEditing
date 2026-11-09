# Joins the six old-man lines into one 48 kHz voice track for the clip, each line at -16 LUFS,
# and writes the timing of every line (used by the composition and the mouth analysis).
import json, subprocess, re
LINES = [  # file, language tag, caption, English gloss
  ("00-en-hook", "EN", "I speak five languages. I learned them ten seconds ago.", ""),
  ("01-es", "ES", "Hola, amigos. Ahora hablo español, sin estudiar nada.", "Hi friends. Now I speak Spanish. Zero studying."),
  ("02-ja", "JA", "こんにちは。今は日本語を話しています。", "Hello. Now I'm speaking Japanese."),
  ("03-fr", "FR", "Bonjour. Maintenant, je parle français. Évidemment.", "Hello. Now I speak French. Obviously."),
  ("04-zh-old", "ZH", "大家好。现在我说中文。", "Hi everyone. Now I speak Chinese."),  # v1 line; the Jensen take is audio/04-zh.wav
  ("05-en-punch", "EN2", "Jensen Huang loves Chinese fine shyt.", ""),
]
LEAD, GAP, GAP_PUNCH, TAIL = 0.30, 0.45, 0.55, 1.60
def lufs(path):
    out = subprocess.run(["ffmpeg","-hide_banner","-i",path,"-af","ebur128","-f","null","-"],capture_output=True,text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", out)[-1])
def dur(path):
    return float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",path],capture_output=True,text=True).stdout)
t = LEAD; timing = []; inputs = []; filt = []
for i,(f,tag,cap,gloss) in enumerate(LINES):
    p = f"audio/{f}.wav"; g = -16.0 - lufs(p); d = dur(p)
    if i: t += GAP_PUNCH if tag == "EN2" else GAP
    timing.append({"id": f, "tag": tag, "start": round(t,3), "end": round(t+d,3), "caption": cap, "gloss": gloss})
    inputs += ["-i", p]
    filt.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=mono,volume={g:.2f}dB,adelay={int(t*1000)}[a{i}]")
    t += d
total = round(t + TAIL, 2)
filt.append("".join(f"[a{i}]" for i in range(len(LINES))) + f"amix=inputs={len(LINES)}:normalize=0,apad,atrim=end={total},alimiter=limit=0.708:level=false[o]")
subprocess.run(["ffmpeg","-v","error","-y",*inputs,"-filter_complex",";".join(filt),"-map","[o]","-ar","48000","-ac","1","hf/assets/voice.wav"],check=True)
json.dump({"total": total, "lines": timing}, open("timing.json","w"), ensure_ascii=False, indent=1)
print("total", total); [print(x["id"], x["start"], x["end"]) for x in timing]
