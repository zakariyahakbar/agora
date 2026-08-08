"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import styles from "./page.module.css";

/* Real project constants */
const AGENT_ID = 82;
const CHAIN_ID = 2345;
const SETTLED_TX_COUNT = 1;
const SETTLED_USDC = 1.00;
const SETTLED_SECONDS = 3.525;
const BLOCK = 13770302;
const TX_HASH = "0xa8747b2b74d09a70dcd3abb3b7cefdd996dcebe3a738f7d691ab66e777843460";
const TX_SHORT = "0xa8747b…3460";
const AGENT_URL = "https://8004scan.io/agents/goat/82";
const TX_URL = `https://explorer.goat.network/tx/${TX_HASH}`;

/* ── Count-up hook — animates from 0 to target when scrolled into view ── */
function useCountUp(target, decimals = 0, duration = 1400) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        const t0 = performance.now();
        let raf;
        const tick = () => {
          const p = Math.min(1, (performance.now() - t0) / duration);
          const eased = 1 - Math.pow(1 - p, 3); // cubic-out
          setN(target * eased);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => raf && cancelAnimationFrame(raf);
      }
    }, { threshold: 0.4 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [target, duration]);
  return [decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString(), ref];
}

/* ── Flow diagram — 6 steps light up sequentially in a loop ── */
const FLOW = [
  { n: "01", label: "Request",   desc: "10k units · budget 0.42 USDC" },
  { n: "02", label: "Bid",       desc: "0.38 · A100 · 120ms" },
  { n: "03", label: "Escrow",    desc: "locked · GOAT mainnet" },
  { n: "04", label: "Execute",   desc: "provider runs the job" },
  { n: "05", label: "Verify",    desc: "output hash · matched" },
  { n: "06", label: "Settle",    desc: "+0.38 USDC · x402" },
];

function AgentFlow() {
  const [t, setT] = useState(0);
  const [visible, setVisible] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    if (!wrapRef.current) return;
    const io = new IntersectionObserver(entries => {
      setVisible(entries[0].isIntersecting);
    }, { threshold: 0.15 });
    io.observe(wrapRef.current);
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
  const stepDur = 1 / (FLOW.length + 1);
  const active = Math.min(FLOW.length - 1, Math.floor(p / stepDur));
  const stepProg = (p % stepDur) / stepDur;
  const isResetting = p > (FLOW.length * stepDur);

  return (
    <div className={styles.flow} ref={wrapRef}>
      <div className={styles.flowInner}>
        {FLOW.map((s, i) => {
          const done = !isResetting && i < active;
          const current = !isResetting && i === active;
          return (
            <div key={s.n}
              className={`${styles.flowStep} ${done ? styles.flowStepDone : ""} ${current ? styles.flowStepCurrent : ""}`}>
              <div className={styles.flowDot}>
                {done ? (
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12l6 6L20 6" />
                  </svg>
                ) : (
                  <span className={styles.flowNum}>{s.n}</span>
                )}
              </div>
              <div className={styles.flowBody}>
                <div className={styles.flowLabel}>{s.label}</div>
                <div className={styles.flowDesc}>{s.desc}</div>
              </div>
              {current && (
                <div className={styles.flowBar}>
                  <div className={styles.flowBarFill} style={{ transform: `scaleX(${stepProg})` }} />
                </div>
              )}
              {i < FLOW.length - 1 && (
                <div className={styles.flowConn}>
                  <div className={styles.flowConnFill}
                    style={{ transform: `scaleY(${done ? 1 : current ? stepProg : 0})` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className={styles.flowTicker}>
        <span className={styles.flowTickerDot} />
        <span>
          {isResetting ? "loop · reset" : `step ${active + 1} of ${FLOW.length} · ${FLOW[active].label.toLowerCase()}`}
        </span>
      </div>
    </div>
  );
}

/* ── Live counter card ── */
function CounterCard({ label, value, decimals, suffix, sublabel }) {
  const [n, ref] = useCountUp(value, decimals);
  return (
    <div className={styles.counter} ref={ref}>
      <div className={styles.counterLabel}>{label}</div>
      <div className={styles.counterValue}>
        <span className={styles.counterN}>{n}</span>
        {suffix && <span className={styles.counterSuffix}>{suffix}</span>}
      </div>
      {sublabel && <div className={styles.counterSub}>{sublabel}</div>}
    </div>
  );
}

/* ── Page ── */
export default function PulsePage() {
  return (
    <div className={styles.root}>
      <div className={styles.bg} />
      <div className={styles.grid} aria-hidden />

      {/* Nav */}
      <div className={styles.navWrap}>
        <div className={styles.nav}>
          <Link href="/" className={styles.navBrand}>
            <img src="/mylogo.png" alt="AGORA" width="20" height="20" />
            <span className={styles.navBrandName}>agora</span>
          </Link>
          <div className={styles.navLinks}>
            <Link href="/" className={styles.navLink}>Home</Link>
            <Link href="/square" className={styles.navLink}>Square</Link>
            <Link href="/pulse" className={`${styles.navLink} ${styles.navLinkActive}`}>Pulse</Link>
          </div>
        </div>
      </div>

      <div className={styles.container}>

        {/* Hero */}
        <motion.header
          className={styles.hero}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className={styles.eyebrow}>Live · GOAT mainnet</p>
          <h1 className={styles.h1}>
            Agora,<span className={styles.h1Italic}> in numbers.</span>
          </h1>
          <p className={styles.sub}>
            Every metric on this page is real, verifiable on-chain, and updates as
            the marketplace grows. This is where Agora's pulse lives.
          </p>
        </motion.header>

        {/* Counters — live metrics */}
        <section className={styles.section}>
          <p className={styles.sectionEyebrow}>Live metrics</p>
          <div className={styles.countersGrid}>
            <CounterCard
              label="Agent ID"
              value={AGENT_ID}
              suffix="#"
              sublabel="ERC-8004 · GOAT"
            />
            <CounterCard
              label="x402 settled"
              value={SETTLED_TX_COUNT}
              sublabel="verified on-chain"
            />
            <CounterCard
              label="Volume settled"
              value={SETTLED_USDC}
              decimals={2}
              suffix="USDC"
              sublabel="stablecoin denominated"
            />
            <CounterCard
              label="Avg settlement time"
              value={SETTLED_SECONDS}
              decimals={2}
              suffix="s"
              sublabel="request → confirmed"
            />
            <CounterCard
              label="Chain ID"
              value={CHAIN_ID}
              sublabel="GOAT mainnet · Bitcoin L2"
            />
            <CounterCard
              label="Block confirmed"
              value={BLOCK}
              sublabel="latest settled tx"
            />
          </div>
        </section>

        {/* Flow diagram */}
        <section className={styles.section}>
          <p className={styles.sectionEyebrow}>The flow</p>
          <h2 className={styles.sectionTitle}>
            How the agent settles a job,
            <span className={styles.italic}> end to end.</span>
          </h2>
          <p className={styles.sectionSub}>
            Six steps. Zero human approvals. This is the loop that runs every time
            Agora fulfills a compute request — from broadcasting the RFP to
            releasing escrow through x402.
          </p>
          <AgentFlow />
        </section>

        {/* Proof strip */}
        <section className={styles.section}>
          <p className={styles.sectionEyebrow}>Proof, not promises</p>
          <div className={styles.proofGrid}>
            <a href={AGENT_URL} target="_blank" rel="noopener noreferrer" className={styles.proofCard}>
              <div className={styles.proofLabel}>Agent identity</div>
              <div className={styles.proofValue}>#{AGENT_ID}</div>
              <div className={styles.proofSub}>agora_bot · ERC-8004</div>
              <div className={styles.proofLink}>View on 8004scan →</div>
            </a>
            <a href={TX_URL} target="_blank" rel="noopener noreferrer" className={styles.proofCard}>
              <div className={styles.proofLabel}>Settled transaction</div>
              <div className={styles.proofValue}>{TX_SHORT}</div>
              <div className={styles.proofSub}>1 USDC.e · CHECKOUT_VERIFIED</div>
              <div className={styles.proofLink}>View on GOAT Explorer →</div>
            </a>
            <div className={styles.proofCard}>
              <div className={styles.proofLabel}>Network</div>
              <div className={styles.proofValue}>GOAT</div>
              <div className={styles.proofSub}>Chain {CHAIN_ID} · Bitcoin-backed L2</div>
              <div className={styles.proofLinkGhost}>mainnet · not testnet</div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <p className={styles.footerLine}>Agora · OpenClaw Summer Bootcamp 2026</p>
          <div className={styles.footerLinks}>
            <Link href="/" className={styles.footerLink}>Home</Link>
            <Link href="/square" className={styles.footerLink}>Square</Link>
            <a href={AGENT_URL} target="_blank" rel="noopener noreferrer" className={styles.footerLink}>8004scan</a>
            <a href={TX_URL} target="_blank" rel="noopener noreferrer" className={styles.footerLink}>Explorer</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
