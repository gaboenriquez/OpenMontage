---
name: shorts-hook-selector
description: Use when writing or fixing the first 3-8 seconds of a narrated YouTube Short (Spanish or English) — picks the hook type by scenario, checks the script has enough material to support a hook, diagnoses an existing opening, and generates 10-15 candidate openings with a Top 3. Pairs with shorts-hook-miner (research) and script-humanizer (voice). Adapted from ra-hook + dbs-hook in Pluviobyte/rnskill.
---

# Shorts Hook Selector

## Overview

Two jobs in one pass: **choose the hook type** for this video, then **write and rank the openings**. It runs at the script stage, after the topic, title, thumbnail concept, central question and promise are locked (see the content-system playbook) and before the adversarial retention review.

Core belief carried over from the source skill: if a good opening will not come out, in most cases the problem is the content, not the opening. The hook is a free sample of the video. Diagnose the material first.

Attribution: structure adapted from `ra-hook` and `dbs-hook` by 雪踏乌云 (Pluviobyte), https://github.com/Pluviobyte/rnskill, CC BY-NC 4.0. Taxonomy, examples and rules below are rewritten for faceless narrated Shorts in Spanish and English.

## Prerequisites

| Resource | Purpose |
|---|---|
| Locked title, thumbnail concept, central question, promise | The hook must open the question and point at the promise |
| Full draft script or at least the body | No body, no hook work |
| `skills/shorts-hook-miner/SKILL.md` output (optional) | Ranked hook patterns from the niche, last 90 days |
| Channel rules in the project knowledge base (`projects/<channel>/CLAUDE.md` or the user's notes file) | Locked openers, banned phrases, series format |

## Meta rules

1. The hook buys entry, not the whole watch. Retention past 8s belongs to the body. Do not overload the opening.
2. Suspense is allowed; deception is not. Anything promised in the first line must be paid in the video.
3. Each hook type has a precondition. If the precondition fails, the type is void. Switch type, do not force it.
4. The opening must work without the title or thumbnail. A Shorts viewer swiping in cold never saw either.
5. One primary type per hook, at most one secondary. Three stacked devices cancel each other.
6. It must be sayable. Narration is spoken; self-answered rhetorical questions and written-register phrasing read badly aloud.

## Step 1: Material check (before touching the opening)

Scan the body and tick what exists:

| Material | Examples in the user's niches |
|---|---|
| Hard number | "8 hijos", "1 de cada 5 estadounidenses", "30 años" |
| Transformation | before vs after, rise and fall |
| Quotable line | a claim that stands alone and is worth repeating |
| Authority or named figure | Marco Aurelio, a 1976 FCC rule, a named trucker |
| Shared pain or shared moment | the viewer recognizes themselves |
| Concrete conflict | a decision, a loss, an order, a refusal |

- 0-1 ticks: **stop**. Report that the body lacks material and list what to add. Do not generate openings.
- 2 ticks: generate, but say the ceiling is low.
- 3+ ticks: proceed.

Also check length: a 30-90s Short needs 70-220 words of body. Under that, the hook has nothing to sell.

## Step 2: Choose the hook type

Ask one question: **what is the hardest thing in this video?** Walk the list in order and stop at the first match.

| # | Type | Anchor | Precondition | Shape (ES / EN) |
|---|---|---|---|---|
| 1 | Preview of the scarce thing | content | the fact or footage is rare or contradicts expectation | "[Figura] + [acción improbable]" / "[Figure] + [unlikely action]" |
| 2 | Value promise | content | the payoff fits in one sentence and the body delivers it | "Al terminar esto vas a saber [beneficio concreto]" |
| 3 | Shared phenomenon | viewer | the situation is near-universal | "Seguro te ha pasado: [detalle del momento]" |
| 4 | Direct pain | viewer | the pain is real, specific and self-recognized | "¿Por qué [esfuerzo] y aun así [sin resultado]?" |
| 5 | Call to the viewer | viewer | the instruction is concrete and doable in 3s | "Tienes tres segundos para pensar [pregunta]. Tres, dos, uno." |
| 6 | Event cold open | event | the event carries conflict | "El día que [evento con conflicto]" |
| 7 | Debate topic | event | everyone has a stance, there is no official answer | "¿Puede un [tipo de persona] llegar a [meta discutible]?" |
| 8 | Extreme number then withheld payoff | content | a startling number exists and its meaning can be delayed | "1 de cada 5 [grupo] tenía uno de estos en [año]" |

Type 8 is the Rig & Radio default (number first, payoff withheld). Types 1 and 6 are the Estoicismo defaults (historical figure plus the anecdote that contradicts what the viewer expects, matching the locked title template). Do not import types 3-5 into Estoicismo without a reason; the channel voice is narrative, not confessional.

If nothing matches, go back to the body. Do not patch the opening.

## Step 3: Diagnose the existing opening (if there is one)

| Axis | Question | Frequent failure |
|---|---|---|
| Independence | Understandable without the title? | assumes the title was read |
| Grip | Anything concrete in the first line? | flat statement, no number, no contrast |
| Suspense | Does it give the answer away? | conclusion first, nothing left to watch |
| Credibility | Why listen? | no figure, no fact, no stake |
| Sayability | Can Charlie say it in one breath? | rhetorical Q + A, written register |
| Match | Does the body pay what the opening sells? | opening asks A, body tells B |
| Channel rules | Banned phrases present? | "hoy hablaremos de", greetings, logos |

Output the diagnosis as a short checklist with the one or two worst problems named.

## Step 4: Generate candidates

Three methods, 3-5 each, 10-15 total. Every candidate must be speakable and ≤ 12 words per sentence (channel rule).

1. **Extract**: build openings from material already in the body, in this priority: result + reversal, hard number, transformation, quotable line, named authority + claim, pain + suspense.
2. **Add**: if the body is thin, propose one verifiable fact per opening and mark it `NEEDS VERIFICATION`. Never invent.
3. **Withhold**: turn a conclusion into a question or a delay. Use "por qué" not "esto demuestra". Use the number without its meaning.

Illustrative shapes (write fresh lines for each video, do not reuse these):

- Extract, type 1: "Marco Aurelio enterró a ocho de sus hijos. Y siguió escribiendo cada noche."
- Withhold, type 8: "One number ended a 40-year radio tradition. Nobody noticed when it happened."
- Diagnose-fail example (written register): "¿Crees que eres disciplinado? En realidad solo evitas actuar." Rewrite as a statement: "Cada vez que no actúas, casi siempre es para evitar actuar."

## Step 5: Rank and hand off

Output format:

```markdown
## Diagnóstico del gancho actual
- [eje]: [problema concreto]
**Problema principal:** ...

## Tipo elegido
[#N nombre] porque [lo más duro del video es ...]. Secundario: [ninguno | #N].

## Candidatos (N)
| # | Método | Gancho | Qué usa |
|---|---|---|---|

## Top 3
1. [gancho] — [por qué] — [ventaja sobre los otros]
2. ...
3. ...
```

Write the chosen hook into the script artifact's first section and note the type in `metadata.hook_type` so the post-publish review can correlate hook type with 3-second retention later.

## Self-evaluation

| Check | 1 | 5 |
|---|---|---|
| Material check done before generating | skipped | ticked table, stop rule applied |
| Type chosen by precondition | picked by taste | precondition stated and met |
| Independence from title | assumes title | works cold |
| Sayability | written register | one breath, ≤12 words per sentence |
| Promise matches body | opening oversells | every promise paid |

## Common pitfalls

- Optimizing the opening of a body that has no material. Stop and say so.
- Stacking a number, a question and a pain in one line.
- Rhetorical question followed by its own answer. Say the claim.
- Giving the ending in the first line because it sounds strong.
- Ignoring the channel's locked openers and banned phrases.
- Treating the shorts-hook-miner patterns as templates to copy. They are shapes, not lines.
