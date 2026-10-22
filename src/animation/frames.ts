import type { CharacterId, CharacterPhase } from "../characters";

export const animationAssets = {
  sparrow: { atlas: "/characters/sparrow/animation-draft/listen-atlas.webp", durations: [2000, 90, 90, 100, 650, 55, 95, 55, 600, 100, 100, 1600] },
  pigeon: { atlas: "/characters/pigeon/animation-draft/listen-atlas.webp", durations: [1400, 75, 75, 90, 450, 50, 80, 50, 550, 90, 90, 1500] },
  "malayan-night-heron": { atlas: "/characters/malayan-night-heron/animation-draft/listen-atlas.webp", durations: [2600, 120, 120, 140, 900, 70, 130, 70, 1100, 140, 140, 2500] }
} as const;

export function animationClip(id: CharacterId, phase: CharacterPhase) {
  const durations = animationAssets[id].durations;
  if (phase === "idle") return { frames: [0], durations: [0], loopFrom: 0 };
  if (phase === "thinking") {
    return { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], durations: [100, 100, 100, 100, 1300, 70, 120, 70, 1700], loopFrom: 4 };
  }
  return {
    frames: Array.from({ length: 12 }, (_, n) => n),
    // Start the approved body gesture promptly during audible speech. This is
    // closed-beak body animation, not mouth or phoneme synchronization.
    durations: durations.map((ms, n) => phase === "speaking" ? (n === 0 || n === 11 ? 100 : Math.max(60, Math.round(ms * 0.75))) : ms),
    loopFrom: 0
  };
}

export interface AnimationScheduler {
  set(callback: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const browserScheduler: AnimationScheduler = {
  set: (callback, ms) => window.setTimeout(callback, ms),
  clear: (handle) => window.clearTimeout(handle as number)
};

export class SpriteTimeline {
  private phase: CharacterPhase = "idle";
  private frame = 0;
  private index = 0;
  private enabled = true;
  private disposed = false;
  private generation = 0;
  private handle: unknown = null;
  private id: CharacterId;
  private draw: (frame: number) => void;
  private scheduler: AnimationScheduler;

  constructor(id: CharacterId, draw: (frame: number) => void, scheduler = browserScheduler) {
    this.id = id; this.draw = draw; this.scheduler = scheduler;
    this.draw(0);
  }

  setPhase(phase: CharacterPhase) {
    if (this.disposed || this.phase === phase) return;
    this.phase = phase;
    this.restart();
  }

  setEnabled(enabled: boolean) {
    if (this.disposed || this.enabled === enabled) return;
    this.enabled = enabled;
    this.restart();
  }

  private restart() {
    this.cancel();
    if (!this.enabled || this.phase === "idle") {
      this.frame = 0; this.draw(0); return;
    }
    const clip = animationClip(this.id, this.phase);
    this.index = Math.max(0, clip.frames.indexOf(this.frame));
    this.frame = clip.frames[this.index];
    this.draw(this.frame);
    this.schedule();
  }

  private schedule() {
    const clip = animationClip(this.id, this.phase);
    const generation = this.generation;
    this.handle = this.scheduler.set(() => {
      if (this.disposed || !this.enabled || generation !== this.generation) return;
      this.handle = null;
      this.index = this.index + 1 < clip.frames.length ? this.index + 1 : clip.loopFrom;
      this.frame = clip.frames[this.index];
      this.draw(this.frame);
      this.schedule();
    }, clip.durations[this.index]);
  }

  private cancel() {
    this.generation++;
    if (this.handle !== null) this.scheduler.clear(this.handle);
    this.handle = null;
  }

  dispose() { this.cancel(); this.disposed = true; }
}
