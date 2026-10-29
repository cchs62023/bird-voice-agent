import test from "node:test";
import assert from "node:assert/strict";
import { PlaybackQueue } from "../src/voice/playback.ts";

function rig() {
  const handles = [], events = [];
  const queue = new PlaybackQueue((event) => events.push(event), () => {
    const handle = { stopped: false, released: false, reject: null,
      play: () => new Promise((_resolve, reject) => { handle.reject = reject; }),
      stop: () => { handle.stopped = true; }, release: () => { handle.released = true; },
      onPlaying: (fn) => { handle.playing = fn; }, onEnded: (fn) => { handle.ended = fn; }, onError: (fn) => { handle.error = fn; }
    };
    handles.push(handle); return handle;
  });
  return { queue, handles, events };
}

test("speaking starts only on actual playing; queued audio never overlaps", () => {
  const { queue, handles, events } = rig();
  queue.enqueue(new ArrayBuffer(4)); queue.enqueue(new ArrayBuffer(4));
  assert.equal(handles.length, 1);
  assert.equal(queue.playing, false); assert.deepEqual(events, []);
  handles[0].playing(); assert.equal(queue.playing, true);
  handles[0].ended(); assert.equal(handles[0].released, true);
  assert.equal(handles.length, 2); assert.equal(queue.playing, false);
  handles[1].playing(); handles[1].ended();
  assert.equal(queue.playing, false);
  assert.deepEqual(events, ["playing", "ended", "playing", "ended"]);
});

test("switch/interrupt discards queued audio and ignores late callbacks", async () => {
  const { queue, handles, events } = rig();
  queue.enqueue(new ArrayBuffer(4)); queue.enqueue(new ArrayBuffer(4));
  const old = handles[0]; queue.cancel();
  old.playing(); old.ended(); old.reject(new Error("cancelled"));
  await Promise.resolve();
  assert.equal(handles.length, 1); assert.equal(queue.playing, false);
  assert.deepEqual(events, ["cancelled"]);
  assert.equal(old.stopped, true); assert.equal(old.released, true);
  queue.enqueue(new ArrayBuffer(4)); handles[1].playing();
  assert.equal(queue.playing, true);
});

test("playback rejection resets state and clears remaining segments", async () => {
  const { queue, handles, events } = rig();
  queue.enqueue(new ArrayBuffer(4)); queue.enqueue(new ArrayBuffer(4));
  handles[0].reject(new Error("autoplay denied")); await Promise.resolve();
  assert.deepEqual(events, ["error"]); assert.equal(handles.length, 1);
  assert.equal(queue.playing, false);
});
