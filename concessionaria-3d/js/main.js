import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { MODELS, buildCar } from './cars.js';

const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const isTouch = matchMedia('(hover: none)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const loaderBar = $('#loader .bar i');
const loaderPct = $('#loader .pct');
const setProgress = (p) => {
  loaderBar.style.transform = `scaleX(${p})`;
  loaderPct.textContent = String(Math.round(p * 100)).padStart(3, '0');
};
const tick = () => new Promise((r) => requestAnimationFrame(() => r()));

// ======================= RENDERER / CENA =======================
const canvas = $('#webgl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
const DPR = Math.min(devicePixelRatio, innerWidth < 800 ? 1.5 : 2);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const BG = new THREE.Color(0x06070b);
const scene = new THREE.Scene();
scene.background = BG;
scene.fog = new THREE.Fog(BG, 14, 34);

const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 100);
camera.position.set(6, 2, 7);

// ---------- ambiente de estúdio (reflexos de softbox na pintura) ----------
function buildEnvironment() {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x020203);
  const box = (w, h, x, y, z, rx, ry, intensity, tint = [1, 1, 1]) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(tint[0] * intensity, tint[1] * intensity, tint[2] * intensity), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, 0);
    env.add(mesh);
  };
  // softbox principal no teto
  box(10, 3, 0, 8, 0, Math.PI / 2, 0, 3.2);
  // faixas laterais
  for (const z of [-7, 7]) box(14, 0.6, 0, 3, z, 0, 0, 5);
  for (const z of [-7, 7]) box(14, 0.25, 0, 5, z, 0, 0, 3);
  // contraluz traseira e dianteira
  box(4, 5, -9, 3, 0, 0, Math.PI / 2, 1.6, [1, 0.85, 0.6]);
  box(4, 5, 9, 3, 0, 0, -Math.PI / 2, 1.2, [0.7, 0.85, 1]);
  // piso escuro
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: 0x0a0a0c }));
  floor.rotation.x = -Math.PI / 2;
  env.add(floor);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.03).texture;
  pmrem.dispose();
  return tex;
}

// ---------- texturas auxiliares ----------
function radialTexture(stops, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  return t;
}

function scannerTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = 'rgba(255,255,255,1)';
  g.lineWidth = 6;
  g.shadowColor = '#fff';
  g.shadowBlur = 18;
  g.strokeRect(10, 10, 492, 236);
  g.lineWidth = 2;
  g.globalAlpha = 0.35;
  for (let x = 30; x < 500; x += 24) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x, 246); g.stroke(); }
  return new THREE.CanvasTexture(c);
}

// ======================= OBJETOS DA CENA =======================
const stage = new THREE.Group(); // move lateralmente
const turntable = new THREE.Group(); // gira
scene.add(stage);
stage.add(turntable);

let floorGrid, ringMat, lightPool, dust, speedLines, scanner, scanLight, contactShadow;
const speedData = [];

function buildStage() {
  // piso espelhado
  const reflector = new Reflector(new THREE.PlaneGeometry(80, 80), {
    textureWidth: Math.floor(innerWidth * DPR * 0.6),
    textureHeight: Math.floor(innerHeight * DPR * 0.6),
    color: 0x9a9a9a,
  });
  reflector.rotation.x = -Math.PI / 2;
  scene.add(reflector);

  // véu escuro sobre o espelho: reflexo suave que some na distância
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshBasicMaterial({
      color: BG,
      transparent: true,
      alphaMap: radialTexture([[0, '#a8a8a8'], [0.12, '#c4c4c4'], [0.35, '#f2f2f2'], [0.6, '#ffffff']]),
      depthWrite: false,
    })
  );
  veil.rotation.x = -Math.PI / 2;
  veil.position.y = 0.002;
  scene.add(veil);

  // grade luminosa procedural
  floorGrid = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.ShaderMaterial({
      uniforms: { uOffset: { value: 0 }, uColor: { value: new THREE.Color(1.0, 0.72, 0.35) }, uOpacity: { value: 0.22 } },
      vertexShader: `varying vec3 vPos; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform float uOffset; uniform vec3 uColor; uniform float uOpacity; varying vec3 vPos;
        void main(){
          vec2 p = vPos.xz * 0.8; p.x += uOffset;
          vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
          float line = 1.0 - min(min(g.x, g.y), 1.0);
          float d = length(vPos.xz);
          float fade = smoothstep(13.0, 3.0, d) * smoothstep(1.2, 3.2, d);
          float a = line * fade * uOpacity;
          gl_FragColor = vec4(uColor * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  floorGrid.rotation.x = -Math.PI / 2;
  floorGrid.position.y = 0.004;
  scene.add(floorGrid);

  // sombra real + sombra de contato
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.45 }));
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.006;
  shadowPlane.receiveShadow = true;
  turntable.add(shadowPlane);

  contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.2, 3.2),
    new THREE.MeshBasicMaterial({ map: radialTexture([[0, 'rgba(0,0,0,0.9)'], [0.55, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.008;
  turntable.add(contactShadow);

  // anel de luz no piso
  ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.5, 0.7), transparent: true, opacity: 0.9 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.55, 3.585, 128), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  stage.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(3.75, 3.76, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.75, 0.4), transparent: true, opacity: 0.25 }));
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.01;
  stage.add(ring2);

  // poça de luz dos faróis
  lightPool = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 3.4),
    new THREE.MeshBasicMaterial({ map: radialTexture([[0, 'rgba(255,240,220,0.7)'], [0.5, 'rgba(255,230,200,0.18)'], [1, 'rgba(0,0,0,0)']]), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  lightPool.rotation.x = -Math.PI / 2;
  lightPool.position.set(5.2, 0.012, 0);
  turntable.add(lightPool);

  // barras de luz de estúdio
  const barMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.4) });
  for (const z of [-1.6, 0, 1.6]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(9, 0.04, 0.16), barMat);
    bar.position.set(0, 6.2, z);
    stage.add(bar);
  }

  // luzes (apenas para sombra e recorte)
  scene.add(new THREE.HemisphereLight(0x8899aa, 0x080808, 0.4));
  const key = new THREE.SpotLight(0xffffff, 120, 30, 0.55, 0.9, 1.6);
  key.position.set(1.5, 9, 2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd7a0, 1.4);
  rim.position.set(-6, 3, -4);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0x9fc4ff, 0.8);
  fill.position.set(6, 2, 5);
  scene.add(fill);

  // poeira suspensa
  const N = innerWidth < 800 ? 350 : 800;
  const pos = new Float32Array(N * 3);
  const seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 4.5;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.random() * 7;
    pos[i * 3 + 2] = Math.sin(a) * r;
    seeds[i] = Math.random();
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dg.userData.seeds = seeds;
  dust = new THREE.Points(dg, new THREE.PointsMaterial({
    size: 0.025,
    map: radialTexture([[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']], 64),
    color: new THREE.Color(1.4, 1.2, 0.95),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  scene.add(dust);

  // linhas de velocidade (modo sport)
  const SL = 60;
  speedLines = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.006, 0.006),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.3, 0.9), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    SL
  );
  for (let i = 0; i < SL; i++) {
    let z = (Math.random() - 0.5) * 12;
    if (Math.abs(z) < 1.4) z += Math.sign(z || 1) * 1.4;
    speedData.push({ x: (Math.random() - 0.5) * 30, y: 0.05 + Math.random() * 2.6, z, len: 1 + Math.random() * 4, v: 0.7 + Math.random() * 0.6 });
  }
  speedLines.frustumCulled = false;
  stage.add(speedLines);

  // scanner de materialização
  scanner = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 2.8),
    new THREE.MeshBasicMaterial({ map: scannerTexture(), color: new THREE.Color(2.4, 1.6, 0.7), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  scanner.rotation.x = -Math.PI / 2;
  turntable.add(scanner);
  scanLight = new THREE.PointLight(0xffb84d, 0, 6, 1.5);
  turntable.add(scanLight);
}

// ======================= PÓS-PROCESSAMENTO =======================
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: THREE.HalfFloatType, samples: DPR > 1 ? 2 : 4 }));
composer.setPixelRatio(DPR);
composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.55, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ======================= ESTADO =======================
const cars = [];
let current = null;
let currentIdx = 0;
let busy = false;
const state = {
  drive: 0, // 0..1
  lights: false,
  wheelSpeed: 0,
  spinOffset: 0,
  drag: 0,
  dragVel: 0,
  autoSpin: 0.12,
  pointer: new THREE.Vector2(),
  activeSection: 'hero',
  colorIdx: [0, 0, 0],
};

// ---------- materialização / desmaterialização ----------
function materialize(car, inOut = 'in') {
  const api = car.userData.api;
  const top = api.height + 0.05;
  return new Promise((resolve) => {
    const o = { h: inOut === 'in' ? -0.05 : top };
    const tl = gsap.timeline({ onComplete: resolve });
    api.holoMat.visible = true;
    if (inOut === 'in') {
      api.setClip(-0.05);
      tl.to(api.holoMat, { opacity: 0.12, duration: 0.45, ease: 'power2.out' });
    }
    tl.to(scanner.material, { opacity: 1, duration: 0.3 }, inOut === 'in' ? 0.2 : 0);
    tl.to(scanLight, { intensity: 14, duration: 0.3 }, '<');
    tl.to(o, {
      h: inOut === 'in' ? top : -0.05,
      duration: inOut === 'in' ? 1.7 : 1.0,
      ease: 'power2.inOut',
      onUpdate: () => {
        api.setClip(o.h);
        scanner.position.y = o.h;
        scanLight.position.y = o.h;
      },
    }, '<');
    if (inOut === 'out') tl.to(api.holoMat, { opacity: 0.12, duration: 0.25 }, 0);
    tl.to(scanner.material, { opacity: 0, duration: 0.35 });
    tl.to(scanLight, { intensity: 0, duration: 0.35 }, '<');
    tl.to(api.holoMat, { opacity: 0, duration: 0.5 }, '<');
    tl.add(() => { api.holoMat.visible = false; if (inOut === 'in') api.setClip(10); });
  });
}

async function selectModel(idx, { instant = false } = {}) {
  if (busy || (current && idx === currentIdx)) return;
  busy = true;
  const next = cars[idx];
  if (current) {
    if (state.lights) setLights(false, true);
    await materialize(current, 'out');
    turntable.remove(current);
  }
  currentIdx = idx;
  current = next;
  turntable.add(current);
  updateModelUI();
  if (instant) {
    current.userData.api.setClip(10);
  } else {
    await materialize(current, 'in');
  }
  if (state.lights) setLights(true, true);
  busy = false;
}

function setPaint(hex) {
  const mat = current.userData.api.materials.paint;
  const target = new THREE.Color(hex);
  const from = mat.color.clone();
  const o = { t: 0 };
  gsap.to(o, {
    t: 1,
    duration: 0.9,
    ease: 'power2.inOut',
    onUpdate: () => mat.color.copy(from).lerp(target, o.t),
  });
  // brilho percorrendo a lataria
  gsap.fromTo(mat, { clearcoatRoughness: 0.25 }, { clearcoatRoughness: 0.03, duration: 1.2 });
}

function setLights(on, silent = false) {
  if (!silent) state.lights = on;
  const api = current.userData.api;
  api.cones.forEach((c) => (c.visible = true));
  gsap.to(api.materials.head, { emissiveIntensity: on ? 5 : 2.2, duration: 0.4 });
  gsap.to(api.coneMat.uniforms.uOpacity, { value: on ? 0.12 : 0, duration: 0.6, onComplete: () => { if (!on) api.cones.forEach((c) => (c.visible = false)); } });
  gsap.to(lightPool.material, { opacity: on ? 0.55 : 0, duration: 0.6 });
  gsap.to(api.materials.tail, { emissiveIntensity: on ? 5 : 2.6, duration: 0.4 });
  // piscada de boas-vindas
  if (on) gsap.fromTo(api.materials.head, { emissiveIntensity: 0.2 }, { emissiveIntensity: 5, duration: 0.08, repeat: 3, yoyo: true });
}

function setDrive(on) {
  gsap.to(state, { drive: on ? 1 : 0, duration: on ? 1.4 : 1.8, ease: on ? 'power2.in' : 'power2.out' });
  gsap.to(bloom, { strength: on ? 0.65 : 0.55, duration: 1.2 });
  gsap.to(speedLines.material, { opacity: on ? 0.45 : 0, duration: 1 });
  gsap.to(floorGrid.material.uniforms.uOpacity, { value: on ? 0.45 : 0.22, duration: 1 });
}

// ======================= CÂMERA POR SEÇÃO =======================
const KEYS = {
  hero: { px: 7.4, py: 1.9, pz: 8.4, tx: 0, ty: 0.55, tz: 0, carX: 1.6, spin: 1 },
  showroom: { px: 0.6, py: 1.9, pz: 11.5, tx: 0, ty: 0.7, tz: 0, carX: -2.3, spin: 0 },
  design: { px: 6.2, py: 1.5, pz: 4.6, tx: 0.6, ty: 0.6, tz: 0, carX: 0.9, spin: 0 },
  performance: { px: -7.2, py: 1.5, pz: 6.2, tx: 0, ty: 0.6, tz: 0, carX: 2.0, spin: 0 },
  estoque: { px: 0.01, py: 14, pz: 4.5, tx: 0, ty: 0, tz: 0, carX: 0, spin: 0.35 },
  financiamento: { px: 8.4, py: 3.2, pz: -7.2, tx: 0, ty: 0.6, tz: 0, carX: -2.2, spin: 0 },
  contato: { px: -0.6, py: 2.4, pz: 13, tx: 0, ty: 0.7, tz: 0, carX: 2.2, spin: 0.6 },
};
const SECTIONS = Object.keys(KEYS);
const cam = { ...KEYS.hero };

function setupScroll() {
  SECTIONS.forEach((id, i) => {
    const el = document.getElementById(id);
    if (i > 0) {
      gsap.fromTo(cam, { ...KEYS[SECTIONS[i - 1]] }, {
        ...KEYS[id],
        ease: 'power1.inOut',
        immediateRender: false,
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 15%', scrub: true },
      });
    }
    ScrollTrigger.create({
      trigger: el,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => { if (self.isActive) setActiveSection(id); },
    });
  });

  // revelações de texto
  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 50, opacity: 0, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });
  $$('[data-stagger]').forEach((wrap) => {
    gsap.from(wrap.children, {
      y: 60, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.09,
      scrollTrigger: { trigger: wrap, start: 'top 85%' },
    });
  });

  // barra de progresso
  gsap.to('.progress i', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
  ScrollTrigger.create({ start: 80, onToggle: (s) => $('.nav').classList.toggle('scrolled', s.isActive) });
}

function setActiveSection(id) {
  state.activeSection = id;
  $$('.dots a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  $$('.nav-links a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  document.body.dataset.section = id;
  if (id === 'performance') animateStats();
}

// ======================= INTERAÇÃO =======================
function setupPointer() {
  let down = false;
  let lastX = 0;
  addEventListener('pointermove', (e) => {
    state.pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (down) {
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      state.dragVel = dx * 0.006;
      state.drag += state.dragVel;
    }
  });
  canvas.addEventListener('pointerdown', (e) => { down = true; lastX = e.clientX; document.body.classList.add('dragging'); });
  addEventListener('pointerup', () => { down = false; document.body.classList.remove('dragging'); });

  // cursor personalizado
  if (!isTouch) {
    const cur = $('#cursor');
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const xTo = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
    const yTo = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
    addEventListener('pointermove', (e) => { pos.x = e.clientX; pos.y = e.clientY; xTo(pos.x); yTo(pos.y); });
    document.addEventListener('pointerover', (e) => {
      const hit = e.target.closest('a, button, input, select, label, .swatch, .card');
      cur.classList.toggle('hover', !!hit);
    });
    // botões magnéticos
    $$('.magnetic').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4 });
      });
      btn.addEventListener('pointerleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }));
    });
  }

  // cartões com inclinação 3D
  $$('.tilt').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(card, { rotateY: x * 10, rotateX: -y * 10, duration: 0.5, transformPerspective: 900 });
      card.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
      card.style.setProperty('--my', `${(y + 0.5) * 100}%`);
    });
    card.addEventListener('pointerleave', () => gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.8, ease: 'power3.out' }));
  });
}

// ======================= UI =======================
function buildUI() {
  // abas de modelos
  const tabs = $('#model-tabs');
  MODELS.forEach((m, i) => {
    const b = document.createElement('button');
    b.className = 'tab';
    b.innerHTML = `<span>${String(i + 1).padStart(2, '0')}</span>${m.name}`;
    b.addEventListener('click', () => selectModel(i));
    tabs.appendChild(b);
  });
  $('#prev-model').addEventListener('click', () => selectModel((currentIdx + MODELS.length - 1) % MODELS.length));
  $('#next-model').addEventListener('click', () => selectModel((currentIdx + 1) % MODELS.length));

  $('#toggle-lights').addEventListener('change', (e) => setLights(e.target.checked));
  $('#toggle-drive').addEventListener('change', (e) => setDrive(e.target.checked));

  // simulador
  const fSel = $('#fin-model');
  MODELS.forEach((m, i) => fSel.add(new Option(`${m.name} — ${brl(m.price)}`, i)));
  ['#fin-model', '#fin-down', '#fin-months'].forEach((s) => $(s).addEventListener('input', updateFinance));

  const cSel = $('#c-model');
  MODELS.forEach((m) => cSel.add(new Option(m.name, m.name)));

  $('#contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#c-name').value.trim().split(' ')[0] || 'cliente';
    toast(`Obrigado, ${name}! Um consultor Aurum entrará em contato em breve.`);
    e.target.reset();
  });

  // menu mobile
  $('.burger').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  $$('.nav-links a').forEach((a) => a.addEventListener('click', () => document.body.classList.remove('menu-open')));

  // hotspots
  const hs = $('#hotspots');
  for (let i = 0; i < 4; i++) {
    const d = document.createElement('div');
    d.className = 'hotspot';
    d.innerHTML = `<button aria-label="Detalhe"><i></i></button><div class="tip"><b></b><p></p></div>`;
    d.querySelector('button').addEventListener('click', () => d.classList.toggle('open'));
    hs.appendChild(d);
  }
}

function updateModelUI() {
  const m = MODELS[currentIdx];
  $$('#model-tabs .tab').forEach((t, i) => t.classList.toggle('active', i === currentIdx));
  const swap = (sel, text) => {
    const el = $(sel);
    gsap.to(el, { opacity: 0, y: -12, duration: 0.25, onComplete: () => { el.textContent = text; gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }); } });
  };
  swap('#m-name', m.name);
  swap('#m-tag', `${m.tag} · ${m.year}`);
  swap('#m-desc', m.desc);
  swap('#m-price', brl(m.price));
  $('#perf-name').textContent = m.name;

  const sw = $('#swatches');
  sw.innerHTML = '';
  m.colors.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'swatch' + (i === state.colorIdx[currentIdx] ? ' active' : '');
    b.style.setProperty('--c', c.hex);
    b.title = c.name;
    b.setAttribute('aria-label', c.name);
    b.addEventListener('click', () => {
      state.colorIdx[currentIdx] = i;
      $$('.swatch', sw).forEach((x, j) => x.classList.toggle('active', j === i));
      $('#color-name').textContent = c.name;
      setPaint(c.hex);
    });
    sw.appendChild(b);
  });
  $('#color-name').textContent = m.colors[state.colorIdx[currentIdx]].name;

  // hotspots
  const api = current.userData.api;
  $$('.hotspot').forEach((h, i) => {
    h.querySelector('b').textContent = api.hotspots[i].title;
    h.querySelector('p').textContent = api.hotspots[i].text;
  });
  $('#fin-model').value = currentIdx;
  updateFinance();
  if (state.activeSection === 'performance') animateStats();
}

function animateStats() {
  const s = MODELS[currentIdx].specs;
  const max = { hp: 700, acc: 5, top: 350, torque: 90 };
  $$('.stat').forEach((el) => {
    const k = el.dataset.k;
    const target = s[k];
    const num = el.querySelector('.num');
    const o = { v: 0 };
    gsap.to(o, {
      v: target, duration: 1.6, ease: 'expo.out',
      onUpdate: () => (num.textContent = k === 'acc' ? o.v.toFixed(1).replace('.', ',') : Math.round(o.v)),
    });
    const pct = k === 'acc' ? (1 - (target - 2) / (max.acc - 1)) : target / max[k];
    gsap.fromTo(el.querySelector('.meter i'), { scaleX: 0 }, { scaleX: Math.max(0.1, Math.min(1, pct)), duration: 1.6, ease: 'expo.out' });
  });
}

function updateFinance() {
  const m = MODELS[+$('#fin-model').value];
  const downPct = +$('#fin-down').value / 100;
  const n = +$('#fin-months').value;
  const rate = 0.0129;
  const pv = m.price * (1 - downPct);
  const pmt = (pv * rate) / (1 - Math.pow(1 + rate, -n));
  $('#fin-down-out').textContent = `${Math.round(downPct * 100)}% · ${brl(m.price * downPct)}`;
  $('#fin-months-out').textContent = `${n} meses`;
  $('#fin-total').textContent = brl(pmt * n + m.price * downPct);
  const out = $('#fin-pmt');
  const o = { v: parseFloat(out.dataset.v || pmt) };
  out.dataset.v = pmt;
  gsap.to(o, { v: pmt, duration: 0.6, ease: 'power3.out', onUpdate: () => (out.textContent = brl(o.v)) });
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  gsap.timeline()
    .fromTo(t, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out' })
    .to(t, { y: 40, opacity: 0, duration: 0.5, delay: 3.4 });
}

// ---------- miniaturas do estoque renderizadas do próprio 3D ----------
function renderThumbnails() {
  const thumbScene = new THREE.Scene();
  thumbScene.environment = scene.environment;
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6);
  thumbScene.add(hemi);
  const shadow = contactShadow.clone();
  shadow.material = contactShadow.material.clone();
  thumbScene.add(shadow);
  const tcam = new THREE.PerspectiveCamera(26, 16 / 10, 0.1, 50);
  tcam.position.set(6.4, 2.2, 7.2);
  tcam.lookAt(0, 0.62, 0);
  const W = 640, H = 400;
  const prevBg = scene.background;

  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);

  const variants = [];
  MODELS.forEach((m, mi) => {
    [0, 2].forEach((ci, k) => variants.push({ mi, ci, used: k === 1 }));
  });
  const urls = variants.map(({ mi, ci }) => {
    const car = cars[mi];
    const parent = car.parent;
    const paint = car.userData.api.materials.paint;
    const prev = paint.color.clone();
    paint.color.set(MODELS[mi].colors[ci].hex);
    thumbScene.add(car);
    renderer.render(thumbScene, tcam);
    const url = renderer.domElement.toDataURL('image/png');
    paint.color.copy(prev);
    if (parent) parent.add(car); else thumbScene.remove(car);
    return url;
  });

  scene.background = prevBg;
  renderer.setPixelRatio(DPR);
  renderer.setSize(innerWidth, innerHeight);

  const grid = $('#stock-grid');
  variants.forEach((v, i) => {
    const m = MODELS[v.mi];
    const km = v.used ? [12400, 8900, 21300][v.mi] : 0;
    const price = v.used ? Math.round(m.price * 0.84 / 1000) * 1000 : m.price;
    const card = document.createElement('article');
    card.className = 'card tilt';
    card.innerHTML = `
      <div class="card-img"><span class="badge ${v.used ? 'used' : ''}">${v.used ? 'Seminovo certificado' : '0 km'}</span><img src="${urls[i]}" alt="${m.name} ${m.colors[v.ci].name}" loading="lazy"></div>
      <div class="card-body">
        <div class="card-top"><h3>${m.name}</h3><span>${v.used ? m.year - 1 : m.year}</span></div>
        <p class="muted">${m.tag} · ${m.colors[v.ci].name}</p>
        <ul class="chips"><li>${m.specs.hp} cv</li><li>0-100 em ${String(m.specs.acc).replace('.', ',')}s</li><li>${km ? km.toLocaleString('pt-BR') + ' km' : 'Zero km'}</li></ul>
        <div class="card-foot"><strong>${brl(price)}</strong><button class="link" data-model="${v.mi}" data-color="${v.ci}">Ver em 3D →</button></div>
      </div>`;
    grid.appendChild(card);
  });
  $$('#stock-grid [data-model]').forEach((b) => b.addEventListener('click', async () => {
    const mi = +b.dataset.model;
    const ci = +b.dataset.color;
    state.colorIdx[mi] = ci;
    cars[mi].userData.api.materials.paint.color.set(MODELS[mi].colors[ci].hex);
    document.getElementById('showroom').scrollIntoView({ behavior: 'smooth' });
    if (mi !== currentIdx) selectModel(mi); else updateModelUI();
  }));
}

// ======================= LOOP =======================
const clock = new THREE.Clock();
const camPos = new THREE.Vector3().set(KEYS.hero.px, KEYS.hero.py, KEYS.hero.pz);
const camTarget = new THREE.Vector3(0, 0.6, 0);
const tmpV = new THREE.Vector3();
const tmpT = new THREE.Vector3();
const dummy = new THREE.Object3D();
const hotspotEls = () => $$('.hotspot');
let hsEls = [];

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const aspect = innerWidth / innerHeight;
  const distScale = aspect < 0.8 ? 1.9 : aspect < 1.3 ? 1.35 : 1;
  const xScale = aspect < 1 ? 0 : 1;

  // câmera
  tmpT.set(cam.tx, cam.ty, cam.tz);
  tmpV.set(cam.px, cam.py, cam.pz).sub(tmpT).multiplyScalar(distScale).add(tmpT);
  if (!reduceMotion) {
    tmpV.x += state.pointer.x * 0.35;
    tmpV.y += state.pointer.y * 0.18;
  }
  // tremor em modo sport
  if (state.drive > 0.01) {
    tmpV.y += Math.sin(t * 47) * 0.006 * state.drive;
    tmpV.z += Math.sin(t * 31) * 0.006 * state.drive;
  }
  const k = 1 - Math.exp(-dt * 3.5);
  camPos.lerp(tmpV, k);
  camTarget.lerp(tmpT, k);
  camera.position.copy(camPos);
  camera.lookAt(camTarget);

  // palco
  stage.position.x += (cam.carX * xScale - stage.position.x) * k;

  // giro: automático no hero, arrastar em qualquer lugar, volta ao ângulo base nas outras seções
  state.dragVel *= 0.94;
  if (Math.abs(state.dragVel) > 0.0001 && !document.body.classList.contains('dragging')) state.drag += state.dragVel;
  if (cam.spin > 0.01 && state.drive < 0.1) {
    state.spinOffset += dt * state.autoSpin * cam.spin;
  } else {
    const nearest = Math.round(state.spinOffset / (Math.PI * 2)) * Math.PI * 2;
    state.spinOffset += (nearest - state.spinOffset) * k * 0.8;
  }
  if (cam.spin < 0.01 && Math.abs(state.dragVel) < 0.002) {
    const nearest = Math.round(state.drag / (Math.PI * 2)) * Math.PI * 2;
    state.drag += (nearest - state.drag) * dt * 0.6;
  }
  turntable.rotation.y = state.spinOffset + state.drag;

  // modo sport
  const v = state.drive;
  if (current) {
    const api = current.userData.api;
    const ws = v * 38;
    api.wheels.forEach((w) => (w.rotation.z -= ws * dt));
    current.position.y = Math.sin(t * 22) * 0.004 * v;
    current.rotation.z = -0.012 * v; // leve agachamento
  }
  floorGrid.material.uniforms.uOffset.value += v * dt * 22;
  if (v > 0.001) {
    speedData.forEach((d, i) => {
      d.x -= d.v * 40 * v * dt;
      if (d.x < -16) d.x = 16;
      dummy.position.set(d.x, d.y, d.z);
      dummy.scale.set(d.len * (0.4 + v), 1, 1);
      dummy.updateMatrix();
      speedLines.setMatrixAt(i, dummy.matrix);
    });
    speedLines.instanceMatrix.needsUpdate = true;
  }
  ringMat.opacity = 0.6 + Math.sin(t * 2) * 0.25;

  // poeira
  const p = dust.geometry.attributes.position;
  const seeds = dust.geometry.userData.seeds;
  for (let i = 0; i < p.count; i++) {
    let y = p.getY(i) + dt * (0.04 + seeds[i] * 0.06);
    if (y > 7) y = 0;
    let x = p.getX(i) + Math.sin(t * 0.3 + seeds[i] * 10) * 0.002 - v * dt * 20 * seeds[i];
    if (x < -7.5) x = 7.5;
    p.setXY(i, x, y);
  }
  p.needsUpdate = true;

  // hotspots projetados
  if (current) {
    const show = state.activeSection === 'design' && !busy;
    const api = current.userData.api;
    hsEls.forEach((el, i) => {
      const hp = api.hotspots[i];
      tmpV.copy(hp.pos);
      current.localToWorld(tmpV);
      // oculta se estiver de costas para a câmera
      const facing = tmpT.copy(camera.position).sub(tmpV).dot(tmpV.clone().sub(current.getWorldPosition(new THREE.Vector3())).setY(0));
      tmpV.project(camera);
      const visible = show && tmpV.z < 1 && facing > 0;
      el.style.transform = `translate(${(tmpV.x * 0.5 + 0.5) * innerWidth}px, ${(-tmpV.y * 0.5 + 0.5) * innerHeight}px)`;
      el.classList.toggle('visible', visible);
    });
  }

  composer.render();
  requestAnimationFrame(frame);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ======================= INICIALIZAÇÃO =======================
async function init() {
  setProgress(0.05);
  await tick();
  scene.environment = buildEnvironment();
  scene.environmentIntensity = 0.85;
  setProgress(0.25);
  await tick();
  buildStage();
  setProgress(0.4);
  await tick();
  for (let i = 0; i < MODELS.length; i++) {
    cars.push(buildCar(MODELS[i]));
    setProgress(0.4 + (i + 1) * 0.12);
    await tick();
  }
  buildUI();
  hsEls = hotspotEls();
  renderThumbnails();
  setProgress(0.85);
  await tick();

  current = cars[0];
  turntable.add(current);
  current.userData.api.setClip(-0.05);
  updateModelUI();
  // pré-compila shaders
  renderer.compile(scene, camera);
  setProgress(1);
  await tick();

  setupPointer();
  setupScroll();
  requestAnimationFrame(frame);

  // saída do loader + entrada
  const tl = gsap.timeline();
  tl.to('#loader .loader-inner', { opacity: 0, y: -20, duration: 0.5, delay: 0.3 })
    .to('#loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' })
    .set('#loader', { display: 'none' })
    .add(() => { busy = true; materialize(current, 'in').then(() => (busy = false)); }, '-=0.5')
    .from('.nav', { y: -30, opacity: 0, duration: 0.9, ease: 'expo.out' }, '-=0.3')
    .from('.hero .line > span', { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.1 }, '<')
    .from('.hero [data-in]', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, '-=0.9')
    .from('.dots, .scroll-hint', { opacity: 0, duration: 1 }, '<');
}

init().catch((err) => {
  console.error(err);
  $('#loader .pct').textContent = 'ERRO';
  $('#loader .hint').textContent = 'Não foi possível iniciar o WebGL neste navegador.';
});
