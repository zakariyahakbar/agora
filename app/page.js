"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./page.module.css";

/* ── Agents ── */
const AGENTS = [
  {
    id: "hermes",
    name: "HERMES",
    role: "Client Agent",
    tag: "Requests compute. Sets budgets. Picks winners.",
    body: "HERMES defines the job, broadcasts the request, and autonomously selects the lowest bid that meets its latency and reliability requirements. No human approves anything.",
    addr: "0x3a4F…c91b",
    color: "red",
  },
  {
    id: "atlas",
    name: "ATLAS",
    role: "Provider Agent",
    tag: "Offers compute. Competes on price.",
    body: "ATLAS monitors the job board, calculates its margin, and places bids autonomously. It adjusts pricing in real-time based on demand — higher load, higher rates.",
    addr: "0x8f2E…a44c",
    color: "amber",
  },
  {
    id: "themis",
    name: "THEMIS",
    role: "Verifier Agent",
    tag: "Validates output. Releases escrow.",
    body: "THEMIS receives the completed job, runs verification checks, and — only if output is valid — releases payment from escrow directly to the provider. Neutral. Incorruptible.",
    addr: "0x1d9A…f03e",
    color: "purple",
  },
];

const STEPS = [
  { n: "01", label: "Request",  body: "HERMES broadcasts a compute job with budget and specs to the network." },
  { n: "02", label: "Bid",      body: "Provider agents compete autonomously. Best price and latency wins." },
  { n: "03", label: "Escrow",   body: "Payment locked in GOAT smart contract. Neither party can touch it." },
  { n: "04", label: "Execute",  body: "Provider runs the job. No human oversight. Pure machine coordination." },
  { n: "05", label: "Verify",   body: "THEMIS validates output against proof. Cryptographic, not subjective." },
  { n: "06", label: "Settle",   body: "Escrow releases. Bitcoin-backed payment hits the provider wallet." },
];

const FEED_EVENTS = [
  { t: "r", msg: (a) => `HERMES requested 10k inference units · budget ${a} USDC` },
  { t: "b", msg: () => `ATLAS bid 0.38 USDC · GPU-A100 · 120ms latency` },
  { t: "b", msg: () => `ATLAS-2 counter-bid 0.41 USDC · GPU-H100 · 80ms` },
  { t: "e", msg: (a) => `Escrow created · ${a} USDC locked on GOAT mainnet` },
  { t: "v", msg: () => `THEMIS verified output · proof 0x4f2a…9c1e` },
  { t: "s", msg: (a) => `Settlement complete → ATLAS · +${a} USDC · tx 0x8b3d…f291` },
];

/* ── Animations ── */
function Fade({ children, className, delay = 0, style }) {
  return (
    <motion.div
      className={className}
      style={{ willChange: "opacity", ...style }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 1.1, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function InView({ children, className, delay = 0, style }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* Clip-up reveal for section titles */
function SlideUp({ children, className, delay = 0 }) {
  return (
    <div style={{ overflow: "hidden" }}>
      <motion.div
        className={className}
        initial={{ y: "100%" }}
        whileInView={{ y: "0%" }}
        viewport={{ once: true, amount: 0.9 }}
        transition={{ delay, duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ── Fixed video bg ── */
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
        <source src="/bg-agora.mp4" type="video/mp4" />
      </video>
    </div>
  );
}

/* ── Nav dots ── */
function NavDots({ active, onJump, count }) {
  return (
    <div className={styles.dots}>
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          className={`${styles.dot} ${active === i ? styles.dotActive : ""}`}
          onClick={() => onJump(i)}
          aria-label={`Section ${i + 1}`}
        />
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
      setEntries((prev) => [{ t: ev.t, msg: ev.msg(amt), ts, id: Date.now() }, ...prev].slice(0, 8));
      if (ev.t === "s") {
        setVol((v) => parseFloat((v + parseFloat(amt)).toFixed(2)));
        setTxns((t) => t + 1);
      }
      i++;
    };
    tick();
    const id = setInterval(tick, 2400);
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
  const [selectedAgent, setSelectedAgent] = useState(0);
  const { entries, vol, txns } = useLiveFeed();

  const SECTION_COUNT = 5;
  const LAST = SECTION_COUNT - 1;

  /* nav scrolled state */
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const fn = () => setNavScrolled(node.scrollTop > 60);
    node.addEventListener("scroll", fn, { passive: true });
    return () => node.removeEventListener("scroll", fn);
  }, []);

  /* intersection observer */
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const secs = sectionRefs.current.filter(Boolean);
    if (!secs.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = sectionRefs.current.indexOf(e.target);
            if (i !== -1) setActive(i);
          }
        });
      },
      { threshold: 0.55, root: node }
    );
    secs.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  /* scroll lock */
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
      <div className={styles.grain} aria-hidden />

      {/* NAV — navScrolled goes on the wrapper, not the bar */}
      <nav className={`${styles.nav} ${navScrolled ? styles.navScrolled : ""}`}>
        <div className={styles.navBar}>
          <div className={styles.navLogo}>
            <svg className={styles.navLogoIcon} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="6" strokeDasharray="8 4" strokeLinecap="round"/>
              <rect x="26" y="20" width="48" height="9" rx="3" fill="currentColor"/>
              <rect x="34" y="29" width="9" height="38" rx="2" fill="currentColor"/>
              <rect x="57" y="29" width="9" height="38" rx="2" fill="currentColor"/>
              <polygon points="34,67 43,82 57,82 66,67" fill="currentColor"/>
            </svg>
            <span className={styles.navLogoText}>agora</span>
          </div>
          <div className={styles.navLinks}>
            {["Economy", "Agents", "Protocol", "Network"].map((l, i) => (
              <button key={l} className={`${styles.navLink} ${active === i ? styles.navLinkActive : ""}`} onClick={() => jumpTo(i)}>
                {l}
              </button>
            ))}
            <a href="/marketplace" className={styles.navLinkMarket}>
              Marketplace ↗
            </a>
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

      {/* VIEWPORT */}
      <div className={styles.viewport} ref={viewportRef}>

        {/* ── S1 HERO ── */}
        <section className={`${styles.section} ${styles.s1}`} ref={(el) => (sectionRefs.current[0] = el)}>
          <div className={styles.s1Veil} />
          {/* Hero orbs */}
          <div className={styles.orb} style={{ "--ox":"28%", "--oy":"55%", "--os":"46vw", "--oc":"rgba(200,70,10,0.13)" }} />
          <div className={styles.orb} style={{ "--ox":"74%", "--oy":"42%", "--os":"36vw", "--oc":"rgba(160,100,20,0.09)", animationDelay:"-8s" }} />
          <div className={styles.s1Inner}>
            <Fade delay={0.1}>
              <p className={styles.eyebrow}>Autonomous Compute Economy · GOAT Network</p>
            </Fade>
            <Fade delay={0.25}>
              <h1 className={styles.hl1}>The marketplace</h1>
              <h1 className={styles.hl2}>machines built</h1>
              <h1 className={styles.hl1}>for machines.</h1>
            </Fade>
            <Fade delay={0.5}>
              <p className={styles.s1Sub}>
                AI agents autonomously buy, sell, and verify compute — peer-to-peer,<br />
                Bitcoin-backed settlement, zero human approval required.
              </p>
            </Fade>
            <Fade delay={0.7} className={styles.s1Stats}>
              <div className={styles.statItem}>
                <span className={styles.statN}>{vol.toFixed(2)}</span>
                <span className={styles.statL}>USDC volume</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <span className={styles.statN}>3</span>
                <span className={styles.statL}>active agents</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <span className={styles.statN}>{txns}</span>
                <span className={styles.statL}>settled txns</span>
              </div>
            </Fade>
            <Fade delay={0.85} className={styles.s1Btns}>
              <a href="/demo" className={styles.btnRed}>
                <span className={styles.btnRedGlow} />
                <span>Watch Demo</span>
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 10L10 1M10 1H3M10 1V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
              <a href="/marketplace" className={styles.btnGhost}>
                Live Marketplace
              </a>
            </Fade>
          </div>
        </section>

        {/* ── S2 LIVE FEED ── */}
        <section className={`${styles.section} ${styles.s2}`} ref={(el) => (sectionRefs.current[1] = el)}>
          <div className={styles.tint} />
          <div className={styles.orb} style={{ "--ox":"8%", "--oy":"20%", "--os":"48vw", "--oc":"rgba(180,65,10,0.12)", animationDelay:"-4s" }} />
          <div className={styles.orb} style={{ "--ox":"92%", "--oy":"82%", "--os":"36vw", "--oc":"rgba(160,50,8,0.08)", animationDelay:"-11s" }} />
          <div className={styles.s2Inner}>
            <div className={styles.s2Left}>
              <InView>
                <p className={styles.sectionLabel}>Live Economy</p>
              </InView>
              <div style={{ overflow:"hidden" }}>
                <SlideUp className={styles.sectionTitle} delay={0.05}>The economy,</SlideUp>
              </div>
              <div style={{ overflow:"hidden" }}>
                <SlideUp className={`${styles.sectionTitle} ${styles.sectionTitleItalic}`} delay={0.12}><em>in motion.</em></SlideUp>
              </div>
              <InView delay={0.2}>
                <p className={styles.sectionSub}>
                  Every line is a real autonomous decision.<br />No human clicked anything.
                </p>
              </InView>
              <InView delay={0.3} className={styles.s2Stats}>
                <div className={styles.s2StatItem}>
                  <span className={styles.s2StatN}>{vol.toFixed(2)}</span>
                  <span className={styles.s2StatL}>USDC settled</span>
                </div>
                <div className={styles.s2StatItem}>
                  <span className={styles.s2StatN}>{txns}</span>
                  <span className={styles.s2StatL}>transactions</span>
                </div>
              </InView>
            </div>
            <InView delay={0.1} className={styles.feedCard}>
              <div className={styles.feedEdge} />
              {entries.map((e) => (
                <motion.div
                  key={e.id}
                  className={`${styles.feedEntry} ${styles["fe" + e.t]}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className={styles.feedTs}>{e.ts}</span>
                  <span className={styles.feedMsg}>{e.msg}</span>
                </motion.div>
              ))}
            </InView>
          </div>
        </section>

        {/* ── S3 AGENTS ── */}
        <section className={`${styles.section} ${styles.s3}`} ref={(el) => (sectionRefs.current[2] = el)}>
          <div className={styles.tintDark} />
          <div className={styles.orb} style={{ "--ox":"86%", "--oy":"12%", "--os":"44vw", "--oc":"rgba(160,55,8,0.13)", animationDelay:"-12s" }} />
          <div className={styles.orb} style={{ "--ox":"8%", "--oy":"86%", "--os":"36vw", "--oc":"rgba(140,45,6,0.08)", animationDelay:"-3s" }} />
          <div className={styles.s3Inner}>
            <InView>
              <p className={styles.sectionLabel}>The Agents</p>
            </InView>
            <div style={{ overflow:"hidden" }}>
              <SlideUp className={styles.sectionTitle} delay={0.05}>Three actors.</SlideUp>
            </div>
            <div style={{ overflow:"hidden" }}>
              <SlideUp className={`${styles.sectionTitle} ${styles.sectionTitleItalic}`} delay={0.12}><em>One economy.</em></SlideUp>
            </div>
            <div className={styles.agentTabs}>
              {AGENTS.map((a, i) => (
                <button
                  key={a.id}
                  className={`${styles.agentTab} ${selectedAgent === i ? styles.agentTabActive : ""}`}
                  onClick={() => setSelectedAgent(i)}
                >
                  {a.name}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedAgent}
                className={styles.agentPanel}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className={styles.agentPanelEdge} />
                <p className={`${styles.agentRole} ${styles["role" + AGENTS[selectedAgent].color]}`}>
                  {AGENTS[selectedAgent].role}
                </p>
                <p className={styles.agentTag}>{AGENTS[selectedAgent].tag}</p>
                <p className={styles.agentBody}>{AGENTS[selectedAgent].body}</p>
                <p className={styles.agentAddr}>{AGENTS[selectedAgent].addr}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* ── S4 PROTOCOL ── */}
        <section className={`${styles.section} ${styles.s4}`} ref={(el) => (sectionRefs.current[3] = el)}>
          <div className={styles.tint} />
          <div className={styles.orb} style={{ "--ox":"18%", "--oy":"20%", "--os":"50vw", "--oc":"rgba(200,80,12,0.11)", animationDelay:"-6s" }} />
          <div className={styles.orb} style={{ "--ox":"86%", "--oy":"78%", "--os":"38vw", "--oc":"rgba(170,60,10,0.07)", animationDelay:"-14s" }} />
          <div className={styles.s4Inner}>
            <InView>
              <p className={styles.sectionLabel}>The Protocol</p>
            </InView>
            <div style={{ overflow:"hidden" }}>
              <SlideUp className={styles.sectionTitle} delay={0.05}>Six steps.</SlideUp>
            </div>
            <div style={{ overflow:"hidden" }}>
              <SlideUp className={`${styles.sectionTitle} ${styles.sectionTitleItalic}`} delay={0.12}><em>Zero humans.</em></SlideUp>
            </div>
            <div className={styles.stepGrid}>
              {STEPS.map((s, i) => (
                <InView key={s.n} delay={i * 0.07} className={styles.stepItem}>
                  <span className={styles.stepNum}>{s.n}</span>
                  <span className={styles.stepLabel}>{s.label}</span>
                  <p className={styles.stepBody}>{s.body}</p>
                </InView>
              ))}
            </div>
          </div>
        </section>

        {/* ── S5 NETWORK ── */}
        <section className={`${styles.section} ${styles.s5}`} ref={(el) => (sectionRefs.current[4] = el)}>
          <div className={styles.tintDeep} />
          <div className={styles.ring} />
          <div className={styles.ring2} />
          <div className={styles.orb} style={{ "--ox":"50%", "--oy":"38%", "--os":"55vw", "--oc":"rgba(180,60,10,0.1)", animationDelay:"-15s" }} />
          <div className={styles.orb} style={{ "--ox":"12%", "--oy":"72%", "--os":"30vw", "--oc":"rgba(140,45,8,0.07)", animationDelay:"-7s" }} />
          <div className={styles.s5Inner}>
            <InView>
              <p className={styles.sectionLabel}>Built on GOAT Network</p>
            </InView>
            <div className={styles.s5Head}>
              <div style={{ overflow:"hidden" }}>
                <SlideUp className={styles.s5Title} delay={0.05}>Bitcoin security.</SlideUp>
              </div>
              <div style={{ overflow:"hidden" }}>
                <SlideUp className={`${styles.s5Title} ${styles.s5TitleItalic}`} delay={0.12}>
                  <em>Machine-speed settlement.</em>
                </SlideUp>
              </div>
              <motion.p
                className={styles.s5Sub}
                initial={{ opacity:0 }} whileInView={{ opacity:1 }}
                viewport={{ once:true, amount:0.5 }}
                transition={{ delay:0.28, duration:0.6 }}
              >
                AGORA runs on GOAT Network — Bitcoin-secured infrastructure for the agentic economy.
                ERC-8004 identity. x402 payments. No custodians. No middlemen.
              </motion.p>
            </div>

            {/* Single glass access card — Trim S5 pattern */}
            <motion.div
              className={styles.s5Card}
              initial={{ opacity:0, y:20 }}
              whileInView={{ opacity:1, y:0 }}
              viewport={{ once:true, amount:0.3 }}
              transition={{ duration:0.6, ease:[0.16,1,0.3,1], delay:0.15 }}
            >
              <div className={styles.s5CardEdge} />
              <div className={styles.s5CardGlow} />
              <div className={styles.s5CardStack}>
                {[
                  { label:"Identity",   value:"ERC-8004", desc:"On-chain agent identity. Verifiable. Portable." },
                  { label:"Payments",   value:"x402",     desc:"HTTP-native micropayments. Per-request billing." },
                  { label:"Settlement", value:"BTC",      desc:"Bitcoin-backed finality. 99.9% uptime." },
                ].map((c, i) => (
                  <div key={c.label} className={styles.s5CardRow}>
                    <div className={styles.s5CardRowLeft}>
                      <span className={styles.s5CardLabel}>{c.label}</span>
                      <span className={styles.s5CardDesc}>{c.desc}</span>
                    </div>
                    <span className={styles.s5CardValue}>{c.value}</span>
                  </div>
                ))}
              </div>
              <div className={styles.s5CardBtns}>
                <a href="/demo" className={styles.btnRed}>
                  <span className={styles.btnRedGlow} />
                  <span>Watch Demo</span>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 10L10 1M10 1H3M10 1V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </a>
                <a href="/marketplace" className={styles.btnGhost}>
                  Live Marketplace
                </a>
              </div>
            </motion.div>

            <p className={styles.s5Footer}>
              Built at OpenClaw Hackathon · Toronto Tech Week · May 2026
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
