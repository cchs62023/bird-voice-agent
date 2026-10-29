import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { characters, characterSessionName, type CharacterId } from "./characters";
import { CharacterSession, type SessionSnapshot } from "./voice/session";
import { BirdSprite } from "./animation/BirdSprite";
import { characterDisplayPhase } from "./animation/phase";
import "./character-motion.css";
import { translations, formatText, loadLocale, saveLocale, localizeError, type Locale } from "./i18n";

type Selection = CharacterId | "group";
const nicknames: Record<CharacterId, string> = { sparrow: "Sunny", pigeon: "Chirpy", "malayan-night-heron": "Sage" };


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
  const [locale, setLocale] = useState<Locale>(() => loadLocale({ getItem: (key) => localStorage.getItem(key) }));
  const text = translations[locale];
  useEffect(() => {
    saveLocale({ setItem: (key, value) => localStorage.setItem(key, value) }, locale);
    document.documentElement.lang = locale;
    document.title = text.pageTitle;
  }, [locale, text.pageTitle]);
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
        <div className="language-switch">
          <button type="button" className="language-toggle" role="switch" aria-checked={locale === "zh-TW"}
            aria-label="繁體中文介面 / Traditional Chinese interface"
            onClick={() => setLocale((current) => current === "en" ? "zh-TW" : "en")}>
            <span lang="en" className={locale === "en" ? "is-active" : ""}>ENG</span>
            <span className="language-toggle-track" aria-hidden="true"><span className="language-toggle-thumb" /></span>
            <span lang="zh-TW" className={locale === "zh-TW" ? "is-active" : ""}>繁中</span>
          </button>
        </div>
        <span className="eyebrow">{text.eyebrow}</span>
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
        <span className="language-note">{text.voiceNote}</span>
      </header>
      <div className="character-grid" role="group" aria-label={text.chooseBird}>
        {characters.map((bird) => <CharacterCard locale={locale} key={bird.id} id={bird.id} selected={selected === bird.id} session={getSession(bird.id)} groupState={selected === "group" ? groupState : null} onSelect={() => select(bird.id)} />)}
      </div>
      <div className="mode-row"><p>{text.individualNote}</p><button className="quiet-button" aria-pressed={selected === "group"} onClick={() => select("group")}>{text.group}</button></div>
      <Conversation locale={locale} key={selected} id={selected} session={session} onReference={() => { if (selected !== "group") setReference(selected); }} />
      <footer>{text.footer}</footer>
    </div>
    {reference && <div className="reference-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="reference-title" className="reference-dialog">
      <h2 id="reference-title">{formatText(text.referenceTitle, { name: characters.find((bird) => bird.id === reference)?.[locale === "en" ? "englishName" : "name"] ?? "" })}</h2>
      <p>{text.referenceNote}</p>
      <img src={`/characters/${reference}/turnaround.png`} alt={text.referenceAlt} />
      <button className="primary-button" autoFocus onClick={() => setReference(null)}>{text.closeReference}</button>
    </section></div>}
    </main>
  );
}

function CharacterCard({ id, selected, session, groupState, onSelect, locale }: { locale: Locale; id: CharacterId; selected: boolean; session: CharacterSession; groupState: SessionSnapshot | null; onSelect: () => void; }) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const bird = characters.find((character) => character.id === id)!;
  const phase = characterDisplayPhase(id, state, groupState);
  const text = translations[locale];
  const species = locale === "en" ? bird.englishName : bird.name;
  return <button className={`character-card ${selected ? "is-selected" : ""} phase-${phase}`} aria-pressed={selected} onClick={onSelect}>
    <div className="character-art"><BirdSprite id={id} phase={phase} name={`${nicknames[id]}, ${species}`} fallback={bird.image} unavailableText={text.animationUnavailable} /></div>
    <span className="character-species">{species}</span><strong>{nicknames[id]}</strong>
    <span className={`phase-label ${phase === "speaking" ? "is-speaking" : ""}`}>{text.phases[phase]}</span>
  </button>;
}

function Conversation({ id, session, onReference, locale }: { locale: Locale; id: Selection; session: CharacterSession; onReference: () => void; }) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const text = translations[locale];
  const name = id === "group" ? text.groupName : nicknames[id];
  const error = state.error ? localizeError(state.error, locale) : null;
  useEffect(() => { session.connect(); return () => session.disconnect(); }, [session]);
  return <section className="conversation" aria-label={formatText(text.conversationLabel, { name })}>
    <div className="conversation-heading"><div><span className="eyebrow">{text.conversationEyebrow}</span><h2>{formatText(text.conversationTitle, { name })}</h2></div><span className={`connection ${state.connected ? "online" : ""}`}>{state.connected ? text.connected : text.disconnected}</span></div>
    {id === "group" && <p className="group-note">{text.groupNote}</p>}
    <div className="call-status" role="status">{state.starting ? text.openingMic : text.phases[state.phase]}</div>
    <div className="call-actions">
      {!state.active ? <button className="primary-button" disabled={!state.connected || state.starting} onClick={() => void session.start()}>{state.starting ? text.starting : text.start}</button>
        : <><button className="secondary-button" onClick={() => session.toggleMute()}>{state.muted ? text.unmute : text.mute}</button><button className="primary-button" onClick={() => session.stop()}>{text.end}</button></>}
      <button className="quiet-button" onClick={() => session.retry()} disabled={state.starting}>{text.reconnect}</button>
      {id !== "group" && <button className="quiet-button" onClick={onReference}>{text.viewReference}</button>}
    </div>
    {error && <div className="error-message" role="alert">{error.message}<button onClick={() => session.retry()}>{text.retry}</button>{error.details && <details><summary>{text.technicalDetails}</summary><p>{error.details}</p></details>}</div>}
    <p className="conversation-hint">{text.hint}</p>
    <div className="transcript" role="log" aria-label={formatText(text.transcriptLabel, { name })}>
      {!state.messages.length && <p className="empty-transcript">{text.emptyTranscript}</p>}
      {state.messages.map((message, index) => <div key={index} className={`message message-${message.role}`}><strong>{message.role === "user" ? text.you : name}</strong><p>{message.text}</p></div>)}
    </div>
    {state.interim && <p className="interim">{formatText(text.recognizing, { text: state.interim })}</p>}
  </section>;
}
