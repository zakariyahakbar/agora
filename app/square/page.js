"use client";

/* ══════════════════════════════════════════
   AGORA — THE SQUARE
   A walkable night agora. Every inscription
   is a real on-chain fact.
   Desktop: WASD / arrows + drag to look
   Mobile:  left joystick + drag to look
══════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import styles from "./page.module.css";

/* ── Real facts shown as stall inscriptions ── */
const PLACARDS = [
  {
    key: "identity",
    eyebrow: "Identity",
    line: "ERC-8004 · Agent #82",
    body: "Registered on GOAT mainnet. Owner and creator verified on-chain.",
  },
  {
    key: "settlement",
    eyebrow: "Settlement",
    line: "x402 · 1 USDC.e settled",
    body: "0xa8747b…3460 — a real payment, confirmed and gateway-verified.",
  },
  {
    key: "network",
    eyebrow: "Network",
    line: "GOAT · Chain 2345",
    body: "Bitcoin-secured L2. Mainnet — not a testnet demo.",
  },
  {
    key: "name",
    eyebrow: "The name",
    line: "ἀγορά — “open marketplace”",
    body: "The Greek square where trade happened. Rebuilt for machines.",
  },
  {
    key: "agora",
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
  const [hintGone, setHintGone] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [webglFail, setWebglFail] = useState(false);

  useEffect(() => {
    enteredRef.current = entered;
    if (entered) {
      const t = setTimeout(() => setHintGone(true), 6500);
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
    renderer.toneMappingExposure = 1.12;
    if (!coarse) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    wrap.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";

    /* ── Scene / camera ── */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060509);
    scene.fog = new THREE.FogExp2(0x08070c, 0.028);

    const camera = new THREE.PerspectiveCamera(
      68, wrap.clientWidth / wrap.clientHeight, 0.1, 300
    );
    const pitchObj = new THREE.Object3D();
    pitchObj.add(camera);
    const yawObj = new THREE.Object3D();
    yawObj.position.set(0, 1.7, 19);
    yawObj.add(pitchObj);
    scene.add(yawObj);

    /* ── Lights ── */
    scene.add(new THREE.HemisphereLight(0x2a3350, 0x0a0806, 0.55));
    const moonLight = new THREE.DirectionalLight(0x8fa0c8, 0.4);
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
    gCan.width = gCan.height = 512;
    const g = gCan.getContext("2d");
    g.fillStyle = "#0c0b10";
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = "rgba(216,210,198,0.05)";
    g.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 512); g.stroke();
      g.beginPath(); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke();
    }
    for (let i = 0; i < 520; i++) {
      g.fillStyle = `rgba(220,214,200,${0.015 + Math.random() * 0.035})`;
      g.fillRect(Math.random() * 512, Math.random() * 512, 1.6, 1.6);
    }
    const groundTex = new THREE.CanvasTexture(gCan);
    groundTex.colorSpace = THREE.SRGBColorSpace;
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(11, 11);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(70, 64),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.94, metalness: 0.02 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    /* ── Stars + moon ── */
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const r = 90 + Math.random() * 60;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(0.15 + Math.random() * 0.8);
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) + 4;
      starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xbfc6dd, size: 0.7, transparent: true, opacity: 0.85 })
    ));
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xcdd4e6 })
    );
    moon.position.set(-62, 34, -84);
    scene.add(moon);

    /* ── Materials ── */
    const marble = new THREE.MeshStandardMaterial({ color: 0xb9b4a8, roughness: 0.62, metalness: 0.05 });
    const darkStone = new THREE.MeshStandardMaterial({ color: 0x24221f, roughness: 0.9 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.85 });

    const colliders = []; // { x, z, r }

    /* ── Colonnade — 12 columns, radius 14 ── */
    const colGroup = new THREE.Group();
    const shaftGeo = new THREE.CylinderGeometry(0.4, 0.48, 4.2, 18);
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
      const shaft = new THREE.Mesh(shaftGeo, marble); shaft.position.y = 0.32 + 2.1;
      const cap = new THREE.Mesh(capGeo, marble); cap.position.y = 0.32 + 4.2 + 0.13;
      const aba = new THREE.Mesh(abacusGeo, marble); aba.position.y = 0.32 + 4.2 + 0.26 + 0.08;
      [base, shaft, cap, aba].forEach(m => { m.castShadow = !coarse; m.receiveShadow = true; col.add(m); });
      col.position.set(x, 0, z);
      colGroup.add(col);
      colliders.push({ x, z, r: 1.0 });
    }
    scene.add(colGroup);

    /* ── Torches on alternating columns ── */
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff7a1a, emissive: 0xff8c2a, emissiveIntensity: 2.6, roughness: 0.4,
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
      const light = new THREE.PointLight(0xff8c2a, 16, 12, 2);
      light.position.set(inX, 3.5, inZ);
      scene.add(light);
      torchLights.push({ light, flame, seed: Math.random() * 100 });
    }

    /* ── Awning stripe texture ── */
    const sCan = document.createElement("canvas");
    sCan.width = 256; sCan.height = 64;
    const s = sCan.getContext("2d");
    for (let i = 0; i < 8; i++) {
      s.fillStyle = i % 2 ? "#b4581a" : "#d9d3c7";
      s.fillRect(i * 32, 0, 32, 64);
    }
    s.fillStyle = "rgba(0,0,0,0.28)";
    s.fillRect(0, 0, 256, 64);
    const stripeTex = new THREE.CanvasTexture(sCan);
    stripeTex.colorSpace = THREE.SRGBColorSpace;
    const awningMat = new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.8, side: THREE.DoubleSide });

    /* ── Stalls at N / E / S / W, radius 8.5 ── */
    const stallAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    const stallWorld = [];
    stallAngles.forEach((a, idx) => {
      const x = Math.cos(a) * 8.5, z = Math.sin(a) * 8.5;
      stallWorld.push(new THREE.Vector3(x, 0, z));
      const gp = new THREE.Group();
      // posts
      const postGeo = new THREE.CylinderGeometry(0.07, 0.08, 2.3, 8);
      [[-1.15, -0.8], [1.15, -0.8], [-1.15, 0.8], [1.15, 0.8]].forEach(([px, pz]) => {
        const p = new THREE.Mesh(postGeo, wood);
        p.position.set(px, 1.15, pz);
        p.castShadow = !coarse;
        gp.add(p);
      });
      // counter
      const counter = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.72, 0.85), darkStone);
      counter.position.set(0, 0.36, 0.35);
      counter.castShadow = !coarse; counter.receiveShadow = true;
      gp.add(counter);
      // awning
      const awn = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.05, 2.0), awningMat);
      awn.position.set(0, 2.36, 0);
      awn.rotation.x = -0.14;
      awn.castShadow = !coarse;
      gp.add(awn);
      // warm stall light
      const sl = new THREE.PointLight(0xffa04a, 7, 8, 2);
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
    const coreLight = new THREE.PointLight(0xff9a3c, 10, 12, 2);
    coreLight.position.y = 1.8;
    scene.add(coreLight);
    colliders.push({ x: 0, z: 0, r: 1.8 });

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
          color: def.color, emissive: def.color, emissiveIntensity: 2.6, roughness: 0.35,
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

    /* ── Bloom (desktop) ── */
    let composer = null;
    if (!coarse) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(wrap.clientWidth, wrap.clientHeight), 0.55, 0.65, 0.82
      );
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    }

    /* ── Input state ── */
    const keys = {};
    const joy = { x: 0, y: 0, id: null };
    let lookId = null, lastX = 0, lastY = 0;
    let yaw = 0, pitch = -0.06;

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
      yaw -= (e.clientX - lastX) * 0.0034;
      pitch -= (e.clientY - lastY) * 0.0028;
      pitch = Math.max(-0.58, Math.min(0.5, pitch));
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

    /* ── Proximity placards ── */
    const placardSpots = [
      ...stallWorld.map((v, i) => ({ x: v.x, z: v.z, idx: i })),
      { x: 0, z: 0, idx: 4 },
    ];
    let currentPlacard = -1;

    /* ── Main loop ── */
    const clock = new THREE.Clock();
    const fwd = new THREE.Vector3();
    let raf = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (hidden) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      /* movement */
      if (enteredRef.current) {
        let mx = 0, mz = 0;
        if (keys["w"] || keys["arrowup"]) mz -= 1;
        if (keys["s"] || keys["arrowdown"]) mz += 1;
        if (keys["a"] || keys["arrowleft"]) mx -= 1;
        if (keys["d"] || keys["arrowright"]) mx += 1;
        mx += joy.x; mz += joy.y;
        const mlen = Math.hypot(mx, mz);
        if (mlen > 0.01) {
          mx /= Math.max(mlen, 1); mz /= Math.max(mlen, 1);
          const speed = keys["shift"] ? 7 : 4.3;
          const sin = Math.sin(yaw), cos = Math.cos(yaw);
          yawObj.position.x += (mx * cos - mz * sin) * speed * dt;
          yawObj.position.z += (mz * cos + mx * sin) * speed * dt;
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
      yawObj.rotation.y = yaw;
      pitchObj.rotation.x = pitch;

      /* torch flicker */
      for (const tl of torchLights) {
        const f = 0.8 + 0.2 * Math.sin(t * 11 + tl.seed) * Math.sin(t * 5.7 + tl.seed * 2);
        tl.light.intensity = 16 * f;
        tl.flame.scale.setScalar(0.9 + 0.18 * Math.sin(t * 13 + tl.seed));
      }

      /* beacon pulse */
      core.material.emissiveIntensity = 2.8 + Math.sin(t * 1.6) * 0.7;
      beam.material.opacity = 0.11 + Math.sin(t * 1.6) * 0.03;

      /* agent orbs */
      const orbSpeed = reduceMotion ? 0.3 : 1;
      for (const o of orbs) {
        const u = ((t * orbSpeed) / o.period + o.phase) % 1;
        const pos = o.curve.getPointAt(u);
        pos.y += Math.sin(t * 2 + o.phase * 9) * 0.08;
        o.mesh.position.copy(pos);
        if (o.light) o.light.position.copy(pos);
      }

      /* placard proximity */
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
        }
      }

      composer ? composer.render() : renderer.render(scene, camera);
      fwd.set(0, 0, 0); // noop keep ref
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

  return (
    <div className={styles.root}>
      <div ref={wrapRef} className={styles.canvasWrap} />

      {/* top chrome */}
      <a href="/" className={styles.backPill}>← agora</a>
      <div className={styles.chainPill}><span className={styles.dot} />GOAT · Chain 2345</div>

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
        {isTouch ? "left stick — walk · drag — look" : "W A S D — walk · drag — look · shift — run"}
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
            A night agora you can move through. Every inscription in this square
            is a real on-chain fact.
          </p>
          <button className={styles.enterBtn} onClick={() => setEntered(true)}>
            Enter
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
