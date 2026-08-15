"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./page.module.css";
import {
  WAITLIST_ACTION,
  WAITLIST_EMAIL_FIELD,
  EMAIL_RE,
  useWaitlistUnlock,
} from "../lib/waitlist";

const EASE = [0.16, 1, 0.3, 1];

const EMOJI = [
  "😀","😅","😂","🙂","😉","😍","🤔","🤨","😐","😴",
  "👍","👎","🙌","👏","🤝","🙏","💪","✌️","👀","🫡",
  "🔥","✨","⚡","💡","🎯","🚀","📈","💰","🪙","🧾",
  "🤖","🧠","🔗","🔒","✅","❌","⏳","📎","📊","🛰️",
];

function stamp() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/* ── Background video, matched to the homepage ─────────────────── */
function BgVideo() {
  const vRef = useRef(null);
  useEffect(() => {
    const v = vRef.current;
    if (!v) return;
    v.play().catch(() => {});
    const onEnded = () => { v.currentTime = 0; v.play().catch(() => {}); };
    v.addEventListener("ended", onEnded);
    return () => v.removeEventListener("ended", onEnded);
  }, []);
  return (
    <div className={styles.bg} aria-hidden>
      <video ref={vRef} className={styles.bgVideo} muted playsInline preload="auto">
        <source src="/bg-agora-web.mp4" type="video/mp4" />
      </video>
      <div className={styles.bgVeil} />
    </div>
  );
}

/* ── Gate ───────────────────────────────────────────────────────── */
function Gate({ onUnlock }) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [going, setGoing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 420);
    return () => clearTimeout(t);
  }, []);

  const submit = (e) => {
    if (!EMAIL_RE.test(email.trim())) {
      e.preventDefault();
      setErr("That email doesn't look right.");
      return;
    }
    setErr("");
    setGoing(true);
    setTimeout(onUnlock, 520);
  };

  return (
    <motion.div
      className={styles.gate}
      initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.985, filter: "blur(6px)" }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <iframe
        name="agora_waitlist_sink"
        title="waitlist sink"
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: "absolute", width: 1, height: 1, border: 0, opacity: 0, pointerEvents: "none" }}
      />
      <img className={styles.gateMark} src="/mylogo.png" alt="" draggable={false} />
      <h1 className={styles.gateTitle}>Talk to the agent</h1>
      <p className={styles.gateBody}>Leave your email and the chat opens right here.</p>

      <form
        className={styles.gateForm}
        action={WAITLIST_ACTION}
        method="POST"
        target="agora_waitlist_sink"
        onSubmit={submit}
      >
        <input
          ref={inputRef}
          className={styles.gateInput}
          name={WAITLIST_EMAIL_FIELD}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@domain.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (err) setErr(""); }}
          required
          aria-label="Email"
        />
        <button type="submit" className={styles.gateBtn} disabled={going}>
          {going ? "Opening…" : "Continue"}
        </button>
      </form>

      <AnimatePresence>
        {err && (
          <motion.p className={styles.gateErr}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}>{err}</motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Emoji picker ───────────────────────────────────────────────── */
function EmojiPicker({ onPick, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      className={styles.emojiPop}
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.22, ease: EASE }}
    >
      {EMOJI.map((e) => (
        <button key={e} type="button" className={styles.emojiBtn} onClick={() => onPick(e)}>{e}</button>
      ))}
    </motion.div>
  );
}

/* ── Chat ───────────────────────────────────────────────────────── */
function Chat() {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [errText, setErrText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOK, setVoiceOK] = useState(false);

  const scrollRef = useRef(null);
  const taRef = useRef(null);
  const recRef = useRef(null);
  const baseRef = useRef("");

  /* auto-scroll */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, sending, errText]);

  /* auto-grow the composer */
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 132) + "px";
  }, [input]);

  useEffect(() => {
    const t = setTimeout(() => taRef.current?.focus(), 620);
    return () => clearTimeout(t);
  }, []);

  /* speech-to-text, where the browser supports it */
  useEffect(() => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";

    rec.onresult = (ev) => {
      let text = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) text += ev.results[i][0].transcript;
      const base = baseRef.current;
      setInput((base ? base.replace(/\s*$/, "") + " " : "") + text.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recRef.current = rec;
    setVoiceOK(true);
    return () => { try { rec.abort(); } catch {} };
  }, []);

  const toggleVoice = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) { try { rec.stop(); } catch {} setListening(false); return; }
    baseRef.current = input;
    try { rec.start(); setListening(true); } catch { setListening(false); }
  }, [listening, input]);

  const send = async (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || sending) return;

    if (listening) { try { recRef.current?.stop(); } catch {} setListening(false); }
    setErrText("");
    setEmojiOpen(false);
    setSending(true);
    setInput("");
    setMsgs((p) => [...p, { role: "user", text, at: stamp() }, { role: "bot", text: "", at: stamp(), streaming: true }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok || !res.body) {
        let msg = "The agent is unavailable right now.";
        try { const j = await res.json(); if (j?.message) msg = j.message; } catch {}
        setErrText(msg);
        setMsgs((p) => p.filter((m) => !m.streaming));
        setSending(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", full = "", done = false;
      while (!done) {
        const { value, done: sd } = await reader.read();
        if (sd) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") { done = true; break; }
          try {
            const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length) {
              full += delta;
              setMsgs((p) => {
                const c = [...p];
                for (let i = c.length - 1; i >= 0; i--) {
                  if (c[i].streaming) { c[i] = { ...c[i], text: full }; break; }
                }
                return c;
              });
            }
          } catch {}
        }
      }
      setMsgs((p) => p.map((m) => (m.streaming ? { ...m, streaming: false } : m)));
    } catch {
      setErrText("Connection failed. Check your network and try again.");
      setMsgs((p) => p.filter((m) => !m.streaming));
    } finally {
      setSending(false);
      setTimeout(() => taRef.current?.focus(), 60);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); }
  };

  return (
    <motion.div
      className={styles.chat}
      initial={{ opacity: 0, y: 16, filter: "blur(7px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <header className={styles.head}>
        <img className={styles.headAv} src="/mylogo.png" alt="" draggable={false} />
        <div className={styles.headText}>
          <p className={styles.headName}>agora_bot</p>
          <p className={styles.headSub}>
            <span className={`${styles.dot} ${errText ? styles.dotDown : ""}`} />
            {sending ? "typing…" : errText ? "unavailable" : "agent 82 · GOAT mainnet"}
          </p>
        </div>
      </header>

      <div className={styles.scroll} ref={scrollRef}>
        {msgs.length === 0 && !errText && (
          <div className={styles.empty}>
            <img className={styles.emptyMark} src="/mylogo.png" alt="" draggable={false} />
            <p className={styles.emptyText}>Say something to agent 82.</p>
          </div>
        )}

        <div className={styles.stream}>
          {msgs.map((m, i) => {
            const prev = msgs[i - 1];
            const grouped = prev && prev.role === m.role && !prev.streaming;
            return (
              <motion.div
                key={i}
                className={`${styles.row} ${m.role === "user" ? styles.rowUser : ""} ${grouped ? styles.rowGrouped : ""}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: EASE }}
              >
                <div className={`${styles.bubble} ${m.role === "user" ? styles.bubbleUser : styles.bubbleBot}`}>
                  {m.streaming && !m.text
                    ? <span className={styles.typing}><i /><i /><i /></span>
                    : <span className={styles.text}>{m.text}{m.streaming && <span className={styles.caret} />}</span>}
                </div>
                {!m.streaming && <span className={styles.time}>{m.at}</span>}
              </motion.div>
            );
          })}

          <AnimatePresence>
            {errText && (
              <motion.div className={styles.notice}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.34, ease: EASE }}>
                {errText}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <form className={styles.composer} onSubmit={send}>
        <div className={styles.field}>
          <button
            type="button"
            className={`${styles.iconBtn} ${emojiOpen ? styles.iconBtnOn : ""}`}
            onClick={() => setEmojiOpen((v) => !v)}
            aria-label="Emoji"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
              <circle cx="9" cy="9.8" r=".9" fill="currentColor" stroke="none" />
              <circle cx="15" cy="9.8" r=".9" fill="currentColor" stroke="none" />
            </svg>
          </button>

          <textarea
            ref={taRef}
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={listening ? "Listening…" : "Message agora_bot"}
            rows={1}
            maxLength={2000}
            disabled={sending}
            aria-label="Message"
          />

          {voiceOK && (
            <button
              type="button"
              className={`${styles.iconBtn} ${listening ? styles.iconBtnRec : ""}`}
              onClick={toggleVoice}
              aria-label={listening ? "Stop dictation" : "Dictate"}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </button>
          )}

          <button className={styles.send} type="submit" disabled={sending || !input.trim()} aria-label="Send">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h13M12 6l6 6-6 6" />
            </svg>
          </button>

          <AnimatePresence>
            {emojiOpen && (
              <EmojiPicker
                onPick={(e) => { setInput((v) => v + e); taRef.current?.focus(); }}
                onClose={() => setEmojiOpen(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </form>
    </motion.div>
  );
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function AgentPage() {
  const { unlocked, unlock, ready } = useWaitlistUnlock();

  return (
    <main className={styles.page}>
      <BgVideo />

      <nav className={styles.nav}>
        <Link href="/" className={styles.back}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          agora
        </Link>
      </nav>

      <div className={styles.stage}>
        {ready && (
          <AnimatePresence mode="wait">
            {unlocked ? <Chat key="chat" /> : <Gate key="gate" onUnlock={unlock} />}
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
