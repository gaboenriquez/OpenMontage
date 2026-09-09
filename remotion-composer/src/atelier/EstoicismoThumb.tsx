/**
 * Thumbnail artboards for "La dicotomía de control".
 * Shares the video's type treatment (Anton) so the thumb and the piece read
 * as one object. Rendered as stills, one per `variant`.
 */

import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";

const { fontFamily: ANTON } = loadAnton();

export interface ThumbProps {
  variant: "a" | "b";
}

export const EstoicismoThumb: React.FC<ThumbProps> = ({ variant }) => {
  const isA = variant === "a";
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Img
        src={staticFile(`estoicismo/thumb_${variant}.png`)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* vignette + scrim under the title block */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 78% 60% at 50% 44%, rgba(0,0,0,0) 36%, rgba(0,0,0,0.66) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background: isA
            ? "linear-gradient(0deg, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.30) 22%, rgba(0,0,0,0) 44%)"
            : "linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.24) 26%, rgba(0,0,0,0) 46%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 74,
          width: 1080 - 148,
          ...(isA ? { bottom: 210 } : { top: 190 }),
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: ANTON,
            fontSize: 128,
            lineHeight: 0.98,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "#F4F1EA",
            textShadow: "0 8px 40px rgba(0,0,0,0.95), 0 2px 10px rgba(0,0,0,0.9)",
          }}
        >
          {"LA DICOTOMÍA\nDE CONTROL".split("\n").map((l, i) => (
            <div key={i} style={{ whiteSpace: "nowrap" }}>
              {l}
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 26,
            height: 5,
            width: 190,
            marginLeft: "auto",
            marginRight: "auto",
            backgroundColor: "#C9A227",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
