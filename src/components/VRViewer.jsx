import React, { useEffect, useRef, useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';

/*
  VRViewer
  ─────────────────────────────────────────────────────────────
  Renders an A-Frame 360° scene over the full screen.
  Works on desktop (mouse look) and in any WebXR headset.

  Props:
    src     – URL of the equirectangular 360° video (blob: or /path)
    onClose – called when the user exits
*/
export default function VRViewer({ src, onClose }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const sceneRef  = useRef(null);
  const videoRef  = useRef(null);
  const closedRef = useRef(false);

  useEffect(() => {
    closedRef.current = false;
    const video = videoRef.current;
    const scene = sceneRef.current;
    if (!video || !scene) return;

    video.src  = src;
    video.loop = true;
    video.playsInline = true;

    function onCanPlay() {
      if (closedRef.current) return;
      setLoading(false);

      // Autoplay — try with sound, fall back to muted
      video.muted = false;
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
        toast('Video is muted — tap the scene to unmute.', 'info', 5000);
      });

      // Bind the video to the sphere now that it's ready
      const sphere = scene.querySelector('#vr-sphere');
      if (sphere) sphere.setAttribute('src', '#vr-video-asset');

      toast(
        '🥽 360° active! Look around with mouse / head. Click [⊙] bottom-right to enter headset.',
        'success', 9000
      );
    }

    function onError() {
      setLoading(false);
      setError(true);
      toast('Could not load video in VR viewer.', 'error');
    }

    function onEnterVR() {
      // Hide the exit button UI — it overlaps the headset lens
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
  }, [src]);

  function handleClose() {
    closedRef.current = true;
    const video = videoRef.current;
    const scene = sceneRef.current;

    try { if (scene?.is('vr-mode')) scene.exitVR(); } catch {}
    if (video) { video.pause(); video.src = ''; video.load(); }
    onClose();
  }

  // Unmute on scene click (autoplay policy workaround)
  function handleSceneClick() {
    const video = videoRef.current;
    if (video && video.muted) {
      video.muted = false;
      video.play().catch(() => {});
      toast('Audio enabled.', 'success', 2000);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      zIndex: 9000,
      background: '#000',
    }}>

      {/* ── Loading overlay ─────────────────────────────── */}
      {loading && !error && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 9100,
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
        </div>
      )}

      {/* ── Error overlay ────────────────────────────────── */}
      {error && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 9100,
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

      {/* ── Exit / info bar ──────────────────────────────── */}
      <div
        id="vr-exit-overlay"
        style={{
          position: 'fixed', top: 20, left: 20,
          zIndex: 9200,
          display: 'flex', gap: 12, alignItems: 'center',
          transition: 'opacity 0.4s ease',
        }}
      >
        <button onClick={handleClose} style={exitBtnStyle}>
          ✕ Exit VR
        </button>
        <div style={infoBoxStyle}>
          <span style={{ color: '#4f8ef7', fontSize: '1.2rem' }}>🥽</span>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 2, fontSize: '0.88rem' }}>
              Drag to look around &nbsp;·&nbsp; Click <strong style={{ color: '#4f8ef7' }}>[⊙]</strong> for headset mode
            </div>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
              Head tracking active in VR mode &nbsp;·&nbsp; Click scene to unmute
            </div>
          </div>
        </div>
      </div>

      {/* ── A-Frame scene ────────────────────────────────── */}
      <a-scene
        ref={sceneRef}
        embedded
        vr-mode-ui="enabled: true"
        loading-screen="enabled: false"
        background="color: #050811"
        renderer="colorManagement: true; antialias: true; physicallyCorrectLights: true"
        style={{ width: '100vw', height: '100vh' }}
        onClick={handleSceneClick}
      >
        <a-assets>
          {/* Single video asset — ref'd by useEffect, id matched by sphere setAttribute */}
          <video
            id="vr-video-asset"
            crossOrigin="anonymous"
            playsInline
            ref={videoRef}
          />
        </a-assets>

        {/* 360° equirectangular sphere */}
        <a-videosphere
          id="vr-sphere"
          rotation="0 -90 0"
          segments-height="72"
          segments-width="72"
          radius="100"
        />

        {/*
          Camera with look-controls.
          reverseMouseDrag: false = natural drag direction on desktop.
          touchEnabled: true     = works on phone/tablet/headset touchpad.
        */}
        <a-camera
          look-controls="enabled: true; reverseMouseDrag: false; touchEnabled: true; magicWindowTrackingEnabled: true"
          wasd-controls="enabled: false"
          position="0 0 0"
        >
          {/*
            Cursor — shows a dot reticle so VR controller users
            know where they're pointing. Fuse = gaze-based click after 1.5s.
          */}
          <a-cursor
            color="#4f8ef7"
            opacity="0.8"
            raycaster="objects: .clickable"
            fuse="false"
            animation__click="property: scale; startEvents: click; easing: easeInCubic; dur: 150; from: 0.1 0.1 0.1; to: 1 1 1"
          />
        </a-camera>

        {/* Instruction text — fades out after 6 seconds */}
        <a-entity
          position="0 0 -3"
          geometry="primitive: plane; width: 4; height: 0.7"
          material="color: #050811; transparent: true; opacity: 0.85; shader: flat"
          text="value: Look around to explore the 360° environment. Put on your headset and click [VR] for full immersion.; color: #4f8ef7; align: center; wrapCount: 48; width: 3.8"
          animation="property: components.material.material.opacity; to: 0; delay: 6000; dur: 1500; easing: easeOutQuad"
        />
      </a-scene>
    </div>
  );
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
