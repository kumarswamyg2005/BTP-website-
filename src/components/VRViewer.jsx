import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useToast } from '../context/ToastContext.jsx';

/*
  VRViewer — A-Frame 360° VR player

  Portal strategy (React 18 StrictMode-safe):
  ─────────────────────────────────────────────
  - Portal div is created via useState initializer (once per instance).
  - It is appended to body inside useEffect, and removed on cleanup.
  - StrictMode runs effects twice: first cleanup removes it, second run
    re-appends the SAME div instance → portal renders correctly both times.
  - On close: a-scene is manually detached before onClose() so React's
    reconciler never encounters A-Frame-owned nodes during unmount.
*/
export default function VRViewer({ src, onClose }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [muted,   setMuted]   = useState(true);
  const [attached, setAttached] = useState(false);

  // Same div instance across all renders — created once in useState initializer
  const [portalRoot] = useState(() => {
    const el = document.createElement('div');
    el.id = 'vr-portal-root';
    return el;
  });

  const sceneRef  = useRef(null);
  const videoRef  = useRef(null);
  const closedRef = useRef(false);

  // Attach / detach portal root in effect so StrictMode re-attaches properly
  useEffect(() => {
    document.body.appendChild(portalRoot);
    setAttached(true);
    return () => {
      setAttached(false);
      // Defer removal so React finishes unmounting the portal first
      setTimeout(() => {
        try { if (portalRoot.parentNode) portalRoot.parentNode.removeChild(portalRoot); } catch {}
      }, 100);
    };
  }, [portalRoot]);

  // A-Frame / video setup
  useEffect(() => {
    if (!attached) return;
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

      toast('🥽 360° active! Tap 🔊 to unmute.', 'success', 6000);
    }

    function onSceneLoaded() { sceneReady = true; applyTexture(); }
    function onCanPlay()     { videoReady = true; applyTexture(); }
    function onVideoError()  { setLoading(false); setError(true); }

    function onEnterVR() {
      const ov = document.getElementById('vr-exit-overlay');
      if (ov) ov.style.opacity = '0';
      if (video.paused) video.play().catch(() => {});
    }
    function onExitVR() {
      const ov = document.getElementById('vr-exit-overlay');
      if (ov) ov.style.opacity = '1';
    }

    if (scene.hasLoaded) {
      sceneReady = true;
    } else {
      scene.addEventListener('loaded', onSceneLoaded, { once: true });
    }
    scene.addEventListener('enter-vr', onEnterVR);
    scene.addEventListener('exit-vr',  onExitVR);
    video.addEventListener('canplay',  onCanPlay,     { once: true });
    video.addEventListener('error',    onVideoError,  { once: true });
    video.load();

    return () => {
      closedRef.current = true;
      scene.removeEventListener('loaded',   onSceneLoaded);
      scene.removeEventListener('enter-vr', onEnterVR);
      scene.removeEventListener('exit-vr',  onExitVR);
    };
  }, [src, toast, attached]);

  function handleClose() {
    closedRef.current = true;
    const video = videoRef.current;
    const scene = sceneRef.current;

    if (video) { video.pause(); video.src = ''; video.load(); }
    try { if (scene?.is('vr-mode')) scene.exitVR(); } catch {}

    // Detach a-scene from portal root before React unmounts —
    // prevents "removeChild: not a child" from A-Frame-injected nodes
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

  if (!attached) return null;

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#000' }}>

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

      {/* Loading overlay */}
      {loading && !error && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#080808', gap: 16,
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

      {/* Error overlay */}
      {error && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
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

      {/* Exit / unmute bar */}
      <div
        id="vr-exit-overlay"
        style={{
          position: 'absolute', top: 20, left: 20, zIndex: 4,
          display: 'flex', gap: 12, alignItems: 'center',
          transition: 'opacity 0.4s ease',
        }}
      >
        <button onClick={handleClose} style={exitBtnStyle}>✕ Exit VR</button>

        {muted && (
          <button onClick={handleUnmute} style={{
            ...exitBtnStyle,
            background: 'rgba(251,191,36,0.12)',
            border: '1px solid #fbbf24',
            color: '#fbbf24',
            animation: 'vrPulse 2s ease-in-out infinite',
          }}>
            🔇 Tap to Unmute
          </button>
        )}

        <div style={infoBoxStyle}>
          <span style={{ fontSize: '1.1rem' }}>🥽</span>
          <div>
            <div style={{ color: '#efefef', fontWeight: 700, marginBottom: 2, fontSize: '0.85rem', fontFamily: 'IBM Plex Mono,monospace' }}>
              Drag to look around &nbsp;·&nbsp; Click <strong style={{ color: '#c8ff00' }}>[⊙]</strong> for headset mode
            </div>
            <div style={{ fontSize: '0.74rem', color: '#666', fontFamily: 'IBM Plex Mono,monospace' }}>
              Head tracking active in VR mode
            </div>
          </div>
        </div>
      </div>

      <a-scene
        ref={sceneRef}
        embedded
        vr-mode-ui="enabled: true"
        loading-screen="enabled: false"
        background="color: #080808"
        renderer="colorManagement: true; antialias: true; physicallyCorrectLights: true"
        device-orientation-permission-ui="enabled: false"
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
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

      <style>{`
        @keyframes vrPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        a-scene[embedded] canvas { width:100%!important; height:100%!important; }
      `}</style>
    </div>
  );

  return ReactDOM.createPortal(content, portalRoot);
}

const exitBtnStyle = {
  background: 'rgba(200,255,0,0.1)',
  border: '1px solid rgba(200,255,0,0.4)',
  color: '#c8ff00',
  fontFamily: 'IBM Plex Mono,monospace',
  fontWeight: 700,
  padding: '9px 20px',
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: '0.78rem',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  minHeight: 40,
};

const infoBoxStyle = {
  background: 'rgba(8,8,8,0.85)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#9a9a9a',
  fontFamily: 'IBM Plex Mono,monospace',
  padding: '9px 14px',
  borderRadius: 3,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};
