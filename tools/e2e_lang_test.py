#!/usr/bin/env python3
"""E2E: language picker + per-language full flow + switching."""
import sys, time, os
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8123/"
SHOTS = "/tmp/e2e_lang"
os.makedirs(SHOTS, exist_ok=True)
errors = []

def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    return cond

ok = True
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"console: {m.text}") if m.type == "error" else None)

    # fresh: language picker shows
    page.goto(URL, wait_until="networkidle"); time.sleep(0.8)
    ok &= check(page.locator("#view-lang.on").count() == 1, "lang picker visible on first run")
    ok &= check(page.locator("#view-home.on").count() == 0, "home hidden before language chosen")
    page.screenshot(path=f"{SHOTS}/lang_picker.png")

    # choose Español
    page.locator("#langBtnEs").click(); time.sleep(0.8)
    ok &= check(page.locator("#view-home.on").count() == 1, "home visible after choosing es")
    t1 = page.locator("#homeTitle").inner_text()
    ok &= check(t1 == "Elige un período histórico", f"home title in Spanish ({t1})")
    pc = page.locator(".period .pt").first.inner_text()
    ok &= check("Revolución" in pc or "Transformaciones" in pc, f"period name in Spanish ({pc})")
    page.screenshot(path=f"{SHOTS}/home_es.png")

    # play one mixed round in Spanish
    page.locator(".period").nth(2).click(); time.sleep(0.4)
    mt = page.locator(".mode .t").first.inner_text()
    ok &= check(mt == "🎲 Mixto", f"mode name in Spanish ({mt})")
    page.locator("#btnStart").click(); time.sleep(2.5)
    tag = page.locator("#qTag").inner_text()
    ok &= check(any(k in tag for k in ["WHEN", "WHO", "WHY", "PIC"]), f"question rendered in es ({tag})")
    # answer correctly via engine data
    is_fib = page.locator("#qBody input").count() > 0
    if is_fib:
        page.evaluate("""() => {
          const q=window.__lastQ; let probe='';
          if(q.template==='when_year_fib') probe=String(q.topic.year);
          else if(q.template==='who_fib') probe=q.topic.who[0];
          else if(q.template==='why_term_fib') probe=q.topic.why_term;
          else if(q.template==='pic_event_fib') probe=q.topic.topic_en;
          document.querySelector('#qBody input').value=probe;
          [...document.querySelectorAll('#qBody button')].find(b=>b.textContent==='Enviar').click();
        }""")
    else:
        page.evaluate("""() => {
          const btns=[...document.querySelectorAll('#qBody .opt')];
          const ans=window.__lastQ.answerText;
          const strip=s=>s.replace(/\\uff08.*\\uff09$/,'').trim();
          let pick=btns.find(b=>strip(b.textContent)===strip(ans))||btns.find(b=>b.textContent.trim()===ans);
          if(!pick) throw new Error('no option for '+ans);
          pick.click();
        }""")
    time.sleep(0.5)
    fb = page.locator("#qFeedback .verdict").inner_text()
    ok &= check("Correcto" in fb, f"feedback verdict in Spanish ({fb})")
    page.screenshot(path=f"{SHOTS}/feedback_es.png")
    page.locator("#btnQuit").click(); time.sleep(0.5)

    # switch to English via header selector
    page.locator("#langSel").select_option("en"); time.sleep(0.6)
    t2 = page.locator("#homeTitle").inner_text()
    ok &= check(t2 == "Choose a historical period", f"home title in English ({t2})")
    page.screenshot(path=f"{SHOTS}/home_en.png")

    # switch to Chinese
    page.locator("#langSel").select_option("zh"); time.sleep(0.6)
    t3 = page.locator("#homeTitle").inner_text()
    ok &= check("历史时期" in t3, f"home title in Chinese ({t3})")
    page.screenshot(path=f"{SHOTS}/home_zh.png")

    # persistence: reload keeps Chinese
    page.reload(wait_until="networkidle"); time.sleep(0.8)
    ok &= check(page.locator("#view-home.on").count() == 1, "home shown directly on reload (lang persisted)")
    ok &= check("历史时期" in page.locator("#homeTitle").inner_text(), "language persisted as zh")
    browser.close()

print("\n--- errors ---")
print("\n".join(errors) if errors else "(none)")
sys.exit(0 if ok and not errors else 1)
