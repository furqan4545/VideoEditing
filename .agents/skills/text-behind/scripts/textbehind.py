#!/usr/bin/env python3
"""text-behind — big title text BEHIND the person for a couple of seconds (the person stays in front of the words).

  # a video: the effect from --at for --dur seconds, everything else untouched (audio copied)
  textbehind.py --video IN.mp4 --out OUT.mp4 --at 13.7 --dur 2.2 --text "THE REAL|white" --text "TRUTH|red"

  # a folder of frames (e.g. an onetake footage take): frames are replaced in place, originals kept in _orig/
  textbehind.py --frames film/footage/L7 --fps 30 --at 2.3 --dur 2.2 --text "THE REAL|white" --text "TRUTH|red"

--text "WORDS|color|key=value,..."   one line each, top to bottom. color: white, red, black, cream or #rrggbb.
    keys: t=SECONDS (when this line lands, relative to --at; default i * --stagger), size=1.0 (relative height),
          font=PATH (this line only), y=0.5 (this line's vertical centre, 0-1, overrides the stack)
--y 0.24          vertical centre of the text block (0 top, 1 bottom); put it at head height so the head covers part of it
--width 0.96      each line is fitted to this share of the frame width (the examples run edge to edge)
--condense 0.6    horizontal squeeze of the face → the tall editorial look (1.0 = the font as designed)
--font PATH       default: Bodoni 72 Bold (macOS, --font-index 2): heavy high-contrast serif like the references;
                  Didot Bold (Didot.ttc, index 2) is the lighter alternative
--dim 0.42        background brightness while the text is up (0-1; 1 = no dimming); the person is never dimmed
--desat 0.35      how much colour the background loses (0-1)
--mode person     person (keeps hands/arms with the body) | subject (every foreground object, drops loose hands)
--stagger 0.35    seconds between lines when no t= is given; --in 0.38 / --out 0.30 entrance / exit times

Masks come from scripts/personmask (Apple Vision, built into macOS: no model download, runs on the Neural Engine,
one frame at a time). Build it once: swiftc -O scripts/personmask.swift -o ~/.local/share/text-behind/personmask
"""
import argparse, glob, json, os, shutil, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
MASKER = os.path.expanduser('~/.local/share/text-behind/personmask')
COLORS = {'white': (246, 244, 238), 'red': (226, 24, 28), 'black': (12, 12, 14), 'cream': (240, 228, 205)}
FONTS = ['/System/Library/Fonts/Supplemental/Bodoni 72.ttc', '/System/Library/Fonts/Supplemental/Didot.ttc', '/System/Library/Fonts/Supplemental/BigCaslon.ttf']


def ease_out(u): u = min(1, max(0, u)); return 1 - (1 - u) ** 3
def ease_in_out(u): u = min(1, max(0, u)); return u * u * (3 - 2 * u)


def parse_line(s, i, stagger):
    parts = s.split('|'); words = parts[0]; col = parts[1].strip() if len(parts) > 1 and parts[1].strip() else 'white'
    kv = dict(p.split('=', 1) for p in (parts[2].split(',') if len(parts) > 2 and parts[2] else []))
    rgb = tuple(int(col[k:k + 2], 16) for k in (1, 3, 5)) if col.startswith('#') else COLORS.get(col, COLORS['white'])
    return {'text': words, 'rgb': rgb, 't': float(kv.get('t', i * stagger)), 'size': float(kv.get('size', 1.0)),
            'font': kv.get('font'), 'y': float(kv['y']) if 'y' in kv else None}


def render_line(L, W, H, A):
    """The line as an RGBA image fitted to --width of the frame, condensed; returns (image, height)."""
    path = L['font'] or A.font or next(f for f in FONTS if os.path.exists(f))
    big = 420
    font = ImageFont.truetype(path, big, index=A.font_index)
    x0, y0, x1, y1 = font.getbbox(L['text'])
    im = Image.new('L', (x1 - x0 + 40, y1 - y0 + 40), 0); ImageDraw.Draw(im).text((20 - x0, 20 - y0), L['text'], font=font, fill=255)
    im = im.crop(im.getbbox())
    im = im.resize((max(1, int(im.width * A.condense)), im.height), Image.LANCZOS)              # the tall editorial squeeze
    target_w = W * A.width * L['size']; s = target_w / im.width
    im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)
    rgba = Image.new('RGBA', im.size, L['rgb'] + (0,)); rgba.putalpha(im)
    return rgba


def masks_for(frames_dir, work, mode):
    if not os.path.exists(MASKER):
        sys.exit(f'build the masker first: swiftc -O "{HERE}/personmask.swift" -o "{MASKER}"')
    out = os.path.join(work, 'masks'); subprocess.run([MASKER, frames_dir, out, '--mode', mode], check=True)
    return out


def smooth_masks(paths):
    """Temporal 1-2-1 smoothing (no flicker at the hairline) + a 1.5 px feather."""
    M = [np.asarray(Image.open(p).convert('L'), np.float32) / 255 for p in paths]
    out = []
    for i in range(len(M)):
        a, b, c = M[max(0, i - 1)], M[i], M[min(len(M) - 1, i + 1)]
        m = 0.25 * a + 0.5 * b + 0.25 * c
        m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5)), np.float32) / 255
        out.append(np.clip((m - 0.08) / 0.84, 0, 1))                                            # tighten the soft edge a touch
    return out


def composite(frame_paths, mask_paths, times, A):
    """Writes each processed frame over its own path. times[i] = seconds since --at for frame i."""
    W, H = Image.open(frame_paths[0]).size
    lines = [parse_line(s, i, A.stagger) for i, s in enumerate(A.text)]
    imgs = [render_line(L, W, H, A) for L in lines]
    gap = 0.06 * imgs[0].height; total = sum(im.height for im in imgs) + gap * (len(imgs) - 1)
    ys, y = [], A.y * H - total / 2
    for L, im in zip(lines, imgs):
        ys.append(L['y'] * H - im.height / 2 if L['y'] is not None else y); y += im.height + gap
    mats = smooth_masks(mask_paths)
    end = A.dur
    for fp, m, t in zip(frame_paths, mats, times):
        fr = np.asarray(Image.open(fp).convert('RGB'), np.float32)
        on = ease_in_out(t / 0.25) * (1 - ease_in_out((t - (end - A.out_t)) / A.out_t))           # background grade envelope
        lum = fr @ np.array([0.299, 0.587, 0.114], np.float32)
        bg = fr * (1 - A.desat * on) + lum[..., None] * (A.desat * on)
        bg = bg * (1 - (1 - A.dim) * on)
        canvas = Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8)).convert('RGBA')
        for L, im, y0 in zip(lines, imgs, ys):
            u = (t - L['t']) / A.in_t
            if u <= 0: continue
            k = ease_out(u); out_k = ease_in_out((t - (end - A.out_t)) / A.out_t)
            op = k * (1 - out_k)
            if op <= 0.004: continue
            hold = max(0.0, t - L['t'] - A.in_t) / max(0.01, end - L['t'])
            sc = (1.06 - 0.06 * k) * (1 + 0.025 * hold)                                            # settles, then a slow push
            dy = (1 - k) * 0.10 * im.height - out_k * 0.04 * im.height
            w2, h2 = int(im.width * sc), int(im.height * sc)
            li = im.resize((w2, h2), Image.BICUBIC)
            if op < 1: a = li.getchannel('A').point(lambda v: int(v * op)); li.putalpha(a)
            canvas.alpha_composite(li, (int(W / 2 - w2 / 2), int(y0 + im.height / 2 - h2 / 2 + dy)))
        txt = np.asarray(canvas.convert('RGB'), np.float32)
        res = txt * (1 - m[..., None]) + fr * m[..., None]                                        # the person goes back on top
        Image.fromarray(np.clip(res, 0, 255).astype(np.uint8)).save(fp, quality=95)


def run_frames(A):
    files = sorted(glob.glob(os.path.join(A.frames, '*.jpg')) + glob.glob(os.path.join(A.frames, '*.png')))
    i0, i1 = int(round(A.at * A.fps)), int(round((A.at + A.dur) * A.fps))
    sel = files[i0:i1 + 1]
    if not sel: sys.exit('no frames in that window')
    bak = os.path.join(A.frames, '_orig'); os.makedirs(bak, exist_ok=True)
    for f in sel:
        b = os.path.join(bak, os.path.basename(f))
        if os.path.exists(b): shutil.copy2(b, f)                                                   # re-runs start from the original
        else: shutil.copy2(f, b)
    with tempfile.TemporaryDirectory() as work:
        src = os.path.join(work, 'src'); os.makedirs(src)
        for f in sel: shutil.copy2(f, src)
        md = masks_for(src, work, A.mode)
        mp = [os.path.join(md, os.path.splitext(os.path.basename(f))[0] + '.png') for f in sel]
        composite(sel, mp, [(i0 + j) / A.fps - A.at for j in range(len(sel))], A)
    print(f'{len(sel)} frames done in {A.frames} (originals in _orig/)')


def run_video(A):
    probe = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate,width,height',
                                       '-of', 'json', A.video], capture_output=True, text=True).stdout)['streams'][0]
    num, den = map(int, probe['r_frame_rate'].split('/')); fps = num / den
    with tempfile.TemporaryDirectory() as work:
        fdir = os.path.join(work, 'f'); os.makedirs(fdir)
        subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{A.at:.3f}', '-i', A.video, '-t', f'{A.dur:.3f}', '-q:v', '2', '-start_number', '0',
                        os.path.join(fdir, '%05d.jpg')], check=True)
        sel = sorted(glob.glob(os.path.join(fdir, '*.jpg')))
        md = masks_for(fdir, work, A.mode)
        composite(sel, [os.path.join(md, os.path.basename(f)[:-4] + '.png') for f in sel], [j / fps for j in range(len(sel))], A)
        clip = os.path.join(work, 'clip.mp4')
        subprocess.run(['ffmpeg', '-v', 'error', '-framerate', f'{num}/{den}', '-i', os.path.join(fdir, '%05d.jpg'), '-c:v', 'libx264',
                        '-crf', '14', '-pix_fmt', 'yuv420p', clip], check=True)
        fc = f"[1:v]setpts=PTS-STARTPTS+{A.at:.4f}/TB[w];[0:v][w]overlay=eof_action=pass:enable='between(t,{A.at:.4f},{A.at + A.dur - 0.5 / fps:.4f})'[v]"
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', A.video, '-i', clip, '-filter_complex', fc, '-map', '[v]', '-map', '0:a?',
                        '-c:v', 'libx264', '-crf', '15', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', A.out], check=True)
    print(f'wrote {A.out} (text behind from {A.at:.2f} s for {A.dur:.2f} s, {len(sel)} frames)')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True); g.add_argument('--video'); g.add_argument('--frames')
    ap.add_argument('--out'); ap.add_argument('--fps', type=float, default=30)
    ap.add_argument('--at', type=float, required=True); ap.add_argument('--dur', type=float, default=2.0)
    ap.add_argument('--text', action='append', required=True)
    ap.add_argument('--y', type=float, default=0.24); ap.add_argument('--width', type=float, default=0.96)
    ap.add_argument('--condense', type=float, default=0.6); ap.add_argument('--font'); ap.add_argument('--font-index', type=int, default=2)
    ap.add_argument('--dim', type=float, default=0.42); ap.add_argument('--desat', type=float, default=0.35)
    ap.add_argument('--mode', default='person', choices=['person', 'subject'])
    ap.add_argument('--stagger', type=float, default=0.35); ap.add_argument('--in', dest='in_t', type=float, default=0.38)
    ap.add_argument('--out-time', dest='out_t', type=float, default=0.30)
    A = ap.parse_args()
    if A.video and not A.out: sys.exit('--out is required with --video')
    run_video(A) if A.video else run_frames(A)
