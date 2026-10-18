# Bird frame animation previews

The three characters now have independent 12-frame head-turn, blink and listening animation samples. Sunny's visual direction was accepted; Chirpy and Sage follow that direction with independent species artwork and timing.

- [Sunny](sunny-animation-preview.html): gentle, warm timing.
- [Chirpy](chirpy-animation-preview.html): shorter pauses and curious head tilt.
- [Sage](sage-animation-preview.html): slower turn and longer attentive holds.

These are self-contained HTML previews: open the local file in a browser. Every image is embedded, with no network or voice-provider request. Each character also has a GIF and a registered atlas under `public/characters/<character-id>/animation-draft/`. Original reference sheets are preserved.

All previews support play/pause, replay, individual frames, loop, speed selection and reduced-motion preferences. Registered feet reduce drifting between generated drawings. These are body/head and eyelid animation studies, not phoneme lip sync. New samples remain separate from the current voice runtime until integration; the existing runtime still uses its previous artwork state display.
