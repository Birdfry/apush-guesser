#!/usr/bin/env python3
"""End-to-end browser test: full user flow with screenshots + console error capture."""
import sys, time
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8123/"
SHOTS = "/tmp/e2e"
import os
os.makedirs(SHOTS, exist_ok=True)

errors, failed_reqs = [], []
def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type in ("error",) else None)
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("requestfailed", lambda r: failed_reqs.append(f"{r.url} :: {r.failure}"))
        page.goto(URL, wait_until="networkidle")
        time.sleep(1)
        # pick English first (language picker shows on fresh profile)
        if page.locator("#view-lang.on").count():
            page.locator("#langBtnEn").click(); time.sleep(0.6)

        n_cards = page.locator(".period").count()
        print("period cards:", n_cards)
        page.screenshot(path=f"{SHOTS}/01_home.png")

        # pick Period 3
        page.locator(".period").nth(2).click()
        time.sleep(0.5)
        print("mode title:", page.locator("#modePeriodTitle").inner_text())
        page.screenshot(path=f"{SHOTS}/02_mode.png")

        # choose pic mode (last) then back to mixed for broader coverage
        page.locator(".mode").nth(4).click()   # pic
        page.locator("#btnStart").click()
        time.sleep(2.5)  # image chunks lazy-load
        tag = page.locator("#qTag").inner_text()
        print("pic q tag:", tag)
        page.screenshot(path=f"{SHOTS}/03_pic_q.png")
        # answer pic mcq or fib (probe via page JS)
        kind = page.evaluate("() => (window.__q ? window.__q.kind : document.querySelector('#qBody input') ? 'fib' : 'mcq')")
        if kind == "mcq":
            page.evaluate("""() => {
              const btns=[...document.querySelectorAll('#qBody .opt')];
              const right=btns.find(b=>b.textContent.trim()===window.__lastQ.answerText.split('（')[0]);
              (right||btns[0]).click();
            }""")
        else:
            page.evaluate("""() => {
              const inp=document.querySelector('#qBody input');
              inp.value=window.__lastQ.topic.topic_en;
              document.querySelector('#qBody .fibrow .btn').click();
            }""")
        time.sleep(0.5)
        print("feedback shown:", page.locator("#qFeedback.on").count())
        page.screenshot(path=f"{SHOTS}/04_pic_feedback.png")
        page.locator("#btnQuit").click()
        time.sleep(0.5)

        # mixed mode: play 6 rounds, alternate right/wrong
        page.locator(".period").nth(2).click()
        time.sleep(0.3)
        page.locator(".mode").nth(0).click()   # mixed
        page.locator("#btnStart").click()
        time.sleep(2.5)
        for r in range(6):
            time.sleep(0.4)
            is_fib = page.locator("#qBody input").count() > 0
            if is_fib:
                page.evaluate("""() => {
                  const q=window.__lastQ; const t=q.topic; let probe='';
                  if(q.template==='when_year_fib') probe=String(t.year);
                  else if(q.template==='who_fib') probe=t.who[0];
                  else if(q.template==='why_term_fib') probe=t.why_term;
                  else if(q.template==='pic_event_fib') probe=t.topic_en;
                  document.querySelector('#qBody input').value=probe;
                  document.querySelector('#qBody .fibrow .btn').click();
                }""")
            else:
                wrong = (r == 2)
                page.evaluate(f"""() => {{
                  const btns=[...document.querySelectorAll('#qBody .opt')];
                  const ans=window.__lastQ.answerText;
                  const strip=s=>s.replace(/\\uff08.*\\uff09$/,'').trim();
                  let pick=btns.find(b=>strip(b.textContent)===strip(ans));
                  if(!pick) throw new Error('no matching option for answer: '+ans+' // options: '+btns.map(b=>b.textContent).join(' | '));
                  if({str(wrong).lower()}) pick=btns.find(b=>b!==pick);
                  pick.click();
                }}""")
            time.sleep(0.4)
            if r == 0:
                page.screenshot(path=f"{SHOTS}/05_mixed_feedback.png")
            page.locator("#btnNext").click()
        hud = page.locator(".hud").inner_text().replace("\n", " | ")
        print("hud after 6 rounds:", hud)
        page.locator("#btnQuit").click()
        time.sleep(0.5)

        # 错题本
        page.locator("#btnReview").click()
        time.sleep(0.5)
        print("review items:", page.locator(".rev-item").count())
        page.screenshot(path=f"{SHOTS}/06_review.png")
        page.locator("#btnBackHome3").click()

        # 考点一览
        page.locator("#btnTopics").click()
        time.sleep(0.5)
        print("topic items P1:", page.locator(".titem").count())
        page.locator(".tab").nth(2).click()
        time.sleep(0.5)
        print("topic items P3:", page.locator(".titem").count())
        page.screenshot(path=f"{SHOTS}/07_topics.png")

        browser.close()

    print("\n--- console/page errors ---")
    print("\n".join(errors) if errors else "(none)")
    print("--- failed requests ---")
    print("\n".join(failed_reqs) if failed_reqs else "(none)")
    return 0 if not errors and not failed_reqs else 1

sys.exit(run())
