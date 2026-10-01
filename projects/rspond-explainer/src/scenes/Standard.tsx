import React from "react";
import { C, Caption, DISPLAY, MONO, ease, sp, typed } from "../theme";

// RSPO P&C 2024: 7 principles -> criterion 7.1 (IPM) -> critical indicators 7.1.2–7.1.4.
const ROOT = { x: 960, y: 220 };
const PRIN_Y = 400;
const PRIN = [
  { n: "P1", label: "Ética y transparencia" },
  { n: "P2", label: "Legalidad" },
  { n: "P3", label: "Productividad" },
  { n: "P4", label: "Comunidades" },
  { n: "P5", label: "Pequeños productores" },
  { n: "P6", label: "Trabajadores" },
  { n: "P7", label: "Ecosistemas" },
].map((p, i) => ({ ...p, x: 390 + i * 190 }));
const CRIT = { x: 1530, y: 590, label: "7.1 · Manejo integrado de plagas" };
const IND_Y = 790;
const IND = [
  { n: "7.1.2 (C)", x: 1270 },
  { n: "7.1.3 (C)", x: 1530 },
  { n: "7.1.4 (C)", x: 1790 },
];

const Edge: React.FC<{ x1: number; y1: number; x2: number; y2: number; p: number; lit: number }> = ({ x1, y1, x2, y2, p, lit }) => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const my = (y1 + y2) / 2;
  return (
    <path
      d={`M${x1} ${y1} C${x1} ${my} ${x2} ${my} ${x2} ${y2}`}
      fill="none"
      stroke={lit > 0.5 ? C.greenSoft : "#2b4136"}
      strokeWidth={lit > 0.5 ? 4 : 3}
      strokeDasharray={len * 1.3}
      strokeDashoffset={len * 1.3 * (1 - p)}
    />
  );
};

export const Standard: React.FC<{ f: number }> = ({ f }) => {
  if (f < 380 || f > 680) return null;
  const inA = ease(f, 392, 420);
  const out = ease(f, 628, 660);
  const litP = ease(f, 440, 450), litC = ease(f, 478, 488), litI = ease(f, 518, 528);
  const dim = 1 - 0.55 * litP;
  const nodeIn = (d: number) => sp(f, 400 + d, 14, 140);
  const node = (x: number, y: number, w: number, h: number, on: number, appear: number, label: string, size = 28, keep = false) => (
    <div
      key={label}
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        borderRadius: h / 2,
        background: on > 0.5 ? C.green : C.bg2,
        border: `2px solid ${on > 0.5 ? C.greenSoft : "#2b4136"}`,
        color: on > 0.5 ? C.ink : C.text,
        fontFamily: DISPLAY,
        fontWeight: 620,
        fontSize: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: keep ? 30 : 0,
        whiteSpace: "nowrap",
        opacity: appear * (on > 0.5 ? 1 : dim) * (keep ? 1 - ease(f, 640, 660) : 1 - out),
        transform: `scale(${0.7 + 0.3 * appear})`,
      }}
    >
      {label}
    </div>
  );
  const answer = "→ Indicador 7.1.3 (C): registrar todo uso de plaguicidas";
  const bubbleUser = sp(f, 432, 15, 120);
  const bubbleAI = sp(f, 520, 15, 120);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: inA }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        {PRIN.map((p, i) => (
          <Edge key={p.n} x1={ROOT.x} y1={ROOT.y + 34} x2={p.x} y2={PRIN_Y - 32} p={ease(f, 400 + i * 4, 440 + i * 4)} lit={p.n === "P7" ? litP : 0} />
        ))}
        <Edge x1={1530} y1={PRIN_Y + 96} x2={CRIT.x} y2={CRIT.y - 32} p={ease(f, 450, 478)} lit={litC} />
        {IND.map((c, i) => (
          <Edge key={c.n} x1={CRIT.x} y1={CRIT.y + 32} x2={c.x} y2={IND_Y - 32} p={ease(f, 470 + i * 5, 500 + i * 5)} lit={c.n === "7.1.3 (C)" ? litI : 0} />
        ))}
      </svg>
      {node(ROOT.x, ROOT.y, 320, 68, 0, nodeIn(0), "RSPO P&C 2024", 30)}
      {PRIN.map((p, i) => (
        <React.Fragment key={p.n}>
          {node(p.x, PRIN_Y, 92, 64, p.n === "P7" ? litP : 0, nodeIn(14 + i * 3), p.n, 28)}
          <div
            style={{
              position: "absolute",
              left: p.x - 90,
              width: 180,
              top: PRIN_Y + 44,
              textAlign: "center",
              fontFamily: MONO,
              fontSize: 19,
              lineHeight: 1.3,
              color: p.n === "P7" && litP > 0.5 ? C.greenSoft : C.mute,
              opacity: nodeIn(20 + i * 3) * (p.n === "P7" ? 1 : dim) * (1 - out),
            }}
          >
            {p.label}
          </div>
        </React.Fragment>
      ))}
      {node(CRIT.x, CRIT.y, 470, 64, litC, nodeIn(56), CRIT.label, 26)}
      {IND.map((c, i) => (c.n === "7.1.3 (C)" ? null : node(c.x, IND_Y, 200, 64, 0, nodeIn(72 + i * 4), c.n, 26)))}
      {node(1530, IND_Y, 200, 68, litI, nodeIn(76), "7.1.3 (C)", 26, true)}
      <div
        style={{
          position: "absolute",
          left: 1380,
          width: 300,
          top: IND_Y + 48,
          textAlign: "center",
          fontFamily: MONO,
          fontSize: 20,
          color: C.greenSoft,
          opacity: ease(f, 528, 545) * (1 - out),
        }}
      >
        registro de plaguicidas
      </div>
      {/* chat */}
      <div style={{ position: "absolute", left: 120, width: 900, top: 640, opacity: 1 - out }}>
        <div
          style={{
            marginLeft: "auto",
            width: "fit-content",
            padding: "18px 26px",
            borderRadius: "28px 28px 8px 28px",
            background: "#1a2b23",
            color: C.text,
            fontFamily: DISPLAY,
            fontSize: 28,
            fontWeight: 500,
            opacity: bubbleUser,
            transform: `translateY(${(1 - bubbleUser) * 20}px)`,
          }}
        >
          Aplicaciones sin registrar en bitácora. ¿Qué indicador?
        </div>
        <div
          style={{
            marginTop: 22,
            width: "fit-content",
            padding: "18px 26px",
            borderRadius: "28px 28px 28px 8px",
            background: "#0f1a14",
            border: `2px solid ${C.green}`,
            color: C.greenSoft,
            fontFamily: MONO,
            fontSize: 25,
            minHeight: 72,
            opacity: bubbleAI,
            transform: `translateY(${(1 - bubbleAI) * 20}px)`,
          }}
        >
          {typed(answer, f, 524, 580)}
          <span style={{ opacity: f < 600 && Math.floor(f / 8) % 2 === 0 ? 1 : 0 }}>▍</span>
        </div>
      </div>
      <Caption f={f} a={396} b={508}>RSPOND conoce la P&amp;C 2024.</Caption>
      <Caption f={f} a={512} b={628}>Y encuentra el indicador.</Caption>
    </div>
  );
};
