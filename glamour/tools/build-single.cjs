/*
 * Gera dist/glamour-boutique.html: o site inteiro em UM arquivo
 * (estilos, scripts, imagens e fontes embutidos). Basta abrir no navegador,
 * enviar por WhatsApp/e-mail ou publicar em qualquer hospedagem.
 *
 * Uso (na pasta glamour/):  node tools/build-single.cjs
 * Opcional: com o Playwright disponível, os cartões da coleção também são
 * gravados prontos no HTML (aparecem mesmo onde o JavaScript não roda).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'glamour-boutique.html');

const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const cache = new Map();
function dataUri(rel) {
  const file = path.join(ROOT, rel);
  if (!cache.has(file)) {
    const mime = MIME[path.extname(file).toLowerCase()];
    if (!mime) throw new Error('Tipo de arquivo não suportado: ' + rel);
    cache.set(file, 'data:' + mime + ';base64,' + fs.readFileSync(file).toString('base64'));
  }
  return cache.get(file);
}
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* Troca caminhos de assets/ por data URIs (no HTML e no CSS) */
function inlineAssets(text, prefix) {
  const re = new RegExp('(["\'(])' + prefix.replace(/[.\/]/g, '\\$&') + '(assets/(?:img|fonts)/[\\w.\\-]+)', 'g');
  return text.replace(re, (m, q, rel) => q + dataUri(rel));
}

function safeScript(js) {
  return js.replace(/<\/script/gi, '<\\/script');
}

async function prerender() {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { return null; }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => { try { sessionStorage.setItem('glamour-intro', '1'); } catch (e) {} });
    await page.goto('file://' + path.join(ROOT, 'index.html'), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#product-grid .product-card');
    return await page.evaluate(() => {
      const clean = (el) => {
        const c = el.cloneNode(true);
        c.querySelectorAll('.is-visible, .is-loaded, .is-tilting, .is-popping').forEach((n) =>
          n.classList.remove('is-visible', 'is-loaded', 'is-tilting', 'is-popping'));
        c.querySelectorAll('[hidden]').forEach((n) => n.removeAttribute('hidden'));
        c.querySelectorAll('[data-fav]').forEach((n) => n.setAttribute('aria-pressed', 'false'));
        c.querySelectorAll('.chip-count').forEach((n) => { n.textContent = ''; });
        c.querySelectorAll('.chip').forEach((n, i) => n.setAttribute('aria-pressed', String(i === 0)));
        return c.innerHTML;
      };
      return {
        grid: clean(document.getElementById('product-grid')),
        filter: clean(document.getElementById('price-filter')),
        count: document.getElementById('filter-count').textContent
      };
    });
  } finally {
    await browser.close();
  }
}

(async () => {
  let html = read('index.html');

  /* 1. Cartões prontos no HTML */
  const pre = await prerender();
  if (pre) {
    /* replace com função: o texto contém "$&" (R$&nbsp;) e não pode ser lido como padrão */
    html = html.replace('<ul class="product-grid" id="product-grid"></ul>', () => '<ul class="product-grid" id="product-grid">' + pre.grid + '</ul>');
    html = html.replace('<div class="filter-chips" id="price-filter"></div>', () => '<div class="filter-chips" id="price-filter">' + pre.filter + '</div>');
    html = html.replace('<p class="filter-count" id="filter-count" aria-live="polite"></p>', () => '<p class="filter-count" id="filter-count" aria-live="polite">' + pre.count + '</p>');
    html = html.replace(/\s*<noscript>.*?<\/noscript>/, '');
  } else {
    console.warn('Playwright indisponível: cartões serão gerados pelo JavaScript ao abrir.');
  }

  /* 2. Remove preloads (tudo já está embutido) */
  html = html.replace(/\s*<link rel="preload"[^>]*>/g, '');

  /* 3. CSS embutido */
  const css = inlineAssets(read('css/style.css'), '../');
  html = html.replace(/<link rel="stylesheet" href="css\/style\.css">/, () => '<style>\n' + css + '\n</style>');

  /* 4. Imagens e ícones do HTML */
  html = inlineAssets(html, '');

  /* 5. Scripts embutidos (mesma ordem; estão no fim do body, então o DOM já existe) */
  /* As imagens de js/products.js não são embutidas de novo: a aba de detalhes
     usa a imagem do cartão, que já está no HTML. */
  html = html.replace(/<script src="([^"]+)" defer><\/script>/g, (m, src) =>
    '<script>\n' + safeScript(read(src)) + '\n</script>');

  const left = html.match(/(?:src|href)="(?:css|js|vendor|assets)\/[^"]+"/g);
  if (left) throw new Error('Referências externas restantes: ' + left.join(', '));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, html);
  console.log('Gerado:', path.relative(ROOT, OUT), (fs.statSync(OUT).size / 1024 / 1024).toFixed(2) + ' MB');
})().catch((e) => { console.error(e); process.exit(1); });
