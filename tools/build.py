#!/usr/bin/env python3
"""Build game data files:
   1. data/topics_N.js from data/topics_raw_N.json
   2. extract one image per topic page -> assets/img/, attach with credit
   3. 考点清单.md (per-period topic list)
"""
import json, os, sys, base64
import pymupdf

ROOT = "/home/hatch/workspace/apush-guesser"
DATA = ROOT + "/data"
os.makedirs(DATA, exist_ok=True)

F1 = os.path.expanduser("~/workspace/user/files/APUSH_pages_1-650__1_r610.pdf")
F2 = os.path.expanduser("~/workspace/user/files/APUSH__pages_651-1220__0_whgv.pdf")

def doc_for(book_page):
    # book<=596 -> file1 (key=book+54 -> pdf idx book+53); else file2 (pdf idx book+54-651)
    if book_page <= 596:
        return (pymupdf.open(F1), book_page + 53, "f1")
    return (pymupdf.open(F2), book_page + 54 - 651, "f2")

# image inventory: key(book+54) -> list of (w*h, xref, w, h)
with open(DATA + "/images.json", encoding="utf-8") as f:
    inv = json.load(f)
by_page = {}
for im in inv:
    by_page.setdefault(im["page"], []).append(im)

all_topics = []
IMGS = {}   # key -> data URI (base64); embedded in data/images.js (UTF-8, pushable)
_docs = {}
def get_doc(book_page):
    tag = "f1" if book_page <= 596 else "f2"
    if tag not in _docs:
        _docs[tag] = (pymupdf.open(F1 if tag == "f1" else F2), tag)
    return _docs[tag]

def topic_image_key(book_page):
    """Render the largest image on the book page, downscaled, return IMGS key."""
    key = book_page + 54
    cands = by_page.get(key, [])
    if not cands:
        return None
    cands = sorted(cands, key=lambda x: -(x["w"] * x["h"]))
    doc, tag = get_doc(book_page)
    for c in cands:
        ck = f"{tag}_{c['xref']}"
        if ck in IMGS:
            return ck
        try:
            rects = page_rects(doc, book_page, c["xref"])
            if not rects:
                continue
            r = max(rects, key=lambda r: r.width * r.height)
            scale = min(1.0, 560 / max(r.width, r.height))
            mat = pymupdf.Matrix(scale, scale)
            pno = book_page + 53 if tag == "f1" else book_page + 54 - 651
            pix = doc[pno].get_pixmap(matrix=mat, clip=r)
            if pix.alpha or pix.colorspace not in (pymupdf.csGRAY, pymupdf.csRGB, pymupdf.csCMYK):
                pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
            jpg = pix.tobytes("jpg", jpg_quality=60)
            pix = None
            IMGS[ck] = "data:image/jpeg;base64," + base64.b64encode(jpg).decode("ascii")
            return ck
        except Exception as e:
            print(f"  img fail p{book_page} xref{c['xref']}: {e}")
            continue
    return None

def page_rects(doc, book_page, xref):
    tag = "f1" if book_page <= 596 else "f2"
    pno = book_page + 53 if tag == "f1" else book_page + 54 - 651
    return doc[pno].get_image_rects(xref)

counts = {}
for n in range(1, 10):
    with open(f"{DATA}/topics_raw_{n}.json", encoding="utf-8") as f:
        topics = json.load(f)
    for t in topics:
        pg = t.get("page")
        key = topic_image_key(pg) if isinstance(pg, int) else None
        if key:
            t["img"] = {"file": f"img:{key}",
                        "credit": f"图源：Henretta《America's History》第8版 p.{pg}"}
        elif "img" in t:
            del t["img"]
    all_topics.extend(topics)
    counts[n] = len(topics)
    js = "(window.APUSH_TOPICS=window.APUSH_TOPICS||{})[%d]=%s;" % (
        n, json.dumps(topics, ensure_ascii=False))
    with open(f"{DATA}/topics_{n}.js", "w", encoding="utf-8") as f:
        f.write(js)
    print(f"part{n}: {len(topics)} topics -> data/topics_{n}.js", flush=True)

for _d, _t in _docs.values():
    _d.close()

# split into ~1.5MB chunks so each push stays under request-size limits
import os as _os
keys = sorted(IMGS.keys())
chunks, cur, cur_size = [], {}, 0
for k in keys:
    s = len(IMGS[k])
    if cur and cur_size + s > 1500000:
        chunks.append(cur); cur, cur_size = {}, 0
    cur[k] = IMGS[k]; cur_size += s
if cur:
    chunks.append(cur)
# remove stale chunk files
for f in _os.listdir(DATA):
    if f.startswith("images_") and f.endswith(".js"):
        _os.remove(_os.path.join(DATA, f))
if _os.path.exists(f"{DATA}/images.js"):
    _os.remove(f"{DATA}/images.js")
for i, ch in enumerate(chunks, 1):
    with open(f"{DATA}/images_{i}.js", "w", encoding="utf-8") as f:
        f.write("window.APUSH_IMGS=Object.assign(window.APUSH_IMGS||{},"
                + json.dumps(ch, ensure_ascii=False) + ");"
                + ("window.APUSH_IMGS_LOADED=true;" if i == len(chunks) else ""))
    print(f"data/images_{i}.js: {len(ch)} images, "
          f"{_os.path.getsize(f'{DATA}/images_{i}.js')/1048576:.2f} MB")
with open(f"{DATA}/img_chunks.js", "w", encoding="utf-8") as f:
    f.write("window.APUSH_IMG_CHUNKS="
            + json.dumps([f"data/images_{i}.js" for i in range(1, len(chunks) + 1)])
            + ";")

with_img = sum(1 for t in all_topics if t.get("img"))
print(f"TOTAL topics: {len(all_topics)}, with images: {with_img}, unique images: {len(IMGS)}")

# 考点清单.md
periods = ["", "北美的变迁 1450–1700", "英属北美与大西洋世界 1660–1763",
           "革命与共和文化 1763–1820", "交叠的革命 1800–1860",
           "大陆国家的创建与维护 1844–1877", "工业化美国 1877–1917",
           "国内与全球挑战 1890–1945", "现代国家与自由主义时代 1945–1980",
           "全球资本主义 1980–至今"]
with open(ROOT + "/考点清单.md", "w", encoding="utf-8") as f:
    f.write("# APUSH Guesser 考点清单\n\n")
    f.write("全部考点来自 Henretta《America's History for the AP® Course》第 8 版教材原文，"
            "每条标注书页。共 %d 个考点。\n\n" % len(all_topics))
    for n in range(1, 10):
        ts = [t for t in all_topics if t["period"] == n]
        f.write(f"## Period {n} · {periods[n]}（{len(ts)} 个考点）\n\n")
        f.write("| # | 考点 | When | Who | 页 |\n|---|------|------|-----|----|\n")
        for t in ts:
            who = ", ".join(t.get("who", [])[:2])
            f.write(f"| {t['id']} | {t['topic_en']}（{t.get('topic_zh','')}） "
                    f"| {t.get('year_text','')} | {who} | p.{t.get('page','?')} |\n")
        f.write("\n")
print("考点清单.md written")
