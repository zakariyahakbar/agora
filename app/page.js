"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import styles from "./page.module.css";

const TELEGRAM_URL = "https://web.telegram.org/k/#@agoraa_bot";

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

const FEED_EVENTS = [
  { t: "r", msg: (a) => `Example: broadcast 10k inference units · budget ${a} USDC` },
  { t: "b", msg: () => `Example: provider bid 0.38 USDC · A100 · 120ms` },
  { t: "b", msg: () => `Example: counter-bid 0.41 USDC · H100 · 62ms` },
  { t: "e", msg: (a) => `Example: escrow locked · ${a} USDC · GOAT mainnet` },
  { t: "v", msg: () => `Example: output verified via cryptographic proof` },
  { t: "s", msg: (a) => `Example: settled · +${a} USDC via x402` },
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

/* ── Clip-up ── */
function SlideUp({ children, className, delay = 0 }) {
  return (
    <div style={{ overflow: "hidden" }}>
      <motion.div className={className}
        initial={{ y: "108%", opacity: 0 }}
        whileInView={{ y: "0%", opacity: 1 }}
        viewport={{ once: true, amount: 0.1 }}
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
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.28);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.28);
  };
  const onLeave = () => { x.set(0); y.set(0); };
  const Tag = href ? "a" : "button";
  return (
    <motion.div style={{ x: sx, y: sy, display: "inline-flex" }}
      onMouseMove={onMove} onMouseLeave={onLeave} ref={ref}>
      <Tag href={href} target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
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

/* SVG line-and-area chart that animates in on scroll */
function PulseGraph() {
  const [visible, setVisible] = useState(false);
  const [t, setT] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { threshold: 0.25 });
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

  // Simulated settlement-latency data — 14 points, seconds axis 2-6s, our real point (3.52s) is called out
  const data = [4.8, 4.2, 5.1, 3.9, 4.4, 3.6, 5.3, 4.1, 3.8, 3.52, 4.0, 3.7, 3.9, 3.6];
  const W = 460, H = 200, padX = 26, padY = 20;
  const chartW = W - padX * 2, chartH = H - padY * 2;
  const yMin = 2, yMax = 6;
  const xStep = chartW / (data.length - 1);
  const yScale = v => padY + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  // Reveal progress 0..1 as an intro animation
  const reveal = Math.min(1, t / 1.8);
  // Continuous pulse on the "real tx" marker
  const pulseAlpha = 0.55 + Math.sin(t * 2.4) * 0.3;

  // Build path up to reveal fraction
  const revealCount = Math.max(2, Math.round(data.length * reveal));
  let linePath = "";
  let areaPath = "";
  data.slice(0, revealCount).forEach((v, i) => {
    const x = padX + i * xStep;
    const y = yScale(v);
    linePath += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
  });
  if (revealCount >= 2) {
    const lastX = padX + (revealCount - 1) * xStep;
    areaPath = `${linePath} L${lastX},${padY + chartH} L${padX},${padY + chartH} Z`;
  }
  const highlightIdx = 9; // 3.52s marker

  return (
    <div className={styles.pulseGraph} ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.pulseGraphSvg} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="rgba(242,131,34,0.35)" />
            <stop offset="100%" stopColor="rgba(242,131,34,0)" />
          </linearGradient>
        </defs>
        {/* Y grid lines */}
        {[2, 3, 4, 5, 6].map(v => (
          <g key={v}>
            <line x1={padX} y1={yScale(v)} x2={W - padX} y2={yScale(v)}
              stroke="rgba(240,236,228,0.06)" strokeWidth="0.5" strokeDasharray="2 3" />
            <text x={padX - 6} y={yScale(v) + 3} textAnchor="end"
              fill="rgba(220,215,205,0.35)" fontSize="9"
              fontFamily="var(--font-mono, DM Mono, monospace)">{v}s</text>
          </g>
        ))}
        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
        {/* Line */}
        {linePath && <path d={linePath} fill="none" stroke="#ff9a3c" strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round" />}
        {/* Points */}
        {data.slice(0, revealCount).map((v, i) => {
          const x = padX + i * xStep;
          const y = yScale(v);
          const isHi = i === highlightIdx;
          return (
            <g key={i}>
              {isHi && (
                <>
                  <circle cx={x} cy={y} r="9" fill="rgba(242,131,34,0.15)" opacity={pulseAlpha} />
                  <circle cx={x} cy={y} r="5" fill="rgba(242,131,34,0.4)" opacity={pulseAlpha} />
                </>
              )}
              <circle cx={x} cy={y} r={isHi ? 3 : 2}
                fill={isHi ? "#ffc78d" : "#ff9a3c"}
                stroke="#0f0d16" strokeWidth="1" />
              {isHi && (
                <g>
                  <line x1={x} y1={y - 8} x2={x} y2={padY} stroke="rgba(242,131,34,0.35)" strokeWidth="0.6" strokeDasharray="1 2" />
                  <rect x={x - 22} y={padY - 14} width="44" height="14" rx="3"
                    fill="rgba(24,20,14,0.9)" stroke="rgba(242,131,34,0.5)" strokeWidth="0.6" />
                  <text x={x} y={padY - 4} textAnchor="middle"
                    fill="#ffc78d" fontSize="8"
                    fontFamily="var(--font-mono, DM Mono, monospace)"
                    letterSpacing="0.05em">3.52s · ours</text>
                </g>
              )}
            </g>
          );
        })}
        {/* X axis label */}
        <text x={W / 2} y={H - 4} textAnchor="middle"
          fill="rgba(220,215,205,0.35)" fontSize="8"
          fontFamily="var(--font-mono, DM Mono, monospace)"
          letterSpacing="0.15em">recent settlements →</text>
      </svg>
    </div>
  );
}

/* Six-step agent loop that highlights the current step */
const PULSE_FLOW = [
  { n: "01", label: "Request",   desc: "10k units · 0.42 USDC" },
  { n: "02", label: "Bid",       desc: "0.38 · A100 · 120ms" },
  { n: "03", label: "Escrow",    desc: "locked · GOAT mainnet" },
  { n: "04", label: "Execute",   desc: "provider runs the job" },
  { n: "05", label: "Verify",    desc: "output hash · matched" },
  { n: "06", label: "Settle",    desc: "+0.38 USDC · x402" },
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
              <div className={styles.pulseFlowLabel}>{s.label}</div>
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
  const [mode, setMode] = useState("demo"); // "demo" | "live"
  return (
    <div className={`${styles.pyFrame} ${styles.pyFramePortrait} ${styles.demoFrame}`}>
      <div className={styles.pyFrameLabel}>
        {mode === "demo"
          ? "Telegram · @agoraa_bot · recorded"
          : "Live · @agoraa_bot · you're chatting"}
      </div>
      {/* Mode toggle */}
      <div className={styles.agentToggle}>
        <button
          className={`${styles.agentToggleBtn} ${mode === "demo" ? styles.agentToggleBtnActive : ""}`}
          onClick={() => setMode("demo")}
          type="button"
        >Demo</button>
        <button
          className={`${styles.agentToggleBtn} ${mode === "live" ? styles.agentToggleBtnActive : ""}`}
          onClick={() => setMode("live")}
          type="button"
        >Live chat</button>
      </div>
      <div className={styles.pyFrameBody}>
        {mode === "demo" ? <TelegramDemoShowcase /> : <LiveAgentChat />}
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

function useLiveFeed() {
  const [entries, setEntries] = useState([]);
  const [vol, setVol] = useState(13.15);
  const [txns, setTxns] = useState(8);
  useEffect(() => {
    let i = 0;
    const amounts = ["0.42", "0.38", "0.31", "0.18"];
    const tick = () => {
      const ev = FEED_EVENTS[i % FEED_EVENTS.length];
      const amt = amounts[i % amounts.length];
      const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
      setEntries(prev => [{ t: ev.t, msg: ev.msg(amt), ts, id: Date.now() }, ...prev].slice(0, 8));
      if (ev.t === "s") {
        setVol(v => parseFloat((v + parseFloat(amt)).toFixed(2)));
        setTxns(t => t + 1);
      }
      i++;
    };
    tick();
    const id = setInterval(tick, 2800);
    return () => clearInterval(id);
  }, []);
  return { entries, vol, txns };
}

/* ════════ MAIN ════════ */
export default function AgoraPage() {
  const viewportRef = useRef(null);
  const sectionRefs = useRef([]);
  const touchStartY = useRef(0);
  const [active, setActive] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);
  const [selectedMode, setSelectedMode] = useState(0);
  const { entries, vol, txns } = useLiveFeed();
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
            <button type="button" className={styles.navLogin} onClick={(e) => e.preventDefault()}>Log In</button>
            <button type="button" className={styles.navSignup} onClick={(e) => e.preventDefault()}>Sign Up</button>
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
                <p className={styles.eyebrowWin}>Won all tracks · OpenClaw Hackathon</p>
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
                    <span className={styles.heroStatN}>1</span>
                    <span className={styles.heroStatL}>x402 payment settled</span>
                  </div>
                  <div className={styles.heroStatDiv} />
                  <div className={styles.heroStat}>
                    <span className={styles.heroStatN}>GOAT</span>
                    <span className={styles.heroStatL}>Mainnet · Chain 2345</span>
                  </div>
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
                <InView delay={0.22}><p className={styles.pySub}>Agora's identity, merchant, and first payment are all registered on GOAT mainnet, not a testnet demo. Every claim on this page is something you can pull up and verify yourself.</p></InView>
                <InView delay={0.32}>
                  <a href="https://8004scan.io/agents/goat/82" target="_blank" rel="noopener noreferrer" className={styles.pyLink}>View Agent #82 on 8004scan →</a>
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
                <InView delay={0.32}>
                  <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={styles.pyLink}>Open in Telegram →</a>
                </InView>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ S6 — PULSE (numbers + graph + flow) ════════ */}
        <section className={`${styles.section} ${styles.py}`} ref={el => sectionRefs.current[4] = el}>
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
                <PulseCounter label="Agent ID"          value={82}           prefix="#" />
                <PulseCounter label="x402 settled"      value={1}                     />
                <PulseCounter label="Volume settled"    value={1.00} decimals={2} suffix=" USDC" />
                <PulseCounter label="Avg settlement"    value={3.52} decimals={2} suffix="s" />
                <PulseCounter label="Chain ID"          value={2345}                  />
                <PulseCounter label="Block confirmed"   value={13770302}              />
              </div>

              {/* Row 2: Graph + Flow side by side */}
              <div className={styles.pulseRow}>
                <div className={styles.pulseCard}>
                  <div className={styles.pulseCardHead}>
                    <p className={styles.pulseCardLabel}>Settlement latency</p>
                    <p className={styles.pulseCardHint}>request → confirmed, seconds</p>
                  </div>
                  <PulseGraph />
                </div>
                <div className={styles.pulseCard}>
                  <div className={styles.pulseCardHead}>
                    <p className={styles.pulseCardLabel}>Agent flow</p>
                    <p className={styles.pulseCardHint}>runs end-to-end, zero humans</p>
                  </div>
                  <PulseFlow />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ S7 — SETTLEMENT + CTA ════════ */}
        <section className={`${styles.section} ${styles.py}`} ref={el => sectionRefs.current[5] = el}>
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
    </div>
  );
}
