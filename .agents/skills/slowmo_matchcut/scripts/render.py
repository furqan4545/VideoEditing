"""Render the Wasted visual loop or a cue-timed passage with new footage."""
import argparse
from bisect import bisect_right
import json
import math
from pathlib import Path
import re
import subprocess as sp
import tempfile
import sys

import cv2
import numpy as np

# Use the same EXIF and HEIC decoding as the photo match-cut skill.
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "match-cut" / "scripts"))
from picture import IMAGES, read_image

# Each knot maps a frame within the shot (30 distinct exposures/s) to elapsed
# source seconds. Rate changes are interpolated between those measured phases.
RAMPS = {
    "opening": [(0, 0), (19, .69), (37, 1.07), (61, 1.39), (74, 1.72)],
    "flash_hold": [(0, 0), (31, 0)],
    "silhouette": [(0, 0), (16, .20)],
    "profile": [(0, 0), (14, .14), (21, .27), (28, .52)],
    "gesture": [(0, 0), (13, .56), (17, .65), (36, .76),
                (41, .82), (58, 1.55), (73, 2.16)],
    "closing": [(0, 0), (5, .082), (24, .108), (74, .155)],
}
STROBE = ('dark', 'pale', 'pale', 'dark', 'pale', 'pale', 'horizon', 'dark',
          'pale', 'horizon', 'dark', 'pale', 'horizon', 'dark', 'pale', 'horizon', 'dark')
FRAMES = sum(knots[-1][0] + 1 for knots in RAMPS.values())
DURATION = FRAMES / 30
FULL = Path('/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg')
FFMPEG = str(FULL) if FULL.is_file() else 'ffmpeg'


def info(path):
    result = sp.check_output(['ffprobe', '-v', 'error', '-show_streams',
                              '-show_format', '-of', 'json', str(path)])
    return json.loads(result)


def eye_framing(crop, shape):
    # Coordinates use the upright source. Keep focal length constant within
    # the shot and translate the crop along the measured eye midpoint.
    w, h = shape
    fraction = float(crop['width'])
    points = np.asarray(crop['points'], dtype=float)
    target = np.asarray(crop.get('target', [.5, .40]), dtype=float)
    if (not 0 < fraction <= 1 or points.ndim != 2 or points.shape[1] != 3 or not len(points)
            or not np.isfinite(points).all() or points[0,0] != 0 or np.any(np.diff(points[:,0]) <= 0)
            or np.any((points[:,1:] < 0) | (points[:,1:] > 1)) or target.shape != (2,)
            or not np.all((target >= 0) & (target <= 1))):
        raise ValueError('Invalid eye crop or eye landmarks')
    def position(column):
        value = f'{points[0,column]:.7f}'
        for a, b in zip(points, points[1:]):
            delta = b[column]-a[column]
            value += f'+({delta:.7f})*clip((t-{a[0]:.6f})/{b[0]-a[0]:.6f},0,1)'
        return value
    width = f'min(iw*{fraction},ih*{w}/{h})'
    return [f"crop=w='{width}':h='ow*{h}/{w}':x='clip(iw*({position(1)})-ow*{target[0]},0,iw-ow)':"
            f"y='clip(ih*({position(2)})-oh*{target[1]},0,ih-oh)',scale={w}:{h}:flags=lanczos"]


def read_take(shot, path, shape, span, work):
    still = path.suffix.lower() in IMAGES
    start = 0. if still else float(shot['start'])
    if still:
        pixels = read_image(path)
        path = work / "upright-photo.png"
        if not cv2.imwrite(str(path), pixels):
            raise ValueError("Could not prepare the still image")
    focus = shot.get('focus', [.5, .5])
    magnification = float(shot.get('scale', 1))
    if start < 0 or magnification < 1 or len(focus) != 2 or not all(0 <= v <= 1 for v in focus):
        raise ValueError(f'Invalid start, focus or static crop for {path}')
    media = info(path)
    track = next((s for s in media['streams'] if s['codec_type'] == 'video'), None)
    if track is None:
        raise ValueError(f'No video in {path}')
    width, height = shape
    filters = []
    hdr = track.get('color_transfer') in ('arib-std-b67', 'smpte2084')
    if hdr and Path('/usr/bin/avconvert').is_file() and 'eye_crop' in shot:
        # Apple's conversion handles the display mapping and rotation metadata
        # of iPhone Dolby Vision/HLG portraits. Trim before converting.
        sdr = work/'source-sdr.mov'
        sp.run(['/usr/bin/avconvert', '--source', str(path), '--preset', 'Preset1920x1080',
                '--start', str(start), '--duration', str(span+.35), '--output', str(sdr),
                '--replace'], check=True, stdout=sp.DEVNULL)
        path, start = sdr, 0.
    elif hdr:
        filters += ['zscale=t=linear:npl=100', 'format=gbrpf32le', 'zscale=p=bt709',
                    'tonemap=tonemap=mobius:desat=1', 'zscale=t=bt709:m=bt709:r=limited', 'format=yuv420p']
    # FFmpeg autorotates first. Crop coordinates refer to that upright picture.
    if 'eye_crop' in shot:
        filters += eye_framing(shot['eye_crop'], shape)
    else:
        sw, sh = (int(math.ceil(value*magnification/2)*2) for value in shape)
        filters += [f'scale={sw}:{sh}:force_original_aspect_ratio=increase',
                    f"crop={width}:{height}:x='clip(iw*{focus[0]}-ow/2,0,iw-ow)':"
                    f"y='clip(ih*{focus[1]}-oh/2,0,ih-oh)'"]
    filters.append('setsar=1')
    if shot.get('flip'):
        filters.append('hflip')
    filters += ['format=bgr24', 'showinfo=checksum=0']
    cmd = [FFMPEG, '-hide_banner', '-nostats', '-loglevel', 'info', '-ss', str(start),
           '-i', str(path), '-t', str(span + .25), '-map', '0:v:0', '-vf',
           ','.join(filters), '-an', '-pix_fmt', 'bgr24', '-fps_mode', 'passthrough',
           '-f', 'rawvideo', '-']
    frames = []
    with tempfile.TemporaryFile() as log, sp.Popen(cmd, stdout=sp.PIPE, stderr=log) as proc:
        frame_bytes = width * height * 3
        while data := proc.stdout.read(frame_bytes):
            frames.append(np.frombuffer(data, np.uint8).reshape(height, width, 3))
        status = proc.wait()
        log.seek(0)
        messages = log.read().decode(errors='replace')
    if status:
        raise ValueError(f'Could not decode {path}: {messages[-1600:]}')
    # showinfo observes the filter graph before the output duration trim, which
    # can leave one additional timestamp after the last emitted raw frame.
    ts = [float(v) for v in re.findall(r'\bpts_time:\s*([\d.eE+-]+)', messages)][:len(frames)]
    if len(ts) != len(frames):
        raise ValueError(f'Could not recover source timestamps for {path}')
    if not ts or ts[-1]-ts[0] + .001 < span:
        raise ValueError(f'{path} has too little footage after {start:.3f}s for the selected ramp')
    return np.asarray(ts) - ts[0], frames


class Retime:
    """Use actual presentation timestamps, interpolate sub-frame motion on slow sections."""
    def __init__(self, times, frames):
        self.times, self.frames = times, frames
        h, w = frames[0].shape[:2]
        self.small = (min(448, w), max(8, round(h * min(448, w) / w)))
        self.grid = np.stack(np.meshgrid(np.arange(w, dtype=np.float32),
                                         np.arange(h, dtype=np.float32)), axis=-1)
        self.estimator = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_FAST)
        self.pair = None

    def at(self, t):
        i = max(0, bisect_right(self.times, t) - 1)
        if i + 1 == len(self.times):
            return self.frames[i]
        a, b = self.frames[i:i+2]
        f = float((t-self.times[i]) / (self.times[i+1]-self.times[i]))
        if f < .015 or f > .985:
            return a if f < .5 else b
        if self.pair != i:
            h, w = a.shape[:2]
            gray = [cv2.resize(cv2.cvtColor(im, cv2.COLOR_BGR2GRAY), self.small,
                               interpolation=cv2.INTER_AREA) for im in (a, b)]
            scale = np.array([w/self.small[0], h/self.small[1]], np.float32)
            self.fields = [cv2.resize(self.estimator.calc(x, y, None), (w, h))*scale
                           for x, y in (gray, gray[::-1])]
            self.pair = i
        left = cv2.remap(a, self.grid - f*self.fields[0], None, cv2.INTER_LINEAR,
                         borderMode=cv2.BORDER_REPLICATE)
        right = cv2.remap(b, self.grid - (1-f)*self.fields[1], None, cv2.INTER_LINEAR,
                          borderMode=cv2.BORDER_REPLICATE)
        return cv2.addWeighted(left, 1-f, right, f, 0)


def make_masks(frames, temp):
    tool = Path.home()/'.local/share/text-behind/personmask'
    if not tool.is_file():
        raise ValueError('The text-behind personmask tool is required. Run the workspace setup.sh.')
    inp, out = temp/'matte-input', temp/'matte-output'
    inp.mkdir()
    for i, frame in enumerate(frames):
        cv2.imwrite(str(inp/f'{i:02}.jpg'), frame)
    sp.run([str(tool), str(inp), str(out), '--quality', 'accurate'], check=True, stdout=sp.DEVNULL)
    result = []
    for i in range(len(frames)):
        mask = cv2.imread(str(out/f'{i:02}.png'), cv2.IMREAD_GRAYSCALE)
        if mask is None or not .008 < np.mean(mask > 128) < .99:
            raise ValueError(f'No usable foreground in {temp.name}. Choose a clearer person or '
                             'supply a custom matte for that shot.')
        result.append(cv2.GaussianBlur(mask, (0, 0), 1.1).astype(np.float32)[:, :, None]/255)
    return result


def clip8(frame):
    return np.clip(frame, 0, 255).astype(np.uint8)


def bloom(frame, strength):
    small = cv2.resize(np.maximum(frame-145., 0), None, fx=.25, fy=.25,
                       interpolation=cv2.INTER_AREA)
    glow = cv2.GaussianBlur(small, (0, 0), max(1, frame.shape[1]/280.))
    return frame + strength*cv2.resize(glow, (frame.shape[1], frame.shape[0]))


def style(role, k, image, mask, x, y):
    rgb = image.astype(np.float32)  # BGR throughout, including the lighting vectors
    lum = cv2.cvtColor(rgb, cv2.COLOR_BGR2GRAY)[:, :, None]
    if role == 'opening':
        return clip8((rgb*.82+lum*.18)*[.97,.85,.83]+[7,3,5])
    if role == 'flash_hold':
        if k == 0:
            return clip8((1-mask)*[247,250,243]+mask*(lum*.45+[15,10,13]))
        if k == 1:
            return np.full_like(image, 251)
        portrait = (rgb*.16+lum*.84)*(.53+mask*.77)+[10,3,3]
        falloff = (1., .63, .37, .22, .12, .06)
        flash = falloff[k-2] if k-2 < len(falloff) else 0.
        return clip8(bloom(portrait+mask*(110*flash), 1.1+2.5*flash))
    if role == 'silhouette':
        mode = STROBE[k]
        if mode == 'dark':
            return clip8((1-mask)*(18+8*(1-y))*[1.22,.85,.80]+mask*(lum*.038+[9,5,6]))
        if mode == 'pale':
            return clip8((1-mask)*[244,249,237]+mask*(lum*.46+[56,44,30]))
        sky = np.clip((.62-y)/.18, 0, 1)
        return clip8((1-mask)*(sky*[220,217,192]+[20,16,15])+mask*(lum*.16+[22,17,15]))
    if role == 'profile':
        return clip8(bloom(rgb*[1.23,.75,.94]+lum*[.05,0,.055]+[13,0,6], .68))
    if role == 'gesture':
        # A warm flare collects over the slow part of the gesture. A cooler
        # diagonal light replaces it as the movement releases.
        warm = np.interp(k, [0,7,15,36,44,52,73], [0,.26,1,1,.68,.08,0])
        cool = np.interp(k, [0,39,52,61,73], [0,0,.96,.52,.16])
        origin = .83 - .025*k/74
        spill = np.exp(-((x-origin)**2/.1 + (y-.11)**2/.18))
        streak = np.exp(-((y+.62*(x-origin)-.12)/.016)**2)*np.exp(-abs(x-origin)*3)
        light = (spill*.65+streak*.48)*(warm*np.array([65,130,255])+cool*np.array([184,164,83]))
        # Projector light and similar cyan practicals need to turn with the
        # flare on the warm exposure, even when baked into the user's shot.
        cyan = np.clip((np.minimum(rgb[:,:,0], rgb[:,:,1])-rgb[:,:,2])/88, 0, 1)[:,:,None]
        strength = warm*(.48+.45*cyan)
        amber = lum*[.55,.95,1.42]+[3,1,13]
        lit = rgb*(1-strength)+amber*strength
        gain = [.84+.12*cool, .87+.06*warm, 1.02+.13*warm]
        return clip8(bloom(lit*gain+light, .85))
    reveal = np.interp(k, [0,5,18,74], [1,.58,.32,.12])
    pool = np.exp(-(((x-.52)/.34)**2 + ((y-.48)/.65)**2))
    practicals = np.clip((lum-185)/65, 0, 1)
    exposure = .48+.52*pool+.20*(1-pool)*practicals
    portrait = ((rgb*.59+lum*.41)*[1.06,1.22,.79]+[10,8,2]+lum*[.10,.09,.025]*reveal)
    return clip8(bloom(portrait*exposure, 1.08))


def load_mask(file, shape):
    mask = cv2.imread(str(file), cv2.IMREAD_GRAYSCALE)
    if mask is None:
        raise ValueError(f'Cannot read matte {file}')
    return cv2.resize(mask, shape).astype(np.float32)[:, :, None]/255


def render_shot(role, shot, count, plan_dir, shape, work, encoder):
    knots = RAMPS[role]
    path = (plan_dir/shot['file']).resolve()
    native_span = knots[-1][1]
    span = float(shot.get('span', native_span))
    if path.suffix.lower() in IMAGES:
        span = 0.
    if not math.isfinite(span) or span < 0 or (not native_span and span):
        raise ValueError(f'Invalid source span for {role}')
    times, frames = read_take(shot, path, shape, span, work)
    sampler = Retime(times, frames)
    phase = np.linspace(0, knots[-1][0], count)
    timeline = np.interp(phase, *zip(*knots))
    if native_span:
        timeline *= span/native_span
    masks = None
    if role in ('flash_hold', 'silhouette'):
        if 'matte' in shot:
            masks = [load_mask(plan_dir/shot['matte'], shape)]*count
        else:
            temp = Path(tempfile.mkdtemp(prefix=role+'-', dir=work))
            samples = [sampler.at(t) for t in np.unique(timeline)]
            masks = make_masks(samples, temp)
            if len(masks) == 1:
                masks *= count
    w, h = shape
    x = np.linspace(0, 1, w, dtype=np.float32)[None, :, None]
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    for k, t in enumerate(timeline):
        # Keep the one-exposure white flash and the strobe cadence on their
        # original clock even when a musical phrase changes the shot length.
        exposure = min(k, knots[-1][0]) if role in ('flash_hold', 'silhouette') else round(phase[k])
        styled = style(role, exposure, sampler.at(t), masks[k] if masks else None, x, y)
        encoder.stdin.write(styled.tobytes())


def read_plan(plan):
    if not isinstance(plan, dict):
        raise ValueError('The shot plan must be a JSON object')
    if 'shots' not in plan:
        if plan.keys() != RAMPS.keys():
            raise ValueError('The default plan needs the six roles: '+', '.join(RAMPS))
        return DURATION, [(role, plan[role], knots[-1][0]+1) for role, knots in RAMPS.items()]

    shots = plan['shots']
    if not isinstance(shots, list) or not shots:
        raise ValueError('Supply a nonempty list of shots with music cues')
    start = float(shots[0]['at'])
    seconds = [float(shot['at']) for shot in shots] + [float(plan['audio_end'])]
    if not all(math.isfinite(t) and t >= 0 for t in seconds):
        raise ValueError('Music cue times must be finite, nonnegative seconds')
    boundaries = [round((t-start)*30) for t in seconds]
    edit = []
    for i, shot in enumerate(shots):
        count = boundaries[i+1]-boundaries[i]
        if shot['role'] not in RAMPS or count < 1:
            raise ValueError(f'Invalid role or cue duration at {seconds[i]}s')
        edit.append((shot['role'], shot, count))
    return start, edit


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan', required=True, type=Path, help='six-role JSON or a list of shots with music cues')
    parser.add_argument('--reference', required=True, type=Path, help='the original reference with audio')
    parser.add_argument('--audio-start', type=float, help='override the soundtrack in-point in seconds')
    parser.add_argument('--size', default='1280x720')
    parser.add_argument('-o', '--output', type=Path, required=True)
    args = parser.parse_args()
    w, h = map(int, args.size.lower().split('x'))
    if min(w, h) < 64 or w%2 or h%2:
        parser.error('size must be even, at least 64 pixels in each dimension')
    try:
        plan = json.loads(args.plan.read_text())
        start, edit = read_plan(plan)
    except (KeyError, TypeError, ValueError) as exc:
        parser.error(str(exc))
    audio_start = start if args.audio_start is None else args.audio_start
    frame_count = sum(count for _, _, count in edit)
    duration = frame_count/30
    audio = next((t for t in info(args.reference)['streams'] if t['codec_type'] == 'audio'), None)
    if not audio or not math.isfinite(audio_start) or audio_start < 0:
        parser.error('supply a reference with audio and a nonnegative audio start')
    size = (w, h)
    sources = [(args.plan.parent/shot['file']).resolve() for _, shot, _ in edit]
    if 'media_root' in plan:
        root = (args.plan.parent/plan['media_root']).resolve()
        if not all(path.is_relative_to(root) for path in sources):
            parser.error(f'All picture sources must be inside {root}')
    if args.output.resolve() in [*sources, args.reference.resolve(), args.plan.resolve()]:
        parser.error('choose an output path separate from the sources')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    cv2.setNumThreads(3)
    with tempfile.TemporaryDirectory(dir=args.output.parent) as tmp:
        work = Path(tmp)
        picture, sound, final = work/'picture.mp4', work/'sound.wav', work/'edit.mp4'
        samples = frame_count*1600
        first = round(audio_start*48000)
        trim = f'aresample=48000,atrim=start_sample={first}:end_sample={first+samples},asetpts=N/SR/TB'
        sp.run([FFMPEG, '-v', 'error', '-i', str(args.reference), '-map', '0:a:0', '-af', trim,
                '-c:a', 'pcm_f32le', str(sound)], check=True)
        actual = int(info(sound)['streams'][0]['duration_ts'])
        if actual != samples:
            raise ValueError(f'The reference supplied {actual} audio samples. The edit needs {samples}.')
        cmd = [FFMPEG, '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{w}x{h}',
               '-r', '30', '-i', '-', '-an', '-vf', 'fps=60,scale=out_color_matrix=bt709,format=yuv420p',
               '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-colorspace', 'bt709',
               '-color_trc', 'bt709', '-color_primaries', 'bt709', str(picture)]
        with sp.Popen(cmd, stdin=sp.PIPE) as encoder:
            try:
                for role, shot, count in edit:
                    print(f'Rendering {role}', flush=True)
                    render_shot(role, shot, count, args.plan.resolve().parent, size, work, encoder)
            finally:
                encoder.stdin.close()
            if encoder.wait():
                raise RuntimeError('Picture encoding failed')
        sp.run([FFMPEG, '-v', 'error', '-i', str(picture), '-i', str(sound), '-map', '0:v:0',
                '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k',
                '-movflags', '+faststart', str(final)], check=True)
        tracks = info(final)['streams']
        if (int(tracks[0]['nb_frames']) != frame_count*2 or
                abs(float(tracks[1]['duration']) - duration) > .002):
            raise ValueError('Encoded duration does not match the music cues')
        final.replace(args.output)
    print(args.output.resolve())


if __name__ == '__main__':
    main()
