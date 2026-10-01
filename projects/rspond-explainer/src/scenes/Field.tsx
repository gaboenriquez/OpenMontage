import React from "react";
import { C, Caption, ease, hash } from "../theme";

// Stylised oil palm: slightly curved trunk + arching fronds.
const Palm: React.FC<{ x: number; base: number; h: number; color: string; sway: number; seed: number }> = ({ x, base, h, color, sway, seed }) => {
  const tilt = (hash(seed) - 0.5) * h * 0.12;
  const topX = x + tilt + sway * h * 0.01;
  const topY = base - h;
  const fronds = [];
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI + (i / 8) * Math.PI + (hash(seed + i) - 0.5) * 0.25;
    const len = h * (0.42 + hash(seed * 3 + i) * 0.14);
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len * 0.55 + len * 0.42;
    const cx = topX + Math.cos(a) * len * 0.55 + sway * 2;
    const cy = topY + Math.sin(a) * len * 0.75 - len * 0.12;
    fronds.push(<path key={i} d={`M${topX} ${topY} Q${cx} ${cy} ${ex} ${ey}`} stroke={color} strokeWidth={h * 0.028} fill="none" strokeLinecap="round" />);
  }
  return (
    <g>
      <path d={`M${x} ${base} Q${x + tilt * 0.2} ${base - h * 0.5} ${topX} ${topY}`} stroke={color} strokeWidth={h * 0.06} fill="none" strokeLinecap="round" />
      {fronds}
      <circle cx={topX} cy={topY + h * 0.02} r={h * 0.05} fill={color} />
    </g>
  );
};

const LAYERS = [
  { base: 820, h: 210, color: "#15271f", n: 14, speed: 0.12 },
  { base: 940, h: 330, color: "#0f1d17", n: 9, speed: 0.25 },
  { base: 1120, h: 560, color: "#08100d", n: 6, speed: 0.45 },
];

export const Field: React.FC<{ f: number }> = ({ f }) => {
  if (f > 270) return null;
  const sunY = 790 - ease(f, 0, 180) * 90;
  const push = ease(f, 150, 265);
  const scale = 1 + push * 2.2;
  const fade = 1 - ease(f, 182, 226);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${scale})`, transformOrigin: "1100px 800px" }}>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <radialGradient id="sun" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={C.amber} stopOpacity={0.55} />
              <stop offset="100%" stopColor={C.amber} stopOpacity={0} />
            </radialGradient>
          </defs>
          <circle cx={960} cy={sunY} r={560} fill="url(#sun)" />
          <circle cx={960} cy={sunY} r={110} fill={C.amber} opacity={0.9} />
          <rect x={0} y={790} width={1920} height={400} fill="#0d1813" />
          {LAYERS.map((L, li) => (
            <g key={li} transform={`translate(${-f * L.speed} 0)`}>
              <rect x={-200} y={L.base - 4} width={2400} height={500} fill={L.color} />
              {Array.from({ length: L.n + 2 }).map((_, i) => {
                const x = -60 + (i * 2080) / L.n + (hash(li * 50 + i) - 0.5) * 60;
                const sway = Math.sin(f / 30 + i + li);
                return <Palm key={i} x={x} base={L.base} h={L.h * (0.85 + hash(li * 9 + i) * 0.3)} color={L.color} sway={sway} seed={li * 100 + i} />;
              })}
            </g>
          ))}
        </svg>
      </div>
      <Caption f={f} a={10} b={95}>Una auditoría RSPO.</Caption>
      <Caption f={f} a={95} b={182}>Cientos de evidencias.</Caption>
    </div>
  );
};
