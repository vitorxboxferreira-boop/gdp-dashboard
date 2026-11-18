// Catálogo e apresentação dos veículos.
// Hoje cada carro é exibido a partir da foto real (fundo recortado) dentro do estúdio 3D.
// Quando houver um modelo 3D de verdade (.glb), coloque-o em /models e preencha `glb`:
// o site passa a usar o modelo 3D (com giro 360°) automaticamente, com os mesmos efeitos.
import * as THREE from 'three';

// Valores de referência: confira preços e versões com a sua tabela antes de publicar.
export const MODELS = [
  {
    id: 'mobi',
    badge: 'Seminovo',
    brand: 'Fiat',
    name: 'Mobi Trekking',
    tag: 'Hatch compacto · seminovo',
    year: 2025,
    price: 82990,
    photo: 'assets/fiat-mobi-trekking.webp',
    photoBg: 'light',
    cutout: 'assets/mobi-cut.webp',
    size: 4.1, // largura da imagem no estúdio (m)
    desc: 'Compacto, econômico e com visual aventureiro: suspensão elevada, rack de teto, teto preto e rodas escurecidas. Perfeito para a cidade.',
    specs: { hp: 75, acc: 13.4, top: 151, torque: 9.9 },
    specLabels: { engine: '1.0 Fire Flex', trans: 'Manual 5 marchas', fuel: '13,9 km/l (cidade, gasolina)' },
    // troca de cor: máscara da pintura na foto + intensidade média da cor original
    recolor: { mask: 'assets/mobi-paint.webp', baseDiff: 0.59 },
    lights: [[0.455, 0.515, 1], [0.075, 0.5, 0.75], [0.455, 0.3, 0.55], [0.035, 0.32, 0.45]],
    hotspots: [
      { uv: [0.43, 0.52], title: 'Faróis com máscara negra', text: 'Visual exclusivo da versão Trekking, com faróis de neblina integrados ao para-choque.' },
      { uv: [0.585, 0.17], title: 'Rodas aro 14 escurecidas', text: 'Pneus de uso misto e suspensão elevada para encarar a cidade e a estrada de terra.' },
      { uv: [0.62, 0.93], title: 'Rack de teto + teto preto', text: 'Rack funcional e pintura bicolor que deixam o Mobi com cara de aventureiro.' },
      { uv: [0.86, 0.33], title: 'Proteções laterais', text: 'Molduras de para-lama e soleiras em preto com adesivo Trekking.' },
    ],
    glb: null, // ex.: 'models/fiat-mobi.glb'
    colors: [
      { name: 'Vermelho Montecarlo', hex: '#c0161c' },
      { name: 'Branco Banchisa', hex: '#eceeed' },
      { name: 'Prata Bari', hex: '#a9adb3' },
      { name: 'Cinza Strato', hex: '#5b6067' },
      { name: 'Preto Vulcano', hex: '#151618' },
    ],
  },
  {
    id: 'compass',
    badge: '0KM',
    brand: 'Jeep',
    name: 'Compass S',
    tag: 'SUV médio premium',
    year: 2025,
    price: 249990,
    photo: 'assets/jeep-compass-s.webp',
    photoBg: 'light',
    cutout: 'assets/compass-cut.webp',
    size: 4.5,
    desc: 'Motor turbo, teto solar panorâmico, teto preto e acabamento S exclusivo. O SUV mais desejado do Brasil, com tecnologia de sobra.',
    specs: { hp: 185, acc: 9.4, top: 212, torque: 27.5 },
    specLabels: { engine: '1.3 T270 Turbo Flex', trans: 'Automático 6 marchas', fuel: '10,7 km/l (cidade, gasolina)' },
    recolor: null, // pintura cinza: a foto não permite trocar a cor com fidelidade
    lights: [[0.385, 0.41, 1], [0.035, 0.47, 0.6]],
    hotspots: [
      { uv: [0.15, 0.43], title: 'Grade de 7 fendas', text: 'A assinatura Jeep, com acabamento escurecido exclusivo da série S.' },
      { uv: [0.38, 0.41], title: 'Faróis Full LED', text: 'Projetores em LED com DRL integrado e assistente de farol alto.' },
      { uv: [0.6, 0.92], title: 'Teto solar panorâmico', text: 'Teto preto com abertura elétrica e cortina, e iluminação ambiente na cabine.' },
      { uv: [0.52, 0.17], title: 'Rodas aro 19', text: 'Rodas escurecidas e suspensão calibrada para conforto e estabilidade.' },
    ],
    glb: 'models/jeep-compass.glb',
    glbLength: 4.4,
    paintMetal: 0.2,
    paintRough: 0.34,
    lights3d: [[2.13, 0.93, 0.66, 1], [2.13, 0.93, -0.66, 1]],
    hotspots3d: [[2.22, 0.86, 0.0], [2.13, 0.95, 0.66], [-0.4, 1.68, 0.0], [1.28, 0.42, 0.95]],
    colors: [
      { name: 'Cinza Sting', hex: '#7b7e81' },
      { name: 'Branco Polar', hex: '#ecedeb' },
      { name: 'Preto Carbon', hex: '#0c0d0f' },
      { name: 'Azul Jazz', hex: '#1d3557' },
      { name: 'Vermelho Colorado', hex: '#7e1316' },
    ],
  },
  {
    id: 'mclaren',
    badge: 'Carros Premium',
    brand: 'McLaren',
    name: '720S Spider',
    tag: 'Superesportivo conversível',
    year: 2023,
    price: 3490000,
    photo: 'assets/mclaren-720s-spider.webp',
    photoBg: 'dark',
    cutout: 'assets/mclaren-cut.webp',
    size: 5.3,
    bright: 1.18,
    desc: 'V8 4.0 biturbo de 720 cv, monocoque em fibra de carbono e teto retrátil em 11 segundos. Uma máquina de pista feita para o céu aberto.',
    specs: { hp: 720, acc: 2.9, top: 341, torque: 78.5 },
    specLabels: { engine: 'V8 4.0 biturbo', trans: 'Automatizado 7 marchas', fuel: 'Teto rígido retrátil' },
    recolor: { mask: 'assets/mclaren-paint.webp', baseDiff: 0.23 },
    lights: [[0.33, 0.5, 1], [0.035, 0.52, 0.5]],
    hotspots: [
      { uv: [0.33, 0.5], title: 'Faróis "eye socket"', text: 'Os faróis escavados também funcionam como entrada de ar para os radiadores.' },
      { uv: [0.56, 0.88], title: 'Teto rígido retrátil', text: 'Abre ou fecha em 11 segundos, mesmo em movimento até 50 km/h.' },
      { uv: [0.68, 0.5], title: 'Entradas laterais', text: 'Esculpidas na porta diédrica, levam ar ao V8 4.0 biturbo de 720 cv.' },
      { uv: [0.53, 0.3], title: 'Freios carbono-cerâmica', text: 'De 200 a 0 km/h em apenas 117 metros, com Monocage II em fibra de carbono.' },
    ],
    glb: 'models/mclaren-720s.glb',
    glbLength: 4.54,
    lights3d: [[2.02, 0.6, 0.68, 0.8], [2.02, 0.6, -0.68, 0.8]],
    hotspots3d: [[2.02, 0.62, 0.66], [-0.25, 1.1, 0.0], [-0.35, 0.58, 0.96], [1.21, 0.4, 0.98]],
    colors: [
      { name: 'Azul Belize', hex: '#138a9c' },
      { name: 'Laranja Papaya', hex: '#ff6a00' },
      { name: 'Verde Mantis', hex: '#5fb526' },
      { name: 'Roxo Lantana', hex: '#5a2a82' },
      { name: 'Vermelho Memphis', hex: '#b0141c' },
    ],
  },
];

// ======================= Texturas auxiliares =======================
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(255,245,225,0.75)');
  grd.addColorStop(0.5, 'rgba(255,220,170,0.15)');
  grd.addColorStop(1, 'rgba(255,200,150,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const GLOW = glowTexture();

// ======================= Carro a partir da foto =======================
const photoVert = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const photoFrag = `
uniform sampler2D map;
uniform sampler2D uMaskTex;
uniform float uReveal, uHolo, uGlow, uSweep, uTime, uDrive, uRecolor, uBright, uBaseDiff;
uniform vec3 uTarget;
varying vec2 vUv;
void main() {
  vec4 tex = texture2D(map, vUv);
  if (uDrive > 0.01) {
    vec4 acc = tex;
    for (int i = 1; i < 4; i++) acc += texture2D(map, vUv + vec2(float(i) * 0.0025 * uDrive, 0.0));
    tex = acc / 4.0;
  }
  vec3 col = tex.rgb;
  if (uRecolor > 0.001) {
    // separa reflexo (componente branca) da cor da pintura e aplica a nova cor
    float m = texture2D(uMaskTex, vUv).r;
    float spec = min(col.r, min(col.g, col.b));
    vec3 diff = col - spec;
    float shade = max(diff.r, max(diff.g, diff.b)) / uBaseDiff;
    vec3 nc = uTarget * shade + spec;
    col = mix(col, nc, m * uRecolor);
  }
  float a = tex.a;
  float edge = vUv.y - uReveal;
  float shown = 1.0 - smoothstep(-0.002, 0.004, edge);
  vec3 gold = vec3(0.35, 0.75, 2.2); // azul elétrico da marca
  float scan = 0.55 + 0.45 * sin(vUv.y * 520.0 - uTime * 8.0);
  vec3 holo = gold * scan * 0.5;
  float band = exp(-abs(edge) * 70.0) * uGlow;
  float sweep = exp(-pow((vUv.x * 0.8 + vUv.y * 0.55 - uSweep) * 7.0, 2.0)) * 0.45;
  vec3 photo = col * uBright + vec3(sweep) * smoothstep(0.5, 1.0, a);
  vec3 outc = mix(holo, photo, shown) + gold * band * 2.2;
  float alpha = a * max(shown, uHolo * 0.55) + band * a;
  gl_FragColor = vec4(outc, clamp(alpha, 0.0, 1.0));
  #include <colorspace_fragment>
}`;

export async function buildPhotoCar(model, loader) {
  const tex = await loader.loadAsync(model.cutout);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const img = tex.image;
  const W = model.size;
  const H = (W * img.height) / img.width;

  const uniforms = {
    map: { value: tex },
    uReveal: { value: 2 }, uHolo: { value: 0 }, uGlow: { value: 0 }, uSweep: { value: -1 }, uTime: { value: 0 },
    uDrive: { value: 0 }, uBright: { value: model.bright || 1 },
    uRecolor: { value: 0 }, uTarget: { value: new THREE.Color() }, uMaskTex: { value: null }, uBaseDiff: { value: 1 },
  };
  if (model.recolor) {
    const maskTex = await loader.loadAsync(model.recolor.mask);
    maskTex.colorSpace = THREE.NoColorSpace;
    uniforms.uMaskTex.value = maskTex;
    uniforms.uBaseDiff.value = model.recolor.baseDiff;
  }
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: photoVert, fragmentShader: photoFrag, transparent: true, depthWrite: false });
  const geo = new THREE.PlaneGeometry(W, H);
  geo.translate(0, H / 2, 0);
  const plane = new THREE.Mesh(geo, mat);
  plane.renderOrder = 3;

  const car = new THREE.Group();
  car.name = model.id;
  const pivot = new THREE.Group(); // gira para a câmera (billboard)
  car.add(pivot);
  pivot.add(plane);

  // brilho dos faróis + reflexo de lente horizontal
  const glows = [];
  for (const [u, v, k] of model.lights) {
    const glowMat = new THREE.MeshBasicMaterial({ map: GLOW, color: new THREE.Color(1.6, 1.5, 1.35), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const g = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat);
    g.position.set((u - 0.5) * W, v * H, 0.03);
    g.scale.setScalar(0.55 * k);
    g.renderOrder = 4;
    const flare = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat.clone());
    flare.scale.set(3.2 * k, 0.07, 1);
    flare.position.copy(g.position);
    flare.renderOrder = 4;
    pivot.add(g, flare);
    glows.push({ g, flare, k });
  }

  const api = {
    model,
    kind: 'photo',
    billboard: true,
    pivot,
    wheels: [],
    height: H,
    length: W,
    width: 1.8,
    holoMat: { opacity: 0, visible: false },
    hotspots: model.hotspots.map((h) => ({ ...h, pos: new THREE.Vector3((h.uv[0] - 0.5) * W, h.uv[1] * H, 0.05) })),
    setClip(h) { uniforms.uReveal.value = h / H; },
    setGlow(v) { uniforms.uGlow.value = v; },
    update(t, drive) {
      uniforms.uTime.value = t;
      uniforms.uHolo.value = api.holoMat.opacity * 8;
      uniforms.uDrive.value = drive;
    },
    sweep(duration = 1.4) {
      gsap.fromTo(uniforms.uSweep, { value: -0.4 }, { value: 1.8, duration, ease: 'power2.inOut' });
    },
    canRecolor: !!model.recolor,
    setColor(hex, index) {
      if (!model.recolor) return;
      const target = new THREE.Color(hex);
      if (index === 0) {
        gsap.to(uniforms.uRecolor, { value: 0, duration: 0.8, ease: 'power2.inOut' });
      } else {
        const from = uniforms.uRecolor.value > 0.01 ? uniforms.uTarget.value.clone() : target.clone();
        const o = { t: 0 };
        gsap.to(o, { t: 1, duration: 0.8, ease: 'power2.inOut', onUpdate: () => uniforms.uTarget.value.copy(from).lerp(target, o.t) });
        gsap.to(uniforms.uRecolor, { value: 1, duration: 0.8, ease: 'power2.inOut' });
      }
      api.sweep(1.2);
    },
    setLights(on) {
      glows.forEach(({ g, flare, k }, i) => {
        gsap.to(g.material, { opacity: on ? 1 : 0, duration: 0.35, delay: i * 0.04 });
        gsap.to(flare.material, { opacity: on ? 0.9 * k : 0, duration: 0.5, delay: i * 0.04 });
        gsap.to(g.scale, { x: (on ? 0.75 : 0.55) * k, y: (on ? 0.75 : 0.55) * k, duration: 0.5 });
        if (on) gsap.fromTo(g.material, { opacity: 0.1 }, { opacity: 1, duration: 0.07, repeat: 3, yoyo: true });
      });
    },
  };
  car.userData.api = api;
  return car;
}

// ======================= Modelo .glb real =======================
const RX = {
  paint: /(car_?paint|paint|body|lataria|pintura|carroceria|exterior)/i,
  glass: /(glass|window|vidro|windshield)/i,
  wheel: /(wheel|roda)/i,
  tail: /(tail|brake|rear_?light|lanterna)/i,
  head: /(head_?light|farol|drl|front_?light|lamp)/i,
};

export async function loadGLBCar(model, gltf) {
  const root = gltf.scene;
  root.rotation.y = model.glbRotationY || 0;
  root.updateMatrixWorld(true);
  let bbox = new THREE.Box3().setFromObject(root);
  const size = bbox.getSize(new THREE.Vector3());
  root.scale.multiplyScalar((model.glbLength || 4.4) / Math.max(size.x, 0.001));
  root.updateMatrixWorld(true);
  bbox = new THREE.Box3().setFromObject(root);
  const c = bbox.getCenter(new THREE.Vector3());
  root.position.sub(new THREE.Vector3(c.x, bbox.min.y, c.z));
  const car = new THREE.Group();
  car.add(root);
  car.updateMatrixWorld(true);
  const dims = new THREE.Box3().setFromObject(car).getSize(new THREE.Vector3());

  const heads = [];
  const tails = [];
  let paint = null; // eslint-disable-line prefer-const
  let paintArea = 0;
  const wheelNodes = [];
  root.traverse((o) => {
    if (wheelNodes.length < 4 && RX.wheel.test(o.name) && !wheelNodes.some((w) => isAncestor(w, o))) wheelNodes.push(o);
    if (!o.isMesh) return;
    o.castShadow = true;
    o.material = Array.isArray(o.material) ? o.material.map((mm) => mm.clone()) : o.material.clone();
    for (const mat of Array.isArray(o.material) ? o.material : [o.material]) {
      const n = `${o.name} ${mat.name}`;
      if (RX.tail.test(n)) tails.push(mat);
      else if (RX.head.test(n)) heads.push(mat);
      if (RX.paint.test(n) && !RX.glass.test(n)) {
        const s = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
        if (s.x * s.y + s.x * s.z > paintArea) { paint = mat; paintArea = s.x * s.y + s.x * s.z; }
      }
    }
  });
  heads.forEach((m) => { m.emissive?.set(0xfff4e0); m.emissiveIntensity = 1.2; });
  tails.forEach((m) => m.emissive?.set(0xff1418));

  // pintura automotiva: metálico com verniz (clearcoat) e cor inicial do catálogo
  if (paint) {
    const car_paint = new THREE.MeshPhysicalMaterial({
      name: paint.name, color: new THREE.Color(model.colors[0].hex),
      metalness: model.paintMetal ?? 0.45, roughness: model.paintRough ?? 0.32,
      clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.25,
      side: paint.side, // alguns modelos têm painéis com a face invertida
    });
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (Array.isArray(o.material)) o.material = o.material.map((mm) => (mm === paint ? car_paint : mm));
      else if (o.material === paint) o.material = car_paint;
    });
    paint = car_paint;
  }
  // vidros mais escuros e reflexivos
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    if (o.material.transparent && /window|glass|vidro|mat_4_/i.test(o.material.name)) {
      o.material.metalness = 0.6; o.material.roughness = 0.05; o.material.envMapIntensity = 1.4;
    }
  });

  const wheels = wheelNodes.map((node) => {
    const center = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
    const pivot = new THREE.Group();
    node.parent.add(pivot);
    pivot.position.copy(node.parent.worldToLocal(center));
    pivot.attach(node);
    return pivot;
  });

  // recorte para o efeito de materialização
  const solidPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10);
  const holoPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -10);
  const meshes = [];
  car.traverse((x) => { if (x.isMesh) meshes.push(x); });
  const mats = new Set();
  meshes.forEach((x) => (Array.isArray(x.material) ? x.material : [x.material]).forEach((mm) => mats.add(mm)));
  mats.forEach((mm) => { mm.clippingPlanes = [solidPlane]; mm.clipShadows = true; });
  const holoMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.3, 0.7, 2.0), wireframe: true, transparent: true, opacity: 0, visible: false,
    blending: THREE.AdditiveBlending, depthWrite: false, clippingPlanes: [holoPlane],
  });
  meshes.forEach((x) => { const h = new THREE.Mesh(x.geometry, holoMat); h.castShadow = false; x.add(h); });

  // brilho dos faróis + reflexo de lente
  const glows = [];
  for (const [x, y, z, k] of model.lights3d || []) {
    const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: new THREE.Color(1.6, 1.5, 1.35), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.position.set(x + 0.04, y, z);
    g.scale.setScalar(0.5 * k);
    const f = new THREE.Sprite(g.material.clone());
    f.position.copy(g.position);
    f.scale.set(2.6 * k, 0.06, 1);
    g.renderOrder = f.renderOrder = 4;
    car.add(g, f);
    glows.push({ g, f, k });
  }

  const api = {
    model,
    kind: 'glb',
    billboard: false,
    wheels,
    height: dims.y + 0.1,
    length: dims.x,
    width: dims.z,
    holoMat,
    hotspots: model.hotspots.map((h, i) => ({ ...h, pos: model.hotspots3d ? new THREE.Vector3(...model.hotspots3d[i]) : new THREE.Vector3(dims.x * 0.3, dims.y * 0.5, dims.z * 0.45) })),
    setClip(h) { solidPlane.constant = h; holoPlane.constant = -h; },
    setGlow() {},
    update() {},
    sweep() {},
    canRecolor: !!paint,
    setColor(hex) {
      if (!paint) return;
      const target = new THREE.Color(hex);
      const from = paint.color.clone();
      const o = { t: 0 };
      gsap.to(o, { t: 1, duration: 0.9, ease: 'power2.inOut', onUpdate: () => paint.color.copy(from).lerp(target, o.t) });
    },
    setLights(on) {
      gsap.to(heads, { emissiveIntensity: on ? 6 : 1.2, duration: 0.4 });
      gsap.to(tails, { emissiveIntensity: on ? 4 : 1, duration: 0.4 });
      glows.forEach(({ g, f, k }, i) => {
        gsap.to(g.material, { opacity: on ? 1 : 0, duration: 0.35, delay: i * 0.05 });
        gsap.to(f.material, { opacity: on ? 0.85 * k : 0, duration: 0.5, delay: i * 0.05 });
        if (on) gsap.fromTo(g.material, { opacity: 0.1 }, { opacity: 1, duration: 0.07, repeat: 3, yoyo: true });
      });
    },
  };
  car.userData.api = api;
  return car;
}

function isAncestor(a, b) {
  let p = b.parent;
  while (p) { if (p === a) return true; p = p.parent; }
  return false;
}
