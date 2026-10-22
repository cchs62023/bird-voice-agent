// Only the SDK boundary is mocked. State/playback/transport use production code.
export class VoiceClient {
  static instances = [];
  constructor(options) {
    this.options = options;
    this.listeners = new Map();
    VoiceClient.instances.push(this);
  }
  addEventListener(event, listener) {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }
  emit(event, data) { for (const listener of this.listeners.get(event) ?? []) listener(data); }
  connect() { this.emit("connectionchange", true); }
  disconnect() { this.emit("connectionchange", false); }
  async startCall() { this.emit("statuschange", "listening"); }
  endCall() { this.emit("statuschange", "idle"); }
  toggleMute() { this.emit("mutechange", true); }
}
