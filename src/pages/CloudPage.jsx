import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageTransition from '../components/PageTransition.jsx';
import SpotlightCard from '../components/SpotlightCard.jsx';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function randomHex(n) {
  return [...Array(n)]
    .map(() => Math.floor(Math.random() * 16).toString(16).toUpperCase())
    .join('');
}

export default function CloudPage() {
  const { user, videos } = useAuth();
  const toast = useToast();
  const [syncing, setSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(true);

  const instanceId = useMemo(() => {
    if (!user) return '–';
    return user.instanceId || `USR-${(user.username || '').toUpperCase()}-${randomHex(6)}-INST`;
  }, [user]);

  const cloudGb = user?.cloudGb || 0;
  const totalGb = 50;
  const pct = ((cloudGb / totalGb) * 100).toFixed(1);

  async function syncCloud() {
    setSyncing(true);
    toast('🔄 Syncing cloud instance…', 'info', 1500);
    await sleep(1600);
    toast('✅ Cloud synced. All files up to date.', 'success');
    setSyncing(false);
  }

  return (
    <PageTransition className="tab-content active" style={{ paddingTop: 'var(--navbar-h)' }}>
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <h2 className="section-title">Cloud Storage</h2>
        <p className="section-desc">
          Your personal cloud instance — isolated from other users. Videos are stored encrypted
          and only accessible from your account.
        </p>

        {/* Cloud Status Card */}
        <SpotlightCard className="cloud-status-card glass" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="cloud-status-header">
            <div className="cloud-icon-wrap">☁️</div>
            <div className="cloud-status-info">
              <h3>Personal Cloud Instance</h3>
              <div className="badge badge-success">
                <span className="pulse-dot online"></span> Active
              </div>
            </div>
            <div className="cloud-status-id">
              <span className="form-label">Instance ID</span>
              <code className="mono-code">{instanceId}</code>
            </div>
          </div>

          <div className="divider"></div>

          <div className="cloud-stats-grid">
            <div className="cloud-stat">
              <div className="cloud-stat-value">{cloudGb} GB</div>
              <div className="cloud-stat-label">Used</div>
            </div>
            <div className="cloud-stat">
              <div className="cloud-stat-value">{totalGb} GB</div>
              <div className="cloud-stat-label">Total</div>
            </div>
            <div className="cloud-stat">
              <div className="cloud-stat-value">{videos.length}</div>
              <div className="cloud-stat-label">Encrypted Files</div>
            </div>
            <div className="cloud-stat">
              <div className="cloud-stat-value">AES-256</div>
              <div className="cloud-stat-label">Encryption</div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div className="d-flex-between" style={{ marginBottom: 8 }}>
              <span className="form-label">Storage Usage</span>
              <span className="mono-code" style={{ fontSize: '0.8rem' }}>
                {cloudGb} / {totalGb} GB
              </span>
            </div>
            <div className="progress-bar" style={{ height: 8 }}>
              <div className="progress-fill" style={{ width: `${pct}%` }}></div>
            </div>
          </div>
        </SpotlightCard>

        {/* Sync Settings */}
        <div className="glass" style={{ padding: 28, borderRadius: 'var(--radius-lg)', marginTop: 28 }}>
          <h3 className="section-title" style={{ marginBottom: 20 }}>Sync Settings</h3>
          <div className="settings-grid">
            <div className="setting-row">
              <div>
                <strong>Auto-sync on Login</strong>
                <p>Sync your video library when signing in</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={e => setAutoSync(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="setting-row">
              <div>
                <strong>Encrypt at Rest</strong>
                <p>All videos stored encrypted in cloud</p>
              </div>
              <label className="toggle">
                <input type="checkbox" checked readOnly disabled />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="setting-row">
              <div>
                <strong>Isolated Instance</strong>
                <p>Your cloud storage is never shared with other users</p>
              </div>
              <label className="toggle">
                <input type="checkbox" checked readOnly disabled />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="setting-row">
              <div>
                <strong>Download Prevention</strong>
                <p>Block any attempt to download raw video files</p>
              </div>
              <label className="toggle">
                <input type="checkbox" checked readOnly disabled />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
          <button
            className="btn btn-purple"
            style={{ marginTop: 24 }}
            onClick={syncCloud}
            disabled={syncing}
          >
            {syncing ? '🔄 Syncing…' : '🔄 Sync Now'}
          </button>
        </div>

        {/* Cloud File List */}
        <div style={{ marginTop: 28 }}>
          <h3 className="section-title">Encrypted Files</h3>
          <div className="cloud-file-list">
            {videos.map(v => (
              <div className="cloud-file-row" key={v.id}>
                <div className="cloud-file-info">
                  <div className="cloud-file-icon">🔐</div>
                  <div>
                    <div className="cloud-file-name">
                      {v.title}{v.binFileName ? ` (${v.binFileName})` : '.bin'}
                    </div>
                    <div className="cloud-file-size">{v.size} &middot; AES-256 encrypted</div>
                  </div>
                </div>
                <span className="badge badge-purple">Encrypted</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
