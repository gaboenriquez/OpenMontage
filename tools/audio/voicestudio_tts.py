"""VoiceStudio local text-to-speech tool (the channel owner's cloned voice).

VoiceStudio (github.com/debpalash/VoiceStudio, AGPL) runs OmniVoice on-device
and exposes an OpenAI-compatible API. It costs $0 per read and is the only
provider here that speaks in Gabriel's own voice, so the viral-loop playbook
routes "con mi voz" videos to it.

Checkout: ~/VoiceStudio. Start the backend with `bun run dev:api` there.

CONFIRMED LIVE 2026-09-19:
    GET  /health            -> {"status": "starting", ...} while PyTorch loads,
                               then {"status": "ok", "device": "mps"}. Only "ok" is usable.
    GET  /v1/audio/voices   -> {"voices": [...]}; cloned voices have type "profile".
    POST /v1/audio/speech   -> audio/wav, 24 kHz mono pcm_s16le.
    A 138-char Spanish line took ~19 s cold on MPS (10.4 s of audio) and
    transcribed back word for word.
"""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any

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


class VoiceStudioTTS(BaseTool):
    name = "voicestudio_tts"
    version = "0.1.0"
    tier = ToolTier.VOICE
    capability = "tts"
    provider = "voicestudio"
    stability = ToolStability.EXPERIMENTAL
    execution_mode = ExecutionMode.SYNC
    determinism = Determinism.STOCHASTIC
    runtime = ToolRuntime.LOCAL_GPU

    dependencies = []
    install_instructions = (
        "VoiceStudio backend must be running on http://localhost:3900\n"
        "(override with VOICESTUDIO_URL):\n"
        "  cd ~/VoiceStudio && bun run dev:api\n"
        "Wait until GET /health returns status 'ok' (PyTorch load takes ~30-60 s)."
    )
    fallback = "piper_tts"
    fallback_tools = ["piper_tts", "ai33_tts"]
    agent_skills = ["text-to-speech", "voicestudio"]

    capabilities = ["text_to_speech", "voice_selection", "multilingual", "offline_generation"]
    supports = {
        "voice_cloning": True,
        "multilingual": True,
        "offline": True,
        "ssml": False,
        "word_timestamps": False,  # run the transcriber for captions
    }
    best_for = [
        "videos narrated in the channel owner's own cloned voice",
        "zero-cost Spanish narration",
    ]
    not_good_for = [
        "fast turnaround on long scripts (local generation, ~2x realtime cold)",
        "voices the owner has not recorded and consented to",
    ]

    # Gabriel's cloned profile. Ids come from GET /v1/audio/voices; never invent one.
    OWNER_VOICE = "a60a560e"
    VOICE_ALIASES = {"gabriel": OWNER_VOICE, "mi voz": OWNER_VOICE, "owner": OWNER_VOICE}

    input_schema = {
        "type": "object",
        "required": ["text"],
        "properties": {
            "text": {"type": "string", "description": "Text to speak."},
            "voice_id": {
                "type": "string",
                "description": (
                    "VoiceStudio profile id, or the aliases 'gabriel'/'mi voz'/'owner'. "
                    "Defaults to Gabriel's profile. List with operation='list_voices'."
                ),
            },
            "speed": {"type": "number", "default": 1.0, "minimum": 0.5, "maximum": 2.0},
            "output_path": {"type": "string"},
            "timeout_seconds": {"type": "integer", "default": 900},
        },
    }
    output_schema = {
        "type": "object",
        "properties": {"audio_path": {"type": "string"}, "voice_id": {"type": "string"}},
    }

    resource_profile = ResourceProfile(
        cpu_cores=2, ram_mb=4096, vram_mb=4096, disk_mb=50, network_required=False
    )
    side_effects = ["writes an audio file to output_path"]
    user_visible_verification = [
        "Listen to the first 10 seconds: it must sound like Gabriel, not the engine default",
        "Check accented proper nouns and numbers are read correctly",
    ]

    def _base_url(self) -> str:
        return (os.environ.get("VOICESTUDIO_URL") or "http://localhost:3900").rstrip("/")

    def get_status(self) -> ToolStatus:
        try:
            r = requests.get(f"{self._base_url()}/health", timeout=3)
            ok = r.json().get("status") == "ok"
        except Exception:  # noqa: BLE001
            ok = False
        return ToolStatus.AVAILABLE if ok else ToolStatus.UNAVAILABLE

    def estimate_cost(self, inputs: dict[str, Any]) -> float:
        return 0.0

    def estimate_runtime(self, inputs: dict[str, Any]) -> float:
        # ~15 chars of Spanish per second of audio, generated at ~2x realtime cold.
        return 10.0 + len(str(inputs.get("text", ""))) / 7.0

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        base = self._base_url()

        if inputs.get("operation") == "list_voices":
            try:
                r = requests.get(f"{base}/v1/audio/voices", timeout=30)
                voices = [v for v in r.json().get("voices", []) if v.get("type") == "profile"]
            except Exception as exc:  # noqa: BLE001
                return ToolResult(success=False, error=f"VoiceStudio voice listing failed: {exc}")
            return ToolResult(success=True, data={"voices": voices})

        text = str(inputs.get("text") or "").strip()
        if not text:
            return ToolResult(success=False, error="'text' is required and cannot be empty.")
        voice_id = str(inputs.get("voice_id") or self.OWNER_VOICE).strip()
        voice_id = self.VOICE_ALIASES.get(voice_id.lower(), voice_id)

        out = Path(inputs.get("output_path") or "narration_voicestudio.wav")
        payload = {
            "model": "tts-1",
            "voice": voice_id,
            "input": text,
            "response_format": "wav",
            "speed": float(inputs.get("speed", 1.0)),
        }

        started = time.time()
        try:
            resp = requests.post(
                f"{base}/v1/audio/speech",
                json=payload,
                timeout=int(inputs.get("timeout_seconds") or 900),
            )
        except Exception as exc:  # noqa: BLE001
            return ToolResult(
                success=False,
                error=f"VoiceStudio unreachable at {base}: {exc}. {self.install_instructions}",
            )

        # An error body must never be saved under an audio filename.
        ctype = (resp.headers.get("Content-Type") or "").lower()
        if resp.status_code >= 400 or not ctype.startswith("audio/"):
            return ToolResult(
                success=False,
                error=f"VoiceStudio TTS failed ({resp.status_code}): {resp.text[:300]}",
            )

        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(resp.content)
        return ToolResult(
            success=True,
            data={"audio_path": str(out), "voice_id": voice_id},
            artifacts=[str(out)],
            cost_usd=0.0,
            duration_seconds=round(time.time() - started, 2),
            model=voice_id,
        )
