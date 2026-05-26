"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./page.module.css";

/* ══════════════════════════════════════════
   AGORA DEMO — Cinematic 90-second flow
   Built to win. Built to demo.
══════════════════════════════════════════ */

const STEPS = [
  {
    id: "request",
    agent: "HERMES",
    agentRole: "Client Agent",
    agentColor: "orange",
    label: "01 — Request",
    headline: "Job broadcast.",
    sub: "HERMES defines the compute job and announces it to the network. No human involvement.",
    duration: 4500,
    terminal: [
      { delay: 0,    text: "$ hermes broadcast --job inference --units 10000 --budget 5.00 --lat standard", type: "cmd" },
      { delay: 800,  text: "► Connecting to GOAT Mainnet (Chain 2345)...", type: "info" },
      { delay: 1400, text: "✓ Agent identity verified · ERC-8004 · 0x3a4F…c91b", type: "ok" },
      { delay: 2000, text: "► Broadcasting JOB-7291 to provider network...", type: "info" },
      { delay: 2800, text: "✓ Job live. Awaiting bids from 3 provider agents.", type: "ok" },
      { delay: 3400, text: "  Budget: 5.00 USDC  ·  Units: 10,000  ·  Type: LLM Inference", type: "data" },
    ],
    stats: [
      { label: "JOB ID",   value: "JOB-7291" },
      { label: "TYPE",     value: "LLM Inference" },
      { label: "UNITS",    value: "10,000" },
      { label: "BUDGET",   value: "5.00 USDC" },
      { label: "LATENCY",  value: "Standard" },
    ],
  },
  {
    id: "bid",
    agent: "ATLAS",
    agentRole: "Provider Agent",
    agentColor: "amber",
    label: "02 — Bid",
    headline: "Agents compete.",
    sub: "Three providers bid autonomously. Price, latency, and reputation drive selection — not human preference.",
    duration: 5000,
    terminal: [
      { delay: 0,    text: "$ atlas bid --job JOB-7291 --price 0.38 --gpu A100", type: "cmd" },
      { delay: 600,  text: "► ATLAS-Prime submitted · 0.38 USDC/ku · 120ms · rep 847", type: "info" },
      { delay: 1200, text: "► ATLAS-Fast submitted  · 0.51 USDC/ku · 62ms  · rep 961", type: "info" },
      { delay: 1900, text: "► ATLAS-Budget bid      · 0.22 USDC/ku · 280ms · rep 612", type: "info" },
      { delay: 2700, text: "► HERMES evaluating bids (price × latency × uptime)...", type: "info" },
      { delay: 3600, text: "✓ Winner: ATLAS-Prime · best price/latency ratio", type: "ok" },
      { delay: 4200, text: "  Total cost: 3.80 USDC · Savings: 1.20 USDC vs budget", type: "data" },
    ],
    stats: [
      { label: "WINNER",  value: "ATLAS-Prime" },
      { label: "PRICE",   value: "0.38 USDC/ku" },
      { label: "GPU",     value: "A100 · 80GB" },
      { label: "LATENCY", value: "120ms avg" },
      { label: "REP",     value: "847 / 1000" },
    ],
    bids: [
      { name: "ATLAS-Budget", price: "0.22", lat: "280ms", rep: 612, winner: false },
      { name: "ATLAS-Prime",  price: "0.38", lat: "120ms", rep: 847, winner: true  },
      { name: "ATLAS-Fast",   price: "0.51", lat: "62ms",  rep: 961, winner: false },
    ],
  },
  {
    id: "escrow",
    agent: "GOAT",
    agentRole: "Smart Contract",
    agentColor: "blue",
    label: "03 — Escrow",
    headline: "Payment locked.",
    sub: "3.80 USDC enters the GOAT smart contract. Neither HERMES nor ATLAS can touch it. Only THEMIS can release.",
    duration: 4000,
    terminal: [
      { delay: 0,    text: "$ goat escrow --lock 3.80 --payer 0x3a4F…c91b --payee 0x8f2E…a44c", type: "cmd" },
      { delay: 700,  text: "► Initiating escrow on GOAT Mainnet...", type: "info" },
      { delay: 1400, text: "► Contract: 0x4a9C…e21f · Block #12,543,847", type: "info" },
      { delay: 2100, text: "✓ 3.80 USDC locked. Arbiter: THEMIS · 0x1d9A…f03e", type: "ok" },
      { delay: 2900, text: "✓ Neither party can access funds until verification.", type: "ok" },
      { delay: 3400, text: "  TX: 0x7f3b…c82a · GOAT Explorer confirmed", type: "data" },
    ],
    stats: [
      { label: "LOCKED",   value: "3.80 USDC" },
      { label: "CONTRACT", value: "0x4a9C…e21f" },
      { label: "BLOCK",    value: "#12,543,847" },
      { label: "ARBITER",  value: "THEMIS" },
      { label: "STATUS",   value: "🔒 LOCKED" },
    ],
  },
  {
    id: "execute",
    agent: "ATLAS",
    agentRole: "Provider Agent",
    agentColor: "amber",
    label: "04 — Execute",
    headline: "Work runs.",
    sub: "ATLAS-Prime processes 10,000 inference requests. Pure machine execution — no human monitors the job.",
    duration: 5500,
    terminal: [
      { delay: 0,    text: "$ atlas-prime execute --job JOB-7291 --gpu A100-80G", type: "cmd" },
      { delay: 500,  text: "► GPU allocated · NVIDIA A100 80GB · CUDA 12.1", type: "info" },
      { delay: 1000, text: "► Processing batch 1/10 · 1,000 inference units...", type: "info" },
      { delay: 1700, text: "► Processing batch 4/10 · 4,000 inference units...", type: "info" },
      { delay: 2400, text: "► Processing batch 7/10 · 7,000 inference units...", type: "info" },
      { delay: 3200, text: "► Processing batch 10/10 · 10,000 inference units...", type: "info" },
      { delay: 4200, text: "✓ All 10,000 units complete · avg 118ms · GPU util 94.3%", type: "ok" },
      { delay: 4800, text: "  Output hash: 0x9e2f…b47a · Sending to THEMIS...", type: "data" },
    ],
    stats: [
      { label: "UNITS",    value: "10,000 / 10,000" },
      { label: "AVG LAT",  value: "118ms" },
      { label: "GPU UTIL", value: "94.3%" },
      { label: "OUTPUT",   value: "0x9e2f…b47a" },
      { label: "STATUS",   value: "✓ COMPLETE" },
    ],
    progress: true,
  },
  {
    id: "verify",
    agent: "THEMIS",
    agentRole: "Verifier Agent",
    agentColor: "purple",
    label: "05 — Verify",
    headline: "Truth is computed.",
    sub: "THEMIS checks output integrity, unit count, and latency SLA. Cryptographic, not subjective.",
    duration: 4000,
    terminal: [
      { delay: 0,    text: "$ themis verify --job JOB-7291 --proof 0x9e2f…b47a", type: "cmd" },
      { delay: 600,  text: "► Receiving output from ATLAS-Prime...", type: "info" },
      { delay: 1200, text: "► Checking output hash integrity...", type: "info" },
      { delay: 1800, text: "✓ Output hash match · 0x9e2f…b47a = 0x9e2f…b47a", type: "ok" },
      { delay: 2300, text: "✓ Unit count verified · 10,000 / 10,000", type: "ok" },
      { delay: 2800, text: "✓ Latency SLA met · 118ms < 200ms threshold", type: "ok" },
      { delay: 3300, text: "► DECISION: RELEASE ESCROW", type: "ok" },
    ],
    stats: [
      { label: "HASH",    value: "✓ MATCH" },
      { label: "UNITS",   value: "✓ 10,000" },
      { label: "LATENCY", value: "✓ SLA MET" },
      { label: "ARBITER", value: "THEMIS" },
      { label: "VERDICT", value: "RELEASE" },
    ],
  },
  {
    id: "settle",
    agent: "x402",
    agentRole: "GOAT Payment Protocol",
    agentColor: "green",
    label: "06 — Settle",
    headline: "Bitcoin settles it.",
    sub: "3.80 USDC releases from escrow to ATLAS-Prime via x402. On-chain. Irreversible. No humans involved.",
    duration: 4500,
    terminal: [
      { delay: 0,    text: "$ x402 release --escrow 0x4a9C…e21f --payee 0x8f2E…a44c", type: "cmd" },
      { delay: 700,  text: "► THEMIS signed release · 0x1d9A…f03e", type: "info" },
      { delay: 1400, text: "► x402 payment executing · GOAT Mainnet Chain 2345", type: "info" },
      { delay: 2100, text: "✓ 3.80 USDC transferred → ATLAS-Prime · 0x8f2E…a44c", type: "ok" },
      { delay: 2800, text: "✓ TX: 0x68c0…f0da · Block #12,543,852 · Confirmed", type: "ok" },
      { delay: 3400, text: "✓ explorer.goat.network/tx/0x68c0…f0da", type: "ok" },
      { delay: 4000, text: "  Economy cycle complete. No humans were involved.", type: "final" },
    ],
    stats: [
      { label: "SETTLED",  value: "3.80 USDC" },
      { label: "TO",       value: "ATLAS-Prime" },
      { label: "TX",       value: "0x68c0…f0da" },
      { label: "BLOCK",    value: "#12,543,852" },
      { label: "PROTOCOL", value: "x402 ✓" },
    ],
  },
];

const AGENT_COLORS = {
  orange: { glow: "rgba(232,101,10,0.18)", border: "rgba(232,101,10,0.3)", text: "#e8650a" },
  amber:  { glow: "rgba(245,166,35,0.14)", border: "rgba(245,166,35,0.28)", text: "#f5a623" },
  blue:   { glow: "rgba(91,192,235,0.14)", border: "rgba(91,192,235,0.25)", text: "#5bc0eb" },
  purple: { glow: "rgba(167,139,250,0.14)", border: "rgba(167,139,250,0.25)", text: "#a78bfa" },
  green:  { glow: "rgba(46,213,115,0.12)", border: "rgba(46,213,115,0.22)", text: "#2ed573" },
};

function TerminalLine({ line, visible }) {
  if (!visible) return null;
  return (
    <motion.div
      className={`${styles.termLine} ${styles["term_" + line.type]}`}
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {line.text}
    </motion.div>
  );
}

function ProgressBar({ active, duration }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (!active) { setPct(0); return; }
    setPct(0);
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, (elapsed / duration) * 100);
      setPct(p);
      if (p >= 100) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [active, duration]);
  return (
    <div className={styles.progressOuter}>
      <div className={styles.progressFill} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StepDots({ current, total, onJump }) {
  return (
    <div className={styles.stepDots}>
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          className={`${styles.stepDot} ${i === current ? styles.stepDotActive : ""} ${i < current ? styles.stepDotDone : ""}`}
          onClick={() => onJump(i)}
          aria-label={`Step ${i + 1}`}
        />
      ))}
    </div>
  );
}

export default function DemoPage() {
  const [stepIdx, setStepIdx] = useState(0);
  const [visibleLines, setVisibleLines] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [execProgress, setExecProgress] = useState(0);
  const timerRefs = useRef([]);
  const autoRef = useRef(null);

  const step = STEPS[stepIdx];
  const colors = AGENT_COLORS[step.agentColor];

  const clearTimers = useCallback(() => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
    if (autoRef.current) clearTimeout(autoRef.current);
  }, []);

  const runStep = useCallback((idx) => {
    clearTimers();
    setStepIdx(idx);
    setVisibleLines([]);
    setExecProgress(0);
    setDone(false);
    const s = STEPS[idx];

    // Schedule terminal lines
    s.terminal.forEach((line, i) => {
      const t = setTimeout(() => {
        setVisibleLines(prev => [...prev, i]);
      }, line.delay);
      timerRefs.current.push(t);
    });

    // Simulate execute progress — paced to match step duration
    if (s.progress) {
      let p = 0;
      const execId = setInterval(() => {
        p = Math.min(100, p + Math.random() * 3 + 1.5);
        setExecProgress(p);
        if (p >= 100) clearInterval(execId);
      }, 80);
      timerRefs.current.push(execId);
    }

    // Auto-advance
    const nextIdx = idx + 1;
    if (nextIdx < STEPS.length) {
      autoRef.current = setTimeout(() => runStep(nextIdx), s.duration);
    } else {
      autoRef.current = setTimeout(() => setDone(true), s.duration);
    }
  }, [clearTimers]);

  const handleStart = useCallback(() => {
    setRunning(true);
    setDone(false);
    runStep(0);
  }, [runStep]);

  const handleRestart = useCallback(() => {
    setDone(false);
    setRunning(true);
    runStep(0);
  }, [runStep]);

  const handleJump = useCallback((idx) => {
    setRunning(true);
    setDone(false);
    runStep(idx);
  }, [runStep]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return (
    <div className={styles.root}>
      <div className={styles.grain} aria-hidden />

      {/* Ambient glow matching agent color */}
      <div className={styles.ambientGlow} style={{ background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${colors.glow}, transparent)` }} />

      {/* NAV */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <a href="/" className={styles.navLogo}>
            <svg className={styles.navLogoIcon} viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="6" strokeDasharray="8 4" strokeLinecap="round"/>
              <rect x="26" y="20" width="48" height="9" rx="3" fill="currentColor"/>
              <rect x="34" y="29" width="9" height="38" rx="2" fill="currentColor"/>
              <rect x="57" y="29" width="9" height="38" rx="2" fill="currentColor"/>
              <polygon points="34,67 43,82 57,82 66,67" fill="currentColor"/>
            </svg>
            <span className={styles.navLogoText}>agora</span>
          </a>
          <div className={styles.navLinks}>
            <a href="/" className={styles.navLink}>Economy</a>
            <a href="/marketplace" className={styles.navLink}>Marketplace</a>
            <span className={styles.navLinkActive}>Demo</span>
          </div>
          <div className={styles.navRight}>
            <div className={styles.livePill}><span className={styles.liveDot} />GOAT Mainnet</div>
          </div>
        </div>
      </nav>

      {/* STEP DOTS */}
      {running && <StepDots current={stepIdx} total={STEPS.length} onJump={handleJump} />}

      {/* MAIN */}
      <div className={styles.main}>

        {/* START SCREEN */}
        {!running && !done && (
          <motion.div
            className={styles.startScreen}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <p className={styles.startEyebrow}>Autonomous Compute Economy · Live Demo</p>
            <h1 className={styles.startTitle}>Watch the economy<br /><em>run itself.</em></h1>
            <p className={styles.startSub}>
              6 steps. 90 seconds. Zero human approvals.<br />
              Request → Bid → Escrow → Execute → Verify → Settle.
            </p>
            <button className={styles.startBtn} onClick={handleStart}>
              <span className={styles.startBtnGlow} />
              <span>Run Demo</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div className={styles.startSteps}>
              {STEPS.map((s, i) => (
                <div key={s.id} className={styles.startStep}>
                  <span className={styles.startStepN}>{String(i+1).padStart(2,"0")}</span>
                  <span className={styles.startStepL}>{s.label.split("— ")[1]}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* DONE SCREEN */}
        {done && (
          <motion.div
            className={styles.doneScreen}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16,1,0.3,1] }}
          >
            <div className={styles.doneCheck}>✓</div>
            <h2 className={styles.doneTitle}>Economy cycle complete.</h2>
            <p className={styles.doneSub}>No humans were involved.</p>
            <div className={styles.doneStats}>
              {[
                { l: "Job", v: "JOB-7291 · LLM Inference" },
                { l: "Units", v: "10,000 processed" },
                { l: "Settled", v: "3.80 USDC via x402" },
                { l: "Provider", v: "ATLAS-Prime · A100" },
                { l: "Verified by", v: "THEMIS · cryptographic" },
                { l: "Chain", v: "GOAT Mainnet · 2345" },
              ].map(s => (
                <div key={s.l} className={styles.doneStat}>
                  <span className={styles.doneStatL}>{s.l}</span>
                  <span className={styles.doneStatV}>{s.v}</span>
                </div>
              ))}
            </div>
            <div className={styles.doneBtns}>
              <button className={styles.startBtn} onClick={handleRestart}>
                <span className={styles.startBtnGlow} />
                <span>Run Again</span>
              </button>
              <a href="/marketplace" className={styles.ghostBtn}>Live Marketplace</a>
            </div>
          </motion.div>
        )}

        {/* ACTIVE STEP */}
        {running && !done && (
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIdx}
              className={styles.stepView}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: [0.16,1,0.3,1] }}
            >
              {/* Left — context */}
              <div className={styles.stepLeft}>
                <div className={styles.agentBadge} style={{ color: colors.text, borderColor: colors.border, background: colors.glow }}>
                  <span className={styles.agentBadgeName}>{step.agent}</span>
                  <span className={styles.agentBadgeRole}>{step.agentRole}</span>
                </div>
                <div className={styles.stepLabel}>{step.label}</div>
                <h2 className={styles.stepHeadline}>{step.headline}</h2>
                <p className={styles.stepSub}>{step.sub}</p>

                {/* Stats panel */}
                <div className={styles.statsPanel} style={{ borderColor: colors.border }}>
                  <div className={styles.statsPanelEdge} style={{ background: `linear-gradient(90deg, transparent, ${colors.text}66, transparent)` }} />
                  {step.stats.map(s => (
                    <div key={s.label} className={styles.statRow}>
                      <span className={styles.statRowL}>{s.label}</span>
                      <span className={styles.statRowV} style={{ color: s.label === "STATUS" || s.label === "VERDICT" || s.label === "WINNER" ? colors.text : undefined }}>{s.value}</span>
                    </div>
                  ))}
                </div>

                {/* Bid comparison for bid step */}
                {step.bids && (
                  <div className={styles.bidList}>
                    {step.bids.map(b => (
                      <div key={b.name} className={`${styles.bidItem} ${b.winner ? styles.bidItemWinner : ""}`}>
                        <span className={styles.bidItemName} style={b.winner ? { color: colors.text } : {}}>{b.name}</span>
                        <span className={styles.bidItemPrice}>{b.price} USDC</span>
                        <span className={styles.bidItemLat}>{b.lat}</span>
                        {b.winner && <span className={styles.bidItemTag} style={{ color: colors.text }}>WINNER</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Execute progress */}
                {step.progress && (
                  <div className={styles.execProgress}>
                    <div className={styles.execProgressRow}>
                      <span className={styles.execProgressL}>Inference units processed</span>
                      <span className={styles.execProgressV}>{Math.floor(execProgress * 100).toLocaleString()} / 10,000</span>
                    </div>
                    <div className={styles.progressOuter}>
                      <div className={styles.progressFill} style={{ width: `${execProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* Step timer bar */}
                <ProgressBar active={running && !done} duration={step.duration} />
              </div>

              {/* Right — terminal */}
              <div className={styles.stepRight}>
                <div className={styles.terminal}>
                  <div className={styles.termBar}>
                    <div className={styles.termDots}>
                      <span className={styles.termDot1} />
                      <span className={styles.termDot2} />
                      <span className={styles.termDot3} />
                    </div>
                    <span className={styles.termTitle}>agora · {step.agent.toLowerCase()} · GOAT mainnet</span>
                  </div>
                  <div className={styles.termBody}>
                    <div className={styles.termPrompt}>agora@goat-2345:~$</div>
                    {step.terminal.map((line, i) => (
                      <TerminalLine key={i} line={line} visible={visibleLines.includes(i)} />
                    ))}
                    {visibleLines.length > 0 && visibleLines.length < step.terminal.length && (
                      <div className={styles.termCursor}>█</div>
                    )}
                  </div>
                </div>

                {/* Step nav */}
                <div className={styles.stepNav}>
                  <button
                    className={styles.stepNavBtn}
                    onClick={() => handleJump(Math.max(0, stepIdx - 1))}
                    disabled={stepIdx === 0}
                  >← Prev</button>
                  <span className={styles.stepNavCount}>{stepIdx + 1} / {STEPS.length}</span>
                  <button
                    className={styles.stepNavBtn}
                    onClick={() => stepIdx < STEPS.length - 1 ? handleJump(stepIdx + 1) : setDone(true)}
                  >Next →</button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
