from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

pytest.importorskip("diffusers")

from tools.graphics import local_diffusion as ld  # noqa: E402


def _fake_torch(cuda=False, mps=False):
    return SimpleNamespace(
        cuda=SimpleNamespace(is_available=lambda: cuda),
        backends=SimpleNamespace(mps=SimpleNamespace(is_available=lambda: mps)),
    )


def test_device_prefers_cuda_then_mps_then_cpu():
    assert ld.pick_device(_fake_torch(cuda=True, mps=True)) == "cuda"
    assert ld.pick_device(_fake_torch(mps=True)) == "mps"
    assert ld.pick_device(_fake_torch()) == "cpu"


@pytest.fixture
def fake_loader(monkeypatch):
    """Replace real model loading; record every load and every generation call."""
    loads, calls = [], []

    def load(model_id, lora, device, dtype, vae=None):
        loads.append((model_id, lora))

        def pipe(prompt, **kw):
            calls.append(kw)
            img = MagicMock()
            img.save = lambda path: open(path, "wb").write(b"png")
            return SimpleNamespace(images=[img])

        return pipe

    monkeypatch.setattr(ld, "_load_pipeline", load)
    ld.LocalDiffusion._PIPELINES.clear()
    return loads, calls


def test_pipeline_is_loaded_once_and_reused(fake_loader, tmp_path):
    loads, _ = fake_loader
    tool = ld.LocalDiffusion()
    for i in range(3):
        r = tool.execute({"prompt": "x", "model": "m", "output_path": str(tmp_path / f"{i}.png")})
        assert r.success, r.error
    assert loads == [("m", None)]


def test_changing_lora_loads_a_new_pipeline(fake_loader, tmp_path):
    loads, _ = fake_loader
    tool = ld.LocalDiffusion()
    tool.execute({"prompt": "x", "model": "m", "output_path": str(tmp_path / "a.png")})
    tool.execute({"prompt": "x", "model": "m", "lora": "repo:file.safetensors", "output_path": str(tmp_path / "b.png")})
    assert loads == [("m", None), ("m", "repo:file.safetensors")]


def test_lightning_lora_defaults_to_8_steps_no_cfg(fake_loader, tmp_path):
    _, calls = fake_loader
    ld.LocalDiffusion().execute(
        {
            "prompt": "x",
            "model": "m",
            "lora": "ByteDance/SDXL-Lightning:sdxl_lightning_8step_lora.safetensors",
            "output_path": str(tmp_path / "a.png"),
        }
    )
    assert calls[-1]["num_inference_steps"] == 8
    assert calls[-1]["guidance_scale"] == 0.0


def test_explicit_steps_override_lightning_defaults(fake_loader, tmp_path):
    _, calls = fake_loader
    ld.LocalDiffusion().execute(
        {
            "prompt": "x",
            "model": "m",
            "lora": "ByteDance/SDXL-Lightning:sdxl_lightning_8step_lora.safetensors",
            "num_inference_steps": 12,
            "output_path": str(tmp_path / "a.png"),
        }
    )
    assert calls[-1]["num_inference_steps"] == 12


def test_vae_override_is_part_of_the_cache_key(fake_loader, tmp_path):
    loads, _ = fake_loader
    tool = ld.LocalDiffusion()
    tool.execute({"prompt": "x", "model": "m", "output_path": str(tmp_path / "a.png")})
    tool.execute({"prompt": "x", "model": "m", "vae": "v", "output_path": str(tmp_path / "b.png")})
    assert len(loads) == 2
