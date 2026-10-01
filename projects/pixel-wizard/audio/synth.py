"""Chiptune sound for the pixel wizard: pad + charge riser + cast zap, 6 s loop x2."""
import numpy as np, wave
SR, CYCLE, TOTAL = 44100, 6.0, 12.0
t = np.arange(int(SR * CYCLE)) / SR
rng = np.random.default_rng(7)

def square(f, duty=0.5):
    ph = np.cumsum(np.broadcast_to(f, t.shape) / SR) % 1.0
    return np.where(ph < duty, 1.0, -1.0)

def env(start, end, a=0.01, r=0.1):
    e = np.clip((t - start) / a, 0, 1) * np.clip((end - t) / r, 0, 1)
    return e * ((t >= start) & (t < end))

out = np.zeros_like(t)
# soft night pad: A minor arpeggio, triangle-ish (filtered square), 8th notes at 120 BPM
notes = [220.0, 261.63, 329.63, 261.63, 196.0, 246.94, 293.66, 246.94]
step = 0.25
for i in range(int(CYCLE / step)):
    s = i * step
    f = notes[i % len(notes)]
    tone = np.sin(2 * np.pi * f * t) * 0.6 + square(f, 0.25) * 0.15
    out += tone * env(s, s + step * 0.9, 0.005, 0.12) * 0.10
# bass pulse on beats
for i in range(int(CYCLE / 0.5)):
    s = i * 0.5
    f = 55.0 if (i // 4) % 2 == 0 else 49.0
    out += square(f, 0.5) * env(s, s + 0.3, 0.005, 0.2) * 0.06
# charge riser 2.0-3.6: pitch sweep with tremolo
m = (t >= 2.0) & (t < 3.65)
f = 200 + 900 * np.clip((t - 2.0) / 1.6, 0, 1) ** 2
trem = 0.6 + 0.4 * square(np.full_like(t, 15.0))
out += square(f, 0.125) * trem * env(2.0, 3.65, 0.2, 0.05) * 0.12
# twinkle sparkles during charge
for k in range(10):
    s = 2.1 + k * 0.15
    out += np.sin(2 * np.pi * (1800 + 120 * k) * t) * env(s, s + 0.06, 0.002, 0.05) * 0.06
# cast zap at 3.7: noise burst + descending square
noise = rng.uniform(-1, 1, t.shape)
out += noise * env(3.7, 3.95, 0.002, 0.22) * 0.30
fz = 1400 * np.exp(-(t - 3.7).clip(0) * 6)
out += square(fz, 0.5) * env(3.7, 4.3, 0.002, 0.4) * 0.16
# low thump
out += np.sin(2 * np.pi * 70 * (t - 3.7).clip(0) * np.exp(-(t - 3.7).clip(0) * 8)) * env(3.7, 4.0, 0.002, 0.25) * 0.35

out = np.tile(out, int(TOTAL / CYCLE))
out = out / max(1e-9, np.abs(out).max()) * 0.85
pcm = (out * 32767).astype(np.int16)
with wave.open("audio/wizard.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("ok", len(pcm) / SR, "s")
