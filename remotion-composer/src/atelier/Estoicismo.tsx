/**
 * "La dicotomía de control" — atelier composition.
 *
 * Hand-authored for this piece only. Deliberately does NOT reuse the stock
 * scene-type catalog: the visual language here is FLUX marble footage plus a
 * single austere type treatment, and the stock cards would flatten it.
 *
 * Layout contract (the reason the two text layers never collide):
 *   - KEYWORD band  : vertical band from y=380 to y=820  (upper third)
 *   - SUBTITLE band : vertical band from y=1430 to y=1610 (lower third)
 * The 600px dead zone between them is intentional and must stay empty.
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
  useVideoConfig,
} from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import captionWords from "./captionWords.json";

const { fontFamily: ANTON } = loadAnton();
const { fontFamily: INTER } = loadInter();

const FPS = 30;
const CLIP_SECONDS = 5.0; // every Kling clip is 5s of source

// --- Layout bands -----------------------------------------------------------
const KEYWORD_TOP = 380;
const KEYWORD_MAX_H = 440;
const SUBTITLE_TOP = 1430;
const SUBTITLE_MAX_H = 180;

interface Shot {
  id: string;
  scene: number;
  in: number;
  out: number;
  text: string;
  /** the hard cut into this shot is the one accented turn of the piece */
  accent?: boolean;
}

const SHOTS: Shot[] = [
  { id: "1_1", scene: 1, in: 0.0, out: 4.86, text: "SUFRES MÁS\nDE LO NECESARIO" },
  { id: "2_1", scene: 2, in: 4.86, out: 9.1, text: "SE LLAMABA\nEPICTETO" },
  { id: "2_2", scene: 2, in: 9.1, out: 13.43, text: "UN SOLO ERROR" },
  { id: "3_1", scene: 3, in: 13.43, out: 18.91, text: "LO QUE\nDEPENDE DE TI" },
  { id: "3_2", scene: 3, in: 18.91, out: 25.04, text: "LO QUE NO" },
  { id: "4_1", scene: 4, in: 25.04, out: 29.0, text: "SU AMO LE TORCÍA\nLA PIERNA", accent: true },
  { id: "4_2", scene: 4, in: 29.0, out: 32.93, text: "“SI SIGUES,\nME LA VAS A ROMPER”" },
  { id: "4_3", scene: 4, in: 32.93, out: 37.24, text: "SU PIERNA.\nSU ELECCIÓN." },
  { id: "5_1", scene: 5, in: 37.24, out: 41.4, text: "“¿NO TE LO DIJE?”" },
  { id: "5_2", scene: 5, in: 41.4, out: 45.95, text: "SU REACCIÓN, SÍ" },
  { id: "6_1", scene: 6, in: 45.95, out: 50.3, text: "SOLO TE AGOTA A TI" },
  { id: "7_1", scene: 7, in: 50.3, out: 54.6, text: "¿DEPENDE DE MÍ?" },
  { id: "7_2", scene: 7, in: 54.6, out: 60.0, text: "UNA IDEA ESTOICA\nCADA SEMANA" },
];

export const TOTAL_FRAMES = Math.round(60.0 * FPS);

// --- Subtitles --------------------------------------------------------------
interface Word {
  text: string;
  startMs: number;
  endMs: number;
  scene: number;
}

interface Chunk {
  words: Word[];
  startMs: number;
  endMs: number;
}

/** Group words into <=3-word chunks, never spanning a scene boundary. */
function buildChunks(words: Word[]): Chunk[] {
  const chunks: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (!cur.length) return;
    chunks.push({ words: cur, startMs: cur[0].startMs, endMs: cur[cur.length - 1].endMs });
    cur = [];
  };
  for (const w of words) {
    if (cur.length && (cur[0].scene !== w.scene || cur.length >= 3)) flush();
    // a long gap means a new breath — start a fresh chunk
    if (cur.length && w.startMs - cur[cur.length - 1].endMs > 420) flush();
    cur.push(w);
  }
  flush();
  return chunks;
}

const CHUNKS = buildChunks(captionWords as Word[]);

const GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3"/><feColorMatrix type="saturate" values="0"/></filter><rect width="220" height="220" filter="url(#n)" opacity="0.5"/></svg>`
  );

// --- Layers -----------------------------------------------------------------

const ShotLayer: React.FC<{ shot: Shot }> = ({ shot }) => {
  const dur = shot.out - shot.in;
  // Shots longer than the 5s source are slowed rather than looped — on motion
  // this subtle the retime is invisible and a loop seam would not be.
  const playbackRate = dur > CLIP_SECONDS ? CLIP_SECONDS / dur : 1;
  return (
    <OffthreadVideo
      src={staticFile(`estoicismo/video/${shot.id}.mp4`)}
      playbackRate={playbackRate}
      muted
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        // the FLUX grade is already dark; this only deepens the falloff
        filter: "contrast(1.06) saturate(0.94) brightness(0.97)",
      }}
    />
  );
};

const Keyword: React.FC<{ shot: Shot }> = ({ shot }) => {
  const frame = useCurrentFrame();
  const dur = shot.out - shot.in;
  const inF = 0.16 * FPS;
  const holdOut = dur * FPS - 0.12 * FPS;

  // fast, blunt entrance — this piece cuts, it does not glide
  const rise = interpolate(frame, [inF, inF + (shot.accent ? 4 : 7)], [26, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const op = interpolate(frame, [inF, inF + (shot.accent ? 3 : 6)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [holdOut, holdOut + 3], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const track = interpolate(frame, [inF, inF + 14], [7, 1.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: KEYWORD_TOP,
        left: 70,
        width: 1080 - 140,
        maxHeight: KEYWORD_MAX_H,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        opacity: op * fadeOut,
        transform: `translateY(${rise}px)`,
      }}
    >
      <div
        style={{
          fontFamily: ANTON,
          fontSize: shot.text.length > 24 ? 78 : 94,
          lineHeight: 1.06,
          letterSpacing: track,
          color: "#F4F1EA",
          textAlign: "center",
          textTransform: "uppercase",
          whiteSpace: "pre-line",
          textShadow: "0 6px 34px rgba(0,0,0,0.92), 0 2px 8px rgba(0,0,0,0.8)",
        }}
      >
        {shot.text}
      </div>
    </div>
  );
};

const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const ms = (frame / FPS) * 1000;
  const chunk = CHUNKS.find((c) => ms >= c.startMs - 90 && ms <= c.endMs + 220);
  if (!chunk) return null;

  const op = interpolate(ms, [chunk.startMs - 90, chunk.startMs + 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: SUBTITLE_TOP,
        left: 80,
        width: 1080 - 160,
        maxHeight: SUBTITLE_MAX_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: op,
      }}
    >
      <div
        style={{
          fontFamily: INTER,
          fontWeight: 700,
          fontSize: 52,
          lineHeight: 1.25,
          textAlign: "center",
          color: "rgba(255,255,255,0.93)",
          textShadow: "0 3px 18px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.9)",
        }}
      >
        {chunk.words.map((w, i) => {
          const active = ms >= w.startMs && ms <= w.endMs + 60;
          return (
            <span
              key={i}
              style={{
                color: active ? "#FFFFFF" : "rgba(255,255,255,0.62)",
                marginRight: i === chunk.words.length - 1 ? 0 : 12,
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const Grade: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {/* vignette — pulls the eye to the centred sculpture */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 76% 58% at 50% 44%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.62) 100%)",
          pointerEvents: "none",
        }}
      />
      {/* text legibility scrims, scoped to the two bands only */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.10) 26%, rgba(0,0,0,0) 42%)",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.22) 16%, rgba(0,0,0,0) 32%)",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url("${GRAIN}")`,
          backgroundSize: "220px 220px",
          backgroundPosition: `${(frame * 13) % 220}px ${(frame * 7) % 220}px`,
          opacity: 0.055,
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />
    </>
  );
};

export const Estoicismo: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {SHOTS.map((shot) => {
        const from = Math.round(shot.in * fps);
        const to = Math.round(shot.out * fps);
        return (
          <Sequence key={shot.id} from={from} durationInFrames={to - from}>
            <ShotLayer shot={shot} />
          </Sequence>
        );
      })}

      <Grade />

      {SHOTS.map((shot) => {
        const from = Math.round(shot.in * fps);
        const to = Math.round(shot.out * fps);
        return (
          <Sequence key={`kw-${shot.id}`} from={from} durationInFrames={to - from}>
            <Keyword shot={shot} />
          </Sequence>
        );
      })}

      <Subtitles />

      <Audio src={staticFile("estoicismo/master.wav")} />
    </AbsoluteFill>
  );
};
