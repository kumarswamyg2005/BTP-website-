import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useToast } from '../context/ToastContext.jsx';

/*
  VRViewer — A-Frame 360° VR player

  Portal strategy:
  ─────────────────────────────────────────────────────────────
  We use a MODULE-LEVEL singleton div as the portal target.
  It is appended once when the module loads and never removed.

  Fullscreen strategy:
  ─────────────────────────────────────────────────────────────
  A-Frame's built-in VR button calls canvas.requestFullscreen(),
  which hides our HTML controls. We disable A-Frame's VR mode UI
  and add our own controls that fullscreen the outer wrapper div.
*/

const VR_PORTAL_ROOT = (() => {
  const el = document.createElement('div');
  el.id = 'vr-portal-root';
  document.body.appendChild(el);
  return el;
})();

export default function VRViewer({ src, onClose }) {
  const toast = useToast();
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [muted,        setMuted]        = useState(true);
  const [paused,       setPaused]       = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const sceneRef  = useRef(null);
  const videoRef  = useRef(null);
  const outerRef  = useRef(null);
  const closedRef = useRef(false);

  // ── Fullscreen change listener ───────────────────────────────
  useEffect(() => {
    function onFsChange() {
      const fsEl = document.fullscreenElement
        || document.webkitFullscreenElement
        || document.mozFullScreenElement;
      setIsFullscreen(!!fsEl);
    }
    document.addEventListener('fullscreenchange',       onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('mozfullscreenchange',    onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange',       onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('mozfullscreenchange',    onFsChange);
    };
  }, []);

  // ── A-Frame scene + video setup ──────────────────────────────
  useEffect(() => {
    closedRef.current = false;

    const video = videoRef.current;
    const scene = sceneRef.current;
    if (!video || !scene) return;

    video.muted       = true;
    video.loop        = true;
    video.playsInline = true;

    let sceneReady = false;
    let videoReady = false;

    function applyTexture() {
      if (!sceneReady || !videoReady || closedRef.current) return;

      video.play().catch(() => {});
      setLoading(false);

      const sphere = scene.querySelector('#vr-sphere');
      if (!sphere) return;

      function bindTex() {
        const mesh = sphere.getObject3D('mesh');
        if (!mesh) return;
        const THREE = window.THREE;
        const tex = new THREE.VideoTexture(video);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.format    = THREE.RGBAFormat;
        mesh.material.map         = tex;
        mesh.material.needsUpdate = true;
        mesh.material.side        = THREE.BackSide;
      }

      if (sphere.getObject3D('mesh')) {
        bindTex();
      } else {
        sphere.addEventListener('object3dset', bindTex, { once: true });
      }

      toast('🥽 360° active! Tap 🔊 to unmute.', 'success', 5000);
    }

    function onSceneLoaded() { sceneReady = true; applyTexture(); }
    function onCanPlay()     { videoReady = true; applyTexture(); }
    function onVideoError()  { setLoading(false); setError(true); }

    function onEnterVR() {
      const v = videoRef.current;
      if (v && v.paused && !closedRef.current) v.play().catch(() => {});
    }

    if (scene.hasLoaded) {
      sceneReady = true;
    } else {
      scene.addEventListener('loaded', onSceneLoaded, { once: true });
    }
    scene.addEventListener('enter-vr', onEnterVR);
    video.addEventListener('canplay',  onCanPlay,    { once: true });
    video.addEventListener('error',    onVideoError, { once: true });
    video.load();

    return () => {
      closedRef.current = true;
      scene.removeEventListener('loaded',   onSceneLoaded);
      scene.removeEventListener('enter-vr', onEnterVR);
    };
  }, [src, toast]);

  // ── Handlers ─────────────────────────────────────────────────
  function handleClose() {
    closedRef.current = true;
    const video = videoRef.current;
    const scene = sceneRef.current;

    if (video) { video.pause(); video.src = ''; video.load(); }
    try { if (scene?.is('vr-mode')) scene.exitVR(); } catch {}
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
    try {
      if (scene && scene.parentNode) scene.parentNode.removeChild(scene);
    } catch {}

    onClose();
  }

  function handleUnmute() {
    const video = videoRef.current;
    if (!video || !video.muted) return;
    video.muted = false;
    setMuted(false);
    video.play().catch(() => {});
    toast('🔊 Audio enabled.', 'success', 2000);
  }

  function handlePauseToggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  }

  function handleSkip(seconds) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime + seconds);
  }

  function handleFullscreenToggle() {
    const el = outerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
      if (req) req.call(el).catch(() => {});
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen;
      if (exit) exit.call(document).catch(() => {});
    }
  }

  const content = (
    <div ref={outerRef} className="vr-root">

      <video
        ref={videoRef}
        src={src}
        style={{ display: 'none' }}
        playsInline
        webkit-playsinline=""
        preload="auto"
        muted
        loop
      />

      {/* A-Frame scene — base layer */}
      <a-scene
        ref={sceneRef}
        embedded
        vr-mode-ui="enabled: false"
        loading-screen="enabled: false"
        background="color: #080808"
        renderer="colorManagement: true; antialias: true; physicallyCorrectLights: true"
        device-orientation-permission-ui="enabled: false"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}
        onClick={handleUnmute}
      >
        <a-videosphere
          id="vr-sphere"
          rotation="0 -90 0"
          segments-height="64"
          segments-width="64"
          radius="100"
        />
        <a-camera
          look-controls="enabled: true; reverseMouseDrag: false; touchEnabled: true; magicWindowTrackingEnabled: true"
          wasd-controls="enabled: false"
          position="0 0 0"
        />
      </a-scene>

      {/* ── Loading overlay ─────────────────────────────── */}
      {loading && !error && (
        <div className="vr-loading-overlay">
          <div className="vr-spinner" />
          <p className="vr-loading-text">// INITIALIZING 360° FEED…</p>
        </div>
      )}

      {/* ── Error overlay ───────────────────────────────── */}
      {error && (
        <div className="vr-error-overlay">
          <span className="vr-error-icon">⚠</span>
          <p className="vr-error-text">STREAM UNAVAILABLE — CHECK ASSET PATH</p>
          <button onClick={handleClose} className="vr-hud-btn vr-top-btn">← BACK</button>
        </div>
      )}

      {/* ── Top-left: back + unmute ──────────────────────── */}
      <div className="vr-top-left">
        <button onClick={handleClose} className="vr-hud-btn vr-top-btn">
          ← BACK
        </button>
        {muted && !loading && !error && (
          <button onClick={handleUnmute} className="vr-hud-btn vr-top-btn vr-unmute-btn">
            ◈ UNMUTE
          </button>
        )}
      </div>

      {/* ── Top-right: fullscreen ───────────────────────── */}
      {!loading && !error && (
        <div className="vr-top-right">
          <button onClick={handleFullscreenToggle} className="vr-hud-btn vr-top-btn">
            {isFullscreen ? '⊠ EXIT FULLSCREEN' : '⛶ FULLSCREEN'}
          </button>
        </div>
      )}

      {/* ── Bottom-center: playback controls ────────────── */}
      {!loading && !error && (
        <div className="vr-ctrl-wrap">
          <span className="vr-ctrl-label">// PLAYBACK CONTROLS</span>
          <div className="vr-ctrl-bar">
            <button
              onClick={() => handleSkip(-10)}
              className="vr-hud-btn vr-ctrl-btn"
            >
              « −10S
            </button>
            <button
              onClick={handlePauseToggle}
              className={`vr-hud-btn vr-ctrl-btn vr-pause-btn${paused ? ' vr-pause-btn--paused' : ''}`}
            >
              {paused ? '▶ PLAY' : '⏸ PAUSE'}
            </button>
            <button
              onClick={() => handleSkip(10)}
              className="vr-hud-btn vr-ctrl-btn"
            >
              +10S »
            </button>
          </div>
        </div>
      )}


      <style>{HUD_CSS}</style>
    </div>
  );

  return ReactDOM.createPortal(content, VR_PORTAL_ROOT);
}

/* ─────────────────────────────────────────────────────────────
   HUD CSS — Industrial Sci-Fi / Secret Lab theme
   ───────────────────────────────────────────────────────────── */
const HUD_CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Share+Tech+Mono&display=swap');

/* ── Design tokens ──────────────────────────────────────────── */
.vr-root {
  --hud-bg:      rgba(10, 12, 10, 0.75);
  --hud-border:  #3A4A2A;
  --hud-text:    #B8D44A;
  --hud-text-dim:#6B7A3A;
  --hud-accent:  #C8E055;
  --hud-danger:  #FF4444;
  --hud-surface: rgba(20, 25, 15, 0.85);
  --hud-font:    'JetBrains Mono', 'Share Tech Mono', 'IBM Plex Mono', monospace;

  position: fixed;
  inset: 0;
  z-index: 99999;
  background: #000;
  width: 100%;
  height: 100%;
}

/* ════════════════════════════════════════════════════════════
   BASE HUD BUTTON
   ════════════════════════════════════════════════════════════ */
.vr-hud-btn {
  background:          var(--hud-surface);
  border:              1px solid var(--hud-border);
  color:               var(--hud-text);
  font-family:         var(--hud-font);
  font-weight:         600;
  font-size:           0.71rem;
  letter-spacing:      0.12em;
  text-transform:      uppercase;
  padding:             9px 18px;
  border-radius:       3px;
  cursor:              crosshair;
  min-height:          38px;
  white-space:         nowrap;
  font-variant-numeric: tabular-nums;
  position:            relative;
  display:             inline-flex;
  align-items:         center;
  gap:                 6px;
  outline:             none;
  backdrop-filter:     blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition:
    background  0.15s ease,
    border-color 0.15s ease,
    box-shadow  0.15s ease,
    transform   0.1s  ease;
}

.vr-hud-btn:hover {
  background:   rgba(200, 224, 85, 0.12);
  border-color: var(--hud-accent);
  box-shadow:   0 0 8px rgba(200, 224, 85, 0.2);
}

.vr-hud-btn:active {
  background: rgba(200, 224, 85, 0.2);
  transform:  scale(0.97);
}

/* ════════════════════════════════════════════════════════════
   TOP BAR BUTTONS  — bracket glyphs + left-edge hover accent
   ════════════════════════════════════════════════════════════ */
.vr-top-btn::before {
  content:     '[';
  color:       var(--hud-text-dim);
  font-weight: 400;
  font-size:   0.9rem;
  letter-spacing: 0;
  flex-shrink: 0;
}
.vr-top-btn::after {
  content:     ']';
  color:       var(--hud-text-dim);
  font-weight: 400;
  font-size:   0.9rem;
  letter-spacing: 0;
  flex-shrink: 0;
}
.vr-top-btn:hover {
  /* Left 3px accent bar via inset shadow — no layout shift */
  box-shadow: inset 3px 0 0 var(--hud-accent), 0 0 8px rgba(200, 224, 85, 0.2);
}

/* ── ENTER VR — slow attention pulse ───────────────────────── */
.vr-btn-vr {
  animation: vrHudPulse 2.8s ease-in-out infinite;
}
@keyframes vrHudPulse {
  0%,  100% { box-shadow: 0 0 3px rgba(200, 224, 85, 0.1); }
  50%        {
    box-shadow:   0 0 12px rgba(200, 224, 85, 0.4);
    border-color: var(--hud-accent);
  }
}

/* ── UNMUTE — amber warning pulse ──────────────────────────── */
.vr-unmute-btn {
  border-color: #6B5010;
  color:        #C89A18;
  animation:    unmuteFlash 2s ease-in-out infinite;
}
.vr-unmute-btn::before,
.vr-unmute-btn::after { color: #4A3A0A; }
@keyframes unmuteFlash {
  0%, 100% { opacity: 1;    border-color: #6B5010; }
  50%       { opacity: 0.55; border-color: #C89A18; }
}

/* ── Top-left / top-right containers ───────────────────────── */
.vr-top-left,
.vr-top-right {
  position:      absolute;
  top:           20px;
  z-index:       9999;
  display:       flex;
  gap:           10px;
  align-items:   center;
  pointer-events: auto;
}
.vr-top-left  { left:  20px; }
.vr-top-right { right: 20px; }

/* ════════════════════════════════════════════════════════════
   BOTTOM CONTROL WRAP + BAR
   ════════════════════════════════════════════════════════════ */
.vr-ctrl-wrap {
  position:       absolute;
  bottom:         28px;
  left:           50%;
  transform:      translateX(-50%);
  z-index:        9999;
  display:        flex;
  flex-direction: column;
  align-items:    center;
  gap:            5px;
  pointer-events: auto;
}

/* "// PLAYBACK CONTROLS" label */
.vr-ctrl-label {
  font-family:    var(--hud-font);
  font-size:      9px;
  color:          var(--hud-text-dim);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  pointer-events: none;
  user-select:    none;
}

/* Bar container */
.vr-ctrl-bar {
  display:              flex;
  align-items:          stretch;
  background:           rgba(10, 12, 10, 0.82);
  border:               1px solid var(--hud-border);
  border-radius:        3px;
  backdrop-filter:      blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow:
    0 4px 28px rgba(0, 0, 0, 0.7),
    0 0 1px rgba(200, 224, 85, 0.06);
  position:   relative;
  overflow:   hidden;
}

/* 2px top accent line */
.vr-ctrl-bar::before {
  content:    '';
  position:   absolute;
  top: 0; left: 0; right: 0;
  height:     2px;
  background: var(--hud-accent);
  pointer-events: none;
  z-index:    10;
}

/* Scanline texture overlay */
.vr-ctrl-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(0, 0, 0, 0.04) 3px,
    rgba(0, 0, 0, 0.04) 4px
  );
  pointer-events: none;
  z-index: 11;
}

/* ── Buttons inside the bar — strip inherited border/radius ─── */
.vr-ctrl-bar .vr-ctrl-btn {
  border:               none;
  border-radius:        0;
  background:           transparent;
  backdrop-filter:      none;
  -webkit-backdrop-filter: none;
  padding:              11px 24px;
  position:             relative;
  z-index:              12;
}
.vr-ctrl-bar .vr-ctrl-btn:hover {
  background:   rgba(200, 224, 85, 0.07);
  border-color: transparent;
  box-shadow:   none;
}
.vr-ctrl-bar .vr-ctrl-btn:active {
  background: rgba(200, 224, 85, 0.14);
  transform:  scale(0.97);
}

/* ── PAUSE button — dividers + state colors ─────────────────── */
.vr-ctrl-bar .vr-pause-btn {
  border-left:   1px solid var(--hud-border) !important;
  border-right:  1px solid var(--hud-border) !important;
  border-top:    none !important;
  border-bottom: none !important;
  min-width:     100px;
  justify-content: center;
  color:         var(--hud-accent);
  /* Smooth fade-back transition when resuming */
  transition:
    border-left-color  0.55s ease,
    border-right-color 0.55s ease,
    background         0.15s ease,
    color              0.2s  ease;
}

/* PAUSED state — danger dividers, instant switch, icon pulse */
.vr-ctrl-bar .vr-pause-btn--paused {
  border-left-color:  var(--hud-danger) !important;
  border-right-color: var(--hud-danger) !important;
  color:              var(--hud-accent);
  /* Instant switch to danger (overrides the 0.55s transition) */
  transition:
    border-left-color  0s,
    border-right-color 0s,
    background         0.15s ease,
    color              0.2s  ease;
  animation: pauseIconPulse 1.4s ease-in-out infinite;
}
/* When un-paused, the 0.55s transition on the non-paused rule
   smoothly fades the border back from danger → hud-border      */

@keyframes pauseIconPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.65; }
}

/* ════════════════════════════════════════════════════════════
   BOTTOM-RIGHT COMPACT FULLSCREEN ICON
   ════════════════════════════════════════════════════════════ */
.vr-fs-corner-btn {
  position:        absolute;
  bottom:          20px;
  right:           20px;
  z-index:         9999;
  width:           42px;
  height:          42px;
  padding:         0;
  font-size:       1.05rem;
  justify-content: center;
  pointer-events:  auto;
}
/* No brackets on this icon-only button */
.vr-fs-corner-btn::before,
.vr-fs-corner-btn::after { content: none; }

/* ════════════════════════════════════════════════════════════
   LOADING OVERLAY
   ════════════════════════════════════════════════════════════ */
.vr-loading-overlay {
  position:        absolute;
  inset:           0;
  z-index:         100;
  display:         flex;
  flex-direction:  column;
  align-items:     center;
  justify-content: center;
  background:      #060806;
  gap:             16px;
  pointer-events:  none;
}

.vr-spinner {
  width:        44px;
  height:       44px;
  border:       2px solid rgba(184, 212, 74, 0.1);
  border-top-color: var(--hud-accent);
  border-radius: 50%;
  animation:    spin 0.9s linear infinite;
}

.vr-loading-text {
  color:          var(--hud-text-dim);
  font-size:      0.78rem;
  font-family:    var(--hud-font);
  letter-spacing: 0.16em;
  margin:         0;
}

/* ════════════════════════════════════════════════════════════
   ERROR OVERLAY
   ════════════════════════════════════════════════════════════ */
.vr-error-overlay {
  position:        absolute;
  inset:           0;
  z-index:         100;
  display:         flex;
  flex-direction:  column;
  align-items:     center;
  justify-content: center;
  background:      #060806;
  gap:             18px;
}
.vr-error-icon {
  font-size:  2.4rem;
  color:      var(--hud-danger);
  line-height: 1;
}
.vr-error-text {
  color:          #FF8888;
  font-size:      0.78rem;
  font-family:    var(--hud-font);
  letter-spacing: 0.1em;
  text-align:     center;
  max-width:      340px;
  margin:         0;
}

/* ════════════════════════════════════════════════════════════
   KEYFRAMES
   ════════════════════════════════════════════════════════════ */
@keyframes spin { to { transform: rotate(360deg); } }

/* ════════════════════════════════════════════════════════════
   A-FRAME FIXES + HIDE INJECTED UI
   ════════════════════════════════════════════════════════════ */
a-scene[embedded] canvas { width: 100% !important; height: 100% !important; }

.a-enter-vr,
.a-enter-ar,
.a-enter-vr-button,
.a-enter-ar-button,
[data-aframe-vr-mode-ui],
[data-aframe-default-vr-ui],
.a-orientation-modal { display: none !important; }
`;
