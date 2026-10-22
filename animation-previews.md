# Bird frame animation previews

The three characters now have independent 12-frame head-turn, blink and listening animation samples. Sunny's visual direction was accepted; Chirpy and Sage follow that direction with independent species artwork and timing.

- [Sunny](sunny-animation-preview.html): gentle, warm timing.
- [Chirpy](chirpy-animation-preview.html): shorter pauses and curious head tilt.
- [Sage](sage-animation-preview.html): slower turn and longer attentive holds.

These are self-contained HTML previews: open the local file in a browser. Every image is embedded, with no network or voice-provider request. Each character also has a GIF and a registered atlas under `public/characters/<character-id>/animation-draft/`. Original reference sheets are preserved.

All previews support play/pause, replay, individual frames, loop, speed selection and reduced-motion preferences. Registered feet reduce drifting between generated drawings. These are body/head and eyelid animation studies, not phoneme lip sync. The voice runtime now uses these approved atlases through `src/animation/BirdSprite.tsx`. Listening, thinking and actual audio playback select the gesture clips; stop, interruption, disconnect or playback failure return the character to its resting frame. The standalone HTML files remain animation-only visual studies. Sage retains its approved static lower-body layer.
