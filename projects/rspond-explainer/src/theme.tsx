import React from "react";
import { Easing, interpolate, spring } from "remotion";

export const FPS = 30;
export const W = 1920;
export const H = 1080;

export const C = {
  bg: "#0b1310",
  bg2: "#111d18",
  line: "#22332b",
  ink: "#0f1a14",
  paper: "#f4f6f2",
  text: "#eef3ef",
  mute: "#8a9a91",
  green: "#1f9d55",
  greenSoft: "#2fbf6d",
  amber: "#f2b45a",
  red: "#e0674f",
};

export const DISPLAY = '"Geist", sans-serif';
export const MONO = '"Geist Mono", monospace';

// Scene boundaries (frames)
export const S = {
  field: [0, 180],
  evidence: [180, 390],
  standard: [390, 630],
  nc: [630, 900],
  board: [900, 1140],
  report: [1140, 1380],
  end: [1380, 1620],
} as const;

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** eased 0→1 between two frames */
export const ease = (f: number, a: number, b: number, e = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });

/** spring 0→1 starting at frame `a` */
export const sp = (f: number, a: number, damping = 16, stiffness = 120, mass = 1) =>
  spring({ frame: f - a, fps: FPS, config: { damping, stiffness, mass } });

/** visibility window with soft in/out */
export const win = (f: number, a: number, b: number, fin = 12, fout = 12) =>
  Math.min(ease(f, a, a + fin), 1 - ease(f, b - fout, b));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** chars of `text` typed between frames a..b */
export const typed = (text: string, f: number, a: number, b: number) =>
  text.slice(0, Math.round(text.length * clamp01((f - a) / Math.max(1, b - a))));

export const hash = (i: number) => {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/** Headline: ≤ 8 words, blurs in, holds, blurs out. */
export const Caption: React.FC<{ f: number; a: number; b: number; children: React.ReactNode; y?: number; size?: number }> = ({
  f,
  a,
  b,
  children,
  y = 70,
  size = 58,
}) => {
  const o = win(f, a, b, 14, 12);
  if (o <= 0) return null;
  const rise = (1 - ease(f, a, a + 18)) * 26;
  return (
    <div
      style={{
        position: "absolute",
        left: 160,
        right: 160,
        top: y,
        textAlign: "center",
        fontFamily: DISPLAY,
        fontWeight: 620,
        fontSize: size,
        lineHeight: 1.12,
        letterSpacing: "-0.03em",
        color: C.text,
        opacity: o,
        filter: o < 1 ? `blur(${(1 - o) * 10}px)` : undefined,
        transform: `translateY(${rise}px)`,
      }}
    >
      {children}
    </div>
  );
};

// ---------- the motif: "el hallazgo" ----------
// [frame, x, y, size]
export const DOT_KEYS: [number, number, number, number][] = [
  [0, 1100, 800, 0],
  [55, 1100, 800, 0],
  [80, 1100, 800, 22],
  [190, 1100, 800, 22],
  [262, 834, 534, 20],
  [400, 834, 534, 20],
  [446, 1530, 400, 22],
  [484, 1530, 590, 22],
  [524, 1450, 790, 20],
  [650, 1450, 790, 20],
  [700, 346, 266, 20],
  [905, 346, 266, 20],
  [950, 346, 320, 16],
  [1150, 1266, 320, 16],
  [1215, 812, 915, 18],
  [1262, 812, 915, 18],
  [1300, 1040, 470, 20],
  [1385, 1040, 470, 20],
  [1420, 960, 620, 44],
  [1450, 960, 620, 44],
  [1490, 682, 620, 26],
  [1620, 682, 620, 26],
];

export const dotAt = (f: number) => {
  const k = DOT_KEYS;
  if (f <= k[0][0]) return { x: k[0][1], y: k[0][2], r: k[0][3] };
  for (let i = 1; i < k.length; i++) {
    if (f <= k[i][0]) {
      const p = ease(f, k[i - 1][0], k[i][0]);
      return { x: lerp(k[i - 1][1], k[i][1], p), y: lerp(k[i - 1][2], k[i][2], p), r: lerp(k[i - 1][3], k[i][3], p) };
    }
  }
  const l = k[k.length - 1];
  return { x: l[1], y: l[2], r: l[3] };
};

export const Dot: React.FC<{ f: number; at?: { x: number; y: number } }> = ({ f, at }) => {
  const d = dotAt(f);
  const { r } = d;
  const x = at ? at.x : d.x, y = at ? at.y : d.y;
  if (r <= 0.5) return null;
  const pulse = 1 + 0.12 * Math.sin((f / FPS) * Math.PI * 2 * 0.8);
  const color = f < 330 ? mix(C.amber, C.greenSoft, ease(f, 120, 330)) : C.greenSoft;
  return (
    <div
      style={{
        position: "absolute",
        left: x - r / 2,
        top: y - r / 2,
        width: r,
        height: r,
        borderRadius: r,
        background: color,
        transform: `scale(${pulse})`,
        boxShadow: `0 0 ${r * 1.2}px ${r * 0.35}px ${color}88, 0 0 ${r * 3}px ${r}px ${color}33`,
      }}
    />
  );
};

export function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(lerp(v, pb[i], t)).toString(16).padStart(2, "0"));
  return `#${c.join("")}`;
}
