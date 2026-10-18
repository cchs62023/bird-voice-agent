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
  private queue: ArrayBuffer[] = [];
  private current: AudioHandle | null = null;
  private generation = 0;
  private _playing = false;
  private notify: (event: PlaybackEvent) => void;
  private create: (bytes: ArrayBuffer) => AudioHandle;

  constructor(notify: (event: PlaybackEvent) => void, create = browserAudio) {
    this.notify = notify;
    this.create = create;
  }

  get playing() { return this._playing; }

  enqueue(bytes: ArrayBuffer) {
    if (!bytes.byteLength) return;
    this.queue.push(bytes);
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
    this.notify("cancelled");
  }

  private pump() {
    if (this.current) return;
    const bytes = this.queue.shift();
    if (!bytes) return;
    const generation = this.generation;
    const audio = this.create(bytes);
    this.current = audio;
    const valid = () => generation === this.generation && this.current === audio;
    const finish = (event: "ended" | "error") => {
      if (!valid()) return;
      this.current = null;
      this._playing = false;
      audio.stop();
      audio.release();
      if (event === "error") this.queue = [];
      this.notify(event);
      this.pump();
    };
    audio.onPlaying(() => {
      if (!valid()) return;
      this._playing = true;
      this.notify("playing");
    });
    audio.onEnded(() => finish("ended"));
    audio.onError(() => finish("error"));
    audio.play().catch(() => finish("error"));
  }
}
