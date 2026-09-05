---
name: script-humanizer
description: Use when a narration script or public post (Spanish or English) reads like it was generated — detects AI-flavored structure with a position-by-position report, then rewrites only after the author's intent is clear, preserving facts, names, dates, stance and the channel's voice rules. Default mode is diagnose-only. Adapted from ra-人话 + dbs-ai-check in Pluviobyte/rnskill.
---

# Script Humanizer

## Overview

Two modes:

1. **Audit** (default): scan the text, quote each hit in reading order, name the pattern and severity, summarize the worst problem. No rewriting.
2. **Rewrite** (only when the user says "cámbialo" / "rewrite it"): remove structural shells first, then polish words, keeping every fact, number, proper noun, date and the author's stance, including their uncertainty.

Principle carried over from the source: the goal is not to sound human, it is to sound like this author. Removing AI patterns without knowing what the author wanted produces a different flavor of generic. And a clean script with a weak idea is still a weak script; if the topic is the real problem, say so and route to the idea stage.

Attribution: adapted from `ra-人话` and `dbs-ai-check` (dontbesilent toolkit) by 雪踏乌云 (Pluviobyte), https://github.com/Pluviobyte/rnskill, CC BY-NC 4.0. Pattern list and bans rewritten for Spanish and English spoken narration.

## Prerequisites

| Resource | Purpose |
|---|---|
| The text plus its surface: narration script, YouTube description, pinned comment, X post, long article | Genre changes which patterns count |
| Channel voice rules from the knowledge base | ≤ 12 words per sentence, no "hoy hablaremos de", ending points forward, no recap |
| `skills/meta/reviewer.md` | This skill produces findings in that format when run inside a pipeline stage |

## Genre first

State the genre before scanning. It changes the thresholds:

| Genre | Adjustments |
|---|---|
| Narration script (Shorts) | Punchy closing lines per beat are the format, not a flag. Opening triad (hook + pain + promise) and fixed connectors are the loud signals. Dangling demonstratives are critical because the listener cannot look back. |
| Long article / newsletter | All patterns apply. |
| X post / description / comment | Sentence-rhythm uniformity does not apply; the text is too short. |
| Formal / academic | Exhaustive rebuttals and terminology density are the norm; do not flag. |

## Pattern catalogue

Severity: 🔴 almost only a model does this · ⚠️ frequent in models, humans do it too · 💡 depends on genre and context.

### Structure shells (fix these before any word-level polish)

| # | Pattern | ES examples | EN examples | Sev |
|---|---|---|---|---|
| 1 | Binary contrast shell | "no es A, sino B", "no se trata de A, se trata de B", "no solo A, también B" | "it's not about A, it's about B", "not just A but B" | 🔴 at 3+ per 800 words, ⚠️ otherwise |
| 2 | Fake-insight markers | "en realidad", "en el fondo", "lo cierto es que", "la clave está en", "lo más importante es" | "truly", "at its core", "the key is", "what really matters" | ⚠️ |
| 3 | Lecture colon | "Mi conclusión es:", "La razón es simple:", "Hay tres cosas:" | "Here's the thing:", "The reason is simple:" | ⚠️ (allowed before a concrete inventory with a noun in front) |
| 4 | Command-template opener | "No hagas X, primero Y", "Antes de X, recuerda esto" | "Stop doing X. Do Y first." | ⚠️ |
| 5 | Strawman then correction | "Quizá pienses que... pero" | "You might think... but" | ⚠️ if the voiced reader is invented |
| 6 | Opening triad: hook + pain + promise in three lines | "¿Te pasa X? Es agotador. Hoy te enseño cómo salir." | same | 🔴 in Shorts |
| 7 | Fixed-position connectors | "Sin embargo", "De hecho", "Cabe destacar", "Es importante mencionar" at sentence starts | "However", "In fact", "Notably", "It's worth noting" | ⚠️ when more than one per 100 words |
| 8 | Quotable closer on every paragraph | each beat ends on a slogan | same | 💡 (skip for Shorts) |
| 9 | Naming ritual | "A esto lo llamo el efecto X" twice or more | "I call this the X effect" | 💡 |
| 10 | Closing blessing / permission | "Te lo mereces", "Y tú también puedes" | "You deserve this", "You've got this" | 🔴 |
| 11 | Elevation to philosophy | a practical point ends in "en el fondo, la vida es..." | "ultimately, life is..." | ⚠️ |
| 12 | Vague referents | "esto", "estas cosas", "varios aspectos" where a category noun is needed | "this", "these things", "several aspects" | ⚠️ |
| 13 | Dangling demonstrative | "al terminar este" → "al terminar este video"; "esta dice" → "esta carta dice" | "when you finish this" | 🔴 in narration |
| 14 | Wrong tense stance | "voy a usar X" when X was already tested | "I'll use X" for completed work | ⚠️ |
| 15 | Empty comparatives | "más natural", "más adecuado", "más potente" with no named use | "better suited", "more natural" | ⚠️ |
| 16 | Abstract pressure | "la brecha se hará evidente", "será un antes y un después" | "the gap will become stark" | ⚠️ |
| 17 | Metaphor ending that hides the concrete loss | "una redacción correcta pero sin alma" | "technically right, spiritually empty" | ⚠️ |
| 18 | Over-precise fake sensory detail | "esperé 2,3 segundos" | "1.7 seconds later" | ⚠️ |
| 19 | Uniform sentence length | five consecutive sentences within ±2 words | same | 💡 (not for posts) |
| 20 | Zero hesitation across the whole piece | no "no estoy seguro", no open question | same | 💡 |
| 21 | Synonym rotation to avoid repetition | the same thing called four names in one paragraph | same | ⚠️ |
| 22 | Translation register (ES only) | "en términos de", "a nivel de", "realizar" for "hacer", "el hecho de que" | – | ⚠️ |

Human-use warning: patterns 1, 5, 8 and 9 are classic rhetoric. Flag them by density, not by presence.

## Audit output

Report in reading order, not grouped by pattern. Quote the exact span.

```markdown
# Informe de huellas de IA

**Género asumido:** guion de Short (dime si no)
**Coincidencias:** N

**1.**
> [cita literal]
[una o dos frases: qué falla aquí, sin jerga]
`#N nombre · severidad`

**2.** ...

---
**Resumen:** [el problema dominante en una o dos frases]

Esto es solo diagnóstico. Si quieres que lo reescriba, dime "cámbialo" y antes de tocar cada punto te haré una pregunta sobre qué querías decir.
```

If the text is clean, say so in one line. Do not invent hits to fill a report.

## Rewrite workflow (after "cámbialo")

1. Sort the hits by severity. For each, ask **one** question about the intent behind the pattern, then wait. Examples of the question shape:
   - #1: "Of these contrasts, which one is the claim you actually want to make? Keep that one, state it directly."
   - #6: "Your first three lines sell anxiety. What is the one fact you want the viewer to know? Start there."
   - #12/#13: "What is 'this'? Name the object in the sentence."
   - #20: "Is there any point here you are not sure about? Say it; the doubt reads as real."
2. Bucket the source text before rewriting: facts (dates, names, numbers, sources), judgment (what the author believes), experience (what was tried, cost, failure), action (what the viewer can do or avoid). Nothing new enters these buckets.
3. Delete empty framing: greetings, disclaimers, lecture setup, value-lifting summary, a closing that repeats the previous beat, any "hoy hablaremos de".
4. Rewrite in short spoken sentences. Keep mild roughness that carries the voice. Concrete verbs: probé, medí, corté, dejé, borré. Exact category nouns instead of "cosas".
5. Final scan for the strings and shapes in the catalogue. Any remaining 🔴 hit gets rewritten before returning.

The rewrite must reflect the author's answers. If the user has not answered, give the direction of the fix, not the fixed text.

## Self-check on your own questions

Your questions must not commit the patterns: no "quizá pienses que", no "no es A sino B", no "en el fondo", no A-or-B multiple choice. Describe what you observed, then ask one open question.

## Special cases

- User says "quítale el sabor a IA": answer that sounding non-AI is not the same as being good, and ask whose voice the text should sound like. Run the audit first.
- The topic itself is weak: say that AI flavor is not the main problem and point to the idea stage.
- The text comes from the adversarial retention review: run the audit on the rewritten passages only, so the two reviews do not fight.

## Self-evaluation

| Check | 1 | 5 |
|---|---|---|
| Genre stated | no | stated with its adjustments |
| Hits quoted verbatim in order | paraphrased or grouped | exact spans, reading order |
| Facts preserved in rewrite | numbers or names changed | every fact bucket intact |
| Intent asked before rewriting | rewrote blind | one question per hit, answers reflected |
| Channel voice rules honored | ignored | ≤ 12 words per sentence, ending points forward |

## Common pitfalls

- Rewriting on the first request. Audit first.
- Flagging a single "no es A sino B" as a crime. Density matters.
- Neutralizing the author's stance to sound polished.
- Adding an example, a number or an anecdote the author never gave.
- Flagging punchy beat closers in a Short. That is the format.
- Ending the rewritten script with a recap. The ending points forward.
