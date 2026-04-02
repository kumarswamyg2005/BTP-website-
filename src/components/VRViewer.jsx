import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useToast } from '../context/ToastContext.jsx';

/*
  VRViewer — A-Frame 360° VR player
  ────────────────────────────────────────────────────────────
  Root cause of black screen: A-Frame's <a-assets> system marks
  the video "loaded" before canplay fires, so the sphere gets an
  empty texture. Fix: remove <a-assets> entirely and apply the
  texture directly via THREE.VideoTexture after BOTH the scene
  and the video are ready. This is guaranteed to work regardless
  of load order.

  Portal: renders to document.body to escape framer-motion
  stacking contexts (prevents navbar from bleeding through).
*/
export default function VRViewer({ src, onClose }) {
  const toast     = useToast();
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [muted,   setMuted]   = useState(true);

  const sceneRef  = useRef(null);
  const videoRef  = useRef(null);
  const closedRef = useRef(false);

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

    // Called when BOTH are ready — applies THREE.VideoTexture directly
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
        const tex   = new THREE.VideoTexture(video);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.format    = THREE.RGBAFormat;

        mesh.material.map          = tex;
        mesh.material.needsUpdate  = true;
        mesh.material.side         = THREE.BackSide; // view from inside sphere
      }

      // Sphere mesh may not exist yet if scene just loaded
      if (sphere.getObject3D('mesh')) {
        bindTex();
      } else {
        sphere.addEventListener('object3dset', bindTex, { once: true });
      }

      toast('🥽 360° active! Tap 🔊 to unmute. Click [⊙] for headset mode.', 'success', 9000);
    }

    function onSceneLoaded() { sceneReady = true; applyTexture(); }
    function onCanPlay()     { videoReady = true; applyTexture(); }

    function onVideoError() {
      setLoading(false);
      setError(true);
      toast('Could not load video in VR viewer.', 'error');
    }

    function onEnterVR() {
      const ov = document.getElementById('vr-exit-overlay');
      if (ov) ov.style.opacity = '0';
      if (video.paused) video.play().catch(() => {});
    }
    function onExitVR() {
      const ov = document.getElementById('vr-exit-overlay');
      if (ov) ov.style.opacity = '1';
    }

    // Scene may already be loaded if A-Frame initialized synchronously
    if (scene.hasLoaded) {
      sceneReady = true;
    } else {
      scene.addEventListener('loaded', onSceneLoaded, { once: true });
    }

    scene.addEventListener('enter-vr', onEnterVR);
    scene.addEventListener('exit-vr',  onExitVR);
    video.addEventListener('canplay',  onCanPlay, { once: true });
    video.addEventListener('error',    onVideoError, { once: true });
    video.load();

    return () => {
      closedRef.current = true;
      scene.removeEventListener('loaded',    onSceneLoaded);
      scene.removeEventListener('enter-vr',  onEnterVR);
      scene.removeEventListener('exit-vr',   onExitVR);
    };
  }, [src, toast]);

  function handleClose() {
    closedRef.current = true;
    const video = videoRef.current;
    const scene = sceneRef.current;
    try { if (scene?.is('vr-mode')) scene.exitVR(); } catch {}
    if (video) { video.pause(); video.src = ''; video.load(); }
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

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#000' }}>

      {/* Hidden video element — outside A-Frame so we control it directly */}
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
          background: '#050811', gap: 20,
        }}>
          <div style={{
            width: 56, height: 56,
            border: '3px solid rgba(79,142,247,0.2)',
            borderTopColor: '#4f8ef7',
            borderRadius: '50%',
            animation: 'spin 0.9s linear infinite',
          }} />
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', fontFamily: 'Inter,sans-serif' }}>
            Loading 360° video…
          </p>
          <p style={{ color: '#475569', fontSize: '0.8rem', fontFamily: 'Inter,sans-serif' }}>
            On Meta Quest — open this URL in your Quest browser for full VR
          </p>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#050811', gap: 16,
        }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <p style={{ color: '#fca5a5', fontSize: '0.95rem', fontFamily: 'Inter,sans-serif', textAlign: 'center', maxWidth: 340 }}>
            Could not load video. Check the file exists and is a valid format.
          </p>
          <button onClick={handleClose} style={exitBtnStyle}>← Back</button>
        </div>
      )}

      {/* Exit / unmute bar — always above scene (zIndex 4) */}
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
            background: 'rgba(251,191,36,0.15)',
            border: '1px solid #fbbf24',
            color: '#fbbf24',
            animation: 'vrPulse 2s ease-in-out infinite',
          }}>
            🔇 Tap to Unmute
          </button>
        )}

        <div style={infoBoxStyle}>
          <span style={{ color: '#4f8ef7', fontSize: '1.2rem' }}>🥽</span>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 2, fontSize: '0.88rem' }}>
              Drag to look around &nbsp;·&nbsp; Click <strong style={{ color: '#4f8ef7' }}>[⊙]</strong> for headset mode
            </div>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
              Head tracking active in VR mode &nbsp;·&nbsp; Tap scene to unmute audio
            </div>
          </div>
        </div>
      </div>

      {/*
        A-Frame scene — embedded so canvas stays inside this fixed portal div.
        No <a-assets> — texture is applied via THREE.VideoTexture directly.
        a-videosphere starts with no src; texture is bound in useEffect.
      */}
      <a-scene
        ref={sceneRef}
        embedded
        vr-mode-ui="enabled: true"
        loading-screen="enabled: false"
        background="color: #050811"
        renderer="colorManagement: true; antialias: true; physicallyCorrectLights: true"
        device-orientation-permission-ui="enabled: false"
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        onClick={handleUnmute}
      >
        {/* No src here — texture applied via THREE.VideoTexture in useEffect */}
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
        >
          <a-cursor
            color="#4f8ef7"
            opacity="0.8"
            raycaster="objects: .clickable"
            fuse="false"
            animation__click="property: scale; startEvents: click; easing: easeInCubic; dur: 150; from: 0.1 0.1 0.1; to: 1 1 1"
          />
        </a-camera>

        <a-entity
          position="0 0 -3"
          geometry="primitive: plane; width: 4; height: 0.7"
          material="color: #050811; transparent: true; opacity: 0.85; shader: flat"
          text="value: Look around to explore the 360° environment. Click [VR] to enter headset mode.; color: #4f8ef7; align: center; wrapCount: 48; width: 3.8"
          animation="property: components.material.material.opacity; to: 0; delay: 6000; dur: 1500; easing: easeOutQuad"
        />
      </a-scene>

      <style>{`
        @keyframes vrPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        a-scene[embedded] canvas {
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}

const exitBtnStyle = {
  background: 'rgba(79,142,247,0.15)',
  border: '1px solid #4f8ef7',
  color: '#4f8ef7',
  fontFamily: 'Inter,sans-serif',
  fontWeight: 700,
  padding: '10px 22px',
  borderRadius: 9,
  cursor: 'pointer',
  fontSize: '0.95rem',
  minHeight: 44,
};

const infoBoxStyle = {
  background: 'rgba(5,8,17,0.88)',
  border: '1px solid rgba(79,142,247,0.25)',
  color: '#94a3b8',
  fontFamily: 'Inter,sans-serif',
  padding: '10px 16px',
  borderRadius: 9,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};
