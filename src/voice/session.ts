import { VoiceClient } from "@cloudflare/voice/client";
import { characterFromSession, type CharacterId, type CharacterPhase } from "../characters";
import { PlaybackQueue, type AudioHandle } from "./playback";
import { CharacterTransport } from "./transport";

export type Message = { role: string; text: string };
export type SessionSnapshot = {
  phase: CharacterPhase; connected: boolean; active: boolean; starting: boolean;
  muted: boolean; error: string | null; interim: string | null; messages: Message[];
  speaker: CharacterId | null;
};

export class CharacterSession {
  private snapshot: SessionSnapshot = {
    phase: "idle", connected: false, active: false, starting: false,
    muted: false, error: null, interim: null, messages: [], speaker: null
  };
  private listeners = new Set<() => void>();
  private client: VoiceClient;
  private playback: PlaybackQueue;
  private transport: CharacterTransport;
  private generation = 0;
  private interruptChunks = 0;

  constructor(name: string, createAudio?: (bytes: ArrayBuffer) => AudioHandle) {
    const character = characterFromSession(name);
    this.playback = new PlaybackQueue((event, speaker) => {
      if (event === "playing" && this.snapshot.active) this.update({ phase: "speaking", speaker: speaker ?? character });
      else if (event === "error") {
        this.stop();
        this.update({ error: "聲音無法播放。請點重試，並確認瀏覽器允許播放聲音。" });
      } else this.update({ phase: "idle", speaker: null });
    }, createAudio);
    this.transport = new CharacterTransport(name, this.playback, () => {
      if (this.snapshot.active) this.update({ phase: "thinking", speaker: null });
    });
    this.client = new VoiceClient({ agent: "BirdVoiceAgent", name, transport: this.transport });
    this.client.addEventListener("connectionchange", (connected) => {
      this.update({ connected });
      if (!connected && this.snapshot.active) {
        this.stop();
        this.update({ error: "連線已中斷，請重試。" });
      }
    });
    this.client.addEventListener("statuschange", (phase) => {
      if (!this.snapshot.active) return;
      // Server 'speaking' means bytes were sent, not that a speaker played them.
      if (phase === "thinking" && !this.playback.busy) this.update({ phase: "thinking", speaker: null });
      if (phase === "listening" && !this.playback.busy && !this.snapshot.muted) this.update({ phase: "listening", speaker: null });
      if (phase === "idle") this.stop();
    });
    this.client.addEventListener("transcriptchange", (messages) => {
      this.update({ messages: messages.map(({ role, text }) => ({ role, text })) });
    });
    this.client.addEventListener("interimtranscript", (interim) => {
      this.update({ interim });
      if (interim && this.snapshot.active && !this.snapshot.muted && !this.playback.busy) this.update({ phase: "listening", speaker: null });
    });
    this.client.addEventListener("mutechange", (muted) => {
      this.update({ muted });
      if (this.snapshot.active && !this.playback.busy && this.snapshot.phase !== "thinking") this.update({ phase: muted ? "idle" : "listening", speaker: null });
    });
    this.client.addEventListener("error", (error) => {
      if (error) { this.stop(); this.update({ error }); }
    });
    this.client.addEventListener("audiolevelchange", (level) => {
      if (!this.snapshot.active || this.snapshot.muted) return;
      if (this.playback.playing && level > 0.05) {
        if (++this.interruptChunks >= 2) {
          this.transport.sendJSON({ type: "interrupt" });
          this.interruptChunks = 0;
          this.update({ phase: "idle", speaker: null });
        }
      } else {
        this.interruptChunks = 0;
        if (level > 0.04 && !this.playback.busy && this.snapshot.phase !== "thinking") {
          this.update({ phase: "listening", speaker: null });
        }
      }
    });
  }

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private update(patch: Partial<SessionSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  connect() { this.client.connect(); }

  async start() {
    if (this.snapshot.starting || this.snapshot.active) return;
    if (!this.snapshot.connected) { this.update({ error: "尚未連線，請點重試。" }); return; }
    const generation = ++this.generation;
    this.update({ active: true, starting: true, error: null, phase: this.snapshot.muted ? "idle" : "listening", speaker: null });
    try {
      await this.client.startCall();
      if (generation !== this.generation) { this.client.endCall(); return; }
      this.update({ starting: false });
    } catch (error) {
      if (generation !== this.generation) return;
      this.stop();
      this.update({ error: error instanceof Error ? error.message : "無法啟動麥克風。" });
    }
  }

  stop() {
    this.generation++;
    this.update({ active: false, starting: false, phase: "idle", interim: null, speaker: null });
    this.transport.resetPlayback(false);
    this.client.endCall();
    this.interruptChunks = 0;
  }

  toggleMute() { this.client.toggleMute(); }
  retry() { this.disconnect(); this.update({ error: null }); this.connect(); }
  disconnect() { this.stop(); this.client.disconnect(); this.update({ connected: false }); }
}
