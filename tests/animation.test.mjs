import test from "node:test";
import assert from "node:assert/strict";
import { animationClip, SpriteTimeline } from "../src/animation/frames.ts";
import { characterDisplayPhase } from "../src/animation/phase.ts";
import { characterFromSpeakerLabel, encodeCharacterAudio, decodeCharacterAudio } from "../src/voice/audio-envelope.ts";

function clock() {
  const tasks = [];
  return {
    tasks,
    set(fn, ms) { const task = { fn, ms, cancelled: false }; tasks.push(task); return task; },
    clear(task) { task.cancelled = true; },
    next() { const task = tasks.find(t => !t.cancelled); assert.ok(task); task.cancelled = true; task.fn(); }
  };
}

test("phase changes, interruption and reduced motion invalidate old animation clocks", () => {
  const scheduler = clock(), frames = [];
  const player = new SpriteTimeline("malayan-night-heron", n => frames.push(n), scheduler);
  player.setPhase("listening");
  const old = scheduler.tasks.at(-1);
  player.setPhase("thinking");
  const count = frames.length; old.fn();
  assert.equal(frames.length, count);
  scheduler.next(); assert.equal(frames.at(-1), 1);
  player.setPhase("speaking"); scheduler.next(); assert.equal(frames.at(-1), 2);
  const speechTick = scheduler.tasks.at(-1);
  player.setPhase("idle"); assert.equal(frames.at(-1), 0);
  const stopped = frames.length; speechTick.fn(); assert.equal(frames.length, stopped);
  player.setPhase("listening"); player.setEnabled(false);
  assert.equal(frames.at(-1), 0);
  assert.equal(scheduler.tasks.filter(t => !t.cancelled).length, 0);
  player.setPhase("thinking"); player.setEnabled(true); scheduler.next();
  assert.equal(frames.at(-1), 1);
  player.dispose();
  const disposed = frames.length; scheduler.tasks.at(-1).fn(); assert.equal(frames.length, disposed);
});

test("same-phase events preserve motion, clips stay within the approved twelve frames", () => {
  const scheduler = clock(), player = new SpriteTimeline("pigeon", () => {}, scheduler);
  player.setPhase("listening"); const count = scheduler.tasks.length;
  player.setPhase("listening"); assert.equal(scheduler.tasks.length, count);
  for (const id of ["sparrow", "pigeon", "malayan-night-heron"]) for (const phase of ["listening", "thinking", "speaking"]) {
    const clip = animationClip(id, phase);
    assert.equal(clip.frames.length, clip.durations.length);
    assert.ok(clip.frames.every(n => n >= 0 && n < 12));
    assert.ok(clip.durations.every(ms => ms >= 50));
    assert.ok(clip.loopFrom < clip.frames.length);
  }
  player.dispose();
});

test("audio envelopes preserve bytes and speaker identity without guessing from transcript timing", () => {
  const bytes = new Uint8Array([0x49, 0x44, 0x33, 0, 7, 8]).buffer;
  assert.equal(decodeCharacterAudio(bytes).bytes, bytes);
  for (const id of ["sparrow", "pigeon", "malayan-night-heron"]) {
    const result = decodeCharacterAudio(encodeCharacterAudio(bytes, id));
    assert.equal(result.speaker, id); assert.deepEqual(result.bytes, bytes);
  }
  assert.equal(characterFromSpeakerLabel("Speaker Sage: Hello."), "malayan-night-heron");
  assert.equal(characterFromSpeakerLabel("Sunny said Sage is here."), null);
  assert.throws(() => decodeCharacterAudio(new Uint8Array([66, 86, 65, 49, 99, 0]).buffer));
});

test("group visuals follow the audible speaker; inactive and muted sessions rest", () => {
  const own = { active: false, muted: false, phase: "idle", speaker: null };
  const group = { active: true, muted: false, phase: "speaking", speaker: "pigeon" };
  assert.equal(characterDisplayPhase("pigeon", own, group), "speaking");
  assert.equal(characterDisplayPhase("sparrow", own, group), "listening");
  assert.equal(characterDisplayPhase("malayan-night-heron", own, { ...group, phase: "thinking", speaker: null }), "thinking");
  assert.equal(characterDisplayPhase("pigeon", own, { ...group, active: false }), "idle");
  assert.equal(characterDisplayPhase("pigeon", own, { ...group, muted: true, phase: "listening" }), "idle");
});
