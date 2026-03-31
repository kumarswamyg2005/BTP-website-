/* ═══════════════════════════════════════════════════════════════
   Unity Stream — Interactive Particle Text Effect
   Renders "UNITY STREAM" as dot-particles on a canvas.
   Mouse proximity repels particles; they spring back to origin.
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Tuning ─────────────────────────────────────────────────── */
  var GAP           = 4;    // px between sampled grid points
  var REPEL_RADIUS  = 100;  // px — mouse influence radius
  var REPEL_FORCE   = 9;    // repulsion power
  var EASE          = 0.085;// spring-back speed
  var FRICTION      = 0.82; // velocity decay per frame
  var COLORS = [
    '#4f8ef7', '#4f8ef7', '#4f8ef7',
    '#7c5cfc', '#a78bfa',
    '#6eb3ff',
  ];

  /* ── Particle ───────────────────────────────────────────────── */
  function Particle(ox, oy, sx, sy, color, size) {
    this.originX = ox;
    this.originY = oy;
    this.x  = sx;
    this.y  = sy;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.color = color;
    this.size  = size;
  }

  /* ── ParticleText ───────────────────────────────────────────── */
  function ParticleText(canvas) {
    this.canvas    = canvas;
    this.ctx       = canvas.getContext('2d');
    this.particles = [];
    this.mouse     = { x: -9999, y: -9999 };
    this.raf       = null;
    this._onMove   = this._onMove.bind(this);
    this._onLeave  = this._onLeave.bind(this);
    this._onResize = this._onResize.bind(this);
  }

  /* Returns the canvas draw-buffer width derived from actual rendered size */
  ParticleText.prototype._getWidth = function () {
    // getBoundingClientRect reflects the actual CSS-rendered size,
    // which is reliable even before canvas.width is set.
    var rect = this.canvas.getBoundingClientRect();
    var w = rect.width;
    if (!w || w < 10) {
      // Fall back to offsetWidth of parent
      w = this.canvas.parentElement.offsetWidth;
    }
    if (!w || w < 10) {
      // Hard fallback
      w = 500;
    }
    return Math.floor(w);
  };

  ParticleText.prototype.init = function () {
    var self = this;

    function run() {
      self._resize();
      self._buildParticles();
      self._attachEvents();
      self._tick();
    }

    // Wait for fonts, then use double-rAF so the browser has
    // completed at least one full layout+paint cycle before we
    // try to read the rendered canvas width.
    var fontsReady = (document.fonts && document.fonts.ready)
      ? document.fonts.ready
      : Promise.resolve();

    fontsReady.then(function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(run);
      });
    });
  };

  ParticleText.prototype._resize = function () {
    var w = this._getWidth();
    var h = 210;
    this.canvas.width  = w;
    this.canvas.height = h;
  };

  ParticleText.prototype._buildParticles = function () {
    this.particles = [];
    var ctx = this.ctx;
    var w   = this.canvas.width;
    var h   = this.canvas.height;

    if (w < 10) return; // nothing to draw

    ctx.clearRect(0, 0, w, h);

    var fs = Math.max(28, Math.min(Math.floor(w / 5.4), 86));
    ctx.font          = 'bold ' + fs + 'px Inter, system-ui, sans-serif';
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    ctx.fillStyle     = '#ffffff';

    var line1Y = h / 2 - fs * 0.58;
    var line2Y = h / 2 + fs * 0.58;

    ctx.fillText('UNITY',  w / 2, line1Y);
    ctx.fillText('STREAM', w / 2, line2Y);

    var imgData = ctx.getImageData(0, 0, w, h).data;
    ctx.clearRect(0, 0, w, h);

    for (var y = 0; y < h; y += GAP) {
      for (var x = 0; x < w; x += GAP) {
        var idx = (y * w + x) * 4;
        if (imgData[idx + 3] > 110) {
          var color = COLORS[Math.floor(Math.random() * COLORS.length)];
          var size  = Math.random() * 1.3 + 0.9;
          this.particles.push(new Particle(
            x, y,
            Math.random() * w,
            Math.random() * h,
            color, size
          ));
        }
      }
    }
  };

  ParticleText.prototype._attachEvents = function () {
    var panel = document.querySelector('.login-left');
    if (panel) {
      panel.addEventListener('mousemove',  this._onMove);
      panel.addEventListener('mouseleave', this._onLeave);
    }
    window.addEventListener('resize', this._onResize);
  };

  ParticleText.prototype._onMove = function (e) {
    var rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
  };

  ParticleText.prototype._onLeave = function () {
    this.mouse.x = -9999;
    this.mouse.y = -9999;
  };

  ParticleText.prototype._onResize = function () {
    this._resize();
    this._buildParticles();
  };

  ParticleText.prototype._tick = function () {
    var ctx = this.ctx;
    var w   = this.canvas.width;
    var h   = this.canvas.height;
    var mx  = this.mouse.x;
    var my  = this.mouse.y;

    ctx.clearRect(0, 0, w, h);
    ctx.shadowBlur = 5;

    for (var i = 0; i < this.particles.length; i++) {
      var p  = this.particles[i];
      var dx = p.x - mx;
      var dy = p.y - my;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < REPEL_RADIUS && dist > 0) {
        var force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
        force = force * force;
        p.vx += (dx / dist) * force * REPEL_FORCE;
        p.vy += (dy / dist) * force * REPEL_FORCE;
      }

      p.vx += (p.originX - p.x) * EASE;
      p.vy += (p.originY - p.y) * EASE;
      p.vx *= FRICTION;
      p.vy *= FRICTION;
      p.x  += p.vx;
      p.y  += p.vy;

      ctx.shadowColor = p.color;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, 6.2832);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    this.raf = requestAnimationFrame(this._tick.bind(this));
  };

  ParticleText.prototype.destroy = function () {
    cancelAnimationFrame(this.raf);
    var panel = document.querySelector('.login-left');
    if (panel) {
      panel.removeEventListener('mousemove',  this._onMove);
      panel.removeEventListener('mouseleave', this._onLeave);
    }
    window.removeEventListener('resize', this._onResize);
  };

  /* ── Bootstrap ──────────────────────────────────────────────── */
  function boot() {
    var canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    var effect = new ParticleText(canvas);
    effect.init();
    window._unityParticles = effect;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
