# Unity Stream — Deployment Guide

Everything here is **free**. No credit card required for any service listed.

---

## 1. Build the project

```bash
npm install
npm run build
```

This produces a `dist/` folder — a fully static bundle ready to deploy anywhere.

---

## 2. Deploy the site (free options)

### Option A — Netlify (recommended, easiest)

1. Go to [netlify.com](https://netlify.com) → sign up with GitHub
2. Click **"Add new site" → "Import an existing project"**
3. Connect your GitHub repo: `kumarswamyg2005/BTP-website-`
4. Set build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Click **Deploy site**

Netlify auto-deploys every time you push to `main`. Your site will be live at a URL like `https://unity-stream.netlify.app`.

> **SPA fix required:** React Router uses client-side routing. Without this, refreshing any page other than `/` returns a 404.
>
> Create a file `public/\_redirects` with:
> ```
> /*  /index.html  200
> ```

### Option B — Vercel

1. Go to [vercel.com](https://vercel.com) → sign up with GitHub
2. Click **"New Project"** → import `BTP-website-`
3. Vercel auto-detects Vite — keep the defaults
4. Click **Deploy**

Vercel handles SPA routing automatically — no extra config needed.

### Option C — GitHub Pages (manual)

```bash
npm run build
# Push the dist/ folder to the gh-pages branch
npx gh-pages -d dist
```

Enable GitHub Pages in your repo settings → source: `gh-pages` branch.

> **Note:** GitHub Pages doesn't support SPA routing out of the box. Use a `404.html` redirect workaround or prefer Netlify/Vercel.

---

## 3. Video storage (free — Cloudinary)

The demo videos (`vr_4k.mp4`, `vr_4k_hq.mp4`, `vr_video.mp4`) are in `assets/` and deploy fine as static files for now. But they are large files (~23 MB each) and real 8K VR content can be several GB — too big for a git repo (GitHub limit: 100 MB per file).

**Solution: Cloudinary free tier**
- 25 GB storage
- 25 GB bandwidth/month
- Direct browser uploads (no backend needed)
- CDN-delivered globally

### Setup steps

1. Create a free account at [cloudinary.com](https://cloudinary.com)
2. In your Cloudinary dashboard → **Settings → Upload**
3. Scroll to **Upload presets** → click **Add upload preset**
   - Set **Signing mode** to **Unsigned**
   - Set **Folder** to `unity-stream`
   - Save — copy the **preset name** (e.g. `unity_unsigned`)
4. Copy your **Cloud name** from the dashboard top-left

### Update video sources

Replace the local paths in [src/data/videos.js](src/data/videos.js):

```js
// Before
src: '/vr_4k_hq.mp4'

// After — use your Cloudinary URL
src: 'https://res.cloudinary.com/YOUR_CLOUD_NAME/video/upload/unity-stream/vr_4k_hq.mp4'
```

Upload each video file through the Cloudinary Media Library (drag and drop in their dashboard).

---

## 4. Admin video uploads (free — Cloudinary)

Currently, admin uploads are stored in `sessionStorage` (RAM only) and are **lost on page refresh**. To make uploads permanent, connect the upload modal to Cloudinary.

### What needs to change

In [src/components/UploadModal.jsx](src/components/UploadModal.jsx), replace the in-memory storage with a Cloudinary upload:

```js
// Add your Cloudinary credentials
const CLOUD_NAME = 'your_cloud_name';       // from Cloudinary dashboard
const UPLOAD_PRESET = 'unity_unsigned';     // the unsigned preset you created

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'unity-stream');

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
    { method: 'POST', body: formData }
  );
  const data = await res.json();
  return data.secure_url; // permanent CDN URL
}
```

Then in `handleSubmit`, call `uploadToCloudinary(file)` instead of reading into an ArrayBuffer, and save the returned URL as `src` in the new video object.

The video will then persist permanently — any user can watch it after logging in, across sessions.

---

## 5. Environment summary

| What | Where | Free tier |
|---|---|---|
| Site hosting | Netlify or Vercel | 100 GB bandwidth/month |
| Demo videos | `assets/` folder (static) | Included in hosting |
| Large/uploaded videos | Cloudinary | 25 GB storage + 25 GB bandwidth |
| Database / auth | None (sessionStorage) | N/A |

---

## 6. Checklist before going live

- [ ] Run `npm run build` — no errors
- [ ] Test `dist/` locally: `npm run preview`
- [ ] Upload demo videos to Cloudinary and update `src/data/videos.js` URLs
- [ ] Create Netlify `public/_redirects` file (if using Netlify)
- [ ] Set your Cloudinary cloud name and preset in `UploadModal.jsx`
- [ ] Push all changes to `main` branch
- [ ] Deploy on Netlify/Vercel

---

## 7. Local development

```bash
npm install      # install dependencies
npm run dev      # start dev server at localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the production build locally
```
