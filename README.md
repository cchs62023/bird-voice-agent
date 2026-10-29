# Three bird voice companions

React + Cloudflare Agents / Durable Objects + Workers AI. Integrates the approved
`bird-voice-agent-kit` without changing its source sheets or manifest.

## Characters

| Stable ID | Artwork | Approved persona | Existing Aura-2 speaker |
| --- | --- | --- | --- |
| `sparrow` | 麻雀 | Sunny — warm and patient | `asteria` |
| `pigeon` | 鴿子 | Chirpy — playful and curious | `luna` |
| `malayan-night-heron` | 黑冠麻鷺 | Sage — calm and thoughtful | `orion` |

This mapping was approved in the implementation conversation. Species alone did
not determine the personalities. The kit's intentional null fields remain intact;
approved backend overrides live in `src/character-config.server.ts`.

## Run on your Mac

Use Node.js 24 LTS (the dependency-free tests use Node's TypeScript stripping).

```bash
npm ci
npm run types
npm run dev
```

Open the local URL printed by Vite. Cloudflare authentication is required because
the existing `AI` binding uses `remote: true`. If not already authenticated, run
`npx wrangler login` in your own terminal. No additional voice-provider API key is
required. Existing Workers AI usage/pricing still applies.

Choose a character, click 開始聊天, allow microphone access, then speak English.
Only the selected session connects. Switching characters stops the previous mic,
audio playback and pending audio before connecting the next character. Reconnect
is explicit using 重新連線; the app never silently resumes recording after an error.

## Isolation and persistence

- All characters reuse the existing exported `BirdVoiceAgent` class and provider
  infrastructure. The isolation boundary is a **different named Durable Object**
  for each browser + stable character ID: `characters-v1--<browser-id>--<id>`.
- Each object has its own SDK SQLite conversation history and its own
  `cf_character_state` row (character, voice, language, call count and turn count).
- Each character also has its own frontend session object, transcript, mute/error
  state and audio queue. An inactive session never plays another session's audio.
- Existing `v2--...--sunny/chirpy/sage` histories are untouched. They are not
  silently copied or reassigned to the new species. The previous group-chat
  implementation remains available in its own named object and history.
- The current chat model is the repository's existing Kimi model. Changing
  `CHAT_MODEL` does not change character IDs, voices, artwork or history scopes.

Browser IDs are local prototype identities, **not authenticated user accounts**.
Before sharing a deployment, add server-side authentication/authorization for
agent names. Changing browsers or clearing local storage creates a new identity.
Local `.wrangler` SQLite data and deployed Durable Object data are separate.

## Actual audio playback states

`VoiceClient` continues to manage microphone input, Cloudflare voice protocol and
transcripts. `CharacterTransport` implements its documented custom-transport
contract and directs response audio to the application's observable playback queue.

- `listening` follows accepted call/listening status, interim speech and microphone activity. Muted, inactive sessions rest.
- `thinking` follows model processing, never text masquerading as speech.
- `speaking` starts only on the actual HTML audio element's `playing` event.
- `ended`, interruption, switching, disconnect and playback errors reset to idle.
- Server readiness cannot overwrite an audio segment that is still buffering or playing.
- Group audio carries a small application envelope with the stable character ID. The client strips it before decoding MP3 and associates the ID with that queued segment. Only its actual `playing` event activates the corresponding bird; other birds listen. Server and client must be updated together.
- Audio plays in FIFO order. Cancel increments a generation guard so stale
  callbacks cannot restart old audio. User speech can interrupt active playback.
- Errors have visible retry controls; failed microphone startup is cancelled when
  the user switches away while a permission dialog is still pending.

The native WebSocket transport uses the same `/agents/bird-voice-agent/<name>`
route as the original application. There is no new model endpoint or client key.

## Artwork

- `bird-voice-agent-kit/` preserves the exact uploaded files. SHA-256 tests verify
  all three approved turnaround sheets.
- `public/characters/<id>/idle.png` contains a generated **preview** front-three-
  quarter transparent standing pose based on the matching approved sheet. These
  are drafts for visual review, not newly approved identity references.
- `public/characters/<id>/turnaround.png` is the unchanged reference, shown only
  in the clearly marked reference viewer. Its aspect ratio is preserved.
- The approved twelve-frame atlases in `public/characters/<id>/animation-draft/` now drive the runtime through `src/animation/BirdSprite.tsx`. The existing `idle.png` is a loading/error fallback; the resting animation frame is atlas frame zero.
- Listening uses the approved turn/blink loop. Thinking holds the attentive pose with occasional blinks. Speaking starts a closed-beak body gesture only when response audio actually plays. These drawings have no mouth animation or phoneme lip sync.
- `SpriteTimeline` cancels old timers on state change, stop, interruption and unmount. Hidden tabs and reduced-motion settings display the resting frame while preserving voice controls and state labels.
- Sage retains the approved fixed lower-body layer, including an explicit stable-foot crop in the canvas renderer after atlas compression.
- Atlas failure falls back to the original idle image; it does not break the conversation. `runtime-assets.json` records the runtime mapping. The original kit manifest and turnaround hashes remain unchanged.

No new model/provider call is required for animation. The model and configured voices are unchanged. Animation-only HTML and GIF studies remain available through [animation-previews.md](animation-previews.md); they are not hosted Cloudflare voice sessions.

## Validation

```bash
npm test
npm run check
npm run deploy
```

`npm test` runs 15 deterministic tests for identity separation, approved mapping,
unchanged references, FIFO playback, cancellation/stale callbacks, errors,
transcript/mute isolation, microphone-startup cancellation and transport routing.
Additional tests cover animation timer cleanup/reduced motion, per-audio group identity, server status while buffering, actual-playback gating, mute, interruption and playback errors. Group-stream tests verify one generation, release of the first reply before the second is available, cancellation, and speaker validation. The SDK boundary is mocked; this is **not** a live Cloudflare voice test.

### Interface language

The header includes one accessible language toggle labeled ENG / 繁中. On first use the interface defaults to English regardless of browser language. The switch supports keyboard activation and exposes its state through `role="switch"` and `aria-checked`. A manual choice is remembered in `three-birds-ui-language`; blocked browser storage still permits switching for the current visit. Page title, document language, character species names, controls, statuses, reference views, accessibility labels and application error explanations switch together. Unknown provider errors remain available under localized technical details.

This is interface translation. It does not translate recorded dialogue or change the English STT/TTS and persona prompts. Language changes do not change agent identities, reconnect sessions, stop playback or reset animations. To verify after deployment, switch in both directions during a call, check the group and reference views, reload to confirm persistence, and check the layout on a narrow screen.

### Group latency

Group mode now makes one Kimi request per turn, generating the two selected birds in order. Each complete speaker line is released to the existing voice pipeline immediately; the second reply no longer starts a separate model request. The model, fixed voices, playback ordering and character artwork stay the same. Each bird remains a separate voice-agent session in solo mode; group mode has its own shared conversation.

Run `npx wrangler tail three-birds --format pretty` while testing. Structured logs include `bird_group_start`, `bird_group_first_text`, `bird_group_reply_ready`, `bird_group_text_end` and `bird_tts_end`. Group events share a random `turnId`; TTS events report voice and synthesis duration. No new log includes transcript text or browser identity. Group elapsed times begin after STT has delivered the user's turn; they do not measure microphone detection, network delivery or actual browser playback. A cancelled turn is recorded as `aborted`.

This removes one model call, not the model's first-token or TTS latency. Compare single-device and multi-device timings after deployment before drawing conclusions about capacity. No production latency reduction or live load-test result has been measured here.

In the implementation workspace `npm test` passed. `node --experimental-transform-types
--check` passed for the server and frontend voice controller. Dependency downloads
were unavailable, so the formatter/linter/TypeScript build and live voice test
could not be completed there. Run `npm ci`, `npm run format`, `npm run check`, then
the following manual acceptance check on your authenticated Mac before deploying:

1. Tell Sunny one fact; switch to Chirpy and verify that fact is absent there.
2. Return to Sunny; verify the earlier transcript remains.
3. Check all three names and fixed configured speakers; confirm Sage is a heron.
4. While a bird speaks, switch characters or interrupt. No queued old audio may play.
5. Deny microphone access or disconnect the network. Retry should recover without
   recording automatically or leaving an inactive bird in speaking state.
6. Check that speaking begins with audible playback and returns to idle at its end.
7. Inspect all three approved atlas animations at desktop/mobile widths, including Sage’s planted feet. Try reduced-motion mode and switch away mid-gesture.
8. In group mode, verify only the audibly speaking bird shows speaking; queued replies must not switch the character early.

Deployment is a separate action. This change does not deploy, migrate, delete or
publish any existing conversation data.

## API references checked for this integration

The existing pinned `@cloudflare/voice@0.3.0` transport and `afterSynthesize(audio, text, connection)` hooks were checked against the [tagged SDK source](https://github.com/cloudflare/agents/tree/%40cloudflare%2Fvoice%400.3.0/packages/voice/src) and the [Cloudflare voice documentation](https://developers.cloudflare.com/agents/communication-channels/voice/). Group speaker identity is an application envelope, not an invented SDK option.
