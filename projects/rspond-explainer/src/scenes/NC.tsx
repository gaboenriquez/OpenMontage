import React from "react";
import { C, Caption, DISPLAY, MONO, ease, lerp, sp, typed } from "../theme";

// Document rect, and the card it collapses into on the board.
export const DOC = { left: 310, top: 200, w: 1300, h: 780 };
export const CARD0142 = { left: 320, top: 280, w: 360, h: 120 };
const CHIP = { left: 1430, top: 756, w: 200, h: 68 };

const Field: React.FC<{ label: string; x: number; top: number; w: number; o: number; children: React.ReactNode }> = ({ label, x, top, w, o, children }) => (
  <div style={{ position: "absolute", left: x, width: w, top, opacity: o }}>
    <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: "0.12em", color: "#6b7a72" }}>{label}</div>
    <div style={{ marginTop: 10, fontFamily: DISPLAY, fontSize: 30, lineHeight: 1.3, fontWeight: 520, color: C.ink, minHeight: 40 }}>{children}</div>
  </div>
);

export const NC: React.FC<{ f: number }> = ({ f }) => {
  if (f < 630 || f > 960) return null;
  const grow = sp(f, 636, 20, 110);
  const shrink = ease(f, 900, 946);
  const r = {
    left: lerp(lerp(CHIP.left, DOC.left, grow), CARD0142.left, shrink),
    top: lerp(lerp(CHIP.top, DOC.top, grow), CARD0142.top, shrink),
    w: lerp(lerp(CHIP.w, DOC.w, grow), CARD0142.w, shrink),
    h: lerp(lerp(CHIP.h, DOC.h, grow), CARD0142.h, shrink),
  };
  const content = ease(f, 668, 690) * (1 - ease(f, 898, 914));
  const sev = sp(f, 738, 16, 150); // Menor -> Mayor
  const reviewed = sp(f, 858, 12, 160);
  const t = (s: string, a: number, b: number) => typed(s, f, a, b);
  const caretOn = Math.floor(f / 8) % 2 === 0;
  const L = 66, COL2 = 700, COLW = 560;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          left: r.left,
          top: r.top,
          width: r.w,
          height: r.h,
          borderRadius: lerp(34, 26, grow),
          background: f < 650 ? C.green : C.paper,
          boxShadow: "0 40px 90px rgba(0,0,0,0.45)",
          overflow: "hidden",
          opacity: 1 - ease(f, 944, 952),
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: DOC.w, height: DOC.h, opacity: content }}>
          <div style={{ position: "absolute", left: L, top: 54, fontFamily: MONO, fontSize: 19, letterSpacing: "0.16em", color: "#6b7a72" }}>
            NO CONFORMIDAD · RSPO P&amp;C 2024
          </div>
          <div style={{ position: "absolute", left: L, top: 88, fontFamily: DISPLAY, fontSize: 64, fontWeight: 700, letterSpacing: "-0.03em", color: C.ink }}>
            NC-0142
          </div>
          <div
            style={{
              position: "absolute",
              right: L,
              top: 104,
              padding: "10px 18px",
              borderRadius: 14,
              fontFamily: MONO,
              fontSize: 20,
              letterSpacing: "0.08em",
              background: reviewed > 0.5 ? C.green : "#e4e9e4",
              color: reviewed > 0.5 ? C.ink : "#4f5d55",
              transform: `scale(${1 + 0.15 * Math.sin(Math.PI * Math.min(1, reviewed))})`,
            }}
          >
            {reviewed > 0.5 ? "REVISADA ✓" : "BORRADOR IA"}
          </div>
          <div style={{ position: "absolute", left: L, right: L, top: 186, height: 2, background: "#dde3dd" }} />
          {/* left column */}
          <Field label="INDICADOR" x={L} top={216} w={COLW} o={ease(f, 684, 696)}>
            {t("7.1.3 (C) · Registro de uso de plaguicidas", 690, 722)}
          </Field>
          <Field label="SEVERIDAD" x={L} top={346} w={COLW} o={ease(f, 716, 728)}>
            <div style={{ position: "relative", display: "flex", width: 300, height: 56, borderRadius: 28, background: "#e4e9e4", marginTop: 2 }}>
              <div style={{ position: "absolute", top: 4, left: 4 + 146 * sev, width: 146, height: 48, borderRadius: 24, background: sev > 0.5 ? C.red : "#ffffff" }} />
              {["Menor", "Mayor"].map((s, i) => (
                <div key={s} style={{ position: "relative", flex: 1, textAlign: "center", lineHeight: "56px", fontSize: 26, fontWeight: 600, color: i === 1 && sev > 0.5 ? "#ffffff" : C.ink }}>
                  {s}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 19, color: "#6b7a72", opacity: ease(f, 744, 760) }}>
              Indicador crítico (C) → NC Mayor
            </div>
          </Field>
          <Field label="EVIDENCIA" x={L} top={520} w={COLW} o={ease(f, 790, 802)}>
            {t("Bitácora de bodega · Entrevista a aplicadores", 796, 818)}
          </Field>
          {/* right column */}
          <Field label="HALLAZGO" x={COL2} top={216} w={COLW} o={ease(f, 746, 758)}>
            {t("Aplicaciones de plaguicidas sin registrar ingrediente activo, cantidad ni área aplicada.", 752, 792)}
          </Field>
          <Field label="ACCIÓN CORRECTIVA" x={COL2} top={400} w={COLW} o={ease(f, 812, 824)}>
            {t("Registrar cada aplicación: producto, ingrediente activo, LD50, cantidad, periodo, área y motivo.", 816, 856)}
            {f > 816 && f < 862 && caretOn ? <span style={{ color: C.green }}>▍</span> : null}
          </Field>
          <div style={{ position: "absolute", left: L, right: L, top: 680, height: 2, background: "#dde3dd" }} />
          <div style={{ position: "absolute", left: L, top: 708, fontFamily: MONO, fontSize: 19, color: "#6b7a72" }}>
            Redactado con IA · {reviewed > 0.5 ? "revisado por el auditor" : "pendiente de revisión"}
          </div>
        </div>
      </div>
      <Caption f={f} a={652} b={770}>Redactada con IA.</Caption>
      <Caption f={f} a={774} b={898}>Revisada por ti.</Caption>
    </div>
  );
};
