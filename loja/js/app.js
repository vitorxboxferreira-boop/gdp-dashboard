/* =====================================================================
   Loja: aplicação de página única (SPA) sem dependências.
   Rotas por hash:
     #/                      início
     #/categorias            todas as categorias
     #/categoria/:slug       listagem de uma categoria
     #/novidades             produtos marcados como novidade
     #/promocoes             produtos com preço antigo / selo Promo
     #/produto/:slug         página do produto
     #/busca?q=termo         busca
     #/favoritos             favoritos
     #/privacidade  #/termos páginas institucionais
   ===================================================================== */
(function () {
  "use strict";

  const L = window.LOJA;
  const CATS = window.CATEGORIAS;
  const PRODS = window.PRODUTOS;
  const POR_PAGINA = 24;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // ---------------------------------------------------------------- util
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const catPorSlug = (slug) => CATS.find((c) => c.slug === slug);
  const prodPorSlug = (slug) => PRODS.find((p) => p.slug === slug);
  const precoPix = (v) => Math.round(v * (1 - L.descontoPix / 100) * 100) / 100;
  const icone = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const ehPromo = (p) => !!p.precoAntigo || p.selo === "Promo";
  const classeSelo = (selo) => semAcento(selo).split(" ")[0];

  function parcelas(valor) {
    const n = L.parcelasSemJuros;
    const p = Math.floor((valor / n) * 100) / 100;
    const ultima = Math.round((valor - p * (n - 1)) * 100) / 100;
    return { n, p, ultima };
  }

  const ler = (k, padrao) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch (e) { return padrao; }
  };
  const gravar = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado: segue sem salvar */ }
  };

  function toast(msg) {
    const t = $("#toast");
    t.innerHTML = `${icone("i-check")}<span>${esc(msg)}</span>`;
    t.classList.add("on");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("on"), 2200);
  }

  // ------------------------------- arte automática (produto sem foto)
  const FUNDOS = ["#09080d", "#120f1f", "#1c0e4f", "#0d0b16", "#161226"];
  const TINTAS = ["#9d8bff", "#f2f0e9", "#6a4ff0", "#b9adff", "#ff3d1f"];
  const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const cacheImg = {};
  function imagemAuto(p) {
    if (cacheImg[p.slug]) return cacheImg[p.slug];
    const h = hash(p.slug);
    const fundo = FUNDOS[h % FUNDOS.length];
    const tinta = TINTAS[(h >>> 3) % TINTAS.length];
    const cat = catPorSlug(p.categoria);
    const titulo = (p.marca || (cat ? cat.nome : L.nome)).toUpperCase();
    const fs = Math.min(112, Math.floor(620 / Math.max(titulo.length, 1)));
    const caber = titulo.length * fs * 0.62 > 340 ? ' textLength="340" lengthAdjust="spacingAndGlyphs"' : "";
    const giro = ((h >>> 5) % 9) - 4;
    const num = String((h % 900) + 100);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
      <defs>
        <pattern id="z" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="11" height="22" fill="${tinta}"/></pattern>
      </defs>
      <rect width="400" height="500" fill="${fundo}"/>
      <polygon points="300,0 400,0 400,100" fill="url(#z)"/>
      <g transform="rotate(${giro} 200 250)">
        <text x="200" y="270" text-anchor="middle" font-family="Impact,Haettenschweiler,'Arial Narrow Bold',sans-serif" font-size="${fs}" fill="${tinta}"${caber}>${esc(titulo)}</text>
      </g>
      <text x="22" y="474" font-family="Courier New,monospace" font-weight="700" font-size="14" fill="${tinta}" opacity=".7" letter-spacing="2">${esc((cat ? cat.nome : "").toUpperCase())} /// N.${num}</text>
      <text x="378" y="474" text-anchor="end" font-family="Courier New,monospace" font-size="12" fill="#f2f0e9" opacity=".35">sem foto</text>
    </svg>`;
    return (cacheImg[p.slug] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
  }
  const FOTOS = window.FOTOS || {};
  const imagens = (p) => (p.imagens.length ? p.imagens : FOTOS[p.slug] && FOTOS[p.slug].length ? FOTOS[p.slug] : [imagemAuto(p)]);

  // ------------------------------------------------------------- estado
  let carrinho = ler("carrinho", []); // [{slug, tam, cor, qtd}]
  let favoritos = ler("favoritos", []); // [slug]

  const estoqueDe = (p, tam) => {
    if (!p.tamanhos.length) return 99;
    const t = p.tamanhos.find((x) => x.t === tam);
    return t ? t.estoque : 0;
  };

  function salvarCarrinho() {
    carrinho = carrinho.filter((i) => prodPorSlug(i.slug) && i.qtd > 0);
    gravar("carrinho", carrinho);
    const n = carrinho.reduce((s, i) => s + i.qtd, 0);
    const b = $("#cont-car");
    if (n && Number(b.textContent) !== n) { b.classList.remove("pulo"); void b.offsetWidth; b.classList.add("pulo"); }
    b.hidden = !n;
    b.textContent = n;
    desenharCarrinho();
  }

  function adicionar(slug, tam, cor, qtd = 1) {
    const p = prodPorSlug(slug);
    const ex = carrinho.find((i) => i.slug === slug && i.tam === tam && (i.cor || "") === (cor || ""));
    const max = estoqueDe(p, tam);
    if (ex) ex.qtd = Math.min(ex.qtd + qtd, max);
    else carrinho.push({ slug, tam, cor: cor || "", qtd: Math.min(qtd, max) });
    salvarCarrinho();
    toast("Foi pro carrinho");
  }

  function alternarFav(slug) {
    favoritos = favoritos.includes(slug) ? favoritos.filter((s) => s !== slug) : [...favoritos, slug];
    gravar("favoritos", favoritos);
    atualizarFavs();
    toast(favoritos.includes(slug) ? "Salvo nos favoritos" : "Saiu dos favoritos");
    if (location.hash.startsWith("#/favoritos")) rotear();
  }
  function atualizarFavs() {
    const b = $("#cont-fav");
    b.hidden = !favoritos.length;
    b.textContent = favoritos.length;
    $$(".fav").forEach((el) => el.classList.toggle("on", favoritos.includes(el.dataset.fav)));
  }

  // ------------------------------------------------------------ WhatsApp
  const linkWhats = (texto) => `https://wa.me/${L.whatsapp}?text=${encodeURIComponent(texto)}`;

  function mensagemPedido(itens, extra = {}) {
    let total = 0;
    const linhas = itens.map((i) => {
      const p = prodPorSlug(i.slug);
      const sub = p.preco * i.qtd;
      total += sub;
      const det = [i.tam && `Tam: ${i.tam}`, i.cor && `Cor: ${i.cor}`].filter(Boolean).join(" · ");
      return `• ${i.qtd}x ${p.nome}${det ? ` (${det})` : ""}: ${brl(sub)}`;
    });
    return [
      `Salve, ${L.nome}! Quero fechar este pedido:`,
      "",
      ...linhas,
      "",
      `*Total: ${brl(total)}*`,
      `No Pix (${L.descontoPix}% OFF): ${brl(precoPix(total))}`,
      extra.nome ? `\nNome: ${extra.nome}` : "",
      extra.obs ? `Obs.: ${extra.obs}` : "",
    ]
      .filter((l, idx, arr) => !(l === "" && arr[idx - 1] === ""))
      .join("\n")
      .trim();
  }

  // ---------------------------------------------------------- componentes
  function card(p, i = 0) {
    const selos = [];
    if (p.selo) selos.push(`<span class="selo ${classeSelo(p.selo)}">${esc(p.selo)}</span>`);
    if (p.novidade && !p.selo) selos.push(`<span class="selo novo">novo!</span>`);
    const tams = p.tamanhos.filter((t) => t.estoque > 0);
    const tamTxt = !p.tamanhos.length ? "Tam. único" : tams.length > 4 ? `${tams.length} tamanhos` : tams.map((t) => esc(t.t)).join(" · ");
    const pc = parcelas(p.preco);
    const fav = favoritos.includes(p.slug) ? " on" : "";
    const variasCores = p.cores && p.cores.length > 1;
    const rapido = variasCores
      ? `<a class="rapido-unico" href="#/produto/${esc(p.slug)}">Escolher cor e tamanho ${icone("i-right")}</a>`
      : p.tamanhos.length
        ? `<span class="rapido-tit">Adicionar rápido</span><div class="rapido-tams">${p.tamanhos.map((t) => `<button data-rapido="${esc(p.slug)}" data-t="${esc(t.t)}" ${t.estoque > 0 ? "" : "disabled"}>${esc(t.t)}</button>`).join("")}</div>`
        : `<button class="rapido-unico" data-rapido="${esc(p.slug)}" data-t="">${icone("i-plus")} Adicionar ao carrinho</button>`;
    return `<article class="card" style="--i:${i % 8}">
      ${selos.join("")}
      <button class="fav${fav}" data-fav="${esc(p.slug)}" aria-label="Favoritar ${esc(p.nome)}">${icone("i-heart")}</button>
      <div class="card-midia">
        <a class="card-img" href="#/produto/${esc(p.slug)}" tabindex="-1" aria-hidden="true"><img src="${esc(imagens(p)[0])}" alt="" loading="lazy" decoding="async" /></a>
        <div class="rapido">${rapido}</div>
      </div>
      <div class="card-corpo">
        <span class="card-marca">${esc(p.marca)}</span>
        <h3><a href="#/produto/${esc(p.slug)}">${esc(p.nome)}</a></h3>
        <div class="preco">${p.precoAntigo ? `<s>${brl(p.precoAntigo)}</s>` : ""}${brl(p.preco)}</div>
        <div class="parcela">${pc.n}x ${brl(pc.p)} s/ juros</div>
        <div class="tams">${tamTxt}</div>
      </div>
      <div class="card-rodape">
        <button class="btn btn-escuro btn-bloco" data-comprar="${esc(p.slug)}">Comprar</button>
      </div>
    </article>`;
  }

  function carrossel(lista) {
    return `<div class="carrossel">
      <button class="seta esq" data-rolar="-1" aria-label="Anterior">${icone("i-left")}</button>
      <div class="trilho">${lista.map((p, i) => card(p, i)).join("")}</div>
      <button class="seta dir" data-rolar="1" aria-label="Próximo">${icone("i-right")}</button>
    </div>`;
  }

  const vazio = (txt) => `<div class="vazio">${icone("i-search")}<p class="marcador">${esc(txt)}</p></div>`;

  // listas especiais usadas na home e nas rotas
  const listaNovidades = () => PRODS.filter((p) => p.novidade);
  const listaPromocoes = () => PRODS.filter(ehPromo);

  // --------------------------------------------------------------- páginas
  function paginaInicio() {
    const avisos = L.avisos.map((a) => `<span>${esc(a)} ✕</span>`).join("");
    const vitrines = L.vitrines
      .map((slug) => {
        let titulo, lista, link, extra = "";
        if (slug === "novidades") { titulo = "Novidades"; lista = listaNovidades(); link = "#/novidades"; extra = "acabou de chegar"; }
        else if (slug === "promocoes") { titulo = "Promoções"; lista = listaPromocoes(); link = "#/promocoes"; extra = "corre que acaba"; }
        else {
          const c = catPorSlug(slug);
          if (!c) return "";
          titulo = c.nome; lista = PRODS.filter((p) => p.categoria === slug); link = `#/categoria/${slug}`;
        }
        if (!lista.length) return "";
        return `<section class="secao container" id="${esc(slug)}">
          <div class="secao-cab"><h2>${esc(titulo)}${extra ? `<small>${esc(extra)}</small>` : ""}</h2><a href="${link}">Ver tudo (${lista.length})</a></div>
          ${carrossel(lista.slice(0, 10))}
        </section>`;
      });
    // manifesto entra depois da terceira vitrine
    vitrines.splice(3, 0, `<section class="manifesto"><div class="container"><p>${esc(L.manifesto)}</p><span class="assina">— ${esc(L.nome)}</span></div></section>`);

    return `
      <h1 class="pular">${esc(L.nome)}</h1>
      <section class="hero" aria-label="Destaque" id="hero">
        <div class="hero-luz" aria-hidden="true"></div>
        <div class="hero-gigante" aria-hidden="true">${esc(L.nome)}</div>
        <div class="fita-hero" aria-hidden="true"><div class="fita-trilho">${avisos.repeat(4)}${avisos.repeat(4)}</div></div>
        <div class="hero-in">
          <span class="hero-chamada">${esc(L.banner.chamada)}</span>
          <h2>${L.banner.titulo.map((linha, li) => `<span class="linha">${linha.split(" ").map((w, wi) => `<span class="palavra" style="--d:${li * 2 + wi}"><span>${esc(w)}</span></span>`).join(" ")}</span>`).join("")}</h2>
          <p class="hero-sub">${esc(L.banner.texto)}</p>
          <div class="hero-ctas">
            <a class="btn btn-marca magnetico" href="${esc(L.banner.link)}">${esc(L.banner.botao)} ${icone("i-right")}</a>
            <a class="btn btn-vidro" href="#/promocoes">Ver promoções</a>
          </div>
          <dl class="hero-numeros">
            <div><dt data-contar="${PRODS.length}">0</dt><dd>produtos</dd></div>
            <div><dt data-contar="${new Set(PRODS.map((p) => p.marca).filter(Boolean)).size}">0</dt><dd>marcas</dd></div>
            <div><dt>${L.parcelasSemJuros}x</dt><dd>sem juros</dd></div>
            <div><dt>${L.descontoPix}%</dt><dd>off no Pix</dd></div>
          </dl>
          <svg class="adesivo-giro" viewBox="0 0 120 120" aria-hidden="true">
            <defs><path id="circ" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0"/></defs>
            <circle cx="60" cy="60" r="58" fill="#0b0b0b"/>
            <text><textPath href="#circ">${esc(L.banner.adesivo)} ✕ ${esc(L.banner.adesivo)} ✕ </textPath></text>
            <circle cx="60" cy="60" r="22" style="fill:var(--marca)"/>
          </svg>
        </div>
      </section>
      <section class="confianca" aria-label="Por que comprar com a gente">
        ${L.beneficios.map((b) => `<div class="conf-item">${icone("i-" + b.icone)}<div><strong>${esc(b.titulo)}</strong><span>${esc(b.texto)}</span></div></div>`).join("")}
      </section>
      <nav class="cats" aria-label="Categorias">
        ${CATS.map((c, i) => `<a class="cat" href="#/categoria/${c.slug}"><span class="num">${String(i + 1).padStart(2, "0")}/</span>${icone("c-" + c.icone)}<strong>${esc(c.nome)}</strong></a>`).join("")}
      </nav>
      ${vitrines.slice(0, 2).join("")}
      ${secaoMarcas()}
      ${vitrines.slice(2).join("")}
      <section class="faq" id="perguntas">
        <h2>Perguntas frequentes</h2>
        ${L.faq.map((f) => `<details><summary>${esc(f.p)}</summary><p>${esc(f.r)}</p></details>`).join("")}
      </section>`;
  }

  function secaoMarcas() {
    const cont = {};
    PRODS.forEach((p) => p.marca && (cont[p.marca] = (cont[p.marca] || 0) + 1));
    const marcas = Object.keys(cont).sort((a, b) => cont[b] - cont[a]).slice(0, 18);
    const itens = marcas.map((m) => `<a href="#/busca?q=${encodeURIComponent(m)}">${esc(m)}<sup>${cont[m]}</sup></a>`).join("");
    return `<section class="marcas" aria-label="Marcas">
      <div class="container marcas-cab"><span class="rotulo-sec">As marcas da rua</span><span class="mono">${Object.keys(cont).length} marcas originais</span></div>
      <div class="marcas-trilho">${itens}${itens}</div>
    </section>`;
  }

  function paginaCategorias() {
    return `<div class="container">
      <nav class="migalha" aria-label="Você está em"><a href="#/">Início</a><span>/</span><span>Categorias</span></nav>
      <div class="lista-cab"><div><h1>Categorias</h1><p>${PRODS.length} produtos no catálogo</p></div></div>
      <div class="cats-grade">
        ${CATS.map((c) => {
          const n = PRODS.filter((p) => p.categoria === c.slug).length;
          return `<a href="#/categoria/${c.slug}">${icone("c-" + c.icone)}<strong>${esc(c.nome)}</strong><small>${n} produto${n === 1 ? "" : "s"}</small></a>`;
        }).join("")}
      </div></div>`;
  }

  // listagem com ordenação, filtro de marca e "carregar mais"
  function paginaLista({ titulo, sub, lista, chips = true, ativo = "", vazioTxt = "Nada por aqui." }) {
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    const ordem = params.get("ordem") || "";
    const marca = params.get("marca") || "";
    const qtd = Math.max(POR_PAGINA, Number(params.get("ver")) || POR_PAGINA);
    const marcas = [...new Set(lista.map((p) => p.marca).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    let r = marca ? lista.filter((p) => p.marca === marca) : [...lista];
    if (ordem === "menor") r.sort((a, b) => a.preco - b.preco);
    if (ordem === "maior") r.sort((a, b) => b.preco - a.preco);
    if (ordem === "az") r.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const opt = (v, t, cur) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(t)}</option>`;
    const visiveis = r.slice(0, qtd);

    return `<div class="container">
      <nav class="migalha" aria-label="Você está em"><a href="#/">Início</a><span>/</span><span>${esc(titulo)}</span></nav>
      ${chips ? `<div class="chips">${CATS.map((c) => `<a class="${c.slug === ativo ? "on" : ""}" href="#/categoria/${c.slug}">${esc(c.nome)}</a>`).join("")}</div>` : ""}
      <div class="lista-cab">
        <div><h1>${esc(titulo)}</h1><p>${sub || `${r.length} produto${r.length === 1 ? "" : "s"}`}</p></div>
        ${lista.length ? `<div class="filtros">
          ${marcas.length > 1 ? `<select data-filtro="marca" aria-label="Filtrar por marca">${opt("", "Todas as marcas", marca)}${marcas.map((m) => opt(m, m, marca)).join("")}</select>` : ""}
          <select data-filtro="ordem" aria-label="Ordenar">${opt("", "Relevância", ordem)}${opt("menor", "Menor preço", ordem)}${opt("maior", "Maior preço", ordem)}${opt("az", "A–Z", ordem)}</select>
        </div>` : ""}
      </div>
      ${r.length ? `<div class="grade">${visiveis.map((p, i) => card(p, i)).join("")}</div>` : vazio(vazioTxt)}
      ${r.length > visiveis.length ? `<div class="mais-wrap"><span>Mostrando ${visiveis.length} de ${r.length}</span><button class="btn btn-linha" data-mais="${qtd + POR_PAGINA}">Carregar mais</button></div>` : ""}
    </div>`;
  }

  function paginaProduto(slug) {
    const p = prodPorSlug(slug);
    if (!p) return pagina404();
    const c = catPorSlug(p.categoria);
    const pc = parcelas(p.preco);
    const imgs = imagens(p);
    const fav = favoritos.includes(p.slug) ? " on" : "";
    const relacionados = PRODS.filter((x) => x.categoria === p.categoria && x.slug !== p.slug && (!p.marca || x.marca === p.marca))
      .concat(PRODS.filter((x) => x.categoria === p.categoria && x.slug !== p.slug && p.marca && x.marca !== p.marca))
      .slice(0, 12);
    document.title = `${p.nome} · ${L.nome}`;

    return `<div class="container">
      <nav class="migalha" aria-label="Você está em">
        <a href="#/">Início</a><span>/</span><a href="#/categoria/${c.slug}">${esc(c.nome)}</a><span>/</span><span>${esc(p.nome)}</span>
      </nav>
      <div class="produto">
        <div>
          <div class="galeria-principal" id="galeria">
            ${p.selo ? `<span class="selo ${classeSelo(p.selo)}">${esc(p.selo)}</span>` : ""}
            <button class="fav${fav}" data-fav="${esc(p.slug)}" aria-label="Favoritar">${icone("i-heart")}</button>
            <img id="img-principal" src="${esc(imgs[0])}" alt="${esc(p.nome)}" />
          </div>
          ${imgs.length > 1 ? `<div class="miniaturas">${imgs.map((src, i) => `<button class="${i ? "" : "on"}" data-img="${esc(src)}" aria-label="Foto ${i + 1}"><img src="${esc(src)}" alt="" /></button>`).join("")}</div>` : ""}
        </div>
        <div class="info-prod">
          <div class="prod-topo"><span class="card-marca">${esc(p.marca)}</span>
            <button class="link-acao" id="compartilhar">${icone("i-share")} Compartilhar</button></div>
          <h1>${esc(p.nome)}</h1>
          <div class="preco">${p.precoAntigo ? `<s>${brl(p.precoAntigo)}</s>` : ""}${brl(p.preco)}</div>
          <div class="parcela">ou ${pc.n}x de ${brl(pc.p)} sem juros${pc.ultima !== pc.p ? ` (última de ${brl(pc.ultima)})` : ""}</div>
          <div class="pix-box">${icone("i-pix")} ${brl(precoPix(p.preco))} no Pix</div>

          ${p.cores && p.cores.length > 1 ? `
            <div class="rotulo">Cor <small id="cor-sel">Escolha uma</small></div>
            <div class="opcoes" role="radiogroup" aria-label="Cores">
              ${p.cores.map((cor) => `<button role="radio" aria-checked="false" data-cor="${esc(cor)}">${esc(cor)}</button>`).join("")}
            </div>` : ""}

          ${p.tamanhos.length ? `
            <div class="rotulo">Tamanho ${["camisetas", "moletons", "calcas", "bermudas", "tenis"].includes(p.categoria) ? `<button class="link-acao" id="abrir-guia">${icone("i-ruler")} Guia de medidas</button>` : "<small>Escolha um</small>"}</div>
            <div class="opcoes" role="radiogroup" aria-label="Tamanhos">
              ${p.tamanhos.map((t) => `<button role="radio" aria-checked="false" data-tam="${esc(t.t)}" ${t.estoque > 0 ? "" : "disabled"}>${esc(t.t)}</button>`).join("")}
            </div>
            <div class="estoque-info" id="estoque-info">Escolhe o tamanho pra ver quantas tem.</div>` : ""}

          <div class="rotulo">Quantidade</div>
          <div class="compra">
            <div class="qtd">
              <button data-q="-1" aria-label="Diminuir">${icone("i-minus")}</button>
              <span id="qtd-val">1</span>
              <button data-q="1" aria-label="Aumentar">${icone("i-plus")}</button>
            </div>
            <button class="btn btn-escuro" id="add-carrinho">${icone("i-bag")} Pro carrinho</button>
            <button class="btn btn-whats" id="comprar-agora">${icone("i-whats")} Comprar agora no Whats</button>
          </div>
          <div class="erro-tam" id="erro-tam" role="alert"></div>
          <ul class="garantias">
            <li>${icone("i-shield")} Produto 100% original</li>
            <li>${icone("i-truck")} Envio pra todo o Brasil</li>
            <li>${icone("i-whats")} Atendimento direto no WhatsApp</li>
          </ul>
          <div class="descricao"><p>${esc(p.descricao)}</p></div>
        </div>
      </div>
      <div class="barra-compra" id="barra-compra" aria-hidden="true">
        <img src="${esc(imgs[0])}" alt="" />
        <div><strong>${esc(p.nome)}</strong><span>${brl(p.preco)}</span></div>
        <button class="btn btn-marca" id="barra-comprar">Comprar</button>
      </div>
      <dialog class="modal" id="guia-medidas">${guiaMedidas(p.categoria)}</dialog>
      ${relacionados.length ? `<section class="secao"><div class="secao-cab"><h2>Combina com</h2><a href="#/categoria/${c.slug}">Ver tudo</a></div>${carrossel(relacionados)}</section>` : ""}
    </div>`;
  }

  function guiaMedidas(cat) {
    const tenis = cat === "tenis";
    const cab = tenis ? ["BR", "EUA", "Comprimento do pé"] : cat === "calcas" || cat === "bermudas" ? ["Tamanho", "Cintura", "Quadril"] : ["Tamanho", "Peito", "Comprimento"];
    const linhas = tenis
      ? [["37", "5", "24,5 cm"], ["38", "6", "25 cm"], ["39", "7", "25,5 cm"], ["40", "7.5", "26,5 cm"], ["41", "8.5", "27 cm"], ["42", "9", "27,5 cm"], ["43", "10", "28,5 cm"], ["44", "11", "29 cm"]]
      : cat === "calcas" || cat === "bermudas"
        ? [["38 / P", "76 cm", "96 cm"], ["40 / M", "80 cm", "100 cm"], ["42 / G", "84 cm", "104 cm"], ["44 / GG", "88 cm", "108 cm"], ["46", "92 cm", "112 cm"]]
        : [["P", "100 cm", "70 cm"], ["M", "106 cm", "72 cm"], ["G", "112 cm", "74 cm"], ["GG", "118 cm", "76 cm"], ["XG", "124 cm", "78 cm"]];
    return `<div class="modal-cab"><h2>Guia de medidas</h2><button class="icone-btn" data-fechar-modal aria-label="Fechar">${icone("i-x")}</button></div>
      <table><thead><tr>${cab.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
      <tbody>${linhas.map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>
      <p class="mono">Medidas aproximadas: variam um pouco de marca pra marca. Ficou na dúvida? Chama no WhatsApp que a gente mede a peça.</p>`;
  }

  function ligarProduto(slug) {
    const p = prodPorSlug(slug);
    if (!p) return;
    let tam = p.tamanhos.length ? null : "";
    let cor = p.cores && p.cores.length > 1 ? null : (p.cores && p.cores[0]) || "";
    let qtd = 1;
    const max = () => (tam === null ? 1 : estoqueDe(p, tam));
    const atualizaQtd = () => ($("#qtd-val").textContent = qtd);
    const marcar = (grupo, b) => {
      $$(grupo).forEach((x) => { x.classList.remove("on"); x.setAttribute("aria-checked", "false"); });
      b.classList.add("on");
      b.setAttribute("aria-checked", "true");
      $("#erro-tam").textContent = "";
    };

    $$("[data-tam]").forEach((b) =>
      b.addEventListener("click", () => {
        marcar("[data-tam]", b);
        tam = b.dataset.tam;
        const e = estoqueDe(p, tam);
        const info = $("#estoque-info");
        info.textContent = e === 1 ? "Última peça nesse tamanho!" : e <= 2 ? `Só ${e} peças nesse tamanho` : `${e} disponíveis`;
        info.classList.toggle("pouco", e <= 2);
        qtd = Math.min(qtd, e);
        atualizaQtd();
      })
    );
    $$("[data-cor]").forEach((b) =>
      b.addEventListener("click", () => {
        marcar("[data-cor]", b);
        cor = b.dataset.cor;
        $("#cor-sel").textContent = cor;
      })
    );
    $$("[data-q]").forEach((b) =>
      b.addEventListener("click", () => {
        qtd = Math.max(1, Math.min(max(), qtd + Number(b.dataset.q)));
        atualizaQtd();
      })
    );
    const valida = () => {
      const falta = [cor === null && "a cor", tam === null && "o tamanho"].filter(Boolean);
      if (falta.length) { $("#erro-tam").textContent = `Escolhe ${falta.join(" e ")}.`; return false; }
      return true;
    };
    $("#add-carrinho").addEventListener("click", () => { if (valida()) { adicionar(p.slug, tam, cor, qtd); abrir("#gaveta-carrinho"); } });
    $("#comprar-agora").addEventListener("click", () => {
      if (valida()) window.open(linkWhats(mensagemPedido([{ slug: p.slug, tam, cor, qtd }])), "_blank", "noopener");
    });
    $$("[data-img]").forEach((b) =>
      b.addEventListener("click", () => {
        $("#img-principal").src = b.dataset.img;
        $$("[data-img]").forEach((x) => x.classList.toggle("on", x === b));
      })
    );

    // zoom da foto acompanhando o mouse
    const gal = $("#galeria"), img = $("#img-principal");
    if (matchMedia("(hover: hover)").matches) {
      gal.addEventListener("mousemove", (e) => {
        const r = gal.getBoundingClientRect();
        img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
        gal.classList.add("zoom");
      });
      gal.addEventListener("mouseleave", () => gal.classList.remove("zoom"));
    }

    // compartilhar
    $("#compartilhar").addEventListener("click", async () => {
      const dados = { title: p.nome, text: `${p.nome} na ${L.nome}`, url: location.href };
      try {
        if (navigator.share) await navigator.share(dados);
        else { await navigator.clipboard.writeText(location.href); toast("Link copiado"); }
      } catch (e) { /* cancelado */ }
    });

    // guia de medidas
    const guia = $("#guia-medidas");
    $("#abrir-guia")?.addEventListener("click", () => guia.showModal());
    guia.addEventListener("click", (e) => { if (e.target === guia || e.target.closest("[data-fechar-modal]")) guia.close(); });

    // barra de compra fixa (aparece quando os botões saem da tela)
    const barra = $("#barra-compra");
    $("#barra-comprar").addEventListener("click", () => {
      $(".info-prod").scrollIntoView({ behavior: "smooth", block: "start" });
      if (valida()) { adicionar(p.slug, tam, cor, qtd); abrir("#gaveta-carrinho"); }
    });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(([en]) => {
        const mostrar = !en.isIntersecting && en.boundingClientRect.top < 0;
        barra.classList.toggle("on", mostrar);
        barra.setAttribute("aria-hidden", String(!mostrar));
      });
      io.observe($(".compra"));
      observadores.push(io);
    }
  }

  const pagina404 = () =>
    `<div class="container vazio" style="padding:80px 16px"><h1 style="font-size:120px">404</h1><p class="marcador">Se perdeu no rolê.</p><br/><a class="btn btn-marca" href="#/">Voltar pro início</a></div>`;

  const paginaTexto = (titulo, texto) =>
    `<div class="container pagina-txt"><h1>${esc(titulo)}</h1>${texto.map((t) => `<p>${esc(t)}</p>`).join("")}</div>`;

  // -------------------------------------------------------------- roteador
  let ultimaRota = "";
  let observadores = [];
  const semMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // revela elementos ao rolar, conta números e liga botões magnéticos
  function efeitos(raiz) {
    const alvos = $$(".secao-cab, .carrossel, .manifesto p, .faq details, .faq h2, .confianca .conf-item, .marcas, .grade .card, .cats-grade a, .lista-cab, .info-prod, .galeria-principal", raiz);
    if (semMovimento || !("IntersectionObserver" in window)) {
      $$("[data-contar]", raiz).forEach((el) => (el.textContent = el.dataset.contar));
      return;
    }
    alvos.forEach((el) => el.classList.add("rv"));
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add("visivel");
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    alvos.forEach((el) => io.observe(el));
    observadores.push(io);

    // animações infinitas param quando a seção sai da tela
    const pausa = new IntersectionObserver((ents) => ents.forEach((en) => en.target.classList.toggle("pausado", !en.isIntersecting)));
    $$(".hero, .marcas", raiz).forEach((el) => pausa.observe(el));
    observadores.push(pausa);

    $$("[data-contar]", raiz).forEach((el) => {
      const fim = Number(el.dataset.contar), t0 = performance.now(), dur = 1400;
      const passo = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        el.textContent = Math.round(fim * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(passo);
      };
      setTimeout(() => requestAnimationFrame(passo), 700);
    });

    if (matchMedia("(hover: hover)").matches) {
      $$(".magnetico", raiz).forEach((b) => {
        b.addEventListener("mousemove", (e) => {
          const r = b.getBoundingClientRect();
          b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
        });
        b.addEventListener("mouseleave", () => (b.style.transform = ""));
      });
      const hero = $("#hero", raiz), luz = $(".hero-luz", raiz);
      if (hero && luz) {
        let pendente = null;
        hero.addEventListener("mousemove", (e) => {
          const r = hero.getBoundingClientRect();
          const x = e.clientX - r.left, y = e.clientY - r.top;
          if (!pendente) pendente = requestAnimationFrame(() => { luz.style.transform = `translate3d(${x}px, ${y}px, 0)`; pendente = null; });
        });
      }
    }
  }
  function rotear() {
    const [caminho, query] = (location.hash.slice(1) || "/").split("?");
    const partes = caminho.split("/").filter(Boolean);
    const main = $("#conteudo");
    document.title = `${L.nome} · ${L.slogan}`;
    let html, depois;

    if (!partes.length) html = paginaInicio();
    else if (partes[0] === "categorias") html = paginaCategorias();
    else if (partes[0] === "categoria") {
      const c = catPorSlug(partes[1]);
      html = c ? paginaLista({ titulo: c.nome, lista: PRODS.filter((p) => p.categoria === c.slug), ativo: c.slug }) : pagina404();
      if (c) document.title = `${c.nome} · ${L.nome}`;
    } else if (partes[0] === "novidades") {
      html = paginaLista({ titulo: "Novidades", lista: listaNovidades() });
    } else if (partes[0] === "promocoes") {
      html = paginaLista({ titulo: "Promoções", lista: listaPromocoes() });
    } else if (partes[0] === "produto") {
      html = paginaProduto(partes[1]);
      depois = () => ligarProduto(partes[1]);
    } else if (partes[0] === "busca") {
      const q = new URLSearchParams(query || "").get("q") || "";
      const termos = semAcento(q).split(/\s+/).filter(Boolean);
      const lista = PRODS.filter((p) => {
        const alvo = semAcento(`${p.nome} ${p.marca} ${catPorSlug(p.categoria).nome}`);
        return termos.every((t) => alvo.includes(t));
      });
      html = paginaLista({ titulo: q ? `“${q}”` : "Busca", lista, chips: false, vazioTxt: "Não achamos nada com isso." });
    } else if (partes[0] === "favoritos") {
      const lista = favoritos.map(prodPorSlug).filter(Boolean);
      html = paginaLista({ titulo: "Favoritos", lista, chips: false, vazioTxt: "Toca no coração dos produtos pra salvar aqui." });
    } else if (partes[0] === "privacidade") {
      html = paginaTexto("Privacidade", [
        `A ${L.nome} usa o armazenamento do seu navegador só pra lembrar carrinho, favoritos e tema. Nada disso vai pros nossos servidores.`,
        "Os dados do pedido (produtos, nome e observações) só são compartilhados quando você envia a mensagem pelo WhatsApp.",
      ]);
    } else if (partes[0] === "termos") {
      html = paginaTexto("Termos de uso", [
        "Preços e disponibilidade podem mudar sem aviso. O pedido só é confirmado depois do atendimento pelo WhatsApp.",
        `O desconto de ${L.descontoPix}% vale pra pagamentos via Pix. Parcelamento em até ${L.parcelasSemJuros}x sem juros no cartão de crédito.`,
      ]);
    } else html = pagina404();

    observadores.forEach((o) => o.disconnect());
    observadores = [];
    main.innerHTML = html;
    main.classList.remove("entrando");
    void main.offsetWidth; // reinicia a animação de entrada
    main.classList.add("entrando");
    depois && depois();
    efeitos(main);
    $$("#menu a").forEach((a) => a.classList.toggle("ativo", location.hash.split("?")[0] === a.getAttribute("href")));
    fechar();
    // "carregar mais" e filtros mantêm a posição; troca de página volta ao topo
    if (caminho !== ultimaRota) window.scrollTo(0, 0);
    ultimaRota = caminho;
  }

  // --------------------------------------------------------------- carrinho
  function desenharCarrinho() {
    const box = $("#carrinho-itens");
    const rod = $("#carrinho-rodape");
    if (!carrinho.length) {
      box.innerHTML = `<div class="vazio">${icone("i-bag")}<p class="marcador">Carrinho vazio, parça.</p></div>`;
      rod.innerHTML = `<button class="btn btn-marca btn-bloco" data-fechar>Bora escolher</button>`;
      return;
    }
    let total = 0;
    box.innerHTML = carrinho
      .map((i, idx) => {
        const p = prodPorSlug(i.slug);
        total += p.preco * i.qtd;
        const det = [i.tam && `Tam ${esc(i.tam)}`, i.cor && esc(i.cor)].filter(Boolean).join(" · ");
        return `<div class="item-car">
          <a class="mini" href="#/produto/${esc(p.slug)}"><img src="${esc(imagens(p)[0])}" alt="" /></a>
          <div>
            <h4>${esc(p.nome)}</h4>
            <small>${det ? det + " · " : ""}${brl(p.preco)}</small><br/>
            <div class="qtd">
              <button data-cq="${idx}" data-d="-1" aria-label="Diminuir">${icone("i-minus")}</button>
              <span>${i.qtd}</span>
              <button data-cq="${idx}" data-d="1" aria-label="Aumentar">${icone("i-plus")}</button>
            </div>
          </div>
          <div class="lado">
            <button class="icone-btn" data-rem="${idx}" aria-label="Remover">${icone("i-trash")}</button>
            <strong>${brl(p.preco * i.qtd)}</strong>
          </div>
        </div>`;
      })
      .join("");
    rod.innerHTML = `
      <div class="linha-total grande"><span>Total</span><span>${brl(total)}</span></div>
      <div class="linha-total" style="color:var(--ok);font-weight:700"><span>No Pix (${L.descontoPix}% OFF)</span><span>${brl(precoPix(total))}</span></div>
      <input id="ped-nome" placeholder="Teu nome (opcional)" autocomplete="name" />
      <textarea id="ped-obs" rows="2" placeholder="Obs.: cidade pra envio, forma de pagamento…"></textarea>
      <button class="btn btn-whats btn-bloco" id="finalizar">${icone("i-whats")} Fechar no WhatsApp</button>
      <small style="color:var(--suave);text-align:center;font-family:var(--fonte-mono);font-size:11px">O pedido vai escrito pro nosso WhatsApp.</small>`;
  }

  // ----------------------------------------------------------- gavetas
  function abrir(sel) {
    const g = $(sel);
    g.classList.add("aberta");
    g.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function fechar() {
    $$(".gaveta.aberta").forEach((g) => { g.classList.remove("aberta"); g.setAttribute("aria-hidden", "true"); });
    document.body.style.overflow = "";
  }

  // ---------------------------------------------------- partes fixas
  function montarFixos() {
    $("#logo").innerHTML = L.logo
      ? `<img src="${esc(L.logo)}" alt="${esc(L.nome)}" /><span class="sub">${esc(L.subtitulo || "")}</span>`
      : `${esc(L.nome)}<span class="ponto" aria-hidden="true"></span>`;
    $("#logo").setAttribute("aria-label", L.nome);
    document.querySelector('meta[name="description"]').content = L.descricao;

    const avisos = L.avisos.map((a) => `<span>${esc(a)}</span>`).join("");
    $("#faixa").innerHTML = avisos.repeat(3) + avisos.repeat(3); // duas metades iguais = loop contínuo

    $("#menu").innerHTML =
      `<a href="#/novidades">Novidades</a>` +
      CATS.slice(0, 5).map((c) => `<a href="#/categoria/${c.slug}">${esc(c.nome)}</a>`).join("") +
      `<a href="#/promocoes">Promo</a><a href="#/categorias">+ Todas</a>`;
    $("#menu-mobile").innerHTML =
      `<a href="#/novidades">${icone("c-star")} Novidades</a><a href="#/promocoes">${icone("i-pix")} Promoções</a>` +
      CATS.map((c) => `<a href="#/categoria/${c.slug}">${icone("c-" + c.icone)} ${esc(c.nome)}</a>`).join("") +
      `<a href="#/favoritos">${icone("i-heart")} Favoritos</a>`;

    $("#whats-flutuante").href = linkWhats(`Salve, ${L.nome}! Vim pelo site.`);

    const ano = new Date().getFullYear();
    $("#rodape").innerHTML = `<div class="container">
      ${L.logoGrande ? `<a class="rodape-logo" href="#/"><img src="${esc(L.logoGrande)}" alt="${esc(L.nome)}" loading="lazy" /></a>` : ""}
      <div class="rodape-grade">
        <div>
          <p>${esc(L.descricao)}</p>
          <a class="btn btn-linha" href="https://instagram.com/${esc(L.instagram)}" target="_blank" rel="noopener">${icone("i-insta")} @${esc(L.instagram)}</a>
        </div>
        <nav aria-label="Categorias no rodapé"><h3>Loja</h3><ul>
          <li><a href="#/novidades">Novidades</a></li><li><a href="#/promocoes">Promoções</a></li>
          ${CATS.slice(0, 5).map((c) => `<li><a href="#/categoria/${c.slug}">${esc(c.nome)}</a></li>`).join("")}
          <li><a href="#/categorias">Todas as categorias</a></li></ul></nav>
        <div><h3>Contato</h3><ul>
          <li>${icone("i-whats")}<a href="${linkWhats(`Salve, ${L.nome}!`)}" target="_blank" rel="noopener">${esc(L.whatsappExibicao)}</a></li>
          <li>${icone("i-insta")}<a href="https://instagram.com/${esc(L.instagram)}" target="_blank" rel="noopener">@${esc(L.instagram)}</a></li>
          ${L.email ? `<li>${icone("i-mail")}<a href="mailto:${esc(L.email)}">${esc(L.email)}</a></li>` : ""}
          ${L.endereco ? `<li>${icone("i-pin")}<span>${esc(L.endereco)}</span></li>` : ""}</ul></div>
        <div><h3>Atendimento</h3><ul>
          <li>${icone("i-clock")}<span>${esc(L.horario.dias)}<br/>${esc(L.horario.horas)}</span></li>
          <li>${icone("i-truck")}<span>Envio imediato</span></li>
          <li>${icone("i-whats")}<span>Compra fechada no WhatsApp</span></li></ul></div>
      </div>
      <div class="rodape-base">
        <span>© ${ano} ${esc(L.nome)}. Todos os direitos reservados.</span>
        <span><a href="#/termos">Termos</a> /// <a href="#/privacidade">Privacidade</a></span>
      </div></div>`;
  }

  // ------------------------------------------------- eventos globais
  function trocarParam(chave, valor) {
    const [cam, q] = location.hash.split("?");
    const params = new URLSearchParams(q || "");
    valor ? params.set(chave, valor) : params.delete(chave);
    if (chave !== "ver") params.delete("ver");
    const qs = params.toString();
    location.hash = cam + (qs ? "?" + qs : "");
  }

  function ligarEventos() {
    document.addEventListener("click", (e) => {
      const t = e.target.closest("button, a");
      if (!t) {
        if (e.target.classList.contains("gaveta")) fechar();
        return;
      }
      if (t.matches("[data-fechar]")) return fechar();
      if (t.dataset.fav) { e.preventDefault(); return alternarFav(t.dataset.fav); }
      if (t.dataset.comprar) {
        const p = prodPorSlug(t.dataset.comprar);
        if (p.tamanhos.length || (p.cores && p.cores.length > 1)) location.hash = `#/produto/${p.slug}`;
        else { adicionar(p.slug, "", (p.cores && p.cores[0]) || ""); abrir("#gaveta-carrinho"); }
        return;
      }
      if (t.dataset.rapido) {
        e.preventDefault();
        const p = prodPorSlug(t.dataset.rapido);
        adicionar(p.slug, t.dataset.t, (p.cores && p.cores[0]) || "");
        t.classList.add("ok");
        setTimeout(() => t.classList.remove("ok"), 900);
        return;
      }
      if (t.dataset.mais) return trocarParam("ver", t.dataset.mais);
      if (t.dataset.rolar) {
        const tr = t.parentElement.querySelector(".trilho");
        return tr.scrollBy({ left: Number(t.dataset.rolar) * tr.clientWidth * 0.9, behavior: "smooth" });
      }
      if (t.dataset.cq !== undefined) {
        const i = carrinho[Number(t.dataset.cq)];
        const p = prodPorSlug(i.slug);
        i.qtd = Math.min(estoqueDe(p, i.tam), i.qtd + Number(t.dataset.d));
        return salvarCarrinho();
      }
      if (t.dataset.rem !== undefined) { carrinho.splice(Number(t.dataset.rem), 1); return salvarCarrinho(); }
      if (t.id === "finalizar") {
        const msg = mensagemPedido(carrinho, { nome: $("#ped-nome").value.trim(), obs: $("#ped-obs").value.trim() });
        return window.open(linkWhats(msg), "_blank", "noopener");
      }
    });

    document.addEventListener("change", (e) => {
      const s = e.target.closest("[data-filtro]");
      if (s) trocarParam(s.dataset.filtro, s.value);
    });

    $("#btn-menu").addEventListener("click", () => abrir("#gaveta-menu"));
    $("#btn-carrinho").addEventListener("click", () => abrir("#gaveta-carrinho"));
    $("#btn-busca").addEventListener("click", () => {
      const f = $("#barra-busca");
      f.hidden = !f.hidden;
      if (!f.hidden) $("#campo-busca").focus();
    });
    $("#fechar-busca").addEventListener("click", () => ($("#barra-busca").hidden = true));
    $("#barra-busca").addEventListener("submit", (e) => {
      e.preventDefault();
      const q = $("#campo-busca").value.trim();
      if (q) location.hash = `#/busca?q=${encodeURIComponent(q)}`;
    });
    $("#btn-tema").addEventListener("click", () => {
      const raiz = document.documentElement;
      raiz.dataset.theme = raiz.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem("tema", raiz.dataset.theme); } catch (e) {}
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { fechar(); $("#barra-busca").hidden = true; } });
    window.addEventListener("hashchange", rotear);

    // rolagem: topo compacto, barra de progresso, botão de voltar e parallax do banner
    const topo = $(".topo"), prog = $("#progresso"), subir = $("#subir");
    let agendado = false;
    const aoRolar = () => {
      agendado = false;
      const y = scrollY, total = document.documentElement.scrollHeight - innerHeight;
      topo.classList.toggle("rolou", y > 20);
      prog.style.transform = `scaleX(${total > 0 ? y / total : 0})`;
      subir.classList.toggle("on", y > 900);
      const gig = $(".hero-gigante");
      if (gig && !semMovimento && y < innerHeight * 1.2) gig.style.transform = `translate3d(${-y * 0.35}px, ${y * 0.12}px, 0)`;
    };
    addEventListener("scroll", () => { if (!agendado) { agendado = true; requestAnimationFrame(aoRolar); } }, { passive: true });
    subir.addEventListener("click", () => scrollTo({ top: 0, behavior: semMovimento ? "auto" : "smooth" }));
  }

  // ------------------------------------------------------------ início
  // abertura com o logo (só na primeira visita da sessão)
  const intro = $("#intro");
  if (intro) {
    let visto = false;
    try { visto = sessionStorage.getItem("intro") === "1"; sessionStorage.setItem("intro", "1"); } catch (e) {}
    if (visto || semMovimento) intro.remove();
    else setTimeout(() => { intro.classList.add("sai"); setTimeout(() => intro.remove(), 700); }, 1300);
  }
  montarFixos();
  ligarEventos();
  salvarCarrinho();
  atualizarFavs();
  rotear();
})();
