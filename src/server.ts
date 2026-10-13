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
  sunny: {
    name: "Sunny",
    speaker: "asteria",
    personality:
      "You are a warm, patient little bird. " +
      "Listen kindly and acknowledge feelings before offering advice. " +
      "Offer gentle companionship without exaggerated praise."
  },
  chirpy: {
    name: "Chirpy",
    speaker: "luna",
    personality:
      "You are a playful, curious little bird. " +
      "Bring gentle humor and enjoy small discoveries. " +
      "Be considerate when the user is upset; do not force cheerfulness."
  },
  sage: {
    name: "Sage",
    speaker: "orion",
    personality:
      "You are a calm, thoughtful owl. " +
      "Help the user organize thoughts and understand choices. " +
      "Offer one small practical next step when advice is wanted."
  }
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
    if (this.name.endsWith("--chirpy")) return "chirpy";
    if (this.name.endsWith("--sage")) return "sage";

    return "sunny";
  }

  beforeCallStart() {
    if (this.name.endsWith("--group")) {
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

    const bird = BIRD_SETTINGS[this.getBirdId()];

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