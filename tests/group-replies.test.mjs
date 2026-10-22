import test from "node:test";
import assert from "node:assert/strict";
import { streamGroupReplies } from "../src/voice/group-replies.ts";

const speakers = ["Sunny", "Sage"];
async function* chunks(...parts) { yield* parts; }
async function collect(stream) { const items = []; for await (const item of stream) items.push(item); return items; }

test("one generation releases the first voice before the second response exists", async () => {
  let calls = 0, release;
  const gate = new Promise(resolve => { release = resolve; });
  const controller = new AbortController();
  const ready = [];
  const stream = streamGroupReplies(() => {
    calls++;
    return (async function* () {
      yield "Spea"; yield "ker Sunny: Take your time.\r\n";
      await gate;
      yield "Speaker Sage: Let us choose one small step.";
    })();
  }, speakers, controller.signal, speaker => ready.push(speaker));
  assert.deepEqual(await stream.next(), { value: "Speaker Sunny: Take your time.\n", done: false });
  assert.deepEqual(ready, ["Sunny"]);
  assert.equal(calls, 1);
  release();
  assert.equal((await stream.next()).value, "Speaker Sage: Let us choose one small step.\n");
  assert.equal((await stream.next()).done, true);
  assert.deepEqual(ready, speakers);
});

test("cancelling a group turn suppresses the second voice", async () => {
  const controller = new AbortController();
  const stream = streamGroupReplies(() => chunks("Speaker Sunny: Hello.\nSpeaker Sage: Welcome.\n"), speakers, controller.signal);
  assert.equal((await stream.next()).value, "Speaker Sunny: Hello.\n");
  controller.abort();
  assert.equal((await stream.next()).done, true);
  let called = false;
  await collect(streamGroupReplies(() => { called = true; return chunks(); }, speakers, controller.signal));
  assert.equal(called, false);
});

test("speaker validation prevents a missing, repeated or unexpected voice", async () => {
  for (const text of [
    "Speaker Sunny: Hello.",
    "Speaker Sunny: Hello.\nSpeaker Sunny: Again.",
    "Speaker Chirpy: Hello.\nSpeaker Sage: Hi.",
    "Speaker Sunny: Hello.\nSpeaker Sage: Hi.\nSpeaker Chirpy: Extra.",
    "This line has no speaker.\nSpeaker Sage: Hi.",
    "Speaker Sunny: " + "x".repeat(2001)
  ]) await assert.rejects(collect(streamGroupReplies(() => chunks(text), speakers, new AbortController().signal)));
  assert.deepEqual(await collect(streamGroupReplies(() => chunks("\nSpeaker Sunny: Hello\n\nSpeaker Sage: Hi\n"), speakers, new AbortController().signal)), ["Speaker Sunny: Hello.\n", "Speaker Sage: Hi.\n"]);
});
