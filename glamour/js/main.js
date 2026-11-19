/* Glamour — interações do site (sem dependências) */
(function () {
  'use strict';

  /* ------------------------------------------------------------
   * CONFIGURAÇÃO DE CONTATO
   * Informe o número do WhatsApp da loja apenas com dígitos,
   * incluindo código do país e DDD. Ex.: '5511999999999'.
   * Enquanto estiver vazio, os botões de contato abrem o
   * Direct do Instagram (@glamourfronteira).
   * ------------------------------------------------------------ */
  var WHATSAPP_NUMBER = '';
  var INSTAGRAM_DIRECT = 'https://ig.me/m/glamourfronteira';

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Cabeçalho: estado ao rolar ---------- */
  var header = doc.querySelector('.site-header');
  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Menu mobile ---------- */
  var toggle = doc.querySelector('.menu-toggle');
  var menu = doc.getElementById('menu');
  var desktop = window.matchMedia('(min-width: 960px)');

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    root.classList.toggle('menu-open', open);
    if (open) {
      var first = menu.querySelector('a');
      if (first) first.focus({ preventScroll: true });
    }
  }

  toggle.addEventListener('click', function () {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });

  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) {
      setMenu(false);
      toggle.focus();
    }
  });

  // Ao voltar para o layout de desktop, garante que o menu mobile esteja fechado.
  function onBreakpoint(e) { if (e.matches) setMenu(false); }
  if (desktop.addEventListener) desktop.addEventListener('change', onBreakpoint);
  else desktop.addListener(onBreakpoint);

  /* ---------- Link ativo no menu conforme a seção visível ---------- */
  var navLinks = Array.prototype.slice.call(menu.querySelectorAll('ul a'));
  var sections = navLinks
    .map(function (a) { return doc.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = '#' + entry.target.id;
        navLinks.forEach(function (a) {
          var active = a.getAttribute('href') === id;
          a.classList.toggle('is-active', active);
          if (active) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Animações ao aparecer ---------- */
  var reveals = doc.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    // Escalonamento suave entre cartões da mesma lista.
    doc.querySelectorAll('.product-grid, .occasion-grid').forEach(function (list) {
      Array.prototype.forEach.call(list.children, function (el, i) {
        el.style.setProperty('--stagger', (i % 3) * 90 + 'ms');
      });
    });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Botões de contato (WhatsApp / Direct) ---------- */
  var digits = WHATSAPP_NUMBER.replace(/\D/g, '');
  doc.querySelectorAll('.js-contact').forEach(function (el) {
    if (!digits) return; // mantém o link do Direct já definido no HTML
    var model = el.getAttribute('data-model');
    var msg = model
      ? 'Olá, Glamour! Gostaria de consultar a disponibilidade de ' + model + '.'
      : 'Olá, Glamour! Gostaria de mais informações.';
    el.href = 'https://wa.me/' + digits + '?text=' + encodeURIComponent(msg);
  });
  if (digits) {
    doc.querySelectorAll('.js-whatsapp-label').forEach(function (el) { el.textContent = 'Fale pelo WhatsApp'; });
    doc.querySelectorAll('.js-whatsapp-icon').forEach(function (el) { el.setAttribute('href', '#i-whatsapp'); });
  } else {
    doc.querySelectorAll('.js-contact').forEach(function (el) {
      if (!el.href) el.href = INSTAGRAM_DIRECT;
    });
  }

  /* ---------- Ano no rodapé ---------- */
  doc.querySelectorAll('.js-year').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
