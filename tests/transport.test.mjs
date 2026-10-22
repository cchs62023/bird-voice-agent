import test from "node:test";
import assert from "node:assert/strict";
import { CharacterTransport } from "../src/voice/transport.ts";

test("each transport addresses its own agent; interrupt rejects late audio", () => {
  const oldSocket = globalThis.WebSocket, oldLocation = globalThis.location;
  const sockets = [];
  class FakeSocket {
    static OPEN = 1;
    readyState = 1;
    sent = [];
    constructor(url) { this.url = String(url); sockets.push(this); }
    send(data) { this.sent.push(data); }
    close() { this.readyState = 3; }
  }
  globalThis.WebSocket = FakeSocket;
  globalThis.location = new URL("http://localhost:5173");
  try {
    const events = [];
    const playback = { cancel: () => events.push("cancel"), enqueue: () => events.push("audio") };
    const transport = new CharacterTransport("characters-v1--browser--sparrow", playback, () => events.push("input"));
    transport.connect();
    assert.match(sockets[0].url, /bird-voice-agent\/characters-v1--browser--sparrow/);
    transport.sendJSON({ type: "start_call" });
    sockets[0].onmessage({ data: new ArrayBuffer(4) });
    assert.equal(events.at(-1), "audio");
    transport.sendJSON({ type: "interrupt" });
    const length = events.length;
    sockets[0].onmessage({ data: new ArrayBuffer(4) });
    assert.equal(events.length, length);
    sockets[0].onmessage({ data: JSON.stringify({ type: "status", status: "thinking" }) });
    sockets[0].onmessage({ data: new ArrayBuffer(4) });
    assert.equal(events.at(-1), "audio");
    transport.disconnect();
    const afterDisconnect = events.length;
    sockets[0].onmessage({ data: new ArrayBuffer(4) });
    assert.equal(events.length, afterDisconnect);
  } finally {
    globalThis.WebSocket = oldSocket;
    if (oldLocation === undefined) delete globalThis.location;
    else globalThis.location = oldLocation;
  }
});
