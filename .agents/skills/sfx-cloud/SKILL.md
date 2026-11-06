---
name: sfx-cloud
description: The user's sound-effects library lives in their private Cloudflare R2 bucket (Sonniss GDC bundles and any library added later), not on this Mac. Use this skill whenever a video needs sound effects from that library, to search it by meaning ("short glass break", "dark whoosh under 1 s"), to get sounds out of it, to let real-sfx pick from it, or to add a new sound pack to the cloud (unpack, describe every sound, upload, verify, remove the local copy). Also for "where are my sound effects", "upload these sounds", "add this pack", "sfx from cloudflare / R2".
---

# sfx-cloud: the sound library in Cloudflare R2

The sounds are in a **private** R2 bucket, read through rclone. Nothing about a sound is guessed at use time: every
sound was described when it went up (its own sidecar JSON, and one line in `catalog/catalog.jsonl`).

Command (installed by the VideoEditing repo's `setup.sh`): `sfx-cloud` (= `.agents/skills/sfx-cloud/scripts/sfx_cloud.py`
run with real-sfx's Python 3.12). Bucket `sfx-r2:soundeffects`, mount `~/Music/SFX/cloud`, read cache
`~/Library/Caches/sfx-cloud` (10 GB, oldest sounds dropped first).

## Use the library

```
sfx-cloud status                                 # connected? mounted? what is in the bucket
sfx-cloud mount                                  # ~/Music/SFX/cloud = the bucket, read-only; idempotent
sfx-cloud search glass shatter --max-dur 2       # by words; --role whoosh|hit|riser|click|... --collection C --json
sfx-cloud get "ID" --to downloads/my-video/sfx   # copy chosen sounds into a project (no mount needed)
```

- **Mount first** whenever another tool must read cloud sounds by path (real-sfx, earshot, ffmpeg). On the mount a
  sound is downloaded on its first read, then served from the cache. Listing folders downloads nothing.
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
  --source "Sonniss GDC 2027 Game Audio Bundle" --license "..." --license-url https://...
sfx-cloud link-real-sfx
sfx-cloud cleanup --collection sonniss-gdc-2027 --also ~/Downloads/Sonniss*2027*   # only after you report the verify
```

`ingest` unpacks into `~/Music/SFX/cloud-staging/sounds/<collection>/` (archives are checked for unsafe paths and
symlinks; a wrapping bundle folder is dropped), has a scratch copy of real-sfx measure and tag every sound, writes the
sidecars and the merged catalog, uploads everything with rclone (re-running resumes), and runs `rclone check`.
`cleanup` re-checks and only then moves the staging copy (and `--also` paths) to the **Trash**, never `rm`: say so,
and that emptying the Trash is the user's call. Long packs: run `ingest` in the background; it prints progress.

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
