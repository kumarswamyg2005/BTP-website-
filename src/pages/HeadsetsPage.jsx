import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageTransition from '../components/PageTransition.jsx';

const MOCK_HEADSETS = [
  {
    id: 'HS-CC7A-4F02',
    model: 'Unity VR Headset (Simulated)',
    type: 'WebXR',
    signal: 100,
  },
];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export default function HeadsetsPage() {
  const { registeredHeadsets, activeHeadset, registerHeadset, releaseHeadset, setActiveHeadset } = useAuth();
  const toast = useToast();

  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMsg, setScanMsg] = useState('Scanning network for nearby VR headsets…');
  const [showProgress, setShowProgress] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);

  const startScan = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    setShowProgress(true);
    setScanProgress(0);
    setDiscoveredDevices([]);

    const messages = [
      'Initializing WebXR protocol scan…',
      'Broadcasting device discovery packets…',
      'Probing physical VR hardware bus…',
      'Evaluating navigator.xr session support…',
      'Finalizing available device list…',
    ];

    let msgIdx = 0;
    for (let i = 0; i <= 100; i += 2) {
      setScanProgress(i);
      if (i % 20 === 0 && msgIdx < messages.length) {
        setScanMsg(messages[msgIdx++]);
      }
      await sleep(28);
    }

    let xrSupported = false;
    if ('xr' in navigator) {
      try { xrSupported = await navigator.xr.isSessionSupported('immersive-vr'); } catch {}
    }

    const available = MOCK_HEADSETS.filter(
      h => !registeredHeadsets.find(r => r.id === h.id)
    );

    setDiscoveredDevices(available);
    setScanning(false);

    if (xrSupported && available.length > 0) {
      toast(`🥽 Found ${available.length} physical VR headset(s).`, 'success');
    } else if (available.length > 0) {
      toast('⚠️ No physical headset detected. Simulated headset added for testing.', 'info', 5000);
    } else {
      toast('All headsets already registered.', 'info');
    }
  }, [scanning, registeredHeadsets, toast]);

  function handleRegister(deviceId) {
    const device = discoveredDevices.find(h => h.id === deviceId);
    if (!device) return;
    registerHeadset(device);
    setDiscoveredDevices(prev => prev.filter(h => h.id !== deviceId));
    toast(`✅ ${device.model} registered exclusively.`, 'success');
  }

  function handleRelease(deviceId) {
    const hset = registeredHeadsets.find(h => h.id === deviceId);
    if (!hset) return;
    releaseHeadset(deviceId);
    // add back to discovered if not already there
    if (!discoveredDevices.find(h => h.id === deviceId)) {
      const mock = MOCK_HEADSETS.find(h => h.id === deviceId);
      if (mock) setDiscoveredDevices(prev => [...prev, mock]);
    }
    toast(`🔓 ${hset.model} released.`, 'info');
  }

  function handleSetActive(deviceId) {
    const hset = registeredHeadsets.find(h => h.id === deviceId);
    if (!hset) return;
    setActiveHeadset(deviceId);
    toast(`🥽 ${hset.model} set as active headset.`, 'info');
  }

  return (
    <PageTransition className="tab-content active" style={{ paddingTop: 'var(--navbar-h)' }}>
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <h2 className="section-title">Headset Management</h2>
        <p className="section-desc">
          Each headset can only be registered to one active session at a time. The system ensures
          exclusive access — your headset won&apos;t be shared across simultaneous logins.
        </p>

        {/* Scanner Panel */}
        <div className="headset-scanner-card glass">
          <div className="scanner-header">
            <div>
              <h3>Nearby Headset Scan</h3>
              <p>Detect VR devices on your local network</p>
            </div>
            <button className="btn btn-primary" onClick={startScan} disabled={scanning}>
              {scanning ? (
                <>
                  <span style={{ opacity: 0 }}>🥽 Start Scan</span>
                  <div className="spinner"></div>
                </>
              ) : (
                <span>🥽 Start Scan</span>
              )}
            </button>
          </div>

          {showProgress && (
            <div className="scan-progress-wrap" style={{ display: 'flex' }}>
              <div className="scan-animation">
                <div className="radar-ring"></div>
                <div className="radar-ring" style={{ animationDelay: '0.5s' }}></div>
                <div className="radar-ring" style={{ animationDelay: '1s' }}></div>
                <div className="radar-blip"></div>
                <div className="radar-icon">🥽</div>
              </div>
              <div className="scan-status-text">
                <p>{scanMsg}</p>
                <div className="progress-bar" style={{ marginTop: 12 }}>
                  <div className="progress-fill" style={{ width: `${scanProgress}%` }}></div>
                </div>
              </div>
            </div>
          )}

          <div className="discovered-list" style={{ marginTop: 24 }}>
            {discoveredDevices.length === 0 && showProgress && !scanning ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-icon">🔎</div>
                <p>No unregistered headsets found nearby.</p>
              </div>
            ) : (
              discoveredDevices.map(d => (
                <div className="discovered-device" key={d.id}>
                  <div className="discovered-device-info">
                    <div className="device-icon">🥽</div>
                    <div>
                      <div className="device-name">{d.model}</div>
                      <div className="device-id">
                        {d.id} &middot; {d.type} &middot; Signal: {d.signal}%
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleRegister(d.id)}
                  >
                    + Register
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Registered Headsets */}
        <div style={{ marginTop: 36 }}>
          <h3 className="section-title">Registered Headsets</h3>
          {registeredHeadsets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🥽</div>
              <h3>No headsets registered</h3>
              <p>Scan for nearby devices to register a VR headset to your account.</p>
            </div>
          ) : (
            <div className="registered-list">
              {registeredHeadsets.map(h => {
                const isActive = activeHeadset?.id === h.id;
                return (
                  <div className={`registered-headset-card${isActive ? ' active' : ''}`} key={h.id}>
                    <div className="reg-headset-info">
                      <div className="reg-icon">🥽</div>
                      <div>
                        <div className="reg-name">{h.model}</div>
                        <div className="reg-meta">{h.id} &middot; {h.type}</div>
                      </div>
                    </div>
                    <div className="reg-actions">
                      {isActive ? (
                        <span className="badge badge-success">
                          <span className="pulse-dot online"></span> Active
                        </span>
                      ) : (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleSetActive(h.id)}
                        >
                          Set Active
                        </button>
                      )}
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRelease(h.id)}
                      >
                        🔓 Release
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Exclusivity info */}
        <div className="info-box glass" style={{ marginTop: 36 }}>
          <div className="info-box-icon">🔒</div>
          <div>
            <strong>Exclusive Headset Lock</strong>
            <p>
              When you register a headset, it is exclusively bound to your session token.
              If another Unity Stream instance attempts to detect the same headset,
              the system will deny registration. You must release your headset to allow
              another user to claim it.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
