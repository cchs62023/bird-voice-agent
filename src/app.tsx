import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { characters, characterSessionName, type CharacterId } from "./characters";
import { CharacterSession, type SessionSnapshot } from "./voice/session";
import { BirdSprite } from "./animation/BirdSprite";
import { characterDisplayPhase } from "./animation/phase";
import "./character-motion.css";

type Selection = CharacterId | "group";
const nicknames: Record<CharacterId, string> = { sparrow: "Sunny", pigeon: "Chirpy", "malayan-night-heron": "Sage" };
const labels = { idle: "休息中", listening: "正在聆聽", thinking: "正在想一想", speaking: "正在說話" };

function browserIdentity() {
  try {
    const key = "three-birds-browser-id";
    const previous = localStorage.getItem(key);
    if (previous && /^[a-zA-Z0-9-]+$/.test(previous)) return previous;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch { return crypto.randomUUID(); }
}

export default function App() {
  const [browserId] = useState(browserIdentity);
  const [selected, setSelected] = useState<Selection>("sparrow");
  const [reference, setReference] = useState<CharacterId | null>(null);
  const sessions = useRef<Partial<Record<Selection, CharacterSession>>>({});
  function getSession(id: Selection) {
    let session = sessions.current[id];
    if (!session) {
      const name = id === "group" ? `characters-group-v1--${browserId}--group` : characterSessionName(browserId, id);
      session = new CharacterSession(name);
      sessions.current[id] = session;
    }
    return session;
  }
  const session = getSession(selected);
  const groupSession = getSession("group");
  const groupState = useSyncExternalStore(groupSession.subscribe, groupSession.getSnapshot);
  useEffect(() => {
    const registry = sessions.current;
    return () => { Object.values(registry).forEach((item) => item?.disconnect()); };
  }, []);
  function select(id: Selection) {
    if (id === selected) return;
    session.disconnect();
    setSelected(id);
  }
  return (
    <main className="bird-app"><div className="bird-shell">
      <header className="bird-header">
        <span className="eyebrow">A LITTLE COMPANY</span>
        <h1>一起，慢慢聊。</h1>
        <p>三隻小鳥，三份各自記得的故事。選一位朋友，分享今天的你。</p>
        <span className="language-note">目前支援英文語音</span>
      </header>
      <div className="character-grid" role="group" aria-label="選擇小鳥">
        {characters.map((bird) => <CharacterCard key={bird.id} id={bird.id} selected={selected === bird.id} session={getSession(bird.id)} groupState={selected === "group" ? groupState : null} onSelect={() => select(bird.id)} />)}
      </div>
      <div className="mode-row"><p>每位朋友都有自己的對話紀錄與聲音。</p><button className="quiet-button" aria-pressed={selected === "group"} onClick={() => select("group")}>三鳥一起聊</button></div>
      <Conversation key={selected} id={selected} session={session} onReference={() => { if (selected !== "group") setReference(selected); }} />
      <footer>切換朋友會先結束通話與播放。回來時，你們的故事還在。</footer>
    </div>
    {reference && <div className="reference-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="reference-title" className="reference-dialog">
      <h2 id="reference-title">{characters.find((bird) => bird.id === reference)?.name}・原始設計參考</h2>
      <p>這是五個觀察角度，不是動畫影格；原始圖片未修改。</p>
      <img src={`/characters/${reference}/turnaround.png`} alt="角色原始五視圖" />
      <button className="primary-button" autoFocus onClick={() => setReference(null)}>關閉參考圖</button>
    </section></div>}
    </main>
  );
}

function CharacterCard({ id, selected, session, groupState, onSelect }: { id: CharacterId; selected: boolean; session: CharacterSession; groupState: SessionSnapshot | null; onSelect: () => void; }) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const bird = characters.find((character) => character.id === id)!;
  const phase = characterDisplayPhase(id, state, groupState);
  return <button className={`character-card ${selected ? "is-selected" : ""} phase-${phase}`} aria-pressed={selected} onClick={onSelect}>
    <div className="character-art"><BirdSprite id={id} phase={phase} name={bird.name} fallback={bird.image} /></div>
    <span className="character-species">{bird.name}</span><strong>{nicknames[id]}</strong>
    <span className={`phase-label ${phase === "speaking" ? "is-speaking" : ""}`}>{labels[phase]}</span>
  </button>;
}

function Conversation({ id, session, onReference }: { id: Selection; session: CharacterSession; onReference: () => void; }) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const name = id === "group" ? "三鳥一起聊" : nicknames[id];
  useEffect(() => { session.connect(); return () => session.disconnect(); }, [session]);
  return <section className="conversation" aria-label={`${name}的對話`}>
    <div className="conversation-heading"><div><span className="eyebrow">YOUR CONVERSATION</span><h2>和 {name} 聊聊</h2></div><span className={`connection ${state.connected ? "online" : ""}`}>{state.connected ? "已連線" : "尚未連線"}</span></div>
    {id === "group" && <p className="group-note">每輪兩位朋友依序回答。群聊有獨立紀錄，不會混入個別聊天。</p>}
    <div className="call-status" role="status">{state.starting ? "正在開啟麥克風…" : labels[state.phase]}</div>
    <div className="call-actions">
      {!state.active ? <button className="primary-button" disabled={!state.connected || state.starting} onClick={() => void session.start()}>{state.starting ? "啟動中…" : "開始聊天"}</button>
        : <><button className="secondary-button" onClick={() => session.toggleMute()}>{state.muted ? "開啟麥克風" : "靜音"}</button><button className="primary-button" onClick={() => session.stop()}>結束聊天</button></>}
      <button className="quiet-button" onClick={() => session.retry()} disabled={state.starting}>重新連線</button>
      {id !== "group" && <button className="quiet-button" onClick={onReference}>查看原始角色圖</button>}
    </div>
    {state.error && <div className="error-message" role="alert">{state.error}<button onClick={() => session.retry()}>重試連線</button></div>}
    <p className="conversation-hint">試著說：I had a long day. Can we talk?</p>
    <div className="transcript" role="log" aria-label={`${name}的聊天紀錄`}>
      {!state.messages.length && <p className="empty-transcript">先從一句 Hello 開始。這裡只記錄你與這位朋友的對話。</p>}
      {state.messages.map((message, index) => <div key={index} className={`message message-${message.role}`}><strong>{message.role === "user" ? "你" : name}</strong><p>{message.text}</p></div>)}
    </div>
    {state.interim && <p className="interim">正在辨識：{state.interim}</p>}
  </section>;
}
