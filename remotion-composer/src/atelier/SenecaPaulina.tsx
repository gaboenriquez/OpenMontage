/**
 * "Lo que le costó más soltar que su propia vida" (Séneca — continuación)
 * — atelier composition, hand-authored, forked from Seneca.tsx.
 *
 * Continues the cliffhanger of estoicismo-seneca-parte2 (Paulina, la esposa
 * de Séneca). No new image/video generation was available for this piece
 * (FAL_KEY vacía en .env) — every shot REUSES one of the 9 marble clips
 * already paid for in that earlier piece, remapped to a new beat, mirrored
 * horizontally and re-graded cooler/more desaturated so it doesn't read as
 * a duplicate of the original video to a viewer who saw both.
 *
 * Narration this time is ai33 TTS (not a user recording) — the earlier
 * piece in this series forbids TTS by design; this is a documented,
 * explicit exception, not a silent default (see brief.json metadata).
 *
 * LAYOUT CONTRACT — identical to Seneca.tsx, inherited on purpose so the
 * series reads as one visual language:
 *
 *     y=0    ┬ ─────────────────────────────  top of frame
 *            │  220px  dead zone (app chrome)
 *     y=420  ┼ ─────────────────────────────
 *            │  KEYWORD band, 320px, centred on y=580
 *     y=740  ┼ ─────────────────────────────
 *            │  600px  DEAD ZONE — must stay empty
 *     y=1340 ┼ ─────────────────────────────
 *            │  SUBTITLE band, 200px, centred on y=1440
 *     y=1540 ┼ ─────────────────────────────
 *            │  380px  dead zone (title, description, channel row)
 *     y=1920 ┴ ─────────────────────────────  bottom of frame
 */

import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import data from "./senecaPaulinaCaptions.json";

const { fontFamily: ANTON } = loadAnton();
const { fontFamily: INTER } = loadInter();

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

const KEYWORD_TOP = 420;
const KEYWORD_H = 320;
const SUBTITLE_TOP = 1340;
const SUBTITLE_H = 200;
const SAFE_W = 800;

export const TOTAL_FRAMES = Math.round(42.561 * FPS);

interface Shot {
  id: string;
  /** which reused clip from estoicismo-seneca-parte2's paid pool this shot plays */
  reusedFrom: string;
  start: number;
  end: number;
  keyword?: string;
  accent?: boolean;
  /**
   * Seconds into the shot before the keyword appears. Defaults to 0.22 (near
   * the top of the shot). s8's keyword is the spoken closing question, which
   * lands near the END of its narration line (the line opens with the
   * "lección" recap first) — showing it at the default early offset would
   * flash the question well before it's actually asked.
   */
  keywordDelay?: number;
}

// New beat order — deliberately NOT the same order as the original video, so
// the reused clips land on different narrative meanings.
// NOTE: each shot's `end` runs through to the NEXT shot's `start`, not just to
// the end of its own narration line. The 0.5s silences between narration
// sections have no narration but the video must never stop — a shot that
// ends exactly on its own line's last word leaves a dead gap with nothing on
// screen (caught in QC: a fully black frame at every section boundary).
// Reused-clip assignment is duration-matched (not just theme-matched): the
// closing shot now holds through a longer spoken question, so it needs the
// longest available source clip. Reassigning by need avoids every shot's
// clip running out and freeze-framing on its last frame.
const SHOTS: Shot[] = [
  { id: "s1", reusedFrom: "s1", start: 0.0, end: 5.58, keyword: "SE LO\nNEGARON" },
  { id: "s2", reusedFrom: "s6", start: 5.58, end: 10.51, keyword: "SÓLO EL\nEJEMPLO" },
  { id: "s3", reusedFrom: "s5a", start: 10.51, end: 15.62, keyword: "PAULINA\nSE CORTÓ", accent: true },
  { id: "s4", reusedFrom: "s4", start: 15.62, end: 21.26, keyword: "NERÓN LA\nSALVÓ" },
  { id: "s5", reusedFrom: "s3", start: 21.26, end: 26.86, keyword: "MÁS GLORIA\nEN TU MUERTE" },
  { id: "s6", reusedFrom: "s7b", start: 26.86, end: 31.48, keyword: "VIVIÓ\nPÁLIDA" },
  { id: "s7", reusedFrom: "s5b", start: 31.48, end: 36.33, keyword: "COSTÓ MÁS\nQUE MORIR" },
  { id: "s8", reusedFrom: "s2", start: 36.33, end: 42.561, keyword: "¿QUÉ\nSOLTARÍAS?", keywordDelay: 4.7 },
];

const sec = (s: number) => Math.round(s * FPS);

// ---------------------------------------------------------------------------
const Keyword: React.FC<{ text: string; durationInFrames: number; accent?: boolean }> = ({
  text,
  durationInFrames,
  accent,
}) => {
  const frame = useCurrentFrame();
  const inF = accent ? 3 : 7;
  const outF = 8;

  const opacity = interpolate(
    frame,
    [0, inF, durationInFrames - outF, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const lift = interpolate(frame, [0, inF + 4], [accent ? 14 : 22, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blur = interpolate(frame, [0, inF + 2], [accent ? 0 : 6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: KEYWORD_TOP,
        left: 0,
        width: WIDTH,
        height: KEYWORD_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transform: `translateY(${lift}px)`,
        filter: `blur(${blur}px)`,
      }}
    >
      <div
        style={{
          maxWidth: SAFE_W,
          fontFamily: ANTON,
          fontSize: 88,
          lineHeight: 1.05,
          letterSpacing: "0.01em",
          textAlign: "center",
          color: "#F2EFE9",
          whiteSpace: "pre-line",
          textShadow: "0 6px 40px rgba(0,0,0,0.95), 0 2px 10px rgba(0,0,0,0.9)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
interface Cue {
  text: string;
  start: number;
  end: number;
  words: { w: string; s: number; e: number }[];
}

const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cue = (data.cues as Cue[]).find((c) => t >= c.start && t < c.end);
  if (!cue) return null;

  const fade = Math.min(
    interpolate(t, [cue.start, cue.start + 0.09], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(t, [cue.end - 0.09, cue.end], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  return (
    <div
      style={{
        position: "absolute",
        top: SUBTITLE_TOP,
        left: 0,
        width: WIDTH,
        height: SUBTITLE_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fade,
      }}
    >
      <div
        style={{
          maxWidth: SAFE_W,
          display: "flex",
          flexWrap: "wrap",
          gap: "0 14px",
          justifyContent: "center",
          fontFamily: INTER,
          fontWeight: 600,
          fontSize: 52,
          lineHeight: 1.22,
          textAlign: "center",
        }}
      >
        {cue.words.map((w, i) => {
          const spoken = t >= w.s;
          return (
            <span
              key={i}
              style={{
                color: spoken ? "#FFFFFF" : "rgba(228,224,217,0.62)",
                textShadow:
                  "0 3px 22px rgba(0,0,0,0.98), 0 1px 6px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)",
                transition: "none",
              }}
            >
              {w.w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
const Grade: React.FC = () => (
  <>
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse 72% 58% at 50% 42%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)",
      }}
    />
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(to bottom, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.52) 16%," +
          " rgba(0,0,0,0.34) 30%, rgba(0,0,0,0.06) 44%, rgba(0,0,0,0) 58%," +
          " rgba(0,0,0,0.32) 74%, rgba(0,0,0,0.66) 100%)",
      }}
    />
  </>
);

export const SenecaPaulina: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {SHOTS.map((shot) => {
        const from = sec(shot.start);
        const dur = sec(shot.end) - from;
        return (
          <Sequence key={shot.id} from={from} durationInFrames={dur} layout="none">
            {/* Reused clip from estoicismo-seneca-parte2, mirrored + cooled so it
                doesn't read as a repeat of the earlier video. */}
            <OffthreadVideo
              src={staticFile(`seneca/video/${shot.reusedFrom}.mp4`)}
              muted
              style={{
                width: WIDTH,
                height: HEIGHT,
                objectFit: "cover",
                transform: "scaleX(-1)",
                filter: "saturate(0.82) contrast(1.06) brightness(0.96)",
              }}
            />
            <Grade />
            {shot.keyword ? (() => {
              const delay = sec(shot.keywordDelay ?? 0.22);
              const kwDur = Math.min(dur - delay - sec(0.3), sec(3.2));
              return (
                <Sequence from={delay} durationInFrames={kwDur} layout="none">
                  <Keyword text={shot.keyword} durationInFrames={kwDur} accent={shot.accent} />
                </Sequence>
              );
            })() : null}
          </Sequence>
        );
      })}

      <Subtitles />

      <Audio src={staticFile("senecaPaulina/master.wav")} />
    </AbsoluteFill>
  );
};
