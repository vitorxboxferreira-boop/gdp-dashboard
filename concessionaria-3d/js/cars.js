// Modelos 3D procedurais dos veículos (nenhum arquivo externo necessário)
import * as THREE from 'three';

export const MODELS = [
  {
    id: 'aurora',
    name: 'Aurora GT',
    tag: 'Superesportivo',
    year: 2027,
    price: 1289000,
    desc: 'V8 biturbo híbrido de 640 cv, monocoque em fibra de carbono e aerodinâmica ativa que se adapta a cada curva.',
    specs: { hp: 640, acc: 2.9, top: 330, torque: 78 },
    caliper: '#f2b632',
    rim: 0x1a1b1f,
    colors: [
      { name: 'Vermelho Rosso', hex: '#a50f17' },
      { name: 'Amarelo Solar', hex: '#e49b0f' },
      { name: 'Azul Abissal', hex: '#0f2a66' },
      { name: 'Branco Pérola', hex: '#e6e6e2' },
      { name: 'Preto Ônix', hex: '#0a0b0e' },
    ],
  },
  {
    id: 'vanta',
    name: 'Vanta S',
    tag: 'Sedã Esportivo',
    year: 2027,
    price: 689000,
    desc: 'Elegância executiva com alma de pista: 510 cv, suspensão pneumática adaptativa e cabine silenciosa como um estúdio.',
    specs: { hp: 510, acc: 3.8, top: 290, torque: 66 },
    caliper: '#c81d25',
    rim: 0xb9bcc2,
    colors: [
      { name: 'Grafite Lunar', hex: '#3a3f47' },
      { name: 'Azul Abissal', hex: '#0f2a66' },
      { name: 'Prata Ártico', hex: '#b8bcc4' },
      { name: 'Verde Imperial', hex: '#0f3b2c' },
      { name: 'Preto Ônix', hex: '#0a0b0e' },
    ],
  },
  {
    id: 'titan',
    name: 'Titan X',
    tag: 'SUV Premium',
    year: 2027,
    price: 849000,
    desc: 'Presença imponente, tração integral inteligente e 580 cv. Luxo para sete pessoas, em qualquer terreno.',
    specs: { hp: 580, acc: 4.2, top: 260, torque: 81 },
    caliper: '#2a62ff',
    rim: 0x2a2c31,
    colors: [
      { name: 'Branco Pérola', hex: '#e6e6e2' },
      { name: 'Preto Ônix', hex: '#0a0b0e' },
      { name: 'Bronze Deserto', hex: '#6e5232' },
      { name: 'Grafite Lunar', hex: '#3a3f47' },
      { name: 'Vermelho Rosso', hex: '#a50f17' },
    ],
  },
];

// ---------- Perfis laterais de carroceria ----------
function underside(s, b) {
  const { L, xr, xf, R, A, bottom } = b;
  s.moveTo(L[0], bottom + 0.06);
  s.lineTo(xr - A, bottom);
  s.lineTo(xr - A, R);
  s.absarc(xr, R, A, Math.PI, 0, true);
  s.lineTo(xr + A, bottom);
  s.lineTo(xf - A, bottom);
  s.lineTo(xf - A, R);
  s.absarc(xf, R, A, Math.PI, 0, true);
  s.lineTo(xf + A, bottom);
  s.lineTo(L[1], bottom + 0.04);
}

const BODIES = {
  aurora: {
    L: [-2.28, 2.25], W: 1.98, R: 0.36, A: 0.47, xr: -1.42, xf: 1.38, bottom: 0.22, bev: 0.16,
    body(s) {
      s.quadraticCurveTo(2.44, 0.26, 2.42, 0.44);
      s.quadraticCurveTo(2.36, 0.6, 1.95, 0.68);
      s.quadraticCurveTo(1.3, 0.8, 0.8, 0.86);
      s.lineTo(-1.2, 0.9);
      s.quadraticCurveTo(-1.9, 0.93, -2.26, 0.99);
      s.lineTo(-2.38, 0.92);
      s.quadraticCurveTo(-2.44, 0.6, -2.28, 0.28);
    },
    cabin(s) {
      s.moveTo(1.02, 0.78);
      s.quadraticCurveTo(0.42, 1.17, -0.15, 1.2);
      s.lineTo(-0.55, 1.2);
      s.quadraticCurveTo(-1.3, 1.13, -1.98, 0.86);
      s.lineTo(1.02, 0.78);
    },
    cabinW: 1.4,
    head: { x: 2.12, y: 0.6, rz: -0.42, len: 0.36, z: 0.62, w: 0.46 },
    tail: { x: -2.36, y: 0.82, w: 1.74 },
    intake: { x: 2.38, y: 0.36, w: 1.5, h: 0.12 },
    mirror: { x: 0.78, y: 0.94 },
    wing: true,
    spokes: 10,
    roof: 1.2,
  },
  vanta: {
    L: [-2.4, 2.38], W: 1.94, R: 0.37, A: 0.48, xr: -1.48, xf: 1.5, bottom: 0.27, bev: 0.17,
    body(s) {
      s.quadraticCurveTo(2.54, 0.3, 2.52, 0.55);
      s.quadraticCurveTo(2.47, 0.75, 2.1, 0.81);
      s.quadraticCurveTo(1.4, 0.9, 0.95, 0.95);
      s.lineTo(-1.35, 0.99);
      s.quadraticCurveTo(-2.1, 1.01, -2.46, 0.96);
      s.quadraticCurveTo(-2.56, 0.62, -2.4, 0.33);
    },
    cabin(s) {
      s.moveTo(1.08, 0.86);
      s.quadraticCurveTo(0.5, 1.39, -0.1, 1.43);
      s.lineTo(-0.6, 1.43);
      s.quadraticCurveTo(-1.5, 1.37, -2.05, 0.94);
      s.lineTo(1.08, 0.86);
    },
    cabinW: 1.52,
    head: { x: 2.3, y: 0.72, rz: -0.3, len: 0.36, z: 0.62, w: 0.44 },
    tail: { x: -2.47, y: 0.86, w: 1.72 },
    intake: { x: 2.5, y: 0.45, w: 1.1, h: 0.2 },
    mirror: { x: 0.92, y: 1.04 },
    spokes: 5,
    roof: 1.43,
  },
  titan: {
    L: [-2.38, 2.4], W: 2.04, R: 0.42, A: 0.54, xr: -1.5, xf: 1.52, bottom: 0.4, bev: 0.18,
    body(s) {
      s.quadraticCurveTo(2.56, 0.45, 2.53, 0.8);
      s.quadraticCurveTo(2.5, 1.08, 2.2, 1.12);
      s.quadraticCurveTo(1.6, 1.2, 1.05, 1.24);
      s.lineTo(-1.8, 1.28);
      s.quadraticCurveTo(-2.35, 1.3, -2.46, 1.22);
      s.quadraticCurveTo(-2.53, 0.8, -2.38, 0.46);
    },
    cabin(s) {
      s.moveTo(1.18, 1.16);
      s.quadraticCurveTo(0.62, 1.7, 0.2, 1.79);
      s.lineTo(-1.82, 1.81);
      s.quadraticCurveTo(-2.32, 1.79, -2.42, 1.2);
      s.lineTo(1.18, 1.16);
    },
    cabinW: 1.7,
    head: { x: 2.4, y: 1.0, rz: -0.12, len: 0.3, z: 0.66, w: 0.46 },
    tail: { x: -2.47, y: 1.14, w: 1.8 },
    intake: { x: 2.55, y: 0.66, w: 1.3, h: 0.28 },
    mirror: { x: 1.05, y: 1.34 },
    rails: true,
    spokes: 6,
    roof: 1.81,
  },
};

// ---------- Materiais ----------
function makeMaterials(model) {
  return {
    paint: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(model.colors[0].hex),
      metalness: 0.55,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x05070a, metalness: 0.3, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0,
    }),
    trim: new THREE.MeshStandardMaterial({ color: 0x0b0c0e, metalness: 0.4, roughness: 0.45 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.12 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0d0d0f, metalness: 0, roughness: 0.85, side: THREE.DoubleSide }),
    rim: new THREE.MeshStandardMaterial({ color: model.rim, metalness: 1, roughness: 0.28, side: THREE.DoubleSide }),
    disc: new THREE.MeshStandardMaterial({ color: 0x55585e, metalness: 0.9, roughness: 0.4 }),
    caliper: new THREE.MeshStandardMaterial({ color: new THREE.Color(model.caliper), metalness: 0.3, roughness: 0.35 }),
    well: new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 1, side: THREE.DoubleSide }),
    head: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 2.2 }),
    tail: new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff1418, emissiveIntensity: 2.6 }),
  };
}

function extrude(shape, width, bev, segs = 10) {
  const depth = width - bev * 2;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bev,
    bevelSize: bev * 0.6,
    bevelOffset: -bev * 0.6,
    bevelSegments: segs,
    curveSegments: 40,
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

function buildWheel(R, width, m, spokes) {
  const wheel = new THREE.Group();
  const spin = new THREE.Group();
  wheel.add(spin);
  const hw = width / 2;
  const rimR = R * 0.66;

  // pneu (perfil arredondado)
  const p = [
    [rimR, -hw + 0.01], [R - 0.06, -hw], [R - 0.015, -hw + 0.03], [R, -hw + 0.07],
    [R, hw - 0.07], [R - 0.015, hw - 0.03], [R - 0.06, hw], [rimR, hw - 0.01],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const tireGeo = new THREE.LatheGeometry(p, 64);
  tireGeo.rotateX(Math.PI / 2);
  spin.add(new THREE.Mesh(tireGeo, m.rubber));

  // tambor da roda
  const barrel = new THREE.CylinderGeometry(rimR, rimR, width * 0.86, 48, 1, true);
  barrel.rotateX(Math.PI / 2);
  spin.add(new THREE.Mesh(barrel, m.rim));

  // aro externo
  const lip = new THREE.Mesh(new THREE.TorusGeometry(rimR, 0.016, 10, 64), m.chrome);
  lip.position.z = hw * 0.8;
  spin.add(lip);

  // raios
  const spokeGeo = new THREE.BoxGeometry(rimR * 0.92, 0.055, 0.035);
  spokeGeo.translate(rimR * 0.46, 0, 0);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const s = new THREE.Mesh(spokeGeo, m.rim);
    s.rotation.z = a;
    s.position.z = hw * 0.72;
    spin.add(s);
    if (spokes <= 6) {
      const s2 = s.clone();
      s2.rotation.z = a + 0.16;
      spin.add(s2);
    }
  }
  const hubGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.06, 24);
  hubGeo.rotateX(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, m.chrome);
  hub.position.z = hw * 0.75;
  spin.add(hub);

  // disco de freio
  const discGeo = new THREE.CylinderGeometry(rimR * 0.82, rimR * 0.82, 0.03, 40);
  discGeo.rotateX(Math.PI / 2);
  const disc = new THREE.Mesh(discGeo, m.disc);
  disc.position.z = hw * 0.25;
  spin.add(disc);

  // pinça (não gira)
  const cal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.24, 0.09), m.caliper);
  const ca = 2.4;
  cal.position.set(Math.cos(ca) * rimR * 0.68, Math.sin(ca) * rimR * 0.68, hw * 0.35);
  cal.rotation.z = ca;
  wheel.add(cal);

  return { wheel, spin };
}

export function buildCar(model) {
  const b = BODIES[model.id];
  const m = makeMaterials(model);
  const car = new THREE.Group();
  car.name = model.id;

  // carroceria
  const s = new THREE.Shape();
  underside(s, b);
  b.body(s);
  const body = new THREE.Mesh(extrude(s, b.W, b.bev, 12), m.paint);
  car.add(body);

  // cabine envidraçada
  const cs = new THREE.Shape();
  b.cabin(cs);
  car.add(new THREE.Mesh(extrude(cs, b.cabinW, 0.13, 10), m.glass));

  // caixas de roda internas
  const wellGeo = new THREE.CylinderGeometry(b.A - 0.02, b.A - 0.02, b.W - 0.1, 32, 1, true, Math.PI / 2, Math.PI);
  wellGeo.rotateX(Math.PI / 2);
  for (const x of [b.xr, b.xf]) {
    const w = new THREE.Mesh(wellGeo, m.well);
    w.position.set(x, b.R, 0);
    car.add(w);
  }

  // saia lateral / assoalho
  const skirtLen = b.xf - b.xr - b.A * 2;
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(skirtLen, 0.08, b.W + 0.02), m.trim);
  skirt.position.set((b.xr + b.xf) / 2, b.bottom + 0.02, 0);
  car.add(skirt);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(b.L[1] - b.L[0] - 0.3, 0.05, b.W - 0.2), m.trim);
  floor.position.set((b.L[0] + b.L[1]) / 2, b.bottom + 0.03, 0);
  car.add(floor);

  // entrada de ar dianteira
  const intake = new THREE.Mesh(new THREE.BoxGeometry(0.16, b.intake.h, b.intake.w), m.trim);
  intake.position.set(b.intake.x - 0.06, b.intake.y, 0);
  car.add(intake);

  // faróis (DRL)
  const headGeo = new THREE.BoxGeometry(b.head.len, 0.032, b.head.w);
  for (const sz of [1, -1]) {
    const h = new THREE.Mesh(headGeo, m.head);
    h.position.set(b.head.x, b.head.y, sz * b.head.z);
    h.rotation.z = b.head.rz;
    h.userData.noHolo = true;
    car.add(h);
  }

  // lanterna traseira em barra
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, b.tail.w), m.tail);
  tail.position.set(b.tail.x, b.tail.y, 0);
  tail.userData.noHolo = true;
  car.add(tail);

  // retrovisores
  const mirGeo = new THREE.BoxGeometry(0.16, 0.08, 0.2);
  for (const sz of [1, -1]) {
    const mir = new THREE.Mesh(mirGeo, m.paint);
    mir.position.set(b.mirror.x, b.mirror.y - 0.03, sz * (b.W / 2 - 0.02));
    car.add(mir);
  }

  // aerofólio
  if (b.wing) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 1.76), m.trim);
    wing.position.set(-2.05, 1.16, 0);
    wing.rotation.z = 0.06;
    car.add(wing);
    for (const sz of [0.55, -0.55]) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.03), m.trim);
      st.position.set(-2.02, 1.04, sz);
      car.add(st);
    }
  }

  // racks de teto (SUV)
  if (b.rails) {
    for (const sz of [0.66, -0.66]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.04, 0.05), m.chrome);
      r.position.set(-0.8, b.roof + 0.09, sz);
      car.add(r);
    }
  }

  // rodas
  const wheels = [];
  const tireW = 0.3;
  for (const x of [b.xr, b.xf]) {
    for (const sz of [1, -1]) {
      const { wheel, spin } = buildWheel(b.R, tireW, m, b.spokes);
      wheel.position.set(x, b.R, sz * (b.W / 2 - tireW / 2 + 0.01));
      if (sz < 0) wheel.scale.z = -1;
      car.add(wheel);
      wheels.push(spin);
    }
  }

  // ---------- holograma + recorte (efeito "scanner") ----------
  const solidPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10);
  const holoPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -10);
  Object.values(m).forEach((mat) => { mat.clippingPlanes = [solidPlane]; });

  const holoMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.6, 1.1, 0.45),
    wireframe: true,
    visible: false,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    clippingPlanes: [holoPlane],
  });

  const meshes = [];
  car.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    o.castShadow = true;
    if (o.userData.noHolo) continue;
    const h = new THREE.Mesh(o.geometry, holoMat);
    h.renderOrder = 2;
    o.add(h);
  }

  // feixes de luz dos faróis
  const coneGeo = new THREE.ConeGeometry(1.1, 5, 32, 1, true);
  coneGeo.rotateZ(Math.PI / 2);
  coneGeo.translate(2.5, 0, 0);
  const coneMat = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uOpacity; varying vec2 vUv; void main(){ float a = pow(vUv.y, 2.5) * uOpacity; gl_FragColor = vec4(vec3(1.0,0.95,0.85) * a, a); }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const cones = [];
  for (const sz of [1, -1]) {
    const c = new THREE.Mesh(coneGeo, coneMat);
    c.position.set(b.head.x + 0.1, b.head.y, sz * b.head.z);
    c.rotation.z = -0.12;
    c.visible = false;
    car.add(c);
    cones.push(c);
  }

  const height = b.roof + 0.25;
  const api = {
    model,
    materials: m,
    wheels,
    cones,
    coneMat,
    holoMat,
    height,
    length: b.L[1] - b.L[0],
    width: b.W,
    setClip(h) {
      solidPlane.constant = h;
      holoPlane.constant = -h;
    },
    hotspots: [
      { key: 'head', pos: new THREE.Vector3(b.head.x, b.head.y + 0.05, b.head.z), title: 'Faróis Matrix LED', text: 'Feixe adaptativo de 1,2 milhão de pixels que desenha a estrada à sua frente.' },
      { key: 'wheel', pos: new THREE.Vector3(b.xf, b.R + 0.1, b.W / 2 + 0.05), title: 'Freios carbono-cerâmica', text: 'Pinças de 10 pistões e discos de 410 mm. De 100 a 0 km/h em 29 metros.' },
      { key: 'cabin', pos: new THREE.Vector3(-0.3, b.roof, 0), title: 'Teto panorâmico', text: 'Vidro eletrocrômico que escurece com um toque, com proteção UV e térmica.' },
      { key: 'tail', pos: new THREE.Vector3(b.tail.x, b.tail.y, 0.5), title: 'Assinatura luminosa', text: 'Lanterna em barra contínua com animação de boas-vindas.' },
    ],
  };
  api.setClip(10);
  car.userData.api = api;
  return car;
}
