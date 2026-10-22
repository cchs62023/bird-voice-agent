import type { CharacterId } from "../characters";

export function drawBirdFrame(context: CanvasRenderingContext2D, image: HTMLImageElement, frame: number, id: CharacterId, size = 384) {
  const cell = image.naturalWidth / 4;
  context.clearRect(0, 0, size, size);
  context.drawImage(image, (frame % 4) * cell, Math.floor(frame / 4) * cell, cell, cell, 0, 0, size, size);
  if (id === "malayan-night-heron" && frame !== 0) {
    // Keep Sage's approved planted feet exact even after lossy atlas encoding.
    const y = size * (256 / 384);
    context.save();
    context.beginPath();
    context.rect(0, y, size, size - y);
    context.clip();
    context.clearRect(0, 0, size, size);
    context.drawImage(image, 0, 0, cell, cell, 0, 0, size, size);
    context.restore();
  }
}
