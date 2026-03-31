/* ================================================================
   Unity Stream — Local User Database
   ================================================================

   ┌───────────────────────────────────────────────────────────┐
   │  YOUR LOGIN CREDENTIALS (change these):                   │
   │  Username : admin                                         │
   │  Password : Unity@Stream2025!                             │
   │                                                           │
   │  To add more users, copy the "admin" block below.        │
   ├───────────────────────────────────────────────────────────┤
   │  DEPLOYING WITH MONGODB LATER:                            │
   │  Replace only the body of AuthService.login() with a      │
   │  fetch('/api/auth/login', ...) call. Nothing else changes.│
   └───────────────────────────────────────────────────────────┘
================================================================ */

const LOCAL_USERS = {
  /* ── Primary admin account ──────────────────────────────── */
  admin: {
    password: "Password", // ← CHANGE THIS
    role: "Admin",
    initial: "A",
    cloudGb: 4.2,
    displayName: "Admin",
  },

  /* ── Add more users below ────────────────────────────────
  editor: {
    password: "your-password-here",
    role: "Editor",
    initial: "E",
    cloudGb: 2.0,
    displayName: "Editor",
  },
  ────────────────────────────────────────────────────────── */
};

/* ================================================================
   Auth Service
   — Swap the login() body for a fetch() call when MongoDB is ready
================================================================ */
const AuthService = {
  async login(username, password) {
    /* ── MONGODB VERSION (replace this whole block when ready) ──
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
    ─────────────────────────────────────────────────────────── */

    /* ── LOCAL VERSION ─────────────────────────────────────── */
    const key = (username || "").trim().toLowerCase();
    const pass = (password || "").trim();
    const user = LOCAL_USERS[key];
    if (!user) return null;

    // Constant-time comparison (avoids timing-based user enumeration)
    const a = user.password,
      b = pass;
    if (a.length !== b.length) return null;
    let diff = 0;
    for (let i = 0; i < a.length; i++)
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    if (diff !== 0) return null;

    return {
      role: user.role,
      initial: user.initial,
      cloudGb: user.cloudGb,
      displayName: user.displayName || key,
    };
  },
};
