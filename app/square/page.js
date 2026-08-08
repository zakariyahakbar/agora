"use client";

/* ══════════════════════════════════════════
   AGORA — THE SQUARE (v5)
   Five lit stations. Walk into the light,
   read the inscription, act. Every action
   feeds Stage 2 growth for real.
   WASD — walk · drag — look · E — act · M — map
══════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import styles from "./page.module.css";

const TELEGRAM_URL = "https://web.telegram.org/k/#@agoraa_bot";
const X_URL = "https://x.com/usingagora";
const SCAN_URL = "https://8004scan.io/agents/goat/82";
const REFERRAL_URL = "https://clawup.org/?ref=f0af754b9e";

/* ── Seed-user feedback → posts straight into the Google Form sheet ── */
const FORM_ACTION =
  "https://docs.google.com/forms/d/e/1FAIpQLScN7egZXKJC86g9nZMscWtKxKyH7iEoOuZf8cm3I_zGb1clQg/formResponse";
const FORM_FIELDS = {
  agents: "entry.1589436820",
  compute: "entry.509501295",
  trust: "entry.912736896",
  rent: "entry.1728505312",
  blocker: "entry.1356220945",
};

const LEDGER_KEY = "agora_square_ledger_v2";

/* ── Five stations: a real on-chain fact + one clear action each ── */
const STATIONS = [
  {
    eyebrow: "Identity station",
    signText: "Identity",
    line: "ERC-8004 · Agent #82",
    body: "Registered on GOAT mainnet. Owner and creator verified on-chain.",
    action: { key: "verify", label: "Verify on 8004scan", href: SCAN_URL },
  },
  {
    eyebrow: "Settlement station",
    signText: "Settlement",
    line: "x402 · 1 USDC.e settled",
    body: "0xa8747b…3460. A real payment, confirmed and gateway-verified.",
    action: { key: "agent", label: "Talk to the AGORA agent", href: TELEGRAM_URL },
  },
  {
    eyebrow: "Network station",
    signText: "Network",
    line: "GOAT · Chain 2345",
    body: "Bitcoin-secured L2. Real mainnet, not a testnet demo.",
    action: { key: "launch", label: "Launch your own agent", href: REFERRAL_URL },
  },
  {
    eyebrow: "Herald station",
    signText: "Follow",
    line: "ἀγορά — “open marketplace”",
    body: "The Greek square where trade happened. We rebuilt it for machines.",
    action: { key: "follow", label: "Follow the build on X", href: X_URL },
  },
  {
    eyebrow: "The beacon",
    signText: "Feedback",
    line: "The marketplace machines built for machines.",
    body: "Two minutes of honest feedback shapes what we build next.",
    action: { key: "seed", label: "Become a seed user", form: true },
  },
];

const STALL_ANGLES = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];

export default function SquarePage() {
  const wrapRef = useRef(null);
  const joyRef = useRef(null);
  const knobRef = useRef(null);
  const playerMarkRef = useRef(null);
  const compassRef = useRef(null);

  const [entered, setEntered] = useState(false);
  const enteredRef = useRef(false);

  // Embed mode: /square?embed=1 skips Enter, hides HUD, auto-orbits cinematically
  const [embed, setEmbed] = useState(false);
  const embedRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("embed") === "1") {
      setEmbed(true); embedRef.current = true;
      setEntered(true); enteredRef.current = true;
    }
  }, []);
  const [station, setStation] = useState(-1);
  const stationRef = useRef(-1);
  const [actionsDone, setActionsDone] = useState({});
  const actionsRef = useRef({});
  const [complete, setComplete] = useState(false);
  const completeShownRef = useRef(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [intro, setIntro] = useState(false);
  const overlayRef = useRef(false);
  const [shared, setShared] = useState("");
  const [hintGone, setHintGone] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [webglFail, setWebglFail] = useState(false);

  useEffect(() => { enteredRef.current = entered; }, [entered]);
  useEffect(() => { actionsRef.current = actionsDone; }, [actionsDone]);
  useEffect(() => {
    overlayRef.current = mapOpen || formOpen || intro || complete;
  }, [mapOpen, formOpen, intro, complete]);

  useEffect(() => {
    if (entered && !intro) {
      const t = setTimeout(() => setHintGone(true), 9000);
      return () => clearTimeout(t);
    }
  }, [entered, intro]);

  /* persist ledger */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LEDGER_KEY) || "null");
      if (saved?.actions) {
        setActionsDone(saved.actions);
        if (STATIONS.every(st => saved.actions[st.action.key])) completeShownRef.current = true;
      }
    } catch { /* fresh */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(LEDGER_KEY, JSON.stringify({ actions: actionsDone })); }
    catch { /* private mode */ }
  }, [actionsDone]);

  /* completion when all five actions done */
  useEffect(() => {
    if (
      STATIONS.every(st => actionsDone[st.action.key]) &&
      !completeShownRef.current
    ) {
      completeShownRef.current = true;
      setTimeout(() => setComplete(true), 700);
    }
  }, [actionsDone]);

  const markAction = (key) =>
    setActionsDone(prev => (prev[key] ? prev : { ...prev, [key]: true }));

  /* perform a station's action (button click or E key) */
  const performRef = useRef(null);
  performRef.current = (idx) => {
    const st = STATIONS[idx];
    if (!st) return;
    if (st.action.form) {
      setFormOpen(true);
    } else {
      window.open(st.action.href, "_blank", "noopener,noreferrer");
      markAction(st.action.key);
    }
  };

  /* M / E / Esc — with typing guard */
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === "escape") { setFormOpen(false); setMapOpen(false); return; }
      if (!enteredRef.current) return;
      if (k === "m" && !overlayRef.current) setMapOpen(true);
      else if (k === "m") setMapOpen(false), setFormOpen(false);
      if (k === "e" && !overlayRef.current && stationRef.current >= 0) {
        performRef.current(stationRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shareSquare = async () => {
    const url = "https://useagora.vercel.app/square";
    if (navigator.share) {
      try { await navigator.share({ title: "Agora · The Square", text: "Walk a night marketplace built for AI agents.", url }); } catch { /* dismissed */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setShared("copied");
        setTimeout(() => setShared(""), 1800);
      } catch { /* ignore */ }
    }
  };

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const coarse =
      window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    setIsTouch(coarse);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !coarse, powerPreference: "high-performance" });
    } catch {
      setWebglFail(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));
    renderer.setSize(wrap.clientWidth, wrap.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    if (!coarse) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    wrap.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080712);
    scene.fog = new THREE.FogExp2(0x0a0916, 0.026);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();
    const ENV = 0.22;

    const camera = new THREE.PerspectiveCamera(68, wrap.clientWidth / wrap.clientHeight, 0.1, 320);
    const pitchObj = new THREE.Object3D();
    pitchObj.add(camera);
    const yawObj = new THREE.Object3D();
    yawObj.position.set(0, 6.2, 30);
    yawObj.add(pitchObj);
    scene.add(yawObj);

    scene.add(new THREE.HemisphereLight(0x2b3454, 0x0a0806, 0.55));
    const moonLight = new THREE.DirectionalLight(0x8fa0c8, 0.5);
    moonLight.position.set(-30, 42, -22);
    if (!coarse) {
      moonLight.castShadow = true;
      moonLight.shadow.mapSize.set(2048, 2048);
      const c = moonLight.shadow.camera;
      c.left = -34; c.right = 34; c.top = 34; c.bottom = -34; c.far = 120;
      moonLight.shadow.bias = -0.0004;
    }
    scene.add(moonLight);

    /* ground — warm lit stone, brighter near the beacon, visible tiling */
    const gCan = document.createElement("canvas");
    gCan.width = gCan.height = 1024;
    const g = gCan.getContext("2d");
    // warm base with a soft radial light from center
    const gGrad = g.createRadialGradient(512, 512, 40, 512, 512, 620);
    gGrad.addColorStop(0, "#3a2f26");
    gGrad.addColorStop(0.5, "#241d18");
    gGrad.addColorStop(1, "#14100d");
    g.fillStyle = gGrad;
    g.fillRect(0, 0, 1024, 1024);
    // stone tiles with per-tile warm variation
    for (let ty = 0; ty < 8; ty++) {
      for (let tx = 0; tx < 8; tx++) {
        const warm = 30 + Math.floor(Math.random() * 22);
        g.fillStyle = `rgb(${warm + 14},${warm + 4},${warm - 6})`;
        g.globalAlpha = 0.5;
        g.fillRect(tx * 128 + 3, ty * 128 + 3, 122, 122);
        g.globalAlpha = 1;
      }
    }
    // grout lines
    g.strokeStyle = "rgba(10,8,6,0.55)";
    g.lineWidth = 4;
    for (let i = 0; i <= 8; i++) {
      g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 1024); g.stroke();
      g.beginPath(); g.moveTo(0, i * 128); g.lineTo(1024, i * 128); g.stroke();
    }
    // subtle highlight on tile top edges (beveled look)
    g.strokeStyle = "rgba(210,190,160,0.06)";
    g.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      g.beginPath(); g.moveTo(0, i * 128 + 3); g.lineTo(1024, i * 128 + 3); g.stroke();
    }
    // speckle + fine cracks
    for (let i = 0; i < 2600; i++) {
      const b = Math.random();
      g.fillStyle = b > 0.5
        ? `rgba(220,205,180,${0.02 + Math.random() * 0.05})`
        : `rgba(0,0,0,${0.05 + Math.random() * 0.1})`;
      g.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
    }
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(0,0,0,${0.12 + Math.random() * 0.14})`;
      g.lineWidth = 0.6 + Math.random();
      g.beginPath();
      let cx = Math.random() * 1024, cy = Math.random() * 1024;
      g.moveTo(cx, cy);
      for (let k = 0; k < 4; k++) { cx += (Math.random() - 0.5) * 90; cy += (Math.random() - 0.5) * 90; g.lineTo(cx, cy); }
      g.stroke();
    }
    const groundTex = new THREE.CanvasTexture(gCan);
    groundTex.colorSpace = THREE.SRGBColorSpace;
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(5, 5);
    groundTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(70, 64),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.82, metalness: 0.04, envMapIntensity: ENV })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    /* warm ground bounce light at the center so the plaza reads lit, not black */
    const groundGlow = new THREE.PointLight(0xffb060, 9, 26, 2);
    groundGlow.position.set(0, 1.2, 0);
    scene.add(groundGlow);

    /* polished slabs — subtle reflections */
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x0b0b12, roughness: 0.14, metalness: 0.85, envMapIntensity: 0.9,
    });
    [[4.6, -3.2, 1.15], [-5.2, 4.0, 0.85]].forEach(([x, z, r]) => {
      const slab = new THREE.Mesh(new THREE.CircleGeometry(r, 28), slabMat);
      slab.rotation.x = -Math.PI / 2;
      slab.position.set(x, 0.016, z);
      slab.receiveShadow = true;
      scene.add(slab);
    });

    const mosaic = new THREE.Mesh(
      new THREE.RingGeometry(1.7, 2.5, 48),
      new THREE.MeshStandardMaterial({ color: 0x191510, roughness: 0.8, envMapIntensity: ENV })
    );
    mosaic.rotation.x = -Math.PI / 2;
    mosaic.position.y = 0.012;
    scene.add(mosaic);
    const mosaicGlow = new THREE.Mesh(
      new THREE.RingGeometry(2.44, 2.52, 48),
      new THREE.MeshStandardMaterial({ color: 0x1a1208, emissive: 0xf28322, emissiveIntensity: 0.55, roughness: 0.6 })
    );
    mosaicGlow.rotation.x = -Math.PI / 2;
    mosaicGlow.position.y = 0.014;
    scene.add(mosaicGlow);

    /* sky */
    /* sky — purplesky.png wrapped on a dome, slowly rotating */
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x0a0916, side: THREE.BackSide, fog: false, depthWrite: false,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(210, 40, 24), skyMat);
    scene.add(sky);
    new THREE.TextureLoader().load("/purplesky.png", (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      skyMat.map = tex;
      skyMat.color.set(0xffffff);
      skyMat.needsUpdate = true;
    });

    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(1000 * 3);
    for (let i = 0; i < 1000; i++) {
      const r = 90 + Math.random() * 70;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(0.12 + Math.random() * 0.82);
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) + 4;
      starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xd6dcf2, size: 0.9, transparent: true, opacity: 0.9, fog: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    /* moon with soft craters + big halo, both fog-free so they actually show */
    const mCan = document.createElement("canvas");
    mCan.width = mCan.height = 128;
    const mg = mCan.getContext("2d");
    const mGrad = mg.createRadialGradient(52, 48, 8, 64, 64, 64);
    mGrad.addColorStop(0, "#f2f5ff");
    mGrad.addColorStop(0.75, "#cdd6ee");
    mGrad.addColorStop(1, "#aab4d4");
    mg.fillStyle = mGrad;
    mg.fillRect(0, 0, 128, 128);
    mg.fillStyle = "rgba(130,140,175,0.35)";
    [[42, 58, 11], [78, 40, 8], [88, 84, 13], [56, 96, 7], [30, 32, 6]].forEach(([x, y, r]) => {
      mg.beginPath(); mg.arc(x, y, r, 0, Math.PI * 2); mg.fill();
    });
    const moonTex = new THREE.CanvasTexture(mCan);
    moonTex.colorSpace = THREE.SRGBColorSpace;
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(4.4, 28, 28),
      new THREE.MeshBasicMaterial({ map: moonTex, fog: false })
    );
    moon.position.set(-62, 36, -84);
    scene.add(moon);

    const makeRadialTex = (inner, mid, midStop) => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const cg = c.getContext("2d");
      const gr = cg.createRadialGradient(64, 64, 4, 64, 64, 64);
      gr.addColorStop(0, inner);
      gr.addColorStop(midStop, mid);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      cg.fillStyle = gr;
      cg.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    };
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeRadialTex("rgba(205,215,248,0.6)", "rgba(165,178,225,0.18)", 0.4),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false,
    }));
    halo.scale.setScalar(30);
    halo.position.copy(moon.position);
    scene.add(halo);

    /* shooting star */
    const shoot = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeRadialTex("rgba(230,238,255,0.9)", "rgba(200,215,255,0.25)", 0.35),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false,
    }));
    shoot.scale.set(2.6, 0.12, 1);
    scene.add(shoot);
    let shootT = 5, shootLife = 0;
    const shootDir = new THREE.Vector3();

    const cypressMat = new THREE.MeshBasicMaterial({ color: 0x04040a });
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 36 + Math.random() * 12;
      const h = 5 + Math.random() * 4.5;
      const tree = new THREE.Mesh(new THREE.ConeGeometry(0.8 + Math.random() * 0.5, h, 7), cypressMat);
      tree.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      scene.add(tree);
    }

    /* fireflies */
    const flyCount = coarse ? 16 : 28;
    const flyGeo = new THREE.BufferGeometry();
    const flyPos = new Float32Array(flyCount * 3);
    const flySeed = new Float32Array(flyCount * 3);
    for (let i = 0; i < flyCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 23 + Math.random() * 10;
      flyPos[i * 3] = Math.cos(a) * r;
      flyPos[i * 3 + 1] = 0.6 + Math.random() * 2;
      flyPos[i * 3 + 2] = Math.sin(a) * r;
      flySeed[i * 3] = Math.random() * 100;
      flySeed[i * 3 + 1] = 0.3 + Math.random() * 0.5;
      flySeed[i * 3 + 2] = Math.random() * 100;
    }
    flyGeo.setAttribute("position", new THREE.BufferAttribute(flyPos, 3));
    scene.add(new THREE.Points(flyGeo, new THREE.PointsMaterial({
      color: 0xbfe8c8, size: 0.055, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })));

    /* materials */
    const fCan = document.createElement("canvas");
    fCan.width = 128; fCan.height = 32;
    const f = fCan.getContext("2d");
    for (let i = 0; i < 16; i++) {
      const gr = f.createLinearGradient(i * 8, 0, i * 8 + 8, 0);
      gr.addColorStop(0, "#666"); gr.addColorStop(0.5, "#fff"); gr.addColorStop(1, "#666");
      f.fillStyle = gr;
      f.fillRect(i * 8, 0, 8, 32);
    }
    const fluteTex = new THREE.CanvasTexture(fCan);
    fluteTex.wrapS = fluteTex.wrapT = THREE.RepeatWrapping;
    fluteTex.repeat.set(2, 1);
    const marble = new THREE.MeshStandardMaterial({ color: 0xbcb7ab, roughness: 0.58, metalness: 0.05, envMapIntensity: ENV });
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0xbcb7ab, roughness: 0.58, metalness: 0.05, bumpMap: fluteTex, bumpScale: 0.9, envMapIntensity: ENV,
    });
    const darkStone = new THREE.MeshStandardMaterial({ color: 0x24221f, roughness: 0.9, envMapIntensity: ENV });
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.85, envMapIntensity: ENV });
    const clay = new THREE.MeshStandardMaterial({ color: 0x7a4a28, roughness: 0.75, envMapIntensity: ENV });

    const colliders = [];

    const sCan = document.createElement("canvas");
    sCan.width = 256; sCan.height = 64;
    const s = sCan.getContext("2d");
    for (let i = 0; i < 8; i++) {
      s.fillStyle = i % 2 ? "#b4581a" : "#d9d3c7";
      s.fillRect(i * 32, 0, 32, 64);
    }
    s.fillStyle = "rgba(0,0,0,0.30)";
    s.fillRect(0, 0, 256, 64);
    const stripeTex = new THREE.CanvasTexture(sCan);
    stripeTex.colorSpace = THREE.SRGBColorSpace;
    stripeTex.wrapS = stripeTex.wrapT = THREE.RepeatWrapping;
    const awningMat = new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.8, side: THREE.DoubleSide, envMapIntensity: ENV });

    /* colonnade */
    const shaftGeo = new THREE.CylinderGeometry(0.4, 0.48, 4.2, 24);
    const baseGeo = new THREE.BoxGeometry(1.2, 0.32, 1.2);
    const capGeo = new THREE.BoxGeometry(1.1, 0.26, 1.1);
    const abacusGeo = new THREE.BoxGeometry(1.32, 0.16, 1.32);
    const columnXZ = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x = Math.cos(a) * 14, z = Math.sin(a) * 14;
      columnXZ.push([x, z, a]);
      const col = new THREE.Group();
      const base = new THREE.Mesh(baseGeo, marble); base.position.y = 0.16;
      const shaft = new THREE.Mesh(shaftGeo, shaftMat); shaft.position.y = 0.32 + 2.1;
      const cap = new THREE.Mesh(capGeo, marble); cap.position.y = 0.32 + 4.2 + 0.13;
      const aba = new THREE.Mesh(abacusGeo, marble); aba.position.y = 0.32 + 4.2 + 0.26 + 0.08;
      [base, shaft, cap, aba].forEach(m => { m.castShadow = !coarse; m.receiveShadow = true; col.add(m); });
      col.position.set(x, 0, z);
      scene.add(col);
      colliders.push({ x, z, r: 1.0 });
    }

    /* torches: two-tone flame + smoke */
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff7a1a, emissive: 0xff8c2a, emissiveIntensity: 2.8, roughness: 0.4,
    });
    const flameCoreMat = new THREE.MeshStandardMaterial({
      color: 0xffd27a, emissive: 0xffcf6e, emissiveIntensity: 3.6, roughness: 0.3,
    });
    const smokeTex = makeRadialTex("rgba(140,140,150,0.32)", "rgba(120,120,130,0.1)", 0.5);
    const torchLights = [];
    const torchCount = coarse ? 4 : 6;
    for (let i = 0; i < torchCount; i++) {
      const [x, z, a] = columnXZ[i * (12 / torchCount)];
      const inX = x - Math.cos(a) * 0.85, inZ = z - Math.sin(a) * 0.85;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 8), flameMat);
      flame.position.set(inX, 3.4, inZ);
      const core = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 8), flameCoreMat);
      core.position.set(inX, 3.36, inZ);
      scene.add(flame, core);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.1, 0.16, 10), darkStone);
      bowl.position.set(inX, 3.14, inZ);
      scene.add(bowl);
      const light = new THREE.PointLight(0xff8c2a, 17, 12, 2);
      light.position.set(inX, 3.5, inZ);
      scene.add(light);
      let smoke = null;
      if (!coarse) {
        smoke = new THREE.Sprite(new THREE.SpriteMaterial({
          map: smokeTex, transparent: true, opacity: 0.2, depthWrite: false,
        }));
        smoke.position.set(inX, 3.7, inZ);
        smoke.scale.setScalar(0.4);
        scene.add(smoke);
      }
      torchLights.push({ light, flame, core, smoke, x: inX, z: inZ, seed: Math.random() * 100 });
    }

    /* banners */
    const banners = [];
    const bannerCols = coarse ? [1, 7] : [1, 3, 7, 9];
    for (const ci of bannerCols) {
      const [x, z, a] = columnXZ[ci];
      const geo = new THREE.PlaneGeometry(0.72, 1.7, 6, 8);
      const mesh = new THREE.Mesh(geo, awningMat);
      const inX = x - Math.cos(a) * 0.62, inZ = z - Math.sin(a) * 0.62;
      mesh.position.set(inX, 3.35, inZ);
      mesh.rotation.y = -a + Math.PI / 2;
      scene.add(mesh);
      banners.push({ mesh, base: geo.attributes.position.array.slice(), seed: Math.random() * 10 });
    }

    /* stalls */
    const stallWorld = [];
    STALL_ANGLES.forEach((a) => {
      const x = Math.cos(a) * 8.5, z = Math.sin(a) * 8.5;
      stallWorld.push(new THREE.Vector3(x, 0, z));
      const gp = new THREE.Group();
      const postGeo = new THREE.CylinderGeometry(0.07, 0.08, 2.3, 8);
      [[-1.15, -0.8], [1.15, -0.8], [-1.15, 0.8], [1.15, 0.8]].forEach(([px, pz]) => {
        const p = new THREE.Mesh(postGeo, wood);
        p.position.set(px, 1.15, pz);
        p.castShadow = !coarse;
        gp.add(p);
      });
      const counter = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.72, 0.85), darkStone);
      counter.position.set(0, 0.36, 0.35);
      counter.castShadow = !coarse; counter.receiveShadow = true;
      gp.add(counter);
      const awn = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.05, 2.0), awningMat);
      awn.position.set(0, 2.36, 0);
      awn.rotation.x = -0.14;
      awn.castShadow = !coarse;
      gp.add(awn);
      const amphora = new THREE.Group();
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), clay);
      belly.position.y = 0.2; belly.scale.y = 1.25;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.14, 8), clay);
      neck.position.y = 0.44;
      amphora.add(belly, neck);
      amphora.position.set(-0.75, 0.72, 0.32);
      const amphora2 = amphora.clone();
      amphora2.position.set(-0.45, 0.72, 0.4);
      amphora2.rotation.y = 1.2;
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.42), wood);
      crate.position.set(0.72, 0.87, 0.3);
      crate.rotation.y = 0.4;
      crate.castShadow = !coarse;
      gp.add(amphora, amphora2, crate);
      const sl = new THREE.PointLight(0xffa04a, 7.5, 8, 2);
      sl.position.set(0, 1.9, 0);
      gp.add(sl);
      gp.position.set(x, 0, z);
      gp.rotation.y = -a + Math.PI / 2;
      scene.add(gp);
      colliders.push({ x, z, r: 1.5 });
    });

    /* ── Environmental detail ── */
    // scattered rubble stones around the plaza
    const rockGeoPool = [
      new THREE.DodecahedronGeometry(0.28, 0),
      new THREE.DodecahedronGeometry(0.4, 0),
      new THREE.IcosahedronGeometry(0.22, 0),
    ];
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x3a332b, roughness: 0.95, envMapIntensity: ENV });
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 4 + Math.random() * 14;
      const rk = new THREE.Mesh(rockGeoPool[i % 3], rockMat);
      rk.position.set(Math.cos(a) * r, 0.05 + Math.random() * 0.1, Math.sin(a) * r);
      rk.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      rk.scale.setScalar(0.6 + Math.random() * 0.9);
      rk.castShadow = !coarse; rk.receiveShadow = true;
      scene.add(rk);
    }

    // low garden hedges ringing the outer plaza (broken arcs)
    const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x16301c, roughness: 1, envMapIntensity: 0.1 });
    for (let seg = 0; seg < 8; seg++) {
      if (seg % 2 === 0) continue; // gaps for walkways
      const a0 = (seg / 8) * Math.PI * 2;
      const cnt = 7;
      for (let j = 0; j < cnt; j++) {
        const a = a0 + (j / cnt) * (Math.PI * 2 / 8) * 0.85;
        const r = 18.5;
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), hedgeMat);
        bush.position.set(Math.cos(a) * r, 0.42, Math.sin(a) * r);
        bush.scale.set(1.1, 0.8, 1.1);
        bush.castShadow = !coarse; bush.receiveShadow = true;
        scene.add(bush);
      }
    }

    // stone benches near two stalls
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x6a6258, roughness: 0.7, envMapIntensity: ENV });
    [[6.5, 6.5, 0.7], [-6.5, -6.5, -2.4]].forEach(([bx, bz, ry]) => {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 0.55), benchMat);
      seat.position.set(bx, 0.55, bz); seat.rotation.y = ry;
      seat.castShadow = !coarse; seat.receiveShadow = true;
      scene.add(seat);
      [-0.8, 0.8].forEach(off => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.5), benchMat);
        leg.position.set(bx + Math.cos(ry) * off, 0.27, bz + Math.sin(ry) * off);
        leg.rotation.y = ry;
        scene.add(leg);
      });
    });

    // low-lying ground mist rings
    if (!coarse) {
      const mistTex = makeRadialTex("rgba(150,140,170,0.14)", "rgba(120,115,150,0.05)", 0.5);
      for (let i = 0; i < 7; i++) {
        const m = new THREE.Sprite(new THREE.SpriteMaterial({
          map: mistTex, transparent: true, depthWrite: false, opacity: 0.5,
        }));
        const a = Math.random() * Math.PI * 2;
        const r = 6 + Math.random() * 12;
        m.position.set(Math.cos(a) * r, 0.5, Math.sin(a) * r);
        m.scale.set(9 + Math.random() * 5, 3, 1);
        scene.add(m);
      }
    }

    /* plinth + beacon */
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.9, 24), marble);
    plinth.position.y = 0.45;
    plinth.castShadow = !coarse; plinth.receiveShadow = true;
    scene.add(plinth);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.4, 6.5, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xff9a3c, transparent: true, opacity: 0.13,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
      })
    );
    beam.position.y = 0.9 + 3.25;
    scene.add(beam);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff9a3c, emissiveIntensity: 3.2 })
    );
    core.position.y = 1.65;
    scene.add(core);
    const coreLight = new THREE.PointLight(0xff9a3c, 11, 12, 2);
    coreLight.position.y = 1.8;
    scene.add(coreLight);
    colliders.push({ x: 0, z: 0, r: 1.8 });

    /* embers */
    const emberCount = coarse ? 70 : 140;
    const emberGeo = new THREE.BufferGeometry();
    const emberPos = new Float32Array(emberCount * 3);
    const emberSeed = new Float32Array(emberCount * 2);
    for (let i = 0; i < emberCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 15;
      emberPos[i * 3] = Math.cos(a) * r;
      emberPos[i * 3 + 1] = Math.random() * 6;
      emberPos[i * 3 + 2] = Math.sin(a) * r;
      emberSeed[i * 2] = 0.25 + Math.random() * 0.55;
      emberSeed[i * 2 + 1] = Math.random() * 100;
    }
    emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
    scene.add(new THREE.Points(emberGeo, new THREE.PointsMaterial({
      color: 0xffa04a, size: 0.075, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })));

    /* agent orbs + trails */
    const orbTexOrange = makeRadialTex("rgba(255,150,60,0.8)", "rgba(255,120,30,0.25)", 0.4);
    const orbTexGreen = makeRadialTex("rgba(90,235,150,0.8)", "rgba(46,213,115,0.25)", 0.4);
    const orbDefs = [
      { color: 0x2ed573, tex: orbTexGreen, period: 44, phase: 0.0, order: [0, 2, 1, 3] },
    ];
    const orbs = orbDefs.map(def => {
      const pts = def.order.map(i =>
        stallWorld[i].clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 1.6, 1.35 + Math.random() * 0.4, (Math.random() - 0.5) * 1.6
        ))
      );
      const curve = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.9);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 18, 18),
        new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 2.8, roughness: 0.35 })
      );
      scene.add(mesh);
      let light = null;
      const trail = [];
      const history = [];
      if (!coarse) {
        light = new THREE.PointLight(def.color, 3, 5, 2);
        scene.add(light);
        for (let k = 0; k < 6; k++) {
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({
            map: def.tex, transparent: true, depthWrite: false,
            blending: THREE.AdditiveBlending, opacity: 0.4 - k * 0.055,
          }));
          sp.scale.setScalar(0.26 - k * 0.03);
          scene.add(sp);
          trail.push(sp);
        }
      }
      return { ...def, curve, mesh, light, trail, history };
    });

    /* ── Station guidance: floating glowing icon signs + pillars + pads ── */
    const makeIconTex = (kind) => {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const x = c.getContext("2d");
      x.strokeStyle = kind === "check" ? "#7ee8a8" : "#ffc78d";
      x.fillStyle = x.strokeStyle;
      x.lineWidth = 15;
      x.lineCap = "round";
      x.lineJoin = "round";
      x.shadowColor = kind === "check" ? "rgba(46,213,115,0.9)" : "rgba(255,154,60,0.9)";
      x.shadowBlur = 26;
      if (kind === "shield") {
        x.beginPath();
        x.moveTo(128, 38); x.lineTo(202, 66); x.lineTo(202, 128);
        x.quadraticCurveTo(202, 182, 128, 218);
        x.quadraticCurveTo(54, 182, 54, 128);
        x.lineTo(54, 66); x.closePath(); x.stroke();
        x.beginPath(); x.moveTo(96, 128); x.lineTo(120, 154); x.lineTo(166, 100); x.stroke();
      } else if (kind === "coin") {
        x.beginPath(); x.arc(128, 128, 74, 0, Math.PI * 2); x.stroke();
        x.beginPath(); x.arc(128, 128, 50, 0, Math.PI * 2); x.stroke();
        x.beginPath(); x.moveTo(128, 96); x.lineTo(128, 160); x.stroke();
      } else if (kind === "nodes") {
        const pts = [[128, 66], [76, 176], [180, 176]];
        x.beginPath();
        x.moveTo(...pts[0]); x.lineTo(...pts[1]); x.lineTo(...pts[2]); x.closePath(); x.stroke();
        pts.forEach(([px, py]) => {
          x.beginPath(); x.arc(px, py, 22, 0, Math.PI * 2);
          x.fillStyle = "#0a0916"; x.fill(); x.stroke();
        });
      } else if (kind === "horn") {
        x.beginPath();
        x.moveTo(58, 108); x.lineTo(148, 66); x.lineTo(148, 190); x.lineTo(58, 148);
        x.closePath(); x.stroke();
        x.beginPath(); x.arc(150, 128, 44, -0.85, 0.85); x.stroke();
        x.beginPath(); x.arc(150, 128, 68, -0.7, 0.7); x.stroke();
      } else if (kind === "bubble") {
        x.beginPath();
        x.moveTo(72, 64); x.lineTo(184, 64);
        x.quadraticCurveTo(208, 64, 208, 88); x.lineTo(208, 144);
        x.quadraticCurveTo(208, 168, 184, 168); x.lineTo(132, 168);
        x.lineTo(100, 204); x.lineTo(104, 168); x.lineTo(72, 168);
        x.quadraticCurveTo(48, 168, 48, 144); x.lineTo(48, 88);
        x.quadraticCurveTo(48, 64, 72, 64); x.closePath(); x.stroke();
        [92, 128, 164].forEach(px => {
          x.beginPath(); x.arc(px, 116, 9, 0, Math.PI * 2); x.fill();
        });
      } else { /* check */
        x.beginPath(); x.moveTo(64, 136); x.lineTo(112, 184); x.lineTo(196, 84); x.stroke();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };
    const ICON_KINDS = ["shield", "coin", "nodes", "horn", "bubble"];
    const checkTex = makeIconTex("check");
    const iconGlowTex = makeRadialTex("rgba(255,154,60,0.5)", "rgba(255,120,30,0.14)", 0.45);

    const stationSpots = [
      ...stallWorld.map((v, i) => ({ x: v.x, z: v.z, idx: i })),
      { x: 0, z: 0, idx: 4 },
    ];
    const padGeo = new THREE.CircleGeometry(1.35, 32);
    const pillarGeo = new THREE.CylinderGeometry(0.1, 0.16, 4.6, 10, 1, true);
    const guides = stationSpots.map(spot => {
      const pad = new THREE.Mesh(padGeo, new THREE.MeshBasicMaterial({
        color: 0xff9a3c, transparent: true, opacity: 0.16,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(spot.x, 0.02, spot.z);
      scene.add(pad);
      let pillar = null;
      if (spot.idx !== 4) {
        pillar = new THREE.Mesh(pillarGeo, new THREE.MeshBasicMaterial({
          color: 0xff9a3c, transparent: true, opacity: 0.09,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
        }));
        pillar.position.set(spot.x, 2.9 + 2.3, spot.z);
        scene.add(pillar);
      }
      const baseY = spot.idx === 4 ? 3.55 : 3.2;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: iconGlowTex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.42,
      }));
      glow.scale.setScalar(2.0);
      glow.position.set(spot.x, baseY, spot.z);
      scene.add(glow);
      const icon = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeIconTex(ICON_KINDS[spot.idx]), transparent: true, depthWrite: false,
      }));
      icon.scale.setScalar(1.0);
      icon.position.set(spot.x, baseY, spot.z);
      scene.add(icon);
      // readable text sign under the icon
      const label = STATIONS[spot.idx].signText;
      const lc = document.createElement("canvas");
      lc.width = 512; lc.height = 128;
      const lx = lc.getContext("2d");
      lx.font = "600 62px 'DM Sans', system-ui, sans-serif";
      lx.textAlign = "center";
      lx.textBaseline = "middle";
      lx.shadowColor = "rgba(0,0,0,0.85)";
      lx.shadowBlur = 12;
      lx.fillStyle = "#f4ede0";
      lx.fillText(label, 256, 52);
      lx.shadowBlur = 0;
      lx.font = "500 30px 'DM Mono', monospace";
      lx.fillStyle = "rgba(255,180,106,0.92)";
      lx.fillText("▼ walk here", 256, 100);
      const labelTex = new THREE.CanvasTexture(lc);
      labelTex.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Sprite(new THREE.SpriteMaterial({
        map: labelTex, transparent: true, depthWrite: false,
      }));
      sign.scale.set(3.0, 0.75, 1);
      sign.position.set(spot.x, baseY - 1.15, spot.z);
      scene.add(sign);
      return { spot, pad, pillar, glow, icon, sign, baseY, doneApplied: false };
    });

    /* ── Inlaid stone runners from the hub out to each station ── */
    const runnerTex = (() => {
      const c = document.createElement("canvas");
      c.width = 256; c.height = 64;
      const x = c.getContext("2d");
      x.fillStyle = "#1c1712";
      x.fillRect(0, 0, 256, 64);
      // inlaid bright center channel
      const gr = x.createLinearGradient(0, 0, 0, 64);
      gr.addColorStop(0, "rgba(28,22,17,1)");
      gr.addColorStop(0.5, "rgba(255,150,60,0.5)");
      gr.addColorStop(1, "rgba(28,22,17,1)");
      x.fillStyle = gr;
      x.fillRect(0, 24, 256, 16);
      // rune ticks along the channel
      x.fillStyle = "rgba(255,200,120,0.7)";
      for (let i = 0; i < 8; i++) x.fillRect(i * 32 + 12, 28, 8, 8);
      // edge lines
      x.strokeStyle = "rgba(210,190,160,0.15)";
      x.lineWidth = 2;
      x.strokeRect(1, 18, 254, 28);
      return new THREE.CanvasTexture(c);
    })();
    runnerTex.colorSpace = THREE.SRGBColorSpace;
    runnerTex.wrapS = THREE.RepeatWrapping;

    const pathFlows = [];
    stationSpots.forEach(spot => {
      if (spot.idx === 4) return;
      const len = Math.hypot(spot.x, spot.z);
      const ang = Math.atan2(spot.z, spot.x);
      const innerR = 2.6, outerR = len - 1.4;
      const plen = outerR - innerR;
      // carved runner slab
      const rt = runnerTex.clone();
      rt.needsUpdate = true;
      rt.repeat.set(Math.max(2, Math.round(plen / 1.6)), 1);
      const runner = new THREE.Mesh(
        new THREE.PlaneGeometry(plen, 0.9),
        new THREE.MeshStandardMaterial({
          map: rt, roughness: 0.7, metalness: 0.1, envMapIntensity: ENV,
          emissive: 0xff7a1a, emissiveMap: rt, emissiveIntensity: 0.5,
        })
      );
      runner.rotation.x = -Math.PI / 2;
      runner.rotation.z = -ang;
      runner.position.set(Math.cos(ang) * (innerR + plen / 2), 0.02, Math.sin(ang) * (innerR + plen / 2));
      runner.receiveShadow = true;
      scene.add(runner);
      // bright travelling pulse
      const pulse = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.9),
        new THREE.MeshBasicMaterial({
          color: 0xffd9a0, transparent: true, opacity: 0.7,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      pulse.rotation.x = -Math.PI / 2;
      pulse.rotation.z = -ang;
      scene.add(pulse);
      pathFlows.push({ idx: spot.idx, ang, innerR, plen, runner, rt, pulse });
    });

    /* bloom */
    let composer = null;
    if (!coarse) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(
        new THREE.Vector2(wrap.clientWidth, wrap.clientHeight), 0.68, 0.7, 0.8
      ));
      composer.addPass(new OutputPass());
    }

    /* input */
    const keys = {};
    const joy = { x: 0, y: 0, id: null };
    let lookId = null, lastX = 0, lastY = 0;
    let yaw = 0, pitch = -0.06;
    let targetYaw = 0, targetPitch = -0.06;

    const isTyping = (e) => {
      const t = e.target;
      return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    };
    const kd = (e) => {
      if (isTyping(e) || overlayRef.current) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(k)) {
        keys[k] = true;
        e.preventDefault();
      }
    };
    const ku = (e) => {
      const k = e.key.toLowerCase();
      keys[k] = false; /* always clear, even if typed in a field */
    };
    window.addEventListener("keydown", kd, { passive: false });
    window.addEventListener("keyup", ku);

    const joyEl = joyRef.current, knobEl = knobRef.current;
    const setKnob = (dx, dy) => { if (knobEl) knobEl.style.transform = `translate(${dx}px, ${dy}px)`; };
    const onJoyDown = e => { joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); };
    const onJoyMove = e => {
      if (e.pointerId !== joy.id) return;
      const r = joyEl.getBoundingClientRect();
      let dx = e.clientX - (r.left + r.width / 2);
      let dy = e.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy), max = r.width * 0.32;
      if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
      joy.x = dx / max; joy.y = dy / max;
      setKnob(dx, dy);
    };
    const onJoyUp = e => {
      if (e.pointerId !== joy.id) return;
      joy.id = null; joy.x = 0; joy.y = 0;
      setKnob(0, 0);
    };
    if (joyEl) {
      joyEl.addEventListener("pointerdown", onJoyDown);
      joyEl.addEventListener("pointermove", onJoyMove);
      joyEl.addEventListener("pointerup", onJoyUp);
      joyEl.addEventListener("pointercancel", onJoyUp);
    }

    const el = renderer.domElement;
    const onLookDown = e => {
      if (lookId !== null) return;
      lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const onLookMove = e => {
      if (e.pointerId !== lookId) return;
      targetYaw -= (e.clientX - lastX) * 0.0032;
      targetPitch -= (e.clientY - lastY) * 0.0027;
      targetPitch = Math.max(-0.58, Math.min(0.5, targetPitch));
      lastX = e.clientX; lastY = e.clientY;
    };
    const onLookUp = e => { if (e.pointerId === lookId) lookId = null; };
    el.addEventListener("pointerdown", onLookDown);
    el.addEventListener("pointermove", onLookMove);
    el.addEventListener("pointerup", onLookUp);
    el.addEventListener("pointercancel", onLookUp);

    const onResize = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer && composer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);
    let hidden = false;
    const onVis = () => { hidden = document.hidden; };
    document.addEventListener("visibilitychange", onVis);

    /* entrance dolly */
    let entranceT = -1;
    const START = { y: 6.2, z: 30, pitch: -0.34 };
    const END = { y: 1.7, z: 19, pitch: -0.06 };
    if (embedRef.current) {
      // Cinematic orbit — position set each frame in tick
      yawObj.position.set(0, 8.5, 26);
      pitch = targetPitch = -0.32;
      entranceT = 999;
    } else if (reduceMotion) {
      yawObj.position.set(0, END.y, END.z);
      pitch = targetPitch = END.pitch;
      entranceT = 999;
    } else {
      pitch = targetPitch = START.pitch;
    }

    const clock = new THREE.Clock();
    const vel = new THREE.Vector2(0, 0);
    let bobPhase = 0;
    let currentStation = -1;
    let raf = 0;
    const easeOut = x => 1 - Math.pow(1 - x, 3);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (hidden) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      let inEntrance = false;
      if (enteredRef.current && entranceT >= -1 && entranceT < 2.2) {
        if (entranceT < 0) entranceT = 0;
        entranceT += dt;
        const u = easeOut(Math.min(1, entranceT / 2.2));
        yawObj.position.y = START.y + (END.y - START.y) * u;
        yawObj.position.z = START.z + (END.z - START.z) * u;
        pitch = targetPitch = START.pitch + (END.pitch - START.pitch) * u;
        inEntrance = entranceT < 2.2;
      }

      // Embed mode: cinematic orbit around plaza with zoom + subtle drift
      if (embedRef.current) {
        const orbitSpeed = 0.06;
        const ang = t * orbitSpeed;
        // Zoom loop: 32s slow breathing, stays comfortably framed
        const zoomCycle = 32;
        const zProg = (t % zoomCycle) / zoomCycle;
        const zoomEase = 0.5 - 0.5 * Math.cos(zProg * Math.PI * 2);
        const orbitR = 26 - zoomEase * 4;
        const orbitY = 8.5 + Math.sin(t * 0.35) * 0.6;
        yawObj.position.x = Math.sin(ang) * orbitR;
        yawObj.position.z = Math.cos(ang) * orbitR;
        yawObj.position.y = orbitY;
        // Face TOWARD the center. Three.js camera looks down -Z at yaw=0;
        // for orbit position (sin*R, y, cos*R), yaw=ang faces origin.
        targetYaw = ang;
        yaw = targetYaw;
        targetPitch = -0.32 + Math.sin(t * 0.22) * 0.03 - zoomEase * 0.03;
        pitch = targetPitch;
      }

      const lookK = Math.min(1, dt * 14);
      yaw += (targetYaw - yaw) * lookK;
      pitch += (targetPitch - pitch) * lookK;
      yawObj.rotation.y = yaw;
      pitchObj.rotation.x = pitch;

      let running = false, moving = false;
      const canMove = enteredRef.current && !inEntrance && !overlayRef.current;
      if (canMove) {
        let mx = 0, mz = 0;
        if (keys["w"] || keys["arrowup"]) mz -= 1;
        if (keys["s"] || keys["arrowdown"]) mz += 1;
        if (keys["a"] || keys["arrowleft"]) mx -= 1;
        if (keys["d"] || keys["arrowright"]) mx += 1;
        mx += joy.x; mz += joy.y;
        const mlen = Math.hypot(mx, mz);
        if (mlen > 1) { mx /= mlen; mz /= mlen; }
        running = !!keys["shift"] && mlen > 0.01;
        const speed = running ? 7.2 : 4.4;
        const cos = Math.cos(yaw), sin = Math.sin(yaw);
        const wx = (mx * cos + mz * sin) * speed;
        const wz = (-mx * sin + mz * cos) * speed;
        const accelK = Math.min(1, dt * 9);
        vel.x += (wx - vel.x) * accelK;
        vel.y += (wz - vel.y) * accelK;
        yawObj.position.x += vel.x * dt;
        yawObj.position.z += vel.y * dt;
        moving = Math.hypot(vel.x, vel.y) > 0.4;

        if (moving && !reduceMotion) {
          bobPhase += dt * (running ? 11 : 8);
          camera.position.y = Math.sin(bobPhase) * 0.038;
          camera.position.x = Math.cos(bobPhase * 0.5) * 0.02;
        } else if (!reduceMotion) {
          camera.position.y += (Math.sin(t * 1.9) * 0.01 - camera.position.y) * Math.min(1, dt * 4);
          camera.position.x += (0 - camera.position.x) * Math.min(1, dt * 6);
        }

        const targetFov = running && moving && !reduceMotion ? 74 : 68;
        if (Math.abs(camera.fov - targetFov) > 0.05) {
          camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 6);
          camera.updateProjectionMatrix();
        }

        const p = yawObj.position;
        const dCenter = Math.hypot(p.x, p.z);
        if (dCenter > 22) { p.x *= 22 / dCenter; p.z *= 22 / dCenter; }
        for (const c of colliders) {
          const dx = p.x - c.x, dz = p.z - c.z;
          const d = Math.hypot(dx, dz);
          if (d < c.r && d > 0.001) {
            p.x = c.x + (dx / d) * c.r;
            p.z = c.z + (dz / d) * c.r;
          }
        }
      } else {
        vel.x *= Math.max(0, 1 - dt * 8);
        vel.y *= Math.max(0, 1 - dt * 8);
      }

      if (playerMarkRef.current) {
        const p = yawObj.position;
        playerMarkRef.current.setAttribute(
          "transform",
          `translate(${p.x.toFixed(2)} ${p.z.toFixed(2)}) rotate(${(-yaw * 180 / Math.PI).toFixed(1)})`
        );
      }

      for (const tl of torchLights) {
        const fl = 0.8 + 0.2 * Math.sin(t * 11 + tl.seed) * Math.sin(t * 5.7 + tl.seed * 2);
        tl.light.intensity = 17 * fl;
        tl.flame.scale.setScalar(0.9 + 0.18 * Math.sin(t * 13 + tl.seed));
        tl.core.scale.setScalar(0.85 + 0.25 * Math.sin(t * 15 + tl.seed * 3));
        if (tl.smoke) {
          const cycle = ((t * 0.42 + tl.seed) % 1);
          tl.smoke.position.y = 3.6 + cycle * 1.1;
          tl.smoke.position.x = tl.x + Math.sin(t * 0.8 + tl.seed) * 0.12;
          tl.smoke.scale.setScalar(0.35 + cycle * 0.55);
          tl.smoke.material.opacity = 0.22 * (1 - cycle);
        }
      }

      core.material.emissiveIntensity = 2.8 + Math.sin(t * 1.6) * 0.7;
      beam.material.opacity = 0.11 + Math.sin(t * 1.6) * 0.03;
      mosaicGlow.material.emissiveIntensity = 0.45 + Math.sin(t * 1.6) * 0.18;
      starMat.size = 0.75 + Math.sin(t * 0.8) * 0.06;

      /* shooting star */
      shootT -= dt;
      if (shootT <= 0 && shootLife <= 0) {
        shootLife = 1.15;
        shootT = 8 + Math.random() * 9;
        shoot.position.set(-70 + Math.random() * 140, 46 + Math.random() * 16, -95);
        shootDir.set(0.55 + Math.random() * 0.3, -0.28, 0.1).normalize().multiplyScalar(58);
        shoot.material.rotation = Math.atan2(-shootDir.y, shootDir.x);
      }
      if (shootLife > 0) {
        shootLife -= dt;
        shoot.position.addScaledVector(shootDir, dt);
        const lp = shootLife / 1.15;
        shoot.material.opacity = Math.sin(lp * Math.PI) * 0.85;
      } else {
        shoot.material.opacity = 0;
      }

      for (const b of banners) {
        const attr = b.mesh.geometry.attributes.position;
        const arr = attr.array, base = b.base;
        for (let i = 0; i < arr.length; i += 3) {
          const y = base[i + 1];
          const hang = (0.85 - y) / 1.7;
          arr[i + 2] = Math.sin(t * 2.1 + b.seed + y * 3.2) * 0.085 * Math.max(0, hang);
        }
        attr.needsUpdate = true;
      }

      {
        const arr = emberGeo.attributes.position.array;
        for (let i = 0; i < emberCount; i++) {
          arr[i * 3 + 1] += emberSeed[i * 2] * dt;
          arr[i * 3] += Math.sin(t * 0.7 + emberSeed[i * 2 + 1]) * dt * 0.18;
          if (arr[i * 3 + 1] > 6.5) arr[i * 3 + 1] = 0.1;
        }
        emberGeo.attributes.position.needsUpdate = true;
      }

      {
        const arr = flyGeo.attributes.position.array;
        for (let i = 0; i < flyCount; i++) {
          arr[i * 3] += Math.sin(t * flySeed[i * 3 + 1] + flySeed[i * 3]) * dt * 0.35;
          arr[i * 3 + 1] += Math.cos(t * 0.9 + flySeed[i * 3 + 2]) * dt * 0.22;
          arr[i * 3 + 2] += Math.cos(t * flySeed[i * 3 + 1] + flySeed[i * 3 + 2]) * dt * 0.35;
        }
        flyGeo.attributes.position.needsUpdate = true;
      }

      const orbSpeed = reduceMotion ? 0.3 : 1;
      for (const o of orbs) {
        const u = ((t * orbSpeed) / o.period + o.phase) % 1;
        const pos = o.curve.getPointAt(u);
        pos.y += Math.sin(t * 2 + o.phase * 9) * 0.08;
        o.mesh.position.copy(pos);
        if (o.light) o.light.position.copy(pos);
        if (o.trail.length) {
          o.history.unshift(pos.clone());
          if (o.history.length > 40) o.history.pop();
          o.trail.forEach((sp, k) => {
            const h = o.history[Math.min(o.history.length - 1, (k + 1) * 5)];
            if (h) sp.position.copy(h);
          });
        }
      }

      sky.rotation.y = t * 0.0025;
      stars.rotation.y = t * 0.005;

      /* station guides: icons float and pulse, flip to green check when served */
      const acts = actionsRef.current;
      guides.forEach((gd, i) => {
        const done = !!acts[STATIONS[gd.spot.idx].action.key];
        if (gd.pillar) gd.pillar.visible = !done;
        const bobY = gd.baseY + Math.sin(t * 1.8 + i * 1.3) * 0.12;
        gd.icon.position.y = bobY;
        gd.glow.position.y = bobY;
        if (gd.sign) gd.sign.position.y = bobY - 1.15;
        if (!done) {
          gd.glow.material.opacity = 0.36 + Math.sin(t * 2.4 + i) * 0.12;
          gd.icon.scale.setScalar(1.0 + Math.sin(t * 2.4 + i) * 0.04);
          if (gd.sign) gd.sign.material.opacity = 1;
          gd.pad.material.color.setHex(0xff9a3c);
          gd.pad.material.opacity = 0.13 + Math.sin(t * 2.4 + i) * 0.05;
        } else {
          if (!gd.doneApplied) {
            gd.doneApplied = true;
            gd.icon.material.map = checkTex;
            gd.icon.material.needsUpdate = true;
            gd.icon.material.opacity = 0.8;
            gd.icon.scale.setScalar(0.7);
            gd.glow.material.color.setHex(0x2ed573);
            if (gd.sign) gd.sign.visible = false;
          }
          gd.glow.material.opacity = 0.14;
          gd.pad.material.color.setHex(0x2ed573);
          gd.pad.material.opacity = 0.09;
        }
      });

      /* pathway flow — a bright pulse streams along each unserved runner */
      for (const pf of pathFlows) {
        const served = !!acts[STATIONS[pf.idx].action.key];
        pf.runner.material.emissiveIntensity = served ? 0.12 : 0.45 + Math.sin(t * 2 + pf.idx) * 0.15;
        pf.runner.material.emissive.setHex(served ? 0x2ed573 : 0xff7a1a);
        const frac = ((t * 0.32 + pf.idx * 0.2) % 1);
        const along = pf.innerR + frac * pf.plen;
        pf.pulse.position.set(Math.cos(pf.ang) * along, 0.03, Math.sin(pf.ang) * along);
        pf.pulse.material.opacity = served ? 0 : Math.sin(frac * Math.PI) * 0.7;
        pf.pulse.visible = !served;
      }

      /* compass needle in the progress pill points to nearest unserved station */
      if (compassRef.current && enteredRef.current) {
        const p = yawObj.position;
        let bx = 0, bz = 0, bd = Infinity, found = false;
        for (const gd of guides) {
          if (acts[STATIONS[gd.spot.idx].action.key]) continue;
          const ddx = gd.spot.x - p.x, ddz = gd.spot.z - p.z;
          const d2 = ddx * ddx + ddz * ddz;
          if (d2 < bd) { bd = d2; bx = ddx; bz = ddz; found = true; }
        }
        if (found && bd > 4.6 * 4.6) {
          const deg = (Math.atan2(bx, -bz) + yaw) * 180 / Math.PI;
          compassRef.current.textContent = "➤";
          compassRef.current.style.transform = `rotate(${(deg - 90).toFixed(1)}deg)`;
        } else {
          compassRef.current.textContent = "◆";
          compassRef.current.style.transform = "rotate(0deg)";
        }
      }

      /* station proximity */
      if (enteredRef.current && !inEntrance) {
        const p = yawObj.position;
        let best = -1, bestD = 4.6;
        for (const gd of guides) {
          const d = Math.hypot(p.x - gd.spot.x, p.z - gd.spot.z);
          if (d < bestD) { bestD = d; best = gd.spot.idx; }
        }
        if (best !== currentStation) {
          currentStation = best;
          stationRef.current = best;
          setStation(best);
        }
      }

      composer ? composer.render() : renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      el.removeEventListener("pointerdown", onLookDown);
      el.removeEventListener("pointermove", onLookMove);
      el.removeEventListener("pointerup", onLookUp);
      el.removeEventListener("pointercancel", onLookUp);
      if (joyEl) {
        joyEl.removeEventListener("pointerdown", onJoyDown);
        joyEl.removeEventListener("pointermove", onJoyMove);
        joyEl.removeEventListener("pointerup", onJoyUp);
        joyEl.removeEventListener("pointercancel", onJoyUp);
      }
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => {
            if (m.map) m.map.dispose();
            if (m.bumpMap) m.bumpMap.dispose();
            m.dispose();
          });
        }
      });
      envTex.dispose();
      composer?.dispose?.();
      renderer.dispose();
      if (renderer.domElement.parentNode === wrap) wrap.removeChild(renderer.domElement);
    };
  }, []);

  const st = station >= 0 ? STATIONS[station] : null;
  const stDone = st ? !!actionsDone[st.action.key] : false;
  const doneCount = STATIONS.filter(s2 => actionsDone[s2.action.key]).length;

  return (
    <div className={`${styles.root} ${embed ? styles.embed : ""}`}>
      <div ref={wrapRef} className={styles.canvasWrap} />
      <div className={styles.vignette} aria-hidden />

      <a href="/" className={styles.backPill}>← agora</a>
      <div className={styles.chainPill}><span className={styles.dot} />GOAT · Chain 2345</div>

      <button
        className={`${styles.progress} ${styles.progressBtn} ${entered ? styles.progressOn : ""}`}
        onClick={() => setMapOpen(true)}
      >
        <span ref={compassRef} className={styles.progressDiamond}>◆</span>
        stations {doneCount} / 5
      </button>

      <button
        className={`${styles.mapBtn} ${entered ? styles.mapBtnOn : ""}`}
        onClick={() => setMapOpen(v => !v)}
        aria-label="Open map and ledger"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 3 4 5v16l5-2 6 2 5-2V3l-5 2-6-2z" /><path d="M9 3v16M15 5v16" />
        </svg>
        <span>map</span>
      </button>

      {/* station card */}
      <div className={`${styles.card} ${st ? styles.cardOn : ""}`} aria-live="polite">
        {st && (
          <>
            <p className={styles.cardEyebrow}>{st.eyebrow}</p>
            <p className={styles.cardLine}>{st.line}</p>
            <p className={styles.cardBody}>{st.body}</p>
            <div className={styles.cardFoot}>
              <button
                className={`${styles.cardBtn} ${stDone ? styles.cardBtnDone : ""}`}
                onClick={() => !stDone && performRef.current(station)}
              >
                {stDone ? "✓ done" : `${st.action.label} →`}
              </button>
              {!stDone && !isTouch && <span className={styles.cardKey}>or press E</span>}
            </div>
          </>
        )}
      </div>

      <div className={`${styles.hint} ${entered && !hintGone ? styles.hintOn : ""}`}>
        {isTouch
          ? "left stick to walk · drag to look · tap the card to act"
          : "WASD to walk · drag to look · E to act · M for map"}
      </div>

      <div ref={joyRef} className={`${styles.joystick} ${isTouch && entered ? styles.joyOn : ""}`}>
        <div ref={knobRef} className={styles.knob} />
      </div>

      {/* MAP + LEDGER */}
      {mapOpen && (
        <div className={styles.ledger} role="dialog" aria-label="Map and ledger">
          <div className={styles.ledgerPanel}>
            <div className={styles.ledgerHead}>
              <p className={styles.ledgerEyebrow}>The Ledger</p>
              <button className={styles.ledgerClose} onClick={() => setMapOpen(false)}>
                ✕{isTouch ? "" : " · M"}
              </button>
            </div>
            <div className={styles.ledgerGrid}>
              <div className={styles.mapWrap}>
                <svg viewBox="-24 -24 48 48" className={styles.mapSvg}>
                  <circle cx="0" cy="0" r="22" fill="rgba(240,236,228,0.02)" stroke="rgba(240,236,228,0.14)" strokeWidth="0.3" strokeDasharray="1 1" />
                  <circle cx="0" cy="0" r="14" fill="none" stroke="rgba(240,236,228,0.08)" strokeWidth="0.25" />
                  {Array.from({ length: 12 }).map((_, i) => {
                    const a = (i / 12) * Math.PI * 2;
                    return (
                      <circle key={i} cx={Math.cos(a) * 14} cy={Math.sin(a) * 14} r="0.55"
                        fill="rgba(188,183,171,0.55)" />
                    );
                  })}
                  {STALL_ANGLES.map((a, i) => (
                    <g key={i}
                      transform={`translate(${Math.cos(a) * 8.5} ${Math.sin(a) * 8.5}) rotate(${a * 180 / Math.PI + 90})`}>
                      <rect x="-1.6" y="-0.7" width="3.2" height="1.4" rx="0.3"
                        fill="rgba(180,88,26,0.35)" stroke="rgba(242,131,34,0.5)" strokeWidth="0.18" />
                    </g>
                  ))}
                  <circle cx="0" cy="0" r="2.5" fill="none" stroke="rgba(242,131,34,0.4)" strokeWidth="0.2" />
                  <circle cx="0" cy="0" r="0.5" fill="rgba(255,154,60,0.9)" />
                  {[...STALL_ANGLES.map((a, i) => ({ x: Math.cos(a) * 8.5, z: Math.sin(a) * 8.5, idx: i })), { x: 0, z: 0, idx: 4 }]
                    .map(spot => actionsDone[STATIONS[spot.idx].action.key] ? (
                      <circle key={spot.idx} cx={spot.x} cy={spot.z} r="0.7"
                        fill="rgba(46,213,115,0.25)" stroke="rgba(46,213,115,0.8)" strokeWidth="0.2" />
                    ) : (
                      <rect key={spot.idx} x={spot.x - 0.55} y={spot.z - 0.55} width="1.1" height="1.1"
                        transform={`rotate(45 ${spot.x} ${spot.z})`}
                        fill="rgba(255,154,60,0.85)" />
                    ))}
                  <g ref={playerMarkRef}>
                    <path d="M0,-1.15 L0.75,0.85 L0,0.4 L-0.75,0.85 Z" fill="#eae7e0" />
                  </g>
                </svg>
                <p className={styles.mapCaption}>◆ station to serve · ● served · you are the arrow</p>
              </div>

              <div className={styles.objectives}>
                <p className={styles.objGroup}>The five stations · {doneCount} / 5</p>
                {STATIONS.map((s2, i) => {
                  const done = !!actionsDone[s2.action.key];
                  const inner = (
                    <>
                      <span className={styles.objMark}>{done ? "✓" : "◆"}</span>
                      <span className={styles.objLabel}>
                        {s2.action.label}
                        <span className={styles.objSub}>{s2.eyebrow}</span>
                      </span>
                      <span className={styles.objArrow}>→</span>
                    </>
                  );
                  return s2.action.form ? (
                    <button key={i}
                      className={`${styles.objRow} ${styles.objLink} ${done ? styles.objDone : ""}`}
                      onClick={() => { setMapOpen(false); setFormOpen(true); }}
                    >{inner}</button>
                  ) : (
                    <a key={i}
                      href={s2.action.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${styles.objRow} ${styles.objLink} ${done ? styles.objDone : ""}`}
                      onClick={() => markAction(s2.action.key)}
                    >{inner}</a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* spawn-in intro */}
      {intro && entered && (
        <div className={styles.intro} onClick={() => setIntro(false)}>
          <div className={styles.introCard} onClick={e => e.stopPropagation()}>
            <p className={styles.introEyebrow}>Welcome to the Square</p>
            <p className={styles.introBody}>
              Five glowing signs float over this marketplace. Walk to a sign,
              read the inscription, act. Serve all five to claim the Square.
            </p>
            <div className={styles.introRows}>
              <div className={styles.introRow}>
                <span className={styles.introKey}>{isTouch ? "stick" : "WASD"}</span>
                <span>walk</span>
              </div>
              <div className={styles.introRow}>
                <span className={styles.introKey}>drag</span>
                <span>look around</span>
              </div>
              <div className={styles.introRow}>
                <span className={styles.introKey}>{isTouch ? "tap" : "E"}</span>
                <span>act at a station</span>
              </div>
              <div className={styles.introRow}>
                <span className={styles.introKey}>➤</span>
                <span>the needle up top points to your next station</span>
              </div>
              <div className={styles.introRow}>
                <span className={styles.introKey}>{isTouch ? "map" : "M"}</span>
                <span>map + ledger</span>
              </div>
            </div>
            <button className={styles.enterBtn} onClick={() => setIntro(false)}>
              Begin
            </button>
          </div>
        </div>
      )}

      {/* in-game feedback form */}
      {formOpen && (
        <div className={styles.ledger} role="dialog" aria-label="Seed user feedback">
          <iframe
            name="agora_form_sink"
            title="form sink"
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              border: 0,
              opacity: 0,
              pointerEvents: "none",
              overflow: "hidden",
            }}
            tabIndex={-1}
            aria-hidden="true"
          />
          <div className={`${styles.ledgerPanel} ${styles.formPanel}`}>
            <div className={styles.ledgerHead}>
              <p className={styles.ledgerEyebrow}>Become a seed user</p>
              <button className={styles.ledgerClose} onClick={() => setFormOpen(false)}>✕</button>
            </div>
            {formSent ? (
              <div className={styles.formThanks}>
                <p className={styles.formThanksMark}>✓</p>
                <p className={styles.formThanksTitle}>Logged. Thank you.</p>
                <p className={styles.formThanksBody}>
                  Your feedback goes straight to the people building Agora.
                </p>
                <button className={styles.enterBtn} onClick={() => setFormOpen(false)}>
                  Back to the square
                </button>
              </div>
            ) : (
              <form
                className={styles.form}
                action={FORM_ACTION}
                method="POST"
                target="agora_form_sink"
                onSubmit={() => {
                  markAction("seed");
                  setTimeout(() => setFormSent(true), 350);
                }}
              >
                <label className={styles.fLabel}>
                  What kind of autonomous agent(s) do you run, if any?
                  <input className={styles.fInput} name={FORM_FIELDS.agents} type="text"
                    placeholder="e.g. coding agent, research agent, trading bot, none yet" />
                </label>
                <label className={styles.fLabel}>
                  Have you ever needed more compute mid-task and had to stop and manually provision it? What did that look like?
                  <textarea className={styles.fArea} name={FORM_FIELDS.compute} rows={2}
                    placeholder="Tell us what happened…" />
                </label>
                <fieldset className={styles.fFieldset}>
                  <legend className={styles.fLegend}>
                    Would you trust an agent to autonomously find, pay for, and use compute from another agent, with no human approving each step?
                  </legend>
                  {["Yes, fully.", "Yes, but with spending limits.", "No, i'd want to approve each time.", "I'm not sure..."].map(o => (
                    <label key={o} className={styles.fRadio}>
                      <input type="radio" name={FORM_FIELDS.trust} value={o} /> {o}
                    </label>
                  ))}
                </fieldset>
                <fieldset className={styles.fFieldset}>
                  <legend className={styles.fLegend}>
                    If you had idle compute (a GPU, cloud credits, an unused server), would you want your own agent to passively rent it out on Agora?
                  </legend>
                  {["Yes", "Maybe", "No"].map(o => (
                    <label key={o} className={styles.fRadio}>
                      <input type="radio" name={FORM_FIELDS.rent} value={o} /> {o}
                    </label>
                  ))}
                </fieldset>
                <label className={styles.fLabel}>
                  What's the single biggest thing that would stop you from using Agora today?
                  <textarea className={styles.fArea} name={FORM_FIELDS.blocker} rows={2}
                    placeholder="Be honest, this is the useful part." />
                </label>
                <button type="submit" className={styles.enterBtn}>Send feedback</button>
                <p className={styles.fNote}>Anonymous · answers land in our sheet · takes ~2 min</p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* enter overlay */}
      {!entered && !webglFail && (
        <div className={styles.enter}>
          <p className={styles.enterEyebrow}>Agora · The Square</p>
          <h1 className={styles.enterTitle}>Walk the marketplace.</h1>
          <p className={styles.enterSub}>
            A night agora with five lit stations. Every inscription in this
            square is a real on-chain fact.
          </p>
          <button className={styles.enterBtn} onClick={() => { setEntered(true); setIntro(true); }}>
            Enter
          </button>
        </div>
      )}

      {/* completion */}
      {complete && (
        <div className={styles.enter}>
          <p className={styles.enterEyebrow}>All five stations served</p>
          <h1 className={styles.enterTitle}>The Square is yours.</h1>
          <p className={styles.enterSub}>
            You just saw the whole loop: identity, settlement, network, and the
            people building it. Agora is live in Stage 2 of the OpenClaw Summer
            Bootcamp. Pass it on.
          </p>
          <div className={styles.enterRow}>
            <button className={styles.enterBtn} onClick={shareSquare}>
              {shared === "copied" ? "Link copied ✓" : "Share the Square"}
            </button>
            <button className={styles.enterBtnGhost} onClick={() => { setComplete(false); setMapOpen(true); }}>
              Open the ledger
            </button>
          </div>
          <button className={styles.enterDismiss} onClick={() => setComplete(false)}>
            Keep walking
          </button>
        </div>
      )}

      {webglFail && (
        <div className={styles.enter}>
          <p className={styles.enterEyebrow}>Agora · The Square</p>
          <h1 className={styles.enterTitle}>3D isn’t available here.</h1>
          <p className={styles.enterSub}>
            This device or browser doesn’t support WebGL. The rest of Agora works fine.
          </p>
          <a href="/" className={styles.enterBtn}>Back to Agora</a>
        </div>
      )}
    </div>
  );
}
