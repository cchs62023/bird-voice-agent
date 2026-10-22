import test from "node:test";
import assert from "node:assert/strict";
import { VoiceClient } from "./voice-client.fake.mjs";
import { CharacterSession } from "../src/voice/session.ts";
import { encodeCharacterAudio } from "../src/voice/audio-envelope.ts";

test("real queue events gate group speaking, buffering, interruption and stale playback", async () => {
  const oldSocket = globalThis.WebSocket, oldLocation = globalThis.location;
  const sockets = [], handles = [];
  class Socket {
    static OPEN = 1;
    readyState = 1;
    constructor() { sockets.push(this); }
    send() {}
    close() { this.readyState = 3; }
  }
  globalThis.WebSocket = Socket; globalThis.location = new URL("http://localhost:5173");
  let session;
  try {
    session = new CharacterSession("characters-group-v1--browser--group", () => {
      const h = { play: async () => {}, stop() {}, release() {}, onPlaying(fn) { this.playing = fn; }, onEnded(fn) { this.ended = fn; }, onError(fn) { this.error = fn; } };
      handles.push(h); return h;
    });
    const client = VoiceClient.instances.at(-1), transport = client.options.transport;
    // Only the SDK event boundary is faked. Wire decoding, queue and session are production code.
    transport.onmessage = raw => { const m = JSON.parse(raw); if (m.type === "status") client.emit("statuschange", m.status); };
    client.startCall = async () => { transport.sendJSON({ type: "start_call" }); client.emit("statuschange", "listening"); };
    transport.connect(); session.connect(); await session.start();
    assert.equal(session.getSnapshot().phase, "listening");
    const socket = sockets[0], status = value => socket.onmessage({ data: JSON.stringify({ type: "status", status: value }) });
    status("thinking"); status("speaking");
    assert.equal(session.getSnapshot().phase, "thinking");
    socket.onmessage({ data: encodeCharacterAudio(new ArrayBuffer(8), "sparrow") });
    status("listening"); // The server is ready, but the speaker has not started.
    assert.equal(session.getSnapshot().phase, "thinking");
    handles[0].playing();
    assert.equal(session.getSnapshot().phase, "speaking");
    assert.equal(session.getSnapshot().speaker, "sparrow");
    socket.onmessage({ data: encodeCharacterAudio(new ArrayBuffer(8), "malayan-night-heron") });
    assert.equal(session.getSnapshot().speaker, "sparrow");
    handles[0].ended(); assert.equal(session.getSnapshot().phase, "idle");
    handles[1].playing(); assert.equal(session.getSnapshot().speaker, "malayan-night-heron");
    client.emit("audiolevelchange", 0.1); client.emit("audiolevelchange", 0.1);
    assert.equal(session.getSnapshot().phase, "idle");
    assert.equal(session.getSnapshot().speaker, null);
    handles[1].playing(); assert.equal(session.getSnapshot().phase, "idle");
    client.emit("interimtranscript", "Hello"); assert.equal(session.getSnapshot().phase, "listening");
    session.toggleMute(); assert.equal(session.getSnapshot().phase, "idle");
    session.stop(); handles[0].playing();
    assert.equal(session.getSnapshot().active, false);
    assert.equal(session.getSnapshot().phase, "idle");
    await session.start();
    assert.equal(session.getSnapshot().phase, "idle"); // Muting persists across calls.
    client.emit("mutechange", false);
    socket.onmessage({ data: encodeCharacterAudio(new ArrayBuffer(8), "pigeon") });
    handles[2].playing();
    handles[2].error();
    assert.equal(session.getSnapshot().active, false);
    assert.equal(session.getSnapshot().phase, "idle");
    assert.ok(session.getSnapshot().error);
    handles[2].playing();
    assert.equal(session.getSnapshot().speaker, null);
  } finally {
    session?.disconnect(); globalThis.WebSocket = oldSocket;
    if (oldLocation === undefined) delete globalThis.location; else globalThis.location = oldLocation;
  }
});
