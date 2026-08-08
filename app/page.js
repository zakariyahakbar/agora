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
  const SECTION_COUNT = 5;
  const LAST = SECTION_COUNT - 1;

  useEffect(() => {
    const node = viewportRef.current; if (!node) return;
    const fn = () => setNavScrolled(node.scrollTop > 60);
    node.addEventListener("scroll", fn, { passive: true });
    return () => node.removeEventListener("scroll", fn);
  }, []);

  // Guard: force scroll to top on load and reject any auto-scroll from iframes
  // during the first second (browsers can pull the parent to a mounting iframe).
  useEffect(() => {
    const node = viewportRef.current; if (!node) return;
    // Kill browser scroll restoration entirely on this route
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    node.scrollTop = 0;
    window.scrollTo(0, 0);
    let lockActive = true;
    const enforce = () => { if (lockActive && node.scrollTop !== 0) node.scrollTop = 0; };
    // Enforce a few times during the settling window (iframes mount async)
    enforce();
    const raf1 = requestAnimationFrame(enforce);
    const t1 = setTimeout(enforce, 60);
    const t2 = setTimeout(enforce, 200);
    const t3 = setTimeout(enforce, 500);
    const t4 = setTimeout(() => { lockActive = false; }, 1200);
    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
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
            {["Home", "Real", "Square", "Agent", "Settlement"].map((l, i) => (
              <button key={l}
                className={`${styles.navLink} ${active === i ? styles.navLinkActive : ""}`}
                onClick={() => jumpTo(i)}>{l}</button>
            ))}
          </div>
          {/* Actions */}
          <div className={styles.navActions}>
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={styles.navTg}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.24 13.617l-2.94-.92c-.64-.203-.654-.64.135-.953l11.566-4.461c.537-.194 1.006.131.893.938z"/></svg>
              Agent
            </a>
            <div className={styles.livePill}><span className={styles.liveDot} />GOAT</div>
            <div className={styles.navAuthDivider} />
            <button type="button" className={styles.navLogin} onClick={(e) => e.preventDefault()}>Log In</button>
            <button type="button" className={styles.navSignup} onClick={(e) => e.preventDefault()}>Sign Up</button>
          </div>
        </div>
        <span className={styles.glassPill}>
          won all tracks + 3rd overall at openclaw hackathon 🏆
        </span>
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
                <p className={styles.eyebrow}>Autonomous Compute Economy · GOAT Network</p>
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
                    <MediaSlot type="image" src="/assets/8004scan.png" alt="Agent #82 on 8004scan" fallback="8004scan · agent card" />
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
                <div className={`${styles.pyFrame} ${styles.pyFramePortrait} ${styles.demoFrame}`}>
                  <div className={styles.pyFrameLabel}>Agora demo · live</div>
                  <div className={styles.pyFrameBody}>
                    <iframe
                      src="/demo?embed=1"
                      className={styles.showcaseIframe}
                      title="The Agora demo conversation"
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
                <InView><p className={styles.pyEyebrow}>The Agent · Live</p></InView>
                <SlideUp className={styles.pyTitle} delay={0.05}>The agent works.</SlideUp>
                <SlideUp className={`${styles.pyTitle} ${styles.pyTitleItalic}`} delay={0.13}>Right now.</SlideUp>
                <InView delay={0.22}><p className={styles.pySub}>Agora's agent manages its own wallet, handles its own registration, and settles x402 payments on GOAT mainnet. Six steps, zero human approvals — the whole loop, running.</p></InView>
                <InView delay={0.32}>
                  <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={styles.pyLink}>Talk to the agent →</a>
                </InView>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ S6 — SETTLEMENT + CTA ════════ */}
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
                  <MagBtn href="/square" className={styles.btnGhost}>Walk the Square</MagBtn>
                </InView>
              </div>
              <InView delay={0.2} className={styles.pyVisual}>
                <div className={styles.pyFrame}>
                  <div className={styles.pyFrameLabel}>explorer.goat.network</div>
                  <div className={styles.pyFrameBody}>
                    <MediaSlot type="image" src="/assets/onchain-tx.png" alt="Settled tx on GOAT Explorer" fallback="goat explorer · settled tx" />
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
