import React, { useState, useCallback, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import PageTransition from "../components/PageTransition.jsx";

const MOCK_HEADSET = {
  id: "HS-CC7A-4F02",
  model: "Unity VR Headset (Simulated)",
  type: "Simulated",
  signal: 100,
  real: false,
};

// Detect if running inside a Meta Quest / Oculus browser
function detectQuestBrowser() {
  const ua = navigator.userAgent || "";
  if (/OculusBrowser/i.test(ua)) return "Meta Quest (Oculus Browser)";
  if (/Quest/i.test(ua)) return "Meta Quest Browser";
  if (/PicoVR/i.test(ua)) return "Pico VR Browser";
  return null;
}

// True if browser supports Web Bluetooth
const hasBluetooth =
  typeof navigator !== "undefined" && "bluetooth" in navigator;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function HeadsetsPage() {
  const {
    registeredHeadsets,
    activeHeadset,
    registerHeadset,
    releaseHeadset,
    setActiveHeadset,
  } = useAuth();
  const toast = useToast();

  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMsg, setScanMsg] = useState("");
  const [showProgress, setShowProgress] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [appUrl, setAppUrl] = useState("");

  // Build the local URL once (so user can open it on the Quest browser)
  useEffect(() => {
    setAppUrl(window.location.origin + window.location.pathname);

    // If already running inside a Quest browser, auto-add it as a real device
    const questModel = detectQuestBrowser();
    if (questModel) {
      const alreadyReg = registeredHeadsets.find(
        (h) => h.type === "WebXR (Quest)",
      );
      if (!alreadyReg) {
        const device = {
          id: `QUEST-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          model: questModel,
          type: "WebXR (Quest)",
          signal: 100,
          real: true,
        };
        setDiscoveredDevices([device]);
        toast(
          "🥽 Meta Quest browser detected! Register your headset below.",
          "success",
          7000,
        );
      }
    }
  }, []);

  const startScan = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    setShowProgress(true);
    setScanProgress(0);
    setDiscoveredDevices([]);

    const messages = hasBluetooth
      ? [
          "Initializing Bluetooth scan…",
          "Broadcasting BT discovery packets…",
          "Opening device picker — select your headset…",
          "Evaluating WebXR session support…",
          "Finalizing device list…",
        ]
      : [
          "Initializing WebXR protocol scan…",
          "Probing VR hardware bus…",
          "Evaluating navigator.xr session support…",
          "Checking for Quest browser session…",
          "Finalizing available device list…",
        ];

    let msgIdx = 0;
    for (let i = 0; i <= 60; i += 2) {
      setScanProgress(i);
      if (i % 20 === 0 && msgIdx < messages.length)
        setScanMsg(messages[msgIdx++]);
      await sleep(28);
    }

    // ── 1. Try Web Bluetooth (Chrome/Edge on Mac/Windows) ──────────────
    let foundReal = false;
    if (hasBluetooth) {
      setScanMsg("Opening Bluetooth device picker…");
      try {
        const btDevice = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [],
        });

        if (btDevice) {
          const name = btDevice.name || "Unknown BT Device";
          const isVR =
            /quest|meta|oculus|vive|valve index|pico|htc|reverb/i.test(name);
          const device = {
            id: `BT-${(btDevice.id || Math.random().toString(36).slice(2, 8)).toUpperCase().slice(0, 8)}`,
            model: name,
            type: isVR ? "Bluetooth VR" : "Bluetooth",
            signal: 90,
            real: true,
          };
          const alreadyReg = registeredHeadsets.find((r) => r.id === device.id);
          if (!alreadyReg) {
            setDiscoveredDevices([device]);
            toast(
              `🎯 Found: ${name}${isVR ? " — VR headset detected!" : ""}`,
              "success",
              6000,
            );
            foundReal = true;
          } else {
            toast("This device is already registered.", "info");
          }
        }
      } catch (err) {
        // User cancelled picker or BT unavailable — fall through silently
        if (err.name !== "NotFoundError" && err.name !== "AbortError") {
          toast(
            "Bluetooth scan failed. Falling back to WebXR check.",
            "info",
            3000,
          );
        }
      }
    }

    // ── 2. Try WebXR (works natively inside Quest browser) ────────────
    if (!foundReal) {
      setScanMsg("Checking WebXR session support…");
      let xrSupported = false;
      if ("xr" in navigator) {
        try {
          xrSupported = await navigator.xr.isSessionSupported("immersive-vr");
        } catch {}
      }

      for (let i = 60; i <= 100; i += 2) {
        setScanProgress(i);
        await sleep(20);
      }

      if (xrSupported) {
        const questModel = detectQuestBrowser() || "WebXR Headset";
        const device = {
          id: `XR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          model: questModel,
          type: "WebXR",
          signal: 100,
          real: true,
        };
        const alreadyReg = registeredHeadsets.find((r) => r.type === "WebXR");
        if (!alreadyReg) {
          setDiscoveredDevices([device]);
          toast("🥽 WebXR headset detected!", "success", 5000);
          foundReal = true;
        } else {
          toast("WebXR headset already registered.", "info");
        }
      }
    }

    // ── 3. Fall back to simulated ─────────────────────────────────────
    if (!foundReal) {
      for (let i = 60; i <= 100; i += 2) {
        setScanProgress(i);
        await sleep(20);
      }
      const alreadyReg = registeredHeadsets.find(
        (r) => r.id === MOCK_HEADSET.id,
      );
      if (!alreadyReg) {
        setDiscoveredDevices([MOCK_HEADSET]);
        toast(
          "No physical headset found. Simulated device added for testing.",
          "info",
          5000,
        );
      } else {
        toast("All headsets already registered.", "info");
      }
    }

    setScanning(false);
  }, [scanning, registeredHeadsets, toast]);

  function handleRegister(deviceId) {
    const device = discoveredDevices.find((h) => h.id === deviceId);
    if (!device) return;
    registerHeadset(device);
    setDiscoveredDevices((prev) => prev.filter((h) => h.id !== deviceId));
    toast(`✅ ${device.model} registered exclusively.`, "success");
  }

  function handleRelease(deviceId) {
    const hset = registeredHeadsets.find((h) => h.id === deviceId);
    if (!hset) return;
    releaseHeadset(deviceId);
    // add back to discovered if not already there
    if (!discoveredDevices.find((h) => h.id === deviceId)) {
      const mock = MOCK_HEADSET.id === deviceId ? MOCK_HEADSET : null;
      if (mock) setDiscoveredDevices((prev) => [...prev, mock]);
    }
    toast(`🔓 ${hset.model} released.`, "info");
  }

  function handleSetActive(deviceId) {
    const hset = registeredHeadsets.find((h) => h.id === deviceId);
    if (!hset) return;
    setActiveHeadset(deviceId);
    toast(`🥽 ${hset.model} set as active headset.`, "info");
  }

  return (
    <PageTransition
      className="tab-content active"
      style={{ paddingTop: "var(--navbar-h)" }}
    >
      <div
        className="container headsets-page"
        style={{ paddingTop: 40, paddingBottom: 60 }}
      >
        <h2 className="section-title">Headset Management</h2>
        <p className="section-desc">
          Each headset can only be registered to one active session at a time.
          The system ensures exclusive access — your headset won&apos;t be
          shared across simultaneous logins.
        </p>

        {/* Scanner Panel */}
        <div className="headset-scanner-card glass">
          <div className="scanner-header">
            <div>
              <h3>Nearby Headset Scan</h3>
              <p>Detect VR devices on your local network</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={startScan}
              disabled={scanning}
            >
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
            <div className="scan-progress-wrap" style={{ display: "flex" }}>
              <div className="scan-animation">
                <div className="radar-ring"></div>
                <div
                  className="radar-ring"
                  style={{ animationDelay: "0.5s" }}
                ></div>
                <div
                  className="radar-ring"
                  style={{ animationDelay: "1s" }}
                ></div>
                <div className="radar-blip"></div>
                <div className="radar-icon">🥽</div>
              </div>
              <div className="scan-status-text">
                <p>{scanMsg}</p>
                <div className="progress-bar" style={{ marginTop: 12 }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${scanProgress}%` }}
                  ></div>
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
              discoveredDevices.map((d) => (
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
              <p>
                Scan for nearby devices to register a VR headset to your
                account.
              </p>
            </div>
          ) : (
            <div className="registered-list">
              {registeredHeadsets.map((h) => {
                const isActive = activeHeadset?.id === h.id;
                return (
                  <div
                    className={`registered-headset-card${isActive ? " active" : ""}`}
                    key={h.id}
                  >
                    <div className="reg-headset-info">
                      <div className="reg-icon">🥽</div>
                      <div>
                        <div className="reg-name">{h.model}</div>
                        <div className="reg-meta">
                          {h.id} &middot; {h.type}
                        </div>
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

        {/* Quest / Mac connection guide */}
        <div
          className="info-box glass"
          style={{ marginTop: 36, flexDirection: "column", gap: 12 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="info-box-icon">📱</div>
            <strong style={{ fontSize: "1rem" }}>
              Connecting a Meta Quest on Mac?
            </strong>
          </div>
          <p
            style={{
              margin: 0,
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              lineHeight: 1.6,
            }}
          >
            Meta dropped Mac support for Quest Link (USB/Air Link). The easiest
            alternatives:
          </p>
          <ol
            style={{
              margin: 0,
              paddingLeft: 20,
              color: "var(--text-secondary)",
              fontSize: "0.88rem",
              lineHeight: 2,
            }}
          >
            <li>
              <strong style={{ color: "var(--text-primary)" }}>
                Open this URL inside your Quest browser
              </strong>{" "}
              — WebXR works natively and the headset auto-registers:
              <div
                style={{
                  marginTop: 6,
                  padding: "8px 14px",
                  background: "var(--accent-dim)",
                  border: "1px solid var(--accent-border)",
                  borderRadius: 4,
                  fontFamily: "var(--mono)",
                  fontSize: "0.82rem",
                  color: "var(--accent)",
                  wordBreak: "break-all",
                  userSelect: "text",
                }}
              >
                {appUrl || window.location.origin}
              </div>
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>
                Bluetooth scan (Chrome/Edge on Mac)
              </strong>{" "}
              — click "Start Scan", pick your Quest from the browser's Bluetooth
              picker.
            </li>
            <li>
              <strong style={{ color: "var(--text-primary)" }}>
                ALVR / Virtual Desktop
              </strong>{" "}
              — stream SteamVR wirelessly to your Quest; then plug into any
              WebXR-compatible browser.
            </li>
          </ol>
        </div>

        {/* Exclusivity info */}
        <div className="info-box glass" style={{ marginTop: 16 }}>
          <div className="info-box-icon">🔒</div>
          <div>
            <strong>Exclusive Headset Lock</strong>
            <p>
              When you register a headset, it is exclusively bound to your
              session token. If another Unity Stream instance attempts to detect
              the same headset, the system will deny registration. You must
              release your headset to allow another user to claim it.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
