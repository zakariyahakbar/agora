"use client";

/* ══════════════════════════════════════════
   AGORA — THE SQUARE (v3)
   A walkable night agora with a ledger of
   objectives. Exploration objectives are the
   five on-chain inscriptions; economy
   objectives feed Stage 2 growth directly.
   M — map/ledger · WASD — walk · drag — look
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
const SCAN_URL = "https://8004scan.io/agents?chain=2345";
const REFERRAL_URL = "https://clawup.org/?ref=f0af754b9e";

/* ── Seed-user feedback → posts straight into the Google Form sheet ── */
const FORM_ACTION =
  "https://docs.google.com/forms/d/e/1FAIpQLScN7egZXKJC86g9nZMscWtKxKyH7iEoOuZf8cm3I_zGb1clQg/formResponse";
const FORM_FIELDS = {
  agents: "entry.1589436820",   // Q1 "test1" — what agents do you run
  compute: "entry.509501295",   // Q2 "test2" — needed compute mid-task
  trust: "entry.912736896",     // Q3 "Yes, fully." — trust autonomous pay (radio)
  rent: "entry.1728505312",     // Q4 "Yes" — rent idle compute (radio)
  blocker: "entry.1356220945",  // Q5 "test3" — biggest blocker
};

const LEDGER_KEY = "agora_square_ledger_v1";

/* ── Real facts shown as stall inscriptions ── */
const PLACARDS = [
  { eyebrow: "Identity", short: "Identity", line: "ERC-8004 · Agent #82",
    body: "Registered on GOAT mainnet. Owner and creator verified on-chain." },
  { eyebrow: "Settlement", short: "Settlement", line: "x402 · 1 USDC.e settled",
    body: "0xa8747b…3460 — a real payment, confirmed and gateway-verified." },
  { eyebrow: "Network", short: "Network", line: "GOAT · Chain 2345",
    body: "Bitcoin-secured L2. Mainnet — not a testnet demo." },
  { eyebrow: "The name", short: "The name", line: "ἀγορά — “open marketplace”",
    body: "The Greek square where trade happened. Rebuilt for machines." },
  { eyebrow: "Agora", short: "The beacon", line: "The marketplace machines built for machines.",
    body: "One agent. Autonomous bids. Zero human approvals." },
];

/* ── Economy objectives — each feeds a Stage 2 variable ── */
const ACTIONS = [
  { key: "agent", label: "Talk to the AGORA agent", sub: "The live agent, in Telegram", href: TELEGRAM_URL },
  { key: "follow", label: "Follow the build", sub: "@usingagora on X", href: X_URL },
  { key: "launch", label: "Launch your own agent", sub: "ClawUp — free to start", href: REFERRAL_URL },
  { key: "verify", label: "Verify Agora on-chain", sub: "Agent #82 on 8004scan", href: SCAN_URL },
  { key: "seed", label: "Become a seed user", sub: "2 minutes shapes what we build", form: true },
];

const STALL_ANGLES = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];

export default function SquarePage() {
  const wrapRef = useRef(null);
  const joyRef = useRef(null);
  const knobRef = useRef(null);
  const playerMarkRef = useRef(null);

  const [entered, setEntered] = useState(false);
  const enteredRef = useRef(false);
  const [placard, setPlacard] = useState(-1);
  const [visited, setVisited] = useState([false, false, false, false, false]);
  const visitedRef = useRef(visited);
  const [actionsDone, setActionsDone] = useState({});
  const [complete, setComplete] = useState(false);
  const completeShownRef = useRef(false);
  const [mapOpen, setMapOpen] = useState(false);
  const mapOpenRef = useRef(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [intro, setIntro] = useState(false);
  const [hintGone, setHintGone] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [webglFail, setWebglFail] = useState(false);

  /* refs the render loop reads */
  useEffect(() => { enteredRef.current = entered; }, [entered]);
  useEffect(() => { visitedRef.current = visited; }, [visited]);
  useEffect(() => { mapOpenRef.current = mapOpen || formOpen || intro; }, [mapOpen, formOpen, intro]);

  useEffect(() => {
    if (entered && !intro) {
      const t = setTimeout(() => setHintGone(true), 8000);
      return () => clearTimeout(t);
    }
  }, [entered, intro]);

  const enterSquare = () => {
    setEntered(true);
    setIntro(true);
  };

  /* load / persist ledger */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LEDGER_KEY) || "null");
      if (saved?.visited?.length === 5) setVisited(saved.visited);
      if (saved?.actions) setActionsDone(saved.actions);
      if (saved?.visited?.every(Boolean)) completeShownRef.current = true;
    } catch { /* fresh start */ }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(LEDGER_KEY, JSON.stringify({ visited, actions: actionsDone }));
    } catch { /* private mode etc. */ }
  }, [visited, actionsDone]);

  /* M key toggles map */
  useEffect(() => {
    const onM = (e) => {
      const k = e.key.toLowerCase();
      if (k === "m" && enteredRef.current) setMapOpen(v => !v);
      if (k === "escape") setMapOpen(false);
    };
    window.addEventListener("keydown", onM);
    return () => window.removeEventListener("keydown", onM);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const coarse =
      window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    setIsTouch(coarse);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ── Renderer ── */
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

    /* ── Scene / camera rig ── */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060509);
    scene.fog = new THREE.FogExp2(0x08070c, 0.026);

    /* subtle environment reflections (marble sheen) */
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();
    const ENV = 0.22;

    const camera = new THREE.PerspectiveCamera(
      68, wrap.clientWidth / wrap.clientHeight, 0.1, 320
    );
    const pitchObj = new THREE.Object3D();
    pitchObj.add(camera);
    const yawObj = new THREE.Object3D();
    yawObj.position.set(0, 6.2, 30);
    yawObj.add(pitchObj);
    scene.add(yawObj);

    /* ── Lights ── */
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

    /* ── Ground ── */
    const gCan = document.createElement("canvas");
    gCan.width = gCan.height = 1024;
    const g = gCan.getContext("2d");
    g.fillStyle = "#0c0b10";
    g.fillRect(0, 0, 1024, 1024);
    for (let ty = 0; ty < 8; ty++) {
      for (let tx = 0; tx < 8; tx++) {
        const v = 10 + Math.floor(Math.random() * 7);
        g.fillStyle = `rgb(${v},${v - 1},${v + 3})`;
        g.fillRect(tx * 128 + 2, ty * 128 + 2, 124, 124);
      }
    }
    g.strokeStyle = "rgba(216,210,198,0.06)";
    g.lineWidth = 3;
    for (let i = 0; i <= 8; i++) {
      g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 1024); g.stroke();
      g.beginPath(); g.moveTo(0, i * 128); g.lineTo(1024, i * 128); g.stroke();
    }
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(220,214,200,${0.012 + Math.random() * 0.04})`;
      g.fillRect(Math.random() * 1024, Math.random() * 1024, 1.8, 1.8);
    }
    const groundTex = new THREE.CanvasTexture(gCan);
    groundTex.colorSpace = THREE.SRGBColorSpace;
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(9, 9);
    groundTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(70, 64),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.9, metalness: 0.03, envMapIntensity: ENV })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const mosaic = new THREE.Mesh(
      new THREE.RingGeometry(1.7, 2.5, 48),
      new THREE.MeshStandardMaterial({ color: 0x191510, roughness: 0.8, envMapIntensity: ENV })
    );
    mosaic.rotation.x = -Math.PI / 2;
    mosaic.position.y = 0.012;
    mosaic.receiveShadow = true;
    scene.add(mosaic);
    const mosaicGlow = new THREE.Mesh(
      new THREE.RingGeometry(2.44, 2.52, 48),
      new THREE.MeshStandardMaterial({
        color: 0x1a1208, emissive: 0xf28322, emissiveIntensity: 0.55, roughness: 0.6,
      })
    );
    mosaicGlow.rotation.x = -Math.PI / 2;
    mosaicGlow.position.y = 0.014;
    scene.add(mosaicGlow);

    /* ── Sky ── */
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
    const starMat = new THREE.PointsMaterial({ color: 0xc3cade, size: 0.75, transparent: true, opacity: 0.85 });
    scene.add(new THREE.Points(starGeo, starMat));

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xd6dcec })
    );
    moon.position.set(-62, 34, -84);
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
      map: makeRadialTex("rgba(200,210,240,0.55)", "rgba(160,175,220,0.16)", 0.4),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    halo.scale.setScalar(22);
    halo.position.copy(moon.position);
    scene.add(halo);

    const cypressMat = new THREE.MeshBasicMaterial({ color: 0x04040a });
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 36 + Math.random() * 12;
      const h = 5 + Math.random() * 4.5;
      const tree = new THREE.Mesh(new THREE.ConeGeometry(0.8 + Math.random() * 0.5, h, 7), cypressMat);
      tree.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      scene.add(tree);
    }

    /* ── Materials ── */
    const fCan = document.createElement("canvas");
    fCan.width = 128; fCan.height = 32;
    const f = fCan.getContext("2d");
    for (let i = 0; i < 16; i++) {
      const gr = f.createLinearGradient(i * 8, 0, i * 8 + 8, 0);
      gr.addColorStop(0, "#666");
      gr.addColorStop(0.5, "#fff");
      gr.addColorStop(1, "#666");
      f.fillStyle = gr;
      f.fillRect(i * 8, 0, 8, 32);
    }
    const fluteTex = new THREE.CanvasTexture(fCan);
    fluteTex.wrapS = fluteTex.wrapT = THREE.RepeatWrapping;
    fluteTex.repeat.set(2, 1);
    const marble = new THREE.MeshStandardMaterial({ color: 0xbcb7ab, roughness: 0.58, metalness: 0.05, envMapIntensity: ENV });
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0xbcb7ab, roughness: 0.58, metalness: 0.05,
      bumpMap: fluteTex, bumpScale: 0.9, envMapIntensity: ENV,
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

    /* ── Colonnade ── */
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

    /* ── Torches + smoke ── */
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff7a1a, emissive: 0xff8c2a, emissiveIntensity: 2.8, roughness: 0.4,
    });
    const smokeTex = makeRadialTex("rgba(140,140,150,0.32)", "rgba(120,120,130,0.1)", 0.5);
    const torchLights = [];
    const torchCount = coarse ? 4 : 6;
    for (let i = 0; i < torchCount; i++) {
      const [x, z, a] = columnXZ[i * (12 / torchCount)];
      const inX = x - Math.cos(a) * 0.85, inZ = z - Math.sin(a) * 0.85;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 8), flameMat);
      flame.position.set(inX, 3.4, inZ);
      scene.add(flame);
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
      torchLights.push({ light, flame, smoke, x: inX, z: inZ, seed: Math.random() * 100 });
    }

    /* ── Banners ── */
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

    /* ── Stalls ── */
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

    /* ── Plinth + beacon ── */
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

    /* ── Embers ── */
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

    /* ── Agent orbs + trails ── */
    const orbTexOrange = makeRadialTex("rgba(255,150,60,0.8)", "rgba(255,120,30,0.25)", 0.4);
    const orbTexGreen = makeRadialTex("rgba(90,235,150,0.8)", "rgba(46,213,115,0.25)", 0.4);
    const orbDefs = [
      { color: 0xff8c2a, tex: orbTexOrange, period: 36, phase: 0.0, order: [0, 1, 2, 3] },
      { color: 0xff8c2a, tex: orbTexOrange, period: 47, phase: 0.4, order: [2, 0, 3, 1] },
      { color: 0x2ed573, tex: orbTexGreen, period: 41, phase: 0.72, order: [1, 3, 0, 2] },
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
        new THREE.MeshStandardMaterial({
          color: def.color, emissive: def.color, emissiveIntensity: 2.8, roughness: 0.35,
        })
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

    /* ── Objective markers ── */
    const markerMat = new THREE.MeshStandardMaterial({
      color: 0xff8c2a, emissive: 0xff9a3c, emissiveIntensity: 2.2, roughness: 0.3,
    });
    const markerGeo = new THREE.OctahedronGeometry(0.15);
    const placardSpots = [
      ...stallWorld.map((v, i) => ({ x: v.x, z: v.z, idx: i })),
      { x: 0, z: 0, idx: 4 },
    ];
    const markers = placardSpots.map(spot => {
      const m = new THREE.Mesh(markerGeo, markerMat.clone());
      m.position.set(spot.x, spot.idx === 4 ? 3.2 : 2.9, spot.z);
      scene.add(m);
      return m;
    });

    /* ── Bloom ── */
    let composer = null;
    if (!coarse) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(
        new THREE.Vector2(wrap.clientWidth, wrap.clientHeight), 0.68, 0.7, 0.8
      ));
      composer.addPass(new OutputPass());
    }

    /* ── Input ── */
    const keys = {};
    const joy = { x: 0, y: 0, id: null };
    let lookId = null, lastX = 0, lastY = 0;
    let yaw = 0, pitch = -0.06;
    let targetYaw = 0, targetPitch = -0.06;

    const onKey = (e, down) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(k)) {
        keys[k] = down;
        if (down) e.preventDefault();
      }
    };
    const kd = e => onKey(e, true);
    const ku = e => onKey(e, false);
    window.addEventListener("keydown", kd, { passive: false });
    window.addEventListener("keyup", ku);

    const joyEl = joyRef.current, knobEl = knobRef.current;
    const setKnob = (dx, dy) => {
      if (knobEl) knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
    };
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

    /* ── Entrance dolly ── */
    let entranceT = reduceMotion ? 999 : -1; // -1 = waiting for enter
    const START = { y: 6.2, z: 30, pitch: -0.34 };
    const END = { y: 1.7, z: 19, pitch: -0.06 };
    if (reduceMotion) {
      yawObj.position.set(0, END.y, END.z);
      pitch = targetPitch = END.pitch;
    } else {
      pitch = targetPitch = START.pitch;
    }

    /* ── Main loop ── */
    const clock = new THREE.Clock();
    const vel = new THREE.Vector2(0, 0);
    let bobPhase = 0;
    let currentPlacard = -1;
    let raf = 0;
    const easeOut = x => 1 - Math.pow(1 - x, 3);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (hidden) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      /* entrance dolly */
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

      /* smoothed look */
      const lookK = Math.min(1, dt * 14);
      yaw += (targetYaw - yaw) * lookK;
      pitch += (targetPitch - pitch) * lookK;
      yawObj.rotation.y = yaw;
      pitchObj.rotation.x = pitch;

      /* movement */
      let running = false, moving = false;
      if (enteredRef.current && !inEntrance && !mapOpenRef.current) {
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
          /* idle breath */
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
      }

      /* live map marker */
      if (mapOpenRef.current && playerMarkRef.current) {
        const p = yawObj.position;
        playerMarkRef.current.setAttribute(
          "transform",
          `translate(${p.x.toFixed(2)} ${p.z.toFixed(2)}) rotate(${(-yaw * 180 / Math.PI).toFixed(1)})`
        );
      }

      /* torch flicker + smoke */
      for (const tl of torchLights) {
        const fl = 0.8 + 0.2 * Math.sin(t * 11 + tl.seed) * Math.sin(t * 5.7 + tl.seed * 2);
        tl.light.intensity = 17 * fl;
        tl.flame.scale.setScalar(0.9 + 0.18 * Math.sin(t * 13 + tl.seed));
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

      markers.forEach((m, i) => {
        const done = visitedRef.current[placardSpots[i].idx];
        m.visible = !done;
        if (!done) {
          m.rotation.y = t * 1.6;
          m.position.y = (placardSpots[i].idx === 4 ? 3.2 : 2.9) + Math.sin(t * 2.2 + i) * 0.1;
        }
      });

      /* proximity + visit tracking */
      if (enteredRef.current && !inEntrance) {
        const p = yawObj.position;
        let best = -1, bestD = 4.6;
        for (const spot of placardSpots) {
          const d = Math.hypot(p.x - spot.x, p.z - spot.z);
          if (d < bestD) { bestD = d; best = spot.idx; }
        }
        if (best !== currentPlacard) {
          currentPlacard = best;
          setPlacard(best);
          if (best >= 0 && !visitedRef.current[best]) {
            const next = [...visitedRef.current];
            next[best] = true;
            visitedRef.current = next;
            setVisited(next);
            if (next.every(Boolean) && !completeShownRef.current) {
              completeShownRef.current = true;
              setTimeout(() => setComplete(true), 900);
            }
          }
        }
      }

      composer ? composer.render() : renderer.render(scene, camera);
    };
    tick();

    /* ── Cleanup ── */
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

  const card = placard >= 0 ? PLACARDS[placard] : null;
  const foundCount = visited.filter(Boolean).length;
  const liveActions = ACTIONS.filter(a => a.form || (a.href && a.href.startsWith("http")));
  const actionCount = liveActions.filter(a => actionsDone[a.key]).length;

  const markAction = (key) =>
    setActionsDone(prev => (prev[key] ? prev : { ...prev, [key]: true }));

  return (
    <div className={styles.root}>
      <div ref={wrapRef} className={styles.canvasWrap} />
      <div className={styles.vignette} aria-hidden />

      {/* top chrome */}
      <a href="/" className={styles.backPill}>← agora</a>
      <div className={styles.chainPill}><span className={styles.dot} />GOAT · Chain 2345</div>

      {/* objective progress — opens the ledger */}
      <button
        className={`${styles.progress} ${styles.progressBtn} ${entered ? styles.progressOn : ""}`}
        onClick={() => setMapOpen(true)}
      >
        <span className={styles.progressDiamond}>◆</span>
        inscriptions {foundCount} / 5 · ledger {actionCount} / {liveActions.length}
      </button>

      {/* map button */}
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

      {/* placard */}
      <div className={`${styles.card} ${card ? styles.cardOn : ""}`} aria-live="polite">
        {card && (
          <>
            <p className={styles.cardEyebrow}>{card.eyebrow}</p>
            <p className={styles.cardLine}>{card.line}</p>
            <p className={styles.cardBody}>{card.body}</p>
          </>
        )}
      </div>

      {/* controls hint */}
      <div className={`${styles.hint} ${entered && !hintGone ? styles.hintOn : ""}`}>
        {isTouch
          ? "left stick — walk · drag — look · map — ledger"
          : "W A S D — walk · drag — look · shift — run · M — map"}
      </div>

      {/* mobile joystick */}
      <div ref={joyRef} className={`${styles.joystick} ${isTouch && entered ? styles.joyOn : ""}`}>
        <div ref={knobRef} className={styles.knob} />
      </div>

      {/* ── MAP + LEDGER ── */}
      {mapOpen && (
        <div className={styles.ledger} role="dialog" aria-label="Map and ledger">
          <div className={styles.ledgerPanel}>
            <div className={styles.ledgerHead}>
              <p className={styles.ledgerEyebrow}>The Ledger</p>
              <button className={styles.ledgerClose} onClick={() => setMapOpen(false)}>
                ✕ {isTouch ? "" : " · M"}
              </button>
            </div>
            <div className={styles.ledgerGrid}>
              {/* map */}
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
                    .map(spot => visited[spot.idx] ? (
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
                <p className={styles.mapCaption}>◆ unfound inscription · ● found</p>
              </div>

              {/* objectives */}
              <div className={styles.objectives}>
                <p className={styles.objGroup}>Walk the square — {foundCount} / 5</p>
                {PLACARDS.map((p, i) => (
                  <div key={i} className={`${styles.objRow} ${visited[i] ? styles.objDone : ""}`}>
                    <span className={styles.objMark}>{visited[i] ? "✓" : "◆"}</span>
                    <span className={styles.objLabel}>{p.short}</span>
                  </div>
                ))}
                <p className={styles.objGroup}>Join the economy — {actionCount} / {liveActions.length}</p>
                {liveActions.map(a => a.form ? (
                  <button
                    key={a.key}
                    className={`${styles.objRow} ${styles.objLink} ${actionsDone[a.key] ? styles.objDone : ""}`}
                    onClick={() => { setMapOpen(false); setFormOpen(true); }}
                  >
                    <span className={styles.objMark}>{actionsDone[a.key] ? "✓" : "◆"}</span>
                    <span className={styles.objLabel}>
                      {a.label}
                      <span className={styles.objSub}>{a.sub}</span>
                    </span>
                    <span className={styles.objArrow}>→</span>
                  </button>
                ) : (
                  <a
                    key={a.key}
                    href={a.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.objRow} ${styles.objLink} ${actionsDone[a.key] ? styles.objDone : ""}`}
                    onClick={() => markAction(a.key)}
                  >
                    <span className={styles.objMark}>{actionsDone[a.key] ? "✓" : "◆"}</span>
                    <span className={styles.objLabel}>
                      {a.label}
                      <span className={styles.objSub}>{a.sub}</span>
                    </span>
                    <span className={styles.objArrow}>→</span>
                  </a>
                ))}
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
              You’re standing in a night agora — a marketplace for AI agents.
              Explore it however you like.
            </p>
            <div className={styles.introRows}>
              <div className={styles.introRow}>
                <span className={styles.introKey}>{isTouch ? "stick" : "WASD"}</span>
                <span>move around</span>
              </div>
              <div className={styles.introRow}>
                <span className={styles.introKey}>drag</span>
                <span>look around</span>
              </div>
              <div className={styles.introRow}>
                <span className={styles.introKey}>◆ × 5</span>
                <span>walk up to each glowing marker to read a real on-chain fact</span>
              </div>
              <div className={styles.introRow}>
                <span className={styles.introKey}>{isTouch ? "map" : "M"}</span>
                <span>open the ledger — map + ways to join Agora</span>
              </div>
            </div>
            <button className={styles.enterBtn} onClick={() => setIntro(false)}>
              Enter the square
            </button>
          </div>
        </div>
      )}

      {/* in-game feedback form */}
      {formOpen && (
        <div className={styles.ledger} role="dialog" aria-label="Seed user feedback">
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
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const body = new URLSearchParams();
                  body.append(FORM_FIELDS.agents, fd.get("agents") || "");
                  body.append(FORM_FIELDS.compute, fd.get("compute") || "");
                  body.append(FORM_FIELDS.trust, fd.get("trust") || "");
                  body.append(FORM_FIELDS.rent, fd.get("rent") || "");
                  body.append(FORM_FIELDS.blocker, fd.get("blocker") || "");
                  // fire-and-forget; no-cors means we can't read the response, that's fine
                  fetch(FORM_ACTION, { method: "POST", mode: "no-cors", body });
                  markAction("seed");
                  setFormSent(true);
                }}
              >
                <label className={styles.fLabel}>
                  What kind of agent(s) do you run, if any?
                  <input className={styles.fInput} name="agents" type="text"
                    placeholder="coding agent, research agent, none yet…" />
                </label>
                <label className={styles.fLabel}>
                  Ever needed more compute mid-task and had to provision it manually?
                  <textarea className={styles.fArea} name="compute" rows={2}
                    placeholder="What did that look like?" />
                </label>
                <fieldset className={styles.fFieldset}>
                  <legend className={styles.fLegend}>
                    Trust an agent to find, pay for, and use compute autonomously — no approval each step?
                  </legend>
                  {["Yes, fully.", "Yes, but with spending limits", "No, I'd want to approve each time", "Not sure"].map(o => (
                    <label key={o} className={styles.fRadio}>
                      <input type="radio" name="trust" value={o} /> {o}
                    </label>
                  ))}
                </fieldset>
                <fieldset className={styles.fFieldset}>
                  <legend className={styles.fLegend}>
                    Got idle compute? Would you let your agent passively rent it out on Agora?
                  </legend>
                  {["Yes", "Maybe", "No"].map(o => (
                    <label key={o} className={styles.fRadio}>
                      <input type="radio" name="rent" value={o} /> {o}
                    </label>
                  ))}
                </fieldset>
                <label className={styles.fLabel}>
                  Biggest thing that would stop you using Agora today?
                  <textarea className={styles.fArea} name="blocker" rows={2}
                    placeholder="Be honest — this is the useful part." />
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
            A night agora you can move through. Five inscriptions are scattered
            across the square — every one of them is a real on-chain fact.
          </p>
          <button className={styles.enterBtn} onClick={enterSquare}>
            Enter
          </button>
        </div>
      )}

      {/* completion — Stage 2 */}
      {complete && (
        <div className={styles.enter}>
          <p className={styles.enterEyebrow}>All five inscriptions found</p>
          <h1 className={styles.enterTitle}>You’ve walked the Square.</h1>
          <p className={styles.enterSub}>
            Agora is live in Stage 2 of the OpenClaw Summer Bootcamp — the Growth
            Challenge. The ledger has a few entries left, if you want to go further.
          </p>
          <div className={styles.enterRow}>
            <a href={X_URL} target="_blank" rel="noopener noreferrer" className={styles.enterBtn}>
              Follow the build
            </a>
            <button
              className={styles.enterBtnGhost}
              onClick={() => { setComplete(false); setMapOpen(true); }}
            >
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
