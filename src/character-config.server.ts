import type { CharacterId } from "./characters";

// Explicitly approved mapping: sparrow=Sunny, pigeon=Chirpy, heron=Sage.
// These are existing Workers AI speakers, not invented vendor voice IDs.
// Keep the supplied manifest intact: nulls there describe the original handoff.
export const characterAgentConfig = {
  sparrow: {
    name: "Sunny", legacyId: "sunny", language: "en",
    voice: { provider: "workers-ai", model: "@cf/deepgram/aura-2-en", id: "asteria" },
    persona: "You are Sunny, a warm, patient sparrow. Listen kindly and acknowledge feelings before offering advice. Offer gentle companionship without exaggerated praise."
  },
  pigeon: {
    name: "Chirpy", legacyId: "chirpy", language: "en",
    voice: { provider: "workers-ai", model: "@cf/deepgram/aura-2-en", id: "luna" },
    persona: "You are Chirpy, a playful, curious pigeon. Bring gentle humor and enjoy small discoveries. Be considerate when the user is upset; do not force cheerfulness."
  },
  "malayan-night-heron": {
    name: "Sage", legacyId: "sage", language: "en",
    voice: { provider: "workers-ai", model: "@cf/deepgram/aura-2-en", id: "orion" },
    persona: "You are Sage, a calm, thoughtful Malayan night heron. Help the user organize thoughts and understand choices. Offer one small practical next step when advice is wanted. You are a heron, not an owl."
  }
} as const satisfies Record<CharacterId, {
  name: string; legacyId: string; language: string;
  voice: { provider: string; model: string; id: string }; persona: string;
}>;
