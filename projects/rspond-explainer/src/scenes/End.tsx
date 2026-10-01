import React from "react";
import { C, DISPLAY, ease, lerp, sp } from "../theme";

export const End: React.FC<{ f: number }> = ({ f }) => {
  if (f < 1440) return null;
  const pill = sp(f, 1450, 18, 100);
  const text = ease(f, 1478, 1500);
  const brand = sp(f, 1490, 18, 110);
  const w = lerp(44, 720, pill), h = lerp(44, 156, pill);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center", opacity: brand, transform: `translateY(${(1 - brand) * 24}px)` }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 60, fontWeight: 700, letterSpacing: "0.24em", color: C.text, paddingLeft: "0.24em" }}>RSPOND</div>
        <div style={{ marginTop: 16, fontFamily: DISPLAY, fontSize: 32, fontWeight: 450, color: C.mute }}>Respuesta inteligente para RSPO</div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 960 - w / 2,
          top: 620 - h / 2,
          width: w,
          height: h,
          borderRadius: h / 2,
          background: "#13231b",
          border: `2px solid ${C.green}`,
          boxShadow: `0 0 80px rgba(31,157,85,${0.25 * pill})`,
          opacity: ease(f, 1440, 1452),
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 120 + (w - 720) / 2 + 0,
            top: 0,
            height: h,
            display: "flex",
            alignItems: "center",
            gap: 26,
            opacity: text,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontFamily: DISPLAY, fontSize: 80, fontWeight: 650, letterSpacing: "-0.03em", color: C.text }}>rspond.app</span>
          <span style={{ fontFamily: DISPLAY, fontSize: 70, fontWeight: 500, color: C.greenSoft }}>↗</span>
        </div>
      </div>
    </div>
  );
};
