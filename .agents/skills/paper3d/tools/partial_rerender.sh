#!/bin/zsh
# Re-render only some time ranges of a finished film and splice them into the last render (the rest is kept as it is).
#   tools/partial_rerender.sh OLD_SILENT.mp4 NEW_TAG "13.0-35.9 40.9-46.6"      -> out/film_<NEW_TAG>_silent.mp4 and out/film_<NEW_TAG>.mp4 (with sound/mix.wav)
# Ranges in seconds, in order, not overlapping. Each range is rendered by tools/render_gpu.py (--t0/--t1) from a snapshot
# of film/, so you can keep editing while it runs. A whole film takes about 2.5 s of render per second of film anyway.
cd "$(dirname "$0")/.." && old="$1"; tag="$2"; ranges="$3"; d="out/$tag"; rm -rf "$d" "out/snap_$tag"; mkdir -p "$d" "out/snap_$tag"
[ -f "$old" ] || { echo "no such film: $old"; exit 1; }
(cd film && for f in *.js *.html assets shots; do [ -e "$f" ] && cp -R "$f" "../out/snap_$tag/"; done); for l in footage vendor img fonts; do [ -e "film/$l" ] && ln -s "$PWD/film/$l" "out/snap_$tag/$l"; done
PY=~/.local/share/onetake/.venv/bin/python; i=0
for r in ${=ranges}; do
  i=$((i + 1)); a=${r%-*}; b=${r#*-}
  $PY tools/render_gpu.py "out/snap_$tag/comp.html" --out "$d/part_$i.mp4" --t0 "$a" --t1 "$b" --crf 15 > "$d/render_$i.log" 2>&1 || { tail -4 "$d/render_$i.log"; exit 1; }
  grep "frames," "$d/render_$i.log" | cut -c1-120
done
$PY - "$old" "$d" "$ranges" "out/film_${tag}_silent.mp4" <<'PY' || exit 1
import subprocess, sys
old, d, ranges, out = sys.argv[1:5]; fps = 30
rs = [(round(float(a) * fps), round(float(b) * fps)) for a, b in (r.split("-") for r in ranges.split())]   # the frames render_gpu.py drew
assert all(f0 < f1 for f0, f1 in rs) and all(rs[k][1] <= rs[k + 1][0] for k in range(len(rs) - 1)), "ranges must be in order and not overlap"
N = int(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames",
                        "-of", "csv=p=0", old], capture_output=True, text=True, check=True).stdout.strip())
inputs, chains, parts, cur = ["-i", old], [], [], 0
def keep(f0, f1, name):
    chains.append(f"[0:v]trim=start_frame={f0}:end_frame={f1},setpts=PTS-STARTPTS[{name}]"); parts.append(f"[{name}]")
for i, (f0, f1) in enumerate(rs, 1):
    if f0 > cur: keep(cur, f0, f"o{i}")
    inputs += ["-i", f"{d}/part_{i}.mp4"]; parts.append(f"[{i}:v]"); cur = f1
if cur < N: keep(cur, N, "oend")
fc = ";".join(chains + ["".join(parts) + f"concat=n={len(parts)}:v=1:a=0[v]"])
subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", fc, "-map", "[v]", "-c:v", "libx264", "-preset", "medium", "-crf", "15",
                "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "5.2", "-movflags", "+faststart", out], check=True)
n = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", out],
                   capture_output=True, text=True).stdout.strip()
print(f"spliced {len(rs)} new range(s) into {old}: {n} frames (old film {N})")
PY
if [ -f sound/mix.wav ]; then
  ffmpeg -v error -y -i "out/film_${tag}_silent.mp4" -i sound/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart "out/film_${tag}.mp4" && ffprobe -v error -show_entries format=duration,size -of csv=p=0 "out/film_${tag}.mp4"
else
  echo "no sound/mix.wav: only out/film_${tag}_silent.mp4"
fi
