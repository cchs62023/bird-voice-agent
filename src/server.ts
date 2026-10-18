import { characterFromSession } from "./characters";
import { characterAgentConfig } from "./character-config.server";
import { Agent, routeAgentRequest } from "agents";
import {
  withVoice,
  WorkersAIFluxSTT,
  type VoiceTurnContext
} from "@cloudflare/voice";
import {
  AIChatAgent,
  type OnChatMessageOptions
} from "@cloudflare/ai-chat";
import { createWorkersAI } from "workers-ai-provider";
import { convertToModelMessages, streamText } from "ai";

// ── 模型設定 ──────────────────────────────────────────

const CHAT_MODEL = "@cf/moonshotai/kimi-k2.7-code";
const TTS_MODEL = "@cf/deepgram/aura-2-en";

// ── 文字聊天 ──────────────────────────────────────────

export class ChatAgent extends AIChatAgent<Env> {
  async onChatMessage(
    _onFinish: unknown,
    options?: OnChatMessageOptions
  ) {
    const workersai = createWorkersAI({
      binding: this.env.AI
    });

    const result = streamText({
      model: workersai(CHAT_MODEL),
      system: "You are a friendly assistant. Keep replies concise.",
      messages: await convertToModelMessages(this.messages),
      abortSignal: options?.abortSignal
    });

    return result.toUIMessageStreamResponse();
  }
}

// ── 三隻小鳥的角色與音色 ────────────────────────────────

const BIRD_SETTINGS = {
  sunny: { name: "Sunny", speaker: characterAgentConfig.sparrow.voice.id,
    personality: characterAgentConfig.sparrow.persona },
  chirpy: { name: "Chirpy", speaker: characterAgentConfig.pigeon.voice.id,
    personality: characterAgentConfig.pigeon.persona },
  sage: { name: "Sage", speaker: characterAgentConfig["malayan-night-heron"].voice.id,
    personality: characterAgentConfig["malayan-night-heron"].persona }
} as const;

type BirdId = keyof typeof BIRD_SETTINGS;

// ── 音訊轉換：處理不同的 Workers AI 回傳格式 ─────────────

class BirdTTS {
  constructor(
  private ai: Env["AI"],
  private speaker: (typeof BIRD_SETTINGS)[BirdId]["speaker"]
  ) {}

  async synthesize(
    text: string,
    signal?: AbortSignal
  ): Promise<ArrayBuffer | null> {
    if (!text.trim() || signal?.aborted) return null;

    const output: unknown = await this.ai.run(
      TTS_MODEL,
      {
        text,
        speaker: this.speaker
      },
      {
        returnRawResponse: true
      }
    );

    if (signal?.aborted) return null;

    let audio: ArrayBuffer;

    if (output instanceof Response) {
      if (!output.ok) {
        throw new Error(
          `語音生成失敗：HTTP ${output.status}`
        );
      }

      audio = await output.arrayBuffer();
    } else if (output instanceof ReadableStream) {
      audio = await new Response(output).arrayBuffer();
    } else if (output instanceof ArrayBuffer) {
      audio = output;
    } else if (output instanceof Uint8Array) {
      audio = new Uint8Array(output).buffer;
    } else {
      throw new Error(
        "語音服務回傳了無法辨識的資料格式。"
      );
    }

    return signal?.aborted ? null : audio;
  }
}

// ── 群聊音色：依字幕角色選擇聲音 ────────────────────────

class GroupBirdTTS {
  constructor(private ai: Env["AI"]) {}

  async synthesize(
    text: string,
    signal?: AbortSignal
  ): Promise<ArrayBuffer | null> {
    if (signal?.aborted) return null;

    const match = text.trim().match(
      /^Speaker (Sunny|Chirpy|Sage):\s*([\s\S]+)$/
    );

    if (!match) {
      throw new Error(
        "群聊語音缺少角色名稱，請貼出終端機錯誤。"
      );
    }

    const id = match[1].toLowerCase() as BirdId;
    const spokenText = match[2].trim();

    if (!spokenText) return null;

    const provider = new BirdTTS(
      this.ai,
      BIRD_SETTINGS[id].speaker
    );

    // 角色名稱顯示在字幕裡，但不會被念出來。
    return provider.synthesize(spokenText, signal);
  }
}

// ── 單鳥與群聊語音 Agent ────────────────────────────────

const VoiceAgentBase = withVoice(Agent, {
  historyLimit: 8
});

export class BirdVoiceAgent extends VoiceAgentBase<Env> {
  transcriber = new WorkersAIFluxSTT(this.env.AI);

  tts: BirdTTS | GroupBirdTTS = new BirdTTS(
    this.env.AI,
    "asteria"
  );

  private getBirdId(): BirdId {
    const characterId = characterFromSession(this.name);
    if (characterId) return characterAgentConfig[characterId].legacyId;
    if (this.name.endsWith("--chirpy")) return "chirpy";
    if (this.name.endsWith("--sage")) return "sage";

    return "sunny";
  }

  private ensureCharacterState() {
    const id = characterFromSession(this.name);
    if (!id) return;
    const config = characterAgentConfig[id];
    this.sql`CREATE TABLE IF NOT EXISTS cf_character_state (
      character_id TEXT PRIMARY KEY,
      voice_id TEXT NOT NULL,
      language TEXT NOT NULL,
      call_count INTEGER NOT NULL DEFAULT 0,
      turn_count INTEGER NOT NULL DEFAULT 0
    )`;
    this.sql`INSERT INTO cf_character_state (character_id, voice_id, language)
      VALUES (${id}, ${config.voice.id}, ${config.language})
      ON CONFLICT(character_id) DO UPDATE SET
        voice_id=excluded.voice_id, language=excluded.language`;
  }

  beforeCallStart() {
    this.ensureCharacterState();
    const characterId = characterFromSession(this.name);
    if (characterId) {
      const config = characterAgentConfig[characterId];
      this.tts = new BirdTTS(this.env.AI, config.voice.id);
      this.sql`UPDATE cf_character_state SET call_count=call_count+1
        WHERE character_id=${characterId}`;
    } else if (this.name.endsWith("--group")) {
      this.tts = new GroupBirdTTS(this.env.AI);
    } else {
      const bird = BIRD_SETTINGS[this.getBirdId()];

      this.tts = new BirdTTS(
        this.env.AI,
        bird.speaker
      );
    }

    return true;
  }

  async onTurn(
    transcript: string,
    context: VoiceTurnContext
  ) {
    if (this.name.endsWith("--group")) {
      return this.groupReplies(transcript, context);
    }

    const characterId = characterFromSession(this.name);
    this.ensureCharacterState();
    if (characterId) {
      this.sql`UPDATE cf_character_state SET turn_count=turn_count+1
        WHERE character_id=${characterId}`;
    }
    const config = characterId ? characterAgentConfig[characterId] : null;
    const bird = config
      ? { name: config.name, speaker: config.voice.id, personality: config.persona }
      : BIRD_SETTINGS[this.getBirdId()];

    const workersai = createWorkersAI({
      binding: this.env.AI
    });

    const result = streamText({
      model: workersai(CHAT_MODEL),
      system: `
Your name is ${bird.name}.
${bird.personality}

You are an AI bird companion.
When asked your name, say "${bird.name}".
Your current identity overrides names in earlier conversation.
Do not call yourself Little Sunny or another bird's name.

Speak English in one short sentence, around 10 to 20 words.
Respond directly without a long introduction.
Ask at most one question.
Use natural spoken language.
Do not use Markdown, emojis, lists, or stage directions.
Do not invent memories or facts.
      `,
      messages: [
        ...context.messages.map((message) => ({
          role: message.role as "user" | "assistant",
          content: message.content
        })),
        {
          role: "user" as const,
          content: transcript
        }
      ],
      abortSignal: context.signal
    });

    return result.textStream;
  }

  // 每輪兩隻鳥，依序回答；下一輪換組合。
  private async *groupReplies(
    transcript: string,
    context: VoiceTurnContext
  ): AsyncGenerator<string> {
    const pairs: BirdId[][] = [
      ["sunny", "sage"],
      ["chirpy", "sage"],
      ["sunny", "chirpy"]
    ];

    const previousTurns = context.messages.filter(
      (message) => message.role === "user"
    ).length;

    const pair = pairs[previousTurns % pairs.length];

    const workersai = createWorkersAI({
      binding: this.env.AI
    });

    let previousReply = "";

    for (const [index, id] of pair.entries()) {
      if (context.signal.aborted) return;

      const bird = BIRD_SETTINGS[id];

      const instruction =
        index === 0
          ? "Respond directly to the user and leave room for another bird."
          : `Another bird just said: ${previousReply}
Add a different, useful perspective.
Do not repeat that reply.
Do not ask another question.`;

      const result = streamText({
        model: workersai(CHAT_MODEL),
        system: `
Your name is ${bird.name}.
${bird.personality}

You are an AI bird companion in a shared conversation.
Your current identity overrides names in earlier messages.
Speak English.
Give exactly one short sentence, around 8 to 20 words.
Do not write your name or a speaker label.
Do not use Markdown, emojis, lists, or stage directions.
Avoid abbreviations, URLs, and numbered lists.
Do not invent memories or facts.

${instruction}
        `,
        messages: [
          ...context.messages.map((message) => ({
            role: message.role as "user" | "assistant",
            content: message.content
          })),
          {
            role: "user" as const,
            content: transcript
          }
        ],
        abortSignal: context.signal
      });

      let buffer = "";
      let fullReply = "";

      for await (const token of result.textStream) {
        if (context.signal.aborted) return;

        buffer += token;
        fullReply += token;

        // 為每個完整句子加上角色標記。
        while (true) {
          const match = buffer.match(
            /^([\s\S]*?[.!?])\s+/
          );

          if (!match) break;

          const sentence = match[1].trim();
          buffer = buffer.slice(match[0].length);

          if (sentence) {
            yield `Speaker ${bird.name}: ${sentence}\n`;
          }
        }
      }

      if (context.signal.aborted) return;

      const remaining = buffer.trim();

      if (remaining) {
        const ending = /[.!?]$/.test(remaining)
          ? ""
          : ".";

        yield `Speaker ${bird.name}: ${remaining}${ending}\n`;
      }

      previousReply = `${bird.name}: ${fullReply.trim()}`;
    }
  }
}

// ── 請求路由 ──────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
