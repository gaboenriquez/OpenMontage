/**
 * Thumbnail artboards for "Zenón: naufragó y lo perdió todo".
 * Same Anton treatment as the piece, so thumb and video read as one object.
 *
 * The title breaks by MEANING: the name sits small on top, the turn
 * ("LO PERDIÓ TODO") carries the weight. Variant A is the opening face under
 * a cold key with the block low; variant B is the empty hand with the block
 * high, which leaves the hand itself uncovered.
 */

import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";

const { fontFamily: ANTON } = loadAnton();

export interface ZenonThumbProps {
  variant: "a" | "b";
}

export const ZenonThumb: React.FC<ZenonThumbProps> = ({ variant }) => {
  const isA = variant === "a";
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Img
        src={staticFile(`zenon/thumbs/thumb_${variant}.png`)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 76% 58% at 50% 46%, rgba(0,0,0,0) 34%, rgba(0,0,0,0.70) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background: isA
            ? "linear-gradient(0deg, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.38) 26%, rgba(0,0,0,0) 48%)"
            : "linear-gradient(180deg, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.34) 30%, rgba(0,0,0,0) 50%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 70,
          width: 1080 - 140,
          ...(isA ? { bottom: 250 } : { top: 180 }),
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: ANTON,
            fontSize: 74,
            lineHeight: 1.04,
            color: "#D8D2C6",
            letterSpacing: "0.015em",
            textShadow: "0 6px 34px rgba(0,0,0,0.95)",
          }}
        >
          ZENÓN NAUFRAGÓ
        </div>
        <div
          style={{
            fontFamily: ANTON,
            fontSize: 106,
            lineHeight: 1.0,
            marginTop: 14,
            color: "#FFFFFF",
            letterSpacing: "0.01em",
            textShadow: "0 8px 44px rgba(0,0,0,0.98), 0 2px 12px rgba(0,0,0,0.95)",
          }}
        >
          Y LO PERDIÓ
          <br />
          TODO
        </div>
      </div>
    </AbsoluteFill>
  );
};
