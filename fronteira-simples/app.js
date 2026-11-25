// ================= CONFIGURAÇÃO =================
// O estoque fica em estoque.js. Aqui ficam só as regras do site.
// carros sem foto ainda não aparecem no site
const CARROS = window.ESTOQUE.filter((c) => c.fotos.length);
const TAXA = 0.0149;      // juros ao mês usados na simulação
const IPVA_RS = 0.03;     // alíquota do IPVA de automóveis no RS (usada só em 0KM)
const POR_PAGINA = 9;     // quantos carros aparecem antes do "Ver mais"
const WHATS_LINK = 'https://bit.ly/ContatoFronteiraVeiculos';
// Número do WhatsApp da loja com DDI e DDD, só dígitos (ex.: '5555999999999').
// Com ele preenchido, o carrinho e o orçamento abrem o WhatsApp já com a mensagem escrita.
const WHATS_NUM = '';

// ================= UTILITÁRIOS =================
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const km = (v) => (v === 0 ? '0 km' : `${v.toLocaleString('pt-BR')} km`);
const parcela = (pv, n) => (pv <= 0 ? 0 : (pv * TAXA) / (1 - Math.pow(1 + TAXA, -n)));
const byId = (id) => CARROS.find((c) => c.id === id);
const nome = (c) => `${c.marca} ${c.modelo}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

let toastT = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 2600);
}

// Com número configurado abre o WhatsApp com o texto pronto;
// sem número, copia o texto e abre o link da loja para o cliente colar.
function enviarWhats(texto) {
  if (WHATS_NUM) {
    window.open(`https://wa.me/${WHATS_NUM}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    return;
  }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(texto).then(() => toast('Mensagem copiada: é só colar no WhatsApp.'), () => {});
  }
  window.open(WHATS_LINK, '_blank', 'noopener');
}

// ================= FILTROS DO ESTOQUE =================
const filtro = { cat: 'all', q: '', marca: '', tipo: '', max: 0, ordem: 'destaque' };
let mostrando = POR_PAGINA;

function opcoes(sel, valores, rotulo) {
  sel.innerHTML = `<option value="">${rotulo}</option>` + valores.map((v) => `<option>${esc(v)}</option>`).join('');
}
opcoes($('#f-marca'), [...new Set(CARROS.map((c) => c.marca))].sort(), 'Todas as marcas');
opcoes($('#f-tipo'), [...new Set(CARROS.map((c) => c.carroceria))].sort(), 'Todos os tipos');

function contaCats() {
  $$('.chip[data-f]').forEach((b) => {
    const n = b.dataset.f === 'all' ? CARROS.length : CARROS.filter((c) => c.cat === b.dataset.f).length;
    b.querySelector('i').textContent = n;
  });
}

function filtrados() {
  const q = semAcento(filtro.q.trim());
  let r = CARROS.filter((c) =>
    (filtro.cat === 'all' || c.cat === filtro.cat) &&
    (!filtro.marca || c.marca === filtro.marca) &&
    (!filtro.tipo || c.carroceria === filtro.tipo) &&
    (!filtro.max || c.preco <= filtro.max) &&
    (!q || semAcento(`${c.marca} ${c.modelo} ${c.versao} ${c.cor} ${c.combustivel} ${c.carroceria} ${c.ano}`).includes(q)));
  const ord = {
    'menor': (a, b) => a.preco - b.preco,
    'maior': (a, b) => b.preco - a.preco,
    'km': (a, b) => a.km - b.km,
    'novo': (a, b) => parseInt(b.ano.slice(-4)) - parseInt(a.ano.slice(-4)),
  }[filtro.ordem];
  return ord ? r.sort(ord) : r;
}

function cardHTML(c) {
  const tags = [c.cat === 'Premium' ? 'Premium' : c.cat, c.selo].filter(Boolean);
  return `
  <article class="car" data-id="${c.id}" data-cat="${c.cat}" tabindex="0" aria-label="Ver detalhes do ${esc(nome(c))}">
    <div class="car-img">
      <div class="tags">${tags.map((t, i) => `<span class="badge ${i ? 'selo' : 'cat-' + c.cat}">${esc(t)}</span>`).join('')}</div>
      <img src="${c.fotos[0]}" alt="${esc(nome(c))}" loading="lazy" width="800" height="500">
      ${c.fotos.length > 1 ? `<span class="nfotos"><svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l2-2h4l2 2"/></svg>${c.fotos.length}</span>` : ''}
    </div>
    <div class="car-body">
      <h3>${esc(c.marca)} <b>${esc(c.modelo)}</b></h3>
      <p class="versao">${esc(c.versao)}</p>
      <ul class="facts">
        <li>${esc(c.ano)}</li><li>${km(c.km)}</li><li>${esc(c.cambio)}</li><li>${esc(c.combustivel)}</li>
      </ul>
      <div class="price">
        ${c.precoDe ? `<s>${brl(c.precoDe)}</s>` : ''}
        <strong>${brl(c.preco)}</strong>
        <span>ou 48x de ${brl(parcela(c.preco * 0.8, 48))}*</span>
      </div>
      <div class="car-cta">
        <button class="btn btn-primary" data-add="${c.id}">Adicionar ao carrinho</button>
        <button class="btn btn-line" data-sim="${c.id}" aria-label="Simular ${esc(nome(c))}">Simular</button>
      </div>
    </div>
  </article>`;
}

const lista = $('#cars');
function renderEstoque() {
  const r = filtrados();
  $('#count').textContent = r.length === 1 ? '1 veículo encontrado' : `${r.length} veículos encontrados`;
  lista.innerHTML = r.slice(0, mostrando).map(cardHTML).join('') ||
    '<div class="vazio"><b>Nenhum carro com esses filtros.</b><p>Tente outra busca ou fale com a gente: encontramos o carro certo para você.</p><button class="btn btn-line" id="limpar2">Limpar filtros</button></div>';
  $('#mais').hidden = r.length <= mostrando;
  $('#mais').textContent = `Ver mais ${Math.min(POR_PAGINA, r.length - mostrando)} veículos`;
  const ativo = filtro.cat !== 'all' || filtro.q || filtro.marca || filtro.tipo || filtro.max;
  $('#limpar').hidden = !ativo;
  marcarBotoes();
}
function mudou() { mostrando = POR_PAGINA; renderEstoque(); }

$$('.chip[data-f]').forEach((b) => b.addEventListener('click', () => {
  $$('.chip[data-f]').forEach((x) => x.classList.toggle('on', x === b));
  filtro.cat = b.dataset.f;
  mudou();
}));
let buscaT = 0;
$('#f-q').addEventListener('input', (e) => { clearTimeout(buscaT); buscaT = setTimeout(() => { filtro.q = e.target.value; mudou(); }, 150); });
$('#f-marca').addEventListener('change', (e) => { filtro.marca = e.target.value; mudou(); });
$('#f-tipo').addEventListener('change', (e) => { filtro.tipo = e.target.value; mudou(); });
$('#f-max').addEventListener('change', (e) => { filtro.max = +e.target.value; mudou(); });
$('#f-ordem').addEventListener('change', (e) => { filtro.ordem = e.target.value; mudou(); });
$('#mais').addEventListener('click', () => { mostrando += POR_PAGINA; renderEstoque(); });
function limpar() {
  Object.assign(filtro, { cat: 'all', q: '', marca: '', tipo: '', max: 0 });
  $('#f-q').value = ''; $('#f-marca').value = ''; $('#f-tipo').value = ''; $('#f-max').value = '0';
  $$('.chip[data-f]').forEach((x) => x.classList.toggle('on', x.dataset.f === 'all'));
  mudou();
}
$('#limpar').addEventListener('click', limpar);

// marcas da seção "A loja" filtram o estoque
$$('[data-marca]').forEach((b) => b.addEventListener('click', () => {
  limpar();
  filtro.marca = b.dataset.marca;
  $('#f-marca').value = b.dataset.marca;
  mudou();
  $('#estoque').scrollIntoView({ behavior: 'smooth' });
}));

lista.addEventListener('click', (e) => {
  if (e.target.id === 'limpar2') return limpar();
  const add = e.target.closest('[data-add]');
  const sim = e.target.closest('[data-sim]');
  const card = e.target.closest('.car');
  if (add) addCart(add.dataset.add);
  else if (sim) irSimular(sim.dataset.sim);
  else if (card) abrirModal(card.dataset.id);
});
lista.addEventListener('keydown', (e) => {
  const card = e.target.closest('.car');
  if (card && e.target === card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); abrirModal(card.dataset.id); }
});

// ================= JANELAS (detalhe e carrinho) =================
const overlay = $('#overlay');
let aberto = null;
function abrir(el) {
  fechar(true);
  aberto = el;
  overlay.hidden = false;
  el.hidden = false;
  requestAnimationFrame(() => { overlay.classList.add('on'); el.classList.add('on'); });
  document.body.classList.add('locked');
}
function fechar(trocando) {
  if (!aberto) return;
  const el = aberto;
  aberto = null;
  el.classList.remove('on');
  if (!trocando) overlay.classList.remove('on');
  document.body.classList.remove('locked');
  if (el.id === 'modal' && location.hash.startsWith('#carro=')) history.replaceState(null, '', location.pathname + location.search);
  setTimeout(() => { if (aberto !== el) el.hidden = true; if (!aberto) overlay.hidden = true; }, 300);
}
overlay.addEventListener('click', () => fechar());
$$('[data-close]').forEach((b) => b.addEventListener('click', () => fechar()));
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') fechar();
  if (aberto && aberto.id === 'modal' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) trocaFoto(e.key === 'ArrowRight' ? 1 : -1);
});

let modalId = null;
let fotoIdx = 0;
function mostraFoto(i) {
  const c = byId(modalId);
  fotoIdx = (i + c.fotos.length) % c.fotos.length;
  $('#m-img').src = c.fotos[fotoIdx];
  $$('#m-thumbs button').forEach((b, j) => b.classList.toggle('on', j === fotoIdx));
}
function trocaFoto(d) { if (byId(modalId).fotos.length > 1) mostraFoto(fotoIdx + d); }
$('#m-prev').addEventListener('click', () => trocaFoto(-1));
$('#m-next').addEventListener('click', () => trocaFoto(1));
$('#m-thumbs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) mostraFoto(+b.dataset.i); });
// deslizar o dedo na foto troca a imagem
let toqueX = null;
$('#m-gal').addEventListener('touchstart', (e) => { toqueX = e.touches[0].clientX; }, { passive: true });
$('#m-gal').addEventListener('touchend', (e) => {
  if (toqueX === null) return;
  const dx = e.changedTouches[0].clientX - toqueX;
  if (Math.abs(dx) > 40) trocaFoto(dx < 0 ? 1 : -1);
  toqueX = null;
});

function abrirModal(id) {
  const c = byId(id);
  if (!c) return;
  modalId = id;
  const varias = c.fotos.length > 1;
  $('#m-thumbs').innerHTML = varias ? c.fotos.map((f, i) => `<button data-i="${i}" aria-label="Foto ${i + 1}"><img src="${f}" alt=""></button>`).join('') : '';
  $('#m-prev').hidden = $('#m-next').hidden = !varias;
  mostraFoto(0);
  $('#m-img').alt = nome(c);
  $('#m-badge').textContent = c.cat;
  $('#m-badge').className = `badge cat-${c.cat}`;
  $('#m-brand').textContent = c.marca;
  $('#m-title').textContent = c.modelo;
  $('#m-versao').textContent = c.versao;
  $('#m-desc').textContent = c.desc;
  const ficha = [
    ['Ano/modelo', c.ano], ['Quilometragem', km(c.km)], ['Câmbio', c.cambio], ['Combustível', c.combustivel],
    ['Motor', c.motor], ['Potência', c.potencia], ['Cor', c.cor], ['Carroceria', c.carroceria],
    c.placa ? ['Final da placa', c.placa] : null, ['Portas', c.portas],
  ].filter(Boolean);
  $('#m-ficha').innerHTML = ficha.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
  $('#m-opc').innerHTML = c.opcionais.map((o) => `<li>${esc(o)}</li>`).join('');
  $('#m-price').innerHTML = `${c.precoDe ? `<s>${brl(c.precoDe)}</s>` : ''}${brl(c.preco)}`;
  $('#m-pmt').textContent = `ou 48x de ${brl(parcela(c.preco * 0.8, 48))} com 20% de entrada*`;
  atualizarBotaoModal();
  history.replaceState(null, '', `#carro=${id}`);
  abrir($('#modal'));
  $('#modal').scrollTop = 0;
}
function atualizarBotaoModal() {
  const b = $('#m-add');
  const tem = carrinho.includes(modalId);
  b.textContent = tem ? 'No carrinho ✓ · ver carrinho' : 'Adicionar ao carrinho';
  b.classList.toggle('done', tem);
}
$('#m-add').addEventListener('click', () => {
  if (carrinho.includes(modalId)) abrirCarrinho();
  else addCart(modalId);
});
$('#m-sim').addEventListener('click', () => { const id = modalId; fechar(); irSimular(id); });
$('#m-share').addEventListener('click', async () => {
  const c = byId(modalId);
  const url = location.href.split('#')[0] + '#carro=' + modalId;
  const texto = `${nome(c)} ${c.versao} ${c.ano} por ${brl(c.preco)} na Fronteira Veículos`;
  try {
    if (navigator.share) await navigator.share({ title: nome(c), text: texto, url });
    else { await navigator.clipboard.writeText(`${texto}: ${url}`); toast('Link copiado.'); }
  } catch (e) { /* cancelado */ }
});
$('#m-whats').addEventListener('click', () => {
  const c = byId(modalId);
  enviarWhats(`Olá, Fronteira Veículos! Tenho interesse no ${nome(c)} ${c.versao} ${c.ano} (${km(c.km)}), anunciado por ${brl(c.preco)}. Ainda está disponível?`);
});

// ================= CARRINHO =================
let carrinho = [];
try { carrinho = JSON.parse(localStorage.getItem('fronteira-carrinho') || '[]').filter(byId); } catch (e) { carrinho = []; }
function salvar() { try { localStorage.setItem('fronteira-carrinho', JSON.stringify(carrinho)); } catch (e) { /* sem armazenamento */ } }

function addCart(id) {
  if (!carrinho.includes(id)) carrinho.push(id);
  salvar();
  renderCarrinho();
  toast(`${nome(byId(id))} adicionado ao carrinho`);
  const btn = $('#cart-open');
  btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
  if (aberto && aberto.id === 'modal') atualizarBotaoModal();
}
function removeCart(id) {
  carrinho = carrinho.filter((x) => x !== id);
  salvar();
  renderCarrinho();
}
function totalCarrinho() { return carrinho.reduce((s, id) => s + byId(id).preco, 0); }

function marcarBotoes() {
  $$('[data-add]').forEach((b) => {
    const tem = carrinho.includes(b.dataset.add);
    b.textContent = tem ? 'No carrinho ✓' : 'Adicionar ao carrinho';
    b.classList.toggle('done', tem);
  });
}
function renderCarrinho() {
  $('#cart-count').textContent = carrinho.length;
  $('#cart-open').classList.toggle('has', carrinho.length > 0);
  marcarBotoes();
  const box = $('#d-items');
  if (!carrinho.length) {
    box.innerHTML = '<p class="empty">Seu carrinho está vazio.<br>Toque em um carro do estoque para adicionar.</p>';
    $('#d-foot').hidden = true;
  } else {
    box.innerHTML = carrinho.map((id) => {
      const c = byId(id);
      return `<div class="d-item"><img src="${c.fotos[0]}" alt=""><div><small>${esc(c.marca)} · ${esc(c.ano)}</small><b>${esc(c.modelo)}</b><span>${brl(c.preco)}</span></div><button class="rm" data-rm="${id}" aria-label="Remover ${esc(c.modelo)}">×</button></div>`;
    }).join('');
    $('#d-total').textContent = brl(totalCarrinho());
    $('#d-foot').hidden = false;
  }
  montarSelect();
}
$('#d-items').addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) removeCart(b.dataset.rm); });
function abrirCarrinho() { abrir($('#drawer')); }
$('#cart-open').addEventListener('click', abrirCarrinho);
$('#d-sim').addEventListener('click', () => { fechar(); irSimular('carrinho'); });
$('#d-send').addEventListener('click', () => {
  const linhas = carrinho.map((id) => { const c = byId(id); return `• ${nome(c)} ${c.versao} ${c.ano} (${km(c.km)}): ${brl(c.preco)}`; });
  enviarWhats(`Olá, Fronteira Veículos! Tenho interesse nestes veículos:\n${linhas.join('\n')}\nTotal: ${brl(totalCarrinho())}\nPodem me passar uma proposta?`);
});

// ================= SIMULADOR / ORÇAMENTO =================
const sel = $('#s-car');
function montarSelect() {
  const atual = sel.value;
  const grupos = ['0KM', 'Seminovo', 'Premium'].map((cat) => {
    const cs = CARROS.filter((c) => c.cat === cat).sort((a, b) => a.preco - b.preco);
    return cs.length ? `<optgroup label="${cat === 'Seminovo' ? 'Seminovos' : cat}">${cs.map((c) => `<option value="${c.id}">${esc(nome(c))} ${esc(c.ano)} · ${brl(c.preco)}</option>`).join('')}</optgroup>` : '';
  }).join('');
  sel.innerHTML = (carrinho.length > 1 ? `<option value="carrinho">Itens do carrinho (${carrinho.length}) · ${brl(totalCarrinho())}</option>` : '') + grupos;
  sel.value = [...sel.options].some((o) => o.value === atual) ? atual : sel.options[0].value;
  simular();
}
const escolhidos = () => (sel.value === 'carrinho' ? carrinho.map(byId) : [byId(sel.value)]);
const tradeEl = $('#s-trade');
const valorTroca = () => +tradeEl.value.replace(/\D/g, '') || 0;
tradeEl.addEventListener('input', () => {
  const v = valorTroca();
  tradeEl.value = v ? v.toLocaleString('pt-BR') : '';
  simular();
});

let ultimo = null;
function simular() {
  const carros = escolhidos();
  if (!carros.length || !carros[0]) return;
  const preco = carros.reduce((s, c) => s + c.preco, 0);
  const troca = Math.min(valorTroca(), preco);
  const restante = preco - troca;
  const pct = +$('#s-down').value / 100;
  const entrada = Math.round(restante * pct);
  const fin = restante - entrada;
  const n = +$('#s-n').value;
  const pmt = parcela(fin, n);
  // IPVA proporcional aos meses que faltam no ano (somente para 0KM)
  const mesesRest = 12 - new Date().getMonth();
  const ipva = carros.filter((c) => c.cat === '0KM').reduce((s, c) => s + c.preco * IPVA_RS * (mesesRest / 12), 0);
  const hoje = entrada + ipva;

  $('#s-down-out').textContent = `${Math.round(pct * 100)}% · ${brl(entrada)}`;
  $('#s-n-out').textContent = `${n} meses`;
  $('#r-pmt').textContent = fin > 0 ? `${n}x ${brl(pmt)}` : 'À vista';
  $('#r-pmt-sub').textContent = fin > 0 ? `juros de ${(TAXA * 100).toFixed(2).replace('.', ',')}% ao mês (ilustrativo)` : 'sem financiamento';
  $('#r-price').textContent = brl(preco);
  $('#r-trade').textContent = troca ? `− ${brl(troca)}` : brl(0);
  $('#r-down').textContent = entrada ? `− ${brl(entrada)}` : brl(0);
  $('#r-fin').textContent = brl(fin);
  $('#r-paid').textContent = brl(pmt * n);
  $('#c-down').textContent = brl(entrada);
  $('#c-ipva').textContent = ipva ? brl(ipva) : 'Não se aplica';
  $('#c-ipva-l').textContent = ipva ? `IPVA ${new Date().getFullYear()} proporcional (estimado)` : 'IPVA (seminovo já quitado)';
  $('#c-total').textContent = brl(hoje);
  ultimo = { carros, preco, troca, entrada, fin, n, pmt };
}
['#s-car', '#s-down', '#s-n'].forEach((s) => $(s).addEventListener('input', simular));

function irSimular(id) {
  if (id === 'carrinho' && carrinho.length === 1) id = carrinho[0];
  sel.value = id;
  simular();
  $('#simulador').scrollIntoView({ behavior: 'smooth' });
}

$('#send-sim').addEventListener('click', () => {
  const o = ultimo;
  const nomes = o.carros.map((c) => `${nome(c)} ${c.ano}`).join(' + ');
  enviarWhats([
    'Olá, Fronteira Veículos! Fiz esta simulação no site:',
    `Veículo: ${nomes} (${brl(o.preco)})`,
    o.troca ? `Usado na troca: ${brl(o.troca)}` : null,
    `Entrada: ${brl(o.entrada)}`,
    o.fin > 0 ? `Financiar: ${brl(o.fin)} em ${o.n}x de ${brl(o.pmt)}` : 'Pagamento à vista',
    'Podem confirmar as condições para o meu perfil?',
  ].filter(Boolean).join('\n'));
});

// ================= INÍCIO =================
contaCats();
renderEstoque();
renderCarrinho();
$('#hero-n').textContent = CARROS.length;
// link direto para um carro (ex.: ...#carro=compass-s)
const deep = location.hash.match(/^#carro=(.+)$/);
if (deep && byId(deep[1])) setTimeout(() => abrirModal(deep[1]), 300);

// ================= MENU DO CELULAR =================
const burger = $('#burger');
burger.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  burger.setAttribute('aria-expanded', open);
});
$$('#menu a').forEach((a) => a.addEventListener('click', () => {
  document.body.classList.remove('menu-open');
  burger.setAttribute('aria-expanded', 'false');
}));

// ================= CABEÇALHO E ENTRADA SUAVE =================
const header = $('.top');
addEventListener('scroll', () => header.classList.toggle('solid', scrollY > 20), { passive: true });
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  $$('.sec h2, .cond, .sim-box, .budget, .brands, .contact-cta').forEach((el) => {
    el.classList.add('rv');
    io.observe(el);
  });
}
