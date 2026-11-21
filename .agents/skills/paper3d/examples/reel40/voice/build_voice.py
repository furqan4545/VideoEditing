#!/usr/bin/env python3
"""Reel 40 v2: join the Dr.pimp lines into full/audio/voice.wav and write full/film/timing.js (paper3d format).
Ali's v1 note (21 Nov 2026): "too fast.. no gap between sentences, he is just non stop.. we need to build tension, show the
scene fully before cutting". So: a real breath after every sentence (SENT), commas keep their natural pause (capped at
COMMA), and each line starts after its own gap (GAP: longer where the picture travels to a new place or tension builds).
One gain per line and a per-line tempo (vo/tempo.json, pitch kept). Nothing else is done to the voice.
TIMING = { fps, dur, words: [[word, t0, t1, lineKey]], lines: {key: [t0, t1, gain_db]}, footage: {} }"""
import json, re, subprocess, wave, difflib
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]; RAW = ROOT / 'vo/raw'; SR = 48000
SCRIPT = json.loads((ROOT / 'vo/script.json').read_text())
TEMPO = json.loads((ROOT / 'vo/tempo.json').read_text()) if (ROOT / 'vo/tempo.json').exists() else {}
SENT, COMMA = 0.45, 0.4          # silence after a sentence inside a line / the longest pause allowed after a comma
GAP = {'run': 0.9, 'how': 0.5, 'leds': 0.8, 'green': 0.8, 'skin': 0.8, 'clever': 0.9, 'beat': 0.9, 'rate': 0.6, 'problem': 0.9,
       'rhythms': 0.7, 'steps': 0.5, 'motion': 0.6, 'nobody': 1.0, 'bp': 0.9, 'hose': 0.8, 'bulge': 0.6, 'payoff': 1.0, 'follow': 0.6}
LEAD, TAILEND, TARGET = 1.2, 1.2, -21.0
THR = 10 ** (-45 / 20)

def read(p, tempo=1.0):
    af = ['-af', f'atempo={tempo:.4f}'] if abs(tempo - 1) > 1e-3 else []
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p)] + af + ['-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(out, np.float32).copy()
def rms_db(x):
    v = x[np.abs(x) > 10 ** (-45 / 20)]; return 20 * np.log10(np.sqrt(np.mean(v * v)) + 1e-9)
norm = lambda w: re.sub(r'[^a-z0-9]', '', w.lower())

t = LEAD; parts = [np.zeros(int(LEAD * SR), np.float32)]; lines = {}; words = []
for i, L in enumerate(SCRIPT):
    tp = TEMPO.get(L['key'], 1.0); x = read(RAW / f"{i+1:02d}_{L['key']}.wav", tp)
    W = [dict(w, start=w['start'] / tp, end=w['end'] / tp) for w in json.loads((RAW / f"{i+1:02d}_{L['key']}.json").read_text())['words']]
    env = np.sqrt(np.convolve(x * x, np.ones(480) / 480, 'same'))
    loud = np.where(env > 10 ** (-42 / 20))[0]; a, b = loud[0] / SR, loud[-1] / SR
    PRE, POST = 0.06, 0.08
    s0, s1 = max(0.0, a - PRE), min(len(x) / SR, b + POST)
    # every silence between two words: a sentence end gets exactly SENT, any other pause at most COMMA
    edits = []                                                         # (at, delta s, old silence): delta < 0 removes, > 0 inserts
    q = env < THR
    for j in range(len(W) - 1):
        k0, k1 = int((W[j]['end'] - 0.03) * SR), int((W[j + 1]['start'] + 0.03) * SR)
        if k1 <= k0: continue
        seg = q[k0:k1]; best = None; k = 0                            # the longest real silence between the two words
        while k < len(seg):
            if seg[k]:
                m = k
                while m < len(seg) and seg[m]: m += 1
                if (m - k) >= int(0.03 * SR) and (best is None or m - k > best[1] - best[0]): best = (k, m)
                k = m
            else: k += 1
        if not best: continue                                          # no clean silence: never cut or open inside a sound
        sil = (best[1] - best[0]) / SR; mid = (k0 + (best[0] + best[1]) // 2) / SR
        sentence = bool(re.search(r'[.?!]$', W[j]['word'].strip()))
        want = SENT if sentence else min(sil, COMMA)
        if abs(want - sil) > 0.02: edits.append((mid, want - sil, sil))
    pcs = []; pos = s0; F = int(0.006 * SR)
    for at, delta, sil in edits:
        if delta < 0:
            c0, c1 = at + delta / 2, at - delta / 2                    # cut the middle of the silence
            pc = x[int(pos * SR):int(c0 * SR)].copy(); pc[-F:] *= np.linspace(1, 0, F)
            if pcs: pc[:F] *= np.linspace(0, 1, F)
            pcs.append(pc); pos = c1
        else:
            pc = x[int(pos * SR):int(at * SR)].copy(); pc[-F:] *= np.linspace(1, 0, F)
            if pcs: pc[:F] *= np.linspace(0, 1, F)
            pcs += [pc, np.zeros(int(delta * SR), np.float32)]; pos = at
    pc = x[int(pos * SR):int(s1 * SR)].copy()
    if pcs: pc[:F] *= np.linspace(0, 1, F)
    pcs.append(pc); seg = np.concatenate(pcs)
    def shift(tm):                                                     # how far a time inside the take moves
        sh = 0.0
        for at, delta, sil in edits:
            if delta < 0: sh -= max(0.0, min(tm, at - delta / 2) - (at + delta / 2))
            elif tm > at: sh += delta
        return sh
    g = 10 ** ((TARGET - rms_db(seg)) / 20); seg = seg * g
    f = int(0.004 * SR); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
    if i:
        gap = max(0.0, GAP.get(L['key'], 0.6) - PRE - POST); parts.append(np.zeros(int(gap * SR), np.float32)); t += gap
    disp = L.get('show', L['text']).split()
    A, B = [norm(d) for d in disp], [norm(w['word']) for w in W]
    span = [None] * len(disp)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, A, B, autojunk=False).get_opcodes():
        if tag == 'equal':
            for kk in range(i2 - i1): span[i1 + kk] = (W[j1 + kk]['start'], W[j1 + kk]['end'])
        elif i2 > i1:
            t0 = W[j1]['start'] if j2 > j1 else (W[j1 - 1]['end'] if j1 else a); t1 = W[j2 - 1]['end'] if j2 > j1 else (W[j1]['start'] if j1 < len(W) else b)
            for kk in range(i2 - i1): span[i1 + kk] = (t0 + (t1 - t0) * kk / (i2 - i1), t0 + (t1 - t0) * (kk + 1) / (i2 - i1))
    lw = []
    for j, dword in enumerate(disp):
        w0, w1 = span[j]; w0 = max(w0, s0); w1 = min(max(w1, w0 + 0.05), s1)
        lw.append([dword, round(float(t + w0 - s0 + shift(w0)), 3), round(float(t + w1 - s0 + shift(w1)), 3), L['key']])
    for j in range(len(lw) - 1):
        if lw[j][2] > lw[j + 1][1]: lw[j][2] = lw[j + 1][1]
    lines[L['key']] = [round(t, 3), round(t + len(seg) / SR, 3), round(float(20 * np.log10(g)), 1)]
    words += lw; parts.append(seg.astype(np.float32)); t += len(seg) / SR
    print(f"{lines[L['key']][0]:7.2f} {lines[L['key']][1]:7.2f} {lines[L['key']][2]:+5.1f} dB  {L['key']:8s} edits {len(edits)}")
parts.append(np.zeros(int(TAILEND * SR), np.float32)); y = np.concatenate(parts); dur = len(y) / SR
with wave.open(str(ROOT / 'full/audio/voice.wav'), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(3); w.setframerate(SR)
    w.writeframes((np.clip(y, -1, 1) * 8388607).astype('<i4').view(np.uint8).reshape(-1, 4)[:, :3].tobytes())
TIM = {'fps': 30, 'dur': round(dur, 3), 'words': words, 'lines': lines, 'clip': None, 'footage': {}}
(ROOT / 'full/film/timing.js').write_text('// reel 40 v2: Dr.pimp voice (cut/build_voice.py)\nwindow.TIMING = ' + json.dumps(TIM, ensure_ascii=False) + ';\n')
(ROOT / 'cut/lines.json').write_text(json.dumps(lines, indent=0))
print('dur', round(dur, 2), 'peak', round(float(20 * np.log10(np.abs(y).max() + 1e-9)), 1), 'dBFS')
