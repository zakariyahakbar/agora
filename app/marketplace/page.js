"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./page.module.css";

/* ── Constants ── */
const PROVIDERS = [
  { id: "atlas-prime",    name: "ATLAS-Prime",    gpu: "A100 · 80GB",  basePrice: 0.38, latency: 120, uptime: 99.7, rep: 847, color: "orange" },
  { id: "atlas-fast",     name: "ATLAS-Fast",     gpu: "H100 · 80GB",  basePrice: 0.51, latency: 62,  uptime: 99.9, rep: 961, color: "silver" },
  { id: "atlas-budget",   name: "ATLAS-Budget",   gpu: "RTX 4090",     basePrice: 0.22, latency: 280, uptime: 97.2, rep: 612, color: "dim"    },
  { id: "nova-compute",   name: "NOVA-Compute",   gpu: "A100 · 40GB",  basePrice: 0.41, latency: 155, uptime: 98.8, rep: 733, color: "silver" },
  { id: "grid-x",        name: "GRID-X",          gpu: "H100 · 80GB",  basePrice: 0.48, latency: 88,  uptime: 99.4, rep: 812, color: "orange" },
];

const JOB_TYPES = [
  "LLM Inference",
  "Image Generation",
  "Embedding Batch",
  "Model Fine-tune",
  "ZK Proof Gen",
  "Data Pipeline",
];

const HERMES_WALLETS = ["0x3a4F…c91b","0x9bE2…d33a","0x7c1A…f82e","0x4d8C…a17f"];
const THEMIS_ADDR = "0x1d9A…f03e";

let jobCounter = 1000;
let bidCounter = 5000;

function makeJob() {
  jobCounter++;
  const type = JOB_TYPES[Math.floor(Math.random() * JOB_TYPES.length)];
  const units = [5000,10000,25000,50000,100000][Math.floor(Math.random()*5)];
  const budget = +(Math.random()*8 + 2).toFixed(2);
  const latReq = ["standard","fast","ultra"][Math.floor(Math.random()*3)];
  return {
    id: `JOB-${jobCounter}`,
    type,
    units,
    budget,
    latReq,
    hermes: HERMES_WALLETS[Math.floor(Math.random()*HERMES_WALLETS.length)],
    status: "bidding",   // bidding | escrowed | executing | verifying | settled
    progress: 0,
    bids: [],
    winner: null,
    escrowTx: null,
    settleTx: null,
    createdAt: Date.now(),
    ts: new Date().toLocaleTimeString("en-US",{hour12:false}),
  };
}

function makeBid(job) {
  bidCounter++;
  const provider = PROVIDERS[Math.floor(Math.random()*PROVIDERS.length)];
  const priceVariance = (Math.random()-0.5)*0.08;
  const price = Math.max(0.10, +(provider.basePrice + priceVariance).toFixed(3));
  const latVariance = Math.floor((Math.random()-0.5)*30);
  const latency = Math.max(40, provider.latency + latVariance);
  return {
    bidId: `BID-${bidCounter}`,
    providerId: provider.id,
    providerName: provider.name,
    gpu: provider.gpu,
    price,
    latency,
    uptime: provider.uptime,
    rep: provider.rep,
    color: provider.color,
    jobId: job.id,
    ts: new Date().toLocaleTimeString("en-US",{hour12:false}),
  };
}

function randHash() {
  return "0x" + Math.random().toString(16).slice(2,6) + "…" + Math.random().toString(16).slice(2,6);
}

function RepBar({ rep }) {
  return (
    <div className={styles.repBarWrap}>
      <div className={styles.repBar} style={{ width: `${rep/10}%` }} />
    </div>
  );
}

/* ── Network ticker ── */
function useNetwork() {
  const [stats, setStats] = useState({ block: 12543201, vol: 847.32, agents: 3, settled: 1247, tps: 14.2 });
  useEffect(() => {
    const id = setInterval(() => {
      setStats(s => ({
        ...s,
        block: s.block + Math.floor(Math.random()*3)+1,
        vol: +(s.vol + Math.random()*0.8).toFixed(2),
        settled: s.settled + (Math.random() > 0.7 ? 1 : 0),
        tps: +(12 + Math.random()*6).toFixed(1),
      }));
    }, 2200);
    return () => clearInterval(id);
  }, []);
  return stats;
}

/* ── Main simulation engine ── */
function useMarket() {
  const [jobs, setJobs] = useState([]);
  const [feed, setFeed] = useState([]);
  const jobsRef = useRef([]);

  const pushFeed = useCallback((type, msg) => {
    setFeed(f => [{ id: Date.now()+Math.random(), type, msg, ts: new Date().toLocaleTimeString("en-US",{hour12:false}) }, ...f].slice(0,14));
  }, []);

  useEffect(() => {
    // Spawn initial jobs
    const initial = [makeJob(), makeJob(), makeJob()];
    initial.forEach(j => {
      // seed some bids
      const numBids = Math.floor(Math.random()*3)+1;
      for(let i=0;i<numBids;i++) j.bids.push(makeBid(j));
    });
    initial[0].status = "escrowed";
    initial[0].winner = initial[0].bids[0];
    initial[0].escrowTx = randHash();
    initial[1].status = "executing";
    initial[1].winner = initial[1].bids[0];
    initial[1].progress = Math.floor(Math.random()*70)+10;
    jobsRef.current = initial;
    setJobs([...initial]);

    // Spawn new jobs periodically
    const spawnId = setInterval(() => {
      if (jobsRef.current.filter(j=>j.status==="bidding"||j.status==="escrowed"||j.status==="executing"||j.status==="verifying").length < 6) {
        const j = makeJob();
        jobsRef.current = [j, ...jobsRef.current].slice(0,12);
        setJobs([...jobsRef.current]);
        pushFeed("request", `HERMES broadcast ${j.id} · ${j.units.toLocaleString()} ${j.type} · budget ${j.budget} USDC`);
      }
    }, 5000);

    // Add bids to bidding jobs
    const bidId = setInterval(() => {
      setJobs(prev => {
        const updated = prev.map(job => {
          if (job.status !== "bidding") return job;
          if (Math.random() > 0.45) return job;
          const bid = makeBid(job);
          const newBids = [...job.bids, bid].slice(0,5);
          pushFeed("bid", `${bid.providerName} bid ${bid.price} USDC/ku · ${bid.latency}ms · ${job.id}`);
          // Auto-select winner if 3+ bids
          if (newBids.length >= 3) {
            const winner = [...newBids].sort((a,b)=>a.price-b.price)[0];
            pushFeed("escrow", `Escrow locked · ${(winner.price * job.units/1000).toFixed(3)} USDC · ${job.id} → ${winner.providerName}`);
            jobsRef.current = jobsRef.current.map(j=>j.id===job.id?{...j,bids:newBids,status:"escrowed",winner,escrowTx:randHash()}:j);
            return {...job, bids:newBids, status:"escrowed", winner, escrowTx:randHash()};
          }
          jobsRef.current = jobsRef.current.map(j=>j.id===job.id?{...j,bids:newBids}:j);
          return {...job, bids:newBids};
        });
        return updated;
      });
    }, 2800);

    // Progress executing jobs
    const execId = setInterval(() => {
      setJobs(prev => prev.map(job => {
        if (job.status === "escrowed") {
          pushFeed("execute", `${job.winner?.providerName} started executing ${job.id}`);
          return {...job, status:"executing", progress:5};
        }
        if (job.status === "executing") {
          const newProg = Math.min(100, job.progress + Math.floor(Math.random()*18)+5);
          if (newProg >= 100) {
            pushFeed("verify", `THEMIS verifying ${job.id} · proof ${randHash()}`);
            return {...job, status:"verifying", progress:100};
          }
          return {...job, progress:newProg};
        }
        if (job.status === "verifying") {
          const tx = randHash();
          pushFeed("settle", `✅ Settled · ${((job.winner?.price||0.38)*job.units/1000).toFixed(3)} USDC → ${job.winner?.providerName} · ${job.id}`);
          return {...job, status:"settled", settleTx:tx};
        }
        return job;
      }));
    }, 3500);

    return () => { clearInterval(spawnId); clearInterval(bidId); clearInterval(execId); };
  }, [pushFeed]);

  return { jobs, feed };
}

/* ════════════════════ MAIN ════════════════════ */
export default function MarketplacePage() {
  const net = useNetwork();
  const { jobs, feed } = useMarket();
  const [selected, setSelected] = useState(null);

  const activeJobs = jobs.filter(j => j.status !== "settled");
  const settledJobs = jobs.filter(j => j.status === "settled");

  return (
    <div className={styles.root}>
      <div className={styles.grain} aria-hidden />

      {/* NAV */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <a href="/" className={styles.navLogo}>
            <img src="/mylogo.png" alt="AGORA" className={styles.navLogoImg} />
            <span className={styles.navLogoText}>agora</span>
          </a>
          <div className={styles.navCenter}>
            <a href="/" className={styles.navLink}>Economy</a>
            <span className={styles.navLinkActive}>Marketplace</span>
            <a href="/demo" className={styles.navLink}>Demo</a>
          </div>
          <div className={styles.navRight}>
            <div className={styles.livePill}>
              <span className={styles.liveDot} />
              Simulation
            </div>
            <div className={styles.blockPill}>
              example #{net.block.toLocaleString()}
            </div>
          </div>
        </div>
      </nav>

      {/* STATS BAR */}
      <div className={styles.statsBar}>
        {[
          { label: "Volume (example)", value: `${net.vol.toFixed(2)} USDC`, dim: false },
          { label: "Active Jobs (example)", value: activeJobs.length, dim: false },
          { label: "Settled (example)", value: net.settled.toLocaleString(), dim: false },
          { label: "TPS (example)", value: net.tps, dim: false },
          { label: "Agents Online", value: "1", dim: false },
          { label: "Chain", value: "GOAT · 2345", dim: true },
        ].map(s => (
          <div key={s.label} className={styles.statCell}>
            <span className={`${styles.statVal} ${s.dim ? styles.statDim : ""}`}>{s.value}</span>
            <span className={styles.statKey}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className={styles.main}>

        {/* LEFT — Job Board */}
        <div className={styles.col}>
          <div className={styles.colHead}>
            <span className={styles.colLabel}>Compute Requests</span>
            <span className={styles.colCount}>{activeJobs.length} active</span>
          </div>
          <div className={styles.jobList}>
            <AnimatePresence>
              {activeJobs.map(job => (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity:0, y:-12 }}
                  animate={{ opacity:1, y:0 }}
                  exit={{ opacity:0, scale:0.96 }}
                  transition={{ duration:0.35, ease:[0.16,1,0.3,1] }}
                  className={`${styles.jobCard} ${selected===job.id ? styles.jobCardSelected : ""}`}
                  onClick={() => setSelected(s => s===job.id ? null : job.id)}
                >
                  <div className={styles.jobCardEdge} />
                  <div className={styles.jobRow}>
                    <span className={styles.jobId}>{job.id}</span>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className={styles.jobRow}>
                    <span className={styles.jobType}>{job.type}</span>
                    <span className={styles.jobUnits}>{job.units.toLocaleString()} units</span>
                  </div>
                  <div className={styles.jobRow}>
                    <span className={styles.jobAddr}>{job.hermes}</span>
                    <span className={styles.jobBudget}>≤ {job.budget} USDC</span>
                  </div>

                  {job.status === "executing" && (
                    <div className={styles.progressWrap}>
                      <div className={styles.progressBar} style={{ width:`${job.progress}%` }} />
                      <span className={styles.progressLabel}>{job.progress}%</span>
                    </div>
                  )}

                  {/* Expanded bid view */}
                  <AnimatePresence>
                    {selected === job.id && job.bids.length > 0 && (
                      <motion.div
                        initial={{ opacity:0, height:0 }}
                        animate={{ opacity:1, height:"auto" }}
                        exit={{ opacity:0, height:0 }}
                        transition={{ duration:0.3, ease:[0.16,1,0.3,1] }}
                        className={styles.bidExpand}
                      >
                        <div className={styles.bidExpandHead}>Competing Bids</div>
                        {job.bids.map((bid,i) => (
                          <div key={bid.bidId} className={`${styles.bidRow} ${job.winner?.bidId===bid.bidId ? styles.bidWinner : ""}`}>
                            <span className={`${styles.bidProvider} ${styles["c_"+bid.color]}`}>{bid.providerName}</span>
                            <span className={styles.bidGpu}>{bid.gpu}</span>
                            <span className={styles.bidPrice}>{bid.price} USDC</span>
                            <span className={styles.bidLat}>{bid.latency}ms</span>
                            {job.winner?.bidId===bid.bidId && <span className={styles.bidWinTag}>WINNER</span>}
                          </div>
                        ))}
                        {job.escrowTx && (
                          <div className={styles.escrowLine}>
                            🔒 Escrow: {job.escrowTx} · GOAT Chain 2345
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* CENTER — Live Bid Stream */}
        <div className={styles.col}>
          <div className={styles.colHead}>
            <span className={styles.colLabel}>Bid Stream</span>
            <span className={styles.colCount}>simulated example</span>
          </div>

          {/* Agent reputation cards */}
          <div className={styles.agentCards}>
            {PROVIDERS.slice(0,3).map(p => (
              <div key={p.id} className={styles.agentCard}>
                <div className={styles.agentCardEdge} />
                <div className={styles.agentCardHead}>
                  <span className={`${styles.agentName} ${styles["c_"+p.color]}`}>{p.name}</span>
                  <span className={styles.agentGpu}>{p.gpu}</span>
                </div>
                <RepBar rep={p.rep} />
                <div className={styles.agentStats}>
                  <span>{p.basePrice} USDC/ku</span>
                  <span>{p.latency}ms</span>
                  <span>{p.uptime}% up</span>
                </div>
              </div>
            ))}
          </div>

          {/* Escrow pipeline */}
          <div className={styles.colHead} style={{marginTop:"1rem"}}>
            <span className={styles.colLabel}>Escrow Pipeline</span>
          </div>
          <div className={styles.escrowList}>
            {jobs.filter(j=>j.status==="escrowed"||j.status==="executing"||j.status==="verifying").map(job => (
              <div key={job.id} className={styles.escrowCard}>
                <div className={styles.escrowCardEdge} />
                <div className={styles.escrowRow}>
                  <span className={styles.escrowJob}>{job.id}</span>
                  <StatusBadge status={job.status} />
                </div>
                <div className={styles.escrowRow}>
                  <span className={styles.escrowParties}>
                    {job.hermes} → {job.winner?.providerName}
                  </span>
                  <span className={styles.escrowAmt}>
                    {((job.winner?.price||0.38)*job.units/1000).toFixed(3)} USDC
                  </span>
                </div>
                <div className={styles.escrowRow}>
                  <span className={styles.escrowAddr}>Arbiter: THEMIS · {THEMIS_ADDR}</span>
                </div>
                {job.status==="executing" && (
                  <div className={styles.progressWrap}>
                    <div className={styles.progressBar} style={{width:`${job.progress}%`}} />
                  </div>
                )}
              </div>
            ))}
            {jobs.filter(j=>j.status==="escrowed"||j.status==="executing"||j.status==="verifying").length===0 && (
              <div className={styles.emptyState}>Waiting for escrow events…</div>
            )}
          </div>
        </div>

        {/* RIGHT — Feed + Settled */}
        <div className={styles.col}>
          <div className={styles.colHead}>
            <span className={styles.colLabel}>Transaction Feed</span>
            <div className={styles.liveDotSmall} />
          </div>
          <div className={styles.feedCard}>
            <div className={styles.feedEdge} />
            <AnimatePresence>
              {feed.map(e => (
                <motion.div
                  key={e.id}
                  className={`${styles.feedEntry} ${styles["fe_"+e.type]}`}
                  initial={{ opacity:0, x:-8 }}
                  animate={{ opacity:1, x:0 }}
                  exit={{ opacity:0 }}
                  transition={{ duration:0.3, ease:[0.16,1,0.3,1] }}
                >
                  <span className={styles.feedTs}>{e.ts}</span>
                  <span className={styles.feedMsg}>{e.msg}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Recently settled */}
          <div className={styles.colHead} style={{marginTop:"1rem"}}>
            <span className={styles.colLabel}>Recently Settled</span>
            <span className={styles.colCount}>{settledJobs.length}</span>
          </div>
          <div className={styles.settledList}>
            <AnimatePresence>
              {settledJobs.slice(0,5).map(job => (
                <motion.div
                  key={job.id}
                  initial={{ opacity:0 }}
                  animate={{ opacity:1 }}
                  className={styles.settledCard}
                >
                  <div className={styles.settledRow}>
                    <span className={styles.settledId}>{job.id}</span>
                    <span className={styles.settledAmt}>+{((job.winner?.price||0.38)*job.units/1000).toFixed(3)} USDC</span>
                  </div>
                  <div className={styles.settledRow}>
                    <span className={styles.settledWinner}>{job.winner?.providerName}</span>
                    <span className={styles.settledTx}>{job.settleTx}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    bidding:   { label:"BIDDING",   cls:"bidding"   },
    escrowed:  { label:"ESCROWED",  cls:"escrowed"  },
    executing: { label:"EXECUTING", cls:"executing" },
    verifying: { label:"VERIFYING", cls:"verifying" },
    settled:   { label:"SETTLED",   cls:"settled"   },
  };
  const s = map[status] || map.bidding;
  return <span className={`${styles.badge} ${styles["badge_"+s.cls]}`}>{s.label}</span>;
}
