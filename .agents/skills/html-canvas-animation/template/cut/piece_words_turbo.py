# Word times of every cut piece (cut/check/<id>.wav) with the bigger Whisper, written over cut/words/<id>.json.
# Then: python cut/build.py --timing && python cut/pauses.py
import os, json, glob, numpy as np, soundfile as sf
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
os.environ["HF_HUB_OFFLINE"] = "1"
from faster_whisper import WhisperModel
m = WhisperModel("deepdml/faster-whisper-large-v3-turbo-ct2", device="cpu", compute_type="int8")
T = json.load(open("cut/timing.json"))
for s in T["segs"]:
    y, sr = sf.read(f"cut/check/{s['id']}.wav"); y = y.astype(np.float32); y16 = np.interp(np.arange(0, len(y), sr / 16000), np.arange(len(y)), y).astype(np.float32)
    segs, _ = m.transcribe(y16, language="en", word_timestamps=True, condition_on_previous_text=False, beam_size=5, initial_prompt=s["text"])
    words = [{"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)} for g in segs for w in g.words]
    json.dump({"words": words}, open(f"cut/words/{s['id']}.json", "w")); print(s["id"], " ".join(w["word"] for w in words), flush=True)
