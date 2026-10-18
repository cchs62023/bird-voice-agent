import { PlaybackQueue } from "./playback";

// Implements the documented VoiceTransport contract, keeping the SDK's mic/STT
// and transcript handling while making actual playback observable and testable.
export class CharacterTransport {
  onopen?: () => void;
  onclose?: (info?: { code?: number; reason?: string; wasClean?: boolean }) => void;
  onerror?: (error?: unknown) => void;
  onmessage?: (data: string | ArrayBuffer | Blob) => void;
  private socket: WebSocket | null = null;
  private acceptingAudio = false;
  private audioGeneration = 0;
  private name: string;
  private playback: PlaybackQueue;
  private onInput: () => void;

  constructor(name: string, playback: PlaybackQueue, onInput: () => void) {
    this.name = name;
    this.playback = playback;
    this.onInput = onInput;
  }

  get connected() { return this.socket?.readyState === WebSocket.OPEN; }

  connect() {
    if (this.socket) return;
    const url = new URL(`/agents/bird-voice-agent/${encodeURIComponent(this.name)}`, location.href);
    url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("_pk", crypto.randomUUID());
    const socket = new WebSocket(url);
    socket.binaryType = "arraybuffer";
    this.socket = socket;
    socket.onopen = () => { if (this.socket === socket) this.onopen?.(); };
    socket.onclose = (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.resetPlayback(false);
      this.onclose?.({ code: event.code, reason: event.reason, wasClean: event.wasClean });
    };
    socket.onerror = (event) => { if (this.socket === socket) this.onerror?.(event); };
    socket.onmessage = (event: MessageEvent<string | ArrayBuffer | Blob>) => {
      if (this.socket !== socket) return;
      if (typeof event.data === "string") {
        let message: Record<string, unknown>;
        try { message = JSON.parse(event.data) as Record<string, unknown>; }
        catch { return; }
        if (message.type === "playback_interrupt" || message.type === "error") {
          this.resetPlayback(false);
        }
        if (message.type === "status" && message.status === "thinking") {
          this.resetPlayback(true);
        }
        if (message.type === "transcript" && message.role === "user") {
          this.resetPlayback(true);
          this.onInput();
        }
        // VoiceClient still processes status, transcript, history and errors.
        this.onmessage?.(event.data);
      } else if (this.acceptingAudio) {
        const generation = this.audioGeneration;
        if (event.data instanceof ArrayBuffer) this.playback.enqueue(event.data);
        else event.data.arrayBuffer().then((bytes) => {
          if (this.socket === socket && this.acceptingAudio && generation === this.audioGeneration) {
            this.playback.enqueue(bytes);
          }
        }).catch((error: unknown) => this.onerror?.(error));
      }
    };
  }

  sendJSON(message: Record<string, unknown>) {
    if (message.type === "start_call") this.resetPlayback(true);
    if (message.type === "end_call" || message.type === "interrupt") this.resetPlayback(false);
    if (this.connected) this.socket?.send(JSON.stringify(message));
  }

  sendBinary(data: ArrayBuffer) { if (this.connected) this.socket?.send(data); }

  resetPlayback(acceptAudio: boolean) {
    this.audioGeneration++;
    this.acceptingAudio = acceptAudio;
    this.playback.cancel();
  }

  disconnect() {
    this.resetPlayback(false);
    const socket = this.socket;
    this.socket = null;
    socket?.close();
  }
}
