/* Full-round simulation: play MCQs and FIBs through the real UI wiring. */
const fs = require("fs");
const path = require("path");
const ROOT = "/home/hatch/workspace/apush-guesser";

function mkEl(tag) {
  const el = {
    tag: tag || "div", children: [], style: {}, dataset: {},
    classList: { _s:new Set(), toggle(c,f){ f?this._s.add(c):this._s.delete(c); }, add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); }, contains(c){ return this._s.has(c); } },
    _html: "", _text: "",
    set innerHTML(v){ this._html = String(v); this.children = []; }, get innerHTML(){ return this._html; },
    set textContent(v){ this._text = String(v); }, get textContent(){ return this._text; },
    appendChild(c){ this.children.push(c); c.parent = this; return c; },
    querySelectorAll(sel){
      const out = [];
      const walk = (n)=>{ n.children.forEach(c=>{
        if(sel === ".opt" && c.className.split(" ").includes("opt")) out.push(c);
        if(sel === "input" && c.tag === "input") out.push(c);
        walk(c);
      }); };
      walk(this); return out;
    },
    querySelector(sel){
      if(sel === "input"){ const r = this.querySelectorAll("input"); return r[0] || null; }
      if(sel === ".fibrow .btn"){ return this._fibBtn || null; }
      return null;
    },
    addEventListener(){}, setAttribute(){}, getAttribute(){ return null; },
    onclick: null, onkeydown: null, disabled: false, value: "", focus(){},
    className: "", id: "", placeholder: "",
    click(){ if(typeof this.onclick === "function") this.onclick(); },
  };
  return el;
}
const els = {};
global.document = {
  getElementById(id){ return els[id] || (els[id] = mkEl()); },
  createElement(tag){ return mkEl(tag); },
  querySelector(){ return null; },
};
global.window = global;
global.localStorage = { _s:{}, getItem(k){ return this._s[k]||null; }, setItem(k,v){ this._s[k]=v; }, removeItem(k){ delete this._s[k]; } };
global.alert = ()=>{}; global.confirm = ()=>true; global.setTimeout = ()=>0;
global.window.scrollTo = ()=>{};

function load(f){ eval(fs.readFileSync(path.join(ROOT, f), "utf8")); }
load("data/periods.js");
try { load("data/img_chunks.js"); } catch (e) {}
for (let n = 1; n <= 9; n++) load(`data/topics_${n}.js`);
try {
  const glob = require("child_process").execSync(`ls ${ROOT}/data/images_*.js`).toString().trim().split("\n");
  glob.forEach(f => load("data/" + path.basename(f)));
} catch (e) { console.log("note: image chunks not built yet"); }
const eng = require(path.join(ROOT, "js/engine.js"));
const T = eng._test;

let fails = 0, total = 0;
function check(c, m){ total++; if(!c){ fails++; console.log("FAIL:", m); } }

// --- simulate 30 mixed rounds on period 3: answer correctly via ok flag / canonical probe ---
T.startPlay(false);
let G = T.getG();
check(G.total === 0, "fresh round total=0");
let mcqSeen = 0, fibSeen = 0, wrongOnce = false;
let wrongDone = false;
for (let r = 0; r < 30; r++) {
  const q = G.q;
  check(!!q, `round ${r} has question`);
  if (!q) break;
  const body = document.getElementById("qBody");
  if (q.kind === "mcq") {
    mcqSeen++;
    const opts = body.querySelectorAll(".opt");
    check(opts.length === 4, `round ${r} renders 4 options`);
    const right = opts.find(o => q.options.find(x => x.t === o.textContent && x.ok));
    check(!!right, `round ${r} right option identifiable`);
    if (!wrongDone && r >= 3) { // one deliberate wrong answer -> 错题本
      const wrong = opts.find(o => o !== right);
      wrong.click(); wrongOnce = true; wrongDone = true;
      check(G.streak === 0, "wrong answer resets streak");
      check(eng.store.wrong.length > 0, "wrong answer recorded in 错题本");
      const fb = document.getElementById("qFeedback").innerHTML;
      check(fb.includes("不对") && fb.includes("p."), "feedback shows verdict + citation");
    } else {
      right.click();
      check(G.streak > 0, `round ${r} correct keeps streak`);
    }
    // options locked
    check(opts.every(o => o.disabled), `round ${r} options disabled after answer`);
  } else {
    fibSeen++;
    const inp = body.querySelector("input");
    check(!!inp, `round ${r} fib has input`);
    const t = q.topic;
    let probe = "???";
    if (q.template === "when_year_fib") probe = String(t.year);
    else if (q.template === "who_fib") probe = t.who[0];
    else if (q.template === "why_term_fib") probe = t.why_term;
    else if (q.template === "pic_event_fib") probe = t.topic_en;
    inp.value = probe;
    // find submit button
    const btn = body.children[0].children.find(c => c.tag === "button");
    btn.click();
    check(G.streak > 0, `round ${r} fib correct (probe=${probe})`);
  }
  check(document.getElementById("btnNext").style.display !== "none", `round ${r} next button shown`);
  T.nextQuestion();
  G = T.getG();
}
check(mcqSeen > 10, `saw ${mcqSeen} mcqs`);
check(fibSeen > 3, `saw ${fibSeen} fibs`);
check(wrongOnce, "wrong-answer path exercised");
check(G.score > 0, "score accumulated: " + G.score);
console.log(`\n${total} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
