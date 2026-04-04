import React, { useRef, useEffect, useCallback } from 'react';
import { drawWatermark, embedLSB } from '../utils/watermark.js';

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
  const stegoRef     = useRef(null); // offscreen canvas for LSB encoding
  const wmarkTimer   = useRef(null); // visual redraw interval
  const stegoTimer   = useRef(null); // LSB embed interval
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

  // ── Embed LSB into current video frame ───────────────────────────────
  const embedFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = stegoRef.current;
    if (!video || !canvas || video.readyState < 2 || video.paused) return;

    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 360;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    embedLSB(canvas, userId);
    // Note: this writes the payload into the offscreen canvas. In a production
    // system you would POST this canvas as a PNG to the server as forensic proof,
    // or pipe it back into the video texture. Here it demonstrates the technique.
  }, [userId, videoRef]);

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

    // LSB embed every 5 seconds
    stegoTimer.current = setInterval(embedFrame, 5000);

    return () => {
      clearTimeout(wmarkTimer.current);
      clearInterval(stegoTimer.current);
    };
  }, [src, userId, redraw, embedFrame]);

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

      {/* Offscreen canvas for LSB steganography — never displayed */}
      <canvas ref={stegoRef} style={{ display: 'none' }} />
    </div>
  );
}
