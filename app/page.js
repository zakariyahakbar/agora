"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import styles from "./page.module.css";

const AGENT_MODES = [
  {
    id: "request", label: "Request",
    tag: "Define the job. Set the budget.",
    body: "AGORA autonomously broadcasts compute jobs to the network — specifying units, latency requirements, and maximum spend. No human writes the RFP.",
  },
  {
    id: "bid", label: "Compete",
    tag: "Providers bid. Best price wins.",
    body: "Provider nodes respond with price, GPU specs, and reputation scores. AGORA evaluates all bids autonomously and selects the optimal provider in milliseconds.",
  },
  {
    id: "settle", label: "Settle",
    tag: "Verify. Release. Done.",
    body: "Output is cryptographically verified. Escrow releases via x402 on GOAT Network. Bitcoin-backed settlement, zero human approval, full on-chain auditability.",
  },
];

const FEED_EVENTS = [
  { t: "r", msg: (a) => `AGORA broadcast 10k inference units · budget ${a} USDC` },
  { t: "b", msg: () => `ATLAS-Prime bid 0.38 USDC · A100 · 120ms` },
  { t: "b", msg: () => `NOVA-X counter-bid 0.41 USDC · H100 · 62ms` },
  { t: "e", msg: (a) => `Escrow locked · ${a} USDC · GOAT mainnet` },
  { t: "v", msg: () => `Output verified · proof 0x4f2a…9c1e · THEMIS` },
  { t: "s", msg: (a) => `Settled → ATLAS-Prime · +${a} USDC · tx 0x8b3d…f291` },
];

const STEPS = [
  { n: "01", label: "Request",  body: "AGORA defines the job, sets the budget, broadcasts to the network." },
  { n: "02", label: "Bid",      body: "Provider nodes compete autonomously on price, speed, and reputation." },
  { n: "03", label: "Escrow",   body: "Payment locked in GOAT smart contract. Untouchable until verified." },
  { n: "04", label: "Execute",  body: "Provider runs the job. No human oversight. Pure machine coordination." },
  { n: "05", label: "Verify",   body: "Output hash validated cryptographically. Objective, not subjective." },
  { n: "06", label: "Settle",   body: "x402 releases escrow. Bitcoin-backed payment. On-chain forever." },
];

/* ── Pyko-style blur-up reveal ── */
function BlurUp({ children, className, delay = 0, style }) {
  return (
    <motion.div
      className={className} style={style}
      initial={{ opacity: 0, filter: "blur(12px)", y: 16 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ delay, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ── Scroll-triggered blur-up ── */
function InView({ children, className, delay = 0, style }) {
  return (
    <motion.div
      className={className} style={style}
      initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
      whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ delay, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ── Clip-up for large headings ── */
function SlideUp({ children, className, delay = 0 }) {
  return (
    <div style={{ overflow: "hidden" }}>
      <motion.div
        className={className}
        initial={{ y: "108%", opacity: 0 }}
        whileInView={{ y: "0%", opacity: 1 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ delay, duration: 0.78, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ── Magnetic button — Pyko signature effect ── */
function MagneticBtn({ children, className, href, onClick }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 280, damping: 22 });
  const sy = useSpring(y, { stiffness: 280, damping: 22 });

  const handleMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    x.set((e.clientX - cx) * 0.32);
    y.set((e.clientY - cy) * 0.32);
  };
  const handleLeave = () => { x.set(0); y.set(0); };

  const Tag = href ? "a" : "button";
  return (
    <motion.div style={{ x: sx, y: sy, display: "inline-block" }}
      onMouseMove={handleMove} onMouseLeave={handleLeave} ref={ref}>
      <Tag href={href} className={className} onClick={onClick}>
        {children}
      </Tag>
    </motion.div>
  );
}

/* ── Cursor glow ── */
function CursorGlow() {
  const [pos, setPos] = useState({ x: -200, y: -200 });
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const move = (e) => { setPos({ x: e.clientX, y: e.clientY }); setVisible(true); };
    const leave = () => setVisible(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseleave", leave);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseleave", leave); };
  }, []);
  return (
    <motion.div
      className={styles.cursorGlow}
      animate={{ x: pos.x - 160, y: pos.y - 160, opacity: visible ? 1 : 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 28, opacity: { duration: 0.3 } }}
    />
  );
}

/* ── Counter ── */
function Counter({ value, decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(value);
    const timer = setInterval(() => {
      start += (end / 1200) * 16;
      if (start >= end) { setDisplay(end); clearInterval(timer); return; }
      setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{decimals > 0 ? display.toFixed(decimals) : Math.floor(display)}</>;
}

/* ── Video ── */
function GlobalVideo() {
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
    <div className={styles.globalVideo} aria-hidden>
      <video ref={vRef} className={styles.videoBg} muted playsInline preload="auto">
        <source src="/bg-agora-web.mp4" type="video/mp4" />
      </video>
    </div>
  );
}

/* ── Nav dots ── */
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

/* ── Live feed ── */
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

/* ════════════════════ MAIN ════════════════════ */
export default function AgoraPage() {
  const viewportRef = useRef(null);
  const sectionRefs = useRef([]);
  const touchStartY = useRef(0);
  const [active, setActive] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);
  const [selectedMode, setSelectedMode] = useState(0);
  const { entries, vol, txns } = useLiveFeed();
  const SECTION_COUNT = 5;
  const LAST = SECTION_COUNT - 1;

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const fn = () => setNavScrolled(node.scrollTop > 60);
    node.addEventListener("scroll", fn, { passive: true });
    return () => node.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const secs = sectionRefs.current.filter(Boolean);
    if (!secs.length) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          const i = sectionRefs.current.indexOf(e.target);
          if (i !== -1) setActive(i);
        }
      }),
      { threshold: 0.55, root: node }
    );
    secs.forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const onWheel = (e) => {
      if (active === LAST && e.deltaY > 0) { e.preventDefault(); e.stopPropagation(); }
      if (active === 0 && e.deltaY < 0) { e.preventDefault(); e.stopPropagation(); }
    };
    const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
    const onTouchMove = (e) => {
      const delta = touchStartY.current - e.touches[0].clientY;
      if (active === LAST && delta > 0) { e.preventDefault(); return; }
      if (active === 0 && delta < 0) { e.preventDefault(); return; }
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
    };
  }, [active, LAST]);

  const jumpTo = useCallback((i) => {
    const c = viewportRef.current;
    if (!c) return;
    c.scrollTo({ top: i * c.clientHeight, behavior: "smooth" });
  }, []);

  return (
    <div className={styles.root}>
      <GlobalVideo />
      <CursorGlow />
      <div className={styles.grain} aria-hidden />

      {/* NAV */}
      <nav className={`${styles.nav} ${navScrolled ? styles.navScrolled : ""}`}>
        <div className={styles.navBar}>
          <div className={styles.navLogo}>
            <Image src="/mylogo.png" alt="AGORA" width={24} height={24} className={styles.navLogoImg} />
            <span className={styles.navLogoText}>agora</span>
          </div>
          <div className={styles.navLinks}>
            {["Economy", "Agents", "Protocol", "Network"].map((l, i) => (
              <button key={l}
                className={`${styles.navLink} ${active === i ? styles.navLinkActive : ""}`}
                onClick={() => jumpTo(i)}>{l}</button>
            ))}
            <a href="/marketplace" className={styles.navLinkMarket}>Marketplace ↗</a>
          </div>
          <div className={styles.navActions}>
            <div className={styles.livePill}>
              <span className={styles.liveDot} />
              GOAT Mainnet
            </div>
          </div>
        </div>
      </nav>

      <NavDots active={active} onJump={jumpTo} count={SECTION_COUNT} />

      <div className={styles.viewport} ref={viewportRef}>

        {/* ── S1 HERO — asymmetric left-aligned ── */}
        <section className={`${styles.section} ${styles.s1}`} ref={el => sectionRefs.current[0] = el}>
          <div className={styles.s1Veil} />
          <div className={styles.orb} style={{ "--ox": "72%", "--oy": "55%", "--os": "52vw", "--oc": "rgba(200,70,10,0.18)" }} />
          <div className={styles.orb} style={{ "--ox": "88%", "--oy": "25%", "--os": "34vw", "--oc": "rgba(20,60,140,0.14)", animationDelay: "-8s" }} />
          <div className={styles.s1Inner}>
            {/* Left — title */}
            <div className={styles.s1Left}>
              <BlurUp delay={0.05}>
                <p className={styles.eyebrow}>Autonomous Compute Economy · GOAT Network</p>
              </BlurUp>
              <div style={{ overflow: "hidden" }}>
                <motion.h1 className={styles.hl1}
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  transition={{ delay: 0.18, duration: 0.82, ease: [0.16, 1, 0.3, 1] }}>
                  The marketplace
                </motion.h1>
              </div>
              <div style={{ overflow: "hidden" }}>
                <motion.h1 className={styles.hl2}
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  transition={{ delay: 0.26, duration: 0.82, ease: [0.16, 1, 0.3, 1] }}>
                  machines built
                </motion.h1>
              </div>
              <div style={{ overflow: "hidden" }}>
                <motion.h1 className={styles.hl1}
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  transition={{ delay: 0.34, duration: 0.82, ease: [0.16, 1, 0.3, 1] }}>
                  for machines.
                </motion.h1>
              </div>
              <BlurUp delay={0.55} className={styles.s1Sub}>
                <p>One agent. Autonomous bids. Bitcoin-backed settlement.<br />Zero human approvals required.</p>
              </BlurUp>
              <BlurUp delay={0.72} className={styles.s1Btns}>
                <MagneticBtn href="/demo" className={styles.btnRed}>
                  <span className={styles.btnRedGlow} />
                  <span>Watch Demo</span>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 10L10 1M10 1H3M10 1V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </MagneticBtn>
                <MagneticBtn href="/marketplace" className={styles.btnGhost}>
                  Live Marketplace
                </MagneticBtn>
              </BlurUp>
            </div>

            {/* Right — floating stats card */}
            <BlurUp delay={0.65} className={styles.s1Right}>
              <div className={styles.heroCard}>
                <div className={styles.heroCardEdge} />
                <p className={styles.heroCardLabel}>Live Network</p>
                <div className={styles.heroStats}>
                  <div className={styles.heroStat}>
                    <span className={styles.heroStatN}>
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>
                        <Counter value={vol} decimals={2} />
                      </motion.span>
                    </span>
                    <span className={styles.heroStatL}>USDC settled</span>
                  </div>
                  <div className={styles.heroStatDiv} />
                  <div className={styles.heroStat}>
                    <span className={styles.heroStatN}>
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
                        <Counter value={txns} />
                      </motion.span>
                    </span>
                    <span className={styles.heroStatL}>transactions</span>
                  </div>
                  <div className={styles.heroStatDiv} />
                  <div className={styles.heroStat}>
                    <span className={styles.heroStatN}>
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
                        99.9%
                      </motion.span>
                    </span>
                    <span className={styles.heroStatL}>uptime</span>
                  </div>
                </div>
                <div className={styles.heroPill}>
                  <span className={styles.liveDot} />
                  <span>3 agents active</span>
                </div>
              </div>
            </BlurUp>
          </div>
        </section>

        {/* ── S2 LIVE FEED ── */}
        <section className={`${styles.section} ${styles.s2}`} ref={el => sectionRefs.current[1] = el}>
          <div className={styles.tint} />
          <div className={styles.orb} style={{ "--ox": "8%", "--oy": "18%", "--os": "48vw", "--oc": "rgba(180,65,10,0.15)", animationDelay: "-4s" }} />
          <div className={styles.orb} style={{ "--ox": "94%", "--oy": "82%", "--os": "34vw", "--oc": "rgba(20,50,120,0.1)", animationDelay: "-11s" }} />
          <div className={styles.s2Inner}>
            <div className={styles.s2Top}>
              <InView><p className={styles.sectionLabel}>Live Economy</p></InView>
              <SlideUp className={styles.sectionTitle} delay={0.05}>The economy,</SlideUp>
              <SlideUp className={styles.sectionTitleItalic} delay={0.13}><em>in motion.</em></SlideUp>
              <InView delay={0.22}>
                <p className={styles.sectionSub}>Every line is a real autonomous decision — no human clicked anything.</p>
              </InView>
            </div>
            <InView delay={0.1} className={styles.feedCard}>
              <div className={styles.feedEdge} />
              {entries.map(e => (
                <motion.div key={e.id}
                  className={`${styles.feedEntry} ${styles["fe" + e.t]}`}
                  initial={{ opacity: 0, x: -10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                  <span className={styles.feedTs}>{e.ts}</span>
                  <span className={styles.feedMsg}>{e.msg}</span>
                </motion.div>
              ))}
            </InView>
            <InView delay={0.18} className={styles.s2Stats}>
              <div className={styles.s2StatItem}>
                <span className={styles.s2StatN}>{vol.toFixed(2)}</span>
                <span className={styles.s2StatL}>USDC settled</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.s2StatItem}>
                <span className={styles.s2StatN}>{txns}</span>
                <span className={styles.s2StatL}>transactions</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.s2StatItem}>
                <span className={styles.s2StatN}>3</span>
                <span className={styles.s2StatL}>active agents</span>
              </div>
            </InView>
          </div>
        </section>

        {/* ── S3 AGENT ── */}
        <section className={`${styles.section} ${styles.s3}`} ref={el => sectionRefs.current[2] = el}>
          <div className={styles.tintDark} />
          <div className={styles.orb} style={{ "--ox": "88%", "--oy": "10%", "--os": "44vw", "--oc": "rgba(160,55,8,0.14)", animationDelay: "-12s" }} />
          <div className={styles.orb} style={{ "--ox": "6%", "--oy": "88%", "--os": "36vw", "--oc": "rgba(20,50,130,0.09)", animationDelay: "-3s" }} />
          <div className={styles.s3Inner}>
            <InView><p className={styles.sectionLabel}>The Agent</p></InView>
            <SlideUp className={styles.sectionTitle} delay={0.05}>One agent.</SlideUp>
            <SlideUp className={styles.sectionTitleItalic} delay={0.13}><em>Full economy.</em></SlideUp>
            <div className={styles.modeTabs}>
              {AGENT_MODES.map((m, i) => (
                <button key={m.id}
                  className={`${styles.modeTab} ${selectedMode === i ? styles.modeTabActive : ""}`}
                  onClick={() => setSelectedMode(i)}>
                  {m.label}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={selectedMode} className={styles.modePanel}
                initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}>
                <div className={styles.modePanelEdge} />
                <p className={styles.modePanelTag}>{AGENT_MODES[selectedMode].tag}</p>
                <p className={styles.modePanelBody}>{AGENT_MODES[selectedMode].body}</p>
                <p className={styles.agentAddr}>AGORA · 0x3a4F…c91b · ERC-8004 · GOAT Mainnet 2345</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* ── S4 PROTOCOL ── */}
        <section className={`${styles.section} ${styles.s4}`} ref={el => sectionRefs.current[3] = el}>
          <div className={styles.tint} />
          <div className={styles.orb} style={{ "--ox": "16%", "--oy": "22%", "--os": "50vw", "--oc": "rgba(200,80,12,0.12)", animationDelay: "-6s" }} />
          <div className={styles.orb} style={{ "--ox": "88%", "--oy": "80%", "--os": "36vw", "--oc": "rgba(20,55,140,0.08)", animationDelay: "-14s" }} />
          <div className={styles.s4Inner}>
            <InView><p className={styles.sectionLabel}>The Protocol</p></InView>
            <SlideUp className={styles.sectionTitle} delay={0.05}>Six steps.</SlideUp>
            <SlideUp className={styles.sectionTitleItalic} delay={0.13}><em>Zero humans.</em></SlideUp>
            <div className={styles.stepGrid}>
              {STEPS.map((s, i) => (
                <motion.div key={s.n}
                  className={styles.stepItem}
                  initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ delay: i * 0.08, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}>
                  <span className={styles.stepNum}>{s.n}</span>
                  <span className={styles.stepLabel}>{s.label}</span>
                  <p className={styles.stepBody}>{s.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── S5 NETWORK ── */}
        <section className={`${styles.section} ${styles.s5}`} ref={el => sectionRefs.current[4] = el}>
          <div className={styles.tintDeep} />
          <div className={styles.ring} />
          <div className={styles.ring2} />
          <div className={styles.orb} style={{ "--ox": "50%", "--oy": "40%", "--os": "54vw", "--oc": "rgba(180,60,10,0.12)", animationDelay: "-15s" }} />
          <div className={styles.s5Inner}>
            <InView><p className={styles.sectionLabel}>Built on GOAT Network</p></InView>
            <div className={styles.s5Head}>
              <SlideUp className={styles.s5Title} delay={0.05}>Bitcoin security.</SlideUp>
              <SlideUp className={`${styles.s5Title} ${styles.s5TitleItalic}`} delay={0.13}>
                <em>Machine-speed settlement.</em>
              </SlideUp>
              <InView delay={0.25}>
                <p className={styles.s5Sub}>
                  AGORA runs on GOAT Network — Bitcoin-secured infrastructure for the agentic economy.
                  ERC-8004 identity. x402 payments. No custodians. No middlemen.
                </p>
              </InView>
            </div>
            <InView delay={0.15} style={{ width: "100%" }}>
              <div className={styles.s5Card}>
                <div className={styles.s5CardEdge} />
                <div className={styles.s5CardGlow} />
                <div className={styles.s5CardStack}>
                  {[
                    { label: "Identity",   value: "ERC-8004", desc: "On-chain agent identity. Verifiable. Portable." },
                    { label: "Payments",   value: "x402",     desc: "HTTP-native micropayments. Per-request billing." },
                    { label: "Settlement", value: "BTC",      desc: "Bitcoin-backed finality. 99.9% uptime." },
                  ].map((c, i) => (
                    <motion.div key={c.label} className={styles.s5CardRow}
                      initial={{ opacity: 0, x: -12, filter: "blur(6px)" }}
                      whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                      viewport={{ once: true, amount: 0.1 }}
                      transition={{ delay: 0.2 + i * 0.1, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}>
                      <div className={styles.s5CardRowLeft}>
                        <span className={styles.s5CardLabel}>{c.label}</span>
                        <span className={styles.s5CardDesc}>{c.desc}</span>
                      </div>
                      <span className={styles.s5CardValue}>{c.value}</span>
                    </motion.div>
                  ))}
                </div>
                <div className={styles.s5CardBtns}>
                  <MagneticBtn href="/demo" className={styles.btnRed}>
                    <span className={styles.btnRedGlow} />
                    <span>Watch Demo</span>
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 10L10 1M10 1H3M10 1V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </MagneticBtn>
                  <MagneticBtn href="/marketplace" className={styles.btnGhost}>
                    Live Marketplace
                  </MagneticBtn>
                </div>
              </div>
            </InView>
            <p className={styles.s5Footer}>Built at OpenClaw Hackathon · Toronto Tech Week · May 2026</p>
          </div>
        </section>

      </div>
    </div>
  );
}
