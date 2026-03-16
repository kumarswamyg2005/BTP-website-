# Unity Stream Website — Full Project Details

## 1) Project Goal

Build a **single-page, dark-themed VR streaming web app** named **Unity Stream** with:

- Login screen
- Main app with 3 tabs (Home, Headsets, Cloud)
- Encrypted-video themed UI/UX
- VR viewer overlay using A-Frame
- Local-only simulated functionality (no backend required)

The website should look and behave like a polished enterprise SaaS dashboard.

---

## 2) Tech Stack

- **HTML5** (`index.html`)
- **Vanilla CSS** (split into `css/style.css`, `css/login.css`, `css/app.css`)
- **Vanilla JavaScript** (`js/app.js`)
- External libs:
  - **A-Frame 1.5.0** for WebXR/360 viewer
  - **mpegts.js 1.7.3** for `.ts` playback through MSE
- Storage:
  - `sessionStorage` for session persistence (user/headsets/videos)

No framework and no server dependency are required for base demo behavior.

---

## 3) Current Folder Structure

```
Unity website/
├── index.html
├── cable_car_encrypted.bin
├── assets/
│   ├── logo.png
│   ├── thumb1.png
│   ├── thumb2.png
│   ├── thumb3.png
│   ├── thumb4.png
│   ├── thumb5.png
│   ├── thumb6.png
│   ├── vr_4k.mp4
│   ├── vr_4k_hq.mp4
│   └── vr_video.mp4
├── css/
│   ├── style.css
│   ├── login.css
│   └── app.css
└── js/
    └── app.js
```

---

## 4) Page Composition

## 4.1 Global Layers

- Animated background layer
- Grid/background effect layer
- Toast container
- Fullscreen VR overlay (`#vr-viewer`)

## 4.2 Login Page (`#page-login`)

Two-column layout:

- **Left panel**: brand, hero text, feature bullets, stats
- **Right panel**: login card with
  - User ID + password fields
  - Show/hide password
  - Remember device checkbox
  - Demo credential buttons

### Demo Users

- `admin_01 / unity@2025` (Admin)
- `editor_01 / unity@2025` (Editor)
- `playerdev_01 / unity@2025` (Player Dev)

## 4.3 Main App (`#page-app`)

Hidden until successful login. Includes:

### A) Fixed Navbar

- Brand/logo
- Tab buttons: Home, Headsets, Cloud
- Active headset pill
- User avatar dropdown menu (profile/cloud/signout)

### B) Home Tab

- Hero banner + CTA buttons
- Stats cards
- Encrypted video library:
  - Search input
  - Category filter
  - Admin-only upload button
  - Responsive video card grid

### C) Headsets Tab

- “Start Scan” simulation
- Radar animation and progress bar
- Discovered headset list
- Registered headset list
- Active/release actions
- Exclusivity info box

### D) Cloud Tab

- Cloud instance status card
- Storage usage + stats
- Sync settings toggles
- Sync button
- Encrypted files list

---

## 5) Modals & Overlays

## 5.1 Video Modal

- Shows metadata and encrypted preview
- Warns if no headset is active
- Primary action: decrypt + play stream
- Download is intentionally blocked in UI

## 5.2 Upload Modal (Admin only)

- Accepts `.bin` and `.ts`
- Captures title, category, description
- Reads file into memory with `File.arrayBuffer()`
- Adds new video entry to in-memory library

## 5.3 VR Viewer Overlay

- Fullscreen `a-scene`
- `<a-videosphere>` mapped to `<video id="vr-video-el">`
- Exit button
- Enter VR headset mode through A-Frame VR controls

---

## 6) JavaScript Behavior (Core)

## 6.1 Authentication + Session

- Validate user/password from local `USERS` map
- Store/recover session with keys:
  - `unity_user`
  - `unity_headsets`
  - `unity_active`
  - `unity_videos`
- Auto-enter app after reload when valid session exists

## 6.2 Video Library

- Video dataset is local array `VIDEOS`
- Live filtering by search + category
- Card rendering from state
- Animated hover effects

## 6.3 Stream/Decrypt Flow

When user clicks stream:

1. Show matrix/decrypt visual effect
2. If uploaded encrypted file exists:
   - Decrypt using **Web Crypto AES-CTR (256-bit)**
3. Generate object URL from decrypted bytes
4. Play:
   - Native `<video>` for MP4
   - `mpegts.js` for `.ts`
5. Option to launch VR viewer

## 6.4 Headset Management

- Uses simulated headset discovery data
- Register/release headset per session
- Track active headset and reflect in navbar/state

## 6.5 Cloud

- Displays per-user fake cloud stats
- “Sync now” with simulated async feedback

## 6.6 Content Protection UX

- Disable right-click in app area
- Block common save/devtools/screenshot key combos (best effort)
- Disable drag/save behavior on media thumbnails

---

## 7) Design System Requirements

- Dark enterprise look
- Neon cyan/violet accents
- Glassmorphism cards, subtle gradients, animated transitions
- Rounded components and modern typography
- Fonts:
  - Inter
  - JetBrains Mono
- Must be responsive for desktop/tablet/mobile

---

## 8) Functional Acceptance Checklist

- [ ] Login works with 3 demo users
- [ ] App persists session on reload
- [ ] Navbar tabs switch content correctly
- [ ] Video search/filter updates grid
- [ ] Video modal opens with correct metadata
- [ ] Stream action shows decrypting UX and playable video
- [ ] VR overlay opens and closes properly
- [ ] Headset scan/register/set-active/release works
- [ ] Cloud tab stats + sync feedback work
- [ ] Admin can upload `.bin`/`.ts` and see new entries
- [ ] Toast notifications appear for major actions

---

## 9) Copy-Paste Prompt to Recreate the Same Website

Use this prompt in any code-generation tool:

"""
Create a production-quality single-page web app called **Unity Stream** using only HTML, CSS, and vanilla JavaScript.

### File structure

- `index.html`
- `css/style.css` (global design system)
- `css/login.css` (login page styles)
- `css/app.css` (main app/tab styles)
- `js/app.js` (all app logic)
- `assets/` with `logo.png`, `thumb1.png`..`thumb6.png`, and VR video placeholders.

### Core features to implement exactly

1. Login screen (two-column split layout)

- Left side: brand, headline, feature bullets, stats.
- Right side: login form with User ID/password, toggle password, remember checkbox, demo credentials.
- Demo users:
  - admin_01 / unity@2025 (Admin)
  - editor_01 / unity@2025 (Editor)
  - playerdev_01 / unity@2025 (Player Dev)

2. Main app after login

- Fixed top navbar with brand, tabs (Home/Headsets/Cloud), active-headset pill, user avatar dropdown.
- Home tab:
  - hero banner + CTA buttons
  - stats cards
  - encrypted video library grid with card hover animations
  - search input and category filter
  - admin-only upload button
- Headsets tab:
  - start scan button
  - radar/progress animation
  - discovered devices list
  - registered headsets list
  - set active / release actions
- Cloud tab:
  - cloud instance status card
  - storage stats
  - sync settings toggles
  - sync button and encrypted file listing

3. Video modal flow

- Show selected video details, encrypted lock overlay, and warning if no active headset.
- “Decrypt & Play” action should:
  - run matrix/decryption visual
  - decrypt uploaded encrypted data using Web Crypto AES-256-CTR (if file data exists)
  - play decrypted video in modal
  - support `.ts` playback with mpegts.js and MP4 native playback
  - offer “Enter VR Headset Mode” button

4. VR viewer overlay

- Fullscreen A-Frame scene with `<a-videosphere>` bound to a dynamic `<video>` source.
- include exit controls and allow WebXR VR entry.

5. Session persistence

- Use `sessionStorage` to save/restore user, registered headsets, active headset, and videos.

6. UI system and style

- Dark premium enterprise look.
- Cyan/violet accents, glass cards, subtle animated gradients.
- Typography: Inter + JetBrains Mono.
- Responsive behavior for mobile/tablet.
- Toast notifications for all major actions.

7. Admin upload modal

- Admin-only upload of `.bin` and `.ts`.
- Read file as ArrayBuffer and keep in memory for decrypt-on-play workflow.

8. Best-effort content protection UX

- Disable right-click in app content area.
- Block common save/screenshot shortcuts.
- Prevent drag-save from media thumbnails.

### External dependencies

- A-Frame 1.5.0
- mpegts.js 1.7.3

Return full code for all files with clean, readable structure and comments.
"""

---

## 10) Run Instructions

1. Open `index.html` in browser (or run with a local static server).
2. Login using demo credentials.
3. Test tabs, headset scan, stream flow, and VR mode.
