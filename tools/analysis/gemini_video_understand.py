"""Native video understanding via the Gemini API.

WHY THIS EXISTS. `video_analyzer` (the current default) works the way the
agent's own vision does: sample keyframes, transcribe audio, detect scene
boundaries, then reason over stills. That loses exactly the things that decide
whether a Short retains — when on-screen text enters and leaves, where the SFX
land, anything shorter than the sampling interval, and the coupling between
what is heard and what is seen at the same instant.

Gemini ingests the video as a timeline (frames + audio together), so it can
answer "at what second does the first cut land" instead of "these frames look
different". That is the whole reason to spend money here.

SCOPE — read this before extending the tool. The point is to extract REUSABLE,
ABSTRACT edit rules: pacing, cut rhythm, when information is withheld, where
text appears, how the hook is built. It is deliberately NOT a "recreate this
video" tool. Reproducing another creator's script, characters, artwork,
narration or thumbnail is a copyright and platform-policy problem, and no
prompt in this file asks for that. Keep it that way.

MODEL. Pinned to gemini-3.8-flash, verified reachable on this account on
2026-09-06 (1M-token context). Deliberately not a "-latest" alias: this tool's
whole output is timestamps, and comparisons across videos are only meaningful
if the same model produced them. Re-check with operation="list_models".
"""

from __future__ import annotations

import json
import mimetypes
import os
import time
from pathlib import Path
from typing import Any, Optional

import requests

from tools.base_tool import (
    BaseTool,
    Determinism,
    ExecutionMode,
    ResourceProfile,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolStatus,
    ToolTier,
)

# Asking for one flat, explicit shape keeps the output diffable between videos,
# which is what makes a competitor comparison possible at all.
TIMELINE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "duration_seconds": {"type": "number"},
        "hook": {
            "type": "object",
            "properties": {
                "first_words": {"type": "string"},
                "seconds_until_first_concrete_fact": {"type": "number"},
                "hook_type": {"type": "string"},
                "information_withheld": {"type": "string"},
                "works_without_title": {"type": "boolean"},
            },
        },
        "cuts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "at_seconds": {"type": "number"},
                    "kind": {"type": "string"},
                    "shot_after": {"type": "string"},
                },
            },
        },
        "on_screen_text": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "in_seconds": {"type": "number"},
                    "out_seconds": {"type": "number"},
                    "position": {"type": "string"},
                    "style": {"type": "string"},
                },
            },
        },
        "audio_events": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "at_seconds": {"type": "number"},
                    "kind": {"type": "string"},
                    "description": {"type": "string"},
                },
            },
        },
        "pacing": {
            "type": "object",
            "properties": {
                "cuts_per_minute": {"type": "number"},
                "shortest_shot_seconds": {"type": "number"},
                "longest_shot_seconds": {"type": "number"},
                "rhythm_open_middle_close": {"type": "string"},
            },
        },
        "reusable_rules": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Abstract, transferable edit rules. No specific content.",
        },
        "ending": {
            "type": "object",
            "properties": {
                "has_end_card": {"type": "boolean"},
                "last_shot_seconds": {"type": "number"},
                "loops_cleanly": {"type": "boolean"},
                "close_type": {"type": "string"},
            },
        },
    },
    "required": ["duration_seconds", "hook", "cuts", "on_screen_text", "pacing", "reusable_rules"],
}

ANALYSIS_PROMPT = """You are analysing a short-form video to extract its EDIT FORMAT.

Report only structure and timing. Do NOT transcribe the script in full, do not
describe the artwork in reproducible detail, and do not summarise the story —
another creator's content is not what we are after. We want the mechanics.

Be exact with timestamps; they are the entire value of this analysis. Give
seconds with one decimal.

For every cut, say the second it lands and what kind of shot follows.
For on-screen text, give the exact in and out second, where it sits in frame,
and its visual treatment — not just that text exists.
For audio, mark every SFX, music entry, music exit and deliberate silence.
For the hook, measure how many seconds pass before the first concrete fact
(a name, a number, a conflict) reaches the viewer.
For the ending, say whether a static end card appears, how long the final shot
holds, and whether the last frame flows back into the first well enough to loop.

In `reusable_rules`, write rules that could be applied to a completely
different topic — "the first cut lands before second 2", "keyword text holds
for about 2 seconds then clears", "one SFX only, on the hardest cut". Never
include this video's subject matter, names, or wording."""


class GeminiVideoUnderstand(BaseTool):
    name = "gemini_video_understand"
    version = "0.1.0"
    tier = ToolTier.CORE
    capability = "analysis"
    provider = "gemini"
    stability = ToolStability.EXPERIMENTAL
    execution_mode = ExecutionMode.SYNC
    determinism = Determinism.STOCHASTIC
    runtime = ToolRuntime.API

    dependencies = ["env:GEMINI_API_KEY"]
    install_instructions = (
        "Set GEMINI_API_KEY (or GOOGLE_API_KEY) to a Google AI Studio key:\n"
        "  https://aistudio.google.com/apikey\n"
        "Video understanding is billed per token and video frames are expensive —\n"
        "budget a few cents per 60s clip. Run operation='list_models' first to see\n"
        "which video-capable models this key can actually reach."
    )
    fallback = "video_analyzer"
    fallback_tools = ["video_analyzer", "frame_sampler", "scene_detect", "transcriber"]
    agent_skills = ["video-understand"]
    related_skills = ["shorts-hook-selector", "video-reference-analyst"]

    capabilities = [
        "native_video_understanding",
        "timeline_extraction",
        "on_screen_text_timing",
        "audio_event_timing",
        "hook_analysis",
    ]
    supports = {
        "youtube_url": True,
        "local_file": True,
        "audio_video_joint": True,
        "sub_second_events": True,
    }
    best_for = [
        "measuring a competitor's hook timing to the tenth of a second",
        "extracting reusable edit rules from a high-performing Short",
        "finding when on-screen text and SFX land, which frame sampling misses",
    ]
    not_good_for = [
        "recreating another creator's video (out of scope by design)",
        "offline work",
        "anything where the frame-sampling fallback is already good enough",
    ]

    BASE = "https://generativelanguage.googleapis.com/v1beta"
    # Resumable uploads live under a DIFFERENT path prefix than the rest of the
    # API. Posting to {BASE}/files returns 200 but no X-Goog-Upload-URL header,
    # which fails later and confusingly — it must be /upload/v1beta/files.
    UPLOAD_BASE = "https://generativelanguage.googleapis.com/upload/v1beta"
    # Confirmed present on this account via operation="list_models" (2026-09-06):
    # gemini-3.8-flash, 1M-token context, video-capable. Pinned rather than left
    # on a "-latest" alias so a silent model rotation cannot change the timings
    # this tool reports between one competitor analysis and the next.
    DEFAULT_MODEL = "gemini-3.8-flash"

    input_schema = {
        "type": "object",
        "properties": {
            "operation": {
                "type": "string",
                "enum": ["analyze", "analyze_hook", "list_models"],
                "default": "analyze",
                "description": (
                    "analyze = whole video; analyze_hook = spend the budget on the "
                    "opening seconds only, which is where retention is decided; "
                    "list_models = discover which video-capable models the key reaches."
                ),
            },
            "video_url": {"type": "string", "description": "YouTube URL, passed to Gemini directly."},
            "video_path": {"type": "string", "description": "Local video file (uploaded via the File API)."},
            "hook_seconds": {"type": "number", "default": 10, "description": "Window for analyze_hook."},
            "model": {"type": "string", "description": f"Defaults to {DEFAULT_MODEL}."},
            "extra_questions": {
                "type": "string",
                "description": "Appended to the analysis prompt for one-off questions.",
            },
            "output_path": {"type": "string", "description": "Where to write the timeline JSON."},
            "timeout_seconds": {"type": "integer", "default": 600},
        },
    }
    output_schema = {
        "type": "object",
        "properties": {
            "timeline": {"type": "object"},
            "output_path": {"type": "string"},
            "model": {"type": "string"},
            "token_usage": {"type": "object"},
        },
    }

    resource_profile = ResourceProfile(
        cpu_cores=1, ram_mb=512, vram_mb=0, disk_mb=100, network_required=True
    )
    side_effects = ["uploads local video to the Gemini File API", "consumes Gemini API tokens"]
    user_visible_verification = [
        "Spot-check two or three reported timestamps against the real video",
        "Confirm reusable_rules contain no content specific to the source video",
    ]

    # ------------------------------------------------------------------ setup

    def _key(self) -> Optional[str]:
        for var in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
            val = (os.environ.get(var) or "").strip()
            if val:
                return val
        return None

    def get_status(self) -> ToolStatus:
        return ToolStatus.AVAILABLE if self._key() else ToolStatus.UNAVAILABLE

    def estimate_cost(self, inputs: dict[str, Any]) -> float:
        # Video is billed mostly as frame tokens. Without a confirmed per-model
        # rate this is an order-of-magnitude guide, not a quote — the real number
        # comes back in data["token_usage"].
        seconds = 60.0 if inputs.get("operation") != "analyze_hook" else float(
            inputs.get("hook_seconds", 10)
        )
        return round(seconds * 0.0005, 4)

    def estimate_runtime(self, inputs: dict[str, Any]) -> float:
        return 45.0

    # ------------------------------------------------------------- file upload

    def _upload(self, path: Path, key: str, timeout: int) -> str:
        mime = mimetypes.guess_type(path.name)[0] or "video/mp4"
        size = path.stat().st_size
        start = requests.post(
            f"{self.UPLOAD_BASE}/files?key={key}",
            headers={
                "X-Goog-Upload-Protocol": "resumable",
                "X-Goog-Upload-Command": "start",
                "X-Goog-Upload-Header-Content-Length": str(size),
                "X-Goog-Upload-Header-Content-Type": mime,
                "Content-Type": "application/json",
            },
            json={"file": {"display_name": path.name}},
            timeout=120,
        )
        start.raise_for_status()
        upload_url = start.headers.get("X-Goog-Upload-URL")
        if not upload_url:
            raise RuntimeError("Gemini File API did not return an upload URL.")

        up = requests.post(
            upload_url,
            headers={
                "Content-Length": str(size),
                "X-Goog-Upload-Offset": "0",
                "X-Goog-Upload-Command": "upload, finalize",
            },
            data=path.read_bytes(),
            timeout=timeout,
        )
        up.raise_for_status()
        info = up.json().get("file", {})
        uri, name = info.get("uri"), info.get("name")
        if not uri:
            raise RuntimeError(f"Gemini File API returned no uri: {info}")

        # Video files sit in PROCESSING until Gemini has decoded them; generating
        # against an unprocessed file fails, so wait it out.
        deadline = time.time() + timeout
        while time.time() < deadline:
            st = requests.get(f"{self.BASE}/{name}?key={key}", timeout=60)
            state = st.json().get("state") if st.ok else None
            if state == "ACTIVE":
                return uri
            if state == "FAILED":
                raise RuntimeError(f"Gemini failed to process {path.name}.")
            time.sleep(4)
        raise RuntimeError(f"Gemini still processing {path.name} after {timeout}s.")

    # ---------------------------------------------------------------- execute

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        key = self._key()
        if not key:
            return ToolResult(success=False, error="No Gemini key. " + self.install_instructions)

        op = inputs.get("operation", "analyze")
        model = inputs.get("model") or self.DEFAULT_MODEL
        timeout = int(inputs.get("timeout_seconds") or 600)

        if op == "list_models":
            try:
                r = requests.get(f"{self.BASE}/models?key={key}", timeout=60)
                r.raise_for_status()
                models = [
                    {
                        "name": m.get("name", "").replace("models/", ""),
                        "display_name": m.get("displayName"),
                        "input_token_limit": m.get("inputTokenLimit"),
                    }
                    for m in r.json().get("models", [])
                    if "generateContent" in (m.get("supportedGenerationMethods") or [])
                ]
                return ToolResult(success=True, data={"models": models, "count": len(models)})
            except Exception as exc:  # noqa: BLE001
                return ToolResult(success=False, error=f"Gemini model listing failed: {exc}")

        url, path_in = inputs.get("video_url"), inputs.get("video_path")
        if not url and not path_in:
            return ToolResult(success=False, error="Provide video_url (YouTube) or video_path.")

        prompt = ANALYSIS_PROMPT
        if op == "analyze_hook":
            window = float(inputs.get("hook_seconds", 10))
            prompt = (
                f"Analyse ONLY the first {window:g} seconds of this video, in fine detail. "
                "This window decides whether a viewer stays, so account for every frame.\n\n"
                + prompt
            )
        if inputs.get("extra_questions"):
            prompt += f"\n\nAlso answer: {inputs['extra_questions']}"

        parts: list[dict[str, Any]] = [{"text": prompt}]
        try:
            if url:
                parts.append({"fileData": {"fileUri": url}})
            else:
                p = Path(str(path_in))
                if not p.exists():
                    return ToolResult(success=False, error=f"No such video: {p}")
                uri = self._upload(p, key, timeout)
                mime = mimetypes.guess_type(p.name)[0] or "video/mp4"
                parts.append({"fileData": {"fileUri": uri, "mimeType": mime}})
        except Exception as exc:  # noqa: BLE001
            return ToolResult(success=False, error=f"Preparing the video failed: {exc}")

        started = time.time()
        try:
            payload = {
                "contents": [{"parts": parts}],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "responseSchema": TIMELINE_SCHEMA,
                    "temperature": 0.2,
                },
            }
            # 503/429 are routine on video requests — the model is simply busy,
            # and a video analysis that already paid for the upload should not be
            # thrown away over it.
            resp = None
            for attempt in range(4):
                resp = requests.post(
                    f"{self.BASE}/models/{model}:generateContent?key={key}",
                    headers={"Content-Type": "application/json"},
                    json=payload,
                    timeout=timeout,
                )
                if resp.status_code not in (429, 500, 503):
                    break
                if attempt < 3:
                    time.sleep(8 * (attempt + 1))
            if resp.status_code == 404:
                return ToolResult(
                    success=False,
                    error=f"Model '{model}' not reachable with this key. "
                    "Run operation='list_models' and pin one that is.",
                )
            resp.raise_for_status()
            body = resp.json()
            text = body["candidates"][0]["content"]["parts"][0]["text"]
            timeline = json.loads(text)
        except Exception as exc:  # noqa: BLE001
            return ToolResult(success=False, error=f"Gemini video analysis failed: {exc}")

        out = inputs.get("output_path")
        if out:
            op_path = Path(out)
            op_path.parent.mkdir(parents=True, exist_ok=True)
            op_path.write_text(json.dumps(timeline, ensure_ascii=False, indent=1), encoding="utf-8")

        usage = body.get("usageMetadata", {})
        return ToolResult(
            success=True,
            data={
                "timeline": timeline,
                "output_path": out,
                "model": model,
                "token_usage": usage,
                "source": url or str(path_in),
            },
            artifacts=[out] if out else [],
            cost_usd=self.estimate_cost(inputs),
            duration_seconds=round(time.time() - started, 2),
            model=model,
        )
