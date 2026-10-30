# 西班牙语翻译规范（给翻译 agent）

## 输入
`/home/hatch/workspace/apush-guesser/data/topics_raw_N.json`（N=1..9），每个考点已有英文（`*_en`，来自教材原文，权威）和中文（`*_zh`）字段。

## 输出
同一个文件，原地添加西班牙语字段（**用 python3 + json.dump 写回，ensure_ascii=False**，写完重新读入校验）。

## 要添加的字段（每个 topic）
- `topic_es`：事件/主题名的西班牙语译名
- `what_es`：由 `what_en` 翻译
- `cause_es`：由 `cause_en` 翻译
- `sig_es`：由 `sig_en` 翻译
- `exp_es`：由 `exp_en` 翻译
- `who_es`：数组，与 `who` 一一对应。**人名保持英文原名不变**（如 "George Washington" 不翻译）；描述性群体名翻译（如 "Sons of Liberty" → "Hijos de la Libertad"）。
- `why_term_q_es`：仅当该 topic 有 `why_term_q` 时才加，由其翻译。

## 翻译规则
- 以英文为准翻译（英文直接来自教材），不要按中文转译。
- 专有名词保持英文原形：人名、地名、法案/条约/书名的官方英文名（如 Stamp Act、Common Sense、Bill of Rights）。通用概念词翻译（如 "tariff" → "arancel"）。
- 年份、数字、"c." / "–" 等时间表达原样保留。
- 风格：中性、简洁的学术西班牙语（AP 考试风格），每字段与英文长度相当。
- 不要添加英文里没有的新事实，只做忠实翻译。
- 不要动已有任何字段，只添加新字段。

## 校验
写回后用 python 重新读入：合法 JSON、topic 数量不变、每个 topic 都有 topic_es/what_es/cause_es/sig_es/exp_es/who_es（who_es 长度与 who 一致）、无空字符串。
