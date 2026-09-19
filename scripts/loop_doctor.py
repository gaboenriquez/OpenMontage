#!/usr/bin/env python3
"""Preflight for the viral loop (skills/viral-loop). Run before every lap:

    .venv/bin/python scripts/loop_doctor.py

FAIL = the lap cannot run; WARN = a part of it cannot (e.g. no voice for "con mi voz").
Exit code 1 if any FAIL. Every line says how to fix it.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
# The loop always runs with the venv activated (piper lives in .venv/bin).
os.environ["PATH"] = f"{ROOT / '.venv' / 'bin'}{os.pathsep}{os.environ.get('PATH', '')}"
SPANISH_PIPER_MODEL = "es_MX-claude-high"

OWNER_VOICE = "a60a560e"
VOICESTUDIO = (os.environ.get("VOICESTUDIO_URL") or "http://localhost:3900").rstrip("/")
MIN_FREE_GB = 10

results: list[tuple[str, str, str]] = []


def report(level: str, what: str, fix: str = "") -> None:
    results.append((level, what, fix))


def check_binaries() -> None:
    for cmd in ("ffmpeg", "ffprobe", "node", "npx", "git"):
        if shutil.which(cmd):
            report("OK", cmd)
        else:
            report("FAIL", f"{cmd} not on PATH", f"brew install {'node' if cmd in ('node', 'npx') else cmd}")
    if (ROOT / ".venv" / "bin" / "python").exists():
        report("OK", ".venv")
    else:
        report("FAIL", ".venv missing", "make setup")
    if (ROOT / "remotion-composer" / "node_modules").is_dir():
        report("OK", "remotion-composer/node_modules")
    else:
        report("FAIL", "Remotion dependencies missing", "cd remotion-composer && npm install")


def check_upstream() -> None:
    subprocess.run(["git", "fetch", "-q", "origin", "main"], cwd=ROOT, capture_output=True)
    proc = subprocess.run(
        ["git", "rev-list", "--count", "HEAD..origin/main"], cwd=ROOT, capture_output=True, text=True
    )
    if proc.returncode != 0:
        report("WARN", "could not compare with calesthio/OpenMontage", "check network / `git remote -v`")
        return
    behind = int(proc.stdout.strip() or 0)
    if behind == 0:
        report("OK", "up to date with calesthio/OpenMontage")
    else:
        report(
            "WARN",
            f"{behind} commit(s) behind calesthio/OpenMontage",
            ".venv/bin/python scripts/sync_upstream.py",
        )


def check_voicestudio() -> None:
    try:
        status = requests.get(f"{VOICESTUDIO}/health", timeout=3).json().get("status")
    except Exception:  # noqa: BLE001
        status = None
    if status != "ok":
        report(
            "WARN",
            f"VoiceStudio not ready ({status or 'not running'}): 'voz: gabriel' videos blocked",
            "cd ~/VoiceStudio && bun run dev:api   (wait ~60 s)",
        )
        return
    try:
        voices = requests.get(f"{VOICESTUDIO}/v1/audio/voices", timeout=10).json().get("voices", [])
    except Exception as exc:  # noqa: BLE001
        report("WARN", f"VoiceStudio voice list failed: {exc}")
        return
    if any(v.get("voice_id") == OWNER_VOICE for v in voices):
        report("OK", "VoiceStudio + Gabriel's voice profile")
    else:
        report("FAIL", f"Gabriel's voice profile {OWNER_VOICE} is gone", "re-clone it in VoiceStudio, then update OWNER_VOICE in tools/audio/voicestudio_tts.py")


def check_env_and_budget() -> None:
    env = {}
    env_file = ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    if env.get("PEXELS_API_KEY") or os.environ.get("PEXELS_API_KEY"):
        report("OK", "PEXELS_API_KEY (free stock footage)")
    else:
        report("WARN", "no PEXELS_API_KEY: documentary footage limited to Archive.org/Wikimedia", "free key at pexels.com/api")

    try:
        import yaml

        budget = yaml.safe_load((ROOT / "config.yaml").read_text()).get("budget", {})
    except Exception as exc:  # noqa: BLE001
        report("FAIL", f"config.yaml unreadable: {exc}")
        return
    if budget.get("require_approval_for_new_paid_tool") is True:
        report("OK", "paid tools need approval")
    else:
        report("FAIL", "paid tools can run without approval", "config.yaml: budget.require_approval_for_new_paid_tool: true")


def check_tools() -> None:
    from tools.base_tool import ToolStatus
    from tools.tool_registry import registry

    registry.discover()
    for name, level in (("piper_tts", "WARN"), ("voicestudio_tts", "WARN"), ("video_compose", "FAIL")):
        tool = registry.get(name)
        if tool is None:
            report("FAIL", f"tool {name} not registered", "scripts/sync_upstream.py may have dropped it; check git log")
        elif tool.get_status() == ToolStatus.AVAILABLE:
            report("OK", f"tool {name}")
        else:
            report(level, f"tool {name} unavailable", getattr(tool, "install_instructions", "").splitlines()[0] if getattr(tool, "install_instructions", "") else "")


def check_spanish_fallback_voice() -> None:
    if (ROOT / f"{SPANISH_PIPER_MODEL}.onnx").exists():
        report("OK", f"Spanish fallback voice ({SPANISH_PIPER_MODEL})")
    else:
        report(
            "WARN",
            "no Spanish Piper model: the 'estudio' fallback would narrate in English",
            f".venv/bin/python -m piper.download_voices {SPANISH_PIPER_MODEL}",
        )


def check_disk() -> None:
    free_gb = shutil.disk_usage(ROOT).free / 1e9
    if free_gb >= MIN_FREE_GB:
        report("OK", f"{free_gb:.0f} GB free")
    else:
        report("FAIL", f"only {free_gb:.1f} GB free (renders need ~{MIN_FREE_GB})", "clean projects/*/renders or .cache")


def main() -> int:
    for check in (check_binaries, check_upstream, check_voicestudio, check_env_and_budget, check_tools, check_spanish_fallback_voice, check_disk):
        try:
            check()
        except Exception as exc:  # noqa: BLE001  one broken check must not hide the others
            report("FAIL", f"{check.__name__} crashed: {exc}")
    icons = {"OK": "✅", "WARN": "⚠️ ", "FAIL": "❌"}
    for level, what, fix in results:
        print(f"{icons[level]} {what}" + (f"\n     → {fix}" if fix and level != "OK" else ""))
    fails = sum(1 for r in results if r[0] == "FAIL")
    warns = sum(1 for r in results if r[0] == "WARN")
    print(f"\n{'LISTO' if not fails else 'NO LISTO'}: {fails} fail, {warns} warn")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
