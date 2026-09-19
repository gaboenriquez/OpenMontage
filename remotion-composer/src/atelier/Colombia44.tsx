/**
 * "Colombia 44%" — composición atelier, escrita a mano para esta pieza.
 *
 * Dirección de arte: dossier forense. Ver projects/colombia-44-por-ciento/art-direction.md
 * Plan por escena:                    projects/colombia-44-por-ciento/scenes.md
 *
 * Deliberadamente NO usa el catálogo de scene-types (text_card, stat_card, bar_chart):
 * el sujeto de cada plano es una grabación real del informe del WEF, y las tarjetas
 * de catálogo recrearían con gráficos lo que el documento ya prueba por sí mismo.
 *
 * Contrato de bandas (por eso las capas de texto nunca se pisan):
 *   RÓTULO   y 120 → 520
 *   EVIDENCIA y 540 → 1540
 *   CITA      y 1548 → 1596   (monoespaciada, izquierda)
 *   SUBTÍTULO y 1620 → 1810
 */

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Freeze,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import captionWords from "./colombia44Captions.json";

const { fontFamily: ANTON } = loadAnton();
const { fontFamily: INTER } = loadInter();
const { fontFamily: MONO } = loadMono();

export const FPS = 30;
export const TOTAL_FRAMES = 50 * FPS; // 1500

// --- Paleta (tomada del propio documento) -----------------------------------
const GROUND = "#0A0A0B";
const PAPER = "#F4F2ED";
const NAVY = "#1B2A5B";
const MARKER = "#F2C230";
const ALARM = "#C2321F";
const MUTED = "#6B6A66";

// --- Bandas -----------------------------------------------------------------
const LABEL_TOP = 120;
const LABEL_H = 400;
const EV_TOP = 540;
const EV_H = 1000;
const CITE_TOP = 1548;
const SUB_TOP = 1620;

// Slow-in / slow-out real. Nunca lineal — ver art-direction.md.
const EASE = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Empuje con easing cúbico entre dos estados de encuadre. */
const push = (
  frame: number,
  span: number,
  from: { s: number; x: number; y: number },
  to: { s: number; x: number; y: number },
) => {
  const t = EASE(Math.min(1, Math.max(0, frame / Math.max(1, span))));
  return {
    s: from.s + (to.s - from.s) * t,
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
};

// ---------------------------------------------------------------------------
// Evidencia — la grabación real dentro de su rectángulo
// ---------------------------------------------------------------------------

interface EvidenceProps {
  src: string;
  /** segundo del clip fuente donde empieza este plano */
  startAt: number;
  /** ancho nativo del clip ya recortado a su caja de contenido */
  nativeW: number;
  nativeH: number;
  /** encuadre: escala relativa al ajuste-por-ancho, y foco normalizado 0..1 */
  from: { s: number; x: number; y: number };
  to?: { s: number; x: number; y: number };
  /** frames que dura el empuje (por defecto, todo el plano) */
  pushFrames?: number;
  durationInFrames: number;
  playbackRate?: number;
  /** atenuación: la escena 6 usa la tabla como fondo, no como sujeto */
  dim?: number;
  bleed?: boolean;
  /** escena 7: la captura del chat en oscuro se imprime en claro (inversión tonal) */
  invert?: boolean;
}

const Evidence: React.FC<EvidenceProps> = ({
  src,
  startAt,
  nativeW,
  nativeH,
  from,
  to,
  pushFrames,
  durationInFrames,
  playbackRate = 1,
  dim = 0,
  bleed = false,
  invert = false,
}) => {
  const frame = useCurrentFrame();
  const boxTop = bleed ? 0 : EV_TOP;
  const boxH = bleed ? 1920 : EV_H;
  const fitScale = 1080 / nativeW;
  const st = to ? push(frame, pushFrames ?? durationInFrames, from, to) : from;

  // El foco (x,y) es el punto del clip fuente que queremos en el centro del recuadro.
  const scale = fitScale * st.s;
  const dispW = nativeW * scale;
  const dispH = nativeH * scale;
  const left = 1080 / 2 - st.x * dispW;
  const top = boxH / 2 - st.y * dispH;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: boxTop,
          left: 0,
          width: 1080,
          height: boxH,
          overflow: "hidden",
          background: GROUND,
          filter: invert ? "invert(1) hue-rotate(180deg)" : undefined,
        }}
      >
        <div style={{ position: "absolute", left, top, width: dispW, height: dispH }}>
          <OffthreadVideo
            src={staticFile(src)}
            startFrom={Math.round(startAt * FPS)}
            playbackRate={playbackRate}
            muted
            style={{ width: "100%", height: "100%", objectFit: "fill" }}
          />
        </div>
        {dim > 0 ? (
          <AbsoluteFill style={{ background: GROUND, opacity: dim }} />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Rótulo — anticipación de 3 frames, luego asentado. Corte duro a la salida.
// ---------------------------------------------------------------------------

const Label: React.FC<{
  lines: string[];
  /** frame local en el que entra */
  at?: number;
  color?: string;
  accent?: string;
  /** índice de la línea que va en color de acento */
  accentLine?: number;
  size?: number;
  align?: "left" | "center";
}> = ({ lines, at = 0, color = PAPER, accent, accentLine, size = 116, align = "left" }) => {
  const frame = useCurrentFrame() - at;
  if (frame < 0) return null;
  // anticipación: se contrae 3 frames antes de asentarse
  const anticip = frame < 3 ? interpolate(frame, [0, 3], [0.94, 1.02]) : undefined;
  const settle =
    anticip ?? interpolate(Math.min(frame, 10), [3, 10], [1.02, 1], { extrapolateLeft: "clamp" });
  const op = interpolate(Math.min(frame, 5), [0, 5], [0, 1]);

  return (
    <div
      style={{
        position: "absolute",
        top: LABEL_TOP,
        left: 0,
        width: 1080,
        height: LABEL_H,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: align === "left" ? "flex-start" : "center",
        padding: "0 64px",
        opacity: op,
        transform: `scale(${settle})`,
        transformOrigin: align === "left" ? "left bottom" : "center bottom",
      }}
    >
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            fontFamily: ANTON,
            fontSize: size,
            lineHeight: 0.94,
            letterSpacing: "-0.01em",
            color: accentLine === i && accent ? accent : color,
            textTransform: "uppercase",
            fontVariantNumeric: "tabular-nums",
            textShadow: "0 6px 40px rgba(0,0,0,0.85)",
          }}
        >
          {l}
        </div>
      ))}
    </div>
  );
};

/** Sello de anexo: la fuente exacta, monoespaciada, abajo a la izquierda. */
const Cite: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      top: CITE_TOP,
      left: 64,
      fontFamily: MONO,
      fontSize: 26,
      letterSpacing: "0.06em",
      color: MUTED,
    }}
  >
    {text}
  </div>
);

/** Cabecera persistente del documento. Nunca compite con el rótulo. */
const DocHeader: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 56,
      left: 64,
      fontFamily: MONO,
      fontSize: 24,
      letterSpacing: "0.14em",
      color: MUTED,
      textTransform: "uppercase",
    }}
  >
    Future of Jobs Report 2025 · World Economic Forum
  </div>
);

// ---------------------------------------------------------------------------
// Dispositivo de firma — el barrido del resaltador (escenas 1 y 5 únicamente)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MarkerSweep: React.FC<{
  at: number;
  top: number;
  height: number;
  durationInFrames?: number;
}> = ({ at, top, height, durationInFrames = 18 }) => {
  const frame = useCurrentFrame() - at;
  if (frame < 0) return null;
  const w = interpolate(EASE(Math.min(1, frame / durationInFrames)), [0, 1], [0, 1080]);
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        width: w,
        height,
        background: MARKER,
        mixBlendMode: "multiply",
        opacity: 0.55,
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Subtítulos palabra por palabra
// ---------------------------------------------------------------------------

interface Word {
  text: string;
  startMs: number;
  endMs: number;
}

const CHUNK_MS = 1400;

const chunks: Word[][] = (() => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of captionWords as Word[]) {
    if (cur.length && (w.startMs - cur[0].startMs > CHUNK_MS || cur.length >= 4)) {
      out.push(cur);
      cur = [];
    }
    cur.push(w);
  }
  if (cur.length) out.push(cur);
  return out;
})();

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const ms = (frame / FPS) * 1000;
  const chunk = chunks.find((c) => ms >= c[0].startMs && ms < c[c.length - 1].endMs);
  if (!chunk) return null;
  // la escena 7 invierte el valor tonal: el subtítulo tiene que invertirse con ella
  const onPaper = frame >= 1320;
  const idle = onPaper ? GROUND : PAPER;
  const shadow = onPaper ? "none" : "0 3px 18px rgba(0,0,0,0.9)";
  return (
    <div
      style={{
        position: "absolute",
        top: SUB_TOP,
        left: 0,
        width: 1080,
        height: 190,
        display: "flex",
        flexWrap: "wrap",
        gap: "0 16px",
        justifyContent: "center",
        alignContent: "center",
        padding: "0 70px",
      }}
    >
      {chunk.map((w, i) => {
        const on = ms >= w.startMs && ms < w.endMs;
        return (
          <span
            key={i}
            style={{
              fontFamily: INTER,
              fontWeight: 800,
              fontSize: 56,
              lineHeight: 1.15,
              color: on ? GROUND : idle,
              background: on ? MARKER : "transparent",
              padding: on ? "2px 12px" : "2px 0",
              borderRadius: 6,
              textShadow: on ? "none" : shadow,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Escena 6 — las cifras extraídas de la tabla como tipografía
// ---------------------------------------------------------------------------

const RISERS: { n: string; label: string; at: number }[] = [
  { n: "+87", label: "IA y big data", at: 24 },
  { n: "+70", label: "Ciberseguridad", at: 66 },
  { n: "+68", label: "Alfabetización tecnológica", at: 104 },
  { n: "+66", label: "Pensamiento creativo", at: 172 },
  { n: "+61", label: "Curiosidad", at: 216 },
];

const Risers: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top: 620,
        left: 64,
        width: 952,
        display: "flex",
        flexDirection: "column",
        gap: 26,
      }}
    >
      {RISERS.map((r, i) => {
        const f = frame - r.at;
        if (f < 0) return null;
        const op = interpolate(Math.min(f, 6), [0, 6], [0, 1]);
        const dx = interpolate(EASE(Math.min(1, f / 10)), [0, 1], [-40, 0]);
        // las dos últimas no son técnicas — el guion cambia de tono ahí
        const soft = i >= 3;
        return (
          <div
            key={r.n}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 28,
              opacity: op,
              transform: `translateX(${dx}px)`,
            }}
          >
            <span
              style={{
                fontFamily: ANTON,
                fontSize: soft ? 104 : 92,
                color: soft ? MARKER : PAPER,
                fontVariantNumeric: "tabular-nums",
                textShadow: "0 6px 40px rgba(0,0,0,0.9)",
              }}
            >
              {r.n}
            </span>
            <span
              style={{
                fontFamily: INTER,
                fontWeight: 700,
                fontSize: 42,
                color: soft ? PAPER : MUTED,
                textShadow: "0 3px 20px rgba(0,0,0,0.9)",
              }}
            >
              {r.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Composición
// ---------------------------------------------------------------------------

const PDF_W = 1416;
const PDF_H = 1486;
const CHAT_W = 1148;
const CHAT_H = 1504;

export interface Colombia44Props {
  /** narración grabada por el usuario; ausente mientras no llegue el audio */
  narrationSrc?: string | null;
}

export const Colombia44: React.FC<Colombia44Props> = ({ narrationSrc = null }) => {
  return (
    <AbsoluteFill style={{ background: GROUND }}>
      {narrationSrc ? <Audio src={staticFile(narrationSrc)} /> : null}

      {/* ---- 1 · HOOK — la tabla entera como objeto  (0:00–0:04) ---- */}
      <Sequence from={0} durationInFrames={120}>
        <Evidence
          src="colombia44/fig32.mp4"
          startAt={0.3}
          nativeW={PDF_W}
          nativeH={PDF_H}
          from={{ s: 1.15, x: 0.44, y: 0.30 }}
          to={{ s: 1.21, x: 0.44, y: 0.29 }}
          durationInFrames={120}
        />
        <DocHeader />
        <Label lines={["Colombia", "3.º del mundo"]} at={10} accent={MARKER} accentLine={1} />
        <Cite text="Fig. 3.2 · p. 34 de 290" />
      </Sequence>

      {/* ---- 2 · PRUEBA — dos números enfrentados  (0:04–0:09) ---- */}
      <Sequence from={120} durationInFrames={150}>
        <Evidence
          src="colombia44/fig32.mp4"
          startAt={3.3}
          nativeW={PDF_W}
          nativeH={PDF_H}
          from={{ s: 1.05, x: 0.47, y: 0.40 }}
          to={{ s: 1.18, x: 0.47, y: 0.40 }}
          durationInFrames={150}
        />
        <DocHeader />
        <Label lines={["Colombia 44%", "Mundo 39%"]} at={6} accent={MARKER} accentLine={0} />
        <Cite text="Fig. 3.2 · p. 34 de 290" />
      </Sequence>

      {/* ---- 3 · MÉTODO — el documento, luego la conversación  (0:09–0:15) ---- */}
      <Sequence from={270} durationInFrames={66}>
        <Evidence
          src="colombia44/portada.mp4"
          startAt={0.6}
          nativeW={PDF_W}
          nativeH={PDF_H}
          from={{ s: 1.0, x: 0.5, y: 0.42 }}
          durationInFrames={66}
        />
        <Label lines={["290 páginas"]} at={4} size={132} />
        <Cite text="Página 1 de 290" />
      </Sequence>
      <Sequence from={336} durationInFrames={114}>
        <Evidence
          src="colombia44/prompt.mp4"
          startAt={0.5}
          nativeW={CHAT_W}
          nativeH={CHAT_H}
          from={{ s: 1.1, x: 0.5, y: 0.42 }}
          to={{ s: 1.2, x: 0.5, y: 0.5 }}
          durationInFrames={114}
        />
        <Label lines={["No las leí"]} at={2} size={132} accent={MARKER} accentLine={0} />
        <Cite text="claude.ai · prompt completo" />
      </Sequence>

      {/* ---- 4 · HALLAZGO — la lista como río vertical  (0:15–0:26) ---- */}
      <Sequence from={450} durationInFrames={66}>
        <Evidence
          src="colombia44/fig34_full.mp4"
          startAt={0.2}
          nativeW={PDF_W}
          nativeH={PDF_H}
          from={{ s: 1.06, x: 0.5, y: 0.45 }}
          durationInFrames={66}
        />
        <Label lines={["26 habilidades"]} at={4} size={122} />
        <Cite text="Fig. 3.4 · p. 37 de 290" />
      </Sequence>
      <Sequence from={516} durationInFrames={111}>
        <Evidence
          src="colombia44/fig34_lista.mp4"
          startAt={0.15}
          nativeW={PDF_W}
          nativeH={PDF_H}
          from={{ s: 1.45, x: 0.35, y: 0.5 }}
          durationInFrames={111}
        />
        <Cite text="Fig. 3.4 · p. 37 de 290" />
      </Sequence>
      <Sequence from={627} durationInFrames={72}>
        <Evidence
          src="colombia44/fig34_full.mp4"
          startAt={2.6}
          nativeW={PDF_W}
          nativeH={PDF_H}
          from={{ s: 1.9, x: 0.74, y: 0.38 }}
          durationInFrames={72}
        />
        <Cite text="Fig. 3.4 · columna «Net increase»" />
      </Sequence>
      <Sequence from={699} durationInFrames={81}>
        <Evidence
          src="colombia44/fig34_fondo.mp4"
          startAt={0.2}
          nativeW={PDF_W}
          nativeH={PDF_H}
          from={{ s: 1.0, x: 0.5, y: 0.55 }}
          durationInFrames={81}
        />
        <Label lines={["Solo 2", "pierden valor"]} at={2} accent={ALARM} accentLine={1} />
        <Cite text="Fig. 3.4 · p. 37 de 290" />
      </Sequence>

      {/* ---- 5 · GIRO — el resaltado se despega  (0:26–0:34) ---- */}
      <Sequence from={780} durationInFrames={195}>
        <Evidence
          src="colombia44/fig34_fondo.mp4"
          startAt={3.2}
          nativeW={PDF_W}
          nativeH={PDF_H}
          from={{ s: 1.06, x: 0.5, y: 0.70 }}
          to={{ s: 1.38, x: 0.585, y: 0.735 }}
          pushFrames={70}
          durationInFrames={195}
        />
        <Label
          lines={["Lectura, escritura", "y matemáticas", "−4"]}
          at={92}
          size={98}
          accent={ALARM}
          accentLine={2}
        />
        <Cite text="Fig. 3.4 · p. 37 de 290" />
      </Sequence>
      {/* el beat de silencio: la imagen se congela por completo medio segundo */}
      <Sequence from={975} durationInFrames={45}>
        <Freeze frame={194}>
          <Evidence
            src="colombia44/fig34_fondo.mp4"
            startAt={3.2}
            nativeW={PDF_W}
            nativeH={PDF_H}
            from={{ s: 1.3, x: 0.5, y: 0.36 }}
            to={{ s: 1.92, x: 0.46, y: 0.4 }}
            pushFrames={70}
            durationInFrames={195}
          />
        </Freeze>
        <div
          style={{
            position: "absolute",
            top: LABEL_TOP,
            left: 64,
            fontFamily: ANTON,
            fontSize: 98,
            lineHeight: 0.94,
            color: PAPER,
            textTransform: "uppercase",
            textShadow: "0 6px 40px rgba(0,0,0,0.85)",
          }}
        >
          <div>Lectura, escritura</div>
          <div>y matemáticas</div>
          <div style={{ color: ALARM }}>−4</div>
        </div>
        <Cite text="Fig. 3.4 · p. 37 de 290" />
      </Sequence>

      {/* ---- 6 · CONTRASTE — las cifras como tipografía  (0:34–0:44) ---- */}
      <Sequence from={1020} durationInFrames={300}>
        <Evidence
          src="colombia44/fig34_full.mp4"
          startAt={2.5}
          nativeW={PDF_W}
          nativeH={PDF_H}
          from={{ s: 1.34, x: 0.60, y: 0.48 }}
          to={{ s: 1.22, x: 0.55, y: 0.46 }}
          durationInFrames={300}
          playbackRate={0.45}
          dim={0.62}
          bleed
        />
        <div
          style={{
            position: "absolute",
            top: 300,
            left: 64,
            fontFamily: INTER,
            fontWeight: 800,
            fontSize: 44,
            letterSpacing: "0.02em",
            color: MUTED,
            textTransform: "uppercase",
          }}
        >
          El otro extremo de la tabla
        </div>
        <Risers />
        <Cite text="Fig. 3.4 · «Net increase» · p. 37" />
      </Sequence>

      {/* ---- 7 · CIERRE — inversión tonal completa  (0:44–0:50) ---- */}
      <Sequence from={1320} durationInFrames={180}>
        <AbsoluteFill style={{ background: PAPER }} />
        <Evidence
          src="colombia44/respuesta.mp4"
          startAt={6.0}
          nativeW={CHAT_W}
          nativeH={CHAT_H}
          from={{ s: 1.38, x: 0.5, y: 0.42 }}
          to={{ s: 1.46, x: 0.5, y: 0.46 }}
          durationInFrames={180}
          bleed
          invert
        />
        <AbsoluteFill
          style={{
            background: `linear-gradient(180deg, ${PAPER} 0%, ${PAPER} 24%, rgba(244,242,237,0) 38%, rgba(244,242,237,0) 58%, ${PAPER} 66%, ${PAPER} 100%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 150,
            left: 64,
            width: 952,
            fontFamily: ANTON,
            fontSize: 104,
            lineHeight: 0.96,
            color: GROUND,
            textTransform: "uppercase",
          }}
        >
          <div>290 páginas.</div>
          <div>Cuatro minutos.</div>
        </div>
        <div
          style={{
            position: "absolute",
            top: 1300,
            left: 64,
            width: 952,
            fontFamily: ANTON,
            fontSize: 76,
            lineHeight: 1.0,
            color: GROUND,
            textTransform: "uppercase",
          }}
        >
          El prompt completo
          <div style={{ color: NAVY }}>→ siguiente video</div>
        </div>
      </Sequence>

      {/* subtítulos por encima de todo, siempre en la misma banda */}
      <Captions />
    </AbsoluteFill>
  );
};
