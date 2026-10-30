/* Smoke test: load data + engine in node with DOM stubs, generate questions. */
const fs = require("fs");
const path = require("path");
const ROOT = "/home/hatch/workspace/apush-guesser";

// ---- minimal DOM stubs ----
function mkEl() {
  const el = {
    children: [], style: {}, dataset: {},
    classList: { toggle(){}, add(){}, remove(){}, contains(){ return false; } },
    set innerHTML(v){ this._html = v; }, get innerHTML(){ return this._html || ""; },
    set textContent(v){ this._text = v; }, get textContent(){ return this._text || ""; },
    appendChild(c){ this.children.push(c); return c; },
    querySelectorAll(){ return []; }, querySelector(){ return null; },
    addEventListener(){}, removeEventListener(){},
    setAttribute(){}, getAttribute(){ return null; },
    onclick: null, onkeydown: null, disabled: false, value: "", focus(){},
    className: "", id: "", placeholder: "",
  };
  return el;
}
const els = {};
global.document = {
  getElementById(id){ return els[id] || (els[id] = mkEl()); },
  createElement(){ return mkEl(); },
  querySelector(){ return null; },
};
global.window = global;
global.localStorage = { _s:{}, getItem(k){ return this._s[k]||null; }, setItem(k,v){ this._s[k]=v; }, removeItem(k){ delete this._s[k]; } };
global.alert = ()=>{}; global.confirm = ()=>true; global.setTimeout = (fn)=>0;
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

let fails = 0, total = 0;
function check(cond, msg){ total++; if(!cond){ fails++; console.log("FAIL:", msg); } }

for (let p = 1; p <= 9; p++) {
  const ts = eng.topicsOf(p);
  check(ts.length > 0, `period ${p} has topics`);
  for (const mode of ["mixed","when","who","why","pic"]) {
    for (let i = 0; i < 25; i++) {
      const q = eng.generateQuestion(p, mode);
      check(!!q, `p${p}/${mode} generated (try ${i})`);
      if (!q) continue;
      check(["mcq","fib"].includes(q.kind), `p${p}/${mode} kind ok`);
      check(!!q.answerText, `p${p}/${mode} answerText`);
      check(!!q.explainHTML, `p${p}/${mode} explain`);
      check(/p\.\d+/.test(q.citeHTML||""), `p${p}/${mode} cite`);
      if (q.kind === "mcq") {
        check(q.options.length === 4, `p${p}/${mode}/${q.template} 4 options`);
        check(q.options.filter(o=>o.ok).length === 1, `p${p}/${mode}/${q.template} exactly 1 correct`);
        const texts = q.options.map(o=>o.t);
        check(new Set(texts).size === 4, `p${p}/${mode}/${q.template} distinct options: ${texts.join(" | ").slice(0,120)}`);
        // no absurd year distractors
        texts.forEach(t=>{ if(/^\d+$/.test(t)) check(parseInt(t)>1000, `p${p}/${mode} year distractor sane: ${t}`); });
      } else {
        // fib check must accept the canonical answer
        const t = q.topic;
        let probe = null;
        if (q.template === "when_year_fib") probe = String(t.year);
        else if (q.template === "who_fib" && t.who && t.who[0]) probe = t.who[0];
        else if (q.template === "why_term_fib") probe = t.why_term;
        else if (q.template === "pic_event_fib") probe = t.topic_en;
        if (probe) check(q.check(probe) === true, `p${p}/${q.template} fib accepts canonical answer`);
      }
      if (q.template.indexOf("pic_") === 0) {
        check(!!(q.topic.img && q.topic.img.file), `p${p}/${q.template} topic has image`);
        check(q.promptHTML.includes("qimg") || q.promptHTML.includes("<img"), `p${p}/${q.template} prompt shows image`);
      }
    }
  }
}
console.log(`\n${total} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
