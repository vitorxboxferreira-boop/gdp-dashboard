/* =====================================================================
   Loja: aplicação de página única (SPA) sem dependências.
   Rotas por hash:
     #/                      início
     #/categorias            todas as categorias
     #/categoria/:slug       listagem de uma categoria
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
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("on"), 2200);
  }

  // ----------------------------------------- imagem automática (sem foto)
  const PALETAS = [
    ["#1c1c1a", "#3a3a36"], ["#2b1a12", "#ff5b14"], ["#0f1f2e", "#2f6f9f"],
    ["#1d2a1a", "#5f8f3a"], ["#2a1f2e", "#8b5fa8"], ["#2e2a1a", "#c9a227"],
  ];
  const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const cacheImg = {};
  function imagemAuto(p) {
    if (cacheImg[p.slug]) return cacheImg[p.slug];
    const [a, b] = PALETAS[hash(p.slug) % PALETAS.length];
    const cat = catPorSlug(p.categoria);
    const marca = esc(p.marca.toUpperCase());
    const tamFonte = Math.min(64, Math.floor(620 / Math.max(p.marca.length, 1)));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <rect width="400" height="500" fill="url(#g)"/>
      <text x="200" y="250" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="${tamFonte}" fill="rgba(255,255,255,.92)" letter-spacing="-2">${marca}</text>
      <text x="200" y="290" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" fill="rgba(255,255,255,.6)" letter-spacing="4">${esc((cat ? cat.nome : "").toUpperCase())}</text>
      <text x="200" y="470" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="rgba(255,255,255,.4)">foto do produto</text></svg>`;
    return (cacheImg[p.slug] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
  }
  const imagens = (p) => (p.imagens.length ? p.imagens : [imagemAuto(p)]);

  // ------------------------------------------------------------- estado
  let carrinho = ler("carrinho", []); // [{slug, tam, qtd}]
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
    b.hidden = !n;
    b.textContent = n;
    desenharCarrinho();
  }

  function adicionar(slug, tam, qtd = 1) {
    const p = prodPorSlug(slug);
    const ex = carrinho.find((i) => i.slug === slug && i.tam === tam);
    const max = estoqueDe(p, tam);
    if (ex) ex.qtd = Math.min(ex.qtd + qtd, max);
    else carrinho.push({ slug, tam, qtd: Math.min(qtd, max) });
    salvarCarrinho();
    toast("Adicionado ao carrinho");
  }

  function alternarFav(slug) {
    favoritos = favoritos.includes(slug) ? favoritos.filter((s) => s !== slug) : [...favoritos, slug];
    gravar("favoritos", favoritos);
    atualizarFavs();
    toast(favoritos.includes(slug) ? "Salvo nos favoritos" : "Removido dos favoritos");
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
      return `• ${i.qtd}x ${p.nome}${i.tam ? ` (Tam: ${i.tam})` : ""}: ${brl(sub)}`;
    });
    return [
      `Olá, ${L.nome}! Quero fazer este pedido:`,
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
  function card(p) {
    const sel = p.selo
      ? `<span class="selo ${semAcento(p.selo).split(" ")[0]}">${esc(p.selo)}</span>`
      : "";
    const tams = p.tamanhos.filter((t) => t.estoque > 0);
    const tamTxt = !p.tamanhos.length ? "Tamanho único" : tams.length > 4 ? `${tams.length} tamanhos` : tams.map((t) => esc(t.t)).join(" · ");
    const pc = parcelas(p.preco);
    const precoAntigo = p.precoAntigo ? `<s>${brl(p.precoAntigo)}</s>` : "";
    const fav = favoritos.includes(p.slug) ? " on" : "";
    return `<article class="card">
      ${sel}
      <button class="fav${fav}" data-fav="${esc(p.slug)}" aria-label="Favoritar ${esc(p.nome)}">${icone("i-heart")}</button>
      <a class="card-img" href="#/produto/${esc(p.slug)}" tabindex="-1" aria-hidden="true"><img src="${esc(imagens(p)[0])}" alt="" loading="lazy" /></a>
      <div class="card-corpo">
        <span class="card-marca">${esc(p.marca)}</span>
        <h3><a href="#/produto/${esc(p.slug)}">${esc(p.nome)}</a></h3>
        <div class="preco">${precoAntigo}${brl(p.preco)}</div>
        <div class="parcela">ou ${pc.n}x de ${brl(pc.p)} sem juros</div>
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
      <div class="trilho">${lista.map(card).join("")}</div>
      <button class="seta dir" data-rolar="1" aria-label="Próximo">${icone("i-right")}</button>
    </div>`;
  }

  const grade = (lista) =>
    lista.length
      ? `<div class="grade">${lista.map(card).join("")}</div>`
      : `<div class="vazio">${icone("i-search")}<p>Nenhum produto encontrado.</p></div>`;

  // --------------------------------------------------------------- páginas
  function paginaInicio() {
    const novidades = PRODS.filter((p) => p.novidade);
    const vitrines = L.vitrines
      .map((slug) => {
        const c = catPorSlug(slug);
        const lista = PRODS.filter((p) => p.categoria === slug);
        if (!c || !lista.length) return "";
        return `<section class="secao container">
          <div class="secao-cab"><h2>${esc(c.nome)}</h2><a href="#/categoria/${c.slug}">Ver todos →</a></div>
          ${carrossel(lista)}
        </section>`;
      })
      .join("");
    const ben = L.beneficios
      .map((b) => `<div class="beneficio">${icone("i-" + b.icone)}<div><strong>${esc(b.titulo)}</strong><small>${esc(b.texto)}</small></div></div>`)
      .join("");

    return `
      <h1 class="pular">${esc(L.nome)}</h1>
      <div class="container">
        <section class="hero" aria-label="Destaque">
          <div class="hero-marca" aria-hidden="true">${esc(L.nome)}</div>
          <div class="hero-txt">
            <span class="hero-chamada">${esc(L.banner.chamada)}</span>
            <h2>${esc(L.banner.titulo)}</h2>
            <p>${esc(L.banner.texto)}</p>
            <a class="btn btn-marca" href="${esc(L.banner.link)}">${esc(L.banner.botao)} ${icone("i-right")}</a>
          </div>
        </section>
      </div>
      <section class="beneficios" aria-label="Benefícios"><div class="beneficios-trilho">${ben}<span class="dup">${ben}</span></div></section>
      <nav class="cats" aria-label="Categorias">
        ${CATS.map((c) => `<a class="cat" href="#/categoria/${c.slug}"><span class="cat-ico">${icone("c-" + c.icone)}</span>${esc(c.nome)}</a>`).join("")}
      </nav>
      <section class="secao container" id="novidades">
        <div class="secao-cab"><h2>Novidades</h2><a href="#/categorias">Ver categorias →</a></div>
        ${carrossel(novidades)}
      </section>
      ${vitrines}
      <section class="faq container" id="perguntas">
        <h2>Perguntas frequentes</h2>
        ${L.faq.map((f) => `<details><summary>${esc(f.p)}</summary><p>${esc(f.r)}</p></details>`).join("")}
      </section>`;
  }

  function paginaCategorias() {
    return `<div class="container">
      <div class="lista-cab"><div><h1>Categorias</h1><p>${PRODS.length} produtos no catálogo</p></div></div>
      <div class="cats-grade">
        ${CATS.map((c) => {
          const n = PRODS.filter((p) => p.categoria === c.slug).length;
          return `<a href="#/categoria/${c.slug}">${icone("c-" + c.icone)}${esc(c.nome)}<small>${n} produto${n === 1 ? "" : "s"}</small></a>`;
        }).join("")}
      </div></div>`;
  }

  // listagem com ordenação e filtro de marca (categoria, busca, favoritos)
  function paginaLista({ titulo, sub, lista, chips = true, ativo = "" }) {
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    const ordem = params.get("ordem") || "";
    const marca = params.get("marca") || "";
    const marcas = [...new Set(lista.map((p) => p.marca))].sort();
    let r = marca ? lista.filter((p) => p.marca === marca) : [...lista];
    if (ordem === "menor") r.sort((a, b) => a.preco - b.preco);
    if (ordem === "maior") r.sort((a, b) => b.preco - a.preco);
    if (ordem === "az") r.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const opt = (v, t, cur) => `<option value="${v}"${v === cur ? " selected" : ""}>${t}</option>`;

    return `<div class="container">
      <nav class="migalha" aria-label="Você está em"><a href="#/">Início</a><span>/</span><span>${esc(titulo)}</span></nav>
      ${chips ? `<div class="chips">${CATS.map((c) => `<a class="${c.slug === ativo ? "on" : ""}" href="#/categoria/${c.slug}">${esc(c.nome)}</a>`).join("")}</div>` : ""}
      <div class="lista-cab">
        <div><h1>${esc(titulo)}</h1><p>${sub || `${r.length} produto${r.length === 1 ? "" : "s"}`}</p></div>
        ${lista.length ? `<div class="filtros">
          <select data-filtro="marca" aria-label="Filtrar por marca">${opt("", "Todas as marcas", marca)}${marcas.map((m) => opt(esc(m), esc(m), marca)).join("")}</select>
          <select data-filtro="ordem" aria-label="Ordenar">${opt("", "Relevância", ordem)}${opt("menor", "Menor preço", ordem)}${opt("maior", "Maior preço", ordem)}${opt("az", "A–Z", ordem)}</select>
        </div>` : ""}
      </div>
      ${grade(r)}
    </div>`;
  }

  function paginaProduto(slug) {
    const p = prodPorSlug(slug);
    if (!p) return pagina404();
    const c = catPorSlug(p.categoria);
    const pc = parcelas(p.preco);
    const imgs = imagens(p);
    const fav = favoritos.includes(p.slug) ? " on" : "";
    const relacionados = PRODS.filter((x) => x.categoria === p.categoria && x.slug !== p.slug).slice(0, 10);
    document.title = `${p.nome} · ${L.nome}`;

    return `<div class="container">
      <nav class="migalha" aria-label="Você está em">
        <a href="#/">Início</a><span>/</span><a href="#/categoria/${c.slug}">${esc(c.nome)}</a><span>/</span><span>${esc(p.nome)}</span>
      </nav>
      <div class="produto" data-produto="${esc(p.slug)}">
        <div>
          <div class="galeria-principal">
            ${p.selo ? `<span class="selo ${semAcento(p.selo).split(" ")[0]}">${esc(p.selo)}</span>` : ""}
            <button class="fav${fav}" data-fav="${esc(p.slug)}" aria-label="Favoritar">${icone("i-heart")}</button>
            <img id="img-principal" src="${esc(imgs[0])}" alt="${esc(p.nome)}" />
          </div>
          ${imgs.length > 1 ? `<div class="miniaturas">${imgs.map((src, i) => `<button class="${i ? "" : "on"}" data-img="${esc(src)}" aria-label="Foto ${i + 1}"><img src="${esc(src)}" alt="" /></button>`).join("")}</div>` : ""}
        </div>
        <div class="info-prod">
          <span class="card-marca">${esc(p.marca)}</span>
          <h1>${esc(p.nome)}</h1>
          <div class="preco">${p.precoAntigo ? `<s>${brl(p.precoAntigo)}</s>` : ""}${brl(p.preco)}</div>
          <div class="parcela">ou ${pc.n}x de ${brl(pc.p)} sem juros${pc.ultima !== pc.p ? ` (última de ${brl(pc.ultima)})` : ""}</div>
          <div class="pix-box">${icone("i-pix")} ${brl(precoPix(p.preco))} no Pix (${L.descontoPix}% OFF)</div>

          ${p.tamanhos.length ? `
            <div class="rotulo">Tamanho <small>Selecione uma opção</small></div>
            <div class="tamanhos" role="radiogroup" aria-label="Tamanhos">
              ${p.tamanhos.map((t) => `<button role="radio" aria-checked="false" data-tam="${esc(t.t)}" ${t.estoque > 0 ? "" : "disabled"}>${esc(t.t)}</button>`).join("")}
            </div>
            <div class="estoque-info" id="estoque-info">Escolha o tamanho para ver a quantidade disponível.</div>` : ""}

          <div class="rotulo">Quantidade</div>
          <div class="compra">
            <div class="qtd" style="margin:0;height:46px">
              <button data-q="-1" aria-label="Diminuir">${icone("i-minus")}</button>
              <span id="qtd-val">1</span>
              <button data-q="1" aria-label="Aumentar">${icone("i-plus")}</button>
            </div>
            <button class="btn btn-escuro" id="add-carrinho">${icone("i-bag")} Adicionar ao carrinho</button>
            <button class="btn btn-whats" id="comprar-agora">${icone("i-whats")} Comprar agora pelo WhatsApp</button>
          </div>
          <div class="erro-tam" id="erro-tam" role="alert"></div>
          <div class="descricao"><p>${esc(p.descricao)}</p></div>
        </div>
      </div>
      ${relacionados.length ? `<section class="secao"><div class="secao-cab"><h2>Você também pode gostar</h2><a href="#/categoria/${c.slug}">Ver todos →</a></div>${carrossel(relacionados)}</section>` : ""}
    </div>`;
  }

  function ligarProduto(slug) {
    const p = prodPorSlug(slug);
    if (!p) return;
    let tam = p.tamanhos.length ? null : "";
    let qtd = 1;
    const max = () => (tam === null ? 1 : estoqueDe(p, tam));
    const atualizaQtd = () => ($("#qtd-val").textContent = qtd);

    $$(".tamanhos button").forEach((b) =>
      b.addEventListener("click", () => {
        $$(".tamanhos button").forEach((x) => { x.classList.remove("on"); x.setAttribute("aria-checked", "false"); });
        b.classList.add("on");
        b.setAttribute("aria-checked", "true");
        tam = b.dataset.tam;
        const e = estoqueDe(p, tam);
        $("#estoque-info").textContent = e === 1 ? "Última unidade neste tamanho!" : `${e} unidades disponíveis`;
        $("#erro-tam").textContent = "";
        qtd = Math.min(qtd, e);
        atualizaQtd();
      })
    );
    $$("[data-q]").forEach((b) =>
      b.addEventListener("click", () => {
        qtd = Math.max(1, Math.min(max(), qtd + Number(b.dataset.q)));
        atualizaQtd();
      })
    );
    const exigeTam = () => {
      if (tam === null) { $("#erro-tam").textContent = "Selecione um tamanho."; return false; }
      return true;
    };
    $("#add-carrinho").addEventListener("click", () => { if (exigeTam()) { adicionar(p.slug, tam, qtd); abrir("#gaveta-carrinho"); } });
    $("#comprar-agora").addEventListener("click", () => {
      if (exigeTam()) window.open(linkWhats(mensagemPedido([{ slug: p.slug, tam, qtd }])), "_blank", "noopener");
    });
    $$("[data-img]").forEach((b) =>
      b.addEventListener("click", () => {
        $("#img-principal").src = b.dataset.img;
        $$("[data-img]").forEach((x) => x.classList.toggle("on", x === b));
      })
    );
  }

  const pagina404 = () =>
    `<div class="container vazio" style="padding:80px 16px"><h1 style="font-size:48px">404</h1><p>Página não encontrada.</p><a class="btn btn-escuro" href="#/">Voltar ao início</a></div>`;

  const paginaTexto = (titulo, texto) =>
    `<div class="container pagina-txt"><h1>${esc(titulo)}</h1>${texto.map((t) => `<p>${esc(t)}</p>`).join("")}</div>`;

  // -------------------------------------------------------------- roteador
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
      html = c
        ? paginaLista({ titulo: c.nome, lista: PRODS.filter((p) => p.categoria === c.slug), ativo: c.slug })
        : pagina404();
      if (c) document.title = `${c.nome} · ${L.nome}`;
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
      html = paginaLista({ titulo: q ? `Busca: “${q}”` : "Busca", lista, chips: false });
    } else if (partes[0] === "favoritos") {
      const lista = favoritos.map(prodPorSlug).filter(Boolean);
      html = paginaLista({ titulo: "Favoritos", lista, chips: false, sub: lista.length ? "" : "Toque no coração dos produtos para salvar aqui." });
    } else if (partes[0] === "privacidade") {
      html = paginaTexto("Política de Privacidade", [
        `A ${L.nome} usa o armazenamento do seu navegador só para lembrar seu carrinho, favoritos e tema. Nada disso é enviado para nossos servidores.`,
        "Os dados do pedido (produtos, nome e observações) só são compartilhados quando você envia a mensagem pelo WhatsApp.",
      ]);
    } else if (partes[0] === "termos") {
      html = paginaTexto("Termos de Uso", [
        "Os preços e a disponibilidade podem mudar sem aviso prévio. O pedido só é confirmado após o atendimento pelo WhatsApp.",
        `O desconto de ${L.descontoPix}% vale para pagamentos via Pix. Parcelamento em até ${L.parcelasSemJuros}x sem juros no cartão de crédito.`,
      ]);
    } else html = pagina404();

    main.innerHTML = html;
    depois && depois();
    $$("#menu a").forEach((a) => a.classList.toggle("ativo", location.hash.startsWith(a.getAttribute("href"))));
    fechar();
    // rola para o topo, exceto quando a âncora é uma seção da página inicial
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  // --------------------------------------------------------------- carrinho
  function desenharCarrinho() {
    const box = $("#carrinho-itens");
    const rod = $("#carrinho-rodape");
    if (!carrinho.length) {
      box.innerHTML = `<div class="vazio">${icone("i-bag")}<p>Seu carrinho está vazio.</p></div>`;
      rod.innerHTML = `<button class="btn btn-linha btn-bloco" data-fechar>Continuar comprando</button>`;
      return;
    }
    let total = 0;
    box.innerHTML = carrinho
      .map((i, idx) => {
        const p = prodPorSlug(i.slug);
        total += p.preco * i.qtd;
        return `<div class="item-car">
          <a class="mini" href="#/produto/${esc(p.slug)}"><img src="${esc(imagens(p)[0])}" alt="" /></a>
          <div>
            <h4>${esc(p.nome)}</h4>
            <small>${i.tam ? `Tamanho ${esc(i.tam)} · ` : ""}${brl(p.preco)}</small><br/>
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
      <div class="linha-total" style="color:var(--ok);font-weight:600"><span>No Pix (${L.descontoPix}% OFF)</span><span>${brl(precoPix(total))}</span></div>
      <input id="ped-nome" placeholder="Seu nome (opcional)" autocomplete="name" />
      <textarea id="ped-obs" rows="2" placeholder="Observações: cidade para envio, forma de pagamento…"></textarea>
      <button class="btn btn-whats btn-bloco" id="finalizar">${icone("i-whats")} Finalizar pelo WhatsApp</button>
      <small style="color:var(--suave);text-align:center">A compra é finalizada no WhatsApp com o pedido já preenchido.</small>`;
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
    const partesNome = L.nome.split(" ");
    $("#logo").innerHTML = partesNome.length > 1
      ? `${esc(partesNome.slice(0, -1).join(" "))}<b>${esc(" " + partesNome.at(-1))}</b>`
      : esc(L.nome);
    document.querySelector('meta[name="description"]').content = L.descricao;

    const avisos = L.avisos.map((a) => `<span>${esc(a)}</span>`).join("");
    $("#faixa").innerHTML = avisos.repeat(4) + avisos.repeat(4); // duas metades iguais = loop contínuo

    const menuPrincipal = CATS.slice(0, 6);
    $("#menu").innerHTML = menuPrincipal.map((c) => `<a href="#/categoria/${c.slug}">${esc(c.nome)}</a>`).join("") + `<a href="#/categorias">Ver todas</a>`;
    $("#menu-mobile").innerHTML =
      `<a href="#/">Início</a>` +
      CATS.map((c) => `<a href="#/categoria/${c.slug}">${icone("c-" + c.icone)} ${esc(c.nome)}</a>`).join("") +
      `<a href="#/favoritos">${icone("i-heart")} Favoritos</a>`;

    $("#whats-flutuante").href = linkWhats(`Olá, ${L.nome}! Vim pelo site.`);

    const ano = new Date().getFullYear();
    $("#rodape").innerHTML = `<div class="container">
      <div class="rodape-grade">
        <div>
          <a class="logo" href="#/">${$("#logo").innerHTML}</a>
          <p>${esc(L.descricao)}</p>
          <a class="btn btn-linha" href="https://instagram.com/${esc(L.instagram)}" target="_blank" rel="noopener">${icone("i-insta")} @${esc(L.instagram)}</a>
        </div>
        <nav aria-label="Categorias no rodapé"><h3>Categorias</h3><ul>
          ${CATS.slice(0, 6).map((c) => `<li><a href="#/categoria/${c.slug}">${esc(c.nome)}</a></li>`).join("")}
          <li><a href="#/categorias">Ver todas</a></li></ul></nav>
        <div><h3>Contato</h3><ul>
          <li>${icone("i-whats")}<a href="${linkWhats(`Olá, ${L.nome}!`)}" target="_blank" rel="noopener">${esc(L.whatsappExibicao)}</a></li>
          <li>${icone("i-mail")}<a href="mailto:${esc(L.email)}">${esc(L.email)}</a></li>
          <li>${icone("i-pin")}<span>${esc(L.endereco)}</span></li></ul></div>
        <div><h3>Atendimento</h3><ul>
          <li>${icone("i-clock")}<span>${esc(L.horario.dias)}<br/>${esc(L.horario.horas)}</span></li>
          <li>${icone("i-truck")}<span>Envio imediato</span></li>
          <li>${icone("i-whats")}<span>Compra finalizada pelo WhatsApp</span></li></ul></div>
      </div>
      <div class="rodape-base">
        <span>© ${ano} ${esc(L.nome)}. Todos os direitos reservados.</span>
        <span><a href="#/termos">Termos de Uso</a> · <a href="#/privacidade">Privacidade</a></span>
      </div></div>`;
  }

  // ------------------------------------------------- eventos globais
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
        if (p.tamanhos.length) location.hash = `#/produto/${p.slug}`;
        else { adicionar(p.slug, ""); abrir("#gaveta-carrinho"); }
        return;
      }
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
      // âncora interna da página inicial (ex.: #novidades)
      const href = t.getAttribute("href");
      if (href && href.startsWith("#") && !href.startsWith("#/")) {
        e.preventDefault();
        const alvo = document.getElementById(href.slice(1));
        if (alvo) alvo.scrollIntoView({ behavior: "smooth" });
        else { location.hash = "#/"; setTimeout(() => document.getElementById(href.slice(1))?.scrollIntoView(), 50); }
      }
    });

    document.addEventListener("change", (e) => {
      const s = e.target.closest("[data-filtro]");
      if (!s) return;
      const [cam, q] = location.hash.split("?");
      const params = new URLSearchParams(q || "");
      s.value ? params.set(s.dataset.filtro, s.value) : params.delete(s.dataset.filtro);
      const qs = params.toString();
      location.hash = cam + (qs ? "?" + qs : "");
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
      const escuroAgora = raiz.dataset.theme
        ? raiz.dataset.theme === "dark"
        : matchMedia("(prefers-color-scheme: dark)").matches;
      raiz.dataset.theme = escuroAgora ? "light" : "dark";
      try { localStorage.setItem("tema", raiz.dataset.theme); } catch (e) {}
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { fechar(); $("#barra-busca").hidden = true; } });
    window.addEventListener("hashchange", rotear);
  }

  // ------------------------------------------------------------ início
  montarFixos();
  ligarEventos();
  salvarCarrinho();
  atualizarFavs();
  rotear();
})();
