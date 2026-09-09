/**
 * Thumbnail artboards for "Enterró a ocho hijos y no escribió una queja".
 *
 * Both bases are stills already generated for the video itself (m1 and m5) —
 * fal.ai ran out of balance before dedicated thumbnail art could be made, and
 * these two are close-ups of the recurring character with usable dark space, so
 * buying new ones would have added cost without adding quality.
 *
 * Framing follows the channel rule: headline in the lower band, condensed white
 * type, so the thumb is recognisable next to parts 1 and 2 in the feed.
 */

import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";

const { fontFamily: ANTON } = loadAnton();

export interface MarcoThumbProps {
  variant: "a" | "b";
}

export const MarcoThumb: React.FC<MarcoThumbProps> = ({ variant }) => {
  const isA = variant === "a";
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Img
        src={staticFile(`marco/thumbs/thumb_${variant}.png`)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 76% 58% at 50% 44%, rgba(0,0,0,0) 34%, rgba(0,0,0,0.72) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(0deg, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.42) 28%, rgba(0,0,0,0) 50%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 70,
          width: 1080 - 140,
          bottom: isA ? 250 : 210,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: ANTON,
            fontSize: 78,
            lineHeight: 1.03,
            color: "#D8D2C6",
            letterSpacing: "0.015em",
            textShadow: "0 6px 34px rgba(0,0,0,0.95)",
          }}
        >
          ENTERRÓ A OCHO HIJOS
        </div>
        <div
          style={{
            fontFamily: ANTON,
            fontSize: 104,
            lineHeight: 1.0,
            marginTop: 14,
            color: "#FFFFFF",
            letterSpacing: "0.01em",
            textShadow: "0 8px 44px rgba(0,0,0,0.98), 0 2px 12px rgba(0,0,0,0.95)",
          }}
        >
          Y NO ESCRIBIÓ
          <br />
          UNA QUEJA
        </div>
      </div>
    </AbsoluteFill>
  );
};
