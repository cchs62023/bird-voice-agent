export type Locale = "en" | "zh-TW";
export const localeStorageKey = "three-birds-ui-language";

export const translations = {
  en: {
    pageTitle: "Three Birds, A Little Company",
    eyebrow: "A LITTLE COMPANY",
    title: "Take a moment. Have a chat.",
    intro: "Three birds, each with a story of your own. Pick a friend and share your day.",
    voiceNote: "Voice conversations are currently in English. This switch changes the interface text.",
    chooseBird: "Choose a bird",
    individualNote: "Each friend has their own conversation history and voice.",
    group: "Chat with all three",
    groupName: "all three birds",
    footer: "Switching friends ends the current call and playback. Your conversation will be here when you return.",
    referenceTitle: "{name} · Original character reference",
    referenceNote: "These are five reference views, not animation frames. The original image is unchanged.",
    referenceAlt: "Five original character reference views",
    closeReference: "Close reference",
    conversationEyebrow: "YOUR CONVERSATION",
    conversationTitle: "A chat with {name}",
    conversationLabel: "Conversation with {name}",
    connected: "Connected",
    disconnected: "Not connected",
    groupNote: "Two friends reply in turn. Group history is separate from your individual chats.",
    openingMic: "Opening your microphone…",
    starting: "Starting…",
    start: "Start chatting",
    unmute: "Unmute microphone",
    mute: "Mute microphone",
    end: "End chat",
    reconnect: "Reconnect",
    viewReference: "View character reference",
    retry: "Retry connection",
    hint: "Try saying: I had a long day. Can we talk?",
    transcriptLabel: "Chat history with {name}",
    emptyTranscript: "Start with a Hello. This space keeps your conversation with this friend.",
    you: "You",
    recognizing: "Hearing: {text}",
    animationUnavailable: "Animation is temporarily unavailable",
    technicalDetails: "Technical details",
    phases: { idle: "Resting", listening: "Listening", thinking: "Thinking", speaking: "Speaking" },
    errors: {
      playback: "Audio could not play. Retry and check that your browser allows sound.",
      disconnected: "The connection was lost. Please reconnect.",
      notConnected: "Not connected yet. Please reconnect.",
      microphone: "Could not start the microphone. Check your browser's microphone permission.",
      groupFormat: "The group reply could not be processed. Please try again.",
      tts: "The voice service could not generate audio. Please try again.",
      generic: "Something interrupted the conversation. Please retry the connection."
    }
  },
  "zh-TW": {
    pageTitle: "三隻小鳥陪你聊",
    eyebrow: "一點陪伴",
    title: "一起，慢慢聊。",
    intro: "三隻小鳥，三份各自記得的故事。選一位朋友，分享今天的你。",
    voiceNote: "目前支援英文語音；此切換只變更介面文字。",
    chooseBird: "選擇小鳥",
    individualNote: "每位朋友都有自己的對話紀錄與聲音。",
    group: "三鳥一起聊",
    groupName: "三位朋友",
    footer: "切換朋友會先結束通話與播放。回來時，你們的故事還在。",
    referenceTitle: "{name}・原始設計參考",
    referenceNote: "這是五個觀察角度，不是動畫影格；原始圖片未修改。",
    referenceAlt: "角色原始五視圖",
    closeReference: "關閉參考圖",
    conversationEyebrow: "你們的對話",
    conversationTitle: "和 {name} 聊聊",
    conversationLabel: "{name}的對話",
    connected: "已連線",
    disconnected: "尚未連線",
    groupNote: "每輪兩位朋友依序回答。群聊有獨立紀錄，不會混入個別聊天。",
    openingMic: "正在開啟麥克風…",
    starting: "啟動中…",
    start: "開始聊天",
    unmute: "開啟麥克風",
    mute: "靜音",
    end: "結束聊天",
    reconnect: "重新連線",
    viewReference: "查看原始角色圖",
    retry: "重試連線",
    hint: "試著說：I had a long day. Can we talk?",
    transcriptLabel: "{name}的聊天紀錄",
    emptyTranscript: "先從一句 Hello 開始。這裡只記錄你與這位朋友的對話。",
    you: "你",
    recognizing: "正在辨識：{text}",
    animationUnavailable: "動作暫時無法顯示",
    technicalDetails: "技術細節",
    phases: { idle: "休息中", listening: "正在聆聽", thinking: "正在想一想", speaking: "正在說話" },
    errors: {
      playback: "聲音無法播放。請點重試，並確認瀏覽器允許播放聲音。",
      disconnected: "連線已中斷，請重試。",
      notConnected: "尚未連線，請點重試。",
      microphone: "無法啟動麥克風。請確認瀏覽器的麥克風權限。",
      groupFormat: "群聊回覆無法處理，請再試一次。",
      tts: "語音服務無法產生聲音，請再試一次。",
      generic: "對話發生中斷，請重試連線。"
    }
  }
};

export function formatText(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) => values[key] ?? placeholder);
}

export function loadLocale(storage: Pick<Storage, "getItem">): Locale {
  try {
    const saved = storage.getItem(localeStorageKey);
    if (saved === "en" || saved === "zh-TW") return saved;
  } catch { /* Browsing without storage still supports the language switch. */ }
  return "en";
}

export function saveLocale(storage: Pick<Storage, "setItem">, locale: Locale) {
  try { storage.setItem(localeStorageKey, locale); } catch { /* Keep the in-memory selection. */ }
}

type ErrorKey = keyof typeof translations.en.errors;
const knownErrors: Record<string, ErrorKey> = {
  "聲音無法播放。請點重試，並確認瀏覽器允許播放聲音。": "playback",
  "連線已中斷，請重試。": "disconnected",
  "尚未連線，請點重試。": "notConnected",
  "無法啟動麥克風。": "microphone",
  "群聊回覆格式不正確，請重新說一次。": "groupFormat",
  "群聊回覆不完整，請重新說一次。": "groupFormat",
  "群聊回覆過長，請重新說一次。": "groupFormat",
  "群聊音訊缺少角色名稱。": "groupFormat",
  "群聊語音缺少角色名稱，請貼出終端機錯誤。": "groupFormat",
  "語音服務回傳了無法辨識的資料格式。": "tts"
};

export function localizeError(error: string, locale: Locale) {
  const key = Object.hasOwn(knownErrors, error) ? knownErrors[error] : undefined;
  if (key) return { message: translations[locale].errors[key], details: null };
  // Preserve service diagnostics instead of pretending to translate arbitrary
  // model output or provider errors. The explanation around them is localized.
  return { message: translations[locale].errors.generic, details: error };
}
