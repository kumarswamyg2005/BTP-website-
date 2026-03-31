import React, { useRef, useEffect } from 'react';

const GAP           = 4;
const REPEL_RADIUS  = 100;
const REPEL_FORCE   = 9;
const EASE          = 0.085;
const FRICTION      = 0.82;
// VR drift — gentle autonomous wave when no mouse available
const DRIFT_EASE    = 0.06;
const DRIFT_AMP     = 6;   // px max drift from origin
const COLORS = [
  '#4f8ef7', '#4f8ef7', '#4f8ef7',
  '#7c5cfc', '#a78bfa',
  '#6eb3ff',
];

// True if the primary pointer is coarse (VR controller, touch, etc.)
const IS_COARSE = window.matchMedia('(pointer: coarse)').matches;

function Particle(ox, oy, sx, sy, color, size) {
  this.originX = ox;
  this.originY = oy;
  this.x  = sx;
  this.y  = sy;
  this.vx = (Math.random() - 0.5) * 4;
  this.vy = (Math.random() - 0.5) * 4;
  this.color = color;
  this.size  = size;
  // Each particle gets a unique phase offset so they don't all move together
  this.phase = Math.random() * Math.PI * 2;
}

export default function ParticleCanvas() {
  const canvasRef = useRef(null);
  const stateRef  = useRef({
    particles: [],
    mouse: { x: -9999, y: -9999 },
    raf: null,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s   = stateRef.current;

    function getWidth() {
      const rect = canvas.getBoundingClientRect();
      let w = rect.width;
      if (!w || w < 10) w = canvas.parentElement?.offsetWidth || 500;
      if (!w || w < 10) w = 500;
      return Math.floor(w);
    }

    function resize() {
      canvas.width  = getWidth();
      canvas.height = IS_COARSE ? 160 : 255; // compact on VR/touch
    }

    function buildParticles() {
      s.particles = [];
      const w = canvas.width;
      const h = canvas.height;
      if (w < 10) return;

      ctx.clearRect(0, 0, w, h);
      const fs = Math.max(30, Math.min(Math.floor(w / 4.5), 100)); // Larger font
      ctx.font          = `900 ${fs}px Inter, system-ui, sans-serif`;
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'middle';
      ctx.fillStyle     = '#ffffff';

      const line1Y = h / 2 - fs * 0.55;
      const line2Y = h / 2 + fs * 0.55;
      ctx.fillText('UNITY',  w / 2, line1Y);
      ctx.fillText('STREAM', w / 2, line2Y);

      const imgData = ctx.getImageData(0, 0, w, h).data;
      ctx.clearRect(0, 0, w, h);

      for (let y = 0; y < h; y += GAP) {
        for (let x = 0; x < w; x += GAP) {
          const idx = (y * w + x) * 4;
          if (imgData[idx + 3] > 110) {
            const color = COLORS[Math.floor(Math.random() * COLORS.length)];
            const size  = Math.random() * 1.3 + 0.9;
            s.particles.push(
              new Particle(x, y, Math.random() * w, Math.random() * h, color, size)
            );
          }
        }
      }
    }

    function tick() {
      const w  = canvas.width;
      const h  = canvas.height;
      const mx = s.mouse.x;
      const my = s.mouse.y;
      const t  = Date.now() * 0.0008; // time for drift wave

      ctx.clearRect(0, 0, w, h);
      ctx.shadowBlur = 5;

      for (let i = 0; i < s.particles.length; i++) {
        const p = s.particles[i];

        if (IS_COARSE) {
          // ── VR / touch mode: autonomous drift ──────────────────
          // Each particle gently oscillates around its origin using
          // a sine wave so the text "breathes" and stays readable.
          const waveX = Math.sin(t + p.phase)           * DRIFT_AMP;
          const waveY = Math.cos(t * 0.7 + p.phase * 1.3) * DRIFT_AMP * 0.6;

          p.vx += (p.originX + waveX - p.x) * DRIFT_EASE;
          p.vy += (p.originY + waveY - p.y) * DRIFT_EASE;
        } else {
          // ── Desktop mode: mouse repulsion ──────────────────────
          const dx   = p.x - mx;
          const dy   = p.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < REPEL_RADIUS && dist > 0) {
            let force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
            force = force * force;
            p.vx += (dx / dist) * force * REPEL_FORCE;
            p.vy += (dy / dist) * force * REPEL_FORCE;
          }

          p.vx += (p.originX - p.x) * EASE;
          p.vy += (p.originY - p.y) * EASE;
        }

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
      s.raf = requestAnimationFrame(tick);
    }

    function onMove(e) {
      const rect = canvas.getBoundingClientRect();
      s.mouse.x = e.clientX - rect.left;
      s.mouse.y = e.clientY - rect.top;
    }

    function onLeave() {
      s.mouse.x = -9999;
      s.mouse.y = -9999;
    }

    function onResize() {
      resize();
      buildParticles();
    }

    function run() {
      resize();
      buildParticles();
      tick();
    }

    // Only attach mouse events on desktop
    const panel = document.querySelector('.login-left');
    if (panel && !IS_COARSE) {
      panel.addEventListener('mousemove', onMove);
      panel.addEventListener('mouseleave', onLeave);
    }
    window.addEventListener('resize', onResize);

    const fontsReady = document.fonts?.ready || Promise.resolve();
    let cancelled = false;
    fontsReady.then(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { if (!cancelled) run(); });
      });
    });

    return () => {
      cancelled = true;
      if (s.raf) cancelAnimationFrame(s.raf);
      if (panel && !IS_COARSE) {
        panel.removeEventListener('mousemove', onMove);
        panel.removeEventListener('mouseleave', onLeave);
      }
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" />;
}
