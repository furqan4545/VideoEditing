---
name: sfx-cloud
description: The user's sound-effects library lives in their private Cloudflare R2 bucket (Sonniss GDC 2024 + 2026 real recordings, plus the earshot, CC0 and uisfx sets), not on this Mac. Use this skill WHILE EDITING any video whenever it needs a sound effect, ambience, foley, whoosh, hit, riser, UI sound or any other SFX - search the cloud library by meaning ("short glass break", "dark whoosh under 1 s", "crowd cheering"), get a readable file path on the fly and use it in ffmpeg, real-sfx, earshot or an editor. Also to let real-sfx pick from the cloud, or to add a new sound pack (unpack, describe every sound, upload, verify, remove the local copy). Triggers - "add a sound", "find a whoosh", "I need SFX", "where are my sound effects", "upload these sounds", "add this pack", "sfx from cloudflare / R2".
---

# sfx-cloud: the sound library in Cloudflare R2

The sounds are in a **private** R2 bucket, read through rclone. Nothing about a sound is guessed at use time: every
sound was described when it went up (its own sidecar JSON, and one line in `catalog/catalog.jsonl`).

Command (installed by the VideoEditing repo's `setup.sh`): `sfx-cloud` (= `.agents/skills/sfx-cloud/scripts/sfx_cloud.py`
run with real-sfx's Python 3.12). Bucket `sfx-r2:soundeffects`, mount `~/Music/SFX/cloud`, read cache
`~/Library/Caches/sfx-cloud` (10 GB, oldest sounds dropped first).

## While editing: a sound on the fly

```
sfx-cloud search glass shatter --max-dur 2       # mounts by itself; each hit prints its ID, description and PATH
sfx-cloud path "ID" ["ID" ...]                   # catalog ID -> a path any tool can read right now
ffmpeg -i "$(sfx-cloud path "ID")" ...           # use the path directly: it downloads on first read, then cached
sfx-cloud get "ID" --to downloads/my-video/sfx   # a copy inside the project (to hand over or keep with the edit)
sfx-cloud place film.mp4 --out downloads/film_sfx.mp4 --cue 1.20 "ID" --cue 3.40 "ID2" -6   # into the video
```

`place` puts each sound's start exactly on its time (optional gain in dB), mixes over the video's own audio (or makes
the audio track when there is none), copies the picture untouched, keeps the length, and limits the peaks. It is the
quick way for a few sounds; for a whole film's sound design (levels per role, peak anchors, ducking under voice,
critique) use `real-sfx`, which picks from the same cloud library.

1. Search with plain words for what the picture needs; narrow with `--role whoosh|hit|riser|click|pop|chime|ui|
   ambience|...`, `--max-dur` / `--min-dur`, `--collection`. `--json` gives every field (tags, levels, rate, licence,
   `local_path`) for scripts.
2. Shortlist 3-5, check them by measurement and with `earshot` (`earshot rank` / `describe` on the printed paths),
   place the winner, and name the timestamps the user should listen to. You cannot hear: never call a pick "good".
3. For a whole film, let `real-sfx` do the picking from the cloud (below).

Collections: `sonniss-gdc-2024`, `sonniss-gdc-2026` (real recordings, the main library), `sound-effects-cc0` (CC0
recordings), `earshot-sfx` (made in code), `uisfx` (synthesized UI sounds). Prefer the real recordings unless the user
wants the others. `sfx-cloud status` lists them with counts.

```
sfx-cloud status                                 # connected? mounted? what is in the bucket
sfx-cloud mount                                  # ~/Music/SFX/cloud = the bucket, read-only; idempotent
```

- **The mount** makes every tool read cloud sounds by path (real-sfx, earshot, ffmpeg). On the mount a sound is
  downloaded on its first read, then served from the cache. Listing folders downloads nothing. `search` and `path`
  mount by themselves; run `sfx-cloud mount` before using paths from somewhere else (a cue list, real-sfx).
- **Search output**: score, duration, role, ID, then the description (title from the file name or the recording's
  own embedded description, its library/folder, what real-sfx's listener hears in it, its measured character).
  `--json` adds everything: tags, levels, sample rate, channels, licence, `local_path` on the mount.
- **Choosing by ear is still the user's**: you cannot hear. Shortlist from the catalog, check candidates with `earshot`
  (`earshot rank / describe` on the mounted paths), and name the ones the user should listen to.

## real-sfx picks from the cloud

`sfx-cloud link-real-sfx` merges every cloud collection into real-sfx (index, listening tags, config) from the
snapshots in `catalog/real-sfx/`. It reads no audio: real-sfx then picks from the whole cloud library by its stored
measurements, and only the sounds it places are downloaded (through the mount) when it mixes. Run `sfx-cloud mount`
before any real-sfx command. Run `link-real-sfx` again after a new collection is ingested, or on a new Mac.

## Add a sound pack (ingest)

```
sfx-cloud ingest ZIP_OR_FOLDER [...] --collection sonniss-gdc-2027 \
  --source "Sonniss GDC 2027 Game Audio Bundle" --license "..." --license-url https://...   # [--no-real-sfx]
sfx-cloud upload --collection sonniss-gdc-2027    # only if the upload stopped: carries on, no re-measuring
sfx-cloud link-real-sfx
sfx-cloud cleanup --collection sonniss-gdc-2027 --also ~/Downloads/Sonniss*2027*   # only after you report the verify
```

`ingest` unpacks into `~/Music/SFX/cloud-staging/sounds/<collection>/` (archives are checked for unsafe paths and
symlinks; a wrapping bundle folder is dropped; Safari's auto-unzipped folders work as sources too), has a scratch copy
of real-sfx measure and tag every sound, reads the bundle's own `*Filelist.xlsx` (library, supplier, product page) and
UCS file-name codes, writes the sidecars and the catalog part, uploads with rclone (retries through dropped
connections for ~10 min), rebuilds `catalog/catalog.jsonl` and runs `rclone check`. `--no-real-sfx`: catalog only,
for code-made sounds or packs real-sfx already has. Run it in the background with `caffeinate -i -w <pid>` so the Mac
stays awake; a 30 GB bundle takes hours on a home uplink. Check a bundle is complete against its file list before
uploading. `cleanup` re-checks and only then moves the staging copy (and `--also` paths) to the **Trash**, never `rm`:
say so, and that emptying the Trash is the user's call.

## How fast (measured here, 7 Nov 2026)

`search` ~1.5 s. First read of a sound: a short one in 1-4 s, a long ambience starts in ~2 s (small chunks first),
then it is cached. real-sfx mixing a 3-cue clip from the cloud: ~5 s. A full walk of the mount (real-sfx
`setup.py check`, `build_index.py`) lists every folder: a minute or more, much longer while a big upload fills the
connection; picking and mixing never walk it.

## Licences: what may go in, and what must never happen

- Only add packs whose licence allows private storage for your own media production. Record it with `--license` and
  `--license-url`; it is copied into every sidecar.
- **Sonniss GDC bundles** (in the bucket now): royalty-free, no attribution, unlimited projects; licensed for media
  production only; **no redistribution as sound effects** (originals or edits) and **no AI/ML training**. So: the
  bucket stays private, never enable public access or an r2.dev URL, never hand out links or presigned URLs to the
  files, and never feed the library to anything that trains a model.
- Mixkit / Pixabay downloads stay out of the bucket (no redistribution, even private copies are a grey area); CC0
  sounds may go in.

## Setup on a new Mac

`./setup.sh` installs rclone and the `sfx-cloud` command. The R2 token is the user's to enter:
`scripts/r2-connect.sh` (dashboard: R2, Manage API tokens, Object Read & Write on `soundeffects`) stores it in
`~/.config/rclone/rclone.conf`. Never ask for the token in chat and never read that file. Then `sfx-cloud mount` and
`sfx-cloud link-real-sfx`.

## If something fails

- `remote NOT configured`: the user runs `scripts/r2-connect.sh`.
- `mount failed`: `~/Library/Logs/sfx-cloud.log`; the mount folder must be empty; `sfx-cloud unmount` then mount.
- A tool says a sound is missing: the mount is down (`sfx-cloud status`, then `sfx-cloud mount`).
- Cache too big: `sfx-cloud cache-clear` (or `SFX_CLOUD_CACHE_MAX=20G sfx-cloud mount` for a bigger one).
