import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const ACCEPTED_EXTS = ['.mp4', '.webm', '.mov', '.mkv'];
const MIME_MAP = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/mp4',
  '.mkv': 'video/x-matroska',
};

// AES-256-CTR encrypt (same key/counter as VideoModal decrypt — CTR is symmetric)
async function encryptVideoFile(arrayBuffer) {
  const KEY_HEX = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
  const keyBytes = new Uint8Array(KEY_HEX.match(/.{2}/g).map(b => parseInt(b, 16)));
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'AES-CTR' }, false, ['encrypt']
  );
  return crypto.subtle.encrypt(
    { name: 'AES-CTR', counter: new Uint8Array(16), length: 64 },
    cryptoKey, arrayBuffer
  );
}

export default function UploadModal({ onClose }) {
  const { addVideo, role } = useAuth();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('training');
  const [desc, setDesc] = useState('');
  const [filePreview, setFilePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [encryptStep, setEncryptStep] = useState('');
  const fileRef = useRef(null);

  function handleFileChange() {
    const file = fileRef.current?.files[0];
    if (!file) { setFilePreview(''); return; }
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_EXTS.includes(ext)) {
      setFilePreview('❌ Only .mp4, .webm, .mov, .mkv files accepted.');
      fileRef.current.value = '';
    } else {
      setFilePreview(`✅ ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (role !== 'admin' && role !== 'editor') {
      toast('⛔ Unauthorized.', 'error');
      return;
    }
    const file = fileRef.current?.files[0];
    if (!file) { toast('Please select a file.', 'error'); return; }
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_EXTS.includes(ext)) {
      toast('⛔ Only .mp4, .webm, .mov, .mkv files are allowed.', 'error');
      return;
    }

    setUploading(true);
    setEncryptStep('Reading video into memory…');
    const rawBuffer = await file.arrayBuffer();

    await sleep(400);
    setEncryptStep('Generating AES-256-CTR keystream…');
    await sleep(700);
    setEncryptStep('Encrypting with WebCrypto API…');

    let encryptedData;
    try {
      encryptedData = await encryptVideoFile(rawBuffer);
    } catch {
      toast('⛔ Encryption failed.', 'error');
      setUploading(false);
      setEncryptStep('');
      return;
    }

    await sleep(500);
    setEncryptStep('Storing ciphertext in session memory…');
    await sleep(400);

    const newVideo = {
      id: 'v' + Date.now(),
      title: title.trim() || 'Untitled',
      category: cat,
      duration: 'Classified',
      resolution: 'Encrypted',
      size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
      thumb: '/thumb1.png',
      desc: desc.trim() || 'Encrypted VR content.',
      encryptedBin: true,
      originalExt: ext,
      originalMime: MIME_MAP[ext] || 'video/mp4',
      fileData: encryptedData,
    };

    addVideo(newVideo);
    toast(`✅ "${newVideo.title}" encrypted & secured.`, 'success');
    setUploading(false);
    setEncryptStep('');
    onClose();
  }

  return (
    <div
      className="modal-overlay open"
      id="upload-modal"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">🔐 Upload & Encrypt Video</h2>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              {role === 'admin' ? 'Admin' : 'Editor'} access &bull; Video encrypted in-browser before storage
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Video File (.mp4 · .webm · .mov · .mkv)</label>
            <input
              className="form-input"
              type="file"
              ref={fileRef}
              accept=".mp4,.webm,.mov,.mkv"
              required
              onChange={handleFileChange}
            />
            {filePreview && (
              <span
                style={{
                  fontSize: '0.83rem',
                  marginTop: 6,
                  display: 'block',
                  color: filePreview.startsWith('❌') ? 'var(--danger)' : 'var(--success)',
                }}
              >
                {filePreview}
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Descriptive Title</label>
            <input
              className="form-input"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Tactical Simulation Beta"
              required
            />
          </div>

          <div className="form-group" style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Category</label>
              <select
                className="form-input"
                value={cat}
                onChange={e => setCat(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="training">Training</option>
                <option value="experience">Experience</option>
                <option value="simulation">Simulation</option>
                <option value="neural">Neural</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Encryption</label>
              <input className="form-input" type="text" value="AES-256-CTR (locked)" disabled />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows={2}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Brief description of this video content..."
            />
          </div>

          {encryptStep ? (
            <div className="warn-box" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="spinner" style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span>{encryptStep}</span>
            </div>
          ) : (
            <div className="warn-box" style={{ marginBottom: 20 }}>
              <span>
                🔐 Video is encrypted with AES-256-CTR inside your browser before being stored.
                Raw bytes never leave your device unencrypted and are never written to disk.
              </span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            disabled={uploading}
          >
            {uploading && <span className="spinner" style={{ width: 16, height: 16 }} />}
            {uploading ? 'Encrypting…' : '🔐 Encrypt & Upload'}
          </button>
        </form>
      </div>
    </div>
  );
}
