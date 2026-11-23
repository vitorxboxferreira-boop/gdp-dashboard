// Estoque: edite esta lista para trocar carros, preços e fotos.
// Valores de referência: confira com a sua tabela antes de publicar.
const CARROS = [
  { badge: '0KM', marca: 'Jeep', nome: 'Compass S', ano: 2025, preco: 249990, foto: 'assets/compass-cut.webp',
    itens: ['1.3 Turbo Flex · 185 cv', 'Automático 6 marchas', 'Teto solar panorâmico'] },
  { badge: 'Seminovo', marca: 'Fiat', nome: 'Mobi Trekking', ano: 2025, preco: 82990, foto: 'assets/mobi-cut.webp',
    itens: ['1.0 Fire Flex · 75 cv', 'Manual 5 marchas', '13,9 km/l na cidade'] },
  { badge: 'Carros Premium', marca: 'McLaren', nome: '720S Spider', ano: 2023, preco: 3490000, foto: 'assets/mclaren-cut.webp',
    itens: ['V8 4.0 biturbo · 720 cv', '0 a 100 km/h em 2,9 s', 'Teto rígido retrátil'] },
];
const TAXA = 0.0149; // taxa mensal da simulação
const WHATS = 'https://bit.ly/ContatoFronteiraVeiculos';

const $ = (s) => document.querySelector(s);
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const parcela = (pv, n) => (pv * TAXA) / (1 - Math.pow(1 + TAXA, -n));

// ---------- estoque ----------
const lista = $('#cars');
lista.innerHTML = CARROS.map((c, i) => `
  <article class="car" data-badge="${c.badge}">
    <div class="car-img"><span class="badge">${c.badge}</span><img src="${c.foto}" alt="${c.marca} ${c.nome}" loading="lazy"></div>
    <div class="car-body">
      <small>${c.marca} · ${c.ano}</small>
      <h3>${c.nome}</h3>
      <ul>${c.itens.map((t) => `<li>${t}</li>`).join('')}</ul>
      <div class="price"><strong>${brl(c.preco)}</strong><span>ou 48x de ${brl(parcela(c.preco * 0.7, 48))}*</span></div>
      <div class="car-cta">
        <a class="btn btn-primary" href="${WHATS}" target="_blank" rel="noopener">Tenho interesse</a>
        <button class="btn btn-line" data-sim="${i}">Simular</button>
      </div>
    </div>
  </article>`).join('');

document.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === b));
  document.querySelectorAll('.car').forEach((card) => {
    card.hidden = b.dataset.f !== 'all' && card.dataset.badge !== b.dataset.f;
  });
}));

// ---------- simulador ----------
const sel = $('#s-car');
sel.innerHTML = CARROS.map((c, i) => `<option value="${i}">${c.marca} ${c.nome} · ${brl(c.preco)}</option>`).join('');
function simular() {
  const c = CARROS[+sel.value];
  const pct = +$('#s-down').value / 100;
  const n = +$('#s-n').value;
  $('#s-down-out').textContent = `${Math.round(pct * 100)}% · ${brl(c.preco * pct)}`;
  $('#s-n-out').textContent = `${n} meses`;
  $('#s-pmt').textContent = pct >= 1 ? '—' : `${n}x ${brl(parcela(c.preco * (1 - pct), n))}`;
}
['#s-car', '#s-down', '#s-n'].forEach((s) => $(s).addEventListener('input', simular));
simular();
lista.addEventListener('click', (e) => {
  const b = e.target.closest('[data-sim]');
  if (!b) return;
  sel.value = b.dataset.sim;
  simular();
  $('#simulador').scrollIntoView({ behavior: 'smooth' });
});

// ---------- menu do celular ----------
const burger = $('#burger');
burger.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  burger.setAttribute('aria-expanded', open);
});
document.querySelectorAll('#menu a').forEach((a) => a.addEventListener('click', () => {
  document.body.classList.remove('menu-open');
  burger.setAttribute('aria-expanded', 'false');
}));

// ---------- cabeçalho e entrada suave dos blocos ----------
const header = $('.top');
addEventListener('scroll', () => header.classList.toggle('solid', scrollY > 20), { passive: true });
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  document.querySelectorAll('.sec h2, .car, .cond, .sim-box, .brands, .contact-cta').forEach((el) => {
    el.classList.add('rv');
    io.observe(el);
  });
}
