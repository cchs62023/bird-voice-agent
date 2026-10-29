# Sage frame animation sample

Twelve drawn frames show a head turn, blink, attentive hold and return. Original turnaround and idle artwork remain unchanged.

Revision: planted-lower-body-v2. The previous sheet aligned foot height but still had horizontal drift and changing toe shapes. The frames now register horizontal foot anchors and share frame zero below row 256. Rows 224 to 256 provide a torso overlap; only the upper body and head animate. No whole-image rotation, leg warping or regenerated feet are used. PNG and GIF lower-body pixels are identical across all twelve frames. The canvas preview also reuses the same lower-body crop after atlas compression.

- `listen-atlas.webp`: 4 columns by 3 rows, 384 px cells.
- `listen-preview.webp`: smaller embedded preview atlas.
- `sage-listen.gif`: shared-palette, cream-background animation with identical planted feet.
- `manifest.json`: frame timing, original registration and stabilization metadata.
- `sage-animation-preview.html`: offline preview in the project root, with playback, frame selection, speed and reduced-motion controls.

Status: review sample, not connected to the voice runtime. No microphone, model calls, mouth animation or speech synchronization. Full-resolution source PNGs and the previous atlas are retained in the authoring workspace.
