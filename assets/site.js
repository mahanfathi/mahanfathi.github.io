/* Mahan Fathi — small behaviours: the sheet switch, copy-to-clipboard,
   and the plotter that course-corrects down the margin as you read. */
(function () {
  'use strict';

  var root = document.documentElement;
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var calmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- sheet: vellum / blueprint ---------- */

  var PAPER = { light: '#f5f3ee', dark: '#102542' };

  function effectiveTheme() {
    return root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
  }

  function syncSheet() {
    var theme = effectiveTheme();
    document.querySelectorAll('[data-sheet]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.sheet === theme));
    });
    if (root.dataset.theme) {
      document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
        m.setAttribute('content', PAPER[theme]);
      });
    }
  }

  document.querySelectorAll('[data-sheet]').forEach(function (b) {
    b.addEventListener('click', function () {
      var flip = function () {
        root.classList.add('switching');
        root.dataset.theme = b.dataset.sheet;
        try { localStorage.setItem('sheet', b.dataset.sheet); } catch (e) {}
        syncSheet();
        void getComputedStyle(document.body).color;   // commit the new colours with transitions off
        root.classList.remove('switching');
      };
      if (document.startViewTransition && !calmQuery.matches) {
        document.startViewTransition(flip).ready.catch(function () {});   // a rapid second click skips the first fade
      } else {
        flip();
      }
    });
  });
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', syncSheet);
  else if (darkQuery.addListener) darkQuery.addListener(syncSheet);
  syncSheet();

  /* ---------- copy the email address ---------- */

  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    var timer;
    var status = btn.nextElementSibling;
    btn.addEventListener('click', function () {
      var text = btn.dataset.copy;
      var done = function () {
        btn.textContent = 'copied';
        btn.classList.add('done');
        if (status) status.textContent = 'Email address copied';
        clearTimeout(timer);
        timer = setTimeout(function () {
          btn.textContent = 'copy';
          btn.classList.remove('done');
          if (status) status.textContent = '';
        }, 1800);
      };
      var legacy = function () {
        var t = document.createElement('textarea');
        t.value = text;
        t.setAttribute('readonly', '');
        t.style.position = 'fixed';
        t.style.opacity = '0';
        document.body.appendChild(t);
        t.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(t);
        btn.focus();
        if (ok) done();
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, legacy);
      } else {
        legacy();
      }
    });
  });

  /* ---------- the plotter ----------
     Fig. 1 — an observed trajectory (solid), and a model's rollout of it
     (dashed) that slowly drifts and is re-anchored every so often: course
     correction, after the ICLR'24 paper. Drawn down the right margin, kept
     in step with how far you've read. */

  var svg = document.querySelector('.plotter');
  if (!svg) return;

  var NS = 'http://www.w3.org/2000/svg';
  var MIN_VIEWPORT = 1180;
  var STEP = 3;          // px between samples
  var SPAN = 300;        // px between re-encodings
  var EPS = 0.08;        // the model's frequency error
  var GAIN = 1.1;        // ...and its amplitude error
  var geo = null;        // current geometry, null when hidden
  var drawn = 0;         // furthest y (local) the pen has reached
  var target = 0;
  var raf = 0;

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function docTop(node) {
    return node.getBoundingClientRect().top + window.scrollY;
  }

  // A smooth, slightly irregular signal: two incommensurate tones whose
  // amplitude breathes.
  function signal(y) {
    var u = y / 260;
    var amp = 0.78 + 0.22 * Math.sin(0.23 * u + 0.6);
    return amp * (
      0.64 * Math.sin(2 * Math.PI * 0.46 * u + 0.4) +
      0.36 * Math.sin(2 * Math.PI * 1.13 * u + 2.1)
    );
  }

  function build() {
    var sheet = document.querySelector('.sheet');
    var intro = document.querySelector('.intro');
    var end = document.querySelector('.titleblock');
    var rect = sheet.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    var room = vw - rect.right;

    if (vw < MIN_VIEWPORT || room < 150 || !intro || !end) {
      svg.classList.remove('on');
      geo = null;
      return;
    }

    var W = Math.min(104, room - 96);
    var x0 = rect.right + Math.min(56, (room - W) / 2);
    var y0 = docTop(intro) + 8;
    var y1 = docTop(end) - 24;
    var H = Math.max(0, y1 - y0);
    var PAD = 64;                     // room above the trace for the legend
    var cx = W / 2;
    var A = W * 0.42;

    svg.innerHTML = '';
    svg.setAttribute('width', W + 24);
    svg.setAttribute('height', H + PAD + 8);
    svg.style.left = x0 + 'px';
    svg.style.top = (y0 - PAD) + 'px';
    svg.style.width = (W + 24) + 'px';
    svg.style.height = (H + PAD + 8) + 'px';

    // legend
    var lg = el('g', { transform: 'translate(0,0)' }, svg);
    el('text', { x: 0, y: 9 }, lg).textContent = 'Fig. 1';
    el('line', { x1: 0, x2: 14, y1: 24, y2: 24, class: 'truth' }, lg);
    el('text', { x: 20, y: 27 }, lg).textContent = 'observed';
    el('line', { x1: 0, x2: 14, y1: 37, y2: 37, class: 'roll' }, lg);
    el('text', { x: 20, y: 40 }, lg).textContent = 'rollout';
    el('circle', { cx: 7, cy: 50, r: 2.2, class: 'knot' }, lg);
    el('text', { x: 20, y: 53 }, lg).textContent = 're-encode';

    var g = el('g', { transform: 'translate(0,' + PAD + ')' }, svg);

    var clip = el('clipPath', { id: 'pen' }, el('defs', {}, svg));
    var clipRect = el('rect', { x: -20, y: -4, width: W + 60, height: 0 }, clip);
    var ink = el('g', { 'clip-path': 'url(#pen)' }, g);

    // time axis with a tick at every re-encoding
    el('line', { x1: -10, x2: -10, y1: 0, y2: H, class: 'axis' }, ink);

    var truth = '';
    var roll = '';
    for (var y = 0; y <= H; y += STEP) {
      truth += (y ? 'L' : 'M') + (cx + A * signal(y)).toFixed(2) + ' ' + y;
    }

    for (var k = 0; k * SPAN < H; k++) {
      var a = k * SPAN;
      var b = Math.min(H, a + SPAN);
      var sa = signal(a);
      var lastX = cx + A * sa;
      for (var yy = a; yy <= b; yy += STEP) {
        // re-encoded from the truth at a; mistuned and over-amplified since then
        lastX = cx + A * (sa + GAIN * (signal(a + (yy - a) * (1 + EPS)) - sa));
        roll += (yy === a ? 'M' : 'L') + lastX.toFixed(2) + ' ' + yy;
      }
      el('line', { x1: -13, x2: -7, y1: a, y2: a, class: 'axis' }, ink);
      if (b < H) {
        var tx = cx + A * signal(b);
        el('line', { x1: lastX.toFixed(2), x2: tx.toFixed(2), y1: b, y2: b, class: 'fix' }, ink);
        el('circle', { cx: tx.toFixed(2), cy: b, r: 2.2, class: 'knot' }, ink);
      }
    }

    // order: rollout under, truth over, knots on top
    var knots = Array.prototype.slice.call(ink.querySelectorAll('.fix, .knot'));
    el('path', { d: roll, class: 'roll' }, ink);
    el('path', { d: truth, class: 'truth' }, ink);
    knots.forEach(function (n) { ink.appendChild(n); });

    var nib = el('circle', { r: 1.8, class: 'nib', cx: cx, cy: 0 }, g);

    geo = { H: H, y0: y0, cx: cx, A: A, clipRect: clipRect, nib: nib };
    svg.classList.add('on');

    if (calmQuery.matches) drawn = H;
    drawn = Math.min(drawn, H);
    update(true);
  }

  function aim() {
    if (!geo) return 0;
    var reading = window.scrollY + window.innerHeight * 0.7 - geo.y0;
    var atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    return Math.max(0, Math.min(geo.H, atEnd ? geo.H : reading));
  }

  function paint() {
    geo.clipRect.setAttribute('height', drawn + 4);
    geo.nib.setAttribute('cy', drawn.toFixed(2));
    geo.nib.setAttribute('cx', (geo.cx + geo.A * signal(drawn)).toFixed(2));
    geo.nib.style.opacity = drawn >= geo.H - 0.5 ? 0 : 1;
  }

  function tick() {
    raf = 0;
    if (!geo) return;
    var d = target - drawn;
    if (calmQuery.matches || Math.abs(d) < 0.6) {
      drawn = target;
    } else {
      drawn += d * 0.085;
      raf = requestAnimationFrame(tick);
    }
    paint();
  }

  function update(immediate) {
    if (!geo) return;
    target = Math.max(drawn, aim());   // ink stays on the page
    if (immediate === true && calmQuery.matches) { drawn = target; paint(); return; }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  var resizeTimer;
  function rebuild() {
    if (document.documentElement.clientWidth < MIN_VIEWPORT) {
      svg.classList.remove('on');
      geo = null;
    }
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 120);
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', rebuild);
  if (window.ResizeObserver) new ResizeObserver(rebuild).observe(document.querySelector('.sheet'));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
  build();
})();
