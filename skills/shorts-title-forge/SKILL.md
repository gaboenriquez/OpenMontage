---
name: shorts-title-forge
description: Use when titling a planned or finished YouTube Short (Spanish or English) — locks the real theme first, studies benchmark title patterns if supplied, generates 8-12 two-part candidates that obey the channel's locked template, checks the title/thumbnail gap, scores them, recommends a Top 3 and writes the chosen title into the upload package using kebab-case file naming. Adapted from ra-video-title in Pluviobyte/rnskill.
---

# Shorts Title Forge

## Overview

Theme first, title second. A title must serve this video's core proposition, not a generic hook that fits any video in the niche ("la lección estoica que cambiará tu vida" fits every stoicism Short and therefore sells none).

Runs twice: once at script lock (candidates only, no final pick) and once at publish (final pick plus file naming). The user picks the final title unless they say "elige tú".

Attribution: workflow adapted from `ra-video-title` and its two-part title reference by 雪踏乌云 (Pluviobyte), https://github.com/Pluviobyte/rnskill, CC BY-NC 4.0. Templates and scoring rewritten for YouTube Shorts and the user's channels.

## Prerequisites

| Resource | Purpose |
|---|---|
| Final script or `script` artifact | The only reliable source of the theme |
| Thumbnail concept (locked before script) | To enforce the title/thumbnail gap |
| Channel title template from the knowledge base | Estoicismo: `[Personaje estoico]: [anécdota en 4-5 palabras]`. Rig & Radio: number-led, no template locked yet |
| Benchmark titles (optional) | From Nexlev `youtube_channel_outliers` or `youtube_channel_shorts` sorted by popular |
| `skills/shorts-hook-miner/SKILL.md` output (optional) | Hook patterns often translate into title shapes |

## Step 1: Lock the theme

Read the script and write one line:

`Este video cuenta: ...`

Every candidate must trace back to that line. If you cannot write the line, the script is not ready for a title.

## Step 2: Read benchmarks (when supplied)

From competitor titles extract shared traits only: structure, first-half hook, second-half direction, emotion, promise. Do not copy phrasing, do not import another channel's persona.

Default lens is the **two-part title**: first half stops the scroll, second half gives a direction without closing the loop.

Common two-part shapes:

- `[Figura]: [acción que contradice lo esperado]` (Estoicismo locked template)
- `[Número extremo] [grupo] [hacía X]. [Qué pasó después]`
- `¿Por qué [esfuerzo] y [sin resultado]? [Pista sin respuesta]`
- `[Escena], [resultado inesperado]`
- `[Herramienta/época] cambió, [lo difícil sigue siendo ...]`

## Step 3: Generate 8-12 candidates

Each candidate must pass all of these:

- Hits the theme line. A title that fits any video in the niche is out.
- First half has a hook; second half adds direction or suspense.
- Spoken register, not essay register. ≤ 60 characters visible on mobile; front-load the strongest word.
- Does not give the answer away.
- Obeys the channel template when one is locked. For Estoicismo the figure's name comes first, always.
- News or fact-led themes: the factual subject leads the first half; metaphor may only appear in the second half.
- **Title/thumbnail gap**: the thumbnail text must not repeat the title. If the thumbnail says the anecdote, the title carries the figure and the consequence, or vice versa. Note the pairing next to each candidate.

## Step 4: Score

Walk each candidate through five checks, 1-5 each, and show the table:

| Check | Meaning |
|---|---|
| Theme fit | closer to the theme line is better; generic niche titles score 1 |
| Two-part tension | the second half adds, not repeats |
| Click reason | fear of missing out, avoid a mistake, save effort, see a contradiction, curiosity |
| Information gap | something is withheld |
| Spoken feel | reads like a person talking, not a course module |

Add a sixth flag, not scored: `clickbait risk` low/medium/high. High risk means the video cannot pay the title; drop it.

## Step 5: Recommend and hand off

- Give a Top 3 with one sentence of reasoning each.
- If the user said "elige tú" or "escríbelo", pick one and proceed. If they said "yo elijo", stop and wait for a number.
- At script lock: write candidates into the script artifact `metadata.title_candidates` and stop.
- At publish: write the final title into the publish package, and name every exported file after it in kebab-case (video, SRT, thumbnail). Never `final.mp4`. YouTube reads the filename.
- For series channels, verify the visible "Parte N" matches the recorded audio, since audio overrides the brief.

Output format:

```markdown
## Tema
Este video cuenta: ...

## Candidatos
| # | Título | Par con thumbnail | Tema | Tensión | Clic | Hueco | Voz | Riesgo |

## Top 3
1. ... — ...
```

## Self-evaluation

| Check | 1 | 5 |
|---|---|---|
| Theme line written before candidates | no | yes, and every candidate maps to it |
| Channel template obeyed | ignored | verbatim shape |
| Title/thumbnail gap | same words in both | complementary, gap stated |
| Candidate count | under 8 | 8-12 with scores |
| File naming at publish | generic name | kebab-case of the real title |

## Common pitfalls

- Titling before reading the script.
- Leading with a metaphor on a fact-led video.
- Building the title around a tool, place or era name when the theme is the human decision.
- Using trending words ("secreto", "nadie te dijo", "brutal") when the theme does not earn them.
- Writing all candidates into the publish file. Keep the file clean: final title on line one, candidates only if the user asks.
