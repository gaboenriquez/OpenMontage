---
name: viral-loop
description: Use when the user asks to run the content loop for a Spanish-language channel — "busca ideas", "corre el loop", "qué video hacemos", "radar", "siguiente video", "con mi voz". Orchestrates Radar (Nexlev niche/outlier research) → idea bank → OpenMontage production at $0 → Shorts → packaging → manual publish package → post-publish review 48 h / 7 d → back to Radar. Owns the rule for which videos use Gabriel's cloned voice.
---

# Viral Loop

## Overview

A preflight, then one loop with five stations, one knowledge base per channel. Every lap must end with
something banked (an idea, a hook pattern, a rule). The loop does not publish:
it produces an upload package and the user uploads by hand (automation comes later).

```
 ┌─► 1 RADAR ──► 2 IDEA BANK ──► 3 PRODUCE ──► 4 PACKAGE ──► [user uploads]
 │                                                               │
 └──────────── 5 REVIEW (48 h + 7 d) ◄───────────────────────────┘
```

Existing skills this chains, in order: `shorts-hook-miner` → `shorts-hook-selector`
→ `shorts-title-forge` → `script-humanizer` → pipeline director skill →
`post-publish-review`. Do not re-implement what those skills do; call them.

## Hard rules

1. **$0 by default.** Only free tools: `voicestudio_tts`, `piper_tts`, Pexels /
   Archive.org / Wikimedia / NASA footage, Remotion, HyperFrames, FFmpeg, local
   transcription. Any paid tool (fal, Kling, ElevenLabs, Ai33, Gemini video) needs
   the user's explicit yes for that specific call.
2. **Original value in every video.** No re-uploads, no compilations of other
   people's clips, no reaction-over-footage, no near-duplicate templates across
   videos. YouTube's "inauthentic/reused content" policy demonetizes exactly that,
   and it is the real long-term risk to the channel.
3. **Every fact sourced** in the research brief. No unsourced claims on screen.
4. **Disclose** realistic synthetic media when the platform asks (YouTube
   "altered or synthetic content" toggle, TikTok AI label). A cloned voice
   reading a factual script generally does not need it; a synthetic realistic
   person or event does.
5. **Human gates**: the user approves (a) the idea, (b) the script, (c) the final
   cut. Checkpoint policy `guided`.

## 0 · PREFLIGHT (every lap, no exceptions)

```
cd ~/OpenMontage && source .venv/bin/activate
python scripts/loop_doctor.py          # any ❌ = stop and fix it first, each line says how
python scripts/sync_upstream.py        # when the doctor says "behind calesthio/OpenMontage"
```

`sync_upstream.py` brings in calesthio/OpenMontage (remote `origin`) safely:
rehearsal merge + full test suite in a throwaway worktree first; only if green it
merges for real, re-tests, and rolls back to a `pre-sync/<timestamp>` tag if
anything goes red. It never pushes. Exit codes: 3 = an uncommitted file of ours
is also changed upstream (commit it, then rerun); 4 = conflict (resolve by hand,
show the user the file list); 5/6 = upstream breaks our tests (report the failing
tests, keep working on the current version, do not force it).

Do not run a pipeline stage while the doctor shows ❌. ⚠️ lines only block the
part they name (e.g. VoiceStudio down → only `voz: gabriel` ideas wait).

## Channel knowledge base

`.channel/<canal>/` holds everything the loop learns. Create it on first run.

| File | Content |
|---|---|
| `canal.md` | Niche, audience, promise, voice rule, visual identity, banned patterns |
| `radar/YYYY-MM-DD.md` | Each radar run: queries, top outliers, patterns, candidate ideas |
| `ideas.md` | Idea bank, one row per idea: score, status (`nueva/aprobada/producida/publicada/descartada`), voice |
| `publicados.md` | One row per upload: date, platform, title, project dir, hook type, voice, 48 h and 7 d numbers |
| `aprendizajes.md` | Deposits from `post-publish-review`: rules, winning hooks, dead angles |

Read `canal.md`, `ideas.md` and `aprendizajes.md` at the start of every lap.

## 1 · RADAR (Nexlev MCP)

Run weekly, or when `ideas.md` has fewer than 5 `nueva` rows.

1. **Outlier videos in the niche** — `faceless_outliers_videos` with
   `query` = the niche in natural Spanish, `languages: ["spanish"]`,
   `minOutlierScore: 3`, `minUploadDate` = 60 days ago, no `sortBy`.
2. **Breakout small channels** — `search_niche_finder_channels` with the same
   query, `channelLanguage: ["es"]`, `channelCreatedAfter` = 12 months ago,
   `isFaceless: true`. Note RPM, monthly views, video length.
3. **Shorts side** — `search_shorts_niche_finder_channels` with
   `language: "Spanish"` and the query.
4. **Why it worked** — for the top 3 outliers, `watch_youtube_video_and_ask`
   (or `get_video_transcript`): first 30 s structure, promise, pacing, where the
   payoff lands. For Shorts hooks, run `shorts-hook-miner`.
5. Nexlev results are large: they are saved to a file. Aggregate with `jq`/Python;
   never paste raw JSON into the chat.

Write `radar/YYYY-MM-DD.md`: what was searched, the numbers, the 3-5 patterns
(topic × angle × format), and **5-10 candidate ideas that are our own angle on a
proven pattern**, never a copy of a specific video.

## 2 · IDEA BANK

Score each candidate 1-5 on each axis and append to `ideas.md`:

| Axis | Question |
|---|---|
| Demanda | Did 2+ unrelated small channels get outliers on this pattern in 60 days? |
| Brecha | Can the title open a question the thumbnail does not answer? |
| Valor | Does the viewer learn something concrete and sourced? |
| Producible $0 | Can free footage / animation carry it without paid generation? |
| Encaje | Does it fit `canal.md`'s promise? |

Present the top 3 to the user with a one-line hook each. Produce only what the
user approves.

## 3 · PRODUCE (OpenMontage)

Pick the pipeline, then follow its director skills in `skills/pipelines/`:

| Idea type | Pipeline | Cost |
|---|---|---|
| History, industry, places, "cómo se fabrica" | `documentary-montage` (real free footage) | $0 |
| Science, "por qué pasa X", concepts | `animated-explainer` with Remotion / HyperFrames, free images | $0 |
| Long video → Shorts | `clip-factory` on our own render | $0 |

Script structure (long form): hook opens on the payoff, no greeting; stakes by
30 s; an open loop every ~60 s; specific payoff at the end. Then
`shorts-hook-selector` for the opening, `script-humanizer` in audit mode, and the
user's approval before any audio is generated.

### Voice rule (who narrates)

Set per idea in `ideas.md` (`voz: gabriel | estudio`):

- **`gabriel`** → `voicestudio_tts` with `voice_id: "gabriel"` (profile
  `a60a560e`, Gabriel's own consented clone). Use for opinion, personal angle,
  first-person series, and anything the channel signs as "us". Default for
  channels whose `canal.md` says `voz: gabriel`.
- **`estudio`** → `voicestudio_tts` with another VoiceStudio profile the user
  created, or `piper_tts` with `model: "es_MX-claude-high"` (Spanish; the
  default Piper model is English and must never be used for this channel).
  Never clone anyone else's voice.
- If VoiceStudio is down mid-lap for a `gabriel` video, **wait and restart it**;
  never silently swap to another voice (a timbre change reads as another channel).

Pre-flight before narration:
```
curl -s localhost:3900/health        # must be {"status":"ok"}
# if not running:  cd ~/VoiceStudio && bun run dev:api   (wait ~60 s for "ok")
```
Generate narration per scene (shorter chunks = fewer artifacts, easy retakes),
then verify: transcribe the WAV back (`POST /v1/audio/transcriptions`) and diff
against the script; re-generate any scene with mismatched words. Captions come
from that transcription, not from the script.

## 4 · PACKAGE (upload by hand)

Write `projects/<project>/publish/` with:

- `final.mp4` (16:9) and each Short (9:16, under 60 s, standalone ending, no
  "ver el video completo")
- `titulo.txt` — from `shorts-title-forge` (user picks from the Top 3)
- `miniatura.png` — one focal point, legible at phone size, 2-4 words max;
  title and thumbnail must not say the same thing
- `descripcion.txt` — 2-line summary, sources list, chapters for long form
- `checklist.md` — platform-by-platform: YouTube (synthetic-content toggle if
  applicable, made-for-kids = no, chapters), TikTok (AI label if applicable),
  Instagram Reels (cover frame)

Then append the row to `publicados.md` with status `pendiente-subir`. The user
changes it to the upload date/time when done.

## 5 · REVIEW (closes the loop)

At 48 h and 7 d after each upload, run `post-publish-review` (it uses the Nexlev
`get_my_*` tools). Required outputs:

1. Grade against the channel's own median, calculation shown.
2. Attribution to a specific line, shot or drop-off second.
3. At least one deposit into `aprendizajes.md`, plus: update the idea's score
   pattern in `ideas.md` (winning pattern → +1 Demanda on sibling ideas; dead
   angle → mark siblings `descartada` with the reason).

After 5+ published videos, compare by `voz` (gabriel vs estudio) and by hook type,
and write the finding to `aprendizajes.md`. That comparison is what tells us
whether Gabriel's voice lifts retention in this niche.

## Lap checklist

- [ ] Preflight: `loop_doctor.py` has no ❌; synced with calesthio if behind
- [ ] Read `canal.md`, `ideas.md`, `aprendizajes.md`
- [ ] Radar if the bank is low or it has been 7+ days
- [ ] User approves an idea (and its `voz`)
- [ ] Research brief with sources → script → hook → humanizer → user approves script
- [ ] Narration (VoiceStudio pre-flight + transcription check)
- [ ] Pipeline to final render + self-review
- [ ] Shorts from the render
- [ ] Publish package + `publicados.md` row
- [ ] 48 h and 7 d reviews scheduled/run, deposit banked
