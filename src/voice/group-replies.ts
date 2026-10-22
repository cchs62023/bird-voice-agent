export type GroupSpeaker = "Sunny" | "Chirpy" | "Sage";

// One model stream produces both replies. Release each complete line immediately
// so the SDK can synthesize the first voice while the second line is generated.
export async function* streamGroupReplies(
  generate: () => AsyncIterable<string>,
  speakers: readonly [GroupSpeaker, GroupSpeaker],
  signal: AbortSignal,
  onReply: (speaker: GroupSpeaker) => void = () => {}
): AsyncGenerator<string> {
  if (signal.aborted) return;
  let buffer = "";
  let count = 0;
  function parse(line: string): string | null {
    if (!line.trim()) return null;
    const match = line.trim().match(/^Speaker (Sunny|Chirpy|Sage):\s*(.+)$/);
    if (!match || count >= speakers.length || match[1] !== speakers[count]) {
      throw new Error("群聊回覆格式不正確，請重新說一次。");
    }
    const speaker = speakers[count++];
    onReply(speaker);
    const text = match[2].trim();
    return `Speaker ${speaker}: ${text}${/[.!?]$/.test(text) ? "" : "."}\n`;
  }
  for await (const token of generate()) {
    if (signal.aborted) return;
    buffer += token;
    let end: number;
    while ((end = buffer.indexOf("\n")) !== -1) {
      if (signal.aborted) return;
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 1);
      if (line.length > 2000) throw new Error("群聊回覆過長，請重新說一次。");
      const reply = parse(line);
      if (reply) yield reply;
    }
    if (buffer.length > 2000) throw new Error("群聊回覆過長，請重新說一次。");
  }
  if (signal.aborted) return;
  const reply = parse(buffer);
  if (reply) yield reply;
  if (count !== speakers.length) throw new Error("群聊回覆不完整，請重新說一次。");
}
