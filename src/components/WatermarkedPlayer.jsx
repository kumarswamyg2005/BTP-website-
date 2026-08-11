import React, { useRef, useEffect, useCallback, useState } from 'react';
import { drawWatermark } from '../utils/watermark.js';
import { initEMEProtection, subscribeCaptureProtection } from '../utils/contentProtection.js';

/**
 * WatermarkedPlayer
 *
 * Wraps a <video> element with:
 *   1. EME Hardware Video Pipeline setup for Meta Quest & Chromium browsers
 *      (triggers hardware overlay screenshot blackout).
 *   2. Real-time screen capture, screenshot shortcut, and window blur blackout shield.
 *   3. Dynamic visual watermark overlay stamps.
 *
 * Props:
 *   src      {string}  — video blob URL or stream URL
 *   userId   {string}  — must come from auth context, never a URL param
 *   videoRef {ref}     — forwarded so parent can call .play()/.pause()
 *   ...rest            — all other props forwarded to <video>
 */
export default function WatermarkedPlayer({ src, userId, videoRef: externalRef, ...videoProps }) {
  const internalRef  = useRef(null);
  const videoRef     = externalRef || internalRef;
  const overlayRef   = useRef(null); // visual watermark canvas (pointer-events:none)
  const wmarkTimer   = useRef(null); // visual redraw interval
  const containerRef = useRef(null);

  // ── 1. EME Hardware Init ───────────────────────────────────────
  // Re-runs when src changes (new video = new EME check)
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      initEMEProtection(video).catch(() => {});
    }
  }, [src]);

  // ── 2. Screen-Capture Protection Subscription ───────────────────────
  // Subscribed once on mount — not dependent on src
  const [isBlackout, setIsBlackout] = useState(false);
  useEffect(() => {
    const unsubscribe = subscribeCaptureProtection((blackoutState) => {
      setIsBlackout(blackoutState);
    });
    return () => unsubscribe();
  }, []);

  // ── 3. Resize canvas to match container ────────────────────────────────
  const syncCanvasSize = useCallback(() => {
    const container = containerRef.current;
    const canvas    = overlayRef.current;
    if (!container || !canvas) return;
    const { clientWidth: w, clientHeight: h } = container;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width  = w;
      canvas.height = h;
    }
  }, []);

  // ── 4. Redraw visual watermark ─────────────────────────────────────────
  const redraw = useCallback(() => {
    syncCanvasSize();
    if (overlayRef.current && userId) {
      drawWatermark(overlayRef.current, userId);
    }
  }, [userId, syncCanvasSize]);

  // ── Fullscreen resize ─────────────────────────────────────────────────
  useEffect(() => {
    function onFullscreenChange() {
      setTimeout(redraw, 50);
    }
    document.addEventListener('fullscreenchange',       onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange',       onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, [redraw]);

  // ── Window resize ─────────────────────────────────────────────────────
  useEffect(() => {
    const ro = new ResizeObserver(() => redraw());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  // ── Main watermark effect ─────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !src) return;
    redraw();

    function scheduleNext() {
      const delay = 8000 + Math.random() * 4000;
      wmarkTimer.current = setTimeout(() => {
        redraw();
        scheduleNext();
      }, delay);
    }
    scheduleNext();

    return () => {
      clearTimeout(wmarkTimer.current);
    };
  }, [src, userId, redraw]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onContextMenu={e => e.preventDefault()}
      onDragStart={e => e.preventDefault()}
    >
      <video
        ref={videoRef}
        src={src}
        {...videoProps}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'contain',
          background: '#000',
          zIndex: 10,
          opacity: isBlackout ? 0 : 1,
          visibility: isBlackout ? 'hidden' : 'visible',
          ...(videoProps.style || {}),
        }}
      />

      {/* Visual watermark overlay */}
      <canvas
        ref={overlayRef}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      />

      {/* ── Screen Capture & Blur Anti-Recording Blackout Overlay ── */}
      {isBlackout && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 99,
            background: '#040504',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 24,
            textAlign: 'center',
            border: '1px solid rgba(255, 68, 68, 0.4)',
          }}
        >
          <span style={{ fontSize: '2.4rem' }}>🔒</span>
          <p
            style={{
              color: '#ff6b6b',
              fontSize: '0.88rem',
              fontWeight: 700,
              fontFamily: 'var(--mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            PROTECTED MEDIA — SCREEN CAPTURE BLOCKED
          </p>
          <span
            style={{
              color: '#a0aec0',
              fontSize: '0.75rem',
              fontFamily: 'var(--mono)',
              maxWidth: 380,
            }}
          >
            Video playback is hidden while system screenshots, screen recorders, or menu overlays are active.
          </span>
        </div>
      )}
    </div>
  );
}
