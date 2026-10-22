# Three bird voice-agent characters

Read README.md and characters.json before implementing this asset kit. Inspect all three turnaround PNGs visually. Treat them as the approved design references, not finished runtime sprites.

## Character identity

- Keep the stable IDs `sparrow`, `pigeon`, and `malayan-night-heron` distinct.
- Bind each visible bird to its own agent ID, conversation history, session state and eventual voice configuration.
- Reuse the project's model/provider infrastructure. Three agent identities can use the same underlying model; this kit does not require three different models or providers.
- Do not invent provider voice IDs, credentials or SDK parameters. The JSON is project configuration, not a vendor request payload. Leave unavailable configuration unset and identify it clearly.
- Ask for or reuse the user's personality and voice choices. A bird species alone does not establish a personality. Null persona/voice fields are intentional.
- Keep API credentials and privileged voice/model calls on the backend. Do not include keys in client assets or committed configuration.

## Visual implementation

- Reuse the exact PNG references and preserve their aspect ratio. Reference sheets include titles, angle labels and opaque backgrounds.
- Do not use the five drawings as animation frames: they are five camera angles, not an animation sequence.
- Do not silently place a whole reference sheet in the runtime as if it were a transparent bird avatar. A reference viewer is an acceptable clearly marked prototype.
- For a finished character interface, create approved individual transparent PNG/WebP poses or sprite sheets based on the references, preserving style and identity. Use image generation/editing when available for this task; do not treat cream paper pixels as already transparent.
- Keep all three characters' drawing style consistent: thin organic outlines, broad matte color masses, limited feather detail, understated expression and restrained cel shadows.
- Preserve the heron's distinctive neck, crest and legs rather than reskinning the pigeon silhouette.

## Voice and animation binding

- Support per-agent `idle`, `listening`, `thinking`, and `speaking` state. Idle is the fallback when no conversation or audio operation is active. Include explicit error/retry handling consistent with the existing application.
- Derive speaking state from actual audio playback start/end/cancel/error, not merely text generation. Return to idle after playback ends or is interrupted.
- If simple mouth motion is implemented, derive its timing from actual audio activity. Do not describe amplitude-driven mouth opening as phoneme-accurate lip sync.
- Route user input and audio output to the intended bird. Interrupt or queue playback deliberately so three agents do not accidentally talk over each other.
- Keep character artwork, per-agent persona/history, and provider-specific integration separate so users can change a voice without redesigning a bird.

## Scope

This kit supplies design references, a manifest and handoff instructions only. It contains no running app, model connection, recorded speech, transparent character exports or animation frames. Inspect the destination project's actual code and existing instructions before selecting an implementation approach.
