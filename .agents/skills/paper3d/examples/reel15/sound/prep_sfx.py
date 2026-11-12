"""Reel 15: cut every effect recording to the clip the mix places (trim, fade; no levelling here).
   ~/.local/share/earshot/.venv/bin/python sound/prep_sfx.py     ->  sound/sfx/cut/<name>.wav  + sound/sfx/cut/SOURCES.json
Sources: real recordings from the cloud library (Sonniss GDC 2024/2026) and Ali's own folder, copied to sound/sfx/src/."""
import json, os, numpy as np, soundfile as sf, scipy.signal as sg
os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/..')
SR = 48000; SRC, OUT = 'sound/sfx/src/', 'sound/sfx/cut/'; os.makedirs(OUT, exist_ok=True)
def load(n): x, sr = sf.read(SRC + n + '.wav', dtype='float32', always_2d=True); assert sr == SR; return x
def env(x, win=0.02): e = np.abs(x).max(1); k = int(win * SR); return np.convolve(e, np.ones(k) / k, 'same')
def fade(x, fi=0.004, fo=0.15):
    x = x.copy(); a, b = max(1, int(fi * SR)), max(1, min(len(x), int(fo * SR)))
    x[:a] *= np.linspace(0, 1, a)[:, None]; x[-b:] *= (np.linspace(1, 0, b)[:, None]) ** 2; return x
def onset(x, db=-36): e = env(x, 0.003); return int(np.argmax(e > e.max() * 10 ** (db / 20)))
def whole(n, maxlen=9, fo=0.15, hp=None):
    x = load(n); x = x[max(0, onset(x) - int(0.004 * SR)):][:int(maxlen * SR)]
    if hp: x = sg.sosfilt(sg.butter(2, hp, 'high', fs=SR, output='sos'), x, axis=0).astype(np.float32)
    return fade(x, fo=fo)
def peak(n, lead, tail, fi=0.12, fo=0.3, hp=None):
    x = load(n); p = int(np.argmax(env(x, 0.03))); x = x[max(0, p - int(lead * SR)):p + int(tail * SR)]
    if hp: x = sg.sosfilt(sg.butter(2, hp, 'high', fs=SR, output='sos'), x, axis=0).astype(np.float32)
    return fade(x, fi, fo)
def seg(n, t0, t1, fi=0.02, fo=0.2): return fade(load(n)[int(t0 * SR):int(t1 * SR)], fi, fo)
def beeps(unit, count, period):                       # a real beep recording, repeated the way a gate sounder repeats it
    n = int(period * SR); y = np.zeros((n * (count - 1) + len(unit), 2), np.float32)
    for i in range(count): y[i * n:i * n + len(unit)] += unit
    return y
C = {}
# camera
C['whip_ali1'] = whole('whip_ali1'); C['whip_ali2'] = whole('whip_ali2'); C['whip_sweep'] = whole('whip_sweep'); C['whip_wind'] = whole('whip_wind', fo=0.3)
C['dive_scifi'] = whole('dive_scifi', fo=0.4); C['dive_airy'] = peak('dive_airy', 1.0, 0.9, 0.25, 0.5); C['dive_heavy'] = peak('dive_heavy', 1.1, 0.7, 0.3, 0.45, hp=90); C['dive_epic'] = whole('dive_epic', 1.7, 0.5, hp=100)
C['pull_revmetal'] = fade(load('pull_revmetal')[-int(1.7 * SR):], 0.35, 0.05); C['pull_drop16'] = whole('pull_drop16', 1.6, 0.6); C['pull_drop12'] = whole('pull_drop12', 1.6, 0.7); C['pull_deviant'] = peak('pull_deviant', 1.0, 0.8, 0.3, 0.5)
# the gate alarm: a real 3.9 kHz piezo beep (supermarket) and a real 2 kHz appliance beep (the other shop), repeated like a gate sounder
th = whole('beep_thermo', 0.2, 0.012); mb = seg('beep_micro', 2.175, 2.49, 0.004, 0.03)
C['alarm_a4'] = beeps(th, 4, 0.235); C['alarm_a6'] = beeps(th, 6, 0.225); C['alarm_b3'] = beeps(mb, 3, 0.335)
C['beep_button'] = whole('beep_button', 1.35, 0.05)
# hits
C['boom_sub'] = whole('boom_sub', 3.2, 0.9); C['boom_real'] = whole('boom_real', 2.8, 0.9); C['hit_bz'] = whole('hit_bz', 1.7, 0.6)
# the gate's field (real mains / electromagnetic hum, short bursts) and the strip ringing (real struck metal)
# mains-hum / EMF recordings read as 'error buzz' (z 3.5-4.6) and as synthesized (p_real 0.03-0.06) to earshot, so the field is a low
# tonal metal drone instead (The Noisery, Moaning Metal: p_real 0.87, error-buzz z 1.4), two different stretches of it, as soft swells
C['field_low_a'] = seg('field_lowtonal', 2.0, 3.5, 0.35, 0.7); C['field_low_b'] = seg('field_lowtonal', 4.0, 5.5, 0.35, 0.7)
C['ring_spade'] = whole('ring_spade', 1.7, 0.9); C['ring_iron'] = whole('ring_iron', 1.7, 0.9); C['ring_impact'] = whole('ring_impact', 1.46, 0.5)
C['tick_gear'] = whole('tick_gear', 0.25, 0.03); C['tick_tiny'] = whole('tick_tiny', 0.06, 0.01); C['tick_tape'] = whole('tick_tape', 0.6, 0.08); C['tick_ali'] = whole('tick_ali', 0.3, 0.05)
# props
C['cloth_pat'] = whole('cloth_pat', 0.5, 0.1); C['cloth_move29'] = whole('cloth_move29', 1.3, 0.25); C['cloth_move24'] = seg('cloth_move24', 0.25, 1.2, 0.05, 0.25); C['cloth_flip'] = whole('cloth_flip', 0.69, 0.15)
C['thud_box'] = whole('thud_box', 0.6, 0.15); C['thud_caseclose'] = whole('thud_caseclose', 0.5, 0.2); C['thud_case'] = whole('thud_case', 0.7, 0.3)
C['clink_lid'] = whole('clink_lid', 0.7, 0.2); cb = load('clink_carabiner'); p = int(np.argmax(env(cb, 0.01))); C['clink_carabiner'] = fade(cb[max(0, p - int(0.05 * SR)):p + int(0.45 * SR)], 0.01, 0.2)
C['keys_kawa'] = whole('keys_kawa', 0.55, 0.15); C['paper_a4'] = whole('paper_a4', 1.2, 0.3); C['paper_card'] = whole('paper_card', 0.9, 0.25)
C['page_ency'] = whole('page_ency', 0.55, 0.1); C['page_book'] = seg('page_book', 0.1, 1.1, 0.03, 0.3)
C['steps_cell'] = whole('steps_cell', 1.5, 0.3); C['wash_rinse'] = seg('wash_rinse', 0.3, 1.7, 0.15, 0.4); C['creak_hinge'] = seg('creak_hinge', 4.25, 5.05, 0.05, 0.2)
C['whoomp_jump'] = whole('whoomp_jump', 1.4, 0.8); C['rev_glass'] = peak('rev_glass', 0.8, 0.35, 0.2, 0.25); C['twang_whammy'] = seg('twang_whammy', 0.0, 1.4, 0.005, 0.5)
for k, x in C.items(): sf.write(OUT + k + '.wav', x, SR, subtype='FLOAT')
print(len(C), 'clips:', ' '.join(f"{k}:{len(x) / SR:.2f}" for k, x in C.items()))
