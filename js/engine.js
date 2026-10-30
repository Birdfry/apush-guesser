/* APUSH Guesser engine: unlimited question generation from topic bank.
   All facts come from window.APUSH_TOPICS (extracted from Henretta 8e). */
(function(){
"use strict";

/* ---------------- utils ---------------- */
const $ = id => document.getElementById(id);
const rand = a => a[Math.floor(Math.random()*a.length)];
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); const t=a[i];a[i]=a[j];a[j]=t;} return a; }
function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function norm(s){ return String(s||"").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff ]/g,"").replace(/\s+/g," ").trim(); }

/* ---------------- storage ---------------- */
const LS="apush_guesser_v1";
let store={stats:{},wrong:[],recent:{}};
try{ const s=JSON.parse(localStorage.getItem(LS)); if(s&&typeof s==="object") store=Object.assign(store,s); }catch(e){}
function save(){ try{localStorage.setItem(LS,JSON.stringify(store));}catch(e){} }
function pstat(p){ if(!store.stats[p]) store.stats[p]={score:0,total:0,correct:0,best:0}; return store.stats[p]; }

/* ---------------- data ---------------- */
const PERIODS=window.APUSH_PERIODS||[];
const TOPICS=window.APUSH_TOPICS||{};
const topicsOf=p=>(TOPICS[p]||[]).filter(t=>t&&t.topic_en);
function pname(p){ const x=PERIODS.find(v=>v.id===p); return x?("Period "+p+" · "+x.zh+" ("+x.range+")"):"Period "+p; }

/* ---------------- game state ---------------- */
let G={period:1,mode:"mixed",score:0,streak:0,total:0,correct:0,q:null,retryQueue:null};

/* ---------------- distractor pools ---------------- */
function poolVals(p,fn){ const s=new Set(); topicsOf(p).forEach(t=>{const v=fn(t); if(Array.isArray(v)) v.forEach(x=>{if(x) s.add(x);}); else if(v) s.add(v);}); return [...s]; }
function pickN(arr,n,excl){ const set=new Set((excl||[]).map(String)); const out=[]; for(const x of shuffle(arr)){ if(!set.has(String(x))&&out.length<n){out.push(x); set.add(String(x));} } return out; }

/* ---------------- templates ----------------
   q = {tag, tagCls, promptHTML, kind:'mcq'|'fib', options:[{t,ok}], answerText,
        check(user)->bool, explainHTML, citeHTML, topic} */
function mkCite(t){
  return "📖 出处：Henretta《America's History for the AP® Course》第 8 版 p."+(t.page||"?");
}
function mkExplain(t){
  let h="";
  if(t.exp_en) h+="<div>"+esc(t.exp_en)+"</div>";
  if(t.exp_zh) h+="<div style='margin-top:6px'>"+esc(t.exp_zh)+"</div>";
  if(!h) h="<div>"+esc(t.what_en||"")+"</div>";
  return h;
}
/* topic.img.file is either a path or "img:<key>" resolved from window.APUSH_IMGS
   (base64 data URIs in data/images.js, lazy-loaded when a pic mode starts) */
function imgURL(t){
  if(!t.img||!t.img.file) return null;
  const f=t.img.file;
  if(f.indexOf("img:")===0){
    const m=window.APUSH_IMGS||{};
    return m[f.slice(4)]||null;
  }
  return f;
}
function imgHTML(t,show){
  const u=show?imgURL(t):null;
  if(!u) return "";
  return "<div><img class='qimg' src='"+u+"'><div class='imgcredit'>"+esc(t.img.credit||"")+"</div></div>";
}
function srcHTML(t){
  if(!t.src||!t.src.text) return "";
  return "<div class='src'>“"+esc(t.src.text)+"”"+(t.src.attr?"<br>— "+esc(t.src.attr):"")+"</div>";
}
/* blank out the event name (and its long words) so the description doesn't give it away */
function redact(text,name){
  let out=String(text||"");
  const escRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const n=String(name||"").trim();
  if(n) out=out.replace(new RegExp(escRe(n),"gi"),"______");
  n.split(/\s+/).forEach(w=>{ if(w.length>5) out=out.replace(new RegExp("\\b"+escRe(w)+"\\b","gi"),"______"); });
  return out;
}

const T={
/* ---- WHEN ---- */
when_year_mcq(p,t){
  if(t.year==null) return null;
  const years=poolVals(p,x=>x.year).filter(y=>y!=null).map(Number).filter(y=>!isNaN(y)&&y>1000&&y!==t.year);
  const d=pickN(years,3,[t.year]).map(String);
  if(d.length<3) return null;
  const opts=shuffle([{t:String(t.year),ok:1},...d.map(x=>({t:x,ok:0}))]);
  return {tag:"WHEN · 选择",cls:"",topic:t,kind:"mcq",options:opts,
    promptHTML:"以下事件发生在哪一年？<br><b>"+esc(t.topic_en)+"</b><br><span style='color:var(--mut)'>"+esc(t.what_en||"")+"</span>"+imgHTML(t,true),
    answerText:String(t.year)+(t.year_text&&t.year_text!==String(t.year)?"（"+t.year_text+"）":""),
    check:u=>u===String(t.year)};
},
when_year_fib(p,t){
  if(t.year==null) return null;
  return {tag:"WHEN · 填空",cls:"",topic:t,kind:"fib",
    promptHTML:"填空：<b>"+esc(t.topic_en)+"</b> 发生在 ______ 年。<br><span style='color:var(--mut)'>"+esc(t.what_en||"")+"</span>"+
      "<br><span class='kbd-hint'>填年份数字即可，前后 1 年也算对</span>"+imgHTML(t,true),
    answerText:String(t.year)+(t.year_text&&t.year_text!==String(t.year)?"（"+t.year_text+"）":""),
    check:u=>{const m=String(u).match(/\d{3,4}/); return m&&Math.abs(parseInt(m[0],10)-t.year)<=1;}};
},
when_first_mcq(p,t){
  const cands=topicsOf(p).filter(x=>x.year!=null&&x.id!==t.id);
  if(cands.length<3) return null;
  const picks=shuffle(cands).slice(0,3).concat([t]);
  const years=picks.map(x=>x.year);
  if(new Set(years).size<4) return null;
  const first=picks.reduce((a,b)=>a.year<b.year?a:b);
  const opts=shuffle(picks.map(x=>({t:x.topic_en+(x.year_text?"（"+x.year_text+"）":""),ok:x.id===first.id?1:0})));
  return {tag:"WHEN · 选择",cls:"",topic:t,kind:"mcq",options:opts,
    promptHTML:"以下四个事件中，<b>发生得最早</b>的是哪一个？",
    answerText:first.topic_en+"（"+first.year+"）",
    check:u=>u===first.topic_en};
},
when_src_mcq(p,t){
  if(!t.src||!t.src.text||t.year==null) return null;
  const years=poolVals(p,x=>x.year).filter(y=>y!=null).map(Number).filter(y=>!isNaN(y)&&y>1000&&y!==t.year);
  const d=pickN(years,3,[t.year]).map(String);
  if(d.length<3) return null;
  const opts=shuffle([{t:String(t.year),ok:1},...d.map(x=>({t:x,ok:0}))]);
  return {tag:"WHEN · 史料",cls:"",topic:t,kind:"mcq",options:opts,
    promptHTML:"阅读以下史料（出自本章），它大约写于哪一年？"+srcHTML(t),
    answerText:String(t.year),check:u=>u===String(t.year)};
},
/* ---- WHO ---- */
who_mcq(p,t){
  if(!t.who||!t.who.length) return null;
  const ans=t.who[0];
  const others=poolVals(p,x=>x.who).filter(w=>t.who.indexOf(w)<0);
  const d=pickN(others,3,t.who);
  if(d.length<3) return null;
  const opts=shuffle([{t:ans,ok:1},...d.map(x=>({t:x,ok:0}))]);
  return {tag:"WHO · 选择",cls:"who",topic:t,kind:"mcq",options:opts,
    promptHTML:"以下描述的是<b>谁</b>（哪个人物 / 群体）？<br><span style='color:var(--mut)'>"+esc(t.what_en||t.topic_en)+"</span>"+imgHTML(t,true),
    answerText:ans,check:u=>u===ans};
},
who_fib(p,t){
  if(!t.who||!t.who.length) return null;
  const acc=t.who.map(norm);
  const last=t.who.map(w=>norm(w).split(" ").pop());
  return {tag:"WHO · 填空",cls:"who",topic:t,kind:"fib",
    promptHTML:"填空：以下事件的关键人物 / 群体是 ______。<br><span style='color:var(--mut)'>"+esc(t.what_en||t.topic_en)+"</span>"+
      "<br><span class='kbd-hint'>英文名，姓也可（如 Washington）</span>"+imgHTML(t,true),
    answerText:t.who.join("；"),
    check:u=>{const n=norm(u); if(n.length<2) return false;
      return acc.some(a=>a===n)||last.some(a=>a===n&&n.length>=3);}};
},
who_src_mcq(p,t){
  if(!t.src||!t.src.text||!t.who||!t.who.length) return null;
  const ans=t.who[0];
  const others=poolVals(p,x=>x.who).filter(w=>t.who.indexOf(w)<0);
  const d=pickN(others,3,t.who);
  if(d.length<3) return null;
  const opts=shuffle([{t:ans,ok:1},...d.map(x=>({t:x,ok:0}))]);
  return {tag:"WHO · 史料",cls:"who",topic:t,kind:"mcq",options:opts,
    promptHTML:"以下史料（出自本章）的作者 / 说话者是谁？"+srcHTML(t),
    answerText:ans,check:u=>u===ans};
},
/* ---- WHY ---- */
why_cause_mcq(p,t){
  if(!t.cause_en) return null;
  const others=poolVals(p,x=>x.cause_en).filter(c=>c!==t.cause_en);
  const d=pickN(others,3,[t.cause_en]);
  if(d.length<3) return null;
  const opts=shuffle([{t:t.cause_en,ok:1},...d.map(x=>({t:x,ok:0}))]);
  return {tag:"WHY · 选择",cls:"why",topic:t,kind:"mcq",options:opts,
    promptHTML:"<b>"+esc(t.topic_en)+"</b> 的主要原因是什么？",
    answerText:t.cause_en,check:u=>u===t.cause_en};
},
why_sig_mcq(p,t){
  if(!t.sig_en) return null;
  const others=poolVals(p,x=>x.sig_en).filter(c=>c!==t.sig_en);
  const d=pickN(others,3,[t.sig_en]);
  if(d.length<3) return null;
  const opts=shuffle([{t:t.sig_en,ok:1},...d.map(x=>({t:x,ok:0}))]);
  return {tag:"WHY · 选择",cls:"why",topic:t,kind:"mcq",options:opts,
    promptHTML:"<b>"+esc(t.topic_en)+"</b> 的历史意义是什么？",
    answerText:t.sig_en,check:u=>u===t.sig_en};
},
why_term_fib(p,t){
  if(!t.why_term) return null;
  const keys=(t.why_term_accept||[t.why_term]).map(norm);
  return {tag:"WHY · 填空",cls:"why",topic:t,kind:"fib",
    promptHTML:"填空（关键词）："+esc(t.why_term_q||("关于“"+t.topic_en+"”，教材强调的关键概念是 ______。")),
    answerText:t.why_term,
    check:u=>{const n=norm(u); return n.length>=2&&keys.some(k=>n.indexOf(k)>=0||k.indexOf(n)>=0);}};
}
};
const BY_MODE={
  when:["when_year_mcq","when_year_fib","when_first_mcq","when_src_mcq"],
  who:["who_mcq","who_fib","who_src_mcq"],
  why:["why_cause_mcq","why_sig_mcq","why_term_fib"],
  pic:["pic_event_mcq","pic_event_fib"],
};
BY_MODE.mixed=[].concat(BY_MODE.when,BY_MODE.who,BY_MODE.why,BY_MODE.pic);

/* ---- PIC: guess the event from image + text ---- */
T.pic_event_mcq=function(p,t){
  if(!imgURL(t)) return null;
  const others=topicsOf(p).filter(x=>x.id!==t.id);
  const d=shuffle(others).slice(0,3);
  if(d.length<3) return null;
  const opts=shuffle([{t:t.topic_en,ok:1}].concat(d.map(x=>({t:x.topic_en,ok:0}))));
  const hints=[];
  if(t.year_text) hints.push("📅 "+t.year_text);
  if(t.who&&t.who.length) hints.push("🧑 "+t.who.slice(0,3).join(", "));
  return {tag:"PIC · 看图猜事件",cls:"pic",topic:t,kind:"mcq",options:opts,
    promptHTML:"根据下面的<b>图片</b>和<b>文字线索</b>，猜猜这是哪一历史事件？"+
      (hints.length?"<br><span class='kbd-hint'>"+esc(hints.join(" · "))+"</span>":"")+
      imgHTML(t,true),
    answerText:t.topic_en+(t.topic_zh?"（"+t.topic_zh+"）":""),
    check:function(u){return u===t.topic_en;}};
};
T.pic_event_fib=function(p,t){
  if(!imgURL(t)) return null;
  const desc=redact(t.what_en||t.sig_en||"",t.topic_en);
  const acc=[norm(t.topic_en)];
  if(t.topic_zh) acc.push(norm(t.topic_zh));
  return {tag:"PIC · 看图猜事件",cls:"pic",topic:t,kind:"fib",
    promptHTML:"看<b>图片</b>并读下面的描述（事件名已隐去），填写这个历史事件的名称："+
      imgHTML(t,true)+
      "<div style='margin:8px 0;color:#cbd5e1'>"+esc(desc)+"</div>"+
      (t.year_text?"<div class='kbd-hint'>📅 "+esc(t.year_text)+"</div>":"")+
      "<div class='kbd-hint'>填写英文事件名</div>",
    answerText:t.topic_en+(t.topic_zh?"（"+t.topic_zh+"）":""),
    check:function(u){const n=norm(u); if(n.length<3) return false;
      return acc.some(function(a){return a===n||(a.length>=4&&n.length>=4&&(a.indexOf(n)>=0||n.indexOf(a)>=0));});}};
};

/* pick a question: random topic (avoid recent), random viable template */
function generateQuestion(p,mode,forceTopicId,forceTypes){
  const topics=topicsOf(p);
  if(!topics.length) return null;
  const recent=store.recent[p]||[];
  let cands=topics.filter(t=>recent.indexOf(t.id)<0);
  if(mode==="pic") cands=cands.filter(t=>imgURL(t));
  if(forceTopicId){ cands=topics.filter(t=>t.id===forceTopicId); }
  if(!cands.length){ store.recent[p]=[]; save();
    cands=topics.slice();
    if(mode==="pic") cands=cands.filter(t=>imgURL(t));
  }
  const types=forceTypes||BY_MODE[mode]||BY_MODE.mixed;
  for(let attempt=0;attempt<24;attempt++){
    const t=forceTopicId?cands[0]:rand(cands);
    const name=rand(types);
    const q=T[name]&&T[name](p,t);
    if(q){
      q.explainHTML=mkExplain(t); q.citeHTML=mkCite(t);
      q.topicId=t.id; q.template=name;
      return q;
    }
  }
  return null;
}
function markRecent(p,tid){
  const r=store.recent[p]||(store.recent[p]=[]);
  r.push(tid); if(r.length>40) r.shift(); save();
}

/* ---------------- views ---------------- */
const VIEWS=["view-home","view-mode","view-play","view-topics","view-review"];
function show(v){ VIEWS.forEach(x=>$(x).classList.toggle("on",x===v)); window.scrollTo(0,0); }

function renderHome(){
  const g=$("periodGrid"); g.innerHTML="";
  PERIODS.forEach(pd=>{
    const n=topicsOf(pd.id).length, st=store.stats[pd.id];
    const acc=st&&st.total?Math.round(100*st.correct/st.total)+"%":"–";
    const d=document.createElement("div"); d.className="period";
    d.innerHTML="<div class='pn'>PERIOD "+pd.id+" · "+esc(pd.range)+"</div>"+
      "<div class='pt'>"+esc(pd.zh)+"</div>"+
      "<div class='pr'>"+esc(pd.en)+"</div>"+
      "<div class='pm'>题库 <b>"+n+"</b> 个考点 · ∞ 题目<br>正确率 "+acc+(st&&st.total?"（已答 "+st.total+"）":"")+"</div>";
    d.onclick=()=>{G.period=pd.id; renderMode(); show("view-mode");};
    g.appendChild(d);
  });
  $("reviewCount").textContent=store.wrong.length?("("+store.wrong.length+")"):"";
}

const MODES=[
  {id:"mixed",t:"🎲 混合",d:"全部题型随机"},
  {id:"when",t:"📅 猜 When",d:"年份 / 先后 / 史料断代"},
  {id:"who",t:"🧑 猜 Who",d:"人物 / 群体 / 史料作者"},
  {id:"why",t:"💡 猜 Why",d:"原因 / 意义 / 关键概念"},
  {id:"pic",t:"🖼️ 猜事件",d:"看图 + 文字猜事件名"},
];
let selMode="mixed";
function renderMode(){
  $("modePeriodTitle").textContent=pname(G.period);
  const g=$("modeGrid"); g.innerHTML="";
  MODES.forEach(m=>{
    const d=document.createElement("div");
    d.className="mode"+(m.id===selMode?" sel":"");
    d.innerHTML="<div class='t'>"+m.t+"</div><div class='d'>"+m.d+"</div>";
    d.onclick=()=>{selMode=m.id; renderMode();};
    g.appendChild(d);
  });
}

function hud(){
  $("hScore").textContent=G.score; $("hStreak").textContent=G.streak; $("hTotal").textContent=G.total;
  $("hAcc").textContent=G.total?Math.round(100*G.correct/G.total)+"%":"–";
}

function nextQuestion(){
  const rq=G.retryQueue;
  let q;
  if(rq&&rq.length){
    const item=rq[0];
    q=generateQuestion(G.period,G.mode,item.tid,[item.template]);
    if(!q){ rq.shift(); return nextQuestion(); }
    q._retryItem=item;
  }else{
    q=generateQuestion(G.period,selMode);
  }
  if(!q){ $("qPrompt").innerHTML="<div class='empty'>这个时期暂时没有可用题目。</div>"; $("qBody").innerHTML=""; return; }
  G.q=q; markRecent(G.period,q.topicId);
  const tag=$("qTag"); tag.textContent=q.tag; tag.className="qtag "+(q.cls||"");
  $("qPrompt").innerHTML=q.promptHTML;
  q._hasImgInPrompt=q.promptHTML.indexOf("qimg")>=0;
  const body=$("qBody"); body.innerHTML="";
  const fb=$("qFeedback"); fb.className="feedback"; fb.innerHTML="";
  $("btnNext").style.display="none";
  if(q.kind==="mcq"){
    shuffle(q.options).forEach(o=>{
      const b=document.createElement("button"); b.className="opt"; b.textContent=o.t;
      b.onclick=()=>answer(o.t,!!o.ok);
      body.appendChild(b);
    });
  }else{
    const row=document.createElement("div"); row.className="fibrow";
    const inp=document.createElement("input"); inp.placeholder="在此输入答案…";
    const btn=document.createElement("button"); btn.className="btn"; btn.textContent="提交";
    const go=()=>answer(inp.value,null);
    btn.onclick=go; inp.onkeydown=e=>{if(e.key==="Enter")go();};
    row.appendChild(inp); row.appendChild(btn); body.appendChild(row);
    setTimeout(()=>inp.focus(),50);
  }
}

function answer(user,mcqOk){
  const q=G.q; if(!q||q._done) return; q._done=true;
  const ok=(mcqOk===true||mcqOk===false)?mcqOk:q.check(user);
  G.total++; const st=pstat(G.period); st.total++;
  if(ok){ G.correct++; G.streak++; G.score+=10+Math.min(G.streak,5)*2; st.correct++; st.score=G.score; if(G.streak>st.best)st.best=G.streak; }
  else{ G.streak=0; }
  hud(); save();
  // lock options
  [...$("qBody").querySelectorAll(".opt")].forEach(b=>{
    b.disabled=true;
    const o=q.options.find(x=>x.t===b.textContent);
    if(o&&o.ok) b.classList.add("right");
    else if(b.textContent===user) b.classList.add("wrong");
  });
  const inp=$("qBody").querySelector("input"); if(inp) inp.disabled=true;
  const sub=$("qBody").querySelector(".fibrow .btn"); if(sub) sub.disabled=true;

  const fb=$("qFeedback");
  fb.className="feedback on "+(ok?"good":"bad");
  let h="<div class='verdict'>"+(ok?"✅ 正确！":"❌ 不对")+"</div>";
  h+="<div class='exp'><b>答案：</b>"+esc(q.answerText)+"</div>";
  h+="<div class='exp' style='margin-top:8px'>"+q.explainHTML+"</div>";
  const t=q.topic;
  const iu=imgURL(t);
  if(iu&&!q._hasImgInPrompt)
    h+="<div><img class='qimg' src='"+iu+"'><div class='imgcredit'>"+esc(t.img.credit||"")+"</div></div>";
  h+="<div class='cite'>"+q.citeHTML+"</div>";
  fb.innerHTML=h;
  $("btnNext").style.display="inline-block";

  if(!ok){
    store.wrong.unshift({pid:G.period,tid:q.topicId,template:q.template,
      q:q.promptHTML.replace(/<[^>]+>/g," ").replace(/\s+/g," ").slice(0,120),
      a:q.answerText,ts:Date.now()});
    if(store.wrong.length>200) store.wrong.length=200;
    save();
  }else if(q._retryItem){
    // answered a retry correctly -> drop from wrong list
    G.retryQueue.shift();
    const ix=store.wrong.findIndex(w=>w.pid===q._retryItem.pid&&w.tid===q._retryItem.tid&&w.template===q._retryItem.template);
    if(ix>=0) store.wrong.splice(ix,1);
    save();
  }
  if(G.retryQueue&&!G.retryQueue.length){
    G.retryQueue=null;
    setTimeout(()=>{alert("🎉 错题全部重练正确！");},300);
  }
}

/* image chunks (base64 data URIs) load lazily the first time a pic-capable mode starts */
var IMG_CHUNKS=(window.APUSH_IMG_CHUNKS||[]);
function ensureImages(done){
  if(window.APUSH_IMGS_LOADED){ done(); return; }
  if(!IMG_CHUNKS.length){ done(); return; }
  let i=0;
  const next=function(){
    if(i>=IMG_CHUNKS.length){ window.APUSH_IMGS_LOADED=true; done(); return; }
    const s=document.createElement("script");
    s.src=IMG_CHUNKS[i++];
    s.onload=next; s.onerror=next;
    document.head.appendChild(s);
  };
  next();
}
function startPlay(retry){
  const begin=function(){
    const bs=$("btnStart"); bs.textContent="开始 ▶"; bs.disabled=false;
    const st=pstat(G.period);
    G.score=st.score||0; G.streak=0; G.total=0; G.correct=0;
    G.retryQueue=retry?store.wrong.filter(w=>w.pid===G.period).map(w=>({pid:w.pid,tid:w.tid,template:w.template})):null;
    if(retry&&!G.retryQueue.length){ alert("这个时期没有错题 👍"); return; }
    hud(); show("view-play"); nextQuestion();
  };
  if(selMode==="pic"||selMode==="mixed"){
    const bs=$("btnStart"); bs.textContent="加载图片…"; bs.disabled=true;
    ensureImages(begin);
  }else begin();
}

/* ---------------- topics browser ---------------- */
function renderTopics(sel){
  sel=sel||1;
  const tabs=$("topicTabs"); tabs.innerHTML="";
  PERIODS.forEach(pd=>{
    const b=document.createElement("button");
    b.className="tab"+(pd.id===sel?" sel":"");
    b.textContent="P"+pd.id+" "+pd.zh;
    b.onclick=()=>renderTopics(pd.id);
    tabs.appendChild(b);
  });
  const list=$("topicList"); list.innerHTML="";
  const ts=topicsOf(sel);
  if(!ts.length){ list.innerHTML="<div class='empty'>考点数据尚未生成。</div>"; return; }
  const h=document.createElement("div"); h.className="kbd-hint";
  h.textContent="共 "+ts.length+" 个考点 · 全部来自教材原文"; list.appendChild(h);
  ts.forEach(t=>{
    const d=document.createElement("div"); d.className="titem";
    d.innerHTML="<h4>"+esc(t.topic_en)+(t.topic_zh?" · "+esc(t.topic_zh):"")+"</h4>"+
      "<div class='meta'>"+
      (t.year_text?"<b>When:</b> "+esc(t.year_text)+"<br>":"")+
      (t.who&&t.who.length?"<b>Who:</b> "+esc(t.who.join(", "))+"<br>":"")+
      (t.cause_en?"<b>Why(因):</b> "+esc(t.cause_en)+"<br>":"")+
      (t.sig_en?"<b>Why(果):</b> "+esc(t.sig_en)+"<br>":"")+
      "<b>页:</b> p."+esc(t.page||"?")+"</div>";
    list.appendChild(d);
  });
}

/* ---------------- review ---------------- */
function renderReview(){
  const list=$("reviewList"); list.innerHTML="";
  if(!store.wrong.length){ list.innerHTML="<div class='empty'>错题本是空的，继续加油！</div>"; return; }
  store.wrong.slice(0,60).forEach(w=>{
    const d=document.createElement("div"); d.className="rev-item";
    d.innerHTML="<div class='rq'>❓ "+esc(w.q)+"…</div>"+
      "<div class='ra'>✔ "+esc(w.a)+"</div>"+
      "<div class='kbd-hint'>Period "+w.pid+" · "+esc(w.template)+"</div>";
    list.appendChild(d);
  });
}

/* ---------------- wire up ---------------- */
$("btnStart").onclick=()=>startPlay(false);
$("btnNext").onclick=nextQuestion;
$("btnQuit").onclick=()=>{ renderHome(); show("view-home"); };
$("btnBackHome1").onclick=()=>show("view-home");
$("btnBackHome2").onclick=()=>show("view-home");
$("btnBackHome3").onclick=()=>show("view-home");
$("btnReview").onclick=()=>{ renderReview(); show("view-review"); };
$("btnTopics").onclick=()=>{ renderTopics(1); show("view-topics"); };
$("btnClearWrong").onclick=()=>{ if(confirm("清空全部错题？")){ store.wrong=[]; save(); renderReview(); } };
$("btnRetryWrong").onclick=()=>{ renderMode(); show("view-mode"); selMode="mixed"; renderMode();
  setTimeout(()=>startPlay(true),50); };

renderHome();

/* node smoke-test hook (harmless in browser) */
if(typeof module!=="undefined"&&module.exports){
  module.exports={generateQuestion:generateQuestion,topicsOf:topicsOf,T:T,BY_MODE:BY_MODE,store:store,
    _test:{nextQuestion:nextQuestion,answer:answer,startPlay:startPlay,getG:function(){return G;},show:show}};
}
})();
