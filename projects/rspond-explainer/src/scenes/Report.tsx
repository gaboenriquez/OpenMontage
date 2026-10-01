import React from "react";
import { C, Caption, DISPLAY, MONO, ease, lerp, sp } from "../theme";

const DOC = { left: 520, top: 180, w: 880, h: 650 };
const ICON = { left: 860, top: 435, w: 200, h: 250 };
const BTN = { left: 790, top: 870, w: 340, h: 90 };

const Stat: React.FC<{ n: number; label: string; color: string; f: number; a: number }> = ({ n, label, color, f, a }) => {
  const v = Math.round(n * ease(f, a, a + 30));
  return (
    <div style={{ flex: 1, padding: "20px 22px", borderRadius: 20, background: "#e8ede8" }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 54, fontWeight: 700, color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>{v}</div>
      <div style={{ fontFamily: MONO, fontSize: 19, color: "#5d6b63", marginTop: 2 }}>{label}</div>
    </div>
  );
};

const BARS = [2, 1, 1, 3, 2, 2, 4]; // NC per principle (sample data)

export const Report: React.FC<{ f: number }> = ({ f }) => {
  if (f < 1136 || f > 1440) return null;
  const appear = sp(f, 1146, 18, 110);
  const fold = ease(f, 1268, 1302); // document -> .docx icon
  const iconOut = ease(f, 1385, 1420);
  const rect = {
    left: lerp(DOC.left, ICON.left, fold),
    top: lerp(DOC.top, ICON.top, fold),
    w: lerp(DOC.w, ICON.w, fold),
    h: lerp(DOC.h, ICON.h, fold),
  };
  const content = 1 - ease(f, 1262, 1280);
  const btnIn = sp(f, 1200, 16, 140);
  const press = sp(f, 1258, 12, 220) - sp(f, 1266, 12, 160);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* closed cards fly into the page */}
      {[0, 1, 2, 3].map((i) => {
        const p = ease(f, 1142 + i * 5, 1180 + i * 5);
        if (p <= 0 || p >= 1) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: lerp(1240, 700 + i * 60, p),
              top: lerp(280 + i * 140, 420 + i * 30, p),
              width: lerp(360, 140, p),
              height: lerp(120, 60, p),
              borderRadius: 20,
              background: C.bg2,
              border: `2px solid ${C.green}`,
              opacity: 1 - p,
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: rect.left,
          top: rect.top,
          width: rect.w,
          height: rect.h,
          borderRadius: lerp(28, 22, fold),
          background: C.paper,
          boxShadow: "0 40px 90px rgba(0,0,0,0.45)",
          opacity: appear * (1 - iconOut),
          transform: `scale(${(0.9 + 0.1 * appear) * (1 - 0.8 * iconOut)})`,
          transformOrigin: "center",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: DOC.w, height: DOC.h, opacity: content, padding: 56 }}>
          <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.14em", color: "#6b7a72" }}>INFORME · RSPO P&amp;C 2024</div>
          <div style={{ marginTop: 14, fontFamily: DISPLAY, fontSize: 46, fontWeight: 700, letterSpacing: "-0.03em", color: C.ink, lineHeight: 1.08 }}>
            Informe de auditoría
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 28 }}>
            <Stat n={3} label="Mayores" color={C.red} f={f} a={1170} />
            <Stat n={9} label="Menores" color={C.ink} f={f} a={1176} />
            <Stat n={24} label="Cerradas" color={C.green} f={f} a={1182} />
          </div>
          <div style={{ marginTop: 26, fontFamily: MONO, fontSize: 19, color: "#6b7a72", letterSpacing: "0.1em" }}>NC POR PRINCIPIO</div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {BARS.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 34, fontFamily: MONO, fontSize: 20, color: "#4f5d55" }}>P{i + 1}</div>
                <div style={{ height: 16, borderRadius: 8, background: i === 6 ? C.green : "#c9d3cb", width: 120 * b * ease(f, 1188 + i * 4, 1218 + i * 4) }} />
              </div>
            ))}
          </div>
        </div>
        {/* .docx face */}
        <div style={{ position: "absolute", inset: 0, opacity: ease(f, 1286, 1302), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ padding: "12px 18px", borderRadius: 16, background: C.ink, color: C.greenSoft, fontFamily: MONO, fontWeight: 600, fontSize: 30, letterSpacing: "0.06em" }}>DOCX</div>
          <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 10, width: 130 }}>
            {[1, 0.8, 0.9].map((w, i) => (
              <div key={i} style={{ height: 9, width: `${w * 100}%`, borderRadius: 5, background: "#c9d3cb" }} />
            ))}
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: ICON.top + ICON.h + 40,
          textAlign: "center",
          fontFamily: MONO,
          fontSize: 30,
          color: C.text,
          opacity: ease(f, 1296, 1312) * (1 - iconOut),
        }}
      >
        informe_rspo.docx
      </div>
      {/* export button */}
      <div
        style={{
          position: "absolute",
          left: BTN.left,
          top: BTN.top,
          width: BTN.w,
          height: BTN.h,
          borderRadius: BTN.h / 2,
          background: C.green,
          color: C.ink,
          fontFamily: DISPLAY,
          fontSize: 32,
          fontWeight: 650,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingLeft: 26,
          opacity: btnIn * (1 - ease(f, 1270, 1290)),
          transform: `scale(${(0.85 + 0.15 * btnIn) * (1 - 0.07 * press)})`,
        }}
      >
        Exportar a Word
      </div>
      <Caption f={f} a={1160} b={1378}>Del campo al informe.</Caption>
    </div>
  );
};
