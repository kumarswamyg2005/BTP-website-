import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ParticleCanvas from '../components/ParticleCanvas.jsx';
import PageTransition from '../components/PageTransition.jsx';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [shake, setShake] = useState(false);
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;

  async function handleSubmit(e) {
    e.preventDefault();
    setAuthError('');

    if (!userId && !password) { setAuthError('Please enter your User ID and password.'); return; }
    if (!userId) { setAuthError('User ID is required.'); return; }
    if (!password) { setAuthError('Password is required.'); return; }

    setLoading(true);
    await sleep(900);

    const user = await login(userId, password);
    if (!user) {
      setAuthError('Invalid credentials. Please check your username and password.');
      setLoading(false);
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }

    toast(`Secure session started. Role: ${user.role} 🔒`, 'success');
    setTimeout(() => toast('☁️ Cloud synced.', 'info', 2000), 1800);
    navigate('/home');
  }

  return (
    <PageTransition className="page-wrapper">
      <div className="bg-animated"></div>
      <div className="bg-grid"></div>
      <div className="login-wrapper">
        {/* Left Panel */}
        <div className="login-left">
          <div className="login-brand">
            <img src="/logo.png" alt="Unity Stream Logo" className="login-logo" />
            <span className="login-brand-name">Unity Stream</span>
          </div>

          <div className="login-hero">
            <div className="login-eyebrow">
              <span className="login-eyebrow-line"></span>
              Secure VR Platform
            </div>

            <div className="particle-hint-badge">
              {isCoarse ? '✦ LIVE ANIMATION' : '✦ HOVER TO INTERACT'}
            </div>
            <ParticleCanvas />

            <p className="login-hero-desc">
              Next-generation encrypted VR content delivery with intelligent headset management
              and military-grade security.
            </p>

            <div className="login-feature-list">
              <div className="login-feature-item">
                <div className="login-feature-icon">🔐</div>
                <div className="login-feature-text">
                  <strong>End-to-End Encryption</strong>
                  <span>.bin encrypted video streams</span>
                </div>
              </div>
              <div className="login-feature-item">
                <div className="login-feature-icon">🥽</div>
                <div className="login-feature-text">
                  <strong>Smart Headset Detection</strong>
                  <span>Auto-registers nearby VR devices</span>
                </div>
              </div>
              <div className="login-feature-item">
                <div className="login-feature-icon">☁️</div>
                <div className="login-feature-text">
                  <strong>Cloud Storage</strong>
                  <span>Isolated per-user cloud instances</span>
                </div>
              </div>
            </div>
          </div>

          <div className="login-left-footer">
            <div>
              <div className="login-stat-value">AES-256</div>
              <div className="login-stat-label">Encryption</div>
            </div>
            <div className="login-stat-sep"></div>
            <div>
              <div className="login-stat-value">3</div>
              <div className="login-stat-label">User Roles</div>
            </div>
            <div className="login-stat-sep"></div>
            <div>
              <div className="login-stat-value">6+</div>
              <div className="login-stat-label">VR Experiences</div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="login-right">
          <div className={`login-card${shake ? ' shake' : ''}`}>
            <div className="login-card-header">
              <h2>Sign In</h2>
              <p>Enter your credentials to access Unity Stream</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              {authError && (
                <div className="auth-alert auth-alert-error visible" role="alert" aria-live="polite">
                  {authError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">User ID</label>
                <div className="input-icon-wrap">
                  <span className="input-icon">👤</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter your User ID"
                    autoComplete="username"
                    value={userId}
                    onChange={e => { setUserId(e.target.value); setAuthError(''); }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-icon-wrap">
                  <span className="input-icon">🔑</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setAuthError(''); }}
                    required
                  />
                  <button
                    type="button"
                    className="input-action"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div className="login-options">
                <label className="checkbox-wrap">
                  <input type="checkbox" />
                  <span className="checkbox-label">Remember this device</span>
                </label>
                <a href="#" className="link-subtle" onClick={e => e.preventDefault()}>
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="btn btn-primary login-submit-btn"
                disabled={loading}
              >
                <span>{loading ? 'Authenticating…' : 'Sign In'}</span>
                {loading && <div className="spinner"></div>}
              </button>
            </form>

            {/* Demo credentials */}
            <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Demo Credentials
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { id: 'admin', pass: 'Password', role: 'Admin', color: '#4f8ef7' },
                  { id: 'editor', pass: 'Editor@2025!', role: 'Editor', color: '#a78bfa' },
                  { id: 'user01', pass: 'User@2025!', role: 'User', color: '#22c55e' },
                ].map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setUserId(c.id); setPassword(c.pass); setAuthError(''); }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      fontSize: '0.83rem',
                      fontFamily: 'var(--mono)',
                    }}
                  >
                    <span>{c.id}</span>
                    <span style={{ color: c.color, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      {c.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <p className="login-footer">
              Unity Stream v2.0 &nbsp;|&nbsp; ARDS × CAC × CSC Division
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
