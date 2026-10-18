import manifest from "../bird-voice-agent-kit/characters.json" with { type: "json" };

export type CharacterId = "sparrow" | "pigeon" | "malayan-night-heron";
export type CharacterPhase = "idle" | "listening" | "thinking" | "speaking";

export const characters = manifest.characters.map((character) => ({
  id: character.id as CharacterId,
  name: character.display_name,
  englishName: character.english_name,
  anchors: character.identity_anchors,
  image: `/characters/${character.id}/idle.png`,
  reference: `/characters/${character.id}/turnaround.png`
}));

export function isCharacterId(value: string): value is CharacterId {
  return characters.some((character) => character.id === value);
}

// The named Durable Object, not the shared class/model, is the isolation boundary.
export function characterSessionName(browserId: string, id: CharacterId) {
  if (!/^[a-zA-Z0-9-]+$/.test(browserId)) throw new Error("Invalid browser identity");
  return `characters-v1--${browserId}--${id}`;
}

export function characterFromSession(name: string): CharacterId | null {
  const id = name.split("--").at(-1) ?? "";
  return isCharacterId(id) ? id : null;
}
