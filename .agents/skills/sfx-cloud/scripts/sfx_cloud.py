#!/usr/bin/env python3
"""sfx-cloud: the sound-effects library in a private Cloudflare R2 bucket.

Layout of the bucket (default sfx-r2:soundeffects):
  sounds/<collection>/<path>.wav          the recordings, as they came
  sounds/<collection>/<path>.wav.json     what that sound is (one sidecar per sound)
  catalog/catalog.jsonl                   every sidecar, one per line (what `search` reads)
  catalog/real-sfx/<collection>.index.json        real-sfx measurements + tags, paths relative to the bucket root
  catalog/real-sfx/<collection>.embeddings.bin    real-sfx YAMNet embeddings (float32 x 1024 per path)
  catalog/real-sfx/<collection>.embeddings.json   their paths, relative to the bucket root

The bucket is mounted read-only at ~/Music/SFX/cloud (rclone nfsmount, no admin rights): every tool reads the
sounds as plain files; a sound is downloaded on first read and kept in a capped local cache.

  sfx-cloud status                        connection, mount, cache, collections
  sfx-cloud mount | unmount
  sfx-cloud search WORDS [--role R] [--max-dur S] [--min-dur S] [--collection C] [--limit N] [--json]
  sfx-cloud get ID [ID ...] --to DIR      copy sounds out of the bucket into DIR (no mount needed)
  sfx-cloud ingest SRC [SRC ...] --collection NAME --source TEXT --license TEXT [--license-url URL]
                                          SRC = zip files or folders; unpacks, describes, uploads, verifies
  sfx-cloud link-real-sfx                 make real-sfx pick from the cloud collections (no audio is downloaded)
  sfx-cloud cleanup --collection NAME     after a verified upload: move the local staging copy to the Trash
  sfx-cloud cache-clear                   empty the local read cache
"""
import argparse
import array
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import unicodedata
import zipfile
from pathlib import Path

HOME = Path.home()
REMOTE = os.environ.get("SFX_CLOUD_REMOTE", "sfx-r2")
BUCKET = os.environ.get("SFX_CLOUD_BUCKET", "soundeffects")
MOUNT = Path(os.environ.get("SFX_CLOUD_MOUNT", HOME / "Music/SFX/cloud"))
STAGING = Path(os.environ.get("SFX_CLOUD_STAGING", HOME / "Music/SFX/cloud-staging"))
CACHE = Path(os.environ.get("SFX_CLOUD_CACHE", HOME / "Library/Caches/sfx-cloud"))
CACHE_MAX = os.environ.get("SFX_CLOUD_CACHE_MAX", "10G")
LOG = HOME / "Library/Logs/sfx-cloud.log"
SKILLS = Path(__file__).resolve().parent.parent.parent          # .agents/skills
REAL_SFX = Path(os.environ.get("SFX_CLOUD_REAL_SFX", SKILLS / "real-sfx"))
RS_PY = REAL_SFX / "vendor/venv/bin/python"
FFMPEG_FULL = "/opt/homebrew/opt/ffmpeg-full/bin"
AUDIO_EXT = {".wav", ".aif", ".aiff", ".flac", ".mp3", ".ogg", ".m4a", ".caf", ".w64"}
JUNK = ("__MACOSX", ".DS_Store")
DIM = 1024


def rb(*path):
    return f"{REMOTE}:{BUCKET}" + ("/" + "/".join(path) if path else "")


def run(cmd, check=True, **kw):
    r = subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)
    if check and r.returncode:
        sys.exit(f"failed: {' '.join(map(str, cmd[:4]))} ...\n{r.stderr.strip()[-2000:]}")
    return r


def need_rclone():
    if not shutil.which("rclone"):
        sys.exit("rclone is missing: run the VideoEditing repo's ./setup.sh")
    if REMOTE + ":" not in run(["rclone", "listremotes"]).stdout.split():
        sys.exit(f"rclone has no '{REMOTE}' remote yet: run scripts/r2-connect.sh in the VideoEditing repo "
                 "(the user does this: it asks for the R2 token)")


# ------------------------------------------------------------------ mount
def mounted():
    out = run(["mount"], check=False).stdout
    return any(f" on {MOUNT} " in line or f" on {MOUNT.resolve()} " in line for line in out.splitlines())


def mount(quiet=False):
    need_rclone()
    if mounted():
        if not quiet:
            print(f"mounted: {MOUNT}")
        return
    MOUNT.mkdir(parents=True, exist_ok=True)
    if any(MOUNT.iterdir()):
        sys.exit(f"{MOUNT} is not empty; it must be an empty folder to mount the bucket on")
    (CACHE / "vfs").mkdir(parents=True, exist_ok=True)
    LOG.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["rclone", "nfsmount", rb(), str(MOUNT), "--read-only", "--vfs-cache-mode", "full",
           "--vfs-cache-max-size", CACHE_MAX, "--vfs-cache-max-age", "2160h", "--cache-dir", str(CACHE / "vfs"),
           "--dir-cache-time", "1h", "--daemon", "--daemon-wait", "20s", "--log-file", str(LOG),
           "--log-level", "NOTICE"]
    # the daemon keeps stdout/stderr open: never a pipe here, or this call waits forever
    r = subprocess.run(cmd, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if r.returncode or not mounted():
        tail = LOG.read_text(errors="replace").strip().splitlines()[-5:] if LOG.exists() else []
        sys.exit(f"mount failed (log {LOG}):\n" + "\n".join(tail))
    if not quiet:
        print(f"mounted: {rb()} -> {MOUNT} (read-only, cache {CACHE_MAX} in {CACHE / 'vfs'})")


def unmount():
    if not mounted():
        print("not mounted")
        return
    r = run(["umount", MOUNT], check=False)
    if r.returncode:
        run(["diskutil", "unmount", "force", MOUNT])
    print(f"unmounted {MOUNT}")


# ------------------------------------------------------------------ catalog
def read_catalog():
    """Every sidecar in the bucket, from the mount when it is there, else straight from R2."""
    p = MOUNT / "catalog/catalog.jsonl"
    if mounted() and p.exists():
        text = p.read_text(encoding="utf-8")
    else:
        need_rclone()
        r = run(["rclone", "cat", rb("catalog/catalog.jsonl")], check=False)
        text = r.stdout if r.returncode == 0 else ""
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def tokens(s):
    return [t for t in re.split(r"[^a-z0-9]+", str(s).lower()) if t]


def search(a):
    cat = read_catalog()
    if not cat:
        sys.exit("the catalog is empty (nothing ingested yet, or no connection)")
    q = tokens(" ".join(a.words))
    hits = []
    for r in cat:
        if a.collection and r.get("collection") != a.collection:
            continue
        if a.role and a.role not in (r.get("roles") or [r.get("role")]):
            continue
        d = r.get("duration") or 0
        if (a.max_dur and d > a.max_dur) or (a.min_dur and d < a.min_dur):
            continue
        fields = {"title": 3.0, "description": 2.0, "keywords": 2.0, "tags": 1.5, "role": 1.5, "roles": 1.0,
                  "library": 1.0, "words": 0.7}
        score = 0.0
        for f, w in fields.items():
            v = r.get(f)
            toks = set(tokens(" ".join(v) if isinstance(v, list) else (v or "")))
            score += w * sum(1 for t in q if t in toks or any(x.startswith(t) for x in toks if len(t) > 3))
        if q and score <= 0:
            continue
        hits.append((score, r))
    hits.sort(key=lambda x: (-x[0], x[1].get("duration") or 0))
    hits = hits[:a.limit]
    if a.json:
        print(json.dumps([dict(r, local_path=str(MOUNT / r["key"])) for _, r in hits], ensure_ascii=False, indent=1))
        return
    for s, r in hits:
        print(f"{s:5.1f}  {r.get('duration', 0):6.2f}s  {r.get('role', ''):9s} {r['id']}\n"
              f"        {r.get('description', '')[:150]}")
    print(f"\n{len(hits)} shown. Path on the mount: {MOUNT}/<key> (sfx-cloud mount), or sfx-cloud get ID --to DIR")


def get(a):
    need_rclone()
    out = Path(a.to)
    out.mkdir(parents=True, exist_ok=True)
    by_id = {r["id"]: r for r in read_catalog()}
    for i in a.ids:
        r = by_id.get(i)
        if not r:
            sys.exit(f"not in the catalog: {i}")
        dst = out / Path(r["key"]).name
        run(["rclone", "copyto", rb(r["key"]), dst])
        print(dst)


# ------------------------------------------------------------------ ingest
def safe_zip(z):
    """Reject archives that would write outside their folder or carry symlinks."""
    with zipfile.ZipFile(z) as zf:
        for info in zf.infolist():
            n = info.filename
            if n.startswith("/") or ".." in Path(n).parts or re.match(r"^[A-Za-z]:", n):
                sys.exit(f"{z}: unsafe path inside the archive: {n}")
            if stat.S_ISLNK(info.external_attr >> 16):
                sys.exit(f"{z}: symlink inside the archive: {n}")


def unpack(src, dest):
    """src = zip or folder -> its content inside dest (one wrapping top folder is dropped)."""
    src = Path(src)
    tmp = Path(tempfile.mkdtemp(prefix="sfxcloud_", dir=dest.parent))
    try:
        if src.is_dir():
            work = src
        else:
            safe_zip(src)
            run(["unzip", "-q", "-o", src, "-d", tmp])
            work = tmp
        for j in JUNK:
            for p in list(work.rglob(j)):
                (shutil.rmtree if p.is_dir() else os.remove)(p)
        kids = [p for p in work.iterdir() if not p.name.startswith(".")]
        # drop one wrapping folder only when it is the bundle itself, never a publisher's folder
        wrapper = (len(kids) == 1 and kids[0].is_dir()
                   and (re.search(r"sonniss|gdc|bundle", kids[0].name, re.I) or kids[0].name == src.stem))
        root = kids[0] if wrapper else work
        for p in root.iterdir():
            target = dest / p.name
            if target.exists():
                if p.is_dir():
                    shutil.copytree(p, target, dirs_exist_ok=True)
                else:
                    shutil.copy2(p, target)
            elif src.is_dir():
                shutil.copytree(p, target) if p.is_dir() else shutil.copy2(p, target)
            else:
                shutil.move(str(p), str(target))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def audio_files(root):
    return sorted(p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in AUDIO_EXT
                  and not p.name.startswith("._"))


def probe(p):
    r = run([shutil.which("ffprobe") or "ffprobe", "-v", "error", "-show_entries",
             "format=duration,size:format_tags:stream=sample_rate,channels,bits_per_raw_sample,bits_per_sample,"
             "codec_name", "-select_streams", "a:0", "-of", "json", p], check=False)
    try:
        d = json.loads(r.stdout or "{}")
    except json.JSONDecodeError:
        d = {}
    f, s = d.get("format", {}), (d.get("streams") or [{}])[0]
    tags = {k.lower(): str(v).strip() for k, v in (f.get("tags") or {}).items() if str(v).strip()}
    bits = s.get("bits_per_raw_sample") or s.get("bits_per_sample")
    return {"duration": round(float(f.get("duration") or 0), 3), "size_bytes": int(f.get("size") or p.stat().st_size),
            "sample_rate": int(s.get("sample_rate") or 0) or None, "channels": s.get("channels"),
            "bit_depth": int(bits) if bits and str(bits) != "0" else None, "codec": s.get("codec_name"),
            "embedded": tags}


UCS_HINT = re.compile(r"^[A-Z]{3,6}[A-Za-z]*_")
# Universal Category System top-level codes (the first word of a UCS file name, e.g. AEROJet_...): plain words
UCS = {
    "AERO": "aircraft", "AIR": "air", "ALRM": "alarm", "AMB": "ambience", "ANML": "animal", "ARCH": "archived",
    "BEEP": "beep", "BELL": "bell", "BIRD": "bird", "BOAT": "boat", "BLLT": "bullet", "BOOM": "boom explosion",
    "BUBL": "bubble", "CART": "cartoon", "CERM": "ceramic", "CHEM": "chemical", "CHOP": "chop", "CLOCK": "clock",
    "CLOK": "clock", "CLOTH": "cloth", "CLTH": "cloth", "COMM": "communication", "COMP": "computer",
    "CRSH": "crash", "CRWD": "crowd", "DEST": "destruction", "DIRT": "dirt", "DOOR": "door", "DRWR": "drawer",
    "DSGN": "designed", "EAT": "eating", "ELEC": "electricity", "EQUIP": "equipment", "EXPL": "explosion",
    "FARM": "farm", "FGHT": "fight", "FIRE": "fire", "FIRW": "fireworks", "FOLY": "foley", "FOOD": "food",
    "FEET": "footsteps", "FOOT": "footsteps", "GAME": "game", "GEAR": "gear", "GLAS": "glass", "GORE": "gore",
    "GUNS": "gun", "GUN": "gun", "HAIR": "hair", "HORN": "horn", "HUM": "hum", "ICE": "ice", "IMPT": "impact",
    "LASR": "laser", "LIQ": "liquid", "MACH": "machine", "MAGC": "magic", "MAGIC": "magic", "MECH": "mechanical",
    "METL": "metal", "MOTR": "motor", "MOVE": "movement", "MUSC": "music", "MUSIC": "music", "NATR": "nature",
    "NOIS": "noise", "OBJ": "object", "PAPR": "paper", "PLAS": "plastic", "POUR": "pour", "RAIN": "rain",
    "RBTX": "robot", "ROBO": "robot", "ROCK": "rock", "ROPE": "rope", "RUBR": "rubber", "SCFI": "sci-fi",
    "SCIF": "sci-fi", "SNOW": "snow", "SPRT": "sports", "SWSH": "swoosh whoosh", "SWTH": "switch",
    "TECH": "technology", "TELE": "telephone", "TOOL": "tool", "TOYS": "toy", "TOY": "toy", "TRAIN": "train",
    "TRAN": "transportation", "UI": "user interface", "USER": "user interface", "VEH": "vehicle", "VOX": "voice",
    "WATR": "water", "WEAP": "weapon", "WHSH": "whoosh", "WHOOSH": "whoosh", "WIND": "wind", "WNDW": "window",
    "WOOD": "wood", "WTHR": "weather", "ZAP": "zap",
}


def ucs_of(stem):
    """'AEROJet_Blast Off_...' -> ('AERO', 'Jet', 'aircraft jet'); not a UCS name -> (None, None, '')."""
    if not UCS_HINT.match(stem) or stem.count("_") < 2:
        return None, None, ""
    cat_id = stem.split("_")[0]
    m = re.match(r"^([A-Z]+?)([A-Z][a-z].*)?$", cat_id)
    cat, sub = (m.group(1), m.group(2) or "") if m else (cat_id, "")
    if cat not in UCS and cat[:-1] in UCS and not sub:      # 'WHSHX' style: drop a trailing letter
        cat = cat[:-1]
    sub_words = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", sub).lower()
    return cat, sub or None, " ".join(x for x in (UCS.get(cat, ""), sub_words) if x)


def read_filelists(root):
    """The bundle's own '... Filelist.xlsx' (FILENAME, LIBRARY NAME, SUPPLIER, URL) -> {file name: row}."""
    import xml.etree.ElementTree as ET
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    out = {}
    for x in root.glob("*ilelist*.xlsx"):
        try:
            z = zipfile.ZipFile(x)
            ss = ["".join(t.itertext()) for t in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", ns)] \
                if "xl/sharedStrings.xml" in z.namelist() else []
            sheet = sorted(n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml", n))[0]
            rows = []
            for r in ET.fromstring(z.read(sheet)).findall(".//m:row", ns):
                vals = []
                for c in r.findall("m:c", ns):
                    v = c.find("m:v", ns)
                    vals.append((ss[int(v.text)] if c.get("t") == "s" else v.text) if v is not None
                                else "".join(c.itertext()))
                rows.append(vals)
            head = [h.strip().lower() for h in rows[0]]
            for r in rows[1:]:
                d = dict(zip(head, r))
                if d.get("filename"):
                    out[unicodedata.normalize("NFC", d["filename"].strip())] = d
        except Exception as e:                          # a broken list only costs its extra words
            print(f"note: could not read {x.name}: {e}")
    return out


def describe_name(stem):
    """'WHSH_Fast Swish 03_LIB_Creator' -> 'Fast Swish 03' (UCS); other names: separators become spaces."""
    parts = stem.split("_")
    if UCS_HINT.match(stem) and len(parts) >= 3:
        text = parts[1]
    else:
        text = stem
    text = re.sub(r"[_\-]+", " ", text)
    text = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def build_record(p, rel, coll, a, rs, listed=None):
    info = probe(p)
    emb = info.pop("embedded")
    listed = listed or {}
    library = rel.parts[0] if len(rel.parts) > 1 else ""
    folders = " / ".join(rel.parts[1:-1])
    title = describe_name(p.stem)
    ucs_cat, ucs_sub, ucs_words = ucs_of(p.stem)
    said = emb.get("description") or emb.get("comment") or emb.get("title") or ""
    words = (rs or {}).get("words") or []
    tags = (rs or {}).get("tags") or []
    desc_bits = [(said or title) + (f" ({ucs_words})" if ucs_words else "")]
    if folders:
        desc_bits.append(f"in {folders}")
    if library:
        desc_bits.append(f"from {library}")
    if tags:
        desc_bits.append("heard as: " + ", ".join(tags[:3]))
    if words:
        desc_bits.append("character: " + ", ".join(words[:5]))
    key = f"sounds/{coll}/{rel.as_posix()}"
    rec = {
        "id": f"{coll}/{rel.as_posix()}", "key": key, "collection": coll, "library": library,
        "folder": folders, "file": p.name, "title": title, "description": "; ".join(desc_bits),
        "embedded_description": said or None,
        "ucs_category": ucs_cat, "ucs_subcategory": ucs_sub,
        "supplier": listed.get("supplier"), "library_name": listed.get("library name"),
        "product_url": listed.get("url"),
        "keywords": sorted(set(tokens(f"{title} {folders} {library} {said} {ucs_words} "
                                      f"{listed.get('library name', '')} {listed.get('supplier', '')}"))
                           - {"wav", "the", "and", "of"}),
        "role": (rs or {}).get("role"), "roles": (rs or {}).get("roles") or [], "tags": tags,
        "tag_scores": (rs or {}).get("tag_scores") or [], "words": words,
        **info,
        "peak_db": (rs or {}).get("peak_db"), "mean_db": (rs or {}).get("mean_db"),
        "attack_ms": (rs or {}).get("attack_ms"), "decay_ms": (rs or {}).get("decay_ms"),
        "source": a.source, "license": a.license, "license_url": a.license_url,
        "license_notes": a.license_notes, "embedded_tags": emb,
    }
    return rec


def real_sfx_scratch(root_lib, coll):
    """A throwaway copy of real-sfx that indexes only this collection (the real one stays untouched)."""
    if not RS_PY.exists():
        sys.exit(f"real-sfx is not set up ({RS_PY} missing): run ./setup.sh")
    tmp = Path(tempfile.mkdtemp(prefix="sfxcloud_rs_"))
    shutil.copytree(REAL_SFX / "scripts", tmp / "scripts")
    shutil.copytree(REAL_SFX / "references", tmp / "references")
    (tmp / "vendor").mkdir()
    for n in ("node_modules", "models", "venv", "package.json"):
        if (REAL_SFX / "vendor" / n).exists():
            os.symlink(REAL_SFX / "vendor" / n, tmp / "vendor" / n)
    shutil.copy2(REAL_SFX / "config.example.json", tmp / "config.json")
    env = dict(os.environ, PATH=f"{FFMPEG_FULL}:{os.environ.get('PATH', '')}", PYTHONUTF8="1",
               REAL_SFX_VENV_PYTHON=str(RS_PY))
    for cmd in (["setup.py", "add-library", coll.replace("-", "_"), root_lib, "--tier", "main", "--index"],
                ["listen.py", "tag-index"]):
        print(f"real-sfx {' '.join(cmd[:2])} ...", flush=True)
        r = subprocess.run([str(RS_PY), str(tmp / "scripts" / cmd[0])] + [str(c) for c in cmd[1:]], env=env,
                           cwd=str(tmp))
        if r.returncode:
            sys.exit(f"real-sfx {cmd[0]} failed")
    return tmp


def ingest(a):
    need_rclone()
    coll = re.sub(r"[^a-z0-9-]+", "-", a.collection.lower()).strip("-")
    root = STAGING / "sounds" / coll
    root.mkdir(parents=True, exist_ok=True)
    for s in a.src:
        print(f"unpacking {s} ...", flush=True)
        unpack(s, root)
    files = audio_files(root)
    if not files:
        sys.exit(f"no audio files in {root}")
    print(f"{len(files)} audio files, {sum(f.stat().st_size for f in files) / 1e9:.1f} GB", flush=True)

    tmp = real_sfx_scratch(root, coll)
    idx = json.loads((tmp / "library_index.json").read_text(encoding="utf-8"))
    rs_by_path = {unicodedata.normalize("NFC", s["path"]): s for s in idx["sounds"]}

    listed = read_filelists(root)
    print(f"describing every sound ... ({len(listed)} rows in the bundle's file list)", flush=True)
    recs = []
    for n, p in enumerate(files):
        rel = p.relative_to(root)
        rec = build_record(p, rel, coll, a, rs_by_path.get(unicodedata.normalize("NFC", str(p))),
                           listed.get(unicodedata.normalize("NFC", p.name)))
        Path(str(p) + ".json").write_text(json.dumps(rec, ensure_ascii=False, indent=1), encoding="utf-8")
        recs.append(rec)
        if n % 250 == 0:
            print(f"  {n}/{len(files)}", flush=True)

    # real-sfx snapshot with paths relative to the bucket root
    out = STAGING / "catalog" / "real-sfx"
    out.mkdir(parents=True, exist_ok=True)
    pre = str(STAGING) + "/"
    snap = {"collection": coll, "libraries": idx["libraries"], "sounds": []}
    for s in idx["sounds"]:
        s = dict(s, path=s["path"].replace(pre, "", 1))
        snap["sounds"].append(s)
    for lib in snap["libraries"]:
        lib["path"] = str(lib["path"]).replace(pre, "", 1)
    (out / f"{coll}.index.json").write_text(json.dumps(snap, ensure_ascii=False), encoding="utf-8")
    ej = tmp / "library_embeddings.json"
    if ej.exists():
        paths = [x.replace(pre, "", 1) for x in json.loads(ej.read_text(encoding="utf-8"))["paths"]]
        (out / f"{coll}.embeddings.json").write_text(json.dumps({"dim": DIM, "paths": paths}), encoding="utf-8")
        shutil.copy2(tmp / "library_embeddings.bin", out / f"{coll}.embeddings.bin")
    shutil.rmtree(tmp, ignore_errors=True)

    # merged catalog: the other collections from the bucket + this one
    others = [r for r in read_catalog() if r.get("collection") != coll]
    cat = STAGING / "catalog" / "catalog.jsonl"
    cat.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in others + recs), encoding="utf-8")

    print("uploading the sounds ...", flush=True)
    up = ["rclone", "copy", "--transfers", "8", "--checkers", "16", "--stats", "30s", "--stats-one-line", "-v"]
    if subprocess.run(up + [str(root), rb("sounds", coll)]).returncode:
        sys.exit("upload failed: run the same ingest again, rclone skips what is already there")
    print("uploading the catalog ...", flush=True)
    if subprocess.run(up + [str(STAGING / "catalog"), rb("catalog")]).returncode:
        sys.exit("catalog upload failed: run the same ingest again")
    verify(coll)


def verify(coll):
    root = STAGING / "sounds" / coll
    print(f"verifying {coll}: every local file must be in the bucket with the same size/hash ...", flush=True)
    r = subprocess.run(["rclone", "check", str(root), rb("sounds", coll), "--one-way"], capture_output=True,
                       text=True)
    tail = (r.stderr or "").strip().splitlines()[-4:]
    if r.returncode:
        sys.exit("verify FAILED, nothing will be cleaned up:\n" + "\n".join(tail))
    n = len(audio_files(root))
    (STAGING / f".verified-{coll}").write_text(json.dumps({"files": n}), encoding="utf-8")
    print(f"verified: 0 differences, all {n} sounds (and their sidecars) are in {rb('sounds', coll)}")


# ------------------------------------------------------------------ real-sfx
def link_real_sfx(a):
    """Merge the cloud collections into real-sfx's index, embeddings and config (no audio is read)."""
    mount(quiet=True)
    snaps = sorted((MOUNT / "catalog/real-sfx").glob("*.index.json"))
    if not snaps:
        sys.exit("no real-sfx snapshots in the bucket yet")
    idx_p, cfg_p = REAL_SFX / "library_index.json", REAL_SFX / "config.json"
    ej_p, eb_p = REAL_SFX / "library_embeddings.json", REAL_SFX / "library_embeddings.bin"
    idx = json.loads(idx_p.read_text(encoding="utf-8")) if idx_p.exists() else {"count": 0, "libraries": [],
                                                                                   "sounds": []}
    cfg = json.loads(cfg_p.read_text(encoding="utf-8"))
    paths, emb = [], array.array("f")
    if ej_p.exists() and eb_p.exists():
        paths = json.loads(ej_p.read_text(encoding="utf-8"))["paths"]
        emb.frombytes(eb_p.read_bytes())
    mroot = str(MOUNT) + "/"
    for sp in snaps:
        snap = json.loads(sp.read_text(encoding="utf-8"))
        names = {lib["name"] for lib in snap["libraries"]}
        idx["sounds"] = [s for s in idx["sounds"] if s.get("library") not in names]
        idx["libraries"] = [x for x in idx["libraries"] if x.get("name") not in names]
        for lib in snap["libraries"]:
            lib = dict(lib, path=mroot + lib["path"])
            idx["libraries"].append(lib)
            cfg["libraries"] = [x for x in cfg["libraries"] if x["name"] != lib["name"]]
            cfg["libraries"].append({"name": lib["name"], "path": lib["path"], "tier": lib.get("tier", "main")})
        idx["sounds"] += [dict(s, path=mroot + s["path"]) for s in snap["sounds"]]
        sj = sp.with_name(sp.name.replace(".index.json", ".embeddings.json"))
        sb = sp.with_name(sp.name.replace(".index.json", ".embeddings.bin"))
        if sj.exists() and sb.exists():
            new_paths = [mroot + x for x in json.loads(sj.read_text(encoding="utf-8"))["paths"]]
            fresh = set(new_paths)
            keep = [i for i, x in enumerate(paths) if x not in fresh]
            emb = array.array("f", [v for i in keep for v in emb[i * DIM:(i + 1) * DIM]])
            paths = [paths[i] for i in keep]
            e2 = array.array("f")
            e2.frombytes(sb.read_bytes())
            emb.extend(e2)
            paths += new_paths
        print(f"linked {', '.join(sorted(names))}: {len(snap['sounds'])} sounds")
    idx["count"] = len(idx["sounds"])
    idx_p.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")
    cfg_p.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    ej_p.write_text(json.dumps({"dim": DIM, "paths": paths}), encoding="utf-8")
    eb_p.write_bytes(emb.tobytes())
    print(f"real-sfx index: {idx['count']} sounds in {len(idx['libraries'])} libraries")


def cleanup(a):
    coll = a.collection
    mark = STAGING / f".verified-{coll}"
    root = STAGING / "sounds" / coll
    if not mark.exists():
        sys.exit(f"{coll} has not passed verify: nothing moved")
    verify(coll)                                     # once more, right before the local copy goes
    for p in [root] + [Path(x) for x in (a.also or [])]:
        if p.exists():
            run(["/usr/bin/trash", p] if Path("/usr/bin/trash").exists() else
                ["osascript", "-e", f'tell application "Finder" to delete POSIX file "{p}"'])
            print(f"moved to the Trash: {p}")
    mark.unlink()


def cache_clear(a):
    was = mounted()
    if was:
        unmount()
    shutil.rmtree(CACHE / "vfs", ignore_errors=True)
    print("read cache emptied")
    if was:
        mount()


def status(a):
    print(f"bucket : {rb()}")
    ok = shutil.which("rclone") and REMOTE + ":" in run(["rclone", "listremotes"], check=False).stdout.split()
    print(f"remote : {'configured' if ok else 'NOT configured (scripts/r2-connect.sh)'}")
    print(f"mount  : {'yes' if mounted() else 'no'}  {MOUNT}")
    c = CACHE / "vfs"
    size = sum(f.stat().st_size for f in c.rglob("*") if f.is_file()) if c.exists() else 0
    print(f"cache  : {size / 1e9:.2f} GB used of {CACHE_MAX}  ({c})")
    if ok:
        cat = read_catalog()
        by = {}
        for r in cat:
            by.setdefault(r.get("collection"), [0, 0])
            by[r.get("collection")][0] += 1
            by[r.get("collection")][1] += r.get("size_bytes") or 0
        for k, (n, b) in sorted(by.items()):
            print(f"  {k:24s} {n:6d} sounds  {b / 1e9:6.1f} GB")
        if not cat:
            print("  catalog empty")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("status")
    sub.add_parser("mount")
    sub.add_parser("unmount")
    s = sub.add_parser("search")
    s.add_argument("words", nargs="*")
    s.add_argument("--role")
    s.add_argument("--collection")
    s.add_argument("--max-dur", type=float)
    s.add_argument("--min-dur", type=float)
    s.add_argument("--limit", type=int, default=20)
    s.add_argument("--json", action="store_true")
    g = sub.add_parser("get")
    g.add_argument("ids", nargs="+")
    g.add_argument("--to", required=True)
    i = sub.add_parser("ingest")
    i.add_argument("src", nargs="+")
    i.add_argument("--collection", required=True)
    i.add_argument("--source", required=True)
    i.add_argument("--license", required=True)
    i.add_argument("--license-url")
    i.add_argument("--license-notes")
    sub.add_parser("link-real-sfx")
    c = sub.add_parser("cleanup")
    c.add_argument("--collection", required=True)
    c.add_argument("--also", nargs="*", help="more paths to move to the Trash after the check (e.g. the zips)")
    v = sub.add_parser("verify")
    v.add_argument("--collection", required=True)
    sub.add_parser("cache-clear")
    a = ap.parse_args()
    {"status": status, "mount": lambda _: mount(), "unmount": lambda _: unmount(), "search": search, "get": get,
     "ingest": ingest, "link-real-sfx": link_real_sfx, "cleanup": cleanup, "verify": lambda x: verify(x.collection),
     "cache-clear": cache_clear}[a.cmd](a)


if __name__ == "__main__":
    main()
