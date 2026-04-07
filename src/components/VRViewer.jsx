import React, { useEffect, useRef, useState } from 'react';
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
  which hides our HTML controls (they're not inside the canvas).
  We disable A-Frame's VR mode UI and add our own fullscreen
  button that makes the outer wrapper div fullscreen — controls
  live inside that div and stay visible at all times.

  Controls are NEVER hidden — even during a real XR headset
  session they remain visible on the monitor for the operator.
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

    // Resume playback if it was paused when entering VR/fullscreen
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

  function handleEnterVR() {
    sceneRef.current?.enterVR();
  }

  const content = (
    <div
      ref={outerRef}
      style={{
        position: 'fixed', inset: 0,
        zIndex: 99999,
        background: '#000',
        width: '100%', height: '100%',
      }}
    >
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

      {/* A-Frame scene — sits at the base, z-index 1 */}
      <a-scene
        ref={sceneRef}
        embedded
        vr-mode-ui="enabled: false"
        loading-screen="enabled: false"
        background="color: #080808"
        renderer="colorManagement: true; antialias: true; physicallyCorrectLights: true"
        device-orientation-permission-ui="enabled: false"
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          zIndex: 1,
        }}
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

      {/* Loading overlay — z-index 100 */}
      {loading && !error && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#080808', gap: 16,
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 48, height: 48,
            border: '2px solid rgba(200,255,0,0.15)',
            borderTopColor: '#c8ff00',
            borderRadius: '50%',
            animation: 'spin 0.9s linear infinite',
          }} />
          <p style={{ color: '#efefef', fontSize: '0.88rem', fontFamily: 'IBM Plex Mono,monospace', letterSpacing: '0.05em' }}>
            LOADING 360° VIEW…
          </p>
        </div>
      )}

      {/* Error overlay — z-index 100 */}
      {error && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#080808', gap: 16,
        }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <p style={{ color: '#fca5a5', fontSize: '0.9rem', fontFamily: 'IBM Plex Mono,monospace', textAlign: 'center', maxWidth: 340 }}>
            Could not load video. Check the file exists and is a valid format.
          </p>
          <button onClick={handleClose} style={exitBtnStyle}>← Back</button>
        </div>
      )}

      {/* ── Controls — always visible, z-index 9999 ───────────── */}

      {/* Top-left: back + unmute */}
      <div style={{
        position: 'absolute', top: 20, left: 20,
        zIndex: 9999,
        display: 'flex', gap: 10, alignItems: 'center',
        pointerEvents: 'auto',
      }}>
        <button onClick={handleClose} style={exitBtnStyle}>← Back</button>

        {muted && !loading && !error && (
          <button onClick={handleUnmute} style={{
            ...exitBtnStyle,
            background: 'rgba(251,191,36,0.15)',
            border: '1px solid #fbbf24',
            color: '#fbbf24',
            animation: 'vrPulse 2s ease-in-out infinite',
          }}>
            🔇 Tap to Unmute
          </button>
        )}
      </div>

      {/* Top-right: enter VR + fullscreen toggle */}
      {!loading && !error && (
        <div style={{
          position: 'absolute', top: 20, right: 20,
          zIndex: 9999,
          display: 'flex', gap: 10, alignItems: 'center',
          pointerEvents: 'auto',
        }}>
          <button onClick={handleEnterVR} style={exitBtnStyle} title="Start WebXR headset session">
            🥽 Enter VR
          </button>
          <button onClick={handleFullscreenToggle} style={exitBtnStyle}>
            {isFullscreen ? '⊠ Exit Fullscreen' : '⛶ Fullscreen'}
          </button>
        </div>
      )}

      {/* Bottom-center: rewind / pause / skip */}
      {!loading && !error && (
        <div style={{
          position: 'absolute',
          bottom: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex', gap: 10, alignItems: 'center',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '10px 22px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.6)',
          pointerEvents: 'auto',
          whiteSpace: 'nowrap',
        }}>
          <button onClick={() => handleSkip(-10)} style={ctrlBtnStyle}>
            ⏪ −10s
          </button>

          <button
            onClick={handlePauseToggle}
            style={{
              ...ctrlBtnStyle,
              background: paused ? 'rgba(200,255,0,0.22)' : 'rgba(200,255,0,0.08)',
              border: '1px solid rgba(200,255,0,0.6)',
              color: '#c8ff00',
              minWidth: 90,
            }}
          >
            {paused ? '▶ Play' : '⏸ Pause'}
          </button>

          <button onClick={() => handleSkip(10)} style={ctrlBtnStyle}>
            +10s ⏩
          </button>
        </div>
      )}

      <style>{`
        @keyframes vrPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes spin     { to { transform: rotate(360deg); } }
        a-scene[embedded] canvas { width:100%!important; height:100%!important; }
        /* Hide all A-Frame injected UI buttons */
        .a-enter-vr,
        .a-enter-ar,
        .a-enter-vr-button,
        .a-enter-ar-button,
        [data-aframe-vr-mode-ui],
        [data-aframe-default-vr-ui],
        .a-orientation-modal { display: none !important; }
      `}</style>
    </div>
  );

  return ReactDOM.createPortal(content, VR_PORTAL_ROOT);
}

const exitBtnStyle = {
  background: 'rgba(200,255,0,0.1)',
  border: '1px solid rgba(200,255,0,0.4)',
  color: '#c8ff00',
  fontFamily: 'IBM Plex Mono,monospace',
  fontWeight: 700,
  padding: '9px 20px',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.78rem',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  minHeight: 40,
  whiteSpace: 'nowrap',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};

const ctrlBtnStyle = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.2)',
  color: '#e2e8f0',
  fontFamily: 'IBM Plex Mono,monospace',
  fontWeight: 700,
  padding: '8px 16px',
  borderRadius: 5,
  cursor: 'pointer',
  fontSize: '0.76rem',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  minHeight: 38,
  whiteSpace: 'nowrap',
};
