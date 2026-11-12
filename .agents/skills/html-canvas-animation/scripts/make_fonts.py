"""Build film/fonts.js: Apple's SF Pro (SFP), SF Mono (SFM) and New York (NY, roman + italic) from THIS Mac's
/System/Library/Fonts, subset to Latin + punctuation + a few symbols, base64-inlined (a linked font file does not load
from file://, and naming "SF Pro" in canvas silently falls back). Apple's fonts are never committed: every film builds
its own copy.   usage: python make_fonts.py OUT_DIR/fonts.js"""
import base64, io, sys, os
from fontTools import subset
from fontTools.ttLib import TTFont
SRC = [("SFP", "/System/Library/Fonts/SFNS.ttf", "normal"), ("SFM", "/System/Library/Fonts/SFNSMono.ttf", "normal"),
       ("NY", "/System/Library/Fonts/NewYork.ttf", "normal"), ("NY", "/System/Library/Fonts/NewYorkItalic.ttf", "italic")]
UNI = list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + list(range(0x2010, 0x2028)) + list(range(0x2030, 0x203B)) + \
      [0x2022, 0x2026, 0x2190, 0x2191, 0x2192, 0x2193, 0x2212, 0x00D7, 0x00B0, 0x2248, 0x2260, 0x2264, 0x2265, 0x20AC, 0x2122, 0x2713, 0x2715, 0x25CF, 0x2665]
out = sys.argv[1] if len(sys.argv) > 1 else "film/fonts.js"
parts = []
for fam, path, style in SRC:
    if not os.path.exists(path): sys.exit(f"missing {path} (macOS system font)")
    f = TTFont(path); opt = subset.Options(); opt.layout_features = ["*"]; opt.name_IDs = ["*"]; opt.notdef_outline = True; opt.glyph_names = False
    s = subset.Subsetter(opt); s.populate(unicodes=UNI); s.subset(f); buf = io.BytesIO(); f.save(buf)
    parts.append(f"L.push(new FontFace('{fam}',d('{base64.b64encode(buf.getvalue()).decode()}'),{{weight:'100 900',style:'{style}'}}));")
js = "window.FONTS_READY=(async()=>{const d=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer;const L=[];\n" + "\n".join(parts) + \
     "\nfor(const f of L){await f.load();document.fonts.add(f);}return true;})();\n"
open(out, "w").write(js); print(f"wrote {out} ({len(js) // 1024} KB)")
