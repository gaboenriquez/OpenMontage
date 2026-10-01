import { Composition } from "remotion";
import { Film, FILM_FRAMES } from "./Film";

export const Root = () => (
  <Composition id="Film" component={Film} width={1920} height={1080} fps={30} durationInFrames={FILM_FRAMES} />
);
