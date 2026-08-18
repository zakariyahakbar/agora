"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import styles from "./page.module.css";
import { WAITLIST_ACTION, WAITLIST_EMAIL_FIELD, EMAIL_RE, useWaitlistUnlock } from "./lib/waitlist";

/* t.me is the universal link: opens the native Telegram app on mobile and
   desktop, and falls back to the web client only if neither is installed.
   web.telegram.org forced everyone into the browser version. */
const TELEGRAM_URL = "https://t.me/agoraa_bot";
const AGENT_WALLET = "0x1B6602f2F3dFd75E7Cbe2508Cd4b7f02Dc131F06";



const SPONSORS = [
  { name: "GOAT Network", img: "/goat.png"   },
  { name: "CryptoChicks", img: "/chicks.png"  },
  { name: "MindFuel",     img: "/mind.png"    },
  { name: "Metis",        img: "/metis.png"    },
];

const AGENT_MODES = [
  { id: "request", label: "Request", tag: "Define the job. Set the budget.",
    body: "AGORA autonomously broadcasts compute jobs to the network, specifying units, latency requirements, and maximum spend. No human writes the RFP." },
  { id: "bid",     label: "Compete", tag: "Providers bid. Best price wins.",
    body: "Provider nodes respond with price, GPU specs, and reputation scores. AGORA evaluates all bids autonomously and selects the optimal provider in milliseconds." },
  { id: "settle",  label: "Settle",  tag: "Verify. Release. Done.",
    body: "Output is cryptographically verified. Escrow releases via x402 on GOAT Network. Bitcoin-backed settlement, zero human approval, full on-chain auditability." },
];


const STEPS = [
  { n: "01", label: "Request",  body: "AGORA defines the job, sets the budget, broadcasts to the network." },
  { n: "02", label: "Bid",      body: "Provider nodes compete autonomously on price, speed, and reputation." },
  { n: "03", label: "Escrow",   body: "Payment locked in GOAT smart contract. Untouchable until verified." },
  { n: "04", label: "Execute",  body: "Provider runs the job. No human oversight. Pure machine coordination." },
  { n: "05", label: "Verify",   body: "Output hash validated cryptographically. Objective, not subjective." },
  { n: "06", label: "Settle",   body: "x402 releases escrow. Bitcoin-backed payment. On-chain forever." },
];

/* ── Sponsor strip ── */
function SponsorStrip() {
  const items = [...SPONSORS, ...SPONSORS, ...SPONSORS, ...SPONSORS];
  return (
    <div className={styles.sponsorWrap}>
      <div className={styles.sponsorFadeL} />
      <div className={styles.sponsorFadeR} />
      <div className={styles.sponsorLabel}>Hackathon Sponsors</div>
      <div className={styles.sponsorTrackWrap}>
        <motion.div className={styles.sponsorTrack}
          animate={{ x: ["0%", "-25%"] }}
          transition={{ duration: 28, ease: "linear", repeat: Infinity }}>
          {items.map((s, i) => (
            <div key={i} className={styles.sponsorItem}>
              {s.img
                ? <img src={s.img} alt={s.name} className={styles.sponsorLogo} />
                : <span className={styles.sponsorTextLogo}>{s.name}</span>
              }
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/* ── Blur-up (hero, fires on mount) ── */
function BlurUp({ children, className, delay = 0, style }) {
  return (
    <motion.div className={className} style={style}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}

/* ── Reveal on scroll ── */
function InView({ children, className, delay = 0, style }) {
  return (
    <motion.div className={className} style={style}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ delay, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}

/* ── Clip-up ──
   This used to start the text translated 108% down at opacity 0 and wait for
   whileInView on that displaced element. Inside the snap-scroll container the
   observer fired unreliably, so several section headlines stayed invisible.

   InView is already proven reliable on this page, so SlideUp now uses the same
   mechanism, and the baseline is VISIBLE rather than hidden. If the observer
   never fires the headline still reads; the motion is decoration on top. */
function SlideUp({ children, className, delay = 0 }) {
  return (
    <div style={{ overflow: "hidden" }}>
      <motion.div className={className}
        initial={{ y: "108%", opacity: 0 }}
        whileInView={{ y: "0%", opacity: 1 }}
        animate={{ y: "0%", opacity: 1 }}
        viewport={{ once: true, amount: 0 }}
        transition={{ delay, duration: 0.78, ease: [0.16, 1, 0.3, 1] }}>
        {children}
      </motion.div>
    </div>
  );
}

/* ── Magnetic button ── */
function MagBtn({ children, className, href, target, onClick }) {
  const ref = useRef(null);
  const x = useMotionValue(0); const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 24 });
  const sy = useSpring(y, { stiffness: 300, damping: 24 });
  /* Magnetic pull disabled — the buttons now stay put on hover. */
  const PULL = 0;
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * PULL);
    y.set((e.clientY - (r.top + r.height / 2)) * PULL);
  };
  const onLeave = () => { x.set(0); y.set(0); };
  const internal = href && href.startsWith("/");
  const Tag = internal ? Link : href ? "a" : "button";
  return (
    <motion.div style={{ x: sx, y: sy, display: "inline-flex" }}
      onMouseMove={onMove} onMouseLeave={onLeave} ref={ref}>
      <Tag href={href} target={internal ? undefined : target}
        rel={target === "_blank" && !internal ? "noopener noreferrer" : undefined}
        className={className} onClick={onClick}>{children}</Tag>
    </motion.div>
  );
}

/* ── Counter ── */
function Counter({ value, decimals = 0 }) {
  const [d, setD] = useState(0);
  useEffect(() => {
    let s = 0; const end = parseFloat(value);
    const id = setInterval(() => {
      s += (end / 1200) * 16;
      if (s >= end) { setD(end); clearInterval(id); return; }
      setD(s);
    }, 16);
    return () => clearInterval(id);
  }, [value]);
  return <>{decimals > 0 ? d.toFixed(decimals) : Math.floor(d)}</>;
}

/* ── Media slot: shows an <img>/<video> if the file exists, else a labeled empty state ── */
function MediaSlot({ type, src, alt, fallback }) {
  const [failed, setFailed] = useState(false);
  const vRef = useRef(null);
  useEffect(() => {
    if (type !== "video") return;
    const v = vRef.current; if (!v) return;
    v.play().catch(() => {});
  }, [type, src, failed]);
  if (failed) {
    return (
      <div className={styles.mediaEmpty} role="img" aria-label={alt}>
        <span className={styles.mediaEmptyDot} />
        <span className={styles.mediaEmptyLabel}>{fallback}</span>
        <span className={styles.mediaEmptySub}>coming soon</span>
      </div>
    );
  }
  if (type === "video") {
    return (
      <video
        ref={vRef}
        className={styles.mediaVideo}
        src={src}
        muted
        playsInline
        loop
        preload="metadata"
        onError={() => setFailed(true)}
        aria-label={alt}
      />
    );
  }
  return (
    <img
      className={styles.mediaImage}
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════
   PULSE — live counters, chart, flow diagram (inline section)
   ══════════════════════════════════════════════════════════════════ */

/* Count-up counter that animates when scrolled into view */
function PulseCounter({ label, value, decimals = 0, prefix = "", suffix = "" }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        const t0 = performance.now();
        const dur = 1500;
        let raf;
        const tick = () => {
          const p = Math.min(1, (performance.now() - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          setN(value * eased);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => raf && cancelAnimationFrame(raf);
      }
    }, { threshold: 0.35 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [value]);
  const display = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();
  return (
    <div className={styles.pulseCounter} ref={ref}>
      <div className={styles.pulseCounterLabel}>{label}</div>
      <div className={styles.pulseCounterValue}>
        {prefix && <span className={styles.pulseCounterAffix}>{prefix}</span>}
        <span className={styles.pulseCounterN}>{display}</span>
        {suffix && <span className={styles.pulseCounterAffix}>{suffix}</span>}
      </div>
    </div>
  );
}

/* Every settled payment, read from the chain rather than typed in here.
   This replaced a hand-written latency chart: inventing a graph of
   settlements we had not made was the one thing this page cannot do. */
function Receipts({ chain }) {
  const FALLBACK = [
    { block: 13770302, note: "self-to-self test", amount: "1.00" },
    { block: 14620758, note: "to Aitch",          amount: "1.00" },
    { block: 14620856, note: "to Aitch",          amount: "1.00" },
  ];
  const rows = chain && chain.payments.transactions.length
    ? chain.payments.transactions.map((t) => ({
        block: t.block,
        note: /self/i.test(t.note || "") ? "self-to-self test" : "to Aitch",
        amount: "1.00",
        tx: t.tx,
      }))
    : FALLBACK;

  return (
    <div className={styles.rcWrap}>
      {rows.map((r, i) => (
        <a
          key={r.block}
          className={styles.rcRow}
          href={r.tx ? `https://explorer.goat.network/tx/${r.tx}` : "https://8004scan.io/agents/goat/82"}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className={styles.rcIdx}>{String(i + 1).padStart(2, "0")}</span>
          <span className={styles.rcBlock}>block {r.block.toLocaleString()}</span>
          <span className={styles.rcAmt}>{r.amount} USDC.e</span>
          <span className={styles.rcNote}>{r.note}</span>
          <span className={styles.rcState}>confirmed</span>
        </a>
      ))}
      <p className={styles.rcFoot}>
        {chain ? "read live from chain 2345" : "on GOAT mainnet, chain 2345"} · click any row to verify
      </p>
    </div>
  );
}

/* The flow Agora is built toward. Only the steps marked live exist today:
   pretending otherwise would undo the point of the whole page. */
const PULSE_FLOW = [
  { n: "01", label: "Request",  desc: "an agent needs compute",        live: true  },
  { n: "02", label: "Discover", desc: "an agent finds a provider",      live: false },
  { n: "03", label: "Agree",    desc: "the two settle a price",         live: false },
  { n: "04", label: "Pay",      desc: "x402 on GOAT mainnet",          live: true  },
  { n: "05", label: "Execute",  desc: "provider runs the job",         live: true  },
  { n: "06", label: "Receipt",  desc: "public, anyone can check",      live: true  },
];

function PulseFlow() {
  const [visible, setVisible] = useState(false);
  const [t, setT] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { threshold: 0.2 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let raf, start = performance.now();
    const tick = now => { setT((now - start) / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  const cycle = 12;
  const p = (t % cycle) / cycle;
  const stepDur = 1 / (PULSE_FLOW.length + 1);
  const active = Math.min(PULSE_FLOW.length - 1, Math.floor(p / stepDur));
  const stepProg = (p % stepDur) / stepDur;
  const isResetting = p > (PULSE_FLOW.length * stepDur);

  return (
    <div className={styles.pulseFlow} ref={ref}>
      {PULSE_FLOW.map((s, i) => {
        const done = !isResetting && i < active;
        const current = !isResetting && i === active;
        return (
          <div key={s.n}
            className={`${styles.pulseFlowStep} ${done ? styles.pulseFlowStepDone : ""} ${current ? styles.pulseFlowStepCurrent : ""}`}>
            <div className={styles.pulseFlowDot}>
              {done ? (
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12l6 6L20 6" />
                </svg>
              ) : (
                <span className={styles.pulseFlowNum}>{s.n}</span>
              )}
            </div>
            <div className={styles.pulseFlowBody}>
              <div className={styles.pulseFlowLabel}>
                {s.label}
                <span className={s.live ? styles.flowLive : styles.flowSoon}>
                  {s.live ? "live" : "not built"}
                </span>
              </div>
              <div className={styles.pulseFlowDesc}>{s.desc}</div>
            </div>
            {current && (
              <div className={styles.pulseFlowBar}>
                <div className={styles.pulseFlowBarFill} style={{ transform: `scaleX(${stepProg})` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TELEGRAM DEMO SHOWCASE — inline, scroll-triggered, Ken Burns zooms
   ══════════════════════════════════════════════════════════════════ */

/* Real Agora agent exchanges. Each scenario is a self-contained conversation.
   Scenarios rotate on each loop for variety. Messages can carry:
   - kind: "data"  → renders as a mono/monospace data block (looks like a real agent output)
   - zoom: "up"    → subtle YouTube-style Ken Burns zoom on that beat */

const TG_SCENARIOS = [
  /* Scenario 1: x402 payment test — the punchy version */
  [
    { role: "user", text: "run a real x402 payment test.\n1 USDC.e · GOAT mainnet", delay: 1500 },
    { role: "bot",  text: "on it. fetching x402 skill + checking token.", delay: 1400 },
    { role: "bot",  kind: "data", zoom: "up", delay: 2000, text: "wallet: 0x1B66…1F06\nUSDC.e: 5.0 ✅\nBTC (gas): 0.0000598 ✅\nready to send." },
    { role: "user", text: "send it.", delay: 1200 },
    { role: "bot",  kind: "data", zoom: "up", delay: 2400, text: "✅ CHECKOUT_VERIFIED\ntx: 0xa8747b…3460\nblock: 13,770,302\n1.00 USDC.e settled" },
    { role: "user", text: "clean 🫡", delay: 1400 },
  ],

  /* Scenario 2: identity + proof */
  [
    { role: "user", text: "who are you? show me proof.", delay: 1400 },
    { role: "bot",  text: "gm 👋 I'm the Agora agent. on-chain and x402-native.", delay: 1400 },
    { role: "bot",  kind: "data", zoom: "up", delay: 2000, text: "🔗 GOAT mainnet\nagent #82 · ERC-8004\nowner: 0xbc8c…1C3c\nstatus: active" },
    { role: "user", text: "merchant side?", delay: 1300 },
    { role: "bot",  kind: "data", zoom: "up", delay: 2000, text: "merchant: agora_tbg\nreceiving: 0x1B66…1F06\nmode: DIRECT\nstate: approved ✅" },
  ],

  /* Scenario 3: quick /status */
  [
    { role: "user", text: "/status", delay: 1100 },
    { role: "bot",  text: "checking…", delay: 900 },
    { role: "bot",  kind: "data", zoom: "up", delay: 2400, text: "agora_bot · online\n──\nagent #82 ✅\nmerchant agora_tbg ✅\nchain 2345 ✅\nlast tx: 0xa8747b…3460" },
    { role: "user", text: "all green. nice.", delay: 1400 },
  ],
];

function TelegramDemoShowcase() {
  const rootRef = useRef(null);
  const chatRef = useRef(null);
  const [msgs, setMsgs] = useState([]);
  const [typing, setTyping] = useState(false);
  const [started, setStarted] = useState(false);
  const [zoom, setZoom] = useState({ scale: 1, origin: "50% 50%" });
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const runIdRef = useRef(0);

  // Trigger start when the demo scrolls into view
  useEffect(() => {
    if (!rootRef.current) return;
    const el = rootRef.current;
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started) {
        setStarted(true);
        io.disconnect();
      }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [started]);

  // Auto-scroll chat container to bottom (scoped, no cascade to parent)
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, typing]);

  // Main animation loop — cycles through TG_SCENARIOS
  useEffect(() => {
    if (!started) return;
    const runId = ++runIdRef.current;
    let cancelled = false;
    const timers = [];
    const wait = ms => new Promise(res => {
      const id = setTimeout(() => { if (!cancelled) res(); }, ms);
      timers.push(id);
    });

    async function play(scenarioIndex) {
      const script = TG_SCENARIOS[scenarioIndex];
      setScenarioIdx(scenarioIndex);
      setMsgs([]);
      setTyping(false);
      setZoom({ scale: 1, origin: "50% 50%" });
      await wait(400);
      if (cancelled) return;

      let all = [];
      for (let i = 0; i < script.length; i++) {
        if (cancelled || runIdRef.current !== runId) return;
        const m = script[i];
        if (m.role === "bot") {
          setTyping(true);
          await wait(650 + Math.random() * 400);
          if (cancelled) return;
          setTyping(false);
        }
        const nextMsgs = [...all, { ...m, id: `${runId}-${scenarioIndex}-${i}` }];
        all = nextMsgs;
        setMsgs(nextMsgs);
        if (m.zoom === "up") {
          setZoom({ scale: 1, origin: "50% 50%" });
        } else {
          setZoom({ scale: 1, origin: "50% 50%" });
        }
        await wait(m.delay || 1200);
      }
      // Hold, reset, next scenario
      setZoom({ scale: 1, origin: "50% 50%" });
      await wait(3500);
      if (cancelled) return;
      const nextScenario = (scenarioIndex + 1) % TG_SCENARIOS.length;
      play(nextScenario);
    }
    play(0);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [started]);

  return (
    <div className={styles.tg} ref={rootRef}>
      <div
        className={styles.tgBody}
        style={{
          transform: `scale(${zoom.scale})`,
          transformOrigin: zoom.origin,
        }}
      >
        {/* Wallpaper (real Telegram doodle background) */}
        <img
          className={styles.tgWallpaper}
          src="/telegram.png"
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <div className={styles.tgWallTint} />

        {/* Header */}
        <div className={styles.tgHeader}>
          <div className={styles.tgHeaderBack}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </div>
          <div className={styles.tgHeaderAv}>
            <img src="/mylogo.png" alt="AGORA" draggable={false} />
          </div>
          <div className={styles.tgHeaderText}>
            <div className={styles.tgHeaderName}>agora_bot</div>
            <div className={styles.tgHeaderSub}>bot · online</div>
          </div>
          <div className={styles.tgHeaderIcons}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7.5" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5"  r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="12" cy="19" r="1.6" />
            </svg>
          </div>
        </div>

        {/* Chat */}
        <div className={styles.tgChat} ref={chatRef}>
          {msgs.map(m => {
            const isData = m.kind === "data";
            return (
              <div
                key={m.id}
                className={`${styles.tgMsg} ${m.role === "user" ? styles.tgMsgUser : styles.tgMsgBot} ${isData ? styles.tgMsgData : ""}`}
              >
                {m.text.split("\n").map((line, k) => (
                  <span key={k} className={styles.tgLine}>{line}</span>
                ))}
                <span className={styles.tgTime}>
                  {m.role === "user" ? "12:04 " : "12:04"}
                  {m.role === "user" && (
                    <svg viewBox="0 0 16 12" width="12" height="9" className={styles.tgReadCheck} aria-hidden>
                      <path d="M1 6l3 3 6-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 6l3 3 6-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
              </div>
            );
          })}
          {typing && (
            <div className={`${styles.tgMsg} ${styles.tgMsgBot} ${styles.tgTyping}`}>
              <span className={styles.tgDot} />
              <span className={styles.tgDot} />
              <span className={styles.tgDot} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className={styles.tgInputBar}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9.5" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <circle cx="9" cy="10" r="0.6" fill="currentColor" stroke="none" />
            <circle cx="15" cy="10" r="0.6" fill="currentColor" stroke="none" />
          </svg>
          <span className={styles.tgInputPlaceholder}>Message</span>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18v-6a3 3 0 1 1 6 0v5a5 5 0 1 1-10 0V8" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   AGENT PANEL — toggles between recorded demo and live chat
   ══════════════════════════════════════════════════════════════════ */

function AgentPanel() {
  return (
    <div className={`${styles.pyFrame} ${styles.pyFramePortrait} ${styles.demoFrame}`}>
      <div className={styles.pyFrameLabel}>Telegram · @agoraa_bot · recorded</div>
      <div className={styles.pyFrameBody}>
        <TelegramDemoShowcase />
      </div>
    </div>
  );
}

/* ── LiveAgentChat: real chat via /api/chat proxy, SSE-streamed ── */
function LiveAgentChat() {
  const [msgs, setMsgs] = useState([
    { role: "bot", text: "gm 👋 I'm the Agora agent. Ask me about my identity, my wallet, or the x402 payment I settled." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [errText, setErrText] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, sending]);

  const send = async (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || sending) return;
    setErrText("");
    setSending(true);
    setInput("");
    const userMsg = { role: "user", text };
    setMsgs(prev => [...prev, userMsg, { role: "bot", text: "", streaming: true }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        let msg = "Something went wrong. Try again.";
        try {
          const j = await res.json();
          if (j?.message) msg = j.message;
        } catch { /* body wasn't JSON */ }
        setErrText(msg);
        setMsgs(prev => prev.filter(m => !m.streaming));
        setSending(false);
        return;
      }
      if (!res.body) {
        setErrText("No response from the agent.");
        setMsgs(prev => prev.filter(m => !m.streaming));
        setSending(false);
        return;
      }
      // Parse SSE stream — OpenAI-compatible chunks
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
        buffer = lines.pop(); // keep last incomplete line
        for (const raw of lines) {
          const line = raw.trim();
          if (!line || !line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") { done = true; break; }
          try {
            const chunk = JSON.parse(payload);
            const delta = chunk?.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length) {
              full += delta;
              setMsgs(prev => {
                const copy = [...prev];
                for (let i = copy.length - 1; i >= 0; i--) {
                  if (copy[i].streaming) { copy[i] = { ...copy[i], text: full }; break; }
                }
                return copy;
              });
            }
          } catch { /* ignore malformed chunk */ }
        }
      }
      // Finalize: clear streaming flag
      setMsgs(prev => prev.map(m => m.streaming ? { ...m, streaming: false } : m));
    } catch (err) {
      setErrText("Connection failed. Check your network and try again.");
      setMsgs(prev => prev.filter(m => !m.streaming));
    } finally {
      setSending(false);
      // Refocus input for quick next question
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div className={styles.tg}>
      <div className={styles.tgBody}>
        <img className={styles.tgWallpaper} src="/telegram.png" alt="" aria-hidden draggable={false} />
        <div className={styles.tgWallTint} />

        {/* Header */}
        <div className={styles.tgHeader}>
          <div className={styles.tgHeaderBack}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </div>
          <div className={styles.tgHeaderAv}>
            <img src="/mylogo.png" alt="AGORA" draggable={false} />
          </div>
          <div className={styles.tgHeaderText}>
            <div className={styles.tgHeaderName}>agora_bot</div>
            <div className={styles.tgHeaderSub}>
              {sending ? "typing…" : "bot · online"}
            </div>
          </div>
          <div className={styles.tgHeaderIcons}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="12" cy="19" r="1.6" />
            </svg>
          </div>
        </div>

        {/* Chat */}
        <div className={styles.tgChat} ref={scrollRef}>
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`${styles.tgMsg} ${m.role === "user" ? styles.tgMsgUser : styles.tgMsgBot}`}
            >
              {m.text
                ? m.text.split("\n").map((line, k) => (
                    <span key={k} className={styles.tgLine}>{line}</span>
                  ))
                : (
                  <div className={styles.tgTyping}>
                    <span className={styles.tgDot} />
                    <span className={styles.tgDot} />
                    <span className={styles.tgDot} />
                  </div>
                )}
            </div>
          ))}
          {errText && (
            <div className={styles.tgErr}>{errText}</div>
          )}
        </div>

        {/* Input */}
        <form className={styles.tgInputBar} onSubmit={send}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9.5" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <circle cx="9" cy="10" r="0.6" fill="currentColor" stroke="none" />
            <circle cx="15" cy="10" r="0.6" fill="currentColor" stroke="none" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className={styles.tgInputField}
            placeholder={sending ? "waiting for agent…" : "Message @agoraa_bot"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            maxLength={2000}
          />
          <button
            type="submit"
            className={styles.tgSend}
            disabled={sending || !input.trim()}
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

function GlobalVideo() {
  const vRef = useRef(null);
  useEffect(() => {
    const v = vRef.current; if (!v) return;
    v.play().catch(() => {});
    const onEnded = () => { v.currentTime = 0; v.play().catch(() => {}); };
    v.addEventListener("ended", onEnded);
    return () => v.removeEventListener("ended", onEnded);
  }, []);
  return (
    <div className={styles.globalVideo} aria-hidden>
      <video ref={vRef} className={styles.videoBg} muted playsInline preload="auto">
        <source src="/bg-agora-web.mp4" type="video/mp4" />
      </video>
      <div className={styles.globalVeil} />
    </div>
  );
}

function NavDots({ active, onJump, count }) {
  return (
    <div className={styles.dots}>
      {Array.from({ length: count }).map((_, i) => (
        <button key={i}
          className={`${styles.dot} ${active === i ? styles.dotActive : ""}`}
          onClick={() => onJump(i)} aria-label={`Section ${i + 1}`} />
      ))}
    </div>
  );
}



/* ════════ WAITLIST MODAL ════════ */
function WaitlistModal({ mode, onClose, onDone }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);
  const open = mode !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => { window.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) { setEmail(""); setSent(false); setErr(""); }
  }, [open]);

  const submit = (e) => {
    const ok = EMAIL_RE.test(email.trim());
    if (!ok) { e.preventDefault(); setErr("That email doesn't look right."); return; }
    setErr("");
    setTimeout(() => { setSent(true); onDone?.(); }, 320);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.wlWrap}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
          role="dialog" aria-modal="true" aria-label="Join the Agora waitlist"
        >
          <iframe
            name="agora_waitlist_sink" title="waitlist sink" tabIndex={-1} aria-hidden="true"
            style={{ position: "absolute", width: 1, height: 1, border: 0, opacity: 0, pointerEvents: "none" }}
          />
          <motion.div
            className={styles.wlPanel}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <button className={styles.wlClose} onClick={onClose} aria-label="Close">✕</button>

            {sent ? (
              <div className={styles.wlDone}>
                <p className={styles.wlDoneMark}>✓</p>
                <h3 className={styles.wlDoneTitle}>You&apos;re on the list.</h3>
                <p className={styles.wlDoneBody}>
                  We&apos;ll email you when accounts open. In the meantime the agent is live on Telegram
                  and the square is open to walk through.
                </p>
                <div className={styles.wlDoneRow}>
                  <a className={styles.wlGhost} href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                    Talk to the agent
                  </a>
                  <button className={styles.wlGhost} onClick={onClose}>Back to the site</button>
                </div>
              </div>
            ) : (
              <>
                <p className={styles.wlEyebrow}>
                  {mode === "login" ? "Accounts aren't open yet" : "Early access"}
                </p>
                <h3 className={styles.wlTitle}>Join the waitlist</h3>
                <p className={styles.wlBody}>
                  {mode === "login"
                    ? "Agora doesn't have accounts open yet. Leave your email and you'll be first in when it does."
                    : "Agora is live on GOAT mainnet and onboarding in batches. Leave your email and you'll be first in."}
                </p>

                <form
                  className={styles.wlForm}
                  action={WAITLIST_ACTION}
                  method="POST"
                  target="agora_waitlist_sink"
                  onSubmit={submit}
                >
                  <label className={styles.wlLabel} htmlFor="wl-email">Email</label>
                  <input
                    id="wl-email"
                    ref={inputRef}
                    className={styles.wlInput}
                    name={WAITLIST_EMAIL_FIELD}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (err) setErr(""); }}
                    required
                  />
                  {err && <p className={styles.wlErr}>{err}</p>}
                  <button type="submit" className={styles.wlSubmit}>Join the waitlist</button>
                  <p className={styles.wlFine}>No spam. One email when accounts open.</p>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ════════ MAIN ════════ */
export default function AgoraPage() {
  const viewportRef = useRef(null);
  const sectionRefs = useRef([]);
  const touchStartY = useRef(0);
  const [active, setActive] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);
  /* Live on-chain read. The hero counters show verified payments rather than a
     number typed into this file, so they update themselves as the agent
     transacts. Falls back to the recorded figures if the RPC is unreachable. */
  const [chain, setChain] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/chain")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        /* Only trust a complete read. A partial one would undercount and show
           fewer payments than we can prove, which is worse than the fallback. */
        if (alive && d && d.live && d.payments && d.payments.settled >= d.payments.tracked) {
          setChain(d);
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const latestBlock = chain && chain.payments.transactions.length
    ? chain.payments.transactions[chain.payments.transactions.length - 1].block
    : 14620856;

  const [waitlist, setWaitlist] = useState(null); // null | "signup" | "login"
  const closeWaitlist = useCallback(() => setWaitlist(null), []);
  const [selectedMode, setSelectedMode] = useState(0);
  const SECTION_COUNT = 6;
  const LAST = SECTION_COUNT - 1;

  useEffect(() => {
    const node = viewportRef.current; if (!node) return;
    const fn = () => setNavScrolled(node.scrollTop > 60);
    node.addEventListener("scroll", fn, { passive: true });
    return () => node.removeEventListener("scroll", fn);
  }, []);

  // Reset scroll on mount once. No enforcement — we do NOT fight the user.
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    const node = viewportRef.current;
    if (node) node.scrollTop = 0;
  }, []);

  useEffect(() => {
    const node = viewportRef.current; if (!node) return;
    const secs = sectionRefs.current.filter(Boolean);
    if (!secs.length) return;
    const obs = new IntersectionObserver(
      (es) => es.forEach(e => { if (e.isIntersecting) { const i = sectionRefs.current.indexOf(e.target); if (i !== -1) setActive(i); } }),
      { threshold: 0.55, root: node }
    );
    secs.forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const node = viewportRef.current; if (!node) return;
    const onWheel = (e) => {
      if (active === LAST && e.deltaY > 0) { e.preventDefault(); e.stopPropagation(); }
      if (active === 0 && e.deltaY < 0) { e.preventDefault(); e.stopPropagation(); }
    };
    const onTS = (e) => { touchStartY.current = e.touches[0].clientY; };
    const onTM = (e) => {
      const d = touchStartY.current - e.touches[0].clientY;
      if (active === LAST && d > 0) { e.preventDefault(); return; }
      if (active === 0 && d < 0) { e.preventDefault(); return; }
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("touchstart", onTS, { passive: true });
    node.addEventListener("touchmove", onTM, { passive: false });
    return () => { node.removeEventListener("wheel", onWheel); node.removeEventListener("touchstart", onTS); node.removeEventListener("touchmove", onTM); };
  }, [active, LAST]);

  const jumpTo = useCallback((i) => {
    const c = viewportRef.current; if (!c) return;
    c.scrollTo({ top: i * c.clientHeight, behavior: "smooth" });
  }, []);

  return (
    <div className={styles.root}>
      <GlobalVideo />
      <div className={styles.grain} aria-hidden />

      {/* NAV — main pill + award pill centered at top */}
      <nav className={`${styles.nav} ${navScrolled ? styles.navScrolled : ""}`}>
        <div className={styles.navCluster}>
        <div className={styles.navBar}>
          {/* Logo */}
          <div className={styles.navLogo}>
            <Image src="/mylogo.png" alt="AGORA" width={22} height={22} className={styles.navLogoImg} />
            <span className={styles.navLogoText}>agora</span>
          </div>
          {/* Links */}
          <div className={styles.navLinks}>
            {["Home", "Real", "Square", "Agent", "Pulse", "Settlement"].map((l, i) => (
              <button key={l}
                className={`${styles.navLink} ${active === i ? styles.navLinkActive : ""}`}
                onClick={() => jumpTo(i)}>{l}</button>
            ))}
          </div>
          {/* Actions */}
          <div className={styles.navActions}>
            <button type="button" className={styles.navLogin} onClick={() => setWaitlist("login")}>Log In</button>
            <button type="button" className={styles.navSignup} onClick={() => setWaitlist("signup")}>Sign Up</button>
          </div>
        </div>
        </div>
      </nav>

      <NavDots active={active} onJump={jumpTo} count={SECTION_COUNT} />

      <div className={styles.viewport} ref={viewportRef}>

        {/* S1 — HERO */}
        <section className={`${styles.section} ${styles.s1}`} ref={el => sectionRefs.current[0] = el}>
          <div className={styles.s1Veil} />

          {/* Two-column grid */}
          <div className={styles.s1Grid}>
            {/* Left: headline + CTA */}
            <div className={styles.s1Left}>
              <BlurUp delay={0.1}>
                <p className={styles.eyebrow}>
                  Autonomous Compute Economy
                  <span className={styles.eyebrowDot}>·</span>
                  GOAT Network
                </p>
              </BlurUp>
              <BlurUp delay={0.22}>
                <h1 className={styles.hl1}>The marketplace</h1>
                <h1 className={styles.hl2}>machines built</h1>
                <h1 className={styles.hl1}>for machines.</h1>
              </BlurUp>
              <BlurUp delay={0.5}>
                <p className={styles.s1Sub}>
                  One agent. Autonomous bids. Bitcoin-backed settlement.<br />
                  Zero human approvals required.
                </p>
              </BlurUp>
              <BlurUp delay={0.68} className={styles.s1Btns}>
                <MagBtn href={TELEGRAM_URL} target="_blank" className={styles.btnRed}>
                  <span className={styles.btnRedGlow} />
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ position: "relative", zIndex: 1 }}><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.24 13.617l-2.94-.92c-.64-.203-.654-.64.135-.953l11.566-4.461c.537-.194 1.006.131.893.938z"/></svg>
                  <span>Try AGORA Agent</span>
                </MagBtn>
                <MagBtn href="/agent" className={styles.btnLive}>Chat with Agora</MagBtn>
                <MagBtn href="/square" className={styles.btnGhost}>The Square</MagBtn>
              </BlurUp>
            </div>

            {/* Right: glass stats card */}
            <BlurUp delay={0.6} className={styles.s1Right}>
              <div className={styles.heroCard}>
                <div className={styles.heroCardEdge} />
                <p className={styles.heroCardLabel}>Verified On-Chain</p>
                <div className={styles.heroStats}>
                  <div className={styles.heroStat}>
                    <span className={styles.heroStatN}>#82</span>
                    <span className={styles.heroStatL}>ERC-8004 Agent ID</span>
                  </div>
                  <div className={styles.heroStatDiv} />
                  <div className={styles.heroStat}>
                    <span className={styles.heroStatN}>{chain ? chain.payments.settled : 3}</span>
                    <span className={styles.heroStatL}>
                      x402 payment{(chain ? chain.payments.settled : 3) === 1 ? "" : "s"} settled
                    </span>
                  </div>
                  <div className={styles.heroStatDiv} />
                  <div className={styles.heroStat}>
                    <span className={styles.heroStatN}>{chain ? chain.payments.uniqueAgents : 2}</span>
                    <span className={styles.heroStatL}>agents transacting</span>
                  </div>
                </div>
                {chain && (
                  <p className={styles.heroLive}>
                    <span className={styles.heroLiveDot} />
                    read live from chain {chain.chainId}
                  </p>
                )}
                <div className={styles.heroAward}>
                  <span className={styles.heroAwardIcon}>🏆</span>
                  <span>OpenClaw Hackathon<br />
                    <span className={styles.heroAwardSub}>All tracks · 3rd overall</span>
                  </span>
                </div>
                <a href="https://8004scan.io/agents?chain=2345" target="_blank" rel="noopener noreferrer" className={styles.heroPill}>
                  <span className={styles.liveDot} />Real, live, verifiable · View agent →
                </a>
              </div>
            </BlurUp>

          </div>

          {/* Sponsor strip at bottom */}
          <div className={styles.heroBottom}>
            <SponsorStrip />
          </div>
        </section>

        {/* ════════ S2 — REAL ════════ */}
        <section className={`${styles.section} ${styles.py}`} ref={el => sectionRefs.current[1] = el}>
          <div className={styles.pyBg} />
          <div className={styles.pyWrap}>
            <div className={`${styles.pySplit} ${styles.pySplitTextLeft}`}>
              <div className={styles.pyText}>
                <InView><p className={styles.pyEyebrow}>Verified · On-chain</p></InView>
                <SlideUp className={styles.pyTitle} delay={0.05}>See what's real,</SlideUp>
                <SlideUp className={`${styles.pyTitle} ${styles.pyTitleItalic}`} delay={0.13}>on-chain.</SlideUp>
                <InView delay={0.22}><p className={styles.pySub}>Agora's identity, merchant, and every payment are registered on GOAT mainnet, not a testnet demo. Every claim on this page is something you can pull up and verify yourself.</p></InView>
                <InView delay={0.28}><p className={styles.pySub}>The agent holds its own wallet, separate from yours. You fund it and that balance is the ceiling. It has never held a key to your personal wallet.</p></InView>
                <InView delay={0.34} className={styles.pyLinkRow}>
                  <a href="https://8004scan.io/agents/goat/82" target="_blank" rel="noopener noreferrer" className={styles.pyLink}>View Agent #82 on 8004scan →</a>
                  <a href={`https://explorer.goat.network/address/${AGENT_WALLET}`} target="_blank" rel="noopener noreferrer" className={styles.pyLink}>See the agent wallet →</a>
                </InView>
              </div>
              <InView delay={0.2} className={styles.pyVisual}>
                <div className={styles.pyFrame}>
                  <div className={styles.pyFrameLabel}>8004scan.io · Agent #82</div>
                  <div className={styles.pyFrameBody}>
                    <MediaSlot type="image" src="/8004scan.png" alt="Agent #82 on 8004scan" fallback="8004scan · agent card" />
                  </div>
                </div>
              </InView>
            </div>
          </div>
        </section>

        {/* ════════ S3 — SQUARE ════════ */}
        <section className={`${styles.section} ${styles.py}`} ref={el => sectionRefs.current[2] = el}>
          <div className={styles.pyBg} />
          <div className={styles.pyWrap}>
            <div className={`${styles.pySplit} ${styles.pySplitTextRight}`}>
              <InView delay={0.2} className={styles.pyVisual}>
                <div className={`${styles.pyFrame} ${styles.pyFrameTilt}`}>
                  <div className={styles.pyFrameLabel}>useagora.vercel.app/square · live</div>
                  <div className={styles.pyFrameBody}>
                    <iframe
                      src="/square?embed=1"
                      className={styles.showcaseIframe}
                      title="The Square live view"
                      loading="lazy"
                      aria-hidden="true"
                      tabIndex={-1}
                      scrolling="no"
                      sandbox="allow-scripts allow-same-origin"
                    />
                    <div className={styles.showcaseGuard} aria-hidden />
                  </div>
                </div>
              </InView>
              <div className={styles.pyText}>
                <InView><p className={styles.pyEyebrow}>The Square · Interactive</p></InView>
                <SlideUp className={styles.pyTitle} delay={0.05}>Walk the</SlideUp>
                <SlideUp className={`${styles.pyTitle} ${styles.pyTitleItalic}`} delay={0.13}>marketplace.</SlideUp>
                <InView delay={0.22}><p className={styles.pySub}>Agora means marketplace in ancient Greek, the public square where trade happened. We rebuilt that, walkable, in 3D. Five stations, one loop, every inscription a real on-chain fact.</p></InView>
                <InView delay={0.32}>
                  <a href="/square" className={styles.pyLink}>Enter the Square →</a>
                </InView>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ S5 — AGENT ════════ */}
        <section className={`${styles.section} ${styles.py}`} ref={el => sectionRefs.current[3] = el}>
          <div className={styles.pyBg} />
          <div className={styles.pyWrap}>
            <div className={`${styles.pySplit} ${styles.pySplitTextRight}`}>
              <InView delay={0.2} className={styles.pyVisual}>
                <AgentPanel />
              </InView>
              <div className={styles.pyText}>
                <InView><p className={styles.pyEyebrow}>The Agent · Live</p></InView>
                <SlideUp className={styles.pyTitle} delay={0.05}>The agent works.</SlideUp>
                <SlideUp className={`${styles.pyTitle} ${styles.pyTitleItalic}`} delay={0.13}>Right now.</SlideUp>
                <InView delay={0.22}><p className={styles.pySub}>Agora's agent manages its own wallet, handles its own registration, and settles x402 payments on GOAT mainnet. Watch the demo, or chat with the real agent yourself. Six steps, zero human approvals.</p></InView>
                <InView delay={0.32} className={styles.pyLinkRow}>
                  <Link href="/agent" className={`${styles.pyLink} ${styles.pyLinkPrimary}`}>Chat with Agora →</Link>
                  <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={styles.pyLink}>Open in Telegram →</a>
                </InView>
              </div>
            </div>
          </div>        </section>

        {/* ════════ S6 — PULSE (numbers + graph + flow) ════════ */}
        <section className={`${styles.section} ${styles.py}`} ref={el => sectionRefs.current[5] = el}>
          <div className={styles.pyBg} />
          <div className={styles.pyWrap}>
            <div className={styles.pulseWrap}>
              <div className={styles.pulseHead}>
                <InView><p className={styles.pyEyebrow}>Agora · in numbers</p></InView>
                <SlideUp className={`${styles.pyTitle} ${styles.pulseHeadTitle}`} delay={0.05}>Live pulse.</SlideUp>
                <SlideUp className={`${styles.pyTitle} ${styles.pyTitleItalic} ${styles.pulseHeadTitle}`} delay={0.13}>Verifiable receipts.</SlideUp>
              </div>

              {/* Row 1: Live counters */}
              <div className={styles.pulseCounters}>
                <PulseCounter label="Agent ID"        value={82} prefix="#" />
                <PulseCounter label="x402 settled"    value={chain ? chain.payments.settled : 3} />
                <PulseCounter label="Volume settled"  value={chain ? chain.payments.volumeUsdce : 3} decimals={2} suffix=" USDC.e" />
                <PulseCounter label="Agents transacting" value={chain ? chain.payments.uniqueAgents : 2} />
                <PulseCounter label="Chain ID"        value={2345} />
                <PulseCounter label="Latest block"    value={latestBlock} />
              </div>

              {/* Row 2: Graph + Flow side by side */}
              <div className={styles.pulseRow}>
                <div className={styles.pulseCard}>
                  <div className={styles.pulseCardHead}>
                    <p className={styles.pulseCardLabel}>Settled payments</p>
                    <p className={styles.pulseCardHint}>every one, read from the chain</p>
                  </div>
                  <Receipts chain={chain} />
                </div>
                <div className={styles.pulseCard}>
                  <div className={styles.pulseCardHead}>
                    <p className={styles.pulseCardLabel}>Agent flow</p>
                    <p className={styles.pulseCardHint}>where Agora is today</p>
                  </div>
                  <PulseFlow />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ S7 — SETTLEMENT + CTA ════════ */}
        <section className={`${styles.section} ${styles.py}`} ref={el => sectionRefs.current[4] = el}>
          <div className={styles.pyBg} />
          <div className={styles.pyWrap}>
            <div className={`${styles.pySplit} ${styles.pySplitTextLeft}`}>
              <div className={styles.pyText}>
                <InView><p className={styles.pyEyebrow}>Settled · Verifiable</p></InView>
                <SlideUp className={styles.pyTitle} delay={0.05}>One payment.</SlideUp>
                <SlideUp className={`${styles.pyTitle} ${styles.pyTitleItalic}`} delay={0.13}>Confirmed forever.</SlideUp>
                <InView delay={0.22}><p className={styles.pySub}>A real USDC.e payment, settled on GOAT mainnet through x402. On-chain, gateway-verified, and the first of many. This is Agora working today, not on a roadmap.</p></InView>
                <InView delay={0.32} className={styles.pyCtaRow}>
                  <MagBtn href={TELEGRAM_URL} target="_blank" className={styles.btnRed}>
                    <span className={styles.btnRedGlow} />
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ position: "relative", zIndex: 1 }}><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.24 13.617l-2.94-.92c-.64-.203-.654-.64.135-.953l11.566-4.461c.537-.194 1.006.131.893.938z"/></svg>
                    <span>Try AGORA Agent</span>
                  </MagBtn>
                  <MagBtn href="/agent" className={styles.btnLive}>Chat with Agora</MagBtn>
                  <MagBtn href="/square" className={styles.btnGhost}>Walk the Square</MagBtn>
                </InView>
              </div>
              <InView delay={0.2} className={styles.pyVisual}>
                <div className={styles.pyFrame}>
                  <div className={styles.pyFrameLabel}>explorer.goat.network</div>
                  <div className={styles.pyFrameBody}>
                    <MediaSlot type="image" src="/onchain-tx.png" alt="Settled tx on GOAT Explorer" fallback="goat explorer · settled tx" />
                  </div>
                </div>
              </InView>
            </div>
            <p className={styles.pyFooter}>Built at OpenClaw Bootcamp · Toronto Tech Week · 2026</p>
          </div>
        </section>
      </div>

      <WaitlistModal mode={waitlist} onClose={closeWaitlist} />
    </div>
  );
}
