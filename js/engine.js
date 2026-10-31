/* APUSH Guesser engine: unlimited question generation from topic bank.
   All facts come from window.APUSH_TOPICS (extracted from Henretta 8e).
   UI + stems in English / 中文 / Español. */
(function(){
"use strict";

/* ---------------- utils ---------------- */
const $ = id => document.getElementById(id);
const rand = a => a[Math.floor(Math.random()*a.length)];
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); const t=a[i];a[i]=a[j];a[j]=t;} return a; }
function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function norm(s){ return String(s||"").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff ]/g,"").replace(/\s+/g," ").trim(); }
function fmt(s,o){ return String(s).replace(/\{(\w+)\}/g,(_,k)=>(o&&o[k]!=null?o[k]:"")); }

/* ---------------- i18n ---------------- */
/* Language: defaults to English, switchable anytime via the top-right selector. */
const LANGS=["en","zh","es"];
let LANG="en";
try{ const l=localStorage.getItem("apush_guesser_lang"); if(LANGS.indexOf(l)>=0) LANG=l; }catch(e){}

const STR={
en:{
  subtitle:"All questions come from Henretta's \u201cAmerica's History for the AP\u00ae Course\u201d, 8th ed. \u00b7 Unlimited questions",
  choose_lang:"Choose your language",
  lang_note:"You can change it anytime from the \uD83C\uDF10 menu.",
  choose_period:"Choose a historical period",
  hero_title:"Pick a period, start guessing.",
  hero_sub:"{n} questions \u00b7 9 periods \u00b7 unlimited rounds",
  period_meta:"{n} questions",
  period_acc:"{acc} correct",
  solution:"\uD83D\uDCA1 Solution",
  bank_line:"Bank: <b>{n}</b> topics \u00b7 \u221e questions<br>Accuracy {acc}{played}",
  played:" ({n} answered)",
  review:"\uD83D\uDC15 Mistakes",
  topics:"\uD83D\uDCDA All topics",
  footer1:"Image credits: in-PDF images credited \u201cHenretta 8th ed. p.X\u201d; external images credit their source.",
  footer2:"Mixed / Guess When / Guess Who / Guess Why / \uD83D\uDDBC\uFE0F Guess the event \u00b7 Multiple choice + fill-in-the-blank \u00b7 Instant feedback \u00b7 Local scoring",
  mode_hint:"Pick a game mode (questions generate endlessly; correct answers earn points and streaks)",
  start:"Start \u25B6", back:"\u2190 Back",
  score:"Score", streak:"Streak", acc:"Accuracy", answered:"Answered",
  quit:"End round", next:"Next \u2192",
  fib_placeholder:"Type your answer\u2026", submit:"Submit",
  correct:"\u2705 Correct!", wrong:"\u274C Incorrect",
  answer_is:"Answer: ",
  source:"\uD83D\uDCC2 Source: Henretta's \u201cAmerica's History for the AP\u00ae Course\u201d, 8th ed., p.",
  no_questions:"No questions available for this period yet.",
  topics_title:"\uD83D\uDCDA All topics (from the textbook)",
  topics_count:"{n} topics \u00b7 all from the textbook",
  topics_empty:"Topic data not generated yet.",
  f_when:"When:", f_who:"Who:", f_cause:"Why (cause):", f_sig:"Why (significance):", f_page:"p.",
  review_title:"\uD83D\uDC15 Mistakes",
  review_hint:"Wrong answers are saved here. Tap \u201cRe-drill\u201d to answer them again one by one.",
  retry:"Re-drill mistakes", clear:"Clear all", review_empty:"No mistakes yet \u2014 keep it up!",
  no_wrong:"No mistakes for this period \uD83D\uDC4D",
  all_correct:"\uD83C\uDF89 All mistakes re-drilled correctly!",
  confirm_clear:"Clear all mistakes?",
  tag_when_mcq:"WHEN \u00b7 Multiple choice", tag_when_fib:"WHEN \u00b7 Fill in the blank", tag_when_src:"WHEN \u00b7 Primary source",
  tag_who_mcq:"WHO \u00b7 Multiple choice", tag_who_fib:"WHO \u00b7 Fill in the blank", tag_who_src:"WHO \u00b7 Primary source",
  tag_why_mcq:"WHY \u00b7 Multiple choice", tag_why_fib:"WHY \u00b7 Fill in the blank",
  tag_pic:"PIC \u00b7 Guess the event",
  s_when_year:"In what year did the following occur?",
  s_when_year_fib:"Fill in the blank: <b>{name}</b> happened in the year ______.",
  s_when_year_hint:"Type the year; \u00b11 year counts as correct.",
  s_when_first:"Which of the following happened <b>first</b>?",
  s_when_src:"Read this primary source (from the chapter). About what year was it written?",
  s_who_mcq:"Who is described below?",
  s_who_fib:"Fill in the blank: the central person / group in the following event is ______.",
  s_who_fib_hint:"Name in English; last name is fine (e.g. {eg}).",
  s_who_src:"Who wrote / said this primary source (from the chapter)?",
  s_why_cause:"What was a main cause of <b>{name}</b>?",
  s_why_sig:"What was the historical significance of <b>{name}</b>?",
  s_why_term:"Fill in the key term: ",
  s_why_term_q:"The key concept the textbook emphasizes about \u201c{name}\u201d is ______.",
  s_pic_mcq:"Based on the <b>image</b> and <b>text clues</b> below, which historical event is this?",
  s_pic_fib:"Look at the <b>image</b> and read the description (event name hidden). What is this historical event?",
  s_pic_fib_hint:"Type the event name in English.",
  loading_imgs:"Loading images\u2026",
  mode_mixed_t:"\uD83C\uDFB2 Mixed", mode_mixed_d:"All question types",
  mode_when_t:"\uD83C\uDCCF Guess When", mode_when_d:"Years / order / dating sources",
  mode_who_t:"\uD83E\uDDD1 Guess Who", mode_who_d:"People / groups / source authors",
  mode_why_t:"\uD83D\uDCA1 Guess Why", mode_why_d:"Causes / significance / key terms",
  mode_pic_t:"\uD83D\uDDBC\uFE0F Guess the Event", mode_pic_d:"Image + text clues"
},
zh:{
  subtitle:"\u9898\u5e93\u5168\u90e8\u6765\u81ea Henretta\u300aAmerica's History for the AP\u00ae Course\u300b\u7b2c 8 \u7248 \u00b7 \u9898\u76ee\u65e0\u9650\u751f\u6210",
  choose_lang:"\u9009\u62e9\u8bed\u8a00",
  lang_note:"\u968f\u65f6\u53ef\u4ee5\u5728\u53f3\u4e0a\u89d2 \uD83C\uDF10 \u5207\u6362\u3002",
  choose_period:"\u9009\u62e9\u4e00\u4e2a\u5386\u53f2\u65f6\u671f Period",
  hero_title:"\u9009\u4e00\u4e2a\u65f6\u671f\uff0c\u5f00\u59cb\u7b54\u9898\u3002",
  hero_sub:"\u5171 {n} \u9053\u9898 \u00b7 9 \u4e2a\u65f6\u671f \u00b7 \u65e0\u9650\u5237\u9898",
  period_meta:"{n} \u9053\u9898",
  period_acc:"\u6b63\u786e\u7387 {acc}",
  solution:"\uD83D\uDCA1 \u770b\u7b54\u6848",
  bank_line:"\u9898\u5e93 <b>{n}</b> \u4e2a\u8003\u70b9 \u00b7 \u221e \u9898\u76ee<br>\u6b63\u786e\u7387 {acc}{played}",
  played:"\uff08\u5df2\u7b54 {n}\uff09",
  review:"\uD83D\uDC15 \u9519\u9898\u672c",
  topics:"\uD83D\uDCDA \u8003\u70b9\u4e00\u89c8",
  footer1:"\u56fe\u7247\u6807\u6ce8\uff1aPDF \u5185\u56fe\u6ce8 \u201cHenretta \u7b2c8\u7248 p.X\u201d\uff1b\u5916\u90e8\u56fe\u6ce8\u6765\u6e90\u94fe\u63a5\u3002",
  footer2:"\u6df7\u5408 / \u731c When / \u731c Who / \u731c Why / \uD83D\uDDBC\uFE0F\u770b\u56fe\u731c\u4e8b\u4ef6 \u00b7 \u9009\u62e9\u9898 + \u586b\u7a7a\u9898 \u00b7 \u5373\u65f6\u53cd\u9988 \u00b7 \u672c\u5730\u8ba1\u5206",
  mode_hint:"\u9009\u62e9\u73a9\u6cd5\u6a21\u5f0f\uff08\u9898\u76ee\u4f1a\u65e0\u9650\u751f\u6210\uff0c\u7b54\u5bf9\u52a0\u5206\u3001\u8fde\u51fb\u52a0\u6210\uff09",
  start:"\u5f00\u59cb \u25B6", back:"\u2190 \u8fd4\u56de",
  score:"\u5f97\u5206", streak:"\u8fde\u51fb", acc:"\u6b63\u786e\u7387", answered:"\u5df2\u7b54",
  quit:"\u7ed3\u675f\u672c\u8f6e", next:"\u4e0b\u4e00\u9898 \u2192",
  fib_placeholder:"\u5728\u6b64\u8f93\u5165\u7b54\u6848\u2026", submit:"\u63d0\u4ea4",
  correct:"\u2705 \u6b63\u786e\uff01", wrong:"\u274c \u4e0d\u5bf9",
  answer_is:"\u7b54\u6848\uff1a",
  source:"\uD83D\uDCC2 \u51fa\u5904\uff1aHenretta\u300aAmerica's History for the AP\u00ae Course\u300b\u7b2c 8 \u7248 p.",
  no_questions:"\u8fd9\u4e2a\u65f6\u671f\u6682\u65f6\u6ca1\u6709\u53ef\u7528\u9898\u76ee\u3002",
  topics_title:"\uD83D\uDCDA \u8003\u70b9\u4e00\u89c8\uff08\u5168\u90e8\u6765\u81ea\u6559\u6750\u539f\u6587\uff09",
  topics_count:"\u5171 {n} \u4e2a\u8003\u70b9 \u00b7 \u5168\u90e8\u6765\u81ea\u6559\u6750\u539f\u6587",
  topics_empty:"\u8003\u70b9\u6570\u636e\u5c1a\u672a\u751f\u6210\u3002",
  f_when:"When:", f_who:"Who:", f_cause:"Why(\u56e0):", f_sig:"Why(\u679c):", f_page:"\u9875:",
  review_title:"\uD83D\uDC15 \u9519\u9898\u672c",
  review_hint:"\u7b54\u9519\u7684\u9898\u76ee\u4f1a\u81ea\u52a8\u6536\u5f55\u5728\u8fd9\u91cc\uff0c\u70b9\u201c\u91cd\u7ec3\u9519\u9898\u201d\u53ef\u4ee5\u9010\u9898\u518d\u7b54\u4e00\u6b21\u3002",
  retry:"\u91cd\u7ec3\u9519\u9898", clear:"\u6e05\u7a7a\u9519\u9898\u672c", review_empty:"\u9519\u9898\u672c\u662f\u7a7a\u7684\uff0c\u7ee7\u7eed\u52a0\u6cb9\uff01",
  no_wrong:"\u8fd9\u4e2a\u65f6\u671f\u6ca1\u6709\u9519\u9898 \uD83D\uDC4D",
  all_correct:"\uD83C\uDF89 \u9519\u9898\u5168\u90e8\u91cd\u7ec3\u6b63\u786e\uff01",
  confirm_clear:"\u6e05\u7a7a\u5168\u90e8\u9519\u9898\uff1f",
  tag_when_mcq:"WHEN \u00b7 \u9009\u62e9", tag_when_fib:"WHEN \u00b7 \u586b\u7a7a", tag_when_src:"WHEN \u00b7 \u53f2\u6599",
  tag_who_mcq:"WHO \u00b7 \u9009\u62e9", tag_who_fib:"WHO \u00b7 \u586b\u7a7a", tag_who_src:"WHO \u00b7 \u53f2\u6599",
  tag_why_mcq:"WHY \u00b7 \u9009\u62e9", tag_why_fib:"WHY \u00b7 \u586b\u7a7a",
  tag_pic:"PIC \u00b7 \u770b\u56fe\u731c\u4e8b\u4ef6",
  s_when_year:"\u4ee5\u4e0b\u4e8b\u4ef6\u53d1\u751f\u5728\u54ea\u4e00\u5e74\uff1f",
  s_when_year_fib:"\u586b\u7a7a\uff1a<b>{name}</b> \u53d1\u751f\u5728 ______ \u5e74\u3002",
  s_when_year_hint:"\u586b\u5e74\u4efd\u6570\u5b57\u5373\u53ef\uff0c\u524d\u540e 1 \u5e74\u4e5f\u7b97\u5bf9",
  s_when_first:"\u4ee5\u4e0b\u56db\u4e2a\u4e8b\u4ef6\u4e2d\uff0c<b>\u53d1\u751f\u5f97\u6700\u65e9</b>\u7684\u662f\u54ea\u4e00\u4e2a\uff1f",
  s_when_src:"\u9605\u8bfb\u4ee5\u4e0b\u53f2\u6599\uff08\u51fa\u81ea\u672c\u7ae0\uff09\uff0c\u5b83\u5927\u7ea6\u5199\u4e8e\u54ea\u4e00\u5e74\uff1f",
  s_who_mcq:"\u4ee5\u4e0b\u63cf\u8ff0\u7684\u662f<b>\u8c01</b>\uff08\u54ea\u4e2a\u4eba\u7269 / \u7fa4\u4f53\uff09\uff1f",
  s_who_fib:"\u586b\u7a7a\uff1a\u4ee5\u4e0b\u4e8b\u4ef6\u7684\u6838\u5fc3\u4eba\u7269 / \u7fa4\u4f53\u662f ______\u3002",
  s_who_fib_hint:"\u82f1\u6587\u540d\uff0c\u59d3\u4e5f\u53ef\uff08\u5982 {eg}\uff09",
  s_who_src:"\u4ee5\u4e0b\u53f2\u6599\uff08\u51fa\u81ea\u672c\u7ae0\uff09\u7684\u4f5c\u8005 / \u8bf4\u8bdd\u8005\u662f\u8c01\uff1f",
  s_why_cause:"<b>{name}</b> \u7684\u4e3b\u8981\u539f\u56e0\u662f\u4ec0\u4e48\uff1f",
  s_why_sig:"<b>{name}</b> \u7684\u5386\u53f2\u610f\u4e49\u662f\u4ec0\u4e48\uff1f",
  s_why_term:"\u586b\u7a7a\uff08\u5173\u952e\u8bcd\uff09\uff1a",
  s_why_term_q:"\u5173\u4e8e\u201c{name}\u201d\uff0c\u6559\u6750\u5f3a\u8c03\u7684\u5173\u952e\u6982\u5ff5\u662f ______\u3002",
  s_pic_mcq:"\u6839\u636e\u4e0b\u9762\u7684<b>\u56fe\u7247</b>\u548c<b>\u6587\u5b57\u7ebf\u7d22</b>\uff0c\u731c\u731c\u8fd9\u662f\u54ea\u4e00\u5386\u53f2\u4e8b\u4ef6\uff1f",
  s_pic_fib:"\u770b<b>\u56fe\u7247</b>\u5e76\u8bfb\u4e0b\u9762\u7684\u63cf\u8ff0\uff08\u4e8b\u4ef6\u540d\u5df2\u9690\u53bb\uff09\uff0c\u586b\u5199\u8fd9\u4e2a\u5386\u53f2\u4e8b\u4ef6\u7684\u540d\u79f0\uff1a",
  s_pic_fib_hint:"\u586b\u5199\u82f1\u6587\u4e8b\u4ef6\u540d",
  loading_imgs:"\u52a0\u8f7d\u56fe\u7247\u2026",
  mode_mixed_t:"\uD83C\uDFB2 \u6df7\u5408", mode_mixed_d:"\u5168\u90e8\u9898\u578b\u968f\u673a",
  mode_when_t:"\uD83C\uDCCF \u731c When", mode_when_d:"\u5e74\u4efd / \u5148\u540e / \u53f2\u6599\u65ad\u4ee3",
  mode_who_t:"\uD83E\uDDD1 \u731c Who", mode_who_d:"\u4eba\u7269 / \u7fa4\u4f53 / \u53f2\u6599\u4f5c\u8005",
  mode_why_t:"\uD83D\uDCA1 \u731c Why", mode_why_d:"\u539f\u56e0 / \u610f\u4e49 / \u5173\u952e\u6982\u5ff5",
  mode_pic_t:"\uD83D\uDDBC\uFE0F \u731c\u4e8b\u4ef6", mode_pic_d:"\u770b\u56fe + \u6587\u5b57\u731c\u4e8b\u4ef6\u540d"
},
es:{
  subtitle:"Todas las preguntas vienen de \u201cAmerica's History for the AP\u00ae Course\u201d de Henretta, 8.\u00aa ed. \u00b7 Preguntas ilimitadas",
  choose_lang:"Elige tu idioma",
  lang_note:"Puedes cambiarlo cuando quieras en el men\u00fa \uD83C\uDF10.",
  choose_period:"Elige un per\u00edodo hist\u00f3rico",
  hero_title:"Elige un per\u00edodo y empieza.",
  hero_sub:"{n} preguntas \u00b7 9 per\u00edodos \u00b7 rondas ilimitadas",
  period_meta:"{n} preguntas",
  period_acc:"{acc} correctas",
  solution:"\uD83D\uDCA1 Ver soluci\u00f3n",
  bank_line:"Banco: <b>{n}</b> temas \u00b7 \u221e preguntas<br>Precisi\u00f3n {acc}{played}",
  played:" ({n} respondidas)",
  review:"\uD83D\uDC15 Errores",
  topics:"\uD83D\uDCDA Temario",
  footer1:"Cr\u00e9ditos de im\u00e1genes: las del PDF se acreditan \u201cHenretta 8.\u00aa ed. p.X\u201d; las externas acreditan su fuente.",
  footer2:"Mixto / Adivina Cu\u00e1ndo / Adivina Qui\u00e9n / Adivina Por qu\u00e9 / \uD83D\uDDBC\uFE0F Adivina el evento \u00b7 Opci\u00f3n m\u00faltiple + completar \u00b7 Retroalimentaci\u00f3n inmediata \u00b7 Puntuaci\u00f3n local",
  mode_hint:"Elige un modo de juego (las preguntas son ilimitadas; acertar da puntos y rachas)",
  start:"Comenzar \u25B6", back:"\u2190 Atr\u00e1s",
  score:"Puntos", streak:"Racha", acc:"Precisi\u00f3n", answered:"Respondidas",
  quit:"Terminar", next:"Siguiente \u2192",
  fib_placeholder:"Escribe tu respuesta\u2026", submit:"Enviar",
  correct:"\u2705 \u00a1Correcto!", wrong:"\u274C Incorrecto",
  answer_is:"Respuesta: ",
  source:"\uD83D\uDCC2 Fuente: \u201cAmerica's History for the AP\u00ae Course\u201d de Henretta, 8.\u00aa ed., p.",
  no_questions:"A\u00fan no hay preguntas para este per\u00edodo.",
  topics_title:"\uD83D\uDCDA Temario (del libro de texto)",
  topics_count:"{n} temas \u00b7 todos del libro de texto",
  topics_empty:"Temario a\u00fan no generado.",
  f_when:"Cu\u00e1ndo:", f_who:"Qui\u00e9n:", f_cause:"Por qu\u00e9 (causa):", f_sig:"Por qu\u00e9 (significado):", f_page:"p.",
  review_title:"\uD83D\uDC15 Errores",
  review_hint:"Tus errores se guardan aqu\u00ed. Toca \u201cRepasar\u201d para responderlos de nuevo uno por uno.",
  retry:"Repasar errores", clear:"Borrar todo", review_empty:"\u00a1Sin errores por ahora!",
  no_wrong:"Sin errores para este per\u00edodo \uD83D\uDC4D",
  all_correct:"\uD83C\uDF89 \u00a1Todos los errores repasados correctamente!",
  confirm_clear:"\u00bfBorrar todos los errores?",
  tag_when_mcq:"WHEN \u00b7 Opci\u00f3n m\u00faltiple", tag_when_fib:"WHEN \u00b7 Completar", tag_when_src:"WHEN \u00b7 Fuente primaria",
  tag_who_mcq:"WHO \u00b7 Opci\u00f3n m\u00faltiple", tag_who_fib:"WHO \u00b7 Completar", tag_who_src:"WHO \u00b7 Fuente primaria",
  tag_why_mcq:"WHY \u00b7 Opci\u00f3n m\u00faltiple", tag_why_fib:"WHY \u00b7 Completar",
  tag_pic:"PIC \u00b7 Adivina el evento",
  s_when_year:"\u00bfEn qu\u00e9 a\u00f1o ocurri\u00f3 el siguiente evento?",
  s_when_year_fib:"Completa: <b>{name}</b> ocurri\u00f3 en el a\u00f1o ______.",
  s_when_year_hint:"Escribe el a\u00f1o; \u00b11 a\u00f1o tambi\u00e9n es correcto.",
  s_when_first:"\u00bfCu\u00e1l de los siguientes eventos ocurri\u00f3 <b>primero</b>?",
  s_when_src:"Lee esta fuente primaria (del cap\u00edtulo). \u00bfAproximadamente en qu\u00e9 a\u00f1o fue escrita?",
  s_who_mcq:"\u00bfA qui\u00e9n se describe a continuaci\u00f3n?",
  s_who_fib:"Completa: la persona / grupo central del siguiente evento es ______.",
  s_who_fib_hint:"Nombre en ingl\u00e9s; el apellido basta (p. ej., {eg}).",
  s_who_src:"\u00bfQui\u00e9n escribi\u00f3 / dijo esta fuente primaria (del cap\u00edtulo)?",
  s_why_cause:"\u00bfCu\u00e1l fue una causa principal de <b>{name}</b>?",
  s_why_sig:"\u00bfCu\u00e1l fue el significado hist\u00f3rico de <b>{name}</b>?",
  s_why_term:"Completa (t\u00e9rmino clave): ",
  s_why_term_q:"El concepto clave que el libro destaca sobre \u201c{name}\u201d es ______.",
  s_pic_mcq:"Seg\u00fan la <b>imagen</b> y las <b>pistas</b>, \u00bfqu\u00e9 evento hist\u00f3rico es este?",
  s_pic_fib:"Mira la <b>imagen</b> y lee la descripci\u00f3n (nombre oculto). \u00bfQu\u00e9 evento hist\u00f3rico es este?",
  s_pic_fib_hint:"Escribe el nombre del evento en ingl\u00e9s.",
  loading_imgs:"Cargando im\u00e1genes\u2026",
  mode_mixed_t:"\uD83C\uDFB2 Mixto", mode_mixed_d:"Todos los tipos de preguntas",
  mode_when_t:"\uD83C\uDCCF Adivina Cu\u00e1ndo", mode_when_d:"A\u00f1os / orden / fechar fuentes",
  mode_who_t:"\uD83E\uDDD1 Adivina Qui\u00e9n", mode_who_d:"Personas / grupos / autores",
  mode_why_t:"\uD83D\uDCA1 Adivina Por qu\u00e9", mode_why_d:"Causas / significado / t\u00e9rminos clave",
  mode_pic_t:"\uD83D\uDDBC\uFE0F Adivina el Evento", mode_pic_d:"Imagen + pistas de texto"
}};
function tr(k){ const s=STR[LANG]||STR.en; return (s&&s[k]!=null)?s[k]:(STR.en[k]!=null?STR.en[k]:k); }
/* pick a content field in the current language, English fallback */
function pick(o,base){
  if(!o) return "";
  if(LANG==="es"&&o[base+"_es"]) return o[base+"_es"];
  if(LANG==="zh"&&o[base+"_zh"]) return o[base+"_zh"];
  return o[base+"_en"]||o[base]||"";
}
function pickWho(o){
  if(!o) return [];
  if(LANG==="es"&&o.who_es&&o.who_es.length) return o.who_es;
  if(LANG==="zh"&&o.who_zh&&o.who_zh.length) return o.who_zh;
  return o.who||[];
}
function dispName(t){ const n=pick(t,"topic"); return n||t.topic_en; }
function setLang(l){
  if(LANGS.indexOf(l)<0) return;
  LANG=l; try{ localStorage.setItem("apush_guesser_lang",l); }catch(e){}
  const sel=$("langSel"); if(sel) sel.value=l;
  applyI18n();
}
/* image credit stored in Chinese in the data files; display in English */
function imgCredit(t){
  const c=(t.img&&t.img.credit)||"";
  const m=String(c).match(/p\.(\d+)/);
  return "Image: Henretta's \u201cAmerica's History\u201d, 8th ed."+(m?", p."+m[1]:"");
}

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
function pname(p){
  const x=PERIODS.find(v=>v.id===p);
  if(!x) return "Period "+p;
  const nm=LANG==="es"&&x.es?x.es:(LANG==="zh"?x.zh:x.en);
  return "Period "+p+" \u00b7 "+nm+" ("+x.range+")";
}

/* ---------------- game state ---------------- */
let G={period:1,mode:"mixed",score:0,streak:0,total:0,correct:0,q:null,retryQueue:null};

/* ---------------- distractor pools ---------------- */
function poolVals(p,fn){ const s=new Set(); topicsOf(p).forEach(t=>{const v=fn(t); if(Array.isArray(v)) v.forEach(x=>{if(x) s.add(x);}); else if(v) s.add(v);}); return [...s]; }
function pickN(arr,n,excl){ const set=new Set((excl||[]).map(String)); const out=[]; for(const x of shuffle(arr)){ if(!set.has(String(x))&&out.length<n){out.push(x); set.add(String(x));} } return out; }

/* ---------------- templates ----------------
   q = {tag, tagCls, promptHTML, kind:'mcq'|'fib', options:[{t,ok}], answerText,
        check(user)->bool, explainHTML, citeHTML, topic} */
function mkCite(t){
  return tr("source")+(t.page||"?");
}
function mkExplain(t){
  const e=pick(t,"exp");
  if(e) return "<div>"+esc(e)+"</div>";
  const w=pick(t,"what");
  return "<div>"+esc(w||"")+"</div>";
}
/* topic.img.file is either a path or "img:<key>" resolved from window.APUSH_IMGS
   (base64 data URIs in data/images_*.js, lazy-loaded when a pic mode starts) */
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
  return "<div><img class='qimg' src='"+u+"'><div class='imgcredit'>"+esc(imgCredit(t))+"</div></div>";
}
function srcHTML(t){
  if(!t.src||!t.src.text) return "";
  return "<div class='src'>\u201c"+esc(t.src.text)+"\u201d"+(t.src.attr?"<br>\u2014 "+esc(t.src.attr):"")+"</div>";
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
/* ---- anti-leak: never show the answer inside the question prompt ----
   WHO -> hide person/group names (full names + surname tokens)
   WHEN -> hide 4-digit years (incl. 1790s style)
   event name already handled by redact() for pic mode */
function redactWords(text,words){
  let out=String(text||"");
  const escRe=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const seen=new Set();
  (words||[]).forEach(w=>{
    const word=String(w||"").trim();
    if(word.length<3) return;
    const key=word.toLowerCase();
    if(seen.has(key)) return;
    seen.add(key);
    const pat=/[\u4e00-\u9fff]/.test(word)?escRe(word):"\\b"+escRe(word)+"\\b";
    out=out.replace(new RegExp(pat,"gi"),"______");
  });
  return out;
}
/* every name variant that could leak the answer: en/zh/es + individual tokens.
   common stopwords are skipped so "the" etc. don't nuke the whole prompt. */
const STOPWORDS=new Set(("the and for nor but or yet so a an of to in on at by de del al la le les des du der die das van von el los las un una uno et per e y o u por para con sin sobre entre hasta desde as be is are was were it its his her their our your my me we us they them this that these those with from into over under").split(" "));
function leakNames(t){
  const names=[];
  ["who","who_zh","who_es"].forEach(k=>{ (t[k]||[]).forEach(w=>names.push(w)); });
  const extra=[];
  names.forEach(n=>String(n).split(/[\s\u00b7\u30fb\-\\\u2013\u2014\/,;.'\u2019]+/).forEach(tok=>{
    const w=tok.trim();
    if(w.length>=3&&!STOPWORDS.has(w.toLowerCase())) extra.push(w);
  }));
  return names.concat(extra);
}
function redactYears(text){
  return String(text||"")
    .replace(/\b(1\d{3}|20\d{2})s\b/g,"______")
    .replace(/\b(1\d{3}|20\d{2})\b/g,"______");
}
/* primary-source block with answer hints scrubbed */
function srcHTMLClean(t,mode){
  if(!t.src||!t.src.text) return "";
  let txt=t.src.text, attr=t.src.attr||"";
  if(mode==="when"){ txt=redactYears(txt); attr=redactYears(attr); }
  if(mode==="who"){ const ns=leakNames(t); txt=redactWords(txt,ns); attr=redactWords(attr,ns); }
  return "<div class='src'>\u201c"+esc(txt)+"\u201d"+(attr?"<br>\u2014 "+esc(attr):"")+"</div>";
}

const T={
/* ---- WHEN ---- */
when_year_mcq(p,t){
  if(t.year==null) return null;
  const years=poolVals(p,x=>x.year).filter(y=>y!=null).map(Number).filter(y=>!isNaN(y)&&y>1000&&y!==t.year);
  const d=pickN(years,3,[t.year]).map(String);
  if(d.length<3) return null;
  const nm=redactYears(dispName(t)), what=redactYears(pick(t,"what"));
  const opts=shuffle([{t:String(t.year),ok:1},...d.map(x=>({t:x,ok:0}))]);
  return {tag:tr("tag_when_mcq"),cls:"",topic:t,kind:"mcq",options:opts,
    promptHTML:tr("s_when_year")+"<br><b>"+esc(nm)+"</b><br><span style='color:var(--mut)'>"+esc(what)+"</span>"+imgHTML(t,true),
    answerText:String(t.year)+(t.year_text&&t.year_text!==String(t.year)?"("+t.year_text+")":""),
    check:u=>u===String(t.year)};
},
when_year_fib(p,t){
  if(t.year==null) return null;
  const nm=redactYears(dispName(t)), what=redactYears(pick(t,"what"));
  return {tag:tr("tag_when_fib"),cls:"",topic:t,kind:"fib",
    promptHTML:fmt(tr("s_when_year_fib"),{name:esc(nm)})+"<br><span style='color:var(--mut)'>"+esc(what)+"</span>"+
      "<br><span class='kbd-hint'>"+esc(tr("s_when_year_hint"))+"</span>"+imgHTML(t,true),
    answerText:String(t.year)+(t.year_text&&t.year_text!==String(t.year)?"("+t.year_text+")":""),
    check:u=>{const m=String(u).match(/\d{3,4}/); return m&&Math.abs(parseInt(m[0],10)-t.year)<=1;}};
},
when_first_mcq(p,t){
  const cands=topicsOf(p).filter(x=>x.year!=null&&x.id!==t.id);
  if(cands.length<3) return null;
  const picks=shuffle(cands).slice(0,3).concat([t]);
  const years=picks.map(x=>x.year);
  if(new Set(years).size<4) return null;
  const first=picks.reduce((a,b)=>a.year<b.year?a:b);
  /* hide years inside event names (e.g. "Treaty of Paris (1763)"); options must stay distinct */
  const optNames=picks.map(x=>redactYears(dispName(x)));
  if(new Set(optNames).size<4) return null;
  const firstName=redactYears(dispName(first));
  const opts=shuffle(picks.map((x,i)=>({t:optNames[i],ok:x.id===first.id?1:0})));
  return {tag:tr("tag_when_mcq"),cls:"",topic:t,kind:"mcq",options:opts,
    promptHTML:tr("s_when_first"),
    answerText:firstName+"("+first.year+")",
    check:u=>u===firstName};
},
when_src_mcq(p,t){
  if(!t.src||!t.src.text||t.year==null) return null;
  const years=poolVals(p,x=>x.year).filter(y=>y!=null).map(Number).filter(y=>!isNaN(y)&&y>1000&&y!==t.year);
  const d=pickN(years,3,[t.year]).map(String);
  if(d.length<3) return null;
  const opts=shuffle([{t:String(t.year),ok:1},...d.map(x=>({t:x,ok:0}))]);
  return {tag:tr("tag_when_src"),cls:"",topic:t,kind:"mcq",options:opts,
    promptHTML:tr("s_when_src")+srcHTMLClean(t,"when"),
    answerText:String(t.year),check:u=>u===String(t.year)};
},
/* ---- WHO ---- */
who_mcq(p,t){
  const who=pickWho(t);
  if(!who.length) return null;
  const ans=who[0];
  const others=poolVals(p,x=>pickWho(x)).filter(w=>who.indexOf(w)<0);
  const d=pickN(others,3,who);
  if(d.length<3) return null;
  const ns=leakNames(t);
  const what=redactWords(pick(t,"what"),ns), nm=redactWords(dispName(t),ns);
  const opts=shuffle([{t:ans,ok:1},...d.map(x=>({t:x,ok:0}))]);
  return {tag:tr("tag_who_mcq"),cls:"who",topic:t,kind:"mcq",options:opts,
    promptHTML:tr("s_who_mcq")+"<br><span style='color:var(--mut)'>"+esc(what||nm)+"</span>"+imgHTML(t,true),
    answerText:ans,check:u=>u===ans};
},
who_fib(p,t){
  const who=pickWho(t);
  if(!who.length) return null;
  const acc=[];
  ["who","who_zh","who_es"].forEach(k=>{ (t[k]||[]).forEach(w=>acc.push(norm(w))); });
  const last=(t.who||[]).map(w=>norm(w).split(" ").pop());
  const ns=leakNames(t);
  const what=redactWords(pick(t,"what"),ns), nm=redactWords(dispName(t),ns);
  /* example surname in the hint must not be (part of) the answer */
  const egPool=["Adams","Jefferson","Madison","Monroe","Jackson","Lincoln","Grant","Cleveland"];
  const nsN=ns.map(norm);
  const eg=egPool.find(n=>!nsN.some(x=>x.indexOf(norm(n))>=0))||"Adams";
  return {tag:tr("tag_who_fib"),cls:"who",topic:t,kind:"fib",
    promptHTML:tr("s_who_fib")+"<br><span style='color:var(--mut)'>"+esc(what||nm)+"</span>"+
      "<br><span class='kbd-hint'>"+esc(fmt(tr("s_who_fib_hint"),{eg:eg}))+"</span>"+imgHTML(t,true),
    answerText:who.join("\uff1b"),
    check:u=>{const n=norm(u); if(n.length<2) return false;
      return acc.some(a=>a===n)||last.some(a=>a===n&&n.length>=3);}};
},
who_src_mcq(p,t){
  const who=pickWho(t);
  if(!t.src||!t.src.text||!who.length) return null;
  const ans=who[0];
  /* guard: the excerpt must plausibly be BY the answer. If the (English) name
     never appears in the excerpt or its attribution, "who wrote this?" would
     teach the wrong author -> skip this template for the topic. */
  const enAns=(t.who&&t.who[0])||ans;
  const blob=((t.src.text||"")+" "+(t.src.attr||"")).toLowerCase();
  const an=String(enAns).toLowerCase();
  let authorOk=an.length>=3&&blob.indexOf(an)>=0;
  if(!authorOk){
    authorOk=an.split(/[\s\u00b7\u30fb\-\\\u2013\u2014\/,;.'\u2019]+/)
      .some(tok=>tok.length>=4&&!STOPWORDS.has(tok)&&blob.indexOf(tok)>=0);
  }
  if(!authorOk) return null;
  const others=poolVals(p,x=>pickWho(x)).filter(w=>who.indexOf(w)<0);
  const d=pickN(others,3,who);
  if(d.length<3) return null;
  const opts=shuffle([{t:ans,ok:1},...d.map(x=>({t:x,ok:0}))]);
  return {tag:tr("tag_who_src"),cls:"who",topic:t,kind:"mcq",options:opts,
    promptHTML:tr("s_who_src")+srcHTMLClean(t,"who"),
    answerText:ans,check:u=>u===ans};
},
/* ---- WHY ---- */
why_cause_mcq(p,t){
  const cause=pick(t,"cause");
  if(!cause) return null;
  const others=poolVals(p,x=>pick(x,"cause")).filter(c=>c!==cause);
  const d=pickN(others,3,[cause]);
  if(d.length<3) return null;
  const nm=dispName(t);
  const opts=shuffle([{t:cause,ok:1},...d.map(x=>({t:x,ok:0}))]);
  return {tag:tr("tag_why_mcq"),cls:"why",topic:t,kind:"mcq",options:opts,
    promptHTML:fmt(tr("s_why_cause"),{name:esc(nm)}),
    answerText:cause,check:u=>u===cause};
},
why_sig_mcq(p,t){
  const sig=pick(t,"sig");
  if(!sig) return null;
  const others=poolVals(p,x=>pick(x,"sig")).filter(c=>c!==sig);
  const d=pickN(others,3,[sig]);
  if(d.length<3) return null;
  const nm=dispName(t);
  const opts=shuffle([{t:sig,ok:1},...d.map(x=>({t:x,ok:0}))]);
  return {tag:tr("tag_why_mcq"),cls:"why",topic:t,kind:"mcq",options:opts,
    promptHTML:fmt(tr("s_why_sig"),{name:esc(nm)}),
    answerText:sig,check:u=>u===sig};
},
why_term_fib(p,t){
  if(!t.why_term) return null;
  const keys=(t.why_term_accept||[t.why_term]).map(norm);
  /* the topic name itself may contain the key term -> scrub it */
  const termWords=[t.why_term].concat(t.why_term_accept||[]);
  const nm=redactWords(dispName(t),termWords);
  let qtext=null;
  if(LANG==="es"&&t.why_term_q_es) qtext=t.why_term_q_es;
  else if(LANG==="zh"&&t.why_term_q) qtext=t.why_term_q;
  const prompt=qtext||fmt(tr("s_why_term_q"),{name:nm});
  return {tag:tr("tag_why_fib"),cls:"why",topic:t,kind:"fib",
    promptHTML:tr("s_why_term")+esc(prompt),
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
  const nm=dispName(t);
  const others=topicsOf(p).filter(x=>x.id!==t.id);
  const d=shuffle(others).slice(0,3);
  if(d.length<3) return null;
  const opts=shuffle([{t:nm,ok:1}].concat(d.map(x=>({t:dispName(x),ok:0}))));
  const hints=[];
  if(t.year_text) hints.push("\uD83D\uDCC5 "+t.year_text);
  const who=pickWho(t);
  if(who.length) hints.push("\uD83E\uDDD1 "+who.slice(0,3).join(", "));
  return {tag:tr("tag_pic"),cls:"pic",topic:t,kind:"mcq",options:opts,
    promptHTML:tr("s_pic_mcq")+
      (hints.length?"<br><span class='kbd-hint'>"+esc(hints.join(" \u00b7 "))+"</span>":"")+
      imgHTML(t,true),
    answerText:nm,
    check:function(u){return u===nm;}};
};
T.pic_event_fib=function(p,t){
  if(!imgURL(t)) return null;
  const nm=dispName(t);
  let desc=pick(t,"what")||pick(t,"sig")||"";
  desc=redact(redact(desc,t.topic_en),nm);
  const acc=[norm(t.topic_en)];
  if(t.topic_zh) acc.push(norm(t.topic_zh));
  if(t.topic_es) acc.push(norm(t.topic_es));
  return {tag:tr("tag_pic"),cls:"pic",topic:t,kind:"fib",
    promptHTML:tr("s_pic_fib")+
      imgHTML(t,true)+
      "<div style='margin:8px 0;color:#cbd5e1'>"+esc(desc)+"</div>"+
      (t.year_text?"<div class='kbd-hint'>\uD83D\uDCC5 "+esc(t.year_text)+"</div>":"")+
      "<div class='kbd-hint'>"+esc(tr("s_pic_fib_hint"))+"</div>",
    answerText:nm,
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
let currentView="view-home", lastTopicsSel=1;
function show(v){ currentView=v; VIEWS.forEach(x=>$(x).classList.toggle("on",x===v)); window.scrollTo(0,0); }

function applyI18n(){
  const S=id=>$(id);
  if(S("hdrSub")) S("hdrSub").textContent=tr("subtitle");
  if(S("heroTitle")) S("heroTitle").textContent=tr("hero_title");
  if(S("heroSub")){
    let n=0; try{ PERIODS.forEach(pd=>{ n+=topicsOf(pd.id).length; }); }catch(e){}
    S("heroSub").textContent=fmt(tr("hero_sub"),{n:n});
  }
  if(S("btnSolution")) S("btnSolution").textContent=tr("solution");
  if(S("btnReview")) S("btnReview").innerHTML=esc(tr("review"))+" <span id='reviewCount'></span>";
  if(S("btnTopics")) S("btnTopics").textContent=tr("topics");
  if(S("footer1")) S("footer1").textContent=tr("footer1");
  if(S("footer2")) S("footer2").textContent=tr("footer2");
  if(S("modeHint")) S("modeHint").textContent=tr("mode_hint");
  if(S("btnStart")&&!S("btnStart").disabled) S("btnStart").textContent=tr("start");
  ["btnBackHome1","btnBackHome2","btnBackHome3"].forEach(id=>{ if(S(id)) S(id).textContent=tr("back"); });
  if(S("hScoreL")) S("hScoreL").textContent=tr("score");
  if(S("hStreakL")) S("hStreakL").textContent=tr("streak");
  if(S("hAccL")) S("hAccL").textContent=tr("acc");
  if(S("hTotalL")) S("hTotalL").textContent=tr("answered");
  if(S("btnNext")) S("btnNext").textContent=tr("next");
  if(S("btnQuit")) S("btnQuit").textContent=tr("quit");
  if(S("topicsTitle")) S("topicsTitle").textContent=tr("topics_title");
  if(S("reviewTitle")) S("reviewTitle").textContent=tr("review_title");
  if(S("reviewHint")) S("reviewHint").textContent=tr("review_hint");
  if(S("btnRetryWrong")) S("btnRetryWrong").textContent=tr("retry");
  if(S("btnClearWrong")) S("btnClearWrong").textContent=tr("clear");
  // re-render the visible view so dynamic text follows the language
  if(currentView==="view-home") renderHome();
  else if(currentView==="view-mode") renderMode();
  else if(currentView==="view-topics") renderTopics(lastTopicsSel);
  else if(currentView==="view-review") renderReview();
}

function renderHome(){
  const g=$("periodGrid"); g.innerHTML="";
  PERIODS.forEach(pd=>{
    const n=topicsOf(pd.id).length, st=store.stats[pd.id];
    const acc=st&&st.total?Math.round(100*st.correct/st.total)+"%":null;
    const title=LANG==="es"&&pd.es?pd.es:(LANG==="zh"?pd.zh:pd.en);
    const d=document.createElement("div"); d.className="period";
    d.setAttribute("role","button"); d.setAttribute("tabindex","0");
    d.innerHTML="<div class='pnum'>"+pd.id+"</div>"+
      "<div class='pbody'>"+
      "<div class='prange'>"+esc(pd.range)+"</div>"+
      "<div class='ptitle'>"+esc(title)+"</div>"+
      "<div class='pmeta'>"+esc(fmt(tr("period_meta"),{n:n}))+(acc?" \u00b7 "+esc(fmt(tr("period_acc"),{acc:acc})):"")+"</div>"+
      "</div><div class='pgo'>\u203a</div>";
    d.onclick=()=>{G.period=pd.id; renderMode(); show("view-mode");};
    d.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); d.onclick(); } };
    g.appendChild(d);
  });
  const rc=$("reviewCount");
  if(rc) rc.textContent=store.wrong.length?("("+store.wrong.length+")"):"";
}

function MODES(){
  return [
    {id:"mixed",t:tr("mode_mixed_t"),d:tr("mode_mixed_d")},
    {id:"when",t:tr("mode_when_t"),d:tr("mode_when_d")},
    {id:"who",t:tr("mode_who_t"),d:tr("mode_who_d")},
    {id:"why",t:tr("mode_why_t"),d:tr("mode_why_d")},
    {id:"pic",t:tr("mode_pic_t"),d:tr("mode_pic_d")},
  ];
}
let selMode="mixed";
function renderMode(){
  $("modePeriodTitle").textContent=pname(G.period);
  const g=$("modeGrid"); g.innerHTML="";
  MODES().forEach(m=>{
    const d=document.createElement("div");
    d.className="mode"+(m.id===selMode?" sel":"");
    d.innerHTML="<div class='t'>"+esc(m.t)+"</div><div class='d'>"+esc(m.d)+"</div>";
    d.onclick=()=>{selMode=m.id; renderMode();};
    g.appendChild(d);
  });
}

function hud(){
  $("hScore").textContent=G.score; $("hStreak").textContent=G.streak; $("hTotal").textContent=G.total;
  $("hAcc").textContent=G.total?Math.round(100*G.correct/G.total)+"%":"\u2013";
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
  if(!q){ $("qPrompt").innerHTML="<div class='empty'>"+esc(tr("no_questions"))+"</div>"; $("qBody").innerHTML=""; return; }
  G.q=q; window.__lastQ=q; markRecent(G.period,q.topicId);
  const tag=$("qTag"); tag.textContent=q.tag; tag.className="qtag "+(q.cls||"");
  $("qPrompt").innerHTML=q.promptHTML;
  q._hasImgInPrompt=q.promptHTML.indexOf("qimg")>=0;
  const body=$("qBody"); body.innerHTML="";
  const fb=$("qFeedback"); fb.className="feedback"; fb.innerHTML="";
  $("btnNext").style.display="none";
  $("btnSolution").style.display="inline-block";
  if(q.kind==="mcq"){
    shuffle(q.options).forEach(o=>{
      const b=document.createElement("button"); b.className="opt"; b.textContent=o.t;
      b.onclick=()=>answer(o.t,!!o.ok);
      body.appendChild(b);
    });
  }else{
    const row=document.createElement("div"); row.className="fibrow";
    const inp=document.createElement("input"); inp.placeholder=tr("fib_placeholder");
    const btn=document.createElement("button"); btn.className="btn"; btn.textContent=tr("submit");
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
  let h="<div class='verdict'>"+esc(ok?tr("correct"):tr("wrong"))+"</div>";
  h+="<div class='exp'><b>"+esc(tr("answer_is"))+"</b>"+esc(q.answerText)+"</div>";
  h+="<div class='exp' style='margin-top:8px'>"+q.explainHTML+"</div>";
  const tp=q.topic;
  const iu=imgURL(tp);
  if(iu&&!q._hasImgInPrompt)
    h+="<div><img class='qimg' src='"+iu+"'><div class='imgcredit'>"+esc(imgCredit(tp))+"</div></div>";
  h+="<div class='cite'>"+q.citeHTML+"</div>";
  fb.innerHTML=h;
  $("btnNext").style.display="inline-block";
  $("btnSolution").style.display="none";

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
    setTimeout(()=>{alert(tr("all_correct"));},300);
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
    const bs=$("btnStart"); bs.textContent=tr("start"); bs.disabled=false;
    const st=pstat(G.period);
    G.score=st.score||0; G.streak=0; G.total=0; G.correct=0;
    G.retryQueue=retry?store.wrong.filter(w=>w.pid===G.period).map(w=>({pid:w.pid,tid:w.tid,template:w.template})):null;
    if(retry&&!G.retryQueue.length){ alert(tr("no_wrong")); return; }
    hud(); show("view-play"); nextQuestion();
  };
  if(selMode==="pic"||selMode==="mixed"){
    const bs=$("btnStart"); bs.textContent=tr("loading_imgs"); bs.disabled=true;
    ensureImages(begin);
  }else begin();
}

/* ---------------- topics browser ---------------- */
function renderTopics(sel){
  sel=sel||1; lastTopicsSel=sel;
  const tabs=$("topicTabs"); tabs.innerHTML="";
  PERIODS.forEach(pd=>{
    const b=document.createElement("button");
    b.className="tab"+(pd.id===sel?" sel":"");
    b.textContent="P"+pd.id+" "+(LANG==="es"&&pd.es?pd.es:(LANG==="zh"?pd.zh:pd.en));
    b.onclick=()=>renderTopics(pd.id);
    tabs.appendChild(b);
  });
  const list=$("topicList"); list.innerHTML="";
  const ts=topicsOf(sel);
  if(!ts.length){ list.innerHTML="<div class='empty'>"+esc(tr("topics_empty"))+"</div>"; return; }
  const h=document.createElement("div"); h.className="kbd-hint";
  h.textContent=fmt(tr("topics_count"),{n:ts.length}); list.appendChild(h);
  ts.forEach(x=>{
    const d=document.createElement("div"); d.className="titem";
    const who=pickWho(x);
    d.innerHTML="<h4>"+esc(dispName(x))+"</h4>"+
      "<div class='meta'>"+
      (x.year_text?"<b>"+esc(tr("f_when"))+"</b> "+esc(x.year_text)+"<br>":"")+
      (who.length?"<b>"+esc(tr("f_who"))+"</b> "+esc(who.join(", "))+"<br>":"")+
      (pick(x,"cause")?"<b>"+esc(tr("f_cause"))+"</b> "+esc(pick(x,"cause"))+"<br>":"")+
      (pick(x,"sig")?"<b>"+esc(tr("f_sig"))+"</b> "+esc(pick(x,"sig"))+"<br>":"")+
      "<b>"+esc(tr("f_page"))+"</b> "+esc(x.page||"?")+"</div>";
    list.appendChild(d);
  });
}

/* ---------------- review ---------------- */
function renderReview(){
  const list=$("reviewList"); list.innerHTML="";
  if(!store.wrong.length){ list.innerHTML="<div class='empty'>"+esc(tr("review_empty"))+"</div>"; return; }
  store.wrong.slice(0,60).forEach(w=>{
    const d=document.createElement("div"); d.className="rev-item";
    d.innerHTML="<div class='rq'>\u2753 "+esc(w.q)+"\u2026</div>"+
      "<div class='ra'>\u2714 "+esc(w.a)+"</div>"+
      "<div class='kbd-hint'>Period "+w.pid+" \u00b7 "+esc(w.template)+"</div>";
    list.appendChild(d);
  });
}

/* ---------------- wire up ---------------- */
$("btnStart").onclick=()=>startPlay(false);
$("btnNext").onclick=nextQuestion;
/* solution: reveal the answer, counted as wrong */
$("btnSolution").onclick=()=>{ const q=G.q; if(q&&!q._done) answer("__solution__",false); };
$("btnQuit").onclick=()=>{ renderHome(); show("view-home"); };
$("btnBackHome1").onclick=()=>show("view-home");
$("btnBackHome2").onclick=()=>show("view-home");
$("btnBackHome3").onclick=()=>show("view-home");
$("btnReview").onclick=()=>{ renderReview(); show("view-review"); };
$("btnTopics").onclick=()=>{ renderTopics(1); show("view-topics"); };
$("btnClearWrong").onclick=()=>{ if(confirm(tr("confirm_clear"))){ store.wrong=[]; save(); renderReview(); } };
$("btnRetryWrong").onclick=()=>{ renderMode(); show("view-mode"); selMode="mixed"; renderMode();
  setTimeout(()=>startPlay(true),50); };
const _ls=$("langSel");
if(_ls){ _ls.value=LANG; _ls.onchange=()=>setLang(_ls.value); }

/* init */
applyI18n(); renderHome(); show("view-home");

/* node smoke-test hook (harmless in browser) */
if(typeof module!=="undefined"&&module.exports){
  module.exports={generateQuestion:generateQuestion,topicsOf:topicsOf,T:T,BY_MODE:BY_MODE,store:store,
    tr:tr,pick:pick,dispName:dispName,setLang:setLang,
    leakNames:leakNames,redactWords:redactWords,redactYears:redactYears,
    _test:{nextQuestion:nextQuestion,answer:answer,startPlay:startPlay,getG:function(){return G;},show:show}};
}
})();
