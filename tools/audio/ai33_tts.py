"""Ai33.Pro (OpenSpeaker) text-to-speech provider tool.

Ai33.Pro is an aggregator: one API in front of ElevenLabs, MiniMax and Edge
voices, sold as a flat credit package. At the 2026-09 price of $5 per
1,000,000 credits (~1,700 minutes of TTS) a 55-second Short costs roughly
$0.003 to narrate, against ~$0.09 on an ElevenLabs starter plan.

Because it is a reseller, the underlying voice licence is Ai33's to grant,
not ElevenLabs'. Confirm commercial-use terms before building a channel on it.

Voice ids carry the backend as a prefix, which is how you pick the engine:
    elevenlabs_hpp4J3VqNfWAUOO0d1Us
    minimax_male-qn-qingse
    edge_es-ES-AlvaroNeural

RESPONSE SHAPE (confirmed live 2026-09-07, no longer guesswork):
    POST /v3/text-to-speech          -> {"success": true, "task_id": "<uuid>"}
    GET  /v3/task/<task_id>          -> {"success": true, "data": {...}}
      data.status       "done" | "failed" | in-progress
      data.progress     0-100
      data.credit_cost  credits actually billed
      data.metadata.audio_url   <- the mp3 lives HERE, nested two levels down
Note the polling path is /v3/task/<id>, NOT /v3/text-to-speech/<id> (404), and the
url is never at the top level of `data` — both cost an iteration to discover.
"""

from __future__ import annotations

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


class Ai33TTS(BaseTool):
    name = "ai33_tts"
    version = "0.1.0"
    tier = ToolTier.VOICE
    capability = "tts"
    provider = "ai33"
    stability = ToolStability.EXPERIMENTAL
    execution_mode = ExecutionMode.SYNC
    determinism = Determinism.STOCHASTIC
    runtime = ToolRuntime.API

    dependencies = ["env:AI33_API_KEY"]
    install_instructions = (
        "Set AI33_API_KEY to an API key from https://ai33.pro/app/api-document\n"
        "Credits are bought as a flat package (2026-09: $5 = 1,000,000 credits\n"
        "= ~1,700 minutes of speech). Ai33 resells ElevenLabs/MiniMax/Edge voices,\n"
        "so check their commercial-use terms before publishing at scale."
    )
    fallback = "elevenlabs_tts"
    fallback_tools = ["elevenlabs_tts", "fal_elevenlabs_tts", "google_tts", "piper_tts"]
    agent_skills = ["text-to-speech", "elevenlabs"]

    capabilities = [
        "text_to_speech",
        "voice_selection",
        "multilingual",
        "multi_speaker_dialogue",
    ]
    supports = {
        "voice_cloning": True,
        "multilingual": True,
        "offline": False,
        "ssml": False,
        "dialogue": True,
        "word_timestamps": True,  # with_transcript=true
    }
    best_for = [
        "high-volume narration where per-character billing is the constraint",
        "Spanish Shorts narration at ~$0.003 per 55-second read",
        "multi-speaker dialogue via the /dialogue endpoint",
    ]
    not_good_for = [
        "offline production",
        "deterministic reproducible output",
        "work where the end client requires a first-party voice licence",
    ]

    BASE_URL = "https://api.ai33.pro/v3"

    # The Stoicism series is narrated by "Charlie" (deep, confident, energetic),
    # an ElevenLabs preset reached through Ai33's elevenlabs_ backend. Keeping the
    # voice identical across parts is a locked creative rule for that channel — a
    # timbre change reads as a different channel even when everything else matches.
    #
    # CONFIRMED 2026-09-07 against GET /v3/voices?provider=elevenlabs, which lists
    # it as "Charlie - Deep, Confident, Energetic". Note that endpoint REQUIRES a
    # provider query param (elevenlabs | minimax | clone | edge | kok...) and 400s
    # without one.
    SERIES_VOICE = "elevenlabs_IKne3meq5aSn9XLyUdCD"
    VOICE_ALIASES = {
        "charlie": SERIES_VOICE,
        "series": SERIES_VOICE,
        "estoicismo": SERIES_VOICE,
    }

    # GET /v3/voices REQUIRES a `provider` query param and 400s without one
    # (confirmed live 2026-09-07). These are the backends Ai33 fronts; if the
    # caller doesn't pick one, list_voices iterates all of them and merges
    # the results rather than guessing a single default.
    KNOWN_PROVIDERS = ["elevenlabs", "minimax", "clone", "edge", "kokoro"]

    # Billing is per CREDIT, not per minute. Measured on a real call 2026-09-07:
    # a 686-char Spanish script cost 781 credits => ~1.14 credits per character.
    # At $5 per 1,000,000 credits that is $0.0000057 per credit. The earlier
    # minutes-based estimate was ~35% low, so bill off characters instead.
    _CREDITS_PER_CHAR = 781 / 686.0
    _USD_PER_CREDIT = 5.0 / 1_000_000.0

    input_schema = {
        "type": "object",
        "required": ["text"],
        "properties": {
            "text": {"type": "string", "description": "Text to speak."},
            "voice_id": {
                "type": "string",
                "description": (
                    "Backend-prefixed voice id, e.g. 'elevenlabs_hpp4J3VqNfWAUOO0d1Us', "
                    "'minimax_male-qn-qingse' or 'edge_es-ES-AlvaroNeural'. Also accepts "
                    "the aliases 'charlie'/'series'/'estoicismo'. Defaults to the Stoicism "
                    "series voice (Charlie). List them with operation='list_voices'."
                ),
            },
            "speed": {"type": "number", "default": 1.0, "minimum": 0.5, "maximum": 2.0},
            "provider": {
                "type": "string",
                "enum": ["elevenlabs", "minimax", "clone", "edge", "kokoro"],
                "description": (
                    "Backend to list voices for with operation='list_voices'. "
                    "Ai33's /voices endpoint requires this param and 400s without "
                    "it. Omit it to list all known providers and merge the results."
                ),
            },
            "with_transcript": {
                "type": "boolean",
                "default": False,
                "description": "Ask Ai33 for word timings alongside the audio.",
            },
            "output_path": {"type": "string"},
            "timeout_seconds": {"type": "integer", "default": 300},
        },
    }
    output_schema = {
        "type": "object",
        "properties": {
            "audio_path": {"type": "string"},
            "voice_id": {"type": "string"},
            "transcript": {"type": "object"},
            "response_shape": {"type": "string"},
        },
    }

    resource_profile = ResourceProfile(
        cpu_cores=1, ram_mb=256, vram_mb=0, disk_mb=50, network_required=True
    )
    side_effects = ["writes an audio file to output_path", "consumes Ai33 credits"]
    user_visible_verification = [
        "Listen to the output and confirm the voice matches the rest of the series",
        "Check proper nouns are pronounced correctly (accented Spanish names)",
    ]

    # ---------------------------------------------------------------- helpers

    def _get_api_key(self) -> Optional[str]:
        for var in ("AI33_API_KEY", "AI33_PRO_API_KEY", "OPENSPEAKER_API_KEY"):
            val = (os.environ.get(var) or "").strip()
            if val:
                return val
        return None

    def get_status(self) -> ToolStatus:
        return ToolStatus.AVAILABLE if self._get_api_key() else ToolStatus.UNAVAILABLE

    def estimate_cost(self, inputs: dict[str, Any]) -> float:
        chars = len(str(inputs.get("text", "")))
        return round(chars * self._CREDITS_PER_CHAR * self._USD_PER_CREDIT, 6)

    def estimate_runtime(self, inputs: dict[str, Any]) -> float:
        # Async task; measured ~20s end to end for a 686-char script.
        chars = len(str(inputs.get("text", "")))
        return 8.0 + chars / 40.0

    def _extract_audio(
        self, resp: requests.Response, key: str, timeout: int
    ) -> tuple[Optional[bytes], str, dict[str, Any]]:
        """Return (audio_bytes, shape_label, extra) across the plausible shapes."""
        ctype = (resp.headers.get("Content-Type") or "").lower()

        # 1. the endpoint streamed the audio straight back
        if "application/json" not in ctype and resp.content[:4] in (b"ID3\x03", b"RIFF", b"OggS"):
            return resp.content, "raw_bytes", {}
        if ctype.startswith("audio/"):
            return resp.content, "raw_bytes", {}

        try:
            body = resp.json()
        except ValueError:
            # not JSON and not a recognised audio magic number — treat as audio anyway
            return (resp.content or None), "raw_bytes_unrecognised", {}

        if body.get("success") is False:
            err = body.get("error") or {}
            raise RuntimeError(
                f"Ai33 error [{err.get('code', '?')}/{err.get('stage', '?')}]: "
                f"{err.get('message') or body.get('message')}"
            )

        payload = body.get("data") if isinstance(body.get("data"), dict) else body
        extra = {k: payload.get(k) for k in ("transcript", "duration", "credits") if payload.get(k)}

        # 2. a direct URL to the rendered audio
        for field in ("audio_url", "url", "output_url", "file_url", "audio"):
            val = payload.get(field)
            if isinstance(val, str) and val.startswith("http"):
                got = requests.get(val, timeout=timeout)
                got.raise_for_status()
                return got.content, f"url:{field}", extra

        # 3. the documented path: an async task polled at /v3/task/<id>
        job_id = None
        for field in ("task_id", "id", "job_id", "request_id"):
            if isinstance(payload.get(field), (str, int)):
                job_id = str(payload[field])
                break
        if job_id is None and isinstance(body.get("task_id"), str):
            job_id = body["task_id"]
        if job_id:
            deadline = time.time() + timeout
            headers = {"xi-api-key": key}
            last = {}
            while time.time() < deadline:
                poll = requests.get(f"{self.BASE_URL}/task/{job_id}", headers=headers, timeout=60)
                if poll.ok:
                    pd = (poll.json() or {}).get("data") or {}
                    last = pd
                    status = str(pd.get("status", "")).lower()
                    if status in {"failed", "error"}:
                        raise RuntimeError(f"Ai33 task {job_id} failed: {pd}")
                    meta = pd.get("metadata") or {}
                    audio_url = meta.get("audio_url") or pd.get("audio_url")
                    if audio_url:
                        got = requests.get(audio_url, timeout=timeout)
                        got.raise_for_status()
                        extra.update(
                            {
                                "task_id": job_id,
                                "credit_cost": pd.get("credit_cost"),
                                "voice": meta.get("voice"),
                                "provider": (meta.get("v3") or {}).get("provider"),
                            }
                        )
                        if meta.get("transcript"):
                            extra["transcript"] = meta["transcript"]
                        return got.content, "task_poll", extra
                time.sleep(3)
            raise RuntimeError(
                f"Ai33 task {job_id} never produced audio_url within {timeout}s "
                f"(last status: {last.get('status')}, progress: {last.get('progress')})."
            )

        raise RuntimeError(
            f"Could not find audio in the Ai33 response. Keys seen: {sorted(payload)[:12]}. "
            "Update _extract_audio in tools/audio/ai33_tts.py with the real shape."
        )

    # ---------------------------------------------------------------- execute

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        key = self._get_api_key()
        if not key:
            return ToolResult(success=False, error="No Ai33 API key. " + self.install_instructions)

        if inputs.get("operation") == "list_voices":
            provider = str(inputs.get("provider") or "").strip().lower()
            providers = [provider] if provider else self.KNOWN_PROVIDERS
            voices_by_provider: dict[str, Any] = {}
            errors: dict[str, str] = {}
            for p in providers:
                try:
                    r = requests.get(
                        f"{self.BASE_URL}/voices",
                        headers={"xi-api-key": key},
                        params={"provider": p},
                        timeout=60,
                    )
                    r.raise_for_status()
                    voices_by_provider[p] = r.json()
                except Exception as exc:  # noqa: BLE001
                    errors[p] = str(exc)
            if not voices_by_provider:
                return ToolResult(
                    success=False,
                    error=f"Ai33 voice listing failed for all providers: {errors}",
                )
            data: dict[str, Any] = {"voices": voices_by_provider}
            if errors:
                data["errors"] = errors
            if provider:
                # single provider requested: keep the flat shape callers expect
                data["voices"] = voices_by_provider[provider]
            return ToolResult(success=True, data=data)

        text = str(inputs.get("text") or "").strip()
        if not text:
            return ToolResult(success=False, error="'text' is required and cannot be empty.")
        voice_id = str(inputs.get("voice_id") or self.SERIES_VOICE).strip()
        voice_id = self.VOICE_ALIASES.get(voice_id.lower(), voice_id)

        timeout = int(inputs.get("timeout_seconds") or 300)
        out = Path(inputs.get("output_path") or "narration_ai33.mp3")
        out.parent.mkdir(parents=True, exist_ok=True)

        # The API is multipart/form-data, not JSON. receive_url is deliberately
        # omitted: without a webhook the endpoint should answer inline, and the
        # polling branch in _extract_audio covers it if it does not.
        form = {
            "text": (None, text),
            "voice_id": (None, voice_id),
            "speed": (None, str(inputs.get("speed", 1))),
            "with_transcript": (None, "true" if inputs.get("with_transcript") else "false"),
        }

        started = time.time()
        try:
            resp = requests.post(
                f"{self.BASE_URL}/text-to-speech",
                headers={"xi-api-key": key},
                files=form,
                timeout=timeout,
            )
            if resp.status_code == 401:
                return ToolResult(success=False, error="Ai33 rejected the API key (401).")
            resp.raise_for_status()
            audio, shape, extra = self._extract_audio(resp, key, timeout)
        except Exception as exc:  # noqa: BLE001
            return ToolResult(success=False, error=f"Ai33 TTS failed: {exc}")

        if not audio:
            return ToolResult(success=False, error="Ai33 returned an empty audio body.")

        out.write_bytes(audio)
        return ToolResult(
            success=True,
            data={
                "audio_path": str(out),
                "voice_id": voice_id,
                "response_shape": shape,
                **extra,
            },
            artifacts=[str(out)],
            cost_usd=self.estimate_cost(inputs),
            duration_seconds=round(time.time() - started, 2),
            model=voice_id,
        )
