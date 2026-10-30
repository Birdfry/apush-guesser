# APUSH 考点提炼规范（给提炼 agent）

## 输入
`/home/hatch/workspace/apush-guesser/data/parts/part_N.txt`（N=1..9），内容为 Henretta《America's History for the AP® Course》第 8 版
对应 Part 的全部正文文本，每页有 `===== BOOK PAGE <书页> =====` 标记。书页即题目引用页。

## 输出
`/home/hatch/workspace/apush-guesser/data/topics_raw_N.json`：JSON 数组，每个元素一个考点对象。
**必须用 python3 + json.dump 写入文件**（不要手写 JSON，muse.write 会破坏转义）。

## 考点对象 schema
```json
{
  "id": "p3-001",
  "period": 3,
  "topic_en": "Boston Tea Party",
  "topic_zh": "波士顿倾茶事件",
  "year": 1773,
  "year_text": "December 1773",
  "who": ["Sons of Liberty"],
  "who_zh": ["自由之子"],
  "what_en": "In December 1773, Boston radicals disguised as Indians boarded British ships and dumped 342 chests of tea into the harbor to protest the Tea Act.",
  "what_zh": "1773年12月，波士顿激进分子装扮成印第安人登上英国商船，将342箱茶叶倒入海港，抗议《茶叶法》。",
  "cause_en": "Parliament's Tea Act of 1773 gave the British East India Company a monopoly on tea sales, which colonists saw as another unconstitutional tax.",
  "cause_zh": "议会1773年《茶叶法》给予英国东印度公司茶叶专卖权，殖民者视之为又一项违宪税收。",
  "sig_en": "Parliament responded with the Coercive Acts, which united the colonies in opposition and led directly to the First Continental Congress.",
  "sig_zh": "议会以《强制法案》回应，反而使各殖民地团结起来反对英国，并直接促成了第一届大陆会议。",
  "why_term": "taxation without representation",
  "why_term_q": "殖民者抗议的核心口号（关键词）是 ______。",
  "exp_en": "The Tea Party was a protest against the Tea Act's monopoly and the principle of parliamentary taxation. Its punishment via the Coercive Acts backfired, pushing colonies toward collective resistance.",
  "exp_zh": "倾茶事件抗议《茶叶法》的专卖权与议会征税原则。英国以《强制法案》惩罚反而激起殖民地集体反抗。",
  "page": 158,
  "src": {"text": "…exact short quote from the book…", "attr": "Attribution as printed in the book"}
}
```

## 字段规则
- **严格只用 part 文本**：所有事实（年份、人名、原因、意义、引文）必须能在文本中找到。不要用外部知识；不确定的年份写 `year: null`（只填 `year_text` 如 "mid-1700s"），该考点将自动跳过年份题。
- `who`：书中出现的英文原名拼写；群体（如 "Sons of Liberty"）也可。
- `cause_en/sig_en`：各一句话，来自书中叙述；尽量保证每个考点都有（它们是 Why 题目的干扰项池）。
- `what_en`：1–2 句，来自书中描述。
- `src`：仅当书中明确印出一段 primary source 引文时才填，`text` 不超过 60 词，必须是原文引用，`attr` 照书中署名写。没有就省略该字段。
- `why_term`：可选；仅当教材明确强调某个关键概念/口号时填。
- `page`：该考点在书中主要讨论的书页号（数字）。
- `id`：`pN-001` 起按顺序编号。
- `topic_zh/what_zh/cause_zh/sig_zh/exp_zh/who_zh`：准确简洁的中文，AP 术语风格。
- 同一 Part 内考点不得重复；覆盖政治、经济、社会、文化、外交/军事各方面。
- 优先从每章末尾的 AP® 复习 / Key Terms / Chronology / 本章 primary source 里抓考点，再补正文大节标题下的重要事件。

## 数量目标
- Part 1: 40 · Part 2: 45 · Part 3: 60 · Part 4: 60 · Part 5: 60 · Part 6: 60 · Part 7: 60 · Part 8: 55 · Part 9: 45

## 校验
写完后用 python 重新读一遍 JSON，确保：合法 JSON、字段齐全、无重复 id、year 为整数或 null、page 为数字。
