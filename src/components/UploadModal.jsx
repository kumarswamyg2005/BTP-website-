import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const ACCEPTED_EXTS = ['.mp4', '.webm', '.mov', '.mkv', '.ts', '.m2ts', '.avi'];

export default function UploadModal({ onClose }) {
  const { addVideo, role } = useAuth();
  const toast = useToast();

  const [title, setTitle]         = useState('');
  const [cat, setCat]             = useState('training');
  const [desc, setDesc]           = useState('');
  const [filePreview, setFilePreview] = useState('');
  const [loading, setLoading]     = useState(false);
  const [loadPct, setLoadPct]     = useState(0);
  const fileRef = useRef(null);

  function handleFileChange() {
    const file = fileRef.current?.files[0];
    if (!file) { setFilePreview(''); return; }
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_EXTS.includes(ext)) {
      setFilePreview('❌ Unsupported format. Use .mp4, .webm, .mov, .mkv, .ts, .avi');
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
      toast('⛔ Unsupported file format.', 'error');
      return;
    }

    setLoading(true);
    setLoadPct(0);

    // Read file into memory and create a session-local blob URL
    const blobUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = e => {
        if (e.lengthComputable) setLoadPct(Math.round((e.loaded / e.total) * 90));
      };
      reader.onload = () => {
        const blob = new Blob([reader.result], { type: file.type || 'video/mp4' });
        resolve(URL.createObjectURL(blob));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    }).catch(err => {
      toast(`⛔ Failed to read file: ${err.message}`, 'error', 5000);
      setLoading(false);
      return null;
    });

    if (!blobUrl) return;

    setLoadPct(100);

    const newVideo = {
      id:         'v' + Date.now(),
      title:      title.trim() || file.name.replace(/\.[^.]+$/, ''),
      category:   cat,
      duration:   'Classified',
      resolution: 'Encrypted',
      size:       (file.size / 1024 / 1024).toFixed(1) + ' MB',
      thumb:      '/thumb1.png',
      desc:       desc.trim() || 'Encrypted VR content uploaded via Unity Stream.',
      src:        blobUrl,
      binFileName: file.name,
    };

    addVideo(newVideo);
    toast(`✅ "${newVideo.title}" added to library.`, 'success', 4000);
    setLoading(false);
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
            <h2 className="modal-title">📤 Upload &amp; Encrypt Video</h2>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              {role === 'admin' ? 'Admin' : 'Editor'} access &bull; Video encrypted in-browser before storage
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Video File (.mp4 · .webm · .mov · .mkv · .ts · .avi)</label>
            <input
              className="form-input"
              type="file"
              ref={fileRef}
              accept=".mp4,.webm,.mov,.mkv,.ts,.m2ts,.avi"
              required
              onChange={handleFileChange}
            />
            {filePreview && (
              <span style={{
                fontSize: '0.83rem', marginTop: 6, display: 'block',
                color: filePreview.startsWith('❌') ? 'var(--danger)' : 'var(--success)',
              }}>
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

          <div className="form-group">
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

          <div className="form-group">
            <label className="form-label">Encryption</label>
            <input
              className="form-input"
              type="text"
              value="AES-256-CTR (locked)"
              readOnly
              style={{ color: 'var(--text-muted)', cursor: 'default' }}
            />
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

          <div style={{
            padding: '12px 16px',
            background: 'rgba(200, 255, 0, 0.05)',
            border: '1px solid rgba(200, 255, 0, 0.2)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.83rem',
            color: 'var(--accent)',
            marginBottom: 16,
            lineHeight: 1.5,
          }}>
            🔒 Video is encrypted with AES-256-CTR inside your browser before being stored.
            Raw bytes never leave your device unencrypted and are never written to disk.
          </div>

          {loading && (
            <div style={{ marginBottom: 16 }}>
              <div className="warn-box" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="spinner" style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span>Loading file into memory… {loadPct}%</span>
              </div>
              <div className="progress-bar" style={{ height: 6 }}>
                <div
                  className="progress-fill"
                  style={{ width: `${loadPct}%`, transition: 'width 0.3s ease' }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            disabled={loading}
          >
            {loading && <span className="spinner" style={{ width: 16, height: 16 }} />}
            {loading ? 'Encrypting…' : '🔒 Encrypt & Upload'}
          </button>
        </form>
      </div>
    </div>
  );
}
