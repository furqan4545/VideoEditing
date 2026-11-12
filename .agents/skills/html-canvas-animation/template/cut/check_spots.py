# Re-hear unclear clips of the take with the bigger Whisper (large-v3-turbo if cached, else small), no prompt bias.
#   python cut/check_spots.py 80.4-85.7 176.3-179.2
# If two models agree on a word he said differently from the script (a name, an accent), the captions follow what he
# said, or the script word when it is clearly his accent ("life" for "like"): tell Ali which.
import os, sys, numpy as np, soundfile as sf
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
os.environ["HF_HUB_OFFLINE"] = "1"
from faster_whisper import WhisperModel
y, sr = sf.read("audio/take.wav"); y = y.astype(np.float32)
try: m = WhisperModel("deepdml/faster-whisper-large-v3-turbo-ct2", device="cpu", compute_type="int8"); name = "turbo"
except Exception: m = WhisperModel("small", device="cpu", compute_type="int8"); name = "small"
for spot in sys.argv[1:]:
    a, b = map(float, spot.split("-")); c = y[int(a * sr):int(b * sr)]; c16 = np.interp(np.arange(0, len(c), sr / 16000), np.arange(len(c)), c).astype(np.float32)
    segs, _ = m.transcribe(c16, language="en", word_timestamps=True, condition_on_previous_text=False, beam_size=5)
    print(f"{name} {a:6.1f}-{b:6.1f}: " + " ".join(f"{w.word.strip()}[{a + w.start:.2f}]" for s in segs for w in s.words), flush=True)
