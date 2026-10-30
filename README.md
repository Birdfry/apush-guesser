# APUSH Guesser · 美国历史猜谜

Interactive APUSH quiz game. All questions are generated from a topic bank extracted
**strictly from** Henretta *America's History for the AP® Course*, 8th edition
(the player's own textbook PDFs). Every topic cites the book page it came from.

## Play

Open `index.html` in a browser (or serve this folder with any static server).
No build step, no dependencies.

- **Period menu** — 9 APUSH periods (the book's own 9 Parts), each with its topic count and your accuracy.
- **Modes** — 🎲 混合 Mixed · 📅 猜 When (year / which-first / source dating) ·
  🧑 猜 Who (people & groups / source authorship) · 💡 猜 Why (causes / significance / key terms).
- **Formats** — multiple choice (distractors drawn only from the same period, never invented)
  and fill-in-the-blank (year ±1 accepted; names accept last name).
- **Unlimited questions** — templates × topics × shuffled distractors; a 40-question
  sliding window avoids immediate repeats, so rounds never run out.
- **Feedback** — every answer gets an explanation plus the textbook page citation.
- **错题本** — wrong answers are saved locally; re-drill them per period.
- **📚 考点一览** — browse every topic in the bank with When / Who / Why and page refs.
- Progress (score, streak, accuracy, wrong list) persists in `localStorage`.

## Images

- In-PDF images are extracted from the textbook and credited
  `图源：Henretta《America's History》第8版 p.X`.
- Images are embedded as base64 data URIs in `data/images.js` (keeps the repo
  binary-free) and lazy-loaded the first time a 🖼️ / 🎲 mode starts.
- External images (if any) carry their source credit in the topic data.

## Files

| Path | What |
|---|---|
| `index.html` | Game shell + styles |
| `js/engine.js` | Question generator + game logic |
| `data/periods.js` | The 9 periods |
| `data/topics_1.js` … `topics_9.js` | Topic bank per period (generated) |
| `data/images.js` | Base64-embedded textbook images (generated, lazy-loaded) |
| `考点清单.md` | Human-readable list of all topics per period |
| `tools/` | Extraction / build scripts (not needed to play) |

## Rebuilding the topic bank

`tools/topic_spec.md` is the extraction spec used with the two textbook PDFs.
`tools/build.py` regenerates `data/topics_*.js`, `assets/img/` and `考点清单.md`
from `data/topics_raw_*.json`.
