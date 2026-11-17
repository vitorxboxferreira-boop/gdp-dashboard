// Prepara um modelo de carro para o site: frente em +X, tamanho real, piso em y=0,
// 4 rodas separadas (nós Wheel_*), peças unidas, texturas WebP e compressão Meshopt.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, join, weld, textureCompress, meshopt, transformMesh } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { mat4, vec3 } from 'gl-matrix';

const [, , input, output, mode] = process.argv;
const CFG = {
  compass: {
    length: 4.4,
    isWheel: (n) => ['Object_10', 'Object_11', 'Object_39', 'Object_40'].includes(n.getName()),
    renameMat: { Jeep_Compass_mat_13_1: 'Paint' },
    front: null, // detectado: maior Z = frente (grade)
    frontSign: +1,
  },
  mclaren: {
    length: 4.54,
    isWheel: (n) => hasAncestor(n, 'Wheel1A_3D'),
    renameMat: { McLaren_720SSpiderRewardRecycled_2019LightEmissiveA_Material: 'Headlight_Emissive' },
    engine: 'Engine_Geo_lodA', // motor central-traseiro: indica a traseira
  },
}[mode];

function hasAncestor(n, name) {
  let p = n.getParentNode();
  while (p) { if (p.getName() === name) return true; p = p.getParentNode(); }
  return false;
}

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(input);
const root = doc.getRoot();
const scene = root.listScenes()[0];

// 1) coleta nós com malha e suas matrizes de mundo
const items = [];
scene.traverse((node) => { if (node.getMesh()) items.push({ node, world: node.getWorldMatrix(), wheel: CFG.isWheel(node), name: node.getName() }); });

// bbox geral
const v = vec3.create();
function eachPos(prim, m, fn) {
  const pos = prim.getAttribute('POSITION');
  const el = [0, 0, 0];
  for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, el); vec3.transformMat4(v, el, m); fn(v, i); }
}
const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
let engineC = null;
for (const it of items) {
  const emn = [Infinity, Infinity, Infinity], emx = [-Infinity, -Infinity, -Infinity];
  for (const prim of it.node.getMesh().listPrimitives()) eachPos(prim, it.world, (p) => { for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); emn[k] = Math.min(emn[k], p[k]); emx[k] = Math.max(emx[k], p[k]); } });
  if (CFG.engine && hasAncestor(it.node, CFG.engine)) engineC = emn.map((a, k) => (a + emx[k]) / 2);
}
const size = mx.map((a, k) => a - mn[k]);
const center = mn.map((a, k) => (a + mx[k]) / 2);
const upAxis = 1;
const lenAxis = size[0] >= size[2] ? 0 : 2;
console.log('bbox size', size.map((x) => x.toFixed(3)), 'length axis', 'xyz'[lenAxis]);

// sinal da frente ao longo do eixo do comprimento
let frontSign = CFG.frontSign ?? 1;
if (engineC) frontSign = engineC[lenAxis] > center[lenAxis] ? -1 : 1;
console.log('front sign', frontSign);

// 2) matriz global G: centraliza, gira (frente -> +X), escala para o tamanho real, piso em y=0
const s = CFG.length / size[lenAxis];
const G = mat4.create();
mat4.scale(G, G, [s, s, s]);
// rotação em Y levando (eixo do comprimento * frontSign) para +X
let ang = 0;
if (lenAxis === 0) ang = frontSign > 0 ? 0 : Math.PI;
else ang = frontSign > 0 ? Math.PI / 2 : -Math.PI / 2; // +Z -> +X é +90°
const Gr = mat4.fromYRotation(mat4.create(), ang);
const T = mat4.fromTranslation(mat4.create(), [-center[0], -mn[1], -center[2]]);
mat4.multiply(G, G, Gr);
mat4.multiply(G, G, T);

// 3) recria a cena achatada com a geometria já transformada
const newScene = doc.createScene('Scene');
const wheelPrims = [];
const body = doc.createNode('Body');
newScene.addChild(body);
for (const it of items) {
  const W = mat4.multiply(mat4.create(), G, it.world);
  const src = it.node.getMesh();
  const mesh = doc.createMesh(src.getName());
  for (const p of src.listPrimitives()) mesh.addPrimitive(p.clone());
  transformMesh(mesh, W, false);
  if (it.wheel) wheelPrims.push(...mesh.listPrimitives());
  else body.addChild(doc.createNode(it.name).setMesh(mesh));
}

// 4) separa as rodas por canto (sinal de X e Z)
const corners = {};
for (const prim of wheelPrims) {
  const pos = prim.getAttribute('POSITION');
  let idx = prim.getIndices();
  const count = idx ? idx.getCount() : pos.getCount();
  const get = (i) => (idx ? idx.getScalar(i) : i);
  const groups = {};
  const a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0];
  for (let t = 0; t < count; t += 3) {
    const i0 = get(t), i1 = get(t + 1), i2 = get(t + 2);
    pos.getElement(i0, a); pos.getElement(i1, b); pos.getElement(i2, c);
    const key = ((a[0] + b[0] + c[0]) > 0 ? 'F' : 'R') + ((a[2] + b[2] + c[2]) > 0 ? 'L' : 'D');
    (groups[key] ||= []).push(i0, i1, i2);
  }
  for (const [key, list] of Object.entries(groups)) {
    const np = prim.clone();
    const acc = doc.createAccessor().setType('SCALAR').setArray(pos.getCount() > 65535 ? new Uint32Array(list) : new Uint16Array(list)).setBuffer(root.listBuffers()[0]);
    np.setIndices(acc);
    (corners[key] ||= []).push(np);
  }
}
for (const [key, prims] of Object.entries(corners)) {
  const cmn = [Infinity, Infinity, Infinity], cmx = [-Infinity, -Infinity, -Infinity];
  const el = [0, 0, 0];
  for (const p of prims) {
    const pos = p.getAttribute('POSITION');
    const ix = p.getIndices();
    for (let i = 0; i < ix.getCount(); i++) { pos.getElement(ix.getScalar(i), el); for (let k = 0; k < 3; k++) { cmn[k] = Math.min(cmn[k], el[k]); cmx[k] = Math.max(cmx[k], el[k]); } }
  }
  const cc = cmn.map((x, k) => (x + cmx[k]) / 2);
  const mesh = doc.createMesh('WheelMesh_' + key);
  prims.forEach((p) => mesh.addPrimitive(p));
  const pivot = doc.createNode('Wheel_' + key).setTranslation(cc);
  const child = doc.createNode('Rim_' + key).setTranslation(cc.map((x) => -x)).setMesh(mesh);
  pivot.addChild(child);
  newScene.addChild(pivot);
  console.log('wheel', key, 'center', cc.map((x) => x.toFixed(2)), 'diam', (cmx[1] - cmn[1]).toFixed(2));
}

// remove a cena antiga
for (const n of scene.listChildren()) n.traverse((x) => x.dispose());
scene.dispose();
root.setDefaultScene(newScene);

for (const m of root.listMaterials()) if (CFG.renameMat[m.getName()]) m.setName(CFG.renameMat[m.getName()]);

await doc.transform(
  prune(),
  dedup(),
  join({ keepNamed: false }),
  weld(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(output, doc);
const nodes = root.listNodes().length, meshes = root.listMeshes().length;
const prims = root.listMeshes().reduce((a, m) => a + m.listPrimitives().length, 0);
console.log('ok ->', output, { nodes, meshes, prims });
