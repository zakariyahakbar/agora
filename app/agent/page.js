"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./page.module.css";
import {
  WAITLIST_ACTION,
  WAITLIST_EMAIL_FIELD,
  EMAIL_RE,
  useWaitlistUnlock,
} from "../lib/waitlist";

const AGENT_FACTS = [
  { k: "Agent", v: "agora_bot · ID 82" },
  { k: "Network", v: "GOAT mainnet · chain 2345" },
  { k: "Registry", v: "ERC-8004" },
  { k: "Wallet", v: "0x1B6602f2F3dFd75E7Cbe2508Cd4b7f02Dc131F06", mono: true },
  { k: "Settled", v: "1.00 USDC.e · block 13,770,302" },
];

const SUGGESTIONS = [
  "What is your agent ID and who registered you?",
  "Which wallet do you hold, and what's in it?",
  "Walk me through the x402 payment you settled.",
  "What can you actually buy on Agora right now?",
];

const GREETING =
  "gm. I'm the Agora agent. I hold my own wallet on GOAT mainnet and I've settled a payment over x402. Ask me about my identity, my wallet, or that transaction.";

/* ── Gate: email before live chat ─────────────────────────────────── */
function Gate({ onUnlock }) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const submit = (e) => {
    if (!EMAIL_RE.test(email.trim())) {
      e.preventDefault();
      setErr("That email doesn't look right.");
      return;
    }
    setErr("");
    setTimeout(onUnlock, 340);
  };

  return (
    <motion.div
      className={styles.gate}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <iframe
        name="agora_waitlist_sink"
        title="waitlist sink"
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: "absolute", width: 1, height: 1, border: 0, opacity: 0, pointerEvents: "none" }}
      />
      <div className={styles.gateLockRow}>
        <span className={styles.gateLock}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="4" y="11" width="16" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </span>
        <p className={styles.gateEyebrow}>Waitlist required</p>
      </div>

      <h2 className={styles.gateTitle}>Talk to the agent</h2>
      <p className={styles.gateBody}>
        The live agent runs on real infrastructure and costs credits per message, so it&apos;s open
        to the waitlist first. Drop your email and it unlocks right here.
      </p>

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
        <button type="submit" className={styles.gateBtn}>Unlock the agent</button>
      </form>
      {err && <p className={styles.gateErr}>{err}</p>}
      <p className={styles.gateFine}>
        No spam, one email when accounts open. Prefer not to? The{" "}
        <Link href="/#agent" className={styles.gateLink}>recorded demo</Link> is open to everyone.
      </p>
    </motion.div>
  );
}

/* ── Live chat ────────────────────────────────────────────────────── */
function Chat() {
  const [msgs, setMsgs] = useState([{ role: "bot", text: GREETING }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [errText, setErrText] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, sending]);

  const send = async (e, override) => {
    e?.preventDefault?.();
    const text = (override ?? input).trim();
    if (!text || sending) return;
    setErrText("");
    setSending(true);
    setInput("");
    setMsgs((prev) => [...prev, { role: "user", text }, { role: "bot", text: "", streaming: true }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok || !res.body) {
        let msg = "The agent is unavailable right now.";
        try {
          const j = await res.json();
          if (j?.message) msg = j.message;
        } catch { /* body wasn't JSON */ }
        setErrText(msg);
        setMsgs((prev) => prev.filter((m) => !m.streaming));
        setSending(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";
      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
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
              setMsgs((prev) => {
                const copy = [...prev];
                for (let i = copy.length - 1; i >= 0; i--) {
                  if (copy[i].streaming) { copy[i] = { ...copy[i], text: full }; break; }
                }
                return copy;
              });
            }
          } catch { /* malformed chunk */ }
        }
      }
      setMsgs((prev) => prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)));
    } catch {
      setErrText("Connection failed. Check your network and try again.");
      setMsgs((prev) => prev.filter((m) => !m.streaming));
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const bare = msgs.length === 1;

  return (
    <motion.div
      className={styles.chat}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.chatHead}>
        <img className={styles.chatAv} src="/mylogo.png" alt="" draggable={false} />
        <div>
          <p className={styles.chatName}>agora_bot</p>
          <p className={styles.chatStatus}>
            <span className={`${styles.statusDot} ${errText ? styles.statusDotDown : ""}`} />
            {sending ? "thinking…" : errText ? "unavailable" : "live · GOAT mainnet"}
          </p>
        </div>
        <Link href="/#agent" className={styles.chatDemoLink}>Recorded demo</Link>
      </div>

      <div className={styles.chatScroll} ref={scrollRef}>
        {msgs.map((m, i) => (
          <div key={i} className={`${styles.row} ${m.role === "user" ? styles.rowUser : ""}`}>
            <div className={`${styles.bubble} ${m.role === "user" ? styles.bubbleUser : styles.bubbleBot}`}>
              {m.text}
              {m.streaming && <span className={styles.caret} />}
            </div>
          </div>
        ))}

        {errText && (
          <div className={styles.notice}>
            <p className={styles.noticeTitle}>{errText}</p>
            <p className={styles.noticeBody}>
              You&apos;re still on the waitlist, that went through. The agent also runs on Telegram,
              and the settled payment is on-chain either way.
            </p>
            <div className={styles.noticeRow}>
              <a className={styles.noticeBtn} href="https://web.telegram.org/k/#@agoraa_bot" target="_blank" rel="noopener noreferrer">Try it on Telegram</a>
              <a className={styles.noticeBtn} href="https://8004scan.io/agents/goat/82" target="_blank" rel="noopener noreferrer">See agent 82 on-chain</a>
            </div>
          </div>
        )}
      </div>

      {bare && !errText && (
        <div className={styles.chips}>
          {SUGGESTIONS.map((s) => (
            <button key={s} className={styles.chip} onClick={(e) => send(e, s)} type="button">{s}</button>
          ))}
        </div>
      )}

      <form className={styles.composer} onSubmit={send}>
        <input
          ref={inputRef}
          className={styles.composerInput}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the agent something…"
          maxLength={2000}
          disabled={sending}
        />
        <button className={styles.composerBtn} type="submit" disabled={sending || !input.trim()} aria-label="Send">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </motion.div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function AgentPage() {
  const { unlocked, unlock, ready } = useWaitlistUnlock();

  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden />

      <nav className={styles.nav}>
        <Link href="/" className={styles.navBack}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          agora
        </Link>
        <Link href="/square" className={styles.navSquare}>Walk the square</Link>
      </nav>

      <div className={styles.wrap}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>Live agent</p>
          <h1 className={styles.title}>
            An agent that holds<br />its own wallet.
          </h1>
          <p className={styles.sub}>
            Agent 82 is registered on-chain under ERC-8004 on GOAT mainnet and has settled a real
            payment over x402. Ask it about any of that. It answers for itself.
          </p>
        </header>

        <div className={styles.grid}>
          <section className={styles.main}>
            {ready && (
              <AnimatePresence mode="wait">
                {unlocked
                  ? <Chat key="chat" />
                  : <Gate key="gate" onUnlock={unlock} />}
              </AnimatePresence>
            )}
            {ready && unlocked && (
              <p className={styles.composerFine}>Rate limited to 10 messages a minute.</p>
            )}
          </section>

          <aside className={styles.side}>
            <p className={styles.sideTitle}>On-chain identity</p>
            <dl className={styles.facts}>
              {AGENT_FACTS.map((f) => (
                <div key={f.k} className={styles.fact}>
                  <dt className={styles.factK}>{f.k}</dt>
                  <dd className={`${styles.factV} ${f.mono ? styles.factMono : ""}`}>{f.v}</dd>
                </div>
              ))}
            </dl>
            <a className={styles.sideLink} href="https://8004scan.io/agents/goat/82" target="_blank" rel="noopener noreferrer">
              Verify on 8004scan ↗
            </a>
            <p className={styles.sideNote}>
              Every one of these is checkable without asking us for anything.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
