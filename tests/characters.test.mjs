import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { characters, characterSessionName, characterFromSession } from "../src/characters.ts";
import { characterAgentConfig } from "../src/character-config.server.ts";

test("browser + character defines independent, stable server identities", () => {
  const names = characters.map(({ id }) => characterSessionName("browser-one", id));
  assert.equal(new Set(names).size, 3);
  assert.equal(characterSessionName("browser-one", "sparrow"), names[0]);
  assert.notEqual(names[0], characterSessionName("browser-two", "sparrow"));
  for (const [index, bird] of characters.entries()) assert.equal(characterFromSession(names[index]), bird.id);
  assert.equal(characterFromSession("legacy--group"), null);
  assert.equal(characterFromSession("legacy--sunny"), null);
  assert.throws(() => characterSessionName("../invalid", "sparrow"));
});

test("approved persona/voice mapping does not turn the heron into an owl", () => {
  assert.equal(characterAgentConfig.sparrow.name, "Sunny");
  assert.equal(characterAgentConfig.pigeon.name, "Chirpy");
  assert.equal(characterAgentConfig["malayan-night-heron"].name, "Sage");
  assert.deepEqual(Object.values(characterAgentConfig).map((c) => c.voice.id), ["asteria", "luna", "orion"]);
  assert.match(characterAgentConfig["malayan-night-heron"].persona, /heron/);
});

test("original approved reference sheets and intentional null fields are preserved", () => {
  const manifest = JSON.parse(readFileSync(new URL("../bird-voice-agent-kit/characters.json", import.meta.url), "utf8"));
  for (const bird of manifest.characters) {
    const bytes = readFileSync(new URL(`../bird-voice-agent-kit/${bird.reference_sheet}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), bird.reference_metadata.sha256);
    assert.equal(bird.agent.persona_prompt, null);
    assert.equal(bird.agent.voice_id, null);
  }
});
