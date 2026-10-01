"""120 BPM minimal beat + UI sound effects placed on the action beats (14 s, 7 bars)."""
import numpy as np, wave
SR, DUR, BPM = 48000, 14.0, 120
BEAT = 60 / BPM
n = int(SR * DUR)
t = np.arange(n) / SR
out = np.zeros(n)
rng = np.random.default_rng(3)

def add(sig, at, gain=1.0):
    i = int(at * SR)
    if i >= n: return
    seg = sig[: n - i]
    out[i : i + len(seg)] += seg * gain

def tt(d): return np.arange(int(SR * d)) / SR

def kick():
    x = tt(0.35); f = 45 + 110 * np.exp(-x * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 9)
def hat():
    x = tt(0.06); s = rng.uniform(-1, 1, len(x)); s = np.diff(s, prepend=0)
    return s * np.exp(-x * 70)
def bass(f, d):
    x = tt(d); return np.tanh(2.2 * np.sin(2 * np.pi * f * x)) * np.minimum(1, x * 200) * np.exp(-x * 3)
def chord(fs, d):
    x = tt(d); s = sum(np.sin(2 * np.pi * f * x) + 0.3 * np.sin(4 * np.pi * f * x) for f in fs) / len(fs)
    return s * np.minimum(1, x * 30) * np.exp(-x * 2.5)
def click(f=2400, d=0.03):
    x = tt(d); return np.sin(2 * np.pi * f * x) * np.exp(-x * 160) + rng.uniform(-1, 1, len(x)) * np.exp(-x * 400) * 0.4
def whoosh(d=0.28, up=True):
    x = tt(d); s = rng.uniform(-1, 1, len(x))
    k = np.exp(-((x - d * 0.55) ** 2) / (2 * (d * 0.22) ** 2))
    s = np.convolve(s, np.ones(18) / 18, mode="same")
    return s * k
def tone(f, d, decay=10):
    x = tt(d); return np.sin(2 * np.pi * f * x) * np.exp(-x * decay) * np.minimum(1, x * 400)
def tick():
    return click(3800, 0.015)

# music bed: kick on beats, hats on off-beats, bass + chord per bar
roots = [55.0, 55.0, 43.65, 49.0, 55.0, 43.65, 49.0]
chords = [[220, 261.6, 329.6], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7],
          [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]]
for beat in range(28):
    s = beat * BEAT
    add(kick(), s, 0.55)
    add(hat(), s + BEAT / 2, 0.18)
    add(bass(roots[beat // 4], BEAT * 0.9), s, 0.16 if beat % 2 == 0 else 0.10)
for bar in range(7):
    add(chord(chords[bar], 1.8), bar * 4 * BEAT, 0.10)

# UI SFX on the action beats (must match the composition's beat sheet)
b = lambda k: k * BEAT
for c in [b(1), b(7), b(9), b(12), b(15), b(16), b(18), b(19)]: add(click(), c, 0.5)
for c in [b(10), b(13)]: add(click(1700, 0.04), c, 0.4)              # release
for c in [b(2), b(5), b(6), b(11), b(14), b(17), b(20), b(22), b(25), b(27)]: add(whoosh(), c - 0.08, 0.22)
add(tone(1318.5, 0.5, 7) + 0.6 * np.pad(tone(1760, 0.45, 7), (int(0.07 * SR), 0))[: int(0.5 * SR)], b(4), 0.25)  # success
add(tone(2093, 0.15, 30), b(21), 0.18)                                 # hover blip
for c in [11.5, 11.62, 11.74, 11.86]: add(tick(), c, 0.45)             # typing
add(click(1200, 0.06), b(24), 0.5)                                     # enter
add(tone(1568, 0.6, 6), b(25) + 0.05, 0.22); add(tone(2093, 0.6, 6), b(25) + 0.17, 0.18)  # ding
# soft riser into the volume overshoot
x = tt(0.45); add(np.sin(2 * np.pi * np.cumsum(400 + 900 * x / 0.45) / SR) * np.minimum(1, x * 8) * 0.5, b(12), 0.12)

out = np.tanh(out * 1.2); out = out / np.abs(out).max() * 0.89
with wave.open("audio/ui.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())

# verify beat grid with a simple onset analysis (numpy)
hop = 512; frames = len(out) // hop
env = np.array([np.sum(out[i * hop:(i + 1) * hop] ** 2) for i in range(frames)])
flux = np.maximum(0, np.diff(env, prepend=0))
ac = np.correlate(flux - flux.mean(), flux - flux.mean(), "full")[frames - 1:]
lo, hi = int(0.3 * SR / hop), int(1.0 * SR / hop)
period = (lo + np.argmax(ac[lo:hi])) * hop / SR
print(f"estimated beat period {period:.3f}s -> {60/period:.1f} BPM; first onset {np.argmax(flux > flux.max()*0.3)*hop/SR:.3f}s")
