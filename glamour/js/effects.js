/* Glamour — efeitos visuais (abertura, textos, cursor, botões magnéticos,
 * inclinação 3D dos cartões e progresso de leitura). Tudo usa apenas
 * transform/opacity e respeita "reduzir movimento". */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var G = window.GLAMOUR || {};
  var reduceMotion = !!G.reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $$ = function (s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); };

  /* ============================================================
   * ABERTURA
   * ============================================================ */
  (function intro() {
    var el = doc.querySelector('.intro');
    if (!el) return;
    if (!root.classList.contains('intro-active')) { el.remove(); return; }
    var started = performance.now();
    var done = false;
    function leave() {
      if (done) return;
      done = true;
      var wait = Math.max(0, 1100 - (performance.now() - started)); /* tempo mínimo da abertura */
      setTimeout(function () {
        root.classList.add('intro-leaving');
        root.classList.remove('intro-active');
        setTimeout(function () {
          root.classList.remove('intro-leaving');
          el.remove();
        }, 1000);
      }, wait);
    }
    var hero = doc.querySelector('.hero-media img');
    var ready = [];
    if (hero && !hero.complete) {
      ready.push(new Promise(function (r) { hero.addEventListener('load', r, { once: true }); hero.addEventListener('error', r, { once: true }); }));
    }
    if (doc.fonts && doc.fonts.ready) ready.push(doc.fonts.ready);
    Promise.all(ready).then(leave, leave);
    setTimeout(leave, 2200); /* nunca segura a página por mais tempo que isso */
  })();

  /* ============================================================
   * TEXTOS: palavras que surgem
   * ============================================================ */
  function splitWords(el, wrapClass) {
    if (el.getAttribute('data-split')) return;
    el.setAttribute('data-split', '1');
    var label = el.textContent.replace(/ /g, ' ').trim();
    var words = el.textContent.split(/ +/);
    el.textContent = '';
    words.forEach(function (w, i) {
      var outer = doc.createElement('span');
      outer.className = wrapClass;
      outer.setAttribute('aria-hidden', 'true');
      outer.style.setProperty('--i', i);
      var inner = doc.createElement('span');
      inner.textContent = w;
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(doc.createTextNode(' '));
    });
    /* leitores de tela continuam lendo a frase inteira */
    var sr = doc.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = label;
    el.appendChild(sr);
  }
  if (!reduceMotion) {
    $$('.js-split-words').forEach(function (el) { splitWords(el, 'w'); });
    $$('.section-title').forEach(function (el) { splitWords(el, 'wm'); });
  }

  /* ============================================================
   * CURSOR DOURADO + BOTÕES MAGNÉTICOS (somente mouse)
   * ============================================================ */
  if (finePointer && !reduceMotion) {
    var cursor = doc.querySelector('.cursor');
    var ring = cursor && cursor.querySelector('.cursor-ring');
    var dot = cursor && cursor.querySelector('.cursor-dot');
    if (cursor) {
      root.classList.add('has-cursor');
      var mx = -100, my = -100, rx = -100, ry = -100, active = false;
      window.addEventListener('pointermove', function (e) {
        mx = e.clientX; my = e.clientY;
        if (!active) { active = true; rx = mx; ry = my; cursor.classList.add('is-active'); }
        dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      }, { passive: true });
      doc.addEventListener('pointerleave', function () { active = false; cursor.classList.remove('is-active'); });
      doc.addEventListener('pointerover', function (e) {
        var t = e.target;
        cursor.classList.toggle('is-view', !!t.closest('.product-media, .insta-grid a'));
        cursor.classList.toggle('is-link', !!t.closest('a, button, summary, [role="radio"]') && !t.closest('.product-media, .insta-grid a'));
      });
      doc.addEventListener('pointerdown', function () { cursor.classList.add('is-down'); });
      doc.addEventListener('pointerup', function () { cursor.classList.remove('is-down'); });
      (function follow() {
        rx += (mx - rx) * 0.18;
        ry += (my - ry) * 0.18;
        ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
        requestAnimationFrame(follow);
      })();
    }

    /* Botões magnéticos */
    $$('.btn-primary, .btn-gold, .btn-light, .nav-instagram, .to-top').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.22;
        var y = (e.clientY - r.top - r.height / 2) * 0.3;
        btn.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
      });
      btn.addEventListener('pointerleave', function () { btn.style.translate = ''; });
    });

    /* Inclinação 3D + reflexo de luz nos cartões (delegado: os cartões são gerados por JS) */
    var tiltEl = null;
    doc.addEventListener('pointermove', function (e) {
      var media = e.target.closest && e.target.closest('.product-media');
      if (tiltEl && tiltEl !== media) { resetTilt(tiltEl); tiltEl = null; }
      if (!media) return;
      tiltEl = media;
      var r = media.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      media.style.setProperty('--ry', ((px - 0.5) * 8).toFixed(2) + 'deg');
      media.style.setProperty('--rx', ((0.5 - py) * 8).toFixed(2) + 'deg');
      media.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
      media.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      media.classList.add('is-tilting');
    }, { passive: true });
    function resetTilt(m) {
      m.classList.remove('is-tilting');
      m.style.setProperty('--rx', '0deg');
      m.style.setProperty('--ry', '0deg');
    }
  }

  /* ============================================================
   * VOLTAR AO TOPO COM PROGRESSO DE LEITURA
   * ============================================================ */
  var toTop = doc.querySelector('.to-top');
  if (toTop) {
    var bar = toTop.querySelector('.to-top-progress');
    var ticking = false;
    var update = function () {
      ticking = false;
      var max = Math.max(1, root.scrollHeight - window.innerHeight);
      var p = Math.min(1, window.scrollY / max);
      bar.style.strokeDashoffset = (100 - p * 100).toFixed(2);
      toTop.classList.toggle('is-shown', window.scrollY > window.innerHeight * 0.8);
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ============================================================
   * LINHA DO "COMO FUNCIONA" acompanha a rolagem
   * ============================================================ */
  var steps = doc.querySelector('.steps-list');
  if (steps && !reduceMotion) {
    var stepTick = false;
    var stepUpdate = function () {
      stepTick = false;
      var r = steps.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      steps.style.setProperty('--line', p.toFixed(3));
      $$('.step', steps).forEach(function (s, i, all) {
        s.classList.toggle('is-lit', p >= (i + 0.35) / all.length);
      });
    };
    window.addEventListener('scroll', function () {
      if (!stepTick) { stepTick = true; requestAnimationFrame(stepUpdate); }
    }, { passive: true });
    stepUpdate();
  } else if (steps) {
    steps.style.setProperty('--line', '1');
    $$('.step', steps).forEach(function (s) { s.classList.add('is-lit'); });
  }
})();
