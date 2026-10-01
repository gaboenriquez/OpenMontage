import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, getStaticFiles, staticFile, useCurrentFrame } from "remotion";
import { C, Dot, ease, mix } from "./theme";
import { Field } from "./scenes/Field";
import { Evidence } from "./scenes/Evidence";
import { Standard } from "./scenes/Standard";
import { NC } from "./scenes/NC";
import { Board, BOARD_CARD_POS } from "./scenes/Board";
import { Report } from "./scenes/Report";
import { End } from "./scenes/End";

export const FILM_FRAMES = 1620;

const useFonts = () => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    const faces = [
      new FontFace("Geist", `url(${staticFile("Geist-Variable.ttf")})`, { weight: "100 900" }),
      new FontFace("Geist Mono", `url(${staticFile("GeistMono-Variable.ttf")})`, { weight: "100 900" }),
    ];
    Promise.all(faces.map((ff) => ff.load()))
      .then((loaded) => {
        loaded.forEach((ff) => document.fonts.add(ff));
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [handle]);
};

const hasMusic = () => getStaticFiles().some((s) => s.name === "music.wav");

// while the finding is a card on the board, the dot rides on the card itself
const dotOnCard = (f: number) => {
  if (f < 950 || f > 1150) return undefined;
  const p = BOARD_CARD_POS(f);
  return { x: p.left + 26, y: p.top + 40 };
};

export const Film: React.FC = () => {
  useFonts();
  const f = useCurrentFrame();
  // warm dawn glow fades into the brand-green night as the standard takes over
  const glow = mix("#3a2a12", "#0f2a1c", ease(f, 120, 420));
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(1500px 900px at 50% 60%, ${glow} 0%, ${C.bg} 70%)` }} />
      <Field f={f} />
      <Evidence f={f} />
      <Standard f={f} />
      <NC f={f} />
      <Board f={f} />
      <Report f={f} />
      <End f={f} />
      <Dot f={f} at={dotOnCard(f)} />
      {hasMusic() ? <Audio src={staticFile("music.wav")} /> : null}
    </AbsoluteFill>
  );
};
