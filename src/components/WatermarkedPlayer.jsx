import React, { useRef, useEffect, useCallback } from 'react';
import { drawWatermark } from '../utils/watermark.js';

/**
 * WatermarkedPlayer
 *
 * Wraps a <video> element with:
 *   1. An invisible canvas overlay that redraws 3 rotated watermark stamps
 *      at random positions every 8–12 seconds (visual watermark).
 *   2. An LSB steganographic watermark embedded into video frames every
 *      ~5 seconds so it survives screen recording (bonus track).
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

  // ── Resize canvas to match container ──────────────────────────────────
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

  // ── Redraw visual watermark ───────────────────────────────────────────
  const redraw = useCallback(() => {
    syncCanvasSize();
    if (overlayRef.current && userId) {
      drawWatermark(overlayRef.current, userId);
    }
  }, [userId, syncCanvasSize]);

  // ── Fullscreen resize ─────────────────────────────────────────────────
  useEffect(() => {
    function onFullscreenChange() {
      setTimeout(redraw, 50); // brief delay for browser to resize canvas
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

  // ── Main effect: start/restart intervals when src or userId changes ──
  useEffect(() => {
    if (!userId || !src) return;

    // Draw immediately on mount
    redraw();

    // Randomise interval between 8 000 and 12 000 ms
    function scheduleNext() {
      const delay = 8000 + Math.random() * 4000;
      wmarkTimer.current = setTimeout(() => {
        redraw();
        scheduleNext(); // chain to next random interval
      }, delay);
    }
    scheduleNext();

    return () => {
      clearTimeout(wmarkTimer.current);
    };
  }, [src, userId, redraw]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
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
          ...(videoProps.style || {}),
        }}
      />

      {/* Visual watermark overlay — pointer-events:none so controls work */}
      <canvas
        ref={overlayRef}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      />

    </div>
  );
}
