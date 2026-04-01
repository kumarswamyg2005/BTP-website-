import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useToast } from '../context/ToastContext.jsx';

/*
  VRViewer — A-Frame 360° VR player
  ─────────────────────────────────────────────────────────────
  Renders via ReactDOM.createPortal to document.body so it is
  completely outside any framer-motion stacking context — this is
  why the navbar was bleeding through (z-index is scoped to the
  nearest stacking context ancestor; framer-motion creates one).

  Quest fixes:
  • Video starts muted — autoplay policy on Quest requires muted start
  • `src="#vr-video-asset"` set directly in JSX on the sphere
  • webkit-playsinline + playsInline on the video element
  • Unmute button so user can tap to enable audio
  • `embedded` kept so A-Frame canvas stays inside our full-screen
    portal wrapper (prevents canvas from fighting document layout)
*/
export default function VRViewer({ src, onClose }) {
  const toast = useToast();
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

    // src is already set via JSX attribute — just ensure flags are correct
    video.loop        = true;
    video.muted       = true;
    video.playsInline = true;

    function onCanPlay() {
      if (closedRef.current) return;
      setLoading(false);
      video.play().catch(() => {});

      // Force the sphere to re-bind the texture now that video is ready.
      // Needed because A-Frame may have processed <a-assets> before canplay fired.
      const sphere = scene.querySelector('#vr-sphere');
      if (sphere) {
        sphere.removeAttribute('src');
        sphere.setAttribute('src', '#vr-video-asset');
      }

      toast('🥽 360° active! Tap 🔊 to unmute. Click [⊙] bottom-right for headset.', 'success', 9000);
    }

    function onError() {
      setLoading(false);
      setError(true);
      toast('Could not load video in VR viewer.', 'error');
    }

    function onEnterVR() {
      const overlay = document.getElementById('vr-exit-overlay');
      if (overlay) overlay.style.opacity = '0';
      if (video.paused) video.play().catch(() => {});
    }

    function onExitVR() {
      const overlay = document.getElementById('vr-exit-overlay');
      if (overlay) overlay.style.opacity = '1';
    }

    scene.addEventListener('enter-vr', onEnterVR);
    scene.addEventListener('exit-vr',  onExitVR);
    video.addEventListener('canplay',  onCanPlay, { once: true });
    video.addEventListener('error',    onError,   { once: true });
    video.load();

    return () => {
      closedRef.current = true;
      scene.removeEventListener('enter-vr', onEnterVR);
      scene.removeEventListener('exit-vr',  onExitVR);
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
    if (!video) return;
    if (video.muted) {
      video.muted = false;
      setMuted(false);
      video.play().catch(() => {});
      toast('🔊 Audio enabled.', 'success', 2000);
    }
  }

  const content = (
    <div style={{
      position: 'fixed', inset: 0,
      zIndex: 99999,          /* above navbar (500), modals (800), toasts (9999) */
      background: '#000',
    }}>

      {/* Loading overlay */}
      {loading && !error && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
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
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#050811', gap: 16,
        }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <p style={{ color: '#fca5a5', fontSize: '0.95rem', fontFamily: 'Inter,sans-serif', textAlign: 'center', maxWidth: 340 }}>
            Could not load video. Make sure the file exists and is a valid video format.
          </p>
          <button onClick={handleClose} style={exitBtnStyle}>← Back</button>
        </div>
      )}

      {/* Exit / unmute bar — z-index 3 so it floats above the a-scene canvas */}
      <div
        id="vr-exit-overlay"
        style={{
          position: 'absolute', top: 20, left: 20,
          zIndex: 3,
          display: 'flex', gap: 12, alignItems: 'center',
          transition: 'opacity 0.4s ease',
        }}
      >
        <button onClick={handleClose} style={exitBtnStyle}>
          ✕ Exit VR
        </button>

        {muted && (
          <button
            onClick={handleUnmute}
            style={{
              ...exitBtnStyle,
              background: 'rgba(251,191,36,0.15)',
              border: '1px solid #fbbf24',
              color: '#fbbf24',
              animation: 'vrPulse 2s ease-in-out infinite',
            }}
          >
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

      {/* ── A-Frame scene ────────────────────────────────────────────────
           `embedded` keeps the canvas inside this portal div.
           Without it A-Frame fights document.body layout and leaves black bars.
           The portal itself is fixed + inset:0 so it covers the full screen.
      ─────────────────────────────────────────────────────────────────── */}
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
        <a-assets timeout="30000">
          <video
            id="vr-video-asset"
            ref={videoRef}
            src={src}
            playsInline
            webkit-playsinline=""
            preload="auto"
            muted
            loop
          />
        </a-assets>

        <a-videosphere
          id="vr-sphere"
          src="#vr-video-asset"
          rotation="0 -90 0"
          segments-height="72"
          segments-width="72"
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
          text="value: Look around to explore the 360° environment. Put on your headset and click [VR] for full immersion.; color: #4f8ef7; align: center; wrapCount: 48; width: 3.8"
          animation="property: components.material.material.opacity; to: 0; delay: 6000; dur: 1500; easing: easeOutQuad"
        />
      </a-scene>

      <style>{`
        @keyframes vrPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        /* Force the a-scene canvas to fill its parent */
        #vr-video-asset ~ canvas,
        a-scene[embedded] canvas {
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
    </div>
  );

  // Portal renders directly to document.body, bypassing all stacking contexts
  return ReactDOM.createPortal(content, document.body);
}

/* ── Shared inline styles ─────────────────────────────────── */
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
