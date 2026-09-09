/**
 * Thumbnail artboards for "Le ordenaron morir y consoló a los que lloraban".
 * Shares the video's Anton treatment so thumb and piece read as one object.
 *
 * The title is long for a vertical thumb, so it is broken by MEANING, not by
 * width: the setup sits small, the turn ("CONSOLÓ A LOS QUE LLORABAN") carries
 * the weight. Variant A puts the block low under a cold key; variant B puts it
 * high over the headroom with a warm key.
 */

import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";

const { fontFamily: ANTON } = loadAnton();

export interface SenecaThumbProps {
  variant: "a" | "b";
}

export const SenecaThumb: React.FC<SenecaThumbProps> = ({ variant }) => {
  const isA = variant === "a";
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Img
        src={staticFile(`seneca/thumbs/thumb_${variant}.png`)}
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
          LE ORDENARON MORIR
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
          Y CONSOLÓ A LOS
          <br />
          QUE LLORABAN
        </div>
      </div>
    </AbsoluteFill>
  );
};
