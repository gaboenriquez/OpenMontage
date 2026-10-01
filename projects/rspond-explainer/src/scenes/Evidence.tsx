import React from "react";
import { C, Caption, DISPLAY, MONO, ease, hash, sp } from "../theme";

type Kind = "photo" | "record" | "interview";
const KINDS: Kind[] = ["photo", "record", "interview"];

const CARDS = (() => {
  const out: { x: number; y: number; rot: number; kind: Kind; delay: number }[] = [];
  let i = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 7; col++) {
      const x = 170 + col * 263 + (hash(i + 7) - 0.5) * 60;
      const y = 270 + row * 205 + (hash(i + 31) - 0.5) * 40;
      i++;
      if (Math.abs(x - 960) < 300 && Math.abs(y - 600) < 190) continue; // keep the centre free
      out.push({ x, y, rot: (hash(i + 3) - 0.5) * 14, kind: KINDS[i % 3], delay: hash(i + 90) * 50 });
    }
  }
  return out;
})();

const CardBody: React.FC<{ kind: Kind; seed: number }> = ({ kind, seed }) => {
  if (kind === "photo")
    return (
      <svg width={196} height={110}>
        <rect width={196} height={110} rx={8} fill="#1d2e26" />
        <circle cx={150} cy={30} r={13} fill="#3b5247" />
        <path d={`M0 110 L${50 + hash(seed) * 30} 55 L110 110 Z`} fill="#2c4238" />
        <path d={`M70 110 L${130 + hash(seed + 1) * 20} 45 L196 110 Z`} fill="#33493f" />
      </svg>
    );
  if (kind === "record")
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "6px 4px" }}>
        {[0.9, 0.7, 0.82, 0.5].map((w, j) => (
          <div key={j} style={{ height: 10, width: `${w * (0.8 + hash(seed + j) * 0.2) * 100}%`, borderRadius: 5, background: "#2c4238" }} />
        ))}
      </div>
    );
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "4px" }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 64, lineHeight: "50px", color: "#3b5247", fontWeight: 700 }}>“</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, paddingTop: 10 }}>
        {[1, 0.8, 0.6].map((w, j) => (
          <div key={j} style={{ height: 10, width: `${w * 100}%`, borderRadius: 5, background: "#2c4238" }} />
        ))}
      </div>
    </div>
  );
};

export const Evidence: React.FC<{ f: number }> = ({ f }) => {
  if (f < 170 || f > 440) return null;
  const zoom = 1 + ease(f, 180, 390) * 0.07;
  const dim = ease(f, 255, 300); // others dim once the finding lights up
  const out = ease(f, 385, 425);
  const hero = sp(f, 228, 15, 110);
  const lit = ease(f, 258, 272);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: "960px 600px" }}>
        {CARDS.map((c, i) => {
          const p = sp(f, 176 + c.delay, 14, 90);
          const fromX = 960 + (hash(i + 400) - 0.5) * 3200;
          const fromY = -300 - hash(i + 500) * 500;
          const x = fromX + (c.x - fromX) * p;
          const y = fromY + (c.y - fromY) * p + out * (300 + hash(i) * 300);
          const o = Math.min(1, p * 1.5) * (1 - 0.65 * dim) * (1 - out);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x - 115,
                top: y - 75,
                width: 230,
                height: 150,
                padding: 17,
                borderRadius: 18,
                background: C.bg2,
                border: `2px solid ${C.line}`,
                opacity: o,
                transform: `rotate(${c.rot * (1.6 - p * 0.6)}deg)`,
              }}
            >
              <CardBody kind={c.kind} seed={i} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", inset: 0 }}>
        {/* the finding (outside the zoom so it stays under the motif dot) */}
        <div
          style={{
            position: "absolute",
            left: 800,
            top: 500,
            width: 320,
            height: 200,
            padding: "26px 28px 24px 64px",
            borderRadius: 22,
            background: "#122119",
            border: `2px solid ${lit > 0 ? `rgba(47,191,109,${0.25 + 0.75 * lit})` : C.line}`,
            boxShadow: `0 0 ${60 * lit}px rgba(47,191,109,${0.35 * lit})`,
            opacity: hero * (1 - ease(f, 400, 430)),
            transform: `scale(${0.85 + 0.15 * hero})`,
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.14em", color: C.greenSoft, opacity: lit }}>HALLAZGO</div>
          <div style={{ marginTop: 12, fontFamily: DISPLAY, fontSize: 26, lineHeight: 1.25, fontWeight: 560, color: C.text }}>
            Aplicaciones de plaguicidas sin registrar en bitácora
          </div>
        </div>
      </div>
      <Caption f={f} a={200} b={296}>Un hallazgo entre cientos.</Caption>
      <Caption f={f} a={300} b={392}>¿Qué indicador aplica?</Caption>
    </div>
  );
};
