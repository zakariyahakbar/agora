"use client";

/* ══════════════════════════════════════════
   AGORA — THE SQUARE (v2)
   A walkable night agora. Find all five
   inscriptions — each one a real on-chain fact.
   Desktop: WASD / arrows + drag · shift to run
   Mobile:  left joystick + drag to look
══════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import styles from "./page.module.css";

const TELEGRAM_URL = "https://web.telegram.org/k/#@agoraa_bot";
const X_URL = "https://x.com/usingagora";

/* ── Real facts shown as stall inscriptions ── */
const PLACARDS = [
  {
    eyebrow: "Identity",
    line: "ERC-8004 · Agent #82",
    body: "Registered on GOAT mainnet. Owner and creator verified on-chain.",
  },
  {
    eyebrow: "Settlement",
    line: "x402 · 1 USDC.e settled",
    body: "0xa8747b…3460 — a real payment, confirmed and gateway-verified.",
  },
  {
    eyebrow: "Network",
    line: "GOAT · Chain 2345",
    body: "Bitcoin-secured L2. Mainnet — not a testnet demo.",
  },
  {
    eyebrow: "The name",
    line: "ἀγορά — “open marketplace”",
    body: "The Greek square where trade happened. Rebuilt for machines.",
  },
  {
    eyebrow: "Agora",
    line: "The marketplace machines built for machines.",
    body: "One agent. Autonomous bids. Zero human approvals.",
  },
];

export default function SquarePage() {
  const wrapRef = useRef(null);
  const joyRef = useRef(null);
  const knobRef = useRef(null);
  const [entered, setEntered] = useState(false);
  const enteredRef = useRef(false);
  const [placard, setPlacard] = useState(-1);
  const [visited, setVisited] = useState([false, false, false, false, false]);
  const visitedRef = useRef([false, false, false, false, false]);
  const [complete, setComplete] = useState(false);
  const completeShownRef = useRef(false);
  const [hintGone, setHintGone] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [webglFail, setWebglFail] = useState(false);

  useEffect(() => {
    enteredRef.current = entered;
    if (entered) {
      const t = setTimeout(() => setHintGone(true), 7000);
      return () => clearTimeout(t);
    }
  }, [entered]);

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

    const camera = new THREE.PerspectiveCamera(
      68, wrap.clientWidth / wrap.clientHeight, 0.1, 320
    );
    const pitchObj = new THREE.Object3D();
    pitchObj.add(camera);
    const yawObj = new THREE.Object3D();
    yawObj.position.set(0, 1.7, 19);
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

    /* ── Ground (procedural stone tiles) ── */
    const gCan = document.createElement("canvas");
    gCan.width = gCan.height = 1024;
    const g = gCan.getContext("2d");
    g.fillStyle = "#0c0b10";
    g.fillRect(0, 0, 1024, 1024);
    // tile grid with per-tile tonal variation
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
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.9, metalness: 0.03 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    /* mosaic ring around the plinth */
    const mosaic = new THREE.Mesh(
      new THREE.RingGeometry(1.7, 2.5, 48),
      new THREE.MeshStandardMaterial({ color: 0x191510, roughness: 0.8 })
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

    /* ── Stars, moon, halo ── */
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
    scene.add(new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xc3cade, size: 0.75, transparent: true, opacity: 0.85 })
    ));

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xd6dcec })
    );
    moon.position.set(-62, 34, -84);
    scene.add(moon);
    const haloCan = document.createElement("canvas");
    haloCan.width = haloCan.height = 128;
    const hg = haloCan.getContext("2d");
    const grad = hg.createRadialGradient(64, 64, 6, 64, 64, 64);
    grad.addColorStop(0, "rgba(200,210,240,0.55)");
    grad.addColorStop(0.4, "rgba(160,175,220,0.16)");
    grad.addColorStop(1, "rgba(160,175,220,0)");
    hg.fillStyle = grad;
    hg.fillRect(0, 0, 128, 128);
    const haloTex = new THREE.CanvasTexture(haloCan);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    halo.scale.setScalar(22);
    halo.position.copy(moon.position);
    scene.add(halo);

    /* ── Horizon cypress silhouettes ── */
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
    // fluting bump for column shafts
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
    const marble = new THREE.MeshStandardMaterial({ color: 0xbcb7ab, roughness: 0.58, metalness: 0.05 });
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0xbcb7ab, roughness: 0.58, metalness: 0.05,
      bumpMap: fluteTex, bumpScale: 0.9,
    });
    const darkStone = new THREE.MeshStandardMaterial({ color: 0x24221f, roughness: 0.9 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.85 });
    const clay = new THREE.MeshStandardMaterial({ color: 0x7a4a28, roughness: 0.75 });

    const colliders = []; // { x, z, r }

    /* ── Striped awning texture ── */
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
    const awningMat = new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.8, side: THREE.DoubleSide });

    /* ── Colonnade — 12 columns, radius 14 ── */
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

    /* ── Torches on alternating columns ── */
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff7a1a, emissive: 0xff8c2a, emissiveIntensity: 2.8, roughness: 0.4,
    });
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
      torchLights.push({ light, flame, seed: Math.random() * 100 });
    }

    /* ── Hanging banners on non-torch columns (CPU wave) ── */
    const banners = [];
    const bannerCols = coarse ? [1, 7] : [1, 3, 7, 9];
    for (const ci of bannerCols) {
      const [x, z, a] = columnXZ[ci];
      const geo = new THREE.PlaneGeometry(0.72, 1.7, 6, 8);
      const mesh = new THREE.Mesh(geo, awningMat);
      const inX = x - Math.cos(a) * 0.62, inZ = z - Math.sin(a) * 0.62;
      mesh.position.set(inX, 3.35, inZ);
      mesh.rotation.y = -a + Math.PI / 2;
      mesh.castShadow = false;
      scene.add(mesh);
      banners.push({ mesh, base: geo.attributes.position.array.slice(), seed: Math.random() * 10 });
    }

    /* ── Stalls at N / E / S / W, radius 8.5 ── */
    const stallAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    const stallWorld = [];
    stallAngles.forEach((a) => {
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
      /* props: amphorae + crate */
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

    /* ── Central plinth + beacon ── */
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

    /* ── Drifting embers ── */
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
      emberSeed[i * 2] = 0.25 + Math.random() * 0.55;   // rise speed
      emberSeed[i * 2 + 1] = Math.random() * 100;        // phase
    }
    emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
    const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({
      color: 0xffa04a, size: 0.075, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(embers);

    /* ── Agent orbs drifting between stalls ── */
    const orbDefs = [
      { color: 0xff8c2a, period: 36, phase: 0.0, order: [0, 1, 2, 3] },
      { color: 0xff8c2a, period: 47, phase: 0.4, order: [2, 0, 3, 1] },
      { color: 0x2ed573, period: 41, phase: 0.72, order: [1, 3, 0, 2] },
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
      if (!coarse) {
        light = new THREE.PointLight(def.color, 3, 5, 2);
        scene.add(light);
      }
      return { ...def, curve, mesh, light };
    });

    /* ── Objective markers above unvisited inscriptions ── */
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

    /* ── Bloom (desktop) ── */
    let composer = null;
    if (!coarse) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(wrap.clientWidth, wrap.clientHeight), 0.68, 0.7, 0.8
      );
      composer.addPass(bloom);
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
    const onJoyDown = e => {
      joy.id = e.pointerId;
      joyEl.setPointerCapture(e.pointerId);
    };
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

    /* ── Resize / visibility ── */
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

    /* ── Main loop ── */
    const clock = new THREE.Clock();
    const vel = new THREE.Vector2(0, 0);
    let bobPhase = 0;
    let currentPlacard = -1;
    let raf = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (hidden) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      /* smoothed look */
      const lookK = Math.min(1, dt * 14);
      yaw += (targetYaw - yaw) * lookK;
      pitch += (targetPitch - pitch) * lookK;
      yawObj.rotation.y = yaw;
      pitchObj.rotation.x = pitch;

      /* movement — velocity-smoothed, correct yaw rotation */
      let running = false;
      if (enteredRef.current) {
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
        /* rotate input by yaw: world = Ry(yaw) · local */
        const cos = Math.cos(yaw), sin = Math.sin(yaw);
        const wx = (mx * cos + mz * sin) * speed;
        const wz = (-mx * sin + mz * cos) * speed;
        const accelK = Math.min(1, dt * 9);
        vel.x += (wx - vel.x) * accelK;
        vel.y += (wz - vel.y) * accelK;
        yawObj.position.x += vel.x * dt;
        yawObj.position.z += vel.y * dt;

        /* head bob */
        const moving = Math.hypot(vel.x, vel.y) > 0.4;
        if (moving && !reduceMotion) {
          bobPhase += dt * (running ? 11 : 8);
          camera.position.y = Math.sin(bobPhase) * 0.038;
          camera.position.x = Math.cos(bobPhase * 0.5) * 0.02;
        } else {
          camera.position.y += (0 - camera.position.y) * Math.min(1, dt * 6);
          camera.position.x += (0 - camera.position.x) * Math.min(1, dt * 6);
        }

        /* FOV run kick */
        const targetFov = running && moving && !reduceMotion ? 74 : 68;
        if (Math.abs(camera.fov - targetFov) > 0.05) {
          camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 6);
          camera.updateProjectionMatrix();
        }

        /* bounds + collisions */
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

      /* torch flicker */
      for (const tl of torchLights) {
        const fl = 0.8 + 0.2 * Math.sin(t * 11 + tl.seed) * Math.sin(t * 5.7 + tl.seed * 2);
        tl.light.intensity = 17 * fl;
        tl.flame.scale.setScalar(0.9 + 0.18 * Math.sin(t * 13 + tl.seed));
      }

      /* beacon pulse */
      core.material.emissiveIntensity = 2.8 + Math.sin(t * 1.6) * 0.7;
      beam.material.opacity = 0.11 + Math.sin(t * 1.6) * 0.03;
      mosaicGlow.material.emissiveIntensity = 0.45 + Math.sin(t * 1.6) * 0.18;

      /* banners wave */
      for (const b of banners) {
        const attr = b.mesh.geometry.attributes.position;
        const arr = attr.array, base = b.base;
        for (let i = 0; i < arr.length; i += 3) {
          const y = base[i + 1];
          const hang = (0.85 - y) / 1.7; // 0 at top, 1 at bottom
          arr[i + 2] = Math.sin(t * 2.1 + b.seed + y * 3.2) * 0.085 * Math.max(0, hang);
        }
        attr.needsUpdate = true;
      }

      /* embers drift */
      {
        const arr = emberGeo.attributes.position.array;
        for (let i = 0; i < emberCount; i++) {
          arr[i * 3 + 1] += emberSeed[i * 2] * dt;
          arr[i * 3] += Math.sin(t * 0.7 + emberSeed[i * 2 + 1]) * dt * 0.18;
          if (arr[i * 3 + 1] > 6.5) arr[i * 3 + 1] = 0.1;
        }
        emberGeo.attributes.position.needsUpdate = true;
      }

      /* agent orbs */
      const orbSpeed = reduceMotion ? 0.3 : 1;
      for (const o of orbs) {
        const u = ((t * orbSpeed) / o.period + o.phase) % 1;
        const pos = o.curve.getPointAt(u);
        pos.y += Math.sin(t * 2 + o.phase * 9) * 0.08;
        o.mesh.position.copy(pos);
        if (o.light) o.light.position.copy(pos);
      }

      /* objective markers spin + bob, hide when visited */
      markers.forEach((m, i) => {
        const done = visitedRef.current[placardSpots[i].idx];
        m.visible = !done;
        if (!done) {
          m.rotation.y = t * 1.6;
          m.position.y = (placardSpots[i].idx === 4 ? 3.2 : 2.9) + Math.sin(t * 2.2 + i) * 0.1;
        }
      });

      /* placard proximity + visit tracking */
      if (enteredRef.current) {
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
      composer?.dispose?.();
      renderer.dispose();
      if (renderer.domElement.parentNode === wrap) wrap.removeChild(renderer.domElement);
    };
  }, []);

  const card = placard >= 0 ? PLACARDS[placard] : null;
  const foundCount = visited.filter(Boolean).length;

  return (
    <div className={styles.root}>
      <div ref={wrapRef} className={styles.canvasWrap} />
      <div className={styles.vignette} aria-hidden />

      {/* top chrome */}
      <a href="/" className={styles.backPill}>← agora</a>
      <div className={styles.chainPill}><span className={styles.dot} />GOAT · Chain 2345</div>

      {/* objective progress */}
      <div className={`${styles.progress} ${entered ? styles.progressOn : ""}`}>
        <span className={styles.progressDiamond}>◆</span>
        inscriptions {foundCount} / 5
      </div>

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
          ? "left stick — walk · drag — look · find the 5 markers"
          : "W A S D — walk · drag — look · shift — run · find the 5 markers"}
      </div>

      {/* mobile joystick */}
      <div ref={joyRef} className={`${styles.joystick} ${isTouch && entered ? styles.joyOn : ""}`}>
        <div ref={knobRef} className={styles.knob} />
      </div>

      {/* enter overlay */}
      {!entered && !webglFail && (
        <div className={styles.enter}>
          <p className={styles.enterEyebrow}>Agora · The Square</p>
          <h1 className={styles.enterTitle}>Walk the marketplace.</h1>
          <p className={styles.enterSub}>
            A night agora you can move through. Five inscriptions are scattered
            across the square — every one of them is a real on-chain fact.
          </p>
          <button className={styles.enterBtn} onClick={() => setEntered(true)}>
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
            Challenge. The agent, the payments, the marketplace: built in the open.
          </p>
          <div className={styles.enterRow}>
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.enterBtn}
            >
              Follow the build
            </a>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.enterBtnGhost}
            >
              Talk to the agent
            </a>
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
