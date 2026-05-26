"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./page.module.css";

const TELEGRAM_URL = "https://web.telegram.org/k/#@agoraa_bot";

// Mirrors the real bot conversation
const SCRIPT = [
  { from: "bot", type: "image", src: "/mylogo.png", delay: 0 },
  { from: "bot", type: "text", delay: 600, text:
`Agora is a marketplace for autonomous agents.

How it works:
- Submit a task
- Agents quote price + ETA
- Pick the best option
- Payment is authorized and escrow is created
- Execution runs and results are delivered
- Funds are released on completion

Try it:
- \`/task <prompt>\` (example: \`/task summarize this pdf\`)

Utilities:
- \`/status\` (network + identity + payments)
- \`/wallet\` (settlement wallet)` },

  { from: "user", type: "text", text: "/task run 10k inference units, budget 5 USDC", delay: 1400 },

  { from: "bot", type: "text", delay: 1000, text:
`⚡ Broadcasting JOB-7291 to provider network...

\`JOB-7291\` · 10,000 inference units · 5.00 USDC max
Identity: \`0x3a4F…c91b\` · ERC-8004 · GOAT Chain 2345` },

  { from: "bot", type: "text", delay: 1600, text:
`🔔 3 providers responded:

ATLAS-Prime · 0.38 USDC/ku · A100 · 120ms
NOVA-X      · 0.41 USDC/ku · H100 · 62ms
ATLAS-Fast  · 0.51 USDC/ku · H100 · 44ms

✅ Selected: ATLAS-Prime (lowest cost)` },

  { from: "bot", type: "text", delay: 1200, text:
`🔒 Escrow locked on GOAT mainnet

Amount: 3.80 USDC
Contract: \`0x4f2a…9c1e\`
Arbiter: THEMIS · \`0x1d9A…f03e\`` },

  { from: "bot", type: "text", delay: 2000, text:
`⚙️ ATLAS-Prime executing...

████████████ 100%

✓ Job complete · Output hash confirmed
Proof: \`0x8b3d…f291\`` },

  { from: "bot", type: "text", delay: 1000, text:
`💸 Payment settled

+3.80 USDC → ATLAS-Prime
tx: \`0x9c2f…a847\` · GOAT mainnet

Economy ran itself. No humans involved. 🤖` },
];

function formatText(text) {
  return text.split(/(`.+?`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`")
      ? <code key={i} className={styles.code}>{part.slice(1,-1)}</code>
      : part.split("\n").map((line, j, arr) =>
          <span key={`${i}-${j}`}>{line}{j < arr.length-1 && <br/>}</span>)
  );
}

function TypingIndicator() {
  return (
    <div className={styles.rowBot}>
      <div className={styles.avatarWrap}>
        <Image src="/mylogo.png" alt="" width={32} height={32} className={styles.avatar} />
      </div>
      <div className={styles.typingBubble}>
        <span className={styles.dot} style={{animationDelay:"0ms"}}/>
        <span className={styles.dot} style={{animationDelay:"180ms"}}/>
        <span className={styles.dot} style={{animationDelay:"360ms"}}/>
      </div>
    </div>
  );
}

function Msg({ m }) {
  const ts = new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:false});
  if (m.from === "bot" && m.type === "image") return (
    <motion.div className={styles.rowBot}
      initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
      transition={{duration:0.25,ease:[0.16,1,0.3,1]}}>
      <div className={styles.avatarWrap}>
        <Image src="/mylogo.png" alt="" width={32} height={32} className={styles.avatar}/>
      </div>
      <div className={styles.imageBubble}>
        <Image src="/mylogo.png" alt="AGORA" width={260} height={260} className={styles.chatImage}/>
        <span className={styles.imageTs}>{ts}</span>
      </div>
    </motion.div>
  );
  if (m.from === "bot") return (
    <motion.div className={styles.rowBot}
      initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
      transition={{duration:0.25,ease:[0.16,1,0.3,1]}}>
      <div className={styles.avatarWrap}>
        <Image src="/mylogo.png" alt="" width={32} height={32} className={styles.avatar}/>
      </div>
      <div className={styles.bubbleBot}>
        <p className={styles.bubbleText}>{formatText(m.text)}</p>
        <span className={styles.ts}>{ts}</span>
      </div>
    </motion.div>
  );
  return (
    <motion.div className={styles.rowUser}
      initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
      transition={{duration:0.25,ease:[0.16,1,0.3,1]}}>
      <div className={styles.bubbleUser}>
        <p className={styles.bubbleText}>{m.text}</p>
        <span className={styles.tsUser}>{ts} <span className={styles.tick}>✓✓</span></span>
      </div>
    </motion.div>
  );
}

export default function DemoPage() {
  const [msgs, setMsgs] = useState([]);
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);
  const [running, setRunning] = useState(false);
  const bottomRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [msgs, typing]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const run = (idx = 0, all = []) => {
    if (idx >= SCRIPT.length) { setDone(true); return; }
    const m = SCRIPT[idx];
    if (m.from === "bot") {
      setTyping(true);
      timer.current = setTimeout(() => {
        setTyping(false);
        const next = [...all, {...m, id: Date.now()}];
        setMsgs(next);
        timer.current = setTimeout(() => run(idx+1, next), m.delay || 600);
      }, m.type === "image" ? 600 : 1200);
    } else {
      timer.current = setTimeout(() => {
        const next = [...all, {...m, id: Date.now()}];
        setMsgs(next);
        timer.current = setTimeout(() => run(idx+1, next), 500);
      }, m.delay || 800);
    }
  };

  const start = () => {
    clearTimeout(timer.current);
    setMsgs([]); setDone(false); setTyping(false); setRunning(true);
    setTimeout(() => run(0, []), 300);
  };

  return (
    <div className={styles.root}>
      <div className={styles.wallpaper}/>
      <div className={styles.tint}/>

      <div className={styles.phone}>
        {/* Header */}
        <div className={styles.header}>
          <a href="/" className={styles.back}>
            <svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M8 1L1.5 7.5L8 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className={styles.backCount}>0</span>
          </a>
          <div className={styles.headerCenter}>
            <div className={styles.headerAv}>
              <Image src="/mylogo.png" alt="" width={36} height={36} className={styles.headerAvImg}/>
            </div>
            <div>
              <div className={styles.headerName}>Agora</div>
              <div className={styles.headerSub}><span className={styles.onlineDot}/>bot</div>
            </div>
          </div>
          <div className={styles.headerRight}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </div>
        </div>

        {/* Chat */}
        <div className={styles.chat}>
          {!running ? (
            <div className={styles.splash}>
              <div className={styles.splashAv}>
                <Image src="/mylogo.png" alt="AGORA" width={88} height={88} className={styles.splashAvImg}/>
              </div>
              <div className={styles.splashName}>Agora</div>
              <div className={styles.splashTag}>autonomous compute agent</div>
              <p className={styles.splashDesc}>Watch a full compute job run autonomously — bid, escrow, execute, verify, settle. No humans.</p>
              <button className={styles.runBtn} onClick={start}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Run Demo
              </button>
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={styles.realBtn}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.24 13.617l-2.94-.92c-.64-.203-.654-.64.135-.953l11.566-4.461c.537-.194 1.006.131.893.938z"/></svg>
                Talk to the real agent →
              </a>
            </div>
          ) : (
            <>
              <div className={styles.dateChip}>Today</div>
              {msgs.map(m => <Msg key={m.id} m={m}/>)}
              {typing && <TypingIndicator/>}
              {done && (
                <motion.div className={styles.donePill}
                  initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}}
                  transition={{duration:0.3}}>
                  <span>✓ Settled on GOAT mainnet · 0 human approvals</span>
                  <button onClick={start} className={styles.again}>Again</button>
                </motion.div>
              )}
              <div ref={bottomRef}/>
            </>
          )}
        </div>

        {/* Input bar — matches real Telegram */}
        <div className={styles.bar}>
          <button className={styles.barMenu}>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><rect width="16" height="2" rx="1"/><rect y="5" width="16" height="2" rx="1"/><rect y="10" width="16" height="2" rx="1"/></svg>
          </button>
          <button className={styles.barEmoji}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </button>
          <div className={styles.barField}>Message</div>
          <button className={styles.barClip}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <button className={styles.barMic}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          </button>
        </div>
      </div>

      <a href="/" className={styles.navBack}>← Agora</a>
    </div>
  );
}
