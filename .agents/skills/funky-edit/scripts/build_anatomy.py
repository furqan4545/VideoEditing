#!/usr/bin/env python3
"""Turn the anatomy kit's two ES modules (kit3d/iso-kit.mjs, kit3d/lathe.mjs; MIT, see kit3d/LICENSE) into one classic
script a film page can load from file://  ->  window.ISO and window.LATHE.

    python3 scripts/build_anatomy.py OUT.js
"""
import re, sys
from pathlib import Path
KIT = Path(__file__).resolve().parents[1] / "kit3d"
def names(src):
    return re.findall(r"^export (?:const|function|let|class) ([A-Za-z_$][\w$]*)", src, re.M)
def body(src):
    src = re.sub(r"^import .*?;\s*$", "", src, flags=re.M)
    return re.sub(r"^export (const|function|let|class) ", r"\1 ", src, flags=re.M)
out = []
for fname, glob, head in (("iso-kit.mjs", "ISO", ""), ("lathe.mjs", "LATHE", "const { cameraOf, iso, pathOf } = window.ISO;\n")):
    src = (KIT / fname).read_text()
    imp = re.findall(r"^import \{([^}]*)\} from", src, re.M)
    if fname == "lathe.mjs" and [x.strip() for x in ",".join(imp).split(",") if x.strip()] != ["cameraOf", "iso", "pathOf"]:
        sys.exit("lathe.mjs imports changed: update build_anatomy.py")
    out.append(f"// {fname} (anatomy kit, MIT, Copyright (c) 2026 Ryan; licence: funky-edit/kit3d/LICENSE)\nwindow.{glob} = (function () {{\n{head}{body(src)}\nreturn {{ {', '.join(names(src))} }};\n}})();\n")
Path(sys.argv[1]).write_text("\n".join(out))
print("wrote", sys.argv[1])
