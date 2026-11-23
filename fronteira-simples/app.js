// ================= CONFIGURAÇÃO =================
// Estoque: edite esta lista para trocar carros, preços e fotos.
// Valores de referência: confira com a sua tabela antes de publicar.
const CARROS = [
  { id: 'compass', badge: '0KM', marca: 'Jeep', nome: 'Compass S', ano: 2025, preco: 249990, foto: 'assets/compass-cut.webp',
    desc: 'Motor turbo, teto solar panorâmico, teto preto e acabamento S exclusivo. O SUV mais desejado do Brasil.',
    itens: ['1.3 Turbo Flex · 185 cv', 'Automático 6 marchas', 'Teto solar panorâmico'] },
  { id: 'mobi', badge: 'Seminovo', marca: 'Fiat', nome: 'Mobi Trekking', ano: 2025, preco: 82990, foto: 'assets/mobi-cut.webp',
    desc: 'Compacto, econômico e com visual aventureiro: suspensão elevada, rack de teto e rodas escurecidas.',
    itens: ['1.0 Fire Flex · 75 cv', 'Manual 5 marchas', '13,9 km/l na cidade'] },
  { id: 'mclaren', badge: 'Carros Premium', marca: 'McLaren', nome: '720S Spider', ano: 2023, preco: 3490000, foto: 'assets/mclaren-cut.webp',
    desc: 'V8 biturbo de 720 cv, monocoque em fibra de carbono e teto retrátil em 11 segundos.',
    itens: ['V8 4.0 biturbo · 720 cv', '0 a 100 km/h em 2,9 s', 'Teto rígido retrátil'] },
];
const TAXA = 0.0149;      // juros ao mês usados na simulação
const IPVA_RS = 0.03;     // alíquota do IPVA de automóveis no RS (usada só em 0KM)
const WHATS_LINK = 'https://bit.ly/ContatoFronteiraVeiculos';
// Número do WhatsApp da loja com DDI e DDD, só dígitos (ex.: '5555999999999').
// Com ele preenchido, o carrinho e o orçamento abrem o WhatsApp já com a mensagem escrita.
const WHATS_NUM = '';

// ================= UTILITÁRIOS =================
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const parcela = (pv, n) => (pv <= 0 ? 0 : (pv * TAXA) / (1 - Math.pow(1 + TAXA, -n)));
const byId = (id) => CARROS.find((c) => c.id === id);

let toastT = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 2600);
}

// Envia a mensagem: com número configurado abre o WhatsApp com o texto pronto;
// sem número, copia o texto e abre o link da loja para o cliente colar.
function enviarWhats(texto) {
  if (WHATS_NUM) {
    window.open(`https://wa.me/${WHATS_NUM}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    return;
  }
  const abrir = () => window.open(WHATS_LINK, '_blank', 'noopener');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(texto).then(() => toast('Mensagem copiada: é só colar no WhatsApp.'), () => {});
  }
  abrir();
}

// ================= ESTOQUE =================
const lista = $('#cars');
lista.innerHTML = CARROS.map((c) => `
  <article class="car" data-badge="${c.badge}" data-id="${c.id}" tabindex="0" aria-label="Ver detalhes do ${c.marca} ${c.nome}">
    <div class="car-img"><span class="badge">${c.badge}</span><img src="${c.foto}" alt="${c.marca} ${c.nome}" loading="lazy"></div>
    <div class="car-body">
      <small>${c.marca} · ${c.ano}</small>
      <h3>${c.nome}</h3>
      <ul>${c.itens.map((t) => `<li>${t}</li>`).join('')}</ul>
      <div class="price"><strong>${brl(c.preco)}</strong><span>ou 48x de ${brl(parcela(c.preco * 0.8, 48))}*</span></div>
      <div class="car-cta">
        <button class="btn btn-primary" data-add="${c.id}">Adicionar ao carrinho</button>
        <button class="btn btn-line" data-sim="${c.id}">Simular</button>
      </div>
    </div>
  </article>`).join('');

$$('.chip').forEach((b) => b.addEventListener('click', () => {
  $$('.chip').forEach((x) => x.classList.toggle('on', x === b));
  $$('.car').forEach((card) => { card.hidden = b.dataset.f !== 'all' && card.dataset.badge !== b.dataset.f; });
}));

lista.addEventListener('click', (e) => {
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
  fechar();
  aberto = el;
  overlay.hidden = false;
  el.hidden = false;
  requestAnimationFrame(() => { overlay.classList.add('on'); el.classList.add('on'); });
  document.body.classList.add('locked');
}
function fechar() {
  if (!aberto) return;
  const el = aberto;
  aberto = null;
  el.classList.remove('on');
  overlay.classList.remove('on');
  document.body.classList.remove('locked');
  setTimeout(() => { if (aberto !== el) el.hidden = true; if (!aberto) overlay.hidden = true; }, 300);
}
overlay.addEventListener('click', fechar);
$$('[data-close]').forEach((b) => b.addEventListener('click', fechar));
addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });

let modalId = null;
function abrirModal(id) {
  const c = byId(id);
  modalId = id;
  $('#m-img').src = c.foto;
  $('#m-img').alt = `${c.marca} ${c.nome}`;
  $('#m-badge').textContent = c.badge;
  $('#m-brand').textContent = `${c.marca} · ${c.ano}`;
  $('#m-title').textContent = c.nome;
  $('#m-desc').textContent = c.desc;
  $('#m-specs').innerHTML = c.itens.map((t) => `<li>${t}</li>`).join('');
  $('#m-price').textContent = brl(c.preco);
  $('#m-pmt').textContent = `ou 48x de ${brl(parcela(c.preco * 0.8, 48))} com 20% de entrada*`;
  atualizarBotaoModal();
  abrir($('#modal'));
}
function atualizarBotaoModal() {
  const b = $('#m-add');
  const tem = carrinho.includes(modalId);
  b.textContent = tem ? 'No carrinho ✓' : 'Adicionar ao carrinho';
  b.classList.toggle('done', tem);
}
$('#m-add').addEventListener('click', () => {
  if (carrinho.includes(modalId)) abrirCarrinho();
  else addCart(modalId);
});
$('#m-sim').addEventListener('click', () => { fechar(); irSimular(modalId); });

// ================= CARRINHO =================
let carrinho = [];
try { carrinho = JSON.parse(localStorage.getItem('fronteira-carrinho') || '[]').filter(byId); } catch (e) { carrinho = []; }
function salvar() { try { localStorage.setItem('fronteira-carrinho', JSON.stringify(carrinho)); } catch (e) { /* sem armazenamento */ } }

function addCart(id) {
  if (!carrinho.includes(id)) carrinho.push(id);
  salvar();
  renderCarrinho();
  const c = byId(id);
  toast(`${c.marca} ${c.nome} adicionado ao carrinho`);
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

function renderCarrinho() {
  $('#cart-count').textContent = carrinho.length;
  $('#cart-open').classList.toggle('has', carrinho.length > 0);
  $$('[data-add]').forEach((b) => {
    const tem = carrinho.includes(b.dataset.add);
    b.textContent = tem ? 'No carrinho ✓' : 'Adicionar ao carrinho';
    b.classList.toggle('done', tem);
  });
  const box = $('#d-items');
  if (!carrinho.length) {
    box.innerHTML = '<p class="empty">Seu carrinho está vazio.<br>Toque em um carro do estoque para adicionar.</p>';
    $('#d-foot').hidden = true;
  } else {
    box.innerHTML = carrinho.map((id) => {
      const c = byId(id);
      return `<div class="d-item"><img src="${c.foto}" alt=""><div><small>${c.marca} · ${c.badge}</small><b>${c.nome}</b><span>${brl(c.preco)}</span></div><button class="rm" data-rm="${id}" aria-label="Remover ${c.nome}">×</button></div>`;
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
  const linhas = carrinho.map((id) => { const c = byId(id); return `• ${c.marca} ${c.nome} ${c.ano} (${c.badge}): ${brl(c.preco)}`; });
  enviarWhats(`Olá, Fronteira Veículos! Tenho interesse nestes veículos:\n${linhas.join('\n')}\nTotal: ${brl(totalCarrinho())}\nPodem me passar uma proposta?`);
});

// ================= SIMULADOR / ORÇAMENTO =================
const sel = $('#s-car');
function montarSelect() {
  const atual = sel.value;
  let html = CARROS.map((c) => `<option value="${c.id}">${c.marca} ${c.nome} · ${brl(c.preco)}</option>`).join('');
  if (carrinho.length > 1) html = `<option value="carrinho">Itens do carrinho (${carrinho.length}) · ${brl(totalCarrinho())}</option>` + html;
  sel.innerHTML = html;
  sel.value = [...sel.options].some((o) => o.value === atual) ? atual : sel.options[0].value;
  simular();
}
function escolhidos() {
  if (sel.value === 'carrinho') return carrinho.map(byId);
  return [byId(sel.value)];
}
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
  if (!carros.length) return;
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
  const ipva = carros.filter((c) => c.badge === '0KM').reduce((s, c) => s + c.preco * IPVA_RS * (mesesRest / 12), 0);
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
  ultimo = { carros, preco, troca, entrada, fin, n, pmt, ipva, hoje };
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
  const nomes = o.carros.map((c) => `${c.marca} ${c.nome} ${c.ano}`).join(' + ');
  enviarWhats([
    'Olá, Fronteira Veículos! Fiz esta simulação no site:',
    `Veículo: ${nomes} (${brl(o.preco)})`,
    o.troca ? `Usado na troca: ${brl(o.troca)}` : null,
    `Entrada: ${brl(o.entrada)}`,
    o.fin > 0 ? `Financiar: ${brl(o.fin)} em ${o.n}x de ${brl(o.pmt)}` : 'Pagamento à vista',
    'Podem confirmar as condições para o meu perfil?',
  ].filter(Boolean).join('\n'));
});

renderCarrinho();

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
  $$('.sec h2, .car, .cond, .sim-box, .budget, .brands, .contact-cta').forEach((el) => {
    el.classList.add('rv');
    io.observe(el);
  });
}
