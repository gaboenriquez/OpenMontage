---
name: post-publish-review
description: Use when the user asks how a published Short performed, why it did or did not take off, or says "revisa el video", "cómo fue", "haz el post-mortem" — pulls the numbers, grades the video against the channel's own median and subscriber base, attributes the result to specific lines, shots or drop-off points, and deposits at least one reusable asset (hook, title, rule, hypothesis) into the channel knowledge base. Adapted from ra-复盘 in Pluviobyte/rnskill.
---

# Post-Publish Review

## Overview

Turn "look at the numbers" into "bank an asset". Every review yields three things: a grade with the calculation shown, an attribution that points at concrete content, and at least one deposit into the knowledge base. Iron rule from the source skill: a review with no deposit did not happen. If there is nothing to deposit, write why.

This closes the loop that the content-system playbook opens: metrics in, hypotheses out, next topic informed by the last video.

Attribution: workflow adapted from `ra-复盘` by 雪踏乌云 (Pluviobyte), https://github.com/Pluviobyte/rnskill, CC BY-NC 4.0. Data sources, grading and deposit targets rewritten for YouTube Shorts and OpenMontage.

## Prerequisites

| Resource | Purpose |
|---|---|
| Nexlev MCP `get_my_video_analytics`, `get_my_audience_retention`, `get_my_traffic_sources`, `get_my_top_videos`, `get_my_channel_overview` | Own-channel numbers (retention endpoint may be gated by plan; fall back to the Studio CSV export) |
| YouTube Studio retention CSV in `/Users/gabrielesteban/Downloads/files/` | Second-by-second retention when the API is gated |
| The video's script artifact and `edit_decisions` | To map drop-off timestamps to lines and shots |
| Channel knowledge base: `projects/<channel>/CLAUDE.md` or the user's notes file, plus the memory directory | Where deposits go |
| `skills/shorts-hook-selector/SKILL.md` `metadata.hook_type` | Correlate hook type with 3s retention over time |

## Step 1: Locate the video

Match by title. Gather: script artifact, edit decisions, render report, publish log, the title/thumbnail pair, hook type, series part number, publish date and hour.

## Step 2: Pull the numbers

Minimum set. Put them in a table, not prose.

| Metric | Source |
|---|---|
| Views, likes, comments, shares, new subscribers | `get_my_video_analytics` |
| Views ÷ subscribers at publish | video views and `get_my_channel_overview` |
| Swipe-away rate / viewed vs swiped | Studio (API rarely exposes it) |
| Retention at 3s, 15s, 30s, end; average % watched | `get_my_audience_retention` or CSV |
| Traffic sources | `get_my_traffic_sources` |
| Subs ÷ views | derived, the loyalty metric the user already tracks |

Rule: if two sources disagree, the Studio export wins over the API summary. Note the date the data was pulled; Shorts numbers move for days.

## Step 3: Grade

Use the channel's own history, not a global benchmark.

- **R** = this video's core metric ÷ median of the channel's last 20 Shorts (use all available if fewer than 20 and say so). Core metric for these channels: views. Secondary: subs ÷ views.
- **M** = likes ÷ subscribers, read against the channel's size tier (a 200-sub channel and a 20K-sub channel have different normal ranges).
- Compare retention to the channel targets: 3s ≥ 70%, 15s ≥ 60%, 30s ≥ 50%, overall > 70% for the format the user set.

Show the arithmetic. With fewer than five prior videos, label the conclusion **tendencia**, not regla.

## Step 4: Attribute

Answer against the actual content, not from memory:

- What was the hook, and what happened at 3s?
- Where are the drop-off inflections on the curve? Map each to the exact line and shot. For Estoicismo Parte 1 this method found the end card losing 25 points in 5s, which changed the format. That is the standard: timestamp → line → shot → decision.
- Was the promise paid? Did the title/thumbnail gap exist?
- Traffic mix: Shorts feed vs channel page vs search changes what the number means.
- Publish time and the state of the series (part N, open loop from part N-1).

Hard rule: every attribution points at a specific sentence, frame or a specific inflection on a specific day. "The topic was weak" is not an attribution. If comparable competitor videos exist, pull them with Nexlev `youtube_channel_outliers` or `search_videos` and compare the same axes.

## Step 5: Deposit (the iron rule)

| Deposit | Target | Entry rule |
|---|---|---|
| Validated hook or title | Channel knowledge base, section "Ganchos y títulos validados" | Only with data attached: "línea" · video · R · retention at 3s · date. No "sounded good" entries. |
| Retention rule | Channel knowledge base, section "Reglas de retención" | Append with date, never overwrite. One video = tendencia. Three in the same direction = regla. |
| Format decision | `decision_log` of the next run and the knowledge base | e.g. "no closing card", with the number that caused it |
| Hypothesis for the next video | Knowledge base "Hipótesis abiertas" | Stated as testable: what changes, what metric, what threshold |
| Series state | Knowledge base series table and the memory file for the channel | Part N published, views, subs, open loop used |
| One-line verdict | Video's row in the performance log | date · grade · one-sentence attribution |

Memory directory entries follow the format in the session's memory instructions; update the channel file rather than creating a new one.

## Step 6: Report

In the conversation only. The assets live in the files; the report does not get its own file.

```markdown
## Revisión: [título]
**Datos al:** [fecha]
| métrica | valor | objetivo canal |

**Grado:** R = a ÷ b = x · M = ... → [arriba / en línea / debajo] de la mediana del canal. [tendencia | regla]

**Atribución**
1. [timestamp] → "[línea]" / [plano] → [efecto en la curva]
2. ...

**Depositado**
- [qué] → [archivo, sección]
```

## Hard rules

- At least one deposit per review, or an explicit sentence explaining why none.
- Quotes enter the bank only with numbers.
- Separate single-video tendencies from multi-video rules; only rules change the channel's standing instructions.
- Suspected throttling or policy issues go into the video's verdict line, not into the rules section.
- Never report a number without its pull date.

## Self-evaluation

| Check | 1 | 5 |
|---|---|---|
| Numbers in a table with source and date | prose, undated | table, sourced, dated |
| Grade shows arithmetic | a label | R and M computed against channel median |
| Attribution granularity | "the topic" | timestamp → line → shot |
| Deposit made | none | at least one, with data, in the right file |
| Tendencia vs regla labeled | conflated | labeled by sample size |

## Common pitfalls

- Reviewing from the API summary alone when the Studio CSV has the retention curve.
- Comparing against global benchmarks instead of the channel's own median.
- Attributing to "the algorithm".
- Writing the review as a report file and depositing nothing.
- Promoting one video's pattern to a rule.
