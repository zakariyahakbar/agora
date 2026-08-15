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

const TELEGRAM_URL = "https://web.telegram.org/k/#@agoraa_bot";
const SCAN_URL = "https://8004scan.io/agents/goat/82";

const FACTS = [
  { k: "Agent", v: "agora_bot · ID 82" },
  { k: "Network", v: "GOAT mainnet · chain 2345" },
  { k: "Registry", v: "ERC-8004" },
  { k: "Wallet", v: "0x1B6602f2F3dFd75E7Cbe2508Cd4b7f02Dc131F06", mono: true },
  { k: "Settled", v: "1.00 USDC.e · block 13,770,302" },
];

const SUGGESTIONS = [
  "What is your agent ID and who registered you?",
  "Which wallet do you hold?",
  "Walk me through the x402 payment you settled.",
  "What can I actually buy on Agora right now?",
];

const GREETING =
  "gm. I'm the Agora agent. I hold my own wallet on GOAT mainnet and I've settled a payment over x402. Ask me about my identity, my wallet, or that transaction.";

const EASE = [0.16, 1, 0.3, 1];

/* ── Background video, matched to the homepage treatment ─────────── */
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

function stamp() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/* ── Gate ─────────────────────────────────────────────────────────── */
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
      initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -14, scale: 0.985, filter: "blur(5px)" }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <span className={styles.cardEdge} aria-hidden />
      <iframe
        name="agora_waitlist_sink"
        title="waitlist sink"
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: "absolute", width: 1, height: 1, border: 0, opacity: 0, pointerEvents: "none" }}
      />

      <div className={styles.gateInner}>
        <p className={styles.gateEyebrow}>Waitlist · Early access</p>
        <h2 className={styles.gateTitle}>Talk to the agent</h2>
        <p className={styles.gateBody}>
          The live agent runs on real infrastructure and costs credits per message, so it opens to
          the waitlist first. Leave your email and it unlocks right here.
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
          <button type="submit" className={styles.gateBtn} disabled={going}>
            <span className={styles.gateBtnGlow} aria-hidden />
            <span>{going ? "Unlocking…" : "Unlock the agent"}</span>
          </button>
        </form>

        <AnimatePresence>
          {err && (
            <motion.p
              className={styles.gateErr}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >{err}</motion.p>
          )}
        </AnimatePresence>

        <p className={styles.gateFine}>
          No spam, one email when accounts open. Prefer not to? The{" "}
          <Link href="/#agent" className={styles.gateLink}>recorded demo</Link> is open to everyone.
        </p>
      </div>
    </motion.div>
  );
}

/* ── Chat ─────────────────────────────────────────────────────────── */
function Chat() {
  const [msgs, setMsgs] = useState([{ role: "bot", text: GREETING, at: stamp() }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [errText, setErrText] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, sending, errText]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 640);
    return () => clearTimeout(t);
  }, []);

  const send = async (e, override) => {
    e?.preventDefault?.();
    const text = (override ?? input).trim();
    if (!text || sending) return;
    setErrText("");
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
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  };

  const fresh = msgs.length === 1 && !errText;

  return (
    <motion.div
      className={styles.chat}
      initial={{ opacity: 0, y: 18, filter: "blur(7px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <span className={styles.cardEdge} aria-hidden />

      <header className={styles.chatHead}>
        <img className={styles.chatAv} src="/mylogo.png" alt="" draggable={false} />
        <div className={styles.chatHeadText}>
          <p className={styles.chatName}>agora_bot</p>
          <p className={styles.chatStatus}>
            <span className={`${styles.dot} ${errText ? styles.dotDown : ""}`} />
            {sending ? "thinking…" : errText ? "unavailable" : "live · GOAT mainnet"}
          </p>
        </div>
        <a className={styles.chatHeadBtn} href={SCAN_URL} target="_blank" rel="noopener noreferrer">Verify ↗</a>
      </header>

      <div className={styles.chatScroll} ref={scrollRef}>
        <div className={styles.chatStream}>
          {msgs.map((m, i) => {
            const prev = msgs[i - 1];
            const grouped = prev && prev.role === m.role && !prev.streaming;
            return (
              <motion.div
                key={i}
                className={`${styles.msg} ${grouped ? styles.msgGrouped : ""}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, ease: EASE }}
              >
                <div className={styles.msgAvCol}>
                  {!grouped && (
                    m.role === "bot"
                      ? <img className={styles.msgAv} src="/mylogo.png" alt="" draggable={false} />
                      : <span className={styles.msgAvYou}>You</span>
                  )}
                </div>
                <div className={styles.msgBody}>
                  {!grouped && (
                    <p className={styles.msgMeta}>
                      <span className={m.role === "bot" ? styles.msgWhoBot : styles.msgWhoYou}>
                        {m.role === "bot" ? "agora_bot" : "you"}
                      </span>
                      <span className={styles.msgTime}>{m.at}</span>
                    </p>
                  )}
                  <p className={styles.msgText}>
                    {m.text}
                    {m.streaming && !m.text && <span className={styles.typing}><i /><i /><i /></span>}
                    {m.streaming && m.text && <span className={styles.caret} />}
                  </p>
                </div>
              </motion.div>
            );
          })}

          <AnimatePresence>
            {errText && (
              <motion.div
                className={styles.notice}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.36, ease: EASE }}
              >
                <p className={styles.noticeTitle}>{errText}</p>
                <p className={styles.noticeBody}>
                  You&apos;re on the waitlist, that part went through. The agent also runs on Telegram,
                  and the settled payment is on-chain either way.
                </p>
                <div className={styles.noticeRow}>
                  <a className={styles.noticeBtn} href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">Try it on Telegram</a>
                  <a className={styles.noticeBtn} href={SCAN_URL} target="_blank" rel="noopener noreferrer">See agent 82 on-chain</a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {fresh && (
          <motion.div
            className={styles.chips}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            {SUGGESTIONS.map((s, i) => (
              <motion.button
                key={s}
                className={styles.chip}
                onClick={(e) => send(e, s)}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, ease: EASE, delay: 0.32 + i * 0.06 }}
              >{s}</motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <form className={styles.composer} onSubmit={send}>
        <input
          ref={inputRef}
          className={styles.composerInput}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message agora_bot"
          maxLength={2000}
          disabled={sending}
          aria-label="Message the agent"
        />
        <button className={styles.composerBtn} type="submit" disabled={sending || !input.trim()} aria-label="Send">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h13M12 6l6 6-6 6" />
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
      <BgVideo />

      <nav className={styles.nav}>
        <Link href="/" className={styles.navBack}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          agora
        </Link>
        <div className={styles.navRight}>
          <a className={styles.navLink} href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">Telegram</a>
          <Link className={styles.navLink} href="/square">The Square</Link>
        </div>
      </nav>

      <div className={styles.wrap}>
        <motion.header
          className={styles.head}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <p className={styles.eyebrow}>Live Agent</p>
          <h1 className={styles.title}>
            An agent that holds<br />
            <em className={styles.titleEm}>its own wallet.</em>
          </h1>
          <p className={styles.sub}>
            Agent 82 is registered on-chain under ERC-8004 on GOAT mainnet and has settled a real
            payment over x402. Ask it about any of that. It answers for itself.
          </p>
        </motion.header>

        <div className={styles.grid}>
          <section className={styles.mainCol}>
            {ready && (
              <AnimatePresence mode="wait">
                {unlocked
                  ? <Chat key="chat" />
                  : <Gate key="gate" onUnlock={unlock} />}
              </AnimatePresence>
            )}
            {ready && unlocked && (
              <p className={styles.fine}>Rate limited to 10 messages a minute.</p>
            )}
          </section>

          <motion.aside
            className={styles.side}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.14 }}
          >
            <span className={styles.cardEdge} aria-hidden />
            <p className={styles.sideTitle}>On-chain identity</p>
            <dl className={styles.facts}>
              {FACTS.map((f) => (
                <div key={f.k} className={styles.fact}>
                  <dt className={styles.factK}>{f.k}</dt>
                  <dd className={`${styles.factV} ${f.mono ? styles.factMono : ""}`}>{f.v}</dd>
                </div>
              ))}
            </dl>
            <a className={styles.sideLink} href={SCAN_URL} target="_blank" rel="noopener noreferrer">Verify on 8004scan ↗</a>
            <p className={styles.sideNote}>Every one of these is checkable without asking us for anything.</p>
          </motion.aside>
        </div>
      </div>
    </main>
  );
}
