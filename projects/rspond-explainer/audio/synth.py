"""Cinematic score for the RSPOND explainer (54 s): pads per scene, soft pulse, plucks, swells and chimes on story beats."""
import numpy as np, wave
SR, DUR = 48000, 54.0
n = int(SR * DUR); t = np.arange(n) / SR
out = np.zeros(n); rng = np.random.default_rng(11)
FPS = 30
def tt(d): return np.arange(int(SR * d)) / SR
def add(sig, at, g=1.0):
    i = int(at * SR)
    if i >= n: return
    seg = sig[: n - i]; out[i:i + len(seg)] += seg * g
def pad(freqs, d):
    x = tt(d); s = np.zeros_like(x)
    for f in freqs:
        for det in (-0.6, 0.0, 0.6):
            s += np.sin(2 * np.pi * (f + det) * x + rng.uniform(0, 6.28))
    s /= 3 * len(freqs)
    env = np.minimum(1, x / 1.8) * np.minimum(1, (d - x) / 1.8)
    return s * env
def pluck(f, d=0.9):
    x = tt(d); return (np.sin(2 * np.pi * f * x) + 0.4 * np.sin(4 * np.pi * f * x)) * np.exp(-x * 5) * np.minimum(1, x * 300)
def sub(d=0.5):
    x = tt(d); f = 42 + 50 * np.exp(-x * 25); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 7)
def swell(d=1.6):
    x = tt(d); s = np.convolve(rng.uniform(-1, 1, len(x)), np.ones(40) / 40, mode="same")
    return s * (x / d) ** 2.2 * np.minimum(1, (d - x) * 20)
def chime(f, d=2.0):
    x = tt(d); return (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * f * 2.01 * x)) * np.exp(-x * 2.2) * np.minimum(1, x * 500)

# scenes (seconds) and their chords (A minor -> F -> C -> G ... resolve to A major-ish lift at the end)
scenes = [(0, 6, [110, 164.8, 220, 261.6]), (6, 13, [87.3, 130.8, 174.6, 220]), (13, 21, [130.8, 196, 261.6, 329.6]),
          (21, 30, [98, 146.8, 196, 246.9]), (30, 38, [110, 164.8, 220, 261.6]), (38, 46, [87.3, 130.8, 174.6, 261.6]),
          (46, 54, [130.8, 196, 261.6, 392])]
for a, b, ch in scenes:
    add(pad(ch, b - a + 1.6), max(0, a - 0.8), 0.22)
    if a > 0: add(swell(), a - 1.6, 0.10)
# pulse + plucks from the standard onward (90 BPM)
beat = 60 / 90
for k in range(int(DUR / beat)):
    s = k * beat
    if 13 <= s < 46: add(sub(), s, 0.28 if k % 2 == 0 else 0.16)
    if 6 <= s < 50:
        ch = next(c for a, b, c in scenes if a <= s < b) if s < 46 else scenes[-1][2]
        add(pluck(ch[(k % 3) + 1] * 2), s + beat / 2 * (k % 2), 0.07)
# story beats (frames -> s)
for fr, f0, g in [(70, 880, 0.10), (262, 1046.5, 0.12), (446, 784, 0.08), (484, 880, 0.08), (524, 1318.5, 0.12),
                  (738, 659.3, 0.10), (858, 1046.5, 0.12), (1100, 1318.5, 0.12), (1262, 987.8, 0.12), (1300, 1568, 0.10),
                  (1450, 880, 0.12), (1480, 1318.5, 0.12)]:
    add(chime(f0), fr / FPS, g)
# typing ticks for the AI answer and NC fields
for a, b in [(524, 572), (690, 716), (752, 792), (796, 814), (816, 854)]:
    for fr in range(a, b, 3):
        x = tt(0.02); add(rng.uniform(-1, 1, len(x)) * np.exp(-x * 300), fr / FPS, 0.05)

out *= np.minimum(1, t / 0.6) * np.clip((DUR - t) / 3.0, 0, 1)
out = np.tanh(out * 1.4); out = out / np.abs(out).max() * 0.88
st = np.stack([out, np.roll(out, 240)], axis=1)  # tiny stereo widening
with wave.open("public/music.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
print("ok", DUR)
