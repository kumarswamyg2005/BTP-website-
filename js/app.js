/* =========================================================
   Unity Stream — app.js  (Major Overhaul)
   - sessionStorage login persistence
   - Role-based IDs (no personal names)
   - Admin-only encrypted video upload (.bin / .ts)
   - In-browser WebCrypto AES-256 decryption simulation
   - Anti-download / anti-screenshot protections
   ========================================================= */

"use strict";

/* ─────────────────────────────────────────────────
   USERS  — loaded from js/users.js (LOCAL_USERS)
   To add/change credentials edit js/users.js only.
───────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────
   VIDEOS  (source truths; admins add more)
───────────────────────────────────────────────── */
const VIDEOS = [
  {
    id: "v1",
    title: "Encrypted Training Module Alpha",
    category: "training",
    duration: "42:18",
    resolution: "8K VR",
    size: "14.2 GB",
    thumb: "assets/thumb1.png",
    desc: "Advanced tactical VR training simulation with encrypted environment data. Used by ARDS field operatives for mission preparation.",
    ytid: "sMXXEaLgngc", // Earth 8K 360 VR
  },
  {
    id: "v2",
    title: "Deep Space VR Portal Experience",
    category: "experience",
    duration: "28:50",
    resolution: "6K VR",
    size: "9.8 GB",
    thumb: "assets/thumb2.png",
    desc: "An immersive journey through a photorealistic deep-space wormhole. Fully encrypted stream — real-time decryption via Unity Player.",
    ytid: "pCve1w1GFOs", // Angel Falls 360 VR
  },
  {
    id: "v3",
    title: "CyberSec Matrix Visualization",
    category: "simulation",
    duration: "56:04",
    resolution: "4K VR",
    size: "6.5 GB",
    thumb: "assets/thumb3.png",
    desc: "Binary matrix data stream visualization for cybersecurity analysis sessions. AES-256 encrypted .bin file with live decryption pipeline.",
    ytid: "-xNN-bJQ4vI", // Roller Coaster 360 VR
  },
  {
    id: "v4",
    title: "Global Network Threat Map",
    category: "simulation",
    duration: "35:22",
    resolution: "8K VR",
    size: "18.4 GB",
    thumb: "assets/thumb4.png",
    desc: "Real-time holographic threat intelligence map covering global network nodes. Classified encrypted stream with session-bound decryption.",
    ytid: "qC0vDKVPCrw", // National Geographic Lions 360 VR
  },
  {
    id: "v5",
    title: "Alien World Exploration: Aurora",
    category: "experience",
    duration: "61:10",
    resolution: "8K VR",
    size: "22.1 GB",
    thumb: "assets/thumb5.png",
    desc: "Crystal-covered alien landscapes with aurora-lit skies. Encoded with next-gen VR encryption for an ultra-immersive experience.",
    ytid: "sMXXEaLgngc",
  },
  {
    id: "v6",
    title: "Neural Interface Calibration Session",
    category: "neural",
    duration: "19:45",
    resolution: "4K VR",
    size: "4.9 GB",
    thumb: "assets/thumb6.png",
    desc: "Precise neural interface calibration protocol in VR. Required for ARDS VR headset synchronization. Encrypted and session-locked.",
    ytid: "pCve1w1GFOs",
  },
];

/* ─────────────────────────────────────────────────
   STATE
───────────────────────────────────────────────── */
const state = {
  currentUser: null,
  currentUserData: null,
  registeredHeadsets: [],
  activeHeadset: null,
  scanInProgress: false,
  discoveredDevices: [],
  currentVideoId: null,
  cloudSynced: false,
  decryptedObjectURLs: {}, // videoId → blob URL (cleared on modal close)
};

/* ─────────────────────────────────────────────────
   SESSION PERSISTENCE  (survive page reload)
───────────────────────────────────────────────── */
function saveSession() {
  sessionStorage.setItem("unity_user", state.currentUser);
  sessionStorage.setItem(
    "unity_headsets",
    JSON.stringify(state.registeredHeadsets),
  );
  sessionStorage.setItem("unity_active", JSON.stringify(state.activeHeadset));
  sessionStorage.setItem("unity_videos", JSON.stringify(VIDEOS));
}

function restoreSession() {
  const uid = sessionStorage.getItem("unity_user");
  if (!uid || !LOCAL_USERS[uid.toLowerCase()]) return false;
  state.currentUser = uid;
  state.currentUserData = LOCAL_USERS[uid.toLowerCase()];
  state.registeredHeadsets = JSON.parse(
    sessionStorage.getItem("unity_headsets") || "[]",
  );
  state.activeHeadset = JSON.parse(
    sessionStorage.getItem("unity_active") || "null",
  );
  return true;
}

/* ─────────────────────────────────────────────────
   ANTI-DOWNLOAD / ANTI-SCREENSHOT PROTECTIONS
───────────────────────────────────────────────── */
function applyContentProtections() {
  // Block right-click context menu on the whole app
  document.getElementById("page-app").addEventListener("contextmenu", (e) => {
    e.preventDefault();
    toast("⛔ Content is protected. Right-click is disabled.", "error", 2500);
  });

  // Inject global CSS to block drag-to-save, text selection, and print
  const shield = document.createElement("style");
  shield.textContent = `
    #page-app * { user-select: none !important; -webkit-user-select: none !important; }
    #modal-thumb, .video-thumb { pointer-events: none !important; -webkit-user-drag: none !important; }
    #actual-video-player { pointer-events: auto !important; }
    @media print { body { display: none !important; } }
  `;
  document.head.appendChild(shield);

  // Detect common screenshot / devtools shortcuts
  document.addEventListener("keydown", (e) => {
    const blocked =
      e.key === "PrintScreen" ||
      (e.ctrlKey &&
        e.shiftKey &&
        ["i", "j", "c", "s", "p"].includes(e.key.toLowerCase())) ||
      (e.metaKey && e.shiftKey && ["3", "4"].includes(e.key)) || // macOS screenshot
      (e.ctrlKey && e.key.toLowerCase() === "s"); // Ctrl+S save

    if (blocked) {
      e.preventDefault();
      toast("⛔ Capturing content is disabled.", "error", 2500);
    }
  });
}

/* ─────────────────────────────────────────────────
   TOAST SYSTEM
───────────────────────────────────────────────── */
function toast(message, type = "info", duration = 3500) {
  const container = document.getElementById("toast-container");
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || "🔔"}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add("fade-out");
    setTimeout(() => el.remove(), 350);
  }, duration);
}

/* ─────────────────────────────────────────────────
   AUTH
───────────────────────────────────────────────── */
document.getElementById("toggle-password").addEventListener("click", () => {
  const inp = document.getElementById("login-password");
  const btn = document.getElementById("toggle-password");
  const isHidden = inp.type === "password";
  inp.type = isHidden ? "text" : "password";
  btn.textContent = isHidden ? "🙈" : "👁";
});

function showAuthAlert(message) {
  const el = document.getElementById("auth-alert");
  if (!el) return;
  el.textContent = message;
  el.classList.add("visible");
}

function hideAuthAlert() {
  const el = document.getElementById("auth-alert");
  if (el) el.classList.remove("visible");
}

// Clear alert when user starts typing
["login-userid", "login-password"].forEach((id) => {
  document.getElementById(id)?.addEventListener("input", hideAuthAlert);
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAuthAlert();

  const userId = document.getElementById("login-userid").value.trim();
  const password = document.getElementById("login-password").value;

  if (!userId && !password) {
    showAuthAlert("Please enter your User ID and password.");
    return;
  }
  if (!userId) {
    showAuthAlert("User ID is required.");
    return;
  }
  if (!password) {
    showAuthAlert("Password is required.");
    return;
  }

  const btnText = document.getElementById("login-btn-text");
  const spinner = document.getElementById("login-spinner");
  const btn = document.getElementById("login-btn");
  btnText.textContent = "Authenticating…";
  spinner.classList.remove("hidden");
  btn.disabled = true;

  await sleep(900);

  const user = await AuthService.login(userId, password);
  if (!user) {
    showAuthAlert("Invalid credentials. Please check your username and password.");
    btnText.textContent = "Sign In";
    spinner.classList.add("hidden");
    btn.disabled = false;
    shakeElement(document.querySelector(".login-card"));
    return;
  }

  state.currentUser = userId.trim().toLowerCase();
  state.currentUserData = user;
  saveSession();
  enterApp();
});

function enterApp() {
  const u = state.currentUserData;

  // Avatar / nav details — role only, no personal name
  document.getElementById("user-avatar-nav").textContent = u.initial;
  document.getElementById("menu-username").textContent = state.currentUser;
  document.getElementById("menu-role").textContent = u.role;
  document.getElementById("stat-headsets").textContent =
    state.registeredHeadsets.length;

  // Cloud instance
  document.getElementById("cloud-instance-id").textContent =
    `USR-${state.currentUser.toUpperCase()}-${randomHex(6)}-INST`;
  document.getElementById("cloud-used").textContent = `${u.cloudGb} GB`;
  document.getElementById("cloud-files").textContent = VIDEOS.length;

  // Upload button: Admin ONLY
  const upBtn = document.getElementById("btn-upload-video");
  if (upBtn) {
    upBtn.classList.toggle("hidden", u.role !== "Admin");
  }

  // Switch view
  document.getElementById("page-login").classList.add("hidden");
  document.getElementById("page-app").classList.remove("hidden");

  renderVideoGrid(VIDEOS);
  renderCloudFiles();
  renderRegisteredHeadsets();
  updateNavHeadset();
  updateStats();

  applyContentProtections();

  toast(`Secure session started. Role: ${u.role} 🔒`, "success");

  setTimeout(() => {
    if (document.getElementById("sync-login")?.checked) {
      toast("☁️ Cloud synced.", "info", 2000);
      state.cloudSynced = true;
    }
  }, 1800);
}

function logout() {
  // Revoke any decrypted blob URLs to free memory
  Object.values(state.decryptedObjectURLs).forEach((url) =>
    URL.revokeObjectURL(url),
  );

  state.registeredHeadsets = [];
  state.activeHeadset = null;
  state.currentUser = null;
  state.currentUserData = null;
  state.discoveredDevices = [];
  state.decryptedObjectURLs = {};
  sessionStorage.clear();

  closeUserMenu();
  document.getElementById("page-app").classList.add("hidden");
  document.getElementById("page-login").classList.remove("hidden");
  document.getElementById("login-userid").value = "";
  document.getElementById("login-password").value = "";
  hideAuthAlert();
  switchTab("home");
  toast("Signed out. Session cleared.", "info");
}

/* ─────────────────────────────────────────────────
   TABS
───────────────────────────────────────────────── */
function switchTab(name) {
  document
    .querySelectorAll(".nav-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.remove("active"));
  const tab = document.getElementById(`tab-${name}`);
  const content = document.getElementById(`tab-content-${name}`);
  if (tab) {
    tab.setAttribute("aria-selected", "true");
    tab.classList.add("active");
  }
  if (content) content.classList.add("active");
  closeUserMenu();
  if (name === "headsets") renderRegisteredHeadsets();
}

/* ─────────────────────────────────────────────────
   VIDEO LIBRARY
───────────────────────────────────────────────── */
function renderVideoGrid(videos) {
  const grid = document.getElementById("video-grid");
  const noMsg = document.getElementById("no-videos-msg");
  if (!videos.length) {
    grid.innerHTML = "";
    noMsg.classList.remove("hidden");
    return;
  }
  noMsg.classList.add("hidden");

  grid.innerHTML = videos
    .map(
      (v, i) => `
    <div class="video-card" onclick="openVideoModal('${v.id}')"
         style="animation-delay:${i * 0.07}s" tabindex="0"
         onkeydown="if(event.key==='Enter')openVideoModal('${v.id}')">
      <div class="video-thumb-wrap">
        <img class="video-thumb" src="${v.thumb}" alt="${v.title}" loading="lazy" draggable="false" />
        <div class="video-lock-badge">🔐 Encrypted</div>
        <div class="video-play-overlay"><div class="play-btn-circle">▶</div></div>
      </div>
      <div class="video-card-body">
        <h3 class="video-card-title">${v.title}</h3>
        <div class="video-card-meta">
          <span class="badge badge-purple">${capitalize(v.category)}</span>
          <span class="badge badge-cyan">🥽 VR</span>
          ${v.binFileName ? `<span class="badge badge-gold" title="${v.binFileName}">.${v.binFileName.split(".").pop().toUpperCase()}</span>` : ""}
        </div>
        <p class="video-card-desc">${v.desc}</p>
        <div class="video-card-footer">
          <span class="video-card-duration">⏱ ${v.duration}</span>
          <span class="video-card-resolution">${v.resolution}</span>
        </div>
      </div>
    </div>
  `,
    )
    .join("");

  // Mouse-tracking glow
  document.querySelectorAll(".video-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mouse-x", `${e.clientX - r.left}px`);
      card.style.setProperty("--mouse-y", `${e.clientY - r.top}px`);
    });
  });
}

function filterVideos() {
  const query = document.getElementById("video-search").value.toLowerCase();
  const cat = document.getElementById("category-filter").value;
  const filtered = VIDEOS.filter((v) => {
    const matchText =
      v.title.toLowerCase().includes(query) ||
      v.desc.toLowerCase().includes(query);
    const matchCat = cat === "all" || v.category === cat;
    return matchText && matchCat;
  });
  renderVideoGrid(filtered);
}

function scrollToVideos() {
  document
    .getElementById("video-library-section")
    .scrollIntoView({ behavior: "smooth" });
}

function updateStats() {
  document.getElementById("stat-total").textContent = VIDEOS.length;
  document.getElementById("stat-headsets").textContent =
    state.registeredHeadsets.length;
}

/* ─────────────────────────────────────────────────
   VIDEO MODAL
───────────────────────────────────────────────── */
function openVideoModal(id) {
  const video = VIDEOS.find((v) => v.id === id);
  if (!video) return;
  state.currentVideoId = id;

  document.getElementById("modal-video-title").textContent = video.title;
  document.getElementById("modal-video-cat").textContent = capitalize(
    video.category,
  );
  document.getElementById("modal-thumb").src = video.thumb;
  document.getElementById("modal-duration").textContent = video.duration;
  document.getElementById("modal-resolution").textContent = video.resolution;
  document.getElementById("modal-size").textContent = video.size;
  document.getElementById("modal-desc").textContent = video.desc;

  // Reset modal UI
  const wrap = document.getElementById("modal-thumb-wrap");
  wrap.classList.remove("decrypting-mode");
  _clearModalCanvas();
  _clearModalVideo();

  // Show overlay text again
  document
    .querySelectorAll(".video-lock-overlay p, .video-lock-overlay span")
    .forEach((el) => (el.style.display = ""));

  const warn = document.getElementById("no-headset-warning");
  const btn = document.getElementById("modal-stream-btn");

  if (state.activeHeadset) {
    warn.classList.add("hidden");
    btn.disabled = false;
    btn.textContent = `▶ Decrypt & Play`;
    btn.onclick = streamVideo;
  } else {
    warn.classList.remove("hidden");
    btn.disabled = true;
    btn.textContent = "▶ Decrypt & Play (No Headset)";
    btn.onclick = null;
  }

  document.getElementById("video-modal").classList.add("open");
}

function closeVideoModal() {
  document.getElementById("video-modal").classList.remove("open");
  state.currentVideoId = null;

  // Reset iframe to stop video playback
  const iframe = document.getElementById("modal-video-iframe");
  if (iframe) {
    iframe.src = "";
    iframe.classList.add("hidden");
  }

  // Restore thumbnail and lock overlay
  const thumb = document.getElementById("modal-thumb");
  const lock = document.getElementById("modal-lock-overlay");
  if (thumb) thumb.classList.remove("hidden");
  if (lock) lock.classList.remove("hidden");

  // Reset stream button
  const btn = document.getElementById("modal-stream-btn");
  if (btn) btn.classList.remove("hidden");
}

function _clearModalCanvas() {
  const canvas = document.getElementById("matrix-canvas");
  if (canvas) {
    const interval = canvas.dataset.interval;
    if (interval) clearInterval(Number(interval));
    canvas.remove();
  }
  const wrap = document.getElementById("modal-thumb-wrap");
  if (wrap?.dataset.matrixInterval) {
    clearInterval(wrap.dataset.matrixInterval);
    delete wrap.dataset.matrixInterval;
  }
}

function _clearModalVideo() {
  const existing = document.getElementById("actual-video-player");
  if (existing) {
    // Destroy mpegts player if one is attached (for .ts files)
    if (existing._mpegtsPlayer) {
      existing._mpegtsPlayer.destroy();
      existing._mpegtsPlayer = null;
    }
    existing.pause();
    if (existing.src && existing.src.startsWith("blob:")) {
      URL.revokeObjectURL(existing.src);
    }
    existing.remove();
  }
}

document.getElementById("video-modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeVideoModal();
});

/* ─────────────────────────────────────────────────
   WEBCRYPTO AES-256-CTR DECRYPTION
   Exact match of Bhargav's Unity AESCTRDecryptor.cs:
   - Algorithm: AES-256-CTR
   - Key: 00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff
   - IV: 16 zero bytes [0x00 * 16]
   - Counter increments big-endian from the last byte
───────────────────────────────────────────────── */
async function decryptBinFile(arrayBuffer) {
  // Exact same key Bhargav hardcoded in SecureVideoPlayer.cs
  const KEY_HEX =
    "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
  const keyBytes = new Uint8Array(
    KEY_HEX.match(/.{2}/g).map((b) => parseInt(b, 16)),
  );

  // Import as AES-CTR key
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CTR" },
    false,
    ["decrypt"],
  );

  // IV = 16 zero bytes (matches Unity: iv = new byte[16])
  const counter = new Uint8Array(16); // all zeros

  // Web Crypto AES-CTR with 64-bit counter (matches Unity's big-endian increment from the right)
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-CTR",
      counter: counter,
      length: 64, // rightmost 64 bits are the counter
    },
    cryptoKey,
    arrayBuffer,
  );

  return decrypted;
}

async function streamVideo() {
  if (!state.activeHeadset) {
    toast("No active headset. Register a headset first.", "error");
    return;
  }
  const videoMeta = VIDEOS.find((v) => v.id === state.currentVideoId);
  const btn = document.getElementById("modal-stream-btn");
  btn.disabled = true;

  // ── Phase 1: Matrix visual ──
  btn.textContent = "Initiating AES-256 Decryption…";
  startDecryptionVisuals();
  await sleep(1200);

  // ── Phase 2: Actual decryption ──
  btn.textContent = "Decrypting data blocks…";

  let blobURL = state.decryptedObjectURLs[state.currentVideoId];
  let isTsFile = videoMeta.binFileName?.toLowerCase().endsWith(".ts") ?? false;

  if (!blobURL) {
    if (videoMeta.fileData) {
      btn.textContent = "Running WebCrypto AES-256-CTR…";
      const decryptedBuffer = await decryptBinFile(videoMeta.fileData);

      if (isTsFile) {
        // .ts → wrap in MPEG-TS MIME type so mpegts.js can detect it
        const blob = new Blob([decryptedBuffer], { type: "video/mp2t" });
        blobURL = URL.createObjectURL(blob);
      } else {
        // .bin → treated as MP4 after decryption
        const blob = new Blob([decryptedBuffer], { type: "video/mp4" });
        blobURL = URL.createObjectURL(blob);
      }

      state.decryptedObjectURLs[state.currentVideoId] = blobURL;
    } else {
      // Real 4K VR video for presentation (served locally to bypass CORS constraints)
      blobURL = "assets/vr_4k.mp4";
      isTsFile = false;
    }
  }

  await sleep(800);
  btn.textContent = "Establishing secure stream…";
  await sleep(600);

  // ── Phase 3: Show player ──
  const wrap = document.getElementById("modal-thumb-wrap");
  _clearModalCanvas();

  const vidEl = document.createElement("video");
  vidEl.id = "actual-video-player";
  vidEl.className = "modal-video-player";
  vidEl.loop = true;
  vidEl.muted = false;
  vidEl.controls = true;
  vidEl.controlsList = "nodownload noremoteplayback";
  vidEl.disablePictureInPicture = true;
  vidEl.style.position = "relative";
  vidEl.style.zIndex = "20";
  vidEl.setAttribute("oncontextmenu", "return false;");
  wrap.appendChild(vidEl);
  setTimeout(() => vidEl.classList.add("playing"), 80);

  if (isTsFile) {
    // Use mpegts.js to play MPEG-2 TS via MediaSource Extensions
    _playWithMpegts(vidEl, blobURL);
  } else {
    // Native playback for MP4 / blob
    vidEl.src = blobURL;
    vidEl.play().catch(() => {
      vidEl.muted = true;
      vidEl.play();
      toast("ℹ️ Click video to unmute.", "info", 3000);
    });
  }

  // ── VR Launch Button ──
  const vrBtn = document.createElement("button");
  vrBtn.id = "launch-vr-btn";
  vrBtn.className = "btn btn-primary";
  vrBtn.style =
    "position:absolute; bottom:14px; left:50%; transform:translateX(-50%); z-index:20; font-size:0.9rem; padding:10px 22px;";
  vrBtn.textContent = "🥽 Enter VR Headset Mode";
  vrBtn.onclick = () => openVRViewer(blobURL, isTsFile);
  wrap.appendChild(vrBtn);

  toast(
    `▶ Decrypted & playing. Click "Enter VR" to view in headset!`,
    "success",
    6000,
  );
  btn.disabled = false;
  btn.textContent = "⏹ Stop & Close";
  btn.onclick = closeVideoModal;
}

/* ─────────────────────────────────────────────────
   MPEGTS.JS PLAYER  (.ts file support)
───────────────────────────────────────────────── */
function _playWithMpegts(videoEl, blobURL) {
  if (typeof mpegts === "undefined" || !mpegts.isSupported()) {
    toast("⚠️ Your browser does not support MPEG-TS playback.", "error", 5000);
    return;
  }

  // Destroy any existing player instance
  if (videoEl._mpegtsPlayer) {
    videoEl._mpegtsPlayer.destroy();
    videoEl._mpegtsPlayer = null;
  }

  const player = mpegts.createPlayer(
    {
      type: "mpegts", // MPEG-2 Transport Stream
      url: blobURL, // decrypted blob URL
      isLive: false,
    },
    {
      enableWorker: true,
      lazyLoadMaxDuration: 3 * 60,
      seekType: "range",
    },
  );

  player.attachMediaElement(videoEl);
  player.load();
  player.play().catch(() => {
    videoEl.muted = true;
    player.play();
    toast("ℹ️ Click video to unmute.", "info", 3000);
  });

  // Store ref so we can destroy on close
  videoEl._mpegtsPlayer = player;
}

/* ─────────────────────────────────────────────────
   VR 360° VIEWER  (A-Frame WebXR)
───────────────────────────────────────────────── */
function openVRViewer(blobURL) {
  const viewer = document.getElementById("vr-viewer");
  const vrVideo = document.getElementById("vr-video-el");
  const sphere = document.getElementById("vr-sphere");
  const scene = document.getElementById("vr-scene");

  // Step 1: Set blob URL on the <video> inside a-assets
  vrVideo.src = blobURL;
  vrVideo.loop = true;

  // Step 2: When video is ready, play it and bind sphere to it
  function startVR() {
    // Re-bind the sphere to the video element (must do after src change)
    sphere.setAttribute("src", "#vr-video-el");

    // Show the fullscreen viewer
    viewer.style.display = "block";
    document.body.style.overflow = "hidden";

    // Play — attempt unmuted first (requires prior user gesture which we have)
    vrVideo.muted = false;
    vrVideo.play().catch(() => {
      // Browsers block unmuted autoplay without user gesture — mute & retry
      vrVideo.muted = true;
      vrVideo.play().then(() => {
        toast(
          "ℹ️ Video is muted. Click on the 360° scene to unmute.",
          "info",
          5000,
        );
      });
    });

    toast(
      "🥽 360° VR active! Move your mouse to look around. Put on headset → click [⊙] for full VR!",
      "success",
      8000,
    );
  }

  // Step 3: Wait for video data to be available before showing scene
  if (vrVideo.readyState >= 3) {
    // HAVE_FUTURE_DATA or more
    startVR();
  } else {
    vrVideo.addEventListener("canplay", startVR, { once: true });
    vrVideo.load(); // start loading
  }

  // Handle entering VR mode — hide the 2D overlay controls
  scene.addEventListener("enter-vr", () => {
    document.getElementById("vr-overlay-controls").style.display = "none";
    // Ensure video is playing when entering VR
    if (vrVideo.paused) vrVideo.play().catch(() => {});
  });

  // Restore overlay when exiting VR
  scene.addEventListener("exit-vr", () => {
    document.getElementById("vr-overlay-controls").style.display = "flex";
  });
}

function closeVRViewer() {
  const vrVideo = document.getElementById("vr-video-el");
  const scene = document.getElementById("vr-scene");

  // Exit VR mode if active
  if (scene.is("vr-mode")) {
    scene.exitVR();
  }

  vrVideo.pause();
  vrVideo.src = "";
  vrVideo.load(); // reset

  document.getElementById("vr-viewer").style.display = "none";
  document.getElementById("vr-overlay-controls").style.display = "flex";
  document.body.style.overflow = "";
}

/* ─────────────────────────────────────────────────
   MATRIX CANVAS  (decryption visual effect)
───────────────────────────────────────────────── */
function startDecryptionVisuals() {
  const wrap = document.getElementById("modal-thumb-wrap");
  wrap.classList.add("decrypting-mode");
  document
    .querySelectorAll(".video-lock-overlay p, .video-lock-overlay span")
    .forEach((el) => (el.style.display = "none"));

  const canvas = document.createElement("canvas");
  canvas.id = "matrix-canvas";
  Object.assign(canvas.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    zIndex: "5",
  });
  wrap.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  canvas.width = wrap.clientWidth || 420;
  canvas.height = wrap.clientHeight || 220;

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~".split(
      "",
    );
  const fs = 13;
  const cols = Math.floor(canvas.width / fs);
  const drops = Array(cols).fill(1);
  let phase = 0; // 0=green, 1=cyan, 2=white flash

  const id = setInterval(() => {
    phase += 0.01;
    const col = phase < 1 ? "#0f0" : phase < 2 ? "#0ff" : "#fff";
    const fade = phase < 1 ? 0.05 : 0.08;

    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = col;
    ctx.font = `${fs}px monospace`;

    drops.forEach((d, i) => {
      ctx.fillText(
        chars[Math.floor(Math.random() * chars.length)],
        i * fs,
        d * fs,
      );
      if (d * fs > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    });
  }, 33);

  canvas.dataset.interval = id;
}

/* ─────────────────────────────────────────────────
   ADMIN UPLOAD  (.bin / .ts only)
───────────────────────────────────────────────── */
function openUploadModal() {
  if (state.currentUserData?.role !== "Admin") {
    toast("⛔ Only Admins can upload encrypted content.", "error");
    return;
  }
  document.getElementById("upload-modal").classList.add("open");
}

function closeUploadModal() {
  document.getElementById("upload-modal").classList.remove("open");
  document.getElementById("upload-form").reset();
  const preview = document.getElementById("upload-file-preview");
  if (preview) preview.textContent = "";
}

// Live file name preview
document.getElementById("up-file")?.addEventListener("change", () => {
  const file = document.getElementById("up-file").files[0];
  const preview = document.getElementById("upload-file-preview");
  if (!file) {
    preview.textContent = "";
    return;
  }
  const allowed = [".bin", ".ts"];
  const ext = "." + file.name.split(".").pop().toLowerCase();
  if (!allowed.includes(ext)) {
    preview.textContent = "❌ Only .bin or .ts files accepted.";
    preview.style.color = "var(--danger)";
    document.getElementById("up-file").value = "";
  } else {
    preview.textContent = `✅ ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    preview.style.color = "var(--success)";
  }
});

document
  .getElementById("upload-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (state.currentUserData?.role !== "Admin") {
      toast("⛔ Unauthorized.", "error");
      return;
    }

    const fileInput = document.getElementById("up-file");
    const file = fileInput.files[0];
    if (!file) {
      toast("Please select a file.", "error");
      return;
    }

    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (![".bin", ".ts"].includes(ext)) {
      toast("⛔ Only .bin or .ts files are allowed.", "error");
      return;
    }

    const title = document.getElementById("up-title").value.trim();
    const cat = document.getElementById("up-cat").value;
    const desc =
      document.getElementById("up-desc").value.trim() ||
      "Encrypted VR content uploaded by Admin.";

    const btn = document.getElementById("upload-submit-btn");
    btn.disabled = true;
    btn.textContent = "Encrypting & Uploading…";

    // Read file as ArrayBuffer (for later in-browser decryption)
    const fileData = await file.arrayBuffer();

    await sleep(1500); // simulate processing

    const newVideo = {
      id: "v" + Date.now(),
      title: title,
      category: cat,
      duration: "Classified",
      resolution: "Encrypted",
      size: (file.size / 1024 / 1024).toFixed(1) + " MB",
      thumb: "assets/thumb1.png",
      desc: desc,
      encryptedBin: true,
      binFileName: file.name,
      fileData: fileData, // kept in memory for decryption
    };

    VIDEOS.unshift(newVideo);
    saveSession();

    toast(`✅ "${title}" uploaded and secured.`, "success");
    closeUploadModal();
    renderVideoGrid(VIDEOS);
    updateStats();
    renderCloudFiles();

    btn.disabled = false;
    btn.textContent = "Start Secure Upload";
  });

/* ─────────────────────────────────────────────────
   HEADSET MANAGEMENT
───────────────────────────────────────────────── */
const MOCK_HEADSETS = [
  {
    id: "HS-CC7A-4F02",
    model: "Unity VR Headset (Simulated)",
    type: "WebXR",
    signal: 100,
  },
];

async function startScan() {
  if (state.scanInProgress) return;
  state.scanInProgress = true;

  const btn = document.getElementById("scan-btn");
  const btnText = document.getElementById("scan-btn-text");
  const spinner = document.getElementById("scan-spinner");
  const progress = document.getElementById("scan-progress-wrap");
  const fillBar = document.getElementById("scan-progress-fill");
  const statusMsg = document.getElementById("scan-status-msg");

  btn.disabled = true;
  btnText.classList.add("hidden");
  spinner.classList.remove("hidden");
  progress.classList.remove("hidden");
  document.getElementById("discovered-list").innerHTML = "";
  state.discoveredDevices = [];

  const messages = [
    "Initializing WebXR protocol scan…",
    "Broadcasting device discovery packets…",
    "Probing physical VR hardware bus…",
    "Evaluating navigator.xr session support…",
    "Finalizing available device list…",
  ];

  for (let i = 0; i <= 100; i += 2) {
    fillBar.style.width = `${i}%`;
    if (i % 20 === 0 && messages.length)
      statusMsg.textContent = messages.shift();
    await sleep(28);
  }

  let xrSupported = false;
  if ("xr" in navigator) {
    try {
      xrSupported = await navigator.xr.isSessionSupported("immersive-vr");
    } catch {}
  }

  // Always include simulated headset so testing is always possible
  state.discoveredDevices = MOCK_HEADSETS.filter(
    (h) => !state.registeredHeadsets.find((r) => r.id === h.id),
  );

  renderDiscovered();
  btn.disabled = false;
  btnText.classList.remove("hidden");
  spinner.classList.add("hidden");
  state.scanInProgress = false;

  const count = state.discoveredDevices.length;
  if (xrSupported && count > 0) {
    toast(`🥽 Found ${count} physical VR headset(s).`, "success");
  } else if (count > 0) {
    toast(
      "⚠️ No physical headset detected. Simulated headset added for testing.",
      "info",
      5000,
    );
  } else {
    toast("All headsets already registered.", "info");
  }
}

function renderDiscovered() {
  const list = document.getElementById("discovered-list");
  if (!state.discoveredDevices.length) {
    list.innerHTML = `<div class="empty-state" style="padding:40px">
      <div class="empty-icon">🔎</div>
      <p>No unregistered headsets found nearby.</p>
    </div>`;
    return;
  }
  list.innerHTML = state.discoveredDevices
    .map(
      (d) => `
    <div class="discovered-device" id="disc-${d.id}">
      <div class="discovered-device-info">
        <div class="device-icon">🥽</div>
        <div>
          <div class="device-name">${d.model}</div>
          <div class="device-id">${d.id} &middot; ${d.type} &middot; Signal: ${d.signal}%</div>
        </div>
      </div>
      <button class="btn btn-outline btn-sm" onclick="registerHeadset('${d.id}')">+ Register</button>
    </div>
  `,
    )
    .join("");
}

function registerHeadset(deviceId) {
  const device = MOCK_HEADSETS.find((h) => h.id === deviceId);
  if (!device) return;
  if (state.registeredHeadsets.find((h) => h.id === deviceId)) {
    toast("This headset is already registered.", "error");
    return;
  }
  const reg = {
    ...device,
    registeredBy: state.currentUser,
    registeredAt: new Date(),
  };
  state.registeredHeadsets.push(reg);
  if (!state.activeHeadset) state.activeHeadset = reg;
  state.discoveredDevices = state.discoveredDevices.filter(
    (h) => h.id !== deviceId,
  );
  document.getElementById(`disc-${deviceId}`)?.remove();
  renderRegisteredHeadsets();
  updateNavHeadset();
  updateStats();
  saveSession();
  toast(`✅ ${device.model} registered exclusively.`, "success");
}

function setActiveHeadset(deviceId) {
  const hset = state.registeredHeadsets.find((h) => h.id === deviceId);
  if (!hset) return;
  state.activeHeadset = hset;
  renderRegisteredHeadsets();
  updateNavHeadset();
  saveSession();
  toast(`🥽 ${hset.model} set as active headset.`, "info");
}

function releaseHeadset(deviceId) {
  const hset = state.registeredHeadsets.find((h) => h.id === deviceId);
  if (!hset) return;
  state.registeredHeadsets = state.registeredHeadsets.filter(
    (h) => h.id !== deviceId,
  );
  if (state.activeHeadset?.id === deviceId) {
    state.activeHeadset = state.registeredHeadsets[0] || null;
  }
  renderRegisteredHeadsets();
  updateNavHeadset();
  updateStats();
  saveSession();
  if (!state.discoveredDevices.find((h) => h.id === deviceId)) {
    state.discoveredDevices.push(MOCK_HEADSETS.find((h) => h.id === deviceId));
    renderDiscovered();
  }
  toast(`🔓 ${hset.model} released.`, "info");
}

function renderRegisteredHeadsets() {
  const list = document.getElementById("registered-headsets-list");
  const noMsg = document.getElementById("no-headsets-msg");
  if (!state.registeredHeadsets.length) {
    list.innerHTML = "";
    noMsg.classList.remove("hidden");
    return;
  }
  noMsg.classList.add("hidden");
  list.innerHTML = state.registeredHeadsets
    .map((h) => {
      const isActive = state.activeHeadset?.id === h.id;
      return `
      <div class="registered-headset-card ${isActive ? "active" : ""}">
        <div class="reg-headset-info">
          <div class="reg-icon">🥽</div>
          <div>
            <div class="reg-name">${h.model}</div>
            <div class="reg-meta">${h.id} &middot; ${h.type}</div>
          </div>
        </div>
        <div class="reg-actions">
          ${
            isActive
              ? `<span class="badge badge-success"><span class="pulse-dot online"></span> Active</span>`
              : `<button class="btn btn-outline btn-sm" onclick="setActiveHeadset('${h.id}')">Set Active</button>`
          }
          <button class="btn btn-danger btn-sm" onclick="releaseHeadset('${h.id}')">🔓 Release</button>
        </div>
      </div>`;
    })
    .join("");
}

function updateNavHeadset() {
  const dot = document.getElementById("nav-headset-dot");
  const name = document.getElementById("nav-headset-name");
  if (state.activeHeadset) {
    dot.className = "pulse-dot online";
    name.textContent =
      state.activeHeadset.model.substring(0, 18) +
      (state.activeHeadset.model.length > 18 ? "…" : "");
  } else {
    dot.className = "pulse-dot offline";
    name.textContent = "No headset";
  }
}

/* ─────────────────────────────────────────────────
   CLOUD
───────────────────────────────────────────────── */
function renderCloudFiles() {
  const list = document.getElementById("cloud-file-list");
  list.innerHTML = VIDEOS.map(
    (v) => `
    <div class="cloud-file-row">
      <div class="cloud-file-info">
        <div class="cloud-file-icon">🔐</div>
        <div>
          <div class="cloud-file-name">${v.title}${v.binFileName ? ` (${v.binFileName})` : ".bin"}</div>
          <div class="cloud-file-size">${v.size} &middot; AES-256 encrypted</div>
        </div>
      </div>
      <span class="badge badge-purple">Encrypted</span>
    </div>
  `,
  ).join("");
}

async function syncCloud() {
  toast("🔄 Syncing cloud instance…", "info", 1500);
  await sleep(1600);
  toast("✅ Cloud synced. All files up to date.", "success");
  state.cloudSynced = true;
}

/* ─────────────────────────────────────────────────
   USER MENU
───────────────────────────────────────────────── */
function toggleUserMenu() {
  const m = document.getElementById("user-dropdown");
  m.style.display = m.style.display === "none" ? "block" : "none";
}
function closeUserMenu() {
  document.getElementById("user-dropdown").style.display = "none";
}
document.addEventListener("click", (e) => {
  const wrap = document.querySelector(".user-avatar-wrap");
  if (wrap && !wrap.contains(e.target)) closeUserMenu();
});
function openProfileModal() {
  closeUserMenu();
  toast(
    `Role: ${state.currentUserData.role} | ID: ${state.currentUser}`,
    "info",
  );
}

/* ─────────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────────── */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function randomHex(n) {
  return [...Array(n)]
    .map(() =>
      Math.floor(Math.random() * 16)
        .toString(16)
        .toUpperCase(),
    )
    .join("");
}
function shakeElement(el) {
  el.style.animation = "none";
  el.offsetHeight;
  el.style.animation = "shake 0.5s ease";
  setTimeout(() => {
    el.style.animation = "";
  }, 600);
}

/* Shake keyframe */
const shakeStyle = document.createElement("style");
shakeStyle.textContent = `
  @keyframes shake {
    0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)}
    40%{transform:translateX(10px)} 60%{transform:translateX(-8px)} 80%{transform:translateX(8px)}
  }
`;
document.head.appendChild(shakeStyle);

/* Escape key */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeVideoModal();
    closeUploadModal();
  }
});

/* ─────────────────────────────────────────────────
   BOOT: restore session on page load / reload
───────────────────────────────────────────────── */
(function boot() {
  if (restoreSession()) {
    enterApp();
  }
})();
