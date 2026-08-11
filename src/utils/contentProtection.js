/**
 * Unity Stream — DRM & Screen Capture Protection Utilities
 *
 * Provides the maximum protection achievable in a browser without
 * a dedicated DRM license server (Widevine / PlayReady / FairPlay).
 *
 * Protection layers implemented:
 *   1. Browser getDisplayMedia stream detection (persistent blackout for
 *      the full duration of active screen recording via track monitoring)
 *   2. Screenshot keyboard shortcuts (Mac Cmd+Shift+3/4/5/S, Win PrtScn/Win+Shift+S)
 *   3. Window focus/blur during modifier key presses
 *   4. Tab visibility changes (document.hidden — works on mobile, laptop, VR)
 *   5. WebXR XRSession.visibilityState (Meta Quest headset menu overlay)
 *   6. Page hide events (background tab / phone home button)
 *
 * What CANNOT be stopped without hardware DRM:
 *   — OS-level tools: OBS, QuickTime, macOS screencapture, Android MediaProjection
 *   — These operate at GPU compositor level below the browser sandbox
 */

// ── 1. EME (Encrypted Media Extensions) Hardware Check ──────────────────────

/**
 * Checks for EME (Encrypted Media Extensions) hardware access support.
 * Only queries capability — does NOT attach MediaKeys to avoid black video bug.
 *
 * @param {HTMLVideoElement} videoEl
 * @returns {Promise<boolean>}
 */
export async function initEMEProtection(videoEl) {
  if (!videoEl || typeof navigator === 'undefined' || !navigator.requestMediaKeySystemAccess) {
    return false;
  }

  const keySystems = ['com.widevine.alpha', 'org.w3.clearkey'];
  const config = [{
    initDataTypes: ['cenc', 'keyids'],
    videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"' }],
  }];

  for (const system of keySystems) {
    try {
      const access = await navigator.requestMediaKeySystemAccess(system, config);
      if (access) return true;
    } catch {
      // Continue to next system
    }
  }

  return false;
}

// ── 2. Unified Capture Protection State Machine ──────────────────────────────

/**
 * Subscribes to ALL available screen capture signals:
 *   - Browser getDisplayMedia stream detection (from index.html early script)
 *   - Screenshot keyboard shortcuts
 *   - Window focus/blur during modifier presses
 *   - Tab/page visibility changes
 *   - WebXR XRSession visibility (call registerXRSession() separately)
 *
 * Blackout is PERSISTENT for the full duration of an active display media stream.
 * For screenshot shortcuts, blackout holds for 3.5 seconds then auto-releases.
 *
 * @param {function(boolean): void} onProtectionChange
 * @returns {function(): void} unsubscribe function
 */
export function subscribeCaptureProtection(onProtectionChange) {
  if (typeof window === 'undefined') return () => {};

  // Separate tracking for stream-based vs shortcut-based blackout
  // Both can be true simultaneously; blackout is active if either is true
  let streamBlackout = false;   // true while getDisplayMedia stream is active
  let shortcutBlackout = false; // true for ~3.5s after screenshot key combo
  let visibilityBlackout = false; // true while document.hidden / page hidden
  let xrBlackout = false;       // true while XR session is not 'visible'

  let shortcutResetTimer = null;
  let modifierDown = false;

  function computeState() {
    return streamBlackout || shortcutBlackout || visibilityBlackout || xrBlackout;
  }

  function flushState() {
    onProtectionChange(computeState());
  }

  // ── Stream blackout (persistent while recording) ────────────────────────
  function handleCaptureStateChange(e) {
    const active = e.detail && e.detail.active;
    streamBlackout = !!active;
    flushState();
  }

  // Also read initial flag in case the event fired before we subscribed
  if (window.__captureActive) {
    streamBlackout = true;
  }

  // ── Visibility / page hide ───────────────────────────────────────────────
  function handleVisibility() {
    visibilityBlackout = !!document.hidden;
    flushState();
    // Schedule release when tab becomes visible again
    if (!document.hidden) {
      setTimeout(() => {
        visibilityBlackout = false;
        flushState();
      }, 200);
    }
  }

  function handlePageHide() {
    visibilityBlackout = true;
    flushState();
  }

  function handlePageShow() {
    visibilityBlackout = false;
    flushState();
  }

  // ── Window blur during modifier key (Mac screenshot crosshair appears) ───
  function handleBlur() {
    if (modifierDown) {
      shortcutBlackout = true;
      flushState();
      scheduleShortcutRelease(3500);
    }
  }

  function scheduleShortcutRelease(delay) {
    if (shortcutResetTimer) clearTimeout(shortcutResetTimer);
    shortcutResetTimer = setTimeout(() => {
      shortcutResetTimer = null;
      shortcutBlackout = false;
      flushState();
    }, delay);
  }

  // ── Screenshot & shortcut key interception ───────────────────────────────
  function handleKeyDown(e) {
    const key  = e.key  ? e.key.toLowerCase()  : '';
    const code = e.code ? e.code.toLowerCase()  : '';

    // Track modifier state
    if (e.metaKey || e.ctrlKey || e.shiftKey ||
        key === 'meta' || key === 'control' || key === 'shift') {
      modifierDown = true;
    }

    // ── Mac: Cmd+Shift+anything (screenshot tools) ───────────────
    if (e.metaKey && e.shiftKey) {
      e.preventDefault();
      e.stopImmediatePropagation();
      shortcutBlackout = true;
      flushState();
      scheduleShortcutRelease(3500);
      return;
    }

    // ── Mac: Cmd+3/4/5/S (alternative combos) ───────────────────
    if (e.metaKey && ['3', '4', '5', 's', '#', '$', '%',
                       'digit3', 'digit4', 'digit5', 'keys'].includes(key || code)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      shortcutBlackout = true;
      flushState();
      scheduleShortcutRelease(3500);
      return;
    }

    // ── Windows: PrintScreen / Alt+PrintScreen ───────────────────
    if (key === 'printscreen' || code === 'printscreen') {
      e.preventDefault();
      e.stopImmediatePropagation();
      shortcutBlackout = true;
      flushState();
      scheduleShortcutRelease(3500);
      return;
    }

    // ── Windows: Win+Shift+S (Snipping Tool) ─────────────────────
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (key === 's' || code === 'keys')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      shortcutBlackout = true;
      flushState();
      scheduleShortcutRelease(3500);
      return;
    }

    // ── Ctrl+Shift+anything (Windows / Linux screenshot tools) ───
    if (e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      e.stopImmediatePropagation();
      shortcutBlackout = true;
      flushState();
      scheduleShortcutRelease(3500);
    }
  }

  function handleKeyUp(e) {
    if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
      modifierDown = false;
    }
  }

  // ── Register all event listeners ─────────────────────────────────────────
  window.addEventListener('__captureStateChange', handleCaptureStateChange, true);
  document.addEventListener('visibilitychange',   handleVisibility,          true);
  window.addEventListener('pagehide',             handlePageHide,            true);
  window.addEventListener('pageshow',             handlePageShow,            true);
  window.addEventListener('blur',                 handleBlur,                true);
  window.addEventListener('keydown',              handleKeyDown,             true);
  window.addEventListener('keyup',                handleKeyUp,               true);

  // ── Android / mobile: listen for focus loss (home button / app switch) ──
  // document.hidden covers this on most mobile browsers via visibilitychange

  return function unsubscribe() {
    if (shortcutResetTimer) clearTimeout(shortcutResetTimer);
    window.removeEventListener('__captureStateChange', handleCaptureStateChange, true);
    document.removeEventListener('visibilitychange',   handleVisibility,          true);
    window.removeEventListener('pagehide',             handlePageHide,            true);
    window.removeEventListener('pageshow',             handlePageShow,            true);
    window.removeEventListener('blur',                 handleBlur,                true);
    window.removeEventListener('keydown',              handleKeyDown,             true);
    window.removeEventListener('keyup',                handleKeyUp,               true);
  };
}

// ── 3. WebXR Session Visibility Registration ─────────────────────────────────

/**
 * Registers an XRSession with the capture protection system.
 * On Meta Quest, when the headset menu opens, the XR session emits
 * a visibilitychange event with state 'visible-blurred' or 'hidden'.
 * This function wires that event to trigger/release capture blackout.
 *
 * Call this inside your 'enter-vr' A-Frame event handler:
 *   registerXRSession(scene.xrSession, onProtectionChange);
 *
 * @param {XRSession} xrSession
 * @param {function(boolean): void} onProtectionChange  same callback as subscribeCaptureProtection
 * @returns {function(): void} cleanup function
 */
export function registerXRSession(xrSession, onProtectionChange) {
  if (!xrSession || typeof xrSession.addEventListener !== 'function') {
    return () => {};
  }

  function handleXRVisibility() {
    const state = xrSession.visibilityState;
    // 'visible'           → fully visible in headset
    // 'visible-blurred'   → headset menu / guardian boundary active
    // 'hidden'            → headset removed / sleep
    const isProtected = state === 'visible-blurred' || state === 'hidden';
    onProtectionChange(isProtected);
  }

  xrSession.addEventListener('visibilitychange', handleXRVisibility);

  // Fire immediately with current state
  handleXRVisibility();

  return function cleanup() {
    xrSession.removeEventListener('visibilitychange', handleXRVisibility);
  };
}

// ── 4. WebGL Black Texture Generator for WebXR ──────────────────────────────

let cachedBlackTexture = null;

/**
 * Returns a solid 4x4 black THREE.CanvasTexture for WebGL 360° texture substitution.
 * Cached after first call.
 * @returns {THREE.Texture|null}
 */
export function getBlackTexture() {
  if (cachedBlackTexture) return cachedBlackTexture;
  if (typeof window === 'undefined' || !window.THREE) return null;

  const THREE = window.THREE;
  const canvas = document.createElement('canvas');
  canvas.width  = 4;
  canvas.height = 4;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 4, 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate   = true;
  cachedBlackTexture = tex;
  return tex;
}
