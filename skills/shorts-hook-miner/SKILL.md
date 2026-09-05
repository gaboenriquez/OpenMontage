---
name: shorts-hook-miner
description: Use when researching short-form video hooks for a niche or topic — mining top-performing YouTube Shorts and TikTok videos from the last 90 days to extract structural hook patterns, pacing, and on-screen text style for scriptwriting or content strategy, without copying any hook verbatim.
---

# Shorts Hook Miner

## Overview

Given a niche/topic, find the top-performing YouTube Shorts and TikToks from
the last 90 days and reverse-engineer *why the first 2-3 seconds work* —
without lifting any actual line. The deliverable is a ranked JSON list of
reusable **hook patterns** (structure + technique), each with one paraphrased
illustrative example, ready to feed into a script-director stage or any
scriptwriting task.

**Hard rule:** never output a hook verbatim from a real video. Extract the
*structure* (sentence shape, rhetorical device, information withheld) and
write a fresh, paraphrased example line in that shape. If you can't tell
whether your example is too close to the source, rewrite it.

## Workflow

1. **Clarify the niche.** If the input topic is very broad ("history"),
   narrow it with the user or pick 2-3 sub-angles yourself and say so.

2. **Search both platforms for top performers, last 90 days.**
   - YouTube Shorts: prefer the Nextlev MCP tools if connected —
     `youtube_search` (filter to Shorts/short duration), `search_shorts_niche_finder_channels`,
     `youtube_channel_shorts`, or `faceless_outliers_videos` / `search_viral_videos_small_channels`
     for outlier detection. Sort by views or outlier score, then confirm
     recency (published within 90 days) via `youtube_video_details`.
   - TikTok: no dedicated search tool exists in this environment — use
     `WebSearch` to locate high-performing videos in the niche (site:tiktok.com,
     "went viral", niche hashtags), then `watch_tiktok_video_and_ask` on
     candidate URLs to inspect content directly.
   - If Nextlev tools aren't connected, fall back to `WebSearch`/`WebFetch`
     for both platforms — search for "[niche] shorts viral", "[niche] tiktok
     viral", niche-specific hashtags, and creator roundups.
   - Aim for 15-25 candidate videos before narrowing to the 5-8 you'll report.

3. **Extract per video** (use `get_bulk_video_transcripts` /
   `youtube_video_details` for YouTube, `watch_tiktok_video_and_ask` for
   TikTok — ask it directly for the opening line, on-screen text, and pacing):
   - **Hook line** — the exact first 2-3 seconds of spoken/on-screen copy
     (captured only for your own analysis; never placed in the output).
   - **Pacing pattern** — cut frequency in the first 5s, whether the hook is
     spoken, on-screen text, both, or a visual surprise with no words yet.
   - **On-screen text style** — caption placement, capitalization, emoji/emphasis
     use, whether text lags or leads the voice.
   - **Length** — total video duration.
   - **Engagement signal** — views, like ratio, or outlier score, whatever the
     source exposes; this drives the ranking.

4. **Cluster into patterns.** Group videos whose hooks share the same
   underlying move (see Quick Reference below for common hook archetypes as
   a starting vocabulary — don't force-fit if a video does something else).
   Merge duplicates; a pattern needs at least one clear source example to
   qualify.

5. **Write one paraphrased example per pattern.** Reproduce the *shape*
   (sentence structure, rhythm, device) in fresh wording about the same
   niche. Do not reuse the source's specific phrasing, stats, or proper nouns.

6. **Rank patterns by apparent engagement** — using the highest engagement
   signal among videos in that cluster, or your best judgment when signals
   aren't comparable across platforms. State the ranking basis.

7. **Output JSON** (5-8 entries) matching the schema below.

## Output Schema

```json
[
  {
    "rank": 1,
    "pattern_name": "Cold-open mid-action, no intro",
    "structural_description": "Video opens already mid-task with no greeting or setup; a single on-screen text overlay names the stakes within the first second.",
    "pacing": "Hard cut into action at 0.0s; first caption appears by 0.5s; next cut by 2-3s.",
    "onscreen_text_style": "All-caps, top-third placement, high-contrast outline, 2-4 words max.",
    "avg_length_seconds": 34,
    "engagement_basis": "views (top video ~2.1M in 60 days)",
    "paraphrased_example": "A single freshly-written line in this pattern's shape — never the source's actual words."
  }
]
```

## Quick Reference — Common Hook Archetypes

Use these as a starting vocabulary, not a checklist to force matches onto:

| Archetype | Shape |
|---|---|
| Cold-open mid-action | Starts already doing the thing, zero preamble |
| Direct-address callout | "If you [do X], watch this" — names the viewer's situation |
| Contrarian claim | States a belief, then immediately negates it |
| Withheld payoff | Shows/implies a result, refuses to explain it yet |
| Rapid stat/shock number | Leads with a surprising number, no context yet |
| POV / role framing | "POV: you're..." — casts the viewer into a scenario |
| Question hook | Opens on a question the video promises to answer |
| Visual-only cold open | No words for 1-2s; a visual anomaly alone is the hook |

## Common Mistakes

- Reporting the actual first line of a real video in the output — always
  paraphrase into a fresh example.
- Treating "last 90 days" loosely — confirm publish date per video, don't
  assume from search-result ordering.
- Reporting fewer than 5 or more than 8 patterns, or padding with near-duplicate
  patterns to hit the count.
- Skipping the TikTok side because only Nextlev/YouTube tools are readily
  available — use `WebSearch` + `watch_tiktok_video_and_ask` deliberately.
