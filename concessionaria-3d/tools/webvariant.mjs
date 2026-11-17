// Gera a variante "segura" de um modelo: GLB sem Meshopt (sem WebAssembly), com quantização,
// texturas como arquivos .webp externos e o GLB embutido num módulo JS (base64).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { quantize, simplify, weld, prune } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import fs from 'fs';
import path from 'path';

const [, , input, outDir, id, ratioArg] = process.argv;
await MeshoptDecoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(input);
doc.createExtension(EXTMeshoptCompression).dispose();
const ratio = parseFloat(ratioArg || '1');
const steps = [];
if (ratio < 1) steps.push(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.0008, lockBorder: true }));
steps.push(quantize({ quantizePosition: 14, quantizeNormal: 12, quantizeTexcoord: 12 }), prune());
await doc.transform(...steps);

const { json, resources } = await io.writeJSON(doc, { format: 'gltf' });
const texDir = path.join(outDir, 'tex');
fs.mkdirSync(texDir, { recursive: true });
for (const im of json.images || []) {
  if (!im.uri) continue;
  const name = `${id}-${path.basename(im.uri)}`;
  fs.writeFileSync(path.join(texDir, name), Buffer.from(resources[im.uri]));
  im.uri = `tex/${name}`;
}
// texturas WebP referenciadas direto (sem EXT_texture_webp, cujo teste usa data: URI)
for (const t of json.textures || []) {
  const w = t.extensions?.EXT_texture_webp;
  if (w) { t.source = w.source; delete t.extensions.EXT_texture_webp; if (!Object.keys(t.extensions).length) delete t.extensions; }
}
for (const k of ['extensionsUsed', 'extensionsRequired']) if (json[k]) { json[k] = json[k].filter((e) => e !== 'EXT_texture_webp'); if (!json[k].length) delete json[k]; }
if (json.buffers.length !== 1) throw new Error('esperado 1 buffer');
const bin = Buffer.from(resources[json.buffers[0].uri]);
delete json.buffers[0].uri;
const pad = (b, fill) => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4), fill)]) : b);
const jsonBuf = pad(Buffer.from(JSON.stringify(json)), 0x20);
const binBuf = pad(bin, 0);
json.buffers[0].byteLength = bin.length;
const jsonBuf2 = pad(Buffer.from(JSON.stringify(json)), 0x20);
const header = Buffer.alloc(12);
const total = 12 + 8 + jsonBuf2.length + 8 + binBuf.length;
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(total, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
const glb = Buffer.concat([header, ch(jsonBuf2.length, 0x4e4f534a), jsonBuf2, ch(binBuf.length, 0x004e4942), binBuf]);
void jsonBuf;
fs.writeFileSync(path.join(outDir, `${id}.glb.js`), `export default "${glb.toString('base64')}";\n`);
const tris = doc.getRoot().listMeshes().reduce((a, m) => a + m.listPrimitives().reduce((b, p) => b + (p.getIndices()?.getCount() || 0) / 3, 0), 0);
console.log(id, 'glb', (glb.length / 1e6).toFixed(2), 'MB', 'js', (fs.statSync(path.join(outDir, `${id}.glb.js`)).size / 1e6).toFixed(2), 'MB', 'tris', Math.round(tris));
