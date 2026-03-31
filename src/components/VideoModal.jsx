import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import VRViewer from './VRViewer.jsx';

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// AES-256-CTR decrypt for uploaded .bin files
async function decryptBinFile(arrayBuffer) {
  const KEY_HEX = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
  const keyBytes = new Uint8Array(KEY_HEX.match(/.{2}/g).map(b => parseInt(b, 16)));
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'AES-CTR' }, false, ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CTR', counter: new Uint8Array(16), length: 64 },
    cryptoKey, arrayBuffer
  );
  return decrypted;
}

// Matrix rain animation on a canvas element
function runMatrixAnimation(canvas, wrap) {
  canvas.width  = wrap.clientWidth  || 420;
  canvas.height = wrap.clientHeight || 220;
  const ctx   = canvas.getContext('2d');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%"\'#&_(),.;:?!\\|{}<>[]^~'.split('');
  const fs    = 13;
  const cols  = Math.floor(canvas.width / fs);
  const drops = Array(cols).fill(1);
  let phase = 0;

  return setInterval(() => {
    phase += 0.01;
    const col  = phase < 1 ? '#0f0' : phase < 2 ? '#0ff' : '#fff';
    const fade = phase < 1 ? 0.05 : 0.08;
    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = col;
    ctx.font = `${fs}px monospace`;
    drops.forEach((d, i) => {
      ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * fs, d * fs);
      if (d * fs > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    });
  }, 33);
}

export default function VideoModal({ video, onClose }) {
  const { activeHeadset } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // phase: idle | decrypting | playing | vr
  const [phase, setPhase]       = useState('idle');
  const [videoSrc, setVideoSrc] = useState(null);
  const [vrOpen, setVrOpen]     = useState(false);
  const [btnLabel, setBtnLabel] = useState('▶ Decrypt & Play');
  const [loadError, setLoadError] = useState(false);

  const wrapRef       = useRef(null);
  const matrixCanRef  = useRef(null);
  const matrixTimerId = useRef(null);
  const videoRef      = useRef(null);
  const blobRef       = useRef(null);

  // Escape key
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Cleanup blobs on unmount
  useEffect(() => () => cleanupBlob(), []);

  function cleanupBlob() {
    stopMatrix();
    if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current = null; }
  }

  function stopMatrix() {
    if (matrixTimerId.current) { clearInterval(matrixTimerId.current); matrixTimerId.current = null; }
    if (matrixCanRef.current)  { matrixCanRef.current.remove(); matrixCanRef.current = null; }
    wrapRef.current?.classList.remove('decrypting-mode');
  }

  function handleClose() {
    cleanupBlob();
    setPhase('idle');
    setVideoSrc(null);
    onClose();
  }

  async function handleDecryptAndPlay() {
    setPhase('decrypting');
    setBtnLabel('Initiating AES-256 Decryption…');
    setLoadError(false);

    // Show matrix animation over the thumbnail
    const wrap = wrapRef.current;
    if (wrap) {
      wrap.classList.add('decrypting-mode');
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:5;';
      wrap.appendChild(canvas);
      matrixCanRef.current = canvas;
      matrixTimerId.current = runMatrixAnimation(canvas, wrap);
    }

    await sleep(1000);
    setBtnLabel('Decrypting data blocks…');
    await sleep(700);

    let src;

    if (video.fileData) {
      // Uploaded encrypted file — run WebCrypto decrypt
      setBtnLabel('Running WebCrypto AES-256-CTR…');
      try {
        const decrypted = await decryptBinFile(video.fileData);
        const mime = video.originalMime
          || (video.binFileName?.toLowerCase().endsWith('.ts') ? 'video/mp2t' : 'video/mp4');
        const blob = new Blob([decrypted], { type: mime });
        src = URL.createObjectURL(blob);
        blobRef.current = src;
      } catch (err) {
        stopMatrix();
        setPhase('idle');
        setBtnLabel('▶ Decrypt & Play');
        toast('Decryption failed. File may be corrupt.', 'error');
        return;
      }
    } else {
      // Pre-loaded video — use its assigned local source directly
      src = video.src || '/vr_4k.mp4';
    }

    await sleep(500);
    setBtnLabel('Establishing secure stream…');
    await sleep(400);

    stopMatrix();
    setVideoSrc(src);
    setPhase('playing');
    setBtnLabel('⏹ Stop');
    toast('▶ Playing. Click "View in 360° VR" to go immersive!', 'success', 6000);
  }

  function handleStopAndClose() {
    handleClose();
  }

  function openVR() {
    if (!videoSrc) return;
    // Pause the flat player while VR is open
    videoRef.current?.pause();
    setVrOpen(true);
    setPhase('vr');
  }

  function closeVR() {
    setVrOpen(false);
    setPhase('playing');
    // Resume flat player when returning from VR
    videoRef.current?.play().catch(() => {});
  }

  const isPlaying    = phase === 'playing' || phase === 'vr';
  const isDecrypting = phase === 'decrypting';
  const hasHeadset   = !!activeHeadset;

  return (
    <>
      <div
        className="modal-overlay open"
        onClick={e => e.target === e.currentTarget && handleClose()}
      >
        <div className="modal-box" style={{ maxWidth: 700 }}>

          {/* Header */}
          <div className="modal-header">
            <div>
              <h2 className="modal-title">{video.title}</h2>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <span className="badge badge-purple">{capitalize(video.category)}</span>
                <span className="badge badge-cyan">🔐 Encrypted</span>
              </div>
            </div>
            <button className="modal-close" onClick={handleClose} aria-label="Close">✕</button>
          </div>

          {/* Preview area */}
          <div className="video-preview-area" ref={wrapRef}>
            {/* Thumbnail + lock overlay — hidden once playing */}
            {!isPlaying && (
              <>
                <img src={video.thumb} alt="Video thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div className="video-lock-overlay">
                  <div className="lock-icon">{isDecrypting ? '⚙️' : '🔐'}</div>
                  <p>{isDecrypting ? 'Decrypting…' : 'Encrypted Stream'}</p>
                  <span>{isDecrypting ? 'AES-256-CTR in progress' : 'Decrypted & rendered by Unity Player'}</span>
                </div>
              </>
            )}

            {/* Actual video player — rendered when playing */}
            {isPlaying && videoSrc && (
              <>
                <video
                  ref={videoRef}
                  key={videoSrc}
                  src={videoSrc}
                  autoPlay
                  loop
                  controls
                  playsInline
                  controlsList="nodownload noremoteplayback"
                  disablePictureInPicture
                  onContextMenu={e => e.preventDefault()}
                  onError={() => setLoadError(true)}
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'contain',
                    background: '#000',
                    zIndex: 10,
                  }}
                />
                {/* VR launch button overlay */}
                <button
                  onClick={openVR}
                  style={{
                    position: 'absolute',
                    bottom: 14, left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 20,
                    background: 'linear-gradient(135deg,#4f8ef7,#7c5cfc)',
                    border: 'none', borderRadius: 10,
                    color: '#fff', fontFamily: 'var(--font)',
                    fontWeight: 700, fontSize: '0.9rem',
                    padding: '10px 24px', cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(79,142,247,0.4)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  🥽 View in 360° VR
                </button>

                {loadError && (
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 15,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 12, background: 'rgba(0,0,0,0.85)',
                  }}>
                    <span style={{ fontSize: '2rem' }}>⚠️</span>
                    <p style={{ color: '#fca5a5', fontSize: '0.9rem', textAlign: 'center', maxWidth: 300 }}>
                      Could not load video file. Check that the video file exists in the assets folder.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Info grid */}
          <div className="modal-info-grid">
            <div className="modal-info-item">
              <span className="form-label">Duration</span>
              <strong>{video.duration}</strong>
            </div>
            <div className="modal-info-item">
              <span className="form-label">Resolution</span>
              <strong>{video.resolution}</strong>
            </div>
            <div className="modal-info-item">
              <span className="form-label">File Size</span>
              <strong>{video.size}</strong>
            </div>
            <div className="modal-info-item">
              <span className="form-label">Encryption</span>
              <strong className="cyan">AES-256-CTR</strong>
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '16px 0' }}>
            {video.desc}
          </p>

          <div className="divider" />

          {/* Actions */}
          <div className="modal-actions">
            {/* Enterprise headset warning — only shown if trying to "stream", not preview */}
            {!hasHeadset && !isPlaying && (
              <div className="warn-box" style={{ marginBottom: 0 }}>
                ℹ️ No headset registered — you can still preview locally.{' '}
                <button
                  className="link-btn"
                  onClick={() => { handleClose(); navigate('/headsets'); }}
                >
                  Register headset →
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {!isPlaying ? (
                <button
                  className="btn btn-primary"
                  onClick={handleDecryptAndPlay}
                  disabled={isDecrypting}
                >
                  {isDecrypting && <span className="spinner" style={{ width: 16, height: 16, marginRight: 6 }} />}
                  {btnLabel}
                </button>
              ) : (
                <>
                  <button className="btn btn-danger" onClick={handleStopAndClose}>
                    ⏹ Stop & Close
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={openVR}
                    disabled={phase === 'vr'}
                  >
                    🥽 Enter VR Mode
                  </button>
                </>
              )}
              <button className="btn btn-outline" onClick={handleClose}>Cancel</button>
            </div>

            <div className="download-blocked-note">
              <span>⛔</span> Download disabled — content is encrypted and stream-only
            </div>
          </div>

        </div>
      </div>

      {/* A-Frame VR overlay */}
      {vrOpen && videoSrc && (
        <VRViewer src={videoSrc} onClose={closeVR} />
      )}
    </>
  );
}
