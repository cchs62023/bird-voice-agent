# Sage frame animation sample

Twelve newly drawn frames show a head turn, blink, attentive hold and return. Original turnaround and idle artwork remain unchanged. Body artwork is not rotated with CSS. Cells are cropped from transparent gutters and translated to a shared foot baseline without warping the drawing.

- `listen-atlas.webp`: 4 columns by 3 rows, each cell 384 px square.
- `listen-preview.webp`: smaller atlas embedded in the offline preview.
- `sage-listen.gif`: cream-background, shared-palette animated preview.
- `manifest.json`: per-frame timing and registration metadata.
- `sage-animation-preview.html` in the project root: offline, self-contained playback, frame selection, loop, speed, pause and reduced-motion support.

Status: review sample. Small contour changes remain between generated frames. No microphone, model calls, speech or mouth synchronization are enabled. The animation is not yet connected to the voice runtime. Full-resolution source PNGs are retained in the authoring workspace.
