import type { CharacterId, CharacterPhase } from "../characters";

type VisualState = { phase: CharacterPhase; active: boolean; muted: boolean; speaker: CharacterId | null };

export function characterDisplayPhase(id: CharacterId, own: VisualState, group: VisualState | null): CharacterPhase {
  if (!group) return own.active ? own.phase : "idle";
  if (!group.active) return "idle";
  if (group.phase === "speaking") return group.speaker === id ? "speaking" : "listening";
  if (group.muted && group.phase === "listening") return "idle";
  return group.phase;
}
