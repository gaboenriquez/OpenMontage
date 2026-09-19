"""Local Stable Diffusion image generation via diffusers."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from tools.base_tool import (
    BaseTool,
    Determinism,
    ExecutionMode,
    ResourceProfile,
    RetryPolicy,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolStatus,
    ToolTier,
)


def pick_device(torch_mod: Any) -> str:
    """CUDA, then Apple Silicon (MPS), then CPU."""
    if torch_mod.cuda.is_available():
        return "cuda"
    mps = getattr(getattr(torch_mod, "backends", None), "mps", None)
    if mps is not None and mps.is_available():
        return "mps"
    return "cpu"


def _load_pipeline(
    model_id: str, lora: str | None, device: str, dtype: Any, vae: str | None = None
) -> Any:
    """Load any text-to-image checkpoint (SD 1.x/2.x or SDXL), optionally with a LoRA."""
    from diffusers import AutoencoderKL, AutoPipelineForText2Image, EulerDiscreteScheduler

    kwargs: dict[str, Any] = {"torch_dtype": dtype}
    if vae:
        # e.g. madebyollin/sdxl-vae-fp16-fix: SDXL's stock VAE upcasts to fp32 to
        # decode, which asked for 19 GB at 1344x768 on a 16 GB Mac (measured
        # 2026-09-19: 88-133 s/image swapping vs 20-28 s with the fp16 VAE).
        kwargs["vae"] = AutoencoderKL.from_pretrained(vae, torch_dtype=dtype)
    if dtype is not None and "xl" in model_id.lower():
        kwargs["variant"] = "fp16"  # the fp16 weights are the ones downloaded
    pipe = AutoPipelineForText2Image.from_pretrained(model_id, **kwargs)
    if lora:
        repo, _, weight = lora.partition(":")
        if weight:
            pipe.load_lora_weights(repo, weight_name=weight)
        else:
            pipe.load_lora_weights(repo)
        pipe.fuse_lora()
        pipe.unload_lora_weights()  # weights are fused; drop the adapter copy
        if "lightning" in lora.lower():
            # SDXL-Lightning was distilled with trailing timesteps.
            pipe.scheduler = EulerDiscreteScheduler.from_config(
                pipe.scheduler.config, timestep_spacing="trailing"
            )
    pipe = pipe.to(device)
    if device != "cuda":
        pipe.vae.enable_tiling()  # decode in tiles: bounded memory on MPS/CPU
    return pipe


class LocalDiffusion(BaseTool):
    name = "local_diffusion"
    version = "0.1.0"
    tier = ToolTier.GENERATE
    capability = "image_generation"
    provider = "local_diffusion"
    stability = ToolStability.EXPERIMENTAL
    execution_mode = ExecutionMode.SYNC
    determinism = Determinism.SEEDED
    runtime = ToolRuntime.LOCAL_GPU

    dependencies = []  # checked dynamically
    install_instructions = (
        "Install diffusers for local Stable Diffusion:\n"
        "  pip install diffusers transformers accelerate torch"
    )
    agent_skills = []

    _PIPELINES: dict[tuple, Any] = {}

    capabilities = ["generate_image", "generate_illustration", "text_to_image"]
    supports = {
        "negative_prompt": True,
        "seed": True,
        "offline": True,
        "custom_size": True,
    }
    best_for = [
        "offline/air-gapped generation",
        "free image generation (no API cost)",
        "privacy-sensitive workflows",
    ]
    not_good_for = [
        "CPU-only machines (very slow)",
        "highest quality output (API models are better)",
    ]

    input_schema = {
        "type": "object",
        "required": ["prompt"],
        "properties": {
            "prompt": {"type": "string"},
            "negative_prompt": {"type": "string", "default": ""},
            "width": {"type": "integer", "default": 512},
            "height": {"type": "integer", "default": 512},
            "model": {
                "type": "string",
                "default": "stabilityai/stable-diffusion-2-1-base",
            },
            "lora": {
                "type": "string",
                "description": (
                    "Optional LoRA as 'hf_repo:filename.safetensors' or a local path. "
                    "An SDXL-Lightning LoRA switches the defaults to 8 steps, no CFG."
                ),
            },
            "vae": {
                "type": "string",
                "description": (
                    "Optional VAE repo. For SDXL on Apple Silicon use "
                    "'madebyollin/sdxl-vae-fp16-fix' (~5x faster, no fp32 upcast)."
                ),
            },
            "seed": {"type": "integer"},
            "num_inference_steps": {"type": "integer", "default": 30},
            "guidance_scale": {"type": "number", "default": 7.5},
            "output_path": {"type": "string"},
        },
    }

    resource_profile = ResourceProfile(
        cpu_cores=2, ram_mb=8000, vram_mb=4000, disk_mb=5000, network_required=False
    )
    retry_policy = RetryPolicy(max_retries=1)
    idempotency_key_fields = ["prompt", "width", "height", "seed", "model"]
    side_effects = ["writes image file to output_path", "may download model weights on first run"]
    user_visible_verification = ["Inspect generated image for relevance and quality"]

    def get_status(self) -> ToolStatus:
        try:
            import diffusers  # noqa: F401
            return ToolStatus.AVAILABLE
        except ImportError:
            return ToolStatus.UNAVAILABLE

    def estimate_cost(self, inputs: dict[str, Any]) -> float:
        return 0.0

    def estimate_runtime(self, inputs: dict[str, Any]) -> float:
        return 30.0  # ~30s on a mid-range GPU

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        if self.get_status() != ToolStatus.AVAILABLE:
            return ToolResult(
                success=False,
                error="diffusers not installed. " + self.install_instructions,
            )

        import torch

        start = time.time()
        prompt = inputs["prompt"]
        negative = inputs.get("negative_prompt", "")
        width = inputs.get("width", 512)
        height = inputs.get("height", 512)
        seed = inputs.get("seed")
        model_id = inputs.get("model", "stabilityai/stable-diffusion-2-1-base")
        lora = inputs.get("lora") or None
        vae = inputs.get("vae") or None
        lightning = bool(lora and "lightning" in lora.lower())
        steps = inputs.get("num_inference_steps", 8 if lightning else 30)
        guidance = inputs.get("guidance_scale", 0.0 if lightning else 7.5)

        try:
            device = pick_device(torch)
            dtype = torch.float16 if device in ("cuda", "mps") else torch.float32

            # Loading SDXL costs ~20 s and ~7 GB; a 10-minute video needs ~150
            # images, so the pipeline is kept for the life of the process.
            key = (model_id, lora, vae, device)
            pipe = self._PIPELINES.get(key)
            if pipe is None:
                self._PIPELINES.clear()  # one model resident at a time (16 GB Macs)
                pipe = _load_pipeline(model_id, lora, device, dtype, vae)
                self._PIPELINES[key] = pipe

            generator = None
            if seed is not None:
                generator = torch.Generator("cpu").manual_seed(seed)

            image = pipe(
                prompt,
                negative_prompt=negative,
                width=width,
                height=height,
                num_inference_steps=steps,
                guidance_scale=guidance,
                generator=generator,
            ).images[0]

            output_path = Path(inputs.get("output_path", "generated_image.png"))
            output_path.parent.mkdir(parents=True, exist_ok=True)
            image.save(str(output_path))

        except Exception as e:
            return ToolResult(success=False, error=f"Local diffusion generation failed: {e}")

        return ToolResult(
            success=True,
            data={
                "provider": "local_diffusion",
                "model": model_id,
                "prompt": prompt,
                "output": str(output_path),
            },
            artifacts=[str(output_path)],
            cost_usd=0.0,
            duration_seconds=round(time.time() - start, 2),
            seed=seed,
            model=model_id,
        )
