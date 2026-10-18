import type { CharacterId } from "../characters";

export type PlaybackEvent = "playing" | "ended" | "cancelled" | "error";

export interface AudioHandle {
  play(): Promise<void>;
  stop(): void;
  release(): void;
  onPlaying(callback: () => void): void;
  onEnded(callback: () => void): void;
  onError(callback: () => void): void;
}

export function browserAudio(bytes: ArrayBuffer): AudioHandle {
  const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
  const audio = new Audio(url);
  return {
    play: () => audio.play(),
    stop: () => { audio.pause(); audio.removeAttribute("src"); audio.load(); },
    release: () => URL.revokeObjectURL(url),
    onPlaying: (callback) => audio.addEventListener("playing", callback),
    onEnded: (callback) => audio.addEventListener("ended", callback, { once: true }),
    onError: (callback) => audio.addEventListener("error", callback, { once: true })
  };
}

// Playback is a separate clock from text generation and server status messages.
export class PlaybackQueue {
  private queue: { bytes: ArrayBuffer; speaker: CharacterId | null }[] = [];
  private current: AudioHandle | null = null;
  private generation = 0;
  private _playing = false;
  private notify: (event: PlaybackEvent, speaker: CharacterId | null) => void;
  private create: (bytes: ArrayBuffer) => AudioHandle;

  constructor(notify: (event: PlaybackEvent, speaker: CharacterId | null) => void, create = browserAudio) {
    this.notify = notify;
    this.create = create;
  }

  get playing() { return this._playing; }
  get busy() { return this.current !== null || this.queue.length > 0; }

  enqueue(bytes: ArrayBuffer, speaker: CharacterId | null = null) {
    if (!bytes.byteLength) return;
    this.queue.push({ bytes, speaker });
    this.pump();
  }

  cancel() {
    this.generation++;
    this.queue = [];
    const audio = this.current;
    this.current = null;
    this._playing = false;
    audio?.stop();
    audio?.release();
    this.notify("cancelled", null);
  }

  private pump() {
    if (this.current) return;
    const item = this.queue.shift();
    if (!item) return;
    const generation = this.generation;
    const audio = this.create(item.bytes);
    this.current = audio;
    const valid = () => generation === this.generation && this.current === audio;
    const finish = (event: "ended" | "error") => {
      if (!valid()) return;
      this.current = null;
      this._playing = false;
      audio.stop();
      audio.release();
      if (event === "error") this.queue = [];
      this.notify(event, item.speaker);
      this.pump();
    };
    audio.onPlaying(() => {
      if (!valid()) return;
      this._playing = true;
      this.notify("playing", item.speaker);
    });
    audio.onEnded(() => finish("ended"));
    audio.onError(() => finish("error"));
    audio.play().catch(() => finish("error"));
  }
}
