import { useEffect, useRef, useState } from "react";
import type { CharacterId, CharacterPhase } from "../characters";
import { animationAssets, SpriteTimeline } from "./frames";
import { drawBirdFrame } from "./draw";

export function BirdSprite({ id, phase, name, fallback, unavailableText }: { unavailableText: string; id: CharacterId; phase: CharacterPhase; name: string; fallback: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const timeline = useRef<SpriteTimeline | null>(null);
  const latestPhase = useRef(phase);
  latestPhase.current = phase;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const visibility = () => timeline.current?.setEnabled(!document.hidden && !media.matches);
    setLoaded(false); setFailed(false);
    image.onload = () => {
      const context = canvas.current?.getContext("2d");
      if (cancelled || !context) return;
      if (image.naturalWidth % 4 !== 0 || image.naturalHeight * 4 !== image.naturalWidth * 3) {
        setFailed(true); return;
      }
      const player = new SpriteTimeline(id, (frame) => drawBirdFrame(context, image, frame, id));
      timeline.current = player;
      visibility();
      player.setPhase(latestPhase.current);
      setLoaded(true);
    };
    image.onerror = () => { if (!cancelled) setFailed(true); };
    image.src = animationAssets[id].atlas;
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", visibility);
    return () => {
      cancelled = true;
      timeline.current?.dispose(); timeline.current = null;
      image.onload = null; image.onerror = null;
      document.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", visibility);
    };
  }, [id]);

  useEffect(() => { timeline.current?.setPhase(phase); }, [phase]);

  return <>
    {!loaded && <img className="bird-sprite-fallback" src={fallback} alt={name} />}
    <canvas ref={canvas} width={384} height={384} className="bird-sprite" hidden={!loaded} role="img" aria-label={name} data-character={id} data-phase={phase} />
    {failed && <span className="animation-unavailable">{unavailableText}</span>}
  </>;
}
