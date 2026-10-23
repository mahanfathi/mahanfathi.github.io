/* Mahan Fathi — small behaviours: the sheet switch, copy-to-clipboard,
   and the figure pencilled down the margin as you read. */
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
     Fig. 1, pencilled down the right margin as you read: an observed
     trajectory in graphite, a model's rollout of it in blue pencil that
     drifts until it is re-encoded in red (course correction, after the
     ICLR'24 paper). One hand draws every mark in turn, along the line and
     at a hand's pace; how far you've read decides how far it may go.
     Where there is no margin for it, the same hand draws it large and
     faint behind the text, with a softer, broader lead. */

  var host = document.querySelector('.plotter');
  if (!host) return;

  var MIN_VIEWPORT = 1180;
  var SEED = (Math.random() * 4294967296) >>> 0;   // a slightly different hand every visit
  var OX = 20;          // canvas room left of the plot, for the time axis and legend marks
  var PAD = 64;         // canvas room above the plot, for the legend

  // How the two layouts draw: a fine lead in the margin; behind the text, a
  // broad soft one (thicker, grainier, bigger figure, coarser canvas).
  var STYLES = {
    margin: { w: 1, fib: 1, dot: 1, grain: 1, step: 0.35, size: 1, wob: 1, dash: 1, ring: 1, tint: 1 },
    ground: { w: 3.6, fib: 2.4, dot: 1.9, grain: 2, step: 0.7, size: 1.6, wob: 2.2, dash: 2.6, ring: 3.2, tint: 1.35 }
  };
  var style = STYLES.margin;

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  canvas.addEventListener('contextrestored', function () { if (geo) repaint(); });
  var legend = document.createElement('div');
  legend.className = 'plot-legend';
  legend.innerHTML = '<span class="fig">Fig. 1</span><span>observed</span><span>rollout</span><span>re-encode</span>';
  host.appendChild(canvas);
  host.appendChild(legend);

  /* --- deterministic randomness, so a redraw reproduces the same marks --- */

  function hash(a, b) {
    var h = Math.imul((a ^ 0x9e3779b9) >>> 0, 0x85ebca6b) ^ Math.imul((b ^ 0xc2b2ae35) >>> 0, 0x27d4eb2f);
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12; h = Math.imul(h, 0x297a2d39);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }

  function stream(seed) {                         // mulberry32
    var t = seed >>> 0;
    return function () {
      t = (t + 0x6d2b79f5) >>> 0;
      var r = Math.imul(t ^ (t >>> 15), t | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function smooth(t) { return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); }

  function noise(x, seed) {                       // 1-D value noise, −1..1
    var i = Math.floor(x), u = smooth(x - i);
    var a = hash(seed, i), b = hash(seed, i + 1);
    return (a + (b - a) * u) * 2 - 1;
  }

  function noise2(x, y) {                         // 2-D value noise, 0..1
    var i = Math.floor(x), j = Math.floor(y), u = smooth(x - i), v = smooth(y - j);
    var a = hash(i * 7919 + 13, j), b = hash(i * 7919 + 7932, j);
    var c = hash(i * 7919 + 13, j + 1), d = hash(i * 7919 + 7932, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // The paper's tooth: lead catches on the peaks and skips the valleys, so
  // every line shares one fixed grain, as it would on a real sheet.
  function tooth(x, y) {
    var t = 0.45 * hash(Math.floor(x * 1.7) * 92821 + 7, Math.floor(y * 1.7)) + 0.55 * noise2(x * 0.42, y * 0.42);
    return smooth((t - 0.16) / 0.5);
  }

  /* --- strokes: a dense polyline, its arc length, and how the hand draws it --- */

  function makeStroke(xs, ys, o) {
    var n = xs.length, i, z = o.style || style;
    var base = new Float32Array(n);
    for (i = 1; i < n; i++) base[i] = base[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);

    // the hand's wobble, along the normal: a slow drift plus a faint tremor
    var X = new Float32Array(n), Y = new Float32Array(n), wob = o.wobble * z.wob;
    for (i = 0; i < n; i++) {
      var j0 = Math.max(0, i - 1), j1 = Math.min(n - 1, i + 1);
      var dx = xs[j1] - xs[j0], dy = ys[j1] - ys[j0], d = Math.hypot(dx, dy) || 1;
      var off = wob * (0.55 * noise(base[i] / 37, o.seed) + 0.2 * noise(base[i] / 5.5, o.seed + 1));
      X[i] = xs[i] - dy / d * off;
      Y[i] = ys[i] + dx / d * off;
    }
    var S = new Float32Array(n);
    for (i = 1; i < n; i++) S[i] = S[i - 1] + Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1]);

    // how sharply the line turns: the hand slows into bends and presses harder
    var K = new Float32Array(n);
    for (i = 2; i < n - 2; i++) {
      var ax = xs[i] - xs[i - 2], ay = ys[i] - ys[i - 2], bx = xs[i + 2] - xs[i], by = ys[i + 2] - ys[i];
      var cr = Math.abs(ax * by - ay * bx) / ((Math.hypot(ax, ay) * Math.hypot(bx, by)) || 1);
      K[i] = cr / (((Math.hypot(ax, ay) + Math.hypot(bx, by)) / 2) || 1);
    }

    var dash = null;
    if (o.dashed) {                               // dashes of uneven length, like a hand's
      var r = stream(o.seed + 99), on = [], s = r() * 3;
      while (s < S[n - 1]) {
        var len = (3 + r() * 2.4) * z.dash;
        on.push(s, Math.min(S[n - 1], s + len));
        s += len + (2.6 + r() * 1.4) * z.dash;
      }
      dash = on;
    }

    var top = Infinity, bot = -Infinity;
    for (i = 0; i < n; i++) { if (Y[i] < top) top = Y[i]; if (Y[i] > bot) bot = Y[i]; }

    return {
      x: X, y: Y, s: S, k: K, len: S[n - 1], drawn: 0, top: top, bot: bot,
      pen: o.pen, w: o.w * z.w, a: Math.min(1, o.a * (o.pen === 'blue' || o.pen === 'red' ? z.tint : 1)),
      fibers: Math.round(o.fibers * z.fib), dot: o.dot * z.dot,
      stray: o.stray || 0, step: z.step, grain: z.grain,
      taperIn: o.taperIn * z.size, taperOut: o.taperOut * z.size,
      speed: o.speed, lift: o.lift, seed: o.seed, dash: dash,
      due: o.due, at: o.at, endY: o.endY
    };
  }

  function bend(st, d) {
    var S = st.s, lo = 0, hi = S.length - 1;
    while (lo < hi) { var m = (lo + hi) >> 1; if (S[m] < d) lo = m + 1; else hi = m; }
    return st.k[lo];
  }

  function pressure(st, d) {
    var p = 0.8 + 0.2 * noise(d / 17, st.seed + 3);
    p *= 0.92 + Math.min(0.22, bend(st, d) * 9);
    p *= 0.3 + 0.7 * smooth(d / st.taperIn);                 // the lead settles in
    p *= 0.2 + 0.8 * smooth((st.len - d) / st.taperOut);     // and lifts off
    if (st.dash) {
      var a = st.dash, lo = 0, hi = a.length / 2 - 1;
      while (lo < hi) { var m = (lo + hi + 1) >> 1; if (a[m * 2] <= d) lo = m; else hi = m - 1; }
      var s0 = a[lo * 2], s1 = a[lo * 2 + 1];
      if (d < s0 || d > s1) return 0;
      p *= (0.35 + 0.65 * smooth((d - s0) / (0.9 * st.grain))) * (0.3 + 0.7 * smooth((s1 - d) / (1.1 * st.grain)));
    }
    return p;
  }

  var ink = {};                                    // pencil colours, read from the sheet

  function readInk() {
    var cs = getComputedStyle(root);
    ink.lead = cs.getPropertyValue('--pencil').trim();
    ink.rule = ink.lead;
    ink.blue = cs.getPropertyValue('--accent').trim();
    ink.red = cs.getPropertyValue('--red').trim();
  }

  // Lay graphite down between two arc lengths. The lead is a bundle of fine
  // fibres running along the stroke, each fading in and out on its own
  // (the streaks a pencil leaves), fainter towards the edges, and caught or
  // skipped by the paper's tooth; a few stray grains land just outside.
  function lay(st, from, to) {
    if (to <= from) return;
    var X = st.x, Y = st.y, S = st.s, n = S.length, F = st.fibers, STEP = st.step, G = st.grain;
    var lo = 0, hi = n - 1;
    while (lo < hi) { var m = (lo + hi) >> 1; if (S[m] < from) lo = m + 1; else hi = m; }
    var j = Math.max(1, lo);
    ctx.fillStyle = ink[st.pen];
    for (var k = Math.ceil(from / STEP); k * STEP < to; k++) {
      var d = k * STEP;
      while (j < n - 1 && S[j] < d) j++;
      var seg = S[j] - S[j - 1] || 1, f = (d - S[j - 1]) / seg;
      var tx = (X[j] - X[j - 1]) / seg, ty = (Y[j] - Y[j - 1]) / seg;
      var px = X[j - 1] + (X[j] - X[j - 1]) * f, py = Y[j - 1] + (Y[j] - Y[j - 1]) * f;
      var pr = pressure(st, d);
      if (pr <= 0.02) continue;
      var half = st.w * (0.6 + 0.4 * pr);
      for (var q = 0; q < F; q++) {
        var u = F === 1 ? 0 : q / (F - 1) * 2 - 1;
        var off = u * half + (hash(st.seed + k, q) - 0.5) * 0.3 * G;
        var streak = 0.5 + 0.5 * noise(d / (5 + 4 * hash(st.seed, q)), st.seed + 17 + q * 31);
        var gx = px - ty * off, gy = py + tx * off;
        var a = st.a * pr * (1 - 0.5 * u * u) * (0.45 + 0.55 * streak) * (0.4 + 0.6 * tooth(gx / G, gy / G));
        if (a < 0.02) continue;
        var sz = st.dot * (0.8 + 0.45 * hash(st.seed + k, q + 64));
        ctx.globalAlpha = a;
        ctx.fillRect(gx - sz / 2, gy - sz / 2, sz, sz);
      }
      var r = hash(st.seed + k, 99);
      if (r < st.stray) {
        var side = hash(st.seed + k, 98) < 0.5 ? -1 : 1;
        var so = side * (half + (0.25 + 0.7 * hash(st.seed + k, 97)) * G);
        ctx.globalAlpha = st.a * pr * 0.45 * (0.4 + r / st.stray * 0.6);
        ctx.fillRect(px - ty * so - 0.25 * G, py + tx * so - 0.25 * G, 0.5 * G, 0.5 * G);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* --- the figure --- */

  var geo = null;        // current layout and strokes; null while hidden
  var marks = [];        // legend samples, drawn whole
  var pen = { i: 0, pause: 0, t: 0, last: 0, y: 0 };
  var readMax = 0;       // furthest the reader has been, in plot coordinates
  var raf = 0;
  var stale = false;     // the layout changed and build() hasn't caught up yet
  var builtWidth = -1;   // viewport width the figure was laid out for
  var paintGen = 0;      // bumped by each repaint, to cancel an older one still finishing
  var dprQuery = null, dprWatched = 0;

  function docTop(node) {
    return node.getBoundingClientRect().top + window.scrollY;
  }

  function figure(W, H, ground) {
    var R = stream(SEED);
    var sz = ground ? Math.min(2.2, Math.max(1, Math.sqrt(W / 104))) : 1;   // a bigger figure, unhurried curves
    var phase = R() * 6.283, cx = W / 2, A = W * (ground ? 0.36 : 0.42), edge = ground ? 12 : 3;
    function sig(y) {
      var u = y / (260 * sz);
      var amp = 0.78 + 0.22 * Math.sin(0.23 * u + 0.6 + phase);
      return amp * (0.64 * Math.sin(2 * Math.PI * 0.46 * u + 0.4 + phase) +
                    0.36 * Math.sin(2 * Math.PI * 1.13 * u + 2.1 + phase * 1.7));
    }
    function px(v) { return Math.max(edge, Math.min(W - edge, v)); }

    var list = [], id = 1, a = 0;
    function seed() { return (SEED + Math.imul(id++, 0x9e3779b1)) >>> 0; }
    function full(edge) { return function (r) { return r >= edge ? this.len : 0; }; }

    while (a < H - 1) {
      var b = Math.min(H, a + (270 + R() * 70) * sz);
      var eps = (0.09 + R() * 0.09) * (R() < 0.5 ? -1 : 1);
      var gain = 1.06 + R() * 0.16;
      var xs = [], ys = [], y;

      // a ruled tick and construction line for this span of time (margin only)
      if (!ground) {
        list.push(makeStroke([-13.5, -6.5], [a, a + (R() - 0.5) * 0.4], {
          pen: 'rule', w: 0.35, a: 0.3, fibers: 2, dot: 0.5, taperIn: 1, taperOut: 1,
          wobble: 0.05, speed: 70, lift: 40 + R() * 50, seed: seed(), due: full(a)
        }));
        list.push(makeStroke([-10, -10 + (R() - 0.5) * 0.5], [a + 1.5, b - 1.5], {
          pen: 'rule', w: 0.3, a: 0.24, fibers: 2, dot: 0.5, taperIn: 6, taperOut: 10,
          wobble: 0.12, speed: 1500, lift: 60 + R() * 90, seed: seed(), due: full(a)
        }));
      }

      // the observed trajectory, in step with the reader
      for (y = a; y <= b; y += 1) { xs.push(px(cx + A * sig(y))); ys.push(y); }
      if (ys[ys.length - 1] < b) { xs.push(px(cx + A * sig(b))); ys.push(b); }
      (function (a0, b0) {
        list.push(makeStroke(xs, ys, {
          pen: 'lead', w: 0.85, a: 0.5, fibers: 5, dot: 0.55, stray: 0.22, taperIn: 6, taperOut: 5,
          wobble: 0.85, speed: 430 * sz, lift: 50 + R() * 90, seed: seed(),
          due: function (r) {
            if (r <= a0) return 0;
            if (r >= b0) return this.len;
            return this.s[Math.min(this.s.length - 1, Math.round(r - a0))];
          },
          at: a0, endY: b0
        }));
      })(a, b);

      // the rollout from this re-encoding, drawn once its span has passed
      // (scaled back if it would leave the sheet, rather than pinned flat to the edge)
      var sa = sig(a), rx = [], ry = [], base = A * sa, L = (W / 2 - edge) * 0.97, dev = [], kd = 1;
      for (y = a; y <= b; y += 1) {
        var dv = A * gain * (sig(a + (y - a) * (1 + eps)) - sa);
        dev.push(dv);
        if (Math.abs(base + dv) > L) kd = Math.min(kd, (L - (dv > 0 ? base : -base)) / Math.abs(dv));
      }
      for (var t0 = 0; t0 < dev.length; t0++) { rx.push(cx + base + kd * dev[t0]); ry.push(a + t0); }
      list.push(makeStroke(rx, ry, {
        pen: 'blue', w: 0.7, a: 0.5, fibers: 4, dot: 0.55, stray: 0.1, taperIn: 3, taperOut: 3, dashed: true,
        wobble: 0.6, speed: 560 * sz, lift: 90 + R() * 120, seed: seed(), due: full(b)
      }));

      if (b < H - 1) {
        // the correction: from where the rollout ended back towards the truth,
        // stopping at the ring drawn around it
        var tx = px(cx + A * sig(b)), from = rx[rx.length - 1], dir = tx >= from ? 1 : -1;
        var rad = (2.5 + R() * 0.6) * style.ring, sl = (R() - 0.5) * 1.4 * sz;
        var fx = [], fy = [], len = Math.abs(tx - from) - rad * 0.7 + (R() - 0.3) * 1.2;
        var steps = Math.max(2, Math.ceil(len));
        for (var i = 0; i <= steps; i++) {
          var t = i / steps;
          fx.push(from + dir * len * t);
          fy.push(b + sl * t);
        }
        if (len > 1.5) list.push(makeStroke(fx, fy, {
          pen: 'red', w: 0.55, a: 0.6, fibers: 3, dot: 0.55, stray: 0.12, taperIn: 1.5, taperOut: 2.5,
          wobble: 0.2, speed: (120 + R() * 60) * sz, lift: 60 + R() * 80, seed: seed(), due: full(b)
        }));

        var th0 = R() * 6.283, sweep = 6.283 + 0.4 + R() * 0.6;
        var squash = 0.85 + R() * 0.25, tilt = R() * 3.14, cxs = [], cys = [];
        var ringSeed = seed();
        for (var q = 0; q <= 64; q++) {
          var th = th0 + sweep * q / 64;
          var rr = rad * (1 + 0.09 * noise(q / 9, ringSeed) + 0.06 * q / 64);   // it doesn't quite close on itself
          var ex = Math.cos(th) * rr, ey = Math.sin(th) * rr * squash;
          cxs.push(tx + ex * Math.cos(tilt) - ey * Math.sin(tilt));
          cys.push(b + ex * Math.sin(tilt) + ey * Math.cos(tilt));
        }
        list.push(makeStroke(cxs, cys, {
          pen: 'red', w: 0.5, a: 0.6, fibers: 3, dot: 0.55, stray: 0.12, taperIn: 2, taperOut: 4,
          wobble: 0.05, speed: (75 + R() * 25) * style.ring, lift: 160 + R() * 160, seed: ringSeed, due: full(b)
        }));
      }

      a = b;
    }
    return list;
  }

  function legendMarks() {
    var o = { w: 0.85, a: 0.5, fibers: 5, dot: 0.55, stray: 0.2, taperIn: 2, taperOut: 2, wobble: 0.3, speed: 1, lift: 0 };
    function line(pen, y, extra) {
      var xs = [], ys = [];
      for (var x = -OX + 1; x <= -OX + 15; x += 1) { xs.push(x); ys.push(y); }
      return makeStroke(xs, ys, Object.assign({}, o, { pen: pen, seed: (SEED ^ (y * 977)) >>> 0 }, extra));
    }
    var ring = [], ringY = [], c = -PAD + 51.5;
    for (var q = 0; q <= 48; q++) { var th = 0.6 + 6.9 * q / 48; ring.push(-OX + 8 + Math.cos(th) * 2.6); ringY.push(c + Math.sin(th) * 2.5); }
    return [
      line('lead', -PAD + 25.5, {}),
      line('blue', -PAD + 38.5, { dashed: true, w: 0.7, a: 0.5, fibers: 4 }),
      makeStroke(ring, ringY, Object.assign({}, o, { pen: 'red', w: 0.5, a: 0.6, fibers: 3, seed: (SEED ^ 4242) >>> 0 }))
    ];
  }

  function readerY() {
    if (!geo) return 0;
    var de = document.documentElement;
    if (window.scrollY + window.innerHeight >= de.scrollHeight - 2) return geo.H;
    return window.scrollY + window.innerHeight * 0.7 - geo.y0;
  }

  // How far down the observed line the hand has got (its points are 1px apart in y).
  function reached(st) {
    var S = st.s, lo = 0, hi = S.length - 1;
    while (lo < hi) { var m = (lo + hi) >> 1; if (S[m] < st.drawn) lo = m + 1; else hi = m; }
    return Math.min(st.endY, st.at + lo);
  }

  // Bring every stroke instantly as far as the reader at y would allow, stopping
  // at the first one left unfinished; the hand picks up from there. With
  // noPaint, only the bookkeeping moves and a repaint() lays the graphite.
  function fastForward(y, noPaint) {
    var list = geo.strokes;
    pen.i = list.length;
    for (var i = 0; i < list.length; i++) {
      var st = list[i], due = st.due(y);
      if (due > st.drawn) { if (!noPaint) lay(st, st.drawn, due); st.drawn = due; }
      if (st.at != null) pen.y = reached(st);
      if (st.drawn < st.len - 1e-3) { pen.i = i; break; }
    }
  }

  // Lay down everything drawn so far: what's on or near the screen at once,
  // the rest in short slices after, in drawing order, so a change of sheet or
  // a rotation never holds up the page.
  function repaint() {
    if (!geo) return;
    readInk();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(geo.dpr, 0, 0, geo.dpr, geo.ox * geo.dpr, geo.pad * geo.dpr);
    marks.forEach(function (m) { lay(m, 0, m.len); });
    var v0 = window.scrollY - geo.y0 - window.innerHeight, v1 = v0 + 3 * window.innerHeight;
    var queue = [], qi = 0, gen = ++paintGen;
    geo.strokes.forEach(function (st) {
      if (!st.drawn) return;
      if (st.bot >= v0 && st.top <= v1) lay(st, 0, st.drawn);
      else queue.push(st, st.drawn);               // the hand extends it from st.drawn later
    });
    if (queue.length) setTimeout(function drain() {
      if (gen !== paintGen) return;                // a newer repaint took over
      var t = performance.now();
      while (qi < queue.length && performance.now() - t < 6) { lay(queue[qi], 0, queue[qi + 1]); qi += 2; }
      if (qi < queue.length) setTimeout(drain, 0);
    }, 0);
  }

  function build() {
    var sheet = document.querySelector('.sheet');
    var intro = document.querySelector('.intro');
    var end = document.querySelector('.titleblock');
    var rect = sheet.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    var room = vw - rect.right;
    builtWidth = vw;

    if (!intro || !end) {
      host.classList.remove('on');
      geo = null;
      return;
    }

    // re-read the pixel ratio (zoom, another screen) and listen for its next change
    var ratio = window.devicePixelRatio || 1;
    if (ratio !== dprWatched && window.matchMedia) {
      if (dprQuery && dprQuery.removeEventListener) dprQuery.removeEventListener('change', rebuild);
      dprQuery = window.matchMedia('(resolution: ' + ratio + 'dppx)');
      if (dprQuery.addEventListener) dprQuery.addEventListener('change', rebuild);
      dprWatched = ratio;
    }

    // in the margin when there's room for it, otherwise behind the text
    var ground = vw < MIN_VIEWPORT || room < 150;
    var mode = ground ? 'ground' : 'margin';
    var W, left, y0, ox, pad, dpr;
    if (ground) {
      var cs = getComputedStyle(sheet);
      var pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0;
      var head = document.querySelector('.intro-head');
      W = rect.width - pl - pr;
      left = rect.left + window.scrollX + pl;
      // start just under the name and title, leaving them and the Persian
      // watermark clear, but early enough that the hand is drawing on arrival
      y0 = head ? docTop(head) + head.offsetHeight + 14 : docTop(intro);
      ox = 0; pad = 0; dpr = Math.min(1.5, ratio);
    } else {
      W = Math.min(104, room - 96);
      left = rect.right + Math.min(56, (room - W) / 2) - OX;
      y0 = docTop(intro) + 8;
      ox = OX; pad = PAD; dpr = Math.min(2, ratio);
    }
    var H = Math.max(0, docTop(end) - 24 - y0);
    var key = [mode, Math.round(left), Math.round(y0), Math.round(H), Math.round(W), dpr].join();
    if (geo && geo.key === key) {
      stale = false;
      host.classList.add('on');
      kick();
      return;
    }

    // carry the hand's progress over to the new layout: a first visit draws
    // from the top, but after a switch of layout what you've read is there at once
    var prev = geo, same = prev && prev.mode === mode;
    var scale = same && prev.H ? H / prev.H : 1;
    var carry = same ? pen.y * scale : 0;
    readMax = same ? readMax * scale : 0;

    var cw = W + ox + (ground ? 0 : 18), ch = H + pad + 12;
    // stay inside canvas limits: one GPU texture (8192px on many phones), and a phone's memory
    dpr = Math.min(dpr, (ground ? 8192 : 16000) / ch, Math.sqrt(6e6 / (cw * ch)));
    host.style.left = left + 'px';
    host.style.top = (y0 - pad) + 'px';
    host.style.width = cw + 'px';
    host.style.height = ch + 'px';
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';

    style = STYLES[mode];
    geo = { key: key, mode: mode, H: H, y0: y0, ox: ox, pad: pad, dpr: dpr, strokes: figure(W, H, ground) };
    marks = ground ? [] : legendMarks();
    host.classList.toggle('ground', ground);
    host.classList.add('on');
    stale = false;
    if (prev && !same) carry = Math.max(0, readerY());

    pen.pause = 0;
    pen.y = 0;
    if (calmQuery.matches || prev) fastForward(calmQuery.matches ? H : carry, true);
    else pen.i = 0;                                // a first visit: the hand rules even the first tick
    repaint();
    kick();
  }

  function backlog() {
    var list = geo.strokes, sum = 0;
    for (var i = pen.i; i < list.length && i < pen.i + 12; i++) {
      var due = list[i].due(readMax);
      if (due <= list[i].drawn) break;
      sum += due - list[i].drawn;
    }
    return sum;
  }

  function frame(now) {
    raf = 0;
    if (!geo) return;
    var dt = Math.min(0.05, pen.last ? (now - pen.last) / 1000 : 0.016);
    pen.last = now;
    pen.t += dt;
    if (!stale) {
      readMax = Math.max(readMax, readerY());
      // what's already scrolled past, nobody watches being drawn: it's simply there
      var above = Math.min(readMax, window.scrollY - geo.y0);
      if (above > pen.y + 1) fastForward(above);
    }

    var list = geo.strokes, busy = false;
    var hurry = 1 + Math.min(4, backlog() / 700);   // a hand that has fallen behind moves faster
    while (dt > 0 && pen.i < list.length) {
      if (pen.pause > 0) {
        var wait = Math.min(pen.pause, dt * 1000);
        pen.pause -= wait;
        dt -= wait / 1000;
        busy = true;
        continue;
      }
      var st = list[pen.i];
      if (st.drawn >= st.len - 1e-3) {
        if (st.at != null) pen.y = st.endY;
        pen.i++;
        pen.pause = st.lift / hurry;
        continue;
      }
      var due = st.due(readMax);
      if (st.drawn >= due) break;                   // waiting for the reader
      var v = st.speed * hurry * (0.8 + 0.4 * (0.5 + 0.5 * noise(pen.t * 1.6, SEED)));
      v /= 1 + Math.min(1.5, bend(st, st.drawn) * 25);
      var step = Math.min(due - st.drawn, v * dt);
      lay(st, st.drawn, st.drawn + step);
      st.drawn += step;
      if (st.at != null) pen.y = reached(st);
      dt -= step / v;
      busy = true;
    }
    if (busy || (pen.i < list.length && list[pen.i].due(readMax) > list[pen.i].drawn)) {
      raf = requestAnimationFrame(frame);
    } else {
      pen.last = 0;
    }
  }

  function kick() {
    if (!geo) return;
    if (calmQuery.matches) {
      readMax = geo.H;
      fastForward(geo.H);
      return;
    }
    if (!raf) raf = requestAnimationFrame(frame);
  }

  // A change of width moves the text under the figure: hide it until it's laid
  // out again (no stray overflow while a window is dragged or a phone rotates).
  // A change of height alone, like a phone's toolbar sliding away, leaves it be.
  var resizeTimer;
  function rebuild() {
    stale = true;
    if (document.documentElement.clientWidth !== builtWidth) host.classList.remove('on');
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 120);
  }

  // a new sheet means new pencil colours
  new MutationObserver(function () { if (geo) repaint(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  function systemRepaint() { if (!root.dataset.theme) repaint(); }
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', systemRepaint);
  else if (darkQuery.addListener) darkQuery.addListener(systemRepaint);

  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', rebuild);
  if (window.ResizeObserver) new ResizeObserver(rebuild).observe(document.querySelector('.sheet'));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
  build();
})();
