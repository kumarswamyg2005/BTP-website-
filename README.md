# Unity Stream — Secure VR Streaming Platform

**Unity Stream** is an enterprise-grade, frontend-only Single Page Application (SPA) simulating a secure VR video streaming and multi-headset management platform. Built for education, training, research, and enterprise XR use cases where controlled content delivery, multi-user synchronization, and content protection are critical.

Live demo → **[btp-website-sage.vercel.app](https://btp-website-sage.vercel.app)**

---

## Project Objectives

1. Design a VR controller system that connects, monitors, and controls multiple VR headsets concurrently
2. Develop a custom VR media player capable of playing encrypted VR video files
3. Ensure secure content delivery — preventing unauthorized access, copying, or screen capture
4. Enable synchronized playback across multiple VR devices
5. Support scalable deployment for labs, classrooms, and training centers

---

## Features

- **AES-256-CTR In-Browser Decryption** — Videos stored as encrypted `.bin` files are fetched, decrypted using the WebCrypto API entirely in memory, and streamed as blob URLs — nothing is ever written to disk
- **360° WebXR VR Playback** — Powered by A-Frame 1.5.0; renders equirectangular 360° video on a sphere with head-tracking, mouse-drag, and full Meta Quest browser support
- **Multi-Headset Management** — Scan, register, and release VR headsets via Web Bluetooth or WebXR; exclusive session lock prevents two users from claiming the same headset simultaneously
- **Synchronized Broadcast** — When a video plays with registered headsets, a live broadcast panel shows each headset transitioning from Buffering → Streaming
- **Role-Based Access Control** — Admin, Editor, and Player Dev roles with session persistence via `sessionStorage`
- **Admin Video Upload** — Admin/Editor users can upload any video format (MP4, MKV, MOV, WEBM, TS, AVI); the file is read locally and added to the session library instantly
- **Content Protection** — Right-click disabled, screenshot shortcuts blocked, download controls removed, drag-to-save disabled on all media
- **Video Encryptor Utility** — Standalone `encrypt-video.html` tool to encrypt any video file into an AES-256-CTR `.bin` ready for the player

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18.3 + Vite 6.0 |
| Routing | React Router 6.27 |
| Animations | Framer Motion 12.38 |
| VR / WebXR | A-Frame 1.5.0 |
| Encryption | WebCrypto API — AES-256-CTR |
| Headset Scan | Web Bluetooth API + WebXR API |
| Deployment | Vercel (auto-deploy from GitHub) |

---

## Getting Started

### Prerequisites
- Node.js 18+

### Install & Run

```bash
git clone https://github.com/kumarswamyg2005/BTP-website-.git
cd BTP-website-
npm install
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)**

> To test from a Meta Quest on the same WiFi, use your machine's LAN IP instead of localhost — Vite is configured with `host: true` so it's reachable at `http://192.168.x.x:5173`

### Build for Production

```bash
npm run build
```

---

## Demo Login Credentials

| Role | Username | Password | Access |
|---|---|---|---|
| **Admin** | `admin_01` | `unity@2025` | Full access — upload videos, manage headsets, view all content |
| **Editor** | `editor_01` | `unity@2025` | Upload videos, view library |
| **Player Dev** | `playerdev_01` | `unity@2025` | View library only |

---

## Using on Meta Quest

1. Open the Vercel URL in the **Meta Quest Browser**
2. Go to **Headsets** — your Quest is auto-detected, click Register
3. Go to **Library** → click a video → **Decrypt & Play**
4. Click **View in 360° VR** → tap **Tap to Unmute** for audio
5. Press **[⊙]** (bottom-right of screen) to enter full headset VR mode

---

## Admin: Adding Encrypted Videos

Use the included **`encrypt-video.html`** utility (open directly in any browser — no server needed):

1. Drop your video file (MP4, MKV, MOV, WEBM, etc.)
2. Click **Encrypt & Download .bin** — outputs `yourfile_encrypted.bin`
3. Place the `.bin` file in the `assets/` folder
4. Copy the generated code snippet into `src/data/videos.js`
5. Run `npm run dev` — the video appears in the library and decrypts on play

---

## Project Structure

```
├── assets/                  # Static files served by Vite (videos, thumbs, .bin files)
├── src/
│   ├── components/
│   │   ├── VRViewer.jsx     # A-Frame 360° WebXR player (portal-rendered, Quest-compatible)
│   │   ├── VideoModal.jsx   # Decrypt & play modal with sync broadcast panel
│   │   ├── UploadModal.jsx  # Admin video upload (local FileReader → blob URL)
│   │   └── Navbar.jsx
│   ├── pages/
│   │   ├── HomePage.jsx     # Video library with search, filter, spotlight cards
│   │   ├── HeadsetsPage.jsx # Headset scan, register, release, active management
│   │   ├── CloudPage.jsx
│   │   └── AdminPage.jsx
│   ├── context/
│   │   └── AuthContext.jsx  # Auth, headset state, video library, session persistence
│   └── data/
│       └── videos.js        # Demo video catalogue
├── encrypt-video.html       # Standalone AES-256-CTR video encryptor utility
├── vercel.json              # SPA routing rewrite rule for Vercel
└── vite.config.js
```

---

## Security Design

- Videos are never stored in plaintext — they exist as `.bin` blobs on the server
- Decryption happens entirely in the browser using the WebCrypto API
- Blob URLs are revoked on modal close — no persistent plaintext in memory
- `fileData` ArrayBuffers are stripped before `sessionStorage` serialization
- No backend, no database — zero server-side attack surface

---

## Deployment

The project is deployed on **Vercel** with automatic redeployment on every push to `main`.

See [DEPLOY.md](DEPLOY.md) for full deployment instructions.
