import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { MODELS, buildPhotoCar, loadGLBCar } from './cars.js';

const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const num = (v, d = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const isTouch = matchMedia('(hover: none)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tick = () => new Promise((r) => requestAnimationFrame(() => r()));

const setProgress = (p) => {
  $('#loader .bar i').style.transform = `scaleX(${p})`;
  $('#loader .pct').textContent = String(Math.round(p * 100)).padStart(3, '0');
};

// ======================= QUALIDADE ADAPTATIVA =======================
// O site começa no melhor nível que o aparelho aguenta e reduz sozinho
// se a taxa de quadros cair, mantendo a rolagem sempre fluida.
const SYS_DPR = window.devicePixelRatio || 1;
const TIERS = [
  { name: 'baixa', dpr: Math.min(SYS_DPR, 1) * 0.85, reflector: false, bloom: false, msaa: 0, dust: 0.3 },
  { name: 'média', dpr: Math.min(SYS_DPR, 1.25), reflector: true, refl: 0.33, bloom: true, msaa: 0, dust: 0.6 },
  { name: 'alta', dpr: Math.min(SYS_DPR, 1.75), reflector: true, refl: 0.5, bloom: true, msaa: 4, dust: 1 },
];
const weakDevice = (isTouch && innerWidth < 900) || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
let tierIdx = weakDevice ? 1 : 2;
const forced = new URLSearchParams(location.search).get('q');
if (forced && /^[012]$/.test(forced)) tierIdx = +forced;
let tier = TIERS[tierIdx];

// ======================= RENDERER / CENA =======================
const canvas = $('#webgl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
renderer.setPixelRatio(tier.dpr);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // sombra recalculada só quando algo muda
let shadowDirty = 2;

const BG = new THREE.Color(0x040811);
const scene = new THREE.Scene();
scene.background = BG;
scene.fog = new THREE.Fog(BG, 14, 34);
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 80);

function buildEnvironment() {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x020203);
  const panel = (w, h, x, y, z, rx, ry, k, tint = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(tint[0] * k, tint[1] * k, tint[2] * k), side: THREE.DoubleSide }));
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, 0);
    env.add(mesh);
  };
  panel(10, 3, 0, 8, 0, Math.PI / 2, 0, 3.2);
  for (const z of [-7, 7]) { panel(14, 0.6, 0, 3, z, 0, 0, 5); panel(14, 0.25, 0, 5, z, 0, 0, 3); }
  panel(4, 5, -9, 3, 0, 0, Math.PI / 2, 1.6, [0.6, 0.8, 1]);
  panel(4, 5, 9, 3, 0, 0, -Math.PI / 2, 1.2, [0.7, 0.85, 1]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: 0x0a0a0c }));
  floor.rotation.x = -Math.PI / 2;
  env.add(floor);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.03).texture;
  pmrem.dispose();
  return tex;
}

function radialTexture(stops, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
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
  g.strokeStyle = '#fff';
  g.lineWidth = 6; g.shadowColor = '#fff'; g.shadowBlur = 18;
  g.strokeRect(10, 10, 492, 236);
  g.lineWidth = 2; g.globalAlpha = 0.35;
  for (let x = 30; x < 500; x += 24) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x, 246); g.stroke(); }
  return new THREE.CanvasTexture(c);
}

// ======================= PALCO =======================
const stage = new THREE.Group();
const turntable = new THREE.Group();
scene.add(stage);
stage.add(turntable);

let reflector, veil, floorGrid, ringMat, lightPool, dust, speedLines, scanner, scanLight, contactShadow, keyLight;
const speedData = [];

function buildStage() {
  reflector = new Reflector(new THREE.PlaneGeometry(60, 60), {
    textureWidth: Math.floor(innerWidth * tier.dpr * (tier.refl || 0.4)),
    textureHeight: Math.floor(innerHeight * tier.dpr * (tier.refl || 0.4)),
    color: 0x9a9a9a,
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.visible = tier.reflector;
  scene.add(reflector);

  veil = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({
    color: BG, transparent: true, depthWrite: false,
    alphaMap: radialTexture([[0, '#a8a8a8'], [0.12, '#c4c4c4'], [0.35, '#f2f2f2'], [0.6, '#ffffff']]),
  }));
  veil.rotation.x = -Math.PI / 2;
  veil.position.y = 0.002;
  scene.add(veil);

  floorGrid = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShaderMaterial({
    uniforms: { uOffset: { value: 0 }, uColor: { value: new THREE.Color(0.25, 0.55, 1.6) }, uOpacity: { value: 0.22 } },
    vertexShader: 'varying vec3 vPos; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uOffset; uniform vec3 uColor; uniform float uOpacity; varying vec3 vPos;
      void main(){ vec2 p = vPos.xz * 0.8; p.x += uOffset; vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
      float line = 1.0 - min(min(g.x, g.y), 1.0); float d = length(vPos.xz);
      float a = line * smoothstep(13.0, 3.0, d) * smoothstep(1.2, 3.2, d) * uOpacity; gl_FragColor = vec4(uColor * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  floorGrid.rotation.x = -Math.PI / 2;
  floorGrid.position.y = 0.004;
  scene.add(floorGrid);

  // sombra: a luz gira junto com o carro, então o mapa de sombra não precisa ser refeito a cada quadro
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.45 }));
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.006;
  shadowPlane.receiveShadow = true;
  turntable.add(shadowPlane);
  keyLight = new THREE.SpotLight(0xffffff, 110, 30, 0.55, 0.9, 1.6);
  keyLight.position.set(0.8, 9, 1.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.radius = 5;
  turntable.add(keyLight);
  turntable.add(keyLight.target);

  contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: radialTexture([[0, 'rgba(0,0,0,0.9)'], [0.55, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false,
  }));
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.008;
  turntable.add(contactShadow);

  ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 1.1, 3.0), transparent: true, opacity: 0.9 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.55, 3.585, 128), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  stage.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(3.75, 3.76, 128), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.55, 1.2), transparent: true, opacity: 0.3 }));
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.01;
  stage.add(ring2);

  lightPool = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.4), new THREE.MeshBasicMaterial({
    map: radialTexture([[0, 'rgba(255,240,220,0.7)'], [0.5, 'rgba(255,230,200,0.18)'], [1, 'rgba(0,0,0,0)']]),
    transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  lightPool.rotation.x = -Math.PI / 2;
  lightPool.position.set(5, 0.012, 0);
  turntable.add(lightPool);

  const barMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.4) });
  for (const z of [-1.6, 0, 1.6]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(9, 0.04, 0.16), barMat);
    bar.position.set(0, 6.2, z);
    bar.name = 'lightbar';
    stage.add(bar);
  }

  scene.add(new THREE.HemisphereLight(0x8899aa, 0x080808, 0.4));
  const rim = new THREE.DirectionalLight(0x7fb4ff, 1.5);
  rim.position.set(-6, 3, -4);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0x9fc4ff, 0.8);
  fill.position.set(6, 2, 5);
  scene.add(fill);

  // poeira animada inteiramente na GPU
  const N = 700;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 4.5;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.random() * 7;
    pos[i * 3 + 2] = Math.sin(a) * r;
    seed[i] = Math.random();
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dg.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  dust = new THREE.Points(dg, new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uShift: { value: 0 }, uPR: { value: tier.dpr } },
    vertexShader: `attribute float seed; uniform float uTime; uniform float uShift; uniform float uPR; varying float vA;
      void main(){ vec3 p = position; p.y = mod(p.y + uTime * (0.04 + seed * 0.06), 7.0);
        p.x += sin(uTime * 0.3 + seed * 10.0) * 0.3; p.x = mod(p.x - uShift * seed + 7.5, 15.0) - 7.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = min(7.0 * uPR / -mv.z * 3.0, 4.0 * uPR); vA = smoothstep(0.0, 1.0, p.y) * smoothstep(7.0, 5.5, p.y); }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * 0.55 * vA; gl_FragColor = vec4(vec3(0.9, 1.15, 1.6) * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  dust.frustumCulled = false;
  dg.setDrawRange(0, Math.floor(N * tier.dust));
  scene.add(dust);

  const SL = 60;
  speedLines = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.006, 0.006),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 1.3, 2.2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), SL);
  for (let i = 0; i < SL; i++) {
    let z = (Math.random() - 0.5) * 12;
    if (Math.abs(z) < 1.4) z += Math.sign(z || 1) * 1.4;
    speedData.push({ x: (Math.random() - 0.5) * 30, y: 0.05 + Math.random() * 2.6, z, len: 1 + Math.random() * 4, v: 0.7 + Math.random() * 0.6 });
  }
  speedLines.frustumCulled = false;
  speedLines.visible = false;
  stage.add(speedLines);

  scanner = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: scannerTexture(), color: new THREE.Color(0.5, 1.2, 3.0), transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
  scanner.rotation.x = -Math.PI / 2;
  turntable.add(scanner);
  scanLight = new THREE.PointLight(0x3d8bff, 0, 6, 1.5);
  turntable.add(scanLight);
}

// ======================= PÓS-PROCESSAMENTO =======================
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: tier.msaa }));
composer.setPixelRatio(tier.dpr);
composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.55, 0.55, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function applyTier(i) {
  tierIdx = i;
  tier = TIERS[i];
  renderer.setPixelRatio(tier.dpr);
  renderer.setSize(innerWidth, innerHeight);
  composer.setPixelRatio(tier.dpr);
  composer.setSize(innerWidth, innerHeight);
  [composer.renderTarget1, composer.renderTarget2].forEach((rt) => { rt.samples = tier.msaa; rt.dispose(); });
  reflector.visible = tier.reflector;
  if (tier.reflector) reflector.getRenderTarget().setSize(Math.floor(innerWidth * tier.dpr * tier.refl), Math.floor(innerHeight * tier.dpr * tier.refl));
  dust.geometry.setDrawRange(0, Math.floor(dust.geometry.attributes.position.count * tier.dust));
  dust.material.uniforms.uPR.value = tier.dpr;
  veil.material.opacity = tier.reflector ? 1 : 0.92;
  document.body.classList.toggle('lite', i === 0);
}

// ======================= ESTADO =======================
const cars = [];
let current = null;
let currentIdx = 0;
let busy = false;
const state = {
  drive: 0, lights: false, spinOffset: 0, drag: 0, dragVel: 0, dragging: false, lastDrag: -10, autoSpin: 0.16,
  pointer: new THREE.Vector2(), activeSection: 'hero', colorIdx: MODELS.map(() => 0),
};

function fitStageToCar(car) {
  const api = car.userData.api;
  scanner.scale.set(api.length + 0.6, api.width + 0.9, 1);
  if (api.billboard) {
    contactShadow.scale.set(api.length * 0.95, 1.5, 1);
    lightPool.position.set(-0.6, 0.012, 2.2);
  } else {
    contactShadow.scale.set(api.length + 1.4, api.width + 1.1, 1);
    lightPool.position.set(api.length / 2 + 2.6, 0.012, 0);
  }
}

function materialize(car, dir = 'in') {
  const api = car.userData.api;
  const top = api.height + 0.05;
  api.holoMat.visible = true;
  return new Promise((resolve) => {
    const o = { h: dir === 'in' ? -0.05 : top };
    const tl = gsap.timeline({ onComplete: resolve });
    if (dir === 'in') {
      api.setClip(-0.05);
      tl.to(api.holoMat, { opacity: 0.12, duration: 0.45, ease: 'power2.out' });
    } else {
      tl.to(api.holoMat, { opacity: 0.12, duration: 0.25 }, 0);
    }
    tl.to(scanner.material, { opacity: 1, duration: 0.3 }, dir === 'in' ? 0.2 : 0);
    tl.to(scanLight, { intensity: 14, duration: 0.3 }, '<');
    tl.to(o, {
      h: dir === 'in' ? top : -0.05, duration: dir === 'in' ? 1.6 : 0.9, ease: 'power2.inOut',
      onUpdate: () => { api.setClip(o.h); api.setGlow(scanner.material.opacity); scanner.position.y = o.h; scanLight.position.y = o.h; shadowDirty = 1; },
    }, '<');
    tl.to(scanner.material, { opacity: 0, duration: 0.35 });
    tl.to(scanLight, { intensity: 0, duration: 0.35 }, '<');
    tl.to(api.holoMat, { opacity: 0, duration: 0.5 }, '<');
    tl.add(() => { api.holoMat.visible = false; api.setGlow(0); if (dir === 'in') { api.setClip(10); api.sweep(1.6); } shadowDirty = 2; });
  });
}

async function selectModel(idx) {
  if (busy || (current && idx === currentIdx)) return;
  busy = true;
  const lightsWereOn = state.lights;
  if (current) {
    if (lightsWereOn) setLights(false, true);
    await materialize(current, 'out');
    turntable.remove(current);
  }
  currentIdx = idx;
  current = cars[idx];
  turntable.add(current);
  fitStageToCar(current);
  updateModelUI();
  await materialize(current, 'in');
  if (lightsWereOn) setLights(true, true);
  busy = false;
}

function setPaint(hex, index) {
  current.userData.api.setColor(hex, index);
}

function setLights(on, silent = false) {
  if (!silent) state.lights = on;
  current.userData.api.setLights(on);
  gsap.to(lightPool.material, { opacity: on ? 0.55 : 0, duration: 0.6 });
}

function setDrive(on) {
  if (on) speedLines.visible = true;
  gsap.to(state, { drive: on ? 1 : 0, duration: on ? 1.4 : 1.8, ease: on ? 'power2.in' : 'power2.out' });
  gsap.to(bloom, { strength: on ? 0.65 : 0.55, duration: 1.2 });
  gsap.to(speedLines.material, { opacity: on ? 0.45 : 0, duration: 1, onComplete: () => { if (!on) speedLines.visible = false; } });
  gsap.to(floorGrid.material.uniforms.uOpacity, { value: on ? 0.45 : 0.22, duration: 1 });
}

// ======================= CÂMERA / ROLAGEM =======================
const KEYS = {
  hero: { px: 5.2, py: 1.7, pz: 11.5, tx: 0, ty: 1.15, tz: 0, carX: 3.1, spin: 1 },
  showroom: { px: 0.6, py: 1.5, pz: 11.2, tx: 0, ty: 1.15, tz: 0, carX: -2.4, spin: 0.6 },
  design: { px: 2.2, py: 1.3, pz: 8.6, tx: 0.2, ty: 1.15, tz: 0, carX: 1.3, spin: 0 },
  performance: { px: -4.8, py: 1.6, pz: 10.2, tx: 0, ty: 1.1, tz: 0, carX: 2.3, spin: 0 },
  estoque: { px: 0.01, py: 4.2, pz: 13, tx: 0, ty: 0.9, tz: 0, carX: 0, spin: 0.35 },
  financiamento: { px: 4.2, py: 2.2, pz: 11, tx: 0, ty: 1.1, tz: 0, carX: -2.4, spin: 0 },
  contato: { px: -1.2, py: 2.2, pz: 15, tx: 0, ty: 1.4, tz: 0, carX: 0.4, spin: 0.6 },
};
const SECTIONS = Object.keys(KEYS);
const cam = { ...KEYS.hero };
let lenis = null;

function setupScroll() {
  if (Lenis && !reduceMotion) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    document.documentElement.classList.add('has-lenis');
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    scrollToEl(target);
  }));

  SECTIONS.forEach((id, i) => {
    const el = document.getElementById(id);
    if (i > 0) {
      gsap.fromTo(cam, { ...KEYS[SECTIONS[i - 1]] }, {
        ...KEYS[id], ease: 'power1.inOut', immediateRender: false,
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 15%', scrub: true },
      });
    }
    ScrollTrigger.create({ trigger: el, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => { if (s.isActive) setActiveSection(id); } });
  });

  $$('[data-reveal]').forEach((el) => gsap.from(el, { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));
  $$('[data-stagger]').forEach((w) => gsap.from(w.children, { y: 60, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: w, start: 'top 85%' } }));
  gsap.to('.progress i', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
  ScrollTrigger.create({ start: 80, onToggle: (s) => $('.nav').classList.toggle('scrolled', s.isActive) });
}

function scrollToEl(el) {
  if (lenis) lenis.scrollTo(el, { duration: 1.6 });
  else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
}

function setActiveSection(id) {
  state.activeSection = id;
  $$('.dots a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  $$('.nav-links a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  if (id === 'performance') animateStats();
  if (id !== 'design') hsEls.forEach((el) => el.classList.remove('visible', 'open'));
}

// ======================= INTERAÇÃO =======================
function setupPointer() {
  let lastX = 0;
  addEventListener('pointermove', (e) => {
    state.pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (state.dragging) {
      state.dragVel = (e.clientX - lastX) * 0.006;
      lastX = e.clientX;
      state.drag += state.dragVel;
      state.lastDrag = clock.elapsedTime;
    }
  }, { passive: true });
  canvas.addEventListener('pointerdown', (e) => { state.dragging = true; lastX = e.clientX; state.lastDrag = clock.elapsedTime; document.body.classList.add('dragging'); });
  const stop = () => { state.dragging = false; document.body.classList.remove('dragging'); };
  addEventListener('pointerup', stop);
  addEventListener('pointercancel', stop);

  if (!isTouch) {
    const cur = $('#cursor');
    const xTo = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
    const yTo = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
    addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    document.addEventListener('pointerover', (e) => cur.classList.toggle('hover', !!e.target.closest('a, button, input, select, label, .swatch, .card')));
    $$('.magnetic').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4 });
      });
      btn.addEventListener('pointerleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }));
    });
    bindTilt($$('.tilt'));
  }
}

function bindTilt(els) {
  if (isTouch) return;
  els.forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(card, { rotateY: x * 8, rotateX: -y * 8, duration: 0.5, transformPerspective: 900 });
      card.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
      card.style.setProperty('--my', `${(y + 0.5) * 100}%`);
    });
    card.addEventListener('pointerleave', () => gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.8, ease: 'power3.out' }));
  });
}

// ======================= UI =======================
let hsEls = [];

function buildUI() {
  const tabs = $('#model-tabs');
  MODELS.forEach((m, i) => {
    const b = document.createElement('button');
    b.className = 'tab';
    b.innerHTML = `<small>${m.brand}</small>${m.name}`;
    b.addEventListener('click', () => selectModel(i));
    tabs.appendChild(b);
  });
  $('#prev-model').addEventListener('click', () => selectModel((currentIdx + MODELS.length - 1) % MODELS.length));
  $('#next-model').addEventListener('click', () => selectModel((currentIdx + 1) % MODELS.length));
  $('#toggle-lights').addEventListener('change', (e) => setLights(e.target.checked));
  $('#toggle-drive').addEventListener('change', (e) => setDrive(e.target.checked));

  const fSel = $('#fin-model');
  MODELS.forEach((m, i) => fSel.add(new Option(`${m.brand} ${m.name} · ${brl(m.price)}`, i)));
  ['#fin-model', '#fin-down', '#fin-months'].forEach((s) => $(s).addEventListener('input', updateFinance));
  const cSel = $('#c-model');
  MODELS.forEach((m) => cSel.add(new Option(`${m.brand} ${m.name}`, `${m.brand} ${m.name}`)));
  cSel.add(new Option('Outro modelo / avaliação do meu usado', 'outro'));

  $('#contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#c-name').value.trim().split(' ')[0] || 'cliente';
    toast(`Obrigado, ${name}! Abrindo o WhatsApp da Fronteira Veículos para confirmar sua visita.`);
    window.open('https://bit.ly/ContatoFronteiraVeiculos', '_blank', 'noopener');
    e.target.reset();
  });

  $('.burger').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  $$('.nav-links a').forEach((a) => a.addEventListener('click', () => document.body.classList.remove('menu-open')));

  const hs = $('#hotspots');
  for (let i = 0; i < 4; i++) {
    const d = document.createElement('div');
    d.className = 'hotspot';
    d.innerHTML = '<button aria-label="Ver detalhe"><i></i></button><div class="tip"><b></b><p></p></div>';
    d.querySelector('button').addEventListener('click', () => d.classList.toggle('open'));
    hs.appendChild(d);
  }
  hsEls = $$('.hotspot');

  buildStock();
}

function buildStock() {
  const grid = $('#stock-grid');
  MODELS.forEach((m, i) => {
    const card = document.createElement('article');
    card.className = 'card tilt';
    card.innerHTML = `
      <div class="card-img ${m.photoBg}"><span class="badge">${m.badge || (m.year >= 2025 ? '0KM' : 'Seminovo')}</span>
        <img src="${m.photo}" alt="${m.brand} ${m.name}" loading="lazy" decoding="async" width="600" height="380"></div>
      <div class="card-body">
        <div class="card-top"><div><small class="brand">${m.brand}</small><h3>${m.name}</h3></div><span>${m.year}</span></div>
        <p class="muted">${m.specLabels.engine} · ${m.specLabels.trans}</p>
        <ul class="chips"><li>${m.specs.hp} cv</li><li>0-100 em ${num(m.specs.acc, 1)} s</li><li>${m.specs.top} km/h</li></ul>
        <div class="card-foot"><strong>${brl(m.price)}</strong>
          <div class="card-actions"><button class="link" data-view="${i}">Ver no showroom →</button><button class="link soft" data-fin="${i}">Simular</button></div></div>
      </div>`;
    grid.appendChild(card);
  });
  $$('[data-view]', grid).forEach((b) => b.addEventListener('click', () => {
    scrollToEl($('#showroom'));
    selectModel(+b.dataset.view);
  }));
  $$('[data-fin]', grid).forEach((b) => b.addEventListener('click', () => {
    $('#fin-model').value = b.dataset.fin;
    updateFinance();
    scrollToEl($('#financiamento'));
  }));
}

function updateModelUI() {
  const m = MODELS[currentIdx];
  document.body.classList.toggle('is-3d', current.userData.api.kind === 'glb');
  $$('#model-tabs .tab').forEach((t, i) => t.classList.toggle('active', i === currentIdx));
  const swap = (sel, text) => {
    const el = $(sel);
    gsap.to(el, { opacity: 0, y: -10, duration: 0.22, onComplete: () => { el.textContent = text; gsap.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }); } });
  };
  swap('#m-brand', m.brand);
  swap('#m-name', m.name);
  swap('#m-tag', `${m.tag} · ${m.year}`);
  swap('#m-desc', m.desc);
  swap('#m-price', brl(m.price));
  $('#perf-name').textContent = `${m.brand} ${m.name}`;
  $('#perf-sheet').textContent = `${m.specLabels.engine} · ${m.specLabels.trans} · ${m.specLabels.fuel}`;

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
      const api = current.userData.api;
      $('#color-name').textContent = api.canRecolor || i === 0 ? c.name : `${c.name} · foto na cor ${m.colors[0].name}`;
      setPaint(c.hex, i);
    });
    sw.appendChild(b);
  });
  $('#color-name').textContent = m.colors[state.colorIdx[currentIdx]].name;

  const api = current.userData.api;
  hsEls.forEach((h, i) => {
    h.querySelector('b').textContent = api.hotspots[i].title;
    h.querySelector('p').textContent = api.hotspots[i].text;
  });
  $('#fin-model').value = currentIdx;
  updateFinance();
  if (state.activeSection === 'performance') animateStats();
}

function animateStats() {
  const s = MODELS[currentIdx].specs;
  const pct = { hp: s.hp / 750, acc: 1 - (s.acc - 2) / 14, top: s.top / 350, torque: s.torque / 80 };
  $$('.stat').forEach((el) => {
    const k = el.dataset.k;
    const out = el.querySelector('.num');
    const o = { v: 0 };
    const dec = k === 'acc' || (k === 'torque' && s.torque % 1) ? 1 : 0;
    gsap.to(o, { v: s[k], duration: 1.6, ease: 'expo.out', onUpdate: () => (out.textContent = num(o.v, dec)) });
    gsap.fromTo(el.querySelector('.meter i'), { scaleX: 0 }, { scaleX: Math.max(0.06, Math.min(1, pct[k])), duration: 1.6, ease: 'expo.out' });
  });
}

function updateFinance() {
  const m = MODELS[+$('#fin-model').value];
  const downPct = +$('#fin-down').value / 100;
  const n = +$('#fin-months').value;
  const rate = 0.0149;
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
  gsap.timeline().fromTo(t, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out' }).to(t, { y: 40, opacity: 0, duration: 0.5, delay: 3.4 });
}

// ======================= LOOP =======================
const clock = new THREE.Clock();
const camPos = new THREE.Vector3(KEYS.hero.px, KEYS.hero.py, KEYS.hero.pz);
const camTarget = new THREE.Vector3(0, 0.6, 0);
const vA = new THREE.Vector3();
const vB = new THREE.Vector3();
const vC = new THREE.Vector3();
const dummy = new THREE.Object3D();
const TAU = Math.PI * 2;
let sweepTimer = 5;
const condEl = document.querySelector('.conditions');
let perfFrames = 0;
let perfTime = 0;
let perfCooldown = 4; // segundos antes de começar a medir

function frame() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const t = clock.elapsedTime;
  const aspect = innerWidth / innerHeight;
  const distScale = aspect < 0.8 ? 1.9 : aspect < 1.3 ? 1.35 : 1;
  const xScale = aspect < 1 ? 0 : 1;
  const k = 1 - Math.exp(-dt * 3.5);

  vB.set(cam.tx, cam.ty - (aspect < 1 ? 1.5 : 0), cam.tz);
  vA.set(cam.px, cam.py, cam.pz).sub(vB).multiplyScalar(distScale).add(vB);
  if (!reduceMotion && !isTouch) { vA.x += state.pointer.x * 0.35; vA.y += state.pointer.y * 0.18; }
  if (state.drive > 0.01) { vA.y += Math.sin(t * 47) * 0.006 * state.drive; vA.z += Math.sin(t * 31) * 0.006 * state.drive; }
  camPos.lerp(vA, k);
  camTarget.lerp(vB, k);
  camera.position.copy(camPos);
  camera.lookAt(camTarget);

  stage.position.x += (cam.carX * xScale - stage.position.x) * k;

  if (!state.dragging) { state.dragVel *= 0.94; state.drag += state.dragVel; }
  // giro livre: arrastar gira o carro; parado por alguns segundos, ele volta a girar sozinho devagar
  const idle = t - state.lastDrag > 3 && !state.dragging;
  if (cam.spin > 0.01 && state.drive < 0.1 && idle) state.spinOffset += dt * state.autoSpin * cam.spin;
  const bb = current && current.userData.api.billboard;
  turntable.rotation.y = bb ? 0 : state.spinOffset + state.drag;
  if (bb) {
    const api = current.userData.api;
    current.getWorldPosition(vC);
    const face = Math.atan2(camera.position.x - vC.x, camera.position.z - vC.z);
    const tilt = reduceMotion || isTouch ? 0 : state.pointer.x * 0.06;
    api.pivot.rotation.y += (face + tilt - api.pivot.rotation.y) * Math.min(1, k * 2.5);
    api.update(t, state.drive);
    sweepTimer -= dt;
    if (sweepTimer <= 0 && !busy) { api.sweep(1.6); sweepTimer = 7; }
  }

  const v = state.drive;
  if (current) {
    const api = current.userData.api;
    if (v > 0.001) api.wheels.forEach((w) => (w.rotation.z -= v * 38 * dt));
    current.position.y = Math.sin(t * 22) * 0.004 * v;
    current.rotation.z = -0.012 * v;
  }
  floorGrid.material.uniforms.uOffset.value += v * dt * 22;
  if (speedLines.visible) {
    for (let i = 0; i < speedData.length; i++) {
      const d = speedData[i];
      d.x -= d.v * 40 * v * dt;
      if (d.x < -16) d.x = 16;
      dummy.position.set(d.x, d.y, d.z);
      dummy.scale.set(d.len * (0.4 + v), 1, 1);
      dummy.updateMatrix();
      speedLines.setMatrixAt(i, dummy.matrix);
    }
    speedLines.instanceMatrix.needsUpdate = true;
  }
  ringMat.opacity = 0.6 + Math.sin(t * 2) * 0.25;
  dust.material.uniforms.uTime.value = t;
  dust.material.uniforms.uShift.value += v * dt * 20;

  // hotspots: só calculados na seção Design
  if (current && state.activeSection === 'design') {
    const api = current.userData.api;
    const condTop = condEl ? condEl.getBoundingClientRect().top : Infinity;
    const clear = condTop > innerHeight * 0.6; // some quando os cards de condições sobem
    current.getWorldPosition(vC);
    hsEls.forEach((el, i) => {
      vA.copy(api.hotspots[i].pos);
      current.localToWorld(vA);
      const facing = api.billboard || vB.copy(camera.position).sub(vA).dot(vA.clone().sub(vC).setY(0)) > -0.2;
      vA.project(camera);
      el.style.transform = `translate3d(${(vA.x * 0.5 + 0.5) * innerWidth}px, ${(-vA.y * 0.5 + 0.5) * innerHeight}px, 0)`;
      el.classList.toggle('visible', clear && !busy && facing && vA.z < 1);
    });
  }

  if (shadowDirty > 0 || v > 0.01) { renderer.shadowMap.needsUpdate = true; shadowDirty = Math.max(0, shadowDirty - 1); }

  if (tier.bloom) composer.render();
  else renderer.render(scene, camera);

  // monitor de desempenho: reduz a qualidade se os quadros ficarem lentos
  if (perfCooldown > 0) perfCooldown -= rawDt;
  else if (tierIdx > 0 && !document.hidden) {
    perfFrames++;
    perfTime += rawDt;
    if (perfFrames >= 90) {
      const avg = perfTime / perfFrames;
      if (avg > 1 / 42) { applyTier(tierIdx - 1); perfCooldown = 3; }
      perfFrames = 0;
      perfTime = 0;
    }
  }
}

function updateBars() { const show = innerWidth / innerHeight >= 1; stage.children.forEach((o) => { if (o.name === 'lightbar') o.visible = show; }); }
addEventListener('resize', () => {
  updateBars();
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  if (tier.reflector) reflector.getRenderTarget().setSize(Math.floor(innerWidth * tier.dpr * tier.refl), Math.floor(innerHeight * tier.dpr * tier.refl));
});
document.addEventListener('visibilitychange', () => { perfFrames = 0; perfTime = 0; perfCooldown = 2; clock.getDelta(); });

// ======================= INICIALIZAÇÃO =======================
const texLoader = new THREE.TextureLoader();
async function makeCar(model) {
  if (model.glb) {
    try {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
      const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');
      const loader = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath('vendor/three/addons/libs/draco/gltf/');
      loader.setDRACOLoader(draco);
      loader.setMeshoptDecoder(MeshoptDecoder);
      try {
        return await loadGLBCar(model, await loader.loadAsync(model.glb));
      } catch (e) {
        // Ambientes restritos (ex.: visualização protegida) não servem .glb nem permitem
        // WebAssembly: usa a variante com geometria num módulo JS e texturas .webp comuns.
        const mod = await import(new URL(`../${model.glb}.js`, import.meta.url).href);
        const bytes = Uint8Array.from(atob(mod.default), (c) => c.charCodeAt(0));
        const safe = new GLTFLoader();
        safe.register((parser) => {
          parser.textureLoader = new THREE.TextureLoader(parser.options.manager);
          return { name: 'img_textures' };
        });
        const base = model.glb.slice(0, model.glb.lastIndexOf('/') + 1);
        return await loadGLBCar(model, await safe.parseAsync(bytes.buffer, base));
      }
    } catch (err) {
      console.warn(`Modelo ${model.glb} não carregou; usando a foto.`, err);
    }
  }
  return buildPhotoCar(model, texLoader);
}

async function init() {
  setProgress(0.05);
  await tick();
  scene.environment = buildEnvironment();
  scene.environmentIntensity = 0.85;
  setProgress(0.2);
  await tick();
  buildStage();
  applyTier(tierIdx);
  updateBars();
  setProgress(0.35);
  await tick();
  for (let i = 0; i < MODELS.length; i++) {
    cars.push(await makeCar(MODELS[i]));
    setProgress(0.35 + (i + 1) * 0.15);
    await tick();
  }
  keyLight.castShadow = cars.some((c) => !c.userData.api.billboard);
  current = cars[0];
  turntable.add(current);
  fitStageToCar(current);
  current.userData.api.setClip(-0.05);
  buildUI();
  updateModelUI();
  // compila os shaders de todos os carros antes de mostrar (evita travadas na troca)
  cars.forEach((c) => { if (c !== current) { c.visible = true; turntable.add(c); } });
  renderer.compile(scene, camera);
  cars.forEach((c) => { if (c !== current) turntable.remove(c); });
  setProgress(1);
  await tick();

  setupPointer();
  setupScroll();
  gsap.ticker.add(frame);

  const tl = gsap.timeline();
  tl.to('#loader .loader-inner', { opacity: 0, y: -20, duration: 0.5, delay: 0.2 })
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
  $('#loader .hint').textContent = 'Não foi possível iniciar o 3D neste navegador.';
});
