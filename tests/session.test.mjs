import test from "node:test";
import assert from "node:assert/strict";
import { VoiceClient } from "./voice-client.fake.mjs";
import { CharacterSession } from "../src/voice/session.ts";

test("each character retains its own transcript, mute and error state", async () => {
  const sunny = new CharacterSession("browser--sparrow");
  const chirpy = new CharacterSession("browser--pigeon");
  const [a, b] = VoiceClient.instances.slice(-2);
  sunny.connect(); chirpy.connect();
  a.emit("transcriptchange", [{ role: "user", text: "My name is Alice" }]);
  b.emit("transcriptchange", [{ role: "user", text: "I enjoy gardening" }]);
  sunny.toggleMute();
  assert.equal(sunny.getSnapshot().muted, true);
  assert.equal(chirpy.getSnapshot().muted, false);
  sunny.disconnect();
  assert.equal(chirpy.getSnapshot().connected, true);
  assert.equal(sunny.getSnapshot().messages[0].text, "My name is Alice");
  assert.equal(chirpy.getSnapshot().messages[0].text, "I enjoy gardening");
  a.emit("error", "connection lost");
  assert.equal(chirpy.getSnapshot().error, null);
});

test("server speaking does not activate artwork; stop handles synchronous idle callbacks", async () => {
  const session = new CharacterSession("browser--sparrow");
  const client = VoiceClient.instances.at(-1);
  session.connect(); await session.start();
  client.emit("statuschange", "thinking");
  client.emit("statuschange", "speaking");
  assert.equal(session.getSnapshot().phase, "thinking");
  session.stop();
  assert.equal(session.getSnapshot().phase, "idle");
  assert.equal(session.getSnapshot().active, false);
});

test("switching away during microphone permission does not reactivate old session", async () => {
  const session = new CharacterSession("browser--sparrow");
  const client = VoiceClient.instances.at(-1);
  let resolve;
  client.startCall = () => new Promise((done) => { resolve = done; });
  session.connect(); const started = session.start(); session.disconnect();
  resolve(); await started;
  assert.equal(session.getSnapshot().phase, "idle");
  assert.equal(session.getSnapshot().active, false);
  assert.equal(session.getSnapshot().starting, false);
});
