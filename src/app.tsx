import { useState } from "react";
import { useVoiceAgent } from "@cloudflare/voice/react";

const birds = [
  {
    id: "sunny",
    name: "小暖 Sunny",
    emoji: "🐤",
    personality: "溫柔陪伴"
  },
  {
    id: "chirpy",
    name: "啾啾 Chirpy",
    emoji: "🐦",
    personality: "活潑好奇"
  },
  {
    id: "sage",
    name: "阿墨 Sage",
    emoji: "🦉",
    personality: "沉穩思考"
  },
  {
    id: "group",
    name: "三鳥一起聊",
    emoji: "🐤🐦🦉",
    personality: "每輪兩隻，輪流回答"
  }
];

function getBrowserId() {
  try {
    const existing = localStorage.getItem("three-birds-browser-id");
    if (existing) return existing;

    const id = crypto.randomUUID();
    localStorage.setItem("three-birds-browser-id", id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export default function App() {
  const [selected, setSelected] = useState("sunny");
  const [browserId] = useState(getBrowserId);
  const bird = birds.find((item) => item.id === selected) ?? birds[0];

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f0f9ff",
      color: "#1e293b",
      padding: "32px 20px",
      fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ fontSize: 30, fontWeight: 700 }}>
          三隻小鳥陪你聊
        </h1>
        <p style={{ margin: "12px 0 24px" }}>
          選一隻小鳥，用英文聊天。
        </p>
        <BirdRoom
          key={bird.id}
          bird={bird}
          browserId={browserId}
          onSelect={setSelected}
        />
      </div>
    </main>
  );
}

function BirdRoom({ bird, browserId, onSelect }: {
  bird: (typeof birds)[number];
  browserId: string;
  onSelect: (id: string) => void;
}) {
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  const voice = useVoiceAgent({
    agent: "BirdVoiceAgent",
    name: `v2--${browserId}--${bird.id}`
  });

  const labels = {
    idle: "尚未開始聊天",
    listening: "正在聽你說話",
    thinking: "正在思考",
    speaking: "正在回答你"
  };

  async function start() {
    setStarting(true);
    setStartError("");
    try {
      await voice.startCall();
    } catch (error) {
      setStartError(error instanceof Error ? error.message : "無法啟動麥克風");
    } finally {
      setStarting(false);
    }
  }

  function select(id: string) {
    if (id === bird.id || starting) return;
    voice.endCall();
    onSelect(id);
  }

  return (
    <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {birds.map((item) => (
          <button
            key={item.id}
            disabled={starting}
            aria-pressed={item.id === bird.id}
            onClick={() => select(item.id)}
            style={{
              flex: "1 1 180px",
              padding: 20,
              borderRadius: 16,
              border: item.id === bird.id ? "2px solid #334155" : "2px solid #e2e8f0",
              background: item.id === bird.id ? "#fff3c4" : "white",
              cursor: "pointer"
            }}
          >
            <div style={{ fontSize: 44 }}>{item.emoji}</div>
            <strong>{item.name}</strong>
            <div>{item.personality}</div>
          </button>
        ))}
      </div>

      <section style={{
        marginTop: 24,
        padding: 28,
        background: "white",
        borderRadius: 24,
        textAlign: "center"
      }}>
        <div style={{ fontSize: 88 }}>{bird.emoji}</div>
        <h2>{bird.name}</h2>
        <p style={{ margin: "12px 0" }}>
          {voice.connected ? "已連線" : "連線中"} · {labels[voice.status]}
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          {voice.status === "idle" ? (
            <button
              onClick={start}
              disabled={!voice.connected || starting}
              style={{ padding: 12, border: "1px solid #cbd5e1", borderRadius: 12 }}
            >
              {starting ? "啟動中…" : "開始聊天"}
            </button>
          ) : (
            <>
              <button onClick={() => voice.toggleMute()} style={{ padding: 12 }}>
                {voice.isMuted ? "開啟麥克風" : "靜音"}
              </button>
              <button onClick={() => voice.endCall()} style={{ padding: 12 }}>
                結束聊天
              </button>
            </>
          )}
        </div>

        <p style={{ marginTop: 20 }}>
          試著說：I had a long day. Can we talk?
        </p>
        <p>切換小鳥後，請再點「開始聊天」。</p>
        {(voice.error || startError) && (
          <p role="alert" style={{ color: "#b91c1c" }}>
            {voice.error || startError}
          </p>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>{bird.name}的聊天紀錄</h2>
        {voice.transcript.map((message, index) => (
          <p key={index} style={{
            background: "white", padding: 16, borderRadius: 12, marginTop: 12
          }}>
            <strong>{message.role === "user" ? "你" : bird.name}：</strong>
            {message.text}
          </p>
        ))}
        {voice.interimTranscript && (
          <p>正在辨識：{voice.interimTranscript}</p>
        )}
      </section>
    </>
  );
}