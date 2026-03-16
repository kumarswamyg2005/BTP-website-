# Unity Stream

**Unity Stream** is an enterprise-grade, front-end-only Single Page Application (SPA) designed to simulate a highly secure VR video streaming platform. It features an immersive dashboard, on-the-fly in-browser video decryption, and 360° WebXR playback.

## ✨ Features

- **Secure Simulated Authentication:** Role-based access (Admin, Editor, Player Dev) with session persistence using `sessionStorage`.
- **In-Browser Decryption:** Uses the WebCrypto API (AES-256-CTR) to decrypt `.bin` and `.ts` formatted videos entirely in the browser memory before generating a secure stream.
- **VR 360° Playback:** Integrated with **A-Frame** to render immersive, head-tracking-enabled 360° video environments right in the browser.
- **MPEG-TS Support:** Utilizes `mpegts.js` to play decrypted `.ts` media through MediaSource Extensions.
- **Enterprise UI/UX:** A responsive, dark-mode glassmorphic interface with interactive state animations and a simulated "Cloud/Headset" management dashboard.
- **Content Protection:** Employs front-end anti-piracy tactics (disabling right-click context menus, blocking common screenshot/save keyboard shortcuts, and disabling drag-to-save on media).

---

## 🚀 How to Run the Project

**⚠️ IMPORTANT:** This is a strictly **frontend-only web application**. It interacts with the Browser's Document Object Model (DOM). **Do not attempt to run this using Node.js** (e.g., `node app.js` will fail because Node.js doesn't have a visual window or a `document` object).

### Method 1: Using a Local Web Server (Recommended)

Running it via a local server ensures that fetching visual assets and performing crypto operations won't be blocked by your browser's CORS (Cross-Origin) security policies.

1. Open your terminal.
2. Navigate to the project folder:
   ```bash
   cd "/Users/kumaraswamy/Desktop/Unity website"
   ```
3. Start a built-in Python HTTP server:
   ```bash
   python3 -m http.server 8000
   ```
4. Open your web browser and go to: **[http://localhost:8000](http://localhost:8000)**

### Method 2: Opening Directly

You can also simply open the project natively in your browser:

1. Open your File Explorer / Finder.
2. Navigate to the `Unity website` folder.
3. Double-click on `index.html` to open it in Chrome, Safari, Edge, or Firefox.

---

## 🔑 Demo Login Credentials

You can log in to the dashboard using any of the following demo user combinations:

| Role           | User ID        | Password     | Notes                                                                    |
| :------------- | :------------- | :----------- | :----------------------------------------------------------------------- |
| **Admin**      | `admin_01`     | `unity@2025` | Has exclusive access to upload new `.bin`/`.ts` keys directly to memory. |
| **Editor**     | `editor_01`    | `unity@2025` | Standard viewer access.                                                  |
| **Player Dev** | `playerdev_01` | `unity@2025` | Standard viewer access.                                                  |

---

## 🛠️ Technology Stack

- **HTML5** (`index.html`)
- **Vanilla CSS** (Split thoughtfully into `app.css`, `login.css`, and `style.css`)
- **Vanilla JavaScript** (`js/app.js`)
- **A-Frame (v1.5.0):** For the WebXR VR viewer.
- **mpegts.js (v1.7.3):** For handling the `.ts` playback.

No heavy frameworks (like React or Angular) or backend servers are required to run this simulated demo.
