# Ferramentas dos modelos 3D

Requer Node 18+ e: `npm i @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4 meshoptimizer sharp gl-matrix`

- `process.mjs <scene.gltf> <saida.glb> <compass|mclaren>`: prepara o modelo baixado do Sketchfab (frente em +X, tamanho real, rodas separadas, texturas WebP, Meshopt). Para outro carro, adicione uma entrada em `CFG`.
- `webvariant.mjs <modelo.glb> <pasta models> <id> [proporção]`: gera `models/<id>.glb.js` e `models/tex/`, a variante usada em ambientes que bloqueiam `.glb` e WebAssembly (como a visualização protegida). Em hospedagem comum (Netlify, Vercel, GitHub Pages) o site usa o `.glb` direto e esta variante não é necessária.
