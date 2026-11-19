# Reel 33: "Now your Claude can design icons" (the first funky edit)

85.2 s, 19 Nov 2026, about https://github.com/kubai087/kubai-icons. Code and texts only; no media.

| here | what |
|---|---|
| `script.md` | the approved bro-style script (the `insta_zoom_pw_story` shape, his own closing line) |
| `description.md`, `CREDITS.md` | the Instagram description and the credits as delivered |
| `vo/script.json` | the voice lines: spoken text, shown text, directions, gaps and pauses |
| `film/world.js` | studio, board and a third place: the wall of all 3,026 icons |
| `film/anat.js` | the folder as a 3D drawing: three pieces, a hinge, the fat outline, a colour block that splits into tones |
| `film/shots/` | the three acts (`10_open`, `20_board`, `30_close`) with every camera key, word block, label and meme |
| `film/timing.js` | the real word times of the delivered voice |
| `sound/mix.py` | its mixer: two music drops cut to the words, every effect mapped by its note |
| `tools/icons_svg.mjs`, `icons_png.py` | the real icons rendered with the library's own renderer into sprite sheets |
| `tools/webshots.py` | the three real pages on the monitor |
| `thumb/` | the thumbnail: icon shapes as 3D objects drawn with the 3D kit (it imports `iso-kit.mjs` and `lathe.mjs`, here in `../../kit3d/`) |

## Run it

```bash
.agents/skills/funky-edit/scripts/new_reel.sh downloads/reel33x/full
E=.agents/skills/funky-edit/examples/reel33; P=downloads/reel33x/full
cp $E/film/*.js $P/film/ && cp $E/film/shots/*.js $P/film/shots/ && cp $E/film/img/manifest.js $P/film/img/ && cp $E/tools/* $P/tools/
git clone --depth 1 https://github.com/kubai087/kubai-icons downloads/reel33x/research/kubai-icons
cd $P && mkdir -p work && node tools/icons_svg.mjs ../research/kubai-icons work/icons.json \
  && ~/.local/share/onetake/.venv/bin/python tools/icons_png.py work/icons.json film/img/ic      # sprite sheets + img/ic/manifest.js
~/.local/share/onetake/.venv/bin/python tools/webshots.py                                          # film/img/web/{github,site,site_home}.png
python3 tools/memes.py cool_dog="cool dog" doge=doge huh_cat="huh cat" cat_cook="cooking cat" smug_dog="smug dog" lazy_bed="lazy dog" side_eye="side eye dog" eepy="sleeping cat"
```

Checked on 19 Nov 2026: with those pictures in place the film plays on the skill's own `vox.js` and `comp.html`
unchanged. The paths inside `sound/mix.py` and `thumb/` are the original project's (`downloads/reel33/{full,cut,thumb,demo3d}`).
