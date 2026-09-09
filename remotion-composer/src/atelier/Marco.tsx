/**
 * "Enterró a ocho de sus hijos" (Marco Aurelio, Parte 3)
 * — atelier composition, hand-authored for this piece only.
 *
 * Narration is a user-supplied recording; every cut is placed at the midpoint
 * of a real silence measured from that file, so nothing is timed to a guess.
 *
 * LAYOUT CONTRACT — the reason the two text layers can never collide, and the
 * reason neither ever falls under the Shorts/Reels chrome:
 *
 *     y=0    ┬ ─────────────────────────────  top of frame
 *            │  220px  dead zone (app chrome)
 *     y=420  ┼ ─────────────────────────────
 *            │  KEYWORD band, 320px, centred on y=580 — deliberately ABOVE the
 *            │  eyeline: these busts fill the frame, and type at mid-face was
 *            │  covering the serene expression the whole piece is about.
 *     y=740  ┼ ─────────────────────────────
 *            │  600px  DEAD ZONE — must stay empty
 *     y=1340 ┼ ─────────────────────────────
 *            │  SUBTITLE band, 200px, centred on y=1440
 *     y=1540 ┼ ─────────────────────────────
 *            │  380px  dead zone (title, description, channel row)
 *     y=1920 ┴ ─────────────────────────────  bottom of frame
 *
 * A further 140px is kept clear on the right for the like/share button column,
 * which is why both text layers cap out at 800px wide rather than filling.
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
import data from "./marcoCaptions.json";

const { fontFamily: ANTON } = loadAnton();
const { fontFamily: INTER } = loadInter();

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

// --- Layout bands (see contract above) --------------------------------------
const KEYWORD_TOP = 420;
const KEYWORD_H = 320;
const SUBTITLE_TOP = 1340;
const SUBTITLE_H = 200;
const SAFE_W = 800; // leaves 140px clear on the right for the button column

export const TOTAL_FRAMES = Math.round(50.08 * FPS);

interface Shot {
  id: string;
  start: number;
  end: number;
  /**
   * Omitted on the final shot on purpose. Measured on part 1 of this channel:
   * the closing "subscribe" card bled 25.4 retention points in 5 seconds —
   * 4.71 pts/sec, against 0.33 pts/sec on the best shot of the piece. A static
   * end card reads as "it's over" and viewers exit instead of looping, and the
   * loop is where this format actually wins (73s watched on a 61s video).
   * The part-2 promise survives in the narration and the subtitle line.
   */
  keyword?: string;
  /** the single accented cut of the piece — the turn into the eight children */
  accent?: boolean;
  /**
   * Shots animated in code instead of by an i2v model. Kling earns its price
   * only where something in the frame moves on its own — a flame, smoke, dust
   * caught in a beam. On a locked-off insert of a scroll it buys nothing, and a
   * measured A/B on the m4 hand insert put code at 5.61 mean inter-frame change
   * against Kling's 5.30. So: pay for organic motion, render camera moves free.
   */
  still?: { from: number; to: number; panX?: number };
}

const SHOTS: Shot[] = [
  { id: "m1", start: 0.0, end: 5.45, keyword: "ENTERRÓ A\nOCHO HIJOS" },
  { id: "m2", start: 5.45, end: 12.48, keyword: "PODÍA ORDENAR\nEJÉRCITOS" },
  { id: "m3", start: 12.48, end: 17.75, keyword: "OCHO\nDE TRECE", accent: true },
  { id: "m4", start: 17.75, end: 25.74, keyword: "NI UNA QUEJA" },
  { id: "m5", start: 25.74, end: 33.23, keyword: "QUIÉRELAS\nCOMO SON", still: { from: 1.0, to: 1.09 } },
  { id: "m6", start: 33.23, end: 37.91, keyword: "DE NOCHE,\nSOLO", still: { from: 1.13, to: 1.0 } },
  { id: "m7", start: 37.91, end: 43.03, keyword: "INTENTANDO\nCONVENCERSE", still: { from: 1.0, to: 1.11 } },
  { id: "m8", start: 43.03, end: 47.3, keyword: "CASI\nSE PIERDE", still: { from: 1.06, to: 1.0, panX: -14 } },
  { id: "m9", start: 47.3, end: 50.08, still: { from: 1.012, to: 1.0 } },
];

const sec = (s: number) => Math.round(s * FPS);

// ---------------------------------------------------------------------------
// Keyword — Anton, upper band. Held for ~2.4s at the head of each scene rather
// than the whole shot, so the frame is allowed to breathe and the eye is free
// to drop to the subtitle underneath.
// ---------------------------------------------------------------------------
const Keyword: React.FC<{ text: string; durationInFrames: number; accent?: boolean }> = ({
  text,
  durationInFrames,
  accent,
}) => {
  const frame = useCurrentFrame();
  const inF = accent ? 3 : 7; // the accented cut snaps in harder
  const outF = 8;

  const opacity = interpolate(
    frame,
    [0, inF, durationInFrames - outF, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // a short settle, never a bounce — this piece has no room for playfulness
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
          fontSize: 96,
          lineHeight: 1.02,
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
// Subtitles — Inter, lower band, word-level highlight driven by the real
// word timestamps from the narration transcript.
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
                // the darkest scenes (s4, s7a) put low-contrast type over near-black
                // marble, so the unspoken state stays readable rather than ghosting out
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
// Vignette + floor lift. The clips are graded dark by design; this keeps the
// centre readable on a phone at low brightness without flattening the shadows.
// ---------------------------------------------------------------------------
const Grade: React.FC = () => (
  <>
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse 72% 58% at 50% 42%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)",
      }}
    />
    {/* a soft scrim behind each text band so type never sits on bare highlight */}
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


// ---------------------------------------------------------------------------
// A still with a camera move. Linear, never eased: a Ken Burns ease reads as
// "slideshow", while a constant crawl reads as a locked-off camera on a dolly,
// which is what the rest of the piece looks like.
// ---------------------------------------------------------------------------
const StillShot: React.FC<{
  id: string;
  spec: { from: number; to: number; panX?: number };
  durationInFrames: number;
}> = ({ id, spec, durationInFrames }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [spec.from, spec.to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const x = interpolate(frame, [0, durationInFrames], [0, spec.panX ?? 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <Img
        src={staticFile(`marco/images/${id}.png`)}
        style={{
          width: WIDTH,
          height: HEIGHT,
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${x}px)`,
          transformOrigin: "center center",
        }}
      />
    </AbsoluteFill>
  );
};

export const Marco: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {SHOTS.map((shot) => {
        const from = sec(shot.start);
        const dur = sec(shot.end) - from;
        return (
          <Sequence key={shot.id} from={from} durationInFrames={dur} layout="none">
            {/* hard cut: no fade, no black — one shot lands straight on the next */}
            {shot.still ? (
              <StillShot id={shot.id} spec={shot.still} durationInFrames={dur} />
            ) : (
              <OffthreadVideo
                src={staticFile(`marco/video/${shot.id}.mp4`)}
                muted
                style={{ width: WIDTH, height: HEIGHT, objectFit: "cover" }}
              />
            )}
            <Grade />
            {/* The keyword lands, is read, and clears before the cut — it never
                rides the whole shot, so the image gets the last beat to itself
                and the subtitle underneath is never competing with it.
                The final shot carries no keyword at all: see the Shot type. */}
            {shot.keyword ? (
              <Sequence
                from={sec(0.22)}
                durationInFrames={Math.min(dur - sec(0.9), sec(3.2))}
                layout="none"
              >
                <Keyword
                  text={shot.keyword}
                  durationInFrames={Math.min(dur - sec(0.9), sec(3.2))}
                  accent={shot.accent}
                />
              </Sequence>
            ) : null}
          </Sequence>
        );
      })}

      <Subtitles />

      <Audio src={staticFile("marco/master_mix.m4a")} />
    </AbsoluteFill>
  );
};
