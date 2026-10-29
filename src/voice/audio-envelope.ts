import type { CharacterId } from "../characters";

// Application envelope outside the SDK protocol. Each group MP3 carries its own
// speaker, so concurrent TTS completion cannot mislabel queued playback.
const MAGIC = [0x42, 0x56, 0x41, 0x31]; // BVA1
const IDS: CharacterId[] = ["sparrow", "pigeon", "malayan-night-heron"];

export function characterFromSpeakerLabel(text: string): CharacterId | null {
  const match = /^Speaker (Sunny|Chirpy|Sage):/.exec(text.trim());
  const label = match?.[1];
  const characters: Record<string, CharacterId> = { Sunny: "sparrow", Chirpy: "pigeon", Sage: "malayan-night-heron" };
  return label ? characters[label] ?? null : null;
}

export function encodeCharacterAudio(bytes: ArrayBuffer, speaker: CharacterId): ArrayBuffer {
  const packet = new Uint8Array(bytes.byteLength + 5);
  packet.set(MAGIC); packet[4] = IDS.indexOf(speaker) + 1;
  packet.set(new Uint8Array(bytes), 5);
  return packet.buffer;
}

export function decodeCharacterAudio(bytes: ArrayBuffer): { bytes: ArrayBuffer; speaker: CharacterId | null } {
  const packet = new Uint8Array(bytes);
  if (packet.length < 4 || !MAGIC.every((value, n) => packet[n] === value)) return { bytes, speaker: null };
  const speaker = IDS[packet[4] - 1];
  if (!speaker || packet.length <= 5) throw new Error("Invalid character audio envelope");
  return { bytes: bytes.slice(5), speaker };
}
