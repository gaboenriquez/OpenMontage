import React from "react";
import { C, Caption, DISPLAY, MONO, ease, lerp, sp } from "../theme";

const COLS = [
  { x: 300, title: "Abiertas", dot: C.amber },
  { x: 760, title: "En curso", dot: "#6aa8ff" },
  { x: 1220, title: "Cerradas", dot: C.greenSoft },
];
const CARD_W = 360, CARD_H = 120, TOP = 280, GAP = 140;

type Card = { id: string; crit: string; sev: "Mayor" | "Menor"; col: number[]; times: number[]; slot: number[] };
// col/slot sequences change at `times` (frames); the hero card is NC-0142.
const HERO: Card = { id: "NC-0142", crit: "7.1.3 (C) · Plaguicidas", sev: "Mayor", col: [0, 1, 2], times: [0, 1000, 1070], slot: [0, 0, 0] };
const OTHERS: Card[] = [
  { id: "NC-0139", crit: "P4 · Comunidades", sev: "Menor", col: [0], times: [0, 1000], slot: [1, 0] },
  { id: "NC-0140", crit: "P6 · Trabajadores", sev: "Menor", col: [0], times: [0, 1000], slot: [2, 1] },
  { id: "NC-0131", crit: "P3 · Trazabilidad", sev: "Menor", col: [1], times: [0, 1000, 1070], slot: [0, 1, 0] },
  { id: "NC-0135", crit: "P6 · Salud y seguridad", sev: "Menor", col: [1], times: [0, 1000, 1070], slot: [1, 2, 1] },
  { id: "NC-0127", crit: "P2 · Legalidad", sev: "Menor", col: [2], times: [0, 1070], slot: [0, 1] },
  { id: "NC-0124", crit: "P7 · Agua", sev: "Menor", col: [2], times: [0, 1070], slot: [1, 2] },
  { id: "NC-0121", crit: "P5 · Pequeños productores", sev: "Menor", col: [2], times: [0, 1070], slot: [2, 3] },
];

const at = (seq: number[], times: number[], f: number, spring: (a: number) => number) => {
  let v = seq[0];
  for (let i = 1; i < seq.length; i++) v += (seq[i] - seq[i - 1]) * spring(times[i]);
  return v;
};

export const BOARD_CARD_POS = (f: number, card: Card = HERO) => {
  const s = (a: number) => sp(f, a, 18, 120);
  const col = card.col.length === 1 ? card.col[0] : at(card.col, card.times, f, s);
  const slot = at(card.slot, card.times, f, s);
  return { left: lerp(COLS[0].x, COLS[2].x, col / 2) + 20, top: TOP + slot * GAP };
};

const NCCard: React.FC<{ card: Card; f: number; hero?: boolean; o: number }> = ({ card, f, hero, o }) => {
  const p = BOARD_CARD_POS(f, card);
  const colNow = card.col.length === 1 ? card.col[0] : f >= 1085 ? 2 : f >= 1015 ? 1 : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: p.left,
        top: p.top,
        width: CARD_W,
        height: CARD_H,
        borderRadius: 22,
        background: hero ? "#16271f" : C.bg2,
        border: `2px solid ${hero ? C.green : C.line}`,
        boxShadow: hero ? "0 18px 40px rgba(0,0,0,0.45)" : undefined,
        opacity: o,
        padding: "22px 22px 0 50px",
      }}
    >
      {!hero ? <div style={{ position: "absolute", left: 18, top: 32, width: 14, height: 14, borderRadius: 7, background: COLS[colNow].dot }} /> : null}
      <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 650, color: C.text, letterSpacing: "-0.02em" }}>{card.id}</div>
      <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 19, color: C.mute, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.crit}</div>
      <div
        style={{
          position: "absolute",
          right: 16,
          top: 20,
          padding: "4px 10px",
          borderRadius: 10,
          fontFamily: MONO,
          fontSize: 16,
          color: card.sev === "Mayor" ? "#ffd2c8" : C.mute,
          background: card.sev === "Mayor" ? "rgba(224,103,79,0.25)" : "rgba(138,154,145,0.15)",
        }}
      >
        {card.sev}
      </div>
    </div>
  );
};

export const Board: React.FC<{ f: number }> = ({ f }) => {
  if (f < 896 || f > 1200) return null;
  const inO = ease(f, 900, 935);
  const out = ease(f, 1140, 1175);
  const closed = f >= 1100 ? 24 : 23;
  const bump = sp(f, 1100, 10, 200);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {COLS.map((c, i) => (
        <div key={c.title} style={{ position: "absolute", left: c.x, top: 190, width: 400, height: 820, borderRadius: 30, background: "rgba(17,29,24,0.6)", border: `2px solid ${C.line}`, opacity: inO * (1 - out) }}>
          <div style={{ position: "absolute", left: 26, top: 34, width: 14, height: 14, borderRadius: 7, background: c.dot }} />
          <div style={{ position: "absolute", left: 52, top: 22, fontFamily: DISPLAY, fontSize: 30, fontWeight: 600, color: C.text }}>{c.title}</div>
          <div
            style={{
              position: "absolute",
              right: 24,
              top: 24,
              fontFamily: MONO,
              fontSize: 26,
              color: i === 2 ? C.greenSoft : C.mute,
              transform: i === 2 ? `scale(${1 + 0.35 * Math.sin(Math.PI * Math.min(1, bump))})` : undefined,
            }}
          >
            {i === 0 ? (f >= 1000 ? 2 : 3) : i === 1 ? (f >= 1000 && f < 1070 ? 3 : 2) : closed}
          </div>
        </div>
      ))}
      {OTHERS.map((c, i) => (
        <NCCard key={c.id} card={c} f={f} o={ease(f, 910 + i * 4, 930 + i * 4) * (1 - out)} />
      ))}
      <NCCard card={HERO} f={f} hero o={ease(f, 944, 950) * (1 - ease(f, 1140, 1160))} />
      <Caption f={f} a={912} b={1138}>Cada NC, seguida hasta su cierre.</Caption>
    </div>
  );
};
