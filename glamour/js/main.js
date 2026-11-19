/* Glamour — interações do site (sem frameworks; Lenis opcional para rolagem suave) */
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
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var catalog = window.GLAMOUR_CATALOG || { products: [], sizes: [], sizeGuide: [], priceRanges: [] };
  var digits = WHATSAPP_NUMBER.replace(/\D/g, '');

  var $ = function (s, el) { return (el || doc).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); };
  var brl = function (v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, minimumFractionDigits: 0 });
  };
  var esc = function (str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  var toastTimer = null;
  function toast(text) {
    var el = doc.getElementById('toast');
    if (!el) return;
    el.textContent = text;
    el.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-shown'); }, 4200);
  }
  function copyText(text) {
    var done = function () { toast('Mensagem copiada. É só colar no Direct do Instagram.'); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      }
    } catch (err) { /* área de transferência indisponível */ }
  }

  function contactHref(message) {
    if (!digits) return INSTAGRAM_DIRECT;
    return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(message);
  }

  /* ============================================================
   * ROLAGEM SUAVE (Lenis no desktop; nativa no toque)
   * ============================================================ */
  var lenis = null;
  if (window.Lenis && !reduceMotion && finePointer) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    root.classList.add('has-lenis');
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  function headerOffset() {
    var h = $('.site-header');
    return h ? h.getBoundingClientRect().height : 0;
  }

  function scrollToTarget(target) {
    if (lenis) {
      lenis.scrollTo(target, { offset: -headerOffset() + 1, duration: 1.3 });
    } else {
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }

  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = doc.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    scrollToTarget(target);
    if (id !== '#conteudo' && target.id) {
      try { history.replaceState(null, '', id); } catch (err) { /* ambiente sem history */ }
    }
  });

  /* ============================================================
   * CABEÇALHO + PARALLAX (um único laço por quadro)
   * ============================================================ */
  var header = $('.site-header');
  var heroMedia = $('.hero-media .arch img');
  var heroSection = $('.hero');
  var aboutInset = $('.about-inset');
  var ticking = false;

  function onFrame() {
    ticking = false;
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    if (reduceMotion) return;
    var vh = window.innerHeight;
    if (heroMedia && y < vh * 1.2) {
      heroMedia.style.setProperty('--parallax', Math.min(y * 0.06, 28).toFixed(1) + 'px');
    }
    if (aboutInset) {
      var r = aboutInset.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) {
        var p = (r.top + r.height / 2 - vh / 2) / vh;
        aboutInset.style.setProperty('--parallax', (p * -36).toFixed(1) + 'px');
      }
    }
  }
  function requestFrame() {
    if (!ticking) { ticking = true; requestAnimationFrame(onFrame); }
  }
  onFrame();
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame, { passive: true });

  /* Brilho que acompanha o cursor no banner (apenas desktop) */
  if (finePointer && !reduceMotion && heroSection) {
    heroSection.addEventListener('pointermove', function (e) {
      var r = heroSection.getBoundingClientRect();
      heroSection.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      heroSection.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }, { passive: true });
  }

  /* ============================================================
   * MENU MOBILE
   * ============================================================ */
  var toggle = $('.menu-toggle');
  var menu = doc.getElementById('menu');
  var desktop = window.matchMedia('(min-width: 960px)');

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    root.classList.toggle('menu-open', open);
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
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
  function onBreakpoint(e) { if (e.matches && root.classList.contains('menu-open')) setMenu(false); }
  if (desktop.addEventListener) desktop.addEventListener('change', onBreakpoint);
  else desktop.addListener(onBreakpoint);

  /* ============================================================
   * ANIMAÇÕES AO APARECER
   * ============================================================ */
  var revealIO = null;
  if ('IntersectionObserver' in window && !reduceMotion) {
    revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealIO.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
  }
  function observeReveal(el) {
    if (revealIO) revealIO.observe(el);
    else el.classList.add('is-visible');
  }

  /* Imagens surgem suavemente quando terminam de carregar */
  function fadeImage(img) {
    if (img.complete && img.naturalWidth) { img.classList.add('is-loaded'); return; }
    img.addEventListener('load', function () { img.classList.add('is-loaded'); }, { once: true });
    img.addEventListener('error', function () { img.classList.add('is-loaded'); }, { once: true });
  }

  /* ============================================================
   * COLEÇÃO: cartões + filtro por valor
   * ============================================================ */
  var grid = doc.getElementById('product-grid');
  var filterBox = doc.getElementById('price-filter');
  var countEl = doc.getElementById('filter-count');
  var emptyEl = doc.getElementById('product-empty');
  var productById = {};

  function colorList(p) {
    return p.colors.map(function (c) { return c.name; }).join(', ');
  }

  function renderCards() {
    if (!grid) return;
    grid.innerHTML = catalog.products.map(function (p, i) {
      productById[p.id] = p;
      var dots = p.colors.map(function (c) {
        return '<li style="--swatch:' + c.hex + '" title="' + esc(c.name) + '"></li>';
      }).join('');
      return '' +
        '<li class="product-card reveal" data-id="' + p.id + '" data-price="' + p.price + '" style="--stagger:' + (i % 3) * 90 + 'ms">' +
          '<button class="product-media" type="button" data-open="' + p.id + '" aria-label="Ver detalhes do ' + esc(p.name) + '">' +
            '<img class="fade-img" src="' + p.image + '" width="' + p.w + '" height="' + p.h + '" loading="lazy" decoding="async" alt="' + esc(p.alt) + '" style="--pos:' + p.pos + '">' +
            '<span class="product-quick" aria-hidden="true">Ver detalhes</span>' +
          '</button>' +
          '<div class="product-body">' +
            '<h3 class="product-name">' + esc(p.name) + '</h3>' +
            '<p class="product-price">' + brl(p.price) + '</p>' +
            '<p class="product-desc">' + esc(p.desc) + '</p>' +
            '<ul class="product-colors" aria-label="' + p.colors.length + ' cores: ' + esc(colorList(p)) + '">' + dots + '</ul>' +
            '<button class="btn btn-outline" type="button" data-open="' + p.id + '">Escolher cor e tamanho</button>' +
          '</div>' +
        '</li>';
    }).join('');
    $$('.product-card', grid).forEach(observeReveal);
    $$('img', grid).forEach(fadeImage);
  }

  function inRange(price, range) {
    if (range.min && price < range.min) return false;
    if (range.max && price > range.max) return false;
    return true;
  }

  function updateCount(n) {
    if (countEl) countEl.textContent = n === 1 ? '1 vestido' : n + ' vestidos';
    if (emptyEl) emptyEl.hidden = n !== 0;
  }

  function applyFilter(rangeId) {
    var range = catalog.priceRanges.filter(function (r) { return r.id === rangeId; })[0] || {};
    var cards = $$('.product-card', grid);
    var swap = function () {
      var n = 0;
      cards.forEach(function (card) {
        var show = inRange(Number(card.getAttribute('data-price')), range);
        card.hidden = !show;
        if (show) {
          n++;
          card.classList.add('is-visible');
          card.style.setProperty('--stagger', ((n - 1) % 3) * 70 + 'ms');
        }
      });
      updateCount(n);
      grid.classList.remove('is-filtering');
    };
    if (reduceMotion) { swap(); return; }
    grid.classList.add('is-filtering');
    setTimeout(swap, 220);
  }

  function renderFilter() {
    if (!filterBox) return;
    filterBox.innerHTML = catalog.priceRanges.map(function (r, i) {
      return '<button type="button" class="chip" data-range="' + r.id + '" aria-pressed="' + (i === 0) + '">' + esc(r.label) + '</button>';
    }).join('');
    filterBox.addEventListener('click', function (e) {
      var btn = e.target.closest('.chip');
      if (!btn || btn.getAttribute('aria-pressed') === 'true') return;
      $$('.chip', filterBox).forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      applyFilter(btn.getAttribute('data-range'));
    });
    updateCount(catalog.products.length);
  }

  renderCards();
  renderFilter();
  $$('.reveal').forEach(function (el) { if (!grid || !grid.contains(el)) observeReveal(el); });
  $$('.occasion-grid > li').forEach(function (el, i) { el.style.setProperty('--stagger', (i % 4) * 90 + 'ms'); });
  $$('.fade-img, .arch img, .about-inset img, .insta-grid img').forEach(fadeImage);

  /* ============================================================
   * ABA DE DETALHES DO VESTIDO (cor, tamanho e valor)
   * ============================================================ */
  var dialog = doc.getElementById('product-dialog');
  var state = { product: null, color: null, size: null, trigger: null };

  function pdUpdate() {
    var p = state.product;
    if (!p) return;
    var c = state.color;
    $('#pd-color-name').textContent = c.name;
    $('#pd-size-name').textContent = state.size ? state.size : 'escolha abaixo';
    $$('#pd-colors button').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-color') === c.name));
      b.tabIndex = b.getAttribute('data-color') === c.name ? 0 : -1;
    });
    $$('#pd-sizes button').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-size') === state.size));
    });
    $$('#pd-guide tr').forEach(function (tr) {
      tr.classList.toggle('is-selected', tr.getAttribute('data-size') === state.size);
    });

    var note = $('#pd-photo-note');
    note.innerHTML = '<span class="pd-chip" style="--swatch:' + c.hex + '"></span>' +
      (c.name === p.colors[0].name
        ? 'Foto na cor ' + esc(c.name)
        : 'Cor escolhida: ' + esc(c.name) + ' <small>(foto na cor ' + esc(p.colors[0].name) + ')</small>');
    dialog.style.setProperty('--pd-swatch', c.hex);

    $('#pd-summary').innerHTML =
      '<span><small>Cor</small>' + esc(c.name) + '</span>' +
      '<span><small>Tamanho</small>' + (state.size || '—') + '</span>' +
      '<span><small>Valor</small>' + brl(p.price) + '</span>';

    var msg = 'Olá, Glamour! Tenho interesse no ' + p.name + ', cor ' + c.name +
      (state.size ? ', tamanho ' + state.size : '') + ' (' + brl(p.price) + '). Está disponível?';
    var cta = $('#pd-cta');
    cta.href = contactHref(msg);
    cta.setAttribute('data-message', msg);
    cta.classList.toggle('is-ready', !!state.size);
  }

  function pdRender(p) {
    var img = $('#pd-image');
    img.classList.remove('is-loaded');
    img.src = p.image;
    img.width = p.w;
    img.height = p.h;
    img.alt = p.alt;
    img.style.setProperty('--pos', p.pos);
    fadeImage(img);

    $('#pd-name').textContent = p.name;
    $('#pd-price').textContent = brl(p.price);
    $('#pd-details').textContent = p.details;
    $('#pd-fabric').textContent = p.fabric;

    $('#pd-colors').innerHTML = p.colors.map(function (c) {
      return '<button type="button" role="radio" data-color="' + esc(c.name) + '" style="--swatch:' + c.hex + '" aria-label="' + esc(c.name) + '"><span></span></button>';
    }).join('');
    $('#pd-sizes').innerHTML = catalog.sizes.map(function (s) {
      return '<button type="button" role="radio" data-size="' + s + '" aria-checked="false">' + s + '</button>';
    }).join('');
    $('#pd-guide').innerHTML = catalog.sizeGuide.map(function (g) {
      return '<tr data-size="' + g.size + '"><th scope="row">' + g.size + '</th><td>' + g.bust + '</td><td>' + g.waist + '</td><td>' + g.hip + '</td></tr>';
    }).join('');
    $('#pd-colors').setAttribute('role', 'radiogroup');
    $('#pd-colors').setAttribute('aria-label', 'Cor');
    $('#pd-sizes').setAttribute('role', 'radiogroup');
    $('#pd-sizes').setAttribute('aria-label', 'Tamanho');
    $('#pd-hint').hidden = true;
  }

  function openProduct(id, trigger) {
    var p = productById[id];
    if (!p || !dialog) return;
    state = { product: p, color: p.colors[0], size: null, trigger: trigger || null };
    pdRender(p);
    pdUpdate();
    $('.pd', dialog).scrollTop = 0;
    dialog.classList.remove('is-closing');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    root.classList.add('dialog-open');
    if (lenis) lenis.stop();
    var close = $('.pd-close', dialog);
    if (close) close.focus({ preventScroll: true });
  }

  function closeProduct() {
    if (!dialog || !dialog.open || dialog.classList.contains('is-closing')) return;
    var finish = function () {
      dialog.classList.remove('is-closing');
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    };
    if (reduceMotion) finish();
    else {
      dialog.classList.add('is-closing');
      setTimeout(finish, 260);
    }
  }

  if (dialog) {
    dialog.addEventListener('close', function () {
      root.classList.remove('dialog-open');
      if (lenis) lenis.start();
      if (state.trigger) state.trigger.focus({ preventScroll: true });
    });
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); closeProduct(); });
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) { closeProduct(); return; }
      if (e.target.closest('.pd-close')) { closeProduct(); return; }
      var colorBtn = e.target.closest('#pd-colors button');
      if (colorBtn) {
        state.color = state.product.colors.filter(function (c) { return c.name === colorBtn.getAttribute('data-color'); })[0];
        pdUpdate();
        return;
      }
      var sizeBtn = e.target.closest('#pd-sizes button');
      if (sizeBtn) {
        state.size = sizeBtn.getAttribute('data-size');
        $('#pd-hint').hidden = true;
        pdUpdate();
        return;
      }
      var cta = e.target.closest('#pd-cta');
      if (cta && state.size && !digits) {
        /* Sem WhatsApp configurado: copia a mensagem para colar no Direct */
        copyText(cta.getAttribute('data-message'));
        return;
      }
      if (cta && !state.size) {
        e.preventDefault();
        var hint = $('#pd-hint');
        hint.hidden = false;
        var sizes = $('#pd-sizes');
        sizes.classList.remove('shake');
        void sizes.offsetWidth;
        sizes.classList.add('shake');
        var first = $('#pd-sizes button');
        if (first) first.focus();
      }
    });

    /* Setas do teclado nos grupos de cor e tamanho */
    dialog.addEventListener('keydown', function (e) {
      var group = e.target.closest('[role="radiogroup"]');
      if (!group || ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
      e.preventDefault();
      var items = $$('button', group);
      var i = items.indexOf(e.target);
      var next = items[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
      next.focus();
      next.click();
    });
  }

  doc.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-open]');
    if (opener) openProduct(opener.getAttribute('data-open'), opener);
  });

  /* ============================================================
   * LINK ATIVO NO MENU
   * ============================================================ */
  var navLinks = $$('ul a', menu);
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
    navLinks.forEach(function (a) {
      var s = doc.querySelector(a.getAttribute('href'));
      if (s) spy.observe(s);
    });
  }

  /* ============================================================
   * BOTÕES DE CONTATO (WhatsApp / Direct)
   * ============================================================ */
  $$('.js-contact').forEach(function (el) {
    if (!digits) return; // mantém o link do Direct já definido no HTML
    var model = el.getAttribute('data-model');
    el.href = contactHref(model
      ? 'Olá, Glamour! Gostaria de consultar ' + model + '.'
      : 'Olá, Glamour! Gostaria de mais informações.');
  });
  if (digits) {
    $$('.js-whatsapp-label').forEach(function (el) { el.textContent = 'Fale pelo WhatsApp'; });
    $$('.js-pd-cta-label').forEach(function (el) { el.textContent = 'Consultar pelo WhatsApp'; });
    $$('.js-whatsapp-icon').forEach(function (el) { el.setAttribute('href', '#i-whatsapp'); });
  }

  /* ============================================================
   * FUNDO DO BANNER: brilhos dourados (canvas leve)
   * ============================================================ */
  (function sparkles() {
    var canvas = doc.getElementById('sparkles');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, parts = [], running = false, visible = true, last = 0;
    var count = window.innerWidth < 700 ? 22 : 46;

    function spawn(randomY) {
      return {
        x: Math.random() * w,
        y: randomY ? Math.random() * h : h + 10,
        r: 0.6 + Math.random() * 1.8,
        vy: 6 + Math.random() * 14,          /* px por segundo */
        vx: (Math.random() - 0.5) * 6,
        tw: Math.random() * Math.PI * 2,
        ts: 0.8 + Math.random() * 1.6
      };
    }
    function resize() {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!parts.length) for (var i = 0; i < count; i++) parts.push(spawn(true));
    }
    function draw(dt) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y -= p.vy * dt;
        p.x += p.vx * dt;
        p.tw += p.ts * dt;
        if (p.y < -10) parts[i] = p = spawn(false);
        var a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(p.tw));
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, 'rgba(232, 205, 150,' + a + ')');
        g.addColorStop(0.35, 'rgba(201, 165, 104,' + (a * 0.45) + ')');
        g.addColorStop(1, 'rgba(201, 165, 104,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    function loop(t) {
      if (!running) return;
      var dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016;
      last = t;
      draw(dt);
      requestAnimationFrame(loop);
    }
    function sync() {
      var should = visible && !doc.hidden && !reduceMotion;
      if (should && !running) { running = true; last = 0; requestAnimationFrame(loop); }
      else if (!should) running = false;
    }
    resize();
    if (reduceMotion) { draw(0); return; }
    window.addEventListener('resize', function () { resize(); }, { passive: true });
    doc.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; sync(); }).observe(canvas);
    }
    sync();
  })();

  /* ---------- Ano no rodapé ---------- */
  $$('.js-year').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();
