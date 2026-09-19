/**
 * "Marco Aurelio: escribió un diario para nadie" — atelier composition,
 * hand-authored, forked from Zenon.tsx so the series keeps one visual language.
 *
 * First person again, this time about the survival of the text itself: notes
 * never meant for a reader, two centuries of documentary silence, a single
 * manuscript into print in 1559, and that manuscript gone ever since.
 *
 * FAL_KEY is still empty, so nothing was generated. Four shots reuse clips and
 * three reuse stills already paid for in estoicismo-marco-aurelio — mirrored
 * and cooled — plus ONE faceless shot from the Séneca pool (a hand on an empty
 * stone block): faces come only from Marco Aurelio's own pool, because the
 * Séneca bust is visibly a different man and this piece is his own voice.
 * The two stills spent in the Zenón piece (candle+book, row of busts) are
 * deliberately left out so the two videos don't tread on each other.
 *
 * s7 is s1 un-mirrored: the Short restarts on the face it opened with.
 *
 * LAYOUT CONTRACT — inherited verbatim from Seneca.tsx:
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
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import data from "./diarioCaptions.json";

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

/** Real length of narration_master.wav, not the script estimate. */
export const TOTAL_FRAMES = Math.round(39.3 * FPS);

interface Shot {
  id: string;
  /** "video" plays a reused clip; "still" is a paid still animated in code. */
  kind: "video" | "still";
  /** file under public/diario — which pool asset this beat remaps */
  src: string;
  /** video shots: real length of that source clip, in seconds. Unlike the
   *  Zenón pool these come from two different videos and are not all 5.04s,
   *  so the slowdown has to be computed per shot. */
  sourceSeconds?: number;
  start: number;
  end: number;
  keyword?: string;
  accent?: boolean;
  /** seconds into the shot before the keyword appears (default 0.22) */
  keywordDelay?: number;
  /** still shots only: push-in direction, 1 = in, -1 = out */
  pushDirection?: 1 | -1;
  /** still shots only: pixels to slide the framing down, to keep the subject
   *  out of the keyword band (the bookshop bust sits high in its own frame) */
  offsetY?: number;
}

// Shot ends run through to the NEXT shot's start, never just to the end of
// their own narration line — the 0.35s silences between sections would
// otherwise show a black frame at every cut.
const SHOTS: Shot[] = [
  { id: "s1", kind: "video", src: "video/s1.mp4", sourceSeconds: 5.433, start: 0.0, end: 3.406, keyword: "UN CUADERNO\nPARA NADIE" },
  { id: "s2", kind: "still", src: "img/s2.jpg", start: 3.406, end: 10.078, keyword: "DE NOCHE,\nEN CAMPAÑA", pushDirection: 1 },
  { id: "s3", kind: "video", src: "video/s3.mp4", sourceSeconds: 8.0, start: 10.078, end: 15.705, keyword: "A MÍ\nMISMO", accent: true },
  { id: "s4", kind: "video", src: "video/s4.mp4", sourceSeconds: 5.042, start: 15.705, end: 22.585, keyword: "DOS SIGLOS\nDE SILENCIO" },
  { id: "s5", kind: "still", src: "img/s5.jpg", start: 22.585, end: 27.846, keyword: "UN ÚNICO\nMANUSCRITO", pushDirection: 1 },
  { id: "s6", kind: "still", src: "img/s6.jpg", start: 27.846, end: 33.081, keyword: "Y DESAPARECIÓ", pushDirection: -1 },
  { id: "s7", kind: "video", src: "video/s7.mp4", sourceSeconds: 5.433, start: 33.081, end: 39.3, keyword: "¿QUÉ ESCRIBIRÍAS\nTÚ?", keywordDelay: 3.2 },
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
/** Still animated in code: slow push plus a hair of drift, so it breathes like
 *  the i2v shots around it instead of sitting dead between them. */
const MovingStill: React.FC<{
  src: string;
  durationInFrames: number;
  direction: 1 | -1;
  offsetY?: number;
}> = ({ src, durationInFrames, direction, offsetY = 0 }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = direction === 1 ? 1.06 + progress * 0.09 : 1.15 - progress * 0.09;
  const driftY = interpolate(progress, [0, 1], [direction === 1 ? 14 : -14, 0]) + offsetY;

  return (
    <Img
      src={staticFile(`diario/${src}`)}
      style={{
        width: WIDTH,
        height: HEIGHT,
        objectFit: "cover",
        transform: `scale(${scale}) translateY(${driftY}px)`,
      }}
    />
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

export const Diario: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {SHOTS.map((shot) => {
        const from = sec(shot.start);
        const dur = sec(shot.end) - from;
        const shotSeconds = shot.end - shot.start;
        // A clip shorter than its beat is slowed to span the whole beat rather
        // than freeze-framing on its last frame; one long enough plays at 1x.
        const rate = Math.min(1, (shot.sourceSeconds ?? shotSeconds) / shotSeconds);
        return (
          <Sequence key={shot.id} from={from} durationInFrames={dur} layout="none">
            {shot.kind === "video" ? (
              <OffthreadVideo
                src={staticFile(`diario/${shot.src}`)}
                muted
                playbackRate={rate}
                style={{ width: WIDTH, height: HEIGHT, objectFit: "cover" }}
              />
            ) : (
              <MovingStill
                src={shot.src}
                durationInFrames={dur}
                direction={shot.pushDirection ?? 1}
                offsetY={shot.offsetY}
              />
            )}
            <Grade />
            {shot.keyword
              ? (() => {
                  const delay = sec(shot.keywordDelay ?? 0.22);
                  const kwDur = Math.min(dur - delay - sec(0.3), sec(3.2));
                  return (
                    <Sequence from={delay} durationInFrames={kwDur} layout="none">
                      <Keyword
                        text={shot.keyword}
                        durationInFrames={kwDur}
                        accent={shot.accent}
                      />
                    </Sequence>
                  );
                })()
              : null}
          </Sequence>
        );
      })}

      <Subtitles />

      <Audio src={staticFile("diario/master.wav")} />
    </AbsoluteFill>
  );
};
