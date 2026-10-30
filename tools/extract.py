#!/usr/bin/env python3
"""Extract text, structure (parts/chapters), and image inventory from the two APUSH PDFs."""
import json, re, sys
import pymupdf

FILES = [
    ("~/workspace/user/files/APUSH_pages_1-650__1_r610.pdf", 1),
    ("~/workspace/user/files/APUSH__pages_651-1220__0_whgv.pdf", 651),
]
OUT_DIR = sys.argv[1] if len(sys.argv) > 1 else "/home/hatch/workspace/apush-guesser/data"

import os
os.makedirs(OUT_DIR, exist_ok=True)

def expand(p):
    return os.path.expanduser(p)

def clean(t):
    return re.sub(r"\s+", " ", t).strip()

headings = []   # {book_page, text, level}
images = []     # {book_page, w, h, idx}

for path, base in FILES:
    doc = pymupdf.open(expand(path))
    n = doc.page_count
    print(f"{path}: {n} pages, base={base}", flush=True)
    with open(f"{OUT_DIR}/text_{base}.jsonl", "w", encoding="utf-8") as f:
        for i in range(n):
            book_page = base + i
            page = doc[i]
            text = page.get_text("text")
            f.write(json.dumps({"page": book_page, "text": text}, ensure_ascii=False) + "\n")
            # Headings: look at text blocks with large font
            try:
                d = page.get_text("dict")
            except Exception:
                d = None
            if d:
                for b in d.get("blocks", []):
                    for l in b.get("lines", []):
                        for s in l.get("spans", []):
                            sz = s.get("size", 0)
                            txt = clean(s.get("text", ""))
                            if not txt:
                                continue
                            if sz >= 20 and len(txt) < 120:
                                if re.match(r"^(PART|Part)\s+[IVX]+", txt) or re.match(r"^CHAPTER\s+\d+", txt, re.I) or re.match(r"^Chapter\s+\d+", txt):
                                    level = "part" if txt.upper().startswith("PART") else "chapter"
                                    headings.append({"page": book_page, "text": txt, "level": level})
            # Images
            for img_idx, img in enumerate(page.get_images(full=True)):
                xref = img[0]
                try:
                    pix = pymupdf.Pixmap(doc, xref)
                    w, h = pix.width, pix.height
                    pix = None
                except Exception:
                    w, h = img[2], img[3]
                if w >= 150 and h >= 150:
                    images.append({"page": book_page, "w": w, "h": h, "xref": xref})
    doc.close()

with open(f"{OUT_DIR}/headings.json", "w", encoding="utf-8") as f:
    json.dump(headings, f, ensure_ascii=False, indent=1)
with open(f"{OUT_DIR}/images.json", "w", encoding="utf-8") as f:
    json.dump(images, f, ensure_ascii=False, indent=1)
print(f"headings: {len(headings)}, images>=150px: {len(images)}")
