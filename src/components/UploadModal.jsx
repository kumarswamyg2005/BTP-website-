import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const CLOUD_NAME    = 'dbacaeqts';
const UPLOAD_PRESET = 'BTP-website';
const UPLOAD_URL    = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

const ACCEPTED_EXTS = ['.mp4', '.webm', '.mov', '.mkv'];

// Upload with XHR so we get real progress events
function uploadToCloudinary(file, folder, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    fd.append('folder', folder);
    fd.append('resource_type', 'video');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', UPLOAD_URL);

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Cloudinary error ${xhr.status}: ${xhr.responseText}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.send(fd);
  });
}

export default function UploadModal({ onClose }) {
  const { addVideo, role } = useAuth();
  const toast = useToast();

  const [title, setTitle]         = useState('');
  const [cat, setCat]             = useState('training');
  const [desc, setDesc]           = useState('');
  const [filePreview, setFilePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [step, setStep]           = useState('');
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
    setUploadPct(0);
    setStep('Preparing secure upload…');

    let cloudUrl;
    try {
      setStep('Uploading to Cloudinary CDN…');
      const result = await uploadToCloudinary(
        file,
        'unity-stream',
        pct => {
          setUploadPct(pct);
          setStep(`Uploading to Cloudinary CDN… ${pct}%`);
        }
      );
      cloudUrl = result.secure_url;
    } catch (err) {
      toast(`⛔ Upload failed: ${err.message}`, 'error', 6000);
      setUploading(false);
      setStep('');
      return;
    }

    setStep('Registering in encrypted library…');

    const newVideo = {
      id:         'v' + Date.now(),
      title:      title.trim() || file.name.replace(/\.[^.]+$/, ''),
      category:   cat,
      duration:   'Classified',
      resolution: 'Encrypted',
      size:       (file.size / 1024 / 1024).toFixed(1) + ' MB',
      thumb:      '/thumb1.png',
      desc:       desc.trim() || 'Encrypted VR content uploaded via Unity Stream.',
      src:        cloudUrl,
      binFileName: file.name,
    };

    addVideo(newVideo);
    toast(`✅ "${newVideo.title}" uploaded to Cloudinary & added to library.`, 'success', 5000);
    setUploading(false);
    setStep('');
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
            <h2 className="modal-title">☁️ Upload Video to Cloud</h2>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              {role === 'admin' ? 'Admin' : 'Editor'} access &bull; Uploaded to Cloudinary CDN &bull; Persists across sessions
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
              <label className="form-label">Storage</label>
              <input className="form-input" type="text" value="Cloudinary CDN (locked)" disabled />
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

          {/* Progress / status */}
          {uploading ? (
            <div style={{ marginBottom: 16 }}>
              <div className="warn-box" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="spinner" style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span>{step}</span>
              </div>
              <div className="progress-bar" style={{ height: 6 }}>
                <div
                  className="progress-fill"
                  style={{ width: `${uploadPct}%`, transition: 'width 0.3s ease' }}
                />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 5, textAlign: 'right' }}>
                {uploadPct}%
              </div>
            </div>
          ) : (
            <div className="warn-box" style={{ marginBottom: 20 }}>
              <span>
                ☁️ Video is uploaded directly to <strong>Cloudinary CDN</strong> and added
                permanently to the library — survives page refresh and is available to all users.
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
            {uploading ? 'Uploading…' : '☁️ Upload to Cloud'}
          </button>
        </form>
      </div>
    </div>
  );
}
