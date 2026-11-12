# Step 1 of the cut: find every try of every line in Ali's take.
#   TAKE=/path/take.mov python cut/transcribe_take.py ["prompt with his script's rare words"]
# Writes audio/take.wav and cut/take_words.json; prints (a) the tries grouped at pauses with times and (b) every stretch
# of speech from the loudness envelope with the words in it ("<<< NO WORDS >>>" = Whisper missed it: check it).
# Pick the best try of each line, take in/out from part (b) (first / last sound), and fill SEQ in cut/build.py.
# Unclear words: cut/check_spots.py 80.4-85.7 176.3-179.2 ... (a bigger model on just those clips).
import json, os, sys, subprocess, numpy as np, soundfile as sf
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
SRC = os.environ.get("TAKE"); assert SRC, "set TAKE=/path/to/take.mov"
os.makedirs("audio", exist_ok=True)
if not os.path.exists("audio/take.wav"): subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", SRC, "-vn", "-ac", "1", "-ar", "48000", "-c:a", "pcm_f32le", "audio/take.wav"], check=True)
os.environ["HF_HUB_OFFLINE"] = "1"
from faster_whisper import WhisperModel
y, sr = sf.read("audio/take.wav"); y = y.astype(np.float32)
y16 = np.interp(np.arange(0, len(y), sr / 16000), np.arange(len(y)), y).astype(np.float32)
m = WhisperModel("small", device="cpu", compute_type="int8")
segs, _ = m.transcribe(y16, language="en", word_timestamps=True, initial_prompt=sys.argv[1] if len(sys.argv) > 1 else None, vad_filter=True, condition_on_previous_text=False)
W = [(w.word.strip(), round(w.start, 2), round(w.end, 2)) for s in segs for w in s.words]
json.dump(W, open("cut/take_words.json", "w"))
print("── tries (split at pauses over 0.6 s)"); line, prev = [], None
for w in W:
    if prev is not None and w[1] - prev > 0.6: print(f"[{line[0][1]:7.2f}-{line[-1][2]:7.2f}] " + " ".join(x[0] for x in line)); line = []
    line.append(w); prev = w[2]
if line: print(f"[{line[0][1]:7.2f}-{line[-1][2]:7.2f}] " + " ".join(x[0] for x in line))
hop = 240; n = len(y) // hop; r = 20 * np.log10(np.sqrt(np.mean(y[:n * hop].reshape(n, hop) ** 2, 1)) + 1e-9); r = np.convolve(r, np.ones(4) / 4, mode="same")
thr = np.percentile(r, 95) - 24; act = r > thr; runs, i = [], 0
while i < n:
    if act[i]:
        j = i
        while j < n and act[j]: j += 1
        runs.append([i * hop / sr, j * hop / sr]); i = j
    else: i += 1
M = []
for a, b in runs:
    if M and a - M[-1][1] < 0.12: M[-1][1] = b
    elif b - a > 0.04: M.append([a, b])
print("── speech from the loudness envelope (use these edges as in/out)")
for a, b in M:
    ws = [w for w, x, z in W if z > a - 0.1 and x < b + 0.1]
    print(f"{a:7.3f}-{b:7.3f} ({b - a:4.1f}s) {' '.join(ws) if ws else '<<< NO WORDS >>>'}")
